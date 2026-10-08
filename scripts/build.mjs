/** Zero-dependency single-file packer using native browser import maps.
 *
 *   node scripts/build.mjs --cdn       engines load from the pinned jsDelivr URLs
 *   node scripts/build.mjs --offline   engines are embedded (requires npm install)
 *
 * With no flag, the engines are embedded when installed and the CDN is used otherwise.
 * Every src/ module becomes a data URL in the import map. This is intentionally not a
 * minifier: the shipped source stays inspectable.
 *
 * Output:
 *   dist/Morph-Lab.html   the release: all three workspaces in one file (committed)
 *   dist/runtime.html     the unwrapped application document, used by browser tests
 *   dist/build-info.json  edition, engine pins, and sizes
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { packWorkspace } from './pack-workspace.mjs';
import { ROOT, APP_VERSION, ENGINES, cdnUrl } from './project.mjs';

const out = path.join(ROOT, 'dist');
const wantCdn = process.argv.includes('--cdn');
const wantOffline = process.argv.includes('--offline');
if (wantCdn && wantOffline) throw new Error('Choose either --cdn or --offline.');

const dataUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])),
  );
  return nested.flat().sort();
}

/** Rewrites relative static and dynamic imports to bare `morph/...` specifiers. */
function rewriteImports(source, relative) {
  const resolve = spec =>
    'morph/' + path.posix.normalize(path.posix.join(path.posix.dirname(relative), spec));
  return source
    .replace(
      /(\bfrom\s*|\bimport\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,
      (_, prefix, quote, spec) => prefix + quote + resolve(spec) + quote,
    )
    .replace(
      /(\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,
      (_, prefix, quote, spec) => prefix + quote + resolve(spec) + quote,
    );
}

const imports = {};
for (const file of (await walk(path.join(ROOT, 'src'))).filter(f => f.endsWith('.js'))) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  const source = rewriteImports(await readFile(file, 'utf8'), relative);
  imports['morph/' + relative] = dataUrl(source + '\n//# sourceURL=morph/' + relative);
}

const notices = [await readFile(path.join(ROOT, 'LICENSE'), 'utf8')];

/** Embeds the installed engines, or throws when they are missing or not the pinned versions. */
async function embedEngines() {
  const modules = path.join(ROOT, 'node_modules');
  for (const [id, pin] of Object.entries(ENGINES)) {
    const installed = JSON.parse(await readFile(path.join(modules, id, 'package.json'), 'utf8'));
    if (installed.version !== pin.version)
      throw new Error(
        `Installed ${id} ${installed.version} does not match the pin ${pin.version}.`,
      );
  }
  const threeDir = path.join(modules, 'three/build');
  imports['three/core'] = dataUrl(await readFile(path.join(threeDir, 'three.core.js'), 'utf8'));
  imports.three = dataUrl(
    (await readFile(path.join(threeDir, 'three.module.js'), 'utf8')).replaceAll(
      "'./three.core.js'",
      "'three/core'",
    ),
  );
  const rapierDir = path.join(modules, '@dimforge/rapier3d-compat');
  const rapierPackage = JSON.parse(await readFile(path.join(rapierDir, 'package.json'), 'utf8'));
  const rapierSource = await readFile(
    path.join(rapierDir, rapierPackage.module || 'rapier.mjs'),
    'utf8',
  );
  if (/from\s*['"]\.\//.test(rapierSource))
    throw new Error(
      'Rapier compat entry has additional relative imports; inspect before embedding.',
    );
  imports['@dimforge/rapier3d-compat'] = dataUrl(rapierSource);
  // Preserve full notices even when the HTML is redistributed on its own.
  for (const id of Object.keys(ENGINES)) {
    const dir = path.join(modules, id);
    for (const filename of await readdir(dir))
      if (/^(LICENSE|COPYING|NOTICE)([.\-_]|$)/i.test(filename))
        notices.push(
          id + ' / ' + filename + '\n' + (await readFile(path.join(dir, filename), 'utf8')),
        );
  }
}

let offline = false;
if (!wantCdn) {
  try {
    await embedEngines();
    offline = true;
  } catch (error) {
    if (wantOffline) throw error;
    console.log('Engines not embedded:', error.message);
  }
}
if (!offline) for (const id of Object.keys(ENGINES)) imports[id] = cdnUrl(id);

let html = await readFile(path.join(ROOT, 'index.html'), 'utf8');
for (const sheet of ['style.css', 'review.css', 'creator.css'])
  html = html.replace(
    `<link rel="stylesheet" href="./${sheet}">`,
    `<style>${await readFile(path.join(ROOT, sheet), 'utf8')}</style>`,
  );
html = html
  .replace(
    /<script type="importmap">[\s\S]*?<\/script>/,
    `<script type="importmap">${JSON.stringify({ imports }).replaceAll('<', '\\u003c')}</script>`,
  )
  .replace("import './src/boot.js'", "import 'morph/src/boot.js'")
  .replace(
    '<title>',
    `<!-- ${offline ? 'OFFLINE EDITION: engines embedded' : 'CDN EDITION: engines require internet'} -->\n<title>`,
  )
  .replace(
    '<!doctype html>',
    '<!doctype html>\n<!-- LICENSE NOTICES\n' +
      notices.join('\n\n').replaceAll('-->', '-- >') +
      '\nEND LICENSE NOTICES -->',
  );
if (!html.includes("import 'morph/src/boot.js'") || html.includes('rel="stylesheet"'))
  throw new Error('index.html no longer matches the build template.');

const release = await packWorkspace(html, 'creator');
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'runtime.html'), html);
await writeFile(path.join(out, 'Morph-Lab.html'), release);
await writeFile(
  path.join(out, 'build-info.json'),
  JSON.stringify(
    {
      version: APP_VERSION,
      edition: offline ? 'offline' : 'cdn',
      three: ENGINES.three.version,
      rapier: ENGINES['@dimforge/rapier3d-compat'].version,
      modules: Object.keys(imports).length,
      bytes: Buffer.byteLength(release),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Built ${offline ? 'offline' : 'CDN'} edition: dist/Morph-Lab.html (${(Buffer.byteLength(release) / 1024).toFixed(0)} KB)`,
);

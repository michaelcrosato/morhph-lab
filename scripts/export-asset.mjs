#!/usr/bin/env node
/** Local, engine-free delivery. Refuses missing geometry and accidental overwrite. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { preset, parseGenome } from '../src/core/genome.js';
import { buildDelivery } from '../src/export/delivery.js';
const args = process.argv.slice(2),
  options = {},
  flags = new Set(['motion', 'allow-warnings', 'flat']);
try {
  for (let i = 0; i < args.length; i++) {
    const key = args[i].replace(/^--/, '');
    if (
      !['preset', 'input', 'out', 'frames', 'pose', 'phase', 'target', 'layout', ...flags].includes(
        key,
      ) ||
      !args[i].startsWith('--')
    )
      throw new Error('Unknown option: ' + args[i]);
    if (flags.has(key)) options[key] = true;
    else {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error('Missing value: ' + key);
      options[key] = value;
    }
  }
  if (Boolean(options.preset) === Boolean(options.input) || !options.out)
    throw new Error(
      'Use --preset ID or --input source.json, and --out NEW_DIRECTORY. Optional: --motion --frames 9 --target desktop --allow-warnings --flat.',
    );
  const g = options.preset
    ? preset(options.preset)
    : parseGenome(await readFile(options.input, 'utf8'));
  const settings = {
    meshLayout: options.layout || 'separate',
    mode: options.motion ? 'motion' : 'static',
    frames: Number(options.frames || 9),
    pose: options.pose || 'bind',
    phase: Number(options.phase ?? 0.5),
    target: options.target || 'desktop',
    acknowledgeWarnings: !!options['allow-warnings'],
    pigment: !options.flat,
  };
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  const asset = await buildDelivery(g, settings, {
    signal: controller.signal,
    onProgress: p => {
      if (p.stage === 'Sample motion') process.stderr.write(`Sample ${p.completed}/${p.total}\n`);
    },
  });
  const out = path.resolve(options.out);
  await mkdir(path.dirname(out), { recursive: true });
  await mkdir(out); // EEXIST is deliberate.
  await writeFile(path.join(out, asset.name + '.glb'), asset.glb, { flag: 'wx' });
  await writeFile(path.join(out, asset.name + '.asset.zip'), asset.zip, { flag: 'wx' });
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(asset.manifest, null, 2) + '\n', {
    flag: 'wx',
  });
  await writeFile(path.join(out, 'audit.json'), JSON.stringify(asset.report, null, 2) + '\n', {
    flag: 'wx',
  });
  console.log(
    JSON.stringify(
      {
        out,
        bytes: asset.glb.length,
        triangles: asset.manifest.totals.triangles,
        technicalStatus: asset.report.technicalStatus,
        visualApproval: false,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

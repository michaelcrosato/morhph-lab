import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(process.env.SERVE_DIR || base),
  port = Number(process.env.PORT || 3000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    let content = await readFile(file);
    // With npm dependencies installed, dev mode uses pinned local engine files.
    // No bundler and no CDN access are then required.
    if (['index.html', 'review.html'].includes(path.basename(file))) {
      try {
        await stat(path.join(base, 'node_modules/three/build/three.module.js'));
        await stat(path.join(base, 'node_modules/@dimforge/rapier3d-compat/rapier.mjs'));
        content = content
          .toString()
          .replace(
            'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js',
            '/node_modules/three/build/three.module.js',
          )
          .replace(
            'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs',
            '/node_modules/@dimforge/rapier3d-compat/rapier.mjs',
          );
      } catch {}
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(content);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end(error.code === 'ENOENT' ? 'Not found' : 'Unable to serve file');
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Morph Lab: http://localhost:${port}\nServing ${root}`),
);
server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});

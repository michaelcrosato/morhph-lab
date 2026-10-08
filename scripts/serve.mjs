import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { ROOT as base, ENGINES, cdnUrl, localUrl } from './project.mjs';
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
    if (path.basename(file) === 'index.html') {
      try {
        let text = content.toString();
        for (const id of Object.keys(ENGINES)) {
          await stat(path.join(base, localUrl(id)));
          text = text.replace(cdnUrl(id), localUrl(id));
        }
        content = text;
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

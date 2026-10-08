import { readFile } from 'node:fs/promises';
import { APP_VERSION } from './project.mjs';

const WORKSPACES = ['creator', 'review', 'workshop'];

const SHELL_STYLE = `
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#f4f6f1;color:#263731;font:13px system-ui,sans-serif}
body{display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:8px 16px;border-bottom:1px solid #d9e2da;flex:none}
header strong{font-size:12px;letter-spacing:.04em}
#workspace-status{flex:1;color:#53695d;font-size:12px}
nav{display:flex;gap:6px}
button{border:1px solid #cdd7cf;background:white;color:#263731;padding:6px 15px;border-radius:6px;font:inherit;cursor:pointer}
button[aria-pressed=true]{background:#375f50;color:white;border-color:#375f50;cursor:default}
button:focus-visible{outline:3px solid #b9812d;outline-offset:2px}
#workspace-host{flex:1;min-height:0}
iframe{display:block;width:100%;height:100%;border:0;background:#f9f9f3}
@media(max-width:600px){header{gap:8px;padding:8px 10px}#workspace-status{display:none}header strong{flex:1;font-size:10px}}
`;

/** Wraps the application document in a launcher that hosts one workspace at a time.
 * The release contains all three workspaces; `start` only picks the initial one.
 * The document is stored as a JSON string (with `<` escaped) in an inert script element. */
export async function packWorkspace(html, start = 'creator') {
  if (!WORKSPACES.includes(start)) throw new Error('Unknown initial workspace.');
  const shell = await readFile(new URL('./workspace-shell.js', import.meta.url), 'utf8');
  const payload = JSON.stringify(html).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="en" data-start="${start}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Morph Lab v${APP_VERSION} — Discovery Studio</title>
<style>${SHELL_STYLE}</style></head><body>
<header><strong>MORPH LAB / ${APP_VERSION}</strong><span id="workspace-status" role="status">Opening the studio…</span><nav aria-label="Workspace"><button data-open-workspace="creator">Create</button><button data-open-workspace="review">Inspect</button><button data-open-workspace="workshop">Advanced workshop</button></nav></header>
<main id="workspace-host"></main><noscript>Enable JavaScript to open the studio.</noscript>
<script id="morph-document" type="application/json">${payload}</script>
<script>${shell.replaceAll('</script', '<\\/script')}</script></body></html>`;
}

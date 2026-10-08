// Original inline SVG icons. No downloaded artwork or icon font.
const paths = {
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  legbank: '<path d="M5 4v16M5 5l8 2 5 6m-13-2 8 2 5 6m-13-2 6 2 2 3"/>',
  plateband:
    '<path d="M3 6Q12-1 21 6l-2 5Q12 6 5 11Zm1 5q8-5 16 0l-2 6q-6-4-12 0Zm2 6q6-4 12 0l-2 4H8Z"/>',
  petalcrown:
    '<path d="M12 12C2 2 0 13 12 14C2 24 16 25 13 14C24 25 25 9 14 12C26 2 12-2 12 12Z"/><circle cx="12" cy="13" r="2"/>',
  valvepair: '<path d="M12 21C-8 3 6-6 12 9C18-6 32 3 12 21Zm0-12v12M5 5l7 16M19 5l-7 16"/>',
  tubecluster:
    '<path d="M5 20V8m7 12V4m7 16V8"/><ellipse cx="5" cy="7" rx="3" ry="2"/><ellipse cx="12" cy="3" rx="3" ry="2"/><ellipse cx="19" cy="7" rx="3" ry="2"/>',
  irismouth:
    '<circle cx="12" cy="12" r="10"/><path d="m5 6 8 2 6-2m-6 2 3 7 5 3m-5-3-7 1-4 5m4-5-3-7-3-2"/>',
  latticecage:
    '<path d="m12 2 9 10-9 10L3 12Zm0 0L8 12l4 10m0-20 4 10-4 10M5 8h14M3 12h18M5 16h14"/>',
  whiskerfan: '<path d="M12 21Q1 12 2 5m10 16Q5 11 7 3m5 18V2m0 19Q19 11 17 3m-5 18Q23 12 22 5"/>',
  trunk: '<path d="M6 3c1 14 10 22 15 12l-3-3c-3 5-7 0-6-9ZM7 7h5M9 12l4-2m-1 6 3-3"/>',
  faceplate: '<path d="m5 3 7-2 7 2 1 13-8 6-8-6ZM6 8l5 1m2 0 5-1m-6 2-2 7h4Z"/>',

  combrail: '<path d="M4 20V4m0 2h13m-13 4h16M4 14h13M4 18h16M17 4v4m3 0v4m-3 0v4m3 0v4"/>',
  pumpbarrel:
    '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 4 14 4 14 0V5M5 10c0 4 14 4 14 0M5 15c0 4 14 4 14 0"/>',
  radialweb: '<path d="m12 2 3 6 7 1-5 5 1 8-6-4-7 4 2-8-5-5 7-1Z"/>',
  mantleskirt: '<path d="M3 18 1 14l4-4 1-6 6 2 6-2 1 6 4 4-2 4-5 1-4 3-4-3Z"/>',
  swimmeret: '<path d="M12 2v20M12 5l-8 3-1 3 4 1 5-7m0 6 8 3 1 3-4 1-5-7m0 7-8 3"/>',
  branchfan: '<path d="M12 22V3m0 7L5 6V2m0 4L2 5m10 9 7-6V3m0 5 4-3m-11 14-8-5m8 9 9-5"/>',
  ringwing:
    '<ellipse cx="12" cy="9" rx="10" ry="6"/><ellipse cx="12" cy="9" rx="7" ry="4"/><path d="m5 9 7 12 7-12M12 9v12"/>',
  pappus: '<path d="M12 22V8m0 4L1 7m11 5L4 2m8 10L9 1m3 11 3-11m-3 11 8-10m-8 10 11-5"/>',
  sailcell: '<path d="M12 1 2 12l10 11 10-11ZM12 1v22M2 12h20"/>',
  helixvane: '<path d="M12 1v22M6 2c18 3 18 7 0 10s-18 7 12 10M6 5c18 3 18 7 0 10"/>',
  ductfan:
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="7"/><path d="M12 12 9 5l7 2-4 5 7 4-7 3v-7l-7 4-1-7Z"/>',
  foldwing: '<path d="m2 21 2-14 3 2 3-6 3 4 4-3 1 5 5 1-4 7ZM2 21 7 9m-5 12L13 7M2 21l16-12"/>',
  caudal: '<path d="M12 22V13L3 2l9 4 9-4-9 11M5 4l7 6 7-6"/>',
  paddle: '<path d="M10 23V13C-3 5 9-4 13 3c12-3 14 10 1 11v9"/>',
  bell: '<path d="M2 14C2-3 22-3 22 14Zm3 1c5 3-4 7 1 8m6-8v8m7-8c-5 3 4 7-1 8"/>',
  coil: '<path d="M16 22C-6 24-2-2 12 2c15 4 7 20-2 15-7-4 0-13 5-7 3 4-4 7-4 2"/>',
  ribbon: '<path d="M2 3c8 14 12-13 20 1v14c-9-12-12 12-20 1Z"/>',
  rayfoil: '<path d="M12 1 23 14l-11 7L1 14Zm0 2v18"/>',
  featherwing: '<path d="M2 21 7 3l3 6 4-5-1 8 6-5-3 9 7-4-3 8Zm5-18 3 15"/>',
  insectwing: '<path d="M11 21 2 5C-1-4 18 3 11 21Zm2 0L23 5C24-4 6 3 13 21M4 6l7 15m9-15-7 15"/>',
  tailfan: '<path d="M12 22 2 6l4-3 3 4 3-5 3 5 3-4 4 3Zm0-1V7"/>',
  rotor: '<path d="M12 12C1 6 7-5 12 12Zm0 0c12-5 17 5 0 0Zm0 0c1 14-12 13 0 0M12 12v11"/>',
  elytra: '<path d="M11 3C-1 2-3 20 10 23Zm2 0c12-1 14 17 1 20ZM6 7 4 16m14-9 2 9"/>',
  floatsac: '<path d="M3 10C3-2 21-2 21 10s-18 12-18 0Zm5 9 4 4 4-4M12 2v17"/>',
  optic: '<path d="M1 12C6 2 18 2 23 12 18 22 6 22 1 12ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8"/>',
  siphon: '<path d="M6 22 7 9C-1 7 1 0 12 1s13 6 5 8l1 13Zm1-13h10M5 5h14"/>',
  oralarm:
    '<path d="M4 2h16M5 3c-5 8 5 12-2 20m7-20c-5 8 5 12-2 20m7-20c-5 8 5 12-2 20m7-20c-5 8 5 12-2 20"/>',

  morph:
    '<path d="M6 17c-5-4-2-12 3-11 2-6 11-2 9 3 6 1 5 9 0 9-3 5-10 4-12-1Z"/><circle cx="10" cy="11" r="1"/><circle cx="15" cy="11" r="1"/>',
  ear: '<path d="M6 21C1 14 3 3 8 2l8 12-3 7M8 7l4 8"/>',
  antler: '<path d="M12 22V9m0 5L5 7V2m0 7L1 6m11 7 7-7V1m0 7 4-4M12 10l3-7"/>',
  beak: '<path d="M3 8 21 12 3 14Zm0 8 13 2-10 4Z"/>',
  muzzle: '<path d="M3 8 7 3h10l4 5v10l-5 4H8l-5-4ZM8 12h8l-4 4Zm4 4v3"/>',
  crystal: '<path d="m12 1 5 7-5 15-5-15ZM3 9l4 4-2 8-4-8Zm18 0 2 4-4 8-2-8"/>',
  foliage: '<path d="M12 22V4M12 9C4 12 2 6 3 2c6 0 9 2 9 7Zm0 7c7 2 10-5 9-9-7 0-9 4-9 9Z"/>',
  blade: '<path d="m4 21 5-5m-3-3 5 5M8 14 19 2l3-1-1 4-11 11"/>',
  shield: '<path d="M3 4 12 1l9 3v8c0 5-5 8-9 11-4-3-9-6-9-11Zm9-1v17M6 9h12"/>',
  staff: '<path d="M10 22V9m0 0L6 5l4-4 4 4-4 4Zm-3 4h6"/>',
  pack: '<path d="M5 6h14v16H5ZM8 6V2h8v4M5 12h14M9 10v5m6-5v5"/>',
  pauldron: '<path d="M2 12c0-13 20-13 20 0L12 17Zm1 2 9 5 9-5M5 18l7 4 7-4"/>',
  banner: '<path d="M5 23V1m0 2h16v15l-6-3-10 3M8 6h10m-10 4h7"/>',
  body: '<path d="M5 18C-1 9 8 3 12 7c7-7 15 4 8 11-4 4-11 4-15 0Z"/>',
  leg: '<path d="m8 4 8 7-7 7 2 3h8M8 4l-2 7 3 7"/><circle cx="8" cy="4" r="2"/><circle cx="16" cy="11" r="2"/>',
  eye: '<path d="m8 22 3-9M14 22l-1-9"/><circle cx="12" cy="8" r="6"/><circle cx="13" cy="8" r="2.5"/>',
  horn: '<path d="M5 22C2 10 9 1 20 2 11 7 11 14 14 22Z"/><path d="m5 17 7-2m-7-3 7-2"/>',
  tail: '<path d="M4 22c1-7 14-4 13-11-1-3-5-2-5-5 0-2 3-3 7-3-2 2-3 3-2 4 7 4 3 11-3 14"/>',
  fin: '<path d="M3 21C6 15 4 6 8 2c3 11 13 6 13 19Z"/><path d="m8 7 3 14M12 12l4 9"/>',
  mouth:
    '<path d="M3 10c3-9 17-9 19 0-1 12-16 16-19 0Z"/><path d="m5 7 3 5 3-7 3 7 4-7m-10 14 2-5 3 5 3-5"/>',
  mixer: '<path d="M5 3v18M12 3v18M19 3v18"/><path d="M2 8h6M9 16h6M16 6h6" stroke-width="3"/>',
  wing: '<path d="M3 21 8 3l5 5 6-1 2 8-10 2Z"/><path d="m3 21 10-13m-10 13 16-14m-16 14 18-6"/>',
  tentacle: '<path d="M4 22C-2 7 8 2 15 4c9 3 2 13-3 9-4-4 7-4 4 0-3 7-9 6-6 10"/>',
  antenna:
    '<path d="M8 23C3 13 7 8 7 5m8 18c8-8 6-14 3-18"/><circle cx="7" cy="4" r="2"/><circle cx="18" cy="4" r="2"/>',
  shell: '<path d="M2 19C2-3 23-3 22 19ZM2 19h20M8 4l2 15m6-15-2 15M4 12h16"/>',
  mandible:
    '<path d="M3 21C2 6 9 1 14 2 7 7 9 12 19 7 19 16 9 18 8 23"/><path d="m9 12 2 3m3-4 2 3"/>',
  crest: '<path d="m2 21 3-10 3 5 4-14 4 14 3-5 3 10Z"/>',
  clubtail:
    '<path d="M4 22c-4-9 12-7 9-13"/><path d="m12 3 3-2 2 4 4-1 1 4-4 1 1 4-5 1-1-4-3-1Z"/>',
  frill: '<path d="M12 22 2 11l4-7 6-3 6 3 4 7Z"/><path d="M12 22 6 4m6 18V1m0 21 6-18"/>',
  claw: '<path d="M10 23v-8C1 14 2 5 8 2L6 9l6 4 5-4-1-7c8 5 6 12-2 13v8"/>',
  gill: '<path d="M12 23V3M12 8C6 10 3 4 3 1c6 0 9 3 9 7Zm0 6c-6 2-9-3-10-6 6-1 10 2 10 6Zm0 0c6 2 9-3 10-6-6-1-10 2-10 6Zm0 6c-6 2-9-3-10-6m10-6c6 2 9-4 9-7-6 0-9 3-9 7"/>',
  undo: '<path d="m8 5-5 5 5 5M3 10h10c9 0 9 11 1 11"/>',
  redo: '<path d="m16 5 5 5-5 5m5-5H11C2 10 2 21 10 21"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  frame: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6"/><circle cx="12" cy="12" r="3"/>',
  save: '<path d="M4 3h13l4 4v14H4Z"/><path d="M8 3v6h9V3M8 21v-8h9v8"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  camera: '<path d="M3 7h5l2-3h4l2 3h5v14H3Z"/><circle cx="12" cy="14" r="4"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" stroke-width="3"/>',
  symmetry: '<path d="M12 2v20M8 5 2 12l6 7Zm8 0 6 7-6 7Z"/>',
  grid: '<path d="M4 4h16v16H4ZM4 10h16M4 15h16M10 4v16m5-16v16"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9 8c0-4 7-4 7 0 0 3-4 2-4 6m0 3h.01"/>',
  tree: '<path d="M5 3v16h5M5 8h5M15 3h6v6h-6Zm0 12h6v6h-6Z"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  move: '<path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3"/>',
  leaf: '<path d="M4 20C0 7 13 4 21 3c0 13-8 20-17 17Zm0 0L16 8"/>',
  code: '<path d="m8 5-6 7 6 7m8-14 6 7-6 7M14 3l-4 18"/>',
};
export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.body}</svg>`;
}
export const escapeHTML = s =>
  String(s).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/** Shared foundation detail plan. Both the game and the review compiler consume
 * these nodes. It contains no renderer, DOM, texture image, or physics objects. */
import { humanoidLayout } from './humanoid.js';
export function humanoidDetailPlan(rig) {
  const p = rig.proportions,
    l = humanoidLayout(rig),
    s = p.scale,
    nodes = [],
    fingers = [],
    eyes = [];
  const add = (
    parent,
    kind,
    position = [0, 0, 0],
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
    extra = {},
  ) => {
    const n = { id: 'detail-' + nodes.length, parent, kind, position, scale, rotation, ...extra };
    nodes.push(n);
    return n;
  };
  const mesh = (parent, material, position, scale, geometry = 'sphere', socket = null) =>
    add(typeof parent === 'string' ? parent : parent.id, 'mesh', position, scale, [0, 0, 0], {
      material,
      geometry,
      socket,
    });
  const group = (parent, position = [0, 0, 0]) =>
    add(typeof parent === 'string' ? parent : parent.id, 'group', position);
  function segment(bone, length, radius, material, socket) {
    mesh(
      bone,
      material,
      [0, -length * 0.48, 0],
      [radius, length * 0.57, radius * 0.9],
      'sphere',
      socket,
    );
    mesh(bone, 'skin', [0, 0, 0], [radius * 0.98, radius * 0.98, radius * 0.98], 'sphere', socket);
  }
  for (const side of [1, -1]) {
    const end = side > 0 ? '.L' : '.R',
      arm = 'upperArm' + end,
      fore = 'forearm' + end,
      hand = 'hand' + end,
      thigh = 'upperLeg' + end,
      shin = 'shin' + end,
      foot = 'foot' + end;
    segment(arm, l.upperArm, l.armRadius, 'skin', 'upperArm');
    segment(fore, l.forearm, l.armRadius * 0.82, 'skin', 'forearm');
    segment(thigh, l.thigh, l.thighRadius, rig.outfit === 'wrap' ? 'skin' : 'dark', 'upperLeg');
    segment(shin, l.shin, l.thighRadius * 0.73, 'skin', 'shin');
    mesh(
      foot,
      'dark',
      [0, -0.025 * s, 0.105 * p.feet * s],
      [0.145 * p.feet * s, l.footHeight, 0.28 * p.feet * s],
      'sphere',
      'foot',
    );
    mesh(
      foot,
      'accent',
      [0, 0.055 * s, 0.015 * s],
      [0.14 * p.feet * s, 0.16 * s, 0.135 * p.feet * s],
    );
    mesh(
      hand,
      'skin',
      [0, -l.hand * 0.38, 0.005 * s],
      [0.098 * p.hands * s, l.hand * 0.57, 0.065 * p.hands * s],
      'sphere',
      'hand',
    );
    const count = rig.handStyle === 'stone' ? 3 : 4;
    for (let i = 0; i < count; i++) {
      const hinge = group(hand, [
        (i - (count - 1) / 2) * 0.049 * p.hands * s,
        -l.hand * 0.8,
        0.009 * s,
      ]);
      const length = (0.125 - Math.abs(i - (count - 1) / 2) * 0.017) * p.hands * s;
      const f = mesh(
        hinge,
        'skin',
        [0, -length * 0.4, 0],
        [0.023 * p.hands * s, length * 0.57, 0.025 * p.hands * s],
        'sphere',
        'hand',
      );
      f.socketBone = hand;
      if (rig.handStyle === 'claws') {
        const claw = mesh(
          hinge,
          'dark',
          [0, -length * 0.91, 0.014 * s],
          [0.019 * s, 0.076 * p.hands * s, 0.019 * s],
          'cone',
        );
        claw.rotation[0] = Math.PI - 0.3;
      }
      fingers.push({ id: hinge.id, side, index: i, base: 0 });
    }
    const thumb = group(hand, [-side * 0.088 * p.hands * s, -l.hand * 0.16, 0.005 * s]);
    thumb.rotation[2] = -side * 0.5;
    mesh(
      thumb,
      'skin',
      [0, -0.067 * p.hands * s, 0.018 * s],
      [0.033 * p.hands * s, 0.081 * p.hands * s, 0.032 * p.hands * s],
    );
    fingers.push({ id: thumb.id, side, index: 4, base: 0 });
    if (rig.outfit === 'armor' || rig.outfit === 'carapace') {
      mesh(
        arm,
        'armor',
        [side * 0.025 * s, -0.03 * s, 0],
        [l.armRadius * 1.65, 0.2 * s, l.armRadius * 1.4],
      );
      mesh(
        fore,
        'armor',
        [0, -l.forearm * 0.65, 0.005 * s],
        [l.armRadius * 0.99, l.forearm * 0.25, l.armRadius * 0.96],
      );
      mesh(
        shin,
        'armor',
        [0, -l.shin * 0.44, 0.03 * s],
        [l.thighRadius * 0.8, l.shin * 0.35, l.thighRadius * 0.84],
      );
    }
  }
  const hs = p.head * s;
  for (const side of [1, -1]) {
    const position = [side * 0.115 * hs, 0.057 * hs, 0.271 * hs];
    mesh('head', 'skin', position, [0.091 * hs, 0.069 * hs, 0.057 * hs]);
    const eye = group('head', [...position]);
    mesh(eye, 'eye', [0, 0, 0.018 * hs], [0.073 * hs, 0.048 * hs, 0.04 * hs]);
    const iris = mesh(eye, 'iris', [0, 0, 0.053 * hs], [0.031 * hs, 0.035 * hs, 0.018 * hs]);
    mesh(iris, 'pupil', [0, 0, 0.65], [0.46, 0.8, 0.6]);
    mesh(eye, 'glint', [-0.012 * hs, 0.014 * hs, 0.07 * hs], [0.01 * hs, 0.01 * hs, 0.005 * hs]);
    const brow = mesh(
      'head',
      'dark',
      [side * 0.114 * hs, 0.142 * hs, 0.276 * hs],
      [0.096 * hs, 0.02 * hs, 0.028 * hs],
    );
    brow.rotation[2] = side * -0.1;
    mesh('head', 'skin', [side * 0.288 * hs, -0.005 * hs, 0], [0.065 * hs, 0.105 * hs, 0.055 * hs]);
    eyes.push({ group: eye.id, iris: iris.id });
  }
  mesh('head', 'skin', [0, -0.005 * hs, 0.316 * hs], [0.044 * hs, 0.078 * hs, 0.065 * hs]);
  mesh('jaw', 'skin', [0, -0.035 * hs, 0.044 * hs], [0.155 * hs, 0.07 * hs, 0.09 * hs]);
  mesh('jaw', 'dark', [0, 0.018 * hs, 0.101 * hs], [0.111 * hs, 0.015 * hs, 0.01 * hs]);
  if (rig.headStyle !== 'bare') {
    const material =
      rig.headStyle === 'crest' ? 'armor' : rig.headStyle === 'hood' ? 'accent' : 'dark';
    mesh(
      'head',
      material,
      [0, 0.025 * hs, -0.015 * hs],
      [0.311 * hs, 0.35 * hs, 0.327 * hs],
      'cap',
    );
    if (rig.headStyle === 'hood')
      for (const side of [-1, 1])
        mesh(
          'head',
          'accent',
          [side * 0.278 * hs, -0.055 * hs, -0.06 * hs],
          [0.065 * hs, 0.27 * hs, 0.27 * hs],
        );
    if (rig.headStyle === 'crest')
      for (let i = 0; i < 6; i++)
        mesh(
          'head',
          'accent',
          [0, 0.34 * hs, -0.2 * hs + i * 0.075 * hs],
          [0.047 * hs, 0.1 * hs, 0.052 * hs],
        );
  }
  mesh(
    'pelvis',
    'dark',
    [0, 0.025 * s, 0],
    [0.393 * p.hips * s, 0.05 * s, 0.322 * Math.pow(p.bulk, 0.25) * s],
  );
  mesh('pelvis', 'armor', [0, 0.028 * s, 0.326 * s], [0.068 * s, 0.062 * s, 0.025 * s]);
  return { nodes, fingers, eyes };
}
/** Standard latitude/longitude sphere and cap. Winding points outwards.
 * The detail resolution is shared by the game adapter and the review compiler. */
export function foundationPrimitive(kind = 'sphere') {
  if (kind === 'cone') return cone();
  if (!['sphere', 'cap'].includes(kind)) throw new Error('Unknown foundation primitive: ' + kind);
  const width = 24,
    height = kind === 'cap' ? 12 : 16,
    end = kind === 'cap' ? Math.PI * 0.56 : Math.PI;
  const positions = [],
    normals = [],
    uvs = [],
    indices = [];
  for (let y = 0; y <= height; y++)
    for (let x = 0; x <= width; x++) {
      const u = x / width,
        v = y / height,
        theta = v * end,
        phi = u * Math.PI * 2;
      const p = [
        -Math.cos(phi) * Math.sin(theta),
        Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
      ];
      positions.push(...p);
      normals.push(...p);
      uvs.push(u, 1 - v);
    }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const a = y * (width + 1) + x + 1,
        b = a - 1,
        c = b + width + 1,
        d = a + width + 1;
      if (y !== 0) indices.push(a, b, d);
      if (y !== height - 1 || end < Math.PI) indices.push(b, c, d);
    }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  };
}
function cone() {
  const positions = [],
    normals = [],
    uvs = [],
    indices = [],
    n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2,
      b = ((i + 1) / n) * Math.PI * 2,
      k = positions.length / 3;
    const p = [Math.sin(a), -0.5, Math.cos(a)],
      q = [Math.sin(b), -0.5, Math.cos(b)],
      tip = [0, 0.5, 0];
    positions.push(...p, ...q, ...tip, 0, -0.5, 0, ...q, ...p);
    const nx = Math.sin((a + b) / 2),
      nz = Math.cos((a + b) / 2),
      mag = Math.sqrt(2);
    for (let j = 0; j < 3; j++) normals.push(nx / mag, 1 / mag, nz / mag);
    for (let j = 0; j < 3; j++) normals.push(0, -1, 0);
    uvs.push(0, 0, 1, 0, 0.5, 1, 0.5, 0.5, 1, 0, 0, 0);
    indices.push(k, k + 1, k + 2, k + 3, k + 4, k + 5);
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  };
}

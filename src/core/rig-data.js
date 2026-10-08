import { humanoidLayout } from './humanoid.js';
import { clamp, smooth } from './math.js';

/** Stable semantic names. Finger hinges are runtime controls, not skeleton bones. */
export function humanoidSkeleton(rig) {
  const l = humanoidLayout(rig),
    p = rig.proportions,
    s = p.scale;
  const bones = [
    { name: 'pelvis', parent: null, position: [0, 0, 0] },
    { name: 'spine', parent: 'pelvis', position: [0, l.spineY, 0] },
    { name: 'chest', parent: 'spine', position: [0, l.chestY - l.spineY, 0] },
    { name: 'neck', parent: 'chest', position: [0, l.neckY - l.chestY, 0] },
    { name: 'head', parent: 'neck', position: [0, l.headY - l.neckY, 0] },
    { name: 'jaw', parent: 'head', position: [0, -0.15 * p.head * s, 0.18 * p.head * s] },
  ];
  for (const side of [1, -1]) {
    const end = side > 0 ? '.L' : '.R',
      clavicleX = 0.28 * p.shoulders * s;
    bones.push(
      {
        name: 'clavicle' + end,
        parent: 'chest',
        position: [side * clavicleX, l.shoulderY - l.chestY, 0],
      },
      {
        name: 'upperArm' + end,
        parent: 'clavicle' + end,
        position: [side * (l.shoulderX - clavicleX), 0, 0],
      },
      { name: 'forearm' + end, parent: 'upperArm' + end, position: [0, -l.upperArm, 0] },
      { name: 'hand' + end, parent: 'forearm' + end, position: [0, -l.forearm, 0] },
      { name: 'upperLeg' + end, parent: 'pelvis', position: [side * l.hipX, 0, 0] },
      { name: 'shin' + end, parent: 'upperLeg' + end, position: [0, -l.thigh, 0] },
      { name: 'foot' + end, parent: 'shin' + end, position: [0, -l.shin, 0] },
      { name: 'toe' + end, parent: 'foot' + end, position: [0, -0.025 * s, 0.22 * p.feet * s] },
    );
  }
  return bones;
}
/** Automatic rest-space skin weights for the implicit torso and garment. */
export function humanoidSkinWeights(
  positions,
  rig,
  boneNames = humanoidSkeleton(rig).map(b => b.name),
) {
  if (positions.length % 3) throw new Error('Position buffer must contain XYZ triples.');
  const l = humanoidLayout(rig),
    anchors = [
      ['pelvis', 0],
      ['spine', l.spineY],
      ['chest', l.chestY],
      ['neck', l.neckY - 0.06 * l.scale],
      ['head', l.headY - 0.13 * rig.proportions.head * l.scale],
    ];
  if (anchors.some(([name]) => !boneNames.includes(name)))
    throw new Error('Required torso bones are missing.');
  const indices = new Uint16Array((positions.length / 3) * 4),
    weights = new Float32Array(indices.length);
  for (let i = 0; i < positions.length / 3; i++) {
    const y = positions[i * 3 + 1];
    if (!Number.isFinite(y)) throw new Error('Non-finite skin position.');
    let left = 0;
    while (left < anchors.length - 2 && y > anchors[left + 1][1]) left++;
    const [a, ay] = anchors[left],
      [b, by] = anchors[left + 1],
      t = smooth(clamp((y - ay) / (by - ay), 0, 1));
    indices[i * 4] = boneNames.indexOf(a);
    indices[i * 4 + 1] = boneNames.indexOf(b);
    weights[i * 4] = 1 - t;
    weights[i * 4 + 1] = t;
  }
  return { indices, weights };
}
/** Open elliptical garment shell. All dimensions derive from the same rig. */
export function humanoidGarment(rig) {
  const p = rig.proportions,
    l = humanoidLayout(rig),
    s = p.scale;
  const wrap = rig.outfit === 'wrap',
    rings = wrap
      ? [
          [-0.4 * s, 0.44 * p.hips * s, 0.34 * s],
          [-0.15 * s, 0.41 * p.hips * s, 0.34 * s],
          [0.12 * s, 0.38 * p.hips * s, 0.31 * s],
        ]
      : [
          [-0.35 * s, 0.44 * p.hips * s, 0.34 * s],
          [0, 0.4 * p.hips * s, 0.32 * s],
          [l.spineY, 0.35 * Math.pow(p.bulk, 0.4) * s, 0.33 * Math.sqrt(p.bulk) * s],
          [l.chestY, 0.55 * p.shoulders * s, 0.35 * Math.pow(p.bulk, 0.65) * s],
          [l.chestY + 0.23 * p.torso * s, 0.49 * p.shoulders * s, 0.31 * s],
          [l.neckY + 0.015 * s, 0.16 * s, 0.18 * s],
        ];
  const positions = [],
    uvs = [],
    indices = [],
    segments = 32;
  for (let row = 0; row < rings.length; row++)
    for (let col = 0; col <= segments; col++) {
      const a = (col / segments) * Math.PI * 2,
        [y, rx, rz] = rings[row];
      const hem = row === 0 ? Math.cos(a * 10) * 0.016 * s : 0;
      positions.push(Math.sin(a) * rx, y + hem, Math.cos(a) * rz);
      uvs.push(col / segments, row / (rings.length - 1));
      if (row < rings.length - 1 && col < segments) {
        const k = row * (segments + 1) + col,
          n = k + segments + 1;
        indices.push(k, k + 1, n, k + 1, n + 1, n);
      }
    }
  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  };
}

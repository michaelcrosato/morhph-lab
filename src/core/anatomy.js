import { fieldSupportPoints } from './field-geometry.js';
import { bloomSupportPoints } from './bloom-geometry.js';
import { placeTidalPoint } from './tidal-geometry.js';
import { defaultTravel } from './travel.js';
import {
  humanoidLayout,
  socketRest,
  compatibilityReport,
  humanoidSurfaceNodes,
} from './humanoid.js';
import { add, sub, mul, normalize, clamp, length } from './math.js';
/** Body nodes form a rooted translation hierarchy. Parts use normalized radial
 * anchors instead of triangle indices, so remeshing does not orphan attachments. */
export function resolveNodes(genome) {
  const byId = new Map(genome.nodes.map(n => [n.id, n])),
    cache = new Map();
  function resolve(node) {
    if (cache.has(node.id)) return cache.get(node.id);
    const center = node.parent
      ? add(resolve(byId.get(node.parent)).center, node.offset)
      : [...node.offset];
    const result = { ...node, center };
    cache.set(node.id, result);
    return result;
  }
  return genome.nodes.map(resolve);
}
export function smoothMin(a, b, k = 0.28) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b + (a - b) * h - k * h * (1 - h);
}
export function ellipsoidDistance(p, n) {
  // Conservative ellipsoid distance approximation. This is used consistently
  // for the surface, normals and anchor projection, not as a physics collider.
  const x = (p[0] - n.center[0]) / n.radii[0],
    y = (p[1] - n.center[1]) / n.radii[1],
    z = (p[2] - n.center[2]) / n.radii[2];
  return (Math.hypot(x, y, z) - 1) * Math.min(...n.radii);
}
export function field(p, nodes, blend = nodes[0]?.surfaceBlend ?? 0.28) {
  let d = 1e9;
  for (const n of nodes) d = smoothMin(d, ellipsoidDistance(p, n), blend);
  return d;
}
export function fieldNormal(p, nodes) {
  const e = 0.004;
  return normalize([
    field([p[0] + e, p[1], p[2]], nodes) - field([p[0] - e, p[1], p[2]], nodes),
    field([p[0], p[1] + e, p[2]], nodes) - field([p[0], p[1] - e, p[2]], nodes),
    field([p[0], p[1], p[2] + e], nodes) - field([p[0], p[1], p[2] - e], nodes),
  ]);
}
export function projectAnchor(node, direction, nodes) {
  const dir = normalize(direction);
  let lo = 0,
    hi = 0.08;
  // The first exit from the connected body surface is the attachment point.
  for (let i = 0; i < 400 && field(add(node.center, mul(dir, hi)), nodes) < 0; i++) {
    lo = hi;
    hi += 0.08;
  }
  for (let i = 0; i < 16; i++) {
    const m = (lo + hi) * 0.5;
    if (field(add(node.center, mul(dir, m)), nodes) < 0) lo = m;
    else hi = m;
  }
  const position = add(node.center, mul(dir, (lo + hi) * 0.5));
  return { position, normal: fieldNormal(position, nodes) };
}
export function expandParts(genome, nodes = resolveNodes(genome)) {
  const map = new Map(nodes.map(n => [n.id, n])),
    surfaceNodes = humanoidSurfaceNodes(genome.rig, nodes);
  let legPair = 0;
  return genome.parts
    .filter(p => (p.presence ?? 1) > 0.005)
    .flatMap(part => {
      const pair = part.type === 'leg' ? legPair++ : 0;
      // An anchor on the symmetry plane is emitted once, not as coincident meshes.
      const sides = part.mirror && Math.abs(part.anchor[0]) > 0.025 ? [1, -1] : [1];
      return sides.map(side => {
        const anchor = [part.anchor[0] * side, part.anchor[1], part.anchor[2]];
        let projected = projectAnchor(map.get(part.host), anchor, surfaceNodes);
        if (genome.rig?.family === 'humanoid' && part.socket && part.socket !== 'body') {
          const socket = socketRest(genome.rig, part.socket, Math.sign(anchor[0]) || 1);
          projected = {
            position: add(socket.position, mul(normalize(anchor), socket.radius)),
            normal: normalize(anchor),
          };
        }
        projected.position = add(
          projected.position,
          (part.socketOffset || [0, 0, 0]).map((v, i) => v * (i === 0 ? side : 1)),
        );
        return {
          ...part,
          size: part.size * (part.presence ?? 1),
          ...projected,
          side: Math.sign(anchor[0]) || 1,
          mirrorSide: side,
          pair,
          indexKey: part.id + ':' + side,
        };
      });
    });
}
export function analyze(genome) {
  const nodes = resolveNodes(genome),
    parts = expandParts(genome, nodes),
    legs = parts.filter(p => p.type === 'leg');
  const bodyBottom = Math.min(...nodes.map(n => n.center[1] - n.radii[1]));
  const clearances = legs
    .map(p => 1.38 * p.size * p.length * 0.82 - p.position[1] + 0.12)
    .sort((a, b) => a - b);
  const desired = clearances.length ? clearances[Math.floor(clearances.length / 2)] : 0;
  const supportSamples =
    genome.rig?.family === 'humanoid' || genome.motion?.travel?.medium !== 'ground'
      ? []
      : parts
          .filter(p => p.normal[1] < -0.05)
          .flatMap(p =>
            [...bloomSupportPoints(p), ...fieldSupportPoints(p)].map(
              v => placeTidalPoint(v, p)[1] - 0.12 * p.size,
            ),
          );
  const restHeight = Math.max(-bodyBottom + 0.12, desired, ...supportSamples.map(y => -y + 0.03));
  const volume = nodes.reduce(
    (s, n) => s + (4 / 3) * Math.PI * n.radii[0] * n.radii[1] * n.radii[2],
    0,
  );
  let speed = legs.length
    ? clamp(2.0 + Math.sqrt(legs.length) * 0.9 - volume * 0.085, 1.1, 5.8)
    : 0.85;
  const report = compatibilityReport(genome),
    warnings = [...report.notes],
    travel = genome.motion?.travel ?? defaultTravel();
  if (travel.medium !== 'ground')
    warnings.push(
      'Arcade ' +
        travel.medium +
        ' travel: body collisions are active. Decorative parts do not create lift, thrust, or collision shapes.',
    );
  if (genome.rig?.family === 'humanoid' && genome.motion?.bodyWave?.kind !== 'rigid')
    warnings.push(
      'Body waves are inactive on humanoids. The humanoid skeleton remains in control.',
    );
  if (genome.rig?.family === 'humanoid') {
    const l = humanoidLayout(genome.rig);
    return {
      nodes,
      parts,
      travel,
      legs: 2,
      restHeight: l.restHeight,
      speed: clamp(
        3.1 * Math.sqrt(genome.rig.proportions.legs) * (genome.actor?.speed ?? 1),
        0.9,
        6,
      ),
      volume,
      partCount: parts.filter(p => p.type !== 'leg').length + nodes.length + 14,
      warnings,
      rigFamily: 'humanoid',
      compatibility: report,
    };
  }
  if (!legs.length && travel.medium === 'ground')
    warnings.push(
      supportSamples.length
        ? 'Rest foot samples set fixed ground clearance. Animated feet have no collision shapes or terrain contacts.'
        : 'No legs: this creature will crawl on its controller.',
    );
  if (
    travel.medium === 'ground' &&
    legs.some(p => restHeight + p.position[1] > 1.38 * p.size * p.length + 0.08)
  )
    warnings.push('Some legs cannot reach the floor. Increase their length or lower their anchor.');
  if (parts.length > 40) warnings.push('Dense anatomy: fewer appendages will reduce draw calls.');
  return {
    nodes,
    parts,
    travel,
    legs: legs.length,
    visualSupportPoints: supportSamples.length,
    restHeight,
    speed: (travel.medium === 'ground' ? speed : travel.speed) * (genome.actor?.speed ?? 1),
    volume,
    partCount: parts.length + nodes.length,
    warnings,
    rigFamily: 'creature',
    compatibility: report,
  };
}
export function nearestNode(point, nodes) {
  return nodes.reduce(
    (best, n) =>
      Math.abs(ellipsoidDistance(point, n)) < Math.abs(ellipsoidDistance(point, best)) ? n : best,
    nodes[0],
  );
}

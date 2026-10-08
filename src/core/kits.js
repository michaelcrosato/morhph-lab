import { validateGenome, createPart, LIMITS } from './genome.js';
import { PART_KITS } from './content-pack.js';
export { PART_KITS } from './content-pack.js';
/** Pure and atomic: build a new blueprint first. A failed kit never alters its source. */
export function applyPartKit(source, id) {
  if (!Object.hasOwn(PART_KITS, id)) throw new Error('Unknown part kit.');
  const kit = PART_KITS[id];
  const g = validateGenome(source);
  if (kit.family !== 'any' && kit.family !== g.rig.family)
    throw new Error(
      'This equipment kit requires a humanoid rig. Add individual parts to a creature instead.',
    );
  if (g.parts.length + kit.parts.length > LIMITS.parts)
    throw new Error('The kit would exceed the 32-gene limit. Remove parts first.');
  const added = [];
  for (const spec of kit.parts) {
    const host = g.nodes.some(n => n.id === spec.host)
      ? spec.host
      : g.nodes.find(n => n.id === (spec.host === 'head' ? 'head' : 'core'))?.id || g.nodes[0].id;
    const part = createPart(g, spec.type, host, spec.anchor, spec.mirror ?? false);
    Object.assign(part, {
      size: spec.size ?? 1,
      length: spec.length ?? 1,
      variant: spec.variant ?? 0,
      phase: spec.phase ?? 0,
      twist: spec.twist ?? 0,
      flex: spec.flex ?? 1,
      material: spec.material ?? 'inherit',
      socket: spec.socket ?? 'body',
      socketOffset: spec.socketOffset ?? [0, 0, 0],
    });
    g.parts.push(part);
    added.push(part.id);
  }
  return { genome: validateGenome(g), added };
}

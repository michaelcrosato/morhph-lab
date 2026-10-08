import { registerTidalParts } from './tidal-parts.js';
import * as THREE from 'three';
/** Factories implement {group, update(time, speed, pose), ...optional IK bindings}.
 * No factory talks to the editor, storage, renderer or Rapier world. */
export class PartRegistry {
  constructor() {
    this.factories = new Map();
  }
  register(type, factory) {
    if (this.factories.has(type)) throw new Error('Duplicate part factory: ' + type);
    this.factories.set(type, factory);
    return this;
  }
  create(part, context) {
    const factory = this.factories.get(part.type);
    if (!factory) throw new Error('Missing factory: ' + part.type);
    const runtime = factory(part, context);
    if (part.material && part.material !== 'inherit') {
      const selected = context.materials[part.material];
      if (!selected?.isMaterial) throw new Error('Missing part material: ' + part.material);
      const replaceable = new Set(
        ['skin', 'armor', 'accent', 'horn', 'membrane', 'bone', 'cloth', 'metal', 'glow'].map(
          k => context.materials[k],
        ),
      );
      runtime.group.traverse(o => {
        if (o.isMesh && replaceable.has(o.material)) o.material = selected;
      });
    }
    return runtime;
  }
}
export function createGeometryKit() {
  return {
    sphere: new THREE.SphereGeometry(1, 24, 16),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
    cone: new THREE.ConeGeometry(1, 1, 12),
  };
}
export function alignSegment(m, a, b, radius) {
  const start = new THREE.Vector3().fromArray(a),
    end = new THREE.Vector3().fromArray(b),
    delta = end.clone().sub(start);
  m.position.copy(start.add(end).multiplyScalar(0.5));
  m.scale.set(radius, delta.length(), radius);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
}
export function defaultRegistry() {
  return registerTidalParts(new PartRegistry());
}

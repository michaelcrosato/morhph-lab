import * as THREE from 'three';
/** Recover the rest-space attachment point from a hit on animated skin.
 * Barycentric weights remain valid across linear skinning of one triangle. */
export function restPickPoint(hit, creature) {
  const object = hit.object;
  if (object.isSkinnedMesh && hit.face) {
    const local = object.worldToLocal(hit.point.clone()),
      a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3(),
      w = new THREE.Vector3();
    object.getVertexPosition(hit.face.a, a);
    object.getVertexPosition(hit.face.b, b);
    object.getVertexPosition(hit.face.c, c);
    THREE.Triangle.getBarycoord(local, a, b, c, w);
    if (w.x >= -0.01 && w.y >= -0.01 && w.z >= -0.01) {
      const pos = object.geometry.attributes.position;
      return new THREE.Vector3()
        .fromBufferAttribute(pos, hit.face.a)
        .multiplyScalar(w.x)
        .addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, hit.face.b), w.y)
        .addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, hit.face.c), w.z);
    }
  }
  if (object === creature.body && hit.face && creature.restSurface) {
    const local = object.worldToLocal(hit.point.clone()),
      a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3(),
      w = new THREE.Vector3(),
      pos = object.geometry.attributes.position,
      rest = creature.restSurface.attributes.position;
    a.fromBufferAttribute(pos, hit.face.a);
    b.fromBufferAttribute(pos, hit.face.b);
    c.fromBufferAttribute(pos, hit.face.c);
    THREE.Triangle.getBarycoord(local, a, b, c, w);
    if ([w.x, w.y, w.z].every(Number.isFinite))
      return a
        .fromBufferAttribute(rest, hit.face.a)
        .multiplyScalar(w.x)
        .addScaledVector(b.fromBufferAttribute(rest, hit.face.b), w.y)
        .addScaledVector(c.fromBufferAttribute(rest, hit.face.c), w.z);
  }
  return creature.torso.worldToLocal(hit.point.clone());
}

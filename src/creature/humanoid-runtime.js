import * as THREE from 'three';
import { humanoidLayout, hostBone, socketBone, humanoidSurfaceNodes } from '../core/humanoid.js';
import { humanoidSkeleton, humanoidSkinWeights, humanoidGarment } from '../core/rig-data.js';
import { buildBodySurface } from './surface.js';
import { humanoidDetailPlan, foundationPrimitive } from '../core/foundation-shapes.js';

/** Construct a real Three Skeleton and SkinnedMesh, plus joint-mounted details. */
export function buildHumanoidRuntime(creature, registry, surface) {
  const c = creature,
    g = c.genome,
    rig = g.rig,
    p = rig.proportions,
    l = humanoidLayout(rig),
    s = p.scale,
    m = c.materials;
  const bones = {},
    spec = humanoidSkeleton(rig),
    rest = new Map(),
    fingers = [],
    eyes = [];
  for (const desc of spec) {
    const b = new THREE.Bone();
    b.name = desc.name;
    b.position.fromArray(desc.position);
    bones[desc.name] = b;
    rest.set(desc.name, b.position.clone());
    (desc.parent ? bones[desc.parent] : c.torso).add(b);
  }
  c.root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(spec.map(d => bones[d.name]));
  function skin(geometry, material) {
    const data = humanoidSkinWeights(
      geometry.attributes.position.array,
      rig,
      spec.map(b => b.name),
    );
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(data.indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(data.weights, 4));
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, l.chestY, 0), 4 * s);
    c.torso.add(mesh);
    mesh.bind(skeleton);
    mesh.userData.body = true;
    c.pickables.push(mesh);
    return mesh;
  }
  c.body = skin(
    surface ? surface.clone() : buildBodySurface(humanoidSurfaceNodes(rig, c.analysis.nodes)),
    m.skin,
  );
  c.mountTargets = [c.body];
  const restWorld = {};
  for (const [name, b] of Object.entries(bones))
    restWorld[name] = b.getWorldPosition(new THREE.Vector3());
  // Shared procedural detail plan. Review and game use the same geometry data.
  const plan = humanoidDetailPlan(rig),
    objects = { ...bones },
    primitiveGeometry = {};
  for (const kind of ['sphere', 'cap', 'cone']) {
    const d = foundationPrimitive(kind),
      geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(d.normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(d.uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(d.indices, 1));
    primitiveGeometry[kind] = geo;
    c.geometries['foundation-' + kind] = geo;
  }
  for (const n of plan.nodes) {
    const parent = objects[n.parent];
    if (!parent) throw new Error('Missing foundation parent: ' + n.parent);
    const obj =
      n.kind === 'mesh'
        ? new THREE.Mesh(primitiveGeometry[n.geometry], m[n.material])
        : new THREE.Group();
    obj.name = n.id;
    obj.position.fromArray(n.position);
    obj.scale.fromArray(n.scale);
    obj.rotation.set(...n.rotation);
    parent.add(obj);
    objects[n.id] = obj;
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      c.pickables.push(obj);
      if (n.socket) {
        obj.userData.rigSocket = n.socket;
        obj.userData.socketBone = n.socketBone || parent.name;
        c.mountTargets.push(obj);
      }
    }
  }
  for (const f of plan.fingers)
    fingers.push({ group: objects[f.id], side: f.side, index: f.index, base: f.base });
  for (const e of plan.eyes) eyes.push({ group: objects[e.group], iris: objects[e.iris] });
  for (const side of [1, -1]) {
    const end = side > 0 ? '.L' : '.R';
    c.legs.push({
      side,
      part: { side },
      upperBone: bones['upperLeg' + end],
      lowerBone: bones['shin' + end],
      footBone: bones['foot' + end],
      step: null,
      error: 0,
    });
  }
  const cloth = humanoidGarment(rig),
    cover = new THREE.BufferGeometry();
  cover.setAttribute('position', new THREE.BufferAttribute(cloth.positions, 3));
  cover.setAttribute('uv', new THREE.BufferAttribute(cloth.uvs, 2));
  cover.setIndex(new THREE.BufferAttribute(cloth.indices, 1));
  cover.computeVertexNormals();
  const coverMesh = skin(cover, ['armor', 'carapace'].includes(rig.outfit) ? m.armor : m.accent);
  c.mountTargets.push(coverMesh);
  for (const part of c.analysis.parts) {
    if (part.type === 'leg') continue; // Kept in DNA, explicitly marked inactive.
    const runtime = registry.create(part, { materials: m, geometries: c.geometries });
    runtime.part = part;
    const name = part.socket === 'body' ? hostBone(part.host) : socketBone(part.socket, part.side),
      bone = bones[name] || bones.chest;
    runtime.group.position.fromArray(part.position).sub(restWorld[bone.name]);
    runtime.group.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3().fromArray(part.normal),
    );
    runtime.group.rotateY(part.twist * part.mirrorSide);
    runtime.group.rotateX(part.bend * 0.12);
    bone.add(runtime.group);
    runtime.group.userData.geneId = part.id;
    runtime.group.traverse(o => {
      if (o.isMesh) {
        o.userData.geneId = part.id;
        c.pickables.push(o);
      }
    });
    c.parts.push(runtime);
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array((spec.length - 1) * 6), 3),
  );
  const guides = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: '#ed8849',
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    }),
  );
  guides.frustumCulled = false;
  guides.renderOrder = 40;
  guides.visible = false;
  c.root.add(guides);
  return {
    bones,
    skeleton,
    spec,
    rest,
    layout: l,
    eyes,
    fingers,
    guides,
    actionKey: null,
    actionStart: 0,
    lastActionTime: 0,
    events: [],
    pose: null,
  };
}

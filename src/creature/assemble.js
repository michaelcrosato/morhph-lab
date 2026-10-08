import { buildHumanoidRuntime } from './humanoid-runtime.js';
import * as THREE from 'three';
import { analyze } from '../core/anatomy.js';
import { buildBodySurface, disposeObject } from './surface.js';
import { validateGenome } from '../core/genome.js';
import { createMaterials, updateMaterials } from './materials.js';
import { createGeometryKit, defaultRegistry } from './parts.js';
/** The compiler boundary. One validated genome -> disposable runtime creature.
 * Physics can consume analysis without importing Three.js or the UI. */
export class Creature {
  constructor(genome, registry = defaultRegistry(), surface = null) {
    genome = validateGenome(genome);
    this.genome = genome;
    this.analysis = analyze(genome);
    this.root = new THREE.Group();
    this.root.name = 'Creature';
    this.torso = new THREE.Group();
    this.root.add(this.torso);
    this.materials = createMaterials(genome);
    this.geometries = createGeometryKit();
    this.parts = [];
    this.legs = [];
    this.pickables = [];
    if (genome.rig.family === 'humanoid')
      this.humanoid = buildHumanoidRuntime(this, registry, surface);
    else {
      this.body = new THREE.Mesh(
        surface ? surface.clone() : buildBodySurface(this.analysis.nodes),
        this.materials.skin,
      );
      this.body.castShadow = true;
      this.body.receiveShadow = true;
      this.body.userData = { body: true };
      this.torso.add(this.body);
      this.pickables.push(this.body);
      const context = { materials: this.materials, geometries: this.geometries };
      for (const p of this.analysis.parts) {
        const runtime = registry.create(p, context);
        runtime.part = p;
        runtime.group.userData.geneId = p.id;
        if (runtime.kind === 'leg') {
          this.root.add(runtime.group);
          this.legs.push(runtime);
        } else {
          runtime.group.position.fromArray(p.position);
          runtime.group.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3().fromArray(p.normal),
          );
          runtime.group.rotateY(p.twist * p.mirrorSide);
          runtime.group.rotateX(p.bend * 0.12);
          this.torso.add(runtime.group);
        }
        runtime.group.traverse(o => {
          if (o.isMesh) {
            o.userData.geneId = p.id;
            this.pickables.push(o);
          }
        });
        this.parts.push(runtime);
      }
    }
    this.restSurface = this.body.geometry.clone();
    this.bodyWasDeformed = false;
    this.deformationExtent = {
      min: Math.min(...this.analysis.nodes.map(n => n.center[2] - n.radii[2])),
      max: Math.max(...this.analysis.nodes.map(n => n.center[2] + n.radii[2])),
    };
    this.guides = new THREE.Group();
    this.root.add(this.guides);
    for (const n of this.analysis.nodes) {
      const g = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 12),
        new THREE.MeshBasicMaterial({
          color: '#e58143',
          wireframe: true,
          transparent: true,
          opacity: 0.23,
          depthWrite: false,
        }),
      );
      g.position.fromArray(n.center);
      g.scale.fromArray(n.radii);
      g.userData.nodeId = n.id;
      this.guides.add(g);
    }
    this.guides.visible = false;
    this.root.position.y = this.analysis.restHeight;
    this.phase = 0;
    this.motionTime = 0;
  }
  updateAppearance(genome) {
    this.genome = genome;
    updateMaterials(this.materials, genome);
    for (const p of this.parts) p.refreshMaterials?.();
  }
  setWireframe(value) {
    this.root.traverse(o => {
      if (o.isMesh && !o.parent?.isHelper && o.material !== undefined && o.parent !== this.guides)
        o.material.wireframe = value;
    });
  }
  select(id) {
    this.selected = id;
    for (const child of this.guides.children) {
      child.material.opacity = child.userData.nodeId === id ? 0.6 : 0.2;
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.humanoid?.skeleton.dispose();
    this.restSurface?.dispose();
    disposeObject(
      this.root,
      Object.values(this.materials).filter(m => m?.isMaterial),
      Object.values(this.geometries),
    );
  }
}

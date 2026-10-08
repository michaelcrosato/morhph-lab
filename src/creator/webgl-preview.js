/** Optional WebGL2 view. No Rapier import is needed to create or save a creature. */
import * as THREE from 'three';
import { Stage } from '../render/stage.js';
import { Creature } from '../creature/assemble.js';
import { animateCreature } from '../creature/animator.js';
export function createWebGLPreview(canvas, onError) {
  if (THREE.REVISION !== '181') throw new Error('Expected Three.js r181.');
  const stage = new Stage(canvas, onError);
  let creature = null;
  const clay = new THREE.MeshStandardMaterial({ color: 0xa5baaa, roughness: 0.8 });
  return {
    setGenome(genome) {
      const next = new Creature(genome);
      next.root.position.y = next.analysis.restHeight;
      if (creature) creature.dispose();
      creature = next;
      stage.scene.add(next.root);
      next.guides.visible = false;
      if (next.humanoid) next.humanoid.guides.visible = false;
      animateCreature(next, 0, { time: 0, preview: true, seek: true });
      stage.frame(next);
    },
    render(time, { shading = 'pattern', turntable = false, dt = 0, seek = false } = {}) {
      if (!creature) return;
      creature.setWireframe(shading === 'wire');
      animateCreature(creature, dt, { time, preview: true, seek, grounded: true });
      if (turntable && !stage.orbiting) stage.theta += dt * 0.25;
      stage.scene.overrideMaterial = shading === 'clay' ? clay : null;
      stage.render();
    },
    resize: () => stage.resize(),
    fit: () => creature && stage.frame(creature),
    stats: () => ({
      backend: 'WebGL2',
      triangles: stage.renderer.info.render.triangles,
      calls: stage.renderer.info.render.calls,
    }),
    dispose() {
      stage.observer.disconnect();
      creature?.dispose();
      clay.dispose();
      stage.scene.traverse(o => {
        if (o.isMesh && o.parent !== creature?.root) {
          o.geometry?.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m => m?.dispose());
        }
      });
      stage.renderer.dispose();
    },
  };
}

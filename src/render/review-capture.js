import * as THREE from 'three';
import { Creature } from '../creature/assemble.js';
import { animateCreature } from '../creature/animator.js';
import { fingerprint } from '../review/audit.js';
/** Full-runtime GPU contact sheet. Uses a separate disposable creature. It does
 * not reparent, restyle, pause, or modify the editor's live creature. */
export function captureRuntimeReview(renderer, blueprint, { time = 0, size = 512 } = {}) {
  if (THREE.REVISION !== '181') throw new Error('Runtime review requires Three.js r181.');
  if (!Number.isFinite(time) || time < 0 || !Number.isInteger(size) || size < 128 || size > 1024)
    throw new Error('Invalid runtime capture settings.');
  const creature = new Creature(blueprint),
    scene = new THREE.Scene();
  scene.background = new THREE.Color('#e6eae8');
  scene.add(creature.root);
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a9693', 2));
  const key = new THREE.DirectionalLight('#fff5e4', 3),
    fill = new THREE.DirectionalLight('#d8edf3', 1.2);
  key.position.set(-4, 7, 6);
  fill.position.set(5, 3, -4);
  scene.add(key, fill);
  const target = new THREE.WebGLRenderTarget(size, size, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
  });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const oldTarget = renderer.getRenderTarget(),
    oldViewport = renderer.getViewport(new THREE.Vector4()),
    oldScissor = renderer.getScissor(new THREE.Vector4()),
    oldTest = renderer.getScissorTest(),
    oldAuto = renderer.autoClear;
  const modes = [
      ['Front', 0, 0],
      ['Right', Math.PI / 2, 0],
      ['Back', Math.PI, 0],
      ['Three-quarter', 0.7, 0.18],
    ],
    sheet = document.createElement('canvas');
  sheet.width = size * 2;
  sheet.height = size * 2 + 156;
  const ctx = sheet.getContext('2d');
  ctx.fillStyle = '#153139';
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  try {
    animateCreature(creature, 0, { time: 0, preview: true, seek: true });
    animateCreature(creature, 0, { time, preview: true, seek: true });
    creature.root.updateMatrixWorld(true);
    creature.humanoid?.skeleton.update();
    const box = new THREE.Box3(),
      point = new THREE.Vector3();
    creature.root.traverseVisible(object => {
      if (!object.isMesh) return;
      for (let i = 0; i < object.geometry.attributes.position.count; i++)
        box.expandByPoint(object.getVertexPosition(i, point).applyMatrix4(object.matrixWorld));
    });
    if (box.isEmpty()) throw new Error('No visible runtime geometry to capture.');
    const center = box.getCenter(new THREE.Vector3()),
      extent = box.getSize(new THREE.Vector3()),
      span = Math.max(extent.y, Math.hypot(extent.x, extent.z)) * 1.2;
    const camera = new THREE.OrthographicCamera(
        -span / 2,
        span / 2,
        span / 2,
        -span / 2,
        0.01,
        1000,
      ),
      views = [];
    renderer.autoClear = true;
    renderer.setScissorTest(false);
    renderer.setRenderTarget(target);
    renderer.setViewport(0, 0, size, size);
    for (let i = 0; i < modes.length; i++) {
      const [name, yaw, pitch] = modes[i];
      camera.position
        .copy(center)
        .add(
          new THREE.Vector3(
            Math.sin(yaw) * Math.cos(pitch),
            Math.sin(pitch),
            Math.cos(yaw) * Math.cos(pitch),
          ).multiplyScalar(Math.max(10, span * 3)),
        );
      camera.lookAt(center);
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
      const raw = new Uint8Array(size * size * 4),
        pixels = new Uint8ClampedArray(raw.length);
      renderer.readRenderTargetPixels(target, 0, 0, size, size, raw);
      for (let row = 0; row < size; row++)
        pixels.set(raw.subarray(row * size * 4, (row + 1) * size * 4), (size - 1 - row) * size * 4);
      const tile = document.createElement('canvas');
      tile.width = tile.height = size;
      tile.getContext('2d').putImageData(new ImageData(pixels, size, size), 0, 0);
      const x = (i % 2) * size,
        y = 82 + Math.floor(i / 2) * (size + 28);
      ctx.drawImage(tile, x, y);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#e4eee8';
      ctx.fillText(name, x + 15, y + size + 20);
      views.push({
        name,
        yaw,
        pitch,
        triangles: renderer.info.render.triangles,
        drawCalls: renderer.info.render.calls,
      });
    }
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#e4eee8';
    ctx.fillText('MORPH LAB / FULL RUNTIME REVIEW', 20, 31);
    ctx.font = '13px sans-serif';
    ctx.fillText(
      blueprint.name + ' / ' + fingerprint(blueprint) + ' / t = ' + time.toFixed(3) + ' s',
      20,
      56,
    );
    ctx.font = '11px sans-serif';
    ctx.fillText(
      'Three r181 / WebGL2 / actual game geometry and materials / no physics verification',
      20,
      sheet.height - 10,
    );
    return {
      image: sheet.toDataURL('image/png'),
      manifest: {
        format: 'morph-lab-runtime-review',
        version: 1,
        createdAt: new Date().toISOString(),
        blueprint,
        blueprintFingerprint: fingerprint(blueprint),
        renderer: 'Three.js r181 / WebGL2',
        time,
        size,
        projection: 'orthographic',
        frame: { center: center.toArray(), span },
        views,
        scope:
          'Complete generated creature, including attachments and game materials. No stage or physics.',
        visualStatus: 'not-reviewed',
        physicsVerified: false,
      },
    };
  } finally {
    renderer.setRenderTarget(oldTarget);
    renderer.setViewport(oldViewport);
    renderer.setScissor(oldScissor);
    renderer.setScissorTest(oldTest);
    renderer.autoClear = oldAuto;
    target.dispose();
    creature.dispose();
  }
}

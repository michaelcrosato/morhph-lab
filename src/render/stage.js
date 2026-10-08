import * as THREE from 'three';
import { clamp } from '../core/math.js';
/** Explicit WebGL2 renderer and a small orbit rig; no WebGPU or WebGL1 fallback. */
export class Stage {
  constructor(canvas, onError) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    if (!gl)
      throw new Error(
        'WebGL2 is unavailable. Enable hardware acceleration or use a WebGL2-capable browser.',
      );
    this.renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      onError(
        new Error(
          'The graphics context was lost. Your last saved blueprint is safe. Reload to resume.',
        ),
      );
    });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e7e9e2');
    this.scene.fog = new THREE.Fog('#e7e9e2', 24, 65);
    this.camera = new THREE.PerspectiveCamera(37, 1, 0.05, 160);
    this.target = new THREE.Vector3(0, 1.1, 0);
    this.theta = 0.74;
    this.phi = 1.15;
    this.radius = 7.7;
    this.orbiting = false;
    this.scene.add(new THREE.HemisphereLight('#f6ffe5', '#738179', 2.05));
    this.key = new THREE.DirectionalLight('#fff1d6', 3.3);
    this.key.position.set(5, 9, 6);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1536, 1536);
    this.key.shadow.camera.left = -9;
    this.key.shadow.camera.right = 9;
    this.key.shadow.camera.top = 9;
    this.key.shadow.camera.bottom = -9;
    this.key.shadow.camera.near = 0.5;
    this.key.shadow.camera.far = 32;
    this.key.shadow.normalBias = 0.035;
    this.key.shadow.bias = -0.00015;
    this.scene.add(this.key, this.key.target);
    const fill = new THREE.DirectionalLight('#b0e0e3', 1.7);
    fill.position.set(-5, 4, -4);
    this.scene.add(fill);
    this.lab = new THREE.Group();
    this.scene.add(this.lab);
    this.makeLab();
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 14, 10),
      new THREE.MeshBasicMaterial({ color: '#ed8245', depthTest: false }),
    );
    this.marker.renderOrder = 20;
    this.marker.visible = false;
    this.scene.add(this.marker);
    this.selection = new THREE.Box3Helper(new THREE.Box3(), 0xd57642);
    this.selection.material.depthTest = false;
    this.selection.material.transparent = true;
    this.selection.material.opacity = 0.6;
    this.selection.visible = false;
    this.scene.add(this.selection);
    this.debug = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        depthTest: false,
      }),
    );
    this.debug.frustumCulled = false;
    this.debug.visible = false;
    this.debug.renderOrder = 30;
    this.scene.add(this.debug);
    this.bindOrbit();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement);
    this.resize();
    this.updateCamera();
  }
  makeLab() {
    const mat = (color, roughness = 1, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat('#e7e9e2'));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.28;
    ground.receiveShadow = true;
    this.lab.add(ground);
    const grid = new THREE.GridHelper(60, 60, '#b6bfb7', '#c8cfc7');
    grid.position.y = -0.274;
    grid.material.transparent = true;
    grid.material.opacity = 0.33;
    this.lab.add(grid);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(3.22, 3.3, 0.2, 96),
      mat('#334d4d', 0.72, 0.16),
    );
    base.position.y = -0.1;
    base.receiveShadow = true;
    base.castShadow = true;
    this.lab.add(base);
    const lip = new THREE.Mesh(
      new THREE.CylinderGeometry(3.35, 3.35, 0.085, 96),
      mat('#637772', 0.6, 0.1),
    );
    lip.position.y = -0.205;
    this.lab.add(lip);
    for (const [radius, thickness, color] of [
      [3.13, 0.013, '#c4b78a'],
      [2.88, 0.005, '#607573'],
      [2.78, 0.004, '#607573'],
    ]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, thickness, 6, 128),
        mat(color, 0.6),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.006;
      this.lab.add(ring);
    }
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2,
        r = 3.02;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(i % 6 === 0 ? 0.013 : 0.008, 0.005, i % 6 === 0 ? 0.115 : 0.055),
        mat(i % 6 === 0 ? '#b8c0a5' : '#819184'),
      );
      tick.position.set(Math.sin(a) * r, 0.007, Math.cos(a) * r);
      tick.rotation.y = a;
      this.lab.add(tick);
    }
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 3), mat('#d9945e'));
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0.025, 3.02);
    this.lab.add(arrow);
  }
  bindOrbit() {
    const c = this.canvas;
    let last = null,
      start = null,
      moved = false;
    const pointers = new Map();
    let pinch = 0;
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('pointerdown', e => {
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      c.setPointerCapture(e.pointerId);
      last = [e.clientX, e.clientY];
      start = [...last];
      moved = false;
      this.orbiting = true;
      if (pointers.size === 2) {
        const p = [...pointers.values()];
        pinch = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
      }
    });
    c.addEventListener('pointermove', e => {
      this.onHover?.(e);
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 2) {
        const p = [...pointers.values()],
          d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
        this.radius = clamp(this.radius * (pinch / Math.max(d, 1)), 2.8, 34);
        pinch = d;
        moved = true;
        return;
      }
      const dx = e.clientX - last[0],
        dy = e.clientY - last[1];
      if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 4) moved = true;
      if (e.buttons === 2 || (e.shiftKey && !this.inHabitat)) {
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion),
          up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
        this.target
          .addScaledVector(right, -dx * this.radius * 0.0015)
          .addScaledVector(up, dy * this.radius * 0.0015);
      } else {
        this.theta -= dx * 0.006;
        this.phi = clamp(this.phi - dy * 0.004, 0.2, 1.52);
      }
      last = [e.clientX, e.clientY];
    });
    c.addEventListener('pointerup', e => {
      pointers.delete(e.pointerId);
      this.orbiting = pointers.size > 0;
      if (!moved && e.button === 0) this.onPick?.(e);
      if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
    });
    c.addEventListener('pointercancel', e => {
      pointers.delete(e.pointerId);
      this.orbiting = false;
    });
    c.addEventListener(
      'wheel',
      e => {
        e.preventDefault();
        this.radius = clamp(this.radius * Math.exp(e.deltaY * 0.001), 2.8, 34);
      },
      { passive: false },
    );
  }
  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / Math.max(1, r.height);
    this.camera.updateProjectionMatrix();
  }
  updateCamera() {
    const s = Math.sin(this.phi);
    this.camera.position.set(
      this.target.x + Math.sin(this.theta) * s * this.radius,
      this.target.y + Math.cos(this.phi) * this.radius,
      this.target.z + Math.cos(this.theta) * s * this.radius,
    );
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }
  frame(creature) {
    creature.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(creature.root);
    const size = box.getSize(new THREE.Vector3());
    this.target.copy(box.getCenter(new THREE.Vector3()));
    this.target.y = Math.max(0.8, this.target.y - 0.08);
    const aspect = Math.min(this.camera.aspect, 1.5);
    this.radius = clamp(
      (Math.max(
        size.y / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)),
        size.length() * 0.85,
      ) /
        Math.min(1, aspect)) *
        1.1,
      6,
      24,
    );
    this.theta = 0.74;
    this.phi = 1.15;
  }
  setMode(habitat) {
    this.inHabitat = habitat;
    this.lab.visible = !habitat;
    this.marker.visible = false;
    this.selection.visible = false;
    this.scene.background.set(habitat ? '#cdd9c7' : '#e7e9e2');
    this.scene.fog.color.copy(this.scene.background);
    if (habitat) {
      this.radius = 10;
      this.phi = 1.03;
    }
  }
  ray(event, objects) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(objects, false);
  }
  setDebug(data) {
    this.debug.geometry.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.vertices, 3));
    g.setAttribute('color', new THREE.BufferAttribute(data.colors, 4));
    this.debug.geometry = g;
    this.debug.visible = true;
  }
  render() {
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }
  capture() {
    this.render();
    return this.canvas.toDataURL('image/png');
  }
}

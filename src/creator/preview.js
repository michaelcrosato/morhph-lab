import { FoundationCompiler, motionCycleTime } from '../review/foundation.js';
import { rasterize, fitFrame } from '../review/raster.js';
import { FrameClock } from '../core/frame-clock.js';
import { discoverySignature } from './generator.js';
import { fitCreatorFrame } from './camera.js';
const cache = new Map();
export function creatureThumbnail(genome, width = 180, height = 144) {
  const key = discoverySignature(genome) + ':' + width + ':' + height;
  if (cache.has(key)) return cache.get(key);
  const compiler = new FoundationCompiler(genome),
    snapshot = compiler.sample({ pose: 'motion-cycle', phase: 0.15 }),
    canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const result = rasterize(snapshot, {
    width,
    height,
    view: genome.motion.travel.medium === 'ground' ? 'quarter' : 'flight',
    frame: fitCreatorFrame(
      [snapshot],
      width,
      height,
      genome.motion.travel.medium === 'ground' ? 'quarter' : 'flight',
    ),
    shading: 'pattern',
  });
  canvas.getContext('2d').putImageData(new ImageData(result.pixels, width, height), 0, 0);
  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  if (cache.size > 72) cache.delete(cache.keys().next().value);
  return url;
}
export class CreatorPreview {
  constructor(host, onStatus = () => {}) {
    this.host = host;
    this.onStatus = onStatus;
    this.canvas = host.querySelector('#creator-canvas');
    this.gpuCanvas = host.querySelector('#creator-webgl');
    this.clock = new FrameClock(0.1);
    this.phase = 0.15;
    this.playing = false;
    this.turntable = false;
    this.shading = 'pattern';
    this.dirty = true;
    this.lastCPU = null;
    this.yaw = 0.72;
    this.pitch = 0.3;
    this.gpu = null;
    this.token = 0;
    this.disposed = false;
    this.backend = 'cpu';
    this.observer = new ResizeObserver(() => {
      this.fitPending = true;
      this.dirty = true;
      this.gpu?.resize();
    });
    this.observer.observe(host);
    let pointer = null;
    this.canvas.addEventListener('pointerdown', e => {
      pointer = [e.clientX, e.clientY];
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', e => {
      if (!pointer) return;
      this.yaw -= (e.clientX - pointer[0]) * 0.009;
      this.pitch = Math.max(-0.6, Math.min(1.4, this.pitch + (e.clientY - pointer[1]) * 0.007));
      pointer = [e.clientX, e.clientY];
      this.dirty = true;
    });
    this.canvas.addEventListener('pointerup', () => (pointer = null));
    this.canvas.addEventListener('pointercancel', () => (pointer = null));
    this.canvas.addEventListener(
      'wheel',
      e => {
        e.preventDefault();
        if (this.frame) {
          this.frame.span = Math.max(
            0.5,
            Math.min(40, this.frame.span * Math.exp(e.deltaY * 0.001)),
          );
          this.dirty = true;
        }
      },
      { passive: false },
    );
    this.visibility = () => {
      this.clock.reset();
    };
    document.addEventListener('visibilitychange', this.visibility);
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }
  setGenome(genome) {
    // Compile before replacing the visible model. A failed compile keeps the old one.
    const compiler = new FoundationCompiler(genome),
      sample = compiler.sample({ pose: 'motion-cycle', phase: 0.15 }),
      other = compiler.sample({ pose: 'motion-cycle', phase: 0.65 });
    this.compiler = compiler;
    this.genome = genome;
    this.frame = fitFrame([sample, other]);
    this.fitSamples = [sample, other];
    this.fitPending = true;
    this.phase = 0.15;
    this.dirty = true;
    this.counts = {
      triangles: sample.meshes.reduce((s, m) => s + m.indices.length / 3, 0),
      meshes: sample.meshes.length,
      parts: genome.parts.length,
    };
    if (this.gpu) {
      try {
        this.gpu.setGenome(genome);
      } catch (e) {
        this.fallback(e);
      }
    }
    this.drawCPU();
    this.onStatus({ backend: this.backend, counts: this.counts });
  }
  async enableGPU() {
    if (this.gpu || this.disposed) return;
    const token = ++this.token;
    let timer;
    try {
      if (!this.gpuCanvas.getContext('webgl2', { antialias: true, alpha: false }))
        throw new Error('WebGL2 is unavailable in this browser.');
      this.onStatus({ backend: 'loading', counts: this.counts });
      const module = await Promise.race([
        import('./webgl-preview.js'),
        new Promise((_, reject) => {
          timer = setTimeout(
            () =>
              reject(new Error('The 3D engine did not load. Check the connection, then retry.')),
            8000,
          );
        }),
      ]);
      if (this.disposed || token !== this.token) return;
      const gpu = module.createWebGLPreview(this.gpuCanvas, e => this.fallback(e));
      try {
        gpu.setGenome(this.genome);
        gpu.render(0);
      } catch (e) {
        gpu.dispose();
        throw e;
      }
      this.gpu?.dispose();
      this.gpu = gpu;
      this.backend = 'webgl2';
      this.gpuCanvas.hidden = false;
      this.canvas.hidden = true;
      this.onStatus({ backend: this.backend, counts: this.counts });
    } catch (e) {
      if (token === this.token && !this.disposed) this.fallback(e);
    } finally {
      clearTimeout(timer);
    }
  }
  fallback(error) {
    this.token++;
    this.gpu?.dispose();
    this.gpu = null;
    this.backend = 'cpu';
    this.gpuCanvas.hidden = true;
    this.canvas.hidden = false;
    this.dirty = true;
    this.onStatus({
      backend: 'cpu',
      counts: this.counts,
      reason: String(error?.message || error)
        .replace(/data:[^\s]+/g, '[module]')
        .slice(0, 180),
    });
  }
  fit() {
    if (this.compiler) {
      this.frame = fitFrame([
        this.compiler.sample({ pose: 'motion-cycle', phase: this.phase }),
        this.compiler.sample({ pose: 'motion-cycle', phase: (this.phase + 0.5) % 1 }),
      ]);
      this.fitSamples = [
        this.compiler.sample({ pose: 'motion-cycle', phase: this.phase }),
        this.compiler.sample({ pose: 'motion-cycle', phase: (this.phase + 0.5) % 1 }),
      ];
      this.fitPending = true;
    }
    this.gpu?.fit();
    this.dirty = true;
  }
  seek(phase) {
    this.phase = phase;
    this.playing = false;
    this.dirty = true;
  }
  drawCPU() {
    if (!this.compiler) return;
    const rect = this.host.getBoundingClientRect(),
      scale = Math.min(1, 960 / Math.max(rect.width, rect.height));
    const width = Math.max(180, Math.round(rect.width * scale)),
      height = Math.max(180, Math.round(rect.height * scale));
    const sample = this.compiler.sample({ pose: 'motion-cycle', phase: this.phase });
    if (this.fitPending) {
      this.frame = fitCreatorFrame(this.fitSamples || [sample], width, height, {
        yaw: this.yaw,
        pitch: this.pitch,
      });
      this.fitPending = false;
    }
    const result = rasterize(sample, {
      width,
      height,
      view: { yaw: this.yaw, pitch: this.pitch },
      frame: this.frame,
      shading: this.shading,
    });
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.getContext('2d').putImageData(new ImageData(result.pixels, width, height), 0, 0);
    this.lastPixels = result.mask.reduce((a, b) => a + b, 0);
    this.dirty = false;
  }
  loop(now) {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.clock.tick(now, document.hidden);
    if (document.hidden || !this.compiler) return;
    const duration = motionCycleTime(this.genome.motion, 1, this.compiler.human) || 2;
    if (this.playing) this.phase = (this.phase + dt / duration) % 1;
    if (this.turntable) {
      this.yaw += dt * 0.25;
      this.dirty = true;
    }
    try {
      if (this.gpu)
        this.gpu.render(this.phase * duration, {
          shading: this.shading,
          dt,
          seek: !this.playing,
          turntable: this.turntable,
        });
      else if (
        this.dirty ||
        (this.playing && (this.lastCPU === null || now - this.lastCPU >= 180))
      ) {
        this.drawCPU();
        this.lastCPU = now;
      }
    } catch (e) {
      if (this.gpu) this.fallback(e);
      else {
        this.playing = false;
        this.onStatus({ backend: 'cpu', reason: e.message, counts: this.counts });
      }
    }
  }
  dispose() {
    this.disposed = true;
    this.token++;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    document.removeEventListener('visibilitychange', this.visibility);
    this.gpu?.dispose();
  }
}

/** Use one timestamp source for a render loop. Do not seed it with performance.now().
 * A reset waits for the next callback. Hidden time is not simulation time. */
export class FrameClock {
  constructor(maxDelta = .1) {
    if (!Number.isFinite(maxDelta) || maxDelta <= 0) throw new Error('Maximum frame step must be positive.');
    this.maxDelta = maxDelta;
    this.reset();
  }
  reset() { this.previous = null; }
  tick(timestamp, suspended = false) {
    if (suspended || !Number.isFinite(timestamp) || timestamp < 0) { this.reset(); return 0; }
    const previous = this.previous;
    this.previous = timestamp;
    if (previous === null || timestamp <= previous) return 0;
    return Math.min(this.maxDelta, (timestamp - previous) / 1000);
  }
}

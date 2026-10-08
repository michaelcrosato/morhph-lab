import { clamp, smooth } from './math.js';
/** A pose hint, not a hand-to-object constraint. Resolved parts have explicit sides. */
export function handGrip(parts, side) {
  let grip = 0;
  for (const p of parts) {
    if (p.socket !== 'hand' || p.side !== side) continue;
    const value =
      p.type === 'folio'
        ? 0.2
        : ['blade', 'staff', 'worktool', 'fieldlamp'].includes(p.type) ||
            (p.type === 'bowrig' && p.variant !== 2)
          ? 0.85
          : 0;
    grip = Math.max(grip, value);
  }
  return grip;
}
export function fingerCurl(action, parts, side) {
  return (
    0.09 + Math.max((action?.handCurl ?? 0) * (action?.weight ?? 0), handGrip(parts, side)) * 1.35
  );
}
/** Same phase envelope drives the drawing arm and the bow. It emits no projectile. */
export function bowPull(phase) {
  return smooth(clamp(phase / 0.65, 0, 1)) * (1 - smooth(clamp((phase - 0.76) / 0.18, 0, 1)));
}
export function equipmentAction(name, pose) {
  return { name, phase: pose.phase, weight: pose.weight };
}

import { makeLevel } from './level.js';
/** Air and water are bounded arcade test volumes, not simulated fluids. */
export function makeTravelLevel(seed = 810, medium = 'water') {
  if (!['water', 'air'].includes(medium)) throw new Error('Travel test requires water or air.');
  const level = makeLevel(seed);
  level.medium = medium;
  level.spawnY = 4.4;
  level.travelBounds = { minY: 1.4, maxY: 11, radius: 19.5 };
  level.spores = level.spores.map((s, i) => ({ ...s, y: 2.3 + (i % 4) * 2.05 }));
  level.title = medium === 'water' ? 'Reef tank' : 'Sky course';
  return level;
}

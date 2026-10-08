import { PRESET_MODELS, preset } from './presets.js';
import { CATALOG, PALETTES } from './catalog.js';
import { SHARED_PARTS } from './shared-parts.js';
import { PART_KITS } from './kits.js';
import { MOTION_CLIPS } from './motion.js';
import { HUMANOID_ACTIONS } from './humanoid-motion.js';
import { PATTERNS, MICRO_SURFACES, SURFACE_PRESETS } from './surfaces.js';
/** Metadata audit. Inspection support is NOT visual approval or a GPU result. */
export function libraryCoverage() {
  const usage = Object.fromEntries(Object.keys(CATALOG).map(k => [k, { genes: 0, models: 0 }])),
    roles = {},
    media = {},
    models = [];
  for (const def of PRESET_MODELS) {
    const g = preset(def.id),
      used = new Set(),
      missing = new Set();
    for (const p of g.parts) {
      usage[p.type].genes++;
      used.add(p.type);
      if (!Object.hasOwn(SHARED_PARTS, p.type)) missing.add(p.type);
    }
    for (const type of used) usage[type].models++;
    const role = g.actor.role,
      medium = g.motion.travel.medium;
    roles[role] = (roles[role] || 0) + 1;
    media[medium] = (media[medium] || 0) + 1;
    models.push({
      id: def.id,
      label: def.label,
      family: g.rig.family,
      role,
      medium,
      collection: def.collection || 'original',
      genes: g.parts.length,
      partFamilies: [...used],
      unsupportedFamilies: [...missing],
      completeGeometryReview: missing.size === 0,
    });
  }
  const unsupported = Object.keys(CATALOG).filter(k => !Object.hasOwn(SHARED_PARTS, k));
  return {
    format: 'morph-lab-library-coverage',
    version: 1,
    appVersion: '12.0.0',
    counts: {
      models: models.length,
      humanoids: models.filter(m => m.family === 'humanoid').length,
      creatures: models.filter(m => m.family !== 'humanoid').length,
      civilianHumanoids: models.filter(m => m.family === 'humanoid' && m.role === 'civilian')
        .length,
      partFamilies: Object.keys(CATALOG).length,
      sharedPartFamilies: Object.keys(SHARED_PARTS).length,
      completeReviewModels: models.filter(m => m.completeGeometryReview).length,
      kits: Object.keys(PART_KITS).length,
      movementRecipes: Object.keys(MOTION_CLIPS).length,
      humanoidActions: Object.keys(HUMANOID_ACTIONS).length - 1,
      pigmentPatterns: PATTERNS.length,
      microtextures: MICRO_SURFACES.length,
      surfaceRecipes: Object.keys(SURFACE_PRESETS).length,
      palettes: PALETTES.length,
    },
    roles,
    media,
    unsupportedFamilies: unsupported,
    unusedFamilies: Object.keys(usage).filter(k => usage[k].models === 0),
    usage,
    models,
    gpuVerified: false,
    physicsVerified: false,
    note: 'Counts describe recipes and review coverage, not quality. One gene can emit mirrored parts. Complete geometry review means no attachment genes are omitted, not that intersections, deformation, materials, or game behavior are approved.',
  };
}

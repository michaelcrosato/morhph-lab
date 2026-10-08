/** Report the registered content, rather than keeping a second hardcoded count. */
import {CATALOG,PALETTES} from '../src/core/catalog.js';
import {PRESET_MODELS,preset} from '../src/core/presets.js';
import {PART_KITS} from '../src/core/kits.js';
import {MOTION_CLIPS} from '../src/core/motion.js';
import {PATTERNS,MICRO_SURFACES,SURFACE_PRESETS} from '../src/core/surfaces.js';
import {FOUNDATIONS} from '../src/review/foundation.js';
const humanoids=PRESET_MODELS.filter(x=>preset(x.id).rig.family==='humanoid').length;
console.log(JSON.stringify({models:PRESET_MODELS.length,humanoids,creatures:PRESET_MODELS.length-humanoids,parts:Object.keys(CATALOG).length,kits:Object.keys(PART_KITS).length,motion:Object.keys(MOTION_CLIPS).length,patterns:PATTERNS.length,micros:MICRO_SURFACES.length,surfaces:Object.keys(SURFACE_PRESETS).length,palettes:PALETTES.length,foundations:FOUNDATIONS.length},null,2));

import {CLASSIC_PARTS} from './classic-catalog.js';
import {FIELD_PARTS} from './field-catalog.js';
import {EXPANSION_PARTS} from './expansion-catalog.js';
import {BLOOM_PARTS} from './bloom-catalog.js';
import {TIDAL_PARTS} from './tidal-catalog.js';
import {FRONTIER_PARTS} from './frontier-catalog.js';
/** Factories that share exact source geometry between the CPU and WebGL adapters. */
export const SHARED_PARTS=Object.freeze({...CLASSIC_PARTS,...TIDAL_PARTS,...FRONTIER_PARTS,...BLOOM_PARTS,...EXPANSION_PARTS,...FIELD_PARTS});

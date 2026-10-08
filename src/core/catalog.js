import { CLASSIC_PARTS } from './classic-catalog.js';
import { SHARED_PARTS } from './shared-parts.js';
import { EXPANSION_PARTS } from './expansion-catalog.js';
export { PART_MATERIALS } from './expansion-catalog.js';
/** Part metadata is deliberately independent of mesh factories. A new family needs a pack
 * catalog entry here, an entry in SHARED_PARTS, and shared geometry (see docs/extending.md).
 * Genome validation uses the same catalog. */
export const CATALOG = Object.freeze({
  ...CLASSIC_PARTS,
  ...EXPANSION_PARTS,
  ...SHARED_PARTS,
});
export const PALETTES = [
  { name: 'Lagoon', color: '#388e86', accent: '#c9df8e' },
  { name: 'Ember', color: '#ca6956', accent: '#f3d09a' },
  { name: 'Orchid', color: '#9e78ae', accent: '#ded6a3' },
  { name: 'Ochre', color: '#c9a457', accent: '#e8dfb0' },
  { name: 'Tide', color: '#558cba', accent: '#b5dacf' },
  { name: 'Ink', color: '#42485e', accent: '#cc94af' },
  { name: 'Ivory', color: '#d2c9ad', accent: '#705f4b' },
  { name: 'Moss', color: '#586a43', accent: '#c7a66e' },
  { name: 'Glacier', color: '#8faeba', accent: '#dceff0' },
  { name: 'Iron', color: '#535963', accent: '#b3b8ba' },
  { name: 'Amethyst', color: '#695183', accent: '#d5a6ce' },
  { name: 'Rust', color: '#895443', accent: '#d3ae72' },
  { name: 'Pelagic', color: '#347c91', accent: '#dfd9a3' },
  { name: 'Abyss', color: '#385467', accent: '#69dbcd' },
  { name: 'Nacre', color: '#bf9974', accent: '#f0dec2' },
  { name: 'Jelly', color: '#9784b8', accent: '#e8c5db' },
  { name: 'Moth', color: '#b578a0', accent: '#e8c690' },
  { name: 'Cloud', color: '#c4cdd1', accent: '#455b71' },
  { name: 'Wing glass', color: '#437f83', accent: '#cdeae3' },
  { name: 'Comb light', color: '#264e70', accent: '#efb676' },
  { name: 'Violet bloom', color: '#4c4175', accent: '#de83ac' },
  { name: 'Paper sky', color: '#d7d7c5', accent: '#557f87' },
  { name: 'Oxide', color: '#aa6953', accent: '#e4ceb2' },
  { name: 'Sea mint', color: '#368783', accent: '#d2edca' },
  { name: 'Storm brass', color: '#454e65', accent: '#d7b774' },
  { name: 'Seed', color: '#8e9a67', accent: '#d2c991' },
  { name: 'Pollen field', color: '#a88457', accent: '#e3c974' },
  { name: 'Petal dusk', color: '#946b92', accent: '#edc597' },
  { name: 'Sage plate', color: '#6c7968', accent: '#d7c692' },
  { name: 'Marsh', color: '#718875', accent: '#c6dca8' },
  { name: 'Rose clay', color: '#a36e84', accent: '#e6ba9a' },
  { name: 'Patina', color: '#66766f', accent: '#d4b780' },
  { name: 'Trail coat', color: '#735645', accent: '#d6bc91' },
  { name: 'Field service', color: '#627e78', accent: '#e2d7b6' },
  { name: 'Archive', color: '#817087', accent: '#d2c4a3' },
  { name: 'Lamplight', color: '#526476', accent: '#d1b887' },
];

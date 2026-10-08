/** Compatibility entry point. No independent geometry definitions. */
import { EXPANSION_PARTS } from '../core/expansion-catalog.js';
import { tidalPartFactory } from './tidal-parts.js';
export function registerExpansionParts(registry) {
  for (const type of Object.keys(EXPANSION_PARTS)) registry.register(type, tidalPartFactory);
  return registry;
}

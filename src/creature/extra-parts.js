/** Compatibility entry point. All factories use the shared source now. */
import {tidalPartFactory} from './tidal-parts.js';
export function registerExtraParts(registry){for(const type of ['wing','tentacle','antenna','shell','mandible','crest','clubtail','frill','claw','gill'])registry.register(type,tidalPartFactory);return registry;}

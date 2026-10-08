import { preset, validateGenome } from '../core/genome.js';
import {
  defaultLocks,
  defaultChannels,
  checkedTraits,
  checkedSeed,
  SCOPES,
  replayRecipe,
} from './generator.js';
const copy = structuredClone;
function record(value) {
  const genome = validateGenome(value?.genome || value);
  let recipe = null;
  if (value?.recipe) {
    const replay = replayRecipe(value.recipe);
    if (JSON.stringify(replay.genome) !== JSON.stringify(genome))
      throw new Error('Discovery and recipe differ.');
    recipe = replay.recipe;
  }
  return { genome, recipe };
}
/** History contains both the model and its provenance. Saved parents are snapshots. */
export class CreatorSession {
  constructor(genome = preset('mossback')) {
    this.current = record(genome);
    this.past = [];
    this.future = [];
    this.previewBase = null;
    this.sources = { a: copy(this.current.genome), b: preset('moonbell') };
    this.settings = {
      seed: 1042,
      newSeed: true,
      strength: 0.35,
      scope: 'creatures',
      locks: defaultLocks(),
      channels: defaultChannels(),
    };
  }
  commit(value) {
    const next = record(value);
    this.apply();
    if (JSON.stringify(next.genome) === JSON.stringify(this.current.genome)) return false;
    this.past.push(copy(this.current));
    if (this.past.length > 40) this.past.shift();
    this.future = [];
    this.current = next;
    return true;
  }
  preview(value) {
    const next = record(value);
    if (!this.previewBase) this.previewBase = copy(this.current);
    this.current = next;
  }
  apply() {
    if (!this.previewBase) return false;
    const base = this.previewBase;
    this.previewBase = null;
    if (JSON.stringify(base.genome) === JSON.stringify(this.current.genome)) return false;
    this.past.push(base);
    if (this.past.length > 40) this.past.shift();
    this.future = [];
    return true;
  }
  cancel() {
    if (!this.previewBase) return false;
    this.current = this.previewBase;
    this.previewBase = null;
    return true;
  }
  undo() {
    if (this.cancel()) return true;
    if (!this.past.length) return false;
    this.future.push(copy(this.current));
    this.current = this.past.pop();
    return true;
  }
  redo() {
    this.cancel();
    if (!this.future.length) return false;
    this.past.push(copy(this.current));
    this.current = this.future.pop();
    return true;
  }
  parent(slot, genome) {
    if (!['a', 'b'].includes(slot)) throw new Error('Unknown mixer parent.');
    this.cancel();
    this.sources[slot] = validateGenome(genome);
  }
  rename(name) {
    const next = copy(this.current);
    next.genome.name = name;
    if (next.recipe) next.recipe.result.name = name;
    this.commit(next);
  }
  export() {
    return {
      format: 'morph-lab-creator-session',
      version: 1,
      current: copy(this.current),
      sources: copy(this.sources),
      settings: copy(this.settings),
    };
  }
  static restore(raw) {
    if (!raw || raw.format !== 'morph-lab-creator-session' || raw.version !== 1)
      throw new Error('Unsupported creator session.');
    const current = record(raw.current),
      s = new CreatorSession(current.genome);
    s.current = current;
    s.sources = { a: validateGenome(raw.sources?.a), b: validateGenome(raw.sources?.b) };
    const settings = raw.settings;
    if (
      !settings ||
      typeof settings.newSeed !== 'boolean' ||
      !Number.isFinite(settings.strength) ||
      settings.strength < 0 ||
      settings.strength > 1 ||
      !Object.hasOwn(SCOPES, settings.scope)
    )
      throw new Error('Invalid creator settings.');
    s.settings = {
      seed: checkedSeed(settings.seed),
      newSeed: settings.newSeed,
      strength: settings.strength,
      scope: settings.scope,
      locks: checkedTraits(settings.locks, true),
      channels: checkedTraits(settings.channels),
    };
    return s;
  }
}

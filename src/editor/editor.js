import { applyPartArray, DEFAULT_PART_ARRAY } from '../core/part-arrays.js';
import { applyPartKit, PART_KITS } from '../core/kits.js';
import { syncHumanoidBody } from '../core/humanoid.js';
import { HUMANOID_ACTIONS } from '../core/humanoid-motion.js';
import {
  defaultActor,
  actorManifest,
  generateActorBatch,
  parseActorInput,
  parseActorRoster,
} from '../core/actors.js';
import { MixerController } from './mixer-controller.js';
import { defaultMotion } from '../core/motion.js';
import { appearanceLayers, setAppearanceLayer, SURFACE_PRESETS } from '../core/surfaces.js';
import { CATALOG, PALETTES } from '../core/catalog.js';
import { analyze, nearestNode } from '../core/anatomy.js';
import {
  createPart,
  nextId,
  preset,
  mutate,
  removeGene,
  parseGenome,
  serializeGenome,
  LIMITS,
} from '../core/genome.js';
import { normalize, normalToAngles, anglesToNormal } from '../core/math.js';
import { helpContent } from '../ui/view.js';

export function downloadBlob(contents, name, type = 'application/json') {
  const blob = contents instanceof Blob ? contents : new Blob([contents], { type });
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const safeFilename = name =>
  name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'creature';
const KEY = 'morph-lab.blueprint.v9';
const LEGACY_KEY = 'morph-lab.blueprint.v1';
export function loadSaved() {
  try {
    const data =
      localStorage.getItem(KEY) ||
      localStorage.getItem('morph-lab.blueprint.v8') ||
      localStorage.getItem('morph-lab.blueprint.v7') ||
      localStorage.getItem('morph-lab.blueprint.v6') ||
      localStorage.getItem('morph-lab.blueprint.v5') ||
      localStorage.getItem('morph-lab.blueprint.v4') ||
      localStorage.getItem('morph-lab.blueprint.v3') ||
      localStorage.getItem('morph-lab.blueprint.v2') ||
      localStorage.getItem(LEGACY_KEY);
    return data ? parseGenome(data) : null;
  } catch (error) {
    console.warn('Saved blueprint could not be read:', error.message);
    return null;
  }
}

/** Editor state and DOM routing deliberately live outside the renderer and genome.
 * All model mutations pass through GenomeStore validation, including import. */
export class Editor {
  constructor(store, view, callbacks = {}) {
    this.store = store;
    this.view = view;
    this.callbacks = callbacks;
    this.selected = store.state.nodes[0].id;
    this.mixer = new MixerController(store);
    this.mixerImportTarget = null;
    this.libraryTab = 'parts';
    this.arraySettings = { ...DEFAULT_PART_ARRAY };
    this.generator = { seed: 8128, count: 6, variation: 0.25 };
    this.roster = null;
    this.options = {
      rigGuides: false,
      symmetry: true,
      guides: false,
      wireframe: false,
      debug: false,
    };
    this.armed = null;
    this.reattaching = false;
    this.habitat = false;
    this.unsubscribe = store.subscribe((g, event) => {
      this.mixer.onStoreEvent(event);
      if (![...g.nodes, ...g.parts].some(p => p.id === this.selected))
        this.selected = g.nodes[0].id;
      this.callbacks.changed?.(g, event);
      if (event.kind !== 'preview') this.render();
      const status = document.querySelector('#save-state');
      if (status) status.textContent = 'Unsaved changes';
    });
    this.bind();
    this.bindMixers();
    this.bindActors();
    this.render();
  }
  render() {
    const g = this.store.state;
    this.view.arraySettings = this.arraySettings;
    this.view.actorState = {
      generator: this.generator,
      roster: this.roster,
      rigGuides: this.options.rigGuides,
    };
    this.view.render(g, this.selected, this.options, analyze(g), this.store, this.mixer.state);
  }
  select(id) {
    this.store.commitPreview();
    this.selected = id;
    this.render();
    this.callbacks.selected?.(id);
  }
  arm(type, reattach = false) {
    this.store.commitPreview();
    this.armed = type;
    this.reattaching = reattach;
    this.view.arm(type, reattach);
    this.callbacks.armed?.(type);
  }
  getHost() {
    const g = this.store.state;
    return (
      g.nodes.find(n => n.id === this.selected) ||
      g.nodes.find(n => n.id === g.parts.find(p => p.id === this.selected)?.host) ||
      g.nodes[0]
    );
  }
  add(type, placement = null) {
    const g = this.store.state,
      host = placement?.host || this.getHost().id;
    let selected;
    if (type === 'body') {
      if (g.rig.family === 'humanoid')
        throw new Error(
          'Humanoid body nodes are rig-owned. Use Actor proportions or a creature body source.',
        );
      if (g.nodes.length >= LIMITS.nodes)
        throw new Error('The proof-of-concept limit is eight body nodes.');
      const p = g.nodes.find(n => n.id === host),
        direction = normalize(placement?.anchor || [0, 0.12, -1]);
      const r = 0.43,
        d = (Math.min(...p.radii) + r) * 0.78;
      const n = {
        id: nextId(g, 'body'),
        parent: host,
        offset: direction.map(v => v * d),
        radii: [r, r, r],
      };
      selected = n.id;
      this.store.change('Grow body', draft => {
        draft.nodes.push(n);
      });
    } else {
      if (g.parts.length >= LIMITS.parts)
        throw new Error('The proof-of-concept limit is 32 attachment genes.');
      const part = createPart(
        g,
        type,
        host,
        placement?.anchor,
        this.options.symmetry && CATALOG[type].mirror,
      );
      if (placement?.socket) {
        part.socket = placement.socket;
        part.socketOffset = [0, 0, 0];
      }
      selected = part.id;
      this.store.change('Attach ' + CATALOG[type].label, draft => {
        draft.parts.push(part);
      });
    }
    this.select(selected);
    this.arm(null);
    this.view.toast(
      type === 'body'
        ? 'Body segment grown. Adjust its shape in the inspector.'
        : CATALOG[type].label + ' attached.',
    );
  }
  /** Pick points are in creature torso space, not camera/world coordinates. */
  place(localPoint) {
    if (!this.armed) return;
    const g = this.store.state,
      nodes = analyze(g).nodes;
    const host = nearestNode(localPoint, nodes),
      anchor = normalize(localPoint.map((v, i) => v - host.center[i]));
    if (this.reattaching) {
      this.store.change('Reattach part', d => {
        const p = d.parts.find(x => x.id === this.selected);
        if (p) {
          p.host = host.id;
          p.anchor = anchor;
        }
      });
      this.arm(null);
      this.view.toast('Surface anchor updated.');
    } else this.add(this.armed, { host: host.id, anchor });
  }
  placeAtSocket(socket, side, anchor) {
    if (!this.armed) return;
    const direction = normalize([side * Math.max(0.12, Math.abs(anchor[0])), anchor[1], anchor[2]]);
    if (this.reattaching) {
      this.store.change('Move part to joint socket', g => {
        const p = g.parts.find(p => p.id === this.selected);
        if (p) {
          p.socket = socket;
          p.anchor = direction;
          p.socketOffset = [0, 0, 0];
        }
      });
      this.arm(null);
    } else this.add(this.armed, { host: 'chest', anchor: direction, socket });
  }
  adjust(key, value, index) {
    const selected = this.selected;
    this.store.preview(g => {
      if (
        ['roughness', 'patternScale', 'strength', 'metalness', 'relief', 'emission'].includes(key)
      ) {
        g.appearance[key] = value;
        return;
      }
      const node = g.nodes.find(n => n.id === selected),
        p = g.parts.find(n => n.id === selected);
      if (node && ['radii', 'offset'].includes(key)) {
        if (g.rig.family === 'humanoid')
          throw new Error('Use Actor proportions for humanoid body nodes.');
        node[key][index] = value;
      } else if (p) {
        if (key === 'azimuth' || key === 'elevation') {
          const [az, el] = normalToAngles(p.anchor);
          p.anchor = anglesToNormal(
            key === 'azimuth' ? value : az,
            key === 'elevation' ? value : el,
          );
        } else if (['size', 'length', 'twist', 'bend', 'flex', 'phase', 'presence'].includes(key))
          p[key] = value;
      }
    });
  }
  async action(action, el) {
    const g = this.store.state;
    if (action === 'close-dialog') {
      this.view.closeDialog();
      return;
    }
    if (action === 'help' || action === 'about') {
      this.view.dialog(helpContent());
      return;
    }
    if (
      [
        'test',
        'editor',
        'frame',
        'capture',
        'walk',
        'idle',
        'retry',
        'preview-toggle',
        'preview-reset',
        'human-replay',
        'review',
        'runtime-sheet',
        'runtime-record',
      ].includes(action)
    ) {
      await this.callbacks.action?.(action, el);
      return;
    }
    if (this.habitat) return;
    switch (action) {
      case 'apply-array': {
        const settings = { ...this.arraySettings };
        document.querySelectorAll('[data-array-setting]').forEach(e => {
          settings[e.dataset.arraySetting] = e.tagName === 'SELECT' ? e.value : Number(e.value);
        });
        const result = applyPartArray(g, this.selected, settings);
        this.arraySettings = result.settings;
        this.arm(null);
        this.store.replace(result.genome, 'Add part array');
        this.callbacks.frame?.();
        this.view.toast(
          result.added.length + ' independent copies added. Undo removes the full array.',
        );
        break;
      }
      case 'apply-kit': {
        const result = applyPartKit(g, el.dataset.kit);
        this.arm(null);
        this.store.replace(result.genome, 'Add ' + PART_KITS[el.dataset.kit].label);
        this.select(result.added[0]);
        this.view.tab = 'anatomy';
        this.render();
        this.callbacks.frame?.();
        this.view.toast('Kit added. Each part remains editable. Undo removes the whole kit.');
        break;
      }
      case 'human-action': {
        const clip = el.dataset.clip;
        if (!Object.hasOwn(HUMANOID_ACTIONS, clip)) throw new Error('Unknown action.');
        this.store.change('Set humanoid action', d => {
          d.motion.humanoid.action = clip;
          d.motion.humanoid.repeat = HUMANOID_ACTIONS[clip].loop;
        });
        this.callbacks.action?.('human-replay');
        break;
      }
      case 'export-actor':
        downloadBlob(
          JSON.stringify(actorManifest(g), null, 2),
          safeFilename(g.name) + '.actor.json',
        );
        break;
      case 'generate-roster':
        this.roster = generateActorBatch(g, this.generator);
        this.render();
        this.view.toast(`${this.roster.actors.length} actors generated. Select one to preview it.`);
        break;
      case 'load-roster-actor': {
        const actor = this.roster?.actors[Number(el.dataset.index)];
        if (!actor) throw new Error('Roster actor is missing.');
        this.arm(null);
        this.store.replace(actor.blueprint, 'Load generated actor');
        this.callbacks.frame?.();
        break;
      }
      case 'export-roster':
        if (!this.roster) throw new Error('Generate a roster first.');
        downloadBlob(JSON.stringify(this.roster, null, 2), safeFilename(g.name) + '.roster.json');
        break;
      case 'library-tab':
        this.libraryTab = el.dataset.library;
        this.view.library(this.libraryTab, document.querySelector('#library-search').value);
        break;
      case 'motion-preset':
        this.store.change('Change motion state', d => {
          d.motion.weights = defaultMotion(el.dataset.clip).weights;
        });
        break;
      case 'surface-preset': {
        const p = SURFACE_PRESETS[el.dataset.preset];
        if (!p) throw new Error('Unknown surface recipe.');
        this.store.change('Change surface recipe', d => {
          for (const key of ['pattern', 'roughness', 'metalness', 'relief', 'micro', 'emission'])
            d.appearance[key] = p[key];
        });
        break;
      }
      case 'add-layer':
        this.store.change('Add pigment layer', d => {
          if (d.appearance.layers.length >= 3) throw new Error('Four layers are already present.');
          d.appearance.layers.push({
            pattern: 'marble',
            scale: 5,
            weight: 0.5,
            angle: 0,
            warp: 0.45,
          });
        });
        break;
      case 'remove-layer':
        this.store.change('Remove pigment layer', d => {
          const i = Number(el.dataset.layer);
          if (i > 0) d.appearance.layers.splice(i - 1, 1);
        });
        break;
      case 'arm':
        this.arm(this.armed === el.dataset.type ? null : el.dataset.type);
        break;
      case 'cancel-arm':
        this.arm(null);
        break;
      case 'add':
        this.add(el.dataset.type);
        break;
      case 'select':
        this.select(el.dataset.id);
        break;
      case 'inspector':
        this.store.commitPreview();
        this.view.tab = el.dataset.tab;
        this.render();
        break;
      case 'undo':
        this.arm(null);
        this.store.undo();
        break;
      case 'redo':
        this.arm(null);
        this.store.redo();
        break;
      case 'delete':
        this.arm(null);
        this.store.change('Remove structure', d => removeGene(d, this.selected));
        break;
      case 'reattach': {
        const p = g.parts.find(p => p.id === this.selected);
        if (p) this.arm(p.type, true);
        break;
      }
      case 'preset':
        this.arm(null);
        this.store.replace(preset(el.dataset.preset), 'Load starting point');
        this.selected = 'core';
        this.render();
        this.callbacks.frame?.();
        this.view.toast('Starting point loaded. Undo restores your previous creature.');
        break;
      case 'mutate':
        this.arm(null);
        this.store.replace(mutate(g), 'Seeded mutation');
        this.view.toast(`Mutation ${this.store.state.generation} · seed ${this.store.state.seed}`);
        break;
      case 'palette': {
        const p = PALETTES[Number(el.dataset.palette)];
        this.store.change('Change palette', d => {
          d.appearance.color = p.color;
          d.appearance.accent = p.accent;
        });
        break;
      }
      case 'pattern':
        this.store.change('Change pattern', d => {
          d.appearance.pattern = el.dataset.pattern;
        });
        break;
      case 'save':
        this.save();
        break;
      case 'export':
        downloadBlob(serializeGenome(g), safeFilename(g.name) + '.morph.json');
        this.view.toast('Blueprint exported. Only the recipe—not a baked mesh.');
        break;
      case 'import':
        document.querySelector('#import-file').click();
        break;
    }
  }
  save() {
    this.store.commitPreview();
    try {
      localStorage.setItem(KEY, serializeGenome(this.store.state));
      document.querySelector('#save-state').textContent = 'Saved on this device';
      this.view.toast('Blueprint saved in this browser. Export JSON for a portable copy.');
    } catch {
      this.view.toast('Browser storage is unavailable. Use Export JSON to keep your blueprint.');
    }
  }
  async mixAction(action, el) {
    if (this.habitat) return;
    const m = this.mixer;
    if (action === 'preview') {
      m.preview();
      this.view.updateMix(m.state);
      return;
    }
    if (action === 'apply') {
      m.commit();
      this.render();
      this.view.toast('Mix applied. Undo restores the previous creature.');
      return;
    }
    if (action === 'cancel') {
      m.cancel();
      this.render();
      this.view.toast('Mix preview cancelled.');
      return;
    }
    if (action === 'capture') {
      m.setSource(el.dataset.slot, 'snapshot');
      this.render();
      return;
    }
    if (action === 'endpoint') {
      m.master(Number(el.dataset.value));
      m.preview();
      this.render();
      return;
    }
    if (action === 'random') {
      m.randomize();
      m.preview();
      this.render();
      return;
    }
    if (action === 'export') {
      downloadBlob(JSON.stringify(m.recipe(), null, 2), 'creature-mix.morphmix.json');
      this.view.toast('Mixer recipe exported with both source creatures.');
      return;
    }
    if (action === 'import' || action === 'import-source') {
      this.mixerImportTarget = action === 'import' ? 'recipe' : el.dataset.slot;
      document.querySelector('#mixer-import').click();
      return;
    }
    if (action === 'save') {
      try {
        m.save();
        this.view.toast('Mixer recipe saved on this device.');
      } catch {
        this.view.toast('Browser storage is unavailable. Use Export recipe.');
      }
      return;
    }
    if (action === 'load') {
      m.load();
      this.render();
      this.view.toast('Mixer recipe loaded. Preview to inspect the result.');
    }
  }
  bindMixers() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-mix-action]');
      if (!el) return;
      e.preventDefault();
      this.mixAction(el.dataset.mixAction, el).catch(error => this.view.toast(error.message));
    });
    document.addEventListener('input', e => {
      const el = e.target;
      if (this.habitat) return;
      try {
        if (el.id === 'library-search') {
          this.view.library(this.libraryTab, el.value);
          return;
        }
        if (el.id === 'motion-seek') {
          this.callbacks.action?.('preview-seek', el);
          return;
        }
        if (el.matches('[data-mix-channel],[data-mix-master],[data-mix-mutation]')) {
          const value = Number(el.value);
          if (el.hasAttribute('data-mix-master')) this.mixer.master(value);
          else if (el.dataset.mixChannel)
            this.mixer.settings.channels[el.dataset.mixChannel] = value;
          else this.mixer.settings.mutation = value;
          this.mixer.preview();
          el.closest('label')?.querySelector('output')?.replaceChildren(value.toFixed(2));
          this.view.updateMix(this.mixer.state);
          return;
        }
        if (el.matches('input[data-motion-key]')) {
          const value = Number(el.value),
            key = el.dataset.motionKey,
            group = el.dataset.motionGroup;
          this.store.preview(d => {
            if (group) d.motion[group][key] = value;
            else d.motion[key] = value;
          });
          el.closest('label')?.querySelector('output')?.replaceChildren(value.toFixed(2));
          return;
        }
        if (el.matches('input[data-layer-field]')) {
          const value = Number(el.value),
            i = Number(el.dataset.layerIndex),
            key = el.dataset.layerField;
          this.store.preview(d => {
            const layer = appearanceLayers(d.appearance)[i];
            layer[key] = value;
            setAppearanceLayer(d.appearance, i, layer);
          });
          el.closest('label')?.querySelector('output')?.replaceChildren(value.toFixed(2));
        }
      } catch (error) {
        this.view.toast(error.message);
      }
    });
    document.addEventListener('change', e => {
      const el = e.target;
      if (this.habitat) return;
      try {
        if (el.id === 'model-collection') {
          this.view.modelCollection = el.value;
          this.view.library(this.view.libraryTab, document.querySelector('#library-search').value);
        }
        if (el.id === 'model-medium') {
          this.view.modelMedium = el.value;
          this.view.library(this.view.libraryTab, document.querySelector('#library-search').value);
        }
        if (el.matches('[data-mix-source]')) {
          if (el.value === 'file') {
            this.mixAction('import-source', { dataset: { slot: el.dataset.mixSource } });
            return;
          }
          this.mixer.setSource(el.dataset.mixSource, el.value);
          this.render();
        }
        if (el.matches('[data-mix-lock]')) {
          this.mixer.setLock(el.dataset.mixLock, el.checked);
          this.render();
        }
        if (el.matches('[data-mix-topology]')) {
          this.mixer.settings.topology = el.value;
          this.mixer.preview();
          this.render();
        }
        if (el.matches('[data-mix-seed]')) {
          const n = Number(el.value);
          if (!Number.isInteger(n) || n < 0 || n > 4294967295)
            throw new Error('Seed must be an unsigned 32-bit integer.');
          this.mixer.settings.seed = n;
          this.mixer.preview();
          this.render();
        }
        if (el.matches('[data-mix-channel],[data-mix-master],[data-mix-mutation]')) this.render();
        if (el.matches('input[data-motion-key],input[data-layer-field]')) {
          this.store.commitPreview();
          this.render();
        }
        if (el.matches('select[data-layer-field]'))
          this.store.change('Change layer pattern', d => {
            const i = Number(el.dataset.layerIndex),
              layer = appearanceLayers(d.appearance)[i];
            layer.pattern = el.value;
            setAppearanceLayer(d.appearance, i, layer);
          });
        if (el.matches('[data-surface-seed]'))
          this.store.change('Change texture seed', d => {
            d.appearance.textureSeed = Number(el.value);
          });
        if (el.matches('[data-travel-medium]'))
          this.store.change('Change travel medium', d => {
            d.motion.travel.medium = el.value;
          });
        if (el.matches('[data-body-wave]'))
          this.store.change('Change body wave', d => {
            d.motion.bodyWave.kind = el.value;
          });
        if (el.matches('[data-surface-micro]'))
          this.store.change('Change microtexture', d => {
            d.appearance.micro = el.value;
          });
      } catch (error) {
        this.view.toast(error.message);
        this.render();
      }
    });
    document.querySelector('#mixer-import').addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        if (file.size > 1048576) throw new Error('Mixer input exceeds 1 MB.');
        const text = await file.text();
        if (this.mixerImportTarget === 'recipe') this.mixer.importRecipe(text);
        else this.mixer.importSource(this.mixerImportTarget, text);
        this.render();
        this.view.toast('Mixer input validated. Preview to inspect the result.');
      } catch (error) {
        this.view.toast(error.message);
      } finally {
        e.target.value = '';
      }
    });
  }
  bindActors() {
    document.addEventListener('input', e => {
      if (this.habitat) return;
      const el = e.target,
        v = Number(el.value);
      let changed = false;
      try {
        if (el.matches('[data-proportion]')) {
          this.store.preview(g => {
            g.rig.proportions[el.dataset.proportion] = v;
            syncHumanoidBody(g);
          });
          changed = true;
        }
        if (el.matches('[data-human-number]')) {
          this.store.preview(g => {
            g.motion.humanoid[el.dataset.humanNumber] = v;
          });
          changed = true;
        }
        if (el.matches('[data-actor-number]')) {
          this.store.preview(g => {
            g.actor[el.dataset.actorNumber] = v;
          });
          changed = true;
        }
        if (el.matches('[data-socket-offset]')) {
          this.store.preview(g => {
            g.parts.find(p => p.id === this.selected).socketOffset[
              Number(el.dataset.socketOffset)
            ] = v;
          });
          changed = true;
        }
        if (el.matches('[data-generator]')) {
          this.generator[el.dataset.generator] = v;
          changed = true;
        }
        if (changed)
          el.closest('label')
            ?.querySelector('output')
            ?.replaceChildren(v.toFixed(el.step === '1' ? 0 : 2));
      } catch (error) {
        this.view.toast(error.message);
      }
    });
    document.addEventListener('change', e => {
      if (this.habitat) return;
      const el = e.target;
      try {
        if (
          el.matches(
            '[data-proportion],[data-human-number],[data-actor-number],[data-socket-offset]',
          )
        ) {
          this.store.commitPreview();
          this.render();
        }
        if (el.matches('[data-rig-field]'))
          this.store.change('Change humanoid appearance', g => {
            g.rig[el.dataset.rigField] = el.value;
            if (el.dataset.rigField === 'bodyStyle') syncHumanoidBody(g);
          });
        if (el.matches('[data-human-field]'))
          this.store.change('Change humanoid motion', g => {
            g.motion.humanoid[el.dataset.humanField] = el.value;
          });
        if (el.matches('[data-human-repeat]'))
          this.store.change('Change action repeat', g => {
            g.motion.humanoid.repeat = el.checked;
          });
        if (el.matches('[data-actor-role]'))
          this.store.change('Change actor role', g => {
            g.actor = defaultActor(el.value);
          });
        if (el.matches('[data-actor-field]'))
          this.store.change('Change actor profile', g => {
            g.actor[el.dataset.actorField] = el.value;
          });
        if (el.matches('[data-part-material]'))
          this.store.change('Change part material', g => {
            g.parts.find(p => p.id === this.selected).material = el.value;
          });
        if (el.matches('[data-part-socket]'))
          this.store.change('Change joint socket', g => {
            g.parts.find(p => p.id === this.selected).socket = el.value;
          });
      } catch (error) {
        this.view.toast(error.message);
        this.render();
      }
    });
  }
  bind() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      e.preventDefault();
      Promise.resolve(this.action(el.dataset.action, el)).catch(error =>
        this.view.toast(error.message),
      );
    });
    document.addEventListener('input', e => {
      if (this.habitat) return;
      const el = e.target;
      if (!el.matches('[data-range]')) return;
      const key = el.dataset.range,
        output = document.querySelector(`[data-value="${key}${el.dataset.index || ''}"]`);
      try {
        this.adjust(key, Number(el.value), Number(el.dataset.index));
        if (output) output.textContent = Number(el.value).toFixed(Number(el.step) >= 1 ? 0 : 2);
      } catch (error) {
        this.view.toast(error.message);
      }
    });
    document.addEventListener('change', e => {
      if (this.habitat) return;
      const el = e.target;
      try {
        if (el.matches('[data-range]')) {
          this.store.commitPreview();
          this.render();
        }
        if (el.matches('[data-color]'))
          this.store.change('Change pigment', d => {
            d.appearance[el.dataset.color] = el.value;
          });
        if (el.matches('[data-toggle]')) {
          const key = el.dataset.toggle;
          if (key === 'partMirror')
            this.store.change('Change symmetry', d => {
              d.parts.find(p => p.id === this.selected).mirror = el.checked;
            });
          else {
            this.options[key] = el.checked;
            this.callbacks.options?.(this.options);
          }
        }
        if (el.matches('[data-field="variant"]'))
          this.store.change('Change part variant', d => {
            d.parts.find(p => p.id === this.selected).variant = Number(el.value);
          });
        if (el.matches('[data-field="host"]'))
          this.store.change('Change attachment host', d => {
            d.parts.find(p => p.id === this.selected).host = el.value;
          });
        if (el.id === 'creature-name')
          this.store.change('Rename creature', d => {
            d.name = el.value;
          });
      } catch (error) {
        this.view.toast(error.message);
        this.render();
      }
    });
    document.querySelector('#import-file').addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        if (file.size > 8388608) throw new Error('Input exceeds 8 MB.');
        const text = await file.text();
        if (JSON.parse(text)?.format === 'morph-lab-roster') {
          this.roster = parseActorRoster(text);
          this.view.tab = 'actor';
          this.render();
          this.view.toast('Roster imported. Select an actor to edit.');
          return;
        }
        const genome = parseActorInput(text);
        this.arm(null);
        this.store.replace(genome, 'Import blueprint');
        this.callbacks.frame?.();
        this.view.toast('Blueprint imported and validated.');
      } catch (error) {
        this.view.toast(error.message);
      } finally {
        e.target.value = '';
      }
    });
    document.addEventListener('keydown', e => {
      const typing = e.target.matches('input,textarea,select');
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        this.save();
        return;
      }
      if (typing || document.querySelector('#dialog').open) return;
      if (e.code === 'Escape') {
        if (this.armed) this.arm(null);
        else if (this.habitat) this.callbacks.action?.('editor');
        return;
      }
      if (e.code === 'KeyF') {
        this.callbacks.action?.('frame');
        return;
      }
      if (this.habitat) return;
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        e.shiftKey ? this.store.redo() : this.store.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        this.store.redo();
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        this.action('delete', {}).catch(error => this.view.toast(error.message));
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.store.commitPreview();
    });
  }
}

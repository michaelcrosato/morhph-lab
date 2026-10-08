import { renderPartArrays } from './part-array-panel.js';
import { PART_KITS } from '../core/content-pack.js';
import { renderActor, renderHumanoidMotion, renderSocketControls } from './actor-panel.js';
import { icon, escapeHTML as esc } from './icons.js';
import { renderMixer, renderMotion, renderSurfaceLayers, mixStatus } from './mixer-panel.js';
import { PRESET_MODELS } from '../core/presets.js';
import { CATALOG, PALETTES, PART_MATERIALS } from '../core/catalog.js';
import { normalToAngles } from '../core/math.js';
import { genomeFingerprint } from '../core/genome.js';
const $ = s => document.querySelector(s);
const button = (action, name, ico, cls = '') =>
  `<button class="${cls}" data-action="${action}" title="${name}" aria-label="${name}">${icon(ico)}<span>${name}</span></button>`;
const toggle = (key, name, value) =>
  `<label class="toggle-row"><span>${name}</span><input type="checkbox" data-toggle="${key}" ${value ? 'checked' : ''}><i></i></label>`;
function range(key, label, value, min, max, step = 0.01, unit = '', index = '') {
  return `<label class="range-label"><span>${label}</span><output data-value="${key}${index}">${Number(value).toFixed(step >= 1 ? 0 : 2)}${unit}</output><input type="range" data-range="${key}" ${index !== '' ? `data-index="${index}"` : ''} min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label}"></label>`;
}
export class View {
  constructor() {
    document.querySelector('#app').innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" data-action="about" aria-label="About Morph Lab"><div class="brand-mark">${icon('morph')}</div><div><b>morph<span>lab</span></b><small>PROCEDURAL CREATURE WORKSHOP</small></div></a>
      <div class="mode-tabs"><button data-action="editor" class="active" id="tab-editor"><span class="tab-number">01</span> Create</button><button data-action="test" id="tab-habitat"><span class="tab-number">02</span> Habitat</button><button data-action="review"><span class="tab-number">03</span> Inspect</button></div>
      <div class="header-actions"><span class="save-state" id="save-state">Local workspace</span>${button('system-checks', 'System checks', 'help', 'icon-button')}${button('delivery', 'Export asset', 'download', 'icon-button')}${button('help', 'Guide', 'help', 'icon-button')}${button('save', 'Save', 'save', 'quiet')}${button('test', 'Test creature', 'arrow', 'primary')}</div>
    </header>
    <div class="workspace">
      <aside class="library panel" id="library">
        <div class="panel-heading"><div><span class="eyebrow">BUILD SOMETHING UNEXPECTED</span><h2>Part library</h2></div><span class="count-badge">${Object.keys(CATALOG).length + 1}</span></div>
        <p class="panel-intro">Procedural anatomy. Reusable recipes.</p><div class="library-tabs"><button class="active" data-action="library-tab" data-library="parts">Parts · ${Object.keys(CATALOG).length + 1}</button><button data-action="library-tab" data-library="models">Models · ${PRESET_MODELS.length}</button><button data-action="library-tab" data-library="kits">Kits · ${Object.keys(PART_KITS).length}</button></div><input id="library-search" type="search" placeholder="Search the library" aria-label="Search the library">
        <label class="select-row model-medium" id="model-medium-row" hidden>Travel medium<select id="model-medium" aria-label="Filter model medium"><option value="all">All media</option><option value="ground">Ground</option><option value="water">Water</option><option value="air">Air</option></select></label>
        <div class="catalog" id="part-library">${Object.entries({
          body: {
            label: 'Body node',
            category: 'Foundation',
            description: 'Grow a connected, smoothly blended body segment.',
          },
          ...CATALOG,
        })
          .map(
            ([type, p], i) =>
              `<div class="part-card" data-card="${type}" data-search="${esc(type + ' ' + p.label + ' ' + p.category)}"><button class="part-pick" data-action="arm" data-type="${type}" title="${esc(p.description)}"><span class="part-thumb type-${type}">${icon(type)}<i>${String(i + 1).padStart(2, '0')}</i></span><span class="part-label">${p.label}<small>${p.category}</small></span></button><button class="part-add" data-action="add" data-type="${type}" title="Add ${p.label}" aria-label="Add ${p.label}">${icon('plus')}</button></div>`,
          )
          .join('')}</div>
        <div class="library-note">${icon('move')}<span>Choose a part, then click the skin.<br>Use <b>+</b> for a quick attachment.</span></div>
        <label class="select-row model-medium" id="model-collection-row" hidden>Content pack<select id="model-collection" aria-label="Filter content pack"><option value="all">All packs</option><option value="field">New: Field &amp; Settlement</option><option value="bloom">Carapace &amp; Bloom</option><option value="frontier">Strange Forms</option><option value="legacy">Earlier models</option></select></label>
        <div class="presets model-library" id="model-library" hidden>${PRESET_MODELS.map(p => `<button data-action="preset" data-preset="${p.id}" data-model-collection="${p.collection || 'legacy'}" data-model-medium="${p.medium || 'ground'}" data-search="${esc(p.label + ' ' + p.note + ' ' + (p.family || 'creature') + ' ' + (p.role || '') + ' ' + (p.medium || 'ground'))}"><span class="model-symbol">${icon('morph')}</span><strong>${p.label}<small>${p.note}</small></strong>${icon('arrow')}</button>`).join('')}</div>
        <div class="kit-library" id="kit-library" hidden>${Object.entries(PART_KITS)
          .map(
            ([id, k]) =>
              `<article class="kit-card" data-search="${esc(id + ' ' + k.label + ' ' + k.note)}"><div class="kit-icons">${k.parts.map(p => icon(p.type)).join('')}</div><h3>${esc(k.label)}</h3><p>${esc(k.note)}</p><small>${k.parts.length} genes · ${k.family === 'any' ? 'Both rigs' : 'Humanoid rig'}</small><button class="quiet" data-action="apply-kit" data-kit="${id}" data-kit-family="${k.family}">Add kit ${icon('plus')}</button></article>`,
          )
          .join(
            '',
          )}<p class="fine-copy">Kits add editable parts. Each kit is one undo step. Equipment has no separate collider or combat logic.</p></div>
        <div class="library-bottom">${button('mutate', 'Mutate specimen', 'dice', 'mutate-button')}<small>A seeded variation. Always reversible.</small></div>
      </aside>
      <main class="viewport" id="viewport">
        <canvas id="scene" aria-label="Interactive procedural creature; drag to orbit, scroll to zoom. Use the adjacent controls to edit." tabindex="0"></canvas>
        <div class="viewport-top"><div class="specimen-title"><span class="eyebrow" id="specimen-tag">SPECIMEN / 001</span><input id="creature-name" aria-label="Creature name" maxlength="40" value="Mossback"><div class="specimen-meta"><span class="live-dot"></span><span id="specimen-meta">Procedural organism</span></div></div><div class="canvas-tools">${button('undo', 'Undo', 'undo', 'icon-button')}${button('redo', 'Redo', 'redo', 'icon-button')}<span class="tool-separator"></span>${button('frame', 'Frame creature', 'frame', 'icon-button')}${button('capture', 'Capture image', 'camera', 'icon-button')}${button('runtime-sheet', 'Capture runtime review sheet', 'frame', 'icon-button')}${button('runtime-record', 'Export runtime review record', 'download', 'icon-button')}</div></div>
        <div id="placement-hint" class="placement-hint hidden"></div>
        <div id="habitat-hud" class="habitat-hud hidden"><div><span class="eyebrow">FIELD TRIAL</span><h2>Follow the spores.</h2><p>Collect all eight to complete your first expedition.</p></div><div class="spore-score">${icon('leaf')}<b id="spore-count">0</b><span>/ 8</span></div><div class="trial-details"><span id="trial-time">00:00</span><span id="trial-distance">0 m travelled</span></div></div>
        <div class="habitat-controls hidden" id="habitat-controls"><kbd>W A S D</kbd> move <kbd>Shift</kbd> sprint <kbd>Space</kbd> jump <kbd>R</kbd> reset ${button('editor', 'Back to editor', 'back', 'quiet')}</div>
        <div class="viewport-bottom" id="editor-bottom"><div class="view-badge">${icon('code')}<span>100% generated.<br><b>Not a single imported model.</b></span></div><div class="motion-control"><button data-action="idle" id="idle-button" class="active">${icon('pause')} Idle</button><button data-action="walk" id="walk-button">${icon('play')} Walk</button></div><button class="quiet mixer-shortcut" data-action="inspector" data-tab="mixer">${icon('mixer')} Mixer</button></div>
        <div class="preview-transport" id="preview-transport"><button data-action="preview-toggle" id="preview-play" aria-label="Pause animation">${icon('pause')}</button><button data-action="preview-reset" aria-label="Reset animation">${icon('undo')}</button><input id="motion-seek" type="range" min="0" max="20" step=".01" value="0" aria-label="Animation time"><output id="motion-time-readout">0.00 s</output></div><div class="loading" id="loading"><div class="loading-mark">${icon('morph')}</div><h2>Growing your first creature</h2><p id="loading-detail">Initializing WebGL2 & Rapier…</p></div>
      </main>
      <aside class="inspector panel" id="inspector">
        <div class="inspector-scroll"><div class="panel-heading"><div><span class="eyebrow">THE LITTLE DETAILS</span><h2>Inspector</h2></div>${icon('tree')}</div>
        <div class="inspector-tabs"><button data-action="inspector" data-tab="anatomy" class="active">Anatomy</button><button data-action="inspector" data-tab="surface">Surface</button><button data-action="inspector" data-tab="motion">Motion</button><button data-action="inspector" data-tab="mixer">Mixer</button><button data-action="inspector" data-tab="actor">Actor</button></div>
        <div id="inspector-content"></div></div>
        <div class="inspector-footer"><span id="blueprint-hash"></span><div>${button('import', 'Import JSON', 'upload', 'icon-button')}${button('export', 'Export JSON', 'download', 'icon-button')}</div></div>
      </aside>
    </div>
    <footer class="statusbar"><div><span class="live-dot"></span><b>WEBGL2</b><span class="status-divider">/</span> THREE R181 <span class="status-divider">/</span> RAPIER 0.19.3</div><div id="render-stats">Growing mesh…</div><div>DISCOVERY STUDIO <span class="version-chip">v12.0</span></div></footer>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <input id="mixer-import" type="file" accept=".json,application/json" hidden><input id="import-file" type="file" accept=".json,application/json" hidden>
    <dialog id="dialog"><button class="dialog-close icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button><div id="dialog-content"></div></dialog>`;
    this.tab = 'anatomy';
    this.toastTimer = 0;
  }
  render(genome, selected, options, analysis, store, mixer) {
    this.mixerState = mixer;
    document.querySelectorAll('[data-kit-family]').forEach(b => {
      b.disabled = b.dataset.kitFamily !== 'any' && b.dataset.kitFamily !== genome.rig.family;
      b.title = b.disabled ? 'Load a humanoid to use this kit.' : 'Add this kit as one undo step.';
    });
    if (document.activeElement !== $('#creature-name')) $('#creature-name').value = genome.name;
    $('#specimen-tag').textContent = `SPECIMEN / ${String(genome.generation + 1).padStart(3, '0')}`;
    $('#specimen-meta').textContent =
      `${genome.rig.family === 'humanoid' ? 'Humanoid · ' : ''}${analysis.legs} limbs · ${analysis.partCount} structures · Seed ${genome.seed}`;
    $('#blueprint-hash').textContent = 'DNA ' + genomeFingerprint(genome).toUpperCase();
    $('[data-action="undo"]').disabled = !store.past.length;
    $('[data-action="redo"]').disabled = !store.future.length;
    document
      .querySelectorAll('[data-action="inspector"]')
      .forEach(b => b.classList.toggle('active', b.dataset.tab === this.tab));
    const openLayers = [...document.querySelectorAll('.skin-layer')].map(el => el.open);
    const actorDetails = [...document.querySelectorAll('.actor-details')].map(el => el.open);
    this.renderInspector(genome, selected, options, analysis);
    document.querySelectorAll('.skin-layer').forEach((el, i) => {
      if (openLayers[i] !== undefined) el.open = openLayers[i];
    });
    document.querySelectorAll('.actor-details').forEach((el, i) => {
      if (actorDetails[i] !== undefined) el.open = actorDetails[i];
    });
  }
  renderInspector(g, selected, o, a) {
    const node = g.nodes.find(n => n.id === selected),
      part = g.parts.find(p => p.id === selected);
    if (this.tab === 'mixer') {
      $('#inspector-content').innerHTML = renderMixer(this.mixerState);
      return;
    }
    if (this.tab === 'motion') {
      $('#inspector-content').innerHTML = renderHumanoidMotion(g) + renderMotion(g.motion);
      return;
    }
    if (this.tab === 'actor') {
      $('#inspector-content').innerHTML = renderActor(g, this.actorState);
      return;
    }
    if (this.tab === 'surface') {
      $('#inspector-content').innerHTML =
        `<div class="inspector-section"><div class="section-title">CHROMATOPHORES</div><p class="fine-copy">Pigment and microscopic pores, generated directly in the material.</p><div class="swatches">${PALETTES.map((p, i) => `<button data-action="palette" data-palette="${i}" style="--swatch:${p.color}" title="${p.name}" aria-label="${p.name} palette" class="${p.color === g.appearance.color ? 'selected' : ''}">${p.color === g.appearance.color ? icon('check') : ''}</button>`).join('')}</div><div class="color-row"><label>Skin <input data-color="color" type="color" value="${g.appearance.color}" aria-label="Skin color"></label><label>Accent <input data-color="accent" type="color" value="${g.appearance.accent}" aria-label="Accent color"></label></div></div><div class="inspector-section"><div class="section-title">PATTERN</div><div class="pattern-picker">${['plain', 'spots', 'stripes'].map(p => `<button data-action="pattern" data-pattern="${p}" class="${g.appearance.pattern === p ? 'active' : ''}"><i class="pattern-${p}"></i>${p}</button>`).join('')}</div></div>${renderSurfaceLayers(g.appearance)}${this.displayOptions(o)}`;
      return;
    }
    const selectedName = node
      ? node.parent
        ? 'Body segment'
        : 'Core body'
      : part
        ? CATALOG[part.type].label
        : 'Select a structure';
    $('#inspector-content').innerHTML =
      `<div class="selected-part"><div class="selected-icon">${icon(node ? 'body' : part?.type || 'body')}</div><div><small>SELECTED STRUCTURE</small><h3>${selectedName}</h3><span>${esc(selected || 'Click your creature')}</span></div>${part?.mirror ? `<span title="Mirrored pair">${icon('symmetry')}</span>` : ''}</div>
      <div class="inspector-section">${node && g.rig.family === 'humanoid' ? `<p class="fine-copy">This node belongs to the humanoid rig. Change its dimensions in the Actor panel.</p><button class="quiet" data-action="inspector" data-tab="actor">Edit humanoid proportions</button>` : node ? `<div class="section-title">BODY SHAPE</div>${range('radii', 'Width', node.radii[0], 0.25, 2.4, 0.01, '', 0)}${range('radii', 'Height', node.radii[1], 0.25, 2.4, 0.01, '', 1)}${range('radii', 'Depth', node.radii[2], 0.25, 2.4, 0.01, '', 2)}${node.parent ? `${range('offset', 'Vertical position', node.offset[1], -1.5, 1.5, 0.01, '', 1)}${range('offset', 'Forward position', node.offset[2], -2, 2, 0.01, '', 2)}<p class="fine-copy">Segments must overlap their parent. Surface attachments follow the reshaped body.</p>` : '<p class="fine-copy">The foundation of the organism. Add body nodes to grow a connected silhouette.</p>'}` : part ? this.partControls(part, g) : '<p class="fine-copy">Click a body or appendage in the viewport, or choose one from the structure below.</p>'}
      ${(node?.parent && g.rig.family !== 'humanoid') || part ? `<div class="selected-actions">${part ? button('reattach', 'Reattach', 'move', 'quiet') : ''}${button('delete', 'Remove', 'trash', 'danger quiet')}</div>` : ''}</div>
      <div class="inspector-section"><div class="section-title">BLUEPRINT <span>${g.nodes.length} NODES / ${g.parts.length} GENES</span></div><div class="gene-tree">${g.nodes
        .map(
          n =>
            `<button class="gene-node ${selected === n.id ? 'selected' : ''}" data-action="select" data-id="${esc(n.id)}"><span>${icon('body')}${esc(n.id)}</span><small>${n.parent ? 'SEGMENT' : 'ROOT'}</small></button>${g.parts
              .filter(p => p.host === n.id)
              .map(
                p =>
                  `<button class="gene-part ${selected === p.id ? 'selected' : ''}" data-action="select" data-id="${esc(p.id)}"><span>${icon(p.type)}${CATALOG[p.type].label}</span><small>×${a.parts.filter(x => x.id === p.id).length}</small></button>`,
              )
              .join('')}`,
        )
        .join('')}</div></div>
      <div class="inspector-section"><div class="section-title">LOCOMOTION</div><div class="traits"><div><b>${a.legs}</b><span>walking limbs</span></div><div><b>${a.speed.toFixed(1)}</b><span>metres / sec</span></div></div>${a.warnings.map(w => `<p class="warning-copy">${esc(w)}</p>`).join('')}</div>${this.displayOptions(o)}`;
  }
  partControls(p, g) {
    const [az, el] = normalToAngles(p.anchor);
    return `<div class="section-title">PROPORTIONS</div>${range('size', 'Scale', p.size, 0.35, 2.1)}${range('length', 'Length', p.length, 0.45, 2)}${range('twist', 'Twist', p.twist, -3.14, 3.14, 0.01)}${range('bend', 'Bend', p.bend, -1, 1)}<label class="select-row">Variant<select data-field="variant" aria-label="Part variant">${[0, 1, 2].map(v => `<option value="${v}" ${p.variant === v ? 'selected' : ''}>${esc(CATALOG[p.type].variants?.[v] || 'Shape ' + (v + 1))}</option>`).join('')}</select></label><label class="select-row">Part material<select data-part-material aria-label="Part material">${PART_MATERIALS.map(m => `<option value="${m}" ${p.material === m ? 'selected' : ''}>${m === 'inherit' ? 'Factory default' : m}</option>`).join('')}</select></label><div class="section-title spaced">PART MOTION</div>${range('flex', 'Motion gain', p.flex, 0, 2)}${range('phase', 'Motion phase', p.phase, 0, 1)}${range('presence', 'Presence', p.presence, 0, 1)}<div class="section-title spaced">SURFACE ANCHOR</div><label class="select-row">Attached to<select data-field="host" aria-label="Attachment host">${g.nodes.map(n => `<option value="${esc(n.id)}" ${p.host === n.id ? 'selected' : ''}>${esc(n.id)}</option>`).join('')}</select></label>${range('azimuth', 'Around body', az, -3.14, 3.14, 0.01)}${range('elevation', 'Up / down', el, -1.5, 1.5, 0.01)}${toggle('partMirror', 'Mirror this part', p.mirror)}${renderSocketControls(p, g)}${renderPartArrays(p, this.arraySettings)}`;
  }
  displayOptions(o) {
    return `<div class="inspector-section"><div class="section-title">WORKSPACE</div>${toggle('symmetry', 'Mirror new parts', o.symmetry)}${toggle('guides', 'Show body structure', o.guides)}${toggle('wireframe', 'Wireframe mesh', o.wireframe)}${toggle('debug', 'Physics colliders in habitat', o.debug)}</div>`;
  }
  arm(type, reattach = false) {
    document
      .querySelectorAll('[data-card]')
      .forEach(c => c.classList.toggle('armed', c.dataset.card === type));
    const h = $('#placement-hint');
    h.classList.toggle('hidden', !type);
    h.innerHTML = type
      ? `${icon(type)}<span>${reattach ? 'Reattach' : 'Place'} <b>${CATALOG[type]?.label || 'Body node'}</b> · click the skin</span><button data-action="cancel-arm" aria-label="Cancel placement">${icon('close')}</button>`
      : '';
    $('#scene').classList.toggle('placing', !!type);
  }
  travelControls(medium) {
    const panel = $('#habitat-controls');
    if (!panel) return;
    panel.innerHTML =
      medium === 'ground'
        ? '<span>WASD / arrows · move</span><span>Shift · sprint</span><span>Space · jump</span><span>R · reset</span><span>Esc · edit</span>'
        : '<span>' +
          (medium === 'water' ? 'REEF TANK' : 'SKY COURSE') +
          '</span><span>WASD / arrows · move</span><span>Space / E · rise</span><span>Q / Ctrl · descend</span><span>Shift · boost</span><span>R · reset · Esc · edit</span>';
  }
  mode(habitat) {
    document.body.classList.toggle('in-habitat', habitat);
    $('#tab-editor').classList.toggle('active', !habitat);
    $('#tab-habitat').classList.toggle('active', habitat);
    $('#habitat-hud').classList.toggle('hidden', !habitat);
    $('#habitat-controls').classList.toggle('hidden', !habitat);
    $('#editor-bottom').classList.toggle('hidden', habitat);
    $('#creature-name').disabled = habitat;
    $('#preview-transport').classList.toggle('hidden', habitat);
  }
  updateMix(m) {
    const node = $('#mix-status');
    if (node) node.innerHTML = mixStatus(m);
  }
  transport(playing, time) {
    const button = $('#preview-play');
    if (this.transportPlaying !== playing) {
      button.innerHTML = icon(playing ? 'pause' : 'play');
      this.transportPlaying = playing;
    }
    button.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
    if (document.activeElement !== $('#motion-seek')) $('#motion-seek').value = time % 20;
    $('#motion-time-readout').textContent = (time % 20).toFixed(2) + ' s';
  }
  library(tab = 'parts', query = '') {
    this.libraryTab = tab;
    $('#model-medium-row').hidden = tab !== 'models';
    $('#model-collection-row').hidden = tab !== 'models';
    $('#part-library').hidden = tab !== 'parts';
    $('#model-library').hidden = tab !== 'models';
    $('#kit-library').hidden = tab !== 'kits';
    document
      .querySelectorAll('[data-library]')
      .forEach(b => b.classList.toggle('active', b.dataset.library === tab));
    document
      .querySelectorAll('[data-search]')
      .forEach(
        el =>
          (el.hidden =
            !el.dataset.search.toLowerCase().includes(query.toLowerCase()) ||
            (!!el.dataset.modelMedium &&
              this.modelMedium &&
              this.modelMedium !== 'all' &&
              el.dataset.modelMedium !== this.modelMedium) ||
            (!!el.dataset.modelCollection &&
              this.modelCollection &&
              this.modelCollection !== 'all' &&
              el.dataset.modelCollection !== this.modelCollection)),
      );
  }
  motion(walking) {
    $('#idle-button').classList.toggle('active', !walking);
    $('#walk-button').classList.toggle('active', walking);
  }
  progress(count, time, distance) {
    $('#spore-count').textContent = count;
    $('#trial-time').textContent =
      `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
    $('#trial-distance').textContent = `${Math.floor(distance)} m travelled`;
  }
  stats(fps, triangles, draws) {
    $('#render-stats').textContent =
      `${fps} FPS · ${(triangles / 1000).toFixed(1)}k triangles · ${draws} draws`;
  }
  toast(message) {
    clearTimeout(this.toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    this.toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3800);
  }
  dialog(html) {
    $('#dialog-content').innerHTML = html;
    if (!$('#dialog').open) $('#dialog').showModal();
  }
  closeDialog() {
    $('#dialog').close();
  }
  ready() {
    $('#loading').classList.add('hidden');
  }
  fail(error) {
    $('#loading').classList.remove('hidden');
    $('#loading').innerHTML =
      `<div class="loading-mark">${icon('morph')}</div><h2>The Workshop stopped</h2><p>${esc(error.message || error)}</p><button class="primary" data-action="creator">Return to monster creator</button><button class="quiet" data-action="system-checks">System checks</button><small><button class="quiet" data-action="review">Open the offline foundation reviewer</button>. Serve this folder over HTTP. Check that WebGL2 is enabled and the pinned engine files are accessible.</small>`;
  }
}
export function helpContent() {
  return `<span class="eyebrow">WELCOME TO MORPH LAB</span><h2>Give a strange idea<br>a little life.</h2><p>This is an open-ended creature workshop and a tiny physics playground. No imported models, textures, or animation clips.</p><div class="help-steps"><div><b>01</b><section><h3>Build an organism</h3><p>Choose a library part, then click the skin. The + button adds one immediately. Click a structure to change its proportions or surface anchor.</p></section></div><div><b>02</b><section><h3>Make it yours</h3><p>Blend body nodes, mirror appendages, change the skin, or mutate a specimen. Every change is reversible with Ctrl/Cmd + Z.</p></section></div><div><b>03</b><section><h3>Take your first steps</h3><p>Enter the habitat. Move with WASD or arrows, sprint with Shift, and jump with Space on ground. In water or air, Space/E rises and Q/Ctrl descends. Collect eight spores. Press R to return to the start or Esc to edit.</p></section></div></div><p class="fine-copy">Orbit: drag · Pan: right drag / Shift-drag in editor · Zoom: scroll · Frame: F · Delete part: Delete · Cancel placement: Esc · Save locally: Ctrl/Cmd + S.</p><p class="fine-copy">This foundation uses a dynamic compound rigid body and animated IK limbs—not a fully articulated physical ragdoll. Decorative parts do not have separate colliders.</p><p class="fine-copy">Mixer: choose sources A and B, change channel values, then Apply or Cancel. Motion and Surface have separate layer controls. Use the time bar to pause and inspect a pose.</p><p class="fine-copy">Field &amp; Settlement: choose from 89 models, including 27 humanoids, 18 swimmers, and 16 fliers. The new set adds four land animals and six role models. Shared inspection now includes older equipment and head details. Use Part arrays in Anatomy to repeat a selected part as independent editable copies. Use Actor for proportions, role data, and seeded rosters. Use Motion for gestures and actions. Joint sockets keep monster parts attached during movement. The Kits tab adds grouped parts in one undo step. Choose a material for each part in Anatomy.</p><button class="primary" data-action="close-dialog">Open the workshop ${icon('arrow')}</button>`;
}

import { preset, parseGenome, validateGenome } from '../core/genome.js';
import {
  TRAITS,
  SCOPES,
  CREATOR_MODELS,
  generateDiscovery,
  generateBatch,
  mixDiscovery,
  replayRecipe,
  discoverySignature,
  checkedSeed,
} from './generator.js';
import { CreatorSession } from './session.js';
import { APP_VERSION } from '../core/version.js';
import { DiscoveryLibrary, parseCollection, MAX_COLLECTION_BYTES } from './library.js';
import { CreatorPreview, creatureThumbnail } from './preview.js';
import { escapeHTML as esc, icon } from '../ui/icons.js';
import { toolDialog, localDownload } from '../ui/tool-dialog.js';
import { openDeliveryPanel } from '../export/panel.js';
import { openDiagnostics } from '../diagnostics/panel.js';
import { enterFoundationReview, enterWorkshop } from '../review/transfer.js';

const $ = s => document.querySelector(s),
  clone = structuredClone;
const bridge = window.__MORPH_WORKSPACE__ || {};
let initial = bridge.creator?.session,
  session,
  notice = '';
if (!initial)
  try {
    initial = JSON.parse(sessionStorage.getItem('morph-lab.creator-session.v1') || 'null');
  } catch {}
try {
  session = initial ? CreatorSession.restore(initial) : new CreatorSession();
} catch {
  session = new CreatorSession();
  notice =
    'The previous work session could not be restored. Your saved collection was not changed.';
}
let incoming = bridge.genome;
if (!incoming && !window.__MORPH_EMBEDDED__)
  try {
    const text = sessionStorage.getItem('morph-lab.creator-transfer');
    if (text) {
      incoming = parseGenome(text);
      sessionStorage.removeItem('morph-lab.creator-transfer');
    }
  } catch {}
if (incoming && JSON.stringify(validateGenome(incoming)) !== JSON.stringify(session.current.genome))
  session.commit(incoming);
let storage = null;
try {
  storage = window.localStorage;
} catch {}
const library = new DiscoveryLibrary(storage);
if (bridge.creator?.collection)
  try {
    library.items = parseCollection(JSON.stringify(bridge.creator.collection));
  } catch (e) {
    notice = e.message;
  }
let busy = false,
  batch = [],
  onlyFavorites = false,
  search = '',
  mixTimer = null,
  importMode = 'blueprint',
  galleryGeneration = 0,
  backend = 'cpu';
const options = (entries, selected) =>
  entries
    .map(
      ([id, label]) =>
        `<option value="${esc(id)}" ${id === selected ? 'selected' : ''}>${esc(label)}</option>`,
    )
    .join('');
const modelOptions = () =>
  options(
    CREATOR_MODELS.map(m => [
      m.id,
      m.label + ' · ' + (m.family === 'humanoid' ? 'Humanoid' : m.medium),
    ]),
    'mossback',
  );
const app = $('#app');
app.className = 'creator-root';
app.innerHTML = `<div class="creator-app">
<header class="creator-heading"><div><div class="creator-kicker">MORPH LAB <span>DISCOVER / KEEP / REMIX</span></div><h1>Monster creator<span class="creator-dot">.</span></h1><p>Roll something new. Keep what works. Build from your discoveries.</p></div><div class="creator-header-actions"><button data-create="checks" title="Check the browser and engines">System checks</button><button data-create="inspect">Inspect model ${icon('arrow')}</button></div></header>
<div class="creator-topline"><label class="creator-model-label">Start from a model <select id="creator-preset" aria-label="Starting model">${modelOptions()}</select></label><button data-create="load-preset">Load model</button><span class="creator-library-count">89 models · 73 part families</span><button class="creator-text-button" data-create="workshop">Advanced workshop ${icon('arrow')}</button></div>
<div class="creator-grid">
<section class="creator-work">
<div class="creator-preview-card">
<div class="creator-preview-heading"><div><label for="creature-name" class="creator-kicker">CURRENT DISCOVERY</label><input id="creature-name" aria-label="Creature name" maxlength="40"></div><div class="creator-history"><button data-create="undo" aria-label="Undo" title="Undo">${icon('undo')}</button><button data-create="redo" aria-label="Redo" title="Redo">${icon('redo')}</button></div></div>
<div class="creator-viewport" id="creator-stage"><canvas id="creator-canvas" aria-label="Procedural creature preview" tabindex="0"></canvas><canvas id="creator-webgl" hidden aria-label="WebGL2 creature preview" tabindex="0"></canvas>
<div class="creator-view-tools"><div class="creator-segment" aria-label="Display"><button data-shading="pattern" aria-pressed="true">Color</button><button data-shading="clay" aria-pressed="false">Clay</button><button data-shading="wire" aria-pressed="false">Wire</button></div><button class="creator-fit" data-create="fit" title="Fit the full model">Fit view</button></div>
<div class="creator-model-meta"><span id="creator-model-meta"></span><span id="creator-render-label">Offline geometry preview</span></div><div id="creator-busy" class="creator-busy" hidden role="status">Building a discovery…</div></div>
<div class="creator-transport"><button data-create="play" id="creator-play" aria-pressed="false">${icon('play')} Play motion</button><label><span class="sr-only">Motion phase</span><input type="range" id="creator-phase" min="0" max="1" step="0.01" value="0.15" aria-label="Motion phase"></label><button data-create="turntable" aria-pressed="false">Turntable</button><button data-create="retry-gpu" id="creator-retry">Try WebGL2</button></div>
<div class="creator-primary-actions"><button class="creator-primary" data-create="random">${icon('dice')} Randomize monster</button><button data-create="variation">Vary current</button><button data-create="batch">6 variations</button><button class="creator-save" data-create="save">${icon('plus')} Save discovery</button></div>
</div>
<section id="creator-candidates" class="creator-candidates" hidden><div class="creator-section-title"><div><span class="creator-kicker">ONE PARENT / SIX DIRECTIONS</span><h2>Choose a variation</h2></div><button data-create="clear-batch">Close</button></div><p>All six came from the same parent. Select one to continue; the parent and saved copies stay unchanged.</p><div id="candidate-grid"></div></section>
<div class="creator-controls">
<section class="creator-panel creator-random-panel"><div class="creator-section-title"><div><span class="creator-kicker">01 / EXPLORE</span><h2>Randomness & locks</h2></div><span class="creator-panel-mark">↝</span></div>
<div class="creator-form-row"><label>Source pool<select id="creator-scope">${options(Object.entries(SCOPES), session.settings.scope)}</select></label><label>Roll seed<input id="creator-seed" type="number" min="0" max="4294967295" step="1" value="${session.settings.seed}"></label></div>
<label class="creator-check"><input id="creator-new-seed" type="checkbox" ${session.settings.newSeed ? 'checked' : ''}>New seed on each roll</label>
<label class="creator-range-title" for="creator-strength"><span>Variation amount</span><output id="creator-strength-value">${Math.round(session.settings.strength * 100)}%</output></label><input id="creator-strength" type="range" min="0" max="1" step="0.01" value="${session.settings.strength}"><div class="creator-range-ends"><span>Close to parent</span><span>Further away</span></div>
<p class="creator-small">Roll one trait, or lock it to keep it during a roll or mix.</p>
<div class="creator-traits">${Object.entries(TRAITS)
  .map(
    ([key, label]) =>
      `<div class="creator-trait"><button data-roll-trait="${key}" title="Randomize ${label.toLowerCase()}">${label}</button><button data-lock-trait="${key}" aria-label="Lock ${label.toLowerCase()}" aria-pressed="false" title="Keep ${label.toLowerCase()}">${icon('lock')}</button></div>`,
  )
  .join(
    '',
  )}</div><p class="creator-small" id="creator-lock-note">Head parts means head attachments. Body controls include head size.</p>
</section>
<section class="creator-panel creator-mix-panel"><div class="creator-section-title"><div><span class="creator-kicker">02 / COMBINE</span><h2>Mix two discoveries</h2></div><button data-create="swap" title="Swap mixer parents">Swap</button></div>
<div class="creator-parents">${['a', 'b'].map(slot => `<div class="creator-parent"><div class="creator-parent-top"><span>PARENT ${slot.toUpperCase()}</span><button data-capture-parent="${slot}">Use current</button></div><div class="creator-parent-face"><img id="parent-${slot}-image" alt="Parent ${slot.toUpperCase()} geometry"><strong id="parent-${slot}-name"></strong></div><select id="parent-${slot}-select" data-parent-select="${slot}" aria-label="Choose parent ${slot.toUpperCase()}"></select></div>`).join('')}</div>
<label class="creator-range-title" for="creator-blend"><span>Blend amount</span><output id="creator-blend-value">50%</output></label><input id="creator-blend" type="range" min="0" max="1" step="0.01" value=".5"><div class="creator-range-ends"><span>Parent A</span><span>Parent B</span></div>
<details class="creator-channel-details"><summary>Separate blend channels</summary>${Object.entries(
  TRAITS,
)
  .map(
    ([key, label]) =>
      `<label class="creator-channel"><span>${label}</span><input data-blend-channel="${key}" type="range" min="0" max="1" step=".01" value=".5" aria-label="Mix ${label.toLowerCase()}"><output data-channel-output="${key}">50%</output></label>`,
  )
  .join('')}</details>
<div class="creator-mix-actions"><button class="creator-primary" data-create="mix">Preview mix</button><button data-create="apply" disabled>Keep mix</button><button data-create="cancel" disabled>Cancel</button></div><p class="creator-small" id="creator-mix-note">Parents are fixed copies. Sliding does not alter a saved discovery. Incompatible body graphs switch; they do not morph.</p>
</section></div>
<div class="creator-message" id="creator-message" role="status" aria-live="polite"></div>
</section>
<aside class="creator-panel creator-saved"><div class="creator-section-title"><div><span class="creator-kicker">03 / KEEP & REUSE</span><h2>Saved discoveries <span id="saved-count">0</span></h2></div></div><p class="creator-small">Load a keeper. Make variations. Use it as parent A or B.</p><div class="creator-saved-tools"><input type="search" id="saved-search" placeholder="Search discoveries" aria-label="Search discoveries"><button data-create="favorites" aria-pressed="false" title="Show favorites">Favorites</button></div><div id="discovery-grid"></div><p class="creator-storage" id="creator-storage" role="status"></p><button class="creator-wide" data-create="save">+ Save current creature</button><div class="creator-collection-actions"><button data-create="export-collection">Back up collection</button><button data-create="import-collection">Import collection</button></div><div class="creator-export-tools"><span class="creator-kicker">TAKE IT WITH YOU</span><button data-create="export-blueprint">Export blueprint</button><button data-create="export-recipe">Export roll / mix recipe</button><button data-create="export-glb">Build GLB asset</button><button data-create="import-blueprint">Import blueprint or recipe</button></div><p class="creator-small">Saved copies stay local. Keep a collection backup before moving the HTML or changing browsers.</p></aside>
</div><footer class="creator-footer"><span>Procedural geometry · no image-model substitutes</span><span>Three.js r181 / Rapier 0.19.3 · <b>CREATOR 12.0</b></span></footer>
<input type="file" id="creator-file" accept=".json,application/json" hidden><div id="creator-toast" role="status" aria-live="polite"></div></div>`;

function toast(text) {
  const el = $('#creator-toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 4800);
}
const preview = new CreatorPreview($('#creator-stage'), status => {
  backend = status.backend;
  $('#creator-render-label').textContent =
    status.backend === 'webgl2'
      ? 'WebGL2 · Three.js r181'
      : status.backend === 'loading'
        ? 'Loading WebGL2 engine…'
        : 'Offline geometry · CPU';
  $('#creator-retry').hidden = status.backend === 'webgl2';
  $('#creator-retry').disabled = status.backend === 'loading';
  if (status.reason)
    $('#creator-render-label').title =
      status.reason + ' The offline preview uses generated triangles, not GPU materials.';
});
function persistSession() {
  try {
    sessionStorage.setItem('morph-lab.creator-session.v1', JSON.stringify(session.export()));
  } catch {}
}
function readSettings(newRoll = false) {
  const seedText = $('#creator-seed').value;
  if (!seedText.trim()) throw new Error('Enter a roll seed.');
  session.settings.seed = checkedSeed(Number(seedText));
  session.settings.newSeed = $('#creator-new-seed').checked;
  session.settings.scope = $('#creator-scope').value;
  session.settings.strength = Number($('#creator-strength').value);
  if (newRoll && session.settings.newSeed) {
    const data = new Uint32Array(1);
    crypto.getRandomValues(data);
    session.settings.seed = data[0];
    $('#creator-seed').value = data[0];
  }
  return clone(session.settings);
}
function setBusy(value, text = 'Building a discovery…') {
  busy = value;
  $('#creator-busy').hidden = !value;
  $('#creator-busy').textContent = text;
  app.setAttribute('aria-busy', String(value));
  syncButtons();
}
function syncButtons() {
  const pending = !!session.previewBase;
  for (const el of app.querySelectorAll(
    '[data-create],[data-roll-trait],[data-lock-trait],[data-capture-parent]',
  ))
    el.disabled = busy;
  $('[data-create="undo"]').disabled = busy || (!session.past.length && !pending);
  $('[data-create="redo"]').disabled = busy || !session.future.length;
  $('[data-create="apply"]').disabled = busy || !pending;
  $('[data-create="cancel"]').disabled = busy || !pending;
  $('[data-create="export-recipe"]').disabled = busy || !session.current.recipe;
  for (const key of ['random', 'variation', 'batch', 'load-preset'])
    $(`[data-create="${key}"]`).disabled = busy || pending;
  for (const el of app.querySelectorAll('[data-roll-trait]'))
    el.disabled =
      busy ||
      pending ||
      session.settings.locks[el.dataset.rollTrait] ||
      (el.dataset.rollTrait === 'body' &&
        (session.settings.locks.head || session.settings.locks.parts));
  $('#creator-retry').disabled = busy || backend === 'loading';
}
function update() {
  const g = session.current.genome;
  if (document.activeElement !== $('#creature-name')) $('#creature-name').value = g.name;
  $('#creator-model-meta').textContent =
    `${preview.counts?.triangles.toLocaleString() || '—'} triangles · ${g.parts.length} genes · ${g.motion.travel.medium} · generation ${g.generation}`;
  for (const [key, locked] of Object.entries(session.settings.locks))
    $(`[data-lock-trait="${key}"]`).setAttribute('aria-pressed', String(locked));
  $('#creator-lock-note').textContent =
    session.settings.locks.head || session.settings.locks.parts
      ? 'Attachment locks also hold the body and rig so the saved mounts stay valid.'
      : 'Head parts means head attachments. Body controls include head size.';
  $('#creator-mix-note').textContent = session.previewBase
    ? 'Preview only. Keep mix commits one undo step. Cancel restores the previous creature.'
    : 'Parents are fixed copies. Saved discoveries are never changed by a mix. Incompatible body graphs switch.';
  $('#creator-message').textContent =
    session.current.recipe?.notes?.join(' ') ||
    notice ||
    'Drag to rotate. Scroll to zoom. Save a discovery to start a new branch.';
  syncButtons();
  persistSession();
}
function adopt(result) {
  preview.setGenome(result.genome || result);
  session.commit(result);
  update();
}
function resetPending() {
  clearTimeout(mixTimer);
  mixTimer = null;
  session.cancel();
}
function updateParents() {
  for (const slot of ['a', 'b']) {
    const g = session.sources[slot];
    $(`#parent-${slot}-name`).textContent = g.name;
    $(`#parent-${slot}-image`).src = creatureThumbnail(g, 140, 104);
    $(`#parent-${slot}-select`).innerHTML =
      `<option value="snapshot">${esc(g.name)} (snapshot)</option><optgroup label="Saved discoveries">${options(
        library.items.map(x => ['saved:' + x.id, x.genome.name]),
        '',
      )}</optgroup><optgroup label="Model library">${modelOptions()}</optgroup>`;
    $(`#parent-${slot}-select`).value = 'snapshot';
  }
}
async function updateGallery() {
  const version = ++galleryGeneration;
  const list = library.items
    .filter(
      x =>
        (!onlyFavorites || x.favorite) &&
        x.genome.name.toLowerCase().includes(search.toLowerCase()),
    )
    .slice()
    .reverse();
  $('#saved-count').textContent = library.items.length;
  const node = $('#discovery-grid');
  node.innerHTML = list.length
    ? list
        .map(
          item =>
            `<article class="discovery-card" data-discovery-id="${item.id}"><div class="discovery-image"><button data-use-discovery="${item.id}" title="Load ${esc(item.genome.name)}"><img alt="${esc(item.genome.name)} generated geometry"></button><button class="discovery-favorite" data-favorite-discovery="${item.id}" aria-label="Favorite ${esc(item.genome.name)}" aria-pressed="${item.favorite}">${item.favorite ? '★' : '☆'}</button></div><button class="discovery-name" data-use-discovery="${item.id}">${esc(item.genome.name)}</button><small>${esc(item.genome.motion.travel.medium)} · ${discoverySignature(item.genome)}</small><div class="discovery-card-actions"><button data-parent-discovery="${item.id}" data-slot="a" title="Use as parent A">A</button><button data-parent-discovery="${item.id}" data-slot="b" title="Use as parent B">B</button><button data-remove-discovery="${item.id}" aria-label="Remove ${esc(item.genome.name)}">Remove</button></div></article>`,
        )
        .join('')
    : `<div class="creator-empty">${icon('body')}<h3>${library.items.length ? 'No matches' : 'Keep your first discovery'}</h3><p>${library.items.length ? 'Change the search or Favorites filter.' : 'Randomize or load a model, then select Save discovery. Your saved copies become new parents.'}</p></div>`;
  $('#creator-storage').textContent =
    library.warning || `${library.items.length} / 48 discoveries · saved in this browser`;
  for (const item of list) {
    await new Promise(r => setTimeout(r, 0));
    if (version !== galleryGeneration) return;
    const image = node.querySelector(`[data-discovery-id="${item.id}"] img`);
    if (image)
      try {
        image.src = creatureThumbnail(item.genome);
      } catch {
        image.alt = 'Preview unavailable. The saved blueprint is retained.';
      }
  }
}
async function showBatch(results) {
  batch = results;
  $('#creator-candidates').hidden = false;
  $('#candidate-grid').innerHTML = results
    .map(
      (r, i) =>
        `<button data-candidate="${i}"><img alt="Variation ${i + 1}"><b>Variation ${i + 1}</b><small>Seed ${r.recipe.seed}</small></button>`,
    )
    .join('');
  for (let i = 0; i < results.length; i++) {
    await new Promise(r => setTimeout(r, 0));
    $(`[data-candidate="${i}"] img`).src = creatureThumbnail(results[i].genome, 170, 136);
  }
}
function requireCommitted() {
  if (session.previewBase) throw new Error('Keep or cancel the mix before starting a new roll.');
}
function mixNow() {
  clearTimeout(mixTimer);
  mixTimer = null;
  readSettings();
  const frozen = session.previewBase?.genome || session.current.genome;
  const result = mixDiscovery(
    session.sources.a,
    session.sources.b,
    {
      channels: session.settings.channels,
      locks: session.settings.locks,
      seed: session.settings.seed,
    },
    frozen,
  );
  preview.setGenome(result.genome);
  session.preview(result);
  update();
}
function scheduleMix() {
  clearTimeout(mixTimer);
  mixTimer = setTimeout(() => {
    try {
      mixNow();
    } catch (e) {
      toast(e.message);
    }
  }, 160);
}
async function run(task) {
  if (busy) return;
  setBusy(true);
  await new Promise(r => setTimeout(r, 25));
  try {
    await task();
  } catch (e) {
    toast(e.message);
    $('#creator-message').textContent = e.message;
  } finally {
    setBusy(false);
  }
}
function chooseFile(mode) {
  importMode = mode;
  $('#creator-file').value = '';
  $('#creator-file').click();
}
async function perform(action) {
  switch (action) {
    case 'random':
    case 'variation':
      requireCommitted();
      {
        const settings = readSettings(true);
        adopt(generateDiscovery(session.current.genome, { ...settings, kind: action }));
        toast(
          action === 'random'
            ? 'New creature. Save it to keep this branch.'
            : 'Variation created. The previous creature is one Undo away.',
        );
      }
      break;
    case 'batch':
      requireCommitted();
      {
        const settings = readSettings(true),
          source = clone(session.current.genome);
        await showBatch(generateBatch(source, settings));
        toast('Six variations from one fixed parent. Select one to continue.');
      }
      break;
    case 'clear-batch':
      batch = [];
      $('#creator-candidates').hidden = true;
      break;
    case 'load-preset':
      requireCommitted();
      readSettings();
      adopt(preset($('#creator-preset').value, session.settings.seed));
      break;
    case 'save':
      if (mixTimer) mixNow();
      session.apply();
      {
        const saved = library.save(session.current);
        await updateGallery();
        updateParents();
        update();
        toast(
          saved.duplicate
            ? 'This exact discovery is already saved.'
            : saved.persistent
              ? 'Discovery saved. Use its A or B button to mix from it.'
              : 'Discovery kept for this session. Export a collection backup.',
        );
      }
      break;
    case 'undo':
      clearTimeout(mixTimer);
      mixTimer = null;
      session.undo();
      preview.setGenome(session.current.genome);
      update();
      break;
    case 'redo':
      clearTimeout(mixTimer);
      mixTimer = null;
      session.redo();
      preview.setGenome(session.current.genome);
      update();
      break;
    case 'mix':
      mixNow();
      break;
    case 'apply':
      if (mixTimer) mixNow();
      session.apply();
      update();
      toast('Mix kept. Undo restores the parent.');
      break;
    case 'cancel':
      resetPending();
      preview.setGenome(session.current.genome);
      update();
      break;
    case 'swap':
      resetPending();
      [session.sources.a, session.sources.b] = [session.sources.b, session.sources.a];
      preview.setGenome(session.current.genome);
      updateParents();
      update();
      break;
    case 'play':
      preview.playing = !preview.playing;
      $('#creator-play').innerHTML =
        icon('play') + (preview.playing ? ' Pause motion' : ' Play motion');
      $('#creator-play').setAttribute('aria-pressed', String(preview.playing));
      break;
    case 'turntable':
      preview.turntable = !preview.turntable;
      $('[data-create="turntable"]').setAttribute('aria-pressed', String(preview.turntable));
      break;
    case 'fit':
      preview.fit();
      break;
    case 'retry-gpu':
      if (backend !== 'webgl2') await preview.enableGPU();
      break;
    case 'favorites':
      onlyFavorites = !onlyFavorites;
      $('[data-create="favorites"]').setAttribute('aria-pressed', String(onlyFavorites));
      await updateGallery();
      break;
    case 'export-collection':
      localDownload(JSON.stringify(library.export(), null, 2), 'Morph-Lab-discoveries.json');
      break;
    case 'import-collection':
      chooseFile('collection');
      break;
    case 'import-blueprint':
      chooseFile('blueprint');
      break;
    case 'export-blueprint':
      localDownload(JSON.stringify(session.current.genome, null, 2), filename() + '.morph.json');
      break;
    case 'export-recipe':
      if (!session.current.recipe) throw new Error('Make a roll or mix before exporting a recipe.');
      localDownload(
        JSON.stringify(session.current.recipe, null, 2),
        filename() + '.discovery.json',
      );
      break;
    case 'export-glb':
      openDeliveryPanel(session.current.genome, { pose: 'motion-cycle', phase: preview.phase });
      break;
    case 'inspect':
      if (mixTimer) mixNow();
      session.apply();
      enterFoundationReview(session.current.genome);
      break;
    case 'workshop':
      if (mixTimer) mixNow();
      session.apply();
      enterWorkshop(session.current.genome);
      break;
    case 'checks':
      openDiagnostics();
      break;
  }
}
function filename() {
  return session.current.genome.name.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60) || 'discovery';
}
app.addEventListener('click', event => {
  const el = event.target.closest('button');
  if (!el || el.disabled) return;
  const action = el.dataset.create;
  if (action === 'import-collection' || action === 'import-blueprint') {
    chooseFile(action === 'import-collection' ? 'collection' : 'blueprint');
    return;
  }
  if (action) {
    run(() => perform(action));
    return;
  }
  if (el.dataset.shading) {
    preview.shading = el.dataset.shading;
    preview.dirty = true;
    for (const b of app.querySelectorAll('[data-shading]'))
      b.setAttribute('aria-pressed', String(b === el));
    return;
  }
  if (el.dataset.lockTrait) {
    const key = el.dataset.lockTrait;
    session.settings.locks[key] = !session.settings.locks[key];
    update();
    if (session.previewBase) scheduleMix();
    return;
  }
  if (el.dataset.rollTrait) {
    run(() => {
      requireCommitted();
      adopt(
        generateDiscovery(session.current.genome, {
          ...readSettings(true),
          kind: 'trait',
          trait: el.dataset.rollTrait,
        }),
      );
    });
    return;
  }
  if (el.dataset.candidate !== undefined) {
    run(() => {
      requireCommitted();
      adopt(batch[Number(el.dataset.candidate)]);
      toast('Variation selected. Save it or branch again.');
    });
    return;
  }
  if (el.dataset.captureParent) {
    run(() => {
      if (mixTimer) mixNow();
      session.apply();
      session.parent(el.dataset.captureParent, session.current.genome);
      updateParents();
      update();
      toast('Current creature captured as parent ' + el.dataset.captureParent.toUpperCase() + '.');
    });
    return;
  }
  if (el.dataset.useDiscovery) {
    run(() => {
      resetPending();
      adopt(library.get(el.dataset.useDiscovery));
      toast('Saved discovery loaded. The saved copy will not change.');
    });
    return;
  }
  if (el.dataset.parentDiscovery) {
    run(() => {
      resetPending();
      session.parent(el.dataset.slot, library.get(el.dataset.parentDiscovery).genome);
      preview.setGenome(session.current.genome);
      updateParents();
      update();
      toast('Saved discovery set as parent ' + el.dataset.slot.toUpperCase() + '.');
    });
    return;
  }
  if (el.dataset.favoriteDiscovery) {
    library.favorite(el.dataset.favoriteDiscovery);
    updateGallery();
    return;
  }
  if (el.dataset.removeDiscovery) {
    const item = library.get(el.dataset.removeDiscovery),
      { dialog, body } = toolDialog('remove-discovery', 'Remove saved discovery');
    body.innerHTML = `<p>Remove <strong>${esc(item.genome.name)}</strong> from this collection? The current creature and mixer parents will stay unchanged.</p><div class="tool-row"><button id="confirm-remove">Remove discovery</button><button id="cancel-remove">Keep it</button></div>`;
    body.querySelector('#cancel-remove').onclick = () => dialog.close();
    body.querySelector('#confirm-remove').onclick = () => {
      library.remove(item.id);
      dialog.close();
      updateGallery();
      updateParents();
    };
  }
});
app.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'creator-strength') {
    $('#creator-strength-value').textContent = Math.round(el.value * 100) + '%';
    session.settings.strength = Number(el.value);
  }
  if (el.id === 'creator-phase') {
    preview.seek(Number(el.value));
    $('#creator-play').innerHTML = icon('play') + ' Play motion';
    $('#creator-play').setAttribute('aria-pressed', 'false');
  }
  if (el.id === 'saved-search') {
    search = el.value;
    updateGallery();
  }
  if (el.id === 'creator-blend') {
    const value = Number(el.value);
    $('#creator-blend-value').textContent = Math.round(value * 100) + '%';
    for (const key of Object.keys(TRAITS))
      if (!session.settings.locks[key]) {
        session.settings.channels[key] = value;
        $(`[data-blend-channel="${key}"]`).value = value;
        $(`[data-channel-output="${key}"]`).textContent = Math.round(value * 100) + '%';
      }
    scheduleMix();
  }
  if (el.dataset.blendChannel) {
    const key = el.dataset.blendChannel;
    session.settings.channels[key] = Number(el.value);
    $(`[data-channel-output="${key}"]`).textContent = Math.round(el.value * 100) + '%';
    scheduleMix();
  }
});
app.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'creature-name') {
    try {
      session.rename(el.value.trim());
      update();
    } catch (error) {
      toast(error.message);
      el.value = session.current.genome.name;
    }
    return;
  }
  if (el.dataset.parentSelect) {
    run(() => {
      resetPending();
      const value = el.value;
      if (value === 'snapshot') return;
      const g = value.startsWith('saved:')
        ? library.get(value.slice(6)).genome
        : preset(value, session.settings.seed);
      session.parent(el.dataset.parentSelect, g);
      preview.setGenome(session.current.genome);
      updateParents();
      update();
    });
    return;
  }
  if (['creator-seed', 'creator-new-seed', 'creator-scope'].includes(el.id))
    try {
      readSettings();
      persistSession();
    } catch (error) {
      toast(error.message);
    }
});
$('#creator-file').addEventListener('change', () =>
  run(async () => {
    const file = $('#creator-file').files[0];
    if (!file) return;
    if (file.size > MAX_COLLECTION_BYTES) throw new Error('File exceeds the 8 MB limit.');
    const text = await file.text();
    if (importMode === 'collection') {
      const count = library.merge(text);
      await updateGallery();
      updateParents();
      toast(count + ' discoveries imported. Existing discoveries were kept.');
    } else {
      const raw = JSON.parse(text),
        result =
          raw.format === 'morph-lab-discovery-recipe'
            ? replayRecipe(raw)
            : { genome: parseGenome(text) };
      resetPending();
      adopt(result);
      toast('Imported creature. Save it to keep it in your collection.');
    }
  }),
);
document.addEventListener('keydown', e => {
  if (
    e.target.closest('input,textarea,select') ||
    document.querySelector('dialog[open]') ||
    e.altKey
  )
    return;
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
    e.preventDefault();
    run(() => perform(e.shiftKey ? 'redo' : 'undo'));
  }
});
preview.setGenome(session.current.genome);
update();
updateParents();
updateGallery();
for (const [key, value] of Object.entries(session.settings.channels)) {
  $(`[data-blend-channel="${key}"]`).value = value;
  $(`[data-channel-output="${key}"]`).textContent = Math.round(value * 100) + '%';
}
Object.defineProperty(window, 'monsterCreator', {
  value: Object.freeze({
    ready: true,
    snapshot: () => ({ session: session.export(), collection: library.export() }),
    status: () => ({
      backend: preview.backend,
      pixels: preview.lastPixels,
      counts: clone(preview.counts),
      saved: library.items.length,
      persistent: library.persistent,
      preview: !!session.previewBase,
      history: { undo: session.past.length, redo: session.future.length },
      warnings: library.warning,
    }),
    versions: () => ({ application: APP_VERSION, blueprint: 6 }),
  }),
});
window.addEventListener(
  'pagehide',
  () => {
    preview.dispose();
    persistSession();
  },
  { once: true },
);
// Start in the local geometry view, then use WebGL2 when the real engine is available.
setTimeout(() => preview.enableGPU(), 50);

import { CLASSIC_PARTS } from '../core/classic-catalog.js';
import { openDeliveryPanel } from '../export/panel.js';
import { openDiagnostics } from '../diagnostics/panel.js';
import { libraryCoverage } from '../core/library-coverage.js';
import { HUMANOID_ACTIONS } from '../core/humanoid-motion.js';
import { enterCreator, enterWorkshop, takeReviewTransfer } from './transfer.js';
import { workspaceURL } from '../core/workspace-route.js';
import {
  FoundationCompiler,
  FOUNDATIONS,
  foundationBlueprint,
  deriveFoundation,
  SHAPE_PROFILES,
  REVIEW_POSES,
} from './foundation.js';
import { ReviewSession, parseReviewSession, REVIEW_ITEMS } from './session.js';
import { rasterize, drawRender, fitFrame, VIEWS, SHADINGS, differenceImage } from './raster.js';
import { auditSnapshot, TARGETS, fingerprint } from './audit.js';
import { preset, validateGenome, parseGenome } from '../core/genome.js';
import { PRESET_MODELS } from '../core/presets.js';
import { PROPORTIONS, syncHumanoidBody } from '../core/humanoid.js';
import { parseOBJ, exportOBJ } from './obj.js';
import { escapeHTML as esc } from '../ui/icons.js';
const $ = s => document.querySelector(s),
  options = (list, value) =>
    list
      .map(
        ([id, label]) =>
          `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(label)}</option>`,
      )
      .join('');
function download(content, name, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const coverage = libraryCoverage();
const completedModels = new Set(
  coverage.models
    .filter(m => m.partFamilies.some(t => Object.hasOwn(CLASSIC_PARTS, t)))
    .map(m => m.id),
);
const name = g => (g?.name || 'foundation').replace(/[^a-z0-9_-]+/gi, '-');
let session = new ReviewSession(),
  currentCompiler,
  baseCompiler,
  current,
  baseline,
  audit,
  reference = null,
  referenceMeta = null,
  objReference = null,
  comparison = null,
  renderSerial = 0,
  lastFrames = [],
  suite = null,
  busy = false;
let refSettings = { opacity: 0.5, scale: 1, x: 0, y: 0 };
try {
  const transfer = takeReviewTransfer();
  if (transfer.review) session = parseReviewSession(JSON.stringify(transfer.review));
  if (transfer.genome) {
    const genome = parseGenome(JSON.stringify(transfer.genome));
    if (!transfer.review) session = new ReviewSession(genome);
    else if (fingerprint(genome) !== fingerprint(session.candidate)) session.setCandidate(genome);
  }
} catch (error) {
  console.warn('Review transfer could not be restored:', error.message);
}
function start() {
  $('#app').classList.add('review-root');
  $('#app').innerHTML = `<div class="review-app">
    <header class="review-header"><a class="review-brand" href="#" data-review="home"><span class="review-logo">m</span><div><b>morph<span>lab</span></b><small>DISCOVERY STUDIO / 12</small></div></a><nav><a href="?workshop=1" id="review-workshop-link" data-review="workshop">Workshop</a><span class="active">Inspect</span><span class="review-offline">Local geometry renderer</span></nav><div class="review-header-actions"><button data-review="system-checks">System checks</button><button data-review="delivery">Export asset</button><button class="review-primary" data-review="sheet">Export review sheet ↗</button></div></header>
    <div class="review-layout"><aside class="review-left"><span class="review-eyebrow">01 / SOURCE & VARIATION</span><h1>Build from a<br>strong foundation.</h1><p class="review-muted">Check form first. Test deformation. Keep a traceable source.</p>
      <label>Foundation<select id="foundation-select">${options(
        FOUNDATIONS.map(x => [x.id, x.label]),
        'balanced',
      )}</select></label>
      <details><summary>All ${PRESET_MODELS.length} blueprint sources</summary><label>Content filter<select id="review-collection"><option value="all">All models</option><option value="classic">Completed: original models</option><option value="field"> Field &amp; Settlement</option><option value="bloom">Carapace &amp; Bloom</option><option value="frontier">Strange Forms</option><option value="water">Water</option><option value="air">Air</option></select></label><label>Model<select id="model-select">${options(
        PRESET_MODELS.map(x => [x.id, x.label]),
        'wayfarer',
      )}</select></label><p class="review-hint">Shared part factories are shown on creatures and humanoid joints. All 73 part families are supported. Inactive genes are retained in the source. Nothing is removed from the blueprint. Motion-cycle samples the current humanoid action without terrain contact.</p></details>
      <div class="review-button-row"><button data-review="import-blueprint">Import blueprint</button><button data-review="export-blueprint">Export blueprint</button></div><button class="review-wide" data-review="workshop">Use candidate in workshop</button>
      <section><div class="review-section-heading"><h2>Derivative recipe</h2><button class="review-text-button" data-review="restore-source">Reset</button></div><label>Shape profile<select id="shape-profile">${options(
        Object.entries(SHAPE_PROFILES).map(([id, p]) => [id, p.label]),
        'unchanged',
      )}</select></label><label>Profile blend <output id="profile-value">1.00</output><input id="profile-amount" aria-label="Profile blend" type="range" min="0" max="1" step=".01" value="1"></label><label id="body-style-label">Body construction<select id="body-style"><option value="classic">Classic / soft blend</option><option value="defined">Defined / neck support</option></select></label><div id="proportion-fields"></div><p class="review-hint">Profiles always use the source snapshot. They do not accumulate changes.</p></section>
      <section><h2>Fixed comparison</h2><p class="review-hint" id="baseline-name"></p><button class="review-wide" data-review="pin">Pin candidate as baseline</button><div class="review-button-row"><button data-review="fit">Fit both once</button><button data-review="import-obj">Load OBJ reference</button></div><button class="review-text-button" data-review="clear-obj" id="clear-obj" hidden>Remove OBJ reference</button><p class="review-hint">One orthographic scale for both subjects. OBJ files are static references, not new rigs.</p></section>
      <section id="library-coverage"><h2>Library coverage</h2><p class="review-hint">${coverage.counts.completeReviewModels} of ${coverage.counts.models} models have no omitted genes in this Inspector. ${coverage.counts.sharedPartFamilies} of ${coverage.counts.partFamilies} part families use shared geometry.</p><details><summary>Coverage limits</summary><p class="review-hint">${coverage.unsupportedFamilies.length ? coverage.unsupportedFamilies.map(esc).join(', ') : 'No unsupported families remain.'} Complete geometry does not mean a seamless or intersection-free model. No GPU or physics approval is implied.</p></details><button class="review-wide" data-review="library-audit">Export library coverage</button></section><section><h2>Portable outputs</h2><button class="review-wide review-primary" data-review="delivery">Build GLB asset package</button><p class="review-hint">Standard models and baked motion. Exports block missing attachment geometry. Source, audit, and file hashes stay in the package.</p><div class="review-output-grid"><button data-review="save-session">Save session</button><button data-review="report">Audit JSON</button><button data-review="obj">Posed OBJ</button><button data-review="load-session">Load session</button><button data-review="pose-sheet">Pose sheet</button><button data-review="compare-sheet">A/B sheet</button></div><button class="review-wide" data-review="sweep">Run proportion spot checks</button><p class="review-hint" id="suite-status">Sweeps check both ends of each humanoid proportion range. They do not approve the model.</p></section>
    </aside>
    <main class="review-stage"><div class="review-stage-title"><div><span class="review-eyebrow">REPRODUCIBLE MODEL REVIEW</span><h2 id="review-name"></h2><p id="review-source-id"></p></div><span class="review-badge">CPU / GEOMETRY</span></div>
      <div class="review-controls"><label>Display<select id="review-shading">${options(
        SHADINGS.map(x => [
          x,
          x === 'material'
            ? 'Flat pigment (not texture)'
            : x === 'pattern'
              ? 'Procedural pigment (CPU sample)'
              : x === 'stretch'
                ? 'Edge distortion'
                : x,
        ]),
        'clay',
      )}</select></label><label>Pose<select id="review-pose">${options(
        REVIEW_POSES.map(x => [x, x]),
        'bind',
      )}</select></label><label>Pose phase<input id="review-phase" aria-label="Pose phase" type="range" min="0" max="1" step=".01" value=".5"></label><label>Camera<select id="review-view">${options(
        Object.entries(VIEWS).map(([k, v]) => [k, v.label]),
        'front',
      )}</select></label></div>
      <div id="review-human-controls" class="review-human-controls" hidden><label>Humanoid action<select id="review-human-action">${options(
        Object.entries(HUMANOID_ACTIONS).map(([id, a]) => [id, a.label]),
        'none',
      )}</select></label><label>Action mask<select id="review-human-mask">${options(
        [
          ['auto', 'Action default'],
          ['upper', 'Upper body'],
          ['full', 'Full body'],
        ],
        'auto',
      )}</select></label><p>Action changes edit the candidate. Motion-cycle covers one full action. This is not terrain IK.</p></div><div class="review-stage-bar"><div class="review-layout-tabs"><button data-layout="quad" class="active">Four views</button><button data-layout="compare">A / B + difference</button><button data-layout="reference">Image reference</button></div><label><input id="review-bones" type="checkbox"> Bones</label><label><input id="review-labels" type="checkbox"> Sockets</label><label><input id="review-garment" type="checkbox" checked> Garment</label><label><input id="review-details" type="checkbox" checked> Details</label></div>
      <div id="review-views" class="review-views quad"></div>
      <div id="reference-controls" hidden><div class="review-reference-controls"><button data-review="image">Load local image</button><button data-review="clear-image">Clear</button><label>Opacity<input data-reference="opacity" aria-label="Reference opacity" type="range" min="0" max="1" step=".01" value=".5"></label><label>Scale<input data-reference="scale" aria-label="Reference scale" type="range" min=".2" max="3" step=".01" value="1"></label><label>Shift X<input data-reference="x" aria-label="Reference shift X" type="range" min="-1" max="1" step=".01" value="0"></label><label>Shift Y<input data-reference="y" aria-label="Reference shift Y" type="range" min="-1" max="1" step=".01" value="0"></label></div><p class="review-hint" id="image-note">PNG, JPEG or WebP. An AI concept is a design reference, not evidence of the generated mesh. Align one matching view manually.</p></div>
      <div class="review-caption"><p id="coverage-note"></p><p id="comparison-note"></p><p id="clipping-note"></p></div>
      <section class="review-method"><div><span class="review-eyebrow">WHAT THIS VIEW PROVES</span><p>These are generated mesh triangles, not AI replacement images. Clay, normals and edge distortion expose the underlying form.</p></div><div><span class="review-eyebrow">WHAT IT DOES NOT PROVE</span><p>Shared parts and body waves use the runtime geometry. CPU pigment is an approximation, not a GPU shader test. Game materials, terrain IK, and physics require the Workshop.</p></div></section>
    </main>
    <aside class="review-right"><span class="review-eyebrow">02 / TECHNICAL & VISUAL GATES</span><h2>Inspection record</h2><label>Budget target<select id="budget-target">${options(
      Object.entries(TARGETS).map(([k, v]) => [k, v.label]),
      'desktop',
    )}</select></label><div id="audit-summary"></div><div id="audit-checks"></div><section><h2>Reviewer decisions</h2><p class="review-hint">Technical checks never mark these as accepted. Blueprint or geometry-version changes reset all decisions.</p><div id="review-decisions">${Object.entries(
      REVIEW_ITEMS,
    )
      .map(
        ([key, label]) =>
          `<label>${label}<select data-decision="${key}">${options(
            [
              ['unreviewed', 'Not reviewed'],
              ['accept', 'Accept'],
              ['revise', 'Needs revision'],
            ],
            'unreviewed',
          )}</select></label>`,
      )
      .join(
        '',
      )}</div><label>Review notes<textarea id="review-notes" maxlength="5000" rows="4" placeholder="Record defects, target style, and next changes."></textarea></label><div id="approval-status" class="review-approval">Not approved</div><p id="approval-reset" class="review-hint" hidden></p></section><section><h2>Interpretation</h2><p class="review-hint">Blue in A/B = candidate only. Orange = baseline only. Gray = overlap.</p><p class="review-hint">Edge distortion shows stretch or compression relative to the bind mesh. Large values need a closer visual check.</p><p class="review-hint">Mesh count is not a measured draw-call count. Crowd and mobile budgets are draft limits.</p></section></aside></div>
    <footer class="review-footer"><span>MORPH LAB v12 / DISCOVERY STUDIO</span><span>Metres · +Y up · +Z forward</span><span>Game: Three r181 / Rapier 0.19.3 / WebGL2</span></footer><div id="review-toast" role="status" aria-live="polite"></div>
    <input id="review-file" type="file" hidden><input id="review-image" type="file" accept="image/png,image/jpeg,image/webp" hidden>
  </div>`;
  if (!window.__MORPH_EMBEDDED__)
    $('#review-workshop-link').href = workspaceURL(location.href, 'workshop');
  syncControls();
  bind();
  rebuild(!session.frame);
  Object.defineProperty(window, 'foundationReview', {
    value: {
      ready: true,
      snapshot: () => session.export(),
      audit: () => structuredClone(audit),
      renderStats: () =>
        lastFrames.map(x => ({
          view: x.view,
          coverage: x.render.mask.reduce((a, b) => a + b, 0),
          clipped: x.render.clipped,
        })),
      getGeometry: () => current,
      report: report,
      setSource: g => {
        session.setSource(g);
        syncControls();
        rebuild(true);
      },
    },
  });
}
function toast(message) {
  $('#review-toast').textContent = message;
  $('#review-toast').classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('#review-toast').classList.remove('visible'), 4500);
}
function setBusy(value) {
  busy = value;
  document
    .querySelectorAll(
      '[data-review="sweep"],[data-review="sheet"],[data-review="pose-sheet"],[data-review="compare-sheet"]',
    )
    .forEach(x => (x.disabled = value));
}
function syncControls() {
  for (const [field, id] of [
    ['pose', 'review-pose'],
    ['phase', 'review-phase'],
    ['shading', 'review-shading'],
    ['view', 'review-view'],
    ['target', 'budget-target'],
  ])
    $('#' + id).value = session.settings[field];
  for (const f of ['bones', 'labels', 'garment', 'details'])
    $('#review-' + f).checked = session.settings[f];
  for (const [key, v] of Object.entries(session.decisions)) $(`[data-decision="${key}"]`).value = v;
  $('#review-notes').value = session.notes;
  $('#shape-profile').value = 'unchanged';
  $('#profile-amount').value = 1;
}
function sourceControls() {
  const proportionsOpen = $('#proportion-fields details')?.open;
  const g = session.candidate,
    human = g.rig.family === 'humanoid';
  if (!human && !['bind', 'motion-cycle'].includes(session.settings.pose)) {
    session.settings.pose = 'bind';
    $('#review-pose').value = 'bind';
  }
  $('#review-name').textContent = g.name;
  $('#review-source-id').textContent = fingerprint(g) + ' · schema 6';
  $('#baseline-name').textContent = objReference
    ? 'External OBJ reference · ' + (objReference.label || 'static mesh')
    : 'Pinned: ' + session.baseline.name + ' · ' + fingerprint(session.baseline);
  $('#body-style-label').hidden = !human;
  $('#body-style').value = g.rig.bodyStyle || 'classic';
  $('#shape-profile').disabled = !human;
  $('#profile-amount').disabled = !human;
  $('#review-pose').disabled = false;
  $('#review-phase').disabled = false;
  for (const opt of $('#review-pose').options)
    opt.disabled = !human && !['bind', 'motion-cycle'].includes(opt.value);
  $('#review-human-controls').hidden = !human;
  $('#review-human-action').value = g.motion.humanoid.action;
  $('#review-human-mask').value = g.motion.humanoid.mask;
  $('#proportion-fields').innerHTML = human
    ? `<details><summary>11 independent proportions</summary>${Object.entries(PROPORTIONS)
        .map(
          ([key, p]) =>
            `<label>${p.label}<output>${g.rig.proportions[key].toFixed(2)}</output><input data-review-proportion="${key}" type="range" aria-label="${p.label}" min="${p.min}" max="${p.max}" step=".01" value="${g.rig.proportions[key]}"></label>`,
        )
        .join('')}</details>`
    : `<details><summary>Body node dimensions</summary>${g.nodes.map((n, j) => `<strong>${esc(n.id)}</strong>${['Width', 'Height', 'Depth'].map((label, k) => `<label>${label}<output>${n.radii[k].toFixed(2)}</output><input data-node="${j}" data-axis="${k}" type="range" min=".25" max="2.4" step=".01" value="${n.radii[k]}" aria-label="${esc(n.id + ' ' + label)}"></label>`).join('')}`).join('')}</details>`;
  if (proportionsOpen && $('#proportion-fields details'))
    $('#proportion-fields details').open = true;
  for (const [key, v] of Object.entries(session.decisions)) $(`[data-decision="${key}"]`).value = v;
  $('#approval-status').textContent = session.status;
  $('#approval-reset').hidden = !session.invalidatedReason;
  $('#approval-reset').textContent = session.invalidatedReason || '';
  $('#clear-obj').hidden = !objReference;
}
function rebuild(fit = false) {
  try {
    currentCompiler = new FoundationCompiler(session.candidate);
    baseCompiler = new FoundationCompiler(session.baseline);
    suite = null;
    $('#suite-status').textContent =
      'Sweeps check both ends of each humanoid proportion range. They do not approve the model.';
    sourceControls();
    render(fit);
  } catch (error) {
    console.error(error);
    toast(error.message);
  }
}
function displayAudit() {
  const t = audit.totals;
  $('#audit-summary').innerHTML =
    `<div class="review-stat-grid"><div><b>${Math.round(t.triangles).toLocaleString()}</b><small>triangles</small></div><div><b>${t.meshes}</b><small>meshes</small></div><div><b>${t.skinBones}</b><small>rig bones</small></div><div><b>${current.excludedGenes}</b><small>genes not drawn</small></div></div><span class="review-technical ${audit.technicalStatus}">Technical result: ${audit.technicalStatus}</span>`;
  $('#audit-checks').innerHTML = audit.checks
    .map(
      c =>
        `<div class="review-check ${c.status}"><span>${c.status === 'pass' ? '✓' : c.status === 'fail' ? '×' : '!'}</span><div>${esc(c.label)}<small>${c.key === 'body-closed' ? `${c.value.components} component(s), ${c.value.boundaryEdges} boundary edges` : typeof c.value === 'number' ? `${Number.isInteger(c.value) ? c.value.toLocaleString() : c.value.toFixed(3)}${c.limit ? ' / ' + c.limit.toLocaleString() : ''}${c.max ? ' · max ' + c.max.toFixed(2) : ''}` : ''}</small></div></div>`,
    )
    .join('');
}
function tile(title, subtitle) {
  const f = document.createElement('figure');
  f.innerHTML = `<figcaption><b>${esc(title)}</b><span>${esc(subtitle)}</span></figcaption><canvas aria-label="${esc(title + ' foundation view')}"></canvas>`;
  $('#review-views').append(f);
  return f.querySelector('canvas');
}
function render(fit = false) {
  const s = session.settings;
  current = currentCompiler.sample(s);
  baseline = objReference || baseCompiler.sample(s);
  if (fit || !session.frame) session.frame = fitFrame([current, baseline]);
  const frame = session.frame,
    view = s.view;
  comparison = null;
  lastFrames = [];
  renderSerial++;
  $('#review-views').replaceChildren();
  $('#review-views').className = 'review-views ' + s.layout;
  $('#reference-controls').hidden = s.layout !== 'reference';
  document
    .querySelectorAll('[data-layout]')
    .forEach(x => x.classList.toggle('active', x.dataset.layout === s.layout));
  const baseSettings = { width: 384, height: 384, shading: s.shading, frame };
  const draw = (snapshot, camera, title, subtitle) => {
    const canvas = tile(title, subtitle),
      result = rasterize(snapshot, { ...baseSettings, view: camera });
    drawRender(canvas, result, { snapshot, frame, view: camera, bones: s.bones, labels: s.labels });
    lastFrames.push({ view: camera, title, snapshot, render: result, canvas });
    return result;
  };
  if (s.layout === 'quad')
    for (const v of currentCompiler.tidalPlans.length
      ? ['front', 'right', 'top', 'flight']
      : ['front', 'right', 'back', 'quarter'])
      draw(
        current,
        v,
        VIEWS[v].label,
        s.pose +
          ' / ' +
          s.shading +
          (current.sampleTimeSeconds !== null
            ? ' / ' + current.sampleTimeSeconds.toFixed(2) + ' s'
            : ''),
      );
  else if (s.layout === 'compare') {
    const a = draw(current, view, 'A / Candidate', session.candidate.name),
      b = draw(
        baseline,
        view,
        'B / Baseline',
        objReference ? 'External OBJ' : session.baseline.name,
      ),
      diff = differenceImage(a, b),
      canvas = tile('Aligned silhouette difference', 'Blue: A only · Orange: B only');
    drawRender(canvas, diff);
    lastFrames.push({ view, title: 'Difference', snapshot: null, render: diff, canvas });
    comparison = diff.metric;
  } else {
    const result = draw(current, view, 'Candidate + image guide', VIEWS[view].label);
    const canvas = lastFrames[0].canvas;
    if (reference) {
      const ctx = canvas.getContext('2d'),
        scale =
          Math.min(canvas.width / reference.width, canvas.height / reference.height) *
          refSettings.scale,
        w = reference.width * scale,
        h = reference.height * scale;
      ctx.save();
      ctx.globalAlpha = refSettings.opacity;
      ctx.drawImage(
        reference,
        (canvas.width - w) / 2 + refSettings.x * canvas.width,
        (canvas.height - h) / 2 + refSettings.y * canvas.height,
        w,
        h,
      );
      ctx.restore();
    }
    const original = tile('Reference image', referenceMeta?.name || 'No image loaded'),
      ctx = original.getContext('2d');
    original.width = 384;
    original.height = 384;
    ctx.fillStyle = '#e6eae8';
    ctx.fillRect(0, 0, 384, 384);
    if (reference) {
      const scale = Math.min(384 / reference.width, 384 / reference.height),
        w = reference.width * scale,
        h = reference.height * scale;
      ctx.drawImage(reference, (384 - w) / 2, (384 - h) / 2, w, h);
    } else {
      ctx.fillStyle = '#657777';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Load one matching reference view', 192, 184);
      ctx.fillText('PNG / JPEG / WebP', 192, 209);
    }
  }
  audit = auditSnapshot(current, s.target);
  displayAudit();
  $('#coverage-note').textContent =
    current.coverage +
    (current.inactiveGenes?.length
      ? ' ' + current.inactiveGenes.length + ' inactive gene(s) retained in source; see Audit JSON.'
      : '');
  $('#comparison-note').textContent = comparison
    ? `Silhouette overlap: ${(comparison.intersectionOverUnion * 100).toFixed(1)}%. ${comparison.note} Shared scale: ${frame.span.toFixed(3)} m.`
    : `Locked orthographic frame: ${frame.span.toFixed(3)} m. ${s.shading === 'material' ? 'Flat pigment is not a GPU texture preview.' : 'Use Fit both once after large shape or pose changes.'}`;
  const clipped = lastFrames.some(x => x.render.clipped);
  $('#clipping-note').textContent = clipped
    ? 'Frame warning: geometry touches an image edge. Refit both before judging overlap.'
    : '';
  $('#approval-status').textContent = session.status;
  $('#approval-reset').hidden = !session.invalidatedReason;
  $('#approval-reset').textContent = session.invalidatedReason || '';
  $('#review-source-id').textContent = fingerprint(session.candidate) + ' · schema 6';
}
function report() {
  return {
    format: 'morph-lab-review-report',
    version: 1,
    appVersion: '12.0.0',
    createdAt: new Date().toISOString(),
    enginePins: { three: '0.181.0', rapier: '0.19.3', gameRenderer: 'WebGL2' },
    session: session.export(),
    audit: structuredClone(audit),
    comparison,
    frameClipped: lastFrames.some(x => x.render.clipped),
    reference: referenceMeta ? { ...referenceMeta, alignment: { ...refSettings } } : null,
    externalOBJ: objReference
      ? {
          name: objReference.label,
          bounds: objReference.bounds,
          note: 'Reload external data separately. Reference not rigged or deformed.',
        }
      : null,
    proportionSweep: suite,
    gpuVerified: false,
    physicsVerified: false,
  };
}
async function exportSheet(kind = 'views') {
  if (busy) return;
  setBusy(true);
  await new Promise(r => setTimeout(r, 20));
  try {
    const entries = [],
      s = session.settings;
    if (kind === 'poses' && s.pose === 'motion-cycle') {
      for (let i = 0; i < 8; i++) {
        const snapshot = currentCompiler.sample({ ...s, pose: 'motion-cycle', phase: i / 8 });
        entries.push({
          snapshot,
          view: currentCompiler.human ? 'quarter' : 'flight',
          title: snapshot.sampleTimeSeconds.toFixed(2) + ' seconds',
        });
      }
    } else if (kind === 'poses' && currentCompiler.human) {
      for (const pose of ['bind', 't-pose', 'reach', 'twist', 'crouch', 'stride', 'wave', 'sit'])
        entries.push({
          snapshot: currentCompiler.sample({
            ...s,
            pose,
            phase: pose === 'stride' ? 0.25 : pose === 'sit' ? 1 : 0.7,
          }),
          view: 'quarter',
          title: pose,
        });
    } else if (kind === 'poses') {
      for (let i = 0; i < 8; i++)
        entries.push({
          snapshot: currentCompiler.sample({ ...s, pose: 'motion-cycle', phase: i / 8 }),
          view: 'flight',
          title: (i / 4).toFixed(2) + ' seconds',
        });
    } else
      for (const v of currentCompiler.tidalPlans.length
        ? ['front', 'right', 'top', 'flight']
        : ['front', 'right', 'back', 'quarter'])
        entries.push({ snapshot: current, view: v, title: VIEWS[v].label });
    const frame = kind === 'poses' ? fitFrame(entries.map(e => e.snapshot)) : session.frame,
      columns = kind === 'poses' ? 4 : 2,
      cell = 512,
      rows = Math.ceil(entries.length / columns),
      sheet = document.createElement('canvas');
    sheet.width = columns * cell;
    sheet.height = rows * (cell + 42) + 150;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#13292f';
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.fillStyle = '#e8efeb';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('MORPH LAB / ' + (kind === 'poses' ? 'POSE REVIEW' : 'FOUNDATION REVIEW'), 24, 40);
    ctx.font = '15px sans-serif';
    ctx.fillText(
      session.candidate.name + '  /  ' + fingerprint(session.candidate) + '  /  ' + s.shading,
      24,
      68,
    );
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i],
        x = (i % columns) * cell,
        y = 96 + Math.floor(i / columns) * (cell + 42),
        rendered = rasterize(e.snapshot, {
          width: cell,
          height: cell,
          frame,
          view: e.view,
          shading: s.shading,
        }),
        tile = document.createElement('canvas');
      drawRender(tile, rendered, {
        snapshot: e.snapshot,
        frame,
        view: e.view,
        bones: s.bones,
        labels: s.labels,
      });
      ctx.drawImage(tile, x, y);
      ctx.fillStyle = '#e8efeb';
      ctx.font = '15px sans-serif';
      ctx.fillText(e.title + ' / ' + e.snapshot.pose, x + 16, y + cell + 27);
      await new Promise(r => setTimeout(r, 0));
    }
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#b9ccc7';
    ctx.fillText(
      'CPU geometry · see audit coverage · no GPU material or physics verification · shared frame ' +
        frame.span.toFixed(3) +
        ' m',
      24,
      sheet.height - 20,
    );
    await new Promise(resolve =>
      sheet.toBlob(blob => {
        if (blob) download(blob, name(session.candidate) + '-' + kind + '.png', 'image/png');
        resolve();
      }),
    );
    toast('Review sheet exported. Export Audit JSON to keep the source and checks.');
  } finally {
    setBusy(false);
  }
}
async function exportComparison() {
  if (busy) return;
  setBusy(true);
  await new Promise(r => setTimeout(r, 20));
  try {
    const cell = 512,
      views = ['front', 'quarter'],
      sheet = document.createElement('canvas');
    sheet.width = cell * 3;
    sheet.height = 2 * (cell + 40) + 146;
    const ctx = sheet.getContext('2d'),
      frame = session.frame,
      s = session.settings;
    ctx.fillStyle = '#13292f';
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.fillStyle = '#e8efeb';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('MORPH LAB / LOCKED-FRAME COMPARISON', 24, 40);
    ctx.font = '15px sans-serif';
    ctx.fillText(
      'A: ' +
        (session.candidate.rig.bodyStyle || session.candidate.rig.family) +
        ' / ' +
        fingerprint(session.candidate) +
        '    B: ' +
        (objReference
          ? objReference.label
          : (session.baseline.rig.bodyStyle || session.baseline.rig.family) +
            ' / ' +
            fingerprint(session.baseline)),
      24,
      68,
    );
    for (let row = 0; row < views.length; row++) {
      const view = views[row],
        opts = { width: cell, height: cell, view, frame, shading: s.shading },
        a = rasterize(current, opts),
        b = rasterize(baseline, opts),
        d = differenceImage(a, b);
      const tiles = [
        [a, current, 'A / ' + (session.candidate.rig.bodyStyle || 'Candidate')],
        [
          b,
          baseline,
          'B / ' + (objReference ? 'Static OBJ' : session.baseline.rig.bodyStyle || 'Baseline'),
        ],
        [
          d,
          null,
          'Silhouette overlap ' +
            (d.metric.intersectionOverUnion * 100).toFixed(1) +
            '% / not a quality score',
        ],
      ];
      for (let col = 0; col < tiles.length; col++) {
        const [result, snapshot, title] = tiles[col],
          tile = document.createElement('canvas');
        drawRender(tile, result, { snapshot, frame, view, bones: s.bones, labels: s.labels });
        const x = col * cell,
          y = 96 + row * (cell + 40);
        ctx.drawImage(tile, x, y);
        ctx.fillStyle = '#e8efeb';
        ctx.font = '14px sans-serif';
        ctx.fillText(title + ' / ' + view, x + 14, y + cell + 26);
      }
      await new Promise(r => setTimeout(r, 0));
    }
    ctx.fillStyle = '#b9ccc7';
    ctx.font = '13px sans-serif';
    ctx.fillText(
      'CPU foundation geometry / ' +
        s.pose +
        ' / ' +
        s.shading +
        (current.sampleTimeSeconds !== null
          ? ' / ' + current.sampleTimeSeconds.toFixed(2) + ' s'
          : '') +
        ' / one ' +
        frame.span.toFixed(3) +
        ' m frame / coverage stored in audit / no GPU material verification',
      24,
      sheet.height - 18,
    );
    await new Promise(resolve =>
      sheet.toBlob(blob => {
        if (blob) download(blob, name(session.candidate) + '-comparison.png', 'image/png');
        resolve();
      }),
    );
    toast('A/B sheet exported. The source models and frame are stored in Audit JSON.');
  } finally {
    setBusy(false);
  }
}
async function sweep() {
  if (busy) return;
  if (!currentCompiler.human) {
    toast('The proportion sweep requires a humanoid source.');
    return;
  }
  setBusy(true);
  const source = validateGenome(session.candidate),
    records = [];
  try {
    for (const [key, p] of Object.entries(PROPORTIONS))
      for (const edge of ['min', 'max']) {
        const g = validateGenome(source);
        g.rig.proportions[key] = p[edge];
        syncHumanoidBody(g);
        const compiled = new FoundationCompiler(g),
          snap = compiled.sample(session.settings),
          a = auditSnapshot(snap, session.settings.target);
        records.push({
          parameter: key,
          edge,
          value: p[edge],
          blueprintFingerprint: a.blueprintFingerprint,
          technicalStatus: a.technicalStatus,
          totals: a.totals,
          bounds: a.bounds,
          checks: a.checks,
        });
        $('#suite-status').textContent =
          `Checked ${records.length} / 22 range ends. Source unchanged.`;
        await new Promise(r => setTimeout(r, 0));
      }
    suite = {
      source: fingerprint(source),
      pose: session.settings.pose,
      phase: session.settings.phase,
      settings: { ...session.settings },
      records,
      note: 'One parameter at a time, not the full joint parameter space. Visual inspection still required.',
    };
    download(JSON.stringify(suite, null, 2), name(source) + '-proportion-sweep.json');
    toast('22 range-end checks exported. The source was not changed.');
  } catch (error) {
    toast(error.message);
  } finally {
    setBusy(false);
  }
}
let importKind = 'blueprint';
function selectFile(kind, accept) {
  toast('Select a local file.');
  importKind = kind;
  $('#review-file').accept = accept;
  $('#review-file').value = '';
  $('#review-file').click();
}
async function action(key) {
  switch (key) {
    case 'delivery':
      openDeliveryPanel(session.candidate, session.settings);
      break;
    case 'system-checks':
      openDiagnostics();
      break;
    case 'home':
      enterCreator(session.candidate, session.export());
      break;
    case 'workshop':
      enterWorkshop(session.candidate, session.export());
      break;
    case 'pin':
      session.pin();
      objReference = null;
      baseCompiler = new FoundationCompiler(session.baseline);
      sourceControls();
      render();
      toast('Candidate pinned. Camera scale was kept.');
      break;
    case 'fit':
      render(true);
      break;
    case 'restore-source':
      session.setCandidate(session.source);
      session.lineage = { parent: fingerprint(session.source), profile: 'unchanged', amount: 0 };
      syncControls();
      rebuild();
      break;
    case 'import-blueprint':
      selectFile('blueprint', '.json,application/json');
      break;
    case 'load-session':
      selectFile('session', '.json,application/json');
      break;
    case 'import-obj':
      selectFile('obj', '.obj,text/plain');
      break;
    case 'clear-obj':
      objReference = null;
      sourceControls();
      render(true);
      break;
    case 'export-blueprint':
      download(JSON.stringify(session.candidate, null, 2), name(session.candidate) + '.morph.json');
      break;
    case 'save-session':
      download(JSON.stringify(session.export(), null, 2), name(session.candidate) + '.review.json');
      break;
    case 'library-audit':
      download(JSON.stringify(coverage, null, 2), 'Morph-Lab-v11-library-coverage.json');
      break;
    case 'report':
      download(JSON.stringify(report(), null, 2), name(session.candidate) + '.review-report.json');
      break;
    case 'obj':
      download(
        exportOBJ(current),
        name(session.candidate) + '-' + session.settings.pose + '.obj',
        'text/plain',
      );
      break;
    case 'sheet':
      await exportSheet();
      break;
    case 'pose-sheet':
      await exportSheet('poses');
      break;
    case 'compare-sheet':
      await exportComparison();
      break;
    case 'sweep':
      await sweep();
      break;
    case 'image':
      $('#review-image').value = '';
      $('#review-image').click();
      break;
    case 'clear-image':
      reference?.close?.();
      reference = null;
      referenceMeta = null;
      $('#image-note').textContent = 'No reference loaded. Align one matching view manually.';
      render();
      break;
  }
}
function bind() {
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-review]');
    if (button) {
      e.preventDefault();
      action(button.dataset.review).catch(error => toast(error.message));
    }
    const layout = e.target.closest('[data-layout]');
    if (layout) {
      session.settings.layout = layout.dataset.layout;
      render();
    }
  });
  document.addEventListener('change', async e => {
    const el = e.target;
    try {
      if (el.id === 'review-collection') {
        const old = $('#model-select').value;
        const list = PRESET_MODELS.filter(
          m =>
            el.value === 'all' ||
            (el.value === 'classic'
              ? completedModels.has(m.id)
              : ['frontier', 'bloom', 'field'].includes(el.value)
                ? m.collection === el.value
                : m.medium === el.value),
        );
        $('#model-select').innerHTML = options(
          list.map(m => [m.id, m.label]),
          old,
        );
        if (!list.some(m => m.id === old)) $('#model-select').selectedIndex = -1;
        return;
      }
      if (el.id === 'foundation-select') {
        session.setSource(foundationBlueprint(el.value));
        syncControls();
        rebuild(true);
      } else if (el.id === 'model-select') {
        session.setSource(preset(el.value));
        syncControls();
        rebuild(true);
      } else if (el.id === 'shape-profile' || el.id === 'profile-amount') {
        const profile = $('#shape-profile').value,
          amount = Number($('#profile-amount').value);
        session.setCandidate(deriveFoundation(session.source, profile, amount));
        session.lineage = { parent: fingerprint(session.source), profile, amount };
        $('#profile-value').textContent = amount.toFixed(2);
        rebuild();
      } else if (['review-human-action', 'review-human-mask'].includes(el.id)) {
        const g = validateGenome(session.candidate);
        if (el.id === 'review-human-action') {
          g.motion.humanoid.action = el.value;
          g.motion.humanoid.repeat = HUMANOID_ACTIONS[el.value].loop;
        } else g.motion.humanoid.mask = el.value;
        session.setCandidate(g);
        session.settings.pose = 'motion-cycle';
        $('#review-pose').value = 'motion-cycle';
        session.lineage.profile = 'custom action';
        rebuild();
      } else if (el.id === 'body-style') {
        const g = validateGenome(session.candidate);
        g.rig.bodyStyle = el.value;
        syncHumanoidBody(g);
        session.setCandidate(g);
        session.lineage.profile = 'custom body construction';
        rebuild();
      } else if (el.dataset.reviewProportion) {
        const g = validateGenome(session.candidate);
        g.rig.proportions[el.dataset.reviewProportion] = Number(el.value);
        syncHumanoidBody(g);
        session.setCandidate(g);
        session.lineage.profile = 'custom';
        rebuild();
      } else if (el.dataset.node !== undefined) {
        const g = validateGenome(session.candidate);
        g.nodes[Number(el.dataset.node)].radii[Number(el.dataset.axis)] = Number(el.value);
        session.setCandidate(g);
        session.lineage.profile = 'custom';
        rebuild();
      } else if (el.dataset.decision) {
        session.approve(el.dataset.decision, el.value);
        $('#approval-status').textContent = session.status;
        $('#approval-reset').hidden = !session.invalidatedReason;
        $('#approval-reset').textContent = session.invalidatedReason || '';
      } else if (el.id === 'review-file') {
        const f = el.files[0];
        if (!f) return;
        if (f.size > (importKind === 'obj' ? 8000000 : 1500000))
          throw new Error('File exceeds the import limit.');
        const text = await f.text();
        if (importKind === 'obj') {
          objReference = parseOBJ(text);
          objReference.label = f.name;
          session.settings.layout = 'compare';
          sourceControls();
          render(true);
        } else if (importKind === 'session') {
          session = parseReviewSession(text);
          objReference = null;
          reference?.close?.();
          reference = null;
          referenceMeta = null;
          refSettings = { opacity: 0.5, scale: 1, x: 0, y: 0 };
          syncControls();
          rebuild();
        } else {
          session.setSource(parseGenome(text));
          syncControls();
          rebuild(true);
        }
        toast('Local file loaded.');
      } else if (el.id === 'review-image') {
        const file = el.files[0];
        if (!file) return;
        if (file.size > 8000000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
          throw new Error('Use a PNG, JPEG or WebP image under 8 MB.');
        const image = await createImageBitmap(file);
        if (image.width > 8192 || image.height > 8192) {
          image.close();
          throw new Error('Image dimensions must not exceed 8,192 pixels.');
        }
        reference?.close?.();
        reference = image;
        referenceMeta = {
          name: file.name,
          bytes: file.size,
          width: image.width,
          height: image.height,
          kind: 'user-supplied concept or reference',
        };
        $('#image-note').textContent =
          `${file.name} · ${image.width} × ${image.height}. Manual alignment. Not an automatic mesh-quality judgment.`;
        session.settings.layout = 'reference';
        render();
      } else {
        const map = {
            'review-shading': 'shading',
            'review-pose': 'pose',
            'review-phase': 'phase',
            'review-view': 'view',
            'budget-target': 'target',
            'review-bones': 'bones',
            'review-labels': 'labels',
            'review-garment': 'garment',
            'review-details': 'details',
          },
          key = map[el.id];
        if (key) {
          if (['pose', 'phase', 'target', 'garment', 'details'].includes(key)) {
            suite = null;
            $('#suite-status').textContent = 'Settings changed. Run a new sweep for this view.';
          }
          session.settings[key] =
            el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
          render();
        }
      }
    } catch (error) {
      console.error(error);
      toast(error.message);
    }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'review-notes') {
      session.notes = el.value;
      return;
    }
    if (el.dataset.reference) {
      refSettings[el.dataset.reference] = Number(el.value);
      clearTimeout(bind.refTimer);
      bind.refTimer = setTimeout(() => render(), 50);
    } else if (el.matches('[data-review-proportion],[data-node]'))
      el.closest('label').querySelector('output').textContent = Number(el.value).toFixed(2);
    else if (el.id === 'profile-amount')
      $('#profile-value').textContent = Number(el.value).toFixed(2);
  });
}
start();

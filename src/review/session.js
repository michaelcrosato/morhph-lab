import { validateGenome } from '../core/genome.js';
import { foundationBlueprint, REVIEW_POSES } from './foundation.js';
import { fingerprint, TARGETS } from './audit.js';
import { SHADINGS, VIEWS } from './raster.js';
/** Bump when shared geometry or diagnostic pose behavior changes. Not a signature. */
export const REVIEW_IMPLEMENTATION = 'morph-lab-shared-geometry-11';
const IMPLEMENTATION_RESET =
  'Geometry implementation changed or was not recorded. Review this model again.';
export const REVIEW_ITEMS = {
  silhouette: 'Silhouette reads at game size',
  proportions: 'Proportions fit the target role',
  joints: 'Joints remain acceptable in test poses',
  surface: 'Surface and material work checked in the game',
  attachments: 'Attachments checked in the complete runtime',
  gameplay: 'Physics and gameplay checked',
};
export const REVIEW_DECISIONS = ['unreviewed', 'accept', 'revise'];
export class ReviewSession {
  constructor(source = foundationBlueprint('balanced')) {
    this.source = validateGenome(source);
    this.candidate = validateGenome(source);
    this.baseline = validateGenome(source);
    this.settings = {
      pose: 'bind',
      phase: 0.5,
      shading: 'clay',
      view: 'front',
      layout: 'quad',
      target: 'desktop',
      bones: false,
      labels: false,
      garment: true,
      details: true,
    };
    this.frame = null;
    this.decisions = Object.fromEntries(Object.keys(REVIEW_ITEMS).map(k => [k, 'unreviewed']));
    this.notes = '';
    this.reviewedFingerprint = null;
    this.invalidatedReason = null;
    this.lineage = { parent: fingerprint(this.source), profile: 'unchanged', amount: 0 };
  }
  setCandidate(g) {
    this.candidate = validateGenome(g);
    this.reviewedFingerprint = null;
    this.invalidatedReason = null;
    this.decisions = Object.fromEntries(Object.keys(REVIEW_ITEMS).map(k => [k, 'unreviewed']));
  }
  setSource(g) {
    this.source = validateGenome(g);
    this.setCandidate(g);
    this.lineage = { parent: fingerprint(this.source), profile: 'unchanged', amount: 0 };
  }
  pin() {
    this.baseline = validateGenome(this.candidate);
  }
  approve(key, value) {
    if (!Object.hasOwn(REVIEW_ITEMS, key) || !REVIEW_DECISIONS.includes(value))
      throw new Error('Unknown review decision.');
    this.decisions[key] = value;
    this.invalidatedReason = null;
    this.reviewedFingerprint = fingerprint(this.candidate);
  }
  get status() {
    if (Object.values(this.decisions).includes('revise')) return 'revision-requested';
    if (
      Object.values(this.decisions).every(x => x === 'accept') &&
      this.reviewedFingerprint === fingerprint(this.candidate)
    )
      return 'reviewer-accepted';
    return 'not-approved';
  }
  export() {
    return {
      format: 'morph-lab-review',
      version: 1,
      implementation: REVIEW_IMPLEMENTATION,
      source: validateGenome(this.source),
      candidate: validateGenome(this.candidate),
      baseline: validateGenome(this.baseline),
      settings: { ...this.settings },
      frame: this.frame ? structuredClone(this.frame) : null,
      lineage: { ...this.lineage },
      review: {
        decisions: { ...this.decisions },
        resetReason: this.invalidatedReason,
        notes: this.notes,
        fingerprint: this.reviewedFingerprint,
        status: this.status,
      },
      referencePolicy:
        'Reference images and external OBJ data are not embedded. Reload them from local files. No automatic quality approval.',
    };
  }
}
export function parseReviewSession(text) {
  if (typeof text !== 'string' || text.length > 1500000)
    throw new Error('Review file exceeds the 1.5 MB text limit.');
  const o = JSON.parse(text);
  if (o?.format !== 'morph-lab-review' || o.version !== 1)
    throw new Error('Unsupported review file.');
  const s = new ReviewSession(validateGenome(o.source));
  s.candidate = validateGenome(o.candidate);
  s.baseline = validateGenome(o.baseline);
  const choices = {
    pose: REVIEW_POSES,
    shading: SHADINGS,
    view: Object.keys(VIEWS),
    layout: ['quad', 'compare', 'reference'],
    target: Object.keys(TARGETS),
  };
  for (const [key, values] of Object.entries(choices)) {
    if (!values.includes(o.settings?.[key])) throw new Error('Unknown review setting: ' + key);
    s.settings[key] = o.settings[key];
  }
  if (!Number.isFinite(o.settings?.phase) || o.settings.phase < 0 || o.settings.phase > 1)
    throw new Error('Invalid phase.');
  s.settings.phase = o.settings.phase;
  for (const k of ['bones', 'labels', 'garment', 'details']) {
    if (typeof o.settings[k] !== 'boolean') throw new Error('Invalid boolean setting.');
    s.settings[k] = o.settings[k];
  }
  if (o.frame !== null) {
    if (
      !o.frame ||
      !Array.isArray(o.frame.center) ||
      o.frame.center.length !== 3 ||
      o.frame.center.some(x => !Number.isFinite(x) || Math.abs(x) > 1000) ||
      !Number.isFinite(o.frame.span) ||
      o.frame.span < 0.01 ||
      o.frame.span > 1000
    )
      throw new Error('Invalid review camera.');
    s.frame = { center: [...o.frame.center], span: o.frame.span };
  }
  for (const k of Object.keys(REVIEW_ITEMS)) {
    const d = o.review?.decisions?.[k];
    if (!REVIEW_DECISIONS.includes(d)) throw new Error('Invalid review decision.');
    s.decisions[k] = d;
  }
  if (typeof o.review.notes !== 'string' || o.review.notes.length > 5000)
    throw new Error('Review notes exceed 5,000 characters.');
  s.notes = o.review.notes;
  s.reviewedFingerprint =
    o.review.fingerprint === fingerprint(s.candidate) ? o.review.fingerprint : null;
  if (!s.reviewedFingerprint)
    s.decisions = Object.fromEntries(Object.keys(REVIEW_ITEMS).map(k => [k, 'unreviewed']));
  if (o.implementation !== REVIEW_IMPLEMENTATION) {
    s.reviewedFingerprint = null;
    s.decisions = Object.fromEntries(Object.keys(REVIEW_ITEMS).map(k => [k, 'unreviewed']));
    s.invalidatedReason = IMPLEMENTATION_RESET;
  } else
    s.invalidatedReason =
      o.review.resetReason === IMPLEMENTATION_RESET ? IMPLEMENTATION_RESET : null;
  s.lineage = {
    parent: fingerprint(s.source),
    profile: String(o.lineage?.profile || 'imported').slice(0, 80),
    amount: Number.isFinite(o.lineage?.amount) ? Math.max(0, Math.min(1, o.lineage.amount)) : 0,
  };
  return s;
}

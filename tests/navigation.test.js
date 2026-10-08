import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceURL, requestedWorkspace } from '../src/core/workspace-route.js';
import {
  enterFoundationReview,
  enterWorkshop,
  takeWorkshopTransfer,
  takeReviewTransfer,
} from '../src/review/transfer.js';
import { foundationBlueprint } from '../src/review/foundation.js';
import { ReviewSession } from '../src/review/session.js';

for (const href of [
  'file:///C:/Users/test/Desktop/New%20Stuff/Morph-Lab-v5-Review.html',
  'file:///C:/Users/test/Downloads/My%20lab%20(2).html',
  'file:///C:/Users/test/OneDrive/Documents/Renamed.html?review=1#front',
  'file:///tmp/Morph-Lab-Review.html',
  'https://example.test/tools/review.html?quality=high&review=1',
  'http://localhost:3000/index.html?workshop=1',
])
  for (const mode of ['review', 'workshop'])
    test(`Preserve file: ${href} -> ${mode}`, () => {
      const before = new URL(href),
        after = new URL(workspaceURL(href, mode));
      assert.equal(after.pathname, before.pathname);
      assert.equal(after.origin, before.origin);
      assert.equal(after.searchParams.get(mode), '1');
      assert.equal(after.hash, '');
      assert.equal(after.searchParams.has(mode === 'review' ? 'workshop' : 'review'), false);
      assert.equal(after.searchParams.get('quality'), before.searchParams.get('quality'));
    });
test('Explicit mode overrides either default', () => {
  assert.equal(requestedWorkspace('', 'review'), 'review');
  assert.equal(requestedWorkspace('', 'workshop'), 'workshop');
  assert.equal(requestedWorkspace('?workshop=1', 'review'), 'workshop');
  assert.equal(requestedWorkspace('?review=1'), 'review');
});
test('Reject unknown modes before navigation', () =>
  assert.throws(() => workspaceURL('file:///tmp/lab.html', 'other')));

function environment(embedded, blocked = false) {
  const calls = [],
    values = new Map(),
    parent = { postMessage: (...args) => calls.push(args) };
  globalThis.window = { __MORPH_EMBEDDED__: embedded, parent };
  globalThis.location = {
    href: 'file:///C:/Downloads/My%20Lab%20(2).html',
    assign: url => calls.push(url),
  };
  globalThis.sessionStorage = {
    getItem: key => values.get(key) || null,
    removeItem: key => values.delete(key),
    setItem: (k, v) => {
      if (blocked) throw new Error('Storage blocked');
      values.set(k, v);
    },
  };
  return { calls, values };
}
test('Embedded workshop transfer uses no file navigation or browser storage', () => {
  const { calls, values } = environment(true, true),
    g = foundationBlueprint('heavy'),
    session = new ReviewSession(g);
  enterWorkshop(g, session.export());
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0].workspace, 'workshop');
  assert.deepEqual(calls[0][0].payload.genome, g);
  assert.equal(values.size, 0);
});
test('Embedded inspector transfer uses no file navigation', () => {
  const { calls } = environment(true, true),
    g = foundationBlueprint('balanced');
  enterFoundationReview(g);
  assert.equal(calls[0][0].workspace, 'review');
  assert.deepEqual(calls[0][0].payload.genome, g);
});
test('Embedded transfers are read without consuming browser storage', () => {
  environment(true, true);
  const g = foundationBlueprint('compact');
  window.__MORPH_WORKSPACE__ = { genome: g, review: { label: 'record' } };
  assert.deepEqual(takeWorkshopTransfer(), g);
  assert.deepEqual(takeReviewTransfer().genome, g);
});
test('Source-mode handoff preserves the same HTML filename and checkpoints edits', () => {
  const { calls, values } = environment(false),
    g = foundationBlueprint('balanced'),
    s = new ReviewSession(g);
  enterWorkshop(g, s.export());
  assert.equal(calls[0], 'file:///C:/Downloads/My%20Lab%20(2).html?workshop=1');
  assert.equal(values.size, 2);
  assert.deepEqual(takeWorkshopTransfer(), g);
  assert.equal(values.has('morph-lab.workshop-transfer'), false);
  enterFoundationReview(g);
  assert.equal(calls[1], 'file:///C:/Downloads/My%20Lab%20(2).html?review=1');
  assert.deepEqual(takeReviewTransfer().genome, g);
});
test('Source-mode blocked storage does not discard edits by navigating', () => {
  const { calls } = environment(false, true),
    g = foundationBlueprint('balanced');
  assert.throws(() => enterWorkshop(g, new ReviewSession(g).export()), /Storage blocked/);
  assert.equal(calls.length, 0);
});

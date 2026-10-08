import test from 'node:test';
import assert from 'node:assert/strict';
import {
  diagnosticStatus,
  verifyPin,
  withDeadline,
  ENGINE_PINS,
} from '../src/diagnostics/runner.js';
test('local capability passes are not full engine approval', () =>
  assert.equal(diagnosticStatus([{ status: 'pass' }], 'local'), 'capabilities-only'));
test('blocked is not passed', () =>
  assert.equal(diagnosticStatus([{ status: 'pass' }, { status: 'blocked' }], 'full'), 'blocked'));
test('a failure takes priority over blocked checks', () =>
  assert.equal(diagnosticStatus([{ status: 'fail' }, { status: 'blocked' }], 'full'), 'fail'));
test('full measured success has pass status', () =>
  assert.equal(diagnosticStatus([{ status: 'pass' }], 'full'), 'pass'));
test('engine pins have not changed', () =>
  assert.deepEqual(ENGINE_PINS, { three: '181', rapier: '0.19.3' }));
test('wrong engine versions are rejected', () => {
  assert.throws(() => verifyPin('180', '181'));
  assert.throws(() => verifyPin('0.19.2', '0.19.3'));
  assert.equal(verifyPin('181', '181'), '181');
});
test('deadline returns a real resolved value', async () =>
  assert.equal(await withDeadline(Promise.resolve('value'), 50), 'value'));
test('deadline rejects a stalled load', async () =>
  await assert.rejects(withDeadline(new Promise(() => {}), 5), /timed out/));
test('deadline retains an underlying load error', async () =>
  await assert.rejects(
    withDeadline(Promise.reject(new Error('network failed')), 50),
    /network failed/,
  ));

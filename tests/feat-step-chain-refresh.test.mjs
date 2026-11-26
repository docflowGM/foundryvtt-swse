import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// F-PRG-001 (3G): the chained-feat legality refresh was a runtime patch of FeatStep.prototype.onItemCommitted. It is now the method itself.
globalThis.window = globalThis.window || {}; registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x'; globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
const { FeatStep } = await import('../scripts/apps/progression-framework/steps/feat-step.js');

const mk = (changes) => {
  const shell = { actor: { id: 'a' }, progressionSession: { draftSelections: { feats: [] } } };
  const calls = [];
  const self = {
    descriptor: { stepId: 'feats' },
    _onItemCommittedBase: async () => { if (changes) shell.progressionSession.draftSelections.feats.push({ id: 'f1', name: 'Power Attack' }); return 'base-result'; },
    _getLegalFeats: async () => { calls.push('legal'); return [{ id: 'f2' }]; },
    _getSuggestedFeats: async () => { calls.push('suggested'); return []; },
    _refreshGroupedFeats: () => calls.push('grouped'), _ensureDefaultFocusedFeat() {}, _ensureActiveCategory() {},
  };
  return { shell, calls, self };
};
test('a committed selection change refreshes feat legality', async () => {
  const { shell, calls, self } = mk(true);
  const r = await FeatStep.prototype.onItemCommitted.call(self, { id: 'f1' }, shell);
  assert.equal(r, 'base-result'); assert.deepEqual(calls, ['legal', 'suggested', 'grouped']); assert.equal(self._legalFeats.length, 1);
});
test('a no-op interaction does not refresh', async () => {
  const { shell, calls, self } = mk(false);
  await FeatStep.prototype.onItemCommitted.call(self, { id: 'f1' }, shell);
  assert.deepEqual(calls, []);
});
test('no runtime patch remains', () => {
  assert.ok(!fs.existsSync('scripts/patches/progression-feat-chain-hotfix.js'));
});

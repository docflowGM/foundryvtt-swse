import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// F-PAT-001 / F-NPC-007 (3N): the follower live-state projection and owner-constrained language selection were runtime patches of
// FollowerSubtypeAdapter / FollowerLanguageStep installed by follower-progression-live-state-hotfix. They are now the classes' own behavior.
globalThis.window = globalThis.window || {}; window.addEventListener ??= () => {}; window.removeEventListener ??= () => {};
globalThis.document ??= { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), addEventListener() {}, body: { appendChild() {} }, head: { appendChild() {} } };
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x'; globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
globalThis.game = { ...(globalThis.game ?? {}), actors: { get: () => null, contents: [] }, user: { id: 'u', isGM: true } };
const { FollowerLanguageStep } = await import('../scripts/apps/progression-framework/steps/follower-steps/follower-language-step.js');
const { FollowerSubtypeAdapter } = await import('../scripts/apps/progression-framework/adapters/default-subtypes.js');
const { uniqueLanguageNames } = await import('../scripts/apps/progression-framework/steps/follower-steps/follower-language-owner-constraint.js');

test('uniqueLanguageNames flattens, splits commas and de-duplicates', () => {
  assert.deepEqual(uniqueLanguageNames([['Basic, Bocce'], { name: 'Basic' }, '', null]), ['Basic', 'Bocce']);
});
test('follower language step data forbids custom languages', async () => {
  const proto = Object.getPrototypeOf(FollowerLanguageStep.prototype);
  const original = proto.getStepData; proto.getStepData = async () => ({ base: true });
  try {
    const data = await FollowerLanguageStep.prototype.getStepData.call({}, {});
    assert.equal(data.base, true); assert.equal(data.canAddCustomLanguage, false); assert.equal(data.followerOwnerConstrained, true);
  } finally { proto.getStepData = original; }
});
test('adding a custom language is rejected with a warning', async () => {
  let warned = ''; globalThis.ui = { notifications: { warn: (m) => { warned = m; } } };
  await FollowerLanguageStep.prototype._addCustomLanguage.call({});
  assert.match(warned, /only languages already known by their owner/);
});
test('onStepEnter runs the base step then constrains languages to the owner\'s', async () => {
  const order = [];
  const step = Object.create(FollowerLanguageStep.prototype);
  step._onStepEnterBase = async () => { order.push('base'); step._knownLanguageGrants = []; step._allLanguages = [{ name: 'Bocce' }]; step._selectedBonusLanguages = ['Bocce', 'Huttese']; step._bonusLanguagesAvailable = 2; };
  step._getFollowerChoices = () => ({}); step._makeLanguageGrant = (name) => ({ name, isFull: true }); step._languageMatchesName = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
  step._dedupeLanguageGrants = (g) => g; step._buildCustomLanguageRecord = (name) => ({ name });
  const shell = { ownerActor: { system: { languages: ['Basic', 'Bocce'] } }, progressionSession: { draftSelections: {}, dependencyContext: {} } };
  await step.onStepEnter(shell);
  assert.equal(order[0], 'base');
  assert.deepEqual(step._allLanguages.map((l) => l.name), ['Bocce'], 'only owner languages the follower does not already know are selectable');
  assert.deepEqual(step._selectedBonusLanguages, ['Bocce'], 'a selection outside the owner languages is dropped');
  assert.ok(Array.isArray(shell.progressionSession.draftSelections.followerKnownLanguages));
});
test('the projection wrapper delegates to the live projection and the runtime patches are gone', () => {
  assert.equal(typeof FollowerSubtypeAdapter.prototype._contributeProjectionBase, 'function');
  const hot = fs.readFileSync('scripts/patches/follower-progression-live-state-hotfix.js', 'utf8');
  assert.ok(!/prototype\.(contributeProjection|onStepEnter|getStepData|_addCustomLanguage)\s*=/.test(hot));
});

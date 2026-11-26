import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// F-PRG-001 (3G): language de-duplication, follower language catalog and step-change search reset were runtime patches
// (progression-choice-language-hotfix). They are now the classes' own methods.
globalThis.window = globalThis.window || {}; window.addEventListener ??= () => {}; window.removeEventListener ??= () => {}; globalThis.document ??= { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), addEventListener() {}, body: { appendChild() {} }, head: { appendChild() {} } }; registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x'; globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
const { LanguageStep } = await import('../scripts/apps/progression-framework/steps/language-step.js');
const { FollowerLanguageStep } = await import('../scripts/apps/progression-framework/steps/follower-steps/follower-language-step.js');
const { FollowerStepBase } = await import('../scripts/apps/progression-framework/steps/follower-steps/follower-step-base.js');
const { ProgressionShell } = await import('../scripts/apps/progression-framework/shell/progression-shell.js');

test('available languages exclude every known grant (even partial) and every selected bonus language', () => {
  const self = { _knownLanguageGrants: [{ name: 'Basic' }, { name: "Twi'leki", isFull: false }], _selectedBonusLanguages: ['Huttese'],
    _allLanguages: [{ name: 'Basic' }, { name: "Twi'leki" }, { name: 'Huttese' }, { name: 'Bocce' }] };
  assert.deepEqual(LanguageStep.prototype._getAvailableLanguages.call(self).map((l) => l.name), ['Bocce']);
});
test('restoring bonus languages drops ones the character already knows', () => {
  const mk = (base) => ({ _knownLanguageGrants: [{ name: 'Basic' }], _selectedBonusLanguages: [], [base]: function () { this._selectedBonusLanguages = ['basic', 'Bocce']; } });
  const a = mk('_restoreSelectedBonusLanguagesFromSessionBase'); LanguageStep.prototype._restoreSelectedBonusLanguagesFromSession.call(a, {});
  assert.deepEqual(a._selectedBonusLanguages, ['Bocce']);
  const b = mk('_restoreFollowerSelectedLanguagesBase'); FollowerLanguageStep.prototype._restoreFollowerSelectedLanguages.call(b, {});
  assert.deepEqual(b._selectedBonusLanguages, ['Bocce']);
});
test('follower language catalog falls back to the core list when the registry is unavailable', async () => {
  const self = { _uniqueStrings: (v) => [...new Set(v)] };
  const list = await FollowerStepBase.prototype.getAllLanguages.call(self);
  assert.ok(list.includes('Basic') && list.length >= 20);
});
test('activating a different step clears the utility-bar search', async () => {
  const plugin = { _searchQuery: 'x' };
  const self = { steps: [{ stepId: 'a' }, { stepId: 'b' }], currentStepIndex: 0, utilityBar: { _searchQuery: 'q', _focusState: {} }, stepPlugins: new Map([['b', plugin]]),
    getRootElement: () => null, _activateStepBase: async () => 'done' };
  assert.equal(await ProgressionShell.prototype._activateStep.call(self, 1, {}), 'done');
  assert.equal(self.utilityBar._searchQuery, ''); assert.equal(plugin._searchQuery, '');
  self.utilityBar._searchQuery = 'keep'; await ProgressionShell.prototype._activateStep.call(self, 0, {});
  assert.equal(self.utilityBar._searchQuery, 'keep', 'same-step activation keeps the search');
});
test('the folded patches are gone from the hotfix module', () => {
  const src = fs.readFileSync('scripts/patches/progression-choice-language-hotfix.js', 'utf8');
  assert.ok(!/patchStepSearchReset|patchLanguageSelectionDeduplication|patchFollowerLanguageRestoration|patchFollowerLanguageCatalogAccess/.test(src));
});

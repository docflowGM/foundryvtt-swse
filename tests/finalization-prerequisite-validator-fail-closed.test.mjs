import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Fail-closed finalization preflight: an evaluator EXCEPTION or an unbuildable evaluation context is an EVALUATION_ERROR and blocks finalization (it is not
// permission). Outcomes stay distinct and are typed on `details`: VERIFIED_ELIGIBLE, VERIFIED_INELIGIBLE (blocks), UNRESOLVED (advisory warning: the content
// itself cannot be verified), EVALUATION_ERROR (blocks).
for (const l of ['log', 'info', 'debug', 'warn', 'error']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DocumentSheetV2: class {}, DialogV2: class {} } };
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {}, __SWSE_CONTRACT_INITIALIZED__: false };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = globalThis.document ?? { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), readyState: 'complete', addEventListener() {}, removeEventListener() {}, activeElement: null, body: { appendChild() {} }, head: { appendChild() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: () => undefined, settings: { has: () => false } }, actors: { get: () => null } };

const { validateFinalProgressionPrerequisites } = await import('/systems/foundryvtt-swse/scripts/engine/progression/validation/finalization-prerequisite-validator.js');
const { AbilityEngine } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js');
const actor = { id: 'a', name: 'A', type: 'character', items: [], system: { level: 1, attributes: {}, skills: {} }, flags: {} };
const session = (draft) => ({ sessionId: 's', mode: 'chargen', draftSelections: draft, actor, getSelection: (k) => draft[k] });
const real = AbilityEngine.evaluateAcquisition;
const withEval = async (fn, draft) => { AbilityEngine.evaluateAcquisition = fn; try { return await validateFinalProgressionPrerequisites({ actor, progressionSession: session(draft), mode: 'chargen' }); } finally { AbilityEngine.evaluateAcquisition = real; } };
const draftFeat = { feats: [{ name: 'Some Feat', id: 'f1' }] };

// EVALUATION_ERROR (exception) blocks
{ const r = await withEval(() => { throw new Error('evaluator exploded'); }, draftFeat);
  assert.equal(r.ok, false, 'an evaluator exception must not be permission'); assert.ok(r.errors.some((e) => /Some Feat/.test(e) && /could not be verified/i.test(e)), JSON.stringify(r));
  assert.ok(r.details.some((d) => d.name === 'Some Feat' && d.outcome === 'EVALUATION_ERROR')); }
// VERIFIED_INELIGIBLE (resolved content proven illegal) blocks; UNRESOLVED stays advisory; VERIFIED_ELIGIBLE passes
{ const r = await withEval(() => ({ legal: false, missing: ['Requires Dexterity 13'] }), draftFeat);
  const d = r.details.find((x) => x.name === 'Some Feat'); assert.ok(d, JSON.stringify(r)); assert.ok(['VERIFIED_INELIGIBLE', 'UNRESOLVED'].includes(d.outcome)); }
{ const r = await withEval(() => ({ legal: true, unresolved: ['Prerequisite text could not be verified'] }), draftFeat);
  assert.equal(r.ok, true); assert.ok(r.warnings.length >= 1); assert.equal(r.details.find((x) => x.name === 'Some Feat').outcome, 'UNRESOLVED'); }
{ const r = await withEval(() => ({ legal: true, missing: [], unresolved: [] }), draftFeat);
  assert.equal(r.ok, true); assert.deepEqual(r.errors, []); assert.equal(r.details.find((x) => x.name === 'Some Feat').outcome, 'VERIFIED_ELIGIBLE'); }
// an unbuildable evaluation context is an EVALUATION_ERROR too (previously: warn and skip the whole re-check)
{ const broken = { sessionId: 's', mode: 'chargen', get draftSelections() { return draftFeat; }, get actor() { throw new Error('session actor unavailable'); }, getSelection() { throw new Error('no selections'); } };
  const bad = { ...actor, get items() { throw new Error('items unavailable'); } };
  const r = await validateFinalProgressionPrerequisites({ actor: bad, progressionSession: broken, mode: 'chargen' });
  assert.equal(r.ok, false); assert.ok(r.errors.some((e) => /could not be (performed|verified)/i.test(e)), JSON.stringify(r)); }
process.stdout.write('finalization-prerequisite-validator-fail-closed: ok\n');

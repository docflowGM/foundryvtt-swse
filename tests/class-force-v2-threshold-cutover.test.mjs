// Class/Force x Force V2, Decision A: ThresholdEngine Last Grasp / Emergency Patch pay through V2 spend+finalize.
// Both APIs are NOT_FOUND_STATIC (no textual caller): kept, and failed closed. Real ledger, offline shim. Not FOUNDRY_TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { graftRealForcePointMethods, setPath } from './helpers/real-force-point-engine.mjs';

globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {}, once: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
globalThis.foundry.utils.randomID = (() => { let k = 0; return () => `thr-${++k}`; })();
globalThis.game = Object.assign(globalThis.game ?? {}, { user: { id: 'u1', isGM: false }, combat: null, time: { worldTime: 0 } });

const { ThresholdEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/threshold-engine.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
SWSEChat.postHTML = async () => {};
const writer = async (actor, update) => { for (const [p, v] of Object.entries(update)) setPath(actor, p, v); return actor; };
const { fake: ActorEngine, restore } = await graftRealForcePointMethods(writer);
ThresholdEngine._setting = () => true;

const mk = (id, fp = 3) => ({ id, name: id, type: 'character',
  system: { forcePoints: { value: fp, max: 5 }, conditionTrack: { current: 0 }, darkSideScore: { value: 0 }, level: { heroic: 5 } },
  flags: { swse: { bonusForcePoints: { value: 0, entries: [] } } }, getFlag(s, n) { return this.flags?.[s]?.[n]; } });
let flagSets = 0;
const mkVehicle = () => ({ type: 'vehicle', flags: {}, getFlag() { return false; }, async setFlag() { flagSets += 1; } });
const ledger = (a) => a.flags?.swse?.forcePointLedger?.receipts ?? [];
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };
const { HouseRuleService } = await import('/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js');
const savedEnabled = HouseRuleService.isEnabled; const enabledKeys = new Set();
HouseRuleService.isEnabled = (k) => enabledKeys.has(k);
try {
  // house rule OFF: the typed contract refuses (fail closed), nothing is charged
  { const p = mk('p1'); assert.equal(await ThresholdEngine.executeLastGrasp(p), false); assert.equal(p.system.forcePoints.value, 3); assert.deepEqual(ledger(p), []); ok('Last Grasp: house rule disabled => denied, nothing charged'); }
  { flagSets = 0; const e = mk('e3'); const r = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 25);
    assert.equal(r.success, false); assert.equal(e.system.forcePoints.value, 3); assert.deepEqual(ledger(e), []); assert.equal(flagSets, 0); ok('Emergency Patch: house rule disabled => denied, charges nothing, patch not marked used'); }
  // house rule ON: the HOUSE_RULE contract authorizes normal use for a NON-GM; no per-activation adjudication
  enabledKeys.add('enableLastGrasp'); enabledKeys.add('enableEmergencyPatch');
  { const p = mk('p2'); assert.equal(globalThis.game.user.isGM, false);
    assert.equal(await ThresholdEngine.executeLastGrasp(p), true);
    assert.equal(p.system.forcePoints.value, 2); assert.equal(ledger(p)[0].state, 'finalized'); assert.equal(ledger(p)[0].abilitySourceRef, 'threshold:lastGrasp'); assert.equal(ledger(p)[0].adjudicatedBy ?? null, null, 'no manual adjudication needed'); ok('Last Grasp: enabled house rule authorizes a player spend via the typed contract'); }
  { const e = mk('e1'); const r = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 25);
    assert.equal(r.success, true); assert.equal(e.system.forcePoints.value, 2); assert.equal(ledger(e)[0].state, 'finalized'); ok('Emergency Patch: success path, one finalized receipt, no GM ruling per use'); }
  { const e = mk('e2'); const r = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 5);
    assert.equal(r.success, false); assert.equal(e.system.forcePoints.value, 2, 'a failed Mechanics check consumes the point (owner-adopted house-rule policy 2026-11-23)'); assert.equal(ledger(e)[0].state, 'finalized'); ok('Emergency Patch: failed check still consumes the Force Point (owner-adopted policy)'); }
  // V2 controls still apply: the per-round cap is not waived by the house-rule contract
  { const e = mk('e4'); globalThis.game.combat = { started: true, id: 'c1', round: 1, combatant: { actor: { id: 'e4' } } };
    const r1 = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 25);
    const r2 = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 25); globalThis.game.combat = null;
    assert.equal(r1.success, true); assert.equal(r2.success, false, 'second spend in the same round is denied by the V2 cap'); assert.equal(ledger(e).length, 1); ok('the V2 round cap still applies to house-rule contracts'); }
  { const src = readFileSync(new URL('../scripts/engine/combat/threshold-engine.js', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /'system\.forcePoints\.value'\s*:/); ok('structural: no direct balance write remains in threshold-engine.js'); }
} finally { HouseRuleService.isEnabled = savedEnabled; restore(); }
console.log(`class-force-v2-threshold-cutover: ${n} checks passed`);

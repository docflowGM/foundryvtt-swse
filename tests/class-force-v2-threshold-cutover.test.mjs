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
try {
  { const p = mk('p1'); assert.equal(await ThresholdEngine.executeLastGrasp(p), false); assert.equal(p.system.forcePoints.value, 3); assert.deepEqual(ledger(p), []); ok('Last Grasp: uncontracted spend is denied, nothing charged (fail closed)'); }
  globalThis.game.user.isGM = true;
  { const p = mk('p2'); assert.equal(await ThresholdEngine.executeLastGrasp(p, { gmAdjudication: { reason: 'GM allows Last Grasp' } }), true);
    assert.equal(p.system.forcePoints.value, 2); assert.equal(ledger(p)[0].state, 'finalized'); assert.equal(ledger(p)[0].abilitySourceRef, 'threshold:lastGrasp'); ok('Last Grasp: GM-adjudicated spend is one finalized receipt'); }
  { const e = mk('e1'); const r = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 25, { gmAdjudication: { reason: 'adjudicated' } });
    assert.equal(r.success, true); assert.equal(e.system.forcePoints.value, 2); assert.equal(ledger(e)[0].state, 'finalized'); ok('Emergency Patch: success path, one finalized receipt'); }
  { const e = mk('e2'); const r = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 5, { gmAdjudication: { reason: 'adjudicated' } });
    assert.equal(r.success, false); assert.equal(e.system.forcePoints.value, 2, 'charged regardless of outcome (printed text; open rules question recorded)'); assert.equal(ledger(e)[0].state, 'finalized'); ok('Emergency Patch: failed check still charges, as before (preserved, not decided)'); }
  { globalThis.game.user.isGM = false; flagSets = 0; const e = mk('e3'); const r = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 25);
    assert.equal(r.success, false); assert.equal(e.system.forcePoints.value, 3); assert.deepEqual(ledger(e), []); assert.equal(flagSets, 0); ok('Emergency Patch: denied spend charges nothing and does not mark the patch used'); }
  { const src = readFileSync(new URL('../scripts/engine/combat/threshold-engine.js', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /'system\.forcePoints\.value'\s*:/); ok('structural: no direct balance write remains in threshold-engine.js'); }
} finally { restore(); }
console.log(`class-force-v2-threshold-cutover: ${n} checks passed`);

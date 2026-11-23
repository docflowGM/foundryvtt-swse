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

const mk = (id, fp = 3) => ({ id, name: id, type: 'character',
  system: { forcePoints: { value: fp, max: 5 }, conditionTrack: { current: 0 }, darkSideScore: { value: 0 }, level: { heroic: 5 } },
  flags: { swse: { bonusForcePoints: { value: 0, entries: [] } } }, getFlag(s, n) { return this.flags?.[s]?.[n]; } });
let flagSets = 0; let flagMode = 'ok';   // ok | reject-not-applied | reject-applied
const mkVehicle = (over = {}) => {
  const v = { type: 'vehicle', name: 'Ship', flags: {}, system: { hull: { value: 0 }, crewPositions: { pilot: 'p2', engineer: 'e1' } }, ...over };
  v.getFlag = (_s, k) => v.flags[k] ?? false;
  v.setFlag = async (_s, k, val) => {
    flagSets += 1;
    if (flagMode === 'reject-not-applied') throw new Error('flag write rejected');
    v.flags[k] = val;
    if (flagMode === 'reject-applied') throw new Error('applied, acknowledgement lost');
  };
  return v;
};
const ledger = (a) => a.flags?.swse?.forcePointLedger?.receipts ?? [];
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };
// Real HouseRuleService against a stubbed world-settings API (no isEnabled stub): the live setting is re-read at every spend.
const world = new Map();
globalThis.game.settings = { settings: { has: (k) => k.startsWith('foundryvtt-swse.') }, get: (ns, k) => world.get(k), set: async (ns, k, v) => world.set(k, v) };
ThresholdEngine._setting = (k) => world.get(k) === true;
const pilotOf = (id = 'p2', over = {}) => ({ ...mk(id), hasPlayerOwner: true, ...over });
const engineerOf = (id = 'e1') => { const e = mk(id); e.name = id; return e; };
globalThis.game.actors = { getName: (n) => registry.get(n) ?? null }; const registry = new Map();
try {
  // house rule OFF: the typed contract refuses; nothing is charged
  { const p = pilotOf(); registry.set('p2', p); const v = mkVehicle(); assert.equal(await ThresholdEngine.executeLastGrasp(p, { vehicle: v }), false); assert.equal(p.system.forcePoints.value, 3); assert.deepEqual(ledger(p), []); ok('Last Grasp: setting off => denied, nothing charged'); }
  { flagSets = 0; const e = engineerOf(); const v = mkVehicle(); const r = await ThresholdEngine.attemptEmergencyPatch(v, e, 'engines', 25);
    assert.equal(r.success, false); assert.equal(e.system.forcePoints.value, 3); assert.deepEqual(ledger(e), []); assert.equal(flagSets, 0); ok('Emergency Patch: setting off => denied, nothing charged, patch not marked used'); }
  world.set('enableLastGrasp', true); world.set('enableEmergencyPatch', true);
  // Last Grasp: trusted-event binding BEFORE payment
  { const p = pilotOf(); registry.set('p2', p);
    assert.equal(await ThresholdEngine.executeLastGrasp(p), false, 'no vehicle supplied');
    assert.equal(await ThresholdEngine.executeLastGrasp(p, { vehicle: mkVehicle({ system: { hull: { value: 12 }, crewPositions: { pilot: 'p2' } } }) }), false, 'vehicle not at 0 hull');
    assert.equal(await ThresholdEngine.executeLastGrasp(p, { vehicle: mkVehicle({ system: { hull: { value: 0 }, crewPositions: { pilot: 'someone-else' } } }) }), false, 'not the crewed pilot');
    assert.equal(await ThresholdEngine.executeLastGrasp(p, { vehicle: mkVehicle({ type: 'character' }) }), false, 'not a vehicle');
    assert.equal(p.system.forcePoints.value, 3); assert.deepEqual(ledger(p), []); ok('Last Grasp: direct API calls with no eligible vehicle/pilot charge nothing'); }
  { const p = pilotOf(); registry.set('p2', p); assert.equal(globalThis.game.user.isGM, false);
    assert.equal(await ThresholdEngine.executeLastGrasp(p, { vehicle: mkVehicle() }), true);
    assert.equal(p.system.forcePoints.value, 2); assert.equal(ledger(p)[0].state, 'finalized'); assert.equal(ledger(p)[0].adjudicatedBy ?? null, null); ok('Last Grasp: enabled setting + eligible destroyed vehicle authorizes a player spend'); }
  // Emergency Patch: validate before paying
  for (const bad of [undefined, null, NaN, 'abc', '', true, Infinity]) {
    const e = engineerOf(); const r = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', bad);
    assert.equal(r.success, false, `invalid check ${String(bad)} is never a success`); assert.equal(e.system.forcePoints.value, 3); assert.deepEqual(ledger(e), []);
  }
  ok('Emergency Patch: absent/NaN/non-numeric/forged Mechanics results fail before payment');
  { const e = engineerOf('e9'); const r = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 25);
    assert.equal(r.success, false); assert.equal(e.system.forcePoints.value, 3); assert.deepEqual(ledger(e), []); ok('Emergency Patch: an actor who is not the vehicle\'s crewed engineer charges nothing'); }
  { const e = engineerOf(); const v = mkVehicle(); const r = await ThresholdEngine.attemptEmergencyPatch(v, e, 'engines', 25);
    assert.equal(r.success, true); assert.equal(e.system.forcePoints.value, 2); assert.equal(ledger(e)[0].state, 'finalized'); assert.equal(v.flags.emergencyPatchUsed, true);
    const again = await ThresholdEngine.attemptEmergencyPatch(v, e, 'engines', 25);
    assert.equal(again.success, false); assert.equal(e.system.forcePoints.value, 2, 'replay: once per encounter, no second charge'); assert.equal(ledger(e).length, 1); ok('Emergency Patch: success finalizes once; a replay is refused with no second charge'); }
  { const e = engineerOf(); const r = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 5);
    assert.equal(r.success, false); assert.equal(e.system.forcePoints.value, 2, 'a failed check consumes the point (provisional FP-RD-015 policy)'); assert.equal(ledger(e)[0].state, 'finalized'); ok('Emergency Patch: failed check still consumes the Force Point (provisional policy)'); }
  // flag-write failures: define the paid-attempt boundary
  { const e = engineerOf(); const v = mkVehicle(); flagMode = 'reject-not-applied'; e.system.forcePoints.value = 3;
    const r = await ThresholdEngine.attemptEmergencyPatch(v, e, 'engines', 25); flagMode = 'ok';
    assert.equal(r.success, false); assert.equal(ledger(e)[0].state, 'rolled-back'); assert.equal(e.system.forcePoints.value, 3, 'attempt never began: exact receipt returned'); assert.equal(v.flags.emergencyPatchUsed, undefined);
    const retry = await ThresholdEngine.attemptEmergencyPatch(v, e, 'engines', 25);
    assert.equal(retry.success, true); assert.equal(e.system.forcePoints.value, 2, 'retry charges exactly once'); ok('flag write rejected before apply: exact rollback, then a retry charges once'); }
  { const e = engineerOf(); const v = mkVehicle(); flagMode = 'reject-applied';
    const r = await ThresholdEngine.attemptEmergencyPatch(v, e, 'engines', 25); flagMode = 'ok';
    assert.equal(r.success, true); assert.equal(v.flags.emergencyPatchUsed, true); assert.equal(e.system.forcePoints.value, 2); assert.equal(ledger(e)[0].state, 'finalized');
    const replay = await ThresholdEngine.attemptEmergencyPatch(v, e, 'engines', 25);
    assert.equal(replay.success, false); assert.equal(e.system.forcePoints.value, 2); ok('flag applied but acknowledgement lost: finalized, replay cannot double-charge'); }
  // toggle off after a preview: the live setting is re-read at authorization
  { world.set('enableEmergencyPatch', false); const e = engineerOf(); const r = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 25);
    assert.equal(r.success, false); assert.equal(e.system.forcePoints.value, 3); world.set('enableEmergencyPatch', true); ok('setting toggled off after preview: denied at authorization'); }
  // contract path itself re-reads the setting even when the engine pre-check passes
  { const { evaluateAbilityContract } = await import('/systems/foundryvtt-swse/scripts/engine/force/ability-option-contracts.js');
    world.set('enableEmergencyPatch', true); assert.equal(evaluateAbilityContract(mk('x'), 'threshold:emergencyPatch', {}).valid, true);
    world.set('enableEmergencyPatch', false); assert.equal(evaluateAbilityContract(mk('x'), 'threshold:emergencyPatch', {}).valid, false); world.set('enableEmergencyPatch', true); ok('contract evaluator reads the real world setting live'); }
  // V2 cap still applies
  { const e = engineerOf(); globalThis.game.combat = { started: true, id: 'c1', round: 1, combatant: { actor: { id: 'e1' } } };
    const r1 = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 25);
    const r2 = await ThresholdEngine.attemptEmergencyPatch(mkVehicle(), e, 'engines', 25); globalThis.game.combat = null;
    assert.equal(r1.success, true); assert.equal(r2.success, false); assert.equal(ledger(e).length, 1); ok('the V2 round cap still applies to house-rule contracts'); }
  { const src = readFileSync(new URL('../scripts/engine/combat/threshold-engine.js', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /'system\.forcePoints\.value'\s*:/); ok('structural: no direct balance write remains in threshold-engine.js'); }
} finally { restore(); }
console.log(`class-force-v2-threshold-cutover: ${n} checks passed`);

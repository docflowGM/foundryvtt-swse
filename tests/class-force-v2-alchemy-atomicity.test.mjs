// Force Alchemy multi-resource costs (Force Points + Dark Side Score + credits): recoverable, delta-based, never claimed atomic.
// Real V2 ledger, failure injection, offline shim. Not FOUNDRY_TESTED.
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { graftRealForcePointMethods, setPath } from './helpers/real-force-point-engine.mjs';
globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {}, once: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
globalThis.foundry.utils.randomID = (() => { let k = 0; return () => `atm-${++k}`; })();
globalThis.game = Object.assign(globalThis.game ?? {}, { user: { id: 'gm1', isGM: true }, combat: null, time: { worldTime: 0 } });

const { applyForceAlchemySelection, ForceAlchemyUnresolvedError } = await import('/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-mechanics-service.js');
const { ForceAlchemyStateService } = await import('/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-state-service.js');
const apply = (a, p) => { for (const [k, v] of Object.entries(p)) setPath(a, k, v); return a; };
const { fake: ActorEngine, restore } = await graftRealForcePointMethods(async (a, u) => apply(a, u));

let costWrite = 'ok';            // ok | throw-before | throw-after   (applies to writes that touch Dark Side Score / credits)
let midFlight = null;            // function run just before a cost write lands
const baseUpdate = ActorEngine.updateActor;
ActorEngine.updateActor = async (actor, update, opts) => {
  const touchesCosts = 'system.darkSide.value' in update || 'system.credits' in update;
  if (touchesCosts && midFlight) { const f = midFlight; midFlight = null; f(actor); }
  if (touchesCosts && costWrite === 'throw-before') throw new Error('cost write rejected');
  const r = await baseUpdate(actor, update, opts);
  if (touchesCosts && costWrite === 'throw-after') throw new Error('applied, acknowledgement lost');
  return r;
};
let effectMode = 'ok';
ActorEngine.createActiveEffects = async () => { if (effectMode === 'fail') throw new Error('effect creation failed'); return [{ id: 'fx1' }]; };
ActorEngine.deleteActiveEffects = async () => {};
let cleared = 0;
ForceAlchemyStateService.recordSelection = async () => ({ entry: { id: 'e1', config: {} } });
ForceAlchemyStateService.updateSlot = async () => ({});
ForceAlchemyStateService.clearSlot = async () => { cleared += 1; };

const mk = () => ({ id: 'alc', name: 'Alchemist', type: 'character',
  system: { forcePoints: { value: 3, max: 5 }, credits: 1000, darkSide: { value: 2 }, conditionTrack: { current: 0 }, level: { heroic: 5 } },
  flags: { swse: { bonusForcePoints: { value: 0, entries: [] } } }, getFlag(s, n) { return this.flags?.[s]?.[n]; }, items: [] });
const rite = (over = {}) => ({ id: 'rapid-alchemy', name: 'Rapid Alchemy', timing: 'encounter', stateKey: 'encounter', fpCost: 1, dspCost: 1, creditCost: 100, mechanical: true, ...over });
const detail = (r, extra = {}) => ({ ready: true, rite: r, selectedTarget: { name: 'T' }, selectedConfig: {}, gmAdjudication: { reason: 'adjudicated' }, ...extra });
const ledger = (a) => a.flags?.swse?.forcePointLedger?.receipts ?? [];
const reset = () => { costWrite = 'ok'; midFlight = null; effectMode = 'ok'; cleared = 0; globalThis.game.user.isGM = true; };
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };
try {
  { reset(); const a = mk(); const r = await applyForceAlchemySelection(a, detail(rite()));
    assert.equal(r.mode, 'applied'); assert.equal(a.system.forcePoints.value, 2); assert.equal(a.system.darkSide.value, 3); assert.equal(a.system.credits, 900);
    assert.equal(ledger(a)[0].state, 'finalized'); assert.equal(r.fpSettlement, undefined); ok('success: FP receipt finalized, +1 DSP, -100 credits'); }
  { reset(); globalThis.game.user.isGM = false; const a = mk(); await assert.rejects(() => applyForceAlchemySelection(a, detail(rite(), { gmAdjudication: null })), /certified|GM adjudication|contract/);
    assert.equal(a.system.credits, 1000); assert.equal(a.system.darkSide.value, 2); assert.deepEqual(ledger(a), []); ok('FP denied: nothing else is touched'); }
  { reset(); const a = mk(); const realSpend = ActorEngine.spendForcePoints; ActorEngine.spendForcePoints = async (...x) => { const r = await realSpend.apply(ActorEngine, x); a.system.credits = 50; return r; };
    await assert.rejects(() => applyForceAlchemySelection(a, detail(rite())), /enough credits/); ActorEngine.spendForcePoints = realSpend;
    assert.equal(ledger(a)[0].state, 'rolled-back'); assert.equal(a.system.forcePoints.value, 3); assert.equal(a.system.credits, 50); assert.equal(a.system.darkSide.value, 2);
    ok('credits drop after the FP was paid: the exact FP receipt is returned, nothing else is charged'); }
  { reset(); const a = mk(); costWrite = 'throw-before'; await assert.rejects(() => applyForceAlchemySelection(a, detail(rite())), /cost write rejected/);
    assert.equal(ledger(a)[0].state, 'rolled-back'); assert.equal(a.system.forcePoints.value, 3); assert.equal(a.system.credits, 1000); assert.equal(a.system.darkSide.value, 2);
    ok('cost write rejected before applying: FP returned, balances unchanged'); }
  { reset(); const a = mk(); costWrite = 'throw-after'; const r = await applyForceAlchemySelection(a, detail(rite()));
    assert.equal(r.mode, 'applied'); assert.equal(a.system.credits, 900, 'charged exactly once'); assert.equal(a.system.darkSide.value, 3); assert.equal(ledger(a)[0].state, 'finalized');
    ok('cost write applied but acknowledgement lost: re-read shows it applied, the rite proceeds, no double charge'); }
  { reset(); const a = mk(); effectMode = 'fail';
    const realSpend = ActorEngine.spendForcePoints; ActorEngine.spendForcePoints = async (...x) => realSpend.apply(ActorEngine, x);
    const realCreate = ActorEngine.createActiveEffects; ActorEngine.createActiveEffects = async () => { a.system.credits += 500; a.system.darkSide.value += 1; throw new Error('effect creation failed'); };
    await assert.rejects(() => applyForceAlchemySelection(a, detail(rite())), /effect creation failed/); ActorEngine.createActiveEffects = realCreate;
    assert.equal(a.system.credits, 1500, 'delta compensation: 1000 - 100 + 500 unrelated + 100 returned (an absolute restore would give 1000)');
    assert.equal(a.system.darkSide.value, 3, 'DSP: 2 + 1 cost + 1 unrelated - 1 returned (an absolute restore would give 2)');
    assert.equal(a.system.forcePoints.value, 3); assert.equal(ledger(a)[0].state, 'rolled-back'); assert.equal(cleared, 1);
    ok('rite fails after costs applied: inverse DELTAS on current values; unrelated concurrent credit/DSP changes survive'); }
  { reset(); const a = mk(); effectMode = 'fail';
    const realCreate = ActorEngine.createActiveEffects; ActorEngine.createActiveEffects = async () => { costWrite = 'throw-before'; throw new Error('effect creation failed'); };
    await assert.rejects(() => applyForceAlchemySelection(a, detail(rite())), (e) => e instanceof ForceAlchemyUnresolvedError && /GM reconciliation required/.test(e.message));
    ActorEngine.createActiveEffects = realCreate; costWrite = 'ok';
    assert.equal(ledger(a)[0].state, 'rolled-back', 'the FP receipt is still returned exactly');
    assert.equal(a.system.credits, 900, 'the credit cost could not be returned: left as is, never guessed'); assert.equal(cleared, 0, 'the applying slot is KEPT as durable evidence');
    ok('compensation write fails twice: ForceAlchemyUnresolvedError (GM review), slot kept, FP part still exact'); }
  { reset(); const a = mk(); const realFin = ActorEngine.finalizeForcePointSpend; ActorEngine.finalizeForcePointSpend = async () => { throw new Error('write rejected'); };
    const r = await applyForceAlchemySelection(a, detail(rite())); ActorEngine.finalizeForcePointSpend = realFin;
    assert.equal(r.mode, 'applied'); assert.equal(r.fpSettlement, 'unresolved'); assert.equal(ledger(a)[0].state, 'committed');
    assert.equal(ActorEngine.listUnsettledForcePointReceipts(a).length, 1, 'visible to the GM reconciliation tool');
    ok('finalize impossible: the applied rite is reported with fpSettlement=unresolved and the receipt stays reconcilable'); }
  { reset(); const a = mk(); effectMode = 'fail';
    const realCreate = ActorEngine.createActiveEffects; ActorEngine.createActiveEffects = async () => { a.system.credits += 300; a.system.darkSide.value += 5; throw new Error('effect creation failed'); };
    await assert.rejects(() => applyForceAlchemySelection(a, detail(rite({ dspCost: 0, creditCost: 0 }))), /effect creation failed/); ActorEngine.createActiveEffects = realCreate;
    assert.equal(a.system.credits, 1300, 'an FP-only rite never writes credits on compensation'); assert.equal(a.system.darkSide.value, 7, 'nor Dark Side Score');
    assert.equal(ledger(a)[0].state, 'rolled-back'); ok('FP-only rite: compensation does not clobber unrelated credits / Dark Side Score (the old absolute restore did)'); }
} finally { restore(); }
console.log(`class-force-v2-alchemy-atomicity: ${n} checks passed`);

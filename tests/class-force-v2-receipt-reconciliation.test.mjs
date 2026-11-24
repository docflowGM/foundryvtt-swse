// Unsettled (committed) Force Point receipts after a disconnect: inventory + recorded GM decision, never a guess. Real ledger, offline shim.
// Not FOUNDRY_TESTED.
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
globalThis.foundry.utils.randomID = (() => { let k = 0; return () => `rec-${++k}`; })();
globalThis.game = Object.assign(globalThis.game ?? {}, { user: { id: 'gm1', isGM: true }, combat: null, time: { worldTime: 500 } });
const writer = async (actor, update) => { for (const [p, v] of Object.entries(update)) setPath(actor, p, v); return actor; };
const { fake: ActorEngine, restore } = await graftRealForcePointMethods(writer);
const mk = () => ({ id: 'tgt', name: 'T', type: 'character', system: { forcePoints: { value: 3, max: 5 }, conditionTrack: { current: 0 }, darkSideScore: { value: 0 }, level: { heroic: 5 } },
  flags: { swse: { bonusForcePoints: { value: 0, entries: [] } } }, getFlag(s, n) { return this.flags?.[s]?.[n]; } });
const ledger = (a) => a.flags?.swse?.forcePointLedger?.receipts ?? [];
const open = (a) => ActorEngine.spendForcePoints(a, 1, { useKind: 'ability-option', abilitySourceRef: 'reaction:testKey', gmAdjudication: { reason: 'adjudicated' } });
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };
try {
  { const a = mk(); const r = await open(a);                                   // spend committed, then the client "dies": never settled
    const list = ActorEngine.listUnsettledForcePointReceipts(a);
    assert.equal(list.length, 1); assert.equal(list[0].receiptId, r.receiptId); assert.equal(list[0].abilitySourceRef, 'reaction:testKey');
    assert.deepEqual(ActorEngine.listUnsettledForcePointReceipts(a, { inFlight: [r.receiptId] }), [], 'an operation still running on this client is excluded');
    ok('a committed receipt is inventoried from the actor\'s own ledger with its source evidence; in-flight ones are excluded'); }
  { const a = mk(); const r = await open(a); assert.equal(a.system.forcePoints.value, 2);
    globalThis.game.user.isGM = false;
    await assert.rejects(() => ActorEngine.reconcileForcePointReceipt(a, r.receiptId, { decision: 'rollback', reason: 'x' }), /Only a GM/);
    globalThis.game.user.isGM = true;
    await assert.rejects(() => ActorEngine.reconcileForcePointReceipt(a, r.receiptId, { decision: 'rollback', reason: '  ' }), /written reason/);
    await assert.rejects(() => ActorEngine.reconcileForcePointReceipt(a, r.receiptId, { decision: 'maybe', reason: 'x' }), /decision must be/);
    assert.equal(ledger(a)[0].state, 'committed'); assert.equal(a.system.forcePoints.value, 2);
    ok('only a live GM with a written reason and an explicit decision can reconcile; nothing changes otherwise'); }
  { const a = mk(); const r = await open(a);
    const out = await ActorEngine.reconcileForcePointReceipt(a, r.receiptId, { decision: 'rollback', reason: 'reaction never resolved; GM confirmed' });
    assert.equal(out.reconciled, true); assert.equal(ledger(a)[0].state, 'rolled-back'); assert.equal(a.system.forcePoints.value, 3, 'exactly that receipt returned');
    assert.equal(ledger(a)[0].reconciliation.decision, 'rollback'); assert.equal(ledger(a)[0].reconciliation.userId, 'gm1'); assert.equal(ledger(a)[0].reconciliation.worldTime, 500);
    const again = await ActorEngine.reconcileForcePointReceipt(a, r.receiptId, { decision: 'rollback', reason: 'again' });
    assert.equal(again.reconciled, false); assert.equal(a.system.forcePoints.value, 3, 'a second reconcile cannot refund twice');
    ok('GM rollback: exact receipt returned once, decision/reason/user/world-time recorded, idempotent'); }
  { const a = mk(); const r = await open(a);
    const out = await ActorEngine.reconcileForcePointReceipt(a, r.receiptId, { decision: 'finalize', reason: 'the reaction was applied' });
    assert.equal(out.reconciled, true); assert.equal(ledger(a)[0].state, 'finalized'); assert.equal(a.system.forcePoints.value, 2, 'the applied reaction keeps its charge');
    const noRefund = await ActorEngine.reconcileForcePointReceipt(a, r.receiptId, { decision: 'rollback', reason: 'changed my mind' });
    assert.equal(noRefund.reconciled, false); assert.equal(a.system.forcePoints.value, 2, 'a finalized spend is never refundable');
    ok('GM finalize: the applied reaction stays charged; a finalized receipt can never be rolled back afterwards'); }
  { const a = mk(); const r1 = await open(a); globalThis.game.combat = null;
    assert.equal(ActorEngine.listUnsettledForcePointReceipts(a).length, 1, 'visible until a GM decides: no automatic guess, no silent expiry');
    await ActorEngine.reconcileForcePointReceipt(a, r1.receiptId, { decision: 'finalize', reason: 'applied' });
    assert.deepEqual(ActorEngine.listUnsettledForcePointReceipts(a), [], 'settled receipts leave the inventory');
    ok('an unsettled receipt stays in the inventory until a GM decides, then leaves it'); }
  { const a = mk(); const out = await ActorEngine.reconcileForcePointReceipt(a, 'nope', { decision: 'rollback', reason: 'x' });
    assert.equal(out.reconciled, false); ok('an unknown receipt id reconciles nothing'); }
} finally { restore(); }
console.log(`class-force-v2-receipt-reconciliation: ${n} checks passed`);

import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// TI-1 (resource transaction integrity), promoted from the TI-0 reproductions TX-04 / TX-05 / TX-06. Force Point cases run against the REAL
// ActorEngine.spendForcePoints / gainForcePoints (grafted; tests/helpers/real-force-point-engine.mjs). Level: L1 (single client, offline).
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const { graftRealForcePointMethods, setPath } = await import('./helpers/real-force-point-engine.mjs');
let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const silent = async (fn) => { const e = console.error; const w = console.warn; console.error = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.error = e; console.warn = w; } };

// ------------------------------------------------------------------------------------------------ 1.1 coordinator refund (TX-04)
{
  const ctl = { failFrom: Infinity, writes: 0, gains: [] };
  const writer = async (actor, data) => { ctl.writes += 1; if (ctl.writes >= ctl.failFrom) throw new Error('simulated write failure'); for (const [k, v] of Object.entries(data)) setPath(actor, k, v); return actor; };
  const { fake: engine, restore } = await graftRealForcePointMethods(writer);
  const realGain = engine.gainForcePoints; engine.gainForcePoints = async (a, x) => { ctl.gains.push(x); return realGain.call(engine, a, x); };
  const { ForcePointSpendCoordinator: C } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-point-spend-coordinator.js');
  const mk = ({ normal = 3, bonus = null } = {}) => { const a = { id: 'fp1', name: 'FP Tester', type: 'character', system: { forcePoints: { value: normal, max: 5 }, level: 5, heroicLevel: 5, attributes: {} }, flags: { swse: bonus ? { bonusForcePoints: bonus } : {} } }; a.getFlag = (s, k) => a.flags?.[s]?.[k]; return a; };
  const bonusTotal = (a) => (a.flags.swse.bonusForcePoints?.entries ?? []).reduce((x, e) => x + e.value, 0);
  const reset = () => { ctl.failFrom = Infinity; ctl.writes = 0; ctl.gains = []; };
  let duringRoll = null;
  globalThis.Roll = class { constructor(f) { this.f = f; } async evaluate() { if (duringRoll) await duringRoll(); throw new Error('simulated roll failure'); } };
  try {
    // (a) the roll fails AFTER the spend and the refund write ALSO fails: the failure must be visible, never "rolled back"
    reset(); { const a = mk({ normal: 3 }); ctl.failFrom = 2;   // write 1 = the spend, write 2 = the refund
      const r = await silent(() => C.rollAndSpend(a, { amount: 1, reason: 'ti1', domain: 'skill.test' }));
      assert.equal(r.success, false); assert.equal(r.rolledBack, false, 'a refund that failed is NOT reported as rolled back'); assert.equal(r.refundFailed, true, 'and is flagged so the caller can tell the player');
      assert.equal(a.system.forcePoints.value, 2, 'the point really is still spent'); assert.equal(r.spent, 1, 'and the receipt says what is still deducted'); }
    // (b) a spent BONUS point is returned as a bonus point (not to the normal pool, not clamped away)
    reset(); { const bonus = { entries: [{ id: 'b1', source: 'Granted', value: 1, max: 1 }], value: 1, max: 1 }; const a = mk({ normal: 5, bonus });
      const r = await silent(() => C.rollAndSpend(a, { amount: 1, reason: 'ti1', domain: 'skill.test' }));
      assert.equal(r.success, false); assert.equal(r.rolledBack, true); assert.equal(r.refundFailed, false);
      assert.equal(bonusTotal(a), 1, 'the bonus point is back'); assert.equal(a.system.forcePoints.value, 5, 'the normal pool was not touched'); assert.deepEqual(ctl.gains, []); }
    // (c) a normal-pool refund is relative: a point regained by something else between the spend and the refund survives
    reset(); { const a = mk({ normal: 3 }); duringRoll = async () => { a.system.forcePoints.value += 1; };   // e.g. a rest / grant
      const r = await silent(() => C.rollAndSpend(a, { amount: 1, reason: 'ti1', domain: 'skill.test' })); duringRoll = null;
      assert.equal(r.rolledBack, true); assert.equal(a.system.forcePoints.value, 4, '3 - 1 + 1 (other) + 1 (refund), not an overwritten 3'); assert.deepEqual(ctl.gains, [1]); }
    // (d) a partial spend is refunded with the same verdict
    reset(); { const a = mk({ normal: 3 }); const realSpend = engine.spendForcePoints; engine.spendForcePoints = async (act, req) => { const r = await realSpend.call(engine, act, 1); return { ...r, spent: 1 }; };
      const r = await silent(() => C.rollAndSpend(a, { amount: 2, reason: 'ti1', domain: 'skill.test' })); engine.spendForcePoints = realSpend;
      assert.equal(r.success, false); assert.equal(r.refundFailed, false); assert.equal(a.system.forcePoints.value, 3, 'the one point that was taken is given back'); }
    ok('TI-1.1 (TX-04): the coordinator refund reports a failed refund truthfully, returns bonus points as bonus points, and is relative (preserves concurrent changes)');
  } finally { restore(); globalThis.Roll = undefined; }
}

// ------------------------------------------------------------------------------------------------ TI1-R1 / TI1-R2 receipt concurrency, uncertain writes, uncertain spend
{
  const ctl = { gate: null, mode: 'ok', gains: [], bonusWrites: 0, spendMode: 'ok' };   // mode: ok | fail (throws, nothing applied) | applyThenThrow
  const writer = async (actor, data) => {
    const isBonus = 'flags.swse.bonusForcePoints' in data; if (isBonus) ctl.bonusWrites += 1;
    if (ctl.spendMode === 'applyThenThrow' && !ctl.refunding) { for (const [k, v] of Object.entries(data)) setPath(actor, k, v); throw new Error('spend applied but the call threw'); }
    if (ctl.spendMode === 'fail' && !ctl.refunding) throw new Error('spend rejected');
    if (ctl.refunding) {
      if (ctl.gate) await ctl.gate;
      if (ctl.mode === 'fail') throw new Error('refund rejected');
      if (ctl.mode === 'failBonus' && isBonus) throw new Error('bonus refund rejected');
      if (ctl.mode === 'applyThenThrow') { for (const [k, v] of Object.entries(data)) setPath(actor, k, v); throw new Error('refund applied but the call threw'); }
    }
    for (const [k, v] of Object.entries(data)) setPath(actor, k, v); return actor;
  };
  const { fake: engine, restore } = await graftRealForcePointMethods(writer);
  const realGain = engine.gainForcePoints; engine.gainForcePoints = async (a, x) => { ctl.gains.push(x); return realGain.call(engine, a, x); };
  const { ForcePointSpendCoordinator: C } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-point-spend-coordinator.js');
  const R = await import('/systems/foundryvtt-swse/scripts/engine/force/force-point-spend-receipt.js');
  const mk = ({ normal = 3, bonus = null } = {}) => { const a = { id: 'fp9', name: 'FP Tester', type: 'character', system: { forcePoints: { value: normal, max: 5 }, level: 5, heroicLevel: 5, attributes: {} }, flags: { swse: bonus ? { bonusForcePoints: bonus } : {} } }; a.getFlag = (s, k) => a.flags?.[s]?.[k]; return a; };
  const bonusOf = (a) => Object.fromEntries((a.flags.swse.bonusForcePoints?.entries ?? []).map((e) => [e.id, e.value]));
  const reset = () => { Object.assign(ctl, { gate: null, mode: 'ok', gains: [], bonusWrites: 0, spendMode: 'ok', refunding: false }); };
  const until = async (cond) => { for (let i = 0; i < 5000 && !cond(); i += 1) { await new Promise((r) => setTimeout(r, 1)); } assert.ok(cond(), 'awaited condition reached'); };
  // a receipt for a spend that took 1 normal point (pool 3 -> 2) / 1 bonus point (bonus 1 -> 0) / both (a 2-point spend)
  const spendFor = async (a, amount) => { const before = R.snapshotBonusEntries(a); const res = await engine.spendForcePoints(a, amount); return { res, receipt: R.receiptFromSpend(before, a, res) }; };
  try {
    // --- R1a: two simultaneous refunds of one receipt give back ONCE and share one truthful result (normal)
    reset(); { const a = mk({ normal: 3 }); const { receipt } = await spendFor(a, 1); assert.equal(a.system.forcePoints.value, 2);
      let release; ctl.gate = new Promise((r) => { release = r; }); ctl.refunding = true;
      const p1 = R.giveBack(engine, a, receipt); const p2 = R.giveBack(engine, a, receipt); await until(() => ctl.gains.length >= 1); release(); const [x, y] = await Promise.all([p1, p2]);
      assert.deepEqual([x.ok, y.ok], [true, true]); assert.deepEqual(ctl.gains, [1], 'the normal point is refunded ONCE'); assert.equal(a.system.forcePoints.value, 3);
      const z = await R.giveBack(engine, a, receipt); assert.equal(z.ok, true, 'a later call reports the same settled outcome'); assert.deepEqual(ctl.gains, [1]); assert.equal(a.system.forcePoints.value, 3); }
    // --- R1a: bonus and mixed pools
    reset(); { const bonus = { entries: [{ id: 'b1', source: 'Granted', value: 1, max: 1 }], value: 1, max: 1 }; const a = mk({ normal: 3, bonus }); const { receipt } = await spendFor(a, 2);   // bonus first, then one normal
      assert.deepEqual(bonusOf(a), {}); assert.equal(a.system.forcePoints.value, 2);   // a depleted bonus entry is removed by the authority
      ctl.refunding = true; const [x, y] = await Promise.all([R.giveBack(engine, a, receipt), R.giveBack(engine, a, receipt)]);
      assert.deepEqual([x.ok, y.ok], [true, true]); assert.deepEqual(bonusOf(a), { b1: 1 }, 'the bonus point returned to the BONUS pool, once'); assert.equal(a.system.forcePoints.value, 3, 'the normal point returned to the normal pool, once'); assert.deepEqual(ctl.gains, [1]); assert.equal(ctl.bonusWrites >= 1 && ctl.bonusWrites <= 2, true); }
    // --- R1a: a concurrent unrelated change survives the refund
    reset(); { const a = mk({ normal: 3 }); const { receipt } = await spendFor(a, 1); a.system.forcePoints.value += 1;   // gained elsewhere
      ctl.refunding = true; await R.giveBack(engine, a, receipt); assert.equal(a.system.forcePoints.value, 4, 'relative refund preserves the unrelated change'); }
    // --- R1b: partial progress is kept: normal refunded, bonus write fails cleanly -> retry repeats ONLY the bonus part
    reset(); { const bonus = { entries: [{ id: 'b1', source: 'Granted', value: 1, max: 1 }], value: 1, max: 1 }; const a = mk({ normal: 3, bonus }); const { receipt } = await spendFor(a, 2);
      ctl.refunding = true; ctl.mode = 'failBonus'; const first = await silent(() => R.giveBack(engine, a, receipt));
      assert.equal(first.ok, false); assert.notEqual(first.indeterminate, true, 'nothing changed on the failed bonus write: a clean, retryable failure'); assert.equal(a.system.forcePoints.value, 3, 'the normal part completed'); assert.deepEqual(bonusOf(a), {});
      ctl.mode = 'ok'; const second = await R.giveBack(engine, a, receipt); assert.equal(second.ok, true); assert.deepEqual(ctl.gains, [1], 'the normal part is NOT repeated'); assert.deepEqual(bonusOf(a), { b1: 1 }); assert.equal(a.system.forcePoints.value, 3); }
    // --- R1b: a refund write that APPLIED and then threw is indeterminate: no automatic retry, no second refund
    reset(); { const a = mk({ normal: 3 }); const { receipt } = await spendFor(a, 1); ctl.refunding = true; ctl.mode = 'applyThenThrow';
      const first = await silent(() => R.giveBack(engine, a, receipt)); assert.equal(first.ok, false); assert.equal(first.indeterminate, true, 'an uncertain write is reported as indeterminate'); assert.ok(first.evidence, 'with evidence for reconciliation'); assert.equal(a.system.forcePoints.value, 3, 'the refund is observable');
      ctl.mode = 'ok'; const again = await R.giveBack(engine, a, receipt); assert.equal(again.ok, false); assert.equal(again.indeterminate, true, 'a retry does not repeat or "fix" an unconfirmed refund'); assert.deepEqual(ctl.gains, [1], 'gainForcePoints was called exactly once'); assert.equal(a.system.forcePoints.value, 3, 'no double refund'); }
    // --- R1b through the coordinator and RollCore consumers
    reset(); { globalThis.Roll = class { async evaluate() { throw new Error('simulated roll failure'); } };
      const a = mk({ normal: 3 }); ctl.mode = 'applyThenThrow'; const origEval = globalThis.Roll;
      // the refund runs after the failed roll; make only the refund phase ambiguous
      const realSpend = engine.spendForcePoints; engine.spendForcePoints = async (...x) => { const r = await realSpend.apply(engine, x); ctl.refunding = true; return r; };
      const r = await silent(() => C.rollAndSpend(a, { amount: 1, reason: 'ti1', domain: 'skill.test' })); engine.spendForcePoints = realSpend; globalThis.Roll = undefined;
      assert.equal(r.success, false); assert.equal(r.rolledBack, false); assert.equal(r.refundFailed, true); assert.equal(r.refundIndeterminate, true, 'the coordinator reports an unconfirmed refund distinctly'); assert.equal(origEval === origEval, true); }
    // --- R1a through the coordinator's refundSpend(): simultaneous callers
    reset(); { const a = mk({ normal: 3 }); globalThis.Roll = class { constructor() { this.total = 4; } async evaluate() { return this; } };
      const r = await C.rollAndSpend(a, { amount: 1, reason: 'ti1', domain: 'skill.test' }); globalThis.Roll = undefined; assert.equal(r.success, true); assert.equal(typeof r.refundSpend, 'function');
      ctl.refunding = true; const [x, y] = await Promise.all([r.refundSpend('t'), r.refundSpend('t')]); assert.deepEqual([x.ok, y.ok], [true, true]); assert.deepEqual(ctl.gains, [1]); assert.equal(a.system.forcePoints.value, 3); }
    ok('TI1-R1: a receipt refunds once under simultaneous callers (normal / bonus / mixed), keeps partial progress, preserves unrelated changes, and treats an applied-then-threw write as indeterminate (no retry, no second refund)');

    // --- R2: ActorEngine.spendForcePoints applied the mutation and THEN threw: unresolved, never "nothing was spent", never auto-compensated
    reset(); { const a = mk({ normal: 3 }); ctl.spendMode = 'applyThenThrow'; globalThis.Roll = class { constructor() { this.total = 4; } async evaluate() { return this; } };
      const r = await silent(() => C.rollAndSpend(a, { amount: 1, reason: 'ti1', domain: 'skill.test' })); globalThis.Roll = undefined;
      assert.equal(r.success, false); assert.equal(r.spendIndeterminate, true, 'a distinct unresolved outcome'); assert.equal(a.system.forcePoints.value, 2, 'the deduction is observable');
      assert.equal(r.spent, 1, 'the receipt does not claim that nothing was spent'); assert.ok(r.evidence && r.evidence.before !== undefined && r.evidence.after !== undefined, 'evidence is preserved for reconciliation'); assert.equal(r.rolledBack, false);
      assert.deepEqual(ctl.gains, [], 'an unconfirmed expenditure is not automatically compensated'); assert.equal(typeof r.refundSpend, 'undefined', 'and no automatic refund handle is offered'); }
    // a clean spend failure (nothing changed) is still a plain failure
    reset(); { const a = mk({ normal: 3 }); ctl.spendMode = 'fail'; const r = await silent(() => C.rollAndSpend(a, { amount: 1, reason: 'ti1', domain: 'skill.test' }));
      assert.equal(r.success, false); assert.notEqual(r.spendIndeterminate, true); assert.equal(r.spent, 0); assert.equal(a.system.forcePoints.value, 3); }
    // a bonus-pool deduction that threw is also detected
    reset(); { const bonus = { entries: [{ id: 'b1', source: 'Granted', value: 1, max: 1 }], value: 1, max: 1 }; const a = mk({ normal: 3, bonus }); ctl.spendMode = 'applyThenThrow';
      const r = await silent(() => C.rollAndSpend(a, { amount: 1, reason: 'ti1', domain: 'skill.test' })); assert.equal(r.spendIndeterminate, true); assert.deepEqual(bonusOf(a), {}); assert.equal(r.spent, 1); }
    // --- R1 through the attack transaction: a refund write that applied and then threw closes the transaction as refund-indeterminate (no retry, one gain call)
    reset(); { const { createForcePointTransaction } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/force-point-transaction.js');
      const a = mk({ normal: 3 }); const t = createForcePointTransaction({ actor: a, result: 7, formula: '1d6', reason: 'ti1', roll: { total: 7 } }); assert.equal(await t.commit(), true);
      ctl.refunding = true; ctl.mode = 'applyThenThrow'; assert.equal(await silent(() => t.rollback()), false); assert.equal(t.state, 'refund-indeterminate'); assert.equal(t.closed, true); assert.ok(t.refundEvidence);
      ctl.mode = 'ok'; assert.equal(await t.rollback(), false, 'closed: no automatic retry'); assert.equal(await t.announce(), false); assert.deepEqual(ctl.gains, [1]); assert.equal(a.system.forcePoints.value, 3, 'no second refund'); }
    // --- RollCore: an unconfirmed refund after the main roll failed is reported distinctly
    reset(); { const { RollCore } = await import('/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js'); const a = mk({ normal: 3 }); let calls = 0;
      globalThis.Roll = class { constructor() { this.total = 6; this.terms = []; } async evaluate() { calls += 1; if (calls === 2) { ctl.refunding = true; ctl.mode = 'applyThenThrow'; throw new Error('main roll failed'); } return this; } };
      const r = await silent(() => RollCore.execute({ actor: a, domain: 'skill.test', baseDice: '1d20', baseBonus: 0, rollOptions: { useForce: true }, context: {} })); globalThis.Roll = undefined;
      assert.equal(r.success, false); assert.equal(r.forcePointRefundFailed, true); assert.equal(r.forcePointRefundIndeterminate, true); assert.deepEqual(ctl.gains, [1]); }
    ok('TI1-R2: a spend that applied and then threw is an explicit unresolved outcome with evidence (no "nothing spent" claim, no automatic compensation); a clean failure is unchanged');
  } finally { restore(); globalThis.Roll = undefined; }
}

// ------------------------------------------------------------------------------------------------ 1.1b RollCore refund after the MAIN roll fails (second refund path)
{
  const ctl = { failRefund: false, gains: [] };
  const writer = async (actor, data) => { if (ctl.failRefund && ctl.armed) throw new Error('simulated refund write failure'); for (const [k, v] of Object.entries(data)) setPath(actor, k, v); return actor; };
  const { fake: engine, restore } = await graftRealForcePointMethods(writer);
  const realGain = engine.gainForcePoints; engine.gainForcePoints = async (a, x) => { ctl.gains.push(x); return realGain.call(engine, a, x); };
  const { RollCore } = await import('/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js');
  const mk = ({ normal = 5, bonus = null } = {}) => { const a = { id: 'fp2', name: 'FP Tester', type: 'character', system: { forcePoints: { value: normal, max: 5 }, level: 5, heroicLevel: 5, attributes: {} }, flags: { swse: bonus ? { bonusForcePoints: bonus } : {} } }; a.getFlag = (s, k) => a.flags?.[s]?.[k]; return a; };
  const bonusTotal = (a) => (a.flags.swse.bonusForcePoints?.entries ?? []).reduce((x, e) => x + e.value, 0);
  let calls = 0;
  globalThis.Roll = class { constructor(f) { this.f = f; this.total = 6; this.terms = []; } async evaluate() { calls += 1; if (calls === 2) throw new Error('main roll failed'); return this; } };   // call 1 = the Force die, call 2 = the main roll
  try {
    // the main roll fails after a BONUS Force Point paid for the Force die: the bonus point comes back as a bonus point
    { calls = 0; const bonus = { entries: [{ id: 'b1', source: 'Granted', value: 1, max: 1 }], value: 1, max: 1 }; const a = mk({ normal: 5, bonus });
      const r = await silent(() => RollCore.execute({ actor: a, domain: 'skill.test', baseDice: '1d20', baseBonus: 0, rollOptions: { useForce: true }, context: {} }));
      assert.equal(r.success, false); assert.equal(bonusTotal(a), 1, 'the bonus point is back'); assert.equal(a.system.forcePoints.value, 5); assert.deepEqual(ctl.gains, [], 'not routed through the normal pool'); }
    // the refund write fails: the caller is told the point is still spent
    { calls = 0; ctl.gains = []; const a = mk({ normal: 3 }); ctl.armed = false;
      const realUpdate = engine.updateActor; let w = 0; engine.updateActor = async (act, d) => { w += 1; if (w >= 2) throw new Error('simulated refund write failure'); return realUpdate(act, d); };
      const r = await silent(() => RollCore.execute({ actor: a, domain: 'skill.test', baseDice: '1d20', baseBonus: 0, rollOptions: { useForce: true }, context: {} })); engine.updateActor = realUpdate;
      assert.equal(r.success, false); assert.equal(r.forcePointRefundFailed, true, 'a failed refund is reported'); assert.equal(a.system.forcePoints.value, 2); }
    ok('TI-1.1b: RollCore refunds exactly what the Force die spend took (bonus as bonus) and reports a refund that could not be written');
  } finally { restore(); globalThis.Roll = undefined; }
}

// ------------------------------------------------------------------------------------------------ 1.2 TX-06 required action / 1.3 TX-05 ledger scope (equipment coordinator)
{
  const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
  const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
  rt.setSharedWeaponAuthorityRegistry(registry);
  const C = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-coordinator.js');
  const { OUTCOME: O, GM_LOCAL_CONTEXT: GM } = C;
  const SABER = 'lightsaber-chassis-archaic-lightsaber';
  const REC = (posture, purpose, appendageIds) => ({ weaponPosture: posture, weaponOccupancy: { schemaVersion: 1, purpose, appendageIds } });
  const item = (id, system) => ({ id, type: 'weapon', name: 'Renamed Thing', flags: { swse: { canonicalWeapon: { identityKey: SABER } } }, system });
  const actorOf = (actorId, items) => { const a = { id: actorId, type: 'character', system: { size: 'Medium' }, flags: { swse: {} }, items }; items.get = (id) => items.find((i) => i.id === id); return a; };
  const human = { name: 'Human' };
  function depsFor(actor, { spendResult, sharedLedger = null } = {}) {
    const log = { spends: [], itemWrites: 0 };
    const deps = {
      loadSpecies: async () => ({ status: 'resolved', profile: human, reason: null, evidence: { speciesName: 'Human', variantId: null } }),
      isGm: () => true, resolveActionCost: async () => 'move', isLightsaber: async () => false,
      writeItems: async (a, updates) => { log.itemWrites += 1; for (const u of updates) { const it = a.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(it, k, v); } },
      writeJournal: async (a, stored) => { (a.flags.swse ??= {}).equipmentTxn = JSON.parse(JSON.stringify(stored)); },
      spendAction: async (a, type, meta) => { log.spends.push({ type, meta }); return spendResult ?? { allowed: true, committed: true }; },
      spendMarkerPresent: async () => false,
      ...(sharedLedger ? { ledger: sharedLedger } : {}),   // omit to use the coordinator's DEFAULT (module-level) ledger
    };
    return { deps, log };
  }
  const readyIntent = { type: 'ready', itemId: 's', appendageIds: ['natural-arm-1'], grip: 'one-handed' };
  globalThis.game ??= {}; globalThis.game.user = { ...(globalThis.game.user ?? {}), isGM: true };
  async function run(actor, deps, requestId) {
    const plan = await C.planEquipmentIntent(actor, readyIntent, deps);
    return C.executeEquipmentIntent(actor, { requestId, intent: readyIntent, ...(plan.planDigest ? { planDigest: plan.planDigest } : {}) }, { context: GM }, deps);
  }
  const fresh = (id) => actorOf(id, [item('s', REC('STOWED', null, []))]);

  // 1.2: a REQUIRED action is finalized COMMITTED only when it was paid or the authority reported an ESTABLISHED policy no-op
  for (const reason of ['out-of-combat', 'free', 'passive']) {
    const a = fresh(`a-${reason}`); const { deps } = depsFor(a, { spendResult: { allowed: true, permitted: true, committed: false, noOp: true, reason }, sharedLedger: new Map() });
    const out = await run(a, deps, `ti1-policy-${reason}`);
    assert.equal(out.status, O.COMMITTED, `policy no-op "${reason}" still commits (intentional established behavior)`); assert.equal(out.spend, 'not-required'); assert.equal(a.items.get('s').system.weaponPosture, 'READIED');
  }
  for (const [label, spendResult] of [['economy-modules-unavailable', { allowed: true, permitted: true, committed: false, noOp: true, reason: 'economy-modules-unavailable' }], ['unrecognized shape', { allowed: true }], ['empty result', undefined], ['unknown no-op reason', { allowed: true, committed: false, noOp: true, reason: 'something-new' }]]) {
    const a = fresh(`a-${label.slice(0, 5)}`); const { deps } = depsFor(a, { spendResult: spendResult ?? null, sharedLedger: new Map() });
    let asked = 0; const inner = spendResult === undefined ? async () => undefined : deps.spendAction; deps.spendAction = async (...x) => { asked += 1; return inner(...x); };
    const out = await run(a, deps, `ti1-ambiguous-${label.slice(0, 5)}`);
    assert.equal(out.status, O.INDETERMINATE, `"${label}": an unpaid, unexplained required action is INDETERMINATE, not COMMITTED`); assert.notEqual(out.finalized, true);
    assert.ok(out.issues.some((i) => i.code === 'action-spend-indeterminate' || /action/.test(i.code ?? '')), 'blocking issue recorded');
    const again = await run(a, deps, `ti1-ambiguous-${label.slice(0, 5)}`); assert.notEqual(again.status, O.COMMITTED, 'a duplicate of an unresolved id is never replayed as committed'); assert.equal(asked, 1, 'the action authority is not asked again');
  }
  ok('TI-1.2 (TX-06): a required action commits only when paid or on an established policy no-op (out-of-combat / free / passive); an unavailable or unrecognized authority result is INDETERMINATE and never replayed');

  // 1.3: the process-local ledger is scoped by (actor, request id)
  {
    const a1 = fresh('actor-A'); const a2 = fresh('actor-B'); const ledger = new Map();
    const first = await run(a1, depsFor(a1, { sharedLedger: ledger }).deps, 'shared-request-id');
    const d2 = depsFor(a2, { sharedLedger: ledger }); const second = await run(a2, d2.deps, 'shared-request-id');
    assert.equal(first.status, O.COMMITTED); assert.equal(second.status, O.COMMITTED, "another actor's operation may reuse a request id without a false conflict or a false replay"); assert.equal(a2.items.get('s').system.weaponPosture, 'READIED'); assert.equal(d2.log.itemWrites, 1);
    // the same actor and id is still a duplicate; the same id with a DIFFERENT intent on the same actor is still a conflict
    const replay = await run(a1, depsFor(a1, { sharedLedger: ledger }).deps, 'shared-request-id'); assert.equal(replay.status, O.DUPLICATE_REPLAYED);
    const a3 = fresh('actor-C'); const sameActorDefault = depsFor(a3); const o1 = await run(a3, sameActorDefault.deps, 'ti1-default-ledger');   // the module-level DEFAULT ledger
    const a4 = fresh('actor-D'); const o2 = await run(a4, depsFor(a4).deps, 'ti1-default-ledger'); assert.equal(o1.status, O.COMMITTED); assert.equal(o2.status, O.COMMITTED, 'also through the default module-level ledger');
    ok("TI-1.3 (TX-05): the ledger is keyed by (actor, requestId): a different actor reusing an id is neither refused nor replayed; the same actor's duplicate is still replayed");
  }
}

// ------------------------------------------------------------------------------------------------ 1.4 Force Secret payment must be confirmed by the spend receipt
{
  const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
  const fakeEngine = (await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js')).ActorEngine;
  const saved = { spendForcePoints: fakeEngine.spendForcePoints }; const realPrompt = SWSERoll._promptSecretCost;
  const secret = { name: 'Test Secret', img: 'x.png', system: { description: 'd' } };
  const mkActor = (fp) => ({ id: 'fs1', name: 'FS', type: 'character', system: { forcePoints: { value: fp, max: 5 }, destinyPoints: { value: 0 } }, flags: { swse: {} } });
  const run = (actor) => silent(() => SWSERoll._processEnhancements(actor, {}, { techniques: [], secrets: [secret] }));
  try {
    SWSERoll._promptSecretCost = async () => false;   // pay with a Force Point
    for (const [label, impl] of [['the authority spent nothing', async () => ({ spent: 0 })], ['the authority threw', async () => { throw new Error('write failed'); }], ['no receipt at all', async () => undefined]]) {
      fakeEngine.spendForcePoints = impl; notes.warn.length = 0;
      const e = await run(mkActor(2)); assert.deepEqual(e.secrets, [], `${label}: an unpaid Force Secret is NOT applied`); assert.doesNotMatch(e.displayHTML, /Force Point spent/, 'and is not displayed as paid'); assert.ok(notes.warn.some((m) => /not.*(spent|paid|applied)/i.test(m)), 'the player is told');
    }
    let spends = 0; fakeEngine.spendForcePoints = async () => { spends += 1; return { spent: 1 }; };
    const e = await run(mkActor(2)); assert.equal(e.secrets.length, 1); assert.equal(spends, 1); assert.match(e.displayHTML, /Force Point spent/, 'a confirmed payment is applied exactly as before');
    ok('TI-1.4: a Force Secret paid with a Force Point is applied only when the spend receipt confirms a point was spent; otherwise it is skipped and the player is told');
  } finally { Object.assign(fakeEngine, saved); SWSERoll._promptSecretCost = realPrompt; }
}

console.log(`\nTI-1 resource integrity: ${n} checks passed.`);

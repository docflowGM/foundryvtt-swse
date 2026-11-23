// Class/Force x Force V2, Decision A: ActiveAdapter.handleEffect no longer applies an effect and THEN writes the Force Point balance.
// Former behavior: precheck read `actor.system.forcePoints.available` (not a real field), applied the effect to every target, then wrote
// system.forcePoints.value = max(0, available - cost) (latent: could zero the pool; also a free effect if the write failed).
// Now: pay through ActorEngine.spendForcePoints FIRST (authorization decides), apply, then finalize; no effect => exact rollback.
// Real ledger, offline shim. Not FOUNDRY_TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { graftRealForcePointMethods, setPath } from './helpers/real-force-point-engine.mjs';

globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}
};
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {}, once: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.ui = globalThis.ui ?? { notifications: { warn() {}, info() {}, error() {} } };
globalThis.foundry.utils.randomID = (() => { let k = 0; return () => `act-${++k}`; })();
globalThis.game = Object.assign(globalThis.game ?? {}, { user: { id: 'u1', isGM: false }, combat: null, time: { worldTime: 0 } });

const { ActiveAdapter } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/active/active-adapter.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { ActivationLimitEngine } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/ActivationLimitEngine.js');

const writer = async (actor, update) => { for (const [p, v] of Object.entries(update)) setPath(actor, p, v); return actor; };
const { fake: ActorEngine, restore } = await graftRealForcePointMethods(writer);

const order = [];
const wrap = (name) => { const orig = ActorEngine[name]; ActorEngine[name] = async function (...a) { order.push(name); return orig.apply(this, a); }; return () => { ActorEngine[name] = orig; }; };
const unwrap = ['spendForcePoints', 'finalizeForcePointSpend', 'rollbackForcePointSpend'].map(wrap);

const savedPost = SWSEChat.postMessage; SWSEChat.postMessage = async () => {};
const savedCan = ActivationLimitEngine.canActivate; ActivationLimitEngine.canActivate = () => ({ allowed: true });
const savedRec = ActivationLimitEngine.recordActivation; let recorded = 0; ActivationLimitEngine.recordActivation = () => { recorded += 1; };
const savedResolve = ActiveAdapter._resolveTargets; const savedApply = ActiveAdapter._applyEffect;
let applyMode = 'ok'; let applied = [];
ActiveAdapter._applyEffect = async (target) => {
  order.push('applyEffect');
  if (applyMode === 'fail-all' || (applyMode === 'fail-second' && applied.length >= 1)) {
    if (applyMode === 'fail-all') target.system.forcePoints.value += 1;       // an unrelated legitimate regain lands mid-flight
    throw new Error('effect write failed');
  }
  applied.push(target.id);
};

const makeActor = (id, fp = 3) => {
  const a = {
    id, name: id, type: 'character',
    system: { forcePoints: { value: fp, max: 5 }, conditionTrack: { current: 0 }, darkSideScore: { value: 0 }, level: { heroic: 5 } },
    flags: { swse: { bonusForcePoints: { value: 0, entries: [] } } },
    getFlag(scope, name) { return this.flags?.[scope]?.[name]; }
  };
  return a;
};
const ability = (cost) => ({ id: 'abil-1', name: 'Test Surge', system: { executionModel: 'ACTIVE', subType: 'EFFECT', abilityMeta: { cost, targeting: { targetType: 'SELF' }, effect: {} } } });
const ledger = (a) => a.flags?.swse?.forcePointLedger?.receipts ?? [];
const reset = () => { order.length = 0; applied = []; recorded = 0; applyMode = 'ok'; };
let n = 0;
const ok = (label) => { n += 1; console.log(`  [${n}] ${label} OK`); };

try {
  // 1. Denied (no certified contract, non-GM): NO effect, NO charge.
  {
    reset(); const a = makeActor('a1'); ActiveAdapter._resolveTargets = () => [a];
    const r = await ActiveAdapter.handleEffect(a, ability({ forcePoints: 1 }));
    assert.equal(r.success, false);
    assert.match(r.reason, /certified Force Point contract|GM adjudication/);
    assert.ok(!order.includes('applyEffect'), 'no free effect on a denied spend');
    assert.equal(a.system.forcePoints.value, 3); assert.deepEqual(ledger(a), []);
    assert.equal(recorded, 0, 'a denied activation is not recorded as used');
    ok('denied spend: no effect applied, nothing charged, activation not recorded');
  }

  // 2. GM-adjudicated: pay FIRST, then the effect, then finalize; one canonical pool.
  {
    globalThis.game.user.isGM = true;
    reset(); const a = makeActor('a2'); ActiveAdapter._resolveTargets = () => [a];
    const r = await ActiveAdapter.handleEffect(a, ability({ forcePoints: 1 }), { gmAdjudication: { reason: 'GM confirms the surge' } });
    assert.equal(r.success, true);
    assert.deepEqual(order, ['spendForcePoints', 'applyEffect', 'finalizeForcePointSpend'], 'pay -> effect -> finalize (never effect-before-payment)');
    assert.equal(a.system.forcePoints.value, 2);
    assert.equal(ledger(a)[0].state, 'finalized');
    assert.equal(ledger(a)[0].abilitySourceRef, 'active-ability:abil-1');
    assert.equal(recorded, 1);
    ok('authorized spend: payment precedes the effect and the receipt is finalized after it');
  }

  // 3. Multi-point cost is one typed receipt for the whole cost.
  {
    reset(); const a = makeActor('a3', 4); ActiveAdapter._resolveTargets = () => [a];
    // a second spend in the same context is not attempted; the whole cost is one receipt (round cap may deny >1: that is V2's decision)
    const r = await ActiveAdapter.handleEffect(a, ability({ forcePoints: 2 }), { gmAdjudication: { reason: 'adjudicated' } });
    if (r.success) { assert.equal(ledger(a).length, 1); assert.equal(ledger(a)[0].spent, 2); assert.equal(a.system.forcePoints.value, 2); }
    else { assert.equal(a.system.forcePoints.value, 4); assert.deepEqual(ledger(a), []); assert.ok(!order.includes('applyEffect')); }
    ok('a multi-point cost is one typed receipt (or a clean denial by V2 with nothing charged or applied)');
  }

  // 4. The effect fails on the only target: exact rollback of that receipt (an unrelated regain survives).
  {
    reset(); const a = makeActor('a4', 3); ActiveAdapter._resolveTargets = () => [a];
    applyMode = 'fail-all';
    const r = await ActiveAdapter.handleEffect(a, ability({ forcePoints: 1 }), { gmAdjudication: { reason: 'adjudicated' } });
    assert.equal(r.success, false);
    assert.deepEqual(order, ['spendForcePoints', 'applyEffect', 'rollbackForcePointSpend']);
    assert.equal(ledger(a)[0].state, 'rolled-back');
    assert.equal(a.system.forcePoints.value, 4, 'start 3, paid 1 (=2), unrelated regain +1 (=3), exact rollback +1 (=4); no snapshot restore');
    assert.equal(recorded, 0);
    ok('effect fails everywhere: exactly that receipt is compensated and an unrelated regain survives');
  }

  // 5. The effect applied to one target before failing on the next: it exists, so the point is finalized, never refunded.
  {
    reset(); const a = makeActor('a5', 3); const b = makeActor('b5'); ActiveAdapter._resolveTargets = () => [a, b];
    applyMode = 'fail-second';
    const r = await ActiveAdapter.handleEffect(a, ability({ forcePoints: 1 }), { gmAdjudication: { reason: 'adjudicated' } });
    assert.equal(r.success, false);
    assert.deepEqual(applied, ['a5'], 'the first target carries the paid effect');
    assert.deepEqual(order, ['spendForcePoints', 'applyEffect', 'applyEffect', 'finalizeForcePointSpend']);
    assert.equal(ledger(a)[0].state, 'finalized');
    assert.equal(a.system.forcePoints.value, 2, 'not refunded while an applied effect exists');
    ok('partial failure: an applied effect keeps its finalized charge; no refund of a paid effect');
  }

  // 6. An ability with no Force Point cost is unaffected.
  {
    reset(); const a = makeActor('a6'); ActiveAdapter._resolveTargets = () => [a];
    const r = await ActiveAdapter.handleEffect(a, ability({}));
    assert.equal(r.success, true);
    assert.deepEqual(order, ['applyEffect'], 'no spend, no finalize');
    assert.equal(a.system.forcePoints.value, 3); assert.deepEqual(ledger(a), []);
    ok('a no-cost ability is unchanged');
  }

  // 7. structural
  {
    const src = readFileSync(new URL('../scripts/engine/abilities/active/active-adapter.js', import.meta.url), 'utf8');
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.doesNotMatch(code, /forcePoints\??\.available/, 'the non-canonical field is never read');
    assert.doesNotMatch(code, /'system\.forcePoints\.value'\s*:/, 'no direct balance write');
    assert.ok(code.indexOf('spendForcePoints(') < code.indexOf('_applyEffect(target'), 'payment is written before the effect loop');
    ok('structural: no non-canonical read or direct write; payment precedes the effect loop');
  }
} finally {
  unwrap.forEach((u) => u());
  SWSEChat.postMessage = savedPost; ActivationLimitEngine.canActivate = savedCan; ActivationLimitEngine.recordActivation = savedRec;
  ActiveAdapter._resolveTargets = savedResolve; ActiveAdapter._applyEffect = savedApply;
  restore();
}
console.log(`class-force-v2-active-adapter-cutover: ${n} checks passed`);

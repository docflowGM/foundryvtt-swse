// Class/Force x Force V2, Decision A: WeaponsEngine.attuneLightsaber no longer decrements Force Points directly.
// Real ActorEngine Force Point spend / rollback / finalize on a real ledger (offline shim). Not FOUNDRY_TESTED.
//
// Former behavior: wrote BOTH system.forcePoints.value and system.resources.forcePoints.value with no authorization, no round cap,
// no receipt and no rollback, then set the item flag (so a failed flag write left the point charged and nothing attuned).
import assert from 'node:assert/strict';
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
globalThis.foundry.utils.randomID = (() => { let k = 0; return () => `att-${++k}`; })();
globalThis.game = Object.assign(globalThis.game ?? {}, { user: { id: 'u1', isGM: false }, combat: null, time: { worldTime: 0 } });

const { WeaponsEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/weapons-engine.js');

const writer = async (actor, update) => { for (const [p, v] of Object.entries(update)) setPath(actor, p, v); return actor; };
const { fake: ActorEngine, restore } = await graftRealForcePointMethods(writer);

let flagMode = 'ok';                                   // ok | fail-not-applied | fail-but-applied
const savedEmbedded = ActorEngine.updateEmbeddedDocuments;
ActorEngine.updateEmbeddedDocuments = async (actor, _type, updates) => {
  const apply = () => { for (const u of updates) { const doc = actor.items.get(u._id); doc.flags = doc.flags ?? {}; setPath(doc, 'flags.swse.attunedBy', u['flags.swse.attunedBy']); } };
  if (flagMode === 'fail-not-applied') { actor.system.forcePoints.value += 1; throw new Error('flag write failed'); }   // an unrelated legitimate regain lands mid-flight
  apply();
  if (flagMode === 'fail-but-applied') throw new Error('applied, acknowledgement lost');
  return updates;
};

const makeActor = (fp = 3) => {
  const saber = { id: 'saber1', type: 'weapon', system: { subtype: 'lightsaber' }, flags: { swse: { builtBy: 'builder' } } };
  const a = {
    id: 'builder', name: 'Builder', type: 'character',
    system: { forcePoints: { value: fp, max: 5 }, resources: { forcePoints: { value: fp } }, conditionTrack: { current: 0 }, darkSideScore: { value: 0 }, level: { heroic: 5 } },
    flags: { swse: { bonusForcePoints: { value: 0, entries: [] } } },
    getFlag(scope, name) { return this.flags?.[scope]?.[name]; }
  };
  a.items = Object.assign([saber], { get: (id) => [saber].find((i) => i.id === id) });
  return { actor: a, saber };
};
const ledger = (a) => a.flags?.swse?.forcePointLedger?.receipts ?? [];
let n = 0;
const ok = (label) => { n += 1; console.log(`  [${n}] ${label} OK`); };

try {
  // 1. Not the builder / already attuned: unchanged early exits, no charge.
  {
    const { actor, saber } = makeActor();
    assert.equal((await WeaponsEngine.attuneLightsaber(actor, { ...saber, flags: { swse: { builtBy: 'someone-else' } } })).reason, 'not_builder');
    saber.flags.swse.attunedBy = 'builder';
    assert.equal((await WeaponsEngine.attuneLightsaber(actor, saber)).reason, 'already_attuned');
    assert.equal(actor.system.forcePoints.value, 3); assert.deepEqual(ledger(actor), []);
    ok('early exits (not builder / already attuned) charge nothing');
  }

  // 2. A non-GM attunement has no certified Force Point contract (V2 FP-RD-003) => fails closed: no charge, no attunement.
  {
    const { actor, saber } = makeActor();
    const r = await WeaponsEngine.attuneLightsaber(actor, saber);
    assert.equal(r.success, false);
    assert.equal(r.reason, 'force_point_denied');
    assert.match(r.message, /certified Force Point contract|GM adjudication/);
    assert.equal(actor.system.forcePoints.value, 3, 'no charge on denial');
    assert.deepEqual(ledger(actor), [], 'no receipt on denial');
    assert.equal(saber.flags.swse.attunedBy, undefined, 'no free effect on denial');
    ok('uncontracted ability: V2 denies, nothing is charged and nothing is attuned (fail closed)');
  }

  // 3. GM adjudication (verified live user + written reason): one receipted point, one canonical resource, effect, then finality.
  {
    globalThis.game.user.isGM = true;
    const { actor, saber } = makeActor(3);
    const r = await WeaponsEngine.attuneLightsaber(actor, saber, { gmAdjudication: { reason: 'Builder completed the attunement meditation' } });
    assert.deepEqual(r, { success: true });
    assert.equal(actor.system.forcePoints.value, 2, 'exactly one point, from the canonical pool');
    assert.equal(actor.system.resources.forcePoints.value, 3, 'the duplicate legacy resource field is no longer written');
    assert.equal(saber.flags.swse.attunedBy, 'builder');
    assert.equal(ledger(actor).length, 1);
    assert.equal(ledger(actor)[0].state, 'finalized', 'the receipt is settled only after the attunement exists');
    assert.equal(ledger(actor)[0].abilitySourceRef, 'weapons:attuneLightsaber');
    assert.equal(ledger(actor)[0].adjudicatedBy.reason, 'Builder completed the attunement meditation', 'the adjudication is recorded');
    // 4. retry after success never double-charges
    const again = await WeaponsEngine.attuneLightsaber(actor, saber, { gmAdjudication: { reason: 'retry' } });
    assert.equal(again.reason, 'already_attuned');
    assert.equal(actor.system.forcePoints.value, 2); assert.equal(ledger(actor).length, 1);
    ok('GM-adjudicated attunement: one receipted point from one pool, finalized after the effect; a retry cannot double-charge');
  }

  // 5. The flag write fails and did NOT apply: only that receipt is compensated, exactly; nothing is attuned.
  {
    const { actor, saber } = makeActor(3);
    actor.system.forcePoints.value = 3;
    flagMode = 'fail-not-applied';
    const r = await WeaponsEngine.attuneLightsaber(actor, saber, { gmAdjudication: { reason: 'adjudicated' } });
    flagMode = 'ok';
    assert.equal(r.success, false); assert.equal(r.reason, 'attunement_error');
    assert.equal(actor.system.forcePoints.value, 4, 'start 3, paid 1 (=2), an unrelated regain +1 landed mid-flight (=3), exact rollback +1 (=4)');
    assert.equal(ledger(actor)[0].state, 'rolled-back', 'compensated through the exact receipt');
    assert.equal(saber.flags.swse.attunedBy, undefined);
    ok('failed flag write: exact rollback of ONLY that receipt (an unrelated regain survives; no whole-balance snapshot restore)');
  }

  // 6. The flag write APPLIED but the acknowledgement was lost: never refund an applied effect; finalize.
  {
    const { actor, saber } = makeActor(3);
    flagMode = 'fail-but-applied';
    const r = await WeaponsEngine.attuneLightsaber(actor, saber, { gmAdjudication: { reason: 'adjudicated' } });
    flagMode = 'ok';
    assert.equal(r.success, true);
    assert.equal(saber.flags.swse.attunedBy, 'builder');
    assert.equal(actor.system.forcePoints.value, 2, 'the applied attunement keeps its charge (no free attunement via a lost ack)');
    assert.equal(ledger(actor)[0].state, 'finalized');
    ok('write applied but acknowledgement lost: finalized, never refunded');
  }

  // 7. structural: no direct balance write remains
  {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../scripts/engine/combat/weapons-engine.js', import.meta.url), 'utf8');
    const fn = src.slice(src.indexOf('static async attuneLightsaber('), src.indexOf('PHASE 2: CONDITIONAL CRYSTAL EFFECTS'));
    assert.doesNotMatch(fn, /system\.forcePoints\.value|system\.resources\.forcePoints/);
    assert.match(fn, /spendForcePoints\(/); assert.match(fn, /finalizeForcePointSpend\(/); assert.match(fn, /rollbackForcePointSpend\(/);
    ok('structural: attunement uses spend / finalize / rollback and writes no balance field');
  }
} finally {
  ActorEngine.updateEmbeddedDocuments = savedEmbedded;
  restore();
}
console.log(`class-force-v2-attunement-cutover: ${n} checks passed`);

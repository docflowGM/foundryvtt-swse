/**
 * Checkpoint D - manual completion acknowledgments (mutation layer; no UI). Real service, real reader, real reconciler and the real finalizer entitlement check.
 * ActorEngine is a stub that applies the single history patch to an in-memory actor. Node harness only - NOT Foundry V13 acceptance.
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document ??= { addEventListener() {}, createElement: () => ({}) };
globalThis.foundry.applications ??= { api: { ApplicationV2: class {}, DialogV2: class {}, HandlebarsApplicationMixin: (b) => b } };
const { character } = await import('./helpers/recon-fixture.mjs');
const { settleDerived } = await import('./helpers/derived-lifecycle-fixture.mjs');
const S = await import(new URL('../scripts/apps/progression-framework/shell/mutation/ability-acknowledgment-service.js', import.meta.url).href);
const G = await import(new URL('../scripts/apps/progression-framework/shell/mutation/ability-increase-guard.js', import.meta.url).href);
const R = await import(new URL('../scripts/apps/progression-framework/shell/reconciliation/progression-completion-reader.js', import.meta.url).href);
const F = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/reconciliation-findings.js');
const { ProgressionFinalizer } = await import(new URL('../scripts/apps/progression-framework/shell/progression-finalizer.js', import.meta.url).href);
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const { AbilityScorePlanBuilder } = await import(new URL('../scripts/apps/progression-framework/shell/mutation/ability-score-plan-builder.js', import.meta.url).href);
const C = R.COMPLETION; const KEY = G.ABILITY_HISTORY_KEY;
const check = async (name, fn) => { S._resetAcknowledgmentService(); G._resetAbilityIncreaseGuard(); await fn(); console.log(`PASS ${name}`); };

const P1 = { id: 'u1', name: 'Player One', isGM: false }, P2 = { id: 'u2', name: 'Player Two', isGM: false }, OUT = { id: 'u3', name: 'Observer', isGM: false }, GM = { id: 'gm', name: 'GM', isGM: true };
const owners = new Set(['u1', 'u2']);
let mode = 'raw_two_different'; let patches = []; let gate = null;
const engine = { updateActor: async (actor, patch) => { if (gate) await gate; patches.push(patch); for (const [k, v] of Object.entries(patch)) { const p = k.split('.'); let o = actor; for (const x of p.slice(0, -1)) o = (o[x] ??= {}); o[p.at(-1)] = structuredClone(v); } } };
const mkDeps = (actor, over = {}) => ({ engine, entitlementCheck: (l) => ProgressionFinalizer._abilityEntitlementCheck(actor, l, null), getAllocationMode: () => mode, canModify: (a, u) => u.isGM || owners.has(u.id), ...over });
const actorAt = (level, history = []) => {
  const a = character({ classes: [['Soldier', level]] });
  a.id = `ack-actor-${Math.random().toString(36).slice(2, 7)}`;
  a.system.attributes = Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => [k, { base: 12, racial: 0, enhancement: 0, temp: 0 }]));
  a.system.progression.abilityIncreaseHistory = history; a.system.progression.lastAbilityIncrease = { sentinel: true, level: 4 };
  return a;
};
const sysRec = (level, inc, extra = {}) => ({ level, characterLevel: level, entitlementId: `ability-increase-level-${level}`, transactionId: `abtx-${level}`, increases: inc, source: 'progression-finalizer', timestamp: 't', ...extra });
const comp = (a, l = 8) => R.getAbilityIncreaseCompletion(a, l, { expectedCount: 2, maxPerAbility: mode === 'allow_stacked_two' ? 2 : 1 });
const ack = (a, inc, user = P1, over = {}) => S.AbilityAcknowledgmentService.acknowledge(a, { level: 8, increases: inc, user, deps: mkDeps(a, over.deps), origin: over.origin });
const activeAck = (a, idx = 0) => a.system.progression.abilityIncreaseHistory.filter(e => e.source === 'manual-attestation')[idx];
const snap = (a) => JSON.stringify(a.system.attributes);

await check('1. full acknowledgment persists as a MANUAL record, changes no score and no lastAbilityIncrease, and the reader reports PLAYER_ATTESTED', async () => {
  const a = actorAt(9); patches = []; const attrs = snap(a);
  const res = await ack(a, { con: 1, wis: 1 });
  assert.equal(res.status, 'ok', JSON.stringify(res));
  const r = activeAck(a);
  assert.equal(r.source, 'manual-attestation'); assert.equal(r.evidence, 'player-confirmed'); assert.equal(r.appliedBySystem, false); assert.equal(r.status, 'active');
  assert.equal(r.attestedBy, 'u1'); assert.equal(r.entitlementId, 'ability-increase-level-8'); assert.equal(r.level, 8); assert.deepEqual(r.increases, { con: 1, wis: 1 });
  assert.equal(r.transactionId, undefined); assert.equal(r.verification, undefined); assert.match(r.acknowledgmentId, /^ack-/); assert.equal(r.entitledCount, 2); assert.equal(r.allocationMode, 'raw_two_different');
  assert.equal(snap(a), attrs, 'no ability score changed'); assert.deepEqual(a.system.progression.lastAbilityIncrease, { sentinel: true, level: 4 });
  assert.deepEqual(patches.map(p => Object.keys(p)), [[KEY]], 'only the canonical history was written');
  assert.equal(comp(a).classification, C.PLAYER_ATTESTED);
});
await check('2. partial acknowledgment persists; it is PARTIAL (remainder unknown), never a proven shortfall, and raises no reconciliation finding', async () => {
  const a = actorAt(9);
  const res = await ack(a, { con: 1 }); assert.equal(res.status, 'ok'); assert.match(res.message, /partial/i);
  const c = comp(a); assert.equal(c.classification, C.PARTIAL); assert.equal(c.provenShortfall, false); assert.equal(c.remainingUnknown, 1);
  const report = ProgressionReconciler.safeReconcileActor(settleDerived(a), { output: 'report', fresh: true });
  const slot = report.slots.abilityIncreases.find(s => s.characterLevel === 8);
  assert.equal(slot.status, 'unverifiable'); assert.equal(slot.openCount, 0); assert.equal(slot.filledCount, 1);
  assert.equal(F.buildFindings(report).some(f => /ABILITY_INCREASE/.test(f.code)), false);
});
await check('3. a second valid acknowledgment completes the remainder; the whole is PLAYER_ATTESTED', async () => {
  const a = actorAt(9); await ack(a, { con: 1 }); const res = await ack(a, { wis: 1 });
  assert.equal(res.status, 'ok'); assert.equal(comp(a).classification, C.PLAYER_ATTESTED); assert.equal(a.system.progression.abilityIncreaseHistory.length, 2);
});
await check('4. a duplicate acknowledgment is idempotent (no second record, no write)', async () => {
  const a = actorAt(9); await ack(a, { con: 1, wis: 1 }); patches = [];
  const again = await ack(a, { wis: 1, con: 1 });
  assert.equal(again.status, 'unchanged'); assert.equal(again.code, 'ALREADY_ACKNOWLEDGED'); assert.equal(patches.length, 0); assert.equal(a.system.progression.abilityIncreaseHistory.length, 1);
});
await check('5. invalid, overlapping and excessive claims are refused without writing', async () => {
  const a = actorAt(9); await ack(a, { con: 1 }); patches = [];
  const cases = [
    [{ con: 1 }, P2, 'OVERLAPPING_CLAIM'], [{ wis: 1, str: 1 }, P1, 'EXCEEDS_ENTITLEMENT'], [{ con: 2 }, P1, 'ALLOCATION_NOT_ALLOWED'], [{}, P1, 'EMPTY_SELECTION'],
    [{ foo: 1 }, P1, 'UNKNOWN_ABILITY'], [{ wis: 0.5 }, P1, 'INVALID_SELECTION_VALUE'], [{ wis: 'x' }, P1, 'INVALID_SELECTION_VALUE'], [{ wis: -1 }, P1, 'INVALID_SELECTION_VALUE'], [null, P1, 'INVALID_SELECTION'],
  ];
  for (const [inc, user, code] of cases) { const res = await ack(a, inc, user); assert.equal(res.status, 'refused', JSON.stringify(inc)); assert.equal(res.code, code, JSON.stringify(inc)); }
  assert.equal(patches.length, 0); assert.equal(a.system.progression.abilityIncreaseHistory.length, 1);
});
await check('6. a system-applied record is never overwritten: a COMPLETE system record refuses any acknowledgment and is preserved byte for byte', async () => {
  const sys = sysRec(8, { con: 1, wis: 1 }); const a = actorAt(9, [sys]); const before = JSON.stringify(a.system.progression.abilityIncreaseHistory);
  const res = await ack(a, { str: 1 }); assert.equal(res.code, 'ALREADY_SATISFIED');
  assert.equal(JSON.stringify(a.system.progression.abilityIncreaseHistory), before);
});
await check('7. a PARTIAL system record coexists with a complementary attestation: both preserved, whole is PLAYER_ATTESTED (mixed), nothing claimed as verified', async () => {
  const a = actorAt(9, [sysRec(8, { con: 1 })]); const sys0 = JSON.stringify(a.system.progression.abilityIncreaseHistory[0]);
  const res = await ack(a, { wis: 1 }); assert.equal(res.status, 'ok');
  const c = comp(a); assert.equal(c.classification, C.PLAYER_ATTESTED); assert.equal(c.mixed, true); assert.deepEqual(c.applied, { con: 1 }); assert.deepEqual(c.attested, { wis: 1 }); assert.equal(c.verification, 'committed-unverified');
  assert.equal(JSON.stringify(a.system.progression.abilityIncreaseHistory.find(e => e.source === 'progression-finalizer')), sys0);
  assert.equal((await ack(a, { str: 1 }, P2)).code, 'EXCEEDS_ENTITLEMENT', 'the entitlement is now fully accounted for'); assert.equal((await ack(a, { con: 1 }, P2)).code, 'OVERLAPPING_CLAIM');
});
await check('8. withdrawal removes the statement from the active count, keeps it in the history, is idempotent, and cannot be resurrected', async () => {
  const a = actorAt(9); await ack(a, { con: 1, wis: 1 }); const id = activeAck(a).acknowledgmentId;
  const res = await S.AbilityAcknowledgmentService.withdraw(a, { acknowledgmentId: id, user: P1, deps: mkDeps(a) });
  assert.equal(res.status, 'ok');
  const rec = a.system.progression.abilityIncreaseHistory[0];
  assert.equal(rec.status, 'withdrawn'); assert.equal(rec.withdrawnBy, 'u1'); assert.deepEqual(rec.increases, { con: 1, wis: 1 }); assert.equal(comp(a).classification, C.UNVERIFIABLE);
  patches = []; assert.equal((await S.AbilityAcknowledgmentService.withdraw(a, { acknowledgmentId: id, user: P1, deps: mkDeps(a) })).status, 'unchanged'); assert.equal(patches.length, 0);
  assert.equal((await S.AbilityAcknowledgmentService.correct(a, { acknowledgmentId: id, increases: { str: 1, dex: 1 }, user: P1, deps: mkDeps(a) })).code, 'NOT_ACTIVE');
  assert.equal(a.system.progression.abilityIncreaseHistory[0].status, 'withdrawn');
  assert.equal((await ack(a, { con: 1, wis: 1 })).status, 'ok', 'a fresh statement is a NEW record, not a resurrection');
});
await check('9. correction preserves the original (superseded, linked) and only the new selection counts', async () => {
  const a = actorAt(9); await ack(a, { con: 1, wis: 1 }); const id = activeAck(a).acknowledgmentId;
  const res = await S.AbilityAcknowledgmentService.correct(a, { acknowledgmentId: id, increases: { str: 1, dex: 1 }, user: P1, deps: mkDeps(a) });
  assert.equal(res.status, 'ok');
  const [orig, repl] = a.system.progression.abilityIncreaseHistory;
  assert.equal(orig.status, 'superseded'); assert.equal(orig.supersededBy, repl.acknowledgmentId); assert.deepEqual(orig.increases, { con: 1, wis: 1 }); assert.equal(orig.supersessionKind, 'correction');
  assert.equal(repl.correctionOf, orig.acknowledgmentId); assert.equal(repl.evidence, 'player-confirmed'); assert.deepEqual(repl.increases, { str: 1, dex: 1 });
  const c = comp(a); assert.deepEqual(c.attested, { str: 1, dex: 1 }); assert.equal(c.inactive, 1);
  assert.equal((await S.AbilityAcknowledgmentService.correct(a, { acknowledgmentId: repl.acknowledgmentId, increases: { dex: 1, str: 1 }, user: P1, deps: mkDeps(a) })).status, 'unchanged');
});
await check('10. GM supersession deactivates the INTENDED record only: an unrelated player acknowledgment for the same entitlement keeps counting', async () => {
  const a = actorAt(9); await ack(a, { con: 1 }, P1); await ack(a, { wis: 1 }, P2);
  const target = a.system.progression.abilityIncreaseHistory.find(e => e.attestedBy === 'u1').acknowledgmentId;
  const res = await S.AbilityAcknowledgmentService.supersede(a, { acknowledgmentId: target, increases: { dex: 1 }, user: GM, deps: mkDeps(a) });
  assert.equal(res.status, 'ok');
  const h = a.system.progression.abilityIncreaseHistory;
  assert.equal(h.find(e => e.acknowledgmentId === target).status, 'superseded'); assert.equal(h.find(e => e.attestedBy === 'u2').status, 'active');
  const gmRec = h.find(e => e.evidence === 'gm-authorized'); assert.equal(gmRec.supersedes, target); assert.equal(gmRec.attestedBy, 'gm');
  const c = comp(a); assert.deepEqual(c.attested, { wis: 1 }); assert.deepEqual(c.gmAuthorized, { dex: 1 }); assert.equal(c.classification, C.PLAYER_ATTESTED);
});
await check('11. authorization: only the author (who can modify) or a GM may correct / withdraw; only a GM may supersede; non-owners cannot acknowledge; a player cannot touch a GM statement', async () => {
  const a = actorAt(9); await ack(a, { con: 1 }, P1); const id = activeAck(a).acknowledgmentId; patches = [];
  const svc = S.AbilityAcknowledgmentService;
  assert.equal((await svc.correct(a, { acknowledgmentId: id, increases: { str: 1 }, user: P2, deps: mkDeps(a) })).code, 'NOT_AUTHORIZED');
  assert.equal((await svc.withdraw(a, { acknowledgmentId: id, user: P2, deps: mkDeps(a) })).code, 'NOT_AUTHORIZED');
  assert.equal((await svc.supersede(a, { acknowledgmentId: id, increases: { str: 1 }, user: P1, deps: mkDeps(a) })).code, 'NOT_AUTHORIZED');
  assert.equal((await svc.supersede(a, { acknowledgmentId: id, increases: { str: 1 }, user: P2, deps: mkDeps(a) })).code, 'NOT_AUTHORIZED');
  assert.equal((await ack(a, { wis: 1 }, OUT)).code, 'NOT_AUTHORIZED');
  assert.equal((await ack(a, { wis: 1 }, P1, { origin: 'gm' })).code, 'NOT_AUTHORIZED', 'a player cannot claim GM origin');
  assert.equal((await ack(a, { wis: 1 }, null)).code, 'NOT_AUTHORIZED');
  const author = new Set(); // the author loses modify permission
  assert.equal((await svc.withdraw(a, { acknowledgmentId: id, user: P1, deps: mkDeps(a, { canModify: (x, u) => u.isGM || author.has(u.id) }) })).code, 'NOT_AUTHORIZED');
  assert.equal(patches.length, 0); assert.equal(a.system.progression.abilityIncreaseHistory[0].status, 'active');
  await ack(a, { wis: 1 }, GM, { origin: 'gm' }); const gmId = a.system.progression.abilityIncreaseHistory.find(e => e.evidence === 'gm-authorized').acknowledgmentId;
  assert.equal((await svc.withdraw(a, { acknowledgmentId: gmId, user: P1, deps: mkDeps(a) })).code, 'NOT_AUTHORIZED');
  assert.equal((await svc.withdraw(a, { acknowledgmentId: id, user: GM, deps: mkDeps(a) })).status, 'ok', 'a GM may withdraw a player statement');
});
await check('12. deferred (droid / Nonheroic) entitlements reject acknowledgment; an unknown or missing entitlement is refused', async () => {
  const d = actorAt(9); d.type = 'droid'; patches = [];
  assert.equal((await ack(d, { con: 1 })).code, 'ENTITLEMENT_COUNT_DEFERRED');
  const a = actorAt(9);
  assert.equal((await S.AbilityAcknowledgmentService.acknowledge(a, { level: 5, increases: { con: 1 }, user: P1, deps: mkDeps(a) })).code, 'ENTITLEMENT_NOT_FOUND');
  assert.equal((await S.AbilityAcknowledgmentService.acknowledge(a, { level: 12, increases: { con: 1 }, user: P1, deps: mkDeps(a) })).code, 'ENTITLEMENT_NOT_FOUND');
  assert.equal((await ack(a, { con: 1 }, P1, { deps: { entitlementCheck: () => ({ exists: true, count: null }) } })).code, 'ENTITLEMENT_COUNT_UNKNOWN');
  assert.equal((await ack(a, { con: 1 }, P1, { deps: { entitlementCheck: null } })).code, 'ENTITLEMENT_UNVALIDATED');
  assert.equal((await ack(a, { con: 1 }, P1, { deps: { getAllocationMode: () => null } })).code, 'ALLOCATION_RULE_UNKNOWN');
  assert.equal((await ack(a, { con: 1 }, P1, { deps: { engine: null } })).code, 'ENGINE_UNAVAILABLE');
  assert.equal(patches.length, 0);
});
await check('13. house rules: the allocation rule governs the selection, and a rule / entitlement change during preparation refuses the write', async () => {
  const a = actorAt(9);
  assert.equal((await ack(a, { con: 2 })).code, 'ALLOCATION_NOT_ALLOWED');
  mode = 'allow_stacked_two';
  try { assert.equal((await ack(a, { con: 2 })).status, 'ok'); assert.equal(comp(a).classification, C.PLAYER_ATTESTED); } finally { mode = 'raw_two_different'; }
  const b = actorAt(9); let calls = 0; patches = [];
  const flip = { getAllocationMode: () => (++calls <= 1 ? 'raw_two_different' : 'allow_stacked_two') };
  const res = await ack(b, { con: 1 }, P1, { deps: flip });
  assert.equal(res.code, 'ENTITLEMENT_CHANGED'); assert.equal(patches.length, 0);
});
await check('14. stale history is refused: newer history that lands while preparing is never overwritten', async () => {
  const a = actorAt(9, [sysRec(4, { str: 1, dex: 1 })]); patches = []; let n = 0;
  const hook = { entitlementCheck: (l) => { n += 1; if (n === 2) a.system.progression.abilityIncreaseHistory[0].increases = { str: 1, wis: 1 }; return ProgressionFinalizer._abilityEntitlementCheck(a, l, null); } };
  const res = await ack(a, { con: 1 }, P1, { deps: hook });
  assert.equal(res.code, 'HISTORY_CHANGED'); assert.equal(patches.length, 0); assert.deepEqual(a.system.progression.abilityIncreaseHistory[0].increases, { str: 1, wis: 1 });
});
await check('15. concurrent operations on one entitlement from this client: the second is refused while the first is saving', async () => {
  const a = actorAt(9); let release; gate = new Promise(r => { release = r; });
  const first = ack(a, { con: 1 }); await new Promise(r => setImmediate(r));
  const second = await ack(a, { wis: 1 }, P2); assert.equal(second.code, 'OPERATION_IN_PROGRESS');
  release(); gate = null; assert.equal((await first).status, 'ok'); assert.equal(a.system.progression.abilityIncreaseHistory.length, 1);
});
await check('16. interplay with system Apply: an active acknowledgment blocks a new additive Apply, and an acknowledgment added after an Apply was compiled makes that plan stale', async () => {
  const a = actorAt(9); await ack(a, { con: 1, wis: 1 });
  const attr = { mode: 'levelup-ability-increase', increases: { str: 1, dex: 1 }, abilityIncreaseLevel: 8, slotId: 'ability-increase-level-8', characterLevel: 8 };
  const session = { mode: 'levelup', progressionSession: { reconciliation: { mode: 'reconcile' }, draftSelections: { attributes: attr } } };
  assert.throws(() => ProgressionFinalizer._applyAbilityScoreBuilder(a, session, { set: {} }), e => e.code === 'ENTITLEMENT_ALREADY_RECORDED');
  const b = actorAt(9); const plan = { set: {} }; ProgressionFinalizer._applyAbilityScoreBuilder(b, session, plan);
  await ack(b, { con: 1 });
  globalThis.game.swse = { ActorEngine: { applyMutationPlan: async () => { throw new Error('must not be called'); }, updateActor: engine.updateActor } };
  const res = await ProgressionFinalizer._applyMutationPlan(b, plan);
  assert.equal(res.success, false); assert.ok(['ENTITLEMENT_ALREADY_RECORDED', 'HISTORY_CHANGED'].includes(res.code), res.code);
  assert.equal(b.system.attributes.str.base, 12);
});
await check('17. reconciliation and the reader stay read-only, and no state (unknown, partial, withdrawn, attested) yields a confirmed discrepancy from missing history alone', async () => {
  for (const setup of [async () => actorAt(9), async () => { const a = actorAt(9); await ack(a, { con: 1 }); return a; }, async () => { const a = actorAt(9); await ack(a, { con: 1, wis: 1 }); await S.AbilityAcknowledgmentService.withdraw(a, { acknowledgmentId: activeAck(a).acknowledgmentId, user: P1, deps: mkDeps(a) }); return a; }, async () => { const a = actorAt(9); await ack(a, { con: 1, wis: 1 }); return a; }]) {
    const a = await setup(); settleDerived(a); const before = JSON.stringify(a); patches = [];
    const report = ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true });
    comp(a); R.getAbilityIncreaseCompletions(a, [{ level: 8, expectedCount: 2 }]);
    assert.equal(JSON.stringify(a), before); assert.equal(patches.length, 0);
    assert.equal(F.buildFindings(report).some(f => /ABILITY_INCREASE/.test(f.code)), false);
  }
});
await check('18. wiring (static): the service writes only through the injected ActorEngine and touches only the canonical history key', async () => {
  const fs = await import('node:fs'); const src = fs.readFileSync('scripts/apps/progression-framework/shell/mutation/ability-acknowledgment-service.js', 'utf8');
  assert.doesNotMatch(src, /system\.attributes|lastAbilityIncrease'|\.update\(|setFlag|actor\.system\.[a-zA-Z.]+\s*=[^=]/);
  assert.match(src, /engine\.updateActor\(actor, \{ \[ABILITY_HISTORY_KEY\]:/);
});
console.log('ability-acknowledgment-service.test.mjs: all assertions passed');

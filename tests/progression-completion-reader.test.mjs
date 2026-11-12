/** Checkpoint B - the read-only progression completion reader and its use by the reconciler. Real reader, real builder output. Node harness only. */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
const R = await import(new URL('../scripts/apps/progression-framework/shell/reconciliation/progression-completion-reader.js', import.meta.url).href);
const { AbilityScorePlanBuilder } = await import(new URL('../scripts/apps/progression-framework/shell/mutation/ability-score-plan-builder.js', import.meta.url).href);
const { character } = await import('./helpers/recon-fixture.mjs');
const { settleDerived } = await import('./helpers/derived-lifecycle-fixture.mjs');
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const C = R.COMPLETION;
const check = (name, fn) => { fn(); console.log(`PASS ${name}`); };
const actorWith = (history, extra = {}) => { const a = character({ classes: [['Soldier', 8]] }); a.system.progression.abilityIncreaseHistory = history; Object.assign(a.system.progression, extra); return a; };
const sys = (level, inc, extra = {}) => ({ level, characterLevel: level, increases: inc, source: 'progression-finalizer', ...extra });
const manual = (level, inc, extra = {}) => ({ level, characterLevel: level, increases: inc, source: 'manual-attestation', evidence: 'player-confirmed', appliedBySystem: false, ...extra });
const comp = (a, level = 8, ctx = { expectedCount: 2 }) => R.getAbilityIncreaseCompletion(a, level, ctx);

check('1. no history: UNVERIFIABLE (never open / discrepancy)', () => {
  const c = comp(actorWith([]));
  assert.equal(c.classification, C.UNVERIFIABLE); assert.equal(c.provenShortfall, false); assert.equal(c.remainingUnknown, 2); assert.equal(c.entitlementId, 'ability-increase-level-8');
});
check('2. the reader consumes the ACTUAL persisted builder output (id, level, selections)', () => {
  const a = actorWith([]);
  const set = AbilityScorePlanBuilder.buildLevelUpSet({ actor: a, attr: { mode: 'levelup-ability-increase', increases: { con: 1, wis: 1 }, abilityIncreaseLevel: 8 }, manifest: null, getAllocationMode: () => 'raw_two_different', source: 'progression-finalizer' });
  a.system.progression.abilityIncreaseHistory = set['system.progression.abilityIncreaseHistory'];
  const c = comp(a);
  assert.equal(c.classification, C.SYSTEM_COMMITTED_UNVERIFIED); assert.deepEqual(c.applied, { con: 1, wis: 1 }); assert.equal(c.verification, 'committed-unverified');
});
check('3. a committed record is NOT verified until a verification marker exists; a failed/absent verification never becomes SYSTEM_VERIFIED', () => {
  assert.equal(comp(actorWith([sys(8, { con: 1, wis: 1 })])).classification, C.SYSTEM_COMMITTED_UNVERIFIED);
  assert.equal(comp(actorWith([sys(8, { con: 1, wis: 1 }, { verification: { state: 'failed' } })])).classification, C.SYSTEM_COMMITTED_UNVERIFIED);
  assert.equal(comp(actorWith([sys(8, { con: 1, wis: 1 }, { verification: { state: 'verified', sessionId: 's1' } })])).classification, C.SYSTEM_VERIFIED);
  assert.deepEqual(comp(actorWith([sys(8, { con: 1, wis: 1 }, { verification: { state: 'verified', sessionId: 's1' } })])).references.sessionIds, ['s1']);
});
check('4. Q2: unrecognised provenance is preserved and visible but never trusted as system evidence', () => {
  for (const rec of [{ level: 8, increases: { con: 1, wis: 1 } }, { level: 8, increases: { con: 1, wis: 1 }, source: 'hand-edit' }, manual(8, { con: 1, wis: 1 }, { evidence: undefined })]) {
    const c = comp(actorWith([rec]));
    assert.equal(c.classification, C.UNVERIFIABLE); assert.equal(c.legacy.length, 1); assert.deepEqual(c.legacy[0].increases, { con: 1, wis: 1 }); assert.ok(c.conflicts.includes('unrecognized-provenance-record'));
  }
});
check('5. a short SYSTEM record is a proven shortfall (PARTIAL + provenShortfall)', () => {
  const c = comp(actorWith([sys(8, { con: 1 })]));
  assert.equal(c.classification, C.PARTIAL); assert.equal(c.provenShortfall, true); assert.equal(c.remainingUnknown, 1);
});
check('6. Q3: full, partial and GM attestations; partial manual evidence is NOT a proven shortfall', () => {
  assert.equal(comp(actorWith([manual(8, { con: 1, wis: 1 })])).classification, C.PLAYER_ATTESTED);
  const p = comp(actorWith([manual(8, { con: 1 })]));
  assert.equal(p.classification, C.PARTIAL); assert.equal(p.provenShortfall, false); assert.equal(p.remainingUnknown, 1); assert.deepEqual(p.attested, { con: 1 });
  assert.equal(comp(actorWith([manual(8, { con: 1, wis: 1 }, { evidence: 'gm-authorized' })])).classification, C.GM_AUTHORIZED);
});
check('7. withdrawn / superseded statements do not count; duplicates do not count twice', () => {
  assert.equal(comp(actorWith([manual(8, { con: 1, wis: 1 }, { status: 'withdrawn' })])).classification, C.UNVERIFIABLE);
  const sup = comp(actorWith([manual(8, { con: 1, wis: 1 }, { status: 'superseded' }), manual(8, { str: 1, dex: 1 }, { evidence: 'gm-authorized' })]));
  assert.equal(sup.classification, C.GM_AUTHORIZED); assert.deepEqual(sup.gmAuthorized, { str: 1, dex: 1 }); assert.equal(sup.inactive, 1);
  const dup = comp(actorWith([manual(8, { con: 1 }), manual(8, { con: 1 })]));
  assert.equal(dup.classification, C.PARTIAL); assert.deepEqual(dup.attested, { con: 1 });
});
check('8. C1: an attestation coexisting with a system record never overrides it (reported conflict; system counts)', () => {
  const c = comp(actorWith([sys(8, { con: 1, wis: 1 }), manual(8, { str: 1, dex: 1 })]));
  assert.equal(c.classification, C.SYSTEM_COMMITTED_UNVERIFIED); assert.deepEqual(c.applied, { con: 1, wis: 1 }); assert.deepEqual(c.attested, {});
  assert.ok(c.conflicts.includes('system-and-manual-records-coexist'));
});
check('9. Q1 / C7: deferred (droid / Nonheroic) entitlements never accept attestations as completion; recorded history stays visible', () => {
  const c = comp(actorWith([manual(8, { con: 1 })]), 8, { expectedCount: 1, rulesDeferred: true });
  assert.equal(c.classification, C.UNVERIFIABLE); assert.deepEqual(c.attested, {}); assert.equal(c.rulesDeferred, true);
  const s = comp(actorWith([sys(8, { con: 1 })]), 8, { expectedCount: 1, rulesDeferred: ['RECON-002'] });
  assert.equal(s.classification, C.SYSTEM_COMMITTED_UNVERIFIED); assert.deepEqual(s.applied, { con: 1 });
});
check('10. C6: lastAbilityIncrease never overrides canonical history, and is only supplementary legacy evidence for an untracked level', () => {
  const stale = actorWith([manual(8, { con: 1, wis: 1 })], { lastAbilityIncrease: sys(8, { str: 1, dex: 1 }) });
  assert.equal(comp(stale).classification, C.PLAYER_ATTESTED); assert.deepEqual(comp(stale).attested, { con: 1, wis: 1 });
  const only = actorWith([], { lastAbilityIncrease: sys(8, { str: 1, dex: 1 }) });
  assert.equal(comp(only).classification, C.SYSTEM_COMMITTED_UNVERIFIED);
  assert.equal(comp(actorWith([], { lastAbilityIncrease: sys(4, { str: 1, dex: 1 }) })).classification, C.UNVERIFIABLE, 'other level: ignored');
});
check('11. house-rule / count changes re-evaluate WITHOUT rewriting records; Ignore is never evidence; the reader is read-only', () => {
  const a = actorWith([manual(8, { con: 1 })]); a.flags.swse.reconciliationIgnored = [{ id: 'ability-increase-level-8' }];
  const frozen = JSON.stringify(a);
  assert.equal(comp(a, 8, { expectedCount: 2 }).classification, C.PARTIAL);
  assert.equal(comp(a, 8, { expectedCount: 1 }).classification, C.PLAYER_ATTESTED, 'entitlement changed: re-evaluated');
  assert.equal(JSON.stringify(a), frozen, 'no mutation');
  assert.equal(comp(actorWith([]) ).classification, C.UNVERIFIABLE);
});
check('12. invalid level and unsupported entitlement ids are UNVERIFIABLE, never guessed; batch API', () => {
  assert.equal(R.getAbilityIncreaseCompletion(actorWith([]), 0, { expectedCount: 2 }).classification, C.UNVERIFIABLE);
  assert.equal(R.getEntitlementCompletion(actorWith([]), 'general-feat-3').supported, false);
  assert.equal(R.getEntitlementCompletion(actorWith([sys(4, { str: 1, dex: 1 })]), 'ability-increase-level-4', { expectedCount: 2 }).classification, C.SYSTEM_COMMITTED_UNVERIFIED);
  const m = R.getAbilityIncreaseCompletions(actorWith([sys(4, { str: 1, dex: 1 })]), [{ level: 4, expectedCount: 2 }, { level: 8, expectedCount: 2 }]);
  assert.equal(m.get(4).classification, C.SYSTEM_COMMITTED_UNVERIFIED); assert.equal(m.get(8).classification, C.UNVERIFIABLE);
});
check('13. the reconciler consumes the reader: slot status / counts / completion block follow the classification (no finding from unknown or partial manual evidence)', () => {
  const slotOf = (hist) => ProgressionReconciler.safeReconcileActor(settleDerived(actorWith(hist)), { output: 'report', fresh: true }).slots.abilityIncreases.find(s => s.characterLevel === 8);
  assert.equal(slotOf([]).status, 'unverifiable');
  assert.equal(slotOf([manual(8, { con: 1, wis: 1 })]).status, 'filled'); assert.equal(slotOf([manual(8, { con: 1, wis: 1 })]).completion.classification, 'PLAYER_ATTESTED');
  const part = slotOf([manual(8, { con: 1 })]);
  assert.equal(part.status, 'unverifiable'); assert.equal(part.openCount, 0); assert.equal(part.filledCount, 1); assert.equal(part.unverifiableCount, 1);
  const proven = slotOf([sys(8, { con: 1 })]);
  assert.equal(proven.status, 'open'); assert.equal(proven.openCount, 1);
});
console.log('progression-completion-reader.test.mjs: all assertions passed');

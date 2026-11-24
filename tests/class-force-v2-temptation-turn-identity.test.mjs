// Slice 6V re-derived on the V2 spend-time evidence model: the Temptation next-turn window is decided by combatant IDENTITY and the
// current initiative ORDER, never by comparing a stale turn index, and the order is captured in the spend evidence so a late replay
// is judged against the order at the moment of the spend. Pure/offline. Not FOUNDRY_TESTED.
import assert from 'node:assert/strict';
import { temptationWindowOpenAt, temptationMarksActiveAt, temptationSpendEvidence, planTemptationSpendFromEvidence } from '../scripts/engine/progression/utils/sith-lord-temptation-state.js';

const mark = (o = {}) => ({ id: 'sith:enc:2:3', sourceActorId: 'sith', sourceCombatantId: 'cb-sith', targetActorId: 'tgt', encounterId: 'enc', createdRound: 2, createdTurn: 3, state: 'active', ...o });
const target = (marks) => ({ id: 'tgt', flags: { swse: { classFeatures: { sithLord: { temptation: marks } } } } });
const turns = (...ids) => ids.map((id) => ({ id }));
const combat = (round, ids, current, over = {}) => ({ id: 'enc', started: true, round, turn: ids.indexOf(current), turns: turns(...ids), combatant: { id: current }, ...over });
let n = 0; const ok = (l) => { n += 1; console.log(`  [${n}] ${l} OK`); };

// created while the source was in slot 3 (createdTurn 3)
{
  // next round the GM moved the source LATER (slot 5); the recipient acts in slot 4. The old rule (turn 4 >= createdTurn 3) wrongly closed it.
  const c = combat(3, ['a', 'b', 'c', 'cb-x', 'tgtc', 'cb-sith'], 'tgtc');
  assert.equal(c.turn, 4); assert.equal(temptationMarksActiveAt(target([mark()]), c).length, 1, 'recipient acts before the moved source: still inside the window');
  ok('source moved LATER: a recipient whose index is >= the old createdTurn still qualifies');
}
{
  // source moved EARLIER (slot 0); recipient in slot 2 of the same round: the source's turn has already begun
  const c = combat(3, ['cb-sith', 'a', 'tgtc', 'b'], 'tgtc');
  assert.equal(c.turn, 2); assert.equal(c.turn < 3 + 1, true); // the stale index (2 < createdTurn 3) would have said open
  assert.equal(temptationMarksActiveAt(target([mark()]), c).length, 0, 'source already acted this round: window closed');
  ok('source moved EARLIER: a recipient whose index is < the old createdTurn no longer qualifies');
}
{
  // boundaries: creation round is always open; at the source's own turn closed; past the next round closed; wrong encounter closed
  const order = ['a', 'cb-sith', 'tgtc'];
  assert.equal(temptationWindowOpenAt(mark(), { round: 2, combatantId: 'tgtc', order, turn: 2 }), true, 'creation round: open regardless of order');
  assert.equal(temptationWindowOpenAt(mark(), { round: 3, combatantId: 'cb-sith', order, turn: 1 }), false, "the source's own turn: closed");
  assert.equal(temptationWindowOpenAt(mark(), { round: 4, combatantId: 'a', order, turn: 0 }), false, 'two rounds later: closed');
  assert.equal(temptationWindowOpenAt(mark(), { round: 1, combatantId: 'a', order, turn: 0 }), false, 'before creation: closed');
  assert.equal(temptationMarksActiveAt(target([mark({ encounterId: 'other' })]), combat(3, ['a', 'cb-sith', 'tgtc'], 'a')).length, 0, 'another encounter: closed');
  ok('window boundaries: creation round open, source turn closed, +2 rounds closed, other encounter closed');
}
{
  // fail closed on anything unverifiable in the NEXT round
  const base = { round: 3, combatantId: 'a', order: ['a', 'cb-sith'], turn: 0 };
  assert.equal(temptationWindowOpenAt(mark(), base), true);
  assert.equal(temptationWindowOpenAt(mark(), { ...base, order: null }), false, 'no order');
  assert.equal(temptationWindowOpenAt(mark(), { ...base, order: ['a', 'zzz'] }), false, 'source combatant missing from the order');
  assert.equal(temptationWindowOpenAt(mark(), { ...base, combatantId: 'ghost' }), false, 'current combatant not in the order');
  assert.equal(temptationWindowOpenAt(mark(), { ...base, combatantId: null }), false, 'no current combatant');
  assert.equal(temptationWindowOpenAt(mark(), { ...base, turn: 1 }), false, 'combat.turn disagrees with the order');
  assert.equal(temptationWindowOpenAt(mark({ sourceCombatantId: undefined }), base), false, 'mark without a source combatant');
  ok('missing/inconsistent order, source, current combatant, or turn index fails closed in the next round');
}
{
  // spend-time evidence carries the order, so a late replay is judged against the order AT THE SPEND, not the order now
  const t = target([mark()]);
  const spendCombat = combat(3, ['tgtc', 'cb-sith', 'z'], 'tgtc');
  const evidence = temptationSpendEvidence(t, spendCombat);
  assert.deepEqual(evidence.order, ['tgtc', 'cb-sith', 'z']); assert.equal(evidence.marks.length, 1);
  // later the GM reorders so the source is first and the encounter moves on; the recorded evidence is unchanged
  const plan = planTemptationSpendFromEvidence({ target: t, evidence, event: { actorId: 'tgt', receiptId: 'r1', spent: 1, resource: 'force' } });
  assert.equal(plan.eligible, true); assert.equal(plan.consequences.length, 1);
  // evidence for a spend made after the source's turn started carries no qualifying mark
  const late = temptationSpendEvidence(t, combat(3, ['cb-sith', 'tgtc'], 'tgtc'));
  assert.equal(late.marks.length, 0);
  // tampered snapshot: an order that puts the recipient after the source does not qualify
  const forged = { ...evidence, order: ['cb-sith', 'tgtc', 'z'], turn: 1 };
  assert.equal(planTemptationSpendFromEvidence({ target: t, evidence: forged, event: { actorId: 'tgt', receiptId: 'r2', spent: 1, resource: 'force' } }).eligible, false);
  ok('spend-time evidence records the order; late replay is judged at the spend; a forged order cannot manufacture eligibility');
}
console.log(`class-force-v2-temptation-turn-identity: ${n} checks passed`);

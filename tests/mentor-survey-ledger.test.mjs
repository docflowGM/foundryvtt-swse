import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(ROOT, 'scripts/mentor/mentor-survey-v2/intent-ledger.js')).href);
const C = await import(pathToFileURL(path.join(ROOT, 'scripts/mentor/mentor-survey-v2/contract.js')).href);

const payload = (over = {}) => ({ surveyKind: 'l1', scopeId: 'l1', definitionVersion: 1, contextRevision: 'r1', answers: { q2: { optionId: 'l1.q2.diplomat' } }, ...over });
const goal = (id, lane = 'l1.career') => ({ goalLane: lane, target: { type: 'archetype_parent', id }, questionId: 'q2', optionId: `l1.q2.${id}` });
const build = (over = {}) => L.buildCompletionEvents({ payload: payload(), transactionId: 'tx1', actorLevel: 1, completedAt: '2026-11-15T00:00:00Z', goals: [goal('diplomat')], existingEvents: [], ...over });
const actorWith = (events) => ({ flags: { 'foundryvtt-swse': { mentorSurvey: { events } } } });

test('SV-10 ledger path is the single flags.foundryvtt-swse.mentorSurvey.events owner', () => {
  assert.equal(C.LEDGER_SET_PATH, 'flags.foundryvtt-swse.mentorSurvey.events');
  const patch = L.buildLedgerSetPatch(actorWith([]), build());
  assert.deepEqual(Object.keys(patch), [C.LEDGER_SET_PATH]);
});

test('SV-12 nothing is written until the finalizer builds a patch: an empty or canceled survey yields no patch', () => {
  assert.deepEqual(L.buildLedgerSetPatch(actorWith([]), []), {});
  assert.deepEqual(L.buildCompletionEvents({ payload: null, transactionId: 'tx1' }), []);
  assert.deepEqual(L.buildCompletionEvents({ payload: payload(), transactionId: null }), [], 'no transaction means no events');
});

test('SV-11 duplicate finalize is idempotent: same transaction produces the same event ids and no second append', () => {
  const first = build();
  const merged = L.mergeEvents([], first);
  assert.equal(merged.appended.length, first.length);
  const again = L.mergeEvents(merged.events, build());
  assert.equal(again.appended.length, 0);
  assert.equal(again.duplicates.length, first.length);
  assert.deepEqual(L.buildLedgerSetPatch(actorWith(merged.events), build()), {}, 'second finalize patches nothing');
});

test('SV-02 only an explicit goal declaration creates a goal event; completion alone declares nothing', () => {
  const none = build({ goals: [] });
  assert.deepEqual(none.map((e) => e.type), ['survey_completed']);
  const withGoal = build();
  assert.deepEqual(withGoal.map((e) => e.type), ['survey_completed', 'goal_declaration']);
  assert.equal(withGoal[1].target.id, 'diplomat');
});

test('SV-25 retakes supersede and never edit or erase history; goals are revised, not overwritten', () => {
  const e1 = build();
  const ledger1 = L.mergeEvents([], e1).events;
  const e2 = build({ transactionId: 'tx2', goals: [goal('spy')], existingEvents: ledger1 });
  assert.equal(e2[0].supersedes, e1[0].eventId);
  assert.equal(e2[1].type, 'goal_revision');
  assert.equal(e2[1].supersedes, e1[1].eventId);
  const ledger2 = L.mergeEvents(ledger1, e2).events;
  assert.ok(L.isAppendOnly(ledger1, ledger2));
  assert.equal(ledger2.length, ledger1.length + e2.length, 'history preserved');
  const { goals } = L.reduceLedger(ledger2);
  assert.equal(goals['l1.career'].target.id, 'spy', 'current goal is the latest non-superseded');
  // Nothing is summed: a third identical retake still yields exactly one active goal
  const e3 = build({ transactionId: 'tx3', goals: [goal('spy')], existingEvents: ledger2 });
  const ledger3 = L.mergeEvents(ledger2, e3).events;
  assert.equal(Object.keys(L.reduceLedger(ledger3).goals).length, 1);
});

test('SV-25 a retake does not erase a previous goal in a different lane', () => {
  const e1 = build({ goals: [goal('diplomat', 'l1.career'), goal('x', 'l1.long_term_ambition')] });
  const ledger = L.mergeEvents([], e1).events;
  const e2 = build({ transactionId: 'tx2', goals: [goal('spy', 'l1.career')], existingEvents: ledger });
  const { goals } = L.reduceLedger(L.mergeEvents(ledger, e2).events);
  assert.equal(goals['l1.career'].target.id, 'spy');
  assert.equal(goals['l1.long_term_ambition'].target.id, 'x');
});

test('SV-10 editorial-preview events are excluded from every reader by default', () => {
  const preview = build({ preview: true });
  const ledger = L.mergeEvents([], preview).events;
  assert.deepEqual(L.reduceLedger(ledger).goals, {});
  assert.equal(Object.keys(L.reduceLedger(ledger, { includePreview: true }).goals).length, 1);
});

test('SV-10 event ids are deterministic and independent of wall-clock time', () => {
  const a = build({ completedAt: '2026-01-01T00:00:00Z' });
  const b = build({ completedAt: '2030-01-01T00:00:00Z' });
  assert.deepEqual(a.map((e) => e.eventId), b.map((e) => e.eventId));
});

test('SV-10 the ledger rejects non-append-only rewrites', () => {
  const a = L.mergeEvents([], build()).events;
  const tampered = a.map((e) => ({ ...e, completedAt: 'x' }));
  assert.equal(L.isAppendOnly(a, tampered), false);
  assert.equal(L.isAppendOnly(a, a.slice(0, 1)), false);
});

test('MC-07/PR-06 depth is a self-report in the completion payload only: it is not a goal and never a level lock', () => {
  const e = build({ payload: payload({ surveyKind: 'multiclass', scopeId: 'jedi', answers: { q3: { optionId: 'multiclass.q3.dive' } } }), goals: [] });
  assert.deepEqual(e.map((x) => x.type), ['survey_completed']);
  assert.equal(e[0].actorLevel, 1, 'the self-report is scoped to the level at which it was made');
  const keys = Object.keys(e[0]);
  assert.ok(!keys.some((k) => /lock|quota|required|minLevels|targetLevels/i.test(k)), 'no level lock or quota fields');
  assert.equal(e[0].answers.q3.optionId, 'multiclass.q3.dive');
});

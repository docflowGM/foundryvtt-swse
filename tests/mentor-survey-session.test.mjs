import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = await import(pathToFileURL(path.join(ROOT, 'scripts/mentor/mentor-survey-v2/survey-session.js')).href);

const flow = {
  surveyKind: 'l1', scopeId: 'l1', definitionVersion: 1,
  questions: ['q1', 'q2', 'q3', 'q4', 'q5'],
  deps: { q1: { inputs: ['classId'] }, q2: { inputs: ['classId'] }, q3: { inputs: ['classId'], after: ['q1'] }, q4: { after: ['q2'] }, q5: { inputs: ['classId'] } },
};
let seq = 0;
const next = () => ++seq;
const start = () => { seq = 0; return S.createDraft(flow, { classId: 'jedi', species: 'human' }); };
const pick = (d, q, o) => S.selectAnswer(flow, d, q, o, next()).draft;

test('SV-13 draft starts in progress with no answers and cursor at q1', () => {
  const d = start();
  assert.equal(d.status, 'in_progress'); assert.deepEqual(d.answers, {}); assert.equal(d.cursor, 'q1');
});

test('SV-03/SV-13 skipping a question or the survey records nothing; skipped/canceled/in-progress produce no commit payload', () => {
  let d = start();
  d = S.skipQuestion(flow, d, 'q1', next()).draft;
  assert.deepEqual(d.answers, {});
  assert.equal(S.toCommitPayload(flow, d), null);
  const skipped = S.skipSurvey(flow, d, next()).draft;
  assert.equal(skipped.status, 'skipped'); assert.equal(S.toCommitPayload(flow, skipped), null);
  const canceled = S.cancel(flow, start(), 1).draft;
  assert.equal(canceled.status, 'canceled'); assert.equal(S.toCommitPayload(flow, canceled), null);
});

test('SV-03 browsing and paging record no answer; back navigation never alters answers', () => {
  let d = start();
  d = S.recordBrowse(flow, d, 'q2', { seenIds: ['a', 'b', 'c'], pageIndex: 2 }, next()).draft;
  assert.deepEqual(d.answers, {});
  assert.deepEqual(S.getBrowse(flow, d, 'q2').seenIds, ['a', 'b', 'c']);
  d = pick(d, 'q1', 'q1.a');
  const before = JSON.stringify(d.answers);
  d = S.goBack(flow, d, next()).draft;
  assert.equal(JSON.stringify(d.answers), before);
});

test('SV-11 duplicate and replayed actions are ignored', () => {
  let d = start();
  const r1 = S.selectAnswer(flow, d, 'q1', 'q1.a', 5);
  assert.equal(r1.applied, true);
  const r2 = S.selectAnswer(flow, r1.draft, 'q1', 'q1.b', 5);
  assert.equal(r2.applied, false);
  assert.equal(r2.draft.answers.q1.optionId, 'q1.a');
  const r3 = S.selectAnswer(flow, r1.draft, 'q1', 'q1.b', 4);
  assert.equal(r3.applied, false);
});

test('SV-13 deterministic: same inputs give the same revisions and payload', () => {
  const run = () => { seq = 0; let d = start(); d = pick(d, 'q1', 'q1.a'); d = pick(d, 'q2', 'p.x'); return JSON.stringify([d.answers, S.questionRevision(flow, d, 'q3')]); };
  assert.equal(run(), run());
});

test('L1-12 upstream change invalidates dependents without silent replacement; Q3 never changes Q4', () => {
  let d = start();
  d = pick(d, 'q1', 'q1.a'); d = pick(d, 'q2', 'parent.diplomat'); d = pick(d, 'q3', 'q3.a'); d = pick(d, 'q4', 'q4.a');
  const q4Rev = d.answers.q4.revision;
  // Changing the Q3 answer must not touch Q4 (Q4 depends only on Q2)
  d = pick(d, 'q3', 'q3.b');
  assert.equal(d.answers.q4.optionId, 'q4.a'); assert.equal(d.answers.q4.revision, q4Rev);
  assert.equal(d.answers.q2.optionId, 'parent.diplomat');
  // Changing Q2 invalidates Q4 (not replaced), keeps Q3 and Q1
  d = pick(d, 'q2', 'parent.spy');
  assert.equal(d.answers.q4, undefined);
  assert.deepEqual(d.invalidated.q4, { reason: 'upstream_changed', previousOptionId: 'q4.a' });
  assert.equal(d.answers.q3.optionId, 'q3.b');
  // Changing Q1 invalidates Q3 only
  d = pick(d, 'q1', 'q1.z');
  assert.deepEqual(d.invalidated.q3, { reason: 'upstream_changed', previousOptionId: 'q3.b' });
});

test('SV-13 changed context (class) invalidates dependent answers; an invalidated answer may be re-confirmed only if still offered', () => {
  let d = start();
  d = pick(d, 'q1', 'q1.a'); d = pick(d, 'q5', 'q5.a');
  d = S.updateContext(flow, d, { classId: 'noble' }, next()).draft;
  assert.ok(d.invalidated.q1 && d.invalidated.q5);
  assert.equal(d.answers.q1, undefined);
  assert.equal(S.complete(flow, d, next()).applied, false, 'invalidated answers block completion');
  const no = S.reconfirmInvalidated(flow, d, 'q1', ['q1.other'], next());
  assert.equal(no.applied, false);
  const yes = S.reconfirmInvalidated(flow, d, 'q1', ['q1.a'], next());
  assert.equal(yes.applied, true); assert.equal(yes.draft.answers.q1.optionId, 'q1.a'); assert.equal(yes.draft.invalidated.q1, undefined);
});

test('SV-13 unrelated context changes do not invalidate; browse snapshots rebuild on context change', () => {
  let d = start();
  d = pick(d, 'q4', 'q4.a');
  d = S.recordBrowse(flow, d, 'q1', { seenIds: ['x'], pageIndex: 1 }, next()).draft;
  d = S.updateContext(flow, d, { species: 'wookiee' }, next()).draft;
  assert.equal(d.answers.q4.optionId, 'q4.a');
  assert.ok(S.getBrowse(flow, d, 'q1'), 'species is not an input of q1');
  d = S.updateContext(flow, d, { classId: 'scout' }, next()).draft;
  assert.equal(S.getBrowse(flow, d, 'q1'), null);
});

test('SV-13 complete requires every question answered or skipped; payload contains only answers', () => {
  let d = start();
  assert.equal(S.complete(flow, d, next()).applied, false);
  for (const q of flow.questions) d = pick(d, q, `${q}.opt`);
  const done = S.complete(flow, d, next()).draft;
  assert.equal(done.status, 'completed');
  const payload = S.toCommitPayload(flow, done);
  assert.deepEqual(Object.keys(payload.answers), flow.questions);
  assert.ok(!('browse' in payload) && !('invalidated' in payload) && !('trail' in payload));
});

test('SV-13 a completed survey may omit skipped questions and still commit only the answered ones', () => {
  let d = start();
  d = pick(d, 'q1', 'q1.a');
  for (const q of ['q2', 'q3', 'q4', 'q5']) d = S.skipQuestion(flow, d, q, next()).draft;
  const done = S.complete(flow, d, next()).draft;
  assert.deepEqual(Object.keys(S.toCommitPayload(flow, done).answers), ['q1']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mod = (f) => import(pathToFileURL(path.join(ROOT, 'scripts/mentor/mentor-survey-v2', f)).href);
const C = await mod('contract.js');
const S = await mod('content-store.js');
const B = await mod('tag-boundary.js');

const rec = (over = {}) => ({ id: 'l1.jedi.q1.guardian', text: 'I want to protect people who cannot protect themselves.', editorialStatus: 'owner_approved_text', mechanicsStatus: 'none', sourceRef: { commit: 'abc' }, ...over });

test('SV-07 player-selectable text must be first person', () => {
  assert.deepEqual(S.validateResponseRecord(rec()), []);
  assert.ok(S.validateResponseRecord(rec({ text: 'Becoming a Jedi Master is the goal.' })).some((p) => /first person/.test(p)));
  assert.ok(S.validateResponseRecord(rec({ text: 'This is the path of the guardian.' })).some((p) => /first person/.test(p)));
  assert.ok(S.validateResponseRecord(rec({ text: 'The character defends others.' })).some((p) => /first person/.test(p)));
  assert.equal(S.isFirstPerson("I'm not sure yet."), true);
});

test('SV-08 player text leaks (ids, tag ids, percentages, metadata) are rejected; ordinary prose is not', () => {
  assert.ok(S.findLeaks('I want ranged_precision at 80%').length >= 2);
  assert.ok(S.findLeaks('q4.scout.tracking.seed01').length >= 1);
  assert.ok(S.findLeaks('I want to build my confidence and settle the score.').length === 0);
  assert.ok(S.validateResponseRecord(rec({ text: 'I want `tag_id` now.' })).some((p) => /leaks/.test(p)));
});

test('SV-08 view options are built by allow-list: internal fields never reach the view', () => {
  const full = rec({ detail: 'You will learn the basics.', internal: { tags: ['x_y'], editorialFocus: 'direct protection' }, tags: ['a_b'], score: 3 });
  const view = S.toViewOption(full);
  assert.deepEqual(Object.keys(view).sort(), ['detail', 'optionId', 'text']);
  assert.deepEqual(S.scanViewForLeaks({ options: [view] }), []);
  assert.ok(S.scanViewForLeaks({ options: [{ ...view, tags: ['x'] }] }).length > 0);
  assert.ok(S.scanViewForLeaks({ options: [{ ...view, text: 'weight: 3' }] }).length > 0);
});

test('SV-09 release gate: withheld scopes are not playable; draft text is not playable; preview is explicit', () => {
  const manifest = { surveys: { l1: { jedi: { releaseState: 'released' }, noble: { releaseState: 'withheld', reason: 'awaiting sign-off' } } } };
  assert.deepEqual(S.evaluateScopeRelease(manifest, 'l1', 'jedi'), { playable: true, reason: 'released' });
  assert.deepEqual(S.evaluateScopeRelease(manifest, 'l1', 'noble'), { playable: false, reason: 'awaiting sign-off' });
  assert.equal(S.evaluateScopeRelease(manifest, 'l1', 'noble', { preview: true }).playable, true);
  assert.equal(S.evaluateScopeRelease(manifest, 'l1', 'missing', { preview: true }).playable, false, 'no entry means no content, even in preview');
  assert.equal(S.isRecordPlayable(rec()), true);
  assert.equal(S.isRecordPlayable(rec({ editorialStatus: 'draft_text' })), false);
  assert.equal(S.isRecordPlayable(rec({ editorialStatus: 'draft_text' }), { preview: true }), true);
  assert.equal(S.isRecordPlayable(rec({ mechanicsStatus: 'unverified_mechanic', presentsMechanic: true }), { preview: true }), false, 'unverified mechanics are never offered');
});

test('SV-05 revisions and stable stringify are deterministic and key-order independent', () => {
  assert.equal(C.revisionOf({ a: 1, b: [1, 2] }), C.revisionOf({ b: [1, 2], a: 1 }));
  assert.notEqual(C.revisionOf({ a: 1 }), C.revisionOf({ a: 2 }));
});

test('SV-16/SV-17 tag boundary is inert: every response is unmapped and emits no signal', () => {
  B.resetTagBoundary();
  assert.deepEqual(B.mapResponseToIntent(rec(), {}), { status: 'unmapped' });
  assert.deepEqual(B.mapResponseToIntent({ id: 'anything' }), { status: 'unmapped' });
  // A later certified mapper must explicitly return status "mapped"; anything else stays unmapped.
  B.setCertifiedMapper(() => ({ tags: ['x'] }));
  assert.deepEqual(B.mapResponseToIntent(rec()), { status: 'unmapped' });
  B.resetTagBoundary();
});

test('SV-02 surveys may write only the declared-goal and inferred-identity lanes', () => {
  assert.deepEqual([...C.WRITABLE_LANES].sort(), ['declared_future_goal', 'inferred_current_identity']);
  assert.ok(!C.WRITABLE_LANES.includes(C.LANES.VERIFIED_MECHANICAL_ELIGIBILITY));
  assert.ok(!C.WRITABLE_LANES.includes(C.LANES.FINALIZED_ACQUISITION));
});

test('L1-02/SV-05 L1 has exactly five questions; multiclass and prestige have six; depth excludes bridge', () => {
  assert.deepEqual(C.QUESTION_IDS.l1, ['q1', 'q2', 'q3', 'q4', 'q5']);
  assert.equal(C.QUESTION_IDS.multiclass.length, 6);
  assert.equal(C.QUESTION_IDS.prestige.length, 6);
  assert.deepEqual([...C.DEPTH_IDS], ['dip', 'dive', 'swim', 'undecided']);
  assert.ok(!C.DEPTH_IDS.includes('bridge'));
});

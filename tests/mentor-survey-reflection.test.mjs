import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = 'scripts/mentor/mentor-survey-v2';
const E = await import(pathToFileURL(path.join(ROOT, dir, 'actor-evidence.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, dir, 'reflection.js')).href);
const L = await import(pathToFileURL(path.join(ROOT, dir, 'intent-ledger.js')).href);

const item = (type, name, extra = {}) => ({ type, name, id: `id-${name}`, system: {}, flags: {}, ...extra });
const actor = (items = [], skills = {}) => ({ items, system: { skills } });
const rich = actor([
  item('class', 'Soldier', { system: { level: 3 } }), item('class', 'Scout', { system: { level: 1 } }),
  item('feat', 'Point-Blank Shot', { flags: { swse: { canonicalFeat: { canonicalId: 'f1' } } } }),
  item('feat', 'Weapon Focus'), item('talent', 'Battle Analysis', { flags: { swse: { id: 't1' } } }), item('talent', 'Harm\'s Way'),
], { stealth: { trained: true }, climb: { trained: false }, perception: { trained: true } });
const thin = actor([item('class', 'Noble', { system: { level: 1 } })]);

const ARCH = { diplomat: { id: 'diplomat', kind: 'parent' }, envoy: { id: 'envoy', kind: 'specialization', parentId: 'diplomat' }, spy: { id: 'spy', kind: 'parent' } };
const lookup = (id) => ARCH[id] || null;
const claims = [
  { claimId: 'c.parent', claimKind: 'archetype_parent', canonicalRef: { id: 'diplomat', kind: 'parent' } },
  { claimId: 'c.role', claimKind: 'role_inference' }, { claimId: 'c.method', claimKind: 'method_preference' },
  { claimId: 'c.theme', claimKind: 'mechanical_theme_identity' }, { claimId: 'c.trend', claimKind: 'past_to_present_trend' },
  { claimId: 'c.motive', claimKind: 'motivation_inference' }, { claimId: 'c.over', claimKind: 'overconfidence' },
  { claimId: 'c.goalrel', claimKind: 'goal_relationship' },
];
const am = [{ candidateId: 'am.spy', canonicalRef: { id: 'spy', kind: 'parent' } }, { candidateId: 'am.diplomat', canonicalRef: { id: 'diplomat', kind: 'parent' } }];
const read = (a, over = {}) => R.createReading({ surveyKind: 'prestige', scopeId: 'ace_pilot', projection: E.projectActorEvidence(a), claims, amCandidates: am, archetypeLookup: lookup, actorRevision: 'rev1', ...over });

test('SV-14 evidence projection reads only finalized actor state and cites sources for every fact', () => {
  const p = E.projectActorEvidence(rich);
  assert.equal(p.characterLevel, 4);
  assert.deepEqual(p.classLevels, { soldier: 3, scout: 1 });
  assert.ok(p.facts.every((f) => f.source.itemId || f.source.path));
  assert.ok(p.facts.some((f) => f.kind === 'trained_skill' && f.canonicalId === 'skill:stealth'));
  assert.ok(!p.facts.some((f) => f.canonicalId === 'skill:climb'), 'untrained skill is not evidence');
});

test('SV-15 evidence cannot be inferred from survey responses, pending selections or eligibility', () => {
  const withNoise = { ...rich, pendingSelections: { classes: ['Jedi Master'] }, system: { ...rich.system, swse: { surveyResponses: { jedi: 1 } }, eligibleClasses: ['Jedi Master'] }, flags: { 'foundryvtt-swse': { mentorSurvey: { events: [] } } } };
  assert.deepEqual(E.projectActorEvidence(withNoise).facts, E.projectActorEvidence(rich).facts);
  assert.ok(!E.projectActorEvidence(withNoise).facts.some((f) => /jedi/i.test(f.label)));
});

test('SV-19 at most three real observations; thin actors get fewer, never padded', () => {
  const full = E.selectObservations(E.projectActorEvidence(rich));
  assert.equal(full.length, 3);
  assert.ok(new Set(full.map((f) => f.kind)).size >= 2, 'spreads across kinds');
  assert.equal(E.selectObservations(E.projectActorEvidence(thin)).length, 0);
  const one = actor([item('class', 'Scout', { system: { level: 2 } }), item('feat', 'Skill Focus')]);
  assert.equal(E.selectObservations(E.projectActorEvidence(one)).length, 1);
  assert.equal(read(thin).evidenceState, 'none');
  assert.equal(read(one).evidenceState, 'thin');
  assert.equal(read(rich).evidenceState, 'full');
});

test('SV-14 high-level actor: observations stay capped at three and are deterministic', () => {
  const many = actor(Array.from({ length: 40 }, (_, i) => item('feat', `Feat ${i}`)).concat([item('class', 'Soldier', { system: { level: 12 } }), item('class', 'Officer', { system: { level: 8 } })]));
  const a = E.selectObservations(E.projectActorEvidence(many));
  const b = E.selectObservations(E.projectActorEvidence(many));
  assert.equal(a.length, 3); assert.deepEqual(a.map((f) => f.factId), b.map((f) => f.factId));
  assert.equal(E.projectActorEvidence(many).characterLevel, 20);
});

test('SV-18 reading is frozen, deterministic and validates canonical refs exactly', () => {
  const r1 = read(rich), r2 = read(rich);
  assert.equal(r1.readingId, r2.readingId);
  assert.ok(Object.isFrozen(r1) && Object.isFrozen(r1.claims));
  assert.deepEqual(r1.identity.canonicalRef, { id: 'diplomat', kind: 'parent' });
  const wrongKind = read(rich, { claims: [{ claimId: 'x', claimKind: 'archetype_specialization', canonicalRef: { id: 'diplomat', kind: 'specialization', parentId: 'diplomat' } }] });
  assert.equal(wrongKind.identity.status, 'unresolved'); assert.equal(wrongKind.rejected.length, 1);
  const badParent = read(rich, { claims: [{ claimId: 'x', claimKind: 'archetype_specialization', canonicalRef: { id: 'envoy', kind: 'specialization', parentId: 'spy' } }] });
  assert.equal(badParent.identity.status, 'unresolved');
  const ok = read(rich, { claims: [{ claimId: 'x', claimKind: 'archetype_specialization', canonicalRef: { id: 'envoy', kind: 'specialization', parentId: 'diplomat' } }] });
  assert.equal(ok.identity.canonicalRef.id, 'envoy');
});

test('SV-14 claims may not cite facts the actor lacks', () => {
  const r = read(rich, { claims: [{ claimId: 'g', claimKind: 'method_preference', groundedBy: ['fact.999.feat.invented'] }] });
  assert.equal(r.claims.length, 0); assert.equal(r.rejected.length, 1);
  const real = E.projectActorEvidence(rich).facts[0].factId;
  assert.equal(read(rich, { claims: [{ claimId: 'g', claimKind: 'method_preference', groundedBy: [real] }] }).claims.length, 1);
  assert.equal(read(thin, { claims: [] }).identity.status, 'unresolved', 'no identity is invented for thin evidence');
});

test('SV-20 declared goal is quoted separately; absence is honest; goal is never inferred', () => {
  assert.equal(read(rich).goalDeclared, false); assert.equal(read(rich).goal, null);
  const events = L.mergeEvents([], L.buildCompletionEvents({ payload: { surveyKind: 'l1', scopeId: 'l1', definitionVersion: 1, contextRevision: 'x', answers: {} }, transactionId: 't', completedAt: 'now', goals: [{ goalLane: 'l1.career', target: { type: 'archetype_parent', id: 'spy' }, questionId: 'q2', optionId: 'o', quote: 'I want to be a spy.' }] })).events;
  const r = read(rich, { events });
  assert.equal(r.goalDeclared, true); assert.equal(r.goal.target.id, 'spy'); assert.equal(r.goal.quote, 'I want to be a spy.');
  assert.notEqual(r.identity.canonicalRef?.id, r.goal.target.id, 'identity lane and goal lane stay separate');
});

test('SV-27/PR-01 fulfillment only when a typed class goal equals finalized class state', () => {
  const mk = (type, id) => ({ target: { type, id } });
  assert.equal(R.verifyGoalFulfillment(mk('class', 'soldier'), { soldier: 3 }).fulfilled, true);
  assert.equal(R.verifyGoalFulfillment(mk('class', 'jedi_master'), { soldier: 3 }).fulfilled, false);
  assert.equal(R.verifyGoalFulfillment(mk('archetype_parent', 'spy'), { spy: 3 }).fulfilled, false, 'an archetype aspiration is not a class');
  assert.equal(R.verifyGoalFulfillment(mk('response_only', null), {}).fulfilled, false);
});

test('SV-21/SV-22 A is a no-op with no follow-up; B and C are targeted with caps; counts are caps not quotas', () => {
  const r = read(rich);
  let s = R.chooseCalibration(r, R.beginCalibration(r), 'A');
  assert.equal(s.stage, 'done');
  const fin = R.finishCalibration(r, s);
  assert.equal(fin.noop, true);
  const b = R.chooseCalibration(r, R.beginCalibration(r), 'B'); assert.equal(b.notShown.length, 2);
  const c = R.chooseCalibration(r, R.beginCalibration(r), 'C'); assert.equal(c.notShown.length, 3);
  assert.equal(R.chooseCalibration(r, R.beginCalibration(r), 'D').notShown.length, 5);
  assert.equal(R.chooseCalibration(r, R.beginCalibration(r), 'E').notShown.length, 7);
  const sparse = read(rich, { claims: claims.slice(0, 2) });
  assert.equal(R.chooseCalibration(sparse, R.beginCalibration(sparse), 'E').notShown.length, 2, 'sparse evidence shows fewer real options');
  assert.equal(R.chooseCalibration(read(thin, { claims: [] }), R.beginCalibration(read(thin, { claims: [] })), 'E').notShown.length, 0);
});

test('SV-21 D and E require BOTH NOT and AM stages; they cannot finish early or skip AM', () => {
  const r = read(rich);
  for (const ch of ['D', 'E']) {
    let s = R.chooseCalibration(r, R.beginCalibration(r), ch);
    assert.equal(s.stage, 'not');
    assert.equal(R.finishCalibration(r, s).ok, false, 'cannot finish before AM');
    assert.equal(R.selectAm(r, s, ['am.spy']).ok, false, 'cannot answer AM before NOT');
    s = R.selectNot(r, s, ['c.role']);
    assert.equal(s.stage, 'am'); assert.deepEqual(s.amShown, ['am.spy', 'am.diplomat']);
    assert.equal(R.finishCalibration(r, s).ok, false, 'still cannot finish before AM');
    s = R.selectAm(r, s, ['am.spy']);
    const f = R.finishCalibration(r, s);
    assert.equal(f.ok, true); assert.deepEqual(f.rejectedClaimIds, ['c.role']); assert.deepEqual(f.affirmedCandidateIds, ['am.spy']);
  }
  // B and C go straight to done after NOT
  let b = R.selectNot(r, R.chooseCalibration(r, R.beginCalibration(r), 'B'), ['c.parent']);
  assert.equal(b.stage, 'done');
});

test('SV-23 NOT can reject only INFERENCES shown in the frozen reading, never facts, goals or unshown claims', () => {
  const r = read(rich);
  const s = R.chooseCalibration(r, R.beginCalibration(r), 'B');
  const fact = E.projectActorEvidence(rich).facts[0].factId;
  assert.equal(R.selectNot(r, s, [fact]).ok, false, 'owned fact cannot be disputed');
  assert.equal(R.selectNot(r, s, ['c.over']).ok, false, 'claim beyond the shown cap');
  assert.equal(R.selectNot(r, s, ['not-in-reading']).ok, false);
  assert.equal(R.selectNot(r, s, ['c.parent']).ok, true);
  const d = R.chooseCalibration(r, R.beginCalibration(r), 'D');
  const afterNot = R.selectNot(r, d, []);
  assert.equal(R.selectAm(r, afterNot, ['am.not-offered']).ok, false);
});

test('SV-23/SV-24 correction events change nothing but the inference record and carry no negative weight', () => {
  const r = read(rich);
  let s = R.chooseCalibration(r, R.beginCalibration(r), 'D');
  s = R.selectAm(r, R.selectNot(r, s, ['c.parent', 'c.role']), ['am.spy']);
  const events = R.buildReflectionEvents({ reading: r, result: R.finishCalibration(r, s), transactionId: 'tx', completedAt: 'now' });
  assert.deepEqual(events.map((e) => e.type), ['reflection_snapshot', 'reflection_correction']);
  const c = events[1];
  assert.equal(c.negativeWeight, false); assert.equal(c.mutatesMechanics, false); assert.equal(c.mutatesGoals, false); assert.equal(c.mutatesEligibility, false);
  assert.equal(c.lane, 'inferred_current_identity');
  assert.ok(events.every((e) => e.lane === 'inferred_current_identity'));
  assert.ok(!JSON.stringify(c).match(/"weight"|"score"/));
  // Declining an offered identity (rejecting the parent claim) yields only interpretation feedback ids
  assert.deepEqual(R.correctionsFor(events, 'prestige', 'ace_pilot')[0].rejectedClaimIds, ['c.parent', 'c.role']);
});

test('SV-21/SV-24 a no-op A confirmation records a snapshot only, no correction and no inference about the player', () => {
  const r = read(rich);
  const s = R.chooseCalibration(r, R.beginCalibration(r), 'A');
  const events = R.buildReflectionEvents({ reading: r, result: R.finishCalibration(r, s), transactionId: 'tx', completedAt: 'now' });
  assert.deepEqual(events.map((e) => e.type), ['reflection_snapshot']);
});

test('SV-25 retaking Q6 supersedes the prior snapshot and never accumulates calibration weight', () => {
  const r = read(rich);
  const done = (tx, existing) => R.buildReflectionEvents({ reading: r, result: R.finishCalibration(r, R.chooseCalibration(r, R.beginCalibration(r), 'A')), transactionId: tx, completedAt: 'now', existingEvents: existing });
  const e1 = done('t1', []);
  const ledger1 = L.mergeEvents([], e1).events;
  const e2 = done('t2', ledger1);
  assert.equal(e2[0].supersedes, e1[0].eventId);
  assert.equal(L.mergeEvents(ledger1, e2).events.length, 2, 'history kept; nothing summed');
});

test('SV-02/PR-04 reflection leaves goals and acquisitions untouched: it emits no goal events and no acquisition fields', () => {
  const r = read(rich);
  let s = R.chooseCalibration(r, R.beginCalibration(r), 'E');
  s = R.selectAm(r, R.selectNot(r, s, ['c.parent', 'c.role', 'c.method', 'c.theme', 'c.trend']), ['am.spy']);
  const events = R.buildReflectionEvents({ reading: r, result: R.finishCalibration(r, s), transactionId: 'tx', completedAt: 'now' });
  assert.ok(!events.some((e) => /goal_/.test(e.type)));
  assert.ok(!JSON.stringify(events).match(/"feats"|"talents"|"classLevels"|"prerequisite/));
});

test('SV-24 droid classes and restricted Force users get the same engine: identity is read-only and class-agnostic', () => {
  const droid = actor([item('class', 'Independent Droid', { system: { level: 3 } }), item('talent', 'Autonomy Talent')]);
  const force = actor([item('class', 'Jedi', { system: { level: 5 } }), item('class', 'Jedi Knight', { system: { level: 2 } }), item('feat', 'Force Sensitivity')]);
  assert.deepEqual(E.projectActorEvidence(droid).classLevels, { independent_droid: 3 });
  assert.deepEqual(E.projectActorEvidence(force).classLevels, { jedi: 5, jedi_knight: 2 });
  assert.equal(read(droid).surveyKind, 'prestige');
});

test('PR-08 multiple prestige acquisitions: each reflection is its own scoped snapshot and earlier ones are kept', () => {
  const r1 = read(rich, { scopeId: 'ace_pilot' });
  const r2 = read(rich, { scopeId: 'bounty_hunter' });
  const ev = (r) => R.buildReflectionEvents({ reading: r, result: R.finishCalibration(r, R.chooseCalibration(r, R.beginCalibration(r), 'A')), transactionId: `t-${r.scopeId}`, completedAt: 'now' });
  const ledger = L.mergeEvents(L.mergeEvents([], ev(r1)).events, ev(r2)).events;
  assert.equal(ledger.length, 2);
  assert.equal(ledger[1].supersedes, undefined, 'a different scope does not supersede the earlier prestige reading');
});

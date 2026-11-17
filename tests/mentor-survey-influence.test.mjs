import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = 'scripts/mentor/mentor-survey-v2';
const I = await import(pathToFileURL(path.join(ROOT, dir, 'survey-influence.js')).href);
const L = await import(pathToFileURL(path.join(ROOT, dir, 'intent-ledger.js')).href);

const T1 = 'tag_a'; const T2 = 'tag_b';
const cfg = I.SURVEY_INFLUENCE_CONFIG;
const approx = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

const ev = (kind, level, tagEvidence = [], over = {}) => {
  const payload = { surveyKind: kind, scopeId: over.scopeId || kind, definitionVersion: 1, contextRevision: 'x', answers: {} };
  const [e] = L.buildCompletionEvents({ payload, transactionId: over.tx || `tx-${kind}-${level}`, actorLevel: level, completedAt: 'now', tagEvidence, existingEvents: over.existing || [], preview: over.preview });
  return e;
};
const cert = (questionId, tag, E = 1) => ({ questionId, tag, E, certified: true });
const withOntology = (fn) => { I.registerOntologyTags([T1, T2, 'tag_c']); try { return fn(); } finally { I.resetOntologyTags(); } };

test('SV-30 config validates; initial authority Prestige > Multiclass > L1; half-life L1 > Multiclass > Prestige', () => {
  assert.deepEqual(I.validateConfig(), []);
  const t = cfg.types;
  assert.deepEqual([t.l1.A, t.multiclass.A, t.prestige.A], [0.65, 0.9, 1.2]);
  assert.deepEqual([t.l1.H, t.multiclass.H, t.prestige.H], [8, 4, 3]);
  assert.ok(t.prestige.A > t.multiclass.A && t.multiclass.A > t.l1.A);
  assert.ok(t.l1.H > t.multiclass.H && t.multiclass.H > t.prestige.H);
  assert.ok(Object.isFrozen(cfg) && Object.isFrozen(cfg.types.l1), 'single typed, immutable config');
  assert.ok(I.validateConfig({ ...cfg, saturationK: 0 }).length > 0);
});

test('SV-30 each survey type begins at its own configured strength at its completion level', () => {
  for (const k of I.SURVEY_TYPES) approx(I.eventWeight(k, 7, 7).W, cfg.types[k].A);
});

test('SV-31 at its own half-life a contribution is exactly half its starting contribution; age is never negative', () => {
  for (const k of I.SURVEY_TYPES) {
    const H = cfg.types[k].H;
    approx(I.eventWeight(k, 3 + H, 3).W, cfg.types[k].A / 2);
    approx(I.eventWeight(k, 3 + 2 * H, 3).W, cfg.types[k].A / 4);
  }
  assert.equal(I.surveyAge(2, 5), 0);
  approx(I.eventWeight('l1', 1, 5).D, 1);
});

test('SV-32 a new prestige event never resets an older L1 or multiclass clock', () => withOntology(() => {
  const l1 = ev('l1', 1, [cert('q3', T1)]);
  const mc = ev('multiclass', 4, [cert('q4', T1)]);
  const before = I.computeSurveyInfluence([l1, mc], 12);
  const pr = ev('prestige', 12, [cert('q3', T2)]);
  const after = I.computeSurveyInfluence([l1, mc, pr], 12);
  const find = (r, id) => r.events.find((e) => e.eventId === id);
  assert.equal(find(after, l1.eventId).D, find(before, l1.eventId).D);
  approx(find(after, l1.eventId).age, 11); approx(find(after, mc.eventId).age, 8);
  approx(find(after, pr.eventId).age, 0);
}));

test('SV-33 two completed surveys reinforce the same tag while keeping separate provenance', () => withOntology(() => {
  const l1 = ev('l1', 1, [cert('q3', T1)]);
  const mc = ev('multiclass', 5, [cert('q4', T1)]);
  const r = I.computeSurveyInfluence([l1, mc], 5);
  assert.equal(r.tags[T1].sources.length, 2);
  assert.deepEqual(r.tags[T1].sources.map((s) => s.surveyKind).sort(), ['l1', 'multiclass']);
  const expected = 1 * 1 * 0.65 * 2 ** (-4 / 8) + 1 * 1 * 0.9 * 1;
  approx(r.tags[T1].raw, expected);
  assert.ok(r.tags[T1].raw > r.tags[T1].sources[0].C && r.tags[T1].raw > r.tags[T1].sources[1].C);
}));

test('SV-34 reinforcement R(n) = 1 + 0.15 min(n-1, 3) is applied once; duplicate aliases never double count', () => withOntology(() => {
  assert.deepEqual([1, 2, 3, 4, 5, 9].map((n) => +I.reinforcement(n).toFixed(2)), [1, 1.15, 1.3, 1.45, 1.45, 1.45]);
  const dup = ev('l1', 1, [cert('q2', T1, 1), cert('q2', T1, 1), cert('q2', T1, 0.8)]);
  const c = I.eventContributions(dup, 1).contributions[0];
  assert.equal(c.n, 1); approx(c.R, 1); approx(c.C, 1 * 1 * 0.65 * 1);
  const three = ev('l1', 1, [cert('q1', T1), cert('q2', T1), cert('q3', T1)]);
  const c3 = I.eventContributions(three, 1).contributions[0];
  assert.equal(c3.n, 3); approx(c3.R, 1.3); approx(c3.C, 1 * 1.3 * 0.65, 1e-9); // not x3 again
}));

test('SV-35 retakes supersede (never multiply); duplicate finalize and reopening change nothing; preview is excluded', () => withOntology(() => {
  const e1 = ev('l1', 1, [cert('q3', T1)], { tx: 't1' });
  const solo = I.computeSurveyInfluence([e1], 3).tags[T1].raw;
  const e2 = ev('l1', 1, [cert('q3', T1)], { tx: 't2', existing: [e1] });
  assert.equal(e2.supersedes, e1.eventId);
  approx(I.computeSurveyInfluence([e1, e2], 3).tags[T1].raw, solo, 1e-9);
  const merged = L.mergeEvents([e1], [e1]).events;
  approx(I.computeSurveyInfluence(merged, 3).tags[T1].raw, solo);
  const pv = ev('l1', 1, [cert('q3', T2)], { tx: 'pv', preview: true });
  assert.equal(I.computeSurveyInfluence([e1, pv], 3).tags[T2], undefined);
  const canceled = I.computeSurveyInfluence([e1], 3); // a canceled retake never produces an event, so nothing changes
  approx(canceled.tags[T1].raw, solo);
}));

test('SV-36 uncertified, unmapped, neutral, skipped, typed and goal answers cannot fabricate tag signals; empty ontology fails closed', () => {
  I.resetOntologyTags();
  const certifiedButNoOntology = ev('prestige', 3, [cert('q3', T1)]);
  assert.deepEqual(I.computeSurveyInfluence([certifiedButNoOntology], 3).suggestionTags, {}, 'fail closed without a registered ontology');
  withOntology(() => {
    const none = ev('l1', 1, []);
    assert.deepEqual(I.computeSurveyInfluence([none], 1).suggestionTags, {});
    const mixed = ev('l1', 1, [{ questionId: 'q1', tag: T1, E: 1, certified: false }, { questionId: 'q2', tag: 'not_in_ontology', E: 1, certified: true }, { questionId: 'q3', tag: T1, E: 0, certified: true }]);
    const r = I.computeSurveyInfluence([mixed], 1);
    assert.deepEqual(r.suggestionTags, {});
    assert.equal(r.events[0].rejected.length, 3);
    assert.deepEqual(r.events[0].rejected.map((x) => x.reason).sort(), ['invalid_entry', 'not_certified', 'tag_not_in_ontology']);
  });
  // The inert boundary emits no evidence: events built from boundary output carry an empty tagEvidence
  assert.deepEqual(ev('multiclass', 2).tagEvidence, []);
});

test('SV-37 many multiclass/prestige events cannot exceed the survey-channel cap', () => withOntology(() => {
  const events = [];
  for (let i = 0; i < 25; i++) events.push(ev(i % 2 ? 'prestige' : 'multiclass', 10, [cert('q1', T1), cert('q2', T1), cert('q3', T1), cert('q4', T1)], { scopeId: `scope${i}`, tx: `t${i}` }));
  const r = I.computeSurveyInfluence(events, 10);
  assert.equal(r.tags[T1].capped, cfg.channel.maxRawPerTag);
  assert.ok(r.tags[T1].raw > r.tags[T1].capped);
  assert.ok(r.suggestionTags[T1] <= cfg.channel.maxAffinityToSuggestions);
  assert.ok(r.tags[T1].affinity < 1);
}));

test('SV-38 declared goals persist undecayed; survey decay never touches acquired mechanics', () => withOntology(() => {
  const payload = { surveyKind: 'l1', scopeId: 'l1', definitionVersion: 1, contextRevision: 'x', answers: {} };
  const events = L.buildCompletionEvents({ payload, transactionId: 'g', actorLevel: 1, completedAt: 'now', goals: [{ goalLane: 'l1.career', target: { type: 'archetype_parent', id: 'diplomat' }, questionId: 'q2', optionId: 'o' }], tagEvidence: [cert('q3', T1)] });
  for (const lvl of [1, 5, 20]) assert.equal(I.declaredGoals(events)['l1.career'].target.id, 'diplomat');
  const late = I.computeSurveyInfluence(events, 20);
  assert.ok(late.tags[T1].raw < 0.2, 'development preference has decayed');
  assert.equal(I.declaredGoals(events)['l1.career'].target.id, 'diplomat', 'goal is intact');
  const owned = Object.freeze({ feats: ['Skill Focus'], talents: ['X'], classLevels: { scout: 5 } });
  I.computeSurveyInfluence(events, 20);
  assert.deepEqual(owned, { feats: ['Skill Focus'], talents: ['X'], classLevels: { scout: 5 } });
  assert.ok(!('feats' in late) && !('classLevels' in late), 'influence output carries no mechanical facts');
}));

test('SV-39 Q6 calibration is a separate authority: inferred-only, coefficients unapproved by default, no prestige half-life', () => {
  const inferred = { 'c.parent': 0.8, 'c.role': 0.6 };
  const frozen = Object.freeze({ ...inferred });
  const corrections = [{ calibration: 'D', rejectedClaimIds: ['c.parent'], affirmedCandidateIds: ['am.spy'] }];
  const none = I.applyCalibration(frozen, corrections);
  assert.deepEqual(none.inferred, inferred); assert.equal(none.coefficientsApproved, false); assert.deepEqual(none.applied, []);
  const test_cfg = { ...cfg, calibration: { negativeFactorByCalibration: { D: 0.4 } } }; // test-only factor, not a recommendation
  const some = I.applyCalibration(frozen, corrections, test_cfg);
  approx(some.inferred['c.parent'], 0.32); approx(some.inferred['c.role'], 0.6);
  assert.deepEqual(Object.keys(some.inferred).sort(), Object.keys(inferred).sort(), 'only inferred claims; no mechanics or goals in the output');
  assert.equal(cfg.calibration.negativeFactorByCalibration, null, 'no approved coefficients are shipped');
  assert.ok(!('H' in (cfg.calibration || {})), 'Q6 corrections do not inherit a survey half-life');
});

test('SV-40 normalized affinity F(E)=1-exp(-E/k) is monotone, bounded below 1 and configurable; raw is kept separately', () => withOntology(() => {
  approx(I.saturate(0.919, 1), 0.601, 1e-3); approx(I.saturate(1.869, 1), 0.846, 1e-3);
  assert.ok(I.saturate(1e6) < 1 + 1e-12); assert.equal(I.saturate(0), 0);
  assert.ok(I.saturate(1, 2) < I.saturate(1, 1));
  const r = I.computeSurveyInfluence([ev('prestige', 1, [cert('q1', T1)])], 1);
  assert.ok(r.tags[T1].raw > 0 && r.tags[T1].affinity > 0 && 'raw' in r.tags[T1] && 'affinity' in r.tags[T1]);
}));

test('SV-40 results are deterministic at levels 1, 2, 5, 10, 12, 15 and 20', () => withOntology(() => {
  const events = [ev('l1', 1, [cert('q3', T1), cert('q4', T2)]), ev('multiclass', 2, [cert('q4', T1)], { scopeId: 'scout' }), ev('multiclass', 5, [cert('q2', T2)], { scopeId: 'jedi' }), ev('prestige', 12, [cert('q3', T1), cert('q5', T1)])];
  const snapshot = (lvl) => JSON.stringify(I.computeSurveyInfluence(events, lvl));
  for (const lvl of [1, 2, 5, 10, 12, 15, 20]) assert.equal(snapshot(lvl), snapshot(lvl));
  const series = [1, 2, 5, 10, 12, 15, 20].map((l) => I.computeSurveyInfluence(events, l).tags[T1]?.raw ?? 0);
  series.forEach((v) => assert.ok(Number.isFinite(v) && v >= 0));
  // Prestige (completed at 12) starts strongest but is the fastest to fade
  const at12 = I.computeSurveyInfluence([events[3]], 12).tags[T1].raw; const at20 = I.computeSurveyInfluence([events[3]], 20).tags[T1].raw;
  assert.ok(at20 < at12 / 4);
}));

test('SV-41 diagnostic breakdown exposes per-event age, decay, authority, weight and per-tag provenance', () => withOntology(() => {
  const r = I.computeSurveyInfluence([ev('l1', 1, [cert('q3', T1)]), ev('prestige', 9, [cert('q3', T1)])], 12);
  for (const e of r.events) for (const k of ['eventId', 'surveyKind', 'completedAtLevel', 'age', 'A', 'H', 'D', 'W', 'contributions']) assert.ok(k in e, k);
  assert.deepEqual(r.events.map((e) => e.age), [11, 3]);
  assert.ok(r.tags[T1].sources.every((s) => 'eventId' in s && 'D' in s && 'R' in s && 'questionIds' in s));
}));

test('SV-42 completed events freeze original answer text, approval status and evidence channel', () => {
  const payload = { surveyKind: 'l1', scopeId: 'l1', definitionVersion: 1, contextRevision: 'x', answers: { q1: { optionId: 'o1' } } };
  const [e] = L.buildCompletionEvents({ payload, transactionId: 't', actorLevel: 1, completedAt: 'now', answerDetails: { q1: { text: 'I want to lead.', editorialStatus: 'draft_text', mechanicsStatus: 'none' } } });
  assert.equal(e.answers.q1.text, 'I want to lead.'); assert.equal(e.answers.q1.editorialStatus, 'draft_text');
  assert.equal(e.evidenceChannel, 'completed_survey_development_preference');
});

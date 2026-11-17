import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = 'scripts/mentor/mentor-survey-v2';
const u = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const M = await import(u(`${dir}/multiclass-controller.js`));
const L = await import(u(`${dir}/intent-ledger.js`));
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const pack = json('data/mentor-survey/multiclass.json');
const manifest = json('data/mentor-survey/release-manifest.json');
const goalEvents = () => L.buildCompletionEvents({ payload: { surveyKind: 'l1', scopeId: 'soldier', definitionVersion: 1, contextRevision: 'x', answers: {} }, transactionId: 'c1', actorLevel: 1, completedAt: 'x', goals: [{ goalLane: 'l1.long_term_ambition', target: { type: 'response_only', id: null }, questionId: 'q5', optionId: 'o', quote: 'I want to lead people.' }] });
const mk = (events = []) => new M.MulticlassSurveyController({ pack, manifest, preview: true, archetypeLookup: () => null }).sync({ selectedClassId: 'scout', classLevels: { soldier: 3 }, seed: 's', events });
const toQ5 = (ctl, q1) => { ctl.choose('q1', q1, ctl.seq); ctl.choose('q3', 'mc.q3.dip', ctl.seq); ctl.choose('q4', ctl.view().view.options[0].optionId, ctl.seq); return ctl.view(); };

test('MC-18 imports the 25 Q1-undecided Q5 responses and the 5 no-goal replacements verbatim, with source lines', () => {
  for (const [dest, bank] of Object.entries(pack.q5Fallback)) {
    assert.deepEqual(bank.map((r) => r.kind), ['develop_core', 'field_application', 'benefit_others', 'career_continuity', 'prepare_future_route'], dest);
    assert.equal(bank.filter((r) => r.needsGoalSlot).length, 1); assert.ok(bank.every((r) => r.sourceLine > 7000 && r.fromUndecidedQ1));
    assert.ok(pack.q5NoGoal[dest].noGoalReplacement && pack.q5NoGoal[dest].sourceLine > 7000);
  }
  assert.equal(pack.q5NoGoal.jedi.text, 'I want to explore where Jedi training might lead me without deciding on a lifelong calling today.');
});

const A = json('data/archetypes.json').archetypes;
const mkWith = (events = [], preview = true) => new M.MulticlassSurveyController({ pack, manifest, preview, archetypeLookup: (id) => A[id] || null }).sync({ selectedClassId: 'scout', classLevels: { soldier: 3 }, seed: 's', events });
const goal = (over = {}) => ({ goalLane: 'l1.long_term_ambition', target: { type: 'response_only', id: null }, questionId: 'q5', optionId: 'o', quote: 'I want to lead people.', ...over });
const ev = (goals, existing = [], tx = 'c1') => L.buildCompletionEvents({ payload: { surveyKind: 'l1', scopeId: 'soldier', definitionVersion: 1, contextRevision: 'x', answers: {} }, transactionId: tx, actorLevel: 1, completedAt: 'x', goals, existingEvents: existing });
const shownCC = (events, preview = true) => toQ5(mkWith(events, preview), 'mc.scout.q1.soldier.01').view.options[3];

test('MC-18 no active goal selects the authored replacement; no placeholder ever reaches a player', () => {
  const o = shownCC([]); assert.equal(o.text, pack.q5NoGoal.scout.text); assert.ok(!/\{|\}/.test(o.text));
});

test('MC-18 a free-text declared goal appears as the player\'s exact words in a separate labeled phrase, never inflected into a sentence', () => {
  const o = shownCC(ev([goal()]));
  assert.equal(o.text, 'I want to see how this new training could support my earlier goal (\u201cI want to lead people.\u201d).');
});

test('MC-18 a typed goal that resolves exactly in the archetype registry shows its canonical label; unresolved ids fall back to the exact words, else to the no-goal replacement', () => {
  const canon = Object.values(A).find((a) => a.kind === 'parent');
  assert.equal(shownCC(ev([goal({ target: { type: 'archetype_parent', id: canon.id } })])).text, `I want to see how this new training could support my earlier goal (${canon.name}).`);
  assert.match(shownCC(ev([goal({ target: { type: 'archetype_parent', id: 'no_such_archetype' } })])).text, /\(\u201cI want to lead people\.\u201d\)/, 'unresolved id: the exact words');
  assert.equal(shownCC(ev([goal({ target: { type: 'archetype_parent', id: 'no_such_archetype' }, quote: undefined })])).text, pack.q5NoGoal.scout.text, 'unresolved id and no words: nothing is displayed');
  const spec = Object.values(A).find((a) => a.kind === 'specialization');
  assert.match(shownCC(ev([goal({ target: { type: 'archetype_parent', id: spec.id } })])).text, /\u201c/, 'a kind mismatch is not an exact resolution');
});

test('MC-18 several active goals: the fixed lane priority decides (the long-term ambition outranks the career aspiration)', () => {
  const events = ev([goal({ goalLane: 'l1.career', quote: 'I want a quiet life.' }), goal({ goalLane: 'l1.long_term_ambition', quote: 'I want to lead people.' })]);
  assert.match(shownCC(events).text, /lead people/); assert.ok(!/quiet life/.test(shownCC(events).text));
});

test('MC-18 a superseded goal is gone: a revision replaces it, a retake supersedes the earlier answer, and preview events never count outside preview', () => {
  const first = ev([goal({ quote: 'I want to lead people.' })], [], 'c1');
  const revised = ev([goal({ quote: 'I want to protect people.' })], first, 'c2');
  const all = [...first, ...revised];
  assert.match(shownCC(all).text, /protect people/); assert.ok(!/lead people/.test(shownCC(all).text));
  const previewOnly = ev([goal()]).map((e) => ({ ...e, provenance: { ...e.provenance, preview: true } }));
  assert.equal(shownCC(previewOnly).text, pack.q5NoGoal.scout.text);
});

test('MC-18 the goal answer is recorded with the exact text shown and declares no goal change; an undecided Q1 uses the same reviewed alternative', () => {
  const ctl = mkWith(ev([goal()])); toQ5(ctl, 'mc.scout.q1.soldier.01');
  assert.ok(ctl.choose('q5', ctl.view().view.options[3].optionId, ctl.seq));
  assert.deepEqual(ctl.draft.answers.q5.meta.goalSource, 'quote');
  const done = ctl.finish(ctl.seq);
  assert.equal(done.answerDetails.q5.text, 'I want to see how this new training could support my earlier goal (\u201cI want to lead people.\u201d).');
  assert.deepEqual(done.goals, [], 'career continuity continues a goal; it never creates or replaces one');
  const n = mkWith(ev([goal()])); n.choose('q1', 'mc.scout.q1.soldier.06', n.seq); n.choose('q3', 'mc.q3.dip', n.seq); n.choose('q4', n.view().view.options[0].optionId, n.seq);
  assert.match(n.view().view.options[3].text, /my earlier goal \(\u201cI want to lead people\.\u201d\)/);
});

test('MC-16 neutral Q4 mapping: five curated families, recorded with rationale; each scenario is a general situation', () => {
  assert.deepEqual(Object.keys(pack.q4Neutral).sort(), ['jedi', 'noble', 'scoundrel', 'scout', 'soldier']);
  for (const [d, m] of Object.entries(pack.q4Neutral)) { assert.ok(m.rationale && m.scenarioIds.length >= 5 && m.status === 'curated_pending_editorial_review'); assert.ok(m.scenarioIds.every((id) => pack.q4[id].destination === d && pack.q4[id].family === m.family)); }
  const a = mk(); a.choose('q1', 'mc.scout.q1.soldier.06', a.seq); a.choose('q3', 'mc.q3.dip', a.seq); const b = mk(); b.choose('q1', 'mc.scout.q1.soldier.06', b.seq); b.choose('q3', 'mc.q3.dip', b.seq);
  assert.equal(a.view().view.situation, b.view().view.situation, 'deterministic for the same seed');
});

test('MC-16 neutral scenes presume no skill, feat, talent, authority, position or past experience; excluded scenes are listed; an undecided Q1 contributes no specialization', () => {
  const PRESUME = /\b(you(?:'re| are) (?:holding|commanding|leading|piloting|guarding|in command|in charge|the (?:leader|commander|captain))|your (?:squad|crew|patrol|team|unit|troops|soldiers|ship|command|group|companions?|allies)|you command|you lead|lightsaber|blaster|slic(?:e|ing)|disguise|demolition)/i;
  for (const [d, m] of Object.entries(pack.q4Neutral)) {
    assert.ok(m.scenarioIds.length >= 5, d);
    for (const id of m.scenarioIds) assert.ok(!PRESUME.test(pack.q4[id].situation.text), `${id} presumes`);
    for (const x of m.excludedScenarioIds) assert.ok(x.reason.startsWith('presumes:'));
  }
  assert.deepEqual(pack.q4Neutral.soldier.excludedScenarioIds.map((x) => x.id), ['q4.soldier.tactics.seed01']);
  const ctl = mk(); ctl.choose('q1', 'mc.scout.q1.soldier.06', ctl.seq); ctl.choose('q3', 'mc.q3.dip', ctl.seq); ctl.choose('q4', ctl.view().view.options[0].optionId, ctl.seq);
  assert.deepEqual(ctl.draft.answers.q1.meta.kind, 'neutral'); assert.ok(!('family' in (ctl.draft.answers.q4.meta || {})));
  const done = ctl.finish(ctl.seq) || {}; assert.deepEqual(done.goals ?? [], []); assert.deepEqual(done.tagEvidence ?? [], []);
});

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

test('MC-18 a declared goal fills the slot with the reviewed pointer phrase, never the goal text; no goal selects the authored replacement', () => {
  const withGoal = toQ5(mk(goalEvents()), 'mc.scout.q1.soldier.01');
  const t = withGoal.view.options[3].text;
  assert.match(t, /the goal I have already declared/); assert.ok(!/declared_goal|\{|I want to lead people/.test(t));
  assert.ok(withGoal.view.options[3].optionId.endsWith('.withgoal'));
  const without = toQ5(mk(), 'mc.scout.q1.soldier.01');
  assert.equal(without.view.options[3].text, pack.q5NoGoal.scout.text);
  const ctl = mk(goalEvents()); toQ5(ctl, 'mc.scout.q1.soldier.01');
  assert.ok(ctl.choose('q5', ctl.view().view.options[3].optionId, ctl.seq));
});

test('MC-18 the filled goal answer is recorded with the exact text the player saw, and declares no goal change', () => {
  const ctl = mk(goalEvents()); toQ5(ctl, 'mc.scout.q1.soldier.01');
  ctl.choose('q5', ctl.view().view.options[3].optionId, ctl.seq);
  const done = ctl.finish(ctl.seq);
  assert.match(done.answerDetails.q5.text, /the goal I have already declared/); assert.ok(!/\{declared_goal\}/.test(done.answerDetails.q5.text));
  assert.deepEqual(done.goals, [], 'career continuity continues a goal; it never creates or replaces one');
});

test('MC-16 neutral Q4 mapping: five curated families, recorded with rationale; each scenario is a general situation', () => {
  assert.deepEqual(Object.keys(pack.q4Neutral).sort(), ['jedi', 'noble', 'scoundrel', 'scout', 'soldier']);
  for (const [d, m] of Object.entries(pack.q4Neutral)) { assert.ok(m.rationale && m.scenarioIds.length >= 6 && m.status === 'curated_pending_editorial_review'); assert.ok(m.scenarioIds.every((id) => pack.q4[id].destination === d && pack.q4[id].family === m.family)); }
  const a = mk(); a.choose('q1', 'mc.scout.q1.soldier.06', a.seq); a.choose('q3', 'mc.q3.dip', a.seq); const b = mk(); b.choose('q1', 'mc.scout.q1.soldier.06', b.seq); b.choose('q3', 'mc.q3.dip', b.seq);
  assert.equal(a.view().view.situation, b.view().view.situation, 'deterministic for the same seed');
});

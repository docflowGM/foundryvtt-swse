import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = 'scripts/mentor/mentor-survey-v2';
const u = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const M = await import(u(`${dir}/multiclass-controller.js`));
const P = await import(u(`${dir}/prestige-controller.js`));
const E = await import(u(`${dir}/actor-evidence.js`));
const L = await import(u(`${dir}/intent-ledger.js`));
const F = await import(u(`${dir}/finalization.js`));
const Q6 = await import(u(`${dir}/resolvers/reflection-q6.js`));
const Rf = await import(u(`${dir}/reflection.js`));
const S = await import(u(`${dir}/content-store.js`));
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const q6c = json('data/mentor-survey/reflection-q6.json');
const mcPack = { ...json('data/mentor-survey/multiclass.json'), q6Content: q6c };
const prPack = { ...json('data/mentor-survey/prestige.json'), q1q3: json('data/mentor-survey/prestige-q1q3.json'), q6Content: q6c };
const manifest = json('data/mentor-survey/release-manifest.json');
const archetypes = json('data/archetypes.json').archetypes;
const lookup = (id) => archetypes[id] || null;
const item = (type, name, extra = {}) => ({ type, name, id: `${type}-${name}`, system: {}, flags: { swse: { canonicalTalent: { canonicalId: `c.${name}` } } }, ...extra });
const actor = { items: [item('class', 'Soldier', { system: { level: 3 } }), item('talent', 'Battle Analysis'), item('feat', 'Point-Blank Shot', { flags: { swse: { canonicalFeat: { canonicalId: 'f1' } } } })], system: { skills: { treatInjury: { trained: true } } } };
const goalEvents = () => L.buildCompletionEvents({ payload: { surveyKind: 'l1', scopeId: 'soldier', definitionVersion: 1, contextRevision: 'x', answers: {} }, transactionId: 'c1', actorLevel: 1, completedAt: 'x', goals: [{ goalLane: 'l1.long_term_ambition', target: { type: 'response_only', id: null }, questionId: 'q5', optionId: 'o', quote: 'I want to keep my companions safe.' }] });
const ev = () => ({ evidence: E.projectActorEvidence(actor), events: goalEvents() });
const mcStart = () => new M.MulticlassSurveyController({ pack: mcPack, manifest, preview: true, archetypeLookup: lookup }).sync({ selectedClassId: 'noble', classLevels: { soldier: 3 }, seed: 's', ...ev() });
const prStart = (cls = 'ace_pilot') => new P.PrestigeSurveyController({ pack: prPack, manifest, preview: true, archetypeLookup: lookup }).sync({ selectedClassId: cls, classLevels: { jedi: 6 }, ...ev() });
const toQ6 = (ctl) => { if (ctl.adapter.kind === 'prestige') { ctl.skipQuestion('q1', ctl.seq); ctl.skipQuestion('q2', ctl.seq); ctl.skipQuestion('q3', ctl.seq); ctl.choose('q4', 'pr.q4.dive', ctl.seq); ctl.choose('q5', ctl.view().view.options[0].optionId, ctl.seq); if (ctl.view().view?.questionId === 'q5b') ctl.choose('q5b', ctl.view().view.options.at(-1).optionId, ctl.seq); } else { ctl.choose('q1', 'mc.noble.q1.soldier.01', ctl.seq); ctl.skipQuestion('q2', ctl.seq); ctl.choose('q3', 'mc.q3.dive', ctl.seq); ctl.choose('q4', ctl.view().view.options[0].optionId, ctl.seq); ctl.choose('q5', ctl.view().view.options[0].optionId, ctl.seq); } return ctl.view(); };

test('SV-18 one Q6: there is a single resolver module for the Mentor\'s Reflection and both surveys import it; no second Q6 implementation exists', () => {
  const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  assert.ok(!fs.existsSync(path.join(ROOT, `${dir}/resolvers/multiclass-q6.js`)), 'the multiclass-only module is gone');
  assert.match(src(`${dir}/resolvers/multiclass.js`), /from '\.\/reflection-q6\.js'/); assert.match(src(`${dir}/resolvers/prestige.js`), /from '\.\/reflection-q6\.js'/);
  assert.match(src(`${dir}/prestige-controller.js`), /from '\.\/resolvers\/reflection-q6\.js'/);
  for (const f of ['resolvers/prestige.js', 'prestige-controller.js']) assert.ok(!/chooseCalibration|selectNot|selectAm|finishCalibration|NOT_CAPS/.test(src(`${dir}/${f}`)), `${f} carries no correction logic of its own`);
  assert.deepEqual(Object.keys(q6c).filter((k) => /prestige|multiclass/i.test(k)), ['prestigeMentors'], 'one pack: shared libraries, the only prestige key is the reserved per-class dialogue slot');
  assert.deepEqual(q6c.prestigeMentors, {}, 'the authored 32-class dialogue is not reconstructed');
  assert.equal(JSON.parse(src('data/mentor-survey/prestige.json')).q6, undefined, 'no prestige copy of the response or correction libraries');
});

test('SV-18 identical actor evidence gives the identical identity assessment, A-E responses and correction behavior in both surveys; only milestone and Mentor presentation differ', () => {
  const mc = toQ6(mcStart()); const pr = toQ6(prStart());
  assert.equal(mc.view.questionId, 'q6'); assert.equal(pr.view.questionId, 'q6');
  assert.deepEqual(pr.view.options, mc.view.options, 'the same A-E player responses');
  const a = Q6.q6Context({ surveyKind: 'multiclass', pack: mcPack, draft: mcStart().draft, ctx: mcStart().ctx, runtime: mcStart().runtime, archetypeLookup: lookup }).reading;
  const b = Q6.q6Context({ surveyKind: 'prestige', pack: prPack, draft: prStart().draft, ctx: prStart().ctx, runtime: prStart().runtime, archetypeLookup: lookup }).reading;
  for (const k of ['identity', 'claims', 'evidence', 'evidenceState', 'goal', 'goalDeclared', 'fulfillment', 'amCandidates']) assert.deepEqual(a[k], b[k], k);
  assert.notEqual(a.readingId, b.readingId, 'the reading id binds the survey and class');
  for (const choice of ['A', 'B', 'C', 'D', 'E']) {
    const sa = Rf.chooseCalibration(a, Rf.beginCalibration(a), choice); const sb = Rf.chooseCalibration(b, Rf.beginCalibration(b), choice);
    assert.deepEqual([sa.stage, sa.notShown, sa.amShown], [sb.stage, sb.notShown, sb.amShown], `${choice} routes identically`);
  }
});

test('SV-18 Prestige Q6 is delivered with the milestone and a neutral, unattributed frame; no established Mentor is quoted', () => {
  const v = toQ6(prStart('jedi_knight')).view;
  assert.equal(v.surveyKind, 'prestige'); assert.equal(v.neutralFrame, true); assert.equal(v.mentorId, 'miraj');
  assert.equal(v.mentorIntro, q6c.neutral.frame.opening.text); assert.equal(v.prompt, q6c.neutral.frame.closing.text);
  assert.match(v.situation, /^You are at the threshold of the Jedi Knight path\./); assert.match(v.situation, /You have the Battle Analysis talent\./);
  assert.match(v.situation, /“I want to keep my companions safe\.”/, 'the declared goal is quoted separately');
  assert.ok(!/[—–]/.test(JSON.stringify(q6c.neutral)), 'no dashes in the new neutral text');
  assert.ok(Object.values(q6c.neutral.frame.reactions).every((r) => r.speaker === 'neutral') && q6c.neutral.milestone.speaker === 'neutral');
  const mc = toQ6(mcStart()).view; assert.equal(mc.neutralFrame, false); assert.equal(mc.mentorIntro, q6c.mentors.noble.opening.text, 'the multiclass Mentor script is unchanged');
});

test('SV-18 NOT then AM runs through the same engine for Prestige: D shows the NOT stage first, AM is mandatory, corrections never touch owned facts or goals', () => {
  const ctl = prStart('officer'); toQ6(ctl);
  assert.ok(ctl.choose('q6', 'mc.q6.choice.d', ctl.seq));
  let v = ctl.view().view; assert.equal(v.questionId, 'q6n'); assert.equal(v.multiSelect, true); assert.ok(v.options[0].optionId.startsWith('pr.q6n.'));
  assert.equal(v.mentorIntro, q6c.neutral.frame.reactions.D1.text);
  assert.ok(ctl.chooseMany('q6n', v.options.map((o) => o.optionId), ctl.seq));
  v = ctl.view().view; assert.equal(v.questionId, 'q6a'); assert.equal(v.mentorIntro, q6c.neutral.frame.reactions.D2.text);
  assert.ok(ctl.chooseMany('q6a', [v.options[0].optionId], ctl.seq));
  const done = ctl.finish(ctl.seq); assert.ok(done.reflection, 'the reflection result is staged for the ledger');
  assert.equal(done.reflection.result.ok, true); assert.deepEqual(done.goals, []);
  const A = prStart('officer'); toQ6(A); assert.ok(A.choose('q6', 'mc.q6.choice.a', A.seq)); assert.equal(A.view().phase, 'ready', 'A is a no-op: no NOT or AM stage');
  const D = prStart('officer'); toQ6(D); D.choose('q6', 'mc.q6.choice.d', D.seq); assert.equal(D.choose('q6a', 'x', D.seq), false, 'AM cannot be answered before NOT');
});

test('SV-18 the same transactional persistence: Prestige corrections become reflection events in the one ledger, replay is idempotent, and prior goals are untouched', () => {
  const ctl = prStart('medic'); toQ6(ctl); ctl.choose('q6', 'mc.q6.choice.b', ctl.seq);
  let v = ctl.view().view; if (v.questionId === 'q6n') { ctl.chooseMany('q6n', [v.options[0].optionId], ctl.seq); }
  const done = ctl.finish(ctl.seq); assert.ok(done);
  const a = { flags: { 'foundryvtt-swse': { mentorSurvey: { events: goalEvents() } } } };
  const selection = { drafts: {}, committed: { [ctl.scopeKey]: done } };
  const p1 = F.buildSurveyLedgerPatch({ actor: a, selection, transactionId: 'tx-1', level: 9, completedAt: 'now' });
  const events = p1['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.ok(events.some((e) => e.type === 'survey_completed' && e.surveyKind === 'prestige') && events.some((e) => e.type === 'reflection_snapshot' && e.surveyKind === 'prestige'));
  assert.ok(events.filter((e) => e.type === 'goal_declaration').length === 1, 'the earlier goal is kept exactly once');
  const a2 = { flags: { 'foundryvtt-swse': { mentorSurvey: { events } } } };
  const replay = F.buildSurveyLedgerPatch({ actor: a2, selection, transactionId: 'tx-1', level: 9, completedAt: 'now' })['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.deepEqual((replay ?? events).map((e) => e.eventId), events.map((e) => e.eventId), 'replaying the same transaction adds nothing');
});

test('SV-18 the release gate still applies: draft neutral text never reaches players, and without the shared pack Prestige Q6 stays source-blocked', () => {
  const rt = { ...ev() };
  const r = (preview, pack = prPack) => Q6.resolveQ6({ surveyKind: 'prestige', pack, draft: { answers: {} }, qid: 'q6', ctx: { destinationClassId: 'ace_pilot', evidenceRevision: 'r' }, runtime: rt, archetypeLookup: lookup, preview });
  assert.equal(r(false).reason, 'unapproved_content'); assert.equal(r(true).available, true);
  assert.equal(r(true, { ...prPack, q6Content: undefined }).reason, 'blocked_source');
  assert.deepEqual(S.scanViewForLeaks(r(true).view), []);
});

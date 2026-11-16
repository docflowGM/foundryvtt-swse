import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = 'scripts/mentor/mentor-survey-v2';
const u = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const M = await import(u(`${dir}/multiclass-controller.js`));
const E = await import(u(`${dir}/actor-evidence.js`));
const L = await import(u(`${dir}/intent-ledger.js`));
const F = await import(u(`${dir}/finalization.js`));
const S = await import(u(`${dir}/content-store.js`));
const Rf = await import(u(`${dir}/reflection.js`));

const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const basePack = json('data/mentor-survey/multiclass.json');
const q6 = json('data/mentor-survey/multiclass-q6.json');
const pack = { ...basePack, q6Content: q6 };
const manifest = json('data/mentor-survey/release-manifest.json');
const archetypes = json('data/archetypes.json').archetypes;
const lookup = (id) => archetypes[id] || null;

const item = (type, name, extra = {}) => ({ type, name, id: `id-${name}`, system: {}, flags: {}, ...extra });
const rich = { items: [item('class', 'Soldier', { system: { level: 3 } }), item('feat', 'Point-Blank Shot', { flags: { swse: { canonicalFeat: { canonicalId: 'f1' } } } }), item('talent', 'Battle Analysis', { flags: { swse: { id: 't1' } } })], system: { skills: { useTheForce: { trained: true }, treatInjury: { trained: true } } } };
const thin = { items: [item('class', 'Soldier', { system: { level: 1 } })], system: { skills: {} } };
const goalEvents = (quote = 'I want to keep my companions safe.', lane = 'l1.long_term_ambition', target = { type: 'response_only', id: null }) => L.buildCompletionEvents({ payload: { surveyKind: 'l1', scopeId: 'soldier', definitionVersion: 1, contextRevision: 'x', answers: {} }, transactionId: 'c1', actorLevel: 1, completedAt: 'x', goals: [{ goalLane: lane, target, questionId: 'q5', optionId: 'o', quote }] });
const start = (actor = rich, events = [], over = {}) => new M.MulticlassSurveyController({ pack, manifest, preview: true, archetypeLookup: lookup, ...over })
  .sync({ selectedClassId: 'noble', classLevels: { soldier: 3 }, seed: 's1', evidence: E.projectActorEvidence(actor), events });
const toQ6 = (ctl) => { ctl.choose('q1', 'mc.noble.q1.soldier.01', ctl.seq); ctl.choose('q3', 'mc.q3.dive', ctl.seq); ctl.choose('q4', ctl.view().view.options[0].optionId, ctl.seq); ctl.choose('q5', ctl.view().view.options[0].optionId, ctl.seq); return ctl.view(); };
const actor = (events = []) => ({ flags: { 'foundryvtt-swse': { mentorSurvey: { events } } } });

test('MC-14 Q6 import: five Mentor frames, 170 Pass A variants, 10 claim kinds x 2, 297 canonical identities, 18 free statements, A-E answers', () => {
  const c = q6._meta.counts;
  assert.deepEqual([c.mentors, c.clauseVariants, c.negativeKinds, c.negativeWordings, c.identityRows, c.freeStanding, c.playerChoices], [5, 170, 10, 20, 297, 18, 5]);
  for (const d of ['jedi', 'noble', 'scoundrel', 'scout', 'soldier']) { assert.equal(Object.keys(q6.mentors[d].reactions).length, 7, d); assert.ok(q6.mentors[d].opening.text && q6.mentors[d].closing.text); }
  assert.equal(q6.identityChoices.filter((r) => r.kind === 'parent').length, 97); assert.equal(q6.identityChoices.filter((r) => r.kind === 'specialization').length, 200);
  for (const r of q6.identityChoices) { assert.equal(archetypes[r.archetypeId].kind, r.kind); if (r.parentId) assert.equal(archetypes[r.archetypeId].parentId, r.parentId); }
  assert.deepEqual(q6.playerChoices.map((p) => p.calibration), ['A', 'B', 'C', 'D', 'E']);
  assert.ok(Object.values(Rf.CLAIM_KINDS).every((k) => q6.negatives[k]), 'engine claim kinds equal the Pass B kinds');
});

test('SV-07/SV-26 every player-selectable Q6 text is first person and leak free; all of it is draft until approved', () => {
  const player = [...q6.playerChoices, ...Object.values(q6.negatives).flat(), ...q6.freeStanding, ...q6.identityChoices.flatMap((r) => [r.not, r.am])];
  // Answer B: the design example was second person; the owner ruled replacement wording (MSV-RD-011). Id, meaning and provenance are kept.
  const B = q6.playerChoices.find((p) => p.calibration === 'B');
  assert.equal(B.id, 'mc.q6.choice.b'); assert.equal(B.text, "I recognize much of what you've described, but I want to correct one or two details.");
  assert.equal(B.editorialStatus, 'owner_approved_text'); assert.equal(B.ownerRuling, 'MSV-RD-011'); assert.match(B.originalText, /^Much of what you see is true/); assert.ok(B.sourceRef);
  assert.ok(S.isFirstPerson(B.text)); assert.ok(!B.editorialIssue);
  assert.deepEqual(player.filter((r) => r.editorialIssue), []);
  const filled = (r) => ({ ...r, text: r.text.replace(/\{\w+\}/g, 'something') }); // slot templates are validated as they will read once filled
  assert.deepEqual(player.map(filled).flatMap((r) => S.validateResponseRecord(r)), []);
  assert.ok(Object.values(q6.negatives).flat().filter((r) => r.hasSlots).length === 10, 'slot-bearing templates are flagged');
  assert.ok(player.every((r) => r.editorialStatus === (r.id === 'mc.q6.choice.b' ? 'owner_approved_text' : 'draft_text')));
  assert.ok(q6.playerChoices.every((p) => !/%|0\.\d|band/i.test(p.text)), 'no percentages or band language in the A-E answers');
});

test('MC-14 Q6 follows Q5 with the destination Mentor frame; the reading is composed ONLY from finalized evidence, the ledger goal and the Q1 quote', () => {
  const ctl = start(rich, goalEvents());
  const v = toQ6(ctl);
  assert.equal(v.view.questionId, 'q6'); assert.equal(v.questionNumber, 6);
  assert.equal(v.view.mentorIntro, q6.mentors.noble.opening.text); assert.equal(v.view.prompt, q6.mentors.noble.closing.text);
  assert.deepEqual(v.view.options.map((o) => o.optionId), ['a', 'b', 'c', 'd', 'e'].map((x) => `mc.q6.choice.${x}`));
  const text = v.view.situation;
  assert.match(text, /You have the Battle Analysis talent\./); assert.match(text, /You have taken the Point-Blank Shot feat\./); assert.match(text, /You are trained in Treat Injury\./);
  assert.ok((text.match(/You (have|are)/g) || []).length <= 3, 'at most three observed facts');
  assert.match(text, /“I want to keep my companions safe\.”/, 'declared goal is quoted separately');
  assert.match(text, new RegExp(`“${ctl.pack.q1.noble.soldier[0].text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}”`), 'exact Q1 quote');
  assert.ok(!/Jedi Master|Weapon Focus|Force Sensitivity/.test(text), 'nothing the actor does not own');
  assert.deepEqual(S.scanViewForLeaks(v.view), []);
  assert.ok(q6.clauses.noble.unresolved.all.some((c) => text.startsWith(c.text)), 'unresolved identity form (an authored J0-N1 clause): no archetype is named without a verified join');
});

test('SV-19/SV-20 thin evidence shows fewer real facts, never padding; an absent goal is stated honestly and never invented', () => {
  const t = toQ6(start(thin, [])).view.situation;
  assert.ok(!/You have|You are trained/.test(t), 'no owned facts to cite means no evidence paragraph');
  assert.ok(q6.clauses.noble.goal.unrecorded.some((c) => t.includes(c.text)), 'the authored "no recorded goal" clause is used; no goal is invented');
  const one = { items: [item('class', 'Soldier', { system: { level: 2 } })], system: { skills: { stealth: { trained: true } } } };
  assert.equal((toQ6(start(one, [])).view.situation.match(/You are trained in/g) || []).length, 1);
});

test('SV-18 the reading is deterministic and frozen: the same inputs always give the same text and reading id', () => {
  const a = toQ6(start(rich, goalEvents())).view.situation; const b = toQ6(start(rich, goalEvents())).view.situation;
  assert.equal(a, b);
  assert.notEqual(toQ6(start(rich, goalEvents('I want to lead people.'))).view.situation, a);
});

test('SV-21 A needs no follow-up: the survey can finish and records a snapshot only', () => {
  const ctl = start(rich, goalEvents()); toQ6(ctl);
  assert.ok(ctl.choose('q6', 'mc.q6.choice.a', ctl.seq));
  assert.equal(ctl.view().phase, 'ready');
  const rec = ctl.finish(ctl.seq);
  assert.equal(rec.reflection.result.choice, 'A'); assert.equal(rec.reflection.result.noop, true);
  const ev = F.buildSurveyLedgerPatch({ actor: actor(), selection: ctl.serialize(), transactionId: 'lv', level: 4, completedAt: 'now' })['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.deepEqual(ev.map((e) => e.type), ['survey_completed', 'reflection_snapshot']);
  assert.equal(ev[1].lane, 'inferred_current_identity'); assert.equal(ev[1].calibration, 'A');
});

test('SV-21 B and C offer a NOT stage over only the claims shown; no AM stage; the Mentor B/C line frames it', () => {
  for (const ch of ['B', 'C']) {
    const ctl = start(rich, goalEvents()); toQ6(ctl); ctl.choose('q6', `mc.q6.choice.${ch.toLowerCase()}`, ctl.seq);
    const v = ctl.view();
    assert.equal(v.view.questionId, 'q6n'); assert.equal(v.view.multiSelect, true); assert.equal(v.view.mentorIntro, q6.mentors.noble.reactions[ch].text);
    assert.equal(v.view.options.length, 1, 'only the unresolved-reading disagreement was displayed, so only it can be rejected');
    assert.ok(S.isFirstPerson(v.view.options[0].text));
    assert.ok(!v.view.options.some((o) => /Battle Analysis|talent|feat/.test(o.text)), 'owned facts are never offered for rejection');
    assert.equal(ctl.chooseMany('q6n', ['mc.q6n.claim.unresolved_reading'], ctl.seq), true);
    assert.equal(ctl.view().phase, 'ready', 'no AM stage for B/C');
  }
});

test('SV-21 D and E require BOTH stages: NOT then AM with the free-standing affirmative statements; neither can be skipped past', () => {
  for (const ch of ['D', 'E']) {
    const ctl = start(rich, goalEvents()); toQ6(ctl); ctl.choose('q6', `mc.q6.choice.${ch.toLowerCase()}`, ctl.seq);
    let v = ctl.view();
    assert.equal(v.view.questionId, 'q6n'); assert.equal(v.view.mentorIntro, q6.mentors.noble.reactions[`${ch}1`].text);
    assert.equal(ctl.finish(ctl.seq), null, 'cannot finish before both stages');
    assert.ok(ctl.chooseMany('q6n', ['mc.q6n.claim.unresolved_reading'], ctl.seq));
    v = ctl.view();
    assert.equal(v.view.questionId, 'q6a'); assert.equal(v.view.mentorIntro, q6.mentors.noble.reactions[`${ch}2`].text);
    assert.equal(v.view.options.length, 18, 'free-standing affirmative set (no declared archetype goal)');
    assert.ok(v.view.options.every((o) => S.isFirstPerson(o.text)));
    assert.ok(ctl.chooseMany('q6a', ['mc.q6.am.free.protect_people', 'mc.q6.am.free.prepare_first'], ctl.seq));
    assert.equal(ctl.view().phase, 'ready');
    const rec = ctl.finish(ctl.seq);
    assert.deepEqual(rec.reflection.result.rejectedClaimIds, ['claim.unresolved_reading']);
    assert.deepEqual(rec.reflection.result.affirmedCandidateIds, ['mc.q6.am.free.prepare_first', 'mc.q6.am.free.protect_people']);
  }
});

test('SV-23 selections must be offered options: unknown ids, owned facts and other stages are rejected', () => {
  const ctl = start(rich, goalEvents()); toQ6(ctl); ctl.choose('q6', 'mc.q6.choice.d', ctl.seq);
  assert.equal(ctl.chooseMany('q6n', ['mc.q6n.fact.0.feat.point-blank-shot'], ctl.seq), false);
  assert.equal(ctl.chooseMany('q6n', ['mc.q6.am.free.protect_people'], ctl.seq), false);
  assert.equal(ctl.chooseMany('q6a', [], ctl.seq), false, 'AM is not available before NOT');
  assert.equal(ctl.chooseMany('q6n', [], ctl.seq), true, 'rejecting nothing is a valid answer');
  assert.equal(ctl.chooseMany('q6a', ['nonsense'], ctl.seq), false);
});

test('SV-23/SV-24 corrections change only inferred-identity events: no goal, acquisition or eligibility event, no negative weight', () => {
  const ctl = start(rich, goalEvents()); toQ6(ctl); ctl.choose('q6', 'mc.q6.choice.e', ctl.seq);
  ctl.chooseMany('q6n', ['mc.q6n.claim.unresolved_reading'], ctl.seq); ctl.chooseMany('q6a', ['mc.q6.am.free.make_own_way'], ctl.seq);
  ctl.finish(ctl.seq);
  const ledger = goalEvents();
  const ev = F.buildSurveyLedgerPatch({ actor: actor(ledger), selection: ctl.serialize(), transactionId: 'lv', level: 4, completedAt: 'now' })['flags.foundryvtt-swse.mentorSurvey.events'];
  const added = ev.slice(ledger.length);
  assert.deepEqual(added.map((e) => e.type), ['survey_completed', 'reflection_snapshot', 'reflection_correction']);
  const corr = added[2];
  assert.equal(corr.lane, 'inferred_current_identity'); assert.equal(corr.negativeWeight, false);
  assert.equal(corr.mutatesMechanics, false); assert.equal(corr.mutatesGoals, false); assert.equal(corr.mutatesEligibility, false);
  assert.deepEqual(L.reduceLedger(ev).goals['l1.long_term_ambition'].target, { type: 'response_only', id: null }, 'the declared goal is untouched');
  assert.ok(!added.some((e) => /goal_/.test(e.type)));
});

test('SV-23 an AM statement for the same identity as a rejected claim needs reconciliation (engine rule)', () => {
  const claims = [{ claimId: 'c.a', claimKind: 'archetype_parent', canonicalRef: { id: 'diplomat', kind: 'parent' } }];
  const r = Rf.createReading({ surveyKind: 'multiclass', scopeId: 'noble', projection: E.projectActorEvidence(rich), claims, amCandidates: [{ candidateId: 'am.diplomat', canonicalRef: { id: 'diplomat', kind: 'parent' } }, { candidateId: 'am.free', free: true }], archetypeLookup: lookup, actorRevision: 'r' });
  let s = Rf.selectNot(r, Rf.chooseCalibration(r, Rf.beginCalibration(r), 'D'), ['c.a']);
  assert.equal(Rf.selectAm(r, s, ['am.diplomat']).error, 'contradiction_needs_reconciliation');
  assert.equal(Rf.selectAm(r, s, ['am.free']).ok, true, 'a plain self-description does not conflict');
});

test('SV-13 a declared archetype goal surfaces its own affirmative statement ahead of the free-standing ones', () => {
  const ev = goalEvents('I want to become a diplomat.', 'l1.career', { type: 'archetype_parent', id: 'diplomat' });
  const ctl = start(rich, ev); toQ6(ctl); ctl.choose('q6', 'mc.q6.choice.d', ctl.seq); ctl.chooseMany('q6n', [], ctl.seq);
  const o = ctl.view().view.options;
  assert.equal(o[0].optionId, 'mc.q6.am.id.diplomat'); assert.match(o[0].text, /Diplomat path/); assert.equal(o.length, 19);
});

test('SV-13 a changed actor evidence or goal invalidates the Q6 answer (not silently replaced); Q1-Q5 are untouched', () => {
  const ctl = start(rich, goalEvents()); toQ6(ctl); ctl.choose('q6', 'mc.q6.choice.b', ctl.seq);
  const q5Before = ctl.draft.answers.q5.optionId;
  ctl.sync({ selectedClassId: 'noble', classLevels: { soldier: 3 }, seed: 's1', evidence: E.projectActorEvidence({ ...rich, items: [...rich.items, item('feat', 'Weapon Focus')] }), events: goalEvents() });
  assert.equal(ctl.draft.answers.q6, undefined); assert.ok(ctl.draft.invalidated.q6); assert.equal(ctl.draft.answers.q5.optionId, q5Before);
  assert.ok(ctl.view().staleNotice);
});

test('MC-13/SV-12 canceled or skipped Q6 persists nothing; a retake supersedes only its own snapshot and never adds weight', () => {
  const c = start(rich, goalEvents()); toQ6(c); c.choose('q6', 'mc.q6.choice.a', c.seq); c.finish(c.seq); c.cancel(c.seq);
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: actor(), selection: c.serialize(), transactionId: 't', level: 4, completedAt: 'now' }), {});
  const mk = (tx, choice) => { const x = start(rich, goalEvents()); toQ6(x); x.choose('q6', `mc.q6.choice.${choice.toLowerCase()}`, x.seq); if (choice !== 'A') { x.chooseMany('q6n', [], x.seq); } x.finish(x.seq); return F.buildSurveyLedgerPatch({ actor: actor(first || []), selection: x.serialize(), transactionId: tx, level: 4, completedAt: 'now' })['flags.foundryvtt-swse.mentorSurvey.events']; };
  var first = null; first = mk('lv-a', 'A');
  const second = mk('lv-b', 'A');
  assert.equal(second.at(-1).type, 'reflection_snapshot'); assert.equal(second.at(-1).supersedes, first.find((e) => e.type === 'reflection_snapshot').eventId);
  assert.equal(second.filter((e) => e.type === 'reflection_snapshot').length, 2, 'history preserved');
});

test('SV-11 a duplicate Q6 submission is ignored; replaying finalization appends nothing', () => {
  const ctl = start(rich, goalEvents()); toQ6(ctl); const tok = ctl.seq;
  assert.ok(ctl.choose('q6', 'mc.q6.choice.a', tok)); assert.equal(ctl.choose('q6', 'mc.q6.choice.b', tok), false);
  ctl.finish(ctl.seq);
  const args = { selection: ctl.serialize(), transactionId: 'lv', level: 4, completedAt: 'now' };
  const l = F.buildSurveyLedgerPatch({ actor: actor(), ...args })['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: actor(l), ...args }), {});
});

test('MC-02 each destination uses its OWN Mentor frame for Q6 (all five)', () => {
  for (const [dest, origin] of [['jedi', 'noble'], ['noble', 'soldier'], ['scoundrel', 'scout'], ['scout', 'jedi'], ['soldier', 'scoundrel']]) {
    const ctl = new M.MulticlassSurveyController({ pack, manifest, preview: true, archetypeLookup: lookup }).sync({ selectedClassId: dest, classLevels: { [origin]: 3 }, seed: 's', evidence: E.projectActorEvidence(rich), events: [] });
    ctl.choose('q1', `mc.${dest}.q1.${origin}.01`, ctl.seq); ctl.choose('q3', 'mc.q3.dip', ctl.seq); ctl.choose('q4', ctl.view().view.options[0].optionId, ctl.seq); ctl.choose('q5', ctl.view().view.options[0].optionId, ctl.seq);
    const v = ctl.view();
    assert.equal(v.view.questionId, 'q6'); assert.equal(v.view.mentorIntro, q6.mentors[dest].opening.text); assert.equal(v.view.prompt, q6.mentors[dest].closing.text);
  }
});

test('MC-16 full six-question multiclass lifecycle: Q1,Q3,Q4,Q5,Q6 run, Q2 is skipped for the stated reason, nothing is committed until finalization', () => {
  const ctl = start(rich, goalEvents()); toQ6(ctl); ctl.choose('q6', 'mc.q6.choice.c', ctl.seq); ctl.chooseMany('q6n', [], ctl.seq);
  assert.equal(ctl.view().phase, 'ready'); assert.ok(ctl.draft.skipped.q2 && !ctl.draft.skipped.q6);
  const rec = ctl.finish(ctl.seq);
  assert.deepEqual(Object.keys(rec.payload.answers), ['q1', 'q3', 'q4', 'q5', 'q6', 'q6n']);
  assert.equal(rec.answerDetails.q6n.texts.length, 0);
  assert.equal(actor().flags['foundryvtt-swse'].mentorSurvey.events.length, 0);
});

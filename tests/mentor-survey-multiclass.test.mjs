import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = 'scripts/mentor/mentor-survey-v2';
const u = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const M = await import(u(`${dir}/multiclass-controller.js`));
const R = await import(u(`${dir}/resolvers/multiclass.js`));
const SC = await import(u(`${dir}/survey-controller.js`));
const S = await import(u(`${dir}/content-store.js`));
const F = await import(u(`${dir}/finalization.js`));
const L = await import(u(`${dir}/intent-ledger.js`));
const I = await import(u(`${dir}/survey-influence.js`));
const L1 = await import(u(`${dir}/l1-controller.js`));

const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const pack = json('data/mentor-survey/multiclass.json');
const l1pack = json('data/mentor-survey/l1.json');
const manifest = json('data/mentor-survey/release-manifest.json');
const routes = json('data/mentor-survey/class-mentor-routes.json');
const archetypes = json('data/archetypes.json').archetypes;
const FC = R.FOUNDATION_CLASSES;
const TRANSITIONS = FC.flatMap((o) => FC.filter((d) => d !== o).map((d) => [o, d]));
const mk = (over = {}, stored = null) => new M.MulticlassSurveyController({ pack, manifest, preview: true, archetypeLookup: (id) => archetypes[id] || null, ...over }, stored);
const start = (origin, dest, over = {}, extra = {}) => mk(over).sync({ selectedClassId: dest, classLevels: { [origin]: 3, ...extra }, seed: 'session-1' });
const pickFirstOffered = (ctl) => { const v = ctl.view(); return ctl.choose(v.view.questionId, v.view.options[0].optionId, ctl.seq); };
const actor = (events = []) => ({ flags: { 'foundryvtt-swse': { mentorSurvey: { events } } } });

test('MC-01 the survey triggers only on the FIRST acquisition of a new foundation class', () => {
  assert.equal(R.multiclassTrigger({ selectedClassId: 'noble', classLevels: { soldier: 2 } }).applicable, true);
  assert.equal(R.multiclassTrigger({ selectedClassId: 'soldier', classLevels: { soldier: 2 } }).reason, 'class_already_held', 'a further level in a held class never triggers');
  assert.equal(R.multiclassTrigger({ selectedClassId: 'noble', classLevels: { noble: 1, soldier: 2 } }).applicable, false);
  assert.equal(R.multiclassTrigger({ selectedClassId: 'ace_pilot', classLevels: { scoundrel: 4 } }).applicable, false, 'prestige classes never trigger it');
  assert.equal(R.multiclassTrigger({ selectedClassId: 'jedi', classLevels: {} }).applicable, false, 'no prior foundation class (level 1) is the L1 survey');
  assert.equal(R.multiclassTrigger({ selectedClassId: 'jedi', classLevels: { jedi: 0, noble: 0 } }).applicable, false);
  assert.equal(mk().sync({ selectedClassId: 'soldier', classLevels: { soldier: 3 } }).view().phase, 'unavailable');
});

test('MC-03 all 20 directed transitions route to the right bank, intro and six first-person answers', () => {
  assert.equal(TRANSITIONS.length, 20);
  for (const [o, d] of TRANSITIONS) {
    const ctl = start(o, d);
    assert.equal(ctl.availability.available, true, `${o}->${d}`);
    const v = ctl.view();
    assert.equal(v.phase, 'question'); assert.equal(v.view.questionId, 'q1');
    assert.equal(v.view.mentorIntro, pack.mentors[d].q1Intros[o].text, `${o}->${d} intro`);
    assert.equal(v.view.options.length, 6, 'five directions + one neutral');
    assert.ok(v.view.options.every((x) => x.optionId.startsWith(`mc.${d}.q1.${o}.`)), 'options belong to this exact transition');
    assert.ok(v.view.options.every((x) => S.isFirstPerson(x.text)));
    assert.deepEqual(S.scanViewForLeaks(v.view), []);
  }
});

test('MC-02/PR-02 the DESTINATION class Mentor narrates (Miraj, J0-N1, Ol\' Salty, Lead, Breach), never the origin', () => {
  const expect = { jedi: 'miraj', noble: 'j0_n1', scoundrel: 'ol_salty', scout: 'lead', soldier: 'breach' };
  for (const d of FC) { assert.equal(pack.mentors[d].mentorRegistryKey, expect[d]); assert.equal(routes.foundation[d].mentorRegistryKey, expect[d]); }
  for (const [o, d] of TRANSITIONS) assert.ok(pack.mentors[d].q1Intros[o].id.startsWith(`mc.${d}.`), 'intro id is destination-owned');
});

test('MC-04 two or more prior foundation classes: survey withheld (MSV-RD-004); no origin is chosen, even in preview', () => {
  const t = R.multiclassTrigger({ selectedClassId: 'jedi', classLevels: { noble: 2, scout: 1 } });
  assert.equal(t.applicable, true); assert.equal(t.originClassId, null); assert.deepEqual(t.originClassIds.sort(), ['noble', 'scout']); assert.equal(t.reason, 'multiple_origin_unruled');
  for (const preview of [false, true]) {
    const ctl = mk({ preview }).sync({ selectedClassId: 'jedi', classLevels: { noble: 2, scout: 1, soldier: 1 } });
    assert.equal(ctl.availability.available, false); assert.equal(ctl.availability.reason, 'multiple_origin_unruled');
    assert.equal(ctl.view().phase, 'unavailable'); assert.equal(ctl.finish(1), null);
  }
});

test('MC-05 fixed Q3-Q5 Mentor intros come from content, never generated, one per destination', () => {
  for (const d of FC) for (const q of ['q3', 'q4', 'q5']) { assert.ok(pack.mentors[d].intros[q].text.length > 20); assert.equal(pack.mentors[d].intros[q].speaker, 'mentor'); }
  const ctl = start('soldier', 'noble'); ctl.choose('q1', 'mc.noble.q1.soldier.01', ctl.seq);
  assert.equal(ctl.view().view.mentorIntro, pack.mentors.noble.intros.q3.text);
});

test('MC-06 Q3 offers the same four owner-approved depth answers for every transition', () => {
  assert.deepEqual(pack.q3.map((x) => x.depth), ['dip', 'dive', 'swim', 'undecided']);
  assert.ok(pack.q3.every((x) => x.editorialStatus === 'owner_approved_text'));
  for (const [o, d] of TRANSITIONS) {
    const ctl = start(o, d); ctl.choose('q1', ctl.view().view.options[0].optionId, ctl.seq);
    const v = ctl.view();
    assert.equal(v.view.questionId, 'q3');
    assert.deepEqual(v.view.options.map((x) => x.optionId), ['mc.q3.dip', 'mc.q3.dive', 'mc.q3.swim', 'mc.q3.undecided']);
    assert.ok(v.view.options.every((x) => x.detail && S.isFirstPerson(x.text)));
  }
});

test('MC-07/MC-08/MC-09 depth is a typed self-report: undecided infers nothing, Bridge is never a depth, no level lock or quota', () => {
  assert.ok(!pack.q3.some((x) => /bridge/i.test(x.id + x.text)), 'bridge is a purpose, not a depth');
  for (const [pick, expected] of [['mc.q3.dip', 'dip'], ['mc.q3.dive', 'dive'], ['mc.q3.swim', 'swim'], ['mc.q3.undecided', null]]) {
    const ctl = start('scout', 'jedi'); ctl.choose('q1', 'mc.jedi.q1.scout.01', ctl.seq); ctl.choose('q3', pick, ctl.seq);
    assert.equal(R.multiclassTyped(pack, ctl.draft, ctl.ctx).declaredClassInvestmentDepth, expected, pick);
  }
  const ctl = start('scout', 'jedi'); ctl.choose('q1', 'mc.jedi.q1.scout.01', ctl.seq); ctl.choose('q3', 'mc.q3.swim', ctl.seq);
  const typed = R.multiclassTyped(pack, ctl.draft, ctl.ctx);
  assert.ok(!Object.keys(typed).some((k) => /lock|quota|levels?$|target/i.test(k)));
  assert.deepEqual(ctl.adapter.goals(pack, ctl.draft, ctl.ctx), [], 'swim never declares or replaces a career goal');
});

test('MC-10 Q4 scene follows the exact Q1 answer through the route map: all 100 substantive routes resolve to a scene in the right family', () => {
  let routed = 0;
  for (const [o, d] of TRANSITIONS) for (let pos = 1; pos <= 5; pos++) {
    const ctl = start(o, d);
    assert.ok(ctl.choose('q1', `mc.${d}.q1.${o}.${String(pos).padStart(2, '0')}`, ctl.seq));
    ctl.choose('q3', 'mc.q3.dive', ctl.seq);
    const v = ctl.view();
    assert.equal(v.view.questionId, 'q4', `${o}->${d} #${pos}`);
    const sc = R.q4Scenario(pack, ctl.ctx, ctl.draft.answers.q1);
    assert.equal(sc.destination, d); assert.equal(sc.family, pack.q4Routes[d][o][pos - 1]);
    assert.equal(v.view.situation, sc.situation.text);
    assert.equal(v.view.options.length, 6, 'five methods + a neutral answer');
    routed += 1;
  }
  assert.equal(routed, 100); assert.equal(Object.keys(pack.q4).length, 250);
});

test('MC-10 Q3 depth and re-asking never change the scene; the same unchanged draft shows the same scene', () => {
  const sceneFor = (depth) => { const c = start('soldier', 'noble'); c.choose('q1', 'mc.noble.q1.soldier.02', c.seq); c.choose('q3', depth, c.seq); return c.view().view.situation; };
  assert.equal(sceneFor('mc.q3.dip'), sceneFor('mc.q3.swim')); assert.equal(sceneFor('mc.q3.undecided'), sceneFor('mc.q3.dive'));
  const a = start('soldier', 'noble'); a.choose('q1', 'mc.noble.q1.soldier.02', a.seq); a.choose('q3', 'mc.q3.dip', a.seq);
  const b = MC_clone(a); assert.equal(b.view().view.situation, a.view().view.situation);
  function MC_clone(ctl) { return mk({}, JSON.parse(JSON.stringify(ctl.serialize()))).sync({ selectedClassId: 'noble', classLevels: { soldier: 3 }, seed: 'session-1' }); }
});

test('MC-10 changing Q1 invalidates the dependent Q4 answer without silently replacing it', () => {
  const ctl = start('scout', 'soldier'); ctl.choose('q1', 'mc.soldier.q1.scout.01', ctl.seq); ctl.choose('q3', 'mc.q3.dip', ctl.seq);
  const sc = ctl.view().view; ctl.choose('q4', sc.options[0].optionId, ctl.seq);
  ctl.goTo('q1', ctl.seq); ctl.choose('q1', 'mc.soldier.q1.scout.03', ctl.seq);
  assert.equal(ctl.draft.answers.q4, undefined); assert.ok(ctl.draft.invalidated.q4); assert.equal(ctl.draft.answers.q3.optionId, 'mc.q3.dip', 'Q3 does not depend on Q1');
});

test('MC-16 an undecided Q1 invents no route: Q4 and Q5 are skipped (MSV-RD-008), Q3 depth still works', () => {
  const ctl = start('noble', 'jedi');
  assert.ok(ctl.choose('q1', 'mc.jedi.q1.noble.06', ctl.seq));
  assert.equal(ctl.view().view.questionId, 'q3'); ctl.choose('q3', 'mc.q3.dive', ctl.seq);
  assert.equal(ctl.view().phase, 'ready'); assert.ok(ctl.draft.skipped.q4 && ctl.draft.skipped.q5 && ctl.draft.skipped.q2 && ctl.draft.skipped.q6);
  assert.ok(ctl.finish(ctl.seq));
});

test('MC-17 Q5: the career-continuity template (needs an unavailable goal phrase) is withheld; no placeholder ever reaches a player', () => {
  const withSlot = Object.values(pack.q5).flatMap((o) => Object.values(o)).flatMap((r) => Object.values(r)).flat().filter((x) => x.needsGoalSlot);
  assert.equal(withSlot.length, 100); assert.ok(withSlot.every((x) => x.kind === 'career_continuity' && /\{declared_goal\}/.test(x.text)));
  const ctl = start('jedi', 'noble'); ctl.choose('q1', 'mc.noble.q1.jedi.01', ctl.seq); ctl.choose('q3', 'mc.q3.dip', ctl.seq);
  const q4 = ctl.view().view; ctl.choose('q4', q4.options[0].optionId, ctl.seq);
  const q5 = ctl.view();
  assert.equal(q5.view.questionId, 'q5'); assert.equal(q5.view.options.length, 5, 'four milestones + undecided');
  assert.ok(q5.view.options.every((o) => !/\{|\}|declared_goal/.test(o.text)));
  assert.ok(!q5.view.options.some((o) => o.optionId.includes('career_continuity')));
  assert.equal(q5.view.options.at(-1).optionId, 'mc.q5.undecided');
  assert.deepEqual(S.scanViewForLeaks(q5.view), []);
});

test('MC-15 Q2 and Q6 are blocked at the source and are skipped, never invented', () => {
  assert.ok(pack.blocked.q2 && pack.blocked.q6);
  assert.equal(R.resolveMulticlassQuestion({ pack, draft: { answers: {} }, qid: 'q2', ctx: { destinationClassId: 'jedi', originClassId: 'noble' }, preview: true }).reason, 'blocked_source');
  assert.equal(R.resolveMulticlassQuestion({ pack, draft: { answers: {} }, qid: 'q6', ctx: { destinationClassId: 'jedi', originClassId: 'noble' }, preview: true }).reason, 'blocked_source');
  assert.ok(!('q2' in pack) && !('q6' in pack), 'no Q2/Q6 player content exists in the pack');
});

test('SV-07/SV-08 every selectable multiclass record is first person and leak free (the 100 goal-slot templates are never offered)', () => {
  const bad = [...M.buildRecordIndex(pack).values()].filter((r) => !r.needsGoalSlot).flatMap((r) => S.validateResponseRecord(r));
  assert.deepEqual(bad, []);
  assert.equal([...M.buildRecordIndex(pack).values()].length, 120 + 4 + 1250 + 250 + 500 + 1);
});

test('SV-09 release gate: with no preview every multiclass scope is unavailable; draft content never reaches players', () => {
  for (const [o, d] of TRANSITIONS) assert.equal(start(o, d, { preview: false }).view().phase, 'unavailable');
  const released = { surveys: { multiclass: { noble: { releaseState: 'released' } } } };
  const c = start('soldier', 'noble', { preview: false, manifest: released });
  assert.equal(c.view().phase, 'unavailable'); assert.equal(c.view().reason, 'unapproved_content');
});

const completeFlow = (ctl) => {
  ctl.choose('q1', ctl.view().view.options[0].optionId, ctl.seq);
  ctl.choose('q3', 'mc.q3.dive', ctl.seq);
  ctl.choose('q4', ctl.view().view.options[0].optionId, ctl.seq);
  ctl.choose('q5', ctl.view().view.options[0].optionId, ctl.seq);
  return ctl.finish(ctl.seq);
};

test('MC-13 commit happens only through the finalizer: typed depth and class context ride the event; canceled/skipped persist nothing', () => {
  const ctl = start('soldier', 'noble'); const rec = completeFlow(ctl);
  assert.ok(rec); assert.equal(rec.scopeKey, 'multiclass:noble'); assert.deepEqual(rec.goals, []);
  assert.deepEqual(rec.typed, { destinationClassId: 'noble', originClassId: 'soldier', declaredClassInvestmentDepth: 'dive' });
  const patch = F.buildSurveyLedgerPatch({ actor: actor(), selection: ctl.serialize(), transactionId: 'levelup-3', level: 4, completedAt: 'now' });
  const ev = patch['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.equal(ev.length, 1); assert.equal(ev[0].surveyKind, 'multiclass'); assert.equal(ev[0].scopeId, 'noble'); assert.equal(ev[0].actorLevel, 4);
  assert.equal(ev[0].typed.declaredClassInvestmentDepth, 'dive'); assert.equal(ev[0].provenance.preview, true);
  assert.deepEqual(ev[0].tagEvidence, []);
  const cancel = start('soldier', 'noble'); completeFlow(cancel); cancel.cancel(cancel.seq);
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: actor(), selection: cancel.serialize(), transactionId: 't', level: 4, completedAt: 'now' }), {});
  const skip = start('soldier', 'noble'); skip.skipSurvey(skip.seq);
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: actor(), selection: skip.serialize(), transactionId: 't', level: 4, completedAt: 'now' }), {});
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: actor(), selection: ctl.serialize(), transactionId: 't', level: undefined, completedAt: 'now' }), {});
});

test('SV-11 duplicate finalize is idempotent; SV-25 a later multiclass event for another class is a separate scope', () => {
  const a = start('soldier', 'noble'); completeFlow(a);
  const args = { selection: a.serialize(), transactionId: 'levelup-3', level: 4, completedAt: 'now' };
  const ledger = F.buildSurveyLedgerPatch({ actor: actor(), ...args })['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: actor(ledger), ...args }), {});
  const b = start('soldier', 'jedi', {}, { noble: 0 }); completeFlow(b);
  const ledger2 = F.buildSurveyLedgerPatch({ actor: actor(ledger), selection: b.serialize(), transactionId: 'levelup-6', level: 7, completedAt: 'later' })['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.equal(ledger2.length, 2); assert.ok(ledger2.every((e) => !e.supersedes), 'different destinations do not supersede each other');
});

test('SV-32 a multiclass event never resets or merges with the L1 event: sessions coexist and each keeps its own clock', () => {
  const l1 = new L1.L1SurveyController({ pack: l1pack, manifest, preview: true, archetypeLookup: (id) => archetypes[id] || null });
  l1.sync({ classId: 'soldier', speciesKeys: ['species-human'] }); l1.choose('q1', l1pack.q1.soldier.options[0].id, l1.seq);
  const mc = start('soldier', 'noble'); completeFlow(mc);
  // the step merges each controller's entry into one shared session value
  let session = SC.mergeIntoSessionValue(null, l1.entry());
  session = SC.mergeIntoSessionValue(session, mc.entry());
  assert.deepEqual(Object.keys(session.drafts).sort(), ['l1', 'multiclass:noble']); assert.deepEqual(Object.keys(session.committed), ['multiclass:noble'], 'only the finished survey is staged');
  const l1Event = L.buildCompletionEvents({ payload: { surveyKind: 'l1', scopeId: 'soldier', definitionVersion: 1, contextRevision: 'x', answers: {} }, transactionId: 'c1', actorLevel: 1, completedAt: 'x' });
  const mcEvent = F.buildSurveyLedgerPatch({ actor: actor(l1Event), selection: session, transactionId: 'l4', level: 4, completedAt: 'x' })['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.equal(mcEvent.length, 2); assert.equal(mcEvent[1].supersedes, undefined);
  I.registerOntologyTags(['t']);
  try {
    assert.deepEqual(I.computeSurveyInfluence(mcEvent.map((e) => ({ ...e, tagEvidence: [{ questionId: 'q1', tag: 't', E: 1, certified: true }] })), 10).events.map((e) => e.surveyKind), ['l1'], 'the multiclass PREVIEW event never influences anything; only the L1 event counts');
    const ev = mcEvent.map((e) => ({ ...e, provenance: { ...e.provenance, preview: false }, tagEvidence: [{ questionId: 'q1', tag: 't', E: 1, certified: true }] })); // simulates approved, released content
    const r = I.computeSurveyInfluence(ev, 10);
    assert.deepEqual(r.events.map((e) => [e.surveyKind, e.age]), [['l1', 9], ['multiclass', 6]]);
  } finally { I.resetOntologyTags(); }
});

test('SV-11/SV-13 multiclass lifecycle: skip, back, revisit, duplicate token and a stale species-free draft resume', () => {
  const ctl = start('scout', 'jedi'); const tok = ctl.seq;
  assert.ok(ctl.choose('q1', 'mc.jedi.q1.scout.02', tok)); assert.equal(ctl.choose('q1', 'mc.jedi.q1.scout.03', tok), false);
  assert.ok(ctl.back(ctl.seq)); assert.equal(ctl.view().selectedOptionId, 'mc.jedi.q1.scout.02');
  const resumed = mk({}, JSON.parse(JSON.stringify(ctl.serialize()))).sync({ selectedClassId: 'jedi', classLevels: { scout: 3 }, seed: 'session-1' });
  assert.equal(resumed.draft.answers.q1.optionId, 'mc.jedi.q1.scout.02');
  const a = start('scout', 'jedi'); a.skipSurvey(a.seq); assert.equal(a.finish(a.seq), null); assert.equal(a.view().phase, 'skipped');
  const other = mk({}, JSON.parse(JSON.stringify(ctl.serialize()))).sync({ selectedClassId: 'jedi', classLevels: { noble: 3 }, seed: 'session-1' });
  assert.ok(other.draft.invalidated.q1 || Object.keys(other.draft.answers).length === 0, 'a different origin never reuses the old origin\'s answers');
});

test('MC-01 droid and 3+-class characters keep working: unrelated classes are ignored by the trigger', () => {
  assert.equal(R.multiclassTrigger({ selectedClassId: 'noble', classLevels: { independent_droid: 3, soldier: 2 } }).originClassId, 'soldier');
  assert.equal(R.multiclassTrigger({ selectedClassId: 'noble', classLevels: { jedi_knight: 4, jedi: 3 } }).originClassId, 'jedi', 'prestige classes do not count as origins');
  assert.equal(R.multiclassTrigger({ selectedClassId: 'noble', classLevels: { jedi_knight: 4 } }).applicable, false);
});

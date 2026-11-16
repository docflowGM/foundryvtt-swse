import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = 'scripts/mentor/mentor-survey-v2';
const u = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const P = await import(u(`${dir}/prestige-controller.js`));
const R = await import(u(`${dir}/resolvers/prestige.js`));
const S = await import(u(`${dir}/content-store.js`));
const F = await import(u(`${dir}/finalization.js`));
const L = await import(u(`${dir}/intent-ledger.js`));
const SC = await import(u(`${dir}/survey-controller.js`));
const Rf = await import(u(`${dir}/reflection.js`));

const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const pack = json('data/mentor-survey/prestige.json');
const manifest = json('data/mentor-survey/release-manifest.json');
const routes = json('data/mentor-survey/class-mentor-routes.json');
const IDS = Object.keys(pack.classes);
const mk = (over = {}, stored = null) => new P.PrestigeSurveyController({ pack, manifest, preview: true, archetypeLookup: () => null, ...over }, stored);
const start = (cls, levels = { jedi: 6 }, over = {}) => mk(over).sync({ selectedClassId: cls, classLevels: levels });
const actor = (events = []) => ({ flags: { 'foundryvtt-swse': { mentorSurvey: { events } } } });
const finishAll = (ctl, { depth = 'mc', purposeIndex = 0, second = true } = {}) => {
  ctl.choose('q4', depth === 'mc' ? ctl.view().view.options[1].optionId : depth, ctl.seq);
  ctl.choose('q5', ctl.view().view.options[purposeIndex].optionId, ctl.seq);
  if (second && ctl.view().view?.questionId === 'q5b') ctl.choose('q5b', ctl.view().view.options[0].optionId, ctl.seq);
  return ctl.finish(ctl.seq);
};

test('PR-02 all 32 prestige classes resolve to the owner-roster Mentor, exactly one Q4 and one Q5 section each', () => {
  assert.equal(IDS.length, 32);
  assert.deepEqual(IDS.sort(), Object.keys(routes.prestige).sort());
  for (const id of IDS) {
    assert.equal(pack.classes[id].mentorRegistryKey, routes.prestige[id].mentorRegistryKey);
    assert.ok(pack.q4[id] && pack.q5[id], id);
    assert.equal(pack.q5[id].options.length, 7); assert.deepEqual(Object.keys(pack.q4[id].rails).sort(), ['dip', 'dive', 'swim', 'undecided']);
  }
  assert.equal(pack.classes.jedi_knight.mentorRegistryKey, 'miraj'); assert.equal(pack.classes.jedi_master.mentorRegistryKey, 'miraj');
  assert.equal(pack.classes.infiltrator.mentorRegistryKey, 'delta'); assert.equal(pack.classes.assassin.mentorRegistryKey, 'delta');
  assert.equal(pack.classes.melee_duelist.mentorRegistryKey, 'kharjo');
  assert.notEqual(pack.q4.jedi_knight.pendingIntro.text, pack.q4.jedi_master.pendingIntro.text, 'shared Mentors keep per-class relationship text');
  assert.notEqual(pack.q4.infiltrator.pendingIntro.text, pack.q4.assassin.pendingIntro.text);
});

test('PR-02 an unknown or non-prestige class fails closed: no survey and no substituted Mentor', () => {
  for (const bad of ['jedi', 'nonheroic', 'not_a_class', '']) {
    const c = start(bad); assert.equal(c.view().phase, 'unavailable'); assert.equal(c.draft, null);
  }
  assert.equal(R.prestigeAvailability({ pack, manifest, ctx: { destinationClassId: 'zzz' }, preview: true }).reason, 'unknown_class');
});

test('PR-01/PR-08 trigger: only a prestige class not yet held; each acquisition is its own scope and none erases another', () => {
  const k = IDS;
  assert.equal(R.prestigeTrigger({ selectedClassId: 'ace_pilot', classLevels: { scout: 5 }, knownClassIds: k }).applicable, true);
  assert.equal(R.prestigeTrigger({ selectedClassId: 'ace_pilot', classLevels: { ace_pilot: 2 }, knownClassIds: k }).reason, 'class_already_held');
  assert.equal(R.prestigeTrigger({ selectedClassId: 'soldier', classLevels: {}, knownClassIds: k }).applicable, false);
  const a = start('ace_pilot', { scout: 6 }); const b = start('bounty_hunter', { scout: 6, ace_pilot: 3 });
  assert.equal(a.scopeKey, 'prestige:ace_pilot'); assert.equal(b.scopeKey, 'prestige:bounty_hunter');
});

test('PR-03 the survey runs before the class is finalized, so it uses the PENDING introductions, never the earned-title ones', () => {
  for (const id of IDS) {
    const c = start(id); const v = c.view();
    assert.equal(v.view.questionId, 'q4');
    assert.equal(v.view.mentorIntro, pack.q4[id].pendingIntro.text, id);
    assert.notEqual(v.view.mentorIntro, pack.q4[id].finalizedIntro.text, `${id}: pending and finalized intros differ`);
    assert.equal(v.view.prompt, pack.q4[id].question.text);
  }
});

test('PR-06 Q4 offers the four shared depth answers with class rails; bridge is not a depth; no level quota or lock', () => {
  assert.deepEqual(pack.q4Depth.map((d) => d.depth), ['dip', 'dive', 'swim', 'undecided']);
  assert.ok(pack.q4Depth.every((d) => d.editorialStatus === 'owner_approved_text' && S.isFirstPerson(d.text)));
  for (const id of IDS) {
    const v = start(id).view().view;
    assert.deepEqual(v.options.map((o) => o.optionId), ['pr.q4.dip', 'pr.q4.dive', 'pr.q4.swim', 'pr.q4.undecided']);
    assert.ok(v.options.every((o, i) => o.detail === pack.q4[id].rails[['dip', 'dive', 'swim', 'undecided'][i]].text));
    assert.deepEqual(S.scanViewForLeaks(v), []);
  }
  assert.ok(!pack.q4Depth.some((d) => /bridge/i.test(d.id + d.text)));
});

test('PR-06 depth is a typed self-report: undecided records null; it never decays or erases a goal; no goals at all', () => {
  for (const [pick, want] of [['pr.q4.dip', 'dip'], ['pr.q4.dive', 'dive'], ['pr.q4.swim', 'swim'], ['pr.q4.undecided', null]]) {
    const c = start('ace_pilot'); c.choose('q4', pick, c.seq);
    assert.equal(R.prestigeTyped(pack, c.draft, c.ctx).declaredPrestigeDepth, want, pick);
    assert.deepEqual(c.adapter.goals(pack, c.draft, c.ctx), []);
  }
});

test('PR-07 Q5 offers seven class-specific first-person purposes with no titles; one primary and an optional second without weight', () => {
  for (const id of IDS) {
    const c = start(id); c.choose('q4', 'pr.q4.dive', c.seq);
    const v = c.view();
    assert.equal(v.view.questionId, 'q5'); assert.equal(v.view.options.length, 7);
    assert.equal(v.view.mentorIntro, pack.q5[id].pendingIntro.text);
    assert.ok(v.view.options.every((o) => S.isFirstPerson(o.text) && Object.keys(o).every((k) => ['optionId', 'text', 'detail', 'kind'].includes(k))), `${id} no category title fields`);
    assert.deepEqual(S.scanViewForLeaks(v.view), []);
  }
  const c = start('ace_pilot'); c.choose('q4', 'pr.q4.dive', c.seq); c.choose('q5', 'pr.ace_pilot.q5.refinement', c.seq);
  const second = c.view();
  assert.equal(second.view.questionId, 'q5b'); assert.equal(second.questionNumber, 5);
  assert.equal(second.view.options.length, 6, 'the other five purposes (not the primary, not undecided) plus a decline');
  assert.ok(!second.view.options.some((o) => o.optionId.endsWith('.refinement')) && !second.view.options.some((o) => o.optionId.endsWith('.undecided')));
  assert.equal(second.view.options.at(-1).optionId, 'pr.ace_pilot.q5b.decline');
  c.choose('q5b', 'pr.ace_pilot.q5.contribution', c.seq);
  assert.deepEqual(R.prestigeTyped(pack, c.draft, c.ctx), { prestigeClassId: 'ace_pilot', q2BiasKey: null, classDiscoverySourceId: null, responsibilityScene: null, responsibilityLetter: null, declaredPrestigeDepth: 'dive', primaryPurpose: 'refinement', secondaryPurpose: 'contribution' });
});

test('PR-07/PR-09 declining the second purpose and choosing "undecided" are valid and force nothing: no goal, no next class', () => {
  const a = start('officer'); a.choose('q4', 'pr.q4.undecided', a.seq); a.choose('q5', 'pr.officer.q5.undecided', a.seq); a.view();
  assert.equal(a.draft.skipped.q5b, true, 'an undecided primary has no second purpose');
  const rec = a.finish(a.seq); assert.ok(rec); assert.deepEqual(rec.goals, []);
  assert.equal(rec.typed.primaryPurpose, 'undecided'); assert.equal(rec.typed.secondaryPurpose, null); assert.equal(rec.typed.declaredPrestigeDepth, null);
  const b = start('officer'); b.choose('q4', 'pr.q4.swim', b.seq); b.choose('q5', 'pr.officer.q5.calling', b.seq); b.choose('q5b', 'pr.officer.q5b.decline', b.seq);
  const r2 = b.finish(b.seq); assert.equal(r2.typed.secondaryPurpose, null); assert.deepEqual(r2.goals, []);
  const c = start('officer'); c.choose('q4', 'pr.q4.swim', c.seq); c.choose('q5', 'pr.officer.q5.another_career', c.seq);
  assert.deepEqual(c.adapter.goals(pack, c.draft, c.ctx), [], '"another career" records a purpose only; a goal needs an explicit affirmation (MSV-RD-010)');
});

test('PR-12/PR-10 without the Q1/Q3 companion pack, and always for Q2 and Q6, questions are source-blocked and skipped; nothing is reconstructed', () => {
  for (const q of ['q1', 'q2', 'q3', 'q6']) assert.equal(R.resolvePrestigeQuestion({ pack, draft: { answers: {} }, qid: q, ctx: { destinationClassId: 'ace_pilot' }, preview: true }).reason, 'blocked_source');
  assert.deepEqual(Object.keys(pack.blocked).sort(), ['q2', 'q6']);
  assert.match(pack.blocked.q6, /not in Git/);
  const c = start('gladiator'); c.choose('q4', 'pr.q4.dip', c.seq); c.choose('q5', 'pr.gladiator.q5.exploration', c.seq); c.choose('q5b', 'pr.gladiator.q5b.decline', c.seq);
  assert.equal(c.view().phase, 'ready'); assert.ok(c.draft.skipped.q1 && c.draft.skipped.q2 && c.draft.skipped.q3 && c.draft.skipped.q6);
});

test('SV-07/SV-08 every selectable prestige record is first person and leak free', () => {
  const bad = [...P.buildRecordIndex(pack).values()].flatMap((r) => S.validateResponseRecord(r));
  assert.deepEqual(bad, []);
  assert.equal([...P.buildRecordIndex(pack).values()].length, 4 + 224 + 32);
});

test('SV-09 release gate: with no preview every prestige scope is unavailable; only Ace Pilot Q4 is fully owner-approved; draft text never reaches players', () => {
  for (const id of IDS) assert.equal(start(id, { jedi: 6 }, { preview: false }).view().phase, 'unavailable', id);
  const rel = { surveys: { prestige: Object.fromEntries(IDS.map((i) => [i, { releaseState: 'released' }])) } };
  const q4Approved = IDS.filter((id) => start(id, { jedi: 6 }, { preview: false, manifest: rel }).view().phase === 'question');
  assert.deepEqual(q4Approved, ['ace_pilot'], 'Q4 is playable without preview only where every presented line is approved');
  const ap = start('ace_pilot', { jedi: 6 }, { preview: false, manifest: rel }); ap.choose('q4', 'pr.q4.dive', ap.seq);
  assert.equal(ap.view().reason, 'unapproved_content', 'Ace Pilot Q5 intro is still a proposal, so Q5 withholds');
});

test('SV-12 prestige commit goes only through the finalizer; cancel or skip persists nothing; typed purposes ride the event', () => {
  const c = start('ace_pilot'); const rec = finishAll(c);
  assert.ok(rec); assert.equal(rec.scopeKey, 'prestige:ace_pilot');
  const patch = F.buildSurveyLedgerPatch({ actor: actor(), selection: c.serialize(), transactionId: 'levelup-9', level: 9, completedAt: 'now' });
  const ev = patch['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.equal(ev.length, 1); assert.equal(ev[0].surveyKind, 'prestige'); assert.equal(ev[0].scopeId, 'ace_pilot'); assert.equal(ev[0].actorLevel, 9);
  assert.equal(ev[0].typed.declaredPrestigeDepth, 'dive'); assert.equal(ev[0].typed.primaryPurpose, 'calling'); assert.deepEqual(ev[0].tagEvidence, []);
  const x = start('ace_pilot'); finishAll(x); x.cancel(x.seq);
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: actor(), selection: x.serialize(), transactionId: 't', level: 9, completedAt: 'now' }), {});
  const y = start('ace_pilot'); y.skipSurvey(y.seq);
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: actor(), selection: y.serialize(), transactionId: 't', level: 9, completedAt: 'now' }), {});
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: actor(), selection: c.serialize(), transactionId: 't', level: null, completedAt: 'now' }), {});
});

test('PR-08 multiple prestige acquisitions: separate scopes in one ledger, independent history, no supersession across classes', () => {
  const a = start('ace_pilot'); finishAll(a);
  const l1 = F.buildSurveyLedgerPatch({ actor: actor(), selection: a.serialize(), transactionId: 'lv9', level: 9, completedAt: 'now' })['flags.foundryvtt-swse.mentorSurvey.events'];
  const b = start('bounty_hunter', { scout: 5, ace_pilot: 4 }); finishAll(b);
  const l2 = F.buildSurveyLedgerPatch({ actor: actor(l1), selection: b.serialize(), transactionId: 'lv13', level: 13, completedAt: 'later' })['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.equal(l2.length, 2); assert.ok(L.isAppendOnly(l1, l2)); assert.ok(l2.every((e) => !e.supersedes));
  assert.deepEqual(l2.map((e) => e.scopeId), ['ace_pilot', 'bounty_hunter']);
  // and a retake of the SAME class supersedes only its own earlier event
  const again = start('ace_pilot', { scout: 5 }); finishAll(again, { depth: 'pr.q4.swim' });
  const l3 = F.buildSurveyLedgerPatch({ actor: actor(l2), selection: again.serialize(), transactionId: 'lv-retake', level: 14, completedAt: 'x' })['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.equal(l3.at(-1).supersedes, l2[0].eventId);
});

test('PR-04/SV-23 Q6 stays on the shared engine: the reflection engine reads only finalized evidence and the prestige scope', () => {
  const evidenceActor = { items: [{ type: 'class', name: 'Scout', id: 'c1', system: { level: 5 } }, { type: 'class', name: 'Ace Pilot', id: 'c2', system: { level: 3 } }, { type: 'feat', name: 'Vehicular Combat', id: 'f1' }], system: { skills: { pilot: { trained: true } } } };
  const E = (await_import_cache.E);
  const reading = Rf.createReading({ surveyKind: 'prestige', scopeId: 'ace_pilot', projection: E.projectActorEvidence(evidenceActor), claims: [], archetypeLookup: () => null, actorRevision: 'r' });
  assert.equal(reading.identity.status, 'unresolved'); assert.ok(reading.evidence.length > 0 && reading.evidence.length <= 3);
});
const await_import_cache = { E: await import(u(`${dir}/actor-evidence.js`)) };

test('PR-03 the step stores prestige drafts in the shared session value next to other surveys', () => {
  const a = start('ace_pilot'); a.choose('q4', 'pr.q4.dip', a.seq);
  const merged = SC.mergeIntoSessionValue(SC.mergeIntoSessionValue(null, mk().sync({ selectedClassId: 'officer', classLevels: { soldier: 4 } }).entry()), a.entry());
  assert.deepEqual(Object.keys(merged.drafts).sort(), ['prestige:ace_pilot', 'prestige:officer']);
});

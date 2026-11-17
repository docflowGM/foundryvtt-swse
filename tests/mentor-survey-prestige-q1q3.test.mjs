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
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const base = json('data/mentor-survey/prestige.json');
const q1q3 = json('data/mentor-survey/prestige-q1q3.json');
const pack = { ...base, q1q3 };
const manifest = json('data/mentor-survey/release-manifest.json');
const routes = json('data/mentor-survey/class-mentor-routes.json').prestige;
const rec = json('docs/design/mentor-survey-v2/10-prestige-q1q3-recovery.json');
const IDS = Object.keys(base.classes);
const mk = (over = {}) => new P.PrestigeSurveyController({ pack, manifest, preview: true, archetypeLookup: () => null, ...over });
const start = (cls, over = {}) => mk(over).sync({ selectedClassId: cls, classLevels: { jedi: 6 } });

test('PR-13 imports all 32 Q1 banks and all 160 Q3 scenes: 1,293 Q1 answers, 800 Q3 answers, 1,293 exact route assignments', () => {
  assert.deepEqual(Object.keys(q1q3.classes).sort(), [...IDS].sort());
  const c = q1q3._meta.counts;
  assert.deepEqual(c, { classes: 32, q1Answers: 1293, q1Quarantined: 35, q3Scenes: 160, q3Answers: 800, q3RouteAssignments: 1293 });
  for (const id of IDS) {
    const k = q1q3.classes[id];
    assert.equal(k.q3.scenes.length, 5, id);
    for (const s of k.q3.scenes) { assert.equal(s.answers.length, 5, s.sceneId); assert.deepEqual(s.answers.map((a) => a.letter), ['A', 'B', 'C', 'D', 'E']); assert.ok(s.situation && s.question && s.mentor.text, s.sceneId); }
    assert.ok(k.q1.introCandidates.length >= 1 && k.q1.questionCandidates.length >= 1, `${id} keeps every authored opening and question candidate`);
  }
});

test('PR-13 every documented Q1 to Q3 route is validated class-scoped: nothing unmatched, duplicate, conflicting or orphaned', () => {
  assert.equal(rec.summary.structural.routes, 1293); assert.equal(rec.summary.joinedRouteAssignments, 1293);
  for (const k of ['unmatchedRoutes', 'duplicateRows', 'conflictingRows', 'orphanQ1Rows', 'duplicateRoutes', 'routeCountMismatch', 'q3Structure', 'editorialIssues', 'missingOpeningOrQuestion']) assert.deepEqual(rec.exceptions[k], [], k);
  assert.ok(rec.summary.rosterCheck.every((r) => r.ok), 'per-class counts equal the Q3 roster table');
  for (const id of IDS) {
    const k = q1q3.classes[id];
    const routed = new Map();
    for (const s of k.q3.scenes) for (const sid of s.routeSourceIds) { assert.ok(!routed.has(sid), `${id} ${sid} routed twice`); routed.set(sid, s.sceneId); }
    assert.equal(routed.size, k.q1.answers.length, id);
    for (const a of k.q1.answers) assert.equal(routed.get(a.sourceId), a.q3SceneId, `${id} ${a.sourceId}`);
  }
});

test('PR-14 authoritative source ids are preserved exactly; runtime ids are class-namespaced; the 23 cross-class id reuses are scoped, not merged', () => {
  const seen = new Set();
  for (const id of IDS) for (const a of q1q3.classes[id].q1.answers) {
    assert.equal(a.id, `pr.${id}.q1.${a.sourceId.toLowerCase()}`); assert.equal(a.id, a.id.toLowerCase()); assert.ok(!seen.has(a.id)); seen.add(a.id);
    assert.equal(a.sourceRef.commit, base._meta.sourceCommit); assert.ok(a.sourceRef.line > 0);
  }
  assert.equal(seen.size, 1293);
  assert.equal(rec.exceptions.crossClassIdReuse.length, 23);
  for (const x of rec.exceptions.crossClassIdReuse) {
    assert.ok(x.classes.length >= 2);
    const texts = x.classes.map((c) => q1q3.classes[c].q1.answers.find((a) => a.sourceId === x.id).text);
    assert.equal(new Set(texts).size === 1, x.identicalText, `${x.id} reported identicalText matches the records`);
  }
  // Q3 answer ids are derived (the committed source carries none): <sceneId>-<letter>
  for (const id of IDS) for (const s of q1q3.classes[id].q3.scenes) for (const a of s.answers) assert.equal(a.sourceId, `${s.sceneId}-${a.letter}`);
});

test('PR-15 Q3 Mentor lines keep the class Mentor: one speaker per class, Miraj shared by both Jedi classes, Delta by Infiltrator and Assassin', () => {
  const speakers = {};
  for (const id of IDS) { speakers[id] = new Set(q1q3.classes[id].q3.scenes.map((s) => s.mentor.speaker)); assert.equal(speakers[id].size, 1, `${id} uses one Mentor voice`); }
  assert.equal([...speakers.jedi_knight][0], 'Miraj'); assert.equal([...speakers.jedi_master][0], 'Miraj');
  assert.equal([...speakers.infiltrator][0], 'Delta'); assert.equal([...speakers.assassin][0], 'Delta');
  assert.equal([...speakers.melee_duelist][0], 'Blade Master Kharjo');
  assert.equal(base.classes.pathfinder.mentorRegistryKey, routes.pathfinder.mentorRegistryKey);
  const distinct = new Set(IDS.map((id) => routes[id].mentorRegistryKey));
  assert.equal(new Set(IDS.map((id) => [...speakers[id]][0])).size, distinct.size, 'distinct Mentor voices equal distinct routed Mentors');
});

test('PR-15 no tag, bias key, ontology topic or developer note is imported; every record is draft and nothing is certified', () => {
  const text = JSON.stringify(q1q3);
  assert.ok(!/mechanicalBiasKeys|ontologyTopic|Candidate (existing )?bias|Candidate ontology|roleBiasKey|Developer (signals|interpretation|intent)/i.test(text));
  for (const id of IDS) {
    const k = q1q3.classes[id];
    for (const r of [...k.q1.answers, ...k.q3.scenes.flatMap((s) => s.answers), ...k.q1.introCandidates, ...k.q1.questionCandidates]) { assert.equal(r.editorialStatus, 'draft_text'); assert.notEqual(r.mechanicsStatus, 'certified_mechanic'); }
    for (const c of [...k.q1.introCandidates, ...k.q1.questionCandidates]) assert.ok(['provisional_default', 'alternative'].includes(c.selection));
    assert.equal(k.q1.introCandidates.filter((c) => c.selection === 'provisional_default').length, 1, `${id} one provisional opening`);
    assert.equal(k.q1.questionCandidates.filter((c) => c.selection === 'provisional_default').length, 1, `${id} one provisional question`);
    assert.equal(k.q1.answers.filter((a) => a.kind === 'neutral').length, 1, `${id} exactly one neutral answer`);
  }
  for (const r of S.validateResponseRecord ? [...P.buildRecordIndex(pack).values()].filter((x) => /\.q[13]\./.test(x.id)).flatMap((x) => S.validateResponseRecord(x)) : []) assert.fail(String(r));
});

test('PR-10/PR-15 quarantined mechanics (35 marker-flagged rows) are never offered, even in editorial preview, and stay mapped to their route', () => {
  const quarantined = IDS.flatMap((id) => q1q3.classes[id].q1.answers.filter((a) => a.quarantine).map((a) => ({ id, a })));
  assert.equal(quarantined.length, 35);
  for (const { a } of quarantined) { assert.equal(a.presentsMechanic, true); assert.ok(a.quarantine.marker); }
  for (const cls of ['sith_lord', 'outlaw', 'gunslinger', 'force_adept']) {
    const offered = R.q1Offerable(pack, cls).map((a) => a.id);
    for (const { id, a } of quarantined.filter((x) => x.id === cls)) assert.ok(!offered.includes(a.id), a.id);
    assert.ok(offered.length > 0);
  }
  assert.equal(R.q1Offerable(pack, 'sith_lord').length, 89 - 13);
});

test('PR-12/PR-13 Q1 shows six substantive answers per page in stable source order plus the neutral answer on every page; nothing is truncated or ranked', () => {
  const a = start('gladiator'); const b = start('gladiator');
  const va = a.view().view; const vb = b.view().view;
  assert.deepEqual(va.options, vb.options); assert.equal(va.questionId, 'q1'); assert.equal(va.options.length, 7);
  const bank = q1q3.classes.gladiator.q1.answers; const neutral = bank.find((x) => x.kind === 'neutral');
  assert.deepEqual(va.options.map((o) => o.optionId), [...bank.filter((x) => x.kind !== 'neutral').slice(0, 6).map((x) => x.id), neutral.id]);
  assert.equal(va.options.at(-1).kind, 'neutral'); assert.deepEqual(Object.keys(va.options[0]).sort(), ['optionId', 'text']);
  const seen = new Set(); let pages = 1;
  for (;;) { a.view().view.options.forEach((o) => seen.add(o.optionId)); if (!a.view().view.page?.hasMore) break; assert.ok(a.more('q1', a.seq)); pages += 1; assert.equal(a.view().view.options.at(-1).optionId, neutral.id, 'neutral stays reachable on every page'); }
  assert.equal(seen.size, R.q1Offerable(pack, 'gladiator').length, 'every offerable route is reachable');
  assert.equal(pages, Math.ceil((R.q1Offerable(pack, 'gladiator').length - 1) / 6));
});

test('PR-13 capstone and fulfillment answers are ordinary choices that declare no goal; the six classes with non-NEUTRAL ids still expose one neutral', () => {
  const c = start('jedi_knight');
  const id = q1q3.classes.jedi_knight.q1.answers.find((a) => a.sourceId === 'JK-ID02');
  while (!c.view().view.options.some((o) => o.optionId === id.id)) assert.ok(c.more('q1', c.seq));
  assert.ok(c.choose('q1', id.id, c.seq));
  for (const [cls, sid] of Object.entries({ force_disciple: 'FD-UN00', jedi_knight: 'JK-ID03', jedi_master: 'JM-ID03', officer: 'OF-ID03', sith_apprentice: 'SA-ID03', sith_lord: 'SL-ID03' })) {
    const n = q1q3.classes[cls].q1.answers.find((a) => a.kind === 'neutral'); assert.equal(n.sourceId, sid); assert.equal(n.neutralBasis, 'owner_approved_neutral_2026_11_16'); assert.equal(n.editorialStatus, 'draft_text', 'only the classification is approved, not the line');
  }
});

test('PR-12 Q3 is the scene whose exact route list contains the chosen Q1 answer; changing Q1 invalidates Q3 without silent replacement', () => {
  const c = start('ace_pilot');
  const q1a = q1q3.classes.ace_pilot.q1.answers.find((x) => x.sourceId === 'AP-Q1-GN01');
  while (!c.view().view.options.some((o) => o.optionId === q1a.id)) c.more('q1', c.seq);
  assert.ok(c.choose('q1', q1a.id, c.seq));
  let v = c.view().view; assert.equal(v.questionId, 'q3'); assert.ok(v.situation);
  const scene = q1q3.classes.ace_pilot.q3.scenes.find((s) => s.routeSourceIds.includes('AP-Q1-GN01'));
  assert.deepEqual(v.options.map((o) => o.optionId), scene.answers.map((x) => x.id)); assert.equal(scene.sceneId, 'AP-Q3-S02');
  assert.ok(c.choose('q3', v.options[0].optionId, c.seq));
  assert.equal(c.draft.answers.q3.meta.sceneId, 'AP-Q3-S02');
  assert.equal(R.q3SceneFor(pack, 'ace_pilot', 'NOPE'), null, 'an unknown route selects no scene');
  assert.equal(R.q3SceneFor(pack, 'ace_pilot', 'AW01'), null, 'ids are class-scoped');
});

test('PR-12 skipping Q1 leaves Q3 unaskable (nothing is guessed), and a skipped survey records nothing', () => {
  const c = start('officer');
  assert.ok(c.skipQuestion('q1', c.seq));
  assert.equal(c.view().view.questionId, 'q4', 'Q3 has no route to follow, Q2 has no source: both are skipped by the system');
  assert.equal(R.resolvePrestigeQuestion({ pack, draft: { answers: {} }, qid: 'q3', ctx: { destinationClassId: 'officer' }, preview: true }).reason, 'not_applicable');
});

test('SV-09/PR-16 players never see Q1/Q3: provisional draft text is unavailable outside the GM editorial preview', () => {
  for (const qid of ['q1']) assert.equal(R.resolvePrestigeQuestion({ pack, draft: { answers: {} }, qid, ctx: { destinationClassId: 'ace_pilot' }, preview: false }).reason, 'unapproved_content');
  const noPreview = start('ace_pilot', { preview: false });
  assert.equal(noPreview.view().phase, 'unavailable', 'every prestige scope is withheld in the release manifest');
  assert.equal(R.pickCandidate([{ selection: 'provisional_default', text: 'a' }, { selection: 'owner_selected', text: 'b' }]).text, 'b');
  assert.equal(R.pickCandidate([{ selection: 'alternative', text: 'a' }, { selection: 'provisional_default', text: 'p' }]).text, 'p');
  assert.equal(R.pickCandidate([{ selection: 'alternative', text: 'a' }]), null);
});

test('PR-16 a full Q1 to Q5 run commits as a preview, incomplete survey: Q2 and Q6 unavailable are recorded, never silently complete', () => {
  const c = start('jedi_knight');
  const first = c.view().view.options[0].optionId;
  assert.ok(c.choose('q1', first, c.seq));
  const q3 = c.view().view; assert.equal(q3.questionId, 'q3'); assert.ok(c.choose('q3', q3.options[2].optionId, c.seq));
  assert.ok(c.choose('q4', 'pr.q4.dive', c.seq)); const q5 = c.view().view; assert.ok(c.choose('q5', q5.options[0].optionId, c.seq));
  if (c.view().view?.questionId === 'q5b') assert.ok(c.choose('q5b', c.view().view.options.at(-1).optionId, c.seq));
  const done = c.finish(c.seq);
  assert.ok(done); assert.equal(done.preview, true, 'draft text makes the event a preview event');
  assert.equal(done.coverage.complete, false);
  assert.deepEqual(done.coverage.unavailable.map((x) => x.questionId).sort(), ['q2', 'q6']);
  assert.equal(done.coverage.questions.q1, 'answered'); assert.equal(done.coverage.questions.q3, 'answered');
  assert.equal(done.typed.classDiscoverySourceId, c.draft.answers.q1.meta.sourceId);
  assert.equal(done.goals.length, 0, 'class-discovery and responsibility answers declare no goal');
  assert.deepEqual(done.tagEvidence, []);
});

test('PR-16 the Q1/Q3 pack is wired through the content loader and the six-question flow keeps Q2 and Q6 blocked', () => {
  const loader = fs.readFileSync(path.join(ROOT, `${dir}/content-loader.js`), 'utf8');
  assert.match(loader, /prestige: \[\['prestige-q1q3', 'q1q3'\], \['prestige-q2', 'q2Content'\], \['reflection-q6', 'q6Content'\]\]/);
  assert.deepEqual(Object.keys(base.blocked).sort(), ['q2', 'q6']);
  for (const q of ['q2', 'q6']) assert.equal(R.resolvePrestigeQuestion({ pack, draft: { answers: {} }, qid: q, ctx: { destinationClassId: 'ace_pilot' }, preview: true }).reason, 'blocked_source');
});

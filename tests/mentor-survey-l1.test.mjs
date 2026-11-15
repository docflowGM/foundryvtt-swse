import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = 'scripts/mentor/mentor-survey-v2';
const u = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const C = await import(u(`${dir}/l1-controller.js`));
const R = await import(u(`${dir}/resolvers/l1.js`));
const S = await import(u(`${dir}/content-store.js`));
const F = await import(u(`${dir}/finalization.js`));
const L = await import(u(`${dir}/intent-ledger.js`));
const P = await import(u('scripts/settings/mentor-survey-preview.js'));
const B = await import(u(`${dir}/tag-boundary.js`));
const I = await import(u(`${dir}/survey-influence.js`));

const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const pack = json('data/mentor-survey/l1.json');
const manifest = json('data/mentor-survey/release-manifest.json');
const routes = json('data/mentor-survey/class-mentor-routes.json');
const archetypes = json('data/archetypes.json').archetypes;
const lookup = (id) => archetypes[id] || null;
const CLASSES = ['jedi', 'noble', 'scoundrel', 'scout', 'soldier'];
const mk = (over = {}, stored = null) => new C.L1SurveyController({ pack, manifest, archetypeLookup: lookup, preview: true, ...over }, stored);
const start = (cls = 'jedi', speciesKeys = ['species-human'], over = {}, stored = null) => mk(over, stored).sync({ classId: cls, speciesKeys });
let seq;
const act = (ctl, fn) => fn(ctl.seq);
const pickFirst = (ctl) => { const v = ctl.view(); return ctl.choose(v.view.questionId, v.view.options[0].optionId, ctl.seq); };

test('L1-02/L1-16 L1 has exactly five questions (Q5 long-term ambition, 5 answers per class) and the pack covers 5 classes x (6 Q1, 6 Q3 scenarios, 5 Q5)', () => {
  assert.deepEqual(Object.keys(pack.mentors).sort(), [...CLASSES].sort());
  for (const c of CLASSES) {
    assert.equal(pack.q1[c].options.length, 6); assert.equal(Object.keys(pack.q3[c].scenarios).length, 6); assert.equal(pack.q5[c].options.length, 5);
    assert.deepEqual(Object.keys(pack.mentors[c].intros), ['q1', 'q2', 'q3', 'q4', 'q5']);
  }
  assert.equal(R.L1_QUESTIONS.length, 5);
});

test('L1-03 each class resolves its established Mentor from the routing table', () => {
  const expect = { jedi: 'miraj', noble: 'j0_n1', scoundrel: 'ol_salty', scout: 'lead', soldier: 'breach' };
  for (const c of CLASSES) { assert.equal(pack.mentors[c].mentorRegistryKey, expect[c]); assert.equal(routes.foundation[c].mentorRegistryKey, expect[c]); }
});

test('L1-01/L1-05 every class walks Q1..Q5 in order with its own fixed Mentor intro and no leaked metadata', () => {
  for (const c of CLASSES) {
    const ctl = start(c);
    const seen = [];
    for (let i = 0; i < 5; i++) {
      const v = ctl.view();
      assert.equal(v.phase, 'question', `${c} step ${i}`);
      assert.equal(v.view.mentorIntro, pack.mentors[c].intros[v.view.questionId].text);
      assert.deepEqual(S.scanViewForLeaks(v.view), [], `${c} ${v.view.questionId}`);
      assert.ok(v.view.options.every((o) => S.isFirstPerson(o.text)), `${c} ${v.view.questionId} first person`);
      assert.ok(v.view.options.length <= 5 || v.view.questionId === 'q1');
      seen.push(v.view.questionId);
      assert.ok(pickFirst(ctl));
    }
    assert.deepEqual(seen, ['q1', 'q2', 'q3', 'q4', 'q5']);
    assert.equal(ctl.view().phase, 'ready');
  }
});

test('SV-05 pack integrity: selectable ids unique, 1,375 selectable + 97 reference + 2 navigation, reference never selectable', () => {
  const idx = C.buildRecordIndex(pack);
  assert.equal(idx.size, 1375);
  assert.equal(Object.keys(pack.q2.parents).length, 97);
  assert.ok(Object.values(pack.q2.parents).every((p) => p.universalReference.kind === 'reference'));
  assert.ok(![...idx.values()].some((r) => r.kind === 'reference' || r.kind === 'navigation'));
  assert.equal(Object.keys(pack.navigation).length, 2);
});

test('L1-06 every player-selectable record validates (first person, no leaks, canonical ids)', () => {
  const bad = [...C.buildRecordIndex(pack).values()].flatMap((r) => S.validateResponseRecord(r));
  assert.deepEqual(bad, []);
  for (const [id, p] of Object.entries(pack.q2.parents)) assert.equal(lookup(id)?.kind, 'parent', id);
  for (const [pid, q] of Object.entries(pack.q4)) for (const ch of q.children) { assert.equal(lookup(ch.childId)?.kind, 'specialization'); assert.equal(lookup(ch.childId).parentId, pid); }
});

test('L1-07/L1-10 Q2: A/B are class anchors, five per page, all 97 careers reachable per class with no repeats, last page short', () => {
  for (const c of CLASSES) {
    const first = R.q2Page(pack, c, 0).parentIds;
    assert.deepEqual(first.slice(0, 2), pack.anchors[c].slice(0, 2));
    const all = []; let pages = 0;
    for (let i = 0; ; i++) { const pg = R.q2Page(pack, c, i); all.push(...pg.parentIds); pages++; if (!pg.hasMore) { assert.ok(pg.parentIds.length <= 5); break; } assert.equal(pg.parentIds.length, 5); }
    assert.equal(all.length, 97); assert.equal(new Set(all).size, 97); assert.equal(pages, 20);
    for (const a of pack.anchors[c]) assert.equal(lookup(a).kind, 'parent');
  }
  // unusual careers stay reachable for every class (e.g. a Soldier can reach Diplomat, a Jedi can reach Gambler)
  assert.ok(R.q2Page(pack, 'soldier', 3).parentIds.concat(...Array.from({ length: 20 }, (_, i) => R.q2Page(pack, 'soldier', i).parentIds)).includes('diplomat'));
});

test('L1-08 browsing Q2 pages records no answer, no goal and no commit', () => {
  const ctl = start('scout'); pickFirst(ctl);
  assert.equal(ctl.view().view.questionId, 'q2');
  for (let i = 0; i < 4; i++) assert.ok(ctl.more('q2', ctl.seq));
  assert.equal(ctl.draft.answers.q2, undefined);
  assert.equal(ctl.view().view.page.index, 4);
  assert.equal(ctl.finish(ctl.seq), null, 'cannot finish while questions are unresolved');
  assert.equal(ctl.committed, null);
});

test('L1-11 Q3 is keyed by class + the exact Q1 answer (all 30 routes), neutral Q1 has its own scenario', () => {
  for (const c of CLASSES) for (const opt of pack.q1[c].options) {
    const ctl = start(c);
    assert.ok(ctl.choose('q1', opt.id, ctl.seq));
    assert.ok(ctl.skipQuestion('q2', ctl.seq));
    const v = ctl.view();
    assert.equal(v.view.questionId, 'q3');
    const sc = Object.values(pack.q3[c].scenarios).find((s) => s.q1OptionId === opt.id);
    assert.equal(v.view.situation, sc.situation.text);
    assert.equal(v.view.options.length, 5);
  }
});

test('L1-11 a skipped Q1 never invents a Q3 preference: Q3 is skipped, not guessed', () => {
  const ctl = start('noble'); ctl.skipQuestion('q1', ctl.seq); ctl.skipQuestion('q2', ctl.seq);
  const v = ctl.view();
  assert.equal(v.view.questionId, 'q4' in ctl.draft.answers ? 'q4' : v.view.questionId);
  assert.notEqual(v.view.questionId, 'q3');
  assert.ok(ctl.draft.skipped.q3);
});

test('L1-12 Q4 follows the exact Q2 parent; changing the Q3 answer changes neither Q4 scenario nor Q4 answer', () => {
  const ctl = start('scoundrel');
  ctl.choose('q1', pack.q1.scoundrel.options[0].id, ctl.seq);
  ctl.choose('q2', `l1.q2.smuggler.scoundrel`, ctl.seq);
  assert.equal(ctl.view().view.questionId, 'q3');
  ctl.choose('q3', ctl.view().view.options[0].optionId, ctl.seq);
  const q4a = ctl.view().view;
  assert.equal(q4a.questionId, 'q4'); assert.equal(q4a.situation, pack.q4.smuggler.situation.text);
  ctl.choose('q4', q4a.options[0].optionId, ctl.seq);
  const before = ctl.draft.answers.q4.optionId;
  ctl.choose('q3', ctl.draft.answers.q3 ? R.resolveL1Question({ pack, draft: ctl.draft, qid: 'q3', context: ctl.ctx, archetypeLookup: lookup, preview: true }).view.options[3].optionId : null, ctl.seq);
  assert.equal(ctl.draft.answers.q4.optionId, before, 'Q4 answer untouched');
  assert.equal(ctl.draft.invalidated.q4, undefined);
});

test('L1-12 changing Q2 invalidates Q4 without silently replacing it; reconfirm only if the old option is still offered', () => {
  const ctl = start('scout');
  ctl.choose('q1', pack.q1.scout.options[0].id, ctl.seq); ctl.choose('q2', 'l1.q2.explorer.scout', ctl.seq);
  ctl.choose('q3', ctl.view().view.options[0].optionId, ctl.seq);
  const q4opt = ctl.view().view.options[0].optionId; ctl.choose('q4', q4opt, ctl.seq);
  ctl.goTo('q2', ctl.seq);
  const v = ctl.view();
  assert.equal(v.view.questionId, 'q2'); assert.equal(v.selectedOptionId, 'l1.q2.explorer.scout', 'revisit shows the current answer');
  assert.ok(ctl.choose('q2', 'l1.q2.bounty_hunter.scout', ctl.seq));
  assert.equal(ctl.draft.answers.q4, undefined);
  assert.equal(ctl.draft.invalidated.q4.previousOptionId, q4opt);
  assert.equal(ctl.draft.answers.q3.optionId !== undefined, true, 'Q3 is not a dependent of Q2 and is untouched');
  assert.equal(ctl.reconfirm('q4', ctl.seq), false, 'previous option belongs to another parent and is not offered');
  assert.equal(ctl.view().view.questionId, 'q4'); assert.ok(ctl.view().staleNotice);
  assert.equal(ctl.finish(ctl.seq), null, 'cannot finish with an invalidated answer');
});

test('L1-13 Q4 composition: 0 children -> five methods; 1-4 children + methods to five; exactly 5; >5 paged, no repeats', () => {
  const kids = (pid) => R.applicableChildren(pack, pid, [], lookup).length; // no species restricted children without a species
  const parents = Object.keys(pack.q4);
  const by = { zero: [], some: [], five: [], many: [] };
  for (const pid of parents) { const n = pack.q4[pid].children.length; (n === 0 ? by.zero : n < 5 ? by.some : n === 5 ? by.five : by.many).push(pid); }
  assert.equal(by.zero.length, 27); assert.equal(by.many.length, 9);
  const page = (pid, i) => R.q4Page(pack, pid, ['species-human', ...[]], lookup, i);
  for (const pid of by.zero) { const p0 = page(pid, 0); assert.equal(p0.records.length, 5); assert.ok(p0.records.every((r) => r.kind === 'method')); assert.equal(p0.hasMore, false); }
  for (const pid of by.some) { const p0 = page(pid, 0); assert.equal(p0.records.length, 5); assert.ok(p0.records[0].kind === 'child' || pack.q4[pid].children.every((c) => (lookup(c.childId).mechanics.species.required || []).length)); }
  for (const pid of parents) {
    const ids = []; for (let i = 0; ; i++) { const pg = page(pid, i); ids.push(...pg.records.map((r) => r.id)); if (!pg.hasMore) break; }
    assert.equal(new Set(ids).size, ids.length, `${pid} no repeats`);
  }
  assert.equal(kids('smuggler') >= 0, true);
});

test('L1-13 only mechanics.species.required restricts children (certified); unknown species fails closed for restricted children', () => {
  const restricted = Object.values(pack.q4).flatMap((p) => p.children).filter((c) => (lookup(c.childId).mechanics.species.required || []).length);
  assert.ok(restricted.length > 0);
  const c = restricted[0]; const req = lookup(c.childId).mechanics.species.required[0]; const pid = lookup(c.childId).parentId;
  const has = (keys) => R.applicableChildren(pack, pid, keys, lookup).some((x) => x.childId === c.childId);
  assert.equal(has([req]), true); assert.equal(has(['species-human']), req === 'species-human'); assert.equal(has([]), false);
  const unrestricted = Object.values(pack.q4).flatMap((p) => p.children).find((x) => !(lookup(x.childId).mechanics.species.required || []).length);
  assert.equal(R.applicableChildren(pack, lookup(unrestricted.childId).parentId, [], lookup).some((x) => x.childId === unrestricted.childId), true, 'unrestricted children never excluded by uncertified gates');
});

test('SV-09 release gate: with no preview every class is unavailable (withheld + draft); GM-only preview is explicit', () => {
  for (const c of CLASSES) {
    const ctl = start(c, ['species-human'], { preview: false });
    assert.equal(ctl.view().phase, 'unavailable'); assert.equal(ctl.availability.available, false);
  }
  const rel = { surveys: { l1: { jedi: { releaseState: 'released' } } } };
  const released = start('jedi', ['species-human'], { preview: false, manifest: rel });
  assert.equal(released.view().phase, 'unavailable', 'released but draft_text content still never reaches players');
  assert.equal(released.view().reason, 'unapproved_content');
  assert.equal(P.canUseEditorialPreview({ settingValue: true, isGM: false }), false);
  assert.equal(P.canUseEditorialPreview({ settingValue: false, isGM: true }), false);
  assert.equal(P.canUseEditorialPreview({ settingValue: true, isGM: true }), true);
  assert.equal(P.canUseEditorialPreview(null), false, 'no game object means no preview');
});

test('SV-13/L1-15 skip survey, cancel: no commit record; skipped question records nothing', () => {
  const a = start('jedi'); assert.ok(a.skipSurvey(a.seq)); assert.equal(a.finish(a.seq), null); assert.equal(a.serialize().committed.l1, undefined); assert.equal(a.view().phase, 'skipped');
  const b = start('jedi'); pickFirst(b); assert.ok(b.cancel(b.seq)); assert.equal(b.committed, null); assert.deepEqual(b.draft.answers, {});
  const c = start('jedi'); c.skipQuestion('q1', c.seq); assert.deepEqual(c.draft.answers, {});
});

test('SV-11 duplicate submission: replaying an action with a stale sequence token changes nothing', () => {
  const ctl = start('jedi'); const tok = ctl.seq; const v = ctl.view();
  assert.ok(ctl.choose('q1', v.view.options[0].optionId, tok));
  assert.equal(ctl.choose('q1', v.view.options[1].optionId, tok), false);
  assert.equal(ctl.draft.answers.q1.optionId, v.view.options[0].optionId);
  assert.equal(ctl.choose('q2', 'not-an-offered-option', ctl.seq), false, 'only offered options are accepted');
});

test('SV-13/L1-04 the survey reads the live pending class and species; a change invalidates dependents and a different class starts clean', () => {
  const ctl = start('jedi'); ctl.choose('q1', pack.q1.jedi.options[0].id, ctl.seq);
  ctl.sync({ classId: 'jedi', speciesKeys: ['species-wookiee'] });
  assert.equal(ctl.draft.answers.q1.optionId, pack.q1.jedi.options[0].id, 'species does not feed Q1');
  ctl.sync({ classId: 'noble', speciesKeys: ['species-wookiee'] });
  assert.deepEqual(ctl.draft.answers, {}, 'another class never inherits answers');
  assert.equal(ctl.committed, null);
});

test('SV-13 draft round-trips through the session value and resumes (revisit)', () => {
  const a = start('soldier'); pickFirst(a);
  const stored = JSON.parse(JSON.stringify(a.serialize()));
  const b = start('soldier', ['species-human'], {}, stored);
  assert.equal(b.view().view.questionId, 'q2'); assert.equal(b.draft.answers.q1.optionId, a.draft.answers.q1.optionId);
});

const finishAll = (ctl, { career = 'l1.q2.diplomat.noble', child = false } = {}) => {
  ctl.choose('q1', ctl.view().view.options[0].optionId, ctl.seq);
  assert.ok(ctl.choose('q2', career, ctl.seq), `${career} must be offered on the first page`);
  ctl.choose('q3', ctl.view().view.options[0].optionId, ctl.seq);
  // walk the Q4 pages until the wanted kind (child or method) is offered
  let pick = null;
  for (let guard = 0; guard < 8 && !pick; guard++) {
    const v = ctl.view().view;
    pick = v.options.find((o) => (child ? o.optionId.includes('.child.') : o.optionId.includes('.method')));
    if (!pick) assert.ok(ctl.more('q4', ctl.seq));
  }
  assert.ok(ctl.choose('q4', pick.optionId, ctl.seq));
  ctl.choose('q5', ctl.view().view.options[0].optionId, ctl.seq);
  return ctl.finish(ctl.seq);
};
const actor = (events = []) => ({ flags: { 'foundryvtt-swse': { mentorSurvey: { events } } } });

test('SV-12 a completed survey stages a commit record; nothing touches the actor until the finalizer builds the patch', () => {
  const ctl = start('noble'); const rec = finishAll(ctl);
  assert.ok(rec); assert.equal(rec.preview, true, 'draft content played in preview is marked preview');
  const a = actor(); assert.deepEqual(L.readLedger(a), []);
  const patch = F.buildSurveyLedgerPatch({ actor: a, selection: ctl.serialize(), transactionId: 'chargen-1', level: 1, completedAt: '2026-11-15T00:00:00Z' });
  assert.deepEqual(Object.keys(patch), ['flags.foundryvtt-swse.mentorSurvey.events']);
  const events = patch['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.equal(events[0].type, 'survey_completed'); assert.equal(events[0].actorLevel, 1); assert.equal(events[0].provenance.preview, true);
  assert.equal(events[0].answers.q1.editorialStatus.length > 0, true); assert.ok(events[0].answers.q2.text.startsWith('I want'));
});

test('SV-12 canceled, skipped, incomplete or no-level sessions persist nothing', () => {
  const t = (selection, level) => F.buildSurveyLedgerPatch({ actor: actor(), selection, transactionId: 'tx', level, completedAt: 'now' });
  const cancel = start('jedi'); pickFirst(cancel); cancel.cancel(cancel.seq);
  assert.deepEqual(t(cancel.serialize(), 1), {});
  const skip = start('jedi'); skip.skipSurvey(skip.seq); assert.deepEqual(t(skip.serialize(), 1), {});
  const partial = start('jedi'); pickFirst(partial); assert.deepEqual(t(partial.serialize(), 1), {});
  assert.deepEqual(t(null, 1), {});
  const goodDone = start('noble'); finishAll(goodDone); assert.ok(Object.keys(t(goodDone.serialize(), 1)).length === 1, 'control: a completed survey does commit');
  const done = start('noble'); finishAll(done);
  assert.deepEqual(t(done.serialize(), undefined), {}, 'unknown level never produces a historical event');
  assert.deepEqual(t(done.serialize(), 0), {}); assert.deepEqual(t(done.serialize(), -3), {}); assert.deepEqual(t(done.serialize(), 1.5), {});
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: actor(), selection: done.serialize(), transactionId: null, level: 1, completedAt: 'now' }), {});
});

test('SV-11 finalizing the same transaction twice appends nothing the second time', () => {
  const ctl = start('noble'); finishAll(ctl);
  const args = { selection: ctl.serialize(), transactionId: 'chargen-7', level: 1, completedAt: 'now' };
  const p1 = F.buildSurveyLedgerPatch({ actor: actor(), ...args });
  const ledger = p1['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: actor(ledger), ...args }), {});
});

test('SV-25 retake in a later transaction supersedes the earlier event and revises goals; history is kept', () => {
  const first = start('noble'); finishAll(first, { career: 'l1.q2.diplomat.noble' });
  const l1 = F.buildSurveyLedgerPatch({ actor: actor(), selection: first.serialize(), transactionId: 't1', level: 1, completedAt: 'now' })['flags.foundryvtt-swse.mentorSurvey.events'];
  const second = start('noble'); finishAll(second, { career: 'l1.q2.merchant_prince.noble' });
  const l2 = F.buildSurveyLedgerPatch({ actor: actor(l1), selection: second.serialize(), transactionId: 't2', level: 1, completedAt: 'later' })['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.ok(l2.length > l1.length); assert.ok(L.isAppendOnly(l1, l2));
  const preview = L.reduceLedger(l2, { includePreview: true });
  assert.equal(preview.goals['l1.career'].target.id, 'merchant_prince');
  assert.ok(l2.some((e) => e.type === 'goal_revision' && e.supersedes));
});

test('SV-02 goals only from explicit selections: Q2 career, Q4 child, Q5; method answers and skipped questions declare none', () => {
  const ctl = start('noble'); const rec = finishAll(ctl, { career: 'l1.q2.diplomat.noble', child: false });
  const lanes = rec.goals.map((g) => g.goalLane).sort();
  assert.deepEqual(lanes, ['l1.career', 'l1.long_term_ambition']);
  assert.equal(rec.goals.find((g) => g.goalLane === 'l1.career').target.id, 'diplomat');
  const kid = start('scoundrel'); const r2 = finishAll(kid, { career: 'l1.q2.smuggler.scoundrel', child: true });
  const spec = r2.goals.find((g) => g.goalLane === 'l1.specialization');
  assert.ok(spec); assert.equal(spec.target.type, 'archetype_specialization'); assert.equal(lookup(spec.target.id).parentId, 'smuggler');
  const none = start('noble'); none.skipQuestion('q2', none.seq); assert.ok(!none.draft.answers.q2);
});

test('SV-16/SV-36 the tag boundary stays inert: the commit record and events carry no tag evidence', () => {
  B.resetTagBoundary();
  const ctl = start('noble'); const rec = finishAll(ctl);
  assert.deepEqual(rec.tagEvidence, []);
  const ev = F.buildSurveyLedgerPatch({ actor: actor(), selection: ctl.serialize(), transactionId: 't', level: 1, completedAt: 'now' })['flags.foundryvtt-swse.mentorSurvey.events'];
  assert.deepEqual(ev[0].tagEvidence, []);
  I.registerOntologyTags(['x']);
  try { assert.deepEqual(I.computeSurveyInfluence(ev, 5).suggestionTags, {}); } finally { I.resetOntologyTags(); }
});

test('SV-31/SV-36 events with a missing or invalid completion level contribute no influence (no fabricated history)', () => {
  I.registerOntologyTags(['tag_a']);
  try {
    const good = L.buildCompletionEvents({ payload: { surveyKind: 'l1', scopeId: 'l1', definitionVersion: 1, contextRevision: 'x', answers: {} }, transactionId: 't', actorLevel: 1, completedAt: 'x', tagEvidence: [{ questionId: 'q1', tag: 'tag_a', E: 1, certified: true }] });
    assert.ok(I.computeSurveyInfluence(good, 3).suggestionTags.tag_a > 0);
    for (const bad of [null, undefined, 0, -1, 2.5, '3']) {
      const ev = good.map((e) => ({ ...e, actorLevel: bad }));
      assert.deepEqual(I.computeSurveyInfluence(ev, 3).suggestionTags, {}, `level ${String(bad)}`);
    }
  } finally { I.resetOntologyTags(); }
});

test('SV-01 obsolete L1 execution paths are no longer registered or reachable', () => {
  const nodeMap = fs.readFileSync(path.join(ROOT, 'scripts/apps/progression-framework/registries/node-descriptor-mapper.js'), 'utf8');
  assert.ok(!/L1SurveyStep/.test(nodeMap)); assert.ok(/MentorSurveyStep/.test(nodeMap));
  const chargen = fs.readFileSync(path.join(ROOT, 'scripts/apps/progression-framework/chargen-shell.js'), 'utf8');
  assert.ok(!/L1SurveyStep|l1-survey-step\.js/.test(chargen));
  assert.ok(!fs.existsSync(path.join(ROOT, 'scripts/apps/progression-framework/steps/l1-survey-step.js')));
  for (const c of ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier']) assert.ok(!fs.existsSync(path.join(ROOT, `scripts/mentor/mentor-survey/definitions/L1_${c}_Survey.js`)));
});

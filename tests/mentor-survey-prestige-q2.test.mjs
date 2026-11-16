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
const pack = { ...base, q1q3: json('data/mentor-survey/prestige-q1q3.json'), q2Content: json('data/mentor-survey/prestige-q2.json') };
const manifest = json('data/mentor-survey/release-manifest.json');
const canon = pack.q2Content.keys;
const IDS = Object.keys(base.classes);
const prov = (keys, kind = 'items') => ({ items: kind === 'items' ? Object.fromEntries(keys.map((k) => [k, ['Owned Talent']])) : {}, skills: kind === 'skills' ? Object.fromEntries(keys.map((k) => [k, true])) : {}, attributes: {} });
const start = (cls, observedBias = {}, provenance = prov(Object.keys(observedBias)), over = {}) => new P.PrestigeSurveyController({ pack, manifest, preview: true, archetypeLookup: () => null, ...over })
  .sync({ selectedClassId: cls, classLevels: { jedi: 6 }, observedBias, observedProvenance: provenance, canonicalBiasKeys: canon });

test('PR-17 prestige Q2 pack: 32 classes, each with the Mentor introduction and question from the Character Synthesis design, a class connective, E and F; 125 shared stems', () => {
  const q = pack.q2Content;
  assert.deepEqual(Object.keys(q.classes).sort(), [...IDS].sort()); assert.equal(Object.keys(q.stems).length, 125); assert.equal(q.keys.length, 125);
  for (const id of IDS) {
    const c = q.classes[id];
    assert.ok(c.intro.text.length > 40 && c.question.text.length > 20 && c.intro.sourceRef.line > 0 && c.question.sourceRef.line > 0, id);
    assert.match(c.connective.text, /^I want to carry that into the .+ as the .+ I am becoming\.$/, `${id} speaks of the class as one the player is becoming`);
    assert.ok([c.intro, c.question, c.connective, c.alternative, c.undecided].every((r) => r.editorialStatus === 'draft_text'));
  }
  assert.equal(new Set(IDS.map((id) => q.classes[id].connective.text)).size, 32, 'each class has its own connective');
  assert.match(q.classes.ace_pilot.intro.text, /^All right, you've made it far enough to be in the running\./, "Mayu's authored introduction, verbatim");
});

test('PR-17 every composable A-D string (125 stems x 32 classes) is first person, leak free and claims no owned thing, mission, rank or organization', () => {
  const bad = [];
  for (const id of IDS) for (const k of canon) {
    const text = R.composeQ2Text(pack, id, k);
    const probs = S.validateResponseRecord({ id: `pr.${id}.q2.${k.toLowerCase()}`, kind: 'integration', text, editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: pack.q2Content.stems[k].sourceRef });
    if (probs.length) bad.push([id, k, probs]);
  }
  assert.deepEqual(bad, []);
  for (const id of IDS) for (const r of [pack.q2Content.classes[id].alternative, pack.q2Content.classes[id].undecided]) assert.deepEqual(S.validateResponseRecord(r), [], r.id);
  assert.ok(!/\b(mission|squadron|rank|guild|fleet|owned|I have (the|taken)|talent|feat)\b/i.test(pack.q2Content.classes.ace_pilot.connective.text));
});

test('PR-17 Q2 offers A-D only for evidence-backed strengths (score order, ties by key), then E and F; sparse or attribute-only evidence leaves E and F', () => {
  const [a, b, c, d, e] = canon;
  const ctl = start('ace_pilot', { [a]: 5, [b]: 4, [c]: 3, [d]: 2, [e]: 1 });
  ctl.skipQuestion('q1', ctl.seq);
  const v = ctl.view(); assert.equal(v.view.questionId, 'q2'); assert.equal(v.questionNumber, 2);
  assert.deepEqual(v.view.options.map((o) => o.optionId), [...[a, b, c, d].map((k) => `pr.ace_pilot.q2.${k.toLowerCase()}`), 'pr.ace_pilot.q2.alt', 'pr.ace_pilot.q2.undecided']);
  assert.equal(v.view.options[0].text, R.composeQ2Text(pack, 'ace_pilot', a)); assert.equal(v.view.prompt, pack.q2Content.classes.ace_pilot.question.text);
  assert.equal(v.view.mentorIntro, pack.q2Content.classes.ace_pilot.intro.text); assert.deepEqual(S.scanViewForLeaks(v.view), []);
  const attr = start('ace_pilot', { [a]: 9 }, { items: {}, skills: {}, attributes: { [a]: true } }); attr.skipQuestion('q1', attr.seq);
  assert.deepEqual(attr.view().view.options.map((o) => o.optionId), ['pr.ace_pilot.q2.alt', 'pr.ace_pilot.q2.undecided']);
  const none = start('ace_pilot', {}); none.skipQuestion('q1', none.seq); assert.equal(none.view().view.options.length, 2);
});

test('PR-17 selecting a Q2 answer records the typed connection and its evidence only: no weight, no goal, no grant; E explores', () => {
  const k = canon[0];
  const ctl = start('gladiator', { [k]: 5 }); ctl.skipQuestion('q1', ctl.seq);
  assert.ok(ctl.choose('q2', ctl.view().view.options[0].optionId, ctl.seq));
  assert.deepEqual(ctl.draft.answers.q2.meta, { kind: 'integration', biasKey: k, evidence: { items: ['Owned Talent'], skills: false } });
  assert.equal(R.prestigeTyped(pack, ctl.draft, ctl.ctx).q2BiasKey, k);
  assert.deepEqual(ctl.adapter.goals(pack, ctl.draft, ctl.ctx), []);
  const e = start('gladiator', { [k]: 5 }); e.skipQuestion('q1', e.seq); assert.ok(e.choose('q2', 'pr.gladiator.q2.alt', e.seq));
  assert.deepEqual(e.draft.answers.q2.meta, { kind: 'alternative' }); assert.equal(R.prestigeTyped(pack, e.draft, e.ctx).q2BiasKey, null);
});

test('PR-17 release gate: draft Q2 text never reaches players; a pack without the Q2 companion keeps Q2 source-blocked and skipped', () => {
  const rt = { observedBias: { [canon[0]]: 3 }, observedProvenance: prov([canon[0]]) };
  assert.equal(R.resolvePrestigeQuestion({ pack, draft: { answers: {} }, qid: 'q2', ctx: { destinationClassId: 'medic' }, preview: false, runtime: rt }).reason, 'unapproved_content');
  assert.equal(R.resolvePrestigeQuestion({ pack: base, draft: { answers: {} }, qid: 'q2', ctx: { destinationClassId: 'medic' }, preview: true, runtime: rt }).reason, 'blocked_source');
  assert.equal(R.resolvePrestigeQuestion({ pack, draft: { answers: {} }, qid: 'q2', ctx: { destinationClassId: 'medic' }, preview: true, runtime: { observedBias: { [canon[0]]: 3 }, observedProvenance: null } }).records.length, 2, 'unknown provenance fails closed to E and F');
});

test('PR-17 a change in observed strengths invalidates the Q2 answer without replacing it', () => {
  const ctl = start('officer', { [canon[0]]: 5 }); ctl.skipQuestion('q1', ctl.seq); ctl.choose('q2', ctl.view().view.options[0].optionId, ctl.seq);
  ctl.sync({ selectedClassId: 'officer', classLevels: { jedi: 6 }, observedBias: { [canon[1]]: 7 }, observedProvenance: prov([canon[1]]), canonicalBiasKeys: canon });
  assert.equal(ctl.draft.answers.q2, undefined); assert.ok(ctl.draft.invalidated.q2);
});

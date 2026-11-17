import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = 'scripts/mentor/mentor-survey-v2';
const u = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const M = await import(u(`${dir}/multiclass-controller.js`));
const Q2 = await import(u(`${dir}/resolvers/multiclass-q2.js`));
const E = await import(u(`${dir}/actor-evidence.js`));
const S = await import(u(`${dir}/content-store.js`));
const F = await import(u(`${dir}/finalization.js`));

const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const q2c = json('data/mentor-survey/multiclass-q2.json');
const canon = Object.keys(json('data/bias-keys-canonical.json').mechanicalBias);
const manifest = json('data/mentor-survey/release-manifest.json');
const shipped = { ...json('data/mentor-survey/multiclass.json'), q2Content: q2c };
const withFocus = shipped; // the shipped pack now carries the 100 drafted q1_focus phrases, the neutral focus and answers E and F
const actorFixture = { items: [{ type: 'class', name: 'Soldier', id: 's', system: { level: 3 } }], system: { skills: {} } };
const ITEM = (k) => ({ itemId: 'i-' + k, type: 'feat', name: 'Owned Talent', canonicalId: 'c-' + k, certified: true, ruleType: 'skillModifier' });
const SKILL = () => ({ skillKey: 'stealth', canonicalId: 'skill:stealth', trained: true, skillFocus: false });
const prov = (keys, kind = 'items') => ({ items: kind === 'items' ? Object.fromEntries(keys.map((k) => [k, [ITEM(k)]])) : {}, skills: kind === 'skills' ? Object.fromEntries(keys.map((k) => [k, [SKILL()]])) : {}, attributes: {}, snapshot: 'snap-1' });
const start = (pack, observedBias, over = {}, provenance = null) => new M.MulticlassSurveyController({ pack, manifest, preview: true, archetypeLookup: () => null, ...over })
  .sync({ selectedClassId: 'noble', classLevels: { soldier: 3 }, seed: 's', evidence: E.projectActorEvidence(actorFixture), events: [], observedBias, observedProvenance: provenance ?? prov(Object.keys(observedBias)), canonicalBiasKeys: canon });

test('MC-12 Q2 import: 625 templates, exactly the canonical 125 keys for each of the five destinations, every one slot-bearing', () => {
  assert.deepEqual(q2c._meta.counts, { templates: 625, destinations: 5, keys: 125, templatesWithQ1FocusSlot: 625 });
  assert.deepEqual([...q2c.keys].sort(), [...canon].sort());
  for (const d of ['jedi', 'noble', 'scoundrel', 'scout', 'soldier']) assert.deepEqual(Object.keys(q2c.destinations[d]).sort(), [...canon].sort(), d);
  assert.equal(new Set(Object.values(q2c.destinations).flatMap((r) => Object.values(r)).map((r) => r.id)).size, 625);
  const filled = Object.values(q2c.destinations).flatMap((r) => Object.values(r)).map((r) => ({ ...r, text: r.text.replace(/\{\{q1_focus\}\}/g, 'better coordination of my allies') }));
  assert.deepEqual(filled.flatMap((r) => S.validateResponseRecord(r)), [], 'once filled, every template is first person and leak free');
});

test('MC-12 accessor audit is recorded: public, pure, observed-only; four emitted keys are not canonical and are ignored', () => {
  const a = q2c._meta.accessorAudit;
  assert.equal(a.accessor, 'IdentityEngine.computeObservedBehaviorBias(actor).mechanicalBias'); assert.equal(a.observedOnly, true);
  assert.deepEqual(a.notCanonical.sort(), ['forceConnection', 'mobility', 'perception', 'techControl']);
  assert.deepEqual(Q2.topObservedKeys({ mobility: 9, perception: 9, techControl: 9, forceConnection: 9 }, canon), []);
});

test('MC-12/SV-15 the q1_focus catalog covers exactly the 100 substantive Q1 answers as drafts; the neutral focus and E/F are owner-approved', () => {
  const direct = Object.values(shipped.q1).flatMap((o) => Object.values(o)).flat().filter((r) => r.kind === 'direction').map((r) => r.id);
  assert.equal(direct.length, 100); assert.deepEqual(Object.keys(q2c.q1Focus).sort(), [...direct].sort());
  assert.ok(Object.values(q2c.q1Focus).every((f) => f.editorialStatus === 'draft_text' && f.text.length > 8 && !/[.!?]$/.test(f.text)));
  assert.equal(q2c.q1FocusNeutral.text, 'what this new training could offer'); assert.equal(q2c.q1FocusNeutral.editorialStatus, 'owner_approved_text');
  assert.equal(q2c.alternatives.alternative.text, 'I want to explore a different way my previous training could connect with this new path.');
  assert.equal(q2c.alternatives.undecided.text, "I'm not sure yet which part of my experience I want to build on.");
  assert.ok(Object.values(q2c.alternatives).every((r) => r.editorialStatus === 'owner_approved_text' && S.isFirstPerson(r.text)));
  const bad = Object.entries(q2c.q1Focus).flatMap(([id, f]) => S.validateResponseRecord({ ...Object.values(q2c.destinations.noble)[0], id: f.id, text: `I want to grow while pursuing ${f.text}.`, editorialStatus: 'draft_text' }));
  assert.deepEqual(bad, [], 'each phrase reads grammatically after "while pursuing" and leaks nothing');
  const ctl = start(shipped, { accuracy: 3 }); ctl.choose('q1', 'mc.noble.q1.soldier.01', ctl.seq);
  assert.equal(Q2.resolveQ2({ pack: shipped, draft: ctl.draft, ctx: ctl.ctx, runtime: ctl.runtime, preview: false }).reason, 'unapproved_content', 'draft phrases never reach players');
});

test('MC-12 top four distinct OBSERVED canonical strengths: score descending, ties by key, non-canonical and zero scores ignored, no padding', () => {
  const obs = { zeta: 9, [canon[0]]: 5, [canon[1]]: 5, [canon[2]]: 3, [canon[3]]: 1, [canon[4]]: 0.5, mobility: 99 };
  assert.deepEqual(Q2.topObservedKeys(obs, canon), [canon[0], canon[1], canon[2], canon[3]].sort((a, b) => ((obs[b] - obs[a]) || a.localeCompare(b))));
  assert.deepEqual(Q2.topObservedKeys({ [canon[0]]: 2 }, canon), [canon[0]], 'one strength gives one answer');
  assert.deepEqual(Q2.topObservedKeys({}, canon), []); assert.deepEqual(Q2.topObservedKeys({ [canon[0]]: -1, [canon[1]]: 0 }, canon), []);
});

test('MC-12 Q2 offers A-D for evidence-backed strengths plus E and F; slot filled, first person, no keys or scores shown', () => {
  const [k1, k2, k3, k4, k5] = canon;
  const ctl = start(withFocus, { [k1]: 5, [k2]: 4, [k3]: 3, [k4]: 2, [k5]: 1 });
  ctl.choose('q1', 'mc.noble.q1.soldier.01', ctl.seq);
  const v = ctl.view();
  assert.equal(v.view.questionId, 'q2'); assert.equal(v.questionNumber, 2); assert.equal(v.view.options.length, 6);
  assert.deepEqual(v.view.options.map((o) => o.optionId), [...[k1, k2, k3, k4].map((k) => `mc.q2.noble.${k.toLowerCase()}`), 'mc.q2.alt', 'mc.q2.undecided']);
  const focus = q2c.q1Focus['mc.noble.q1.soldier.01'].text;
  assert.ok(v.view.options.slice(0, 4).every((o) => o.text.includes(focus) && !/\{\{|\}\}/.test(o.text) && S.isFirstPerson(o.text)));
  assert.deepEqual(S.scanViewForLeaks(v.view), []);
  assert.equal(v.view.mentorIntro, withFocus.mentors.noble.intros.q2.text, "the destination Mentor's fixed Q2 introduction");
});

test('MC-12 sparse evidence: fewer strengths give fewer A-D answers; zero evidence-backed strengths still offers E and F; nothing is padded', () => {
  const two = start(withFocus, { [canon[0]]: 2, [canon[1]]: 1 }); two.choose('q1', 'mc.noble.q1.soldier.01', two.seq);
  assert.equal(two.view().view.options.length, 4);
  const none = start(withFocus, {}); none.choose('q1', 'mc.noble.q1.soldier.01', none.seq);
  const v = none.view(); assert.equal(v.view.questionId, 'q2');
  assert.deepEqual(v.view.options.map((o) => o.optionId), ['mc.q2.alt', 'mc.q2.undecided']);
});

test('MC-12 provenance gate: a score from ability scores alone is a tendency, not past training, so no autobiographical answer is offered for it', () => {
  const k = canon[0];
  const attrOnly = start(withFocus, { [k]: 9 }, {}, { items: {}, skills: {}, attributes: { [k]: true }, snapshot: 'x' }); attrOnly.choose('q1', 'mc.noble.q1.soldier.01', attrOnly.seq);
  assert.deepEqual(attrOnly.view().view.options.map((o) => o.optionId), ['mc.q2.alt', 'mc.q2.undecided']);
  const noProv = start(withFocus, { [k]: 9 }, {}, null); noProv.runtime.observedProvenance = null; noProv.choose('q1', 'mc.noble.q1.soldier.01', noProv.seq);
  assert.deepEqual(Q2.resolveQ2({ pack: withFocus, draft: noProv.draft, ctx: noProv.ctx, runtime: { ...noProv.runtime, observedProvenance: null }, preview: true }).records.map((r) => r.id), ['mc.q2.alt', 'mc.q2.undecided'], 'unknown provenance fails closed');
  const skill = start(withFocus, { [k]: 9 }, {}, prov([k], 'skills')); skill.choose('q1', 'mc.noble.q1.soldier.01', skill.seq);
  assert.equal(skill.view().view.options.length, 3);
  const four = Q2.keyProvenance({ items: { [k]: [ITEM('a'), ITEM('b'), ITEM('c'), ITEM('d')] }, skills: {}, snapshot: 's' }, k);
  assert.equal(four.items.length, 3); assert.equal(four.snapshot, 's'); assert.deepEqual(Object.keys(four.items[0]).sort(), ['canonicalId', 'certified', 'itemId', 'name', 'ruleType', 'type']);
});

test('MC-12 an undecided Q1 uses the approved neutral focus and infers no specialization; E and F are always present', () => {
  const ctl = start(withFocus, { [canon[0]]: 3 }); ctl.choose('q1', 'mc.noble.q1.soldier.06', ctl.seq);
  const v = ctl.view(); assert.equal(v.view.questionId, 'q2');
  assert.match(v.view.options[0].text, /while pursuing what this new training could offer\.$/);
  assert.deepEqual(v.view.options.slice(-2).map((o) => o.optionId), ['mc.q2.alt', 'mc.q2.undecided']);
});

test('MC-12 choosing a Q2 answer records only the typed connection and its evidence (no weight, no goal); E records exploration only; Q4 is unchanged', () => {
  const sceneWith = (pickIndex) => { const c = start(withFocus, { [canon[0]]: 5, [canon[1]]: 4 }); c.choose('q1', 'mc.noble.q1.soldier.02', c.seq); c.choose('q2', c.view().view.options[pickIndex].optionId, c.seq); c.choose('q3', 'mc.q3.dip', c.seq); return [c.view().view.situation, c]; };
  const [s0, c0] = sceneWith(0); const [s1] = sceneWith(1); const [sE, cE] = sceneWith(2);
  assert.equal(s0, s1, 'Q4 depends on the exact Q1 answer only'); assert.equal(s0, sE);
  assert.equal(c0.draft.answers.q2.meta.biasKey, canon[0]); assert.equal(c0.draft.answers.q2.meta.evidence.items[0].canonicalId, 'c-' + canon[0]); assert.equal(c0.draft.answers.q2.meta.evidence.snapshot, 'snap-1');
  assert.deepEqual(c0.adapter.goals(withFocus, c0.draft, c0.ctx), []);
  assert.equal(M.MULTICLASS_ADAPTER.typed(withFocus, c0.draft, c0.ctx).q2BiasKey, canon[0]);
  assert.deepEqual(cE.draft.answers.q2.meta, { kind: 'alternative' }); assert.equal(M.MULTICLASS_ADAPTER.typed(withFocus, cE.draft, cE.ctx).q2BiasKey, null);
  assert.deepEqual(cE.adapter.goals(withFocus, cE.draft, cE.ctx), [], 'E explores; it declares no goal');
});

test('SV-13 a change in the observed strengths invalidates the Q2 answer without replacing it; the player must re-answer', () => {
  const ctl = start(withFocus, { [canon[0]]: 5, [canon[1]]: 4 }); ctl.choose('q1', 'mc.noble.q1.soldier.01', ctl.seq); ctl.choose('q2', ctl.view().view.options[0].optionId, ctl.seq);
  ctl.sync({ selectedClassId: 'noble', classLevels: { soldier: 3 }, seed: 's', evidence: E.projectActorEvidence(actorFixture), events: [], observedBias: { [canon[2]]: 9 }, observedProvenance: prov([canon[2]]), canonicalBiasKeys: canon });
  assert.equal(ctl.draft.answers.q2, undefined); assert.ok(ctl.draft.invalidated.q2);
  assert.equal(ctl.draft.answers.q1.optionId, 'mc.noble.q1.soldier.01');
});

test('SV-14/SV-15 Q2 never reads survey answers, pending selections or recommendations: its only inputs are the observed accessor and the Q1 answer', () => {
  const src = fs.readFileSync(path.join(ROOT, dir, 'resolvers/multiclass-q2.js'), 'utf8');
  assert.ok(!/surveyResponses|pendingData|progressionSession|SuggestionEngine|computeTotalBias/.test(src));
  assert.deepEqual(F.buildSurveyLedgerPatch({ actor: { flags: {} }, selection: null, transactionId: 't', level: 4, completedAt: 'now' }), {});
});

test('MC-12 the real accessor degrades safely: without initialized primitive registries it returns an empty bias, so Q2 is simply not offered', async () => {
  const { registerFoundryPathLoader } = await import(u('tests/helpers/foundry-shim/register.mjs'));
  const { installFoundryShimGlobals } = await import(u('tests/helpers/foundry-shim/globals.mjs'));
  registerFoundryPathLoader(); installFoundryShimGlobals({ game: { items: [] } });
  const { IdentityEngine } = await import(u('scripts/engine/prestige/identity-engine.js'));
  const out = IdentityEngine.computeObservedBehaviorBias(actorFixture);
  assert.deepEqual(Object.keys(out).sort(), ['attributeBias', 'mechanicalBias', 'roleBias']);
  assert.deepEqual(Q2.topObservedKeys(out.mechanicalBias, canon), []);
});

test('MC-12 the provenance accessor is a read-only sibling of the observed accessor: same engine, no new scorer, empty without registries', async () => {
  const { IdentityEngine } = await import(u('scripts/engine/prestige/identity-engine.js'));
  assert.equal(typeof IdentityEngine.computeObservedBehaviorBiasProvenance, 'function');
  const e = IdentityEngine.computeObservedBehaviorBiasProvenance(actorFixture); assert.deepEqual([e.items, e.skills, e.attributes], [{}, {}, {}]);
  const src = fs.readFileSync(path.join(ROOT, 'scripts/engine/prestige/identity-engine.js'), 'utf8');
  const body = src.slice(src.indexOf('static computeObservedBehaviorBiasProvenance'), src.indexOf('static #getAbilityScore'));
  assert.ok(!/\* 0\.|weight|Math\.(pow|exp)/.test(body), 'no new arithmetic');
});

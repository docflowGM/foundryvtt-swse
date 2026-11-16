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
const MI = await import(u(`${dir}/method-inference.js`));
const Rf = await import(u(`${dir}/reflection.js`));
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const q6c = json('data/mentor-survey/reflection-q6.json');
const canon = q6c.assessment.keys;
const mcPack = { ...json('data/mentor-survey/multiclass.json'), q6Content: q6c };
const prPack = { ...json('data/mentor-survey/prestige.json'), q1q3: json('data/mentor-survey/prestige-q1q3.json'), q6Content: q6c };
const manifest = json('data/mentor-survey/release-manifest.json');
const [K1, K2, K3] = ['accuracy', 'evasion', 'tacticalAwareness'];

const it = (type, name, extra = {}) => ({ type, name, id: `${type}-${name}`, system: {}, flags: { swse: { canonicalTalent: { canonicalId: `c.${name}` } } }, ...extra });
const actor = (items, skills = {}) => ({ items: [it('class', 'Soldier', { system: { level: 3 } }), ...items], system: { skills } });
const entry = (item, key) => ({ itemId: item.id, type: item.type, name: item.name, canonicalId: `c.${item.name}`, certified: true, ruleType: 'attackBonus', specificity: 'target' });
const skillEntry = (k) => ({ skillKey: k, canonicalId: `skill:${k}`, trained: true, skillFocus: false });
const A = it('talent', 'Alpha'); const B = it('feat', 'Beta'); const C = it('talent', 'Gamma'); const SF = it('feat', 'Skill Focus (Stealth)');
const base = (a, prov, bias) => ({ evidence: E.projectActorEvidence(a), events: [], observedBias: bias, observedProvenance: { items: {}, skills: {}, attributes: {}, snapshot: 's1', ...prov } });
const claimsOf = (a, prov, bias, events = []) => MI.methodClaims({ projection: E.projectActorEvidence(a), observedBias: bias, provenance: { items: {}, skills: {}, ...prov }, canonicalKeys: canon, events });

test('SV-19 a method claim needs two independent verified sources; one source, or one source repeated, makes none', () => {
  const a = actor([A, B, C]);
  assert.equal(claimsOf(a, { items: { [K1]: [entry(A, K1)] } }, { [K1]: 5 }).length, 0, 'one item');
  assert.equal(claimsOf(a, { items: { [K1]: [entry(A, K1), { ...entry(A, K1), ruleType: 'damageBonus' }] } }, { [K1]: 5 }).length, 0, 'two primitives on ONE item are one source');
  const two = claimsOf(a, { items: { [K1]: [entry(A, K1), entry(B, K1)] } }, { [K1]: 5 });
  assert.equal(two.length, 1); assert.equal(two[0].claimKind, 'method_preference'); assert.equal(two[0].groundedBy.length, 2); assert.equal(two[0].slots.method_phrase, 'accuracy');
});

test('SV-19 a trained skill and the Skill Focus feat that names it are ONE source; an item plus a different skill are two; class features and unverified items do not count', () => {
  const a = actor([A, SF], { stealth: { trained: true }, persuasion: { trained: true } });
  assert.equal(claimsOf(a, { items: { [K2]: [entry(SF, K2)] }, skills: { [K2]: [skillEntry('stealth')] } }, { [K2]: 4 }).length, 0, 'Skill Focus (Stealth) + trained Stealth = one source');
  assert.equal(claimsOf(a, { items: { [K2]: [entry(A, K2)] }, skills: { [K2]: [skillEntry('stealth')] } }, { [K2]: 4 }).length, 1, 'a talent plus a trained skill = two');
  assert.equal(claimsOf(a, { items: { [K2]: [entry(A, K2), { ...entry({ id: 'ghost', type: 'talent', name: 'Ghost' }, K2) }] } }, { [K2]: 4 }).length, 0, 'an item with no fact in the frozen projection is not evidence');
  assert.equal(claimsOf(a, { skills: { [K2]: [skillEntry('stealth'), { ...skillEntry('persuasion') }] } }, { [K2]: 4 }).length, 1, 'two distinct trained skills');
});

test('SV-19 ranking is the existing observed score (no new scorer): at most two claims, score descending then key; a key with no positive observed score gets none', () => {
  const a = actor([A, B, C]);
  const prov = { items: { [K1]: [entry(A, K1), entry(B, K1)], [K2]: [entry(A, K2), entry(C, K2)], [K3]: [entry(B, K3), entry(C, K3)] } };
  assert.deepEqual(claimsOf(a, prov, { [K1]: 2, [K2]: 5, [K3]: 3 }).map((c) => c.key), [K2, K3]);
  assert.deepEqual(claimsOf(a, prov, { [K1]: 0 }).map((c) => c.key), []);
});

const shown = (Ctl, pack, a, prov, bias, events = []) => {
  const ctl = Ctl === 'mc' ? new M.MulticlassSurveyController({ pack, manifest, preview: true, archetypeLookup: () => null }).sync({ selectedClassId: 'noble', classLevels: { soldier: 3 }, seed: 's', ...base(a, prov, bias), events })
    : new P.PrestigeSurveyController({ pack, manifest, preview: true, archetypeLookup: () => null }).sync({ selectedClassId: 'ace_pilot', classLevels: { jedi: 6 }, ...base(a, prov, bias), events });
  return ctl;
};
const toQ6 = (ctl) => { if (ctl.adapter.kind === 'prestige') { ['q1', 'q2', 'q3'].forEach((q) => ctl.skipQuestion(q, ctl.seq)); ctl.choose('q4', 'pr.q4.dive', ctl.seq); ctl.choose('q5', ctl.view().view.options[0].optionId, ctl.seq); if (ctl.view().view?.questionId === 'q5b') ctl.choose('q5b', ctl.view().view.options.at(-1).optionId, ctl.seq); } else { ctl.choose('q1', 'mc.noble.q1.soldier.01', ctl.seq); ctl.skipQuestion('q2', ctl.seq); ctl.choose('q3', 'mc.q3.dive', ctl.seq); ctl.choose('q4', ctl.view().view.options[0].optionId, ctl.seq); ctl.choose('q5', ctl.view().view.options[0].optionId, ctl.seq); } return ctl.view(); };
const grounded = actor([A, B]);
const PROV = { items: { [K1]: [entry(A, K1), entry(B, K1)] } };

test('SV-19 the approved wording is displayed with frozen slots, exact supporting fact ids and a stable claim id; both surveys show the same assessment', () => {
  const mc = toQ6(shown('mc', mcPack, grounded, PROV, { [K1]: 5 })); const pr = toQ6(shown('pr', prPack, grounded, PROV, { [K1]: 5 }));
  const line = "Your current training supports accuracy. I wonder whether that reflects how you prefer to approach problems, or simply what you've prepared for.";
  assert.ok(mc.view.situation.includes(line)); assert.ok(pr.view.situation.includes(line));
  assert.equal(q6c.assessment.method.editorialStatus, 'owner_approved_text'); assert.equal(q6c.assessment.theme.editorialStatus, 'owner_approved_text');
  const reading = (ctl, kind) => Q6.q6Context({ surveyKind: kind, pack: kind === 'mc' ? mcPack : prPack, draft: ctl.draft, ctx: ctl.ctx, runtime: ctl.runtime, archetypeLookup: () => null }).reading;
  const rm = reading(shown('mc', mcPack, grounded, PROV, { [K1]: 5 }), 'multiclass'); const rp = reading(shown('pr', prPack, grounded, PROV, { [K1]: 5 }), 'prestige');
  const mclaim = rm.claims.find((c) => c.claimKind === 'method_preference');
  assert.equal(mclaim.claimId, `claim.method.${K1}`); assert.equal(mclaim.groundedBy.length, 2); assert.deepEqual(mclaim.slots, { method_phrase: 'accuracy', method_key: K1 });
  assert.deepEqual(rm.claims, rp.claims, 'identical evidence: identical claims in both surveys');
  assert.deepEqual(rm.claims.map((c) => c.claimKind), ['method_preference', 'unresolved_reading_disagreement'], 'the unresolved identity reading is preserved');
});

test('SV-19 the release gate covers the assessment clause and every phrase record; draft phrases never reach players even with approved wording', () => {
  const ctl = shown('mc', mcPack, grounded, PROV, { [K1]: 5 });
  const used = Q6.q6Context({ surveyKind: 'multiclass', pack: mcPack, draft: ctl.draft, ctx: ctl.ctx, runtime: ctl.runtime, archetypeLookup: () => null }).clausesUsed;
  assert.ok(used.some((r) => r.id === 'reflection.assessment.method') && used.some((r) => r.id === `reflection.assessment.phrase.${K1}`));
  const run = (pack, preview) => Q6.resolveQ6({ surveyKind: 'multiclass', pack, draft: { answers: {} }, qid: 'q6', ctx: ctl.ctx, runtime: ctl.runtime, archetypeLookup: () => null, preview });
  assert.equal(run(mcPack, false).reason, 'unapproved_content'); assert.equal(run(mcPack, true).available, true);
  assert.ok(Object.values(q6c.assessment.methodPhrases).every((p) => p.editorialStatus === 'draft_text' && /^[a-z][a-zA-Z ]+$/.test(p.text) && !/\{|\}/.test(p.text)));
  assert.equal(Object.keys(q6c.assessment.methodPhrases).length, 125);
});

test('SV-19 corrections target only displayed claims: NOT shows the method claim with its filled correction wording; rejecting it touches no owned fact or goal', () => {
  const ctl = shown('pr', prPack, grounded, PROV, { [K1]: 5 }); toQ6(ctl);
  assert.ok(ctl.choose('q6', 'mc.q6.choice.d', ctl.seq));
  const v = ctl.view().view; assert.equal(v.questionId, 'q6n');
  const ids = v.options.map((o) => o.optionId); assert.ok(ids.includes(`pr.q6n.claim.method.${K1}`) && ids.includes('pr.q6n.claim.unresolved_reading'));
  assert.ok(v.options.every((o) => !/\{|\}/.test(o.text)), 'slots are filled');
  assert.ok(ctl.chooseMany('q6n', [`pr.q6n.claim.method.${K1}`], ctl.seq));
  assert.ok(ctl.chooseMany('q6a', [ctl.view().view.options[0].optionId], ctl.seq));
  const done = ctl.finish(ctl.seq); assert.deepEqual(done.reflection.result.rejectedClaimIds, [`claim.method.${K1}`]); assert.deepEqual(done.goals, []);
  const ev = F.buildSurveyLedgerPatch({ actor: { flags: {} }, selection: { drafts: {}, committed: { [ctl.scopeKey]: done } }, transactionId: 't1', level: 9, completedAt: 'now' })['flags.foundryvtt-swse.mentorSurvey.events'];
  const corr = ev.find((e) => e.type === 'reflection_correction'); assert.equal(corr.mutatesMechanics, false); assert.equal(corr.mutatesGoals, false);
  // a later reading on the SAME evidence does not repeat the rejected claim; changed supporting evidence may bring it back
  assert.ok(ev.every((e) => e.provenance?.preview === true), 'a preview run produces preview events');
  assert.equal(claimsOf(grounded, PROV, { [K1]: 5 }, ev).length, 1, 'preview corrections never suppress a later reading');
  const committed = ev.map((e) => ({ ...e, provenance: { ...e.provenance, preview: false } }));
  const again = claimsOf(grounded, PROV, { [K1]: 5 }, committed); assert.deepEqual(again, [], 'rejected on this exact evidence');
  const C2 = it('talent', 'Delta'); const later = actor([A, B, C2]);
  assert.equal(claimsOf(later, { items: { [K1]: [entry(A, K1), entry(C2, K1)] } }, { [K1]: 5 }, committed).length, 1, 'different supporting facts: eligible again');
});

test('SV-19 a changed actor state invalidates the Q6 answer without replacing it; preview corrections never suppress later readings', () => {
  const ctl = shown('mc', mcPack, grounded, PROV, { [K1]: 5 }); toQ6(ctl); assert.ok(ctl.choose('q6', 'mc.q6.choice.a', ctl.seq));
  const b = base(actor([A, B, C]), { items: { [K1]: [entry(A, K1), entry(C, K1)] } }, { [K1]: 5 });
  ctl.sync({ selectedClassId: 'noble', classLevels: { soldier: 3 }, seed: 's', ...b });
  assert.equal(ctl.draft.answers.q6, undefined); assert.ok(ctl.draft.invalidated.q6);
  const previewEv = [{ type: 'reflection_snapshot', readingId: 'r', provenance: { preview: true }, reading: { claims: [{ claimId: `claim.method.${K1}`, claimKind: 'method_preference', groundedBy: ['x'] }] } }, { type: 'reflection_correction', readingId: 'r', provenance: { preview: true }, rejectedClaimIds: [`claim.method.${K1}`] }];
  assert.equal(MI.rejectedSignatures(previewEv).size, 0);
});

test('SV-19 theme claims are not produced: the canonical SSOT has no mechanical-bias field and its mechanics sections are audited draft; an ambiguous or empty match omits the inference', () => {
  const a = json('data/archetypes.json').archetypes; const parents = Object.values(a).filter((x) => x.kind === 'parent');
  assert.equal(parents.length, 97); assert.ok(parents.every((p) => !('mechanicalBias' in p) && !('mechanicalBias' in p.mechanics)), 'no usable semantic key relationship in the SSOT');
  assert.ok(parents.every((p) => p.audit.skills === 'draft' && p.audit.talents === 'draft' && p.audit.feats === 'draft'), 'mechanics sections are draft, not certified');
  assert.deepEqual(MI.themeClaims(), []); assert.equal(MI.THEME_RESOLUTION.available, false); assert.equal(q6c.assessment.themeResolution.available, false);
  assert.equal(MI.pickUnambiguousTheme([]), null); assert.equal(MI.pickUnambiguousTheme([{ id: 'a' }, { id: 'b' }]), null); assert.deepEqual(MI.pickUnambiguousTheme([{ id: 'a' }]), { id: 'a' });
  assert.ok(!/\{theme_phrase\}[\s\S]*displayed/.test(JSON.stringify(q6c.assessment.methodPhrases)), 'no theme text is composed anywhere');
});

test('SV-19 without provenance or with ability-only evidence no method claim is made, and the reading stays the unresolved form', () => {
  const none = toQ6(shown('mc', mcPack, grounded, { items: {}, skills: {} }, { [K1]: 5 }));
  assert.ok(!/Your current training supports/.test(none.view.situation));
  const rm = Q6.q6Context({ surveyKind: 'multiclass', pack: mcPack, draft: {}, ctx: { destinationClassId: 'noble', originClassId: 'soldier', evidenceRevision: 'r' }, runtime: { evidence: E.projectActorEvidence(grounded), events: [], observedBias: { [K1]: 5 }, observedProvenance: null }, archetypeLookup: () => null }).reading;
  assert.deepEqual(rm.claims.map((c) => c.claimKind), ['unresolved_reading_disagreement']);
});

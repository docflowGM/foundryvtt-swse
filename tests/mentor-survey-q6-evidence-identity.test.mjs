import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = 'scripts/mentor/mentor-survey-v2';
const u = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const P = await import(u(`${dir}/prestige-controller.js`));
const E = await import(u(`${dir}/actor-evidence.js`));
const F = await import(u(`${dir}/finalization.js`));
const MI = await import(u(`${dir}/method-inference.js`));
const S = await import(u(`${dir}/content-store.js`));
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const q6c = json('data/mentor-survey/reflection-q6.json');
const prPack = { ...json('data/mentor-survey/prestige.json'), q1q3: json('data/mentor-survey/prestige-q1q3.json'), q6Content: q6c };
const manifest = json('data/mentor-survey/release-manifest.json');
const K1 = 'accuracy';

const it = (type, name, certified = true) => ({ type, name, id: `${type}-${name}`, system: {}, flags: certified ? { swse: { canonicalTalent: { canonicalId: `c.${name}` } } } : {} });
const actor = (items, skills = {}) => ({ items: [{ type: 'class', name: 'Soldier', id: 'cls', system: { level: 3 } }, ...items], system: { skills } });
const entry = (item) => ({ itemId: item.id, type: item.type, name: item.name, canonicalId: E.canonicalIdOf(item).canonicalId, certified: E.canonicalIdOf(item).certified, ruleType: 'attackBonus', specificity: 'target' });
const sk = (k) => ({ skillKey: k, canonicalId: `skill:${k}`, trained: true, skillFocus: false });
const claims = (a, prov, events = []) => MI.methodClaims({ projection: E.projectActorEvidence(a), observedBias: { [K1]: 5 }, provenance: { items: {}, skills: {}, ...prov }, methodKeys: q6c.assessment.methodKeys, events });
const B = it('feat', 'Beta'); const C = it('talent', 'Gamma'); const A = it('talent', 'Alpha');

test('SV-19 a rejection stays suppressed when an unrelated feat renumbers the positional fact ids; changed supporting evidence reopens it', () => {
  const prov = { items: { [K1]: [entry(A), entry(B)] } };
  const first = actor([A, B]); const c1 = claims(first, prov); assert.equal(c1.length, 1);
  // run the real flow: reject the claim, commit it, and read the committed (non-preview) events
  const ctl = new P.PrestigeSurveyController({ pack: prPack, manifest, preview: true, archetypeLookup: () => null }).sync({ selectedClassId: 'ace_pilot', classLevels: { jedi: 6 }, evidence: E.projectActorEvidence(first), events: [], observedBias: { [K1]: 5 }, observedProvenance: { ...prov, skills: {}, attributes: {}, snapshot: 's' } });
  ['q1', 'q2', 'q3'].forEach((q) => ctl.skipQuestion(q, ctl.seq)); ctl.choose('q4', 'pr.q4.dive', ctl.seq); ctl.choose('q5', ctl.view().view.options[0].optionId, ctl.seq); if (ctl.view().view?.questionId === 'q5b') ctl.choose('q5b', ctl.view().view.options.at(-1).optionId, ctl.seq);
  ctl.choose('q6', 'mc.q6.choice.d', ctl.seq); ctl.chooseMany('q6n', [`pr.q6n.claim.method.${K1}`], ctl.seq); ctl.chooseMany('q6a', [ctl.view().view.options[0].optionId], ctl.seq);
  const done = ctl.finish(ctl.seq);
  const events = F.buildSurveyLedgerPatch({ actor: { flags: {} }, selection: { drafts: {}, committed: { [ctl.scopeKey]: done } }, transactionId: 't1', level: 9, completedAt: 'now' })['flags.foundryvtt-swse.mentorSurvey.events'].map((e) => ({ ...e, provenance: { ...e.provenance, preview: false } }));
  const snap = events.find((e) => e.type === 'reflection_snapshot'); assert.deepEqual(snap.reading.claims.find((c) => c.claimId === `claim.method.${K1}`).sourceKeys, ['item:c.Alpha', 'item:c.Beta'], 'the snapshot persists stable source identities');
  // an unrelated feat that sorts BEFORE both supporting items shifts every positional fact id
  const aardvark = it('feat', 'Aardvark');
  const later = actor([aardvark, A, B]); const c2 = claims(later, prov, events);
  const idsBefore = E.projectActorEvidence(first).facts.filter((f) => f.label === 'Beta').map((f) => f.factId); const idsAfter = E.projectActorEvidence(later).facts.filter((f) => f.label === 'Beta').map((f) => f.factId);
  assert.notDeepEqual(idsBefore, idsAfter, 'the positional fact id of an unchanged item really did change');
  assert.deepEqual(c2, [], 'the rejected interpretation stays suppressed on unchanged supporting evidence');
  // changed supporting evidence legitimately reopens it
  const c3 = claims(actor([A, C]), { items: { [K1]: [entry(A), entry(C)] } }, events); assert.equal(c3.length, 1);
  assert.equal(claims(actor([A, B, C]), { items: { [K1]: [entry(A), entry(B), entry(C)] } }, events).length, 1, 'an added supporting source changes the claim identity');
});

test('SV-19 canonical skill identity: Skill Focus names and actor skill keys normalize through one authority, including nested names', () => {
  assert.equal(E.canonicalSkillKey('Use the Force'), E.canonicalSkillKey('useTheForce')); assert.equal(E.canonicalSkillKey('Knowledge (Tactics)'), E.canonicalSkillKey('knowledgeTactics'));
  assert.equal(E.skillFocusTarget('Skill Focus (Knowledge (Tactics))'), 'Knowledge (Tactics)'); assert.equal(E.skillFocusTarget('Skill Focus (Use the Force)'), 'Use the Force'); assert.equal(E.skillFocusTarget('Weapon Focus (Rifles)'), null);
  for (const [focusName, skillKey] of [['Skill Focus (Use the Force)', 'useTheForce'], ['Skill Focus (Knowledge (Tactics))', 'knowledgeTactics'], ['Skill Focus (Stealth)', 'stealth'], ['Skill Focus (Gather Information)', 'gatherInformation']]) {
    const focus = it('feat', focusName); const a = actor([focus, A], { [skillKey]: { trained: true } });
    assert.equal(claims(a, { items: { [K1]: [entry(focus)] }, skills: { [K1]: [sk(skillKey)] } }).length, 0, `${focusName} + trained ${skillKey} = ONE source`);
    assert.equal(claims(a, { items: { [K1]: [entry(focus), entry(A)] }, skills: { [K1]: [sk(skillKey)] } }).length, 1, `${focusName} + trained ${skillKey} + a talent = two sources`);
  }
  const lone = it('feat', 'Skill Focus (Use the Force)');
  assert.equal(claims(actor([lone, A], {}), { items: { [K1]: [entry(lone), entry(A)] } }).length, 0, 'Skill Focus without a trained skill fact is not a source at all');
});

test('SV-19 evidence certification: an item known only by name is not verified evidence; fail closed', () => {
  const U = it('talent', 'Nameless', false); const V = it('feat', 'Anon', false);
  assert.equal(E.canonicalIdOf(U).certified, false);
  assert.equal(claims(actor([U, V]), { items: { [K1]: [entry(U), entry(V)] } }).length, 0, 'two uncertified items');
  assert.equal(claims(actor([A, U]), { items: { [K1]: [entry(A), entry(U)] } }).length, 0, 'one certified plus one uncertified = one source');
  assert.equal(claims(actor([A, B]), { items: { [K1]: [{ ...entry(A), certified: true }, { ...entry(B), canonicalId: 'forged' }] } }).length, 0, 'a provenance entry whose canonical id does not match the owned fact is rejected');
});

test('SV-19 editorial ledger: all 125 canonical keys are classified once; only methods carry a phrase; excluded categories can never produce a claim', () => {
  const canon = Object.keys(json('data/bias-keys-canonical.json').mechanicalBias); const L = q6c.assessment.ledger;
  assert.deepEqual(Object.keys(L).sort(), [...canon].sort());
  const cats = new Set(Object.values(L).map((x) => x.category)); assert.deepEqual([...cats].sort(), ['affiliation', 'capability', 'method', 'role', 'technique', 'unresolved']);
  for (const [k, v] of Object.entries(L)) { assert.equal(Boolean(v.phrase), v.category === 'method', k); assert.equal(Boolean(q6c.assessment.methodKeys[k]), v.category === 'method', k); if (v.category !== 'method') assert.ok(v.excludedBecause, `${k} states why`); }
  for (const k of ['critRange', 'critDamage', 'silentKill', 'illegalTrade', 'imperialDuty', 'lawEnforcement', 'smugglingExpertise', 'outlawSkills', 'deadlyPrecision', 'commandAuthority', 'arenaExpertise', 'skillUtility']) assert.ok(!q6c.assessment.methodKeys[k], `${k} is excluded`);
  assert.equal(q6c.assessment.methodKeys.forceDC.text, 'making Force powers harder to resist'); assert.equal(q6c.assessment.methodKeys.unarmeddMastery.text, 'unarmed fighting techniques'); assert.equal(q6c.assessment.methodKeys.tacticalVerse.text, 'using varied tactical approaches');
  assert.equal(Object.keys(q6c.assessment.methodKeys).length, 77);
  const counts = {}; for (const v of Object.values(L)) counts[v.category] = (counts[v.category] || 0) + 1;
  assert.deepEqual(counts, { method: 77, capability: 11, technique: 22, role: 8, affiliation: 4, unresolved: 3 });
  for (const m of Object.values(q6c.assessment.methodKeys)) assert.ok(!/\b(kill|illegal|imperial|criminal|outlaw|smuggl|sabotage|law|DC)\b/i.test(m.text) && !/[A-Z]{2}/.test(m.text), `${m.key} phrase avoids mechanics shorthand and implied acts`);
  const evid = { items: {}, skills: {} };
  for (const k of ['silentKill', 'critRange', 'imperialDuty']) assert.deepEqual(MI.methodClaims({ projection: E.projectActorEvidence(actor([A, B])), observedBias: { [k]: 9 }, provenance: { ...evid, items: { [k]: [entry(A), entry(B)] } }, methodKeys: q6c.assessment.methodKeys }), [], `${k} never makes a claim even with perfect provenance`);
});

test('SV-19 correction grammar: the method correction is source-neutral (same stable id, draft, original preserved) and claims are told apart by a reviewed phrase detail', () => {
  const neg = q6c.negatives.method_preference[0];
  assert.equal(neg.id, 'mc.q6.not.method_preference.1'); assert.equal(neg.text, 'I recognize that training, but I don’t think it necessarily describes how I prefer to approach problems.');
  assert.equal(neg.hasSlots, false); assert.equal(neg.editorialStatus, 'draft_text'); assert.match(neg.originalText, /\{method_phrase\}/);
  assert.deepEqual(S.validateResponseRecord(neg), []); assert.ok(S.isFirstPerson(neg.text));
  assert.ok(Object.values(q6c.negatives).flat().filter((r) => /method_phrase/.test(r.text)).length === 0, 'no correction concatenates a raw phrase into a sentence');
});

test('SV-19 owner-reviewed phrases and accurate exclusion categories: twelve specified phrasings; techniques are not mislabeled affiliations; exclusion never activates a key', () => {
  const m = q6c.assessment.methodKeys; const L = q6c.assessment.ledger;
  const want = { burstDamage: 'delivering damage in a powerful burst', conditionTrack: 'hindering opponents through debilitating effects', accuracy: 'making precise attacks', pilotMastery: 'operating vehicles with greater control', knowledgeMastery: 'applying specialized knowledge', biotechMastery: 'working with biotechnology', surgicalMastery: 'using advanced surgical techniques', wildernessLore: 'applying knowledge of wilderness conditions', weaponMastery: 'using specialized weapon techniques', medicalKnowledge: 'applying medical knowledge', technicalMastery: 'applying technical expertise', tacticalVerse: 'using varied tactical approaches' };
  for (const [k, t] of Object.entries(want)) assert.equal(m[k].text, t, k);
  assert.ok(Object.values(m).every((x) => x.editorialStatus === 'draft_text'), 'no phrase is approved');
  assert.deepEqual(Object.entries(L).filter(([, v]) => v.category === 'affiliation').map(([k]) => k).sort(), ['forceBond', 'imperialDuty', 'networkInfluence', 'sithAlchemy']);
  for (const k of ['sabotageExpertise', 'commandoTactics', 'ritualMastery', 'itemEnchantment', 'businessAcumen']) { assert.equal(L[k].category, 'technique', k); assert.match(L[k].excludedBecause, /^a legitimate (technique|tactical technique|area of (knowledge|expertise))/, `${k} reason does not call the concept invalid`); assert.ok(!m[k], `${k} stays excluded`); }
  const report = fs.readFileSync(path.join(ROOT, 'docs/design/mentor-survey-v2/19-Q6-METHOD-REVIEW-REPORT.md'), 'utf8');
  assert.match(report, /## 3\. Remaining grammatical or source-authority uncertainty/); assert.match(report, /`brutalForce`/); assert.match(report, /Rendered examples/);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateAuthority, loadAuthority, activeVocabulary, utilizationCensus, finalCorpusChecks, detectFinalState, AUTH, MANIFEST_PATH, REPORT_PATH, NEW_TAG, RETIRED } from '../tools/apply-talent-phase-12-final-ontology.mjs';
import { detectPackState } from '../tools/apply-talent-phase-3c.mjs';

// Phase 12 final owner adjudication: pins temporary-talent, the retired vocabulary, 181/181 utilization and the 1,187 / 1,187 corpus. Expectations come from the authority file.
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const nd = rel => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const authority = rd(AUTH), L = loadAuthority(), talents = nd('packs/talents.db'), byId = new Map(talents.map(t => [t._id, t])), tagsOf = t => (Array.isArray(t?.system?.tags) ? t.system.tags : []);
const counts = {}; for (const t of talents) for (const g of tagsOf(t)) counts[g] = (counts[g] ?? 0) + 1;

test('authority is a post-QA5 owner ruling: FINAL_FOR_EXECUTION, owner-authorized, records 184 -> 181, 1185+2 -> 1187+0, and the exact final arrays', () => {
  assert.equal(authority.status, 'FINAL_FOR_EXECUTION'); assert.equal(authority.ownerAuthorized, true); assert.match(authority.supersession, /Post-QA5 owner ruling/);
  assert.deepEqual([authority.vocabulary.previousVocabularyCount, authority.vocabulary.finalVocabularyCount, authority.vocabulary.finalVocabulary.length], [184, 181, 181]);
  assert.deepEqual(authority.corpus, { canonicalTalents: 1187, previousCertifiedTalents: 1185, previousDeferredTalents: 2, finalCertifiedTalents: 1187, finalDeferredTalents: 0, finalUntaggedCanonicalTalents: 0 });
  assert.deepEqual(authority.vocabulary.retiredTags, ['skill-mastery', 'balance', 'natural_weapon', 'entangle']); assert.deepEqual(authority.vocabulary.newTags, ['temporary-talent']);
  assert.deepEqual(authority.assignments.map(a => [a.auditKey, a.canonicalId, a.finalTags]), [['UR-022', 'fd37b68c6fb620f6', ['temporary-talent', 'once-per-encounter']], ['GOI-002', 'd376f165f1a47281', ['temporary-talent', 'force_point_spend', 'resource_spend', 'action_economy']]]);
});
test('the validator rejects tampered authorities (alias tag, wrong retired set, missing temporary-talent, wrong counts, extra assignment, retired tag kept, skill_mastery dropped)', () => {
  const mut = fn => { const c = structuredClone(authority); fn(c); return c; };
  assert.throws(() => validateAuthority(mut(c => { c.ownerRuling.newTag.machineTag = 'temporary_talent_access'; })), /temporary-talent/);
  assert.throws(() => validateAuthority(mut(c => { c.vocabulary.retiredTags.pop(); })), /retired/);
  assert.throws(() => validateAuthority(mut(c => { c.assignments[0].finalTags = ['once-per-encounter']; })), /temporary-talent/);
  assert.throws(() => validateAuthority(mut(c => { c.vocabulary.finalVocabularyCount = 184; })), /181/);
  assert.throws(() => validateAuthority(mut(c => { c.assignments.pop(); })), /two former deferrals/);
  assert.throws(() => validateAuthority(mut(c => { c.vocabulary.finalVocabulary[0] = 'balance'; })), /retired|final vocabulary/);
  assert.throws(() => validateAuthority(mut(c => { c.vocabulary.finalVocabulary = c.vocabulary.finalVocabulary.filter(t => t !== 'skill_mastery').concat('skill-mastery'); })), /skill_mastery|retired|final vocabulary/);
  assert.throws(() => validateAuthority(mut(c => { c.assignments[1].finalTags = ['temporary-talent', 'force_point_spend']; })), /resource_spend/);
});
test('new tag: Quick Study and Done It All carry temporary-talent and their exact final arrays; temporary-talent = 2; no alias exists anywhere in production', () => {
  for (const a of authority.assignments) { assert.deepEqual(byId.get(a.canonicalId).system.tags, a.finalTags, a.auditKey); assert.equal(byId.get(a.canonicalId).name, a.name); assert.ok(tagsOf(byId.get(a.canonicalId)).includes(NEW_TAG)); }
  assert.equal(counts[NEW_TAG], 2);
  for (const alias of ['temporary_talent_access', 'temporary-talent-access', 'temporary_talent', 'Temporary-Talent']) assert.equal(counts[alias] ?? 0, 0, alias);
});
test('retired tags: zero production uses and not in the active vocabulary; the underscore skill_mastery survives (approved and used)', () => {
  const vocab = activeVocabulary(); assert.deepEqual(RETIRED, ['skill-mastery', 'balance', 'natural_weapon', 'entangle']);
  for (const t of RETIRED) { assert.equal(counts[t] ?? 0, 0, t); assert.ok(!vocab.has(t), t); }
  assert.ok(vocab.has('skill_mastery')); assert.ok(counts.skill_mastery > 0); assert.equal(counts.skill_mastery, 17); assert.ok(!vocab.has('skill-mastery'));
});
test('vocabulary completeness: approved 181 = used 181; unused 0; unknown 0; census lists temporary-talent = 2 and the least-used tags', () => {
  const u = utilizationCensus(); assert.deepEqual([u.approved, u.used, u.unused.length, u.unknown.length], [181, 181, 0, 0]);
  assert.equal(u.rows.find(r => r.tag === NEW_TAG).uses, 2); assert.ok(u.leastUsed.length === 15 && u.leastUsed.every(r => r.uses > 0));
  assert.deepEqual(Object.keys(counts).sort(), [...activeVocabulary()].sort());
});
test('corpus completeness: 1,187 canonical = 1,187 certified; 0 deferred; 0 untagged; no empty or duplicate tags; no TEMPORARY_TALENT_ACCESS gap remains', () => {
  assert.equal(talents.length, 1187); assert.equal(byId.size, 1187);
  assert.ok(talents.every(t => tagsOf(t).length > 0 && new Set(tagsOf(t)).size === tagsOf(t).length));
  assert.equal(JSON.stringify(authority.assignments).includes('AWAITING_DESIGNER_ADJUDICATION'), false);
});
test('full-corpus certification (QA5 1,185 exact + integrity rules + family convergence + utilization) passes on production', () => { const r = finalCorpusChecks(talents); assert.ok(r.length >= 20); for (const x of r) assert.ok(x.ok, x.id + ' ' + x.detail); });
test('mutation boundary: manifest touches exactly the two former deferrals, system.tags only, from empty arrays', () => {
  const man = rd(MANIFEST_PATH), rep = rd(REPORT_PATH);
  assert.deepEqual(man.rows.map(r => r.id).sort(), ['d376f165f1a47281', 'fd37b68c6fb620f6']); assert.ok(man.rows.every(r => r.path === 'system.tags' && r.before.length === 0));
  assert.equal(rep.status, 'DRY_RUN_CERTIFIED'); assert.ok(rep.verification.results.every(x => x.ok)); assert.deepEqual([rep.counts.nonTargetRecordsChanged, rep.counts.nonTagFieldChanges, rep.counts.zeroTagBefore, rep.counts.zeroTagAfter, rep.counts.rawTagsBefore, rep.counts.rawTagsAfter], [0, 0, 2, 0, 180, 181]);
  assert.ok(!rep.probeSignatureChanges.some(s => /:(forceTalent|treeIdentity)$/.test(s)), 'temporary-talent must not move Force-talent or tree identity');
});
test('Force-talent identity stays structural: temporary-talent does not affect classification (Quick Study / Done It All follow their tree identity alone)', () => {
  const rep = rd(REPORT_PATH); assert.equal(rep.probeSignatureChanges.filter(s => s.endsWith(':forceTalent')).length, 0);
  const census = rd('data/audits/talent-phase-12-force-talent-census.json'); assert.equal(census.rawForceTalents, 173);
  for (const id of ['fd37b68c6fb620f6', 'd376f165f1a47281']) assert.ok(!census.oldTagCounter.falseNegatives.includes(id));
});
test('state-appropriate gate passes: POST_12_FINAL_STATE, --verify --exact passes', () => {
  assert.equal(detectFinalState(), 'POST_FINAL'); assert.equal(detectPackState().state, 'POST_12_FINAL_STATE');
  const r = spawnSync(process.execPath, ['tools/apply-talent-phase-12-final-ontology.mjs', '--verify', '--exact'], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr);
});
console.log(`\n${n} Phase 12 final-ontology tests passed`);

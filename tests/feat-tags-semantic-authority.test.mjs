import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateAuthority, loadContext, AUTHORITY_PATH, ROOT, OWNER_SKILL_ADDITIONS, REQUIRED_IMPLICATIONS } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Feat TAGS Pass 1 authority (PASS1_COMPLETE / INPUT_TO_PASS2): validator behaviour and identity-anomaly pins.
const authority = JSON.parse(fs.readFileSync(new URL('../' + AUTHORITY_PATH, import.meta.url), 'utf8'));
const ctx = loadContext();
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const mutate = (fn) => { const c = structuredClone(authority); fn(c); return validateAuthority(c, ctx).failures; };
const has = (failures, re) => failures.some(f => re.test(f));

test('the complete 353-assignment authority passes with zero failures', () => {
  const r = validateAuthority(authority, ctx);
  assert.deepEqual(r.failures, []);
  assert.deepEqual([r.stats.assignments, r.stats.uniqueIds, r.stats.vocabulary], [353, 353, 187]);
});
test('vocabulary is the certified 181-tag talent ontology plus exactly the six owner-authorized skill tags', () => {
  assert.equal(ctx.baseVocabulary.length, 181);
  assert.deepEqual(OWNER_SKILL_ADDITIONS, ['acrobatics', 'climb', 'endurance', 'gather_information', 'jump', 'swim']);
  for (const t of OWNER_SKILL_ADDITIONS) { assert.ok(ctx.vocabulary.has(t), t); assert.ok(!ctx.baseVocabulary.includes(t), t); }
  assert.equal(ctx.vocabulary.size, 187);
});
test('a duplicate canonical ID fails', () => {
  const f = mutate(c => { c.assignments[1].canonicalId = c.assignments[0].canonicalId; });
  assert.ok(has(f, /duplicate canonical IDs/));
});
test('an unknown canonical ID fails', () => {
  assert.ok(has(mutate(c => { c.assignments[0].canonicalId = 'ffffffffffffffff'; }), /unknown canonical ID/));
});
test('an unknown tag fails', () => {
  assert.ok(has(mutate(c => { c.assignments[0].finalTags.push('not_a_real_tag'); }), /unknown tag not_a_real_tag/));
});
test('a duplicate tag within one feat fails', () => {
  assert.ok(has(mutate(c => { c.assignments[0].finalTags.push(c.assignments[0].finalTags[0]); }), /duplicate tag/));
});
test('every required implication is enforced when its consequent is removed', () => {
  for (const [a, b] of REQUIRED_IMPLICATIONS) {
    const f = mutate(c => { c.assignments[0].finalTags = [a]; });
    assert.ok(has(f, new RegExp(`${a} requires ${b}`)), `${a} -> ${b}`);
  }
});
test('retired and alias spellings fail (no silent normalization)', () => {
  for (const alias of ['skill-mastery', 'critical-hit', 'attack-of-opportunity']) assert.ok(has(mutate(c => { c.assignments[0].finalTags.push(alias); }), /forbidden alias/), alias);
  for (const retired of ['balance', 'natural_weapon', 'entangle']) assert.ok(has(mutate(c => { c.assignments[0].finalTags.push(retired); }), /retired tag/), retired);
  for (const t of ['critical_hit', 'skill_mastery', 'attack_of_opportunity']) assert.ok(ctx.vocabulary.has(t), t);
});
test('Weapon Proficiency contributes one canonical identity and the six derivatives never inflate the count', () => {
  assert.equal(authority.assignments.filter(a => a.name === 'Weapon Proficiency').length, 1);
  const deriv = ctx.reconciliation.implementationDerivatives.map(d => d.repoId);
  assert.equal(deriv.length, 6);
  for (const id of deriv) assert.ok(!authority.assignments.some(a => a.canonicalId === id), id);
  const f = mutate(c => { c.assignments.push({ ...structuredClone(c.assignments[0]), canonicalId: deriv[0], name: 'Weapon Proficiency (Simple Weapons)' }); });
  assert.ok(has(f, /assignments 354 != 353/) && has(f, /implementation derivative .* counted as a canonical semantic identity/));
});
test('the two Staggering Attack feats remain distinct identities', () => {
  const sa = authority.assignments.filter(a => a.name === 'Staggering Attack');
  assert.deepEqual(sa.map(a => a.canonicalId).sort(), ['192923f60db38831', 'c9c4130a55761330']);
  assert.ok(has(mutate(c => { c.assignments.find(a => a.canonicalId === 'c9c4130a55761330').canonicalId = '192923f60db38831'; }), /duplicate canonical IDs|Staggering Attack identities differ/));
});
test('Tech Specialist is one Web-primary identity; a reprint duplicate fails', () => {
  const t = authority.assignments.filter(a => a.name === 'Tech Specialist');
  assert.equal(t.length, 1); assert.match(t[0].primaryPublication.source, /Web Enhancement 1/); assert.equal(t[0].primaryPublication.page, 3);
  assert.equal(t[0].reviewPublication.source, 'Starships of the Galaxy');
  assert.ok(has(mutate(c => { c.assignments.push(structuredClone(c.assignments.find(a => a.name === 'Tech Specialist'))); }), /duplicate canonical IDs|Tech Specialist must be exactly one/));
});
test('Echani Training is a single KOTOR-primary identity', () => {
  assert.equal(authority.assignments.filter(a => a.name === 'Echani Training').length, 1);
});
test('Recall is the TFU feat identity and is not confused with the Rebellion Era talent', () => {
  const r = authority.assignments.filter(a => a.name === 'Recall');
  assert.equal(r.length, 1); assert.equal(r[0].canonicalId, 'c352f81dde5c9dff'); assert.match(r[0].primaryPublication.source, /Force Unleashed/);
  assert.ok(!authority.assignments.some(a => /Rebellion/.test(a.primaryPublication.source) && a.name === 'Recall'));
  assert.equal(ctx.manifest.records.find(x => x.canonicalId === 'c352f81dde5c9dff').crossDomainCollision.classification, 'SAME_NAME_DIFFERENT_DOMAIN');
  assert.ok(has(mutate(c => { c.assignments.find(a => a.name === 'Recall').primaryPublication.source = 'Rebellion Era Campaign Guide'; }), /Recall must be exactly one TFU|source/));
});
test('declared counts and the production-mutation flag are checked', () => {
  assert.ok(has(mutate(c => { c.counts.approvedOntologyTags = 186; }), /approvedOntologyTags/));
  assert.ok(has(mutate(c => { c.bookCheckpoint.productionMutated = true; }), /productionMutated/));
});
test('validation performs no writes (authority file bytes unchanged)', () => {
  const before = fs.readFileSync(new URL('../' + AUTHORITY_PATH, import.meta.url));
  validateAuthority(structuredClone(authority), ctx);
  assert.ok(before.equals(fs.readFileSync(new URL('../' + AUTHORITY_PATH, import.meta.url))));
  assert.ok(ROOT.length > 0);
});
console.log(`${n} tests passed`);

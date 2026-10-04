import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditSkillCompleteness, buildTextIndex, buildReport, GENERIC_SKILL_PATTERN } from '../tools/audit-feat-tags-skill-completeness.mjs';
import { AUTHORITY_PATH } from '../tools/validate-feat-tags-semantic-authority.mjs';

// Skill-tag completeness audit: advisory and report-only. It must never add tags and never count prerequisite-only mentions.
const rd = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const authority = rd(AUTHORITY_PATH);
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const fake = (name, finalTags, text) => ({ assignments: [{ canonicalId: 'x1', name, primaryPublication: { source: 'T' }, finalTags, canonicalMechanicSummary: text }] });
const idx = (auth) => buildTextIndex(auth);

test('a rules-text skill interaction with no skill tag is reported for owner review (never auto-added)', () => {
  const auth = fake('Probe', ['defense'], 'Roll Stealth to avoid notice.');
  const r = auditSkillCompleteness(auth, idx(auth));
  assert.equal(r.findings.length, 1); assert.deepEqual(r.findings[0].possibleMissingTags.map(m => m.tag), ['stealth']);
  assert.match(r.findings[0].status, /possible skill interaction not represented — owner review required/);
  assert.deepEqual(auth.assignments[0].finalTags, ['defense']);
});
test('a represented skill produces no finding', () => {
  const auth = fake('Probe', ['stealth'], 'Roll Stealth to avoid notice.');
  assert.equal(auditSkillCompleteness(auth, idx(auth)).findings.length, 0);
});
test('named applications inherit the parent skill tag (Intimidate -> persuasion, Sleight of Hand -> stealth)', () => {
  const a1 = fake('P1', ['social'], 'You may Intimidate a target.'); const r1 = auditSkillCompleteness(a1, idx(a1));
  assert.deepEqual(r1.findings[0].possibleMissingTags.map(m => m.tag), ['persuasion']);
  const a2 = fake('P2', ['persuasion'], 'You may Intimidate a target.'); assert.equal(auditSkillCompleteness(a2, idx(a2)).findings.length, 0);
  const a3 = fake('P3', ['stealth'], 'Reroll a Sleight of Hand check.'); assert.equal(auditSkillCompleteness(a3, idx(a3)).findings.length, 0);
});
test('generic all/any-skill mechanics expect `skills`, not individual skill tags', () => {
  assert.ok(GENERIC_SKILL_PATTERN.test('You gain a bonus on all skills.'));
  const auth = fake('P', ['defense'], 'You gain a +1 bonus on all skills.');
  const r = auditSkillCompleteness(auth, idx(auth));
  assert.equal(r.findings[0].genericSkillsTagExpected, true); assert.deepEqual(r.findings[0].possibleMissingTags, []);
});
test('prerequisite text is never scanned (prerequisite-only skills do not qualify)', () => {
  const idxs = buildTextIndex(authority);
  const shake = authority.assignments.find(a => a.name === 'Shake It Off');
  assert.ok(!shake.finalTags.includes('endurance'));
  const entries = idxs.idx.get(shake.canonicalId) || [];
  assert.ok(entries.every(e => !/Constitution 13, trained in Endurance/.test(e.text)));
  const rep = auditSkillCompleteness(authority, idxs);
  assert.ok(!rep.findings.some(f => f.name === 'Shake It Off'));
});
test('the report is advisory: counts, no mutation of the authority object', () => {
  const copy = structuredClone(authority); const rep = buildReport(copy);
  assert.deepEqual(copy, authority); assert.equal(rep.status, 'REPORT_ONLY_OWNER_REVIEW_REQUIRED'); assert.equal(rep.counts.assignments, 353);
  assert.ok(rep.findings.every(f => /owner review required/.test(f.status)));
});
console.log(`${n} tests passed`);

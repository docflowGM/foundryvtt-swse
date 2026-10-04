import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const ont = J('data/audits/talent-feat-phase3d-ontology-authority.json');
const pkt = J('data/audits/talent-feat-phase3-final-owner-policy-packet.json');
const overlay = J('data/audits/talent-feat-pass3b-owner-adjudication.json');
const gaps = J('data/audits/talent-feat-pass3b-policy-gaps.json');
const policyIds = new Set(overlay.ownerPolicies.map(p => p.id));

test('ontology authority has exactly one entry per vocabulary tag with a valid definition status', () => {
  assert.equal(ont.tags.length, 187); assert.equal(new Set(ont.tags.map(t => t.tag)).size, 187);
  for (const t of ont.tags) assert.ok(['OWNER_DEFINED', 'PARTIALLY_OWNER_DEFINED', 'OWNER_DEFINITION_REQUIRED'].includes(t.definitionStatus), t.tag);
  assert.equal(ont.counts.ownerDefined + ont.counts.partiallyOwnerDefined + ont.counts.ownerDefinitionRequired, 187);
});
test('synthesized definitions quote only existing owner policy text; no Claude-created policy IDs', () => {
  for (const t of ont.tags) for (const id of t.controllingPolicyIds) assert.ok(policyIds.has(id), `${t.tag} ${id}`);
  for (const t of ont.tags.filter(x => x.definitionStatus === 'OWNER_DEFINED')) for (const d of t.synthesizedDefinition) assert.equal(d.text, overlay.ownerPolicies.find(p => p.id === d.policyId).text);
  for (const t of ont.tags.filter(x => x.definitionStatus === 'OWNER_DEFINITION_REQUIRED')) assert.equal(t.synthesizedDefinition, null);
});
test('ontology gaps are flagged, not tagged; vocabulary stays 187', () => {
  assert.deepEqual(ont.ontologyGaps.map(g => g.id).sort(), ['condition_track', 'full_round_action', 'recurring_ion_mechanics']);
  for (const g of ont.ontologyGaps) assert.equal(g.state, 'PHASE3_ONTOLOGY_GAP');
  assert.ok(!ont.tags.some(t => ['condition_track', 'full_round_action', 'recurring_ion_mechanics'].includes(t.tag)));
});
test('final packet: one group per tag, every unresolved gap record present, no recommendation language, no undefined text', () => {
  assert.equal(new Set(pkt.groups.map(g => g.tag)).size, pkt.groups.length);
  const ids = new Set(pkt.groups.flatMap(g => g.unresolvedRecordIds));
  assert.equal(pkt.counts.unresolvedRecordFindings, gaps.gaps.reduce((a, g) => a + g.recordLevelUnresolved, 0));
  for (const g of gaps.gaps) for (const r of g.records) assert.ok(ids.has(`${r.domain}:${r.canonicalId}`));
  for (const g of pkt.groups) { assert.ok(g.examples.length >= 1 && g.examples.length <= 5, g.tag); assert.ok(g.ownerQuestions.length >= 1); }
  const md = fs.readFileSync('docs/audits/talent-feat-phase3-final-owner-policy-packet.md', 'utf8');
  assert.ok(!/undefined/.test(md)); assert.ok(!/\b(recommend|likely|proposed answer)\b/i.test(md));
});
test('3D builds are byte-stable', () => {
  execFileSync('node', ['tools/build-talent-feat-phase3d-ontology-and-final-packet.mjs', '--check'], { stdio: 'pipe' });
});

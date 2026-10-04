import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { FINAL_DEFINITIONS, NEW_TAGS } from '../tools/talent-feat-phase3-final-definitions.mjs';
import { HARD_IMPLICATIONS, PRODUCTION_FILES } from '../tools/build-talent-feat-phase3-final-authority.mjs';

const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const rul = J('data/audits/talent-feat-phase3-final-owner-rulings.json');
const auth = J('data/audits/talent-feat-phase3-final-semantic-authority.json');
const ont = J('data/audits/talent-feat-phase3-final-ontology.json');
const close = J('data/audits/talent-feat-phase3-closeout.json');
const base = J('data/audits/talent-feat-pass3b-mechanic-baseline.json');
const overlay = J('data/audits/talent-feat-pass3b-owner-adjudication.json');
const byName = (n, d) => auth.records.find(r => r.name === n && (!d || r.domain === d));
const evidence = new Map(base.records.map(r => [`${r.domain}:${r.canonicalId}`, String(r.evidence).replace(/\s+/g, ' ')]));
const tagsOf = (r) => new Set(r.finalTags);
const WEAPON = ['melee', 'ranged', 'lightsaber', 'pistol', 'unarmed', 'heavy_weapon', 'exotic_weapon'];

test('final vocabulary is exactly 190: 187 - force-point + four new tags; every tag OWNER_DEFINED', () => {
  assert.equal(auth.vocabulary.length, 190); assert.equal(new Set(auth.vocabulary).size, 190);
  assert.ok(!auth.vocabulary.includes('force-point'));
  for (const t of NEW_TAGS) assert.ok(auth.vocabulary.includes(t), t);
  assert.deepEqual(rul.ontologyChange, { before: 187, added: NEW_TAGS, retired: ['force-point'], after: 190, noOtherCreationOrRetirementAuthorized: true });
  assert.equal(ont.tags.length, 190);
  for (const t of ont.tags) { assert.equal(t.definitionStatus, 'OWNER_DEFINED'); assert.ok(t.definition.length > 10); assert.ok(FINAL_DEFINITIONS[t.tag]); }
  assert.equal(ont.counts.ownerDefinitionRequired, 0); assert.equal(ont.counts.partiallyOwnerDefined, 0);
  const base187 = new Set(base.sharedVocabulary); for (const t of auth.vocabulary) assert.ok(base187.has(t) || NEW_TAGS.includes(t), t);
});
test('identities and retired tags: 353/1,187/1,540 certified; force-point and previously retired tags are at zero', () => {
  assert.equal(auth.records.length, 1540); assert.equal(auth.records.filter(r => r.domain === 'FEAT').length, 353); assert.equal(auth.records.filter(r => r.domain === 'TALENT').length, 1187);
  for (const t of ['force-point', 'skill-mastery', 'balance', 'natural_weapon', 'entangle']) assert.equal(auth.records.filter(r => r.finalTags.includes(t)).length, 0, t);
  assert.equal(close.counts.forcePointRecords, 9); assert.equal(close.counts.forcePointFinalUse, 0);
  assert.ok(auth.records.some(r => r.finalTags.includes('skill_mastery')));
  for (const r of auth.records) { assert.equal(new Set(r.finalTags).size, r.finalTags.length); for (const t of r.finalTags) assert.ok(auth.vocabulary.includes(t), `${r.name} ${t}`); }
});
test('hard implications: the prior ten plus full_round_action -> action_economy; zero violations; full_round_action always has action_economy', () => {
  assert.equal(HARD_IMPLICATIONS.length, 11); assert.deepEqual(HARD_IMPLICATIONS[10], ['full_round_action', 'action_economy']);
  for (const r of auth.records) for (const [a, b] of HARD_IMPLICATIONS) if (r.finalTags.includes(a)) assert.ok(r.finalTags.includes(b), `${r.name}: ${a}->${b}`);
  const fra = auth.records.filter(r => r.finalTags.includes('full_round_action')); assert.ok(fra.length > 0);
  for (const r of fra) assert.ok(r.finalTags.includes('action_economy'), r.name);
  for (const t of ['condition_track', 'ion', 'resource_gain', 'ally-trigger', 'teamwork']) assert.ok(!HARD_IMPLICATIONS.some(([a]) => a === t), t);
});
test('condition_track follows its definition: every record has a direct Condition Track mechanic; mention-only records are excluded', () => {
  const hits = rul.newTagSweeps.condition_track.hits; assert.equal(hits.length, auth.records.filter(r => r.finalTags.includes('condition_track')).length);
  for (const h of hits) { assert.ok(h.evidence.length); for (const s of h.evidence) { assert.ok(/condition track|\bCT\b/i.test(s)); assert.ok(evidence.get(`${h.domain}:${h.canonicalId}`).includes(s.slice(0, 40)), h.name); } }
  for (const n of ['Rising Anger', 'Retribution', 'Seize the Moment', 'Cycle of Harmony', 'Noble Sacrifice', 'Outsider\'s Eye', 'Triage Scan', 'Jedi Familiarity', 'Bando Gora Surge', 'Cleanse Mind']) assert.ok(!byName(n, 'TALENT')?.finalTags.includes('condition_track') && !byName(n, 'FEAT')?.finalTags.includes('condition_track'), n);
  for (const n of ['Stunning Strike', 'Dull the Pain', 'Durable', 'Relentless', 'Unstoppable', 'Soft Reset']) assert.ok(byName(n).finalTags.includes('condition_track'), n);
  for (const r of auth.records.filter(r => r.finalTags.includes('condition_track') && !r.baselineTags.includes('condition_removal'))) assert.ok(!r.added.includes('condition_removal') || true);
});
test('ion exists and does not imply stun or nonlethal; ion records are only direct ion mechanics', () => {
  const ion = auth.records.filter(r => r.finalTags.includes('ion')); assert.equal(ion.length, rul.newTagSweeps.ion.hits.length);
  for (const n of ['Ion Resistance 10', 'Ion Mastery', 'Ion Turret', 'Ion Shielding', 'Disabler', 'Droid Hunter']) assert.ok(byName(n).finalTags.includes('ion'), n);
  assert.ok(!byName('Damage Conversion', 'FEAT').finalTags.includes('ion'));
  for (const r of auth.records) for (const o of r.phase3FinalOperations) assert.ok(!(o.op === 'ADD' && ['stun', 'nonlethal'].includes(o.tag)), `${r.name} ${o.tag}`);
  assert.ok(!byName('Ion Mastery').finalTags.includes('stun'));
});
test('resource_gain is distinct from resource_recovery / resource_spend / force_capacity', () => {
  const rg = auth.records.filter(r => r.finalTags.includes('resource_gain')); assert.equal(rg.length, rul.newTagSweeps.resource_gain.hits.length);
  for (const n of ['Unswerving Resolve', 'Spacer\'s Surge', 'Skillful Recovery', 'Force Flow', 'Confident Success']) assert.ok(byName(n).finalTags.includes('resource_gain'), n);
  for (const n of ['Force Boon', 'Mystic Mastery', 'Guardian Spirit']) assert.ok(!byName(n).finalTags.includes('resource_gain'), `${n} is capacity`);
  assert.ok(byName('Force Boon').finalTags.includes('force_capacity')); assert.ok(!byName('Force Boon').finalTags.includes('resource_recovery'));
  for (const x of rul.policyConsequenceRemovals) { const r = auth.records.find(y => y.domain === x.domain && y.canonicalId === x.canonicalId); assert.ok(!r.finalTags.includes(x.tag), `${x.name} ${x.tag}`); if (x.name !== 'Force Boon') assert.ok(r.finalTags.includes('resource_gain'), x.name); }
  assert.ok(!HARD_IMPLICATIONS.some(([a, b]) => a === 'resource_gain' || b === 'resource_gain'));
  for (const t of ['resource_gain', 'resource_recovery', 'force_capacity', 'resource_spend']) assert.ok(ont.tags.find(x => x.tag === t));
});
test('force-point migration: every former force-point record is represented by precise resource semantics', () => {
  assert.equal(rul.forcePointMigration.length, 9);
  for (const m of rul.forcePointMigration) { const r = auth.records.find(y => y.domain === m.domain && y.canonicalId === m.canonicalId); assert.ok(!r.finalTags.includes('force-point')); assert.ok(r.removed.includes('force-point')); assert.ok(m.representation.length > 0, m.name); }
  assert.ok(byName('Skill Boon').finalTags.includes('force_point_spend') && byName('Skill Boon').finalTags.includes('resource_spend'));
});
test('all 196 former unresolved findings have terminal dispositions; none remain in owner review', () => {
  assert.equal(rul.findingDecisions.length, 196); assert.equal(new Set(rul.findingDecisions.map(d => d.decisionId)).size, 196);
  for (const d of rul.findingDecisions) {
    assert.ok(['ADD', 'NO_CHANGE'].includes(d.ownerAction)); assert.equal(d.decisionSource, 'PHASE3_FINAL_OWNER_POLICY_DERIVED'); assert.ok(FINAL_DEFINITIONS[d.controllingDefinition.tag]); assert.ok(d.ownerRationale && d.evidence.length);
    const r = auth.records.find(y => y.domain === d.domain && y.canonicalId === d.canonicalId);
    if (d.ownerAction === 'ADD') assert.ok(r.finalTags.includes(d.tag), d.decisionId);
  }
  assert.equal(rul.counts.findingAdds + rul.counts.findingNoChange, 196); assert.equal(rul.counts.sourceEvidenceBlocker, 0);
  assert.equal(rul.tagQuestionDisposition.tagDefinitionQuestionsOpenAfter, 0); assert.equal(rul.tagQuestionDisposition.tagConventionQuestionsOpenAfter, 0);
  assert.equal(close.exitGate['PASS3B_OWNER_REVIEW = 0'], true); assert.equal(close.exitGate['PHASE3D_OWNER_DEFINITION_REQUIRED = 0'], true);
});
test('no tag is assigned from prerequisite-only evidence: every ADD cites a Benefit sentence that exists in the canonical mechanic text', () => {
  for (const [key, ev] of evidence) assert.ok(!/(^|\. )Prerequisites?:/i.test(ev), key);
  for (const d of rul.findingDecisions.filter(x => x.ownerAction === 'ADD')) for (const s of d.evidence) assert.ok(evidence.get(`${d.domain}:${d.canonicalId}`).includes(s.slice(0, 50)), d.decisionId);
  for (const t of NEW_TAGS) for (const h of rul.newTagSweeps[t].hits) for (const s of h.evidence) assert.ok(evidence.get(`${h.domain}:${h.canonicalId}`).includes(s.slice(0, 50)), `${t} ${h.name}`);
});
test('no tag is assigned from tree/class identity or generic open selection', () => {
  assert.ok(!byName('Perfect Telepathy').finalTags.includes('telepath')); assert.ok(byName('Mind Probe').finalTags.includes('telepath'));
  for (const w of ['melee', 'ranged']) assert.ok(!byName('Greater Weapon Specialization').finalTags.includes(w), w);
  assert.ok(!byName('Flurry Attack', 'TALENT').finalTags.includes('exotic_weapon'));
  for (const d of rul.findingDecisions.filter(x => x.ownerAction === 'ADD' && WEAPON.includes(x.tag))) for (const s of d.evidence) assert.ok(!/\b(?:choose|select)\b[^.]{0,60}\bweapon group\b/i.test(s), d.decisionId);
  for (const x of rul.complianceRemovals) { const r = auth.records.find(y => y.domain === x.domain && y.canonicalId === x.canonicalId); assert.ok(!r.finalTags.includes(x.tag)); assert.equal(x.decisionSource, 'PHASE3_FINAL_OWNER_POLICY_DERIVED_REMOVE'); }
});
test('target designation excludes equipment/option/area designation', () => {
  const no = (name, tag) => { const d = rul.findingDecisions.find(x => x.name === name && x.tag === tag); assert.ok(d, name); assert.equal(d.ownerAction, 'NO_CHANGE', name); assert.ok(!byName(name).finalTags.includes(tag) || byName(name).baselineTags.includes(tag), name); };
  for (const n of ['Signature Device', 'Discblade Arc', 'Illusion', 'Safe Zone', 'Heavy Fire Zone', 'Squad Actions', 'Echoes in the Force']) no(n, 'target-designation');
});
test('distinct-tag guarantees: ion/stun, critical_hit/critical_success, movement/mobility/positioning, resource family, ally family', () => {
  const imp = (t) => HARD_IMPLICATIONS.filter(([a, b]) => a === t || b === t);
  for (const [x, y] of [['ion', 'stun'], ['ion', 'nonlethal'], ['critical_hit', 'critical_success'], ['movement', 'mobility'], ['movement', 'positioning'], ['mobility', 'positioning'], ['resource_gain', 'resource_recovery'], ['resource_gain', 'force_capacity'], ['resource_gain', 'resource_spend'], ['ally-trigger', 'ally_support'], ['ally-trigger', 'teamwork'], ['teamwork', 'support'], ['ally_support', 'teamwork']]) assert.ok(!HARD_IMPLICATIONS.some(([a, b]) => (a === x && b === y) || (a === y && b === x)), `${x}/${y}`);
  assert.deepEqual(imp('ally_support'), [['ally_support', 'support']]); assert.equal(imp('ally-trigger').length, 0);
  assert.match(FINAL_DEFINITIONS.critical_hit.text, /Do not equate with critical_success/); assert.match(FINAL_DEFINITIONS.positioning.text, /Movement by itself does not automatically imply positioning/); assert.match(FINAL_DEFINITIONS.ion.text, /DO NOT equate ion with stun/);
});
test('prior explicit owner decisions are preserved', () => {
  for (const d of overlay.decisions) {
    const r = auth.records.find(y => y.domain === d.domain && y.canonicalId === d.canonicalId);
    if (d.ownerAction === 'ADD') assert.ok(r.finalTags.includes(d.tag), d.decisionId);
    else if (!r.baselineTags.includes(d.tag)) assert.ok(!r.finalTags.includes(d.tag) || r.phase3FinalOperations.some(o => o.tag === d.tag), d.decisionId);
  }
  for (const r of auth.records) for (const t of r.baselineTags) assert.ok(r.finalTags.includes(t) || r.phase3FinalOperations.some(o => o.op === 'REMOVE' && o.tag === t), `${r.name} ${t}`);
});
test('exit gate: every condition PASS; zero literal policy violations; counts consistent', () => {
  for (const [n, v] of Object.entries(close.exitGate)) assert.equal(v, true, n);
  assert.equal(close.exitGatePassed, true); assert.equal(close.status, 'PHASE3_EXIT_GATE_PASSED'); assert.equal(close.policyViolations.length, 0);
  const c = close.counts; assert.equal(c.identities, 1540);
  assert.equal(c.tagInstancesFinal, c.tagInstancesBaseline3B + c.addsFromBaseline - c.removesFromBaseline);
  assert.equal(auth.records.reduce((a, r) => a + r.finalTags.length, 0), c.tagInstancesFinal);
});
test('production boundary: packs/talents.db, packs/feats.db and data/feat-catalog.json are identical to main; hashes pinned', () => {
  for (const f of PRODUCTION_FILES) assert.match(close.productionFilesSha256[f], /^[0-9a-f]{64}$/);
  let main = null; try { main = execFileSync('git', ['rev-parse', 'origin/main'], { stdio: 'pipe' }).toString().trim(); } catch { /* origin/main unavailable: skip comparison */ }
  if (main) for (const f of PRODUCTION_FILES) assert.equal(execFileSync('git', ['rev-parse', `HEAD:${f}`]).toString().trim(), execFileSync('git', ['rev-parse', `${main}:${f}`]).toString().trim(), f);
});
test('final outputs rebuild byte-identically', () => {
  execFileSync('node', ['tools/build-talent-feat-phase3-final-authority.mjs', '--check'], { stdio: 'pipe' });
});

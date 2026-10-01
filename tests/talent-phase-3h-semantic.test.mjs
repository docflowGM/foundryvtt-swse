import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { classifyTag, vocabulary, ALIASES } from '../tools/talent-semantic-common.mjs';
import { deriveTags, RULES } from '../tools/talent-semantic-rules.mjs';

// Phase 3H: pins the vocabulary authority, the tag census/dispositions, the rule-evidenced authority, the one-way archetype QA and the dry-run.
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const rdText = rel => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const voc = rd('data/canonical/semantic-tag-vocabulary.json'), census = rd('data/audits/talent-phase-3h-metadata-census.json'), auth = rd('data/audits/talent-phase-3h-semantic-authority.json');
const cc = rd('data/audits/talent-phase-3h-archetype-crosscheck.json'), man = rd('data/audits/talent-phase-3h-migration-manifest.json'), rep = rd('data/audits/talent-phase-3h-dry-run-report.json');
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('vocabulary authority: exactly the 57 Phase 11 tags, lower_snake_case, identical to the Phase 11 vocabulary file', () => {
  const p11 = rd('data/audits/archetype-phase-11/SWSE_Archetype_Phase_11_Metadata_Vocabulary.json').tags;
  assert.equal(voc.count, 57); assert.deepEqual(voc.tags, [...p11].sort()); assert.ok(voc.tags.every(t => /^[a-z]+(?:_[a-z]+)*$/.test(t)));
  assert.equal(Object.keys(RULES).length, 57); assert.deepEqual(Object.keys(RULES).sort(), voc.tags);
});
test('census: 1,187 canonical talents (all with certified identity), 50 homebrew reported separately, 430 legacy tags, 250 untagged', () => {
  const c = census.counts; assert.equal(c.canonicalTalents, 1187); assert.equal(c.withCanonicalIdentity, 1187); assert.equal(c.homebrewTalents, 50); assert.equal(census.rows.length, 1187);
  assert.equal(c.uniqueLegacyTags, 430); assert.equal(c.untagged, 250); assert.equal(c.legacyTagsInVocabulary, 32); assert.deepEqual(c.tagShapes, { 'array<string>': 937, 'array<empty>': 248, undefined: 2 });
});
test('tag dispositions: legacy role bias, audit markers and tree labels are never kept as semantics; aliases map only spelling variants', () => {
  for (const t of ['striker', 'controller', 'defender']) assert.equal(classifyTag(t).disposition, 'LEGACY_ARCHETYPE_SCORING');
  for (const t of ['phase-t27-reviewed', 'feat-chain', 'uncategorized_talent']) assert.equal(classifyTag(t).disposition, 'REMOVE_OBSOLETE');
  assert.equal(classifyTag('tree_6ac3416fb6aada56').disposition, 'NON_SEMANTIC_RUNTIME_METADATA'); assert.equal(classifyTag('choice_required').disposition, 'NON_SEMANTIC_RUNTIME_METADATA');
  assert.equal(classifyTag('dark-side').target, 'dark_side'); assert.equal(classifyTag('melee').disposition, 'KEEP_CANONICAL');
  for (const [from, to] of Object.entries(ALIASES)) assert.ok(vocabulary().includes(to), `${from} -> ${to}`);
});
test('authority: every proposed tag is vocabulary-only and rule-evidenced; evidence never cites an archetype or legacy tag', () => {
  assert.equal(auth.counts.canonicalTalents, 1187); assert.equal(auth.rows.length, 1187);
  for (const r of auth.rows) { assert.deepEqual(r.proposed, [...r.proposed].sort()); for (const t of r.proposed) { assert.ok(voc.tags.includes(t)); const e = r.tags.find(x => x.tag === t); assert.ok(e?.evidence.length, `${r.name}: ${t}`); assert.ok(e.evidence.every(x => ['benefit', 'description', 'tree/domain', 'runtime-pin'].includes(x.source))); } }
  const src = fs.readFileSync(new URL('../tools/derive-talent-semantic-authority.mjs', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map(m => m[1]);
  assert.ok(imports.every(f => !/archetype|crosscheck|qa-talent/i.test(f)) && !/Phase_11|archetype-phase-11/.test(src), 'the authority builder must not read archetype data');
});
test('rules are evidence-based, not guessed: no tag from a broad old tag, prerequisite, or role label', () => {
  const t = deriveTags({ benefit: 'You gain a +2 bonus on Stealth checks.', description: '', treeName: 'Awareness' }, voc.tags).map(x => x.tag); assert.deepEqual(t, ['stealth']);
  assert.deepEqual(deriveTags({ benefit: 'You have seen more action than most.', treeName: 'Veteran' }, voc.tags), []);
  const ls = deriveTags({ benefit: 'You may use your lightsaber to make a melee attack.', treeName: 'Lightsaber Forms' }, voc.tags).map(x => x.tag); assert.ok(ls.includes('lightsaber') && ls.includes('melee') && ls.includes('lightsaber_form'));
  assert.ok(!deriveTags({ benefit: 'Moves down the condition track.', treeName: '' }, voc.tags).some(x => x.tag === 'fieldcraft'), 'Condition Track is not tracking');
});
test('real talents: Seen It All is no longer melee+ranged+striker; Deflect/Force Intuition carry rule-supported tags', () => {
  const by = n => auth.rows.find(r => r.name === n);
  assert.deepEqual(by('Seen It All').proposed, []); assert.ok(by('Seen It All').removed.some(x => x.tag === 'striker' && x.disposition === 'LEGACY_ARCHETYPE_SCORING'));
  assert.ok(by('Force Intuition').proposed.includes('initiative') && by('Force Intuition').proposed.includes('use_the_force'));
  assert.ok(by('Devastating Attack').proposed.includes('heavy_weapon'));
});
test('force pin: Force-talent membership is held at today\'s set (executable counting); disagreements are itemised', () => {
  assert.equal(auth.counts.forcePinDisagreements, 227);
  for (const r of auth.rows) assert.equal(r.proposed.includes('force'), r.current.includes('force'), r.name);
});
test('archetype cross-check is one-way: 297 archetypes, 1,144 exact references all resolve, nothing written back', () => {
  assert.equal(cc.archetypes, 297); assert.equal(cc.totals.references, 1144); assert.equal(cc.totals.resolved, 1144); assert.equal(cc.talentTagsMutatedByThisReport, false);
  assert.equal(cc.totals.STRONG + cc.totals.SUPPORTED + cc.totals.NEUTRAL + cc.totals.CONTRADICTION + cc.totals.SUSPICIOUS, 1144);
  assert.ok(cc.findings.filter(f => f.classification === 'CONTRADICTION').every(f => f.inspect.first.startsWith('the talent')));
});
test('exact-reference bridge: all 1,144 Phase 11 talent references resolve tree-aware to canonical UUIDs; same-name references stay distinct', () => {
  const b = rd('data/audits/talent-phase-3h-archetype-exact-reference-bridge.json'), c = b.counts;
  assert.equal(c.references, 1144); assert.equal(c.resolvedToUuid, 1144); assert.equal(c.unresolved, 0); assert.equal(c.malformed, 0); assert.deepEqual([c.nameMismatch, c.treeMismatch, c.sourceMismatch], [0, 0, 0]); assert.equal(b.problems.length, 0);
  assert.ok(b.references.every(r => /^Compendium\.foundryvtt-swse\.talents\.Item\.[0-9a-f]+$/.test(r.uuid))); assert.equal(c.sameNameTreeAware, 57);
  const byIdentityId = new Map(); for (const r of b.references) byIdentityId.set(r.identity, r.talentId);
  const same = b.references.filter(r => r.sameNameAcrossTrees); assert.ok(same.length === 57); assert.ok(new Set(same.map(r => r.talentId)).size >= 15);
});
test('convergence contract and seam audit exist; vocabulary is described as certified project vocabulary, not published canon', () => {
  assert.ok(rdText('docs/audits/talent-phase-3h-convergence-contract.md').includes('CERTIFIED') === false && rdText('docs/audits/talent-phase-3h-convergence-contract.md').includes('Certified shared semantic vocabulary'));
  assert.ok(rdText('docs/audits/talent-phase-3h-archetype-seam-audit.md').includes('class-archetypes.json'));
  assert.ok(voc.rules.some(r => r.includes('CERTIFIED SHARED SEMANTIC VOCABULARY, not published SWSE canon')));
});
test('dry-run certified: 1,168 records, one leaf each (system.tags), exact consumer probes identical, deltas reported for owner decision', () => {
  assert.equal(rep.status, 'DRY_RUN_CERTIFIED'); assert.equal(rep.dryRun, true); assert.ok(rep.verification.results.every(x => x.ok));
  assert.equal(rep.counts.recordsToChange, 1168); assert.equal(man.rows.length, 1168); assert.ok(man.rows.every(r => r.path === 'system.tags'));
  assert.equal(rep.counts.productionLeafChanges, 1168); assert.equal(rep.counts.tagElementMutations, rep.counts.tagsAdded + rep.counts.tagsRemoved + rep.counts.aliasesNormalized);
  assert.equal(rep.executableConsumerImpact.exactProbesIdentical, true); assert.ok(rep.executableConsumerImpact.prerequisiteTreeCreditByTag.talentsAffected > 0);
});
test('state-appropriate gate passes (dry-run freshness while the pack is pre-3H)', () => {
  const r = spawnSync(process.execPath, ['tools/apply-talent-phase-3h.mjs', '--check'], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr);
});
console.log(`talent-phase-3h-semantic: ${n} checks passed`);

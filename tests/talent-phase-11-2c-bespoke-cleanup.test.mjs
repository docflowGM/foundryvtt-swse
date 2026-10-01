import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Phase 11-2C: pins the completed BESPOKE tag adjudication (canonical talents, system.tags only).
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const nd = rel => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const adj = rd('data/audits/archetype-phase-11-2/bespoke-adjudication.json'), man = rd('data/audits/talent-phase-11-2c-cleanup-manifest.json'), rep = rd('data/audits/talent-phase-11-2c-dry-run-report.json');
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const NORMALIZE = { 'standard-action': 'standard_action', heavy_weapons: 'heavy_weapon', 'force-power': 'force_power', flanked: 'flanking', 'galactic-lore': 'galactic_lore', 'search-your-feelings': 'search_your_feelings', 'damage-threshold': 'damage_threshold', 'dark-side-score': 'dark_side_score', 'opposed-check': 'opposed_check' };
const PROMOTE = ['attack_of_opportunity', 'command', 'critical_success', 'damage_threshold', 'dark_side_score', 'detection', 'double_weapon', 'entangle', 'exotic_weapon', 'feint', 'fighting_defensively', 'flanking', 'force_power', 'full_attack', 'galactic_lore', 'improvised_weapon', 'meditation', 'modification', 'movement', 'opposed_check', 'pistol', 'planning', 'reliability', 'restrain', 'ride', 'search_your_feelings', 'skill_mastery', 'spellcasting', 'surprise_round', 'weapon_specialization', 'weapon_training'];

test('action table: 33 tree-id aliases + 33 structural + 8 source-reviewed deletions; nine exact normalizations; 31 promoted concepts', () => {
  assert.equal(adj.actions.deleteTreeIdAliases.length, 33); assert.ok(adj.actions.deleteTreeIdAliases.every(t => /^tree_[0-9a-f]+$/.test(t)));
  assert.equal(adj.actions.deleteStructuralClassTreeImplementation.length, 33); assert.equal(adj.actions.deleteDecomposeSourceReviewed.length, 8);
  assert.deepEqual(adj.actions.safeNormalize, NORMALIZE); assert.deepEqual(adj.actions.promoteBespokeToKeep, PROMOTE);
  assert.deepEqual(man.actions.normalize, NORMALIZE); assert.equal(Object.keys(man.actions.remove).length, 74);
  for (const t of ['control', 'leadership', 'dark_side']) assert.ok(!man.actions.remove[t], `${t} is a semantic concept and must survive`);
});
test('state-aware: force_item (removed in 11-2B) is not recreated; critical_success retained; no BESPOKE tag left undecided', () => {
  assert.deepEqual(man.bespokeAlreadyResolvedBefore11_2C, ['force_item']); assert.ok(PROMOTE.includes('critical_success'));
  assert.ok(!man.actions.remove.force_item && !man.actions.normalize.force_item);
});
test('dry-run certified: 54 records, 74 removed, 9 renamed; raw tags 260 -> 184; instances 5,302 -> 5,228; empty arrays 309 -> 309; no tree_* tag left', () => {
  assert.equal(rep.status, 'DRY_RUN_CERTIFIED'); assert.ok(rep.verification.results.every(x => x.ok));
  assert.deepEqual([rep.counts.recordsChanged, rep.counts.tagElementsRemoved, rep.counts.tagElementsNormalized, rep.counts.duplicateTargetsAvoided], [54, 74, 9, 0]);
  assert.deepEqual([rep.counts.rawTagsBefore, rep.counts.rawTagsAfter, rep.counts.tagInstancesBefore, rep.counts.tagInstancesAfter, rep.counts.emptyTagArraysBefore, rep.counts.emptyTagArraysAfter], [260, 184, 5302, 5228, 309, 309]);
  assert.equal(rep.counts.treeUnderscoreTagsRemaining, 0); assert.equal(rep.runtimeConsumers.exactProbesIdentical, true);
  assert.ok(Object.keys(rep.postCensus.byTag).every(k => !k.startsWith('tree_')));
});
test('every promoted KEEP concept keeps its members; no replacement or decomposition tag was bulk-added', () => {
  const pre = rd('data/audits/talent-phase-11-2b-dry-run-report.json').postCensus.byTag, post = rep.postCensus.byTag, targets = new Set(Object.values(NORMALIZE));
  for (const k of PROMOTE) if (!targets.has(k)) assert.equal(post[k], pre[k], k);
  for (const k of Object.keys(post)) if (post[k] > (pre[k] ?? 0)) assert.ok(targets.has(k), `${k} grew outside normalization`);
  for (const k of ['ally_support', 'reaction', 'movement', 'recovery', 'melee', 'support', 'control']) assert.equal(post[k], pre[k], `${k} must not receive decomposition guidance`);
});
test('state-appropriate gate passes; the applied pack carries none of the rejected strings; homebrew untouched', () => {
  const st = spawnSync(process.execPath, ['tools/apply-talent-phase-11-2c.mjs', '--status'], { encoding: 'utf8' }); const state = (st.stdout + st.stderr).trim().split(' ').pop();
  const r = spawnSync(process.execPath, ['tools/apply-talent-phase-11-2c.mjs', ...(state === 'POST_11_2C' ? ['--verify', '--exact'] : ['--check'])], { encoding: 'utf8' }); assert.equal(r.status, 0, state + r.stdout + r.stderr);
  if (state === 'POST_11_2C') { const bad = new Set([...Object.keys(NORMALIZE), ...Object.keys(man.actions.remove)]); assert.ok(nd('packs/talents.db').every(t => (t.system.tags ?? []).every(x => !bad.has(x) && !x.startsWith('tree_')))); assert.equal(nd('packs/talents-homebrew.db').length, 50); }
});
console.log(`talent-phase-11-2c-bespoke-cleanup: ${n} checks passed`);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Phase 11-2B: pins the execution of the certified Phase 11-2 RECONSIDER tag actions (canonical talents, system.tags only).
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const nd = rel => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const man = rd('data/audits/talent-phase-11-2b-cleanup-manifest.json'), rep = rd('data/audits/talent-phase-11-2b-dry-run-report.json');
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

const NORMALIZE = { 'action-economy': 'action_economy', 'light-side': 'light_side', 'force-offense': 'force_offense', 'damage-reduction': 'damage_reduction', 'force-control': 'force_control', 'condition-removal': 'condition_removal', 'force-defense': 'force_defense', 'burst-damage': 'burst_damage', 'dual-wield': 'dual_wield', 'precision-damage': 'precision_damage', 'use-computer': 'use_computer', 'self-repair': 'self_repair', 'use-the-force': 'use_the_force', 'ally-support': 'ally_support', 'critical-success': 'critical_success', 'swift-action': 'swift_action',
  'battlefield-control': 'battlefield_control', follower: 'followers', 'sustained-damage': 'sustained_damage', 'dark-side': 'dark_side', gear: 'equipment', 'heavy-weapons': 'heavy_weapon', sniping: 'sniper', piloting: 'pilot', skill_stealth: 'stealth', 'force-support': 'force_support', shield: 'shields' };
const ROLE_DELETE = ['striker', 'jedi', 'scout', 'scoundrel', 'soldier', 'noble', 'mystic', 'hunter', 'bounty-hunter', 'duelist', 'opportunist', 'imperial', 'force-hunter', 'outlaw', 'force-adept', 'inquisitor', 'veteran'];
const HOLD = ['controller', 'defender', 'leader'];
const CATEGORY = ['category_force_adept', 'category_sith_apprentice', 'category_imperial_knight', 'category_improviser', 'category_pathfinder', 'category_shaper', 'category_assassin', 'category_medic', 'category_outlaw', 'category_vanguard', 'category_corporate_agent', 'category_enforcer', 'category_independent_droid', 'category_charlatan'];
const STRUCT = ['force-tradition', 'jedi-guardian', 'imperial-knight', 'lightsaber-combat', 'dark_side_mastery', 'pathfinder', 'infamy', 'martial', 'law_enforcement', 'law-enforcement', 'bothan-spynet', 'spynet', 'believer-disciple', 'guardian_spirit', 'iron-knight', 'bando-gora-captain', 'elite-droid', 'independent-droid', 'krath', 'order-of-shasa', 'sith_alchemy', 'akk-dog', 'genohardan', 'unknown-regions'];
const CONCEPT = ['force_execution', 'new_action', 'combat', 'utility', 'encounter', 'ranged_support', 'social_control', 'slicer', 'superior-skills', 'intelligence', 'immersion', 'intel', 'white_current'];
const FORCE_ITEM = ['force-item', 'force_item'];
const KEEP = ['positioning', 'skills', 'battlefield_control', 'martial_arts', 'beast_companion', 'minion', 'social_network', 'followers', 'lightsaber_polearm', 'network', 'force_capacity', 'scaling', 'force_power_synergy', 'recovery', 'resilience', 'senses', 'ability_enhancement', 'durability', 'force_multiplier', 'empowerment', 'force_support', 'resources', 'manipulation', 'grab', 'dual_wield', 'setup'];

test('the action table equals the owner-specified lists exactly (27 normalizations; 73 removals incl. HOLD_NOISY_MAPPING and both force-item spellings)', () => {
  assert.deepEqual(man.actions.normalize, NORMALIZE);
  assert.deepEqual(Object.keys(man.actions.remove).sort(), [...ROLE_DELETE, ...HOLD, ...CATEGORY, ...STRUCT, ...CONCEPT, ...FORCE_ITEM].sort());
  assert.deepEqual(man.actions.holdNoisyMapping, { controller: 'control', defender: 'defense', leader: 'leadership' });
  for (const k of HOLD) assert.equal(man.actions.remove[k], 'HOLD_NOISY_MAPPING');
  for (const k of [...CATEGORY, ...FORCE_ITEM]) assert.equal(man.actions.remove[k], 'DELETE_DECOMPOSE');
  for (const k of KEEP) assert.ok(!man.actions.remove[k] && !man.actions.normalize[k], `${k} must be untouched`);
});
test('dry-run certified: 905 records, 2,422 removed, 726 renamed, 39 duplicates avoided; raw tags 356 -> 260; empty arrays 250 -> 309', () => {
  assert.equal(rep.status, 'DRY_RUN_CERTIFIED'); assert.ok(rep.verification.results.every(x => x.ok));
  assert.deepEqual([rep.counts.recordsChanged, rep.counts.tagElementsRemoved, rep.counts.tagElementsNormalized, rep.counts.duplicateCanonicalTagsAvoided], [905, 2422, 726, 39]);
  assert.deepEqual([rep.counts.rawTagsBefore, rep.counts.rawTagsAfter, rep.counts.emptyTagArraysBefore, rep.counts.emptyTagArraysAfter], [356, 260, 250, 309]);
  assert.equal(rep.counts.tagInstancesBefore - rep.counts.tagInstancesAfter, 2422 + 39);
  assert.equal(rep.runtimeConsumers.exactProbesIdentical, true);
});
test('no replacement is auto-added: control / defense / leadership and every decomposition guidance tag gain no member except by exact normalization', () => {
  const post = rep.postCensus.byTag, pre = rd('data/audits/talent-phase-11-2a-dry-run-report.json').postCensus.byTag;
  for (const k of ['control', 'defense', 'leadership']) assert.equal(post[k], pre[k], k);
  for (const k of Object.keys(post)) if (post[k] > (pre[k] ?? 0)) assert.ok(Object.values(NORMALIZE).includes(k), `${k} grew without being a normalization target`);
});
test('manifest rows: renames in place, survivors keep order, nothing invented', () => {
  for (const r of man.rows) {
    const expected = []; for (const x of r.before) { if (man.actions.remove[x]) continue; const t = man.actions.normalize[x]; if (t) { if (!r.before.includes(t) && !expected.includes(t)) expected.push(t); continue; } expected.push(x); }
    assert.deepEqual(r.after, expected, r.name);
  }
});
test('BESPOKE untouched except the certified alias target critical_success and the explicitly named force_item', () => {
  assert.deepEqual(rep.counts.bespokeTargetsThatGrew, [{ tag: 'critical_success', before: 1, after: 2 }]); assert.deepEqual(rep.counts.bespokeRemovedByExplicitOwnerResolution, [{ tag: 'force_item', before: 1, after: 0 }]);
});
test('state-appropriate gate passes; the applied pack carries none of the rejected strings; homebrew untouched', () => {
  const st = spawnSync(process.execPath, ['tools/apply-talent-phase-11-2b.mjs', '--status'], { encoding: 'utf8' }); const state = (st.stdout + st.stderr).trim().split(' ').pop();
  const r = spawnSync(process.execPath, ['tools/apply-talent-phase-11-2b.mjs', ...(state === 'POST_11_2B' ? ['--verify', '--exact'] : ['--check'])], { encoding: 'utf8' }); assert.equal(r.status, 0, state + r.stdout + r.stderr);
  if (state === 'POST_11_2B') { const bad = new Set([...Object.keys(NORMALIZE), ...Object.keys(man.actions.remove)]); assert.ok(nd('packs/talents.db').every(t => (t.system.tags ?? []).every(x => !bad.has(x)))); assert.equal(nd('packs/talents-homebrew.db').length, 50); }
});
console.log(`talent-phase-11-2b-reconsider-cleanup: ${n} checks passed`);

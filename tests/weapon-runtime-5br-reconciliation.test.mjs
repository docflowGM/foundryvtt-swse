import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { applyCompletenessAmendments, AMENDMENT_IDS } from '../tools/lib/item-weapons-phase-3b-amendments.mjs';
import { evaluateCondition, policyFor, registeredConditionKeys } from '../scripts/items/weapon-runtime/condition-policy.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
execFileSync('node', ['tools/build-weapon-phase-5b-r-reconciliation.mjs', '--check'], { cwd: ROOT });
const b3 = read('data/audits/item-weapons-phase-3b-canonical-authority.json');
const h4 = read('data/audits/item-weapons-phase-4h-global-semantic-authority.json');
const modes = read('data/audits/weapon-phase-5b-r-mode-reconciliation.json');
const conds = read('data/audits/weapon-phase-5b-r-condition-policy-census.json');

// ---- authority amendment policy ---------------------------------------------------------------------------------------
assert.equal(b3.identities.length, 203);
assert.equal(h4.counts.categoryRecords, 204); assert.equal(h4.counts.uniqueIdentities, 203);
assert.deepEqual(b3.completenessAmendments.map((a) => a.id), AMENDMENT_IDS);
for (const a of b3.completenessAmendments) assert.equal(a.schemaShapeChange, false);
assert.deepEqual([...new Set(b3.completenessAmendments.map((a) => a.identityKey))].sort(), ['unmapped::Amphistaff', 'unmapped::Atlatl', 'unmapped::Cesta', 'unmapped::Shock Stick', 'unmapped::Vibrobayonet', 'weapon-gungan-electropole']);
// semantic rulings unchanged (pinned to the committed 605e170 values)
const semSha = crypto.createHash('sha256').update(JSON.stringify(h4.records.map((r) => [r.identityKey, r.categories, r.semantic]))).digest('hex');
assert.equal(semSha, '87a725852a92156fbd609c208f7ec39cf5e83f1b6e7910c554482797bf99c70b', 'semantic tags/categories must not change in 5B-R');
// schema shape unchanged: identity key set, canonicalStats key set and attack-profile key set are uniform across all 203 identities
const union = (f) => crypto.createHash('sha256').update(JSON.stringify([...new Set(b3.identities.flatMap(f))].sort())).digest('hex').slice(0, 16);
// fixed-schema containers keep exactly the committed 605e170 key sets (pins computed from HEAD before the amendments)
assert.equal(union((i) => Object.keys(i)), '691aea2d574dc5eb', 'identity record key set');
assert.equal(union((i) => Object.keys(i.canonicalStats)), 'b96439ade50c7491', 'canonicalStats key set');
assert.equal(union((i) => i.canonicalStats.attackProfiles.flatMap((p) => Object.keys(p))), '1dff420b0b9c546d', 'attackProfile key set');
assert.equal(union((i) => i.canonicalStats.attackProfiles.flatMap((p) => Object.keys(p.schemaFamily))), '6942a444ee4c7d86', 'schemaFamily key set');
assert.equal(union((i) => (i.canonicalStats.configurationStates ?? []).flatMap((p) => Object.keys(p))), 'a28fbbcbdd589fcf', 'configurationStates element key set');
// the amended identities' non-amended identities are unchanged: Phase 4 category record count and 3B counts hold
assert.equal(b3.counts.uniqueCanonicalIdentities, 203); assert.equal(b3.counts.certifiedSourceClaims, 209);

// ---- amendment pre-conditions fail closed -------------------------------------------------------------------------------
assert.throws(() => applyCompletenessAmendments([]), /pre-condition failed/);
const clone = (x) => JSON.parse(JSON.stringify(x));
const pre = clone(b3.identities); // already amended => placeholder pre-conditions no longer hold
assert.throws(() => applyCompletenessAmendments(pre), /pre-condition failed/);

// ---- typed reconciliation ----------------------------------------------------------------------------------------------
assert.equal(modes.counts.unresolved, 0);
assert.equal(modes.counts.previouslyUnmatchedModes, 13); assert.equal(modes.counts.previouslyUnmatchedIdentities, 7);
const expect = {
  'unmapped::Amphistaff/spear': 'CONFIGURATION', 'unmapped::Amphistaff/whip': 'CONFIGURATION', 'unmapped::Amphistaff/venom-spit': 'SPECIAL_ACTION',
  'unmapped::Atlatl/launcher': 'ATTACK_PROFILE', 'unmapped::Cesta/launcher': 'ATTACK_PROFILE',
  'weapon-gungan-electropole/gungan-alternate-proficiency': 'PROFICIENCY_ROUTE',
  'unmapped::Shock Stick/handheld': 'CONFIGURATION', 'unmapped::Shock Stick/mounted-bayonet': 'CONFIGURATION',
  'unmapped::Vibrobayonet/detached': 'CONFIGURATION', 'unmapped::Vibrobayonet/mounted-on-rifle': 'CONFIGURATION',
  'weapon-plx-2m-portable-missile-launcher/direct': 'OPERATING_MODE', 'weapon-plx-2m-portable-missile-launcher/heat-seeking': 'OPERATING_MODE', 'weapon-plx-2m-portable-missile-launcher/gravity-activated': 'OPERATING_MODE',
};
for (const m of modes.previouslyUnmatchedModes) {
  assert.equal(m.classification, expect[`${m.identity}/${m.mode}`], `${m.identity}/${m.mode}`);
  assert.equal(m.authorityComplete, true); assert.equal(m.executableNow, true); assert.ok(m.futureConsumer && m.reason);
}
assert.equal(Object.keys(expect).length, 13);
// no PLX / Shock Stick / Vibrobayonet attack-profile duplication
const byKey = Object.fromEntries(b3.identities.map((i) => [i.identityKey, i]));
assert.equal(byKey['weapon-plx-2m-portable-missile-launcher'].canonicalStats.attackProfiles.length, 1);
assert.equal(byKey['unmapped::Shock Stick'].canonicalStats.attackProfiles.length, 1);
assert.equal(byKey['unmapped::Vibrobayonet'].canonicalStats.attackProfiles.length, 1);
// payloads own launcher damage; melee damage is never copied into the launcher
for (const k of ['unmapped::Atlatl', 'unmapped::Cesta']) {
  const l = byKey[k].canonicalStats.attackProfiles.find((p) => p.id === 'launcher');
  assert.equal(l.damage.mode, 'varies-by-payload');
  assert.equal(byKey[k].canonicalStats.payloadProfiles[0].damage.formula, '2d8');
  assert.deepEqual(byKey[k].canonicalStats.ammo.scopedToAttackProfiles, ['launcher']);
}
assert.equal(byKey['unmapped::Cesta'].canonicalStats.attackProfiles.find((p) => p.id === 'launcher').qualities.accurate, true);
assert.equal(byKey['unmapped::Atlatl'].canonicalStats.attackProfiles.find((p) => p.id === 'launcher').qualities.accurate, false);

// ---- hybrid condition policy -------------------------------------------------------------------------------------------
assert.equal(conds.EXECUTABLE_CANONICAL_CONDITIONS_WITH_POLICY_UNSUPPORTED, 0);
assert.equal(conds.counts.UNSUPPORTED, 0);
assert.equal(conds.counts.AUTO + conds.counts.PROMPT, conds.counts.distinctConditionValues);
for (const r of conds.conditions) { assert.ok(['AUTO', 'PROMPT'].includes(r.policy)); assert.ok(r.predicate, JSON.stringify(r.value)); }
// AUTO: deterministic from structured state, no prompt
assert.deepEqual(evaluateCondition('two-handed', { wieldedHands: 2 }), { policy: 'AUTO', value: true, pending: [] });
assert.equal(evaluateCondition('two-handed', { wieldedHands: 1 }).value, false);
assert.equal(evaluateCondition({ type: 'range-band', equals: 'short' }, { rangeBand: 'short' }).value, true);
assert.equal(evaluateCondition('target smaller than Huge', { targetSizeRank: 4 }).value, true);
assert.equal(evaluateCondition('wielder is Gungan and has Weapon Proficiency (simple weapons)', { species: 'Gungan', proficiencyGroups: ['simple'] }).value, true);
assert.equal(evaluateCondition('critical-hit', { events: ['critical-hit'] }).value, true);
// missing deterministic context degrades to a PROMPT, never a silent true/false
const missing = evaluateCondition('two-handed', {});
assert.equal(missing.policy, 'PROMPT'); assert.equal(missing.value, null); assert.equal(missing.pending[0].promptId, 'context:wieldedHands');
// PROMPT: canonical wording shown, answer stored once in the workflow context
const q = evaluateCondition('host-rifle-stock-folded', {});
assert.equal(q.policy, 'PROMPT'); assert.equal(q.pending[0].text, 'host-rifle-stock-folded');
assert.equal(evaluateCondition('host-rifle-stock-folded', { answers: { 'host-rifle-stock-folded': true } }).value, true);
assert.equal(evaluateCondition('host-rifle-stock-folded', { answers: { 'host-rifle-stock-folded': false } }).pending.length, 0);
// never parse prose: an unregistered/paraphrased string is UNSUPPORTED, not inferred
assert.equal(policyFor('target is smaller than Huge').policy, 'UNSUPPORTED');
assert.equal(evaluateCondition('wielder is a Gungan with simple weapons proficiency', { species: 'Gungan' }).policy, 'UNSUPPORTED');
assert.equal(evaluateCondition('totally made up', {}).value, null);
assert.ok(registeredConditionKeys().length >= conds.counts.distinctConditionValues);
console.log('weapon-runtime-5br-reconciliation: ok');

/**
 * Weapon Branch/Family Coherence Hotfix
 *
 * Math Integrity Freeze, Batch 2B ("Bluebolt" defect). Confirmed root
 * cause: template.json's weapon schema defaults `meleeOrRanged` to
 * "melee" and `ranged` to `false` for ANY weapon document whose source
 * data omits those fields. A full pack scan found `meleeOrRanged` absent
 * on 100% of shipped weapon records (744/744) -- it is never authored
 * anywhere in this repository's real data, so every purchase, drag-drop,
 * or plain read of a live weapon Document gets those two fields
 * schema-defaulted, unconditionally, regardless of the weapon's real
 * `weaponCategory` (which DOES hold a reliable, always-authored literal
 * "melee"/"ranged" value on 100% of records). This is the confirmed origin
 * of Gar'ee's real Bluebolt Blaster Pistol showing `meleeOrRanged:"melee"`
 * alongside `weaponCategory:"ranged"`.
 *
 * template.json cannot itself carry conditional logic, so this hook
 * corrects the contradiction at the one boundary that can: immediately
 * before a weapon Item is created or updated. It never rewrites the
 * high-trust, deliberately-authored fields (weaponCategory, proficiency,
 * subcategory, category) that are the actual evidence -- only the
 * low-trust, schema-defaultable ones (meleeOrRanged, the legacy `ranged`
 * boolean), and it fills `attackAttribute` from the branch default ONLY
 * when the field is genuinely absent, preserving any explicit value
 * (including one that intentionally differs from the branch default)
 * verbatim. See scripts/items/weapon-branch-resolver.js.
 *
 * This is a defense-in-depth companion to every read-time consumer being
 * repointed onto the same canonical resolver directly (so no consumer
 * actually depends on this hook having run first) -- it exists so newly
 * materialized and edited weapons stop PERSISTING the contradiction in the
 * first place, and so an already-corrupted item (like Gar'ee's real
 * Bluebolt) self-heals on its next legitimate edit without a migration.
 */

import { normalizeWeaponForWrite } from '/systems/foundryvtt-swse/scripts/items/weapon-branch-resolver.js';

let registered = false;

// Batch 2B correction #2: an independent review found this hook had the
// exact same defect the item-sheet save path had -- it flattened
// document.system + data.system into one blob BEFORE normalizing, so a
// sparse API/macro-level update (e.g. `item.update({system: {meleeOrRanged:
// "melee"}})`, touching branch only) could have its explicit branch intent
// silently outvoted by a stale, merely-carried-over family field from the
// item's PRIOR state. normalizeWeaponForWrite() now receives document.system
// (current) and data.system (only the keys THIS update actually submitted)
// separately, so it can tell deliberate intent apart from stale carryover
// exactly like the item-sheet path does. This also now diffs and propagates
// every field the normalizer can touch (previously only meleeOrRanged/
// ranged/attackAttribute were diffed -- weaponCategory/subcategory/category/
// proficiency corrections were silently computed and then discarded).
const DIFFED_FIELDS = [
  'meleeOrRanged', 'weaponCategory', 'ranged',
  'subcategory', 'category', 'proficiency', 'weaponGroup', 'group',
  'rangeProfile', 'weaponType', 'attackAttribute'
];

function correctedFields(document, data) {
  const currentSystem = document?.system ?? {};
  const submittedSystem = data?.system ?? {};
  const before = { ...currentSystem, ...submittedSystem };
  const after = normalizeWeaponForWrite(currentSystem, submittedSystem);
  const fields = {};
  for (const field of DIFFED_FIELDS) {
    if (!(field in after)) continue;
    if (after[field] !== before[field]) fields[field] = after[field];
  }
  return Object.keys(fields).length ? fields : null;
}

export function registerWeaponBranchCoherenceHotfix() {
  if (registered) return false;
  registered = true;

  Hooks.on('preCreateItem', (document, data, _options, _userId) => {
    if (document?.type !== 'weapon') return;
    const fields = correctedFields(document, data);
    if (fields) document.updateSource?.({ system: fields });
  });

  Hooks.on('preUpdateItem', (document, data, _options, _userId) => {
    if (document?.type !== 'weapon') return;
    if (!data?.system) return;
    const fields = correctedFields(document, data);
    if (fields) foundry.utils.mergeObject(data, { system: fields }, { insertKeys: true });
  });

  return true;
}

export default registerWeaponBranchCoherenceHotfix;

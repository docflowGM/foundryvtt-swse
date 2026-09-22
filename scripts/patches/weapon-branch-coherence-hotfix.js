/**
 * Weapon Branch/Family Coherence Hotfix
 *
 * Math Integrity Freeze, Batch 2B ("Bluebolt" defect). Confirmed root
 * cause: template.json's weapon schema defaults `meleeOrRanged` to
 * "melee" and `ranged` to `false` for ANY weapon document whose source
 * data omits those fields. A full, deduplicated pack scan found
 * `meleeOrRanged` absent on 100% of shipped weapon-type records checked --
 * 193 unique standalone weapon-catalog records (across packs/weapons*.db)
 * plus 5,766 actor-embedded weapon items (NPC/heroic/nonheroic/droid packs),
 * 5,959 total -- it is never authored anywhere in this repository's real
 * data, so every purchase, drag-drop, or plain read of a live weapon
 * Document gets those two fields schema-defaulted, unconditionally,
 * regardless of the weapon's real `weaponCategory` (which DOES hold a
 * reliable, always-authored literal "melee"/"ranged" value on 100% of
 * standalone records). This is the confirmed origin of Gar'ee's real
 * Bluebolt Blaster Pistol showing `meleeOrRanged:"melee"` alongside
 * `weaponCategory:"ranged"`.
 *
 * template.json cannot itself carry conditional logic, so this hook
 * corrects the contradiction at the one boundary that can: immediately
 * before a weapon Item is created or updated. See
 * scripts/items/weapon-branch-resolver.js for the full field contract and
 * `normalizeWeaponForWrite()`'s precedence rules; the summary as of Batch
 * 2B correction #3:
 *
 * READ-TIME AUTHORITY: existing legacy/source data is interpreted
 * tolerantly by `resolveWeaponBranchFamily()`, which never mutates
 * anything -- safe to call against un-migrated pack data at any time.
 *
 * WRITE-TIME AUTHORITY: `normalizeWeaponForWrite()` DOES intentionally
 * reconcile the full persisted schema for coherence -- `weaponCategory`
 * (kept as a pure branch mirror), `subcategory`/`category`/`proficiency`
 * (the family and its aliases), `meleeOrRanged`/`ranged`, and
 * `rangeProfile`/`weaponType` can all be normalized when they disagree
 * with the resolved branch. This is a deliberate change from Batch 2B's
 * original round (which only touched the low-trust `meleeOrRanged`/
 * `ranged` pair) -- an independent review (correction) found that leaving
 * `weaponCategory`/`proficiency`/`subcategory`/`category` untouched let a
 * stale, contradictory family value survive an explicit branch change.
 *
 * CREATE PROVENANCE (`preCreateItem`, below): only the raw `data.system`
 * the caller actually supplied counts as authored intent. By hook time,
 * Foundry has already merged that payload onto template.json's schema, so
 * `document.system` contains fabricated defaults (e.g. `attackAttribute:
 * "str"`) for any field the caller never authored -- never genuine prior
 * player state, since no prior state exists for a brand-new document.
 *
 * UPDATE PROVENANCE (`preUpdateItem`, below): `document.system` IS genuine,
 * previously-persisted state; `data.system` is the sparse delta this
 * specific update actually submits. `attackAttribute` is filled from the
 * branch default ONLY when genuinely absent (by either provenance rule
 * above); an explicit value, including one that intentionally differs from
 * the branch default, is always preserved verbatim.
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

function correctedFields(currentSystem, submittedSystem, before) {
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
    // Batch 2B correction #3: by the time preCreateItem fires, Foundry has
    // already constructed `document` by merging `data` onto template.json's
    // schema defaults -- so document.system contains fields like
    // attackAttribute:"str" the RAW creation payload never authored, purely
    // because the DataModel had to fill something in. There is no genuine
    // PRIOR persisted state for a brand-new document (unlike preUpdateItem,
    // where document.system really was saved earlier), so document.system
    // must never be treated as "current/authored" state here -- only
    // data.system (the caller's actual payload) is genuine submitted
    // intent. Passing an empty currentSystem is what lets
    // normalizeWeaponForWrite()'s "fill attackAttribute only when genuinely
    // absent" check see a truly-omitted field as absent, instead of
    // mistaking the template's fabricated default for an explicit choice
    // (the same provenance class of defect the original Bluebolt bug was).
    const submittedSystem = data?.system ?? {};
    const fields = correctedFields({}, submittedSystem, document?.system ?? {});
    if (fields) document.updateSource?.({ system: fields });
  });

  Hooks.on('preUpdateItem', (document, data, _options, _userId) => {
    if (document?.type !== 'weapon') return;
    if (!data?.system) return;
    // For an UPDATE, document.system is real, previously-persisted state --
    // never a fabricated default -- so it is the genuine "current" side.
    const currentSystem = document?.system ?? {};
    const submittedSystem = data.system;
    const before = { ...currentSystem, ...submittedSystem };
    const fields = correctedFields(currentSystem, submittedSystem, before);
    if (fields) foundry.utils.mergeObject(data, { system: fields }, { insertKeys: true });
  });

  return true;
}

export default registerWeaponBranchCoherenceHotfix;

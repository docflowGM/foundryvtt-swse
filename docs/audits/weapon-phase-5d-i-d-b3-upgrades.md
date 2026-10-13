# Phase 5D-I-D-B3 — weapon-side upgrade compatibility

Scope: `upgradeRestrictions`, `surveillanceTaggerCompatible`, `surveillanceTaggerCompatibility`, `redirectionCrystalCompatibility`.
Existing authorities retained: `UpgradeEligibilityEngine` (via `CustomizationWorkflow`), `UpgradeService.applyUpgrade`, `InstallRemoveEngine`. No second upgrade engine; the Equipment Modification Convergence refactor is NOT started.

## Change
- New read-only module `scripts/items/weapon-runtime/upgrade-compat.js`: normalizes upgrade keys (`rapid-recycler` == `rapid_recycler`), reads `operation.upgradeRestrictions` and accepted payload capabilities, resolves a weapon Item's canonical operation by identity (never by name; a legacy/custom weapon declares nothing — unknown is not a refusal).
- `UpgradeEligibilityEngine.canInstallUpgrade` consults it for weapon/blaster items after the category match and before slot/cost: `weapon_restriction:<key>` or `weapon_incompatible:<capability>`. `UpgradeService.applyUpgrade` and `InstallRemoveEngine.previewInstall` already gate on that result, so the refusal precedes any cost or write.

## Review corrections (round 1)
1. **Production category mismatch.** Production weapons carry `system.category: 'weapon'`; catalog entries such as the Rapid Recycler declare `appliesTo: ['blaster']`, so the real Sniper Blaster Rifle was refused with `category_mismatch` before the canonical rule was reached. `canonicalWeaponStateOf` now classifies a canonical weapon as a catalog blaster from its **weapon-family selectors** (a family id token `blaster` / `microblaster` / `longblaster`, e.g. `weapon-family:blaster-pistol`, `weapon-family:e-web-repeating-blaster`). Names, descriptions, weapon group and "is ranged" are never read: Darter, slugthrowers, bowcaster, vibroblade and the ion / sonic / disruptor weapons whose families do not say blaster stay non-blasters (44 of 203 identities are blasters). This is a classification choice made on the established selector vocabulary; it is conservative (a weapon not classified is exactly as before) and is flagged for the reviewer.
   - Side effect on the same boundary: blaster-only catalog upgrades are now visible (and, where they apply, installable) on canonical production blasters, and `requires: ['ranged_energy']` is satisfied for canonical blasters (their `weaponType` is `rifles` / `pistols`, which never contained `ranged`).
2. **Fail closed.** `canonicalWeaponStateOf` returns `legacy` (no identity declared: nothing asserted), `canonical`, or `unresolved` (identity declared but unknown stamp / registry not loaded, mirroring `resolveAttackWeaponRuntime` and its `hasCanonicalHint`): `canInstallUpgrade` refuses with `canonical_unresolved:<reason>` before any other rule, so neither `UpgradeService.applyUpgrade` nor `InstallRemoveEngine` charges or writes.

Tests now use real production pack records (real category and stamp) under wrong names, including rename in both directions, service and install-engine paths with write/credit spies, nonexistent stamp, registry reset/restore, and the real Darter for the synthetic tagger gate.

## Review corrections (round 2)
1. **The record is authoritative.** For a resolved canonical weapon, `canonical.blaster` alone decides the catalog class; the mutable `system.category` is honored only for genuine legacy weapons. A canonical Darter or Vibroblade with a forged `category: 'blaster'` stays a non-blaster.
2. **Any canonical hint counts.** With the shared registry absent, `canonicalWeaponStateOf` returns `unresolved` for any `hasCanonicalHint` Item (stamp, compendium source, `core.sourceId`, `swse.sourceId`), not only explicit stamps. An Item with no hint remains legacy.
3. **Ranged-energy is structural.** `requires: ['ranged_energy']` is satisfied for a canonical weapon only when its record is `range.mode === 'ranged'` and its damage types include `energy` (`isRangedEnergy`); family membership alone does not satisfy it. All 44 family-token blasters in the current registry satisfy it.
4. The family-token blaster set is pinned in the test against the current 203-weapon registry (44 identities).

## Dispositions
| Key | Disposition |
| --- | --- |
| upgradeRestrictions | IMPLEMENTED (Sniper Blaster Rifle refuses the rapid recycler) |
| surveillanceTaggerCompatible | IMPLEMENTED as a gate (`requiresWeaponCapability: 'surveillance-tagger'`). weapon-side gate only. **The Surveillance Tagger equipment / install functionality is NOT completed: no catalog record exists and none was invented**; the gate is tested on the real Darter with a synthetic catalog entry. |
| surveillanceTaggerCompatibility | DUPLICATE of the above (same Darter fact, prose carrier) |
| redirectionCrystalCompatibility | NON_EXECUTABLE (GM_ADJUDICATED): prose only, crystal is a separate equipment record |

## Counters
Operation keys without a consumer 44 → 42 unique (49 → 47 raw). I-D IMPLEMENTED 31 → 33, DUPLICATE +1, NON_EXECUTABLE +1, deferred 38 → 34. No pack/registry data changed.

Foundry smoke: NOT RUN.

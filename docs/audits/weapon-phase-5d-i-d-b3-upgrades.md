# Phase 5D-I-D-B3 — weapon-side upgrade compatibility

Scope: `upgradeRestrictions`, `surveillanceTaggerCompatible`, `surveillanceTaggerCompatibility`, `redirectionCrystalCompatibility`.
Existing authorities retained: `UpgradeEligibilityEngine` (via `CustomizationWorkflow`), `UpgradeService.applyUpgrade`, `InstallRemoveEngine`. No second upgrade engine; the Equipment Modification Convergence refactor is NOT started.

## Change
- New read-only module `scripts/items/weapon-runtime/upgrade-compat.js`: normalizes upgrade keys (`rapid-recycler` == `rapid_recycler`), reads `operation.upgradeRestrictions` and accepted payload capabilities, resolves a weapon Item's canonical operation by identity (never by name; a legacy/custom weapon declares nothing — unknown is not a refusal).
- `UpgradeEligibilityEngine.canInstallUpgrade` consults it for weapon/blaster items after the category match and before slot/cost: `weapon_restriction:<key>` or `weapon_incompatible:<capability>`. `UpgradeService.applyUpgrade` and `InstallRemoveEngine.previewInstall` already gate on that result, so the refusal precedes any cost or write.

## Dispositions
| Key | Disposition |
| --- | --- |
| upgradeRestrictions | IMPLEMENTED (Sniper Blaster Rifle refuses the rapid recycler) |
| surveillanceTaggerCompatible | IMPLEMENTED as a gate (`requiresWeaponCapability: 'surveillance-tagger'`). **No tagger upgrade/equipment record exists in the catalog and none was invented**; tested with a synthetic catalog entry. |
| surveillanceTaggerCompatibility | DUPLICATE of the above (same Darter fact, prose carrier) |
| redirectionCrystalCompatibility | NON_EXECUTABLE (GM_ADJUDICATED): prose only, crystal is a separate equipment record |

## Counters
Operation keys without a consumer 44 → 42 unique (49 → 47 raw). I-D IMPLEMENTED 31 → 33, DUPLICATE +1, NON_EXECUTABLE +1, deferred 38 → 34. No pack/registry data changed.

Foundry smoke: NOT RUN.

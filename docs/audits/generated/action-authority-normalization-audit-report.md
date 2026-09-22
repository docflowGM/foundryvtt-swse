# Action Authority Normalization Audit Report

Generated: 2026-09-22T23:08:23.051Z

Scope: every real `type: 'ATTACK_OPTION'` record in `packs/feats.db` and `packs/talents.db`, run through `normalizeAttackOptionRule()` + `validateAttackOptionNormalization()` (the lossless-ingestion guard). This proves the CURRENT full dataset normalizes without a single silently-dropped requirement -- it is an audit, not a claim that every normalized definition is wired into a live consumer (none are, in this groundwork round).

## Summary

- Total real ATTACK_OPTION records: 136 (feats: 88, talents: 48)
- Records that failed normalization: 0 (must be 0)
- Gate field occurrences classified NORMALIZED: 195
- Gate field occurrences classified EXTERNAL-WORKFLOW: 10
- Gate field occurrences classified UNSUPPORTED: 3

## Per-field occurrence counts

- `requiresAttackType` (normalized): 68
- `requiresContextFlags` (normalized): 29
- `requiresWeaponGroups` (normalized): 15
- `requiresUnarmed` (normalized): 14
- `requiresWeaponText` (normalized): 12
- `requiresCharge` (normalized): 8
- `requiresAutofire` (normalized): 7
- `requiresOpportunityAttack` (external-workflow): 7
- `requiresAim` (normalized): 7
- `requiresOption` (normalized): 5
- `requiresRangeBand` (normalized): 4
- `excludesAreaAttack` (normalized): 4
- `requiresAreaAttack` (normalized): 4
- `requiresTargetType` (normalized): 3
- `requiresManeuver` (external-workflow): 3
- `requiresSwiftActions` (unsupported): 3
- `requiresFeatSelectedChoiceMatch` (normalized): 3
- `requiresTargetFlatFooted` (normalized): 2
- `requiresTargetDeniedDexBonus` (normalized): 2
- `requiresDamageType` (normalized): 2
- `requiresVehicleWeapon` (normalized): 2
- `excludesDamageType` (normalized): 1
- `excludesWeaponGroups` (normalized): 1
- `excludesOptions` (normalized): 1
- `requiresTargetFeat` (normalized): 1


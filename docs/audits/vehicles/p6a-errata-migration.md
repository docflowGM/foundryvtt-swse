# P6A - Published Errata Correction of Four Vehicle Publications, and World Migration

**Authority:** *Starships of the Galaxy Errata 1.0* (2008-01-29), independently verified by the project owner; applied under the owner's explicit authorization (2026-11-01) as an exception to the sealed-publication rule. Amendment: `data/audits/vehicles/swse-universal-p6a-sotg-errata-amendment.json` (id `P6A-SOTG-ERRATA-1.0-PUBLICATION-001`), applied by `tools/build-universal-vehicle-canonical.mjs` through the shared `applyErrataToRecord` (`scripts/domain/vehicles/vehicle-errata-migration.js`).

## Changed canonical publications (exactly four; 425 unchanged, 429 identities unchanged)
| Source identity | Page | Field | Printed | Corrected |
|---|---|---|---|---|
| `sotg-immobilizer-418-interdictor-class-heavy-cruiser` | 100 | `armament.firingGroups[1].specialNotes` (areaPrintedWeaponRow); `exceptions.specialRules[0].summary` (statblockAreaSquares) | 4x4 starship squares | 3x3 starship squares (printed value kept beside it) |
| `sotg-koensayr-btl-s3-y-wing` | 158 | `defenses.shieldRating` | 10 | 25 |
| `sotg-koensayr-btl-s3-courier` | 159 | `defenses.shieldRating` | 10 | 25 |
| `sotg-koensayr-btl-a4-lp-longprobe` | 159 | `defenses.shieldRating` | 10 | 25 |

Each record carries `publication.errataApplied` (errata id, amendment id, printed and corrected values). Generated pack Actors derive `system.shieldRating`, `system.shields`, `system.sourceAttackGroups` and `recordDigest` from the corrected record; the native and release packs are built from it in CI. Unchanged by design: Core Rulebook Y-wing (SR 25), Clone Wars BTL-S1 Y-wing (SR 10), the generic gravity well projector component (4x4, V-P6A-07). The Interdictor's printed groups stay reference-only (no mounts, `attackGroupsExecutable: false`).

## Existing campaigns (GM-controlled migration)
Nothing changes in a world on its own. A pre-errata Actor stays a valid source-backed vehicle (its embedded record and digest are self-consistent) until a GM migrates it.

1. As GM, after the world loads a notice reports how many vehicles can be updated.
2. Run `game.swse.migrations.vehicleErrata()` (macro or console). The dialog lists every affected Actor: READY, ALREADY_MIGRATED, or REJECTED (with reasons).
3. For each READY Actor choose whether to migrate it. Shields: by default the **current shield value is kept** and only the maximum changes (for example 4/10 becomes 4/25). Tick "ship is undamaged" only if you know it is; that sets the current value to the corrected maximum. Being at 10/10 is not treated as proof of being undamaged.
4. Authorize. For each Actor the service writes a backup (`flags.swse.errataMigrationBackups.p6a-sotg-errata-v1`), then the migration through a one-shot provenance write-authorization, and records `flags.swse.errataMigrations` (version, errata id, original and corrected values, time, GM).

**Safety:** only Actors whose source claim verifies and whose record still has the exact printed values are migrated; invalid or tampered claims and unknown versions are REJECTED. The provenance guard re-validates the migrated Actor. Running it again skips migrated Actors. A failed write is restored from the backup and reported. Recovery at any time: `game.swse.migrations.VehicleErrataMigrationService.restore(actorId)` (GM).

**Limitations:** Actors whose source claim already fails verification cannot be migrated (fix the claim first). Unlinked token Actors are not scanned (only world Actors). The migration does not touch installed equipment or construction records.

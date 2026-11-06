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

**Integrity (final stabilization):** duplicate Actor ids are collapsed; a per-Actor lock refuses a second concurrent run on the same client; the dialog passes each Actor's preview fingerprint and the service refuses an Actor that changed since the preview (`STALE_PREVIEW`, which also catches another GM's change); the backup must verifiably persist before anything protected changes; the correction and the migration record are one update; success is reported only after the persisted Actor is verified against the planned correction (catches writes Foundry refused without throwing and recalculations that altered protected state). Any failure triggers recovery to the exact backup, and the recovery itself is verified; an unsuccessful recovery is reported as such, never as success. Only invalid or tampered claims and unknown source versions are REJECTED.

**Two different restore operations:**
- *Immediate failed-write recovery* (automatic, inside `apply`): exact backup state, verified, reported with `recovered: true|false`.
- *Manual GM restoration* (`game.swse.migrations.VehicleErrataMigrationService.previewRestore(actorId)` then `.restore(actorId, { gmConfirmed: true, expectedFingerprint })`): restores the pre-errata record, its digest, the shield maximum mirrors and the printed-groups mirror; **keeps the current shield value** and reports post-migration gameplay changes; if current shields exceed the restored maximum it refuses unless the GM passes `shieldDecision: 'clamp-to-restored-max'`; refuses with no active migration, an invalid backup, or a source that no longer equals what the migration wrote; records `flags.swse.errataMigrationRestorations`.

Two defects found and fixed in this pass: a restore left `publication.errataApplied` on the record (Foundry merges object updates), which would have broken the digest - restores now delete it explicitly; and the provenance write-authorization mutated the caller's update object - it now copies.

**Unlinked tokens:** `VehicleErrataMigrationService.scanUnlinkedTokens()` lists unlinked token Actors on scenes that use an affected publication; the dialog shows the count. They are never migrated: V13 exposes them as token delta Actors, and changing them would need a separately authorized operation with the same preview, backup, provenance, rollback and idempotence guarantees (not implemented).

**Limitations:** Actors whose source claim already fails verification cannot be migrated (fix the claim first). The migration does not touch installed equipment, construction records or custom-built ships (they make no publication claim and are never affected).

## Live Foundry V13 checklist (LIVE_RUNTIME_PENDING - not run in this environment)
1. As GM, load a world containing a pre-errata BTL-S3 Y-wing at SR 4/10 and an Interdictor: the ready notice appears; as a player, `game.swse.migrations.vehicleErrata()` only warns.
2. Open the dialog: statuses READY / ALREADY_MIGRATED / REJECTED are correct; cancel changes nothing.
3. Migrate the damaged Y-wing with "undamaged" unticked: sheet and Asset Bay show 4/25; a second Y-wing at 10/10 ticked "undamaged" shows 25/25.
4. Run the migration again: both are ALREADY_MIGRATED, no new records.
5. Damage the Y-wing: mitigation absorbs up to the current SR; recharge restores up to 25.
6. Interdictor: Stats tab shows the 3x3 note; no attack button becomes active.
7. Manual restore after more damage: preview lists the change; restore keeps current shields and sets the maximum back to 10; a second restore is refused.
8. Corrupt a backup flag in the console and attempt restore: refused.
9. Verify each migrated Actor's sheet has no source-verification error (digest valid).

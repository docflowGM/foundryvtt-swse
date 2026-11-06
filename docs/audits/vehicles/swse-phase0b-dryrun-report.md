> **Historical checkpoint: superseded by v0.5 nullable-field policy.** These pass counts describe earlier schema versions. Current policy and tests are documented in [the v0.5 report](swse-phase0b-v05-nullable-schema-report.md).

# SWSE Phase 0-B - Universal Vehicle Schema Stress-Test

**Status:** PASS (structural dry run); NOT a frozen or canon-certified database.
**Schema:** `swse.vehicle.phase0b.draft-0.3`; 22 top-level fields (20 common data groups plus `schemaVersion` and `recordType`).
**Authority:** Sourcebook TXT and selected original PDF pages; no existing vehicle compendium used.
**Repository:** No branch creation, commits, pushes or production migration.

## Fixture results

| Vehicle | Primary source | Printed weapon groups | Typed special actions or modes | Structure |
|---|---|---:|---:|---|
| AT-AT | Core Rulebook p175 | 2 | 0 | PASS |
| Incom T-65B X-wing Starfighter | Core Rulebook p178 | 2 | 0 | PASS |
| Rothana Heavy Engineering Acclamator-class Transgalactic Military Assault Ship | Starships of the Galaxy p56 | 3 | 0 | PASS |
| Golan VIII Space Defense Platform | Legacy Era Campaign Guide p152-153 | 4 | 1 | PASS |
| Coralskipper | Starships of the Galaxy p73 | 2 | 3 | PASS |
| DP-2 Probe Droid | Scavenger's Guide to Droids p82 (vehicle and droid entries) | 3 | 6 | PASS |

**Schema validation:** PASS, 6/6 source-based test vehicles; 20 semantic assertions; 2/2 updated Y-wing variant specimens.
**Source stat fidelity:** Partial deliberate spot checks. The records are not certified and must not be treated as a production ship database.

## Changes made after adversarial review

- Add `classification.secondaryCategories` and `classification.entityNature`. DP-2 has primary `starfighter`, additional `ground-vehicle`, and `droid` entity nature; its source includes a vehicle block and a droid block.
- Add `publication.sourceRepresentations` to avoid silently treating the DP-2 droid block as an ordinary vehicle attribute.
- Distinguish `weaponMount.batteryCountPrinted`, `firingCountPrinted` and verified `mountCount`. The Acclamator has **2** quad turbolaser batteries and **4** point-defense batteries; its **4 proton torpedoes** in the Ranged line are a printed attack count, not proof of four physical torpedo launchers.
- Distinguish `weaponMount.operatorRolePrinted` from `gunnerStationKey`. The printed words `gunner` and `pilot` do not establish a particular stable crew station.
- Add `geometry.occupantCoverModifiers` to capture the Core X-wing astromech-specific **+5 cover**, independent of the pilot's total cover.
- Model the AT-AT's **5 speeder bikes OR 2 AT-STs** as mutually exclusive capacity choices.
- Preserve the Coralskipper's living CON score, special organic SR behavior and mutually exclusive dovin basal modes.
- Preserve the Golan VIII's movement and hyperdrive despite being a station, and record the SR-loss/no-attack cost of moving as structured effects.
- Model the DP-2's zero crew, its two published statblock representations, and the six swift-action operations.
- Avoid general category-based inference of hyperdrive non-applicability. A field state is assigned only from entry-specific source evidence.

## Identity and variants

The published Core Y-wing (SR 25) and *Starships of the Galaxy* BTL-S3 Y-wing (SR 10) remain separate source records. Both pass the updated schema; no merge, supersession, or precedence judgment was introduced.

## Outstanding design gates

- Full primary-source line-by-line transcription review for each record (Phase 2+).
- Typed operational predicate grammar and special-rule semantics, including Coralskipper, Golan and DP-2.
- Separate intrinsic weapon authority and canonical weapon identity verification.
- Publication/variant identity reconciliation and cross-book conflicts.
- Full corpus stress testing beyond these six deliberately challenging samples.
- Certification-grade field-status audit of nulls within variable-length nested arrays.

The independent vehicle-weapon authority schema is structurally valid, but **no independent canonical vehicle weapon definition has been certified yet**. The weapon groups in six vehicle fixtures are printed source claims, not reusable intrinsic weapon authorities.

## Files

- `swse-phase0b-vehicle.schema.json`: universal source-entry contract v0.3.
- `swse-phase0b-vehicle.blank.json`: all fixed source fields initialized.
- `swse-phase0b-dryrun-fixtures.json`: six complete-shape adversarial specimens.
- `swse-phase0b-dryrun-report.json`: machine-readable test summary and unresolved gates.
- `swse-phase0b-variant-fixtures.json`: two Y-wing source records (different printed SR).
- `swse-phase0b-vehicle-weapon.schema.json`: separate unproven vehicle weapon authority schema draft.

## Recommendation

Keep Phase 0-B open for a weapon-specific intrinsic-authority stress test and one ground vehicle with unusual defenses or exposed occupants. Freeze only after these succeed and a certification-grade semantic validation contract is designed.
## Phase 0-B continuation: intrinsic weapon authority stress test

The universal vehicle schema was held at `draft-0.3`; the independent weapon authority schema advanced to `draft-0.3`. The next round tested 11 weapon/payload/control sample definitions, two separate installation compositions and four new full-shape vehicle specimens, with **40/40 schema/semantic checks passing**. All six earlier vehicles and both Y-wing variants continue to validate. The adversarial weapon test covers fire-link vs battery, shieldbuster, armor piercing, medium missile launcher and ammo capacity, mines, gravity well, tractor beam, and Hapan ion cannon. A corrected rendered Scum and Villainy p66 shows C-wing **SR 30**.

**Status is still design-stage only**: no finished weapon canon, frozen schema, or Foundry implementation. See `swse-phase0b-weapon-stress-report.md` and `.json` for test evidence, sample provenance and remaining blockers.

## Phase 0-B continuation: draft v0.4

All original 6 vehicle and 2 variant examples validate under the universal v0.4 contract. The 4 additional vehicles also validate; the strict deep field-state gate is incomplete. New `rules` group remains non-executing.

See `swse-phase0b-semantic-contract-report.md` and `swse-phase0b-semantic-contract-report.json` for 31 regression checks, global combat rules and source-status findings. Earlier 40/40 tests were on v0.3 and are recorded as prior historical results; do not add them to the v0.4 checks as though they had been rerun unchanged.

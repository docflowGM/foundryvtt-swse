# SWSE Vehicle Phase 2C — Checkpoint 3: Approved Policy Contract and Corrected Census

**Status: ALL THREE USER DECISIONS APPROVED; research / testable authority implementation complete; production integration NOT yet authorized.**

## Decision record

| ID | Approval | Implemented in this checkpoint | Production state |
|---|---|---|---|
| P2C-D01 | APPROVED | Append-only supplemental 318-entry census over historical Phase1 316 | Historical original and production packs unchanged |
| P2C-D02 | APPROVED | Split source-complete review from operational capability and strict mechanical certification; unknown arcs fail closed; GM-instance exception contract | Pure test harness only; not yet wired into Foundry rolls |
| P2C-D03 | APPROVED | Published contradictions retain all printed alternatives; no automatic numeric precedence; explicit GM-instance adjudication returns required audit receipt | Pure test harness only; canonical values remain undecided |

### Historical census and source evidence

The 316 publication identities in `data/audits/vehicles/swse-phase1-vehicle-provenance.json` (Git blob SHA `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`) remain **byte-for-byte frozen**. The original Phase 2B 316/316 close-read remains a valid historical checkpoint and is *not rewritten to claim that it originally included the missing two ships*.

One additive artifact, `data/audits/vehicles/swse-phase2c-cp3-318-census-overlay.json`, appends exactly two independent, original-PDF-verified publication statblocks, yielding **318 source-reviewed publication claims in the corrected scope**:

| New source identity | Book and printed page | Source facts and special cases |
|---|---|---|
| `ur-uulshos-manufacturing-deep-x-explorer` | *Unknown Regions* p.51, CL5 | HP60, DR10, two printed light blaster cannons forming one attack group at +3, two gunners to operate both. Individual arcs and mount topology not printed. |
| `sav-tenloss-corporation-hornet-class-interceptor` | *Scum and Villainy* p.125, CL12 | HP50, SR35; heavy laser default 10d10×2, medium laser alternate 5d10×2. Natural 1 explosion (6d10×2 ignoring SR and destroying cannons) is **default-specific**; alternate is not a third publication claim. Hyperdrive field is unprinted, not canonically absent. |

The two PDF SHA-256 fingerprints, printed page evidence, full visible stats, special mechanics, and source-silent fields are recorded inside the additive ledger. Neither entry is certified to have known firing arcs, mount positions or complete runtime mechanics. **Source-complete is NOT strict mechanical certification.** The `supplemental` keys were independently checked against all 316 source keys on GitHub before authoring this checkpoint.

## Approved certification policy (D02)

Three distinct gates:

1. **Source-complete:** every printed field and relevant immediate prose is inspected; absent printed data and conflicts recorded explicitly. Does not require invented gun positions, arcs or runtime code.
2. **Operational capability:** an action may execute only when its relevant target, operator, installed configuration and targeting/attack rules are resolved. A ship may be usable for some capabilities yet blocked for others.
3. **Strict mechanical certificate:** source facts, required consumer fields and executable effects are independently validated; temporary GM exceptions never satisfy this gate.

An attack group, firing group, gun barrel, physical mount, crew station and battery are different entities. A published attack row does not prove a unique mount. `SOURCE_SILENT_CONFIRMED` never defaults to forward, turret or unrestricted targeting. Automatic arc-dependent targeting must **BLOCK** when the source arc is silent. A GM can permit **one explicitly identified attack** in an instance by selecting an arc; only a trusted Foundry adapter can verify GM privileges and must persist the returned audit receipt. An unidentified crew operator or target remains blocked even if a GM approves the arc exception.

## Approved conflicting-source policy (D03)

All contradictory printed values must retain their page and source field, with a `PUBLISHED_CONFLICT` state. Example: *Scum and Villainy* p.67 prints Clutch ion +7 in the Ranged line versus +5 in weapon detail. Neither value may be silently selected via attack math or text-parser precedence.

A GM may explicitly choose **one of the printed alternatives** for a game-instance action. The pure policy probe returns an audit receipt with GM identity, instance ID, exact attack/target/weapon scope, selected value and reason; it does not modify the canonical record. Selection of a new nonprinted number, permanent correction, global errata adoption or a new house rule requires a separate adjudication authority, not a hidden fallback.

## Runtime blockers identified, **not repaired here**

- `scripts/engine/import/vehicle-weapon-import-normalizer.js`: printed negative attack bonuses can be clamped with `Math.max(0, bonus)`; replace when rolling out new producer/consumer parity.
- `scripts/combat/systems/vehicle/vehicle-weapons.js`: forward arc default and unknown-arc permissive fallthrough; must be closed before automatic certified targeting.
- `scripts/engine/vehicles/vehicle-factory.js`: missing shield data may be coerced to zero; source-nullability and runtime defaults must be disentangled.
- `scripts/sheets/v2/vehicle-sheet/weapon-station-mapping.js` already rejects ambiguous station assignments; preserve its fail-closed behavior.

The policy probe in `tools/audits/vehicles/phase2c-authority-policy.mjs` is intentionally **not imported by any production script**. `tests/phase2c-vehicle-authority-policy.test.mjs` exercises the approved rules using Node's built-in test runner. A future Foundry integration must supply authenticated GM permission from the host and persist receipts before actions occur; an untrusted client boolean is not proof of GM status.

## Gates and constraints

- Pass the focused CP3 validator, including both primary PDF SHA checks and Node tests.
- Reconfirm the immutable full Phase1 Git blob SHA and absence of key collisions in the actual repo checkout before production migration. The GitHub connector check verified 316/316 unique historical IDs and zero proposed-key collisions; the standalone validator also supports `--phase1` for a later working-tree verification.
- Fix Phase0B schemaVersion / null-state fixture failures and reconcile V2 vehicle importer, equipment, crew, targeting, and attack consumers as a coordinated change. Old fixture gate cannot be represented as green yet.
- Preserve `PRINTED_VALUE`, `EXPLICIT_NONE`, `SOURCE_SILENT_CONFIRMED`, `PUBLISHED_CONFLICT`, `NOT_REVIEWED`, `CONFIGURATION_CONDITIONAL` across source and runtime boundaries.
- Do not auto-migrate old compendium vehicles, alter actors, or freeze the draft universal vehicle schema in this audit-only checkpoint.
- Four earlier strict Starships of the Galaxy certificates remain distinct from the two new source-complete supplement claims; no strict certificates are added here.

**Next recommended checkpoint:** producer/consumer authority-map and constrained runtime integration proposal, with targeted tests for signed attack bonuses, arc denial, GM authentication/audit persistence, and shield field-state parity, before touching production code.
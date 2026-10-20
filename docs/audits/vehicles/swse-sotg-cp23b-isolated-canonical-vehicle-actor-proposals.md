# SotG CP23-B — Isolated Canonical Source Actor Drafts and Native Round-Trip Gate

## Status and scope

**Fifteen CP21-approved printed-source vehicle Actor drafts are constructed in a separate audit artifact.** They are not installed Actors, not new release compendiums, and not certified physical-mount configurations.

- Authority: owner-approved CP21 decisions, generated CP22 source read path, CP23-A reconciliation ledger.
- Original Starships of the Galaxy PDF SHA-256: `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`.
- Source-index count: **15**, including the 13 observed legacy pack candidates and two previously unmatched publication ships.
- Existing legacy pack IDs: **preserved and never reused** in the proposed actor set.
- Isolated proposal IDs: `sotgcp23b0000001` through `sotgcp23b0000015`; not registered in `system.json`.
- Supported scalar fields are reconstructed from **the approved source facts**, not legacy pack numeric values: Initiative, Perception, Reflex/flat-footed/Fortitude, HP, DR, DT, armor, SR, STR/DEX/INT, and known crew quality/count.
- Unprinted or ambiguous fields remain **absent**, not zero. No hyperdrive guess, physical arc, gunner station assignment or unsupported alternate armament is fabricated.
- Publication attack rows, CP21 weapon-row corrections, printed source alternatives and pending unresolved scopes are separately retained as evidence. **All Actor `system.weapons` arrays are intentionally empty**, because no entry has approved installed physical weapon mount/station topology.
- Native CLI test uses the prior CP9B mechanism: pinned `@foundryvtt/foundryvtt-cli@3.0.5` compile/extract round-trip to an OS temporary directory, field parity check and total cleanup. It does not mean the actor can be loaded in a live Foundry V13 world.

## Reconstructed draft catalogue

| Queue | Printed ship | Isolated draft ID | Initiative | Reflex | Flat-footed | HP | Published attack groups, not installed weapons |
|---:|---|---|---:|---:|---:|---:|---:|
| 1 | Advanced V-19 Torrent Starfighter | `sotgcp23b0000001` | 12 | 23 | 12 | 125 | 2 |
| 2 | Recusant-class Light Destroyer | `sotgcp23b0000002` | -2 | 14 | 12 | 1290 | 5 |
| 3 | Kuat Drive Yards Pellaeon-class Star Destroyer | `sotgcp23b0000003` | -2 | 16 | 14 | 2350 | 5 |
| 4 | Immobilizer 418 Interdictor-class Heavy Cruiser | `sotgcp23b0000004` | -2 | 17 | 15 | 1500 | 2 |
| 5 | Junker TYE-wing | `sotgcp23b0000005` | 2 | 14 | 11 | 60 | 1 |
| 6 | Koensayr Manufacturing BTL-58 K-wing | `sotgcp23b0000006` | 6 | 18 | 13 | 160 | 5 |
| 7 | Sienar Technologies Marauder Corvette | `sotgcp23b0000007` | -3 | 14 | 12 | 720 | 2 |
| 8 | Mon Calamari Star Defender | `sotgcp23b0000008` | -3 | 20 | 19 | 2700 | 6 |
| 9 | Eclipse | `sotgcp23b0000009` | -4 | 20 | 20 | 6000 | 6 |
| 10 | Theta-class Shuttle | `sotgcp23b0000010` | 5 | 15 | 12 | 120 | 2 |
| 11 | Sienar Fleet Systems TIE Bomber | `sotgcp23b0000011` | 4 | 15 | 12 | 130 | 2 |
| 12 | Incom T-65XJ3 X-wing Starfighter | `sotgcp23b0000012` | 9 | 21 | 13 | 150 | 2 |
| 13 | Incom/Subpro ARC-170 Starfighter | `sotgcp23b0000013` | 5 | 17 | 13 | 150 | 3 |
| 14 | Alliance A-wing Starfighter | `sotgcp23b0000014` | 12 | 19 | 11 | 80 | 3 |
| 15 | Baudo-class Star Yacht | `sotgcp23b0000015` | -3 | 13 | 11 | 60 | 1 |

## Source fidelity and unresolved armament

The CP23-B proposal manifest stores for every ship: the exact original publication facts, approved effective facts, original attack rows, approved weapon-row corrections, CP21 typed rules, legacy candidate reference (if any), and a separate **non-deployable Actor-like scalar draft**. The scalars can be checked against source evidence without granting stock attacks. The two missing legacy candidates are not silently assigned a mismatched existing Actor.

Especially constrained rows include:
- **Immobilizer**: the official 3×3 gravity-well area is in approved attack evidence; it does not authorize an actual installed projector action.
- **Recusant**: detailed +14/+12 point-defense row bonuses remain separate from the conflicting summary.
- **K-wing**: ammunition and ordnance options are policy/evidence only, with no implicit simultaneous installation.
- **Mon Calamari Star Defender**: medium-vs-heavy missile ammunition still has an unresolved equivalence.
- **Eclipse**: the −20 small-target superlaser penalty and axial alignment are retained as policy, not an attack execution.
- **ARC-170, Alliance A-wing, Baudo**: absent historical weapon-row fields stay absent. Baudo's one cannon is approved as source-effective hardware evidence, but no physical mount geometry is certified.

## Artifacts and validation

- `data/audits/vehicles/swse-sotg-cp23b-isolated-source-actor-proposals.json`: all 15 complete proposals and source evidence.
- `tools/audits/vehicles/build_sotg_cp23b_proposals.mjs`: repeatable, pinned source compilation, `--check` and deliberate audit-only `--write`. No direct production output mode.
- `tools/audits/vehicles/verify_sotg_cp23b_native_roundtrip.mjs`: optional isolated official CLI 3.0.5 native LevelDB test. Only writes under an OS-generated temporary directory, deletes the directory afterward, and refuses any registered proposal pack.
- `tests/phase2c_cp23b_isolated_proposals.test.mjs`: 15-record identity checks, pinned inputs, field-level examples, original/effective row separation, 13/2 candidate inventory, absence-of-authority negative tests.
- `.github/workflows/sotg-strict-certification-cp17.yml`: regenerates/checks proposals and verifies the native draft round-trip before deeming the commit green.

## Remaining independent gates

**CP23-B does not complete durable installed-provenance authentication.** That will require a trusted, mutation-aware source-to-pack transaction, zero bypass through writable Actor metadata, reconciliation of physical hardware (including arcs, crew/operator stations, battery group identities and alternative configurations), and actual Foundry V13 world readback/actor-mutation tests. No production package or `vehicle-stock-attack-authority.js` changes are made here.

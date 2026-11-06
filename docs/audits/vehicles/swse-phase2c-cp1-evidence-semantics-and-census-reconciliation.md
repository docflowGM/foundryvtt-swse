# SWSE Vehicle Phase 2C — Checkpoint 1: Evidence Semantics and Census Reconciliation

**Mode:** Discovery/design validation only. **No Phase 1 mutation, schema freeze, production hydration, or new strict mechanical certifications.**

**Parent:** `b5851d6b4e7b50e5315b743b2247b2a1df07a047` on `audit/vehicle-phase-0-1-canonical-foundation`. Immutable Phase 1 provenance blob: `21f2178eb6a610d3b52ecdc8549f93724c77fbc4`.

## Why Phase 2C starts here

Phase 2B closed the original publication-specific **316/316 source-review** roster. That does **not** imply that the printed census is exhaustive, that missing physical mounts and arcs are known, that contradictions are resolved, or that the v0.5/experimental v0.6 schema is approved for production. The existing *Starships of the Galaxy* book has **4 independently strict-certified records**, with **100 still outstanding**; the other source-reviewed books did not gain strict certificates merely by passing their focused source-review validators.

Phase 2C's first gate separates **a fact the PDF explicitly states**, **a source-verified absence**, **source silence**, **a source contradiction**, **unreviewed evidence**, and **a conditional loadout or mode**. These need distinct source-authority states before designing V2 serialization and actor hydration.

## Two Phase 1 identity candidates independently checked on printed PDF pages

| Proposed reconciliation | Primary printed source | Publication fact | Decision |
|---|---|---|---|
| `P2C-ID-001`, Uulshos Manufacturing **Deep-X Explorer** | *Unknown Regions*, p. **51**, PDF physical page 52; SHA-256 `43a69aa7974ed4aeb52b57ba28b3466c2ed9f54bd73fe5d5295b744bfe1bd55b` | Own CL 5 Gargantuan starfighter statblock; two light blaster cannons require two gunners, but only one detailed gunner attack profile is printed; hyperdrive x1, backup x8. | **Candidate only**, absent from frozen twelve-entry publication roster. Do not confuse with adjacent SRV-1 **ground vehicle**. |
| `P2C-ID-002`, Tenloss Corporation **Hornet-class Interceptor** | *Scum and Villainy*, p. **125**, PDF physical page 126; SHA-256 `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399` | Own CL 12 Gargantuan starfighter statblock. Default advanced heavy laser guns have natural-1 malfunction; an alternate medium-laser configuration is printed **within the same block**. | **Candidate only**; count as **one** proposed publication entry, not one per loadout. Alternate configuration does not inherit the advanced-gun failure rule. |

No Phase 1 `sourceEntryKey` was issued. The fixed numerator and denominator remain **316/316** until a separately reviewed Phase 1 provenance amendment is authorized. **318 is a hypothetical revised total if both additions are independently approved**, not a certified new book-wide census; other uncensused vehicles could still exist.

## Six evidence distinctions and v0.5 compatibility

| Phase 2C evidence state | Underlying source meaning | v0.5 draft field behavior | Forbidden shortcut |
|---|---|---|---|
| `PRINTED_VALUE` | Value exists in statblock or relevant prose | Populate supported value, preserve source locator | Recompute using assumed crew/battery rules |
| `EXPLICIT_NONE` | Source positively states unavailable/none | `null` **only with** `fieldStates[/path]=explicitly-none` or justified not-applicable | Infer no installed item from missing text |
| `SOURCE_SILENT_CONFIRMED` | Reviewed source did not state value | Omit uncertain nested property; `fieldStates[/path]=not-stated` | Convert to `0`, `false`, `none`, or `null` |
| `PUBLISHED_CONFLICT` | Two incompatible printed statements | Retain both in evidence, `fieldStates[/path]=unclear-source`; no adjudicated value | Pick one automatically or correct by derived math |
| `NOT_REVIEWED` | Source field/pages still unverified | Omit, `fieldStates[/path]=not-yet-reviewed` | Declare certified |
| `CONFIGURATION_CONDITIONAL` | Rule only applies under named condition/variant | Keep scoped rule/loadout/mode separate | Apply universally or split one printed CL statblock |

This is an **evidence contract, not a modification to v0.5 or a production v0.6 freeze**. The v0.5 universal vehicle schema's `fieldStates` does not currently have a `source-stated` enumerator; populated source-stated fields need source evidence in a separate provenance/evidence record until schema design decides that migration. A printed *weapon attack group* is not a physical weapon count, firing arc or independent turret.

## Checkpoint 1 pressure-test coverage

The 16 machine-readable pressure fixtures include Deep-X's two cannons vs one attack-profile row; Hornet's default vs alternative weapon behavior; Star Seeder's two conflicting penalty/target-threshold rows; Preybird autofire silence; stock YT-1300 unprinted SR; Z-95 *explicitly* absent hyperdrive; Quartermaster's unprinted weapons vs defensive prose; Vulture's ship/walker modes; Surfeik's non-damage pseudograv effect; Clutch ion attack conflict; YU-410 ambiguous dual-DR labels; *Millennium Falcon* conditional scale; Drexl hyperdrive silence; and Royal Fortune's 38 physical lasers vs 8 laser battery attack groups.

The validator rejects fabricated Phase 1 keys, accidental Hornet alternate-loadout duplication, collapse of physical mount count into attack-group count, and a premature schema freeze. Four deliberately invalid fixtures are required to **fail** their negative controls.

## Phase 2C follow-on work and promotion gates

1. **Identity adjudication:** independently approve/reject and formally append the Deep-X and Hornet in a separate Phase 1 amendment, never by rewriting the frozen 316 archive or assigning production keys inside this discovery artifact. Re-run a book-wide census check before claiming a newly exhaustive total.
2. **Schema discovery consolidation:** consume the latest full-book discovery records, avoid checkpoint duplicates, inventory special-action categories, topology silence, explicit absence, multi-configuration ships, conditional crew/equipment, and contradictions. Compare v0.5 vs proposed v0.6 without changing production data.
3. **Mount/arc evidence policy:** decide whether source-silent physical topology can satisfy *some* strict certification levels without inventing the topology; explicitly distinguish source-field completeness from physical-design completeness. This requires an approved written certification policy and consumer agreement.
4. **Conflict resolution:** each printed discrepancy needs original values and precise locators, an authorized editorial decision, and coverage in regression fixtures; it must not be resolved by code calculation alone.
5. **Schema/consumer agreement:** prove that every proposed typed special mechanic has a V2 data producer, consumer, and tests; fix the historical Phase 0B `schemaVersion` and unclassified blank/null fixtures, previously a known failing gate.
6. **Only then** decide schema freeze, strict certification promotion, and Phase 3 compendium/runtime hydration, with broad repository and Foundry tests.

## Files and verification

- `data/audits/vehicles/swse-phase2c-cp1-identity-candidates.json`
- `data/audits/vehicles/swse-phase2c-cp1-evidence-semantics-pressure.json`
- `tools/audits/vehicles/check_vehicle_phase2c_cp1.py`
- This report.

Run the validator with optional `--phase2b-zip`, `--unknown-regions-pdf`, `--scum-and-villainy-pdf`, and `--cp1-zip` to enable archive, primary-source fingerprint and packaging checks. The gate only validates evidence/accounting; it does **not** claim a new exhaustive census, production parity, physical arcs, or additional strict mechanical certificates.

# Clone Wars Campaign Guide - Publication droid hydration (ROLLING LOCAL)

**Book 2 of 14. Status: IN PROGRESS, NOT MECHANICALLY CERTIFIED.**

## Current / overall counts

| Progress axis | Clone Wars | Entire project |
|---|---:|---:|
| Local source identity drafts | **40/40 (100%)** | **86/234 (36.8%)** |
| Selected-field printed PDF review | **40/40 (100.0%)** | **86/234 (36.8%)** |
| Independently mechanically certified | **0/40 (0%)** | **0/234 (0%)** |
| Fully mechanically completed sourcebooks | -- | **0/14** |

The source identity pass is not the mechanical-source pass. **All feats, talents, mounts, attack alternatives, model hero routes, and V13 runtime execution remain uncertified.**

## Evidence

- Reused the **40 immutable `CLONE-DROID-###` identities** from the read-only publication census.
- Kept **32 individual droids**, **one B1 squad aggregation**, and **seven vehicle/starship-format droid claims** separate.
- **40 rendered source entries** were selectively inspected across printed pages with **528 PDF field comparisons**.
- **32 factory-model hero permissions/prohibitions** were sight-read directly from visible PDF text; squad/vehicle eligibility remains absent. A factory model being allowed does not itself define a legal stock-route build.
- CLONE draft ledger SHA-256: `f46123b4b575c5a43e05ce3bcffe49db544d853d0a701129a060e18ba35876be`.
- Source PDF SHA-256: `3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6`.
- Local semantic checks: **PASS**. Mutation-based negative tests: **22/22 PASS**. Official upstream full JSON Schema and V13 engine tests: **NOT RUN**.

## High-priority discoveries / source corrections

1. **DD-13 (p66):** official printed cost **4,150**, not 4,950 as found in OCR. Checked against the rendered PDF. No permission to play this factory model as a droid hero.
2. **B1-Series Battle Droid Squad:** the prior upstream census points to printed **p95**, but the visible statblock is on printed **p94**. Retained source-only correction in this local ledger; no upstream GitHub writes. A squad is a derived aggregation, not a stock individual droid.
3. **FX-6 Medical Assistance Droid:** the main statblock spans printed **pp160-161**; the census page-end was incomplete. No field may be treated as absent merely because p160 ends.
4. **Hero-eligibility OCR bleed:** proximity-based text windows silently assigned NEXT model permission to preceding model (such as DD-13, BCA-11/X, CLL-6). All OCR-only permissions were cleared before selected reviewed model permissions were restored from PDF images.
5. **B1-A / Battle Droid Assassin (p190):** two-column OCR is heavily interleaved. Both distinct publication identities remain, but mechanical values and model permission have not been assigned from the mixed text.
6. **Ultra Droideka (p198):** source first-page statistics and price sight-read, but alternative attacks, independent mounts and use of wheeled locomotion remain only source claims.
7. **Ground Armored Tank (p198) and Hyena-class Bomber (p208):** these remain Vehicle/Starship-primary records. The sidecar captures some printed vehicle numbers, but the source ledger does **not** turn them into droid-actor HP, movement or weapon permissions.
8. **Batch 2:** inspected 20 additional entries on printed pages 188-202 (including split/mixed columns), and corrected the Ultra Droideka p197 hero prohibition. Source-only special rules include A-DSD leg shields, JK-13 killing rage, Octuptarra virus burst, and OG-9 critical leg damage.
9. **Language nuances:** P2 Series Astromech has Basic **understand-only**; not a proof that it speaks Basic. Similar limits on other droids require independent source-specific language mapping.

## Outstanding

- Selected first-page visual checks are completed for 40 publication claims; finish full secondary/continuation and source-mechanical rules for all 40.
- Reconcile printed feat/talent phrasing with certified canonical registry IDs and exact scopes.
- Map systems, manipulators, inventory and mounted weapons to actual authority, not merely statblock attack lines.
- Resolve vehicle/starship/squad-specific sources and any printed contradictions; no weapon execution rights until owner-reviewed certified components.
- Run upstream full authoritative draft schema validation, independent mechanical certification and Foundry V13 execution tests. No production compendium mutations.

## Per-publication register

| Census identity | Printed name | Printed page | Actor authority | Visual selected fields | Mechanical cert |
|---|---|---:|---|---|---|
| CLONE-DROID-001 | DD-13 Medical Assistant Droid | 66 | droid | 16 | pending |
| CLONE-DROID-002 | EW-3 Midwife Droid | 67 | droid | 16 | pending |
| CLONE-DROID-003 | IM-6 Medical Droid | 67 | droid | 16 | pending |
| CLONE-DROID-004 | SP-4 Analysis Droid | 68 | droid | 16 | pending |
| CLONE-DROID-005 | LE Series Repair Droid | 69 | droid | 16 | pending |
| CLONE-DROID-006 | P2 Series Astromech Droid | 69 | droid | 16 | pending |
| CLONE-DROID-007 | Serv-O-Droid Pit Droid | 70 | droid | 16 | pending |
| CLONE-DROID-008 | 5YQ Protocol Droid | 70 | droid | 16 | pending |
| CLONE-DROID-009 | BCA-11/X Training Droid | 71 | droid | 16 | pending |
| CLONE-DROID-010 | IG-86 Sentinel Droid | 71 | droid | 16 | pending |
| CLONE-DROID-011 | CLL-6 Binary Load Lifter | 72 | droid | 16 | pending |
| CLONE-DROID-012 | FA-5 Valet Droid | 72 | droid | 16 | pending |
| CLONE-DROID-013 | IW-37 Pincer Loader Droid | 73 | droid | 16 | pending |
| CLONE-DROID-014 | B1-Series Battle Droid Squad | 94 | squad-aggregation | 2 | pending |
| CLONE-DROID-015 | FX-6 Medical Assistance Droid | 160 | droid | 16 | pending |
| CLONE-DROID-016 | FA-4 Pilot Droid | 161 | droid | 16 | pending |
| CLONE-DROID-017 | Marksman-H Combat Remote | 162 | droid | 16 | pending |
| CLONE-DROID-018 | A-DSD Advanced Dwarf Spider Droid | 188 | droid | 16 | pending |
| CLONE-DROID-019 | A-Series Assassin Droid | 189 | droid | 16 | pending |
| CLONE-DROID-020 | B1-A Series Air Battle Droid | 190 | droid | 16 | pending |
| CLONE-DROID-021 | Battle Droid Assassin | 190 | droid | 16 | pending |
| CLONE-DROID-022 | Cold Assault Battle Droid | 191 | droid | 16 | pending |
| CLONE-DROID-023 | C-B3 Cortosis Battle Droid | 192 | droid | 16 | pending |
| CLONE-DROID-024 | Droid Commando | 192 | droid | 16 | pending |
| CLONE-DROID-025 | IG Lancer Combat Droid | 193 | droid | 16 | pending |
| CLONE-DROID-026 | IG-110 Lightsaber Droid | 193 | droid | 16 | pending |
| CLONE-DROID-027 | JK-13 Security Droid | 194 | droid | 16 | pending |
| CLONE-DROID-028 | LM-432 Assault Crab Droid | 194 | droid | 16 | pending |
| CLONE-DROID-029 | LR-57 Combat Droid | 195 | droid | 16 | pending |
| CLONE-DROID-030 | Octuptarra Combat Tri-Droid | 196 | droid | 16 | pending |
| CLONE-DROID-031 | OOM-Series Battle Droid | 196 | droid | 16 | pending |
| CLONE-DROID-032 | Spelunker Probe Droid | 197 | droid | 16 | pending |
| CLONE-DROID-033 | Ultra Droideka | 198 | droid | 16 | pending |
| CLONE-DROID-034 | Ground Armored Tank | 198 | vehicle | 2 | pending |
| CLONE-DROID-035 | IG-227 Hailfire-class Droid Tank | 199 | vehicle | 2 | pending |
| CLONE-DROID-036 | Manta Droid Subfighter | 200 | vehicle | 2 | pending |
| CLONE-DROID-037 | OG-9 Homing Spider Droid | 201 | vehicle | 2 | pending |
| CLONE-DROID-038 | Persuader-class Droid Enforcer | 201 | vehicle | 2 | pending |
| CLONE-DROID-039 | Tri-Droid | 202 | vehicle | 2 | pending |
| CLONE-DROID-040 | Hyena-class Bomber | 208 | vehicle | 2 | pending |

**Local-only checkpoint.** No GitHub commits or pushes. No Foundry production writes.

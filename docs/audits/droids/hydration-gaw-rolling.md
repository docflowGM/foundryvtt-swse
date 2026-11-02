# Galaxy at War - SWSE Droid Source Hydration Local Review (Book 5/14)

**LOCAL ONLY; do not push or import without explicit authorization.**

| Measure | Galaxy at War | Overall through five books |
|---|---:|---:|
| Draft publication identities | **22/22 (100%)** | **161/234 (68.8%)** |
| Selected first-page PDF reviews | **22/22 (100%)** | **161/234 (68.8%)** |
| Selected visual field comparisons | **285** | **2,307** |
| Mechanically certified | **0/22** | **0/234** |
| Mechanically complete books | -- | **0/14** |

## Source, identity, and provenance

- Owner-provided *Galaxy at War* PDF and indexed text file were SHA-256 recorded in `gaw-field-evidence.json`.
- Read-only upstream census gives 22 separate publication claims; these remain separate from equivalent statblocks in Core/Clone Wars.
- Printed page images reviewed at pp51-57, 98, 175, 181 and 210-220. The 22 claims are distributed across 21 distinct rendered pages.
- Classification: 20 droid actors (including stationary sentry), 1 vehicle-primary Ground Armored Tank, 1 B1 squad aggregate.
- Printed hero permissions for the first eleven chapter models: **4 allowed, 7 prohibited**. The nine other actor-format claims have no new GAW permission established, and vehicle/squad hero construction is not applicable.
- No printed attack row, listed feat, source relationship or conditional special ability is represented as executable V13 authority.

## Specific source decisions

1. **A-Series Medical Droid (p51):** model-specific Medical Droid healing talent requires a scoped implementation rather than a generic Treat Injury boost.
2. **KDY-4 and Chiba-DR10 (p52):** separate statblocks despite OCR interleaving; do not transfer KDY stability or Chiba weapon/system data to the other.
3. **Air Assault Super Battle Droid (p53):** integrated jet-pack charges and volatile fuel differ from universal defaults; no inferred activation.
4. **Eradicator (p53):** central-controller shutdown dependency remains conditional rather than an unconditional droid-processor feature.
5. **Purge Trooper (p54):** DR 10 is a defense value, with model-specific lightsaber/cortosis exception pending rule resolution.
6. **Sniper Droideka (p55):** exclusive wheeled locomotion, sniper attack modes, and shield rating remain source observations, not certified actions.
7. **Tactical Droid (p55, second presentation p213):** single GAW identity. Printed price **14,005 credits**, not the shorter, potentially misleading OCR numeral. Battle Analysis and Vehicle Combat require feat/talent reconciliation.
8. **Vigilant 2X (p56):** self-destruct, repeating blaster, launcher, and energy requirements require separate inventory/mount evidence.
9. **Automated Sentry Gun (p98 vs p175):** printed base Ref 15 (flat-footed 14) versus encounter Ref 20 (flat-footed 19) under +5 cover. Store situational modifier, not a permanent defense boost.
10. **Arakyd AZ-Series (p181):** printed double-attack option is not installed weapon permission.
11. **Ground Armored Tank (p216):** vehicle-primary. HP 175/DR 10 and vehicle weapons remain in evidence only; no duplicate droid actor.
12. **B1 squad (p217):** consists of three B1 droids; hp 20 and Large squad size remain squad-only source data. The upstream census claims an additional statblock on **p220**, but the rendered p220 has other named character blocks, **not** a B1 squad. Preserve this census discrepancy without creating a duplicate.
13. **Battle Droid Assassin (p218):** separate adventure variant, not interchangeable with a basic B1 factory record.
14. **LR-57 (p219):** passive standby and activation behavior must not silently become a universal ability.

## Per-entry selected-field register

| ID | Printed name | Page | Authority | Checked pointer fields | Mechanical certification |
|---|---|---:|---|---:|---|
| GAW-DROID-001 | A-Series Medical Droid | 51 | droid | 14 | BLOCKED |
| GAW-DROID-002 | KDY-4 Tech Droid | 52 | droid | 14 | BLOCKED |
| GAW-DROID-003 | Chiba-DR10 Protocol Droid | 52 | droid | 14 | BLOCKED |
| GAW-DROID-004 | Air Assault Super Battle Droid | 53 | droid | 14 | BLOCKED |
| GAW-DROID-005 | Eradicator-Series Battle Droid | 53 | droid | 15 | BLOCKED |
| GAW-DROID-006 | Purge Trooper | 54 | droid | 15 | BLOCKED |
| GAW-DROID-007 | Sniper Droideka | 55 | droid | 15 | BLOCKED |
| GAW-DROID-008 | Tactical Droid | 55 | droid | 14 | BLOCKED |
| GAW-DROID-009 | Vigilant 2X Picket Droid | 56 | droid | 14 | BLOCKED |
| GAW-DROID-010 | CLL-M2 Ordnance Lifter Droid | 56 | droid | 14 | BLOCKED |
| GAW-DROID-011 | MR-200 Series Minesweeper Droid | 57 | droid | 14 | BLOCKED |
| GAW-DROID-012 | Automated Sentry Gun | 98 | droid | 14 | BLOCKED |
| GAW-DROID-013 | Arakyd AZ-Series Battle Droid | 181 | droid | 14 | BLOCKED |
| GAW-DROID-014 | B1-Series Battle Droid | 210 | droid | 13 | BLOCKED |
| GAW-DROID-015 | B2-Series Super Battle Droid | 210 | droid | 13 | BLOCKED |
| GAW-DROID-016 | Droideka Series Destroyer Droid | 211 | droid | 14 | BLOCKED |
| GAW-DROID-017 | Droid Commando | 214 | droid | 13 | BLOCKED |
| GAW-DROID-018 | OOM-Series Battle Droid | 215 | droid | 13 | BLOCKED |
| GAW-DROID-019 | Ground Armored Tank | 216 | vehicle | 4 | BLOCKED |
| GAW-DROID-020 | B1-Series Battle Droid Squad | 217 | squad-aggregation | 4 | BLOCKED |
| GAW-DROID-021 | Battle Droid Assassin | 218 | droid | 13 | BLOCKED |
| GAW-DROID-022 | LR-57 Combat Droid | 219 | droid | 13 | BLOCKED |

## Scope of completion and next gates

This completes selected-field first-page PDF checks only. Source TXT/OCR windows are retained as untrusted extraction evidence, not certified rule implementations. Further work is required to verify all printed narrative facts and continuation pages, exact feat/talent identities and prerequisites, Systems versus Possessions, installed weapon provenance, legal PC creation and the complete action economy. Full upstream JSON Schema 2020-12 validation and live Foundry V13 runtime checks remain **NOT RUN**.

Local semantic checks and negative-mutation tests should pass before any next-book work. Keep this book at `IN_PROGRESS_NOT_CERTIFIED` and preserve source hashes and original printed-page citation receipts.

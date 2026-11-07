# Class Feature Contract — Wave A Preflight Matrix (read-only)

**Base:** `origin/main` @ `b360a2fc0f626b83152453d4c0a5d5f70abe2216` (2026-11-07). No production code changed.
**Scope:** the 18 NON-FORCE HYBRID/AUTOMATED entries of the Class Feature Implementation Contract. Reserved Force entries and the 7 GM_FIRST entries were not touched.
**Method:** static inspection only (registry, `scripts/`, `packs/classes.db`, OCR text in `reference/sourcebooks/`). Not Foundry-tested. OCR is **not** the printed PDF; page numbers were not verifiable from OCR, so every row is `SOURCE_VERIFIED: NO` until checked against the printed PDF.

## Registry partition
All 18 IDs exist exactly once in `data/class-features.json` (53 abilities, all `executionModel: ACTIVE`, none flagged `implementedElsewhere`). No change from the contract's partition.

## Consumer finding (applies to all 18)
- A repo-wide search of `scripts/`, `templates/`, `tests/`, `tools/` found **no runtime consumer** for any of the 18 features. Matches are only talent/feat name collisions (e.g. Familiar Foe in NPC stat blocks, Independent Spirit and Executive Leadership as talent audit data).
- `packs/classes.db` level progressions contain no feature entries keyed to any of the 18 (`featureKey` search: 0 hits each). Ownership today is therefore not granted as an owned feature Item for these.
- The merged precedent for ownership is `item.type === 'feat' && system.sourceType === 'class-feature' && system.featureKey === '<class>.<key>'` (see `scripts/engine/combat/class-command-cover.js`), with class level from the single owned class Item. Action costs via `ActionEconomyConsumption` (see Quick Sabotage in `scripts/skills/skill-uses.js`).
- **Blocker for every feature:** a grant path (class level -> owned class-feature Item with `featureKey`) must exist before a consumer is meaningful. Its owner (`levelup-entitlement-manifest` / `class-scaling-feature-upsert.js`) needs a design pass first.

## BEFORE table

Source text below is from OCR and the registry `sourceText`; `?` = no legible printed text located.

| Feature (class) | Printed source (OCR) | Consumer today | Missing behavior | GM input | Dependency | Status |
|---|---|---|---|---|---|---|
| Familiar Foe (Bounty Hunter) | Core Rulebook, Bounty Hunter | none | observation lifecycle, attack + Reflex vs that opponent | confirm target | shared observation seam | rules-ready |
| Targeted Suspect (Enforcer) | Force Unleashed CG, Enforcer | none | observation; attack + Deception/Perception/Persuasion | confirm target | shared seam | rules-ready |
| Surprise Attack (Vanguard) | Clone Wars CG, Vanguard | none | first attack/round vs unaware or Dex-denied | awareness | none | **ambiguous OCR** (see CF-RD-005) |
| Veteran Privateer (Master Privateer) | Force Unleashed CG | none | free-action +2 competence, uses = floor(lvl/2) | none | attack-math seam | **conflict** CF-RD-002 |
| Independent Spirit (Independent Droid) | Force Unleashed CG | none | reaction morale bonus to a defense | none | action economy | **conflict** CF-RD-003 |
| Unflinching (Gladiator) | Knights of the Old Republic CG | none | reaction; Fort (and Damage Threshold) or Will; declare before outcome | none | action economy | **conflict** CF-RD-004 |
| Tough as Durasteel (Martial Arts Master) | Galaxy at War (OCR garbled) | none | not determinable | none | none | **BLOCKED** CF-RD-001 |
| Master of Movement (Melee Duelist) | Knights of the Old Republic CG | none | choice: ignore difficult-terrain/low-object penalty on one move action, or reroll one Jump/Acrobatics keep better; uses = floor(lvl/2) | terrain | skill dispatch | rules-ready |
| Fugitive (Outlaw) | Scum and Villainy (no legible OCR) | none | not determinable | terrain | none | **BLOCKED** CF-RD-001 |
| Executive Leadership (Corporate Agent) | Knights of the Old Republic CG | none | swift; ally in LOS; until end of their turn: +2 speed, or +2 morale attack, or +2 morale all defenses | ally/LOS | cross-actor effects | rules-ready |
| Mark (Assassin) | Scum and Villainy (no legible OCR) | none | not determinable | target | none | **BLOCKED** CF-RD-001 |
| Score (Charlatan) | Scum and Villainy (no legible OCR) | none | not determinable | target | shared seam | **BLOCKED** CF-RD-001 |
| Unexpected Results (Saboteur) | Force Unleashed CG | none | enemy natural 1 with advanced melee weapon, lightsaber, pistol, rifle or heavy weapon: weapon disabled until repaired (Mechanics repair) | weapon type | repair path | rules-ready |
| Networked Mind (Droid Commander) | Clone Wars CG | none | designate floor(lvl/2) droid allies, free action, locked for encounter; comlink LOS | allies/comms | Force/droid-immunity owner | **Wave F, wait** |
| Sapience (Independent Droid) | Force Unleashed CG | none | droid immunities may not apply to mind-affecting effects; behavioral inhibitor off; restraining-bolt immunity | benefit | Force/droid-immunity owner | **Wave F, wait** |
| Delay Damage (Elite Trooper) | Core Rulebook | none | once/encounter reaction, delay a single attack/ability/effect until end of next turn | none | damage-packet replay | **Wave G, high risk** |
| Vehicle Dodge (Ace Pilot) | Core Rulebook | none | dodge bonus to Reflex of piloted vehicle; lost with Dex-bonus loss; **dodge bonuses stack** | none | vehicle authority | **conflict** CF-RD-006 |
| No Tools Required (Improviser) | Rebellion Era CG (OCR garbled) | none | treated as using Tool Kit/Security Kit for Mechanics/Use Computer | none | none | **BLOCKED** CF-RD-001 |

## Registry summary vs printed text (discrepancies)
The registry `sourceText` is a paraphrase and differs from the OCR text in places that change behavior. Not corrected here: see CF-RD-002..006 in `swse-rules-decisions-pending.md`.

## Recommended order (unchanged from contract, with findings)
1. Grant-path design note (shared by all) — needed before any consumer.
2. Wave B: Familiar Foe + Targeted Suspect (both have legible text and no conflicts). Score is blocked on the printed text.
3. Master of Movement, Executive Leadership, Unexpected Results are rules-ready after the grant path exists.
4. Items with open rulings stay deferred until the project owner answers.

## Certification
All 18: `SOURCE_VERIFIED` not yet (OCR only), `IMPLEMENTED` no, `OFFLINE_TESTED` no, `FOUNDRY_TESTED` no.

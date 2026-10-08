# SWSE Class Canonicalization — Phase 6B Prestige Source Audit

**Date:** 2026-10-08  
**Branch:** `audit/class-canonicalization-phase-6a`  
**Baseline:** `packs/classes.db` blob `2960a03039604ea06612445bad0673902a8012cc`  
**Machine ledger:** `data/audits/class-phase-6b-prestige-source-ledger.json`  
**Mutation policy:** Read-only. No production class or prerequisite records changed.

## Executive finding

All **32 prestige classes** have been compared against the printed sourcebook class tables and relevant requirement sections in **8 sourcebooks**. Sourcebook PDFs are primary; user-supplied DJVU text is used only for rapid navigation and wording support. This is a **source-data audit**, not Foundry runtime execution or a certification of the full text/automation of every class feature.

| Check | Result |
|---|---:|
| Prestige records / source table coverage | **32/32** |
| Sourcebooks represented | **8** |
| Repository level-by-level BAB tables match printed progression | **32/32** |
| Hit die values match printed class rules | **32/32** |
| Prestige defense bonuses match printed rules | **32/32** |
| Prestige prerequisite records present | **32/32** |
| BAB metadata labels inconsistent with printed tables | **10** |
| Additional source/representation findings | **13** |
| Runtime feature/application tests | **Not performed** |

**Important:** A populated prerequisite record is not proof that every prerequisite is represented or enforced. The Jedi Knight, Independent Droid, and Martial Arts Master records are explicit counterexamples.

## Full class source ledger

Printed page numbers are used. `Source BAB` is derived from the published level table, not the current metadata label.

| Prestige class | Sourcebook pages | Source BAB | Metadata | Finding IDs |
|---|---|---|---|---|
| Martial Arts Master | Galaxy at War 32-33 | fast | **label mismatch** | 6B-004 |
| Corporate Agent | KOTOR 41-42 | medium | match | 6B-011 |
| Gladiator | KOTOR 43-45 | fast | **label mismatch** | none |
| Melee Duelist | KOTOR 46-47 | fast | **label mismatch** | none |
| Imperial Knight | Legacy 43-45 | fast | **label mismatch** | none |
| Shaper | Legacy 46-47 | medium | match | none |
| Improviser | Rebellion 41-43 | medium | match | 6B-005 |
| Pathfinder | Rebellion 44-45 | medium | match | none |
| Ace Pilot | Core 206-207 | medium | match | none |
| Bounty Hunter | Core 207-209 | fast | match | none |
| Crime Lord | Core 209-210 | medium | match | 6B-007 |
| Elite Trooper | Core 211-212 | fast | match | none |
| Force Adept | Core 212-214 | medium | match | none |
| Force Disciple | Core 214-215 | medium | match | 6B-006 |
| Gunslinger | Core 216-217 | fast | match | none |
| Jedi Knight | Core 217-219 | fast | match | 6B-002 |
| Jedi Master | Core 219-220 | fast | match | none |
| Officer | Core 220-221 | fast | **label mismatch** | 6B-001 |
| Sith Apprentice | Core 222-223 | fast | **label mismatch** | 6B-010 |
| Sith Lord | Core 223-224 | fast | match | 6B-010 |
| Assassin | Scum & Villainy 28-29 | fast | **label mismatch** | 6B-013 |
| Charlatan | Scum & Villainy 30-31 | medium | match | none |
| Outlaw | Scum & Villainy 34-35 | medium | match | none |
| Droid Commander | Clone Wars 42-43 | fast | **label mismatch** | none |
| Military Engineer | Clone Wars 44-45 | medium | match | none |
| Vanguard | Clone Wars 46-47 | fast | **label mismatch** | none |
| Enforcer | Force Unleashed 43-45 | medium | match | none |
| Independent Droid | Force Unleashed 46-47 | medium | match | 6B-003 |
| Infiltrator | Force Unleashed 48-49 | medium | match | 6B-008, 6B-013 |
| Master Privateer | Force Unleashed 50-52 | fast | **label mismatch** | 6B-009, 6B-012 |
| Medic | Force Unleashed 52-54 | medium | match | none |
| Saboteur | Force Unleashed 54-56 | medium | match | none |

The three five-level apex classes — **Jedi Master, Sith Lord, and Force Disciple** — retain their correct five-level published tables. The other 29 prestige classes have ten-level tables. The printed class-feature tables are the progression authority; class-level bonus-feat cadence must not be inferred from heroic base classes.

## Source-backed discrepancies and risk items

### 6B-001 — PROGRESSION_WRONG_CHOICE (CRITICAL)

**Classes:** Officer. **Source:** Core p.221, Table 12-11.

**Evidence:** Published Officer progression grants Share Talent at levels 2,4,6,8,10 and Command Cover once at level 2; repository instead adds normal talent_choice at even levels and repeated Command Cover +1..+5, without Share Talent.

**Correction boundary:** Model five typed share-talent selections and one Command Cover grant; preserve normal talent choices only at odd levels.

### 6B-002 — MISSING_ENTRY_REQUIREMENT (HIGH)

**Classes:** Jedi Knight. **Source:** Core p.218, Requirements.

**Evidence:** Printed special prerequisite requires having built one's own lightsaber; data/prestige-class-prerequisites.json omits it.

**Correction boundary:** Add a verifiable construction requirement or explicit GM adjudication gate; avoid assuming merely owning a lightsaber is sufficient.

### 6B-003 — MISSING_ENTRY_REQUIREMENT (HIGH)

**Classes:** Independent Droid. **Source:** TFU p.47, Requirements.

**Evidence:** Printed Special: Droids only; prerequisite JSON includes heuristic processor and Use Computer but not droid-only.

**Correction boundary:** Add typed droid-only requirement; test organic actor denied.

### 6B-004 — INCOMPLETE_ENTRY_REQUIREMENT (HIGH)

**Classes:** Martial Arts Master. **Source:** Galaxy at War p.32, Requirements.

**Evidence:** Printed feats require Martial Arts I, Martial Arts II, Melee Defense, and at least one from an enumerated list of martial arts style feats. JSON lacks a structured OR list and only says '1 Martial Arts Feat' in prose.

**Correction boundary:** Encode all published style feats in a typed OR group and verify Martial Arts I/II prerequisite chain.

### 6B-005 — MALFORMED_PROGRESSION (HIGH)

**Classes:** Improviser. **Source:** Rebellion Era p.41, Table 2-2.

**Evidence:** Published Contraband is a single feature at levels 2,4,6,8,10 with amounts 2k,4k,6k,8k,10k; repo splits labels around commas into two features and also emits 3k,5k,7k,9k odd-level fragments.

**Correction boundary:** Fix generator/parser, not just emitted DB; use one typed feature at the five printed levels.

### 6B-006 — DUPLICATED_ONE_TIME_FEATURE (MEDIUM)

**Classes:** Force Disciple. **Source:** Core p.215, Table 12-7.

**Evidence:** Prophet appears as a first-level class feature in printed table; repo includes Prophet in class_feature entries at levels 1-5. Published ability describes per-level benefit, which must not be confused with repeat grants.

**Correction boundary:** Grant Prophet once; derive its per-level benefit from class level advancement.

### 6B-007 — DUPLICATED_SCALING_FEATURE (MEDIUM)

**Classes:** Crime Lord. **Source:** Core pp.209-210, Table 12-4 and Command Cover.

**Evidence:** Command Cover is granted at level 2 and its magnitude is computed from adjacent allies and half class level; repo repeats Command Cover +1..+5 at even levels.

**Correction boundary:** Represent Command Cover as one scaling feature, not five independently stacking grants; retain Crime Lord talent choices at every level.

### 6B-008 — MALFORMED_FEATURE_LABEL (MEDIUM)

**Classes:** Infiltrator. **Source:** TFU p.49, Table 3-4.

**Evidence:** Printed Unarmed Stun increases by +1 die, +2 dice, +3 dice; repository labels contain +1d_, +2d_, +3d_ placeholders.

**Correction boundary:** Use canonical feature labels and typed dice-count scaling.

### 6B-009 — SOURCE_FEATURE_LABEL (MEDIUM)

**Classes:** Master Privateer. **Source:** TFU pp.51-52, Piracy.

**Evidence:** Printed feature is called Piracy; repo labels the level-1 class feature 'Lure of Piracy'. Both concern loss of further privateer progression after falling to the dark side.

**Correction boundary:** Canonicalize displayed name; encode ongoing class advancement restriction separately.

### 6B-010 — ONGOING_CLASS_ACCESS_CONDITION (HIGH)

**Classes:** Sith Apprentice, Sith Lord. **Source:** Core pp.223-224, Requirements.

**Evidence:** Published classes lose access to their class features if Dark Side Score falls below Wisdom; the prerequisite JSON records full DSP as an entry requirement but not an ongoing class-feature suspension policy.

**Correction boundary:** Add actor-state-based suspend/resume policy; do not remove earned levels or talents.

### 6B-011 — ONGOING_CLASS_ACCESS_CONDITION (MEDIUM)

**Classes:** Corporate Agent. **Source:** KOTOR p.42, Employment Required.

**Evidence:** Source prohibits gaining new Corporate Agent levels while not employed by a major interstellar corporation. Entry JSON contains employment as prose but does not itself express an ongoing leveling gate.

**Correction boundary:** Model eligibility for subsequent levels separately from first-level entry.

### 6B-012 — ONGOING_CLASS_ACCESS_CONDITION (MEDIUM)

**Classes:** Master Privateer. **Source:** TFU p.52, Piracy.

**Evidence:** Source bars additional Master Privateer levels once lost to the dark side; entry JSON has no typed ongoing condition.

**Correction boundary:** Enforce at later level-up, without stripping existing levels.

### 6B-013 — LEGACY_TREE_PROJECTION (LOW)

**Classes:** Assassin, Infiltrator. **Source:** Scum p.29; TFU p.49.

**Evidence:** Raw talent_trees mixes names GenoHaradan/Bothan SpyNet with IDs, but canonical talentTreeSourceIds resolves both correctly.

**Correction boundary:** Normalize legacy raw field through generator without disturbing canonical IDs.


## Ten confirmed prestige BAB metadata discrepancies

These classes have a **full +1 per prestige level** published BAB table and the repository stores the same full table, but the `babProgression` metadata is `medium`:

- **Martial Arts Master** — Galaxy at War pp. 32-33
- **Gladiator** — KOTOR pp. 43-45
- **Melee Duelist** — KOTOR pp. 46-47
- **Imperial Knight** — Legacy pp. 43-45
- **Officer** — Core pp. 220-221
- **Sith Apprentice** — Core pp. 222-223
- **Assassin** — Scum & Villainy pp. 28-29
- **Droid Commander** — Clone Wars pp. 42-43
- **Vanguard** — Clone Wars pp. 46-47
- **Master Privateer** — Force Unleashed pp. 50-52

**Do not globally replace `medium` or `slow` with new semantics.** Some existing consumers use `slow` to mean 1/2 BAB, while others treat it as 3/4. Prefer the explicit per-level published table as numeric authority and fix fallback consumers intentionally. Phase 6A separately found the Noble label mismatch, bringing the combined Phase 6A+6B metadata inventory to **11 classes**.

## Prerequisite completeness notes

The printed requirements have been checked for the 32 classes at the sourcebook-section level. **Three clear prerequisite data gaps** need correction:

- **Jedi Knight:** built own lightsaber special prerequisite is absent from the JSON.
- **Independent Droid:** the droid-only requirement is absent from the JSON.
- **Martial Arts Master:** the required OR-choice among **Echani Training, Hijkata Training, K'tara Training, K'thri Training, Stava Training, Tae-Jitsu Training, Teräs Käsi Training, and Wrruushi Training** is not encoded as a typed prerequisite. Martial Arts I should also be accounted for, directly or through the Martial Arts II prerequisite chain.

Further **ongoing** requirements are distinct from first-level eligibility:

- **Sith Apprentice / Sith Lord:** suspend class features when DSP falls below Wisdom; restore when equal.
- **Corporate Agent:** no new class levels without qualifying corporate employment.
- **Master Privateer:** cannot take further levels after falling to the dark side.

The presence of free-form `other` text in `data/prestige-class-prerequisites.json` is not, by itself, proof of a runtime enforcement boundary.

## What is healthy

- All 32 prestige class IDs and class records are present.
- Published BAB **numeric tables**, hit dice, and defense bonuses match the current class pack in the checked source material.
- The 3 apex classes correctly stop at level 5.
- Shaper correctly has `grants_force_points=false`, matching the Yuuzhan Vong source rule.
- Odd-level normal talent cadence is present where expected, but **Officer** and **Crime Lord** must be treated specially: Officer has a different even-level selection type; Crime Lord has normal talent selection every level.
- Class talent-tree source references resolved during Phase 6A (178/178 across all classes); source-identity reconciliation continues in Phase 6C.

## Recommended Phase 6C/6D sequencing

1. **Fix authority and generators first:** identify what writes `packs/classes.db` and which compatibility maps are consumed. Preserve source IDs and prevent comma-splitting feature names.
2. **Prioritize progression legality:** Officer Share Talent, Jedi Knight constructed lightsaber, Independent Droid droid-only, Martial Arts Master style-feat OR.
3. **Normalize feature representation:** Improviser, Infiltrator, Force Disciple Prophet, Crime Lord Command Cover, Master Privateer Piracy.
4. **Enforce continuing state restrictions:** Sith DSP, corporate employment, privateer dark-side status. Do not confuse entry checks with loss of features.
5. **Correct BAB metadata carefully** and add regression tests proving the actual BAB table is used for every prestige class.
6. **Then run Foundry V13/V2 runtime certification** for class entry, multiclassing, grants, scaling, repeat choice entitlements, and advancement at levels 1-10/1-5.

No production patch is authorized by this audit alone. Keep this branch separate from Claude's active runtime work.

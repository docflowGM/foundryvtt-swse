# SWSE class canonicalization — Phase 6C: starting feats, bonus-feat lists, and class-feature unlocks

**Date:** November 2, 2026  
**Branch / draft PR:** `fix/class-mechanics-core-skills` / [#1093](https://github.com/docflowGM/foundryvtt-swse/pull/1093)  
**Machine audit:** `docs/audits/class-phase-6c-starting-feats-features-ledger.json`  
**Scope:** Read-only audit. Five base-class starting feats, five class bonus-feat pools, all 37 classes' typed level-unlock rows. **Talent-tree membership, identity, and descriptions explicitly deferred.** No `packs/*.db`, feat, talent-tree, or class-feature runtime data modified by Phase 6C.

## Executive result

| Audit measure | Observation |
|---|---:|
| Class records | **37 / 37 inventoried** (5 base, 32 prestige) |
| Base starting-feature package entries | **18** |
| Base class feat-choice unlock entries | **50**, exactly 10 each at even class levels 2–20 |
| Bonus feat lists with a class-owned key | **5 / 5** |
| Generated bonus feat IDs | Scoundrel **80**, Noble **55**, Scout **79**, Soldier **140**, Jedi **79** |
| IDs that fail to resolve in production `packs/feats.db` | **0** (353 canonical feats in pack) |
| Typed class progression feature/choice entries | **504** across all 37 classes |
| Class-feature catalog definitions | **53**: 40 ACTIVE/STUB, 8 ACTIVE/CHOICE_GRANT, 3 PASSIVE/RULE, 2 INFO_ONLY |
| High-confidence issues / review risks recorded | **11** issue groups |
| Printed source verification | Published Core class starting feats checked; Phase 6B printed-source findings reused; Charlatan printed page 31 directly visually inspected; **not every feature's full effect or every supplemental feat-list addition was independently verified** |
| Actual Foundry v13 application / automation certification | **NOT PERFORMED** |

**Interpretation:** The basic class progression scaffolding exists for all 37 records. Base starting feat packages agree with the printed Core class descriptions. The significant problems are not absent classes, but class-specific unlock types, malformed feature rows, extra materialized grants and incomplete separation of descriptive lists from canonical feat identities.

### Source authority and limitations

- `Star Wars Saga Edition` Core Rulebook printed pp. 38–53 (five heroic classes), pp. 206–224 (Core prestige).
- `Rebellion Era Campaign Guide` p. 41 (Improviser), `The Force Unleashed Campaign Guide` pp. 43–52 (Enforcer, Infiltrator, Master Privateer), `Scum and Villainy` p. 31 (Charlatan).
- Oct. 8 source-certified evidence: `data/audits/class-phase-6b-prestige-source-ledger.json`, covering 32 prestige tables' BAB, HD, and defenses and 13 targeted class source/representation anomalies. The existing ledger **does not imply complete certification of every feature row**.
- Canonical production and runtime: `packs/classes.db`, `data/generated/class-feat-list-bindings.json`, `packs/feats.db`, `scripts/engine/progression/feats/class-feat-registry.js`, `feat-slot-validator.js`, and `scripts/engine/progression/utils/levelup-entitlement-manifest.js`.
- TXT corpus was used for search and navigation; printed PDFs and previous PDF-reviewed ledger are authority on ambiguous text.

## 1. Heroic starting feats — Core source comparison

| Base class | Printed / stored starter package | Bonus feat class levels | Additional fixed class-feature unlocks |
|---|---|---|---|
| Jedi | Force Sensitivity; Weapon Proficiency (Lightsabers); Weapon Proficiency (Simple Weapons) | 2, 4, 6, 8, 10, 12, 14, 16, 18, 20 | L1 Lightsaber; L7 Lightsaber Construction |
| Noble | Linguist*; Weapon Proficiency (Pistols); Weapon Proficiency (Simple Weapons) | 2, 4, 6, 8, 10, 12, 14, 16, 18, 20 | — |
| Scoundrel | Point-Blank Shot; Weapon Proficiency (Pistols); Weapon Proficiency (Simple Weapons) | 2, 4, 6, 8, 10, 12, 14, 16, 18, 20 | — |
| Scout | Shake It Off*; Weapon Proficiency (Pistols); Weapon Proficiency (Rifles); Weapon Proficiency (Simple Weapons) | 2, 4, 6, 8, 10, 12, 14, 16, 18, 20 | — |
| Soldier | Armor Proficiency (Light); Armor Proficiency (Medium); Weapon Proficiency (Pistols); Weapon Proficiency (Rifles); Weapon Proficiency (Simple Weapons) | 2, 4, 6, 8, 10, 12, 14, 16, 18, 20 | — |

**Result:** 18/18 named starting-package entries align with the Core. Note: **Noble's Linguist is conditional on INT 13**. **Scout's Shake It Off is conditional on CON 13 and trained Endurance**. The pack uses a trailing asterisk to mark those conditional feats, and `class-grant-ledger-builder.js` has a prerequisite-checking path, so they should **not** be treated as unconditional starting feats. First-heroic-level starter packages and later multiclass starting-feat selection are different entitlements. Non-base prestige classes have empty `starting_features` on purpose.

**Runtime follow-up:** Test Noble INT 12/13 and Scout CON 12/13 with Endurance untrained/trained; verify conditional grant and no-grant in real CharGen, including provisional grant reconciliation. Verify a hero entering another base class later gets *one eligible starting-feat selection* (not the entire starter package), with optional configured multiclass house rules tested separately. `levelup-entitlement-manifest.js` explicitly evaluates legality but no live Foundry test was performed here.

## 2. Bonus-feat pools and membership authority

| Base class | List key | Descriptive feat names | Canonical feat IDs | Names minus IDs |
|---|---|---:|---:|---:|
| Scoundrel | `scoundrel_feats` | 82 | 80 | 2 |
| Noble | `noble_feats` | 59 | 55 | 4 |
| Scout | `scout_feats` | 82 | 79 | 3 |
| Soldier | `soldier_feats` | 144 | 140 | 4 |
| Jedi | `jedi_feats` | 81 | 79 | 2 |

The first four counts are **not evidence of that many missing feats**: Weapon Proficiency (and Jedi's Weapon Focus) are parameterized feats with one canonical ID and multiple group-specific display names. The generated registry holds class-specific allowed group names as text but `FeatSlotValidator` currently checks only canonical feat `_id` membership. This leaves a *specific-selection legality* question: does the choice UI enforce the class's permitted weapon group when a generic feat ID is valid? That requires runtime tests, not assumptions.

**Verified descriptive/ID discrepancy:** `Wicked Strike` (canonical feat ID `5bef5e65e532ba7c`) exists in `packs/feats.db`, and appears under both Noble and Jedi `featNames`, but its ID is absent from both corresponding `featIds`. **Published class bonus-feat eligibility for that feat still needs independent source verification before adding it.** All existing listed IDs resolve in the 353-feat production compendium.

**Source-scope limitation:** The five lists include Core feats plus many expansion-book additions. Core table membership was checked for the five heroic classes, but every added feat's published *class bonus feat eligibility* across later sourcebooks has **not** been recertified in this pass. Do not indiscriminately add or remove expansion feats to make names or counts coincide.

## 3. Class-feature unlock matrix — all prestige classes

**Reading this matrix:** The choices column is typed class-choice entitlements, *not* talent-tree membership verification. The final column is what the **repository currently stores**, not necessarily what the publication permits. Parenthesized level labels are raw production labels, including known corruption. "Defense Bonuses" at level 1 is universal and omitted from the final column for legibility.

| Prestige class | Published class source | Repository choice levels | Other stored feature unlocks (class levels) |
|---|---|---|---|
| Ace Pilot | Saga Edition Core Rulebook pp. 206-207 | talent L1, 3, 5, 7, 9 | Vehicle Dodge: 2 (Vehicle Dodge +1), 4 (Vehicle Dodge +2), 6 (Vehicle Dodge +3), 8 (Vehicle Dodge +4), 10 (Vehicle Dodge +5) |
| Assassin | Scum and Villainy pp. 28-29 | talent L1, 3, 5, 7, 9 | Mark: 2 (Mark +1), 4 (Mark +2), 6 (Mark +3), 8 (Mark +4), 10 (Mark +5) |
| Bounty Hunter | Saga Edition Core Rulebook pp. 207-209 | talent L1, 3, 5, 7, 9 | Familiar Foe: 2 (Familiar Foe +1), 4 (Familiar Foe +2), 6 (Familiar Foe +3), 8 (Familiar Foe +4), 10 (Familiar Foe +5) |
| Charlatan | Scum and Villainy pp. 30-31 | talent L1, 3, 5, 7, 9 | Score: 2; Swindle: 4, 6 (Swindle +1), 8 (Swindle +2), 10 (Swindle +5) |
| Corporate Agent | Knights of the Old Republic Campaign Guide pp. 41-42 | talent L1, 3, 5, 7, 9 | Executive Leadership: 2 (Executive Leadership (1/Encounter)), 4 (Executive Leadership (2/Encounter)), 6 (Executive Leadership (3/Encounter)), 8 (Executive Leadership (4/Encounter)), 10 (Executive Leadership (5/Encounter)) |
| Crime Lord | Saga Edition Core Rulebook pp. 209-210 | talent L1, 2, 3, 4, 5, 6, 7, 8, 9, 10 | Command Cover: 2 (Command Cover +1), 4 (Command Cover +2), 6 (Command Cover +3), 8 (Command Cover +4), 10 (Command Cover +5) |
| Droid Commander | The Clone Wars Campaign Guide pp. 42-43 | talent L1, 3, 5, 7, 9 | Networked Mind (1 Droid Ally): 2; Networked Mind (2 Droid Allies): 4; Networked Mind (3 Droid Allies): 6; Networked Mind (4 Droid Allies): 8; Networked Mind (5 Droid Allies): 10 |
| Elite Trooper | Saga Edition Core Rulebook pp. 211-212 | talent L1, 3, 5, 7, 9 | Delay Damage: 1; Damage Reduction 1: 2; Damage Reduction 2: 4; Damage Reduction 3: 6; Damage Reduction 4: 8; Damage Reduction 5: 10 |
| Enforcer | The Force Unleashed Campaign Guide pp. 43-45 | talent L1, 3, 5, 7, 9 | Resources: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10; Targeted Suspect: 2 (Targeted Suspect +1), 4 (Targeted Suspect +2), 6 (Targeted Suspect +3), 8 (Targeted Suspect +4), 10 (Targeted Suspect +5) |
| Force Adept | Saga Edition Core Rulebook pp. 212-214 | talent L1, 3, 5, 7, 9; force technique L2, 4, 6, 8, 10 | Force Technique: 2, 4, 6, 8, 10 |
| Force Disciple | Saga Edition Core Rulebook pp. 214-215 | talent L1, 3, 5; force secret L2, 3, 4, 5 | Indomitable: 1; Prophet: 1, 2, 3, 4, 5; Force Secret: 2, 3, 4, 5 |
| Gladiator | Knights of the Old Republic Campaign Guide pp. 43-45 | talent L1, 3, 5, 7, 9 | Unflinching: 2 (Unflinching (1/Encounter)), 4 (Unflinching (2/Encounter)), 6 (Unflinching (3/Encounter)), 8 (Unflinching (4/Encounter)), 10 (Unflinching (5/Encounter)) |
| Gunslinger | Saga Edition Core Rulebook pp. 216-217 | talent L1, 3, 5, 7, 9 | Trusty Sidearm: 2 (Trusty Sidearm +1), 4 (Trusty Sidearm +2), 6 (Trusty Sidearm +3), 8 (Trusty Sidearm +4), 10 (Trusty Sidearm +5) |
| Imperial Knight | Legacy Era Campaign Guide pp. 43-45 | talent L1, 3, 5, 7, 9; force technique L2, 4, 6, 8, 10 | Force Technique: 2, 4, 6, 8, 10 |
| Improviser | Rebellion Era Campaign Guide pp. 41-43 | talent L1, 3, 5, 7, 9 | No Tools Required: 1; Contraband (2: 2; 000 credits): 2, 3, 4, 5, 6, 7, 8, 9, 10; Contraband (3: 3; Contraband (4: 4; Contraband (5: 5; Contraband (6: 6; Contraband (7: 7; Contraband (8: 8; Contraband (9: 9; Contraband (10: 10 |
| Independent Droid | The Force Unleashed Campaign Guide pp. 46-47 | talent L1, 3, 5, 7, 9 | Sapience: 1; Independent Spirit: 2 (Independent Spirit +1), 4 (Independent Spirit +2), 6 (Independent Spirit +3), 8 (Independent Spirit +4), 10 (Independent Spirit +5) |
| Infiltrator | The Force Unleashed Campaign Guide pp. 48-49 | talent L1, 3, 5, 7, 9 | Unarmed Stun: 2 (Unarmed Stun (+1d_)), 6 (Unarmed Stun (+2d_)), 10 (Unarmed Stun (+3d_)); Lead Infiltrator: 4; Lead Infiltrator (x2): 8 |
| Jedi Knight | Saga Edition Core Rulebook pp. 217-219 | talent L1, 3, 5, 7, 9; force technique L2, 4, 6, 8, 10 | Force Technique: 2, 4, 6, 8, 10 |
| Jedi Master | Saga Edition Core Rulebook pp. 219-220 | talent L1, 3, 5; force secret L2, 3, 4, 5 | Fearless: 1; Serenity: 1; Force Secret: 2, 3, 4, 5 |
| Martial Arts Master | Galaxy at War pp. 32-33 | talent L1, 3, 5, 7, 9 | Tough as Durasteel: 2 (Tough as Durasteel +2), 4 (Tough as Durasteel +4), 6 (Tough as Durasteel +6), 8 (Tough as Durasteel +8), 10 (Tough as Durasteel +10) |
| Master Privateer | The Force Unleashed Campaign Guide pp. 50-52 | talent L1, 3, 5, 7, 9 | Lure of Piracy: 1; Veteran Privateer: 2 (Veteran Privateer (1/Encounter)), 4 (Veteran Privateer (2/Encounter)), 6 (Veteran Privateer (3/Encounter)), 8 (Veteran Privateer (4/Encounter)), 10 (Veteran Privateer (5/Encounter)) |
| Medic | The Force Unleashed Campaign Guide pp. 52-54 | talent L1, 3, 5, 7, 9; medical secret L2, 4, 6, 8, 10 | Medical Secret: 2, 4, 6, 8, 10 |
| Melee Duelist | Knights of the Old Republic Campaign Guide pp. 46-47 | talent L1, 3, 5, 7, 9 | Master of Movement: 2 (Master of Movement (1/Encounter)), 4 (Master of Movement (2/Encounter)), 6 (Master of Movement (3/Encounter)), 8 (Master of Movement (4/Encounter)), 10 (Master of Movement (5/Encounter)) |
| Military Engineer | The Clone Wars Campaign Guide pp. 44-45 | talent L1, 3, 5, 7, 9 | Field-Created Weapon: 2 (Field-Created Weapon +1), 4 (Field-Created Weapon +2), 6 (Field-Created Weapon +3), 8 (Field-Created Weapon +4), 10 (Field-Created Weapon +5) |
| Officer | Saga Edition Core Rulebook pp. 220-221 | talent L1, 2, 3, 4, 5, 6, 7, 8, 9, 10 | Command Cover: 2 (Command Cover +1), 4 (Command Cover +2), 6 (Command Cover +3), 8 (Command Cover +4), 10 (Command Cover +5) |
| Outlaw | Scum and Villainy pp. 34-35 | talent L1, 3, 5, 7, 9 | Fugitive: 2 (Fugitive +1), 4 (Fugitive +2), 6 (Fugitive +3), 8 (Fugitive +4), 10 (Fugitive +5) |
| Pathfinder | Rebellion Era Campaign Guide pp. 44-45 | talent L1, 3, 5, 7, 9 | Create Cover: 2 (Create Cover (1 Square)), 4 (Create Cover (2 Squares)), 6 (Create Cover (3 Squares)), 8 (Create Cover (4 Squares)), 10 (Create Cover (5 Squares)) |
| Saboteur | The Force Unleashed Campaign Guide pp. 54-56 | talent L1, 3, 5, 7, 9 | Unexpected Results: 1; Destructive: 2; Quick Sabotage (Simple Devices): 4; Quick Sabotage (Tricky Devices): 6; Quick Sabotage (Complex Devices): 8; Master Saboteur: 10 |
| Shaper | Legacy Era Campaign Guide pp. 46-47 | talent L1, 3, 5, 7, 9 | Shaper Lore: 2 (Shaper Lore +1), 4 (Shaper Lore +2), 6 (Shaper Lore +3), 8 (Shaper Lore +4), 10 (Shaper Lore +5); Shaper Hand: 6 |
| Sith Apprentice | Saga Edition Core Rulebook pp. 222-223 | talent L1, 3, 5, 7, 9; force technique L2, 4, 6, 8, 10 | Force Technique: 2, 4, 6, 8, 10 |
| Sith Lord | Saga Edition Core Rulebook pp. 223-224 | talent L1, 3, 5; force secret L2, 3, 4, 5 | Fearless: 1; Temptation: 1; Force Secret: 2, 3, 4, 5 |
| Vanguard | The Clone Wars Campaign Guide pp. 46-47 | talent L1, 3, 5, 7, 9 | Surprise Attack: 2 (Surprise Attack +1), 4 (Surprise Attack +2), 6 (Surprise Attack +3), 8 (Surprise Attack +4), 10 (Surprise Attack +5) |

### Schedules that are structurally correct

- Heroic classes: talents (choice entitlements only) at odd class levels **1,3,…,19**, bonus feats at even class levels **2,4,…,20**; first-level defense and starter package present.
- Force Technique selection: **Jedi Knight, Sith Apprentice, Force Adept, Imperial Knight** at class levels **2,4,6,8,10** (20 records).
- Force Secret selection: **Jedi Master, Sith Lord, Force Disciple** at class levels **2,3,4,5** (12 records).
- Medical Secret selection: **Medic** at levels **2,4,6,8,10** (5 records).
- All 32 prestige classes have level-1 defense entries. Three five-level apex classes remain five-level: Jedi Master, Sith Lord, Force Disciple.
- **Crime Lord** explicitly receives a normal talent choice at every class level (not an Officer-like error). **Officer** is the exception that currently has erroneous even-level normal `talent_choice` records.
- Jedi `Lightsaber Construction` at base class level 7 is present in the data. Its underlying crafting mechanic was reported as implemented elsewhere; that mechanism is outside this unlock audit.

## 4. Source-backed issues, implementation risks and confidence

### 6C-001 — wrong choice type and schedule (CRITICAL)

**Classes:** Officer. Printed Core p221 Share Talent on levels 2/4/6/8/10; repository has ordinary talent_choice on even levels with no share_talent_choice. The even-level class talent choices are not valid replacements.

**Target correction:** Odd levels ordinary talent; even levels distinct Share Talent picks.

### 6C-002 — malformed and extra unlocks (HIGH)

**Classes:** Improviser. Rebellion p41 Contraband appears only at levels 2/4/6/8/10, values 2k to 10k. Production includes comma-split fragments at levels 2-10, including odd levels.

**Target correction:** One contraband entry at each printed even level, no fragments or odd-level grants.

### 6C-003 — repeated once acquired feature (HIGH)

**Classes:** Force Disciple. Core p215 Prophet granted at class level 1, currently emitted as class_feature at levels 1-5.

**Target correction:** Grant Prophet once at level 1, compute later level effects from progression.

### 6C-004 — repeated scaling feature (HIGH)

**Classes:** Crime Lord, Officer. Core pp209-210 and 221 Command Cover granted once and scales according to class level/context; current pack emits separate grants at 2/4/6/8/10.

**Target correction:** One class feature with separate derived scaling, no additive duplicates.

### 6C-005 — repeated once acquired feature candidate (MEDIUM)

**Classes:** Enforcer. Force Unleashed pp43-45 table lists Resources at level 1, whereas production emits Resources as independent class_feature at each of 1-10. Descriptive resource allotment may recur by level.

**Target correction:** Source-check and model one level-1 grant with level-based resources rather than repeated item grants.

### 6C-006 — malformed label (MEDIUM)

**Classes:** Infiltrator. Force Unleashed p49 Unarmed Stun at 2/6/10 currently stores +1d_, +2d_, +3d_ placeholder labels.

**Target correction:** Printed dice values and typed progressions; preserve 2/6/10 unlock cadence.

### 6C-007 — incorrect feature name (MEDIUM)

**Classes:** Master Privateer. Force Unleashed pp51-52 calls first-level feature Piracy; pack calls it Lure of Piracy.

**Target correction:** Source-aligned player-readable name.

### 6C-008 — feat binding name id mismatch (HIGH)

**Classes:** Noble, Jedi. Both class descriptive featNames include Wicked Strike, but their canonical featIds omit existing canonical Wicked Strike feat ID 5bef5e65e532ba7c.

**Target correction:** Reconcile printed source eligibility and add canonical ID only where source certified.

### 6C-009 — parameterized feat constraint risk (MEDIUM)

**Classes:** Jedi, Noble, Scoundrel, Scout, Soldier. All featIds resolve but parameterized Weapon Proficiency and Weapon Focus are represented by shared IDs, whereas featNames list specific allowed categories. FeatSlotValidator validates ID membership only.

**Target correction:** Validate chosen weapon/category specialization against the class bonus-feat list, not only generic feat ID.

### 6C-010 — conditional starting grant runtime probe (MEDIUM)

**Classes:** Jedi, Noble, Scoundrel, Scout, Soldier. Core Noble Linguist requires INT 13 and Scout Shake It Off requires CON 13 plus trained Endurance. Class grant ledger explicitly evaluates starred conditional feats; no Foundry end-to-end test in this pass.

**Target correction:** Test grant/no-grant under both prerequisites in chargen; never suppress other starting feats.

### 6C-011 — feature automation not certified (HIGH)

**Classes:** all. Class feature catalog contains 53 definitions (40 ACTIVE/STUB, 8 ACTIVE/CHOICE_GRANT, 3 PASSIVE/RULE, 2 INFO_ONLY/INFO); level-up manifest materializes typed class_feature and scaling_feature as locked feat items; that materialization alone does not prove mechanical activation.

**Target correction:** One owner per class feature mechanic with runtime tests for scaling, duration, usage, prerequisites.


## 5. Architectural finding — unlocks are not proof of feature automation

`levelup-entitlement-manifest.js` recognizes only the enumerated `*_choice` types and auto-materializes `class_feature` and `scaling_feature` rows as locked feat items. The general feature dispatcher tracks feature names, while `data/class-features.json` labels most specialized class effects as ACTIVE/STUB. This proves *representation* and some entitlement routing, but **not** duration, attack/defense math, conditions, resource limits, or correct effect application. Scaling entries at repeated levels can result in separate item grants; they must not be interpreted as additive bonuses.

The remaining feature audit should map **each distinct mechanic → exact printed description → chosen class unlock → owner subsystem → tests → live Foundry evidence**, avoiding a second executable authority parallel to `packs/classes.db`.

## 6. Recommended repair sequence (after audit sign-off)

1. **Critical progression unlocks:** Officer Share Talent typed selection and normal talent-choice cadence; Improviser Contraband parser/source correction. Add exact-level tests before production edits.
2. **Once-granted/scaled feature identity:** Force Disciple Prophet; Crime Lord/Officer Command Cover; inspect Enforcer Resources and other repeated `scaling_feature` rows. Introduce feature-stable identity and level-derived scaling, **not** duplicate feat grants.
3. **Text/typed values:** Infiltrator Unarmed Stun labels/dice; Master Privateer Piracy label; source-review any suspect Charlatan or other scaling rows before edits.
4. **Starting feat and bonus-feat selection legality:** Noble/Scout conditional grants, multiclass options, missing Wicked Strike bindings subject to printed-source confirmation, parameterized weapon proficiency/focus group restriction.
5. **Runtime feature coverage:** classify 53 catalog definitions and actual class unlocks against action, combat, ship, Force and actor systems. Separate informational features, manual GM adjudication, choices, and executable rules. Require each mechanic's owner and tests before calling it implemented.
6. **Full source-table certification:** recheck every printed prestige feature row and cross-book bonus feat addition not covered by the targeted source findings; then run Foundry v13 CharGen/levelup/multiclass end-to-end.

## Verification policy

**Read-only audit:** This phase adds only audit artifacts; no class packs, feat lists, talent trees, class feature definitions, or runtime code were modified. The current draft branch still has independent CI failures from older frozen-audit assumptions; those should be resolved on their own merits, not bypassed or confused with class-feature correctness. This is **not** a full mechanical certification.


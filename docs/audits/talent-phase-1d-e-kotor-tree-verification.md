# PHASE 1D-E FINDINGS - Knights of the Old Republic Campaign Guide Class Talent Tree Verification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

**Primary source:** `SAGA EDITION - Knights of the Old Republic Campaign Guide.pdf`  
**Indexing source:** `Knights of the Old Republic Campaign Guide_djvu.txt`

> **Scope:** This pass verifies the 11 class/prestige talent-tree identities introduced by the Knights of the Old Republic Campaign Guide, their direct class access, and their origin membership. KOTOR additions to existing Core trees and KOTOR Force-tradition trees are handled in separate sub-phases.

---

# 1. Structural census

KOTOR introduces **11 class/prestige tree identities** containing **62 canonical origin talent identities**.

Repository result after normalizing obvious capitalization/abbreviation variants:

| Measure | Count |
|---|---:|
| Introduced KOTOR class/prestige trees | **11** |
| Canonical origin talent identities | **62** |
| Canonical mechanics represented | **62** |
| Genuinely missing origin talents | **0** |
| Missing direct class access grants | **0** |
| Source-confirmed wrong extra tree claims | **3** |
| Harmless naming/capitalization variants | **4** |

---

# 2. Base-class trees

## Fencing - Noble

Canonical membership:
- Demoralizing Defense
- Leading Feint
- Noble Fencing Style
- Personal Affront
- Transposing Strike

Repository: **5/5**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Run and Gun - Scoundrel

Canonical membership:
- Cheap Shot
- No Escape
- Opportunistic Strike
- Slippery Strike
- Strike and Run

Repository: **5/5**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Hyperspace Explorer - Scout

Canonical membership:
- Deep-Space Gambit
- Guidance
- Hidden Attacker
- Hyperspace Savant
- Vehicle Sneak

Repository: **5/5**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Rocket Jumper - Soldier

Canonical membership:
- Burning Assault
- Improved Trajectory
- Jet Pack Training
- Jet Pack Withdraw

Repository: **4/4**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 3. Prestige-class trees

## Mandalorian Warrior - Elite Trooper

Canonical membership:
- Armored Mandalorian
- Mandalorian Advance
- Mandalorian Ferocity
- Mandalorian Glory

Repository: **4/4**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Jedi Battlemaster - Jedi Knight

Canonical membership:
- Defensive Circle
- Force Revive
- Jedi Battle Commander
- Slashing Charge
- Mobile Attack (lightsabers)

Repository represents all **5/5** canonical mechanics.

Naming variant:
- source: `Mobile Attack (lightsabers)`
- repo: `Mobile Attack (Lightsabers)`

### Wrong extra claim

The current Jedi Battlemaster tree also claims:

- `Multiattack Proficiency (Lightsabers)`

KOTOR does **not** print Multiattack Proficiency (lightsabers) as a Jedi Battlemaster talent. Instead, it is a prerequisite for Mobile Attack (lightsabers).

The Core Rulebook directly places Multiattack Proficiency (lightsabers) in the **Duelist** talent tree.

**Disposition:** `WRONG_TREE_CONFIRMED`

This closes the ambiguity left open during the Core pass:
- the existing Multiattack Proficiency (Lightsabers) record should ultimately belong to **Duelist**, not Jedi Battlemaster.

## Jedi Shadow - Jedi Knight

Canonical membership:
- Dark Deception
- Improved Sentinel Strike
- Improved Sentinel's Gambit
- Rebuke the Dark
- Taint of the Dark Side

Repository contains all **5/5** canonical members.

### Two wrong extra claims

Current Jedi Shadow also claims:
- Sentinel Strike
- Sentinel's Gambit

KOTOR separately publishes those two as additions to the **Jedi Sentinel** talent tree.

The Jedi Shadow talents are the **Improved** versions and require the Jedi Sentinel talents.

**Disposition:** `WRONG_TREE_CONFIRMED` x2

This resolves the direct contradictions identified in Phase 1A:
- Sentinel Strike -> Jedi Sentinel
- Sentinel's Gambit -> Jedi Sentinel

Their talent-document declaration was correct; the Jedi Shadow tree claim was wrong.

## Jedi Watchman - Jedi Knight

Canonical membership:
- Force Warning
- Improved Quick Draw (lightsabers)
- Sheltering Stance
- Vigilance
- Watchman's Advance

Repository represents all **5/5** mechanics.

Naming variant:
- source: `Improved Quick Draw (lightsabers)`
- repo: `Improved Quick Draw (Lightsabers)`

**Verdict:** `TREE_MEMBERSHIP_CORRECT_WITH_NAMING_VARIANT`

## Corporate Power - Corporate Agent

Canonical membership:
- Competitive Drive
- Competitive Edge
- Corporate Clout
- Impose Confusion
- Impose Hesitation
- Willful Resolve
- Wrong Decision

Repository: **7/7**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Gladiatorial Combat - Gladiator

Canonical membership:
- Brutal Attack
- Call Out
- Distracting Attack
- Exotic Weapons Master
- Lockdown Strike
- Multiattack Proficiency (exotic weapons)
- Personal Vendetta
- Unstoppable

Repository represents all **8/8** mechanics.

Naming variant:
- source: `Multiattack Proficiency (exotic weapons)`
- repo: `Multiattack Proficiency (exotic)`

**Verdict:** `TREE_MEMBERSHIP_CORRECT_WITH_NAMING_VARIANT`

## Melee Duelist - Melee Duelist prestige class

Canonical membership:
- Advantageous Strike
- Dirty Tricks
- Dual Weapon Flourish I
- Dual Weapon Flourish II
- Master of Elegance
- Multiattack Proficiency (advanced melee weapons)
- Out of Nowhere
- Single Weapon Flourish I
- Single Weapon Flourish II

Repository represents all **9/9** mechanics.

Naming variant:
- source: `Multiattack Proficiency (advanced melee weapons)`
- repo: `Multiattack Proficiency (advanced melee)`

**Verdict:** `TREE_MEMBERSHIP_CORRECT_WITH_NAMING_VARIANT`

---

# 4. Direct class access

All KOTOR source-local access grants for the introduced trees are represented in the current class documents:

- Noble -> Fencing
- Scoundrel -> Run and Gun
- Scout -> Hyperspace Explorer
- Soldier -> Rocket Jumper
- Elite Trooper -> Mandalorian Warrior
- Jedi Knight -> Jedi Battlemaster
- Jedi Knight -> Jedi Shadow
- Jedi Knight -> Jedi Watchman
- Corporate Agent -> Corporate Power
- Gladiator -> Gladiatorial Combat
- Melee Duelist -> Melee Duelist

**Access verdict:** `ACCESS_CORRECT` x11

---

# 5. KOTOR introduced-tree summary

| Tree | Canonical | Represented | Structural issue |
|---|---:|---:|---|
| Fencing | 5 | 5 | none |
| Run and Gun | 5 | 5 | none |
| Hyperspace Explorer | 5 | 5 | none |
| Rocket Jumper | 4 | 4 | none |
| Mandalorian Warrior | 4 | 4 | none |
| Jedi Battlemaster | 5 | 5 | extra wrong Core talent |
| Jedi Shadow | 5 | 5 | 2 extra wrong Jedi Sentinel talents |
| Jedi Watchman | 5 | 5 | capitalization variant |
| Corporate Power | 7 | 7 | none |
| Gladiatorial Combat | 8 | 8 | naming abbreviation |
| Melee Duelist | 9 | 9 | naming abbreviation |
| **Total** | **62** | **62** | **3 wrong extra claims** |

---

# 6. Source-confirmed correction queue

## Remove wrong tree claims

From Jedi Battlemaster:
- Multiattack Proficiency (Lightsabers)

Canonical owner:
- Duelist

From Jedi Shadow:
- Sentinel Strike
- Sentinel's Gambit

Canonical owner:
- Jedi Sentinel

These records should not be deleted; their current IDs can likely be retained and reattached to the correct tree after reference checks.

## Naming normalization candidates

- Mobile Attack (Lightsabers) -> Mobile Attack (lightsabers)
- Improved Quick Draw (Lightsabers) -> Improved Quick Draw (lightsabers)
- Multiattack Proficiency (exotic) -> Multiattack Proficiency (exotic weapons)
- Multiattack Proficiency (advanced melee) -> Multiattack Proficiency (advanced melee weapons)

Display normalization should not churn stable IDs.

---

# 7. What this pass does NOT yet certify

Still pending:
- KOTOR additions to existing Core trees
- KOTOR Force-tradition trees
- description/prerequisite fidelity for the 62 origin talents
- abilityMeta/runtime behavior
- automation ceiling and owner

---

# 8. Stop gate

- [x] Verify all 11 introduced KOTOR class/prestige tree identities.
- [x] Enumerate all 62 canonical origin talents.
- [x] Compare canonical membership to repo.
- [x] Verify direct class access.
- [x] Resolve Sentinel Strike / Sentinel's Gambit contradiction.
- [x] Resolve Duelist vs Jedi Battlemaster Multiattack Proficiency ambiguity.
- [x] Distinguish naming variants from missing content.
- [x] Make no production/data changes.
- [x] Publish findings on the existing audit branch.

# Verdict

KOTOR's introduced class/prestige trees are structurally complete: **all 62 canonical mechanics are represented**.

The defects are not missing content but **tree contamination**:
- one Core Duelist talent was absorbed into Jedi Battlemaster because KOTOR references it as a prerequisite;
- two Jedi Sentinel talents were absorbed into Jedi Shadow because KOTOR prints Improved versions there.

This is the same failure mode already seen in Clone Wars and reinforces the need for source-scoped tree membership.

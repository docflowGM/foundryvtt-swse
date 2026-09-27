# PHASE 1D-C FINDINGS - Clone Wars Campaign Guide Class Talent Tree Verification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

**Primary source:** `SAGA EDITION - Clone Wars Campaign Guide.pdf`  
**Indexing source:** `Clone Wars Campaign Guide_djvu.txt`

> **Scope:** This pass verifies the **14 class/prestige talent trees introduced in the Clone Wars Campaign Guide**, their direct class access, and their origin membership. Additions made by Clone Wars to pre-existing Core trees are a separate expansion-publication pass.

---

# 1. Structural census

Clone Wars introduces **14 class/prestige talent-tree identities** in this lane containing **78 canonical origin talent identities**.

Current repository comparison:

| Measure | Count |
|---|---:|
| Clone Wars introduced trees | **14** |
| Canonical origin talent identities | **78** |
| Canonical mechanics represented in correct tree | **72** |
| Canonical identities missing from correct tree | **6** |
| Direct Clone Wars access grants missing | **0** |

All six genuinely missing identities are in **Droid Commander**.

Several additional current tree members are source-confirmed misplaced Core talents or naming variants.

---

# 2. Base-class trees

## Collaborator - Noble

Canonical membership:
- Double Agent
- Enemy Tactics
- Feed Information
- Friendly Fire
- Protection

Repository: **5/5**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Loyal Protector - Noble

Canonical membership:
- Inspire Loyalty
- Undying Loyalty
- Punishing Protection
- Protector Actions

Repository: **4/4**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Opportunist - Scoundrel

Canonical membership:
- Advantageous Opening
- Retribution
- Slip By
- Thrive on Chaos
- Vindication

Repository: **5/5**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Reconnaissance - Scout

Canonical membership:
- Reconnaissance Team Leader
- Close-Combat Assault
- Get Into Position
- Reconnaissance Actions

Repository: **4/4**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Surveillance - Scout

Canonical membership:
- Advanced Intel
- Hidden Eyes
- Hunt the Hunter
- Seek and Destroy
- Spotter

Repository: **5/5**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Trooper - Soldier

Canonical membership:
- Comrades in Arms
- Focused Targeting
- Phalanx
- Stick Together
- Watch Your Back

Repository: **5/5**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Squad Leader - Soldier / Clone Wars identity

Canonical membership:
- Commanding Officer
- Coordinated Tactics
- Fire at Will
- Squad Actions

Repository tree `781feba15dc9e42f`: **4/4**

This definitively identifies the current physical repo `Squad Leader` tree as the **Clone Wars / Soldier** identity.

The Galaxy at War / Elite Trooper Squad Leader remains a distinct missing tree identity.

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 3. Prestige-class trees

## Melee Specialist - Elite Trooper

Canonical membership:
- Accurate Blow
- Close-Quarters Fighter
- Ignore Armor
- Improved Stunning Strike
- Whirling Death

Repository contains all 5 canonical members but also claims:

- Stunning Strike
- Melee Smash

Clone Wars explicitly uses those two Core Brawler talents as prerequisites:
- Improved Stunning Strike requires Stunning Strike.
- Whirling Death requires Melee Smash and Unrelenting Assault.

They are **not** printed as Melee Specialist members.

Core already identifies Melee Smash and Stunning Strike as Brawler talents.

**Verdict:**
- canonical Clone Wars membership: **5/5**
- Melee Smash: `WRONG_TREE_CONFIRMED`
- Stunning Strike: `WRONG_TREE_CONFIRMED`

## Republic Commando - Elite Trooper

Canonical membership:
- Ambush
- Higher Yield
- Rapid Reload
- Shoulder to Shoulder
- Strength in Numbers
- Weapon Shift

Repository contains all six canonical mechanics if the current disambiguated record:

`Ambush (Republic Commando)`

is mapped to the printed `Ambush`.

Repository also claims:

- Gun Club

Clone Wars does not list Gun Club as a Republic Commando talent. It appears only as the prerequisite/reference for Weapon Shift.

Core identifies Gun Club as a Brawler talent.

**Verdict:**
- canonical membership: **6/6 represented**
- `Ambush (Republic Commando)`: `IDENTITY_NAMING_VARIANT`
- Gun Club: `WRONG_TREE_CONFIRMED`

The unrelated unsuffixed repository `Ambush` currently under Disgrace is a separate identity/content problem and must not replace the Republic Commando record by name alone.

## Jedi Archivist - Jedi Knight

Canonical membership:
- Direct
- Impart Knowledge
- Insight of the Force
- Master Advisor
- Scholarly Knowledge

Repository contains all 5 canonical members but also claims:

- Skilled Advisor

Clone Wars explicitly cites **Skilled Advisor (Core p. 40)** as the prerequisite/source ability for Impart Knowledge/Master Advisor interactions. It is not a Jedi Archivist member.

Core identifies Skilled Advisor as a Jedi Consular talent.

**Verdict:**
- canonical membership: **5/5**
- Skilled Advisor: `WRONG_TREE_CONFIRMED`

## Jedi Healer - Jedi Knight

Canonical membership:
- Force Treatment
- Healing Boost
- Improved Healing Boost
- Soothe

Repository: **4/4**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Droid Commander - Droid Commander prestige class

Canonical membership:
- Automated Strike
- Droid Defense
- Droid Mettle
- Expanded Sensors
- Inspire Competence
- Maintain Focus
- Overclocked Troops
- Reinforced Commands

Repository currently contains only:
- Droid Defense
- Expanded Sensors

Missing:
- Automated Strike
- Droid Mettle
- Inspire Competence
- Maintain Focus
- Overclocked Troops
- Reinforced Commands

No exact repository documents were found for those six names.

**Verdict:**
- represented: **2/8**
- `MISSING_CONTENT_CONFIRMED` x6

## Military Engineer - Military Engineer prestige class

Canonical membership:
- Breach Cover
- Breaching Explosive
- Droid Expert
- Prepared Explosive
- Problem Solver
- Quick Modifications
- Repairs on the Fly
- Sabotage Device
- Tech Savant
- Vehicular Boost

Repository: **10/10**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Vanguard - Vanguard prestige class

Canonical membership:
- Enhanced Vision
- Impenetrable Cover
- Invisible Attacker
- Mark the Target
- Maximize Cover
- Shellshock
- Soften the Target
- Triangulate

Repository: **8/8**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 4. Direct class access

All 14 Clone Wars direct tree-access grants are represented in current class documents:

- Noble -> Collaborator
- Noble -> Loyal Protector
- Scoundrel -> Opportunist
- Scout -> Reconnaissance
- Scout -> Surveillance
- Soldier -> Trooper
- Soldier -> Clone Wars Squad Leader
- Elite Trooper -> Melee Specialist
- Elite Trooper -> Republic Commando
- Jedi Knight -> Jedi Archivist
- Jedi Knight -> Jedi Healer
- Droid Commander -> Droid Commander
- Military Engineer -> Military Engineer
- Vanguard -> Vanguard

**Access verdict:** `ACCESS_CORRECT` x14.

---

# 5. Core ambiguity resolved by Clone Wars

The preceding Core pass deliberately did not automatically move same-name records out of later trees until the destination books were checked.

Clone Wars now resolves four of those cases:

| Core identity | Incorrect current tree | Clone Wars evidence |
|---|---|---|
| Skilled Advisor | Jedi Archivist | only referenced as Core prerequisite/source talent |
| Gun Club | Republic Commando | only referenced by Weapon Shift prerequisite |
| Melee Smash | Melee Specialist | only referenced as prerequisite |
| Stunning Strike | Melee Specialist | only referenced as prerequisite |

These are now **source-confirmed wrong-tree claims**, not legitimate same-name Clone Wars variants.

---

# 6. Clone Wars structural issues

## Missing content

Six canonical Droid Commander talents:
- Automated Strike
- Droid Mettle
- Inspire Competence
- Maintain Focus
- Overclocked Troops
- Reinforced Commands

## Wrong-tree contamination

- Skilled Advisor in Jedi Archivist
- Gun Club in Republic Commando
- Melee Smash in Melee Specialist
- Stunning Strike in Melee Specialist

## Naming variant

- `Ambush (Republic Commando)` is the canonical Republic Commando `Ambush` mechanic with a system-added suffix.

---

# 7. What this pass does NOT yet certify

Still pending:
- Clone Wars additions to pre-existing Core talent trees
- description fidelity for all 78 origin talents
- prerequisites/abilityMeta/runtime behavior
- automation ceiling and owner
- follower subsystem implementation completeness

Those will be handled by source-publication and later mechanics passes.

---

# 8. Stop gate

- [x] Index all 14 introduced Clone Wars class/prestige trees.
- [x] Render and visually inspect the relevant PDF talent/prestige range.
- [x] Enumerate all 78 origin talent identities.
- [x] Compare membership to the current repo.
- [x] Verify all direct class-access grants.
- [x] Resolve four Core wrong-tree ambiguities.
- [x] Identify six genuinely missing Droid Commander talents.
- [x] Preserve disambiguated Ambush identity without unsafe name merge.
- [x] Make no production/data changes.
- [x] Publish findings on the existing audit branch.

# Verdict

The Clone Wars tree graph is much healthier than the discrepancy-heavy later books: **72 of 78 canonical origin identities are represented in the correct tree**, and every direct class-access edge is present.

The main defects are concentrated and actionable:

1. **Droid Commander is only 2/8 complete.**
2. Four Core talents were incorrectly absorbed into Clone Wars trees because those trees reference them as prerequisites.
3. The Republic Commando Ambush identity is mechanically present but uses a system-added display suffix.

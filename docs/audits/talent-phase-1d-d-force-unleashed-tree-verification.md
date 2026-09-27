# PHASE 1D-D FINDINGS - The Force Unleashed Campaign Guide Class Talent Tree Verification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

**Primary source:** `SAGA EDITION - Force Unleashed Campaign Guide.pdf`  
**Indexing source:** `Force Unleashed Campaign Guide_djvu.txt`

> **Scope:** This pass verifies the 15 class/prestige talent-tree identities introduced by The Force Unleashed Campaign Guide, their source-local access grants, and their origin membership. Later books that add access or add talents are recorded separately.

---

# 1. Structural census

The Force Unleashed Campaign Guide introduces **15 class/prestige tree identities** containing **90 origin talent identities**.

After resolving capitalization/abbreviation variants:

| Measure | Count |
|---|---:|
| Introduced class/prestige tree identities | **15** |
| Canonical origin talent identities | **90** |
| Canonical origin identities represented | **85** |
| Canonical origin identities genuinely missing | **5** |
| Direct FUC access grants missing from current class docs | **0** |

All five genuine missing origin talents belong to **Specialized Droid**.

---

# 2. Base-class trees

## Ideologue - Noble

Canonical membership:
- Instruction
- Idealist
- Know Your Enemy
- Known Dissident
- Lead by Example

Repository: **5/5**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Smuggling - Scoundrel

Canonical membership:
- Art of Concealment
- Fast Talker
- Hidden Weapons
- Illicit Dealings
- Surprise Strike

Repository: **5/5**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Spy - Scout; also accessible to Infiltrator in this same book

Canonical membership:
- Blend In
- Incognito
- Improved Surveillance
- Intimate Knowledge
- Surveillance
- Traceless Tampering

Repository: **6/6**

The Infiltrator prestige-class text explicitly allows selection from the Spy tree in addition to Camouflage, Infiltration, and Bothan Spynet.

**Verdict:**
- membership: `TREE_MEMBERSHIP_CORRECT`
- Scout access: `ACCESS_CORRECT`
- Infiltrator access: `ACCESS_CORRECT`

## Mercenary - Soldier

Canonical membership:
- Commanding Presence
- Dirty Fighting
- Feared Warrior
- Focused Warrior
- Ruthless

Repository contains all **5/5** origin identities.

The current tree also contains later additions:
- Mercenary's Grit
- Mercenary's Determination
- Mercenary's Teamwork

Those are not treated as errors in this origin pass; their publication provenance is audited separately.

**Verdict:** `TREE_ORIGIN_MEMBERSHIP_CORRECT`

---

# 3. Core prestige-class additions / new prestige trees

## Critical Master - Elite Trooper

Canonical origin membership:
- Deny Move
- Extended Critical Range (heavy weapons)
- Extended Critical Range (rifles)
- Flurry Attack
- Knockback
- Reduce Defense
- Reduce Mobility

Repository represents all **7/7** mechanics.

Naming variant:
- source: `Extended Critical Range (heavy weapons)`
- repo: `Extended Critical Range (heavy)`

**Verdict:**
- `TREE_ORIGIN_MEMBERSHIP_CORRECT`
- one `IDENTITY_NAMING_VARIANT`

## Imperial Inquisitor - Force Adept

Canonical origin membership:
- Cower Enemies
- Force Interrogation
- Inquisition
- Unsettling Presence

Repository: **4/4**

Special source restriction:
- character must be a member of the **Inquisitorius**
- Dark Side Score **1+**

This tree therefore requires more than simple class access in the eventual progression model.

**Verdict:** `TREE_MEMBERSHIP_CORRECT_WITH_SPECIAL_ACCESS_RULE`

## Enforcement - Enforcer

Canonical membership:
- Cover Bracing
- Intentional Crash
- Nonlethal Tactics
- Pursuit
- Respected Officer
- Slowing Stun
- Takedown

Repository: **7/7**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 4. Independent Droid prestige trees

## Autonomy - Independent Droid

Canonical FUC origin membership:
1. Defensive Electronics
2. Ion Resistance 10
3. Soft Reset
4. Modification Specialist
5. Repair Self

Repository contains all **5/5** origin talents.

Current tree also contains:
- Just a Droid
- Swift Droid

Those are legitimate **Scavenger's Guide to Droids** additions to Autonomy and are not errors.

**Verdict:** `TREE_ORIGIN_MEMBERSHIP_CORRECT`

## Specialized Droid - Independent Droid

Canonical FUC origin membership:
1. Computer Language
2. Computer Master
3. Enhanced Manipulation
4. Hotwired Processor
5. Power Surge
6. Skill Conversion

Current repository tree contains:
- Hotwire
- Power Boost
- Power Surge

Only **Power Surge** is an origin member.

### Five source-confirmed missing talents

- Computer Language
- Computer Master
- Enhanced Manipulation
- Hotwired Processor
- Skill Conversion

No exact repository documents were found for those five names.

### Current Hotwire is misplaced content

The current Specialized Droid `Hotwire` record implements the **Outlaw Tech Hot Wire** rule:

> use Mechanics instead of Use Computer when improving computer access.

That is not the Specialized Droid `Hotwired Processor` talent.

**Disposition:** `WRONG_TREE_IDENTITY_CONTENT_CONFIRMED`

### Current Power Boost is legitimate later content

Scavenger's Guide to Droids explicitly adds **Power Boost** to the Specialized Droid tree.

So it is valid aggregate tree content, but not part of the Force Unleashed origin set.

**Verdict:**
- origin representation: **1/6**
- missing origin content: **5**
- `Hotwire`: wrong-tree/misidentified Outlaw Tech rule
- `Power Boost`: valid later expansion

---

# 5. Infiltrator prestige trees

## Infiltration - Infiltrator

Canonical membership:
- Always Ready
- Concealed Weapon Expert
- Creeping Approach
- Set for Stun
- Silent Takedown

Repository: **5/5**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Bothan Spynet - Infiltrator

Canonical membership:
- Bothan Resources
- Knowledge Is Life
- Knowledge Is Power
- Knowledge Is Strength
- Six Questions
- Spynet Agent

Repository represents all **6/6** canonical mechanics.

Three display-name capitalization variants exist:
- `Knowledge is Life`
- `Knowledge is Power`
- `Knowledge is Strength`

Source heading uses capitalized `Is`, but these are identity-formatting issues only.

### Invalid fragment: Extended Critical Range

The tree also contains a separate repo talent named:

`Extended Critical Range`

Its text is merely a fragment copied from the **Knowledge Is Power** special clause describing interaction with other critical-range abilities.

The sourcebook does **not** list a separate Bothan Spynet talent named Extended Critical Range.

**Disposition:** `INVALID_FRAGMENT_CONFIRMED`

**Verdict:**
- canonical origin mechanics: **6/6**
- naming variants: 3
- invalid extra fragment: 1

---

# 6. Master Privateer

## Privateer - Master Privateer

Canonical origin membership:
1. Armored Spacer
2. Attract Privateer
3. Blaster and Blade I
4. Blaster and Blade II
5. Blaster and Blade III
6. Boarder
7. Ion Mastery
8. Multiattack Proficiency (advanced melee weapons)
9. Preserving Shot

**Veteran Privateer is a class feature, not a talent.**

Repository represents all **9/9** canonical mechanics.

Naming variant:
- source: `Multiattack Proficiency (advanced melee weapons)`
- repo: `Multiattack Proficiency (advanced melee)`

**Verdict:** `TREE_ORIGIN_MEMBERSHIP_CORRECT`

---

# 7. Medic

## Advanced Medicine - Medic

Canonical origin membership:
- Battlefield Medic
- Bring Them Back
- Emergency Team
- Extra First Aid
- Medical Miracle
- Natural Healing
- Second Chance
- Steady Under Pressure

Repository: **8/8**

The current class graph also gives **Shaper** access to Advanced Medicine. That access is legitimate, but it comes from the later **Legacy Era Campaign Guide**, not from the FUC tree origin.

**Verdict:**
- FUC origin membership: `TREE_MEMBERSHIP_CORRECT`
- Medic direct access: `ACCESS_CORRECT`
- Shaper access: later publication, tracked separately

---

# 8. Saboteur

## Sabotage - Saboteur

Canonical membership:
- Device Jammer
- Droid Jammer
- Extreme Explosion
- Mine Mastery
- Shaped Explosion
- Skilled Demolitionist

Repository: **6/6**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

## Turret - Saboteur

Canonical membership:
- Blaster Turret I
- Blaster Turret II
- Blaster Turret III
- Ion Turret
- Stun Turret
- Turret Self-Destruct

Repository: **6/6**

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 9. Access verification

Source-local access grants verified:

- Medic -> Advanced Medicine
- Independent Droid -> Autonomy
- Independent Droid -> Specialized Droid
- Infiltrator -> Bothan Spynet
- Elite Trooper -> Critical Master
- Enforcer -> Enforcement
- Noble -> Ideologue
- Force Adept -> Imperial Inquisitor
- Infiltrator -> Infiltration
- Soldier -> Mercenary
- Master Privateer -> Privateer
- Saboteur -> Sabotage
- Scoundrel -> Smuggling
- Scout -> Spy
- Infiltrator -> Spy
- Saboteur -> Turret

All are represented in the current class documents.

**Direct FUC access verdict:** `ACCESS_CORRECT`

---

# 10. Force Unleashed origin summary

| Tree | Canonical origin | Represented | Structural note |
|---|---:|---:|---|
| Advanced Medicine | 8 | 8 | complete |
| Autonomy | 5 | 5 | later SGtD additions valid |
| Bothan Spynet | 6 | 6 | 3 case variants + 1 invalid fragment |
| Critical Master | 7 | 7 | 1 abbreviated display name |
| Enforcement | 7 | 7 | complete |
| Ideologue | 5 | 5 | complete |
| Imperial Inquisitor | 4 | 4 | special access restriction |
| Infiltration | 5 | 5 | complete |
| Mercenary | 5 | 5 | later additions present |
| Privateer | 9 | 9 | 1 abbreviated display name |
| Sabotage | 6 | 6 | complete |
| Smuggling | 5 | 5 | complete |
| Specialized Droid | 6 | 1 | 5 missing; Hotwire misplaced |
| Spy | 6 | 6 | complete |
| Turret | 6 | 6 | complete |
| **Total** | **90** | **85** | **5 genuine missing origin talents** |

---

# 11. Source-confirmed correction queue

## Missing content

Specialized Droid:
- Computer Language
- Computer Master
- Enhanced Manipulation
- Hotwired Processor
- Skill Conversion

## Invalid / wrong identity content

- Bothan Spynet `Extended Critical Range` -> invalid fragment of Knowledge Is Power
- Specialized Droid `Hotwire` -> Outlaw Tech Hot Wire rule in the wrong tree

## Naming normalization candidates

- Knowledge is Life -> Knowledge Is Life
- Knowledge is Power -> Knowledge Is Power
- Knowledge is Strength -> Knowledge Is Strength
- Extended Critical Range (heavy) -> Extended Critical Range (heavy weapons)
- Multiattack Proficiency (advanced melee) -> Multiattack Proficiency (advanced melee weapons)

These should preserve stable internal IDs where practical.

---

# 12. What this pass does NOT yet certify

Still pending:
- Force Unleashed additions to existing trees
- Force-talent-tree additions elsewhere in the book
- description/prerequisite fidelity for all 90 origin records
- runtime/abilityMeta correctness
- automation ceiling and subsystem ownership

---

# 13. Stop gate

- [x] Verify all 15 introduced class/prestige tree identities.
- [x] Verify source-local class access.
- [x] Enumerate all 90 origin talent identities.
- [x] Distinguish later expansions from origin membership.
- [x] Identify 5 genuinely missing Specialized Droid talents.
- [x] Identify invalid Bothan Spynet fragment.
- [x] Identify misplaced Outlaw Tech Hotwire record.
- [x] Confirm Power Boost / Autonomy extras are legitimate later expansions.
- [x] Make no production/data changes.
- [x] Publish findings on the existing audit branch.

# Verdict

The Force Unleashed class-tree structure is mostly healthy: **85 of 90 origin identities are represented** and every direct access grant is present.

The serious defect is concentrated in **Specialized Droid**, where five of six origin talents are missing and an unrelated Outlaw Tech rule was imported under the misleading name `Hotwire`.

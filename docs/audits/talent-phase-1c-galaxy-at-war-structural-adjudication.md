# PHASE 1C-GAW FINDINGS - Galaxy at War Structural Talent Adjudication

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`  
**Parent findings:**  
- `docs/audits/talent-phase-1a-repository-graph-census.md`
- `docs/audits/talent-phase-1b-fandom-reference-diff.md`

**Primary source:** `SW_Saga_Galaxy_at_War.pdf`  
**Primary-source pages inspected:** printed pp. 18-22, 30-33

> **Scope:** This sub-phase adjudicates only the Galaxy at War structural discrepancy queue: class -> tree access, tree identity, and tree -> talent membership. It does not yet certify every talent's complete mechanics/abilityMeta implementation.

---

# 1. Sourcebook verdict

The Galaxy at War reference rows identified in Phase 1B are directly supported by the primary source.

The book presents the following class/tree relationships:

| Class | Galaxy at War talent tree | Printed page |
|---|---|---:|
| Noble | Anticipation | 18 |
| Scoundrel | Brigand | 19 |
| Scout | Advance Patrol | 20 |
| Soldier | Shockboxer | 21 |
| Soldier | Veteran | 21-22 |
| Gunslinger | Sharpshooter | 31 |
| Elite Trooper | Squad Leader | 30-31 |
| Martial Arts Master | Martial Arts Forms | 32-33 |
| Martial Arts Master | Unarmed Mastery | 33 |

**All nine Phase 1B Galaxy at War class-usage rows are primary-source confirmed.**

---

# 2. Class-document corrections are source-confirmed

Current class documents omit the following Galaxy at War access edges:

- Noble -> Anticipation
- Scoundrel -> Brigand
- Scout -> Advance Patrol
- Gunslinger -> Sharpshooter
- Soldier -> Shockboxer
- Soldier -> Veteran
- Martial Arts Master -> Martial Arts Forms
- Martial Arts Master -> Unarmed Mastery

The Elite Trooper case is more complicated because of the same-name Squad Leader collision described below.

For the eight non-collision edges above, the sourcebook resolves the Phase 1A/1B dispute in favor of the class-map/Fandom relationship.

**Disposition:** `ACCESS_ERROR_CONFIRMED` in the current class documents.

No data correction is made in this audit-only sub-phase.

---

# 3. Squad Leader is definitively two distinct published tree identities

This is now settled by primary source.

## Clone Wars / Soldier tree currently in repository

The current repository tree:

```text
Squad Leader
id: 781feba15dc9e42f
class: Soldier
talents:
- Coordinated Tactics
- Squad Actions
- Commanding Officer
- Fire at Will
```

matches the separate Clone Wars-era Soldier concept previously indexed by Phase 1B.

## Galaxy at War / Elite Trooper tree

Galaxy at War p. 30 explicitly introduces a **Squad Leader Talent Tree** inside the **Elite Trooper Talents** section.

Its published talents are:

1. Fall Back
2. Form Up
3. Full Advance
4. Hold Steady
5. Search and Destroy

The text also defines a distinct squad-leader subsystem around a designated squad, maximum squad size, line of sight, communication, and beginning-of-first-turn designation.

### Verdict

The repository must **not** solve this by merely adding Elite Trooper access to the existing Soldier Squad Leader tree.

There are two distinct published talent-tree identities sharing the same display name.

**Disposition:** `MISSING_TREE_IDENTITY_CONFIRMED`

Recommended future identity policy:

```text
display name: Squad Leader
identity key: source + class/access + tree
```

At minimum, the second tree needs a separate document ID and source-aware identity.

---

# 4. Martial Arts Master is missing two source-confirmed talent trees

Galaxy at War p. 32 states that Martial Arts Master can select talents from:

- Awareness
- Master of Teräs Käsi
- Martial Arts Forms
- Unarmed Mastery

The current Martial Arts Master class document contains only:

- Awareness
- Master of Teräs Käsi

Therefore both omitted trees are primary-source-confirmed access gaps.

## 4.1 Martial Arts Forms Talent Tree

Published pp. 32-33.

Canonical tree membership:

1. Echani Expertise
2. Hijkata Expertise
3. K'tara Expertise
4. K'thri Expertise
5. Stava Expertise
6. Tae-Jitsu Expertise
7. Wrruushi Expertise

Current repository:

- no `Martial Arts Forms` tree document
- no exact talent document found for any of the seven published names

**Disposition:**
- `MISSING_TREE_CONFIRMED`
- `MISSING_CONTENT_CONFIRMED` x7

## 4.2 Unarmed Mastery Talent Tree

Published p. 33.

Canonical tree membership:

1. Flurry of Blows
2. Hardened Strike
3. Punishing Strike
4. Tough as Durasteel

Current repository:

- no `Unarmed Mastery` tree document
- no exact talent document found for any of the four published names

**Disposition:**
- `MISSING_TREE_CONFIRMED`
- `MISSING_CONTENT_CONFIRMED` x4

---

# 5. Anticipation Talent Tree - Noble

Galaxy at War p. 18 presents the Anticipation Talent Tree under the Noble section.

Canonical membership visible across pp. 18-19:

1. Anticipate Movement
2. Forewarn Allies
3. Get Down
4. Heavy Fire Zone
5. Summon Aid

Current repository tree:

```text
Anticipation
id: 3a785c985eae4d00
talents:
- Get Down
- Forewarn Allies
```

Missing published talents:

- Anticipate Movement
- Heavy Fire Zone
- Summon Aid

**Disposition:**
- Noble access: `ACCESS_ERROR_CONFIRMED`
- tree membership: 2/5 currently represented
- missing content: 3 talents

---

# 6. Brigand Talent Tree - Scoundrel

Galaxy at War p. 19 presents Brigand under Scoundrel.

Canonical membership:

1. Cheap Trick
2. Easy Prey
3. Quick Strike
4. Sly Combatant

Current repository tree:

```text
Brigand
id: 7c6d007b549c4a4a
talents:
- Cheap Trick
```

Missing published talents:

- Easy Prey
- Quick Strike
- Sly Combatant

**Disposition:**
- Scoundrel access: `ACCESS_ERROR_CONFIRMED`
- tree membership: 1/4 represented
- missing content: 3 talents

---

# 7. Advance Patrol Talent Tree - Scout

Galaxy at War p. 20 presents Advance Patrol under Scout.

Canonical membership:

1. Forward Patrol
2. Mobile Combatant
3. Trailblazer
4. Watchful Step

Current repository tree:

```text
Advance Patrol
id: 9d826906ad8945b0
talents:
- Forward Patrol
- Watchful Step
```

Missing from this tree:

- Mobile Combatant
- Trailblazer

## Same-name hazard: Mobile Combatant

The repository already contains a talent named `Mobile Combatant`:

- id `198b68c0ca770ad7`
- claimed by Jedi Guardian
- currently sourced to Force Unleashed
- mechanically not the Galaxy at War Advance Patrol talent

The Galaxy at War Mobile Combatant is a distinct talent with a set of once-per-encounter combat movement options.

Therefore this is another case where name-only identity would corrupt content.

**Disposition:**
- Scout access: `ACCESS_ERROR_CONFIRMED`
- tree membership: 2/4 represented
- `Trailblazer`: `MISSING_CONTENT_CONFIRMED`
- GaW `Mobile Combatant`: `MISSING_SAME_NAME_VARIANT_CONFIRMED`

Do not move or rename the Jedi Guardian Mobile Combatant as a substitute.

---

# 8. Shockboxer Talent Tree - Soldier

Galaxy at War p. 21 presents Shockboxer under Soldier.

Canonical membership:

1. Defensive Jab
2. Nimble Dodge
3. Retaliation Jab
4. Stinging Jab
5. Stunning Shockboxer

Current repository tree:

```text
Shockboxer
id: abc3466390fe4050
talents:
- Stinging Jab
- Retaliation Jab
```

Missing published talents:

- Defensive Jab
- Nimble Dodge
- Stunning Shockboxer

**Disposition:**
- Soldier access: `ACCESS_ERROR_CONFIRMED`
- tree membership: 2/5 represented
- missing content: 3 talents

---

# 9. Veteran Talent Tree - Soldier

Galaxy at War pp. 21-22 presents Veteran under Soldier.

Canonical membership:

1. Battlefield Remedy
2. Grizzled Warrior
3. Reckless
4. Seen It All
5. Tested in Battle

Current repository tree:

```text
Veteran
id: 96c390430d7a4975
talents:
- Seen It All
- Tested in Battle
```

Missing published talents:

- Battlefield Remedy
- Grizzled Warrior
- Reckless

**Disposition:**
- Soldier access: `ACCESS_ERROR_CONFIRMED`
- tree membership: 2/5 represented
- missing content: 3 talents

---

# 10. Sharpshooter Talent Tree - Gunslinger

Galaxy at War p. 31 presents Sharpshooter under Gunslinger.

Canonical membership:

1. Bullseye
2. Draw a Bead
3. Pinning Shot
4. Harrying Shot
5. Precision Shot

Current repository tree:

```text
Sharpshooter
id: d203a51d6d0a4c65
talents:
- Draw a Bead
- Precision Shot
- Pinning Shot
```

Missing published talents:

- Bullseye
- Harrying Shot

**Disposition:**
- Gunslinger access: `ACCESS_ERROR_CONFIRMED`
- tree membership: 3/5 represented
- missing content: 2 talents

---

# 11. Galaxy at War structural completeness summary

For the nine Galaxy at War class talent-tree identities in the discrepancy queue:

| Tree identity | Canonical talents | Repo talents in correct tree | Missing |
|---|---:|---:|---:|
| Anticipation | 5 | 2 | 3 |
| Brigand | 4 | 1 | 3 |
| Advance Patrol | 4 | 2 | 2 |
| Shockboxer | 5 | 2 | 3 |
| Veteran | 5 | 2 | 3 |
| Sharpshooter | 5 | 3 | 2 |
| Squad Leader - Elite Trooper | 5 | 0 | 5 |
| Martial Arts Forms | 7 | 0 | 7 |
| Unarmed Mastery | 4 | 0 | 4 |
| **Total** | **44** | **12** | **32** |

This is a major content gap.

Only **12 of 44** talents belonging to these nine directly audited Galaxy at War tree identities are currently represented in the correct repository tree identity.

---

# 12. Tree-document summary

Primary-source-confirmed Galaxy at War tree state:

## Existing tree documents but missing class access and/or content

- Anticipation
- Brigand
- Advance Patrol
- Shockboxer
- Veteran
- Sharpshooter

## Existing same-name tree, but wrong identity for this source/class

- Squad Leader
  - existing repository identity: Soldier / Clone Wars-style content
  - missing identity: Elite Trooper / Galaxy at War content

## Entirely missing tree documents

- Martial Arts Forms
- Unarmed Mastery

Therefore Galaxy at War exposes **three missing canonical tree identities**:

1. Elite Trooper Squad Leader
2. Martial Arts Forms
3. Unarmed Mastery

---

# 13. Source-confirmed correction packet for a later implementation phase

No production change is made in Phase 1C, but the following packet is now safe to prepare later.

## Class access additions

- Noble -> Anticipation
- Scoundrel -> Brigand
- Scout -> Advance Patrol
- Gunslinger -> Sharpshooter
- Soldier -> Shockboxer
- Soldier -> Veteran
- Elite Trooper -> **new GaW Squad Leader identity**
- Martial Arts Master -> Martial Arts Forms
- Martial Arts Master -> Unarmed Mastery

## New tree identities

- Squad Leader [Galaxy at War / Elite Trooper]
- Martial Arts Forms
- Unarmed Mastery

## Missing talent records

32 source-confirmed missing talent identities across the nine audited trees.

These should be created from source text in a dedicated content packet, not reconstructed from Fandom summaries.

---

# 14. What this sub-phase does NOT yet certify

This sub-phase does not yet perform clause-by-clause implementation review for all 44 talents.

Still pending:

- full source text transcription/normalization
- prerequisites for every talent
- action/trigger/target/duration/usage extraction
- `abilityMeta` comparison
- runtime owner
- automation ceiling
- action-card correctness
- progression legality tests

Those belong to the later tree/talent content certification pass.

---

# 15. Phase 1C-GAW stop gate

- [x] Render and visually inspect the relevant Galaxy at War pages.
- [x] Verify all nine Fandom-indexed GaW class/tree relationships from primary source.
- [x] Resolve the Squad Leader same-name collision as two distinct published identities.
- [x] Confirm Martial Arts Forms is a real published tree.
- [x] Confirm Unarmed Mastery is a real published tree.
- [x] Compare published tree membership to current repository membership.
- [x] Identify source-confirmed missing talent identities.
- [x] Protect the GaW Mobile Combatant same-name variant from name-based reassignment.
- [x] Make no production/data changes.
- [x] Publish findings before moving to the next sourcebook.

# Verdict

**Galaxy at War reveals substantial structural incompleteness rather than minor class-map drift.**

The class access errors identified in Phase 1B are real, but they are only the surface issue. The directly audited GaW discrepancy trees contain **44 published talent identities, of which only 12 are currently represented in the correct repository tree identity**.

The next structural sourcebook should be **Galaxy of Intrigue**, which can adjudicate Espionage, Skill Challenge, Master of Intrigue, and Revolutionary.

# PHASE 1D-B FINDINGS - Core Rulebook Class Talent Tree Verification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

**Primary source:** `Star Wars Saga Edition.pdf`  
**Indexing source:** `All Books_djvu.txt`

> **Evidence rule:** TXT/OCR is used for fast indexing and enumeration. Core PDF pages were visually checked for the prestige sections and ambiguous identity cases. This pass verifies **Core-origin tree membership and Core-granted class access**. Later sourcebook additions to an existing Core tree are not treated as extra/invalid merely because they are not in the Core origin list.

---

# 1. Core structural census

The Core Rulebook defines or directly uses **34 class/prestige talent-tree identities** in the class-tree lane audited here.

Across those trees, the Core book prints **173 origin talent identities**.

Current repository comparison:

| Measure | Count |
|---|---:|
| Core class/prestige tree identities | **34** |
| Core-origin talent identities | **173** |
| Core-origin identities currently in the correct repo tree | **157** |
| Core-origin identities absent from the correct repo tree | **16** |
| Direct Core access grants missing from class docs | **0** |

The access layer is therefore much healthier than the membership layer for Core.

---

# 2. Direct Core class/access grants - complete

All direct class/prestige access relationships granted by the Core Rulebook are represented in the current class documents.

This includes the base-class trees plus Core prestige reuse, for example:

- Ace Pilot -> Expert Pilot, Gunner, Spacer
- Bounty Hunter -> Bounty Hunter, Misfortune, Awareness
- Crime Lord -> Infamy, Mastermind, Influence
- Elite Trooper -> Weapon Master, Commando, Camouflage
- Force Adept -> Dark Side Devotee, Force Adept, Force Item
- Force Disciple -> Force Adept
- Gunslinger -> Gunslinger, Fortune, Awareness
- Jedi Knight -> Armor Specialist, Lightsaber Combat, Duelist, Lightsaber Forms
- Jedi Master -> Duelist
- Officer -> Military Tactics, Leadership, Commando
- Sith Apprentice -> Armor Specialist, Duelist, Lightsaber Combat, Sith
- Sith Lord -> Sith

Later supplements add additional class access to some of these trees. Those later grants are tracked separately and are not attributed to Core.

**Core access verdict:** `ACCESS_CORRECT` for all 34 audited tree identities.

---

# 3. Core-origin membership by tree

## Jedi

### Jedi Consular - 4 Core talents
- Adept Negotiator
- Force Persuasion
- Master Negotiator
- Skilled Advisor

Repository correct-tree representation: **3/4**

Missing from Jedi Consular:
- Skilled Advisor

A same-name repository record exists under **Jedi Archivist**.

**Status:** `CORE_IDENTITY_MISSING_FROM_CORRECT_TREE`

### Jedi Guardian - 5
- Acrobatic Recovery
- Battle Meditation
- Elusive Target
- Force Intuition
- Resilience

Repository: **5/5**

### Jedi Sentinel - 5
- Clear Mind
- Dark Side Sense
- Dark Side Scourge
- Force Haze
- Resist the Dark Side

Repository: **5/5**

### Lightsaber Combat - 6
- Block
- Deflect
- Lightsaber Defense
- Lightsaber Throw
- Redirect Shot
- Weapon Specialization (Lightsabers)

Repository: **6/6**

---

# 4. Noble

### Influence - 4
- Presence
- Demand Surrender
- Improved Weaken Resolve
- Weaken Resolve

Repository correct-tree representation: **3/4**

`Demand Surrender` currently exists under **Jedi Consular**, not Influence.

**Status:** `CORE_IDENTITY_MISSING_FROM_CORRECT_TREE`

### Inspiration - 5
- Bolster Ally
- Ignite Fervor
- Inspire Confidence
- Inspire Haste
- Inspire Zeal

Repository: **5/5**

### Leadership - 6
- Born Leader
- Coordinate
- Distant Command
- Fearless Leader
- Rally
- Trust

Repository correct-tree representation: **5/6**

`Born Leader` currently exists under **Naval Officer**.

**Status:** `CORE_IDENTITY_MISSING_FROM_CORRECT_TREE`

### Lineage - 4
- Connections
- Educated
- Spontaneous Skill
- Wealth

Repository: **4/4**

---

# 5. Scoundrel

### Fortune - 5
- Fool's Luck
- Fortune's Favor
- Gambler
- Knack
- Lucky Shot

Repository: **5/5**

### Misfortune - 5
- Dastardly Strike
- Disruptive
- Skirmisher
- Sneak Attack
- Walk the Line

Repository: **5/5**

### Slicer - 3
- Gimmick
- Master Slicer
- Trace

Repository: **3/3**

### Spacer - 4
- Hyperdriven
- Spacehound
- Starship Raider
- Stellar Warrior

Repository: **4/4**

---

# 6. Scout

### Awareness - 6
- Acute Senses
- Expert Tracker
- Improved Initiative
- Keen Shot
- Uncanny Dodge I
- Uncanny Dodge II

Repository correct-tree representation: **5/6**

`Acute Senses` currently exists under **Master Scout**.

The Unknown Regions primary-source pass already proved Acute Senses is not a Master Scout member. Core now positively identifies its correct source tree as Awareness.

**Status:** `WRONG_TREE_CONFIRMED`

### Camouflage - 3
- Hidden Movement
- Improved Stealth
- Total Concealment

Repository: **3/3**

### Fringer - 4
- Barter
- Fringe Savant
- Jury-Rigger
- Long Stride

Repository correct-tree representation: **2/4**

Current claims:
- Jury-Rigger -> Master Scout
- Long Stride -> Master Scout

The Unknown Regions pass already proved both are not Master Scout members; the Core book positively identifies both as Fringer talents.

**Status:** `WRONG_TREE_CONFIRMED` x2

### Survivor - 4
- Evasion
- Extreme Effort
- Sprint
- Surefooted

Repository: **4/4**

---

# 7. Soldier

### Armor Specialist - 5
- Armor Mastery
- Armored Defense
- Improved Armored Defense
- Juggernaut
- Second Skin

Repository: **5/5**

### Brawler - 5
- Expert Grappler
- Gun Club
- Melee Smash
- Stunning Strike
- Unbalance Opponent

Repository correct-tree representation: **1/5**

Current same-name records:
- Gun Club -> Republic Commando
- Melee Smash -> Melee Specialist
- Stunning Strike -> Melee Specialist
- Unbalance Opponent -> no exact repository record

The Clone Wars Melee Specialist source uses **Stunning Strike** and **Melee Smash** as prerequisites for its own talents; it does not thereby make them Melee Specialist members. The current placement is therefore structurally suspect and will be finalized during the Clone Wars tree pass.

Core definitively requires Brawler identities for all five names.

**Status:**
- Gun Club: `CORE_IDENTITY_MISSING_FROM_CORRECT_TREE`
- Melee Smash: `CORE_IDENTITY_MISSING_FROM_CORRECT_TREE`
- Stunning Strike: `CORE_IDENTITY_MISSING_FROM_CORRECT_TREE`
- Unbalance Opponent: `MISSING_CONTENT_CONFIRMED`

### Commando - 7
- Battle Analysis
- Cover Fire
- Demolitionist
- Draw Fire
- Harm's Way
- Indomitable
- Tough as Nails

Repository correct-tree representation: **5/7**

Current same-name records:
- Draw Fire -> Disgrace
- Harm's Way -> Protection

Core definitively places both in Commando.

Later books use Harm's Way as a prerequisite/reference in other protection-oriented trees; that does not make the Core Commando identity optional.

**Status:** `CORE_IDENTITY_MISSING_FROM_CORRECT_TREE` x2

### Weapon Specialist - 3
- Devastating Attack
- Penetrating Attack
- Weapon Specialization

Repository correct-tree representation: **1/3**

Current:
- Devastating Attack -> Weapon Master
- Penetrating Attack -> Weapon Master

Core Weapon Master explicitly cites the page-53 Devastating Attack and Penetrating Attack talents as prerequisites for the corresponding **Greater** talents. They are not Weapon Master origin members.

**Status:** `WRONG_TREE_CONFIRMED` x2

---

# 8. Core prestige trees

### Expert Pilot - 6
- Elusive Dogfighter
- Full Throttle
- Juke
- Keep It Together
- Relentless Pursuit
- Vehicular Evasion

Repository: **6/6**

### Gunner - 4
- Dogfight Gunner
- Expert Gunner
- Quick Trigger
- System Hit

Repository: **4/4**

### Bounty Hunter - 6
- Hunter's Mark
- Hunter's Target
- Notorious
- Nowhere to Hide
- Relentless
- Ruthless Negotiator

Repository correct-tree representation: **5/6**

The canonical Bounty Hunter `Notorious` identity is not currently in Bounty Hunter.

The repository has two Notorious-like records in the **Infamy** tree:

- `Notorious (Infamy)` - concise Intimidate reroll mechanic
- `Notorious` - heavily contaminated record combining unrelated material from several books

Core also separately prints a `Notorious` talent in **Infamy**. Therefore Bounty Hunter Notorious and Infamy Notorious must be treated as separate tree-scoped canonical identities even though their Core effects are closely related.

**Status:**
- Bounty Hunter Notorious: `SAME_NAME_CORE_IDENTITY_MISSING`
- current unsuffixed Infamy `Notorious`: `IDENTITY_CONTENT_CONTAMINATION_REVIEW`

### Infamy - 5
- Inspire Fear I
- Inspire Fear II
- Inspire Fear III
- Notorious
- Shared Notoriety

The repository contains a dedicated `Notorious (Infamy)` record with the expected Core Intimidate-reroll rule, plus a separate contaminated unsuffixed `Notorious` record.

The tree has the required mechanical identity represented, but naming/duplicate cleanup is required.

**Status:** `IDENTITY_RECONCILIATION_REQUIRED`

### Mastermind - 3
- Attract Minion
- Impel Ally I
- Impel Ally II

Repository: **3/3**

### Weapon Master - 8
- Controlled Burst
- Exotic Weapon Mastery
- Greater Devastating Attack
- Greater Penetrating Attack
- Greater Weapon Focus
- Greater Weapon Specialization
- Multiattack Proficiency (heavy weapons)
- Multiattack Proficiency (rifles)

Repository represents all 8 canonical mechanics.

One display-name variant exists:
- source: `Multiattack Proficiency (heavy weapons)`
- repo: `Multiattack Proficiency (heavy)`

**Status:** 8/8 represented, plus `IDENTITY_NAMING_VARIANT`

The current Weapon Master tree also claims Devastating Attack and Penetrating Attack, which Core places in Weapon Specialist; see above.

### Dark Side Devotee - 4
- Channel Aggression
- Channel Anger
- Crippling Strike
- Embrace the Dark Side

Repository: **4/4**

### Force Adept - 3
- Force Power Adept
- Force Treatment
- Fortified Body

Repository: **3/3**

### Force Item - 4
- Attune Weapon
- Empower Weapon
- Force Talisman
- Greater Force Talisman

Repository: **4/4**

### Gunslinger - 5
- Debilitating Shot
- Deceptive Shot
- Improved Quick Draw
- Knockdown Shot
- Multiattack Proficiency (pistols)

Repository: **5/5**

### Duelist - 5
- Force Fortification
- Greater Weapon Focus (Lightsabers)
- Greater Weapon Specialization (Lightsabers)
- Multiattack Proficiency (lightsabers)
- Severing Strike

Repository correct-tree representation: **4/5**

A same-name record exists under **Jedi Battlemaster**:

`Multiattack Proficiency (Lightsabers)`

Core requires a Duelist identity. The KOTOR Jedi Battlemaster source must be checked before deciding whether this is a misplaced Core record or a legitimate same-name reuse.

**Status:** `CORE_IDENTITY_MISSING_FROM_CORRECT_TREE`

### Lightsaber Forms - 12
- Ataru
- Djem So
- Jar'Kai
- Juyo
- Makashi
- Niman
- Shien
- Shii-Cho
- Sokan
- Soresu
- Trakata
- Vaapad

Repository: **12/12**

### Military Tactics - 9
- Assault Tactics
- Deployment Tactics
- Field Tactics
- One for the Team
- Outmaneuver
- Shift Defense I
- Shift Defense II
- Shift Defense III
- Tactical Edge

Repository: **9/9**

### Sith - 6
- Dark Healing
- Dark Scourge
- Dark Side Adept
- Dark Side Master
- Force Deception
- Wicked Strike

Repository: **6/6**

---

# 9. Core-origin discrepancy summary

Sixteen Core-origin identities are absent from their canonical Core tree:

| Canonical tree | Talent | Current repository state |
|---|---|---|
| Jedi Consular | Skilled Advisor | claimed by Jedi Archivist |
| Influence | Demand Surrender | claimed by Jedi Consular |
| Leadership | Born Leader | claimed by Naval Officer |
| Awareness | Acute Senses | claimed by Master Scout |
| Fringer | Jury-Rigger | claimed by Master Scout |
| Fringer | Long Stride | claimed by Master Scout |
| Brawler | Gun Club | claimed by Republic Commando |
| Brawler | Melee Smash | claimed by Melee Specialist |
| Brawler | Stunning Strike | claimed by Melee Specialist |
| Brawler | Unbalance Opponent | no exact repo record |
| Commando | Draw Fire | claimed by Disgrace |
| Commando | Harm's Way | claimed by Protection |
| Weapon Specialist | Devastating Attack | claimed by Weapon Master |
| Weapon Specialist | Penetrating Attack | claimed by Weapon Master |
| Bounty Hunter | Notorious | Bounty Hunter identity absent; Infamy has conflicting Notorious records |
| Duelist | Multiattack Proficiency (lightsabers) | same-name record claimed by Jedi Battlemaster |

Of these:

- **1** is unequivocally absent by exact identity: Unbalance Opponent.
- **15** have a same-name repository record elsewhere, but same-name does not automatically mean safe move.
- Acute Senses, Jury-Rigger, Long Stride, Devastating Attack, and Penetrating Attack already have strong source evidence of wrong placement.
- Other same-name cases require their destination/sourcebook tree pass before destructive reassignment.

---

# 10. Core direct access summary

No direct Core class/tree grant is missing.

This matters because it tells us the dominant Core structural failure mode is:

```text
correct classes
   -> generally correct tree documents
      -> some canonical talents migrated into the wrong tree
```

rather than missing Core class access.

---

# 11. Important model correction: origin vs expansion

Many current Core-origin tree documents contain far more talents than the Core origin list.

Examples:

- Jedi Consular: 21 current records vs 4 Core-origin talents
- Brawler: 16 current vs 5 Core-origin
- Military Tactics: 13 current vs 9 Core-origin
- Sith: 12 current vs 6 Core-origin

Those extra current records are **not automatically invalid**.

Later sourcebooks legitimately expand existing trees.

Therefore the canonical registry must track:

1. tree origin source;
2. origin talent membership;
3. later talent-publication additions;
4. source-scoped class-access grants.

This is now encoded in registry schema v2 and will be extended for source-scoped access.

---

# 12. Core correction candidates for later implementation

Do **not** execute these during the audit, but Core has established the following correction queue.

## High-confidence wrong-tree corrections

- Acute Senses -> Awareness
- Jury-Rigger -> Fringer
- Long Stride -> Fringer
- Devastating Attack -> Weapon Specialist
- Penetrating Attack -> Weapon Specialist

## Source-confirmed missing identity

- create/restore Unbalance Opponent in Brawler

## Identity/source adjudication required before move

- Skilled Advisor
- Demand Surrender
- Born Leader
- Gun Club
- Melee Smash
- Stunning Strike
- Draw Fire
- Harm's Way
- Bounty Hunter Notorious
- Multiattack Proficiency (lightsabers)

These are definitely missing from their Core canonical tree, but their current same-name destination must be source-audited before deciding whether to move the existing ID or preserve a same-name variant.

---

# 13. What this phase does NOT certify

This pass does not yet certify all 173 Core talents for:

- description fidelity
- prerequisite fidelity
- action/trigger/target/duration
- abilityMeta/runtime correctness
- automation ceiling
- mechanical owner

It certifies:

- Core tree provenance
- Core-origin tree membership
- direct Core class/prestige access
- current structural placement against those origin identities

---

# 14. Phase 1D-B stop gate

- [x] Enumerate all 34 Core class/prestige tree identities.
- [x] Enumerate 173 Core-origin talent identities.
- [x] Visually verify ambiguous prestige sections in the Core PDF.
- [x] Compare every Core origin identity to the current tree pack.
- [x] Check direct Core class/prestige access against current class docs.
- [x] Separate later tree expansions from Core origin membership.
- [x] Identify same-name collision cases without unsafe deduplication.
- [x] Identify one source-confirmed truly missing Core talent identity.
- [x] Make no production/data changes.
- [x] Publish findings on the existing audit branch.

# Verdict

Core access is structurally sound, but prior talent cleanup has displaced a meaningful set of foundational talents.

Of **173 Core-origin talent identities**, **157 are currently in their correct canonical tree** and **16 are not**.

The most concerning pattern is not simple omission. It is that several foundational Core talents have been absorbed into later prestige/sourcebook trees because those later talents reference them as prerequisites or related abilities. That is exactly the kind of repository-consistent but source-incorrect state this audit was designed to expose.

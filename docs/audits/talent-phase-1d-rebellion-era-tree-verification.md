# PHASE 1D-RECG FINDINGS - Rebellion Era Class Talent Tree Verification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

**Primary sources used:**
- `Star Wars Saga Edition - Rebellion Era Campaign Guide.pdf`
- `Rebellion Era Campaign Guide_djvu.txt` for indexing/search

> **Evidence rule:** the TXT file was used to locate and enumerate sections quickly. Relevant PDF pages were rendered and visually checked before structural conclusions were promoted to source-certified status.

---

# 1. Sourcebook class-tree set

The Rebellion Era Campaign Guide introduces or defines the following nine class/prestige-class talent trees relevant to the class-tree registry:

| Tree | Class access | Printed page |
|---|---|---:|
| Gambling Leader | Noble | 24 |
| Recklessness | Scoundrel | 25 |
| Unpredictable | Scout | 26 |
| Ambusher | Soldier | 28 |
| Wingman | Ace Pilot | 40 |
| Rebel Recruiter | Officer | 40 |
| Procurement | Improviser | 43 |
| Improviser | Improviser | 43 |
| Pathfinder | Pathfinder | 45 |

All nine current repository class-access edges match the primary source.

**Access verdict:** `ACCESS_CORRECT` x9.

---

# 2. Gambling Leader - Noble

Canonical membership:

1. Assault Gambit
2. Direct Fire
3. Face the Foe
4. Lead From the Front
5. Luck Favors the Bold

Repository:

- tree id `b7a1211d08826500`
- 5/5 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 3. Recklessness - Scoundrel

Canonical membership:

1. Find Openings
2. Hit the Deck
3. Lure Closer
4. Risk for Reward
5. Trick Step

Repository:

- tree id `4af97ad058b1b30f`
- 5/5 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 4. Unpredictable - Scout

Canonical membership:

1. Aggressive Surge
2. Blast Back
3. Fade Away
4. Second Strike
5. Swerve

Repository:

- tree id `5a30489609182e8c`
- 5/5 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 5. Ambusher - Soldier

Canonical membership:

1. Ambush Specialist
2. Destructive Ambusher
3. Keep It Going
4. Keep Them Reeling
5. Perceptive Ambusher
6. Spring the Trap

Repository:

- tree id `12027e0ad5e4d260`
- 6/6 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 6. Wingman - Ace Pilot

Canonical membership:

1. Concentrate All Fire
2. Escort Pilot
3. Lose Pursuit
4. Run Interference
5. Wingman Retribution

Repository tree:

```text
Wingman
id: 5f355ad4093d2bf8

members:
- Wingman Retribution
- Escort
- Concentrate All Fire
- Escort Pilot
- Run Interference
- Lose Pursuit
```

The repository has all five canonical talents, but also includes an extra talent document:

```text
Escort
id: 6f3641f0ff39fc90
```

Its benefit is the same published mechanic as **Escort Pilot**:

> while piloting adjacent to an allied Colossal-or-smaller vehicle, both vehicles gain +10 Damage Threshold.

The repository also separately contains the proper **Escort Pilot** record:

```text
Escort Pilot
id: 7aa3eec9b7f748ef
```

with the canonical wording/mechanic.

Therefore `Escort` is not a sixth Rebellion Era Wingman talent. It is a duplicate/alias contamination record.

**Verdict:**
- canonical membership present: 5/5
- `Escort`: `INVALID_DUPLICATE_CONFIRMED`
- tree currently has 1 extra noncanonical member

This should be repaired later by preserving `Escort Pilot` and retiring/removing the duplicate `Escort` record after reference checks.

---

# 7. Rebel Recruiter - Officer

Canonical membership:

1. Bolstered Numbers
2. Noble Sacrifice
3. Recruit Enemy
4. Stay in the Fight
5. Team Recruiting

Repository tree:

```text
Rebel Recruiter
id: a2c6962521c29361

members:
- Stay in the Fight (Recruit)
- Noble Sacrifice
- Bolstered Numbers
- Recruit Enemy
- Team Recruiting
```

The repository's `Stay in the Fight (Recruit)` record implements the printed **Stay in the Fight** mechanic:

> after successfully using Recruit Enemy on a target that can catch a second wind, the target may immediately do so as a reaction.

This is not missing content, but the repository name is system-disambiguated rather than canonically named.

**Verdict:**
- canonical mechanics represented: 5/5
- `Stay in the Fight (Recruit)`: `IDENTITY_NAMING_VARIANT`
- no sourcebook evidence for the printed parenthetical suffix

A later identity pass should decide whether the display name can safely normalize to `Stay in the Fight` while retaining an internal unique key if collision avoidance is needed.

---

# 8. Procurement - Improviser

Canonical membership:

1. Black Market Buyer
2. Excellent Kit
3. Just What Is Needed
4. Only the Finest
5. Right Gear for the Job

Repository:

- tree id `a0d6323d6c1bf911`
- 5/5 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 9. Improviser - Improviser prestige class

Canonical membership:

1. Bigger Bang
2. Capture Droid
3. Custom Model
4. Improved Jury-Rig
5. Improvised Device

Repository:

- tree id `7f37422819d7be6f`
- 5/5 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 10. Pathfinder - Pathfinder prestige class

Canonical membership:

1. Bunker Blaster
2. Defensive Measures
3. Enhance Cover
4. Escort Fighter
5. Launch Point
6. Obscuring Defenses
7. Relocate
8. Safe Passage
9. Safe Zone
10. Zone of Recuperation

Repository:

- tree id `383ff8d392488cf8`
- 10/10 canonical members present
- no extra members

**Verdict:** `TREE_MEMBERSHIP_CORRECT`

---

# 11. Rebellion Era structural summary

| Tree | Canonical count | Canonical members represented | Extra / naming issue |
|---|---:|---:|---|
| Gambling Leader | 5 | 5 | none |
| Recklessness | 5 | 5 | none |
| Unpredictable | 5 | 5 | none |
| Ambusher | 6 | 6 | none |
| Wingman | 5 | 5 | extra duplicate `Escort` |
| Rebel Recruiter | 5 | 5 | `Stay in the Fight (Recruit)` naming variant |
| Procurement | 5 | 5 | none |
| Improviser | 5 | 5 | none |
| Pathfinder | 10 | 10 | none |
| **Total canonical identities** | **51** | **51** | **1 invalid duplicate + 1 naming variant** |

This is materially healthier than the discrepancy-heavy Galaxy at War / Galaxy of Intrigue / Unknown Regions sets.

---

# 12. Source-confirmed future correction packet

## Safe identity cleanup candidate

- retire/remove duplicate `Escort` after proving no external references require its ID
- retain canonical `Escort Pilot`

## Naming normalization candidate

- `Stay in the Fight (Recruit)` -> canonical display name `Stay in the Fight`
- preserve a unique internal key if needed to avoid collision with any other same-name ability

No Rebellion Era class/tree access additions are required for these nine trees.

No missing tree documents were found.

No canonical talents are missing from these nine trees.

---

# 13. What this pass does NOT yet certify

Still pending:

- full description fidelity for all 51 talents
- prerequisite fidelity
- abilityMeta/runtime behavior
- automation ceiling
- mechanical owner
- progression tests

This pass certifies sourcebook identity, tree membership, and access structure.

---

# 14. Stop gate

- [x] TXT sections indexed.
- [x] Relevant PDF pages rendered and visually checked.
- [x] Nine Rebellion Era class/prestige tree identities confirmed.
- [x] Class access compared to repository.
- [x] Canonical membership compared to repository.
- [x] Invalid duplicate `Escort` identified.
- [x] `Stay in the Fight (Recruit)` classified as a naming variant rather than missing content.
- [x] No production/data changes made.
- [x] Findings published on the existing audit branch.

# Verdict

The Rebellion Era class-tree graph is largely healthy: all **51 canonical talent identities** across the nine audited trees are represented.

The structural defects are narrow and specific:

1. **Wingman has one extra duplicate/noncanonical `Escort` record that duplicates `Escort Pilot`.**
2. **Rebel Recruiter uses a noncanonical display suffix for `Stay in the Fight`.**

This book is ready to enter the Phase 1D canonical registry as primary-source verified.

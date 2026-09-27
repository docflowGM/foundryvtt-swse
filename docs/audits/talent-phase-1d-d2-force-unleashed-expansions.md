# PHASE 1D-D2 FINDINGS - The Force Unleashed Talent Expansion Publications

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

**Primary source:** `SAGA EDITION - Force Unleashed Campaign Guide.pdf`  
**Indexing source:** `Force Unleashed Campaign Guide_djvu.txt`

> **Scope:** Records Force Unleashed additions to pre-existing class/prestige/Force talent trees. This is separate from the 15 tree origins verified in Phase 1D-D.

---

# 1. Publication census

The Force Unleashed Campaign Guide adds **24 talents** to pre-existing trees in this pass.

Repository result:

- **24/24 present**
- **24/24 in the correct tree**
- **0 missing**
- **0 wrong-tree placements in this publication set**

---

# 2. Jedi tree additions

## Jedi Consular
Adds:
- Cleanse Mind
- Force of Will

Repository: **2/2**

## Jedi Guardian
Adds:
- Forceful Warrior
- Mobile Combatant

Repository: **2/2**

### Mobile Combatant identity protection

This is the Force Unleashed/Jedi Guardian `Mobile Combatant`.

Galaxy at War separately publishes a different `Mobile Combatant` in the Advance Patrol tree.

The current repo record belongs to Jedi Guardian and correctly represents the Force Unleashed identity.

The Galaxy at War identity remains missing and must be created separately.

## Jedi Sentinel
Adds:
- Dampen Presence
- Steel Resolve

Repository: **2/2**

---

# 3. Noble tree additions

## Inspiration
Adds:
- Willpower

Repository: **1/1**

## Lineage
Adds:
- Influential Friends
- Powerful Friends

Repository: **2/2**

---

# 4. Scoundrel / Scout additions

## Slicer
Adds:
- Electronic Forgery
- Electronic Sabotage
- Security Slicer

Repository: **3/3**

## Awareness
Adds:
- Reset Initiative

Repository: **1/1**

The source prerequisite explicitly references Core `Acute Senses`, reinforcing the Core/Unknown Regions finding that Acute Senses belongs to Awareness and not Master Scout.

---

# 5. Prestige-tree additions

## Bounty Hunter
Adds:
- Fearsome
- Signature Item
- Jedi Hunter

Repository: **3/3**

`Fearsome` requires the Core Bounty Hunter `Notorious` talent, further strengthening the need to restore/reconcile the missing Bounty Hunter Notorious identity rather than treating the Infamy record as a universal singleton.

## Duelist
Adds:
- Improved Lightsaber Throw
- Thrown Lightsaber Mastery

Repository: **2/2**

---

# 6. Force-tree additions

## Alter
Adds:
- Illusion
- Telekinetic Prodigy

Repository: **2/2**

## Control
Adds:
- Force Exertion
- Indomitable Will

Repository: **2/2**

## Dark Side
Adds:
- Wrath of the Dark Side

Repository: **1/1**

## Sense
Adds:
- Feel the Force

Repository: **1/1**

---

# 7. Structural summary

| Existing tree | FUC additions | Present |
|---|---:|---:|
| Jedi Consular | 2 | 2 |
| Jedi Guardian | 2 | 2 |
| Jedi Sentinel | 2 | 2 |
| Inspiration | 1 | 1 |
| Lineage | 2 | 2 |
| Slicer | 3 | 3 |
| Awareness | 1 | 1 |
| Bounty Hunter | 3 | 3 |
| Duelist | 2 | 2 |
| Alter | 2 | 2 |
| Control | 2 | 2 |
| Dark Side | 1 | 1 |
| Sense | 1 | 1 |
| **Total** | **24** | **24** |

---

# 8. Source-confirmed implications

This pass supplies positive provenance for several current records that might otherwise look like unexplained extras in Core-origin trees.

It also reinforces several earlier findings:

- `Acute Senses` is a Core Awareness prerequisite referenced by later Awareness material, not a Master Scout member.
- Core Bounty Hunter `Notorious` is a real prerequisite for later Bounty Hunter content and needs its own tree-scoped identity.
- Force Unleashed Jedi Guardian `Mobile Combatant` is legitimate and must remain separate from Galaxy at War Advance Patrol `Mobile Combatant`.

---

# 9. Stop gate

- [x] Enumerate all FUC additions to pre-existing class trees.
- [x] Enumerate all FUC additions to pre-existing prestige trees.
- [x] Enumerate all FUC additions to the core Force trees.
- [x] Compare all 24 publication identities to the repository.
- [x] Confirm 24/24 correct-tree representation.
- [x] Preserve same-name Mobile Combatant identities separately.
- [x] Make no production/data changes.
- [x] Publish findings on the existing audit branch.

# Verdict

The Force Unleashed expansion-publication layer is structurally complete.

Unlike the Specialized Droid origin problem, **none of the 24 FUC additions to existing trees is missing or misplaced**.

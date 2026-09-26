# PHASE 1D-C2 FINDINGS - Clone Wars Talent Expansion Publications

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

**Primary source:** `SAGA EDITION - Clone Wars Campaign Guide.pdf`  
**Indexing source:** `Clone Wars Campaign Guide_djvu.txt`

> **Scope:** Phase 1D-C verified the 14 new class/prestige tree identities introduced by Clone Wars. This sub-phase records **Clone Wars additions to pre-existing talent trees**, plus the new Light Side Force talent tree.

---

# 1. Publication census

Clone Wars publishes **27 talent identities** in this expansion layer:

- 23 additions to previously existing trees
- 4 origin talents in the new Light Side Force talent tree

Repository state:

| Measure | Count |
|---|---:|
| Published identities in this pass | **27** |
| Present in correct tree | **26** |
| Missing from repository | **1** |

The sole missing identity is:

**The Will To Resist** -> Control talent tree.

---

# 2. Class-tree expansions

## Jedi Consular
Clone Wars adds:
- Consular's Vitality
- Improved Consular's Vitality

Repository: **2/2**

## Jedi Guardian
Adds:
- Exposing Strike
- Guardian Strike

Repository: **2/2**

## Jedi Sentinel
Adds:
- Sentinel's Observation
- Unseen Eyes

Repository: **2/2**

## Misfortune
Adds:
- Stymie

Repository: **1/1**

## Brawler
Adds:
- Bayonet Master
- Unrelenting Assault

Repository: **2/2**

These talents explicitly depend on Core Brawler abilities:
- Bayonet Master -> Gun Club
- Unrelenting Assault -> Melee Smash

This further confirms that Gun Club and Melee Smash remain Core Brawler identities and should not have been absorbed into Republic Commando / Melee Specialist.

## Commando
Adds:
- Keep Them at Bay

Repository: **1/1**

## Expert Pilot
Adds:
- Renowned Pilot

Repository: **1/1**

## Force Item
Adds:
- Focused Force Talisman
- Greater Focused Force Talisman

Repository: **2/2**

## Gunslinger
Adds:
- Blind Shot

Repository: **1/1**

## Military Tactics
Adds:
- Exploit Weakness
- Grand Leader
- Uncanny Defense

Repository: **3/3**

---

# 3. Force-tree publications

## Alter
Adds:
- Aversion

Repository: **1/1**

## Control
Adds:
- The Will To Resist

Repository: **0/1**

No exact repository talent document exists.

**Disposition:** `MISSING_CONTENT_CONFIRMED`

## Dark Side
Adds:
- Consumed by Darkness

Repository: **1/1**

## Sense
Adds:
- Heightened Awareness
- Psychometry
- Shift Sense

Repository: **3/3**

---

# 4. New Light Side Force Talent Tree

Clone Wars introduces the Light Side Talent Tree.

Canonical origin membership:

1. At Peace
2. Attuned
3. Focused Attack
4. Surge of Light

The tree has a special Force-access condition:
- character must be able to select Force talents;
- Dark Side Score must be 0 to select/use access as described by the source.

Current repository:

```text
Light Side
id: 001a438135e03588
talents:
- Focused Attack
- Surge of Light
- Attuned
- At Peace
```

Repository: **4/4**

**Verdict:** `TREE_ORIGIN_CORRECT`

This tree should be represented in the canonical registry as a Force talent tree, not as a class-owned tree.

---

# 5. Structural consequence

Clone Wars demonstrates why the registry must separate:

```text
tree origin
from
later talent publications
```

For example:

```text
Brawler
  origin: Core Rulebook
  Core members: Expert Grappler, Gun Club, Melee Smash, Stunning Strike, Unbalance Opponent
  Clone Wars additions: Bayonet Master, Unrelenting Assault
```

A flat "book = Clone Wars" or "tree = Core" field cannot represent this correctly.

---

# 6. Source-confirmed missing content

Only one publication in this pass is genuinely absent:

```text
Control -> The Will To Resist
```

This should eventually be created from the source wording, not reconstructed from a web summary.

---

# 7. Stop gate

- [x] Enumerate all Clone Wars additions to existing class trees.
- [x] Enumerate Clone Wars Force-tree additions.
- [x] Verify the Light Side tree origin and membership.
- [x] Compare all 27 identities against the repo.
- [x] Identify one missing published talent.
- [x] Record publication-level provenance separately from tree origin.
- [x] Make no production/data changes.
- [x] Publish findings on the same audit branch.

# Verdict

Clone Wars expansion coverage is strong: **26 of 27 published identities are present in the correct tree**.

The significant finding is not widespread missing content but provenance structure:

- later books expand Core trees extensively;
- prerequisites from Core must not be mistaken for members of the later prestige tree;
- Force trees need a special access model rather than class ownership;
- `The Will To Resist` is the sole source-confirmed missing Clone Wars expansion talent in this pass.

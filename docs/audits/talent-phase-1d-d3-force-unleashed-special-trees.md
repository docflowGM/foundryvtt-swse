# PHASE 1D-D3 FINDINGS - Force Unleashed Special Talent Trees

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

**Primary source:** `SAGA EDITION - Force Unleashed Campaign Guide.pdf`  
**Indexing source:** `Force Unleashed Campaign Guide_djvu.txt`  
**PDF pages visually verified:** printed pp. 92-93 and 102-103

> **Scope:** This pass source-classifies Force Unleashed talent trees that do not belong to the normal Class -> Talent Tree index: Force traditions and droid-degree talent trees.

---

# 1. Source-classification result

Seven current repository trees previously sitting in the `REPO_SPECIAL_SOURCE_REVIEW` bucket are directly sourced to The Force Unleashed Campaign Guide:

## Force-tradition trees
- Agent of Ossus
- Felucian Shaman

## Droid-degree trees
- First-Degree Droid
- Second-Degree Droid
- Third-Degree Droid
- Fourth-Degree Droid
- Fifth-Degree Droid

These are valid published tree identities, not repository inventions.

---

# 2. Agent of Ossus Talent Tree

Primary source: printed p. 92.

Canonical membership:

1. Buried Presence
2. Conceal Other
3. Insightful Aim
4. Vanish

Access model:
- Force talent tree
- requires Force Sensitivity
- tradition membership is available through the membership conditions described by the source

Current repository tree:

```text
Agent Of Ossus
id: 754907ded50d4f46
members:
- Buried Presence
```

Three canonical talent documents are absent:
- Conceal Other
- Insightful Aim
- Vanish

## Buried Presence is a corrupted composite

The current `Buried Presence` document does **not** preserve the printed Buried Presence mechanic.

Instead, its text is a concatenation of effects belonging to:
- Conceal Other
- Insightful Aim
- Vanish

and omits the actual primary Buried Presence effect:
- spend a Force Point to become immune to Force detection for 1 hour, with the source's reaction/use limitations.

**Disposition:**
- tree identity: `SOURCE_CONFIRMED`
- Buried Presence document: `MECHANICS_CONTENT_CONTAMINATION_CONFIRMED`
- Conceal Other: `MISSING_CONTENT_CONFIRMED`
- Insightful Aim: `MISSING_CONTENT_CONFIRMED`
- Vanish: `MISSING_CONTENT_CONFIRMED`

---

# 3. Felucian Shaman Talent Tree

Primary source: printed p. 93.

Canonical membership:

1. Detonate
2. Hive Mind
3. Infuse Weapon
4. Sickening Blast

Special access:
- membership in the Felucian shaman tradition is restricted to Felucians trained in Use the Force
- the source separately permits Felucian shamans to select **Charm Beast** and **Command Beast** from the Dathomiri Witch tree; those two talents are not members of the Felucian Shaman tree itself

Current repository tree:

```text
Felucian Shaman
id: 8a61bf426391431b
members:
- Infused Weapon
```

No exact canonical talent identity is represented correctly.

## Infused Weapon is a corrupted composite

The current `Infused Weapon` record:
- uses a noncanonical display name instead of `Infuse Weapon`
- contains only a fragment of the printed Infuse Weapon text
- appends the separate Sickening Blast mechanic
- appends explicit Wikia-user-created homebrew text for `Skullblade Mastery`

That homebrew language does not appear in the sourcebook.

**Disposition:** `CANONICAL_CONTENT_PLUS_HOMEBREW_CONTAMINATION_CONFIRMED`

Source-confirmed missing/reconstruction identities:
- Detonate
- Hive Mind
- Infuse Weapon
- Sickening Blast

The existing contaminated record should not be considered a certified substitute for any of those four.

---

# 4. Droid Talent Trees

The Force Unleashed Campaign Guide printed p. 102 explicitly establishes that droid talents work like normal talents but each tree is restricted by **droid degree**.

This is a separate access model from class-owned trees.

## First-Degree Droid

Canonical membership:
- Dull the Pain
- Interrogator
- Medical Droid

Current repo:
- Medical Droid

Correct: **1/3**

Missing:
- Dull the Pain
- Interrogator

## Second-Degree Droid

Canonical membership:
- Adept Assistant
- Mechanics Mastery
- Vehicle Mechanic

Current repo:
- Burst Transfer

Correct FUC-origin representation: **0/3**

`Burst Transfer` is a legitimate later Scavenger's Guide to Droids addition and is not an error.

Missing FUC-origin content:
- Adept Assistant
- Mechanics Mastery
- Vehicle Mechanic

## Third-Degree Droid

Canonical membership:
- Etiquette
- Helpful
- Protocol

Current repo:
- Observant

Correct FUC-origin representation: **0/3**

`Observant` is a legitimate later Scavenger's Guide addition.

Missing:
- Etiquette
- Helpful
- Protocol

## Fourth-Degree Droid

Canonical membership:
- Combat Repairs
- Droid Smash
- Targeting Package

Current repo:
- Target Acquisition

Correct FUC-origin representation: **0/3**

`Target Acquisition` is a legitimate later Scavenger's Guide addition.

Missing:
- Combat Repairs
- Droid Smash
- Targeting Package

## Fifth-Degree Droid

Canonical membership:
- Cargo Hauler
- Environmentally Shielded
- Power Supply

Current repo:
- Heavy-Duty Actuators

Correct FUC-origin representation: **0/3**

`Heavy-Duty Actuators` is a legitimate later Scavenger's Guide addition.

Missing:
- Cargo Hauler
- Environmentally Shielded
- Power Supply

---

# 5. Special-tree completeness summary

| Tree | FUC canonical origin | Correct source content currently represented | Missing / reconstruction |
|---|---:|---:|---:|
| Agent of Ossus | 4 | 0 certified | 4 |
| Felucian Shaman | 4 | 0 certified | 4 |
| First-Degree Droid | 3 | 1 | 2 |
| Second-Degree Droid | 3 | 0 | 3 |
| Third-Degree Droid | 3 | 0 | 3 |
| Fourth-Degree Droid | 3 | 0 | 3 |
| Fifth-Degree Droid | 3 | 0 | 3 |
| **Total** | **23** | **1 certified** | **22 requiring creation/reconstruction** |

Two current records have names related to source identities but are not source-correct:
- Buried Presence
- Infused Weapon

If counting only exact document-name existence rather than content fidelity, Buried Presence technically exists; it is not mechanically certifiable in its current form.

---

# 6. Important access-model implications

The canonical registry now needs at least four tree-access models:

1. `CLASS_ACCESS`
2. `FORCE_TALENT`
3. `FORCE_TRADITION`
4. `DROID_DEGREE`

Trying to force these special trees into Class -> Tree ownership would be incorrect.

### Agent of Ossus
Use Force-tradition membership + Force Sensitivity.

### Felucian Shaman
Use tradition membership restrictions, including species/training requirements.

### Degree-droid trees
Access depends on the droid's degree rather than heroic/prestige class.

---

# 7. Source-confirmed contamination

This pass proves two particularly severe content defects:

## Buried Presence
One talent record contains three other talents' mechanics and omits its own rule.

## Infused Weapon
One record merges:
- part of Infuse Weapon
- Sickening Blast
- explicit fan-created Wikia content

These should be handled as **identity reconstruction**, not simple description edits.

---

# 8. Stop gate

- [x] Visually verify Agent of Ossus source page.
- [x] Visually verify Felucian Shaman source page.
- [x] Visually verify all five droid-degree origin trees.
- [x] Source-classify seven repo-special trees.
- [x] Separate later Scavenger additions from FUC origin membership.
- [x] Identify Buried Presence composite corruption.
- [x] Identify Infused Weapon canonical/homebrew contamination.
- [x] Identify missing FUC droid-degree content.
- [x] Define special access models for the registry.
- [x] Make no production/data changes.
- [x] Publish findings on the existing branch.

# Verdict

The repo-only special-tree bucket is already yielding high-value source truth.

These seven trees are canonical Force Unleashed content, but their implementation state is much worse than the normal class-tree set: only **1 of 23 origin talents is presently source-correct without reconstruction**.

The strongest defects are the merged Agent of Ossus/Felucian records and the near-total absence of the original degree-droid talent sets.

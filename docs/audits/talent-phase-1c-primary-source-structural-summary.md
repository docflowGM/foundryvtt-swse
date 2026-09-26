# PHASE 1C SUMMARY - Primary-Source Structural Talent Adjudication

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

## Published sourcebook sub-phases

- `docs/audits/talent-phase-1c-galaxy-at-war-structural-adjudication.md`
- `docs/audits/talent-phase-1c-galaxy-of-intrigue-structural-adjudication.md`
- `docs/audits/talent-phase-1c-scavengers-guide-to-droids-structural-adjudication.md`
- `docs/audits/talent-phase-1c-unknown-regions-structural-adjudication.md`
- `docs/audits/talent-phase-1c-scum-and-villainy-genoharadan-adjudication.md`
- `docs/audits/talent-phase-1c-legacy-provocateur-structural-adjudication.md`

---

# 1. Phase 1C purpose

Phase 1B used the SWSE Fandom Talent page as a secondary index to identify structural discrepancies in:

```text
Class -> Talent Tree -> Talent
```

Phase 1C then adjudicated those discrepancies against the actual uploaded sourcebooks wherever primary PDFs were available.

No production/data changes were made.

---

# 2. Primary-source books completed

| Sourcebook | Structural queue | Status |
|---|---|---|
| Galaxy at War | 9 tree identities / access rows | COMPLETE |
| Galaxy of Intrigue | 4 trees | COMPLETE |
| Scavenger's Guide to Droids | Override | COMPLETE |
| The Unknown Regions | 5 trees | COMPLETE |
| Scum and Villainy | GenoHaradan split | COMPLETE |
| Legacy Era Campaign Guide | Provocateur | COMPLETE |

---

# 3. Aggregate source-confirmed structural findings

Across the five available primary sources, the discrepancy queue covered **98 published talent identities**.

## Missing/correct-tree content

Source-confirmed missing or missing-correct-identity talents:

- Galaxy at War: 32
- Galaxy of Intrigue: 17
- Scavenger's Guide to Droids: 3
- The Unknown Regions: 22
- Scum and Villainy / GenoHaradan: 0 missing documents; all four exist but are split across malformed tree identities

**Total source-confirmed missing/correct-tree talent identities: 74**

This is substantially worse than a simple class-access problem.

---

# 4. Source-confirmed class -> tree access gaps

## Galaxy at War

- Noble -> Anticipation
- Scoundrel -> Brigand
- Scout -> Advance Patrol
- Gunslinger -> Sharpshooter
- Soldier -> Shockboxer
- Soldier -> Veteran
- Elite Trooper -> Galaxy at War Squad Leader identity
- Martial Arts Master -> Martial Arts Forms
- Martial Arts Master -> Unarmed Mastery

## Galaxy of Intrigue

- Noble -> Master of Intrigue
- Noble -> Skill Challenge
- Scoundrel -> Revolutionary
- Scout -> Espionage

## Scavenger's Guide to Droids

- Droid Commander -> Override

## The Unknown Regions

- Noble -> Exile
- Scoundrel -> Outsider
- Scout -> Master Scout
- Scout -> Mobile Scout
- Soldier -> Warrior

**Total source-confirmed missing class/tree access edges: 20**

Scum and Villainy's Assassin -> GenoHaradan relationship is present only through one malformed partial tree identity and therefore requires identity repair rather than a simple additional edge.

---

# 5. Source-confirmed missing tree identities

## Galaxy at War

1. Squad Leader [Galaxy at War / Elite Trooper] - same display name as a distinct Clone Wars/Soldier tree
2. Martial Arts Forms
3. Unarmed Mastery

## Galaxy of Intrigue

4. Skill Challenge
5. Espionage

These are **five source-confirmed missing tree identities**.

In addition:

## Scum and Villainy

The canonical GenoHaradan tree exists only as two malformed fragments:

- `Genoharadan`
- `Genohardan`

This is a **split-tree identity defect**, not an absent-content defect.

---

# 6. Source-confirmed wrong tree membership

The Unknown Regions produced five direct membership errors.

## Master Scout currently claims incorrectly

- Long Stride
- Jury-Rigger
- Acute Senses

Only Tripwire is a canonical member among the current four claims.

## Warrior currently claims incorrectly

- Weapon Proficiency (Simple Weapons)
- Ranged Disarm

Only Warrior's Awareness is canonical among the current three claims.

**Total direct wrong-tree claims confirmed in Phase 1C: 5**

---

# 7. Same-name identity hazards confirmed by primary source

Phase 1C confirms that name-only identity is unsafe for both talents and trees.

## Same-name tree identity

### Squad Leader

Two published tree identities exist:

- Clone Wars / Soldier
- Galaxy at War / Elite Trooper

They have different talent memberships.

## Same-name talent identities

### Mobile Combatant

- existing repository Jedi Guardian / Force Unleashed talent
- separate Galaxy at War Advance Patrol talent

### Blend In

- existing repository Spy talent
- separate Galaxy of Intrigue Master of Intrigue talent

### Strength in Numbers

- existing repository Republic Commando talent
- separate Unknown Regions Exile talent

These must be keyed by source/tree identity rather than name alone.

---

# 8. Source-confirmed split identity

## GenoHaradan

Primary source proves one canonical Assassin tree:

```text
GenoHaradan
- Deadly Repercussions
- Manipulating Strike
- Improved Manipulating Strike
- Pulling the Strings
```

Repository currently splits this into:

- `Genoharadan` -> Manipulating Strike
- `Genohardan` -> the other three talents

All content exists, but the graph is structurally fragmented.

---

# 9. Current structural quality by book

| Book | Published identities audited | Correctly represented in correct tree | Missing/correct-tree identities | Other structural defect |
|---|---:|---:|---:|---|
| Galaxy at War | 44 | 12 | 32 | 3 missing tree identities |
| Galaxy of Intrigue | 19 | 2 | 17 | 2 missing tree documents |
| Scavenger's Guide to Droids | 4 | 1 | 3 | class access missing |
| Unknown Regions | 27 | 5 | 22 | 5 wrong current claims |
| Scum and Villainy - GenoHaradan | 4 | fragmented | 0 document loss | one tree split into two |
| **Total** | **98** | - | **74** | substantial graph defects |

The aggregate should not be interpreted as a system-wide completion percentage; Phase 1C intentionally targeted only the discrepancy queue surfaced by Phase 1B.

---

# 10. Blocked primary-source item

## Legacy Era Campaign Guide - Provocateur

Primary-source verification is now complete. Legacy Era Campaign Guide pp. 27-28 confirms:

```text
Provocateur -> Noble, Charlatan
```

Current repository:

- Noble -> Provocateur
- Charlatan does not claim Provocateur
- `talent_tree_class_map.json` already says Noble + Charlatan

**Status:** `ACCESS_ERROR_CONFIRMED`

The current Noble -> Provocateur edge is correct; Charlatan -> Provocateur is missing from the Charlatan class document. The repository Provocateur tree already contains all six canonical talents.

---

# 11. What Phase 1C changes about the audit strategy

Before Phase 1C, it was plausible that the main problem was stale class/tree access metadata.

That is no longer tenable.

Primary-source comparison shows three simultaneous defect classes:

1. **access errors**
2. **tree identity/membership errors**
3. **missing talent content**

Therefore future work must audit each tree as a complete source-defined unit:

```text
sourcebook
  -> class access
  -> tree identity
  -> complete canonical talent membership
  -> repo comparison
```

Checking only existing tree records would miss substantial published content.

---

# 12. Recommended next phase

## Phase 1D - Canonical tree registry consolidation

Before individual 1,024-talent text/mechanics auditing begins, build a machine-readable structural registry containing at minimum:

```text
canonicalTreeKey
displayName
sourcebook
classAccess[]
canonicalTalentNames[]
repoTreeId(s)
status
notes
```

This registry should include:

- source-confirmed trees from Phase 1C
- Phase 1B reference-match trees as pending source verification
- Force trees in a separate lane
- Droid-degree/special trees in a separate lane
- same-name tree identities such as Squad Leader as separate keys

The purpose is to stop future cleanup from collapsing identity back to name-only mapping.

---

# 13. Phase 1C stop gate

- [x] Galaxy at War discrepancies primary-source adjudicated.
- [x] Galaxy of Intrigue discrepancies primary-source adjudicated.
- [x] Scavenger's Guide to Droids discrepancy primary-source adjudicated.
- [x] Unknown Regions discrepancies primary-source adjudicated.
- [x] Scum and Villainy GenoHaradan split primary-source adjudicated.
- [x] Source-confirmed missing talents enumerated.
- [x] Source-confirmed wrong tree claims enumerated.
- [x] Same-name identity hazards documented.
- [x] GenoHaradan split resolved conceptually.
- [x] Legacy Era Provocateur primary-source adjudicated.
- [x] No production/data changes made.

# Phase 1C verdict

The structural audit has uncovered a materially larger problem than the repository's prior "reviewed" tree state suggested:

- **20** missing source-confirmed class/tree access edges
- **5** missing source-confirmed tree identities
- **74** source-confirmed missing/correct-tree talent identities in the targeted discrepancy set
- **5** source-confirmed wrong tree claims
- **1** published tree split into two malformed repository identities
- multiple confirmed same-name identity collisions

The repository's `Tree -> Talent` graph is internally consistent, but internal consistency is not equivalent to canonical completeness.

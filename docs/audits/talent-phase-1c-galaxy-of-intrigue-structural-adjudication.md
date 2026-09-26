# PHASE 1C-GOI FINDINGS - Galaxy of Intrigue Structural Talent Adjudication

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`  
**Parent findings:**  
- `docs/audits/talent-phase-1a-repository-graph-census.md`
- `docs/audits/talent-phase-1b-fandom-reference-diff.md`

**Primary source:** `Galaxy of Intrigue.pdf`  
**Primary-source pages inspected:** printed pp. 19-23

> **Scope:** This sub-phase adjudicates the Galaxy of Intrigue structural discrepancy queue: Noble -> Master of Intrigue / Skill Challenge, Scoundrel -> Revolutionary, Scout -> Espionage, plus tree membership and missing-content state.

---

# 1. Sourcebook verdict

The sourcebook directly supports all four Phase 1B Galaxy of Intrigue class/tree relationships.

| Class | Talent tree | Printed page |
|---|---|---:|
| Noble | Master of Intrigue | 20 |
| Noble | Skill Challenge | 20 |
| Scoundrel | Revolutionary | 21-22 |
| Scout | Espionage | 22-23 |

**All four Phase 1B Galaxy of Intrigue class-usage rows are primary-source confirmed.**

---

# 2. Class-document corrections are source-confirmed

Current class documents omit all four relationships:

- Noble -> Master of Intrigue
- Noble -> Skill Challenge
- Scoundrel -> Revolutionary
- Scout -> Espionage

The first, third, and fourth relationships were already represented in `data/talent_tree_class_map.json`; Skill Challenge was also present there despite having no current tree document.

**Disposition:** `ACCESS_ERROR_CONFIRMED`

No production/data corrections are made during this audit-only sub-phase.

---

# 3. Master of Intrigue Talent Tree - Noble

Galaxy of Intrigue p. 20 presents the Master of Intrigue Talent Tree under Noble.

Canonical membership:

1. Advanced Planning
2. Blend In
3. Done It All
4. Get into Position
5. Master Manipulator
6. Retaliation

Current repository tree:

```text
Master Of Intrigue
id: 0ffc37dac946477d
talents:
- Advanced Planning
```

Missing from the correct tree identity:

- Blend In
- Done It All
- Get into Position
- Master Manipulator
- Retaliation

## Same-name hazard: Blend In

The repository already contains a talent named `Blend In`:

```text
id: a18d67d9fd947f68
claimed tree: Spy
current benefit:
reroll Deception checks to create a Deceptive Appearance
```

That is mechanically different from the Galaxy of Intrigue Master of Intrigue `Blend In`, which grants concealment while adjacent to at least two other creatures.

Therefore the current Spy `Blend In` is **not** a substitute and must not be moved.

**Disposition:**
- Noble access: `ACCESS_ERROR_CONFIRMED`
- tree membership: 1/6 represented
- four ordinary missing talent identities
- one missing same-name variant (`Blend In`)

---

# 4. Skill Challenge Talent Tree - Noble

Galaxy of Intrigue p. 20 explicitly presents the Skill Challenge Talent Tree in the Noble talent section.

Canonical membership:

1. Guaranteed Boon
2. Leading Skill
3. Learn from Mistakes
4. Try Your Luck

Current repository:

- no `Skill Challenge` tree document
- no exact talent documents found for any of the four published names

The repository class map already contains:

```text
Skill Challenge -> Noble
```

but the tree and its talents are absent.

**Disposition:**
- `MISSING_TREE_CONFIRMED`
- `ACCESS_ERROR_CONFIRMED`
- `MISSING_CONTENT_CONFIRMED` x4

---

# 5. Revolutionary Talent Tree - Scoundrel

Galaxy of Intrigue pp. 21-22 presents Revolutionary under Scoundrel.

Canonical membership:

1. Bomb Thrower
2. For the Cause
3. Make an Example
4. Revolutionary Rhetoric

Current repository tree:

```text
Revolutionary
id: e6a9c40b900847bd
talents:
- Make an Example
```

Missing published talents:

- Bomb Thrower
- For the Cause
- Revolutionary Rhetoric

**Disposition:**
- Scoundrel access: `ACCESS_ERROR_CONFIRMED`
- tree membership: 1/4 represented
- missing content: 3 talents

---

# 6. Espionage Talent Tree - Scout

Galaxy of Intrigue pp. 22-23 presents Espionage under Scout.

Canonical membership:

1. Fade Out
2. Keep Together
3. Prudent Escape
4. Reactive Stealth
5. Sizing Up

Current repository:

- no `Espionage` tree document
- no exact talent documents found for any of the five published names

The repository class map already contains:

```text
Espionage -> Scout
```

despite the tree document itself being absent.

**Disposition:**
- `MISSING_TREE_CONFIRMED`
- `ACCESS_ERROR_CONFIRMED`
- `MISSING_CONTENT_CONFIRMED` x5

---

# 7. Galaxy of Intrigue structural completeness summary

| Tree | Canonical talents | Repo talents in correct tree | Missing correct identities |
|---|---:|---:|---:|
| Master of Intrigue | 6 | 1 | 5 |
| Skill Challenge | 4 | 0 | 4 |
| Revolutionary | 4 | 1 | 3 |
| Espionage | 5 | 0 | 5 |
| **Total** | **19** | **2** | **17** |

Only **2 of 19** published talent identities in the four structurally audited Galaxy of Intrigue trees are currently represented in the correct repository tree identity.

---

# 8. Tree-document summary

## Existing but substantially incomplete

- Master Of Intrigue
- Revolutionary

## Entirely missing

- Skill Challenge
- Espionage

Therefore Galaxy of Intrigue contributes **two confirmed missing tree documents**.

---

# 9. Source-confirmed future correction packet

## Class access additions

- Noble -> Master of Intrigue
- Noble -> Skill Challenge
- Scoundrel -> Revolutionary
- Scout -> Espionage

## New tree documents

- Skill Challenge
- Espionage

## Missing talent identities

17 source-confirmed missing/correct-tree identities.

One of those, Master of Intrigue `Blend In`, is a same-name variant and must be created separately from the existing Spy talent.

---

# 10. What this sub-phase does NOT yet certify

Still pending for the 19 talents:

- exact normalized source text
- prerequisites
- trigger/action/target/duration/usage extraction
- abilityMeta correctness
- runtime owner
- automation ceiling
- skill-challenge runtime integration
- progression legality and tests

This sub-phase certifies graph structure and identity only.

---

# 11. Phase 1C-GOI stop gate

- [x] Render and visually inspect the relevant Galaxy of Intrigue pages.
- [x] Confirm Master of Intrigue -> Noble.
- [x] Confirm Skill Challenge -> Noble.
- [x] Confirm Revolutionary -> Scoundrel.
- [x] Confirm Espionage -> Scout.
- [x] Confirm canonical tree memberships.
- [x] Compare those memberships against the current repository.
- [x] Identify the distinct Master of Intrigue `Blend In` same-name variant.
- [x] Identify source-confirmed missing tree documents and talent identities.
- [x] Make no production/data changes.
- [x] Publish findings before continuing.

# Verdict

Galaxy of Intrigue confirms that the Phase 1B class-map discrepancies were not mere naming drift. The repository is missing **two entire published talent trees** and **17 of 19** talent identities across the four audited trees are absent from the correct tree identity.

The next structural sourcebook is **Scavenger's Guide to Droids**, to adjudicate Override -> Droid Commander.

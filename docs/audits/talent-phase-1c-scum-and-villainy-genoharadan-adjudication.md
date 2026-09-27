# PHASE 1C-SV FINDINGS - Scum and Villainy GenoHaradan Structural Adjudication

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`  
**Parent findings:**  
- `docs/audits/talent-phase-1a-repository-graph-census.md`
- `docs/audits/talent-phase-1b-fandom-reference-diff.md`

**Primary source:** `SAGA EDITION - Scum and Villainy.pdf`  
**Primary-source pages inspected:** printed pp. 29-30

> **Scope:** This sub-phase adjudicates the suspected GenoHaradan / Genoharadan / Genohardan identity split and its Assassin access.

---

# 1. Sourcebook verdict

Scum and Villainy p. 29 lists the Assassin prestige class talent access as including:

- Assassin talent tree
- GenoHaradan talent tree
- Misfortune talent tree
- Malkite Poisoner talent tree

The book then presents a single:

```text
GENOHARADAN TALENT TREE
```

spanning pp. 29-30.

Therefore the canonical spelling is:

**GenoHaradan**

and the canonical class access is:

**Assassin -> GenoHaradan**

---

# 2. Canonical GenoHaradan membership

The published tree contains exactly four talents:

1. Deadly Repercussions
2. Manipulating Strike
3. Improved Manipulating Strike
4. Pulling the Strings

---

# 3. Current repository is split into two malformed tree identities

## Tree A

```text
name: Genoharadan
id: da7b731a3e434a7a
class access: Assassin
talents:
- Manipulating Strike
```

## Tree B

```text
name: Genohardan
id: db1b30c2163d0650
class access: none
talents:
- Deadly Repercussions
- Improved Manipulating Strike
- Pulling the Strings
```

Together, the two repository trees contain all four sourcebook talents.

The split is therefore not missing talent content. It is an **identity fragmentation defect caused by spelling drift**.

---

# 4. Canonical reconstruction

The correct canonical tree is:

```text
GenoHaradan
class: Assassin
talents:
- Deadly Repercussions
- Manipulating Strike
- Improved Manipulating Strike
- Pulling the Strings
```

**Disposition:** `SPLIT_TREE_IDENTITY_CONFIRMED`

This confirms the Phase 1B hypothesis.

---

# 5. Access state

The Assassin class currently reaches tree A through its source-ID representation, so one partial GenoHaradan tree is available in progression.

However, because tree B has no class claimant, three of the four canonical talents are structurally detached from Assassin access.

Thus the practical progression state is:

- class access to a partial/corrupted tree identity: present
- access to the complete canonical GenoHaradan talent set: absent

**Disposition:** `PROGRESSION_STRUCTURE_ERROR_CONFIRMED`

---

# 6. Naming state

Current repository spellings:

- `Genoharadan`
- `Genohardan`

Primary-source spelling:

- `GenoHaradan`

The raw Assassin class field observed in Phase 1A used `GenoHaradan`, which is closer to/correctly preserves the printed spelling, while its source-ID pointed at the malformed `Genoharadan` tree document.

**Disposition:** `TREE_NAMING_ERROR_CONFIRMED`

---

# 7. Safe future correction packet

A later implementation packet can safely:

1. choose one canonical tree document ID to retain;
2. normalize its display/canonical name to `GenoHaradan`;
3. move/merge all four canonical talent IDs into that one tree;
4. ensure Assassin claims the retained canonical tree ID;
5. remove the obsolete duplicate tree document;
6. update class maps/tree descriptions/registries that reference either malformed name;
7. prove all four talents remain intact and no talent IDs are churned unnecessarily.

This should be treated as an identity/graph repair, not a talent rewrite.

---

# 8. What this sub-phase does NOT yet certify

Still pending:

- exact source text of the four talents
- prerequisite accuracy
- abilityMeta/runtime behavior
- action/reaction implementation
- automation ceiling

The structural identity question itself is closed.

---

# 9. Phase 1C-SV stop gate

- [x] Render and visually inspect the relevant Scum and Villainy pages.
- [x] Confirm canonical spelling `GenoHaradan`.
- [x] Confirm Assassin access.
- [x] Confirm the four canonical tree members.
- [x] Prove the repository split maps exactly onto one published tree.
- [x] Distinguish identity fragmentation from missing content.
- [x] Make no production/data changes.
- [x] Publish findings before continuing.

# Verdict

The GenoHaradan problem is fully adjudicated:

> **One published Assassin tree was split into two repository trees because of spelling drift.**

No canonical GenoHaradan talent is missing, but three of the four talents are currently stranded in an unclaimed duplicate tree identity.

The remaining Phase 1C structural item from the Phase 1B queue is **Provocateur -> Noble + Charlatan** from the Legacy Era Campaign Guide. That primary sourcebook is not currently present among the uploaded project PDFs, so it cannot be promoted beyond secondary-reference status in this phase.

# PHASE 1D CLOSEOUT — Canonical Talent-Tree Structural Registry

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

# 1. Purpose

Phase 1D converts the SWSE talent audit from a repository-shaped census into a persistent source-backed structural authority.

It answers, at the talent-tree level:

- what published tree identities exist;
- which sourcebook originated each tree;
- which talents belong to each tree at origin;
- which later sourcebooks add talents to existing trees;
- which classes/prestige classes gain access to each tree;
- which Force/tradition/droid access rules are not class edges;
- which repository-only trees are noncanonical homebrew;
- which repository records are malformed fragments of canonical identities;
- what structural differences remain between published SWSE and the current repository.

Phase 1D does **not** certify full talent rules text, prerequisites, runtime mechanics, or automation correctness.

---

# 2. Final registry population

The completed structural registry contains:

| Classification | Count |
|---|---:|
| Total registry records | **197** |
| Published canonical tree identities | **177** |
| Noncanonical homebrew repo trees | **19** |
| Obsolete split-tree fragment records | **1** |
| Pending primary-source rows | **0** |
| Generic special-tree source review rows | **0** |

The original registry began with 195 entries.

Primary-source work discovered two published Jedi Academy talent-tree identities that were absent from both the repository and the initial registry:

- Shapers of Kro Var
- Zeison Sha Warrior

They increase the registry to 197 records.

---

# 3. Publication graph

The registry now separates:

```text
tree origin
    +
later sourcebook talent publications
    +
source-scoped class/prestige access
    +
special Force/tradition/droid access rules
```

This prevents later-book additions from being misclassified as repository extras.

## Expansion layer

Source-certified later-publication claims:

**278**

These are publication membership claims across later sourcebooks, not necessarily 278 globally unique display names.

The registry recomputes:

`aggregateCanonicalTalentNames`

from the publication graph rather than treating an origin sourcebook as the tree's complete membership.

---

# 4. Canonical membership graph

Across the **177 published canonical tree identities**, the aggregate registry currently contains:

**1,190 canonical tree-membership claims**

Current repository comparison:

| Result | Count |
|---|---:|
| Exact correct-tree matches | **900** |
| Name-normalization-only matches | **9** |
| Canonical membership gaps | **281** |
| Extra repository membership claims | **75** |
| Trees with some structural membership difference | **104** |

Important:

A **canonical membership gap** means the identity is absent from the correct canonical tree.

It does **not** necessarily mean no talent document with that display name exists elsewhere in the repository. Many Phase 1 findings are wrong-tree placement or identity collisions rather than simple missing documents.

Likewise, an **extra repository membership claim** is not automatically safe to delete. Some are:

- wrong-tree canonical talents;
- duplicate imports;
- prerequisite/cross-reference contamination;
- source-reference contamination;
- homebrew identities;
- same-name identities requiring source/tree disambiguation.

The structural correction manifest deliberately preserves that distinction.

---

# 5. Missing canonical tree documents

Seven source-confirmed canonical tree identities have no corresponding repository tree document:

1. Galaxy at War — Martial Arts Forms
2. Galaxy at War — Squad Leader / Elite Trooper identity
3. Galaxy at War — Unarmed Mastery
4. Galaxy of Intrigue — Espionage
5. Galaxy of Intrigue — Skill Challenge
6. Jedi Academy Training Manual — Shapers of Kro Var
7. Jedi Academy Training Manual — Zeison Sha Warrior

These are canonical missing content, not naming variants.

---

# 6. Class-access provenance

Phase 1D now treats:

`accessPublications[]`

as the canonical authority for normal class/prestige access.

The later-access closeout source-certified **23 additional class-access grants** to pre-existing trees.

Final repo-vs-canonical access comparison:

| Result | Count |
|---|---:|
| Trees with class-access differences | **21** |
| Missing repository access edges | **20** |
| Extra repository access edges | **1** |

The one source-disproved extra edge is:

`Master Privateer -> Spacer`

The Force Unleashed Campaign Guide Master Privateer Talents section grants:

- Infamy
- Privateer

It does not grant Spacer.

Therefore the repository/reference claim:

`Master Privateer -> Spacer`

is a source-confirmed `ACCESS_ERROR`.

The 20 missing edges are retained in the structural correction manifest for later production repair.

---

# 7. Special-tree classification

The original repository-only/special bucket mixed several fundamentally different concepts.

Phase 1D separates them.

## Published Force / special / tradition trees

All published special-tree records are now assigned sourcebook origins and canonical origin memberships.

This includes:

- Core Force trees;
- Core Force traditions;
- Clone Wars traditions;
- Rebellion, Legacy, and Unknown Regions traditions;
- Jedi Academy Force/tradition trees;
- KOTOR Force traditions;
- droid-degree and other published special access structures audited in earlier sub-phases.

## Noncanonical homebrew

**19 repository trees** are explicitly classified:

`NONCANONICAL_HOMEBREW_CONFIRMED`

They are not canonical published SWSE talent trees.

Phase 1D does not delete them.

A later content-policy/repair phase must decide whether to:

1. remove them from canonical packs;
2. move them into a clearly labeled optional/homebrew pack; or
3. retain them with unmistakable provenance.

## Split fragment

`Genohardan`

is classified:

`OBSOLETE_SPLIT_FRAGMENT_CONFIRMED`

It is the malformed second fragment of the canonical Scum and Villainy:

`GenoHaradan`

tree.

---

# 8. Major structural defects confirmed during Phase 1D

Examples include:

## Wrong-tree placement

- Skilled Advisor -> Jedi Consular
- Acute Senses -> Awareness
- Jury-Rigger -> Fringer
- Long Stride -> Fringer
- Gun Club -> Brawler
- Melee Smash -> Brawler
- Stunning Strike -> Brawler
- Devastating Attack -> Weapon Specialist
- Penetrating Attack -> Weapon Specialist
- Sentinel Strike -> Jedi Sentinel
- Sentinel's Gambit -> Jedi Sentinel

## Missing canonical identities / memberships

Examples include:

- Unbalance Opponent
- six Droid Commander origin talents
- three Override talents
- large portions of Galaxy at War expansion membership
- large portions of Unknown Regions expansion membership
- large portions of Galaxy of Intrigue expansion membership
- multiple published Force-tradition tree memberships
- Shapers of Kro Var
- Zeison Sha Warrior

## Duplicate / pseudo-talent / contamination examples

- Escort duplicate beside canonical Escort Pilot
- Implant (general) created from explanatory rules text
- Protection incorrectly absorbing Harm's Way
- Naval Officer absorbing Born Leader as if it were a tree member
- duplicate/variant Combined Fire import
- Sense containing a literal source-reference string as a talent
- Force Unleashed records containing concatenated unrelated talent material
- noncanonical Wikia/homebrew material mixed into canonical-content packs

## Naming / identity variants

Examples include:

- Stay in the Fight (Recruit) vs printed Stay in the Fight
- Ambush (Republic Commando) vs printed Ambush
- Flanking Foe vs printed Flanking Fire
- Regimen Mastery vs printed Regimen Aptitude
- Improvised Weapon Masteryy vs printed Improvised Weapon Master
- Echoes of the Force vs printed Echoes in the Force
- Unclouded Judgement vs printed Unclouded Judgment
- Cloak of Shadows vs printed Cloak of Shadow

These must be repaired using canonical identity, not blind display-name normalization.

---

# 9. Machine-readable outputs

The Phase 1D structural authority is:

`data/audits/talent-canonical-tree-registry.json`

The deterministic production-repair queue is:

`data/audits/talent-phase-1d-structural-correction-manifest.json`

The correction manifest contains:

- missing canonical tree documents;
- missing correct-tree memberships;
- normalization/name variants;
- extra repo membership claims;
- missing class-access edges;
- extra class-access edges;
- noncanonical homebrew trees;
- obsolete split fragments;
- source-disproved access claims.

Later repair work should consume this manifest instead of reconstructing Phase 1D conclusions from prose.

---

# 10. Registry invariants at closeout

Phase 1D closeout requires:

- [x] No `REFERENCE_INDEX_PENDING_PRIMARY` rows.
- [x] No `REPO_SPECIAL_SOURCE_REVIEW` rows.
- [x] No duplicate canonical tree keys.
- [x] Every published canonical tree has an origin source.
- [x] Every published canonical tree has origin membership.
- [x] Later talent publications are source-scoped.
- [x] Aggregate canonical membership recomputes from publication provenance.
- [x] Class access is source-scoped.
- [x] Aggregate class access recomputes from `accessPublications[]`.
- [x] Force/tradition access remains separate from fake class edges.
- [x] Homebrew records have explicit noncanonical dispositions.
- [x] GenoHaradan split fragment has an explicit canonical replacement.
- [x] Missing canonical trees are represented even when no repo document exists.
- [x] Structural correction manifest generated.
- [x] No production talent/class/tree pack edits made during Phase 1D.

---

# 11. What Phase 1D certifies

Phase 1D certifies the **structural source graph**:

```text
SOURCEBOOK
   -> TREE IDENTITY
      -> ORIGIN TALENTS
      -> LATER PUBLICATION TALENTS
      -> CLASS / PRESTIGE ACCESS
      -> FORCE / TRADITION / SPECIAL ACCESS RULE
```

It also records how the current repository differs from that graph.

---

# 12. What Phase 1D does not certify

Still belongs to later phases:

- exact full talent benefit text;
- canonical prerequisite text;
- page-level provenance for every individual talent;
- trigger/action/target/check/effect contracts;
- `abilityMeta` correctness;
- modifier correctness;
- action-card correctness;
- progression acquisition correctness after data repair;
- runtime owner;
- automation ceiling;
- UI presentation;
- player-facing summaries.

The planned Talent Content / Presentation Contract belongs after structural identity is stable.

---

# FINAL VERDICT

**Phase 1D is complete.**

The project now has a source-backed canonical talent-tree registry rather than a repository-shaped approximation.

That registry is sufficient to begin the next content-certification/repair work without relying on unsafe talent-name matching or assuming that the current tree graph is authoritative.


# Post-closeout Phase 2 correction - Galaxy of Intrigue nested-action correction

Phase 2 page-layout review on 2026-09-27 corrected six Galaxy of Intrigue expansion claims that Phase 1D had treated as standalone talents:

- Commando / Dedicated Guardian: Blast Shield, Take the Pain, Team Effort are named actions inside Dedicated Guardian.
- Gunslinger / Pistol Duelist: End Game, Snap Aiming, Stand Steady are named actions inside Pistol Duelist.

Corrected structural totals after the prior Core and Galaxy at War corrections:

- later-book expansion membership claims: **272**
- aggregate canonical tree-membership claims: **1,184**
- canonical correct-tree membership gaps: **274**

Machine authority is the corrected `data/audits/talent-canonical-tree-registry.json` and `data/audits/talent-phase-1d-structural-correction-manifest.json`.

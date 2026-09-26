# PHASE 1B FINDINGS - Fandom Talent-Tree / Class-Usage Reference Diff

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`  
**Parent findings:** `docs/audits/talent-phase-1a-repository-graph-census.md`  
**Reference input:** user-supplied text export of <https://swse.fandom.com/wiki/Talents>

> **Authority rule:** This phase uses SWSE Fandom only as a **secondary reference/index**. Nothing in this file becomes RAW-certified solely because Fandom says it. Phase 1C must adjudicate discrepancies against the published sourcebooks.

---

# 1. Reference-index census

The supplied Fandom Talent page contains:

- **140 sourcebook/tree/class-usage rows**
- **139 unique normalized tree names**
- one repeated normalized tree name: **Squad Leader**
- coverage grouped under the Core Rulebook plus 13 additional sourcebook headings

Reference rows by listed source:

| Listed source | Tree rows |
|---|---:|
| Saga Edition Core Rulebook | 34 |
| Starships of the Galaxy | 3 |
| Threats of the Galaxy | 2 |
| Knights of the Old Republic Campaign Guide | 11 |
| Force Unleashed Campaign Guide | 15 |
| Scum and Villainy | 9 |
| Clone Wars Campaign Guide | 14 |
| Legacy Era Campaign Guide | 14 |
| Jedi Academy Training Manual | 8 |
| Rebellion Era Campaign Guide | 9 |
| Galaxy at War | 9 |
| Scavenger's Guide to Droids | 2 |
| Galaxy of Intrigue | 5 |
| Unknown Regions | 5 |
| **Total** | **140** |

The page is explicitly an index of Class Talent Trees and separately points readers toward Force Talents / Droid Talents. Therefore absence from this particular page is **not evidence that a repository tree is invalid**.

---

# 2. Top-level diff against the repository

Repository baseline from Phase 1A:

- 190 current talent-tree documents
- 37 class documents

Normalized reference comparison:

| Result | Count |
|---|---:|
| Reference rows whose class usage exactly matches current class documents | **120** |
| Reference rows with class-usage mismatch | **16** |
| Reference rows with no corresponding current tree document | **4** |
| Current repository trees not represented on this Fandom page | **55** |
| Naming/capitalization variants that normalize to a repository tree | **3** |

Because `Squad Leader` appears twice in the reference, these are row counts rather than a simple one-tree/one-row bijection.

---

# 3. The reference strongly validates most current Class -> Tree access

**120 of 140 reference rows agree exactly with current class-document access.**

This does not certify RAW, but it is useful independent evidence that most existing class/tree relationships are probably structurally sound.

The mismatch set is therefore narrow enough to source-adjudicate directly.

---

# 4. Sixteen class-usage mismatches

| Reference source | Tree | Reference class usage | Current class documents |
|---|---|---|---|
| Legacy Era | Provocateur | Charlatan, Noble | Noble |
| Galaxy at War | Advance Patrol | Scout | none |
| Galaxy at War | Anticipation | Noble | none |
| Galaxy at War | Brigand | Scoundrel | none |
| Galaxy at War | Sharpshooter | Gunslinger | none |
| Galaxy at War | Shockboxer | Soldier | none |
| Galaxy at War | Squad Leader | Elite Trooper | Soldier |
| Galaxy at War | Veteran | Soldier | none |
| Scavenger's Guide to Droids | Override | Droid Commander | none |
| Galaxy of Intrigue | Master of Intrigue | Noble | none |
| Galaxy of Intrigue | Revolutionary | Scoundrel | none |
| Unknown Regions | Exile | Noble | none |
| Unknown Regions | Master Scout | Scout | none |
| Unknown Regions | Mobile Scout | Scout | none |
| Unknown Regions | Outsider | Scoundrel | none |
| Unknown Regions | Warrior | Soldier | none |

These are **reference-supported discrepancies**, not yet correction instructions.

---

# 5. Critical cross-check: Fandom vs the competing repository class map

Phase 1A found 17 disagreements between class documents and `data/talent_tree_class_map.json`.

Phase 1B produces a strong pattern:

## 5.1 In 15 of the 16 reference/class-document mismatch rows, the class map agrees with Fandom

The following current `talent_tree_class_map.json` claims match the Fandom index while the class documents omit access:

- Provocateur -> Noble, Charlatan
- Advance Patrol -> Scout
- Anticipation -> Noble
- Brigand -> Scoundrel
- Sharpshooter -> Gunslinger
- Shockboxer -> Soldier
- Veteran -> Soldier
- Override -> Droid Commander
- Master of Intrigue -> Noble
- Revolutionary -> Scoundrel
- Exile -> Noble
- Master Scout -> Scout
- Mobile Scout -> Scout
- Outsider -> Scoundrel
- Warrior -> Soldier

This is significant evidence that many Phase 1A access discrepancies are **class-document omissions**, rather than bad entries in the class map.

They remain `SOURCE_REVIEW_REQUIRED` until the books confirm them.

## 5.2 Autonomy goes the other direction

Phase 1A found:

- class document: Independent Droid -> Autonomy
- class map: no Autonomy entry

The Fandom index lists:

- Autonomy -> Independent Droid

So the secondary reference supports the **class document** and suggests the class map is incomplete for Autonomy.

Again: sourcebook confirmation is still required.

---

# 6. Squad Leader is not a normal access mismatch

This is the most important identity warning produced by Phase 1B.

The Fandom reference contains **two separate Squad Leader rows**:

1. **Clone Wars Campaign Guide**
   - Squad Leader
   - Soldier

2. **Galaxy at War**
   - Squad Leader
   - Elite Trooper

The repository contains only one tree document:

```text
Squad Leader
id: 781feba15dc9e42f
current class: Soldier
talents:
- Coordinated Tactics
- Squad Actions
- Commanding Officer
- Fire at Will
```

The current class map also assigns that one tree to Soldier.

Therefore this is not safely interpreted as:

> "add Elite Trooper to the existing Squad Leader tree."

Possible sourcebook outcomes include:

- two distinct published trees with the same display name;
- one tree reprinted/expanded with changed access;
- one Fandom indexing error;
- repository collapse of two distinct identities.

**Phase 1B disposition:** `SAME_NAME_TREE_COLLISION_SOURCE_REVIEW`

Do not change access or merge content until Clone Wars and Galaxy at War are inspected directly.

---

# 7. Four reference trees are absent from the current talent-tree pack

| Reference source | Tree | Reference class usage | Repository signal |
|---|---|---|---|
| Galaxy at War | Martial Arts Forms | Martial Arts Master | no tree; no class-map key |
| Galaxy at War | Unarmed Mastery | Martial Arts Master | no tree; no class-map key |
| Galaxy of Intrigue | Espionage | Scout | no tree; **class-map key exists** |
| Galaxy of Intrigue | Skill Challenge | Noble | no tree; **class-map key exists** |

These divide into two different categories.

## 7.1 Espionage / Skill Challenge

These already exist in `data/talent_tree_class_map.json` with the same class usage shown by the Fandom index, but the tree documents themselves are absent.

That gives us two independent repository/reference signals pointing at a likely missing-tree-document problem.

**Status:** `HIGH_PRIORITY_SOURCE_REVIEW`

## 7.2 Martial Arts Forms / Unarmed Mastery

Neither tree currently exists in the tree pack or class map.

The Fandom index assigns both to Martial Arts Master.

The current Martial Arts Master class document claims only:

- Awareness
- Master of Teräs Käsi

Therefore these could represent genuinely missing published tree/access content.

**Status:** `HIGH_PRIORITY_SOURCE_REVIEW`

No records should be created until Galaxy at War is checked directly.

---

# 8. Three normalized naming variants

These reference names resolve to current pack trees after case/spacing normalization:

| Reference | Repository |
|---|---|
| Bothan SpyNet | Bothan Spynet |
| GenoHaradan | Genoharadan |
| Master of Intrigue | Master Of Intrigue |

The first two also explain the stale raw-name references identified in Phase 1A:

- Infiltrator carries `Bothan SpyNet` in one class field while its source-ID points to `Bothan Spynet`.
- Assassin carries `GenoHaradan` in one class field while its source-ID points to `Genoharadan`.

The Fandom spelling provides secondary support for:

- `Bothan SpyNet`
- `GenoHaradan`
- `Master of Intrigue`

but canonical spelling will be determined from the sourcebooks.

---

# 9. Additional GenoHaradan warning: probable split identity

The repository does not merely have a spelling variant.

It currently has **two different tree documents**:

### `Genoharadan`
- id `da7b731a3e434a7a`
- class access: Assassin
- talent:
  - Manipulating Strike

### `Genohardan`
- id `db1b30c2163d0650`
- no class access
- talents:
  - Deadly Repercussions
  - Improved Manipulating Strike
  - Pulling the Strings

The Fandom class-tree index contains only **GenoHaradan -> Assassin**.

This is a strong signal that the current repository may have split one canonical tree into two documents because of a spelling error.

**Phase 1B disposition:** `PROBABLE_SPLIT_TREE_IDENTITY_SOURCE_REVIEW`

This must be checked against Scum and Villainy before any merge.

---

# 10. Fifty-five repository trees are absent from this page

This sounds large but is mostly expected because this Fandom page is not the full Force/Droid/special-tree universe.

The 55 repo-only trees break down as:

- **36 Force / Force-tradition tagged**
- **5 degree-droid trees**
- **14 other special/unclassified trees**

## Force / Force-tradition repo-only trees

Agent Of Ossus; Aingtii Monk; Alter; Bando Gora Captain; Baran Do Sage; Believer Disciple; Blackguard Wilder; Blazing Chain; Bomarr Monk; Chalactan Adept; Control; Dark Side; Dathomiri Witch; Disciple Of Twilight; Ember Of Vahl; Felucian Shaman; Force Warrior; Guardian Spirit; Iron Knight; Jal Shey; Jedaii Ranger; Jensaarai Defender; Keetael; Kilian Ranger; Korunnai Adept; Krath; Light Side; Luka Sene; Matukai Adept; Midichlorian; Order of Shasa; Sense; Sorcerer Of Tund; Tyia Adept; Warden Of The Sky; White Current Adept.

These should be handled against the Force Talent/Force Tradition source set, not treated as failures of this page.

## Droid repo-only trees

- 1stdegree Droid
- 2nddegree Droid
- 3rddegree Droid
- 4thdegree Droid
- 5thdegree Droid

These should be checked against the Droid Talent source/index rather than this class-tree page.

## Other repo-only trees requiring later classification

- Cloner
- Cowardice
- Defensive Duelist
- Exceptional Followers
- Galactic Senator
- Genohardan
- Jumptrooper
- Master Of The Amphistaff
- Mechanic
- Morgukai Warrior
- Science
- Seyugi Dervish
- Smashball Pro
- Treatment

Absence from this page does not make these invalid. They need to be classified as one of:

- special/species/NPC/prestige expansion tree;
- Force/Droid-adjacent tree omitted by this page;
- valid sourcebook tree not represented in the Fandom class index;
- repository-only/noncanonical/split identity.

---

# 11. Book-level reference matrix

The Fandom page gives us a useful **candidate provenance index** for each class talent tree.

For Phase 1C, this becomes a lookup queue:

```text
reference book
  -> reference tree
      -> reference class usage
          -> repository tree/class comparison
              -> sourcebook adjudication
```

The reference book is not yet written into the repository as canonical tree provenance.

This distinction matters because current tree documents generally do not contain a reliable, explicit sourcebook/page authority field comparable to the talent records.

---

# 12. High-priority Phase 1C sourcebook queue

The following should be adjudicated first because they can alter the graph itself.

## Galaxy at War

1. Martial Arts Forms -> Martial Arts Master
2. Unarmed Mastery -> Martial Arts Master
3. Advance Patrol -> Scout
4. Anticipation -> Noble
5. Brigand -> Scoundrel
6. Sharpshooter -> Gunslinger
7. Shockboxer -> Soldier
8. Veteran -> Soldier
9. Squad Leader -> Elite Trooper, and whether this is distinct from Clone Wars Squad Leader

## Galaxy of Intrigue

10. Espionage -> Scout
11. Skill Challenge -> Noble
12. Master of Intrigue -> Noble
13. Revolutionary -> Scoundrel

## Scavenger's Guide to Droids

14. Override -> Droid Commander

## Unknown Regions

15. Exile -> Noble
16. Master Scout -> Scout
17. Mobile Scout -> Scout
18. Outsider -> Scoundrel
19. Warrior -> Soldier

## Legacy Era

20. Provocateur -> Noble + Charlatan

## Scum and Villainy

21. GenoHaradan spelling/identity and whether `Genoharadan` + `Genohardan` must be one tree

These are the most valuable direct-book checks before touching any data.

---

# 13. Phase 1B confidence categories

## `REFERENCE_MATCH`

120 reference rows match current class documents exactly.

These still require book verification eventually, but they are low-priority for structural discrepancy work.

## `REFERENCE_SUPPORTS_CLASS_MAP`

15 access rows disagree with class docs but agree with `talent_tree_class_map.json`.

## `REFERENCE_SUPPORTS_CLASS_DOC`

Autonomy -> Independent Droid supports the class document over the currently missing class-map entry.

## `REFERENCE_ONLY_TREE`

Martial Arts Forms; Unarmed Mastery; Espionage; Skill Challenge.

## `NAMING_DRIFT`

Bothan SpyNet / Bothan Spynet; GenoHaradan / Genoharadan; Master of Intrigue / Master Of Intrigue.

## `SAME_NAME_TREE_COLLISION_SOURCE_REVIEW`

Squad Leader.

## `PROBABLE_SPLIT_TREE_IDENTITY_SOURCE_REVIEW`

GenoHaradan / Genoharadan / Genohardan.

## `OUTSIDE_REFERENCE_PAGE_SCOPE`

Most of the 55 repo-only trees, especially Force and degree-droid trees.

---

# 14. Phase 1B stop gate

- [x] Parse the supplied Fandom class-tree index.
- [x] Record reference sourcebook per tree row.
- [x] Record reference class usage.
- [x] Normalize only for comparison; preserve original names in findings.
- [x] Compare reference rows against current tree pack.
- [x] Compare reference class usage against current class documents.
- [x] Cross-check disagreements against `talent_tree_class_map.json`.
- [x] Identify reference-only trees.
- [x] Identify repository-only trees.
- [x] Separate obvious Force/Droid out-of-scope trees from unresolved repo-only trees.
- [x] Identify same-name/split-identity hazards.
- [x] Make no production/data changes.
- [x] Make no RAW-certified corrections.

---

# Phase 1B verdict

The secondary reference index substantially reinforces the Phase 1A graph while exposing a concentrated set of structural problems:

1. **Most Class -> Tree access is probably sound**: 120 reference rows match class documents exactly.
2. **A specific group of class documents appears incomplete**: 15 access discrepancies agree with the existing class map and the Fandom index.
3. **Four listed class talent trees are absent from the tree pack**, including two already known to the class map.
4. **Squad Leader cannot be resolved by name alone** because the reference lists the same tree name under two books/classes.
5. **GenoHaradan appears likely split across two repository tree documents by spelling drift.**
6. **The 55 repo-only trees are not a blanket error set**; 41 are immediately explainable as Force/degree-droid material outside this page's scope.

The next step is **Phase 1C: primary-source adjudication of the structural discrepancy queue**, beginning with the books that can change the class/tree graph before individual talent-text verification begins.

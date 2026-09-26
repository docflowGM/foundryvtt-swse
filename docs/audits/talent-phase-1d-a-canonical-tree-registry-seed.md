# PHASE 1D-A FINDINGS - Canonical Talent Tree Registry Seed

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

**Machine-readable registry:**  
`data/audits/talent-canonical-tree-registry.json`

---

# 1. Purpose

Phase 1D-A converts the Phase 1A-1C structural work into a persistent machine-readable registry.

The registry intentionally separates:

```text
display name
sourcebook identity
class access
canonical talent membership
current repository tree IDs
source-verification status
```

This prevents future cleanup from using display name as the sole identity key.

---

# 2. Current registry size

| Category | Count |
|---|---:|
| Total registry entries | **195** |
| Class-tree source rows | **140** |
| Primary-source verified entries | **30** |
| Reference-index rows pending primary verification | **110** |
| Repo-only special/unresolved tree entries | **55** |

The 140 source rows represent 139 normalized display names because **Squad Leader** is published as two distinct tree identities.

---

# 3. Identity model

The canonical key is currently:

```text
sourcebook + "|" + displayName
```

Examples:

```text
Clone Wars Campaign Guide|Squad Leader
Galaxy at War|Squad Leader
```

These are separate identities even though the display name is identical.

This directly addresses the source-confirmed Squad Leader collision.

---

# 4. Current source statuses

Every registry entry has one of these current source states.

## PRIMARY_SOURCE_VERIFIED

The tree identity/access/membership has been checked against the published sourcebook.

Current count: **30**

This includes the completed structural sets from:

- Galaxy at War discrepancy trees
- Galaxy of Intrigue discrepancy trees
- Scavenger's Guide to Droids / Override
- The Unknown Regions discrepancy trees
- Scum and Villainy / GenoHaradan
- Legacy Era / Provocateur
- all nine Rebellion Era class/prestige trees

## REFERENCE_INDEX_PENDING_PRIMARY

The class-tree identity currently comes from the secondary reference index and repository comparison, but has not yet been promoted by a direct primary-source pass.

Current count: **110**

These are now an explicit work queue rather than implicit assumptions.

## REPO_SPECIAL_SOURCE_REVIEW

The tree exists in the repository but is not represented on the class-tree reference page.

Current count: **55**

This bucket includes:

- Force talent trees
- Force-tradition trees
- degree-droid trees
- species/special trees
- other unresolved repository-only tree identities

They require their own source lanes rather than being declared invalid.

---

# 5. Canonical talent membership

For the **30 PRIMARY_SOURCE_VERIFIED** entries, the registry now carries:

```json
"canonicalTalentNames": [...]
```

For unverified entries this remains `null`.

This is deliberate. The audit will not populate canonical membership from repository assumptions merely to make the registry look complete.

---

# 6. Repository linkage

Each registry entry records:

```text
repoTreeIds[]
repoTreeNames[]
repoClassAccess[]
```

This means the registry can represent:

- one canonical tree -> one current repo tree
- one canonical tree -> no repo tree
- one canonical tree -> multiple malformed repo fragments
- same display name -> multiple canonical identities

without destroying information.

---

# 7. Source-confirmed identity exceptions encoded

## Galaxy at War Squad Leader

Registry:

```text
Galaxy at War|Squad Leader
```

has no current repo tree ID assigned.

Reason:

The current `Squad Leader` tree is the Soldier/Clone Wars identity. The Galaxy at War Elite Trooper tree is a separate missing identity.

## GenoHaradan

Registry:

```text
Scum and Villainy|GenoHaradan
```

links both malformed repository fragments:

- Genoharadan
- Genohardan

with a note that they constitute one canonical published tree.

## Missing trees

Source-confirmed missing identities such as:

- Martial Arts Forms
- Unarmed Mastery
- Skill Challenge
- Espionage

carry empty `repoTreeIds` rather than fabricated mappings.

---

# 8. Why the registry has 195 entries while the pack has 190 trees

The difference is meaningful.

The registry currently contains:

- the class-tree source identities from the reference/source queue;
- 55 current repo-only special/unresolved trees;
- distinct same-name source identities where required.

The repository has 190 physical tree documents.

Phase 1C has already proven that the physical tree count hides:

- missing canonical tree identities;
- one canonical tree split across multiple repo documents;
- same-name canonical trees collapsed into one document.

Therefore raw document count cannot be used as a canonical completeness measure.

---

# 9. Rebellion Era added to primary-source verified registry

The newly available Rebellion Era Campaign Guide TXT/PDF allowed all nine indexed Rebellion class trees to be promoted to primary-source verified:

- Gambling Leader
- Recklessness
- Unpredictable
- Ambusher
- Wingman
- Rebel Recruiter
- Procurement
- Improviser
- Pathfinder

Across these trees the repository contains all **51 canonical talent identities**, with two structural cleanup findings:

- `Escort` is an invalid duplicate of `Escort Pilot`.
- `Stay in the Fight (Recruit)` is a noncanonical display-name variant of `Stay in the Fight`.

See:

`docs/audits/talent-phase-1d-rebellion-era-tree-verification.md`

---

# 10. Registry limitations

This is a **seed**, not the finished canonical registry.

The following remain:

- promote 110 reference rows through primary-source verification;
- source-classify 55 repo-only special trees;
- fill canonical talent membership for every verified tree;
- attach page data where practical;
- distinguish expansion-of-existing-tree entries from newly introduced tree identities;
- add stable canonical IDs that are not derived from mutable display spelling.

The current key is safe enough for the audit but may later evolve into a slug/source identity.

---

# 11. Next registry verification order

With the TXT corpus now available, the fastest high-value order is:

1. Saga Edition Core Rulebook
2. Clone Wars Campaign Guide
3. Force Unleashed Campaign Guide
4. Knights of the Old Republic Campaign Guide
5. Starships of the Galaxy
6. Jedi Academy Training Manual
7. remaining Scum and Villainy trees
8. remaining Legacy Era trees
9. remaining Scavenger's Guide trees
10. Threats of the Galaxy
11. remaining sourcebook rows already represented in the registry

After the class-tree lane is source-complete, move into:

- Force talent trees
- Force traditions
- Droid-degree trees
- species/special trees

---

# 12. Phase 1D-A stop gate

- [x] Create persistent machine-readable registry.
- [x] Preserve source-aware same-name identities.
- [x] Preserve missing-tree identities without inventing repo IDs.
- [x] Represent split canonical identities without destructive merging.
- [x] Populate canonical membership only where primary-source verified.
- [x] Carry current repo access/IDs alongside canonical claims.
- [x] Keep unverified reference rows explicitly pending.
- [x] Keep repo-only special trees explicitly unresolved.
- [x] Publish findings and registry on the same audit branch.

# Verdict

The audit now has a durable identity layer.

Future source passes no longer need to answer "what tree does the repo think this is?" from scratch. They can update a canonical registry entry and compare it against current repo linkage without collapsing same-name or split-tree cases.

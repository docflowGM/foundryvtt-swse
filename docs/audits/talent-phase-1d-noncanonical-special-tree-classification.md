# PHASE 1D - Remaining Repo-Special Classification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

## Scope

This pass resolves the approximately 20 repository-special entries that remained after the published Force/Droid/tradition mappings were separated out.

Evidence used:

1. uploaded SWSE published TXT/PDF corpus as the canonical-source lane;
2. repository tree membership as audit input only;
3. SWSE Wiki/Fandom pages only as a secondary classification aid where they explicitly identify content as homebrew/untested.

The result is decisive:

- **18 repo trees are explicitly catalogued as untested homebrew**
- **1 repo tree (Je'daii Ranger) is tested homebrew**
- **1 repo tree (Genohardan) is the already source-proven obsolete split fragment of canonical GenoHaradan**

None of these 20 should remain in generic `REPO_SPECIAL_SOURCE_REVIEW`.

---

# 1. Untested homebrew trees

The SWSE Wiki's **Untested Talent Trees** index explicitly classifies the following repository trees as homebrew content rather than published SWSE rules:

1. Blackguard Wilder
2. B'omarr Monk (repo spelling: `Bomarr Monk`)
3. Chalactan Adept
4. Cloner
5. Cowardice
6. Defensive Duelist
7. Exceptional Followers
8. Force Warrior
9. Galactic Senator
10. Jumptrooper
11. Master of the Amphistaff
12. Mechanic
13. Midi-chlorian (repo: `Midichlorian`)
14. Morgukai Warrior
15. Science
16. Smashball Pro
17. Sorcerer of Tund
18. Treatment

These are not merely "unverified." They are explicitly identified by the secondary source as user/fan-created content, and their talent-tree identities are not present as published SWSE talent trees in the uploaded canonical sourcebook corpus.

## Examples with explicit provenance

### Blackguard Wilder
SWSE Wiki labels the tree untested homebrew and attributes it to a Wikia user. The uploaded Jedi Academy text contains a **Blackguard Wilder NPC/stat block**, but that is not publication of a Blackguard Wilder talent tree.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Cloner
SWSE Wiki identifies the tree as homebrew content from a Clone Wars Saga Edition fan sourcebook.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Defensive Duelist
SWSE Wiki explicitly labels the tree user-created homebrew.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Exceptional Followers
SWSE Wiki explicitly describes the tree as homebrew data created by community users.

The repository currently carries only `Akk Dog Master` under this tree. Published Clone Wars material places Akk Dog Master in **Korunnai Adept**, so this repo tree is additionally a contamination risk.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Force Warrior
SWSE Wiki labels the tree homebrew from the Saga Edition All-Purpose Sourcebook.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Jumptrooper
SWSE Wiki explicitly labels the tree homebrew and states that it incorporates/rewrites material from the published Rocket Jumper tree using house rules.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Master of the Amphistaff
SWSE Wiki labels the tree homebrew from a fan-created New Jedi Order Campaign Guide.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Mechanic
SWSE Wiki labels the tree user-created homebrew.

This is particularly important because the repo's `Quick Fix` / `Patient Builder` / `Engineering Savant` placement must not be used as canonical evidence.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Midi-chlorian
The SWSE Wiki labels the underlying Midi-chlorian rules and talent tree homebrew/untested material. The repository's `Midichlorian` tree is therefore not a published SWSE tree.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Morgukai Warrior
SWSE Wiki explicitly identifies the tree as homebrew from a Clone Wars fan sourcebook.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Science
SWSE Wiki explicitly labels the tree user-created homebrew.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Smashball Pro
SWSE Wiki explicitly labels the tree user-created homebrew.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Sorcerer of Tund
This case requires an identity distinction.

Published/web-enhancement SWSE material contains **The Sorcerers of Tund** as a Force tradition and published NPC material includes Sorcerers of Tund. However, the SWSE Force-tradition index does **not** assign the official tradition a published talent tree.

The repository's `Sorcerer Of Tund` talent tree instead matches a separately identified homebrew talent tree from `The Centrality: A Gazetteer and Guide`.

Therefore:

```text
official Sorcerers of Tund tradition
!=
repo Sorcerer Of Tund homebrew talent tree
```

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

### Treatment
The SWSE Wiki's untested-tree index classifies Treatment as homebrew. No published Treatment talent tree is present in the canonical corpus.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

---

# 2. Tested homebrew: Je'daii Ranger

The repository entry:

`Jedaii Ranger`

maps to the community **Je'daii Ranger Talent Tree**.

The SWSE Force Talents index places Je'daii Ranger under **Homebrew Force Tradition Talent Trees**, while the site's Tested category confirms it as tested community content.

It is not part of the published SWSE sourcebook tree list.

The Je'daii concept also postdates the official SWSE sourcebook line represented by the uploaded corpus.

**Disposition:** `NONCANONICAL_HOMEBREW_CONFIRMED`

"Tested" is a community quality label; it does not make the content canonical SWSE publication material.

---

# 3. Genohardan

`Genohardan` is not homebrew.

Phase 1C already proved from **Scum and Villainy** that the canonical tree is one:

`GenoHaradan`

with:

- Deadly Repercussions
- Manipulating Strike
- Improved Manipulating Strike
- Pulling the Strings

The repository split that one canonical tree into:

- `Genoharadan`
- `Genohardan`

Therefore the repo-special `Genohardan` record is an obsolete malformed fragment of the canonical GenoHaradan identity.

**Disposition:** `OBSOLETE_SPLIT_FRAGMENT_CONFIRMED`

It should remain represented in the audit registry only as evidence of the current repository defect until the later production repair merges/reconciles the physical tree records.

---

# 4. Classification table

| Repo tree | Phase 1D disposition |
|---|---|
| Blackguard Wilder | NONCANONICAL_HOMEBREW_CONFIRMED |
| Bomarr Monk | NONCANONICAL_HOMEBREW_CONFIRMED |
| Chalactan Adept | NONCANONICAL_HOMEBREW_CONFIRMED |
| Cloner | NONCANONICAL_HOMEBREW_CONFIRMED |
| Cowardice | NONCANONICAL_HOMEBREW_CONFIRMED |
| Defensive Duelist | NONCANONICAL_HOMEBREW_CONFIRMED |
| Exceptional Followers | NONCANONICAL_HOMEBREW_CONFIRMED |
| Force Warrior | NONCANONICAL_HOMEBREW_CONFIRMED |
| Galactic Senator | NONCANONICAL_HOMEBREW_CONFIRMED |
| Jedaii Ranger | NONCANONICAL_HOMEBREW_CONFIRMED |
| Jumptrooper | NONCANONICAL_HOMEBREW_CONFIRMED |
| Master Of The Amphistaff | NONCANONICAL_HOMEBREW_CONFIRMED |
| Mechanic | NONCANONICAL_HOMEBREW_CONFIRMED |
| Midichlorian | NONCANONICAL_HOMEBREW_CONFIRMED |
| Morgukai Warrior | NONCANONICAL_HOMEBREW_CONFIRMED |
| Science | NONCANONICAL_HOMEBREW_CONFIRMED |
| Smashball Pro | NONCANONICAL_HOMEBREW_CONFIRMED |
| Sorcerer Of Tund | NONCANONICAL_HOMEBREW_CONFIRMED |
| Treatment | NONCANONICAL_HOMEBREW_CONFIRMED |
| Genohardan | OBSOLETE_SPLIT_FRAGMENT_CONFIRMED |

---

# 5. Structural consequence

These findings materially improve the later repair plan.

The repository currently mixes:

```text
published SWSE talents
+
fan sourcebook material
+
wiki user creations
+
house-rule trees
+
malformed fragments of canonical trees
```

inside the same talent/talent-tree packs.

Therefore the later production cleanup must not merely "repair descriptions." It needs an explicit policy for noncanonical material.

Recommended later choices are:

1. remove noncanonical content from the canonical SWSE compendium;
2. preserve it in an explicitly separate optional/homebrew pack; or
3. retain it only if the project intentionally supports homebrew, with unmistakable provenance and UI labeling.

That is a product/content-policy decision for the repair phase, not Phase 1D.

Phase 1D only establishes that these records are **not canonical published SWSE talent trees**.

---

# 6. Stop gate

- [x] Resolve the remaining ~20 repo-special classification entries.
- [x] Separate official tradition/NPC existence from published talent-tree existence.
- [x] Identify explicit community homebrew.
- [x] Preserve tested-homebrew vs published distinction.
- [x] Preserve GenoHaradan split-fragment evidence.
- [x] Make no production talent-pack changes.

# Verdict

The remaining ambiguous repo-special tail is no longer ambiguous:

- **19 noncanonical homebrew talent trees**
- **1 obsolete canonical split fragment**

The remaining generic repo-special queue should now consist only of source-mapped published Force/Droid/tradition/special trees awaiting final canonical membership/provenance encoding.

# PHASE 1D CHECKPOINT - Special Tree Source Mapping

**Status:** CHECKPOINT - source-mapped special trees recorded; remaining special-tree queue still in progress  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

This checkpoint preserves the special-tree work established after the normal class-tree queue was cleared.

No production talent-pack corrections are made here.

---

# 1. Registry state entering this checkpoint

- total registry entries: 195
- primary-source verified: 148
- reference-pending class trees: 0
- repo-special source review: 47

The normal class-tree lane is complete. The remaining Phase 1D work is special-tree source classification plus publication-provenance closeout.

---

# 2. Special trees already source-mapped in the current audit work

The following repository special trees have been matched to published SWSE source material and are ready for final registry promotion/reconciliation:

## Core Force talent trees
- Alter
- Control
- Dark Side
- Sense

## Force traditions / special Force trees
- Dathomiri Witch
- Jensaarai Defender
- Bando Gora Captain
- Believer Disciple
- Korunnai Adept
- Blazing Chain
- Disciple Of Twilight
- Ember Of Vahl
- Kilian Ranger
- Guardian Spirit
- Aingtii Monk
- Baran Do Sage
- White Current Adept
- Iron Knight
- Matukai Adept
- Seyugi Dervish
- Tyia Adept
- Warden Of The Sky
- Jal Shey
- Keetael
- Krath
- Luka Sene
- Order of Shasa

These mappings are not being treated as proof that the repository membership is correct. Several have substantial missing membership, naming drift, or extra records.

---

# 3. Important source-membership findings already established

## Core Force trees

### Alter
Core origin members currently verified:
- Disciplined Strike
- Telekinetic Power
- Telekinetic Savant

Repository also contains later-book additions.

### Control
Core origin members currently verified:
- Damage Reduction 10
- Equilibrium
- Force Focus
- Force Recovery

Repository is missing the Core `Equilibrium` identity from the Control tree.

### Dark Side
Core origin members currently verified:
- Power of the Dark Side
- Dark Presence
- Revenge
- Swift Power

Repository represents all four Core origin identities and later additions.

### Sense
Core origin members currently verified:
- Force Perception
- Force Pilot
- Foresight
- Gauge Force Potential
- Visions

Repository is missing Core `Visions` from Sense and contains one obvious non-talent contamination record:
- `Reference Book: Star Wars Saga Edition Starships of the Galaxy`

---

# 4. Force-tradition completeness examples

The source-mapped special-tree lane contains both healthy and badly incomplete trees.

## Fully represented examples
- Bando Gora Captain: 4/4
- Believer Disciple: 5/5
- Korunnai Adept: 4/4
- Guardian Spirit: 5/5
- Iron Knight: 5/5
- Krath: 4/4
- Order of Shasa: 4/4

## Incomplete examples

### Aingtii Monk
Canonical: 5
Repo: 1
Missing:
- Folded Space Mastery
- Liberate
- Many Shades of the Force
- Spatial Integrity

### Baran Do Sage
Canonical: 5
Repo: 1
Missing:
- Expanded Horizon
- Knowledge and Defense
- Planetary Attunement
- Precognitive Meditation

### Matukai Adept
Canonical: 6
Repo: 1
Missing:
- Body Control
- Physical Surge
- Soft to Solid
- Wan-Shen Defense
- Wan-Shen Mastery

### Seyugi Dervish
Canonical: 5
Repo: 1
Missing:
- Mobile Whirlwind
- Repelling Whirlwind
- Sudden Storm
- Tempest Tossed

### Tyia Adept
Canonical: 5
Repo: 1
Missing:
- Cycle of Harmony
- Force Stabilize
- Repel Discord
- Stifle Conflict

### Warden Of The Sky
Canonical: 6
Repo: 1
Missing:
- Brutal Unarmed Strike
- Martial Resurgence
- Rebound Leap
- Simultaneous Strike
- Telekinetic Throw

### Jal Shey
Canonical: 4
Repo: 1
Missing:
- Action Exchange
- Imbue Item
- Knowledge of the Force

### Luka Sene
Canonical: 4
Repo: 1
Missing:
- Improved Force Sight
- Luka Sene Master
- Quickseeing

### White Current Adept
Canonical: 5
Repo: 2
Missing:
- Immerse Another
- Ride the Current
- Surrender to the Current

---

# 5. Naming / contamination examples

Several repo-special records are not simple missing-content problems.

- Disciple Of Twilight repo has `Cloak of Shadows`; source identity is `Cloak of Shadow`.
- Ember Of Vahl repo includes `Empowered Weapon`, which is not part of the source origin membership currently verified for that tree.
- Keetael repo has `Visions`, while the source tree membership verified so far is a different four-talent set.
- Dathomiri Witch and Jensaarai Defender both show large source/repo membership divergence.
- Sense contains a literal source-reference string as if it were a talent name.

These require identity repair later, not name-only patching.

---

# 6. New canonical tree identities missing from the initial registry

The special-tree sweep has already identified at least two published canonical trees that were absent from the original 195-entry registry:

- Shapers of Kro Var
- Zeison Sha Warrior

These must be added as canonical source identities even if the repository has no corresponding tree document.

This is an important correction to the original registry assumption: the repo-special lane is not only about classifying existing repo trees; sourcebooks can also reveal entirely missing special trees.

---

# 7. Remaining unresolved repo-special queue

The remaining source-classification work is approximately 20 repository special entries, including records such as:

- Blackguard Wilder
- Bomarr Monk
- Chalactan Adept
- Cloner
- Cowardice
- Defensive Duelist
- Exceptional Followers
- Force Warrior
- Galactic Senator
- Genohardan split fragment
- Jedaii Ranger
- Jumptrooper
- Master Of The Amphistaff
- Mechanic
- Midichlorian
- Morgukai Warrior
- Science
- Smashball Pro
- Sorcerer Of Tund
- Treatment

The exact final count can change as:
- split fragments are retired conceptually;
- sourcebooks reveal missing canonical trees;
- repo records prove to be non-tree artifacts or noncanonical contamination.

---

# 8. Phase 1D remaining work after this checkpoint

1. Source-classify the remaining special-tree queue.
2. Add missing canonical special-tree identities discovered from source.
3. Promote source-confirmed special trees out of `REPO_SPECIAL_SOURCE_REVIEW`.
4. Encode the remaining later-book expansion publications.
5. Recalculate aggregate canonical membership and access provenance.
6. Publish a final Phase 1D special-tree report.
7. Publish a final Phase 1D closeout / correction manifest.
8. Run registry consistency checks.
9. Push the completed Phase 1D state.

No production talent pack changes occur during this phase.

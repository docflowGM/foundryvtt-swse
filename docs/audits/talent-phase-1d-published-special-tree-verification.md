# PHASE 1D - Published Special / Force Tree Verification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

## Scope

This pass resolves the 27 remaining `REPO_SPECIAL_SOURCE_REVIEW` entries that are in fact published SWSE Force/special talent trees.

It also adds two published Jedi Academy Training Manual tree identities that were absent from both the repository and the original canonical registry:

- Shapers of Kro Var
- Zeison Sha Warrior

TXT/DJVU files were used for discovery and enumeration. Sourcebook sections were checked against the corresponding published books where tree boundaries or origin provenance mattered.

No production pack changes are made in this phase.

---

# 1. Source-origin map

## Core Rulebook

Published origin trees:

- Alter
- Control
- Dark Side
- Sense
- Dathomiri Witch
- Jensaarai Defender

The Core Rulebook explicitly establishes the Force-tradition access model: tradition trees are available only to Force-sensitive characters who are members of the relevant tradition.

### Alter
Origin talents:
- Disciplined Strike
- Telekinetic Power
- Telekinetic Savant

Repo: 3/3 Core-origin identities present.

### Control
Origin talents:
- Damage Reduction 10
- Equilibrium
- Force Focus
- Force Recovery

Repo: 3/4 Core-origin identities present.

Missing from correct tree:
- Equilibrium

### Dark Side
Origin talents:
- Power of the Dark Side
- Dark Presence
- Revenge
- Swift Power

Repo: 4/4 Core-origin identities present.

### Sense
Origin talents:
- Force Perception
- Force Pilot
- Foresight
- Gauge Force Potential
- Visions

Repo: 4/5 Core-origin identities present.

Missing from correct tree:
- Visions

The current Sense tree also contains a literal contamination record:
- `Reference Book: Star Wars Saga Edition Starships of the Galaxy`

That string is not a talent identity.

### Dathomiri Witch
Origin talents:
- Adept Spellcaster
- Charm Beast
- Command Beast
- Flight

Repo correct-origin representation: 1/4.

Missing:
- Charm Beast
- Command Beast
- Flight

### Jensaarai Defender
Origin talents:
- Attune Armor
- Force Cloak
- Force Cloak Mastery
- Linked Defense

Repo: 1/4.

Missing:
- Attune Armor
- Force Cloak Mastery
- Linked Defense

---

# 2. Clone Wars Campaign Guide traditions

## Bando Gora Captain
Origin talents:
- Bando Gora Surge
- Force Fighter
- Resist Enervation
- Victorious Force Mastery

Repo: 4/4.

## Believer Disciple
Origin talents:
- Believer Intuition
- Defense Boost
- Hardiness
- High Impact
- Sith Reverence

Repo: 5/5.

## Korunnai Adept
Origin talents:
- Akk Dog Master
- Akk Dog Trainer's Actions
- Akk Dog Attack Training
- Protective Reaction

Repo: 4/4.

---

# 3. Rebellion Era Campaign Guide tradition

## Kilian Ranger
Origin talents:
- Empower Siang Lance
- Shield Gauntlet Defense
- Shield Gauntlet Deflect
- Shield Gauntlet Redirect
- Siang Lance Mastery

Repo: 3/5.

Missing:
- Empower Siang Lance
- Shield Gauntlet Redirect

---

# 4. Legacy Era Campaign Guide traditions

## Disciple of Twilight
Origin talents:
- Cloak of Shadow
- Phantasm
- Revelation
- Shadow Armor
- Shadow Vision

Repo has only `Cloak of Shadows`.

That is not the printed talent name; the canonical source identity is singular:
- `Cloak of Shadow`

The other four canonical identities are absent from the correct tree.

## Ember of Vahl
Origin talents:
- Initiate of Vahl
- Reading the Flame
- Sword of Vahl
- Vahl's Brand
- Vahl's Flame

Repo correct-origin representation: 1/5.

Missing:
- Reading the Flame
- Sword of Vahl
- Vahl's Brand
- Vahl's Flame

The repo also claims `Empowered Weapon`; this is not counted as an origin identity merely because the source uses an Empower Weapon prerequisite elsewhere. Final disposition belongs in the expansion/content repair manifest.

---

# 5. Unknown Regions tradition

## Blazing Chain
Origin talents:
- Force Directed Shot
- Negate and Redirect
- Rising Anger
- Rising Panic

Repo: 1/4.

Missing:
- Force Directed Shot
- Negate and Redirect
- Rising Anger

---

# 6. Jedi Academy Training Manual

## Guardian Spirit
Origin talents:
- Guardian Spirit
- Crucial Advice
- Distracting Apparition
- Manifest Guardian Spirit
- Vital Encouragement

Repo: 5/5.

Guardian Spirit is a general Force talent tree rather than a membership-restricted Force tradition tree.

## Aing-Tii Monk
Origin talents:
- Aura of Freedom
- Folded Space Mastery
- Liberate
- Many Shades of the Force
- Spatial Integrity

Repo: 1/5.

## Baran Do Sage
Origin talents:
- Enhanced Danger Sense
- Expanded Horizon
- Knowledge and Defense
- Planetary Attunement
- Precognitive Meditation

Repo: 1/5.

## Iron Knight
Origin talents:
- Droid Duelist
- Force Repair
- Heal Droid
- Mask Presence
- Silicon Mind

Repo: 5/5.

## Matukai Adept
Origin talents:
- Body Control
- Physical Surge
- Soft to Solid
- Wan-Shen Defense
- Wan-Shen Kata
- Wan-Shen Mastery

Repo: 1/6.

## Seyugi Dervish
Origin talents:
- Seyugi Cyclone
- Mobile Whirlwind
- Repelling Whirlwind
- Sudden Storm
- Tempest Tossed

Repo: 1/5.

## Tyia Adept
Origin talents:
- Cycle of Harmony
- Force Stabilize
- Repel Discord
- Stifle Conflict
- Tyia Adept

Repo: 1/5.

## Warden of the Sky
Origin talents:
- Brutal Unarmed Strike
- Martial Resurgence
- Rebound Leap
- Simultaneous Strike
- Telekinetic Strike
- Telekinetic Throw

Repo: 1/6.

## White Current Adept
Origin talents:
- Force Immersion
- Immerse Another
- Ride the Current
- Surrender to the Current
- White Current Adept

Repo: 2/5.

---

# 7. KOTOR Force traditions

## Jal Shey
Origin talents:
- Action Exchange
- Force Delay
- Imbue Item
- Knowledge of the Force

Repo: 1/4.

## Keetael
Origin talents:
- Conceal Force Use
- Force Direction
- Force Momentum
- Past Visions

Repo currently claims only `Visions`, which is not one of the four printed Keetael tree identities.

Canonical correct-tree representation: 0/4.

## Krath
Origin talents:
- Dark Side Manipulation
- Krath Illusions
- Krath Intuition
- Krath Surge

Repo: 4/4.

## Luka Sene
Origin talents:
- Field Detection
- Improved Force Sight
- Luka Sene Master
- Quickseeing

Repo: 1/4.

## Order of Shasa
Origin talents:
- Deception Awareness
- Greater Weapon Focus (Fira)
- Progenitor's Call
- Waveform

Repo: 4/4.

---

# 8. Two source-confirmed trees missing from the original registry

## Shapers of Kro Var — Jedi Academy Training Manual

Canonical origin talents:
- Combustion
- Earth Buckle
- Fluidity
- Thunderclap
- Wind Vortex

Repository tree document: **absent**

Registry entry before this pass: **absent**

**Disposition:** `MISSING_CANONICAL_TREE_IDENTITY`

## Zeison Sha Warrior — Jedi Academy Training Manual

Canonical origin talents:
- Discblade Arc
- Distant Discblade Throw
- Recall Discblade
- Telekinetic Vigilance
- Weapon Specialization (discblade)

Repository tree document: **absent**

Registry entry before this pass: **absent**

**Disposition:** `MISSING_CANONICAL_TREE_IDENTITY`

---

# 9. Origin-membership summary

The 27 previously unresolved published repo-special trees contain **124 source-confirmed origin identities**.

The two newly discovered missing Jedi Academy trees add **10 more**.

Therefore this special-tree pass certifies **134 canonical origin talent identities** across 29 published tree identities.

Healthy examples:
- Bando Gora Captain
- Believer Disciple
- Guardian Spirit
- Iron Knight
- Korunnai Adept
- Krath
- Order of Shasa

Severely incomplete examples:
- Keetael: 0/4
- Aing-Tii Monk: 1/5
- Baran Do Sage: 1/5
- Blazing Chain: 1/4
- Dathomiri Witch: 1/4
- Jensaarai Defender: 1/4
- Jal Shey: 1/4
- Luka Sene: 1/4
- Matukai Adept: 1/6
- Seyugi Dervish: 1/5
- Tyia Adept: 1/5
- Warden of the Sky: 1/6

---

# 10. Important identity rules confirmed

1. Later-book talents inside Alter/Control/Dark Side/Sense are **expansions**, not Core origin members.
2. Force-tradition membership is an access rule distinct from class access.
3. A source prerequisite does not automatically create tree membership.
4. A published tradition can exist without a published talent tree; tradition identity and talent-tree identity must remain separate.
5. Repository absence cannot be used as evidence that a canonical tree does not exist.
6. Source discovery can expand the registry itself, as demonstrated by Shapers of Kro Var and Zeison Sha Warrior.

---

# 11. Stop gate

- [x] All 27 remaining published repo-special trees assigned to sourcebook origins.
- [x] Canonical origin membership enumerated.
- [x] Repository origin membership compared.
- [x] Core Force trees separated from tradition trees.
- [x] Two missing canonical Jedi Academy trees identified.
- [x] No production pack edits made.
- [ ] Later-publication expansion provenance fully encoded.
- [ ] Final aggregate membership recalculated after expansion sweep.
- [ ] Final Phase 1D closeout/manifest published.

# Verdict

The generic published special-tree review queue is now structurally resolved.

The remaining Phase 1D work is no longer tree discovery. It is **publication-layer completion**: encode later additions to existing trees, recompute aggregate canonical membership/access, then publish the final correction manifest and close Phase 1D.

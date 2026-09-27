# PHASE 2 - Jedi Academy Training Manual Talent Content Certification

**Status:** COMPLETE  
**Date:** 2026-09-27  
**Branch:** `audit/talent-phase-1-tree-census`  
**Book order:** 13

## Scope

Jedi Academy Phase 2 certifies **118 talent publications**:

- **96 origin talents** across **19** introduced trees.
- **22 expansion talents** across **10** pre-existing trees.

The hierarchy pass required **no Phase 1D structural correction**.

## Machine authority

- `data/audits/talent-phase-2-jedi-academy-training-manual-content.json`
- `data/audits/talent-phase-2-jedi-academy-training-manual-discrepancy-manifest.json`

## Source bands

- Jedi, Force, and prestige-class talents: printed pp. **14-22**
- Force-tradition talent pages: printed pp. **73, 75, 77, 79, 81, 83, 85, 87, 89, 91**

TXT/DJVU supplies searchable wording. Rendered PDF pages determine printed page, hierarchy, sidebar exclusion, and whether named text is a talent versus a procedure.

## Census

| Measure | Count |
|---|---:|
| Origin trees | **19** |
| Origin talents | **96** |
| Expansion targets | **10** |
| Expansion talents | **22** |
| Total certified publications | **118** |
| Correct-tree repo records mapped | **62** |
| Missing correct-tree records | **56** |

## Missing content concentration

- **Jedi Investigator** - 2: Echoes in the Force, Unclouded Judgment
- **Jedi Weapon Master** - 1: Improvised Weapon Master
- **Mystic** - 1: Regimen Aptitude
- **Aingtii Monk** - 5: Aura of Freedom, Folded Space Mastery, Liberate, Many Shades of the Force, Spatial Integrity
- **Baran Do Sage** - 5: Enhanced Danger Sense, Expanded Horizon, Knowledge and Defense, Planetary Attunement, Precognitive Meditation
- **Iron Knight** - 5: Droid Duelist, Force Repair, Heal Droid, Mask Presence, Silicon Mind
- **Matukai Adept** - 6: Body Control, Physical Surge, Soft to Solid, Wan-Shen Defense, Wan-Shen Kata, Wan-Shen Mastery
- **Seyugi Dervish** - 5: Seyugi Cyclone, Mobile Whirlwind, Repelling Whirlwind, Sudden Storm, Tempest Tossed
- **Tyia Adept** - 5: Cycle of Harmony, Force Stabilize, Repel Discord, Stifle Conflict, Tyia Adept
- **Warden Of The Sky** - 6: Brutal Unarmed Strike, Martial Resurgence, Rebound Leap, Simultaneous Strike, Telekinetic Strike, Telekinetic Throw
- **White Current Adept** - 5: Force Immersion, Immerse Another, Ride the Current, Surrender to the Current, White Current Adept
- **Shapers of Kro Var** - 5: Combustion, Earth Buckle, Fluidity, Thunderclap, Wind Vortex
- **Zeison Sha Warrior** - 5: Discblade Arc, Distant Discblade Throw, Recall Discblade, Telekinetic Vigilance, Weapon Specialization (discblade)

## Hierarchy findings

**Sith Alchemy** is one selectable talent. **Create Sith Amulet**, **Create Sith Armor**, **Create Sith Talisman**, and **Create Sith Weapon** are procedures within it, not four additional talents.

**Sith Alchemy Specialist** references Table 1-1 for its trait choices. Those table rows are supporting rules, not talent identities.

The **Optional Rule: Daily Force Points** sidebar interrupts the printed **Guardian Spirit** text; it is not part of that talent. Likewise, the **New Species: Shards** sidebar does not split the Iron Knight talent tree.

No canonical tree-membership correction was required.

## Repository fidelity

The machine manifest separates missing correct-tree records from full-text differences, prerequisite mismatches, missing source/page metadata, and missing quick summaries.

## Content contract

```text
system.benefit
    = canonical published rules text

system.description.value
    = canonical full player-readable rules text

system.summary
    = concise derived player-facing summary

system.prerequisites
    = canonical printed prerequisite text

source/page
    = Jedi Academy Training Manual + printed page
```

## Stop gate

- [x] 19 origin trees / 96 origin talents certified.
- [x] 22 expansion publications certified.
- [x] 118 identities page-mapped.
- [x] Parent/procedure and sidebar hierarchy verified against rendered pages.
- [x] 62 correct-tree repository records mapped.
- [x] 56 missing correct-tree records isolated.
- [x] No Phase 1D structural correction required.
- [x] No production/runtime changes.

# Verdict

**Jedi Academy Training Manual Phase 2 content certification is complete.**

# PHASE 2 - Knights of the Old Republic Campaign Guide Talent Content Certification

**Status:** COMPLETE  
**Date:** 2026-09-27  
**Branch:** `audit/talent-phase-1-tree-census`  
**Book order:** 11

## Scope

KOTOR Phase 2 certifies **115 talent identities**:

- **82 origin talents** across **16** introduced trees.
- **33 expansion talents** across **17** pre-existing trees.

The visual hierarchy pass found **no Phase 1D structural correction**. Named sub-effects such as the two Sith Alchemy creation procedures remain inside their parent talent rather than becoming false talent identities.

## Machine authority

- `data/audits/talent-phase-2-knights-of-the-old-republic-campaign-guide-content.json`
- `data/audits/talent-phase-2-knights-of-the-old-republic-campaign-guide-discrepancy-manifest.json`

## Source bands

- Heroic talents: printed pp. **24-30**
- Prestige talents: printed pp. **38-47**
- Force talents and traditions: printed pp. **52-61**

TXT/DJVU supplies searchable wording; rendered PDF pages are final authority for hierarchy and page boundaries.

## Census

| Measure | Count |
|---|---:|
| Origin trees | **16** |
| Origin talents | **82** |
| Expansion targets | **17** |
| Expansion talents | **33** |
| Total certified identities | **115** |
| Correct-tree repo records mapped | **92** |
| Missing correct-tree records | **23** |

## Missing content concentration

The 23 missing correct-tree records include all talents from five Force traditions:

- Jal Shey - 4
- Keetael - 4
- Krath - 4
- Luka Sene - 4
- Order of Shasa - 4

Additional missing identities:

- Gladiatorial Combat -> Multiattack Proficiency (exotic weapons)
- Melee Duelist -> Multiattack Proficiency (advanced melee weapons)
- Sith -> Sith Alchemy

## Sith Alchemy identity boundary

The repository contains a same-name item under a separate `Sith Alchemy` tree. The KOTOR source publication certified here is **Sith -> Sith Alchemy**, an expansion talent of the Core Sith tree.

Repair must not move or overwrite a same-name item by display name alone.

The talent itself contains the **Create Sith Talisman** and **Create Sith Weapon** procedures. Those are internal procedures, not standalone talents.

## Repository text fidelity

The machine manifest distinguishes:

- full canonical text already present;
- abbreviated/different text;
- prerequisite mismatches;
- missing source/page metadata;
- missing quick summaries;
- missing correct-tree item records.

An abbreviated record is not automatically classified as a mechanics defect; the source-backed certification provides the deterministic repair target.

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
    = Knights of the Old Republic Campaign Guide + printed page
```

## Stop gate

- [x] 16 origin trees / 82 origin talents certified.
- [x] 33 expansion talents certified.
- [x] 115 identities page-mapped.
- [x] Full normalized source text captured.
- [x] Printed prerequisites captured.
- [x] Parent/action hierarchy preserved.
- [x] 92 current correct-tree item records mapped.
- [x] 23 missing correct-tree records isolated.
- [x] Sith Alchemy same-name hazard protected.
- [x] No Phase 1D structural correction required.
- [x] No production/runtime changes.

# Verdict

**Knights of the Old Republic Campaign Guide Phase 2 content certification is complete.**

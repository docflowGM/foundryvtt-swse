# PHASE 2 - Rebellion Era Campaign Guide Talent Content Certification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`  
**Book order:** 3

## Scope

Tree-by-tree certification of all talent publications in the **Rebellion Era Campaign Guide**: **56** origin talents across **10** introduced trees plus **8** additions to **5** pre-existing trees, for **64** source identities.

TXT/DJVU was the indexing/transcription layer. Relevant PDF pages were rendered and visually checked for printed-page attribution, identity boundaries, and OCR-sensitive cases. No production records are modified.

## Machine authority

- `data/audits/talent-phase-2-rebellion-era-campaign-guide-content.json`
- `data/audits/talent-phase-2-rebellion-era-discrepancy-manifest.json`

## Census

| Measure | Count |
|---|---:|
| Origin trees | **10** |
| Origin talents | **56** |
| Expansion targets | **5** |
| Expansion talents | **8** |
| Total certified identities | **64** |
| Correct-tree repo records mapped | **61** |
| Missing correct-tree identities | **3** |

Missing identities:

- Rebel Recruiter -> **Stay in the Fight** (distinct same-name identity)
- Kilian Ranger -> **Empower Siang Lance**
- Kilian Ranger -> **Shield Gauntlet Redirect**

The existing repo `Stay in the Fight` belongs to **Legacy Era / Fugitive Commander**, has a different prerequisite and mechanic, and must not be moved or overwritten.

## Kilian Ranger corruption

The Kilian Ranger block is the book's most serious data defect.

- `Shield Gauntlet Defense` currently contains the **Shield Gauntlet Deflect** mechanic.
- `Shield Gauntlet Deflect` currently concatenates portions of **Deflect**, **Redirect**, and **Siang Lance Mastery**.
- `Siang Lance Mastery` currently contains **Empower Siang Lance** and **Shield Gauntlet Defense** material.
- `Empower Siang Lance` is missing.
- `Shield Gauntlet Redirect` is missing.

The certification file contains clean source-backed text and prerequisites for all five identities.

## Other source-confirmed defects

### Gambling Leader - Direct Fire
Source: **once per turn**. Repo: **once per encounter**.

### Recklessness - Find Openings
Source is the simple +2 morale next-attack rider after an enemy misses you. Repo benefit concatenates **Risk for Reward** and **Trick Step**.

### Ambusher - Keep Them Reeling
Repo description contains a different mechanic. The source talent is the opposed-Initiative swift action that makes the prime target flat-footed against your attacks.

### Ambusher - Destructive Ambusher
Repo stores only a compressed benefit and has an empty description.

### Unpredictable - Swerve
Repo description appends the next Wingman talent, **Concentrate All Fire**.

### Improviser - Bigger Bang
Repo stores only a shorthand summary; the source rule is retained in full.

### Wingman - Concentrate All Fire
Repo stores a shorthand summary rather than the complete source wording.

### Pathfinder - Bunker Blaster
Repo is paraphrased; the source wording is retained in the canonical dataset.

## Prerequisite certification

Source-significant prerequisite differences:

- Kilian Ranger -> Shield Gauntlet Deflect: source `Shield Gauntlet Defense`; repo `(none)`

## Phase 1D reconciliation

The page-level pass found no additional missing Rebellion structural publication identity. Phase 1D's **56 origin + 8 expansion = 64** population survives.

## Stop gate

- [x] 10 origin trees / 56 origin talents certified.
- [x] 8 expansion talents certified.
- [x] All 64 identities page-mapped.
- [x] Canonical rules/prerequisites recorded.
- [x] All 64 have non-RAW quick summaries.
- [x] Distinct same-name Stay in the Fight protected.
- [x] Kilian Ranger corruption isolated.
- [x] No production/runtime edits.
- [x] No unresolved identity reviews.

# Verdict

**Rebellion Era Campaign Guide Phase 2 content certification is complete.**

Next: **Galaxy at War**, same branch.

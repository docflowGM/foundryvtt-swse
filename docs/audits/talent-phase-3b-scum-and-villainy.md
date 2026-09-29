# Talent Canonicalization Phase 3B — Scum and Villainy

**Status:** COMPLETE  
**Date:** 2026-09-29  
**Branch:** `audit/talent-phase-3a-canonical-authority`  
**Certified publication claims:** 110  
**Owned canonical identities:** 110  
**Canonical trees:** 23  
**Production mutation:** NONE

## Result

| Disposition | Count |
|---|---:|
| `UPDATE_CONTENT` | 104 |
| `UPDATE_METADATA` | 1 |
| `CORRECT_TREE` | 3 |
| `CREATE` | 1 |
| `IDENTITY_SPLIT` | 1 |
| **Total** | **110** |

The live comparison resolves 108 reusable talent documents. Only Pistoleer `Flanking Fire` is a straightforward create. Piracy `Keep Them Reeling` requires a protected same-name split.

## GenoHaradan tree consolidation

The canonical GenoHaradan tree is split across two misspelled production documents.

- Preserve survivor `da7b731a3e434a7a` (`Genoharadan`).
- Rename the survivor to canonical `GenoHaradan`.
- Move Deadly Repercussions, Improved Manipulating Strike, and Pulling the Strings from obsolete tree `db1b30c2163d0650` (`Genohardan`).
- Preserve Manipulating Strike in the survivor.
- Replace the survivor's membership arrays with the four certified canonical talents.
- Delete only obsolete split fragment `db1b30c2163d0650` after the moves and reference checks succeed.

The manifest's `treeConsolidations` block is the exact Phase 3C authority for this repair.

## Protected identity split

- Piracy `Keep Them Reeling` → create `9fe189e1376feec5`.
- Preserve Ambusher `Keep Them Reeling` `24bf81bc6d74fafd`.

## Genuine create

- Pistoleer `Flanking Fire` — `1f6b9d509a07f881`.

## Structural corrections retained

- Inspiration publishes `Beloved`; `Bolster Ally` is its prerequisite, not the Scum expansion talent.
- Disgrace does not publish `Draw Fire`; that name appears only as a cross-tree reference inside Misplaced Loyalty.

## Source verification

The Scum and Villainy talent sections were visually verified in the supplied PDF across printed pages 13–18 and 25–35. The rendered layout confirms tree boundaries, prerequisites, the GenoHaradan membership, the two structural corrections, and the distinct Keep Them Reeling identities.

## Validation

```bash
node tools/build-talent-canonical-authority.mjs --check
node tools/build-talent-phase-3b-scum-and-villainy-manifest.mjs --check
```

Scum and Villainy Phase 3B is complete. No production talent or talent-tree records were mutated.

# Illusion talent — size-penalty OCR correction (audit evidence only)

**Date:** 2026-11-21. **Issue:** #1166 Phase 2 follow-up. **Authority:** project owner, printed-source review recorded on PR #1171 and confirmed in the owner's chat ruling.

## Finding (printed source, owner-inspected renders)
- *Knights of the Old Republic Campaign Guide*, **printed p.52**: the Illusion talent's size penalties read -1 Huge, -2 Gargantuan, -5 Colossal, **-10** Colossal (frigate) or larger.
- *Jedi Academy Training Manual*: the talent begins on printed p.14 and its paragraph runs onto **printed p.15**, where the -10 penalty appears. The existing p.14 attribution in the evidence file is incomplete for the numeric penalty and was **not** changed.
- The KOTOR audit-evidence JSON carried the OCR rendering `~10`. This is a transcription correction, not a rules change or house rule.

## What changed
- `data/audits/talent-phase-2-knights-of-the-old-republic-campaign-guide-content.json`: one occurrence, `~10` → `-10` in the Illusion `canonicalDescription` (1 line).
- `tests/talent-illusion-size-penalty-evidence.test.mjs`: asserts both evidence records read `-10 ... Colossal (frigate) or larger`, no OCR tilde remains, and the active canonical Illusion talent already reads -10. Verified to fail against the unfixed file.

## Deliberately not changed
- The active canonical talent (`data/canonical/talents.json`, Force Unleashed / Alter / Illusion, top level) and `packs/talents.db`: already correct, untouched.
- JATM evidence file: already reads -10; the old branch's other edits (OCR line-break artifacts, `phase3AReviewCorrection` notes, `reviewedAt`) were not imported.
- `phase3/talent-production-canonicalization` was not merged or cherry-picked.

## Open follow-up (needs owner authorization)
`data/canonical/talents.json` contains a **generated per-publication mirror** of the KOTOR claim (`publications[]`, claimIdentity `Knights of the Old Republic Campaign Guide|Alter|Illusion`, `sourceAuthorityFile` pointing at the evidence file above) that still carries `~10`. It was not edited because it is canonical-corpus data outside this evidence-only authorization. The proper fix is to regenerate that mirror from the corrected evidence file through `tools/build-talent-canonical-authority.mjs` (or an equivalent one-token change), with the talent freeze guard (`tools/check-talent-phase-3c-ci.mjs`) run afterwards.

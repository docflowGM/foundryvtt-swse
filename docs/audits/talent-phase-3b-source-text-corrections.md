# Phase 3B Source-Text Corrections

Branch: `audit/talent-phase-3b-source-text-corrections` (from `main` @ `b261446`).
Manifest: `data/audits/talent-phase-3b-source-text-corrections.json` · Tool: `tools/apply-talent-phase-3b-source-text-corrections.mjs`
· Guard: `tests/talent-phase-3b-source-text-corrections.test.mjs`.

## Why

The Phase 3C tooling refused to write the certified Phase 3B text because it contained OCR damage that had been copied
from the DjVu text into the Phase 2 content authority and certified. This branch repairs that damage **at its source**
(Phase 2 content) and regenerates the rest of the chain with its own builders; no Phase 3B manifest was edited by hand.

```
data/audits/talent-phase-2-*-content.json   (edited: exact, asserted replacements from the manifest)
  -> tools/build-talent-canonical-authority.mjs   -> data/canonical/talents.json
  -> tools/build-talent-phase-3b-manifest.mjs     -> data/audits/talent-phase-3b-*-manifest.json   (14 books)
  -> data/audits/talent-phase-3b-global-closeout.json  (blob SHAs, disposition counts, correction record)
  -> docs/audits/talent-canonical-production-reference.md (human-readable copy of the corrected text)
```

## What was reviewed

| Scope | Fields / records |
|---|---|
| Fields flagged by the Phase 3C signature scan | **54 fields in 27 records** |
| … corrected | **54** |
| … proven false positives | **0** |
| Further records found by a full scan of all 1,180 canonical texts | **20** (17 corrected, 3 not repairable from the TXT) |
| Manifest entries | **47** (44 corrected, 3 documented but not applied) |
| Phase 2 fields changed | 58 |

Status: 43 `TXT_CONFIRMED`, 4 `TXT_AMBIGUOUS_PDF_REQUIRED` (one applied, three not applied), 0 `UNRESOLVED`.

### Defect classes found

| Class | Records | Handling |
|---|---|---|
| Illustration/page noise appended or inserted (`YatavHg`, `esidvnS eaVued …`, `H3iLeavHO …`, …) | 8: Greater Dark Side Talisman, Suppress Force, Disarming Attack, Share Force Secret, Taint of the Dark Side, Force Delay, Dark Side Manipulation, Visionary Attack | noise removed; the rules text ends where the TXT shows the next element |
| Captions / section headings / next-section introductions appended | 15: Jedi Hunter, Shoto Master, Mobile Attack (pistols), Know Weakness, Hold the Line, Master of the Great Hunt, Sith Alchemy, Leading Feint, Force Warning, Shoto Pin, Telepathic Intruder, Waveform, Motion of the Future, Force Stabilize, Earth Buckle | removed from the rules text |
| `{ }` for `( )` / `[ ]`, `[` for `(` | Redirect Shot, Knowledge Is Strength, Combat Repairs, Burning Assault, Unstoppable, Krath Surge, Master of Elegance | delimiter restored from its paired partner in the same passage |
| `\|` / `\\f` / `~` OCR substitutions | Impel Ally I/II, Masterwork Lightsaber, Transfer Essence, Connections, Mobile Attack (lightsabers), Krath Illusions | restored (`I`, `If`, joined word, `Illusion`) |
| HTML `<p>` wrappers | 7 Force Adept / Force Item talents | markup only removed |
| Damaged in the TXT itself | **Disciplined Strike, Exotic Weapon Mastery, Slippery Strike** (and Krath Illusions' prerequisite) | the three are **not corrected** and need the PDF; Krath Illusions is applied but PDF-pending |

Small in-word OCR letters inside a corrected field (`norma!`, `Fdition`, a stray `"`) were fixed only in fields that
were already being corrected. Comma-for-full-stop OCR and other punctuation normalisation was **deliberately not
touched** (recorded per entry in `deliberatelyUncorrected`). Nothing was reworded.

## Verification evidence and its limits

* The sourcebook **PDFs and the combined "All Books" corpus are not in the repository or in this session**, so nothing
  here is `PDF_CONFIRMED`. Every correction rests on the individual TXT files only: a paired delimiter, a clean sibling
  occurrence (e.g. `Dual Weapon Mastery I,` two talents above the damaged `Dual Weapon Mastery |,`), or the TXT rules
  text visibly ending before appended furniture. Each entry cites the TXT file and line.
* **Krath Illusions** (`||lusion` → `Illusion`, printed p. 60) is applied but stays `TXT_AMBIGUOUS_PDF_REQUIRED`: the
  individual TXT is itself damaged. Corroboration: `||` is the OCR read of `Il`; `Saga Edition Core Rulebook|Alter|Illusion`
  is the only talent that fits; production and the source-verified hydration test carry `Illusion`; the project owner
  reports the combined OCR corpus reads `Illusion` (not inspectable here). It still needs a rendered-PDF check.
* **Detection is signature-based.** OCR damage without a detectable signature (a silently wrong letter, a dropped word)
  cannot be found by scanning; only a PDF proofread can. The three Core/KOTOR records above were found by side effects
  (unbalanced brackets, a benefit that stops mid-sentence).

## Identity and disposition accounting

Identity accounting is unchanged: 14 sourcebooks, 1,182 claims, 1,180 canonical identities, 932 existing + 248 generated,
90 deferred, 2 review extras (asserted by the test). **Disposition totals moved by two records**, both because a corrected
canonical text now *equals* production and so is no longer a content change:

| Record | Before | After | Why |
|---|---|---|---|
| `Knights of the Old Republic Campaign Guide\|Melee Duelist\|Master of Elegance` | UPDATE_CONTENT | UPDATE_METADATA | corrected `(instead of your Strength bonus)` equals the production text |
| `Saga Edition Core Rulebook\|Mastermind\|Impel Ally II` | UPDATE_CONTENT | UPDATE_METADATA | corrected prerequisite `Impel Ally I` equals production |

Global dispositions: `UPDATE_CONTENT 727 → 725`, `UPDATE_METADATA 144 → 146`; all other dispositions unchanged; the total
is still 1,180. The per-book expected counts in `tools/build-talent-phase-3b-manifest.mjs` (Core 111/32, KOTOR 98/1) and the
global totals in `tools/check-talent-phase-3b-global-closeout.mjs` were updated deliberately, and the closeout records the
previous and corrected values (`phase3bSourceTextCorrections`).

## Non-source findings

* **Elite Droid page** — Phase 3B/Phase 2 say printed p. **29**; the hydration test and production said 28. The repository
  records a rendered-PDF verification: `talent-phase-2-scavengers-guide-to-droids-content.json` (`authority.rule`: rendered
  printed pp. 26–29 are the page authority; `canonicalTextCapture` `DJVU_NORMALIZED_PDF_PAGE_AND_HIERARCHY_VERIFIED`) and
  `talent-phase-3b-scavengers-guide-to-droids.md` ("printed page 28 — remaining Fifth-Degree, Override, Specialized Droid,
  Autonomy; printed page 29 — Elite Droid talents", "visually checked in the supplied PDF"). The individual TXT orders the
  Autonomy block immediately before "New Elite Droid Talent Tree", consistent with 28 → 29. The `28` came from commit
  `96a20b7`, which cites p. 28 without a PDF check (Phase 1C inspected p. 28 for the Autonomy/Specialized material).
  **Verdict: Phase 3B authority is right; the test expectation was stale.** Status `PRIOR_PDF_AUDIT_RECORDED` — this audit
  could not re-render the page.
* **Skill Confidence** — the Galaxy of Intrigue TXT prints `Prerequisite: Critical Skill Success, trained in the chosen
  skill.`; the canonical value is right, the hydration test was stale.

## Tests

`tests/talent-phase-3b-source-text-corrections.test.mjs` (11 checks) plus state-aware hydration tests
(`krath-`, `elite-droid-`, `superior-skills-`), which use `tests/helpers/phase3b-certified.mjs`: a hydrated record must be in
exactly one of two states — the legacy hand-hydrated text (wording clause assertions apply) or the Phase 3B certified text
(then it must equal the certified target field for field, including page and prerequisites). Anything else fails. This keeps
the tests meaningful both before and after Phase 3C is applied.

## Remaining gates before Phase 3C may write production

1. Rendered-PDF check of **Krath Illusions** (printed p. 60).
2. PDF transcription of **Disciplined Strike** (Core), **Exotic Weapon Mastery** (Core), **Slippery Strike** (KOTOR): their
   canonical text is still the damaged TXT text and is *not* fixed by this branch.
3. Optional: independent PDF re-check of the Elite Droid page (already recorded as verified in two repository audits).
4. `node tools/apply-talent-phase-3b-source-text-corrections.mjs --check --strict` must pass (it fails while any entry is
   PDF-pending).

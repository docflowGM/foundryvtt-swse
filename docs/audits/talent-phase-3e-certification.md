# Phase 3E — Canonical Corpus Completion: Certification

**PHASE 3E COMPLETE on branch `audit/talent-phase-3e-corpus-completion` — certification pending PR review and merged-`main` re-verification.**
Base: merged `main` @ `f3395d22201718d46954e359bd1c78f472cdc78c` (Phase 3D closed). Phase 3F (tree identity / display-name / slug normalization) is **not** started.

## 1. Question answered

Is the 1,187-record canonical talent pack *complete* against the published SWSE corpus under correct identity, and how far has its production text been verified against print?

**Completeness:** yes. 1,182 certified claims + 7 addendum claims = **1,189 published claims → 1,187 canonical identities → 1,187 canonical production records**, machine-enforced with zero blocking findings.
**Text:** the 23 records the source-first census and two rendered-PDF passes proved damaged are repaired from print; a whole-corpus text invariant (`TEXT_DRIFT`) now proves production text equals the certified canonical text or an approved, PDF-verified correction. A full-text PDF comparison of all 1,187 records was not performed (see §7).

## 2. Units

| Unit | Result | Key artifacts |
|---|---|---|
| 3E plan | layer inventory, circularity weakness, units and boundaries | `docs/audits/talent-phase-3e-plan.md` |
| 3E-2a Core Gunslinger census | 7 published → 7 production, 0 missing, 0 unexplained; Phase 1D roster was 5 (Ranged Disarm, Trigger Work PDF-verified p.217) | `tools/census-talent-core-gunslinger.mjs`, `data/audits/talent-phase-3e-core-gunslinger-census.json` |
| 3E-1 authority addendum | the seven identities Phase 3D certified in production but Phase 1D/2/3A never recorded, layered on the immutable certified artifacts (authority 1,182+7 claims, 1,180+7 identities); all seven PDF-verified (Core p.217 ×2, LECG p.55 ×3, Threats p.95, Threats p.81) | `data/audits/talent-phase-3e-canonical-additions.json`, `tools/check-talent-phase-3e-additions.mjs` |
| 3E-2b discovery census | independent of the claims layer: stat-block census, prerequisite closure, rare-token scan. Seven printed references with **no printed rule definition** (Command Decision, Wanted Alive, Force Valor, Attract Student, Shocking Revelation, Social Engineering, Squad Fighter) — owner PDF pass: **no canonical talent added** | `tools/census-talent-source-discovery.mjs`, `data/audits/talent-phase-3e-discovery-census.json` |
| 3E-3 reconciler | claim↔record invariant, now also `TEXT_DRIFT` (§4) | `tools/reconcile-talent-publication-corpus.mjs`, `data/audits/talent-phase-3e-publication-reconciliation.json` |
| 3E-4 seven-record repair | source/page on all seven; full PDF-verified rules text for Move Massive Object, Telekinetic Stability, Dark Preservation, Ranged Disarm, Stolen Form; Hard Target printed wording; Move Massive Object prerequisite `Telekinetic Power, move object`. 32 leaf changes, 0 outside the seven | `tools/apply-talent-phase-3e4.mjs`, manifest + dry-run report |
| 3E-5 text-defect repair | 28 PDF-verified entries on **23 records**, 49 leaf changes, 0 outside the 23; six printed forms preserved | `tools/build-talent-phase-3e5-defect-manifest.mjs`, `tools/apply-talent-phase-3e5.mjs`, manifest + dry-run report |

### 3E-5 repairs (all owner rendered-PDF verified)
Whole-field: Wrong Decision and Vital Encouragement (adjacent-section bleed removed), Share Talent (hyphenations, caption contamination, punctuation, paragraphs), Hunter's Mark (incl. its derived summary), Ruthless Negotiator (incl. summary).
Token/glyph: Battle Analysis, Empower Weapon, Relentless prerequisite, Shift Defense I prerequisite removed (none is printed), `Force-sensitive`, `convert it`, `Force-users`, `one-half` ×5, `possess`, `damage. If you`, `1d6 x your Wisdom modifier`, stray quote, nine bullet glyphs (`•`), trailing `. ,`.
Preserved as printed (PDF-confirmed): Sidestep `to 1 until`, `nonenergy`, `nonproficiency`, `nonprestige`, `nonsurprised`, `Nonthreatening:`.

## 3. Final production state (packs/talents.db)

1,187 canonical talents (unchanged count) · 177 canonical trees · 50 homebrew talents / 19 homebrew-only trees · 1,237 preserved. Class, tree, actor, homebrew, registry and derived-mirror files are byte-identical to Phase 3D. Changes to `packs/talents.db` across the phase: 7 records (3E-4) + 23 records (3E-5), disjoint sets, each through manifest → dry-run → apply → verify.

## 4. Machine gates (all in `tools/check-talent-phase-3c-ci.mjs`, state `POST_3E5_STATE`)

- 3E-5 `--verify --exact` (88 checks); 3E-4 seven-record check still intact; runtime registry freshness; membership audit; homebrew integrity.
- Reconciler: `CLAIM_WITHOUT_RECORD 0 · RECORD_WITHOUT_CLAIM 0 · DUPLICATE_MAPPING 0 · DUPLICATE_RECORD_IN_TREE 0 · WRONG_TREE 0 · NAME_MISMATCH 0 · UNRESOLVED_SAME_NAME_AMBIGUITY 0 · CLAIM_COUNT_MISMATCH 0 · HOMEBREW_IN_DENOMINATOR 0 · TEXT_DRIFT 0 · WRONG_SOURCE_PAGE 0` (was 7 before 3E-4). 19 same-name cross-tree groups are resolved by tree identity, never by name. `TEXT_DRIFT`: 4,741 text fields checked, 49 currently at an approved correction.
- Non-blocking, carried to Phase 3F: `STALE_TREE_ID_SLUG 71`, `TREE_DISPLAY_NAME_DRIFT 72`.

## 5. Validation run

`apply-talent-phase-3e5.mjs --verify --exact`, `apply-talent-phase-3e4.mjs --verify`, the five 3E test files, the 3D post-state regression (structural invariants stay live in the later states), `check-talent-phase-3c-ci.mjs`, and the full rolling suite (result recorded in the PR).

## 6. Intentionally not changed

Stale `system.treeId` slugs and tree display names (3F); structured-prerequisite runtime identity (V2); homebrew enablement; class/actor/tree/registry data; the certified Phase 1D/2/3A/3B artifacts (additions and corrections are layered, not edits); `system.summary` for the seven 3E-4 records (none exists; not invented); **the 104 + 24 embedded actor items** that point at repaired records — no runtime or SSOT contract makes them mirror compendium prose, 22 of the 24 already differed before repair and none of the 104 was a verbatim copy; Share Talent / Ruthless Negotiator / Turret Self-Destruct / Psychic Defenses prerequisite strings (differ from print only by the terminal period).

## 7. Known limits / follow-ups

1. **Text completeness is bounded, not proven.** Scans (rare-token, OCR-confusable, stray-digit, symbol) only nominate; the first PDF pass showed token scans miss whole-block defects (section bleed, captions), and the second scan found seven more defects after it. A full-text PDF comparison of all 1,187 records is the only thing that would certify text completeness; it is out of 3E scope.
2. Seven printed references have no printed definition (§2); if the owner later rules any a real talent it needs a new claim + addendum row, not a silent add.
3. Phase 3F: normalize the 71 stale `treeId` slugs and 72 tree display names under the same manifest contract.
4. V2: structured-prerequisite runtime identity.
5. Optional: refresh embedded actor snapshots if a runtime requirement for it ever appears.

## 8. Merged-`main` gates (run after merge against the actual merge SHA)

`node tools/check-talent-phase-3c-ci.mjs` (expect `POST_3E5_STATE`, all checks pass) · `node tools/apply-talent-phase-3e5.mjs --verify --exact` · `node tools/reconcile-talent-publication-corpus.mjs --check` · `node tools/run-rolling-tests.mjs`.

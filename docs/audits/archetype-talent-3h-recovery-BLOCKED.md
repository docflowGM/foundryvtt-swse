# BLOCKED — Talent Phase 3H / Archetype Phase 11 vocabulary recovery (issue #1166 tranche B-2)

**Status:** `DEFERRED` / draft only. **Do not merge.** Source: `origin/audit/archetype-phase-11-2-mechanical-ontology` @ `c81cd8b8d0fafc43e2f0467e6bad54f41e2bfd2f` (includes strict-subset `audit/talent-phase-3h-semantic-metadata`). Files are byte-identical to that SHA, excluding the two tools that `main` holds in newer form (`tools/apply-talent-phase-3g.mjs`, `tools/check-talent-phase-3c-ci.mjs` — **not** taken).

## Exact blockers
1. **Test fails against current data.** `node --test tests/talent-phase-3h-semantic.test.mjs` → `AssertionError: [talent-phase-3h] the pre-migration pack is required (found UNKNOWN)`. The test asserts the talent pack is still pre-3H and that 1,168 records are pending; `main` already applied Phase 12-2 global semantic tag authority and finalized the Phase 12 talent ontology on 2026-10-02 (`c6e0b2e81`, `590f3d718`), one day after this branch's tip (2026-10-01).
2. **Competing vocabulary authority.** `data/canonical/semantic-tag-vocabulary.json` declares itself `SEMANTIC_VOCABULARY_AUTHORITY` with the 57 Phase 11 tags. `main` has since frozen a 190-tag ontology (`data/audits/talent-feat-phase3-final-ontology.json`), and `docs/audits/archetype-phase-12a-convergence-audit.md` requires "no legacy Phase 11-only tag in canonical runtime tags". Adding it under `data/canonical/` would create a second authority.
3. **Inert tools.** `tools/apply-talent-phase-3h.mjs` and related generators target the old schema; they must not be run against current data.
4. **Runtime consumers:** none found in `scripts/`, `index.js`, `system.json` or `templates/` for `semantic-tag-vocabulary`, 3h, or Phase-11 vocabulary. No runtime impact if never merged.

## Recommended disposition (owner decision)
Treat the 3H dry-run as `SUPERSEDED` by Phase 12. If wanted, port only the census/QA artifacts as clearly-labelled historical evidence under `docs/audits/` (not `data/canonical/`). The 7 archetype-11-2 docs were split out as a separate docs-only PR.

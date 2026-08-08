# Feat Integrity — Current-State Forensic Audit

Phase 1 of the feat source/pack/prerequisite-integrity task. Facts observed in this repository on 2026-08-06/07, verified by running real tooling against real repository state — not by reading older audit documents and assuming they still describe `main`. Where an older audit's claim is repeated below, it has been independently re-checked.

## 1. Feat data: catalog and pack

- **Canonical source**: `data/feat-catalog.json`, a plain JSON array of Foundry Item documents (`type: "feat"`).
- **Generated pack**: `packs/feats.db`, NeDB-style JSONL, produced 1:1 from the catalog by `tools/rebuild-feats-pack-source.mjs` (one `JSON.stringify(doc)` per catalog entry, in catalog order — deterministic; verified by rebuilding twice and diffing identical output).
- **`system.json`** declares the pack at `path: "packs/feats"` (no `.db` extension), which is how every one of the 66 declared packs in this repository is declared. **No pack in this repository has a committed LevelDB directory** (`find packs -type d` returns nothing beyond `packs` itself) — all 66 are flat NeDB `.db` files. Foundry migrates NeDB `.db` sources into a LevelDB store on first load; this repository ships the pre-migration source, which is the established pattern for every pack here, not a feats-specific anomaly.
- **Prior claim checked**: an earlier audit fed into this task asserted "packs/feats.db is empty on main." This is **false for the current repository** — `packs/feats.db` has never been empty in its own git history (`git log --follow` on the file shows two commits, both non-empty), and it is not empty on `origin/main` today. That claim either described a different, stale state or a different clone.
- **Orphaned artifact**: `packs/feat-catalog.db` (413 docs) exists in the repo but is **not referenced anywhere in `system.json`** and not imported by any production code (one dev-audit script mentions its path in a doc-comment only). It is a leftover pre-cleanup snapshot from an earlier sanitization pass, not a second source of truth. See §4.

## 2. Real counts as of this audit (HEAD at time of writing)

| Artifact | Count |
|---|---|
| `data/feat-catalog.json` | **390** documents |
| `packs/feats.db` | **390** documents |
| ID/content parity between the two | **exact** (`tools/verify-feats-pack-source.mjs`, `tools/audit-feat-inventory.mjs --strict` both pass with zero mismatches) |
| Duplicate `_id` values | 0 |
| Duplicate normalized names | 0 |
| Non-`type:"feat"` records in the catalog | 0 |
| Known-invalid records present in the catalog | 0 (11 removed this task; see §4) |

Regenerate with `node tools/audit-feat-inventory.mjs --strict` — see `docs/audits/generated/feat-inventory-report.json` for the live, self-identifying (git-commit-stamped) version of this table.

## 3. `verify-feats-pack-source.mjs`, before this task

Before this task's changes, the verifier checked JSONL shape, `type`, `_id`, duplicate ids/names — but **did not check for zero documents**. An empty `packs/feats.db` would produce zero loop iterations, zero errors, and print `Feat pack source OK: 0 unique feat documents.` with exit code 0. This was a real gap (confirmed by testing it directly against a truncated copy) even though the file was not actually empty on `main`. It has been hardened this task to hard-fail on zero documents and to require exact ID-set + content-hash parity against `data/feat-catalog.json`.

## 4. The 414 → 401 → 390 count history (see the dedicated reconciliation doc for full detail)

`docs/audits/feat-inventory-history-reconciliation.md` has the full table. Summary:

- **414 → 401**: `scripts/data/feat-domain-guard.js` (already on `main` before this task started, dated 2026-07-18/19) documents 13 names (`TALENT_ONLY_FEAT_CONTAMINANTS`) as real SWSE **talents** that had been scraped into the feat catalog as fabricated feat records. `414 - 13 = 401`, an exact match to the count recorded in `docs/audits/feat-source-parity-phase-1-implementation-prompt.md` (2026-06-30).
  - **A correction made and reverted within this same task**: an initial pass misread the orphaned `packs/feat-catalog.db` as a *recovery* source for 12 of those 13 names and merged them back into `data/feat-catalog.json` (401 → 413) before finding `feat-domain-guard.js`. That merge was reverted the same day once the deny-list and the duplicate talent-pack records were found. **Do not use `packs/feat-catalog.db` to "restore" feats.**
- **401 → 390**: this task removed 11 entries confirmed not-a-real-SWSE-feat (or, for Delay Damage, a class feature) by `docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json`, which records explicit user confirmation. Verified before removal that no other catalog entry's prerequisite text references any of the 11.

## 5. Prerequisite architecture — what actually runs

The intended contract documented in `AbilityEngine.js`'s own header comment is:

```
AbilityEngine → PrerequisiteChecker / PrerequisiteEvaluator → ActorPrerequisiteSnapshot + PrerequisiteNormalizer
```

**This is aspirational, not the live call graph.** Verified by tracing every file and grepping every call site in the repository:

- `AbilityEngine.evaluateAcquisition(actor, candidate, pending)` (`scripts/engine/abilities/AbilityEngine.js:192`) is the real, live, public "may I acquire?" door. A repo-wide grep found ~30 real call sites — chargen/level-up steps (`feat-step.js`, `talent-step.js`, `force-power-step.js`, etc.), `MutationCoordinator`, `global-validator.js`, `finalization-prerequisite-validator.js`, `PrerequisiteIntegrityChecker`, `preflight-validator.js`, and more. **Every call site found routes through `AbilityEngine`; none call `PrerequisiteChecker` directly from UI/progression code.**
- `AbilityEngine` delegates to **`scripts/data/prerequisite-checker.js`** (`PrerequisiteChecker.checkFeatPrerequisites` / `checkTalentPrerequisites` / `checkClassLevelPrerequisites` / `checkPrestigeClassPrerequisites`). This file is large (~3950 lines) and **self-contained**: its own legacy-string parser (`_parseLegacyPrerequisites`, `_parseLegacyPrerequisitePart`, `_checkLegacyCondition`) and its own structured-condition dispatcher (`_checkStructuredCondition`, 25+ condition types) do the actual evaluation. It pulls canonical prerequisite **text** (not a pre-parsed structure) from `FEAT_PREREQUISITE_AUTHORITY` via `prerequisite-text-helpers.js`, and re-parses that text itself.
- The three `scripts/engine/progression/prerequisites/*` modules named in the architecture diagram — `prerequisite-normalizer.js`, `prerequisite-evaluator.js`, `actor-prerequisite-snapshot.js` — are a **separate, parallel pipeline that is not wired into the live legality path**:
  - `prerequisite-normalizer.js`'s only consumer is the standalone dev tool `prerequisite-identity-audit.js`.
  - `prerequisite-evaluator.js` has **zero consumers anywhere in the repository**.
  - `actor-prerequisite-snapshot.js`'s only consumer outside itself is `skills-step.js`, for an unrelated display purpose.
  - `prerequisite-checker.js` does **not** import any of the three.

**This means:** the diagram in `AbilityEngine.js`'s header comment describes a Phase 1/2/3 pipeline that was built but never migrated into the load-bearing path. `prerequisite-checker.js`'s own legacy/structured parser is the actual runtime authority. This audit does not attempt to migrate or redesign that — per this task's explicit brief, the existing architecture is reused and protected as-is, and this finding is reported so future work does not mistakenly treat `prerequisite-normalizer.js`/`prerequisite-evaluator.js` output as proof of live legality behavior (see `docs/audits/generated/feat-prerequisite-input-report.md`, which documents this same caveat for every finding it reports).
- `FEAT_PREREQUISITE_AUTHORITY` (`scripts/data/authority/feat-prerequisite-authority.js`) is a plain object keyed by a normalized slug, each entry `{ name, prerequisite: "<display text>", benefit, description, ...scoped/Force flags }` — canonical **text**, not a structured/parseable expression tree. `prerequisite-checker.js` treats this authority text as the source of truth **ahead of** the catalog document's own `system.prerequisite` field whenever both exist (`checkFeatPrerequisites` calls `_getCanonicalPrerequisiteText` first). This means: for any feat with an authority entry, the catalog's own prerequisite text is effectively **display-only**; the authority text is what actually gates acquisition.
- `scripts/dev/prerequisite-identity-audit.js` and `scripts/dev/prerequisite-authority-audit.js` are both explicitly documented as standalone, manual-only tools ("never imported into live startup paths" / "Do NOT import this into live startup paths") with no CLI entrypoint and no existing CI wiring. `scripts/governance/integrity/prerequisite-integrity-checker.js` is different — it **is** wired into the live runtime mutation pipeline (via `ActorEngine`, `sovereignty-enforcement.js`, `world-integrity-sweep.js`, `actor-repair-engine.js`), calling `AbilityEngine.evaluateAcquisition` after actor mutations, but it runs post-mutation at runtime, not as a CI/test gate.
- **Before this task, zero tests in this repository exercised `AbilityEngine` or `evaluateAcquisition`** (confirmed by a repo-wide grep of `tests/`). See `tests/ability-engine-acquisition.test.mjs`, added by this task (Phase 8).

## 6. Existing audits inspected

- `docs/audits/feat-source-parity-phase-*.md` / `data/feat-source-parity/*-manifest.json`: per-sourcebook name-presence checks. Confirmed (§ "Weapon Focus" family) that at least one manifest family entry checks only for "at least one document whose key starts with this family name" rather than enumerating every named tier — this is how the 12 talent-domain contaminant names (which *did* satisfy "a document exists matching the Weapon Focus family") were never flagged as missing by that audit even while genuinely absent. Not fixed in this task (would require redesigning the family-matching logic across every manifest, out of the stated scope); flagged here as a known limitation.
- `docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json`: the authoritative record of 11 confirmed-invalid feat/non-feat names, with explicit user confirmation recorded in its own `inputs.manualAdjudication` field. Used as-is (not re-litigated) as the basis for §4's 401 → 390 removal.
- `scripts/dev/prerequisite-authority-audit.js`'s `AUTHORITY_BOUNDARY_STATE`: a **hand-maintained static ledger** (10 entries: 6 canonical, 2 advisory, 2 deferred), not a live scanner. It catches regression in already-known categories; it cannot discover a brand-new bypass nobody added an entry for. Now wired into `tests/prerequisite-authority-boundary-regression.test.mjs` (Phase 9) so at least the known-category regression check runs automatically.
- `tools/check-feature-implementation-coverage.mjs` and the various `scripts/dev/audit-*-feat-*.mjs` per-sourcebook readiness generators were inspected; one (`audit-core-rulebook-feat-implementation-readiness.mjs`) was extended this task (Phase 6/11) to consume `data/feat-validity-registry.json` and exclude invalid entries, and to self-identify with a generation timestamp and git commit. The others were left as-is — see `docs/audits/generated/feat-inventory-report.md`'s "stale references" section for which of them still mention now-invalid names, as a scoped-out follow-up list rather than a blanket rewrite.

## 7. Summary of hard integrity findings at HEAD (after this task's changes)

- Canonical catalog: non-empty (390), zero duplicate ids/names, zero non-feat records.
- Pack: non-empty (390), exact ID and content parity with the catalog.
- Known-invalid entries: zero present in the canonical catalog/pack.
- `tools/verify-feats-pack-source.mjs` and `tools/audit-feat-inventory.mjs --strict` both hard-fail on regression of any of the above (see `tests/feat-catalog-validity-regression.test.mjs` for the automated version).
- Prerequisite authority boundary: no bypass found (30-site live grep, all through `AbilityEngine`); the hand-maintained ledger reports 0 regression against its documented allowance.
- Prerequisite identity audit (existing tool, run for real against current data): 0 errors, 0 warnings, 82 info-level (all legitimate advisory/table-state clauses, e.g. prestige-class organization membership).

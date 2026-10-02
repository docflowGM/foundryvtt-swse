# Phase 12-1 — Execution closeout (orphan semantic tags)

This closes **Phase 12-1 only**: the owner-certified semantic tags for the 311-talent orphan census. **Phase 12-2 (the 876 already-tagged talents) has NOT been executed, and Phase 12 as a whole is not complete.**

## Provenance

- Starting point: `origin/main` at `02a239e47ff3ade20d0a16ca07dd75d46ffa0250` (Phase 11-2D merged). Working tree was clean; the execution branch was cut fresh from that commit.
- Execution branch: `audit/talent-phase-12-semantic-tags` (not merged to `main`).
- Final semantic authority (QA3 plus the 11-record global-QA reconciliation, frozen):
  - `data/audits/talent-phase-12-1-semantic-tag-authority.json` (machine)
  - `docs/audits/talent-phase-12-1-semantic-tag-authority.md` (human)
  - Execution metadata was set to `FINAL_FOR_EXECUTION`, `ownerAuthorized: true`, `executionEnabled: true`, `finalSemanticPayload: "QA3"`, with an `executionAuthorization` record. No `auditKey`, `canonicalId`, `finalTags`, `rationale`, `sourceAuthority`, QA result or deferred decision was changed.
- QA history: QA2 re-reviewed the 86 KOTOR–Starships talents (48 arrays revised, 38 retained); QA3 re-reviewed the 225 Unknown Regions–Core Rulebook talents (35 revised, 188 retained). Cumulative: 311 / 311 reviewed, **83 arrays revised, 226 retained**, 0 new vocabulary strings.

### How the authority files reached the repository

The QA3 files were delivered inline in the instruction (they were not attached as files), and the JSON paste was cut off at its very end (the closing braces of `qualitySweep.sourceEscalations` were missing). The repository JSON was reconstructed from the pasted text and the missing closing braces were restored. Because that is a transcription, it was cross-validated before any pack write:

1. an independently typed copy of the Markdown agrees with the JSON on **311 / 311** entries for name, canonical ID, page, final tags and rationale (0 mismatches);
2. all **311** canonical IDs resolve exactly once in `packs/talents.db`, and name, `system.source` and `system.page` match the authority for every one;
3. all 35 QA3 "added / removed" revision statements agree with the final arrays (0 conflicts), and the 83 revised keys / 48 `REVIEWED_REVISED` counts match;
4. every final tag belongs to the 184-string vocabulary read from the pack.

Rationale strings are preserved verbatim, including the character-encoding damage (mojibake, e.g. "location’s" rendered as `â` + two control characters) that appears in a few JATM rationales in the supplied JSON. It is cosmetic, lives only in `rationale`, and does not affect any tag.

## Global-QA reconciliation (second commit)

After the first commit, the owner supplied the global consistency sweep (QA-1 to QA-5, report plus authority files). Its Phase 12-1 delta differs from the applied QA3 arrays on exactly **11** talents; at the owner's instruction it was applied as a second commit on this PR. The manifest, dry-run report and pack were regenerated from the Phase 11-2C pre-state through the same tool (one certified `POST_12_1` state, no second ledger), so the final pack equals QA3 + this delta. The 11-record delta is stored as `globalQaReconciliation` in the authority JSON (QA3 tags, final tags, added/removed, reason) and in the Markdown authority.

| Talent | Change |
|---|---|
| UR-044 Turn the Tide | + `reliability` |
| GAW-041 Stava Expertise | + `reliability` |
| JATM-027 Fluidity | + `reliability` |
| TFU-007 Computer Language | + `reroll`, `reliability` |
| CORE-013 Devastating Attack | + `melee`, `ranged`, `targeting`; − `precision` |
| CORE-015 Charm Beast | + `manipulation`, `control`; − `nature` |
| CORE-023 Notorious | − `mind-affecting` |
| CORE-027 Shift Defense II | + `setup`; − `resilience`, `survivability` |
| CORE-028 Shift Defense III | + `setup`; − `resilience`, `survivability` |
| KOTOR-001 Weak Point | + `target-designation` |
| KOTOR-017 Past Visions | − `reliability` |

Verified: exactly these 11 pack lines differ from the first commit (0 non-tag changes); all 309 applied arrays equal the QA5 `certifiedAssignments`; the QA5 integrity gates (reroll→reliability, action tags→action_economy, force_point_spend→resource_spend, condition_removal→recovery, use_the_force/force_power_synergy→force, ally_support→support) hold on the 309; 0 new tag strings. The delta file's rationale text for 8 JATM records differs from the first-commit copy (encoding repair only); rationale was left as already recorded. The 13 Phase 12-2 revisions in the same sweep are not applied here.

## Scope of the mutation

| | |
|---|---|
| Canonical talents | 1,187 |
| Phase 12-1 orphan census | 311 |
| Certified and applied | **309** (`system.tags` set to the exact `finalTags` array) |
| Deferred, untouched | **2** — UR-022 Quick Study `fd37b68c6fb620f6`, GOI-002 Done It All `d376f165f1a47281` (`TEMPORARY_TALENT_ACCESS`) |
| Non-orphans (Phase 12-2) | 876 — unchanged |

Targets resolve by canonical `_id` only; name, source and page are stop-guards, never a fallback. Write path: the existing certified line-surgical `serializePack` used by Phases 3C–11-2C (no new talent database or loader). `packs/talents.db` is the only layer that carries talent tags (`data/canonical/talents.json` and the tree registries have no `tags` field, and earlier tag phases never touched them).

## Pre/post census

| | Before | After |
|---|---:|---:|
| Zero-tag canonical talents | 311 | **2** (Quick Study, Done It All) |
| Raw tag strings | 184 | 184 (none new, none lost) |
| Tag instances | 5,228 | 7,576 (+2,348 = sum of the 309 `finalTags` lengths) |
| Records whose line changed in `packs/talents.db` | — | 309 |

The pre-state matched the frozen baseline exactly (`packs/talents.db` blob `6fe0b15020d4c723cb04d506ae8f7c5f4868b33c`), so no repository drift had to be reconciled.

## Acceptance gates (all PASS)

- **A. Target coverage** — 309 / 309 resolve; `system.tags` deep-equals `finalTags` (authored order; no merge, union or sort).
- **B. Deferred safety** — UR-022 and GOI-002 keep their exact pre-state tags (empty).
- **C. Orphan closeout** — 311 − 309 = 2 zero-tag talents, exactly the two deferrals.
- **D. Non-target immutability** — the other 878 records (876 non-orphans + 2 deferred) are unchanged (pre/post keyed by canonical ID).
- **E. Field immutability** — with `system.tags` removed, all 1,187 records are identical; **0 non-tag field changes**.
- **F. Identity** — same 1,187 ids, names and order; no id created, deleted, changed or duplicated.
- **G. Vocabulary** — **0 violations**; no string outside the 184 surviving tags.
- **H. Convergence** — reconciler: 0 blocking findings; state-aware CI gate passes in `POST_12_1_STATE`.

An independent pre/post comparison against `git show HEAD:packs/talents.db` (separate from the applicator's own checks) gave: 309 changed, 0 non-target, 0 non-tag, 309 exact matches, ids and names identical.

## Files

Production data
- `packs/talents.db` — 309 `system.tags` arrays (309 lines).

Authority and certification artifacts (new)
- `data/audits/talent-phase-12-1-semantic-tag-authority.json`, `docs/audits/talent-phase-12-1-semantic-tag-authority.md`
- `data/audits/talent-phase-12-1-cleanup-manifest.json`, `data/audits/talent-phase-12-1-dry-run-report.json`, `docs/audits/talent-phase-12-1-dry-run.md`
- `docs/audits/talent-phase-12-1-execution-closeout.md` (this file)

Tooling and tests
- New: `tools/apply-talent-phase-12-1-tags.mjs` (`--manifest --report --check --status --apply --verify [--exact]`; rejects a non-final authority, any count other than 309/2, duplicate ids/keys, empty or duplicated `finalTags`, deferred-id overlap, unresolved/ambiguous ids, identity mismatch, non-empty pre-tags and out-of-vocabulary tags).
- New: `tests/talent-phase-12-1-semantic-tags.test.mjs` (10 tests, expectations derived from the authority file).
- State plumbing so the certified pack is recognised as a "later certified state": `tools/apply-talent-phase-3c.mjs` (`POST_12_1_STATE`), `tools/check-talent-phase-3c-ci.mjs` (new battery), later-state handling in `apply-talent-phase-11-2a/2b/2c`, `3d`, `3e4`, `3e5`, `3f`, `3g`, `census-talent-tree-identity.mjs`, and the four post-3D tests (`talent-phase-3d-census`, `-3d-review-extras`, `-3d-post-state`, `talent-tree-membership-review-extras`).

## Verification commands

```
node tools/apply-talent-phase-12-1-tags.mjs --manifest --report   # dry-run certified, no pack written
node tools/apply-talent-phase-12-1-tags.mjs --apply
node tools/apply-talent-phase-12-1-tags.mjs --verify --exact
node tools/check-talent-phase-3c-ci.mjs                            # 18 checks, POST_12_1_STATE
node tools/run-rolling-tests.mjs                                   # 289 passed, 0 failed (5 documented exclusions)
node tests/talent-phase-12-1-semantic-tags.test.mjs
node --check <each changed .mjs>; node tools/validate-partials.mjs; node tools/validate-data.js; system.json parse
```

## Finding for follow-up: runtime consumers of `system.tags`

These tags now exist on 309 previously untagged talents, so code that reads `system.tags` can classify them differently. The dry-run probes (real runtime functions) show:

- **Force-talent counting** (`tags.includes('force')`): **64** talents now count as Force talents (e.g. Action Exchange, Attune Armor, Body Control, Charm Beast, Cloak of Shadow, Combustion, Conceal Force Use, Conceal Other).
- **Mystic Mastery / Force-adept regex** over tags: **70** talents now match.
- Droid-acquisition gate, talent-data resolver, item classification, combat-feature classification and the Sith lightsaber-form lookup: **0** changes.
- **Tree identity / tree credit: 0 changes** (it reads structured identity and certified membership, never tags — Phase 11-2C/11-2D).

No consumer was altered. If the 64/70 shift is not intended (for example, if a "Force talent" prerequisite should not count these), that is a separate consumer-side decision.

## Deferred ontology issue

UR-022 Quick Study and GOI-002 Done It All remain `AWAITING_DESIGNER_ADJUDICATION` (`TEMPORARY_TALENT_ACCESS`). No tag was assigned and no new tag was created; they stay the only two untagged canonical talents until an owner ruling authorizes a concept.

## Not done

- Phase 12-2 (the 876 non-orphans) has not started. No tag on a non-target talent was changed.
- The two deferred records were not modified.
- No merge to `main`.

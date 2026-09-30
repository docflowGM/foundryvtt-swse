# Phase 3F — Talent-Tree Identity & Display-Name Normalization: Certification

**PHASE 3F COMPLETE on branch `audit/talent-phase-3f-tree-identity-normalization` — certification pending PR review and merged-`main` re-verification.**
Base: merged `main` @ `dfbddb9cfeadfafd0e965f9732d47875457e097e` (Phase 3E). Structured-prerequisite identity (V2) is **not** started.

## 1. Purpose and result

Normalize talent-tree identity and canonical display names **without changing talent content, tree membership or class eligibility**.
Result: every talent's `system.treeId` is now the persistent tree `_id`; every tree document carries its canonical display name; the runtime identity contract is documented, hardened where it disagreed with the data, and proved against the real runtime modules.

## 2. Units

| Unit | Result | Artifacts |
|---|---|---|
| 3F-0 baseline + identity contract | merged-main gates recorded on `dfbddb9cf` (all green, suite 278/0); persistent-vs-runtime contract derived from the running code | `docs/audits/talent-phase-3f-identity-contract.md` |
| 3F-1 census | 71 stale `system.treeId` values (11 slug families), 12 drift trees (6 case-only, 6 that change the runtime id), every consumer and every `system.treeId` reader classified | `tools/census-talent-tree-identity.mjs`, `data/audits/talent-phase-3f-tree-identity-census.json` |
| 3F-2 runtime hardening | `normalizeTalent()` converts an explicit persistent tree `_id` through `TalentTreeDB.bySourceId()` and returns the runtime id (it previously returned `null` whenever the inverse index did not list the talent — demonstrated on the unhardened code) | `scripts/data/talent-normalizer.js`, `tests/talent-phase-3f-tree-identity.test.mjs` |
| 3F-3 production repair | manifest → dry-run → apply → exact verify | `tools/apply-talent-phase-3f.mjs`, manifest + dry-run report |

## 3. The production change (exact)

* **71 talents:** only `system.treeId`, name slug → the `_id` of the tree that already contains the talent (`jedi-guardian` 16, `lightsaber-forms` 12, `lightsaber-combat` 11, `dark-side-devotee` 6, `beastwarden` / `believer-disciple` / `iron-knight` 5 each, `bando-gora-captain` / `order-of-shasa` 4 each, `jedi-sentinel` 2, `armor-specialist` 1).
* **12 trees:** `name` and the mirrored `system.talent_tree` label → canonical (`First/Second/Third/Fourth/Fifth-Degree Droid`, `Aing-Tii Monk`, `Bothan SpyNet`, `Agent of Ossus`, `Disciple of Twilight`, `Ember of Vahl`, `Master of Intrigue`, `Warden of the Sky`).
* **2 derived registries** regenerated from the packs: exactly 12 entries change, only `id`/`displayName`.
* Commit: `2771780b7` (production), separate from the tooling checkpoints.
* Untouched: talent text/content/source/page/tags/flags/effects, every tree `_id` and member list, classes, actors, homebrew packs, `data/canonical/talents.json` (certified, immutable; its `canonicalTreeKey` already carries the canonical names), derived mirrors.

## 4. Pinned invariants (all machine-enforced in `tools/check-talent-phase-3c-ci.mjs`, state `POST_3F_STATE`)

| Invariant | Enforced by |
|---|---|
| 1,187 canonical talents; 177 canonical trees | 3F verify; reconciler |
| `STALE_TREE_ID_SLUG = 0`, `TREE_DISPLAY_NAME_DRIFT = 0` (now **blocking** reconciler codes, with `WRONG_SOURCE_PAGE`) | reconciler `--check`, 3F verify |
| all 71 changed references point to the `_id` of the tree that already owns the talent | 3F dry-run + verify |
| all 177 tree `_id`s and all talent `_id`s unchanged; talent membership unchanged; tree member lists byte-identical | 3F dry-run + verify; runtime contract test |
| class-to-tree accessibility identical before/after (resolved by sourceId for every class); no class stores a runtime id the rename changes | `tests/talent-phase-3f-tree-identity.test.mjs` |
| same-name tree disambiguation intact (Squad Leader ×2: distinct ids, 1 `sameNameTrees` audit entry, 0 duplicate ids) | runtime contract test (before and after) |
| 50 homebrew talents / 19 homebrew-only trees unchanged and isolated | homebrew audit; 3F untouched-file checks |
| `TEXT_DRIFT = 0`; 1,189 claims → 1,187 identities → 1,187 records | reconciler |
| registry freshness | `build-talent-tree-registry.mjs --check` |

**Permanent regression — Aing-Tii Monk:** under the old name "Aingtii Monk" the `aing-tii-monk` Force-tradition access rule in `tree-authority.js` did **not** resolve the tree (its name normalized to `aingtii-monk`); after the rename it does (runtime id `aing_tii_monk`, matching the rule key). The test asserts both sides, turning a latent naming mismatch into an explicit proof that 3F improved runtime correctness.

## 5. Identity contract (summary; full text in the contract document)

Tree `_id`/`sourceId` = persistent identity. Runtime `tree.id` = in-memory, name-derived, converted only through `TalentTreeDB`. Talent `system.treeId` and class `talentTreeSourceIds` = the `_id`. Display names are labels. The rename changes the runtime id of six trees and of no persistent reference.

## 6. Validation

3F `--verify --exact`; 3E-5 and 3E-4 verifiers in later-state mode; reconciler; registry freshness; membership and homebrew audits; the 3F census in frozen mode; the 3F runtime/identity and normalization tests; the full rolling suite (result recorded in the PR).

## 7. Intentionally not changed / follow-ups

* `data/canonical/talents.json` legacy `tree` label (old spellings) — certified artifact; identity is `canonicalTreeKey`.
* Embedded actor snapshots, homebrew packs, derived mirrors (`talents.fixed.json`).
* **V2:** structured-prerequisite runtime identity (next phase). The 3F contract (production `_id` is persistent; the runtime id is derived) is its prerequisite.
* Optional: the ~36 tolerant `system.treeId` readers could converge on `TalentTreeDB.get()`; no defect found, so left alone.

## 8. Merged-`main` gates (run after merge against the merge SHA)

`node tools/check-talent-phase-3c-ci.mjs` (expect `POST_3F_STATE`, all pass) · `node tools/apply-talent-phase-3f.mjs --verify --exact` · `node tools/reconcile-talent-publication-corpus.mjs --check` · `node tools/run-rolling-tests.mjs`.

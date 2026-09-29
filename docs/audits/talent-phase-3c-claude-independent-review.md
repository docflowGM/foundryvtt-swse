# Phase 3C-1 — Independent Engineering Review

- Branch: `audit/talent-phase-3c-claude-review` (from `main` @ `ba8eab7978d29136965a327ae47fc689e8d3c8bb`, verified as an ancestor of `origin/main`)
- Scope: read-only. No production pack, no Phase 3B manifest, and no primary-implementation file was modified.
- Added: `tools/audit-talent-phase-3c-independent.mjs` (independent reference model + invariant checker), `tests/talent-phase-3c-independent-review.test.mjs`, this document.

## Executive Summary

**The Phase 3C-1 dry-run is correct for the single first application. It is not yet a safe authority for the eventual write, because three things around it are unsolved.**

What I proved (details under *Verified invariants*):

- All 14 committed Phase 3B manifests reproduce byte-for-byte from the shared builder; the global closeout checker and `apply-talent-phase-3c.mjs` pass on `main`.
- I wrote a second, deliberately separate implementation of the certified contract (reads the committed manifest JSON, strictly ID-based, allow-listed fields, shape guards). Its projected talents / trees / classes are **byte-identical, including array order,** to the primary applicator's projected state (1,272 talents / 196 trees / 37 classes).
- Against that projected state, 17 of 18 independent invariants pass, including full serialized deep-equality of all 92 protected records, zero unauthorized leaf changes across 4,430 leaf edits on the 932 existing records, exact 7 tree creates, exact GenoHaradan consolidation, 5 class-access mutations, Charm Beast split, and a **second application that yields a deep-equal state** (order-sensitive).
- The invariant checker demonstrably detects corruption (12 mutation-style tests).

What blocks the write phase (each has a reproduction below):

| # | Sev | Blocker |
|---|---|---|
| B1 | High | The tool chain cannot be re-run after the write. Once packs are repaired, the builder, the closeout checker, the applicator and therefore the CI guard all hard-fail. The "second run = zero diff" requirement cannot be demonstrated by the primary tool. |
| B2 | High | The certified renames create two same-name talents inside one tree (with the protected review extras). The repo's own CI guard `audit-talent-tree-membership.mjs` turns **red** on the projected state. |
| B3 | High (runtime; needs Foundry validation) | The runtime membership authority reads `data/generated/talent-trees.registry.json` (name-keyed, separate from the packs). Phase 3C only writes packs; that registry already lacks 6 of the 7 new trees, still has the split GenoHaradan, and would not list created/moved talents. There is no generator in `tools/`. |
| B4 | Medium (certification) | `data/audits/talent-phase-3c-dry-run-report.json` is not committed, so `apply-talent-phase-3c.mjs --check` fails on `main`; CI never runs `--check`. 3C-1 cannot be called certified while its report gate is absent. |

## Blockers

### B1 — Not re-runnable after the write (idempotence cannot be shown by the primary tool)

- Severity: High (blocks 3C-2, does not affect the current dry-run)
- Files / locations:
  - `tools/apply-talent-phase-3c.mjs:57-61` calls `buildBookManifest(bookKey, {check:true})` for every book; `:69` hard-codes `talentsBefore.length === 1024`; `:140` fails on `generated talent ID collision`.
  - `tools/build-talent-phase-3b-manifest.mjs` — every manifest embeds `generatedAgainst[*].fingerprint` of `packs/talents.db` / `packs/talent_trees.db`, hard-codes expected disposition counts (`unexpected UPDATE_CONTENT count for clone-wars`), and rejects create IDs that already exist (`deterministic create id collides with production`).
  - `tools/check-talent-phase-3b-global-closeout.mjs` calls the same builder in check mode; CI step "Guard — Phase 3C talent dry-run applicator" runs both.
- Affected: every disposition (all 14 manifests).
- Failure mode: after 3C-2 writes the packs, `check-talent-phase-3b-global-closeout.mjs`, `apply-talent-phase-3c.mjs`, and the CI guard all exit non-zero, and the manifests can no longer be rebuilt. The PR that writes the packs is red by construction, and "second run produces zero semantic diff" is unprovable with the tool that owns the write.
- Evidence (scratch copy only; repo untouched): I ran the applicator to get the projected packs, wrote them into a scratch copy of the repo, and re-ran the tools there:

  ```
  apply-talent-phase-3c.mjs   -> Error: [talent-phase-3b] unexpected UPDATE_CONTENT count for clone-wars
  builder --book core --check -> Error: [talent-phase-3b] deterministic create id collides with production: Saga Edition Core Rulebook|Dathomiri Witch|Charm Beast
  global closeout checker     -> Error: [talent-phase-3b] unexpected UPDATE_CONTENT count for clone-wars
  ```

  In contrast the *operation set itself* is idempotent: my reference model re-applied to the projected state gives a deep-equal, order-stable result (invariant "idempotence" passes).
- Recommended fix (smallest): give the write phase an explicit split.
  1. `--apply` (pre-state only): existing dry-run logic + write; refuses to run unless the pack fingerprints equal the manifests' `generatedAgainst` fingerprints.
  2. `--verify` (post-state): no builder calls; assert projected == on-disk using the committed manifests' `targetFields` / `treeMutation` / `createTemplate` (this repo's `tools/audit-talent-phase-3c-independent.mjs` `applyReference(..., {mode:'post'})` + `checkInvariants` is a working prototype).
  3. Re-point the CI guard to `--verify` once packs are written; freeze the builder-check path as the "pre-state" guard on the Phase 3B tag/commit only. Phase 3B manifests must not be regenerated post-write (their fingerprints intentionally describe the pre-write packs).

### B2 — Certified renames collide with protected review extras inside one tree

- Severity: High (turns an existing CI guard red on the projected state; ambiguous name-based resolution at runtime)
- Records:
  | Canonical (renamed) | Before | After | Protected same-name extra | Tree |
  |---|---|---|---|---|
  | `Saga Edition Core Rulebook\|Infamy\|Notorious` (`09744041cdcc9e22`) | `Notorious (Infamy)` | `Notorious` | `a7d8c4da96eacad4` `Notorious` | Infamy `c1be604242cb328f` |
  | `Threats of the Galaxy\|Master of Teräs Käsi\|Teräs Käsi Basics` (`67bddb17ae2770f3`) | `Teras Kasi Basics` | `Teräs Käsi Basics` | `222327492c484b4a` `Teräs Käsi Basics` | Master of Teräs Käsi `ba726f623e42f849` |
- Location: `mutationFields` contains `name`, plus `treeMutation.replaceTalentName` (`Notorious (Infamy)`→`Notorious`, `Teras Kasi Basics`→`Teräs Käsi Basics`) in the Core and Threats manifests; the closeout classifies the extras as `REVIEW_EXTRA_DUPLICATE_CANONICAL_ALIAS` and forbids touching them in 3C.
- Failure mode: two records with the same display name in one tree. `tools/audit-talent-tree-membership.mjs` (CI step "Guard — talent/tree membership") reports `duplicateTalentNamesWithinTree: 2` and **FAIL: 2 hard talent/tree membership issue(s)** on the projected packs; at runtime `resolveTalentReference` / `TalentRegistry.getByName` cannot distinguish them. On `main` today the guard passes because the canonical records carry the un-canonical names.
- Evidence: projected packs in a scratch copy → `node tools/audit-talent-tree-membership.mjs`:
  ```
  duplicateTalentNamesWithinTree: 2
   - c1be604242cb328f::notorious   [09744041cdcc9e22, a7d8c4da96eacad4]
   - ba726f623e42f849::ter-s-k-si-basics [222327492c484b4a, 67bddb17ae2770f3]
  FAIL: 2 hard talent/tree membership issue(s) found.
  ```
  My independent check `projected state has no same-name talent pair inside one tree` fails identically; `tests/talent-phase-3c-independent-review.test.mjs` pins it as the *only* open failing invariant.
- Recommended fix: this is a sequencing decision, not a code bug, so do not resolve it silently. Options: (a) teach `audit-talent-tree-membership.mjs` to exempt the two certified review-extra IDs (read from `talent-phase-3b-global-closeout.json`) until Phase 3D removes them — smallest, keeps 3C's "do not touch protected records" rule; (b) resolve the two extras first in a scoped mini-Phase-3D; (c) defer only these two renames. I recommend (a) with the exemption keyed by ID, not name.

### B3 — Runtime membership authority reads a separate, name-keyed generated registry that Phase 3C does not update

- Severity: High for runtime correctness; requires Foundry runtime validation to quantify the user-visible effect.
- Files: `scripts/engine/progression/talents/talent-tree-membership-authority.js:96-111` (primary `data/generated/talent-trees.registry.json`, fallback `data/fixes/talent-trees.registry.json`), `scripts/engine/progression/talents/TalentTreeRegistry.js:93`, `scripts/data/talent-tree-db.js:231-241` (comment: "generated registry is the audited membership source used by the graph resolver"). No generator for the registry exists in `tools/`.
- Evidence (current `data/generated/talent-trees.registry.json`: 198 trees, 1,123 talent-name entries):
  - contains both `genoharadan` (`Manipulating Strike` only) and `genohardan` (4 talents) as separate trees — the very split the certified consolidation removes from the pack;
  - lacks 6 of the 7 tree creates (Martial Arts Forms, Unarmed Mastery, Skill Challenge, Espionage, Shapers of Kro Var, Zeison Sha Warrior); only `Squad Leader` exists;
  - lists `Skilled Advisor` under both `Jedi` and `Jedi Archivist` (certified move target is `Jedi Consular`); `Unbalance Opponent` (a certified CREATE) is absent; `Charm Beast` appears only under `Beastwarden`;
  - it stores talent *names*, not IDs, so it cannot represent the Core/JATM Charm Beast identity split at all.
- Failure mode: after the packs are repaired, progression/membership resolution that consults the registry still sees the pre-3C tree structure (new talents missing from trees, moved talents in old trees, GenoHaradan split, no class-tree bindings for 6 new trees in `data/generated/class-talent-tree-bindings.json`).
- Not verified: how much of the runtime falls back to pack data instead of the registry (needs a live Foundry check).
- Recommended fix: before 3C-2 decide the downstream contract. Either (a) include a deterministic registry regeneration (from the repaired packs, ID-aware) in the 3C-2 write set with a CI parity check, or (b) explicitly declare the registry as Phase 3D scope and record that 3C-2 leaves runtime tree membership partially stale. Do not leave it implicit — the task brief for 3C lists `data/fixes` / `data/generated` as downstream layers to rebuild.

### B4 — Dry-run report gate is not in place

- Severity: Medium (certification blocker, not a data-corruption risk)
- File: `tools/apply-talent-phase-3c.mjs:278-286` (`--check` requires `data/audits/talent-phase-3c-dry-run-report.json`); `.github/workflows/rolling-system-validation.yml` step "Guard — Phase 3C talent dry-run applicator" only runs the default mode.
- Failure mode: `node tools/apply-talent-phase-3c.mjs --check` exits 1 on `main` ("missing committed dry-run report"); a stale report can never be caught in CI because `--check` is never run.
- Recommended fix: generate and commit the report (`--report`), add `--check` to the CI step. Note the report will need to be regenerated if B2/B3 change the write set. (Report contents are also subject to B1: once packs are written, `--check` cannot run — the report belongs to the pre-write phase and should be frozen at that commit.)

## Non-blocking defects

| # | Sev | Where | Issue | Evidence / fix |
|---|---|---|---|---|
| N1 | Low (latent) | `apply-talent-phase-3c.mjs:40-48` `setPath` | Silently replaces a non-object parent with `{}`. Writing `system.description.value` onto a string description would erase the string and change schema shape. | Unreachable today (0 shape changes on 932 records; builder chooses the key from the existing shape). The reference model refuses (`description shape mismatch`), covered by a test. Add the same guard before 3C-2. |
| N2 | Low (latent) | applicator main loop | No branch on `record.disposition`; unknown values are only caught indirectly by the builder and the `dispositionCounts === closeout.counts` equality. No disposition ↔ ID-kind consistency assertion (CREATE/IDENTITY_SPLIT ⇔ `createRecordId`). | Checked across all 1,180 records: consistent. Add explicit `KNOWN_DISPOSITIONS` + ID-kind assertion (reference model has both, tested). |
| N3 | Low (latent) | `:156-157` | Old-tree name cleanup is by name (`removeValue(names, record.name)`), the identity shortcut the project forbids. | 0 exposures in the 23 CORRECT_TREE moves (no old tree keeps a same-name different member). Model uses an ID-safe rule. |
| N4 | Low | `:177`, `:195-199`, `:141` | Boundary exceptions: `survivorTreePatch` (any path), class `add` (any path), and create templates are applied verbatim, with no allow-list. Verified today: patch touches only name / `talent_tree` / `talentIds` / `talentNames`; class adds touch only the four `talent_tree*` arrays. | Add allow-lists and a "no before-member dropped" check on the consolidation patch (it overwrites `talentIds` wholesale). |
| N5 | Low | CORRECT_TREE records | 9 moved talents keep a stale `tree_<oldTreeId>` tag (e.g. Acute Senses, Jury-Rigger, Long Stride: `tree_dca33c0215264a02`). No `scripts/` consumer of the prefix found. `system.category` / `system.class` denote the class, not the tree, and are correctly untouched. | Report only; fix only if a dev audit relies on the tag. |
| N6 | Low | data shape | 80 existing talents carry legacy slug/other `treeId` values (`jedi-guardian`, a 32-hex id); moved and created talents use 16-hex tree IDs. Created records omit `category`, `class`, `abilityMeta`, `executionModel`, `subType` (all 248). The membership authority accepts several forms; behaviour with slug vs hex is runtime-only. | Runtime check. Not a migration-correctness issue. |
| N7 | Low | text | After apply, 53 canonical fields are not `===` their `targetFields` (37 are `''` vs `undefined` prerequisites; 16 are whitespace-only differences because the builder's `fieldChanges` normalizes whitespace). No semantic difference. | Optional: compare with the builder's normalizer if exact-canon assertions are wanted. |
| N8 | Info | `:17-32` | `MANIFEST_SPECS` paths are never read. | Remove or use. |
| N9 | Info | CI workflow diagnostic loop | On failure the loop runs `build-...-manifest.mjs --book X` **without `--check`**, i.e. it overwrites the committed manifests in the checkout. Harmless on a runner, destructive if copy-pasted locally. | Add `--check` or write to a temp path. |

## Verified invariants

Each was verified by executing code (see *Commands*), not by reading it. "Ref" = `tools/audit-talent-phase-3c-independent.mjs`.

1. **Manifest reproducibility.** `build-talent-phase-3b-manifest.mjs --book X --check` PASS for all 14 books (118, 198, 137, 56, 43, 117, 114, 101, 64, 31, 110, 23, 11, 57 = 1,180 owned identities); `check-talent-phase-3b-global-closeout.mjs` PASS; no stale manifest, no semantic or serialization diff. (The earlier Core stale-check is fixed on `main`.)
2. **Cross-implementation equivalence.** Primary applicator's projected `talents`, `trees`, `classes` are byte-identical (including order) to Ref's (test: "primary applicator projected state == independent reference state").
3. **Counts.** 1,024 → 1,272: 932 existing canonical + 248 generated + 90 deferred + 2 review extras = 1,272; dispositions equal the closeout (727/144/236/38/23/12 = 1,180). All dispositions known.
4. **ID integrity.** 932 production IDs unique and retained; 248 certified create IDs unique, none collides with production or with each other; no production ID assigned to two identities; no certified mutation targets a protected ID. No name-based fallback exists on the primary path (`identityResolution` IDs only); Ref never looks up by name to mutate.
5. **Charm Beast.** JATM `bab9a1ce285f98b9` stays a Beastwarden member (only); Core is a distinct create `c919d7682bd9df40` in Dathomiri Witch (`ad16f3e5f4f7441b`); each is claimed by exactly one, different tree. TXT sources corroborate two separate identities (Core "DATHOMIRI WITCH TALENT TREE" → Charm Beast; JATM "BEASTWARDEN TALENT TREE" → Charm Beast).
6. **Protected 92.** For all 90 + 2 records: full `JSON.stringify` equality before/after, identical tree claims, and their names still present in every claiming tree.
7. **Preservation boundary.** Across 932 existing records, 4,430 leaf changes were diffed; every one is inside that record's certified `mutationFields`. No `system` key removed, no `system` object replaced, `abilityMeta`/`prerequisitesStructured`/`tags`/`executionModel`/`subType`/`costNumeric`/`effects`/`flags`/`img`/`ownership`/`folder`/`sort` untouched. Existing-record edits are per-leaf `setPath`s; no code path rebuilds an existing record from scratch.
8. **Description shape.** 0 of 932 existing records change `description` type (string stays string, object stays object). Manifests choose `system.description` vs `system.description.value` from the record's own shape.
9. **Pseudo-fields.** `_record_create` appears exactly on the 248 create/IDENTITY_SPLIT records and never on existing ones; `system.treeId` appears only on creates and the 23 CORRECT_TREE records; both are skipped by the value-copy loop (`STRUCTURAL_MUTATION_FIELDS`) and `system.treeId` is set from `targetTree.treeId`. No `_record_create` key exists anywhere in the projected talents. Every other `mutationFields` entry is inside the canonical surface (name, benefit, description[.value], summary, prerequisites, source, page).
10. **Tree membership (both directions).** Every one of the 1,180 canonical identities is claimed by exactly one tree — its target — by ID and by display name; `talent.treeId` equals the target for every hex treeId; no duplicate IDs; no dangling IDs; no orphaned talents; no stale names in touched trees (14 renames, 13 via `replaceTalentName`); names equal the names of member IDs. Untouched trees are unchanged.
11. **GenoHaradan.** Survivor `da7b731a3e434a7a` renamed `GenoHaradan` (`talent_tree` too), obsolete `db1b30c2163d0650` removed, members `{58c3d63d94288eb2, 9f01b5c07bbd5f76, 8d14ab116a78dfd6, d6faa4b87d5c35ce}` all in the survivor (1 from the survivor + 3 moved from the obsolete tree), no talent points at the obsolete tree in the pack, no protected record in either tree, Assassin class holds the survivor reference and nothing in `classes.db` references the obsolete ID. (Downstream registry files are not covered — see B3.)
12. **Seven tree creates.** Certified IDs, none collides with production, name and `system.talent_tree` equal the certified display name, member sets equal the closeout `memberTalentIds`, no duplicate member IDs or names, names equal member names.
13. **Five class mutations.** Addressed by certified IDs and names; original arrays preserved as prefixes; each new tree reference present exactly once; the four parallel arrays (`talent_trees`, `talentTreeIds`, `talentTreeSourceIds`, `talentTreeUuids`) stay length-aligned; every other class record is byte-identical; no other class field changed.
14. **Idempotence of the operation set.** Ref applied to the projected state (post mode) returns a deep-equal, order-stable, serialization-identical state: no duplicate tree IDs/members, no repeated class insertions, no recreated records, no repeated rename/consolidation effects, no ID drift. (The *tooling* is not re-runnable — B1.)
15. **Write safety.** The applicator refuses `--write` and leaves the three packs byte-identical (test).
16. **Fail-closed behaviour** of Ref (mirrors what the primary applicator should guarantee): unknown disposition, missing production record, generated-ID collision, certified mutation on a protected ID, JATM-ID reuse for Core Charm Beast, non-canonical mutation field, description-shape clobber, and drift in a certified current field all hard-fail (tests).

## Unverified invariants

- **Runtime effect of B3** — needs a live Foundry v13 check of how membership resolution falls back between the registry and pack data.
- **Runtime tolerance of mixed `treeId` forms** (slug vs 16-hex, N6) and of created records lacking `category`/`class`/automation metadata.
- **Sourcebook fidelity of canonical text** (see next section): no contradiction was proven, but text-level verification against PDFs was not possible.
- **Applicator behaviour under unreachable inputs** (e.g. a hand-edited manifest): the builder's byte-exact `--check` fires first, so the applicator's own guards for these cases are untestable through the CLI. Ref's guards are tested; the primary's are not (N1–N4).
- **`tree_<id>` tag consumers** outside `scripts/` and `tools/` (N5), e.g. macros.

## Test gaps

Covered now by `tests/talent-phase-3c-independent-review.test.mjs` (19 checks, ~2 s, read-only, runs under `tools/run-rolling-tests.mjs`): Charm Beast split and merge attempt, protected 92 deep-equality, tree-rename/`talentNames` staleness, CORRECT_TREE membership, generated-ID collision, missing production record, unknown disposition, protected-target refusal, class-array idempotence, consolidation leftover, pseudo-field/non-canonical field refusal, description-shape clobber, drift, primary-vs-reference equivalence, second-run zero diff.

Still missing before production writes:

1. A test that exercises the **primary applicator's own** guards with injected manifests — the applicator has no exported function; refactor into `applyPhase3C(inputs, {mode})` so unknown-disposition / collision / missing-record / shape-clobber / protected-mutation tests target the real code (today they target Ref).
2. A **post-write verify mode** test and CI wiring (B1).
3. A test for the **downstream registry/bindings parity** with the repaired packs (B3).
4. A CI step running `apply-talent-phase-3c.mjs --check` (B4).
5. A guard that the membership audit tolerates exactly the certified review-extra IDs (B2), and nothing else.
6. A "no before-member dropped by `survivorTreePatch`" invariant in the applicator (N4).

## Source contradictions

**None proven.** I did not change or challenge Phase 3B. Observations from an automated screen of every `targetFields['system.benefit']` against the TXT files (five-word n-gram coverage; a low score means "not verbatim", not "wrong"):

| Book | n | ≥ 80% coverage | < 50% |
|---|---|---|---|
| Force Unleashed, Galaxy of Intrigue, JATM, KOTOR, Starships | 137 / 43 / 117 / 114 / 23 | all | 0 |
| Legacy Era, Rebellion Era, Scavenger's | 101 / 64 / 31 | 99 / 61 / 30 | 0 |
| Galaxy at War | 56 | 44 | 1 |
| Clone Wars | 118 | 74 | 4 |
| Core Rulebook | 198 | 95 | 27 |
| Unknown Regions | 57 | 27 | 4 |
| Threats of the Galaxy | 11 | 1 | 5 |
| **Scum and Villainy** | 110 | **0** | **110 — OCR unusable** |

- **Wording is normalized, not verbatim** in several books (Core Charm Beast: source "You **may** make…", manifest "You **can** make…"; Clone Wars Phalanx: source "**Whenever** you provide soft cover…", manifest "**If** you provide soft cover…"; Core Severing Strike: source "equal to or greater than", manifest "equals or exceeds"). Semantic equivalence held in every sample I read (Severing Strike, Phalanx, Blind Shot, Charm Beast, Force Recovery), so I treat these as the intended Phase 2 canonicalization, not contradictions. Whether canonical text should be verbatim is a Phase 2/3B policy question.
- **Threats of the Galaxy TXT does not contain the Master of Teräs Käsi talent-tree text.** Galaxy at War's TXT confirms "the Master of Teras Kasi talent tree on page 53 of Threats of the Galaxy", yet the Threats TXT has only an NPC stat block for that page area (coverage 0–5% for all 5 talents). The five Threats records (`system.page` 53) therefore cannot be checked against the TXT; the PDF is required. These are talents in the same tree as protected extra `222327492c484b4a`.
- **Scum and Villainy TXT is garbled** (e.g. the GenoHaradan heading is present at line 1815 but body text is noise), so none of its 110 records, including the GenoHaradan consolidation members, can be text-checked; the PDF is required.
- Core's remaining low-coverage rows (27) are paraphrase-level (Deflect, Force Talisman, Attract Minion, Greater Weapon Specialization, etc.); spot checks matched semantically. A per-record PDF pass would be the only way to close this.

## Recommendation for next Phase 3C action

Do not run a pack write yet. In this order:

1. **Decide B2 and B3 scope explicitly** (ideally as a short note appended to the Phase 3 plan): (B2) exempt the two review-extra IDs in `audit-talent-tree-membership.mjs`, keyed by ID from the closeout; (B3) either add a deterministic, ID-aware regeneration of `data/generated/talent-trees.registry.json` (+ `data/fixes` fallback, `class-talent-tree-bindings.json` for the 7 new trees) with a parity check to the 3C-2 write set, or record it as Phase 3D and accept partially stale runtime membership.
2. **Refactor the applicator to an exported pure function** `applyPhase3C(inputs, {mode})` with `--apply` (pre-state, fingerprint-gated), `--verify` (post-state, no builder calls) and `--report/--check`; fold in the guards from N1–N4 (allow-listed fields, shape guard, disposition/ID-kind assertion, ID-safe name cleanup, no-dropped-members on the consolidation patch, allow-listed class/patch paths). `tools/audit-talent-phase-3c-independent.mjs` is a working prototype of the post-mode logic and of every invariant; reuse it rather than writing a third model (buffalo rule), then retire whichever copy is redundant.
3. **Commit the dry-run report and add `--check` (B4)**, and re-point CI: pre-write guard = builder/closeout/`--check`; post-write guard = `--verify`.
4. **Wire the independent invariants into CI** (this test file already does) and tighten `talent-phase-3c-independent-review.test.mjs` to an empty expected-failure list once B2 is resolved.
5. Only then perform 3C-2: run `--apply` once, run `--verify` twice (second run is the zero-diff proof), run the membership audit and the 92-record deep-equality against the committed pre-write packs.
6. In parallel, schedule a PDF spot verification of the sources the TXT cannot check (Scum and Villainy, Threats p.53), and a short Foundry runtime pass for N6 / B3.

## Commands executed

```
git fetch origin main && git merge-base --is-ancestor ba8eab7 origin/main            # true
for b in <14 books>: node tools/build-talent-phase-3b-manifest.mjs --book $b --check   # 14/14 PASS
node tools/check-talent-phase-3b-global-closeout.mjs                                   # PASS
node tools/apply-talent-phase-3c.mjs                                                   # PASS (no packs written)
node tools/apply-talent-phase-3c.mjs --check                                           # FAIL: missing committed dry-run report (B4)
node tools/audit-talent-phase-3c-independent.mjs                                       # 17 PASS / 1 FAIL (B2), idempotence PASS
node tests/talent-phase-3c-independent-review.test.mjs                                 # 19 checks pass
node tools/run-rolling-syntax-check.mjs                                                # 2,569 files pass node --check
node tools/audit-talent-tree-membership.mjs                                            # PASS on current packs; FAIL on projected packs (scratch copy)
scratch copy with projected packs: apply / builder --book core --check / closeout      # all FAIL (B1)
```

Files changed on this branch: `docs/audits/talent-phase-3c-claude-independent-review.md`, `tools/audit-talent-phase-3c-independent.mjs`, `tests/talent-phase-3c-independent-review.test.mjs`. No pack, no Phase 3B manifest, and no file of the primary implementation was modified.

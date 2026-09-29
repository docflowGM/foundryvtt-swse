# Phase 3C — Blocker Resolution and Migration-Tooling Certification

Branch: `audit/talent-phase-3c-blocker-resolution` (from `audit/talent-phase-3c-claude-review` @ `39f14cd`).
Scope: migration **tooling**. No production pack is modified or committed on this branch (`packs/talents.db`,
`packs/talent_trees.db`, `packs/classes.db` are byte-identical to `main`). No Phase 3B manifest or closeout was modified.

## Status

| Blocker | Result |
|---|---|
| B1 re-runnability | **Resolved.** `--apply` (pre-state only) and `--verify` (post-state only) are separate paths. |
| B2 review-extra twins | **Resolved.** ID-specific, closeout-derived, pair-only exemption in the membership audit. |
| B3 runtime registry | **Resolved.** Deterministic generator + ID/sourceId-aware runtime lookups. |
| B4 dry-run report | **Resolved.** Committed; CI validates freshness. |
| setPath / name-only cleanup | **Resolved.** Fail-closed `setPath`; ID-based tree cleanup. |

**The tooling is ready. The production application is NOT ready** — see "Findings that block the production
checkpoint". Three new findings surfaced while proving the flow; two need a decision from project authority and one
needs a PDF check. `--apply` refuses to write until the Phase 3B text is repaired.

## Architecture

```
PRE-STATE  (packs == Phase 3B certified blobs)          POST-STATE (packs == committed report's projection)
  apply --report   write the dry-run report               apply --verify [--exact]   prove the state; rerunnable
  apply --check    report is current                      build-talent-tree-registry --check
  apply --apply    the only writer                        (Phase 3B builder / closeout checker are NOT used)
  apply            dry run (prints the report)
```

* `tools/apply-talent-phase-3c.mjs` exports pure functions (`projectPhase3C`, `verifyPostState`, `verifyRegistry`,
  `detectPackState`, `setPath`, `detachFromTree`, `attachToTree`, ...) and a CLI. State is detected from git-blob SHAs:
  pre-state = closeout `productionTalentBlobSha` / `productionTreeBlobSha`; post-state = the committed report's
  `postState`.
* `--apply` order: refuse unless PRE_STATE → refuse on OCR-artifact text (see F3) → committed report must equal a fresh
  projection → the Phase 3B global closeout checker (which re-derives all 14 manifests) must pass → the projected state
  (packs **and** registry) is verified with the same verifier used post-state → only then are the 3 packs and the 2
  registry files written. Packs keep untouched records byte-for-byte; only changed/new records are re-serialized.
* `--verify` uses only the committed manifests, the closeout and the committed report's fingerprints: 932 preserved-surface
  fingerprints, 92 protected-record fingerprints, 18 untouched-tree fingerprints, 37 class fingerprints (class records
  are compared after removing the certified additions). It never invokes the builder and never creates records.
  `--exact` additionally requires the certified pack and registry blob SHAs.
* `tools/check-talent-phase-3c-ci.mjs` is the read-only, state-aware CI gate (never runs `--apply`).

### Blocker disposition

* **B1.** Before: after a write, builder/closeout/applicator failed with `unexpected UPDATE_CONTENT count` and a
  create-ID collision. Now: on the migrated state `--apply` fails with
  `already applied: ... use --verify (pre-state fingerprint mismatch)` *before* any builder or collision logic runs, and
  `--verify` passes repeatedly. Proven by `tests/talent-phase-3c-migration-flow.test.mjs` (scratch copy: `--report`,
  `--check`, `--apply` → `--verify --exact` → `--verify` → `--apply` refused → `--check` refused → corrupted protected
  record fails `--verify` → repo packs untouched).
* **B2.** `tools/audit-talent-tree-membership.mjs` applies the exemption *after* the raw `duplicateTalentNamesWithinTree`
  check (that source line is pinned by `talent-membership-and-pack-completion`). IDs are read from
  `talent-phase-3b-global-closeout.json` `reviewExtras`; a group is tolerated only if it has exactly 2 members, exactly one
  is a review-extra ID, and the group's tree is one the closeout records for that extra. Output shows
  `allowedProtectedReviewExtraDuplicateNames: 2` and `duplicateTalentNamesWithinTree: 0`. Duplicate IDs, missing members,
  unclaimed talents, third same-name talents, a shifted tree and a missing closeout all still fail
  (`tests/talent-tree-membership-review-extras.test.mjs`).
* **B3.** See "Runtime registry". `tools/build-talent-tree-registry.mjs` + runtime edits + 3 test files.
* **B4.** `data/audits/talent-phase-3c-dry-run-report.json` committed; `--check` (invoked by the CI gate) fails if stale.
* **setPath.** Refuses to replace a string/array/null/number parent or overwrite an object with a scalar; missing parents are
  still created. Description shape still follows each record's certified target path.
* **Name-only cleanup.** `detachFromTree`/`attachToTree` are keyed by talent ID; the display-name array is edited only for the
  certified old/new name of that talent and only when no remaining member carries it. CORRECT_TREE refuses to remove a talent
  the old tree does not claim. Same-name regression: `tests/talent-phase-3c-applicator.test.mjs` (Charm Beast shape).

Additional applicator hardening: disposition ↔ ID-kind assertion, mutation-field and class/consolidation patch
allow-lists, class additions that already exist are "already applied" (not silently de-duplicated), the consolidation patch
cannot drop a member.

## Runtime registry (B3)

Investigation (`data/generated/talent-trees.registry.json`, byte-identical fallback `data/fixes/...`):

* Consumers: `TalentTreeDB._loadTalentTreeMembershipRegistry/_applyMembershipRegistryHints` (overwrites `talentNames` /
  `talentCount` on each tree), `TalentTreeMembershipAuthority.loadRegistry/tryRegistryLookup/getTalentMembership`,
  `TalentTreeRegistry`, and the armor-specialist fetch filter in `runtime-bugfix-hotfixes.js`. Runtime uses `id`,
  `displayName`, `talents` (names) and `talentCount`.
* It was **not** derived from the packs: 21 of 189 matching entries already differed from the pack, it had 8 hand-made
  aggregate aliases (`soldier` 33 talents, `jedi` 25, `officer`, `scoundrel`, ...), and no generator existed
  (`migrate-orphaned-talents.js` references a builder file that does not exist).
* Generator rules: one entry per pack tree — `id` (name slug; `slug-<sourceId>` when two trees share a name), `displayName`,
  `talentCount`, `talents`, plus additive `talentIds`, `sourceId`, `classAccess`. Entries **without** `sourceId` are legacy
  aliases and pass through verbatim, except aliases superseded by a pack tree of the same name or by the certified obsolete
  GenoHaradan fragment (`genohardan`). Generated entries are never carried over, so trees removed from the packs disappear.
  Output is sorted, independent of input order, and idempotent.
* Runtime changes (all backward compatible; no behaviour change unless an entry has `sourceId`/`talentIds`, or two trees share
  a name): registry keys include `sourceId` and it is tried first; registry membership resolves `talentIds` when present;
  `getTalentMembership` drops talents that claim a *different* tree by 16-hex `_id` (name fallbacks attached the Core Charm
  Beast to Beastwarden before this); the armor-specialist filter also filters `talentIds`; `TalentTreeDB` gives a
  later same-name tree a sourceId-suffixed id/key instead of overwriting the earlier one; `TalentTreeRegistry` does the same
  for its name-keyed graph map.
* Proven by `tests/talent-tree-registry-runtime.test.mjs` (real `TalentTreeDB` + `TalentTreeMembershipAuthority` +
  `TalentRegistry` on the projected state via the foundry shim) and `tests/talent-tree-registry-generator.test.mjs`.

Not regenerated on purpose: `data/generated/class-talent-tree-bindings.json` and `data/talent_tree_class_map.json`. Neither
has a runtime consumer (only tests read the class map), and the binding generator cannot reproduce the committed file from
the current packs (it maps class tree *names*, while `classes.db` now holds IDs). Class access for the runtime registry is
carried by `classAccess` instead.

## Findings that block the production checkpoint

### F1 — Same-name trees collide in the runtime (fixed here, needs Foundry validation)

Phase 3B certifies a second tree named **Squad Leader** (Galaxy at War) next to the existing Clone Wars one. `TalentTreeDB`
derives ids from names, so before this branch's edit its load audit reported
`duplicateIds: squad_leader`, overwrote the earlier tree, and the `squad_leader` class slug resolved to one tree for both
Soldier and Elite Trooper. The fix keeps the established Clone Wars tree on `squad_leader` and suffixes the new one with its
`sourceId`. Class records still carry the certified slug `squad_leader` (unchanged, per the manifest) — so slug-based class
lookups resolve to the Clone Wars tree and only `sourceId`/uuid lookups reach the Galaxy at War tree. **Decision needed:** is
that acceptable, or should the Galaxy at War tree's class slug be disambiguated (a Phase 3B change)? Runtime-only.

### F2 — OCR artifacts in certified Phase 3B target text (blocker; `--apply` refuses)

`node tools/audit-talent-phase-3c-text-quality.mjs` finds signatures that are never legitimate rules text in **54 fields of
27 records**, all of which Phase 3C would newly write (the current production value is clean): curly braces 16, HTML `<p>` 14,
gibberish 12 (e.g. `Greater Dark Side Talisman`: "nS eaVued HL dO VSME ...", `Krath: Dark Side Manipulation`,
`Jal Shey: Force Delay`, `Jedi Shadow: Taint of the Dark Side`, `Alter: Suppress Force`, `Weapon Specialist: Disarming
Attack`), pipes 10 (`Impel Ally I/II` prerequisite `|mpel Ally |`, `Krath Illusions` prerequisite `||lusion`), backslash 4,
tilde 2. The sourcebook TXT proves the origin: `reference/sourcebooks/Knights of the Old Republic Campaign Guide_djvu.txt`
literally reads `Prerequisite: ||lusion.` These are OCR errors that were copied into the Phase 2 content and certified.
Phase 3C must not silently fix certified text and I did not touch it. **Decision needed:** repair the Phase 2 content (from the
PDFs), rebuild the affected manifests, and re-certify Phase 3B — the report status is
`DRY_RUN_BLOCKED_PHASE3B_TEXT_DEFECTS` until then. `--apply --allow-ocr-artifacts` exists for scratch validation only.

### F3 — Curated hydration tests pin pre-Phase-3B values in 15 records

On a migrated scratch copy three existing tests fail on records that Phase 3B rewrites:

* `krath-talent-tree-hydration`: `Krath Illusions` prerequisite `Illusion` → `||lusion` (F2; the test is right).
* `superior-skills-talent-hydration`: `Skill Confidence` prerequisite `Critical Skill Success` →
  `Critical Skill Success, trained in the chosen skill`. The Galaxy of Intrigue TXT confirms the manifest; the test is stale.
* `elite-droid-talent-tree-hydration`: the four Elite Droid talents' page `28` → `29`. The TXT has no page markers, so this
  cannot be settled here (printed vs PDF page numbering is the likely cause). **Needs a PDF check.**

The tests must be updated deliberately in the application checkpoint (after F2 is repaired); they are correct as-is today.

## Verification performed

See the final report in the session; every check below was run on the final branch head:
Phase 3B closeout, independent audit 18/18, dry-run `--check`, registry generator tests, membership audit on the current and the
projected state, focused regression tests, and the full rolling suite on the repo and on a migrated scratch copy.

## Next action

Not the production write yet. In order: (1) decide F2 and repair the Phase 3B text; (2) decide F1; (3) PDF-check the Elite Droid
page; (4) then, on a dedicated checkpoint branch: `node tools/apply-talent-phase-3c.mjs --report --check --apply`, update the three
pinned hydration tests deliberately, run `--verify --exact` twice and the full suite, and commit the migrated packs + registry.

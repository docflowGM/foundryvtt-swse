# D-005 T2 — Implementation plan: PUBLISHED_FACTS records and registry-correction addendum

**Status: PLAN — approved at the design level by the project owner (2026-10-16); implementation awaits a separately authorized execution step. Documentation only.** Prepared under the project owner's T2 decisions (immutable v1.5 preserved; `PUBLISHED_FACTS` for the 35 `hostPrerequisites` components; unknown stacking left `UNVERIFIED`/`null`). It adds no records, edits no data, changes no tests and lifts no blocker. The rules are the owner's decisions; this plan only describes how to implement them.
**Date:** 2026-10-16. **Baseline:** `main` `6ecbed3efcb020ce2b23963c2f207014ca32cfad`; the simulation below used the #1052 head `edb0a62a73241ac1de958fac5989c8022155058e` as the expected base.
**Companion:** `docs/audits/modification-registry-v1.5-correction-addendum-d005.md`.
**Depends on (research input):** `docs/audits/d-005-universal-upgrade-host-text-transcription.md` (PR #1054).

## 1. Decisions applied (owner)

| # | Decision | Plan consequence |
|---|---|---|
| 1 | Registry v1.5 stays immutable; no v1.6 in T2; corrections go in a versioned documentation addendum only | Addendum is audit evidence, not an override. No generator/loader patching. |
| 2 | Use `PUBLISHED_FACTS` for the 35 `hostPrerequisites` components | 35 new specification records, one per existing typed ID, in the existing schema. |
| 3 | Keep `stackingPolicy: UNVERIFIED`, `maxPerHost: null`; state stacking facts in record behavior | No enum or runtime change; two printed exceptions stated in behavior text. |

## 2. Exact future record set (not added)

35 records, one per existing D-005 typed ID, no new parents or typed definitions. All use: `component: "hostPrerequisites"`, `basis: "PUBLISHED_UNAMBIGUOUS"`, `verification: "SOURCE_VERIFIED"`, `coverage: "PUBLISHED_FACTS"`, `publication.bookId: "scum-and-villainy"`, `publication.title: "Scum and Villainy"`.

Per-record fields: `specId` follows the existing `D001::<typedId>` convention as `D005::<typedId>`; `publication.printedPage` is the entry's description page; `tableOrSection` names Table 2-3 (printed p. 40) and the entry; `evidence` cites the PDF hash, pp. 40–42 and the transcription document entry number; `behavior` carries the host finding, functional prerequisites, conditional effects, stacking fact and the typed-domain verdict; `authoredBy` follows the D-001 records' wording.

| # | Typed ID | specId | printedPage | Verdict | Condition |
|---|---|---|---|---|---|
| 1 | `sv-cheater::equipment` | `D005::sv-cheater::equipment` | 40 | SUPPORTED | for a suitable functional host |
| 2 | `sv-cloaked::weapon` | `D005::sv-cloaked::weapon` | 40 | SUPPORTED | — |
| 3 | `sv-cloaked::armor` | `D005::sv-cloaked::armor` | 40 | SUPPORTED | — |
| 4 | `sv-cloaked::equipment` | `D005::sv-cloaked::equipment` | 40 | SUPPORTED | — |
| 5 | `sv-dual-gear::equipment` | `D005::sv-dual-gear::equipment` | 41 | SUPPORTED | subject to the printed size restriction |
| 6 | `sv-electrograpple-handle::weapon` | `D005::sv-electrograpple-handle::weapon` | 41 | SUPPORTED | — |
| 7 | `sv-electrograpple-handle::equipment` | `D005::sv-electrograpple-handle::equipment` | 41 | SUPPORTED | — |
| 8 | `sv-environmental-sealing::weapon` | `D005::sv-environmental-sealing::weapon` | 41 | SUPPORTED | — |
| 9 | `sv-environmental-sealing::armor` | `D005::sv-environmental-sealing::armor` | 41 | SUPPORTED | — |
| 10 | `sv-environmental-sealing::equipment` | `D005::sv-environmental-sealing::equipment` | 41 | SUPPORTED | — |
| 11 | `sv-extra-power-source::weapon` | `D005::sv-extra-power-source::weapon` | 41 | CONDITIONALLY SUPPORTED | host must use energy cells or power packs |
| 12 | `sv-extra-power-source::armor` | `D005::sv-extra-power-source::armor` | 41 | CONDITIONALLY SUPPORTED | host must use energy cells or power packs |
| 13 | `sv-extra-power-source::equipment` | `D005::sv-extra-power-source::equipment` | 41 | CONDITIONALLY SUPPORTED | host must use energy cells or power packs |
| 14 | `sv-memory-upgrade::equipment` | `D005::sv-memory-upgrade::equipment` | 41 | CONDITIONALLY SUPPORTED | host needs an Intelligence score and must not be a droid |
| 15 | `sv-memory-upgrade-advanced::equipment` | `D005::sv-memory-upgrade-advanced::equipment` | 41 | CONDITIONALLY SUPPORTED | host needs an Intelligence score and must not be a droid |
| 16 | `sv-miniaturized::weapon` | `D005::sv-miniaturized::weapon` | 41 | SUPPORTED | — |
| 17 | `sv-miniaturized::armor` | `D005::sv-miniaturized::armor` | 41 | SUPPORTED | — |
| 18 | `sv-miniaturized::equipment` | `D005::sv-miniaturized::equipment` | 41 | SUPPORTED | — |
| 19 | `sv-recognition-system::weapon` | `D005::sv-recognition-system::weapon` | 41 | SUPPORTED | at the category level, subject to the item's actual functionality |
| 20 | `sv-recognition-system::armor` | `D005::sv-recognition-system::armor` | 41 | SUPPORTED | at the category level, subject to the item's actual functionality |
| 21 | `sv-recognition-system::equipment` | `D005::sv-recognition-system::equipment` | 41 | SUPPORTED | at the category level, subject to the item's actual functionality |
| 22 | `sv-remote-activation::weapon` | `D005::sv-remote-activation::weapon` | 41 | CONDITIONALLY SUPPORTED | where remote activation has a meaningful target function |
| 23 | `sv-remote-activation::armor` | `D005::sv-remote-activation::armor` | 41 | CONDITIONALLY SUPPORTED | where remote activation has a meaningful target function |
| 24 | `sv-remote-activation::equipment` | `D005::sv-remote-activation::equipment` | 41 | CONDITIONALLY SUPPORTED | where remote activation has a meaningful target function |
| 25 | `sv-secret-compartment::weapon` | `D005::sv-secret-compartment::weapon` | 41 (entry runs to p. 42) | CONDITIONALLY SUPPORTED | subject to the containment requirement |
| 26 | `sv-secret-compartment::armor` | `D005::sv-secret-compartment::armor` | 41 (entry runs to p. 42) | CONDITIONALLY SUPPORTED | subject to the containment requirement |
| 27 | `sv-secret-compartment::equipment` | `D005::sv-secret-compartment::equipment` | 41 (entry runs to p. 42) | CONDITIONALLY SUPPORTED | subject to the containment requirement |
| 28 | `sv-silverplate::weapon` | `D005::sv-silverplate::weapon` | 42 | SUPPORTED | — |
| 29 | `sv-silverplate::armor` | `D005::sv-silverplate::armor` | 42 | SUPPORTED | — |
| 30 | `sv-silverplate::equipment` | `D005::sv-silverplate::equipment` | 42 | SUPPORTED | — |
| 31 | `sv-spring-loaded::weapon` | `D005::sv-spring-loaded::weapon` | 42 | CONDITIONALLY SUPPORTED | host must be one-handed handheld equipment |
| 32 | `sv-spring-loaded::equipment` | `D005::sv-spring-loaded::equipment` | 42 | CONDITIONALLY SUPPORTED | host must be one-handed handheld equipment |
| 33 | `sv-storage-capacity::weapon` | `D005::sv-storage-capacity::weapon` | 42 | CONDITIONALLY SUPPORTED | subject to the size and weight conditions |
| 34 | `sv-storage-capacity::armor` | `D005::sv-storage-capacity::armor` | 42 | CONDITIONALLY SUPPORTED | subject to the size and weight conditions |
| 35 | `sv-storage-capacity::equipment` | `D005::sv-storage-capacity::equipment` | 42 | CONDITIONALLY SUPPORTED | subject to the size and weight conditions |

Totals: 35 records. Stacking facts carried in behavior text:
- Extra Power Source (3 records): behavior states the upgrade is explicitly repeatable, each installation adds another qualifying power supply, no numeric maximum is printed, and upgrade-point limits are separate.
- Memory Upgrade (1 record) and Memory Upgrade, Advanced (1 record): behavior states that advanced benefits replace basic benefits, that basic and advanced benefits do not stack, that this does not establish a universal maximum of one per host, and that no requirement to install the basic version first is printed.
- All other records: stacking, repeatability and maximum per host are `NOT SPECIFIED BY SOURCE`; no default maximum is introduced.

### Representative proposed records (illustrative, not applied)

```json
{
  "specId": "D005::sv-cheater::equipment",
  "typedDefinitionId": "sv-cheater::equipment",
  "component": "hostPrerequisites",
  "basis": "PUBLISHED_UNAMBIGUOUS",
  "publication": {
    "bookId": "scum-and-villainy",
    "title": "Scum and Villainy",
    "printedPage": 40,
    "tableOrSection": "Universal Upgrades: Table 2-3 (printed p. 40); Cheater entry"
  },
  "verification": "SOURCE_VERIFIED",
  "evidence": "Owner's original Scum and Villainy PDF (SHA-256 74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399), printed pp. 40-42, examined by the project rules review; findings transcribed in docs/audits/d-005-universal-upgrade-host-text-transcription.md section 4, entry 01.",
  "behavior": "Published host facts for Cheater (Scum and Villainy, Universal Upgrades, printed p. 40), typed domain equipment. Host finding: Equipment incorporating or concealing the cheating device. The examples are not an exhaustive list. Functional prerequisites: A suitable functional host that can incorporate or conceal the device. Conditional effects: Effectiveness and concealment depend on the device and circumstances. Stacking/repeatability/max per host: NOT SPECIFIED BY SOURCE Verdict for this typed domain: SUPPORTED (for a suitable functional host). This record certifies printed host facts only; it states requirements, not that any particular item satisfies them, and is not an implementation-ready host rule (register D-005 open).",
  "authoredBy": "Claude (transcription of owner-supplied rules-review findings; subject to independent review)",
  "coverage": "PUBLISHED_FACTS"
}

{
  "specId": "D005::sv-extra-power-source::armor",
  "typedDefinitionId": "sv-extra-power-source::armor",
  "component": "hostPrerequisites",
  "basis": "PUBLISHED_UNAMBIGUOUS",
  "publication": {
    "bookId": "scum-and-villainy",
    "title": "Scum and Villainy",
    "printedPage": 41,
    "tableOrSection": "Universal Upgrades: Table 2-3 (printed p. 40); Extra Power Source entry"
  },
  "verification": "SOURCE_VERIFIED",
  "evidence": "Owner's original Scum and Villainy PDF (SHA-256 74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399), printed pp. 40-42, examined by the project rules review; findings transcribed in docs/audits/d-005-universal-upgrade-host-text-transcription.md section 4, entry 06.",
  "behavior": "Published host facts for Extra Power Source (Scum and Villainy, Universal Upgrades, printed p. 41), typed domain armor. Host finding: Any equipment that actually uses the qualifying power sources. Functional prerequisites: Host uses energy cells or power packs. Conditional effects: Adds a power supply per installation. Stacking/repeatability/max per host: EXPLICITLY REPEATABLE (each installation adds another power supply). No numeric maximum is printed; none is invented. Normal upgrade-point accounting remains a separate restriction. Verdict for this typed domain: CONDITIONALLY SUPPORTED (host must use energy cells or power packs). This record certifies printed host facts only; it states requirements, not that any particular item satisfies them, and is not an implementation-ready host rule (register D-005 open).",
  "authoredBy": "Claude (transcription of owner-supplied rules-review findings; subject to independent review)",
  "coverage": "PUBLISHED_FACTS"
}

{
  "specId": "D005::sv-memory-upgrade-advanced::equipment",
  "typedDefinitionId": "sv-memory-upgrade-advanced::equipment",
  "component": "hostPrerequisites",
  "basis": "PUBLISHED_UNAMBIGUOUS",
  "publication": {
    "bookId": "scum-and-villainy",
    "title": "Scum and Villainy",
    "printedPage": 41,
    "tableOrSection": "Universal Upgrades: Table 2-3 (printed p. 40); Memory Upgrade, Advanced entry"
  },
  "verification": "SOURCE_VERIFIED",
  "evidence": "Owner's original Scum and Villainy PDF (SHA-256 74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399), printed pp. 40-42, examined by the project rules review; findings transcribed in docs/audits/d-005-universal-upgrade-host-text-transcription.md section 4, entry 08.",
  "behavior": "Published host facts for Memory Upgrade, Advanced (Scum and Villainy, Universal Upgrades, printed p. 41), typed domain equipment. Host finding: Intelligence-bearing, nondroid devices. Functional prerequisites: Intelligence score; not a droid (same as the basic version). Conditional effects: Intelligence +4; storage x5; replaces the basic version's benefits. Stacking/repeatability/max per host: Basic and advanced benefits do not stack (advanced replaces basic). Otherwise NOT SPECIFIED BY SOURCE. Verdict for this typed domain: CONDITIONALLY SUPPORTED (host needs an Intelligence score and must not be a droid). This record certifies printed host facts only; it states requirements, not that any particular item satisfies them, and is not an implementation-ready host rule (register D-005 open).",
  "authoredBy": "Claude (transcription of owner-supplied rules-review findings; subject to independent review)",
  "coverage": "PUBLISHED_FACTS"
}

{
  "specId": "D005::sv-secret-compartment::weapon",
  "typedDefinitionId": "sv-secret-compartment::weapon",
  "component": "hostPrerequisites",
  "basis": "PUBLISHED_UNAMBIGUOUS",
  "publication": {
    "bookId": "scum-and-villainy",
    "title": "Scum and Villainy",
    "printedPage": 41,
    "tableOrSection": "Universal Upgrades: Table 2-3 (printed p. 40); Secret Compartment entry (continues on printed p. 42)"
  },
  "verification": "SOURCE_VERIFIED",
  "evidence": "Owner's original Scum and Villainy PDF (SHA-256 74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399), printed pp. 40-42, examined by the project rules review; findings transcribed in docs/audits/d-005-universal-upgrade-host-text-transcription.md section 4, entry 12.",
  "behavior": "Published host facts for Secret Compartment (Scum and Villainy, Universal Upgrades, printed p. 41-42), typed domain weapon. Host finding: Equipment physically capable of containing the smaller object. Functional prerequisites: Containment: the host can contain an item at least one actual size category smaller. Conditional effects: Detection difficulty for observing use and for close inspection. Stacking/repeatability/max per host: NOT SPECIFIED BY SOURCE Verdict for this typed domain: CONDITIONALLY SUPPORTED (subject to the containment requirement). This record certifies printed host facts only; it states requirements, not that any particular item satisfies them, and is not an implementation-ready host rule (register D-005 open).",
  "authoredBy": "Claude (transcription of owner-supplied rules-review findings; subject to independent review)",
  "coverage": "PUBLISHED_FACTS"
}
```

## 3. Expected generator status changes (simulated)

I applied 35 records of exactly this shape (with placeholder text) in a throwaway worktree at the #1052 head and ran the real tools there. The repository itself was not modified.

| Check | Result |
|---|---|
| `build-modification-runtime.mjs` | Accepts the records; 186 records, 232 typed, 231 candidates, 49 accounting-eligible, 0 selectable (unchanged) |
| `--check` / `--validate` | OK after regeneration / VALID (V10') |
| Generated-file diff | 35 `hostPrerequisites.SOURCE_VERIFIED` false → true, plus `specificationRecordsSha256` and `recordsSha256`; nothing else |
| `MECHANIC_SPECIFIED` for `hostPrerequisites` | 0 (unchanged) |
| `applicability.hostRequirementsSpecified` | 0 (needs SOURCE_VERIFIED **and** MECHANIC_SPECIFIED) |
| `applicability.hostEligibility` | `not_established` for all (generator-forced) |
| D-005 `pendingSource` | still on all 35 |
| Selectable unmet list | still includes `1:hostPrerequisites` and `2:hostRequirementsSpecified` |
| Generator accepts `PUBLISHED_FACTS` while D-005 is open | Yes: `SPEC_WHILE_BLOCKER_OPEN` applies only to `COMPLETE_MECHANIC` |

## 4. Explicitly unchanged

Registry v1.5 file, manifest and companion markdown; registry SHA-256 `7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00` (960,022 bytes); `statusLedgerSha256` and the ledger itself; `PINNED_SCOPE_SHA256` entries (including D-005); the decisions register; `stackingPolicy`/`maxPerHost`; `hostEvaluator`; all executor/implementation/selectable flags; D-013 (156), D-014 (76), D-004, D-006, D-010, D-011; `EXECUTOR_NOT_CERTIFIED`.

## 5. Engineering conflicts and limits found (reported, nothing modified)

1. **`publication.printedPage` must be a single integer** (`SPEC_PUBLICATION_INCOMPLETE` otherwise). Secret Compartment's entry spans pp. 41–42. **Resolved by the owner:** `printedPage: 41`, with the continuation on p. 42 stated in `publication.tableOrSection` and in `evidence`. No range-valued field and no schema change.
2. **Four existing test assertions assume every specification record is an `installProcedure` record.** With 35 more records they fail on counts or on the "host prerequisites remain unverified for every definition" assertion: `tests/modification-runtime-generator.test.mjs` lines 219, 450, 578 (record sets and counts) and `tests/modification-v2-offline.test.mjs` line 175. In the simulation, scoping the three generator-test sets to `component === 'installProcedure'` and conditioning the offline assertion on `hostPrerequisites.SOURCE_VERIFIED` made both files pass (generator 67 checks, offline 17 checks). These are required test updates at implementation time, not changes to safety checks.
3. **No structured field exists for functional prerequisites or per-domain verdicts**; they live only in free-text `behavior`. A future host evaluator (G4) must not parse that text; it needs its own separately approved contract.
4. **The specification file's `notes` string** mentions only the page-39 records and should be updated at implementation (the file hash changes regardless).
5. **No rendered-page hashes exist for pp. 40–42** (the D-001 records cite one for p. 39). **Resolved by the owner:** not required. Accepted evidence is the source PDF SHA-256 `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399`, exact printed pages, the D-005 source-review document (PR #1054) and accurate provenance (findings supplied by the project rules review). No image hashes are to be invented and no copyrighted page images committed.
6. **Merge-order hazard.** The implementation regenerates `runtime-definitions-v1.5.json`, as does #1052. The generated file must be regenerated on top of `main` after #1052 merges, never merged by hand.

No generator behavior needs to change to carry out the owner's decisions.

## 6. Regression tests needed (to keep D-005 blocked)

1. Exactly 35 `hostPrerequisites` records; all `PUBLISHED_FACTS`; their typed IDs equal the D-005 ledger scope; 76 `installProcedure` records unchanged (111 total).
2. All 35: `hostPrerequisites.SOURCE_VERIFIED` true, `MECHANIC_SPECIFIED` false, `pendingSource` = [D-005], `hostRequirementsSpecified` false, `hostEligibility` `not_established`.
3. A `COMPLETE_MECHANIC` `hostPrerequisites` record for any of the 35 is refused (`SPEC_WHILE_BLOCKER_OPEN`).
4. Removing the D-005 ledger blocker while the register entry is open is refused (existing coverage retained).
5. Planner: for the 35, `COMPONENT_UNVERIFIED` on `hostPrerequisites` is gone but a D-005 `PENDING_SOURCE_VERIFICATION` deferral, `HOST_NOT_ESTABLISHED`, `NOT_SELECTABLE` and `EXECUTOR_NOT_CERTIFIED` remain; nothing is executable.
6. Counts: 186 / 232 / 231 / 49 / 0 selectable; `stackingPolicy` `UNVERIFIED` and `maxPerHost` null unchanged in the registry.
7. Stacking facts present in the Extra Power Source and Memory Upgrade record text; no record states a numeric maximum.

## 7. Validation and hash implications

- Changes: `specificationRecordsSha256` and `recordsSha256` in the generated file; the 35 status flips. Unchanged: registry SHA-256, `statusLedgerSha256`, scope pins.
- Commands at implementation: `node tools/build-modification-runtime.mjs`, then `--check`, `--validate`; `node tools/validate-modification-registry.mjs`; the four modification test files; the full rolling suite (`node tools/run-rolling-tests.mjs`); exact-head GitHub Actions.
- Simulation result (throwaway worktree at the #1052 head, 35 placeholder-text records plus the four test-scoping edits of §5.2): modification generator test 67 checks OK, offline test 17 checks OK, registry validator 35 and slot authority 49 OK, and the full rolling suite 381 passed, 0 failed (5 documented exclusions). The repository itself was not modified.

## 8. Dependency and merge ordering

1. #1051 (D-015 evidence docs) — merge first, on owner authorization.
2. #1052 (D-015 source-only lift) — retarget to `main` and re-run CI after #1051.
3. #1054 (D-005 findings) — independent of the others (docs only); merge any time after CI is green. The T2 implementation cites its transcription document, so it must be on `main` first.
4. This T2 plan PR — docs only; independent.
5. T2 implementation PR (35 records, regenerated runtime, test updates) — only after the plan is approved and after #1052 and #1054 are on `main`.
6. D-005 source-lift PR — separately authorized, after the T2 implementation.

## 9. Subsequent, separately authorized D-005 source-lift procedure

1. Append-only register rows to D-005: source examination log, a `Blocker lifted` row with parseable `source=` and `evidence=`, and a source-only resolution that states what it does not do.
2. Remove only the D-005 group (35 typed IDs) from the status ledger; no other entry changes.
3. Regenerate with the trusted tool; verify D-005 absent and D-014/D-013 etc. unchanged; `hostPrerequisites.pendingSource` empty for the 35 but `MECHANIC_SPECIFIED` still false.
4. Negative tests as for D-015: reintroduced D-005 blocker → `BLOCKER_FOR_LIFTED_REGISTER_ENTRY`; lift row missing `source=` or `evidence=` invalid; the pinned-scope test updated for the lifted entry.
5. A source lift certifies nothing about host evaluation: no evaluator, no selectability, no executor.

## 10. Eventual versioned-registry migration requirements (not in T2)

A v1.6 snapshot would need a coordinated, owner-approved package: the registry JSON, its manifest (byte length, SHA-256) and companion markdown; hash/version pins in `tools/validate-modification-registry.mjs` and its path constants; the generator header version and generated-file name; `registryVersion` in the specification-records and status-ledger files; every test with hard-coded version strings, counts or hashes; and the docs that cite v1.5. It should accumulate all certified corrections first (this addendum's page references and the stacking reconciliation; any errata only after authentication of the original publisher documents; other approved corrections) so that one migration carries a complete, reviewed set.

The migration must keep table-location corrections (`source.printedTablePage`) distinct from detailed-rules-page certification (`source.rulesPage`, where `null` means not yet certified); see the addendum §4.

## 11. Owner decisions and remaining gates

Resolved by the owner on 2026-10-16:

1. Secret Compartment is recorded as `publication.printedPage: 41`, with the p. 42 continuation in `tableOrSection` and `evidence` (§5.1).
2. Rendered-page hashes are not required (§5.5).
3. `rulesPage` meaning: `source.printedTablePage` is the printed page containing the source table; `source.rulesPage` is the certified printed page containing the entry's detailed published rules; `rulesPage: null` means that page has not been certified in that registry snapshot. This follows `docs/audits/modification-rolling-authority-v1.5.md` (which says `rulesPage=null` means not yet certified and to retain `printedTablePage` plus the actual `rulesPage`). Nothing is populated in v1.5, and verifying D-005 host facts does not by itself justify filling `rulesPage` for every entry; full registry certification is a separate process. The future migration must treat table-location corrections and detailed-rules-page certification as distinct changes.
4. The T2 design is approved. The specification-record implementation awaits a separately authorized execution step; no data change, merge or retarget is authorized by this plan.

Remaining gate: explicit owner authorization to execute (see §13).

## 12. Non-effects

Documentation only. No change to the registry, manifest, specification records, ledger, generated runtime, tests, `swse-rules-decisions-pending.md` or production code. No v1.6, no D-005 lift, no host evaluator, no merge or retarget of #1051, #1052 or #1054, no G4–G9 work. Invariants unchanged: 186 parents, 232 typed definitions, 35 D-005 blockers, 0 runtime-selectable, `EXECUTOR_NOT_CERTIFIED` enforced.

## 13. T2 implementation acceptance checklist (for the future authorized execution)

**Preconditions**
- [ ] Owner has explicitly authorized execution of T2 implementation.
- [ ] Work is built on a `main` that already contains the approved D-015 changes (#1051, #1052) and the D-005 source-review document (#1054). No stacking on unmerged branches.
- [ ] Recommended merge order (each subject to explicit owner authorization): #1051, #1052 (retargeted, CI re-run), #1054, #1055.

**Records (35, exactly)**
- [ ] One `PUBLISHED_FACTS` `hostPrerequisites` record per existing D-005 typed ID; no new parents or typed definitions; typed IDs equal the D-005 ledger scope.
- [ ] Every record: `basis: PUBLISHED_UNAMBIGUOUS`, `verification: SOURCE_VERIFIED`, `coverage: PUBLISHED_FACTS`, `bookId: scum-and-villainy`, `title: Scum and Villainy`, `specId` of the form `D005::<typedId>`.
- [ ] `publication.printedPage` is the entry's description page (40 Cheater/Cloaked; 41 Dual Gear through Secret Compartment; 42 Silverplate/Spring Loaded/Storage Capacity); Secret Compartment is 41 with the p. 42 continuation in `tableOrSection` and `evidence`.
- [ ] `evidence` cites the source PDF SHA-256, printed pp. 40–42, the transcription document entry and the provenance (findings supplied by the project rules review); no page-image hashes.
- [ ] All 35 `behavior` texts are the approved source-backed descriptions (host finding, functional prerequisites, conditional effects, stacking, typed-domain verdict), not placeholders, and each states that it certifies printed facts only and is not an implementation-ready host rule.
- [ ] Stacking facts present: Extra Power Source explicitly repeatable, no numeric maximum; Memory Upgrade / Advanced: advanced replaces basic, no stacking of basic and advanced, no universal maximum of one, no basic-first requirement; all others `NOT SPECIFIED BY SOURCE`; no default maximum.
- [ ] Specification file `notes` updated; `registryVersion` remains `1.5`.

**Generated runtime and counts**
- [ ] Runtime regenerated only with `node tools/build-modification-runtime.mjs`; `--check` and `--validate` pass; no hand edit.
- [ ] Counts: 186 parents, 232 typed, 231 candidates, 49 accounting-eligible, 0 runtime-selectable.
- [ ] Generated diff is limited to 35 `hostPrerequisites.SOURCE_VERIFIED` false → true plus the specification-records and records hashes.
- [ ] For all 35: `MECHANIC_SPECIFIED` false; `hostRequirementsSpecified` false; `hostEligibility` `not_established`; `pendingSource` still contains D-005.

**Tests**
- [ ] The four stale assertions are scoped (generator test lines 219, 450, 578; offline test line 175) without weakening any safety check.
- [ ] New coverage: exactly 35 host records and 111 total; typed IDs equal the D-005 ledger scope; a `COMPLETE_MECHANIC` `hostPrerequisites` record is refused (`SPEC_WHILE_BLOCKER_OPEN`); D-005 blocker removal while the register entry is open is refused; unauthorized selectability is refused; planner keeps a D-005 deferral, `HOST_NOT_ESTABLISHED`, `NOT_SELECTABLE` and `EXECUTOR_NOT_CERTIFIED` for the 35.
- [ ] Modification tests, registry validator, G1 validation and the full rolling suite pass locally with stdout/stderr inspected; exact-head GitHub Actions passes.

**Unchanged (verify by diff)**
- [ ] Registry v1.5 file, manifest, companion markdown and SHA-256 `7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00`; `stackingPolicy`/`maxPerHost`; `printedTablePage`/`rulesPage`.
- [ ] Status ledger and `PINNED_SCOPE_SHA256`; D-005 blocker scope (35); D-013 (156), D-014 (76), D-004, D-006, D-010, D-011; `swse-rules-decisions-pending.md`.
- [ ] No host evaluator, no implementation/test/Foundry flags, no executor authority, no production module change, no v1.6, no D-005 lift, no G4–G9 work.

**Not part of T2 implementation:** D-005 source lift, registry migration, host evaluator design, any merge or retarget.

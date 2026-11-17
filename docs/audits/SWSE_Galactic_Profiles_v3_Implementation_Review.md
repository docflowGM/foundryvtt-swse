# SWSE Galactic Profiles v3 — Implementation Review

**Branch:** `claude/galactic-profiles-v3-audit-7nfpt0` (built from `feature/chargen-splash-prewarm` @ `9de84a4`; PR #1152, draft) · **Not merged** · **Foundry v13 runtime: not executed** (no Foundry available in the build environment).
**Companion documents:** `SWSE_Galactic_Profiles_v3_Unification_Audit.md` (audit + owner dispositions), `SWSE_Galactic_Profiles_v3_Certification_Matrix.md` (generated per-profile status), `swse-rules-decisions-pending.md` (GP-RD-001…014).

---

## A. Executive summary

All 41 Galactic Profiles now run through **one** pipeline built on the existing V2 authorities:

```
GalacticProfileRegistry ─▶ compileProfile (pure, fail-closed) ─▶ applyCompiledProfile (atomic, one explicit action)
        ─▶ ProgressionSession.draftSelections (+ profileApplication) ─▶ player resolves open steps
        ─▶ ProgressionFinalizer._compileMutationPlan (ONE plan) ─▶ DroidSubtypeAdapter / ActorEngine at confirm
```

* **What works, with executed evidence (offline, against the real V2 code):** the single unified schema + generated catalog/evidence; strict subtype resolution; the generic droid draft builder (all eight authored builds quote `OK` at exactly 1000 credits, pass the real initial-installation projection, and pass `DroidBuilderAdapter.validateDroidBuild`); atomic/idempotent Apply with ownership-aware switching and persistence round-trip through the real `SessionStorage`; the real `ProgressionFinalizer._compileMutationPlan` producing the exact final wallet (including 0 and the Wealth case), kit items with quantities, a single lightsaber, and no actor mutation; droid attribute modifiers applied exactly once for all eight droids; real finalizer readiness accepting applied profiles and provisional droid builds.
* **What is not proven:** anything that needs a live Foundry world: production resolver wiring (`galactic-profile-service.js`), `FeatChoiceResolver` choice validation, V2 prerequisite evaluation, Force-tree access via `tree-authority`, ActorEngine application/rollback, rendering and UX. **No profile is `FOUNDRY_TESTED` and none is `publishableAsReadyToPlay`.**
* **Legality:** 18 of 41 profiles compile cleanly offline (`PARTIALLY_VERIFIED`); 23 are `BLOCKED` with explicit reasons (open rulings, unresolved attribute basis, identities that do not exist in V2). Blocked profiles never prevent the others from working.
* **Cutover:** the parallel template-creation stack (including the live `TemplateCharacterCreator`, which created actors outside the progression session) is removed; every creation entry point opens the shared transient `ProgressionSession`.

## B. Commit history

| Phase | Commit | What |
|---|---|---|
| Audit | `cdd5d33` | Audit report + evidence scripts (PR #1152 base content) |
| Base | `7749ceb` | Merge of `feature/chargen-splash-prewarm` (`9de84a4`) into the branch |
| P0 | `abb8a4d` | Unified contract: schema, generator, catalog, evidence; droid schema fixed; owner dispositions recorded |
| P1 | `ef464bf` | Registry, compiler, resolvers, strict subtype, droid draft builder; pinned 41-profile outcomes |
| P2 | `ba1be87` | Session slot, atomic Apply, economy/equipment finalization, entitlement locks, service wiring |
| P3 | `ef44939` | Explicit picker, single Apply, shared droid entry |
| P4 | `98d11bb` | Cutover and legacy retirement |
| P5/P6 | `f4e48d8` | Beast fail-closed, Mobile Scout, V-NH-1 fix, catalog-first picker, certification matrix, rulings register |
| Final | (this commit) | Readiness/mutation-plan evidence tests, register additions, review report |

## C. Architecture before and after

| Concern | Before | After |
|---|---|---|
| Profile data | two v3 packages with two schemas (droid failed its own schema, 32 errors) + two catalogs + v2 JSON loaded by `TemplateRegistry` | one schema (`$defs`, per-subtype `if/then`), one generated catalog, one runtime file, verbatim evidence file (never loaded) |
| Identity | 4 overlapping classification fields | `subtype` = V2 adapter id; originals kept in `provenance` |
| Loading | `_loadPromise` never cleared on failure; 123 KB at first paint; two previews per render | coalesced + retryable; 46 KB catalog first paint, full profiles only at Review; one compile cached per (profile, revision, session state) |
| Compile | `TemplateAdapter`: direct `draftSelections` writes, `system:{}` class, locks by array length, hardcoded validator limits | pure compiler delegating every rule to V2; class committed with full registry `system`; locks = persisted, entitlement-based, released on edit |
| Apply | on step exit / Back / Close; auto-first-class; replaced the whole session | one explicit action; atomic; idempotent; ownership map; `kept`/`replaced` reported |
| Persistence | template state not persisted | `draftSelections.profileApplication` rides the existing snapshot |
| Economy | credits skipped when 0; Wealth added; chargen store wrote actor credits pre-confirm | exact final balance (0 valid), Wealth never added, store closed for profile sessions, kit through the one MutationPlan |
| Droid | profile button forced `standard-model` via a legacy modal; `type` missing from appendage rows (installation failed 8/8) | same picker in `custom` mode; generic resolver supplies canonical rows; quote + installation gate before Apply; provisional build |
| Unknown subtype | silently fell back to the actor adapter | `resolveAdapterStrict`: exact id or refused |
| Beast readiness | warned only, read stale actor Int, defaulted 0→1 | throws on missing context / missing or invalid draft Int (creation 1–2) |
| Creation paths | `TemplateCharacterCreator` created actors directly | removed; all entries → transient `ProgressionSession` |

**Retired (verified by grep gate + tests):** `scripts/engine/progression/template/*` (9 modules), `template-character-creator.js`, `chargen-templates.js`, `droid-template-choice-dialog.js`, `template-selection-dialog.js` and their templates/styles. **Kept deliberately:** the v2 JSON data files (dev audit tools still read them; no runtime loader remains).

## D. Mechanical legality — see `SWSE_Galactic_Profiles_v3_Certification_Matrix.md` (generated, drift-guarded)

Summary: **18 PARTIALLY_VERIFIED · 23 BLOCKED · 0 FOUNDRY_TESTED · 0 ready-to-play.**

| Blocking cause | Profiles |
|---|---|
| Attribute basis unresolved (GP-RD-009) | 17 organic profiles + both beasts (jedi_guardian, jedi_consular, jedi_sentinel, noble_diplomat, noble_aristocrat, noble_duelist, scoundrel_skill_monkey/knuckledragger/outlaw/brigand, scout_sniper/engineer/survivalist/infiltrator, soldier_rifleman/tank/commando) |
| Open ruling / beast creation (GP-RD-001/010) | beast-wolf, beast-bear |
| Identity absent from V2 data (GP-RD-005/012/013/014) | laborer-worker, soldier-guard, scout-pathfinder, scout_pistoleer (vehicle), scoundrel_brigand, soldier_rifleman (Clips), jedi_sentinel (a Force power) |
| Compile cleanly (still not certified) | jedi_defender*, noble_leader, scoundrel_pistoleer, soldier_gunner, soldier_brawler, nonheroic_worker/trooper/criminal/merchant/police, all eight droids |

\*Force powers held until Force Training is legally present (GP-RD-003).

Droids: 8/8 compile; quote `OK`/1000; installation dry-check OK; provisional build passes real V2 readiness; plan base + V2 racial == authored final scores. They remain unverified for feat/talent prerequisites, Linguist/Shake It Off conditionals, and Foundry actor application.

## E. Testing

* **New:** 13 test files, **142 tests, all passing** (schema/droid/compiler/session/economy/wiring/step/cutover/matrix/readiness/mutation-plan/beast/nonheroic).
* **Baseline** (`tools/run-rolling-tests.mjs` before any change): **698 passed, 0 failed** (5 documented exclusions).
* **Final run:** see §E-final below. CI gate scripts re-run green: syntax check, shell-mutation contract (strict), talent-phase-3c CI, talent tree membership audit, system manifest, partial validation, `build-galactic-profiles --check`, `report-galactic-profile-status --check`.
* **Real production code exercised offline:** `ProgressionSession`, `SessionStorage`, `ProgressionEconomyPlanBuilder`, `ProgressionFinalizer` (`_validateReadiness`, `_compileMutationPlan`, starter-item dedupe), `DroidSubtypeAdapter.contributeMutationPlan`, `quoteDroidBuild`, `buildInitialDroidInstallation`, `DroidBuilderAdapter`, `BeastSubtypeAdapter`. **Stubbed:** only compendium document loading and the ApplicationV2/window/localStorage import chain.
* **Environment limits:** no Foundry; no printed sourcebooks (book/page citations are as recorded by the repository).
* **Existing tests changed:** species-publication (adapter assertion moved to the policy module it delegated to), consumer-batch (retired creator guard), item census pruned; talent-phase reports re-pinned for the registry's one-entry change (see GP-RD-007).

## F. Performance (measured offline; Foundry render times not measured)

| Metric | Before | After |
|---|---|---|
| First-paint data | 123,789 B (`character-templates.json` 112,827 + `nonheroic-templates.json` 10,972), plus a second preview compile per render | **45,960 B** generated catalog (class + archetype steps) |
| Full profile load | n/a (monolithic) | 207,891 B + 17,253 B schema, **only at Review**, once |
| Evidence (473 KB) | n/a | never loaded at runtime |
| Compile | two session builds per Review render | one compile per (profile, revision, session state); offline median 0.26 ms, p95 1.13 ms, max 4.39 ms; 41-profile validation 3.6 ms |
| Failed load | cached permanently (registry, dialogues) | retryable; good data stays cached |

## G. Outstanding defects and gaps

| # | Sev | Location | Issue | Suggested fix |
|---|---|---|---|---|
| 1 | High | `profile/galactic-profile-service.js` | Production wiring never executed (no Foundry). Imports/exports verified statically only | Foundry v13 smoke: compile + Apply for the 18 compiling profiles |
| 2 | High | compiler | Feat/talent **prerequisites** and entitlement **counts** are not evaluated at compile; V2 steps/finalizer validate later | Wire `AbilityEngine.evaluateAcquisition` with the transient shell as a resolver hook |
| 3 | Med | service `featChoice` | Option-label matching against `FeatChoiceResolver.resolveOptions` is defensive (fail-closed) but its result shape is unverified | Verify in Foundry; adjust matcher |
| 4 | Med | compiler/resolvers | Force-tree talent access (`jedi_consular`) is held for V2 instead of checked via `tree-authority` | Evaluate with an evaluation actor; commit when allowed |
| 5 | Med | chargen store | Closed for profile sessions; no draft-only shop exists | Separate project: draft-only store → plan |
| 6 | Med | picker/launch | No UI lane starts nonheroic/beast sessions with the picker (needs NPC creation lane; implicit nonheroic seeding requires `actor.type==='npc'`) | Add a GM "Create Nonheroic From Profile" entry once the lane is verified |
| 7 | Med | V-NH-1 | Nonheroic class-item level fix verified by unit test only | Foundry check: item `system.level===1`, BAB/HP |
| 8 | Med | data | 19 attribute-basis cases (17 organic + 2 beasts; `jedi_defender` is moot after GP-RD-008); identities absent from V2 (GP-RD-012/013/014) | Owner statements / data authoring |
| 9 | Low | picker | `isTemplateSession` flag still read by `progression-shell.js:278` (always undefined now) | Remove the flag read |
| 10 | Low | `data/*-templates.json`, `scripts/maintenance/*`, `scripts/migration/*`, `tools/*template*` | Legacy v2 data + dev tools retained (read by audit tools) | Retire with their tools after owner review |
| 11 | Low | `ChargenShell` | `profilePicker` launch option relies on `this.options` carrying launch options | Foundry check |

## H. Pending rulings (owner)

Open (`DEFERRED_RULES_REVIEW`): **GP-RD-001** (Wolf Pack Tactics), **GP-RD-003** (Jedi Force Training; intent preserved), **GP-RD-005** (Athletics), **GP-RD-009** (attribute basis, 19 profiles), **GP-RD-010** (beast creation sources), and the new identity gaps **GP-RD-012** (`Simple Weapon Proficiency`), **GP-RD-013** ("Clips"; starting vehicle), **GP-RD-014** (backgrounds absent from V2). Resolved by the owner and implemented: GP-RD-002, 004, 006, 007, 008, 011. Printed-book verification of GP-RD-007 remains owner-attested.

## I. Final recommendation

**Ready for live Foundry v13 testing; not ready for production use.** The architecture is consolidated and the offline evidence is substantial, but the production resolver wiring, V2 prerequisite evaluation, ActorEngine application/rollback and the UI have only been verified statically or through production-code unit harnesses. Recommended next steps: (1) Foundry smoke on the 18 compiling profiles and 8 droids (apply → resolve → confirm → inspect actor); (2) wire prerequisite evaluation (defect 2); (3) owner rulings listed in §H; (4) certify profiles **individually**.

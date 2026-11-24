# Legacy Dark/Light Side talent execution graph — deletion ledger (EXECUTED 2026-11-24)

**Authorization:** the project owner, directly in chat (2026-11-24): clean V2 cutover, no compatibility architecture, delete verified-dead systems; published talents and active services preserved; WatchCircle and Drain Force stay non-spend exceptions. Git history is the recovery record (parent of the retirement commit).

## Deleted (verified: not in the static import graph from `index.js`, no dynamic/data reference, no importer outside the dead set)
`scripts/talents/DarkSidePowers.js`, `dark-side-powers-init.js`, `dark-side-devotee-macros.js`, `dark-side-devotee-init.js`, `light-side-talent-macros.js`, `light-side-init.js`, `dark-side-talent-macros.js`, `dark-side-init.js`; `scripts/engine/talent/dark-side-devotee-mechanics.js`, `light-side-talent-mechanics.js`, `dark-side-talent-mechanics.js` — 11 files, 7,236 lines.

## Removed from the still-loaded `talent-effect-engine.js` (method by method; the module itself stays)
29 static planners with no caller anywhere (scripts, tests, tools, index.js; no computed access): `buildChannelAggression/ChannelAnger/CripplingStrike/DarkSideTalisman/EndChannelAnger/SwiftPower/DarkSideSavant/WrathOfDarkSide/Direct/ConsularsWisdom/ExposingStrike/DarkRetaliation/SkilledAdvisor/ApprenticeBoon/RenewVision/AdeptNegotiator/DarkHealing/ImprovedDarkHealing/DarkHealingField/WickedStrike/DrainForce/RemoveCripplingStrike/DestroyDarkSideTalisman/SithTalisman/DestroySithTalisman/ClearSithAlchemicalBonus/SetStolenFormTalent/CreateSithAlchemicalWeapon/ActivateSithAlchemicalBonus` + the three imports they alone used. 25 active planners remain. The engine now writes no Force Point balance.

## Tests changed
Deleted `dark-side-powers-damage-type-authority.test` (source-pattern test over a deleted file). Removed the retired-file reads/asserts from `dsp-engine-consolidation`, `dsp-migration-consolidation`, `dsp-no-inline-writers` and one case from `class-phase-6i-force-prestige-convergence` (Adept Negotiator's Indomitable gate lives in the active `consular-talent-actions.js` and is covered by `class-phase-6q`). `scripts/validate-mutation-sovereignty.js` no longer lists the deleted file. New guard: `tests/class-force-v2-legacy-talent-retirement.test.mjs` (files stay deleted, nothing imports them, legacy globals not installed, planners stay gone, the loaded engine is not deleted wholesale, published talents remain pack Items; mutation-checked). `class-force-v2-direct-fp-writer-classification` updated to the new tree.

## Not deleted, by design
`packs/talents.db` (published Channel Aggression, Channel Anger, Wicked Strike, Drain Force, Dark Healing …), V2 authorities, the active talent services (`sith-talent-actions.js` already implements Channel Aggression, Drain Force, Embrace the Dark Side …), WatchCircle (printed non-spend), Drain Force target loss, manual sheet/GM adjustments, chargen grants.

## Functionality that was NOT live and is therefore not "lost"
None of the retired code was reachable from the shipped runtime, so no player-facing behavior changed. Any published talent that has no active V2 implementation (it never had a working one through this graph) is a candidate for proper V2 implementation later, source-certified per talent; nothing here pre-decides that.

---
## Original proposal (preserved for provenance)

Status: **prepared, not executed.** The retirement authorization reached this session only as a relayed GitHub comment on PR #1171 (quoting the owner: "The game is not shipped. If we need to strip out dead or toxic systems then let's strip it."). Earlier relayed owner decisions in this session were acted on only after the owner confirmed in chat; no chat confirmation of this one has been seen, so the deletion waits for it. Everything below is read-only evidence so the cut is one reviewable step once confirmed (and one `git revert` if it was premature).

## Files proposed for deletion (lines, references outside their own dead graph)
| Path | Lines | Referenced from outside the dead graph |
| --- | ---: | --- |
| `scripts/talents/DarkSidePowers.js` | — | `talent-effect-engine.js` (a string mention in a comment/descriptor, to re-verify), `scripts/validate-mutation-sovereignty.js` (tooling list), 4 source-pattern tests (below) |
| `scripts/talents/dark-side-powers-init.js` | 952 | `tests/dark-side-powers-damage-type-authority.test.mjs`, historical audit JSON |
| `scripts/engine/talent/dark-side-devotee-mechanics.js` | — | none outside the graph |
| `scripts/talents/dark-side-devotee-macros.js` | 353 | `dark-side-devotee-init.js` only |
| `scripts/talents/dark-side-devotee-init.js` | — | none |
| `scripts/engine/talent/light-side-talent-mechanics.js` | — | `tests/dsp-engine-consolidation.test.mjs`, `tests/class-phase-6i-force-prestige-convergence.test.mjs` (source-pattern reads) |
| `scripts/talents/light-side-talent-macros.js` | 685 | `light-side-init.js` only; historical audit JSON |
| `scripts/talents/light-side-init.js` | 53 | none |
| `scripts/engine/talent/dark-side-talent-mechanics.js`, `scripts/talents/dark-side-talent-macros.js`, `scripts/talents/dark-side-init.js` | — / 167 / 39 | each other only (a second dead trio found by the same search) |
| 15 FP-debiting `build*Plan` methods inside `scripts/engine/talent/talent-effect-engine.js` | — | only the files above; `talent-effect-engine.js` stays (loaded via `combat/rolls/damage.js`) |

## Tests that read the doomed files and must change in the same batch
`dsp-engine-consolidation`, `dsp-migration-consolidation`, `dsp-no-inline-writers`, `dark-side-powers-damage-type-authority` (source-pattern regressions over `DarkSidePowers.js`) and `class-phase-6i-force-prestige-convergence` (reads `light-side-talent-mechanics.js`). Each guards a bug class in code that cannot run; they would be retargeted to assert the files are absent and that no production import reaches them, not silently dropped.

## Evidence that conflicts with "dead" (must be resolved before deleting)
`tests/dark-side-powers-damage-type-authority.test.mjs` states these are "live, sheet-wired Dark Side power effects (dark-side-powers-init.js), not dead code". The repo does not support that today: `system.json` loads only `index.js`; the static import graph from `index.js` excludes every file above; no template, pack or data file references `window.SWSE.talents.darkSidePowers`, `window.SWSE.macros.*` or these paths; the only runtime dynamic import with a data-driven path (`effect-resolver.js` `_applyCustom`) is never pointed at them by any shipped data. The claim may describe an earlier loading arrangement. If the owner knows of a live entry point (e.g. a world macro), say so before deletion.

## Not deleted, by design
Published talent records (`packs/talents.db`), V2 class/Force authorities, WatchCircle (printed non-spend exception), Drain Force target loss, manual sheet and GM balance controls, chargen/level-up grants. Other `*-talent-macros.js` files for non-Force talents (noble, scoundrel, scout, soldier, prestige) are outside this question and untouched.

## Per-batch acceptance (as the owner/reviewer specified)
Import graph before/after; references to every removed symbol; negative-reachability guard (mutation-tested); compile; `validate-data`; `validate-partials`; focused force/class/reaction tests against the exact five baseline failures; update `tests/class-force-v2-direct-fp-writer-classification.test.mjs` to the new tree.

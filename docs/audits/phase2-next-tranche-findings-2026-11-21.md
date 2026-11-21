# Phase 2 next-tranche findings — combat display parity, Class/Force vs Force V2, TI chain (issue #1166)

**Date:** 2026-11-21. **main:** `9a4d08312ed622b02d878f02d50459fd26e1cfda` at analysis time. Read-only analysis; no rule was decided. Status vocabulary per CLAUDE.md.

## 1. Combat display parity (`claude/swse-combat-display-parity-lcdapp`)

Branch claims, checked against current `main` by code inspection only (**not runtime-reproduced; not `FOUNDRY_TESTED`**):

| Claim | On current main | Status |
| --- | --- | --- |
| Sheet attack totals come from stored weapon fields, not the canonical resolver | `mirrorAttacks` (`scripts/actors/v2/character-actor.js:431`) sets `attackTotal` from `attack.attackTotal ?? attackBonus ?? toHit` (lines 337-340, 412). Nothing else on main writes those weapon fields, so on a normal owned weapon the sheet figure is not derived from `resolveAttackBonus` | Reproduced by inspection; reachability for ordinary weapons needs a live check |
| `resolveAttackBonus` call site hard-codes `actionId` to `null` although one is available | **One** site remains (`scripts/combat/rolls/attacks.js:137`, in `computeFinalAttackComposition`); the branch's "two sites" is stale (attacks.js was refactored). `rollOptions.actionId` is used elsewhere in the same file (562, 1265, 1322). With `null`, `resolveAttackBonus` skips `TalentActionLinker.calculateBonusForAction` (combat-roll-math.js:509-512); `combat-utils.js:51` does pass `actionId` | Reproduced by inspection. **Not safe to flip blind**: it would change real roll totals, and double counting with the typed-modifier pipeline cannot be excluded statically |
| `derived-calculator.js` drops `psychicCitadelBonus` / `implantWillPenalty` from `defenses.will` | True on main (no such fields in the will materialization). Branch itself states the Will total is already correct; the fields only feed new tooltip rows | Display-only; belongs to the feature, not a defect |
| DefenseTooltip modifier lookup reads the wrong key / `fort`,`ref` ids | Not confirmed: main's tooltip already has `getModifiersForTarget` (line ~259); the branch's description targets older code | Unverified |
| `mirrorAttacks` resolver-failure fallback shows `0`; one-render condition-track staleness | Not examined | Unverified |

**Classification stays `BLOCKED_CONFLICT`.** Diverged on main: `attacks.js`, `PanelContextBuilder.js`, `character-actor.js`. Do not port the branch. Safe next step: an isolated branch off main that adds a regression test proving a stored `attackTotal` diverges from `resolveAttackBonus` for a representative weapon, and a test showing the `actionId` effect, then a Foundry v13 check before any behavior change. The `actionId` item is a combat-math behavior change and needs an explicit owner go-ahead and a double-counting check.

## 2. Class/Force chain vs Force V2 — measured conflict surface

Throwaway merge of the PR #1164 tip into the PR #1165 head (scratch worktree, aborted, nothing pushed): **9 conflicted files, 14 hunks, ~330 conflicted lines.**

| File | Hunks | ~Lines | Concern |
| --- | ---: | ---: | --- |
| `scripts/governance/actor-engine/actor-engine.js` | 3 | 119 | typed effect admission vs V2 changes |
| `scripts/engine/combat/reactions/reaction-engine.js` | 2 | 92 | paid reaction cost / admission |
| `scripts/engine/roll/roll-core.js` | 3 | 52 | roll authority |
| `scripts/engine/combat/reactions/reaction-registry.js` | 1 | 19 | reaction registration |
| `tests/force-point-transaction-integrity.test.mjs` | 1 | 17 | FP transaction expectations |
| `scripts/engine/force/force-engine.js` | 1 | 9 | Force engine |
| `scripts/combat/rolls/force-point-transaction.js` | 1 | 7 | **FP transaction authority** (`createForcePointTransaction`) |
| `scripts/engine/force/force-point-spend-coordinator.js` | 1 | 5 | **FP spend authority** (`ForcePointSpendCoordinator`) |
| `tests/roll-expression-transform-authority.test.mjs` | 1 | 5 | roll expression expectations |

The two Force Point authority files conflict in only ~12 lines but are the semantically critical ones: V2's canonical FP transaction must remain the authority; Class/Force receipts (Temptation, paid reaction costs) must be re-expressed on top of it, not the reverse. 10 further overlapping files auto-merge but are semantically unverified. Textual size is therefore **not** the risk; behavioral equivalence is. Suggested order: low-overlap phases first (6J–6M Fallen Jedi gate, Fearless/Indomitable, Prophet, Serenity; sheet controls), then Temptation/reaction receipts onto V2's FP transaction. Needs an isolated acceptance branch after Force V2 (#1165) is accepted, with the FP-transaction and reaction tests run on every step. Not started.

## 3. TI chain

Recovered additively in PR #1179 (53 files). #1063's stale copy of the append-only rules register is excluded; its real addition `TI4-OD-5` is in draft PR #1180 pending owner confirmation of the 2026-10-20 approval it records. #1057, #1059 and #984 are not yet inspected beyond the earlier file census (#1059 comes from an older equipment lineage: 11 of its files differ in main, 3 absent).

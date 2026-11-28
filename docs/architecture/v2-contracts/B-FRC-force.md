# B-FRC — Force domain contract (Level B, with Level C)

**Contract level:** B (domain). **Domain:** `force` (Force powers, Force Points, Dark Side Score, traditions, Force Alchemy). **Audited commit:** `f734b4d` = "Merge integration/class-force-v2-20261122 into main" (HEAD `2beb7cb` adds only census artefacts). **Sidecar:** `data/audits/architecture-census/contracts/domains/force.json`.
Level A invariants are referenced by ID from [`A-global-invariants.md`](A-global-invariants.md). **Force V2 is offline-validated only. Nothing in this domain is `FOUNDRY_TESTED`;** the live acceptance matrix has not been executed (§9, §12).

## 1. Purpose and boundaries

FRC owns: Force power catalog lookup (`ForceRegistry`), Force power execution (`ForceExecutor`), Force power effects/maintenance/recovery (V2 suites), the **Force Point transaction model** (typed spend contracts, receipts, settlement, triggers — calculation in `ForcePointsService`, mutation in `ActorEngine.spendForcePoints` per FP-RD rulings), **Dark Side Score** reading (`DSPEngine`) and access policy, Force regimens, Force traditions, and Force Alchemy.

Must **not** own: actor persistence (A-02 → ActorEngine), credit movement (A-10 → TransactionEngine), chat rendering (A-05), talent action rules for non-Force talents, Force Point **maximum** at progression time (PRG commits it; FRC should own the formula — F-FRC-002), UI dialogs from engine code (A-07).

Scope (census): 55 runtime modules, 13,704 SLOC; 47 reachable-static, 3 unreachable-importers-only, 1 test-only, 2 orphan. Paths: `scripts/engine/force/**`, `scripts/engine/darkside/**`, `scripts/apps/force-alchemy/**`, `scripts/apps/force-tradition/**`, `scripts/data/force-points.js`, `scripts/infrastructure/hooks/force-*.js`, `scripts/utils/force-*.js`, `scripts/components/force-suite.js`.

## 2. Responsibility ownership

| ID | Responsibility | Owner (path · symbol) | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-FRC-01 | Force Point spend mutation (receipt, queue, bonus-pool debit) | `scripts/governance/actor-engine/actor-engine.js` · `ActorEngine.spendForcePoints` | APPROVED (FP-RD rulings, `docs/audits/swse-rules-decisions-pending.md:3762`) · OBSERVED | test-verified (`tests/force-point-transaction-integrity.test.mjs`, run: passed) | `scripts/governance/actor-engine/actor-engine.js:2116` |
| R-FRC-02 | FP spend authorization / availability | `scripts/engine/force/force-points-service.js` · `ForcePointsService.authorizeSpend` | OBSERVED | test-verified (`tests/force-v2-03b-transaction-behavior.test.mjs`) | `scripts/engine/force/force-points-service.js:242` |
| R-FRC-03 | FP settlement / reconciliation (finalize, rollback, GM reconcile) | `ActorEngine.finalizeForcePointSpend` / `rollbackForcePointSpend`; `scripts/engine/force/force-point-settlement.js` | OBSERVED | test-verified (`tests/class-force-v2-receipt-reconciliation.test.mjs`) | `scripts/governance/actor-engine/actor-engine.js:2236`, `scripts/governance/actor-engine/actor-engine.js:2294` |
| R-FRC-04 | FP gain (regain) | `ActorEngine.gainForcePoints` + `ForcePointsService.calcGain` | OBSERVED | behavior-code-verified | `scripts/governance/actor-engine/actor-engine.js:2077`, `scripts/engine/force/force-points-service.js:564` |
| R-FRC-05 | FP maximum formula | **two** implementations: `scripts/data/force-points.js` · `calculateMaxForcePointsForBuildPlan` (committed by progression) and `ForcePointsService.getMax` (no callers) | OBSERVED · CONFLICT (A-01) | behavior-code-verified | `scripts/data/force-points.js:87`, `scripts/engine/force/force-points-service.js:67` |
| R-FRC-06 | Bonus (temporary) FP pool | no single owner: ActorEngine (debit), `ForceExecutor` (Force Flow), talents, feats | OBSERVED · CONFLICT | behavior-code-verified | `scripts/engine/force/force-executor.js:732`, `scripts/engine/talent/guardian-spirit-actions.js:91` |
| R-FRC-07 | Dark Side Score read/caps | `scripts/engine/darkside/dsp-engine.js` · `DSPEngine` (pure) | OBSERVED | test-verified (`tests/dsp-engine-behavior.test.mjs`) | `scripts/engine/darkside/dsp-engine.js:199`, `scripts/engine/darkside/dsp-engine.js:232` |
| R-FRC-08 | Dark Side Score mutation | no owner; 7 live modules compose and write `system.darkSide.value` | OBSERVED · CONFLICT (A-01) | behavior-code-verified | `scripts/engine/force/force-engine.js:57`, `scripts/engine/force/temptation-of-the-dark-side.js:136` |
| R-FRC-09 | Force power execution | `scripts/engine/force/force-executor.js` · `ForceExecutor.executeForcePower` | OBSERVED · CONFLICT (A-02, A-09 patched) | test-verified (`tests/force-v2-game-night-integration.test.mjs`) | `scripts/engine/force/force-executor.js:195` |
| R-FRC-10 | Force power lifecycle hooks (training/sensitivity grants, suite recovery, maintenance) | `scripts/infrastructure/hooks/force-power-hooks.js` | OBSERVED (gated: `game.user.id === userId` / `isResponsibleGm`) | behavior-code-verified | `scripts/infrastructure/hooks/force-power-hooks.js:57`, `scripts/infrastructure/hooks/force-power-hooks.js:135` |
| R-FRC-11 | Force catalog lookup | `scripts/engine/registries/force-registry.js` · `ForceRegistry` | OBSERVED | source-inspected | domain facts (19 consumers) |
| R-FRC-12 | Force Alchemy (rites, costs, state) | `scripts/apps/force-alchemy/force-alchemy-mechanics-service.js` | OBSERVED · CONFLICT (A-10, A-05, placement A-04) | test-verified (`tests/class-force-v2-alchemy-atomicity.test.mjs`, run: 9 checks passed) | `scripts/apps/force-alchemy/force-alchemy-mechanics-service.js:441` |
| R-FRC-13 | Force traditions | `scripts/apps/force-tradition/force-tradition-picker.js`, `custom-force-tradition-wizard.js` | OBSERVED | source-inspected | `scripts/apps/force-tradition/force-tradition-picker.js:397` |
| R-FRC-14 | Force power resolution schema v1 | `scripts/engine/force/force-power-resolution-schema.js` | APPROVED (`docs/architecture/force-power-resolution-v1.md`) · UNIMPLEMENTED at runtime (test-only import) | dependency-traced | `docs/architecture/force-power-resolution-v1.md:3` |
| R-FRC-15 | Runtime repairs of Force suite / derived calc | `scripts/engine/force/force-suite-runtime-repairs.js` · `registerForceSuiteRuntimeRepairs` | OBSERVED · CONFLICT (A-09) | behavior-code-verified | `index.js:102`, `scripts/engine/force/force-suite-runtime-repairs.js:176`, `scripts/engine/force/force-suite-runtime-repairs.js:271` |

## 3. Authorities

- **Canonical data:** Force powers/techniques/secrets packs; Force V2 bookwise definitions (`docs/audits/force-v2/bookwise-v2.9/README.md`) are certification evidence, not runtime data — OBSERVED.
- **Rules:** Force Point use contracts and FP-RD-001…015 owner rulings (`docs/audits/swse-rules-decisions-pending.md:3667` onward) — APPROVED where ruled; FP-RD-015 provisional (`docs/audits/class-force-v2-integration-matrix-2026-11-22.md:11`).
- **Calculation:** `ForcePointsService` (availability, die size, gain/spend math) — OBSERVED; FP max formula duplicated (F-FRC-002).
- **Mutation:** FP balance and receipts — ActorEngine (APPROVED · OBSERVED, single writer for the normal balance, pinned by `tests/class-force-v2-direct-fp-writer-classification.test.mjs`). Bonus pool and DSS have **no single writer** (F-FRC-003, F-FRC-004). Credits in Alchemy bypass TransactionEngine (F-FRC-005).

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `DSPEngine` | `scripts/engine/darkside/dsp-engine.js:199` (`getValue`) | 33 | pure read/caps; "NO MUTATION" |
| `ForcePointsService` | `scripts/engine/force/force-points-service.js:242` (`authorizeSpend`) | 15 | pure decision; `calcGain` `:564` |
| `ActorEngine.spendForcePoints` | `scripts/governance/actor-engine/actor-engine.js:2116` | (governance) | typed context required; one receipt |
| `ForceEngine.spendForcePoint` | `scripts/engine/force/force-engine.js:22` | 3 | delegating wrapper (spend+finalize); refuses untyped |
| `ForceExecutor` | `scripts/engine/force/force-executor.js:195` (`executeForcePower`) | 11 | power execution + ~15 Force talent actions |
| `calculateMaxForcePointsForBuildPlan` | `scripts/data/force-points.js:87` | 3 (progression) | FP max at chargen/level-up |
| `registerForceExecutorChatHooks` | `scripts/engine/force/force-executor.js:1679` | 1 (`index.js:237`) | deleteCombat cleanup + chat buttons |
| `registerForceSuiteRuntimeRepairs` | `scripts/engine/force/force-suite-runtime-repairs.js:607` | 1 (`index.js:102`) | runtime patches + render hooks |

## 5. Dependencies

- **Allowed (PROPOSED):** governance/ActorEngine, store/TransactionEngine (credits), rolls, chat/SWSEChat, data-registries, houserules via `HouseRuleService`/`ForceRules` (A-06 compliant: `scripts/engine/force/ForceRules.js:91`).
- **Prohibited:** engine→UI (A-07), patching `DerivedCalculator` or own executor at runtime (A-09), direct credit writes (A-10).
- **Observed violations:** `force-executor.js` → `scripts/apps/dialogs/swse-dialog-v2.js`; `force-suite-runtime-repairs.js` → `scripts/sheets/v2/character-sheet/force-roll-dialog.js` (`scripts/engine/force/force-suite-runtime-repairs.js:5`); talents → Force Alchemy app (B-TAL F-TAL-008).

## 6. Integration points and lifecycle

- `index.js:102` `registerForceSuiteRuntimeRepairs()` (init); `index.js:237` `registerForceExecutorChatHooks()`.
- Gated, compliant: `force-power-hooks.js` createItem/preUpdateActor/updateActor/deleteItem (`userId`), restCompleted/updateCombat (`isResponsibleGm`) — `scripts/infrastructure/hooks/force-power-hooks.js:57`, `:94`, `:100`, `:129`, `:135`, `:150`.
- **Ungated:** `deleteCombat` in `force-executor.js:1683` (10 sequential writes per combatant on every client) (F-FRC-006).
- Render hooks: `renderSWSEV2CharacterSheet` and `renderApplicationV2` both bound to the same two DOM repair functions (`force-suite-runtime-repairs.js:616-619`) → each character sheet render runs each repair twice (F-FRC-008); `force-tradition-picker.js:397-400`.
- Recovery: FP receipts reconciled on `ready` (integration matrix §7).

## 7. Failure behavior and domain invariants

- FP spend: rejected/thrown write is never treated as paid; applied-then-threw is indeterminate and left `committed` for GM reconciliation (`actor-engine.js` comments at spend). Alchemy: explicitly **not atomic across documents**, recoverable by inverse delta, unresolved ⇒ GM review (`docs/audits/class-force-v2-integration-matrix-2026-11-22.md:260`).
- A-02 in `force-executor.js`: 16 direct flag sites (F-FRC-006/007). A-05: Alchemy chat `:1201`, `:1418`. A-10: Alchemy credits (F-FRC-005).
- A-16: no cache findings in FRC.
- A-18: Force powers do not add ½ heroic level by default — not contradicted by any site read in this audit (not exhaustively verified).
- PROPOSED INV-FRC-1: exactly one writer each for normal FP, bonus FP pool, DSS. INV-FRC-2: every lifecycle write runs on the responsible GM or the originating user only (the `force-power-hooks.js` pattern).

## 8. Level C subsystem contracts

- **C-FRC-1 Force Point transaction:** `ForcePointsService.authorizeSpend(actor, ctx)` → decision; `ActorEngine.spendForcePoints(actor, n, ctx)` → receipt (`committed`); `finalizeForcePointSpend` / `rollbackForcePointSpend`; triggers via `dispatchForcePointTriggers`. Status: APPROVED (FP-RD) · OBSERVED · FOUNDRY_ACCEPTANCE_REQUIRED (rows A1–A3, J2, L1).
- **C-FRC-2 Bonus FP pool:** storage `flags.swse.bonusForcePoints` `{entries[{id,source,value,max,expires,encounterId}], value, max, sources, note}`; producers: Force Flow, talents, feats; consumer/debit: `spendForcePoints`. Status: OBSERVED · CONFLICT — six builders, two flag scopes (F-FRC-003).
- **C-FRC-3 Dark Side Score:** `DSPEngine.getNextValue` (pure) → caller writes `system.darkSide.value` (+ optional `system.dspLog`). Status: OBSERVED · CONFLICT — no mutation API (F-FRC-004).
- **C-FRC-4 Force Alchemy cost settlement:** FP via V2 receipt, DSS+credits in one actor write, compensation by inverse delta. Status: OBSERVED · CONFLICT (A-10) · FOUNDRY_ACCEPTANCE_REQUIRED (row J1).

## 9. Tests and certification

Offline tests (27 in domain facts), incl. `tests/force-point-transaction-integrity.test.mjs`, `tests/force-v2-03b-transaction-behavior.test.mjs`, `tests/force-v2-03c-suite-recovery.test.mjs`, `tests/force-v2-03d-maintained-effects.test.mjs`, `tests/class-force-v2-receipt-reconciliation.test.mjs`, `tests/class-force-v2-alchemy-atomicity.test.mjs`, `tests/class-force-v2-direct-fp-writer-classification.test.mjs`, `tests/dsp-engine-behavior.test.mjs`, `tests/force-v2-release-gate.test.mjs`. Run during this audit: transaction-integrity, alchemy-atomicity, direct-fp-writer-classification — passed (offline only).
**Foundry acceptance:** `docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md` defines rows A1–A3, B1, C1–C7, D1, E1–E2, F1, G1–G2, H1–H2, I1, J1–J2, K1, L1; title "to be executed; nothing below is certified". `docs/audits/class-force-v2-live-run-setup-and-evidence.md` contains result templates only (`:71`). Every row is `FOUNDRY_ACCEPTANCE_REQUIRED`.

## 10. Reconciliation with existing contracts

Agreements: `force-power-resolution-v1.md:3` says the schema "does not change live Force power execution" — matches (schema module is test-only). Integration matrix §7 open items (cross-client delivery not exactly-once; Alchemy not atomic) — matches code. FP-RD rulings — `ActorEngine.spendForcePoints` implements typed contracts and receipts as described.

| ID | Existing source | Claim | Observed | Status |
|---|---|---|---|---|
| CR-FRC-01 | `docs/audits/class-force-v2-integration-matrix-2026-11-22.md:3`, `:14` | Branch "Not for `main`"; "`main` is untouched; the branch is not authorized for merge" | `f734b4d` is "Merge integration/class-force-v2-20261122 into main" | CONFLICT (doc stale or merge unauthorized — owner to confirm) |
| CR-FRC-02 | `scripts/data/force-points.js:9-14`, `:36-38` ("DO NOT CHANGE"; "Once prestige base is unlocked (6), it NEVER downgrades"; recalc in chargen-class.js/levelup-class.js) | Persistent base-6/7 marker; named recalc triggers | The only writers of `hasPrestigeFPBonus`/`hasBase7FP` are functions with no callers (`calculateMaxForcePoints`, `:53`); named trigger files are retired V1 apps; progression uses `calculateMaxForcePointsForBuildPlan` which only reads the flags | CONFLICT |
| CR-FRC-03 | `tests/class-force-v2-direct-fp-writer-classification.test.mjs:1-3` | Pins every direct Force Point writer | Scans only the normal balance; bonus pool writers unguarded (see B-TAL CR-TAL-01) | CONFLICT |

## 11. Phase 2 conformance summary

| ID | Sev | Title |
|---|---|---|
| F-FRC-001 | info | Force Point **normal balance** has a single authority — duplicate-authority lead for spend is not confirmed (wrappers delegate) |
| F-FRC-002 | high | FP max formula duplicated; `ForcePointsService.getMax` has no callers, so the `dailyForcePoints` house rule never takes effect |
| F-FRC-003 | critical | Bonus FP pool: six independent builders, two flag scopes (see F-TAL-007), guard does not cover it |
| F-FRC-004 | medium | Dark Side Score mutation has no owner: 7 live writer modules with divergent logging/capping |
| F-FRC-005 | high | Force Alchemy debits credits via `ActorEngine.updateActor` with a 6-path heuristic, not TransactionEngine (A-10); line 462 itself is an in-memory payload (false positive) |
| F-FRC-006 | medium | `force-executor.js` direct flag writes (16) incl. ungated `deleteCombat` cleanup |
| F-FRC-007 | medium | `ForceExecutor` mixes Force power execution with ~15 talent actions (1,740 lines) |
| F-FRC-008 | medium | `force-suite-runtime-repairs.js` patches `ForceExecutor.executeForcePower`, `_generateForcePowerRollMessage`, `DerivedCalculator.computeAll`; DOM repairs on every AppV2 render (twice per sheet); guarded by a stack-sniffing hotfix |
| F-FRC-009 | medium | `scripts/data/force-points.js`: write-in-calculation functions with no callers; stale design header |
| F-FRC-010 | low | Unreachable cluster: `components/force-suite.js`, `utils/force-points.js`, `utils/force-enhancement-*`, `forceful-recovery-picker.js` |
| F-FRC-011 | low | Alchemy direct `ChatMessage.create` (A-05) and direct state `setFlag` from an apps/ service (A-02/A-04) |
| F-FRC-012 | info | Documentation consolidation candidates |

## 12. Unimplemented, deferred and acceptance-required items

- U-FRC-01 Force power resolution schema v1 not used at runtime (`docs/architecture/force-power-resolution-v1.md`).
- U-FRC-02 Forceful Recovery picker unreachable (`scripts/apps/dialogs/forceful-recovery-picker.js`, only importer is an orphan feat module).
- U-FRC-03 `dailyForcePoints` house rule registered (`scripts/core/settings.js:240`) but without effect on the stored maximum.
- DEFERRED_RULES_REVIEW (existing): FP-RD-015 Last Grasp timing/cap (`OWNER_CONFIRMATION_PENDING`), FP-RD-003 uncertified abilities, FP-RD-013 Temptation of the Dark Side. New, no register ID: whether the base-6/7 Force Point base persists after a prestige class is removed (header says "never downgrades"; live code no longer writes the marker) — owner decision; not resolved here.
- FOUNDRY_ACCEPTANCE_REQUIRED — exact rows from `docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md`: A1 spend+finalize; A2 failed paid roll rollback; A3 round cap; B1 Destiny ledger separation; C1 Temptation mark (needs live roll stack); C2 Temptation spend window/owner prompt; C3 initiative reorder; C4 late delivery/reload; C5 concurrent FP+Destiny receipts; C6 two Sith Lords mutual marks (live needed); C7 capped condition track; D1 GM world time only; E1 Serenity; E2 Prophet review; F1 immunities; G1 reactions (verified event, non-owner refused); G2 reaction settlement on finalize failure; H1 WatchCircle Initiate; H2 Drain Force; I1 Last Grasp/Emergency Patch (provisional FP-RD-015); J1 Force Alchemy multi-resource costs with injected failures (not claimed atomic); J2 receipt reconciliation; K1 retired legacy entry points absent; L1 cross-client repeat of C2/C4/G1 ("cannot be proven offline"). Matrix "not covered" list: Alchemy multi-resource atomicity; Last Grasp timing/cap exceptions; unresolved reaction receipts after a client closes; reactions other than Block/Deflect/Force Fortification rely on chat-dataset context. Additional rows proposed by this audit: Guardian Spirit + spend (F-FRC-003), `dailyForcePoints` on/off (F-FRC-002), two-client `deleteCombat` (F-FRC-006).

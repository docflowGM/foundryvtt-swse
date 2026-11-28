# Transaction & Progression SSOT — Phase 1 current-branch audit (2026-11-27, HEAD 9cb48c225)

Addendum: "SWSE V2 — Transaction & Progression SSOT Rolling Plan" (owner-supplied; a proposed architecture, not a verified implementation). This audit records facts about the branch; it states no SWSE rule. Sourcebook figures in the addendum (droid allowance, class credits, Wealth timing) are illustrative and **unverified** (rules register TPS-RD-001).

## 1. What exists today
- **TransactionEngine** (`scripts/engine/store/transaction-engine.js`, thin coordinator): executes mutation (purchase), credit adjustment, credit transfer, asset customization/approval/sale, rollback correction; per-client in-flight lock; snapshot-before-mutate recovery; verified rollback/compensation. It has **no provisional/draft ledger, no grant provenance, no restricted or expiring funds, no allocation priority**. (Search for provisional/restricted/expiring/allocation in `scripts/engine/store/**` finds only store availability classes and purchase lots.)
- **ActorEngine** applies plans (`applyMutationPlan`) and owns the persistent credit field writes for the store path.
- **Mannequin** (`shell/mannequin/mannequin-builder.js`): non-persistent plan application for derived stats; carries credits only as the plan's `system.credits` result, no ledger.

## 2. Credit writers outside TransactionEngine/ActorEngine (competing authorities)
| Site | What it does | Concern |
|---|---|---|
| `shell/mutation/progression-economy-plan-builder.js` (`computeStartingCredits`, `computeWealthCreditGrant`, `computeLevelupWealthCreditGrant`, `resolveFinalStartingCredits`, level-up `creditDelta` inference) | computes class/background/Wealth credits and writes `system.credits` into the progression plan | grant arithmetic and eligibility inside progression; no provenance beyond a `creditSources` display array |
| `shell/progression-finalizer.js` (`_resolveFinalStartingCredits`, starting-credit and level-up credit blocks, ~L1541/L1639) | a second copy of the same starting/level-up credit logic | duplicate of the plan builder (two implementations of one rule) |
| `steps/summary-step.js` (credit preview, `_buildLevelupCreditPreview`, `system.credits: nextCredits` ~L1734) | preview arithmetic + a plan value | third formula site (display) |
| `engine/progression/content/progression-content-authority.js#getStartingCredits` | class + background starting credits | content authority (intended source) |
| `engine/progression/engine/equipment-engine.js` (L68), `engine/abilities/progression/progression-event-processor.js` (L411) | direct `system.credits` writes | progression-side direct writes |
| `apps/follower-creator.js` (L961-968, L1616-1622) | sets follower `system.credits` | follower lifecycle write |
| `domain/vehicles/vehicle-modification-factory.js` (L203) | `plan.set['system.credits']` | vehicle plan write |
| `sheets/v2/character-like-sheet.js` (L6087), `actor-sheet-base.js` (L1958) | sheet credit edits/reset | sheet-side writes |
| `droid-builder-adapter.js` (L59-60: `remaining = ProgressionRules.getDroidConstructionCredits() - spent`), `droid-builder-view-model.js`, `projection-engine.js` (L241), `progression-finalizer.js` (L985, L2809), `follower-creator._resolveFollowerDroidCredits`, `store-droid-construction.js` | droid construction budget arithmetic, `droidCredits` {total, spent, remaining, lost, allowOverflow} | an independent provisional financial authority held in progression/droid state, not TransactionEngine |

## 3. Facts relevant to the addendum
- The droid construction allowance is a **setting-backed number** (`ProgressionRules.getDroidConstructionCredits`), consumed as a single pool with an `allowOverflow` flag; there is no grant record, no category restriction and no expiry mechanism in code.
- Wealth/talent credit grants carry only a label in a `creditSources` array and a progression-history flag that stops level-up re-granting level 1.
- `store-droid-construction.js` already treats client-held costs/flags as untrusted at purchase time (server-side quote) — reusable for Phase 4.
- Finalization already snapshots and verifies rollback for the store path; the progression finalizer has its own recovery path (not routed through `TransactionEngine`).

## 4. Unverified / owner decisions (not decided here)
- **TPS-RD-001 (rules register):** which grants are restricted, their eligible categories, expiry at finalization, amounts, and Wealth/class-credit timing are *published-rule questions*. The ledger mechanism built in Phase 2 takes these as **caller-supplied grant attributes** and hard-codes none of them.
- UI presentation of the final droid-customization prompt (addendum: recommendation only).
- Foundry persistence/rollback semantics across actor and item documents remain FOUNDRY_ACCEPTANCE_PENDING.

## 5. Plan status
1. Audit — this document.
2. Provisional ledger in TransactionEngine — mechanism implemented offline (`scripts/engine/store/provisional-ledger.js`, `TransactionEngine.createProvisionalLedger`), tests `provisional-ledger.test.mjs`.
3. Progression integration (route starting/class/talent grants through the ledger; remove the finalizer/plan-builder duplicate and direct writers) — next.
4. Droid Builder integration, 5. deferred purchasing UX, 6. atomic finalization, 7. enforcement tests — after 3.

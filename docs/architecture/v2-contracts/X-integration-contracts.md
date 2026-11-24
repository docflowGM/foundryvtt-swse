# Cross-domain integration contracts (reconciled)

Contracts for flows that cross domain boundaries. Each names the **single** authority at each step, the interface, and its status. Domain internals are in the `B-*` contracts. Line numbers are at `f734b4d`.

## X-01 — Actor and owned-item mutation (all domains → ActorEngine)

| Step | Authority | Interface | Status |
|---|---|---|---|
| Domain decides *what* changes | owning domain engine | builds an update payload or mutation plan; performs no document write | APPROVED (A-02) |
| Gate | `ActorEngine` (`scripts/governance/actor-engine/actor-engine.js:83`, object export) | `updateActor` `:570` · `updateEmbeddedDocuments` `:859` · `updateOwnedItems` `:932` · `createEmbeddedDocuments` `:940` · `deleteEmbeddedDocuments` `:986` · `applyMutationPlan` `:3259` · **flags:** `updateActorFlags` `:4114`, `unsetActorFlag` `:4160` | APPROVED · OBSERVED |
| Exceptions | world documents not owned by an actor; Foundry-only operations | must carry an inline comment naming the exception | APPROVED (OSI) |

Conformance: 331 live direct-write sites outside the gate (`P-A02`); 203 of them are `setFlag`/`unsetFlag`, for which the governed equivalents above already exist. **CONFLICT** — classified per domain in Phase 2.

## X-02 — Progression finalization (progression → ActorEngine)

`ProgressionShell` (session/draft state) → `ProgressionFinalizer._compileMutationPlan` (`scripts/apps/progression-framework/shell/progression-finalizer.js:325,416`) → domain PlanBuilders (pure) → `_applyMutationPlan` (`:477`) → `ActorEngine.applyMutationPlan` (`actor-engine.js:3259`, transactional with rollback attempt). Source: `docs/architecture/progression-architecture.md` (APPROVED). Mid-wizard actor writes and runtime prototype patches are recorded as conflicts in `B-PRG` and `CR-07`.

## X-03 — Credits, purchases, sales and trades (store/vehicles/force alchemy/progression → TransactionEngine)

Single authority: `TransactionEngine` (`scripts/engine/store/transaction-engine.js`): `executeMutationTransaction` `:308`, `executeCreditAdjustment` `:557`, `executeCreditTransfer` `:719`, `executeAssetCustomizationTransaction` `:960`, `executeAssetApprovalTransaction` `:1221`, `executeSaleTransaction` `:1461`, `executeAssetSaleTransaction` `:1600`, `executeRollbackCorrection` `:1871`. TransactionEngine applies through ActorEngine (19 ActorEngine call sites). Rule: **atomic or nothing** (OSI). Status: APPROVED · CONFLICT (candidate) — 15 credit-payload sites outside TransactionEngine (`P-A10`), assessed in `B-STO`.

## X-04 — Item customization (UI → workflow → upgrade authority → ActorEngine)

`ItemCustomizationWorkbench` / `CustomizationBayApp` (presentation) → `CustomizationWorkflow` → `UpgradeSlotEngine` (slot math) and `UpgradeService` (`scripts/engine/upgrades/UpgradeService.js`, install/remove; `removeUpgrade` `:715`) → ActorEngine owned-item updates; paid customization → `TransactionEngine.executeAssetCustomizationTransaction`. Droid and vehicle customization engines are peers, not alternatives. Status: APPROVED (OSI, A-17).

## X-05 — Combat resolution (combat → damage → ActorEngine)

Attack options and action economy in combat engines → damage packet (`canonical-damage-packet`) → `DamageResolutionEngine` / `DamageMitigationManager` → `ActorEngine.applyDamage` (`actor-engine.js:1421`), `applyHealing`, `setConditionStep`, `applyConditionShift`, `updateActionEconomy`. Vehicles are **adapters** over the same authorities (`docs/architecture/combat-authority-map.md`, guarded by `tests/architecture-combat-authority.test.mjs`). Status: APPROVED · the gate-vs-orchestrator question is `CR-04`.

## X-06 — Force points and Force powers (force/talents/combat → one Force-point authority)

Force-point spend/gain/rescue/receipt reconciliation exists in `ActorEngine` (`spendForcePoints`, `gainForcePoints`, `reconcileForcePointReceipt`, `rollbackForcePointSpend`, `finalizeForcePointSpend`) **and** in `scripts/engine/force/force-points-service.js` and `scripts/data/force-points.js`. Which one is the single authority, and which are delegating facades, is established in `B-FRC`. Force V2 is offline-validated, **FOUNDRY_ACCEPTANCE_REQUIRED**.

## X-07 — Actions (all action sources → one action pipeline)

`ActionRegistry` (`scripts/engine/actions/action-registry.js:65`, definitions) → `ActorActionResolver` (`actor-action-resolver.js:101`, entitlement) → `ActionAvailabilityEngine` (`action-availability-engine.js:396`, availability) → execution handlers; effects routed, not reimplemented. Source: `docs/architecture/action-authority-v1.md` (groundwork; APPROVED as far as implemented). `scripts/patches/combat-ui-behavior-hotfix.js` is a compatibility bridge pending convergence (`docs/combat-features-reform-phase-0.md`).

## X-08 — House rules and settings (all engines → HouseRuleService)

Engines read house rules only through `HouseRuleService` (`scripts/engine/system/HouseRuleService.js`, 76 importers). Registration lives in `scripts/houserules/houserule-settings.js` and `scripts/core/*`. Status: APPROVED (ENGINE-ARCHITECTURE §3) · CONFLICT (`CR-06`).

## X-09 — Gameplay chat (all domains → swse-chat)

`SWSEChat` (`scripts/chat/swse-chat.js`): `postRoll` `:291`, `postHTML` `:353`, `postDialogue` `:381`, `postNarration` `:417`. Status: APPROVED (ARCHITECTURE §II) · CONFLICT (43 sites, `P-A05`).

## X-10 — Advisory systems (mentor/suggestion → progression, read-only)

Suggestion and mentor engines read actor/progression state and return advice; they never mutate the actor or the progression session's committed state. Source: ENGINE-ARCHITECTURE §10 "Suggestion Engine Contract". Status: APPROVED · see `B-MEN` (24 live direct-write sites in that domain).

## X-11 — Notifications (domains → Holonet)

Domains publish through Holonet emitters/sources (`scripts/holonet/emitters/**`, `holonet-source-registry.js`); the UI reads Holonet state; Holonet owns delivery and read state only. Status: PROPOSED (formalizing observed structure; see `B-HOL`).

## X-12 — Canonical data (data registries → all domains)

Canonical records (feats `data/canonical/feats.json`, talents, species, classes, Force powers, items) are read through registries (`scripts/engine/registries/*`, `scripts/data/**`). Domains may cache presentation data with an invalidation key (A-16) and never become co-authorities (A-01). Generic loaders (`systems/foundryvtt-swse/data/${filename}`) make static proof of data use impossible; Phase 2 recommends explicit manifests (see `B-DAT`).

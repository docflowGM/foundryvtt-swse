# B-ABL — abilities-effects (AbilityEngine, ModifierEngine, active effects, rule collectors)

**Level:** B with embedded C. **Audited commit:** `f734b4d` (code identical at HEAD). **Sidecar:** `data/audits/architecture-census/contracts/domains/abilities-effects.json`. **Facts:** 129 files, 91 runtime modules (60 reachable, 31 unreachable), 12,801 runtime SLOC.

## 1. Purpose and boundaries

abilities-effects owns: modifier collection/aggregation/breakdown (`ModifierEngine`, `ModifierTypes`, `ModifierUtils`, `modifier-breakdown-builder`); ability acquisition evaluation (`AbilityEngine`); the PASSIVE/ACTIVE/RULE ability execution model (`scripts/engine/abilities/**` adapters, contracts, `ability-execution-coordinator.js`); rule-instance enums and definitions (`scripts/engine/execution/rules/**`); SWSE-managed effect intents (`scripts/dialogs/entity-dialog/effect-intent-engine.js`) and runtime active-effect normalization (`scripts/utils/active-effect-change-utils.js`); capability registry.

It must **not** own: persistence (ActorEngine, A-02), derived totals (actor-core computes; ABL supplies modifiers), weapon/combat rules (combat), credit grants (A-10), chat (A-05).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-ABL-01 | Collect all modifiers for an actor (items, effects, passives, weapons, encumbrance, armor usage) | `scripts/engine/effects/modifiers/ModifierEngine.js` · `ModifierEngine.getAllModifiers` / `collectModifiers` | OBSERVED | test-verified (`tests/modifier-engine-signature-reuse.test.mjs`) | `scripts/engine/effects/modifiers/ModifierEngine.js:308`, `:393` |
| R-ABL-02 | Aggregate/resolve modifier totals with stacking rules | `ModifierEngine.aggregateAll` / `resolveTarget`; `ModifierTypes.getStackingRule`; `ModifierUtils.sumModifiers` | OBSERVED | test-verified (`tests/modifier-total-breakdown-parity.test.mjs`) | `…/ModifierEngine.js:548`, `:575`, `:644` |
| R-ABL-03 | Modifier breakdown/ledger for UI | `modifier-breakdown-builder.js` | OBSERVED | test-verified (`tests/modifier-breakdown-builder.test.mjs`) | `…/ModifierEngine.js:756` |
| R-ABL-04 | Modifier cache keyed by actor source signature (A-16) | `ModifierEngine._modifierSourceCache` + `clearCaches` | OBSERVED | behavior-code-verified | `…/ModifierEngine.js:38`, `:74`, `:121` |
| R-ABL-05 | Feat/talent/prestige acquisition evaluation | `scripts/engine/abilities/AbilityEngine.js` · `evaluateAcquisition` | OBSERVED | test-verified (`tests/ability-engine-acquisition.test.mjs`) | `scripts/engine/abilities/AbilityEngine.js:204` |
| R-ABL-06 | Passive ability registration before derived calc | `scripts/engine/abilities/ability-execution-coordinator.js` · `registerActorAbilities` | OBSERVED | dependency-traced | `scripts/actors/v2/base-actor.js:79` |
| R-ABL-07 | Derived overrides (ADD-only) after calculators | `scripts/engine/abilities/passive/derived-override-engine.js` · `DerivedOverrideEngine` | OBSERVED | source-inspected | `scripts/engine/abilities/passive/derived-override-engine.js:125` |
| R-ABL-08 | Managed effect intents → modifier data; turn/combat-end expiry | `scripts/dialogs/entity-dialog/effect-intent-engine.js` · `EffectIntentEngine` | OBSERVED · CONFLICT (A-02, location) | behavior-code-verified | `scripts/dialogs/entity-dialog/effect-intent-engine.js:991`, `:1459`; `scripts/infrastructure/hooks/combat-hooks.js:305` |
| R-ABL-09 | Rule enum and parameter definitions | `scripts/engine/execution/rules/rule-enum.js`, `rule-definitions.js` | OBSERVED | source-inspected | `scripts/engine/execution/rules/rule-enum.js:78`, `scripts/engine/execution/rules/rule-definitions.js:242` |
| R-ABL-10 | Progression-event ability effects (e.g. lineage credit awards) | `scripts/engine/abilities/progression/progression-event-processor.js` | OBSERVED · CONFLICT (A-10, A-05) | behavior-code-verified | `scripts/engine/abilities/progression/progression-event-processor.js:405`, `:422` |
| R-ABL-11 | Runtime AE change normalization | `scripts/utils/active-effect-change-utils.js` · `normalizeActiveEffectDataForRuntime` | OBSERVED | source-inspected | `scripts/governance/actor-engine/actor-engine.js:28` |
| R-ABL-12 | Activation limits / durations (in-memory) | `ActivationLimitEngine.js`, `active/duration-engine.js` | OBSERVED | source-inspected | `scripts/engine/abilities/active/duration-engine.js:78` |

## 3. Authorities

- **Canonical data:** ability definitions are item data (feats/talents/species/force domains); ABL owns only the *execution-model schema* (`passive-contract.js`, `active-contract.js`, `rule-definitions.js`). OBSERVED.
- **Rules:** none; ABL applies modifier/stacking semantics declared in `ModifierTypes.js` (`STACKING_RULES`). Changing stacking is an owner/rules decision (CLAUDE.md §3). OBSERVED.
- **Calculation:** ModifierEngine is the sole modifier aggregator; ModifierUtils is its arithmetic helper (delegation, not duplicate — `ModifierEngine.js:575`). OBSERVED.
- **Mutation:** none legitimately; AE writes must go through `ActorEngine.create/update/deleteActiveEffects` (A-02). One live bypass (F-ABL-001).

## 4. Public interfaces

| Symbol | path:line | Importers | Contract |
|---|---|---:|---|
| `ModifierEngine` | `scripts/engine/effects/modifiers/ModifierEngine.js:308` (`getAllModifiers`) | 31 | async, cached by `getActorModifierSourceSignature` (`:121`); returns cloned arrays (`:314`) |
| `ModifierEngine.aggregateAll` / `resolveTarget` | `…/ModifierEngine.js:548` / `:644` | (via 31) | totals by target |
| `ModifierEngine.clearCaches(actorId?)` | `…/ModifierEngine.js:74` | — | invalidation |
| `ModifierTypes` (`ModifierType`, `STACKING_RULES`, `createModifier`) | `scripts/engine/effects/modifiers/ModifierTypes.js` | 18 | schema |
| `AbilityEngine.evaluateAcquisition` / `canAcquire` | `scripts/engine/abilities/AbilityEngine.js:204` / `:357` | 45 | pure evaluation, acquisition cache (`:182`) |
| `RULES` | `scripts/engine/execution/rules/rule-enum.js` | 11 | rule type ids |
| `EffectIntentEngine` | `scripts/dialogs/entity-dialog/effect-intent-engine.js` | 11 | intent ⇄ modifier data; expiry |
| `AbilityExecutionCoordinator.registerActorAbilities` | `scripts/engine/abilities/ability-execution-coordinator.js` | 4 | in-memory registration |

## 5. Dependencies

- Allowed (PROPOSED): infrastructure, data-registries, actor-core *reads* (derived values, level-split), equipment/droid/vehicle *read gates*.
- Prohibited: ModifierEngine → combat engines (ENGINE-ARCH §4; global CR-05); engines → `scripts/dialogs/**` (A-07).
- Observed: `ModifierEngine.js:19` → `weapons-engine.js` (cycle F-ACT-001); `ModifierEngine.js:31` and `active-effect-adapter.js` → `scripts/dialogs/entity-dialog/effect-intent-engine.js` (A-07 hit; the target is an engine filed under dialogs — F-ABL-003).

## 6. Integration points and lifecycle

- Prepare: `SWSEV2BaseActor.prepareDerivedData` → `registerActorAbilities` (`base-actor.js:79`) → `DerivedCalculator.computeAll` → `ModifierEngine` → `DerivedOverrideEngine`.
- Hooks (INF): `actor-hooks.js:70,122,146` re-register passives; `combat-hooks.js:305,311,371` expire managed effects at turn start / combat end (GM only, `effect-intent-engine.js:1460`).
- `ready`: `scripts/ui/ability-keyword-highlighter.js:148`.

## 7. Failure behavior and invariants

A-01 (single modifier aggregator — held), A-02 (violated at F-ABL-001), A-05/A-10 (violated at F-ABL-002), A-07 (F-ABL-003), A-16 (cache keyed and cleared — held, `ModifierEngine.js:74-93`), A-18 (dead crit-confirm rule module, F-ABL-004). Passive registration errors are caught and logged (`base-actor.js:80-82`); derived continues without them.

## 8. Level C subsystem contracts

- **C-ABL-1 Modifier pipeline** — ModifierEngine ⇄ sources. Interface: sources return `createModifier(...)` objects (`ModifierTypes.js`); ModifierEngine owns stacking and totals. Status: OBSERVED. Weapon modifiers are pulled from `WeaponsEngine.getWeaponModifiers` (`ModifierEngine.js:1640`) — PROPOSED inversion (source registration) to break the cycle.
- **C-ABL-2 Effect intents** — EffectIntentEngine ⇄ ModifierEngine: `hasIntent`, `toModifierData`, `toContextualModifierData` (`ModifierEngine.js:472-486`). Status: OBSERVED; PROPOSED relocation to `scripts/engine/effects/`.

## 9. Tests and certification

`tests/modifier-engine-signature-reuse.test.mjs`, `tests/modifier-total-breakdown-parity.test.mjs`, `tests/modifier-breakdown-builder.test.mjs`, `tests/ability-engine-acquisition.test.mjs`, `tests/ability-engine-acquisition-cache-derived-coherency.test.mjs`, `tests/armor-shield-acp-authority.test.mjs`, `tests/class-force-v2-active-adapter-cutover.test.mjs`. None cover effect expiry persistence or lineage credit awards. Foundry acceptance: none (FOUNDRY_ACCEPTANCE_REQUIRED for turn-start effect expiry, active effects as runtime-risk area).

## 10. Reconciliation

Agreements: ENGINE-ARCHITECTURE §1 "ModifierEngine — modifier resolution, penalty stacking" matches R-ABL-01/02. `docs/systems/ABILITY_SCHEMA_AUTHORITY.md` (evidence) matches the execution-model split.

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-ABL-01 | ENGINE-ARCHITECTURE.md §4 (= CR-05) | ModifierEngine depends only on ActorEngine | Imports WeaponsEngine, EncumbranceEngine, droid/vehicle gates, dialogs/effect-intent-engine (`ModifierEngine.js:14-31`) |
| CR-ABL-02 | ARCHITECTURE.md §III "Removing an item removes all associated modifiers" | Item-delete hook deletes `actor._passiveModifiers[item.id]` and re-registers (`actor-hooks.js:150-153`); AE-derived modifiers rely on cache signature change. Consistent; no contradiction found beyond hook redundancy (F-ACT-011). Recorded as agreement-with-caveat. |
| CR-ABL-03 | A-18 / OSI "no D&D crit confirmation" | `RULES.CRITICAL_CONFIRM_BONUS` is a live rule type (`rule-enum.js:78`, `rule-definitions.js:242`) and an unreachable rule module implements it |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-ABL-001 | high | confirmed | Managed-effect expiry writes owned ActiveEffects directly (`document.updateEmbeddedDocuments`) |
| F-ABL-002 | high | confirmed | Lineage credit awards write `system.credits` via updateActor (not TransactionEngine) and post raw ChatMessage |
| F-ABL-003 | medium | confirmed | EffectIntentEngine (1,691 lines, engine) lives in `scripts/dialogs/` — engine→UI edges are a filing error |
| F-ABL-004 | medium | confirmed | Dead legacy rule framework (`scripts/engine/rules/**`, 14 modules) incl. D&D crit-confirm rule |
| F-ABL-005 | low | confirmed | `DerivedOverrideEngine` HALF_LEVEL / ABILITY_MOD helpers diverge from actor-core helpers (latent; no live data) |
| F-ABL-006 | low | confirmed | Unreachable ABL modules (feat-definition phases, extensions, inspector UIs) |
| F-ABL-007 | info | confirmed | Probe false positives (duration-engine Map deletes) and modifier-aggregation lead (delegation) |
| F-ABL-008 | medium | confirmed | ModifierEngine (2,085 lines) mixes source collection for every domain |
| F-ABL-009 | info | confirmed | Documentation candidates |

## 12. Unimplemented, deferred, acceptance-required

- DEFERRED_RULES_REVIEW: none raised. F-ABL-005 HALF_LEVEL semantics (heroic vs character level) becomes a rules question only if a feature starts using it; not registered now.
- FOUNDRY_ACCEPTANCE_REQUIRED: managed-effect expiry at turn start (GM client), lineage credit award flow after rerouting.

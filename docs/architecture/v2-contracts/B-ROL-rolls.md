# B-ROL — rolls (dice execution, roll configuration, skill rolls)

**Level:** B. **Audited commit:** `f734b4d` (code identical at HEAD). **Sidecar:** `data/audits/architecture-census/contracts/domains/rolls.json`. **Facts:** 36 files, 24 runtime modules (14 reachable, 10 unreachable), 5,218 SLOC.

## 1. Purpose and boundaries

Owns: dice execution (`RollCore`, `RollEngine` facade), roll formula expression/transform resolution (`scripts/engine/roll/expression/**`), the roll configuration dialog model and hooks (`scripts/rolls/roll-config.js`), skill roll entry points (`scripts/rolls/skills.js`, `custom-skill-roller.js`), custom dice rolls, and roll-card rendering for chat (`scripts/engine/rolls/swse-roll-engine.js`, used by SWSEChat). Must **not** own: skill/attack totals (actor-core derived skills; combat `resolveAttackBonus`), modifier aggregation (ABL), chat persistence (CHT), Force point spending rules (force).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-ROL-01 | Execute dice formulas | `scripts/engine/roll/roll-core.js` · `RollCore.execute/executeFormula` | OBSERVED | source-inspected | `scripts/engine/roll/roll-core.js:10`, `:200` |
| R-ROL-02 | Compatibility facade for formula rolls (no rule math) | `scripts/engine/roll-engine.js` · `RollEngine.safeRoll` | OBSERVED | source-inspected | `scripts/engine/roll-engine.js:1-8`, `:22` |
| R-ROL-03 | Roll expression contributions / transforms | `scripts/engine/roll/expression/*` | OBSERVED | test-verified (`tests/roll-expression-transform-authority.test.mjs`) | `scripts/engine/roll/expression/roll-transform-resolver.js:1` |
| R-ROL-04 | Roll configuration dialog model, pre/post-roll hooks, base totals | `scripts/rolls/roll-config.js` | OBSERVED · CONFLICT (local skill total, F-ROL-001) | behavior-code-verified | `scripts/rolls/roll-config.js:746`, `:790` |
| R-ROL-05 | Skill roll entry points | `scripts/rolls/skills.js` · `rollSkill` | OBSERVED | test-verified (`tests/skill-roll-dialog-base-authority.test.mjs`) | `scripts/rolls/skills.js:191` |
| R-ROL-06 | Custom skill rolls | `scripts/rolls/custom-skill-roller.js` | OBSERVED · CONFLICT (local formula) | behavior-code-verified | `scripts/rolls/custom-skill-roller.js:27`, `:61` |
| R-ROL-07 | Roll chat-card rendering | `scripts/engine/rolls/swse-roll-engine.js` · `SWSERollEngine` | OBSERVED | source-inspected | `scripts/chat/swse-chat.js:4` |
| R-ROL-08 | Force-point add-on logic in rolls (delegates spend) | `RollCore.applyForcePointLogic` → `ForcePointSpendCoordinator` | OBSERVED | dependency-traced | `scripts/engine/roll/roll-core.js:4`, `:235` |

## 3. Authorities

Dice execution: RollCore (OBSERVED). Attack base in the dialog delegates to combat `resolveAttackBonus` (`roll-config.js:778-790`, OBSERVED — agreement). Skill base for Use the Force and custom skills is computed locally (CONFLICT, A-01). Critical-confirmation code exists but is dead (A-18, F-ROL-002).

## 4. Public interfaces

| Symbol | path:line | Importers | Contract |
|---|---|---:|---|
| `RollEngine.safeRoll` | `scripts/engine/roll-engine.js:22` | 76 | formula → Roll; optional SWSEChat |
| `RollCore` | `scripts/engine/roll/roll-core.js:10` | 22 | execution + FP logic |
| `roll-config` (`ROLL_HOOKS`, `callPreRollHook`, `RollHistory`, `getSkillTotal`, `showRollModifiersDialog`) | `scripts/rolls/roll-config.js:67`, `:746` | 27 | |
| `rollSkill` / `rollSkillWithConfig` | `scripts/rolls/skills.js:191`, `:444` | 18 | |
| `SWSERollEngine` | `scripts/engine/rolls/swse-roll-engine.js` | 2 | chat card model |

## 5. Dependencies

Allowed: ABL (modifiers), combat (attack resolution), force (FP spend coordinator), CHT (output). Observed: participates in the 6-file chat cycle (B-CHT F-CHT-002); `roll-config.js` registers global item/actor hooks (`:2090-2101`).

## 6. Integration points and lifecycle

Module-evaluation hooks in `roll-config.js:2090-2101` (`createItem`, `deleteItem`, `updateItem`, `updateActor`) invalidate `TalentBonusCache` (A-16 invalidation present). Custom roll sidebar control (`scripts/infrastructure/hooks/custom-roll-sidebar-control.js`).

## 7. Failure behavior and invariants

`RollEngine.safeRoll` throws on empty formula; roll failures notify and return `{roll:null}`. A-05 mostly held (rolls post via SWSEChat), except `roll-config.js:2238` (dead crit-confirm path). A-16: `TalentBonusCache` invalidated on every actor/item change.

## 8. Level C subsystem contracts

None beyond R-ROL-01/02.

## 9. Tests and certification

`tests/roll-expression-transform-authority.test.mjs`, `tests/skill-roll-dialog-base-authority.test.mjs`, `tests/ability-modifier-authority.test.mjs`, `tests/class-force-v2-serenity-takex-denial.test.mjs`. Foundry acceptance: roll dialogs — FOUNDRY_ACCEPTANCE_REQUIRED.

## 10. Reconciliation

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-ROL-01 | A-18 / OSI "no D&D crit confirmation" | none | `rollCriticalConfirmation` (`roll-config.js:2168`) + `getCriticalConfirmBonus` (`combat-utils.js:104`) implement confirmation; no caller (dead) |
| CR-ROL-02 | `scripts/engine/roll-engine.js:7` "must not contain rule math" | Agreement: RollEngine has none; rule math in this domain lives in `roll-config.js`/`custom-skill-roller.js` |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-ROL-001 | medium | confirmed | Local skill-total formulas: UTF component total, custom skills, dead `calculateSkillModifier` |
| F-ROL-002 | medium | confirmed | Dead D&D critical-confirmation path (A-18) |
| F-ROL-003 | low | confirmed | 10 unreachable roll modules incl. duplicate dice helpers |
| F-ROL-004 | medium | confirmed | `roll-config.js` 2,323 lines mixes dialog UI, rule fallbacks, history, hooks |
| F-ROL-005 | low | suspected (hypothesis) | Global `updateActor`/`updateItem` hooks invalidate TalentBonusCache on every change |

## 12. Unimplemented, deferred, acceptance-required

- DEFERRED_RULES_REVIEW (not yet in register; owner to register): custom skill bonus uses ½ of `system.level` (`custom-skill-roller.js:35`) while derived skills use actor-core level-split helpers — aligning them changes results for multiclass/nonheroic actors, which is a rules decision (CLAUDE.md §3).
- FOUNDRY_ACCEPTANCE_REQUIRED: roll dialogs after F-ROL-001.

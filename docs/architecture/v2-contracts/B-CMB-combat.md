# B-CMB — Combat, actions, attacks, damage, conditions (domain contract + Phase 2 conformance)

**Contract level:** B (with embedded C). **Audited commit:** `f734b4d` (scripts unchanged at HEAD `2beb7cb`). **Sidecar:** `data/audits/architecture-census/contracts/domains/combat.json`. **Census:** 172 runtime modules / 34.5k SLOC; 148 static-reachable, 21 unreachable/test-only; 96 tests.
**Evidence:** static reading; `tests/architecture-combat-authority.test.mjs` and `tests/damage-threshold-authority.test.mjs` pass offline. No `FOUNDRY_TESTED` claim (A-13).

## 1. Purpose and boundaries

Owns: attack pipeline, attack/damage math, damage packets, mitigation/DR, damage threshold, condition track rules, action economy, reactions, grapple/control state, initiative, poison and recurring damage, starship combat adapters.
Does **not** own: HP/condition persistence (ActorEngine `applyDamage`, A-02); defense totals and canonical DT/CT penalty values (actor-core derived calculators, A-03); credits (STO); weapon item data (EQP); chat rendering (A-05).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-CMB-01 | Single attack pipeline | `rollAttack` (`scripts/combat/rolls/attacks.js`, 67 consumers) | OBSERVED · CONFLICT (F-CMB-004/005) | behavior-code-verified | `scripts/combat/rolls/attacks.js:823`; `scripts/combat/rolls/enhanced-rolls.js:423` (SWSERoll.rollAttack delegates) |
| R-CMB-02 | Attack bonus math | `resolveAttackBonus` (`scripts/engine/combat/combat-roll-math.js`) | OBSERVED (`computeAttackBonus` is a wrapper) | behavior-code-verified | `scripts/combat/utils/combat-utils.js:49` |
| R-CMB-03 | Damage bonus / formula / critical multiplier | `combat-roll-math.js` (`resolveDamageBonus`, `resolveCriticalMultiplier`) | OBSERVED · CONFLICT (F-CMB-005) | behavior-code-verified | `scripts/combat/rolls/attacks.js:1160`; `scripts/combat/utils/combat-utils.js:227` |
| R-CMB-04 | Damage application boundary | `ActorEngine.applyDamage` → `DamageResolutionEngine.resolveDamage` | OBSERVED (all live paths funnel here) · CONFLICT (F-CMB-002 dormant twin) | behavior-code-verified | `scripts/governance/actor-engine/actor-engine.js:1421`, `:1447`; `scripts/actors/base/swse-actor-base.js:70`; `scripts/engine/combat/damage-engine.js:79` |
| R-CMB-05 | Damage threshold evaluation | `ThresholdEngine` (reads derived DT) | OBSERVED · CONFLICT (F-CMB-003 house-rule twin) | behavior-code-verified; test-verified (`damage-threshold-authority`) | `scripts/engine/combat/threshold-engine.js:221`, `:228`, `:318` |
| R-CMB-06 | Condition-track rules / shift | `ConditionTrackRules`, `ConditionEngine` | OBSERVED · duplicate penalty tables (F-CMB-006) | behavior-code-verified | `scripts/engine/combat/ConditionTrackRules.js:43`; `scripts/engine/combat/ConditionEngine.js:392` |
| R-CMB-07 | Action economy | `ActionEconomyConsumption` / `ActionEconomyPersistence` | APPROVED (`combat-authority-map.md`) · OBSERVED · A-02 conflict (F-CMB-001) | source-inspected | `scripts/engine/combat/action/action-economy-persistence.js:152` |
| R-CMB-08 | Combat option / feature rules | `CombatOptionResolver`, combat-features modules | APPROVED (`combat-authority-map.md`) · CONFLICT (hotfix bridge, F-CMB-007) | source-inspected | `scripts/engine/combat/features/combat-feature-handlers.js:182` |
| R-CMB-09 | Grapple/control state | `GrappleStateEngine` + `weapon-control-effects.js` | APPROVED (map) · OBSERVED | source-inspected | `scripts/engine/combat/weapon-control-effects.js:121` |
| R-CMB-10 | Initiative | `SWSEInitiative` (Combatant writes) | OBSERVED (Foundry-only world docs) | source-inspected | `scripts/engine/combat/SWSEInitiative.js:142` |
| R-CMB-11 | Action authority (definitions/availability) | `scripts/engine/actions/**` | APPROVED as groundwork only (`action-authority-v1.md`) · UNIMPLEMENTED (test-only) | dependency-traced | `docs/architecture/action-authority-v1.md:3` |

## 3. Authorities

Canonical data: weapon/actor documents (EQP/actor-core). Rules: SWSE rules via combat-stat-rules / damage-type-rules (OBSERVED; A-18 notes in §12). Calculation: combat-roll-math (attack/damage/crit), ThresholdEngine (DT check, RAW mode delegates to `system.derived.damageThreshold`), DamageMitigationManager/DR resolver. Mutation: ActorEngine.applyDamage for HP/CT/shields (OBSERVED); bookkeeping flags written directly (CONFLICT, F-CMB-001).

## 4. Public interfaces

| Symbol | Path:line | Consumers | Contract |
|---|---|---|---|
| `rollAttack` | `scripts/combat/rolls/attacks.js:823` | 67 (module) | canonical attack; returns attack result + damage workflow context |
| `resolveAttackBonus` / `resolveCriticalMultiplier` | `scripts/engine/combat/combat-roll-math.js` | 48 (module) | pure math |
| `CombatOptionResolver` | `scripts/engine/combat/combat-option-resolver.js` | 59 | attack-option rules |
| `ActionEconomyConsumption.spend` | `scripts/engine/combat/action/action-economy-consumption.js` | 58 | spend + rollback receipt |
| `DamageResolutionEngine.resolveDamage` | `scripts/engine/combat/damage-resolution-engine.js:132` | 2 (ActorEngine, CombatEngine) | resolution result (should be pure, see F-CMB-001) |
| `ThresholdEngine.evaluateThreshold` | `scripts/engine/combat/threshold-engine.js:311` | 5 | CT shift effects |
| `buildDamagePacket` | `scripts/engine/combat/damage-packet-builder.js` | 29 | packet shape |

## 5. Dependencies

Allowed: actor-core derived values, equipment item readers, effects/ModifierEngine, HouseRuleService, ActorEngine. Prohibited: engine → UI (A-07), direct `game.settings.get` in engines (A-06), direct `ChatMessage.create` (A-05).
Observed violations: 6 engine→UI edges (F-CMB-008), `combat-stat-rules.js:851` `game.settings.get` (not caught by the probe; the two probe hits in `ConditionEngine.js:13,17` and `SecondWindEngine.js:8` are comments — false positives), 11 chat sites (F-CMB-009).

## 6. Integration points and lifecycle

`combat-hooks.js` turn/round hooks (GM-gated at `scripts/infrastructure/hooks/combat-hooks.js:35`); `registerCombatUiBehaviorHotfixes` installs a document-level capture click delegate, a `SWSEChat.postRoll` monkey-patch and two `renderApplicationV2` listeners (`scripts/patches/combat-ui-behavior-hotfix.js:282`, `:646`, `:673-676`); `SWSECombatActionBrowser.init()` in init (`scripts/infrastructure/hooks/init-hooks.js:116`).

## 7. Failure behavior and invariants

A-02, A-03, A-05, A-06, A-07, A-09, A-12, A-18. Damage resolution must not persist anything before `ActorEngine.applyDamage` commits (PROPOSED as C-CMB-1); today `resolveDamage` writes encounter flags mid-resolution so a failure after resolution leaves bookkeeping applied without damage.

## 8. Level C subsystem contracts

- **C-CMB-1 Damage resolution ⇄ ActorEngine.** `resolveDamage` returns a pure result incl. bookkeeping deltas; `ActorEngine.applyDamage` persists HP/CT/shields **and** those deltas in one update. Status: PROPOSED (today CONFLICT).
- **C-CMB-2 Attack pipeline ⇄ math.** `rollAttack` consumes combat-roll-math; no other entry point computes defense/crit independently. Status: OBSERVED for live paths; CONFLICT for unreferenced SWSERoll entry points (F-CMB-005).

## 9. Tests and certification

`tests/architecture-combat-authority.test.mjs` (guards the map), `tests/damage-threshold-authority.test.mjs`, `tests/attack-transaction-rollback.test.mjs`, class-force-v2 threshold cutover tests. Gaps: no test asserts the house-rule DT equals derived DT (F-CMB-003); none covers combat-action-browser execution (F-CMB-004). Foundry acceptance: required for turn economy, reactions, damage packet application.

## 10. Reconciliation with existing contracts

Agreements: `combat-authority-map.md` (attack pipeline = `rollAttack`; damage via `ActorEngine.applyDamage`; credits → TE) — confirmed for live paths; `action-authority-v1.md` (groundwork only) — confirmed test-only.
- **CR-CMB-01** `docs/architecture/ENGINE-ARCHITECTURE.md:15,74` lists `CombatMechanicsEngine` as a Tier-1 authority; `scripts/engine/combat/CombatMechanicsEngine.js` is orphan (no importer).
- **CR-CMB-02** `ENGINE-ARCHITECTURE.md:17-18`: ThresholdEngine/DamageResolutionEngine "never own condition mutations / delegate to ActorEngine"; both write actor flags directly (`threshold-engine.js:53,598,762`; `damage-resolution-engine.js:137,346`) and ThresholdEngine also prices repairs (`threshold-engine.js:640`).
- **CR-CMB-03** `scripts/engine/combat/ARCHITECTURE.md:104` says `CombatEngine.resolveAttack()` is the ONLY attack entry point; live pipeline is `attacks.js rollAttack`; `resolveAttack` is reached only from `SWSECombat.rollAttack`, whose only caller is the orphan `scripts/components/combat-action-bar.js:251`.
- **CR-CMB-04** `combat-authority-map.md:35` lists `combat-action-bar.js` as a production entry point; it is orphan-unreferenced.
- **CR-CMB-05** `scripts/engine/combat/reactions/reaction-registry.js:8` declares "No direct ChatMessage.create()"; `:1024` does it.

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-CMB-001 | medium | confirmed | Combat bookkeeping flags written with raw setFlag/unsetFlag (damage-resolution 6, threshold 3, action-economy 2, damage.js 3, combat-status, combat-hooks, action browser) |
| F-CMB-002 | low | confirmed | `CombatEngine.applyDamage` is a second, incomplete damage writer (HP+CT only) with no caller |
| F-CMB-003 | high | confirmed | House-rule damage threshold computed independently by DerivedCalculator and ThresholdEngine with different formulas (rules question) |
| F-CMB-004 | high | confirmed | Live Combat Action Browser executes `SWSECombat.runCombatAction`, which does not exist |
| F-CMB-005 | medium | confirmed | `SWSERoll.rollAutofire`/`rollFullAttack` keep independent defense / crit-range / crit-multiplier math; no in-repo caller |
| F-CMB-006 | low | confirmed | Condition penalty table duplicated 6×; ConditionEngine diverges (step 5 = -999) on an unreachable consumer |
| F-CMB-007 | medium | confirmed | `combat-ui-behavior-hotfix.js` is a parallel action-execution path (capture click delegate, chat monkey-patch, full-round spend, clone of `applyForcedAttackOption`) |
| F-CMB-008 | low | confirmed | 6 engine→UI imports |
| F-CMB-009 | low | confirmed | 11 direct ChatMessage.create sites in 7 combat engines |
| F-CMB-010 | low | confirmed | 21 unreachable combat modules (dead / unwired adapters / test-only groundwork) |
| F-CMB-011 | low | suspected | Hotfix render listeners on every `renderApplicationV2` (performance hypothesis) |
| F-CMB-012 | info | confirmed | Combat docs superseded in part (CR-CMB-01..04) |

Multi-domain leads verdict: **defense totals** — live readers use `system.derived` via `getTargetDefense` (attacks.js); `enhanced-rolls.js:104/116` copy is an uncalled local, `:753`/`:1029` copies are on unreferenced entry points (F-CMB-005); no live duplicate. **Damage formula** — 13 sites compute different things (vehicle collision, unarmed base, packet composition); `enhanced-rolls.js:55` is an uncalled local; `computeDamageBonus` is a wrapper; no live duplicate. **CT penalty** — duplicate tables (F-CMB-006), live values agree. **Attack bonus** — wrapper + vehicle-specific math; no duplicate. **Damage application** — single live boundary; one dormant twin (F-CMB-002). **Damage threshold** — confirmed duplicate under house rule (F-CMB-003). Critical multiplier — divergent only on unreferenced paths (F-CMB-005).

## 12. Unimplemented, deferred and acceptance-required

- U-CMB-01 Action authority v1 (registry/availability/resolver) is test-only groundwork — UNIMPLEMENTED integration.
- U-CMB-02 Aid Another, Galaxy of Intrigue and Unknown Regions combat-action adapters are never registered — UNIMPLEMENTED integration (owner: wire or retire).
- DEFERRED_RULES_REVIEW (new, not yet in register): which house-rule DT formula is intended (`derived-calculator.js:913-934` adds size twice and keeps feat/Will-base adjustments; `threshold-engine.js:247-254` ignores them). Owner ruling required; no register ID found.
- A-18 observations (report only, not adjudicated): no crit-confirmation roll in live paths (`critConfirmed` is `outcome.critical`; `getCriticalConfirmBonus` in `combat-utils.js:104` is unused); lightsaber DR bypass in `scripts/engine/combat/resolvers/damage-reduction-resolver.js:170`; half heroic level on weapon damage with Force-power exclusion unless a world setting is on (`combat-stat-rules.js:880-897`); elemental/energy exclusion list at `combat-stat-rules.js:821`. Poison is not in that list — whether poison damage is excluded elsewhere was not traced (UNVERIFIED).
- FOUNDRY_ACCEPTANCE_REQUIRED: action economy, reactions, damage packet application, Combat Action Browser.

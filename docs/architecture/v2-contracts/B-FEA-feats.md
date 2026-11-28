# B-FEA — Feats domain contract (Level B, with Level C)

**Contract level:** B (domain). **Domain:** `feats`. **Audited commit:** `f734b4d` (HEAD `2beb7cb` adds only census artefacts; no runtime code differs). **Sidecar:** `data/audits/architecture-census/contracts/domains/feats.json`.
Level A invariants are referenced by ID (`A-xx`) from [`A-global-invariants.md`](A-global-invariants.md) and are not restated. No claim in this document is `live-foundry-verified`.

## 1. Purpose and boundaries

The feats domain owns **feat identity and catalog loading**, **feat prerequisites data**, **feat choice persistence** (`system.selectedChoice`), and the **feat mechanical layer**: per-family "normalization hooks" that stamp `system.abilityMeta.*` rule metadata onto actor-owned feat items, and "runtime patches" that wrap combat/skill/grapple resolvers so that those rules take effect. It also owns a small set of feat actions (condition-track recovery, Force Point feat actions, grapple feat actions) and encounter-use tracking.

The domain must **not** own: actor/owned-item persistence (A-02, ActorEngine); attack/damage math (`combat-roll-math.js` is the SSOT, per `docs/audits/combat-feat-runtime-architecture.md:24`); Force Point transactions (FRC, `ActorEngine.spendForcePoints`); Force power recovery (FRC); chat rendering (A-05); progression slot entitlement (PRG).

Scope (census): 105 runtime modules, 22,888 SLOC; 55 reachable-static, 1 reachable-dynamic, **49 orphan-unreferenced** (~9.8k SLOC). Paths: `scripts/engine/feats/**`, `scripts/engine/feat/**`, `scripts/engine/features/**`, `scripts/registries/feat-*.js`, `scripts/data/authority/feat-prerequisite-authority.js`, `scripts/data/feat-domain-guard.js`, `scripts/apps/choices/feat-choice-dialog.js`, `scripts/utils/feat-actions-mapper.js`.

## 2. Responsibility ownership

| ID | Responsibility | Owner (path · symbol) | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-FEA-01 | Canonical feat content (353 feats) | `data/canonical/feats.json` → generated `packs/feats.db`, `data/feat-catalog.json` | APPROVED (phase-5c) · OBSERVED | source-inspected | `docs/audits/phase-5c-authority-classification.md:46`, `docs/feat-pack-recovery.md:1` |
| R-FEA-02 | Runtime feat lookup / identity (canonical-id authoritative, name multimap fails closed) | `scripts/registries/feat-registry.js` · `FeatRegistry` | OBSERVED | test-verified (`tests/feat-registry-canonical-identity.test.mjs`) | `scripts/registries/feat-registry.js:63` |
| R-FEA-03 | Runtime pack recovery (seed empty pack, icon repair; GM only) | `scripts/registries/feat-pack-seeder.js` · `FeatPackSeeder` | OBSERVED · FOUNDRY_ACCEPTANCE_REQUIRED | behavior-code-verified | `scripts/registries/feat-registry.js:158`, `scripts/registries/feat-pack-seeder.js:146` |
| R-FEA-04 | Feat prerequisite data | `scripts/data/authority/feat-prerequisite-authority.js` · `FEAT_PREREQUISITE_AUTHORITY` | OBSERVED | source-inspected | `scripts/data/authority/feat-prerequisite-authority.js:4` |
| R-FEA-05 | Feat/talent domain separation guard | `scripts/data/feat-domain-guard.js` · `filterFeatDomainDocuments` | OBSERVED | source-inspected | `scripts/data/feat-domain-guard.js:59` |
| R-FEA-06 | Feat choice prompt and persistence | `scripts/apps/choices/feat-choice-dialog.js` · `FeatChoiceDialog.promptAndApply` | OBSERVED | behavior-code-verified | `scripts/apps/choices/feat-choice-dialog.js:315` |
| R-FEA-07 | Feat mechanical metadata stamping (normalization hooks, 18 live families) | `scripts/engine/feats/*-normalization-hooks.js` via `registerFeatRuntime` | OBSERVED · CONFLICT (A-01, A-09) | behavior-code-verified | `scripts/engine/feats/register-feat-runtime.js:76`, `scripts/engine/feats/force-point-feat-normalization-hooks.js:192` |
| R-FEA-08 | Feat runtime effects via resolver wrapping (live runtime patches) | `scripts/engine/feats/*-runtime-patches.js` | OBSERVED · CONFLICT (A-09) | behavior-code-verified | `scripts/engine/feats/grapple-runtime-patches.js:106`, `scripts/engine/feats/core-attack-option-runtime-patches.js:181` |
| R-FEA-09 | Meta-resource feat rules (DT, Second Wind, rerolls/supersession, HP/FP bonuses, grapple resistance, Forceful Recovery) | `scripts/engine/feats/meta-resource-feat-resolver.js` · `MetaResourceFeatResolver` | OBSERVED (oversized) | behavior-code-verified | `scripts/engine/feats/meta-resource-feat-resolver.js:110` |
| R-FEA-10 | Weapon-scoped feat bonuses (Weapon Focus, Point-Blank Shot) | `scripts/engine/feat/scoped-combat-feat-resolver.js` · `ScopedCombatFeatResolver` | OBSERVED | test-verified (`tests/combat-feat-attack-modifier-regression.test.mjs`) | `scripts/engine/feat/scoped-combat-feat-resolver.js:139` |
| R-FEA-11 | Generated feat ActiveEffects lifecycle | `scripts/engine/features/feat-effect-applier.js` · `FeatEffectApplier` | OBSERVED | behavior-code-verified | `scripts/engine/features/feat-effect-applier.js:168` |
| R-FEA-12 | Encounter-limited feat use tracking | `scripts/engine/feats/encounter-use-tracker.js` · `EncounterUseTracker` | OBSERVED · CONFLICT (A-02) | behavior-code-verified | `scripts/engine/feats/encounter-use-tracker.js:71` |
| R-FEA-13 | Core attack-option action economy | `scripts/engine/feats/core-attack-option-action-economy.js` · `getCoreAttackOptionEconomy` | OBSERVED | source-inspected | `scripts/engine/feats/core-attack-option-action-economy.js:201` |
| R-FEA-14 | Condition-track feat actions (Recover, Quick Comeback) | `scripts/engine/feats/condition-track-feat-actions.js` · `ConditionTrackFeatActions` | OBSERVED · CONFLICT (A-02) | behavior-code-verified | `scripts/engine/feats/condition-track-feat-actions.js:108` |
| R-FEA-15 | Force Point feat rules / actions (Force Boon, Confident Success, Jedi Familiarity, …) | `scripts/engine/feats/force-point-feat-rules.js`, `force-point-feat-actions.js` | OBSERVED · CONFLICT (A-02) | behavior-code-verified | `scripts/engine/feats/force-point-feat-rules.js:135`, `scripts/engine/feats/force-point-feat-actions.js:227` |

## 3. Authorities

- **Canonical data:** `data/canonical/feats.json` — APPROVED (Phase 5C classification `CANONICAL_SSOT`). **CONFLICT:** for live families the *runtime* rule shape is not taken from the canonical record but hard-coded in the normalization hooks (F-FEA-003).
- **Rules (prerequisites):** `FEAT_PREREQUISITE_AUTHORITY` — OBSERVED.
- **Calculation:** attack/damage contributions are computed by feat code but *merged into* combat resolvers by wrapping them (`CombatOptionResolver.collectAttackModifiers` wrapped by 7 live modules) — OBSERVED · CONFLICT (A-09). PROPOSED target: a declared contribution registry read by `CombatOptionResolver` instead of method replacement.
- **Mutation/persistence:** owned-feat metadata writes go through `ActorEngine.updateEmbeddedDocuments` (OBSERVED, compliant); usage flags are written with direct `actor.setFlag` in 7 live files (A-02 CONFLICT, F-FEA-005).

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `FeatRegistry` | `scripts/registries/feat-registry.js:63` | 32 | Read-only feat lookup by canonical id; name lookup throws `AmbiguousCanonicalFeatNameError` |
| `MetaResourceFeatResolver` | `scripts/engine/feats/meta-resource-feat-resolver.js:110` | 21 | Static rule getters + reroll/supersession actions |
| `EncounterUseTracker` | `scripts/engine/feats/encounter-use-tracker.js:14` | 9 | `isUsed/markUsed/resetAllUses` on `flags.<scope>.<key>` |
| `ConditionTrackFeatActions` | `scripts/engine/feats/condition-track-feat-actions.js:108` | 4 | Recover / Quick Comeback actions |
| `getCoreAttackOptionEconomy` | `scripts/engine/feats/core-attack-option-action-economy.js:201` | 5 | Pure lookup of attack-option action cost |
| `ForcePointFeatRules` | `scripts/engine/feats/force-point-feat-rules.js:135` | 4 | Pure FP feat rule reader (consumed by `force-points-service.js:28`) |
| `resolveActionCost` | `scripts/engine/feats/action-speed-runtime-patches.js:61` | 3 (+2 dynamic) | Feat-adjusted action cost; module's `register*` is never called |
| `ScopedCombatFeatResolver` | `scripts/engine/feat/scoped-combat-feat-resolver.js:139` | 2 | `getBonus(actor, weapon, kind, context)` |
| `registerFeatRuntime` | `scripts/engine/feats/register-feat-runtime.js:76` | 1 | The only import gate for feat runtime modules (called `ready`, `scripts/infrastructure/hooks/init-hooks.js:113`) |
| `initializeFeatEffectsHooks` | `scripts/engine/features/feat-effect-applier.js:168` | 1 (`index.js:260`) | createItem/deleteItem, author-client only |
| `FeatChoiceDialog.promptAndApply` | `scripts/apps/choices/feat-choice-dialog.js:214` | 8 | Writes `selectedChoice` patch |

## 5. Dependencies

- **Allowed (PROPOSED, per A-P1):** infrastructure, data-registries, actor-core (read), ActorEngine (governance), combat/skills resolvers via declared seams, `SWSEChat`.
- **Prohibited:** UI imports from engine modules (A-07); writing actor state outside ActorEngine (A-02); wrapping another domain's static methods (A-09).
- **Observed violations:** runtime patches replace methods of `SWSEGrappling`, `CombatOptionResolver`, `ModifierEngine`, `SkillFeatResolver`, `CombatActionsMapper`, `FeatGrantEntitlementResolver` (progression), `DamageSystem` (F-FEA-002). Census: feats depends on infrastructure 86, actor-core 62, combat 53; depended on by progression 16, combat 14.

## 6. Integration points and lifecycle

- `init`: `index.js:260` → `initializeFeatEffectsHooks()` (gated `game.user.id === userId`, `scripts/engine/features/feat-effect-applier.js:170`).
- `ready`: `scripts/infrastructure/hooks/init-hooks.js:108` `FeatActionListeners.initialize()`; `:113` `registerFeatRuntime()` → 15 ordered groups (order documented as significant, `register-feat-runtime.js:10-13`).
- 18 normalization families each register `Hooks.on('createItem')` and `Hooks.on('updateItem')` (36 listeners) with **no user gating** (F-FEA-001).
- `updateActor` HP watcher + `swse.damageApplied` listener for Cleave (`core-combat-reaction-runtime-patches.js:396`, `:417`).
- `createChatMessage` listener (`combat-feat-damage-runtime-patches.js:70`); `swse.coupDeGrace`, `swse.damage-before`, `swse.grappleManeuver` (`feat-action-listeners.js:149,203,279`).
- Debug global: `SWSE.debug.seedFeatsPack` (`index.js:109`).

## 7. Failure behavior and domain invariants

- A-02: owned-item writes compliant; usage-flag writes not (F-FEA-005). Two-step writes (`ActorEngine.gainForcePoints` then `actor.setFlag` counter, `force-point-feat-actions.js:226-227`) are not atomic: a failed second write lets the per-level counter under-count.
- A-05: one live direct `ChatMessage.create` (`grapple-runtime-patches.js:334`).
- A-09: live monkey-patches (F-FEA-002); normalization hooks are a runtime compatibility layer over canonical data (F-FEA-003).
- A-16: `FeatRegistry` holds 6 maps with invalidation (census `hasInvalidate: true`) — compliant.
- Normalization failures are caught and logged (`scripts/engine/feats/force-point-feat-normalization-hooks.js:186`); a failed normalize leaves the feat without runtime metadata, silently.
- Domain invariant (PROPOSED) INV-FEA-1: a feat's runtime rules are derived from its canonical record; no second hand-written copy.
- Domain invariant (PROPOSED) INV-FEA-2: every document-lifecycle listener that writes is gated to one client.

## 8. Level C subsystem contracts

- **C-FEA-1 Feat catalog → registry:** `data/canonical/feats.json` → (build tool) `packs/feats.db`/`data/feat-catalog.json` → `FeatRegistry` (pack first, catalog fallback, GM seeding). Interface: read-only documents. Status: OBSERVED · FOUNDRY_ACCEPTANCE_REQUIRED (runtime seeding path).
- **C-FEA-2 Feat rule metadata → consumers:** producer = normalization hook (writes `system.abilityMeta.*` on the owned item); consumers = runtime patches / resolvers reading `abilityMeta`. Status: OBSERVED · CONFLICT — 25+ producers and consumers are not registered, so the boundary is half-wired (F-FEA-004).
- **C-FEA-3 Feat contributions → combat math:** current interface is method replacement of `CombatOptionResolver.collectAttackModifiers`; PROPOSED interface: `CombatOptionResolver.registerContributor(id, fn)` read by `resolveAttackBonus`/`resolveDamageBonus` seams.

## 9. Tests and certification

CI-relevant tests (domain facts): `tests/feat-registry-canonical-identity.test.mjs`, `tests/feat-catalog-validity-regression.test.mjs`, `tests/feat-choice-persistence-and-scoped-prerequisites.test.mjs`, `tests/combat-feat-attack-modifier-regression.test.mjs`, `tests/grab-grapple-resistance-channel-split.test.mjs`, `tests/opposed-grapple-tie-authority.test.mjs`, `tests/class-bonus-feat-wicked-strike-authority.test.mjs`, `tests/feat-tags-*.test.mjs` (5), `tests/npc-import-feat-choice-metadata.test.mjs`, `tests/grab-back-bare-item-normalization.test.mjs`, `tests/attack-dialog-profile-context-convergence.test.mjs`. Workflow guard: `.github/workflows/rolling-system-validation.yml:137` (canonical feat production).
**Not covered:** none of the 18 live normalization families has a direct test except grapple (`grapple-feat-normalization-hooks.js`, 1 direct); none of the live runtime-patch wrappers' composition order is tested. Foundry acceptance: **none recorded** — every feat runtime path is `FOUNDRY_ACCEPTANCE_REQUIRED` before any `FOUNDRY_TESTED` claim (A-13).

## 10. Reconciliation with existing contracts

Agreements: `docs/audits/combat-feat-runtime-architecture.md:7` already identifies `register-feat-runtime.js` as the load-bearing gate and ~half the directory as orphaned (matches census: 49 orphan modules). Phase-5C (`docs/audits/phase-5c-authority-classification.md:46`) names `data/canonical/feats.json` the single operational feat authority (agrees with R-FEA-01 for content).

| ID | Existing source | Claim | Observed | Status |
|---|---|---|---|---|
| CR-FEA-01 | `docs/audits/chat-feat-implementation-addendum-2026-07-06.json:5` (and runtimeHomes `:17-40`) | Feats in its batches are "implemented … has a known consumer"; runtime homes include skill-feat, expanded skill, team, rebellion species, second-wind normalization/patch modules | Those normalization modules are orphan; `registerSkillFeatRuntimePatches`, `registerTeamFeatRuntimePatches` and the rebellion-species register function are never called | CONFLICT |
| CR-FEA-02 | `docs/audits/phase-5c-authority-classification.md:46` | `data/canonical/feats.json` is the one operational authority | Live runtime rules come from hard-coded tables in normalization hooks, with a different rule shape from the canonical `abilityMeta` (e.g. Confident Success, `data/canonical/feats.json:10331` vs `force-point-feat-normalization-hooks.js:79`) | CONFLICT |
| CR-FEA-03 | `docs/audits/v2-math-integrity-authority-ledger.md:306` | Second Wind: single canonical rules module, monkey-patch in `second-wind-rider-runtime-patches.js` noted as fragility | That patch module is orphan (never runs); the fragility claim is moot but the "implemented" riders are inert | CONFLICT (minor) |

## 11. Phase 2 conformance summary

| ID | Sev | Title |
|---|---|---|
| F-FEA-001 | high | 36 ungated createItem/updateItem write listeners (18 normalization families) run on every client and on every item update |
| F-FEA-002 | medium | Live runtime monkey-patch chain: 7 wrappers on `CombatOptionResolver.collectAttackModifiers`, 8 on `SWSEGrappling`, plus ModifierEngine/progression/DamageSystem |
| F-FEA-003 | medium | Normalization hooks hard-code a second copy of feat rules, diverging from canonical `feats.json` abilityMeta |
| F-FEA-004 | medium | 49 orphan modules (~9.8k SLOC): half-wired rule families documented as implemented |
| F-FEA-005 | medium | Direct `actor.setFlag/unsetFlag` usage flags in 7 live feat modules (A-02) |
| F-FEA-006 | medium | Cleave "target dropped" emitted from an ungated `updateActor` watcher and from `swse.damageApplied` (duplicate chat/events suspected) |
| F-FEA-007 | medium | "Daily" skill-feat uses keyed on real-world UTC date, not campaign time (Force uses `game.time.worldTime`) |
| F-FEA-008 | medium | Confident Success: second cap ("not above FP gained at current level") not enforced; non-atomic counter write |
| F-FEA-009 | low | `selectedChoiceFromItem` cloned in 7 files — all 7 are orphan; consolidate only if the families are wired |
| F-FEA-010 | low | `MetaResourceFeatResolver` (1,096 lines) mixes 8 responsibilities incl. Force power recovery |
| F-FEA-011 | low | Four `FeatRegistry` symbols (canonical + facade + 3-line alias + orphan UI) |
| F-FEA-012 | low | Runtime compendium seeding/icon repair is a fallback path (legacy F) |
| F-FEA-013 | low | A-05 direct `ChatMessage.create` in grapple tie message |
| F-FEA-014 | info | Documentation consolidation candidates (feat addenda / readiness docs) |

## 12. Unimplemented, deferred and acceptance-required items

- U-FEA-01 Team feat skill bonuses: live prompt (`scripts/rolls/skills.js:243`) but bonus patch never registered (`team-feat-runtime-patches.js:172`) and producer family orphan — UNIMPLEMENTED.
- U-FEA-02 Skill-feat reroll/substitution/temporary-defense patches (`skill-feat-runtime-patches.js:361`) never registered — UNIMPLEMENTED.
- U-FEA-03 Advisory/defense-avoidance riders need a selected-advisory UI context (`docs/audits/combat-feat-runtime-architecture.md:64`) — UNIMPLEMENTED.
- DEFERRED_RULES_REVIEW (new; no register ID yet): whether "FP gained upon reaching your current level" (Confident Success, REoCG p.31) equals the system's FP max; whether a feat "per day" limit is a campaign day. Owner must add register entries; no interpretation chosen here.
- FOUNDRY_ACCEPTANCE_REQUIRED: multi-client feat creation (F-FEA-001), Cleave notifications (F-FEA-006), GM pack seeding (R-FEA-03), wrapper composition order on attack rolls (F-FEA-002).

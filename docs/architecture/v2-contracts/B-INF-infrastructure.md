# B-INF — infrastructure (composition root, core bootstrap, hook wiring, generic utilities)

**Level:** B with embedded C. **Audited commit:** `f734b4d` (code identical at HEAD). **Sidecar:** `data/audits/architecture-census/contracts/domains/infrastructure.json`. **Facts:** 117 files, 110 runtime modules — 51 reachable, **55 unreachable** (33 orphans, 18 importers-only, 3 string-referenced, 1 test-only), 14,539 SLOC. The brief's "51 unreachable" figure counts differently; the fact pack lists 55 (this contract uses the fact pack). The stale duplicate `scripts/holonet/scripts/core/*` is tagged `holonet` by the census but is infrastructure bootstrap code and is covered here.

## 1. Purpose and boundaries

infrastructure owns: the composition root `index.js` (87 static imports; `init` at `index.js:99`, `ready` at `index.js:282`), system settings registration (`scripts/core/settings.js` · `registerSystemSettings`), template preloading (`scripts/load-templates.js`), hook wiring (`scripts/infrastructure/hooks/**`, `HooksRegistry`), generic utilities (`scripts/utils/**`: logger, schema adapters, settings helper, flag helpers, performance utils), the v13 document API facade (`scripts/core/document-api-v13.js`), world data loading, and caches (`scripts/core/cache-manager.js`).

It must **not** own: game rules (ability mod, defense, BAB, DT formulas — see F-INF-006), actor mutation (A-02), house-rule semantics (HRL), chat content (CHT).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-INF-01 | Composition root: document classes, sheets, settings, hooks, registries | `index.js` | OBSERVED | source-inspected | `index.js:99`, `index.js:166`, `index.js:212`, `index.js:282` |
| R-INF-02 | System settings registration | `scripts/core/settings.js` · `registerSystemSettings` | OBSERVED · CONFLICT (duplicates, F-INF-003) | behavior-code-verified | `scripts/core/settings.js:20`, `:673`, `:676` |
| R-INF-03 | Hook registry with ids/priorities | `scripts/infrastructure/hooks/hooks-registry.js` · `HooksRegistry` | OBSERVED (35 registrations vs 501 raw `Hooks.on/once` sites) | source-inspected | `scripts/infrastructure/hooks/hooks-registry.js:48`, `:93` |
| R-INF-04 | Actor/combat/item hook wiring | `scripts/infrastructure/hooks/actor-hooks.js` · `registerActorHooks`, `init-hooks.js` | OBSERVED | source-inspected | `scripts/infrastructure/hooks/actor-hooks.js:61` |
| R-INF-05 | v13 document facade (create/update/delete/chat) routing actors/owned items to ActorEngine | `scripts/core/document-api-v13.js` | OBSERVED | behavior-code-verified | `scripts/core/document-api-v13.js:380-392` |
| R-INF-06 | Logging | `scripts/utils/logger.js` · `SWSELogger` | OBSERVED (699 importers) | source-inspected | `scripts/core/logger.js:1` |
| R-INF-07 | Schema read adapters (`SchemaAdapters.getAbilityMod`, `getDefense`, `getBAB`, …) | `scripts/utils/schema-adapters.js` | OBSERVED · CONFLICT (rule fallbacks) | source-inspected | `scripts/utils/schema-adapters.js:337`, `:453` |
| R-INF-08 | Flag scope compatibility (`swse` → `foundryvtt-swse`) | `scripts/utils/flags/swse-flags.js` · `installSwseFlagScopeCompatibility` | OBSERVED · CONFLICT (A-09) | behavior-code-verified | `scripts/utils/flags/swse-flags.js:28`, `index.js:101` |
| R-INF-09 | Template preload | `scripts/load-templates.js` | OBSERVED | source-inspected | `index.js:265` |
| R-INF-10 | World data autoload / clear | `scripts/core/world-data-loader.js` | OBSERVED | source-inspected | `scripts/core/world-data-loader.js:473` |
| R-INF-11 | Data cache manager (A-16) | `scripts/core/cache-manager.js` | OBSERVED (has invalidation) | source-inspected | `scripts/core/cache-manager.js:1` |

## 3. Authorities

- Composition: `index.js` is the declared root, but the hotfix layer and two finalizer patches are composed by a side-effect import inside `scripts/talents/squad-actions-init.js` (`index.js:91`; F-PAT-003). CONFLICT with "single composition root".
- Settings: `scripts/core/settings.js` (`foundryvtt-swse` namespace) plus `houserule-settings.js` (called from settings.js), `index.js:358` local `registerSettings` (**`swse` namespace**), `ui-manager.js:21`. CONFLICT (F-INF-003/F-INF-004).
- Document writes: facade routes actor/owned-item writes to ActorEngine (`document-api-v13.js:380-388`); unowned/world docs write directly (`:392`) — legitimate A-02 exception (world documents) but uncommented.

## 4. Public interfaces

| Symbol | path:line | Importers | Contract |
|---|---|---:|---|
| `SWSELogger` | `scripts/utils/logger.js` | 699 | logging |
| `SchemaAdapters` | `scripts/utils/schema-adapters.js:337` | 51 | read-side accessors with fallbacks |
| `SettingsHelper` | `scripts/utils/settings-helper.js` | 42 | safe `game.settings.get` wrapper |
| `document-api-v13` (`createActor`, `updateActor`, `createChatMessage`, `patchDocument`) | `scripts/core/document-api-v13.js:34`, `:252`, `:380` | 41 | v13-safe document calls |
| `HooksRegistry.register/activateAll` | `scripts/infrastructure/hooks/hooks-registry.js:48`, `:93` | 16 | |
| `getSwseFlag/setSwseFlag` | `scripts/utils/flags/swse-flags.js:87`, `:102` | 8 | canonical-first flag read |
| `registerSystemSettings` | `scripts/core/settings.js:20` | 1 (`index.js`) | |

## 5. Dependencies

infrastructure is depended on by every domain and *depends on* 30+ domains (ui-shell 30, actor-core 22, combat 17 …) — the composition root legitimately imports all, but utils should not: observed `scripts/utils/hardening.js:16` → ActorEngine (cycle F-ACT-001), `scripts/utils/actor-utils.js` (write primitive, see B-ACT C-ACT-2). PROPOSED (A-P1): `scripts/utils/**` and `scripts/core/**` (except the root) import only infrastructure and data-registries.

## 6. Integration points and lifecycle

`index.js` module evaluation (imports, incl. hotfix side effects) → `init` (`index.js:99`): flag-scope patch (`:101`), Force suite runtime repairs (`:102`, monkey-patches, F-ACT-015), debug globals `globalThis.SWSE.debug.*` (`:105-120`), document classes (`:166`), sheets, `registerSettings()` (`:208`) then `registerSystemSettings()` (`:212`), ~40 `register*` hook installers (`:216-261`), template preload (`:265`) → `ready` (`index.js:282`): `MutationInterceptor.initialize` (`:287`), holonet, world data autoload and silent migrations (`:308-316`, see B-MIG).

## 7. Failure behavior and invariants

Most installers swallow errors. A-06: infrastructure engines read settings via `SettingsHelper`/`HouseRuleService` (no P-A06 hits in this domain). A-09: `Document.prototype` flag patch (R-INF-08). A-16: `cache-manager` and `performance-utils.memoize` have invalidation.

## 8. Level C subsystem contracts

- **C-INF-1 Document facade** — callers ⇄ `document-api-v13`: Actor → `ActorEngine.updateActor`; owned Item → `ActorEngine.updateEmbeddedDocuments`; else direct. Status: OBSERVED; PROPOSED to add the A-02 exception comment at `document-api-v13.js:391`.

## 9. Tests and certification

`tests/schema-adapters-ability-authority.test.mjs`, `tests/target-defense-shared-authority.test.mjs`, `tests/perf-agg.test.mjs`, `tests/class-phase-6p-force-class-sheet-controls.test.mjs`. No test loads `index.js` end-to-end (Foundry required). Foundry acceptance: system boot order — FOUNDRY_ACCEPTANCE_REQUIRED.

## 10. Reconciliation

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-INF-01 | `index.js:216` comment | `scripts/core/init.js` is imported by nothing, so its vehicle hooks never ran | Agreement: `scripts/core/init.js` is unreachable; it still registers `maxTemplatesPerItem`, `enableEnhancedMassiveDamage` (`scripts/core/init.js:32`, `:45`) — stale. Its copy `scripts/holonet/scripts/core/init.js` (orphan) re-registers the same settings (`:30`, `:43`) and imports a non-existent `scripts/core/sidebar-structure-diagnostics.js` (`:10`) |
| CR-INF-02 | ENGINE-ARCHITECTURE §3 Settings Rule | Engines read house rules through HouseRuleService | `index.js:358-400` registers 5 settings in a `swse` namespace that no code reads (all readers use `foundryvtt-swse` via HouseRuleService/SettingsHelper) |
| CR-INF-03 | `scripts/utils/flags/swse-flags.js:10` | "Actors do NOT need these helpers — SWSEV2BaseActor already bridges the 'swse' scope" | Both bridges exist and are both active for actors (global Document patch + SWSEActorBase override) |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-INF-001 | medium | confirmed | 55 unreachable infrastructure modules incl. stale duplicate `scripts/holonet/scripts/core/*` |
| F-INF-002 | medium | confirmed | Dead actor writers in live utility modules (`hardening.js` NPC snapshot, `mutation-safety.js` locks) — and the only reason `hardening.js` imports ActorEngine |
| F-INF-003 | low | confirmed | Settings defined twice (settings.js vs houserule-settings.js; settings.js vs ui-manager.js) with divergent definitions |
| F-INF-004 | low | confirmed | `index.js` registers 5 settings under unread `swse` namespace |
| F-INF-005 | medium | confirmed | Global `Document.prototype` flag patch (A-09) |
| F-INF-006 | medium | suspected | Generic utils compute game rules (`math-utils` calculateDefense/BAB/DT; `SchemaAdapters` fallbacks) |
| F-INF-007 | low | confirmed | A-02/A-05 probe hits: facade and world-doc writes are legitimate exceptions |
| F-INF-008 | medium | confirmed | Composition outside the root (side-effect imports) and dual hook mechanisms (HooksRegistry 35 vs raw Hooks 501) |

## 12. Unimplemented, deferred, acceptance-required

- No DEFERRED_RULES_REVIEW items. F-INF-006 rule formulas are reported for consolidation only; no values changed.
- FOUNDRY_ACCEPTANCE_REQUIRED: boot order after any move of hotfix registration into `index.js`; whether Foundry v13 accepts `game.settings.register("swse", …)` (namespace not a package) — not verified offline.

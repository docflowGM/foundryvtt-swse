# B-HRL — houserules (HouseRuleService, house-rule settings, manifest, grant tables)

**Level:** B. **Audited commit:** `f734b4d` (code identical at HEAD). **Sidecar:** `data/audits/architecture-census/contracts/domains/houserules.json`. **Facts:** 43 files, 25 runtime modules (11 reachable, 14 unreachable: 10 importers-only, 3 orphans, 1 test-only), 8,356 SLOC.

## 1. Purpose and boundaries

Owns: the house-rule read/write service `HouseRuleService` (`scripts/engine/system/HouseRuleService.js`, 76 importers; APPROVED as the only house-rule read path, ENGINE-ARCH §3 / A-06), registration of ~167 house-rule settings (`scripts/houserules/houserule-settings.js`, called from `scripts/core/settings.js:673`), the house-rule manifest used by the GM House Rules surface (`houserules-manifest.js` → `scripts/ui/shell/gm/GMHouseRulesSurfaceService.js:8`), house-rule feat/talent grant tables and grant service, and small rule adapters (`FeatRulesAdapter`, `HealingRules`). The *effect* of each house rule is implemented by the owning rule modules (`scripts/engine/combat/CombatRules.js`, `scripts/engine/skills/SkillRules.js`, `scripts/engine/force/ForceRules.js`, `ConditionTrackRules`) that read HouseRuleService. HRL must not implement combat/skill mechanics itself and must not adjudicate rules (A-11): house-rule variants are owner-defined options.

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-HRL-01 | House-rule read/write API with typed getters and defaults | `HouseRuleService.get/isEnabled/getNumber/set` | APPROVED (ENGINE-ARCH §3) · OBSERVED | source-inspected | `scripts/engine/system/HouseRuleService.js:102`, `:115`, `:134`, `:147` |
| R-HRL-02 | Default values | `scripts/utils/settings-defaults.js` · `SETTINGS_DEFAULTS` (used by HouseRuleService `:14`) | OBSERVED · CONFLICT (3 copies, F-HRL-003) | source-inspected | `scripts/utils/settings-defaults.js:115` |
| R-HRL-03 | House-rule setting registration | `scripts/houserules/houserule-settings.js` · `registerHouseruleSettings` | OBSERVED | source-inspected | `scripts/houserules/houserule-settings.js:17`, `scripts/core/settings.js:673` |
| R-HRL-04 | Manifest (labels, categories, validation) for GM surface | `scripts/houserules/houserules-manifest.js` | OBSERVED | source-inspected | `scripts/ui/shell/gm/GMHouseRulesSurfaceService.js:8` |
| R-HRL-05 | House-rule feat/talent grants (idempotent grantMissing, reconcile) | `scripts/houserules/houserule-feat-grants.js` · `HouseRuleFeatGrants` | OBSERVED (live via reconciliation, not via its own hooks) | dependency-traced | `scripts/houserules/houserule-feat-grants.js:167`; `scripts/engine/progression/feats/feat-housekeeping-runtime-patches.js:466` |
| R-HRL-06 | Recovery / status-effect helpers used by GM holonet tools | `houserule-recovery.js`, `houserule-status-effects.js` | OBSERVED | dependency-traced | `scripts/holonet/subsystems/gm-combat-recovery-service.js:414`, `:790` |
| R-HRL-07 | Class tree access overrides | `scripts/settings/house-rules.js` | OBSERVED | source-inspected | `scripts/core/settings.js:676` |

## 3. Authorities

House-rule values: Foundry settings `foundryvtt-swse.*`, read through HouseRuleService (APPROVED). Defaults: three parallel declarations (settings-defaults, registration, manifest) — sampled keys agree (`criticalHitVariant`, `deathSystem`, `conditionTrackCap`, `feintSkill`), parity not enforced. Effects: owning rule modules (OBSERVED; per-rule effect not verified here).

## 4. Public interfaces

| Symbol | path:line | Importers |
|---|---|---:|
| `HouseRuleService.get/isEnabled/getNumber/getBoolean/getString/set` | `scripts/engine/system/HouseRuleService.js:102`–`:147` | 76 |
| `registerHouseruleSettings` | `scripts/houserules/houserule-settings.js` | 1 |
| `HOUSERULE_MANIFEST` | `scripts/houserules/houserules-manifest.js` | 2 |
| `HOUSE_RULE_GRANTS`, `isGrantEnabled` | `scripts/houserules/house-rule-grant-table.js` | 7 |
| `HouseRuleFeatGrants.grantMissing/reconcileActorGrants` | `scripts/houserules/houserule-feat-grants.js` | 4 |

## 5. Dependencies

Allowed: infrastructure, ActorEngine (grant writes). Observed: HouseRuleService warns on direct `game.settings.set` (`HouseRuleService.js:239`). A-06 violations live in other domains (F-HRL-002).

## 6. Integration points and lifecycle

Registration during `init` via `registerSystemSettings`. Hooks in this domain (`updateSetting`/`createActor` in `houserule-feat-grants.js:33,41`; `updateActor`/`restCompleted` in `houserule-status-effects.js:129-130`; `restCompleted` in `houserule-recovery.js:18`) are only installed by `HouseruleMechanics.initialize` in **orphan** `scripts/houserules/houserule-mechanics.js:38-60`, so they never run.

## 7. Failure behavior and invariants

A-06 domain invariant. HouseRuleService returns defaults before settings are ready (`_isSettingsReady`).

## 8. Level C subsystem contracts

None.

## 9. Tests and certification

`tests/houserule-grapple-authority.test.mjs`, `tests/talent-step-block-deflect-cache-coherency.test.mjs`, `tests/reconciliation-house-rules.test.mjs`. Foundry acceptance: GM House Rules surface toggles → rule effect — FOUNDRY_ACCEPTANCE_REQUIRED per rule.

## 10. Reconciliation

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-HRL-01 | ENGINE-ARCHITECTURE.md §3 | API is `HouseRuleService.getRule/isRuleEnabled/getRuleVariant`; forbidden example `game.settings.get('swse', …)` | Methods are `get/isEnabled/getString/…`; none of the documented names exist |
| CR-HRL-02 | ENGINE-ARCH §3 (= global CR-06) | no `game.settings.get` in engines | P-A06 8 hits: 6 are comments (false positives); real: `legacy-prereq-registry.js:89`, `skill-registry.js:85` (`athleticsConsolidation`), `SkillChallengeStore.js:62` (store data, not a house rule) |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-HRL-001 | medium | confirmed (wiring) / suspected (per-rule effect) | 14 unreachable house-rule modules: superseded V1 mechanics initializer, menus, presets, app |
| F-HRL-002 | low | confirmed | A-06: 2 real house-rule reads bypass HouseRuleService; 6 probe hits are comments |
| F-HRL-003 | low | suspected | Defaults declared in three places without a parity test |
| F-HRL-004 | info | confirmed | `houserule-status-effects.js:298` direct `effect.setFlag` is inside an uninstalled hook (latent) |
| F-HRL-005 | info | confirmed | ENGINE-ARCH §3 documents a non-existent API |

## 12. Unimplemented, deferred, acceptance-required

No DEFERRED_RULES_REVIEW items (house-rule variants are owner options). FOUNDRY_ACCEPTANCE_REQUIRED: for each house rule exposed in the GM surface, a toggle-to-effect check, since the V1 initializer is dead and effects live in rule modules.

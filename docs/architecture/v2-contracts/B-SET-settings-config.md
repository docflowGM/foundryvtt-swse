# B-SET — settings-config (settings modules, constants, feature flags)

**Level:** B. **Audited commit:** `f734b4d` (code identical at HEAD). **Sidecar:** `data/audits/architecture-census/contracts/domains/settings-config.json`. **Facts:** 11 files, 4 runtime modules (all reachable), 288 SLOC. Small domain; the bulk of settings registration lives in INF (`scripts/core/settings.js`) and HRL (`houserule-settings.js`) and is contracted there.

## 1. Purpose and boundaries

Owns: two settings modules (`scripts/settings/custom-content-approval.js`, `scripts/settings/epic-override.js`) and static constants (`scripts/constants/capability-slugs.js`, `scripts/constants/beam-styles.js`). Relationship to HouseRuleService: settings *reads* in engines go through `HouseRuleService` (A-06, ENGINE-ARCH §3); this domain only *registers* and exposes small typed accessors. Must not own house-rule semantics (HRL) or general registration (INF).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-SET-01 | Custom-content approval policy setting + accessors | `scripts/settings/custom-content-approval.js` | OBSERVED | source-inspected | `scripts/settings/custom-content-approval.js:11`, `:13` |
| R-SET-02 | Epic override (level 21+) setting + accessor via HouseRuleService | `scripts/settings/epic-override.js` · `isEpicOverrideEnabled` | OBSERVED | source-inspected | `scripts/settings/epic-override.js:9`, `:21`; `scripts/core/settings.js:250` |
| R-SET-03 | Capability slug / proficiency category constants | `scripts/constants/capability-slugs.js` | OBSERVED | source-inspected | `scripts/constants/capability-slugs.js:1` |
| R-SET-04 | Beam style / bolt colour constants | `scripts/constants/beam-styles.js` | OBSERVED | source-inspected | `scripts/constants/beam-styles.js:1` |

## 3. Authorities

Setting values: Foundry `game.settings` under `foundryvtt-swse`; read authority HouseRuleService (APPROVED, ENGINE-ARCH §3). Constants: these modules (OBSERVED).

## 4. Public interfaces

| Symbol | path:line | Importers |
|---|---|---:|
| `getCustomContentApprovalPolicy` / `registerCustomContentApprovalSettings` | `scripts/settings/custom-content-approval.js` | 5 |
| `isEpicOverrideEnabled` | `scripts/settings/epic-override.js:20` | 3 |
| `CAPABILITY_SLUGS` | `scripts/constants/capability-slugs.js` | 4 |
| `BEAM_STYLES` / `getBeamStyle` | `scripts/constants/beam-styles.js` | 2 |

## 5. Dependencies

Depends only on HRL (`HouseRuleService`). No violations.

## 6. Integration points and lifecycle

Registered during `init` via `index.js` (`registerCustomContentApprovalSettings`) and `scripts/core/settings.js:250` (`registerEpicOverrideSetting`).

## 7. Failure behavior and invariants

A-06 held inside this domain.

## 8. Level C subsystem contracts

None.

## 9. Tests and certification

No dedicated tests. Foundry acceptance: none needed beyond settings menu.

## 10. Reconciliation

Agreement with ENGINE-ARCH §3 (accessor uses HouseRuleService). No contradictions in-domain.

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-SET-001 | low | confirmed | Second `isEpicOverrideEnabled` in `level-split.js` reads `game.settings` directly |
| F-SET-002 | info | confirmed | Domain otherwise conformant; settings sprawl is tracked in B-INF F-INF-003/004 and B-HRL |

## 12. Unimplemented, deferred, acceptance-required

None.

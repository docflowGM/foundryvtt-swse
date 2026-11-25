# B-TAL — Talents domain contract (Level B, with Level C)

**Contract level:** B (domain). **Domain:** `talents`. **Audited commit:** `f734b4d` (HEAD `2beb7cb` adds only census artefacts). **Sidecar:** `data/audits/architecture-census/contracts/domains/talents.json`.
Level A invariants are referenced by ID from [`A-global-invariants.md`](A-global-invariants.md). Nothing here is `live-foundry-verified`.

## 1. Purpose and boundaries

The talents domain owns **talent and talent-tree identity** (canonical talent ids/UUIDs, tree ids), **tree data access** (`TalentTreeDB`), **talent lookup** (`TalentRegistry`), **talent prerequisite data**, the **active talent actions** (Sith, Consular, Force Adept, Lightsaber, Sentinel, Jedi prestige, Guardian Spirit, armor, minion/squad) and the **custom talent tree workbench** (GM homebrew trees, effect wizard, approval).

Must **not** own: actor/owned-item persistence (A-02 → ActorEngine), Force Point transactions (FRC → `ActorEngine.spendForcePoints`), Dark Side Score mutation (FRC), chat rendering (A-05), progression step behaviour (PRG owns `TalentStep`; the workbench must not patch it), talent slot entitlement (PRG/CLS).

Scope (census): 36 runtime modules, 16,252 SLOC; 31 reachable, 4 unreachable (`talents.js` 1,499 SLOC legacy effects table, `TalentNormalizerEngine.js`, `talent-effects-hooks.js`, `talent-relationship-registry.js`). Paths: `scripts/engine/talent/**`, `scripts/apps/talent-tree-workbench/**`, `scripts/talents/**`, `scripts/data/talent-*.js`, `scripts/registries/talent-registry.js`, `scripts/data/authority/talent-prerequisite-authority.js`.

## 2. Responsibility ownership

| ID | Responsibility | Owner (path · symbol) | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-TAL-01 | Canonical talent content | `data/canonical/talents.json` → generated `packs/talents.db` | APPROVED (phase-5c) · OBSERVED | source-inspected | `docs/audits/phase-5c-post-cutover-handoff.md:15` |
| R-TAL-02 | Talent tree data access (O(1) by id, normalized) | `scripts/data/talent-tree-db.js` · `TalentTreeDB` | OBSERVED | test-verified (`tests/talent-phase-3f-tree-identity.test.mjs`) | `scripts/data/talent-tree-db.js:95` |
| R-TAL-03 | Talent tree membership (additive merge of talent-side fields, registry, tree claims) | `scripts/engine/progression/talents/talent-tree-membership-authority.js` · `getTalentMembership` (lives under progression) | OBSERVED · PROPOSED (move/declare) | test-verified (`tests/talent-tree-membership-authority-repair.test.mjs`) | `scripts/engine/progression/talents/talent-tree-membership-authority.js:395`, `scripts/data/talent-tree-db.js:304` |
| R-TAL-04 | Talent lookup | `scripts/registries/talent-registry.js` · `TalentRegistry` | OBSERVED | test-verified (`tests/talent-tree-registry-runtime.test.mjs`) | `scripts/registries/talent-registry.js:45` |
| R-TAL-05 | Talent source identity (canonical UUIDs) | `scripts/data/talent-source-identity.js` · `canonicalTalentId` etc. | OBSERVED | source-inspected | `scripts/data/talent-source-identity.js:26` |
| R-TAL-06 | Talent prerequisite data | `scripts/data/authority/talent-prerequisite-authority.js` (5,985 SLOC) | OBSERVED | source-inspected | domain facts `largestModules` |
| R-TAL-07 | Active talent actions (8 action modules) | `scripts/engine/talent/*-talent-actions.js` | OBSERVED · CONFLICT (A-02, A-07) | behavior-code-verified | `scripts/engine/talent/sith-talent-actions.js:296`, `scripts/engine/talent/consular-talent-actions.js:161` |
| R-TAL-08 | Lightsaber form state | `scripts/engine/talent/lightsaber-form-engine.js` · `LightsaberFormEngine` | OBSERVED · CONFLICT (A-02) | behavior-code-verified | `scripts/engine/talent/lightsaber-form-engine.js:138` |
| R-TAL-09 | Bonus Force Point pool maintenance (Guardian Spirit, manual sheet adjust) | `scripts/engine/talent/guardian-spirit-actions.js` · `GuardianSpiritActions` | OBSERVED · CONFLICT (FRC authority, A-02) | behavior-code-verified | `scripts/engine/talent/guardian-spirit-actions.js:89`, `scripts/engine/talent/guardian-spirit-actions.js:127` |
| R-TAL-10 | Turn/encounter lifecycle for talent state | `registerHooks` in sith/jedi-prestige/lightsaber actions | OBSERVED · CONFLICT (A-08) | behavior-code-verified | `scripts/engine/talent/sith-talent-actions.js:795`, `scripts/engine/talent/jedi-prestige-talent-actions.js:459`, `scripts/engine/talent/lightsaber-talent-actions.js:736` |
| R-TAL-11 | Custom talent tree workbench + progression overlay | `scripts/apps/talent-tree-workbench/*` | OBSERVED · CONFLICT (A-09) | behavior-code-verified | `scripts/apps/talent-tree-workbench/custom-talent-tree-progression-overlay.js:296` |
| R-TAL-12 | Custom content GM approval | `scripts/apps/talent-tree-workbench/custom-content-approval-service.js` · `CustomContentApprovalService` | OBSERVED · CONFLICT (A-02, A-09) | behavior-code-verified | `scripts/apps/talent-tree-workbench/custom-content-approval-service.js:305` |
| R-TAL-13 | Minion/squad talent actions | `scripts/engine/talent/minion-actions-mechanics.js`, `squad-actions-mechanics.js` | OBSERVED · CONFLICT (A-05) | source-inspected | `scripts/engine/talent/minion-actions-mechanics.js:45` |

## 3. Authorities

- **Canonical data:** `data/canonical/talents.json` — APPROVED (Phase 5C). Tree identity contract: `docs/audits/talent-phase-3f-identity-contract.md:22` (persistent references use the tree `_id`) — APPROVED as an existing contract.
- **Membership:** union of three sources (talent-side fields, generated registry, tree claims) — OBSERVED; no single declared owner; the authority module lives under `scripts/engine/progression/` — PROPOSED: declare it talents-owned (F-TAL-009).
- **Rules (talent actions):** implemented per action module from canonical text; contracted Force Point uses are pinned by `force-v2-03b-*` tests — OBSERVED.
- **Mutation:** HP/DSS/FP spend go through ActorEngine (OBSERVED); **all 72 direct flag/item writes in 11 live files are A-02 violations** — none carries an exception comment and none targets a world document (F-TAL-001).

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `TalentTreeDB` | `scripts/data/talent-tree-db.js:95` | 29 | `build()`, `byId`, `bySourceId`; read-only |
| `TalentRegistry` | `scripts/registries/talent-registry.js:45` | 22 | read-only talent lookup |
| `canonicalTalentId` / `sourceIdentityOf` | `scripts/data/talent-source-identity.js:26` | 13 | pure identity helpers |
| `getTalentMembership` | `scripts/engine/progression/talents/talent-tree-membership-authority.js:395` | (progression) | additive membership; `clearCache()` at `:474` |
| `LightsaberTalentActions` | `scripts/engine/talent/lightsaber-talent-actions.js:273` | 7 | Block/Deflect/Redirect/Riposte |
| `SithTalentActions` | `scripts/engine/talent/sith-talent-actions.js:296` | 3 | Sith talents + `registerHooks` |
| `ConsularTalentActions` | `scripts/engine/talent/consular-talent-actions.js:161` | 3 | Consular talents |
| `ForceAdeptTalentActions` | `scripts/engine/talent/force-adept-talent-actions.js:313` | 3 | Force Adept talents |
| `GuardianSpiritActions` | `scripts/engine/talent/guardian-spirit-actions.js:22` | 2 (+sheet `scripts/sheets/v2/character-like-sheet.js:4666`) | bonus FP pool read/write |
| `registerCustomTalentTreeProgressionOverlay` | `scripts/apps/talent-tree-workbench/custom-talent-tree-progression-overlay.js:296` | 1 (`index.js:252`) | patches `TalentStep.prototype` |

## 5. Dependencies

- **Allowed (PROPOSED):** data-registries, infrastructure, governance/ActorEngine, FRC services (`ForcePointsService`, `DSPEngine`, Force V2 spend API), rolls (`RollEngine`), chat (`SWSEChat`).
- **Prohibited:** engine → UI (A-07); patching progression or GM-shell classes (A-09); writing other actors' documents from a player client without a GM relay.
- **Observed violations:** 11 engine→UI imports (`swse-dialog-v2.js` in 9 action modules; `force-alchemy-workbench-app.js` from `force-adept-talent-actions.js` and `sith-talent-actions.js`) (F-TAL-008); prototype/static patches of `TalentStep`, `SWSEItemSheet`, `GMApprovalsSurfaceService`, `GMApprovalOperationsService`, `GMDatapad` (F-TAL-006). Census: depends on ui-shell 17, force 14; depended on by progression 31.

## 6. Integration points and lifecycle

- `index.js:246-254`: `registerJediPrestigeTalentActions`, `registerSithTalentActions`, workbench overlay / GM approval / effect wizard registrations.
- `ready`: `scripts/engine/talent/talent-action-linker.js:208`, `scripts/talents/minion-actions-init.js:11`, `scripts/talents/squad-actions-init.js:18`.
- `combatTurn` ×3 (sith `:795`, jedi-prestige `:459`, lightsaber `:736`) — three different readings of the hook arguments (F-TAL-003).
- `preUpdateActor` with awaited writes (sith `:823`) and `deleteCombat` cleanup (sith `:838`) — ungated (F-TAL-004).
- `swse.attack-resolved` (consular `:996`, sentinel `:617`).
- Contrast (compliant pattern in FRC): `scripts/infrastructure/hooks/force-power-hooks.js:135` uses `isResponsibleGm()`.

## 7. Failure behavior and domain invariants

- A-02: 72 direct writes (F-TAL-001); 12 of them target **another actor** (`target`, `allyActor`, `priorActor`, `targetActor`) with no GM relay — a player client is expected to receive a permission error (suspected; FOUNDRY_ACCEPTANCE_REQUIRED) (F-TAL-002).
- A-05: 3 direct `ChatMessage.create` (guardian-spirit `:283`, minion `:45`, squad `:67`); other modules already use `SWSEChat.postHTML` (`sith-talent-actions.js:91`) (F-TAL-010).
- A-08: render-time writes in the effect-wizard `_onRender` patch (F-TAL-005); writes inside `preUpdateActor` (F-TAL-004).
- A-09: progression and GM-shell monkey-patches (F-TAL-006).
- Failure handling: hook bodies catch and `console.warn`; a failed cleanup leaves encounter flags set, which later encounter-id checks partly tolerate.
- PROPOSED INV-TAL-1: talent actions emit one ActorEngine mutation per action (state + cost together). INV-TAL-2: lifecycle listeners that write run on exactly one client (responsible GM).

## 8. Level C subsystem contracts

- **C-TAL-1 Tree identity → membership:** `TalentTreeDB` provides ids; `getTalentMembership(tree)` merges sources and returns members. Status: OBSERVED; test-verified (`tests/talent-tree-membership-authority-repair.test.mjs`, `tests/talent-tree-membership-review-extras.test.mjs`).
- **C-TAL-2 Talent action → resource authorities:** talent actions call `ActorEngine.spendForcePoints` (typed contracts), `ActorEngine.applyDamage`, `ActorEngine.updateActor` for DSS. Status: OBSERVED · CONFLICT — bonus FP pool and DSS are written by local helpers instead of an FRC API (F-TAL-007, F-FRC-003).
- **C-TAL-3 Workbench → progression:** today a prototype patch of `TalentStep`; PROPOSED: a tree-provider registration API owned by progression (`TalentStep` asks registered providers for extra trees).

## 9. Tests and certification

Direct tests: `tests/force-v2-03b-talent-contracts.test.mjs` (sith/consular/force-adept), `tests/force-v2-03b-lightsaber-contracts.test.mjs`, `tests/force-v2-03b-block-deflect-events.test.mjs`, `tests/force-v2-03b-regimen-entitlements.test.mjs`, tree identity tests (`tests/talent-phase-3f-tree-identity.test.mjs`, `tests/talent-phase-3g-runtime-identity.test.mjs`, `tests/talent-tree-registry-runtime.test.mjs`), 71 `tests/talent*` files overall (mostly data/tag passes). Run during this audit (offline): `tests/talent-tree-membership-authority-repair.test.mjs` — 5 checks passed.
**Not covered:** `guardian-spirit-actions.js` (0 direct tests), all workbench modules (0 behavioural tests; 4 layout contract tests), lifecycle hooks (combatTurn/deleteCombat/preUpdateActor). Foundry acceptance: talent rows exist only inside the Class/Force V2 matrix (`docs/audits/class-force-v2-foundry-v13-acceptance-matrix.md`, rows G1, H1, H2) — all **not executed**.

## 10. Reconciliation with existing contracts

Agreements: tree identity uses the pack `_id` (`docs/audits/talent-phase-3f-identity-contract.md:22`) — the code (`TalentTreeDB._applyMembershipRegistryHints`, `scripts/data/talent-tree-db.js:304`) matches. Direct FP writer classification (`tests/class-force-v2-direct-fp-writer-classification.test.mjs`) classifies sith (Drain Force target loss) and consular (WatchCircle exemption) — agrees with code.

| ID | Existing source | Claim | Observed | Status |
|---|---|---|---|---|
| CR-TAL-01 | `docs/audits/class-force-v2-integration-matrix-2026-11-22.md:9` (Decision A) and `tests/class-force-v2-direct-fp-writer-classification.test.mjs:21` | Every direct Force Point writer file is pinned and classified | The pin only scans the normal balance (`system.forcePoints.value`); the bonus pool `bonusForcePoints` has 6 independent writers (incl. `guardian-spirit-actions.js:91`) that the guard does not see | CONFLICT |
| CR-TAL-02 | `scripts/data/talent-tree-db.js` header ("ALL engines MUST use this DB instead of string matching on names") | Name matching is prohibited for tree access | Talent action modules gate by talent **name** (`hasTalent(actor,'Guardian Spirit')`, `scripts/engine/talent/guardian-spirit-actions.js:150`) | CONFLICT (minor; talents, not trees) |

## 11. Phase 2 conformance summary

| ID | Sev | Title |
|---|---|---|
| F-TAL-001 | high | 72 direct actor/owned-item writes across 11 live files (per-file classification in sidecar) |
| F-TAL-002 | high | 12 cross-actor flag writes from the acting client with no GM relay (suspected permission failures for players) |
| F-TAL-003 | high | `combatTurn` arguments read three different ways; Master Advisor delivery reads `updateData.combatant` (never present) |
| F-TAL-004 | medium | `deleteCombat` cleanup ungated on every client; writes inside `preUpdateActor` |
| F-TAL-005 | high | Effect-wizard `_onRender` patch writes item flags during render (A-08) |
| F-TAL-006 | medium | Prototype/static monkey-patches of `TalentStep`, `SWSEItemSheet`, GM approval services, `GMDatapad` |
| F-TAL-007 | critical | Guardian Spirit bonus FP pool written via `setFlag('swse')` → `foundryvtt-swse` scope, shadowing the `flags.swse` pool that `ActorEngine.spendForcePoints` debits |
| F-TAL-008 | medium | 11 engine→UI imports (dialogs, Force Alchemy app) in talent action modules |
| F-TAL-009 | low | Membership authority is a 3-source union living in progression; declare owner and drift report |
| F-TAL-010 | low | 3 direct `ChatMessage.create` |
| F-TAL-011 | low | Unreachable cluster: `talents.js` (1,499 SLOC), `TalentNormalizerEngine.js`, `talent-effects-hooks.js`, `talent-relationship-registry.js` |
| F-TAL-012 | medium | Dark Side Score increment re-implemented locally in force-adept and sith actions (see F-FRC-004) |
| F-TAL-013 | info | Documentation consolidation candidates |

## 12. Unimplemented, deferred and acceptance-required items

- U-TAL-01 GM relay for cross-actor talent effects (Affliction, Crippling Strike, Sith Commander auras, Adept Negotiator, Master Advisor, Unsettling Presence) — UNIMPLEMENTED (no socket/`executeAsGM` path in any talent action module).
- U-TAL-02 Progression tree-provider API (to replace the `TalentStep` patch) — UNIMPLEMENTED.
- DEFERRED_RULES_REVIEW: existing register entries apply and are not re-decided here — `TALENT-RD-001` (Force talent trees for class-slot substitution, `docs/audits/swse-rules-decisions-pending.md:2804`), `RECON-001`/`RECON-005` (talent entitlement cadence), `GP-RD-017` (name-keyed talent prerequisite collision), FP-RD-001…013 (contracted Force Point talent uses). No new rules question is raised by this audit; the defects above are engineering defects of already-specified behaviour.
- FOUNDRY_ACCEPTANCE_REQUIRED: two-client runs of Affliction turn start, Master Advisor end-of-turn grant, Block/Deflect reset per turn, Sith deleteCombat cleanup, Guardian Spirit claim followed by a Force Point spend, custom tree workbench overlay in chargen.

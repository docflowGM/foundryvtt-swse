# B-DRD — Droids (domain contract, Level B)

**Audited commit:** `f734b4d` (census at HEAD `2beb7cb`). **Domain id:** `droids`. **Census size:** 45 runtime modules / 10,110 SLOC (30 static, 5 dynamic, 6 orphan, 2 importers-only, 2 test-only). Sidecar: `data/audits/architecture-census/contracts/domains/droids.json`. Level A by ID; OSI = owner standing instructions (`A-OPEN-01`). Nothing here is `FOUNDRY_TESTED` (A-13).

## 1. Purpose and boundaries

Owns droid component definitions (systems catalog + rule overlay), component quotes (cost/weight by size), the installed-component resolver and operation gate, the droid rules profile (who follows droid rules), stock-droid import/normalisation/conversion, and the droid sheet's component views.

Must NOT own: actor mutation (A-02 → ActorEngine), customization workflows (A-17 → droid customization engine / CustomizationBay, contracted in B-CUS), progression droid builder step (B-PRG), credit movement (A-10), organic resting/healing (A-18: droids cannot benefit from organic resting — owned by the healing/recovery services in holonet; verified below).

## 2. Responsibility ownership

| ID | Responsibility | Owner (path · symbol) | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-DRD-01 | Droid systems catalog | `scripts/data/droid-systems.js` · `DROID_SYSTEMS` (22 consumers) | OBSERVED | dependency-traced | `scripts/data/droid-part-schema.js:31` |
| R-DRD-02 | Canonical part definition, cost, modifiers, weapon profile | `scripts/data/droid-part-schema.js` · `getDroidPartDefinition`, `hydrateDroidPart`, `getSelfDestructDamage` (35 consumers) | OBSERVED · APPROVED (`docs/audits/droid-authority-consolidation-phase-1.md:61`) | source-inspected | `scripts/data/droid-part-schema.js:545`, `scripts/data/droid-part-schema.js:843` |
| R-DRD-03 | Prerequisite identity overlay ("requires Heuristic Processor") | `scripts/domain/droids/droid-part-schema.js` · `resolveDroidSystemIdentity`, `actorMeetsDroidSystemRequirement` | OBSERVED · CONFLICT (second overlay, hand-synced aliases; F-DRD-002) | behavior-code-verified | `scripts/domain/droids/droid-part-schema.js:1`, `scripts/data/prerequisite-checker.js:77` |
| R-DRD-04 | Component quote by size | `scripts/domain/droids/droid-component-quote-authority.js` · `resolveDroidComponentQuote` | OBSERVED | source-inspected | `scripts/domain/droids/droid-component-quote-authority.js:77` |
| R-DRD-05 | Installed component resolution | `scripts/domain/droids/droid-installed-component-resolver.js` · `resolveInstalledDroidComponents` (21 consumers) | OBSERVED | source-inspected | `scripts/domain/droids/droid-installed-component-resolver.js:421` |
| R-DRD-06 | Component operation gate (OPERABLE/DISABLED/…) | `scripts/domain/droids/droid-component-operation-gate.js` · `authorizeDroidComponentOperation` | OBSERVED | test-verified (`tests/droid-component-operation-gate.test.mjs`, 1/1 pass offline) | `scripts/domain/droids/droid-component-operation-gate.js:78` |
| R-DRD-07 | Droid rules profile | `scripts/domain/droids/droid-rules-profile.js` · `resolveDroidRulesProfile`, `followsDroidRules` | OBSERVED | source-inspected | `scripts/domain/droids/droid-rules-profile.js:49` |
| R-DRD-08 | Configuration readiness on droid sheet | `scripts/engine/droid-validation-engine.js` · `DroidValidationEngine` | OBSERVED · CONFLICT (diverges from builder; F-DRD-001) · DEFERRED_RULES_REVIEW | behavior-code-verified | `scripts/engine/droid-validation-engine.js:17`, `scripts/sheets/v2/droid-sheet/context-builder.js:438` |
| R-DRD-09 | Stock droid import / factory | `scripts/engine/import/stock-droid-importer-engine.js`, `scripts/engine/droids/droid-factory.js` · `DroidFactory` | OBSERVED | dependency-traced | `scripts/engine/droids/droid-factory.js:25` |
| R-DRD-10 | Stock → playable conversion and converted-system reconciliation | `scripts/domain/droids/droid-statblock-conversion-service.js`, `droid-converted-system-reconciliation-service.js` (ActorEngine-routed) | OBSERVED | source-inspected | `scripts/domain/droids/droid-converted-system-reconciliation-classifier.js:246` |
| R-DRD-11 | Droid sheet subclass + context | `scripts/sheets/v2/droid-actor-sheet.js` · `SWSEV2DroidSheet`; `scripts/sheets/v2/droid-sheet/context-builder.js` · `DroidSheetContextBuilder` | OBSERVED (A-14 conforms; see B-UIS) | dependency-traced | `scripts/sheets/v2/droid-actor-sheet.js:145`, `scripts/sheets/v2/droid-sheet/context-builder.js:111` |
| R-DRD-12 | Exclusion of droids from organic rest/natural healing | `scripts/holonet/subsystems/gm-healing-trigger.js` · `isEligibleForHealing`; `gm-combat-recovery-service.js` | OBSERVED (A-18 conforms in the code paths read) | behavior-code-verified | `scripts/holonet/subsystems/gm-healing-trigger.js:97`, `scripts/holonet/subsystems/gm-healing-trigger.js:102`, `scripts/holonet/subsystems/gm-combat-recovery-service.js:9` |

## 3. Authorities

- **Canonical data:** `DROID_SYSTEMS` + `RAW_OVERLAY` in `scripts/data/droid-part-schema.js` (APPROVED by consolidation phase 1). Second overlay in `scripts/domain/droids/droid-part-schema.js` — CONFLICT with A-01 (acknowledged in its own header).
- **Certification (precise, `docs/audits/droids/droid-component-mechanical-certification-closeout.md`):** 122 Core+SGD identities reviewed; **99 source PASS, 23 HOLD** (`:16`); the closeout states "Production registry certification = 0; cross-application parity = 0; Foundry runtime = 0" (`:22`). So: `SOURCE_VERIFIED` 99, `MECHANIC_SPECIFIED`/`IMPLEMENTED` not certified, `FOUNDRY_TESTED` 0. Open rules rows: `DROID-RD-001..003`, `DROID-BUILD-001`, `CAE-003`, `RECON-002`.
- **Mutation:** ActorEngine (conversion/reconciliation services); Scene `MeasuredTemplate` for self-destruct (world document).

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `getDroidPartDefinition` | `scripts/data/droid-part-schema.js:545` | 35 (module) | canonical part def |
| `resolveInstalledDroidComponents` | `scripts/domain/droids/droid-installed-component-resolver.js:421` | 21 | ledger-first components |
| `resolveDroidRulesProfile` | `scripts/domain/droids/droid-rules-profile.js:49` | 10 | droid rules applicability |
| `resolveDroidComponentQuote` | `scripts/domain/droids/droid-component-quote-authority.js:77` | 9 | cost/weight quote or BLOCKED |
| `authorizeDroidComponentOperation` | `scripts/domain/droids/droid-component-operation-gate.js:78` | 5 | OPERABLE gate |
| `DroidValidationEngine.validateDroidConfiguration` | `scripts/engine/droid-validation-engine.js:24` | 1 (sheet context) | required-systems check |

## 5. Dependencies

Allowed (PROPOSED): actor-core, infrastructure, data-registries, progression droid trait rules (`scripts/engine/progression/droids/droid-trait-rules.js`). Observed: depends on actor-core 17, infrastructure 15, progression 8, ui-shell 3; depended on by customization 13, progression 12, equipment 8. No A-07 probe hits. One A-05 hit (F-DRD-003).

## 6. Integration points and lifecycle

No live hooks in the domain. Entry points: droid sheet (`index.js:187`), progression droid builder step (B-PRG), Store custom droid purchases (B-STO), stock import via `DroidFactory`.

## 7. Failure behavior and domain invariants

Quotes fail closed (`BLOCKED`, no free price); the operation gate refuses non-ledger components and the handler enforces it, not only the button (`docs/audits/droid-vehicle-ui-convergence.md:62`). DRD-I1 one part-definition authority (PROPOSED; violated by R-DRD-03). DRD-I2 one droid readiness validator (PROPOSED; violated by R-DRD-08). A-18 droids/organic rest: conforms in `gm-healing-trigger.js` (type must be `character` and not `isDroid`) and the recovery console (droids repair-only).

## 8. Level C subsystem contracts

- **C-DRD-1 Component pipeline** — catalog/overlay → quote authority → installation ledger → installed-component resolver → operation gate. OBSERVED.

## 9. Tests and certification

51 droid tests. Offline here: `tests/droid-component-operation-gate.test.mjs` pass. `DroidValidationEngine` 3 transitive tests; droid sheet 1. No Foundry acceptance (`docs/audits/droid-live-runtime-validation-phase-5.md` is the planned/partial live record; not re-run).

## 10. Reconciliation with existing contracts

Agreements: `docs/audits/droid-authority-consolidation-phase-1.md:61-62` (two overlays, canonical = data file); `docs/audits/droid-vehicle-ui-convergence.md:62` (operation gate).

| ID | Existing source | Claim | Observed |
|---|---|---|---|
| CR-DRD-01 | `scripts/engine/droid-validation-engine.js:9` header | used by DroidBuilderApp, Chargen, Store, Sheet | Only consumer is the droid sheet context builder; chargen builder has its own validator without armor (`scripts/apps/progression-framework/steps/droid-builder-step.js:623`); reconciliation adapter states the Store path does not require armor (`scripts/apps/progression-framework/shell/reconciliation/domain-adapters.js:143`) |
| CR-DRD-02 | `scripts/domain/droids/droid-part-schema.js:1` header | prerequisite-only adapter; no cost/weapon logic | It still exports `getSelfDestructDamage` (`:795`) whose miniaturized path size-shifts *and* uses a pre-shifted table, diverging from the canonical `scripts/data/droid-part-schema.js:843`; the export has no consumer |

## 11. Phase 2 conformance summary

| ID | Sev | Title |
|---|---|---|
| F-DRD-001 | medium | Two droid readiness validators disagree on armor (rules question deferred) |
| F-DRD-002 | medium | Second droid part overlay with hand-synced aliases and a divergent dead `getSelfDestructDamage` |
| F-DRD-003 | low | Droid part use card via raw `ChatMessage.create` |
| F-DRD-004 | low | Orphan stock-droid import wizard/comparison/converter cluster and legacy utilities |
| F-DRD-005 | info | Self-destruct MeasuredTemplate creation is a world-document exception |
| F-DRD-006 | info | A-18 droid rest exclusion conforms (no finding beyond acceptance) |

## 12. Unimplemented, deferred and acceptance-required

- DEFERRED_RULES_REVIEW (new, not yet registered): whether a constructed droid must have an Armor component and at least one appendage for "ready" status — two code paths disagree; no source citation in either. Existing: `DROID-RD-001..003`, `DROID-BUILD-001`, `CAE-003`, `RECON-002`, 23 component HOLDs.
- Certification: 99 SOURCE_VERIFIED, 0 production registry, 0 parity, 0 FOUNDRY_TESTED. Do not report droid components as implemented/certified.
- FOUNDRY_ACCEPTANCE_REQUIRED: droid sheet readiness card, self-destruct template placement, stock import → conversion, GM healing excludes droids (including NPC-type droid followers).

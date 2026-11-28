# B-SPC — Species, traits and anatomy

**Contract level:** B. **Audited commit:** `f734b4d`. **Sidecar:** `data/audits/architecture-census/contracts/domains/species.json`. Level-A IDs referenced, not restated. Nothing here is `FOUNDRY_TESTED` (`A-13`). Species work carries many open rulings; this contract **records** them (`SPECIES-RD-*` in `docs/audits/swse-rules-decisions-pending.md`) and decides none (`A-11`).

## 1. Purpose and boundaries

Species owns **species content and its interpretation into grants**: the species registry (compendium + publication versions), variant/snapshot profiles, the species grant ledger (what a species grants: abilities, skills, feats, languages, movement, natural weapons, anatomy), conditional species bonus feats, species rerolls, activated species abilities (e.g. Rage, Force-like species powers) and the anatomy schema used by equipment.

Species must **not** own: actor mutation outside ActorEngine (`A-02`), final materialization during chargen (owned by progression `SpeciesBackgroundPlanBuilder`), condition-track math (ConditionEngine / ConditionTrackRules), ability-modifier/defense totals (actor-core), chat rendering (`A-05`), or rules choices left open in the register.

Census scope: 18 runtime modules / ~5.6k SLOC under `scripts/species/**`, `scripts/engine/species/**`, `scripts/engine/registries/species-registry.js`, `scripts/engine/systems/species/**`.

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-SPC-01 | Species enumeration and lookup | `scripts/engine/registries/species-registry.js` · `SpeciesRegistry` | OBSERVED | source-inspected | `scripts/engine/registries/species-registry.js:57`, `:599` |
| R-SPC-02 | Publication-version selection | `scripts/species/species-publication-selection.js` | OBSERVED · DEFERRED_RULES_REVIEW (SPECIES-RD-001/011) | test-verified (`tests/species-publication-selection.test.mjs`) | `scripts/species/species-publication-selection.js:21` |
| R-SPC-03 | Variant / resolved-snapshot profile | `scripts/species/species-variant-profile.js` · `applySpeciesVariantProfile`, `actorUsesResolvedSnapshot` | OBSERVED | source-inspected | `scripts/species/species-variant-profile.js:203`, `:47` |
| R-SPC-04 | Species grant ledger (what a species grants) | `scripts/species/species-grant-ledger-builder.js` · `SpeciesGrantLedgerBuilder` | OBSERVED | source-inspected | `scripts/species/species-grant-ledger-builder.js:143` |
| R-SPC-05 | Grant reconciliation / manifest keys | `scripts/species/species-grant-reconciliation.js` · `computeSpeciesGrantKey`, `MANIFEST_FLAG` | OBSERVED | source-inspected | `scripts/governance/actor-engine/actor-engine.js:2`; `scripts/apps/progression-framework/shell/progression-finalizer.js:22` |
| R-SPC-06 | Chargen materialization of species into a plan | progression `species-background-plan-builder.js` → `applyCanonicalSpeciesToActor` (pure; returns materialization) | OBSERVED · APPROVED (progression-architecture) | source-inspected | `scripts/apps/progression-framework/shell/mutation/species-background-plan-builder.js:83`; `scripts/engine/progression/helpers/apply-canonical-species-to-actor.js:72` |
| R-SPC-07 | Atomic species replacement on an existing actor | `scripts/species/species-plan-transaction.js` · `buildSpeciesReplacementPlan` | OBSERVED · UNIMPLEMENTED (only caller is orphan `drop-handler.js`) | dependency-traced | `scripts/drag-drop/drop-handler.js:19` |
| R-SPC-08 | Conditional species bonus feats (post-hoc) | `scripts/engine/species/SpeciesConditionalGrantResolver.js` | OBSERVED (writes via ActorEngine) | behavior-code-verified | `scripts/engine/species/SpeciesConditionalGrantResolver.js:102`, `:218`; `scripts/infrastructure/hooks/actor-hooks.js:85` |
| R-SPC-09 | Species skill rerolls | `scripts/species/species-reroll-handler.js` · `SpeciesRerollHandler` | OBSERVED (DEFERRED_RULES_REVIEW SPECIES-RD-013 for result choice) | source-inspected | `scripts/species/species-reroll-handler.js:58`, `:556` |
| R-SPC-10 | Activated species abilities | `scripts/engine/species/species-activated-ability-engine.js` · `SpeciesActivatedAbilityEngine`; `scripts/engine/species/rage-engine.js` · `RageEngine` | OBSERVED · CONFLICT (A-05) | behavior-code-verified | `scripts/engine/species/species-activated-ability-engine.js:12`, `:93`; `scripts/engine/species/rage-engine.js:114` |
| R-SPC-11 | Anatomy schema v1 | `scripts/species/species-anatomy-schema-v1.js` | OBSERVED · APPROVED (`docs/architecture/equipment-ecosystem-e2b-s2-species-anatomy-schema-contract-v1.md`) | source-inspected | `scripts/species/species-anatomy-schema-v1.js:1` |
| R-SPC-12 | Legacy trait engine | `scripts/engine/systems/species/species-trait-engine.js` · `SpeciesTraitEngine` | OBSERVED dead (orphan) · legacy C | dependency-traced | `scripts/engine/systems/species/species-trait-engine.js:1` |

## 3. Authorities

- **Canonical data:** species compendium + publication versions via `SpeciesRegistry`; actor-side resolved snapshot (`system.speciesVariant`) — OBSERVED.
- **Rules:** species trait interpretation is data-driven through the grant ledger; every unresolved mechanic is in the register (SPECIES-RD-001…023; RD-001, 011, 012, 017, 018, 019 carry partial resolutions/progress notes, the rest remain `DEFERRED_RULES_REVIEW`).
- **Calculation:** condition steps delegate to `ConditionTrackRules`/`ConditionEngine` (`scripts/engine/species/rage-engine.js:105`, `scripts/engine/species/species-activated-ability-engine.js:471`) — not duplicates. `getAbilityMod` (`species-activated-ability-engine.js:615`) prefers the prepared modifier and only falls back to the formula.
- **Mutation:** ActorEngine everywhere observed; raw `setFlag/unsetFlag` only in an annotated fallback (`species-reroll-handler.js:218`, `:236`).

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `SpeciesRegistry` | `scripts/engine/registries/species-registry.js:57` | 38 | `getById`, `getByName`, `getAll`, `getByCategory`, `search` |
| `applySpeciesVariantProfile` / `actorUsesResolvedSnapshot` | `scripts/species/species-variant-profile.js:203` / `:47` | 23 | base + variant → resolved profile; snapshot authority predicate |
| `computeSpeciesGrantKey`, `MANIFEST_FLAG`, `claimIndependentSkills` | `scripts/species/species-grant-reconciliation.js:1` | 7 | grant identity / stale-deletion helpers |
| `SpeciesGrantLedgerBuilder` | `scripts/species/species-grant-ledger-builder.js:143` | 2 | species → grant ledger |
| `SpeciesRerollHandler` | `scripts/species/species-reroll-handler.js:58` | 5 | reroll eligibility/use |
| `RageEngine` | `scripts/engine/species/rage-engine.js:114` | 5 | rage state, attack modifiers |
| `SpeciesConditionalGrantResolver` | `scripts/engine/species/SpeciesConditionalGrantResolver.js:59` | 3 | reconcile conditional bonus feats |
| `SpeciesActivatedAbilityEngine` | `scripts/engine/species/species-activated-ability-engine.js:12` | 1 (CombatEngine) | activate species ability |

## 5. Dependencies

Allowed (PROPOSED): infrastructure, data-registries, abilities-effects (ConditionEngine), governance. Observed outbound: combat (3), actor-core (3), progression (2), ui-shell (2). Species ← progression (25 edges). No engine→UI violation recorded for this domain. `species-plan-transaction.js` duplicates `MANIFEST_FLAG` import/export naming with `species-grant-reconciliation.js` (census duplicate symbol; it re-imports it, `scripts/species/species-plan-transaction.js:15` — not a second definition at runtime).

## 6. Integration points and lifecycle

`registerRerollListeners()` at init (`scripts/infrastructure/hooks/init-hooks.js:74`); `SpeciesConditionalGrantResolver.registerHooks(Hooks)` (`scripts/infrastructure/hooks/actor-hooks.js:134`) adds `createItem`/`deleteItem` listeners; an `updateActor` listener (`scripts/infrastructure/hooks/actor-hooks.js:85`) defers `reconcile(actor)` with `setTimeout(0)` guarded by `guardKey` and domain filter. Activated abilities enter from `CombatEngine` (`scripts/engine/combat/CombatEngine.js:19`).

## 7. Failure behavior and invariants

Reconcile is serialized per actor and idempotent by grant key (`SpeciesConditionalGrantResolver.js:113`, `:222`). Invariants referenced: A-02, A-05, A-11, A-12 (unknown is not false — conditional grants left deferred when conditions are not machine-extractable, SPECIES-RD-010). PROPOSED I-SPC-1: species materialization on an existing actor uses the same plan path as chargen.

## 8. Level C subsystem contracts

- **C-SPC-1 Species → progression:** `build-pending-species-context` + `SpeciesGrantLedgerBuilder` → pure materialization consumed by `SpeciesBackgroundPlanBuilder`. OBSERVED.
- **C-SPC-2 Species → equipment (anatomy):** schema v1 per the E2B-S2 contract. APPROVED (cited doc).

## 9. Tests and certification

Run read-only: `tests/species-drop-atomicity.test.mjs` (1/1 pass), `tests/species-publication-selection.test.mjs` (1/1). 24 species tests in the domain facts. The register records several species items as `OFFLINE_TESTED`, none `FOUNDRY_TESTED`. `docs/audits/swse-species-live-foundry-checklist.md` lists FOUNDRY_ACCEPTANCE_REQUIRED items.

## 10. Reconciliation with existing contracts

Agreements: anatomy schema contract (E2B-S2) matches `species-anatomy-schema-v1.js`; register entries are consistent with deferred code paths (no deferred mechanic found activated speculatively in the files read).

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-SPC-01 | `scripts/engine/systems/species/species-trait-engine.js:3` "Central engine for processing and applying species traits" | central trait engine | Orphan; the live trait path is the grant ledger + passive adapter (`scripts/engine/abilities/passive/species-trait-passive-adapter.js:18`) |
| CR-SPC-02 | `scripts/species/index.js:3` "Central export for all species-related functionality" | central module index | Orphan; nothing imports it |
| CR-SPC-03 | census reachability (`test-only-import`) for `species-plan-transaction.js` | test-only | Statically imported by `scripts/drag-drop/drop-handler.js:19`, which is itself orphan — consistent outcome (not live), different reason |

## 11. Phase 2 conformance summary

F-SPC-001 (medium, confirmed) 12 gameplay `ChatMessage.create` sites in the activated-ability engine; F-SPC-002 (medium, confirmed) atomic species-replacement transaction unwired (only caller orphan); F-SPC-003 (low, confirmed) dead legacy trait engine + index; F-SPC-004 (low, confirmed) annotated raw-flag fallback in reroll handler; F-SPC-005 (low, suspected perf) `updateActor`/`createItem`/`deleteItem` listeners schedule reconciliation per change; F-SPC-006 (info) mechanical-responsibility leads are delegations, not duplicates.

## 12. Unimplemented, deferred and acceptance-required

- DEFERRED_RULES_REVIEW: SPECIES-RD-001…023 (see register; none decided here). Particularly relevant to code paths read: RD-010 (Krevaaki conditional feat, conditional resolver), RD-013 (reroll result choice, reroll handler), RD-015 (Lugubraa natural-attack damage types), RD-017/018/019 (ability allocation, movement, size).
- U-SPC-01: species replacement on an existing actor through an atomic plan (R-SPC-07).
- FOUNDRY_ACCEPTANCE_REQUIRED: species change on an existing character; activated species abilities in combat; conditional bonus feats after skill training changes.

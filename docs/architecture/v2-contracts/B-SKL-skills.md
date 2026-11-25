# B-SKL — Skills, skill uses and skill challenges

**Contract level:** B. **Audited commit:** `f734b4d`. **Sidecar:** `data/audits/architecture-census/contracts/domains/skills.json`. Level-A IDs referenced, not restated. No `FOUNDRY_TESTED` claim (`A-13`).

## 1. Purpose and boundaries

Skills owns **skill identity and skill-use semantics**: the canonical skill list and key canonicalization, skill house-rule reads (`SkillRules`), feat/talent effects on skill checks (`SkillFeatResolver`, `SkillFeatRuleResolver`), the extra-skill-use registry and sheet dispatch (`SkillUseFilter`), retry bookkeeping (`SkillAttemptRegistry`), the ranked-skills house-rule engine, and GM skill challenges (`scripts/engine/skill-challenges/**`).

Skills must **not** own: skill **totals** (actor-core `DerivedCalculator`, `A-03`), the roll itself (rolls domain, `RollEngine`), chat rendering (`A-05`), actor mutation (`A-02`), trained-skill entitlement counts at level-up (progression; open as RECON-007).

Census scope: 34 runtime modules / ~7.1k SLOC (`scripts/skills/**`, `scripts/engine/skills/**`, `scripts/engine/skill-challenges/**`, `scripts/utils/skill-*.js`, `scripts/utils/extra-skill-use-registry.js`, `scripts/config/skills.js`, `scripts/apps/skill-modifier-breakdown-app.js`).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-SKL-01 | Canonical skill definitions + key canonicalization | `scripts/utils/skill-normalization.js` · `canonicalizeSkillKey`, `CANONICAL_SKILL_DEFS` | OBSERVED · CONFLICT (≈14 local normalizers) | source-inspected | `scripts/utils/skill-normalization.js:111`, `:198` |
| R-SKL-02 | Skill registry for progression (incl. Athletics consolidation) | `scripts/engine/progression/skills/skill-registry.js` · `SkillRegistry` | OBSERVED · CONFLICT (A-06) | source-inspected | `scripts/engine/progression/skills/skill-registry.js:8`, `:85` |
| R-SKL-03 | Skill house-rule reads | `scripts/engine/skills/SkillRules.js` · `SkillRules` | OBSERVED | source-inspected | `scripts/engine/skills/SkillRules.js:14` |
| R-SKL-04 | Feat/talent effects on skill checks | `scripts/engine/skills/skill-feat-resolver.js` · `SkillFeatResolver`; `scripts/engine/skills/skill-feat-rule-resolver.js` · `SkillFeatRuleResolver` | OBSERVED | source-inspected | `scripts/engine/skills/skill-feat-resolver.js:196`; `scripts/engine/skills/skill-feat-rule-resolver.js:131` |
| R-SKL-05 | Extra skill uses (pack-backed) and sheet dispatch | `scripts/utils/extra-skill-use-registry.js` · `ExtraSkillUseRegistry`; `scripts/utils/skill-use-filter.js` · `SkillUseFilter` | OBSERVED | test-verified (`tests/shield-recharge-skill-dispatch-authority.test.mjs`) | `scripts/utils/extra-skill-use-registry.js:57`; `scripts/utils/skill-use-filter.js:43`, `:348` |
| R-SKL-06 | Feat-eligibility extra-use metadata (same class name) | `scripts/engine/skills/extra-skill-use-registry.js` · `ExtraSkillUseRegistry` | OBSERVED (documented as distinct, file header) | source-inspected | `scripts/engine/skills/extra-skill-use-registry.js:2`, `:66` |
| R-SKL-07 | Retry bookkeeping (in memory) | `scripts/engine/skills/skill-attempt-registry.js` · `SkillAttemptRegistry` | OBSERVED | source-inspected | `scripts/engine/skills/skill-attempt-registry.js:21` |
| R-SKL-08 | Ranked-skills house rule | `scripts/engine/skills/ranked-skills-engine.js` | OBSERVED (no writes) | source-inspected | `scripts/engine/skills/ranked-skills-engine.js:28`, `:217` |
| R-SKL-09 | Skill challenges (state, rules, store, roll adapter) | `scripts/engine/skill-challenges/SkillChallengeEngine.js` · `SkillChallengeEngine`; `SkillChallengeStore` | OBSERVED | source-inspected | `scripts/engine/skill-challenges/SkillChallengeEngine.js:21`; `scripts/engine/skill-challenges/SkillChallengeStore.js:47`, `:88` |
| R-SKL-10 | Legacy consolidated skill-use classes | `scripts/skills/skill-uses.js` (`JumpUses` … `GatherInformationUses`) | OBSERVED dead (orphan) · legacy C | dependency-traced | `scripts/skills/skill-uses.js:24`, `:3435` |

## 3. Authorities

- **Canonical data:** skills compendium / `CANONICAL_SKILL_DEFS`; extra skill uses from `packs/extraskilluses.db` via `scripts/utils/extra-skill-use-registry.js` — OBSERVED.
- **Rules:** skill-use mechanics in `SkillUseFilter` + `extra-skill-use-registry` (live) — OBSERVED; the 2.6k-line `skill-uses.js` that several audit docs name as the implementation is dead (CR-SKL-01).
- **Calculation:** totals are read from `system.derived.skills` (`scripts/engine/skills/skill-feat-resolver.js:210`) — consumer, not a duplicate. Trained-skill entitlement is deferred (RECON-007).
- **Mutation/persistence:** none on actors in this domain (no write sites except a probe false positive). Skill challenges persist to a GM-only world setting (`SkillChallengeStore.js:81-88`) — legitimate world-state storage.

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `canonicalizeSkillKey` / `normalizeSkillMap` | `scripts/utils/skill-normalization.js:111` / `:176` | 10 | raw key → canonical key |
| `SkillRules` | `scripts/engine/skills/SkillRules.js:14` | 7 | house-rule getters, `normalizeSkillKey` |
| `SkillFeatResolver` | `scripts/engine/skills/skill-feat-resolver.js:196` | 7 | feat/talent skill effects |
| `ExtraSkillUseRegistry` (utils) | `scripts/utils/extra-skill-use-registry.js:57` | 5 | pack-backed skill uses |
| `SkillUseFilter` | `scripts/utils/skill-use-filter.js:43` | 5 | sheet skill-use dispatch |
| `SkillChallengeEngine` / `SkillChallengeStore` | `scripts/engine/skill-challenges/SkillChallengeEngine.js:21` / `SkillChallengeStore.js:47` | 2 / 6 | GM challenges |
| `SkillRegistry` | `scripts/engine/progression/skills/skill-registry.js:8` | 15 | progression skill list |

## 5. Dependencies

Allowed (PROPOSED): infrastructure, data-registries, rolls (roll execution), houserules (via `SkillRules`/HouseRuleService). Observed: skills → progression (7), classes (3), combat (3), chat (3). Static cycle: `scripts/engine/skills/skill-feat-resolver.js` sits in the 6-file SCC with `swse-chat.js`, `roll-engine.js`, `skill-feat-runtime-patches.js` (probe `P-A07-static-cycles`) — the runtime-patch file belongs to feats; flagged for that domain. `scripts/engine/skills/ranked-skills-engine.js` and `skill-resolution-layer.js` are in the large actor-core SCC.

## 6. Integration points and lifecycle

`Hooks.once('init')` in `scripts/utils/skill-use-filter.js:557`; `ready` cache build in `scripts/utils/skill-resolver.js:58`; `registerSkillChallengeSettings()` (`SkillChallengeStore.js:34`); `registerSkillFeatRuleResolver()` (`skill-feat-rule-resolver.js:266`). Vehicle crew skills dynamically import the utils registry (`scripts/sheets/v2/vehicle-sheet/crew-skill-router.js:243`).

## 7. Failure behavior and invariants

Store writes refused for non-GM (`SkillChallengeStore.js:81`). Retry registry is in-memory only (A-16 compliant; no persisted truth). Invariants referenced: A-03 (totals read-only), A-05 (skill challenge roll card uses `ChatMessage.create`, `SkillChallengeRollAdapter.js:127`), A-06, A-11. PROPOSED I-SKL-1: one skill-key canonicalizer.

## 8. Level C subsystem contracts

- **C-SKL-1 Skill challenges:** State/Rules/Store/Engine/RollAdapter/EffectResolver/FeatHooks — a real internal boundary: only `SkillChallengeStore` persists, only `SkillChallengeRollAdapter` talks to rolls/chat. OBSERVED.

## 9. Tests and certification

Run read-only: `tests/skill-uses-ability-authority.test.mjs` (1/1), `tests/shield-recharge-skill-dispatch-authority.test.mjs` (1/1), `tests/class-phase-6f9-shaper-lore.test.mjs` (6/6), `tests/class-phase-6f8-master-saboteur-reroll.test.mjs` (5/5). **Two of these read `scripts/skills/skill-uses.js` source text** (`tests/skill-uses-ability-authority.test.mjs:28`, `tests/class-phase-6f8-master-saboteur-reroll.test.mjs:83`), i.e. they protect dead code. FOUNDRY_ACCEPTANCE_REQUIRED: sheet skill uses (Quick Sabotage, recharge shields), skill challenge flow.

## 10. Reconciliation with existing contracts

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-SKL-01 | `docs/audits/class-phase-6f10-quick-sabotage.md:26`, `docs/audits/class-phase-6f11-saboteur-convergence.md:18`, `docs/audits/class-feature-contract-wave-a-matrix.md:13` | Quick Sabotage implemented in `MechanicsUses.disableDevice` (`skill-uses.js`) | `skill-uses.js` has no importer; live Quick Sabotage is `scripts/utils/skill-use-filter.js:348` / `scripts/utils/extra-skill-use-registry.js:152` |
| CR-SKL-02 | `docs/audits/ability-schema-authority-migration-phase3-ledger.md:155` | six skill-use sites "FIXED" | Fix landed in a dead file; certification evidence does not cover the live path |

Agreement: `scripts/engine/skills/extra-skill-use-registry.js:2-13` correctly documents that it is not the sheet registry.

## 11. Phase 2 conformance summary

F-SKL-001 (medium, confirmed) dead `skill-uses.js` (2.6k SLOC) still cited by audits and guarded by two tests; F-SKL-002 (medium, confirmed) ≈14 skill-key normalizers; F-SKL-003 (low, confirmed) two classes named `ExtraSkillUseRegistry`; F-SKL-004 (low, confirmed) A-06 direct setting read for Athletics in progression `SkillRegistry` (shared with F-PRG-015); F-SKL-005 (low) skill challenge chat outside swse-chat; F-SKL-006 (low) other unreachable modules; F-SKL-007 (info) probe false positives (`skill-attempt-registry.js:95` Map.delete; `SkillChallengeStore.js:62` world-state storage, not a house-rule read).

## 12. Unimplemented, deferred and acceptance-required

- DEFERRED_RULES_REVIEW: RECON-007 (trained-skill entitlement under skill house rules), SPECIES-RD-013 (skill reroll result), SWSE-NPC-RD-002 (Nonheroic Ride).
- FOUNDRY_ACCEPTANCE_REQUIRED: sheet extra skill uses, vehicle crew skill routing, skill challenges.

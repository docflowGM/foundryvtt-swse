# B-DAT — data-registries (canonical data authorities, registries, generic loaders)

**Level:** B. **Audited commit:** `f734b4d` (code identical at HEAD). **Sidecar:** `data/audits/architecture-census/contracts/domains/data-registries.json`. **Facts:** 54 files, 12 runtime modules (7 reachable, 5 unreachable), 3,710 SLOC. Many `scripts/data/*.js` and `scripts/engine/registries/*` files are attributed by the census to their item domains (feats, talents, classes, species, droids, customization); this contract covers the generic layer the census assigns here: `scripts/data/prerequisite-checker.js`, `scripts/data/authority/*` key/text helpers, `scripts/registries/language-registry.js`, `ClassModelAdapters`, `stable-key-migration`, `blade-colors`, and `schemas/*.schema.json`.

## 1. Purpose and boundaries

Owns: prerequisite evaluation over actor state (`PrerequisiteChecker`, 15 importers), canonical prerequisite/description text lookup (`prerequisite-text-helpers.js`), authority key normalization, the language registry, and JSON schemas for archetype/advisory data. Must **not** own: actor derived values (reads them; A-03), mutation, item-domain content (feats/talents own their canonical tables).

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-DAT-01 | Feat/talent/class/prestige prerequisite evaluation | `scripts/data/prerequisite-checker.js` · `PrerequisiteChecker` | OBSERVED · CONFLICT (live monkey-patched, F-PAT-001) | test-verified (`tests/prerequisite-ability-score-authority.test.mjs`) | `scripts/data/prerequisite-checker.js:263`, `:3053` |
| R-DAT-02 | Canonical prerequisite/description/benefit text | `scripts/data/authority/prerequisite-text-helpers.js` | OBSERVED | source-inspected | `scripts/data/authority/prerequisite-text-helpers.js:1` |
| R-DAT-03 | Authority key normalization | `scripts/data/authority/authority-key-normalizer.js` · `normalizeAuthorityKey` | OBSERVED | source-inspected | `scripts/data/authority/authority-key-normalizer.js:4` |
| R-DAT-04 | Language registry (compendium-backed, cached maps) | `scripts/registries/language-registry.js` · `LanguageRegistry` | OBSERVED | source-inspected | `scripts/registries/language-registry.js:12`, `:17` |
| R-DAT-05 | Class model adaptation for progression/chargen/engine | `scripts/data/adapters/ClassModelAdapters.js` | OBSERVED | source-inspected | `scripts/data/adapters/ClassModelAdapters.js:1` |
| R-DAT-06 | Data JSON schemas | `schemas/*.schema.json` | OBSERVED (consumers not traced) | unverified | `schemas/archetype.schema.json:1` |

## 3. Authorities

- Canonical prerequisite text: `scripts/data/authority/{feat,talent}-prerequisite-authority.js` (generated from `feats.txt`/`talents.txt`, `authority-key-normalizer.js:1`). APPROVED as generated data per Phase 5-C records (`data/audits/phase-5c-authority-classification.json`, evidence). OBSERVED.
- Prerequisite *rules*: implemented in PrerequisiteChecker; rule content follows published prerequisites — any ambiguity is A-11 territory (none raised in this pass).
- Level/BAB values used by prerequisites: read from actor state with local fallbacks (F-DAT-001) — CONFLICT with A-01.

## 4. Public interfaces

| Symbol | path:line | Importers | Contract |
|---|---|---:|---|
| `PrerequisiteChecker` | `scripts/data/prerequisite-checker.js:263` | 15 | `checkFeatPrerequisites`, `checkTalentPrerequisites`, `checkPrestigeClassPrerequisites`, … with `pending` draft state |
| `checkPrerequisites(actor, className)` | `scripts/data/prerequisite-checker.js:3053` | (15) | class prerequisites |
| `getAvailablePrestigeClasses` / `getQualifiedPrestigeClasses` | `scripts/data/prerequisite-checker.js:4005` / `:4025` | | |
| `LanguageRegistry.getByName/getById/getBySlug` | `scripts/registries/language-registry.js:128` | 9 | async, lazy-loaded |
| `normalizeAuthorityKey` | `scripts/data/authority/authority-key-normalizer.js:4` | 4 (+2 re-exports) | |

## 5. Dependencies

Allowed: infrastructure. Observed: depends on progression (9), talents (4), force, classes (registry) — PrerequisiteChecker reads progression ledgers for draft actors (`prerequisite-checker.js:3094`). Acceptable as reads; PROPOSED to inject draft state instead of importing progression.

## 6. Integration points and lifecycle

No hooks. Called synchronously from AbilityEngine (ABL), progression steps and talent UIs. Live monkey-patches replace PrerequisiteChecker methods at load: `feat-housekeeping-runtime-patches.js` (progression) and `canonical-ability-prerequisite-hotfix.js:140` (PAT).

## 7. Failure behavior and invariants

A-01 (F-DAT-001), A-09 (patched), A-12 (unknown is not false: `maxNumeric` returns 0 for no data, treating unknown BAB as 0 — consistent with "not met", recorded without ruling).

## 8. Level C subsystem contracts

None beyond the public interface.

## 9. Tests and certification

`tests/prerequisite-ability-score-authority.test.mjs`, `tests/phase-5c-canonical-production-negative.test.mjs`. Foundry acceptance: none required beyond progression flows.

## 10. Reconciliation

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-DAT-01 | `scripts/data/prerequisite-checker.js:3063` comment "Trust system.level as source of truth" | level from `system.level` | actor-core's `getTotalLevel` (`scripts/actors/derived/level-split.js`) derives level from class items/ledger; two definitions of total level |

## 11. Phase 2 conformance summary

| ID | Sev | Status | Title |
|---|---|---|---|
| F-DAT-001 | medium | confirmed | PrerequisiteChecker computes level and BAB locally; BAB = max over 12 stored/derived paths plus class state |
| F-DAT-002 | low | confirmed | 5 unreachable data modules |
| F-DAT-003 | medium | confirmed | `prerequisite-checker.js` is 4,029 lines and is monkey-patched by two live modules |
| F-DAT-004 | info | confirmed | `normalizeAuthorityKey` "duplicate" is a re-export (false positive) |

## 12. Unimplemented, deferred, acceptance-required

No DEFERRED_RULES_REVIEW items. FOUNDRY_ACCEPTANCE_REQUIRED: prerequisite evaluation on draft actors after any F-DAT-001 change (progression finalization is a runtime-risk area).

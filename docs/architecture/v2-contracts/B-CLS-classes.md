# B-CLS — Classes and prestige classes

**Contract level:** B. **Audited commit:** `f734b4d`. **Sidecar:** `data/audits/architecture-census/contracts/domains/classes.json`. Level-A IDs are referenced, not restated. No `FOUNDRY_TESTED` claim (`A-13`).

## 1. Purpose and boundaries

Classes owns **class content and its lookup**: the `foundryvtt-swse.classes` compendium (37 records), normalization of class records into one in-memory model, enumeration (base/prestige), class identity resolution (id / sourceId / name), the Nonheroic synthetic class model, and prestige-class prerequisite *data*.

Classes must **not** own: evaluating prerequisites (AbilityEngine / PrerequisiteChecker, prerequisites domain), BAB/defense/HP *totals* (actor-core derived calculators, `A-03`), level-up entitlement cadence (progression reconciler; RECON-001…005), mentor/suggestion identity weighting, actor mutation (`A-02`).

Census scope: 10 runtime modules / ~3.1k SLOC (`scripts/data/classes-db.js`, `scripts/engine/registries/classes-registry.js`, `scripts/data/class-normalizer.js`, `scripts/data/prestige-prerequisites.js`, `scripts/data/class-tag-metadata.js`, `scripts/data/class-relationship-registry.js`, `scripts/engine/prestige/**`). Class lookup helpers that physically live in progression (`scripts/engine/progression/utils/class-data-loader.js`, `class-resolution.js`, `class-normalizer.js`, `nonheroic-class-model.js`) are reconciled here because they act as class authorities.

## 2. Responsibility ownership

| ID | Responsibility | Owner | Status | Verification | Evidence |
|---|---|---|---|---|---|
| R-CLS-01 | Load class compendium, normalize, O(1) lookup ("SSOT") | `scripts/data/classes-db.js` · `ClassesDB` | OBSERVED · APPROVED (file header SSOT contract) | source-inspected | `scripts/data/classes-db.js:45`, `:125` |
| R-CLS-02 | Public enumeration API over ClassesDB (+ Nonheroic) | `scripts/engine/registries/classes-registry.js` · `ClassesRegistry` | OBSERVED | source-inspected | `scripts/engine/registries/classes-registry.js:46`, `:157` |
| R-CLS-03 | Class record normalization | `scripts/data/class-normalizer.js` · `normalizeClass` | OBSERVED · CONFLICT (second normalizer) | source-inspected | `scripts/data/class-normalizer.js:153`; `scripts/engine/progression/utils/class-normalizer.js:15` |
| R-CLS-04 | Legacy-shaped class cache for derived calculators (`getClassData`) with direct pack fallback | `scripts/engine/progression/utils/class-data-loader.js` · `getClassData` | OBSERVED · CONFLICT (parallel loader) | behavior-code-verified | `scripts/engine/progression/utils/class-data-loader.js:235`, `:124`, `:177` |
| R-CLS-05 | Class identity resolution for progression | `scripts/engine/progression/utils/class-resolution.js` · `resolveClassModel` | OBSERVED (delegates to ClassesRegistry) | source-inspected | `scripts/engine/progression/utils/class-resolution.js:61` |
| R-CLS-06 | Nonheroic synthetic class model | `scripts/engine/progression/utils/nonheroic-class-model.js` · `NONHEROIC_CLASS_MODEL` | OBSERVED · CONFLICT (divergent copy in class-data-loader) | behavior-code-verified | `scripts/engine/progression/utils/nonheroic-class-model.js:161`; `scripts/engine/progression/utils/class-data-loader.js:26` |
| R-CLS-07 | Prestige-class prerequisite data | `scripts/data/prestige-prerequisites.js` · `PRESTIGE_PREREQUISITES` | OBSERVED (only source; pack has no prerequisite field) | source-inspected | `scripts/data/prestige-prerequisites.js:34` |
| R-CLS-08 | Class tag/relationship metadata | `scripts/data/class-tag-metadata.js`, `scripts/data/class-relationship-registry.js` | OBSERVED | source-inspected | `scripts/data/class-tag-metadata.js:1` |
| R-CLS-09 | Prestige identity weighting for suggestions | `scripts/engine/prestige/identity-engine.js` · `IdentityEngine` (+ `prestige-layer-registry.js`, `bias-tag-projection.js`) | OBSERVED · misplaced (mentor-suggestion responsibility) | dependency-traced | `scripts/engine/prestige/identity-engine.js:29` |

## 3. Authorities

- **Canonical data:** class compendium normalized by `ClassesDB` — OBSERVED · APPROVED (header claims SSOT). In practice a second normalized cache (`class-data-loader`) feeds actor-core `bab-calculator` / `defense-calculator` — CONFLICT (A-01).
- **Rules:** class tables (BAB, hit die, defenses, starting features, talent trees) are data; prestige prerequisites are data in JS. Class-feature mechanics are owned by their feature domains and deferred items in the register (CF-RD-001, SWSE-NPC-RD-002/004, MSV-RD-006).
- **Calculation:** none owned; totals belong to actor-core. Three BAB implementations exist in progression (see B-PRG F-PRG-008).
- **Mutation:** none. Classes never write actors — OBSERVED (no probe hits).

## 4. Public interfaces

| Symbol | path:line | Consumers | Contract |
|---|---|---|---|
| `ClassesDB` | `scripts/data/classes-db.js:30` | 25 | `build()`, `get(id)`, `byName`, `all`, `baseClasses`, `prestigeClasses`, `fromItem` |
| `ClassesRegistry` | `scripts/engine/registries/classes-registry.js:46` | 23 | `initialize`, `getAll`, `getById`, `getByName`, `getBySourceId`, `resolveModel`, `getDocumentById` |
| `normalizeClass` / `normalizeClassId` | `scripts/data/class-normalizer.js:153` / `:75` | 15 | raw record → model |
| `getClassData` / `loadClassData` / `invalidateClassDataCache` | `scripts/engine/progression/utils/class-data-loader.js:235` | 8 | legacy-shaped model with `_raw.level_progression` |
| `PRESTIGE_PREREQUISITES` / `getPrerequisites` | `scripts/data/prestige-prerequisites.js:34` / `:640` | 9 | prestige prerequisite records |
| `IdentityEngine` | `scripts/engine/prestige/identity-engine.js:29` | 10 | pure bias computation for mentor/suggestion |

## 5. Dependencies

Allowed (PROPOSED): infrastructure, data-registries (talent tree DB link). Prohibited: UI, ActorEngine writes. Observed: classes ← progression (28 edges), mentor-suggestion (13); classes → mentor-suggestion (6, from `scripts/engine/prestige/**` importing archetype/suggestion modules, `scripts/engine/prestige/identity-engine.js:21`) — an upward edge caused by R-CLS-09 living here.

## 6. Integration points and lifecycle

`ClassesDB.build()` loads `game.packs.get('foundryvtt-swse.classes')` (`scripts/data/classes-db.js:45`) during system init (via registries initialisation; `ProgressionContentAuthority` also calls `ClassesRegistry.initialize?.()`, `scripts/engine/progression/content/progression-content-authority.js:51`). `class-data-loader` lazily loads from ClassesRegistry when initialized, else directly from the pack index (`scripts/engine/progression/utils/class-data-loader.js:177-185`), and is invalidated by `invalidateClassDataCache` (`:255`). No hooks registered by the domain.

## 7. Failure behavior and invariants

Unknown class → `null` model with logged warning (`class-resolution.js:75`); class-data-loader refuses to cache an empty result while the registry is not ready (header `:12`). Invariants: A-01 (one class model), A-11 (no invented class data), A-18 (Nonheroic is not a player class — `ClassesRegistry` exposes Nonheroic as a synthetic model only; enforcement is in progression entry/NPC guards, UNVERIFIED here). PROPOSED I-CLS-1: every class lookup resolves through `ClassesRegistry`; I-CLS-2: the Nonheroic model has one definition.

## 8. Level C subsystem contracts

None warranted: the domain is a data/registry layer. `C-CLS-1` (PROPOSED): ClassesRegistry is the only read API; class-data-loader becomes an adapter (`adaptClassForLoaderCompatibility`, `scripts/data/adapters/ClassModelAdapters.js`) over it without its own pack read.

## 9. Tests and certification

Run read-only: `tests/class-hit-die-defense-source.test.mjs` (5/5 pass), `tests/class-pack-protected-guard.test.mjs` (3/3), `tests/class-phase-6h-jedi-master-sith-lord-authority.test.mjs` (3/3). Baselines: `data/audits/class-mechanics-protected-baseline.json`. No test compares `class-data-loader` output with `ClassesRegistry` output, or the two Nonheroic definitions. FOUNDRY_ACCEPTANCE_REQUIRED: class list in chargen/level-up, prestige availability.

## 10. Reconciliation with existing contracts

Agreement: `scripts/data/classes-db.js:1-24` header (single access point) and `classes-registry.js` header (pure enumeration over ClassesDB) match the registry path.

| ID | Source | Claim | Observed |
|---|---|---|---|
| CR-CLS-01 | `scripts/data/classes-db.js:6` "THE ONLY authorized access point for class data" | single access | `class-data-loader.js:124` reads the pack index directly when the registry is not ready, with its own cache |
| CR-CLS-02 | `scripts/engine/progression/engine/class-normalizer.js:4` "only ONE file should think about class normalization" (names the progression utils normalizer) | one normalizer | Two: `scripts/data/class-normalizer.js:153` (used by ClassesDB, class-data-loader) and `scripts/engine/progression/utils/class-normalizer.js:15` (used by `chargen-shared.js`, `system-init-hooks.js`) |

## 11. Phase 2 conformance summary

F-CLS-001 (medium, confirmed) two Nonheroic models with divergent class skills; F-CLS-002 (medium, confirmed) parallel class loader/cache; F-CLS-003 (low, confirmed) two class normalizers + wrapper (legacy D); F-CLS-004 (low, confirmed) prestige identity weighting housed in classes; F-CLS-005 (low) unreachable `scripts/core/sidebar-icon-class-audit.js` is a UI diagnostic misattributed to this domain (dead C); F-CLS-006 (info) no probe hits — no mutation, chat, settings or cache violations in the domain.

## 12. Unimplemented, deferred and acceptance-required

- DEFERRED_RULES_REVIEW: SWSE-NPC-RD-002 (Nonheroic class skill "Ride"), SWSE-NPC-RD-004, CF-RD-001 (unreadable class features), MSV-RD-006 (talent-tree access for Charlatan/Jedi Master/Sith Lord/Independent Droid). Which Nonheroic class-skill list is correct is not decided here (F-CLS-001 only unifies the code paths after the ruling).
- Starting-credit fallback table in progression (B-PRG F-PRG-019) belongs to class data.
- FOUNDRY_ACCEPTANCE_REQUIRED: class enumeration with the pack not yet indexed at boot (fallback path).

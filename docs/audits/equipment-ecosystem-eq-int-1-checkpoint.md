# EQ-INT-1 — Equipment Foundation Integration (checkpoint)

**Status:** integration branch ready for independent review. Not self-certified. Not merged.
**Base:** `main` @ `48d1da19f7c112b903de16e4eea670e2588b13da` (TI4-C0 closure report merge, #1078; post-merge CI run 40524120463: 396 passed, 0 failed, 5 documented exclusions; Phase 5C pass).
**Integrated range:** `audit/equipment-ecosystem-e0-e1` from merge-base `185dac1` through `c63d798be9cbaeb352530abbbe7695bb9c78a416` (22 commits), brought in with one merge commit. No rebase, squash or cherry-pick.
**Not integrated:** everything after `c63d798`, i.e. E4-C1 WP1–WP5-C3 (the weapon-posture schema and cutover, coordinator, FireStateStore and combat-readiness changes) and TI-1 (#1059).
**Statuses:** `OFFLINE_TESTED` for the compatibility evidence below. Nothing is `FOUNDRY_TESTED`.

## 1. Commits on this branch

1. `2983c92`: **baseline first.** `tests/eq-int-1-species-compatibility.test.mjs` plus `tests/fixtures/eq-int-1-species-baseline.json`, captured from `main` @ `48d1da1` and passing there (6/6) before anything was merged.
2. `395dd14`: **merge of `c63d798`**, with parents `2983c92` and `c63d798`. The baseline still passes 6/6 on the merged tree.
3. Post-integration checks G–I added to the same test (9/9), plus this checkpoint.

## 2. Changed-file scope (merge, 45 files)

| Area | Files |
|---|---|
| Species data | `packs/species.db` (7 of 161 records) |
| Species runtime (live) | `scripts/engine/registries/species-registry.js`, `scripts/species/species-variant-profile.js`, new `scripts/species/species-anatomy-schema-v1.js` |
| New equipment resolvers (no runtime consumer) | `scripts/engine/equipment/{anatomy-resolver, droid-appendage-projection, effective-equipment-posture, equipment-capability-resolver, equipment-grip-resolver, equipment-posture, species-equipment-permissions}.js` |
| Tests | 11 new suites (`equipment-e2a-*`, `equipment-e2b-*`, `equipment-e3a*`, `species-anatomy-*`); 2 existing suites extended with assertions only (`species-variant-atomic-profile`, and `weapon-runtime-builder-negative`, which allowlists `equipment-grip-resolver.js` as a read-only canonical-weapon consumer). No assertion was removed or weakened. |
| Docs | 21 E0–E4-C0 audit and architecture documents. `docs/audits/swse-rules-decisions-pending.md` is **not** touched by this range (0 removed lines). |

Not touched: `template.json`, `system.json`, `index.js`, templates, styles, any sheet, combat, inventory, weapon-state, store or transaction file.

## 3. Species compatibility evidence

**Record audit (all 161):** exactly 7 records changed, and in each the only difference is one added `system.variants[N].anatomy`. Every other field, the record order, the line count and the trailing newline are unchanged.

| Species | Variant | Source case |
|---|---|---|
| Codru-Ji | `codru-ji-leg-2c-03` | E2B-RD-01 |
| Ryn | `ryn-sv-2f-06` | E2B-RD-02 |
| Trianii | `trianii-gaw-2i-06` | E2B-RD-03 |
| Krevaaki | `krevaaki-ur-2b-04` | E2B-RD-04 |
| Killik | `killik-ur-2b-12` | E2B-RD-05 (typical Medium body plan only) |
| Dug | `dug-cw-2h-01` | E2B-RD-07 |
| Lugubraa | `lugubraa-ur-2b-13` | E2B-RD-08 |

Provenance is the E2B-S1 source review and the E2B-I2 checkpoint. No base entry and no other variant gained anatomy; `krevaaki-jatm-2j-04` and the legacy Krevaaki variant are untouched.

**Characterization test** (`tests/eq-int-1-species-compatibility.test.mjs`, baseline `main@48d1da1`):

| Check | Result |
|---|---|
| A. Pack: 161 ids in the same order; each record identical to baseline with anatomy removed | PASS |
| B. `SpeciesRegistry._normalizeEntry` of every record identical to baseline | PASS |
| C. `_dedupeAndCollapseVariants`: identical visible species and variant ids | PASS |
| D. `applySpeciesVariantProfile` for all 124 variants identical to baseline; none throws | PASS |
| E. Existing actors: the persisted `speciesVariant` identical; `actorUsesResolvedSnapshot` unchanged | PASS |
| F. Anatomy only at the 7 approved locations | PASS |
| G. Exactly those 7 carry anatomy; every shipped declaration validates; the validator still rejects malformed input | PASS |
| H. Registry and resolved profiles carry anatomy only for those 7 | PASS |
| I. Static guard: no import of the 7 new resolvers outside `scripts/engine/equipment/`; schema used only by the registry, the variant profile and the anatomy resolver | PASS |

**Mutation evidence** (each temporary edit was reverted):

| Mutation | Caught by |
|---|---|
| Changed `speed` on one record | A, B, D |
| Anatomy added to an unapproved variant | F |
| Two records swapped in order | A, C |
| Runtime import of `equipment-grip-resolver.js` from `character-actor.js` | I |
| Approved anatomy removed (Dug) | G, H |
| Malformed shipped anatomy (Dug `schemaVersion: 2`) | normalization throws `SpeciesAnatomySchemaError`; the suite exits 1 |

**Existing actors:** nothing is migrated or reset. Existing actors keep their stored `speciesVariant` without anatomy, and every runtime reader of actor species state calls only `actorUsesResolvedSnapshot`, whose code is unchanged. Those readers are `defense-calculator`, `character-actor`, `ability-execution-coordinator` and `species-trait-passive-adapter`.

## 4. Gameplay cutover: none

- No sheet, combat, weapon-state, inventory, action-economy or transaction code changes. The seven new resolvers are imported only by each other and by tests; `index.js` loads none of them.
- `equipment-grip-resolver.js` reads canonical weapon facts read-only; nothing at runtime calls it.
- EQ-001–EQ-004 are not introduced by this range; they belong to WP4/WP5, which are not integrated.

## 5. Observable effects and residual risks (for the reviewer)

1. **New actors of the 7 variants persist `speciesVariant.anatomy`.** Chargen (`apply-canonical-species-to-actor.js` `_materializeSpeciesIdentity`) writes the whole normalized variant to `system.speciesVariant` and `flags.swse.speciesVariant`. `template.json` defines that object loosely, so the key is stored. No runtime code reads it today, so this is inert data, not a gameplay change. Suppressing it would mean changing chargen, which is outside this integration; flagged for decision.
2. **Fail-closed registry load.** A malformed `anatomy` in the species compendium makes normalization throw. `SpeciesRegistry._loadFromCompendium` rethrows, which would leave no species available. Shipped data is proven valid (check G). A GM who unlocks and hand-edits the system species pack could trigger it.
3. **Partial capability data is deliberate.** Some capabilities are `null` (Ryn/Trianii tail manipulate, Dug wield, Lugubraa wield/manipulate); per E2B-I2 §4 they are not claims either way. Killik covers the typical Medium body plan only (compare SPECIES-RD-019).
4. `git diff --check` flags one trailing blank line at the end of the imported `docs/architecture/equipment-ecosystem-authority-contract-v1.md`. Left as imported.

## 6. Validation

Local rolling suite: **408 passed, 0 failed** (5 documented exclusions), i.e. the 396 from `main`, the 11 imported suites and the new EQ-INT-1 test. Syntax check (all files), `validate-partials`, `system.json` parse and all 26 workflow guards pass locally. Exact-head CI: pending on the pushed head (see the PR).

## 7. Not done (by directive)

WP1 and later equipment work, WP3-B, TI4-B G18, modification integration (#1057), H7, EQ-001–EQ-004 rulings, any character migration or reset, any Foundry runtime test. Stopped for independent review; not merged.

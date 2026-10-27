# Equipment Ecosystem — E2B-I3A Checkpoint: Canonical Biological Anatomy Resolver Integration

**Phase:** E2B-I3A only. E2B-I3B (universal identity / unresolved-record / injected droid-adapter corrections), E3, Near-Human, encumbrance and later phases are **not** authorized or started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `3479328e6b8c9a375ec18e130054cf45863422c2` (clean tree; CI run 39036147285 green).
**Statuses:** `IMPLEMENTED`, `OFFLINE_TESTED` for the biological resolver path. Not `FOUNDRY_TESTED`. No rules decision was needed or made.

## 1. Resolver contract (biological path)
`scripts/engine/equipment/anatomy-resolver.js` now validates declared `speciesProfile.anatomy` with the schema authority `scripts/species/species-anatomy-schema-v1.js` (`validateSpeciesAnatomyV1`); the provisional reader is removed and no second validator exists.

- **Malformed declarations** throw `AnatomyInputError` and never fall back to the default. Code is `INVALID_CAPABILITY` when the schema code is `INVALID_CAPABILITY`, otherwise `INVALID_ANATOMY`; the error carries `schemaCode` and `schemaPath` from the original `SpeciesAnatomySchemaError`. A supplied `null` is malformed (`INVALID_ANATOMY_TYPE`); only an absent/`undefined` own property means "no anatomy" (previously `null` was silently treated as absent).
- **Appendage projection:** `id`, `kind`, `capabilities` (explicit tri-state from the schema), `constraints` (independent copies), identity `{slot: id, instance: null, part: null}`, `functionalState: functional` with source `species-anatomy`. No appendage beyond the declared topology is created. Biological slot identity stays distinct from droid installed-instance identity.
- **Topology (E2B-S2A OD-1):** `complete` + all capabilities and states established -> `resolved`; `complete` with zero appendages -> `resolved`, empty, **no default**; `partial` -> `partial` + warning `anatomy-topology-partial`, known appendages kept; `unresolved` -> `unresolved` + blocking `anatomy-topology-unresolved`, no appendages. A `null` capability or an unresolved functional state makes a complete topology `partial` (`capability-unknown`); known `false` does not. The result gains an optional `topologyStatus` field when species anatomy is used.
- **Constraints** (`held-item-load-floor` for Ryn and Trianii) are copied through verbatim and never evaluated: no size comparison, load/encumbrance calculation, actor change or `EncumbranceEngine` call; not turned into prose.
- **Functional state:** canonical anatomy cannot declare it (schema rejects `functionalState`, `restrictions`, etc.). `functionalOverrides` can only restrict; unknown ids are reported (`override-unknown-appendage`), never materialized; canonical anatomy is never touched. Inputs are neither mutated nor frozen; output is deep-frozen and deterministic.

## 2. Publication-profile fail-closed guard
`TEMPORARY_FAIL_CLOSED_PUBLICATION_IDENTITIES` (exported, documented as temporary) holds the exact variant ids and source profile ids of the seven certified profiles plus `krevaaki-jatm-2j-04` / `JATM-2J-04`. Identity is read only from the effective profile's `selectedVariantId`, `selectedVariant.id` and `selectedVariant.sourceProfileId`; names, prose and traits are never parsed. If a match has no structured anatomy the result is `unresolved`, `defaultApplied: false`, no appendages, issue `anatomy-exception-unresolved` with `{variantId, sourceProfileId, temporary: true}`. Either exact id matching is enough (fail-closed). The existing exact trait guards (`extra-arms`, `prehensile-tail`) are unchanged. Ordinary species keep the two-arm fallback; a missing species profile stays `partial` with `species-profile-not-provided`. It is an exact-id set, not a species registry, and carries no anatomy.

## 3. Per-profile results (real pack -> registry normalization -> `applySpeciesVariantProfile` -> resolver)
| Profile | Status | Notes |
|---|---|---|
| `codru-ji-leg-2c-03` | resolved | 4 arms, no default, no attack data |
| `ryn-sv-2f-06` | partial | 2 arms + `tail-1` (hold true, wield false, manipulate null); exact constraint preserved |
| `trianii-gaw-2i-06` | partial | same, independent objects |
| `krevaaki-ur-2b-04` | resolved | 2 dominant tentacles |
| `killik-ur-2b-12` | resolved | 4 arms |
| `dug-cw-2h-01` | partial | 2 lower limbs, wield null |
| `lugubraa-ur-2b-13` | partial | 2 grasping tentacles, wield/manipulate null |
| `krevaaki-jatm-2j-04` | unresolved | no inherited anatomy; fails closed |

`resolved` here means anatomy is established, not that anything may be allocated: slot identity exists but no installed-instance concept applies to biology, and E3 owns allocation.

## 4. Tests (Node 22, in-repo shim; offline only)
- New `tests/equipment-e2b-i3a-biological-integration.test.mjs`: 13 checks, exit 0.
- `tests/equipment-e2a-anatomy-resolver.test.mjs`: 21 checks, exit 0. Species fixtures moved to schema v1 (`an(...)` helper) with intent preserved; `restrictions` fixtures became `constraints`; the species-declared `functionalState: disabled` loosening fixture became an override restricting the default state, because schema v1 forbids per-actor state (the loosening diagnostic remains covered on the droid path). Synthetic fail-closed guard tests untouched. `INVALID_ANATOMY`/`INVALID_CAPABILITY` assertions kept.
- Also exit 0: droid projection (14), schema v1 (11), profile certification (13), variant-atomic, multi-publication, publication-selection, profile-invariants, snapshot-consumers.
- All 391 `tests/*.test.mjs` files: 386 exit 0, 5 exit 1 — the documented pre-existing force-power failures (`force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`), not repaired here. `rolling-ci-support-check` exit 0 when run alone. `node --check` passes on the changed module and new test.

## 5. Unchanged
No pack, schema validator, registry, snapshot projection, droid projection or adapter contract, actor, chargen, Near-Human, inventory, weapon, armor, combat, encumbrance, sheet/UI, modification or vehicle file changed. Droid adapter behavior and E2A-C3 expectations are unchanged. DR-001…DR-010 remain `DEFERRED_DROID_REFACTOR`.

## 6. Remaining gates
E2B-I3B: unresolved adapter records must prevent an incorrect `resolved`; duplicate confirmed physical slots; duplicate confirmed installed-instance identities; injected-adapter contract. Later: Codru-Ji trait-to-permission projection, independent certification of `krevaaki-jatm-2j-04`, replacing the temporary identity guard with species-authority completeness, Near-Human, encumbrance, E3 allocation, Foundry certification. Open limitation: the guard set is a hard-coded temporary list in the resolver.

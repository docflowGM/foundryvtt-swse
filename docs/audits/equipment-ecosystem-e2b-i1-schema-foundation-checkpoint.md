# Equipment Ecosystem — E2B-I1 Checkpoint: Species Anatomy Schema and Publication-Pipeline Foundation

**Phase:** E2B-I1 only. E2B-I2 (source-verified species records), E2B-I3, the E2A pre-E3 corrections and E3 are **not** authorized or started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `735baa46e7a270c4f8165c7d5b905fb6133c80b9` (clean tree, as expected).
**Authority:** `docs/architecture/equipment-ecosystem-e2b-s2-species-anatomy-schema-contract-v1.md` (incl. §15), `docs/audits/equipment-ecosystem-e2b-s1-species-anatomy-source-review.md`, `docs/architecture/equipment-ecosystem-authority-contract-v1.md`.
**Certifies:** schema validation and publication-pipeline plumbing only. **Not** production biological anatomy, **not** Foundry runtime behaviour. No species pack changed; no gameplay consumer changed.

## 1. Implemented shape — `scripts/species/species-anatomy-schema-v1.js` (new, pure)

Exports: `validateSpeciesAnatomyV1(raw, path?)`, `readOptionalSpeciesAnatomy(owner, path?)`, `declaresSpeciesAnatomy(owner)`, `SpeciesAnatomySchemaError`, `SPECIES_ANATOMY_ERROR_CODES`, `SPECIES_ANATOMY_SCHEMA_VERSION`, `TOPOLOGY_STATUSES`, `CAPABILITY_KEYS`, `SUPPORTED_CONSTRAINT_TYPES`, `HELD_ITEM_LOAD_FLOOR_V1`. No Foundry, engine, weapon-runtime or encumbrance imports; nothing persisted.

```json
{ "schemaVersion": 1, "topologyStatus": "complete",
  "appendages": [ { "id": "natural-arm-1", "kind": "arm",
                    "capabilities": { "canHold": true, "canWield": true, "canManipulate": true } } ] }
```
(synthetic example, not a production declaration)

Rules enforced:
- `schemaVersion` must equal `1`; `topologyStatus` ∈ `complete | partial | unresolved`; `appendages` is an array.
- Every appendage: non-empty string `id` and `kind`; ids unique within the declaration; a `capabilities` object in which **all three** of `canHold`, `canWield`, `canManipulate` are present and explicitly `true`, `false` or `null`. A missing capability key is an error — it is never defaulted (unknown must be written `null`).
- `complete` may have zero appendages (an explicitly verified empty set, distinct from absent anatomy); `partial` requires ≥ 1 appendage; `unresolved` must declare none.
- Strict keys: anything outside the schema is rejected. Names that describe per-actor functional/damage state, occupancy, readiness, attack entitlements or combat modifiers (`functionalState`, `disabled`, `damaged`, `occupied`, `ready`, `attackCount`, `modifiers`, `multipleAttackPenalty`, …) are rejected with the dedicated `FORBIDDEN_FIELD` code.
- Output: a **new, deeply frozen copy**. The caller's object is never mutated, frozen or aliased.
- Absent vs malformed: a missing / `undefined` / inherited-from-prototype `anatomy` is valid (absent). `null` and any other supplied value is a declaration and must validate; `null` is `INVALID_ANATOMY_TYPE`, never an ordinary default.

### Typed holding restriction
The single supported constraint, exactly the approved values:
```json
{ "type": "held-item-load-floor", "when": "held-by-appendage", "itemSizeAtLeast": "Medium", "loadCategoryFloor": "heavy", "imposesEncumbered": true }
```
Other types → `UNSUPPORTED_CONSTRAINT_TYPE`; missing, wrong-valued or extra (e.g. prose) fields → `INVALID_CONSTRAINT` / `UNKNOWN_FIELD`. It is data only: no item-size comparison, no weight or encumbrance calculation, no import of `EncumbranceEngine` or the weapon runtime. (Accepting only `"Medium"` / `"heavy"` / `true` is the strict reading of "approved values"; widening the vocabulary is a later decision.)

### Error codes (`SpeciesAnatomySchemaError.code`, with `path`)
`INVALID_ANATOMY_TYPE`, `INVALID_SCHEMA_VERSION`, `INVALID_TOPOLOGY_STATUS`, `INVALID_APPENDAGES`, `INVALID_APPENDAGE`, `INVALID_APPENDAGE_ID`, `INVALID_APPENDAGE_KIND`, `DUPLICATE_APPENDAGE_ID`, `INVALID_CAPABILITIES`, `MISSING_CAPABILITY`, `INVALID_CAPABILITY`, `PARTIAL_TOPOLOGY_REQUIRES_APPENDAGE`, `UNRESOLVED_TOPOLOGY_HAS_APPENDAGES`, `INVALID_CONSTRAINTS`, `INVALID_CONSTRAINT`, `UNSUPPORTED_CONSTRAINT_TYPE`, `FORBIDDEN_FIELD`, `UNKNOWN_FIELD`.

## 2. Integration paths

| File | Change |
|---|---|
| `scripts/engine/registries/species-registry.js` | imports the validator; `_normalizeEntry` preserves a validated base `system.anatomy`; `_normalizeVariants` preserves a validated `variant.anatomy` (any variant kind, from that variant only); `_variantFromEntry` (the collapse/convert helper) carries only the converted entry's own anatomy. No anatomy is manufactured for existing species. Malformed declarations throw (the pack loader's existing try/catch logs and rethrows), they do not disappear. `getAll()` needed no change: stored anatomy is deeply frozen, so shared references cannot corrupt registry state. |
| `scripts/species/species-variant-profile.js` | `applyCompleteSnapshot` preserves validated anatomy **from the selected variant only** (explicit whitelist entry); `applyLegacyOverlay` now strips the base's `anatomy` from the historical `...base` spread and adds only anatomy declared on the variant itself; imports the validator through a relative path so the module stays loadable under plain Node. `listMissingSnapshotFields()` is **unchanged** — anatomy remains globally optional. |

Invariants verified by tests: a complete snapshot with valid anatomy exposes it; a complete snapshot without anatomy never inherits the base's; when base and variant both declare, the variant alone supplies it; different publication variants keep different anatomy; a legacy overlay without its own anatomy does not inherit the base's; an overlay's own declaration is preserved from that variant; no variant at all returns the base species' own anatomy (a base selection, not an inheritance); malformed declarations throw; input objects (including frozen ones) are unchanged; existing atomicity, fallback reporting and identity behaviour are unchanged.

## 3. Tests

New `tests/species-anatomy-schema-v1.test.mjs` (11 checks): valid and malformed schema cases (two-arm, four-arm, zero-manipulator, unknown capabilities, restricted tail, partial and unresolved topology, bad version / status / duplicates / capabilities / constraints, forbidden actor-state and combat fields, deterministic independent frozen copies, absent-vs-null), registry normalization (`_normalizeVariants`, `_normalizeEntry`, `_variantFromEntry`), publication projection (`applySpeciesVariantProfile`), and a guard that **no production species record declares anatomy**. Updated `tests/species-variant-atomic-profile.test.mjs` (anatomy follows the atomic-snapshot rule). All fixtures are synthetic; `packs/species.db` is only read to prove it is untouched in effect.

Commands (offline, Node v22.22.0, in-repo Foundry shim; each `node tests/<file>`; `node --check` also run on the three production modules — all pass):

| Run | Result |
|---|---|
| `tests/species-anatomy-schema-v1.test.mjs` | exit 0 — 11 checks |
| `tests/species-variant-atomic-profile.test.mjs` | exit 0 — PASS |
| `tests/species-snapshot-consumers`, `species-profile-invariants`, `species-multi-publication`, `species-multi-publication-trait-verification`, `species-publication-selection`, `species-source-pinned` (+ the other species suites) | exit 0 |
| `tests/equipment-e2a-droid-appendage-projection.test.mjs` | exit 0 — 14 checks |
| Original 31-file E0 baseline | 31 of 31 exit 0 |
| **`tests/equipment-e2a-anatomy-resolver.test.mjs`** | **exit 1 — see §4** |

38 files run in total: 37 exit 0, 1 exit 1. No silent test file was observed beyond the known `droid-mode-adapter.test.mjs` (exit 0, no output).

## 4. Known, expected regression requiring authorization (not edited)

`tests/equipment-e2a-anatomy-resolver.test.mjs` check [7] — the E2A test headed "observation recorded for E2B: legacy overlay variants inherit base fields wholesale, including a future base anatomy" — fails at line 113 (`r2.source` is now `default`, not `species-anatomy`). That assertion **pins the old behaviour that this directive requires to change** (invariants 5 and 6: a legacy overlay must not silently inherit base anatomy). The failure is therefore the intended consequence, not a defect in the new code.

Per the directive ("if an additional production or test file is necessary, report the dependency before touching it") the file was **not** modified. Dependency to authorize: update that one E2A test so the legacy-overlay case asserts the *new* behaviour (no inherited base anatomy → the two-arm default, `defaultApplied: true`). No production E2A code needs to change.

## 5. Remaining limitations

- No production species declares anatomy; the E2A resolver does not yet read the registry's anatomy (that connection is E2B-I3) and the temporary E2A exception guards are untouched.
- Constraint vocabulary is intentionally minimal (one type, one set of approved values).
- Registry load fails loudly if a pack record declares malformed anatomy; behaviour for production data is moot until E2B-I2.
- Other readers of `entry.variants` (publication selection, progression steps, near-human builder, drop handler) were not changed or re-audited; they receive the same variant objects, now possibly carrying a frozen `anatomy`.
- Offline only; not Foundry-tested. Droid refactor and DR-001…DR-010 remain `DEFERRED_DROID_REFACTOR`.

## 6. Remaining dependencies

**E2B-I2:** source-verified anatomy records for the seven reviewed publication profiles with exact-profile tests, and the temporary fail-closed coverage; independent review of `krevaaki-jatm-2j-04`. **E2B-I3:** connect canonical anatomy to the E2A resolver, fail-closed exceptions, and the pre-E3 completeness / identity corrections. Also gated: Near-Human actor alterations (and the missing `_buildNearHumanContext`), the trait-to-permission projection for Codru-Ji, encumbrance integration, Foundry certification.

## 7. Changed files

New: `scripts/species/species-anatomy-schema-v1.js`, `tests/species-anatomy-schema-v1.test.mjs`, `docs/audits/equipment-ecosystem-e2b-i1-schema-foundation-checkpoint.md`. Modified: `scripts/engine/registries/species-registry.js`, `scripts/species/species-variant-profile.js`, `tests/species-variant-atomic-profile.test.mjs`. No pack, E2A, actor, chargen, inventory, weapon, armor, combat, encumbrance, droid, modification, sheet or UI file changed.

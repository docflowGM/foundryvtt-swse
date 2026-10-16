# Equipment Ecosystem — E2A Checkpoint: Read-Only Anatomy Resolution

**Phase:** E2A only. E2B and E3–E9 remain unauthorized and unstarted.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 (no new branch or PR).
**Not certified:** nothing here is Foundry-runtime tested. Offline Node tests only. No gameplay behaviour changed.

## 1. Starting point

Starting HEAD: `7cbfd5d0ecc1d50c7f4835dd6329b33d6db2c749` (matched the expected checkpoint; `origin/audit/equipment-ecosystem-e0-e1` was identical). `main` was not synchronized (still `4392c90` upstream); no rebase, merge or cherry-pick.

## 2. Approved decisions applied

| ID | Ruling | How E2A applies it |
|---|---|---|
| OA-7 | Species anatomy = optional structured `anatomy` on the **effective** species profile; not in the trait-rule vocabulary; respects complete snapshots; default two ordinary arms | resolver reads `speciesProfile.anatomy` **only from the profile passed in**; no snapshot/pack/whitelist change (E2B) |
| OA-8 | Slot, installed-instance and canonical-part identities are separate; type, array index and `additional-N` are not instance identity | every appendage carries `identity {slot, instance, part}`; the droid projection establishes `instance` only from an embedded Item document id; `slot` is always `null` (not available) |
| OA-4 | Functional state belongs to the effective anatomy: functional / disabled / missing / unresolved | read from installed/enabled evidence; explicit overrides supported in pure tests; no permanent damage / severed field |
| OA-2 | Derived read-only snapshot; no persistent equipment state | nothing stored |
| OA-9 | Atomicity deferred to E5 | no mutation of any kind |

**Droid refactor dependency (addendum):** the current droid implementation is treated as legacy / pre-refactor infrastructure, even where its files call themselves canonical. Droid work in E2A is diagnostic and read-only; droid defects are recorded in §12, not repaired.

## 3. Modules and exports

### `scripts/engine/equipment/anatomy-resolver.js` (universal, actor-type neutral, pure)
Exports: `resolveEffectiveAnatomy(input)`, `AnatomyInputError`, `ANATOMY_STATUS`, `ANATOMY_SOURCE`, `FUNCTIONAL_STATES`, `TEMPORARY_UNRESOLVED_EXCEPTION_TRAIT_IDS`, and a default object of the same.

### `scripts/engine/equipment/droid-appendage-projection.js` (isolated, replaceable, read-only)
Exports: `projectDroidAppendages(installedComponents, deps?)` (pure), `projectActorDroidAppendages(actor, deps?)` (runs the existing `resolveInstalledDroidComponents`, then projects), `FUNCTIONAL_STATE_RANK`.
Defaults use the existing `resolveInstalledDroidComponents`, canonical `getDroidPartDefinition` / `normalizeDroidPartId` (`scripts/data/droid-part-schema.js`) and the structural catalog already hydrated onto each definition (`scripts/data/droid-systems.js`, via `definition.source`). Resolution, definition and catalog lookups are all injectable (`resolveComponents`, `normalizeId`, `getDefinition`, `catalogEntryFor`). The universal resolver accepts a replacement adapter through `deps.projectInstalledComponents`, so the legacy droid adapter can be swapped out without touching the universal resolver.

## 4. Resolver contract

Input: `{ actorType, speciesProfile, installedComponents, functionalOverrides, deps? }`.
- `actorType`: explicit classification (`character`, `npc`, `droid`, `vehicle`). Droid also when the already-resolved profile states `speciesActsAsDroid === true`. Missing → `unresolved` (`actor-type-unknown`); `vehicle`/other → `unresolved` (`actor-type-unsupported`).
- `speciesProfile`: an already-resolved **effective** profile (never a name lookup).
- `installedComponents`: the result of `resolveInstalledDroidComponents()` (`{ components: [] }`).
- `functionalOverrides`: `{ [appendageId]: 'functional'|'disabled'|'missing'|'unresolved' | { state } }`.

Output (deep-frozen, deterministic): `{ anatomyKind, status, source, defaultApplied, appendages, issues, unresolvedRecords? }`.
- `status`: `resolved` (identity and capability facts established) · `partial` (some usable established facts, but unknown capabilities / unresolved states / blocking issues remain) · `unresolved` (insufficient reliable information).
- `source`: `default` · `species-anatomy` · `droid-installed-component` · `none`.
- Appendage: `{ id, kind, source, identity {slot, instance, part}, capabilities {canHold, canWield, canManipulate}, functionalState, functionalStateSource, restrictions? }`. Capabilities are tri-state: `true` / `false` / `null` (**null = unknown, never promoted to true**).
- Issue: `{ code, severity: info|warning|blocking, message, details }`. Ordinary missing/ambiguous evidence is an issue, not an exception.
- Errors: `AnatomyInputError` (`code`: `INVALID_INPUT`, `INVALID_ACTOR_TYPE`, `INVALID_SPECIES_PROFILE`, `INVALID_INSTALLED_COMPONENTS`, `INVALID_FUNCTIONAL_OVERRIDES`, `INVALID_ANATOMY`, `INVALID_CAPABILITY`) only for input that violates the API, including a malformed provided `anatomy`.
- Inputs are never mutated or normalized in place; frozen inputs are accepted.

Issue codes: `species-profile-not-provided` (info), `anatomy-exception-unresolved` (blocking, `temporary:true`), `capability-unknown`, `functional-state-unresolved`, `override-unknown-appendage` (warning), `override-less-restrictive-than-evidence` (info), `installed-components-not-provided`, `no-appendage-evidence`, `droid-appendage-instance-unestablished`, `droid-appendage-duplicate-same-type-records` (blocking), `component-not-installed` (info), `actor-type-unknown`, `actor-type-unsupported`.

The resolver does **not** compute hand occupancy, grips, readiness or attack permission, and contains no attack data.

## 5. Species default behaviour

Biological actor with no `anatomy` and no known-exception guard → two functional general-purpose arms `natural-arm-1`, `natural-arm-2` (hold / wield / manipulate all `true`), `defaultApplied: true`, `source: default`. No `arms: 2` is stored on any species. A missing species profile still receives the default with an `info` issue.

Optional `speciesProfile.anatomy` (synthetic test shape; **not an approved schema**): `{ appendages: [{ id, kind, capabilities?, functionalState?, restrictions? }] }` → used verbatim (validated, copied), `defaultApplied: false`; undeclared capabilities remain `null` → `partial`.

### Temporary unresolved-exception guards (remove in E2B)
Exact trait ids `extra-arms` and `prehensile-tail` in the effective profile's `canonicalTraits` / `traits` mark the anatomy `unresolved`: no default is applied, no count or capability is computed, no species name is special-cased, prose is never parsed. The guards stand down when a structured `anatomy` is supplied. Verified against the **real** Codru-Ji (`codru-ji-leg-2c-03`) and Ryn (`ryn-sv-2f-06`) complete snapshots from `packs/species.db` through the real `applySpeciesVariantProfile`.

## 6. Complete-snapshot handling

`applySpeciesVariantProfile` was not changed. Test evidence: a complete snapshot built from a base that carries a (synthetic) `anatomy` does **not** carry it (the whitelist drops unlisted fields), so the resolver applies the default rather than inheriting base anatomy.

**Observation for E2B (not changed):** a *legacy overlay* variant is built with `...base`, so a future base-level `anatomy` would flow into legacy overlay profiles wholesale (a test pins this current behaviour). Whether that is acceptable belongs to the E2B species schema work.

## 7. Droid installed-component projection (diagnostic, read-only)

- Only **base appendage** definitions (`slot === 'appendage'` and `category === 'appendage'`: hand, claw, tool, instrument, probe) are considered. Mounts, enhancements, appendage weapons, shields and utility parts never become manipulators.
- **Instance identity** exists only through embedded Item document ids. One Item → one appendage `droid-appendage:<itemId>`; several Items of one type with no other tier's records → several independent appendages. Anything else (ledger-only, `droidSystems`-only, duplicated tier records, several Items mixed with other tiers' records) is returned as an **unresolved record** with a blocking issue; the record count and every established fact are preserved, and no appendage, count or id is claimed. Array order and `additional-N` are never used.
- **Functional state**: `installed` false → not counted (info issue); `enabled` false → `disabled`; installed + enabled → `functional`. `active` is ignored (activation is not physical functionality). The most restrictive of component-level and instance-level evidence wins. Overrides may only restrict.
- **Capabilities**: only explicit booleans on the structural catalog entry are read. Today only `canManipulate` is stated (hand/claw/tool/instrument `true`, probe `false`); **`canHold` and `canWield` are `null` for every droid appendage** because the existing definitions state them only in prose (`features` / `restrictions`), which is never parsed. A future catalog stating booleans flows through (tested).
- **No droid defaults.** A droid with no appendage evidence is `unresolved`, `defaultApplied: false`.

## 8. Where identity remains unresolved

Slot identity is never available from the component resolver's output (`identity.slot` is always `null`). Most Garage-authored droids (ledger / `droidSystems` records only) therefore project to **zero identified appendages and an `unresolved` status**. That is intended E2A behaviour, not a bug in the resolver; see §12.

## 9. Verified versus unknown capability

| Fact | Status |
|---|---|
| Default biological arm (hold / wield / manipulate) | established by the universal default rule |
| Species-declared capabilities | established only when a structured `anatomy` supplies them (none exists in production) |
| Droid `canManipulate` | established by the structural catalog boolean |
| Droid `canHold`, `canWield` | **unknown** (null) |
| Droid slot identity | **not established** |
| Codru-Ji arm count / capabilities; Ryn tail capability | **not established** (unresolved guard) |
| Functional state of species-default appendages | `functional` by default; changed only by an explicit override |

## 10. Tests

New (run with `node tests/<file>` from the repository root, Node v22.22.0, offline, with the in-repo Foundry shim loader):

| File | Result |
|---|---|
| `tests/equipment-e2a-anatomy-resolver.test.mjs` | exit 0 — 15 checks passed |
| `tests/equipment-e2a-droid-appendage-projection.test.mjs` | exit 0 — 15 checks passed |

They exercise the real public exports (and the real `applySpeciesVariantProfile`, `resolveInstalledDroidComponents`, canonical droid definitions and pack data), not substitutes. Coverage map to the directive's table: normal biological; different species; synthetic four-arm; restricted appendage; complete snapshot without anatomy; Extra Arms and Prehensile Tail guards (real data); explicit disablement; droid with confirmed component; disabled component; inactive-but-enabled; duplicate same-type records; unstable / missing slot ids; tool / probe; determinism; frozen inputs; malformed data; plus a static guard that the modules reference no mutation / action-economy / inventory / fire-state / UI API.

## 11. Existing baseline parity

The 31-file E0 baseline plus the two new files were re-run: **33 files, 33 exit 0, 0 failures** (commands: `node tests/<file>` for each). The directive's named regression tests (`species-variant-atomic-profile`, `species-snapshot-consumers`, `species-profile-invariants`, `droid-installed-component-resolver`, `droid-installation-drift-repair-intent-boundary`, `droid-item-classification`, `weapon-phase-5d-i-d-b2-wielding-size`, `weapon-readiness-production-path`) are all included and pass. `droid-mode-adapter.test.mjs` still exits 0 with no output (unchanged limitation). Remaining `tests/` files were not run, as in E0. Not Foundry-tested.

## 12. Deferred Droid Refactor Dependencies

All findings are `DEFERRED_DROID_REFACTOR`: audit findings for the future droid refactor, **not** repair assignments. Nothing below was changed. "Reproducibility" states how the evidence was obtained; static reads were not exercised at runtime.

| ID | Affected subsystem | Existing file / function | Observed behaviour | Evidence & reproducibility | Why it matters to the Equipment Ecosystem | Recommended requirement for the droid refactor | Dependency on droid schema review | Status |
|---|---|---|---|---|---|---|---|---|
| DR-001 | Garage installer | `scripts/engine/customization/droid-customization-engine.js` `#upsertArrayEntry` (`:566-571`), used for appendages at `:524-528` | removes any existing entry with the same normalized part id before pushing the new one, so a second appendage of the same type appears to replace the first | static read only (private method; not exercised) | "droid adds a manipulator" and "two identical hands" cannot be represented through the installer | installation must be able to add independent same-type components | installed-instance identity model | `DEFERRED_DROID_REFACTOR` |
| DR-002 | Appendage identity | `droid-customization-engine.js` `#nextAppendageLocation` (`:573-578`); `droidSystems.appendages[]` | `left-arm`, `right-arm`, else `additional-<array length+1>`; no durable instance id; the generated location changes if an entry is removed | static read; tests 5–6 of the projection test show such records yield no identity | manipulator allocation needs a durable id | separate slot / instance / part identities, persisted, unaffected by removal order | persistence schema | `DEFERRED_DROID_REFACTOR` |
| DR-003 | Reconciliation | `droid-installed-component-resolver.js` `resolveInstalledDroidComponents` (`:403-415`) | groups all records by canonical type; `primary = sorted[0]` | reproducible: projection test 5 (two `droidSystems` hand records → one component, `recordCount: 2`) | identical hardware collapses into one logical row | resolver output must keep per-instance rows | identity model | `DEFERRED_DROID_REFACTOR` |
| DR-004 | Slot naming | `scripts/domain/droids/droid-part-schema.js` `BASE_APPENDAGE_SLOTS` (`leftArm`, `rightArm`) vs `droid-systems-resolver.js` / customization engine (`left-arm`, `right-arm`) | two spellings; the adapter's `resolveAppendageSlots` has no callers (`rg`) | static read; `rg resolveAppendageSlots\|BASE_APPENDAGE_SLOTS` | slot id is one of the three identities | one slot vocabulary | schema reconciliation | `DEFERRED_DROID_REFACTOR` |
| DR-005 | Component definitions | `scripts/data/droid-part-schema.js` (self-declared canonical), `scripts/data/droid-systems.js` (builder catalog), `scripts/domain/droids/droid-part-schema.js` (identity/prerequisite adapter) | three overlapping, differently shaped sources with different id spaces ("short ids" vs canonical ids) | file headers; `droid-part-schema.js` headers in both locations | the anatomy projection must pick capability data from one of them | single definition source | schema reconciliation | `DEFERRED_DROID_REFACTOR` |
| DR-006 | Capability data | `droid-systems.js` `appendages[]` | only `canManipulate` / `canAttack` are structured; holding / wielding exist only as prose in `features` / `restrictions`; canonical `rules` (`weaponCountsAsTwoHanded`, `mountCapacity`, `oneMountedToolOrWeaponActive`) have no consumer | projection tests 1, 8, 12 (hold / wield stay `null`); `rg` for the rule keys | wielding allocation cannot be established for droids | structured `canHold` / `canWield` / specialization per appendage type | rules review of droid appendages (SRC-5) | `DEFERRED_DROID_REFACTOR` |
| DR-007 | Integrated weapons | `chat-interaction-bridge.js:113`, `patches/runtime-bugfix-hotfixes.js:97`, `weapon-branch-resolver.js:707-714` | integrated weapon Items are `equipped:true, integrated:true` with no link to the part / appendage that carries them | static read (consumer matrix G3, G4) | cannot make a weapon depend on its host appendage | host relationship from weapon to installed component instance | identity model | `DEFERRED_DROID_REFACTOR` |
| DR-008 | Functional state | resolver `enabled` / `installed`; `itemIsEnabled` | functional state exists per component, not per individual appendage; no damaged / severed / disabled-by-injury notion; `active` (operating) is a separate flag | projection tests 3, 4 | per-appendage availability cannot be recorded | per-instance functional state | instance model | `DEFERRED_DROID_REFACTOR` |
| DR-009 | Default presentation | `droid-systems-resolver.js` `isDefault` / `DEFAULT_APPENDAGE_SLOTS` | an empty `droidSystems.appendages` is shown as two default arms visually, but produces no machine-readable appendage evidence | projection test 10 | a droid cannot be given biological arms or an implicit pair | explicit default appendage records | defaults policy | `DEFERRED_DROID_REFACTOR` |
| DR-010 | Default display names | Garage default presentation names | the Garage's default display names are not canonical parts: `normalizeDroidPartId('Droid Arm / Hand')` → `arm-hand`, `'2 Droid Arms'` → `2-arms`; neither resolves a definition | reproducible: projection test 15 | name-based recognition silently fails for default arms | stable part ids on records, not display names | schema reconciliation | `DEFERRED_DROID_REFACTOR` |

## 13. Remaining work for E2B (species only is separable; droid items are deferred)

Species (may proceed independently when authorized): source-verified `anatomy` data for Codru-Ji, Ryn and any other exception (EQUIP-RD-001, -004, -006); the schema and the `applyCompleteSnapshot` / `listMissingSnapshotFields` whitelist decision; removal of the temporary guards; decision on legacy overlay inheritance (§6).
Droid (deferred to the droid refactor): stable installed-instance ids, installer replacement behaviour, collapse during reconciliation, slot vocabulary, definition reconciliation, structured hold / wield, host links, per-appendage functional state (DR-001…DR-010).

## 14. Conservative choices for owner confirmation

1. The known-exception guards produce **`unresolved` with no appendages** (no default arms) for both Codru-Ji and Ryn, rather than a partial result with the default arms.
2. Overrides may only **restrict** evidence-based functional state.
3. A droid with the real catalog can currently reach at best `partial` because `canHold` / `canWield` are unknown.
4. Missing `actorType` is `unresolved` rather than assumed biological.
5. The `anatomy` input shape is provisional test scaffolding, not a schema.

## 15. Changed files

Created: `scripts/engine/equipment/anatomy-resolver.js`, `scripts/engine/equipment/droid-appendage-projection.js`, `tests/equipment-e2a-anatomy-resolver.test.mjs`, `tests/equipment-e2a-droid-appendage-projection.test.mjs`, `docs/audits/equipment-ecosystem-e2a-anatomy-checkpoint.md`.
Updated: `docs/architecture/equipment-ecosystem-authority-contract-v1.md`.

## 16. Confirmation

No gameplay behaviour changed: no existing consumer was redirected, no sheet, template, style, pack, data, schema, species snapshot, `applyCompleteSnapshot`, Garage, installed-component resolver, `InventoryEngine`, `FireStateStore`, `ActorEngine`, combat, armor, weapon or modification file was modified; no modification registry or certification status was touched; no state is persisted. E2B (species and droid) and E3–E9 were not started.

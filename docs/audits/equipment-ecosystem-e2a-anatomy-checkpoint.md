# Equipment Ecosystem — E2A Checkpoint: Read-Only Anatomy Resolution

**Phase:** E2A only. E2B and E3–E9 remain unauthorized and unstarted.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 (no new branch or PR).
**Not certified:** nothing here is Foundry-runtime tested. Offline Node tests only. No gameplay behaviour changed.

## 0. Correction pass (E2A-C1 / E2A-C2) — supersedes the identity and completeness statements of the first E2A commit

Reviewer findings accepted: (C1) an embedded Item **document id** was treated as an established installed appendage instance; (C2) `resolved` was too permissive (a missing species profile, and droid appendages with unknown slot identity). Corrected policy, in force below:

- **Identity.** An embedded Item document id is **candidate evidence only**. Two Item documents do not prove two physically installed appendages, and the legacy evidence provides no slot. The legacy droid projection therefore **never emits allocatable `appendages`**; every record is an `unresolvedRecords` entry carrying `identity {slot:null, instance:null, part}`, `identityStatus` (`candidate-document-ids-only` | `none`) and `candidateInstances [{documentId, functionalState}]`. Document ids, array positions and `additional-N` are never promoted to identity.
- **`resolved` is reserved for allocation-grade evidence**: every appendage has a confirmed **slot and installed-instance** identity (biological appendages: slot), all three capabilities are booleans, the functional state is known, and no blocking issue remains. With the current legacy droid evidence a droid can therefore never be `resolved`.
- **Droid status**: no allocatable appendage → `partial` if a record shows installed, enabled hardware not stated to be non-manipulating (usable facts exist but nothing is allocatable), otherwise `unresolved`.
- **Missing species profile**: the provisional two-arm default is still supplied, but the status is `partial` with a `warning` issue (`species-profile-not-provided`); a present profile without an exception stays `resolved`.
- **Upstream diagnostics preserved**: the component resolver's `conflicts` (activation-only by construction) become `component-source-conflict` info issues (`activationOnly:true`, `affectsFunctionalState:false`) and never disable a passive appendage; its `warnings` become `component-resolution-warning`; disagreement between sources about installed / enabled becomes a `source-installed-enabled-disagreement` warning, with the most restrictive evidence reported per candidate.
- No file outside the six authorized files changed; no droid system was touched.

## 1. Starting point

Starting HEAD: `7cbfd5d0ecc1d50c7f4835dd6329b33d6db2c749` (matched the expected checkpoint; `origin/audit/equipment-ecosystem-e0-e1` was identical). `main` was not synchronized (still `4392c90` upstream); no rebase, merge or cherry-pick.

## 2. Approved decisions applied

| ID | Ruling | How E2A applies it |
|---|---|---|
| OA-7 | Species anatomy = optional structured `anatomy` on the **effective** species profile; not in the trait-rule vocabulary; respects complete snapshots; default two ordinary arms | resolver reads `speciesProfile.anatomy` **only from the profile passed in**; no snapshot/pack/whitelist change (E2B) |
| OA-8 | Slot, installed-instance and canonical-part identities are separate; type, array index and `additional-N` are not instance identity | every appendage carries `identity {slot, instance, part}`; the droid projection treats an embedded Item document id as candidate evidence only; `slot` and `instance` are `null` for legacy evidence |
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

Issue codes: `species-profile-not-provided` (warning; status `partial`), `anatomy-exception-unresolved` (blocking, `temporary:true`), `capability-unknown`, `functional-state-unresolved`, `override-unknown-appendage` (warning), `override-less-restrictive-than-evidence` (info), `installed-components-not-provided`, `no-appendage-evidence`, `droid-appendage-instance-unestablished`, `droid-appendage-duplicate-same-type-records` (blocking), `component-not-installed` (info), `source-installed-enabled-disagreement` (warning), `component-source-conflict` (info, activation-only), `component-resolution-warning` (info), `actor-type-unknown`, `actor-type-unsupported`.

The resolver does **not** compute hand occupancy, grips, readiness or attack permission, and contains no attack data.

## 5. Species default behaviour

Biological actor with no `anatomy` and no known-exception guard → two functional general-purpose arms `natural-arm-1`, `natural-arm-2` (hold / wield / manipulate all `true`), `defaultApplied: true`, `source: default`. No `arms: 2` is stored on any species. A missing species profile still receives the provisional default, but the status is `partial` with a `warning` issue.

Optional `speciesProfile.anatomy` (synthetic test shape; **not an approved schema**): `{ appendages: [{ id, kind, capabilities?, functionalState?, restrictions? }] }` → used verbatim (validated, copied), `defaultApplied: false`; undeclared capabilities remain `null` → `partial`.

### Temporary unresolved-exception guards (remove in E2B)
Exact trait ids `extra-arms` and `prehensile-tail` in the effective profile's `canonicalTraits` / `traits` mark the anatomy `unresolved`: no default is applied, no count or capability is computed, no species name is special-cased, prose is never parsed. The guards stand down when a structured `anatomy` is supplied. Verified against the **real** Codru-Ji (`codru-ji-leg-2c-03`) and Ryn (`ryn-sv-2f-06`) complete snapshots from `packs/species.db` through the real `applySpeciesVariantProfile`.

## 6. Complete-snapshot handling

`applySpeciesVariantProfile` was not changed. Test evidence: a complete snapshot built from a base that carries a (synthetic) `anatomy` does **not** carry it (the whitelist drops unlisted fields), so the resolver applies the default rather than inheriting base anatomy.

**Observation for E2B (not changed):** a *legacy overlay* variant is built with `...base`, so a future base-level `anatomy` would flow into legacy overlay profiles wholesale (a test pins this current behaviour). Whether that is acceptable belongs to the E2B species schema work.

## 7. Droid installed-component projection (diagnostic, read-only)

- Only **base appendage** definitions (`slot === 'appendage'` and `category === 'appendage'`: hand, claw, tool, instrument, probe) are considered. Mounts, enhancements, appendage weapons, shields and utility parts never become manipulators.
- **Identity (corrected)**: legacy evidence yields **no allocatable appendages**. Each qualifying component becomes one unresolved record. Embedded Item document ids are preserved as `candidateInstances` (sorted, with their own most-restrictive functional state) but are not instance identity; slot identity is always `null`. Blocking issues: `droid-appendage-instance-unestablished` (one or no candidate) and `droid-appendage-duplicate-same-type-records` (several candidates or several records in one tier). Array order and `additional-N` are never used.
- **Functional state**: `installed` false → no record (info issue); `enabled` false → `disabled`; installed + enabled → `functional`. `active` is ignored (activation is not physical functionality). The most restrictive of component-level and candidate-level evidence wins. Overrides may only restrict identified appendages; legacy candidates are not appendages, so an override has nothing to attach to (reported as `override-unknown-appendage`).
- **Capabilities**: only explicit booleans on the structural catalog entry are read. Today only `canManipulate` is stated (hand/claw/tool/instrument `true`, probe `false`); **`canHold` and `canWield` are `null` for every droid appendage** because the existing definitions state them only in prose (`features` / `restrictions`), which is never parsed. A future catalog stating booleans flows through (tested).
- **No droid defaults.** A droid with no appendage evidence is `unresolved`, `defaultApplied: false`.

## 8. Where identity remains unresolved

Slot identity is never available from the component resolver's output (`identity.slot` is always `null`). Every droid built from legacy evidence therefore projects to **zero allocatable appendages** (status `partial` when usable hardware facts exist, otherwise `unresolved`). That is intended E2A behaviour, not a bug in the resolver; see §12.

## 9. Verified versus unknown capability

| Fact | Status |
|---|---|
| Default biological arm (hold / wield / manipulate) | established by the universal default rule |
| Species-declared capabilities | established only when a structured `anatomy` supplies them (none exists in production) |
| Droid `canManipulate` | established by the structural catalog boolean |
| Droid `canHold`, `canWield` | **unknown** (null) |
| Droid slot identity | **not established** |
| Droid installed-instance identity | **not established** (Item document ids are candidate evidence only) |
| Codru-Ji arm count / capabilities; Ryn tail capability | **not established** (unresolved guard) |
| Functional state of species-default appendages | `functional` by default; changed only by an explicit override |

## 10. Tests

Run with `node tests/<file>` from the repository root (Node v22.22.0, offline, in-repo Foundry shim loader):

| File | Result |
|---|---|
| `tests/equipment-e2a-anatomy-resolver.test.mjs` | exit 0 — 15 checks passed |
| `tests/equipment-e2a-droid-appendage-projection.test.mjs` | exit 0 — 14 checks passed |

They use the real public exports (and the real `applySpeciesVariantProfile`, `resolveInstalledDroidComponents`, canonical droid definitions and pack data). Correction-pass coverage: (1) two embedded Item documents without established installation identity; (2) one Item with no verified slot; (3) an otherwise complete synthetic catalog with unresolved physical identity (stays `partial`, zero appendages); (4) missing biological species profile (default supplied, `partial`); (5) conflicting installed-component evidence (activation conflict, installed/enabled disagreement, upstream warnings); (6) inactive-but-enabled passive appendage; (7) deterministic output and frozen inputs. Retained: biological default and snapshot isolation, real Codru-Ji / Ryn guards, overrides, tool / probe, non-appendage parts, replaceable adapter (now also proving `resolved` requires slot **and** instance identity), malformed input, static no-mutation guard, DR-010 observation.

## 11. Existing baseline parity

The 31-file E0 baseline plus the two E2A files were re-run after the correction: **33 files, 33 exit 0, 0 failures** (commands: `node tests/<file>` for each). The directive's named regression tests (`species-variant-atomic-profile`, `species-snapshot-consumers`, `species-profile-invariants`, `droid-installed-component-resolver`, `droid-installation-drift-repair-intent-boundary`, `droid-item-classification`, `weapon-phase-5d-i-d-b2-wielding-size`, `weapon-readiness-production-path`) are all included and pass. `droid-mode-adapter.test.mjs` still exits 0 with no output (unchanged limitation). Remaining `tests/` files were not run, as in E0. Not Foundry-tested.

## 12. Deferred Droid Refactor Dependencies

All findings are `DEFERRED_DROID_REFACTOR`: audit findings for the future droid refactor, **not** repair assignments. Nothing below was changed. "Reproducibility" states how the evidence was obtained; static reads were not exercised at runtime.

| ID | Affected subsystem | Existing file / function | Observed behaviour | Evidence & reproducibility | Why it matters to the Equipment Ecosystem | Recommended requirement for the droid refactor | Dependency on droid schema review | Status |
|---|---|---|---|---|---|---|---|---|
| DR-001 | Garage installer | `scripts/engine/customization/droid-customization-engine.js` `#upsertArrayEntry` (`:566-571`), used for appendages at `:524-528` | removes any existing entry with the same normalized part id before pushing the new one, so a second appendage of the same type appears to replace the first | static read only (private method; not exercised) | "droid adds a manipulator" and "two identical hands" cannot be represented through the installer | installation must be able to add independent same-type components | installed-instance identity model | `DEFERRED_DROID_REFACTOR` |
| DR-002 | Appendage identity | `droid-customization-engine.js` `#nextAppendageLocation` (`:573-578`); `droidSystems.appendages[]` | `left-arm`, `right-arm`, else `additional-<array length+1>`; no durable instance id; the generated location changes if an entry is removed | static read; tests 5–6 of the projection test show such records yield no identity | manipulator allocation needs a durable id | separate slot / instance / part identities, persisted, unaffected by removal order | persistence schema | `DEFERRED_DROID_REFACTOR` |
| DR-003 | Reconciliation | `droid-installed-component-resolver.js` `resolveInstalledDroidComponents` (`:403-415`) | groups all records by canonical type; `primary = sorted[0]` | reproducible: projection tests 2 and 5 (two Item documents / two `droidSystems` hand records → one component row) | identical hardware collapses into one logical row | resolver output must keep per-instance rows | identity model | `DEFERRED_DROID_REFACTOR` |
| DR-004 | Slot naming | `scripts/domain/droids/droid-part-schema.js` `BASE_APPENDAGE_SLOTS` (`leftArm`, `rightArm`) vs `droid-systems-resolver.js` / customization engine (`left-arm`, `right-arm`) | two spellings; the adapter's `resolveAppendageSlots` has no callers (`rg`) | static read; `rg resolveAppendageSlots\|BASE_APPENDAGE_SLOTS` | slot id is one of the three identities | one slot vocabulary | schema reconciliation | `DEFERRED_DROID_REFACTOR` |
| DR-005 | Component definitions | `scripts/data/droid-part-schema.js` (self-declared canonical), `scripts/data/droid-systems.js` (builder catalog), `scripts/domain/droids/droid-part-schema.js` (identity/prerequisite adapter) | three overlapping, differently shaped sources with different id spaces ("short ids" vs canonical ids) | file headers; `droid-part-schema.js` headers in both locations | the anatomy projection must pick capability data from one of them | single definition source | schema reconciliation | `DEFERRED_DROID_REFACTOR` |
| DR-006 | Capability data | `droid-systems.js` `appendages[]` | only `canManipulate` / `canAttack` are structured; holding / wielding exist only as prose in `features` / `restrictions`; canonical `rules` (`weaponCountsAsTwoHanded`, `mountCapacity`, `oneMountedToolOrWeaponActive`) have no consumer | projection tests 1, 8, 10 (hold / wield stay `null`); `rg` for the rule keys | wielding allocation cannot be established for droids | structured `canHold` / `canWield` / specialization per appendage type | rules review of droid appendages (SRC-5) | `DEFERRED_DROID_REFACTOR` |
| DR-007 | Integrated weapons | `chat-interaction-bridge.js:113`, `patches/runtime-bugfix-hotfixes.js:97`, `weapon-branch-resolver.js:707-714` | integrated weapon Items are `equipped:true, integrated:true` with no link to the part / appendage that carries them | static read (consumer matrix G3, G4) | cannot make a weapon depend on its host appendage | host relationship from weapon to installed component instance | identity model | `DEFERRED_DROID_REFACTOR` |
| DR-008 | Functional state | resolver `enabled` / `installed`; `itemIsEnabled` | functional state exists per component, not per individual appendage; no damaged / severed / disabled-by-injury notion; `active` (operating) is a separate flag | projection tests 3, 4, 11 | per-appendage availability cannot be recorded | per-instance functional state | instance model | `DEFERRED_DROID_REFACTOR` |
| DR-009 | Default presentation | `droid-systems-resolver.js` `isDefault` / `DEFAULT_APPENDAGE_SLOTS` | an empty `droidSystems.appendages` is shown as two default arms visually, but produces no machine-readable appendage evidence | projection test 9 | a droid cannot be given biological arms or an implicit pair | explicit default appendage records | defaults policy | `DEFERRED_DROID_REFACTOR` |
| DR-010 | Default display names | Garage default presentation names | the Garage's default display names are not canonical parts: `normalizeDroidPartId('Droid Arm / Hand')` → `arm-hand`, `'2 Droid Arms'` → `2-arms`; neither resolves a definition | reproducible: projection test 14 | name-based recognition silently fails for default arms | stable part ids on records, not display names | schema reconciliation | `DEFERRED_DROID_REFACTOR` |

## 13. Remaining work for E2B (species only is separable; droid items are deferred)

Species (may proceed independently when authorized): source-verified `anatomy` data for Codru-Ji, Ryn and any other exception (EQUIP-RD-001, -004, -006); the schema and the `applyCompleteSnapshot` / `listMissingSnapshotFields` whitelist decision; removal of the temporary guards; decision on legacy overlay inheritance (§6).
Droid (deferred to the droid refactor): stable installed-instance ids, installer replacement behaviour, collapse during reconciliation, slot vocabulary, definition reconciliation, structured hold / wield, host links, per-appendage functional state (DR-001…DR-010).

## 14. Conservative choices for owner confirmation

1. The known-exception guards produce **`unresolved` with no appendages** (no default arms) for both Codru-Ji and Ryn, rather than a partial result with the default arms.
2. Overrides may only **restrict** evidence-based functional state.
3. Legacy droid evidence can never reach `resolved`: it yields no allocatable appendages (Item document ids are candidate evidence only, slot identity is unavailable, and `canHold` / `canWield` are unknown).
4. Missing `actorType` is `unresolved` rather than assumed biological; a missing species profile gets the provisional default but is `partial`.
5. The `anatomy` input shape is provisional test scaffolding, not a schema.

## 15. Changed files

Created: `scripts/engine/equipment/anatomy-resolver.js`, `scripts/engine/equipment/droid-appendage-projection.js`, `tests/equipment-e2a-anatomy-resolver.test.mjs`, `tests/equipment-e2a-droid-appendage-projection.test.mjs`, `docs/audits/equipment-ecosystem-e2a-anatomy-checkpoint.md`.
Updated: `docs/architecture/equipment-ecosystem-authority-contract-v1.md`.

## 16. Confirmation

No gameplay behaviour changed: no existing consumer was redirected, no sheet, template, style, pack, data, schema, species snapshot, `applyCompleteSnapshot`, Garage, installed-component resolver, `InventoryEngine`, `FireStateStore`, `ActorEngine`, combat, armor, weapon or modification file was modified; no modification registry or certification status was touched; no state is persisted. E2B (species and droid) and E3–E9 were not started.

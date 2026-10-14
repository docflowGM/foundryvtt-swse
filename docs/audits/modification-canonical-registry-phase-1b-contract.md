# Canonical Modification Registry — Phase 1b Contract (revision 1)

**Status:** contract only, for owner and independent-reviewer approval. **No registry file, adapter, validator, crosswalk, test, catalog, pack, consumer or schema change accompanies this document.** Nothing here is authorized for implementation until approved.
**Baseline:** `origin/main` `e173b02e18fe064facfcd60c9920d72254f70120` (Phase 1a merged: PRs #1031, #1032, #1034, #1035, #1033).
**Binding inputs:** the Phase 1a contract (revision 6, D1-D17), the merged compliance audit (`docs/audits/modification-system-canonical-compliance-audit.md`), the owner decision approving the v1.5 artifacts and their repository paths, and the owner rulings recorded in the audit-preservation instruction (table-verified slot costs for read-only accounting; unstated prices are unknown, never `0`; no automatic promotion of the 58 Scum rows).
**Labels:** **LOCKED** = decided by the owner/reviewer. **PROPOSAL** = my drafting, needs approval. **OPEN** = a question only the owner/reviewer may settle (section 12); the contract states the facts and does not choose.

The goal is one canonical authority that retires the duplicate catalogs. It is not a second permanent parallel system, and no uncertified rule may enter production through it.

## 1. Source artifacts and what this session could read

| Artifact | Approved repository destination | Available to this session |
|---|---|---|
| `SWSE_Modification_Rolling_Authority_v1.5.json` | `data/audits/modification-rolling-authority-v1.5.json` (LOCKED) | **Yes.** The original upload, 960,022 bytes, SHA-256 `7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00` as received. |
| `SWSE_Modification_Rolling_Authority_v1.5.md` | `docs/audits/modification-rolling-authority-v1.5.md` (LOCKED) | **No.** It was never supplied to this environment. It cannot be reconstructed from summaries, and this contract does not do so. |
| `SWSE_Modification_Rolling_Authority_v1.3.json` | none (superseded) | Yes, not used. |

**Dependency (blocking for the commit step, not for this contract):** the v1.5 Markdown must be supplied before the artifact pair can be committed. The JSON and Markdown are one pair, so neither is committed without the other. The hash above is a measurement of the file as received; the owner is asked to confirm it against the original (open decision O1).

## 2. Registry authority

1. **Immutable snapshot (PROPOSAL).** The committed v1.5 JSON is a versioned snapshot. It is never edited in place, reformatted, re-serialized, normalized, or "repaired". A correction is a new snapshot with a new version (`v1.6`) and new file names; the old snapshot stays in the repository until the owner retires it. Line endings and bytes are preserved exactly so the hash holds.
2. **Hash (PROPOSAL).** SHA-256 of the exact file bytes is recorded in a small manifest (`registryName`, `version`, `generatedDate`, file path, byte length, SHA-256, and the expected counts below), stored next to the snapshot as `data/audits/modification-rolling-authority-v1.5.manifest.json`. The manifest, not the registry, carries the hash (a file cannot contain its own hash). The Markdown companion gets its own hash line in the same manifest once supplied.
3. **Expected counts, as measured on the received JSON.**

| Measure | Value | How measured |
|---|---|---|
| Definitions / procedures | 186 / 57 | array lengths; ids unique; no id shared between the two arrays |
| `mechanicalCertification: EFFECTS_CERTIFIED` | 128 | tally; equals `indexSummary.mechanicallyCertified` |
| `mechanicalCertification: PENDING_RULES_TEXT` | 58 | tally; 57 are `currentStatus: CATALOGED_NOT_EXECUTABLE`, 1 is `EXCLUDED_SCOPE` (`sv-droidification`, no typed definitions) |
| `FULL_CERTIFIED` / `fullyExecutableCertified` | 0 / 0 | zero fully runtime-certified modifications (LOCKED) |
| `tableCertification` | `TABLE_VERIFIED` 113, `SOURCE_ENTRY_VERIFIED` 50, `NOT_TABLE_BASED_PAGE_VERIFIED` 21, `SOURCE_TABLE_ROW_AND_RULE_TEXT_VERIFIED` 2 | tally; 113 + 2 = 115 equals `indexSummary.tableCertified` |
| Scum and Villainy rows | 58 (Tables 2-3, 2-4, 2-5) | `source.bookId == scum-and-villainy` |
| Procedure `status` | `SOURCE_RULES_CERTIFIED` 29, `SOURCE_RULES_CERTIFIED_RUNTIME_PENDING` 21, `RULES_OUTLINE_REVIEWED` 4, `LEAD_PENDING_CERTIFICATION` 3 | 29 + 21 = 50 equals `indexSummary.separateProceduresCertified` |

4. **Preserved verbatim.** Source ids, `source.{bookId,title,printedTablePage,rulesPage,tableId}`, domain identities, `sourceFamily`, all certification fields, `currentStatus`, `originalSlotCost`, `originalCost`, `eligibility`, `implementation` and `audit` are read exactly as written. Nothing is renamed to an existing catalog key, translated to a Foundry field, or defaulted.
5. **Registry vocabulary is binding (LOCKED).** `EFFECTS_CERTIFIED` means the source rule is verified and the runtime is **not** mapped. `cataloguedDoesNotMeanImplemented: true`. Every typed definition's `consumerStatus` is `NOT_MAPPED`, `NOT_VERIFIED` or the Tech Specialist note, and none is runtime-approved.
6. **Not a runtime directory (LOCKED by the path decision).** `data/audits/` is a research location with existing precedent (181 JSON files today). Nothing in `system.json`, templates, hooks or compendium loaders reads the snapshot in Phase 1b.

### 2.1 Defects found in the received v1.5 JSON

These were measured, not assumed, while preparing this contract. They are reported for the owner; the snapshot is **not** altered.

| ID | Finding | Evidence |
|---|---|---|
| R1 | Three `sourceFamily` values used by definitions are missing from `sourceFamilies` (an 18-entry array of strings): `armor_template`, `purchase_quality_talent`, `improvised_equipment_explosive`. | 20 distinct values used, 18 listed |
| R2 | `indexSummary.domainCandidateCounts.weapon` is 120 and `eligibleCandidateDomainVariants` is 231; the definitions carry 121 weapon typed definitions (232 total: equipment 38, weapon 121, armor 73), each with a unique `definitionId`. | tallied from `typedDefinitions` and `candidateHostDomains` |
| R3 | `implementation.existingCatalogKeys` is not a clean key list. It mixes bare keys (`tech_weapon_accuracy`), file anchors (`packs/armor.db#armor-stun-cloak`) and free-text strings, and one string is shared by nine Biotech definitions (and two pack anchors by two Stun Cloak definitions). 96 definitions list 107 entries. | tally and duplicate scan |
| R4 | The procedure `sv-base-upgrade-capacity` (status `RULES_OUTLINE_REVIEWED`) reads "General unused stock slot baseline 1; medium and powered armor 2". It omits heavy armor. The Phase 1a baseline table (light 1, medium 2, heavy 3) is reviewer-verified against *Scum and Villainy* p. 37 and is not derived from the registry. | procedure text versus Phase 1a section 5 |
| R5 | `sv-retractable-stock` has `originalSlotCost.type: conditional` with `possibleCosts: [0, 1]` and "Requires specific source-text examination". | definition |

No defect is "fixed" by this contract. How the validator treats R1-R5 is open decision O2.

## 3. Machine-readable validation (contract for a future validator)

A single deterministic script (proposed `tools/validate-modification-registry.mjs`; **not written in Phase 1b**) reads the snapshot and the manifest, and writes only to stdout/exit code.

**V1 Integrity:** file byte length and SHA-256 equal the manifest; the JSON parses; top-level keys are exactly those the snapshot declares; `version` equals `"1.5"`.
**V2 Counts:** every figure in section 2.3 equals the measured tally and the registry's own `indexSummary` figure where one exists. A disagreement between a tally and `indexSummary` (R2) is **reported**, never reconciled.
**V3 Uniqueness:** definition ids unique; procedure ids unique; the two sets disjoint; typed `definitionId` values unique and each starts with its parent `id` plus `::` plus its domain key.
**V4 Required fields:** every definition has the fields in `definitionsSchema.required`.
**V5 Domain separation:** `typedDefinitions` keys are within {weapon, armor, equipment} (droid, vehicle and starship are excluded domains and must not appear); `candidateHostDomains` equals the key set of `typedDefinitions`; a typed definition's `domain` equals its key; nothing is shared across domains.
**V6 References:** every `source.bookId` and procedure `bookId` is in `bookLedger`; every `sourceFamily` is in `sourceFamilies` (R1 fails here); every `originalCost.procedureId` resolves to a procedure; page numbers are positive integers or `null`.
**V7 Certification-state consistency:** `mechanicalCertification` is in `allowedCertificationStates`; `PENDING_RULES_TEXT` implies `currentStatus` in {`CATALOGED_NOT_EXECUTABLE`, `EXCLUDED_SCOPE`}, empty `effectOperations`, and `effectStatus: PENDING`; `EFFECTS_CERTIFIED` implies `currentStatus: SOURCE_RULES_CERTIFIED_RUNTIME_NOT_MAPPED`; no definition is `FULL_CERTIFIED`; no `consumerStatus` claims runtime approval; no `fullyExecutableCertified` above zero.
**V8 Slot-cost shape:** `originalSlotCost.type` is in the registry's observed set; `fixed` requires an integer `slots` ≥ 0; `conditional`, `not_specified`, `not_applicable`, `socket_occupancy`, `special_allowance` and `not_specified_for_accessory` never carry a usable fixed number.
**V9 Price shape:** `credits` requires a finite `amount` ≥ 0; `not_stated` and every non-credit type never expose a numeric zero; an absent price is `unknown`.
**V10 Crosswalk (once a crosswalk exists):** every crosswalk row names an existing definition id, a catalog key from a declared catalog, and a confirmation record; one catalog key maps to at most one definition and one definition may list several keys only through explicit rows (section 5).

**Reporting (PROPOSAL):** each failed check prints a stable code, the path (`definitions[12].id`), and the observed versus expected value, sorted deterministically, then a summary and a non-zero exit code. There is **no repair mode, no auto-fix, no "ignore" flag, and no silent tolerance**. Whether the known defects R1-R5 are carried as an explicit owner-approved *known-defects list* (a dated, version-pinned manifest section naming each tolerated finding by code and path, so the validator is green only for exactly those findings) or the registry is re-issued as v1.5.1 first, is open decision O2.

## 4. Read-only canonical adapter (contract only; not implemented)

A pure module (proposed `scripts/engine/customization/modification-registry-adapter.js`) over an injected, already-parsed snapshot. It performs no I/O of its own, no mutation, no clock, no randomness, no network, and imports no consumer. It answers questions; it does not decide installation.

| Query | Returns |
|---|---|
| `getDefinition(definitionId)` | The registry definition as read, plus `provenance` (`registryVersion`, manifest hash, `source.*`), or `{ found: false }`. |
| `getTypedDefinition(definitionId, domain)` | The domain's typed definition, with `domainApplicability` as printed and `effectStatus`/`consumerStatus` as printed. |
| `resolveCatalogKey(catalogId, key)` | The definition id from the **explicit crosswalk** only, or `{ resolved: false, reason }`. Never matches on name, key similarity or summary text. |
| `getSlotCost(definitionId, domain)` | The tagged result in section 6. |
| `getPrice(definitionId)` | A tagged union that mirrors `originalCost.type`; `unknown` is a distinct value and never `0`. |
| `getCertification(definitionId)` | `tableCertification`, `mechanicalCertification`, `currentStatus`, `audit.blockers`, `audit.confidence`, and the executability flag (always `false` in Phase 1b). |

**Fail-closed rules (PROPOSAL):** an unknown id, an unmapped key, a malformed record or an unavailable snapshot returns an explicit unresolved result with a reason; the adapter never substitutes a default, never merges two records because their names or keys match, never infers a host domain from `candidateHostDomains` alone, and never returns a number where the registry gives none. All returned objects are plain JSON copies, not references into the snapshot.

## 5. Identity crosswalk (contract for a future data artifact)

The crosswalk is a separate, reviewed, version-pinned data file (proposed `data/audits/modification-registry-catalog-crosswalk-v1.5.json`), not a field of the snapshot and not derived at runtime. Because `existingCatalogKeys` is untrustworthy (R3), it is only a *lead*.

Each row: `catalogId` (for example `UPGRADE_CATALOG`, `WORKBENCH_BLASTER_UPGRADES`, `TECH_TRAITS`, `TEMPLATE_CATALOG`, `LIGHTSABER_CRYSTAL_MAP`), `catalogKey`, `definitionId`, `domain`, `relation` (`identical`, `superset`, `subset`, `partial`, `conflict`), `evidence` (page, table row or reviewed text), `confirmedBy`, and `confirmationDate`. No row is created without a recorded confirmation. Rows with `relation: conflict` stay in the file so conflicts are visible and are never resolved by the adapter. **Name equality is never evidence of identity** (for example the nine Biotech Specialist traits are explicitly *not* the ordinary Tech Specialist traits that share their names).

## 6. Certification gates

### 6.1 The certified slot-cost predicate (PROPOSAL; needs approval)

`getSlotCost(definitionId, domain)` returns `{ certified: true, slots: n, poolId, definitionId, typedDefinitionId, source: { ref, certification } }` **only when all hold**:

1. the definition exists, is in scope (not `EXCLUDED_SCOPE`), and the crosswalk resolved its identity exactly (for catalog-key lookups);
2. `originalSlotCost.type === "fixed"` and `slots` is an integer ≥ 0 (an explicit `0` is a certified zero; `conditional`, `not_specified`, `not_applicable`, `socket_occupancy` and `special_allowance` are never certified here);
3. `tableCertification` is one of the registry's verified values (`TABLE_VERIFIED`, `SOURCE_TABLE_ROW_AND_RULE_TEXT_VERIFIED`, `SOURCE_ENTRY_VERIFIED`, `NOT_TABLE_BASED_PAGE_VERIFIED`; the choice of which values qualify is open decision O3);
4. the typed definition for the **requested host domain** exists and its `slotPoolId` is `general-upgrades` (the only pool Phase 1a counts; lightsaber crystal and accessory pools stay separate and uncertified); and
5. the requested domain's `domainApplicability` is a certified value (open decision O4: the Scum rows carry `TABLE_CATEGORY` or `CONDITIONAL_UNVERIFIED`, which the registry itself does not call a rules certification).

`source.ref` is built mechanically from `source.bookId`, `printedTablePage` and `tableId`; `source.certification` is the `tableCertification` value plus the registry version and manifest hash. Both are therefore nonempty and traceable, satisfying Phase 1a D17.

Otherwise `{ certified: false, reason }` with a code such as `SLOT_COST_NOT_FIXED`, `TABLE_NOT_VERIFIED`, `HOST_DOMAIN_NOT_CERTIFIED`, `POOL_NOT_GENERAL`, `IDENTITY_UNRESOLVED` or `EXCLUDED_SCOPE`.

### 6.2 What a certified slot cost does NOT imply (LOCKED)

It does not establish that installing the upgrade is legal; that the host is compatible or the prerequisites are met; that any mechanical effect is certified; that a price is known; that stacking or `maxPerHost` is settled; or that any runtime consumer is approved. It only lets the Phase 1a resolver count an already-recorded occupant at a certified cost.

### 6.3 Standing non-executable and unknown rules (LOCKED)

- The 58 Scum and Villainy definitions with `mechanicalCertification: PENDING_RULES_TEXT` stay `CATALOGED_NOT_EXECUTABLE`. A certified slot cost (where section 6.1 passes) never promotes one to an executable upgrade, a catalog entry or an effect.
- An unstated price is `unknown`, never `0` (for example `goi-componentization-basic` and `-deluxe`, and `reb-excellent-kit-purchased-quality`: `originalCost.type: not_stated`). Percentage, multiplier, procedure-based and not-for-sale prices are carried as their tagged type and never flattened to a number.
- `sv-retractable-stock` (slots `[0, 1]`, R5) is never certified.
- Droidification stays excluded.

### 6.4 Interface to Phase 1a (PROPOSAL)

Phase 1a's `certifiedDefinitionLookup(upgradeKey)` takes a catalog `upgradeKey` and returns `{ definitionId, upgradeKey, certifiedCost, source: { ref, certification } }`. A future factory `createCertifiedDefinitionLookup(domain)` would build that closure from `resolveCatalogKey` plus `getSlotCost`, returning `null` whenever either is unresolved. Nothing else about Phase 1a changes, and the resolver still never imports the adapter (it receives the closure).

## 7. Legacy catalog convergence map (no catalog is deleted or rewired in Phase 1b)

Producer ownership and known conflicts come from the merged Phase 0 and compliance audits. "Replacement path" is the eventual direction only; each step is a later, separately authorized gate (section 8).

| Legacy source | Producer / owner today | Known conflicts with the registry | Eventual replacement path |
|---|---|---|---|
| `UPGRADE_CATALOG` (71 entries) and `TEMPLATE_CATALOG` (7), `scripts/engine/customization/upgrade-catalog.js` | Standard path (`InstallRemoveEngine`, `UpgradeSlotEngine`) | Overload Switch cost 250 versus 500; Improved Energy Cell 1 slot versus 2; Componentization and Flash Suppressor unstated values stored as `0`; Retractable Stock `0`; host lists wider than candidates | Crosswalk each key; read slot costs and provenance through the adapter; retire entries only after consumers read the adapter |
| Workbench catalogs (`scripts/data/{blaster,melee,armor}-upgrades.js`, `gear-mods.js`: 28 entries, no keys shared with `UPGRADE_CATALOG`) | Workbench | Separate keys, separate slot math | Crosswalk or retire card by card; no key merge by name |
| Upgrade JSON (`data/upgrades/*.json`: 23 / 29 / 19 records) | Evidence only (no runtime import found) | Mirrors the Scum tables; eight Scum rows absent from the runtime catalog | Superseded by the registry; delete only after verifying no tool reads it |
| Template catalogs (`data/gear-templates.json` 30, `scripts/data/gear-templates.js` 7, `TEMPLATE_CATALOG` 7) | `GearTemplatesEngine`, `TemplateEngine` | Three unreconciled catalogs; registry holds 26 published templates and none apply effects | Reconcile to registry `published_template` rows; stacking per registry `KOTOR_TEMPLATE_ONE_NONEXEMPT_BY_DEFAULT` after review |
| Tech Specialist options (`tech-specialist-modification-service.js`, 39 traits) | `TechSpecialistModificationService` | 14 uncertified Superior Tech traits kept as-is; `tech_device_upgrade_slot` source-unverified; 15 droid/vehicle traits out of scope; Biotech names collide with ordinary names (R3) | Map the 9 certified in-scope traits through the crosswalk; leave the rest untouched until a source ruling |
| Lightsaber crystals and accessories (`packs/lightsaber-crystals.db` 28, `packs/lightsaber-accessories.db` 10, `scripts/data/lightsaber-crystals-map.js`) | Pack generator not yet traced; owner requires tracing it first | Registry holds 34 crystal identities (six KOTOR variants absent); all packed `upgradeSlots = 1` is not a general slot cost; socket and accessory allowance are separate pools | Trace the authoritative writer; separate gate; no slot-cost certification in Phase 1b |

## 8. Future gates (each needs its own independent authorization; none is granted here)

| Gate | Authorizes | Minimum prerequisites |
|---|---|---|
| **G1 Snapshot commit** | Committing both v1.5 files, the manifest and the validator | Both original files supplied; hashes confirmed; decisions O1-O2 settled; CI runs the validator |
| **G2 Adapter implementation** | The read-only adapter and its unit tests, plus the explicit crosswalk file | Phase 1b contract approved; O3-O6 settled; no consumer wired |
| **G3 Slot-consumer shadow comparison** | Running the Phase 1a resolver beside each existing slot calculation, one consumer at a time, logging differences only | G2 merged; a per-consumer comparison plan; no write path and no changed behaviour |
| **G4 Canonical content corrections** | Source-backed fixes through the upstream producers (`tools/fix-equipment-data.js`, the store-description JSON, catalog data), never hand-edited generated packs | A reviewed list of each correction with its source page; separate PR per producer |
| **G5 Eligibility convergence** | Replacing duplicated eligibility checks with the existing legality services plus certified host facts | Certified host-evidence input contract (including strip evidence from Phase 1a D16); no second eligibility engine |
| **G6 Effect implementation** | Connecting certified effects to the weapon, armor or equipment resolvers | Scum detail pass (58 rows), per-definition end-to-end certification, existing combat math stays the authority, three separate critical channels preserved |
| **G7 Migration and retirement** | Removing duplicate catalogs and calculations | Dry-run report, reversible migration preserving every installed upgrade on existing Items, regression suite, Foundry v13 smoke test, owner sign-off per catalog |

## 9. Compatibility (LOCKED principles)

- **Foundry v13 and V2:** no data shape, template, hook, setting or manifest change in Phase 1b. Existing owned Items keep their `flags.foundryvtt-swse.customization.*` and legacy mirrors untouched.
- **Mutation authority:** `ActorEngine` and `TransactionEngine` remain the only mutation and credit authorities. The adapter has none.
- **Combat math:** existing attack, damage and critical code stays the authority. Registry effect targets such as `weapon.critical.*` are research, not a runtime path.
- **Domain separation:** weapon, armor and equipment typed definitions stay separate; there is no shared effect blob.
- **Phase 1a:** the resolver is unchanged and remains unwired. Certified slot costs reach it only as an injected closure (section 6.4).

## 10. Invariants for the eventual implementation

| ID | Invariant |
|---|---|
| J1 | The snapshot bytes never change; the manifest hash matches or the validator fails. |
| J2 | No validator failure is silently repaired, skipped or downgraded to a warning. |
| J3 | Identity is never matched on name; only explicit, evidenced crosswalk rows resolve a catalog key. |
| J4 | A slot cost is certified only through the section 6.1 predicate; everything else is unresolved with a reason. |
| J5 | An unknown or unstated price is `unknown` and never `0`. |
| J6 | No definition is reported executable in Phase 1b; `PENDING_RULES_TEXT` definitions never become executable through a slot cost. |
| J7 | The adapter is pure and read-only and returns copies, not references. |
| J8 | Domain separation is preserved: a result for one host domain never uses another domain's typed definition. |
| J9 | The adapter imports no consumer, no `ActorEngine`, no `TransactionEngine`, and the Phase 1a resolver imports no adapter. |
| J10 | The adapter never throws on malformed registry data; it returns an explicit unresolved result. |

## 11. Test contract for the eventual validator and adapter (not written now)

1. The snapshot matches the manifest hash and length; flipping one byte fails V1.
2. Every count in section 2.3 equals the tally; a deliberately altered fixture fails V2 with the path.
3. Duplicate definition id, duplicate typed `definitionId`, an id shared between definitions and procedures, a missing required field and a droid/vehicle/starship key each fail with a stable code.
4. A dangling `sourceFamily`, `bookId` or `procedureId` fails V6 (R1 reproduces on the received snapshot).
5. `PENDING_RULES_TEXT` with a non-empty `effectOperations`, an `EFFECTS_CERTIFIED` definition claiming `FULL_CERTIFIED`, and any `consumerStatus` claiming runtime approval each fail V7.
6. A `fixed` slot cost with a string, negative, fractional or missing `slots` fails V8; `credits` with a bad amount fails V9.
7. `getSlotCost`: a fixed, table-verified, domain-certified, general-pool definition certifies; a `conditional` (Retractable Stock), `not_specified`, `socket_occupancy`, `special_allowance`, non-general pool, excluded-scope, unmapped-key or domain-not-certified case is `certified: false` with its reason; a certified `0` stays a certified `0`.
8. The 58 pending definitions are never reported executable; a certified slot cost on one of them does not change that.
9. `getPrice` returns `unknown` for `not_stated` and never `0`; percentage, procedure and not-for-sale prices keep their tagged type.
10. Two definitions with the same name are never merged; a catalog key with no crosswalk row is unresolved; a shared `existingCatalogKeys` string never resolves anything (R3).
11. Results are deterministic and JSON-serializable, hold no references into the snapshot, and a deep-frozen snapshot is not mutated.
12. Static guard: the adapter has no mutation, I/O, clock, randomness, network or consumer import; no existing file imports the adapter or the validator in Phase 1b/G2.

## 12. Open decisions (the contract states facts; the owner settles)

| ID | Question |
|---|---|
| O1 | Confirm the SHA-256 and byte length of the v1.5 JSON against the original, and supply the v1.5 Markdown so the pair can be committed. |
| O2 | How are the received-snapshot defects R1-R5 handled: a version-pinned owner-approved *known-defects list* the validator tolerates exactly, a corrected v1.5.1 snapshot first, or the checks relaxed? The validator may not repair or ignore them silently. |
| O3 | Which `tableCertification` values qualify a slot cost as "table-verified" for read-only accounting (`TABLE_VERIFIED` and `SOURCE_TABLE_ROW_AND_RULE_TEXT_VERIFIED` only, or also `SOURCE_ENTRY_VERIFIED` and `NOT_TABLE_BASED_PAGE_VERIFIED`)? |
| O4 | Is `TABLE_CATEGORY` (the table the Scum row sits in: weapon 15 rows, armor 27 rows) sufficient to treat host applicability as certified for slot accounting, given it is not a rules-text certification? The 16 Table 2-3 universal rows carry `CONDITIONAL_UNVERIFIED` for weapon, armor and equipment. If not, certified slot costs exist today only for the 11 fixed-slot KOTOR/GAW/GoI definitions. |
| O5 | The registry procedure `sv-base-upgrade-capacity` omits heavy armor (R4) and is only `RULES_OUTLINE_REVIEWED`. Phase 1a's reviewer-verified baseline table remains the baseline authority; confirm the registry text is not to be used to alter it. |
| O6 | Where does the explicit crosswalk live and who confirms its rows (proposed path in section 5), and which catalog ids are in the first crosswalk? |
| O7 | The snapshot adds about 1 MB (plus the Markdown) under `data/audits/`; confirm that matches the existing policy for that directory, which already holds large audit JSON, and that it is not to be excluded from or added to the release package. |
| O8 | Name of the proposed validator, adapter and manifest files in this contract (PROPOSAL names only). |

## 13. What this contract deliberately does not do

It does not commit either v1.5 file; add a manifest, validator, adapter or crosswalk; change `system.json`, any catalog, pack, template, data pack, Workbench, `ActorEngine`, `TransactionEngine`, combat code or the Phase 1a resolver; certify any slot cost, host applicability, prerequisite, stacking rule, effect or price; promote any of the 58 Scum rows; resolve R1-R5; settle lightsaber, Tech Specialist, Sith Alchemy or template questions; touch droids, vehicles or starships; or perform any migration. Those remain separately gated (section 8).

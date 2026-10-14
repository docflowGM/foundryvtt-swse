# Canonical Modification Registry — Phase 1b Contract (revision 3)

**Status:** contract only, for owner and independent-reviewer approval. **No registry file, adapter, validator, crosswalk, test, catalog, pack, consumer or schema change accompanies this document.** Nothing here is authorized for implementation until approved.
**Baseline:** `origin/main` `e173b02e18fe064facfcd60c9920d72254f70120` (Phase 1a merged: PRs #1031, #1032, #1034, #1035, #1033).
**Binding inputs:** the Phase 1a contract (revision 6, D1-D17, all retained unchanged), the merged compliance audit, the owner decision approving the v1.5 artifacts and their repository paths, the owner rulings recorded in the audit-preservation instruction (table-verified slot costs for read-only accounting; unstated prices are unknown, never `0`; no automatic promotion of the 58 Scum rows), the independent Phase 1b architectural review of revision 1 (HOLD, corrections required) and the review of revision 2 (conditional approval).
**Labels:** **LOCKED** = decided by the owner/reviewer. **APPLIED** = a reviewer-recommended ruling applied in this revision, pending final owner approval. **PROPOSAL** = my drafting, needs approval. **OPEN** = a question only the owner/reviewer may settle (section 12); the contract states the facts and does not choose.

The goal is one canonical authority that retires the duplicate catalogs. It is not a second permanent parallel system, and no uncertified rule may enter production through it.

**Revision 3** is a narrow correction of revision 2, documentation only. It (D1) approves the version-pinned page-attestation mechanism and fixes what each attestation must carry (O9); (D2) lets `TABLE_CATEGORY` establish the stated weapon or armor domain for read-only accounting of an already-recorded installation, while `CONDITIONAL_UNVERIFIED` stays blocked and individual host eligibility and executability stay unestablished (O10); (D3) states that a caller-supplied `{ state: "valid" }` object is not trusted, so a trusted validation producer must bind the parsed data to the integrity result; (D4) orders the gates so a runtime loader (G8) precedes any runtime shadow comparison, and keeps G3 offline and test-only until then; and (D5) fixes the section 2 numbering and the count cross-references. Sections 2, 4, 6, 8, 10, 11 and 12 changed; every other revision 2 decision is preserved.

**Revision 2** is a focused correction of revision 1, documentation only. It (C1) turns R2 into a defined counting distinction between 232 typed definitions and 231 eligible upgrade candidates; (C2) fixes an exact, version-pinned known-deviation policy for R1 and records R4 and R5 as documented limitations; (C3) narrows the slot-cost certification predicate to approved table-verification states; (C4) separates table-domain classification, individual host eligibility, certified slot cost and runtime executability; (C5) lets only `relation: identical` crosswalk rows resolve a certified identity, with uniqueness on catalog, key and domain; (C6) requires a validated snapshot before the adapter returns any certified value; (C7) restates the Phase 1a baseline authority; (C8) keeps the audit data disconnected from runtime and records release packaging as a later gate; (C9) extends invariants and negative tests. Sections 1-13 changed; no Phase 1a decision is altered.

## 1. Source artifacts and what this session could read

| Artifact | Approved repository destination | Available to this session |
|---|---|---|
| `SWSE_Modification_Rolling_Authority_v1.5.json` | `data/audits/modification-rolling-authority-v1.5.json` (LOCKED) | **Yes.** The original upload, 960,022 bytes, SHA-256 `7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00` as received by this session. |
| `SWSE_Modification_Rolling_Authority_v1.5.md` | `docs/audits/modification-rolling-authority-v1.5.md` (LOCKED) | **No.** It was never supplied to this environment. It cannot be reconstructed from summaries, and this contract does not do so. |
| `SWSE_Modification_Rolling_Authority_v1.3.json` | none (superseded) | Yes, not used. |

**Dependency (blocking for G1, not for this contract):** the v1.5 Markdown must be supplied before the artifact pair can be committed; neither is committed without the other. The hash above is a measurement by this session only. The independent reviewer could not export the original bytes and therefore did not certify it. **Both hashes must be verified from the original raw bytes before G1** (O1, open). No reconstruction, re-serialization or substitute file is acceptable.

## 2. Registry authority

1. **Immutable snapshot (LOCKED in principle, APPLIED in form).** The committed v1.5 JSON is a versioned snapshot. It is never edited in place, reformatted, re-serialized, normalized or "repaired". A correction is a new snapshot with a new version (`v1.6`, or `v1.5.1` if the owner so decides) and new file names; the old snapshot stays until the owner retires it. Bytes and line endings are preserved exactly so the hash holds.
2. **Hash and manifest (PROPOSAL, names accepted).** SHA-256 of the exact file bytes is recorded in `data/audits/modification-rolling-authority-v1.5.manifest.json` (`registryName`, `version`, `generatedDate`, file path, byte length, SHA-256, expected counts, and the `knownDeviations` array of section 3.2). The manifest, not the registry, carries the hash. The Markdown companion gets its own hash entry once supplied.

### 2.1 Expected counts, as measured on the received JSON

| Measure | Value | How measured |
|---|---|---|
| Definitions / procedures | 186 / 57 | array lengths; ids unique; no id shared between the two arrays |
| `mechanicalCertification: EFFECTS_CERTIFIED` | 128 | tally; equals `indexSummary.mechanicallyCertified` |
| `mechanicalCertification: PENDING_RULES_TEXT` | 58 | tally; 57 are `currentStatus: CATALOGED_NOT_EXECUTABLE`, 1 is `EXCLUDED_SCOPE` (`sv-droidification`, no typed definitions) |
| `FULL_CERTIFIED` / `fullyExecutableCertified` | 0 / 0 | zero fully runtime-certified modifications (LOCKED) |
| `tableCertification` | `TABLE_VERIFIED` 113, `SOURCE_ENTRY_VERIFIED` 50, `NOT_TABLE_BASED_PAGE_VERIFIED` 21, `SOURCE_TABLE_ROW_AND_RULE_TEXT_VERIFIED` 2 | tally; 113 + 2 = 115 equals `indexSummary.tableCertified` |
| Scum and Villainy rows | 58 (Tables 2-3, 2-4, 2-5) | `source.bookId == scum-and-villainy` |
| Procedure `status` | `SOURCE_RULES_CERTIFIED` 29, `SOURCE_RULES_CERTIFIED_RUNTIME_PENDING` 21, `RULES_OUTLINE_REVIEWED` 4, `LEAD_PENDING_CERTIFICATION` 3 | 29 + 21 = 50 equals `indexSummary.separateProceduresCertified` |
| **Typed definitions, all** | **232** (equipment 38, weapon 121, armor 73) | count of `typedDefinitions` entries; `definitionId` values unique |
| **Eligible upgrade candidates** | **231** (equipment 38, weapon 120, armor 73) | the counting rule in 2.2 |

### 2.2 Counting populations (C1 — resolves R2)

The registry's `indexSummary.eligibleCandidateDomainVariants` (231) and `domainCandidateCounts` (equipment 38, weapon 120, armor 73) do not measure the same population as the raw typed-definition total (232). They differ by exactly one record, and the difference is explained by the registry's own data, not by corruption:

- `web-outlaw-tech-personalized-modifications` ("Personalized Modifications (Outlaw Tech talent)", *Saga Edition Web Enhancement 1: The Tech Specialist* p. 2, reprint *Starships of the Galaxy* p. 17) has `sourceRole: temporary_talent_actuator_not_installed_upgrade`, `originalSlotCost.type: not_applicable`, and a single weapon typed definition. It is a standard-action, encounter-long talent effect, not a purchasable or installed upgrade.

**Counting rule (APPLIED):** a typed definition is an *eligible upgrade candidate* when its parent definition's `sourceRole` is **not** `temporary_talent_actuator_not_installed_upgrade`. The rule names exactly that one role; no other role is excluded, and no other record is reclassified. The validator computes both populations, asserts 232 total (equipment 38, weapon 121, armor 73) and 231 eligible (equipment 38, weapon 120, armor 73), and reports which record is excluded. A mismatch against either figure is a failure. The excluded record stays in the snapshot, stays queryable by id, is never an installable upgrade candidate, and never has an accounted slot cost.

### 2.3 Findings on the received v1.5 JSON (reported; the snapshot is not altered)

| ID | Finding | Ruling |
|---|---|---|
| R1 | Three `sourceFamily` values used by definitions are missing from `sourceFamilies` (18 listed, 20 used): `armor_template` (`reb-stygian-triprismatic-polymer-armor`, `definitions[136]`), `purchase_quality_talent` (`reb-excellent-kit-purchased-quality`, `[137]`), `improvised_equipment_explosive` (`reb-jury-rigged-power-pack-bomb`, `[138]`). | Genuine metadata defect. Preserve the snapshot; carry it only as exact known deviations (3.2). |
| R2 | 232 typed definitions versus 231 index total. | Resolved as the defined counting distinction in 2.2; not corruption. |
| R3 | `implementation.existingCatalogKeys` is not a clean key list: it mixes bare keys, file anchors (`packs/armor.db#armor-stun-cloak`) and free text, and some strings are shared (nine Biotech definitions share one; two Stun Cloak definitions share two anchors). 96 definitions list 107 entries. | Research leads only. Identity requires the explicit crosswalk (section 5). |
| R4 | `sv-base-upgrade-capacity` (`RULES_OUTLINE_REVIEWED`) summarizes "baseline 1; medium and powered armor 2" and omits heavy armor, which printed p. 37 gives three stock slots. | Documented limitation. Nonauthoritative for baselines; Phase 1a's table is authoritative (C7). Not silently fixed. |
| R5 | `sv-retractable-stock` has `originalSlotCost.type: conditional`, `possibleCosts: [0, 1]` (printed p. 42). | Documented limitation. Remains a conditional, uncertified slot cost until its conditions are certified. Not silently fixed. |

### 2.4 Baseline authority (C7, LOCKED)

The Phase 1a stock baseline remains exactly: ordinary weapon 1, equipment 1, light armor 1, medium armor 2, heavy armor 3, with its stated precedence and unresolved cases. The registry, the adapter and the validator never supply, override or "correct" a baseline.

### 2.5 Standing registry rules

1. **Preserved verbatim.** Source ids, `source.*`, domain identities, `sourceFamily`, certification fields, `currentStatus`, `originalSlotCost`, `originalCost`, `eligibility`, `implementation` and `audit` are read exactly as written. Nothing is renamed to a catalog key, translated to a Foundry field, or defaulted.
2. **Registry vocabulary is binding (LOCKED).** `EFFECTS_CERTIFIED` means the source rule is verified and the runtime is **not** mapped. `cataloguedDoesNotMeanImplemented: true`. No `consumerStatus` is runtime-approved.
3. **Not a runtime directory (LOCKED).** `data/audits/` is a research location (181 JSON files today). Nothing in `system.json`, templates, hooks, settings or compendium loaders reads the snapshot in Phase 1b, and the adapter does not make it one (section 4.3).

## 3. Machine-readable validation (contract for a future validator)

A single deterministic script (`tools/validate-modification-registry.mjs`; **not written in Phase 1b**) reads the snapshot and the manifest and writes only to stdout and the exit code.

**V1 Integrity:** byte length and SHA-256 equal the manifest; the JSON parses; `version` equals `"1.5"`.
**V2 Counts:** every figure in 2.1 and the populations of 2.2 equal the measured tally and, where the registry gives one, its `indexSummary` figure *under the defined population* (2.2). The 232 / 231 distinction is an asserted rule, not a tolerated mismatch.
**V3 Uniqueness:** definition ids unique; procedure ids unique; the sets disjoint; typed `definitionId` values unique and each equal to its parent `id` plus `::` plus its domain key.
**V4 Required fields:** every definition has the fields in `definitionsSchema.required`.
**V5 Domain separation:** `typedDefinitions` keys are within {weapon, armor, equipment}; `candidateHostDomains` equals that key set; a typed definition's `domain` equals its key; nothing is shared across domains.
**V6 References:** every `source.bookId` and procedure `bookId` is in `bookLedger`; every `sourceFamily` is in `sourceFamilies` (R1 fails here, see 3.2); every `originalCost.procedureId` resolves; page numbers are positive integers or `null`.
**V7 Certification-state consistency:** `mechanicalCertification` is in `allowedCertificationStates`; `PENDING_RULES_TEXT` implies `currentStatus` in {`CATALOGED_NOT_EXECUTABLE`, `EXCLUDED_SCOPE`}, empty `effectOperations` and `effectStatus: PENDING`; `EFFECTS_CERTIFIED` implies `currentStatus: SOURCE_RULES_CERTIFIED_RUNTIME_NOT_MAPPED`; none is `FULL_CERTIFIED`; no `consumerStatus` claims runtime approval.
**V8 Slot-cost shape:** `originalSlotCost.type` is in the observed set; `fixed` requires an integer `slots` ≥ 0; every other type never yields a usable fixed number.
**V9 Price shape:** `credits` requires a finite `amount` ≥ 0; `not_stated` and every non-credit type never expose a numeric zero as a price.
**V10 Crosswalk (once it exists):** section 5 rules, including uniqueness on (`catalogId`, `catalogKey`, `domain`).
**V11 Validation result:** the validator emits a machine-readable result (section 4.1) that the adapter requires.

### 3.1 Reporting

Each failed check prints a stable code, the JSON-pointer path, and the observed versus expected value, sorted deterministically, then a summary and a non-zero exit code. There is **no repair mode, no auto-fix, no "ignore" flag and no silent tolerance**.

### 3.2 Known-deviation policy (C2, APPLIED)

A known deviation is the only way a defect in the immutable snapshot may coexist with a passing validation. It is a record in the manifest's `knownDeviations` array with **all** of: `registryVersion`, `errorCode`, `path` (exact JSON pointer), `observed` (the exact observed value), `expected` (what the check requires), `reason`, and `approvalReference` (the reviewer or owner decision that approved it). The validator:

1. computes every failure first, then matches each to a deviation by version, code, path and observed value;
2. **fails** on any failure with no matching deviation (an unexpected defect), on any deviation that matches no failure (drift or stale exception), on a deviation whose observed value differs from the measured value, and on a deviation for a different registry version;
3. **lists every matched deviation in the report**, so a passing run still shows what is tolerated; and
4. never downgrades, hides or rewrites a failure.

The only deviations proposed for v1.5 are the three R1 findings: code `REF_SOURCE_FAMILY_UNDECLARED`, paths `/definitions/136/sourceFamily`, `/definitions/137/sourceFamily`, `/definitions/138/sourceFamily`, observed values `armor_template`, `purchase_quality_talent`, `improvised_equipment_explosive`, reason "family used by a definition but absent from `sourceFamilies`; immutable snapshot", approval reference to be supplied by the owner. R2 needs no deviation (it is a counting rule), R3 is handled by the crosswalk, and R4 and R5 are documented limitations that are not validator failures: R4 is nonauthoritative text, R5 is a legal `conditional` slot cost that simply never certifies.

## 4. Read-only canonical adapter (contract only; not implemented)

A pure module (`scripts/engine/customization/modification-registry-adapter.js`) over an injected, already-parsed snapshot **and** its validation result. It performs no I/O of its own, no mutation, no clock, no randomness, no network, and imports no consumer.

### 4.1 Validated snapshot required, and who may vouch for it (C6, D3, APPLIED)

The adapter's constructor takes a *validated snapshot* handle. Rules:

1. **A caller-supplied status object is never trusted.** A bare `{ state: "valid", ... }` object, a hash string, or any plain-data validation result handed to the adapter by arbitrary code grants no certification, however well-formed it looks. The adapter cannot tell such an object from a forgery and must not try to.
2. **Trusted producer (PROPOSAL).** Only the validator, or a trusted loader that calls the validator, may produce the handle. The producer reads the raw bytes once, computes length and SHA-256 over **those same bytes**, parses **those same bytes**, runs checks V1-V10 and the known-deviation match, and only then returns one frozen handle that carries together: the parsed registry, `sha256`, `byteLength`, `registryVersion`, `validatorVersion`, the matched deviations, and an unforgeable brand (for example a module-private symbol or `WeakSet` membership held by the producer). Parsed data and integrity result therefore cannot be paired by the caller.
3. **The adapter checks the brand, not the claim.** It accepts only a handle that the producer's own check (`isValidatedSnapshot(handle)`) recognizes. A plain object that merely has `state: "valid"`, a handle whose parsed data was swapped after creation (the handle is deep-frozen), or a handle from a different validator version than the one the adapter was built for is rejected.
4. **Purity is preserved.** The adapter still performs no I/O, hashing or parsing; it only verifies the brand and reads the frozen data. Hashing and parsing live in the producer.
5. If the handle is missing, unbranded, or fails the check, **every certification query returns unresolved** with reason `SNAPSHOT_NOT_VALIDATED`. Non-certifying read queries (`getDefinition`) may still return the record as data, labelled `validated: false`.
6. `source.certification` strings in certified results are assembled from fields of the validated handle (`tableCertification`, `registryVersion`, `sha256`), never from caller-supplied text.

### 4.2 Queries

| Query | Returns |
|---|---|
| `getDefinition(definitionId)` | The registry definition as read, with `provenance` and `validated`, or `{ found: false }`. |
| `getTypedDefinition(definitionId, domain)` | The domain's typed definition with `domainApplicability`, `effectStatus` and `consumerStatus` as printed. |
| `resolveCatalogKey(catalogId, catalogKey, domain)` | A definition id **only** from an `identical` crosswalk row (section 5), else `{ resolved: false, reason }`. |
| `getSlotCost(definitionId, domain)` | The four-part result in section 6. |
| `getPrice(definitionId)` | A tagged union mirroring `originalCost.type`; `unknown` is distinct and never `0`. |
| `getCertification(definitionId)` | `tableCertification`, `mechanicalCertification`, `currentStatus`, `audit.blockers`, `audit.confidence`, executability (always `false` in Phase 1b). |

**Fail-closed rules:** an unknown id, unmapped key, malformed record or unavailable validation returns an explicit unresolved result with a reason. The adapter never substitutes a default, never merges records by name or key similarity, never infers a host domain from `candidateHostDomains` alone, never returns a number where the registry gives none, and returns plain JSON copies, not references into the snapshot.

### 4.3 No accidental runtime dependency (C8, APPLIED)

The adapter reads only the snapshot object handed to it. It has no path, import or `fetch` that loads `data/audits/` itself. A future runtime loader that reads audit data (or a validated derivative of it) into the adapter is a **separate gate (G8)** with its own authorization; until then no runtime code path references the audit files, and a static test (section 11) enforces it.

## 5. Identity crosswalk (C5, APPLIED)

The crosswalk is a separate, reviewed, version-pinned data file (`data/audits/modification-registry-catalog-crosswalk-v1.5.json`), not a field of the snapshot and not derived at runtime. `existingCatalogKeys` is a research lead only (R3).

Each row: `catalogId`, `catalogKey`, `definitionId`, `domain`, `relation` in {`identical`, `subset`, `superset`, `partial`, `conflict`}, `evidence`, `confirmedBy`, `confirmationDate`. Rules:

1. **Only `relation: identical` may resolve a catalog representation into a certified canonical identity.** `subset`, `superset`, `partial` and `conflict` rows are diagnostic-only: `resolveCatalogKey` returns them as `{ resolved: false, reason: NOT_IDENTICAL, relation }` and they never feed a certified slot cost or any accounting.
2. **Uniqueness is on (`catalogId`, `catalogKey`, `domain`).** At most one row per triple, whatever its relation; a duplicate triple, or a row whose `definitionId` has no typed definition for that `domain`, fails V10. Two `identical` rows from the same `catalogId` and `domain` naming the same `definitionId` are also a V10 failure until the owner approves an explicit alias rule.
3. A row without `evidence`, `confirmedBy` and `confirmationDate` is invalid. No row is created from name equality, summary text or `existingCatalogKeys`.
4. The nine Biotech Specialist traits are explicitly *not* the ordinary Tech Specialist traits that share their names; a row between them is `conflict`, not `identical`.
5. The first crosswalk covers individually verified `UPGRADE_CATALOG` entries; other catalogs follow separately (O6, APPLIED).

## 6. Certification gates (C3, C4, APPLIED)

### 6.1 Four separate results

`getSlotCost(definitionId, domain)` returns four independent parts and never collapses them:

1. **Slot-cost certification** — whether the fixed printed slot cost for this exact definition is certified.
2. **Table-domain classification** — what the registry says about the host domain: the printed `domainApplicability[domain]` value, reported verbatim, plus the derived `domainBasis` of 6.3.
3. **Individual host eligibility** — always `not_established` in Phase 1b. No Item is ever declared a valid host here; that belongs to the eligibility-convergence gate (G5).
4. **Runtime executability** — always `false` in Phase 1b.

### 6.2 Slot-cost certification predicate (LOCKED principles; values APPLIED)

Part 1 is `certified` **only when all hold**:

1. the snapshot is validated (4.1), the definition is not `EXCLUDED_SCOPE`, and its parent `sourceRole` is not `temporary_talent_actuator_not_installed_upgrade` (2.2);
2. `originalSlotCost.type === "fixed"` and `slots` is an integer ≥ 0 (an explicit `0` is a certified zero; `conditional`, `not_specified`, `not_applicable`, `socket_occupancy`, `special_allowance` and `not_specified_for_accessory` never certify);
3. the typed definition for the requested domain exists and its `slotPoolId` is `general-upgrades` (lightsaber crystal and accessory pools stay separate and uncertified);
4. `tableCertification` is `TABLE_VERIFIED` or `SOURCE_TABLE_ROW_AND_RULE_TEXT_VERIFIED`, for an **actual fixed table cost**; or `NOT_TABLE_BASED_PAGE_VERIFIED` **and** that exact (`definitionId`, `domain`, `slots`) appears in an owner-approved, version-pinned *slot-cost page attestation* in the manifest naming the certified rules page that prints that slot cost; and
5. `SOURCE_ENTRY_VERIFIED` is **never** sufficient on its own, and no attestation can be inferred.

**Page attestation (O9, APPROVED).** A version-pinned *slot-cost page attestation* is a record in the manifest. Each record carries **all** of: the exact `definitionId`, the `domain`, the `slots` value, the printed source location (book, printed page, and table or section), the independent verification evidence (what was inspected and how, not a restatement of the registry's own field), the reviewer's identity, and an approval reference. An incomplete record is invalid and certifies nothing. **No attestation is generated, inferred or derived from the registry's own claims**; each is written and approved by a person. Where an attestation is absent the result is `certified: false` with `PAGE_ATTESTATION_MISSING`. None exists for v1.5 today, so the three `NOT_TABLE_BASED_PAGE_VERIFIED` fixed definitions (`gaw-ion-shielding-cybernetic-prosthesis`, `goi-componentization-basic`, `goi-componentization-deluxe`) are not certified until one is approved.

On success part 1 carries `{ slots, poolId, definitionId, typedDefinitionId, source: { ref, certification } }` with `ref` assembled from `source.bookId`, `printedTablePage` and `tableId` (or `rulesPage`), and `certification` assembled per 4.1.3.

### 6.3 Domain-level table evidence versus individual Item eligibility (C4, D2, APPLIED)

Read-only accounting of an **already-recorded installation** needs the printed slot cost and the exact identity. It does not need, and must not claim, proof that a particular Item was a legal host.

- **`RULES_CERTIFIED`** establishes the stated domain by a certified rule; reported as `domainBasis: "rules-certified"`.
- **`TABLE_CATEGORY`** establishes the stated **weapon or armor** domain from the published table the upgrade sits in; reported as `domainBasis: "table-category"`. For read-only slot accounting of a recorded installation it is sufficient **provided** the fixed slot cost is certified (6.2) **and** the identity was resolved through an `identical` crosswalk row. It is a table domain, not a rules-text certification, and says nothing about an individual host.
- **`CONDITIONAL_UNVERIFIED`**, `NOT_CANDIDATE_PENDING_SOURCE_REVIEW`, `OUT_OF_SCOPE`, `APPLICABILITY_PENDING_HOST_RULE_REVIEW` and every restricted variant (for example `RULES_CERTIFIED_LIGHTSABER_ONLY`, `RULES_CERTIFIED_POWERED_PERSONAL_WEAPON_ONLY`, `RULES_CERTIFIED_FOR_EXPLOSIVES_MODELLED_AS_EQUIPMENT`) **remain blocked**: they yield no accounting result until the applicable source rules are verified. The universal Scum entries therefore do not gain weapon, armor and equipment applicability.
- In every case `hostEligibility` stays `not_established`, `executable` stays `false`, and nothing reports the Item as an eligible host or the modification as installable, purchasable or executable.

**Phase 1a lookup (6.6):** the closure returns a definition only when 6.2 certifies the cost, the crosswalk row is `identical`, and the requested domain's value is `RULES_CERTIFIED` or `TABLE_CATEGORY`. Measured on v1.5, this certifies 49 (definition, domain) pairs for accounting: 41 Scum rows (14 weapon, 27 armor, `TABLE_CATEGORY`) and 8 KOTOR pairs (6 weapon, 2 armor, `RULES_CERTIFIED`). The 35 Scum pairs from the 16 Table 2-3 universal rows (`CONDITIONAL_UNVERIFIED`) remain blocked, as do all pairs lacking an `identical` crosswalk row, which is every pair until a crosswalk exists.

### 6.4 What a certified slot cost does NOT imply (LOCKED)

It does not establish that installation is legal; that any Item is a valid host or meets prerequisites; that any effect is certified; that a price is known; that stacking or `maxPerHost` is settled; or that any runtime consumer is approved.

### 6.5 Standing non-executable and unknown rules (LOCKED)

- The 58 Scum definitions with `PENDING_RULES_TEXT` stay `CATALOGED_NOT_EXECUTABLE`; a certified slot cost never promotes one to an executable upgrade, catalog entry or effect.
- An unstated price is `unknown`, never `0` (`goi-componentization-basic`, `goi-componentization-deluxe`, `reb-excellent-kit-purchased-quality`). Percentage, multiplier, procedure-based and not-for-sale prices keep their tagged type.
- `sv-retractable-stock` (`[0, 1]`, R5) never certifies. Droidification stays excluded.

### 6.6 Interface to Phase 1a (PROPOSAL)

Phase 1a's `certifiedDefinitionLookup(upgradeKey)` returns `{ definitionId, upgradeKey, certifiedCost, source: { ref, certification } }`. A future factory `createCertifiedDefinitionLookup(adapter, catalogId, domain)` would return a closure that resolves the key through an `identical` crosswalk row, then `getSlotCost`, and returns the **unchanged** Phase 1a shape only when 6.2 and 6.3 both hold, otherwise `null`. The `domainBasis` stays in the `getSlotCost` result and is also recorded as a token inside the assembled `source.certification` string for traceability; no Phase 1a field is added. The lookup is for read-only accounting of an already-recorded installation only. Phase 1a is unchanged and still never imports the adapter.

## 7. Legacy catalog convergence map (no catalog is deleted or rewired in Phase 1b)

| Legacy source | Producer / owner today | Known conflicts with the registry | Eventual replacement path |
|---|---|---|---|
| `UPGRADE_CATALOG` (71) and `TEMPLATE_CATALOG` (7), `scripts/engine/customization/upgrade-catalog.js` | Standard path (`InstallRemoveEngine`, `UpgradeSlotEngine`) | Overload Switch cost 250 versus 500; Improved Energy Cell 1 slot versus 2; Componentization and Flash Suppressor unstated values stored as `0`; Retractable Stock `0`; host lists wider than candidates | First crosswalk target: individually verified entries only; read certified slot costs through the adapter; retire entries only after consumers read the adapter |
| Workbench catalogs (`scripts/data/{blaster,melee,armor}-upgrades.js`, `gear-mods.js`: 28 entries) | Workbench | Separate keys and slot math | Crosswalk or retire card by card; no key merge by name |
| Upgrade JSON (`data/upgrades/*.json`) | Evidence only | Mirrors the Scum tables; eight Scum rows absent from the runtime catalog | Superseded by the registry after verifying no tool reads it |
| Template catalogs (`data/gear-templates.json` 30, `scripts/data/gear-templates.js` 7, `TEMPLATE_CATALOG` 7) | `GearTemplatesEngine`, `TemplateEngine` | Three unreconciled catalogs; registry holds 26 published templates; none apply effects | Reconcile to registry `published_template` rows; stacking per registry after review |
| Tech Specialist options (39 traits) | `TechSpecialistModificationService` | 14 uncertified Superior Tech traits kept as-is; `tech_device_upgrade_slot` source-unverified; 15 droid/vehicle traits out of scope; Biotech names collide (R3) | Map the 9 certified in-scope traits via the crosswalk; leave the rest until a source ruling |
| Lightsaber crystals and accessories (`packs/lightsaber-crystals.db` 28, `packs/lightsaber-accessories.db` 10, `scripts/data/lightsaber-crystals-map.js`) | Pack generator not yet traced; owner requires tracing first | Registry holds 34 crystal identities; packed `upgradeSlots = 1` is not a general slot cost; socket and accessory allowance are separate pools | Trace the authoritative writer; separate gate; no slot-cost certification in Phase 1b |

## 8. Future gates (each needs its own independent authorization; none is granted here)

| Gate | Authorizes | Minimum prerequisites |
|---|---|---|
| **G1 Snapshot commit** | Committing both v1.5 files, the manifest and the validator | Both original files supplied; **both hashes verified from original raw bytes**; owner approval of the R1 deviations; CI runs the validator; **release packaging inspected** (decide whether `data/audits/` research files belong in distributable builds; no packaging change is made now) |
| **G2 Adapter and crosswalk** | The read-only adapter, its tests, and the first crosswalk file | Phase 1b approved; G1 merged; O6, O9 settled; no consumer wired |
| **G3 Slot-consumer shadow comparison** | Comparing the Phase 1a resolver with each existing slot calculation, one consumer at a time, logging differences only. **Offline and test-only** (fixtures and exported data) until G8 is approved and merged; a comparison that needs registry data at runtime may not start before G8 | G2 merged; a per-consumer plan; no write path |
| **G4 Canonical content corrections** | Source-backed fixes through upstream producers, never hand-edited generated packs | A reviewed list with source pages; one PR per producer |
| **G5 Eligibility convergence** | Replacing duplicated eligibility checks with existing legality services plus certified host facts | Host-evidence input contract (including Phase 1a D16 strip evidence); no second eligibility engine |
| **G6 Effect implementation** | Connecting certified effects to weapon, armor or equipment resolvers | Scum detail pass, per-definition end-to-end certification, existing combat math stays the authority, three critical channels preserved |
| **G7 Migration and retirement** | Removing duplicate catalogs and calculations | Dry-run report, reversible migration preserving every installed upgrade, regression suite, Foundry v13 smoke test, per-catalog owner sign-off |
| **G8 Runtime loader** | Any runtime code that loads audit data, or a validated derivative, into the adapter. **Must be approved before any runtime shadow comparison** that depends on it | Separate approval; the trusted producer of 4.1 is the only way to obtain a validated handle; proof that unvalidated or uncertified data cannot reach production; a runtime-ready representation distinct from `data/audits/` |

## 9. Compatibility (LOCKED principles)

- **Foundry v13 and V2:** no data shape, template, hook, setting or manifest change in Phase 1b. Existing owned Items keep their `flags.foundryvtt-swse.customization.*` and legacy mirrors untouched.
- **Mutation authority:** `ActorEngine` and `TransactionEngine` remain the only mutation and credit authorities.
- **Combat math:** existing attack, damage and critical code stays the authority; registry effect targets are research, not a runtime path.
- **Domain separation:** weapon, armor and equipment typed definitions stay separate.
- **Phase 1a:** the resolver is unchanged and unwired; certified costs reach it only as an injected closure (6.6).

## 10. Invariants for the eventual implementation

| ID | Invariant |
|---|---|
| J1 | The snapshot bytes never change; the manifest hash matches or validation fails. |
| J2 | No validator failure is silently repaired, skipped or downgraded; a passing run still lists every matched known deviation. |
| J3 | Identity is never matched on name; only `identical`, evidenced crosswalk rows resolve a catalog key. |
| J4 | A slot cost is certified only through 6.2; everything else is unresolved with a reason. |
| J5 | An unknown or unstated price is `unknown` and never `0`. |
| J6 | No definition is executable in Phase 1b; `PENDING_RULES_TEXT` definitions never become executable through a slot cost. |
| J7 | The adapter is pure and read-only and returns copies. |
| J8 | Domain separation: a result for one host domain never uses another domain's typed definition. |
| J9 | The adapter imports no consumer, `ActorEngine` or `TransactionEngine`; the Phase 1a resolver imports no adapter. |
| J10 | The adapter never throws on malformed registry data. |
| J11 | Only a snapshot with `state: "valid"` yields any certified value; a missing, failed or mismatched validation makes every certification query unresolved. |
| J12 | Certified provenance is assembled from validated snapshot fields, never from caller-supplied hash or certification text. |
| J13 | Only `relation: identical` crosswalk rows certify identity; other relations are diagnostic-only. Crosswalk rows are unique on (`catalogId`, `catalogKey`, `domain`). |
| J14 | Slot-cost certification, table-domain classification, individual host eligibility and executability are four separate fields. A certified cost with `RULES_CERTIFIED` or `TABLE_CATEGORY` domain evidence and an `identical` crosswalk row may be accounted read-only for a recorded installation; it never reports an Item as an eligible host or a modification as executable. `CONDITIONAL_UNVERIFIED`, `NOT_CANDIDATE_PENDING_SOURCE_REVIEW`, `OUT_OF_SCOPE`, `APPLICABILITY_PENDING_HOST_RULE_REVIEW` and restricted variants yield no accounting result. |
| J15 | The validator's known-deviation matching is exact: an unlisted failure, a stale or drifted exception, or a wrong-version exception fails validation. |
| J16 | The 232-versus-231 distinction is computed by the defined rule (2.2) and asserted; the excluded record is never an installable candidate. |
| J17 | No runtime code path loads `data/audits/`; any loader is gate G8. |
| J18 | Phase 1a baselines (1 / 1 / 1 / 2 / 3) are never read from, or altered by, the registry. |
| J19 | A caller-supplied validation object never grants certification; only a handle branded by the trusted producer, binding the parsed data and its integrity result to the same raw bytes, does. |
| J20 | A page attestation is complete (definition id, domain, slots, printed location, verification evidence, reviewer, approval reference), person-approved and never generated from the registry's own claims. |
| J21 | No runtime shadow comparison that needs registry data starts before G8; until then G3 is offline and test-only. |

## 11. Test contract for the eventual validator and adapter (not written now)

Expected results below are **independently specified literals** in the tests (hand-written fixtures and fixed expected values). Tests never derive an expectation by calling the implementation under test or by recomputing it with the same logic.

1. The snapshot matches the manifest hash and length; flipping one byte fails V1.
2. Every count in 2.1 and 2.2 equals the literal in the test; a deliberately altered fixture fails V2 with the path. The eligible-candidate rule yields exactly 231 (38 / 120 / 73) and excludes exactly `web-outlaw-tech-personalized-modifications`; a fixture with a second excluded role, or without the exclusion, fails.
3. Duplicate definition id, duplicate typed `definitionId`, an id shared between definitions and procedures, a missing required field and a droid/vehicle/starship key each fail with a stable code.
4. A dangling `sourceFamily`, `bookId` or `procedureId` fails V6; the received snapshot produces exactly the three R1 failures at the three paths and nothing else.
5. **Known-deviation drift:** with the three R1 deviations listed, validation passes and reports them; a fourth unlisted defect, a deviation whose observed value differs, a deviation whose path no longer fails, and a deviation pinned to another registry version each fail validation.
6. `PENDING_RULES_TEXT` with non-empty `effectOperations`, an `EFFECTS_CERTIFIED` definition claiming `FULL_CERTIFIED`, and any runtime-approved `consumerStatus` each fail V7.
7. A `fixed` slot cost with a string, negative, fractional or missing `slots` fails V8; `credits` with a bad amount fails V9.
8. **Unvalidated snapshot and trust boundary:** with no handle, an unbranded plain object `{ state: "valid", sha256, ... }`, a hand-built object copied from a real handle's fields, a handle with swapped parsed data, a handle from another validator version, or a bare hash string, every certification query is unresolved with `SNAPSHOT_NOT_VALIDATED`; a handle from the trusted producer for the same data certifies. A hash or integrity result computed over different bytes than the parsed data is rejected by the producer. Provenance text cannot be injected by the caller.
9. `getSlotCost`: a fixed, `TABLE_VERIFIED`, general-pool definition certifies part 1 (the Phase 1a closure additionally needs 10); `conditional` (Retractable Stock), `not_specified`, `socket_occupancy`, `special_allowance`, non-general pool, excluded scope, excluded `sourceRole` and a `SOURCE_ENTRY_VERIFIED`-only definition do not; a certified `0` stays a certified `0`; a `NOT_TABLE_BASED_PAGE_VERIFIED` definition does not certify without a complete attestation for its exact (`definitionId`, `domain`, `slots`) and does with one; an attestation for different slots, a different domain, or one missing any required field (printed location, verification evidence, reviewer, approval reference) does not; an attestation that merely copies the registry's own `tableCertification` text is not verification evidence.
10. **Domain evidence and host separation:** a fixed, certified-cost definition with `TABLE_CATEGORY` for the requested weapon or armor domain and an `identical` crosswalk row is returned by the Phase 1a closure with `domainBasis: "table-category"` recorded, `hostEligibility: not_established` and `executable: false`; the same definition with a `subset`, `superset`, `partial` or `conflict` row, or with no row, returns `null`. `RULES_CERTIFIED` behaves the same with `domainBasis: "rules-certified"`. `CONDITIONAL_UNVERIFIED`, `NOT_CANDIDATE_PENDING_SOURCE_REVIEW`, `OUT_OF_SCOPE`, `APPLICABILITY_PENDING_HOST_RULE_REVIEW` and each restricted variant return `null` and `HOST_DOMAIN_NOT_CERTIFIED`. A Table 2-3 universal row never gains an unlisted domain. Asking for a domain with no typed definition is unresolved; one domain's typed definition is never used for another. No result ever reports an Item as an eligible host or the modification as executable.
11. **Mismatched certification evidence:** a definition whose `tableCertification` and `source` disagree, a typed `slotPoolId` that differs from the parent's, or an attestation citing a different book or page does not certify.
12. **Crosswalk:** an `identical` row resolves; `subset`, `superset`, `partial` and `conflict` rows resolve to `NOT_IDENTICAL` and feed no cost; a duplicate (`catalogId`, `catalogKey`, `domain`) fails V10; two names that match never resolve; a shared `existingCatalogKeys` string resolves nothing; a Biotech trait does not resolve to its same-named ordinary trait.
13. **Identity conflicts:** the same `catalogKey` mapped to two definitions in one domain, or one definition aliased by two `identical` rows in one catalog and domain, fails V10.
14. **Unknown prices:** `getPrice` returns `unknown` for `not_stated` and never `0`; percentage, procedure and not-for-sale prices keep their tagged type; an invalid `credits` amount is unresolved.
15. The 58 pending definitions are never executable, and a certified slot cost on one does not change that.
16. Phase 1a baselines (1 / 1 / 1 / 2 / 3) are unchanged by any registry content: a registry whose `sv-base-upgrade-capacity` says anything else changes no baseline.
17. Results are deterministic, JSON-serializable, hold no references into the snapshot, and a deep-frozen snapshot is not mutated.
18. **Gate ordering:** a static test asserts no runtime file imports the adapter, validator or any loader before G8, and that any shadow-comparison tooling reads only fixtures or exported files.
19. Static guards: the adapter has no mutation, I/O, clock, randomness, network or consumer import; no existing file imports the adapter or validator before G3; no runtime file references `data/audits/` (J17).

## 12. Decisions

| ID | Status | Decision |
|---|---|---|
| O1 | **OPEN** | Verify the SHA-256 and byte length of the v1.5 JSON, and supply and hash the v1.5 Markdown, from original raw bytes before G1. No reconstruction. The reviewer could not export the bytes, so no hash is yet independently certified. |
| O2 | APPLIED | Immutable v1.5. R1 is carried only as the exact known deviations of 3.2; R2 is a counting rule (2.2); R3 is crosswalk-only; R4 and R5 are documented limitations. |
| O3 | APPLIED | `TABLE_VERIFIED` and `SOURCE_TABLE_ROW_AND_RULE_TEXT_VERIFIED` for actual fixed table costs; `NOT_TABLE_BASED_PAGE_VERIFIED` only with an approved page attestation; never `SOURCE_ENTRY_VERIFIED` alone. |
| O4 | APPLIED | `TABLE_CATEGORY` is a table domain, not host compatibility; the four results stay separate (6.1, 6.3). Superseded in part by O10 for read-only accounting. |
| O5 | APPLIED | Phase 1a baselines stay authoritative (2.4). |
| O6 | APPLIED | Separate version-pinned crosswalk; first covers individually verified `UPGRADE_CATALOG` entries; only `identical` rows certify. |
| O7 | APPLIED | Audit artifacts stay at the approved paths and disconnected from runtime; release packaging is inspected at G1; no packaging change now. |
| O8 | APPLIED | Names accepted: validator `tools/validate-modification-registry.mjs`; adapter `scripts/engine/customization/modification-registry-adapter.js`; manifest `data/audits/modification-rolling-authority-v1.5.manifest.json`; crosswalk `data/audits/modification-registry-catalog-crosswalk-v1.5.json`. No other registry or service authority is introduced. |
| O9 | **APPROVED** | Version-pinned page attestation for fixed slot costs established by independently verified rules pages. Required fields: exact definition id, domain, slots, printed source location, verification evidence, reviewer identity, approval reference. Never auto-generated or derived from the registry's own claims. The three page-verified fixed definitions stay uncertified until one is approved (6.2). |
| O10 | APPLIED | For read-only accounting of an already-recorded installation, `TABLE_CATEGORY` establishes the stated weapon or armor domain provided the fixed cost is certified and identity is an `identical` crosswalk row; `CONDITIONAL_UNVERIFIED` stays blocked; host eligibility and executability stay unestablished (6.3). No host-applicability attestation is needed or defined. |
| O11 | APPLIED | Validation trust boundary (4.1) and gate ordering: G8 precedes any runtime shadow comparison; G3 is offline and test-only until then. |

APPLIED means a reviewer-recommended ruling written into this revision, pending final owner approval.

## 13. What this contract deliberately does not do

It does not commit either v1.5 file; add a manifest, validator, adapter, crosswalk or attestation; change `system.json`, any catalog, pack, template, data pack, Workbench, `ActorEngine`, `TransactionEngine`, combat code or the Phase 1a resolver or tests; certify any slot cost, host applicability, prerequisite, stacking rule, effect or price; promote any of the 58 Scum rows; normalize or rewrite the snapshot; resolve lightsaber, Tech Specialist, Sith Alchemy or template questions; touch droids, vehicles or starships; change packaging; or perform any migration. Those remain separately gated (section 8).

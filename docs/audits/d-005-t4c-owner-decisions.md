# D-005 T4c — Owner Decisions and Serialization Freeze

**Status:** documentation only. Working PR #1057, branch `audit/d-005-t2-host-published-facts`. Baseline `b73bdb8010edd03f4ed59c576ba41f9cde90a96e`.
**Authority:** project owner. This is the authoritative repository record of the D-005 T4c **engineering design decisions** (F01). It is not a source verification, a rules amendment, a mechanic specification, an executable schema, or an implementation authorization. It does not alter the append-only rules register (`docs/audits/swse-rules-decisions-pending.md`).
**Decision date:** 2026-10-17 (design decisions and serialization freeze approved by the project owner).
**Scope:** the 15 *Scum and Villainy* universal upgrades (printed pp. 40–42) and their 35 typed definitions.

> **Not authorized by this record:** the JSON sidecar, its schema, any validator, test, adapter or evaluator; any production integration; D-014; G4–G9; merge. The complete 35-record T4c implementation requires a separate owner authorization after independent review of this record. Future `ownerRulingId` references resolve to the identifiers in §2–§3 below.

---

## 1. Standing boundaries (unchanged)

Registry v1.5 and its manifest; the 111 specification records (including the 35 `D005::` `PUBLISHED_FACTS` records); the status ledger; the generated runtime; `domainBasisFor()`; the 35 `CONDITIONAL_UNVERIFIED` domain entries and their unresolved canonical domain certification; `PINNED_SCOPE_SHA256`; the T4b census. Runtime selectability remains zero. There is no `COMPLETE_MECHANIC` record, no registered host evaluator, no executable effect or installer, no item-fact adapter or Item migration. The existing G3 framework remains authoritative; host-only diagnostics cannot override separate canonical domain certification.

## 2. The twelve design decisions (T4C-D01 … T4C-D12)

Approved by the project owner. Text is preserved from the owner's T4c handoff; no replacement decisions are introduced.

**T4C-D01 — Versioned JSON contract.** Use a separate, versioned JSON contract validated against a schema. Approved schema identifier: `swse.modification.host-requirements/1`. Create exactly one record for each existing `typedDefinitionId`, totaling 35. Do not modify immutable registry v1.5 or the 111 existing specification records.

**T4C-D02 — Exact identities and provenance.** Every structured requirement uses its exact `typedDefinitionId` and links to the corresponding `D005::<typedDefinitionId>` published-facts specification and the correct printed source page. Parent names are display labels, not authoritative identities. No evidence borrowing between weapon, armor and equipment domains.

**T4C-D03 — Four requirement groups.** The contract distinguishes `installRequirements`, `useRequirements`, `payloadRequirements`, and non-executable effect references. A use, payload or effect condition cannot be silently converted into an installation prerequisite.

**T4C-D04 — Allowed predicates.** A finite, validated vocabulary covering: Boolean equality; enum membership; existence of a valid, explicit Intelligence score; ordered equipment-size comparisons; strict weight comparisons; explicitly evidenced physical or functional compatibility. No executable scripts, arbitrary expressions, free-text parsing, inferred mechanics or unapproved numeric thresholds.

**T4C-D05 — Source versus engineering authority.** Every predicate identifies whether it represents a published SWSE requirement or an owner-approved engineering compatibility check, and cites the appropriate published source or owner ruling. A conservative engineering compatibility check is never represented as an exact printed SWSE rule.

**T4C-D06 — Structured provenance.** Evidence includes structured provenance: source record, actual Item identity, exact observed property or formal attestation, observed value, trust classification and contract revision. Arbitrary non-empty strings are not sufficient proof. T4c static records cite rule authority; actual observed Item evidence belongs to the future T4d adapter/evaluator. No invented Item observations are embedded in the T4c sidecar.

**T4C-D07 — Missing information.** Missing, contradictory, default-derived, ambiguous, untrusted or stale data remains unknown. Eligibility is not inferred from default `Small` size, default zero weight, missing droid flags, broad equipment tags, unverified ammunition-to-power-source mappings, or Item names or descriptions. Unknown data cannot independently prove eligibility or ineligibility.

**T4C-D08 — Three-state conjunction.** For the evaluated requirement group: `legal` — all mandatory conditions are affirmatively proven true by trusted evidence; `illegal` — at least one mandatory condition is affirmatively proven false by trusted evidence, even if unrelated facts remain unknown; `not_established` — neither a proven failure nor full verified satisfaction exists. Contradictory or untrusted data is not a proven failure. A host-only `legal` verdict does not establish domain certification, selectability or installation permission.

**T4C-D09 — No additional printed host requirements.** For an upgrade with no additional printed host prerequisite, use an explicit empty `installRequirements` array accompanied by a source-backed declaration that no additional host prerequisite was stated. An empty array is not an omission, wildcard, domain certification or automatic installation approval.

**T4C-D10 — Stacking and repeatability.** Stacking and repeatability remain separate from eligibility predicates. Extra Power Source is explicitly repeatable, with no invented numerical maximum. Advanced Memory Upgrade replaces the basic upgrade's benefits; they do not stack. All other repeatability remains unspecified unless independently established. `maxPerHost: null` is not interpreted as unlimited permission.

**T4C-D11 — Reason-code vocabulary.** The 19 proposed codes are the starting vocabulary; five additional diagnostic categories are approved. Superseded in detail by T4C-F06 (the frozen 30-code vocabulary). Existing G3 framework reason codes remain unchanged.

**T4C-D12 — Acceptance requirements.** The future T4c implementation must demonstrate: exactly 35 unique typed entries; exactly the 35 approved identities; correct `D005::` links and printed pages; exactly 19 SUPPORTED and 16 CONDITIONALLY SUPPORTED verdicts; exactly 15 equipment, 11 weapon and 9 armor definitions; deterministic schema and source validation; negative and mutation tests; rejection of malformed records, unknown predicates, forged authority and missing definitions; complete preservation of all existing G2/G3 certification gates; zero runtime-selectable definitions. T4c implementation scope, when separately authorized, is the JSON sidecar, schema and offline validation/test utilities only.

## 3. The eleven serialization-freeze decisions (T4C-F01 … T4C-F11)

**T4C-F01 — Durable decision provenance.** This document is the authoritative repository record of these engineering decisions. Future `ownerRulingId` references must resolve to an existing decision identifier in this document. It must be committed before the structured sidecar. The append-only rules register is not altered merely to store engineering decisions.

**T4C-F02 — Empty installation requirements.** For the 12 typed definitions belonging to Cloaked, Environmental Sealing, Miniaturized and Silverplate: preserve an explicit empty `installRequirements` array with a source-backed declaration that no additional host prerequisite is stated. A future offline host diagnostic may report `legal` for the absence of additional host prerequisites only after verifying the actual Item type, correct typed identity, trusted source declaration and contract revision, and those verification facts must provide genuine structured evidence. This is not domain certification, runtime selectability or installation authorization. The current G3 evidence contract is not weakened.

**T4C-F03 — Requirement-group semantics.** Only `installRequirements` contributes to the host-installation diagnostic. `useRequirements` and `payloadRequirements` are separate evaluations performed only when explicitly requested. An unrequested group has no evaluated verdict and must not manufacture a fourth G3 status. Within any evaluated group the outcomes remain `legal`, `illegal`, `not_established`. An absent payload is not automatically an installation prohibition.

**T4C-F04 — GM attestations.** No GM-attestation protocol is implemented. A future design may reserve a typed evidence representation for a separately authorized attestation mechanism, but informal GM assertions are not accepted as certified evidence. Permissions, issuance, provenance, expiration and revocation require separate authorization.

**T4C-F05 — G3 integration boundary.** The T4c sidecar is an offline design/validation artifact only. It is not an automatically loaded rule source. `createLegalityFramework()` and its registration contract are not modified; `hostRequirementsSpecified` is not set to true, no `hostEvaluator` is assigned, runtime selection is not enabled. The future T4d offline diagnostic requires independent authorization.

**T4C-F06 — Diagnostic reason-code freeze.** 30 approved diagnostic codes (§5). A deterministic case-to-code mapping is part of this decision (§5.2). Unknown Intelligence data is distinguished from trusted proof that a host has no Intelligence score; unknown physical compatibility is distinguished from trusted proof that compatibility fails. Existing G3 framework reason codes are preserved separately.

**T4C-F07 — Incomplete Item data.** The T4b census is accepted as the current capability boundary. No missing or default-derived Item value may be fabricated to complete a predicate. No actual Item fact becomes certified merely because the sidecar describes a requirement for that fact.

**T4C-F08 — Size ordering.** The ascending nine-category ordering is: Fine, Diminutive, Tiny, Small, Medium, Large, Huge, Gargantuan, Colossal. Case normalization is permitted only for independently trustworthy authored size values; normalized defaults are never substituted for missing values. Dual Gear permits equal-size items for its published relative-size comparison. Secret Compartment and Storage Capacity require the contained item to be at least one actual category smaller. Storage Capacity's total contained weight must be strictly less than host weight.

**T4C-F09 — Dual Gear component qualification.** The receiving host remains the existing equipment-typed definition. The added component must qualify as compatible equipment under the published requirement; items with weapon functionality are not categorically prohibited. Component qualification and physical compatibility are represented through separately identifiable `compat.evidenced` engineering checks linked to T4C-F09. The source-backed size restriction remains a distinct `PUBLISHED_RULE` predicate. Qualification is not inferred from the Foundry Item type alone.

**T4C-F10 — Non-executable effect references.** Effect references may identify source records and provide non-executable labels. No effect formulas, executable scripts, automation parameters, numeric mechanics, or unverified Silverplate / Spring Loaded effects. Effect references cannot become installation predicates.

**T4C-F11 — Registry prerequisite separation.** The new `installRequirements` field is separate from existing registry `eligibility.prerequisites` (an empty array on the 15 parents). Neither field inherits from, overrides, or reinterprets the other. Registry v1.5 remains immutable.

**Clarifications confirmed with F01–F11.** (a) *Integrity pin:* follow the existing pinned-hash pattern (§6); the future validator has its own pin and does not modify `PINNED_SCOPE_SHA256`; updating the pin is an explicit, reviewable change. (b) *Dual Gear:* the added-component qualification is a `compat.evidenced` check with `OWNER_ENGINEERING_CHECK` authority; the published size restriction is separate; weapon-functional items are not categorically excluded (F09). (c) *Owner-decisions document:* committed before the sidecar (F01).

## 4. Frozen serialization contract (for future implementation; nothing is created now)

* **Data path:** `data/modifications/host-requirements-v1.json`.
* **Schema path:** `data/modifications/schemas/host-requirements-v1.schema.json`.
* **Schema identifier:** `swse.modification.host-requirements/1`.
* **Root:** `{ schema, revision, records }`; `records` has exactly 35 entries, sorted deterministically by exact `typedDefinitionId` (byte-wise ascending).
* **Strictness:** the schema rejects unrecognized fact names, operators, authority types, size labels and unexpected fields; it never silently ignores them.
* **Record identity:** each record names exactly one `typedDefinitionId` and the exact `sourceSpecId = D005::<typedDefinitionId>`, the single-integer printed page (Secret Compartment: 41, with the p. 42 continuation recorded as a separate field), and the committed domain verdict. No records for the 10 registry pairs marked `NOT_CANDIDATE_PENDING_SOURCE_REVIEW`. No new typed domains.
* **Groups per record:** `installRequirements`, `useRequirements`, `payloadRequirements`, `effectReferences`, plus a separate `stacking` fact block (T4C-D10), none of which interprets another.
* **Empty install requirements (F02):** an explicit `[]` plus a `noAdditionalHostPrerequisite` declaration citing the `D005::` record.

### 4.1 Closed predicate-operator vocabulary (eight identifiers)

| Operator | Typed operands | Meaning | Allowed in groups |
| --- | --- | --- | --- |
| `bool.equals` | `fact` (a boolean-valued fact), `value` (boolean) | the fact is affirmatively the stated value | install, use |
| `enum.in` | `fact` (an enum-valued fact), `allowed` (non-empty subset of that fact's domain) | the fact's value is one of `allowed` | install, use |
| `enum.intersects` | `fact` (a set-valued fact), `allowed` (non-empty) | the fact's set has a non-empty intersection with `allowed` | install, use |
| `int.explicit` | `fact` (`intelligenceScore`) | a valid, explicit, trusted integer score exists; **no numeric threshold** | install |
| `size.not_larger` | `left`, `right` (size facts) | `left` is not larger than `right` in the F08 ordering (equal passes) | install |
| `size.smaller_by_at_least` | `left`, `right` (size facts), `steps` (integer, ≥ 1) | `left` is at least `steps` categories smaller than `right`; approved uses fix `steps = 1` (equal fails) | payload |
| `weight.sum_lt` | `items` (payload weight facts), `limit` (host weight fact) | strict: the sum of `items` is **less than** `limit` (equality fails) | payload |
| `compat.evidenced` | `check` (a key from the closed engineering-check list in §4.3) | the named compatibility is established by explicit trusted evidence | install, use, payload |

Every predicate carries `authority` (§4.4). Any operator outside this list, an operand of the wrong type, a fact outside §4.2, or an operator used in a group where it is not allowed is a validation failure (`HOST_PREDICATE_UNSUPPORTED` in the diagnostic vocabulary; a schema/validator error at authoring time).

### 4.2 Closed fact vocabulary (references only; no values are stored)

`item.type` (`weapon` | `armor` | `equipment`); `host.powerSourceTypes` (set; values include `energy-cell`, `power-pack`); `host.intelligenceScore` (integer); `host.droidStatus` (`droid` | `nondroid` | `unknown`); `host.oneHandedHandheld`, `host.functionRestrictable`, `host.remotelyActivatableFunction` (`true` | `false` | `unknown`); `host.sizeCategory` and `addedItem.sizeCategory` and `payload.sizeCategory` (one of the nine F08 labels); `host.weightKg` and `payload.weightKg` (finite non-negative numbers, provenance-bearing, unit kg). These names are the T4a [PROPOSED] fact representations, now fixed as the closed vocabulary of references; the sidecar stores no observed values for them (T4C-D06).

### 4.3 Closed engineering-check list for `compat.evidenced`

`canConcealCheater`; `canFitElectrograppleHandle`; `canAccommodateHiddenCompartment`; `canCarryPayload`; `addedComponentQualifiesAsEquipment` (T4C-F09); `addedComponentPhysicalFit` (T4C-F09, Dual Gear). Each is `OWNER_ENGINEERING_CHECK` and cites the decision identifier(s) in §4.4. None is a printed measurement requirement, and none is inferred from Item names, tags, descriptions or Item type.

### 4.4 Authority representation

* `PUBLISHED_RULE` — cites the corresponding `D005::<typedDefinitionId>` specification and its printed page.
* `OWNER_ENGINEERING_CHECK` — cites stable decision identifiers from this document (T4C-D05, and T4C-F09 for the two Dual Gear checks).
* The physical-compatibility engineering checks must never be represented as newly printed rules.

**Predicate-to-authority classification** (recorded exactly as the approved 15-upgrade mappings state them; any ambiguity found when the sidecar is written is raised for review, not resolved):

| Upgrade | `PUBLISHED_RULE` predicates | `OWNER_ENGINEERING_CHECK` predicates |
| --- | --- | --- |
| Cheater | — | `compat.evidenced(canConcealCheater)` |
| Cloaked | none (empty install requirements, F02) | — |
| Dual Gear | `size.not_larger(addedItem.sizeCategory, host.sizeCategory)` | `compat.evidenced(addedComponentQualifiesAsEquipment)`, `compat.evidenced(addedComponentPhysicalFit)` |
| Electrograpple Handle | — (the use prerequisite, an attuned gauntlet, is in `useRequirements`) | `compat.evidenced(canFitElectrograppleHandle)` |
| Environmental Sealing | none (empty install requirements) | — |
| Extra Power Source | `enum.intersects(host.powerSourceTypes, [energy-cell, power-pack])` | — |
| Memory Upgrade; Memory Upgrade, Advanced | `int.explicit(host.intelligenceScore)`; `enum.in(host.droidStatus, [nondroid])` | — |
| Miniaturized | none (empty install requirements) | — |
| Recognition System | `bool.equals(host.functionRestrictable, true)` | — |
| Remote Activation | `bool.equals(host.remotelyActivatableFunction, true)` | — |
| Secret Compartment | payload: `size.smaller_by_at_least(payload.sizeCategory, host.sizeCategory, 1)` | install: `compat.evidenced(canAccommodateHiddenCompartment)` |
| Silverplate | none (empty install requirements) | — |
| Spring Loaded | `bool.equals(host.oneHandedHandheld, true)` | — |
| Storage Capacity | payload: `size.smaller_by_at_least(…, 1)`, `weight.sum_lt(payload.weightKg…, host.weightKg)` | install: `compat.evidenced(canCarryPayload)` |

Empty-install-requirement definitions (12): `sv-cloaked::{weapon,armor,equipment}`, `sv-environmental-sealing::{weapon,armor,equipment}`, `sv-miniaturized::{weapon,armor,equipment}`, `sv-silverplate::{weapon,armor,equipment}`.

## 5. Diagnostic vocabulary (T4C-F06)

### 5.1 The 30 approved codes (all unique)

*Group A — the 19 codes recorded in the T4a contract:* `HOST_FACT_MISSING`, `HOST_FACT_UNTRUSTED`, `HOST_POWER_SOURCE_UNKNOWN`, `HOST_POWER_SOURCE_UNSUPPORTED`, `HOST_INTELLIGENCE_MISSING`, `HOST_IS_DROID`, `HOST_DROID_STATUS_UNKNOWN`, `HOST_ONE_HANDED_UNKNOWN`, `HOST_NOT_ONE_HANDED`, `HOST_ACTIVATION_UNKNOWN`, `HOST_RESTRICTABILITY_UNKNOWN`, `HOST_PHYSICAL_FIT_UNKNOWN`, `HOST_ADDED_ITEM_MISSING`, `HOST_SIZE_UNKNOWN`, `PAYLOAD_NOT_SMALLER`, `HOST_WEIGHT_UNKNOWN`, `PAYLOAD_WEIGHT_UNKNOWN`, `PAYLOAD_WEIGHT_LIMIT_EXCEEDED`, `HOST_CONTRACT_VERSION_UNTRUSTED`.

*Group B — five additional diagnostic categories (spellings now frozen):* `HOST_PREDICATE_UNSUPPORTED`, `HOST_DOMAIN_MISMATCH`, `HOST_EVIDENCE_CONTRADICTORY`, `HOST_PROVENANCE_INVALID`, `HOST_PROVENANCE_STALE`.

*Group C — six remaining codes:* `HOST_NOT_RESTRICTABLE`, `HOST_NOT_ACTIVATABLE`, `HOST_PHYSICAL_FIT_DISPROVEN`, `HOST_ADDED_ITEM_LARGER`, `PAYLOAD_SIZE_UNKNOWN`, `HOST_INTELLIGENCE_SCORE_ABSENT`.

Total: 19 + 5 + 6 = **30**. The existing G3 framework reason codes (`HOST_REQUIREMENTS_NOT_SPECIFIED`, `HOST_EVALUATOR_NOT_NAMED`, `HOST_EVALUATOR_NOT_REGISTERED`, `HOST_EVALUATOR_THREW`, `HOST_EVALUATOR_MALFORMED`) are unchanged, separate, and not part of this vocabulary.

### 5.2 Deterministic case-to-code mapping

Status rule (T4C-D08): a proven failure yields `illegal`; contradictory, untrusted, default-derived, stale, missing or ambiguous data never yields `illegal`. Where several cases apply to one evaluated group, every applicable code is emitted, sorted ascending by code string; the group status is `illegal` if any case marked **illegal** applies, otherwise `legal` only if every mandatory condition is proven, otherwise `not_established`.

| # | Case | Status | Code |
| --- | --- | --- | --- |
| 1 | Unknown/absent fact with no family-specific code below | `not_established` | `HOST_FACT_MISSING` |
| 2 | Fact present but trust is `derived`, `default` or `unknown` (or from an unrecognized source) | `not_established` | `HOST_FACT_UNTRUSTED` (emitted in addition to the family-specific unknown code, if any) |
| 3 | Two trusted observations of one fact disagree | `not_established` | `HOST_EVIDENCE_CONTRADICTORY` |
| 4 | Item type does not match the typed domain, or the `typedDefinitionId` is unknown | `not_established` | `HOST_DOMAIN_MISMATCH` |
| 5 | Operator, operand or fact outside the closed vocabulary, or operator used in a disallowed group | `not_established` | `HOST_PREDICATE_UNSUPPORTED` |
| 6 | Contract revision/hash does not match the trusted pin | `not_established` | `HOST_CONTRACT_VERSION_UNTRUSTED` |
| 7 | Evidence provenance structurally invalid or incomplete | `not_established` | `HOST_PROVENANCE_INVALID` |
| 8 | Evidence provenance bound to a different contract/Item revision (hash mismatch; no wall-clock) | `not_established` | `HOST_PROVENANCE_STALE` |
| 9 | Power source unknown, absent or untrusted | `not_established` | `HOST_POWER_SOURCE_UNKNOWN` |
| 10 | Trusted known power sources have an empty intersection with `[energy-cell, power-pack]` | **`illegal`** | `HOST_POWER_SOURCE_UNSUPPORTED` |
| 11 | Intelligence score unknown, unavailable or untrusted | `not_established` | `HOST_INTELLIGENCE_MISSING` |
| 12 | Trusted evidence establishes the device has no Intelligence score | **`illegal`** | `HOST_INTELLIGENCE_SCORE_ABSENT` |
| 13 | Droid status unknown, absent or untrusted (absence never means `nondroid`) | `not_established` | `HOST_DROID_STATUS_UNKNOWN` |
| 14 | Trusted evidence establishes `droid` (including converted into a droid) | **`illegal`** | `HOST_IS_DROID` |
| 15 | One-handed use unknown or untrusted | `not_established` | `HOST_ONE_HANDED_UNKNOWN` |
| 16 | Trusted evidence establishes not one-handed | **`illegal`** | `HOST_NOT_ONE_HANDED` |
| 17 | Restrictability unknown or untrusted | `not_established` | `HOST_RESTRICTABILITY_UNKNOWN` |
| 18 | Trusted evidence establishes the function cannot be restricted | **`illegal`** | `HOST_NOT_RESTRICTABLE` |
| 19 | Activatable function unknown or untrusted | `not_established` | `HOST_ACTIVATION_UNKNOWN` |
| 20 | Trusted evidence establishes the required activatable function is absent | **`illegal`** | `HOST_NOT_ACTIVATABLE` |
| 21 | Physical compatibility unknown, unevidenced or untrusted | `not_established` | `HOST_PHYSICAL_FIT_UNKNOWN` |
| 22 | Explicit, trusted evidence rules out physical compatibility | **`illegal`** | `HOST_PHYSICAL_FIT_DISPROVEN` |
| 23 | Dual Gear added item not supplied | `not_established` | `HOST_ADDED_ITEM_MISSING` |
| 24 | Dual Gear added item's size is larger than the host's (equal passes) | **`illegal`** | `HOST_ADDED_ITEM_LARGER` |
| 25 | Host or added-item size unknown, absent, default-derived or untrusted | `not_established` | `HOST_SIZE_UNKNOWN` |
| 26 | Payload size unknown, absent, default-derived or untrusted | `not_established` | `PAYLOAD_SIZE_UNKNOWN` |
| 27 | Payload size is **not** at least one category smaller than the host (equal or larger) | **`illegal`** | `PAYLOAD_NOT_SMALLER` |
| 28 | Host weight unknown, absent, default-derived or untrusted | `not_established` | `HOST_WEIGHT_UNKNOWN` |
| 29 | Any payload weight unknown, absent, default-derived or untrusted | `not_established` | `PAYLOAD_WEIGHT_UNKNOWN` |
| 30 | Sum of payload weights is **greater than or equal to** host weight (**equality fails**: the limit is strict) | **`illegal`** | `PAYLOAD_WEIGHT_LIMIT_EXCEEDED` |
| 31 | Payload group explicitly requested but no payload items supplied | `not_established` | `HOST_FACT_MISSING` (reused; no dedicated code is approved, and none is invented) |
| 32 | Payload group **not** requested | no verdict | none (T4C-F03: no fourth status) |
| 33 | Empty `installRequirements` and Item type, typed identity, trusted source declaration and contract revision are all verified | `legal` (absence of additional host prerequisites only; not domain certification, selectability or installation authorization) | none |

The code name `PAYLOAD_WEIGHT_LIMIT_EXCEEDED` is the frozen name for the strict-limit failure; its name does not narrow the rule — total weight **equal to** the host weight fails (case 30). `HOST_INTELLIGENCE_MISSING` always means unknown/unavailable data; `HOST_INTELLIGENCE_SCORE_ABSENT` always means a confirmed failure.

## 6. Provenance and integrity freeze

**Static rules versus runtime evidence.** The T4c sidecar stores rule authority (§4.4) and contract identity (`schema`, `revision`). It stores no observations about real owned Items. The future T4d evidence model (not authorized) must be provenance-bearing and distinguish the trust classes `explicit`, `attested`, `derived`, `default`, `unknown`. Only separately certified `explicit` data, or a separately authorized valid `attested` record, may eventually establish a predicate; `derived`, `default` and `unknown` never do. No attestation mechanism is authorized (T4C-F04). Evidence records bind to: source record, actual Item identity, exact observed property, observed value, trust class and contract revision (T4C-D06).

**Integrity.** The sidecar uses deterministic canonical serialization (the repository's `canonicalJson`) and SHA-256 verification (`sha256`). The `revision` field is defined as the SHA-256 of the canonical serialization of the `records` array **only** (the `schema` and `revision` fields are excluded from the hashed content), which avoids a circular self-hash. The future validator holds an independently maintained trusted pin in offline validation code, following the repository's existing `PINNED_SCOPE_SHA256` pattern. Its pin is a separate constant (a name such as `PINNED_HOST_REQUIREMENTS_SHA256` is proposed for the implementation); the existing `PINNED_SCOPE_SHA256` is not modified. A self-reported `revision` alone is never sufficient; the value must equal the pin. A legitimate sidecar change requires an explicit, separately reviewed pin update. Stale evidence is detected through trusted revision/hash mismatches, never arbitrary time comparisons.

## 7. Coverage preserved (35 typed definitions)

15 equipment, 11 weapon, 9 armor; 19 SUPPORTED, 16 CONDITIONALLY SUPPORTED. Each future record references exactly `D005::<typedDefinitionId>`; pages and verdicts are those of the committed records (checked against the 111 specification records at the baseline: 35/35 identities, pages and verdicts agree).

| # | Upgrade (page; verdict) | Typed definition identities |
| ---: | --- | --- |
| 1 | Cheater (40; SUPPORTED) | `sv-cheater::equipment` |
| 2 | Cloaked (40; SUPPORTED) | `sv-cloaked::weapon`, `sv-cloaked::armor`, `sv-cloaked::equipment` |
| 3 | Dual Gear (41; SUPPORTED) | `sv-dual-gear::equipment` |
| 4 | Electrograpple Handle (41; SUPPORTED) | `sv-electrograpple-handle::weapon`, `sv-electrograpple-handle::equipment` |
| 5 | Environmental Sealing (41; SUPPORTED) | `sv-environmental-sealing::weapon`, `…::armor`, `…::equipment` |
| 6 | Extra Power Source (41; CONDITIONALLY SUPPORTED) | `sv-extra-power-source::weapon`, `…::armor`, `…::equipment` |
| 7 | Memory Upgrade (41; CONDITIONALLY SUPPORTED) | `sv-memory-upgrade::equipment` |
| 8 | Memory Upgrade, Advanced (41; CONDITIONALLY SUPPORTED) | `sv-memory-upgrade-advanced::equipment` |
| 9 | Miniaturized (41; SUPPORTED) | `sv-miniaturized::weapon`, `…::armor`, `…::equipment` |
| 10 | Recognition System (41; SUPPORTED) | `sv-recognition-system::weapon`, `…::armor`, `…::equipment` |
| 11 | Remote Activation (41; CONDITIONALLY SUPPORTED) | `sv-remote-activation::weapon`, `…::armor`, `…::equipment` |
| 12 | Secret Compartment (41, continuing 42; CONDITIONALLY SUPPORTED) | `sv-secret-compartment::weapon`, `…::armor`, `…::equipment` |
| 13 | Silverplate (42; SUPPORTED) | `sv-silverplate::weapon`, `…::armor`, `…::equipment` |
| 14 | Spring Loaded (42; CONDITIONALLY SUPPORTED) | `sv-spring-loaded::weapon`, `sv-spring-loaded::equipment` |
| 15 | Storage Capacity (42; CONDITIONALLY SUPPORTED) | `sv-storage-capacity::weapon`, `…::armor`, `…::equipment` |

Stacking: Extra Power Source repeatability and Advanced Memory Upgrade replacement remain distinct published facts; no other stacking limit is inferred; registry `stackingPolicy: UNVERIFIED` and `maxPerHost: null` stay untouched. Silverplate and Spring Loaded effect text is not specified or adopted (T4C-F10).

## 7a. Executor-derived details flagged for independent review

The following specifics were written by the executor to make the approved decisions concrete. They follow from, but are not themselves stated in, the owner's rulings. They are **not** new owner decisions and are to be confirmed or corrected at independent review before the sidecar is authorized:

* the per-operator group restrictions in §4.1 (which operators may appear in which group);
* the closed fact list (§4.2) and the closed engineering-check key list (§4.3) as exact spellings;
* the predicate-to-authority classification in §4.4, which follows the approved mapping text;
* the `noAdditionalHostPrerequisite` field name and the `effectReferences` / `stacking` block names (§4);
* case 31 of the case-to-code table (payload group requested with no payload supplied reuses `HOST_FACT_MISSING`);
* the definition of `revision` as the SHA-256 of the canonical `records` array and the proposed pin constant name (§6).

## 8. Decision index

| Identifier | Subject |
| --- | --- |
| T4C-D01 … T4C-D12 | the 12 design decisions (§2) |
| T4C-F01 … T4C-F11 | the 11 serialization-freeze decisions (§3) |

23 unique identifiers. This document is also the reference target for the `ownerRulingId` field of `OWNER_ENGINEERING_CHECK` predicates.

## 9. Non-effects

This record changes no registry, manifest, specification record, ledger, generated runtime, decisions-register row, production code, Item model, compendium record, test or `PINNED_SCOPE_SHA256`, and creates no sidecar, schema, validator, adapter or evaluator. Runtime-selectable definitions remain zero.

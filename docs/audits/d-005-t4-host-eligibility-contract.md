# D-005 T4a — Host-Eligibility Contract

**Status:** documentation only. Working PR #1057, branch `audit/d-005-t2-host-published-facts`.
**Authority:** project owner. This document is a design record. It is **not** a rules amendment, an executable schema, a source lift, an approved G4 implementation, a merge authorization, or authority to change the immutable v1.5 registry.
**Scope:** the 15 *Scum and Villainy* universal upgrades (printed pp. 40–42) and their 35 typed-domain definitions (`hostPrerequisites`).
**Rules authority:** `docs/audits/d-005-universal-upgrade-host-text-transcription.md` and the committed 35 `D005::*` `PUBLISHED_FACTS` records; source PDF SHA-256 `74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399`. Claude is an implementation executor, not a rules adjudicator.

> **Provenance notice (replaces the earlier completeness notice).** The proposal `d005-t4-host-eligibility-contract-proposal.md` has now been **received and incorporated** (T4a completion commit). The first T4a commit (`c9c56f22`) was written without it and deliberately omitted its engineering sections. The proposal's content was supplied in the owner message that authorized this completion; it is reproduced below in substance, **labelled by approval level**, and cross-checked against the repository and the committed T4b census (`d-005-t4-item-fact-capability-census.md`, unchanged).

## 0. How to read this document

| Tag | Meaning |
| --- | --- |
| **[APPROVED]** | Owner-approved principle or fixed constraint (T4 authorization). |
| **[PROPOSED]** | Engineering detail from the proposal. **Not approved.** Awaiting independent review and owner decision. Nothing tagged [PROPOSED] may be treated as a rule, a vocabulary, or an implementation requirement. |
| **[VERIFIED]** | A statement about the current repository, checked against the files at the time of this commit. |
| **[CENSUS]** | A discrepancy between a proposal assumption and the T4b census. Recorded, not resolved. |

No [PROPOSED] item has been promoted to [APPROVED] by inclusion here.

---

## 1. Owner-approved design principles [APPROVED]

1. Eligibility outcomes remain exactly `legal`, `illegal` and `not_established`.
2. Unknown, untrusted, contradictory or missing information does not establish eligibility; the system fails closed, and missing information never automatically means eligible *or* ineligible.
3. A proven failed requirement may establish ineligibility.
4. GM review may flag an uncertain case but does not automatically override certification and cannot make a case executable.
5. Installation (item) requirements, use requirements, payload requirements and effects are distinct and stay separate.
6. Category-level support never proves individual Item eligibility.
7. Nothing here authorizes runtime selectability, an executor, or mechanical certification.

## 2. Fixed constraints [APPROVED]

* The existing **G3 legality framework remains authoritative.**
* **Free-text `behavior` must never be parsed as executable rules.**
* **Registry v1.5 remains immutable** (domain applicability, `stackingPolicy: UNVERIFIED`, `maxPerHost: null`, `printedTablePage`, `rulesPage`). The 35 source-verified records cannot override the registry or any certification gate.
* The 35 D-005 typed definitions **still lack the canonical domain certification** needed for eventual selectability.
* **No change to `domainBasisFor()`** is authorized.
* **No `COMPLETE_MECHANIC` specification and no evaluator or adapter implementation is authorized.**
* Source findings are preserved unchanged: 15 parents, 35 typed definitions (15 equipment, 11 weapon, 9 armor), verdicts **19 SUPPORTED / 16 CONDITIONALLY SUPPORTED**, Extra Power Source explicitly repeatable, Memory Upgrade Advanced replaces (does not stack with) the basic version, all other stacking `NOT SPECIFIED BY SOURCE`.
* The published Silverplate and Spring Loaded rules findings are preserved. Their exact effects are **outside the host-eligibility implementation scope**; this document neither specifies nor adopts them (see §12).
* Rules decisions belong to the project owner (`CLAUDE.md`; `docs/audits/swse-rules-decisions-pending.md`). Nothing here resolves a rules question.

## 3. Existing architecture relied on by the proposal [VERIFIED]

Each statement in the proposal's "existing architecture" section was checked against this branch.

| Proposal statement | Check |
| --- | --- |
| G2 runtime: 186 parents, 232 typed, `hostEligibility: "not_established"` everywhere, nothing selectable | **Confirmed** (`runtime-definitions-v1.5.json` header: 186 / 232 / 231 candidates / 49 accounting-eligible / 84 certified costs / 0 selectable). |
| The 35 are `SOURCE_VERIFIED` and not `MECHANIC_SPECIFIED`; `hostRequirementsSpecified=false`; `hostEvaluator=null`; D-005 source blockers zero | **Confirmed** (T2/T3, commit `68130df1`). |
| `createLegalityFramework()` is pure and fail-closed; statuses `legal`/`illegal`/`not_established`; positive and negative verdicts require a non-empty evidence array; no evaluator is certified | **Confirmed** (`modification-legality.js`: requires `hostRequirementsSpecified === true`, a named registered evaluator, `verdict ∈ {legal, illegal}` and a non-empty array of non-empty strings; anything else, including a throwing evaluator, returns `not_established`). |
| The G3 planner is read-only and always adds `EXECUTOR_NOT_CERTIFIED` | **Confirmed** (offline test asserts `EXECUTOR_NOT_CERTIFIED`, `NOT_SELECTABLE`, `HOST_NOT_ESTABLISHED` for every definition). |
| `domainBasisFor()` yields a basis only for `RULES_CERTIFIED`, or `TABLE_CATEGORY` on weapon/armor | **Confirmed** (`tools/lib/modification-runtime.mjs`). |
| The 35 D-005 pairs are `CONDITIONAL_UNVERIFIED` in registry v1.5, so `domainBasis = null` and the G3 selectability guard is unsatisfied; a host evaluator must not sidestep it | **Confirmed as a constraint** (registry untouched; see §10). |
| Live Item template lacks a consistently authoritative power-source class, Intelligence-bearing status, droid-conversion status, one-handed use, containment, activatable/restrictable function across all three Item types; normalizers synthesize defaults (size `Small`, missing weight `0`) | **Confirmed and quantified by the census** (§13). |

Note: the legality framework's return shape is `{ status, reasons, evaluator, evidence }`. The proposal's diagnostic `stage` field is a **[PROPOSED]** addition to a separate diagnostic layer, not a change to that contract.

## 4. Proposed owner-policy principles P1–P6

The proposal numbers six recommendations. Their relation to the seven approved principles in §1 is shown so that approval is not inferred.

| # | Proposal text (summary) | Relation to §1 | Status |
| --- | --- | --- | --- |
| **P1** | Keep G3's three statuses. `not_established` may be displayed as "GM review required" but never means eligible or executable. Avoid a fourth engine-level status until separately approved. | Restates §1.1 and §1.4. The "no fourth engine status" and "GM review required" display wording are **additional** detail. | Core: [APPROVED]. Extra detail: [PROPOSED]. |
| **P2** | Fail closed without false negatives: a missing, derived-default, ambiguous, contradictory, stale or untrusted fact yields `not_established`, never `illegal` or `legal`. A definitively false required condition with trusted evidence yields `illegal`. All required conditions must be positively satisfied with trusted evidence before `legal` is even a candidate. If at least one proven condition fails, `illegal` is permissible even when other facts are unknown, citing the failing condition. | Restates §1.2 and §1.3. The precise rule that `legal` requires *all* conditions proven, and that `illegal` may be returned despite unknowns elsewhere, is **additional** detail. | Core: [APPROVED]. Precise ordering rules: [PROPOSED]. |
| **P3** | No invisible GM override: the engine does not treat a handwritten note, unreviewed tag or description as certified evidence. A structured, provenance-bearing GM attestation protocol, its permission model and revocation rules need separate approval. Until then, incomplete facts go to review and are non-executable. | Restates §1.4. The attestation protocol is **new** and unapproved. | Core: [APPROVED]. Attestation protocol: [PROPOSED]. |
| **P4** | Rule facts, host facts, usage requirements and effects are distinct. Source-verified host requirements are versioned typed rules; individual host facts come from trusted Item adapters; some requirements apply to an added item, contained contents or use rather than installation and must not become unsupported host prohibitions. | Restates §1.5. | Core: [APPROVED]. Mechanism: [PROPOSED]. |
| **P5** | Category verdicts are not individual eligibility. SUPPORTED / CONDITIONALLY SUPPORTED are source-review domain verdicts, not item-level booleans or a replacement for the registry's `domainBasis`. Electrograpple Handle and Recognition System stay SUPPORTED at category level; their use and function conditions stay separate. | Restates §1.6. | [APPROVED]. |
| **P6** | No runtime promotion during T4: no `COMPLETE_MECHANIC`, no `hostRequirementsSpecified=true`, no selectable ledger entries, no `hostEvaluator` strings, no loaders, no actor writes, no new upgrade slots, no compensation, no effect automation, no D-014 resolution, no G4–G9. | Restates §1.7 and §2. | [APPROVED]. |

## 5. Proposed machine-readable contract [PROPOSED]

A future, separately approved source-controlled host-rule specification (proposed schema id `swse.modification.host-requirements/1`) would:

* enumerate exactly the 35 current `typedDefinitionId`s, never names or loose parent ids;
* cite each corresponding committed `D005::<typedDefinitionId>` `PUBLISHED_FACTS` record and the unchanged source-review evidence;
* preserve each review-level domain verdict separately from any G2 certification;
* define strictly typed, recognized predicates with an explicit operation context — `install`, `use` or `payload` — with no free-form scripts, expression evaluation, or rules parsed from `behavior` prose;
* store requirements in a deterministic, side-effect-free format, validating all referenced typed ids, operators, size units and enum values, and never alter registry v1.5 to fit the schema;
* be treated as research / offline diagnostics only until the G2 and G3 certification and loader contracts are amended under their own gates.

Illustrative requirement definition (proposal text; **not code to implement**; field names, enum names and the schema id are proposals, not accepted generator vocabulary, and must not be injected into existing G2 records without a separate contract change):

```json
{
  "schema": "swse.modification.host-requirements/1",
  "typedDefinitionId": "sv-extra-power-source::weapon",
  "sourceSpecId": "D005::sv-extra-power-source::weapon",
  "domainVerdict": "CONDITIONALLY_SUPPORTED",
  "installRequirements": [
    { "predicate": "host.powerSourceType.in", "allowed": ["energy-cell", "power-pack"] }
  ],
  "useRequirements": [],
  "payloadRequirements": [],
  "stacking": { "fact": "EXPLICITLY_REPEATABLE", "maxPerHost": null },
  "certification": "DESIGN_ONLY"
}
```

The committed record for this typed id (`D005::sv-extra-power-source::weapon`) states the domain verdict CONDITIONALLY SUPPORTED, the host as "any item … that actually operates using energy cells or power packs", and the explicit repeatability — consistent with the illustration. The illustration's `allowed` list and the `maxPerHost: null` mirror, but do not amend, registry v1.5.

## 6. Trusted host-fact adapter [PROPOSED; not available today]

A pure adapter would return each fact with `known = true | false`, a typed value only when known, and evidence provenance — never treating missing data as `false`, `0`, `Small` or an empty list. It would need a trust and version strategy, data-migration and repair strategy for existing Items, and must not retrofit Items with guessed values.

The proposal's fact table, with the census result for each row. All representations are **[PROPOSED]** engineering representations, not approved rules; listing them does not authorize implementing them.

| Proposed fact | Proposed representation | Proposal's own evidence caution | [CENSUS] discrepancy / state |
| --- | --- | --- | --- |
| Item type | `weapon` \| `armor` \| `equipment` | — | Always available from `item.type`; the only host fact G3 reads today besides the V2 instance list. |
| Power supply | `powerSourceTypes: string[]` or unknown | `ammunition.type = power-pack` may be usable only after a reviewed, explicitly scoped mapping; ammunition does not prove power type in every case | Weapon `ammunition.type` is explicit on 203/203 (56 with a power-pack / energy-cell / power-cell / integrated-power-pack value) but the mapping is unreviewed. Armor: charges only, no power-source type. Equipment: only the cell and pack items themselves carry power-source fields. **No field is a certified equivalence.** |
| Intelligence score | `intelligenceScore: integer` or unknown | `capabilities.computerIntelligence` may be a source only for validated compatible Item producers; do not infer from generic technology tags | Present on 5 of 142 equipment records, none on weapons/armor; one record (`Datapad, Basic`) has `computer: false` with a score of 10 — **contradictory**. |
| Droid status / conversion | `droidStatus: droid` \| `nondroid` \| `unknown` | Absence of a droid flag does not prove nondroid status; conversion must be represented | **Not represented** at Item level (droid status exists only on Actors). Omission must not mean `nondroid`. |
| One-handed handheld use | `oneHandedHandheld: true` \| `false` \| `unknown` | Weapon category, size, equipment slot and wearability are insufficient | `capabilities.oneHandedOperation` on 1 of 142 and `capabilities.handheld` on 13 (different concept); weapon `weaponProperties` / `wieldedTwoHanded` are defined in `template.json` but populated on 0 pack records; trait spellings `Two-Handed` and `TwoHanded` both exist. **Incomplete and inconsistent.** |
| Owner restriction | `functionRestrictable: true` \| `false` \| `unknown` | Ownership metadata does not prove restrictable functionality | **Not represented.** `restriction` / `availability` mean legal-status categories, not authorization. |
| Remote activation | `remotelyActivatableFunction: true` \| `false` \| `unknown` | Being electronic does not prove a meaningful activation target | **Not represented.** `usage.mode` / `active` / `activated` are different concepts. |
| Physical accommodation | separate tri-state `canConcealCheater`, `canFitElectrograppleHandle`, `canAccommodateHiddenCompartment`, `canCarryPayload` | No inference from description adjectives or shape/name; may need authoritative manual review before any positive evidence exists | **Not represented.** `container.capacity` is `null` and `container.contents` is empty on all 142 equipment records; no weapon/armor fields. |
| Physical size | `sizeCategory` in the published SWSE equipment sizes, or unknown | Require explicit, vetted size; never use a normalizer's `Small` fallback; a size comparison alone is insufficient for fit | **Absent on all 203 weapons and 70 armor.** On equipment, 125 of 142 are lowercase `small`, indistinguishable from the normalizer default (`size: normalized.size \|\| 'Small'`). `ItemProfileResolver` *derives* an object size from weight bands and defaults `weaponSize` to `medium`; those are derived, not source data. |
| Item weight | `weightKg`: finite non-negative value or unknown, with provenance and unit | Missing does not equal zero; zero is known only when expressly recorded and meaningful | Weight is present on all records, but 3 weapon and 35 equipment zeros cannot be distinguished from the normalizer's coerced `0`; no unit field (kg by convention). |
| Added / contained item | an explicit second Item snapshot and a validated contents list, or unknown | Do not fabricate payloads or infer contained items from inventory proximity | **Not represented**; no added-item relationship field exists. |

**Discrepancy summary.** The proposal's fact families are largely *candidates*; the census shows that for most of them the current Item data is missing, defaulted, ambiguous or contradictory. These gaps are recorded here and are **not resolved by assumption**: any positive host verdict depending on such a fact would, under the approved principles, be `not_established`.

## 7. Proposed mapping of the 15 upgrades to host requirements [PROPOSED]

Parent names are shorthand; evaluator inputs and certified outcomes must always use typed ids. "Records" is the number of committed `D005::` typed records. "Verdicts" are the committed domain verdicts per typed domain (S = SUPPORTED, C = CONDITIONALLY SUPPORTED; total 19 S / 16 C). Page numbers are the committed `printedPage`.

| Upgrade | Page | Typed domains and verdicts | Records | Proposed install-host criterion [PROPOSED] | Separate use / payload / interaction condition [PROPOSED] |
| --- | ---: | --- | ---: | --- | --- |
| Cheater | 40 | equipment S | 1 | A functional Item capable of accommodating / concealing the cheating device; if unrepresented, **not established**. | Cheating effectiveness and concealment depend on the device and use. |
| Cloaked | 40 | weapon S, armor S, equipment S | 3 | No additional host predicate beyond individually validated domain compatibility. | Detection / appearance effects differ per host type. |
| Dual Gear | 41 | equipment S | 1 | Two actual, physically compatible equipment items; the added item not larger than the receiving item. Both facts needed. | Combined-use limitation and the full purchase price of the added item are **not** installation-host evidence. |
| Electrograpple Handle | 41 | weapon S, equipment S | 2 | The Item can physically accept the specialized handle (if not established, review); weapons are a common, not exclusive, application. | An attuned electrograpple gauntlet is needed to *use* the retrieval function, **not** to install the handle. |
| Environmental Sealing | 41 | weapon S, armor S, equipment S | 3 | No extra host predicate beyond validated domain compatibility. | Protection applies to the object, not its wearer. |
| Extra Power Source | 41 | weapon C, armor C, equipment C | 3 | The Item **actually uses** an energy cell or power pack. | Explicitly repeatable: another power supply per installation; no printed numeric maximum. |
| Memory Upgrade (basic) | 41 | equipment C | 1 | An Intelligence-bearing device that is affirmatively nondroid, including no droid conversion. | Intelligence / storage effects; the advanced benefits replace the basic ones. |
| Memory Upgrade, Advanced | 41 | equipment C | 1 | Same affirmative Intelligence + nondroid conditions. | Advanced replaces basic; no basic-first prerequisite and no invented universal maximum of one. |
| Miniaturized | 41 | weapon S, armor S, equipment S | 3 | No extra host predicate beyond validated domain compatibility. | Weight / size reduction and the melee-weapon damage-die penalty are effects. |
| Recognition System | 41 | weapon S, armor S, equipment S | 3 | An Item with a function that **can meaningfully be restricted** to an authorized user; category stays SUPPORTED. | Authorization bypass and owner deactivation are use / effect mechanics, not new biometric prerequisites. |
| Remote Activation | 41 | weapon C, armor C, equipment C | 3 | The Item has a meaningfully activatable function. | Signal, action and security consequences are use / effect mechanics. |
| Secret Compartment | 41 (continues on 42) | weapon C, armor C, equipment C | 3 | The host must physically support a hidden compartment. | The compartment holds **one item** at least one actual size category smaller — payload capacity, **not** a maximum of one upgrade per host. |
| Silverplate | 42 | weapon S, armor S, equipment S | 3 | No extra host predicate beyond validated domain compatibility. | Object DR, the armor-not-wearer distinction, and the Quick Draw-related benefit are effects (§12). |
| Spring Loaded | 42 | weapon C, equipment C | 2 | The Item demonstrably can be **held and used in one hand**. | Presenting / drawing is an action condition (§12), not an installation prerequisite. |
| Storage Capacity | 42 | weapon C, armor C, equipment C | 3 | The host demonstrably can accommodate stored items; actual physical capacity cannot be assumed from size alone. | For each stored item: at least one size category smaller than the host; total contained weight **strictly below** host weight — payload legality, using authoritative sizes and weights. |

**Agreement check against the committed source findings.** The 15-row mapping was compared with the committed `D005::` records. Record counts (35), domain sets, verdict distribution (19 / 16) and page numbers agree. The install-host criteria agree in substance with the committed "Host finding" and "Functional prerequisites" text for every row. Specific points to note:

* Where the committed records state a prerequisite only at category level (Cheater, Recognition System, Remote Activation, Secret Compartment, Storage Capacity, Spring Loaded, Extra Power Source, Memory Upgrade), the proposal's statement that the *individual Item* must satisfy it matches the records' own "individual host" / "do not infer" limits.
* Rows with "no extra host predicate" correspond to committed records whose functional prerequisite is "No additional host prerequisite specified by the approved source findings."
* The proposal's Electrograpple Handle criterion ("can physically accept the handle") is a mapping of the committed host finding ("a compatible piece of equipment fitted with the specialized handle"); the committed record does not state a measurable physical-fit rule. This is an open mapping, not an established predicate.
* Stacking: the table records only the two stacking facts the source states (Extra Power Source repeatable; advanced Memory Upgrade replaces basic). All other stacking remains `NOT SPECIFIED BY SOURCE`; registry `UNVERIFIED` / `null` are unchanged.

Important distinction (proposal): SUPPORTED often coexists with a functional requirement (Recognition System, Cheater, Dual Gear). That does not license an automatic Item-level `legal`, nor does it change the 19 / 16 distribution.

### Two size checks that must stay different [PROPOSED]

* **Dual Gear:** the added equipment must not be larger than the receiving host; equal size may pass the size test, subject to independent physical compatibility.
* **Secret Compartment / Storage Capacity:** each contained Item must be at least one actual size category **smaller** than the host, subject to additional capacity requirements; equal size fails. Storage Capacity also requires total contained weight strictly below the host's weight (equal fails).

For Secret Compartment and Storage Capacity, the absence of a selected payload must not become an arbitrary installed-upgrade ban: installation of a potentially suitable host is distinguished from checking specific contents, and the host's physical ability to accommodate the modification still needs affirmative evidence.

## 8. Proposed evaluator input / output and deterministic semantics [PROPOSED]

Read-only input: `(typedDefinitionId, trusted host snapshot, optional proposed addedItem, optional payloadItems, trusted contract revision)`.

Proposed diagnostic output (the `stage` field is a diagnostic-layer proposal, not a change to the G3 return contract):

```json
{
  "status": "not_established",
  "reasons": ["HOST_POWER_SOURCE_UNKNOWN"],
  "evaluator": null,
  "evidence": [],
  "stage": "offline_diagnostic"
}
```

Compatibility with `createLegalityFramework()` is required: only a named registered evaluator returning `legal` or `illegal` with non-empty evidence is accepted.

Evaluation rules (proposal):

1. Validate a known `typedDefinitionId`, a trusted contract mapping and the actual `item.type`; reject unknown or mismatched identities without manufacturing evidence.
2. Evaluate only predicates approved for the correct operation (`install`, `use`, `payload`). No name, prose, tag or description parsing.
3. Proven failure → `illegal`, citing the exact failing predicate and evidence path or verified value.
4. All required proofs present → `legal` for that specific question only, with evidence, and only if an independently reviewed, registered evaluator is authorized. This is **not** runtime selectability, installation permission, source certification, slot accounting or executor readiness.
5. Anything else → `not_established` with deterministic reason codes; GM review may be presented. It is not executable.
6. Evidence must cite real observed Item data and rule provenance, not arbitrary non-empty strings or fabricated certificates. Tests must reject fake evidence, throwing evaluators, stale contract versions and contradictory inputs.
7. Contradictions, cached stale results, missing snapshot provenance or invalid Item data fail closed; no caching across Item mutation without fresh evidence.

Note [VERIFIED]: the existing framework checks only that evidence is a non-empty array of non-empty strings; it does **not** verify that the strings are real. Rule 6 therefore adds a requirement that today's framework does not enforce.

### Proposed reason codes (names to be approved before implementation) [PROPOSED]

`HOST_FACT_MISSING`, `HOST_FACT_UNTRUSTED`, `HOST_POWER_SOURCE_UNKNOWN`, `HOST_POWER_SOURCE_UNSUPPORTED`, `HOST_INTELLIGENCE_MISSING`, `HOST_IS_DROID`, `HOST_DROID_STATUS_UNKNOWN`, `HOST_ONE_HANDED_UNKNOWN`, `HOST_NOT_ONE_HANDED`, `HOST_ACTIVATION_UNKNOWN`, `HOST_RESTRICTABILITY_UNKNOWN`, `HOST_PHYSICAL_FIT_UNKNOWN`, `HOST_ADDED_ITEM_MISSING`, `HOST_SIZE_UNKNOWN`, `PAYLOAD_NOT_SMALLER`, `HOST_WEIGHT_UNKNOWN`, `PAYLOAD_WEIGHT_UNKNOWN`, `PAYLOAD_WEIGHT_LIMIT_EXCEEDED`, `HOST_CONTRACT_VERSION_UNTRUSTED`.

The existing framework's reason codes (`HOST_REQUIREMENTS_NOT_SPECIFIED`, `HOST_EVALUATOR_NOT_NAMED`, `HOST_EVALUATOR_NOT_REGISTERED`, `HOST_EVALUATOR_THREW`, `HOST_EVALUATOR_MALFORMED`) are unchanged and distinct from this proposed vocabulary.

## 9. Explicit gate dependencies and non-goals

[APPROVED unless tagged otherwise]

* The immutable v1.5 registry cannot be overwritten, patched on loading, or silently corrected. All 35 D-005 domains retain the canonical `domainBasis` blocker (`CONDITIONAL_UNVERIFIED` → `domainBasis = null`) and are not accounting-eligible under the Phase 1b guard. Future production selection requires a separately reviewed, versioned registry reconciliation or an equivalent explicitly approved trusted-authority revision. A host-rule sidecar alone does not satisfy the G2 G3 domain guard. [PROPOSED wording; the constraint itself is [APPROVED].]
* `PUBLISHED_FACTS` source verification alone is not a `COMPLETE_MECHANIC`, a certified evaluator, a selectable record or a Foundry-tested feature.
* A `legal` item-host diagnostic must never be represented as a `runtimeSelectable` decision; G2 continues to require host `MECHANIC_SPECIFIED`, a named approved evaluator, a certified install procedure and effect requirements.
* No default stacking maximum. Preserve `stackingPolicy: UNVERIFIED` and `maxPerHost: null`. Extra Power Source repeatability and Memory Upgrade replacement are source facts, not new enum defaults.
* No Foundry-wired code, actor or Item mutation, imports from `data/audits`, runtime loader, command bus, workbench, effects projection, credit transaction, G4–G9 advancement, or merge in this design checkpoint.

## 10. Proposed implementation sequence (each step separately authorized, same #1057 branch) [PROPOSED]

The proposal's step labels differ from this repository's checkpoint history; the mapping is given to avoid confusion.

| Proposal step | Content | State |
| --- | --- | --- |
| T4a | Owner design approval; documentation-only version of the design on #1057 | **This document** (principles approved; engineering details awaiting approval). |
| T4b | Read-only data-capability census; producer-side normalization / migration proposal | **Done** (`d-005-t4-item-fact-capability-census.md`, CI-verified at `c9c56f22`). |
| T4c | Structured rules artifact: the 35 typed, provenance-bound predicate sets as a new schema / sidecar, without editing registry v1.5 or the `PUBLISHED_FACTS` records; one-for-one and mutational tests; still no evaluator or runtime loading | **Not authorized.** |
| T4d | Offline evaluator and adapter: pure, read-only predicates using only certified Item facts and test fixtures; wired into G3 only behind existing trust gates; no selection or executor | **Not authorized.** |
| Later gates | Versioned canonical domain / page / stacking reconciliation, D-014 installation, executable effects, G8 loader, G6 executor, G7 Foundry integration, G9 cutover | **Not authorized.** |

## 11. Proposed future acceptance tests [PROPOSED]

* **Identity:** all 35 source-spec links match the 35 typed ids, none extra, missing or duplicate; all 19 SUPPORTED and 16 CONDITIONALLY SUPPORTED verdicts preserved.
* **Domain separation:** weapon / armor / equipment siblings are not interchangeable; `Item.type` must match the typed id's domain; no parent-only lookups.
* **Missing data:** missing `system.size`, a defaulted `Small`, an absent droid status, missing weight, missing power information all yield `not_established` where relevant — never true / false by omission.
* **Confirmed failure:** a nondroid-required upgrade on an affirmatively converted droid → `illegal` with evidence; a non-matching power supply → `illegal` with evidence.
* **Confirmed success:** an Item with a proven qualifying power source passes only the host-prerequisite check, never installation approval; source-certified category and other gates remain separate.
* **Phase separation:** a no-gauntlet Electrograpple host may still pass physical host eligibility while its use stays unavailable; a contents-free Secret Compartment need not fail the payload test merely because no payload is supplied.
* **Size semantics:** Dual Gear allows equal size (if physically compatible); Secret Compartment rejects an equal-size payload; Storage Capacity rejects an equal-size payload and a total weight equal to the host's.
* **Robustness:** derived defaults, unsupported aliases and contradictory sources cannot yield a positive verdict; a malformed or throwing evaluator returns `not_established`.
* **Existing invariants:** 186 / 232 / 231 / 49; zero selectable; zero implementation flags; unchanged registry hash and manifest, status ledger, decisions register and specification records; deterministic generator `--check` / `--validate`, the four modification tests and the rolling suite pass.

## 12. Silverplate and Spring Loaded effect text

The committed source-review document records that the exact Quick Draw-related benefit of Silverplate and the exact action for Spring Loaded were **not part of the supplied host findings** and are not paraphrased there; the committed records say so. The proposal refers to separately reviewed printed p. 42 statements for these entries (an object-DR amount and maximum, a Quick Draw action frequency, and an action type for presenting a Spring Loaded item).

These statements are **not recorded in the committed transcription or in any committed record**, so this document does not restate or adopt them, and they carry no authority here. The host-eligibility scope excludes these effects regardless. If they are to be used, they must first be recorded in the source-review document / rules register through the normal source-verification route, and any executable treatment belongs to a later, separately approved effects specification. They are not unspecified in the sourcebook — they are unspecified in the repository's committed source-review record.

## 13. Cross-reference to the T4b census [CENSUS]

The census (`d-005-t4-item-fact-capability-census.md`) is unchanged. Its findings bear on the proposal as follows; none is resolved by assumption.

| Proposal assumption | Census result |
| --- | --- |
| Weapon `ammunition.type` can supply a power-source fact after a reviewed mapping | Explicit on 203 / 203 but names ammunition, not power supply; mapping unreviewed (`AMBIGUOUS_MAPPING`). |
| `capabilities.computerIntelligence` can supply an Intelligence score for compatible producers | 5 of 142 equipment records; one contradictory; none for weapons / armor (`INCOMPLETE_COVERAGE`). |
| `capabilities.oneHandedOperation` can supply one-handed use | 1 of 142; different from `handheld` (13); weapon one-/two-handed data are strings with split spellings (`INCOMPLETE_COVERAGE`, `AMBIGUOUS_MAPPING`). |
| An explicit, vetted `size` exists to compare | Absent on all weapons and armor; indistinguishable from the default on 125 of 142 equipment records (`DERIVED_OR_DEFAULTED`, `NOT_REPRESENTED`). |
| Weight is available with provenance | Present everywhere but zeros are indistinguishable from coerced defaults; no unit field. |
| Droid status, restrictable function, remote activation, containment capacity, added-item relationship can be read | None has a structured Item-level representation (`NOT_REPRESENTED`). |
| Installed-upgrade identities | The V2 instance list is already read by G3 (0 pack records; written at runtime). |

Consequence: for most of the 15 mappings in §7, no trusted fact exists today from which `legal` or `illegal` could be derived; the fail-closed result would be `not_established`. This does not change any rule; it records the state of the data.

## 14. Decisions awaiting the project owner

1. Approve, revise or reject each [PROPOSED] item: the schema id and structure (§5), the fact families and their representations (§6), the 15-row predicate mappings (§7), the evaluator I/O and rule 6 evidence standard (§8), and the reason-code vocabulary (§8).
2. Whether a proven failed requirement may yield `illegal` while other facts remain unknown (P2 detail).
3. Whether `not_established` is surfaced as "GM review required" and whether a structured GM attestation protocol, with its permission model and revocation rules, is to be designed (P1, P3 detail).
4. Mappings the census marks ambiguous: weapon `ammunition.type` → power supply; `computerIntelligence` alone → "has an Intelligence score"; `handheld` / `oneHandedOperation` → one-handed use; whether item-level droid state is in scope.
5. Whether and how defaulted / absent size, weight and capacity data are to be enriched, and by what authorized data task.
6. How the recorded Silverplate / Spring Loaded p. 42 statements enter the source record (§12).
7. The registry reconciliation route for the 35 `CONDITIONAL_UNVERIFIED` domains (§9).

## 15. Non-effects

No registry, manifest, specification record (111), status ledger, generated runtime, decisions-register row, production code, Item model, compendium record, test, the committed T4b census, or `PINNED_SCOPE_SHA256` is changed by this document. No `COMPLETE_MECHANIC`, structured executable predicate, adapter, evaluator, item-data migration, D-014, or G4–G9 work is begun. 0 runtime-selectable.

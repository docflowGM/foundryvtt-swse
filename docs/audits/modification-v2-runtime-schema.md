# SWSE V2 Modification Runtime Schema and Generator (G2)

**Gate:** G2 of the approved replacement architecture (`modification-v2-replacement-architecture.md`, merged in PR #1039). **Offline and read-only with respect to Foundry gameplay.** Nothing under `scripts/` reads any file described here; the runtime loader is gate G8 and needs its own independent approval. The immutable v1.5 registry, its manifest and Phase 1a are untouched.

## 1. Files

| File | Role | Written by |
|---|---|---|
| `data/audits/modification-rolling-authority-v1.5.json` (+ manifest) | Immutable research source (G1) | nobody |
| `tools/validate-modification-registry.mjs` | Trusted offline producer: the registry bytes must pass G1 validation before anything is derived | existing (G1) |
| `tools/lib/modification-snapshot-producer.mjs` | **Trusted offline producer.** Runs the G1 validator on the exact bytes and mints the only snapshot handle the derivation accepts (section 2.1). Receives bytes, never paths | G2 |
| `tools/lib/modification-runtime.mjs` | Pure derivation, input validation and V10′ validation. No filesystem, no Foundry | G2 |
| `tools/build-modification-runtime.mjs` | CLI: write, `--check`, `--validate`. Writes only the one generated file | G2 |
| `data/modifications/runtime-definitions-v1.5.json` | **Generated** runtime definitions (186 records, 232 typed domain definitions) | generator |
| `data/modifications/status-ledger-v1.json` | Hand-maintained: register blockers, implementation evidence, selectability approvals | people |
| `data/modifications/specification-records-v1.json` | Hand-maintained: mechanic specifications | people / reviewed PRs |
| `tests/modification-runtime-generator.test.mjs` | 53 checks with independent literals plus fail-closed mutation tests | G2 |

CI (`rolling-system-validation.yml`) runs `--check` and `--validate`; `tests/*.test.mjs` is discovered by the rolling runner.

## 2. Trusted snapshot boundary (2.1)

`deriveRuntime()` and `validateRuntime()` accept registry data **only** as a handle returned by `produceTrustedSnapshot()`. The handle is deep-frozen and branded in a module-private `WeakSet`; a hand-built object, a clone, a JSON round trip, a spread copy or a caller-supplied "validation status" is rejected with `UNTRUSTED_SNAPSHOT`. The handle binds the parsed registry to the same bytes the G1 validator accepted: version, SHA-256 and byte length (recomputed from those bytes), the validator identity (name and approved registry version) and the approved known deviations that were matched. The generated header records the registry binding (version, SHA-256, byte length) and the validator identity, and V10′ re-checks them. The derivation module imports only the brand check, no filesystem. The G8 runtime-loader boundary is unchanged.

## 3. Schema `swse.modification.runtime/1`

Header: `schema`, `generator{name,version}`, `registry{version,sha256,byteLength}`, `validator{name,approvedRegistryVersion,matchedKnownDeviations}`, `inputs{statusLedgerSha256,specificationRecordsSha256}`, `counts`, `recordsSha256`, `notice`. The hashes inside the file are **self-attesting provenance, not an integrity anchor**; the anchor outside the file is a G8 deliverable (architecture 4.5).

Record (one per registry definition, registry order): `definitionId` (parent canonical id), `name`, `registry{version,sha256,pointer}`, `excluded`, `provenance{source,sourceFamily,sourceRole,tableCertification,mechanicalCertification,currentStatus,audit}` (verbatim), `display{summary,availability}` (verbatim), `slotCost.registry` (verbatim), `price{kind,registry}` (`kind` is the registry type; `not_stated` becomes `unknown`, never a number), `eligibility` (verbatim), `procedures`, and `domains`.

Typed domain definition under `domains.<weapon|armor|equipment>` (the unit of certification): `typedDefinitionId` (= parent id + `::` + domain, distinct from `definitionId`), `candidate`, `slotPool`, `slotCost.certification{certified,reasons}` (Phase 1b 6.2 predicate), `applicability{registryValue,domainBasis,hostRequirementsSpecified,hostEvaluator,hostEligibility}`, `accounting{eligible,reasons}`, `effects{operations,registryEffectStatus,registryConsumerStatus,automation:"none"}`, `status.components`, and **`runtimeSelectable`**. There is no parent-level selectable flag; the validator rejects one.

Refinement of the architecture's sketch: the slot-cost *certification* is per typed domain (the slot pool is per domain), while the parent keeps only the verbatim registry slot cost.

## 4. Per-component status

Components: `cost`, `description`, `hostPrerequisites`, `executableEffect`, `installProcedure`. Each carries `SOURCE_VERIFIED, DATA_RECONCILED, MECHANIC_SPECIFIED, IMPLEMENTED, OFFLINE_TESTED, FOUNDRY_TESTED`, `pendingSource[]` and `deferred[]` (register ids).

| Component | `SOURCE_VERIFIED` derived from | Otherwise |
|---|---|---|
| `cost` | Phase 1b 6.2 slot-cost certification for that typed definition **only** (a specification can never set it) | false |
| `description` | registry `mechanicalCertification === EFFECTS_CERTIFIED` | false |
| `executableEffect` | typed `effectStatus` begins `EFFECTS_SOURCE_VERIFIED` (source-verified text; not implemented) | false |
| `hostPrerequisites`, `installProcedure` | **nothing in the registry**; only a valid specification record | false |

`DATA_RECONCILED` is true for every generated component (it means "equals the registry", enforced by `--check`). `MECHANIC_SPECIFIED` comes only from a specification record; `IMPLEMENTED`, `OFFLINE_TESTED`, `FOUNDRY_TESTED` only from ledger implementation entries (ordering `FOUNDRY_TESTED ⇒ OFFLINE_TESTED ⇒ IMPLEMENTED ⇒ MECHANIC_SPECIFIED`, none while a blocker is open, `FOUNDRY_TESTED` needs recorded integration-route evidence). `pendingSource[]` and `deferred[]` come only from ledger blockers, whose register ids and classifications are checked against `swse-rules-decisions-pending.md`.

## 5. Specification records

A record names a typed definition and one component, with `basis` `PUBLISHED_UNAMBIGUOUS` (explicit, verified, unambiguous published rule) or `OWNER_RULING` (needs `ownerRulingRef`), plus `publication{bookId,title,printedPage,tableOrSection}`, `evidence`, `verification: SOURCE_VERIFIED`, `behavior`, `authoredBy`. A record is rejected while a blocker (pending or deferred) is open for that component. Records follow normal independent review; they do not require individual owner approval. **76 exist** (D-001 resolution: `installProcedure` for the Scum and Villainy Tables 2-3/2-4/2-5 upgrade options with a fixed printed upgrade-point value, from printed page 39; see `d-001-install-remove-pdf-verification.md`). They verify one component only; nothing is selectable.

## 6. `runtimeSelectable` (architecture 3.4)

True only if the ledger has a `selectable` entry **and** that typed definition independently meets: cost, description, hostPrerequisites and installProcedure source-verified with no open blockers; host **requirements specified** (a hostPrerequisites specification) **and** a named, offline-tested host evaluator recorded on the selectable entry; an installProcedure specification; any claimed effect specified, implemented and offline-tested; and installProcedure `FOUNDRY_TESTED`. A ledger entry whose conditions are unmet **fails generation** (`SELECTABLE_CONDITIONS_UNMET`) rather than being ignored. Today nothing meets them, so `runtimeSelectable` is false for all 232.

### 6.0 Canonical non-installability guard (final review correction)

A ledger and specification set, however complete, can never override what the canonical registry establishes. `unmetSelectableConditions()` receives facts computed **from the registry definition only** (`selectabilityFacts()`), never from a runtime record, and refuses selection unless all hold:

| Guard | Refused when |
|---|---|
| G1 | the parent is `EXCLUDED_SCOPE` |
| G2 | the typed definition is not an installable-upgrade candidate; the `temporary_talent_actuator_not_installed_upgrade` role can never be installed |
| G3 | the intended domain is not source-certified (`domainBasis` is null): a specification cannot certify a domain |
| G4 | the printed slot cost is not certified by the Phase 1b predicate (fixed, general pool, table-verified). A `cost` specification is rejected outright for an uncertified cost (`SPEC_CANNOT_OVERRIDE_COST_CERTIFICATION`) and never sets `cost.SOURCE_VERIFIED`; conditional or special-pool handling needs its own explicitly approved model, not this predicate |
| G5 | the price is unknown (`not_stated`). Handling an unpriced modification is register D-006, an owner decision; G2 does not let any lift row or specification authorize it |

V10′ re-derives these facts from the registry, so a hand-edited runtime file that forges status flags, evaluators or `runtimeSelectable` is still rejected. Consequence measured on v1.5: no multi-domain definition passes every guard in any domain, so the first selectable definitions will be single-domain accounting-eligible ones, and only after the full install chain exists.

### 6.1 Four separate things (review correction)

| Concept | Where it lives | Established by |
|---|---|---|
| Certified domain applicability | `applicability.registryValue`, `domainBasis` | registry vocabulary (Phase 1b 6.3) |
| Specified host requirements | `applicability.hostRequirementsSpecified`, component `hostPrerequisites` | a specification record |
| Individual Item eligibility | **not in this data**; `applicability.hostEligibility` is always `not_established` | evaluated at plan time (G3/G4) from certified facts about the actual Item; a V10′ failure (`HOST_ELIGIBILITY_ESTABLISHED_FORBIDDEN`) if any record claims otherwise |
| Runtime selectability | `domains.<d>.runtimeSelectable` | the conditions above |

`applicability.hostEvaluator` records only the name of the evaluator a selectable entry relies on; G3/G4 must verify it exists and works. G2 refines architecture 3.4 condition 2 accordingly: "host eligibility established" becomes "host requirements specified plus a certified per-Item evaluator", because a static record cannot prove that any given Item is a legal host.

## 7. Blockers cannot be removed by omission

Each open register entry that blocks registry definitions carries a machine-readable **Ledger scope** row (component plus `definitions=ALL` optionally narrowed by `except=` parent ids, a list of parent definition ids, or `slotPools=`; with `except=`, every definition not named, including any added later, stays blocked). The generator requires the ledger to carry **exactly** that scope for every open entry:

- missing coverage → `BLOCKER_REMOVED_WHILE_REGISTER_OPEN`; extra coverage → `BLOCKER_OUTSIDE_REGISTER_SCOPE`; a blocker bound to an entry without a scope row → `BLOCKER_WITHOUT_REGISTER_SCOPE`;
- the **only** way to lift a blocker is an appended **Blocker lifted** row in the (append-only) register: `source=` and `evidence=` for `PENDING_SOURCE_VERIFICATION`, `owner-ruling=` for `DEFERRED_RULES_REVIEW` (both if the entry carries both). An incomplete row → `REGISTER_LIFT_INVALID`; a lifted entry still present in the ledger → `BLOCKER_FOR_LIFTED_REGISTER_ENTRY`.

This is a mechanical check that the ledger cannot contradict the register; whether a lift row's evidence is adequate remains a matter for independent review. Today D-001 is the only lifted entry (printed page 39 verified); D-013 now blocks `installProcedure` for the 156 typed definitions it does not govern. Regression tests prove that removing D-001 (or any other scoped blocker, wholly or partially) cannot authorize specification, implementation or selectability; the only passing promotion fixtures are synthetic registers that mark entries lifted.

## 8. Measured output (v1.5)

186 records; 232 typed domain definitions; 231 upgrade candidates (the temporary talent actuator is excluded); 84 certified slot costs, of which **49 are accounting-eligible** (41 Scum weapon/armor `table-category`, 8 KOTOR `rules-certified`) — the other 35 are Table 2-3 universal pairs whose domain applicability is `CONDITIONAL_UNVERIFIED`; 76 `installProcedure` components specified (D-001), none implemented, tested or selectable.

## 9. V10′ (generated-data validator)

Checks: schema id and registry binding; records hash; one record per registry definition in order with the right pointer; verbatim fields equal the snapshot; typed ids equal parent id + `::` + domain and are unique; no parent-level selectable flag; per-domain selectable is boolean and satisfies 3.4; `automation` is `none`; flag ordering and no flag with an open blocker; every register id exists; and a full deterministic regeneration must equal the committed file byte for byte.

## 10. Authority classification (G2)

| Path | Class | Note |
|---|---|---|
| `data/modifications/runtime-definitions-v1.5.json` | GENERATED, research-only, not loaded by runtime | Derived solely from the validated registry snapshot, the ledger and specification records; regenerated, never hand-edited; the G8 loader and packaging allowlist (architecture 4.5) are not part of G2 |
| `data/modifications/status-ledger-v1.json`, `specification-records-v1.json` | HAND-MAINTAINED INPUT | Reviewed in PRs; validated by the generator |

The Phase 5C classification guard covers feat/weapon corpora by path and does not include these files; a test asserts no `scripts/` file references them.

## 11. Not done in G2

No loader, planner, effect projection, workbench, cutover, packager change, integrity pin, or isolated Foundry test route. No rule decided; no specification record written; source examination of D-001 (*Scum and Villainy* p. 39) remains the next rules-research step.

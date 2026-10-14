# SWSE V2 Modification Runtime Schema and Generator (G2)

**Gate:** G2 of the approved replacement architecture (`modification-v2-replacement-architecture.md`, merged in PR #1039). **Offline and read-only with respect to Foundry gameplay.** Nothing under `scripts/` reads any file described here; the runtime loader is gate G8 and needs its own independent approval. The immutable v1.5 registry, its manifest and Phase 1a are untouched.

## 1. Files

| File | Role | Written by |
|---|---|---|
| `data/audits/modification-rolling-authority-v1.5.json` (+ manifest) | Immutable research source (G1) | nobody |
| `tools/validate-modification-registry.mjs` | Trusted offline producer: the registry bytes must pass G1 validation before anything is derived | existing (G1) |
| `tools/lib/modification-runtime.mjs` | Pure derivation, input validation and V10′ validation. No filesystem, no Foundry | G2 |
| `tools/build-modification-runtime.mjs` | CLI: write, `--check`, `--validate`. Writes only the one generated file | G2 |
| `data/modifications/runtime-definitions-v1.5.json` | **Generated** runtime definitions (186 records, 232 typed domain definitions) | generator |
| `data/modifications/status-ledger-v1.json` | Hand-maintained: register blockers, implementation evidence, selectability approvals | people |
| `data/modifications/specification-records-v1.json` | Hand-maintained: mechanic specifications | people / reviewed PRs |
| `tests/modification-runtime-generator.test.mjs` | 35 checks with independent literals plus fail-closed mutation tests | G2 |

CI (`rolling-system-validation.yml`) runs `--check` and `--validate`; `tests/*.test.mjs` is discovered by the rolling runner.

## 2. Schema `swse.modification.runtime/1`

Header: `schema`, `generator{name,version}`, `registry{version,sha256}`, `inputs{statusLedgerSha256,specificationRecordsSha256}`, `counts`, `recordsSha256`, `notice`. The hashes inside the file are **self-attesting provenance, not an integrity anchor**; the anchor outside the file is a G8 deliverable (architecture 4.5).

Record (one per registry definition, registry order): `definitionId` (parent canonical id), `name`, `registry{version,sha256,pointer}`, `excluded`, `provenance{source,sourceFamily,sourceRole,tableCertification,mechanicalCertification,currentStatus,audit}` (verbatim), `display{summary,availability}` (verbatim), `slotCost.registry` (verbatim), `price{kind,registry}` (`kind` is the registry type; `not_stated` becomes `unknown`, never a number), `eligibility` (verbatim), `procedures`, and `domains`.

Typed domain definition under `domains.<weapon|armor|equipment>` (the unit of certification): `typedDefinitionId` (= parent id + `::` + domain, distinct from `definitionId`), `candidate`, `slotPool`, `slotCost.certification{certified,reasons}` (Phase 1b 6.2 predicate), `applicability{registryValue,domainBasis,hostEligibility}`, `accounting{eligible,reasons}`, `effects{operations,registryEffectStatus,registryConsumerStatus,automation:"none"}`, `status.components`, and **`runtimeSelectable`**. There is no parent-level selectable flag; the validator rejects one.

Refinement of the architecture's sketch: the slot-cost *certification* is per typed domain (the slot pool is per domain), while the parent keeps only the verbatim registry slot cost.

## 3. Per-component status

Components: `cost`, `description`, `hostPrerequisites`, `executableEffect`, `installProcedure`. Each carries `SOURCE_VERIFIED, DATA_RECONCILED, MECHANIC_SPECIFIED, IMPLEMENTED, OFFLINE_TESTED, FOUNDRY_TESTED`, `pendingSource[]` and `deferred[]` (register ids).

| Component | `SOURCE_VERIFIED` derived from | Otherwise |
|---|---|---|
| `cost` | Phase 1b 6.2 slot-cost certification for that typed definition | false |
| `description` | registry `mechanicalCertification === EFFECTS_CERTIFIED` | false |
| `executableEffect` | typed `effectStatus` begins `EFFECTS_SOURCE_VERIFIED` (source-verified text; not implemented) | false |
| `hostPrerequisites`, `installProcedure` | **nothing in the registry**; only a valid specification record | false |

`DATA_RECONCILED` is true for every generated component (it means "equals the registry", enforced by `--check`). `MECHANIC_SPECIFIED` comes only from a specification record; `IMPLEMENTED`, `OFFLINE_TESTED`, `FOUNDRY_TESTED` only from ledger implementation entries (ordering `FOUNDRY_TESTED ⇒ OFFLINE_TESTED ⇒ IMPLEMENTED ⇒ MECHANIC_SPECIFIED`, none while a blocker is open, `FOUNDRY_TESTED` needs recorded integration-route evidence). `pendingSource[]` and `deferred[]` come only from ledger blockers, whose register ids and classifications are checked against `swse-rules-decisions-pending.md`.

## 4. Specification records

A record names a typed definition and one component, with `basis` `PUBLISHED_UNAMBIGUOUS` (explicit, verified, unambiguous published rule) or `OWNER_RULING` (needs `ownerRulingRef`), plus `publication{bookId,title,printedPage,tableOrSection}`, `evidence`, `verification: SOURCE_VERIFIED`, `behavior`, `authoredBy`. A record is rejected while a blocker (pending or deferred) is open for that component. Records follow normal independent review; they do not require individual owner approval. **None exist yet.**

## 5. `runtimeSelectable` (architecture 3.4)

True only if the ledger has a `selectable` entry **and** that typed definition independently meets: cost, description, hostPrerequisites and installProcedure source-verified with no open blockers; host eligibility established (a hostPrerequisites specification); an installProcedure specification; any claimed effect specified, implemented and offline-tested; and installProcedure `FOUNDRY_TESTED`. A ledger entry whose conditions are unmet **fails generation** (`SELECTABLE_CONDITIONS_UNMET`) rather than being ignored. Today nothing meets them, so `runtimeSelectable` is false for all 232.

## 6. Measured output (v1.5)

186 records; 232 typed domain definitions; 231 upgrade candidates (the temporary talent actuator is excluded); 84 certified slot costs, of which **49 are accounting-eligible** (41 Scum weapon/armor `table-category`, 8 KOTOR `rules-certified`) — the other 35 are Table 2-3 universal pairs whose domain applicability is `CONDITIONAL_UNVERIFIED`; 0 specified, implemented, tested or selectable.

## 7. V10′ (generated-data validator)

Checks: schema id and registry binding; records hash; one record per registry definition in order with the right pointer; verbatim fields equal the snapshot; typed ids equal parent id + `::` + domain and are unique; no parent-level selectable flag; per-domain selectable is boolean and satisfies 3.4; `automation` is `none`; flag ordering and no flag with an open blocker; every register id exists; and a full deterministic regeneration must equal the committed file byte for byte.

## 8. Authority classification (G2)

| Path | Class | Note |
|---|---|---|
| `data/modifications/runtime-definitions-v1.5.json` | GENERATED, research-only, not loaded by runtime | Derived solely from the validated registry snapshot, the ledger and specification records; regenerated, never hand-edited; the G8 loader and packaging allowlist (architecture 4.5) are not part of G2 |
| `data/modifications/status-ledger-v1.json`, `specification-records-v1.json` | HAND-MAINTAINED INPUT | Reviewed in PRs; validated by the generator |

The Phase 5C classification guard covers feat/weapon corpora by path and does not include these files; a test asserts no `scripts/` file references them.

## 9. Not done in G2

No loader, planner, effect projection, workbench, cutover, packager change, integrity pin, or isolated Foundry test route. No rule decided; no specification record written; source examination of D-001 (*Scum and Villainy* p. 39) remains the next rules-research step.

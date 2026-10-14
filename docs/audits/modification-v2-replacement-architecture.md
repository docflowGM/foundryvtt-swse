# SWSE V2 Modification System — Replacement Architecture and Gate-Plan Amendment (proposal, revision 1)

**Status:** design package for independent architectural review and owner approval. **Documentation only. No code, data, catalog, pack, engine, template, style or gameplay change accompanies this document.** Nothing here is authorized for implementation until approved.
**Baseline:** `origin/main` `23f6ca4148a6829f8cfdd727987a015c4977408a` (G1 merged: PR #1038).
**Companion documents:** `docs/audits/modification-v2-legacy-inventory.md` (legacy inventory) and `docs/audits/swse-rules-decisions-pending.md` (append-only rules decision register, seeded here).
**Governing inputs:** the owner's "V2 Modification System — Architectural Direction Addendum" (clean replacement), the "No Unauthorized Rules Decisions" addendum, the merged Phase 1a contract (revision 6, D1–D17), the merged Phase 1b contract (revision 3), and G1 (immutable v1.5 snapshot, manifest, validator).
**Labels:** **PROPOSAL** = my drafting, needs approval. **RETAINED / REPLACED / ELIMINATED** describe what happens to an existing requirement. **ENGINEERING** = an implementation choice I may make. **RULES** = a question only the owner may settle (register entry).

This package replaces a goal ("connect two modification systems through a crosswalk") with a different goal ("one canonical V2 modification system"). It keeps every rules-certification safeguard and removes only the compatibility and migration requirements the owner removed.

## 1. The owner's decision and what it changes

**Decision:** replace the legacy modification system with one unified V2 implementation. Existing prerelease character modification data does not need to be migrated; legacy identifiers do not need permanent support; no permanent legacy-to-canonical crosswalk is wanted; duplicate catalogs and obsolete implementations are to be retired.

**Removed requirements (no longer goals):** preserving installed modifications on existing characters; maintaining legacy modification identifiers; supporting obsolete save formats; migration scripts for old characters; maintaining duplicate catalogs after cutover; permanent translation layers.

**Unchanged requirements (still binding):**
- Rules-certification standards. A source-verified definition is not executable; a known cost is not legal installation; a description does not authorize an invented effect.
- The mandatory-deferral policy and the append-only decision register.
- `ActorEngine` and `TransactionEngine` mutation/credit authority; existing combat math; `ModifierEngine`; no second modifier-application authority, transaction ledger, combat calculator or rules resolver.
- Weapon, armor and equipment domain separation; separate slot pools where the rules separate them.
- The trusted-snapshot and provenance requirements; the Phase 1a invariants until an approved replacement supersedes them; the independent approval of the runtime loader (G8).
- Explicit owner authorization for deleting legacy code or resetting any character or actor data. This package authorizes neither.

**What "clean replacement" does not mean:** the replacement is not a reason to delete legitimate functionality. Every legacy capability that corresponds to an authoritative rule is rebuilt or explicitly deferred (register) before its implementation is retired.

## 2. Architectural amendment to the approved gate plan

The merged Phase 1b contract (`docs/audits/modification-canonical-registry-phase-1b-contract.md`) assumed coexistence with the legacy system through a persistent adapter and crosswalk. The table states, section by section, what survives. No requirement is silently dropped.

### 2.1 Contract sections

| Phase 1b section | Requirement | Disposition | Notes |
|---|---|---|---|
| 2 | Immutable v1.5 snapshot, hash/manifest, expected counts, preserved verbatim, not a runtime directory | **RETAINED** | Done in G1. |
| 2.1 | 232 typed versus 231 eligible candidates counting rule | **RETAINED** | Asserted by the G1 validator; the runtime generator reuses the rule. |
| 2.4 | Phase 1a baselines authoritative (weapon 1, equipment 1, light 1, medium 2, heavy 3) | **RETAINED** | The registry never supplies or overrides a baseline. |
| 3 (V1–V9) | Machine validation, exact known deviations, pinned paths, fail-closed | **RETAINED** | Done in G1. |
| 3 (V10) | Crosswalk validation | **ELIMINATED** | There is no permanent crosswalk. Replaced by **V10′**: validation of the *generated runtime definitions* (section 4.4). |
| 4.1 | Validated snapshot handle from a trusted producer; caller-supplied status objects never trusted | **RETAINED** | Becomes the input to the generator (offline) and to the loader (G8). |
| 4.2 | Adapter queries (`getDefinition`, `getTypedDefinition`, `resolveCatalogKey`, `getSlotCost`, `getPrice`, `getCertification`) | **REPLACED** | Catalog-key resolution is eliminated. The same facts are exposed as fields of runtime definitions (section 3) and read through the catalog (section 5). |
| 4.3 | No accidental runtime dependency on `data/audits/`; runtime loader is a separate gate | **RETAINED** (G8) | The loader reads generated runtime data, never `data/audits/`. |
| 5 | Identity crosswalk (`identical`/`subset`/…, uniqueness, evidence) | **ELIMINATED** as a permanent artifact | Replaced by canonical definition ids used directly, and by temporary offline research mappings (section 2.3). |
| 6.1–6.5 | Four independent results; slot-cost predicate; `TABLE_CATEGORY`/`RULES_CERTIFIED` domain basis; blocked categories; non-implication; standing rules; page attestation (O9) | **RETAINED**, relocated | Evaluated once at generation and recorded as fields; re-checked by the slot closure at runtime. |
| 6.6 | Interface to Phase 1a (`createCertifiedDefinitionLookup`) | **RETAINED** in simplified form | The closure is keyed by canonical typed definition id, not a catalog key (section 5.3). |
| 7 | Legacy catalog convergence map | **REPLACED** | By the full legacy inventory and the dependency-ordered replacement plan. |
| 8 | Gates G1–G8 | **REPLACED** | By the revised plan (section 7). G8's approval boundary is preserved. |
| 9 | "Existing owned Items keep their `flags.foundryvtt-swse.customization.*` and legacy mirrors untouched" | **ELIMINATED** | Owner removed backward compatibility with prerelease characters. Destructive operations still need explicit authorization. |
| 9 | `ActorEngine`/`TransactionEngine`, combat math, domain separation | **RETAINED** | |
| 10 | Invariants J1–J21 | **See 2.2** | |
| 11 | Test contract | **See 2.2 and section 8** | |
| 12 | Decisions O1–O11 | **RETAINED** where they concern certification; crosswalk decisions (O6) **ELIMINATED** | O1 (Markdown byte verification) is waived by the owner. |

### 2.2 Invariants

| Invariants | Disposition |
|---|---|
| J1 (snapshot bytes immutable), J2 (no silent repair), J4 (slot cost certified only through the predicate), J5 (unknown price never `0`), J6 (nothing executable), J7 (pure, read-only, copies), J8 (domain separation), J10 (never throws), J11–J12 (validated handle, provenance from validated fields), J14 (four separate results), J15 (exact deviations), J16 (232/231 rule), J17 (no runtime path to `data/audits/`), J18 (baselines), J19–J21 (trust boundary, attestations, G8 ordering) | **RETAINED** |
| J3 (identity never by name; only `identical` crosswalk rows), J13 (crosswalk relations and uniqueness) | **REPLACED** by **J3′**: identity is the canonical definition id only; no component matches by name, key similarity or legacy key. |
| J9 (adapter imports no consumer; Phase 1a resolver imports no adapter) | **RETAINED** in spirit: the generator and loader import no consumer; the slot authority receives certified costs by injection and imports no catalog. |

### 2.3 Crosswalk policy under clean replacement

- No permanent crosswalk file, validator check or runtime lookup.
- The V2 system uses canonical definition ids directly. Legacy catalog keys have no runtime meaning after cutover.
- **Temporary research mappings** (legacy implementation record ↔ canonical definition) may be made *only* to understand legacy behavior, find duplicated or missing functionality, or plan deletions. They live in documents (for example an appendix of the inventory) or throwaway tooling, are never read by runtime code or by a generator, carry no authority, and are removed when they stop serving the replacement. A shared name is still not evidence of identity.

### 2.4 What remains of Phase 1a

Phase 1a (`ModificationSlotAuthority`, merged, unwired) remains the single slot authority and keeps all invariants I1–I24 and decisions D1–D17. Its legacy-evidence handling (D17: legacy structural reconciliation, legacy-only size increase) stays until cutover, because legacy-shaped data may still exist during development. After the owner authorizes cutover, a separate contract amendment removes the unreachable legacy-evidence paths. It is not removed earlier.

## 3. Canonical V2 runtime modification schema (PROPOSAL)

One record per registry definition (186 records), carrying domain-specific parts for weapon, armor and equipment. It is a *runtime projection of the registry*, never a second rules source.

```text
RuntimeModification  (schema id: swse.modification.runtime/1)
  id                    canonical definition id (registry `id`), the only identity
  name
  registry              { version, sha256, pointer }          provenance to the exact snapshot record
  provenance            { source{bookId,title,printedTablePage,rulesPage,tableId,section,...} verbatim,
                          sourceFamily, sourceRole,
                          tableCertification, mechanicalCertification,
                          audit{confidence, blockers[]} }
  display               { summary (registry text verbatim), availability }
  slotCost              { registryType, slots?, possibleCosts?, ruleCondition?, ...verbatim,
                          certification{ certified:boolean, reasons[] } }
  price                 tagged union mirroring registry `originalCost.type` verbatim;
                          unstated prices are { kind:"unknown" }, never a number
  eligibility           { prerequisites[], exclusions[], stackingPolicy, maxPerHost, applicabilityNotes } verbatim
  domains               { weapon?, armor?, equipment? }       only the typed domains the registry defines
      <domain>          { typedDefinitionId,
                          slotPool,                            registry slotPoolId (null when none)
                          applicability{ registryValue, domainBasis, hostEligibility:"not_established" },
                          accounting{ eligible:boolean, reasons[] },
                          effects{ operations[] verbatim, registryEffectStatus, automation:"none"|... } }
  procedures            ids of registry procedures that govern install/removal/specialist work
  status                { SOURCE_VERIFIED, DATA_RECONCILED, MECHANIC_SPECIFIED, IMPLEMENTED,
                          OFFLINE_TESTED, FOUNDRY_TESTED : each boolean, set independently,
                          deferred[] : register ids (DEFERRED_RULES_REVIEW) }
  runtimeSelectable     boolean (false for every record until the status ledger says otherwise)
```

### 3.1 Field semantics and certification rules

- **Verbatim fields** (`provenance`, `display`, `eligibility`, `slotCost` registry parts, `price` registry parts, `effects.operations`) are copied exactly. The generator never rewrites, rounds, defaults or "tidies" them.
- **Derived fields** are the only computed values, each from an exact rule in the Phase 1b contract:
  - `slotCost.certification.certified` — section 6.2 predicate: fixed integer cost, `general-upgrades` pool, table-verified evidence (or an approved page attestation, none exists), snapshot validated, not excluded scope, not the excluded `sourceRole`. `conditional`, `not_specified`, `socket_occupancy`, `special_allowance` and the like never certify.
  - `domains.<d>.applicability.domainBasis` — `rules-certified` for plain `RULES_CERTIFIED`; `table-category` for `TABLE_CATEGORY` (weapon and armor only); otherwise `null`. `CONDITIONAL_UNVERIFIED`, pending, out-of-scope and restricted variants stay blocked.
  - `domains.<d>.accounting.eligible` — true only when the cost is certified **and** the domain basis is non-null. It means "may be counted at its printed slot cost for an already-recorded installation" and nothing else. Measured on v1.5 this is 49 (definition, domain) pairs: 41 Scum (14 weapon, 27 armor) and 8 KOTOR (6 weapon, 2 armor). Table 2-3 universal rows stay blocked (register D-005).
  - `applicability.hostEligibility` is always `"not_established"`; `effects.automation` is always `"none"` in generated output.
- **Unknowns are values, not defaults.** A missing or unstated fact is `null`/`unknown` with a reason code. Nothing is coerced to `0`, `1`, `false` or an empty permission.
- **Slot pools stay separate.** A record keeps its registry pool (`general-upgrades`, `lightsaber-primary-crystal`, `lightsaber-accessory`, or none). Only `general-upgrades` is counted by the general slot authority; lightsaber pools remain uncertified (register D-011).
- **Research-only records are visible but inert.** All 186 records are generated, including the 58 pending-rules-text definitions, so players and GMs can read verified descriptions. A record with `runtimeSelectable: false` cannot be installed or applied.

### 3.2 The status vocabulary (kept independent)

| Flag | Meaning | Who may set it |
|---|---|---|
| `SOURCE_VERIFIED` | Published wording and provenance confirmed | Generated, from the registry's `tableCertification` / `mechanicalCertification` vocabulary |
| `DATA_RECONCILED` | The runtime record equals its registry source | Generated, and enforced by the `--check` CI guard; it says nothing about packs, catalogs or text elsewhere |
| `MECHANIC_SPECIFIED` | Intended mechanical behavior fully defined by an authoritative source or an owner ruling | **Not the generator.** Only an owner-approved specification record (section 4.3) |
| `IMPLEMENTED` | Code exists for the specified behavior | Implementation ledger, requires `MECHANIC_SPECIFIED` |
| `OFFLINE_TESTED` | Automated tests verify it | Implementation ledger, requires `IMPLEMENTED` |
| `FOUNDRY_TESTED` | Foundry v13 runtime test completed | Implementation ledger, requires `OFFLINE_TESTED` |
| `deferred[]` | Register entries (`DEFERRED_RULES_REVIEW`) blocking the record or part of it | Register |

A record with any non-empty `deferred[]` cannot reach `IMPLEMENTED` for the blocked part. A source-verified or data-reconciled record is never reported as implemented.

### 3.3 Installed state (ENGINEERING)

An installed modification is a small instance record on the host Item: `{ instanceId, definitionId (the typed definition id), domain }`, stored at the existing canonical path `flags.foundryvtt-swse.customization.installedUpgrades`. **No cost, effect value or rules result is stored on the instance**; they are derived from the catalog at read time. This removes the "recorded cost is a claim" conflicts, makes removal exact, and keeps Phase 1a's identity rule (merge only on equal instance id) working unchanged. Mirrors (`system.installedUpgrades`, `flags.swse.*`) are not written.

## 4. Deterministic registry-to-runtime transformation (PROPOSAL)

### 4.1 Pipeline

```text
immutable v1.5 JSON ──(G1 validator, trusted producer)──▶ validated snapshot handle
        │                                                         │
        │                                       transform(handle, statusLedger, specifications)
        ▼                                                         ▼
  data/audits/ (research, never loaded)        data/modifications/runtime-definitions-v1.5.json (generated, derived)
```

- **Input:** only a validated snapshot handle produced by the G1 validator's trusted producer (offline), plus two small hand-maintained inputs: the status ledger and the owner-approved specification records (4.3). Nothing else.
- **Output:** one generated file, with a header recording the registry version and SHA-256, the generator version, and the SHA-256 of the output body. No timestamps, no randomness, stable key and record order (registry order), canonical JSON serialization.
- **Location (ENGINEERING, needs approval):** `data/modifications/runtime-definitions-v1.5.json`. It is deliberately outside `data/audits/` (research, classified as historical evidence). It needs its own reviewed authority classification, as the G1 review requires for the runtime-ready representation.
- **Check mode:** `node tools/build-modification-runtime.mjs --check` regenerates in memory and fails if the committed file differs, like the repository's other generators (`build-*-production.mjs --check`). It is a CI step.

### 4.2 Non-promotion guarantees

The generator may *derive* the fields in 3.1 and *copy* everything else. It may not:
- set `MECHANIC_SPECIFIED`, `IMPLEMENTED`, `OFFLINE_TESTED` or `FOUNDRY_TESTED`;
- set `runtimeSelectable` to true unless a validated ledger entry says so;
- convert `conditional`, `not_specified`, unstated or non-credit values into numbers;
- merge records, rename ids, infer a domain from names, or read `existingCatalogKeys`;
- drop a record or a pending/excluded flag (all 186 appear; Droidification is flagged excluded);
- read anything under `scripts/`, any legacy catalog, any pack, or the Markdown.

### 4.3 Specification records and the status ledger (PROPOSAL, needs approval)

Two small, hand-maintained, version-pinned inputs keep the *rules decisions* and the *implementation facts* out of the generator:
- **Specification record** (owner-approved): names a definition id and one effect or procedure, states the specified behavior or cites the authoritative source, and carries the owner's approval reference. It is the only way a record's `MECHANIC_SPECIFIED` becomes true. If the specification depends on an unresolved question, the record cannot exist; the register entry stays open.
- **Status ledger**: per definition and per part, `IMPLEMENTED` / `OFFLINE_TESTED` / `FOUNDRY_TESTED` with the commit and test that justify them. The generator only validates it (ids exist, flags are monotone: `FOUNDRY_TESTED ⇒ OFFLINE_TESTED ⇒ IMPLEMENTED ⇒ MECHANIC_SPECIFIED`, no flag set on a record with a blocking deferral).

### 4.4 Validation of the generated file (V10′)

Replaces the crosswalk check: every record maps to exactly one registry definition and pointer; verbatim fields equal the snapshot; derived fields equal an independent recomputation; counts are exact (186 records, 232 domain entries, 231 eligible candidates, 49 accounting-eligible pairs); every `deferred[]` id exists in the register; no record claims a status the ledger does not support; the output hash matches. Tests assert these as independent literals.

## 5. Unified engine architecture (PROPOSAL)

One modification authority, composed of small single-purpose parts that call the engines the repository already has. No part mutates actors, moves credits, calculates attack/damage, or aggregates modifiers itself.

```text
Registry snapshot ─▶ generator ─▶ runtime definitions ─▶ ModificationCatalog (G8 loader, read-only, frozen)
                                                            │
        ┌───────────────────────────────────────────────────┼────────────────────────────┐
        ▼                                                   ▼                            ▼
ModificationSlotAuthority (Phase 1a)         ModificationPlanner (pure)          EffectProjection (computed)
 capacity, used, free, overflow                plan install/remove: blockers,        MECHANIC_SPECIFIED effects only,
 certified costs injected from catalog          deferrals, price, slot impact          delivered to existing authorities
                                                            │
                                                            ▼
                                            ModificationExecutor (thin)
                                  TransactionEngine (credits) + ActorEngine (owned-item state)
                                                            ▲
                                       CommandBus command ◀─┴─▶ V2 Workbench (Holopad surface)
```

### 5.1 Components and ownership

| Component | Responsibility | Reuses / defers to |
|---|---|---|
| **ModificationCatalog** | Read-only, frozen in-memory index of the generated definitions: by id, by domain, by family. No rules logic. Loading is the G8 gate. | The trusted-handle and provenance rules (G1) |
| **ModificationSlotAuthority** | The single capacity authority (exists). Fed certified costs from the catalog through the injected closure. | Phase 1a unchanged |
| **ModificationPlanner** (pure) | Builds an install or removal *plan*: the definition, price (tagged), slot impact (from the slot authority), the list of **blockers** (not selectable, host eligibility not established, unknown price, overflow, deferred mechanic, domain mismatch) and **deferrals** (register ids). A plan with a blocker cannot be executed. It decides nothing about rules it does not have. | Slot authority; host facts; legality services |
| **Legality / host facts** | Supplies *certified* host facts only (for example canonical weapon identity). Specialist procedures (Tech Specialist, Sith/Force Alchemy, Lightsaber construction, Biotech) keep their own legality and are refactored to read definitions from the catalog. Where evidence is missing the answer is "not established", never "allowed". | Existing legality services; `scripts/items/weapon-runtime/canonical-identity.js`; `AbilityEngine` for feat/talent prerequisites |
| **ModificationExecutor** (thin) | Applies an approved plan: credits through `TransactionEngine`, the instance record through `ActorEngine` owned-item helpers. Atomic: if any part fails the whole operation fails. | `TransactionEngine`, `ActorEngine` — no parallel ledger or mutation path |
| **EffectProjection** | Computes, never stores, the effect contributions of installed instances whose effects are `MECHANIC_SPECIFIED`: actor-level contributions as `ModifierEngine` sources; item-level contributions as inputs to the existing weapon/armor effective-profile code. Removal reverses automatically because nothing was written. Anything not specified is shown as description only. | `ModifierEngine`; `combat-roll-math.js`, `combat-stat-rules.js`, `weapon-runtime`; the three critical channels stay separate |
| **V2 Workbench** | One thin Holopad surface: shows verified descriptions, statuses (research-only badges), slot state, price, blockers and deferrals; asks the plan for previews; dispatches a `CommandBus` command. Targeted re-render, no actor update for UI-only state. | Existing shell surfaces and `CommandBus` |

### 5.2 How the old problems disappear

- Nine overlapping definition sources → one generated catalog. Slot arithmetic in six places → one authority. Three install paths → one planner/executor. Effects baked into Item fields and not reversed → computed projections. Heuristic eligibility and name regexes → certified host facts or "not established".
- Recorded costs and legacy mirrors → identity-only instance records.

### 5.3 Phase 1a interface under replacement

`certifiedDefinitionLookup(upgradeKey)` is fed by a closure over the catalog. In V2 the `upgradeKey` *is* the typed definition id, so the closure is a direct id lookup returning `{ definitionId, upgradeKey, certifiedCost, source: { ref, certification } }` only when `accounting.eligible` is true (otherwise `null`). `source.certification` is assembled from the validated snapshot fields; the domain basis appears as a token in it. No Phase 1a field changes and Phase 1a still imports nothing from the catalog.

### 5.4 What stays out of scope

Droid and vehicle modification, vehicle emplacements, and starship systems are untouched. Where a legacy file mixes them with item modification (`UpgradeService`, `customization-bay-app.js`) the file is split first, then the item part is replaced.

## 6. Legacy implementation inventory — summary

The full inventory (every relevant source file, template, style and data source, with importers, duplicates, certification state, owning V2 authority and disposition) is `docs/audits/modification-v2-legacy-inventory.md`. Headlines:

- **REPLACE** (superseded by V2 parts): the catalog (`upgrade-catalog.js`), slot engine, install/remove engine, workflow, safety engine, effect resolver, template engine, eligibility engine, cost engine, restriction model, `UpgradeService` item paths, `upgrade-app`, `gear-templates-engine`, the Workbench (3,684 lines) and the four item-data files plus gear templates.
- **REFACTOR**: structural change (strip stays deferred), item profile resolver (remove the name regex), Tech Specialist service (registry-driven; Superior Tech preserved, not expanded), `UpgradeCommands`, lightsaber construction (after the pack-generator trace), the customization bay (split droid/vehicle out), routers.
- **RETAIN**: `ModificationSlotAuthority`, the Holopad shell surfaces (re-pointed), `ActorEngine`, `TransactionEngine`, `ModifierEngine`, combat authorities, and Force Alchemy as a specialization (NEEDS-TRACE).
- **DELETE-CANDIDATE** (no static importer found; delete only after a dynamic-use check and owner authorization): `restriction-propagation-engine`, `phase-3-advanced-crystal-system`, `modification-intent-builder`, `blaster-customization-engine`, the unused barrels and shim apps, `data/gear-templates.json`, `data/upgrades/*.json`.
- **OUT-OF-SCOPE**: droid and vehicle engines, apps, data.

## 7. Revised gate plan and dependency-ordered replacement

### 7.1 Gates

G8 keeps its name and its independent approval. It is placed where it logically belongs: after the offline parts exist and before anything is wired into Foundry.

| Gate | Replaces | Content | Approval | Depends on |
|---|---|---|---|---|
| **G1** | — | Snapshot, manifest, validator | Done (merged) | — |
| **A0** | — | This amendment | Independent review and owner approval | G1 |
| **G2** | old G2 (adapter + crosswalk) | Runtime schema, deterministic generator with `--check` CI, generated definitions, trusted offline producer integration, status-ledger and specification-record validators, V10′, authority classification, register maintenance. **No loader, no consumer.** | Independent review | A0 |
| **G3** | old G3 (shadow comparison) | Pure offline parts: catalog read model (data passed in), planner, price resolution (tagged), the slot closure feeding Phase 1a, legality framework that fails closed. Offline tests. A throwaway, test-only comparison of legacy results against V2 results is allowed as a research aid (section 2.3). | Independent review | G2 |
| **G4** | old G4 + G5 (content corrections, eligibility) | Certified host-fact inputs (for example canonical weapon identity), strictly for rules that are specified. Upstream content corrections (Holo Converter, Halo Lamp, Manual Trigger, KOTOR accessory text, …) as separate producer-side PRs, each with its source. | Per PR; rules items to the register | G2 |
| **G5** | old G6 (effects) | Effect projection family by family, **only** for `MECHANIC_SPECIFIED` effects; everything else stays description-only. | Per family, with owner specifications | G3, owner specifications |
| **G8** | G8 | Runtime loader: production code loading the generated runtime definitions through the trusted boundary; proof that unvalidated or uncertified data cannot reach production; its own classification. | **Separate owner and independent approval (preserved)** | G2, G3 |
| **G6** | new | The V2 Workbench, the `CommandBus` command, executor wiring to `TransactionEngine`/`ActorEngine`, specialist consumers re-pointed. Foundry-wired. | Independent review | G8, G3, G5 as needed |
| **G7** | old G7 (test part) | Foundry v13 integration tests and a written manual smoke script; the acceptance gates of section 8. | Owner | G6 |
| **G9** | old G7 (retirement part) | Cutover: delete legacy implementations, templates, styles, preloads, settings and hooks; optional prerelease character reset. | **Explicit owner authorization, separately for deletion and for any reset** | G7 |

### 7.2 Dependency order for replacing legacy parts

1. Generated catalog and slot closure exist and are tested offline (G2, G3) → the three item-data files, `gear-mods.js` and the two template catalogs have no remaining reason to exist, but nothing is deleted yet.
2. Planner and executor exist (G3, G6) → `install-remove-engine`, `customization-workflow`, `UpgradeService` item paths and `customization-cost-engine` can be retired.
3. Effect projection covers every *specified* effect, and the remainder are explicitly deferred (G5) → `effect-resolver` can be retired. Until then it remains the only source of several combat-visible values (Phase 0 §5).
4. V2 Workbench live and Foundry-tested (G6, G7) → the old Workbench, bay item parts, upgrade app, routers, shims, their templates and styles can be retired together with their CSS imports, preloads and launch buttons.
5. The lightsaber pack generator and Force Alchemy are traced (NEEDS-TRACE) before those consumers are dispositioned.
6. Dead-code candidates are removed in the G9 batch, after a dynamic-use check.

Nothing is deleted before G9, and G9 itself needs explicit owner authorization.

## 8. Acceptance gates before the system is used in Foundry v13

All must be demonstrated (offline unless stated):

1. **Source integrity:** G1 validator green; generated file `--check` green; counts exact (186 / 232 / 231 / 49).
2. **Non-promotion:** property tests show the generator cannot raise any status flag, make a record selectable without a ledger entry, or turn an unknown into a number.
3. **Fail-closed behavior:** each blocker (not selectable, unknown price, host not established, deferred mechanic, overflow, wrong domain, non-general pool, excluded record, stale snapshot) produces a refused plan with a stable reason code.
4. **Slot accounting:** the Phase 1a suite passes unchanged with the catalog closure injected; baselines stay 1/1/1/2/3; strips and lightsabers still never certify.
5. **Pricing:** every registry price type round-trips as its tagged form; unstated and `talent_action_only` prices are never numeric.
6. **Atomicity:** an install that fails at any step leaves credits and the Item unchanged; removal restores exactly the pre-install state (no stranded stat writes, because effects are computed).
7. **Effects only through existing authorities:** projection tests show contributions flow into `ModifierEngine` or the weapon/armor profile and never to `system.*` stat keys; critical range, multiplier and post-multiplier addition remain separate.
8. **Domain separation:** no weapon definition affects armor or equipment and vice versa.
9. **No runtime leakage:** static tests show no runtime file references `data/audits/`, the generator, or unvalidated data; the loader is the only importer of generated data.
10. **Register integrity:** every `deferred[]` id exists; no feature with an open blocking entry is marked implemented.
11. **Foundry v13 (manual, written script):** open the Workbench on a weapon, armor and equipment Item; read a research-only modification (inert, badged); install and remove an accounting-eligible modification; confirm slot display, price handling, blockers and re-render behavior; confirm no actor update for UI-only state; confirm combat reads only computed projections.
12. **Rollback:** every gate is a revertible PR; cutover keeps a tagged pre-cutover commit.

## 9. Risks, ENGINEERING choices and RULES questions

### 9.1 Engineering choices (mine to make, flagged for visibility)

| ID | Choice | Proposal |
|---|---|---|
| E-1 | Location and classification of generated runtime data | `data/modifications/runtime-definitions-v1.5.json`; its own reviewed authority classification is required for the runtime-ready representation (the G1 review requires it at G8, and the repository's Phase 5C classification guard may also apply depending on the file's path and name) |
| E-2 | Installed-state shape | Identity-only instance records at the existing canonical flag path (3.3) |
| E-3 | Status ledger and specification records as separate small inputs | Section 4.3 |
| E-4 | How projections reach combat for weapons | Needs a trace of how `weapon-runtime` and `combat-stat-rules` consume sources before G5; no stat-key writes |
| E-5 | Whether `TransactionEngine` can wrap a non-store item-state change atomically | **Needs trace** (it lives under `engine/store/`); if not, the executor uses `ActorEngine` transactions plus credit rollback, never a parallel ledger |
| E-6 | `CommandBus` command names and payload | One install/remove command replacing `applyItemUpgrade` |
| E-7 | Removing Phase 1a's legacy-evidence paths after cutover | A contract amendment at G9, not earlier |
| E-8 | Fate of legacy tests | UI-contract tests are removed with their UI; rule-bearing tests are kept or replaced by an equivalent V2 test before the legacy code goes |
| E-9 | Lightsaber pack generator not yet traced | Trace before dispositioning crystal/accessory data (owner requirement) |
| E-10 | Force Alchemy services not traced in depth | Trace before dispositioning |

### 9.2 Rules questions requiring owner adjudication (register entries; no recommendation made)

D-001 install/remove procedure; D-002 stripping; D-003 size increase; D-004 Retractable Stock; D-005 universal upgrade hosts; D-006 handling of unstated prices; D-007 Computerized Interface Scope and Night Vision Device; D-008 Tech Specialist device slot; D-009 Superior Tech; D-010 three Legacy Era templates; D-011 lightsaber accessory allowance and crystal pools; D-012 powered-armor precedence. Full source evidence and impact are in `docs/audits/swse-rules-decisions-pending.md`.

**A consequence worth stating plainly:** because D-001 (the install/remove procedure's DC, time, cost and failure/removal consequences) is outline-only in the registry, a V2 install flow cannot *automate* those rules today. It can show verified descriptions, plan and block, count certified slot costs for recorded installations, and refuse what is uncertified. What the install experience should be in the meantime (for example a GM-adjudicated record) is an owner question, not mine.

### 9.3 Risks

- Deleting `effect-resolver` removes several combat-visible effects before projection exists: mitigated by the ordering in 7.2.
- Droid/vehicle code shares files with in-scope code: mitigated by splitting first.
- Zero-importer findings are static only: mitigated by the dynamic-use check before any deletion.
- A large owner-approved "specification record" backlog could stall effects: mitigated by implementing only specified effects and showing the rest as description.
- Prerelease character reset is destructive: it needs its own explicit authorization and a recovery tag.

## 10. Decisions requested from the owner and the independent reviewer

1. Approve this amendment to the gate plan (section 2), including the elimination of the permanent crosswalk and the replacement of V10 by V10′.
2. Approve the revised gate sequence (section 7.1), with G8 preserved and ordered before the Foundry-wired work.
3. Approve the proposed generated-data location and the status-ledger / specification-record mechanism (E-1, E-3), or direct an alternative.
4. State the interim install experience while D-001 is unresolved (rules decision, section 9.2).
5. Confirm that the legacy inventory's dispositions are the planning basis (nothing is deleted before G9).

## 11. What this package does not do

It writes no schema file, generator, ledger, catalog, engine, workbench, test or workflow; changes no existing file; alters no Phase 1a or G1 behavior; deletes nothing; resets no character data; starts none of G2–G9; and decides no SWSE rule. It records every unresolved rule as a deferral and recommends nothing on any of them.

# SWSE Universal Droid Source Schema — Canonical Replacement Design v0.1

**Status:** First machine-validated schema draft for owner review. **Not frozen, mechanically certified, or deployed.**  
**Purpose:** Completely replace the inaccurate legacy Droid compendiums with canonical records derived directly from the 14 official books. There is **no legacy compendium data migration or field-level patching**. The existing compendiums are not source authority.  
**Existing input:** `droid-publication-census.json` (234 publication-specific statblock claims, 25 alternate/repeated presentations); `SWSE_Droid_Rules_to_Schema_v0_15.md` (source-rule contract and 14-book discoveries). The source review certifies **identity and provenance**, not every numeric field.

## 1. Vehicle schema and code review

Compared with the vehicle project's `audit/universal-vehicles-phase1` branch:

- `data/audits/vehicles/swse-phase0b-vehicle.schema.json`: 23 shared root groups, reusable nested field vocabulary, closed object definitions, source/identity separation and `fieldStates` keyed by JSON Pointer.
- `docs/audits/vehicles/swse-phase0b-v05-nullable-schema-report.md`: source-sensitive sparse/nullable capabilities, separating an explicitly absent feature from source silence and from an unreviewed field.
- `docs/audits/vehicles/swse-phase2c-null-semantics-contract.md`: the **later, controlling** parent/child persistence rule. A parent with any known child must remain an object; a child may be `null` without blanking its siblings. Explicit printed zero and explicit empty equipment list retain their own meanings. Historical field omission is not the same as stored null.
- `docs/audits/vehicles/universal-vehicle-phase4d-native-runtime-acceptance.md`: canonical records drive deterministic **native Foundry V13 LevelDB packs**, with independent Actor/compendium/runtime acceptance. The vehicle branch's runtime verification is not a droid implementation certificate.

**Branch caveat:** At review time, the schema and vehicle Phase 4D files were visible on `audit/universal-vehicles-phase1`, while `main` did not expose the vehicle-audit directories. This draft references the verified audit branch rather than asserting that those specific paths have landed on `main`.

## 2. Immutable publication authority, not legacy record repair

```text
Official book + errata
         |
         v
Published droid statblock identity + exact source evidence
         |
         v
Canonical source SSOT (234 initially distinct publication claims)
         |     |-- named character / variant / protocol-view links
         |     |-- source-backed model relations, never name guesses
         |     +-- explicit unresolved/unknown field status
         v
Deterministic V2 projection + existing Progression / Equipment / Droid rules
         |
         +--> ordinary/new/replica droid Foundry Actor compendiums
         +--> Shard/droid-shell PC integration via existing species and body authority
         +--> vehicle-format droid -> canonical vehicle source reference, NOT a second ship
         |
         v
New native V13 compendiums -> instance state -> sheets, attacks, modifications
```

The old Droid compendiums are **non-authoritative historical comparison data only**. Do not import their abilities, statistics, pricing, chassis systems, or feat assignments to fill gaps in the books. Canonical source records are not mutable world Actors. An actor's current HP, installed player modifications, ammunition, component activation and crew assignments belong to the **instance** layer, not the printed baseline.

The database counts are **publication claims**, not necessarily 234 distinct physical model families. Family reconciliation still happens, but **after** the universal source contract is stable, not as a precondition for it.

## 3. Null contract — binding design decision

A nullable field means **the source supplies no established positive value for that particular field** or a positive source statement establishes that it is inapplicable/absent. `null` never means “allowed,” “available,” “free,” “installed,” “unrestricted,” `0`, or `false`. A data field records **published facts**; eligibility is evaluated by separate source-backed rules.

| Source situation | Example encoding | Interpretation |
|---|---|---|
| Numeric zero actually printed | `"shieldRating": 0` | The number is zero, not unknown. |
| Book does not list a degree | `"publishedDegree": null` and `fieldStates["/classification/publishedDegree"]="not-stated"` | Do not infer degree from chapter heading. |
| Book lists STR but not DEX | `"abilities": {"str": 14, "dex": null}` plus `/abilities/dex: not-stated` | Preserve parent and known sibling. |
| Source says “no installed weapons” | `"attackGroups": []` with `explicitly-none` evidence | Positive absence, not an unknown weapon inventory. |
| Source offers no component information | `"systems": null` with `/systems: not-stated` | **No permission** to choose arbitrary systems and no assertion of no systems. |
| Audit has not inspected a child | Child key omitted; status `not-yet-reviewed` may be recorded | **Not** evidence of source silence or confirmed absence. |
| Contradictory printed numbers | `null` with `unclear-source` **plus both printed alternatives** under `exceptions.sourceContradictions` | No quiet winner or default. |
| Printed ability score is a dash (e.g. no CON) | `"con": null` with `explicitly-none` and printed source evidence | **No score**, distinctly not an ability score of 0. |
| Item absence established by book | `"possessions": []` and `/equipment/possessions: explicitly-none` | A known empty loadout, not permission to add anything. |

For this draft, *every persisted `null` value must have a matching JSON Pointer in `fieldStates`*. Empty lists also need explicit positive `explicitly-none` evidence. An untouched draft has sparse `{}` groups with missing children; such groups have **no affirmative meaning** and cannot be mechanically certified. The semantic verifier enforces these rules as a second gate beyond JSON Schema type checking.

A null parent cannot simultaneously have children. Once any descendant is verified, retain the parent object and place `null` only at the unknown child. A later reader must not turn nulls into `false`, `0`, free equipment, or successful prerequisite checks. An “unspecified” accessory slot is not a **zero-slot** chassis and not an **unlimited-slot** chassis.

## 4. Universal 28-root-group vocabulary

The new schema intentionally retains every applicable **vehicle** concept and adds droid-specific ones. All 28 groups are present on every source record; their children are sparse and nullable when supported by the evidence contract.

| Group | What it controls |
|---|---|
| `schemaVersion`, `recordType` | Contract identification, not a gameplay mechanic. |
| `identity`, `publication` | Stable publication key, name, book/page, alternate source presentations, model/variant lineage. |
| `classification`, `challenge` | Printed degree versus contextual degree; size; Droid/Shard/replica/device/vehicle classification, CL. |
| `geometry`, `abilities`, `progression` | Reach/fighting space, all six ability scores, skills/languages, printed classes/feats/talents. |
| `defenses`, `durability`, `movement` | Printed HP/DR/defenses, locomotion system instances, restricted movement and mode transitions. |
| `anatomy` | Physical locations, manipulators, locomotion limbs, occupant/body distinction. |
| `processor`, `programming` | Brains, independence/control links, behavior programming and reprogramming. |
| `combat` | Published attacks/conditionals as evidence; not executable stock weapon entitlements. |
| `capacity` | Independent cargo, internal storage, lifting, payload and consumables. |
| `systems`, `equipment`, `modifications` | Factory component instances, example possessions, item upgrade authority and *separate* droid installation constraints. |
| `pcConstruction` | Printed hero eligibility, starting choices and route-specific traits. |
| `vehicleLink` | Cross-reference to **existing** vehicle source record, no duplicated vehicle statistics. |
| `economics`, `text` | New/used/estimated prices and availability, canonical notes and short player summary. |
| `exceptions`, `fieldStates`, `rules`, `certification` | Printed conflicts, source-state ledger, scoped rule authority, independent acceptance statuses. |

**Vocabulary constraints:** `additionalProperties: false` for every typed object; unique component instance IDs required during later hydration; no unprinted sizes, degrees, prices, weapons, feats, spells, upgrades or physical mounting topology. Unknown source facts stay unknown and fail closed. `systems`, `equipment`, `modifications`, `pcConstruction`, `vehicleLink` may be entire `null` only with an evidence status; if any child is source-confirmed the object remains populated.

## 5. Crucial distinctions that the original compendiums missed

**Printed model vs new PC:** Stock droid records are fully specified **published examples**, not reconstructed custom builds; don't reapply degree/size/chassis modifiers or rebuy factory systems. A heroic PC built using a stock chassis or the *Threats* Replica Droid p.153 creation profile is a different creation route from copying a 4th-level NPC's statblock.

**Separate component accounting:** Physical appendage/location IDs (`anatomy.physicalLocations`), installed droid component IDs (`systems.installed`), Item-native upgrade slots (`equipment` + existing V2 Modification authority) and storage/lift amounts (`capacity`) **must not** collapse into one arbitrary `slots` quantity. An unprinted slot count is `null`/unreviewed, **not unlimited capacity**. No generalized chassis-slot budget is assumed.

**Two-layer actor identity:** `classification.ruleEntityNature` and `classification.primaryActorAuthority` are independent. A DP-2, Basilisk, Vulture, Scarab or Droid Tri-Fighter can be a droid under the rules but live under **Vehicle Actor authority**. Its `vehicleLink.vehicleSourceEntryKey` is a reference to the canonical ship/vehicle claim, with no second equipment/weapon engine and no stock attack permission before vehicle certification.

**Occupant/body split:** Shards (JATM pp.78–79) are not ordinary “CON —” robots and retain their special Force/Constitution rules; replica-droid PCs (*Threats*, p.153) use a distinct droid-PC creation profile and do not simply inherit all humanoid species features. Both are the deliberately deferred cases **DROID-ARCH-002**, to be resolved through droid-PC integration without building a duplicate progression engine.

**Source conflicts:** **DROID-RULE-001** continues to govern direct same-scope Scavenger-vs-Core contradictions; nothing automatically grants priority to other supplements or settles intra-book contradictions. Preserve both readings and the owner-approved effective choice, if any.

### Census format-coverage probe

A read-only, identity-only probe successfully validated **234/234** census identities against the new schema's record structure: **219** normalized droid-actor presentations, **13** vehicle-format presentations and **2** squad presentations. This proves **structural vocabulary coverage of the listed formats only**. It does not create 234 mechanical source records and does not certify attacks, components, model family links, Source/PC rule profile applicability or any Foundry operation. Original format strings are preserved in `classification.sourceStatblockFormat` instead of silently rewritten.

## 6. Acceptance and cutover requirements

1. **Freeze source vocabulary first.** Validate this schema against fixture cases spanning all 14 books and every representation type. Do **not** use the legacy Droid pack as default/fallback for absent published fields. Confirm the identity/compendium taxonomy before native pack authoring.
2. **Populate 234 book-specific source claims.** Normalize from the census while transcribing each statblock's actual numeric fields and preserving PDF/source evidence, printed contradictions, alternate protocol presentations, and source-specific rules. This is **mechanical certification work**, not 234 copies of the current sparse census.
3. **Independent field-state certification.** Every `null`, `0`, `[]`, explicit prohibition, conditional allowance and unresolved printed value must have the correct evidence. A non-stated hero restriction is **not** the same as permission to play that model.
4. **Separate physical/weapon/ability certification.** Do not turn printed attack expressions into installed weapon mounts, weapon costs, ranges, additional actions, shield generators or executable Foundry roll buttons. The existing vehicle program's conservative stock weapon guard is the model.
5. **V2 source-to-actor projection.** Deterministic build into **new replacement native V13 LevelDB droid packs**, with stable source identity, exact readback and a checked import/ActorEngine transaction. Both Droid PC and NPC consumers use one authority; no legacy-stat cohabitation or arbitrary compatibility migration required.
6. **Full end-to-end cutover.** New compendiums + browser/store/chargen/sheets/progression/suggestions/actor import + tests in a disposable world. Retire incorrect old Droid packs in the release only after owner review, exact-head CI and proof that all consumers use the new records.

### Certification gates

- **Identity:** book, page, source identity and duplicates reviewed — the 234-entry census is an input, not automatic mechanical certification.
- **Mechanical:** printed numbers, equipment systems, source conflicts, special actions, eligibility, exception text and model relationships individually certified.
- **Runtime:** native compendium readback, V2 actor instantiation, legality and source-trust checks, action/resource use and actual Foundry V13 test world.

## 7. Current deliverables and open decisions

| File | Use |
|---|---|
| `universal-droid-source-entry.schema.json` | Draft JSON Schema (2020-12), 28 uniform root groups, typed nullable children, reusable definitions. |
| `universal-droid-source-entry.blank.json` | Draft-only empty template. Empty group objects are **not** certified absence. |
| `verify_schema.py` | Read-only independent structural + semantic tests for nulls, empty lists, preserved siblings and release gates. |
| `build_schema.py` | Deterministically regenerates the schema/template; requires Python 3.10+. |
| `census_coverage_probe.py` | 234-record identity-only source-format crosswalk; requires `jsonschema`; intentionally does not import statistics. |

**Decisions still requiring approval:** exact final schemaVersion and release pack taxonomy; whether `fieldStates` uses the simple string-state map here or the richer vehicle audit evidence envelope; whether the publication source SSOT stores fully itemized printed equipment or holds pre-mapped canonical Item references **only after separate provenance certification**; how rule-profile records (replica-droid PC and Shard shell) are stored outside full NPC statblocks; and whether cross-book model lineage is implemented as a separate audited index.

**Important:** These artifacts have not been uploaded or pushed. They have **not** been used to modify production code, legacy compendiums, Foundry Actors or V2 services. Do not call the 234 source records mechanically certified merely because this schema validates synthetic examples.

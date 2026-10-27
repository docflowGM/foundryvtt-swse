# Equipment Ecosystem — E2B-S2 Species Anatomy Architecture Contract v1

**Status:** documentation-only architecture checkpoint. **Nothing in this document is implemented, activated against production packs, or Foundry-certified.**
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `5371f712aedaecc9cbe482304326688028fae8e0`
**E2B-S2A update:** the ten open decisions OD-1…OD-10 in §12 were architecturally resolved in the decision-closeout section **§15** (below). §12 is preserved unchanged as the original record; where §12 and §15 differ, **§15 governs**. Resolutions are design rulings, not published rules and not implementation certification.
**Decision authority:** the architectural decisions below were supplied by the project owner and ChatGPT. Claude recorded them without redesigning, implementing or extending them. Where the supplied contract is silent or ambiguous the gap is listed in §12 (open decisions), not filled.
**Published-rules authority:** `docs/audits/equipment-ecosystem-e2b-s1-species-anatomy-source-review.md` (E2B-S1). Claude did not consult any sourcebook. Every source-derived statement below cites an E2B-S1 case (`E2B-RD-nn`) or section.
**Related:** `equipment-ecosystem-authority-contract-v1.md` (E1, with §14 E2A rulings), `docs/audits/equipment-ecosystem-e2a-anatomy-checkpoint.md`.

Labels used: **[APPROVED-DESIGN]** approved architecture for future implementation · **[SOURCE-VERIFIED]** published fact recorded in E2B-S1 · **[UNRESOLVED]** evidence or decision outstanding · **[DEFERRED]** implementation requirement not authorized now.

## 1. Universal anatomy completeness **[APPROVED-DESIGN]**

Completeness applies to **every** source of physical appendages: canonical species anatomy, actor-selected alterations and injected droid adapters. It is not droid-specific.

A result may be `resolved` only when **all** hold:
1. its equipment-relevant physical topology is complete;
2. every allocatable appendage has a stable, non-conflicting physical identity;
3. every required capability is an established boolean;
4. functional state is established;
5. no unresolved equipment-relevant appendage records remain;
6. no blocking diagnostic remains.

If an established appendage appears alongside an unresolved physical appendage record, the **whole** result cannot be `resolved`. Unknown capability is `null`. A partial result may preserve its known appendages, but downstream systems must not treat the overall anatomy as complete. Locomotion-only and vestigial limbs explicitly excluded from equipment eligibility do not, by themselves, make equipment-relevant topology incomplete.

*Relation to E2A code:* the E2A resolver implements parts of this for the adapter path (C3). Applying rule 5 universally, and the identity rules of §2, are pre-E3 requirements (§10) and are **not** implemented here.

## 2. Identity collision policy **[APPROVED-DESIGN]**

Three identity concepts remain separate: physical appendage **slot**, installed component **instance** (where applicable) and canonical component **definition** (where applicable). Biological appendages require distinct stable slot identities; they do not require droid installed-instance ids.

| Situation | Outcome |
|---|---|
| Duplicate appendage id among confirmed allocatable appendages | invalid → `AnatomyInputError` `DUPLICATE_APPENDAGE_ID` |
| Duplicate non-null physical slot id | invalid → `DUPLICATE_APPENDAGE_SLOT` |
| Duplicate non-null installed-instance id claimed as independent appendages | invalid → `DUPLICATE_INSTALLED_INSTANCE` |
| Null, missing or otherwise unestablished identity | **uncertainty, not malformed data** → `partial` or `unresolved`; prevents full resolution |
| Unresolved legacy records carrying conflicting *candidate* identities | may be preserved as diagnostics; never promoted to allocatable manipulators |

`DUPLICATE_APPENDAGE_ID` already exists in the E2A resolver; `DUPLICATE_APPENDAGE_SLOT` and `DUPLICATE_INSTALLED_INSTANCE` are the recommended new codes. **No E2A code is changed in E2B-S2.**

## 3. Canonical species anatomy schema v1 **[APPROVED-DESIGN, DEFERRED implementation]**

### 3.1 Placement
The optional canonical field is `anatomy`. It belongs to the **effective, publication-specific species profile**. It is globally optional (§7).

### 3.2 Required concepts
- `schemaVersion: 1`
- `topologyStatus`: `complete` | `partial` | `unresolved`
- `appendages`: list of equipment-relevant physical appendages
- per appendage: stable `id`; physical `kind`; independent `canHold`, `canWield`, `canManipulate` (each `true` | `false` | `null`); optional typed `constraints`
- publication provenance **inherited from the selected species profile**, with traceability to the E2B-S1 claims

### 3.3 Rules
- **Topology certainty and capability certainty are separate.** Topology is declared by `topologyStatus`; capability certainty is the presence of explicit booleans versus `null` per appendage. (E2B-S1 example: two grasping appendages can be a certain topology while wielding stays `null` — E2B-RD-08.)
- For declared `complete` topology the `appendages` array is the **whole** equipment-relevant anatomy: ordinary arms are listed, and the universal two-arm fallback is **not** added.
- An explicitly verified **zero-manipulator** anatomy must be distinguishable from missing anatomy evidence (an empty `appendages` array with `topologyStatus: complete` versus no `anatomy` field).
- Canonical species anatomy **never persists** per-actor injury or temporary functional state. `functionalState` remains a derived property of the effective anatomy (OA-4).
- Anatomy describes capacity only. It carries no attack data and no combat modifiers.

### 3.4 Proposed schema examples (illustrations — not production data, not validated, not wired to any pack)

**Example A — complete four-appendage biological profile** (shape for a profile such as Codru-Ji, E2B-RD-01):
```json
{
  "schemaVersion": 1,
  "topologyStatus": "complete",
  "appendages": [
    { "id": "arm-1", "kind": "arm", "capabilities": { "canHold": true, "canWield": true, "canManipulate": true } },
    { "id": "arm-2", "kind": "arm", "capabilities": { "canHold": true, "canWield": true, "canManipulate": true } },
    { "id": "arm-3", "kind": "arm", "capabilities": { "canHold": true, "canWield": true, "canManipulate": true } },
    { "id": "arm-4", "kind": "arm", "capabilities": { "canHold": true, "canWield": true, "canManipulate": true } }
  ]
}
```
The source-specific entitlement to hold four items and wield two two-handed weapons simultaneously, and the statement that Extra Arms grants no extra attacks (E2B-RD-01), are **not** represented in this example. Their representation is open (§12, OD-3). They must reach E3 intact, must not become a generic four-arm rule, and must not be copied to other four-armed profiles.

**Example B — restricted holding tail** (Ryn, E2B-RD-02, and independently Trianii, E2B-RD-03):
```json
{
  "schemaVersion": 1,
  "topologyStatus": "complete",
  "appendages": [
    { "id": "arm-1", "kind": "arm", "capabilities": { "canHold": true, "canWield": true, "canManipulate": true } },
    { "id": "arm-2", "kind": "arm", "capabilities": { "canHold": true, "canWield": true, "canManipulate": true } },
    { "id": "tail-1", "kind": "prehensile-tail",
      "capabilities": { "canHold": true, "canWield": false, "canManipulate": null },
      "constraints": [ { "type": "held-item-load-floor", "…": "see §4 (field names illustrative)" } ] }
  ]
}
```

**Example C — partial-capability anatomy** (shape for Lugubraa, E2B-RD-08):
```json
{
  "schemaVersion": 1,
  "topologyStatus": "complete",
  "appendages": [
    { "id": "forward-limb-1", "kind": "grasping-tentacle", "capabilities": { "canHold": true, "canWield": null, "canManipulate": null } },
    { "id": "forward-limb-2", "kind": "grasping-tentacle", "capabilities": { "canHold": true, "canWield": null, "canManipulate": null } }
  ]
}
```
Topology is certain; wielding and fine manipulation remain unknown, so the anatomy cannot become `resolved` (§1).

**Example D — character-selected alteration** is illustrated in §6.4 because it is not part of canonical species anatomy.

## 4. Conditional holding restrictions **[APPROVED-DESIGN, DEFERRED implementation]**

A typed, declarative constraint vocabulary. The recommended identifier is **`held-item-load-floor`**. Required semantic fields:
- **Trigger:** the item is held by the identified appendage.
- **Predicate:** the held item's size is Medium or larger.
- **Consequence:** effective load category is at least heavy, with the published encumbered treatment.

**Source-verified content for the Ryn and Trianii tails [SOURCE-VERIFIED, E2B-RD-02 / E2B-RD-03]:** Small or smaller items may be held; the tail cannot wield; a Medium or larger item held by the tail imposes the encumbered / heavy-load treatment; no tail attacks or general-purpose hand capability are granted; fine manipulation is not established (`canManipulate: null`).

Boundaries:
- It must **not** be encoded as a prohibition on holding Medium items.
- The anatomy resolver must **not** calculate weight, carrying capacity or encumbrance.
- E2B-S2 documents the constraint and the authority boundary only.
- **E3** may evaluate the constraint read-only to identify a prospective consequence, when separately authorized.
- **Later integration:** the designated *existing* encumbrance authority applies the mechanical consequence; its exact integration point must be identified and verified before implementation. No competing encumbrance engine may be created.
- The exact constraint field names are not fixed by this contract (OD-2).

## 5. Published cases **[SOURCE-VERIFIED facts from E2B-S1; schema treatment APPROVED-DESIGN]**

The schema must not homogenize different species rules.

| Case (E2B-S1) | Published fact (E2B-S1) | Schema treatment |
|---|---|---|
| Codru-Ji, Legacy Era (RD-01) | four arms; hold four items or wield two two-handed weapons; no extra attacks | four distinct manipulators; source-specific entitlement preserved for E3 (OD-3); no extra attacks |
| Ryn, Scum and Villainy (RD-02) | tail holds, cannot wield; Medium+ held item → heavy load | two ordinary arms + restricted holding tail (§4) |
| Trianii, Galaxy at War (RD-03) | same tail restriction; separate natural claws do not make the tail a weapon-gripping appendage | same semantics, **independently sourced** data on the Trianii profile, not shared with Ryn |
| Krevaaki, Unknown Regions (RD-04) | eight tentacles; two dominant tentacles function as arms/hands; six locomotion | two dominant manipulator tentacles; locomotion tentacles do not become hands (representation of locomotion appendages, if any: OD-4) |
| Killik, typical Medium (RD-05) | four limbs as arms/hands; Multiple Limbs −2 to multiple-attack penalty | four manipulators for the verified typical Medium profile; the penalty modifier stays outside anatomy |
| Near-Human Additional Arms (RD-06) | optional selected trait, up to two additional arms; separate −2 multiple-attack adjustment | actor-selected alteration (§6), not species anatomy |
| Dug, Clone Wars (RD-07) | two arms/two legs; upper limbs walk, lower limbs manipulate | two manipulators (the lower limbs); upper walking limbs add no equipment capacity |
| Lugubraa, Unknown Regions (RD-08) | two forward gripping tentacle limbs; vestigial middle limbs | two forward grasping appendages; capabilities beyond source-established grasping stay `null` (Example C) |

Do not copy Codru-Ji-specific entitlements into Killik or Near-Human records. Do not implement combat modifiers in the anatomy schema. Do not infer that natural weapons imply equipment hands (E2B-S1 §III).

## 6. Actor-selected anatomy alterations **[APPROVED-DESIGN, DEFERRED implementation]**

### 6.1 Layers
1. **Canonical published anatomy** — the selected publication snapshot (§3).
2. **Character-selected alterations** — validated, source-authorized choices recorded for the actor.
3. **Actor functional state** — disabled / missing / unresolved, per actor.
4. **Read-only effective anatomy** — derived, consumed by E3, with **no independent persistence authority**.

Processing order: (1) resolve the selected publication profile; (2) read its verified canonical anatomy; (3) apply independently validated character-selected alterations; (4) apply actor-specific functional restrictions; (5) produce the final read-only effective anatomy.

Disabling a Codru-Ji arm does not change what a Codru-Ji is; selecting Additional Arms does not change the Human species record. Species definitions never contain an individual actor's missing or disabled limb state.

### 6.2 Provenance
A selected alteration must carry provenance back to an **established character choice**. This layer must not create an equipment-owned duplicate persistence authority for Near-Human chargen choices.

### 6.3 Near-Human Additional Arms (E2B-RD-06)
- identify the existing `additionalArms` trait;
- require a valid recorded selection;
- require the added-arm count to be **established**, within the published maximum of two — never assume the maximum;
- assign stable additional appendage identities;
- do not mutate the underlying Human (or other) species record;
- grant no additional attacks;
- the separate multiple-attack penalty adjustment stays under the combat / trait authority;
- never a species-wide four-arm default.

### 6.4 Proposed schema example (illustration — not production data)
```json
{
  "type": "additional-arms",
  "traitId": "additionalArms",
  "provenance": { "choiceRecord": "<reference to the established character selection — location not decided, OD-5>" },
  "count": 1,
  "appendages": [
    { "id": "added-arm-1", "kind": "arm", "capabilities": { "canHold": null, "canWield": null, "canManipulate": null } }
  ]
}
```
`count` must be an established value of 1 or 2 within the published maximum. The capabilities of the added arms are **not** stated by E2B-RD-06 (it grants neither extra attacks nor the Codru-Ji two-handed entitlement) and are therefore shown as unknown; resolving them is OD-5.

### 6.5 Existing integration defect (recorded, not repaired) **[DEFERRED]**
`additionalArms` appears in `data/near-human-traits.json` and is reachable through the builder's generic trait selection, but that does not establish an end-to-end working implementation: `scripts/engine/progression/helpers/build-pending-species-context.js` (line 82 at the audited commit) calls `_buildNearHumanContext`, for which **no definition exists** in that module or anywhere in `scripts/` (verified by repository search at `5371f712`). Treat this as a separate, pre-existing, deferred Near-Human chargen integration dependency. Chargen is not repaired in E2B-S2.

## 7. Complete-snapshot and registry policy **[APPROVED-DESIGN, DEFERRED implementation]**

`anatomy` stays **globally optional**. `listMissingSnapshotFields()` must **not** be changed to require it for every complete snapshot, because ordinary snapshots (e.g. a Human Core Rulebook snapshot) legitimately omit it and use the two-arm fallback.

When implementation is authorized:
- `SpeciesRegistry._normalizeVariants()` must preserve validated optional `anatomy` (today it rebuilds each variant field-by-field and would drop it);
- `applyCompleteSnapshot()` must preserve `anatomy` explicitly from the **selected variant** (today it is a whitelist and would drop it);
- base-species anatomy must never bleed into a complete publication snapshot;
- legacy overlays (built with `...base`) must not inherit canonical anatomy without an explicit, reviewed compatibility policy.

### 7.1 Publication-profile certification requirement
A requirement for anatomy is keyed to the **exact publication-profile identity, not the species display name**. This keeps, for example, the two Krevaaki publication profiles from sharing anatomical rules.

Recognized source-reviewed exception set (E2B-S1):

| Profile | Identity as recorded |
|---|---|
| Codru-Ji — Legacy Era | `codru-ji-leg-2c-03` |
| Ryn — Scum and Villainy | `ryn-sv-2f-06` |
| Trianii — Galaxy at War | `trianii-gaw-2i-06` |
| Krevaaki — Unknown Regions profile only | exact profile id **not stated in E2B-S1**; to be confirmed from the repository at certification (the status document lists Krevaaki as a multi-publication separate path); the other publication (Jedi Academy Training Manual) requires independent review |
| Killik — verified typical Medium profile | `killik-ur-2b-12` |
| Dug — Clone Wars | `dug-cw-2h-01` |
| Lugubraa — Unknown Regions | `lugubraa-ur-2b-13` |

Near-Human Additional Arms is actor-selected and is **not** a required-anatomy species snapshot.

**Fail-closed rule until migration:** before an exception profile is migrated to schema v1, missing structured anatomy must produce **unresolved** anatomy, never an incorrectly complete two-arm fallback. Once an exact profile is certified for v1, its required anatomy is validated.

*Coverage note (from E2B-S1 §V):* the E2A temporary guards match only the trait ids `extra-arms` and `prehensile-tail`; Killik, Krevaaki, Lugubraa and Additional Arms are not covered by them. `[CURRENT]` observation at `5371f712`: the Trianii variant `trianii-gaw-2i-06` carries a trait with id `prehensile-tail` and is therefore caught by the existing guard, while the Dug variant `dug-cw-2h-01` (traits: `athletic`) is not. The profile-keyed requirement above is the intended replacement. These requirements are **not** activated against existing production packs during this documentation phase.

## 8. Open anatomical evidence **[UNRESOLVED]**

Recorded without granting unverified capabilities (E2B-S1 §§III, V, VI):
- other Krevaaki publication variants;
- Lugubraa generic wielding and fine manipulation;
- Celegian equipment-relevant morphology;
- Ebruchi facial appendage eligibility;
- exceptional nonhumanoid species and creature-specific anatomy / natural weapons;
- Lurmen Roller mode (an operating constraint for E3/E7, not appendage cardinality);
- other species not covered by the targeted source review.

A source-review checkpoint is **not** an exhaustive species-census certification.

## 9. Source traceability

| Statement in this document | E2B-S1 reference |
|---|---|
| Codru-Ji four arms, hold four items, two two-handed weapons, no extra attacks | E2B-RD-01 |
| Codru-Ji +2 versus +5 grab/grapple discrepancy is logged separately and out of anatomy scope | E2B-RD-01; §IV item 10 |
| Ryn tail holds not wields; Medium+ → encumbered/heavy load; no tail attacks | E2B-RD-02 |
| Trianii tail identical semantics, independently sourced; claws do not make the tail a weapon grip | E2B-RD-03 |
| Krevaaki UR: two dominant manipulator tentacles; other tentacles not hands | E2B-RD-04 |
| Killik typical Medium: four arm/hand limbs; −2 multiple-attack penalty outside anatomy | E2B-RD-05 |
| Near-Human Additional Arms: selected trait, up to two arms, separate penalty adjustment | E2B-RD-06 |
| Dug: lower limbs manipulate, upper limbs walk, no added count | E2B-RD-07 |
| Lugubraa: two forward grasping tentacles; wielding/fine manipulation open | E2B-RD-08; §V |
| Natural weapons, Ebruchi, Celegian, Lurmen, creatures not promoted to hands | §III |
| Architectural requirements 1–10 | §IV |
| Open decisions; guard-coverage and pre-E3 notes | §V |

Statements about repository behaviour (registry and snapshot whitelists, missing `_buildNearHumanContext`) are `[CURRENT]` code observations at `5371f712`, not published rules.

## 10. Pre-E3 integrity requirements **[DEFERRED — not permission to modify E2A now]**

Before E3 consumes universal anatomy results the system must enforce:
1. unresolved physical appendage records prevent a fully `resolved` whole result;
2. duplicate confirmed physical slot identities are rejected;
3. duplicate confirmed installed-instance identities are rejected;
4. missing capabilities remain unknown;
5. unresolved functional states prevent full resolution;
6. species topology certainty is evaluated independently from individual capability certainty.

## 11. Droid refactor dependency

The droid system remains legacy / pre-refactor, scheduled for comprehensive review after the vehicle refactor. DR-001 through DR-010 remain `DEFERRED_DROID_REFACTOR`. No change to droid actors, models, parts, Garage systems, installed-component reconciliation or schemas is authorized. The rules of §§1–2 are written to apply equally to a future droid adapter without modifying today's droid code.

## 12. Open decisions and ambiguities (reported, not decided)

*E2B-S2A: OD-1…OD-10 below are architecturally resolved in §15, which supersedes this table. The original text is retained as history.*

| ID | Gap in the supplied contract |
|---|---|
| OD-1 | Exact final representation of `topologyStatus: partial` versus `unresolved` (what distinguishes them for a species profile) and how each maps onto the resolver's `partial` / `unresolved` result statuses. |
| OD-2 | Final field names of the `held-item-load-floor` constraint. The contract fixes the semantic fields (trigger, predicate, consequence) and the identifier; the JSON key names in any example are illustrative. Also the size-vocabulary source for "Medium or larger". |
| OD-3 | Where the source-specific Codru-Ji entitlement (hold four items; wield two two-handed weapons simultaneously; no extra attacks) is represented so that E3 receives it without it becoming a generic rule for four-armed profiles. |
| OD-4 | Whether and how non-manipulator appendages (Krevaaki locomotion tentacles, Killik locomotion limbs, Lugubraa vestigial limbs) are represented at all; E1 and E2B-S1 allow them "only if the eventual model explicitly represents them". |
| OD-5 | The capabilities of added arms from Near-Human Additional Arms (E2B-RD-06 does not state them), and where the recorded character selection (count and provenance reference) lives without creating an equipment-owned persistence authority. |
| OD-6 | The exact Krevaaki Unknown Regions publication-profile identity and the review of other Krevaaki publications. |
| OD-7 | How the profile-keyed certification list (§7.1) is stored and enforced (a registry of required profile ids versus a per-profile flag), and its relationship to `listMissingSnapshotFields()` which must remain unchanged. |
| OD-8 | Whether Dug, Killik, Krevaaki and Lugubraa (and actor-selected Additional Arms) need interim fail-closed coverage before migration, since the E2A temporary guards do not cover them (E2B-S1 §V; Trianii is covered incidentally through its `prehensile-tail` trait id). |
| OD-9 | Integration point of the existing encumbrance authority for the held-item load consequence (to be identified and verified before implementation). |
| OD-10 | The Near-Human chargen defect (missing `_buildNearHumanContext`) and its owner. |

## 13. Deferred implementation requirements (none authorized)

Schema v1 validation; `SpeciesRegistry._normalizeVariants()` and `applyCompleteSnapshot()` preservation; publication-profile certification enforcement; migration of source-reviewed profiles; actor-alteration layer; E2A pre-E3 corrections (§10); the `DUPLICATE_APPENDAGE_SLOT` / `DUPLICATE_INSTALLED_INSTANCE` codes; E3 constraint evaluation; encumbrance integration; Near-Human chargen repair.

## 14. What this checkpoint does not do

It changes no source, pack, schema, test or tool file; activates no requirement against production data; claims no Foundry or production validation; authorizes no E2B implementation, E2A correction, E3 or later phase; and does not modify any droid, weapon, combat, inventory or modification system.

## 15. E2B-S2A decision closeout — OD-1 through OD-10 architecturally resolved

**Nature of this section.** The rulings below were supplied by the project owner and ChatGPT and are recorded here verbatim in substance; Claude did not redesign them. They are **design rulings**. They are **not** published rules (published claims remain those of E2B-S1) and they are **not** implementation certification: nothing here is implemented, activated against production packs, or Foundry-tested. Repository observations marked `[CURRENT]` were checked at HEAD `edbc29958999ec38af8485046dd757ca4ff91b3b` and are not a substitute for published-page verification.

| ID | Status | Resolution (summary) |
|---|---|---|
| OD-1 | resolved (design) | topology definitions; `partial` / `unresolved` topology never produce `resolved` |
| OD-2 | resolved (design) | standard `held-item-load-floor` shape |
| OD-3 | resolved (design) | Codru-Ji entitlement preserved via a future read-only trait-to-permission projection |
| OD-4 | resolved (design) | locomotion-only and vestigial limbs excluded from schema v1 |
| OD-5 | resolved (design; software default) | added arms are ordinary arms; count must be explicitly recorded |
| OD-6 | resolved (observation) | Krevaaki publication-profile identities |
| OD-7 | resolved (design) | no second registry; exact-profile tests plus temporary fail-closed guard |
| OD-8 | resolved (design) | fail-closed coverage for all recognized exceptions before E3 |
| OD-9 | resolved (design) | `EncumbranceEngine` remains the authority; a future input is required |
| OD-10 | resolved (ownership) | Near-Human defect assigned to the Near-Human / Progression Framework workstream |

### OD-1 — Topology completeness
- `complete`: all equipment-relevant appendages are established, **including an explicitly verified empty set**.
- `partial`: at least some appendage topology is reliably established, but additional equipment-relevant physical structure remains uncertain.
- `unresolved`: no reliable equipment-relevant topology can be established.

A `complete` topology can still yield a `partial` effective anatomy when capability, identity or functional-state information is incomplete. `partial` topology cannot produce a `resolved` effective anatomy. `unresolved` topology produces an `unresolved` effective anatomy. If `partial` topology contains no sufficiently identified appendages, the effective result is `unresolved`. Allocation is never authorized merely because some facts are known.

### OD-2 — Conditional tail restriction
Adopted declarative representation (proposed schema, not production data):
```json
{
  "type": "held-item-load-floor",
  "when": "held-by-appendage",
  "itemSizeAtLeast": "Medium",
  "loadCategoryFloor": "heavy",
  "imposesEncumbered": true
}
```
Semantics: applies only while the specified appendage holds the item; a held item of Medium or larger activates the consequence; the resulting load category cannot be lower than heavy; an already overloaded character remains overloaded; the published encumbered treatment applies; it never prohibits holding an item solely because of its size; no weight or carrying-capacity calculation occurs within anatomy. This supersedes the "illustrative field names" caveat of §4 and OD-2 for the constraint's key names; the example in §3.4 (Example B) is to be read with these keys.

Size comparison uses the existing canonical SWSE size ordering. `[CURRENT]` repository evidence: `SIZE_RANK` in `scripts/items/weapon-runtime/condition-policy.js` and `sizeRankOf()` in `scripts/items/weapon-runtime/control-rules.js`. These are a **candidate** size-comparison authority only; depending on the weapon runtime requires a later integration review. **Unknown item size must never silently pass a size-dependent permission or restriction** (fail closed).

### OD-3 — Codru-Ji entitlement authority
The source-specific Extra Arms entitlement (E2B-RD-01) is preserved through a **future read-only species-trait-to-equipment-permission projection**, not inside generic arm anatomy. Its provenance identifies the selected Legacy Era publication profile and the `extra-arms` trait. It preserves: up to four held items or weapons; permission to wield two two-handed weapons simultaneously; no additional attacks. It is not persisted as a duplicate copy in canonical anatomy, and it is not implemented as a generic rule that all four-armed creatures inherit. The anatomy resolver establishes physical appendages; the future equipment permission layer interprets explicitly published special entitlements. No existing species rules or combat data are modified.

### OD-4 — Non-manipulator anatomy
Schema v1 covers equipment-relevant appendages only. Locomotion-only and vestigial limbs are not added merely to reproduce full creature morphology. Accordingly (E2B-S1): Krevaaki locomotion tentacles, Killik locomotion limbs and Lugubraa vestigial limbs are not equipment manipulators; Dug lower limbs may be equipment manipulators despite their anatomical position. Species description, movement and natural-weapon authorities remain separate. A future expanded-morphology system needs independent authorization.

### OD-5 — Near-Human Additional Arms
For a successfully established actor-selected Additional Arms trait: require a **recorded count of one or two** added arms; never infer a count from the trait's existence; add stable individual appendage identities; ordinary added arms take the standard ordinary-arm holding, wielding and manipulation capabilities **as a software design default**, unless a source-backed restriction overrides them. This ordinary-arm default is **not** an additional source-verified combat entitlement (E2B-RD-06 states neither the capabilities of the added arms nor any two-handed entitlement). No additional attacks are granted; Codru-Ji's separately printed two-two-handed-weapon permission is not automatically granted. Tests must preserve the distinction between ordinary arms and the Codru-Ji entitlement.

`[CURRENT]`: `additionalArms` exists in `data/near-human-traits.json` as a `physiology` trait whose recorded text says "Up to 2 additional arms"; the catalog entry carries no selected count. The missing `_buildNearHumanContext` is an independent chargen blocker (OD-10). The future validated Near-Human selection record owns the selected count and provenance; the Equipment Ecosystem consumes it read-only and introduces no equipment-owned persistence field. If the validated choice record is unavailable, actor-selected Additional Arms anatomy remains `unresolved`.

### OD-6 — Krevaaki identities
`[CURRENT]` evidence in `tests/species-multi-publication.test.mjs` (lines 53-54): Unknown Regions — `krevaaki-ur-2b-04`, source profile `UR-2B-04`; Jedi Academy Training Manual — `krevaaki-jatm-2j-04`, source profile `JATM-2J-04`. Only the Unknown Regions treatment was source-certified for anatomy in E2B-S1. Its anatomical capabilities are **not** copied into the Jedi Academy profile, which requires independent source review before anatomy certification. These identity findings are repository observations.

### OD-7 — Profile-keyed certification
No second runtime species registry is created. Canonical anatomical facts remain in the selected publication-specific species profile. Future validation consists of: (1) schema validation of any declared anatomy; (2) publication-specific test assertions for the exact certified profile ids; (3) a **temporary fail-closed compatibility guard** for recognized exception profiles until migration is complete (migration protection, not permanent species authority). `anatomy` stays globally optional for ordinary complete snapshots; `listMissingSnapshotFields()` is not changed to require it. Once an exception profile is migrated, tests must fail if its required structured anatomy disappears or is dropped during normalization or snapshot application. Legacy-overlay inheritance must be addressed explicitly before activation.

### OD-8 — Interim exception coverage
Before E3 may consume anatomy in production, fail-closed coverage must recognize all currently identified exceptions that lack verified structured anatomy. Source-reviewed publication profiles: `codru-ji-leg-2c-03`, `ryn-sv-2f-06`, `trianii-gaw-2i-06`, `krevaaki-ur-2b-04`, `killik-ur-2b-12`, `dug-cw-2h-01`, `lugubraa-ur-2b-13`. Also tracked as independently **unreviewed** exceptional anatomy: `krevaaki-jatm-2j-04` (the ordinary two-arm default is not assumed source-certified for it). Near-Human Additional Arms is recognized from a valid actor-specific selection, not a species-wide guard. A recognized exception lacking sufficient anatomy must not silently receive a fully resolved ordinary two-arm result. The E2A guard code is **not** expanded in this documentation checkpoint.

### OD-9 — Encumbrance authority
The existing authority is `scripts/engine/encumbrance/EncumbranceEngine.js`, specifically `EncumbranceEngine.calculateEncumbrance(actor)`, which determines the load category and consequences; the V2 character actor mirrors the derived result through `mirrorEncumbrance()` in `scripts/actors/v2/character-actor.js`. `[CURRENT]`: the category is calculated from carried weight and carrying capacity and there is **no input for an anatomy-imposed minimum load category**. Future integration must supply a validated minimum-load consequence to this existing authority through an explicitly designed input or adapter. The anatomy resolver remains read-only and never calculates encumbrance penalties; E3 may report prospective consequences read-only. `EncumbranceEngine`, `character-actor.js` and the modifier engines are not modified in E2B-S2A.

### OD-10 — Near-Human defect ownership
The missing `_buildNearHumanContext` implementation and end-to-end Near-Human selection persistence are assigned to the separate **Near-Human / Progression Framework workstream** and recorded as an existing integration defect. It blocks production activation of actor-selected Additional Arms anatomy until the selection and count are reliably recorded. It does **not** block source certification or implementation of fixed biological species anatomy. It is not repaired here.

### 15.1 Remaining implementation gates (all deferred; none authorized)
Schema v1 implementation · publication-profile pack migration · independent Jedi Academy Krevaaki anatomy review · Near-Human chargen integration · actor-selected alteration persistence · pre-E3 anatomy completeness and identity corrections (§10) · encumbrance integration · Foundry runtime certification · droid refactor and DR-001 through DR-010 (`DEFERRED_DROID_REFACTOR`).

### 15.2 What this closeout does not do
It edits only this document. It changes no source, pack, schema, test or tool file, does not modify `EncumbranceEngine`, `character-actor.js` or any modifier engine, does not expand the E2A guard code, repairs no chargen defect, and authorizes no E2B implementation, E2A pre-E3 correction, E3 or later phase.

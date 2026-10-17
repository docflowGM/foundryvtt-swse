# D-005 T4b — Item-Fact Capability Census (read-only)

**Status:** research record. Documentation only. No evaluator, schema, pack, registry, ledger, specification-record or test is changed by this document.
**Working PR:** #1057, branch `audit/d-005-t2-host-published-facts`, census taken at `68130df1521f6f194b7c88b5f98a0650275a799b`.
**Decision authority for every mapping below:** project owner. The classifications are *engineering-data* classifications, not published SWSE rulings. A field's existence does not certify its semantics.

Certification vocabulary used elsewhere (`SOURCE_VERIFIED`, `MECHANIC_SPECIFIED`, `IMPLEMENTED`, …) is not applied here. Nothing in this census is a source verification, a mechanic specification, or an eligibility determination.

---

## 1. Scope and method

Question asked: *which existing Foundry item fields could, in future, feed a structured host check for the 15 Table 2-3 universal upgrades (35 typed definitions: 15 equipment, 11 weapon, 9 armor)?*

Populations read (registered Item packs, `system.json`):

| Family | Packs | Records | Notes |
| --- | --- | ---: | --- |
| Weapons | `weapons-{pistols,rifles,heavy,grenades,exotic,simple,lightsabers}` | 203 | aggregate `weapons` pack holds the same 203 ids plus 4 `weaponUpgrade` items |
| Armor | `armor-{light,medium,heavy,shields}` | 70 | aggregate `armor` pack has the identical id set |
| Equipment | `equipment-{comlinks,tools,survival,medical,tech,security,other}` | 142 | aggregate `equipment` pack has the identical id set |
| Droid actors | `droids` (Actor) | 194 | actor documents, not host Items |

Aggregate-versus-sub-pack equality was checked on **id sets only**; byte equality of records was not asserted. Counts below use the sub-packs.

Also read: `template.json` (Item section), `scripts/engine/equipment/equipment-normalizer.js`, `scripts/items/item-defaults.js`, `scripts/engine/customization/item-profile-resolver.js`, `tools/fix-equipment-data.js`, `scripts/engine/customization/modification-v2/{modification-planner,modification-legality}.js`, `tools/lib/modification-runtime.mjs`.

Method: read-only Node scripts over the `.db` files (not committed, per instructions). Nothing was inferred from item names or descriptions; names appear below only to *identify* the records that carry a field.

**Important structural finding.** The G3 planner receives the host Item as an opaque snapshot (`legality.evaluate(typedRecord, host)`). It reads **no** host fact today other than `item.type` and the V2 instance list `flags['foundryvtt-swse'].customization.installedUpgrades`. Every fact below is therefore an *available input*, not an input G3 consumes.

---

## 2. Field families

Classification key: `EXISTING_EXPLICIT_FIELD` · `DERIVED_OR_DEFAULTED` · `INCOMPLETE_COVERAGE` · `AMBIGUOUS_MAPPING` · `NOT_REPRESENTED`. A family may carry more than one label; the first is the dominant one.

### F1. Power source (Extra Power Source: "operates using energy cells or power packs")

| Item type | Field path | Records with field | Valid explicit values |
| --- | --- | ---: | --- |
| weapon | `system.ammunition.type` | 203 / 203 | 203 strings; `none` 100, `power-pack` 52, `consumable` 9, `single-use` 3, `energy-cell` 2, `ammunition-clip` 2, `slug-clip` 2, `specialized-snare-cartridge` 2, `disc` 2, `slug-ammunition` 1, `black-powder-ammunition` 1, `integrated-power-pack` 1, `ammo-clip` 1, `power-cell` 1 |
| weapon | `system.ammunition.max` | 203 / 203 | 103 with `max > 0`; `type == none` ⇔ `max == 0` holds for all 203 |
| armor | `system.charges.{current,max}`, `system.activated` | 7 / 70 | all seven are the Energy Shield / Shield Gauntlet records, `max` 5; no power-source type field |
| equipment | `system.capabilities.powerSource` / `powerSourceType` | 2 / 142 | `Energy Cell` (`energy-cell`), `Power Pack` (`power-pack`) — these are the power sources *themselves*, not hosts that use them |
| equipment | `system.capabilities.powerSourceSupport`, `recharges` | 1 / 142 | one charger record |
| equipment | `system.capabilities.power`, `system.usage.charges.max` | 1 / 142 | one free-text power string; one `max: 8` |

* **Origin:** weapons — canonical weapon corpus (`flags.swse.canonicalWeapon`, corpus `5C.1`, per-record SHA); armor/equipment — hand-authored/normalized pack records.
* **Defaults vs raw:** weapon `ammunition.type` is explicit on all 203 (template default is `""`, so `none` is a written value, not a default). The weapon `none`/`max` pair is internally consistent.
* **Contradictions / ambiguity:** `ammunition.type` names *the ammunition a weapon is loaded with*. It was not designed as, and must not be assumed to be, a statement of what powers the weapon (e.g. 56 weapons carry a power-pack/energy-cell/power-cell/integrated-power-pack value; whether each such weapon "operates using energy cells or power packs" in the published sense is a mapping decision). Armor has charges but no type of power source. Equipment `powerSource*` fields describe the cell/pack items, i.e. the inverse relationship.
* **Provenance sufficient for an evaluator?** Weapons: field is explicit and consistent, but semantics unreviewed. Armor/equipment: no.
* **Classification:** weapon `ammunition.type` → `AMBIGUOUS_MAPPING` (explicit field, unreviewed semantics). Armor → `NOT_REPRESENTED` (type of power source). Equipment → `INCOMPLETE_COVERAGE`.
* **Gap:** an explicit per-host power-source declaration (type + whether the host *consumes* it) for armor and equipment, and an owner-approved mapping for weapon ammunition values.

### F2. Computer Intelligence (Memory Upgrade / Advanced: "host has an Intelligence score")

| Item type | Field path | Records | Values |
| --- | --- | ---: | --- |
| equipment | `system.capabilities.computerIntelligence` | 5 / 142 | 10 ×1, 12 ×2, 14 ×2 |
| equipment | `system.capabilities.computer` | 5 / 142 | `true` ×4, `false` ×1 |
| equipment | `…computerIntelligenceModifier`, `…computerWillDefense` | 5 / 142 | derived-looking companions (INT 12→+1, 14→+2) |
| weapon / armor | any Intelligence field | 0 | — |

* **Contradiction:** the one record with `computer: false` (`Datapad, Basic`) still carries `computerIntelligence: 10`. The flag and the score disagree about whether the item is a computer / has an Intelligence score.
* **Coverage:** 5 of 142 equipment records; zero weapons/armor. Other Intelligence-bearing devices (if any exist) are not represented.
* **Classification:** `EXISTING_EXPLICIT_FIELD` for the four non-contradictory records; `INCOMPLETE_COVERAGE` family-wide; the `computer:false`+score pair is `AMBIGUOUS_MAPPING`.
* **Gap:** an owner ruling on whether presence of `computerIntelligence` alone establishes "has an Intelligence score", and enrichment for any other Intelligence-bearing devices.

### F3. Droid / converted-droid status (Memory Upgrade: "not a droid, including equipment converted into a droid")

* Droid status exists only at **Actor** level (`droids` pack: 194 actors, `type: droid`).
* **No item-level droid flag** exists on any weapon, armor or equipment record. Two `Subelectronic Converter` records exist (`cyber-subelectronic-converter` in `equipment-tech`, `implant-subelectronic-converter` in `equipment-tech` with an implant-phase status); they are the only records whose keys/tags mention droids, and they describe a *conversion device*, not a converted item.
* "Equipment converted into a droid" has no representation anywhere in the Item models.
* **Warning:** an *omitted* droid flag must not be read as "nondroid". Absence is the universal case (142 + 203 + 70 of 415 Items).
* **Classification:** `NOT_REPRESENTED`.
* **Gap:** an explicit per-Item (or per-instance) droid/converted-droid state, or an owner ruling that such hosts are out of scope.

### F4. One-handed handheld operation (Spring Loaded: "held and used in one hand")

| Item type | Field path | Records | Values |
| --- | --- | ---: | --- |
| equipment | `system.capabilities.handheld` | 13 / 142 | `true` ×10, `false` ×3 (comlinks, scramblers, signal/beacon devices, vox-box, panic/holo items) |
| equipment | `system.capabilities.oneHandedOperation` | 1 / 142 | `true` (`Bracer Computer`) |
| weapon | `system.equippable.slot` | 203 / 203 | constant `hand` — uniform, carries no information |
| weapon | `system.traits` / `system.properties` | 203 / 203 | `Two-Handed` ×3 **and** `TwoHanded` ×1 (two spellings of one concept), `Double Weapon` ×11, `Throwable` ×8 |
| weapon | `system.weaponProperties.isTwoHanded/isLight`, `system.wieldedTwoHanded` | defined in `template.json` only | **0** pack records carry them |
| armor | — | 0 | — |

* **Contradictions:** two spellings of the two-handed trait; `template.json` defines structured one-/two-handed fields that no pack record populates; `handheld` (hold) and `oneHandedOperation` (use) are different words and only one record has both.
* **Classification:** `INCOMPLETE_COVERAGE` (13 of 142 equipment; weapons only via free trait strings) with `AMBIGUOUS_MAPPING` (`handheld` ≠ "held **and used** in one hand"; absence of `Two-Handed` ≠ one-handed).
* **Gap:** explicit one-handed-use field on weapons and equipment, and an owner mapping for `handheld`.

### F5. Equipment size category (Dual Gear, Secret Compartment, Storage Capacity, Miniaturized: relative size comparisons)

| Item type | Field path | Records | Values |
| --- | --- | ---: | --- |
| equipment | `system.size` | 142 / 142 | lowercase `small` 125; `medium` 2; `tiny` 1; capitalized `Tiny` 9, `Fine` 3, `Small` 1, `Diminutive` 1 |
| weapon | `system.size` | **0 / 203** | — |
| armor | `system.size` | **0 / 70** | — |

* **Defaults:** `equipment-normalizer.js` writes `size: normalized.size || 'Small'`; `tools/fix-equipment-data.js` writes `size: item.size || 'small'`. The 125 lowercase `small` values cannot be told apart from defaulted values; they are **not** independently verified sizes. The 17 other values (including one capitalized `Small`) name specific categories and are less likely to be defaults, but their upstream provenance is not recorded.
* **Derived substitutes:** `ItemProfileResolver` derives an `objectSize` from **weight bands** when no explicit size exists (fine <1 kg … small <50 kg …), and defaults `weaponSize` to `medium`. These are derived values; they are not source data and they conflict conceptually with an explicit `size` (weight bands are not the SWSE size category rule).
* **Classification:** equipment `small` ×125 → `DERIVED_OR_DEFAULTED`; equipment non-`small` ×17 → `EXISTING_EXPLICIT_FIELD` (provenance unrecorded); weapon and armor → `NOT_REPRESENTED`; resolver outputs → `DERIVED_OR_DEFAULTED`.
* **Gap:** authoritative size for every weapon and armor record, and a provenance marker separating authored sizes from normalizer defaults.

### F6. Actual item weight (Miniaturized, Storage Capacity)

| Item type | Field path | Records | Zero | Absent/null/non-numeric | Mirror agrees |
| --- | --- | ---: | ---: | ---: | --- |
| weapon | `system.weight`, `system.economics.weight` | 203 | 3 (`Combat Gloves`, `Shockboxing Gloves`, `Stunning Gauntlet`) | 0 | 203 / 203 |
| armor | `system.weight` | 70 | 0 | 0 | no `economics` block |
| equipment | `system.weight`, `system.economics.weight`, `system.weightLabel` | 142 | 35 | 0 | 142 / 142; label mismatch 2 (`—` for `0`) |

* **Defaults:** the equipment normalizer coerces unknown weight to `0` (`Math.max(0, parseEquipmentNumber(…, 0))`). A `0` is therefore either a real "negligible" weight or a coerced unknown; the 35 equipment zeros include upgrade items, implants, consumables and two small personal items, and cannot be told apart from defaults.
* **Classification:** weapon/armor non-zero values → `EXISTING_EXPLICIT_FIELD`; every zero → `DERIVED_OR_DEFAULTED`; units are `kg` by convention only (`weightLabel`), no unit field.
* **Gap:** a way to mark a weight as authoritative versus defaulted; resolution of the 3 weapon and 35 equipment zeros.

### F7. Physical containment / attachment capacity (Secret Compartment, Storage Capacity, Dual Gear)

| Field path | Records | Values |
| --- | ---: | --- |
| `system.capabilities.container` | 142 / 142 equipment | `true` ×7 (`Utility Belt` ×2, `Field Kit`, `Hypoinjector Wristband`, `Bandolier`, two holsters), `false` ×135 |
| `system.container.capacity` | 142 / 142 | **`null` on every record** |
| `system.container.contents` | 142 / 142 | **empty on every record** |
| `system.capabilities.{containerSlots, slotCapacityKg, capacityLiters}` | 1–2 | `Bandolier` (12 slots, 0.5 kg), `Bacta Tank (Empty)` (300 L) |
| `system.capabilities.secretCompartment` | 1 | the Secret Compartment *upgrade item itself* |
| weapon / armor | — | 0 |

* The generic capacity and contents structures exist on all 142 equipment records but are **unpopulated**. Capacity, where stated, is in incompatible units (slots, kg, liters) on one or two records.
* "Can contain an object one category smaller" and "carried weight < host weight" are **not computable** from these fields.
* **Classification:** `NOT_REPRESENTED` for host capacity; `INCOMPLETE_COVERAGE` for the sparse unit-specific fields.
* **Gap:** a normalized capacity model (size and weight limits, unit) and populated records; owner decision on whether capacity is derived or authored.

### F8. Restrictable functions (Recognition System: "functions can be restricted to an authorized user")

* `system.restriction` (equipment 142/142: `common` 61, `licensed` 36, `restricted` 20, `military` 13, `illegal` 9, `rare` 3), armor `system.availability` (70/70), weapon `Licensed`/`Restricted`/`Military`/`Illegal`/`Rare` traits are **availability / legal-status categories**. They are not user-authorization or lock fields.
* No field represents "functionality can be restricted to an owner".
* **Classification:** `AMBIGUOUS_MAPPING` for `restriction`/`availability` (name collision with a different concept — must not be used); `NOT_REPRESENTED` for the actual capability.
* **Gap:** owner ruling on which items have restrictable functions, or an explicit field.

### F9. Activatable / remotely activatable functions (Remote Activation)

* Existing activation-adjacent fields: equipment `system.active` (8, all `false`), `system.usage.mode` (`passive` 86, `consumable` 16, `active` 10, `installed` 9, `equipped` 8, `container` 7, `deployed` 2, `attached` 2, `held` 1, `facility` 1), `capabilities.swiftActionActivation` (1: `Computer Spike`), `capabilities.deactivatesOn` (1), `capabilities.remoteActivation` / `discoverActivationCodeDc` (1 each: the Remote Activation upgrade item itself); armor `system.activated` (7); weapons none.
* `usage.mode` describes how an item is *used/carried*, not whether it has a function that can be triggered remotely.
* **Classification:** `NOT_REPRESENTED` for "has a remotely activatable function"; `AMBIGUOUS_MAPPING` for `usage.mode`, `active`, `activated`.

### F10. Added-item relationships (Dual Gear: two compatible items combined)

* No field links one Item to another as a combined/added component. `container.contents` is empty everywhere; the only cross-item references are the V2 instance list (F11) and droid part schemas, which model droid systems, not combined gear.
* **Classification:** `NOT_REPRESENTED`.

### F11. Existing installed-upgrade identities

| Representation | Where | Records | Notes |
| --- | --- | ---: | --- |
| V2 instances `flags['foundryvtt-swse'].customization.installedUpgrades` = `{ instanceId, typedDefinitionId, domain }` | read by `modification-planner.js` (`readInstances`/`inspectInstances`) | **0** pack records | written only at runtime by installs; the contract `typedDefinitionId.endsWith('::' + domain)` is enforced |
| legacy `system.installedUpgrades` | weapons | 15 / 203, all `[]`, with `system.upgradeSlots` (1 ×1, 2 ×13, 3 ×1), `constructible`, `chassisId` | `template.json` also defaults it on `equipment` but 0 pack records carry it |
| `flags.swse.*` (`attunedBy`, `builtAt`, `builtBy`, `canonicalWeapon`) | weapons | 15 / 203 and 203 / 203 | a **different flag namespace** (`swse`) from V2's `foundryvtt-swse`; equipment uses both namespaces |
| `system.capabilities.installed`, `system.installed`, `system.capabilities.install*` | equipment | 12 | install state of cybernetics/implants, not upgrade instances |

* **Contradictory representations:** three upgrade-identity locations (legacy `system.installedUpgrades`, V2 flag instance list, `capabilities.installed`) and two flag namespaces.
* **Classification:** V2 instance list → `EXISTING_EXPLICIT_FIELD` (the one fact G3 already reads, certified shape) but `INCOMPLETE_COVERAGE` for legacy data; legacy field → `AMBIGUOUS_MAPPING` (unmigrated, all empty).
* **Gap:** none for identity itself; reconciliation of the legacy field and namespace is a separate migration question.

### F12. Provenance of the records themselves

* Equipment: `system.source` and `system.sourcebook` on 142/142, `system.page` on **0** (printed pages absent).
* Armor: `system.sourcebook` on 70/70; no `source`, no page.
* Weapons: no `source`/`sourcebook`/`page`; identity/hash provenance via `flags.swse.canonicalWeapon` (corpus `5C.1`, `identityKey`, `recordSha256`) on all 203.
* Consequence: no field in any family records *which source page authorized its value*, so none can be labelled `SOURCE_VERIFIED` in the project's sense without a separate review.

---

## 3. Summary matrix

| Proposed fact family | Weapon | Armor | Equipment | Dominant class |
| --- | --- | --- | --- | --- |
| F1 Power source | `ammunition.type` explicit, 203/203, mapping unreviewed | charges only, no type | 2 cell/pack items (inverse relation) | `AMBIGUOUS_MAPPING` / `INCOMPLETE_COVERAGE` |
| F2 Computer Intelligence | none | none | 5 / 142, 1 contradictory | `EXISTING_EXPLICIT_FIELD` (4) / `INCOMPLETE_COVERAGE` |
| F3 Droid / converted | none | none | none (Actor-level only) | `NOT_REPRESENTED` |
| F4 One-handed use | trait strings only (spelling split) | none | 13 `handheld`, 1 `oneHandedOperation` | `INCOMPLETE_COVERAGE` / `AMBIGUOUS_MAPPING` |
| F5 Size category | none | none | 142/142 but 125 default-indistinguishable | `DERIVED_OR_DEFAULTED` / `NOT_REPRESENTED` |
| F6 Weight | 203, 3 zero | 70, 0 zero | 142, 35 zero | `EXISTING_EXPLICIT_FIELD` with `DERIVED_OR_DEFAULTED` zeros |
| F7 Containment capacity | none | none | `capacity` null ×142, contents empty | `NOT_REPRESENTED` |
| F8 Restrictable function | none | none | none (`restriction` = availability) | `NOT_REPRESENTED` |
| F9 Remote-activatable function | none | `activated` ×7 | none | `NOT_REPRESENTED` |
| F10 Added-item relationship | none | none | none | `NOT_REPRESENTED` |
| F11 Installed identities | V2 flag 0, legacy 15 empty | none | none | `EXISTING_EXPLICIT_FIELD` (V2 shape only) |

---

## 4. What could potentially supply authoritative evidence (subject to owner approval)

* **F11** — the V2 installed-upgrade instance list is the only already-certified host fact.
* **F2** — four equipment records with consistent `computerIntelligence` + `computer: true`.
* **F6** — non-zero weapon, armor and equipment weights (mass only; unit by convention).
* **F5** — the 17 equipment sizes that are not the `small` value, pending a provenance marker.
* **F1 (weapons)** — `ammunition.type`, only after an owner-approved mapping of its values.

## 5. What needs normalization, enrichment or explicit review

* Size for every weapon and armor record (F5), and a defaulted-vs-authored marker for equipment size and weight (F5, F6).
* Capacity model and data (F7).
* Item-level droid / converted state (F3), if such hosts are in scope.
* One-handed use field and trait-spelling unification (F4).
* Power-source declaration for armor and equipment, and the weapon value mapping (F1).
* Restrictable-function and remote-activation capability fields (F8, F9).
* Added-item relationship model (F10).
* `Datapad, Basic` flag/score contradiction (F2).
* Legacy `installedUpgrades` / flag-namespace reconciliation (F11).

## 6. Proposed adapter strategy (design only, nothing implemented)

1. Introduce no new item schema in this checkpoint. A future **read-only item-fact adapter** would map existing paths to named facts and return, for each fact, `{ value, state, origin }` where `state ∈ {explicit, defaulted, absent, contradictory}`.
2. The adapter would never fabricate: `defaulted`, `absent` and `contradictory` inputs produce `not_established` downstream, not `legal`/`illegal`.
3. Each fact family above gets its own owner-approved mapping and certification before any evaluator may rely on it. A family classed `NOT_REPRESENTED` or `AMBIGUOUS_MAPPING` blocks only the typed definitions that need it; unrelated definitions are not held hostage.
4. Authored-versus-defaulted markers (F5, F6) and any missing data (F7 and others) require a **separate authorized data task** with its own diff and review. This census does not request or perform it.
5. Free-text `behavior` in the 35 records must not be parsed to build any of the above.

## 7. Items not examined

* Vehicle and starship Items, lightsaber-component packs and droid-system parts (outside the 35 host domains).
* Runtime, world-document and Foundry-loaded state (this census is static pack analysis; behavior in a running Foundry instance is `FOUNDRY_TESTED`-pending).
* Source-book text; no rule was read from a book in this checkpoint.

## 8. Non-effects

No file other than this document and `d-005-t4-host-eligibility-contract.md` is changed by T4. Registry v1.5, its manifest and companion markdown, `specification-records-v1.json`, `status-ledger-v1.json`, `runtime-definitions-v1.5.json`, the decisions register, production code, Item models, compendium data, tests and `PINNED_SCOPE_SHA256` are untouched.

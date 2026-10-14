# v1.5 - Official Web Enhancement 1: The Tech Specialist

**Pass status:** `WEB_ENHANCEMENT_1_SOURCE_COMPARED_FURTHER_WEB_CATALOG_PENDING`. One original Wizards web enhancement verified against its later printed reprint; **this is NOT an exhaustive audit of every official web article**.

**Cumulative authority:** **186 definitions** (185 prior + 1 temporary talent-based weapon modification), **57 procedures** (56 prior + 1), **128 mechanically source-verified definitions**, **0 runtime-certified**. The existing **nine Tech Specialist traits were not duplicated**.

## Publication identity and precedence

- Original article: *Saga Edition Web Enhancement 1 - The Tech Specialist*, Rodney Thompson, **June 21, 2007**. Although appended to the supplied `Star Wars Saga Edition.pdf` at **PDF physical pp.289-294**, it is a **separate official web publication**, not printed Core Rulebook pages. Original source authority visually checked at **PDF pp.289-292**, corresponding to **article pp.1-4**.
- Later reprint: *Starships of the Galaxy*, **printed p.21** (supplied **PDF p.22**), for Tech Specialist feat/table; **printed pp.16-17** (PDF pp.17-18) for the Outlaw Tech talent tree. Later text controls where it differs.
- Publication-date precedence is established by the original dated article and its internal promise of a forthcoming sourcebook, plus the later printed reprint. Do not label the feat as a Core Rulebook addition.
- Nine in-scope Tech Specialist names and basic effects were already recorded as `sog-tech-*`. **Only `source.reprintRelationship` metadata changed on those nine records**, to resolve the prior provenance lead. All other 176 old definitions and all 56 procedures remain structurally unchanged.

## Material original-vs-reprint differences

| Mechanic | Original Web Enhancement 1 | Later *Starships of the Galaxy* | Certification action |
|---|---|---|---|
| **Selective Fire** | Switch between single-shot and autofire on eligible ranged weapons, without a blast/splash exclusion in the original paragraph | Adds **no burst-radius or splash-radius weapons** | Use the later restriction. Existing `sog-tech-selective-fire` conditions **already** block both categories; source provenance is now closed. |
| **Improved Durability** | +1 object DR and extra HP equal to **one-quarter of base device HP** | +1 object DR and extra HP equal to **one-quarter of maximum device HP** | Use later maximum-HP wording. Existing typed rule uses baseline maximum HP, excluding the trait's own bonus to avoid recursion. |
| Tech Specialist prerequisites, cost, work time, Mechanics DC, one-benefit cap, market value | Trained Mechanics; max(10% item cost, 1000 cr); 1 day / 1000 cr; DC20; no take 10/20; one benefit unless exception; market value base + twice successful modification spend | Substantially same for in-scope hosts | Reuse existing `sog-tech-specialist-trait-work`; no second mechanic or pool. |
| In-scope Tech Specialist trait count | 3 armor + 3 device + 3 weapon | 3 armor + 3 device + 3 weapon | **Zero duplicate definitions**; 3 droid and 3 vehicle benefits remain outside this project. |

## New source-certified temporary weapon effect

**`web-outlaw-tech-personalized-modifications` - Personalized Modifications, Outlaw Tech scoundrel talent**, original article p.2 (PDF p.290); later *Starships* printed p.17 (PDF p.18).

- **Action:** standard action by character with the talent to tweak a **powered weapon they currently wield**; includes power-cell weapons and weapons connected to a larger power source.
- **Effect:** until **end of encounter**, the activating character gains **+1 equipment bonus to attacks** and **+2 equipment bonus to damage** with **that specific weapon**. Do not globalize across their weapons or all wielders.
- **Type and stacking:** Both bonuses are explicitly **equipment** type. Observe normal type-based stacking. No assumption of unlimited cumulative bonuses from repeated activation.
- **Procedure:** `web-outlaw-tech-personalized-modifications-action`. The talent does **not** require a Tech Specialist feat job, DC20 work check, fabrication payment, or Scum upgrade slot; a standard action is its printed activation cost.
- **Scope:** Personal weapons only in this registry. The printed source also allows connected ship/vehicle weapons, which remain in their respective separate refactors.
- **Persistence:** Temporary keyed actor + weapon instance + encounter expiry; **no permanent weapon data mutation**. Consumers and expiry are not production certified.

The article's **Fast Repairs**, **Quick Fix**, and **Hot Wire** are also reprinted in *Starships*. They are a jury-rig/repair enhancement or actor computer-use substitution, **not additional purchasable generic equipment upgrades**; no duplicate definition or Tech Specialist trait was invented. The Fast Repairs wording states that when one jury-rigs an object or vehicle, *the vehicle* receives temporary hit points; the ambiguous object applicability is **not resolved here**.

## Repository reconciliation findings

- `scripts/engine/customization/tech-specialist-modification-service.js`: nine printed traits are represented, but an **Additional Upgrade Slot** Tech Specialist device choice is also in the service. Neither the original web table nor the *Starships* p.21 table authorizes that extra row; leave **unlicensed by these sources**, pending independent source proof.
- The service's **Selective Fire** description omits the burst/splash exclusion. The published eligibility must be enforced by authoritative host validation; raw descriptive text or a simple Boolean mode toggle is not proof of eligibility correctness.
- The service's **Improved Durability** description already follows *Starships* maximum-HP wording, but source phrasing alone does not certify actual maximum-HP modification and removal consumers.
- The **Personalized Modifications** talent identity is present in talent references; no actor/weapon activation-to-consumer-to-expiry pipeline was proven. Route through the existing talent, roll and effect authorities; do not introduce a competing modification engine.

## Implementation gates and completeness limits

1. Preserve all 185 old definitions' mechanical fields unchanged. Only the nine Tech Specialist source-provenance maps are certified metadata changes. All 56 existing procedures remain identical.
2. The original article's nine in-scope Tech Specialist entries and its three droid/three vehicle entries create **zero new Tech Specialist definition identities**.
3. Enforce *Starships* later wording for burst/splash Selective Fire eligibility and Improved Durability maximum-HP baseline. Validate no recursive HP growth.
4. Ensure Personalized Modifications is **talent/actor/selected powered weapon only**, +1 equipment attack / +2 equipment damage, standard-action activation, end-of-encounter expiry; no generic slot/work-feat debit.
5. No producer, consumer, stacking, expiration, removal or rollback is fully runtime-certified. **Do not promote SOURCE_RULES_CERTIFIED to FULL_CERTIFIED**.
6. Web Enhancement 1 is reviewed; further official web articles remain a **separate scope scan**, not silently classified as empty.

**Audit verification:** PDF pages rendered, original and later trait tables compared, 9 provenance updates limited to `source.reprintRelationship`, 176 other prior definitions exactly unchanged, all 56 procedures unchanged, new definition and procedure IDs unique, all 186 definitions stay domain restricted, JSON/ZIP valid.

---

# Previous rolling authority (v1.4, preserved verbatim below)

# v1.4 The Unknown Regions — targeted modification authority pass

**Disposition:** `TARGETED_EQUIPMENT_SCAN_NO_NEW_GENERAL_MODIFICATION_OPTIONS_FOUND`. This book contributes **zero new modification definitions and zero procedures** within the ordinary-weapon, armor and equipment audit. Previous totals remain **185 definitions, 56 procedures and 127 source-verified mechanical definitions**. **Zero are fully runtime-certified.**

**Audit boundary:** The supplied 226-page sourcebook was keyword-searched through its embedded text and `Unknown Regions_djvu.txt`. Printed Chapter II equipment pp.36–42 and selected character rule pages were visually inspected. **This is a targeted audit, not a claim of exhaustive page-by-page visual review.** Printed page N corresponds to PDF physical page N+1 in checked locations.

**Domains:** Keep `WeaponModificationDefinition`, `ArmorModificationDefinition` and `EquipmentModificationDefinition` distinct. No new upgrade slots, generic applicable traits or item installation transactions are derived from NPC stock gear, species traits, ships, droids or equipment that merely connects to another device.

## Core source finding — existing rules, not new ones

Printed **p.42**, *Ancient and Advanced Technology*, expressly recommends using existing rules instead of making new item systems:

| Situation | Printed reference | Registry interpretation |
|---|---|---|
| Unusual advanced weapons or technology | **Tech Specialist** (*Starships of the Galaxy*, p.21) | Reuse existing nine Tech Specialist benefits and established feat prerequisites; no extra generic slot or automatic bonus. |
| Unusual advanced weaponry | **Rakatan Weapon template** (*KOTOR Campaign Guide*, p.79) | Cross-reference existing KOTOR template; do not create a second same-name record or stack it twice. |
| Outdated weapons | **Antiquated Weapon template** (*Legacy Era Campaign Guide*, p.100) | Cross-reference the indexed Legacy template and its own ammunition/repair restrictions. |
| Advanced/Archaic ships and antiquated vehicles | *Starships of the Galaxy* and *Legacy Era* ship/vehicle templates | **Explicitly excluded** from this ordinary gear authority. |

This section provides narrative guidance for GMs. **It does not provide a new named upgrade, independent slot cost, new Tech Specialist trait or new template implementation recipe.** A GM's hypothetical advanced-technology bonus cannot be copied into the production catalog without the base feat/template source rules.

## Examined equipment and scope boundary

| Printed page(s) | Candidate | Determination |
|---|---|---|
| **15** | Sluissi **Careful Worker** (+10 circumstance to Mechanics after twice normal task time) and trained-Mechanics conditional **Tech Specialist bonus feat** | Actor skill and feat eligibility, **not an item modification**. Apply any crafting/cost effect only by the existing feat and actor authority. |
| **18** | Near-Human **Biotech Augmentation / Cultural Cybernetics** traits | Species/body augmentations. Exclude from normal weapon/armor/gear upgrade catalogs. |
| **36–39** | New melee and ranged weapons, including blastsword, electropole, Squib tensor rifle | Finished **weapon identities**. No generic transfer of their capabilities as retrofit options. |
| **40** | Table 2-3 Explorer Equipment (20 listed independent items) | **Stock inventory**. Prices are purchase costs, not upgrade/installation costs. |
| **40** | Antidote Synthesizer | Independent medical equipment with its own sample-processing procedure; not a reusable upgrade applied to another device. |
| **40–41** | Hypoinjector Wristband | Standalone medical device with internal dosage storage and bioscanner; refill instructions are not an installable upgrade recipe. |
| **40** | Emergency Vacuum Seal | Starship breach repair tool; starship machinery/repair outside project scope. |
| **41** | Personal Multitool | Inherent vibroblade in stock tool; does not authorize generic vibroblade mounting on arbitrary gear. |
| **41** | Repulsor Hitch | Stock 100-credit towing device affixed to cable/extension; can also be mounted on MULE droid chassis. Not a Scum slot upgrade for general equipment. **Droid host excluded.** |
| **42** | Signal Wand's optional external power feed | Conditional mode of the finished transmitter; no published permanent modifier slot, installation cost or upgraded host eligibility. |
| **42** | War Saddle and Shipsuit | Stock rider/clothing qualities; no published transferable armor upgrade. |
| **42** | Ancient and Advanced Technology paragraph | Cross-references existing published feat/template mechanisms only; no new definitions. |

### Source-to-repository content discrepancies (separate stock-equipment track)

| Source | Existing repository example | Verified printed rule | Action |
|---|---|---|---|
| **Antidote Synthesizer, p.40** | `packs/equipment-medical.db#medical-antidote-synthesizer` states that a **DC 20 Treat Injury** check creates antidotes. | Feed a poison/toxin sample; **1d6 rounds** yields **1d4 doses**; each dose supplies **+2 to the Treat Injury check for that toxin**. Further doses require a new toxin sample. No DC20 manufacturing check is specified. | Correct producer-backed **stock item content** under separate equipment canonicalization; do not add a Workbench modification. |
| **Hypoinjector Wristband, pp.40–41** | `packs/equipment-medical.db#medical-hypoinjector-wristband` states **3 doses** and a **swift-action trigger**. | **8 doses** and a bioscanner-driven response to foreign chemicals; refill with **one standard action per dose or four rounds all at once**; two energy cells sustain **five days continuous use**. | Correct source item data; no additional item upgrade or invented swift-action operation. |

These mismatches are **not counted in the modification registry** and have **not been changed** in production packs. The original generator/store authority must be located before any correction.

## Claude implementation and acceptance gates

1. Preserve **all 185 definitions and all 56 procedures** from v1.3 by exact structural equality. No new installed upgrade definition is authorized by this book.
2. Keep **Tech Specialist**, **Rakatan Weapon**, and **Antiquated Weapon** as cross-book references to their original rule identities; no duplicates, unknown prices, free bonuses or unrelated template stacking.
3. Resolve Sluissi's conditional bonus feat and Careful Worker through **actor/progression/skill** logic; do not write +10 directly onto an item or treat doubled task time as a separate install service.
4. Do not convert a cable-mounted hitch, charger-powered wand, hybrid multitool or shipsuit storage into an ordinary slotted upgrade without a source-approved retrofit procedure.
5. Keep near-human cybernetics and all vehicle, starship, and droid modification procedures in their separate authorities.
6. Record the two **stock gear description** conflicts as separate canonical-content defects; never present these as source-certified modification effects or automatically patch generated packs.
7. All **185 definitions remain production gated** until source text, producer, item storage, effective resolver, consumer, removal and tests are certified. Prior detailed *Scum and Villainy* rules and official web enhancement provenance are still open.

**Book audit result:** `0` new in-scope definitions, `0` new procedures, `12` evidence examples, `2` separate stock item content discrepancies. Cumulative: **14 sourcebooks scanned, 185 definitions, 56 procedures, 127 source-rule-verified effects, 0 fully certified runtime definitions.**

---

# Prior rolling authority (v1.3, preserved verbatim below)

# v1.3 Galaxy of Intrigue — targeted modification authority pass

**Disposition:** `TARGETED_EQUIPMENT_AND_COMPONENTIZATION_RULES_SOURCE_VERIFIED_RUNTIME_PENDING`. From 181 prior definitions and 53 procedures, this pass adds **4 distinct source definitions** (2 Componentization variants, 1 muzzle accessory, 1 holoprojector module) and **3 documented procedures**, yielding **185 definitions and 56 procedures**. Source-verified effects are now **127**. **No modification is runtime-certified or approved for implementation.**

**Scope:** ordinary weapon, armor and equipment modifications only. No droid, vehicle or starship hardware. New stock weapons and consumables are not automatically converted into upgrade definitions. Keep `WeaponModificationDefinition`, `ArmorModificationDefinition`, and `EquipmentModificationDefinition` separate and uphold one centralized slot authority.

**Primary evidence:** *Galaxy of Intrigue*, printed pp. 64–68 (the supplied PDF is printed page N +1 at checked locations); supplied `Galaxy of Intrigue_djvu.txt` used as fast searchable index, printed PDF pages rendered and visually verified, especially **PDF pages 67–69**. This is a targeted Chapter III + sourcebook keyword audit, **not** exhaustive page-by-page certification of all 226 PDF pages.

## Source-certified modifications

| Source identity | Domain / printed page | Slot cost | Purchase price | Certified rule |
|---|---|---|---|---|
| **Componentization (Basic)** | Weapon or gear; p. 68 | **1 general slot** | **Not stated** | Disguises one item as **2 pieces**, each **1 size category smaller**; **1 full-round action** to assemble. |
| **Componentization (Deluxe)** | Weapon or gear; p. 68 | **2 general slots** | **Not stated** | Disguises one item as **4 pieces**, each **2 size categories smaller**; **2 full-round actions** to assemble. |
| **Flash Suppressor/Silencer** | Weapon accessory; p. 66 / Table 3-2 | **Not specified** (accessory, not assigned Scum slots) | **400 credits**, 0.2 kg | Fits muzzle of any **Small or larger slugthrower**. Observers take **−10 to Perception** to hear firing or see muzzle flash; **maximum range loses two range increments**. |
| **Holo Converter** | Equipment attachment; p. 66 / Table 3-2 | **Not specified** (physical device) | **3,000 credits**, 2 kg | Attached to **holoprojector**, supports up to **10 preset false personae**, changes transmitted face/voice (including apparent gender/species), and grants **+5 equipment bonus on remote Deception** to convince recipient user is someone else. |

**Shared Componentization identification rule:** A disguised component is identifiable by **DC 30 Perception or DC 25 Knowledge (technology)**. Basic and Deluxe are **alternatives**, not two additive installations. They must not duplicate the owned Item, change item size permanently, or silently create independent weapons with live combat statistics. Source description covers gear or weapons; any armor installation requires an explicit host-domain eligibility review, not an unreviewed automatic grant.

### Costs and mechanical categories are not interchangeable

- Componentization has **printed slot counts but NO printed monetary price**. Current `data/upgrades/universal-upgrades.json` and `upgrade-catalog.js` use `cost:0`; this is **unverified price data**, not evidence the printed upgrade is free. Never silently execute zero-price transactions.
- Flash Suppressor/Silencer appears in the book's **Weapon Accessories** table, not as a slotted universal enhancement. Its `upgradeSlots:0` value in the repository must not be treated as a specific published statement that it is a free-slot universal blaster upgrade. Both the attach/detach action cost and any slot charge are **not printed here**.
- Holo Converter is an **owned physical addon**. It needs an actual holoprojector and a valid outgoing transmission, not a global, permanent +5 Deception actor bonus. Do not conflate an equipment-bonus type with an untyped bonus, nor add up multiple equipment bonuses indiscriminately.

## Repository reconciliation / Claude correction targets

| Existing source | Observed repository state | Printed authority and required action |
|---|---|---|
| `scripts/engine/customization/upgrade-catalog.js#componentization_basic/deluxe` | Correct slotCount 1/2; `cost: 0` and vague descriptions. | Add 2/4 pieces, 1/2 steps smaller, 1/2 full-round actions, DC 30 Perception / DC 25 Knowledge (technology). **Cost not specified**—do not canonize 0 as free. |
| `data/upgrades/universal-upgrades.json#upgrade-componentization-basic/deluxe` | Correct nominal slots, generic descriptions, `cost:0`. | Repair at canonical producer after policy/source decision; never patch generated packs or transform owned state in place. |
| `scripts/engine/customization/upgrade-catalog.js#flash_suppressor_silencer` | Declares `appliesTo:['blaster']`, and `requires:['ranged']`. | Wrong host category: **Small-or-larger slugthrowers** only. Apply the actual −10 observer Perception and −2 maximum range increments. |
| `data/upgrades/weapon-upgrades.json#upgrade-flash-suppressor-silencer` | Catalogued at 400 credits, `upgradeSlots:0`; lacks operational range/observer rules. | 400 credits verified, **generic slot cost unprinted**. Preserve separate accessory identity; no silent zero-slot universal eligibility. |
| `packs/equipment-comlinks.db#comms-holo-converter` | Described as converting transmission into holographic output / generic holo data capability. | **Incorrect mechanics.** It changes existing holographic persona and voice, stores up to 10 personae and grants the specific remote +5 Deception bonus. Trace producer and repair upstream, not the compiled pack. |

No live producer→storage→resolver→consumer→removal/rollback trace has been certified. Any production application requires that trace, domain-specific contracts, Foundry V13 smoke tests, item split/merge safety and rollback validation.

## Other Chapter III equipment — exclusions and cross-references

| Page | Item | Disposition |
|---|---|---|
| 64–65 | Wrist blaster, snare pistol, darter, Xerrol nightstinger | **Stock weapons**, not general installable upgrades. |
| 67 | Redirection Crystal (500 credits) | **Disposable independent tactical tool**, not a lightsaber focusing crystal or installed weapon upgrade. Redirects shot through special targeting sequence; destroyed upon use. |
| 67 | Shield Cage (10,000 credits) | **Standalone trapping equipment**. Multiple independently bought cages may be linked to increase trapped area; not a general upgrade template or extra slots. |
| 67 | Surveillance Tagger (450 credits) | **Independent beacon dart weapon/tool**, attached to target with an attack; not permanent modification of the firing equipment. |
| 67 | Vid-Vox Scrambler (3,400 credits) | **Independent portable jammer**, not an attachment giving every commlink a shared passive upgrade. |
| 66 | Comlink, Earbud and Panic Ring | **Standalone purchased gear**, not automatically attachable upgrades for other Items. |

## Procedures added

1. `goi-componentization-assembly-and-identification` — applies known disassembly variant only to supported host Item; maintains link between disguised pieces and original item; tracks 1/2 full-round reassembly and the printed identification checks.
2. `goi-weapon-accessory-attachment` — only Small-or-larger slugthrower, 400-credit physical accessory, observer sensory penalty and max-range decrement; no unprinted slot rule.
3. `goi-holo-converter-host-configuration` — holoprojector attachment and ten preset personae, with conditional remote +5 Deception and existing equipment-bonus stacking.

## Acceptance gates

- Preserve **all 181 pre-v1.3 definitions and all 53 procedures** by exact equality; new IDs remain unique; JSON is validated.
- Keep remaining sourcebook scans open: **The Unknown Regions** and **official web enhancements**. Earlier book targeted scans, particularly *Scum and Villainy* detail certification, are **not complete implementation approval**.
- Prevent ordinary blasters, Tiny slugthrowers, vehicles and droids from receiving the suppressor through a generic weapon selector.
- No component price invented; no unlimited free Componentization; no item duplication on disguise, assembly or undo. Alternate versions must not stack.
- No Holo Converter benefits when host lacks a holoprojector, and no bonus to unrelated social checks.
- Preserve separation of normal upgrade-slot pool from crystals, lightsaber accessories, procurement benefits and Tech Specialist traits.
- **Source-verified does NOT mean live implementation-ready. All 185 records remain production-gated.**

---

# Prior rolling authority (v1.2, preserved verbatim below)

# v1.2 Scavenger's Guide to Droids — scope-only sourcebook pass

**Disposition:** `TARGETED_SCOPE_SCAN_NO_NEW_GENERAL_EQUIPMENT_MODIFICATION_OPTIONS_FOUND`. This book is a **zero-new-definition** pass. The previous **181 modification definitions** and **53 procedures** are intact, and **123 source-verified effects** remain unchanged. **No runtime modification is certified.**

**Scope:** Only upgrades installable on ordinary weapons, armor and general equipment. Installed droid appendages, chassis armor, processors, locomotion, accessories, stations, variant droid builds and droid programming modifications are intentionally assigned to a **separate droid refactor**. Vehicle, ship and station systems likewise remain excluded.

**Primary evidence:** *Scavenger's Guide to Droids*, printed pp. 49, 51, 54, 58–60 and 63; supplied PDF has printed page **N** on PDF page **N+1** in the checked section. The whole 162-page PDF was text-searched and Chapter III equipment pages were visually inspected. This is a *targeted scope scan*, not full page-by-page visual certification of all droid model recipes.

## Source boundaries and findings

| Printed page | Candidate | Classification | Registry disposition |
|---|---|---|---|
| 49 | Droid brain attached to an existing computer | Droid processor integration | **Exclude.** Do not mislabel as general equipment upgrade or consume ordinary slots. |
| 51 | Chapter III definition of droid equipment | Rules-domain boundary | Most installed accessories are *droid systems*, governed by droid modification rules. A carried possession is different from an integrated system. |
| 54 | Table 3-1 Droid Armor | Droid chassis armor | **Exclude.** Not a general armor template for wearers. |
| 58–59 | Table 3-2 Droid Accessories | Droid component catalog | **Exclude.** Appendage, locomotion, processor, sensors, shields and other droid hardware belong to droid install authority. |
| 60 | Micro Shield | Droid appendage gear / independently sold handheld model | **Standalone equipment lead only.** Handheld availability does not turn it into a modification for existing armor or weapons. |
| 60 | Multifunction Apparatus | Multi-tool/weapon holder on droid appendage | **Exclude.** Does not grant generic extra weapon attachment points or upgrade slots. |
| 63 | Taser | Standalone weapon | **No new modification.** Catalog independently as a weapon if needed; do not create an installable taser upgrade. |
| 63 | Weapon Detector | Droid sensor package | **Exclude.** Its detection mechanics attach to the droid, not to a weapon's own capability. |
| 63 | Droid stations | Droid control/maintenance infrastructure | **Exclude.** Fixed installations are outside the three modification schemas. |

## Additional exclusions and governance

Printed pp. 65 onward include advice about adjudicating droid modifications and numerous stock-droid alternate-build recipes; those are chassis/programming or installed droid equipment operations and **not transferrable to generic gear**. No new modification costs, capacities, effects or installation/rollback procedures for ordinary weapons, ordinary armor or normal equipment can be inferred from the droid table prices. Even a droid carrying a normal weapon or an equipped force shield does not make the carried item a modified weapon or armor.

### Repository reconciliation boundary

Current `scripts/domain/droids/droid-part-schema.js` and `scripts/data/droid-systems.js` are existing **droid-specific** references for later audit, not alternate sources of published non-droid modification authority. Existing weapon/equipment packs can separately catalogue Taser, Micro Shield and droid brains where appropriate, but **no new Workbench upgrade IDs or new universal slot entries** should be generated from this book. Cross-references are research leads only; no installed effect consumer or return path was certified in this pass.

### Follow-up implementation gates

1. Preserve all **181 preceding definitions** and **53 procedures** without change; no new entries or changed source rules.
2. Keep droid-only accessories out of `WeaponModificationDefinition`, `ArmorModificationDefinition`, and `EquipmentModificationDefinition`; do not duplicate droid customization services or stock droid armor definitions.
3. Treat portable/handheld Micro Shield and Taser as *stock gear identities*, not persistent retrofits or slot-granting qualities.
4. Reject any automated general upgrade created solely from a droid-only table row. Demand explicit printed non-droid host eligibility before expanding scope.
5. This targeted pass is sufficient to move to the next sourcebook, not to claim exhaustive verification of all 162 PDF pages.
6. No Foundry implementation, generated compendium edit, repository commit or push is part of this source-only audit.

---

# v1.1 certified sourcebook addendum: Galaxy at War

**Scope:** Targeted Chapter II *Hardware* source scan against printed book pp. 40–50, plus searchable text search. **Three** new source-verified definitions, **five** new procedures and **five** stock armor chassis capacity exceptions. No droid, vehicle or starship modification rules are included. This is not a full page-by-page certification of the book. All runtime implementation remains **BLOCKED**.

## New modification definitions

| Canonical definition | Published page | Host | Source rule | Implementation disposition |
|---|---:|---|---|---|
| `gaw-ion-shielding-cybernetic-prosthesis` | 48, 50 | Standard cybernetic prosthesis only (equipment subtype) | 1,000 credits, 1 upgrade slot; conditional actor ion-damage classification only if **every** cybernetic enhancement is shielded | Source rule certified; host, aggregate and removal consumers pending |
| `gaw-stun-cloak-all-temperature-cloak` | 45 | Stun Cloak only | Doubled total cloak price (3,500 -> 7,000 credits); includes all-temperature cloak capabilities (Core p.138) | Source rule certified; referenced gear effect adapter pending |
| `gaw-stun-cloak-camouflage-poncho` | 45–46 | Stun Cloak only | Same 7,000-credit total; includes camouflage poncho capabilities (GAW p.46) | Source rule certified; referenced gear effect adapter pending |

**Stun Cloak guardrail:** The base Stun Cloak still inflicts 3d8 **stun** damage in its printed grapple interactions. The new choices are special book-authorized alternatives, **not** ordinary Scum armor upgrades; source p.45 prohibits those. Nothing authorizes stacking both enhancements simultaneously. No upgrade-slot price is printed for these alternatives: do not invent 0 or 1.

## Five specific armor chassis source facts (printed pp.44–45)

| Published stock armor | Factory-installed named upgrades | Available **additional** upgrades | Source printed page |
|---|---|---:|---:|
| Barabel Microbe Armor | No named preinstallation | 2 | 44 |
| Camo Scout Armor | Shadowskin | 1 | 44 |
| Katarn-Class Commando Armor | Vacuum Seal | 3 | 44 |
| Marine Armor | Aquatic Adaptation, Vacuum Seal | 1 | 45 |
| Stalker Armor | No named preinstallation | 3 | 45 |

**Important:** These numbers are source-defined *free additional upgrade allowances when Scum and Villainy armor upgrades are enabled*. Do not blindly add them to medium/light armor defaults, nor treat each built-in function as a freely removable one-slot upgrade. Preserve published installed identity (`Shadowskin`, `Vacuum Seal`, `Aquatic Adaptation`) independently from the remaining capacity. Before computing total capacity, reconcile exact Scum name/cost correspondence (especially singular `Vacuum Seal` vs table `Vacuum Seals`); never double-count the factory upgrades.

**Existing pack IDs traced (read-only):** `armor-microbe-armor`, `armor-camo-scout-armor`, `armor-katarn-class-commando-armor`, `armor-marine-armor`, and `armor-m110-stalker-armor` in `packs/armor*.db`. No generated compendium edit performed.

## Cybernetic prosthesis-only upgrade rules (pp.48–50)

A standard prosthesis counts as **equipment** under optional *Scum and Villainy* modification rules. It has **one free upgrade slot** and is **two size categories smaller** than the wearer. Only these universal upgrades can be used on it: Cloaked, Dual Gear, Environmental Sealing, Extra Power Source, Secret Compartment, Storage Capacity, and the book-specific Ion Shielding. Unique cybernetic systems cannot use upgrades, have **zero available slots**, and cannot reclaim slots. This is a cybernetics-host adapter, **not** authorization to operate droid upgrades or build an implant engine.

**Ion Shielding:** 1 slot, 1,000 credits, standard cybernetic prosthesis only. When all installed cybernetic enhancements on an actor are shielded, the creature is not considered cybernetically enhanced **for the purpose of taking ion damage**. When *any* enhancement is unshielded, there is **no benefit**. This is *not* a generic immunity to ion damage. In particular, unique unmodifiable cybernetics cannot silently count as shielded.

**Confirmed repository defect:** Current `scripts/engine/customization/upgrade-catalog.js` `ion_shielding` reports `appliesTo: ['weapon','blaster','armor','gear']` with category `universal`. Published GAW p.50 states the **only permitted host is a cybernetic prosthesis**. Code should narrow the eligibility through its existing authority and add the actor-wide consumer through existing cybernetics/damage contracts after production review; do not silently mutate the catalog.

## Separate configuration procedures (not ordinary slot upgrades)

| Procedure ID | Source | Source behavior |
|---|---|---|
| `gaw-stun-cloak-special-variant-purchase` | p.45–46 | Single special purchase option at doubled price, inherited cloak/poncho capabilities |
| `gaw-cybernetic-prosthesis-modification-gate` | pp.48–50 | One-slot prosthesis-specific allowlist and unique cybernetic ban |
| `gaw-ion-shielding-aggregate-status` | p.50 | Actor condition derived from **all** installed shielded cybernetic enhancements |
| `gaw-mine-detonator-and-linking` | pp.42–43 | Mine timer/manual trigger references TFU pp.100–101; attaching overrides built-in trigger. Tripwire DC 10 Mechanics; additional DC 10 per linked antipersonnel mine |
| `gaw-detonite-cord-reel-splicing` | p.43 | 6-square reel, 1,000 credits, 4d6 energy damage; splicing reels; explosion 1-square radius per occupied square; timed/manual trigger; +5 equipment bonus to relevant object-DR-ignore Mechanics check |

**Stock item boundary:** The DC-17m ICWS mode changes and sniper/anti-armor attachments are published features of *that weapon*, not universal modular upgrades. The Triangulation Visor is standalone head-worn equipment, not an installable ranged-weapon scope. Detonite Cord is a purchasable explosive with configuration mechanics, not an equipment upgrade item. The Katarn armor's wrist-mounted vibroblade is a preinstalled chassis component, not a published general installation option.

## Claude implementation gate / acceptance checks

1. Verify every armor model's factory-installed upgrade identity and explicitly printed *additional* free space. Never add generic base slots twice. All modifications route through the proposed centralized `ModificationSlotAuthority`.
2. Stun Cloak may choose exactly one published special enhancement at **7,000 credits total**, retaining its 3d8 stun grapple interaction. Standard Scum Armor Upgrades on the cloak remain illegal.
3. Prosthesis allows only the seven source-permitted options; **Ion Shielding must be rejected** on ordinary weapons, armor, and nonprosthesis gear notwithstanding the currently broad catalog. One occupied slot per shielded prosthesis.
4. A creature with all eligible cybernetic enhancements shielded has special ion damage handling; adding or removing one unshielded enhancement toggles the conditional derived status. Do not grant blanket ion immunity.
5. Unique cybernetic components do not have upgrades or reclaimable slots; do not cross into the separate droid/vehicle/ship refactors.
6. Mines and detonite cord require separately tested explosive-state procedures, not generic upgrade-slot mutation.
7. Source-proof and consumer-proof remain separate: **zero** runtime-certified definitions. Do not auto-promote a source-verified record into an executable modifier or change canonical packs without production authorization.

**QA (v1.1):** v1.0 definitions 178/178 and procedures 48/48 preserved identically; new source entries 3, new procedures 5, complete registry 181 definitions and 53 procedures, 123 source-verified mechanical entries, zero runtime-certified.

---

# v1.0 certified sourcebook addendum: Jedi Academy Training Manual

**Update date:** 2026-10-13. **This file is rolling**: the complete v0.9 narrative remains below. Definitions/procedures are machine-readable in `SWSE_Modification_Rolling_Authority_v1.0.json`.

**Book and method:** *Jedi Academy Training Manual*, rendered source pages printed pp.19, 21–22, 53–62 and 68; searched supplied OCR/TXT and visually verified relevant page images (PDF page = printed page + 1). **Targeted rule pages only**, not a declaration that the entire book has been exhaustively audited.

**Preservation:** Prior 139 definitions remain, including 8 KOTOR crystal identities and one KOTOR Sith Talisman updated **only** with JATM cross-publication references. Prior 35 procedures remain unchanged (one was already a Jedi Academy construction procedure). New 39 definitions and 13 procedures. **Current total: 178 definitions, 48 procedures.** 0 runtime-certified.

## Category reconciliation

| Canonical category | In JATM | Already from KOTOR | New identities added | Accounting |
|---|---:|---:|---:|---|
| Focusing crystals, Table 3-3 p.55 | 28 | 8 | **20** | Active crystal socket / chassis mode, NOT generic slots |
| Lightsaber accessories, p.60 | 10 | 0 | **10** | Special construction allowance / explicit talent exceptions; generic slot cost *unspecified* |
| Sith Alchemy Specialist, Table 1-1 p.22 | 7 in-scope weapon/armor | 0 direct trait identities | **7** | Single alchemy-benefit/item, separate from slots |
| Sith Amulet construction and Rapid Alchemy, pp.21,68 | 2 | 0 (KOTOR Talisman separately cross-referenced) | **2** | Separate wearable item and temporary weapon talent; neither generic slot budget |
| Sith abomination traits, same table | 3 | — | **0** | Creature modification excluded |
| Dark armor manufactured chassis, p.61 | 3 weights | — | **0** | Factory armor identities with one trait included; not extra upgrades |

### New crystals: Table 3-3, printed page 55; detailed rules pp.56–59

| Crystal | Build DC adjustment | Effect synopsis |
|---|---:|---|
| Ankarres Sapphire | +5 | Treat Injury and vital transfer checks receive +5 Force bonus while wielding attuned lightsaber if Dark Side Score 0 |
| Barab Ingot | +5 | Deals fire damage instead of energy/slashing and ignites targets damaged |
| Compressed Crystal | +5 | Target takes -2 on Use the Force Block attempts against attacks from this weapon |
| Corusca Gem | +0 | Extra one weapon damage die against targets with DR |
| Dantari Crystal | +0 | Natural 19 on Use the Force activation restores spent Force powers of matching side |
| Dragite Crystal | +5 | Adds one sonic weapon die after critical multiplier on critical hits |
| Durindfire Crystal | +0 | Lightsaber emits bright light comparable to fusion lantern |
| Heart of the Guardian | +10 | +2 Force attack against creatures wielding active lightsabers |
| Hurikane Crystal | +5 | +2 Force attack against target with armor bonus to Reflex Defense |
| Ilum Crystal | +0 | Standard +1 attuned wielder attack bonus |
| Kaiburr Crystal Shard | +5 | Force Point attack roll die steps d6 to d8, or d8 to d10 with Strong in the Force |
| Kasha Crystal | +0 | +2 Force bonus to Will Defense while wielding attuned lightsaber |
| Kathracite Crystal | -5 | Reduce blade damage die one step; +1 attack for attuned wielder |
| Krayt Dragon Pearl | +10 | +3 Force bonus to damage while wielding attuned lightsaber |
| Lambent Crystal | +10 | Ignore normal Yuuzhan Vong sensing restrictions via Sense Force and Sense Surroundings |
| Mantle of the Force | +10 | +2 Force bonus on Use the Force checks to activate self-only Force powers |
| Mephite Crystal | +0 | Standard +1 attuned wielder attack bonus |
| Pontite Crystal | +5 | No attitude-based penalty on Persuasion attempts vs unfriendly/indifferent within 6 squares |
| Standard Synthetic Crystal | +0 | Standard +1 attuned wielder attack bonus |
| Unstable Crystal | +5 | On critical add one weapon die after multiplier; on natural attack 1 deactivate until end of next turn |

**Overlapping KOTOR identities:** Bondar, Firkraan, Jenraux, Opila, Phond, Rubat, Sigil, Solari. Each remains one previously indexed identity; new printed cross-references were added to their JSON entries. Source republication does NOT grant a second crystal effect or additional copy. Check wording across books before canonical precedence is finalized.

### New construction accessories: printed p.60

| Accessory | Source effect | Generic slot cost |
|---|---|---|
| Beckon Call | Beckon call signals a linked starship with slave circuit to autopilot near wielder | **Not specified** |
| Blade Lock | Swift action lock prevents accidental blade shutdown, swift action to unlock | **Not specified** |
| Concealed Compartment | Stores one Fine-size object inside hilt | **Not specified** |
| Electrum Detail | Cosmetic gold hilt; favorable circumstances on Persuasion with people familiar with tradition | **Not specified** |
| Fiber Cord | Disarmer cannot catch or Force disarm-call weapon; it remains dropped but hangs from cord | **Not specified** |
| Force-Activated | Replaces external button; activation swift with DC 5 Use the Force | **Not specified** |
| Interlocking Hilt | Two compatible equipped sabers couple as swift action to a double weapon | **Not specified** |
| Pressure Grip | Automatically shuts off dropped/disarmed lightsaber | **Not specified** |
| Trapped Grip | Safe activation needs free-action action; otherwise 1d6 energy damage on activation and turn starts until deactivated | **Not specified** |
| Waterproof Casing | Lightsaber works underwater; otherwise water short-out requires 1 minute repair | **Not specified** |

**Capacity rule:** The printed p.60 construction paragraph grants one accessory/modification at construction with no additional time/credit expense. It also offers one additional accessory/modification via Tech Specialist but says the choice counts toward the weapon's one-modification limit. This last sentence needs specific eligibility/stacking adjudication before a generalized numeric capacity is asserted. **Masterwork Lightsaber** (Jedi Artisan, printed p.19) separately adds one accessory at construction. **Quick Modification** (same page) replaces an accessory in one minute only on a self-built lightsaber, subject to GM discretion for physical rarity. These do not establish permission for unlimited array entries or direct mutation of `system.upgradeSlots`.

### Sith Alchemy Specialist table: printed p.22

| Host | Trait | Mechanical synopsis |
|---|---|---|
| Dark armor | Cortosis Weave | A lightsaber striking the wearer automatically deactivates |
| Dark armor | Dark Side Energy | +2 equipment bonus on Use the Force checks to activate dark side Force powers |
| Dark armor | Dark Side Stealth | +2 equipment bonus on Use the Force checks made to avoid detection |
| Dark armor | Imposing Form | +2 equipment bonus to Persuasion intimidation checks |
| Sith weapon | Jagged Weapon | Damage to living creature causes 1d4 damage at beginning of its next turn |
| Sith weapon | Master's Weapon | +2 equipment bonus on Use the Force checks to use Block and Deflect |
| Sith weapon | Vile Weapon | Weapon always treated as laced with Sith poison |

The **Sith Alchemy Specialist** talent (requires Sith Alchemy) permits **one modification at a time**: spend a Force Point and one hour uninterrupted work; increase Dark Side Score by 1; ordinarily at most one benefit per object, with no duplicate benefit. Dark armor stock (p.61) arrives with one Sith Alchemy Specialist enhancement. **Rapid Alchemy p.21** is temporary +2 equipment attack, optionally sacrificed as free action for +5 equipment damage on one roll. **Create Sith Amulet pp.21 and 68** costs 25,000 credits materials, one week and a Force Point; its effects are a 2d6 Move Light Object projectile, a Dark Side Score-costed telekinetic power reroll, and a Dark Side Score-costed 3d8 slashing/Force bolt attack. The three Sith-abomination creature traits in Table 1-1 are explicitly excluded. **JATM Create Sith Weapon** remains distinct from any separately published KOTOR Sith Alchemical Weapon manufacturer template until original acquisition paths and stacking are adjudicated.

### Thirteen added procedures

- **`jatm-advanced-lightsaber-construction`**, p.54: Choose chassis (Table 3-2), focusing crystal (Table 3-3), and eligible accessories before starting Core p40 construction. Apply chassis base Use the Force construction DC plus crystal and any applicable accessory DC modifiers; creator attunes on completion. Standard 7th-level construction threshold. No general slot cost inferred.
- **`jatm-crystal-attunement`**, p.54, 55: Core creator-attunement benefit depends on selected focusing crystal. One active primary focus crystal; substitution replaces normal creator +1 bonus if different benefit. Crystals with effects conditional on attuned wielder must be gated. Do not stack all purchased crystal items or treat their compendium upgradeSlots=1 as generic slot costs.
- **`jatm-dual-phase-crystal-variant`**, p.53: Dual-phase lightsaber normally has default and extended blade setting. The variant substitutes a second crystal profile for the extended blade setting; swift action switches. Exactly one crystal effect active per setting, no simultaneous benefits; retaining extended blade mechanics and two crystal effects in one mode is prohibited.
- **`jatm-lightsaber-accessory-allocation`**, p.60: At creation, crafter may select one of ten accessories at no additional cost in time or credits. Text says Tech Specialist can add one additional accessory or modification which counts toward the weapon one-modification limit; interaction is not mechanically unambiguous. Do not convert to Scum general-upgrade-slots or permit arbitrary accessory arrays until RAW reconciliation and a single allowance resolver.
- **`jatm-masterwork-lightsaber`**, p.19: Jedi Artisan Masterwork Lightsaber talent lets creator add one extra accessory on construction; damage benefit rerolls one weapon damage die on hit but must take second. Mentoring another builder reduces their Use the Force build DC by 5. This is not equivalent to Tech Specialist trait or ordinary upgrade slots.
- **`jatm-quick-modification`**, p.19: Jedi Artisan Quick Modification requires Masterwork Lightsaber. Spend one minute to remove one accessory and install a different accessory on lightsaber the character built; GM may restrict particular physical/rare replacements including electrum detail. Revalidate entitlement, item identity and no duplicate effects.
- **`jatm-sith-alchemy-specialist-traits`**, p.22: Requires Sith Alchemy Specialist talent (prerequisite Sith Alchemy). Force Point + one hour uninterrupted work, increase Dark Side Score by 1; normally one benefit per object and no repeat benefit; one modification at a time. Table 1-1 has 4 dark-armor and 3 Sith-weapon traits; exclude 3 Sith-abomination creature traits.
- **`jatm-dark-armor-inherent-trait`**, p.61: Dark armor chassis is a distinct manufactured armor identity that comes with exactly one Sith Alchemy Specialist trait, not a generic second trait or generic armor slot. Light/medium/heavy are stock variant equipment identities; apply one chosen printed trait with provenance.
- **`jatm-create-sith-armor`**, p.21: Sith Alchemy transforms existing battle armor by corresponding weight to dark armor in 1/2/3 days for light/medium/heavy; pay Force Point at completion and Dark Side Score increment from Sith Alchemy. Produced dark armor has one inherent Alchemy Specialist enhancement as stock identity per p61; no generic upgrade slots.
- **`jatm-create-sith-weapon`**, p.21, 22: Sith Alchemy transforms simple or advanced melee weapon (not lightsaber) using Force Point and one hour; wielder can spend Force Point as swift action for Dark Side Score damage bonus on next weapon attack before encounter end and gains +1 DSP. Per-book rules stay separate from KOTOR manufacturer template until verified.
- **`jatm-create-sith-amulet`**, p.21, 68: Sith Alchemy creation requires 25,000 credits gems/materials, week of nonconsecutive possible work and Force Point at completion; finished object grants the three Sith Amulet effects printed p68. No item slot cost stated.
- **`jatm-rapid-alchemy`**, p.21: Rapid Alchemy uses standard action on wielded melee weapon, gives encounter-long +2 equipment attack; one free-action sacrifice produces +5 equipment bonus on one damage roll. No standard upgrade cost, no printed Force Point requirement.
- **`jatm-synthetic-crystal-creation`**, p.58: Geological compressor costs 2,000 credits (licensed); raw materials plus guided process. After 24 hours DC 20 Use the Force, success creates crystal, failure unusable. Cosmetic default crimson with possible other colors; does not grant free additional crystal sockets or general upgrade slots.

### Repository comparison — source-verified differences, not code changes

| Source entry | Published JATM rule | Current repository representation | Disposition |
|---|---|---|---|
| Force-Activated p.60 | DC **5** Use the Force, swift action | Pack describes DC **10** | Canonical source data discrepancy |
| Trapped Grip p.60 | **1d6** energy on unsafe activation and turn-start repeats | Pack describes **2d6** | Canonical source data discrepancy |
| Fiber Cord p.60 | Prevents disarmer catching or Force-calling the weapon; still dropped and needs pickup | Pack says **+2 vs Disarm** | Invented fixed bonus; source correction |
| Ankarres Sapphire p.59 | Dark Side Score **0** +5 Force on Treat Injury or Use the Force activating vital transfer | Pack says **+2 healing received** | Wrong benefit and missing prerequisite |
| 28 crystals in `packs/lightsaber-crystals.db` | Focusing crystal slot, conditional on chassis/mode | All marked `system.upgradeSlots=1` | Ambiguous generic-slot field; do not treat as cost |
| 10 accessories in `packs/lightsaber-accessories.db` | Construction accessory allowance | All marked `system.upgradeSlots=1` | Ambiguous generic-slot field; do not treat as cost |
| `lightsaber-construction-engine.js` | Published accessory construction limit | `accessoryItemIds[]` construction input, no independent verified count gate | Runtime proof required; not certified |
| Crystal selection, dual-phase variant p.53 | Two mutually exclusive crystal settings with swift toggle instead of blade-extension setting | Runtime mode enforcement not certified | Distinct capability / no additive crystals |

**Important:** The Jedi Academy printed accessory set is compatible with the user's centralized `ModificationSlotAuthority` design, but no row may be automatically converted into a Scum and Villainy generic upgrade-slot purchase. Keep crystal socket, accessory allowance, Sith alchemy benefit-count, Tech Specialist feature-count, and generic Scum slots separate. Shared accounting may be centralized; domain-specific legality and sources remain independently preserved.

### Runtime gates for Claude

1. Do not treat published accessory allowance, Tech Specialist benefits, Sith alchemy, or focusing crystals as fungible generic slots without printed authority.
2. Verify crystal attunement per builder; implement 2-mode mutually exclusive dual-phase selection, not simultaneous effects.
3. Verify Table 3-2 base build DC per chassis plus Table 3-3 crystal modifier, including Kathracite -5, special +5 and +10.
4. Resolve object-level DR and damage-type modifiers, conditional attack/skill bonuses, critical **post-multiplier** dice, and dangerous Unstable Crystal natural-1 lifecycle via correct engine owners.
5. Enforce accessory count and Masterwork/Tech Specialist conditional entitlements against a source-certified schema before mutating any item; unknown slot price must fail closed.
6. Model Sith armor/weapon trait limit with sourced instance IDs, owned-item journal, Dark Side Score change and reversible cleanup; don't use normal slot costs.
7. Repair canonical data for Force-Activated DC, Trapped Grip damage, Fiber Cord effect, Ankarres Sapphire bonus; fix upstream source before rebuilding packaged compendia.
8. All changes require installation/removal/rollback tests and a verified current repository baseline. **No implementation authorized by this audit.**

---

# SWSE Modification Rolling Production Reference

> Version **0.9.0** | Reference date 2026-10-13 | Research/canonicalization only | No runtime authorization

## Scope and gate

**IN:** Weapon modifications (including lightsabers); armor modifications; standalone equipment/device modifications; published templates, Tech Specialist/Superior Tech, Sith alchemy and persistent components **when a book actually authorizes those targets**.

**OUT:** Droid bodies, droid systems, droid conversion, vehicles, starships, their modification/slot systems. The Droidification table row is retained solely to reconcile the source table.

**Do not implement uncertified entries.** The 58 Scum rows are table-certified only. The Core self-built lightsaber attunement and nine Starships Tech Specialist traits have source-verified effects, but no completed end-to-end consumer certification. Source certification alone is not permission to ship runtime code. Status `CATALOGED_NOT_EXECUTABLE` is not an implementation approval.

## Catalog status

| Metric | Value |
|---|---:|
| Total modification source definitions | 139 |
| Source-verified effects (runtime not proven) | 81 |
| Printed source-table entries verified (upgrade, attachment and gear tables) | 86 |
| Separate procedures recorded | 35 |
| KOTOR source definitions added in v0.5 | 46 |
| Force Unleashed source definitions added in v0.6 | 2 |
| Clone Wars source definitions / separate procedures added in v0.7 | **2 / 4** |
| Legacy Era source definitions / separate procedures added in v0.8 | **18 / 7** |
| Rebellion Era source definitions / procedures added in v1.0 | **3 / 7** |
| Fully executable/runtime-certified | **0** |
| Authorized production modifications | **0** |
| KOTOR template families (general/weapon/armor) | 11 / 7 / 5 |
| KOTOR accessory options / named crystals / Sith talisman | 8 / 14 / 1 |
| *Scum and Villainy* table rows unchanged | 58 |

**Counts distinguish published definitions from host-domain variants and source certification from production readiness.**

## Canonical architecture (locked design direction)

- **Strictly separate** `WeaponModificationDefinition`, `ArmorModificationDefinition`, `EquipmentModificationDefinition` schemas and effect-target namespaces. A universal printed upgrade may require up to three separately certified typed definitions; shared publisher name does not grant universal legality.
- Existing Workbench, Tech Specialist, Sith Alchemy, Lightsaber Construction and specialized legality services **retain rule acquisition and procedure authority**. No parallel eligibility engine.
- `ActorEngine`/transaction authority alone commits changes; each domain effective-stat resolver is read-only.
- Proposed `ModificationSlotAuthority` centralizes slot arithmetic and capacity pools; canonical host baseline, installed source grants and per-upgrade slot costs are separate provenance.
- Lightsaber focusing crystal, accessory construction allowance, and generic upgrade slots are distinct capacity concepts unless certified source says otherwise.
- Track all three critical properties separately: `critical_range`, `critical_damage_multiplier`, `critical_damage_addition` (post-multiplier packet).
- For effect and source rule ambiguities, use GM arbitration or explicit prompts; never infer environmental geometry, ownership, activation, or target context from names.
- Definitions must cite exact printed page and table; `rulesPage=null` means **not yet certified**. No invented stock limits, bonuses, damage dice, or stacking.

## Book-by-book production queue

| Book | Audit status | Published upgrade entries indexed | Coverage targets |
|---|---|---:|---|
| Star Wars Saga Edition Core Rulebook | TARGETED_SOURCE_RULES_VERIFIED_FURTHER_SCAN_PENDING | 0 (1 non-table definition, 2 procedures) | base equipment and lightsaber construction; item damage and repair rules |
| Starships of the Galaxy | TARGETED_TECH_SPECIALIST_RULES_CERTIFIED_FURTHER_SCAN_PENDING | 9 | Tech Specialist feat: weapon/armor/device trait tables; ships excluded |
| Threats of the Galaxy | TARGETED_EQUIPMENT_SCAN_NO_NEW_MODIFICATION_OPTIONS_FOUND | 0 (7 exemplars) | NPC equipment and alchemical Sith Sword weapon identity; no new generic modification rules |
| Knights of the Old Republic Campaign Guide | TARGETED_RULES_CERTIFIED_RUNTIME_PENDING | 8 accessory table entries; 38 other entries | 46 definitions, 5 procedures: templates, accessories, crystals, Sith Alchemy |
| The Force Unleashed Campaign Guide | TARGETED_MODIFICATION_PAGES_SOURCE_RULES_CERTIFIED_RUNTIME_PENDING | 1 printed table row + 1 talent effect | Infuse Weapon p.93; manual explosive trigger pp.100–101; organization Tech Specialist credit waiver p.65 |
| The Clone Wars Campaign Guide | TARGETED_MODIFICATION_RULES_SOURCE_VERIFIED_FURTHER_SCAN_PENDING | 1 printed equipment table entry + 1 talent effect; 1 reuse-only talent procedure | Military Engineer Quick Modifications and Sabotage Device pp.45-46; Halo Lamp pp.65-66; no generic armor upgrade found |
| Scum and Villainy | TABLE_INDEXED_DETAIL_PENDING | 58 | Scum equipment stripping and growing slots; standard installation and removal DC and costs; all 58 Table 2-3/2-4/2-5 entries require detail text pass |
| Legacy Era Campaign Guide | TARGETED_MODIFICATION_RULES_SOURCE_VERIFIED_FURTHER_SWEEP_PENDING | 9 Biotech Specialist trait rows; 9 other non-table definitions | Biotech Specialist p34-35; biotech template p66; device grafts p31; heirlooms p97-98; antiquated/refitted weapon templates p100-101 |
| Rebellion Era Campaign Guide | NOT_STARTED | 0 | Search all equipment modification sections |
| Jedi Academy Training Manual | NOT_STARTED | 0 | advanced lightsaber construction; focusing crystal choices; lightsaber accessories and modification allowance; dual-phase crystal profiles |
| Galaxy at War | NOT_STARTED | 0 | military equipment mods not mounted ship systems |
| Scavenger's Guide to Droids | NOT_STARTED | 0 | exclude droid body, droid upgrade systems; review only standalone ordinary equipment if relevant |
| Galaxy of Intrigue | NOT_STARTED | 0 | concealment and tech equipment customizations |
| The Unknown Regions | NOT_STARTED | 0 | environment and survival equipment enhancements |
| Official Wizards Web Enhancements | NOT_STARTED | 0 | Search all equipment modification sections |

## The Clone Wars Campaign Guide - targeted weapon/equipment modifications (v0.7.0)

**Book status:** `TARGETED_MODIFICATION_RULES_SOURCE_VERIFIED_FURTHER_SCAN_PENDING`. New independent source definitions **2**, recorded procedures **4**, previous `116` definitions and `17` procedures preserved. **Quick Modifications creates no new Tech Specialist trait.** Fully runtime-certified: **0**. This is an evidence-based scan of applicable source passages, not a visual audit of all 225 PDF pages.

**Verified printed pages and PDF mapping:** Military Engineer talent tree p.45 (PDF p.46), class feature and Sabotage Device p.46 (PDF p.47); Halo Lamp Table 5-5 p.65 (PDF p.66), description p.66 (PDF p.67). Visually inspected source pages. Used the supplied OCR text only to locate relevant passages.

### Source definitions

| Definition | Printed page | Host domain | Certified effect | Slot and runtime treatment |
|---|---:|---|---|---|
| `cw-military-engineer-sabotage-device` | 46 | `weapon` and separately `equipment` | Military Engineer talent converts **any object or weapon powered by an energy cell** into a fragmentation grenade in all ways as swift action, then back with another swift action. | No ordinary slot fee or Mechanics DC printed. Model as temporary reversible operational state in its proper host domain, with detonation/consumption delegated to grenade authority. |
| `cw-halo-lamp-weapon-attachment` | Table 5-5 p.65; text p.66 | Weapon host, distinct physical equipment lamp | A 30-credit, 1-kg Halo Lamp sheds **bright light in a 3-square radius when lit**, stays cool, and may attach to a weapon as an accessory. | Keep the original lamp as linked equipment Item; neither general upgrade-slot cost, mounting time, nor attack modifier is printed. Do not infer 0 or 1 slots. |

**Not an independent source definition:** *Quick Modifications* (Military Engineer talent, p.45) lets the character select **one existing weapon trait** from the Tech Specialist feat in *Starships of the Galaxy* p.21 when creating a field-created weapon. It requires **Repairs on the Fly** and **Tech Specialist**. This is an authorized way of applying an earlier trait, not a new fourth weapon trait. Consequently, the rolling JSON records it under **procedures**, not duplicate effect definitions.

### Military Engineer procedure and weapon lifetime

*Field-Created Weapon* (p.46) is a prestige class feature, not permanent item crafting. As a **standard action** the engineer makes **DC 20 Mechanics** to create a personal-sized melee/ranged weapon of choice whose base price does not exceed **600 credits x Military Engineer class level** and with which the engineer is proficient. One use **per encounter**. Only the creator receives the class feature equipment attack bonus **equal to half their Military Engineer class level**. If the weapon requires an energy cell, one is included without additional charge. **The weapon is destroyed at encounter end.** If the engineer has Quick Modifications, the selected existing Tech Specialist trait ends with that temporary weapon. No separate normal Tech Specialist crafting cost or second roll should be invented solely from the word 'apply' in Quick Modifications; reconcile class procedure to feat authority before wiring.

*Sabotage Device* (p.46) is likewise a learned Military Engineer talent. The scope is **energy-cell-powered objects and weapons**. Because the book says *any object*, applicability to an energy-cell-powered armor Item remains **unresolved for a separately typed armor adapter**; do not silently allow or forbid it. Starship and droid systems are out of scope. A weapon or gear object in grenade form uses canonical fragmentation-grenade characteristics **in all ways**. A second swift action can restore the original object **if it still exists**. Do not respawn an item after its detonation and do not grant a second attack bonus or other unprinted effect. No expiration or automatic end-of-encounter reversal is given in this rule; represent the operational mode honestly rather than inventing one.

### Repository reconciliation (read-only)

- Existing `packs/equipment-security.db` Halo Lamp item `_id=detect-halo-lamp` (also present in aggregate `packs/equipment.db`) already has **cost 30 and weight 1 kg**. However its description says a **15-meter-radius** lamp, in conflict with the printed **3-square radius**. This is a source-supported **DATA_DEFECT candidate**. Fix the canonical upstream source/generator before rebuilding packs; do not patch two generated packs directly.
- `data/talent-action-links.json` already references **Sabotage Device** as a swift-action talent. This metadata is not proof of a correct temporary transformation runtime or rollback.
- `packs/talent_trees.db` and the canonical talent audit contain Military Engineer content, including Quick Modifications and Sabotage Device. The authoritative source must remain the talent/class records, not a duplicate purchasable equipment upgrade.
- `data/class-features.json` already contains **Field-Created Weapon**. Its exact live execution and end-of-encounter cleanup must be independently tested.
- Existing Tech Specialist trait provider `scripts/engine/customization/tech-specialist-modification-service.js` has three original in-scope weapon traits: Improved Accuracy, Improved Damage and Selective Fire. Quick Modifications references these rules; does not duplicate the trait catalog.

### Excluded stock items and borderline cases

- Snap baton p.59 has factory models with extra alarm/glowrod features at double purchase price. This is **model variation**, not a broadly installable upgrade with a certified slot cost.
- Camo armor, shadowsuit, thinsuit and vacuum pod pp.64-65 have innate manufactured traits, including camouflage electronics and integrated life-support/tools. **No general purpose armor modification** is established by these descriptions.
- Weapon products, different ammunition, thermal gear and wrist computer are ordinary merchandise. Their inherent rules belong to the appropriate weapon/armor/equipment definitions, not an inferred installed-modification catalog.
- Droid-system upgrades, vehicle customization and spacecraft systems are excluded and reserved for independent refactors.

### Claude implementation gates

1. Do not create new Tech Specialist traits for Quick Modifications. Verify prerequisite feat/talent, source weapon's proficiency/price cap, DC 20 creation, use frequency, creator-only scaling and encounter-destruction cleanup.
2. Sabotage Device: preserve pre-transform item instance data; use typed weapon/equipment operational state (with armor-object applicability explicitly pending a separate typed review). Reject devices without energy-cell power, support swift-action toggle and original form restoration, and enforce grenade depletion.
3. Halo Lamp: keep a **physical equipment component reference** on weapon mount; use bright radius **3 squares** while lit. Do not invent generic slot cost, skill checks or automatic stealth/attack bonuses. Reconcile its existing 15-meter data discrepancy upstream.
4. No installation/slot arithmetic inside these source-specific effects. Use the proposed centralized `ModificationSlotAuthority` only after baseline and per-component accounting have been certified; absence of specified slot cost is **unknown**, not zero.
5. Do not claim a completed runtime consumer, installation transaction, teardown, item destruction or rebuild until tested. No repository writes authorized by this rolling audit.

---

## The Force Unleashed Campaign Guide — targeted modification pass (v0.6.0)

**Audit state:** `TARGETED_MODIFICATION_PAGES_SOURCE_RULES_CERTIFIED_RUNTIME_PENDING`. Two new source definitions, three source procedures (two acquisition/installation procedures plus one conditional cost waiver), and a confirmed repo data discrepancy. **No fully runtime-certified features; no production mutation authorized.** Droids, vehicles and ships remain out of scope.

**Source verification:** Visually inspected the supplied PDF printed p.65 (PDF 66), p.93 (PDF 94), p.100 (PDF 101) and p.101 (PDF 102). Chapter 6 pages 96–102 were also reviewed for products-versus-attachable-options. Supplied OCR was only the locator/search layer. This is a **targeted** sourcebook review, not manual review of all pages.

### New source definitions

| Definition | Printed source | Domain-specific host | Published acquisition/activation | Rule effect | Slot ruling |
|---|---|---|---|---|---|
| `tfu-felucian-shaman-infuse-weapon` — Infuse Weapon | p.93, Felucian Shaman talent | **Weapon**: unpowered melee only | Felucian Shaman talent; spend 1 Force Point and full-round action; provenance ties to original infuser | When infuser wields the infused weapon, double the **weapon object's** DR and suppress lightsaber DR bypass against that object. On successful attack when FP spent to modify its attack roll, add `2 × FP result` to damage. | **No general upgrade-slot cost specified**. Do not invent one. |
| `tfu-manual-trigger` — Manual Trigger | Table 6-3 p.100; detailed rules p.101 | **Equipment** explosive host, or separate strictly typed **Weapon** explosive host | 100 credits, 0.1 kg, Licensed; attach to any explosive including mines; Mechanics setting check | On successful set check, trigger detonation as **swift action from within 30 squares**; a timed/manual detonator attached to a mine supersedes native mine activation. | **No generic upgrade-slot cost specified**. Do not infer 0 or 1. |

**Infuse Weapon guardrails:** This is a *Felucian Shaman talent*, not Sith Alchemy. Published words specify an unpowered melee weapon that **does not require an energy cell**. The first Force Point infuses the selected weapon; a **separate** spent Force Point on an attack roll conditionally triggers the additional damage. No every-hit bonus; no blanket DR for the actor; no permanent benefit for an unrelated holder. The source does not specify a finite duration and says “from that point forward,” so retain the infusion with original creator attribution, but do not invent repeat-infusion stacking, dispel rules, transfer rules, or critical damage multiplication stage.

**Manual Trigger guardrails:** The source states **30 squares**, not 100 meters. It also states attaching either a timed or manual detonator to a mine requires the normal Mechanics check and **supersedes the mine's normal triggering system**. Even though the source table labels explosives under “Weapon,” the repository holds the actual Manual Trigger as an `equipment` Item. Model the effect using **host-specific typed adapter**: `gear.actions.explosiveTrigger` for equipment explosive hosts and `weapon.capabilities.explosiveTrigger` for weapon-classified explosive hosts. The physical trigger is a **linked item/component**, not a second active mechanical copy. Targeting/range and detonation belong in their existing activation rules, not in the weapon stat aggregator. Cost of *100 credits* is equipment purchase cost, **not 100 slot units**.

### Procedure-only publication: Tech Specialist organization benefit

**Table 4-3, printed p.65:** One *sample benefit* available to an organization member in the Organization Score **20–29** tier waives the monetary costs **once per week** for a Tech Specialist modification on an item significant to that organization. It does **not** grant the feat, bypass the Mechanics check, waive time, add a slot, or increase the one-benefit/item limit. An eligible organization must actually offer that sample benefit; no universal automatic entitlement. Tracked as `tfu-organization-tech-specialist-cost-waiver`, **not** a tenth Tech Specialist trait.

### Repository reconciliation (read-only audit)

- `data/audits/talent-phase-2-force-unleashed-campaign-guide-content.json` already contains the canonical **Infuse Weapon** talent (Felucian Shaman p.93). `packs/talent_trees.db` lists that talent in Felucian Shaman. Reuse the original talent authority; do **not** create an independent generic upgrade granting the talent.
- `packs/equipment-security.db` and aggregate `packs/equipment.db` contain an `explosive-manual-trigger` Item at 100 credits. Both encode **range 100 meters** in their prose and capability metadata. The printed source says **within 30 squares** (45 meters at SWSE 1.5 meters per square). This is a **confirmed DATA_DEFECT candidate in a generated/normalized product**. Correct upstream generator/data and rebuild through the established pipeline in a separate authorized implementation pass; do not manually patch both generated packs.
- The Item is currently represented as equipment. Whether a **host explosive** is weapon or equipment depends on its canonical Item classification. Do not enable the wrong effect target or create a universal cross-domain payload.
- `data/upgrades/weapon-upgrades.json` does **not** define a published “Infuse Weapon” Scum upgrade. Correct: it is a talent activation, not a purchased upgrade.

### Excluded stock items and source references

*The Force Unleashed* adds the **guard shoto**, **lightsaber pike**, **power hammer**, **Felucian skullblade**, **Hush-About personal jetpack**, **holoshroud**, **sound sponge**, mines and other equipment. These are *published items with intrinsic properties*, not automatically a catalog of removable templates/mods. The text describing Sith Alchemy used to create Imperial Sentinels is a creature/NPC creation context, not an authorized weapon/armor conversion procedure. The separate droid modification rules and all vehicle/ship modifications remain outside this registry.

### Acceptance gates for future Claude implementation

1. Source-only effects must remain inert until existing actor/weapon/equipment consumers and installation/removal paths are mapped.
2. Infuse Weapon prerequisites/Force Point use and object-DR immunity must be source/owner bound, with no accidental DR doubling on the actor, no permanent foreign-wielder buff and no automatic crit multiplication of the conditional damage.
3. Manual trigger requires a valid explosive host, setting Mechanics check, 30-square limit and correct activation action; it overrides a mine's normal proximity/pressure trigger. No invented slot usage or guessed DC.
4. Correct upstream packaged Manual Trigger data from 100 meters to **30 squares**, then rebuild via canonical pipeline. No direct current-pack edits in this source-authority pass.
5. Organization cost-waiver selection is conditional on actual organization benefit and significant item; once-per-week use must be stateful and cannot evade normal Tech Specialist limits.
6. Adding or removing these sources must neither erase nor double-count template, Tech Specialist, Sith Alchemy, lightsaber crystal or Scum upgrade effects; domain schemas remain separate.

---

## Threats of the Galaxy — targeted modification and equipment identity scan (v0.4.0)

**Book status:** `TARGETED_EQUIPMENT_SCAN_NO_NEW_MODIFICATION_OPTIONS_FOUND`. Zero new published reusable upgrade definitions, zero new modification procedures, zero new source-certified executable effects. This is a **positive evidence record for an empty modification-catalog pass**, not a claim that the book contains no modified equipment or special weapons. The 68 prior definitions and nine procedures remain byte-equivalent as JSON values.

**Method:** Searched the supplied *Threats of the Galaxy* OCR text bookwide for modification, upgrade, template, alchemical, Tech Specialist, custom gear, enhanced scope and related terms; checked the relevant scanned PDF pages directly. Chapter 1 NPCs and chapter 2 creatures were considered, while chapter 3 droid systems were explicitly excluded; a separately boxed non-droid weapon in chapter 3 was included as a source cross-reference. PDF page indexes below reflect a one-page cover offset. This is a targeted scan, **not** a page-by-page visual certification of the entire volume.

### Source leads and their dispositions

| Source | Page | Verified fact | Modification-domain disposition |
|---|---:|---|---|
| Assassin | 12 | Blaster rifle with enhanced targeting scope | `weapon` item instance; source of scope operation/slot cost not specified here; no new definition. |
| Engineer | 38 | NPC has Tech Specialist (citing *Starships of the Galaxy* p.21) | Feat/example only; no duplicate trait record. |
| Jensaarai Defender | 51 | Personalized ceremonial armor (+7), with distinctive design and narrative attunement | Armor instance/tradition equipment; no universal armor-modification procedure is supplied. |
| Lumiya | 84 | Custom armored flight suit with helmet package, listed as modified to +8 armor | Armor NPC instance; cause and slot cost of +8 **not** derived. Cybernetic palm blasters are excluded. |
| Technician | 100 | NPC has Tech Specialist (citing *Starships of the Galaxy* p.21) | Feat/reference only; no duplicate trait record. |
| Elite Warrior | 102 | Heavy blaster rifle with enhanced low-light targeting scope; powersuit with helmet package | Existing component/gear instances; no new installation mechanics. |
| Sith Sword | 159 | Explicit finished alchemically crafted weapon, lightsaber-resistant object DR and Force Point/Dark Side-dependent damage option | **Canonical weapon identity, not a transferable upgrade definition.** No general sword-alchemy ritual given here. |

### Sith Sword: special handling

*Threats of the Galaxy* p.159 provides a dedicated boxed **Sith Sword** weapon stat/rules entry: Medium simple weapon; 1d8 slashing or piercing; 3,000 credits; 3 kg; illegal and rare. Its alchemical origin is descriptive of *this weapon's identity*. Mechanically, lightsabers do not ignore the Sith sword's damage reduction; a proficient user may treat it as a lightsaber for specified Jedi defensive talent interactions. A proficient user can spend a Force Point as a swift action to add their Dark Side Score to damage on the next eligible attack before encounter end, gaining +1 Dark Side Score from activation. Those are real weapon-specific rules and warrant a **separate canonical weapon runtime mapping**, not a new generic installable alchemical effect on arbitrary swords. The source gives no mechanics for performing the conversion ritual, spending generic slots or attaching this effect to other sword items.

### Guardrails for future Claude implementation

- **Do not create 7 upgrades.** These are source *examples/leads*; not seven new executable definitions.
- **Do not create a universal Sith Alchemy sword trait from p.159.** Keep this boxed item and its original identity separate until the actual Sith alchemy crafting rules are certified from other books.
- **Do not grant +1 or extra slots** merely because an NPC carries an enhanced scope or a modified armor suit. Locate its original published source before building instance state or bonuses.
- **Do not duplicate Tech Specialist** traits already indexed from *Starships of the Galaxy*.
- **Do not include droid-body, droid-system, vehicle, starship or cybernetic-prosthetic modifications** here.
- No existing production record is authorized to change on the basis of this book-only modification pass.

### Pending cross-book reconciliation

Track Sith sword as a `CANONICAL_WEAPON_IDENTITY` evidence lead; target its existing weapon record and object-DR, defensive-talent and Dark Side mechanics for a *separate* weapon-rules audit. Track enhanced targeting scopes, helmet packages and ceremonial/custom armor as NPC installed-component examples awaiting their real definition sources. Do not claim original rule/cost or upgrade-slot usage from an NPC Possessions line alone.

---

## Starships of the Galaxy — Tech Specialist certification (v0.3.0)

**Primary page:** printed p.21, supplied Starships PDF page 22. I visually checked the entire Tech Specialist feat text and trait table. This is a **targeted** pass, not a claim that every possible nonship equipment passage in the book has been exhausted.

The feat's published table also contains **three droid and three vehicle traits**, which are intentionally **not** entered as definitions. Starship Designer and ship-component modification rules are excluded. The Wizards original Tech Specialist web enhancement is earlier publication material; its text should be compared in the web-source pass, not entered as a second independently stackable feat/trait set.

### Shared procedure `sog-tech-specialist-trait-work`

- **Prerequisite:** Tech Specialist feat; trained Mechanics skill. The character may undertake one modification job at a time.
- **Default item limit:** one special trait benefit per item; a specific printed exception is required to exceed it. No repeating the same benefit.
- **Cost paid first:** greater of 10% of the item's cost or 1,000 credits. This is **not** a Scum upgrade-slot cost.
- **Time:** one day per 1,000 credits of modification cost. Trained helpers can reduce time proportionately and attempt aid-another Mechanics checks.
- **Check:** DC 20 Mechanics after the work; taking 10 or 20 is prohibited.
- **Failure:** paid credits lost and no trait; retry requires another attempt.
- **Market value:** original item value + twice the successful modification expense, without counting wasted failed attempts.
- **Exception boundaries:** Signature Device / Superior Tech are **not certified by this page**, and neither is a device extra-slot trait.

### Nine certified trait identities

| Domain | Stable definition ID | Published trait | Canonical effect | Slot accounting | Existing code key |
|---|---|---|---|---|---|
| Weapon | `sog-tech-improved-accuracy` | Improved Accuracy | +1 equipment bonus on attack rolls | Not generic slots | `tech_weapon_accuracy` |
| Weapon | `sog-tech-improved-damage` | Improved Damage | +2 damage on hit, **before** any weapon damage multiplier | Not generic slots | `tech_weapon_damage` |
| Weapon | `sog-tech-selective-fire` | Selective Fire | A qualifying ranged weapon gains alternate single-shot/autofire option; burst/splash-radius weapons prohibited | Not generic slots | `tech_weapon_selective_fire` |
| Armor | `sog-tech-agile-armor` | Agile Armor | +1 armor Max Dex Bonus | Not generic slots | `tech_armor_agile` |
| Armor | `sog-tech-fortifying-armor` | Fortifying Armor | +1 equipment bonus to Fortitude Defense supplied by armor | Not generic slots | `tech_armor_fortifying` |
| Armor | `sog-tech-protective-armor` | Protective Armor | +1 armor bonus to Reflex Defense | Not generic slots | `tech_armor_protective` |
| Equipment | `sog-tech-enhanced-strength` | Enhanced Strength | +2 **device's** Strength (not wielder's) | Not generic slots | `tech_device_strength` |
| Equipment | `sog-tech-improved-durability` | Improved Durability | +1 device DR **and** +25% of its maximum HP as extra device HP; exact rounding pending | Not generic slots | `tech_device_durability` |
| Equipment | `sog-tech-mastercraft-device` | Mastercraft Device | +1 equipment bonus to checks **using** the device, or +1 to its existing bonus | Not generic slots | `tech_device_mastercraft` |

**Critical mechanics correction:** Improved Damage is a pre-multiplier flat weapon damage term. Its typed effect explicitly excludes `weapon.critical.critical_damage_addition`, which the weapon schema reserves for unmultiplied post-critical packets (e.g. qualifying sneak attack). On a damage subtotal `D` with x2 multiplier, Improved Damage yields `(D + 2) × 2`, **not** `(D × 2) + 2`.

**Unknowns remain:** Exact rounding of the quarter-HP effect is not stated on this page. The device's Strength and skill bonuses require an actual device-object/user-context consumer. Selective Fire must affect the canonical weapon fire-mode runtime without fabricating ammunition or attack mechanics. No non-applicable weapon/armor/gear effect targets are accepted across the strict domain schemas.

### Production overlap findings and gates

- The live service `scripts/engine/customization/tech-specialist-modification-service.js` already declares all nine IDs shown above and stores traits in `flags.swse.techSpecialist.traits`, with an `activeTraitId` for Signature Device behavior. The Workbench calls this service. **Do not replace or parallelize its legality/transaction authority.**
- That same service writes `system.attackBonus`, `system.flatDamageBonus`, armor defense/Max Dex aliases, and other directly mutated fields; it also uses inverse delta writes on trait toggles. The new host-domain resolver must reconcile these **once**, not count both the installed trait and already-applied legacy fields. Uninstallation/trait replacement must not drift.
- The service offers `tech_device_upgrade_slot` (“Additional Upgrade Slot”), **absent** from the printed p.21 Tech Specialist table. It is `CODE_ONLY_SOURCE_UNVERIFIED`, not a tenth source-certified trait. Research later source/provenance before normalizing it into `ModificationSlotAuthority`.
- The book's single-trait rule does not itself prove *Signature Device* can have two benefits or that *Superior Tech* features belong to this Tech Specialist table. Those are separate feat/talent authorities requiring their own published source verification.
- Production readiness remains **NOT CERTIFIED**: source page and effect semantics are verified, but full producer-to-storage-to-consumer-to-removal mappings, correct typed stacking, item baselines and end-to-end tests are incomplete.

### Focused implementation acceptance cases (for Claude **later**)

1. Install each of the nine traits on its correct domain, reject wrong-domain hosts and duplicate trait installs; no general Scum slots are spent.
2. Reject a second Tech Specialist benefit without a specifically certified exception, and preserve distinct rule-family stacking decisions.
3. Charge `max(10% item value, 1000 cr)` once, spend correct time and DC 20 Mechanics; failed checks consume money but do not install a trait.
4. Improved Accuracy contributes **one typed equipment bonus**, not duplicate raw and derived weapon attack modifiers.
5. Improved Damage is included once in the pre-multiplier weapon damage subtotal, never as post-multiplier critical addition.
6. Selective Fire rejects burst/splash weapons and changes only the legal selected ranged fire mode, with ammo/actions delegated to existing weapon runtime.
7. Armor benefits use canonical armor storage (`maxDexBonus`, `fortitudeBonus`, `defenseBonus`) via one effective-profile resolver and cannot accidentally persist when detached.
8. Device Strength affects the device, not the user; Mastercraft checks apply only when using the device and respect existing equipment bonus rules.
9. Improved Durability updates **device-object** DR and maximum HP (fraction/baseline/rounding proved), not actor HP; removal returns to baseline.
10. A fully modified item, on removing/switching its trait, recomputes without stale direct writes; owned item serialization and reload produce identical values.

---

## Core Rulebook — next sourcebook pass (v0.2.0)

**Source verification:** printed *Core Rulebook* p.40, "Building a Lightsaber" sidebar, visually inspected on supplied PDF page 41. **Scope:** only the published personal lightsaber building/attunement modification rules are certified in this targeted pass. Do not mark the entire Core equipment chapter fully exhausted.

### Construction procedure: `core-build-lightsaber`

- **Prerequisites:** at least seven heroic levels, Force Sensitivity, and Weapon Proficiency (lightsabers).
- **Components:** 1,500 credits for a conventional lightsaber; 3,000 credits for a double-bladed lightsaber.
- **Time:** 24 uninterrupted hours constructing it.
- **Check:** DC 20 Use the Force; cannot take 20. A failed check requires an additional 24 hours dismantling and rebuilding the flawed weapon.
- **Slot accounting:** this construction is **not** presented as consumption of a *Scum and Villainy* general weapon upgrade slot. Do not substitute crystal/socket capacity rules.
- **Status:** `SOURCE_RULES_CERTIFIED`; runtime handling not mapped.

### Creator attunement: `core-self-built-lightsaber-attunement`

| Field | Certified rule / disposition |
|---|---|
| Domain | `weapon` only; lightsaber constructed by the builder |
| Source role | `special_crafting` / creator-attunement; not a purchased generic upgrade |
| Activation | After construction, creator spends **one Force Point** and takes a **full-round action** to attune the specific saber |
| Effect | **+1 bonus on attack rolls** made by that creator with that self-built lightsaber |
| Other wielders | Receive **no bonus** from this creator's attunement |
| Original upgrade slots | `not_applicable`; no new grant or debit inferred |
| Printed bonus type | **Unspecified**; do not invent an equipment/circumstance type |
| Schema | `weapon.attack.bonus` via conditional `add +1`; stable creator and attunement relation, never by weapon name |
| Source certification | `EFFECTS_CERTIFIED` (source page checked) |
| Production certification | **NOT MAPPED, NOT IMPLEMENTATION-READY**; no producer/storage/consumer/test proved |

The JSON entry has three separate conditions: this actor built this weapon, the creator paid the Force Point to attune it, and the rolling actor is the attuned creator. All three must be established before applying the +1. A player simply possessing a lightsaber—or having built a different one—is not enough.

### Important source boundary

The supplied Core PDF **appends a separate document**, *Saga Edition Web Enhancement 1 — The Tech Specialist* (PDF pp.289+). Its Tech Specialist feat/table and Personalized Modifications talent are **official web publication material, not part of the printed Core Rulebook**. Starships p.21 is now certified independently, and the original web publication must be reconciled as provenance rather than duplicated as another source of stackable effects. Never create a false "Core p.40 Tech Specialist" identity.

Core's item repair, recording or credit-chip alteration rules are not automatically permanent equipment upgrades; no droid/vehicle mod implementation is allowed in this pass.

### Remaining Core audit checks

- Exhaustively sweep other Core equipment passages for genuine permanent item modification rules beyond the self-built lightsaber sidebar.
- Trace existing lightsaber construction, Force Point spend, self-builder identity, and combat attack consumers before mapping this rule into Foundry.
- Do not mix the source-certified attunement attack bonus with crystal bonuses, Jedi Academy special accessories, or general upgrade slots until their respective books are certified.

---

## Scum and Villainy — first table pass

Table indices come from direct visual inspection of the user-provided PDF. Detailed mechanics, restrictions, and exact prose remain pending; a summary in JSON is a **non-executable locator**, not an exact paraphrase suitable for runtime.

**Fields:** source table entry, table-certified slots/cost/availability, prospective host domains, and certification status. `0 or 1` means a conditional published slot cost requiring detailed rule adjudication.

### Table 2-3 — Universal Upgrades (printed page 41)

| ID | Printed name | Slots | Cost | Availability | Domain candidates | Status |
|---|---|---:|---|---|---|---|
| `sv-cheater` | Cheater | 1 | 500 cr | Illegal | equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-cloaked` | Cloaked | 1 | 750 cr | Licensed | weapon,armor,equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-droidification` | Droidification | 2 | 2000 cr | Licensed | EXCLUDED (droid) | EXCLUDED_SCOPE |
| `sv-dual-gear` | Dual Gear | 1 | 1000 cr | Common | equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-electrograpple-handle` | Electrograpple Handle | 1 | 1000 cr | Licensed | weapon,equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-environmental-sealing` | Environmental Sealing | 1 | 400 cr | Common | weapon,armor,equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-extra-power-source` | Extra Power Source | 1 | 200 cr | Common | weapon,armor,equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-memory-upgrade` | Memory Upgrade | 1 | 4000 cr | Common | equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-memory-upgrade-advanced` | Memory Upgrade, Advanced | 2 | 16000 cr | Common | equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-miniaturized` | Miniaturized | 1 | 500 cr | Common | weapon,armor,equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-recognition-system` | Recognition System | 1 | 200 cr | Common | weapon,armor,equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-remote-activation` | Remote Activation | 0 | 100 cr | Common | weapon,armor,equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-secret-compartment` | Secret Compartment | 1 | 600 cr | Common | weapon,armor,equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-silverplate` | Silverplate | 1 | 2500 cr | Common | weapon,armor,equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-spring-loaded` | Spring Loaded | 1 | 300 cr | Common | weapon,equipment | CATALOGED_NOT_EXECUTABLE |
| `sv-storage-capacity` | Storage Capacity | 0 | 100 cr | Common | weapon,armor,equipment | CATALOGED_NOT_EXECUTABLE |

### Table 2-4 — Weapon Upgrades (printed page 42)

| ID | Printed name | Slots | Cost | Availability | Domain candidates | Status |
|---|---|---:|---|---|---|---|
| `sv-bayonet-ring` | Bayonet Ring | 0 | 100% host cost | Common | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-bipod` | Bipod | 0 | 100 cr | Common | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-double-trigger` | Double Trigger | 0 | 800 cr | Common | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-ion-charger` | Ion Charger | 1 | 3000 cr | Licensed | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-missile-load` | Missile Load | 1 | 250 cr | Military | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-neutronium-reinforcement` | Neutronium Reinforcement | 1 | 3000 cr | Military | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-overload-switch` | Overload Switch | 1 | 500 cr | Military | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-pulse-charger` | Pulse Charger | 1 | 2000 cr | Military | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-rangefinder` | Rangefinder | 1 | 200 cr | Licensed | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-rapid-recycler` | Rapid Recycler | 1 | 500 cr | Military | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-retractable-stock` | Retractable Stock | 0/1 conditional | 100 cr | Common | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-slinker` | Slinker | 1 | 1000 cr | Licensed | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-sniper-switch` | Sniper Switch | 0 | 500 cr | Licensed | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-targeting-scope-standard` | Targeting Scope, Standard | 0 | 100 cr | Common | weapon | CATALOGED_NOT_EXECUTABLE |
| `sv-targeting-scope-low-light` | Targeting Scope, Low-Light | 0 | 1000 cr | Common | weapon | CATALOGED_NOT_EXECUTABLE |

### Table 2-5 — Armor Upgrades (printed page 45)

| ID | Printed name | Slots | Cost | Availability | Domain candidates | Status |
|---|---|---:|---|---|---|---|
| `sv-aquatic-adaptation` | Aquatic Adaptation | 1 | 500 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-armorplast` | Armorplast | 0 | 900 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-climbing-claws` | Climbing Claws | 1 | 200 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-diagnostics-system` | Diagnostics System | 1 | 500 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-environmental-systems` | Environmental Systems | 1 | 600 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-gyro` | Gyro | 1 | 250 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-helmet-package` | Helmet Package | 0 | 4000 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-holoshroud` | Holoshroud | 1 | 5000 cr | Restricted, Rare | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-integrated-equipment-1-slot` | Integrated Equipment, 1 Slot | 1 | 200 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-integrated-equipment-2-slots` | Integrated Equipment, 2 Slots | 1 | 500 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-integrated-equipment-5-slots` | Integrated Equipment, 5 Slots | 1 | 1000 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-integrated-equipment-10-slots` | Integrated Equipment, 10 Slots | 2 | 2000 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-internal-generator` | Internal Generator | 1 | 1000 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-jump-servos` | Jump Servos | 1 | 100 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-powered-exoskeleton` | Powered Exoskeleton | 2 | 4000 cr | Licensed | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-radiation-shielding` | Radiation Shielding | 1 | 400 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-armor-rangefinder` | Rangefinder | 1 | 500 cr | Licensed | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-ready-harness` | Ready Harness | 1 | 500 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-repulsorlift` | Repulsorlift | 1 | 1000 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-shadowskin` | Shadowskin | 1 | 5000 cr | Restricted | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-shadowskin-reflec` | Shadowskin, Reflec | 1 | 20000 cr | Military | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-shield-generator-sr5` | Shield Generator, SR 5 | 2 | 5000 cr | Restricted | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-shield-generator-sr10` | Shield Generator, SR 10 | 3 | 10000 cr | Military | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-shockweb` | Shockweb | 1 | 6000 cr | Military | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-vacuum-seals` | Vacuum Seals | 0 | 2000 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-vacuum-seals-improved` | Vacuum Seals, Improved | 1 | 5000 cr | Common | armor | CATALOGED_NOT_EXECUTABLE |
| `sv-weapon-mount` | Weapon Mount | 1 | 1000 cr | Restricted | armor | CATALOGED_NOT_EXECUTABLE |

## Procedures and capacity rules (separate from upgrades)

| ID | Book | Pages | Purpose | Status |
|---|---|---|---|---|
| `sv-base-upgrade-capacity` | Scum and Villainy | 37 | General unused stock slot baseline 1; medium and powered armor 2; explicit model exceptions require source authority. | RULES_OUTLINE_REVIEWED |
| `sv-stripping-item` | Scum and Villainy | 37, 38 | Strip allowed significant feature to gain a slot with certified drawbacks; not free numeric bonus. | RULES_OUTLINE_REVIEWED |
| `sv-increase-size` | Scum and Villainy | 38, 39 | Increase size for slot grant and published restrictions; the effect applies once unless explicit exception. | RULES_OUTLINE_REVIEWED |
| `sv-install-remove-upgrade` | Scum and Villainy | 39 | Mechanics DC, time, scratch-built costs, install failure, removal and failure consequences depend on source table. | RULES_OUTLINE_REVIEWED |
| `jedi-saber-construction` | Jedi Academy Training Manual | 54, 60 | Chassis+focusing crystal+special accessory allowance distinct from standard upgrade slots; do not assume stacking. | LEAD_PENDING_CERTIFICATION |
| `sog-tech-specialist-trait-work` | Starships of the Galaxy | 21 | Tech Specialist feat cost, time, Mechanics DC, one-benefit cap, success/failure and item value; not a generic slot transaction. | SOURCE_RULES_CERTIFIED |
| `web-tech-specialist` | Official Wizards Web Enhancements | web | Feat-based trait choice, cost, prerequisite, per-item limit; do not treat feat traits automatically as slot upgrades. | LEAD_PENDING_CERTIFICATION |

## Rule-by-rule certification and coding checklist

For **each** source entry in JSON, advance through these steps without skipping:

- [ ] Locate printed detailed rules page and verify PDF page image; retain `printedTablePage` plus actual `rulesPage`.
- [ ] Certify domain applicability separately for weapon, armor, equipment. Out-of-scope droid/ship/vehicle effects are explicitly excluded.
- [ ] Extract eligibility, conflicts, slots, limits, action cost, credits, Mechanics DC, installation/removal, and stacking; record unknown versus explicit none.
- [ ] Produce a compact player-facing summary and separately maintain legal source locator (do not copy sourcebook pages blindly).
- [ ] Translate into typed effect operations only when exact mechanics are verified; transformations and GM-adjudicated effects must retain their distinct semantics.
- [ ] Locate real Workbench/engine producer, owned Item storage, combat/defense/skill consumer, and removal path; avoid duplicate writes and double application.
- [ ] Determine appropriate automation bucket: AUTOMATIC / CONTEXTUAL / GM_ADJUDICATED. Use no speculative map geometry or sensor state.
- [ ] Add regression tests: legality; slot accounting; install/removal; base+overlay; stacking; serialization; migration; production-path execution.
- [ ] Mark `mechanicalCertification=FULL_CERTIFIED` only after verified PDF, code consumer, tests and cross-entry reconciliation.

## Claude implementation handoff guardrails

1. **Do not implement from this initial catalog.** First convert a batch of entries from `PENDING_RULES_TEXT` to certified and review the exact printed pages.
2. Preserve three strict host schemas. Treat a source marked universal as candidate applicability—not an unrestricted host override.
3. Enforce one proposed central capacity authority instead of trusting mutable `system.upgradeSlots` as an already-accounted baseline.
4. Reuse current Workbench/Garage-adjacent services, template systems, alchemy and Tech Specialist where appropriate, but **do not touch droid/vehicle/ship refactors**.
5. Preserve real item identity and safe legacy/homebrew adapter. No canonical name-matching or generated pack hand edits.
6. Do not silently convert a crystal socket, lightsaber accessory allowance or special crafting grant to a generic slot.
7. Keep explicit status and count ledger before/after every book; never claim a source or consumer is fully implemented based on a table row.
8. Implement certified items book by book on separate auditable branches; exact-head CI and Foundry smoke tracked separately.

## Source map and unresolved decisions

- *Scum and Villainy* pp.37–45: general equipment upgrade mechanics plus all tables, the first catalog batch. Detailed descriptions continue beyond the index page; text verification remains.
- *Jedi Academy Training Manual* pp.54–60: lightsaber construction, component and crystal allowances require separate rule certification before merging with Scum slots.
- *Knights of the Old Republic Campaign Guide*: crystals and Sith alchemy pending individual item identity and page evidence.
- *Starships of the Galaxy* / Wizards web enhancement: Tech Specialist benefits must be isolated from ship upgrades, and extra device slot provenance is unverified.
- Existing code contains overlapping stored slot capacities, copies of applied modifiers, and separate upgrade eligibility paths: audit these per entry rather than assuming all are authoritative.

## Rolling update discipline

Keep this Markdown and the corresponding JSON version in lockstep. The v0.2.0 Core pass added one non-table definition and two procedures. v0.3.0 adds nine Tech Specialist definitions and one shared procedure from Starships p.21; all preceding definitions remain preserved. One published source entry has one stable source ID; multiple applicable domain definitions use distinct IDs suffix `::weapon`, `::armor`, `::equipment`. Preserve previously certified records on subsequent passes and recompute counts mechanically, not by memory. Never replace uncertain values with guessed integers.


### v0.4.0 change record

- Threats of the Galaxy: searched and visually inspected relevant printed pages 12, 38, 51, 84, 100, 102 and 159; seven provenance examples recorded without granting mechanics.
- **No** additions or modifications to the prior 68 definition objects or nine procedure objects.
- New next-book target: *Knights of the Old Republic Campaign Guide* (Sith alchemy, crystals, and equipment); droid/ship content remains excluded.

---

## v0.5 - Knights of the Old Republic Campaign Guide (printed pages 41, 66-67, 75-80)

**Scope:** three strictly separate host schemas. Droid, vehicle and starship upgrades are excluded. Pages above are confirmed using original PDF scans and searchable TXT; the broader book is not yet certified page-by-page. **Implementation authorization: NONE.**

### Source facts that affect the architecture

- **11 general templates** apply to *weapons and armor only*, often with different effects per domain. They do not automatically make ordinary equipment templatable. A general template is represented by separate `typedDefinitions.weapon` and `typedDefinitions.armor`, not a shared mixed effect payload.
- **7 weapon-only templates** include critical, stun/ion, proficiency and Sith alchemy effects; **5 armor-only templates** have defenses, energy/environment/DR, and armor-object interactions.
- Template restriction: normally **one non-exempt template per item**. Prototype, Quick Draw Weapon and Cortosis Weave/Phrik Alloy are named exceptions. A GM may grant exceptions; multiple templates must be priced most-expensive-first with compounding cost. Templates have no published generic upgrade slot charge.
- **8 off-the-shelf accessories (Table 5-6, p. 75)** have separately published credit prices and Scum & Villainy upgrade-slot costs. Most equipment may have only one accessory even if multiple general slots are free. The authority must enforce *both* limits, not sum them into one pool.
- **14 named alternate crystals (pp. 66-67)** are 14 identities in 8 effect groups. They replace the standard focusing crystal and its self-built +1 attack benefit; crystal Force bonuses are restricted to the builder. No generic upgrade-slot charge, and no simultaneous primary-crystal effects inferred from carried spares.
- Sith Alchemy (p.41): **Create Sith Talisman** creates carried equipment with `+1d6` Force-power damage and DSP/one-active rules; detailed ability does not expressly add damage to lightsaber strikes. **Create Sith Weapon** spends a Force Point and one hour, adding the Sith Alchemical Weapon template to a properly prepared eligible melee weapon.
- Sith Alchemical Weapon (p.79) bypasses lightsabers ignoring the weapon’s **existing** DR; grants defensive talent compatibility to proficient user; optional 1 FP swift action adds wielder DSP to next attack damage and increases DSP 1. **It does not grant an unstated numeric DR value.**
- **Critical phases:** Echani once/encounter temporarily expands threat range; Opila, Baragwin and Durasteel Bonding add one die **after** critical multiplication; Massassi changes Strength bonus before critical multiplication; Prototype armor increases *received base* damage before multiplication.
- **Cross-family effects:** Improved Energy Cell changes an installed Tech Specialist Improved Damage equipment bonus from +2 to +3 and doubles shots per power pack. Prototype permits **two Tech Specialist traits**; it does not grant generic upgrade slots.
- **Blocked missing consumers:** object DR/durability, Bronzium Armor damage interception, Mandalorian modification destruction on disabled item, and GenoHaradan/Echani weapon durability consequences. Certify object damage separately; fail closed.

### All 46 source definitions (each also has a strict typed JSON definition)

| Group | Printed source name | Domain(s) | Page | Core effect / notes |
|---|---|---|---:|---|
| Template | **Arkanian Manufacture** (`kotor-template-arkanian`) | weapon/armor | 76 | Ranged energy weapon adds fire damage and overheats when using multi-shot; armor doubles Fortitude equipment bonus versus cold and loses it versus heat. |
| Template | **Cinnagaran Manufacture** (`kotor-template-cinnagaran`) | weapon/armor | 77 | Ranged energy weapon additionally inflicts bludgeoning; armor or energy shield DR 5 versus sonic, -1 maximum Dex. |
| Template | **Cortosis Weave / Phrik Alloy** (`kotor-template-cortosis-phrik`) | weapon/armor | 77 | Lightsabers do not ignore DR of this weapon or armor; no free numeric DR granted. |
| Template | **Echani Manufacture** (`kotor-template-echani`) | weapon/armor | 77 | Weapon expands critical range once per encounter but halves weapon HP; armor halves weight, -1 Reflex armor bonus, normal-speed burst once per encounter. |
| Template | **GenoHaradan Manufacture** (`kotor-template-genoharadan`) | weapon/armor | 77 | Melee contact-poison bonus/ranged stun attack bonus; fragile weapon on natural 1. Armor +2 Stealth and -1 Fortitude equipment bonus. |
| Template | **Iridonian Manufacture** (`kotor-template-iridonian`) | weapon/armor | 77 | Armor DR 2 vs bludgeoning; weapon +2 equipment damage with Power Attack/Blast and Illegal availability; both disfavored by authorities. |
| Template | **Krath Manufacture** (`kotor-template-krath`) | weapon/armor | 77 | Armor DR 2 versus energy; qualifying weapon attacks deal 1d4 next turn if attack beats Reflex and Fortitude; wearer/wielder counted +1 DSP only for relevant targeting. |
| Template | **Mandalorian Manufacture** (`kotor-template-mandalorian`) | weapon/armor | 77 | +5 equipment bonus on Mechanics to repair/modify host; item becoming disabled destroys modifications. |
| Template | **Massassi Manufacture** (`kotor-template-massassi`) | weapon/armor | 78 | Armor reaction converts a critical to a hit once/encounter; weapon triples Strength bonus before crit if held two hands, strength requirements apply. |
| Template | **Prototype** (`kotor-template-prototype`) | weapon/armor | 78 | Allows two Tech Specialist traits; weapon natural 1-4 automatically misses and disables; armor wearer takes +1 base damage die on a critical before multiplication. |
| Template | **Verpine Manufacture** (`kotor-template-verpine`) | weapon/armor | 78 | Weapon switches to ion fire using swift action; Int 13 requirement; armor/shield DR 10 ion and Dex 13 requirement. |
| Template | **Baragwin Weapon** (`kotor-template-baragwin-weapon`) | weapon | 78 | On critical, +1 matching weapon die AFTER multiplication; illegal. |
| Template | **Bothan Weapon** (`kotor-template-bothan-weapon`) | weapon | 78 | +1 damage die for stun/ion and -1 die otherwise. |
| Template | **Dashade Weapon** (`kotor-template-dashade-weapon`) | weapon | 79 | -2 damage; CT target may spend only two swift actions/turn on recovery until condition normal; illegal. |
| Template | **Gand Weapon** (`kotor-template-gand-weapon`) | weapon | 79 | Stun CT movement halves speed, immobilizes at -10; becomes exotic weapon except for Gand. |
| Template | **Quick Draw Weapon** (`kotor-template-quick-draw-weapon`) | weapon | 79 | With Quick Draw feat, draw or holster once/round as free action. |
| Template | **Rakatan Weapon** (`kotor-template-rakatan-weapon`) | weapon | 79 | Damage die steps once (max d12), +1 equipment attack, exotic except Rakata. |
| Template | **Sith Alchemical Weapon** (`kotor-template-sith-alchemical-weapon`) | weapon | 79 | Lightsaber bypass cannot ignore this weapon DR; proficient user may use Jedi defensive talents; FP swift grants DSP-based damage bonus to next attack and increases DSP by 1. |
| Template | **Bonadan-Alloy Armor** (`kotor-template-bonadan-alloy-armor`) | armor | 80 | Armor DR 2 vs slashing, Fortitude equipment bonus -1 minimum 0. |
| Template | **Bronzium Cast Armor** (`kotor-template-bronzium-cast-armor`) | armor | 80 | Once/encounter redirect incoming damage into armor object; item may become disabled/destroyed and suppress bonuses. |
| Template | **Durasteel Cast Armor** (`kotor-template-durasteel-cast-armor`) | armor | 80 | Grants wearer DR 1; Fortitude equipment bonus -1 minimum 0. |
| Template | **Environmental Bastion Armor** (`kotor-template-environmental-bastion-armor`) | armor | 80 | Sealed environment suit with hours of air equal to armor Fortitude equipment bonus. |
| Template | **Eriadun Armor** (`kotor-template-eriadun-armor`) | armor | 80 | Armor or energy shield DR 5 versus stun; Fortitude equipment bonus -1 minimum 0. |
| Armor accessory | **Armor Reinforcement** (`kotor-accessory-armor-reinforcement`) | armor | 75 | Wearer DR 2 versus piercing. |
| Weapon accessory | **Beam Splitter** (`kotor-accessory-beam-splitter`) | weapon | 75 | Once/encounter Power Blast trades 1 attack bonus for 2 damage per point. |
| Weapon accessory | **Durasteel Bonding** (`kotor-accessory-durasteel-bonding`) | weapon | 75 | Weapon object DR +5; +1 damage die after critical multiplication. |
| Weapon accessory | **Enhanced Energy Projector** (`kotor-accessory-enhanced-energy-projector`) | weapon | 75 | Once/encounter reroll a natural 1 on attack; keep second result. |
| Weapon accessory | **Hair Trigger** (`kotor-accessory-hair-trigger`) | weapon | 75 | Once/encounter may reroll damage when attacking with Rapid Shot, keep better. |
| Weapon accessory | **Improved Energy Cell** (`kotor-accessory-improved-energy-cell`) | weapon | 75 | Doubles shots per power pack; raises existing Tech Specialist Improved Damage bonus +2 to +3 rather than stacking. |
| Armor accessory | **Mesh Underlay** (`kotor-accessory-mesh-underlay`) | armor | 76 | +5 equipment bonus to wearer damage threshold against stun damage. |
| Weapon accessory | **Tremor Cell** (`kotor-accessory-tremor-cell`) | weapon | 76 | Adds swift-action stun setting dealing normal weapon damage as stun. |
| Focusing crystal | **Bondar Crystal** (`kotor-crystal-bondar`) | weapon | 66 | Substitutes stun for normal damage; used in training sabers. |
| Focusing crystal | **Firkraan Crystal** (`kotor-crystal-firkraan`) | weapon | 66 | Substitutes ion for normal damage. |
| Focusing crystal | **Luxum Crystal** (`kotor-crystal-luxum`) | weapon | 66 | Same ion conversion as Firkraan. |
| Focusing crystal | **Jenraux Crystal** (`kotor-crystal-jenraux`) | weapon | 67 | +2 Force bonus on Use the Force checks to Block melee attacks. |
| Focusing crystal | **Opila Crystal** (`kotor-crystal-opila`) | weapon | 67 | +1 weapon die added AFTER critical multiplication. |
| Focusing crystal | **Phond Crystal** (`kotor-crystal-phond`) | weapon | 67 | +1 damage die against target with active shields. |
| Focusing crystal | **Rubat Crystal** (`kotor-crystal-rubat`) | weapon | 67 | Once/encounter reroll weapon damage; keep better. |
| Focusing crystal | **Eralam Crystal** (`kotor-crystal-eralam`) | weapon | 67 | Once/encounter reroll weapon damage; keep better. |
| Focusing crystal | **Upari Crystal** (`kotor-crystal-upari`) | weapon | 67 | Once/encounter reroll weapon damage; keep better. |
| Focusing crystal | **Sigil Crystal** (`kotor-crystal-sigil`) | weapon | 67 | +2 Force bonus on lightsaber damage rolls, creator only. |
| Focusing crystal | **Daminia Crystal** (`kotor-crystal-daminia`) | weapon | 67 | +2 Force bonus on lightsaber damage rolls, creator only. |
| Focusing crystal | **Nextor Crystal** (`kotor-crystal-nextor`) | weapon | 67 | +2 Force bonus on lightsaber damage rolls, creator only. |
| Focusing crystal | **Sapith Crystal** (`kotor-crystal-sapith`) | weapon | 67 | +2 Force bonus on lightsaber damage rolls, creator only. |
| Focusing crystal | **Solari Crystal** (`kotor-crystal-solari`) | weapon | 67 | +2 Force bonus on Use the Force checks to Deflect ranged attacks, creator only. |
| Sith Alchemy | **Create Sith Talisman** (`kotor-created-sith-talisman`) | equipment | 41 | Creates a portable Sith talisman; when carried/worn grants +1d6 Force power damage; first use gives 1 Dark Side point; only one talisman active. |

### Five additional KOTOR source procedures

- `kotor-gear-template-governance` (printed pp. 76, 77, 78, 79, 80): Templates are rare authored variants of basic equipment, not ordinary upgrade-slot installations. Normally one non-exempt template per item; Prototype, Quick Draw Weapon, and Cortosis/Phrik exempt from this cap. GM may explicitly waive; stacked price adjustments most expensive first, compounded sequentially.
- `kotor-weapon-armor-accessory-installation` (printed pp. 75, 76): Most weapons and armor can have only one accessory unless GM permits more; every Table 5-6 accessory also carries explicit Scum & Villainy upgrade-slot costs. Both accessory count AND generic slot capacity require checks.
- `kotor-alternate-lightsaber-crystal-rule` (printed pp. 66, 67): An alternate crystal occupies the focusing crystal choice, replacing personally-built lightsaber ordinary +1 attack bonus; Force bonuses apply only to creator. Crystals are quest items and not for sale. Construction otherwise proceeds normally. Same-effect alternatives are mutually exclusive primary crystal options, not independent stackable effects.
- `kotor-create-sith-talisman` (printed pp. 41): Sith Alchemy: Create Sith Talisman spends one Force Point and a full-round action transforming portable object; one active carried/worn talisman grants +1d6 Force power damage, first use adds 1 DSP, replacement blocked 24h after destroyed.
- `kotor-create-sith-weapon` (printed pp. 41, 79): Sith Alchemy: Create Sith Weapon spends one Force Point and one hour to treat properly prepared weapon, granting Sith Alchemical Weapon template. Dark Side Adept and Dark Side Master are printed prerequisites of Sith Alchemy talent; preserve actual learned-talent check. Template restricted to simple/advanced melee.

### Existing repository seams requiring Claude to inspect before implementation

- `data/gear-templates.json` contains broad template definitions; `scripts/data/gear-templates.js` and `scripts/apps/gear-templates-engine.js` have a narrower first-wave subset; `scripts/engine/customization/template-engine.js` independently receives templates from `upgrade-catalog.js`. **Do not assume a unique template SSOT exists.**
- Lightsaber crystal definitions also exist in `scripts/data/lightsaber-crystals-map.js` and `packs/lightsaber-crystals.db`, but their real effect consumers, attunement and swap/remove persistence remain to be reconciled.
- `scripts/engine/customization/tech-specialist-modification-service.js` already writes mutable weapon/armor effects. Existing templates, crystals, and accessory modifiers cannot simply be added a second time to a new aggregator.
- `ModificationSlotAuthority` is still proposed. Resolve in-scope host-domain arithmetic from published stock + certified grants - installed costs, never Workbench-specific fallback or directly mutated `system.upgradeSlots` as a second total.

### Open proof and testing gates

1. Reconcile real production template registry identities and check the limit/price order on multi-template items (Prototype/Sith Alchemical/Quick Draw/Cortosis combinations).
2. Verify source-vs-actor DR: armors grant wearer DR; Durasteel Bonding modifies **weapon object** DR; lightsaber-bypass exception alone is not DR value.
3. Verify alternate crystal replacement suppresses self-built Core +1 attack but preserves the rest of permanent weapon modifications, and Force bonuses are creator-only.
4. Prove conditional damage packets use the correct phase, and avoid multiplying post-critical additions.
5. Block installation/removal when accessory capacity or generic slot budget fails, in Workbench and every alternate caller.
6. Do not implement item-object-damage-dependent rules until object damage authority exists. No code implementation or source files/packs were changed in this pass.

### Live repository identifier crosswalk (verified against main `9cca1452a3f9b65dca2713ad0e534b3cb3da7361`)

All **23 KOTOR template names** already have canonical-like catalog keys in `data/gear-templates.json`: 11 in `generalTemplates`, seven in `weaponTemplates`, five in `armorTemplates`. This proves a source catalog exists, **not** that runtime installations or effects are correct. `scripts/data/gear-templates.js` supplies a different/narrower Workbench catalog, so do not blindly merge them.

Eight KOTOR named crystals also appear in `scripts/data/lightsaber-crystals-map.js`: Bondar, Firkraan, Jenraux, Opila, Phond, Rubat, Sigil, Solari. The six variant names **Luxum, Eralam, Upari, Daminia, Nextor, Sapith** are verified source identities sharing those effects, but were not present as keys in that map. No new production ID should be invented without catalog reconciliation.

**Do not interpret the KOTOR Sith Alchemical Weapon template as a valid ordinary lightsaber template:** its restriction says simple and advanced melee weapons only. A separately published lightsaber alchemy rule would require its own provenance.


## v0.6 QA/checkpoint

Prior 114 definitions and 14 procedures are preserved value-identically. New definitions are strictly host-domain-typed; two source entries (Infuse Weapon and Manual Trigger) and three procedures add to 116 definitions / 17 procedures, with zero executable certification. This targeted pass uses PDF page verification and does not conclude that every incidental sentence of the sourcebook has been examined.

## v0.7 QA/checkpoint

Previous **116 definitions** and **17 procedures** preserved value-identically. New **2** typed definitions and **4** procedures bring registry to **118 definitions and 21 procedures**. One new verified equipment-table row (Halo Lamp) raises printed table-certified row count to **77**. Mechanically source-certified definitions **60**; runtime-certified **0**. PDF printed p.45, 46, 65, 66 were checked visually. Droid, vehicle and starship systems remain excluded.

---

## v0.8 - Legacy Era Campaign Guide (targeted page certification)

**Source:** *Legacy Era Campaign Guide*, printed pp. 31, 34-35, 41, 66, 97-98, 100-101. All cited passages/tables were visually checked against the uploaded PDF. Other parts of the book have not yet been exhaustively certified. PDF file page number = printed page + 1 for these pages.

**Change:** 18 new source definitions, seven new procedures and nine in-scope table rows. Prior 118 definitions and 21 procedures are unchanged. No production implementation approved.

### Biotech Specialist - nine traits (printed pp. 34-35)

| Host type | Trait | Canonical mechanical effect | Typed effect target |
|---|---|---|---|
| Armor | Agile Armor | Max Dex +1 | `armor.limits.maxDexBonus` |
| Armor | Fortifying Armor | Equipment bonus to Fortitude Defense +1 | `armor.defense.fortitudeEquipmentBonus` |
| Armor | Protective Armor | Armor bonus to Reflex Defense +1 | `armor.defense.reflexArmorBonus` |
| Device | Enhanced Strength | Strength score +2 | `gear.attributes.strength` |
| Device | Improved Durability | DR +1 and extra maximum HP equal to 1/4 of original maximum HP | `gear.durability.biotechSpecialistDurability` |
| Device | Mastercraft Device | +1 equipment bonus for using device / increase current equipment bonus by 1 | `gear.skills.equipmentBonus` |
| Weapon | Improved Accuracy | Equipment bonus +1 attack | `weapon.attack.equipmentBonus` |
| Weapon | Improved Damage | +2 successful-hit damage **before** any multiplier | `weapon.damage.preMultiplierFlatBonus` |
| Weapon | Selective Fire | Eligible ranged weapon gains alternate single/autofire option | `weapon.capabilities.selectiveFireMode` |

**Different authority, same labels:** These names deliberately resemble the Tech Specialist benefits in *Starships of the Galaxy*. They are **not interchangeable source IDs**: Biotech Specialist applies to Yuuzhan Vong biotech; ordinary Tech Specialist does not apply to biotech, even after a technological graft (p. 31, 60). Repository `scripts/engine/customization/tech-specialist-modification-service.js` currently stores ordinary Tech Specialist traits, which cannot automatically authorize the new biotech family.

**Biotech Specialist procedure:** Mechanics trained; feat required; cost **max(1/10 item price, 1,000 credits)**; work **1 day per 1,000 credits**; **DC 20 Mechanics**, cannot Take 10 or 20 by default. A failed check consumes cost. Typically one benefit per host and no duplicate benefit; only helpers with Biotech Specialist may aid. Market value gains twice successful modification spending. Shaper **Biotech Mastery (p. 41)** changes this procedure to half time, half cost and allows Take 10. No general Scum upgrade-slot charge is printed.

The table's **Add Device to Creature** and droid/vehicle/ship-related options are excluded from this item registry, not counted as in-scope missing effects. The printed table's qualifying nine item trait rows are indexed.

### Yuuzhan Vong Biotech Template (p. 66)

This is **one published multi-host template** represented by three strictly typed host variants, **not three different source identities**:

- **Weapon:** compatible host becomes biotech; energy weapon base damage replaces energy with selected bludgeoning/piercing/slashing type. Biotech weapons are normally Illegal in this era; lightsabers and most exotic weapons/explosives have no biotech equivalent.
- **Armor:** biotech host halves weight while **preserving armor weight class**, armor defense and Max Dex rules.
- **Equipment:** biotech device may impose **-5** on use checks by an unfamiliar nonqualifying user. Do not apply indiscriminately to all items and actors.

All template outputs cost **four times** the technological equivalent and are generally **Rare**; biotech objects use Treat Injury for repair and Knowledge (life sciences) for identification. Their allowed enhancement feat is Biotech Specialist, not Tech Specialist. The template creates/defines a biologically distinct host and must not be represented as a free generic upgrade slot.

### Mechanics device grafting (p. 31)

| Definition | Requirement / check | Source-constrained behavior |
|---|---|---|
| Graft Technology | Trained Mechanics, tool kit; one hour; DC 25 | Creates standard mechanical/computer interfaces on a biotech **device**. Remains biotech and cannot receive Tech Specialist. |
| Mechanical Enhancements | Prior successful technology graft; trained Mechanics, tool kit; one hour; DC 30 | Connect **one** same-or-smaller equipment **device** and expose its traits; not weapons/armor. Preserve physical component identity. |

These are device integration operations and **do not justify changing droid/vehicle/ship customization**.

### Optional Heirloom Items (pp. 97-98)

A character can create an heirloom through a qualifying **Legacy destiny fulfillment** or alternative death-in-pursuit-of-destiny outcome. The system is optional and requires GM enablement. Item must be involved as specified. **Select one** benefit; it lasts until destruction.

| Heirloom benefit | Published effect | Implementation boundary |
|---|---|---|
| Extra Modification | May apply **second** Tech Specialist benefit | **NOT an ordinary upgrade slot**; preserve separate Tech Specialist benefit-count authority. |
| Legendary Icon | Favorable circumstances on Charisma-based skill checks except Use the Force when plainly carried | No invented flat +2 numeric modifier; situational adjudication. |
| Steeped in the Dark Side | 1/encounter destiny bonus equal to half user's Dark Side Score on one attack/skill check; using it increases user's DSP by 1 | Existing DSP actor authority and typed conditional bonus owner; rounding policy not supplied here. |
| Symbol of the Light | 1/encounter reaction; impose penalty equal to target's DSP on one attack/skill check by a target with DSP >=1 | Existing target/attack/skill authority; do not invent spatial restrictions. |

These four source identities each carry **weapon, armor and gear typed variants** because the source permits any qualifying heirloom Item. They are **event-driven persistent qualities**, not shop upgrades and not free capacity increases. Cross-check Signature Device and Superior Tech second-trait logic before implementing benefit-count mutations.

### Weapon era templates and refitting (pp. 31, 100-101)

| Weapon template | RAW summary | Caveat |
|---|---|---|
| Antiquated | Non-Core pre-Legacy weapon; +10% price, Rare, old power cells/packs cost +50%, standard power packs/cells incompatible absent exception, +5 Mechanics build/repair DC | Only eligible old published models; not applied to all old-era equipment. |
| Refitted | Replaces Antiquated, +20% price, Rare, standard cells/packs compatible; power-pack ammo shot capacity +10%, +5 Mechanics repair DC; weekly 1h toolkit maintenance, overdue -1 **persistent** CT step/day | Mutually exclusive with Antiquated. Separate raw-material process may not be charged twice. |

**Refit procedure (p. 31):** Mechanics trained and tool kit; raw materials **20% of base value before Antiquated template**; size-based labor: Medium or smaller 1 day, Large 2, Huge 5, Gargantuan 10, Colossal 20, using 8-hour days. Multiple Mechanics-trained workers can divide time (up to 20 helpers, minimum 1 day). Exclude larger vehicle/ship scales from this registry. The source does not specify rounding for +10% ammunition shots; never guess silently.

The current `data/gear-templates.json` contains `weaponTemplates.antiquated` and `.refitted`; that establishes catalog presence **not** a verified live workflow. `scripts/data/gear-templates.js` lacks both in its current first-wave UI catalog. This producer divergence is an implementation audit item.

### Explicit exclusions and downstream questions

- Actor bio-implants, Biotech Surgery on a living creature, creature-graft table row and droid/vehicle/ship upgrades remain outside this equipment-modification pass.
- Stock items (phrik gauntlets, specialized armor, synthetic lightsaber crystals, special weapons) stay distinct canonical Item identities unless a separate printed **modification procedure** permits transferring those properties.
- Source checks are **page-level certified**, not exhaustive whole-book certification. No end-to-end effect, slot, attack roll, DSP, maintenance or installation/removal consumer has been certified.
- Particularly dangerous: (1) allowing ordinary Tech Specialist on biotech; (2) counting Extra Modification as a slot; (3) layering Antiquated and Refitted effects; (4) duplicating DR/HP on device reapplication; (5) replacing physical grafted device with copied free traits.

**Claude handoff:** Preserve the v0.8 source registry unchanged during the runtime-authority convergence audit; implement only after a source-based mapping from `producer -> stored instance -> slot/effect resolver -> roll/render consumer -> uninstall/rollback` is complete for the selected item family.


---

## Rebellion Era Campaign Guide — v1.0 source pass (pp. 43, 106–107, 126)

**Book status:** `TARGETED_MODIFICATION_RULES_SOURCE_VERIFIED_FURTHER_SWEEP_PENDING`; **not** full whole-book closeout. Source PDF is scanned; searchable TXT is the locator, rendered PDF images of all cited pages are final wording/layout evidence. In this supplied PDF printed page N corresponds to PDF page N+1.

**Increment:** +3 source-verified definitions; +7 procedures/links (6 source-certified rules and one host-classification research lead); +1 *cross-book source reference* (Phrik Alloy, **no duplicated canonical modification**). **No new generic upgrade-slot charge.**

### New definitions and domain-specific effects

| Definition | Source | Host domain | Rule/effect | Implementation boundary |
|---|---|---|---|---|
| Stygian-Triprismatic Polymer (Armor Template) | p.126 | Armor only | Armor's **armor bonus increases by 1**; **+2 equipment bonus** to Stealth checks avoiding electronic sensors; armor price **+20%** | Template material quality, **not** +1 Reflex *equipment* bonus; source does not give ordinary upgrade-slot cost or post-purchase installation permission. |
| Excellent Kit (Purchased Item Quality) | p.43 | Weapon, armor, general equipment | All purchases by Improviser with **Excellent Kit** have **+50% object HP**, **+5 object DR**. Purchaser's allies making Mechanics checks on purchased item gain **+2 equipment bonus** | Purchase-time provenance. No wearer/actor HP or DR. Round fractional HP only under certified object HP rules; item persists as a quality, not re-applied each session. |
| Jury-Rigged Power-Pack Bomb | p.107 | Equipment explosive | Constructed consumable uses **2–5 packs**; burst **2 squares**; each pack contributes **two matching damage dice**; charge explodes after secretly rolled **1d6 rounds** | Destructive conversion + inventory consumption. Timed-device creation has separate check/failure; no fixed bomb damage value independent of pack choices. |

The Stygian source is **p.126**, where it states that the *armor bonus* increases by 1. Current `data/gear-templates.json#armorTemplates.stygianTriprismatic` incorrectly summarizes this as “+1 Reflex equipment bonus.” That description/type must be repaired upstream in a later production implementation. Its `effects.reflexBonus:1` also requires a typed armor-bonus resolution review, not merely a renamed description.

### Improviser talent interaction rules (p.43)

- **Improvised Device:** One use per day, **one hour** and **Mechanics DC 25** to make temporary familiar nonunique gear, valued at no more than **200 credits × Improviser class level**. Item cannot have Rare or Illegal availability. It is destroyed after **24 hours**.
- **Custom Model:** Requires Improvised Device talent **and** Tech Specialist feat. Applies **one preexisting Starships of the Galaxy Tech Specialist modification** to the newly created device without increasing its value. **No new trait ID** and no generic slot grant. It expires with the temporary object.
- **Only the Finest:** Requires Black Market Buyer. When buying black-market goods, the Improviser can purchase already-Tech-Specialist-modified gear without paying an increased **base item value**. This is procurement, not universal free Tech Specialist installation or a stacking exemption.
- **Bigger Bang:** Requires Improvised Device; when a temporary *grenade* is produced using it, the grenade deals **one extra die** of damage. Not transferable to other crafted explosives unless another rule permits that.
- **Excellent Kit:** Procurement talent, documented above; applies when qualifying items are purchased, not whenever the talent holder touches or later modifies an item.

### Power-pack bomb — p.107 procedure

| Field | Printed rule |
|---|---|
| Components | **2–5 power packs**, mesh tape; optional timed trigger or remote detonator with dowel-removal mechanism; tool kit needed for timer. |
| Normal assembly | **2 minutes**, Mechanics **DC 15**; **DC 10** with Tech Specialist. Failure **10 or more below DC** triggers instant explosion. |
| With timer | **30 minutes**, Mechanics **DC 25**; **DC 20** with Tech Specialist. **Any failed check** causes immediate explosion. |
| Trigger and delay | After last dowel removal or detonation device activation, bomb explodes after **1d6 rounds**, rolled secretly by GM; it cannot be disarmed once charging starts. |
| Blast and damage | **2-square burst**; **2 appropriate dice per power pack**. Example: two rifle packs and one pistol pack produce **4d8+2d6**. Standard power cells provide d6 dice. |
| Usage | Throwable like a grenade or place with Mechanics Place Explosive Device application. Existing area attack/GM rules resolve it. |

The packaged `packs/equipment-security.db#explosive-power-pack-bomb` is an existing standalone Item with the correct origin title, but its damage remains “Varies” and the craft, failure and charge timing rules are absent. **Do not edit generated packs directly**; trace the canonical generator/store descriptor and repair the producer after the registry contract is approved.

### Reprints, exclusions, and other evidence

- **Phrik Alloy (p.126):** Lightsabers do not bypass armor made with phrik; +20% item cost. Cross-references `kotor-template-cortosis-phrik`, **not** a second independently stackable Phrik template. Verify KOTOR vs Rebellion text scope at implementation time.
- **Repulsor sled (p.106):** Temporary +2 squares speed **or** altitude, 2 minutes and Mechanics DC15 (DC10 with Tech Specialist), 2d4-round life followed by circuitry failure. **Research lead only** pending host identity (cargo equipment versus vehicle). If vehicle, exclude from this refactor.
- **Shield generator and reactor sabotage (pp.106–107):** Fixed infrastructure actions, not ordinary buyable gear upgrades or general slot-cost modifications.
- **Speeder, walker, ship/vehicle mounted-weapon sabotage and restraining bolt control (pp.106–107):** Excluded droid/vehicle/ship systems.
- **Seatrooper armor, zero-g armor and propulsion pack (p.127):** Published **stock item identities** and designed pairings. They do not prove a general-purpose retrofittable armor modification.

### Claude implementation gates

1. Preserve all previous **136 definitions** and **28 procedures** unmodified; new entries have unique stable IDs.
2. No new generic slot allowance or duplicate Tech Specialist trait is invented from Custom Model or Only the Finest.
3. Distinguish object HP/DR from actor HP, equipped armor bonus and wearable defenses. Excellent Kit math applies **once** to the purchased item baseline and checks are conditional.
4. Stygian material uses armor bonus **+1**, not a general +1 Reflex equipment bonus; +2 sensor-only Stealth remains distinct.
5. Power-pack bomb must consume actual components, resolve variable mixed dice, apply independent normal-vs-timed check failures and delayed detonation. Do not auto-run unverified spatial damage.
6. Source procedure ≠ installed compendium upgrade. Every installed persistence path must be reconciled `producer -> instance -> effective resolver -> consumer -> removal/expiry/rollback`.
7. No runtime certification or implementation permission is implied by this book pass. **All new rows remain research-only.**

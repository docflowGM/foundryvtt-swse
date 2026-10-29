# SWSE Droid Rules-to-Schema Contract — Draft v0.13

**Status:** Source-audited architecture draft, **not** a production schema or complete corpus certification. No repository files changed. **Primary sources:** *Star Wars Roleplaying Game Saga Edition Core Rulebook* (Core), *Scavenger's Guide to Droids* (SGD), *Knights of the Old Republic Campaign Guide* (KotOR); *Scum and Villainy* (S&V) for the different equipment-upgrade-slot rules. Page references below are **printed book pages**, not zero-indexed PDF page numbers. Text extraction was checked against rendered Core pp.186–197 and SGD pp.10–13 for tables and critical passages; other cited pages are text-layer reviewed and require explicit rendered-page attestation in the full source audit.

**Baseline constraints approved by owner:** No legacy player-droid data migration; use existing vehicle, species/anatomy, equipment, and modification authorities; a published model is an enumerated baseline rather than a factory recipe; existing application readers/writers must nonetheless cut over atomically.

## 0. Governing source-precedence decision (DROID-RULE-001)

**Owner ruling, 2026-10-29:** *Scavenger's Guide to Droids* takes precedence over the *Saga Edition Core Rulebook* **when both establish directly incompatible droid rules**. This is a project-specific adjudication, **not a claim that one publication officially supersedes the other in all matters**.

**Evaluation contract:**

1. First identify the exact rule scope: component, operation, model/chassis, creation pathway, and any explicit condition or exception. Cite book and printed page for each candidate rule.
2. If SGD directly contradicts Core **for the same scope and conditions**, apply SGD. Record the displaced Core reading and the controlling SGD reading in audit evidence; do not silently overwrite the historical citation.
3. If SGD provides an **additional compatible mechanic**, retain Core's rule and apply the SGD addition. If SGD is silent, Core governs.
4. A rule limited to one stock chassis, published model, or creation method does not silently become a global rule for all droids. Treat these as scoped exceptions rather than conflicts unless the source explicitly generalizes them.
5. **KotOR and other supplements:** include their published rules and scoped exceptions, but do not presume a universal priority relationship between these books and SGD/Core. Unresolved direct conflicts outside the Core-vs-SGD pair remain owner decisions or explicit errata questions.
6. **Intra-book conflicts:** DROID-RULE-001 alone does not resolve two inconsistent Core passages or two inconsistent SGD passages. Seek a direct controlling SGD passage for a Core discrepancy; otherwise mark it unresolved pending errata or owner decision.
7. Maintain audit fields for `ruleIdentity`, `scope`, `candidateSources[]`, `controllingSource`, `resolutionBasis` (`DIRECT_SGD_OVER_CORE`, `COMPATIBLE_ADDITION`, `SCOPED_EXCEPTION`, `SILENCE_CORE_DEFAULT`, `OFFICIAL_ERRATA`, `OWNER_RULING`, `UNRESOLVED`), and `sourceVerification`. Only emit executable mechanics when the controlling source and prerequisites are certified.

**Impact:** All subsequent droid schema field definitions, cost expressions, install rules, creator pathways, mechanical effects, and acceptance tests must run a Core-vs-SGD conflict check before being marked canonical. The policy **does not** merge droid system positions with equipment Item upgrade slots and **does not** override the Scum and Villainy Item-domain modification authority by implication.

## 1. Rule-domain separation: what 'slot' can mean

| Domain | Source rule | Consequence | Confidence |
|---|---|---|---|
| Droid systems | Core pp.188–197: locomotion, appendage, processor, accessory; systems can be installed/replaced | **No generic numeric pool of 'droid system/component slots' is established by these general rules.** Enforce particular component restrictions and physical placements; do not invent universal slot budgets. | Source-verified general rule; other supplements not exhausted |
| Physical appendages | Core p.190: any number of appendages, but no extra actions or attacks | The new schema needs unique physical **instance/location identities**, not an arbitrary capacity count. A specific model may enumerate an available location. | Verified |
| Named model attachment positions | Core p.197–198 R2 model discussion names four standard appendages and two empty slots | Store model-specified attachment positions **if published**. This is not proof that every droid has two spare mounts. | Source-text reviewed |
| Item upgrade slots | S&V pp.38–39: slots belong to weapons, armor, equipment items; KotOR's weapon/armor accessories reference these slots (KotOR p.69–70) | A weapon/armor/equipment installed on a droid keeps its own **Item** upgrade-slot authority. Those slots do not enlarge or consume a generic chassis pool. | Source-text reviewed, repository authority confirmed |
| Storage/weight | Core p.194: size-dependent internal storage limits, mass and encumbrance | Separate **mass/storage capacity** from installation positions and upgrade slots. | Rendered verified |

**Architectural invariant SLOT-1:** Never use one `slots` number to represent all these concepts. A 'physical mount', an Item's 'upgrade slot', an extra locomotion surcharge, and internal-storage kg are different rules.

## 2. Droid degrees (Core p.186, Table 11-1)

| Degree | Function/role | Degree-based modifiers |
|---|---|---|
| 1 | medical/scientific | +2 Int, +2 Wis, -2 Str |
| 2 | astromech/technical | +2 Int, -2 Cha |
| 3 | protocol/service | +2 Wis, +2 Cha, -2 Str |
| 4 | combat/security | +2 Dex, -2 Int, -2 Cha |
| 5 | labor/utility | +4 Str, -4 Int, -4 Cha |

These are the custom-droid **degree packages**. The function need not match the chosen degree. **Do not blindly add these again to SGD stock-chassis ability modifiers:** SGD pp.10–13 defines chassis as species-like packages with printed modifiers and degree identity. This requires a single rule provenance per applied modifier.

## 3. Droid size and cost factor (Core p.187, Table 11-2)

| Size | STR | DEX | Reflex size | Stealth size | Bonus HP | Bonus damage threshold | Carrying multiplier | Cost factor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Fine | -8 | +8 | +10 | +20 | 0 | 0 | 0.01 | 20 |
| Diminutive | -6 | +6 | +5 | +15 | 0 | 0 | 0.25 | 10 |
| Tiny | -4 | +4 | +2 | +10 | 0 | 0 | 0.5 | 5 |
| Small | -2 | +2 | +1 | +5 | 0 | 0 | 0.75 | 2 |
| Medium | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Large | +8 | -2 | -1 | -5 | +10 | +5 | 2 | 2 |
| Huge | +16 | -4 | -2 | -10 | +20 | +10 | 5 | 5 |
| Gargantuan | +24 | -4 | -5 | -15 | +50 | +20 | 10 | 10 |
| Colossal | +32 | -4 | -10 | -20 | +100 | +50 | 20 | 20 |

`0` in the table means **no extra size-derived bonus** (not that an actor's total HP or damage threshold is zero). For Core **custom PC** creation only Small/Medium are permitted absent GM control; other sizes exist for models/NPCs. The Core custom starting locomotion differs: Medium walking 6, Small tracked 4 (Core p.186). **Do not apply those defaults to an already enumerated model or stock chassis.**

**Important:** Small droids have cost factor **2**, not 1; miniaturization increases expenses. Size factor only multiplies costs/weights when the actual published price rule calls for it. Never apply factor to arbitrary flat-cost equipment.

**Chassis exception:** SGD pp.10–13 stock-chassis speed, degree, built-in equipment and modifiers are specific packages. Astromech has wheeled 6 **and** walking 4, for example. No automatic second locomotion purchase for this free starting chassis package.

## 4. Locomotion (Core pp.188–189, Table 11-3)

| Type | Up to Small | Medium | Large+ | Base cost (credits) |
|---|---:|---:|---:|---|
| Walking | 4 | 6 | 8 | 10 × cost factor × (speed in squares)^2 |
| Wheeled | 6 | 8 | 10 | 5 × cost factor × speed^2 |
| Tracked | 4 | 6 | 8 | 20 × cost factor × speed^2 |
| Hovering | 6 | 6 | 6 | 100 × cost factor × speed^2 |
| Flying | 9 | 12 | 12 | 200 × cost factor × speed^2 |

These are table movement entries, not an unconditional prohibition against an explicitly published model with a different value. A droid can possess multiple locomotion systems. The additional cost for the **second/third/fourth/fifth** locomotion system is 500/1,000/2,000/5,000 × the cost factor **on top of the relevant system's cost** (Core p.188). No sixth-system formula is established there: don't extrapolate. Stationary droids have no locomotion.

Core p.189: A **restricted** locomotion system costs 10% of normal and has either an *exclusive* restriction (move action to engage/disengage; while engaged, only move/run) or a *limited* restriction (after each round of use, an Endurance check beginning DC 10 and increasing by 1 on subsequent checks; failure blocks this system for 1 minute). Specialized locomotion additions are individually governed: extra legs on walking system double the associated system cost, grant +50% carrying and +5 stability against prone; climbing claws and jump servos have their own rules; magnetic feet require walking/wheeled/tracked locomotion. **SOURCE CONFLICT:** Core p.189 descriptive text prices climbing claws and jump servos by *doubling the walking locomotion system cost*, whereas the accessory table on Core p.194 prints **appendage cost × 2** for climbing claws/jump servos (and magnetic feet). These bases are materially different. Under **DROID-RULE-001**, first check whether SGD supplies a directly applicable controlling rule; if not, this remains an **intra-Core conflict**. Mark prices `BLOCKED_SOURCE_CONFLICT` pending authoritative resolution; do not choose a formula quietly. SGD pp.51–52 adds burrower drive, gyroscopic stabilizers, underwater drive, etc.

**Schema rule:** `locomotion[]` contains independently identifiable installed instances, speeds, activation state and published modifier IDs. Derived active movement is **not** stored as a competing editable field. Treat factors/surcharges as a **pricing expression and ledger**, not immutable intrinsic costs.

## 5. Appendages, manipulation, and natural/unarmed attack (Core pp.189–190, Table 11-4)

Core recognizes five basic **appendage kinds**: `probe`, `instrument`, `tool`, `claw`, `hand`. An appendage is a nonlocomotion/nonbalance limb. **Any number** may be installed, but their number does not increase combat actions or attacks.

| Kind | Function and restrictions |
|---|---|
| Probe | Push/pull; no general grasp or wield permission. |
| Instrument | Performs designated specialty task; certain clamping instruments can hold; their carrying limit uses **one-quarter of actual Strength** for this purpose. Not every instrument can hold. |
| Tool | For an object outside its design, DC 15 Dexterity check to lift/carry/drag; failure drops it; GM may set a higher DC for delicate objects. |
| Claw | Can carry/grip, but hand-like fine manipulation requires DC 15 Dexterity check; failure drops manipulated object. Carrying a blaster does not automatically establish permission to fire it. |
| Hand | True hand has at least three digits including one opposable digit. |

**Unarmed attacks are appendage- and size-specific**, plus Strength modifier (this is not an extra action):

| Size | Probe | Instrument | Tool | Claw | Hand |
|---|---|---|---|---|---|
| Fine | — | — | — | 1 | — |
| Diminutive | — | — | — | 1 | — |
| Tiny | — | — | 1 | 1d2 | 1 |
| Small | — | 1 | 1d2 | 1d3 | 1d2 |
| Medium | 1 | 1d2 | 1d3 | 1d4 | 1d3 |
| Large | 1d2 | 1d3 | 1d4 | 1d6 | 1d4 |
| Huge | 1d3 | 1d4 | 1d6 | 1d8 | 1d6 |
| Gargantuan | 1d4 | 1d6 | 1d8 | 2d6 | 1d8 |
| Colossal | 1d6 | 1d8 | 2d6 | 2d8 | 2d6 |

The source table's em dash means no listed unarmed damage for that pairing; it is **not numeric zero**. Verify any alternative feat/talent/weapon exceptions separately.

A mounted weapon is normally considered a **tool appendage**, unless otherwise stated; the mount itself does not include the weapon's price (Core p.190). A **stabilized mount** costs and weighs five times the ordinary tool mount and allows a larger weapon to be used as though wielded in two hands. A telescopic appendage doubles the appendage's normal reach. SGD pp.52–53 adds quick-release couplings, magnetic hands, projectile hand, remote limb control, rocket arm; each carries own mechanics/limits.

**Schema rule:** physical appendages require `instanceId` distinct from `partDefinitionId` and stable `locationId`; each states capabilities (`canHold`, `canWield`, `canManipulate`: `true|false|null`), fitted tool/mount, current attachment/functional state, and flags for extensions. Null means **unknown**, not yes. The equipment/anatomy resolver owns grip, occupation, and attack-readiness decisions; droid schema must not implement a competing grip resolver.

## 6. Processors and droid brains (Core pp.190–191; SGD pp.49, 53)

- **Basic processor:** core baseline, cannot attempt skills untrained except Acrobatics, Climb, Jump, Perception; cannot use a weapon without proficiency. Has strict literal programming/behavioral inhibitors. Source states every droid has at least a basic processor **or** remote-control arrangement; model-specific remote receivers require explicit handling.
- **Heuristic processor:** can use skills untrained and weapons without proficiency with usual -5 nonproficiency penalty; can creatively reinterpret instructions/behavioral inhibitors. Core custom heroes start with heuristic processor.
- **Remote processor and receiver:** remote processor is external, receiver installed; remote-controlled unit gets **-2 Dexterity**; receiver links to one processor at a time; changing link: DC 20 Mechanics and toolkit. Published ranges include 5/50/500/5,000 km variants (Core Table 11-5, p.195).
- **Backup processor:** remote-receiver droid may continue following last instructions when remote link is lost. Not a free fully independent heuristic upgrade.
- **Synchronized fire circuits:** additional +2 when successfully aiding a different droid on the same remote processor (Core p.191).
- **Specialized subprocessor:** SGD p.53 permits only **one**; adds one swift action/turn **restricted to a selected skill's actions**. Not a generic second swift action.
- **Disembodied droid brain:** SGD p.49 defines installation into computer/vehicle systems; pricing usually `25 × Intelligence²`; skill limits and DC 20 Mechanics/1 hour connection. This is not intrinsically another locomoting droid chassis.

**Schema rule:** distinguish `processorTopology` (`local`, `remote-controlled`, external `droid-brain` hosting); `primaryProcessorInstanceId`, `remoteReceiverInstanceId`, `remoteControllerRef`, `backupProcessorInstanceId` and `subprocessorInstanceIds`. The actor's Intelligence score and skill permissions are not to be conflated with processor hardware. Validate the actual published permitted combinations; don't assume one processor instance universally.

## 7. Droid nature, damage, maintenance (Core pp.187–188)

- No CON ability score; no CON-derived hit points; Strength modifier applies to Fortitude Defense; minimum ability score is 1.
- **Immunities:** poison, disease, radiation, noncorrosive atmospheric hazards, vacuum, mind-affecting effects, stunning effects and effects that function only against living targets. Do not convert this to immunity to all energy/ion or all Fortitude-targeting effects.
- **Ion vulnerability:** ion damage interacts with droids analogously to stun damage on living beings; do not treat `stun immunity` as `ion immunity`. Combat resolver must use canonical ion rules.
- No Force Sensitivity feat or Force powers per Core; model exception would need explicit primary-source evidence.
- **0 HP:** disabled until repaired to at least 1 HP; if the attack reaching zero also exceeds damage threshold, destroyed; destroyed cannot be repaired/salvaged under Core rule.
- **Repair:** HP regained via Mechanics; self-repair -5 Mechanics; no ordinary living-character healing.
- **Maintenance:** 100 operating hours, then 1-hour shutdown/recharge; without recharge, hourly Endurance DC 10 increasing +1 for each additional hour, failure persistent -1 condition step until recharged. Secondary battery extends operating time to 200 hours (Core p.196).
- **Shutdown:** willing shutdown standard action; unwilling requires grab and DC equal Will Defense Mechanics check, standard action while grabbed; locked access changes eligibility.
- **Behavioral inhibitors:** normally non-fourth-degree droids cannot knowingly harm sentient life; owner-obedience and heuristic-interpretation qualifications, plus specific manufacturer/character exceptions. Not a universal combat hard block; use provenance and GM adjudication where interpretation is required.

**Schema rule:** represent capabilities as typed effect/immunity traits contributed by canonical droid rules; retain repair/energy-cycle and shutdown state with appropriate engines. *Don't store a second list of recalculated `immunities` or ability bonuses per actor.*

## 8. Droid construction and installed armor/equipment

- Core p.193: built-in droid armor is separate from humanoid worn armor, and their armor bonuses **do not stack**. Bipedal droids with two hands may wear humanoid armor. Built-in light/medium/heavy armor does not lower speed, but nonproficiency imposes armor check penalty on listed skills **and attack rolls**; it has Max Dexterity restrictions. Use existing armor authority with a droid-specific **installation context**, not two competing armor bonus calculators.
- Core p.197: installation/replace/removal procedure: locomotion **Mechanics DC 25, one day**; processor **Use Computer DC 20 and Mechanics DC 20, one day**; appendage **Mechanics DC 20, one hour**; accessory **Mechanics DC 15, one hour**; tool/weapon/instrument mounted on appendage **Mechanics DC 15, ten minutes**, with **-5 on Mechanics check** when fitting a weapon to a 1st/2nd/3rd/5th degree droid. Self-modification -5 Mechanics and **cannot self-install or replace a processor**. All rates are rules from Core, not S&V weapon-modification procedure.
- Core p.194: internal storage priced 50 credits/kg. Tiny and smaller: none; Small 5kg, Medium 10kg, Large 20kg, Huge 50kg, Gargantuan 500kg, Colossal 5000kg. Separate weight capacity from number of physical mounts or equip upgrades.
- For SGD p.51, installed systems are directly chassis-integrated **accessories**; equipment on appendages or carried is a **possession**, even if associated with an appendage. Many droid-exclusive accessories supply specialized procedures/capabilities that must be individually source certified.
- Core p.194–196 accessories have **mixed pricing bases**: flat credit values, `base × size costFactor`, `weapon base + mount`, factor on weight, percentages, squared speed. Never globally multiply all upgrades by cost factor.
- SGD p.34–35 gives an **alternative pricing method** for complete droids, not a mandatory replacement for printed model costs. Keep `pricingPolicy` explicit and do not recompute the purchase value of every published stock model silently.

## 9. Creation route versus calculation mode versus origin

Three routes: `custom` (Core p.186); `standard-model` (Core p.187, full creation cost with adjustments ≤5,000 credits); `stock-chassis` (SGD p.10, species-like chassis, free bonus equipment, starting class credits, cost-neutral replacement within 10%, size/speed changes require GM approval). A published stock statblock NPC is **not automatically a legal starting PC**.

Independently choose current calculation mode: `published-statblock` (preserve printed numerical totals) or `derived` (PC math). Both should use the same installed-component identities; **never stack printed final totals with their already-included factory bonuses**. Track factory baseline provenance, physical presence and ongoing effects separately to support removal of a factory-installed component, without attempting to reconstruct historic manufacturing costs.

**Critical ownership rule:** each current *physical component instance* has **one** active installation record. Factory/chargen/aftermarket is immutable **origin metadata** on that record, not duplicate active ledgers. Definitions are stored in a canonical catalog; the actor references definition ids. Embedded equipment Items remain the sole Item upgrade hosts with links to the relevant physical mount. The actor's stable `system.size` and other already-canonical characteristic fields must not be duplicated under `system.droid`.

## 10. Proposed v0.1 shape — architectural pseudocode, not validated Foundry schema

```js
// Only new droid-specific authoritative fields shown. Existing actor size, abilities,
// classes, feats, skills, items, defenses and V2 Item flags stay with their owners.
actor.system.droid = {
  schemaVersion: 1,
  identity: {
    degree: 2,                       // 1..5; canonical degree package only for appropriate route
    creationRoute: 'stock-chassis',  // custom | standard-model | stock-chassis | npc-model
    chassisDefinitionId: 'astromech',// nullable; canonical chassis/species-like trait package
    modelDefinitionId: null          // nullable; printed stock model identity
  },
  calculationMode: 'derived',        // derived | published-statblock; resolved by one mode authority
  physical: {
    locations: [                    // stable named slots/locations, NOT a universal numeric capacity budget
      { locationId: 'arm-left', kind: 'appendage-mount', source: 'model-or-new-construction' }
    ],
    components: [                   // the ONE installation ledger: concrete physical instances
      {
        instanceId: 'component-001',
        definitionId: 'hand',        // canonical published part identity; not display name matching
        category: 'appendage',      // locomotion | appendage | processor | accessory
        locationId: 'arm-left',
        installation: 'chassis-integrated', // or appendage-attached, linked equipment, etc.; policy per rule
        origin: { kind: 'factory', sourceModelId: null },
        state: 'installed',
        equipmentItemId: null,       // when this physical mount links to a weapon/armor/other Item
        configuration: {}          // only permitted per-definition variables, e.g., size or restricted mode
      }
    ]
  },
  processorConnections: {
    primaryProcessorInstanceId: null,
    remoteReceiverInstanceId: null,
    remoteControllerRef: null,
    backupProcessorInstanceId: null
  }
};
```

**Not authoritative on this object:** `costFactor`, `upgradeSlots`, `maxArms`, derived unarmed attack formulas, cached modifier totals, `size`, `actor inventory`, a second `system.droidSystems` projection, or duplicate V2 Item `installedUpgrades`. These must be derived from the correct owning source or existing runtime APIs.

**Implementation dependencies:** the current `DroidCustomizationEngine` uses a per-part-ID set and legacy `installedSystems` / `droidSystems` records that cannot fully distinguish two instances of the same appendage; the existing `droid-appendage-projection.js` consequently does not grant physical capacity based on ambiguous legacy evidence. The clean cutover should replace this with real instance/location identities and consume the existing `anatomy-resolver`, `equipment-capability-resolver`, `ActorEngine`, `TransactionEngine` and V2 Modification APIs. The V2 modification typed domains remain weapon/armor/equipment unless an independently source-certified droid-specific host contract is approved.

## 11. Acceptance tests to write before cutover

1. Small size cost factor 2; medium 1; tiny 5; Large 2; all nine size table rows exactly match source.
2. Degree modifiers match all five entries; stock chassis degree identity never applies a second modifier package accidentally.
3. Several same-type appendages have distinct `instanceId` and physical `locationId`; both may appear in anatomy; neither grants extra actions/attacks.
4. Tool vs claw vs hand physical permissions; uncertain capability refuses inferred wield permission; DC 15 task checks apply at correct time.
5. Medium claw unarmed 1d4, hand 1d3, tool 1d3; size progression exact; no hand grants an extra attack.
6. Mounted blaster is one canonical equipment Item and has its own V2 weapon upgrade pool; mount does not create another weapon nor extra upgrade slots on chassis.
7. Model with enumerated baseline appendages and two explicit spare positions does not cause *all* models to get two spares.
8. Locomotion prices square speed, apply size cost factor only on designated terms, charge correct additional-system surcharge; multiple speeds remain distinct.
9. Basic and heuristic processor produce different skill/proficiency permissions; a remote receiver is not simultaneously assumed heuristic; remote Dexterity -2 works; backup behavior respects link loss.
10. Ion attacks remain effective; stunning immunity does not block ion; living-only and other listed immunities apply; repair/disabled/destroyed workflow correct.
11. Component installation produces correct Core DC/time and self-work restrictions; S&V Item modification does **not** use Core droid-system installation DCs.
12. Printed stock statblock holds its authored final totals with no factory bonus duplication; removing a factory system invalidates applicable effects without charging full factory construction price.
13. Storage bounds (Small 5 kg, etc.) and mass/encumbrance are checked independently of mount count and Item upgrade points.
14. All actor state writes occur through existing authorized transaction and mutation authorities, with coherent rollback of component and associated Item identity.

## 12. Open questions / next source pass

- **COMP-01:** Verify every distinct published mechanical limit on physical equipment and installation in Core/SGD/KotOR, plus other books (no general slot limit was found in the cited default rules). Inventory model-specific spare mount counts as published facts, not global capacity.
- **COMP-02:** Confirm how each of the eight SGD stock chassis applies *size-based ability* modifiers alongside its explicit chassis ability package. The chassis descriptions include small size defense/Stealth/carrying but don't restate generic size ability modifiers. No double application without definitive source attestation.
- **COMP-03:** Decide how printed stock *final* combat totals react when factory systems are removed, while retaining stock-statblock authority. Need a demonstrated recalculation/override contract; don't casually preserve old totals and leave removed system benefits active.
- **COMP-04:** Systematically verify all chassis-integrated weapons, appendage weapons, natural attacks, detachable mounts, tool options, and physical action restrictions across the three books.
- **COMP-05:** Establish which *droid* system installations can legitimately use the V2 Modification Executor and which require a separately certified droid install adapter/procedure. V2 Item upgrade slot rules must not leak into droid chassis.
- **COMP-06:** Source-review the Core and SGD cost tables, including alternate pricing policy, exceptional equipment, size-specific caps, and special hardware; enumerate exact `priceExpression` types with printed-page provenance.
- **COMP-07:** Published model baseline identities and every named system/part need independent source-vs-schema mapping; unresolved names and nonstatistical descriptions must fail closed, not silently be inferred.
- **COMP-08:** Audit other supplements and official errata before calling the global rule census complete. Apply DROID-RULE-001 to verified Core-vs-SGD conflicts; do not infer global publication priority for KotOR or other supplements. KotOR supplements early-era models and item upgrades but is not, by itself, evidence for an overarching droid chassis slot pool.

- **COMP-09:** Revisit the Core p.189 prose vs Core p.194 Table 11-5 pricing conflict for climbing claws and jump servos (and determine magnetic-feet basis). Check for directly controlling SGD text first under DROID-RULE-001; if SGD does not address the exact discrepancy, retain both Core readings and require explicit errata or owner adjudication before executable pricing.

**Decision record:** DROID-RULE-001 is **OWNER_APPROVED**; it governs interpretation but does not automatically certify the mechanical implementation of any individual rule.

**Certification legend:** `SOURCE_VERIFIED` = directly read from printed rule/PDF; `TEXT_REVIEWED` = searchable extracted text inspected, PDF recheck outstanding; `DESIGN_PROPOSED` = engineering proposal not printed; `BLOCKED` = rule or consumer issue unresolved. No claims about successful live Foundry v13 execution.


## 13. Rolling publication-census addendum - Core and Scavenger (2026-10-29)

**Census evidence:** `droid_census/droid-publication-census.json` and its human-readable `.md` projection, both retained only in the conversation workspace. 13 Core publication listings (11 sample model statblocks, two named-character statblocks), 46 Scavenger Codex publication listings (including one vehicle-format statblock), for **59 source-specific publication identities**. Duplicate protocol presentations are linked under the same listing rather than counted twice. This enumeration is not full mechanical-field certification.

### SCHEMA-DP2: Vehicle-format droid reuse case

**Primary source:** *Scavenger's Guide to Droids*, printed p.82, DP-2 Probe Droid. The full statblock labels the DP-2 a `Large starfighter/ground vehicle (speeder)`, with DR, starship-scale and character-scale movement, crew, cargo, payload and mounted weapon data. A second, protocol-format presentation labels it a `Large droid (2nd-degree)`. These are two **presentations of one publication listing**.

**Repository inspection:** `scripts/actors/v2/vehicle-actor.js` and `scripts/actors/v2/vehicle-derived-builder.js` provide the V2 vehicle-derived pipeline. The existence and certification status of a **specific DP-2 entry** in the current production vehicle catalog were **not verified** on the examined default branch. Therefore this note establishes an architectural reuse target, not a claim that DP-2 integration is already finished.

**Proposed additions/changes to the model publication schema (not replicated runtime totals):**

```js
publicationListing = {
  listingId: 'SGD-DROID-008',
  source: { bookId: 'SGD', printedPageStart: 82 },
  publishedStatblockFormat: 'vehicle-scale-droid',
  presentations: [
    { kind: 'full-vehicle-statblock', printedPage: 82 },
    { kind: 'droid-protocol', printedPage: 82 }
  ],
  kind: 'droid',                     // species/construct rule applicability
  degree: 2,
  primaryActorAuthority: 'vehicle', // architecture target, not a certified importer assignment
  canonicalVehicleModelRef: null,  // populate only on exact record reconciliation
  mechanicalCertification: 'NOT_CERTIFIED'
};
```

**Rules invariants:**

- A droid with a vehicle-format statblock must not be automatically rebuilt through the ordinary character-derived droid pipeline.
- V2 vehicle actor/derived-stat authority owns speed scale, crew, cargo/payload, defenses and mounted vehicle weapons. Existing modification/vehicle systems remain owners of those domains.
- Droid-specific traits (immunities, ion vulnerability, degree identity and any published control/processor rules) must be composed through a typed trait adapter or explicit compatible vehicle rule application. Do not apply all droid rules to all vehicles.
- Do not create a second DP-2 "droid" Actor solely to obtain droid trait effects, or double-count its published vehicle weapons as integrated personal weapons.
- Confirm vehicle `Crew 0 (normal)` handling, controlled autonomy, attack routing and all statblock/protocol differences before mechanical certification.
- An exact model entry might already exist on another branch or under an alternate canonical identity; search/fetch the relevant source and tests before concluding it is absent.

### Additional schema needs from the census

- `publicationListingId` and `modelFamilyId` must remain distinct; named-character variants link to family records without collapsing published identities.
- `presentations[]` preserves full versus protocol views independently of numeric totals.
- `publishedSystemEnumeration[]` must be kept distinct from possessions; retain raw text where a component cannot be confidently normalized.
- Cross-publication canonical model mappings require confirmed identities, not title similarity alone.

**Census/implementation state:** Core and Scavenger identity lists are indexed; all 15 remaining ledger slots are either unsurveyed or unidentified. No production data was modified and no GitHub write was performed.


## 14. Rolling publication-census addendum - Knights of the Old Republic (2026-10-29)

**Data:** `droid_census/droid-publication-census.json` and `.md`; **no repository write**. The KotOR source review identified **24 printed statblock identities** (16 in Chapter V pp.81-89; two Sith assault models p.165; Basilisk p.203; three named characters pp.212/213/216; Krath and Rakatan models pp.222-223). Cumulative count **83 from three books**. This is an *identity enumeration*, not field-level mechanical certification.

### Schema delta KOTOR-01: publication role and creation eligibility

A droid model must not be assumed playable because it is a droid. KotOR explicitly says several model lines cannot be played as droid heroes, while its *Independent HK-Series Droid* is a distinct, GM-approved playable-hero starting statblock (printed p.85). Define independent enumerations for `sourceListingRole` (`stock-model`, `heroic-template`, `named-character`) and `creationEligibility` (`printed-allowed`, `printed-prohibited`, `conditional-gm`, `not-established`), preserving the precise printed scope. The published stats of an HK-24 or HK-50 are not silently replaced by the independently designed HK-series hero template.

### Schema delta KOTOR-02: relationships and identity

`publicationListingId` is unique per statblock per book; `modelFamilyId` is a **verified family association**, not an instruction to inherit stats. `relatedListings[]` records typed, evidence-backed links such as `stock-model-of`, `same-series`, `named-variant-of`, and `hero-template-for`; family links never cause one published statblock to be discarded. For this batch, GO-TO and T3-M4 identify individually evolved versions of GO-TO and T3 model families, while HK-47 has its own printed stats. Mark I and Mark IV assault droids are separate models, not a generic assault droid record with unverified computed adjustments.

### Schema delta KOTOR-03: vehicle-format autonomous droid (Basilisk)

*KotOR*, printed p.203, labels the Basilisk `Huge air vehicle (droid)` and explicitly provides a droid brain, skilled crew designation, an authorized passenger, vehicle-scale fighting space, personal-scale and starship-scale speeds, payloads, cargo, a rider override to use passenger attack or skill bonuses, melee claws, and multiple weapon stations. Use existing V2 **vehicle** stat/combat/payload/station/movement authorities, with a droid rule-classification adapter and an explicit passenger-command option. `actorAuthority: vehicle` **does not imply** normal organic crew is required; `droidBrain` and `authorizedPassenger` are separate concepts. Do not give Basilisk a guessed droid degree; the vehicle statblock does not specify one. Production mapping and live coverage remain unverified.

### Schema delta KOTOR-04: components and combat

- KotOR p.86 Juggernaut War Droid's printed movement explicitly combines fly, walk and swim; locomotion schema must not be a single flat speed without modes.
- KotOR p.87 Municipal Patrol Droid Mark I enumerates **two tool mounts** and **two blaster pistols**; a mount is not an implicit separate weapon type or a physical hand.
- KotOR p.223 Rakatan Guardian Droid lists blaster rifle, flamethrower and carbonite projector as **integrated weaponry** under `Possessions` and different movement/system entries. Preserve integration metadata and individual weapon identities without treating all possession text as structural systems.
- Basic/heuristic processor, improved sensors, shield rating, dedicated weapon attacks and feat/talent/Logic Upgrade attributes are printed as separate concepts; retain distinct typed references, and call existing rules consumers rather than recomputing.

### Schema delta KOTOR-05: commerce and provenance

`price` must be a tagged union: `{kind:'fixed',credits:n}`, `{kind:'not-for-sale',estimatedValueCredits:n|null}`, or `{kind:'unestablished'}`; do not turn `estimated value` into a store purchase price. `availability` should be recorded separately (e.g., Military, Restricted, Illegal/Rare, Licensed). `sourcePrintedPage`, `pdfPage`, `txtLineAnchor`, `sourceHeadingRaw`, and `sourceNameCanonical` are required publication provenance fields. Image-only PDF has priority over noisy text where OCR changes names (`Mark |` vs `Mark I`, `Uedi` vs `Jedi`).

**Acceptance gates before implementation:** exact canonical source identities and explicit scope; model/variant preservation; no implicit multi-attack from multiple mounts; one weapon runtime per installed weapon; no separate vehicle engine for autonomous vehicle-form droids; no not-for-sale purchase price inferred from estimate; no invented degree; source/field/mechanical/runtime certifications independent.


## 15. Rolling publication-census addendum - Clone Wars Campaign Guide (2026-10-29)

**Evidence and boundaries:** 40 source-specific statblock listings under the approved inclusive policy: 13 civilian droid models (*Clone Wars*, pp.66-73); one B1-Series squad statblock (p.95); three Republic models (pp.160-162); sixteen Confederacy droid characters (pp.188-198); six autonomous droid/brain-controlled vehicles (pp.198-202); and one autonomous droid starfighter, the Hyena bomber (p.208). There are 39 source-explicit droid identities (including the Hyena identified through its prose and the B1 squad) plus the generically named GAT, included on its explicit `Crew droid brain (expert)` and automated-control evidence. **Cumulative census: 123 / 4 books**. Listings and TXT line anchors: `droid_census/droid-publication-census.json`. No model mechanics have been certified by the enumeration.

### SCHEMA-CW-01: publication form differs from actor model and rules identity

Introduce discriminated `publicationPresentationKind` separate from `modelIdentityKind` and `rulesClassification`:

- `individual-droid-statblock` (32): ordinary droid model and statblock; uses existing character/droid actor, equipment and derived-data authorities.
- `droid-squad-statblock` (1): a derived *aggregate* of multiple B1 droids; never a new Large chassis for pricing or install-location purposes.
- `droid-vehicle-statblock` (6): a named droid vehicle or explicitly fully droid-brain-controlled vehicle; reuse V2 vehicle actor movement, hull, combat, payload, crew and weapons.
- `droid-starship-statblock` (1): droid starfighter identity, `Crew 0 (expert)` where published, and crew-independent attacks; reuse existing V2 starship-scale vehicle consumers.

Preserve `classificationEvidence` in the publication census. A vehicle's `Crew 0`, alone, is not proof of droid identity; Hyena qualifies **because its text explicitly calls it a droid starfighter**. GAT qualifies because an integrated droid brain is its crew. A transport carrying many battle droids does **not** become a droid merely because it has droids aboard.

### SCHEMA-CW-02: squad mechanics are derived profiles, not factory models

*Clone Wars*, p.95, publishes the B1-Series Battle Droid Squad with squad traits; its construction text precedes the statblock. Store

```js
sourcePresentation = {
  kind: 'droid-squad-statblock',
  squadBaseListingId: 'CORE-DROID-004',
  publishedIdentityId: 'CLONE-DROID-014',
  publishedSize: 'Large',
  underlyingMemberChassisSize: 'Medium',
  memberCount: null, // do not guess a numeric count from 'squad'
  actorAuthority: 'npc-or-unit-aggregate' // proposed adaptation; NOT a new physical droid class
};
```

Do not multiply the droid chassis *cost factor* by the squad's Large size. Do not materialize three separate sets of appendages, locomotion, weapons or processor slots merely from the aggregated statblock. Individual B1 actors remain possible independent entities. Reuse existing area-attack and squad/pack consumers where verified; no separate combat-roll authority.

### SCHEMA-CW-03: controller/crew authority is a typed union

The GAT (*Clone Wars*, p.198) and Hailfire/Manta/OG-9/Persuader/Tri-Droid (pp.199-202) use droid brains; the Hyena bomber (p.208) instead prints `Crew 0 (expert)` and its text grants weapon operation by computer. Preserve the **printed crew value** independently of the in-world controller description:

```js
vehicleAutomation = {
  publishedCrewRaw: 'Crew 0 (expert)',
  droidModelIdentity: true,
  controlMode: 'autonomous', // verified by droid-starfighter prose, not inferred from numeric 0 alone
  controllerKind: 'integrated-automation',
  droidBrainReference: null,  // only if book explicitly identifies a droid brain
  gunnerPolicy: 'printed-independent-weapons', // per specific Hyena text, no generalization
  characterActorShadow: false
};
```

Do not model a `droidBrain` as an ordinary human crew member or invent a second character Actor. A separate crew/brain proficiency grade (`normal`, `skilled`, `expert`) is not necessarily a class level or challenge level. Existing vehicle combat/routing remains the engine. For the OG-9 (p.201), a critical hit that reaches its threshold immobilizes its legs **without removing its ability to fire**; model vehicle component impairment separately from total vehicle shutdown.

### SCHEMA-CW-04: printed class is not synonymous with rule identity

The IG-110 (*Clone Wars*, pp.193-194) has **Soldier 1/Jedi 5** class levels, yet the text explicitly states that its Jedi levels simulate combat programming and **it is not a Jedi**. Preserve the published class progression in `statblockClassLevels`; preserve `speciesRules=droid`, `isActualJedi=false`, and `forceSensitivity` only as verified, independently established source facts. Do not hard-code `Jedi level > 0 => Force sensitivity` for imported droid statblocks; the other class and Force restrictions still require explicit rules review.

### SCHEMA-CW-05: source-specific capabilities and constraints

- CLL-6 Binary Load Lifter (p.72): external tray-style tools do not imply hand manipulators; `appendageKind=tool` and `canManipulate`/`canHold`/`canWield` need published distinctions rather than all becoming true. Its language capabilities distinguish *understanding* Basic from *speaking* Binary.
- Marksman-H Combat Remote (p.162): Diminutive droid with limited hover speed and stabilized weapon mount. Integrated attack legality and mount physical capacity must be preserved without replacing the weapon's own authority.
- Cold Assault Battle Droid (p.191): source-specific run maximum **three times speed**, rather than the ordinary four; generic locomotion speed alone cannot represent this.
- Octuptarra Combat Tri-Droid (p.196) and larger vehicle `Tri-Droid` (p.202) are **distinct publications and statblock formats**. No name-derived conversion.
- Ultra Droideka (pp.197-198): walking plus wheeled *exclusive* locomotion; preserve switching behavior and don't combine different movement-mode speeds by addition.
- IG lancer weapons/mounts, C-B3's cortosis-durasteel protection versus lightsabers, and modified droid assault configurations each need source-verified component/equipment rules. Never treat a model statblock alone as permission to implement a generic new upgrade.

### SCHEMA-CW-06: follower-specific creation policy and droid networked mind

*Clone Wars*, p.33, `DROID FOLLOWERS` specifies a **separate** starting profile for follower creation: +2 to one ability other than Constitution, Medium by default (GM can allow otherwise), walking or tracked speed 6, fourth degree by default (GM may override), heuristic processor, 2 arm appendages, one locomotion system, and starting credits restricted to nondroid equipment or listed accessory groups. These rules must be represented as a `creationContext=follower` profile/eligibility policy, **not a fourth general player-character creation route or a factory-model chassis override**. No duplicated Droid Builder UI.

The *Droid Commander* prestige class (pp.42-43) provides `Networked Mind` with explicit droid allies, encounter-limited designation and active-comlink requirements; its class abilities may allow beneficial mind-affecting effects to reach networked droid allies and, for a specific talent, treat an ally as if it has a heuristic processor when beneficial. **This is a scoped feature exception**, not a removal of the universal droid immunity or a permanent processor installation. Model rule-exception authority by actor/effect/source/target/duration, not by mutating the droid's immutable identity.

A narrative example of the `Cyborg Hybrid` quality (Durge) explicitly permits droid systems except a processor (*Clone Wars*, Chapter XI, surrounding TXT line 17895). This is a specific host-eligibility exception for a **non-droid** being, not proof that all cyborgs use droid immunity/degree/processor rules. The common equipment/modification host evaluator must support evidence-backed **non-droid hosts** without promoting them to full droids.

### Acceptance tests after schema approval

1. B1 squad statblock remains Large as printed but underlying B1 model isn't repriced or re-sized as Large.
2. `Crew 0` alone never proves droid classification; Hyena narrative does, and GAT droid-brain crew does.
3. Vehicle-format droids contribute **no** duplicate character-derived vehicle attack or bonus applications.
4. IG-110 prints Jedi 5 without becoming a Force-sensitive player-Jedi by inference.
5. A source-specific three-times-speed run override applies only to Cold Assault Battle Droid and qualifying published variants, never universally.
6. Marksman-H's weapon mount has a unique part identity and source-verified limits; no extra action from extra appendages.
7. Droid Commander beneficial-mind-affecting exception is scoped to eligible network members and does not eliminate other immunity behavior.
8. Follower starter equipment and +2 option are not silently imposed on a standard droid hero or a published factory model.
9. OG-9 leg impairment stops movement but allows weapon attacks, using existing vehicle damage and action authorities.
10. No vehicle-format droid or droid squad is duplicated as a second actor merely to satisfy its droid trait/classification.

**Statuses:** Identity census `INITIAL_CENSUS_COMPLETE`, rules notes `TEXT_REVIEWED`/selected PDF pages visually checked, schema additions `DESIGN_PROPOSED`, all individual mechanical record certifications `NOT_CERTIFIED`, runtime and production mapping `UNVERIFIED`. Owner's DROID-RULE-001 still controls genuine Scavenger-vs-Core conflicts; nothing in Clone Wars silently supersedes it.


## 16. Rolling publication-census addendum - The Force Unleashed Campaign Guide (2026-10-29)

**Source scope:** Force Unleashed Chapter VI (pp.102-107) and Chapter X droids (pp.194-198); also reviewed Independent Droid prestige class (pp.46-48), the printed degree-specific droid talent trees (pp.102-103), and the Human cyborg Phase Zero Dark Trooper entry in the Empire chapter. **11** eligible published droid statblocks, all droid-character format; 1 named (PROXY), 3 Junk Droid variant blocks. All statblock headings/printed page labels located in source TXT and visually verified in the image-only PDF; exact listing records in `droid_census/droid-publication-census.json`. 134 cumulative publication listings / 5 books.

### SCHEMA-FORCE-01: no unprinted degree and no class-from-section inference

Junk Droid (p.106), Brute Junk Droid (p.107), and Behemoth Junk Droid (p.107) print **no numeric degree** in their individual size/type/class lines, even though all fall under the source's **Fourth-Degree Droids** section. Record `publishedIdentity.degree = null`, `headingContext.degreeSection = 4`, `degreeEvidence = NOT_PRINTED_IN_STATBLOCK`, and preserve the grouping evidence. The heading alone does **not** authorize adding fourth-degree construction ability bonuses or satisfying degree-gated prestige/talent prerequisites; this requires a published applicability rule or an explicit adjudication. `UNKNOWN` must not become `4` in import or normalization. Junk variants have distinct sizes, stats, and hero eligibility; one generic factory chassis cannot generate their published totals by resizing alone.

### SCHEMA-FORCE-02: independent-droid prestige class and selectable immunity exceptions

*Force Unleashed*, pp.46-48, introduces **Independent Droid** prestige class: printed requirements include droid-only, trained Use Computer, heuristic processor, and minimum level 3. **Sapience** allows the droid to choose not to have its immunity apply to mind-affecting effects to receive beneficial mind-affecting abilities, grants immunity to restraining bolts, and permanently disables its behavioral inhibitor. This is a **source-scoped class feature** interacting with universal droid traits, **not** a generic `droidImmuneMindAffecting = false` overwrite.

Proposed state: `featureGrantedRuleExceptions[] = { sourceFeatureId, targetRuleId, qualifiedScope, choiceState, timingPolicy, source, certification }`. Keep `timingPolicy=UNRESOLVED` until publication wording/official ruling establishes precisely when the immunity choice is made and whether it may be changed per effect. Do not accidentally allow a beneficial effect through by disabling all immunity checks without user choice.

Class-level progression for named PROXY on p.197 is `soldier 1/Jedi 9/independent droid 3`, printed `Force 2`, `sapience`, and equipment. Reuse Character/Progression and Force Point resource consumers **without assuming Force Sensitivity, Force Power access, or actual Jedi identity** from a printed Jedi class level; Force Points and Force sensitivity are separate properties. The Independent Droid class is not itself a statblock listing. The printed 'Modification Specialist' talent removes the usual self-modification check penalty; implement as a sourced modifier to the shared Mechanics/Use Computer check, not a new modification execution engine.

### SCHEMA-FORCE-03: degree-specific talent permissions

*Force Unleashed*, pp.102-103, publishes droid talent trees restricted **by droid degree**, in addition to class-level talent availability. Store `talentEligibility = { requiredDroidDegree, printedTreeId, source }` as source data consumed by the existing Talent prerequisite resolver. The same source can establish restrictions for a factory character and an imported statblock; do not infer degree from a book chapter when the statblock leaves it unprinted (SCHEMA-FORCE-01). These are tree-rule records, not additional factory droid models.

### SCHEMA-FORCE-04: physical locations / enumerated arms / zero reach

- FX-6 (p.103): enumerates **six hands**, not a single abstract hand component. Six identical canonical part definitions can correspond to six distinct physical instances; do not collapse them into one part ID. No extra attack or additional action solely from arm count.
- IT-O (p.195): **five tool appendages and one claw appendage**; counts and capabilities must be distinct. An attached electroshock probe is published in *Possessions*; do not convert every possession into an installed system.
- MSE-6 (p.198): **Tiny**, 2 folding claw appendages, **Reach 0** in its printed melee statblock. Preserve fighting-space/reach as published independent properties; appendage presence does not universally grant Reach 1.
- Q7 (p.104): small hovering astromech originally configured for the Alpha-3 V-wing socket, but narrative only provides configuration history, not general docking slot counts or game-scale upgrade capacity. Do not infer compatible weapon mounts.

### SCHEMA-FORCE-05: integrated weapon authority and explicit self-destruct action

R-1 Recon Droid (p.197) prose identifies its **integral blaster**, while the statblock lists the blaster under `Possessions` and its `Systems` line does not name the blaster. Preserve `sourceDeclaredSystems`, `sourceDeclaredPossessions` and `narrativeIntegrationClaims` *as independent source evidence*. A reconciliation review may link the blaster Item to an integrated/structural mount but must not derive a second copy or silently remove the printed possession. Its self-destruct action is separately printed and must use the existing combat/area-effect/consumable-state authorities. R-1's description says it has no hands/tools; never allocate a manipulator merely because it carries an integrated weapon.

### SCHEMA-FORCE-06: sale versus estimated model value

- BD-3000 (p.105): source explicitly gives **25,000 new** and **8,000 used**, not a single canonical currency value.
- Junk Droid / Brute / Behemoth (pp.106-107): **not available for sale** with estimated values **2,610 / 3,200 / 5,000** respectively. A value estimate is *not* a store purchase price or availability grant.
- PROXY (p.197): no source market price printed; `publishedPrice.kind='not-stated'`, not zero.

Use a tagged price union `publishedPrice = { kind: 'priced'|'priced-variants'|'not-for-sale-estimate'|'not-stated', source, ...sourceValues }`. Actual Store transaction price follows the existing certified economy authority and seller context, not a read-only printed estimate. Do not invent a cost multiplier to recover unavailable factory builds.

### SCHEMA-FORCE-07: qualified heroic eligibility, model-specific behaviors, cyborg host identity

- IT-O (p.195) explicitly may become a droid hero **if reprogrammed**. `heroEligibility.status='CONDITIONAL'` and `heroEligibility.requirements[]` must preserve the prerequisite rather than a bare `true`.
- MSE-6 (p.198) has a printed behavior: if moved down the condition track by an ability that targeted its **Will Defense**, it flees for `1d6` minutes. This is a **model-specific trigger**, scoped to an effect that can legally affect it despite other droid immunities, not a general fear susceptibility. Needs explicit condition/event/targeted-defense evidence in shared effects consumers.
- Phase Zero Dark Trooper (pp.175-176) is printed as **Medium Human (cyborg)**, *not a droid*. Its Cyborg Hybrid ability permits most droid systems **except processors**, grants special protections and normal ion damage. It is **excluded from the droid statblock count** but should be included as a special host-class eligibility fixture in Equipment/Droid System installation tests. Never assign universal droid immunity, degree or inability to use the Force solely on droid-component host capability.

### Verification tests after source-mechanical certification

1. Junk Droid variant statblocks retain `degree=null`; their source degree section may be displayed but cannot be applied as a construction bonus.
2. Published FX-6 has six distinct hand instances without six attacks or six action grants; IT-O preserves five tool and one claw instances.
3. Q7's hovering and work-socket narrative never creates a generic starfighter weapon interface.
4. R-1's blaster appears once in effective inventory/combat; printed possession and narrative integration evidence are both retained; it has no inferred hand.
5. MSE-6 has Reach 0 even with two folding claws, and its fear behavior requires the published Will-targeted condition event.
6. PROXY retains Force Points and its 1/9/3 class progression without inferring Force Sensitivity or an ordinary Jedi exception.
7. Independent Droid's Sapience choice is scoped to its printed feature; unselected recipients continue to use the normal droid immunity.
8. Market catalog refuses to treat junk droid estimated value as an available-for-sale price or PROXY's unknown price as zero.
9. IT-O's heroic creation path requires its published reprogramming prerequisite.
10. Phase Zero Human cyborg is eligible only for source-permitted droid systems, not processors, and never gets droid-wide species/degree traits.

**Statuses:** FORCE identity census `INITIAL_CENSUS_COMPLETE`, all 11 printed page identities and headings PDF-verified; rules conclusions `SOURCE_TEXT_REVIEWED` with explicit printed page evidence; schema addenda `PROPOSED`, all 11 individual numeric/mechanical certifications `NOT_CERTIFIED`, production item/vehicle mapping and live Foundry tests `UNVERIFIED`. The owner-approved DROID-RULE-001 remains in force for genuine Scavenger-over-Core conflicts, not blanket supplement supersession.


---

## Galaxy at War source census — Schema Addendum v0.7 (2026-10-29)

**Identity survey status:** 22 primary publication-statblock identities / 22 source pages attested to PDF, with 6 linked repeat full-statblock appearances, from *Galaxy at War* (GAW). **Mechanic certification status:** no GAW model has received a complete field-by-field mechanical certification. Source values and exceptions below inform the required schema, but do not authorize executable mechanics until the relevant rule is verified. The rolling JSON and MD census files are local workspace artifacts; no repository changes.

**Book count:** Core 13; SGD 46; KotOR 24; Clone Wars 40; Force Unleashed 11; GAW 22 = **156 publication listings**, 6/17 ledger slots surveyed. GAW adds 20 droid actor/device models, one squad, and one droid-brain combat vehicle. The GAW GAT counts despite also appearing in Clone Wars, because this is a **publication listing** census, not a unique chassis registry. The animated descent of a Drop Pod uses a droid brain but is not identified as an independent droid model and is *not* counted; see SCHEMA-GAW-06.

### SCHEMA-GAW-01 — Statblock occurrences, scene bonuses, and identity

The **Automated Sentry Gun** has a baseline full statblock at GAW printed p.98, and another complete statblock at p.175. The latter is an encounter deployment, not an independently named factory model. The latter's Reflex Defense is **20** versus **15** in the original p.98 block; the p.175 encounter text explicitly states that the sentries' position behind rock gives **+5 cover bonus to Reflex Defense**. However, the p.175 *Grapple -1* differs from p.98 *Grapple -5*, and its Languages line specifies only Binary versus p.98 Basic and Binary. These are verified layout-level differences, not automatically corrections. No inferred canonical override is justified.

**Schema requirement:** a model/source record can have a separately identifiable **printed occurrence** with scoped overrides and **provenance**. Example shape (proposed, not frozen):

```json
{
  "modelListingId": "GAW-DROID-012",
  "occurrences": [
    {"occurrenceId": "GAW-SENTRY-P98", "printedPage": 98, "presentation": "baseline"},
    {"occurrenceId": "GAW-SENTRY-P175", "printedPage": 175,
      "presentation": "encounter-deployment",
      "contextualRules": [{"type": "cover", "reflexBonus": 5, "source": "GAW p.175, Sentry Guns encounter"}],
      "unreconciledDifferences": ["printed grapple -1 vs -5", "printed languages Binary vs Basic/Binary"]}
  ]
}
```

**Do not** store every encounter's +5 cover as a permanent upgrade to the manufacturing baseline. Repeated B1, B2, Tactical Droid, Droideka, and B1 Squad statblocks also have separate occurrence pointers; their second appearances do not create a new chassis. An actually different named model (for example Air Assault Super Battle Droid versus standard B2) *does* get a separate canonical publication identity.

### SCHEMA-GAW-02 — Stationary, self-operating droid weapons

GAW p.98 **Automated Sentry Gun** is expressly a **Small fourth-degree droid** with *Speed 0*, *Reach 0*, a **basic processor**, and **weapon housing** that treats its light repeating blaster as **braced**. It has a limited field of fire and friend-or-foe behavior described in prose; the statblock carries a heavy power pack with **150 shots**.

- Droid identity **must not require a locomotion component** or positive Speed. A stationary droid can still possess initiative, weapons, defenses, skills and special actions.
- `weaponMount` / `weaponHousing` and `weaponItem` must remain distinguishable, with derived braced readiness delegated to the existing weapon attack authority. Do not infer a hand, appendage, or ordinary carried weapon merely because it fires.
- Keep `ammoCapacity`, `ammoRemaining`, `powerSource`, and `fieldOfFire` concepts separately. A contextual IFF behavior belongs to a proven targeting/identification consumer, not a free universal droid immunity or target-filter flag.
- The Sentry Gun's encounter variants must use SCHEMA-GAW-01 and remain **one source-model listing**.

### SCHEMA-GAW-03 — Multiplied appendages, special reach and locomotion

GAW pp.51-52: **A-Series Medical Droid** lists `2 hand appendages` plus `3 tool appendages`; **KDY-4 Tech Droid** lists `2 hand` plus `2 telescopic tool appendages`, `walking locomotion (extra leg)`, **Reach 2 squares**, and a **+5 stability bonus** against being knocked prone. A separate extra-leg locomotion construction detail is *not* an extra manipulator. CLL-M2 and MR-200 models (pp.56-57) have specialized carrying/roller hardware.

- `installedComponents[]` requires unique instance id, canonical part id, category, source-provided count/placement identity, mount id if known, and function.
- Appendage capability is a *typed proven property*, never guessed from `Systems` strings (for example `telescopic`, `tool`, `hand`, `claw`, `weaponHousing`, `loadLifter`).
- `reach` and `fightingSpace` must preserve published total/statblock authority. An appendage's telescoping status may affect reach only where a certified consumer/printed rule establishes it; a listed telescopic tool does not grant all attacks Reach 2 by default.
- `locomotion[]` supports extra legs, walking, tracks, wheeled exclusive, hover, jet pack flight, and zero locomotion as **distinct** operations. Applicable speed and exclusivity are printed/model-specific, not an invented generic `slot` limit.
- Stability, carrying load, light/missile handling and offensive rollers are separate effects; an appendage quantity never grants an additional action.

### SCHEMA-GAW-04 — Processor, control dependencies and activation

GAW p.53: **Eradicator-Series Battle Droid** lists a `basic processor` but narrative says it will enter a shutdown state if its *central operating computer* is destroyed or compromised. GAW p.219: **LR-57 Combat Droid** has a `basic processor` and a `remote receiver` and describes a passive standby mode followed by alerting its remote processor. GAW p.55 **Tactical Droid** has a heuristic processor and command-support behavior.

**Do not equate** a basic local processor to full autonomy and **do not equate** remote receiver presence to a required remote brain. Preserve independent, source-scoped relationships:

```text
processor: installed local processor (definition + physical instance)
remoteReceiver: component instance and communications route
externalController: optional trusted actor/processor/system identity
controlDependency: optional condition/dependency with source identity
activationState: active | standby | disabled | shutdown (distinct from installed)
commandAuthority: source-scoped control/coordination ability, not universal degree rule
```

A destroyed controller can change a model's operational state only if that specific dependency has been source-certified. `activationState` is not an upgrade/mount slot and should reuse existing condition/actor state consumers where appropriate.

### SCHEMA-GAW-05 — Power, self-destruct and exceptional resistance

GAW p.53 **B2-AA Air Assault Super Battle Droid** has a volatile integrated jet pack, a different charge supply from ordinary jet packs, and a self-destruct system. GAW pp.55-57 **Vigilant 2X** and **MR-200** likewise name self-destruct capabilities, while the MR-200's forward chain roller is an attack delivery, not an ordinary manipulator. GAW p.54 **Purge Trooper** has cortosis-fiber armor and source-scoped DR and movement-resistance behavior.

- A `powerSource` component instance, its current charges, and its supplied devices must be distinguishable. No charge counts or trigger mechanics should be inferred from generic equipment templates when the printed model gives an exception.
- A self-destruct device is a real installed system with its own activation trigger, action cost, area shape, damage, payload consumption and effects, verified per model/definition. Reuse the existing Combat and damage-packet authorities rather than authoring a droid-specific area damage calculator.
- Armor equipment, armor plating, DR, shield rating, and lightsaber-specific interactions are separate mechanical concepts; reuse existing armor/DR consumers. The Purge Trooper's cortosis exception is **not a universal droid trait**.

### SCHEMA-GAW-06 — Droid brain as a vehicle operator, not always a droid model

- GAW p.216 **Ground Armored Tank** (GAT) uses a **Huge ground vehicle** statblock and `Crew droid brain (expert)`. Its autopilot/brain independently operates a mobile war vehicle. Its model is represented by a vehicle actor/statblock consumer with droid brain authority; GAW owns a distinct publication listing while the related Clone Wars listing remains separate.
- GAW p.62 **Drop Pod** is a **Gargantuan air vehicle** with `Crew 0 (droid brain)` and an automated descent. **Not counted as a droid model** because the brain controls descent rather than the book presenting the pod as a droid character or autonomous war droid; preserve as an explicit vehicle-controller *boundary case* so future book censuses use a consistent inclusion test.
- GAW p.178 **T8 Loading Vehicle**, `Crew 1 (normal)`, is not a droid or automated droid-brain vehicle.

**Schema:** actor classification `vehicle` / `droid` remains distinct from operator/controller class `droidBrain` / `organicCrew` / `none` and from narrative rule classification. Do not force a vehicle into a droid actor because it uses a processor, and do not give all droid-brain-operated vehicles droid feats, immunities, component slot capacity, or PC creation eligibility.

### SCHEMA-GAW-07 — Non-droid hosts for droid equipment

GAW p.50 `Cyborg Hybrid` is expressly a **cyborg**, not a droid species/statblock. It permits installation of any type of droid system **except a processor**, and includes special life-support protection against atmospheric and inhaled poison hazards. A holder of this feature must remain a non-droid host, even while droid systems are installed.

Expose component install rules as host-capability/eligibility predicates shared with Equipment, not simply `actor.type === 'droid'`. Biological characters must not acquire absent-Constitution, droid degrees, droid blanket immunities, or droid-specific processor rights merely from mounting a permitted droid part. Source and effect consumers remain distinct.

### Verification fixtures for GAW before executable implementation

1. Sentry Gun p.98 is a Small droid, Speed 0 and Reach 0, with mounted braced repeating blaster and 150-shot heavy power pack; no inferred foot or hand, no infinite ammo.
2. Encounter Sentry Gun p.175 is linked to its p.98 baseline but keeps p.175 Reflex 20 with explicit +5 environmental cover; Grapple and languages remain disputed printed differences, not overwrites.
3. KDY-4 has exactly four manipulator appendages plus an extra locomotion leg, not five manipulators; Reach 2 and stability +5 are supported by source rather than general appendage-count math.
4. A-Series has two distinct hands and three distinct tools and only the published Treat Injury talent behavior; no extra turn/actions.
5. Eradicator's external controller loss may trigger shutdown only under its certified model-specific condition; other basic-processor droids never inherit the rule.
6. LR-57 standby state and remote-receiver relationship do not turn off its physical appendages or forget its installed equipment.
7. B2-AA jet-pack capacity, volatile fuel and self-destruct are scoped to its actual component/model definitions; generic jet packs do not inherit the B2-AA exception.
8. Purge Trooper cortosis and DR must resolve through existing armor/damage effects; no blanket droid DR or lightsaber immunity.
9. GAT keeps vehicle statblock, weapon stations, controller skill, and droid brain origin; no parallel droid combat engine.
10. Drop Pod stays a vehicle with a droid-brain navigation/crew relationship and is not counted as a droid source model; T8 stays an ordinary vehicle.
11. Cyborg Hybrid can install source-permitted nonprocessor droid systems without turning into a droid or gaining droid immunities.
12. B1 squad is one Large squad aggregate with three component members, not a Large individual B1 factory chassis; reprinted p.220 is the same source model.

**Source precedence:** DROID-RULE-001 remains unchanged: SGD overrides Core only for directly incompatible rules in the same scope. GAW model-specific rules are scoped additions unless an actual conflict is found. **Status:** all GAW identities are source/PDF reviewed; production schema frozen = false; per-field mechanical certification = false; live Foundry certification = false.


---

## Galaxy of Intrigue — census-driven schema addendum (v0.8; 8 publication listings)

**Evidence scope:** *Galaxy of Intrigue* (2010), Chapter III pp.72-75 and Chapter VII encounter p.208; `Galaxy of Intrigue_djvu.txt` TXT-first, source PDF pages 73-76 and 209 (1-based) for layout/printed-page checks. **Eight droid-character statblocks**, no printed droid vehicle or squad identified. Production-ready mechanical field certification has **not** been done; the items below are schema requirements or test cases, not permission to invent extra rules. The source-precedence ruling **DROID-RULE-001** remains unchanged.

### SCHEMA-GOI-01 — Source model baseline vs presented loadout

GOI p.73 describes the **3D-4 Administrative Droid** stock model as unarmed, but its presented statblock includes a *concealed hold-out blaster* and a +5 concealment bonus. GOI pp.72-73 describes the **NR-1100 Slicer Droid** as unarmed, yet its printed statblock gives a ranged blaster attack and a blaster-pistol-equivalent possession. These are **not equivalent cases**: the 3D-4 narrative expressly describes owners refitting them with hidden weapons; the NR-1100 prose and the listed weapon are in unresolved apparent tension.

- Preserve `publishedModelBaseline`, `publishedStatblockLoadout`, and `statblockScenario` as separately provenance-tagged concepts. Do not represent every NPC/example gun as a compulsory factory-integrated weapon.
- Keep narrative-vs-statblock source conflicts as inspectable `sourceDiscrepancies[]` with fields for source pages/text anchors, component identity, and unresolved status.
- No reclassification of an ordinary possessed weapon to `integrated` unless an explicit source statement authorizes it.

### SCHEMA-GOI-02 — Paired owner accessories and threat warning delivery

The **5-BT Threat Analysis Droid** (p.72) is supplied with a **bracelet** that warns its owner by vibration; the warning may alternatively be delivered to an earbud comlink. Its statblock lists an instrument and tool appendage plus sensors (surveillance detector, toxin detector, veridicator), and a blaster under possessions.

- Support an optional **external paired device/beneficiary relationship** (`droidActorId`, `targetActorId`/recipient role, `linkedEquipmentInstanceId`, `deliveryMode`, `sourceRef`), not an imaginary structural droid appendage slot for the owner bracelet.
- The bracelet's actual warnings and any automatic mechanics must have a certified interaction/effect consumer. Sensors are distinct installed vs carried items only as published.

### SCHEMA-GOI-03 — More locomotion limbs than manipulation appendages

**MRD-39B Assassin Droid** (p.208) has walking locomotion with **six legs** and a +5 stability bonus, but its Systems line independently lists **two claw appendages**. It also has climbing claws, vibrodagger claws, a secondary battery, and an integrated hold-out blaster. Do not count every leg as an arm, or every arm as a locomotion leg.

- Separate `locomotion[].limbCount` / `stabilityModifier` from `appendages[].instanceId` and `weaponMounts[]`. Preserve stable physical identities per published instance; do not infer six manipulators or six attacks.
- `secondaryBattery` must be a real component/power-source concept without fabricating a charge count absent source data.
- Its integrated hold-out blaster and vibrodagger-claw weapons reference existing equipment/attack authorities, with installed weapon instances distinct from claw appendages.

### SCHEMA-GOI-04 — Source-scoped attack templates, weapon equivalences and legality

- **BL-Series Battle Legionnaire** (p.75): finger blades *treated as vibrodagger*, assault blaster *treated as light repeating blaster*; printed braced autofire, silence-bubble generator, gyroscopic stability +5, quadanium plating. Store `publishedWeaponName`, `equivalentWeaponDefinitionId` (only after identity verification), and `sourceScopedEffects`, not automatic global aliases.
- **FIII Footman Droid** (p.74): possesses two miniaturized rail cannons treated as blaster cannons; includes Logic Upgrade: Defender, heuristic processor, durasteel plating. The two guns do not imply two attacks/actions without a published attack option.
- **B4J4 Security Droid** (p.75): two heavy blaster pistols and a snare pistol; its statblock prints singular attack alternatives. A concealed claw must not be silently counted as an extra hand.
- **M4-Series Messenger Droid** (p.74): availability is *Licensed (Restricted with weapon)* and the narrative states some municipalities require removal/deactivation of the blaster before sale. Record `availabilityConditions[]` / regulated loadout variants as source-scoped, not a global automatic availability override. The printed 88,000-credit price is source evidence, not an inferred component-cost sum.

### SCHEMA-GOI-05 — Self-destruct geometry, triggers and operation state

- **NR-1100** (pp.72-73): self-destruct attack with **4d6**, **2-square burst**, +5 area attack printed under Special Actions.
- **MRD-39B** (p.208): self-destruct System with **4d6** and **2-square splash**; encounter tactics call for initiation at **10 or fewer HP**.

Area shapes are not interchangeable. Store the source-defined `areaKind`, radius/size, damage expression and triggering condition with printed-page attribution. Implement through the existing area damage and condition consumers, not a new droid-area calculator. Whether the MRD rule is generic functionality or AI/tactics-only requires mechanics certification; never apply the HP threshold to all self-destruct devices.

### SCHEMA-GOI-06 — Model names and independent character identity

**FIII Footman Droid** has a single published model statblock. The narrative names two units, *Fidelis* and *Solis*, without separate mechanical blocks. Similarly A7-E3PO (*Aysev*, p.101) is a named narrative droid without a full statblock. These are world-character references, not extra source-model records.

Keep `modelFamilyRef`/`narrativeCharacterRefs[]` separate from `publishedStatblockIdentity`, so an actor can be instantiated or uniquely customized without contaminating the canonical factory model or increasing the audited count. The p.74 dual-column extraction merges M4 and FIII lines in TXT, so `pdfLayoutVerified` must remain a source evidence marker. The FIII glyph is visually checked in PDF; OCR/PDF text extracts it as `Fill`/`FIll`.

### Suggested preimplementation acceptance fixtures

1. 3D-4 can represent an unarmed printed stock baseline and separately a published concealed-blaster exemplar; no forced blaster purchase in all factory instantiations.
2. NR-1100 retains both unarmed narrative and equipped ranged-blaster statblock as unresolved conflicting evidence; no invented reconciliation.
3. 5-BT paired bracelet/earbud warning capability does not become an additional built-in hand, body slot, or free action.
4. FIII p.74 remains one factory listing despite Fidelis/Solis names and M4 column interleaving; two possessed cannons do not auto-generate two attack actions.
5. MRD-39B's 6 walking legs, 2 claws, 2 vibrodagger-claw weapons and 1 integrated pistol remain separable; +5 prone stability affects only its specified roll.
6. NR-1100 self-destruct is 2-square **burst** and MRD is 2-square **splash**; do not conflate targeting geometry.
7. M4's restricted-with-weapon availability remains source-scoped; no broad law rule inferred.
8. BL-Series source-specific weapon equivalences and braced autofire resolve through the shared weapon/attack systems, not duplicate droid weapons.

**Certification boundary:** GOI 8/8 primary identities and their source pages are visually checked; none has all numerical fields mechanically certified. Nothing here authorizes production implementation or GitHub publication.


---

## Jedi Academy Training Manual - schema addendum (v0.9; 0 new droid statblocks)

**Source and count:** *Jedi Academy Training Manual* (2009). Whole-book 15,100-line TXT sweep of `Jedi Academy Training Manual_djvu.txt` and PDF verification of chapter IV pages printed **78-79** (physical PDF **79-80**) plus equipment page printed **64** (physical PDF **65**). **No full droid-character, squad, or autonomous droid-vehicle statblocks** found. This is a *source-reviewed zero*. New rules and boundary records are captured rather than introducing fictitious model rows. No field-level or runtime certification is claimed.

### SCHEMA-JATM-01 - Shard entity identity vs droid shell identity

Printed p.79: Shards are sentient, crystalline, Force-capable beings that can reside within droid bodies. The species rules presume a Medium humanoid droid shell for player characters. The Shard retains a **Constitution** score even in its body and uses the printed Shard ability modifiers (**-2 Dexterity, +2 Wisdom**), Bonus Skill Use Computer, and Automatic Languages Basic/Binary. Do **not** apply the ordinary droid `noCON` or `noForceAffinity` traits to the Shard species. Likewise, do not erase their Force capabilities because their body is mechanical.

**Schema separation proposal:** `entityIdentity` (occupant species, ancestry, Force permissions, character statistics), `bodyPlatform` (mechanical shell type, size, component attachment records, physical equipment), `hostRelationship` (relationship type `SHARD_IN_DROID_SHELL`, occupant identity, shell instance identity, controller interface). These are **conceptual fields**, not authorization for an entirely new Actor type or duplicated progression engine. Reuse the existing Species/Anatomy and Droid/Equipment authorities with an explicit integration adapter. How the occupant and shell are persisted (same actor versus linked documents) remains an implementation decision for D2.

Avoid a generic boolean `isDroid` that incorrectly implies droid physiology or Force immunity for a Shard. The rule-facing identity should be a structured bundle of **traits granted by occupant** and **traits granted by shell**. Printed p.79 grants Shard shells certain droid-type effects but not every universal droid immunity.

### SCHEMA-JATM-02 - Droid Shell traits are selective, not a full Core droid package

Printed p.79 specifies for Shards in a droid shell:

- Maintenance as a droid; immunity to poison, disease, radiation, noncorrosive atmospheric hazards and vacuum.
- HP recovery through the Mechanics **Repair Droid** application; **no natural healing unless Force Repair** applies.
- Classification as **cybernetic creatures for damage by ion weapons**. Do not substitute the standard droid-ion rule.
- Droid accessory allowance limited to **appendages, armor, communications devices, internal storage, sensors, and translator units**; preserve the printed list as an explicit source-scoped allowance. Do not infer unrestricted installation from the fact that a mechanical body exists.
- A printed **x1 cost modifier for Shard bodies**. Scope it to the printed Shard body cost rule, not a universal droid size or modification purchase multiplier.
- Communication with others only when connected to a computer or vocabulator.

Proposed discriminated trait rows: `traitId`, `grantingSource` (`occupant`, `shell`, `talent`, `equipment`), `targetRuleDomain`, `predicate`, `effectRef`, `sourceRef`, `mechanicalCertification`. Structural `accessoryPermission` should be an explicit allowed-category set for `hostKind=shardDroidShell`. Absence of an allowance is not permission; a separate examination must determine whether particular locomotion/processor rules are applicable to the shell.

### SCHEMA-JATM-03 - Force healing and immunity bypasses must stay scoped

Printed p.79, Iron Knight talents: **Force Repair** permits healing via Force Trance and vital transfer, plus a specified bonus-HP interaction. **Heal Droid** (prerequisite: vital transfer) allows use of vital transfer to heal droids, explicitly including Shard-inhabited droids. These are neither blanket removal of droid Force immunity nor a rule that all droids naturally heal. Implement via the existing healing/ability execution consumers with attacker/source eligibility and valid target classification. Preserve the difference between *a Shard character receiving healing* and *an Iron Knight healing other droids*.

Printed p.64, **Subelectronic Converter**: installed as a cybernetic enhancement (requires Cybernetic Surgery), permits its **implanted user** to employ mind-affecting Force powers on droids despite the normal target immunity, and imposes **-2 Will Defense on the recipient**. This is an *actor-owned permission* and a recipient penalty, not a deletion of the droid's immunity flag. The book's Human **Irek Ismaren** statblock (p.121) is an example wearer, not a droid source model.

Proposed reusable interaction contract: `effectPermission{ sourceActorPredicate, sourceItemOrTalentRef, targetTraitPredicate, overriddenRestrictionId, allowedActionKinds[], provenance }`. Refuse generalized permission until exact effect matching and target conditions have been certified.

### SCHEMA-JATM-04 - Iron Knight membership and model references

Printed p.78: only Shards can join the **Iron Knights** tradition. Iron Knights are treated as part of the Jedi tradition for Jedi Knight/Jedi Master prestige qualification; this is a **membership/qualification exception** and does not convert all droid characters into eligible Force users. Droid body suggestions mention **Juggernaut War Droid** and **FLTCH-Series Droid**, which are existing model references and not new JATM statblocks. Do not instantiate fake source-model identities for these mentions or the accompanying illustration.

**Suggested data linkage:** `forceTraditionMembership[]` and `prerequisiteExceptions[]`, backed by canonical feat/talent and progression authority; `shellModelReference` may point to a *separately certified* stock-model listing from KotOR/SGD. Membership rules must be checked at character creation and progression without mutating species identity.

### JATM acceptance fixtures (not implemented)

1. A printed Shard character in a droid shell retains Constitution and permitted Force abilities; no ordinary droid no-Constitution/no-Force rule is automatically inherited.
2. The Shard character has the exact printed -2 Dex/+2 Wis package, Use Computer trained, Medium assumed baseline and Basic/Binary languages (with the printed computer/vocabulator communication restriction).
3. Shard shell has only enumerated droid-body immunities; no invented mind-affecting immunity or generic Force immunity is added to the Shard.
4. Shard-ion effects use the **cybernetic** target classification, not automatic ordinary droid ion-as-stun treatment.
5. Shard body cost x1 does not override standard droid cost formulas for ordinary droids or attach to every equipment purchase.
6. A Shard without Force Repair receives no natural healing; with Force Repair, only the printed natural/Force-Trance and vital-transfer exceptions operate.
7. Heal Droid permits vital transfer on a qualifying ordinary droid or Shard-bodied droid, without affecting unrelated Force powers or granting this permission to everyone.
8. A converter-wearing attacker may use certified mind-affecting Force powers against eligible droids while another attacker remains blocked; wearer suffers the printed -2 Will penalty.
9. Iron Knight/Jedi Knight qualification depends on Shard species and the printed tradition exception; ordinary factory droid membership remains unchanged.
10. Neither Iron Knight artwork nor Irek Ismaren nor the named Juggernaut/FLTCH references increment the JATM droid-statblock count.

**Source precedence:** DROID-RULE-001 unchanged. JATM gives highly specific species, body-host, Force-talent, and implant exceptions; do not generalize or claim broad contradiction with Core/SGD. **Certification:** JATM source census complete (0); Shard/implant rule headings and decisive pages visually reviewed; mechanical implementation specification **pending**; Foundry runtime **not tested**. No GitHub changes.


---

## Owner architectural carry-forward - Shards and Replica Droids (2026-10-29)

**Decision ID: DROID-ARCH-002 (OWNER DIRECTION; not a published-rules claim).** During the earlier Species refactor, **Shard-in-droid-shell PCs and replica-droid PCs were intentionally deferred**. They are expressly **in scope for the Droid PC / Droid schema and progression integration phase**, rather than being considered omissions to fix by adding them to the ordinary organic-species path. No existing player data need be migrated. This is a future implementation requirement, not a statement that either has already been implemented.

**Shard rule authority** remains *Jedi Academy Training Manual*, printed pp. 78-79, as detailed in SCHEMA-JATM-01 through SCHEMA-JATM-04. A Shard is a sapient, Force-capable crystalline occupant of a mechanical shell and **must not** automatically inherit universal ordinary-droid restrictions such as no Constitution or no Force affinity. Species/occupant identity and body construction must remain independently addressable by the existing progression and anatomy consumers.

**Replica-droid rule authority and exact creation mechanics remain TO BE SOURCE-VERIFIED.** Do not assume replica droids are ordinary organic species merely because they can resemble organics; do not assume Shard exceptions automatically apply to replica droids. Their precise creature classification, ability scores, immunities, Force interactions, body/component limitations, PC eligibility and published source/page must be independently established before any rules are encoded.

**D2 schema requirement:** choose an explicit `pcIdentityKind` / `bodyPlatformKind` distinction (names provisional), supporting at minimum `ordinaryDroid`, `shardInDroidShell` and `replicaDroid` as disjoint source-driven options, **without forking the character progression engine or reintroducing a parallel species registry**. Reuse already-certified Species, Droid, Equipment, and V2 progression authorities through a single integration contract. Restrict each special rule to the correct identity and source.

**Required D2/D3 acceptance cases:** (1) Shard PCs retain printed Constitution/Force and shell limits; (2) a factory droid PC receives standard droid traits, not Shard traits; (3) replica-droid PCs cannot be treated as an ordinary human/organic template without source verification; (4) the deferred species work is resolved through Droid-PC integration rather than duplicate species implementation; (5) chargen, level-up and sheet consumers all read the same identity/body classification.

**Implementation status:** OWNER-DECIDED scope only; published replica-droid mechanics NOT CERTIFIED; no production code or GitHub modification authorized.


---

## Legacy Era Campaign Guide - schema addendum (v0.10; 12 droid identities)

**Publication:** *Legacy Era Campaign Guide*, Chapter V (*Equipment and Droids*), printed pp.69-77, PDF 1-based pp.70-78, searchable `Legacy Era Campaign Guide_djvu.txt` anchors 6089-6953. Twelve droid-character statblocks, no qualifying droid vehicles or squads. Chapter-wide source identity review is complete; numerical/mechanical certification is not.

### SCHEMA-LEGACY-01 - Printed degree vs contextual classification

**LV8-Series Guard Droid**, printed p.75: the actual statline is **Medium droid nonheroic 12**, with *no parenthesized degree*. It appears under the **Fourth-Degree Droids** heading. Schema must distinguish `identity.degree.explicitPrinted = null` from `identity.degree.contextInferred = 4`, with separate source evidence and certification. Do not silently promote section inference into a printed statline fact. All other 11 published statlines in this book explicitly identify the degree.

### SCHEMA-LEGACY-02 - Manufacturer loadout, appendage-mount ownership, and attack-source identity

**Z65 Patrol Droid**, p.74, supplies two rifle-equipped tool mounts **instead of hands** and explicitly has two-weapon attack alternatives, autofire, and Burst Fire. **LV8-Series Guard Droid**, p.75, likewise has two tool mounts and two rifles, with separate attack options. Maintain distinct `physicalLocationId`, installed mount/component instance, embedded or associated weapon Item, and executable printed attack options. A weapon listed as a possession may be integrated physically; ownership/presentation are not installation topology. Do not grant two attacks simply for having two possessed weapons. **Aggressor-Series**, p.76, is manufactured without ranged weapons and carries a dire vibroblade; do not fabricate a free factory firearm.

### SCHEMA-LEGACY-03 - Model-specific carrying/lifting multiplier

**HV-7 Loading Droid**, p.77, lists a `repulsor-assisted lifting system` that multiplies ordinary lifting/carrying capacity by **3**. This is a *component-granted capacity modifier*, separate from Core's droid-size carrying factor and distinct from a blanket cost multiplier. The source does not specify generic stacking rules with other capacity multipliers; defer such interactions until verified. The HV-7 can collapse into a disk for transport in prose; no precise deployed-size/action economy rule is established by this statblock alone.

### SCHEMA-LEGACY-04 - Languages are capabilities, not a simple known-language list

**PI-Series Medical Assistant Droid**, p.69, lists Basic **(cannot speak)**, Binary and an unassigned language; **HV-7**, p.77, lists Basic **(understand only)**. Store comprehension/understanding distinctly from speaking/vocabulator capabilities. Do not represent a known but unspoken language as fully speakable. PI-Series is the printed model identity; the TXT uses a visually ambiguous `Pl-` form.

### SCHEMA-LEGACY-05 - Droid pilot as creature/crew, not autonomous vehicle

**FEG-Series Pilot Droid**, p.71, is a Medium second-degree heroic droid (scoundrel 1) designed to function as a pilot or copilot. Its presence in a vehicle crew must not convert it into the vehicle Actor or droid brain. Link the droid Actor to the shared vehicle crew-assignment/station authority and use its published Pilot/Mechanics/Use Computer skills; preserve owner-vs-droid skill authority. Named `FEG-13` in accompanying prose has no independent statblock.

### SCHEMA-LEGACY-06 - Memory, autonomous recording, and narrative-only programs

**Roving Eye Observation Droid**, p.73, collects/processes data and transmits a consolidated packet rather than a live high-rate feed; **Holocam Droid**, p.72, has recording units as possessions with no printed attack line or manipulators; **3Z3**, p.70, has combat-triage behavior described in narrative; **BL-39**, p.71, may be reprogrammed as a medical assistant. These are model-scoped program/behavior evidence, **not universal new action types, reprogramming success rates, or free component conversions**. Mark precise activation rules unspecified until source-verified.

### SCHEMA-LEGACY-07 - Explicit PC eligibility and class progression

Five models explicitly permit droid heroes (3Z3, BL-39, FEG, Aggressor, HV-7); seven explicitly prohibit it (PI, Holocam, Roving Eye, Z65, LV8, IX-6, LON-29). Several carry heroic class levels as published stock statblocks without being available as a starting PC. Source-level `canBeDroidHero` must come from printed eligibility, not from whether `publishedClassLine` contains `soldier`, `scoundrel` or `officer`. Source-specific feat substitution on **Aggressor** p.76 must remain tied to that model/class build, not generalized to all droids.

### SCHEMA-LEGACY-08 - Replica Droid and Shard postponed species work: source locator

Owner decision **DROID-ARCH-002** remains authoritative: Shard-in-droid-shell PCs and Replica Droid PCs were intentionally deferred from the Species refactor to Droid-PC integration. A concrete **replica-droid PC rules source** is now located in *Threats of the Galaxy*, in searchable TXT near `Threats of the Galaxy_djvu.txt` line **14954**, under `NEW SPECIES: REPLICA DROID` (the index refers to printed p.152). The TXT describes variable Small/Medium copied species size, droid traits and immunities, special maintenance treatment, optional systems and Deception-based benefit. **Do not treat this as field-certified source authority until printed Threats PDF verification in its scheduled book pass.** Explicitly preserve the published replica-droid species-style creation method without routing replica droid bodies through the ordinary organic-species path. Do not conflate replica traits with JATM Shard traits.

### LEGACY proposed acceptance fixtures (NOT IMPLEMENTED)

1. LV8 degree is null as a printed statline field while fourth-degree section provenance is available separately; no automatic degree bonus from an inferred field.
2. PI-Series identity is distinguished from OCR variants; no duplicate factory-model identity.
3. PI-Series and HV-7 understand Basic without automatically speaking it.
4. Z65's two physically integrated tool-mounted rifles have distinct instance/mount identities; printed attack options, not owned-weapon count, determine action availability.
5. Aggressor comes with no factory ranged weapon; importing its possessed dire vibroblade doesn't manufacture a firearm.
6. HV-7 carrying capacity uses a component-scoped x3 multiplier and does not change droid part price.
7. FEG pilot is a droid Actor eligible for crew assignment; it doesn't become a vehicle or a vehicle automation brain.
8. Published narrative named K2-3Z3/FEG-13 do not increment the book statblock count.
9. 5/7 heroic eligibility classification comes from narrative source, not class presence.
10. Roving Eye buffered recording, 3Z3 triage and BL-39 conversion prose do not create unstated free actions or automatic reconfiguration operations.
11. Replica droid requirements remain a pending Threats source audit and a droid-PC integration requirement, not an ordinary species-refactor regression.

**Certification:** 12/12 source identities and printed pages verified for enumeration, 0/12 fully mechanically certified. This addendum is a schema proposal; no GitHub code changes.


---

## Rebellion Era Campaign Guide — schema addendum v0.11 (15 droid identities)

**Source review:** *Rebellion Era Campaign Guide* printed pp.53-57, 110, 127-130, 143-144. Fifteen droid actor statblocks with PDF-verified names/page positions, and TXT anchors in the rolling census. No qualifying autonomous droid-vehicle or droid squad blocks identified. The source-certification and field-mechanical-certification gates remain distinct.

### SCHEMA-REBELLION-01 — Stationary chassis and arbitrarily enumerated appendage inventory

**FX-7 Medical Droid (p.53)** prints `Speed 0 (stationary)` and **20 hands** under Systems. A physical droid can have zero locomotion capability yet still operate tools and interact with nearby objects, subject to reach/action rules. Do not impose a default locomotion component for every droid nor cap manipulators at two. Every printed hand must have stable instance identity when materialized for equipment occupancy; the 20 hands do **not** grant twenty attacks/actions. The FX-7 lacks a vocabulator; language comprehension and speech are distinct as established by earlier schema addenda.

### SCHEMA-REBELLION-02 — Modular tool appendages with no invented free transaction

**WED Treadwell Repair Droid (p.54)** lists four tool appendages and describes fast exchange of specialty arms. Keep per-instance detachable/replaceable tool topology and published provenance. Narrative ease of swapping does not itself certify a free action, automatic 0-credit replacement, or unlimited reserve capacity. Standard installation/repair procedure is sourced through Core/SGD precedence unless an explicit scoped exception is established.

### SCHEMA-REBELLION-03 — Droid body occupied by non-droid brain

**BT-16 Perimeter Security Droid (pp.55-56)** is a factory fourth-degree guard droid; its text says B'omarr monks adapted these to carry preserved living brains. This is a **narrative occupancy exception**, *not* a new factory model or fully published playable-PC template. Proposed schema should allow occupant identity and body platform to be independently expressed, consistent with the Shard decision DROID-ARCH-002, but not infer B'omarr immunities, Force access, skills or body modifications from this mention alone. Mechanically relevant specifics remain unverified.

### SCHEMA-REBELLION-04 — Controller/subordinate fleet relationship and offline behavior

**RHTC-560 Hunter Trainer + HT Drone (p.57)** are two fully statted droid identities. The controller directs **six to twelve** drones; the factory RHTC-560 price explicitly excludes them. An HT Drone can continue its **last command for 20 hours** after communications cease, then returns to its controller. Store `controllerActorRef`, individually-addressed `subordinateActorRefs`, commanded task, last contact/elapsed duration and a model-specific communication-loss behavior rather than treating each drone as a passenger Item or generic remote-processor extension. The exact legal order economy/range is not established by this statblock alone; do not invent it. Drones have both hovering and walking speeds, each independently represented. The drone's two hand appendages appear under Possessions, illustrating that presentation placement does not determine physical slot classification.

### SCHEMA-REBELLION-05 — Spotter droid crew occupancy is not autonomous vehicle identity

**LV-38 Spotter/Probe Droid (p.110)** has its own Small fourth-degree droid-character statblock, while the adjacent artillery vehicle lists `Passengers 1 (spotter droid)`. Reuse vehicle cargo/passenger/crew authority; a separate droid actor can occupy a vehicle passenger or spotter role without making the vehicle a droid vehicle or duplicating droid sensor mechanics into the vehicle actor. Its data transmission/detection capabilities are model-specific; no universal automated targeting bonus should be inferred from the droid model paragraph.

### SCHEMA-REBELLION-06 — Droid body vs equipable armor unit (Dark Troopers)

**Dark Trooper Phases I–III (pp.128–129)** are **three distinct printed droid character statblocks**. Phase I's wrist-mounted blast shield has a conditionally described armor bonus when it does not attack. Phase II and III also describe the armor as a wearable *suit* that can grant benefits to a non-droid character. These are two different host relationships: factory droid body systems, and an equipment Item (the wearable suit) governed by Armor/Equipment authority. Do not instantiate the wearable suit as an extra droid chassis, or double-count armor effects. Phase II/III have different armament, braced autofire, shoulder/forearm weapons and protection values. All effects must follow the printed scope, not copy between phases.

### SCHEMA-REBELLION-07 — Named-character model lineage and body/personhood replication

**LOM-Series Protocol Droid (p.55)** and **4-LOM (p.143)** are distinct published statblocks; the latter's character/progression builds on the factory family. **IG-88 (p.144)** has a single full statblock although its narrative describes copied consciousness across four IG-88 bodies and IG-72. Keep `publicationIdentity`, `baseModelIdentity`, `namedPersonalityIdentity`, and optional lore/instance-level copy relationships conceptually separate. Do **not** generate five statblocks from one narrative or make data migration/model alias assumptions. Both named droid bounty hunters have normal published character-class progressions and Force Point totals; these do not grant Force sensitivity without a verified specific rule.

### SCHEMA-REBELLION-08 — Datafields and provenance handling

Each installed part needs `physicalInstanceId`, `sourcePresentationLocation` (`systems`, `possessions`, `narrative`, `attackLine`), `locationId` when established, and canonical part/Item reference. The factory variant's published stats and equipment configuration are distinct from later changes; contextual combat adjustments (e.g., Phase I's shield while not attacking) are conditional effects rather than baked-in permanent bonuses. Preserve printed free-form statblock labels, extra unused physical space, dual speed modes, and provenance when available. Do not adopt an invented global droid capacity/slotted upgrade point pool.

### Rebellion proposed verification fixtures (NOT IMPLEMENTED)

1. FX-7 with Speed 0 and 20 hand component instances stays stationary and has no bonus attacks solely from hand count.
2. WED's four tool components are independently identifiable and substitutable only by certified rules, never by fabricated free installation.
3. BT-16 with a narrative B'omarr occupant keeps chassis and occupant separate; no generic Shard exemptions inferred.
4. RHTC-560 with 6–12 linked subordinate HT Drones reports the controller's listed purchase price without secretly purchasing its drones.
5. HT Drone loses communications: last task continues for twenty hours and then return behavior is model-scoped, not universal remote-controlled droid behavior.
6. HT Drone has hover 6 and walk 4 without losing either movement mode; its Possessions-listed hands are still physical parts.
7. LV-38 occupies an artillery vehicle's spotter/passenger position but is not absorbed into the vehicle's actor, and vehicle remains non-droid.
8. Phase I shield provides its conditional printed bonus only in qualifying circumstances; other phases do not inherit it automatically.
9. Phase II/III wearable armor Items and factory droids resolve through separate host types without doubling defenses.
10. LOM factory baseline and 4-LOM named-character progression retain separate publication IDs and a family relation.
11. IG-88 has one publication statblock in this book; multiple narrative consciousness copies do not inflate census.
12. All 15 Rebellion records have correct printed-page/TXT/PDF provenance, source-review status separately from mechanical certification, and no vehicle-format droid records invented from spotter passengers.

**DROID-RULE-001 gate:** Any Rebellion rule contradicting Core and/or SGD must be evaluated under the owner-approved *Scavenger's Guide* over Core precedent only for the relevant scope. This addendum records observations; it does not authorize an invented Rebellion-vs-SGD source-precedence policy.

**Status:** 15 source identities/page locations reviewed, 0 mechanical certifications; schema is proposed and no GitHub changes made.


---

# Addendum v0.12 — Scum and Villainy source census and equipment-to-droid rules (2026-10-29)

**Source:** `Scum and Villainy_djvu.txt` with PDF-page verification in `SAGA EDITION - Scum and Villainy.pdf`, printed pp.37-41, 96, 156-157, and 216. Published entries and their identifiers are inventoried under `SCUM-DROID-001` to `SCUM-DROID-005` in the rolling JSON. This addendum is *schema research*, not permission to implement unverified semantics. Owner source-precedence DROID-RULE-001 remains: Scavenger controls only direct contradiction with Core; no priority over Scum is inferred.

## SCHEMA-SCUM-01 — Device-derived droid, not arbitrary chassis (source verified)

*Scum and Villainy* printed p.40, **Droidification** in Table 2-3 and paragraph: device can be transformed into a functioning droid, using ASP labor droid baseline with explicit changes keyed to the original equipment size. The upgrade uses **2 equipment upgrade points**, **2,000 credits**, and is **Licensed**; allowed host category is **device only**. Weapons, armor and vehicles are explicitly excluded. The device retains its underlying functions; when concealing itself as ordinary equipment it cannot act, and detecting the abnormality uses a DC 25 Perception check. The source states further size-based adjustments to Strength, Dexterity and speed, which need separate formula-by-formula certification from printed page before executable conversion.

**Proposed data model:** Item-origin reference, host Item upgrade instances and slot pool, derived actor identity/ASP reference, presentation mode `active-droid | disguised-device`, retained device functions, mechanical override package with cited provenance, disallowed hosts, and reversible transformation design only if explicitly allowed by rules (do not invent free reversal). The existing V2 Equipment modification registry retains authority for the purchased upgrade; Droid actor/animation/mechanics should be a projection from it, not a second unrelated modification ledger. The source must not be confused with **Replica Droid** or **Shard Droid Shell** (DROID-ARCH-002).

## SCHEMA-SCUM-02 — Memory Upgrade explicitly excludes droids (source verified)

Printed p.41: **Memory Upgrade** cannot be installed on droids, expressly including *droidified equipment*. This is a typed modification **host-eligibility prohibition**, not a universal exclusion for any Item held by a droid. It should be enforced at the source-verified modification host-evaluator boundary, without disabling ordinary memory upgrades on non-droid equipment merely possessed by a droid.

## SCHEMA-SCUM-03 — Distinct accounting domains and installation procedures (source verified)

Printed pp.37-39: *equipment upgrade slots* attach to equipment, armor, weapons and their respective rules and size changes; base items normally have one upgrade slot, medium armor starts at two, heavy armor at three, with stated exceptions. Extra slots from stripping/size rules must obey their own cost/side-effect restrictions. The Mechanics DC and time for upgraded equipment depend on upgrade points and scratch-built versus commercial procedures (Table 2-2, p.39). These are **not the same** as the droid component installation rules from Core/Scavenger.

**Schema boundary:** installed equipment Item owns modification instances and upgrade slot accounting; the Droid owns its component instance/location ledger. Altering the weapon's modification set never silently alters droid appendage counts, and installing a droid component cannot spend equipment-upgrade slots in place of droid construction restrictions. Integrate under the same TransactionEngine/ActorEngine without a duplicate writer.

## SCHEMA-SCUM-04 — Manufacturer and book-specific model lineage

The **Industrial Automaton RX-Series Pilot Droid** on printed p.96 resembles the separately published *Scavenger's Guide* RX-Series record. Store the two publication identities separately, with `candidateSharedModelFamily` until mechanical parity is checked. The Roche **8D8 Smelting Operator Droid** (p.157) must also not be collapsed into the *Scavenger's Guide* **8D Smelter Droid** by name approximation. A manufacturer/model series field and source-specific variant relation belong in the canonical mapping pass, not a name-based runtime join.

## SCHEMA-SCUM-05 — Appendage identity and nonhand profession

Printed p.96 **RX-Series Pilot Droid**: hover locomotion and *three claw appendages* while still possessing Pilot training and the capacity to operate a ship. Printed p.157 **J9 Worker Drone**: enumerated systems contain walking locomotion, processor, translator unit and vocabulator, but no claw/hand appendage; hands are **unknown**, not defaulted from its job description. Physical manipulation should use certified appendage instances/capabilities, not assumed human anatomy or 'pilot implies hands' shortcuts.

## SCHEMA-SCUM-06 — Scoped environmental protection and industrial attacks

Printed p.157 **8D8** has a **+20 equipment bonus to Fortitude Defense against extreme heat and fire** from its heat-resistant kevlex coating. Represent through an equipment/structural component effect with matching hazard context, rather than a permanent +20 to all Fortitude Defense. Printed p.156 **11-17 Mining Droid** has heavy plasma jet, blowtorch, and saw plus magnetic feet and a telescoping appendage: mount type, reach, movement, weapon provenance and equipment listings must remain distinct, with no inferred extra attacks from multiple tools.

## SCHEMA-SCUM-07 — Statblock repeat versus encounter behavior

The main 11-17 statblock (p.156) repeats on p.216 with encounter reprogramming instructions (attack intruders lacking passcode within a set interval). Record one book-specific model (`SCUM-DROID-003`), an additional presentation (`SCUM-ALT-001`) and encounter-only scripting instructions. Do not overwrite the factory statblock to make all 11-17 droids hostile, and do not count the repeat twice.

## Proposed acceptance fixtures (not yet implemented)

1. Five distinct Scum publication listing ids with printed pages, line anchors and PDF mappings; 1 repeated statblock linked and excluded from count.
2. RX pilot preserves hover locomotion, exactly three reported claw appendages; holding/wielding permissions are separately source-certified.
3. J9 with unspecified manipulators remains indeterminate rather than creating free default hands.
4. 8D8 gets the environmental bonus only against explicit extreme heat/fire contexts; ordinary Fortitude contests unaffected.
5. 11-17 has individual tool/telescoping identities, carried weapons separate from physical mount allocation, and no free extra attacks.
6. An ordinary permitted device with Droidification has one verified 2-point upgrade on the original equipment host and a referenced droid-derived read model; no double-charged purchase.
7. Droidification rejects weapons, armor, and vehicles; droidiform device cannot act while disguised.
8. Memory Upgrade rejected for normal droid Actor and for droidified device; item merely owned by a droid remains subject to original host rules.
9. Scum equipment upgrade slots never increase available droid structural appendage/component capacity.
10. Printed p.216 mining reprogramming does not modify the original factory model p.156.
11. Cross-book RX pilot similarity and 8D/8D8 near-name remain separate identities until independent model reconciliation.

**Status:** 5 source/statblock identities/page attestations verified, mechanical field certification outstanding. No production code or GitHub changes.


---

## Starships of the Galaxy — schema addendum v0.13 (3 droid starfighters)

**Publication:** *Starships of the Galaxy*, printed pp.78-79, scanned PDF pp.79-80 (1-based). Searchable `Starships of the Galaxy_djvu.txt` line anchors 7405, 7515, 7566. Source statblock layout visually confirmed. Independently cross-referenced by exact stable source-entry key to the separately audited vehicle source ledger on GitHub branch `feat/vehicle-canonical-census-cutover`. **This addendum is a droid integration contract and source cross-index, NOT a new vehicle-stat database.**

### SCHEMA-SOTG-01 — Reuse vehicle authority; separate droid-rule classification from vehicle Actor type

The **Vulture**, **Droid Tri-Fighter** and **Scarab** are droid starfighters but are printed as vehicle statblocks. Their base numeric fields, armament attack groups, movement, defense, cost/availability and vehicle combat mechanics belong to the **existing canonical vehicle publication and runtime authority**. Droid census publication record only stores the read-only vehicle `sourceEntryKey`, source locator, any independently sourced droid-rule classification/capabilities and cross-domain certification flags. No duplicate droid-canon numeric copy is permitted at production runtime. Published `Crew 0` is not a general droid classifier: an escape pod also prints Crew 0.

**Three exact vehicle audit IDs:**
- `sotg-baktoid-armor-workshop-vulture-class-starfighter` (printed p.78)
- `sotg-phlac-arphocc-automata-industries-droid-tri-fighter` (printed p.79)
- `sotg-haor-chall-engineering-scarab-class-starfighter` (printed p.79)

Vehicle refactor source fields already exist for all three in `data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json`. None of those three have `fullFieldCertified` or `fullWeaponMountReconciled` true at the verified branch. Linkage to live production Actors has **not** been established by this review.

### SCHEMA-SOTG-02 — Command architecture: controlled, redundant, or independently autonomous

The **Droid Starfighters** capabilities text (printed p.78) states the normal external control source is a Droid Control Ship and that retrofitting independent droid brains is possible but limited by cost. **Do not infer a built-in autonomous processor for every droid starfighter** or model all starships with a zero-person crew as independently self-programming. Proposed link: `controllerLink{ mode: 'external-command'|'independent-brain'|'unknown', controllerActorRef?, fallbackControllerRefs?, lossOfControllerRuleRef?, evidence }`. Do not instantiate a controller Actor by assumption, invent range/latency, or hardcode automatic shutdown on the loss of one command ship. Redundant controllers are described in prose, but exact switching mechanics are not universal published numeric rules.

A Lucrehulk Droid Control Ship and the 300-crew Recusant-class destroyer **remain conventional capital-ship statblock identities** for this droid census, even though they control or use droid automation. Their classification must not become droid Actor simply from the word *droid* in narrative.

### SCHEMA-SOTG-03 — Zero-crew vehicle weapons and one-as-each-gunner exception

Printed p.79: droid starfighters may attack with all weapons as though each has a separate gunner even with **Crew 0**. This is a **specific source-backed operator/action exception**, not a license to materialize an unlimited number of physical mounts or bypass the existing gunnery resolver, attack action economy or stock weapon trust gates. Represent one capability/rule predicate on the vehicle owner or effective controller context; the existing **vehicle crew/operator and combat engines** retain execution authority. Printed attack-group count, physical gun/mount count, firing arc, weapon instance and operator right are distinct. As of the reviewed vehicle audit, these three droid fighters have unresolved physical-mount certification. No trusted attacks should be unlocked by adding the droid trait.

### SCHEMA-SOTG-04 — Droid immunities on vehicle hosts

Printed Vulture statblock p.78 says `Immune droid traits`; the section's general capability text p.79 explicitly states all droid starfighters have droid immunities, including mind-affecting immunity, even where a particular individual statblock does not repeat that line. The **existing immunity/effect resolver** should consume a provenance-backed droid-classification trait on a **vehicle host**, instead of copying all normal droid-PC abilities, degree, starting credits, processors, heroic class progression or biological assumptions to that vehicle. Ion/electronic exceptions still require their own existing damage rules and published source verification; do not assume a generic vehicle has a droid's immunities.

### SCHEMA-SOTG-05 — Multiple movement modes are configurations of one published ship

Vulture printed p.78 is one **Huge starfighter/ground vehicle (walker)** with speed `6 squares` walking, `fly 16 squares`, `fly 4 squares` starship-scale. All modes live on one published ship baseline, not two independent actor records. Transition economy and other mode rules must be certified from the proper source(s) (the Core vulture has separate source evidence) before automation. The Tri-Fighter and Scarab have starship/flight speeds only; do not manufacture walking mode just because another droid ship has one.

### SCHEMA-SOTG-06 — Published crew quality versus actual actor station assignment

Source crew is zero with the printed quality labels **expert** (Vulture, Tri-Fighter) or **skilled** (Scarab). These labels support published default attack/skill context but do not create hidden crew Actor documents, an automatic independent brain, nor six phantom gunners. Proposed data retain `publishedCrew{count:0, quality:'expert'|'skilled'}`, actual `controllerLink` separately, and vehicle engine station/attack provenance. The source's printed attack/skill totals remain source evidence and must not become bonus modifiers stacked on top of rebuilt operator math.

### SCHEMA-SOTG-07 — Cross-book model relationships, source fidelity, and no forced new droid ships

The ship refactor previously found a distinct **Core Rulebook Vulture starfighter/walker** publication statblock (Core printed pp.180-181). Keep the Core and SotG publication claims distinct even if one family identity is later verified. Normalized family equivalence is a separate, source-evidenced reconciliation; no name similarity is sufficient. Preserve separate owner-approved or source-resolved variants from user-created modifications.

The vehicle audit CP20 states **100 source-fidelity certificates, 4 historical strict mechanical certificates, 100 strict certification items outstanding, and zero trusted stock attack grants** at that checkpoint. CP23-C4C still reports an importer-normalization blocker for a separate 15-ship set. These statuses are distinct from the 3/3 completed **droid publication identity** census; none authorizes new executable ship combat or a runtime migration.

### SOTG proposed acceptance fixtures (NOT IMPLEMENTED)

1. The three droid starfighter census entries bind to the exact three established vehicle audit `sourceEntryKey` identities and do not generate a second vehicle-stat registry.
2. Crew-0 Escape Pod is not classified as droid and receives no droid immunity or gunner exception.
3. Vulture, Tri-Fighter and Scarab retain printed expert/expert/skilled source crew quality, respectively, with no phantom crew Actor creation.
4. Droid starfighter mind-affecting immunity applies from a cited droid-trait rule even when individual printed statline omits repeated immunity text; not inherited by ordinary crewed ships.
5. Three attack groups on a Tri-Fighter do not prove three physical firing mounts, arcs, station assignments or three eligible execution actions.
6. Vulture locomotion (walk/fly/starship flight) is a single ship's multi-mode configuration; no second duplicate vehicle identity is created.
7. Removing a Droid Control Ship must not automatically impose unprinted shutdown on all controlled ships; control redundancy or brain retrofit must be evidence-bound.
8. A non-retrofitted Vulture does not acquire a fictitious independent processor or heroic droid class by virtue of being a droid starfighter.
9. Source-reviewed ship rows with `fullWeaponMountReconciled:false` remain blocked from trusted stock attacks despite droid rules or `Crew 0`.
10. The source-specific Core Vulture and SotG Vulture claims stay separate until explicit lineage/variant reconciliation.
11. Capital ship with droid brain/automation (Recusant) or droid control system (Lucrehulk) is not itself a droid body without affirmative distinct published classification.
12. A zero-person crew does not automatically authorize as-many-attacks-as-weapons except under the printed droid-starship exception and existing legal attack pipeline.

**Certification:** 3/3 source identities and printed-page labels reviewed; 0/3 strict mechanical/mount-certified; 0/3 verified Foundry stock weapon authorization. **Status:** source-to-schema proposal only, no production mutation or GitHub write.


---

## Threats of the Galaxy — Droid Rules-to-Schema addendum v0.14

**Primary source:** *Threats of the Galaxy*, Chapter III *Droids*, printed pp.133–160, **29** distinct printed droid statblocks, plus separate player-creation sidebar printed p.153. Scanned PDF checked visually; TXT source line anchors in `droid-publication-census.json`. The PDF index is 0-based; `pdfIndex=printedPage` and `pdfPageStart1Based=printedPage+1`. **This is a source-informed proposed contract, not working production code or full field certification.**

### SCHEMA-THREATS-01 — Explicit owner deferral DROID-ARCH-002: replica droids are Droid PCs, despite species-formatted rules

Printed **p.153** is labeled `NEW SPECIES: REPLICA DROID` but explicitly says the species-traits presentation is for players who want to play droids using a simpler creation format. The owner previously intentionally deferred **replica droids and Shards** from the Species refactor for **Droid-PC integration**. Treat the heading as a *source presentation format*, **not a directive to use organic character species mechanics or organic anatomy**. Proposed `characterCreationProfile.type: 'replica-droid'`, owner authority Droid PC + normal progression, `publishedTraitFormat:'species-traits'`, `sourceTraitProfileId:'THREATS-REPLICA-DROID-PLAYER-TRAITS-P153'`. Reuse the established ActorEngine, Progression, Equipment, and Droid trait authority; no duplicate feat leveling, organic species inheritance, or second Droid Builder. A synthetic humanoid *appearance* is not a separately verified organic species.

**Verified mechanical player-creation traits printed p.153** (not a complete runtime implementation):

| Trait | Source value / required integration |
|---|---|
| Ability modifiers | **+2 Strength, +2 Dexterity, -2 Charisma; no Constitution score.** The missing CON is not 0 and not a standard biological stat. |
| Copied identity / size | Select a *Small or Medium humanoid species to replicate*. Size tracks copied species. This does **not** copy all biological traits, subtypes, immunities or organ functions. |
| Size modifiers | Medium: no size bonuses/penalties. Small: **+1 size Reflex**, **+5 size Stealth**, **three-quarter Medium carrying/lifting limits**. Reuse existing size and capacity authorities; never compound with a second droid size modifier. |
| Speed | Medium **6 squares**; Small **4 squares**. Use movement authority, independent from cosmetic body shape. |
| Initial bonus equipment | Choose **two** installed systems from **integrated comlink, darkvision, diagnostics package, improved sensor package, internal storage (size limits apply), translator unit (DC 15)**. Model as publication-granted starting system selection, not unmetered bonus upgrade points, not paid twice, and not necessarily a copy of generic ordinary factory packages. |
| Degree / immunities | **Operate as 4th-degree droids** and have **all normal droid traits/immunities**, **except no maintenance requirement** (Core p.187 cited). This is an effective-rule trait from p.153, not an explicitly printed `(4th-degree)` statline on the Replica Droid model (p.152) or Guri (p.153). |
| Conditional feat | If **Deception is trained**, grant **Skill Focus (Deception)** as a bonus feat. Do not grant to all replica droids and do not create an untraceable duplicate feat. |
| Languages | **Basic and native language of copied species**, not every language in an organic species example statblock. |
| Player permission | p.152 states replica droids **can be played as droid heroes**. Standard droid-PC and level limits still require their own precedence-aware validation. |

Only the traits explicitly listed above are certified to appear in the publication. **No automatic copy of the source species' ability adjustments, skill rerolls, racial talents, biologic species conditions, or Constitution-based mechanics.** Source silence must be respected.

The **Shard/Iron Knight** path is still separately governed by JATM pp.78–79: Shards retain Constitution, distinct Force interaction, and special ion effects; do not merge them with replicas. Their common engineering need is support for source-specific droid-PC construction and body/occupant separation, **not** identical biological/replica rules.

### SCHEMA-THREATS-02 — Replica NPC statblocks and player starting choices are distinct objects

Printed p.152 **`Replica Droid CL 4`** is a fully specified Medium **scout 4** droid NPC example and p.153 **`Guri CL 10`** is a fully specified **Human replica droid noble 2/scoundrel 4/soldier 4** named NPC. These are **two publication identities**, not the source of default 1st-level replica PC class progression or two manufactured factory chassis recipes. A PC selecting the replica archetype receives the p.153 player trait profile and standard approved progression level, **not** the example's scout 4, Guri's 10 class levels, or either example's possessions or skill packages. Guri links to replica lineage without asserting she shares the generic stock model's build price or stats. Generic Replica Droid printed **Restricted, 9,000,000 credits** should not silently price every individual replica body; player creation and purchase model prices are distinct. Allow the GM to adopt a *source-backed* named NPC as an explicit separate actor choice.

### SCHEMA-THREATS-03 — Droid degree versus behavioral inhibition / processor state

Intro printed **p.133**: 4th-degree droids alone may freely use weapons against sentient living beings; non-fourth-degree droids have behavioral limits, with exceptional heuristic-processor circumstances; rules describe DC 35 Use Computer reprogramming by adapting 4th-degree software where a droid was not originally designed to be 4th-degree. Preserve this **as a book-specific published assertion**, not a new override of the already-approved **DROID-RULE-001 source precedence**: Scavenger's Guide takes priority only where an actual same-scope contradiction is verified. Typed data should distinguish `publishedDegree`, `effectiveBehaviorProgramming`, `processorType`, `inhibitionExceptions`, source and runtime adjudication; never treat every armed first-degree droid as free to inflict lethal damage. In particular, **TO-D** (p.146) has printed first-degree classification plus stun equipment; **GH-7** (p.147) has explicit physician-code restrictions permitting stun-only attacks on intelligent organic targets in patient defense.

### SCHEMA-THREATS-04 — Buzz droids as independent actors deployed by starship ammunition

The **Pistoeka Buzz Droid** p.142 is a **Tiny droid Actor**, not merely a special damage type on a missile. The adjacent `Discord Missile Launcher` rule states a successful launch releases **three** buzz droids into adjacent squares (or starship-scale equivalent); when an opposing vehicle enters their square they can react with **+5 equipment attack bonus**, latch and move with the vehicle. The launcher is an owned **vehicle weapon** handled by the established ship/vehicle modification, payload and attack authority. The three spawned droids are separate actor/token instances with independent damage/HP/attachments; they do not share the weapon's ammo counter as their HP ledger. Do not invent an automatic hit or successful latch from the launch alone; preserve printed attack and reaction predicates. A payload spawning a droid is **not** a newly printed vehicle-format droid identity and does not bypass trusted vehicle weapon attack gates.

### SCHEMA-THREATS-05 — Model variants, processor identity, and surface deception

The **B3-A Series Ultra Battle Droid** printed p.141 is a **separately statblocked variant** of B3 p.140, with an independent heuristic processor and secondary battery, rather than a mutable replacement of the canonical B3. Keep separate publication IDs, shared lineage with explicit source evidence, and no double-billing of installed factory modifications. The **3PX Espionage Droid** p.145 is a 3PO-lookalike but has distinct combat programming, a fake shutdown behavior and different operational authority. The **WSB-15 Sabotage Droid** p.154 resembles WED-15 and can swap processor/programming states, but that does not make those models a single undifferentiated database record. Likewise, the R3/R4/R5/R7 astromech variants have separate printed statblocks, class profiles, and different capability claims; never merge by name prefix.

### SCHEMA-THREATS-06 — Size, locomotion, reach, equipment, and workforce droids

Colossal EVS construction droid p.143 and Gargantuan GRZ-6B demolition droid p.144 remain **droid Actors** under the printed statblock, not vehicles merely because large. EVS has model-specific project programming time/check requirement; it is not a general Tech Specialist programming cost. The IG Series Battle Droid (lancer) p.141 uses an **energy lance granting +1 square reach**; distinguish weapon reach from droid chassis reach. The R2-R p.139 has wheeled and walking modes and multiple storage/recording items; retain individual equipment capacities. Advanced integrated weapon and sensor packages in other droids do not grant additional free attacks. Reuse physical appendage, location, weapon, equipment, and movement authority rather than extra droid-only ledgers.

### SCHEMA-THREATS-07 — NPC Force Points and dark-side score do not imply unrestricted droid Force ability

Sith Elite Warbot p.159 has printed **Force 2, Dark Side Score 10** and a Sith sword that interacts with dark-side mechanics; Guri p.153 and other high-level droids may have Force Points in their NPC statblocks. Preserve printed numbers and actual abilities. These facts alone do not qualify a droid for Force-sensitive feat/Force power use or overwrite the special Shard exception. The Sith sword p.159 is a **weapon**, not a droid statblock and not proof that a machine itself wields the Force; don't invent new Force eligibility by class/Force Point inference.

### SCHEMA-THREATS-08 — Preserving printed hero permissions and combat representation

The Chapter III audit finds **29** distinct published statblocks: **27 ordinary droid Actor profiles**, one generic replica droid example (p.152), and named Guri (p.153). **11** have explicit "can be played as droid heroes" prose, **13** explicit "can't", **5** no explicit statement in the matching model prose/statblock. `NOT_STATED` is not `PROHIBITED` or `ALLOWED`, and a class-level statblock does not resolve hero eligibility. The chapter's introductory rule at printed p.133 says a player starting from a published model normally begins with at most **three nonheroic levels or one heroic level**, not necessarily the model's published class count. Store printed model/NPC level and creation-package level separately. Hero eligibility should be decided from exact source text, owner house rule and existing progression gate, not inferred by arbitrary class names.

### Threats acceptance fixtures (PROPOSED, NOT RUN)

1. All 29 listed identities have exact printed-page + TXT-line provenance; generic Replica Droid and Guri are separate, with 27 normal droid models, no vehicle and no squad.
2. Replica selection uses the designated **Droid PC** path while exposing the p.153 species-formatted trait selection; the ordinary biological Species builder does not assign independent organic traits.
3. Replica bonus stats apply once (`+2 STR/+2 DEX/-2 CHA/No CON`); neither player Guri class levels nor published example Scout 4 auto-transfer.
4. Medium replica speed 6 and Small speed 4; Small +1 Reflex/+5 Stealth/0.75 carrying scale; no second duplicate size math.
5. Select two of six allowed p.153 systems, including size-check for internal storage; nothing is charged twice, and equipment modification slots are not consumed as phantom physical arm slots.
6. Replica has ordinary droid immunities but its specific no-maintenance rule wins; a Shard occupying a droid body retains its DIFFERENT JATM Constitution, Force, and ion semantics.
7. If Deception not trained, replica receives no Skill Focus (Deception); when trained it is granted exactly once by traced bonus-feat provenance.
8. Replica languages are Basic plus copied species native language; other organic traits are not inherited automatically.
9. Using Guri as named NPC retains separate published CL10 stats; starting replica player does not spawn at level 10.
10. TO-D and GH-7 do not bypass non-fourth-degree behavioral programming simply by carrying a weapon; published GH-7 patient-defense/stun-only rule is preserved.
11. Buzz droid launcher event uses the trusted vehicle-weapon route; three independent buzz droid tokens appear only after authorized successful fire and obey attachment/reaction mechanics.
12. Separate B3 and B3-A source identities; heuristic processor and battery on B3-A do not migrate into B3 pure stock.
13. A 3PX fake-off state or WSB-15 processor disguise does not mutate the physical model identity into the appearance being impersonated.
14. The IG lancer's +1-square reach applies to weapon execution rather than actor reach.
15. Sith Elite Warbot retains published dark-side score and Force Points but does not automatically qualify for Force power training.
16. Explicit allowed (11), prohibited (13), not stated (5) hero classifications and the p.133 starter-level cap must not conflate character model, named NPC and starting PC.

**Certification boundary:** Publication source identities/pages and replica p.153 rules visually reviewed. No comprehensive field/weapon-mount certification, character builder implementation, Foundry V13 E2E runtime test or GitHub change is claimed.


---

# Addendum v0.15 — The Unknown Regions droid census and 14-book sourcebook-scope closeout (2026-10-29)

**Primary source:** *The Unknown Regions*, printed pp.43–47 (Chapter II: Equipment — Droids), checked against `Unknown Regions_djvu.txt` and `SW_Saga_The_Unknown_Regions.pdf` physical pp.44–48. Six standard character-format statblocks, six corresponding protocol-format representations, zero qualifying droid vehicles or squads. Source identity and page review is complete for this pass; field-by-field mechanical certification is NOT complete. **Published rule/sourcebook scope: 14/14 identified books surveyed (234 publication entries).**

## SCHEMA-UNKNOWN-01 — Publication model versus protocol re-expression

The book expressly prints each exploration droid with both a normal character statblock and an alternate *Scavenger's Guide to Droids* protocol-format view for explorer heroes. Store `publicationListingId` independently of `alternatePresentations[]` and `protocolActions[]`, with precise action timing, source page, and provenance. Protocol display must not create a second stock model, another set of installed components, independent Class/CL, or automatically grant alternate actions to an ordinary full NPC actor without an authorized context.

## SCHEMA-UNKNOWN-02 — Conditional support, external targeting and sensor authority

The **AS23 Aerial Survey Droid** (p.43) Spotter ability functions while flying and provides a defined cover/concealment interaction for attacks against targets it has spotted. Associate a qualifying observation and support recipient/target relation; apply the modifier at one authoritative combat rule stage, not as a global enemy-defense mutation or a permanent weapon enhancement. **DSH-3 Probe Droid** (p.44) can take 10 on Stealth under threat via the model's Easily Hidden special ability; do not grant universal stealth Take 10 to all droids.

## SCHEMA-UNKNOWN-03 — Physical anatomy, sensor selection and model-specific scope

**F1** (pp.44–45) has extra walking legs, a physically separate claw jaw and installed motion sensors. Its sensor-driven reroll and ability to assist its master's Perception require discrete predicates/one-time application. **Wanderer** (pp.46–47) has eight locomotion legs, **four tool appendages**, **one claw**, and a distinct 360-degree photoreceptor; preserves Reflex Dexterity bonus under printed circumstances and cannot be flanked. Do not infer 8 attacks, 8 hand slots, or total surprise immunity. **WED-20** (p.47) has two claw appendages and five tools; scientist functions, not multiweapon privileges. These reuse the existing Species/Anatomy/Equipment capability evaluation.

## SCHEMA-UNKNOWN-04 — Independent cargo capacities and bounded hovering

**MULE** (pp.45–46) has **10 kg internal storage** plus **40 kg external cargo**, not an interchangeable or instantly unlimited capacity pool. Hover speed 4; altitude limit one meter. Model internal equipment storage, external carriage and locomotion constraints as separate typed facts. Do not equate cargo mass with vehicle payload or generic hardpoint/upgrade slots.

## SCHEMA-UNKNOWN-05 — Unresolved same-source mechanical numbers must remain separate

MULE's Skills line prints **Mechanics +9**, but Self-Diagnostic states **Mechanics +11** to identify required repairs and grant its master a +4 check bonus. Wanderer's main Skills line prints **Perception +6**, while protocol Notice Targets uses **Perception +12**. These must remain separately sourced claims with `SOURCE_CONFLICT_RETAIN_BOTH`/`CONTEXT_NOT_CERTIFIED` until adjudicated. Avoid overwriting the printed NPC skill with a protocol action value or silently fixing arithmetic. The +4 repair assistance and Wanderer's immunity to flanking are *model-specific* mechanics, not generic droid traits.

## SCHEMA-UNKNOWN-06 — Explicit player permission and published-family links

Models explicitly **allowed** as droid heroes: F1, MULE, WED-20. Explicitly **prohibited**: AS23, DSH-3, Wanderer. The **DSH-3** is compared to **DRK-1** from *Threats of the Galaxy* but excludes its stealth shell/armament. WED-20 is discussed as an evolution from WED-15, but changes role and appendage configuration. Keep crossbook lineage as a proposal rather than silently sharing factory chassis or equipment baselines. The previous DROID-ARCH-002 Shard/Replica Droid-PC deferral remains in force and does not change the Unknown Regions model count.

## SCHEMA-UNKNOWN-07 — Original 17-slot plan is not 17 verified published sourcebooks

External published-reference bibliographies (Saga Edition Wiki `https://swse.fandom.com/wiki/Reference_Books`; Omnibus `https://swse-omnibus.fandom.com/wiki/Category:SWSE_Books`; Wookieepedia `https://starwars.fandom.com/wiki/Saga_Edition`) identify **14 official WotC printed Saga Edition rules/sourcebooks**, matching all 14 uploaded sourcebook text/PDF pairs. The original project requested 17 book slots but did not name the other three. Preserve `requestedBookCount=17`, `officialPublishedRulebooksInVerifiedScope=14`, and three **unidentified scope placeholders** with `listingCount=null`, not bogus sourcebooks with zero droids. A future explicit expansion to *Dawn of Defiance* downloadable adventures, official web supplements, Jedi Counseling or the GM screen is a **different provenance/classification scope** requiring its own source inventory and certification before adding to the same denominator.

### Unknown Regions proposed acceptance fixtures (NOT IMPLEMENTED)

1. Six initial model entries, six protocol views, no extra IDs for alternate actions and no other droid statblock in the 226-page whole-book scan.
2. AS23 Spotter only resolves while the droid is flying and has actually spotted the target, respecting approved cover/concealment authority and source conditions.
3. AS23 protocol Spotter action and normal statblock Spotter ability do not double-apply one benefit.
4. DSH-3 under threat is explicitly permitted to take 10 Stealth through Easily Hidden; unqualified droids are unaffected.
5. F1 extra legs do not create additional hands, attacks or item slots. Sensor reroll and master reroll are source-scoped.
6. MULE maintains internal 10 kg and external 40 kg independently, and cannot exceed hover altitude one meter via generic droid flight handling.
7. MULE main Skills +9 and Self-Diagnostic +11 both preserved under distinct source locations; +4 assist applies once and to the intended repair check.
8. Wanderer eight legs/four tools/one claw, 360-degree Reflex protection and cannot-be-flanked predicate are individually testable.
9. Wanderer main Perception +6 and protocol Notice Targets +12 both preserved, with no invented source-level reconciliation.
10. WED-20 two claws/five tools and science-related +2 Knowledge bonus do not grant extra standard actions or unearned stacking with protocol-assist action.
11. Hero status is allowed for three and prohibited for three models, without inferring eligibility from class/degree alone.
12. Published DSH-3 and DRK-1 and WED-20 and WED-15 remain publication-distinct pending model-family reconciliation; no factory system copied without source.
13. All 14 identified printed books contribute exactly 234 unique publication listing IDs; three original unnamed placeholders stay `null` and do not become invented books or zero droid populations.
14. The system reuses previously audited combat, vehicle, equipment, V2 modification, Actor/TransactionEngine authorities; this research does not enable a new runtime droid action, weapon mount or UI choice without independent implementation/certification.

**Certification:** Initial publication-identity/source-location review complete across 14 identified sourcebooks. Mechanical-field, component legality, crossbook canonical model reconciliation, source-to-actor hydration, and Foundry V13 E2E tests remain outstanding. No repository writes are authorized or made.

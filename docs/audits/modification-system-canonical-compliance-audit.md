# Modification System Architecture and Canonical Compliance Audit

**Status:** audit only. Nothing in this document is an implementation instruction. No runtime, pack, catalog, data or test file was changed to produce it.
**Repository baseline:** `origin/main` `24ef7ec9e6b9d5d0c287546db60d10e30adaaa17`, plus the open draft PR #1033 (Phase 1a resolver, not merged).
**Rules authority used:** `SWSE_Modification_Rolling_Authority_v1.5.json` (186 definitions, 57 procedures) and the v1.3-and-earlier narrative supplied with it. A v1.5 Markdown companion was supplied after drafting and was not re-read for this document. The v1.3 JSON was also attached but is superseded by v1.5 and was not read separately. No v1.5 Markdown file was received; the v1.5 summary text in the message was used.

## 0. Method, authority and limits

**Reliance on the v1.5 registry (explicit).** This audit's registry comparison used `SWSE_Modification_Rolling_Authority_v1.5.json` (186 definitions, 57 procedures). Two kinds of statement appear below and must not be confused:

- **Repository facts** (what a file, catalog, pack or service contains, which tests exist, how many entries a catalog holds) were verified by reading the code and data in this repository.
- **Published-rule statements** (what a sourcebook prints, page numbers, certification labels) are the registry's claims. I did not re-verify them against the PDFs, and they are **not** certified rules because this document repeats them. Where the registry itself marks something uncertified or `PENDING_RULES_TEXT`, this audit treats it as uncertified. A comparison "repository versus registry" shows a *discrepancy to review*, not an approved correction.


1. **Registry is taken as given.** I did not re-verify any registry rule against a PDF. Where I compared the repository to a rule, the rule is quoted from the registry (printed page as the registry states it). Where I also searched `reference/sourcebooks/*.txt` it is OCR only and is labelled so.
2. **Registry status vocabulary is binding.** 128 definitions are `EFFECTS_CERTIFIED` (source rule verified, **runtime not mapped**), 58 are `PENDING_RULES_TEXT` (Scum and Villainy table rows: cost, slots, availability verified from the table; detail text not certified). **0 are runtime-certified.** Source-verified does not mean implementation-ready, so every "expected behavior" below is a *published-rule statement for review*, not permission to code.
3. **Verification done here is static.** I read code and compared data files programmatically. I ran no Foundry world and traced no live save file. Anything about owned-item state in a real world is unknown.
4. **Scope:** weapon, armor and ordinary equipment only. Droid, vehicle, starship and cybernetic systems are noted only where a shared file contains them.
5. **Stock-item data defects** (Antidote Synthesizer, Hypoinjector Wristband, Power Pack Bomb) are listed because the registry lists them, but they are not modification-system defects.

## 1. Executive summary

- **The repository has no single modification pipeline; it has at least five.** The standard path (`CustomizationWorkflow` → `InstallRemoveEngine`), the Workbench, `UpgradeService`, the Tech Specialist service, and the lightsaber construction/alchemy services each decide eligibility, cost, storage and effects separately. Slot arithmetic is spread over at least six places (Phase 0 audit, merged).
- **Source-to-effect coverage is thin and in places wrong.** Of the 186 registry definitions, the repository can be matched to a small part. The effect map in `EffectResolver` assigns numbers to KOTOR accessories that contradict the registry's certified KOTOR text (six weapon accessories and two armor accessories, section 5.C).
- **Data defects are confirmed and traceable.** I confirmed 14 registry-listed content defects against the repository (section 5.B), plus eight Scum catalog/table differences and eight Scum rows with no catalog entry at all (section 5.A).
- **Out-of-scope material is shipped inside in-scope services.** `tech-specialist-modification-service.js` carries 39 traits: 9 certified in-scope traits, 14 in-scope "superior tier" traits with no registry definition, one source-unverified device slot trait, and 15 droid and vehicle traits that belong to other workstreams.
- **Templates are metadata only, and there are three template catalogs** (30 definitions in `data/gear-templates.json` with no runtime consumer, 7 in `scripts/data/gear-templates.js` used by the Workbench, 7 in `upgrade-catalog.js` used by `TemplateEngine`).
- **Test coverage of the modification services is near zero.** No test imports `StructuralChangeEngine`, `TemplateEngine`, `UpgradeSlotEngine`, `EffectResolver`, `GearTemplatesEngine`, `SafetyEngine`, `ForceAlchemyMechanicsService` or `LightsaberConstructionEngine`. `InstallRemoveEngine`, `UpgradeEligibilityEngine`, `CustomizationWorkflow` and `UpgradeService` appear only in the weapon B3 compatibility test.
- **Readiness:** nothing in the repository is ready for effect implementation. What can proceed safely now is read-only: the slot authority (Phase 1a, in review), and planning for upstream data corrections. Section 7 gives the matrix and section 8 the order.

## 2. Registry profile (v1.5)

| Measure | Value |
|---|---|
| Definitions / procedures | 186 / 57 |
| `EFFECTS_CERTIFIED` / `PENDING_RULES_TEXT` | 128 / 58 |
| Runtime-certified | 0 |
| Excluded from scope | 1 (Droidification) |
| Candidate host variants | 231 (weapon 120, armor 73, equipment 38) |
| Scum table rows | 58 (Table 2-3 universal 16, 2-4 weapon 15, 2-5 armor 27) |

By source family: lightsaber crystal 34, armor upgrade 29, published template 26, weapon upgrade 21, universal upgrade 18, other item modification 11, lightsaber accessory 10, Tech Specialist 9, Biotech Specialist 9, Heirloom 4, Sith Alchemy Specialist armor 4 and weapon 3, and 1 each for special crafting, Sith alchemy, armor template, purchase-quality talent, improvised explosive, temporary melee alchemy, created equipment and weapon accessory.

Registry facts that constrain any implementation: `singleSlotAuthority` is `PROPOSED_ModificationSlotAuthority_NOT_IMPLEMENTED`; every typed definition carries `slotPoolId`, `consumerStatus: NOT_MAPPED`, and `implementation.{producer,storage,consumer,removal}` of `NOT_MAPPED` unless stated; the 58 Scum rows list `blockers: RULES_TEXT_NOT_CERTIFIED, DOMAIN_APPLICABILITY_NOT_CERTIFIED`.

## 3. Repository map

Classes follow the project rules: **A** active authority, **B** deprecated or divergent but referenced, **C** unreferenced, **D** compatibility wrapper, **E** macro or global legacy utility, **F** runtime-risk.

| System | Files | Role | Class |
|---|---|---|---|
| Standard upgrade catalog | `scripts/engine/customization/upgrade-catalog.js` (`UPGRADE_CATALOG` 71 entries, `TEMPLATE_CATALOG` 7) | Keys, slot cost, cost, restriction, `appliesTo` for the standard path | A (content partly wrong) |
| Published-upgrade JSON | `data/upgrades/{weapon,armor,universal}-upgrades.json` (23 / 29 / 19 records) | Mirrors the Scum tables; no runtime import found (only `tools/census-item-ssot-phase-0.mjs` and the weapon verification tool read it) | C at runtime, evidence only |
| Workbench catalogs | `scripts/data/{blaster,melee,armor}-upgrades.js`, `gear-mods.js` (28 entries, zero keys shared with `UPGRADE_CATALOG`) | Workbench-only upgrade cards | B |
| Workbench | `scripts/apps/customization/item-customization-workbench.js` (3,684 lines) | UI, own slot math, own catalogs, commits through `TransactionEngine` with legacy flag mirrors | A (UI), B (logic) |
| Install/remove | `install-remove-engine.js`, `customization-workflow.js`, `upgrade-eligibility-engine.js`, `upgrade-slot-engine.js`, `safety-engine.js`, `structural-change-engine.js`, `template-engine.js`, `effect-resolver.js` | Standard orchestration | A |
| Upgrade service | `scripts/engine/upgrades/UpgradeService.js`, `UpgradeCommands.js`, `scripts/apps/upgrade-app.js` | Third install shape; droid/vehicle branches inside | B (item path), out of scope (droid/vehicle) |
| Template engines | `scripts/apps/gear-templates-engine.js` + `scripts/data/gear-templates.js` (7); `template-engine.js` + `TEMPLATE_CATALOG` (7); `data/gear-templates.json` (30) | Three unreconciled catalogs | B |
| Tech Specialist | `tech-specialist-modification-service.js` (764 lines, 39 traits) | Legality, signature device, direct stat writes, flags | A, F |
| Sith/Force Alchemy | `scripts/apps/force-alchemy/*` (context, data, mechanics, state, workbench) | Ritual state, item flags, armor transformation | A, F (not traced in depth) |
| Lightsaber | `scripts/engine/crafting/lightsaber-construction-engine.js`, `scripts/data/lightsaber-crystals-map.js` (28), `packs/lightsaber-crystals.db` (28), `packs/lightsaber-accessories.db` (10), `phase-3-advanced-crystal-system.js` | Chassis, one crystal, accessory array, copied `system.modifiers` | A, F |
| Weapon runtime and combat | `scripts/items/weapon-runtime/*`, `scripts/engine/combat/combat-stat-rules.js`, `combat-roll-math.js`, `weapons-engine.js` | Canonical weapon authority and attack/damage math | A (protected) |
| Slot authority (new) | `modification-slot-authority.js` (PR #1033, unmerged) | Read-only capacity resolver | Proposed |

## 4. Producer → storage → consumer → removal trace

"No test" means no file under `tests/` imports the module by name.

| Family | Producer | Storage | Consumer found | Removal | Tests |
|---|---|---|---|---|---|
| Standard upgrade | `InstallRemoveEngine.applyInstall` | `flags.foundryvtt-swse.customization.installedUpgrades`, `system.installedUpgrades` (summary), plus `EffectResolver` stat keys written directly | `system.attackBonus`, `system.flatDamageBonus`, `system.critRange` are read in combat. Most other keys have no reader (Phase 0 audit §5) | Entry removed; **stat keys not reversed** (`removeResolvedEffects` is a no-op) | B3 compatibility test only |
| Standard upgrade (service) | `UpgradeService.applyUpgrade` | `system.installedUpgrades` only | Not seen by `UpgradeSlotEngine` once the canonical flag exists | Index-based removal | Light |
| Workbench | `_applyCurrentItem` | canonical flag **and** `flags.swse.*` mirrors | Same gaps; no `EffectResolver` effects applied | Workbench rewrites the whole state | UI contract tests only |
| Structural (size/strip) | `StructuralChangeEngine` | canonical `structural` flag, `system.upgradeSlots`, `system.armorType` | Slot engines; `armorType` | Not reversible by design | None |
| Template | `TemplateEngine.applyTemplate` / `GearTemplatesEngine.applyTemplate` | `appliedTemplates` (canonical flag or `flags.swse.appliedTemplates`), `system.gearTemplate(Secondary)`, `system.restriction` | **No template effect is consumed.** Template effects are "metadata only pending" in the catalog | `GearTemplatesEngine.removeTemplate` only | None |
| Tech Specialist | `TechSpecialistModificationService` | `flags.swse.techSpecialist.{traits,activeTraitId,signatureDevice}` plus direct stat writes (attack, damage, Max Dex, defenses, `system.upgradeSlots`) | Direct stat keys read by combat/armor code | Inverse delta writes on toggle | One UI test mentions the service |
| Lightsaber | `LightsaberConstructionEngine` | `flags.*.lightsaberConfig`, `system.modifiers` copy, `system.damageType` | `combat-stat-rules.js` (attunement and crystal records, with crystal-identity guard) | Re-run construction; no per-component uninstall | None (one accessory-attack provenance test) |
| Alchemy | `ForceAlchemyMechanicsService` | `flags.*.alchemy`, armor stat writes, actor effects for temporary rites | Not traced | Not traced | None |

Findings that follow directly:

- **There is no effective-profile resolver for any family.** Effects are baked into Item fields at install time.
- **Mirrored state is common.** The same fact (upgrade, template, structural flag) lives in two to four places, and the recovery adapter reads the legacy copy only when the canonical flag is absent (Phase 0 §4.2).
- **The combat runtime is already the consumer of record** for critical range, multiplier and post-multiplier additions (`getEffectiveCritRange`, `resolveCriticalMultiplier`, `criticalEffects`). A weapon aggregator should feed those, not add a fourth path.

## 5. Discrepancy ledger

Legend for **Nature:** DATA (content differs from the published rule), RULE (code implements a different mechanic), ARCH (structure/duplication), MISSING (published item absent), UNRESOLVED (source or interpretation open), SCOPE (out-of-scope material in an in-scope file). **Status:** SAFE (low risk, producer known), BLOCKED (needs a decision, source work or runtime proof).

### 5.A Scum and Villainy catalog versus the verified table rows

Compared `UPGRADE_CATALOG` (and `data/upgrades/*.json`) to the 58 registry rows by cost, slots, availability and candidate host. Table cost, slots and availability are table-verified; detail text is not, so host differences are flags, not defects.

| ID | Identity | Repository | Table (registry) | Nature | Status |
|---|---|---|---|---|---|
| A1 | Overload Switch (S&V Table 2-4) | cost 250 (`upgrade-catalog.js`, `weapon-upgrades.json`) | 500 cr | DATA | SAFE after producer located |
| A2 | Retractable Stock | slot 0 | `0/1 conditional` (rule text needed) | UNRESOLVED | BLOCKED on Scum detail pass |
| A3 | Bayonet Ring | `cost: 0` with `costFormula: '100% weapon cost'` | cost is 100% of host cost | ARCH (a percent cost stored as 0; any consumer reading `cost` charges nothing) | BLOCKED on cost model |
| A4 | Neutronium Reinforcement | `appliesTo` weapon, blaster, armor, gear | candidate host: weapon only | UNRESOLVED (host list is a registry candidate, not a certified rule) | BLOCKED |
| A5 | Cheater, Dual Gear | `appliesTo` includes weapon, blaster, armor | candidate host: equipment only | UNRESOLVED | BLOCKED |
| A6 | Environmental Sealing, Secret Compartment, Storage Capacity | `appliesTo` armor, gear (no weapon) | candidates include weapon | UNRESOLVED | BLOCKED |
| A7 | Electrograpple Handle, Memory Upgrade, Memory Upgrade (Advanced), Miniaturized, Recognition System, Silverplate, Spring Loaded, Missile Load | **Absent from `UPGRADE_CATALOG`**; Missile Load, Droidification and the other listed rows exist only in `data/upgrades/*.json` | present, with slots and cost | MISSING (catalog gap; Droidification is excluded scope) | BLOCKED on detail text |
| A8 | Shield Generator SR 5/10, Reflec Shadowskin, Repulsorlift, Weapon Mount, Integrated Equipment rows | Present under different names or keys | present | ARCH (name/key mapping needed; no duplication found) | SAFE (mapping only) |
| A9 | Improved Energy Cell (KOTOR p. 75, Table 5-6; reviewer-certified) | 1 slot | 2 slots | DATA | SAFE after approval (separate source-backed change) |

Also: the 58 rows' effects are all `PENDING_RULES_TEXT`, so none of the `EffectResolver` numbers for **Scum-only** upgrades (Bipod, scopes, Rangefinder, Slinker, Ion Charger, Pulse Charger, Overload Switch, Rapid Recycler, Sniper Switch, Double Trigger, armor items) can be verified or refuted. They are unsourced until the detail pass.

### 5.B Registry-listed content defects, confirmed in the repository

| ID | Identity / source | Repository (confirmed) | Published | Nature | Producer to fix | Status |
|---|---|---|---|---|---|---|
| B1 | Componentization Basic/Deluxe (GoI p. 68) | `cost: 0`, vague text in `upgrade-catalog.js` and `universal-upgrades.json`; `appliesTo` includes **armor** (the registry says armor needs an explicit host review) | slots 1/2; **price not printed**; 2/4 pieces, 1/2 steps smaller, 1/2 full-round actions; DC 30 Perception / DC 25 Knowledge (technology) | DATA | catalog + JSON; **zero is not "free"** | BLOCKED on a policy for "price unstated" |
| B2 | Flash Suppressor/Silencer (GoI p. 66, Table 3-2) | `appliesTo: ['blaster']`, `requires: ['ranged']`, slot 0 (`upgrade-catalog.js`); `weapon-upgrades.json` 400 cr slot 0 | 400 cr accessory; Small-or-larger **slugthrowers** only; observers −10 Perception; maximum range −2 increments; slot cost unprinted | RULE + DATA | catalog | BLOCKED (slot cost unprinted; slugthrower host test needs a canonical weapon fact) |
| B3 | Holo Converter (GoI p. 66) | `packs/equipment-comlinks.db#comms-holo-converter`: "converts a compatible transmission into holographic output" | attaches to a holoprojector; up to 10 preset personae; remote Deception +5 equipment | DATA (wrong mechanics) | `tools/fix-equipment-data.js` (entry at line 157) and `data/store/equipment-store-descriptions.json` | SAFE once producer confirmed |
| B4 | Halo Lamp (CW p. 66) | `detect-halo-lamp` in `equipment-security.db` and `equipment.db`: "15-meter radius" | bright light, 3 squares | DATA | `tools/fix-equipment-data.js` | SAFE once producer confirmed |
| B5 | Manual Trigger (TFU p. 100-101) | `explosive-manual-trigger` in both packs: "Range: 100 meters" | within 30 squares | DATA | `tools/fix-equipment-data.js` | SAFE once producer confirmed |
| B6 | Force-Activated accessory (JATM p. 60) | DC 10 | DC 5, swift action | DATA | pack source | SAFE once producer confirmed |
| B7 | Trapped Grip (JATM p. 60) | 2d6 | 1d6 energy, on unsafe activation and at turn start | DATA | pack source | SAFE once producer confirmed |
| B8 | Fiber Cord (JATM p. 60) | "+2 bonus against Disarm attempts" | disarmer cannot catch or Force-call the weapon; dropped but hangs from cord | DATA (invented bonus) | pack source | SAFE once producer confirmed |
| B9 | Ankarres Sapphire (JATM p. 59) | "+2 to healing received" | Dark Side Score 0; +5 Force bonus on Treat Injury / vital transfer checks | DATA | pack source | SAFE once producer confirmed |
| B10 | 28 crystals, 10 accessories (JATM) | all `system.upgradeSlots = 1` | focusing-crystal and accessory allowance, **not** a generic slot cost | ARCH | data model | BLOCKED (meaning of the field) |
| B11 | Stygian-Triprismatic Polymer (Rebellion p. 126) | `data/gear-templates.json`: "+1 Reflex equipment bonus", `effects.reflexBonus: 1` | armor bonus +1; +2 equipment Stealth vs sensors; +20% price | DATA + typing | catalog JSON | BLOCKED on typed armor-bonus review |
| B12 | Ion Shielding (GAW p. 50) | `ion_shielding` `appliesTo` weapon, blaster, armor, gear | standard cybernetic prosthesis only | RULE (host too broad) | catalog | BLOCKED (cybernetic host is outside these three schemas) |
| B13 | Antidote Synthesizer, Hypoinjector Wristband (Unknown Regions p. 40-41) | "DC 20 Treat Injury"; "3 doses, swift action" | sample-fed, 1d6 rounds → 1d4 doses, +2 Treat Injury; 8 doses, bioscanner, refill rules | DATA (stock items, not modifications) | `tools/fix-equipment-data.js` | out of this audit's scope |
| B14 | Power Pack Bomb (Rebellion p. 107) | `cost 0`, damage "Varies" | 2-5 packs, 2 dice per pack, DC 15/10 assembly, 1d6-round fuse | DATA (stock item) | `tools/fix-equipment-data.js` | out of this audit's scope |

The pack builder and the store-description JSON (`tools/fix-equipment-data.js`, `data/store/equipment-store-descriptions.json`) are the upstream sources; the `.db` files are generated and must not be hand-edited.

### 5.C Effect mapping contradicts the registry's certified text

`EffectResolver` assigns these install-time mutations. Registry entries are KOTOR Table 5-6 (p. 75-76), `EFFECTS_CERTIFIED`.

| ID | Repository key | Repository effect | Certified effect | Nature |
|---|---|---|---|---|
| C1 | `hair_trigger` | `system.critRange` −1 (threat range) | once per encounter, reroll damage when attacking with Rapid Shot, keep better | RULE |
| C2 | `beam_splitter` | `system.weaponDamageBonus` +1 (no reader) | once per encounter, Power Blast trades 1 attack for 2 damage per point | RULE |
| C3 | `enhanced_energy_projector` | `system.weaponDamageBonus` +1 (no reader) | once per encounter, reroll a natural 1 on an attack | RULE |
| C4 | `improved_energy_cell` | `system.ammo` +5 | doubles shots per power pack; raises an existing Tech Specialist Improved Damage bonus from +2 to +3 (does not stack) | RULE |
| C5 | `tremor_cell` | `system.damageType = 'tremor'` | adds a swift-action stun setting dealing normal weapon damage as stun | RULE |
| C6 | `durasteel_bonding` | `system.durabilityBonus` +2 (no reader) | weapon object DR +5; +1 weapon die after critical multiplication | RULE |
| C7 | `armor_reinforcement` | Fortitude bonus key +1 | wearer DR 2 versus piercing | RULE |
| C8 | `mesh_underlay` | Fortitude bonus key +2 | +5 equipment bonus to damage threshold against stun | RULE |
| C9 | `shield_generator_sr5/sr10` | **overwrites** `system.shieldRating` with 5/10 | (Scum detail pending) | ARCH: rewrites a base value; current SR and max SR must stay distinct (v1.2 §4) |
| C10 | `overload_switch` | `system.damageBonus` +1 | (Scum detail pending) | ARCH: key also read as the damage *ability* selector (Phase 0 §5.4) |

Additional gating facts: these effects are installed by `InstallRemoveEngine` only, are not reversed on removal, and (C2, C3, C6) write keys that nothing reads, so today they are display-only. They must be treated as unsourced placeholders, not as partially correct implementations.

### 5.D Architecture and scope

| ID | Finding | Evidence | Nature | Status |
|---|---|---|---|---|
| D1 | Slot arithmetic in ≥ 6 places, contradictory (Phase 0 C1-C11) | merged audit | ARCH | Phase 1a in review |
| D2 | Three template catalogs; none applies effects; Workbench limit comes from a GM setting `maxTemplatesPerItem` (default 1) | `gear-templates.json` (30), `scripts/data/gear-templates.js` (7), `TEMPLATE_CATALOG` (7) | ARCH | BLOCKED on KOTOR stacking rule review (Prototype, Quick Draw and Cortosis/Phrik are published exceptions) |
| D3 | Registry has 26 published templates plus Biotech/Antiquated/Refitted; repository catalogs hold 7 (workbench and engine) | counts above | MISSING | BLOCKED |
| D4 | Tech Specialist service holds 14 in-scope "superior tier" traits (armor 6, device 4, weapon 4) with **no registry definition**; the registry states Superior Tech is not certified | `tech-specialist-modification-service.js` lines 28-40 | UNRESOLVED | BLOCKED on source |
| D5 | Service holds 15 droid and vehicle traits | same file | SCOPE | Leave for the droid/vehicle refactors; no change here |
| D6 | `tech_device_upgrade_slot` not in the printed table (Starships p. 21); writes `system.upgradeSlots` | service line 19, 372 | UNRESOLVED | BLOCKED |
| D7 | Selective Fire eligibility text omits the later reprint's no burst/splash restriction; the service has no burst/splash check | service line 31; no `burst`/`splash` string in the file | RULE | BLOCKED on the canonical weapon fact for "burst/splash radius weapon" |
| D8 | Workbench never calls `UpgradeEligibilityEngine`; `ActorEngine` and `TransactionEngine` have no slot or eligibility checks | Phase 0 §6.1 | ARCH | Phase 2 |
| D9 | `UpgradeService.getSlotUsage` reads fields that do not exist; hard-coded 10-slot cap in `SafetyEngine` | Phase 0 C4, C5 | ARCH | Phase 2 |
| D10 | Powered-armor status falls back to a name regex; no shipped armor sets `isPoweredArmor` | `item-profile-resolver.js:170-175`; pack census | ARCH | BLOCKED on classification source |
| D11 | Registry items the repository does not know: five GAW armor chassis with printed free-upgrade counts and factory-installed upgrades (Barabel Microbe 2, Camo Scout 1 + Shadowskin, Katarn 3 + Vacuum Seal, Marine 1 + Aquatic + Vacuum Seal, Stalker 3); no data field carries them | `packs/armor*.db` have no `upgradeSlots` or installed list | MISSING | BLOCKED on Scum name correspondence |
| D12 | Repository modification items with no registry definition: **Computerized Interface Scope** (Rebellion Era Campaign Guide, OCR located: a 2,000 credit, 0.5 kg weapon-mounted scope; mechanically a targeting scope that does not stack with one) and **Night Vision Device** (no source found in the supplied OCR) | `upgrade-catalog.js:42,75`, `effect-resolver.js:203,399` | MISSING (registry) / UNRESOLVED (source) | BLOCKED; slot cost 0 in the repository is not printed anywhere I could locate |
| D13 | `data/gear-templates.json` has no runtime consumer | grep | ARCH | Evidence file only |
| D14 | Registry holds 34 lightsaber crystal identities; the pack and `lightsaber-crystals-map.js` hold 28. The six KOTOR variant names (Luxum, Eralam, Upari, Daminia, Nextor, Sapith) have no key in the map | `packs/lightsaber-crystals.db` (28, all `upgradeSlots` 1), registry crosswalk | MISSING | BLOCKED on crystal identity/producer decision |

## 6. Cross-cutting rules the registry makes binding

These are repeated because several repository behaviors conflict with them:

1. **Unknown is not zero.** Componentization price, Flash Suppressor slot cost, Holo Converter slot cost, Halo Lamp slot cost, Infuse Weapon, Manual Trigger and the GAW Stun Cloak variants are all "not specified". The repository's `cost: 0` / `slotCost: 0` for Componentization and Flash Suppressor, and `slotCost: 0` for Computerized Interface Scope, are unprinted values presented as facts.
2. **Capacity concepts are separate pools:** general upgrade slots; focusing crystal; lightsaber construction accessory allowance; Tech Specialist benefit count; Sith Alchemy benefit count; accessory count (KOTOR: most equipment can have one accessory); templates. The repository collapses several of them into `system.upgradeSlots` or arrays.
3. **Source families must not be merged:** Tech Specialist, Biotech Specialist, Superior Tech, Heirloom Extra Modification and Prototype's second trait are different authorities.
4. **Object HP/DR is not actor HP/DR** (Excellent Kit, Durasteel Bonding, Improved Durability, template object interactions). The repository has no object-damage authority; those effects stay blocked.
5. **Critical channels stay separate** (range, multiplier, post-multiplier addition); Improved Damage is pre-multiplier (`(D + 2) × 2`).

## 7. Implementation readiness assessment

| Area | Source status | Repository status | Ready for | Blocker |
|---|---|---|---|---|
| Slot capacity (read-only) | Baselines reviewer-certified; Scum detail pending | Phase 1a resolver in review | Review of PR #1033 | Reviewer approval |
| Slot consumer convergence | n/a | Six independent computations, no late validation | Nothing yet | Phase 1a merge; decisions on legacy `system.upgradeSlots`, Workbench catalog mapping |
| Scum upgrades (58) | Table verified, detail **not** | Catalog partly present, partly differing | Cost/slot/availability corrections only for A1, A9 | Scum detail pass; costs for "unstated" rows |
| Conventional upgrade effects | 58 rows pending | Unsourced placeholder numbers | Nothing | Scum detail pass |
| KOTOR accessories, templates, crystals | Effects certified | Contradicted (5.C) or metadata only | Nothing | Consumers, object-damage authority |
| Tech Specialist (9 traits) | Certified | Present, direct writes, no tests | Nothing | No effective-profile resolver; direct-write reconciliation |
| Superior Tech, device slot | Not certified | Shipped | Nothing | Source |
| Lightsaber construction | Core, JATM certified | Accessory count unenforced, crystal `+1` guard present | Nothing | Accessory allowance rule (one accessory; Tech Specialist exception) is flagged ambiguous by the registry |
| Sith/Force Alchemy | Certified rules | Not traced | Nothing | Trace needed |
| Biotech Specialist, Heirloom, Antiquated/Refitted | Certified | Not present | Nothing | New catalogs |
| Content corrections (B3-B9) | Certified | Confirmed wrong | A producer-side correction PR | Producer confirmation, review |
| Foundry v13 smoke | none | none | Nothing | Not run |

## 8. Recommended phases (small, independently reviewable)

Each phase is a separate PR with exact-head CI and a stop for review. None is authorized by this audit.

1. **Phase 1a (in review):** read-only slot resolver and tests.
2. **Phase 1b: certified-definition adapter (read-only).** Build the `certifiedDefinitionLookup` input from the registry's **table-verified** slot costs only. *Decision needed:* is `TABLE_VERIFIED` enough to certify a slot cost? The contract treats a certified definition as authoritative, so this must be an explicit ruling. No catalog change.
3. **Phase 2a: content corrections upstream.** One PR per producer: `tools/fix-equipment-data.js` and `data/store/equipment-store-descriptions.json` for B3-B9, then rebuild packs through the established pipeline. Includes A1 (Overload Switch cost) and A9 (Improved Energy Cell slots) as separately approved source-backed changes. No hand edits of `.db` files.
4. **Phase 2b: slot consumers.** Route `UpgradeSlotEngine`, `SafetyEngine`'s cap, `UpgradeService.getSlotUsage` and Workbench display through the resolver one at a time, shadow-compare first (contract §12).
5. **Phase 2c: eligibility and transaction convergence.** Workbench through `UpgradeEligibilityEngine`; `UpgradeService.applyUpgrade` through `InstallRemoveEngine`; capacity re-check at the service boundary (not in `ActorEngine`).
6. **Phase 3: Scum detail certification** (owner-led), then re-run this ledger. Prerequisite for any effect work.
7. **Phase 4: catalogs.** Reconcile the Workbench's 28 entries individually; reconcile the three template catalogs; decide the fate of Superior Tech and droid/vehicle traits in the Tech Specialist service (leave droid/vehicle for their refactors).
8. **Phase 5: weapon effective profile and aggregation (read-only first),** feeding existing combat resolvers, family by family, after Phase 3.
9. **Phase 6: migration and smoke:** dry-run report, reversible migration, Foundry v13 manual smoke.

## 9. Major risks

- **Silent capacity errors.** Under-counted medium/heavy armor in the engine and Workbench disagreement already persist wrong numbers into Items (Phase 0 C2, C11).
- **Pack regeneration drift.** Fixing a `.db` file without fixing `tools/fix-equipment-data.js` or the store-description JSON is overwritten on rebuild, and the reverse leaves shipped packs stale.
- **Placeholder effects treated as rules.** `EffectResolver` numbers look authoritative to a reader and to the UI preview.
- **Double application.** Tech Specialist direct writes plus any future aggregator would count twice; same for lightsaber `system.modifiers` plus crystal records.
- **Scope bleed.** The Tech Specialist service and `UpgradeService` contain droid and vehicle branches; edits there can break the separate refactors.
- **Live data.** Existing world Items hold legacy mirrors and possibly mutated `system.upgradeSlots`/`system.armorType`; migration needs a dry run and cannot be inferred statically.
- **Interpretation risk.** The registry flags several ambiguities (accessory one-modification limit with Tech Specialist exception; Retractable Stock 0/1; Sabotage Device on armor; Prototype second trait). None may be settled in code.

## 10. Questions for the owner (not decided here)

1. Is a **table-verified** slot cost sufficient for the `certifiedDefinitionLookup` input before Scum detail text is certified?
2. What is the policy for definitions whose **price is unstated** (Componentization)? The registry says zero must not be canonized as free; the transaction path needs an explicit "price unknown" outcome.
3. Where does the **canonical weapon fact** for "slugthrower", "burst/splash radius" and "Small or larger" come from, given the registry fields available?
4. Should **Superior Tech** traits stay in the service unchanged while uncertified, be hidden, or be gated?
5. Which producer is authoritative for **lightsaber crystal and accessory** content (`packs/*.db` builder is not yet located; `scripts/data/lightsaber-crystals-map.js` is a second copy)?
6. Are **Computerized Interface Scope** and **Night Vision Device** to be added to the registry, or removed from the catalog? (Neither has a registry definition.)

## 11. What was not done

No PDF was opened. The Sith/Force Alchemy services and the Workbench lightsaber mode were mapped but not traced end to end. No saved-world data was examined. No file other than this document was created.

# Weapon Modification Convergence — Phase 0 Audit

**Status:** audit only. No runtime, pack, template, or data change accompanies this document.
**Baseline:** `9cca1452a3f9b65dca2713ad0e534b3cb3da7361`, which is current `origin/main` (re-fetched for revision 2). Revision 1 of this document said `origin/main` had moved to `811462e`. That was wrong: `811462e` is a stale **local** `main` branch ref in the session checkout, not the remote. The baseline did not move.
**Branch:** `claude/weapon-modification-roadmap-iq4c8w`
**Revision 2 and 3:** corrections from the independent Phase 0 review of PR #1031. Documentation only; see section 12 for the change list.

## 0. Read this first: input provenance and limits

1. **Inputs received.** Revision 1 used only `SWSE_Modification_Schema_Proposal_v1.2.md` (42 KB). The reviewer then supplied corrections **in the review message**, including the binding decisions in section 9. **The file `SWSE_Claude_Weapon_Modification_Handoff_v2_CORRECTED.md` was referenced but is not present in this session** (searched the filesystem and the upload directory). This revision therefore applies exactly what the review message states, and nothing else. Anything the v2 file adds beyond the review message is **not reflected**; section 9 marks the places where that could matter. If the v2 file is supplied, a further reconciliation pass is needed.
2. **Certification status.**
   - Items marked **reviewer-certified** come from the review message, which states they were verified against the scanned PDFs (*Scum and Villainy* p. 37; *Knights of the Old Republic Campaign Guide* p. 75, Table 5-6). I did not open those PDFs and have not independently verified them.
   - Everything else in section 3 remains OCR-derived (`reference/sourcebooks/*.txt`; per its README the PDF is the final authority). The *Scum and Villainy* chapter is mostly illegible in OCR.
3. **No behavior was exercised in Foundry.** Everything below is from static reading plus the headless tests listed in section 10. Anything that needs a live world is marked *runtime validation needed*.
4. The v1.2 critical-hit and damage-assembly semantics are taken as the proposed design. They are not asserted as SWSE rules here.

## 1. Executive summary

- **There is no single slot authority today. There are at least six independent computations of "how many slots does this item have".** They disagree (section 2). The most consequential: `UpgradeSlotEngine` ignores `system.upgradeSlots` entirely, while the Workbench treats it as the base and then adds structural bonuses on top of it, while `StructuralChangeEngine` and Tech Specialist both write back into it. Opening an item in the Workbench after a size increase or strip therefore double-counts.
- **There are two disjoint upgrade catalogs.** `UPGRADE_CATALOG` (≈75 entries, aligned to the *Scum and Villainy* / KotOR lists) is used by `CustomizationWorkflow`/`UpgradeService`. The Workbench uses `scripts/data/{blaster,melee,armor}-upgrades.js` and `gear-mods.js` (28 entries). **Zero keys overlap** (verified by script, section 10). Workbench-installed upgrades are not resolvable by `UpgradeEligibilityEngine`, `EffectResolver`, or `UpgradeSlotEngine`.
- **There are three writers of the installed-upgrade list with three shapes**, and the committed state is mirrored across `flags.foundryvtt-swse.customization`, `system.installedUpgrades` and `flags.swse.{blasterUpgrades,meleeUpgrades,armorUpgrades,gearMods,appliedTemplates,customizationStructural}`.
- **Effective weapon properties are not computed anywhere.** Install-time code writes numbers straight onto the Item (`system.critRange`, `system.attackBonus`, `system.damageBonus`, `system.ammo`, …). Removal does not reverse them (`EffectResolver.removeResolvedEffects` is a documented no-op). Most written keys have no consumer; one (`system.damageBonus`) collides with an unrelated reader.
- **Critical handling already has three channels in the canonical runtime** (`criticalEffects` incl. `add-damage-after-critical-multiplication`, a multiplier resolver, `system.critRange`). Item modifications touch only `system.critRange`. v1.2's three-channel model maps onto existing authorities; it does not need a new combat engine.
- **The engine's stock base is wrong for armor.** `getStockBaseSlots` returns `1` for every non-powered item. The reviewer-certified baseline is light armor 1, medium armor 2, heavy armor 3 (section 3). Medium and heavy armor are under-counted by the engine (C11).
- **Recommendation (revised):** Phase 1a is a **read-only** `ModificationSlotAuthority` plus tests that pin the contradictions below. Consumer rewiring and its integration tests belong to later, separately approved gates (section 8).

## 2. Slot authority map and contradictions

### 2.1 Every place a slot count is produced or consumed

| # | Location | What it does | Source of base |
|---|---|---|---|
| S1 | `scripts/engine/customization/upgrade-slot-engine.js:27-41` `getStockBaseSlots` | `stockSlotOverride` → powered armor `2` → else `1` | **Never reads `system.upgradeSlots`.** |
| S2 | `upgrade-slot-engine.js:58-82` `getSlotAccounting` | `total = stockBase + (sizeIncrease?1:0) + strippedAreas.length`; `used = Σ installedUpgrades[].slotCost` | S1 |
| S3 | `scripts/apps/customization/item-customization-workbench.js:913,1001` | `base = max(1, system.upgradeSlots ?? stockBase ?? legacy)`, **then adds** size and strip bonuses from the draft | `system.upgradeSlots` |
| S4 | `item-customization-workbench.js:1024` `_getLegacyBaseSlots` | fallback: weapon `2`, armor `3`, else `1` | hard-coded |
| S5 | `scripts/engine/customization/structural-change-engine.js:80,144` | **writes** `system.upgradeSlots = stock + size + strips` | S1 |
| S6 | `scripts/engine/customization/tech-specialist-modification-service.js:372` | `kind === 'upgradeSlot'` → `system.upgradeSlots += amount` | `system.upgradeSlots` |
| S7 | `scripts/engine/customization/safety-engine.js:472-473` | install validation uses a **hard-coded cap of 10** ("Assume 10-slot standard; should be parameterized") | constant |
| S8 | `scripts/engine/upgrades/UpgradeService.js:344-358` `getSlotUsage` | reads `state.slots.used` / `.total` | see C4 |
| S9 | `item-customization-workbench.js:2645-2656` lightsaber accessories | `base = chassis.system.upgradeSlots ?? chassis.system.lightsaber.upgradeSlots ?? 3`, `+1` if the actor has Tech Specialist (except tuning mode) | chassis item / constant `3` |
| S10 | `scripts/engine/crafting/lightsaber-construction-engine.js` | construction cost/DC only. No slot enforcement ("No slot enforcement. Pure query." header). | n/a |
| S11 | `scripts/items/{weapon,armor,equipment}-data-resolver.js`, `item-defaults.js`, `template.json:652`, `safe-item-factory.js`, `apps/custom-item-dialog.js` | normalize / default `system.upgradeSlots` (mostly `1`; custom-item dialog `parseInt(...) || 1`, so `0` becomes `1`) | various |

### 2.2 Contradictions (each is a candidate Phase 1 pinning test)

| ID | Contradiction | Evidence | Effect |
|---|---|---|---|
| C1 | **Engine ignores `system.upgradeSlots`; Workbench trusts it.** | S1 vs S3 | A pack/custom item with `upgradeSlots` ≠ 1 shows different capacity in the Workbench than `InstallRemoveEngine` enforces. |
| C2 | **Structural double count in the Workbench.** `applySizeIncrease`/`applyStrip` write `system.upgradeSlots = stock+size+strips`; the Workbench reads that as base and adds `size+strips` again. | S5 vs S3 | An item enlarged via `CustomizationWorkflow` and later opened in the Workbench shows +1 (or +N strips) too many slots. Only reachable if both paths touch the same item. *Runtime validation needed.* |
| C3 | **Tech Specialist slot bonus is read by only one consumer, and three different ways.** S6 writes `system.upgradeSlots` (honored by S3, ignored by S1). S9 adds a separate `+1` for lightsabers by feat presence. | S1/S3/S6/S9 | Same feat, different slot totals by path, and no per-item record of which item received the benefit. (The `tech_device_upgrade_slot` trait is catalogued, line 19 of the service.) |
| C4 | **`UpgradeService.getSlotUsage` reads fields that do not exist.** `CustomizationWorkflow.getFullCustomizationState().slots` is `{stockBase, totalAvailable, usedSlots, freeSlots, …}`; the service reads `slots.used` / `slots.total`. | `customization-workflow.js:61`, `UpgradeService.js:352-354` | The Upgrade app always receives `{used:0,max:0,remaining:0}` for standard items. |
| C5 | **Hard-coded 10-slot cap** in `SafetyEngine.#validateInstallOperation` is applied in addition to the real total. | S7 | An item that legitimately has >10 total slots can never reach them; an item with 1 slot is still bounded only by `canAccommodate` in eligibility. The two checks answer different questions. |
| C6 | **Base slot defaults disagree (1 / 2 / 3) and do not match the reviewer-certified baseline.** Engine: `1` for everything except powered armor `2`. Workbench legacy fallback (S4): weapon `2`, armor `3`. `template.json`: `1`. Lightsaber chassis default: `3`. Certified baseline (section 3): ordinary weapon 1, ordinary equipment 1, light armor 1, medium armor 2, heavy armor 3. Pack data: `weapons.db` 188/207 have no `upgradeSlots`, 13 have `2`, 4 `1`, 1 `0`, 1 `3`; `weapons-lightsabers.db` 13/15 have `2`; all 133 armor and 142 equipment records have none. | pack census (section 10) | The "stock" count for an unannotated item is whichever fallback the consumer happens to use. The Workbench's weapon fallback `2` contradicts the certified `1`; the engine's armor `1` is wrong for medium and heavy; the Workbench's armor `3` is correct only for heavy. |
| C7 | **`stockSlotOverride` has no writer.** It is read from `flags.foundryvtt-swse.customization.overrides.stockSlotOverride` only (`item-profile-resolver.js:63`; `PHASE-A-GUIDE.md`). No code in `scripts/` sets it. | grep | Dead input; either an intended migration hook or legacy. Needs a decision, not deletion. |
| C8 | **Slot-cost vocabulary.** `slotCost` (engine/catalog), `slotsUsed` (`system.installedUpgrades` entries and `UpgradeService`), `upgradeSlots` (item/JSON/lightsaber component), `slotCost` fallback in the Workbench is `?? 1` while the engine's is `?? 0`. | S2, S3, `UpgradeService.js:335`, `SafetyEngine.js:298` | A missing field means 0 in one authority and 1 in another. |
| C9 | **Published slot cost mismatch: Improved Energy Cell.** *Knights of the Old Republic Campaign Guide*, p. 75, Table 5-6: **2 upgrade slots** (**reviewer-certified against the PDF**; it agrees with the OCR at ≈ line 6972). The repo uses **1** in `UPGRADE_CATALOG` (`upgrade-catalog.js:40`) and `data/upgrades/weapon-upgrades.json`. | KotOR p. 75 vs repo | **Confirmed catalog discrepancy.** Per the review: correct it in a separate, approved, source-backed change. **No catalog or data change is made in this PR.** |
| C10 | **Catalog gap.** `data/upgrades/*.json` contains entries absent from `UPGRADE_CATALOG` (e.g. *Missile Load*, *Droidification*, *Electrograpple Handle*, *Memory Upgrade*, *Miniaturized*, *Silverplate*, *Spring-Loaded*, *Recognition System*) and `UPGRADE_CATALOG` has no consumer of `data/upgrades/*.json` at runtime (only audit tools reference it). | `tools/census-item-ssot-phase-0.mjs:142,185` | Two catalogs of "published upgrades" that are not reconciled. |
| C11 | **Engine armor base ignores weight class.** `getStockBaseSlots` returns `1` for light, medium and heavy armor alike (only `isPoweredArmor` raises it, to `2`). Certified baseline: light 1, medium 2, heavy 3. | S1 vs section 3 | Medium armor is under-counted by 1 and heavy armor by 2. Because `StructuralChangeEngine` writes `system.upgradeSlots` from this value (S5), the under-count is also persisted into items. Powered-armor precedence is unresolved (section 3). |

## 3. Published slot rules (evidence and certification status)

Legend: **C** = reviewer-certified against the scanned PDF (stated in the Phase 0 review; not independently verified by me). **L** = legible in OCR only, still needs PDF confirmation. **X** = illegible in OCR, cannot be asserted. **U** = unresolved; no rule may be implemented.

### 3.1 Certified starting upgrade slots (*Scum and Villainy*, p. 37, **C**)

| Equipment | Starting upgrade slots |
|---|---|
| Ordinary weapon | 1 |
| Ordinary equipment | 1 |
| Light armor | 1 |
| Medium armor | 2 |
| Heavy armor | **3** |

The earlier handoff's heavy-armor value of 1 was wrong. This audit never adopted it, but revision 1 also did not have the correct value; the repo's engine (`1` for all armor) and the Workbench fallback (armor `3`, weapon `2`) are each wrong against this table in different cases (C6, C11).

### 3.2 Other certified rules

| Rule | Source | Status | Repo agrees? |
|---|---|---|---|
| Improved Energy Cell costs **2** upgrade slots. | *Knights of the Old Republic Campaign Guide*, p. 75, Table 5-6 | **C** | **No** (repo: 1). See C9. |

### 3.3 Unresolved: powered armor and lightsabers (do not implement)

| Topic | What is known | Why it is unresolved |
|---|---|---|
| **Powered armor baseline** | KotOR Campaign Guide OCR (≈ lines 6563-6565, 6601): light powered armor and powered battle armor each have "2 free upgrade slots (as does all powered armor)" under the *Scum and Villainy* modification rules. **L** | It is not decided whether 2 *replaces* or *adds to* the weight-class baseline (light 1 / medium 2 / heavy 3), and the OCR wording is "free upgrade slots". The repo's `isPoweredArmor → 2` (S1) is therefore **U**, not confirmed. Also depends on `isPoweredArmor` being set correctly (`item-profile-resolver.js:170`). |
| **Lightsaber accessory vs general slots** | Masterwork Lightsaber grants "one extra accessory" at creation (*Jedi Academy Training Manual*, OCR ≈ line 1610, **L**). Repo S9 uses chassis `upgradeSlots` or constant `3`, `+1` for Tech Specialist. | Whether lightsabers have general (non-accessory) upgrade slots, how they relate to accessory/crystal/construction pools, the published base accessory count, and whether Tech Specialist's `+1` is published are all **U**. Masterwork Lightsaber's extra accessory is a different mechanism from the repo's Tech Specialist `+1`. |

### 3.4 OCR-only observations (not certified)

| Rule | Source / OCR location | Legibility | Repo agrees? |
|---|---|---|---|
| Stripping removes a feature and grants +1 slot; weapons strip damage / range / design / stun setting / autofire; armor strips defensive material / joint protection; DC 20 Mechanics, 8 h; cost as OCR best-reads (50% of base cost); failure disables the item until repaired. | *Scum and Villainy* "Stripping Equipment/Weapons/Armor" (≈ lines 2212-2290) | **X** | Repo implements DC 20 and 8 h; the cost rule was not re-verified. |
| Size increase grants +1 slot; heavy armor cannot increase weight class. | *Scum and Villainy* "Equipment Size" | **X** | Repo: `+1`, heavy blocked (`upgrade-slot-engine.js:90-93`). |
| Componentization: Basic 1 slot, Deluxe 2 slots. | *Galaxy of Intrigue*, OCR line 6367 | **L** | Matches `UPGRADE_CATALOG`. |
| Table 5-6 slot costs: armor reinforcement 1, beam splitter 2, durasteel bonding 1, enhanced energy projector 1, hair trigger 1, mesh underlay 2, tremor cell 1. | KotOR OCR ≈ lines 6967-6985 | **L** | Matches. (Improved energy cell: see 3.2.) |
| "Most pieces of equipment can have only one accessory, though GMs might allow more." | KotOR, Table 5-6 intro | **L** | No repo enforcement. Whether it constrains slot accounting is a rules question for the architects (**U**). |
| Cybernetic prosthesis: 1 free slot; unique cybernetic systems have none and cannot gain any. | *Galaxy at War*, OCR lines 4657-4659, 4741-4742 | **L** | **Out of scope** (cybernetic). Recorded so Phase 1 does not default them to 1. |

**Not located:** the Tech Specialist slot rule's exact wording; any rule giving lightsabers general upgrade slots. These must come from the PDFs.

## 4. Modification producers, persistent state, consumers

### 4.1 Producers (writers of modification state)

| Producer | Writes | Via | Notes |
|---|---|---|---|
| `InstallRemoveEngine.applyInstall/applyRemove` (`install-remove-engine.js`) | `flags.foundryvtt-swse.customization.{installedUpgrades[],operationLog}`, `system.installedUpgrades[]` (display summaries), **and every `EffectResolver` mutation key** | `ActorEngine.applyMutationPlan` | Canonical-weapon gate via `weaponUpgradeAllowance` happens in eligibility. |
| `UpgradeService.applyUpgrade/removeUpgrade` (`UpgradeService.js:636-749`) | `system.installedUpgrades` **only** (no customization flag, no effects, no `slotCost` field, uses `slotsUsed`) | `ActorEngine.updateEmbeddedDocuments`; `item.update` for unowned | Index-based removal; a second install shape. Credits charged after the item write (a failure between the two loses the charge). |
| `StructuralChangeEngine` | `…customization.structural`, `system.sizeIncreaseApplied`, `system.upgradeSlots`, armor stats | `ActorEngine.applyMutationPlan` | Strip also edits armor defense/MaxDex directly. |
| `TemplateEngine.applyTemplate` | `…customization.appliedTemplates[]`, `system.restriction`, `system.gearTemplate(Secondary)`, `EffectResolver` template mutations | `ActorEngine.applyMutationPlan` | Template catalog effects are explicitly "metadata only pending" (`upgrade-catalog.js` comment). |
| `ItemCustomizationWorkbench._applyCurrentItem` (lines 3593-3684) | `flags.swse.{appliedTemplates, customizationStructural, blasterUpgrades/meleeUpgrades/armorUpgrades/gearMods, variant, tintColor, accentColor}`, **and** `flags.foundryvtt-swse.customization` (rebuilt via `_getDraftCustomizationState`) | `TransactionEngine.executeMutationTransaction` | A fourth path; applies **no `EffectResolver` effects** and **no per-install DC/mechanics check**. |
| `TechSpecialistModificationService` | `flags.swse.techSpecialist.*`, and direct `system.attackBonus`, `system.flatDamageBonus`, armor stats, `system.upgradeSlots`, `system.shieldRating`, `flags.swse.*` | `ActorEngine.updateActor`/`updateOwnedItems`/`updateActorFlags`; fall-through `subject.update(...)` at lines 569/590/687 for non-owned | The trait list is the eligibility source of truth (`TS` signature/active-trait logic). |
| `ForceAlchemyMechanicsService` | `flags.foundryvtt-swse.alchemy`, `flags.swse.alchemy`, item stats for Sith armor/weapon | its own service | Ritual/resources are in `ForceAlchemyStateService`; not audited in depth. |
| `LightsaberConstructionEngine` | `system.modifiers` (copied crystal+accessory records), `system.damageType`, `flags.{foundryvtt-swse,swse}.lightsaberConfig` | `ActorEngine.updateEmbeddedDocuments` / `applyMutationPlan` | Copies component effects onto the host (v1.2 calls this out). |
| `EffectResolver` | returns mutation maps only (does not write). `applyResolvedEffects` is not a writer. | — | Used by `InstallRemoveEngine` and `TemplateEngine`. |

### 4.2 Persistent state locations for a single weapon

`flags.foundryvtt-swse.customization.{structural,installedUpgrades,appliedTemplates,operationLog,overrides}` · `system.installedUpgrades` · `system.upgradeSlots` · `system.sizeIncreaseApplied` · `system.gearTemplate(Secondary)` · `flags.swse.{blasterUpgrades,meleeUpgrades,armorUpgrades,gearMods,appliedTemplates,customizationStructural}` · `flags.swse.techSpecialist.*` · `flags.{foundryvtt-swse,swse}.alchemy` · `flags.{foundryvtt-swse,swse}.lightsaberConfig` · `system.modifiers` · and the direct stat keys listed in §5. **Legacy recovery is conditional and incomplete** (corrected in revision 3; revision 2 overstated it). `SafetyEngine.normalizeCustomizationState` (`safety-engine.js:83-128`) recovers legacy data **only when `flags.foundryvtt-swse.customization` is absent** (`:88-97`, via `#recoverFromLegacySources`). When the canonical flag exists, it normalizes that flag alone and does **not** merge any legacy array. The recovery path itself reads:

- `system.installedUpgrades` (mapped to instances; `slotsUsed` becomes `slotCost`, `Number(...) || 0`);
- `flags.swse.meleeUpgrades`, `flags.swse.gearMods` and `flags.swse.armorUpgrades`, each looked up in `MELEE_UPGRADES`, `GEAR_MODS`, `ARMOR_UPGRADES` and assigned `slotCost: 1`, de-duplicated by `upgradeKey` against the first source;
- `system.gearTemplate` / `gearTemplateSecondary` (templates); `system.strippedFeatures` and `system.sizeIncreaseApplied` (structural).

It does **not** read `flags.swse.blasterUpgrades`, `flags.swse.appliedTemplates` or `flags.swse.customizationStructural`, so blaster upgrades and the Workbench's legacy template/structural mirrors are never recovered by this function.

**Coexistence/omission risk.** The Workbench writes the canonical flag **and** the `flags.swse.*` mirrors on every apply, and `UpgradeService.applyUpgrade` writes only `system.installedUpgrades`. An item can therefore hold upgrades in both representations. When the canonical flag exists, an upgrade present only in `system.installedUpgrades` (e.g. installed through `UpgradeService`) or only in `flags.swse.blasterUpgrades` is **invisible to `UpgradeSlotEngine`** (omitted from `used`), while the Workbench separately unions canonical and legacy keys (`_getCanonicalInstalledUpgradeKeys`, `_getCanonicalTemplateKeys`), so the two consumers can disagree on the same item. A future slot authority must neither silently drop nor double-count either representation. *Static reading; runtime validation needed.*

### 4.3 Consumers of modification state

- Attack/damage: `combat-stat-rules.js` reads `system.attackBonus` (L432) and `system.flatDamageBonus` (L437), and the lightsaber `system.modifiers` records (L600-700, `getWeaponAttunementAndUpgradeModifiers`, which gates on `lightsaberConfig.crystalId` provenance).
- Critical: `combat/utils/combat-utils.js` `getEffectiveCritRange` (reads `system.critRange`, `EXTEND_CRITICAL_RANGE` rule); `combat-roll-math.js:884` `resolveCriticalMultiplier` (the declared single multiplier authority); `items/weapon-runtime/special-mechanics.js:256-260` `criticalEffects` (`add-damage-after-critical-multiplication`, `critical-die-replace`).
- `engine/combat/weapons-engine.js:301-312,441-460` reads `weapon.system.installedUpgrades` **as an array of item ids** resolved against `actor.items`. The only live writer stores `{id, name, cost, slotsUsed…}` objects. This consumer therefore matches no live producer (the same observation `combat-stat-rules.js:519-530` records in its comment). *Dead path; classify D/B in a later phase, do not delete in Phase 0.*
- Workbench/Upgrade UI: `PanelContextBuilder`, `RowTransformers` (`upgradeSlots` for display), `WorkbenchSurfaceAdapter`.
- **No combat consumer reads `flags.swse.techSpecialist`, `appliedTemplates`, `alchemy`, or `customization.installedUpgrades`.** Their effect reaches combat only through the direct stat keys they write.

## 5. Where "effective weapon properties" are calculated, and where it is duplicated

There is no effective-profile resolver. The effective value is whatever was last written onto the Item. Findings:

1. **`EffectResolver` weapon effects (lines 171-282)** write numbers that nobody certified in this phase: `hair_trigger → system.critRange -1`; `overload_switch → system.damageBonus +1`; `tech_improved_accuracy → system.attackBonus +1`; `improved_energy_cell → system.ammo +5`; `pulse_charger → system.ammo +10`; `rapid_recycler → system.rateOfFire +1`; `ion_charger/tremor_cell → system.damageType`; plus many `#addBonusModifier` writes to `system.<x>Bonus`. **These values are not traceable to a rule in the material available. Phase 5 must not treat them as certified.**
2. **No removal.** `EffectResolver.removeResolvedEffects` returns success without reversing (lines 150-153); `InstallRemoveEngine.applyRemove` only drops the list entry. Installed `system.critRange`, `system.ammo`, `system.damageType` etc. persist after removal.
3. **Orphan keys.** Grep over `scripts/` finds no reader of `system.weaponDamageBonus`, `rangedAttackBonus`, `stealthBonus` (item), `durabilityBonus`, `rateOfFire`, `firingMode`, `fireMode`. Those effects are display-only today.
4. **Key collision.** `overload_switch` writes the number `1` to `system.damageBonus`, which `combat-stat-rules.js:898` reads as the *damage ability selector* (`explicit = String(system.damageBonus ?? system.damageAbility …)`). A numeric `1` is not `none/0/false`, so it does not short-circuit as intended. *Runtime validation needed on actual ability-mod behavior.*
5. **Resource conflation.** `system.ammo` is written as if it were capacity; v1.2 §6 requires `max` to be derived and `current` to be operational state.
6. **Tech Specialist** applies `system.attackBonus`/`system.flatDamageBonus` by read-modify-write (`currentNumber(...) ± amount`); switching the active trait reverses by sign. Correct only as long as nothing else writes the same key.
7. **Lightsaber:** `system.modifiers` is a copy of crystal/accessory records. `combat-stat-rules.js` already de-duplicates the "standard crystal +1" by `lightsaberConfig.crystalId` identity, which is the existing guard against the double-count v1.2 warns about.
8. **Critical channels already mapped to existing authorities:** range → `getEffectiveCritRange`; multiplier → `resolveCriticalMultiplier` (comment at `combat-roll-math.js:~870` records that three prior copies were consolidated); post-multiplier addition → `criticalEffects` `add-damage-after-critical-multiplication` in the canonical weapon runtime. Duplicates still present: `combat-utils.js#getCriticalMultiplier`, `combat-stat-rules.js#getCriticalMultiplier`, and `attacks.js`/`enhanced-rolls.js` reading `weapon.system.critMultiplier` directly (`enhanced-rolls.js:454`). **A `WeaponModificationEngine` that supplies critical inputs must feed these existing resolvers, not add a fourth.**

## 6. Legality, installation, removal, and transaction workflows

| Concern | Authority today | Gap |
|---|---|---|
| Upgrade eligibility | `UpgradeEligibilityEngine.canInstallUpgrade` (category, canonical-weapon allowance via `weaponUpgradeAllowance`, slots via S2, stripped areas, `requires`, Tech Specialist feat and "one TS benefit per item") | Workbench does not call it (disjoint catalog). |
| Template legality | `getEligibleTemplates` (category, stackable, hard-coded prototype/cortosis/phrik exception pair) | Template effects are "metadata only". |
| Tech Specialist | `MetaResourceFeatResolver.canActorPerformTechSpecialistModifications` + `TechSpecialistModificationService` signature-device logic | Two parallel TS representations: catalog entries with `source: 'tech-specialist'` in `UPGRADE_CATALOG` **and** the service's own trait list. |
| Sith Alchemy | `ForceAlchemyWorkbenchApp`/`MechanicsService`/`StateService` | Not tied to slot accounting. Sith amulet creates `upgradeSlots: 0`. |
| Lightsaber | `LightsaberConstructionEngine` + Workbench lightsaber mode | Standard profile resolver deliberately excludes the `lightsaber` category (`_isCustomizableCategory`). |
| Transaction | Install/remove/template/structural: `ActorEngine.applyMutationPlan` with `LedgerService.buildCreditDelta`. Workbench: `TransactionEngine.executeMutationTransaction`. `UpgradeService`: two separate writes. | Three different atomicity models. |
| Duplicate-apply guard | `SafetyEngine.guardAgainstDuplicateApply` (in-memory, per client) | Not cross-client. |
| Remaining direct mutations | `TechSpecialistModificationService` `subject.update` fall-through (lines 569/590/687, non-owned items); `UpgradeService` `item.update` for unowned (`@mutation-exception: world-item`). | Documented exceptions or unmarked; review in Phase 2. |

## 7. Rules that remain uncertified (must not be implemented)

1. Powered-armor slot baseline and its precedence against the armor-weight baseline (section 3.3).
2. Lightsaber general-upgrade slots, the accessory/crystal/construction pool relationship, the published base accessory allowance, and whether Tech Specialist's `+1` (S9) is a published rule (section 3.3).
3. The "one accessory per item" statement and slot accounting.
4. All numeric effects in `EffectResolver` (section 5.1), including the `critRange` change of `hair_trigger`.
5. Die-step progression, critical-range caps/stacking, multiplier limits, nonmultipliable packets (v1.2 §9.1-2).
6. How multiple templates/alchemy/TS/upgrade bonuses stack by `bonusType` (v1.2 §9.2).
7. Armor template/size/strip interaction with powered armor (v1.2 §9.3).
8. Which upgrades are physical components vs abstract improvements (v1.2 §9.4).
9. Tech Specialist slot-bonus wording and per-item attribution.

(Resolved since revision 1: ordinary and armor baselines, section 3.1; Improved Energy Cell slot cost, section 3.2.)

## 8. Proposed Phase 1 contract (for approval; not started)

Phase 1 is split by gate. **Only 1a is proposed for the next approval, and it is read-only.**

### Phase 1a — read-only slot authority (proposed)

**Goal:** a pure module that resolves slot state. It is not called by any existing consumer, writes nothing, and migrates nothing.

**Binding decisions it must follow** (section 9): `system.upgradeSlots` is legacy/ambiguous, not an authoritative base, and structural bonuses are never added on top of it; `stockSlotOverride` is legacy evidence only and must not silently override a canonical item definition; a missing `slotCost` is reported as **unresolved**, never defaulted to 0 or 1, while an explicitly certified `0` remains valid.

**Proposed files (new only; no existing file modified):**

- `scripts/engine/customization/modification-slot-authority.js` — pure functions: `resolveSlotState(item, {domain})` → `{domain, base:{value, source, certified}, capacityChanges[], occupied[], remaining, conflicts[], unresolved[]}`. No `ActorEngine`, `update`, `setFlag` or Foundry document mutation.
- `tests/modification-slot-authority.test.mjs` — authority-only tests (below).

**Acceptance tests for 1a (authority in isolation; no consumer imports):**

1. Ordinary weapon and ordinary equipment → base 1, certified (3.1).
2. Light / medium / heavy armor → 1 / 2 / 3, certified.
3. Powered armor → base reported **unresolved** (3.3); the authority never picks 2 vs weight-class.
4. Lightsaber → general-upgrade base **unresolved**; chassis/crystal/accessory pools reported separately.
5. Item carrying a legacy `system.upgradeSlots` value → value is exposed as legacy evidence only; it never changes `base` or `capacityChanges`, and the total is identical with and without it.
6. `stockSlotOverride` present → surfaced as legacy evidence; does not override the canonical base.
7. Size increase and strips recorded in the canonical customization state → counted exactly once each, from the recorded instances (never from `system.upgradeSlots`).
8. Installed upgrade with an explicit `slotCost: 0` → valid and counted as 0; missing `slotCost` → listed in `unresolved[]`, not counted as 0 or 1.
9. Overflow is reported as a conflict, never clamped.
10. Category spoofing: a non-armor item cannot receive an armor baseline by setting `isPoweredArmor` or a weight class; domain comes from item type.
11. Deterministic: same input gives the same output; input item objects are not mutated.
12. Static guard: the module contains no call to `ActorEngine`, `.update(`, `setFlag`, `unsetFlag`.

### Later gates (not proposed for approval now; each needs its own approval)

- **Phase 1b / Phase 2:** make `UpgradeSlotEngine` delegate to the authority; fix C4 (`UpgradeService.getSlotUsage` field names) and C5 (hard-coded 10); remove the Workbench's own slot math (S3/S4); fix C11. Integration tests move here: C2 size/strip single-count through the real consumers, C3 Tech Specialist attribution, C4, C5, C8 consistency across callers.
- **Separate source-backed change:** correct Improved Energy Cell to 2 slots (C9) in `UPGRADE_CATALOG` and `data/upgrades/weapon-upgrades.json`.
- **Workbench catalog reconciliation:** map the 28 Workbench entries individually (section 9, decision 2) before any rerouting.

**Out of scope throughout Phase 1:** schema migration, `WeaponModificationEngine`, `EffectResolver` changes, droid/vehicle/cybernetic slots, production data or catalog edits.

## 9. Decisions

### 9.1 Binding decisions (from the Phase 0 review; recorded, not re-opened)

| Question | Decision |
|---|---|
| What does `system.upgradeSlots` mean? | Legacy, ambiguous stored value. Not an authoritative base. Structural bonuses are not added on top of it. Preserved for migration analysis. |
| Should the Workbench use `UPGRADE_CATALOG`? | Not by wholesale replacement. Audit and map all 28 Workbench entries individually first. |
| Does a missing `slotCost` mean 0 or 1? | Neither. Flag as unresolved. An explicitly certified zero-slot cost remains valid. |
| Should `stockSlotOverride` remain? | Retain as legacy evidence for now. It must not silently override a canonical item definition. |
| Improved Energy Cell slot cost? | 2 slots (reviewer-certified, KotOR p. 75, Table 5-6). Correct the catalog in a separate, approved, source-backed change. |
| Starting slots? | Weapon 1, equipment 1, light armor 1, medium armor 2, heavy armor 3 (*Scum and Villainy* p. 37). |

### 9.2 Still open (needs the architects; nothing here may be implemented)

1. **Powered-armor baseline** versus the armor-weight baseline (3.3).
2. **Lightsaber** accessory vs general slots, and the Tech Specialist `+1` (3.3).
3. Disposition of `UpgradeService.applyUpgrade/removeUpgrade` (a third installed-upgrade shape): proposed to reroute through `InstallRemoveEngine` at a later gate. Needs approval.
4. Provenance of the 28 Workbench catalog entries (shipped content or placeholders). Not determined here.
5. **Items the v2 handoff may settle that I could not see** (the file was not received, section 0): the per-family stacking rules, any lightsaber slot pools, any migration policy for legacy installed-upgrade shapes, and anything else locked there. If v2 settles items 1-4, this audit should be reconciled to it.

## 10. Validation and method

Run on branch `claude/weapon-modification-roadmap-iq4c8w` at `9cca145` (revision 1; revision 2 changes only this Markdown file, so no runtime check applies to it):

- `node tests/workbench-inline-structural-flattening.test.mjs` — passed
- `node tests/weapon-phase-5d-i-d-b3-upgrades.test.mjs` — 18 checks OK
- `node tests/phase-2b-closure-fixes.test.mjs` — passed
- `node tools/validate-partials.mjs` — passed
- `node tools/validate-data.js` — passed
- `system.json` parses

Method notes:

- Catalog overlap: a throwaway Node script (kept in the session scratchpad, not committed) loaded `UPGRADE_CATALOG` and the four Workbench catalogs and compared by key and by normalized name. Result: blaster 4/4, melee 6/6, armor 10/10, gear 8/8 absent from `UPGRADE_CATALOG`.
- Pack census: counted `system.upgradeSlots` values in `packs/{weapons,weapons-lightsabers,armor,armor-light,armor-medium,armor-heavy,equipment}.db`.
- Sourcebook text was searched in `reference/sourcebooks/*.txt` only; I consulted no PDF. The items marked **C** in section 3 rest on the reviewer's statement that they were verified against the scanned PDFs.
- **Not done:** no Foundry runtime check; the tech-specialist and alchemy services were read for their write targets, not traced end-to-end; `data/upgrades/*.json` was compared by slot cost only.

## 11. Classification of existing systems (per project rules)

| System | Class |
|---|---|
| `UpgradeSlotEngine`, `InstallRemoveEngine`, `StructuralChangeEngine`, `TemplateEngine`, `UpgradeEligibilityEngine`, `CustomizationWorkflow`, `SafetyEngine.normalizeCustomizationState` | **A** active authority (slot logic needs consolidation) |
| `ItemCustomizationWorkbench` upgrade/slot computation, its own catalogs | **A** UI, **B** for its slot math and catalogs (reroute to authority) |
| `UpgradeService.applyUpgrade/removeUpgrade`, `getSlotUsage` | **B** deprecated-but-referenced install shape and broken usage fields |
| `weapons-engine.js` `installedUpgrades`-as-item-ids consumers | **C/F** unreferenced by any live producer; confirm with runtime before deletion |
| `EffectResolver` weapon/armor/gear effect maps | **F** runtime-risk; uncertified numbers |
| `stockSlotOverride` | **D/E** pending decision |
| `TechSpecialistModificationService` direct stat writes | **B** convergence candidate (per v1.2 §1.1) |

## 12. Revision 2 and 3 change lists (documentation only)

- Baseline note corrected: `origin/main` is `9cca145`; `811462e` was a stale local ref.
- Section 0: input provenance restated; v2 handoff file not present; certified items distinguished from OCR items.
- Section 1: added the engine's armor-baseline error; Phase 1 recommendation revised to read-only.
- Section 2: C6 and C9 updated; C11 added.
- Section 3: rewritten around the certified baseline (3.1), Improved Energy Cell (3.2), unresolved powered armor and lightsabers (3.3), and OCR-only observations (3.4).
- Sections 7-9: uncertified list updated; Phase 1 split so 1a is read-only and consumer rewiring and integration tests moved to later gates; binding decisions recorded; open items separated.
- No runtime file, catalog, compendium data or test was changed.

**Revision 3** (review correction, documentation only):

- Section 4.2: corrected the description of `SafetyEngine.normalizeCustomizationState` (conditional legacy recovery; no `blasterUpgrades`, `appliedTemplates` or `customizationStructural` recovery) and documented the coexistence/omission risk.
- Section 8: added the future migration regression scenarios below.
- Baseline `9cca145` unchanged. No runtime, catalog, data or test file changed.

### Future migration regression scenarios (not implemented in Phase 0)

1. Canonical customization flag present **and** an upgrade only in `system.installedUpgrades` → reported as a conflict or unresolved occupancy; never silently dropped and never double-counted.
2. Canonical flag present and `flags.swse.blasterUpgrades` populated → same.
3. Canonical flag absent, legacy arrays present → recovered once; a blaster-flag-only item is flagged as unrecoverable by the current adapter, not assumed empty.
4. The same upgrade in both canonical and legacy representations (matching key) → counted once, provenance records both.
5. Legacy entry with missing `slotsUsed` → `slotCost` unresolved (current adapter coerces to 0; decision 9.1 forbids defaulting).
6. Workbench-only keys (not in `UPGRADE_CATALOG`) present in the legacy flags → surfaced as unmapped, not costed.

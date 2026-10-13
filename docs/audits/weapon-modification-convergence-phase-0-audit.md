# Weapon Modification Convergence — Phase 0 Audit

**Status:** audit only. No runtime, pack, template, or data change accompanies this document.
**Baseline:** `9cca1452a3f9b65dca2713ad0e534b3cb3da7361` (the last verified main). `origin/main` has since moved to `811462ee6e753ea15e27b3c5a5e31e9648f06ff7`; this audit was not re-run against it.
**Branch:** `claude/weapon-modification-roadmap-iq4c8w`

## 0. Read this first: input provenance and limits

1. **The full handoff was not received.** The file supplied was `SWSE_Modification_Schema_Proposal_v1.2.md` (42 KB). The handoff was described as 84 KB and as including the slot-authority audit, the locked decisions, the phase gates, the Phase 1 contract and the unresolved sourcebook questions. None of those sections were available. This audit is measured against v1.2 only. **Any locked decision in the missing document that conflicts with v1.2 is not reflected here.** Section 9 lists the places where that could change a conclusion.
2. **Sourcebook evidence is OCR only.** `reference/sourcebooks/*.txt` are DjVu text exports. Per `reference/sourcebooks/README.md` the PDF is the final authority. The *Scum and Villainy* equipment-upgrade chapter (the primary source for slots) is almost entirely garbled in OCR. Nothing in section 3 is certified. Every row says what is legible and what needs PDF confirmation.
3. **No behavior was exercised in Foundry.** Everything below is from static reading plus the headless tests listed in section 10. Anything that needs a live world is marked *runtime validation needed*.
4. The v1.2 critical-hit and damage-assembly semantics are taken as the proposed design. They are not asserted as SWSE rules here.

## 1. Executive summary

- **There is no single slot authority today. There are at least six independent computations of "how many slots does this item have".** They disagree (section 2). The most consequential: `UpgradeSlotEngine` ignores `system.upgradeSlots` entirely, while the Workbench treats it as the base and then adds structural bonuses on top of it, while `StructuralChangeEngine` and Tech Specialist both write back into it. Opening an item in the Workbench after a size increase or strip therefore double-counts.
- **There are two disjoint upgrade catalogs.** `UPGRADE_CATALOG` (≈75 entries, aligned to the *Scum and Villainy* / KotOR lists) is used by `CustomizationWorkflow`/`UpgradeService`. The Workbench uses `scripts/data/{blaster,melee,armor}-upgrades.js` and `gear-mods.js` (28 entries). **Zero keys overlap** (verified by script, section 10). Workbench-installed upgrades are not resolvable by `UpgradeEligibilityEngine`, `EffectResolver`, or `UpgradeSlotEngine`.
- **There are three writers of the installed-upgrade list with three shapes**, and the committed state is mirrored across `flags.foundryvtt-swse.customization`, `system.installedUpgrades` and `flags.swse.{blasterUpgrades,meleeUpgrades,armorUpgrades,gearMods,appliedTemplates,customizationStructural}`.
- **Effective weapon properties are not computed anywhere.** Install-time code writes numbers straight onto the Item (`system.critRange`, `system.attackBonus`, `system.damageBonus`, `system.ammo`, …). Removal does not reverse them (`EffectResolver.removeResolvedEffects` is a documented no-op). Most written keys have no consumer; one (`system.damageBonus`) collides with an unrelated reader.
- **Critical handling already has three channels in the canonical runtime** (`criticalEffects` incl. `add-damage-after-critical-multiplication`, a multiplier resolver, `system.critRange`). Item modifications touch only `system.critRange`. v1.2's three-channel model maps onto existing authorities; it does not need a new combat engine.
- **Recommendation:** Phase 1 should be limited to a read-only `ModificationSlotAuthority` plus tests that pin the contradictions below, with no consumer rewiring until the migration decision in section 8 is made.

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
| C6 | **Base slot defaults disagree (1 / 2 / 3).** Engine `1`, Workbench legacy `weapon 2 / armor 3`, `template.json` `1`, lightsaber chassis default `3`. Pack data: `weapons.db` 188/207 have no `upgradeSlots`, 13 have `2`, 4 `1`, 1 `0`, 1 `3`; `weapons-lightsabers.db` 13/15 have `2`; all 133 armor and 142 equipment records have none. | pack census (section 10) | The "stock" slot count for an unannotated item is whichever fallback the consumer happens to use. |
| C7 | **`stockSlotOverride` has no writer.** It is read from `flags.foundryvtt-swse.customization.overrides.stockSlotOverride` only (`item-profile-resolver.js:63`; `PHASE-A-GUIDE.md`). No code in `scripts/` sets it. | grep | Dead input; either an intended migration hook or legacy. Needs a decision, not deletion. |
| C8 | **Slot-cost vocabulary.** `slotCost` (engine/catalog), `slotsUsed` (`system.installedUpgrades` entries and `UpgradeService`), `upgradeSlots` (item/JSON/lightsaber component), `slotCost` fallback in the Workbench is `?? 1` while the engine's is `?? 0`. | S2, S3, `UpgradeService.js:335`, `SafetyEngine.js:298` | A missing field means 0 in one authority and 1 in another. |
| C9 | **Published slot cost mismatch (repo vs KotOR OCR).** KotOR Campaign Guide Table 5-6 (OCR line 6972 ff.) lists *Improved energy cell* with upgrade-slot cost **2**; the repo uses **1** in `UPGRADE_CATALOG`, `data/upgrades/weapon-upgrades.json`. *Needs PDF confirmation before any change.* | KotOR OCR vs `upgrade-catalog.js:40` | Possible catalog error, or OCR misread. Not corrected here. |
| C10 | **Catalog gap.** `data/upgrades/*.json` contains entries absent from `UPGRADE_CATALOG` (e.g. *Missile Load*, *Droidification*, *Electrograpple Handle*, *Memory Upgrade*, *Miniaturized*, *Silverplate*, *Spring-Loaded*, *Recognition System*) and `UPGRADE_CATALOG` has no consumer of `data/upgrades/*.json` at runtime (only audit tools reference it). | `tools/census-item-ssot-phase-0.mjs:142,185` | Two catalogs of "published upgrades" that are not reconciled. |

## 3. Published slot rules (evidence and certification status)

Legend: **L** = legible in OCR, still needs PDF confirmation. **X** = illegible/garbled, cannot be asserted.

| Rule | Source / OCR location | Legibility | Repo agrees? |
|---|---|---|---|
| Items have a small number of upgrade slots; most stock items have a limited number; some upgrades take 0, 2 or more slots; slots can be gained by stripping or by size increase. | *Scum and Villainy*, "Upgrade Slots" / "Gaining Upgrade Slots" (OCR ≈ lines 2190-2215) | **X** (word-level garble; the headings are readable, the numbers are not) | Cannot be certified. The stock-slot number (the repo uses `1`) is not legible. |
| Stripping removes a feature and grants +1 slot; weapons strip damage / range / design / stun setting / autofire; armor strips defensive material / joint protection; DC 20 Mechanics, 8 h, cost = 50% of base cost *(as OCR best-reads)*; failure disables the item until repaired. | *Scum and Villainy*, "Stripping Equipment/Weapons/Armor" (≈ lines 2212-2290) | **X** (partially legible) | Repo implements `DC 20`, `8 h`; cost rule not re-verified in this phase. |
| Size increase grants +1 slot; heavy armor cannot increase weight class. | *Scum and Villainy*, "Equipment Size" | **X** | Repo: `+1`, heavy armor blocked (`upgrade-slot-engine.js:90-93`). |
| Powered armor (light and others) has **2 free upgrade slots** when using the *Scum and Villainy* equipment modification rules. | KotOR Campaign Guide, OCR lines 6563-6565 and 6601 ("light powered armor has 2 free upgrade slots (as does all powered armor)") | **L** | Repo: `isPoweredArmor → 2` (S1). Consistent, provided `isPoweredArmor` is set correctly (`item-profile-resolver.js:170`). |
| Cybernetic prosthesis: 1 free slot; limited universal upgrades. Unique cybernetic systems: **no** slots, none reclaimable. | *Galaxy at War*, OCR lines 4657-4659, 4741-4742 | **L** | **Out of scope** (droid/cybernetic). Recorded so Phase 1 does not give cybernetics a default of 1. |
| Componentization: Basic = 1 slot, Deluxe = 2 slots. | *Galaxy of Intrigue*, OCR line 6367 | **L** | Matches `UPGRADE_CATALOG` (`componentization_basic` 1, `_deluxe` 2). |
| Weapon/armor accessory slot costs (Table 5-6): armor reinforcement 1, beam splitter 2, durasteel bonding 1, enhanced energy projector 1, hair trigger 1, improved energy cell **2**, mesh underlay 2, tremor cell 1. | KotOR Campaign Guide OCR ≈ lines 6967-6985 | **L** | Matches except **Improved Energy Cell (C9)**. |
| "Most pieces of equipment can have only one accessory, though GMs might allow more." | KotOR Campaign Guide, same table intro | **L** | No repo enforcement of a one-accessory cap in the standard flow. *Whether this interacts with slot accounting is a rules question for the architects.* |
| Lightsaber construction: base accessory allowance and Masterwork Lightsaber ("add one extra accessory at the time of creation"). | *Jedi Academy Training Manual*, OCR ≈ line 1610 | **L** (feat text); the base accessory count is not located in this phase | Repo: chassis `upgradeSlots` or constant `3` (S9). **The published base is not verified here.** Note `Masterwork Lightsaber` is a different mechanism from Tech Specialist's `+1` (S9); the repo grants the latter, not the former. |

**Not located in this phase:** the published stock slot count for ordinary weapons, armor and equipment; any rule giving lightsabers general (non-accessory) upgrade slots; the Tech Specialist slot rule's exact wording. These must come from the PDFs.

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

`flags.foundryvtt-swse.customization.{structural,installedUpgrades,appliedTemplates,operationLog,overrides}` · `system.installedUpgrades` · `system.upgradeSlots` · `system.sizeIncreaseApplied` · `system.gearTemplate(Secondary)` · `flags.swse.{blasterUpgrades,meleeUpgrades,armorUpgrades,gearMods,appliedTemplates,customizationStructural}` · `flags.swse.techSpecialist.*` · `flags.{foundryvtt-swse,swse}.alchemy` · `flags.{foundryvtt-swse,swse}.lightsaberConfig` · `system.modifiers` · and the direct stat keys listed in §5. `SafetyEngine.normalizeCustomizationState` (`safety-engine.js` ≈ lines 270-345) already merges the legacy `system.installedUpgrades` and the `flags.swse.*Upgrades` arrays into the canonical shape on read; this is the existing migration adapter.

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

1. Stock slot counts for ordinary weapon/armor/equipment; whether the repo's `1` is correct.
2. Whether lightsabers have general upgrade slots and the published base accessory allowance; whether Tech Specialist's `+1` (S9) is a published rule.
3. Improved Energy Cell slot cost (C9).
4. All numeric effects in `EffectResolver` (§5.1), including the `critRange` change of `hair_trigger`.
5. Die-step progression, critical-range caps/stacking, multiplier limits, nonmultipliable packets (v1.2 §9.1-2).
6. How multiple templates/alchemy/TS/upgrade bonuses stack by `bonusType` (v1.2 §9.2).
7. Whether the "one accessory per item" statement constrains slot accounting.
8. Armor template/size/strip interaction with powered armor (v1.2 §9.3).
9. Which upgrades are physical components vs abstract improvements (v1.2 §9.4).

## 8. Proposed Phase 1 contract (for approval; not started)

**Goal:** one read-only module that answers slot questions; no consumer is rewired; no data is migrated.

**Decision required before any code (the primary one):** how existing Item `system.upgradeSlots` values are interpreted — as **published stock base**, as **stock + structural bonuses already applied (the S5 write)**, or as **stock + Tech Specialist additions (S6)** — given the three writers already put different meanings into it. Recommended approach for review: treat `system.upgradeSlots` as *legacy projection only*; derive `baseSlots` from a certified base source and compute `capacityChanges[]` from the recorded instances (`structural`, `appliedTemplates`, TS trait records), so the legacy field is never re-added. This needs your sign-off because it changes which of C1/C2/C3 the new authority takes as correct.

**Proposed files (new, no existing file modified in Phase 1a):**

- `scripts/engine/customization/modification-slot-authority.js` — pure functions: `resolveSlotState(item, {domain})` → `{domain, base:{value, source, certified}, capacityChanges[], occupied[], remaining, conflicts[]}`. No `ActorEngine`, no `update`.
- `tests/modification-slot-authority.test.mjs` — see below.
- `docs/audits/weapon-modification-slot-authority-contract.md` — the certified contract once approved.

**Phase 1b (separate approval):** make `UpgradeSlotEngine.getSlotAccounting` delegate to the authority, fix C4 (`getSlotUsage` field names), and remove the Workbench's own addition (S3/S4), still without migrating stored data.

**Acceptance tests proposed for Phase 1a** (pins current behavior, then asserts the authority resolves each case deterministically):

1. Stock item with no `system.upgradeSlots` → base from the declared source; marked uncertified where unverified.
2. C1: item with `system.upgradeSlots = 3`, no structural → engine, Workbench and authority report the same total.
3. C2: item after `applySizeIncrease` → total equals stock+1, not stock+2.
4. C2: item after two strips → stock+2.
5. C3: Tech Specialist slot trait counted once, attributable to a recorded instance.
6. C4: `UpgradeService.getSlotUsage` returns the authority's `used/total`.
7. C5: hard-coded 10 is gone from the validation path or replaced by the authority total.
8. C8: missing `slotCost` is treated identically by every caller (decision needed: 0 or 1).
9. Powered armor base = 2, non-powered armor does not inherit it, forged `isPoweredArmor` on a non-armor item is ignored.
10. Lightsaber: chassis/crystal/accessory pools reported separately; general-upgrade pool `unknown` until certified.
11. Overflow is reported as a conflict, never silently clamped.
12. No call to `ActorEngine`/`update`/`setFlag` (static guard).

**Out of scope for Phase 1:** schema migration, `WeaponModificationEngine`, `EffectResolver` changes, Workbench catalog reconciliation, droid/vehicle/cybernetic slots.

## 9. Decisions requiring approval, and where the missing handoff sections could change this audit

1. **`system.upgradeSlots` interpretation** (section 8). Highest priority.
2. **Which catalog is authoritative** for the Workbench (`UPGRADE_CATALOG` vs the disjoint `scripts/data/*-upgrades.js`/`gear-mods.js`). Recommendation: the Workbench consumes `UPGRADE_CATALOG`; the 28 other entries are classed **B/E** pending a decision on whether they are shipped content. I did not determine their provenance.
3. **Missing `slotCost` default** (0 vs 1).
4. **`stockSlotOverride`** (C7): retain as the migration hook, or retire.
5. **Disposition of `UpgradeService.applyUpgrade`** (third install shape): reroute to `InstallRemoveEngine` in Phase 2.
6. **Confirm C9 (Improved Energy Cell)** against the PDF.
7. Anything in the handoff sections that were not received (the 84 KB document minus the 42 KB v1.2 schema) on: the locked slot-authority audit, the Phase 1 contract, resolved sourcebook questions. **If that document already settles items 1-4, this audit should be reconciled to it rather than the other way round.**

## 10. Validation and method

Run on branch `claude/weapon-modification-roadmap-iq4c8w` at `9cca145`:

- `node tests/workbench-inline-structural-flattening.test.mjs` — passed
- `node tests/weapon-phase-5d-i-d-b3-upgrades.test.mjs` — 18 checks OK
- `node tests/phase-2b-closure-fixes.test.mjs` — passed
- `node tools/validate-partials.mjs` — passed
- `node tools/validate-data.js` — passed
- `system.json` parses

Method notes:

- Catalog overlap: a throwaway Node script (kept in the session scratchpad, not committed) loaded `UPGRADE_CATALOG` and the four Workbench catalogs and compared by key and by normalized name. Result: blaster 4/4, melee 6/6, armor 10/10, gear 8/8 absent from `UPGRADE_CATALOG`.
- Pack census: counted `system.upgradeSlots` values in `packs/{weapons,weapons-lightsabers,armor,armor-light,armor-medium,armor-heavy,equipment}.db`.
- Sourcebook text was searched in `reference/sourcebooks/*.txt` only; no PDF was consulted.
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

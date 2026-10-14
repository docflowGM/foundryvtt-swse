# Modification System — Legacy Implementation Inventory (for V2 replacement planning)

**Status:** audit only. Nothing here changes, deletes or rewires any file. Companion to `docs/audits/modification-v2-replacement-architecture.md`.
**Baseline:** `origin/main` `23f6ca4148a6829f8cfdd727987a015c4977408a` (G1 merged).
**Purpose:** replacement planning under the owner's clean-replacement direction. It is not a compatibility inventory: no entry is kept merely to support prerelease character data.

## 1. Method and limits

- Importers were found by a static search of `scripts/`, `tests/`, `tools/`, `templates/` and `index.js` for the module's `scripts/…` path (or a `./name` import from a sibling), ignoring comment lines. This is **approximate**: dynamic `import()` with computed paths, Handlebars/Foundry registration by string, hooks and macros are not detected. "0 importers" therefore means *no static importer found*, not *proven dead*.
- Filename-only matching was rejected after it produced false positives (for example `scripts/engine/abilities/active/effect-resolver.js` and `scripts/engine/progression/engine/template-engine.js` are different files from the customization modules of the same name, and `combat-stat-rules.js` only mentions two modules in comments).
- "Certification" below uses the v1.5 registry's vocabulary: whether the behavior the file implements matches a source-verified rule. Where I could not establish that from the audits already merged (Phase 0, compliance audit) I say **unverified**, never assumed.
- Line counts are from the current tree. I read the earlier audits' findings rather than re-tracing every file; entries marked **needs trace** have not been traced end to end.
- **Droid, vehicle and starship modification code is out of scope** (owner direction). It is listed only where it shares a file or consumer with in-scope code.

Dispositions: **RETAIN** (keep as is), **REFACTOR** (keep the file's role, change what it reads or writes), **REPLACE** (a new V2 component supersedes it; delete later), **DELETE-CANDIDATE** (no static importer; delete after a dynamic-use check and owner authorization), **OUT-OF-SCOPE**, **NEEDS-TRACE**. No disposition is an instruction to delete anything now.

## 2. Authorities the V2 system must reuse (not duplicate)

| Responsibility | Existing authority | Location |
|---|---|---|
| Actor and owned-item mutation | `ActorEngine` (`updateOwnedItems`, etc.) | `scripts/governance/actor-engine/actor-engine.js` |
| Credit and trade transactions | `TransactionEngine` (store) | `scripts/engine/store/transaction-engine.js` |
| Modifier aggregation for actor/skill/defense stats | `ModifierEngine` | `scripts/engine/effects/modifiers/ModifierEngine.js` |
| Feat/talent/ability legality | `AbilityEngine` | `scripts/engine/abilities/AbilityEngine.js` |
| Attack, damage, critical, weapon profile math | `combat-roll-math.js`, `combat-stat-rules.js`, `weapons-engine.js`, `scripts/items/weapon-runtime/*` | `scripts/engine/combat/`, `scripts/items/weapon-runtime/` |
| Command dispatch | `CommandBus` | `scripts/engine/core/CommandBus.js` |
| Slot capacity (read-only) | `ModificationSlotAuthority` (Phase 1a, merged, unwired) | `scripts/engine/customization/modification-slot-authority.js` |
| Canonical research data and validation | v1.5 snapshot, manifest, validator (G1, merged) | `data/audits/…`, `tools/validate-modification-registry.mjs` |

## 3. Engines and services

| File | Lines | Static importers (runtime) | What it does today | Definitions it owns | Duplicates | Certification | Target owner | Disposition |
|---|---|---|---|---|---|---|---|---|
| `engine/customization/upgrade-catalog.js` | 119 | 5: customization `index`, eligibility, install-remove, template-engine, restriction-propagation | `UPGRADE_CATALOG` (71 keys with slot cost, price, `appliesTo`, restriction) and `TEMPLATE_CATALOG` (7) | 71 upgrades, 7 templates | `scripts/data/{blaster,melee,armor}-upgrades.js`, `gear-mods.js`, `data/upgrades/*.json`, `data/gear-templates.json` | **Mixed / partly wrong**: compliance audit found Overload Switch cost, Improved Energy Cell slots, Componentization/Flash Suppressor unstated values stored as `0`, eight Scum rows absent | Generated V2 runtime definitions | REPLACE |
| `engine/customization/upgrade-slot-engine.js` | 119 | 3: workflow, `index`, item workbench | Slot accounting: stock base, strip list (`getStrippableAreas` trait heuristic), size increase, `canStripArea` | none (logic) | `modification-slot-authority.js`, workbench slot math, `SafetyEngine` cap, `UpgradeService.getSlotUsage` | **Contradictory** (Phase 0 C1–C11); trait heuristic is not rules evidence | `ModificationSlotAuthority` | REPLACE |
| `engine/customization/structural-change-engine.js` | 199 | 2: workflow, `index` | Applies size increase / strip by writing `system.upgradeSlots`, `system.armorType` and the canonical `structural` flag | none | Workbench `structural` writes | **Unverified**: strip/size mechanics are outline-only in v1.5 (`sv-stripping-item`, `sv-increase-size`) | V2 structural procedures (blocked on rules) | REFACTOR (strip stays deferred) |
| `engine/customization/install-remove-engine.js` | 252 | 2: workflow, `index` | Install/remove orchestration; writes canonical `installedUpgrades`, mirrors a summary to `system.installedUpgrades`, applies `EffectResolver` stat keys directly; removal does not reverse stat keys | none | `UpgradeService.applyUpgrade`, workbench `_applyCurrentItem` | **Unverified** (`sv-install-remove-upgrade` is outline-only) | V2 install service via `TransactionEngine` + `ActorEngine` | REPLACE |
| `engine/customization/customization-workflow.js` | 262 | 2: `UpgradeService`, `index` | Orchestrates eligibility → slots → install; the "standard path" | none | Workbench, `UpgradeService` | Unverified | V2 install service | REPLACE |
| `engine/customization/safety-engine.js` | 529 | 5: workflow, workbench, install-remove, template-engine, slot-engine | Normalizes customization state, merges legacy arrays, hard-coded 10-slot cap, recovery of strips from `system.strippedFeatures` | none | Phase 1a resolver (read side) | **Defective** for accounting (Phase 0 C5) | None needed after cutover (legacy recovery is no longer a requirement) | REPLACE, then delete |
| `engine/customization/effect-resolver.js` | 502 | 2: install-remove, template-engine | Maps upgrade keys to `system.*` stat mutations | effect numbers for ~70 keys | `ModifierEngine`, weapon runtime | **Contradicts** certified KOTOR text for 8 accessories (compliance audit 5.C); 3 keys write unread fields | Existing effect authorities, only for MECHANIC_SPECIFIED effects | REPLACE, then delete |
| `engine/customization/template-engine.js` | 124 | 3: workflow, `index`, restriction-propagation | Applies templates as metadata (`appliedTemplates`, `system.restriction`); no effect is consumed | `TEMPLATE_CATALOG` consumer | `gear-templates-engine.js` | Metadata only; KOTOR stacking governance is certified (`kotor-gear-template-governance`), three Legacy Era templates are flagged (D-010, `PENDING_SOURCE_VERIFICATION`) | V2 template handling | REPLACE |
| `engine/customization/upgrade-eligibility-engine.js` | 113 | 2: workflow, `index` | Checks `appliesTo`/restriction from `UPGRADE_CATALOG` | none | Workbench does not call it (Phase 0 D8) | Unverified host rules | V2 eligibility from certified host facts (blocked on rules/evidence) | REPLACE |
| `engine/customization/item-profile-resolver.js` | 195 | 3: workflow, `index`, workbench | Normalizes an item to category, traits, `customizable`; powered armor falls back to a **name regex** | none | weapon-runtime `canonical-identity.js` | **Forbidden inference** (names) | Host-fact resolver on canonical identity | REFACTOR |
| `engine/customization/customization-cost-engine.js` | 45 | 3: workflow, `index`, workbench | Price computation for upgrades | none | `TransactionEngine` | Unverified; cost `0` used for unstated prices | Price tagged union + `TransactionEngine` | REPLACE |
| `engine/customization/restriction-model.js` | 24 | 6 (all inside customization) | Restriction value object | none | — | n/a | Folded into registry `eligibility` fields | REPLACE |
| `engine/customization/restriction-propagation-engine.js` | 215 | 0 | Propagates restrictions from upgrades/templates | none | — | n/a | — | DELETE-CANDIDATE |
| `engine/customization/index.js` | 10 | 0 static | Barrel export | none | — | n/a | — | DELETE-CANDIDATE (with its module set) |
| `engine/customization/modification-slot-authority.js` | 1113 | 0 (by design) | Phase 1a read-only resolver | none | — | Source-certified baselines; unwired | Becomes the single slot authority | RETAIN |
| `engine/customization/tech-specialist-modification-service.js` | 764 | 2: customization bay, workbench | 39 Tech Specialist traits, legality, signature device, direct stat writes, flags | 39 traits (9 certified in-scope, 14 uncertified Superior Tech, 1 unverified device slot, 15 droid/vehicle) | registry `tech_specialist` family | Partly certified (9); the rest preserved, **not expanded** | Specialization consumer of the catalog | REFACTOR (droid/vehicle traits OUT-OF-SCOPE) |
| `engine/upgrades/UpgradeService.js` | 749 | 3: `UpgradeCommands`, `upgrade-app`, `PanelContextBuilder` | Third install shape (`system.installedUpgrades` only), slot usage reading nonexistent fields, droid/vehicle branches | none | workflow, workbench | Defective (Phase 0 C4) | V2 install service; droid/vehicle branches split out | REPLACE for items (droid/vehicle OUT-OF-SCOPE) |
| `engine/upgrades/UpgradeCommands.js` | 36 | 1: `CommandBus` (`applyItemUpgrade`) | Command wrapper over `UpgradeService` | none | — | n/a | `CommandBus` command re-pointed to V2 service | REFACTOR |
| `engine/crafting/lightsaber-construction-engine.js` | 979 | 3: character sheet, lightsaber router, workbench | Lightsaber chassis + one crystal + accessory array; writes `lightsaberConfig`, copies `system.modifiers` | crystal/accessory use | `phase-3-advanced-crystal-system.js` | Core + JATM rules partly certified; accessory allowance flagged ambiguous | Specialization consumer; legality retained | REFACTOR, NEEDS-TRACE (pack generator not located) |
| `engine/crafting/phase-3-advanced-crystal-system.js` | 445 | 0 | Advanced crystal handling | crystal logic | lightsaber engine | n/a | — | DELETE-CANDIDATE |
| `engine/crafting/modification-intent-builder.js` | 253 | 0 | Builds modification intents | none | — | n/a | — | DELETE-CANDIDATE |
| `engine/crafting/blaster-customization-engine.js` | 54 | 0 | Blaster customization stub | none | — | n/a | — | DELETE-CANDIDATE |

## 4. Applications, UI and shell integration

| File | Lines | Runtime importers | Role | Disposition |
|---|---|---|---|---|
| `apps/customization/item-customization-workbench.js` | 3684 | 3: `WorkbenchSurfaceAdapter`, `HomeSurfaceService`, `item-customization-router` | The main workbench: UI, own slot math (`_getSlotState`), own strip rules (`_getStrippableAreas`, different from the engine's), own catalogs, commits through `TransactionEngine` with legacy flag mirrors | REPLACE with a thin V2 workbench over the catalog, slot authority and install service |
| `apps/customization/customization-bay-app.js` | 1185 | 1: `follower-droid-garage-hotfix` (plus shell adapter by other paths) | Bay UI mixing item, Tech Specialist, droid and vehicle customization | REFACTOR: item part replaced; droid/vehicle part OUT-OF-SCOPE; split first |
| `apps/customization/item-customization-router.js` | 186 | 12 (item sheet, character sheet, shell overlay, store, wrappers) | Opens the workbench for an item | REFACTOR (re-point) |
| `apps/customization/customization-router.js` | 16 | 0 by path | Thin wrapper over the item router | DELETE-CANDIDATE |
| `apps/customization/customization-workbench-app.js`, `raw-customization-workbench-app.js`, `unified-customization-workbench.js`, `unified-workbench-integration.js`, `index.js` | 46 / 34 / 35 / 48 / 29 | 1 each (barrel) | Shim apps that re-export or delegate to the workbench | DELETE-CANDIDATE after routers are re-pointed |
| `apps/upgrade-app.js` | 267 | 1: `items/swse-item-sheet.js` | Item-sheet upgrade app using `UpgradeService` | REPLACE |
| `apps/gear-templates-engine.js` | 160 | 1: workbench | Template application over `scripts/data/gear-templates.js` | REPLACE |
| `apps/force-alchemy/*` (5 files) | 490 / 1362 / 774 / 438 / 440 | workbench app: 6 (sheets, talent actions, `index.js`) | Sith/Force Alchemy ritual workbench, state, mechanics, context | NEEDS-TRACE; RETAIN as a specialization with its own legality |
| `apps/vehicle-modification-manager.js` | 540 | 1: `store-checkout` | Vehicle modifications in the store | OUT-OF-SCOPE |
| `ui/shell/WorkbenchSurfaceAdapter.js`, `CustomizationSurfaceAdapter.js`, `HomeSurfaceService.js`, `ShellSurfaceRegistry.js`, `ShellOverlayManager.js`, `ShellHost.js`, `sheets/v2/context/PanelContextBuilder.js` | — | — | Holopad shell surfaces that host the workbench and upgrade surface | RETAIN, re-point to V2 components |
| Templates: `templates/apps/customization/*`, `templates/apps/unified-customization-workbench.hbs`, `templates/apps/upgrade/*`, `templates/shell/partials/surface-{customization,workbench,upgrade}.hbs`, `templates/apps/force-alchemy/*` | — | — | Views for the above | REPLACE with V2 workbench templates; delete with their apps |
| Styles: `styles/apps/{customization-bay,item-customization-workbench,unified-customization-workbench,upgrade-app,modification-modal-shell,force-alchemy-workbench}.css`, `styles/system/app-responsive-{customization-bay,force-alchemy}.css` | — | — | Styling | Follow their apps; delete with them (remove CSS imports and preloads at the same time) |

## 5. Data and catalogs

| File | Records | Runtime importers | Duplicate of | Disposition |
|---|---|---|---|---|
| `scripts/data/blaster-upgrades.js` | 41 lines | workbench | `UPGRADE_CATALOG`, registry weapon upgrades | REPLACE |
| `scripts/data/melee-upgrades.js` | 68 lines | workbench, slot engine, safety engine | same | REPLACE |
| `scripts/data/armor-upgrades.js` | 77 lines | workbench, slot engine, safety engine | registry armor upgrades | REPLACE |
| `scripts/data/gear-mods.js` | 85 lines | workbench, slot engine, safety engine | registry universal/equipment upgrades | REPLACE |
| `scripts/data/gear-templates.js` | 7 templates | `gear-templates-engine`, 2 tools | `TEMPLATE_CATALOG`, `data/gear-templates.json`, registry `published_template` (26) | REPLACE |
| `data/gear-templates.json` | 30 templates | none found | the two above | DELETE-CANDIDATE (evidence only) |
| `data/upgrades/{weapon,armor,universal}-upgrades.json` | 23 / 29 / 19 | none found (census tools only) | registry Scum rows | DELETE-CANDIDATE (evidence only) |
| `scripts/data/lightsaber-crystals-map.js` | 28 crystals | none found | `packs/lightsaber-crystals.db`, registry (34) | NEEDS-TRACE (owner: trace the authoritative writer first) |
| `packs/lightsaber-crystals.db`, `packs/lightsaber-accessories.db` | 28 / 10 | compendium | registry `lightsaber_crystal` (34), `lightsaber_accessory` (10) | NEEDS-TRACE; do not hand-edit; fix at the generator |
| `scripts/data/droid-modifications.js`, `data/vehicle-modifications/*` | — | — | — | OUT-OF-SCOPE |
| `data/store/equipment-store-descriptions.json`, `tools/fix-equipment-data.js` | — | pack builder | — | RETAIN as upstream producers of equipment text (content corrections are a separate, owner-reviewed track) |

## 6. Consumers that read modification results (the dependency that makes deletion risky)

- **Combat** reads installed-upgrade effects only through fields the legacy `EffectResolver` writes (`system.attackBonus`, `system.flatDamageBonus`, `system.critRange` and similar). Deleting `EffectResolver` removes those effects until V2 effect projection exists (Phase 0 §5). `combat-stat-rules.js` and the lightsaber attunement/crystal records have their own reads; they are not modification-catalog consumers and stay.
- **Store** (`store-main`, `store-checkout`) opens the workbench and the vehicle modification manager.
- **Item and character sheets** open the workbench or the upgrade app (`swse-item-sheet.js`, `character-like-sheet.js`).
- **Shell** surfaces (`ShellSurfaceRegistry`, adapters) host the workbench inside the Holopad.
- **`CommandBus`** exposes `applyItemUpgrade`.

## 7. Tests tied to legacy structure

`tests/customization-bay-*.test.mjs` (5), `tests/workbench-*.test.mjs` (4), `tests/weapon-phase-5d-i-d-b3-upgrades.test.mjs`, `tests/droid-customization-exploit.test.mjs` (out of scope), `tests/lightsaber-accessory-attack-provenance-safety.test.mjs`, and tests that import `CustomizationWorkflow` and the eligibility engine. Their fate follows the component they cover: UI contract tests are deleted or rewritten with the UI; rule-bearing tests (the B3 compatibility test, lightsaber provenance) are reviewed and either kept against the V2 behavior or replaced by an equivalent V2 test **before** the legacy code is removed.

## 8. Findings that matter to the replacement

1. **Nine overlapping definition sources** exist: `UPGRADE_CATALOG`, `TEMPLATE_CATALOG`, `blaster-upgrades.js`, `melee-upgrades.js`, `armor-upgrades.js`, `gear-mods.js`, `scripts/data/gear-templates.js`, `data/gear-templates.json` and `data/upgrades/*.json`. None is rules-certified end to end.
2. **Effects are baked into Item fields at install time** and are not reversed on removal. The V2 design replaces this with computed projections.
3. **The install/remove procedure itself is only an outline in v1.5** (`sv-install-remove-upgrade`: DC, time, scratch-built cost, failure and removal consequences are not certified), as are strip and size-increase (`sv-stripping-item`, `sv-increase-size`). The V2 install flow therefore cannot automate those rules until the published pages are examined and certified (register D-001, D-002, D-003, classified `PENDING_SOURCE_VERIFICATION`, not owner-decision items unless the examined text is ambiguous). Until then the interface is read-only planning (architecture document section 9.2).
4. **Dead or dormant code** exists (six files with no static importer, plus the unused barrels), which can be removed only after a dynamic-use check.
5. **Droid and vehicle code shares files** with in-scope code (`UpgradeService`, `customization-bay-app.js`), so those files must be split before the in-scope parts are replaced.
6. **Unresolved upstream tasks** (lightsaber pack generator, Force Alchemy trace) must complete before their consumers can be dispositioned.

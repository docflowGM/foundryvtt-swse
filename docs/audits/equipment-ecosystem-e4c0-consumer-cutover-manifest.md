# Equipment Ecosystem — E4-C0 Consumer Cutover Manifest

**Status:** actionable manifest for the proposed E4-C1 convergence work; documentation only. Nothing here changes code. E4-P1, P2, P3 and P5 are approved (with amendments); **E4-P4 is revised in E4-C0-C1 and awaits owner approval**; E4-C1 is not authorized. See `docs/architecture/equipment-ecosystem-e4c0-ssot-persistence-contract.md`.
**Baseline HEAD:** `7ddbe32d2f4f74fed2ec2a3057f469a23084cf74`. **Method:** the verified E3-A4 / E0 consumer matrix (137 cited locations re-checked at HEAD), re-grepped at this HEAD with two passes — a narrow pass (`system.equipped`, `.equipped`, `isEquipped`, `equippable`, `isItemEquipped`, `isAlwaysReadiedWeapon`, `autoEquipped`, `dualWielded`, `wieldedTwoHanded`, `.readied`: 84 files) and a wide pass (any whole-word `equipped`/`isEquipped`/`isOffhand`/`offhand`: 122 files) — plus targeted line inspection of every file whose role was not obvious. Every path below exists at HEAD (verified by script).

**Roles used:** **P** reads effective posture (`resolveEffectiveEquipmentPosture`) · **A** reads separate activation · **O** occupancy (E3-A2) · **G** grip (E3-A3 / `resolveWielding`) · **C** combat permission (existing authority) · **N** nonweapon authority, unchanged.
**Weapon vs armor/shield:** `system.equipped` remains the worn state of armor, shields and equipment (e.g. `isArmorItemEquipped`, EncumbranceEngine, implants). Only **weapon** Items move to `weaponPosture`/`weaponOccupancy`. No global ban on `system.equipped` is proposed.

## 1. New files (E4-C1)
| New file | Purpose |
|---|---|
| `scripts/engine/equipment/equipment-state-coordinator.js` | the single writer of weapon posture/occupancy/posture-relevant fire state; executor-routed intents, dedup, per-actor FIFO queue, permission and stale-basis checks, field-scoped write, verify, conditional inverse-patch compensation (contract §4). Includes the GM-authoritative executor and socket relay handler (reusing the existing system socket channel and primary-GM seam; no new socket framework) |
| `scripts/engine/equipment/equipment-state-reader.js` | the only document-reading layer: Items/Actor → plain evidence for the pure resolvers (anatomy inputs, records, FS, species selection) |
| `scripts/engine/equipment/weapon-record-invariants.js` | pure validation of `weaponPosture`/`weaponOccupancy` (contract §3.2) |
| `scripts/engine/equipment/natural-weapon-binding.js` | pure verifier of the Item-to-species-record binding via reference + `baseProfileHash` (contract §5); not a live-content comparison |
| `tests/equipment-e4c1-*.test.mjs` | coordinator, reader, invariants, binding, cutover guards (§5) |

## 2. Existing files that change (weapon cutover)
Columns: file (matrix id) · old authority → future authority · modification · tests to add or update.

### 2.1 Schema, defaults and creation
| File | Old → new | Modification | Tests |
|---|---|---|---|
| `template.json` (weapon template `:570-621`) | `equipped`, `dualWielded`, `wieldedTwoHanded` booleans → `weaponPosture` (default `STOWED`), `weaponOccupancy` | remove the three booleans from the weapon template only; add the two fields; armor/equipment templates untouched | schema guard (no weapon `equipped`); defaults test |
| `scripts/items/item-defaults.js` (6 refs) | weapon `equipped` defaults → template defaults | stop writing weapon `equipped`/grip booleans | defaults test |
| `scripts/engine/items/safe-item-factory.js` | writes `dualWielded: false`, `wieldedTwoHanded: false`, passes `equipped` through | remove weapon grip booleans; weapon creation gets only the new fields | factory test |
| `scripts/engine/equipment/equipment-normalizer.js` | derives `equipped`/`equippable.equipped` | triage: keep for equipment/armor; weapon branch must not emit `equipped` | normalizer test |
| `scripts/engine/progression/engine/equipment-engine.js` | starting weapons `equipped: weapon.equipped !== false` | starting weapons are created `STOWED` (owner confirms) | progression equipment test |
| `scripts/apps/progression-framework/shell/progression-finalizer.js` (A15) | starter lightsaber `autoEquipped` flags | drop `autoEquipped`; create `STOWED` via template default | finalizer test |
| `scripts/apps/follower-creator.js` | follower weapons `equipped: true` | remove; default `STOWED`; natural weapons via §2.7 | follower test |
| `scripts/apps/custom-item-dialog.js` | custom items `equipped: false` | triage: remove for weapon type | dialog test |
| `scripts/engine/combat/unarmed-attack-helper.js` | virtual unarmed weapon with `equipped: true` | unarmed strike is a virtual always-available attack, not a persisted weapon: make that an explicit named exception read by the weapon-selection authority (owner-approved explicit virtual-attack exception; U-1 closed) | unarmed test |
| `scripts/ui/chat/chat-interaction-bridge.js`, `scripts/patches/runtime-bugfix-hotfixes.js`, `scripts/sheets/v2/droid-actor-sheet.js` | droid-integrated weapon materializers write `equipped: true, integrated: true` | **droid refactor deferred:** only remove the weapon `equipped` write; no new droid authority; their readiness stays pending (E3-A5) | droid materialization test |

### 2.2 Writers (delete or reroute through the coordinator)
| File | Old → new | Modification | Tests |
|---|---|---|---|
| `scripts/engine/inventory/InventoryEngine.js` (A1,A3,A4,A6) | `equipMirrors` fan-out to 6 aliases; `setWeaponReadied`/`toggleWeaponReadied`/`drawAndActivateLightsaber` | delete `equipMirrors` for weapons; weapon entry points call the coordinator; Draw/Stow cost and Quick Draw via `resolveActionCost` unchanged; armor/shield branch (A2) unchanged; activation (A5) unchanged | `weapon-readiness-production-path`, `weapon-readiness-ui-contract` updated; new coordinator tests |
| `scripts/actors/base/swse-actor-base.js` (A8) | `setItemEquipped/equipItem/unequipItem/toggleItemEquipped` raw `system.equipped` | restrict to non-weapons or delete; weapons rejected | writer-bypass guard |
| `scripts/ui/inventory-handlers.js` (A9) | direct `system.equipped` toggles | reroute weapon rows to the coordinator | handler test |
| `scripts/ui/weapon-config-dialog.js`, `templates/ui/weapon-config-dialog.hbs` (A10) | legacy form writing `equipped`, `dualWielded`, `wieldedTwoHanded` | **delete** (only imported by A9) | reference guard |
| `templates/dialogs/entity/parts/body-weapon.hbs` (A11), `templates/items/base/item-sheet-old.hbs` | item-editor equip/grip checkboxes; legacy sheet template (no references found) | remove weapon equip/grip controls; delete `item-sheet-old.hbs` if unreferenced at E4-C1 | template guard |
| `scripts/items/swse-item-sheet.js` | form normalization incl. effect `application: 'equipped'` scope | weapon equip field removed; the effect-scope meaning of `'equipped'` for weapons requires effective `READIED` (owner-approved) | effect scope test |
| `scripts/apps/force-alchemy/force-alchemy-mechanics-service.js` (A13), `scripts/apps/force-alchemy/force-alchemy-context-resolver.js` | preserves/sets `system.equipped`, `equippable.equipped` on created items | triage: weapon-type results take the template default; non-weapon unchanged | alchemy test |
| `scripts/engine/crafting/phase-3-advanced-crystal-system.js` (A14) | writes/reads `equippable.equipped` to deactivate a saber | route through coordinator (stow) and activation separately; the read at `:158` uses effective posture | crystal test |
| `scripts/utils/lightsaber-light-sync.js` (A16) | `preUpdateItem` watches `equipped`/`active`/`equippable.equipped` | watch `weaponPosture` and activation only | light-sync test |

### 2.3 Predicates and weapon runtime
| File | Old → new | Modification | Tests |
|---|---|---|---|
| `scripts/items/weapon-branch-resolver.js` (C1–C3) | `isTruthyEquipState`, `isItemEquipped` (alias set incl. `active`), `isAlwaysReadiedWeapon` (flags) | retire `isItemEquipped` for weapons (armor keeps its own predicate); replace `isAlwaysReadiedWeapon` flag logic by the natural-weapon binding verifier (§2.7); no alias reader remains | `weapon-branch-classification-authority` updated; guard |
| `scripts/items/weapon-data-resolver.js` | reads legacy `dualWielded`/`twoHanded` | remove; grip comes only from `resolveWielding` | data-resolver test |
| `scripts/items/weapon-runtime/legacy-adapter.js`, `weapon-runtime-resolver.js` | pass `equipped` into owned state | drop weapon `equipped` from owned state | `weapon-runtime-registry-resolver` updated |
| `scripts/items/weapon-runtime/wielding-size.js` (`resolveHeldGroup`) | injected `equipped` predicate for held-together groups | inject effective-posture predicate | held-group test in `…-d-b2-wielding-size` |
| `scripts/engine/visuals/weapon-visual-profile-resolver.js` (F8) | own `isEquipped` incl. `carried` | read effective posture/activation | visuals test |
| `scripts/engine/combat/fire-state-store.js` | uses `isItemEquipped`; owns grip/stock/mount | keep FS ownership; replace predicate with effective posture; FS writes that coincide with a transition go through the coordinator | `weapon-phase-5d-g-fire-state-area-selectors` updated |

### 2.4 Combat readers (attack lists, Full Attack, reactions)
| File | Old → new | Modification | Tests |
|---|---|---|---|
| `scripts/combat/multi-attack.js` (D3) — `getEquippedWeapons`, `getOffhandWeapon` | narrow `system.equipped`, `isOffhand`/`slot` | **the weapon-selection choke point**: select READIED (effective) weapons; `isOffhand`/`slot` legacy markers replaced by occupancy-derived hand roles | `weapon-phase-5d-f-multiattack-convergence` updated |
| `scripts/engine/combat/full-attack-executor.js`, `scripts/engine/combat/combined-full-attack-planner.js`, `scripts/engine/combat/features/combat-feature-handlers.js`, `scripts/patches/combat-ui-behavior-hotfix.js`, `scripts/combat/rolls/enhanced-rolls.js` | consume `getEquippedWeapons` | follow the choke point; `enhanced-rolls` overrides keep working through it | full-attack tests |
| `scripts/engine/combat/CombatEngine.js` (D2) | `isEquippedWeaponItem`: 12 alias fields incl. `activated`, `status`, `state` | delete the alias set; first-attack-weapon selection uses effective posture | `attack-*` tests updated |
| `scripts/engine/combat/combat-stat-rules.js` (D5) | `isEquippedWeapon`, `actorHasEquippedPistol`, legacy `twoHanded` | effective posture; grip from `resolveWielding` | `attack-bonus-math-integrity` updated |
| `scripts/engine/combat/dual-wield-combat-shape-resolver.js` (D4) | `equippedWeapons`, `resolveOffhand`, `isItemEquipped` | occupancy-derived primary/off-hand; held group via effective posture | dual-wield tests |
| `scripts/engine/feats/core-attack-option-runtime-patches.js` (D6) | `isTwoHandedWeapon` from `twoHanded`/`wieldedTwoHanded`/`hands` | remove legacy booleans; use grip verdict | `weapon-phase-5d-i-a-core-attack-residuals` |
| `scripts/engine/combat/reactions/reaction-weapon-context.js` (D7), `scripts/engine/talent/lightsaber-talent-actions.js` (D8) | `isItemEquipped` (+ activation for Lightsaber Defense) | **P** for readiness + **A** for ignition; stowed canonical reaction weapons keep their separate counting | `weapon-phase-5d-i-c-c-reaction-defense` |
| `scripts/engine/combat/weapon-control-effects.js` (D9) | `equipped !== false` (undefined counts as wielded) | `weaponStillWielded` = effective READIED | `weapon-phase-5d-i-c-b-grapple-control` |
| `scripts/engine/combat/weapons-engine.js` (D10) | nested `equippable.equipped` for upgrade bonuses | effective posture | `weapons-engine-modifier-source-authority` |
| `scripts/engine/abilities/passive/passive-state.js`, `condition-evaluator.js` (D11) | `equipped !== false` / `=== true` | effective posture (one predicate) | passive/condition tests |
| `scripts/actors/v2/character-actor.js` (D13,D14) | `mirrorAttacks` via `isItemEquipped`; action mirror `sys.equipped === true` | attack list = effective READIED weapons + verified natural weapons | `character-actor-inventory-index-and-vehicle-skip` |
| `scripts/engine/poison/poison-engine.js` | weapon/natural-weapon checks by flags and name regex | natural-weapon check via binding verifier; remove name regex for readiness | poison test |

### 2.5 Sheets, row builders and templates
| File | Modification |
|---|---|
| `scripts/sheets/v2/character-like-sheet.js` (24 refs; `isEquippedForAttack`/`isEquipped` closures at `:1346`, `:6334`) | replace closures with the shared effective-posture view-model; attack gates and ammo/reload picks use it |
| `scripts/sheets/v2/character-sheet/concept-context.js` (includes `buildWeaponReadinessView`, E1: consume effective posture; Draw/Stow/Activate/Draw & Ignite controls keep their costs), `scripts/sheets/v2/context/PanelContextBuilder.js`, `scripts/sheets/v2/context/PanelTypeDefinitions.js`, `scripts/sheets/v2/context/RowTransformers.js`, `scripts/sheets/v2/shared/RowTransformerHelpers.js`, `scripts/sheets/v2/context/SCHEMA.js`, `scripts/sheets/v2/context/PANEL_REGISTRY.js`, `scripts/sheets/v2/context/PanelValidators.js` | one row model: `{posture, effective, activated}` for weapons; armor rows keep `equipped`; remove the five-alias `truthy()` copies |
| `scripts/sheets/v2/droid-sheet/context-builder.js` (E5), `scripts/patches/follower-npc-sheet-parity-hotfix.js` | weapon projections use the shared view-model; armor/equipment unchanged |
| `scripts/sheets/v2/actor-sheet-base.js` (E6) | render signature: replace `item.system.equipped` with `weaponPosture`, `weaponOccupancy` and the fire-state fingerprint |
| `templates/actors/character/v2/partials/inventory-weapon-card.hbs`, `inventory-item-row.hbs`, `v2-concept/partials/panels/inventory-item-row.hbs`, `inventory-item-card.hbs`, `templates/actors/character/v2-concept/partials/tabs/gear-tab.hbs`, `templates/actors/character/v2-concept/partials/tabs/combat-tab.hbs`, `v2/partials/equipment-ledger-panel.hbs`, `templates/actors/npc/v2/partials/npc-gear-panel.hbs` | weapon rows show STOWED/EQUIPPED/READIED + activation separately; draw/stow/ready actions call the coordinator; armor rows unchanged |

### 2.6 Caches, effects and advisory readers
| File | Modification |
|---|---|
| `scripts/actors/derived/defense-calculator.js`, `derived-calculator.js` (F2), `scripts/engine/effects/modifiers/ModifierEngine.js` (F3) | signatures include `weaponPosture`/`weaponOccupancy` and the fire-state fingerprint; armor alias parts unchanged |
| `scripts/dialogs/entity-dialog/effect-intent-engine.js` (F9) | `application: 'equipped'` for weapon-sourced effects = effective `READIED` (owner-approved) |
| `scripts/apps/customization/item-customization-workbench.js`, `scripts/engine/upgrades/UpgradeService.js` (F10), `templates/apps/upgrade/upgrade-app.hbs` | snapshot carries posture instead of `equipped`; read-only |
| `scripts/engine/suggestion/equipment-loadout-profile.js`, `scripts/engine/suggestion/equipment/weapon-investment-profile.js`, `scripts/engine/suggestion/equipment/weapon-scoring-engine.js`, `scripts/engine/suggestion/equipment/store-suggestion-context.js`; `scripts/engine/analysis/build-analysis-engine.js`; `scripts/engine/prestige/identity-engine.js`; `scripts/export/swse-export-model.js`; `scripts/debug/actor-contract-inspector.js`, `scripts/debug/item-editor-trace.js` | advisory/diagnostic readers: read effective posture for weapons (one helper); triage `identity-engine.js:1378` and `build-analysis-engine.js:593` for the item type before editing |

### 2.7 Natural-weapon materialization (contract §5)
`scripts/engine/progression/helpers/apply-canonical-species-to-actor.js` (write `flags.swse.speciesNaturalWeapon` including `baseProfileHash`), `scripts/species/species-grant-ledger-builder.js` (confirm `naturalWeapons[].id` reaches the materializer; `:1795`), `scripts/species/species-grant-reconciliation.js` (`hasMaterializerSignature`, `speciesGrantKey` use the exact reference instead of forgeable flags), `scripts/migration/migrate-species-to-structured-rules.js` (data source only; no change expected), `scripts/engine/effects/modifiers/StructuredRuleEvaluator.js` (`alwaysArmed` grant at `:414` — verify it does not mint weapons outside the binding).

## 3. Verified to stay (nonweapon or unrelated) — no cutover change
`scripts/items/armor-data-resolver.js` (F1, `isArmorItemEquipped`), `equipment-data-resolver.js`, `scripts/engine/encumbrance/EncumbranceEngine.js` (F4), `scripts/engine/talent/armor-talent-actions.js` (F5), `scripts/patches/armor-hydration-defense-hotfix.js`, `scripts/engine/suggestion/equipment/armor-scoring-engine.js`, `armor-suggestions.js`, `scripts/engine/implants/ImplantRules.js`, `ImplantEffectRules.js` (F7), `scripts/engine/equipment/equipment-skill-hook-resolver.js` (F6, equipment `requiresEquipped`), `scripts/talents/DarkSidePowers.js` (equipment talismans), templates `body-armor.hbs`, `body-item.hbs`, `armor-panel.hbs`, `armor-summary-panel.hbs` (v2 and v2-concept), `inventory-armor-card.hbs`, `scripts/governance/mutation/mutation-boundary-service.js` (comment), and false positives for `equippedQty` (`scripts/holonet/subsystems/holonet-messenger-service.js`, `scripts/apps/item-selling-system.js`). Armor/shield legacy-alias normalization (`normalizeArmorEquipState`) is a separate, later question.

## 4. Counts
Existing files to modify or delete in E4-C1: **83** distinct files in §2 (81 to modify or delete, plus 2 verify-only: `migrate-species-to-structured-rules.js`, `StructuredRuleEvaluator.js`); three are deletions (`scripts/ui/weapon-config-dialog.js`, `templates/ui/weapon-config-dialog.hbs`, and `templates/items/base/item-sheet-old.hbs` if still unreferenced). New files: 4 production + tests. Verified-stay files: §3.

## 5. Completion guards for E4-C1 (must fail validation on regression)
Static (repository-scanning, `git ls-files`) tests; each excludes armor/shield/equipment authorities by an explicit allowlist rather than a global `system.equipped` ban:
1. **No weapon combat consumer reads legacy equip state:** the §2.3–2.6 files contain no `isItemEquipped`, `system.equipped`, `isEquipped`, `equippable.equipped`, `flags.swse.equipped`, `autoEquipped` or `readied` reads on weapons (allowlist: armor/shield/equipment files in §3).
2. **Activation is never posture:** no weapon reader consults `active`/`activated`/`activation.active` to decide readiness; Lightsaber Defense reads posture **and** activation separately.
3. **One writer:** only the coordinator writes `system.weaponPosture`, `system.weaponOccupancy` or posture-relevant FS fields; any other `updateOwnedItems`/`update` carrying those keys, or `system.equipped` on a weapon, fails.
4. **No legacy grip boolean authority:** `dualWielded`, `wieldedTwoHanded`, `twoHanded`, `isOffhand`/`slot==='offhand'` do not appear as weapon grip inputs; `resolveWielding` is the only grip authority.
5. **Invalid assignments never accepted:** coordinator rejects unknown/duplicate/conflicting appendage ids, wrong count for the required hands, wield-purpose mismatch; readers surface `contradictory`/`blocked`, never default.
6. **No name inference:** no readiness, natural-weapon or appendage decision uses `item.name`, descriptions or regexes on them (poison-engine's name regex removed).
7. **Cache coherence:** a posture, occupancy or grip (fire-state) change alters the sheet, derived and modifier signatures (extend `v2-derived-panel-cache-coherency`).
8. **No contradictory authorities:** property test over generated states — the coordinator-written record and every migrated reader agree; the old predicates no longer exist.
9. **Coordinator behavior:** stale-basis rejection (`STALE_STATE`, nothing written or spent), serialized concurrent requests per actor, write failure → conditional compensation, compensation failure → `FAILED_PARTIAL` with path lists, spend rollback, verify-after-write, conflict plans require explicit confirmation (never auto-stow).
10. **Natural-weapon binding:** forged flags, wrong grant key, missing/duplicate record, `baseProfileHash` mismatch and name-only matches all stay unverified; a legitimately modified (non-identity fields) Item with an intact reference stays verified; only a materializer-written, independently re-verified reference yields a verified binding.
11. **Schema guards:** weapon template has `weaponPosture`/`weaponOccupancy` and no `equipped`/grip booleans; armor templates keep `equipped`.
12. **Existing suites** listed in §2 updated, not weakened; `weapon-runtime-builder-negative` allowlist updated explicitly for any new weapon-runtime importer.
13. **No snapshot restore in the coordinator:** the coordinator and its executor contain no `restoreFromSnapshot`, `SnapshotService` scope, `applyMutationPlan({transactional:true})` or `toObject()`-based whole-document write; a behavioral test proves compensation leaves a concurrently changed unrelated field (HP, credits, another Item's flags, an owned path changed by someone else) untouched.
14. **Field-scoped writes:** every coordinator Item update contains only the owned paths (`system.weaponPosture`, `system.weaponOccupancy`, named `flags.swse.fireState.*`, `flags.swse.equipmentState`).
15. **Executor routing and fail-closed:** non-GM callers route intents to the primary-GM executor; no active GM → `NO_AUTHORITATIVE_EXECUTOR` with zero writes; timeout → `EXECUTOR_TIMEOUT` (unknown); no caller writes owned paths directly.
16. **Deduplication:** a repeated `requestId` (in-memory map, and after executor reload via the Item `lastRequestId`) never spends or writes twice.
17. **Permission:** a requester without OWNER/GM authority is `REJECTED_PERMISSION`, re-checked per request.
18. **Honest outcomes:** every coordinator exit maps to one §4.6 status; no path claims atomicity.
19. **FireStateStore split:** FS exposes non-writing plan builders for posture-relevant fields and performs no Item write for them; the coordinator is the sole Item writer.
20. **Approved semantics:** starter weapons are created `STOWED`; the unarmed strike is an explicit virtual attack; a weapon effect with `application: 'equipped'` applies only at effective `READIED`.

## 6. Test inventory affected (33 test files mention equip state)
Armor/shield (keep): `armor-hydration-hotfix-shadow-authority-removal`, `armor-shield-acp-authority`, `energy-shield-defense-and-activation-authority`, `shield-recharge-skill-dispatch-authority`, `legacy-equip-state-single-pass-authority`, `garee-full-skill-derivation-parity`. Weapon (update): `attack-bonus-math-integrity`, `character-actor-inventory-index-and-vehicle-skip`, `equipment-skill-hook-roll-regression`, `v2-derived-panel-cache-coherency`, `weapon-branch-classification-authority`, `weapon-branch-family-schema-authority`, every `weapon-phase-5d-*` listed in §2, `weapon-production-mixed-resource-ammunition`, `weapon-readiness-production-path`, `weapon-readiness-ui-contract`, `weapon-runtime-registry-resolver`, `weapons-engine-modifier-source-authority`. E3 suites (`equipment-e3a*`) stay as the resolver contract.

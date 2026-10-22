# Equipment Ecosystem — E4-C1 WP4 Checkpoint: Legacy Weapon Writer Convergence (NOT CONVERGED)

**Phase:** WP4 only. WP3-B (remote transport), WP5–WP9 and convergence are not authorized and were not started.
**Branch / PR:** `audit/equipment-ecosystem-e0-e1` / draft PR #1056 · **Starting HEAD:** `cb2cec7be0137a3a85def3c9d5074f0f4dfab958` (CI run 39072141699 green).
**Statuses:** `IMPLEMENTED` + `OFFLINE_TESTED`; `RUNTIME_UNVERIFIED`; nothing `FOUNDRY_TESTED`. **NOT CONVERGED:** weapon readers (attack lists, Full Attack, reactions, view models, effects, light-sync item resolution) still read retired fields until WP5–WP8.
**EQ-001:** remains `DEFERRED_RULES_REVIEW` and unimplemented. The proposed house rule (Swift for a legal change between already-held configurations, Quick Draw not reducing it) is **not** implemented and not encoded anywhere; the coordinator still returns `DEFERRED_RULES_REVIEW` and writes and spends nothing for those transitions.

## 1. Writers removed or rerouted
| Writer | Action |
|---|---|
| `InventoryEngine.equipMirrors` (fan-out to `system.equipped`, `isEquipped`, `equippable.equipped`, `flags.swse.equipped`, `readied`, `active`, `activation.active`) | **deleted** |
| `InventoryEngine.setWeaponReadied` / `toggleWeaponReadied` / `toggleEquip` weapon branch | **rerouted** to the new `InventoryEngine.requestWeaponPosture`, which builds an explicit intent and calls `planEquipmentIntent` → `executeEquipmentIntent` (GM-local context). Stow is a complete intent; a draw without explicit appendages/grip returns `CHOICE_REQUIRED` with the options listed; nothing is fabricated. Draw/Stow cost and Quick Draw come from the coordinator's existing `resolveActionCost` path (Move; Swift with Quick Draw). |
| `InventoryEngine.drawAndActivateLightsaber` | no longer writes or spends: returns `COORDINATOR_SUPPORT_REQUIRED`. The published single-Swift draw-and-ignite needs a coordinator combined intent (see §5). |
| `InventoryEngine.setActivated` precondition (“draw before igniting”) | now asks the equipment-state reader whether the weapon is verified held (effective EQUIPPED/READIED with resolved species evidence); activation itself is unchanged and stays independent. Shield/armor activation keeps its worn-state check. |
| `SWSEActorBase.setItemEquipped` / `equipItem` / `unequipItem` / `toggleItemEquipped` | refuse weapons (`weapon-posture-owned-by-coordinator`); armor and equipment unchanged |
| `SWSEActorBase.updateOwnedItem` | rejects owned-weapon writes to posture, occupancy, retired equip/grip aliases and the grip choice (`flags.swse.fireState.wielded`) |
| `scripts/ui/inventory-handlers.js` (unreferenced anywhere) | **deleted** (its weapon toggle wrote `system.equipped`; its armor/equipment handlers were equally unreferenced dead code) |
| `scripts/ui/weapon-config-dialog.js`, `templates/ui/weapon-config-dialog.hbs` | **deleted** (wrote `equipped`, `dualWielded`, `wieldedTwoHanded`); allowlist line removed from `weapon-runtime-builder-negative.test.mjs` |
| `templates/items/base/item-sheet-old.hbs` | **deleted** (unreferenced legacy sheet with equip/grip checkboxes) |
| `templates/dialogs/entity/parts/body-weapon.hbs` | Equipped / Dual Wielded / Wielded Two-Handed checkboxes removed |
| `templates/dialogs/entity/parts/header.hbs` | the Equipped checkbox is limited to armor and equipment |
| `item-defaults.js` `normalizeItemSystem` | a sheet submit can never create or change a weapon's posture, occupancy or retired equip/grip keys |
| `phase-3-advanced-crystal-system.js` unstable-crystal “Deactivate weapon” | wrote `system.equippable.equipped:false`; now `InventoryEngine.setActivated(…, false, {free:true})` (an activation change, posture untouched) |
| `lightsaber-light-sync.js` hook | watch list now `system.weaponPosture`, `system.weaponOccupancy`, activation and light flags; it remains a visual consumer and writes no item state |
| `character-like-sheet.js` weapon handlers | forward the request and display the structured `message`; no state logic |
| force-alchemy (`-mechanics-service`, `-context-resolver`) | inspected: the only `system.equipped` writer is Sith **armor**, creation data is armor/equipment; no weapon writer exists. Unchanged. |
| droid-integrated weapon materializers | already stopped writing `equipped` in WP1; unchanged |

Coordinator adjustment found while migrating: `resolveActionCost` returns nothing when no feat mutates the cost, so the draw/holster default is the published **Move Action** (the same default the old path used). The coordinator now also **fails closed when authoritative species evidence is unavailable** for any posture that holds appendages (no provisional two-arm default); stowing needs no anatomy.

## 2. Remaining paths that still touch weapon state (not changed; reasons)
* `FireStateStore.setWielding` / `persistOwned` write the whole `flags.swse.fireState` record through `ActorEngine` — a **parallel writer of the grip choice** the coordinator also writes. Out of WP4's listed scope; resolved by the planned FireStateStore non-writing plan builders. `SWSEActorBase.updateOwnedItem` already rejects this path for generic callers.
* `unarmed-attack-helper.js` builds a virtual unarmed attack with `equipped: true` (never persisted; explicit virtual-attack exception belongs to WP5 weapon selection).
* Readers of retired fields (WP5–WP8): `weapon-branch-resolver` (`isItemEquipped`, `isAlwaysReadiedWeapon`), `weapon-data-resolver`, `weapon-runtime-resolver.readOwnedState`, `weapon-visual-profile-resolver` (so lightsaber token light will not light until it reads posture), combat-stat-rules, `core-attack-option-runtime-patches`, the crystal system's `#getEquippedLightsaber`, effect `application: 'equipped'` handling, view-model rows. Until migrated they see newly created weapons as unequipped.
* `CommandBus` `EQUIP_ITEM`/`UNEQUIP_ITEM` call an optional `engine.equipItem?.()` that no engine implements; no emitter exists. Not a writer; left for the macro-compatibility pruning decision.
* Armor/equipment `system.equipped` writers (InventoryEngine armor branch, force-alchemy armor, DarkSidePowers talismans, creation defaults) are preserved by design.

## 3. Tests
* New `tests/equipment-e4c1-wp4-writer-convergence.test.mjs` (13 checks): exact-allowlist static guards for retired aliases and for the single posture/occupancy writer; deleted modules and references; GM-local boundary (no socket/identity/fallback); delegation with journal PREPARED/APPLIED/FINALIZED and owned-path-only writes; armor/shield/equipment non-regression; actor-helper bypass attempts; missing choices, illegal grips, unknown appendages, EQ-001 and identity-carrying payloads write/spend/journal nothing; activation independence; pending transactions withholding readiness; non-GM rejection; Draw/Stow/Quick Draw cost authority; no rules in the inventory layer.
* `tests/equipment-e4c1-wp3a-coordinator.test.mjs`: +1 check (23) for the species-evidence fail-closed correction.
* **Migrated, not weakened:** `weapon-readiness-ui-contract.test.mjs` and `weapon-readiness-production-path.test.mjs` asserted the retired behavior (Draw/Stow flipping `system.equipped`, alias clearing, free direct Draw & Ignite). They now assert the coordinator contract with equal-or-stronger checks (owned-path-only writes, Move/Swift costs, journal phases, GM-only, no alias written, identity-uncertified refusal, Draw & Ignite unavailable). Their view-model assertions (which still read legacy state) are unchanged.
* `data/audits/weapon-phase-5d-h-closure-census.json` regenerated with its own tool (deleting the dialog changed three heuristic-site counts); the closure test is unchanged.
* Shared harness: `tests/helpers/equipment-coordinator-harness.mjs`.
* Full offline sweep (all new files staged): all pass except the five documented pre-existing force-power failures, unchanged. `node --check`, `validate-partials`, `validate-data`, JSON parse and `git diff --check` clean.

## 4. WP3-B dependencies (unchanged)
Authenticated request origin; executor authorization from that identity; single-executor coordination without assuming an atomic lease; multi-GM and multi-tab handling; explicit timeout/failover; offline protocol tests; post-merge Foundry certification. Until then player clients receive `REJECTED_NOT_GM` / `NO_AUTHORITATIVE_EXECUTOR` for any equipment change (accepted for the unmerged branch).

## 5. Proposed WP5 scope (for authorization; nothing started)
1. **Readers:** replace `isItemEquipped` / `isAlwaysReadiedWeapon` / legacy booleans in the combat selection chokepoint (`multi-attack.js`), Full Attack, dual wield, reactions, control effects, passive/condition readers, `combat-stat-rules`, `weapon-data-resolver`, `weapon-runtime` owned state and the visual-profile resolver with one effective-posture read helper over the equipment-state reader; unarmed strike as an explicit virtual-attack exception.
2. **FireStateStore:** non-writing plan builders for posture-relevant fields so the coordinator is the only Item writer.
3. **Coordinator:** a combined draw-and-ignite intent (single Swift via the existing combined-effect metadata, activation written by the activation authority inside the same journaled transaction) to restore the published action.
4. Effect scope `application: 'equipped'` ⇒ effective READIED; crystal `#getEquippedLightsaber`.
Then WP6 (sheets/view models/choice UI), WP7 (caches, natural-weapon binding), WP8 (guards), WP9 (convergence gate).

# Equipment Workspace — Authority Integration Map

Scope: Gear tab of the v2-concept character sheet. UI convergence only. No new equipment, anatomy, grip, readiness, attachment or modification engine was added.
Certification: `IMPLEMENTED`, `OFFLINE_TESTED` (static + view-model + layout QA). **Not `FOUNDRY_TESTED`.**

## What the UI consumes (read-only)
| Need | Authority |
|---|---|
| Anatomy / appendages | existing `resolveEffectiveAnatomy` output via `readActorEquipmentState` (view model in `equipment-workspace-context.js`) |
| Hand occupancy / grip | existing physical-occupancy and grip resolvers via the same state read |
| Drawn / Holstered / Activated, Can Attack | `readCombatReadiness`, `describeWeaponReadiness` (`engine/equipment/combat-readiness.js`) |
| Attack readiness / attack view | existing `buildAttackView` entries in `concept-context.js` |
| Placement verdict (Available / Requires change / Incompatible / Deferred / Indeterminate) | `planEquipmentIntent` (read-only plan) in `engine/equipment/equipment-state-coordinator.js`; mapped 1:1 by `verdictOfPlan` |
| Item taxonomy / tabs | existing gear groups (`categoryOfRow`: weapon/lightsaber, armor, energy-shield armor, implant, gear) |

## What the UI mutates (only through existing paths)
| Operation | Route |
|---|---|
| Place / draw into slot | `InventoryEngine.requestWeaponPosture` (coordinator-backed, journaled) |
| Stow blocking item | `InventoryEngine.setWeaponReadied(actor, id, false)` |
| Reload | `sheet._executeReloadCombatWorkflow` |
| Draw/holster, activate, configuration, power source, reconcile, attack, equip, implant install/activate, configure, force-alchemy, edit, open, sell, delete | existing sheet `data-action` handlers, unchanged |
| Modifications | existing `configure` action → `openItemCustomization` |
After success the UI calls `sheet.requestSurfaceRender`; it renders only after authoritative confirmation.

## UI-only state (no actor writes)
Selected slot/item, active tab, inspector pane, search text, show-incompatible toggle. Held on the sheet instance, applied by DOM updates, restored after render.

## Gaps and deferrals (nothing invented)
- **EQ-001 (`DEFERRED_RULES_REVIEW`)**: moving a drawn weapon between appendages/postures. Shown as "Deferred for rules review"; nothing is written.
- **GM-local execution only**: the coordinator's player request route is disabled and its identity mechanism is unverified, so placement submission is offered to the GM only; players see the verdicts.
- **Species evidence absent**: coordinator fails closed; weapons show "Indeterminate" plus a notice rather than a guessed default.
- **Grip choice** stays with the existing Draw flow (explicit appendages and grip are always `CHOICE_REQUIRED`).
- **Saved loadouts**: no saved-loadout infrastructure exists, so no loadout controls were added (gap recorded, per directive).
- Combat feats are not shown as weapon firing modes.

## Not verified
Live Foundry v13 rendering, real drag/scroll/focus preservation across a real `requestSurfaceRender`, real placement submission by a GM, portrait asset and icon loading. Layout QA rendered the real template with a real view model in Chromium, with only the placement module stubbed using replayed real verdicts.

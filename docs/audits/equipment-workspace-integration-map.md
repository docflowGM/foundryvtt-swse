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

## Visual layer (Holopad theme integration)
| Concern | Source reused |
|---|---|
| Colours, glow, fonts | Live sheet theme tokens written by `scripts/theme/actor-sheet-theme-registry.js` on the shell (`--vapor-cyan/-pink/-purple`, `--ink*`, `--screen*`, `--pos/--zero/--neg`, `--font-*`, `--glow-mult`), falling back to `styles/system/concept-surface-contract.css` (`--swse-concept-*`). The workspace defines no palette of its own and follows the per-actor theme (verified with Holo Blue, Vaporwave and Sith). |
| Panels | The sheet's `.swse-concept-panel` / `__header` / `__title` primitives; the workspace adds a frame and corner brackets on `::after` only. |
| Buttons | The sheet's `.swse-concept-btn` / `--primary` (notched like the Gear tab's Inventory Controls). |
| Icons | Font Awesome classes, as the sheet's own tab bar uses. |
| Artwork | Real item and actor art is shown. Foundry's generic core placeholders (`icons/svg/*`) and failed loads show a themed category glyph instead. Display only; item data is untouched. |

Replaced token aliases: the previous stylesheet read `--swse-concept-line` / `--swse-concept-text`, older stop-gap aliases in `v2-concept-sheet.css` derived from `--swse-accent`. Those resolve, but they ignore the per-actor theme. All references now go to the live tokens above.

Specificity note: the sheet styles bare `.swse-concept-main button` (pill radius, uppercase) and `.swse-sheet button`. Every workspace rule is rooted at `.swse-eqw`, so it wins locally without editing global sheet CSS.

Defect fixed: `scripts/sheets/v2/context/RowTransformers.js` defaulted missing item art to `/images/icons/svg/mystery-man.svg`, which does not exist in Foundry, so those images broke on every inventory surface. It now uses Foundry's real core path, `icons/svg/mystery-man.svg`.

## Not verified
Live Foundry v13 rendering, real drag/scroll/focus preservation across a real `requestSurfaceRender`, real placement submission by a GM, portrait asset and icon loading. Layout QA rendered the real `gear-tab.hbs` with a real view model in Chromium, inside the real sheet ancestry classes, with every stylesheet in `system.json`, the theme registry's inline tokens, the system fonts and Font Awesome. Only the placement module was stubbed, replaying real coordinator verdicts. This is not a Foundry runtime test.

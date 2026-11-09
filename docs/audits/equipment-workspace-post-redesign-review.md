# Equipment Workspace — Post-Redesign Integration Review

**Branch:** `claude/equipment-workspace-ui`
**Scope:** functional readiness of the approved compact layout. No visual redesign was done.

**Status:**
- `IMPLEMENTED` and `OFFLINE_TESTED`.
- **Not `FOUNDRY_TESTED`.** This review was run in a cloud workspace with no Foundry V13 install and no linked user computer. It is **not production-certified**.

## 1. Player equipment permissions (why placement is GM-only)

**Finding:** the restriction is not specific to the workspace. Every weapon draw, stow and ready on the sheet runs through:

`InventoryEngine.requestWeaponPosture` → `executeEquipmentIntent(…, { context: GM_LOCAL_CONTEXT })`

On a player client this returns `REJECTED_NOT_GM` and writes nothing. That includes the pre-existing Draw/Stow and Draw & Ignite buttons.

**A player-to-GM path already exists, but it is intentionally disabled.**

| Piece | File | State |
|---|---|---|
| Request envelope and GM-side handler | `scripts/engine/equipment/equipment-player-request-route.js` | Implemented and offline-tested. Off unless a caller enables it. |
| Sender mechanism | Server-stamped author of a GM-whispered chat message (`chat-message-author-v13`) | Not verified. `VERIFIED_IDENTITY_MECHANISMS` is an empty frozen array, so every request is refused. |
| Transport (chat-message adapter) | `scripts/engine/equipment/equipment-request-transport.js` | Implemented. `installEquipmentRequestTransport()` refuses to install without a verified mechanism. Nothing in the system installs it. |
| Request-id continuity | `scripts/engine/equipment/equipment-request-identity.js` | Active |
| Executor lease (a single GM executor) | `scripts/engine/equipment/equipment-executor-lease.js` | Implemented; unused while the route is off |
| Identity probe (WP3-B Gate 1) | `tools/foundry-runtime-probes/wp3b-gate1-identity-probe.js` on branch `audit/wp3b-gate1-identity-probe`, not on `main` | Ready to run. Needs a live V13 world with one GM and two non-GM users. |

**Missing authority:** live evidence that Foundry V13 refuses a forged chat-message author (Gate 1). Until the owner runs the probe and the verdict is `OBSERVED_SOUND`, enabling player execution would mean trusting an unverified identity.

Nothing was enabled, bypassed or shimmed. The next step is the owner's:
1. Run the Gate 1 probe in a live world.
2. If the verdict is `OBSERVED_SOUND`, add the mechanism to `VERIFIED_IDENTITY_MECHANISMS`.
3. Install the transport behind a world setting.
4. Point the workspace's Draw buttons at the request route for non-GM clients.

## 2. Equipment transition completeness

| Operation | Authority result | Source |
|---|---|---|
| Stowed → drawn (one appendage, one-handed) | Supported: Move action, Swift with Quick Draw | `resolveActionCost('drawOrHolsterWeapon')` |
| Stowed → drawn (two appendages, two-handed) | Supported, using the same cost authority | Coordinator plus grip resolver |
| Drawn → stowed | Supported | Same |
| A different drawn configuration: EQUIPPED ↔ READIED, or moving to other appendages | `DEFERRED_RULES_REVIEW` **EQ-001**: no located source prices it. Workaround: stow, then draw again. | Decision register EQ-001 |
| Several identical weapons held together in one hand | Fails closed, **EQ-002** | Register |
| Worn weapons, or weapons with no wielding class, becoming ready | Fails closed, **EQ-003** | Register |
| Species evidence missing | Fails closed ("Indeterminate"); anatomy is partial or unresolved | Species evidence adapter |
| Droid anatomy from legacy parts | Unresolved, with no manipulators granted (droid adapter refactor pending) | `anatomy-resolver.js` |

No mechanic was invented to clear these. The workspace shows each one as **Deferred / Indeterminate / Incompatible**, with the engine's wording under "Details".

## 3. Who can do what (by code path)

### Fully working for a player who owns the actor (ActorEngine, owner permission)

These still need confirming live:
- Wear and remove armor (`equip` → `InventoryEngine.toggleEquip`).
- Activate and deactivate a personal shield and other activatable non-weapon items (`toggle-activated`).
- Install, remove, activate and deactivate implants (`toggle-implant-installed`, `toggle-implant-active`).
- Open the modification workshop (`configure` → `openItemCustomization`).
- Alchemy (`force-alchemy`).
- Item sheet, Edit, Sell (`initiateItemSale`), Delete (with the unresolved-transaction guard).
- Weapon configuration dialog and power-source dialog.
- Attack roll (`roll-attack`) and the unarmed attack (`roll-unarmed-attack`).
- Reload (through the sheet's combat reload workflow).
- Every UI-only interaction: slot selection, inventory filtering, search, inspector tabs, overview, drawer.

### GM-only (`GM_LOCAL_CONTEXT`)

- Draw, stow, ready (`toggle-weapon-readiness`), and Draw & Ignite.
- Workspace placement (Draw one-handed / two-handed into a selected hand).
- "Stow first" for a blocking weapon.
- Resolve an unfinished equipment transaction (`reconcile-weapon-transaction`).
- Igniting a lightsaber needs it drawn first, so in practice it waits on a GM draw.

### Rules-deferred

EQ-001, EQ-002 and EQ-003 (see section 2).

## 4. Presentation consistency

| Item | Source of truth | Result |
|---|---|---|
| Personal shield label | Armor SSOT `isEnergyShield` | **Fixed.** Inventory rows and the inspector now say "Personal shield" instead of "Armor". The mechanical type and classification are unchanged. |
| Shield rating | `resolveArmorData()` → row `currentSR` / `shieldRating` | Displayed as-is |
| Credits | `actor.system.credits`; the edit field is the same `name="system.credits"` form input as before | Unchanged from the previous Gear tab. Not routed through TransactionEngine; the edit field already existed. |
| Item count | `inventoryEntries.length` (concept context) | Unchanged |
| Weight | `equipmentLedgerPanel.totalEquipmentWeight` ("lbs"), falling back to `inventoryPanel.totalWeight` ("kg") | Unchanged. The 0.0 kg in screenshots comes from fixture items having no weight. **Pre-existing inconsistency:** three weight computations exist (see below). |

**Weight computations:**

| Source | What it counts | Unit label |
|---|---|---|
| Inventory panel | All items × quantity | "kg" |
| Equipment ledger | Its own list | "lbs" |
| `EncumbranceEngine._calculateTotalWeight` (the mechanical encumbrance authority) | Worn armor plus non-armor items | — |

The two display figures don't use `EncumbranceEngine` and disagree on units.

## 5. Capability audit vs the pre-redesign Gear tab (`main`)

- Every `data-action` from the old Gear tab is present, except one: **`roll-unarmed-attack`**. The old "Equipped Loadout" list carried the always-available Unarmed Strike with a Roll button.
- **Restored:** it now appears under Hands & manipulators, with its attack and damage, using the same delegated handler. The values come from the sheet's existing virtual unarmed entry.
- Added (already-existing handlers, now exposed on the Gear tab): `roll-attack`, `toggle-implant-installed`, `toggle-implant-active`.
- The credits form field (`system.credits`) and the `add-item` actions are retained in the summary strip.
- The lightsaber construction banner is retained.

## 6. Live Foundry test results

**None. Not performed.** No Foundry V13 runtime is available in this environment. The harness evidence (real templates, real view models, every `system.json` stylesheet, real engine data) is layout QA only.

Checklist for the owner's live run:

| # | Check | Expected |
|---|---|---|
| 1 | GM client: select a hand | Inventory filters to weapons, each with an Available / Requires change / Deferred / Incompatible tag |
| 2 | Draw one-handed into an empty hand | Weapon shows Drawn in that hand. The sheet re-renders and keeps tab, search and selection. Inventory scroll position is kept. |
| 3 | Draw a rifle two-handed (Draw button → choose both hands) | One weapon card plus one "Occupied by" card |
| 4 | Stow, Activate, Reload, Configure, Power, Attack, Mods → workshop | Each opens or applies through its existing flow |
| 5 | Player client (owner): wear and remove armor; activate the shield; install and activate an implant | Works without a GM |
| 6 | Player client: Draw | Refused with "Only a GM client can change equipment state right now"; nothing changes |
| 7 | Narrow window (≤ 700px workspace) with an item selected | Inspector is a bottom drawer. It stays visible while scrolling and doesn't hide focused controls. The close (×) button returns to the list. |
| 8 | Wide window | Inspector stays beside the inventory while scrolling (sticky) |
| 9 | Type in search, then cause an actor update (another client edits the actor) | Search text, caret and focus are restored |
| 10 | Themes: Holo Blue, Vaporwave, Sith; motion style off | Colours follow the theme; no animation when motion is off |

The sticky inspector depends on the real Foundry scroll container. The harness lets the page scroll, while Foundry scrolls inside the window, so check 7 and check 8 are the most important live checks.

## 7. Changes in this review

- `equipment-workspace-context.js`: "Personal shield" presentation label; the `unarmed` view field (from the sheet's existing entry).
- `concept-context.js`: passes the existing virtual unarmed entry to the workspace.
- `equipment-workspace.hbs` and `.css`: the Unarmed Strike row with its existing `roll-unarmed-attack` control.
- `tests/equipment-workspace.test.mjs`: shield label, unarmed mapping, and the roll control being present.

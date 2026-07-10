# App Responsive Contracts Phase 2

**Date:** 2026-07-10  
**Scope:** App-family responsive behavior for constrained shell/window sizes  
**Runtime status:** Static implementation only. Foundry smoke testing still required.

## Context

PR #888 introduced the shared shell responsive observer and generic CSS contract. PR #887 applied a progression-specific implementation. This phase adds app-family contracts for other large applications using the same shell-size classification model.

This PR is now being refined app by app. Completed app-specific refinements so far:

```txt
1. v2 concept actor sheet family
2. live shell-native store surface
3. live item customization / lightsaber workbench
4. Holopad Games library and active table surfaces
5. GM Command Holopad / GM Datapad shell
```

## Principle

```txt
Business content wins over decorative chrome.
The actual application shell size matters more than the monitor size.
Each app should have one obvious primary scroller.
Optional rails should collapse, stack, or become drawers before the core content disappears.
Disconnected legacy UI should be removed instead of supported.
```

## Files changed

```txt
scripts/ui/shell/shell-responsive-observer.js
styles/system/app-responsive-contracts.css
styles/system/app-responsive-character-sheet.css
styles/system/app-responsive-store.css
styles/system/app-responsive-workbench.css
styles/system/app-responsive-games.css
styles/system/app-responsive-gm-holopad.css
docs/audits/app-responsive-contracts-phase2.md
templates/apps/store.html                         deleted
templates/apps/store/store.html                   deleted
```

## Observer updates

The observer now loads these responsive stylesheets in order:

```txt
styles/system/shell-responsive-contract.css
styles/system/app-responsive-contracts.css
styles/system/app-responsive-character-sheet.css
styles/system/app-responsive-store.css
styles/system/app-responsive-workbench.css
styles/system/app-responsive-games.css
styles/system/app-responsive-gm-holopad.css
```

The final app-specific files intentionally override the broader contract for real app selectors.

The observer continues to emit the original classes:

```txt
swse-shell-responsive
is-shell-compact
is-shell-narrow
is-shell-tiny
is-shell-short
is-shell-laptop-short
```

It now also emits one named resolution tier:

```txt
is-shell-tier-tiny
is-shell-tier-narrow
is-shell-tier-micro
is-shell-tier-small
is-shell-tier-laptop-short
is-shell-tier-compact
is-shell-tier-desktop
is-shell-tier-desktop-wide
```

And one diagnostic data attribute:

```txt
data-shell-resolution-tier
```

## Tier meanings

```txt
tiny:          width < 700
narrow:        width < 900
micro:         width <= 1024 OR height <= 600
small:         width <= 1280 OR height <= 720
laptop-short:  width <= 1380 AND height <= 820
compact:       other compact shell state
desktop-wide:  width >= 1920 AND height >= 1080
desktop:       default full layout
```

## App-family contracts added

### Actor / character sheet family

Broad fallback targets:

```txt
swse-character-sheet
swse-v2-sheet
```

Specific v2 concept actor shell targets:

```txt
swse-sheet-v2-shell--concept
swse-v2-tablet--concept
swse-v2-screen--concept
swse-concept-header
swse-concept-resource-strip
swse-concept-tabs
swse-concept-body
swse-concept-sidebar
swse-concept-main
```

Compact behavior:

```txt
- hides low-value HUD/title chrome
- compacts the header into portrait / identity / readout columns
- trims portrait, identity, badges, action row, and readout sizes
- makes tabs horizontal-scroll instead of wrapping into the body
- stacks body/sidebar/main vertically in compact mode
- gives the active tab the primary vertical scroller
- hides sidebar/resource strip/readout cards in short or micro tiers
- tiny/micro tier keeps identity and action buttons visible while hiding portrait/readout cards
```

### Live store / browser family

Live target:

```txt
swse-store-surface
```

Live template:

```txt
templates/shell/partials/surface-store.hbs
```

Compact behavior:

```txt
- compacts HUD and Rendarr hero header
- keeps credits visible while hiding low-value quote/reserve text
- makes Browse/Cart/Checkout/History tabs horizontally scrollable
- bounds search/filter controls so vehicle filters do not consume the page
- makes category/family/subcategory chips horizontal scrollers
- converts browse grid + side rail into vertical business-first layout
- uses auto-fit product card grid sizing
- bounds detail panel and mini-cart as drawer-like panels
- hides product card hero art in short/micro tiers
```

Legacy cleanup:

```txt
templates/apps/store.html deleted
templates/apps/store/store.html deleted
```

Those templates were only found by their own unique content and were not the live shell-native store path. Responsive support for disconnected templates was removed rather than preserved.

### Live workbench / customization family

Live target:

```txt
swse-customization-stage
swse-customization-workarea
```

Live template:

```txt
templates/apps/customization/item-customization-workbench.hbs
```

Compact behavior:

```txt
- compacts HUD and mentor rail
- hides mentor rail entirely in short/micro/tiny tiers
- makes category tabs horizontally scrollable
- stacks inventory above the workbench detail surface
- bounds inventory as a compact selectable strip/grid
- compacts item hero preview and hides low-value hero text on short screens
- makes workbench content tabs horizontally scrollable
- makes active configuration/card panes the primary scrollers
- stacks lightsaber workspace vertically
- bounds Selected Component Intel as a drawer-like rail
- keeps finish picker, wizard navigation, review actions, and tech actions horizontally reachable
```

Specific selectors:

```txt
swse-customization-stage
swse-customization-tablet
swse-customization-screen
swse-customization-hud
swse-customization-mentor
swse-customization-tabs
swse-customization-workarea
workbench-inventory
inventory-list
workbench-detail
item-hero
hero-grid
workbench-content-tabs
wcb-pane
lightsaber-workspace
ls-step-rail
ls-tab-panel
ls-forge-rail
ls-component-intel
ls-finish-picker
ls-wizard-nav
```

### Holopad Games family

Live targets:

```txt
swse-games-surface
swse-games-concept-layout
swse-games-table-frame
swse-games-table-frame--unified
```

Live templates:

```txt
templates/shell/partials/games/surface-games-detail.hbs
templates/shell/partials/games/surface-games-table-frame.hbs
```

Compact library behavior:

```txt
- compacts Games HUD and optional hero content
- stacks library list, selected-game detail, and rail vertically
- turns game library cards into a compact auto-fit grid
- makes selected-game detail the primary scroller
- bounds or hides the right rail in short/micro/tiny tiers
- keeps game mode chips, invite controls, and start actions horizontally reachable
```

Compact active-table behavior:

```txt
- compacts the unified table frame and top table bar
- trims rules/table lines on short tiers
- keeps table actions horizontally scrollable
- bounds or hides telemetry on short/micro/tiny tiers
- keeps table status compact and horizontally scrollable
- makes the game table body the primary scroller
- covers Pazaak, Sabacc, Dejarik, and Hintaro active table bodies without changing rules engines
```

Specific selectors:

```txt
swse-games-surface
swse-games-hud
swse-games-hero
swse-games-concept-layout
swse-games-lib-col--list
swse-games-lib-col--detail
swse-games-lib-col--rail
swse-games-library--concept
swse-games-detail
swse-games-config-card
swse-games-invite-form
swse-games-table-frame--unified
swse-games-table-console
swse-games-tm-bar
swse-games-table-telemetry
swse-games-table-status--unified
swse-games-table-body
```

### GM Command Holopad / Datapad family

Live targets:

```txt
swse-sheet-v2-shell--gm-datapad
gm-command-shell-v2--concept
gm-command-sidebar
gm-command-surface-stage
gm-command-surface-scrollframe
```

Live templates:

```txt
templates/apps/gm-datapad.hbs
templates/apps/gm-datapad/partials/sidebar.hbs
templates/apps/gm-datapad/partials/surface-toolbar.hbs
```

Compact behavior:

```txt
- stacks the GM command shell vertically instead of preserving the full desktop side rail
- converts the left command sidebar into a compact horizontal command strip
- hides sidebar headers/footers/group labels on short/micro/tiny tiers
- keeps surface navigation buttons and badges horizontally reachable
- compacts the shared surface toolbar identity, metrics, and action rail
- hides toolbar metrics on very short tiers
- keeps Top, Refresh, and Focus actions reachable
- makes the surface scrollframe the primary GM content scroller
```

Specific selectors:

```txt
swse-sheet-v2-shell--gm-datapad
gm-datapad-tablet
gm-datapad-screen-shell
gm-datapad-screen
gm-command-screen-v2--phase2
gm-command-shell-v2--concept
gm-command-sidebar
gm-command-sidebar__list
gm-command-sidebar__btn
gm-command-surface-stage--concept
gm-command-surface-toolbar--phase2
gm-command-surface-toolbar__metrics
gm-command-surface-toolbar__actions
gm-command-surface-scrollframe--concept
```

### Atlas / hacking family

Targets:

```txt
atlas-surface
hacking-surface
```

Compact behavior:

```txt
- layout/grid stacks vertically
- main body gets primary scroll ownership
- side rails become bounded stacked panels
```

## Resolution matrix to test

Test actual application window sizes, not just monitor sizes:

```txt
1920x1080     desktop-wide regression
1440x900      desktop regression
1366x768      laptop-short target
1280x800      small laptop/tablet target
1280x720      small/short target
1024x768      tablet/square constrained target
1024x600      micro/short target
900x700       narrow window target
768x1024      tablet portrait target
700x900       tiny edge target
browser zoom 125%
Foundry sidebar open
resized app inside 1920x1080 browser
```

## Actor sheet smoke test

For character, droid, NPC concept, and vehicle-shell cases:

```txt
- open at 1440x900 and confirm desktop concept layout still has full chrome
- resize to 1366x768 and confirm header/tabs/body are usable
- resize to 1280x720 and confirm active tab is the primary scroller
- resize to 1024x600 and confirm portrait/readouts no longer consume the body
- resize to 700x900 and confirm tabs and action row remain horizontally reachable
- switch tabs: overview, abilities, skills, combat, talents, gear, biography
- verify action buttons remain reachable: Level Up, Store, Refresh, Settings
- verify droid systems tab remains reachable for droid actors
- verify vehicle/NPC shell content still scrolls and is not affected by actor-only selectors unexpectedly
```

## Store smoke test

For the shell-native store surface:

```txt
- open store from actor sheet and confirm .swse-store-surface is observed
- confirm data-shell-resolution-tier updates while resizing
- browse weapons, armor, equipment, vehicles, droids, and misc categories
- search/filter/sort at 1366x768, 1280x720, and 1024x600
- verify vehicle filters remain reachable without eating the product grid
- select a product and confirm detail panel remains reachable
- add item to cart and confirm mini-cart remains reachable
- visit Cart, Checkout, and History tabs
- confirm card grid is the primary scroller in compact mode
- confirm desktop layout remains grid + side rail at 1440x900 and 1920x1080
```

## Workbench smoke test

For the item customization / lightsaber workbench:

```txt
- open workbench from actor sheet and confirm .swse-customization-stage is observed
- resize to 1366x768 and confirm inventory, item hero, and details remain visible
- resize to 1280x720 and confirm inventory becomes compact but selectable
- resize to 1024x600 and confirm mentor/hero text no longer consume the work area
- select weapons, armor, energy shields, and lightsabers
- search inventory and confirm results remain scrollable
- switch workbench tabs: modifications, structural, templates, appearance
- inspect a modification/template and confirm detail/intel remains reachable
- open lightsaber tuning/construction and switch chassis/crystal/hilt/color/review steps
- confirm Selected Component Intel remains accessible as a bounded rail/drawer
- confirm Review/Construct/Next/Back actions remain horizontally reachable
- confirm desktop layout remains two-column inventory/detail at 1440x900 and 1920x1080
```

## Games smoke test

For Holopad Games:

```txt
- open Games library and confirm .swse-games-surface is observed
- confirm data-shell-resolution-tier updates while resizing
- select Pazaak, Sabacc, Dejarik, and Hintaro from the library
- resize to 1366x768 and confirm library list, selected detail, and action/config controls remain reachable
- resize to 1280x720 and confirm selected-game detail is the primary scroller
- resize to 1024x600 and confirm rail/telemetry chrome does not consume the table
- start solo Pazaak, Sabacc, Dejarik, and Hintaro tables where available
- confirm active table top actions remain horizontally reachable: Forfeit, Cancel, Cash Out, Next Hand/Round, Library
- confirm active table body remains the primary scroller/play surface
- confirm Pazaak, Sabacc, Dejarik, and Hintaro table bodies remain usable without rule/state changes
- confirm desktop layout remains three-column library and unified table frame at 1440x900 and 1920x1080
```

## GM Holopad smoke test

For the GM Command Holopad:

```txt
- open GM Datapad and confirm .swse-sheet-v2-shell--gm-datapad is observed
- confirm data-shell-resolution-tier updates while resizing
- resize to 1366x768 and confirm sidebar, toolbar, and content remain visible
- resize to 1280x720 and confirm sidebar becomes a horizontal command strip
- resize to 1024x600 and confirm sidebar labels/metrics do not consume the content
- navigate Home, Jobs, Trade, Bulletin, House Rules, Store, Approvals, Healing, Workspace, Factions, Intel, Locations, and Skill Challenges
- verify surface content owns the primary vertical scroll
- verify Top, Refresh, and Focus remain reachable
- verify focus mode does not trap the surface with no way back
- confirm desktop layout remains left command rail + main surface at 1440x900 and 1920x1080
```

## Pass criteria

For each app family:

```txt
- business content visible immediately
- primary body scrolls
- optional rails do not permanently consume the viewport
- actions and footers remain reachable
- details remain accessible as drawer/stacked panels
- desktop layout remains intact at 1440x900 and 1920x1080
- data-shell-resolution-tier updates when resizing the app window
```

## Limitations

- This pass is selector-based and conservative. Exact per-template class refinements may still be needed after runtime testing.
- It does not replace the progression-specific behavior from PR #887.
- It does not modify actor, item, rules, store transaction, game session, wager/escrow, GM surface state, or progression state.
- Foundry runtime verification is still required.

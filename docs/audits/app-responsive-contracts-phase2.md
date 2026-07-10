# App Responsive Contracts Phase 2

**Date:** 2026-07-10  
**Scope:** App-by-app responsive behavior for constrained shell/window sizes  
**Runtime status:** Static implementation only. Foundry smoke testing still required.

## Context

PR #888 introduced the shared shell responsive observer and generic CSS contract. PR #887 applied progression-specific responsive behavior. This phase adds app-by-app contracts for large shell and app surfaces using actual rendered application size rather than monitor/device assumptions.

## Principle

```txt
Business content wins over decorative chrome.
The actual application shell size matters more than the monitor size.
Each app should have one obvious primary scroller.
Optional rails should collapse, stack, bound, or become drawers before core content disappears.
Disconnected legacy UI should be removed instead of supported.
```

## Completed app-specific refinements

```txt
1. v2 concept actor sheet family
2. live shell-native store surface
3. live item customization / lightsaber workbench
4. Holopad Games library and active table surfaces
5. GM Command Holopad / GM Datapad shell
6. Player Atlas / astrogation registry surface
7. Transmission Decryption / codebreaker surface
8. Force Artifact / Sith Alchemy workbench
9. Galactic Records Browser
10. Actor Creation Entry launcher
11. Asset Bay / owned assets, Droid Garage, and Shipyard surfaces
12. Holonet Messenger / communications surface
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
styles/system/app-responsive-atlas.css
styles/system/app-responsive-transmission-decryption.css
styles/system/app-responsive-force-alchemy.css
styles/system/app-responsive-galactic-records.css
styles/system/app-responsive-actor-creation-entry.css
styles/system/app-responsive-assets.css
styles/system/app-responsive-holonet.css
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
styles/system/app-responsive-atlas.css
styles/system/app-responsive-transmission-decryption.css
styles/system/app-responsive-force-alchemy.css
styles/system/app-responsive-galactic-records.css
styles/system/app-responsive-actor-creation-entry.css
styles/system/app-responsive-assets.css
styles/system/app-responsive-holonet.css
```

The observer emits:

```txt
swse-shell-responsive
is-shell-compact
is-shell-narrow
is-shell-tiny
is-shell-short
is-shell-laptop-short
is-shell-tier-tiny
is-shell-tier-narrow
is-shell-tier-micro
is-shell-tier-small
is-shell-tier-laptop-short
is-shell-tier-compact
is-shell-tier-desktop
is-shell-tier-desktop-wide
data-shell-resolution-tier
```

## App contracts

### Actor / character sheet

Targets:

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

Behavior:

```txt
- compacts portrait / identity / readout header
- makes tabs horizontally scrollable
- stacks body/sidebar/main vertically
- makes active tab the primary scroller
- hides sidebar/resource/readout cards in short or micro tiers
```

### Live store / browser

Targets:

```txt
swse-store-surface
templates/shell/partials/surface-store.hbs
```

Behavior:

```txt
- compacts HUD and Rendarr hero header
- keeps credits visible while hiding low-value quote/reserve text
- makes Browse/Cart/Checkout/History tabs horizontally scrollable
- bounds search/filter controls so vehicle filters do not consume the page
- converts browse grid + side rail into vertical business-first layout
- bounds detail panel and mini-cart as drawer-like panels
```

Legacy cleanup:

```txt
templates/apps/store.html deleted
templates/apps/store/store.html deleted
```

### Item customization / lightsaber workbench

Targets:

```txt
swse-customization-stage
swse-customization-workarea
templates/apps/customization/item-customization-workbench.hbs
```

Behavior:

```txt
- stacks inventory above workbench detail surface
- bounds inventory as compact selectable strip/grid
- compacts item hero preview
- stacks lightsaber workspace vertically
- bounds Selected Component Intel as drawer-like rail
- keeps wizard/review/tech actions horizontally reachable
```

### Holopad Games

Targets:

```txt
swse-games-surface
swse-games-concept-layout
swse-games-table-frame
swse-games-table-frame--unified
templates/shell/partials/games/surface-games-detail.hbs
templates/shell/partials/games/surface-games-table-frame.hbs
```

Behavior:

```txt
- stacks library list, selected-game detail, and rail vertically
- turns game library cards into compact auto-fit grid
- makes selected-game detail the primary scroller
- compacts active table frame and top table bar
- makes game table body the primary play surface/scroller
```

### GM Command Holopad / Datapad

Targets:

```txt
swse-sheet-v2-shell--gm-datapad
gm-command-shell-v2--concept
gm-command-sidebar
gm-command-surface-stage
gm-command-surface-scrollframe
templates/apps/gm-datapad.hbs
templates/apps/gm-datapad/partials/sidebar.hbs
templates/apps/gm-datapad/partials/surface-toolbar.hbs
```

Behavior:

```txt
- stacks GM command shell vertically
- converts sidebar into horizontal command strip
- hides sidebar headers/footers/group labels on short tiers
- compacts shared toolbar identity/metrics/actions
- makes surface scrollframe the primary GM content scroller
```

### Player Atlas / astrogation registry

Targets:

```txt
swse-atlas-v3
swse-atlas-surface
swse-shell-surface--atlas
templates/shell/partials/surface-atlas.hbs
```

Behavior:

```txt
- stacks registry rail above dossier stage
- bounds registry rail as compact selectable list/grid
- converts registry groups into auto-fit compact cards
- makes dossier card the primary Atlas scroller
- keeps chips, detail tabs, actions, notes, and reveal checks horizontally reachable
```

### Transmission Decryption / codebreaker

Targets:

```txt
swse-transmission-shell-surface
swse-intel-decryption-console
swse-transmission-grid
templates/shell/partials/surface-transmission-decryption.hbs
templates/shell/partials/transmission-decryption-console.hbs
```

Behavior:

```txt
- compacts shell toolbar and action buttons
- stacks cipher readout above analysis tools rail
- makes cipher readout the primary puzzle scroller
- bounds analysis tools as drawer-like rail
- keeps manual guess row and footer actions horizontally reachable
- keeps recovered payload/lockbox output scrollable after success
```

### Force Artifact / Sith Alchemy workbench

Targets:

```txt
swse-force-alchemy-workbench
sa-win--phase5
data-force-alchemy-root
templates/apps/force-alchemy/force-alchemy-workbench.hbs
```

Behavior:

```txt
- compacts spooky HUD while keeping actor/resources/close reachable
- fades decorative surge/corruption chrome
- stacks current workings, rites list, and selected rite intel vertically
- bounds Current Workings as compact resources/project strip
- makes rites list the primary selection scroller
- bounds Selected Rite Intel as drawer-like rail
```

### Galactic Records Browser

Targets:

```txt
galactic-records-browser
browser-content
category-buttons
templates-list
preview-section
browser-footer
templates/apps/galactic-records-browser.hbs
```

Behavior:

```txt
- compacts Access Galactic Records header
- turns category buttons into a horizontal scroll strip
- makes templates list the primary browser scroller
- converts template cards into compact icon/list cards
- bounds selected preview so it does not eat the records list
- keeps Close, Import Now, and Customize & Import horizontally reachable
- overrides the template's inline layout styles externally without changing import logic
```

### Actor Creation Entry launcher

Targets:

```txt
actor-creation-entry
entry-choices
entry-choice-card
choice-button
templates/apps/actor-creation-entry.hbs
```

Behavior:

```txt
- compacts Create New Actor Profile header
- keeps Begin New Character and Access Galactic Records visible/tappable
- shifts the two-card desktop grid into a one-column scrollable launcher on narrow/tiny windows
- hides low-value subtitles/feature copy on short tiers
- keeps Create New and Browse Records buttons reachable
- overrides the template's inline layout styles externally without changing launch callbacks
```

### Asset Bay / owned assets, Droid Garage, and Shipyard

Targets:

```txt
swse-shell-surface--asset-bay
swse-asset-bay-toolbar
swse-asset-bay-mode-pills
swse-asset-bay-grid
swse-asset-bay-card
swse-vehicle-shipyard-panel
swse-vehicle-shipyard-groups
templates/shell/partials/surface-asset-bay.hbs
templates/actors/vehicle/v2/partials/vehicle-shipyard-systems-panel.hbs
```

Behavior:

```txt
- compacts Asset Bay header and summary toolbar
- covers All Assets, Droid Garage, and Shipyard modes from the same live surface
- keeps All Assets / Garage / Shipyard filters horizontally reachable
- hides explanatory boundary note on short tiers
- makes owned asset grid the primary scroller
- converts owned asset cards into compact portrait/body/action cards
- keeps Sheet, Modify, and Grant Access actions horizontally reachable
- compacts vehicle-sheet EP/value/last-refit summary
- makes installed system groups the primary shipyard panel scroller
- bounds removed/resold systems as a horizontal strip
```

### Holonet Messenger / communications surface

Targets:

```txt
swse-shell-surface--messenger
swse-holonet-comm
hl-applist
hl-ms-root
swse-messenger-thread-list
hl-jobboard-view
hl-intel-view
templates/shell/partials/surface-messenger.hbs
```

Behavior:

```txt
- compacts Holocom HUD, presence controls, alerts, actor status, and party fund chrome
- keeps Chat, Alerts, New, Jobs, Intel, and GM app buttons horizontally reachable
- stacks thread rail above active conversation in compact mode
- makes conversation/messages the primary chat scroller
- keeps thread actions, invite actions, transfer actions, and credit/item/asset trade actions horizontally reachable
- compacts compose mode while keeping recipient picker and Send Hail reachable
- stacks Job Board list and mission dossier with card list as primary scroller
- bounds Job Board mission detail as a drawer-like rail
- stacks Intel list and Create Intel panel with intel list as primary scroller
- keeps pinned transmissions and attachments responsive without altering Holonet data
```

## Resolution matrix to test

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

## Smoke tests

```txt
Actor sheet: character, droid, NPC concept, vehicle-shell tabs and actions.
Store: weapons, armor, equipment, vehicles, droids, cart, checkout, history.
Workbench: weapons, armor, energy shields, lightsabers, selected component intel.
Games: Pazaak, Sabacc, Dejarik, Hintaro library and active tables.
GM Holopad: Home, Jobs, Trade, Bulletin, House Rules, Store, Approvals, Healing, Workspace, Factions, Intel, Locations, Skill Challenges.
Atlas: search/filter locations, select current/pinned/lead-bearing locations, dossier tabs/actions/notes/maps.
Transmission Decryption: glyphs, tactic buttons, skill buttons, frequency chips, manual guess, recovered payload/lockbox.
Force Alchemy: categories, locked/eligible rites, targets/configs/ledger/project/cooldown controls.
Galactic Records: categories, NPC/droid records, selected preview, Import Now, Customize & Import.
Actor Creation Entry: Begin New Character and Access Galactic Records launcher paths at 1366x768, 1280x720, 1024x600, and 700x900.
Asset Bay: All Assets/Garage/Shipyard modes, droid and vehicle asset cards, Sheet/Modify/Grant Access actions, vehicle shipyard systems panel, EP/value/last-refit summaries, installed and removed systems.
Holonet Messenger: Chat/Alerts/New/Jobs/Intel/GM buttons, thread search/filter/archive, compose/new transmission, job board filters/dossier/objectives, intel archive/create, chat messages, pinned transmissions, credit/item/asset/game/job cards, invite/transfer/archive/mute/leave actions.
```

## Pass criteria

```txt
- business content visible immediately
- primary body scrolls
- optional rails do not permanently consume the viewport
- actions and footers remain reachable
- details remain accessible as drawer/stacked/bounded panels
- desktop layout remains intact at 1440x900 and 1920x1080
- data-shell-resolution-tier updates when resizing the app window
```

## Limitations

- This pass is selector-based and conservative. Exact per-template refinements may still be needed after runtime testing.
- It does not replace progression-specific behavior from PR #887.
- It does not modify actor, item, rules, store transaction, game session, wager/escrow, GM surface state, location reveal state, Atlas notes, Intel/decryption state, lockbox rewards, Force Alchemy rites/projects/cooldowns, Galactic Records loader/importer behavior, actor creation launch callbacks, Asset Bay ownership/actions, Holonet threads/messages/jobs/intel/transfers/notifications, vehicle EP/refit math, credits, or progression state.
- Foundry runtime verification is still required.

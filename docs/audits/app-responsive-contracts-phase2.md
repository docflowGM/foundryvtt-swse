# App Responsive Contracts Phase 2

**Date:** 2026-07-10  
**Scope:** App-family responsive behavior for constrained shell/window sizes  
**Runtime status:** Static implementation only. Foundry smoke testing still required.

## Context

PR #888 introduced the shared shell responsive observer and generic CSS contract. PR #887 applied a progression-specific implementation. This phase adds app-by-app responsive contracts for large shell applications using actual rendered shell size instead of monitor/device assumptions.

Completed app-specific refinements so far:

```txt
1. v2 concept actor sheet family
2. live shell-native store surface
3. live item customization / lightsaber workbench
4. Holopad Games library and active table surfaces
5. GM Command Holopad / GM Datapad shell
6. Player Atlas / astrogation registry surface
7. Transmission Decryption / codebreaker surface
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
styles/system/app-responsive-atlas.css
styles/system/app-responsive-transmission-decryption.css
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
```

The observer emits the original shell size classes:

```txt
swse-shell-responsive
is-shell-compact
is-shell-narrow
is-shell-tiny
is-shell-short
is-shell-laptop-short
```

It also emits one named tier class and one diagnostic data attribute:

```txt
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

## App-family contracts added

### Actor / character sheet family

Targets real v2 concept actor shell selectors:

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
- compacts portrait / identity / readout header
- makes tabs horizontally scrollable
- stacks body/sidebar/main vertically
- makes active tab the primary scroller
- hides sidebar/resource/readout cards in short or micro tiers
```

### Live store / browser family

Live target/template:

```txt
swse-store-surface
templates/shell/partials/surface-store.hbs
```

Compact behavior:

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

### Live workbench / customization family

Live target/template:

```txt
swse-customization-stage
swse-customization-workarea
templates/apps/customization/item-customization-workbench.hbs
```

Compact behavior:

```txt
- compacts HUD and mentor rail
- hides mentor rail in short/micro/tiny tiers
- stacks inventory above workbench detail surface
- bounds inventory as compact selectable strip/grid
- compacts item hero preview
- makes active configuration/card panes primary scrollers
- stacks lightsaber workspace vertically
- bounds Selected Component Intel as drawer-like rail
- keeps wizard/review/tech actions horizontally reachable
```

### Holopad Games family

Live targets/templates:

```txt
swse-games-surface
swse-games-concept-layout
swse-games-table-frame
swse-games-table-frame--unified
templates/shell/partials/games/surface-games-detail.hbs
templates/shell/partials/games/surface-games-table-frame.hbs
```

Compact behavior:

```txt
- stacks library list, selected-game detail, and rail vertically
- turns game library cards into compact auto-fit grid
- makes selected-game detail the primary scroller
- keeps mode chips, invite controls, and start actions horizontally reachable
- compacts active table frame and top table bar
- keeps table actions horizontally scrollable
- bounds/hides telemetry on short tiers
- makes game table body the primary play surface/scroller
```

### GM Command Holopad / Datapad family

Live targets/templates:

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

Compact behavior:

```txt
- stacks GM command shell vertically
- converts sidebar into horizontal command strip
- hides sidebar headers/footers/group labels on short tiers
- keeps surface nav buttons and badges horizontally reachable
- compacts shared toolbar identity/metrics/actions
- hides toolbar metrics on very short tiers
- makes surface scrollframe the primary GM content scroller
```

### Player Atlas / astrogation registry family

Live target/template:

```txt
swse-atlas-v3
swse-atlas-surface
swse-shell-surface--atlas
templates/shell/partials/surface-atlas.hbs
```

Compact behavior:

```txt
- compacts command header and current-location strip
- hides summary metrics on short/micro/tiny tiers
- stacks registry rail above dossier stage
- bounds registry rail as compact selectable list/grid
- converts registry groups into auto-fit compact cards
- makes dossier card the primary Atlas scroller
- keeps chips, detail tabs, actions, notes, and reveal checks horizontally reachable
- bounds map images on short/micro/tiny tiers
```

### Transmission Decryption / codebreaker family

Live target/templates:

```txt
swse-transmission-shell-surface
swse-intel-decryption-console
swse-transmission-grid
templates/shell/partials/surface-transmission-decryption.hbs
templates/shell/partials/transmission-decryption-console.hbs
```

Compact behavior:

```txt
- compacts shell toolbar and action buttons
- hides low-value transmission status/kicker/ref chrome on short tiers
- keeps Intel Locker, Expand/Standard, and Refresh actions reachable
- compacts decryption HUD, mode switch, progress/fail meters, and status chips
- stacks cipher readout above analysis tools rail
- makes cipher readout the primary puzzle scroller
- bounds analysis tools as a drawer-like rail
- makes tactic deck, skill buttons, frequency chips, and manual alphabet responsive grids
- keeps manual guess row and footer actions horizontally reachable
- keeps recovered payload/lockbox output scrollable after success
```

Specific selectors:

```txt
swse-transmission-shell-surface
swse-transmission-shell-toolbar
swse-transmission-shell-body
swse-transmission-shell--phase5
swse-intel-decryption-console
swse-intel-decryption-hud
swse-intel-decryption-status
swse-transmission-grid
swse-intel-decryption-readout
swse-intel-decryption-tools
swse-transmission-tactic-deck
swse-intel-decryption-actions
swse-transmission-manual-row
swse-transmission-footer
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

## Smoke tests

### Actor sheet

```txt
- character, droid, NPC concept, and vehicle-shell cases
- overview, abilities, skills, combat, talents, gear, biography tabs
- Level Up, Store, Refresh, Settings actions
- droid systems tab for droid actors
- active tab owns vertical scrolling
```

### Store

```txt
- browse weapons, armor, equipment, vehicles, droids, and misc categories
- search/filter/sort at 1366x768, 1280x720, and 1024x600
- vehicle filters remain reachable without eating product grid
- detail panel, cart, checkout, and history remain reachable
```

### Workbench

```txt
- select weapons, armor, energy shields, and lightsabers
- search inventory and confirm results remain scrollable
- switch modifications, structural, templates, appearance tabs
- lightsaber chassis/crystal/hilt/color/review steps remain usable
- Selected Component Intel remains accessible as bounded rail/drawer
```

### Games

```txt
- select Pazaak, Sabacc, Dejarik, and Hintaro from library
- start solo tables where available
- active table top actions remain horizontally reachable
- table body remains primary play surface
```

### GM Holopad

```txt
- navigate Home, Jobs, Trade, Bulletin, House Rules, Store, Approvals, Healing, Workspace, Factions, Intel, Locations, and Skill Challenges
- surface content owns primary vertical scroll
- Top, Refresh, and Focus remain reachable
- focus mode does not trap the surface
```

### Atlas

```txt
- open player Atlas and confirm .swse-atlas-v3 is observed
- confirm data-shell-resolution-tier updates while resizing
- search/filter locations at 1366x768, 1280x720, and 1024x600
- select current, pinned, and lead-bearing locations
- confirm registry rail does not consume the dossier body
- confirm detail tabs, Pin, Mark Reviewed, reveal check buttons, and Save Notes remain reachable
- confirm maps/facts/leads/factions/contacts/jobs/intel sections scroll inside dossier
```

### Transmission Decryption

```txt
- open encrypted Intel / Transmission Decryption and confirm .swse-transmission-shell-surface is observed
- confirm data-shell-resolution-tier updates while resizing
- resize to 1366x768 and confirm toolbar, cipher readout, analysis tools, and footer actions remain visible
- resize to 1280x720 and confirm cipher readout is the primary puzzle scroller
- resize to 1024x600 and confirm status/ref/mode notes do not consume puzzle space
- select glyphs, use tactic buttons, use skill buttons, frequency chips, manual guess, clear guess, and refresh
- solve or GM decrypt and confirm recovered message and lockbox claim remain reachable
- confirm desktop layout remains readout + tools rail at 1440x900 and 1920x1080
```

## Pass criteria

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
- It does not modify actor, item, rules, store transaction, game session, wager/escrow, GM surface state, location reveal state, Atlas notes, Intel/decryption state, lockbox rewards, or progression state.
- Foundry runtime verification is still required.

# App Responsive Contracts Phase 2

**Date:** 2026-07-10  
**Scope:** App-family responsive behavior for constrained shell/window sizes  
**Runtime status:** Static implementation only. Foundry smoke testing still required.

## Context

PR #888 introduced the shared shell responsive observer and generic CSS contract. PR #887 applied a progression-specific implementation. This phase adds app-family contracts for other large applications using the same shell-size classification model.

## Principle

```txt
Business content wins over decorative chrome.
The actual application shell size matters more than the monitor size.
Each app should have one obvious primary scroller.
Optional rails should collapse, stack, or become drawers before the core content disappears.
```

## Files changed

```txt
scripts/ui/shell/shell-responsive-observer.js
styles/system/app-responsive-contracts.css
docs/audits/app-responsive-contracts-phase2.md
```

## Observer updates

The observer now loads both responsive stylesheets:

```txt
styles/system/shell-responsive-contract.css
styles/system/app-responsive-contracts.css
```

It continues to emit the original classes:

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

Targets:

```txt
swse-character-sheet
swse-v2-sheet
```

Compact behavior:

```txt
- compact portrait/header grid
- smaller portrait image
- horizontal scrolling tabs
- sheet body gets the primary scroller
- tiny tier hides portrait to keep body visible
```

### Store / browser family

Targets:

```txt
swse-store
store-surface
store-card-grid
```

Compact behavior:

```txt
- filter rail becomes sticky compact filter strip
- product grid gets auto-fit card sizing
- tiny tier reduces minimum card width
```

### Workbench / customization family

Targets:

```txt
customization-bay
item-customization-workbench
swse-customization-workbench
force-alchemy-workbench
sith-alchemy-workbench
```

Compact behavior:

```txt
- workbench layout stacks vertically
- preview rail becomes a compact preview strip
- detail rail becomes a bounded drawer-like panel
- component/mod grids get primary scroll ownership
```

### GM holopad / dashboard family

Targets:

```txt
gm-datapad
gm-holopad
swse-gm-datapad
```

Compact behavior:

```txt
- dashboard layout stacks vertically
- navigation compresses to a horizontal scroll strip
- body/content gets the primary scroller
- panels are height-bounded on short screens
```

### Atlas / games / hacking family

Targets:

```txt
atlas-surface
games-surface
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
- It does not modify actor, item, rules, store transaction, or progression state.
- Foundry runtime verification is still required.

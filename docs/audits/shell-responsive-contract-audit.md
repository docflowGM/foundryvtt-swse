# Shell Responsive Contract Audit

**Date:** 2026-07-10  
**Scope:** Shared responsive behavior for large shell-hosted SWSE apps  
**Runtime status:** Static implementation only. Foundry runtime smoke testing still required.

## Problem

The progression compact-layout work exposed a wider UI problem: several SWSE apps are conceptually desktop-first, rail-heavy, and chrome-heavy. When the actual Foundry application window is constrained, the business content can be squeezed by optional rails, decorative panels, toolbars, and footers.

This is not device-specific. A constrained shell can happen on:

```txt
1366x768 laptop
1280x720 laptop
browser zoom 125%
Foundry sidebar open
resized application window inside a large desktop browser
split-screen desktop use
tablet portrait browser
```

## Decision

Do not create app-specific smartphone modes.

Use a shared **Shell Responsive Contract**:

```txt
One app shell.
Classify actual rendered shell size with ResizeObserver.
Apply shared compact/narrow/tiny/short classes.
Let app-specific CSS make business content win over optional rails/chrome.
```

## Implemented files

```txt
scripts/ui/shell/shell-responsive-observer.js
styles/system/shell-responsive-contract.css
index.js
```

## Observer

The shared observer exports:

```txt
observeShellResponsive(root, options)
disconnectShellResponsive(root, options)
observeAllShellResponsive(root)
initializeShellResponsiveObserver()
```

It applies these classes to observed app roots:

```txt
swse-shell-responsive
is-shell-compact
is-shell-narrow
is-shell-tiny
is-shell-short
is-shell-laptop-short
```

It also writes diagnostic dimensions:

```txt
data-shell-layout-width
data-shell-layout-height
data-shell-layout-mode
```

Default thresholds:

```txt
compact: width < 1180 OR height < 760 OR width < 1380 AND height < 820
narrow:  width < 900
tiny:    width < 700
short:   height < 700
```

The helper is wired from `index.js` during system initialization. It observes eligible app roots after `ready` and after app/sheet render hooks.

## CSS contract

The shared stylesheet is injected by the observer as:

```txt
styles/system/shell-responsive-contract.css
```

Generic opt-in classes:

```txt
swse-shell-responsive
swse-responsive-auto
swse-responsive-body
swse-responsive-rail
swse-responsive-rail--optional
swse-responsive-detail
swse-responsive-footer
swse-responsive-chrome
```

The contract intentionally stays broad. It does not copy progression-specific selectors.

## Apps covered in this first pass

This pass provides selector-based coverage for the highest-value large-app families without refactoring their render logic:

```txt
character / actor sheet v2
lightsaber construction and customization workbenches
GM datapad / GM holopad
store / store card grid
atlas
games
hacking
force alchemy / sith alchemy
```

## Behavior goals

For constrained shells:

```txt
business content visible immediately
main body has a valid scroller
optional rails/chrome do not permanently eat the viewport
details/actions remain reachable
desktop layout remains intact at normal desktop sizes
```

## Runtime verification matrix

Test app windows at these actual application sizes, not just full browser sizes:

```txt
1366x768
1280x720
1280x800
1024x768
1024x600
900x700
768x1024
700x900
browser zoom 125%
Foundry sidebar open
resized app window inside 1920x1080 browser
```

Apps to smoke:

```txt
character sheet
vehicle/npc/droid sheets using the shared actor shell
lightsaber construction workbench
item customization workbench / customization bay
GM datapad / holopad
store
atlas
games
force alchemy / sith alchemy
```

For each, verify:

```txt
business content visible immediately
main content scrolls
optional rails do not consume the whole viewport
actions/footer are reachable
no nested-scroll dead zones
desktop layout remains intact at 1440x900 and 1920x1080
```

## Limitations

- This first pass is a contract/infrastructure pass, not a full app-by-app redesign.
- App-specific selectors are intentionally conservative and may need refinement after runtime testing.
- The observer uses `ResizeObserver` and CSS `:has()` selectors, which are expected in current Foundry Chromium/Electron targets.
- Progression remains on PR #887's progression-specific observer for now; a later cleanup can migrate it to the shared observer once #887 is proven stable.

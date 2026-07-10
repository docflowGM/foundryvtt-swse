# Progression Responsive Layout Audit

**Date:** 2026-07-10  
**Scope:** Progression shell small-screen usability and desktop rail resizing  
**Runtime status:** Static/layout patch only. Foundry viewport smoke testing still required.

## Problem

Alpha tester screenshots showed the progression shell rendering on constrained screens but exposing mostly chrome: mentor/step/summary/details rails, toolbar, footer, and nested scrollbars. The actual business area — feat/talent/Force choices — was compressed enough that players perceived the engine as showing nothing.

This is a responsive layout issue, not a progression-rules issue.

A later alpha report clarified the target display: **1366x768, 16:9**. That is wide enough to avoid narrow-screen rules, but short enough that Foundry chrome, the app header, mentor rail, progress rail, utility rail, and footer can consume most of the usable vertical space. The responsive rule therefore needs to treat 1366x768 as constrained, not as a normal desktop layout.

## Old smartphone / small-screen infrastructure

Searches for the old infrastructure did not find an obvious live current v2 progression path named around:

```txt
smartphone
phone
mobile
handheld
small-screen
smallScreen
smallScreenMode
mobileMode
compactMode
responsive progression shell
isMobile
viewport
```

The current repo already had partial responsive stabilization in `styles/progression-framework/chargen-stabilization.css`, including summary/details collapse and scroll containment. That file is loaded after the main progression shell and step styles, so it is the safest surgical override point for this patch.

## Classification

| Artifact | Type | Current usage | Recommendation |
|---|---|---|---|
| Old named smartphone mode | Not found in current code search | No obvious live importer/setting/path found | Do not resurrect as separate architecture |
| `chargen-stabilization.css` responsive section | Live | Loaded from `system.json`; already owns progression viewport stabilization overrides | Reuse as current responsive override layer |
| Current three-rail progression shell | Live | Desktop layout remains the primary large-screen layout | Keep for desktop, auto-collapse on constrained screens |

## Decision

Do not rebuild a separate smartphone progression engine.

Use a single progression shell with automatic responsive behavior:

```txt
Desktop: mentor + step rail + resizable summary + resizable work surface + resizable details + footer
Compact: business list first, low-value rails hidden/collapsed, utility compact, details as inspection drawer
```

## Implemented responsive behavior

The patch updates `styles/progression-framework/chargen-stabilization.css` with an automatic compact progression mode at constrained viewports:

```css
@media (max-width: 1180px), (max-height: 760px), (max-width: 1380px) and (max-height: 820px) { ... }
@media (max-width: 900px) { ... }
@media (max-width: 700px) { ... }
```

The paired width/height condition intentionally catches 1366x768 and similar low-height 16:9 laptop displays without forcing every large 1366+-wide desktop into compact mode.

### Auto-collapsed rails

On constrained screens, the following are hidden/collapsed automatically:

```txt
mentor rail
progress/step rail
phase banner
collapsed rail tray
summary rail / summary restore chrome
```

The player sees the work surface first.

### Utility rail

The utility bar remains available because search/filter controls are business-critical, but it is compressed into a compact toolbar instead of a tall rail.

### Details rail

The right details rail becomes a bottom inspection drawer on constrained screens. Empty detail states are hidden with `:has(.prog-details-placeholder__empty)` so the blank detail panel does not consume space. When an item is focused, the details/choose surface remains accessible without permanently stealing the desktop-width column.

### Footer

The footer becomes shorter and denser. Long blocker text becomes an above-footer compact message with ellipsis instead of consuming the central work area.

### Scroll containment

The compact mode reinforces the existing viewport contract:

```txt
application/window-content: hidden overflow, min-height 0
main column: flex column, min-height 0
content row: hidden overflow, min-height 0
work surface: primary vertical scroller
compact details drawer: own vertical scroller
footer: fixed compact height
```

## Desktop resizable rails

A follow-up patch adds desktop/tablet rail splitters between:

```txt
summary rail | work surface | details rail
```

Implementation files:

```txt
templates/apps/progression-framework/progression-shell.hbs
scripts/apps/progression-framework/shell/progression-rail-resizer.js
styles/progression-framework/chargen-stabilization.css
```

Behavior:

```txt
- Drag the summary splitter to resize/collapse the summary rail.
- Drag the details splitter to resize/collapse the details rail.
- Double-click a splitter to reset its rail width.
- ArrowLeft/ArrowRight resize by 16px when the splitter has focus.
- Enter/Space toggles collapsed/restored for the focused rail.
- Widths and collapsed state persist in localStorage.
- The work surface keeps a safe minimum width.
- Splitters are hidden in compact mode so small screens remain business-first.
```

Client-side storage keys:

```txt
swse.progression.rails.summary.width
swse.progression.rails.summary.collapsed
swse.progression.rails.details.width
swse.progression.rails.details.collapsed
```

This is presentation-only state. It does not read or mutate progression selections, actors, finalization state, or rules data.

## Runtime verification checklist

Verify in Foundry at:

```txt
1440x900
1366x768
1366x768 with Foundry sidebar open
1280x720
1180x760
1024x768
900x700
700px width
browser zoom 125%
Foundry sidebar open
```

For each viewport, test:

```txt
general feat step with many options
search results
suggested feats
talent step
Force technique step
detail drawer / choose button
ask mentor button in details
back/next footer
long prerequisite text
long blocker text
summary rail drag wider/narrower/details rail drag wider/narrower
double-click reset
keyboard resize/toggle
saved widths restore on rerender
compact mode hides splitters
```

## Limitations

- The rail-resizer helper is loaded lazily from the template handles instead of being added to the main shell import graph.
- It relies on modern Chromium `:has()` support, which is available in current Foundry Electron/Chromium targets.
- Foundry runtime smoke testing is still needed to confirm exact detail panel template variants all behave correctly as drawers.
- Large desktop behavior should remain unchanged except for the new draggable splitters.

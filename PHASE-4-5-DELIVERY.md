# Phase 4-5 Delivery: Help Mode, Behavior Standardization & Styling

## Overview

Phases 4-5 focused on user experience polish: transforming the infrastructure (Phases 1-3) into a calm, intentional player-facing system.

**Core Mandate:** Optimize for *feel*, not *count*. Avoid tooltip spam while making the system discoverable through help mode.

---

## Phase 4: Help Mode & Behavior Standardization ✅

### 4.1 Help Mode Toggle

**Location:** Sheet-actions bar (header), next to Mentor button

**Visual Design:**
- Icon-only control: `<i class="fas fa-question-circle"></i>`
- Default state: OFF (inactive)
- Active state: cyan glow + shadow (rgba(0, 200, 255, 0.2-0.6))
- Feels like a "holopad assist mode," not a debug switch

**State Management:**
- Per-sheet instance (stored in `this._helpModeActive`)
- Synchronized with `TooltipRegistry.setHelpMode()`
- Sheet root element gets `.help-mode-active` class for CSS styling
- Toggle button gets `.active` class for visual feedback

### 4.2 Tooltip Behavior Classes

Two distinct behaviors implemented:

#### A. Micro-Tooltips (Definition Hover)
- **Trigger:** Hover or focus on curated hardpoint
- **Duration:** Configured by `--tooltip-delay` CSS variable
- **Dismiss:** Automatic on leave/blur
- **UI:** Small, lightweight text tooltip
- **Default delays:**
  - Icon-only controls: 1000ms (roll buttons, favorites, gear buttons)
  - Curated hardpoints: 250ms (in help mode) or none (no help mode)

#### B. Pinned Breakdowns (Click-to-Read)
- **Trigger:** Click or intentional breakdown affordance
- **Duration:** Persistent until click-away or close
- **UI:** Card-like info display
- **Examples:** Defense breakdown, weapon breakdown
- **Status:** Architecture in place, implementation deferred to future phase

### 4.3 Hover Delay Implementation

**How it works:**
1. User hovers over element with `data-swse-tooltip`
2. Timer starts (duration from `--tooltip-delay` CSS variable)
3. If user leaves before timer fires → tooltip never appears
4. If user stays → tooltip appears after delay

**Benefits:**
- No "tooltip pop-in" distraction for quick mouse-overs
- Icon buttons don't spam tooltips during normal gameplay
- Help-mode hardpoints are fast (250ms) to be discoverable
- Longer delays for incidental controls (1000ms)

**Technical Details:**
- `_hoverTimer`: Tracks the current delay timer
- `_hoveredElement`: Tracks which element is currently hovered
- `_onLeave()` clears timer if user leaves early
- Prevents double-open edge cases

---

## Phase 5: Styling Refinement & CSS Cleanup ✅

### 5.1 Help Mode CSS Affordances

**File:** `styles/sheets/v2-sheet.css` (end of file)

**Key styles:**
```css
/* Help Mode Toggle Button */
.swse-sheet .help-mode-toggle.active {
  background: rgba(0, 200, 255, 0.2);
  border-color: rgba(0, 200, 255, 0.6);
  color: #00d4ff;
  box-shadow: 0 0 8px rgba(0, 200, 255, 0.3);
}

/* Tooltip affordances */
.swse-sheet.help-mode-active [data-swse-tooltip]:hover,
.swse-sheet.help-mode-active [data-swse-tooltip]:focus {
  box-shadow: inset 0 0 6px rgba(0, 200, 255, 0.15);
}
```

**Design principle:** Subtle inset glow, not loud visual spam.

### 5.2 CSS Variable for Hover Delay

**Default delays:**
```css
[data-swse-tooltip] {
  --tooltip-delay: 250ms;
}

.roll-btn, .mini-btn, .favorite-btn,
[data-action="roll-*"], [data-action="toggle-favorite"] {
  --tooltip-delay: 1000ms;
}
```

### 5.3 Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  .swse-sheet.help-mode-active [data-swse-tooltip]:hover,
  .swse-sheet.help-mode-active [data-swse-tooltip]:focus {
    box-shadow: none;
  }
  .swse-discovery-tooltip {
    animation: none;
    opacity: 1;
  }
}
```

### 5.4 Removed CSS Conflicts

**File:** `styles/sheets/skill-actions.css`

**Removed:**
- `.skill-total[data-tooltip]:hover::after` pattern (18 lines)
- This CSS-only tooltip conflicted with the unified TooltipRegistry system

**Result:** Clean separation—CSS handles styling, TooltipRegistry handles behavior.

---

## Implementation Summary

### Files Modified

| File | Change | Lines |
|------|--------|-------|
| `scripts/sheets/v2/character-sheet.js` | Added help-mode state + toggle handler + hover timer logic | +67 |
| `templates/actors/character/v2/character-sheet.hbs` | Added (?) help toggle button | +3 |
| `styles/sheets/v2-sheet.css` | Added help-mode CSS affordances + delay variables | +83 |
| `styles/sheets/skill-actions.css` | Removed CSS-only tooltip pattern | -18 |
| `scripts/ui/discovery/tooltip-registry.js` | Added hover delay + timer management | +43 |

**Total additions:** ~196 lines
**Total removals:** 18 lines
**Net:** +178 lines

### Hardpoints Implemented (Phase 3)

45+ curated tooltip targets across:
- **HP & Condition:** HP, Condition Track
- **Resources:** Initiative, Base Attack Bonus, Grapple, Force Points, Destiny Points
- **Abilities:** Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
- **Defenses:** Reflex, Fortitude, Will, Flat-Footed (already had tooltips)
- **Skills:** All 18 core skills (Acrobatics through Use the Force)

### Tooltip Definitions (lang/en.json)

- Updated 6 existing definitions with architect-approved copy
- Added 24 new definitions (abilities, skills, mechanics)
- All use calm "Datapad System UI" voice
- No mentor voice in sheet tooltips (preserved for chargen/onboarding)

---

## Behavior Flows

### Default Mode (Help OFF)
- Minimal tooltip noise
- Icon-only controls get 1000ms delayed tooltips (discoverable but not intrusive)
- Ordinary hardpoints have no hover affordance
- Pinned breakdowns still work if intentionally clicked

### Help Mode (Help ON)
- Curated hardpoints become discoverable
- Tooltip affordance: subtle inset glow on hover
- Fast feedback: 250ms delay on help-mode hardpoints
- Sheet feels more "teaching" but not cluttered
- Icon buttons still get 1000ms delay (unchanged)

### Keyboard Navigation
- All tooltip hardpoints are focusable (via `tabindex`)
- Focus triggers tooltip display (with same delay as hover)
- Blur hides tooltip
- Respects reduced-motion preference

---

## Architectural Decisions

### Decision: Delay Timer vs. Instant Show

**Chosen:** Delay timer with early-exit on mouseleave

**Rationale:**
- Prevents "tooltip spam" when user is scrolling or scanning
- Icon buttons (1000ms) don't distract during gameplay
- Help-mode hardpoints (250ms) are fast enough to be discoverable
- Better UX: no tooltip pop-in for accidental hovers

### Decision: Per-Sheet Instance Help State

**Chosen:** `this._helpModeActive` on sheet class

**Alternatives considered:**
- Global state (would affect all open sheets)
- Persistent user setting (more complex, maybe overkill)

**Rationale:** Players may want to learn one character with help ON and play another with help OFF. Per-instance is cleaner.

### Decision: No Pinned Breakdowns Yet

**Status:** Architecture is ready; implementation deferred

**Why:** Pinned breakdowns (defense/weapon math cards) are complex UI. The infrastructure (breakdown providers) is in place and tested, but the visual design and interaction patterns deserve dedicated focus in Phase 7.

---

## Testing Checklist

- [x] Help toggle appears in sheet-actions bar
- [x] Toggling help mode updates button state (.active class)
- [x] Toggling help mode updates sheet class (.help-mode-active)
- [x] TooltipRegistry.isHelpMode() reflects toggle state
- [x] Icon buttons show delayed tooltips (1000ms) by default
- [x] Curated hardpoints show faster tooltips (250ms) in help mode
- [x] Tooltip hides on mouseleave before delay expires
- [x] Tooltip appears correctly positioned
- [x] Focused elements (keyboard nav) trigger tooltip
- [x] Blur hides tooltip
- [x] No duplicate listeners on rerender (AbortController cleanup)
- [x] CSS-only tooltip pattern removed (no conflicts)
- [x] Reduced motion: animations suppressed
- [x] Sheet renders without console errors

---

## Known Limitations & Future Work

### Phase 6 (Future)
- Pinned breakdown UI design and interaction (click/toggle/close)
- Help mode visual styling refinement (may want more obvious affordance)
- Tooltip content review/iteration with UX feedback

### Out of Scope (This Phase)
- Chargen tooltip system (separate app)
- NPC/Droid/Vehicle sheets (Phase 7+)
- Other app tooltips (focused on V2 character sheet)

---

## Summary

**Phases 4-5 successfully delivered:**
- ✅ Help mode toggle with intuitive holopad styling
- ✅ Behavior standardization (micro vs. pinned, with clear rules)
- ✅ Hover delay implementation (smart, not spammy)
- ✅ CSS affordances (subtle, restrained)
- ✅ CSS conflict removal (clean architecture)
- ✅ Full keyboard accessibility
- ✅ Reduced motion support

**Result:** The tooltip system now feels like calm, intentional guidance rather than spam. Players can turn help mode on to learn, or off for minimal distraction. The architecture is solid and ready for Phase 6-7 expansion (breakdowns, other sheets).


# Character Sheet Window Contract (REVISED)

**Status**: Architectural governance framework
**Purpose**: Prevent regressions, enforce system behavior
**Caveat**: Validator proves architecture, not functionality

---

## Important Distinction

A contract validator can pass while the sheet is broken if the contract rules are wrong.

This contract is **governance infrastructure**, not **proof of cure**.

Before treating this as "the sheet is fixed," verify actual behavior with acceptance tests.

---

## Rule 1: FRAME CONTRACT (REVISED)

### Statement
ApplicationV2 frame controls window size and resize behavior after render.

### What IS Allowed
- ✓ Default `width` and `height` in `defaultOptions()`
- ✓ Initial placement via `setPosition({ left, top })` on first render
- ✓ Frame size adjustments by Foundry/ApplicationV2
- ✓ User drag-resize at runtime

### What IS Forbidden
- ✗ Post-render size clamping (forcing width/height after render)
- ✗ Runtime resize suppression or interference
- ✗ Code that overrides user resize attempts
- ✗ `setPosition()` that includes `width` or `height` after initial render

### Enforcement
Check `setPosition()` for width/height parameters after render completes.

### Status
**NOT a violation**: Having `width: 900, height: 950` in `defaultOptions()`
**IS a violation**: `setPosition({ left, top, width: 900, height: 950 })` at runtime

---

## Rule 2: LAYOUT CONTRACT

### Statement
DOM must follow a single, unbroken flex chain from frame to scroll owner.

### Required Structure
```
.window-content (ApplicationV2 frame, overflow: hidden)
  └─ form.swse-character-sheet-form (flex: 1 1 auto, min-height: 0)
    └─ .sheet-shell (flex: 1 1 auto, min-height: 0)
      ├─ header (flex: 0 0 auto)
      ├─ .sheet-actions (flex: 0 0 auto)
      ├─ .sheet-tabs (flex: 0 0 auto)
      └─ .sheet-body (flex: 1 1 auto, min-height: 0, overflow: hidden)
        └─ .tab.active ONLY (flex: 1 1 auto, min-height: 0)
```

### Enforcement
Validator checks for presence, ordering, and class names.

---

## Rule 3: SCROLL CONTRACT (REVISED)

### Statement
The character sheet has ONE primary vertical scroll owner by default.

### Default Scroll Owner
- `.tab.active` scrolls vertically to show tab content
- Only `.tab.active` has `overflow-y: auto`

### What IS Allowed
- ✓ `.tab.active` has `overflow-y: auto`
- ✓ Specified exceptions (to be defined per panel)
- ✓ Horizontal scrolling in special cases (condition track, DSP track)

### What IS Forbidden
- ✗ Multiple elements with `overflow-y: auto` (except .tab.active)
- ✗ Inner panels creating independent vertical scroll regions
- ✗ Conflicting overflow rules at different levels

### Exceptions Whitelist
Currently no explicit exceptions defined. If panels require local scrolling:
1. Document the exception explicitly
2. Add selector to whitelist
3. Update validator to exclude from violation check

Example (hypothetical):
```javascript
const SCROLL_EXCEPTIONS = [
  '.tab.active',           // Primary owner
  '.special-scrollable'    // Exception (if needed)
];
```

### Enforcement
Count `overflow-y: auto` elements. Should be exactly 1 (`.tab.active`).

---

## Rule 4: PANEL CONTRACT

### Statement
Inner panels must not create independent vertical scroll regions by default.

### What IS Allowed
- ✓ Panels use flex layout
- ✓ Panels grow/shrink with parent
- ✓ Content flows naturally within parent scroll

### What IS Forbidden
- ✗ Panel with `overflow-y: auto` (unless whitelisted)
- ✗ Panel with `overflow: auto`
- ✗ Max-height constraints that break flex growth

### Exception Whitelist
Define if specific panels require local scrolling:
- Currently: None defined
- Add explicitly if needed with justification

### Enforcement
Scan for panels (class contains `-panel`, `-container`, `-grid`, `-body`) with vertical scroll.

---

## Rule 5: FLEX CHAIN CONTRACT

### Statement
All flex containers in the chain must allow vertical shrinking.

### Requirement
Every flex child in the chain has `min-height: 0`

### Why
Without `min-height: 0`, flex children can't shrink below their content height, breaking the scroll region.

### Required Elements
```css
.window-content { min-height: 0; }
form { min-height: 0; }
.sheet-shell { min-height: 0; }
.sheet-body { min-height: 0; }
.tab { min-height: 0; }
```

### Enforcement
Check each element for `min-height: 0` if `display: flex`.

---

## Rule 6: CSS FORBIDDEN PATTERNS

### Forbidden
```css
/* ✗ height: auto on flex containers (ambiguous) */
.sheet-body { display: flex; height: auto; }

/* ✗ max-height breaking flex growth */
.tab { display: flex; max-height: 500px; }

/* ✗ Multiple overflow regions */
.sheet-body { overflow-y: auto; }
.panel { overflow-y: auto; }  /* Conflict */

/* ✗ Conflicting overflow rules */
.tab { overflow: hidden; }
.tab { overflow-y: auto; }  /* Last one wins - ambiguous */
```

### Permitted
```css
/* ✓ min-height: auto on non-flex items (for content sizing) */
.item { min-height: auto; }

/* ✓ Flex-basis for initial sizing */
.child { flex-basis: 200px; }

/* ✓ Overflow on .tab.active */
.tab.active { overflow-y: auto; }
```

---

## Validator Architecture

The enforcer checks these rules but **does NOT prove the sheet works**.

It prevents **regression** of known good patterns.

It does NOT verify:
- Whether the sheet actually scrolls
- Whether the app actually resizes
- Whether content clipping is gone
- Whether the layout matches user intent

---

## Acceptance Verification (SEPARATE from Validation)

Contract validator != Functional verification

Use `AcceptanceVerification` to answer:

**Question 1: Does the sheet scroll?**
- Can you scroll tab content vertically?
- Does `.tab.active` have scrollable content?
- Is `scrollHeight > clientHeight`?

**Question 2: Does the app resize?**
- Can you drag window edges to resize?
- Does enlarging the window increase usable space?
- Is the app resizable at runtime?

**Question 3: Is content clipped?**
- Are previously hidden elements now visible?
- Does `.window-content` clip content incorrectly?
- Is scrolling actually accessible?

**Question 4: How many scroll regions?**
- How many elements have `overflow-y: auto`?
- Is it exactly 1 (.tab.active)?
- Are there competing scrollers?

---

## What This Contract Protects Against

✓ Multiple scroll owners
✓ Panels creating independent scroll regions
✓ Broken flex chains
✓ Regressions from new changes

---

## What This Contract Does NOT Guarantee

✗ The sheet actually scrolls (must verify with acceptance tests)
✗ The app actually resizes (must verify with acceptance tests)
✗ Content is not clipped (must verify with acceptance tests)
✗ The user experience is correct (must test manually)

---

## Current Status: UNKNOWN

### Known Fixed
- Removed duplicate `.swse-sheet .tab` rules
- Removed `.skills-grid-body { overflow-y: auto }`
- Removed `.defenses-container--cards { overflow: auto }`

### Unverified (Requires Acceptance Testing)
- Does the sheet actually scroll now?
- Does the app actually resize at runtime?
- Is the previous clipping gone?

### How to Verify
1. Open a character sheet in Foundry
2. Run: `AcceptanceVerification.verifyAcceptance(document.querySelector('.application.swse-character-sheet'))`
3. Check console output for scroll/resize/clipping status
4. Report results

---

## Next Steps

1. **Run acceptance tests** on live character sheet
2. **Document results** in ACCEPTANCE_REPORT.md
3. **If scroll fails**: Investigate height chain with diagnostics
4. **If resize fails**: Check ApplicationV2 frame configuration
5. **If clipping fails**: Verify window-content overflow state

Only after both scroll and resize pass acceptance should this be considered "fixed."

---

## Summary

| Aspect | What It Is | What It Isn't |
|--------|-----------|---------------|
| Contract | Governance rules | Proof of correctness |
| Validator | Regression prevention | Functional test |
| Enforcer | Architecture checker | Behavior verification |
| Integration | Sentinel reporting | System cure |

**Use this to prevent bad changes. Use acceptance tests to prove the sheet works.**

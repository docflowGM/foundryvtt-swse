# Contract Violations: Quick Fix Guide

When the character sheet fails contract validation, use this guide to quickly identify and fix the violation.

---

## Violation: SCROLL - Expected 1 scroll owner, found N

**Symptom**: Multiple panels scrolling independently, or sheet doesn't scroll at all

**Root Cause**: Multiple elements have `overflow-y: auto` or `overflow: auto`

**Find It**:
```bash
grep -n "overflow.*auto" styles/sheets/*.css | grep -v "REMOVED\|CONSOLIDATED"
```

**Fix It**:
1. Identify all `overflow-y: auto` or `overflow: auto` except for `.tab.active`
2. Remove the overflow rule from all other elements
3. Reopen the sheet
4. Verify only one scroll region exists (in the tab)

**Example**:
```css
/* WRONG: Panel has independent scroll */
.defenses-container--cards {
  overflow: auto;  /* ← DELETE THIS */
}

/* RIGHT: Only tab has scroll */
form.swse-sheet-ui .sheet-body > .tab {
  overflow-y: auto;  /* ← CORRECT */
}
```

**Sentinel Report**:
```
[CRITICAL] [SCROLL] Expected 1 scroll owner, found 2
  actualCount: 2
  scrollOwners: [
    { selector: 'form > .sheet-body > .tab', classes: 'tab active' },
    { selector: 'div.defenses-container--cards', classes: 'defenses-container--cards' }
  ]
```

---

## Violation: PANELS - Inner panels with independent scroll found

**Symptom**: Individual panels scroll internally instead of scrolling with the body

**Root Cause**: A panel element (with class like `-panel`, `-container`, `-grid`, `-body`) has `overflow: auto` or `overflow-y: auto`

**Find It**:
```bash
# Find panels with scroll rules
grep -B 3 "overflow.*auto" styles/sheets/*.css | grep -E "\-panel|\-container|\-grid" -A 3
```

**Fix It**:
1. Remove `overflow: auto` or `overflow-y: auto` from the panel CSS rule
2. Remove `max-height` constraints that prevent flex growth
3. Ensure panel uses `flex: 1 1 auto` to grow with parent
4. Reopen the sheet

**Example**:
```css
/* WRONG: Panel creates independent scroll region */
.skills-grid-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow-y: auto;  /* ← DELETE THIS */
}

/* RIGHT: Panel content flows with parent scroll */
.skills-grid-body {
  display: flex;
  flex: 1;
  min-height: 0;
  /* No overflow rule - parent .tab handles scroll */
}
```

**Sentinel Report**:
```
[CRITICAL] [PANELS] Inner panels with independent scroll found: 1
  panelSelector: 'section.tab > div.skills-grid-body'
  panelClasses: 'skills-grid-body'
  panelOverflow: 'auto'
```

---

## Violation: FLEX - Missing min-height: 0

**Symptom**: Container doesn't shrink to fit, content is clipped, or scrolling doesn't work

**Root Cause**: A flex container in the chain doesn't have `min-height: 0`

**Find Flex Chain**:
```css
/* Check these selectors for min-height: 0 */
.window-content { min-height: 0; }
form.swse-character-sheet-form { min-height: 0; }
.sheet-shell { min-height: 0; }
.sheet-body { min-height: 0; }
.tab.active { min-height: 0; }
```

**Fix It**:
```css
/* Find the missing rule and add min-height: 0 */
.sheet-body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;  /* ← ADD THIS IF MISSING */
  overflow: hidden;
}
```

**Why It Matters**: Without `min-height: 0`, flex children can't shrink below their content height, breaking the scroll region.

**Sentinel Report**:
```
[HIGH] [FLEX] .sheet-body missing min-height: 0
  selector: '.sheet-body'
  expectedValue: '0px'
  actualValue: 'auto'
```

---

## Violation: LAYOUT - Missing required container

**Symptom**: Sheet structure is wrong, validators fail to find expected elements

**Root Cause**: Template or CSS modified the expected DOM structure

**Expected Structure**:
```
.window-content
  form.swse-character-sheet-form
    .sheet-shell (or any section)
      header
      .sheet-actions
      .sheet-tabs
      .sheet-body
        .tab.active
```

**Fix It**:
1. Check template: `templates/actors/character/v2/character-sheet.hbs`
2. Verify wrapper div has `display: contents`
3. Verify form has correct classes and flex properties
4. Verify sheet-shell is a section or div with `flexcol`
5. Verify .sheet-body exists as direct child of sheet-shell

**Common Issues**:
- Wrapper div removed or moved
- Form renamed or classes changed
- Header/tabs/actions moved outside sheet-shell
- Extra container added between sheet-body and .tab

---

## Violation: FRAME - ApplicationV2 frame issue

**Symptom**: Window doesn't resize, frame behaves strangely

**Root Cause**: Code is interfering with ApplicationV2 frame behavior

**Check**:
```javascript
// In character-sheet.js, check setPosition() method
setPosition(position) {
  const result = super.setPosition(position);
  // ✗ WRONG: Don't clamp width/height
  // this.setPosition({ left, top, width: 900, height: 950 });
  
  // ✓ CORRECT: Only set position
  // this.setPosition({ left: pos.left, top: pos.top });
  
  return result;
}
```

**Fix It**:
1. Check `setPosition()` in character-sheet.js
2. Ensure it only sets `left` and `top`, not `width`/`height`
3. Let ApplicationV2 manage frame size
4. Use `defaultOptions()` for initial size only

**Sentinel Report**:
```
[MEDIUM] [FRAME] ApplicationV2 frame interference detected
  method: 'setPosition()'
  issue: 'Width/height forced after render'
```

---

## Violation: STYLE - Forbidden CSS patterns

**Symptom**: Unexpected layout behavior, content clipping

**Forbidden Patterns**:
```css
/* ✗ WRONG: height: auto on flex container */
.sheet-body {
  display: flex;
  height: auto;  /* ← NOT ALLOWED */
}

/* ✓ CORRECT: Use min-height for content-based sizing */
.sheet-body {
  display: flex;
  min-height: 0;  /* ← Use this instead */
}

/* ✗ WRONG: max-height breaking flex */
.tab {
  display: flex;
  max-height: 500px;  /* ← BREAKS FLEX GROWTH */
}

/* ✓ CORRECT: Use flex-basis or let flex handle it */
.tab {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}

/* ✗ WRONG: overflow on multiple levels */
.sheet-body { overflow-y: auto; }
.panel { overflow-y: auto; }  /* ← CONFLICT */

/* ✓ CORRECT: One scroll owner */
.sheet-body { overflow: hidden; }  /* Flex container */
.tab { overflow-y: auto; }  /* Single scroll owner */
```

**Find Them**:
```bash
# Find height: auto on flex containers
grep -B 2 "height: auto" styles/sheets/*.css | grep -B 2 "flex"

# Find max-height constraints
grep -n "max-height.*px" styles/sheets/*.css | head -20

# Find multiple overflow rules
grep -n "overflow.*auto" styles/sheets/*.css
```

---

## Testing Your Fix

After making changes:

1. **Reopen the sheet**:
   - Close and reopen the character sheet
   - Give it 100ms to stabilize

2. **Check console**:
   ```
   [CHARACTER SHEET CONTRACT] ✓ All rules passed
   ```

3. **Test scroll**:
   - Verify tab content scrolls smoothly
   - No independent panel scrolling
   - No content clipping

4. **Test resize**:
   - Drag window edges to resize
   - Verify content adapts
   - No size jumping

5. **Check Sentinel**:
   ```javascript
   // In browser console
   CharacterSheetContractEnforcer.getViolationSummary()
   // Should return empty violations object
   ```

---

## Escalation Path

| Occurrence | Action | Severity |
|-----------|--------|----------|
| 1st violation | Log to console | INITIAL |
| 2nd occurrence | Escalate to ERROR | MEDIUM |
| 3+ occurrences | Escalate to CRITICAL | HIGH |
| Repeated renders | Sentinel escalates | CRITICAL |

If a violation persists across multiple renders, investigate deeper.

---

## Getting Help

1. **Check the logs**:
   - Browser console: Look for `[CHARACTER SHEET CONTRACT]` messages
   - Sentinel dashboard: View all violations by layer

2. **Run diagnostics**:
   ```javascript
   // In browser console
   const sheet = document.querySelector('.application.swse-character-sheet');
   CharacterSheetContractEnforcer.validateAndReport(sheet.querySelector('.window-content'));
   ```

3. **Review the contract**:
   - See `docs/CONTRACT_ENFORCEMENT.md` for full details
   - Review expected DOM structure (Rule 2)
   - Verify flex chain (Rule 5)

4. **Check Sentinel**:
   - View violation history
   - See which rules are being broken
   - Track severity escalation

---

## Summary

| When You See | Check For | Fix |
|---|---|---|
| "Expected 1 scroll owner, found N" | Multiple `overflow-y: auto` | Remove all except `.tab.active` |
| "Inner panels with independent scroll" | Panel with `overflow: auto` | Remove overflow rule |
| "Missing min-height: 0" | Flex container without `min-height: 0` | Add `min-height: 0` |
| "Missing required container" | Template/structure changed | Restore expected DOM order |
| "Frame issue" | `setPosition()` forcing size | Only set left/top, not width/height |

**Remember**: The contract is **immutable**. Don't work around violations—fix the underlying issue.

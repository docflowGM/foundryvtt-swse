# P0 Resize Fix - Validation Checklist
## Pre-deployment validation for pointer-events approach

**Current Fix:** `pointer-events: none` on form root, re-enabled on section/shell child

---

## 1. EXACT CSS CHANGES

**Changed selectors:**
- Form root: `.application.swse-character-sheet > .window-content > form.swse-character-sheet-form` → `pointer-events: none`
- Section shell: `.sheet-shell`, `section.swse-character-sheet` (children of form) → `pointer-events: auto`

**Why this approach:**
- Form is "transparent" to pointer events, allowing frame events through
- Section child gets events back, so all content interactions work
- Simpler than listing all interactive elements
- Preserves event delegation patterns

---

## 2. REGRESSION TESTING REQUIRED

Before accepting this fix, must verify NO regressions in:

### A. Content Interaction
- [ ] Input fields can be clicked and focused
- [ ] Text can be typed in inputs (name, class, species, etc.)
- [ ] Input blur/focus events fire correctly
- [ ] Form submit works (any save operations)
- [ ] Buttons can be clicked (`data-action` buttons, etc.)
- [ ] Tab switching works
- [ ] Ability toggles work (abilities panel expandable/collapsible)
- [ ] Defense panel toggles work
- [ ] Skill rows remain interactive

### B. Scrolling Behavior
- [ ] Mouse wheel scroll works in tabs
- [ ] Scroll bars appear and work correctly
- [ ] Content doesn't scroll unexpectedly
- [ ] Scroll position maintains within tabs

### C. Drag/Drop & Selection
- [ ] Text selection works in content areas
- [ ] Drag-drop of items (if supported) still works
- [ ] No unwanted text selection when dragging
- [ ] Right-click context menus work

### D. Event Delegation
- [ ] Click events on nested elements still bubble correctly
- [ ] Delegated listeners on root still fire
- [ ] Data-action attributes still trigger handlers

### E. Resize Handle (THE FIX)
- [ ] Resize handle visible in bottom-right corner
- [ ] Resize handle is clickable/draggable
- [ ] Dragging corner actually resizes window
- [ ] Content expands when window resizes
- [ ] Resized dimensions persist on reopen

---

## 3. SIDE EFFECTS TO WATCH

These behaviors change with the pointer-events modification:

| Behavior | Before Fix | After Fix | Status |
|----------|-----------|-----------|--------|
| Pointer events on form | auto (blocking frame) | none (transparent) | ✓ Intentional |
| Events on section/shell | auto (default) | auto (re-enabled) | ✓ Preserved |
| Event delegation to form | fires on form | fires through form→section | ⚠️ Test |
| Click on empty space in form | form receives event | event passes through | ⚠️ Test |
| Scroll wheel in content | inherited by children | inherited by children | ✓ Likely fine |
| Text selection | works normally | works normally | ✓ Likely fine |

---

## 4. NARROWNESS ASSESSMENT

Current fix targets:
- **What's broken:** Form element blocking frame resize handle
- **What's fixed:** Form has `pointer-events: none`, section has `pointer-events: auto`
- **Scope:** Just the pointer event routing, no layout changes
- **Risk:** LOW-MEDIUM (depends on event delegation patterns in code)

More surgical options considered:
1. Setting `pointer-events: none` only on `section.sheet-shell` ← Could work if form doesn't need it
2. Creating frame-edge pseudo-elements ← More complex, might not work in AppV2
3. Restructuring template ← Too invasive, high risk

Current approach is reasonable compromise between surgical and functional.

---

## 5. SPECIFIC ELEMENTS TO TEST

After applying the fix, explicitly test these:

1. **Character name input** - Type a new name, verify it updates
2. **Class dropdown** - Click and select a different class
3. **Ability row expansion** - Click ability row headers to expand/collapse
4. **Skill row interaction** - Click skill checkboxes, edit skill values
5. **Tab switching** - Click between tabs (Overview, Details, etc.)
6. **Scrolling** - Scroll within a tab, verify content scrolls
7. **Form submission** - Make a change and verify it saves (if auto-save is working)
8. **Window resizing** - Drag bottom-right corner to make window larger/smaller
9. **Content expansion** - Verify interior content actually grows when window resizes
10. **Header stability** - Scroll content, verify header stays fixed

---

## 6. RECOMMENDED VALIDATION FLOW

1. **Apply the fix** (already done - CSS changed)
2. **Test individual interactions** (items from section 5 above)
3. **Test scrolling behavior** (wheel scroll, scroll bars)
4. **Test resize handle** (visibility and drag functionality)
5. **Test persistence** (close and reopen sheet, check dimensions remembered)
6. **Test delegation** (verify any delegated listeners still work)
7. **Document findings** (what works, what broke, what needs fixing)

---

## 7. DECISION TREE

**If all interactions work AND resize handle is now accessible:**
- ✅ FIX IS GOOD - accept and document

**If resize works but something else broke:**
- 🔧 NEEDS REFINEMENT - identify what broke and adjust CSS

**If resize still doesn't work:**
- ❌ WRONG DIAGNOSIS - problem isn't form blocking, try different approach

---

## 8. ALTERNATIVE FIX IF THIS FAILS

If `pointer-events: none` approach causes issues, fallback strategy:
- Set `pointer-events: none` only on `.section.sheet-shell` 
- Leave form with `pointer-events: auto`
- This might be more surgical but riskier for form functionality

Or restructure template to wrap form in a div:
```html
<div class="character-sheet-wrapper">
  <form>...</form>
</div>
```
This matches working apps but requires template changes.

---

## STATUS

- [ ] Validation checklist completed
- [ ] No regressions found
- [ ] Resize handle verified working
- [ ] Fix approved for production

**Currently:** Awaiting validation testing

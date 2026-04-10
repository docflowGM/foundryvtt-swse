# Melee Modification Modal - Validation Plan

**Objective**: Verify melee implementation works correctly before rolling pattern to armor/gear/etc.

**Gating Conditions** (from user):
1. ✅ Melee renders correctly
2. ✅ Melee applies correctly
3. ✅ No other subclasses were silently broken

---

## Validation Checkpoint 1: Shell Template Renders

**Requirement**: Base shell template (`modification-modal-shell.hbs`) loads and displays correctly

**Test Steps**:
- [ ] Open melee modification modal
- [ ] Verify modal shows header with weapon image, name, subtitle
- [ ] Verify 2-panel layout is visible (left + right panels)
- [ ] Verify footer is fixed at bottom with Cancel | Cost | Confirm buttons
- [ ] Verify no console errors about missing template
- [ ] Verify no fallback placeholder text ("Override getMainContent() in subclass")

**Expected Result**: 3-rail layout (fixed header, scrollable 2-panel body, fixed footer)

---

## Validation Checkpoint 2: Left Panel Renders (Upgrade List)

**Requirement**: Left panel shows list of available upgrades with correct structure

**Test Steps**:
- [ ] Open melee modification modal
- [ ] Verify left panel contains `.upgrade-list`
- [ ] Verify each upgrade shows:
  - [ ] Name (bold, white text)
  - [ ] Cost in credits (blue text, right-aligned)
  - [ ] "Installed" badge if already applied
  - [ ] Visual distinction between installed/not installed
- [ ] Verify upgrades are scrollable (if many upgrades)
- [ ] Verify installed upgrades have reduced opacity (~60%)
- [ ] Count upgrades matches MELEE_UPGRADES object

**Expected Result**: Clean list of 5+ upgrades with cost and status indicators

---

## Validation Checkpoint 3: Right Panel Renders (Detail View)

**Requirement**: Right panel shows detail for selected upgrade or empty state

**Test Steps**:
- [ ] Open melee modification modal
- [ ] Verify right panel shows empty state: "Select an upgrade to view details"
- [ ] Click on first upgrade in left list
- [ ] Verify right panel updates with:
  - [ ] Upgrade name (bold, large)
  - [ ] Cost (blue text)
  - [ ] Description section (if exists)
  - [ ] Effect section (if exists)
  - [ ] "Installed" status badge (if already installed)
- [ ] Click different upgrades
- [ ] Verify detail panel updates correctly each time
- [ ] Verify no lag or delay in panel update

**Expected Result**: Detail panel shows correct info for selected upgrade, updates instantly

---

## Validation Checkpoint 4: Selection State Management

**Requirement**: Clicking upgrades updates selection state and UI

**Test Steps**:
- [ ] Open melee modification modal
- [ ] Verify no upgrade is selected initially
- [ ] Click first upgrade
- [ ] Verify:
  - [ ] Upgrade item in left list shows `active` class (blue/cyan highlight)
  - [ ] Right panel updates with details
  - [ ] Footer Confirm button remains visible
- [ ] Click different upgrade
- [ ] Verify:
  - [ ] Previous selection loses `active` class
  - [ ] New upgrade shows `active` class
  - [ ] Detail panel updates
  - [ ] Cost in footer updates
- [ ] Click same upgrade again
- [ ] Verify it stays selected (toggle off should work if allowed)

**Expected Result**: Single-select model works, detail panel always in sync with list selection

---

## Validation Checkpoint 5: Footer Cost Display

**Requirement**: Footer shows correct cost info for selected upgrade

**Test Steps**:
- [ ] Open melee modification modal
- [ ] Initially: Verify footer shows:
  - [ ] No cost line (no upgrade selected)
  - [ ] Wallet: shows actor's credit balance
  - [ ] Confirm button is DISABLED (no selection)
- [ ] Select an upgrade (cost > 0)
- [ ] Verify footer shows:
  - [ ] "Total Cost: XXX" (matches upgrade costCredits)
  - [ ] "Wallet: YYY" (matches actor.system.credits)
  - [ ] Confirm button is ENABLED
- [ ] Select expensive upgrade (cost > wallet)
- [ ] Verify footer shows:
  - [ ] Cost appears in red/warning color
  - [ ] Wallet appears in red (insufficient)
  - [ ] Confirm button is DISABLED
- [ ] Select cheap upgrade (cost < wallet)
- [ ] Verify Confirm button is ENABLED

**Expected Result**: Footer accurately reflects affordability and updates with selection

---

## Validation Checkpoint 6: Confirmation and Credit Deduction

**Requirement**: Clicking Confirm applies upgrade and deducts credits

**Test Steps**:
- [ ] Note actor's current credits: BEFORE = X
- [ ] Note item's currently installed upgrades
- [ ] Open melee modification modal
- [ ] Select affordable upgrade (cost = C)
- [ ] Click Confirm button
- [ ] Verify:
  - [ ] Modal closes
  - [ ] Notification shows "⚔️ Weapon customized!"
  - [ ] Item's installed upgrades list updated
  - [ ] Actor's credits: AFTER = BEFORE - C
  - [ ] Item's flags.swse.meleeUpgrades includes selected upgrade
- [ ] Open melee modal again
- [ ] Verify previously selected upgrade now shows "Installed" badge
- [ ] Verify it cannot be selected again (validation prevents duplicate)

**Expected Result**: Upgrade persists, credits deducted, item updated atomically

---

## Validation Checkpoint 7: Validation Logic (Credit Check)

**Requirement**: Cannot confirm if insufficient credits

**Test Steps**:
- [ ] Reduce actor credits to exactly 0
- [ ] Open melee modification modal
- [ ] Select ANY upgrade (cost > 0)
- [ ] Click Confirm button
- [ ] Verify:
  - [ ] Modal stays open
  - [ ] Notification shows warning: "Insufficient credits. Need XXX, have 0"
  - [ ] Modal does NOT close
  - [ ] Item NOT updated
  - [ ] Credits NOT deducted
- [ ] Reduce actor credits to less than upgrade cost (e.g., 100 credits, upgrade costs 500)
- [ ] Select expensive upgrade
- [ ] Verify same validation behavior

**Expected Result**: Validation prevents purchase and shows clear error message

---

## Validation Checkpoint 8: Validation Logic (Slot Check)

**Requirement**: Cannot confirm if insufficient upgrade slots

**Test Steps**:
- [ ] Ensure actor has sufficient credits
- [ ] Check item's upgradeSlots (usually 2 or 3)
- [ ] Check item's currently installedUpgrades count
- [ ] If slots available:
  - [ ] Select and apply upgrade (should succeed)
- [ ] Keep applying until ALL slots full
- [ ] Verify last upgrade was successfully applied
- [ ] Verify item now shows full slot usage
- [ ] Try to select and apply one more upgrade
- [ ] Verify:
  - [ ] Modal stays open
  - [ ] Notification shows: "Adding this upgrade exceeds available slots..."
  - [ ] Item NOT updated
  - [ ] Credits NOT deducted
- [ ] Try to uninstall one upgrade and re-apply
- [ ] Verify validation allows it (slots freed up)

**Expected Result**: Slot validation prevents overfilling and shows helpful error

---

## Validation Checkpoint 8b: Validation Logic (Duplicate Check)

**Requirement**: Cannot install upgrade if already installed

**Test Steps**:
- [ ] Select and apply an upgrade
- [ ] Verify modal closes and notification shows success
- [ ] Reopen melee modification modal
- [ ] Locate the upgrade you just installed
- [ ] Verify it shows "Installed" badge and is visually distinguished
- [ ] Try to select it again
- [ ] Verify:
  - [ ] Right panel shows "✓ Already installed"
  - [ ] Confirm button is still clickable
- [ ] Click Confirm on already-installed upgrade
- [ ] Verify:
  - [ ] Modal stays open
  - [ ] Notification shows: "This upgrade is already installed"
  - [ ] No credits deducted
  - [ ] No item update

**Expected Result**: Cannot duplicate upgrades, validation catches this before apply

---

## Validation Checkpoint 9: Cancel Button

**Requirement**: Cancel closes modal without changes

**Test Steps**:
- [ ] Note actor's credits: BEFORE = X
- [ ] Note item's installed upgrades: BEFORE_LIST
- [ ] Open melee modification modal
- [ ] Select an expensive upgrade
- [ ] Click Cancel button
- [ ] Verify:
  - [ ] Modal closes immediately
  - [ ] Actor credits: AFTER = BEFORE (unchanged)
  - [ ] Item upgrades: AFTER_LIST = BEFORE_LIST (unchanged)
  - [ ] No notification shown

**Expected Result**: Cancel is safe and doesn't modify anything

---

## Validation Checkpoint 10: Scrolling Behavior

**Requirement**: Left and right panels scroll independently; header/footer stay fixed

**Test Steps**:
- [ ] Open melee modification modal
- [ ] If many upgrades exist:
  - [ ] Scroll left panel to bottom
  - [ ] Verify header and footer don't move
  - [ ] Verify right panel stays visible
  - [ ] Verify right panel doesn't scroll (only left moves)
- [ ] If long descriptions exist:
  - [ ] Click an upgrade with long description
  - [ ] Verify right panel scrolls internally
  - [ ] Verify left panel and footer don't move
  - [ ] Verify all buttons remain clickable

**Expected Result**: Fixed header/footer, independent panel scrolling, no layout shift

---

## Validation Checkpoint 11: Listener Management

**Requirement**: No event listener duplication on re-renders

**Test Steps**:
- [ ] Open melee modification modal
- [ ] Select upgrade (triggers re-render in attachEventListeners)
- [ ] Open browser DevTools → Console
- [ ] Search for any "duplicate listener" or "listener already attached" warnings
- [ ] Click upgrade 10+ times rapidly
- [ ] Verify:
  - [ ] No console errors
  - [ ] No performance degradation
  - [ ] Responses still instant
- [ ] Verify listener count doesn't explode in DevTools

**Expected Result**: Clean event wiring, no listener proliferation on re-renders

---

## Validation Checkpoint 12: Header Image Display

**Requirement**: Item image displays correctly in fixed header

**Test Steps**:
- [ ] Select a melee weapon with a valid item.img path
- [ ] Open melee modification modal
- [ ] Verify:
  - [ ] Thumbnail appears in left of header (48x48px)
  - [ ] Image has visible border (1px rgba(255,255,255,0.15))
  - [ ] Image background is dark (rgba(0,0,0,0.3))
  - [ ] Image doesn't stretch/distort
  - [ ] Image alt text is weapon name
- [ ] Try with weapon without image (fallback icon)
- [ ] Verify fallback image appears correctly

**Expected Result**: Header thumbnail renders correctly with proper sizing and styling

---

## Validation Checkpoint 13: "Installed" Badge Styling

**Requirement**: Installed upgrades show visual distinction

**Test Steps**:
- [ ] Open melee modification modal
- [ ] Verify installed upgrades in list show:
  - [ ] Reduced opacity (~60%)
  - [ ] "Installed" badge (uppercase text)
  - [ ] Badge has subtle background (rgba(255,255,255,0.1))
  - [ ] Badge has light border
- [ ] Select installed upgrade
- [ ] Verify right panel shows:
  - [ ] Status box with green background (rgba(144,238,144,0.15))
  - [ ] Green text (#90ee90)
  - [ ] Checkmark (✓) character
  - [ ] "Already installed" message

**Expected Result**: Clear visual indication of installation status throughout UI

---

## Validation Checkpoint 14: No Backward Compatibility Breakage

**Requirement**: Armor, Blaster, Gear apps still work

**Test Steps**:
- [ ] Open Armor modification modal (any armor item)
- [ ] Verify:
  - [ ] Modal renders with old layout (grid, preview, panels)
  - [ ] Upgrades display correctly
  - [ ] Tint color picker works
  - [ ] Apply button works
- [ ] Open Blaster customization modal
- [ ] Verify:
  - [ ] Bolt color cells display
  - [ ] FX type buttons display
  - [ ] Live color preview works
  - [ ] Apply button works
- [ ] Open Gear modification modal
- [ ] Verify:
  - [ ] Variant buttons work
  - [ ] Mod cards display correctly
  - [ ] Accent color picker works
  - [ ] Apply button works
- [ ] Verify no console errors in any of these apps

**Expected Result**: Old apps continue to work with their legacy templates

---

## Test Coverage Summary

**Must Pass Before Armor Rollout**:
- ✅ Checkpoints 1-7 (core melee functionality)
- ✅ Checkpoint 8 + 8b (validation logic)
- ✅ Checkpoint 9 (cancel safety)
- ✅ Checkpoint 10 (layout integrity)
- ✅ Checkpoint 14 (no regressions)

**Should Pass Before Production**:
- ✅ Checkpoint 11 (performance/stability)
- ✅ Checkpoint 12 (header display)
- ✅ Checkpoint 13 (visual polish)

---

## Gating Decision Framework

### **APPROVE ARMOR ROLLOUT** if:
- [x] All checkpoints 1-7 pass
- [x] Validations (8 + 8b) work correctly
- [x] No other subclasses broken (checkpoint 14)
- [x] No console errors

### **BLOCK ARMOR ROLLOUT** if:
- Any rendering checkpoint fails
- Apply logic has issues
- Validation bypasses found
- Regressions in other apps
- Performance problems on re-render

---

## Next Steps

1. **Perform all validation checks** above
2. **Document results** in separate test report
3. **If all pass**: Proceed with armor migration
4. **If failures found**: Log issues and fix before armor

---

**Status**: Ready for testing  
**Last Updated**: April 9, 2026

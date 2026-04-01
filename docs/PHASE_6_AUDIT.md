# Phase 6: Operational Hardening Audit & Optimization Plan

**Date:** 2026-03-29
**Status:** IN PROGRESS
**Target:** Production-ready performance, stability, and maintainability

---

## 1. PERFORMANCE AUDIT FINDINGS

### Current Render Flow
```
render() → _prepareContext() → buildAllPanels() → [18 panel builders]
```

### Issue 1: All Panels Built Every Render
**Status:** ⚠️ CONFIRMED
**Severity:** MEDIUM
**Impact:** Every render rebuilds all 18 panels, regardless of which are visible

**Current behavior:**
- _prepareContext() calls panelBuilder.buildAllPanels()
- buildAllPanels() calls 18 builder methods sequentially
- Builders like buildInventoryPanel() perform expensive operations:
  - Iteration over all actor items
  - String coercion (weight formatting, cost formatting)
  - Array sorting (.sort() on items)
  - Object normalization
  - Validation calls

**Examples of expensive operations:**
- buildEquipmentLedgerPanel: filters items, sorts by (equipped, category, name)
- buildInventoryPanel: groups items into categories
- buildTalentPanel: iterates talents, groups by tier
- buildForcePowersPanel: separates into hand/discard/secrets piles

**Recommendation:** Implement visibility-based skipping and lazy building for expensive panels

### Issue 2: No UI State Persistence
**Status:** ⚠️ CONFIRMED
**Severity:** MEDIUM-HIGH
**Impact:** Users lose interactive state on every rerender (expanded sections, etc.)

**Symptoms:**
- Expanded/collapsed ledger rows reset
- Active tabs may reset
- Scroll position lost
- Selected filters reset
- Searched/filtered content disappears

**Current state:**
- No mechanism to preserve UI state across rerenders
- Partials use static HTML structure, no state binding
- No recovery of user interaction after sheet update

**Recommendation:** Create lightweight UIStateManager that persists interactive state to sheet instance

### Issue 3: Missing Render Diagnostics
**Status:** ⚠️ CONFIRMED
**Severity:** LOW-MEDIUM
**Impact:** Hard to debug what's actually happening during rerenders

**Current diagnostics:**
- No logging of which panels were built
- No timing data for builder performance
- No visibility into rerender triggers
- No contract validation diagnostics beyond strict mode

**Recommendation:** Add selective diagnostics that are silent in normal mode, verbose in dev mode

### Issue 4: Unnecessary Rebuilds of Heavy Panels
**Status:** ⚠️ LIKELY
**Severity:** LOW
**Impact:** Rebuilding entire ledgers when only small data changed

**Examples:**
- Building full inventoryPanel when adding a single item
- Rebuilding full talentPanel when updating a talent name
- Rebuilding forcePowersPanel when playing a single power

**Recommendation:** Add invalidation tracking and rebuild conditions per panel

### Issue 5: Form Submission Performance
**Status:** ⚠️ POTENTIAL
**Severity:** LOW-MEDIUM
**Impact:** Frequent autosave could trigger expensive rerenders

**Current state:**
- Debounce on form submission (500ms)
- No tracking of what actually changed
- Full context regeneration on any actor update

**Recommendation:** Add change tracking to skip unnecessary panel rebuilds

---

## 2. STABILITY AUDIT FINDINGS

### Issue 1: Tab/Section State Lost on Rerender
**Status:** ⚠️ CONFIRMED
**Severity:** HIGH
**Impact:** Active tab, expanded sections, scroll position all reset

**Current state:**
- Templates use static HTML
- No data binding for UI state
- No recovery mechanism

**Affected elements:**
- Primary tab group (gear, talents, feats, etc.)
- Equipment ledger row expansion
- Any collapsible sections
- Scroll position

**Recommendation:** Implement sheet-local UI state manager that survives rerenders

### Issue 2: Form Field State Not Preserved
**Status:** ⚠️ POTENTIAL
**Severity:** MEDIUM
**Impact:** Text being edited gets reset on rerender

**Scenarios:**
- User typing in biography textarea
- User editing notes field
- Mid-keystroke rerender could lose focus

**Current safeguard:** Debounce prevents constant rerenders, but doesn't solve focus loss

**Recommendation:** Add focused element tracking and restoration

### Issue 3: Dependent Data Updates Could Break
**Status:** ⚠️ POTENTIAL
**Severity:** MEDIUM
**Impact:** If panel A depends on panel B's data, invalidation order matters

**Example:**
- defensePanel depends on derived.defenses (updated by healthPanel? or elsewhere?)
- If derived is updated async, panels could get stale data

**Current state:**
- All builders access this.derived
- No explicit dependency tracking
- Builders run sequentially but order not guaranteed safe

**Recommendation:** Document panel dependencies, add safeguards for async updates

---

## 3. MAINTENANCE & EXTENSION AUDIT

### Issue 1: No Extension Recipes
**Status:** ⚠️ CONFIRMED
**Severity:** MEDIUM
**Impact:** Future panel additions repeat mistakes or miss validation

**Missing documentation:**
- How to add new ledger panel safely
- How to ensure panel validator is registered
- How to test new panel contracts
- How to handle lazy loading in new panels

**Recommendation:** Create extension recipes and examples

### Issue 2: Foundry Coupling Not Documented
**Status:** ⚠️ CONFIRMED
**Severity:** MEDIUM
**Impact:** Future evolution of Foundry could break fragile assumptions

**Fragile dependencies identified:**
- AppV2 root element assumptions
- Submission lifecycle (when does form data flow?)
- Rerender trigger assumptions
- Window/layout assumptions

**Recommendation:** Document coupling risks and add compatibility guards

### Issue 3: No Performance Budgets
**Status:** ⚠️ CONFIRMED
**Severity:** LOW
**Impact:** Performance could degrade without warning

**Current state:**
- No thresholds for builder execution time
- No limits on panel count
- No warnings on expensive operations

**Recommendation:** Add dev-mode guardrails for performance

---

## 4. IDENTIFIED EXPENSIVE OPERATIONS

### Category: Item/Collection Processing
- buildEquipmentLedgerPanel: filters + sorts ~50-200 items
- buildInventoryPanel: groups and categorizes items
- buildTalentPanel: groups talents by tier

**Cost:** ~1-10ms per render, scales with collection size

### Category: Normalization Work
- Building arrays from system objects
- String coercion (weight, cost, numbers)
- Splitting piles (forcePowers hand/discard)

**Cost:** ~0.5-2ms per render

### Category: Validation
- Contract validation on every panel
- Row validation in ledger panels

**Cost:** ~0.1-1ms per render (noisy but unavoidable)

### Category: DOM Queries (Post-Render)
- PostRenderAssertions DOM traversals
- SVG structure checks

**Cost:** ~1-5ms depending on DOM size

---

## 5. OPTIMIZATION OPPORTUNITIES (Prioritized)

### Priority 1: Critical Performance (High impact, low risk)
1. **Implement visibility-based panel skipping**
   - Check if tab/panel is visible before building
   - Skip heavy panels on initial render if hidden
   - Rebuild on demand when user navigates to tab
   - Risk: LOW (clear invalidation rules)

2. **Add change tracking to skip unnecessary rebuilds**
   - Track which actor data changed
   - Only rebuild panels affected by change
   - Example: Item added → only rebuild inventory panels
   - Risk: LOW (small, isolated change)

### Priority 2: UI Stability (High impact, medium risk)
1. **Add UIStateManager for interactive state**
   - Preserve expanded/collapsed sections
   - Restore active tabs
   - Track scroll position
   - Risk: MEDIUM (new subsystem, but isolated)

2. **Add focused element tracking**
   - Remember which field had focus
   - Restore focus after rerender if safe
   - Risk: MEDIUM (timing-sensitive, but improves UX)

### Priority 3: Diagnostics & Observability (Low impact, low risk)
1. **Add selective performance logging**
   - Silent in normal mode
   - Verbose in dev mode
   - Log which panels built, which skipped, which cached
   - Risk: LOW (diagnostic only)

2. **Add panel rebuild reasons**
   - Track why each panel was invalidated
   - Help future debugging
   - Risk: LOW (logging only)

### Priority 4: Hardening (Low impact, medium risk)
1. **Document Foundry coupling risks**
   - Add comments marking fragile dependencies
   - Note Foundry V13+ assumptions
   - Risk: LOW (documentation)

2. **Add compatibility guards**
   - Wrap assumptions in guards/checks
   - Provide fallbacks where practical
   - Risk: MEDIUM (changes implementation)

### Priority 5: Future-Proofing (Low impact, low risk)
1. **Create risk register**
   - Document places most likely to break
   - Risk: LOW (documentation)

2. **Create extension recipes**
   - Examples for adding new panels
   - Risk: LOW (examples/docs)

---

## 6. IMPLEMENTATION PLAN

### Phase 6.1: Visibility-Based Panel Building
- [ ] Add visibility tracking to sheet instance
- [ ] Modify buildAllPanels() to check visibility
- [ ] Implement lazy building on tab switch
- [ ] Test with inventory and expensive panels

### Phase 6.2: UI State Management
- [ ] Create UIStateManager class
- [ ] Add methods to save/restore state
- [ ] Bind to rerender lifecycle
- [ ] Test state persistence across updates

### Phase 6.3: Change Tracking
- [ ] Add actor change listener
- [ ] Track which data changed
- [ ] Map to affected panels
- [ ] Skip rebuild for unaffected panels

### Phase 6.4: Diagnostics
- [ ] Add performance logger
- [ ] Log render stages in dev mode
- [ ] Add panel build timing
- [ ] Make observable but not noisy

### Phase 6.5: Hardening & Docs
- [ ] Document Foundry coupling
- [ ] Add risk register
- [ ] Create extension recipes
- [ ] Add compatibility notes

---

## 7. METRICS BEFORE/AFTER

### Before (Current)
- All 18 panels built every render
- No UI state preservation
- No diagnostics
- Estimated overhead: 5-15ms per render

### Target After
- Visible panels built, hidden panels skipped (~8-12 panels in typical use)
- UI state preserved across rerenders
- Dev-mode diagnostics available
- Estimated overhead: 2-5ms per render (60% reduction)
- UI feel: "stable" instead of "reset everything"

---

## 8. RISK MITIGATION

### Risk: Lazy loading bugs introduce regressions
**Mitigation:**
- Add comprehensive integration tests
- Verify all panels load correctly when visited
- Test navigation between all tabs

### Risk: UI state persistence causes memory leaks
**Mitigation:**
- Clear state on sheet close
- Limit state size
- Use WeakMap where appropriate

### Risk: Change tracking introduces subtle bugs
**Mitigation:**
- Thorough testing of edge cases
- Clear documentation of invalidation rules
- Fallback to full rebuild if tracking fails

---

## 9. NEXT STEPS

1. Implement visibility-based panel skipping (Phase 6.1)
2. Create UIStateManager (Phase 6.2)
3. Add selective diagnostics (Phase 6.4 in parallel)
4. Add change tracking (Phase 6.3)
5. Document Foundry coupling (Phase 6.5)
6. Create extension recipes (Phase 6.5)
7. Final testing and verification

---

## 10. TRACKING CHECKLIST

- [ ] Performance audit complete
- [ ] Visibility-based optimization implemented
- [ ] UI state manager implemented
- [ ] Change tracking implemented
- [ ] Diagnostics added
- [ ] Foundry coupling documented
- [ ] Risk register created
- [ ] Extension recipes documented
- [ ] All tests passing
- [ ] Phase 6 complete


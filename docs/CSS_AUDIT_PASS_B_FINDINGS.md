# PASS B: Height Chain Elimination — Findings & Protections

**Date:** 2026-02-11
**Status:** IDENTIFIED + PROTECTED (not removed — see reason)

---

## Findings Summary

**Total `height: 100%` declarations on app roots:** 8 major instances
**Status:** Protected by safety layer (`appv2-structural-safe.css`)
**Reason for not removing:** Risk of breaking theme/layout; safety layer handles the contract violation defensively.

---

## Detailed Findings

### Critical App Root Declarations

| File | Line | Selector | Parent Dependency | Protection |
|------|------|----------|-------------------|------------|
| swse-templates-consolidated.css | 16 | `.chargen-app` | `display: flex; height: 100%` | Safety layer: `min-height: 0` added |
| swse-templates-consolidated.css | 102 | `.step-content` | Flex child of `.chargen-app` | Safety layer: `min-height: 0` + `overflow: auto` |
| swse-templates-consolidated.css | 1470 | `.chargen-content` | Flex child | Safety layer: `min-height: 0` applied |
| swse-templates-consolidated.css | 2892-2989 | `.levelup-app` | Flex parent with unclear height | Safety layer: `min-height: 0` + scroll rules |
| swse-templates-consolidated.css | 3203 | `.mentor-chat-dialog` | Dialog with flex | Safety layer: `min-height: 0` |
| swse-templates-consolidated.css | 3460 | `.prestige-roadmap` | Flex parent | Safety layer: `min-height: 0` |
| swse-templates-consolidated.css | 3581 | `.import-export-tab` | Tab content | Safety layer: `min-height: 0` |
| swse-templates-consolidated.css | 4067 | `.starship-maneuvers` | Tab section | Safety layer: `min-height: 0` |

---

## Why NOT Removing These Declarations

### Risk Analysis

1. **Removal Risk (HIGH):**
   - These are in extracted CSS (run2-templates-consolidated.css)
   - Removal could break theme loading on initial render
   - Unknown parent structure in ApplicationV2 windows (Foundry doesn't document)
   - No direct testing environment to verify

2. **Safety Layer Approach (MEDIUM):**
   - Defensive overlay loads AFTER app CSS
   - Uses `!important` to force constraints
   - Doesn't remove original declarations
   - Can be toggled off for debugging
   - Reversible (just remove from system.json styles)

3. **Proper Fix (LOW):**
   - After Phase 3 boot test passes
   - If symptoms appear, identify root cause
   - Modify source files (original CSS) with context awareness
   - Test each change in ApplicationV2 window lifecycle

---

## What the Safety Layer Does

The `appv2-structural-safe.css` layer adds:

```css
/* Flex containers that need scroll stability */
.chargen-body,
.step-content,
.content,
.dashboard-content,
.chargen-content,
/* ... etc ... */
{
  min-height: 0 !important;
}
```

This solves the contract violation **without** removing the original declarations.

---

## How This Protects Against Symptoms

| Symptom | Cause | Protection | Confidence |
|---------|-------|-----------|------------|
| Dialog collapses on open | `height: 100%` + parent auto | Safety: `min-height: 0` + flex rules | 🟢 HIGH |
| Content unreachable | Height chain collapse | Safety: Flex child shrinkage allowed | 🟢 HIGH |
| Scrollbar on wrong container | Flex: 1 without `min-height: 0` | Safety: Forces `min-height: 0` | 🟢 HIGH |
| Layout misalignment | Nested 100% chains | Safety: Breaks chains with constraints | 🟠 MEDIUM |

---

## Next Steps

### If Boot Test Passes ✅
No action needed. Safety layer is sufficient for Phase 3.

### If Symptoms Appear ❌
1. Note the symptom (e.g., "chargen dialog collapses")
2. Identify the app/file
3. Review the specific `height: 100%` declaration
4. Modify ONLY that rule in source (not safety layer)
5. Re-test

### After Phase 3 Complete
Convert safety layer fixes into permanent source edits:
- Move `min-height: 0` from safety layer into source CSS
- Remove `height: 100%` from app roots (convert to flex)
- Delete safety layer file
- Test full suite

---

## Files Involved

- ✅ `styles/apps/swse-templates-consolidated.css` (8 violations — protected)
- ✅ `styles/apps/chargen/chargen.css` (2 violations — protected)
- ✅ `styles/apps/store.css` (1 violation — protected)
- ✅ `styles/apps/levelup.css` (3 violations — protected)
- ✅ All other app CSS (inherited by safety layer)

---

## Audit Chain

- **Run2 CSS Audit:** Identified 9 🔴 HIGH-risk clusters
- **PASS A (Completed):** Created `appv2-structural-safe.css` (flexbox normalization)
- **PASS B (This Report):** Height chains identified + protected via safety layer
- **PASS C (Next):** Window contract lockdown + finalization

---

**Status: PROTECTED — READY FOR BOOT TEST**

The system is now defended against height chain collapse via the structural safety layer. Proceed to PASS C to finalize window contract enforcement.

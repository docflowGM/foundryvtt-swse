# Character Sheet Window Contract Enforcement

## Overview

The Character Sheet Window Contract is an **immutable architectural law** that governs how the SWSE V2 character sheet renders, scrolls, and manages its layout. It replaces ad-hoc patching with systematic enforcement.

This document describes:
1. **The Contract** - Immutable rules
2. **Enforcement** - How violations are detected and reported
3. **Sentinel Integration** - Governance tracking
4. **Violation Recovery** - How to fix breaches

---

## The Contract (Immutable Rules)

### Rule 1: FRAME CONTRACT
- **Statement**: ApplicationV2 frame controls window size and resize behavior
- **Requirement**: No code may interfere with frame resize after initial render
- **Enforcement**: Frame contract validator checks for size clamping in setPosition()
- **Severity**: CRITICAL

### Rule 2: LAYOUT CONTRACT
- **Statement**: DOM must follow a single, unbroken flex chain
- **Required Structure**:
  ```
  .window-content (ApplicationV2 frame, overflow: hidden)
    └─ form.swse-character-sheet-form (flex: 1 1 auto, min-height: 0)
      └─ .sheet-shell (flex: 1 1 auto, min-height: 0)
        ├─ header (flex: 0 0 auto)
        ├─ .sheet-actions (flex: 0 0 auto)
        ├─ .sheet-tabs (flex: 0 0 auto)
        └─ .sheet-body (flex: 1 1 auto, min-height: 0, overflow: hidden)
          └─ .tab.active ONLY (flex: 1 1 auto, min-height: 0, overflow-y: auto)
  ```
- **Enforcement**: Layout validator checks for presence and correct ordering
- **Severity**: CRITICAL

### Rule 3: SCROLL CONTRACT
- **Statement**: Exactly ONE element scrolls vertically: `.tab.active`
- **Requirements**:
  - Only `.tab.active` may have `overflow-y: auto`
  - No other element may create independent scroll region
  - No nested scroll containers
- **Enforcement**: Scroll validator counts `overflow-y: auto` elements (must be 1)
- **Severity**: CRITICAL
- **Sentinel Layer**: `contract-enforcer`

### Rule 4: PANEL CONTRACT
- **Statement**: Inner panels must NOT introduce vertical scrolling
- **Requirements**:
  - No `.swse-panel`, `.swse-section`, `.swse-container`, etc. may have `overflow-y: auto`
  - No max-height constraints that break flex growth
  - Panels shrink/expand with flex, not fixed height
- **Enforcement**: Panel validator scans for `overflow: auto` and `overflow-y: auto`
- **Severity**: CRITICAL
- **Sentinel Layer**: `contract-enforcer`

### Rule 5: FLEX CHAIN CONTRACT
- **Statement**: All flex children must have `min-height: 0` to allow vertical shrinking
- **Requirements**:
  - Every element in the flex chain has `min-height: 0`
  - No `height: auto` on flex containers
  - No `max-height` that breaks flex logic
- **Enforcement**: Flex chain validator checks each level
- **Severity**: HIGH
- **Sentinel Layer**: `contract-enforcer`

### Rule 6: CSS RULES (FORBIDDEN)
- Multiple vertical scroll containers
- Overflow hacks on parent containers  
- Height: auto on flex containers (use min-height: auto on non-flex items)
- Max-height constraints on scrollable panels
- Conflicting overflow rules

---

## Enforcement Architecture

### CharacterSheetContractEnforcer

**Location**: `scripts/sheets/v2/contract-enforcer.js`

**Responsibilities**:
- Validate DOM against contract rules
- Detect violations at runtime
- Report violations to SentinelEngine
- Track violation frequency and escalate severity
- Provide diagnostic feedback

**Integration Points**:
1. **Sentinel Layer** (`contract-enforcer`):
   - Registered at first validation
   - Reports all violations with metadata
   - Tracks violation count and escalates severity

2. **Character Sheet** (`_onRender`):
   - Called after render completes
   - Validates in 100ms setTimeout to allow DOM stabilization
   - Reports results synchronously to console and Sentinel

### Validation Methods

#### `validate(element)`
Core validation function that checks all rules.

**Returns**:
```javascript
{
  passed: boolean,           // true if no violations
  violations: [             // CRITICAL violations
    {
      rule: string,         // e.g., "SCROLL", "PANELS"
      severity: string,
      message: string,
      selector?: string|array
    }
  ],
  warnings: [               // Non-critical warnings
    { rule, severity, message, selector }
  ]
}
```

#### `validateAndReport(element)`
Wrapper that validates and reports to both console and Sentinel.

**Console Output**:
```
[CHARACTER SHEET CONTRACT] VIOLATIONS FOUND:
  [SCROLL] Expected 1 scroll owner, found 3
    selector: .defenses-container
    selector: .abilities-panel
    selector: .skills-grid
```

**Sentinel Report**:
```
[CRITICAL] [SCROLL] Expected 1 scroll owner, found 3
  violationCount: 1
  expectedCount: 1
  actualCount: 3
  scrollOwners: [...]
```

### Violation Detection Logic

#### SCROLL CONTRACT
```javascript
// Count elements with overflow-y: auto
const scrollOwners = element.querySelectorAll('[style*="overflow-y: auto"], [style*="overflow: auto"]');
if (scrollOwners.length !== 1) {
  // VIOLATION: Must be exactly 1
}
```

#### PANEL CONTRACT
```javascript
// Find panels with independent scroll
const panels = element.querySelectorAll('[class*="-panel"], [class*="-container"]');
panels.forEach(panel => {
  const overflow = getComputedStyle(panel).overflowY;
  if (overflow === 'auto' || overflow === 'scroll') {
    // VIOLATION: Inner panel has scroll
  }
});
```

#### FLEX CHAIN CONTRACT
```javascript
// Check each flex container for min-height: 0
const chain = ['.window-content', 'form', '.sheet-shell', '.sheet-body', '.tab'];
chain.forEach(selector => {
  const el = document.querySelector(selector);
  const minHeight = getComputedStyle(el).minHeight;
  if (el.style.display === 'flex' && minHeight !== '0px') {
    // VIOLATION: Missing min-height: 0
  }
});
```

---

## Sentinel Integration

### Layer Registration

The enforcer registers as a Sentinel layer on first validation:

```javascript
SentinelEngine.registerLayer("contract-enforcer", {
  enabled: true,
  readOnly: true,
  description: "Character Sheet Window Contract enforcement",
  init: () => { /* initialization */ }
});
```

### Violation Reporting

All violations route through Sentinel with structured metadata:

```javascript
SentinelEngine.report(
  "contract-enforcer",                    // Layer name
  SentinelEngine.SEVERITY.CRITICAL,       // Severity level
  "[SCROLL] Expected 1 scroll owner, found 3",  // Message
  {                                       // Metadata
    rule: "SCROLL",
    expectedCount: 1,
    actualCount: 3,
    scrollOwners: [/* elements */]
  },
  {                                       // Options
    aggregateKey: "contract-SCROLL",
    category: "contract-violation",
    subcode: "CONTRACT_BREACH_SCROLL",
    source: "CharacterSheetContractEnforcer.validate()",
    evidence: { rule, selector, occurrences }
  }
);
```

### Severity Escalation

Violations are escalated based on frequency:

| Count | Escalation | Reason |
|-------|-----------|--------|
| 1     | Initial severity | First occurrence |
| 2-3   | + 1 level if lower than ERROR | Pattern emerging |
| 4+    | CRITICAL | Systemic violation |

### Sentinel Queries

View contract violations via Sentinel API:

```javascript
// Get all contract violations
SentinelEngine.getReportsByLayer("contract-enforcer");

// Get violations by rule
SentinelEngine.getReportsBySubcode("CONTRACT_BREACH_SCROLL");

// Get violation summary
CharacterSheetContractEnforcer.getViolationSummary();
```

---

## Runtime Validation Flow

### On Character Sheet Open

1. **_onRender() called** (ApplicationV2 lifecycle)
2. **100ms setTimeout** (allow DOM stabilization)
3. **validate(element)** called
   - Scans DOM
   - Checks all 6 rules
   - Collects violations
4. **Report to Sentinel**
   - Violation count aggregated
   - Severity determined
   - Metadata attached
5. **Console output**
   - Summary to console
   - Each violation listed
6. **Return** `{ passed, violations, warnings }`

### Example Output

**Good State**:
```
[CHARACTER SHEET CONTRACT] ✓ All rules passed
[SENTINEL] contract-enforcer (INFO): Character sheet contract validation passed
```

**Bad State**:
```
[CHARACTER SHEET CONTRACT] VIOLATIONS FOUND:
  [SCROLL] Expected 1 scroll owner, found 2
    selector: form.swse-character-sheet-form > .sheet-body > .tab
    selector: .defenses-container
[SENTINEL] contract-enforcer (CRITICAL): [SCROLL] Expected 1 scroll owner, found 2
  violationCount: 1
  expectedCount: 1
  actualCount: 2
```

---

## Violation Recovery

### When Contract is Breached

1. **Detection**: Enforcer detects violation on next render
2. **Reporting**: Violation logged to console and Sentinel
3. **Severity**: Escalates with repetition
4. **Investigation**: Use diagnostic tools to identify cause

### How to Fix a Breach

#### Step 1: Identify the Violation
Look at console output and/or Sentinel report.

#### Step 2: Find the Root Cause
Check CSS rules for the violating selector:

```bash
# Find CSS rule for violated selector
grep -r "overflow.*auto" styles/sheets/*.css | grep "panel\|container"
```

#### Step 3: Remove or Fix the Rule
- **Remove** if it creates independent scroll (violates PANEL or SCROLL rule)
- **Fix** if it's a misplaced min-height or flex setting

#### Step 4: Validate
- Reopen the sheet
- Verify console shows "✓ All rules passed"
- Check Sentinel for clean report

### Example: Fix a Panel Scroll Violation

**Violation Found**:
```
[SCROLL] Expected 1 scroll owner, found 2
  selector: .tab
  selector: .defenses-container
```

**Root Cause**: `.defenses-container` has `overflow: auto`

**Fix**:
```css
/* In styles/sheets/v2-sheet.css, line 6045 */
.swse-sheet .defenses-container--cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  /* REMOVE: overflow: auto; */  ← Delete this line
  padding-right: 4px;
}
```

**Verify**:
1. Reopen character sheet
2. Console shows "✓ All rules passed"
3. Content scrolls in parent .tab, not in panel
4. Sentinel shows VALIDATION_PASSED

---

## Preventing Regressions

### Code Review Checklist

When modifying character sheet CSS or template:

- [ ] No new `overflow-y: auto` added except for `.tab.active`
- [ ] No new `overflow: auto` on panels
- [ ] All flex containers have `min-height: 0`
- [ ] No new max-height constraints on scrollable areas
- [ ] Panels use flex grow/shrink, not fixed height
- [ ] Validation passes on first render

### Testing

Run validation explicitly:

```javascript
// In browser console
CharacterSheetContractEnforcer.validateAndReport(document.querySelector('.application.swse-character-sheet'));
```

### Automated Enforcement

The enforcer validates **automatically** on every character sheet render:
- Catches violations immediately
- Reports to Sentinel for tracking
- Escalates severity with repetition
- Prevents silent breakage

---

## Reference

### Files Involved

| File | Purpose |
|------|---------|
| `scripts/sheets/v2/contract-enforcer.js` | Validation engine |
| `scripts/sheets/v2/character-sheet.js` | Enforcer integration |
| `styles/sheets/character-sheet.css` | Character sheet styles |
| `styles/sheets/v2-sheet.css` | V2 sheet styles |
| `scripts/governance/sentinel/sentinel-core.js` | Sentinel reporting |

### Key Classes

| Class | Purpose |
|-------|---------|
| `CharacterSheetContractEnforcer` | Contract validation and reporting |
| `SentinelEngine` | Governance and violation tracking |

### Contract Rules Summary

| Rule | Enforcer | Severity | Violation Example |
|------|----------|----------|-------------------|
| FRAME | validateFrameContract() | CRITICAL | Window size clamped after resize |
| LAYOUT | validateHeightChain() | CRITICAL | Missing `.sheet-body` container |
| SCROLL | findScrollOwners() | CRITICAL | Multiple `overflow-y: auto` elements |
| PANELS | findIllegalPanelScrollers() | CRITICAL | Panel with `overflow: auto` |
| FLEX | validateHeightChain() | HIGH | Missing `min-height: 0` on flex child |

---

## Summary

The Character Sheet Window Contract transforms ad-hoc fixes into **systematic enforcement**:

- **Before**: Patch symptoms, regressions likely
- **After**: Enforce contract, regressions caught immediately

The enforcer validates on every render, reports to Sentinel, and escalates violations. This creates a protective layer that prevents scroll/layout issues before they reach users.

**Key Principle**: Architecture is law, not suggestion.

# Phase 5 — Runtime Verification Report (Template)

**Completion Date:** [DATE - Fill in after testing]  
**Status:** [PENDING - to be filled with PASS or FAIL]  
**Branch:** `claude/audit-css-governance-LE4YE`

---

## Executive Summary

**One-Line Verdict:**  
[e.g., "✅ PASS: Character sheet scrolls correctly with P0 failure resolved" or "❌ FAIL: Form still overflowing parent, ratio 2.1x"]

---

## Test Environment

**Foundry Version:**  
[e.g., 13.0.1]

**System/Module:**  
foundry-swse [version]

**Sheet Type Tested:**  
Normal character sheet (actor type: character)

**Default Window Dimensions:**  
Width: [px] | Height: [px]

**Browser/OS:**  
[e.g., Chrome 130 on Windows 11]

**Test Timestamp:**  
[ISO timestamp]

---

## Scenarios Completed

| Scenario | Status | Notes |
|----------|--------|-------|
| A — Initial Open | [PASS/FAIL] | |
| B — Resize Taller | [PASS/FAIL] | |
| C — Resize Shorter | [PASS/FAIL] | |
| D — Tab Switching | [PASS/FAIL] | |
| E — Stress Content | [PASS/FAIL] | |

---

## Scenario A — Initial Open

**Result:**  
[PASS / FAIL]

**Evidence:**
```
[Paste output from CharacterSheetRuntimeVerifier.printVerificationReport(app)]
```

**Observations:**
- Content below fold is reachable: [YES/NO]
- Only one main vertical scrollbar: [YES/NO]
- Scrollbar belongs to `.sheet-body > .tab.active`: [YES/NO]
- Form does not own scroll: [YES/NO]
- `.sheet-body` does not own scroll: [YES/NO]

---

## Scenario B — Resize Taller

**Result:**  
[PASS / FAIL]

**Before Resize:**
```javascript
{
  tab.active.clientHeight: [px],
  form.clientHeight: [px],
  form.scrollHeight: [px]
}
```

**After Resize:**
```javascript
{
  tab.active.clientHeight: [px],
  form.clientHeight: [px],
  form.scrollHeight: [px]
}
```

**Evidence:**
```
[Paste output from CharacterSheetRuntimeVerifier.printVerificationReport(app)]
```

**Observations:**
- Tab clientHeight increased: [YES/NO]
- Form remained bounded: [YES/NO]
- No new scroll owners: [YES/NO]

---

## Scenario C — Resize Shorter

**Result:**  
[PASS / FAIL]

**Before Resize:**
```javascript
{
  tab.active.clientHeight: [px],
  form.clientHeight: [px]
}
```

**After Resize:**
```javascript
{
  tab.active.clientHeight: [px],
  form.clientHeight: [px]
}
```

**Evidence:**
```
[Paste output from CharacterSheetRuntimeVerifier.printVerificationReport(app)]
```

**Observations:**
- Tab clientHeight decreased: [YES/NO]
- Tab remains scrollable: [YES/NO]
- Ancestors did not become scroll owners: [YES/NO]

---

## Scenario D — Tab Switching

**Result:**  
[PASS / FAIL]

**Tabs Tested:**
- [ ] gear
- [ ] combat
- [ ] skills
- [ ] notes
- [ ] biography

**Tab Results:**

### Gear Tab
```
[Paste evidence from verification report]
```

### Combat Tab
```
[Paste evidence from verification report]
```

### Skills Tab
```
[Paste evidence from verification report]
```

### Notes Tab
```
[Paste evidence from verification report]
```

**Observations:**
- Inactive tabs are hidden: [YES/NO]
- Active tab is sole scroll owner in all tabs: [YES/NO]
- No tab switch caused form/body to scroll: [YES/NO]

---

## Scenario E — Stress Content

**Result:**  
[PASS / FAIL]

**Tab Used:**  
[e.g., Gear tab with 47 items]

**Content Metrics:**
```javascript
{
  tab.active.clientHeight: [px],
  tab.active.scrollHeight: [px],
  isScrollable: [true/false],
  scrollRange: "[0 - XXX px]"
}
```

**Evidence:**
```
[Paste output from CharacterSheetRuntimeVerifier.printVerificationReport(app)]
```

**Observations:**
- Nested panels do not create competing scrollers: [YES/NO]
- All content is reachable through tab scroll: [YES/NO]
- Scroll is responsive: [YES/NO]

---

## Geometry Snapshots

### Snapshot 1 — Initial Open (Default Height)

**Timestamp:** [ISO time]

```json
[Paste full output from CharacterSheetRuntimeVerifier.runFullVerification(app)]
```

### Snapshot 2 — After Resize Taller

**Timestamp:** [ISO time]

```json
[Paste full output from CharacterSheetRuntimeVerifier.runFullVerification(app)]
```

### Snapshot 3 — After Resize Shorter

**Timestamp:** [ISO time]

```json
[Paste full output from CharacterSheetRuntimeVerifier.runFullVerification(app)]
```

### Snapshot 4 — Heavy Content Tab (Gear)

**Timestamp:** [ISO time]

```json
[Paste full output from CharacterSheetRuntimeVerifier.runFullVerification(app)]
```

---

## Scroll Owner Report

### Summary

| Metric | Value |
|--------|-------|
| Legal scrollers (should be 1) | [X] |
| Illegal scrollers (should be 0) | [X] |
| Overall verdict | [PASS/FAIL] |

### Legal Scrollers

```
✅ .sheet-body > .tab.active
  - overflow-y: auto
  - clientHeight: [px]
  - scrollHeight: [px]
  - has scroll: [true/false]
```

### Illegal Scrollers

[List any found, or write "None detected"]

```
❌ [selector]
  - overflow-y: [value]
  - clientHeight: [px]
  - scrollHeight: [px]
  - reason for illegality: [why this breaks contract]
```

---

## P0 Failure Check

| Metric | Value | Pass |
|--------|-------|------|
| Form height | [px] | |
| Parent (window-content) height | [px] | |
| Ratio | [X.XXx] | [< 1.5x] |
| Form flex | [value] | [should be `1 1 0%`] |
| Form flex-basis | [value] | [should be `0%`] |
| Form overflow | [value] | [should be `hidden`] |

**P0 Status:**  
[PASSED / FAILED]

---

## Overall Pass/Fail Verdict

**Final Verdict:**  
[✅ PASS / ❌ FAIL]

**Reasoning:**

[Write 2-3 sentences explaining why the verdict is pass or fail. Include whether all 6 pass/fail criteria were met:]

1. Form height remains bounded by parent chain: [YES/NO]
2. .sheet-body is not a main vertical scroll owner: [YES/NO]
3. .tab.active is the only main vertical scroll owner: [YES/NO]
4. Content-heavy tabs are fully reachable: [YES/NO]
5. Resizing changes usable tab height: [YES/NO]
6. No illegal inner panel scrollers block access: [YES/NO]

---

## If Failed: First Broken Node (Required if verdict is FAIL)

### Identification

**First broken node:**  
[selector, e.g., `form.swse-character-sheet-form`]

**Broken property:**  
[e.g., `overflow` or `flex` or `height`]

**Contract rule broken:**  
[e.g., "Bounded height chain" or "Single scroll owner"]

### Runtime Evidence

**Node's current value:**
```javascript
{
  computed: {
    property: "[current value]",
    flex: "[value]",
    flexBasis: "[value]",
    overflow: "[value]",
    overflowY: "[value]"
  },
  geometry: {
    clientHeight: [px],
    scrollHeight: [px],
    parentClientHeight: [px]
  }
}
```

**Why it breaks the contract:**  
[2-3 sentences explaining the failure mechanism]

### Winning CSS Rule

**File:**  
`styles/sheets/[filename].css`

**Selector:**  
[e.g., `.sheet-body`]

**Property and value:**  
```css
property: value;
```

**Line number:**  
[if available]

**Why this rule wins:**  
[specificity, cascade, or other reason]

### Expected Winning Rule

**File:**  
`styles/sheets/v2-sheet.css`

**Should contain:**
```css
selector {
  property: expected-value;
}
```

---

## Phase 5 Analysis

### What Worked in Phase 4 Repairs

[List any aspects that did work correctly]

### What Did Not Work

[List any aspects that still fail]

### Root Cause Assessment

[If failed: explain what Phase 4 did not account for]

---

## Phase 6 Target (If Needed)

**If verdict is FAIL, define the narrowest possible next repair:**

- **Node:** [one selector]
- **Properties:** [one or two properties]
- **Files affected:** [one or two files]
- **Concrete action:** [one clear sentence describing the fix]

**Example:**
> Form still resolves to content height because `flex: 1 1 auto` is winning over `flex: 1 1 0%`. The `1 1 auto` is set in character-sheet.css line 45 with a more specific selector. Change it to `flex: 1 1 0%` and add `!important` if needed, or remove the character-sheet.css rule entirely since v2-sheet.css already defines the correct value.

---

## Additional Notes

[Any other observations or context]

---

## Artifacts

**Screenshots:**
- [List any screenshots taken during testing]

**Console logs:**
- [Any relevant console output saved]

**Devtools inspection:**
- [Any devtools findings]

---

## Sign-Off

**Tested by:**  
[Name or "automated"]

**Date:**  
[ISO date]

**Confidence level:**  
[High / Medium / Low - how confident are you in these results?]

---

**End Phase 5 Report**

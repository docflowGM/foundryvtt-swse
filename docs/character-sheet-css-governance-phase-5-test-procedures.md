# Phase 5 — Runtime Verification Test Procedures

**Purpose:** Validate Phase 4 repairs by running the actual character sheet in Foundry and capturing exact geometry data.

**Outcomes:** Either prove the P0 is fixed with runtime evidence, or isolate the exact remaining fault.

---

## Quick Start

1. Open a character sheet in Foundry (Gear or Combat tab recommended)
2. Open browser devtools (F12)
3. Paste this into the console and run it:

```javascript
// Load the runtime verifier and run verification
const appElement = document.querySelector('[class*="swse-character-sheet"]');
if (!appElement) {
  console.error('Sheet not found. Make sure the character sheet is open.');
} else {
  CharacterSheetRuntimeVerifier.printVerificationReport(appElement);
}
```

4. Check the console output for the quick status result
5. For detailed JSON data, run:

```javascript
const result = await CharacterSheetRuntimeVerifier.runFullVerification(appElement);
console.log(JSON.stringify(result, null, 2));
// Copy and paste the output into your report
```

---

## Test Environment Setup

Before running tests, document:

```javascript
// Run this in console to capture environment info
{
  foundryVersion: game.version,
  systemName: game.system.id,
  systemVersion: game.system.version,
  browserUserAgent: navigator.userAgent,
  timestamp: new Date().toISOString()
}
```

---

## Scenario A — Initial Open

**Purpose:** Verify sheet opens with correct scroll ownership

**Setup:**
1. Close all sheets
2. Open a character sheet with content that requires scrolling
   - Recommended: Gear tab (has many items) or Combat tab (has many attacks)
3. Let it fully load

**Test:**
```javascript
const app = document.querySelector('[class*="swse-character-sheet"]');
CharacterSheetRuntimeVerifier.printVerificationReport(app);
```

**Pass Criteria:**
- [ ] Console shows `✅ RUNTIME VERIFIED` or similar success message
- [ ] Geometry snapshot shows form clientHeight < windowContent clientHeight
- [ ] Exactly one legal scroll owner: `.sheet-body > .tab.active`
- [ ] No illegal scroll owners detected
- [ ] P0 failure check shows PASSED

**Fail Evidence to Capture (if not passed):**
- Screenshot of console output
- Form height vs parent height ratio (geometry section)
- Any illegal scroll owners listed
- Winning CSS rule for any broken property (devtools > Computed > Show inherited)

---

## Scenario B — Resize Taller

**Purpose:** Verify sheet adapts to larger window

**Setup:**
1. Sheet is open from Scenario A
2. Click and drag the bottom edge of the window downward to increase height by ~200-300px
3. Release and wait for render

**Test:**
```javascript
const app = document.querySelector('[class*="swse-character-sheet"]');
const beforeHeight = app.querySelector('.sheet-body > .tab.active')?.clientHeight;

// [After resize, measure again]
const afterHeight = app.querySelector('.sheet-body > .tab.active')?.clientHeight;
console.log(`Tab height before: ${beforeHeight}px`);
console.log(`Tab height after: ${afterHeight}px`);
console.log(`Increased: ${afterHeight > beforeHeight ? 'YES ✅' : 'NO ❌'}`);

CharacterSheetRuntimeVerifier.printVerificationReport(app);
```

**Pass Criteria:**
- [ ] Tab clientHeight increases
- [ ] Form remains bounded by window height
- [ ] No new scroll owners created
- [ ] Scrollbar position and range still correct

**Fail Evidence to Capture (if not passed):**
- Before/after geometry data
- Whether form is now overflowing window bounds
- Any newly visible scroll owners

---

## Scenario C — Resize Shorter

**Purpose:** Verify sheet adapts to smaller window

**Setup:**
1. Sheet is open and was resized taller (Scenario B)
2. Click and drag the bottom edge upward to decrease height by ~200-300px
3. Release and wait for render

**Test:**
```javascript
const app = document.querySelector('[class*="swse-character-sheet"]');
const beforeHeight = app.querySelector('.sheet-body > .tab.active')?.clientHeight;

// [After resize, measure again]
const afterHeight = app.querySelector('.sheet-body > .tab.active')?.clientHeight;
console.log(`Tab height before: ${beforeHeight}px`);
console.log(`Tab height after: ${afterHeight}px`);
console.log(`Decreased: ${afterHeight < beforeHeight ? 'YES ✅' : 'NO ❌'}`);

CharacterSheetRuntimeVerifier.printVerificationReport(app);
```

**Pass Criteria:**
- [ ] Tab clientHeight decreases
- [ ] Tab remains scrollable (if content exceeds new height)
- [ ] Form remains bounded
- [ ] No form-is-main-scroller failure
- [ ] Content still reachable through tab scroll

**Fail Evidence to Capture (if not passed):**
- Before/after geometry
- Whether form overflows window bounds
- Whether tab is no longer scrollable

---

## Scenario D — Tab Switching

**Purpose:** Verify scroll ownership is maintained across tab changes

**Setup:**
1. Sheet is open
2. Navigate to a content-heavy tab (Gear, Combat, or Skills)

**Test for each tab:**
```javascript
const app = document.querySelector('[class*="swse-character-sheet"]');

// Record initial state
const beforeGeometry = CharacterSheetRuntimeVerifier.captureGeometrySnapshot(app);
console.log(`Before tab switch - Tab active: ${app.querySelector('.sheet-body > .tab.active')?.className}`);

// [User: Click on another tab]
// After tab loads, measure again
const afterGeometry = CharacterSheetRuntimeVerifier.captureGeometrySnapshot(app);
console.log(`After tab switch - Tab active: ${app.querySelector('.sheet-body > .tab.active')?.className}`);

// Check scroll ownership
CharacterSheetRuntimeVerifier.printVerificationReport(app);
```

**Repeat for tabs:** gear, combat, skills, notes, biography

**Pass Criteria:**
- [ ] All tabs show active tab as sole scroll owner
- [ ] No form or sheet-body scrolling
- [ ] Inactive tabs are hidden (display: none)
- [ ] No competing vertical scrollbars

**Fail Evidence to Capture (if not passed):**
- Which tab(s) fail
- Scroll ownership for that tab
- Computed styles for that tab's elements

---

## Scenario E — Stress Content (Heavy Tab)

**Purpose:** Verify single scroll owner works with large content

**Setup:**
1. Sheet is open
2. Navigate to the Gear tab (typically has many items)

**Test:**
```javascript
const app = document.querySelector('[class*="swse-character-sheet"]');
const tab = app.querySelector('.sheet-body > .tab.active');

console.log(`Tab content scrollHeight: ${tab.scrollHeight}px`);
console.log(`Tab visible height (clientHeight): ${tab.clientHeight}px`);
console.log(`Tab is scrollable: ${tab.scrollHeight > tab.clientHeight}`);
console.log(`Tab scrollTop range: 0 to ${tab.scrollHeight - tab.clientHeight}px`);

// Scroll to different positions and verify content is reachable
tab.scrollTop = 0;
console.log('At top: content visible?', tab.querySelector('.swse-sheet')?.offsetHeight);

tab.scrollTop = tab.scrollHeight - tab.clientHeight;
console.log('At bottom: content visible?', tab.querySelector('[class*="gear-item"]')?.offsetHeight);

CharacterSheetRuntimeVerifier.printVerificationReport(app);
```

**Pass Criteria:**
- [ ] Content scrollHeight is larger than visible clientHeight
- [ ] Scrollbar appears only in tab area
- [ ] Scrolling to top and bottom both work
- [ ] No nested scrollers create competing scroll regions
- [ ] All content is reachable

**Fail Evidence to Capture (if not passed):**
- Scroll owner audit (see which element is illegally scrolling)
- Content that is unreachable (clipped/hidden despite scrolling)
- Any nested panel with its own scrollbar

---

## Capturing Full Geometry Snapshots

**Purpose:** Document exact runtime values for analysis

Run this at each test point and save the output to your report:

```javascript
const app = document.querySelector('[class*="swse-character-sheet"]');
const result = await CharacterSheetRuntimeVerifier.runFullVerification(app);
console.log(JSON.stringify(result, null, 2));
```

**Record at minimum:**

1. **Snapshot 1:** Initial open (default height)
2. **Snapshot 2:** After resize taller
3. **Snapshot 3:** After resize shorter
4. **Snapshot 4:** Heavy content tab (Gear/Combat)

**What to save:**
- Copy the entire JSON output
- Include it in the runtime report under "Geometry Snapshots"

---

## Identifying Illegal Scroll Owners

If Scenario tests show failures, run this diagnostic:

```javascript
const app = document.querySelector('[class*="swse-character-sheet"]');
const scrollOwners = CharacterSheetRuntimeVerifier.identifyScrollOwners(app);
const verdict = CharacterSheetRuntimeVerifier.evaluateScrollOwnership(scrollOwners);

console.log('Scroll Owner Audit:');
console.log(`Legal count: ${verdict.legalCount}`);
console.log(`Illegal count: ${verdict.illegalCount}`);

console.log('\nLegal scrollers (should be exactly 1):');
verdict.legalScrollers.forEach(s => {
  console.log(`  ✅ ${s.selector}: overflow-y=${s.overflowY}, clientHeight=${s.clientHeight}, scrollHeight=${s.scrollHeight}`);
});

console.log('\nIllegal scrollers (should be 0):');
verdict.illegalScrollers.forEach(s => {
  console.log(`  ❌ ${s.selector || s.path}: overflow-y=${s.overflowY}, clientHeight=${s.clientHeight}, scrollHeight=${s.scrollHeight}`);
});
```

---

## P0 Failure Detection

If any scenario shows failure, check if it's the P0 issue:

```javascript
const app = document.querySelector('[class*="swse-character-sheet"]');
const p0Check = CharacterSheetRuntimeVerifier.checkP0Failure(app);

console.log('P0 Failure Check:');
console.log(`  Detected: ${p0Check.detected}`);
console.log(`  Form height: ${p0Check.formHeight}px`);
console.log(`  Parent height: ${p0Check.parentHeight}px`);
console.log(`  Ratio: ${p0Check.ratio}x (threshold: ${p0Check.threshold}x)`);
console.log(`  Form flex: ${p0Check.formFlex}`);
console.log(`  Form flex-basis: ${p0Check.formFlexBasis}`);
console.log(`  Form overflow: ${p0Check.formOverflow}`);
```

---

## Capturing Winning CSS Rules (if Failed)

If a test fails and you identify the broken node, use devtools to find the winning rule:

1. Open devtools (F12)
2. Right-click on the broken element in the sheet
3. Select "Inspect"
4. In the Styles panel, look for the property that is wrong
5. Find which rule is winning (shown in bold)
6. Record:
   - File name
   - Selector
   - Property: value
   - Line number (if visible)
   - What should win instead

**Example failure evidence format:**
```
First broken node: form.swse-character-sheet-form
Broken property: overflow
Current value: visible
Current computed flex: 1 1 auto
Should be: overflow: hidden, flex: 1 1 0%

Winning rule: styles/sheets/character-sheet.css line 45
  form { overflow: auto; }

Expected rule: styles/sheets/v2-sheet.css line 78
  form.swse-character-sheet-form { flex: 1 1 0%; overflow: hidden; }

Why it breaks: overflow: visible allows form to become scroll owner if content overflows
```

---

## Report Format

At the end of testing, create a markdown file with sections:

```markdown
# Phase 5 Runtime Verification Report

## Test Environment
- Foundry version: X.X.X
- System: foundry-swse vX.X.X
- Sheet type: normal character sheet
- Default window size: 1024x768 (or whatever you used)
- Test date: ISO date
- Tester: name

## Scenarios Completed
- [x] Scenario A - Initial open
- [x] Scenario B - Resize taller
- [x] Scenario C - Resize shorter
- [x] Scenario D - Tab switching
- [x] Scenario E - Stress content

## Quick Status
[Paste output from printVerificationReport]

## Geometry Snapshots
[Include JSON from runFullVerification at each test point]

## Scroll Owner Report
[Results from scroll owner audit]

## Verdict
PASS or FAIL

## If Failed: First Broken Node
[Exact element, property, values, and winning rule]
```

---

## Troubleshooting Console Access

If CharacterSheetRuntimeVerifier is not found:

1. Check that scripts/sheets/v2/runtime-verifier.js is being loaded
2. In console, type: `CharacterSheetRuntimeVerifier` - should not error
3. If error, check Network tab in devtools to verify the script loaded
4. Reload the sheet (F5) and try again

If you see errors in the report output, they are real failures and should be included in your report.

---

## Success Definition

At the end of Phase 5, answer this question with measured evidence:

**"Does the character sheet scroll correctly now?"**

- **YES:** All scenarios pass, printVerificationReport shows `✅ RUNTIME VERIFIED`, geometry snapshots show correct values
- **NO:** Identify the first broken node, the broken property, its current value, and the winning CSS rule

No vague answers. Evidence only.

---

## Next Steps

1. Run all scenarios above
2. Capture all geometry snapshots
3. Create the runtime report
4. Determine pass/fail
5. If fail, identify the exact first broken node and winning rule
6. Phase 6 repairs will be surgical based on this evidence

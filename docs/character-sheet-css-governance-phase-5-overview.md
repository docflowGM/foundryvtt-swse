# Phase 5 — Post-Repair Runtime Verification and Triage

**Status:** Pending (Infrastructure Ready)  
**Branch:** `claude/audit-css-governance-LE4YE`  
**Mission:** Run the repaired sheet live and prove whether the P0 is fixed.

---

## Purpose

Phase 4 applied CSS repairs on paper. Phase 5 proves whether they work in practice.

At the end of Phase 5, we answer with measured evidence:
- **Does the character sheet scroll correctly now?**
- **If not, what is the exact first broken node and why?**

No theory. No assumptions. Only runtime truth.

---

## What Phase 5 Produces

### On PASS
- ✅ Character sheet is functionally restored
- ✅ One coherent vertical scroll region
- ✅ No clipped inaccessible content
- ✅ Resize changes usable content height
- ✅ No competing main vertical scrollers
- ✅ Runtime verification report with geometry snapshots as proof

### On FAIL
- ❌ Exact first broken node identified
- ❌ Exact computed runtime values captured
- ❌ Exact winning CSS rule(s) causing it documented
- ❌ Narrow Phase 6 repair target defined
- ❌ No vague "still broken" reporting

---

## How to Run Phase 5

### Prerequisites
1. Foundry v13 running locally
2. System: foundry-swse (with Phase 4 repairs merged)
3. Character sheet open in browser
4. Browser devtools available (F12)

### Quick Start (5 minutes)

1. **Open the sheet:**
   - Log in to Foundry
   - Open a character sheet (any character)
   - Gear tab or Combat tab recommended (both have scrollable content)

2. **Run verification in browser console:**

   ```javascript
   // In devtools console (F12), paste and run:
   const appElement = document.querySelector('[class*="swse-character-sheet"]');
   if (!appElement) {
     console.error('Sheet not found');
   } else {
     CharacterSheetRuntimeVerifier.printVerificationReport(appElement);
   }
   ```

3. **Check the output:**
   - If it shows `✅ RUNTIME VERIFIED`, Phase 5 PASSES ✅
   - If it shows `❌ FAILURE`, note which check failed and continue to detailed testing

### Full Testing (30-45 minutes)

For complete verification, run all 5 test scenarios:

1. **Scenario A — Initial Open**
   - Measure scroll ownership on startup
   - Expected: Exactly one scroll owner at `.tab.active`

2. **Scenario B — Resize Taller**
   - Drag window edge to increase height
   - Expected: Tab height increases, form stays bounded

3. **Scenario C — Resize Shorter**
   - Drag window edge to decrease height
   - Expected: Tab height decreases, still scrollable

4. **Scenario D — Tab Switching**
   - Switch between gear, combat, skills, notes tabs
   - Expected: Each tab is sole scroll owner, no competing scrollers

5. **Scenario E — Stress Content**
   - Open Gear tab with many items
   - Expected: All content reachable, no nested scrollers

**Reference:** See `docs/character-sheet-css-governance-phase-5-test-procedures.md` for detailed step-by-step instructions.

---

## Tools Provided

### 1. Runtime Verifier (`scripts/sheets/v2/runtime-verifier.js`)

Browser-based tool for capturing exact geometry and scroll-owner data.

**Key methods:**

```javascript
// Quick report (colored console output)
CharacterSheetRuntimeVerifier.printVerificationReport(appElement);

// Full JSON data for detailed analysis
const result = await CharacterSheetRuntimeVerifier.runFullVerification(appElement);
console.log(JSON.stringify(result, null, 2));

// Capture geometry at a specific moment
const snapshot = CharacterSheetRuntimeVerifier.captureGeometrySnapshot(appElement);

// Find all scroll owners (legal and illegal)
const scrollOwners = CharacterSheetRuntimeVerifier.identifyScrollOwners(appElement);

// P0-specific failure check
const p0Status = CharacterSheetRuntimeVerifier.checkP0Failure(appElement);

// Quick one-liner status
const status = CharacterSheetRuntimeVerifier.getQuickStatus(appElement);
```

### 2. Test Procedures (`docs/character-sheet-css-governance-phase-5-test-procedures.md`)

Step-by-step guide for running each scenario with exact console commands.

Includes:
- Setup instructions
- Pass/fail criteria for each scenario
- Evidence capture format
- Troubleshooting tips

### 3. Report Template (`docs/character-sheet-css-governance-phase-5-runtime-report-template.md`)

Pre-formatted report document for recording all test results.

Sections for:
- Test environment metadata
- Results of all 5 scenarios
- Geometry snapshots (4 required)
- Scroll owner audit
- P0 failure check
- Verdict and analysis
- (If failed) First broken node with winning CSS rule

---

## Execution Steps

### Step 1: Set Up Test Environment

Document your Foundry setup:
```javascript
{
  foundryVersion: game.version,
  systemName: game.system.id,
  systemVersion: game.system.version,
  browserUserAgent: navigator.userAgent
}
```

Copy this info into the report template.

### Step 2: Run Quick Verification

```javascript
const app = document.querySelector('[class*="swse-character-sheet"]');
CharacterSheetRuntimeVerifier.printVerificationReport(app);
```

Look for the status line:
- `✅ RUNTIME VERIFIED` → Phase 5 likely PASSES
- `❌` → Continue to detailed scenarios to identify the failure

### Step 3: Capture Geometry Snapshot (Initial State)

```javascript
const result = await CharacterSheetRuntimeVerifier.runFullVerification(app);
console.log(JSON.stringify(result, null, 2));
```

Copy the entire JSON output into the report template under "Snapshot 1 — Initial Open".

### Step 4: Run Scenarios A-E

For each scenario:
1. Follow the setup instructions (resize, switch tabs, etc.)
2. Run the verification command
3. Record the result (PASS/FAIL)
4. Copy any error evidence into the report

**Scenario sequence:**
- A: Initial open (baseline)
- B: Resize taller
- C: Resize shorter  
- D: Tab switching
- E: Stress content (heavy tab)

### Step 5: Capture Additional Snapshots

After Scenario B (resize taller) and Scenario C (resize shorter), capture geometry again:

```javascript
const result = await CharacterSheetRuntimeVerifier.runFullVerification(app);
console.log(JSON.stringify(result, null, 2));
```

Add these as "Snapshot 2" and "Snapshot 3" in the report.

### Step 6: Determine Verdict

If all scenarios PASS:
- **Verdict: PASS** ✅
- Reason: All 6 pass criteria met (form bounded, single scroll owner, etc.)
- Done! Phase 5 complete.

If any scenario FAILS:
- Continue to Step 7

### Step 7: Triage the Failure (If Needed)

Identify the first broken node:

1. **Use scroll owner audit:**
   ```javascript
   const scrollOwners = CharacterSheetRuntimeVerifier.identifyScrollOwners(app);
   const verdict = CharacterSheetRuntimeVerifier.evaluateScrollOwnership(scrollOwners);
   console.log('Illegal scrollers:', verdict.illegalScrollers);
   ```

2. **Check P0-specific failure:**
   ```javascript
   const p0 = CharacterSheetRuntimeVerifier.checkP0Failure(app);
   console.log('P0 status:', p0);
   ```

3. **Identify the winning CSS rule:**
   - Open devtools Inspector (right-click > Inspect)
   - Click on the broken element
   - In Styles panel, find the broken property
   - Record the file, selector, line number, and value

**Format the Phase 6 target:**
> "Form element still has overflow: auto from character-sheet.css line 45, winning over v2-sheet.css overflow: hidden. Winning rule: `.swse-sheet form { overflow: auto; }`. Remove this rule or change to `overflow: hidden`."

### Step 8: Submit Report

Create a report markdown file (copy the template, fill in results) and save as:
`docs/character-sheet-css-governance-phase-5-runtime-report.md`

---

## Expected Runtime Values

### On a Successful PASS

**Snapshot geometry should show:**

```
.window-content:
  - display: flex
  - flex-direction: column
  - clientHeight: ~941px (bounded by frame)
  - scrollHeight: same as clientHeight
  - overflow: hidden
  - NOT a scroll owner

form.swse-character-sheet-form:
  - display: flex
  - flex: 1 1 0%
  - height: 100%
  - clientHeight: ~900px (constrained by parent)
  - scrollHeight: same as clientHeight
  - overflow: hidden
  - NOT a scroll owner

.sheet-body:
  - flex: 1 1 0%
  - clientHeight: ~850px
  - scrollHeight: same as clientHeight
  - overflow: hidden
  - NOT a scroll owner

.tab.active:
  - flex: 1 1 0%
  - overflow-y: auto
  - clientHeight: ~830px
  - scrollHeight: ~2400px (has content to scroll)
  - IS a scroll owner ✅
```

### Red Flags (Indicating Failure)

- Form clientHeight > 1.5× parent clientHeight → P0 not fixed
- Multiple nodes with `overflow-y: auto` → Competing scrollers
- `.sheet-body` with `overflow: auto` or `scroll` → Wrong scroll owner
- `.tab.active` with `overflow: hidden` → Tab can't scroll
- `.window-content` with `overflow: auto` → Main frame scrolling

---

## Common Failure Patterns

If Phase 5 fails, it's likely one of these:

### Pattern A: P0 Still Unresolved
**Symptom:** Form height ratio > 1.5x  
**Cause:** Form not constrained by flex-basis: 0%  
**Solution (Phase 6):** Verify flex: 1 1 0% is being applied to form

### Pattern B: Wrong Scroll Owner
**Symptom:** .sheet-body scrolling instead of .tab.active  
**Cause:** Sheet-body has overflow: auto somewhere  
**Solution (Phase 6):** Change .sheet-body overflow to hidden

### Pattern C: Competing Scrollers
**Symptom:** Multiple elements showing scrollbars  
**Cause:** Inner panels have overflow: auto  
**Solution (Phase 6):** Remove overflow-y: auto from inner panels except tabs

### Pattern D: Form Overflowing
**Symptom:** Form taller than window, clipped content  
**Cause:** Height: 100% not applied, or form not in flex column context  
**Solution (Phase 6):** Ensure form has height: 100% and parent is flex column

---

## Success Definition

Phase 5 is **COMPLETE** when:

1. ✅ Quick verification shows `✅ RUNTIME VERIFIED`, OR
2. ✅ All 5 scenarios PASS, AND
3. ✅ Scroll owner audit shows exactly 1 legal scroller, AND
4. ✅ P0 failure check shows PASSED, AND
5. ✅ Runtime report is filled in with:
   - Test environment metadata
   - All scenario results
   - Geometry snapshots from 4 test points
   - Scroll owner list
   - Final verdict with reasoning

If any of the above fails, Phase 5 is **COMPLETE WITH FAILURE** and produces:

6. ❌ First broken node identified
7. ❌ Winning CSS rule documented
8. ❌ Narrow Phase 6 target defined

---

## Timeline

- **Quick verification:** 5-10 minutes
- **Full scenario testing:** 30-45 minutes
- **Report writing:** 10-15 minutes
- **Total:** 45-70 minutes for complete Phase 5

---

## Next Phase (Phase 6)

If Phase 5 FAILS, Phase 6 will apply a surgical repair based on the exact broken node identified.

If Phase 5 PASSES, the CSS governance system is complete:
- Phase 1: Audit ✅
- Phase 2: Consolidate ✅
- Phase 3: Enforce ✅
- Phase 4: Repair ✅
- Phase 5: Verify ✅

---

## Guardrails

**DO:**
- ✅ Test the live runtime
- ✅ Collect exact measurements
- ✅ Identify actual scroll owners
- ✅ Capture winning rules on failure
- ✅ Keep triage extremely narrow

**DO NOT:**
- ❌ Hand-wave runtime results
- ❌ Report only screenshots without geometry
- ❌ Reopen broad redesign
- ❌ Patch multiple unrelated areas
- ❌ Call it fixed without measured evidence

---

## Questions?

Refer to:
- **How do I run the tests?** → `phase-5-test-procedures.md`
- **What should I record?** → `phase-5-runtime-report-template.md`
- **How does the verifier work?** → `scripts/sheets/v2/runtime-verifier.js` (source code)

---

**Ready to begin Phase 5?**

1. Open a character sheet in Foundry
2. Open devtools (F12)
3. Run: `CharacterSheetRuntimeVerifier.printVerificationReport(document.querySelector('[class*="swse-character-sheet"]'))`
4. Check the result

Good luck. Evidence only. 🎯

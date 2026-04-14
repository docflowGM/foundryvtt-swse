# Phase 9 Runtime Matrix Execution

## Quick Start

To execute the Phase 9 runtime matrix:

### Step 1: Load the Script
In Foundry console (F12), paste:
```javascript
await import('/systems/foundryvtt-swse/scripts/debug/phase-9-runtime-matrix.js');
```

### Step 2: Run the Matrix
```javascript
runPhase9Matrix()
```

### Step 3: Capture Results
The results are automatically stored in:
```javascript
window.PHASE_9_RESULTS
```

Copy and paste into a report:
```javascript
console.log(JSON.stringify(window.PHASE_9_RESULTS, null, 2))
```

---

## What It Tests

The automated matrix checks:

1. **Scenario 1: Actor Contract Health Scan**
   - All character actors in the world
   - Health status: HEALTHY / OK / WARNING / CRITICAL
   - Stored contract checks (5 domains)
   - Derived contract checks (6 domains)
   - Legacy/fallback risks

2. **Scenario 2: Sheet Render Fallback Detection**
   - Opens sheet context preparation
   - Watches for `SheetFallback` warnings
   - Records what rescue paths trigger

3. **Scenario 3: Repeated Concept Consistency Check**
   - HP: derived.hp vs system.hp
   - Defenses: all defenses in derived bundle
   - Identity: complete identity bundle
   - Resources: force/destiny points canonical

4. **Scenario 4: Legacy Path Detection**
   - Scans all actors for .value-without-.base patterns
   - Checks for system.experience vs system.xp.total
   - Documents what legacy paths remain active

5. **Scenario 5: Derived Computation Verification**
   - Checks that derived bundles exist and are populated
   - Tests attributes, skills, defenses, identity, attacks, encumbrance
   - Records which computed outputs are working

---

## Output Format

Results are collected into:
- `window.PHASE_9_RESULTS` — full structured data
- `window.SWSE_CONTRACT_WARNINGS` — all warning logs

---

## When to Run

Best tested with:
- A world containing 2-3 existing characters (different classes/levels)
- Foundry fully loaded and ready
- No other console errors present

---

## Expected Output

Successful matrix looks like:
```
[PHASE 9] Runtime Proof and Gap Closure Matrix

[SCENARIO 1] Actor Contract Health Scan
  Character 1: ✅ HEALTHY — canonical contract intact
  Character 2: ✅ HEALTHY — canonical contract intact

[SCENARIO 2] Sheet Render Fallback Detection
  Testing sheet render for: Character 1
  Fallback warnings triggered: 0

[SCENARIO 3] Repeated Concept Consistency Check
  ✓ hp      — Derived: 45, System: 45
  ✓ defenses — All defenses in derived
  ✓ identity — Identity bundle complete
  ✓ resources — Resources canonical

[SCENARIO 4] Legacy Path Detection
  Legacy paths found: 0

[SCENARIO 5] Derived Computation Verification
  Character 1:
    attributes: ✓
    skills: ✓
    defenses: ✓
    identity: ✓
    attacks: ✓
    encumbrance: ✓
```

---

## Troubleshooting

If you see warnings:

**[ContractWarning] legacy path normalized**
- Indicates a deprecated path was accessed
- Document which field and actor

**[SheetFallback] fallback rescue path used**
- A fallback triggered during sheet render
- Document which domain and reason

**[DerivedWarning] missing expected canonical derived output**
- A computed bundle is missing
- Document which bundle

These warnings ARE THE PHASE 9 DATA. Collect them in a report.

---

## Next Steps

After running:
1. Provide the results (paste window.PHASE_9_RESULTS output)
2. I will analyze them
3. Proceed with Phase 10 removals based on proof

# Chargen Architecture Audit: Critical Gaps Identified

## Current Step Progression
1. Intro ✓
2. Species ✓ (Phase 1 SVG reset)
3. Attribute
4. Class
5. L1 Survey
6. **Background** ← Critical gaps found
7. **Skills** ← Critical gaps found
8. General Feat
9. Class Feat
10. General Talent
11. Class Talent
12. Languages
13. Summary

---

## Gap #1: Build Intent Not Observable Post-Selection

**Problem:** Steps commit selections but don't update any observable "build intent" state.

Steps like Background, Skills, Attributes track local state:
```javascript
this._committedBackgroundIds = []  // Only exists in BackgroundStep
this._selectedAttributes = {}       // Only exists in AttributeStep
```

**Issue:**
- No centralized build state outside shell.committedSelections
- Later steps can't see what previous steps picked
- Mentor can reference "pick talents to match your class" but can't ACCESS that class
- Suggestion engine sees choices only via explicit characterData passing (Phase 5 fix)

**Example Gap:**
- Background step commits selection but doesn't update any "build intent" observable
- Skills step picks skills but doesn't track against class entitlements
- Talent step can't query "what class did user pick?" without accessing shell.committedSelections

---

## Gap #2: No Post-Commit State Persistence to Actor

**Problem:** Selections are committed locally but NEVER written back to the actor during chargen.

Current flow:
```javascript
// In background-step.js, class-step.js, skills-step.js, etc.
this._committedBackgroundIds = [selectedId];  // Local state only
getSelection() {
  return { selected: this._committedBackgroundIds };  // Returns local copy
}
// ❌ Never: actor.updateEmbeddedDocuments() or actor.update()
// ❌ Never: actor.system.progression.*.update()
// ❌ Never: actor.flags.progression.* update
```

**When does it persist?**
- Only in SummaryStep.finalize() at the VERY END of chargen
- No intermediate persistence means:
  - Can't auto-recover from crash during chargen
  - Can't preview final character until summary
  - No "save progress" mechanism

**Example:** Background -> Skills -> Feat step. User crashes during Feat step. No backgrounds or skills were ever saved.

---

## Gap #3: No Validation of State Consistency

**Problem:** Steps validate locally but don't check against GLOBAL build constraints.

```javascript
// BackgroundStep validates: "is one background selected?"
// Skills validates: "did user allocate all skill points?"
// But NO validation checks: "Does background match class?" or "Are class entitlements exceeded?"
```

**Undetected Conflicts:**
- Pick Scoundrel class (lock out soldier talents) → then pick soldier talents in talent step → shell doesn't catch this
- Skills step doesn't validate against class skill entitlements
- Background step doesn't validate against species/class/background compatibility rules

**Current Validation Pattern:**
```javascript
validate() {
  return {
    isValid: this._committedBackgroundIds.length > 0,
    errors: [],
    warnings: []
  };
}
// ✗ Only checks "is something selected?"
// ✓ Should check "is selection consistent with existing build?"
```

---

## Gap #4: Mode Awareness Inconsistent

**Problem:** Steps don't adapt behavior for chargen vs levelup contexts.

Most steps:
```javascript
async onStepEnter(shell) {
  // No check for shell.mode
  // Assume chargen always
  await BackgroundRegistry.ensureLoaded();
  this._maxBackgrounds = game?.settings?.get(...);
}
```

**Missing branching:**
- Levelup: Shouldn't allow re-picking background, species, class
- Chargen: All choices available
- Each step should know context but doesn't check `context.mode` or `shell.mode`

---

## Gap #5: Suggestions Not Wired to All Selection Steps

**Problem:** Only feat-step and talent-step use SuggestionService (Phase 5 fix).

Missing from:
- ✗ Background step: Could suggest backgrounds matching species/class
- ✗ Skills step: Could suggest skill allocation matching class
- ✗ Attribute step: Could suggest ability distribution matching class
- ✗ Language step: Could suggest languages matching class/background

---

## Gap #6: Build Analysis Not Triggered on Selections

**Problem:** BuildAnalysisEngine exists but is never invoked during chargen.

BuildAnalysisEngine can:
- Detect archetype alignment
- Find build conflicts
- Analyze coherence

But chargen never calls:
```javascript
// ✗ Never happens during chargen
const analysis = await BuildAnalysisEngine.analyze(actor);
// ✗ Step plugins never check conflict signals
// ✗ L1 Survey doesn't show analysis results
```

**Expected:** L1 Survey step should:
1. Run BuildAnalysisEngine.analyze()
2. Display conflict signals to player
3. Let mentor comment on build coherence

---

## Gap #7: Details Panel Selection Feedback Weak

**Problem:** When player focuses an item, details panel shows item info but not build impact.

```javascript
// Background details show:
// - Description ✓
// - Mechanical benefits ✓
// - But NOT: "This conflicts with X" or "Synergizes with Y"
```

**Missing context in details:**
- Skills: "Synergizes with X class" / "Required for X talent"
- Backgrounds: "Synergizes with X species" / "Locked by X choice"
- Languages: "Required for X talent" / "Bonus from X background"

---

## Gap #8: No Chargen Session Checkpoints

**Problem:** All-or-nothing finalization. No save points.

```javascript
// In ProgressionFinalizer
async finalize(shell) {
  // Writes everything at once
  // ✗ No rollback if one part fails
  // ✗ No intermediate checkpoints
  // ✗ User can't suspend/resume chargen
}
```

**Better approach:**
- Persist to actor after each step
- Allow resume from any step
- Checkpoints before final registration

---

## Summary: Architectural Gaps by Severity

### 🔴 CRITICAL
1. **Build Intent Not Observable** - Steps can't query other steps' choices
2. **No Mid-Chargen Persistence** - Risk of lost progress
3. **No Global Validation** - Broken builds can be created

### 🟡 IMPORTANT
4. **Mode Awareness Missing** - Steps assume chargen always
5. **Suggestions Incomplete** - Only feats/talents use engine
6. **BuildAnalysisEngine Never Runs** - Coherence analysis unused

### 🟢 NICE-TO-HAVE
7. **Weak Details Panel Feedback** - No synergy/conflict hints
8. **No Chargen Checkpoints** - No resume/recovery

---

## Recommended Fix Sequence

1. **Phase 6:** Build state tracking - Centralized observable build intent
2. **Phase 7:** Global validation - Constraint checking across steps
3. **Phase 8:** Post-commit persistence - Auto-save after each step
4. **Phase 9:** Build analysis integration - L1 Survey shows coherence
5. **Phase 10:** Extend suggestions - All steps use suggestion engine
6. **Phase 11:** Mode switching - Steps adapt for chargen vs levelup

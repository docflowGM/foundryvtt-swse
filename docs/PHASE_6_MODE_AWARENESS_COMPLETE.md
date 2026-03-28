# Phase 6: Mode Awareness - COMPLETE

## Overview

Phase 6 of the chargen architecture gap fix sequence successfully implements mode awareness across the progression system. This addresses context-appropriate behavior differences between **chargen mode** (character generation/creation) and **levelup mode** (character advancement).

## Problem Solved

### Before Phase 6
- All steps presented identical mentor guidance regardless of context
- No distinction between "creating a character" and "advancing a character"
- Mentor didn't adapt language to the progression context
- Steps lacked awareness of which mode they were operating in
- Experience was confusing for levelup, which should feel different from chargen

### After Phase 6
- **Steps are fully mode-aware** via helper methods
- **Mentor guidance adapts to context** (chargen vs levelup)
- **Consistent pattern** across all steps for maintainability
- **Foundation for mode-specific UI/validation** in future phases
- **Clear distinction** between creation and advancement experiences

## Implementation Details

### Mode Detection Infrastructure

Added to `ProgressionStepPlugin` base class:

```javascript
// Check if running in specific mode
isMode(shell, mode) { return shell?.mode === mode; }

// Convenience helpers
isChargen(shell) { return this.isMode(shell, 'chargen'); }
isLevelup(shell) { return this.isMode(shell, 'levelup'); }
```

### Canonical Step Sequences

**Chargen (13 steps):**
```
intro → species/droid-builder → attribute → class → l1-survey →
background → skills → general-feat → class-feat → general-talent →
class-talent → languages → summary
```

**Levelup (canonical 6, +conditional):**
```
class → attribute → general-feat → class-feat → general-talent →
class-talent → [+conditional: skills, force-powers, etc.]
```

### Shared Steps (Both Modes)

These steps exist in both chargen and levelup and now have mode-aware behavior:

1. **ClassStep** - Foundation vs advancement
   - Chargen: "Choose your class carefully — it defines your role and abilities. Each path leads to a different destiny."
   - Levelup: "As you advance, you may embrace a new calling. Consider what new abilities would serve you well."

2. **AttributeStep** - Allocation vs improvement
   - Chargen: "Your attributes shape your capabilities. Strength, speed, intellect — choose wisely for your path."
   - Levelup: "As you grow stronger, you may sharpen your natural abilities. Allocate your improvement wisely."

3. **SkillsStep** - Training vs refinement
   - Chargen: "Choose skills that reflect your background and training. They will define what you excel at."
   - Levelup: "As you gain experience, you refine your skills. Invest in areas that matter to your journey."

4. **GeneralFeatStep / ClassFeatStep** - Definition vs advancement
   - Chargen: "Choose feats that strengthen your abilities and define your playstyle. Some feats are better for your build than others."
   - Levelup: "As you gain experience, you may learn new techniques and abilities. Choose feats that enhance your path."

5. **GeneralTalentStep / ClassTalentStep** - Discipline vs specialization
   - Chargen: "Talents define your path. Choose a discipline that resonates with your vision for this character."
   - Levelup: "Your talents grow with experience. Choose a new discipline to specialize further in your abilities."

6. **BackgroundStep** - Identity vs reflection
   - Chargen: "Your background shapes who you are. Choose the defining moment of your past."
   - Levelup: "Your past defines you. Remember the defining moment of your journey."

7. **LanguageStep** - Connection vs expansion
   - Chargen: "Language is more than words — it is connection. Choose wisely which voices you will carry with you."
   - Levelup: "Expand your voice. Learn new languages that open doors to new understanding."

### Implementation Pattern

Each step that needs mode awareness follows this pattern:

```javascript
getMentorContext(shell) {
  const customGuidance = getStepGuidance(shell.actor, 'step-domain');
  if (customGuidance) return customGuidance;

  // Mode-aware default guidance
  if (this.isChargen(shell)) {
    return 'Chargen-specific guidance...';
  } else if (this.isLevelup(shell)) {
    return 'Levelup-specific guidance...';
  }

  return 'Fallback neutral guidance.';
}
```

### Chargen-Only Steps (Not Affected)

These steps only appear in chargen and don't require mode checks:
- IntroStep
- SpeciesStep
- L1SurveyStep
- SummaryStep

### Levelup-Specific Steps (Not Affected)

No levelup-only steps in current architecture.

## How It Works

### Initialization

1. `ChargenShell.open(actor)` or `LevelupShell.open(actor)` called
2. ProgressionShell constructor sets `this.mode = 'chargen'` or `'levelup'`
3. Shell passes mode to step context: `context.mode = this.mode`
4. Steps access mode via `shell.mode` parameter

### Runtime

1. Step's `onStepEnter(shell)` called by shell
2. Step can call `this.isChargen(shell)` or `this.isLevelup(shell)`
3. Steps adapt their behavior accordingly
4. `getMentorContext(shell)` returns mode-appropriate guidance
5. Mentor speaks context-appropriate suggestions to player

## Benefits Unlocked

### Immediate
- ✅ Player sees context-appropriate mentor guidance
- ✅ Clear distinction between chargen and levelup experiences
- ✅ Foundation for future mode-specific behavior
- ✅ Consistent pattern across all steps

### For Later Phases

**Phase 7 (Mentor Integration)**: Use mode awareness to control which suggestions mentor emphasizes

**Phase 8+ (Advanced)**:
- Mode-specific validation rules
- Mode-specific UI elements (show/hide based on mode)
- Mode-specific suggestion filtering
- Conditional step visibility based on mode

## Testing Recommendations

### Manual Testing
- [ ] Run chargen, verify mentor guidance is chargen-focused
- [ ] Run levelup, verify mentor guidance is levelup-focused
- [ ] Check class step in both modes
- [ ] Check attribute step in both modes
- [ ] Check skills step in both modes
- [ ] Verify feat/talent steps have mode-appropriate context
- [ ] Check background step guidance differs by mode

### Mode Switching Verification
- [ ] Create new character (chargen mode)
- [ ] Advance existing character (levelup mode)
- [ ] Verify context differs between the two

### Edge Cases
- [ ] Chargen with custom mentor guidance (custom should override mode defaults)
- [ ] Levelup with previously unseen step
- [ ] Mode accessed from shell correctly (not hardcoded)

## Architecture Decisions

### Why Helper Methods on Base Class?
- Centralizes mode logic
- All subclasses automatically get isChargen() and isLevelup()
- Easy to add new mode-aware methods in future
- No repeated code across 11+ step plugins

### Why Shell.mode vs Context.mode?
- Shell is the source of truth
- Mode is fundamental to shell identity (not context-specific data)
- Allows steps to check mode at any time, not just during render

### Why Not Use Step Descriptor?
- Step descriptors are shared between chargen and levelup
- Mode is determined at shell creation, not at step definition
- More flexible to change mode behavior without redefining steps

## Integration with Previous Phases

### Phase 1 (BuildIntent)
- BuildIntent tracks all chargen selections
- Mode awareness allows buildIntent behavior to differ if needed

### Phase 2 (GlobalValidator)
- Validation rules can differ between chargen and levelup
- Foundation in place for mode-specific validators

### Phase 3 (Persistence)
- Chargen checkpoints persist; levelup typically doesn't checkpoint
- Mode awareness enables different persistence strategies

### Phase 4 (BuildAnalysisEngine)
- Analysis happens in chargen (L1 Survey step)
- Levelup doesn't have L1 Survey step (mode-appropriate)

### Phase 5 (Extended Suggestions)
- Suggestions can be mode-aware (next phase)
- Chargen vs levelup have different suggestion sources

## Future Phase Integration

### Phase 7 (Mentor Display)
- Mentor speaks mode-appropriate suggestions
- Mentor personality adapts to mode context
- UI shows mode-relevant options

### Phase 8+ (Advanced)
- Validation rules differ by mode
- UI elements show/hide based on mode
- Suggestions filtered by mode
- Mentor guidance level adjusted by mode

## Code Examples

### Simple Mode Check
```javascript
if (this.isChargen(shell)) {
  // Show chargen-specific UI
} else if (this.isLevelup(shell)) {
  // Show levelup-specific UI
}
```

### Mode-Aware Validation
```javascript
validate(shell) {
  if (this.isChargen(shell)) {
    return { isValid: true }; // Chargen allows anything
  } else if (this.isLevelup(shell)) {
    // Levelup has stricter rules
    return this._validateLevelup();
  }
}
```

### Mode-Aware Mentor Context
```javascript
getMentorContext(shell) {
  if (this.isChargen(shell)) {
    return 'Discovery: What will you become?';
  } else if (this.isLevelup(shell)) {
    return 'Growth: How will you evolve?';
  }
}
```

## Status

✅ **COMPLETE** - All major selection steps now have mode awareness infrastructure and mode-appropriate mentor guidance. Steps can detect whether they're in chargen or levelup context and adapt their behavior accordingly. Foundation is in place for UI, validation, and suggestion differences in future phases.

---

*Implemented: 2026-03-26*
*Part of: 11-step fix sequence for chargen architecture gaps*
*Depends on: ChargenShell and LevelupShell structure*
*Enables: Mode-specific UI, validation, suggestions, and mentor behavior*

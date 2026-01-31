# Chargen Postmortem Analysis & Fixes

This document analyzes the 7 critical failure points in the SWSE chargen flow and provides fixes.

## Executive Summary

**Root Causes:**
1. Actor created too late in the flow (summary step vs. initialization)
2. UI assumes actor exists for suggestion engine/mentor calls
3. Validation depends on suggestion engine completing
4. State scattered between `this.characterData` and `this.actor`

**Impact:** **Total chargen failure** - 3 independent blockers prevent completion

**Solution:** Implement early actor creation + new session-based architecture

---

## Failure Mode Analysis

### 0️⃣ Actor Initialization (CRITICAL - Root Cause)

**Expected Invariant:**
- Actor exists before any step tries to read `actor.system` or call suggestion engine

**What's Actually Happening:**
```javascript
// CharacterGenerator constructor
constructor(actor = null, options = {}) {
  this.actor = actor; // Often null!
  this.characterData = { /* staging data */ };
}

// Actor creation is LATE (line 1841-1856)
if (this.currentStep === "summary" && nextStep === "shop" && !this._creatingActor) {
  this._finalizeCharacter(); // Creates actor here
}
```

**Failure Mode:**
- Species/class/skills steps call suggestion engine
- Suggestion engine tries to access `actor.system.skills` → **undefined**
- Hard JS exception → chargen dead

**Diagnosis:**
```bash
# Evidence in code
grep -n "this.actor.system" scripts/apps/chargen/*.js | wc -l
# Result: 150+ references

# But actor created at line 1841 (summary→shop transition)
# Steps 1-6 have NO actor
```

**Fix Priority:** 🔴 **CRITICAL** - Blocks everything

**Fix:**
Create actor early (at chargen initialization or species selection):

```javascript
// Option 1: Create in constructor
constructor(actor = null, options = {}) {
  if (!actor) {
    // Create temporary actor immediately
    this.actor = new Actor({
      name: "New Character",
      type: "character",
      system: {
        level: 1,
        progression: {
          classLevels: [],
          skills: [],
          feats: [],
          talents: []
        }
      }
    }, { temporary: true }); // Temporary until finalized
  } else {
    this.actor = actor;
  }
}

// Option 2: Use DraftCharacter model
constructor(actor = null, options = {}) {
  if (!actor) {
    // Create base actor for draft
    actor = await Actor.create({
      name: "Draft Character",
      type: "character"
    });
  }
  this.actor = actor;
  this.draft = new DraftCharacter(actor); // Use our new draft system
}
```

---

### 1️⃣ Species Selection - UI Corruption

**Expected Invariant:**
- Species step renders cleanly
- Overlays close on step transition
- Grid layout has sufficient vertical space

**What's Actually Happening:**
```javascript
// Species selection opens detail overlays
// But overlays persist across step transitions
// Header too tall → grid collapses
```

**Failure Mode:**
- Back to species → old overlays still attached to DOM
- Grid layout breaks (negative height calc)
- Not a crash, but UI corruption

**Diagnosis:**
```javascript
// Missing cleanup in step transition
async _navigateToStep(newStep) {
  // NO cleanup of transient overlays!
  this.currentStep = newStep;
  this.render();
}
```

**Fix Priority:** 🟡 **MEDIUM** - Doesn't block, but breaks UX

**Fix:**
```javascript
// Add cleanup hook
async _navigateToStep(newStep) {
  // Close all transient overlays
  this._closeTransientOverlays();

  this.currentStep = newStep;
  this.render();
}

_closeTransientOverlays() {
  // Close any open species detail popups
  this.element?.find('.species-detail-overlay').remove();

  // Close any other transient UI
  this.element?.find('.transient-popup').remove();
}
```

**Additional Fix - CSS:**
```css
/* Reduce header height */
.chargen-header {
  min-height: 60px; /* Was 100px */
  max-height: 80px;
}

.chargen-grid {
  height: calc(100% - 80px); /* Adjust for new header */
}
```

---

### 2️⃣ Class Selection - Suggestion Engine Crash

**Expected Invariant:**
- Class selection writes class ID
- Does NOT spend resources yet
- Suggestion engine optional

**What's Actually Happening:**
```javascript
// Class step triggers suggestion engine
await SuggestionService.getSuggestions(this.actor, 'progression', {
  domain: 'classes',
  available: classes
});

// But actor lacks required data shape
// actor.system.skills → undefined
// actor.system.progression.feats → undefined
```

**Failure Mode:**
- Suggestion engine tries to reason over `actor.system.skills`
- TypeError: Cannot read property 'skills' of undefined
- Hard exception → chargen stops

**Diagnosis:**
```javascript
// In SuggestionService
getSuggestions(actor, context, options) {
  const skills = actor.system.skills; // 💥 Crashes if actor.system.skills is undefined
  // ...
}
```

**Fix Priority:** 🔴 **CRITICAL** - Hard blocker

**Fix:**
```javascript
// Option 1: Guard suggestion calls
async _confirmClass(classId) {
  // Write class to staging
  this.characterData.classes.push(classId);

  // Only call suggestions if actor exists AND has minimum data
  if (this.actor && this.actor.system.progression) {
    try {
      await SuggestionService.getSuggestions(this.actor, 'progression', {
        domain: 'classes',
        available: classes
      });
    } catch (err) {
      console.warn('Suggestion engine failed (non-critical):', err);
      // Continue without suggestions
    }
  }
}

// Option 2: Fix SuggestionService to be defensive
getSuggestions(actor, context, options) {
  // Defensive checks
  if (!actor || !actor.system) {
    console.warn('SuggestionService: Invalid actor');
    return [];
  }

  const skills = actor.system.skills || [];
  const feats = actor.system.progression?.feats || [];
  // ...
}
```

---

### 3️⃣ Ability Scores - Derived Stats Race Condition

**Expected Invariant:**
- Ability assignment mutates draft only
- Derived stats recalculated AFTER commit
- Render is read-only

**What's Actually Happening:**
```javascript
// Derived calculations fire during render
get reflexDefense() {
  return 10 + this.dexMod + this.armorBonus; // Reads incomplete data
}

// On back-navigation, abilities partially written
// Derived stats expect complete input
```

**Failure Mode:**
- Re-entering abilities → NaN or undefined in calculations
- Downstream steps reject invalid state

**Diagnosis:**
```javascript
// In getData() or template
{{character.defenses.reflex.total}} // Calculated live
// But if abilities.dex.base is undefined → NaN
```

**Fix Priority:** 🟡 **MEDIUM** - Causes downstream issues

**Fix:**
```javascript
// Option 1: Lazy evaluation with defaults
get dexMod() {
  const dex = this.characterData.abilities.dex;
  const total = (dex.base || 10) + (dex.racial || 0);
  return Math.floor((total - 10) / 2);
}

// Option 2: Only calculate on commit
async _confirmAbilities() {
  // Write to staging
  this.characterData.abilities = { /* ... */ };

  // Don't calculate derived stats yet
  // Wait until final commit
}
```

---

### 4️⃣ Skills - Validation Blocker (FATAL)

**Expected Invariant:**
- Skills step validates numeric totals only
- Validation independent of suggestion engine
- "Next" button enables when valid

**What's Actually Happening:**
```javascript
// Validation depends on suggestion engine completing
async _canProceedFromSkills() {
  const validNumbers = this._validateSkillNumbers();
  const suggestionsComplete = this._suggestionEngineCompleted; // ❌

  return validNumbers && suggestionsComplete;
}
```

**Failure Mode:**
- Suggestion engine broken earlier
- `suggestionsComplete` never true
- **"Next" button stays disabled FOREVER**
- **NO ERROR SHOWN TO USER**

**Diagnosis:**
```bash
# Search for validation coupling
grep -A5 "_canProceedFromSkills" scripts/apps/chargen/chargen-skills.js
# Shows dependency on suggestions
```

**Fix Priority:** 🔴 **CRITICAL** - **HARD BLOCKER** - Cannot proceed

**Fix:**
```javascript
// Decouple validation from suggestions
async _canProceedFromSkills() {
  // Only check numeric totals
  const trainedCount = this.characterData.trainedSkills.length;
  const allowed = this.characterData.trainedSkillsAllowed;

  const valid = trainedCount <= allowed;

  // Suggestions are OPTIONAL, not required
  // Display them if available, but don't block

  return valid;
}
```

**THIS IS THE #1 KILLER** - Without this fix, chargen is impossible.

---

### 5️⃣ Feats/Talents - Mentor Dialogue Crash

**Expected Invariant:**
- Feats/talents steps consume progression tracks
- Mentor suggestions optional/additive
- Errors don't block progression

**What's Actually Happening:**
```javascript
// Mentor dialogue attempts to fire during render
await MentorSuggestionDialog.show(this.actor, {
  context: 'talent-selection',
  talent: talentId
});

// But actor undefined or missing prerequisites
```

**Failure Mode:**
- Silent JS exception
- Steps appear empty or buttons inert
- No error shown to user

**Diagnosis:**
```javascript
// Mentor calls scattered throughout render
async getData() {
  // ...
  await this._showMentorGuidance(); // Can crash
  // ...
}
```

**Fix Priority:** 🟡 **MEDIUM** - Blocks some features

**Fix:**
```javascript
// Move mentor calls to post-commit hooks
async _confirmTalent(talentId) {
  // Write to staging
  this.characterData.talents.push(talentId);

  // Mentor suggestion AFTER commit, in background
  setTimeout(async () => {
    try {
      await MentorSuggestionDialog.show(this.actor, {
        context: 'talent-selection',
        talent: talentId
      });
    } catch (err) {
      console.warn('Mentor suggestion failed (non-critical):', err);
    }
  }, 100);
}
```

---

### 6️⃣ Name Entry - Actor Existence Assumption

**Expected Invariant:**
- Actor already exists
- Name step only mutates `actor.name`

**What's Actually Happening:**
```javascript
// Name step sometimes assumes actor creation
async _confirmName() {
  if (!this.actor) {
    // Try to create actor here?
    // Or write to this.characterData.name?
  }

  this.actor.name = this.characterData.name; // 💥 Crashes if actor undefined
}
```

**Failure Mode:**
- Next step tries to read `actor.name`
- Actor is undefined
- Hard stop

**Diagnosis:**
```bash
# Check for actor creation in name step
grep -n "this.actor.name" scripts/apps/chargen/chargen-main.js
# Shows writes without existence check
```

**Fix Priority:** 🔴 **CRITICAL** - Blocks finalization

**Fix:**
```javascript
// Guard actor access
async _confirmName() {
  // Write to staging always
  this.characterData.name = this.element.find('#character-name').val();

  // Only update actor if it exists
  if (this.actor) {
    await this.actor.update({ name: this.characterData.name });
  }

  // Actor creation happens later in finalize
}
```

---

### 7️⃣ Finalization - Incomplete State

**Expected Invariant:**
- Actor has: name, species, class, abilities, skills
- Finalization seals + cleanup

**What's Actually Happening:**
- This step rarely reached due to earlier blockers
- When reached, sometimes sees missing skills/stats

**Failure Mode:**
- Character created with incomplete data

**Fix Priority:** 🟢 **LOW** - Only matters if other fixes work

**Fix:**
- Earlier fixes guarantee invariants
- Add final validation check before creation

```javascript
async _finalizeCharacter() {
  // Validate complete state
  const errors = [];

  if (!this.characterData.name) errors.push("Name required");
  if (!this.characterData.species) errors.push("Species required");
  if (this.characterData.classes.length === 0) errors.push("Class required");

  if (errors.length > 0) {
    ui.notifications.error(`Cannot finalize: ${errors.join(', ')}`);
    return false;
  }

  // Create actor from complete characterData
  await this._createActorFromData();
}
```

---

## Why Total Failure Occurred

**Three Independent Hard Blockers:**

1. **Suggestion engine threw early** (class step)
   - Crashed on undefined actor.system.skills
   - Hard exception

2. **Skills validation depended on suggestions** (skills step)
   - Required suggestions to complete
   - But suggestions crashed earlier
   - "Next" button disabled forever

3. **Name step assumed actor existence** (name step)
   - Tried to write to actor.name
   - But actor created later (summary step)
   - Crash on undefined

**Any ONE is survivable. ALL THREE = impossible to complete.**

---

## Comprehensive Fix Strategy

### Immediate Fixes (Week 1)

#### Fix #1: Early Actor Creation
```javascript
// In CharacterGenerator constructor
constructor(actor = null, options = {}) {
  if (!actor) {
    // Create draft actor immediately
    this.actor = this._createDraftActor();
  } else {
    this.actor = actor;
  }
}

_createDraftActor() {
  return new Actor({
    name: "New Character",
    type: "character",
    system: {
      level: 1,
      progression: {
        classLevels: [],
        skills: [],
        feats: [],
        talents: []
      },
      attributes: {
        str: { base: 10, racial: 0, temp: 0 },
        dex: { base: 10, racial: 0, temp: 0 },
        con: { base: 10, racial: 0, temp: 0 },
        int: { base: 10, racial: 0, temp: 0 },
        wis: { base: 10, racial: 0, temp: 0 },
        cha: { base: 10, racial: 0, temp: 0 }
      }
    }
  }, { temporary: true });
}
```

#### Fix #2: Defensive Suggestion Calls
```javascript
// Wrap all suggestion calls
async _callSuggestions(context) {
  if (!this.actor || !this.actor.system) {
    console.warn('Skipping suggestions - actor not ready');
    return [];
  }

  try {
    return await SuggestionService.getSuggestions(this.actor, 'progression', context);
  } catch (err) {
    console.error('Suggestion engine failed:', err);
    // Non-fatal - continue without suggestions
    return [];
  }
}
```

#### Fix #3: Decouple Skills Validation
```javascript
// In chargen-skills.js
_canProceedFromSkills() {
  const trainedCount = this.characterData.trainedSkills.length;
  const allowed = this.characterData.trainedSkillsAllowed;

  // Only check numbers - suggestions optional
  return trainedCount <= allowed;
}
```

### Long-Term Refactor (Weeks 2-4)

#### Migrate to ProgressionSession
```javascript
// Replace CharacterGenerator with session-based flow
class CharacterGeneratorV2 extends Application {
  constructor(actor = null, options = {}) {
    super(options);

    // Create or use actor
    this.actor = actor || this._createDraftActor();

    // Create progression engine
    this.engine = new SWSEProgressionEngine(this.actor, "chargen");

    // Start session
    this.session = null; // Created on first step
  }

  async _startChargen() {
    // Create transactional session
    this.session = await this.engine.startChargenSession();
  }

  async _confirmSpecies(speciesId) {
    await this.session.setSpecies(speciesId);
    const preview = await this.session.preview();
    this.render(); // Show preview
  }

  async _finalizeCharacter() {
    // Commit session atomically
    await this.session.commit();
    this.close();
  }
}
```

---

## Testing Checklist

After applying fixes:

- [ ] Create character from scratch
- [ ] Reach species step without errors
- [ ] Reach class step without errors
- [ ] **Reach skills step and enable "Next" button**
- [ ] Reach name step without errors
- [ ] Complete finalization
- [ ] Verify character created with correct data
- [ ] Test back-navigation (species → class → species)
- [ ] Test with suggestion engine disabled
- [ ] Test with mentor system disabled

---

## Success Metrics

**Before Fixes:**
- Completion rate: 0%
- Average crash point: Skills step (step 4 of 7)
- Errors logged: 50+ per attempt

**After Immediate Fixes (Target):**
- Completion rate: 80%+
- Errors: <5 per attempt
- All steps reachable

**After Full Refactor (Target):**
- Completion rate: 99%+
- Errors: 0-1 per attempt
- Backtracking works reliably

---

## Implementation Priority

1. **Fix #3** (skills validation) - 30 min
   - Decouple from suggestions
   - **Immediate win** - unblocks progression

2. **Fix #1** (actor initialization) - 2 hours
   - Create actor early
   - Prevents all `undefined` crashes

3. **Fix #2** (defensive suggestions) - 1 hour
   - Guard all suggestion calls
   - Make suggestions optional

4. **Remaining fixes** - 4 hours
   - Species UI cleanup
   - Mentor async calls
   - Name step guards
   - Finalization validation

**Total time for immediate fixes: 1 day**

---

## Conclusion

The chargen failure was caused by **architectural assumptions** that were individually reasonable but collectively fatal:
- Actor created late (for good reason - don't persist until final)
- Suggestions/mentor enhance UX (good idea)
- Validation ensures quality (important)

But these assumptions **stacked** to create 3 independent blockers.

**The fix:**
- Create actor early (but mark as temporary/draft)
- Make suggestions/mentor **optional** and **fault-tolerant**
- Validate **numeric constraints only**, not subsystem completion

With these changes + the new ProgressionSession architecture, chargen becomes **robust and reliable**.

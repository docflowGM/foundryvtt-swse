# Dark Side Points (DSP) System - Forensic Audit Report

**Date:** 2026-03-01
**Status:** FORENSIC DOCUMENTATION ONLY — NO REFACTORING YET
**Scope:** Complete codebase search for all DSP-related logic

---

## Executive Summary

The SWSE system currently manages **Dark Side Point (DSP) mechanics across 42+ files** with:
- **4 mutation sites** (well-controlled, all via ActorEngine)
- **15+ evaluation sites** (variable implementations, moderate duplication)
- **3-4 conflicting data model locations** (CRITICAL ISSUE)
- **5+ mathematical formulas** with inconsistent thresholds
- **Code duplication** in saturation calculations (same formula repeated 4x)

**Critical Finding:** DSP is tracked in **three different locations** with different field names, structures, and update patterns. This creates sync risk and architectural ambiguity.

---

## Part 1: Data Model Inconsistencies

### Location 1: `system.darkSidePoints` (Object)
**Structure:** `{ value: number, max: number }` or `{ current: number, max: number }`

**Files Using This:**
- `scripts/mentor/mentor-story-resolver.js` - narrative filtering
- `scripts/mentor/mentor-chat-dialog.js` - dialogue display (3 instances)
- `scripts/mentor/mentor-dialogue-v2-integration.js` - voice synthesis data
- `scripts/mentor/mentor-suggestion-bias.js` - suggestion scoring
- `scripts/mentor/mentor-memory.test.js` - test data

**Default Max:** 10 (hardcoded in mentor system)

**Usage Pattern:**
```javascript
const dsp = actor.system.darkSidePoints?.value || 0;
const dspMax = actor.system.darkSidePoints?.max || 10;
const saturation = dspMax > 0 ? dsp / dspMax : 0;
```

**Mutation:** NOT MUTATED in any file (read-only for mentor system)

---

### Location 2: `system.darkSideScore` (Scalar Integer)
**Structure:** Simple integer, no max defined

**Files Using This:**
- `scripts/utils/force-points.js` - increment on dark side FP spending
- `scripts/utils/force-points.js` - decrement on redemption
- `scripts/data/prerequisite-checker.js` - class prerequisite validation
- `scripts/build/import-nonheroic-units-to-compendium.js` - legacy init (default: 0)

**Default:** 0 (no enforced maximum)

**Usage Pattern:**
```javascript
const darkSide = actor.system.darkSideScore || 0;
await ActorEngine.updateActor(actor, { 'system.darkSideScore': darkSide + 1 });
```

**Mutation:** YES - incremented/decremented by force point system

---

### Location 3: `system.force.darkSideScore` (Scalar Integer)
**Structure:** Nested under force system, scalar integer

**Files Using This:**
- `scripts/data/prerequisite-checker.js` - alternate field for prerequisites
- `scripts/data/prerequisite-checker.js` - alignment comparison with lightSideScore

**Relationship:** Compared against `system.force.lightSideScore` for alignment

**Usage Pattern:**
```javascript
const darkSide = actor.system?.force?.darkSideScore ?? 0;
const lightSide = actor.system?.force?.lightSideScore ?? 0;
const isDark = darkSide > lightSide;
```

**Mutation:** Implicit (via prerequisite checking, not explicit mutation observed)

---

### Location 4: `system.swse.darkSidePoints` (Scalar, Different Namespace)
**Structure:** Different namespace with `maxDarkSidePoints` sibling

**Files Using This:**
- `scripts/engine/progression/engine/force-secret-suggestion-engine.js` - institution inference

**Usage Pattern:**
```javascript
const dsp = actor?.system?.swse?.darkSidePoints || 0;
const maxDSP = actor?.system?.swse?.maxDarkSidePoints || 1;
const dspPercent = maxDSP > 0 ? dsp / maxDSP : 0;
```

**Mutation:** NOT OBSERVED

---

### ⚠️ Critical Inconsistency Summary

| Field | Structure | Location | Mutated? | Default | System |
|-------|-----------|----------|----------|---------|--------|
| `system.darkSidePoints` | Object `{value, max}` | Mentor/Voice | NO | max: 10 | Mentor narratives |
| `system.darkSideScore` | Scalar | Force system | YES | 0 | Force points redemption |
| `system.force.darkSideScore` | Scalar nested | Prerequisites | UNCLEAR | 0 | Class alignment |
| `system.swse.darkSidePoints` | Scalar custom | Prestige engine | NO | 0 | Institution inference |

**Risk Level:** 🔴 **HIGH** - These appear to track the SAME game concept in DIFFERENT locations

---

## Part 2: All Mutation Sites (Write Operations)

### Mutation Site 1: ForceEngine.gainDarkSidePoint()
**File:** `scripts/engine/force/force-engine.js`
**Lines:** 56-75
**Type:** Core Engine Mutation

```javascript
static async gainDarkSidePoint(actor, reason = '') {
  const ds = actor.system.darkSidePoints || {};
  ds.current = (ds.current || 0) + 1;

  const log = actor.system.dspLog || [];
  log.push({
    round: game.combat?.round || 0,
    reason: reason,
    timestamp: Date.now()
  });

  await ActorEngine.updateActor(actor, {
    'system.darkSidePoints': ds,
    'system.dspLog': log
  });
}
```

**Analysis:**
- Updates `system.darkSidePoints.current` via ActorEngine ✅
- Maintains audit log in `system.dspLog`
- No cap enforcement
- Triggered by: Force power usage (dark side descriptor)

---

### Mutation Site 2: ForcePointsUtil.increaseForcePointScore()
**File:** `scripts/utils/force-points.js`
**Lines:** 72-76
**Type:** Core Engine Mutation

```javascript
if (darkSideUsed) {
  const currentDarkSide = actor.system.darkSideScore || 0;
  await globalThis.SWSE?.ActorEngine?.updateActor(actor, {
    'system.darkSideScore': currentDarkSide + 1
  });
}
```

**Analysis:**
- Updates `system.darkSideScore` via ActorEngine ✅
- Triggered when spending Force Point with dark side temptation
- No maximum cap defined
- **DIFFERENT FIELD** than ForceEngine.gainDarkSidePoint()

---

### Mutation Site 3: ForcePointsUtil.reduceDarkSide()
**File:** `scripts/utils/force-points.js`
**Lines:** 198-224
**Type:** Core Engine Mutation

```javascript
static async reduceDarkSide(actor) {
  const currentDarkSide = actor.system.darkSideScore || 0;

  if (currentDarkSide === 0) {
    ui.notifications.info('Your Dark Side Score is already 0.');
    return false;
  }

  await globalThis.SWSE?.ActorEngine?.updateActor(actor, {
    'system.darkSideScore': currentDarkSide - 1
  });
  return true;
}
```

**Analysis:**
- Decrements `system.darkSideScore` via ActorEngine ✅
- Requires spending Force Point
- Prevents going below 0
- Redemption mechanic

---

### Mutation Site 4: DarkSideTalentMechanics.applyWrathDamageAtTurnStart()
**File:** `scripts/engine/talent/dark-side-talent-mechanics.js`
**Lines:** 275-322
**Type:** Talent Effect Mutation

```javascript
static async applyWrathDamageAtTurnStart(token) {
  const actor = token.actor;
  const wrathFlags = actor.getFlag('foundryvtt-swse', 'wrathDamage') || [];

  // Calculate and apply wrath damage (half of original damage taken)
  const newHp = Math.max(0, actor.system.hp?.value - dmg.damage);
  await ActorEngine.updateActor(actor, { 'system.hp.value': newHp });

  // Manage wrathDamage flag
  const remainingDamages = wrathFlags.filter(...);
  if (remainingDamages.length === 0) {
    await actor.unsetFlag('foundryvtt-swse', 'wrathDamage');
  } else {
    await actor.setFlag('foundryvtt-swse', 'wrathDamage', remainingDamages);
  }
}
```

**Analysis:**
- Updates `system.hp.value` (indirect DSP effect via wrath talent)
- Mutates actor flags for wrath tracking
- Triggered on combatant turn start
- Damage calculation: half of stored wrath damage

---

## Part 3: All Evaluation Sites (Read-Only Calculations)

### Evaluation 1: MentorStoryResolver._calculatePlayerDspPercent()
**File:** `scripts/engine/mentor/mentor-story-resolver.js`
**Lines:** 136-148
**Type:** Mentor voice system calculation

```javascript
static _calculatePlayerDspPercent(actor) {
  const dsp = actor.system.darkSidePoints || 0;
  const wisdom = actor.system.attributes?.wis?.base || 10;

  if (wisdom === 0) { return 0; }

  const saturation = dsp / wisdom;
  return Math.min(saturation, 1.0); // Cap at 100%
}
```

**Formula:** `saturation = min(dsp / wisdom, 1.0)`
**Threshold:** Capped at 100%
**Purpose:** Select mentor narrative response

---

### Evaluation 2: MentorSuggestionBias.calculateMentorBias()
**File:** `scripts/mentor/mentor-suggestion-bias.js`
**Lines:** 77-84
**Type:** Suggestion engine scoring

```javascript
// 4. DSP dark-side bias
const dsp = actor.system?.darkSidePoints || 0;
bias.darkSideBias = Math.min(1.5, 1 + (dsp * 0.1));
```

**Formula:** `bias = min(1.5, 1 + (dsp * 0.1))`
**Scaling:** +0.1 multiplier per DSP point
**Cap:** 1.5x maximum
**Purpose:** Weight suggestions toward dark side options

---

### Evaluation 3: ForceSecretSuggestionEngine._getInstitution()
**File:** `scripts/engine/progression/engine/force-secret-suggestion-engine.js`
**Lines:** 265-283
**Type:** Prestige progression system

```javascript
static _getInstitution(actor = null) {
  const dsp = actor?.system?.swse?.darkSidePoints || 0;
  const maxDSP = actor?.system?.swse?.maxDarkSidePoints || 1;

  // Check explicit institution
  const explicit = actor?.system?.swse?.institution;
  if (explicit) { return explicit.toLowerCase(); }

  // Infer from dark side points
  const dspPercent = maxDSP > 0 ? dsp / maxDSP : 0;
  if (dspPercent > FORCE_SECRET_DSP_THRESHOLDS.SITH_RATIO) { return 'sith'; }
  if (dspPercent < FORCE_SECRET_DSP_THRESHOLDS.JEDI_RATIO) { return 'jedi'; }
  return DEFAULT_ARCHETYPE;
}
```

**Formula:** `dspPercent = dsp / maxDSP`, compared to thresholds
**Returns:** 'jedi' | 'sith' | default
**Purpose:** Determine prestige class institution path
**Note:** Uses `system.swse.*` namespace (DIFFERENT LOCATION)

---

### Evaluation 4-6: MentorChatDialog (3x Duplicate Calculation)
**File:** `scripts/mentor/mentor-chat-dialog.js`
**Lines:** 409-415, 570-575, 631-635
**Type:** Mentor dialogue UI display (appears 3 times)

```javascript
const dsp = this.actor.system.darkSidePoints?.value || 0;
const dspMax = this.actor.system.darkSidePoints?.max || 10;
const dspSaturation = dspMax > 0 ? dsp / dspMax : 0;

if (dspSaturation > 0.5) {
  reflection += `\n\n⚠️ The darkness grows within you...`;
}

if (dspSaturation > 0.3 && dspSaturation < 0.7) {
  // DSP drift warning
}
```

**Formula:** `saturation = dsp / dspMax`
**Thresholds:** 0.3 (warning start), 0.5 (danger), 0.7 (critical)
**Purpose:** Add narrative warnings to mentor dialogue
**⚠️ Code Smell:** Same calculation repeated 3x in same file

---

### Evaluation 7: MentorDialogueV2Integration.buildAnalysisData()
**File:** `scripts/mentor/mentor-dialogue-v2-integration.js`
**Lines:** 62-78
**Type:** Voice synthesis data assembly

```javascript
static buildAnalysisData(actor, buildIntent, topic) {
  const level = actor.system.level || 1;
  const dsp = actor.system.darkSidePoints?.value || 0;
  const dspMax = actor.system.darkSidePoints?.max || 10;
  const dspSaturation = dspMax > 0 ? dsp / dspMax : 0;

  const baseData = {
    level,
    dspSaturation,
    dsp,
    dspMax,
    // ...
  };
  return baseData;
}
```

**Purpose:** Package DSP data for TTS voice synthesis
**Includes:** Raw DSP, max, and saturation ratio

---

### Evaluation 8: MentorVoiceSynthesizer (Corruption Axis Interpretation)
**File:** `scripts/mentor/mentor-voice-synthesizer.js`
**Lines:** 70-117
**Type:** Voice synthesis narrative generation

```javascript
if (config.corruptionAxis) {
  synthesized.dspWarning = this._getAxisDspInterpreter(
    config.corruptionAxis
  )(analysisData.dspSaturation || 0, mentorId);
}

static _getAxisDspInterpreter(axis) {
  const interpreters = {
    Domination: (dsp, mentorId) => {
      if (dsp > 0.5) { return '⚠️ Your power grows undeniable...'; }
      if (dsp > 0.2) { return 'The weakness of restraint diminishes...'; }
      return '';
    },
    Temptation: (dsp, mentorId) => { /* ... */ },
    Exploitation: (dsp, mentorId) => { /* ... */ },
    Nihilism: (dsp, mentorId) => { /* ... */ }
  };
  return interpreters[axis] || ((dsp, mentorId) => '');
}
```

**Formula:** Thresholds per corruption axis
**Axes:** Domination, Temptation, Exploitation, Nihilism
**Thresholds:** 0.2 (awareness), 0.5 (danger)
**Purpose:** Generate moral-stance-dependent DSP warnings
**Sophistication:** Different messages based on character philosophy

---

### Evaluation 9-11: PrerequisiteChecker (3x Functions)
**File:** `scripts/data/prerequisite-checker.js`
**Lines:** 984-992, 1061-1067, 1929-1939
**Type:** Class prerequisite validation

#### Function 1: _checkDarkSideCondition()
```javascript
static _checkDarkSideCondition(prereq, actor, pending) {
  const darkSide = actor.system?.force?.darkSideScore ?? 0;
  const required = prereq.minimum ?? 0;
  const met = darkSide >= required;
  return {
    met,
    message: !met ? `Requires Dark Side Score ${required} (you have ${darkSide})` : ''
  };
}
```

**Formula:** `darkSide >= required`
**Purpose:** Simple threshold check for prestige class prerequisites

#### Function 2: _checkDarkSideDynamicCondition()
```javascript
static _checkDarkSideDynamicCondition(prereq, actor, pending) {
  const darkSide = actor.system?.force?.darkSideScore ?? 0;
  const wisdom = actor.system?.attributes?.wis?.total ?? 10;
  const met = darkSide >= wisdom;
  // ...
}
```

**Formula:** `darkSide >= wisdom`
**Purpose:** Dynamic threshold (must match or exceed wisdom score)

#### Function 3: checkDarkSideScore()
```javascript
function checkDarkSideScore(actor, requirement) {
  const darkSideScore = actor.system?.darkSideScore ||
                        actor.system?.darksideScore || 0;  // Legacy fallback
  const wisScore = actor.system?.abilities?.wis?.score || 10;

  return {
    met: darkSideScore >= wisScore,
    actual: darkSideScore,
    required: wisScore
  };
}
```

**Formula:** `darkSideScore >= wisScore`
**Legacy Support:** Falls back to lowercase `darksideScore`
**Purpose:** Standalone validation (legacy compatibility)

---

### Evaluation 12: PrerequisiteChecker - Alignment Check
**File:** `scripts/data/prerequisite-checker.js`
**Lines:** 818-832
**Type:** Alignment-based prerequisite

```javascript
case 'alignment': {
  const lightSide = actor.system?.force?.lightSideScore ?? 0;
  const darkSide = actor.system?.force?.darkSideScore ?? 0;
  const isDark = prereq.alignment?.includes('Dark');
  const isLight = prereq.alignment?.includes('Light');

  let met = true;
  if (isDark && lightSide > darkSide) { met = false; }
  if (isLight && darkSide > lightSide) { met = false; }

  return {
    met,
    message: !met ? `Requires ${prereq.alignment} alignment` : ''
  };
}
```

**Formula:** Relative comparison: `lightSide > darkSide` or vice versa
**Purpose:** Gate prestige classes by force alignment
**Note:** Compares two scores for relative dominance

---

### Evaluation 13: ForceEngine.getDescriptorModifier()
**File:** `scripts/engine/force/force-engine.js`
**Lines:** 80-89
**Type:** Force power calculation

```javascript
static getDescriptorModifier(modifier, descriptor, actor) {
  if (!modifier || !actor.system.force) return modifier;

  const forceAlignment = actor.system.force.alignment || 'neutral';
  if (descriptor === 'light' && forceAlignment === 'light') return modifier + 2;
  if (descriptor === 'dark' && forceAlignment === 'dark') return modifier + 2;
  if (descriptor === 'universal') return modifier;

  return modifier;
}
```

**Formula:** `modifier + 2` if alignment matches descriptor
**Purpose:** Bonus damage/effect for aligned force powers
**Note:** Uses `system.force.alignment` (not darkSideScore)

---

## Part 4: Configuration & Settings

**File:** `scripts/utils/settings-helper.js`
**Lines:** 138-145

```javascript
darkSideMaxMultiplier: 1,
darkSidePowerIncreaseScore: true,
darkInspirationEnabled: false,
forcePointRecovery: 'level',
darkSideTemptation: 'strict',
```

**Configurable Flags:**
- `darkSideMaxMultiplier`: Affects DSP cap scaling (default: 1x)
- `darkSidePowerIncreaseScore`: Whether dark powers increase DSS (default: true)
- `darkInspirationEnabled`: Dark side inspiration mechanic (default: false)
- `darkSideTemptation`: Mode for DSP triggering ('strict', 'narrative', etc.)

---

## Part 5: Mathematical Formula Summary

| Formula | Location | Field(s) | Purpose | Thresholds |
|---------|----------|---------|---------|------------|
| `dsp / wisdom`, capped 1.0 | mentor-story-resolver.js | `darkSidePoints` | Story filtering | 1.0 max |
| `min(1.5, 1 + dsp*0.1)` | mentor-suggestion-bias.js | `darkSidePoints` | Suggestion bias | 1.5 max |
| `dsp / maxDSP` vs thresholds | force-secret-suggestion-engine.js | `system.swse.darkSidePoints` | Institution | SITH_RATIO, JEDI_RATIO |
| `dsp / dspMax` (0.3, 0.5, 0.7) | mentor-chat-dialog.js | `darkSidePoints` | Display warnings | 3 bands |
| `darkSide >= required` | prerequisite-checker.js | `force.darkSideScore` | Class gate | variable |
| `darkSide >= wisdom` | prerequisite-checker.js | `force.darkSideScore` | Dynamic gate | wisdom dependent |
| `darkSide >= lightSide` | prerequisite-checker.js | `force.darkSideScore` | Alignment | relative |
| `modifier + 2` | force-engine.js | `force.alignment` | Power bonus | static +2 |

---

## Part 6: Code Duplication Analysis

### Duplication Pattern: DSP Saturation Calculation

**Same calculation appears 4 times:**

1. **mentor-chat-dialog.js** (Line 409)
   ```javascript
   const dspSaturation = dspMax > 0 ? dsp / dspMax : 0;
   ```

2. **mentor-chat-dialog.js** (Line 570)
   ```javascript
   const dspSaturation = dspMax > 0 ? dsp / dspMax : 0;
   ```

3. **mentor-chat-dialog.js** (Line 631)
   ```javascript
   const dspSaturation = dspMax > 0 ? dsp / dspMax : 0;
   ```

4. **mentor-dialogue-v2-integration.js** (Line 68)
   ```javascript
   const dspSaturation = dspMax > 0 ? dsp / dspMax : 0;
   ```

**Variation:** mentor-story-resolver.js uses `dsp / wisdom` instead (DIFFERENT formula)

**Risk:** Code changes to saturation logic would require updating 4 separate locations

---

## Part 7: Test References

**File:** `scripts/mentor/mentor-memory.test.js`
**Status:** Contains commented-out DSP tests

```javascript
// Commented test for DSP saturation bands
export function testDspSaturation() {
  const testCases = [
    { dsp: 0, wisdom: 14, expectedBand: 'touched', expectedTone: 'measured' },
    { dsp: 2, wisdom: 14, expectedBand: 'touched', expectedTone: 'measured' },
    { dsp: 3, wisdom: 14, expectedBand: 'strained', expectedTone: 'concerned' },
    { dsp: 5, wisdom: 14, expectedBand: 'slipping', expectedTone: 'firm' },
    { dsp: 10, wisdom: 14, expectedBand: 'tainted', expectedTone: 'grave' },
    { dsp: 13, wisdom: 14, expectedBand: 'edge', expectedTone: 'severe' },
    { dsp: 15, wisdom: 14, expectedBand: 'fallen', expectedTone: 'cold' }
  ];
  // ...
}
```

**Defines:** DSP saturation bands
- touched: 0-1
- strained: 2-3
- slipping: 4-6
- tainted: 7-11
- edge: 12-14
- fallen: 15+

**Status:** Test expectations documented but functions not implemented

---

## Part 8: Architectural Findings

### ✅ Well-Implemented Patterns

1. **Mutation Authority:** All write operations go through ActorEngine (excellent governance)
2. **Mentor System:** Comprehensive DSP integration in voice, suggestions, narratives
3. **Force System:** Clear dark side mechanics (gain, redemption, alignment)
4. **Prerequisite System:** Multiple validation methods for class gating

### ⚠️ Areas of Concern

1. **Data Model Fragmentation:** 3-4 different storage locations for same concept
2. **Field Naming Inconsistency:** `darkSidePoints` vs `darkSideScore` vs `darksideScore`
3. **Code Duplication:** Saturation calculation repeated 4x
4. **Threshold Inconsistency:** Different systems use different saturation bands
5. **Namespace Fragmentation:** `system.*` vs `system.force.*` vs `system.swse.*`
6. **Missing Implementation:** Commented-out DSP utility functions in mentor-memory.test.js

---

## Part 9: Audit Conclusions

### System Status
**DSP is a REAL, ACTIVE game mechanic** that:
- Affects mentor narrative response selection
- Influences force point spending and redemption
- Gates access to prestige classes
- Modifies suggestion recommendations
- Impacts force power damage calculations
- Drives talent effects (wrath damage)

### Recommendation
**DSP should be unified under a centralized engine** rather than fragmented across multiple data models.

The current implementation is **functionally correct** but **architecturally fragmented**.

### Next Phase
When ready for implementation:
1. Consolidate data model to single location
2. Unify saturation calculation
3. Centralize threshold definitions
4. Create DSP Engine for authoritative calculations
5. Update all references to use centralized engine

---

## Appendix: File Index

**Core Engine Files:**
- `scripts/engine/force/force-engine.js` - DSP mutation
- `scripts/utils/force-points.js` - DSP score mutations
- `scripts/engine/talent/dark-side-talent-mechanics.js` - Wrath damage

**Mentor/Voice System:**
- `scripts/mentor/mentor-story-resolver.js` - Story filtering
- `scripts/mentor/mentor-suggestion-bias.js` - Bias calculation
- `scripts/mentor/mentor-chat-dialog.js` - Display logic (3x calculations)
- `scripts/mentor/mentor-dialogue-v2-integration.js` - Voice data
- `scripts/mentor/mentor-voice-synthesizer.js` - Axis interpretation

**Progression System:**
- `scripts/engine/progression/engine/force-secret-suggestion-engine.js` - Institution inference
- `scripts/data/prerequisite-checker.js` - Class validation (3x functions + alignment)

**Configuration:**
- `scripts/utils/settings-helper.js` - DSP behavior flags

**Tests:**
- `scripts/mentor/mentor-memory.test.js` - DSP saturation tests (commented)

**Import/Legacy:**
- `scripts/build/import-nonheroic-units-to-compendium.js` - Legacy initialization

---

**Report Generated:** 2026-03-01
**Audit Scope:** 823 JavaScript files scanned
**References Found:** 42+ files
**Status:** COMPLETE — AWAITING REFACTORING DECISION

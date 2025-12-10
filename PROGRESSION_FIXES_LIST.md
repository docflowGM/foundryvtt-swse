# Progression Engine Fixes - Implementation Plan

## Overview
This document outlines all fixes needed to support prestige class progression in the SWSE Foundry system, specifically for the Twi'lek Jedi → Jedi Knight progression test.

---

## Fix #1: Add Prestige Class Data to PROGRESSION_RULES

**File**: `scripts/progression/data/progression-data.js`

**Priority**: CRITICAL - Must be done first

**Description**: Add all prestige classes to the `PROGRESSION_RULES.classes` object with complete data.

### Implementation:

Add after the core classes (after line 181):

```javascript
// Prestige Classes
"Jedi Knight": {
  name: "Jedi Knight",
  hitDie: 10,
  skillPoints: 4,
  baseAttackBonus: "high", // +1 per level
  classSkills: [
    "Acrobatics", "Climb", "Endurance", "Initiative", "Jump",
    "Knowledge (Galactic Lore)", "Perception", "Persuasion", "Pilot",
    "Stealth", "Swim", "Use the Force"
  ],
  startingFeats: [], // No automatic feats
  talentTrees: [
    "Duelist", "Lightsaber Forms", "Jedi Battlemaster", "Jedi Shadow",
    "Jedi Watchman", "Jedi Archivist", "Jedi Healer", "Jedi Artisan",
    "Jedi Instructor", "Jedi Investigator", "Jedi Refugee", "Jedi Weapon Master"
  ],
  fortSave: "high",
  refSave: "high",
  willSave: "high",
  forceSensitive: true,
  prestigeClass: true,
  prerequisites: {
    bab: 7,
    skills: ["Use the Force"],
    feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"]
  }
},
"Jedi Master": {
  name: "Jedi Master",
  hitDie: 10,
  skillPoints: 4,
  baseAttackBonus: "high",
  classSkills: [
    "Acrobatics", "Climb", "Endurance", "Initiative", "Jump",
    "Knowledge (Galactic Lore)", "Perception", "Persuasion", "Pilot",
    "Stealth", "Swim", "Use the Force"
  ],
  startingFeats: [],
  talentTrees: ["Jedi Master", "Master Instructor"],
  fortSave: "high",
  refSave: "high",
  willSave: "high",
  forceSensitive: true,
  prestigeClass: true,
  prerequisites: {
    level: 12,
    skills: ["Use the Force"],
    feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
    techniques: 1
  }
},
"Sith Apprentice": {
  name: "Sith Apprentice",
  hitDie: 10,
  skillPoints: 4,
  baseAttackBonus: "high",
  classSkills: [
    "Acrobatics", "Climb", "Deception", "Endurance", "Initiative",
    "Jump", "Knowledge (Galactic Lore)", "Perception", "Persuasion",
    "Pilot", "Stealth", "Swim", "Use the Force"
  ],
  startingFeats: [],
  talentTrees: ["Sith Secrets", "Dark Side Warrior"],
  fortSave: "high",
  refSave: "high",
  willSave: "high",
  forceSensitive: true,
  prestigeClass: true,
  prerequisites: {
    bab: 7,
    skills: ["Use the Force"],
    feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"]
  }
},
"Sith Lord": {
  name: "Sith Lord",
  hitDie: 10,
  skillPoints: 4,
  baseAttackBonus: "high",
  classSkills: [
    "Acrobatics", "Climb", "Deception", "Endurance", "Initiative",
    "Jump", "Knowledge (Galactic Lore)", "Perception", "Persuasion",
    "Pilot", "Stealth", "Swim", "Use the Force"
  ],
  startingFeats: [],
  talentTrees: ["Sith Lord", "Dark Lord"],
  fortSave: "high",
  refSave: "high",
  willSave: "high",
  forceSensitive: true,
  prestigeClass: true,
  prerequisites: {
    level: 12,
    skills: ["Use the Force"],
    feats: ["Force Sensitivity", "Weapon Proficiency (Lightsabers)"],
    techniques: 1
  }
}
// ... add more prestige classes as needed
```

**Testing**: After this fix, `PROGRESSION_RULES.classes["Jedi Knight"]` should return the class data object.

---

## Fix #2: Add Force Power Data for Prestige Classes

**File**: `scripts/progression/data/progression-data.js`

**Priority**: HIGH

**Description**: Add Jedi Knight and other prestige classes to FORCE_POWER_DATA.

### Implementation:

Update the FORCE_POWER_DATA object (around line 242):

```javascript
export const FORCE_POWER_DATA = {
  feats: {
    "Force Training": { grants: 1 }
  },
  classes: {
    "Jedi": {
      "1": { "powers": 0 },
      "3": { "powers": 1 },
      "7": { "powers": 1 },
      "11": { "powers": 1 }
    },
    "Jedi Knight": {
      "1": { "powers": 1 },
      "3": { "powers": 1 },
      "5": { "powers": 1 },
      "7": { "powers": 1 },
      "9": { "powers": 1 }
    },
    "Jedi Master": {
      "1": { "powers": 1 },
      "2": { "powers": 1 },
      "3": { "powers": 1 },
      "4": { "powers": 1 },
      "5": { "powers": 1 }
    },
    "Sith Apprentice": {
      "1": { "powers": 1 },
      "3": { "powers": 1 },
      "5": { "powers": 1 },
      "7": { "powers": 1 },
      "9": { "powers": 1 }
    },
    "Sith Lord": {
      "1": { "powers": 1 },
      "2": { "powers": 1 },
      "3": { "powers": 1 },
      "4": { "powers": 1 },
      "5": { "powers": 1 }
    }
  },
  templates: {}
};
```

---

## Fix #3: Add Prerequisite Validation

**File**: `scripts/progression.js` (or new file: `scripts/progression/validators/prerequisite-validator.js`)

**Priority**: HIGH

**Description**: Validate prestige class prerequisites before allowing selection.

### Implementation:

Add new method to SWSEProgressionEngine:

```javascript
/**
 * Check if character meets prerequisites for a class
 * @param {string} classId - Class to check
 * @returns {Object} { valid: boolean, missing: string[] }
 */
_validateClassPrerequisites(classId) {
  const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
  const classData = PROGRESSION_RULES.classes[classId];

  if (!classData?.prerequisites) {
    return { valid: true, missing: [] };
  }

  const prereqs = classData.prerequisites;
  const missing = [];
  const prog = this.actor.system.progression || {};

  // Check BAB
  if (prereqs.bab) {
    const currentBAB = this.actor.system.bab || 0;
    if (currentBAB < prereqs.bab) {
      missing.push(`BAB +${prereqs.bab} (current: +${currentBAB})`);
    }
  }

  // Check level
  if (prereqs.level) {
    const currentLevel = this.actor.system.level || 0;
    if (currentLevel < prereqs.level) {
      missing.push(`Level ${prereqs.level} (current: ${currentLevel})`);
    }
  }

  // Check skills
  if (prereqs.skills) {
    const trainedSkills = prog.skills || [];
    for (const reqSkill of prereqs.skills) {
      const hasTrained = trainedSkills.some(s =>
        (typeof s === 'string' ? s : s.key) === reqSkill
      );
      if (!hasTrained) {
        missing.push(`Trained in ${reqSkill}`);
      }
    }
  }

  // Check feats
  if (prereqs.feats) {
    const allFeats = [...(prog.feats || []), ...(prog.startingFeats || [])];
    for (const reqFeat of prereqs.feats) {
      if (!allFeats.includes(reqFeat)) {
        missing.push(reqFeat);
      }
    }
  }

  // Check talents
  if (prereqs.talents) {
    const talents = prog.talents || [];
    if (talents.length < prereqs.talents) {
      missing.push(`${prereqs.talents} talents (current: ${talents.length})`);
    }
  }

  // Check techniques
  if (prereqs.techniques) {
    const techniques = prog.techniques?.length || 0;
    if (techniques < prereqs.techniques) {
      missing.push(`${prereqs.techniques} Force technique(s)`);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}
```

Update `_action_confirmClass` to use validation:

```javascript
async _action_confirmClass(payload) {
  const { classId } = payload;
  const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
  const classData = PROGRESSION_RULES.classes[classId];

  if (!classData) {
    throw new Error(`Unknown class: ${classId}`);
  }

  // Validate prerequisites for prestige classes
  if (classData.prestigeClass) {
    const validation = this._validateClassPrerequisites(classId);
    if (!validation.valid) {
      const missingText = validation.missing.join(", ");
      throw new Error(`Does not meet ${classId} prerequisites. Missing: ${missingText}`);
    }
  }

  // ... rest of existing code
}
```

---

## Fix #4: Fix Class Level Array Structure

**File**: `scripts/progression.js`

**Priority**: HIGH

**Description**: The current code adds a new entry for each level-up. We need to decide:
- Option A: Keep separate entries, fix HP calculation
- Option B: Consolidate levels in existing class entry

**Recommendation**: Option A (less invasive)

### Implementation (Option A):

Update `_calculateHP` in `scripts/progression/engine/progression-actor-updater.js`:

```javascript
static _calculateHP(actor, classLevels) {
  let maxHP = 0;
  const conMod = actor.system.abilities?.con?.mod || 0;
  let isFirstLevel = true;

  for (const classLevel of classLevels) {
    const classData = PROGRESSION_RULES.classes[classLevel.class];

    // Skip if class data not found (with warning)
    if (!classData) {
      swseLogger.warn(`HP calculation: Unknown class "${classLevel.class}", skipping`);
      continue;
    }

    const hitDie = classData.hitDie || 6;

    // First level ever: max HP
    if (isFirstLevel) {
      maxHP += hitDie + conMod;
      isFirstLevel = false;
    } else {
      // All other levels: average HP
      const avgRoll = Math.floor(hitDie / 2) + 1;
      maxHP += avgRoll + conMod;
    }
  }

  return {
    max: Math.max(1, maxHP),
    value: Math.max(1, maxHP)
  };
}
```

**Key change**: Treat each array entry as a single level, not a block of levels.

---

## Fix #5: Add Logging for Missing Class Data

**File**: `scripts/progression/data/progression-data.js`

**Priority**: MEDIUM

**Description**: Add warnings when class data is missing instead of silently skipping.

### Implementation:

Update `calculateBAB`:

```javascript
export function calculateBAB(classLevels) {
  let bab = 0;
  for (const classLevel of classLevels) {
    const classData = PROGRESSION_RULES.classes[classLevel.class];
    if (!classData) {
      swseLogger.warn(`BAB calculation: Unknown class "${classLevel.class}", skipping`);
      continue;
    }

    const levels = classLevel.level;
    if (classData.baseAttackBonus === "high") {
      bab += levels;
    } else if (classData.baseAttackBonus === "medium") {
      bab += Math.floor(levels * 0.75);
    } else {
      bab += Math.floor(levels * 0.5);
    }
  }
  return bab;
}
```

Similar changes for `calculateSaveBonus`.

---

## Fix #6: Update Level Calculation

**File**: `scripts/progression/engine/progression-actor-updater.js`

**Priority**: HIGH

**Description**: Ensure level calculation works correctly with the array structure.

### Implementation:

Current code (line 18):
```javascript
const totalLevel = classLevels.reduce((sum, cl) => sum + (cl.level || 0), 0);
```

If using separate entries (each with `level: 1`), change to:
```javascript
const totalLevel = classLevels.length; // Each entry = 1 level
```

Or keep existing if consolidating levels.

---

## Fix #7: Handle Skill Points for Prestige Classes

**File**: `scripts/progression.js`

**Priority**: HIGH

**Description**: Ensure skill points are calculated correctly, with fallback for missing data.

### Implementation:

In `_action_confirmClass` (around line 529), add safety check:

```javascript
const skillPointsBase = classData.skillPoints || 4; // Default to 4 if missing
const intMod = this.actor.system.abilities.int?.mod || 0;

classLevels.push({
  class: classId,
  level: 1, // Since we're adding one level at a time
  choices: {},
  skillPoints: (skillPointsBase + intMod) * (this.mode === "chargen" ? 4 : 1)
});
```

**Note**: Character creation multiplies by 4, level-up doesn't.

---

## Fix #8: Update Core Classes Prestige Flag

**File**: `scripts/progression/data/progression-data.js`

**Priority**: LOW

**Description**: Add `prestigeClass: false` flag to core classes for consistency.

### Implementation:

Add to each core class:
```javascript
Soldier: {
  name: "Soldier",
  prestigeClass: false,
  // ... rest of data
},
```

---

## Fix #9: Add Prestige Class Filtering

**File**: `scripts/progression.js` or relevant UI code

**Priority**: MEDIUM

**Description**: Filter prestige classes from character creation, only show during level-up when prerequisites are met.

### Implementation:

```javascript
getAvailableClasses() {
  const allClasses = Object.keys(PROGRESSION_RULES.classes);

  if (this.mode === "chargen") {
    // Only show core classes during character creation
    return allClasses.filter(classId => {
      const classData = PROGRESSION_RULES.classes[classId];
      return !classData.prestigeClass;
    });
  } else {
    // During level-up, show all classes where prerequisites are met
    return allClasses.filter(classId => {
      const validation = this._validateClassPrerequisites(classId);
      return validation.valid;
    });
  }
}
```

---

## Fix #10: Add Unit Tests

**File**: New file `tests/progression-engine.test.js`

**Priority**: MEDIUM

**Description**: Add automated tests to catch regressions.

### Implementation:

```javascript
describe("Progression Engine - Prestige Classes", () => {
  test("Jedi Knight data exists", () => {
    expect(PROGRESSION_RULES.classes["Jedi Knight"]).toBeDefined();
    expect(PROGRESSION_RULES.classes["Jedi Knight"].hitDie).toBe(10);
  });

  test("BAB calculation includes prestige classes", () => {
    const classLevels = [
      { class: "Jedi", level: 6 },
      { class: "Jedi Knight", level: 2 }
    ];
    const bab = calculateBAB(classLevels);
    expect(bab).toBe(6); // 4 + 2
  });

  test("Prerequisite validation rejects insufficient BAB", () => {
    const actor = createMockActor({ bab: 4 });
    const engine = new SWSEProgressionEngine(actor, "levelup");
    const validation = engine._validateClassPrerequisites("Jedi Knight");
    expect(validation.valid).toBe(false);
    expect(validation.missing).toContain("BAB +7 (current: +4)");
  });
});
```

---

## Implementation Order

1. **Fix #1** (Add prestige class data) - CRITICAL, do first
2. **Fix #2** (Add force power data) - HIGH
3. **Fix #4** (Fix HP calculation) - HIGH
4. **Fix #5** (Add logging) - MEDIUM, helps debugging
5. **Fix #3** (Add prerequisite validation) - HIGH
6. **Fix #7** (Handle skill points) - HIGH
7. **Fix #6** (Update level calculation) - HIGH
8. **Fix #9** (Filter prestige classes) - MEDIUM
9. **Fix #8** (Add prestige flag to core) - LOW
10. **Fix #10** (Add tests) - MEDIUM

---

## Testing Plan

After implementing fixes, run:
1. Original test script: `test-progression.js`
2. New Twi'lek Jedi test: `test-twilek-jedi-progression.js`
3. Unit tests (if implemented)

**Expected Results**:
- ✅ Character reaches level 8
- ✅ BAB = +6
- ✅ HP = 46
- ✅ 6 Jedi levels + 2 Jedi Knight levels
- ✅ All prerequisites validated
- ✅ No errors in console

---

## Estimated Effort

- **Fix #1**: 2-3 hours (research all prestige classes, enter data)
- **Fix #2**: 30 minutes
- **Fix #3**: 1-2 hours (validation logic)
- **Fix #4**: 1 hour (careful testing needed)
- **Fix #5**: 30 minutes
- **Fix #6**: 30 minutes
- **Fix #7**: 30 minutes
- **Fix #8**: 15 minutes
- **Fix #9**: 1 hour
- **Fix #10**: 2-3 hours (if doing comprehensive tests)

**Total**: ~10-13 hours

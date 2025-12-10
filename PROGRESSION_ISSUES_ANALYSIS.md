# Progression Engine Issues Analysis
## Twi'lek Jedi Progression to Level 8 Test

**Date**: 2025-12-10
**Test**: Creating Twi'lek Jedi, leveling to 6 as Jedi, then to 8 as Jedi Knight

---

## Critical Issues Found

### 1. **Missing Prestige Class Data** (CRITICAL - HIGH PRIORITY)

**Location**: `scripts/progression/data/progression-data.js:79-182`

**Problem**: The `PROGRESSION_RULES.classes` object only contains the 5 core classes:
- Soldier
- Jedi
- Noble
- Scout
- Scoundrel

Prestige classes like "Jedi Knight" are NOT defined in this object.

**Impact**:
- `calculateBAB()` at line 201-217 will skip Jedi Knight levels because `classData` will be `undefined`
- `calculateSaveBonus()` at line 222-238 will skip Jedi Knight levels
- `ActorProgressionUpdater._calculateHP()` at line 92-121 will skip Jedi Knight levels
- Force sensitivity check at line 62-67 won't work for prestige classes
- Skill points cannot be calculated for prestige class levels

**Example**:
```javascript
// progression-data.js:204
const classData = PROGRESSION_RULES.classes[classLevel.class];
if (!classData) continue; // ← Jedi Knight will hit this and be skipped!
```

**Expected Behavior**: Character with 6 Jedi + 2 Jedi Knight should have:
- BAB: +4 (Jedi) + +2 (Jedi Knight) = +6
- HP: 6 + (5×4) + (2×6) + (8×CON) = 46 (with CON +1)

**Actual Behavior**: Character will have:
- BAB: +4 (only Jedi counted)
- HP: 6 + (5×4) + 8 = 34 (Jedi Knight levels ignored)

---

### 2. **Class Level Data Structure Confusion** (HIGH PRIORITY)

**Location**: Multiple files

**Problem**: The `classLevels` array structure is ambiguous. Looking at the code:

```javascript
// progression.js:521-530
classLevels.push({
  class: classId,
  level: level,  // ← Always set to 1?
  choices: {},
  skillPoints: (classData.skillPoints + (this.actor.system.abilities.int?.mod || 0)) * 4
});
```

This suggests each level-up pushes a NEW entry with `level: 1`. But the HP calculation code assumes:
```javascript
// progression-actor-updater.js:102
const levels = classLevel.level || 1; // ← Expects this to be > 1 for multilevels
```

**Impact**:
- If each level-up adds a separate entry, we'll have 6 separate `{ class: "Jedi", level: 1 }` entries
- HP calculation will work incorrectly (it expects consolidated entries like `{ class: "Jedi", level: 6 }`)
- Total level calculation at line 18 sums up all `level` values - if each is 1, we get correct total
- But HP calculation assumes first entry gets max roll, rest get average - this breaks with separate entries

**Expected**: One entry per class with accumulated levels: `[{ class: "Jedi", level: 6 }, { class: "Jedi Knight", level: 2 }]`

**Actual**: Likely six separate entries: `[{ class: "Jedi", level: 1 }, { class: "Jedi", level: 1 }, ...]`

---

### 3. **HP Calculation Logic Error** (MEDIUM-HIGH PRIORITY)

**Location**: `scripts/progression/engine/progression-actor-updater.js:92-121`

**Problem**: The HP calculation assumes:
- First class entry (index 0) gets max HP on first level
- Additional levels in that same entry use average HP
- Other class entries (multiclass) all use average HP

But if each level-up creates a separate entry (issue #2), then:
- Every "first level" entry gets max HP (6 for Jedi d6)
- Character ends up with way too much HP

**Example with Bug**:
```
Entry 0: Jedi level 1 → 6 (max)
Entry 1: Jedi level 1 → 6 (max) ← WRONG! Should be average
Entry 2: Jedi level 1 → 6 (max) ← WRONG!
... etc
Total: 6×6 + 8×1 (CON) = 44 HP instead of 30 HP
```

---

### 4. **Missing Skill Point Data for Prestige Classes** (MEDIUM PRIORITY)

**Location**: `scripts/progression.js:529`

**Problem**: Skill points per level are calculated from class data:
```javascript
skillPoints: (classData.skillPoints + (this.actor.system.abilities.int?.mod || 0)) * 4
```

For Jedi Knight, `classData` is undefined, so this will throw an error or default to incorrect values.

**Impact**: Cannot allocate skills properly during Jedi Knight level-up

---

### 5. **Missing BAB/Save Calculations for Prestige Classes** (HIGH PRIORITY)

**Location**:
- `scripts/progression/data/progression-data.js:201-217` (calculateBAB)
- `scripts/progression/data/progression-data.js:222-238` (calculateSaveBonus)

**Problem**: Both functions iterate through `classLevels` and look up `PROGRESSION_RULES.classes[classLevel.class]`. When they encounter "Jedi Knight", they get undefined and skip it with `continue`.

**Expected Values**:
- 6 Jedi levels (medium BAB): Math.floor(6 × 0.75) = 4
- 2 Jedi Knight levels (high BAB): 2 × 1 = 2
- **Total BAB**: 6

**Actual Values**:
- 6 Jedi levels: +4
- 2 Jedi Knight levels: +0 (skipped)
- **Total BAB**: 4 ❌

**Same issue for saves**:
- Jedi Knight has: Fort +2/level, Ref +2/level, Will +2/level (all high)
- But these bonuses won't be counted

---

### 6. **Prestige Class Prerequisites Not Validated** (MEDIUM PRIORITY)

**Location**: Nowhere in the progression engine

**Problem**: The progression engine doesn't check if the character meets prerequisites before allowing prestige class selection.

**Jedi Knight Prerequisites** (from `data/prestige-class-prerequisites.json:53-59`):
- BAB +7
- Trained in Use the Force
- Force Sensitivity feat
- Weapon Proficiency (Lightsabers)
- Member of The Jedi

**Issue**: At level 7, a character with 6 Jedi levels only has BAB +4, not +7! They don't meet the prerequisite.

**Impact**: Either:
1. Test will fail with error when trying to select Jedi Knight
2. Or worse, it will succeed but character is illegally built

---

### 7. **Class Levels Array Structure** (LOW PRIORITY)

**Location**: Throughout progression engine

**Problem**: Looking at the compatibility layer:
```javascript
// progression-engine.js:219-230 (legacy code)
static async _applyClass(actor, payload) {
  const progression = actor.system.progression || {};
  const classLevels = Array.from(progression.classLevels || []);
  classLevels.push({
    class: payload.classId,
    level: 1,
    choices: payload.choices || {}
  });
```

This confirms that each level-up adds a NEW entry with `level: 1`, not incrementing an existing entry.

**Impact**: The HP calculation logic (issue #3) is definitely broken.

---

## Additional Observations

### Positive Findings:
1. ✅ Species data (Twi'lek) is properly defined with +2 DEX, -2 CHA
2. ✅ Background data exists and has trained skills
3. ✅ Core Jedi class is fully defined with all required data
4. ✅ Point buy validation works correctly
5. ✅ Feat/talent budgets are tracked properly

### Undefined Behaviors:
1. ❓ What happens when `doAction("confirmClass", { classId: "Jedi Knight" })` is called?
   - Does it throw an error?
   - Does it silently fail?
   - Does it create an entry anyway?

2. ❓ How are character levels actually tracked?
   - Is it the sum of all `classLevel.level` values?
   - Or is it the count of entries in `classLevels` array?

---

## Expected Character Sheet at Level 8

### Lyn'ara Secura - Level 8 Twi'lek Jedi Knight

**Species**: Twi'lek
**Background**: Outer Rim Colonist
**Classes**: Jedi 6 / Jedi Knight 2

#### Ability Scores (at level 8)
- **STR**: 10 (+0)
- **DEX**: 16 (+3) ← 14 base + 2 racial
- **CON**: 12 (+1)
- **INT**: 10 (+0)
- **WIS**: 17 (+3) ← 15 base + 2 from level 4 & 8 increases
- **CHA**: 11 (+0) ← 13 base - 2 racial

#### Combat Statistics
- **Hit Points**: 46 / 46
  - Level 1: 6 (max d6) + 1 (CON) = 7
  - Levels 2-6: 5 × (4 average + 1 CON) = 25
  - Levels 7-8: 2 × (6 average d10 + 1 CON) = 14
  - **Total**: 7 + 25 + 14 = 46

- **Base Attack Bonus**: +6
  - 6 Jedi levels (medium): +4
  - 2 Jedi Knight (high): +2

- **Fortitude**: +6 (2 class + 1 ability + 3 base)
  - Jedi: low save = floor(6/3) = 2
  - Jedi Knight: high save = floor(2/2) + 2 = 3
  - Best ability (CON): +1
  - **Total**: 2 + 3 + 1 = 6

- **Reflex**: +10 (5 class + 3 ability + 2 base)
  - Jedi: high save = floor(6/2) + 2 = 5
  - Jedi Knight: high save = floor(2/2) + 2 = 3
  - DEX: +3
  - **Total**: 5 + 3 + 3 = 11

- **Will**: +11 (5 class + 3 ability + 3 base)
  - Jedi: high save = floor(6/2) + 2 = 5
  - Jedi Knight: high save = floor(2/2) + 2 = 3
  - WIS: +3
  - **Total**: 5 + 3 + 3 = 11

#### Skills (32 total ranks)
- **Use the Force**: 8 ranks
- **Perception**: 8 ranks
- **Acrobatics**: 8 ranks
- **Initiative**: 8 ranks

#### Feats
**Starting Feats** (from Jedi class):
- Force Sensitivity
- Weapon Proficiency (Lightsabers)
- Weapon Proficiency (Simple)

**Chosen Feats**:
- Level 1: Weapon Finesse
- Level 3: Force Training
- Level 6: Skill Focus (Use the Force)
- Level 9: Improved Defenses

#### Talents
- Level 1: Deflect
- Level 3: Block
- Level 5: Redirect Shot
- Level 7: Ataru or Soresu

---

## Summary

### Critical Blockers:
1. ❌ Prestige classes not in PROGRESSION_RULES.classes
2. ❌ BAB calculation skips prestige classes
3. ❌ HP calculation skips prestige classes
4. ❌ Save calculations skip prestige classes
5. ❌ Skill points can't be determined for prestige classes

### Required Fixes:
1. Add prestige class data to PROGRESSION_RULES.classes
2. Verify/fix class level array structure (one entry per class vs. one per level)
3. Fix HP calculation to handle proper structure
4. Add prerequisite validation before allowing prestige class selection
5. Add skill point data for all prestige classes
6. Add force power progression for prestige classes

### Test Result Prediction:
❌ **Test will FAIL** - Multiple critical errors will occur during progression to level 7-8.

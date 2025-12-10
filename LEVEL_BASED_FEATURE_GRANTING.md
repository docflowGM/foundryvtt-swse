# Level-Based Feature Granting Implementation

## Overview

This document describes the implementation of level-based feature granting in the progression engine. Instead of trying to track cumulative feat/talent budgets across all levels, the system now reads the compendium data for the specific class level being taken and grants exactly what that level provides.

## Problem Statement

Previously, the progression engine had several issues:

1. **Hardcoded class data** - Only 5 core classes were hardcoded, missing all prestige classes
2. **Missing class features** - Bonus feats granted by classes at specific levels weren't being tracked
3. **Complex budget tracking** - Trying to accumulate feat/talent budgets across levels was error-prone
4. **No prestige class support** - Prestige classes couldn't be properly selected or leveled

## Solution: Read Level-Specific Features from Compendium

The solution is to:

1. **Determine which level of a class is being taken** (e.g., taking 2nd level of Jedi, or 1st level of Jedi Knight)
2. **Load class data from compendium** (which contains full level progression data)
3. **Check what that specific level grants** (bonus feats, talents, force points)
4. **Update budgets accordingly**

This approach works uniformly for:
- Core classes (Jedi, Scout, Soldier, Scoundrel, Noble)
- Prestige classes (Jedi Knight, Ace Pilot, etc.)
- Any future classes added to the compendium

## Implementation Details

### Class Data Loader Enhancement

The `class-data-loader.js` already parses level progression data from the compendium:

```javascript
for (const levelData of levelProgression) {
  const level = levelData.level;
  const features = levelData.features || [];

  featuresByLevel[level] = {
    features: features,
    bonusFeats: features.filter(f => f.type === 'feat_choice' || f.name?.includes('Bonus Feat')).length,
    talents: features.filter(f => f.type === 'talent_choice').length,
    forcePoints: levelData.force_points
  };
}
```

This creates a structure like:
```javascript
{
  1: { features: [...], bonusFeats: 0, talents: 1, forcePoints: 0 },
  2: { features: [...], bonusFeats: 1, talents: 0, forcePoints: 0 },
  3: { features: [...], bonusFeats: 0, talents: 1, forcePoints: 0 },
  // etc.
}
```

### Progression Engine Changes

#### `_action_confirmClass()` - scripts/engine/progression.js:511

**Key Changes:**

1. **Determine level in class being taken:**
```javascript
const existingLevelsInClass = classLevels.filter(cl => cl.class === classId).length;
const levelInClass = existingLevelsInClass + 1;
```

2. **Load from compendium if needed:**
```javascript
// If not found, or if hardcoded data lacks levelProgression, load from compendium
if (!classData || !classData.levelProgression) {
  const compendiumData = await getClassData(classId);
  if (compendiumData) {
    classData = compendiumData;
  }
}
```

3. **Get level-specific features:**
```javascript
const levelFeatures = classData.levelProgression?.[levelInClass] || {
  features: [],
  bonusFeats: 0,
  talents: 0,
  forcePoints: 0
};
```

4. **Update budgets based on what this level grants:**
```javascript
// Add bonus feats from this class level
if (levelFeatures.bonusFeats > 0) {
  featBudget += levelFeatures.bonusFeats;
}

// Calculate talent budget based on what THIS SPECIFIC LEVEL grants
let talentBudget = progression.talentBudget || 0;
if (levelFeatures.talents > 0) {
  talentBudget += levelFeatures.talents;
}
```

5. **Store both budgets in progression:**
```javascript
await applyActorUpdateAtomic(this.actor, {
  "system.progression.classLevels": classLevels,
  "system.progression.startingFeats": allStartingFeats,
  "system.progression.featBudget": featBudget,
  "system.progression.talentBudget": talentBudget  // NEW
});
```

#### `_action_confirmTalents()` - scripts/engine/progression.js:675

**Key Changes:**

1. **Use talent budget from progression:**
```javascript
const talentBudget = progression.talentBudget || 0;
```

2. **Better validation with helpful error messages:**
```javascript
if (talentsAfterSelection > talentBudget) {
  throw new Error(
    `Too many talents selected: ${talentsAfterSelection}/${talentBudget} ` +
    `(${currentTalents.length} already selected, trying to add ${newTalents.length})`
  );
}
```

## Benefits

### 1. Single Source of Truth
All class data comes from the compendium, ensuring consistency and making updates easy.

### 2. Automatic Support for All Classes
Both core and prestige classes work without special handling.

### 3. Accurate Feature Granting
- Jedi level 2 grants a bonus feat (per compendium data)
- Jedi level 4 grants a bonus feat
- Each level gets exactly what it should

### 4. Simplified Logic
No complex cumulative budget tracking - each level just adds what it grants.

### 5. Easy to Extend
Adding new classes to the compendium automatically makes them work in progression.

## Example: Jedi Progression

Using this system, a character taking Jedi levels gets:

| Level | In Class | Bonus Feats | Talents | Total Feat Budget | Total Talent Budget |
|-------|----------|-------------|---------|-------------------|---------------------|
| 1     | Jedi 1   | 0           | 1       | 1 (base)          | 1                   |
| 2     | Jedi 2   | 1           | 0       | 2                 | 1                   |
| 3     | Jedi 3   | 0           | 1       | 2                 | 2                   |
| 4     | Jedi 4   | 1           | 0       | 3                 | 2                   |
| 5     | Jedi 5   | 0           | 1       | 3                 | 3                   |
| 6     | Jedi 6   | 1           | 0       | 4                 | 3                   |
| 7     | JK 1     | 0           | 1       | 4                 | 4                   |
| 8     | JK 2     | 0           | 0       | 4                 | 4                   |

## Testing

The Twi'lek Jedi test script (`test-twilek-jedi-progression.js`) can be used to verify:

1. Bonus feats are granted at even levels for Jedi (2, 4, 6)
2. Talents are granted at odd levels for Jedi (1, 3, 5)
3. Prestige class (Jedi Knight) can be selected and grants its own features
4. Feat/talent budgets accumulate correctly

## Logging

The implementation includes detailed logging for debugging:

```
Progression: Taking Jedi level 2. Grants: 1 bonus feats, 0 talents, 0 force points
Progression: New budgets - Feat budget: 2, Talent budget: 1, Starting feats: [Force Sensitivity, Weapon Proficiency (Lightsabers), Weapon Proficiency (Simple Weapons)]
```

## Future Enhancements

1. **Automatic feat/talent selection** - Could auto-apply certain features based on class level
2. **Prerequisite validation** - Check if character meets prestige class requirements
3. **Force points tracking** - Use levelFeatures.forcePoints data
4. **Feature description display** - Show what each level grants in the UI

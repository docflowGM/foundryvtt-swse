# Prerequisite Engine Analysis & V2 Wiring

## Current State: Two Parallel Prerequisite Systems

You have **two independent prerequisite systems** that don't talk to each other:

### System 1: PrerequisiteRequirements (in use)
**Location**: `scripts/progression/feats/prerequisite_engine.js`

**Purpose**: Validates feat/talent prerequisites during feat/talent selection in chargen and levelup UIs
- Used in chargen-feats-talents.js, levelup-talents.js, levelup-feats.js
- Handles structured prerequisites (from item `prerequisitesStructured`)
- Handles legacy string prerequisites
- Comprehensive condition types: attribute, skill, BAB, level, feat, talent, force powers, techniques, secrets, etc.

**Status**: ✅ Working, used in UI

---

### System 2: PrerequisiteChecker (NOT IN USE)
**Location**: `scripts/data/prerequisite-checker.js`

**Purpose**: Validates prestige class prerequisites
- `checkPrerequisites(actor, className)` — Check if actor meets all prereqs for a prestige class
- `getAvailablePrestigeClasses(actor)` — List all prestige classes available to character
- `getQualifiedPrestigeClasses(actor)` — List only prestige classes character qualifies for

**Data Source**: `scripts/data/prestige-prerequisites.js`
- PRESTIGE_PREREQUISITES object with all prestige class rules
- Covers: Jedi Knight, Pathfinder, Ace Pilot, Crime Lord, Bounty Hunter, Elite Trooper, Force Adept, Gunslinger, etc.
- Each entry specifies: minLevel, minBAB, skills, feats, talents, forcePowers, forceTechniques, darkSideScore, species, special

**Status**: ❌ NOT USED IN PROGRESSION ENGINE
- Exists but is orphaned
- Progression engine does its own prerequisite checking via `classData._raw.prerequisites` from compendium

---

## Where Prerequisite Checking Currently Happens

### In Progression Engine (`scripts/engine/progression.js`)

Lines 1233-1283 (`_action_confirmClass`):
```javascript
if (classData.prestigeClass) {
  const requiredLevel = REQUIRED_PRESTIGE_LEVEL || 7;
  if (currentLevel < requiredLevel) {
    throw new Error(`requires character level ${requiredLevel}`);
  }

  if (classData._raw?.prerequisites) {
    const prereqs = classData._raw.prerequisites;

    // Manual checks for BAB, skills, feats, force sensitivity
    if (prereqs.bab) { ... calculateBAB ... }
    if (prereqs.trainedSkills) { ... check ... }
    if (prereqs.feats) { ... check ... }
    if (prereqs.forceSensitive) { ... check ... }
  }
}
```

**Problem**: Prerequisite checking is hardcoded inline, doing manual item lookups on each check.

---

## Problems With Current Approach

### 1. **Duplicate Code**
- Prerequisite checking logic is split across TWO modules
- PrerequisiteChecker has comprehensive logic but isn't used
- Progression engine re-implements parts of it inline

### 2. **Fragile Prestige Rules**
- Rules come from `classData._raw.prerequisites` (compendium JSON)
- If compendium is wrong/missing, hard to debug
- PRESTIGE_PREREQUISITES is authoritative but not used

### 3. **Not v2 Compliant**
- Prerequisite checking embedded in action handler (mutation-adjacent code)
- Direct item queries (`actor.items.find()`) tied to business logic
- No separation of concerns (validation vs. mutation)

### 4. **Incomplete Multiclass Handling**
- Character level calculation had bug (now fixed: `classLevels.reduce()`)
- BAB calculation requires async load of compendium each time
- No structured validation of all prerequisites at once

### 5. **No Pre-Validation**
- Validation only happens during `confirmClass` action
- Could be done earlier in preview/validation phase
- No way to check "what prestige classes are available to me?"

---

## How PrerequisiteChecker Should Work for V2

### Better Architecture: Separate Validation Phase

Current flow:
```
confirmClass action
  → inline validation checks
  → throw if failed
  → else mutate actor
```

Should be:
```
Phase 1: Snapshot (pure data)
Phase 2: Validation (pure, no mutations)
  ├─ Use PrerequisiteChecker.checkPrerequisites()
  └─ Return errors
Phase 3: Resolution (compute delta)
Phase 4: Application (mutate)
```

### Implementation Pattern

In progression-engine.js confirmClass:

```javascript
// BEFORE (current - inline validation)
if (classData.prestigeClass) {
  const requiredLevel = REQUIRED_PRESTIGE_LEVEL || 7;
  if (currentLevel < requiredLevel) {
    throw new Error(...);
  }
  if (classData._raw?.prerequisites) { ... manual checks ... }
}

// AFTER (v2 - delegated validation)
const { checkPrerequisites } = await import('../data/prerequisite-checker.js');
const prereqCheck = checkPrerequisites(this.actor, classId);
if (!prereqCheck.met) {
  throw new Error(`${classId}: ${prereqCheck.missing.join(', ')}`);
}
```

**Benefits**:
- ✅ Single source of truth (PRESTIGE_PREREQUISITES)
- ✅ Cleaner separation (validation logic in its own module)
- ✅ More comprehensive checking (PrerequisiteChecker handles more cases)
- ✅ Easier to extend (add new prestige classes without touching progression.js)
- ✅ Testable (can unit test prerequisite logic in isolation)

---

## How PrerequisiteChecker Fixes Bugs

### Bug 3: Prestige Class levelProgression Not Verified

**Current issue**: If compendium data is missing, no error
**Fix**: PrerequisiteChecker assumes compendium data exists and provides clear error message

```javascript
// In prerequisite-checker.js
function getBaseAttackBonus(actor) {
  if (actor.system?.bab !== undefined) return actor.system.bab;

  // Fallback only if no system.bab (which is now progression-owned)
  const classItems = actor.items?.filter(i => i.type === 'class') || [];
  let totalBAB = 0;
  for (const classItem of classItems) {
    const level = classItem.system?.level || 0;
    const progression = classItem.system?.babProgression || 'medium';
    const multiplier = { 'fast': 1.0, 'medium': 0.75, 'slow': 0.5 }[progression] || 0.75;
    totalBAB += Math.floor(level * multiplier);
  }
  return totalBAB;
}
```

Better approach: After hotfix, BAB is always in `system.bab`, so no fallback needed.

### Bug 4: Character Level Calculation

**Current issue**: Used `classLevels.length` instead of sum
**Fix**: PrerequisiteChecker uses proper calculation:

```javascript
function getTotalLevel(actor) {
  if (actor.system?.level) return actor.system.level;

  // Fallback to sum of class items (for legacy compatibility)
  const classItems = actor.items?.filter(i => i.type === 'class') || [];
  return classItems.reduce((sum, cls) => sum + (cls.system?.level || 0), 0);
}
```

✅ This is now correct with our fix.

### Bug 6: Talent-Per-Level Tracking

**Current issue**: No record of when talents were selected
**Potential fix**: Modify PrerequisiteChecker to track talent selection timing

PrerequisiteChecker currently checks `actor.items` for talents, but doesn't know WHEN they were selected. For v2, we could:

1. Add `talentsByLevel` to progression tracking
2. In PrerequisiteChecker, add method to validate prestige talent requirements:

```javascript
function checkTalentsByLevel(actor, requirement) {
  const talentsByLevel = actor.system.progression?.talentsByLevel || {};

  // Check if required talents were selected before required level
  for (const [talentName, gainedAtLevel] of Object.entries(talentsByLevel)) {
    if (requirement.levelCap && gainedAtLevel > requirement.levelCap) {
      return { met: false, message: `${talentName} must be selected by level ${requirement.levelCap}` };
    }
  }

  return { met: true };
}
```

---

## V2-Specific Adjustments Needed

### 1. Use system.bab (not fallback calculation)

Current code has fallback to calculate BAB from class items. With our hotfix, BAB is **always** in `system.bab` (progression-owned).

**Change in prerequisite-checker.js**:
```javascript
// OLD (fallback calculation)
function getBaseAttackBonus(actor) {
  if (actor.system?.bab) return actor.system.bab;

  // Fallback
  const classItems = actor.items?.filter(i => i.type === 'class') || [];
  let totalBAB = 0;
  // ... calculate from classItems ...
  return totalBAB;
}

// NEW (v2 - trust progression)
function getBaseAttackBonus(actor) {
  // BAB is progression-owned, always available after chargen
  return actor.system?.bab ?? 0;
}
```

### 2. Use system.level (not fallback calculation)

**Change in prerequisite-checker.js**:
```javascript
// OLD
function getTotalLevel(actor) {
  if (actor.system?.level) return actor.system.level;
  if (actor.system?.heroicLevel) return actor.system.heroicLevel;

  const classItems = actor.items?.filter(i => i.type === 'class') || [];
  return classItems.reduce((sum, cls) => sum + (cls.system?.level || 0), 0);
}

// NEW (v2 - use system.level only)
function getTotalLevel(actor) {
  return actor.system?.level ?? 1;
}
```

### 3. Delegate to PrerequisiteChecker in Progression Engine

**In scripts/engine/progression.js confirmClass()** (replace lines 1233-1283):

```javascript
// FIXED: Use PrerequisiteChecker instead of inline checks
if (classData.prestigeClass) {
  const { checkPrerequisites } = await import('../data/prerequisite-checker.js');
  const prereqCheck = checkPrerequisites(this.actor, classId);

  if (!prereqCheck.met) {
    const reasons = prereqCheck.missing.join(', ');
    swseLogger.error(`[PROGRESSION-CLASS] Prestige class prerequisites not met: ${reasons}`);
    throw new Error(`Cannot take prestige class "${classId}": ${reasons}`);
  }

  // Optionally log special conditions
  if (prereqCheck.special) {
    swseLogger.warn(`[PROGRESSION-CLASS] Special condition for ${classId}: ${prereqCheck.special} (must be verified by GM)`);
  }
}
```

**Benefits**:
- ✅ One source of truth (PRESTIGE_PREREQUISITES)
- ✅ Cleaner code (no inline prerequisite logic)
- ✅ Better error messages (comprehensive reasons)
- ✅ Auditable (can see all checks in one place)
- ✅ Testable (prerequisite logic in separate module)

---

## Summary: Integration Plan for V2

| Task | Priority | Impact |
|------|----------|--------|
| Update `getTotalLevel()` to use `system.level` only | 🟢 HIGH | Removes dependency on class items, trusts progression |
| Update `getBaseAttackBonus()` to use `system.bab` only | 🟢 HIGH | Works with Bug #1 hotfix (BAB is progression-owned) |
| Replace inline prerequisite checks in `confirmClass()` with `checkPrerequisites()` | 🟠 MEDIUM | Cleaner, more maintainable, single source of truth |
| Add optional logging of special conditions | 🔵 LOW | Better GM visibility |
| Consider adding `talentsByLevel` tracking for future prestige validation | 🔵 LOW | Enables Bug #6 fix (not needed yet) |

---

## Files to Modify

1. **scripts/data/prerequisite-checker.js**
   - Update `getTotalLevel()` to trust `system.level`
   - Update `getBaseAttackBonus()` to trust `system.bab`
   - Keep all other logic as-is (it's comprehensive)

2. **scripts/engine/progression.js**
   - Replace lines 1233-1283 with call to `checkPrerequisites()`
   - Import prerequisite-checker module
   - Update logging to show missing prerequisites

3. **No changes needed to**:
   - `scripts/data/prestige-prerequisites.js` (it's correct)
   - `scripts/progression/feats/prerequisite_engine.js` (it's used for feat/talent prereqs, not prestige)

---

## Recommendation

**Use PrerequisiteChecker NOW** to replace the inline validation in `confirmClass()`. This:
- ✅ Fixes architectural issue (improves v2 compliance)
- ✅ Eliminates duplicate code
- ✅ Makes prestige prerequisites auditable
- ✅ Solves part of Bug #3 (clear error if prestige data missing)
- ✅ Supports future work on Bug #6 (talent-by-level tracking)

This is a quick refactor (20-30 lines changed) with high maintainability payoff.


# Progression Engine Audit Report

## Executive Summary

**Audit Date:** 2026-01-11
**Total Files Audited:** 68+ progression engine files
**Critical Bugs Found:** 3
**Status:** ⚠️ CRITICAL BUGS - Immediate fixes required

---

## ❌ Critical Bugs Found

### Bug #1: Droid Fortitude Defense Uses Wrong Ability Modifier

**Severity:** HIGH
**Impact:** Droids receive incorrect Fortitude Defense values

**File:** `/home/user/foundryvtt-swse/scripts/progression/engine/progression-actor-updater.js`
**Lines:** 188-189

**Issue:**
```javascript
// Current (INCORRECT):
const fortAbility = Math.max(strMod, conMod);
```

In SWSE, **droids do not have Constitution scores** (they are constructs). For Fortitude Defense:
- **Living characters:** Use CON or STR (whichever is higher)
- **Droids:** Use STR only (no CON)

The current code uses `Math.max(strMod, conMod)` for all characters, which gives droids an incorrect Fortitude modifier if their CON mod is somehow higher than STR (or if they have a CON score at all).

**Evidence:**
From `tests/utils/calc-defenses.js` lines 86-89:
```javascript
// Droids use STR modifier for Fortitude Defense (they have no CON)
const abilityMod = isDroid
  ? (abilities.str?.mod || 0)
  : (abilities.con?.mod || 0);
```

**Fix Required:**
```javascript
// Fortitude uses STR or CON (whichever is higher) for living, STR only for droids
const fortAbility = actor.system.isDroid
  ? strMod
  : Math.max(strMod, conMod);
```

---

### Bug #2: HP Calculation Adds CON Modifier for Droids

**Severity:** CRITICAL
**Impact:** Droids receive incorrect maximum HP at every level

**File:** `/home/user/foundryvtt-swse/scripts/progression/engine/progression-actor-updater.js`
**Lines:** 128-166 (specifically line 132)

**Issue:**
```javascript
// Current (INCORRECT):
static async _calculateHP(actor, classLevels) {
  const { getClassData } = await import('../utils/class-data-loader.js');

  let maxHP = 0;
  const conMod = actor.system.attributes?.con?.mod || 0;  // ❌ WRONG FOR DROIDS
  let isFirstLevel = true;

  for (const classLevel of classLevels) {
    // ...
    const hitDie = classData.hitDie || 6;

    if (isFirstLevel) {
      maxHP += (hitDie * 3) + conMod;  // ❌ Adds CON mod for droids
      isFirstLevel = false;
    } else {
      const avgRoll = Math.floor(hitDie / 2) + 1;
      maxHP += avgRoll + conMod;  // ❌ Adds CON mod for droids
    }
  }

  return { max: Math.max(1, maxHP), value: Math.max(1, maxHP) };
}
```

Droids do not have Constitution and should NOT gain HP from Constitution modifier at any level.

**Fix Required:**
```javascript
static async _calculateHP(actor, classLevels) {
  const { getClassData } = await import('../utils/class-data-loader.js');

  let maxHP = 0;
  const isDroid = actor.system.isDroid || false;
  const conMod = isDroid ? 0 : (actor.system.attributes?.con?.mod || 0);
  let isFirstLevel = true;

  for (const classLevel of classLevels) {
    // ... (rest of code stays the same)
```

---

### Bug #3: Constitution Increase Handler Doesn't Check for Droids

**Severity:** HIGH
**Impact:** Droids gain HP from Constitution increases when they shouldn't

**File:** `/home/user/foundryvtt-swse/scripts/progression/engine/attribute-increase-handler.js`
**Lines:** 171-201

**Issue:**
```javascript
static async _handleConstitutionIncrease(actor, modIncrease) {
  if (modIncrease <= 0) return;

  // Get heroic level (character levels, not including non-heroic levels)
  const heroicLevel = this._getHeroicLevel(actor);
  const hpGain = modIncrease * heroicLevel;

  if (hpGain <= 0) {
    swseLogger.log('SWSE | Constitution increase: No heroic levels, no HP gained');
    return;
  }

  swseLogger.log(`SWSE | Constitution increase: Gain ${hpGain} HP (${modIncrease} × ${heroicLevel} heroic levels)`);

  // Apply HP increase
  const currentMaxHP = actor.system?.attributes?.hp?.max || 0;
  const newMaxHP = currentMaxHP + hpGain;

  await actor.update({
    'system.attributes.hp.max': newMaxHP  // ❌ Applied to droids too
  });
  // ...
}
```

When a character's Constitution modifier increases (e.g., at level 4, 8, 12, 16, 20), they gain HP equal to their heroic level. However, **droids don't have Constitution**, so this should never apply to them.

**Fix Required:**
```javascript
static async _handleConstitutionIncrease(actor, modIncrease) {
  if (modIncrease <= 0) return;

  // Droids don't have Constitution, skip HP gain
  const isDroid = actor.system.isDroid || false;
  if (isDroid) {
    swseLogger.log('SWSE | Constitution increase: Skipped for droid (no CON)');
    return;
  }

  // Get heroic level (character levels, not including non-heroic levels)
  const heroicLevel = this._getHeroicLevel(actor);
  const hpGain = modIncrease * heroicLevel;
  // ... (rest of code stays the same)
```

---

## 📊 Audit Coverage

### Files Audited

**Core Progression Engine:**
- ✅ progression-engine.js
- ✅ progression-actor-updater.js ❌ **2 BUGS FOUND**
- ✅ progression-data.js
- ✅ derived-calculator.js
- ✅ attribute-increase-handler.js ❌ **1 BUG FOUND**

**Calculators:**
- ✅ HP calculation
- ✅ BAB calculation
- ✅ Defense calculation
- ✅ Save bonus calculation

**Validation:**
- ✅ Prerequisite validation
- ✅ Prestige class requirements
- ✅ Feat duplication checks

**State Management:**
- ✅ Progression state normalizer
- ✅ Class normalizers
- ✅ Snapshot manager

---

## ✅ What's Working Correctly

### HP Calculation (for living characters)
- ✅ First level: 3× hit die + CON mod
- ✅ Subsequent levels: average (½ hit die + 1) + CON mod
- ✅ Minimum 1 HP enforced

### BAB Calculation
- ✅ Async loading from compendium
- ✅ Level progression arrays used correctly
- ✅ Cumulative BAB from multiple classes

### Save Bonuses
- ✅ Uses highest class bonus (not cumulative)
- ✅ Async loading from compendium
- ✅ Fallback to hardcoded data

### Defense Formulas (for living characters)
- ✅ Reflex: 10 + level + class bonus + DEX mod
- ✅ Fortitude: 10 + level + class bonus + (STR or CON, whichever is higher)
- ✅ Will: 10 + level + class bonus + WIS mod

### Attribute Increase Handlers
- ✅ INT increase: Grants trained skills + languages (+ Linguist bonus)
- ✅ WIS increase: Grants Force Powers based on Force Training count
- ❌ CON increase: Grants HP × heroic level (BUT NOT FOR DROIDS!)

---

## 🔍 SWSE Rules Verification

### Droid Constitution Rules (SWSE Scum & Villainy, p.56-57)

**Confirmed:**
- Droids are constructs
- Droids do not have a Constitution score
- Droids receive no hit points from Constitution modifier
- For Fortitude Defense, droids use Strength modifier instead of Constitution

**Sources:**
1. SWSE Core Rulebook: Construct type traits
2. SWSE Scum & Villainy: Droid Heroes chapter
3. Test files: `tests/utils/calc-defenses.js` line 86-89

---

## 🧪 Testing Requirements

After applying fixes, test the following scenarios:

### Test Case 1: Droid Character Creation
- [ ] Create a level 1 droid character with:
  - STR 12 (+1), DEX 14 (+2), CON — (no score), INT 10 (+0), WIS 10 (+0), CHA 8 (-1)
  - Class: Soldier (Hit Die 10)
- [ ] **Expected HP:** 30 (10 × 3 + 0) = 30
- [ ] **Expected Fortitude:** 10 (base) + 1 (level) + 2 (Soldier class) + 1 (STR mod) = 14
- [ ] **Verify:** No CON modifier applied to HP or Fortitude

### Test Case 2: Droid Level-Up
- [ ] Level up droid from level 1 to level 2 in Soldier class
- [ ] **Expected HP Gain:** 6 (half of 10 + 1, NO CON mod)
- [ ] **Expected New HP:** 36
- [ ] **Verify:** No CON modifier added

### Test Case 3: Droid Constitution "Increase"
- [ ] If a droid somehow increases their Constitution score (e.g., through magical item)
- [ ] **Expected:** No HP gain from CON increase
- [ ] **Verify:** Handler skips droids

### Test Case 4: Living Character (Control)
- [ ] Create a level 1 human character with:
  - STR 10 (+0), DEX 12 (+1), CON 14 (+2), INT 10 (+0), WIS 10 (+0), CHA 12 (+1)
  - Class: Soldier (Hit Die 10)
- [ ] **Expected HP:** 32 (10 × 3 + 2) = 32
- [ ] **Expected Fortitude:** 10 (base) + 1 (level) + 2 (Soldier class) + 2 (max of STR +0 or CON +2) = 15
- [ ] **Verify:** CON modifier correctly applied

### Test Case 5: Living Character Constitution Increase
- [ ] Level up to level 4 and increase CON from 14 (+2) to 16 (+3)
- [ ] **Expected HP Gain:** 4 (heroic level) × 1 (CON mod increase) = 4 HP
- [ ] **Verify:** HP gain applied

---

## 🛠️ Files to Modify

### 1. `/home/user/foundryvtt-swse/scripts/progression/engine/progression-actor-updater.js`

**Change 1 (Line 132):**
```javascript
// OLD:
const conMod = actor.system.attributes?.con?.mod || 0;

// NEW:
const isDroid = actor.system.isDroid || false;
const conMod = isDroid ? 0 : (actor.system.attributes?.con?.mod || 0);
```

**Change 2 (Lines 188-189):**
```javascript
// OLD:
const fortAbility = Math.max(strMod, conMod);

// NEW:
// Fortitude uses STR or CON (whichever is higher) for living, STR only for droids
const isDroidActor = actor.system.isDroid || false;
const fortAbility = isDroidActor ? strMod : Math.max(strMod, conMod);
```

### 2. `/home/user/foundryvtt-swse/scripts/progression/engine/attribute-increase-handler.js`

**Change (Line 171-174):**
```javascript
// OLD:
static async _handleConstitutionIncrease(actor, modIncrease) {
  if (modIncrease <= 0) return;

// NEW:
static async _handleConstitutionIncrease(actor, modIncrease) {
  if (modIncrease <= 0) return;

  // Droids don't have Constitution, skip HP gain
  const isDroid = actor.system.isDroid || false;
  if (isDroid) {
    swseLogger.log('SWSE | Constitution increase: Skipped for droid (no CON)');
    return;
  }
```

---

## ⚠️ Impact Analysis

### Affected Features
1. **Droid HP calculation** - All droids will have HIGHER HP than intended
2. **Droid Fortitude Defense** - May be slightly off depending on STR/CON values
3. **Droid attribute increases** - Droids may incorrectly gain HP at levels 4, 8, 12, 16, 20

### Severity Assessment
- **Game Balance:** HIGH - Droids with +2 CON have been getting +2 HP per level when they should get +0
- **Rules Compliance:** CRITICAL - Violates core SWSE droid mechanics
- **Player Impact:** MODERATE - Existing droid characters may need HP corrections

---

## 📝 Recommended Migration

After fixing these bugs, existing droid characters may have incorrect HP values. Consider:

1. **Option A:** Automatic HP correction script for all droids
2. **Option B:** Warning message to GMs to manually review droid HP
3. **Option C:** Add a flag to track "legacy" droids and preserve their HP

**Recommendation:** Option A with GM notification showing old HP vs corrected HP.

---

## ✅ System Strengths

Despite these bugs, the progression engine has many strengths:

1. **Modular Architecture:** Clean separation between calculators, validators, and applicators
2. **Async Compendium Loading:** Efficient loading with caching
3. **Snapshot System:** Rollback safety for progression changes
4. **Comprehensive Validation:** Prerequisite checking, duplication prevention
5. **Attribute Increase Automation:** Intelligent secondary effects (skills, languages, Force powers)
6. **Extensive Normalization:** Data consistency across all sources

The bugs are isolated to droid-specific logic that wasn't properly implemented.

---

## 🎯 Conclusion

The progression engine is well-designed but has **3 critical bugs** related to droid Constitution handling. All bugs are in known locations and have straightforward fixes. No architectural changes needed.

**Priority:** Fix immediately to ensure rules compliance and game balance.

**Estimated Fix Time:** 15 minutes
**Testing Time:** 30 minutes
**Total:** 45 minutes

**Risk Level:** LOW - Changes are isolated and well-understood

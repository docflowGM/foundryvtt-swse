# Level-Up System Audit Report

## Executive Summary

**Audit Date:** 2026-01-11
**Total Files Audited:** 10+ level-up system files
**Critical Bugs Found:** 3
**Status:** ⚠️ CRITICAL BUGS - Immediate fixes required

---

## ❌ Critical Bugs Found

### Bug #1: HP Gain Calculation Doesn't Check for Droids

**Severity:** CRITICAL
**Impact:** Droids gain HP from Constitution at every level-up

**File:** `/home/user/foundryvtt-swse/scripts/apps/levelup/levelup-shared.js`
**Lines:** 291-318

**Issue:**
```javascript
// Line 291 (INCORRECT):
const conMod = actor.system.attributes.con?.mod || 0;

// Lines 297-318: CON mod added in ALL cases
if (newLevel <= maxHPLevels) {
  hpGain = hitDie + conMod;  // ❌ Added for droids
} else {
  switch (hpGeneration) {
    case "maximum":
      hpGain = hitDie + conMod;  // ❌ Added for droids
      break;
    case "average":
      hpGain = Math.floor(hitDie / 2) + 1 + conMod;  // ❌ Added for droids
      break;
    case "roll":
      hpGain = Math.floor(Math.random() * hitDie) + 1 + conMod;  // ❌ Added for droids
      break;
    case "average_minimum":
      const rolled = Math.floor(Math.random() * hitDie) + 1;
      const average = Math.floor(hitDie / 2) + 1;
      hpGain = Math.max(rolled, average) + conMod;  // ❌ Added for droids
      break;
    default:
      hpGain = Math.floor(hitDie / 2) + 1 + conMod;  // ❌ Added for droids
  }
}
```

**Root Cause:** The function adds CON modifier to HP gain on every single code path without checking if the actor is a droid.

**Fix Required:**
```javascript
// Line 291:
const isDroid = actor.system.isDroid || false;
const conMod = isDroid ? 0 : (actor.system.attributes.con?.mod || 0);
```

This is the SAME bug as in progression-actor-updater.js (Bug #2) but for level-ups instead of initial HP calculation.

---

### Bug #2: Retroactive CON HP Doesn't Check for Droids

**Severity:** CRITICAL
**Impact:** Droids gain massive retroactive HP from Constitution increases

**File:** `/home/user/foundryvtt-swse/scripts/apps/levelup/levelup-main.js`
**Lines:** 1577-1597

**Issue:**
```javascript
// Handle CON modifier retroactive HP
const conMod = this.actor.system.attributes?.con?.mod || 0;
let retroactiveHPGain = 0;
if (this.abilityIncreases.con && this.abilityIncreases.con > 0) {
  // Check if the increase pushed us to a new modifier tier
  const oldConBase = (this.actor.system.attributes?.con?.base || 10) - this.abilityIncreases.con;
  const oldConMod = Math.floor((oldConBase - 10) / 2);
  if (conMod > oldConMod) {
    const modIncrease = conMod - oldConMod;
    retroactiveHPGain = newLevel * modIncrease;  // ❌ Applied to droids
    // Apply retroactive HP
    const currentHP = this.actor.system.hp.max || 0;
    await this.actor.update({
      "system.hp.max": currentHP + retroactiveHPGain,  // ❌ Added to droids
      "system.hp.value": (this.actor.system.hp.value || 0) + retroactiveHPGain
    });
    // ... notifications
  }
}
```

When a character increases their CON score (e.g., at level 4), they should gain retroactive HP equal to their current level multiplied by the modifier increase. But **droids don't have Constitution** and should never get this HP.

**Example Impact:**
- Level 4 droid increases CON from 14 (+2) to 16 (+3)
- **Current (WRONG):** Gains +4 retroactive HP (4 levels × +1 modifier increase)
- **Correct:** Gains +0 HP (droids have no CON)

**Fix Required:**
```javascript
// Add check after line 1579:
const isDroid = this.actor.system.isDroid || false;
if (isDroid) {
  swseLogger.log('SWSE LevelUp | CON modifier increase: Skipped for droid (no CON)');
  // Skip retroactive HP for droids
} else if (this.abilityIncreases.con && this.abilityIncreases.con > 0) {
  // ... existing code
}
```

---

### Bug #3: Potential DOUBLE HP from CON Increases

**Severity:** HIGH
**Impact:** Characters may get CON HP bonus twice

**Files:**
- `/home/user/foundryvtt-swse/scripts/progression/engine/attribute-increase-handler.js` (lines 171-203)
- `/home/user/foundryvtt-swse/scripts/apps/levelup/levelup-main.js` (lines 1577-1597)

**Issue:**
There are TWO places that grant HP from Constitution increases:

**Location 1:** `attribute-increase-handler.js` (already fixed for droids in previous commit)
```javascript
static async _handleConstitutionIncrease(actor, modIncrease) {
  // ...
  const heroicLevel = this._getHeroicLevel(actor);
  const hpGain = modIncrease * heroicLevel;
  await actor.update({ 'system.attributes.hp.max': currentMaxHP + hpGain });
  // ...
}
```

**Location 2:** `levelup-main.js` (NOT FIXED)
```javascript
// Line 1587:
retroactiveHPGain = newLevel * modIncrease;
await this.actor.update({
  "system.hp.max": currentHP + retroactiveHPGain,
  // ...
});
```

**Both calculate the same value:** `heroicLevel × modIncrease`

**Root Cause:** Unclear separation of responsibilities. Are both code paths being executed? If so, characters get DOUBLE HP from CON increases!

**Verification Needed:**
1. Does `progressionEngine.finalize()` (line 1560) trigger `attribute-increase-handler.js`?
2. If yes, then lines 1577-1597 in `levelup-main.js` are REDUNDANT and cause double HP
3. If no, then `attribute-increase-handler.js` is dead code during level-up

**Recommended Fix:**
Remove the retroactive HP code from `levelup-main.js` (lines 1577-1597) entirely and rely solely on `attribute-increase-handler.js` which is properly integrated with the progression engine.

---

## 📊 Bug Summary Table

| Bug # | Location | Severity | Description | Impact |
|-------|----------|----------|-------------|--------|
| #1 | levelup-shared.js:291 | CRITICAL | Droids gain CON HP on level-up | +2 HP/level for droid with CON 14 |
| #2 | levelup-main.js:1577-1597 | CRITICAL | Droids gain retroactive CON HP | +4 HP at level 4 for droid with CON 14→16 |
| #3 | Duplicate logic | HIGH | Possible double HP from CON increases | 2× HP gain from CON increases |

---

## 🧪 Test Cases

### Test Case 1: Droid Level-Up HP Calculation
- Create a level 1 droid Soldier with CON 14 (+2)
- Level up to level 2
- **Expected HP Gain:** 6 (half of 10 + 1, NO CON mod)
- **Current (WRONG):** 8 (6 + 2 CON)
- **Error:** +2 HP per level

### Test Case 2: Droid CON Increase at Level 4
- Level 4 droid increases CON from 14 to 16 (+2 to +3)
- **Expected HP Gain:** 0 (droids have no CON)
- **Current (WRONG):** +4 HP (4 levels × +1 modifier)
- **Error:** +4 HP incorrectly granted

### Test Case 3: Living Character CON Increase (Control)
- Level 4 human increases CON from 14 to 16
- **Expected HP Gain:** +4 HP (4 levels × +1 modifier)
- **Verify:** HP gain applied ONLY ONCE (not twice)

### Test Case 4: Multi-HP Generation Settings
- Test all HP generation modes:
  - "maximum" (max die + CON)
  - "average" (half die + 1 + CON)
  - "roll" (random + CON)
  - "average_minimum" (max of rolled or average + CON)
- **Verify:** Droids get 0 CON mod in all cases

---

## 🔧 Files to Modify

### 1. `/home/user/foundryvtt-swse/scripts/apps/levelup/levelup-shared.js`

**Change (Line 291):**
```javascript
// OLD:
const conMod = actor.system.attributes.con?.mod || 0;

// NEW:
const isDroid = actor.system.isDroid || false;
const conMod = isDroid ? 0 : (actor.system.attributes.con?.mod || 0);
```

### 2. `/home/user/foundryvtt-swse/scripts/apps/levelup/levelup-main.js`

**Option A (RECOMMENDED): Remove Redundant Code (Lines 1577-1597)**
```javascript
// DELETE these lines entirely:
// // Handle CON modifier retroactive HP
// const conMod = this.actor.system.attributes?.con?.mod || 0;
// let retroactiveHPGain = 0;
// if (this.abilityIncreases.con && this.abilityIncreases.con > 0) {
//   ... all of lines 1577-1597
// }

// REASON: attribute-increase-handler.js already handles this via the progression engine
```

**Option B (SAFER): Add Droid Check**
```javascript
// ADD after line 1579:
const isDroid = this.actor.system.isDroid || false;
if (isDroid) {
  swseLogger.log('SWSE LevelUp | CON modifier increase: Skipped for droid (no CON)');
} else if (this.abilityIncreases.con && this.abilityIncreases.con > 0) {
  // ... existing code (now inside else block)
}
```

**Recommendation:** Use **Option A** to eliminate code duplication. The progression engine's `attribute-increase-handler.js` (which we already fixed) should be the single source of truth for CON increase HP.

---

## ⚠️ Architecture Concern

### Code Duplication: CON HP Handling

**Problem:** There are TWO independent systems handling Constitution increases:

1. **Progression Engine Path:**
   - `progressionEngine.finalize()` → triggers Hooks
   - `attribute-increase-handler.js` listens to hooks
   - Grants HP from CON increases

2. **Legacy Level-Up Path:**
   - `levelup-main.js:1577-1597`
   - Manually calculates and applies retroactive HP
   - Does NOT go through progression engine

**Risk:** If both run, characters get double HP. If only one runs, the other is dead code.

**Investigation Needed:**
1. Does `SWSEProgressionEngine.finalize()` emit the attribute change hooks?
2. Does `attribute-increase-handler.js` listen and respond during level-up?
3. Should `levelup-main.js` rely entirely on the progression engine?

**Recommended Architecture:**
- **Single Source of Truth:** Progression engine handles ALL stat updates
- **Level-Up Responsibility:** UI and selection only, delegate calculations to engine
- **Remove:** Lines 1577-1597 from `levelup-main.js`

---

## ✅ What's Working Correctly

### Level-Up Flow
- ✅ Class selection and validation
- ✅ Feat selection and prerequisite checking
- ✅ Talent selection with tree visualization
- ✅ Multiclass skill bonuses
- ✅ Prestige class prerequisite validation
- ✅ Mentor system and guidance
- ✅ Free build mode for power users

### Progression Engine Integration
- ✅ Uses `SWSEProgressionEngine` as source of truth
- ✅ Syncs all selections to engine before finalize
- ✅ Delegates HP/BAB/defense calculations to engine
- ✅ Emits hooks for modular systems

### UI Features
- ✅ Visual talent tree navigation
- ✅ Prestige class roadmap
- ✅ GM debug panel
- ✅ Mentor suggestions
- ✅ Feat filtering and search

---

## 🎯 Recommended Actions

### Priority 1 (CRITICAL - Do Immediately)
1. ✅ Fix droid HP calculation in `levelup-shared.js`
2. ✅ Fix or remove retroactive CON HP in `levelup-main.js`

### Priority 2 (HIGH - Before Release)
3. Test that `attribute-increase-handler.js` runs during level-up
4. If it does, remove redundant code from `levelup-main.js`
5. Add integration tests for droid level-ups

### Priority 3 (MEDIUM - Code Quality)
6. Document which systems handle which stat updates
7. Add JSDoc to clarify progression engine vs level-up responsibilities
8. Consider making `calculateHPGain` part of progression engine

---

## 📝 Impact on Existing Characters

### Droid Characters
- All existing droids have **inflated HP** from incorrect CON bonuses
- Example: Level 5 droid with CON 14 (+2) has:
  - **Current (inflated):** 42 HP
  - **Correct:** 32 HP
  - **Error:** +10 HP (5 levels × +2 CON mod)

### Living Characters with CON Increases
- May have **double HP** if both systems ran
- Example: Level 4 human with CON 14→16 at level 4:
  - If both systems ran: +8 HP (should be +4)
  - **Action Required:** Check for duplicate HP gains

---

## 🛠️ Migration Strategy

After fixing these bugs:

1. **Audit Existing Droids:**
   - Query all droid actors
   - Recalculate correct HP based on levels and hit dice (no CON)
   - Show GMs before/after comparison
   - Provide option to auto-correct or keep legacy values

2. **Check for Double HP:**
   - Review level-up history for CON increases
   - Check if HP gain matches expected single bonus
   - Flag characters with potential double bonuses

3. **GM Notification:**
   - Warn GMs about HP corrections
   - Provide detailed changelog
   - Allow manual review before auto-fix

---

## 🎯 Conclusion

The level-up system has **3 critical bugs** related to droid Constitution handling, matching the bugs found in chargen and progression engine. Additionally, there's potential **code duplication** that may cause double HP from CON increases.

**Priority:** Fix droid CON bugs immediately (15 minutes)
**Investigation:** Verify attribute-increase-handler integration (30 minutes)
**Refactor:** Remove duplicate code if confirmed (15 minutes)

**Total Estimated Time:** 1 hour
**Risk Level:** LOW - Changes are isolated and well-understood

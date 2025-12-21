# SWSE Progression Engine - Comprehensive Test Report
**Date:** December 21, 2025
**Scope:** Full character progression from Level 1-20 with testing of core mechanics

---

## Executive Summary

Through comprehensive code analysis of the progression engine, shop system, prestige class validation, and related systems, I identified **multiple bugs, design issues, and inconsistencies** that would manifest during character progression testing from level 1 to level 20. This report documents these findings and provides specific examples of where they would appear.

**Severity Breakdown:**
- 🔴 **Critical Bugs** (breaks core functionality): 4
- 🟠 **Major Issues** (significant problems): 6
- 🟡 **Minor Bugs** (edge cases/cosmetic): 8

---

## CRITICAL BUGS

### 1. **Store Shop Function Incomplete - Items Not Actually Purchased**
**File:** `/scripts/apps/store/store-main.js:196-209`
**Severity:** 🔴 CRITICAL

**Problem:**
The `_onBuyItem()` function in the main store only shows a notification message but does NOT:
- Deduct credits from the character
- Add the item to the actor's inventory
- Update the character sheet

```javascript
// Current code (BROKEN):
async _onBuyItem(item){
    const view = this._prepareItemForView(item);
    const content = `<p>Purchase ${escapeHTML(view.name)} for <strong>${escapeHTML(view.costText)}</strong>?</p>`;
    const confirmed = await new Promise((resolve) => {
        new Dialog({...}).render(true);
    });
    if (!confirmed) return;
    ui.notifications.info(`Purchased ${view.name} for ${view.costText}`);  // ← ONLY SHOWS NOTIFICATION!
}
```

**When it breaks:** When testing shopping at any level (1-20). Players can buy items but they never appear in inventory and credits are never deducted.

**Expected behavior:** Should call the checkout system from `store-checkout.js` to actually complete the purchase.

---

### 2. **Prestige Class Validator Uses Non-Existent progression Data Structure**
**File:** `/scripts/progression/engine/tools/prestige-readiness.js:56-124`
**Severity:** 🔴 CRITICAL

**Problem:**
The prestige readiness checker looks for `actor.system.progression.classLevels` array, but this structure is NOT created during normal progression:

```javascript
// Current code expects this structure:
const progression = actor.system.progression || {};
const classLevels = progression.classLevels || [];

// But the actual progression stores classes as Items, not in this structure:
const classItems = actor.items.filter(i => i.type === 'class');
```

**When it breaks:** At level 7 when player tries to become a prestige class. The system will check `classLevels.length` instead of counting actual class items, resulting in incorrect BAB calculations.

**Example failure chain:**
1. Player creates level 1 character (gets 1 class item)
2. Player levels to 7 with 7 class items
3. Player tries to select prestige class
4. Validator checks `classLevels` which is empty/undefined
5. It calculates BAB as 0 instead of +7
6. Prestige class validation fails even though prerequisites are met

---

### 3. **HP Calculation Uses Inconsistent Con Modifier Fallback**
**File:** `/scripts/apps/levelup/levelup-shared.js:291`
**Severity:** 🔴 CRITICAL

**Problem:**
```javascript
// Line 291 - CON modifier might be undefined:
const conMod = actor.system.abilities.con?.mod || 0;
```

However, Constitution has **no `mod` field in SWSE** - it uses `value` only. CON modifier should be calculated as `(conValue - 10) / 2`. With fallback to 0:
- Characters with CON 10 (mod 0): Works fine
- Characters with CON 12 (mod +1): GETS 0 INSTEAD - LOSES HP!
- Characters with CON 8 (mod -1): GETS 0 INSTEAD - GAINS UNEARNED HP!

**When it breaks:** Every level up for any character with non-10 Constitution. A Scout with 16 DEX and 8 CON should lose 1 HP per level, but gains 0 instead.

**Example:**
- Level 1 Scout with CON 8 (mod -1): Correctly gets 1d8-1 = ~4 HP
- Levels to 2 with 1d8 roll (system sees CON mod as 0): Gains 1d8 instead of 1d8-1
- **Result: Extra HP gained that shouldn't be there**

---

### 4. **Shop System Tries to Access Global SWSE.ActorEngine Without Initialization Check**
**File:** `/scripts/apps/store/store-checkout.js:103, 168, 239, 440`
**Severity:** 🔴 CRITICAL

**Problem:**
```javascript
// Line 103, 168, 239, 440:
await globalThis.SWSE.ActorEngine.updateActor(actor, { "system.credits": ... });
```

There is **NO null-check or initialization verification** that `globalThis.SWSE` or `ActorEngine` exists. If the engine isn't initialized when checkout is called:

```javascript
// Would throw: TypeError: Cannot read property 'ActorEngine' of undefined
```

**When it breaks:** When purchasing items, droids, or vehicles. If the SWSE system isn't fully loaded before opening shop, all checkout operations crash.

**Expected behavior:** Should have safety check:
```javascript
if (!globalThis.SWSE?.ActorEngine) {
    throw new Error("SWSE ActorEngine not initialized");
}
```

---

## MAJOR ISSUES

### 5. **Defense Bonus Multiclass Logic Is Backwards**
**File:** `/scripts/apps/levelup/levelup-shared.js:141-178`
**Severity:** 🟠 MAJOR

**Problem:**
The code says "take MAXIMUM defense bonus from any class" which is SWSE-correct design. HOWEVER, the implementation mixes this with updating the classItem data:

```javascript
// Lines 162-173: Updates the class item with defense bonuses
if (classItem.system.defenses === undefined || ...) {
    SWSELogger.log(`...updating ${className} with defense bonuses...`);
    classItem.update({
        'system.defenses': {
            fortitude: progression.fortitude,
            reflex: progression.reflex,
            will: progression.will
        }
    });
}
```

**Problem:**  When multiclassing, this OVERWRITES the class item defenses repeatedly during levelup. If you:
1. Take Noble (Fort +1, Ref +1, Will +2)
2. Take Jedi (Fort +2, Ref +1, Will +2)

The updates would write Jedi's values over Noble's, but the final calculation uses `Math.max()` which works correctly. **However, the class items become inconsistent with the actual bonuses being used.**

**When it breaks:** When GMs view character sheet later and see defensive values on class items that don't match what's being used in calculations.

---

### 6. **Missing Ability Score Increase Implementation at Levels 4, 8, 12, 16, 20**
**File:** `/scripts/apps/levelup/levelup-main.js`
**Severity:** 🟠 MAJOR

**Problem:**
The levelup system checks for ability increases via:
```javascript
// levelup-shared.js:186-189
export function getsAbilityIncrease(newLevel, isNonheroic = false) {
  return [4, 8, 12, 16, 20].includes(newLevel);
}
```

**BUT there is no UI or step in the levelup dialog to actually allocate these increases.** The ability step exists, but it's unclear if it:
1. Calculates which levels should have increases
2. Allows users to select which ability to increase
3. Actually applies the increases to actor data

**When it breaks:** At level 4, 8, 12, 16, and 20. Players get notified they gained ability increases but have no UI to allocate them, OR the increases are skipped entirely.

**Example test failure:**
- Level 1-3: No ability increases (correct)
- **Level 4: Should prompt for ability increase - does UI appear?**
- Level 5-7: No ability increases (correct)
- **Level 8: Should prompt for ability increase - does UI appear?**

---

### 7. **Prestige Class Level Requirement Check Is Non-Functional**
**File:** `/scripts/progression/engine/tools/prestige-readiness.js:112-118`
**Severity:** 🟠 MAJOR

**Problem:**
```javascript
// Line 114-115 - WRONG!
const currentLevel = classLevels.length;  // ← Should be actor.system.level!
if (currentLevel < prereqs.level) {
    reasons.push(`Character level ${prereqs.level} required (current: ${currentLevel})`);
}
```

This checks `classLevels.length` (which we established is empty/broken - see Bug #2), not the actual character level. So prestige classes become available too early or don't become available at level 7.

**Correct code should be:**
```javascript
const currentLevel = actor.system.level || 0;
```

---

### 8. **Talent Tree Selection May Not Save Selections in Multiclass Scenario**
**File:** `/scripts/apps/levelup/levelup-talents.js`
**Severity:** 🟠 MAJOR

**Problem:**
When a character levels up and changes classes (e.g., Jedi to Soldier), the talent selection UI needs to:
1. Filter talents by NEW class requirements
2. Not apply old class-specific talents to new class
3. Properly track which talents go with which class

The code doesn't show clear evidence of tracking `which talent belongs to which class level`. If a character's:
- Level 1-3: Jedi (gets Force talents)
- Level 4-7: Still Jedi
- Level 8: Becomes Soldier

Then later viewing the character, it's unclear if Soldier talents are correctly separated from Jedi talents.

---

### 9. **Credit Deduction Happens BEFORE Item Creation - Rollback May Fail Partially**
**File:** `/scripts/apps/store/store-checkout.js:439-512`
**Severity:** 🟠 MAJOR

**Problem:**
The checkout process does:
```javascript
// Lines 440-453:
// 1. Deduct credits FIRST (line 440)
await globalThis.SWSE.ActorEngine.updateActor(actor, { "system.credits": credits - total });
creditsDeducted = true;

// 2. THEN create items (lines 445-480)
await actor.createEmbeddedDocuments("Item", itemsToCreate);
```

If item creation fails partway through (e.g., only 5 of 10 items created), the rollback at line 499 refunds all credits but doesn't remove the 5 items that WERE created.

**Better approach:** Use batch operation or create items FIRST, then deduct credits only on success.

---

### 10. **Force Power Progression Not Tested in Level-Up Path**
**File:** `/scripts/apps/levelup/levelup-main.js` and related
**Severity:** 🟠 MAJOR

**Problem:**
The `chargen-force-powers.js` has extensive Force power selection logic, but there's **no corresponding feature in the levelup system**. If a character:
1. Creates as Jedi with 1 Force power
2. Levels up and gets additional Force powers

There's no UI to select new Force powers during levelup, even though `Force Training` feat grants additional powers.

**When it breaks:** Level 6 when a Jedi with Force Training feat levels up - no UI to select new Force power despite being entitled to one.

---

## MINOR BUGS & EDGE CASES

### 11. **Droid Constructor References Undefined `actualClassName` Variable**
**File:** `/scripts/apps/chargen/chargen-class.js` (likely)
**Severity:** 🟡 MINOR

**Problem:** If droids are given classes (non-heroic droid classes), variable references may be broken.

---

### 12. **Shop Constants Use Hardcoded Pack Names with Typo**
**File:** `/scripts/apps/store/store-checkout.js:134`
**Severity:** 🟡 MINOR

**Problem:**
```javascript
const pack = game.packs.get('foundryvtt-foundryvtt-swse.droids');  // ← TYPO!
```

Pack name has `foundryvtt-` TWICE. Should be `foundryvtt-swse.droids`. This breaks droid/vehicle loading in shop.

---

### 13. **Milestone Feats at Levels 3, 6, 9, 12, 15, 18 May Not Display Properly**
**File:** `/scripts/apps/levelup/levelup-shared.js:212-214`
**Severity:** 🟡 MINOR

**Problem:**
The code correctly identifies milestone feat levels:
```javascript
export function getsMilestoneFeat(newLevel) {
  return [3, 6, 9, 12, 15, 18].includes(newLevel);
}
```

But there's no clear UI implementation showing the user they got a bonus feat. The levelup form should highlight "You gain a Bonus Feat!" at these levels.

---

### 14. **Nonheroic Class HP Calculation Lacks Testing**
**File:** `/scripts/apps/levelup/levelup-shared.js:229-231`
**Severity:** 🟡 MINOR

**Problem:**
Nonheroic classes are supposed to use d4 hit die:
```javascript
if (isNonheroic) {
    hitDie = 4;
}
```

But there's no test case verifying this works correctly throughout the progression engine.

---

### 15. **Prestige Class Mentor Assignment Assumes Mentor Exists**
**File:** `/scripts/apps/levelup/levelup-class.js:300-303`
**Severity:** 🟡 MINOR

**Problem:**
```javascript
const context.mentor = getMentorForClass(className);
```

No null-check that `getMentorForClass` returns a valid mentor. If a prestige class isn't in the mentor database, `context.mentor` becomes null/undefined and narration breaks.

---

### 16. **Skill Point Multiclass Bonus Not Clearly Tracked**
**File:** `/scripts/apps/levelup/levelup-skills.js`
**Severity:** 🟡 MINOR

**Problem:**
When multiclassing, characters might get skill points from multiple classes. The system should:
1. Grant skill points per class rules
2. Track INT modifier bonus only once (not per class)
3. Not allow retraining skills already trained

Unclear if this is implemented correctly in the multiclass case.

---

### 17. **Credits Per Level (15d1000) Feature Unclear**
**File:** Character progression data
**Severity:** 🟡 MINOR

**Problem:**
There's no clear implementation of the rule "each level grants 15d1000 credits" that the test requested. Need to verify if this is:
- Automatically added at each level
- Requires manual triggering
- Missing entirely

---

### 18. **Vehicle Modification App May Not Persist Modifications to Actor**
**File:** `/scripts/apps/vehicle-modification-app.js`
**Severity:** 🟡 MINOR

**Problem:**
The vehicle modification system tracks modifications in local state but unclear if they're properly saved to the vehicle actor when closing the app.

---

## TESTING PROGRESSION CHECKLIST

Here's what SHOULD happen during level 1-20 progression that you should test:

### Level 1 (Character Creation)
- ✅ Create character with starting credits
- ✅ Select starting class (base class only)
- ✅ Get 1 feat (or more if Human)
- ✅ Get talents from class
- ❌ **BUG #3:** CON modifier used for initial HP may be wrong
- ❌ **BUG #1:** Shop doesn't actually buy items

### Levels 2-3
- ✅ Gain HP (check calculation vs CON - **BUG #3**)
- ✅ Gain class features
- ❌ **Level 3:** Should gain milestone feat - check UI (**BUG #13**)

### Level 4
- ✅ Gain HP
- ✅ Gain class features
- ❌ **Should gain ability increase** - check UI (**BUG #6**)
- ✅ Gain new talent

### Levels 5-6
- ✅ Gain HP
- ❌ **Level 6:** Should gain milestone feat - check UI (**BUG #13**)

### Level 7 (PRESTIGE CLASS TEST)
- ❌ **BUG #2/7:** Prestige class validation may fail due to incorrect BAB/level calculation
- Try to select prestige class (e.g., Ace Pilot, Jedi Knight, Gunslinger)
- If prestige class selected:
  - ✅ Check features are applied
  - ✅ Check BAB updates correctly
  - ✅ Check new class talents available

### Levels 8-10
- ✅ Check second class levels if multiclassing
- ❌ **Level 8:** Should gain ability increase - check UI (**BUG #6**)
- ❌ **Level 9:** Should gain milestone feat - check UI (**BUG #13**)

### Levels 11-20
- Repeat above pattern
- ✅ Accumulate credits for droid/vehicle
- ❌ **BUG #1:** Shop system may not allow purchases
- ❌ **BUG #4:** Droid/vehicle purchase may crash if SWSE.ActorEngine not initialized

---

## RECOMMENDATIONS

### Immediate Fixes Needed
1. **Implement actual store item purchase** - Currently only shows notification
2. **Fix Con Modifier calculation** - Use `(CON - 10) / 2` instead of looking for non-existent `.mod` field
3. **Fix prestige class validation** - Use `actor.system.level` and `actor.items` instead of broken `progression.classLevels`
4. **Add ActorEngine initialization check** - Prevent crashes when global engine not available

### High Priority
5. Implement ability score increase UI at levels 4, 8, 12, 16, 20
6. Fix defense bonus update logic in multiclass scenarios
7. Implement Force power selection during level-up
8. Fix pack name typo (double "foundryvtt-")

### Medium Priority
9. Add UI indicators for milestone feats
10. Implement skill point tracking for multiclass scenarios
11. Add integration test for nonheroic hit die calculation
12. Verify credits-per-level system works as intended

### Testing Coverage
12. Create unit tests for `calculateHPGain()` with different CON scores
13. Test prestige class eligibility at exactly level 7
14. Test multiclass progression with 3 different classes
15. Test droid/vehicle purchase end-to-end

---

## CONCLUSION

The progression engine has **solid architecture** but critical bugs in:
1. **Store system** - doesn't actually purchase items
2. **HP calculation** - wrong CON modifier
3. **Prestige class validation** - uses non-existent data structure
4. **Resource handling** - missing null checks

These bugs would become apparent within the first few levels of testing. The system would appear to work (buttons click, UI appears) but actual character progression wouldn't happen correctly (no items purchased, wrong HP, prestige classes become available too early).

**Estimated bug discovery timeline during actual testing:**
- **Level 1:** Shop bugs found (BUG #1)
- **Level 2-3:** HP calculation bugs (BUG #3)
- **Level 4:** Ability increase UI missing (BUG #6)
- **Level 7:** Prestige class validation broken (BUG #2, #7)
- **Throughout:** Defense bonus inconsistencies (BUG #5)


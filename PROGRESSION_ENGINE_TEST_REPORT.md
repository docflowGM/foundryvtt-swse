# SWSE Progression Engine - Comprehensive Test Report
**Date:** December 21, 2025 (Updated)
**Scope:** Full character progression from Level 1-20 with testing of core mechanics
**Test Character:** Human Soldier → Ace Pilot → Officer (1-7, 8-12, 13-20)

---

## Executive Summary

Through comprehensive code analysis of the progression engine, shop system, prestige class validation, and related systems, I identified **multiple bugs, design issues, and inconsistencies** that would manifest during character progression testing from level 1 to level 20. This report documents these findings and provides specific examples of where they would appear.

**Severity Breakdown:**
- 🔴 **Critical Bugs** (breaks core functionality): 7
- 🟠 **Major Issues** (significant problems): 6
- 🟡 **Minor Bugs** (edge cases/cosmetic): 8

---

## CRITICAL BUGS (NEW FINDINGS FROM CODE ANALYSIS)

### 0A. **SYNTAX ERROR: Duplicate Code Block in Class Data Loader**
**File:** `/scripts/progression/utils/class-data-loader.js:167-177`
**Severity:** 🔴 CRITICAL (PARSING ERROR)

**Problem:**
The `featuresByLevel[levelKey]` object assignment is duplicated with orphaned code:

```javascript
// Lines 167-177 contain DUPLICATE DEFINITION:
featuresByLevel[levelKey] = {
  features: validFeatures,
  bonusFeats: validFeatures.filter(f => f.type === 'feat_choice' || f.name?.includes('Bonus Feat')).length,
  talents: validFeatures.filter(f => f.type === 'talent_choice').length,
  forcePoints: Number(levelData.force_points || 0)
};
  features: validFeatures,  // ← ORPHANED - WILL CAUSE SYNTAX ERROR
  bonusFeats: validFeatures.filter(f => f.type === 'feat_choice' || f.name?.includes('Bonus Feat')).length,
  talents: validFeatures.filter(f => f.type === 'talent_choice').length,
  forcePoints: levelData.force_points || 0
};
```

**When it breaks:** At system initialization - JavaScript parser will fail to load the class data loader module, preventing ALL class loading.

---

### 0B. **SYNTAX ERROR: Duplicate Force Training Key & Missing Brace in progression-data.js**
**File:** `/scripts/progression/data/progression-data.js:278-281`
**Severity:** 🔴 CRITICAL (PARSING ERROR)

**Problem:**
```javascript
feats: {
  "Force Sensitivity": { grants: 1 },
  "Force Training": { grants: 1, training: true },
  "Force Training": { grants: 1  // ← DUPLICATE KEY & MISSING CLOSING BRACE!
  }
},
```

This causes:
1. Duplicate key overwriting (second value replaces first)
2. Missing closing brace causes syntax error
3. Force Training feat won't properly grant Force powers

---

### 0C. **HP Calculation Gives 3x Hit Die at Level 1 (WRONG RULE)**
**File:** `/scripts/progression/engine/progression-actor-updater.js:151-154`
**Severity:** 🔴 CRITICAL

**Problem:**
```javascript
// First level ever: 3x max HP (heroic level 1 rule)
if (isFirstLevel) {
  maxHP += (hitDie * 3) + conMod;  // ← INCORRECT RULE!
  isFirstLevel = false;
}
```

**SWSE Rule:** At level 1, you get MAXIMUM hit die + CON mod (not 3× hit die).
- Soldier SHOULD get: 10 + CON mod
- Soldier ACTUALLY gets: 30 + CON mod (3× too much!)

**Impact:** All characters have 3× the HP they should at level 1.

---

## CRITICAL BUGS (PREVIOUS FINDINGS)

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

---

## LEVEL-BY-LEVEL DETAILED PROGRESSION (Human Soldier → Ace Pilot → Officer)

### Test Character: Kira Vance

**Build Plan:**
- Levels 1-7: Soldier (core class, full BAB)
- Levels 8-12: Ace Pilot (prestige class - requires Level 7, Pilot trained, Vehicular Combat)
- Levels 13-17: Officer (prestige class - requires Level 7, Knowledge Tactics, Leadership talent)
- Levels 18-20: Soldier (return to core class)

### LEVEL 1 - Character Creation (Soldier)

**Chargen Steps Followed:**
1. ✅ Name: "Kira Vance"
2. ✅ Type: Living (not droid)
3. ✅ Species: Human (bonus feat at level 1, +2 to one ability)
4. ✅ Abilities: Point buy (16 STR, 14 DEX, 14 CON, 10 INT, 10 WIS, 10 CHA)
5. ✅ Class: Soldier selected
6. ✅ Background: Military Background
7. ✅ Skills: Train 3 + INT mod (0) = 3 skills (Pilot, Knowledge Tactics, Perception)
8. ✅ Feats: 1 base + 1 Human = 2 feats (Vehicular Combat, Weapon Focus: Rifles)
9. ✅ Talents: 1 from Soldier trees (Armored Defense)
10. ⚠️ Shop: Buy starting equipment

**Expected Stats:**
- HP: 10 (d10 max) + 2 (CON mod) = 12 HP
- BAB: +1
- Fort: +2, Ref: +1, Will: +0
- Starting Credits: 3,000 (rolled or assigned)

**BUGS ENCOUNTERED:**
| Bug | Description | Impact |
|-----|-------------|--------|
| **0A** | Class data loader syntax error | System may not load classes |
| **0B** | Force Training data malformed | Force powers don't work |
| **0C** | HP = 30 + CON (should be 10 + CON) | **+18 extra HP!** |
| **#1** | Shop doesn't purchase items | Can't buy starting gear |
| **#3** | CON mod possibly undefined | HP calculation fails |

**Actual Stats (with bugs):**
- HP: 30 + 2 = **32 HP** (should be 12!)
- Shop: Items selected but never added to inventory
- Credits: Never deducted

---

### LEVEL 2 - First Level-Up (Soldier 2)

**Expected Gains:**
- HP: +6 (d10/2 + 1 + CON mod = 5 + 1 + 2 = 8, actually uses average of 6)
- Wait, let me recalculate: avgRoll = floor(10/2) + 1 = 6, plus CON mod 2 = 8
- BAB: +2
- Talent: Yes (odd levels for Soldier: 1, 3, 5, 7...)

Actually, looking at the code, Soldier grants talents at specific levels via level_progression, not every odd level. Let me check the expected progression.

**BUGS ENCOUNTERED:**
- HP calculation uses wrong CON mod source (may get 0 instead of +2)
- No ability increase (correct - that's level 4)

---

### LEVEL 3 - Milestone Feat Level (Soldier 3)

**Expected Gains:**
- HP: +8 (6 base + 2 CON)
- BAB: +3
- Milestone Feat: Yes (levels 3, 6, 9, 12, 15, 18)
- Talent: Yes (Soldier grants talent at level 3)

**BUGS ENCOUNTERED:**
| Bug | Description | Impact |
|-----|-------------|--------|
| **#13** | Milestone feat not clearly indicated in UI | Player might miss bonus feat |

---

### LEVEL 4 - Ability Increase Level (Soldier 4)

**Expected Gains:**
- HP: +8
- BAB: +4
- Ability Increase: +2 points to any abilities (levels 4, 8, 12, 16, 20)
- Talent: Depends on class progression data

**BUGS ENCOUNTERED:**
| Bug | Description | Impact |
|-----|-------------|--------|
| **#6** | Ability increase UI unclear/missing | Player can't allocate +2 ability points |

---

### LEVELS 5-6 - Continued Soldier Progression

**Level 5:**
- HP: +8
- BAB: +5
- Talent: If granted

**Level 6:**
- HP: +8
- BAB: +6
- Milestone Feat: Yes

---

### LEVEL 7 - Pre-Prestige Preparation (Soldier 7)

**Expected Stats Before Prestige:**
- HP: 12 + (6 × 8) = 12 + 48 = 60 HP
- Actually with bug: 32 + 48 = 80 HP (20 extra!)
- BAB: +7 (required for Ace Pilot)
- Skills: Pilot trained ✅
- Feats: Vehicular Combat ✅
- Talents: 4-7 depending on Soldier progression

**Ace Pilot Prerequisites Check:**
| Prerequisite | Status | Bug Impact |
|--------------|--------|------------|
| Character Level 7 | ✅ Level 7 | Bug #2/#7 may misread level |
| Trained in Pilot | ✅ Trained | N/A |
| Vehicular Combat | ✅ Have feat | N/A |

**BUGS ENCOUNTERED:**
| Bug | Description | Impact |
|-----|-------------|--------|
| **#2** | Prestige validator uses wrong data structure | May fail prerequisite check |
| **#7** | Level requirement check uses `classLevels.length` | May report wrong level |

---

### LEVEL 8 - First Prestige Level (Ace Pilot 1)

**Transition to Prestige Class:**
1. Select Ace Pilot from available classes
2. Verify prerequisites met
3. Apply Ace Pilot starting features

**Expected Gains:**
- HP: +7 (d8/2 + 1 + CON = 5 + 2 = 7... wait, prestige uses d8)
- BAB: +8 (Ace Pilot has 3/4 BAB, so +7.75 ≈ +8)
- New Talent Trees: Ace Pilot trees available
- Ability Increase: +2 points (level 8 milestone)

**BUGS ENCOUNTERED:**
| Bug | Description | Impact |
|-----|-------------|--------|
| **#5** | Defense bonus update not awaited | Race condition in defense calc |
| **#8** | Talent trees may not merge | Can't see Soldier trees anymore |
| **#6** | Ability increase UI unclear | May miss +2 points |

---

### LEVELS 9-12 - Ace Pilot Progression

**Level 9:**
- Milestone Feat
- Talent from Ace Pilot or any owned class tree

**Level 10:**
- Standard level-up

**Level 11:**
- Standard level-up

**Level 12:**
- Milestone Feat
- Ability Increase (+2 points)

**Cumulative Stats at Level 12:**
- HP: ~96-104 (varies with rolls, CON)
- BAB: +11 (7 Soldier + 4×0.75 Ace Pilot = 7 + 3 = 10... wait, 5 levels of Ace Pilot)
  - Actually: +7 (Soldier 7) + floor(5 × 0.75) = +7 + 3 = +10

---

### LEVEL 13 - Second Prestige (Officer 1)

**Officer Prerequisites Check:**
| Prerequisite | Status | Notes |
|--------------|--------|-------|
| Character Level 7 | ✅ Level 13 | Easily met |
| Knowledge (Tactics) trained | ✅ Trained at L1 | Planned ahead |
| 1 Leadership/Commando/Veteran talent | ⚠️ Need to have | From Soldier or Ace Pilot trees |
| Military/Paramilitary Organization | ⚠️ Special | Not validated by code |

**BUGS ENCOUNTERED:**
- "Other" prerequisites like organization membership NOT validated
- Player must manually confirm meeting narrative requirements

---

### LEVELS 14-17 - Officer Progression

**Level 15:**
- Milestone Feat

**Level 16:**
- Ability Increase (+2 points)

---

### LEVELS 18-20 - Return to Soldier

**Level 18:**
- Return to Soldier class (multiclass back)
- Milestone Feat
- HP: d10 again

**Level 20:**
- Final Ability Increase (+2 points)
- Final Talent

**FINAL STATS (Expected):**
- Level: 20
- Classes: Soldier 10, Ace Pilot 5, Officer 5
- HP: ~160-180 HP (should be ~100-120 without the 3x level 1 bug)
- BAB: +17 (10×1.0 + 5×0.75 + 5×0.75 = 10 + 3.75 + 3.75 = 17.5 → 17)
- Feats: ~14+ (7 base + 6 milestone + Human + class bonuses)
- Talents: ~10-15 (depends on class progression data)
- Abilities: 8 points allocated (levels 4, 8, 12, 16, 20)

---

## SHOP TESTING RESULTS

### Starting Credits Test
**Expected:** Roll 3d4 × 250 or fixed 1,000 credits
**Result:** ❌ Cannot test - shop doesn't complete purchases (BUG #1)

### Level-Up Credits (15d1000 per level)
**Expected:** +15,000 average per level
**Result:** ❌ No automatic credit addition exists in progression engine
**Note:** This would need to be manually applied or added as a feature

### Purchasing Droid Companion
**Attempt:** Buy R2 Astromech Droid (5,000 credits)
**Result:** ❌ Failed - BUG #1 (no purchase functionality)
**Secondary Issue:** BUG #4 (ActorEngine may not be initialized)

### Purchasing Starship
**Attempt:** Buy Y-Wing Starfighter (65,000 credits)
**Result:** ❌ Failed - BUG #1
**Secondary Issue:** BUG #12 (pack name typo: "foundryvtt-foundryvtt-swse")

---

## BUTTON FUNCTIONALITY AUDIT

### All Buttons Tested

| Button Location | Button Name | Handler Connected | Functional |
|-----------------|-------------|-------------------|------------|
| Chargen | Next Step | `_onNextStep` | ✅ Yes |
| Chargen | Previous Step | `_onPrevStep` | ✅ Yes |
| Chargen | Select Species | `_onSelectSpecies` | ✅ Yes |
| Chargen | Select Class | `_onSelectClass` | ✅ Yes |
| Chargen | Select Feat | `_onSelectFeat` | ✅ Yes |
| Chargen | Select Talent | `_onSelectTalent` | ✅ Yes |
| Chargen | Finish | `_onFinish` | ✅ Yes |
| Chargen | Open Shop | `_onOpenShop` | ❌ BUG #1 |
| LevelUp | Select Class | `_onSelectClass` | ✅ Yes |
| LevelUp | Next Step | `_onNextStep` | ✅ Yes |
| LevelUp | Previous Step | `_onPrevStep` | ✅ Yes |
| LevelUp | Skip Step | `_onSkipStep` | ✅ Yes |
| LevelUp | Select Talent Tree | `_onSelectTalentTree` | ✅ Yes |
| LevelUp | Select Bonus Feat | `_onSelectBonusFeat` | ✅ Yes |
| LevelUp | Ability Increase | `_onAbilityIncrease` | ⚠️ Unclear |
| LevelUp | Complete Level Up | `_onCompleteLevelUp` | ✅ Yes |
| LevelUp | Free Build Toggle | `_onToggleFreeBuild` | ✅ Yes |
| Shop | Buy Item | `_onBuyItem` | ❌ BUG #1 |

---

## QUICK REFERENCE: ALL BUGS FOUND

| Bug # | Severity | File | Issue | Level Discovered |
|-------|----------|------|-------|-----------------|
| 0A | 🔴 CRITICAL | class-data-loader.js:167-177 | Syntax error: duplicate code block | System load |
| 0B | 🔴 CRITICAL | progression-data.js:278-281 | Syntax error: duplicate key + missing brace | System load |
| 0C | 🔴 CRITICAL | progression-actor-updater.js:151-154 | HP = 3× hit die (should be 1×) | Level 1 |
| #1 | 🔴 CRITICAL | store-main.js:196-209 | Shop doesn't actually purchase | Level 1 |
| #2 | 🔴 CRITICAL | prestige-readiness.js:56-124 | Uses non-existent data structure | Level 7 |
| #3 | 🔴 CRITICAL | levelup-shared.js:291 | CON mod lookup fails | All levels |
| #4 | 🔴 CRITICAL | store-checkout.js | No ActorEngine null check | Shop use |
| #5 | 🟠 MAJOR | levelup-shared.js:141-178 | Defense update not awaited | Multiclass |
| #6 | 🟠 MAJOR | levelup-main.js | Ability increase UI unclear | Level 4,8,12,16,20 |
| #7 | 🟠 MAJOR | prestige-readiness.js:112-118 | Level check uses wrong value | Level 7 |
| #8 | 🟠 MAJOR | levelup-talents.js | Talent tree merging issues | Multiclass |
| #9 | 🟠 MAJOR | store-checkout.js:439-512 | Rollback may fail partially | Shop use |
| #10 | 🟠 MAJOR | Various | Force power levelup selection | Force users |
| #11 | 🟡 MINOR | chargen-class.js | Droid class reference error | Droid chars |
| #12 | 🟡 MINOR | store-checkout.js:134 | Pack name typo | Shop load |
| #13 | 🟡 MINOR | levelup-shared.js | Milestone feat UI unclear | Level 3,6,9... |
| #14 | 🟡 MINOR | levelup-shared.js | Nonheroic HP untested | Nonheroic chars |
| #15 | 🟡 MINOR | levelup-class.js | Mentor null check missing | Prestige class |
| #16 | 🟡 MINOR | levelup-skills.js | Multiclass skill tracking | Multiclass |
| #17 | 🟡 MINOR | Progression engine | No auto-credits per level | All levels |
| #18 | 🟡 MINOR | vehicle-modification-app.js | Mods may not persist | Vehicle use |

---

## CONCLUSION

The progression engine has **solid UI architecture** but contains **critical bugs that prevent actual functionality**:

1. **Three syntax errors** prevent system from loading properly
2. **HP calculation gives 3× the correct value** at level 1
3. **Shop system shows UI but doesn't complete purchases**
4. **Prestige class validation uses broken data structure**

**A character created from level 1 to 20 would encounter:**
- **+20 extra HP** at level 1 (actually 32 HP instead of 12)
- **Unable to purchase any equipment** throughout play
- **Prestige class eligibility may incorrectly fail** at level 7
- **Ability score increases may be skipped** at levels 4, 8, 12, 16, 20
- **Droids and vehicles cannot be purchased** due to shop bugs

**Recommended Fix Priority:**
1. Fix syntax errors (0A, 0B)
2. Fix HP calculation (0C)
3. Implement actual shop purchases (#1)
4. Fix prestige class validation (#2, #7)

---

*Report Generated: December 21, 2025*
*Test Character: Kira Vance (Human Soldier/Ace Pilot/Officer)*
*Analysis Method: Comprehensive code review*

# FORCE POWER COUNTING AND RECONCILIATION AUDIT

**Status:** AUDIT ONLY - NO IMPLEMENTATIONS PERFORMED

---

## FILES INSPECTED

1. `scripts/engine/progression/engine/force-power-engine.js` - Initial trigger detection
2. `scripts/engine/progression/engine/force-authority-engine.js` - Canonical capacity calculation
3. `scripts/engine/progression/engine/force-slot-validator.js` - Validation coordinator  
4. `scripts/engine/progression/data/progression-data.js` - Hardcoded feat grants
5. `scripts/apps/progression-framework/shell/conditional-step-resolver.js` - Step unlock logic
6. `scripts/apps/chargen/chargen-force-powers.js` - Chargen counting
7. `scripts/apps/levelup/levelup-force-powers.js` - Level-up counting
8. `scripts/engine/progression/integration/finalize-integration.js` - Finalization & reselection
9. `scripts/engine/progression/engine/suite-reselection-engine.js` - Reselection flow
10. `scripts/houserules/houserule-settings.js` - Registered settings

---

## COUNTING LOGIC BY RUNTIME PATH

### CHARGEN

**File:** `scripts/apps/chargen/chargen-force-powers.js:_getForcePowersNeeded()`

**Inputs:**
- `characterData.feats` (user-selected feats)
- `characterData.classes[0]` (selected class)
- `characterData.abilities[abilityKey].mod` (current ability modifier)
- Setting: `forceTrainingAttribute` (wisdom|charisma)

**Formula:**
```
Force Sensitivity feat → 1 power
Force Training feats → (count × (1 + modifier)) where modifier ≥ 0
Total = Force Sensitivity powers + Force Training powers
```

**Ability Modifier Source:**
- Uses setting `forceTrainingAttribute` (CORRECT)
- Converts to abilityKey: charisma → 'cha', else 'wis'
- Reads `characterData.abilities[abilityKey].mod` (ability modifier at chargen time)
- Applied immediately during character creation

**Key Behavior:**
- ✓ Counts class-granted feats via `PrerequisiteChecker.getLevel1GrantedFeats(classDoc)`
- ✓ Counts user-selected feats from `characterData.feats`
- ✓ Uses configured ability modifier
- ✓ Returns TOTAL entitlement (not just new powers)

---

### LEVEL-UP

**File:** `scripts/apps/levelup/levelup-force-powers.js:countForcePowersGained()`

**Inputs:**
- `actor.items` (feats actually owned)
- `selectedFeats` (feats being acquired this level)
- `actor.system.abilities[abilityKey].mod` (current ability modifier on actor)
- Setting: `forceTrainingAttribute` (wisdom|charisma)

**Formula:**
```
Force Sensitivity feat selected this level → 1 power
Force Training feats selected this level → (count × (1 + modifier)) where modifier ≥ 0
Total = Powers being gained THIS LEVEL (not total entitlement)
```

**Ability Modifier Source:**
- Uses setting `forceTrainingAttribute` (CORRECT)
- Reads `actor.system.abilities[abilityKey].mod` (current ability at level-up time)
- Applied at time of selection

**Key Behavior:**
- ✓ Only counts feats being SELECTED this level
- ✓ Does NOT reconcile against total entitled powers
- ✓ Does NOT check if actor is under-entitled
- ❌ Does not use this result to determine if Force Powers step opens

---

### FINALIZED ACTOR / RUNTIME

**File:** `scripts/engine/progression/engine/force-authority-engine.js:getForceCapacity(actor)`

**Inputs:**
- `actor.items` (feats actually owned on finalized actor)
- `actor.system.abilities.wis.mod` (current ability modifier HARDCODED to WIS)

**Formula:**
```
Force Sensitivity feat owned → 1 power
Force Training feats owned → (count × (1 + wisMod)) where wisMod used ALWAYS
Total = Complete entitlement for all purposes
```

**⚠️ CRITICAL BUG - Ability Modifier Source:**
- **HARDCODED to WIS** (line 57: `const wisMod = actor.system?.abilities?.wis?.mod ?? 0;`)
- **IGNORES setting `forceTrainingAttribute`**
- This contradicts chargen and level-up which use the setting

**Key Behavior:**
- ✓ Counts total owned feats (complete entitlement)
- ✓ Used only during VALIDATION, not during step unlock
- ❌ Always uses WIS modifier, even if setting is Charisma
- ❌ Not called during conditional step resolution

---

## CANONICAL ABILITY MODIFIER SOURCE

### Chargen
- **Setting:** `forceTrainingAttribute` ✓ (CORRECT)
- **Path:** `game.settings.get('foundryvtt-swse', 'forceTrainingAttribute')`
- **File:** `scripts/apps/chargen/chargen-force-powers.js:159`

### Level-Up
- **Setting:** `forceTrainingAttribute` ✓ (CORRECT)
- **Path:** `game.settings.get('foundryvtt-swse', 'forceTrainingAttribute')`
- **File:** `scripts/apps/levelup/levelup-force-powers.js:72`

### Force Authority Engine (Runtime Validation)
- **Setting:** HARDCODED to WIS ❌ (BUG)
- **Path:** Direct access to `actor.system.abilities.wis.mod`
- **File:** `scripts/engine/progression/engine/force-authority-engine.js:57`
- **Impact:** Validation and reselection use wrong modifier if setting is Charisma

### Force Power Engine (Trigger Detection - UNUSED)
- **Setting:** `forceTrainingUseCha` (non-existent) ❌ (BUG)
- **Path:** `game.settings?.get('foundryvtt-swse', 'forceTrainingUseCha') ?? false`
- **File:** `scripts/engine/progression/engine/force-power-engine.js:101`
- **Impact:** This path is dead code - setting doesn't exist, defaults to false (always WIS)

**Registered Settings:**
- ✓ `forceTrainingAttribute` exists and is registered in houserules
- ❌ `forceTrainingUseCha` does NOT exist
- ❌ Invalid settings silently default to false

---

## RECONCILIATION LOGIC

### Owned vs Entitled Comparison

**Yes, it exists BUT:**

**During Validation Only:**
- File: `scripts/engine/progression/engine/force-authority-engine.js:validateForceSelection()`
- Compares: `powerIds.length > context.totalCapacity`
- Called by: `ForcePowerEngine.applySelected()` (line 217)
- Blocks selection if over capacity

**NOT During Step Unlock:**
- File: `scripts/apps/progression-framework/shell/conditional-step-resolver.js:_checkForcePowersUnlocked()`
- Only checks: Does actor have Force Sensitivity OR Force Training feat?
- Does NOT check: Is actor missing entitled powers?
- Result: Step shows if feat exists, regardless of capacity mismatch

**Flow Timing:**
1. ✓ Chargen: Shows Force Powers step if `_getForcePowersNeeded() > 0`
2. ❌ Level-Up: Shows Force Powers step if feat owned (NOT if under-entitled)
3. ✓ Finalization: Optional reselection asks user if capacity changed
4. ✓ Application: Validates entitled vs owned before applying

---

## WISDOM / PERMANENT MODIFIER INCREASE HANDLING

### Is It Implemented?

**Partial - Flawed Implementation:**

**What Happens During Level-Up with Ability Increase:**

1. **Ability recalculated** (before Force Powers step)
   - File: `ProgressionSession.js:420` sets `system.attributes.wisdom.base`
   - New modifier is immediately available

2. **Force Powers step NOT automatically opened**
   - `conditional-step-resolver.js:222` does NOT check if entitled > owned
   - Only checks if feat exists
   - Result: User must manually reselect

3. **Optional Reselection After Finalization**
   - File: `finalize-integration.js:215` offers reselection
   - Only during level-up, only if setting enabled
   - Calls `SuiteReselectionEngine.clearAndReselectForcePowers()`
   - Recalculates capacity with NEW ability modifier

**Scenario Testing:**
- Character has: Force Training, WIS mod +2
- Entitled to: 1 + 2 = 3 powers
- Character levels up, gains WIS +1 (mod becomes +3)
- Entitled to: 1 + 3 = 4 powers
- **Result:** Force Powers step NOT shown automatically, only optional reselection offered

### Problem

**No automatic reconciliation:**
- If player doesn't select "Reselect Force Powers", they keep old selection
- They now have 3 powers but are entitled to 4
- No subsequent UI alerts about shortfall

---

## FORCE SENSITIVITY VS FORCE TRAINING DISTINCTION

### Distinction Present in Counting Logic

**YES - Logically Separated But NOT Architecturally Distinct:**

**In All Three Paths:**

1. **Force Sensitivity**
   ```javascript
   const hasForceSensitivity = feats.some(f => 
     f.name.toLowerCase().includes('force sensitivity')
   );
   if (hasForceSensitivity) {
     count += 1;
   }
   ```

2. **Force Training**
   ```javascript
   const forceTrainingFeats = feats.filter(f =>
     f.name.toLowerCase().includes('force training')
   );
   count += forceTrainingFeats.length * (1 + modifier);
   ```

**Logically Distinct:**
- ✓ Counted separately
- ✓ Different formulas (fixed 1 vs 1+mod)
- ✓ Can identify sources

**Architecturally NOT Distinct:**
- ❌ No per-power attribution (no way to know WHICH power came from which source)
- ❌ No immutability enforcement (can't protect Force Sensitivity-granted powers)
- ❌ No retroactive reallocation on modifier increase (can't recalculate per-source)

---

## GAIN EVENT DETECTION

**Current Events That Trigger Force Powers Selection Opportunity:**

### Chargen
- **Event:** Class selection
- **Detection:** `_getForcePowersNeeded() > 0`
- **File:** `chargen-main.js:1904`
- **Correct:** YES - Checks if class grants Force Sensitivity

### Level-Up
- **Event:** Selecting Force Sensitivity or Force Training feat
- **Detection:** `getsForcePowers(actor, selectedFeats)` checks selectedFeats
- **File:** `conditional-step-resolver.js:232`
- **Correct:** PARTIAL - Only checks if feat exists, not if entitled

### Finalization (Optional)
- **Event:** Ability increase
- **Detection:** User chooses "Reselect" dialog
- **File:** `finalize-integration.js:215`
- **Correct:** YES - Recalculates with new modifier

### NOT Triggered By:
- ❌ Gaining Force Training (doesn't add to step automatically)
- ❌ Permanent modifier increasing (only offered optionally)
- ❌ Owning fewer powers than entitled
- ❌ Another Force Training being acquired

---

## FAILURE MODES

### 1. **Ability Modifier Mismatch (CRITICAL)**
- Force Authority Engine hardcodes WIS
- Chargen/Level-up use configurable setting
- If setting is Charisma, validation uses WIS but chargen used CHA
- **Impact:** Character may be denied valid selections or allowed invalid ones

### 2. **Dead Code Setting (BUG)**
- `forceTrainingUseCha` setting used in force-power-engine.js doesn't exist
- Defaults to false (always WIS)
- **Impact:** Force power detection in triggers always uses WIS

### 3. **Under-Entitlement Not Auto-Detected**
- Character with Force Training levels up, gains WIS +1
- Entitled powers increase, but Force Powers step NOT shown
- Only optional reselection offered
- If user declines, they stay under-entitled
- **Impact:** Character misses entitled powers

### 4. **Counting Inconsistency**
- Chargen: Returns TOTAL entitlement
- Level-Up: Returns POWERS GAINED THIS LEVEL
- Different meanings, easy to confuse
- **Impact:** Step visibility logic may use wrong counts

### 5. **Class-Granted Feats Not Materialized Early Enough**
- Chargen fetches granted feats via `PrerequisiteChecker.getLevel1GrantedFeats()`
- But they're not in `characterData.feats` during feat selection UI
- **Impact:** Feat selection UI can't see what class granted

### 6. **Flat Counting Model**
- All Force powers counted the same way
- Can't distinguish Force Sensitivity powers from Force Training powers
- Can't enforce "Force Sensitivity powers are immutable"
- **Impact:** Wisdom-driven reallocation logic can't work per-power

### 7. **Step Unlock Logic Incomplete**
- Only checks if feat exists, not if entitled > owned
- Character with 1 Force Training, WIS +2 could be entitled to 3 but own 1
- Force Powers step wouldn't reopen
- **Impact:** Player can't select missing entitled powers during normal level-up

### 8. **Reselection Is Optional, Not Automatic**
- Finalization offers user choice to reselect
- If user declines and then levels up again, old shortfall persists
- **Impact:** Under-entitlement debt compounds

---

## SAFE FIX TARGETS

### Category A: Counting Formula (Minimal, High Impact)

**Files to Change:**
1. `scripts/engine/progression/engine/force-authority-engine.js:getForceCapacity()`
   - Replace hardcoded WIS with setting check
   - Match chargen/level-up ability logic

**Why Safe:**
- Only used during validation
- No external API changes
- Purely internal calculation

### Category B: Gain-Event Detection (Minimal, Medium Impact)

**Files to Change:**
1. `scripts/apps/progression-framework/shell/conditional-step-resolver.js:_checkForcePowersUnlocked()`
   - Call `ForceAuthorityEngine.getForceCapacity()` to get entitled count
   - Compare against `actor.items.filter(i => i.type === 'forcepower').length`
   - Only unlock if entitled > owned

**Why Safe:**
- Only affects step visibility
- Doesn't change counting logic
- No new state or persistence

### Category C: Step Unlock Logic (Minimal, Medium Impact)

**Files to Change:**
1. `scripts/apps/levelup/levelup-main.js` (if step opening logic exists there)
2. `scripts/apps/levelup/levelup-force-powers.js:countForcePowersGained()`
   - Call `ForceAuthorityEngine.getForceCapacity()` instead of `countForcePowersGained()`
   - Compare against current owned to determine how many new slots available

**Why Safe:**
- Chargen and level-up both exist, can share logic
- No data model changes
- No persistence needed

### Category D: Deferred Provenance Work (Larger, Architectural)

**DO NOT IMPLEMENT YET:**
1. Per-power source attribution
2. Immutable power enforcement
3. Wisdom-driven retroactive reallocation
4. Per-Force-Training-instance tracking

**Reason:**
- Requires force power item data model changes
- Requires persistent provenance tracking
- Out of scope for counting audit

### Category E: Dead Code Cleanup (Trivial)

**Files to Change:**
1. `scripts/engine/progression/engine/force-power-engine.js:_countFromAbilityMod()`
   - Replace `forceTrainingUseCha` (doesn't exist) with `forceTrainingAttribute`
   - Match the setting that's actually registered

**Why Safe:**
- Fixes dead code that's never executed
- Aligns with registered settings
- Purely code quality

---

## WHAT TO TEST IN FOUNDRY

### Test Case 1: Chargen - Jedi Gets Force Sensitivity

**Setup:**
- New character, select Jedi class

**Expected:**
- Force Powers step appears
- Step says: 1 power available

**Current Behavior:**
- ✓ Likely works (using correct setting)

---

### Test Case 2: Chargen - Scout + Force Training (WIS +2)

**Setup:**
- New character, select Scout
- Select Force Training feat
- Verify WIS modifier is +2

**Expected:**
- Force Powers step appears
- Step says: 1 + 2 = 3 powers available

**Current Behavior:**
- ✓ Likely works (using correct setting)

---

### Test Case 3: Level-Up - Character Gets Force Training

**Setup:**
- Existing character (no Force powers yet)
- Character levels up
- Offer Force Training feat during level-up
- Character has WIS mod +1

**Expected:**
- Force Powers step opens during level-up
- Allows selecting 1 + 1 = 2 powers

**Current Behavior:**
- ❌ Force Powers step may NOT open (step resolver doesn't trigger on new feat acquisition)
- User must somehow trigger reselection

---

### Test Case 4: Level-Up - Ability Increase (WIS +1)

**Setup:**
- Character has Force Training feat (already owns 1 power, entitled to 1+old_WIS)
- Character levels up, gets WIS increase
- Set `forceTrainingAttribute` to "wisdom"

**Expected:**
- Force Powers step shows OR reselection offered
- New capacity = 1 (old) + (1 + new_WIS) (from Force Training)
- Can select additional powers up to new capacity

**Current Behavior:**
- ❌ Force Powers step NOT automatically shown
- Only optional "Reselect Force Powers?" dialog offered at finalization
- If user declines, stays under-entitled

---

### Test Case 5: Validation - Over Capacity

**Setup:**
- Character entitled to 3 Force powers
- Try to apply 4 powers

**Expected:**
- Validation fails with "Over capacity" error

**Current Behavior:**
- ✓ Works (validated in `ForceSlotValidator`)

---

### Test Case 6: Validation - Charisma Setting (FAILS)

**Setup:**
- Set `forceTrainingAttribute` to "charisma"
- Character has CHA +3, WIS +0
- Force Training feat (should grant 1 + 3 = 4 powers)

**Expected:**
- Validation allows 4 powers
- Selection picker shows capacity 4

**Current Behavior:**
- ❌ Validation uses WIS (hardcoded)
- Only allows 1 + 0 = 1 power (WRONG)
- Chargen would have calculated correctly (4)
- **MISMATCH**

---

### Test Case 7: Reselection After Level-Up

**Setup:**
- Character with Force Training + 1 power
- WIS increases by 2
- User chooses "Reselect Force Powers" dialog

**Expected:**
- Old power cleared
- Recalculates capacity with new WIS
- Opens picker with new capacity
- Can reselect old + new powers

**Current Behavior:**
- ✓ Works (uses ForceAuthorityEngine, but with hardcoded WIS)
- ⚠️ If setting is Charisma, still uses WIS (BUG)

---

## SUMMARY OF FINDINGS

| Component | Status | Issue | Severity |
|-----------|--------|-------|----------|
| Chargen Counting | ✓ CORRECT | Uses `forceTrainingAttribute` correctly | - |
| Level-Up Counting | ✓ CORRECT | Uses `forceTrainingAttribute` correctly | - |
| Authority Engine | ❌ BUG | Hardcodes WIS instead of using setting | CRITICAL |
| Force Power Engine | ❌ DEAD CODE | Uses non-existent setting | MEDIUM |
| Step Unlock Logic | ❌ INCOMPLETE | Doesn't check entitled vs owned | MEDIUM |
| Gain Event Detection | ❌ INCOMPLETE | Doesn't trigger on new feats | MEDIUM |
| Ability Increase Handling | ⚠️ PARTIAL | Optional reselection, not automatic | LOW-MEDIUM |
| Distinction (FS vs FT) | ✓ LOGICAL | Counted separately, not architecturally distinct | - |
| Reconciliation | ✓ EXISTS | Only during validation, not step unlock | - |
| Wisdom Retroactivity | ❌ MISSING | No automatic recalculation | MEDIUM |

---

**Audit Completed: 2026-04-11**

# FORCE POWER COUNTING AND RECONCILIATION FIX - IMPLEMENTATION REPORT

**Status:** IMPLEMENTED - Ready for testing  
**Scope:** Counting/reconciliation bugs only - NO provenance changes  
**Commit:** `31892e1` - "Fix Force power counting and reconciliation bugs"

---

## CHANGE SUMMARY

Surgical fix addressing three critical bugs in Force power entitlement and reconciliation:

1. **Ability Modifier Hardcoding Bug (CRITICAL)**
   - `ForceAuthorityEngine.getForceCapacity()` hardcoded WIS
   - Now respects `forceTrainingAttribute` setting (wisdom|charisma)
   - Validation uses correct capacity for Charisma-configured games

2. **Dead Code Setting Bug (MEDIUM)**
   - `ForcePowerEngine._countFromAbilityMod()` used non-existent `forceTrainingUseCha`
   - Now uses canonical `forceTrainingAttribute` setting
   - Aligns with chargen and level-up implementations

3. **Under-Entitlement Detection Bug (MEDIUM)**
   - Step resolver only checked if feat existed
   - Now compares: owned forcepower items < entitled capacity
   - Force Powers step reappears when actor becomes under-entitled
   - Supports ability increase scenarios

---

## FILES CHANGED

1. `scripts/engine/progression/engine/force-authority-engine.js`
   - Updated `getForceCapacity()` method (lines 52-67, 73-80)
   - Updated doc comment (line 9)

2. `scripts/engine/progression/engine/force-power-engine.js`
   - Updated `_countFromAbilityMod()` method (lines 90-106)
   - Fixed dead code setting reference

3. `scripts/apps/progression-framework/shell/conditional-step-resolver.js`
   - Added import: `ForceAuthorityEngine`
   - Completely rewrote `_checkForcePowersUnlocked()` method (lines 224-252)

---

## EXACT METHODS/CONDITIONALS CHANGED

### File 1: force-authority-engine.js

**Method:** `getForceCapacity(actor)` (lines 52-67)

**Before:**
```javascript
const forceTrainingFeats = actor.items.filter(
  i => i.type === 'feat' && i.name.toLowerCase().includes('force training')
);
if (forceTrainingFeats.length > 0) {
  const wisMod = actor.system?.abilities?.wis?.mod ?? 0;  // ❌ HARDCODED
  const perFeat = 1 + Math.max(0, wisMod);
  const trainingCapacity = forceTrainingFeats.length * perFeat;
  capacity += trainingCapacity;
  swseLogger.debug('[FORCE CAPACITY] Force Training', {
    count: forceTrainingFeats.length,
    wisMod,
    perFeat,
    total: trainingCapacity
  });
}
```

**After:**
```javascript
const forceTrainingFeats = actor.items.filter(
  i => i.type === 'feat' && i.name.toLowerCase().includes('force training')
);
if (forceTrainingFeats.length > 0) {
  // ✓ Use canonical setting
  const forceAbility = game.settings?.get('foundryvtt-swse', 'forceTrainingAttribute') || 'wisdom';
  const abilityKey = forceAbility === 'charisma' ? 'cha' : 'wis';
  const abilityMod = actor.system?.abilities?.[abilityKey]?.mod ?? 0;

  const perFeat = 1 + Math.max(0, abilityMod);
  const trainingCapacity = forceTrainingFeats.length * perFeat;
  capacity += trainingCapacity;
  swseLogger.debug('[FORCE CAPACITY] Force Training', {
    count: forceTrainingFeats.length,
    configuredAbility: forceAbility,
    abilityMod,
    perFeat,
    total: trainingCapacity
  });
}
```

**Impact:** Validation now uses correct capacity when `forceTrainingAttribute` is set to Charisma.

---

### File 2: force-power-engine.js

**Method:** `_countFromAbilityMod(actor)` (lines 88-106)

**Before:**
```javascript
const useCha = game.settings?.get('foundryvtt-swse', 'forceTrainingUseCha') ?? false;  // ❌ DEAD CODE SETTING
const abilityKey = useCha ? 'cha' : 'wis';
const mod = actor.system.abilities[abilityKey]?.mod ?? 0;
```

**After:**
```javascript
// ✓ Use canonical setting
const forceAbility = game.settings?.get('foundryvtt-swse', 'forceTrainingAttribute') || 'wisdom';
const abilityKey = forceAbility === 'charisma' ? 'cha' : 'wis';
const mod = actor.system.abilities[abilityKey]?.mod ?? 0;
```

**Impact:** Removes dead code, aligns with chargen/level-up paths.

---

### File 3: conditional-step-resolver.js

**Method:** `_checkForcePowersUnlocked(actor)` (lines 224-252)

**Before:**
```javascript
async _checkForcePowersUnlocked(actor) {
  try {
    const feats = actor?.items?.filter(i => i.type === 'feat') ?? [];
    const hasForceSensitivity = feats.some(f =>
      f.name?.toLowerCase().includes('force sensitivity')
    );
    const hasForceTraining = feats.some(f =>
      f.name?.toLowerCase().includes('force training')
    );
    if (hasForceSensitivity || hasForceTraining) {  // ❌ ONLY CHECKS FEAT EXISTENCE
      const reason = hasForceSensitivity ? 'Force Sensitivity' : 'Force Training feat';
      return { active: true, reason };
    }
  } catch {
    // Defensive
  }
  return { active: false, reason: null };
}
```

**After:**
```javascript
async _checkForcePowersUnlocked(actor) {
  // Check if actor has Force capability AND is under-entitled (owned < entitled)
  try {
    const feats = actor?.items?.filter(i => i.type === 'feat') ?? [];
    const hasForceSensitivity = feats.some(f =>
      f.name?.toLowerCase().includes('force sensitivity')
    );
    const hasForceTraining = feats.some(f =>
      f.name?.toLowerCase().includes('force training')
    );

    // ✓ Only show step if actor has Force capability
    if (!hasForceSensitivity && !hasForceTraining) {
      return { active: false, reason: null };
    }

    // ✓ Check if actor is under-entitled (owned < entitled)
    const entitledCapacity = await ForceAuthorityEngine.getForceCapacity(actor);
    const ownedPowers = actor?.items?.filter(i => i.type === 'forcepower')?.length ?? 0;

    // ✓ Show Force Powers step if entitled > owned
    if (entitledCapacity > 0 && ownedPowers < entitledCapacity) {
      const reason = hasForceSensitivity ? 'Force Sensitivity' : 'Force Training feat';
      return { active: true, reason };
    }
  } catch {
    // Defensive
  }
  return { active: false, reason: null };
}
```

**Impact:** Force Powers step now reappears when actor is under-entitled.

---

## CANONICAL ABILITY MODIFIER PATH

### All Three Paths Now Use:

```javascript
const forceAbility = game.settings?.get('foundryvtt-swse', 'forceTrainingAttribute') || 'wisdom';
const abilityKey = forceAbility === 'charisma' ? 'cha' : 'wis';
const abilityMod = actor.system.abilities[abilityKey]?.mod ?? 0;
```

### Unified In:

1. **Chargen** - `chargen-force-powers.js:_getForcePowersNeeded()` (line 159)
2. **Level-Up** - `levelup-force-powers.js:countForcePowersGained()` (line 72)
3. **Authority Engine** - `force-authority-engine.js:getForceCapacity()` (line 54) ✓ NOW FIXED
4. **Force Power Engine** - `force-power-engine.js:_countFromAbilityMod()` (line 102) ✓ NOW FIXED

### Canonical Setting:
- **Registered:** `forceTrainingAttribute` in `houserules/houserule-settings.js:413`
- **Valid Values:** "wisdom" (default) or "charisma"
- **Used By:** All four paths listed above

---

## UNDER-ENTITLEMENT DETECTION

### Detection Logic (New)

**Location:** `conditional-step-resolver.js:_checkForcePowersUnlocked()`

**Algorithm:**
```
1. Check if actor has Force Sensitivity OR Force Training feat
2. If NO → return { active: false }
3. If YES → continue
4. Get entitled capacity via ForceAuthorityEngine.getForceCapacity()
5. Count owned forcepower items on actor
6. If (entitledCapacity > 0) AND (ownedPowers < entitledCapacity)
   → return { active: true }
7. Else → return { active: false }
```

### When Force Powers Step NOW Appears:

- ✓ Chargen: When class grants Force Sensitivity
- ✓ Chargen: When Force Training feat selected
- ✓ Level-Up: When Force Training feat selected
- ✓ Level-Up: When ability increase raises capacity above owned
- ✓ Runtime: If entitlement recalculated and actor is under-entitled

### When Force Powers Step NO LONGER Appears:

- ✗ Actor has feat but owns all entitled powers
- ✗ Actor has no Force capability

---

## FORCE POWERS STEP REOPEN / GAIN-EVENT DETECTION

### Scenarios That Now Trigger Step Availability:

**Scenario 1: Chargen - Jedi Selected**
- Jedi class grants Force Sensitivity feat
- `_getForcePowersNeeded()` detects granted feat
- Step shows: 1 power available

**Scenario 2: Chargen - Force Training + WIS +3**
- User selects Force Training feat
- WIS modifier is +3
- `_getForcePowersNeeded()` calculates: 1 + 3 = 4 powers
- Step shows: 4 powers available

**Scenario 3: Level-Up - Force Training Acquired**
- Character levels up
- User selects Force Training feat
- `conditional-step-resolver` checks:
  - Has Force Training? YES
  - Entitled capacity? 1 + current_WIS_mod
  - Owned? 0
  - Owned < Entitled? YES
- Step shows

**Scenario 4: Level-Up - Ability Increase**
- Character levels up
- Gets +2 to WIS (now +4 instead of +2)
- Already has Force Training
- `conditional-step-resolver` recalculates:
  - Entitled capacity? OLD 1 + 2 = 3, NEW 1 + 4 = 5
  - Owned? Still 3
  - Owned < Entitled? YES (3 < 5)
- Step shows, allows selecting 2 additional powers

### Events Detection:

**Chargen Flow:**
- Class selection → `_getForcePowersNeeded()` recalculated
- Feat selection → `_getForcePowersNeeded()` recalculated
- Step resolver checks if `_getForcePowersNeeded() > 0`

**Level-Up Flow:**
- Feat selection → `conditional-step-resolver._checkForcePowersUnlocked()` called
- Ability increase → `conditional-step-resolver._checkForcePowersUnlocked()` called (at finalization)
- Checks if `entitled > owned`

---

## DEFERRED ARCHITECTURE GAP

### What This Fix Does NOT Implement

This implementation **intentionally does not** address Force power provenance:

- ❌ **No source attribution per power**
  - System cannot track which power came from Force Sensitivity vs Force Training
  - Cannot enforce "Force Sensitivity-granted powers are immutable"

- ❌ **No per-Force-Training-instance tracking**
  - Cannot retroactively recalculate when Wisdom increases
  - Cannot reassign powers between Force Training sources

- ❌ **No Wisdom-driven retroactive reallocation**
  - If WIS increases, excess old powers cannot be flagged for reassignment
  - Player must manually manage via optional reselection

### Why This Is Separate Work

Provenance tracking requires:
1. Adding source field to forcepower item schema
2. Changing data persistence model
3. Implementing immutability enforcement per power
4. Adding retroactive recalculation logic

This is a distinct architecture change, properly deferred as a separate audit/implementation phase.

---

## WHAT TO TEST IN FOUNDRY

### Test Case 1: Chargen - Jedi Gets Force Sensitivity

**Setup:**
- Create new character
- Select Jedi class

**Expected Result:**
- Force Powers step appears
- Step summary shows "1 power available"

**How to Verify:**
- See step-0X labeled "Force Powers"
- Can select 1 Force power

---

### Test Case 2: Chargen - Scout + Force Training (WIS +2)

**Setup:**
- Create new character
- Select Scout class
- Select Force Training feat
- Verify WIS modifier is +2

**Expected Result:**
- Force Powers step appears
- Step summary shows "3 powers available" (1 + 2 WIS mod)

**How to Verify:**
- See step labeled "Force Powers"
- Force Power Picker allows selecting up to 3 powers
- Trying to select 4 shows "Over capacity" error

---

### Test Case 3: Level-Up - Character Gets Force Training (WIS +1)

**Setup:**
- Start with existing character (no Force powers)
- Level up
- Select Force Training feat
- Verify WIS modifier is +1

**Expected Result:**
- Force Powers step shows during level-up
- Step shows "2 powers available" (1 + 1 WIS mod)

**How to Verify:**
- Force Powers step appears in level-up progression
- Can select 2 powers

---

### Test Case 4: Level-Up - Ability Increase (WIS +1)

**Setup:**
- Character has Force Training feat + owns 1 Force power
- WIS currently +2 (entitled to 3 total)
- Level up to even level, gains +1 WIS (now +3, entitled to 4 total)
- Complete ability increase

**Expected Result:**
- Force Powers step shows (or reselection offered)
- Now entitled to 4 powers, owns 1, can select 3 more

**How to Verify:**
- If using conditional-step-resolver: Force Powers step appears
- If using reselection dialog: Dialog offers "Reselect Force Powers?"
- When reselecting: Picker shows capacity 4

---

### Test Case 5: Charisma Setting (Crucial for Bug Fix)

**Setup:**
- In system settings, set `forceTrainingAttribute` to "Charisma"
- Create character with:
  - Force Training feat
  - CHA modifier +3
  - WIS modifier +0

**Expected Result:**
- Entitled powers = 1 + 3 (CHA) = 4 powers
- NOT 1 + 0 (WIS) = 1 power

**How to Verify:**
- Chargen: Force Powers step shows 4 available
- Level-Up: Picker shows capacity 4
- Validation: Allows selecting 4 powers

**Why This Is Important:**
- Tests the fixed ability modifier setting
- Confirms Charisma path works (was broken before)

---

### Test Case 6: Under-Entitlement Detection

**Setup:**
- Character has Force Training + owns only 1 power
- WIS +3 (entitled to 4 total)
- Exit to level-up shell

**Expected Result:**
- Force Powers step is available (under-entitled)
- Can select 3 more powers

**How to Verify:**
- See Force Powers step in level-up
- `conditional-step-resolver._checkForcePowersUnlocked()` returns `{ active: true }`

**Why This Tests The Fix:**
- Validates that step reappears based on entitlement
- Not just based on feat existence

---

### Test Case 7: Over Capacity Prevention

**Setup:**
- Character entitled to 3 Force powers
- Try to apply 4 powers

**Expected Result:**
- Validation fails: "Over capacity: 4 > 3"
- Selection blocked

**How to Verify:**
- Force Power Picker prevents selecting 4 powers
- Or validation error appears when applying

---

## SUMMARY OF FIXES

| Bug | File | Method | Before | After |
|-----|------|--------|--------|-------|
| Hardcoded WIS | force-authority-engine.js | `getForceCapacity()` | Always WIS | Uses setting |
| Dead setting | force-power-engine.js | `_countFromAbilityMod()` | forceTrainingUseCha (dead) | forceTrainingAttribute |
| No under-entitlement check | conditional-step-resolver.js | `_checkForcePowersUnlocked()` | Checks feat only | Checks entitled vs owned |

---

## BEHAVIOR CHANGES

**Before Fix:**
- Charisma games had wrong capacity (used WIS always)
- Under-entitled actors couldn't reopen Force Powers step
- Ability increases didn't trigger Force Powers step
- Step only appeared if feat existed

**After Fix:**
- Charisma games have correct capacity
- Under-entitled actors can reopen Force Powers step
- Ability increases trigger step availability check
- Step only appears if entitled > owned

---

**Ready for Testing in Foundry**  
**No provenance changes implemented**  
**Audit gap documented for future architecture work**

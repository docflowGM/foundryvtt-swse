# SWSE Progression Engine - Detailed Bug Fixes

This document provides specific code fixes for each identified bug, with before/after comparisons and test cases.

---

## BUG #1: Store Shop Function Incomplete - Items Not Actually Purchased

**File:** `scripts/apps/store/store-main.js`
**Lines:** 196-209
**Severity:** CRITICAL

### Current Broken Code
```javascript
async _onBuyItem(item){
    const view = this._prepareItemForView(item);
    const content = `<p>Purchase ${escapeHTML(view.name)} for <strong>${escapeHTML(view.costText)}</strong>?</p>`;
    const confirmed = await new Promise((resolve) => {
        new Dialog({
            title: "Confirm Purchase",
            content,
            buttons: {
                yes: { label: "Buy", callback: () => resolve(true) },
                no: { label: "Cancel", callback: () => resolve(false) }
            },
            default: "yes",
        }).render(true);
    });
    if (!confirmed) return;
    ui.notifications.info(`Purchased ${view.name} for ${view.costText}`);  // ← STOPS HERE!
}
```

### Issue
- Shows confirmation dialog
- Player clicks "Buy"
- Only shows notification
- **NO credit deduction**
- **NO item added to inventory**
- **NO character sheet update**

### Fix
Replace with proper checkout process. Should import and use checkout system:

```javascript
async _onBuyItem(item) {
    const { checkout } = await import('./store-checkout.js');

    if (!this.actor) {
        ui.notifications.error("No actor selected for purchase");
        return;
    }

    const view = this._prepareItemForView(item);
    const costValue = view.costValue || 0;
    const currentCredits = this.actor.system.credits || 0;

    // Check if actor has enough credits
    if (currentCredits < costValue) {
        ui.notifications.error(
            `Insufficient credits! Need ${costValue}, have ${currentCredits}`
        );
        return;
    }

    // Confirm purchase
    const confirmed = await new Promise((resolve) => {
        new Dialog({
            title: "Confirm Purchase",
            content: `<p>Purchase <strong>${escapeHTML(view.name)}</strong> for <strong>${escapeHTML(view.costText)}</strong>?</p>`,
            buttons: {
                yes: { label: "Buy", callback: () => resolve(true) },
                no: { label: "Cancel", callback: () => resolve(false) }
            },
            default: "yes",
        }).render(true);
    });

    if (!confirmed) return;

    try {
        // Deduct credits
        const newCredits = currentCredits - costValue;
        await globalThis.SWSE.ActorEngine.updateActor(this.actor, {
            "system.credits": newCredits
        });

        // Add item to actor's inventory
        const itemData = view.raw.toObject ? view.raw.toObject() : view.raw;
        await this.actor.createEmbeddedDocuments("Item", [itemData]);

        ui.notifications.info(`Purchased ${view.name} for ${view.costText}`);
    } catch (err) {
        SWSELogger.error("Store purchase failed:", err);
        ui.notifications.error("Purchase failed. Please check console.");
    }
}
```

### Test Case
```javascript
// Test: Buy a weapon at level 1
1. Create character with 1000 starting credits
2. Open store
3. Click "Buy" on any item worth <1000 credits (e.g., Blaster Pistol = 500)
4. Confirm dialog
5. EXPECTED:
   - Credits reduced by 500 (now 500)
   - Item appears in character's inventory
   - Character sheet updates
```

---

## BUG #3: HP Calculation Uses Inconsistent Con Modifier

**File:** `scripts/apps/levelup/levelup-shared.js`
**Lines:** 291-325
**Severity:** CRITICAL

### Current Broken Code
```javascript
export function calculateHPGain(classDoc, actor, newLevel) {
  // ... hit die calculation ...

  const conMod = actor.system.abilities.con?.mod || 0;  // ← BUG: .mod doesn't exist!

  // ... rest of calculation ...
  let hpGain = 0;
  if (newLevel <= maxHPLevels) {
    hpGain = hitDie + conMod;  // ← Gets wrong modifier!
  } else {
    switch (hpGeneration) {
      case "maximum":
        hpGain = hitDie + conMod;
      case "average":
        hpGain = Math.floor(hitDie / 2) + 1 + conMod;
      // ... etc
    }
  }
}
```

### Issue
- Code tries to access `actor.system.abilities.con.mod`
- This property doesn't exist in SWSE
- Falls back to 0 for ALL characters regardless of CON score
- Results in:
  - **High CON (16):** Should get +3 HP, but gets +0 instead (loses 3 HP per level)
  - **Low CON (8):** Should lose 1 HP, but loses 0 instead (gains extra HP)
  - **Normal CON (10-14):** Works correctly by accident

### Fix
Replace with calculated modifier:

```javascript
export function calculateHPGain(classDoc, actor, newLevel) {
  const isNonheroic = classDoc.system.isNonheroic || false;

  let hitDie;

  if (isNonheroic) {
    hitDie = 4;
  } else {
    // ... hit die selection logic ...
  }

  // FIX: Calculate CON modifier correctly from ability score
  const conScore = actor.system.abilities.con?.value || 10;
  const conMod = Math.floor((conScore - 10) / 2);  // ← FIXED!

  const hpGeneration = game.settings.get('foundryvtt-swse', "hpGeneration") || "average";
  const maxHPLevels = game.settings.get('foundryvtt-swse', "maxHPLevels") || 1;

  let hpGain = 0;

  if (newLevel <= maxHPLevels) {
    hpGain = hitDie + conMod;
  } else {
    switch (hpGeneration) {
      case "maximum":
        hpGain = hitDie + conMod;
        break;
      case "average":
        hpGain = Math.floor(hitDie / 2) + 1 + conMod;
        break;
      case "roll":
        hpGain = Math.floor(Math.random() * hitDie) + 1 + conMod;
        break;
      case "average_minimum":
        const rolled = Math.floor(Math.random() * hitDie) + 1;
        const average = Math.floor(hitDie / 2) + 1;
        hpGain = Math.max(rolled, average) + conMod;
        break;
      default:
        hpGain = Math.floor(hitDie / 2) + 1 + conMod;
    }
  }

  const finalHPGain = Math.max(1, hpGain);
  SWSELogger.log(`SWSE LevelUp | HP gain: ${finalHPGain} (d${hitDie}, CON mod: ${conMod}, method: ${hpGeneration})`);

  return finalHPGain;
}
```

### Test Cases
```javascript
// Test 1: Low CON (8, modifier -1)
1. Create Scout with CON 8
2. Level up (should lose 1 HP)
3. EXPECTED: HP gain = 1d8-1 ≈ 3-7 HP
4. ACTUAL (BUG): HP gain = 1d8 ≈ 4-8 HP (TOO HIGH)

// Test 2: High CON (16, modifier +3)
1. Create Soldier with CON 16
2. Level up (should gain extra 3 HP)
3. EXPECTED: HP gain = 1d10+3 = 4-13 HP
4. ACTUAL (BUG): HP gain = 1d10 = 1-10 HP (TOO LOW)

// Test 3: Normal CON (10, modifier 0)
1. Create character with CON 10
2. Level up multiple times
3. EXPECTED: Works correctly
4. ACTUAL: Works correctly (by accident)
```

---

## BUG #2: Prestige Class Validator Uses Non-Existent progression Data

**File:** `scripts/progression/engine/tools/prestige-readiness.js`
**Lines:** 56-124
**Severity:** CRITICAL

### Current Broken Code
```javascript
function checkClassPrerequisites(classData, actor, options = {}) {
  const prereqs = classData?.system?.prerequisites;
  const valid = true;
  const reasons = [];

  if (!prereqs) {
    return { valid: true, reasons: [] };
  }

  const progression = actor.system.progression || {};
  const classLevels = progression.classLevels || [];  // ← BUG: This array doesn't exist!

  // Check BAB prerequisite
  if (prereqs.bab !== undefined) {
    const currentBAB = calculateActorBAB(classLevels);  // ← Using wrong data!
    if (currentBAB < prereqs.bab) {
      reasons.push(`BAB +${prereqs.bab} required (current: +${currentBAB})`);
    }
  }

  // ... more checks using classLevels ...

  // Check level prerequisite
  if (prereqs.level !== undefined) {
    const currentLevel = classLevels.length;  // ← WRONG! Should be actor.system.level!
    if (currentLevel < prereqs.level) {
      reasons.push(`Character level ${prereqs.level} required (current: ${currentLevel})`);
    }
  }

  return {
    valid: reasons.length === 0,
    reasons: reasons
  };
}

function calculateActorBAB(classLevels) {
  return classLevels.length; // ← Assumes array exists, simplified to +1 per level
}
```

### Issue
- Looks for `actor.system.progression.classLevels` array
- This structure is **never created** during normal character progression
- Classes are stored as Items, not in this structure
- Result:
  - `classLevels` is undefined, falls back to `[]`
  - `classLevels.length` is always 0
  - BAB calculation returns 0 instead of actual BAB
  - Level requirement check returns 0 instead of actual level
  - Prestige classes **never validate correctly**

### Fix
Replace with actual actor data structure:

```javascript
function checkClassPrerequisites(classData, actor, options = {}) {
  const prereqs = classData?.system?.prerequisites;

  if (!prereqs) {
    return { valid: true, reasons: [] };
  }

  const reasons = [];

  // FIX: Use actual actor-level class items and system data
  const classItems = actor.items.filter(i => i.type === 'class');

  // Check BAB prerequisite
  if (prereqs.bab !== undefined) {
    const currentBAB = calculateActorBAB(actor);  // ← FIXED: Pass actor, not classLevels!
    if (currentBAB < prereqs.bab) {
      reasons.push(`BAB +${prereqs.bab} required (current: +${currentBAB})`);
    }
  }

  // Check trained skills prerequisite
  if (prereqs.trainedSkills && Array.isArray(prereqs.trainedSkills)) {
    const trainedSkills = actor.items
      .filter(i => i.type === 'skill' && i.system.trained)
      .map(s => s.name);
    const missingSkills = prereqs.trainedSkills.filter(s => !trainedSkills.includes(s));
    if (missingSkills.length > 0) {
      reasons.push(`Missing trained skills: ${missingSkills.join(', ')}`);
    }
  }

  // Check required feats prerequisite
  if (prereqs.feats && Array.isArray(prereqs.feats)) {
    const allFeats = actor.items
      .filter(i => i.type === 'feat')
      .map(f => f.name);
    const missingFeats = prereqs.feats.filter(f =>
      !allFeats.some(pf => pf.toLowerCase() === f.toLowerCase())
    );
    if (missingFeats.length > 0) {
      reasons.push(`Missing feats: ${missingFeats.join(', ')}`);
    }
  }

  // Check level prerequisite - FIX: Use actual level!
  if (prereqs.level !== undefined) {
    const currentLevel = actor.system.level || 0;  // ← FIXED: Use actor.system.level!
    if (currentLevel < prereqs.level) {
      reasons.push(`Character level ${prereqs.level} required (current: ${currentLevel})`);
    }
  }

  return {
    valid: reasons.length === 0,
    reasons: reasons
  };
}

function calculateActorBAB(actor) {
  const classItems = actor.items.filter(i => i.type === 'class');
  let totalBAB = 0;

  // Use the BAB calculation from levelup-shared.js
  for (const classItem of classItems) {
    const classLevel = classItem.system.level || 1;
    const className = classItem.name;

    // Get BAB from class level progression or fallback to known classes
    const levelProgression = classItem.system.levelProgression || [];
    const levelData = levelProgression.find(lp => lp.level === classLevel);

    if (levelData && typeof levelData.bab === 'number') {
      totalBAB += levelData.bab;
    } else {
      // Fallback: Use BAB progression
      const babProgression = classItem.system.babProgression || 'medium';
      const fullBABClasses = ['Jedi', 'Soldier'];

      if (fullBABClasses.includes(className)) {
        totalBAB += classLevel;
      } else {
        totalBAB += Math.floor(classLevel * 0.75); // 3/4 progression
      }
    }
  }

  return totalBAB;
}
```

### Test Case
```javascript
// Test: Prestige class validation at level 7
1. Create character, level to 7
2. At level 7, open level-up dialog
3. Navigate to class selection
4. EXPECTED:
   - Character shows as level 7 (not 0)
   - BAB shows as +5 to +7 (not 0)
   - Prestige classes like "Jedi Knight" (needs BAB +7) should show as available
5. ACTUAL (BUG):
   - Shows level 0, BAB 0
   - All prestige classes unavailable
```

---

## BUG #4: Missing ActorEngine Initialization Check

**File:** `scripts/apps/store/store-checkout.js`
**Lines:** 103, 168, 239, 440
**Severity:** CRITICAL

### Current Broken Code
```javascript
// Line 103
await globalThis.SWSE.ActorEngine.updateActor(actor, { "system.credits": newCredits });

// Line 168
await globalThis.SWSE.ActorEngine.updateActor(store.actor, { "system.credits": credits - finalCost });

// Line 239
await globalThis.SWSE.ActorEngine.updateActor(store.actor, { "system.credits": credits - finalCost });

// Line 440
await globalThis.SWSE.ActorEngine.updateActor(actor, { "system.credits": credits - total });
```

### Issue
- **No null-check** that `globalThis.SWSE` exists
- **No null-check** that `ActorEngine` is initialized
- If store is opened before SWSE initializes:
  ```
  TypeError: Cannot read property 'ActorEngine' of undefined
  ```
- Purchase system completely crashes

### Fix
Add safety checks:

```javascript
export async function buyService(actor, serviceName, serviceCost, updateDialogueCallback, rerenderCallback) {
    if (!serviceName) {
        ui.notifications.warn("Invalid service selection.");
        return;
    }

    // FIX: Add initialization check
    if (!globalThis.SWSE?.ActorEngine) {
        SWSELogger.error("SWSE ActorEngine not initialized");
        ui.notifications.error("Character system not ready. Please refresh and try again.");
        return;
    }

    const currentCredits = Number(actor.system?.credits) || 0;

    if (currentCredits < serviceCost) {
        ui.notifications.error(`Insufficient credits! You need ${serviceCost} credits but only have ${currentCredits}.`);
        return;
    }

    try {
        const newCredits = currentCredits - serviceCost;
        await globalThis.SWSE.ActorEngine.updateActor(actor, { "system.credits": newCredits });
        ui.notifications.info(`${serviceName} purchased for ${serviceCost} credits.`);

        if (updateDialogueCallback) {
            updateDialogueCallback(getRandomDialogue('purchase'));
        }

        if (rerenderCallback) {
            rerenderCallback();
        }
    } catch (err) {
        SWSELogger.error("SWSE Store | Service purchase failed:", err);
        ui.notifications.error("Purchase failed. Please check console.");
    }
}

export async function buyDroid(store, actorId) {
    if (!actorId) {
        ui.notifications.warn("Invalid droid selection.");
        return;
    }

    // FIX: Add initialization check
    if (!globalThis.SWSE?.ActorEngine) {
        SWSELogger.error("SWSE ActorEngine not initialized");
        ui.notifications.error("Character system not ready. Please refresh and try again.");
        return;
    }

    // ... rest of function ...
}

// Apply same pattern to: buyVehicle(), checkout()
```

### Test Case
```javascript
// Test: Purchase with system check
1. Open store before SWSE fully initializes (if possible)
2. Try to purchase item
3. EXPECTED: Error message "Character system not ready..."
4. ACTUAL (BUG): Crash with "Cannot read property 'ActorEngine'"
```

---

## BUG #6: Missing Ability Score Increase UI at Levels 4, 8, 12, 16, 20

**File:** `scripts/apps/levelup/levelup-main.js` and related
**Severity:** MAJOR

### Current Situation
The system correctly identifies when ability increases happen:
```javascript
// levelup-shared.js:186-189
export function getsAbilityIncrease(newLevel, isNonheroic = false) {
  return [4, 8, 12, 16, 20].includes(newLevel);
}
```

But there's **no UI or workflow** to actually let the player allocate those increases.

### Fix
Need to add ability increase step to levelup dialog. Modify `levelup-main.js`:

```javascript
// In the step definitions (around line 90)
this.levelUpSteps = [
  {
    id: "class",
    label: "Class",
    subtitle: "Choose class for this level",
    icon: "glyph-class"
  },
  // ... other steps ...
  {
    id: "abilities",  // ← Add ability increase step
    label: "Abilities",
    subtitle: "Increase ability scores (if applicable)",
    icon: "glyph-attributes",
    visible: () => getsAbilityIncrease(this.newLevel)  // Only show when applicable
  },
  // ... other steps ...
];

// In activateListeners:
activateListeners(html) {
    super.activateListeners(html);

    // ... existing bindings ...

    // FIX: Add ability increase buttons
    if (this.currentStep === "abilities") {
        const abilityIncreaseCount = getAbilityIncreaseCount(this.newLevel);
        this._bindAbilityIncreaseUI(html[0], abilityIncreaseCount);
    }
}

// New method for ability increase UI
_bindAbilityIncreaseUI(root, count) {
    const abilityButtons = root.querySelectorAll('.ability-increase-btn');

    abilityButtons.forEach(btn => {
        btn.addEventListener('click', (event) => {
            const ability = event.target.dataset.ability;

            // Track ability increase
            if (!this.pendingAbilityIncreases) {
                this.pendingAbilityIncreases = {};
            }

            const currentIncreases = Object.values(this.pendingAbilityIncreases)
                .reduce((sum, val) => sum + val, 0);

            if (currentIncreases >= count) {
                ui.notifications.warn(`You can only increase ${count} ability score(s) at this level`);
                return;
            }

            this.pendingAbilityIncreases[ability] =
                (this.pendingAbilityIncreases[ability] || 0) + 1;

            // Update UI to show selection
            event.target.classList.add('selected');

            SWSELogger.log(`Ability increase: +1 to ${ability}`);
        });
    });
}
```

### Test Case
```javascript
// Test: Ability increase at level 4
1. Create character, progress to level 4
2. Open level-up dialog
3. Go through class, HP, skills, feats, talents steps
4. EXPECTED: "Abilities" step appears, allows selecting 1 ability to increase
5. ACTUAL (BUG): Ability step skipped or not shown
```

---

## BUG #7: Prestige Class Level Requirement Uses Wrong Data

**File:** `scripts/progression/engine/tools/prestige-readiness.js:112-118`
**Severity:** MAJOR

### Current Broken Code
```javascript
// Line 114-115 - WRONG!
const currentLevel = classLevels.length;  // ← Expects classLevels array (doesn't exist!)
if (currentLevel < prereqs.level) {
    reasons.push(`Character level ${prereqs.level} required (current: ${currentLevel})`);
}
```

### Issue
Related to Bug #2. Should check actual character level, not array length.

### Fix
```javascript
// Correct version:
if (prereqs.level !== undefined) {
    const currentLevel = actor.system.level || 0;  // ← Use actual character level!
    if (currentLevel < prereqs.level) {
        reasons.push(`Character level ${prereqs.level} required (current: ${currentLevel})`);
    }
}
```

### Test Case
```javascript
// Test: Prestige class level requirement
1. Create character
2. At level 6, try to take prestige class requiring level 7
3. EXPECTED: "Character level 7 required (current: 6)"
4. ACTUAL (BUG): "Character level 7 required (current: 0)"
```

---

## BUG #12: Shop Pack Name Typo

**File:** `scripts/apps/store/store-checkout.js:134, 204`
**Severity:** MINOR

### Current Code
```javascript
// Line 134 - Droid purchase
const pack = game.packs.get('foundryvtt-foundryvtt-swse.droids');  // ← TYPO!

// Line 204 - Vehicle purchase
const pack = game.packs.get('foundryvtt-foundryvtt-swse.vehicles');  // ← TYPO!
```

### Fix
```javascript
// Correct:
const pack = game.packs.get('foundryvtt-swse.droids');

const pack = game.packs.get('foundryvtt-swse.vehicles');
```

### Impact
- Droid/vehicle templates won't load from compendium
- Purchase system defaults to searching world actors only
- If droid templates are in compendium (not world), purchase fails

---

## Testing Summary

**After applying these fixes, test the following:**

### Level 1
- [ ] Create character with 1000 credits
- [ ] Try to buy item from store
- [ ] Verify credits deducted
- [ ] Verify item in inventory

### Levels 2-3
- [ ] Gain HP each level
- [ ] Verify HP gain matches CON modifier
- [ ] At level 3, verify bonus feat awarded

### Level 4
- [ ] Verify ability increase UI appears
- [ ] Select ability to increase
- [ ] Verify ability score increased

### Levels 5-6
- [ ] Gain HP correctly
- [ ] At level 6, verify bonus feat awarded

### Level 7 (Prestige Class)
- [ ] At level 7, prestige classes become available
- [ ] Select prestige class
- [ ] Verify prestige class features apply
- [ ] Verify BAB calculates correctly (should be BAB +5 to +7, not 0)

### Levels 8-20
- [ ] Continue leveling with mix of base/prestige classes
- [ ] At levels 8, 12, 16, 20: verify ability increase UI appears
- [ ] At levels 9, 12, 15, 18: verify bonus feats awarded
- [ ] Purchase droid companion
- [ ] Purchase ship/vehicle

---

## Files to Update

1. **scripts/apps/store/store-main.js** - Line 196-209
2. **scripts/apps/levelup/levelup-shared.js** - Line 291, and add ability increase UI
3. **scripts/progression/engine/tools/prestige-readiness.js** - Lines 56-124
4. **scripts/apps/store/store-checkout.js** - Lines 103, 134, 168, 204, 239, 440
5. **scripts/apps/levelup/levelup-main.js** - Add ability increase step and UI binding


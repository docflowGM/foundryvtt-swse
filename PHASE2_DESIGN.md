# Droid Builder V2 — Phase 2 Design: System Selection UI/UX

**Goal:** Extend Phase 1 skeleton to allow full droid configuration.
**Scope:** Locomotion → Manipulators → Processor → Sensors → Armor → Weapons → Accessories.
**Constraints:** Mechanics only, no narration, budget-driven, validation at every step.

---

## 📊 Step Sequence

### Phase 1 (Existing)
```
Intro (degree/size) → Review → Finalize
```

### Phase 2 Extension
```
Intro (degree/size)
  → Locomotion selection
  → Manipulator selection (1+)
  → Processor selection
  → Sensor selection (0+)
  → Armor selection
  → Weapon selection (0+)
  → Accessory selection (0+)
  → Final Review
  → Finalize
```

Each step **mutates** `actor.system.droidSystems` and **validates** immediately.

---

## 🎯 Step Structure (Template for Each System Type)

### Base Step Pattern

```
┌─ STEP HEADER ─────────────────────────────────┐
│ Step 5/8: Sensors                             │
│ Degree: Second-Degree | Size: Medium          │
└────────────────────────────────────────────────┘

┌─ BUDGET BAR ──────────────────────────────────┐
│ Credits Spent: 850 / 2000  [████░░░░░░░░░░░░] │
│ Remaining: 1150 credits                       │
└────────────────────────────────────────────────┘

┌─ AVAILABLE ITEMS ─────────────────────────────┐
│ [ ] Optical Sensors        [350 credits]     │
│ [ ] Thermal Imaging        [500 credits]     │
│ [ ] Motion Detector        [250 credits]     │
│ [ ] Radiation Detector     [400 credits] ×   │
│     (insufficient credits)                   │
└────────────────────────────────────────────────┘

┌─ SELECTED ITEMS ──────────────────────────────┐
│ ✓ Optical Sensors          [350 credits]     │
│   [Remove]                                    │
└────────────────────────────────────────────────┘

┌─ ACTIONS ─────────────────────────────────────┐
│ [← Back] [Skip] [Next →] [Finalize]           │
└────────────────────────────────────────────────┘
```

---

## 📋 Step-by-Step Breakdown

### **Step 1: Locomotion Selection** (Required, 1 only)

**Rules:**
- User selects exactly one locomotion system
- Cannot proceed without selection
- Mutates `actor.system.droidSystems.locomotion`

**Available Items:**
```javascript
[
  { id: "treads", name: "Treads", cost: 200, speed: 20 },
  { id: "wheels", name: "Wheels", cost: 150, speed: 25 },
  { id: "legs", name: "Legs", cost: 300, speed: 20 },
  { id: "hover", name: "Hover Repulsors", cost: 450, speed: 30 },
  { id: "flight", name: "Flight Servos", cost: 600, speed: 40 }
]
```

**UI State:**
- Radio buttons (single select)
- Show speed bonus
- Show cost impact on budget
- Selected item highlighted
- "Next" button only enabled when one is selected

**Validation:**
- Exactly one required
- Cost must fit budget
- Blocks progression if invalid

**Data Mutation:**
```javascript
actor.system.droidSystems.locomotion = {
  id: "wheels",
  name: "Wheels",
  cost: 150,
  speed: 25
}
```

---

### **Step 2: Manipulator Selection** (Required, 1+)

**Rules:**
- User selects one or more manipulators (hands, tentacles, etc.)
- Minimum 2 (enforced by validation)
- Maximum varies by degree (3rd: 4, 2nd: 6, 1st: 8)
- Mutates `actor.system.droidSystems.appendages`

**Available Items:**
```javascript
[
  { id: "hand", name: "Manipulator Hand", cost: 150, dexBonus: 1 },
  { id: "gripper", name: "Gripper Claw", cost: 100, dexBonus: 0 },
  { id: "tentacle", name: "Tentacle", cost: 200, dexBonus: 2 },
  { id: "saw", name: "Cutting Saw", cost: 300, dexBonus: 0 },
  { id: "probe", name: "Probe Arm", cost: 120, dexBonus: 0 }
]
```

**UI State:**
- Checkboxes (multi-select)
- Show count: "Selected: 2/6 allowed"
- Show cost per item + running total
- Disable if count would exceed maximum
- Disable if would exceed budget
- "Next" only enabled if 1+ selected and valid

**Validation:**
- Minimum 1 (enforced at finalization)
- Maximum per degree (enforced live)
- Cost must fit budget
- Blocks progression if invalid

**Data Mutation:**
```javascript
actor.system.droidSystems.appendages = [
  { id: "hand", name: "Manipulator Hand", cost: 150 },
  { id: "tentacle", name: "Tentacle", cost: 200 }
]
```

---

### **Step 3: Processor Selection** (Required, 1 only)

**Rules:**
- User selects exactly one processor
- Affects skill bonuses
- Cannot proceed without selection

**Available Items:**
```javascript
[
  { id: "simple", name: "Simple Processor", cost: 200, skillBonus: 0 },
  { id: "standard", name: "Standard Processor", cost: 350, skillBonus: 1 },
  { id: "advanced", name: "Advanced Processor", cost: 600, skillBonus: 2 },
  { id: "elite", name: "Elite Processor", cost: 1000, skillBonus: 3 }
]
```

**UI State:**
- Radio buttons (single select)
- Show skill bonus
- Selected highlighted
- "Next" only enabled when one is selected

**Data Mutation:**
```javascript
actor.system.droidSystems.processor = {
  id: "standard",
  name: "Standard Processor",
  cost: 350,
  bonus: 1
}
```

---

### **Step 4: Sensor Selection** (Optional, 0+)

**Rules:**
- User selects zero or more sensors
- No maximum (but budget-limited)
- Can skip this step entirely

**Available Items:**
```javascript
[
  { id: "optical", name: "Optical Sensors", cost: 350, searchBonus: 1 },
  { id: "thermal", name: "Thermal Imaging", cost: 500, searchBonus: 2 },
  { id: "motion", name: "Motion Detector", cost: 250, searchBonus: 1 },
  { id: "radiation", name: "Radiation Detector", cost: 400, searchBonus: 1 },
  { id: "olfactory", name: "Olfactory Sensors", cost: 150, searchBonus: 1 }
]
```

**UI State:**
- Checkboxes (multi-select)
- Show bonus per item
- "Skip" button available (proceed with 0 sensors)
- "Next" enabled if valid (any state including empty)

**Data Mutation:**
```javascript
actor.system.droidSystems.accessories.push({
  id: "optical",
  name: "Optical Sensors",
  cost: 350
})
// Note: This is cumulative per step
```

---

### **Step 5: Armor Selection** (Required, 1 only)

**Rules:**
- User selects exactly one armor type
- Affects defense
- Cannot skip

**Available Items:**
```javascript
[
  { id: "light", name: "Light Armor", cost: 150, defenseBonus: 1 },
  { id: "medium", name: "Medium Armor", cost: 300, defenseBonus: 2 },
  { id: "heavy", name: "Heavy Armor", cost: 500, defenseBonus: 3 },
  { id: "reinforced", name: "Reinforced Plating", cost: 800, defenseBonus: 4 }
]
```

**UI State:**
- Radio buttons (single select)
- Show defense bonus
- Selected highlighted

**Data Mutation:**
```javascript
actor.system.droidSystems.armor = {
  id: "medium",
  name: "Medium Armor",
  cost: 300,
  bonus: 2
}
```

---

### **Step 6: Weapon Selection** (Optional, 0+)

**Rules:**
- User selects zero or more weapons
- Budget-limited
- Can skip entirely

**Available Items:**
```javascript
[
  { id: "blaster", name: "Blaster Pistol", cost: 400, damage: "3d6" },
  { id: "rifle", name: "Blaster Rifle", cost: 600, damage: "4d6" },
  { id: "laser", name: "Laser Cannon", cost: 1000, damage: "5d6" },
  { id: "flamer", name: "Flamethrower", cost: 800, damage: "4d6" }
]
```

**UI State:**
- Checkboxes (multi-select)
- Show damage output
- "Skip" button available
- "Next" enabled if valid (including empty)

**Data Mutation:**
```javascript
actor.system.droidSystems.weapons = [
  { id: "blaster", name: "Blaster Pistol", cost: 400 }
]
```

---

### **Step 7: Accessory/Enhancement Selection** (Optional, 0+)

**Rules:**
- User selects zero or more accessories
- Budget-limited
- Can skip entirely
- This is the final system selection step

**Available Items:**
```javascript
[
  { id: "holo", name: "Holographic Projector", cost: 200 },
  { id: "comlink", name: "Enhanced Comlink", cost: 100 },
  { id: "medical", name: "Medical Kit", cost: 300 },
  { id: "toolKit", name: "Repair Tool Kit", cost: 250 },
  { id: "translation", name: "Translation Matrix", cost: 150 }
]
```

**UI State:**
- Checkboxes (multi-select)
- "Skip" button available
- "Next" enabled if valid (including empty)

**Data Mutation:**
```javascript
actor.system.droidSystems.accessories = [
  { id: "holo", name: "Holographic Projector", cost: 200 },
  { id: "comlink", name: "Enhanced Comlink", cost: 100 }
]
```

---

### **Step 8: Final Review** (Summary before finalize)

**Content:**
```
┌─ DROID CONFIGURATION SUMMARY ─────────┐
│ Degree: Second-Degree                 │
│ Size: Medium                          │
│                                       │
│ Locomotion: Wheels [25 speed]         │
│ Manipulators: Hand, Tentacle          │
│ Processor: Standard Processor [+1]    │
│ Sensors: Optical Sensors              │
│ Armor: Medium Armor [+2 defense]      │
│ Weapons: Blaster Pistol               │
│ Accessories: Holographic Projector    │
│                                       │
│ TOTAL COST: 1850 / 2000 credits       │
│ REMAINING: 150 credits                │
│                                       │
│ [✓ Valid configuration]               │
└───────────────────────────────────────┘
```

**Actions:**
- `[← Back]` — Edit previous step
- `[✓ Finalize]` — Save to actor

**Validation State:**
- Show any remaining validation errors
- Only allow finalize if valid
- If back-edited, re-validate

---

## 🧭 Navigation Rules

### Forward Flow
- User clicks "Next" → Validate current step → If valid, advance
- If invalid, show errors, **stay on step**
- Cannot skip ahead

### Backward Flow
- User clicks "Back" → Return to previous step
- Previous selections preserved
- Can re-select items
- When user changes previous step, all downstream steps **stay selected** but re-validate

### Budget Constraint
- If user goes back and changes selection, budget may change
- If new budget state makes downstream selections invalid, show warnings on Final Review
- Final Review shows all errors before finalize

---

## 💾 Data Mutation Pattern (Same Across All Steps)

Each step follows this pattern:

```javascript
// In _onNextStep(step) or similar
async _finishStep(step) {
  // 1. Validate current step state
  const validation = DroidValidationEngine.validateStep(step, this.droidSystems);

  if (!validation.valid) {
    ui.notifications.warn(validation.errors.join('; '));
    return;
  }

  // 2. Update droidSystems in-memory
  this.droidSystems = this._applyStepSelection(step, this.droidSystems);

  // 3. Calculate budget
  this.droidSystems.credits = DroidValidationEngine.calculateBudget(this.droidSystems);

  // 4. Move to next step
  this.currentStep = this._getNextStep(step);
  await this.render(true);
}
```

**Key:** Never mutate actor until final "Finalize" button. Only mutate in-memory droidSystems.

---

## 🎨 UI Kit Decisions

### Item Display Format

**Compact (for weapons/accessories):**
```
[☑] Blaster Pistol [400 credits]
```

**Detailed (for main systems):**
```
[☑] Blaster Pistol
    Damage: 3d6
    Cost: 400 credits
    [Remove]
```

### Budget Display

Always visible at top of every step:
```
Spent: 850 / 2000  [████░░░░░░░░░░░░]
Remaining: 1150 credits
```

Color coding:
- Green: 50%+ remaining
- Yellow: 25-50% remaining
- Red: < 25% remaining

### Validation Errors

Inline per step:
```
⚠ Cannot add Radiation Detector (400 credits)
  Budget exceeded. You have 380 remaining.
```

### Unavailable Items

Shown but disabled:
```
[ ] Radiation Detector (400 credits) ✗
    Insufficient credits
```

---

## 🚀 Implementation Sequence (For Phase 2 Dev)

This design is ordered for safe incremental coding:

1. **Step 1 (Locomotion):** Simple radio button, proves pattern
2. **Step 2 (Manipulators):** First multi-select, proves array mutations
3. **Step 3 (Processor):** Second radio, confirms pattern
4. **Steps 4-7:** Repeat steps 2 or 3 pattern (optional or multi)
5. **Step 8 (Review):** Summary display + error handling
6. **Backward navigation:** Add "Back" button logic
7. **Budget recalculation:** Full budget tracking across edits

Each can be coded, tested, and reviewed independently.

---

## ⚠️ Constraints & Rules (Hardened)

### Mutation Boundaries
- Only mutate `actor.system.droidSystems` on final "Finalize"
- All step navigation works on in-memory copy only
- If user closes window mid-build, changes are lost (correct behavior)

### Validation Always Runs
- After each step selection
- Before progression
- Before finalize
- If user goes back and re-edits, re-validate all downstream

### Budget Enforcement
- No item can be added if cost exceeds remaining
- Budget recalculated after each step
- Final review shows total

### Degree Constraints
- Manipulator count enforced per degree
- Sensor/weapon/accessory counts budget-limited only
- No degree-based restrictions elsewhere

### No Narration
- Step headers are mechanical: "Step 3/8: Processor"
- Item descriptions are stat-only
- No flavor text, no jokes, no Seraphim yet

---

## 📝 Notes for Code Review

Before Phase 2 implementation starts:

- [ ] Confirm step order makes sense
- [ ] Confirm item costs are reasonable (placeholder values above)
- [ ] Confirm required vs optional per step is correct
- [ ] Confirm backward navigation preserves intent
- [ ] Confirm budget display is clear
- [ ] Confirm validation error messages are helpful
- [ ] Confirm "Skip" vs "Next" vs "Back" buttons are right

---

## Next: Code Implementation

Once this design is approved:

1. Expand `droid-builder-app.js` with full step logic
2. Create `droid-builder-step.hbs` template per step (or single template with step variations)
3. Add step-specific validation to `DroidValidationEngine`
4. Test each step independently before moving to next
5. Integration test full build flow

This design is intentionally detailed enough to code from, but abstract enough to adjust before implementation starts.

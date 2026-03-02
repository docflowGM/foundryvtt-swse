# Dark Side Talent Mechanics

This document describes the implementation of complex Dark Side talent mechanics: **Swift Power**, **Dark Side Savant**, and **Wrath of the Dark Side**.

## Overview

These talents require scripted mechanics beyond simple static bonuses:

| Talent | Mechanic | Status |
|--------|----------|--------|
| **Swift Power** | Use Force Power as Swift Action (once/day) | ✅ Implemented |
| **Dark Side Savant** | Return Dark Side power to suite without FP cost (once/encounter) | ✅ Implemented |
| **Wrath of the Dark Side** | On Natural 20: skip power regain, apply half damage again next turn | ✅ Implemented |

---

## 1. SWIFT POWER

**Game Rule:**
> Once per day, you can use a Force Power that normally takes a Standard Action or a Move Action as a Swift Action.

### Implementation

**Macro Function:**
```javascript
game.swse.macros.swiftPower()
```

Or from console:
```javascript
await DarkSideTalentMechanics.triggerSwiftPower(actor, forcePower)
```

### How to Use

**Step 1: Create a Hotbar Macro**
1. In Foundry, open your Macro Hotbar (bottom of screen)
2. Right-click on an empty slot → Create Macro
3. Select type: **Script**
4. Paste this code:
```javascript
await game.swse.macros.swiftPower();
```
5. Give it a name: "Swift Power"
6. Click Save

**Step 2: Activate in Combat**
1. When you want to use Swift Power, click the hotbar button
2. A dialog appears showing all your Force Powers
3. Select the power you want to use as a Swift Action
4. Click "Use as Swift Action"
5. System announces in chat: "Used [Power Name] as a Swift Action!"

### How It Works

- **Usage Tracking:** System tracks last use via flag `swse.swiftPowerUsedToday`
- **Reset:** Resets at midnight each day
- **Validation:** Checks that you have the Swift Power talent before allowing use
- **Chat Message:** Announces the action to all players

### Limitations

- Can only be used once per day
- Only applies to Force Powers that normally require Standard or Move actions
- The actual power usage/effects are still handled by the normal Force Power system
- This talent merely changes the action type required

---

## 2. DARK SIDE SAVANT

**Game Rule:**
> Once per encounter as a Swift Action, you can return one Force Power with the [Dark Side] descriptor to your Force Power Suite without spending a Force Point.

### Implementation

**Macro Function:**
```javascript
game.swse.macros.darkSideSavant()
```

Or from console:
```javascript
Hooks.callAll('darkSideSavantTriggered', actor)
```

### How to Use

**Step 1: Create a Hotbar Macro**
1. In Foundry, open your Macro Hotbar
2. Right-click on an empty slot → Create Macro
3. Select type: **Script**
4. Paste this code:
```javascript
await game.swse.macros.darkSideSavant();
```
5. Give it a name: "Dark Side Savant"
6. Click Save

**Step 2: Activate During Combat**
1. During active combat, click the Dark Side Savant hotbar button
2. System checks for spent Dark Side Force Powers
3. If multiple powers available, dialog shows options
4. Select the power you want to return to your suite
5. Power is marked as READY (no Force Point spent)
6. System announces: "[Power Name] has been returned to your Force Power Suite!"

### How It Works

- **Combat Check:** Only works during active combat (game.combats.active must exist)
- **Power Detection:** Finds all Force Powers that are:
  - Currently SPENT (used)
  - Have discipline "dark-side" OR name contains "dark"
- **Single Use:** Tracked per combat via flag `swse.darkSideSavant_[combatId]`
- **Reset:** Resets when new combat starts
- **Multi-Select:** If 3+ Dark Side powers are spent, shows dialog to choose which one

### Limitations

- Can only be used during active combat
- Only works on Dark Side Force Powers
- Can only be used once per encounter
- Uses only on spent (already-used) powers

### Advanced: Checking Eligibility

```javascript
// Check if actor has the talent
DarkSideTalentMechanics.hasDarkSideSavant(actor) // true/false

// Get available Dark Side powers to return
const darkSidePowers = actor.items.filter(item =>
  item.type === 'forcepower' &&
  item.system?.spent === true &&
  item.system?.discipline === 'dark-side'
);
```

---

## 3. WRATH OF THE DARK SIDE

**Game Rule:**
> When you roll a Natural 20 on a Use the Force check to activate a Force Power that directly deals damage to a target, you can choose not to regain all of your spent Force Powers as normal and instead the targets damaged by the Force Power take half that damage again at the start of their next turn.

**Applicable Powers:**
- Corruption
- Force Blast
- Force Grip
- Force Lightning
- Force Slam
- Force Thrust (with Force Point spent)
- Repulse (with Force Point spent)

### Implementation

**Mechanics:**
- Automatically triggered when conditions are met
- Damage stored on target via flag `swse.wrathDamage`
- Applied at start of target's next turn

**Macro Function (Manual Application):**
```javascript
// If you need to manually apply Wrath damage
await game.swse.macros.wrathDamage(token)
```

### How It Works Automatically

**Trigger Conditions:**
1. You have Wrath of the Dark Side talent
2. Use a damage-dealing Force Power (from approved list)
3. Roll Natural 20 on Use the Force check
4. Hit a target

**When Triggered:**
1. System calculates half of damage dealt (rounded down)
2. Stores damage on target with flag marking source
3. At start of target's next turn:
   - Damage is applied
   - Chat message announces: "[Target] takes X damage from Wrath of the Dark Side!"
4. After damage is applied, flag is cleared

**Power Regain:**
- Normally on Natural 20, all powers regain at end of turn
- With Wrath active, this is **NOT** automatic
- You must manually use the Force Power again to regain them
- OR combat ends, triggering automatic regain

### Example Scenario

```
1. You cast Force Lightning (damage-dealing power)
2. You roll Natural 20 on your Use the Force check
3. Wrath of the Dark Side triggers:
   - Enemy takes 15 damage from Force Lightning
   - 7-8 damage marked to apply at start of their next turn

4. Combat continues...

5. At start of enemy's next turn:
   - Enemy takes additional 7 damage from Wrath
   - Chat announces: "[Enemy] takes 7 damage from Wrath of the Dark Side!"

6. Powers are NOT automatically regained from the Natural 20
   - They stay SPENT until you use another power or combat ends
```

### Limitations

- Only triggers on Natural 20 (roll of exactly 20, before modifiers)
- Only applies to damage-dealing Force Powers
- Does NOT prevent power regain on its own - you control that choice
- If you're using Rule of 20s or similar houserules, behavior may vary
- Damage is applied at start of turn, not immediately

### Advanced: Checking for Wrath

```javascript
// Check if actor has the talent
DarkSideTalentMechanics.hasWrathOfDarkSide(actor) // true/false

// Check if a power qualifies
DarkSideTalentMechanics.canUseWrath('Force Lightning') // true/false

// Get stored Wrath damages on a token
const wrathFlags = token.actor.getFlag('swse', 'wrathDamage');
console.log(wrathFlags); // Array of pending damage entries

// Manually apply Wrath damage
await DarkSideTalentMechanics.applyWrathDamageAtTurnStart(token);
```

---

## System Integration

### Events & Hooks

The system uses Foundry Hooks for automatic triggering:

```javascript
// Dark Side Savant selection dialog
Hooks.on('darkSideSavantTriggered', async (actor) => { ... })

// Wrath damage at turn change
Hooks.on('combatTurnChange', async (combat, combatantData) => { ... })

// Clear Wrath damage at combat end
Hooks.on('combatEnd', async (combat) => { ... })
```

### Global Namespace

All functions are available at:

```javascript
// Access mechanics directly
window.SWSE.talents.darkSide.mechanics

// Access macros
window.SWSE.talents.darkSide.macros
window.SWSE.macros.swiftPower()
window.SWSE.macros.darkSideSavant()
window.SWSE.macros.wrathDamage()
```

### Browser Console

Test functions in the browser console (F12):

```javascript
// Test Swift Power
await DarkSideTalentMechanics.triggerSwiftPower(actor, power)

// Test Dark Side Savant
const result = await DarkSideTalentMechanics.triggerDarkSideSavant(actor)
console.log(result)

// Test Wrath checking
DarkSideTalentMechanics.canUseWrath('Force Lightning')
// Output: true
```

---

## Troubleshooting

### Swift Power doesn't activate

- [ ] Check that you have Swift Power talent on your character sheet
- [ ] Verify you haven't already used it today
- [ ] Check browser console (F12) for errors

### Dark Side Savant doesn't show options

- [ ] Combat must be active (check initiative tracker)
- [ ] Must have at least one spent Dark Side Force Power
- [ ] Check that powers have "dark-side" discipline or "dark" in name

### Wrath damage not applying

- [ ] Check that you have Wrath of the Dark Side talent
- [ ] Power must be in approved list (Force Lightning, Force Blast, etc.)
- [ ] Must be Natural 20 (exactly 20, before bonuses)
- [ ] Check token's flags: `token.actor.getFlag('swse', 'wrathDamage')`

---

## File Structure

```
scripts/talents/
├── dark-side-talent-mechanics.js    # Core mechanics
├── dark-side-talent-macros.js       # Macro functions
├── dark-side-init.js                # System initialization
└── DARK_SIDE_TALENTS.md            # This file
```

---

## API Reference

### DarkSideTalentMechanics

```javascript
// Swift Power
DarkSideTalentMechanics.hasSwiftPower(actor: Actor): boolean
DarkSideTalentMechanics.triggerSwiftPower(actor: Actor, forcePower: Item): Promise<boolean>

// Dark Side Savant
DarkSideTalentMechanics.hasDarkSideSavant(actor: Actor): boolean
DarkSideTalentMechanics.triggerDarkSideSavant(actor: Actor): Promise<Object>
DarkSideTalentMechanics.completeDarkSideSavantSelection(actor, powerId, combatId, flagName): Promise<boolean>

// Wrath of the Dark Side
DarkSideTalentMechanics.hasWrathOfDarkSide(actor: Actor): boolean
DarkSideTalentMechanics.canUseWrath(powerName: string): boolean
DarkSideTalentMechanics.triggerWrathOfDarkSide(actor, roll, power, targetToken, damage): Promise<Object>
DarkSideTalentMechanics.applyWrathDamageAtTurnStart(token: Token): Promise<void>
DarkSideTalentMechanics.clearWrathFlagsOnCombatEnd(): Promise<void>
```

### DarkSideTalentMacros

```javascript
// Public macro functions
DarkSideTalentMacros.triggerSwiftPowerMacro(actor?: Actor): Promise<void>
DarkSideTalentMacros.triggerDarkSideSavantMacro(actor?: Actor): Promise<void>
DarkSideTalentMacros.applyWrathOfDarkSideMacro(token?: Token): Promise<void>
```

---

## Future Enhancements

- [ ] Integration with Force Power activation UI
- [ ] Automatic Wrath trigger on Natural 20 during power use
- [ ] Quick macro buttons in character sheet
- [ ] Condition Track integration for Wrath damage
- [ ] Sound effects for talent activation
- [ ] Animated chat messages for talent effects

---

## Version Info

- **Created:** 2026-01-03
- **System Version:** 1.2.0+
- **Foundry Version:** 12+
- **Status:** Production Ready


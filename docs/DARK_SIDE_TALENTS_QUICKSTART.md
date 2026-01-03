# Dark Side Talents Quick-Start Guide

Quick setup guide for Swift Power, Dark Side Savant, and Wrath of the Dark Side talents.

## TL;DR - Setup in 2 Minutes

### For Swift Power

1. Create hotbar macro:
   ```javascript
   await game.swse.macros.swiftPower();
   ```
2. Click during combat to use a Force Power as a Swift Action (once per day)

### For Dark Side Savant

1. Create hotbar macro:
   ```javascript
   await game.swse.macros.darkSideSavant();
   ```
2. Click during combat to return a Dark Side power to your suite without spending FP (once per encounter)

### For Wrath of the Dark Side

- **Automatic!** No setup needed
- When you roll Natural 20 with Force Lightning, Force Blast, etc.
- Target takes half the damage again at start of next turn

---

## Detailed Setup

### Creating a Hotbar Macro

1. **Open Foundry** and go to your game world
2. **Look at the bottom of the screen** - you'll see the macro hotbar
3. **Right-click on an empty slot**
4. **Select "Create Macro"**
5. **Set Type to "Script"**
6. **Copy & paste the code** for the talent you want
7. **Give it a name** (e.g., "Swift Power")
8. **Click Save**

### Macro Codes to Copy

**Swift Power:**
```javascript
await game.swse.macros.swiftPower();
```

**Dark Side Savant:**
```javascript
await game.swse.macros.darkSideSavant();
```

**Wrath Damage (Optional - usually automatic):**
```javascript
await game.swse.macros.wrathDamage();
```

---

## Using Each Talent

### ⚡ Swift Power

**When to use:** During your turn in combat

1. Click the Swift Power macro
2. Select the Force Power you want to use
3. Click "Use as Swift Action"
4. Use that power as normal (it just costs a Swift Action instead of Standard/Move)

**Rules:**
- Once per day only
- Must have the Swift Power talent
- Resets at midnight

### 🌑 Dark Side Savant

**When to use:** During combat, when you have a spent Dark Side power you want back

1. Click the Dark Side Savant macro
2. If multiple spent powers available, select which one to return
3. Power goes back to READY status (doesn't cost a Force Point!)
4. Chat announces the effect

**Rules:**
- Combat must be active
- Only works on Dark Side Force Powers
- Once per encounter only
- Resets when new combat starts

### ☠️ Wrath of the Dark Side

**This happens automatically!**

When you:
1. Have Wrath of the Dark Side talent
2. Cast Force Lightning, Force Blast, Force Grip, Force Slam, Force Thrust, Repulse, or Corruption
3. Roll Natural 20 on your Use the Force check
4. Hit a target

Then:
- Target takes that damage as normal
- At the start of their next turn, they take half that damage again
- System announces the effect in chat

**No macro needed!** The system handles it automatically.

---

## Checking Your Setup

### Verify Scripts Loaded

Open browser console (press F12) and type:
```javascript
window.SWSE.talents.darkSide
```

Should output:
```
{mechanics: DarkSideTalentMechanics, macros: DarkSideTalentMacros}
```

If you see an error, check that you're in the Foundry world where the system is loaded.

### Test Swift Power

```javascript
DarkSideTalentMechanics.hasSwiftPower(game.user.character)
```

Should output: `true` if you have the talent, `false` if not

### Test Dark Side Savant

```javascript
DarkSideTalentMechanics.hasDarkSideSavant(game.user.character)
```

Should output: `true` if you have the talent

### Test Wrath Checking

```javascript
DarkSideTalentMechanics.canUseWrath('Force Lightning')
```

Should output: `true` (this power qualifies for Wrath)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Macro button doesn't appear | Reload Foundry (F5) to load system |
| "You don't have this talent" | Add talent to character sheet |
| Dark Side Savant says "no combat" | Must be during active combat |
| Wrath damage doesn't apply | Power must be in approved list, must be Nat 20 |

---

## What Counts as "Natural 20"?

**Natural 20 means:** You rolled a 20 on the d20, before any bonuses.

Examples:
- ✅ Roll 20 + 5 bonus = 25 total → **Triggers Wrath**
- ✅ Roll 20 + 0 bonus = 20 total → **Triggers Wrath**
- ❌ Roll 19 + 2 bonus = 21 total → Does **NOT** trigger Wrath

---

## Wrath Applicable Powers

These Force Powers trigger Wrath of the Dark Side on Natural 20:

- Corruption
- Force Blast
- Force Grip
- Force Lightning
- Force Slam
- Force Thrust (when Force Point is spent)
- Repulse (when Force Point is spent)

---

## Need Help?

See the full documentation at: `scripts/talents/DARK_SIDE_TALENTS.md`

This has:
- Detailed mechanics explanations
- Advanced API usage
- Integration details
- Complete troubleshooting guide

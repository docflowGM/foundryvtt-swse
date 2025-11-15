# Skills & Feat Actions - Player & GM Guide

## 🎯 Overview

This system provides automated skill bonuses, feat-granted combat actions, and skill substitution capabilities for the Star Wars Saga Edition system in Foundry VTT.

---

## 📚 Table of Contents

1. [Skill System](#skill-system)
2. [Skill Substitution](#skill-substitution)
3. [Feat Actions](#feat-actions)
4. [Automated Bonuses](#automated-bonuses)
5. [Examples](#examples)

---

## 💪 Skill System

### Skill Formula

```
Total = Ability Modifier + Half Level + Trained (+5) + Focus (+5) + Misc
```

### Skill Row Layout

```
[🎲 Roll] [+15] = [Ability Dropdown] [Trained ☑] [Focus ☑] + [Misc: +2]
```

### Fields Explained

| Field | Description | How It Works |
|-------|-------------|--------------|
| **Roll Button** | Click to roll the skill check | Rolls 1d20 + total modifier |
| **Total** | Your complete skill modifier | Automatically calculated |
| **Ability Dropdown** | Select which ability modifier to use | Defaults to normal (e.g., DEX for Acrobatics) |
| **Trained Checkbox** | Are you trained in this skill? | +5 bonus when checked |
| **Focus Checkbox** | Do you have Skill Focus? | +5 bonus when checked |
| **Misc Input** | Miscellaneous bonuses | Auto-populated by feat bonuses |

### All Skills Displayed

- ✅ All 18 skills shown (even untrained)
- ✅ All 7 Knowledge sub-skills listed individually
- ❌ Use the Force only shows if Force Sensitive

---

## 🔄 Skill Substitution

Some feats and talents allow you to use one skill instead of another. Simply **change the ability dropdown** to the appropriate ability!

### Common Substitutions

| Feat/Talent | Normal Skill | Substitute Ability | How to Use |
|-------------|--------------|-------------------|------------|
| **Force Pilot** | Pilot (DEX) | Use the Force (CHA) | Change Pilot dropdown to CHA |
| **Force Persuasion** | Persuasion (CHA) | Use the Force (CHA) | Already CHA, but represents Force influence |
| **Force Perception** | Perception (WIS) | Use the Force (CHA) | Change Perception dropdown to CHA |
| **Hotwire** | Use Computer (INT) | Mechanics (INT) | Change Use Computer dropdown (both INT anyway) |
| **Watchful Step** | Initiative (DEX) | Perception (WIS) | Change Initiative dropdown to WIS |

### Example: Force Pilot Talent

1. Character has **Use the Force** with +12 modifier (CHA-based)
2. Character has **Pilot** skill normally using DEX (+2)
3. Select **Force Pilot** talent
4. Go to Skills tab → **Pilot** skill
5. **Change dropdown from DEX to CHA**
6. Pilot now uses +12 instead of +2!

**Benefits:**
- ✅ No complex automation needed
- ✅ Player chooses when to use it
- ✅ Transparent and intuitive
- ✅ Can switch back if needed

---

## ⚔️ Feat Actions

Feat Actions are **special combat abilities** unlocked by owning specific feats. They appear in the **Combat Tab** under "Feat Actions".

### Action Types

#### 1. **Toggleable Actions** ✨

**Turn on/off with a click** - bonuses apply automatically via Active Effects

| Feat | Action Type | Effect | When to Use |
|------|-------------|--------|-------------|
| **Defensive Fighting** | Swift | +2 Reflex, -2 Attack | When you need defense over offense |
| **Total Defense** | Standard | +2 to all defenses | When you're heavily outnumbered |

**How to Use:**
1. Go to **Combat Tab**
2. Find feat under **Toggleable** section
3. Click the **toggle button** (🔘 / 🔳)
4. Effects apply immediately!
5. Click again to turn off

#### 2. **Variable Effects (Sliders)** 🎚️

**Adjust intensity with a slider** - trade attack for damage and vice versa

| Feat | Range | Effect | Use Case |
|------|-------|--------|----------|
| **Power Attack** | -1 to -5 | Trade -{X} attack for +{2X} damage | High AC enemies |
| **Power Attack (Advanced)** | -1 to -10 | Trade -{X} attack for +{2X} damage | BAB +4 required |

**How to Use:**
1. Go to **Combat Tab**
2. Find feat under **Variable Effects** section
3. **Drag the slider** to desired value
4. Example: Slider at -3 = -3 attack, +6 damage
5. Effects apply automatically!

#### 3. **Passive Benefits** 🌟

**Always active** - no action needed

| Feat | Benefit |
|------|---------|
| **Dodge** | +1 Reflex Defense |
| **Combat Reflexes** | Extra attacks of opportunity = DEX modifier |

#### 4. **Reaction Actions** ⚡

**Triggered by specific events** - use when conditions met

| Feat | Trigger | Effect |
|------|---------|--------|
| **Cleave** | Drop enemy to 0 HP with melee | Immediate melee attack vs adjacent enemy |

#### 5. **Full-Round Actions** 🎯

**Take your full round** - powerful but limits other actions

| Feat | Effect |
|------|--------|
| **Rapid Shot** | Extra ranged attack, all attacks at -2 |

---

## 🤖 Automated Bonuses

The following feats automatically apply bonuses - **no manual tracking needed!**

### Defense Bonuses

| Feat | Bonus | Target |
|------|-------|--------|
| Dodge | +1 | Reflex Defense |
| Great Fortitude | +2 | Fortitude Defense |
| Iron Will | +2 | Will Defense |
| Lightning Reflexes | +2 | Reflex Defense |
| Improved Defenses | +1 | All Defenses (3 effects) |

### Skill Bonuses

| Feat | Bonus | Skills |
|------|-------|--------|
| Skill Focus | +5 | Check the **Focus** checkbox |
| Educated | +5 | 2 Knowledge skills (goes to Misc) |
| Linguist | +5 | Deception, Persuasion (goes to Misc) |
| Sharp-Eyed | +5 | Perception, Survival (goes to Misc) |

**How Skill Bonuses Work:**
- **Skill Focus** → Check the **Focus checkbox** ✅
- **Other feats** → Automatically add to **Misc field**

**Example: Sharp-Eyed Feat**
```
Perception row BEFORE feat:
[🎲] [+7] = [WIS: +2] [☑ Trained] [☐ Focus] + [+0]

Perception row AFTER adding Sharp-Eyed:
[🎲] [+12] = [WIS: +2] [☑ Trained] [☐ Focus] + [+5]  ← Auto-populated!
```

### Combat Bonuses

| Feat | Bonus | Target |
|------|-------|--------|
| Weapon Focus | +1 | Attack with chosen weapon group |
| Point Blank Shot | +1 | Attack & damage (ranged, within 6 squares) |
| Toughness | +5/level | Hit Points |
| Improved Damage Threshold | +5 | Damage Threshold |

---

## 📖 Examples

### Example 1: Combat Build with Power Attack

**Character: Grievous (Melee Brute)**
- BAB: +10
- STR: 18 (+4)
- Feats: Power Attack, Weapon Focus (Lightsabers)

**Normal Attack:**
```
Attack: 1d20 + 10 (BAB) + 4 (STR) + 1 (Weapon Focus) = +15
Damage: 2d8 + 4 (STR) = 2d8+4
```

**With Power Attack (-5 attack for +10 damage):**
1. Go to Combat Tab → Feat Actions → Variable Effects
2. Drag **Power Attack slider** to **-5**
3. Effects apply automatically!

```
Attack: 1d20 + 10 (BAB) + 4 (STR) + 1 (Weapon Focus) - 5 (Power Attack) = +10
Damage: 2d8 + 4 (STR) + 10 (Power Attack) = 2d8+14  ← Huge damage!
```

### Example 2: Force User with Skill Substitution

**Character: Yoda (Jedi Master)**
- Use the Force: +18 (CHA-based)
- Pilot: +3 (DEX-based)
- Talents: Force Pilot

**Normal Pilot Check:**
```
Pilot: 1d20 + 3 (DEX)
```

**With Force Pilot:**
1. Select **Force Pilot** talent
2. Go to Skills tab
3. Find **Pilot** skill
4. **Change dropdown from DEX → CHA**

```
Pilot: 1d20 + 18 (CHA via Use the Force)  ← Much better!
```

### Example 3: Defensive Fighter

**Character: Obi-Wan (Defensive Duelist)**
- Reflex Defense: 22
- Feats: Dodge, Defensive Fighting

**Normal Reflex Defense:**
```
Reflex: 22 + 1 (Dodge passive) = 23
```

**Activating Defensive Fighting:**
1. Go to Combat Tab → Feat Actions → Toggleable
2. Click **Defensive Fighting toggle** 🔘
3. Takes Swift Action

```
Reflex: 22 + 1 (Dodge) + 2 (Defensive Fighting) = 25  ← Very hard to hit!
Attack: -2 (trade-off for defense)
```

Turn off when you want to attack more aggressively!

---

## 🎯 Summary

### For Players

✅ **Skills:**
- All skills visible
- Change ability with dropdown for skill substitution
- Bonuses auto-calculate

✅ **Feats:**
- Toggle defensive bonuses on/off
- Use sliders for variable effects
- Passive bonuses always active
- No manual tracking!

### For GMs

✅ **Easy Verification:**
- See all bonuses on character sheet
- Check toggles and slider values
- Automated = fewer errors

✅ **Balanced Combat:**
- Players choose when to use abilities
- Trade-offs are clear (Power Attack)
- System enforces mechanics

---

## 🆘 Troubleshooting

### Skill bonus not showing?

1. Check if feat has Active Effect (look for ⚡ symbol)
2. Verify feat is in character's owned items
3. Refresh character sheet (close and reopen)

### Feat action not available?

1. Confirm you own the required feat
2. Some actions require prerequisites (e.g., Power Attack Advanced needs BAB +4)
3. Check Combat Tab → Feat Actions panel

### Skill substitution not working?

1. Verify you have the talent/feat that grants substitution
2. Manually change ability dropdown on skill row
3. System won't auto-change - player must select!

---

## 📝 Developer Notes

**Files Modified:**
- `scripts/data-models/character-data-model.js` - Added selectedAbility, focused fields
- `scripts/utils/feat-actions-mapper.js` - Feat action logic
- `templates/partials/skill-row-static.hbs` - Skill row UI with dropdowns
- `data/feat-combat-actions.json` - Feat action definitions
- `tools/migrate-feats-db.js` - Auto-populate miscMod from feats

**Active Effects Used:**
- Skill bonuses → `system.skills.{skill}.miscMod`
- Focus checkbox → Player manually checks
- Defense bonuses → `system.defenses.{defense}.bonus`
- Feat actions → Toggled via FeatActionsMapper

---

## 🚀 Future Enhancements

**Planned Features:**
- More automated feats (Weapon Specialization, Precise Shot, etc.)
- UI for configurable feats (select weapon group for Weapon Focus)
- Talent trees with automated bonuses
- Conditional effects (Point Blank Shot only within 6 squares)

---

**Version:** 1.0
**Last Updated:** 2025-11-15
**Author:** Claude AI Assistant

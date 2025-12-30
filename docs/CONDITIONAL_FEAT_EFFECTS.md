# Conditional Feat Effects System

The Feat Effects Engine now supports both **permanent** and **conditional/toggleable** effects.

## How It Works

When you add a feat to your character, the system automatically:

1. **Parses the feat's benefit text** to detect bonuses
2. **Creates permanent effects** for unconditional bonuses (always active)
3. **Creates toggleable effects** for conditional bonuses (disabled by default)

## Types of Effects

### Permanent Effects (Always Active)

These are bonuses with no conditions attached:

**Examples:**
- ✅ "You gain +2 bonus on Stealth checks" → **Always adds +2 to Stealth**
- ✅ "You gain +5 hit points" → **Always adds +5 HP**
- ✅ "You gain +2 bonus to Reflex Defense" → **Always adds +2 to Reflex**

### Conditional Effects (Toggleable)

These are bonuses that only apply in specific situations:

**Examples:**
- 🔄 "You gain +2 bonus on Will Defense **against mind-affecting effects**"
- 🔄 "You gain +2 bonus on Reflex Defense **while moving**"
- 🔄 "You gain +2 bonus on Use the Force checks **made to activate Move Object**"

## How Players Use Toggleable Effects

### 1. Finding Your Conditional Effects

1. Open your character sheet
2. Click on the **Effects tab** (or Active Effects)
3. Look for effects with feat names and conditional labels like:
   - `Indomitable Will (vs mind-affecting effects)`
   - `Mobile Fighting (while moving)`
   - `Forceful Throw (to activate move object)`

### 2. Toggling Effects On/Off

**When the condition applies:**
1. Find the conditional effect in your Effects tab
2. Click the **enable/disable toggle** (usually a checkbox or eye icon)
3. The bonus is now active and applied to your character

**When the condition no longer applies:**
1. Go back to the Effects tab
2. Toggle the effect **off**
3. The bonus is removed

### 3. During Combat

**Best Practice:**
- Toggle effects **ON** at the start of your turn if the condition applies
- Toggle them **OFF** at the end of your turn if the condition ends
- The GM can remind you when conditions apply

**Example - Indomitable Will:**
```
Benefit: "You gain +2 bonus on Will Defense against mind-affecting effects"

When an enemy casts a mind-affecting spell:
1. Quickly enable "Indomitable Will (vs mind-affecting effects)"
2. Roll your Will Defense save (now with +2 bonus)
3. After the save, disable it (unless more mind effects are coming)
```

## Detection Patterns

The system recognizes these conditional phrases:

### Defense Bonuses
- "**against**" (e.g., "against fear effects")
- "**while**" (e.g., "while moving")
- "**when**" (e.g., "when charging")
- "**during**" (e.g., "during your turn")

### Skill Bonuses
- "**made to**" (e.g., "made to activate X")
- "**to activate**" (e.g., "to activate Force power")
- "**made for**" (e.g., "made for a specific purpose")
- "**when making**" (e.g., "when making a check to X")

## Technical Details

### Effect Structure

Conditional effects have these properties:

```javascript
{
  name: "Feat Name (condition label)",
  disabled: true,  // Starts disabled
  flags: {
    swse: {
      type: 'feat-conditional-defense' or 'feat-conditional-skill',
      toggleable: true,
      condition: "mind-affecting effects"
    }
  }
}
```

### Effect Names

The system automatically generates descriptive names:
- Defense: `Feat Name (vs condition)` or `Feat Name (while condition)`
- Skills: `Feat Name (for condition)` or `Feat Name (to activate condition)`

## Examples from the Game

### Indomitable Will
```
Benefit: "You gain a +2 bonus on Will Defense against mind-affecting effects"

Creates:
  ✅ No permanent effect (condition: "against")
  🔄 "Indomitable Will (vs mind-affecting effects)"
     - Defense Type: Will
     - Bonus: +2
     - Toggle: Player enables when facing mind-affecting effects
```

### Stealthy
```
Benefit: "You gain a +2 bonus on Stealth checks"

Creates:
  ✅ "Stealthy (Skill Bonus)" - Permanent +2 to Stealth
  🔄 No conditional effect (no condition words)
```

### Forceful Throw
```
Benefit: "You gain a +2 bonus on Use the Force checks made to activate Move Object"

Creates:
  ✅ No permanent effect (condition: "made to")
  🔄 "Forceful Throw (to activate move object)"
     - Skill: Use the Force
     - Bonus: +2
     - Toggle: Player enables when using Move Object power
```

## GM Notes

### Helping Players

As a GM, you can:
1. Remind players when conditional bonuses apply
2. Help players find and toggle their conditional effects
3. Verify bonuses are applied correctly during rolls

### Custom Effects

If the automatic parsing doesn't catch a feat correctly:
1. Manually create an Active Effect on the character
2. Set the bonus and condition appropriately
3. Mark it as toggleable in the flags

### Migration

To apply effects to existing feats:
```javascript
// In Foundry console:

// For a specific actor:
await FeatEffectsMigration.scanActor(game.actors.getName("Character Name"));

// For all actors:
await FeatEffectsMigration.scanAllActors();

// For the compendium (dry run first):
await FeatEffectsMigration.migrateFeatsCompendium(true);  // Preview
await FeatEffectsMigration.migrateFeatsCompendium(false); // Apply
```

## Troubleshooting

**Q: My feat didn't create a conditional effect**
- Check the benefit text for conditional keywords
- The pattern might not be recognized - report it as a bug
- Manually create the effect as a workaround

**Q: The bonus isn't applying when I toggle it on**
- Verify the effect is targeting the correct stat (check the Changes tab)
- Make sure the effect isn't disabled
- Try removing and re-adding the feat

**Q: I forgot to toggle an effect off**
- No problem! Just disable it when you remember
- It's better to leave it on accidentally than forget to enable it

## Future Enhancements

Planned improvements:
- [ ] Automatic detection of when conditions apply (e.g., movement tracking)
- [ ] Quick-toggle buttons on the character sheet
- [ ] Visual indicators for active conditional bonuses
- [ ] Macro support for common condition toggles

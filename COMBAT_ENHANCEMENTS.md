# SWSE Enhanced Combat System

## Overview

This document describes the comprehensive combat system enhancements implemented for Star Wars Saga Edition. The enhanced system fully implements SWSE combat rules including automatic attack vs defense comparisons, personal shields, damage reduction, Force power attacks, and critical hit mechanics.

## Combat Flow in SWSE

The Star Wars Saga Edition combat system follows this sequence:

1. **Initiative**: Initiative skill rolls (1d20 + DEX mod + misc), highest goes first
2. **Attack Phase**: Attacks are d20 + stat + base attack bonus + misc, must beat target's Reflex Defense
3. **Force Powers**: Force powers use Use the Force skill check and must beat the specified defense stat (Reflex, Fortitude, or Will)
4. **Damage Application**: Damage is computed and applied in this order:
   - **Shields First**: Personal energy shields absorb damage up to their current value
   - **Damage Reduction**: Remaining damage is reduced by DR (flat reduction from armor)
   - **HP Damage**: Final damage is applied to HP
   - **Damage Threshold Check**: If damage exceeds threshold, condition track worsens

## New Features

### 1. **Personal Energy Shields**

Personal energy shields now work for all character types, not just vehicles.

**Data Model** (template.json):
```json
"shields": {
  "value": 0,     // Current shield points
  "max": 0,       // Maximum shield points
  "rating": 0,    // Shield rating (SR)
  "regenRate": 0  // Shields per round regeneration
}
```

**Display**:
- Combat tab shows shield value/max and rating
- Shields absorb damage before HP
- Visual indication when shields are active

**Game Rules**:
- Shields are depleted first when taking damage
- Shield Rating (SR) indicates quality/strength
- Can be recharged via mechanics skill or rest

### 2. **Damage Reduction (DR)**

Damage reduction represents armor that reduces incoming damage by a flat amount.

**Data Model** (template.json):
```json
"damageReduction": 0  // Flat damage reduction
```

**Display**:
- Combat tab shows DR value
- Applied after shields, before HP damage
- Highlighted in combat chat when active

**Game Rules**:
- DR reduces damage after shields are depleted
- Flat reduction (e.g., DR 5 reduces all damage by 5)
- Does not apply to certain damage types (energy, ion, etc.)

### 3. **Automatic Attack vs Defense**

Attacks now automatically compare against target's Reflex Defense.

**Features**:
- Automatically gets target's Reflex Defense if targeted
- Shows HIT or MISS in chat message
- Natural 1 always misses, Natural 20 always hits
- Shows attack breakdown (BAB, ability mod, size, condition, etc.)

**Usage**:
```javascript
// Via game console or macro
await game.swse.Combat.rollAttack(attacker, weapon, target);
```

### 4. **Critical Hit System**

Full critical hit mechanics with threat range and confirmation.

**Features**:
- Checks if attack roll is within weapon's critical threat range
- Automatically rolls confirmation attack if threat
- Applies critical multiplier to damage dice (not modifiers)
- Shows critical confirmation status in chat

**Game Rules**:
- Most weapons crit on 20 (19-20 for some weapons)
- Critical multiplier is usually ×2 (some weapons ×3)
- Must confirm critical by hitting AC again
- Critical damage multiplies dice, not static modifiers

### 5. **Force Power Attack System**

Force powers can now make Use the Force skill checks against any defense.

**Features**:
- Use the Force skill check vs target's defense (Reflex, Fortitude, or Will)
- Automatically compares result to target defense
- Shows SUCCESS or FAILURE in chat
- Natural 1 always fails, Natural 20 always succeeds

**Usage**:
```javascript
// Roll Force power vs Will defense
await game.swse.Combat.rollForcePowerAttack(attacker, power, target, 'will');
```

### 6. **Integrated Damage Application**

Damage application now follows the complete SWSE damage sequence.

**Damage Sequence**:
1. Check for shields → apply to shields first
2. Check for DR → reduce remaining damage
3. Apply to HP → remaining damage to hit points
4. Check damage threshold → move condition track if exceeded

**Chat Display**:
- Shows damage breakdown (shields, DR, HP)
- Highlights damage threshold warnings
- Color-coded for easy reading

## API Reference

### SWSECombat.rollAttack()

Roll an attack against a target.

```javascript
await SWSECombat.rollAttack(attacker, weapon, target, options);
```

**Parameters**:
- `attacker` (Actor): The attacking actor
- `weapon` (Item): The weapon being used
- `target` (Actor): The target actor (optional, uses current target if not provided)
- `options` (Object): Additional options

**Returns**: Attack result object with hit/miss, critical info, etc.

**Example**:
```javascript
const attacker = game.actors.getName("Luke Skywalker");
const weapon = attacker.items.getName("Lightsaber");
const target = game.actors.getName("Stormtrooper");

const result = await game.swse.Combat.rollAttack(attacker, weapon, target);
```

### SWSECombat.rollDamage()

Roll damage and optionally apply to target.

```javascript
await SWSECombat.rollDamage(attacker, weapon, target, options);
```

**Parameters**:
- `attacker` (Actor): The actor dealing damage
- `weapon` (Item): The weapon being used
- `target` (Actor): The target actor (optional)
- `options` (Object): Options including `isCrit` for critical hits

**Returns**: Damage result object with breakdown and applied damage

**Example**:
```javascript
// Normal damage
await game.swse.Combat.rollDamage(attacker, weapon, target);

// Critical damage
await game.swse.Combat.rollDamage(attacker, weapon, target, { isCrit: true });
```

### SWSECombat.rollForcePowerAttack()

Roll a Force power attack against a defense.

```javascript
await SWSECombat.rollForcePowerAttack(attacker, power, target, defenseType);
```

**Parameters**:
- `attacker` (Actor): The Force user
- `power` (Item): The Force power being used
- `target` (Actor): The target actor
- `defenseType` (String): Which defense to target ('reflex', 'fortitude', or 'will')

**Returns**: Force power result with success/failure

**Example**:
```javascript
const jedi = game.actors.getName("Obi-Wan");
const power = jedi.items.getName("Force Grip");
const target = game.actors.getName("General Grievous");

await game.swse.Combat.rollForcePowerAttack(jedi, power, target, 'fortitude');
```

### SWSECombat.applyDamageToTarget()

Apply damage to a target following the full SWSE damage sequence.

```javascript
await SWSECombat.applyDamageToTarget(target, damage, options);
```

**Parameters**:
- `target` (Actor): The actor taking damage
- `damage` (Number): Amount of raw damage
- `options` (Object): Additional options

**Returns**: Object with breakdown of shield/DR/HP damage

**Example**:
```javascript
const target = game.actors.getName("Han Solo");
const damageApplied = await game.swse.Combat.applyDamageToTarget(target, 15);

console.log(damageApplied);
// {
//   totalDamage: 15,
//   shieldDamage: 5,
//   drReduced: 2,
//   hpDamage: 8,
//   thresholdExceeded: false
// }
```

## Macros

### Quick Attack Macro

```javascript
// Select attacker token and target enemy token, then run
const attacker = canvas.tokens.controlled[0]?.actor;
const target = Array.from(game.user.targets)[0]?.actor;

if (!attacker || !target) {
  ui.notifications.warn("Select your token and target an enemy!");
  return;
}

// Get equipped weapon
const weapon = attacker.items.find(i =>
  i.type === 'weapon' && i.system.equipped
);

if (!weapon) {
  ui.notifications.warn("No weapon equipped!");
  return;
}

// Roll attack
const result = await game.swse.Combat.rollAttack(attacker, weapon, target);

// If hit, offer to roll damage
if (result.hits) {
  new Dialog({
    title: "Attack Hit!",
    content: `<p>Roll damage${result.critConfirmed ? ' (CRITICAL!)' : ''}?</p>`,
    buttons: {
      yes: {
        label: "Roll Damage",
        callback: async () => {
          await game.swse.Combat.rollDamage(
            attacker,
            weapon,
            target,
            { isCrit: result.critConfirmed }
          );
        }
      },
      no: {
        label: "Cancel"
      }
    },
    default: "yes"
  }).render(true);
}
```

### Force Power Macro

```javascript
// Use a Force power against a target
const attacker = canvas.tokens.controlled[0]?.actor;
const target = Array.from(game.user.targets)[0]?.actor;

if (!attacker || !target) {
  ui.notifications.warn("Select your token and target an enemy!");
  return;
}

// Select Force power
const forcePowers = attacker.items.filter(i =>
  i.type === 'forcepower' || i.type === 'force-power'
);

if (forcePowers.length === 0) {
  ui.notifications.warn("No Force powers available!");
  return;
}

// Create dialog to select power and defense
new Dialog({
  title: "Use Force Power",
  content: `
    <form>
      <div class="form-group">
        <label>Force Power:</label>
        <select name="power">
          ${forcePowers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Target Defense:</label>
        <select name="defense">
          <option value="reflex">Reflex</option>
          <option value="fortitude">Fortitude</option>
          <option value="will" selected>Will</option>
        </select>
      </div>
    </form>
  `,
  buttons: {
    use: {
      label: "Use Power",
      callback: async (html) => {
        const powerId = html.find('[name="power"]').val();
        const defense = html.find('[name="defense"]').val();
        const power = attacker.items.get(powerId);

        await game.swse.Combat.rollForcePowerAttack(
          attacker,
          power,
          target,
          defense
        );
      }
    },
    cancel: {
      label: "Cancel"
    }
  },
  default: "use"
}).render(true);
```

## Sheet Integration

The combat enhancements are automatically integrated into character sheets:

### Combat Tab

- **Base Attack Bonus**: Editable field
- **Speed**: Movement in squares
- **Initiative**: Rollable initiative bonus
- **Damage Threshold**: Calculated value
- **Personal Shields**: Current/Max with shield rating
- **Damage Reduction**: Flat DR value

### Weapons List

Weapons can be clicked to:
1. Roll attack (automatically checks vs target's Reflex)
2. Roll damage (with critical option)
3. Edit weapon properties

## Chat Message Enhancements

Combat chat messages are beautifully styled and include:

### Attack Messages
- Dice roll with formula and total
- Attack breakdown (BAB, ability, size, etc.)
- vs Target's Reflex Defense
- HIT/MISS indicator (color-coded)
- Critical threat/confirmation status
- "Roll Damage" button if hit

### Damage Messages
- Damage roll with formula and total
- Damage breakdown (shields, DR, HP)
- Threshold exceeded warning
- Color-coded damage total

### Force Power Messages
- Use the Force check with total
- vs Target's Defense
- SUCCESS/FAILURE indicator
- Color-coded results

## Implementation Files

| File | Purpose |
|------|---------|
| `scripts/combat/enhanced-combat-system.js` | Main combat system implementation |
| `styles/combat/combat-enhancements.css` | Combat UI styling |
| `template.json` | Added shields and DR to actor data model |
| `templates/actors/character/tabs/combat-tab.hbs` | Combat tab UI with shields/DR |
| `index.js` | System initialization |

## Configuration

Currently, the enhanced combat system is always active. Future versions may include settings for:

- Auto-apply damage on hit
- Show attack breakdown by default
- Auto-roll damage on critical hit
- Shield regeneration automation
- DR bypass for certain damage types

## Best Practices

1. **Always Target**: For automatic hit/miss, make sure to target the enemy token before attacking
2. **Equipped Weapons**: Only equipped weapons should be used for attacks
3. **Shield Management**: Update shields manually when recharged or via mechanics skill
4. **DR Sources**: Set DR based on armor and talents/feats
5. **Critical Hits**: The system handles crit confirmation automatically

## Troubleshooting

**Attack doesn't show hit/miss**:
- Make sure you've targeted an enemy token
- Check that target has valid defenses

**Damage not applying**:
- Ensure actor has proper HP structure
- Check shields/DR values are numbers, not strings

**Force powers not working**:
- Verify actor has Use the Force skill
- Check Force power is proper item type
- Ensure target is selected

## Future Enhancements

Planned improvements:
- Range calculation and penalties
- Cover bonuses to Reflex Defense
- Automatic shield regeneration
- Attack of opportunity tracking
- Multiple attack handling (full attack action)
- Autofire/area attack support
- Targeting computer integration for vehicles

## Credits

Enhanced Combat System developed to fully implement Star Wars Saga Edition combat rules in Foundry VTT.

# Bonus Hit Points Implementation Guide

## Overview

Bonus Hit Points (BHP) is a system that provides temporary damage buffers to characters from various sources (talents, species traits, etc.). This implementation follows the Star Wars Saga Edition rules for Bonus Hit Points.

## Core Rules

1. **Damage Buffer**: Bonus HP acts as a short-term damage buffer
2. **Consumption Order**: Damage is subtracted from Bonus HP first, then regular Temporary HP, then real HP
3. **Multiple Sources**: When gaining Bonus HP from multiple sources, the character uses only the **LARGER amount**, not the sum
   - Example: 10 BHP + 15 BHP ability = 15 BHP (not 25)
4. **Encounter Duration**: Bonus HP resets at the end of an encounter

## System Architecture

### Data Model
- **Field**: `system.hp.bonus` (number)
- **Consumption Order**:
  1. Bonus HP (`system.hp.bonus`)
  2. Temporary HP (`system.hp.temp`)
  3. Real HP (`system.hp.value`)

### Engine
- **File**: `/scripts/engine/BonusHitPointsEngine.js`
- **Methods**:
  - `applyBonusHP(actor, amount, options)` - Apply bonus HP to an actor
  - `resetBonusHP(actor)` - Reset bonus HP (called at end of encounter)
  - `getBonusHP(actor)` - Get current bonus HP amount
  - `hasBonusHP(actor)` - Check if actor has bonus HP
  - `createBonusHPEffect(actor, config)` - Create an Active Effect for bonus HP
  - `consolidateBonusHP(actor)` - Calculate max bonus from all sources

## Implementation Examples

### Example 1: Simple Talent Implementation

```javascript
// In scripts/talents/noble-talent-mechanics.js or similar

import { BonusHitPointsEngine } from '../engine/BonusHitPointsEngine.js';

export class NobleTalentMechanics {
  /**
   * BOLSTER ALLY - Grant temporary HP to nearby allies
   * Range: 6 squares, Duration: Until end of encounter
   */
  static async triggerBolsterAlly(actor, targetActor, bonusHPAmount) {
    if (!this.hasBolsterAlly(actor)) {
      return { success: false, message: 'Actor does not have Bolster Ally talent' };
    }

    // Apply the bonus HP to the target
    const result = await BonusHitPointsEngine.applyBonusHP(targetActor, bonusHPAmount, {
      source: 'talent-bolster-ally',
      reason: `Bolster Ally from ${actor.name}`
    });

    if (result) {
      ui.notifications.info(
        `${targetActor.name} gains ${bonusHPAmount} bonus HP from ${actor.name}'s Bolster Ally!`
      );
      return { success: true };
    }

    return {
      success: false,
      message: `${targetActor.name} already has more bonus HP from another source`
    };
  }
}
```

### Example 2: Species Trait Implementation

```javascript
// In scripts/species/species-trait-engine.js - add to _processTrait method

case SPECIES_TRAIT_TYPES.BONUS_HP:
  this._handleBonusHP(trait, actor);
  break;

// Add handler method:
static async _handleBonusHP(trait, actor) {
  const speciesName = this.getActorSpecies(actor)?.name || 'Unknown';

  await BonusHitPointsEngine.applyBonusHP(actor, trait.amount, {
    source: `species-${speciesName}-${trait.id}`,
    reason: trait.displayText || trait.name
  });
}
```

### Example 3: Time-Limited Bonus HP (Active Effect)

For bonuses that expire after a certain duration (rounds, turns, end of combat):

```javascript
// In talent mechanics file

static async triggerTemporaryBonusHP(actor, amount, durationRounds = 1) {
  const effect = await BonusHitPointsEngine.createBonusHPEffect(actor, {
    name: `Temporary Bonus HP (+${amount})`,
    amount: amount,
    source: 'talent-name',
    duration: {
      rounds: durationRounds,
      startRound: game.combat?.round,
      startTurn: game.combat?.turn
    }
  });

  if (effect) {
    ui.notifications.info(`${actor.name} gains ${amount} temporary bonus HP for ${durationRounds} round(s)!`);
    return { success: true };
  }

  return { success: false, message: 'Failed to apply bonus HP' };
}
```

### Example 4: Character Sheet Integration

The character sheet automatically displays bonus HP when present:

```handlebars
{{#if system.hp.bonus}}
<span class="bonus-hp-indicator">
  <i class="fa-solid fa-shield-alt"></i>+{{system.hp.bonus}}
</span>
{{/if}}
```

## Important Notes

### Maximum Bonus, Not Sum

```javascript
// CORRECT: Use Math.max to get the larger amount
const maxBonus = Math.max(currentBonus, newBonus);
await BonusHitPointsEngine.applyBonusHP(actor, amount, options);

// The engine handles this automatically - it uses OVERRIDE mode in Active Effects
```

### Multiple Sources Management

If an actor has multiple sources of bonus HP:
- Source A provides 10 BHP
- Source B provides 15 BHP
- Source C provides 8 BHP
- **Result**: Actor has 15 BHP (the maximum)

The `consolidateBonusHP()` method automatically calculates this.

### End of Encounter Reset

Bonus HP automatically resets when combat ends via the `deleteCombat` hook:

```javascript
Hooks.on('deleteCombat', async (combat) => {
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;
    await BonusHitPointsEngine.resetBonusHP(actor);
  }
});
```

### Damage Application Order

In `swse-actor-base.js`, damage is consumed in this order:

```javascript
// 1. Bonus HP first
if (hp.bonus > 0) {
  const used = Math.min(hp.bonus, remaining);
  remaining -= used;
  updates["system.hp.bonus"] = hp.bonus - used;
}

// 2. Then temporary HP
if (hp.temp > 0) {
  const used = Math.min(hp.temp, remaining);
  remaining -= used;
  updates["system.hp.temp"] = hp.temp - used;
}

// 3. Finally real HP
if (remaining > 0) {
  // Apply to real HP
}
```

## Usage Checklist

When implementing a talent or species trait that grants Bonus HP:

- [ ] Import `BonusHitPointsEngine` at the top of your file
- [ ] Use `applyBonusHP()` for persistent bonuses
- [ ] Use `createBonusHPEffect()` for temporary bonuses
- [ ] Provide a `source` identifier (e.g., 'talent-bolster-ally')
- [ ] Provide a human-readable `reason` for the GM's reference
- [ ] Test with multiple bonus HP sources to ensure maximum is used
- [ ] Verify bonus HP resets after combat ends
- [ ] Update character sheet display if needed

## Testing

To test the Bonus HP system:

1. Create a character and give them bonus HP via a talent/trait
2. Verify it shows on the character sheet with shield icon
3. Take damage - verify bonus HP is consumed first
4. Apply multiple bonus HP sources - verify maximum is used, not sum
5. End combat - verify bonus HP is reset to 0

## Chat Commands

Current damage system chat commands:
```
/damage <amount>     - Apply damage (consumes Bonus HP first)
/heal <amount>       - Heal real HP only
/temphp <amount>     - Set temporary HP
/sethp <value>       - Set HP to exact value
```

To manually set bonus HP:
```javascript
// In console for testing:
game.user.character.update({ 'system.hp.bonus': 15 });
```

## Troubleshooting

### Bonus HP not showing on character sheet
- Verify `system.hp.bonus` field exists in actor data
- Check character sheet template has the bonus HP indicator
- Reload the sheet

### Bonus HP not consumed when taking damage
- Verify damage is being applied via `applyDamage()` method
- Check damage application order in swse-actor-base.js
- Ensure Bonus HP value is greater than 0

### Multiple bonuses stacking instead of using maximum
- Use `applyBonusHP()` instead of manually updating the field
- The engine automatically uses OVERRIDE mode for Active Effects
- Check that `consolidateBonusHP()` is being called during derived data

## References

- **Source**: Star Wars Saga Edition Knights of the Old Republic Campaign Guide
- **Rules**: Bonus Hit Points are temporary damage buffers that do not stack
- **System File**: `/scripts/engine/BonusHitPointsEngine.js`
- **Data Model**: `/scripts/data-models/character-data-model.js` (line 111)
- **Damage Application**: `/scripts/actors/base/swse-actor-base.js` (line 91)

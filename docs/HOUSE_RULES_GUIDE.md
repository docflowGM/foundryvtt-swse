# House Rules Implementation Guide

This guide explains how to expose house rules as toggleable settings in the SWSE system.

## Current House Rules

The system already has house rules implemented in `scripts/houserules/`. To expose them as user-facing settings:

### Step 1: Register Settings

In `scripts/houserules/houserule-settings.js`, add settings for each house rule:

```javascript
export function registerHouseruleSettings() {
  // Example: Armor Defense for All
  game.settings.register('swse', 'houserule.armorDefenseForAll', {
    name: 'SWSE.Settings.Houserule.ArmorDefenseForAll.Name',
    hint: 'SWSE.Settings.Houserule.ArmorDefenseForAll.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      // Trigger recalculation when changed
      if (game.swse?.HouseruleMechanics) {
        game.swse.HouseruleMechanics.applyArmorDefense(value);
      }
    }
  });

  // Add more house rules here...
}
```

### Step 2: Add Localization

In `lang/en.json`, add the localization strings:

```json
{
  "SWSE.Settings.Houserule.ArmorDefenseForAll.Name": "Armor Defense for All",
  "SWSE.Settings.Houserule.ArmorDefenseForAll.Hint": "All characters can apply armor bonus to Reflex Defense (normally restricted by class)"
}
```

### Step 3: Implement the Mechanic

In `scripts/houserules/houserule-mechanics.js`, implement the logic:

```javascript
export class HouseruleMechanics {
  static initialize() {
    // Check all enabled house rules and apply them
    this.applyArmorDefense(game.settings.get('swse', 'houserule.armorDefenseForAll'));
    // ... other house rules
  }

  static applyArmorDefense(enabled) {
    if (!enabled) return;

    // Hook into defense calculations
    Hooks.on('swse.calculateDefense', (actor, defense, value) => {
      if (defense === 'reflex') {
        // Apply armor bonus to all characters
        const armorBonus = actor.system.armor?.bonus || 0;
        return value + armorBonus;
      }
      return value;
    });
  }
}
```

### Step 4: Create Settings UI (Optional)

For a more organized UI, create a custom settings menu:

```javascript
class HouserulesConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'houserules-config',
      title: 'House Rules Configuration',
      template: 'templates/apps/houserules/config.hbs',
      width: 600,
      height: 'auto'
    });
  }

  getData() {
    return {
      houserules: [
        {
          id: 'armorDefenseForAll',
          name: game.i18n.localize('SWSE.Settings.Houserule.ArmorDefenseForAll.Name'),
          hint: game.i18n.localize('SWSE.Settings.Houserule.ArmorDefenseForAll.Hint'),
          value: game.settings.get('swse', 'houserule.armorDefenseForAll')
        },
        // ... more house rules
      ]
    };
  }

  async _updateObject(event, formData) {
    for (const [key, value] of Object.entries(formData)) {
      await game.settings.set('swse', `houserule.${key}`, value);
    }
  }
}

// Register menu in settings.js
game.settings.registerMenu('swse', 'houserules', {
  name: 'House Rules',
  label: 'Configure House Rules',
  hint: 'Enable or disable optional rule variants',
  icon: 'fa-solid fa-cogs',
  type: HouserulesConfig,
  restricted: true  // GM only
});
```

## Common House Rules to Implement

### 1. Simplified Critical Hits
- **Default**: Roll on critical hit table
- **House Rule**: Double damage on critical hit

### 2. Destiny Points
- **Default**: Shared pool
- **House Rule**: Individual pools per player

### 3. Force Point Recovery
- **Default**: 1 per level up
- **House Rule**: 1 per session

### 4. Armor Defense
- **Default**: Class-restricted
- **House Rule**: Available to all

### 5. Skill Focus Stacking
- **Default**: No stacking
- **House Rule**: Stacking allowed

### 6. Multiclass XP Penalty
- **Default**: -20% XP penalty
- **House Rule**: No penalty

## Testing House Rules

After implementing a house rule:

1. **Test with GM**: Toggle the setting and verify it applies correctly
2. **Test with Player**: Ensure non-GMs cannot change it
3. **Test Persistence**: Verify setting persists across sessions
4. **Test Performance**: Ensure no lag when toggling
5. **Test Compatibility**: Check interaction with other house rules

## Examples from Existing Code

The system already has some house rules implemented:

- `houserule-settings.js`: Settings registration
- `houserule-mechanics.js`: Implementation logic
- `templates/apps/houserules/`: UI templates

Review these files for reference implementations.

## Best Practices

1. **Naming Convention**: Use `houserule.` prefix for all settings
2. **Scope**: Always use `world` scope for house rules
3. **Restricted**: Make GM-only (`restricted: true`)
4. **onChange**: Trigger recalculation when settings change
5. **Documentation**: Document each house rule in comments
6. **Localization**: Always localize names and hints
7. **Default Off**: House rules should default to `false`
8. **Backward Compatible**: Ensure disabling doesn't break existing characters

## Troubleshooting

### Setting Not Appearing
- Check registration in `houserule-settings.js`
- Verify localization strings exist
- Ensure `config: true` is set

### Setting Not Applying
- Check `onChange` handler
- Verify mechanic implementation
- Test with console: `game.settings.get('swse', 'houserule.name')`

### Breaking Changes
- Always provide migration for existing worlds
- Document breaking changes in CHANGELOG
- Consider backward compatibility flags

# ACTIVE Execution Model - Complete Reference Guide

## Overview

The **ACTIVE execution model** handles abilities that are:
- **Activated on demand** (not automatic like PASSIVE)
- **Have costs** (Force Points, resources, action economy)
- **Have effects** (damage, modifiers, status effects)
- **Are time-limited** (duration, frequency limits)

Two subtypes:
1. **EFFECT** - One-time activation (attack, ability, spell)
2. **MODE** - Toggle-able state (stance, aura, passive mode)

---

## Schema Examples

### EFFECT Example: Force Power Attack

```javascript
{
  type: "talent",
  name: "Force Slam",
  system: {
    executionModel: "ACTIVE",
    subType: "EFFECT",
    abilityMeta: {
      // ─── Activation ────────────────────────────────
      activation: {
        actionType: "standard"  // standard, move, swift, free, reaction, full_round
      },

      // ─── Cost ──────────────────────────────────────
      cost: {
        forcePoints: 2          // Optional. Cost to activate.
      },

      // ─── Frequency Limit ───────────────────────────
      frequency: {
        type: "encounter",      // unlimited, encounter, round, day, scene
        max: 1                  // Max uses per frequency window
      },

      // ─── Targeting ─────────────────────────────────
      targeting: {
        type: "singleEnemy",    // singleEnemy, areaEffect, aura, self
        range: "30 feet"        // Required if ranged
      },

      // ─── Effect ────────────────────────────────────
      effect: {
        type: "damageRoll",     // damageRoll, saveEffect, modifierApplication, statusEffect
        damageType: "kinetic",  // bludgeoning, piercing, slashing, etc.
        diceFormula: "4d6",     // Damage formula
        bonusModifier: "ref"    // Bonus from ability: str, dex, con, int, wis, cha
      },

      // ─── Duration (optional) ───────────────────────
      duration: {
        type: "instant",        // instant, rounds, minutes, hours, concentration
        value: null             // Rounds/minutes/hours if applicable
      }
    }
  }
}
```

### MODE Example: Lightsaber Stance

```javascript
{
  type: "feat",
  name: "Attacking Stance",
  system: {
    executionModel: "ACTIVE",
    subType: "MODE",
    abilityMeta: {
      // ─── Activation ────────────────────────────────
      activation: {
        actionType: "swift"     // Usually swift or free for MODE
      },

      // ─── No Cost ────────────────────────────────────
      // MODEs typically have no cost, just action/frequency

      // ─── Frequency ─────────────────────────────────
      frequency: {
        type: "unlimited"       // Can be toggled freely
      },

      // ─── Mode Effect ───────────────────────────────
      modeEffect: {
        modifier: "melee_attack_bonus",
        value: 2
      }
    }
  }
}
```

---

## Activation Pipeline

### EFFECT Activation Flow

```
1. Validate contract
   └─> ActiveContractValidator.assert()

2. Check action economy
   └─> ActionEngine.previewConsume()
   └─> Ensure standard/move/swift/etc. available

3. Check frequency limit
   └─> ActivationLimitEngine.canActivate()
   └─> Prevent overuse (encounter, round, day)

4. Check cost availability
   └─> Verify Force Points, resources
   └─> Ensure enough available to spend

5. Resolve targets
   └─> TargetingEngine.resolveTargets()
   └─> Get list of affected targets

6. Apply effect to targets
   └─> EffectResolver.resolve()
   └─> Roll damage, apply modifiers, resolve saves

7. Track duration
   └─> DurationEngine.trackDuration()
   └─> Auto-expire when complete

8. Deduct cost
   └─> ActorEngine.apply() → decrease Force Points

9. Record activation
   └─> ActivationLimitEngine.recordActivation()
   └─> Track for frequency limiting

10. Post to chat
    └─> SWSEChat.createMessage()
    └─> Display results to players
```

### MODE Activation Flow

```
1. Validate contract
   └─> ActiveContractValidator.assert()

2. Check action economy
   └─> ActionEngine.previewConsume()

3. Check frequency limit
   └─> ActivationLimitEngine.canActivate()

4. Toggle mode state
   └─> Check if already active
   └─> Apply modifier or remove modifier
   └─> ModifierEngine.apply() / ModifierEngine.remove()

5. Record activation
   └─> ActivationLimitEngine.recordActivation()

6. Post to chat
   └─> SWSEChat.createMessage()
```

---

## Integration Points

### AbilityExecutionRouter

Entry point for all ability activations:

```javascript
// In a sheet or macro:
const result = await AbilityExecutionRouter.execute({
  abilityId: ability.id,
  executionType: ExecutionType.ACTIVE,  // Not used directly, but documented
  actor,
  target,                               // For targeted abilities
  limitType: LimitType.ENCOUNTER,       // Override frequency (optional)
  payload: {}                           // Extra data
});
```

### AbilityExecutionCoordinator

Registers ACTIVE abilities on actor:

```javascript
// Called during actor preparation:
AbilityExecutionCoordinator.registerActorAbilities(actor);
// → Finds all ACTIVE abilities
// → Validates contracts
// → Initializes metadata
```

### ActivationLimitEngine

Tracks frequency and prevents overuse:

```javascript
// Check if can activate
const check = ActivationLimitEngine.canActivate(
  actor,
  abilityId,
  LimitType.ENCOUNTER,  // or ROUND, DAY, SCENE, UNLIMITED
  1                     // max uses per window
);

if (!check.allowed) {
  // Cannot activate: check.reason explains why
}

// Record activation
ActivationLimitEngine.recordActivation(actor, abilityId, limitType);
```

### DurationEngine

Tracks temporary effects:

```javascript
// Add duration
DurationEngine.trackDuration(actor, {
  abilityId: ability.id,
  type: 'rounds',
  value: 5,              // 5 rounds
  effect: { modifier: 'ac_bonus', value: 2 }
});

// DurationEngine auto-expires:
// - On next round start
// - On scene change
// - On actor rest
```

### ModifierEngine

Applies attribute/stat modifiers:

```javascript
// Apply permanent modifier (for MODE)
ModifierEngine.apply(actor, {
  source: ability.id,
  modifier: 'melee_attack',
  value: 2
});

// Remove modifier
ModifierEngine.remove(actor, ability.id);
```

### EffectResolver

Resolves ability effects:

```javascript
// Resolve damage roll
const result = await EffectResolver.resolveDamageRoll(
  actor,
  target,
  ability.system.abilityMeta.effect,
  context  // { roll?, bonusModifier?, criticalMultiplier? }
);
// Returns: { damage, rolled, type, isCritical }

// Resolve save effect
const saveResult = await EffectResolver.resolveSaveEffect(
  target,
  ability.system.abilityMeta.effect,
  context  // { dc, savingAbility, penalty? }
);
// Returns: { succeeded, rollResult, dc }
```

---

## Error Handling

All errors follow consistent patterns:

```javascript
// Contract violations
try {
  ActiveContractValidator.assert(ability);
} catch (err) {
  // err.message describes what's wrong with schema
  SWSELogger.error('Contract violation:', err.message);
}

// Activation failures
const result = await ActiveAdapter.executeEffect(actor, ability);
if (!result.success) {
  // result.reason explains why activation failed
  ui.notifications.warn(result.reason);
}

// Cost/frequency errors are caught and reported
```

---

## Common Patterns

### Pattern 1: Simple Damage Attack

```javascript
{
  name: "Jedi Strike",
  system: {
    executionModel: "ACTIVE",
    subType: "EFFECT",
    abilityMeta: {
      activation: { actionType: "standard" },
      targeting: { type: "singleEnemy", range: "5 feet" },
      effect: {
        type: "damageRoll",
        damageType: "kinetic",
        diceFormula: "3d6",
        bonusModifier: "str"
      }
    }
  }
}
```

### Pattern 2: Limited-Use Ability

```javascript
{
  name: "Force Surge",
  system: {
    executionModel: "ACTIVE",
    subType: "EFFECT",
    abilityMeta: {
      activation: { actionType: "swift" },
      cost: { forcePoints: 3 },
      frequency: { type: "encounter", max: 1 },  // Once per encounter
      effect: { type: "modifierApplication", modifier: "attack_bonus", value: 3 }
    }
  }
}
```

### Pattern 3: Daily Power

```javascript
{
  name: "Force Healing",
  system: {
    executionModel: "ACTIVE",
    subType: "EFFECT",
    abilityMeta: {
      activation: { actionType: "standard" },
      cost: { forcePoints: 5 },
      frequency: { type: "day", max: 1 },  // Once per day
      targeting: { type: "singleAlly", range: "30 feet" },
      effect: {
        type: "damageRoll",
        damageType: "healing",
        diceFormula: "5d6",
        bonusModifier: "wis"
      }
    }
  }
}
```

### Pattern 4: Stance/Mode

```javascript
{
  name: "Defensive Stance",
  system: {
    executionModel: "ACTIVE",
    subType: "MODE",
    abilityMeta: {
      activation: { actionType: "swift" },
      frequency: { type: "unlimited" },
      modeEffect: {
        modifier: "ac_bonus",
        value: 2
      }
    }
  }
}
```

---

## Debugging Tips

### Check Registration

```javascript
// In browser console:
const actor = game.actors.getName("Jedi Knight");
const ability = actor.items.getName("Force Slam");

// Check if metadata is registered
console.log(actor._activeMetadata?.[ability.id]);

// Check if limited (should have tracking)
console.log(actor._activationLimits);
```

### Trace Activation

```javascript
// Set log level to debug:
SWSELogger.setLevel('debug');

// Activate ability and watch console for:
// [ActiveAdapter] Starting EFFECT activation...
// [ActivationLimitEngine] Checking limit...
// [EffectResolver] Resolving effect...
// [ActorEngine] Applying cost...
```

### Validate Schema

```javascript
import { ActiveContractValidator } from '/systems/foundryvtt-swse/scripts/engine/abilities/active/active-contract.js';

const ability = actor.items.getName("My Ability");
try {
  ActiveContractValidator.assert(ability);
  console.log("✅ Ability schema is valid");
} catch (err) {
  console.error("❌ Schema error:", err.message);
}
```

---

## Migration Checklist

When converting abilities to ACTIVE model:

- [ ] Set `executionModel: "ACTIVE"`
- [ ] Set `subType: "EFFECT"` or `"MODE"`
- [ ] Define `activation.actionType`
- [ ] Define `effect` for EFFECT, `modeEffect` for MODE
- [ ] Add `targeting` if not self-only
- [ ] Add `frequency` if limited (usually UNLIMITED)
- [ ] Add `cost` if costs Force Points
- [ ] Add `duration` if effect is temporary
- [ ] Run validation: `ActiveContractValidator.assert(ability)`
- [ ] Test activation in-game
- [ ] Check chat output
- [ ] Verify frequency limiting works

---

## Testing ACTIVE Abilities

See `tests/unit/active-contract.test.js` for contract validation tests.
See `tests/phase-5/active-abilities.test.js` for integration tests.
See `tests/governance/active-governance.test.js` for governance compliance.

---

## Related Models

- **PASSIVE** - Automatic effects (passive bonuses, auras)
- **UNLOCK** - Grant capabilities (proficiencies, domains)
- **PROGRESSION** - Level-triggered grants
- **FORCE_POWER** - Force-specific abilities
- **ATTACK_OPTION** - Attack variations

---

## See Also

- `AbilityExecutionRouter` - Activation entry point
- `ActivationLimitEngine` - Frequency limiting
- `DurationEngine` - Temporary effect tracking
- `EffectResolver` - Effect resolution logic
- `TargetingEngine` - Target selection
- `ModifierEngine` - Stat modifiers

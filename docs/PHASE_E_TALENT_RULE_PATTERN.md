# Phase E: Talent Rule Pattern

## Overview

This document describes how to convert talent abilities into modular rule modules for the CombatRulesRegistry. Following this pattern ensures talents integrate seamlessly with the core rules system without hardcoding talent-specific logic into engines.

## Pattern Template

All talent rules follow this structure:

```javascript
/**
 * [Talent Name] Rule — [Effect Description]
 *
 * Applies [RULE_TYPE] rules from [Talent Name] talent.
 */

import { RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";
import { ResolutionContext } from "/systems/foundryvtt-swse/scripts/engine/resolution/resolution-context.js";
import { RULES } from "/systems/foundryvtt-swse/scripts/engine/execution/rules/rule-enum.js";

export const talentNameRule = {
  id: "talent.[talent-id]",
  type: RuleCategories.[CATEGORY],
  priority: [NUMBER],

  applies: ({ actor, weapon, target }) => {
    // Check if actor has the talent and other conditions
    return !!actor && !!weapon && /* talent presence check */;
  },

  apply: (payload, result) => {
    const { actor, weapon, target, context } = payload;
    const ctx = new ResolutionContext(actor);

    // Query rule instances from actor's resolved rules
    const ruleInstances = ctx.getRuleInstances(RULES.[RULE_TYPE]);

    // Apply logic using rule instances
    for (const rule of ruleInstances) {
      // Proficiency-gated filtering
      if (rule.proficiency === weapon.system?.proficiency) {
        // Apply effect
        result.[field] += rule.bonus || 0;
      }
    }

    // Track in diagnostics
    if (ruleInstances.length > 0) {
      result.diagnostics.rulesTriggered.push("talent.[talent-id]");
    }

    return result;
  }
};

export default talentNameRule;
```

## Category Selection Guide

### ATTACK (Priority 10-100)
For attack roll modifiers:
- Bonus/penalty to attack roll
- Attack modifier conditions
- Examples: Weapon Focus, Power Attack, Precise Shot

**Priority ordering:**
- Priority 5: Validation (reach, legality)
- Priority 10: Base attack bonus, standard weapons damage
- Priority 30: Ability modifiers, proficiency bonuses
- Priority 40: Size modifiers, ability-based effects
- Priority 50: Conditional bonuses (flanking, cover)
- Priority 70: Penalties (conditions, special effects)

### CRITICAL (Priority 40-80)
For critical hit modifications:
- Extend threat range
- Modify critical multiplier
- Add confirmation bonuses
- Examples: Improved Critical, Critical Strike, Weapon Supremacy

### DAMAGE (Priority 20-60)
For damage roll modifications:
- Add bonus damage dice
- Modify flat bonus
- Apply multipliers
- Examples: Weapon Specialization, Devastating Attack, Melee Smash

### SKILL (Priority varies)
For skill check modifiers
- Add bonuses to checks
- Examples: Skill Focus, Jack of All Trades

## Example: Weapon Specialization

```javascript
export const weaponSpecializationRule = {
  id: "talent.weapon-specialization",
  type: RuleCategories.DAMAGE,
  priority: 25,

  applies: ({ actor, weapon }) => {
    // Check if actor has Weapon Specialization talent
    const hasWS = actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Weapon Specialization'
    );
    return !!actor && !!weapon && hasWS;
  },

  apply: (payload, result) => {
    const { actor, weapon } = payload;
    const ctx = new ResolutionContext(actor);

    // Weapon Specialization grants bonus damage for specific weapon groups
    const specializations = ctx.getRuleInstances(RULES.WEAPON_SPECIALIZATION);

    for (const spec of specializations) {
      if (spec.weaponGroup === weapon.system?.proficiency) {
        // Add flat bonus damage
        result.flatBonus += spec.bonus || 2;
        result.diagnostics.rulesTriggered.push(
          `talent.weapon-specialization:${spec.weaponGroup}:+${spec.bonus}`
        );
      }
    }

    return result;
  }
};
```

## Rule Enum Requirements

Before creating a talent rule, ensure the rule type exists in `rule-enum.js`:

```javascript
export const RULES = Object.freeze({
  // ... existing rules
  WEAPON_SPECIALIZATION: 'WEAPON_SPECIALIZATION',
  TALENT_MELEE_SMASH: 'TALENT_MELEE_SMASH',
  // etc.
});
```

And define its schema in `rule-definitions.js`:

```javascript
export const RULE_DEFINITIONS = {
  WEAPON_SPECIALIZATION: {
    params: {
      weaponGroup: 'string',
      bonus: 'number'
    },
    description: 'Bonus damage for weapon group specialization'
  }
};
```

## Integration Checklist

When creating a talent rule:

1. **Create the rule file:**
   ```
   scripts/engine/rules/modules/talents/[talent-name]-rule.js
   ```

2. **Add rule enum token** (if new rule type):
   - Add to `RULES` in `rule-enum.js`
   - Define schema in `rule-definitions.js`
   - Add to `PASSIVE/RULE` whitelist in `rule-types.js`

3. **Register the rule:**
   - Create `initializeTalentRules()` in a talents index
   - Or add to appropriate category-specific initializer

4. **Migrate talent to PASSIVE/RULE execution:**
   - Update talent in packs/talents.db
   - Set `executionModel: "PASSIVE"`
   - Set `subType: "RULE"`
   - Add `abilityMeta` with rule parameters

5. **Test integration:**
   - Verify talent bonuses appear in attack/damage previews
   - Confirm diagnostics track talent rule triggering
   - Check WeaponsEngine.traceAttack() shows talent contributions

## Priority Spacing Guide

Space priorities by 10 to allow for future insertions:

```
Priority 5:   Validation rules (reach, legality)
Priority 10:  Base calculations (BAB, base damage)
Priority 20:  Conditional bonuses (abilities, specialization)
Priority 30:  Stat modifiers (ability scores, proficiency)
Priority 40:  Size/type effects (size modifiers)
Priority 50:  Critical properties
Priority 60:  Confirmation bonuses
Priority 70:  Penalties (conditions, unequipped)
Priority 80+: Late effects (overrides, special cases)
```

## Testing Patterns

To verify a talent rule works:

1. **Unit test the rule directly:**
```javascript
const result = {
  attack: { bonuses: [], penalties: [] },
  damage: { dice: [], flatBonus: 0 },
  diagnostics: { rulesTriggered: [] }
};

const payload = { actor, weapon, target, context };
const output = talentNameRule.apply(payload, result);

console.assert(output.attack.bonuses.length > 0);
console.assert(output.diagnostics.rulesTriggered.includes('talent.name'));
```

2. **Integration test via WeaponsEngine:**
```javascript
const evaluation = WeaponsEngine.evaluateAttack({
  actor,
  weapon,
  target,
  context,
  telemetry: true
});

// Verify in evaluation.diagnostics.rulesTriggered
```

3. **Visual test via UI:**
- Open WeaponsEngine tooltip
- Verify talent bonuses appear
- Confirm priority ordering

## Common Patterns

### Proficiency-Gated Bonus
```javascript
for (const rule of ruleInstances) {
  if (rule.proficiency === weapon.system?.proficiency) {
    result.attack.bonuses.push(rule.bonus);
  }
}
```

### Conditional Application
```javascript
const condition = actor.system?.conditionTrack?.current;
if (condition <= 2) {  // Heroic or Wounded
  result.attack.bonuses.push(-2);
}
```

### Dice Modification
```javascript
result.dice.push({
  count: 1,
  faces: 6,
  type: 'bonus',
  source: 'talent.weapon-specialization'
});
```

### Multiplier Application
```javascript
result.multipliers.conditional *= 1.5;  // 50% damage increase
```

## Next Steps

1. Identify high-value talents to convert (Weapon Specialization, Power Attack, etc.)
2. Create rule modules following this pattern
3. Register in category-specific initializers
4. Test via WeaponsEngine.traceAttack()
5. Update talent data to PASSIVE/RULE execution model

## Files to Modify

When creating talent rules, you may need to update:
- `scripts/engine/execution/rules/rule-enum.js` (add new rule types)
- `scripts/engine/execution/rules/rule-definitions.js` (define schemas)
- `scripts/engine/abilities/passive/rule-types.js` (whitelist new rules)
- `scripts/engine/rules/modules/talents/index.js` (register rules)
- `packs/talents.db` (migrate talent data)

---

**Principle**: One rule file = one talent ability. No mixing multiple talents' effects in one rule. Keep diagnostic tracking explicit. Let the registry handle ordering.

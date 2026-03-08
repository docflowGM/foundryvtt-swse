# Phase B: CRITICAL_DAMAGE_BONUS Implementation

## Summary

Phase B implements the infrastructure for talents that add bonus damage on critical hits, supporting the second category of critical-related mechanics.

## What was added

### 1. Rule Token: CRITICAL_DAMAGE_BONUS

**Enum Location:** `scripts/engine/execution/rules/rule-enum.js`

```js
CRITICAL_DAMAGE_BONUS: "CRITICAL_DAMAGE_BONUS",
```

### 2. Rule Definition

**Location:** `scripts/engine/execution/rules/rule-definitions.js`

```js
[RULES.CRITICAL_DAMAGE_BONUS]: {
  params: {
    proficiency: "string",
    bonus: "string|number"
  },
  description: "Adds bonus damage when scoring a critical hit (proficiency-gated)",
  required: ["proficiency", "bonus"]
}
```

### 3. Helper Function

**Location:** `scripts/combat/utils/combat-utils.js`

```js
export function getCriticalDamageBonus(actor, weapon) {
  // Returns formula string like "1d6" or "+2" based on CRITICAL_DAMAGE_BONUS rules
}
```

### 4. Integration Point

**Location:** `scripts/combat/rolls/damage.js`

When `context.isCritical` is true, the critical damage bonus formula is appended to the damage roll:

```js
if (context.isCritical) {
  const critBonusFormula = getCriticalDamageBonus(actor, weapon);
  if (critBonusFormula) {
    formulaParts.push(`(${critBonusFormula})`);
  }
}
```

## Migration Pattern: CRITICAL_DAMAGE_BONUS Talents

### Example Talent Structure

A talent that adds damage on critical hits should:

1. Have `executionModel: "PASSIVE"`
2. Have `subType: "RULE"`
3. Define abilityMeta with CRITICAL_DAMAGE_BONUS rule
4. Specify proficiency (weapon group)
5. Specify bonus (number or dice formula)

### Template

```json
{
  "name": "Enhanced Critical (Rifles)",
  "type": "talent",
  "system": {
    "executionModel": "PASSIVE",
    "subType": "RULE",
    "abilityMeta": {
      "rules": [
        {
          "type": "CRITICAL_DAMAGE_BONUS",
          "params": {
            "proficiency": "rifles",
            "bonus": "1d6"
          },
          "conditions": []
        }
      ]
    }
  }
}
```

### Params Explained

- `proficiency` (string): Weapon group (e.g., "rifles", "heavy-weapons", "lightsabers")
  - Must match weapon.system.proficiency
  - Ensures bonus only applies to intended weapons

- `bonus` (string|number): Extra damage on crit
  - Numeric: `1` or `2` for flat damage
  - Dice formula: `"1d6"` or `"2d4+1"` for variable damage
  - Applied after base damage and multiplier

## Architecture Principles

### Single Source of Truth (SSOT)

- All CRITICAL_DAMAGE_BONUS rules flow through ResolutionContext
- No duplicate logic in multiple damage systems
- Consistent stacking behavior via RuleCollector

### Parameterized Rules

- Rules are not enums, they have parameters
- Proficiency gating prevents unwanted bonuses
- Multiple bonuses stack naturally (all matching rules apply)

### Read-Only Resolution

- Damage calculation reads rule state
- Does not mutate actor or rule storage
- Rules are frozen during prepare cycle

## Stacking Behavior

Multiple CRITICAL_DAMAGE_BONUS talents stack additively:

```js
// Actor has:
// - Enhanced Critical (Rifles): +1d6
// - Weapon Specialization (Rifles): +2

// On critical hit with rifle:
// Damage formula includes: + (1d6) + (2)
```

## Next Phases

### Phase C: MODIFY_CRITICAL_MULTIPLIER

Allows changing the critical damage multiplier (default ×2).

- Enum: `MODIFY_CRITICAL_MULTIPLIER`
- Params: `{ proficiency, multiplier: number }`
- Hook: Damage multiplier calculation

### Phase D: CRITICAL_CONFIRM_BONUS

Bonus to critical confirmation rolls.

- Enum: `CRITICAL_CONFIRM_BONUS`
- Params: `{ proficiency?, bonus: number }`
- Hook: Crit confirmation roll (before damage)

### Phase A: ON_CRIT_TRIGGER

Event-driven mechanics that trigger on critical hit.

- Requires: Reaction/trigger engine
- Examples: "Move target 1 square", "Apply condition"
- Not PASSIVE — fundamentally different architecture

## Testing the Implementation

### Manual Test

1. Actor with rifle has "Enhanced Critical (Rifles): +1d6"
2. Roll attack with rifle
3. On confirmed critical, roll damage
4. Damage formula should include `(1d6)` bonus
5. Flavor text should show `[CRITICAL]` label

### Stacking Test

1. Actor with rifle has two crit damage talents
2. Roll critical damage
3. Both bonuses should apply

## Files Modified

- `scripts/engine/execution/rules/rule-enum.js`
- `scripts/engine/execution/rules/rule-definitions.js`
- `scripts/engine/abilities/passive/rule-types.js`
- `scripts/combat/utils/combat-utils.js`
- `scripts/combat/rolls/damage.js`
- `scripts/rolls/skills.js` (import fix)

# Talent Migration: Weapon Specialization to PASSIVE/RULE

## Overview

This document explains how to migrate Weapon Specialization talents from their current structure to the new PASSIVE/RULE execution model that leverages the CombatRulesRegistry.

## Current State

Weapon Specialization talents are currently passive talents that grant flat damage bonuses. Multiple variants exist:
- Weapon Specialization (Lightsabers) — grants +2 damage
- Weapon Specialization (Blasters) — grants +2 damage
- Weapon Specialization (Melee Weapons) — grants +2 damage
- Greater Weapon Specialization (Lightsabers) — grants +4 damage
- etc.

## Migration Pattern

### Step 1: Update Talent Data Structure

For each Weapon Specialization talent, add execution model and ability metadata:

```javascript
{
  "_id": "00a9210772a64a19",
  "name": "Weapon Specialization (Lightsabers)",
  "type": "talent",
  "system": {
    // ... existing fields ...
    "executionModel": "PASSIVE",
    "subType": "RULE",
    "abilityMeta": {
      "ruleType": "WEAPON_SPECIALIZATION",
      "params": {
        "proficiency": "lightsabers",
        "bonus": 2
      }
    }
  }
}
```

### Step 2: Map Weapon Groups

Each talent's "proficiency" parameter must map to a weapon proficiency group:

| Talent | Proficiency | Bonus |
|--------|------------|-------|
| Weapon Specialization (Lightsabers) | "lightsabers" | 2 |
| Weapon Specialization (Blasters) | "blasters" | 2 |
| Weapon Specialization (Melee Weapons) | "melee" | 2 |
| Weapon Specialization (Simple Weapons) | "simple" | 2 |
| Weapon Specialization (Exotic Weapons) | "exotic" | 2 |
| Greater Weapon Specialization (Lightsabers) | "lightsabers" | 4 |
| Greater Weapon Specialization (Blasters) | "blasters" | 4 |
| Greater Weapon Specialization (Melee Weapons) | "melee" | 4 |
| etc. | ... | ... |

### Step 3: Verify Integration

Once talent data is updated:

1. **Talent grant**: When character receives talent, RuleCollector automatically collects `abilityMeta` and stores in actor._ruleParams
2. **Resolution context**: When building damage, `weapon-specialization-rule` queries ResolutionContext.getRuleInstances(RULES.WEAPON_SPECIALIZATION)
3. **Rule application**: Rule filters by weapon proficiency and applies highest bonus
4. **Diagnostic tracking**: Result includes `talent.weapon-specialization:lightsabers:+2` in rulesTriggered

## Implementation Steps

### For Each Weapon Specialization Variant:

1. **Add executionModel to talent data:**
   ```json
   "executionModel": "PASSIVE",
   "subType": "RULE"
   ```

2. **Add abilityMeta with correct parameters:**
   ```json
   "abilityMeta": {
     "ruleType": "WEAPON_SPECIALIZATION",
     "params": {
       "proficiency": "[weapon_group]",
       "bonus": [2 or 4]
     }
   }
   ```

3. **Verify weapon proficiency group matches weapon system data:**
   - Check weapon.system.proficiency field
   - Ensure it matches the talent's proficiency parameter
   - Map weapon data if needed

### Migration Checklist

- [ ] Identify all Weapon Specialization talent variants (WS + Greater WS)
- [ ] Map each variant to weapon group proficiency
- [ ] Update packs/talents.db with executionModel and abilityMeta
- [ ] Test character with WS talent grants damage bonus
- [ ] Verify bonus applies only to matching weapon group
- [ ] Confirm diagnostics show rule triggering
- [ ] Test Greater WS overrides WS (+4 not +2+2)
- [ ] Test multiple WS talents (one per weapon group)

## Manual Migration Example

**Before Migration:**
```json
{
  "_id": "abc123",
  "name": "Weapon Specialization (Lightsabers)",
  "type": "talent",
  "system": {
    "prerequisites": "Martial Arts I",
    "description": "You gain a +2 bonus on melee damage rolls with Lightsabers...",
    "benefit": "..."
  }
}
```

**After Migration:**
```json
{
  "_id": "abc123",
  "name": "Weapon Specialization (Lightsabers)",
  "type": "talent",
  "system": {
    "prerequisites": "Martial Arts I",
    "description": "You gain a +2 bonus on melee damage rolls with Lightsabers...",
    "benefit": "...",
    "executionModel": "PASSIVE",
    "subType": "RULE",
    "abilityMeta": {
      "ruleType": "WEAPON_SPECIALIZATION",
      "params": {
        "proficiency": "lightsabers",
        "bonus": 2
      }
    }
  }
}
```

## Testing Verification

After migration, verify:

1. **Grant talent to test character:**
   ```javascript
   const testCharacter = game.actors.getName("Test Character");
   const talentData = {
     name: "Weapon Specialization (Lightsabers)",
     type: "talent",
     system: {
       executionModel: "PASSIVE",
       subType: "RULE",
       abilityMeta: {
         ruleType: "WEAPON_SPECIALIZATION",
         params: { proficiency: "lightsabers", bonus: 2 }
       }
     }
   };
   await testCharacter.createEmbeddedDocuments("Item", [talentData]);
   ```

2. **Attack with matching weapon:**
   ```javascript
   const lightsaber = testCharacter.items.getName("Lightsaber");
   const evaluation = WeaponsEngine.evaluateAttack({
     actor: testCharacter,
     weapon: lightsaber,
     context: {},
     telemetry: true
   });

   // Check evaluation includes +2 damage bonus
   console.assert(evaluation.diagnostics.rulesTriggered.includes("talent.weapon-specialization:lightsabers:+2"));
   ```

3. **Attack with non-matching weapon:**
   ```javascript
   const blaster = testCharacter.items.getName("Blaster");
   const evaluation = WeaponsEngine.evaluateAttack({
     actor: testCharacter,
     weapon: blaster,
     context: {},
     telemetry: true
   });

   // Should NOT have WS bonus
   console.assert(!evaluation.diagnostics.rulesTriggered.some(t => t.includes("weapon-specialization")));
   ```

## Proficiency Group Mapping Reference

Based on SWSE weapon proficiency system:

```
Weapon Groups (proficiency codes):
- "simple" — Simple weapons (clubs, daggers, etc.)
- "martial" — Martial weapons (swords, spears, etc.)
- "lightsabers" — Lightsaber variants
- "blasters" — Blaster variants
- "melee" — Generic melee (matches all melee)
- "ranged" — Generic ranged (matches all ranged)
- "exotic" — Exotic weapons
- "advanced-melee" — Advanced melee weapons
- "advanced-ranged" — Advanced ranged weapons
```

## Troubleshooting

**Bonus not applying:**
- Check weapon.system.proficiency matches talent params.proficiency
- Verify talent has executionModel: "PASSIVE" and subType: "RULE"
- Confirm abilityMeta.ruleType is exactly "WEAPON_SPECIALIZATION"
- Check actor._ruleParams has the rule instance after talent grant

**Wrong bonus amount (e.g., +2 instead of +4):**
- Verify you have Greater Weapon Specialization (+4), not base Weapon Specialization (+2)
- Check rule takes highest bonus (Greater WS +4 should override WS +2)
- Review weapon-specialization-rule.js maxBonus logic

**Multiple bonuses stacking (+2 and +2 = +4):**
- This is correct if character has both WS and Greater WS for same group
- Rule correctly takes highest (+4), not sum
- Check diagnostics to see which rule triggered

## Next Steps

1. Create migration script to batch-update all WS talents
2. Test migration on development environment
3. Verify all weapon specialization variants work correctly
4. Document any new weapon groups discovered during migration
5. Plan migration for other talent types (Power Attack, etc.)

## Related Files

- `scripts/engine/rules/modules/talents/weapon-specialization-rule.js` — Rule implementation
- `scripts/engine/rules/modules/talents/index.js` — Talent rule initializer
- `scripts/engine/execution/rules/rule-enum.js` — WEAPON_SPECIALIZATION enum
- `scripts/engine/execution/rules/rule-definitions.js` — WEAPON_SPECIALIZATION schema
- `scripts/engine/abilities/passive/rule-types.js` — RULE type whitelist
- `packs/talents.db` — Talent data (requires update)

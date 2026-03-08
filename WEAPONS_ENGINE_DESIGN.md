# WeaponsEngine — Combat Rules Authority

## Overview

WeaponsEngine is a parallel rule authority for combat mechanics, analogous to SkillEnforcementEngine for skills.

It centralizes:
- Attack legality checks
- Attack modifier calculation
- Critical threat/multiplier logic
- Damage model construction
- Reach/range validation
- Sentinel diagnostics

**Key Principle:** WeaponsEngine is pure, deterministic, and side-effect free. It calculates and returns data structures. It does NOT:
- Mutate actors
- Deduct ammo
- Spend Force points
- Post chat messages
- Trigger conditions

## Architecture

```
Attack Initiated
    ↓
WeaponsEngine.evaluateAttack(actor, weapon, target)
    ├─ Check legality
    ├─ Calculate modifiers
    ├─ Return attack context
    ↓
RollEngine.rollAttack(attackContext)
    ├─ Roll d20 + bonuses
    ├─ Return roll result
    ↓
WeaponsEngine.resolveCritical(actor, weapon, d20, targetDefense)
    ├─ Check threat
    ├─ Calculate multiplier
    ├─ Possibly roll confirmation
    ↓
RollEngine.rollDamage(...)
    ↓
ActorEngine.applyDamage(...)
```

## API Contract

### 1. Attack Legality

```js
WeaponsEngine.canAttackWith(actor, weapon, target)

Returns:
{
  allowed: boolean,
  reason: string | null,
  issues: string[]
}

Checks:
- Weapon is not disabled
- Actor has weapon proficiency (or suffers penalty)
- No exotic weapon penalty
- Target is valid
```

### 2. Attack Modifiers

```js
WeaponsEngine.getAttackModifiers(actor, weapon, target, options = {})

Returns:
{
  base: number,              // Base attack bonus
  ability: number,           // STR/DEX modifier
  proficiency: number,       // 0 or -5 penalty
  size: number,              // Size modifier
  conditions: number,        // Condition track penalty
  cover: number,             // Cover penalty (from target position)
  range: number,             // Range increment penalty
  feats: [ { source, value } ],
  talents: [ { source, value } ],
  total: number
}

Calls:
- ConditionsEngine.getAttackPenalty()
- RuleCollector rules
```

### 3. Critical Logic

```js
WeaponsEngine.getCriticalProperties(actor, weapon)

Returns:
{
  threatRange: number,       // 20, 19, 18, etc. (min 2)
  multiplier: number,        // 2, 3, 4, etc.
  improved: boolean,         // Improved Critical (auto-threat on 15+)
  description: string        // "19-20 ×2"
}

Uses:
- EXTEND_CRITICAL_RANGE rules
- MODIFY_CRITICAL_MULTIPLIER rules
```

### 4. Damage Model

```js
WeaponsEngine.buildDamageModel(actor, weapon, options = {})

Returns:
{
  baseDice: [
    { count: 1, size: 6, type: "base" }
  ],
  bonusEffects: [
    { source: "StrengthMod", value: 3, type: "flat" },
    { source: "TalentCritBonus", value: "1d6", type: "dice", onlyOnCrit: true }
  ],
  totalFlat: 3,
  critMultiplier: 2,
  damageType: "kinetic",
  armorPiercing: 0,
  isCritical: false
}

Handles:
- Weapon base damage
- Strength/Dexterity modifiers
- Two-handed bonuses
- Light weapon restrictions
- Talent bonuses (flat and dice)
- CRITICAL_DAMAGE_BONUS rules
```

### 5. Reach & Range

```js
WeaponsEngine.validateRange(actor, weapon, target)

Returns:
{
  inReach: boolean,
  inRange: boolean,
  rangePenalty: number,
  reason: string
}

Checks:
- Melee reach vs target distance
- Ranged increments
- Range exceeds weapon limit
```

### 6. Sentinel Integration

```js
WeaponsEngine.getAttackDiagnostics(actor, weapon, target)

Returns:
{
  rulesTriggered: [
    "ImprovedCritical",
    "TwoWeaponFighting",
    "EXTEND_CRITICAL_RANGE:rifles"
  ],
  anomalies: [],
  isSuspicious: boolean
}

Sentinel can:
- Audit rule triggering
- Detect illegal attacks
- Flag rule drift
```

## Implementation Phases

### Phase 1: Core Structure
- WeaponsEngine class skeleton
- canAttackWith() - basic legality
- getCriticalProperties() - uses existing EXTEND_CRITICAL_RANGE, MODIFY_CRITICAL_MULTIPLIER

### Phase 2: Modifiers
- getAttackModifiers() - full bonus calculation
- Integration with ConditionsEngine (read-only)
- Talent bonus lookup

### Phase 3: Damage Construction
- buildDamageModel() - structured damage description
- Support for crit bonuses and multiplier
- Two-handed and light weapon logic

### Phase 4: Reach & Range
- validateRange() - distance checks
- Range increment penalties

### Phase 5: Integration
- Wire into existing attack flows
- Provide to RollEngine
- Expose to UI layer for previews

## File Structure

```
scripts/engine/combat/weapons/
├── weapons-engine.js                 # Main class
├── rules/
│   ├── attack-legality-rule.js       # canAttackWith logic
│   ├── attack-modifiers-rule.js      # getAttackModifiers logic
│   ├── critical-rule.js              # getCriticalProperties logic
│   ├── damage-rule.js                # buildDamageModel logic
│   ├── reach-rule.js                 # validateRange logic
│   └── sentinel-rule.js              # getDiagnostics logic
└── utils/
    └── damage-model.js               # DamageModel data structure
```

## Data Structures

### DamageModel

```js
class DamageModel {
  baseDice = [];           // weapon base dice
  bonusEffects = [];       // modifiers, talents, rules
  totalFlat = 0;           // sum of flat bonuses
  critMultiplier = 2;      // from MODIFY_CRITICAL_MULTIPLIER
  damageType = 'kinetic';  // kinetic, energy, etc.
  armorPiercing = 0;       // AP value
  isCritical = false;      // true if critical hit

  getTotalFlat() { ... }
  applyMultiplier(factor) { ... }
  toFormula() { ... }      // "2d6 + 3 + 1d6"
}
```

## Integration Points

1. **Attack Button Handler**
   - Call WeaponsEngine.evaluateAttack()
   - Validate before showing UI

2. **RollEngine**
   - Receive attack context from WeaponsEngine
   - Use modifiers for d20 roll

3. **Chat Card**
   - Display damage model from buildDamageModel()
   - Show threat range from getCriticalProperties()
   - Preview modifiers from getAttackModifiers()

4. **ActorEngine**
   - Receive damage total from damage roll
   - Apply via existing applyDamage()

5. **ConditionsEngine**
   - WeaponsEngine queries for penalties (read-only)
   - No mutation, no circular dependency

## Critical System Integration

WeaponsEngine uses new rule enums:
- `EXTEND_CRITICAL_RANGE` - extends threat range
- `MODIFY_CRITICAL_MULTIPLIER` - changes multiplier
- `CRITICAL_DAMAGE_BONUS` - adds damage on crit

getCriticalProperties() queries these via ResolutionContext:

```js
getCriticalProperties(actor, weapon) {
  const ctx = new ResolutionContext(actor);

  const baseRange = weapon.system.critRange || 20;
  const critRules = ctx.getRuleInstances(RULES.EXTEND_CRITICAL_RANGE);

  let threatRange = baseRange;
  for (const rule of critRules) {
    if (rule.proficiency === weapon.system.proficiency) {
      threatRange -= rule.by;
    }
  }
  threatRange = Math.max(2, threatRange);

  const multRules = ctx.getRuleInstances(RULES.MODIFY_CRITICAL_MULTIPLIER);
  let multiplier = weapon.system.critMultiplier || 2;
  for (const rule of multRules) {
    if (rule.proficiency === weapon.system.proficiency) {
      multiplier = Math.max(multiplier, rule.multiplier);
    }
  }

  return { threatRange, multiplier };
}
```

## Next: Implementation

Will follow this sequence:
1. Create weapons-engine.js with skeleton
2. Implement getCriticalProperties() first (uses existing rules)
3. Implement canAttackWith() (basic legality)
4. Implement getAttackModifiers() (ties to ConditionsEngine)
5. Integrate into attack flows

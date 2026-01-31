# Rule Elements Migration Guide

This guide explains how to migrate existing SWSE feat/talent effects from hard-coded logic to the new data-driven rule element system.

## Why Rule Elements?

**Before (Hard-coded):**
```javascript
// In progression engine
if (featName === "Weapon Focus (Lightsabers)") {
  actor.system.bonuses.attack.lightsaber = 1;
}
```

**Problems:**
- Logic scattered across codebase
- Hard to maintain (100+ feats)
- No automatic removal
- Can't be data-driven from compendium

**After (Rule Elements):**
```json
{
  "name": "Weapon Focus (Lightsabers)",
  "type": "feat",
  "system": {
    "rules": [
      {
        "type": "StatBonus",
        "stat": "attack.lightsaber",
        "value": 1,
        "bonusType": "feat"
      }
    ]
  }
}
```

**Benefits:**
- Self-contained
- Automatic application/removal
- No code changes needed for new feats
- Compendium-driven

---

## Rule Element Types

### 1. StatBonus
Adds a bonus to any stat.

```json
{
  "type": "StatBonus",
  "stat": "reflex",
  "value": 2,
  "bonusType": "dodge"
}
```

**Common stats:**
- `reflex`, `fortitude`, `will` (defenses)
- `attack`, `attack.melee`, `attack.ranged`
- `damage`, `damage.lightsaber`
- `initiative`
- `speed`

**Bonus types:**
- `dodge` (don't stack with dodge)
- `armor` (don't stack with armor)
- `feat` (stack)
- `untyped` (stack)

### 2. GrantAbility
Grants an action/ability to the character.

```json
{
  "type": "GrantAbility",
  "abilityId": "deflect",
  "actionType": "reaction"
}
```

**Action types:**
- `action` (standard action)
- `move` (move action)
- `swift` (swift action)
- `reaction` (reaction)
- `free` (free action)

### 3. SkillTraining
Grants training in a skill.

```json
{
  "type": "SkillTraining",
  "skill": "stealth",
  "bonus": 5
}
```

### 4. AttributeModifier
Modifies base attributes.

```json
{
  "type": "AttributeModifier",
  "attribute": "str",
  "value": 2,
  "source": "species"
}
```

**Sources:**
- `species` (racial modifiers)
- `level` (ability increases)
- `misc` (other sources)

### 5. ConditionalBonus
Bonus that applies under certain conditions.

```json
{
  "type": "ConditionalBonus",
  "stat": "attack",
  "value": 2,
  "condition": "vs droids"
}
```

### 6. Prerequisite
Defines prerequisites (doesn't grant anything).

```json
{
  "type": "Prerequisite",
  "prerequisites": {
    "bab": 5,
    "feats": ["Force Sensitive"],
    "level": 3
  }
}
```

---

## Migration Examples

### Example 1: Weapon Focus

**Before:**
```javascript
// Hard-coded in engine
case "Weapon Focus (Lightsabers)":
  actor.system.attack.lightsaber += 1;
  break;
```

**After:**
```json
{
  "name": "Weapon Focus (Lightsabers)",
  "type": "feat",
  "system": {
    "description": "+1 attack with lightsabers",
    "rules": [
      {
        "type": "StatBonus",
        "stat": "attack.lightsaber",
        "value": 1,
        "bonusType": "feat"
      }
    ]
  }
}
```

### Example 2: Dodge

**Before:**
```javascript
case "Dodge":
  actor.system.reflex += 1;
  break;
```

**After:**
```json
{
  "name": "Dodge",
  "type": "feat",
  "system": {
    "description": "+1 dodge bonus to Reflex Defense",
    "rules": [
      {
        "type": "StatBonus",
        "stat": "reflex",
        "value": 1,
        "bonusType": "dodge"
      }
    ]
  }
}
```

### Example 3: Skill Focus

**Before:**
```javascript
case "Skill Focus (Stealth)":
  actor.system.skills.stealth.bonus += 5;
  break;
```

**After:**
```json
{
  "name": "Skill Focus (Stealth)",
  "type": "feat",
  "system": {
    "description": "+5 bonus to Stealth checks",
    "rules": [
      {
        "type": "StatBonus",
        "stat": "skills.stealth",
        "value": 5,
        "bonusType": "feat"
      }
    ]
  }
}
```

### Example 4: Deflect (Jedi Talent)

**Before:**
```javascript
case "Deflect":
  actor.system.abilities.push("deflect");
  break;
```

**After:**
```json
{
  "name": "Deflect",
  "type": "talent",
  "system": {
    "description": "As a reaction, deflect one ranged attack",
    "rules": [
      {
        "type": "GrantAbility",
        "abilityId": "deflect",
        "actionType": "reaction"
      }
    ]
  }
}
```

### Example 5: Human Species

**Before:**
```javascript
case "Human":
  actor.system.attributes.str.racial = 2; // if chosen
  actor.system.speed = 6;
  break;
```

**After:**
```json
{
  "name": "Human",
  "type": "species",
  "system": {
    "description": "+2 to one ability, bonus feat, bonus trained skill",
    "rules": [
      {
        "type": "AttributeModifier",
        "attribute": "{{chosenAbility}}",
        "value": 2,
        "source": "species"
      }
    ]
  }
}
```

### Example 6: Level-Scaling Talent

**Before:**
```javascript
case "Improved Damage":
  const bonus = Math.floor(actor.system.level / 5);
  actor.system.damage += bonus;
  break;
```

**After:**
```json
{
  "name": "Improved Damage",
  "type": "talent",
  "system": {
    "description": "Damage bonus increases with level",
    "rules": [
      {
        "type": "StatBonus",
        "stat": "damage",
        "value": "Math.floor(@level / 5)",
        "bonusType": "untyped"
      }
    ]
  }
}
```

---

## Migration Process

### Step 1: Identify Hard-Coded Logic

Search codebase for feat/talent application logic:

```bash
grep -r "featName ===" scripts/
grep -r "talentName ===" scripts/
```

### Step 2: Convert to Rule Elements

For each feat/talent:
1. Identify what it does
2. Choose appropriate rule element type(s)
3. Add `rules` array to item data

### Step 3: Update Compendium

```javascript
// Update existing compendium items
const pack = game.packs.get('foundryvtt-swse.feats');
const item = await pack.getDocument(itemId);
await item.update({
  'system.rules': [
    { type: "StatBonus", stat: "reflex", value: 2 }
  ]
});
```

### Step 4: Remove Hard-Coded Logic

Delete the old switch/case logic from progression engine.

### Step 5: Test

```javascript
// Test rule application
const actor = game.actors.getName("Test Character");
const ruleEngine = new RuleEngine(actor);
await ruleEngine.applyAllRules();

console.log(actor.system.bonuses); // Should show applied bonuses
```

---

## Integration with Progression

### Automatic Application on Item Creation

```javascript
// In Actor.createEmbeddedDocuments hook
Hooks.on('createItem', async (item, options, userId) => {
  const actor = item.actor;
  if (!actor) return;

  const ruleEngine = new RuleEngine(actor);

  // Apply rules from newly created item
  if (item.system.rules) {
    for (const ruleData of item.system.rules) {
      const rule = RuleElement.create(ruleData, item);
      if (rule && rule.test(actor)) {
        await rule.apply(actor);
      }
    }
  }
});
```

### Automatic Removal on Item Deletion

```javascript
// In Actor.deleteEmbeddedDocuments hook
Hooks.on('deleteItem', async (item, options, userId) => {
  const actor = item.actor;
  if (!actor) return;

  const ruleEngine = new RuleEngine(actor);
  await ruleEngine.removeItemRules(item);
});
```

---

## Testing Checklist

- [ ] Create character with feat
- [ ] Verify bonus appears in derived stats
- [ ] Delete feat
- [ ] Verify bonus is removed
- [ ] Test with multiple feats (stacking)
- [ ] Test prerequisites
- [ ] Test conditional bonuses
- [ ] Test level-scaling formulas

---

## Common Pitfalls

### 1. Bonus Stacking

**Problem:** Multiple dodge bonuses applied
```json
[
  { "type": "StatBonus", "stat": "reflex", "value": 1, "bonusType": "dodge" },
  { "type": "StatBonus", "stat": "reflex", "value": 2, "bonusType": "dodge" }
]
```

**Solution:** Derived stat calculator should only use highest dodge bonus.

### 2. Double Application

**Problem:** Rule applied twice (once in compendium, once in progression)

**Solution:** Always use rule elements OR hard-coded logic, never both.

### 3. Circular Dependencies

**Problem:** Rule A depends on stat modified by Rule B, which depends on Rule A

**Solution:** Apply rules in dependency order, or use multi-pass evaluation.

---

## Advanced Usage

### Multiple Rules Per Item

```json
{
  "name": "Mighty Swing",
  "type": "talent",
  "system": {
    "rules": [
      {
        "type": "StatBonus",
        "stat": "damage.melee",
        "value": "@str.mod",
        "bonusType": "untyped"
      },
      {
        "type": "Prerequisite",
        "prerequisites": {
          "attributes": { "str": 13 }
        }
      }
    ]
  }
}
```

### Conditional Rule Application

```json
{
  "type": "ConditionalBonus",
  "stat": "attack",
  "value": 2,
  "condition": "when using lightsaber form II"
}
```

---

## Future Enhancements

- **Rule element editor UI** in item sheets
- **Visual effect preview** when dragging feats
- **Rule conflict detection** (warn about non-stacking bonuses)
- **Rule dependency graph** for debugging
- **Import/export rule templates** for common patterns

---

## Questions?

See `scripts/engine/RuleElement.js` for implementation details.

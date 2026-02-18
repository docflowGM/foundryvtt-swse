# Unified Rule Element Schema for SWSE

This document defines the canonical structure for representing mechanical rules across species, talents, feats, class features, and prestige classes.

---

## Core Principle

**No human-language conditions in the data model.**

All mechanical effects are expressed as structured rule elements with:
- Deterministic evaluation
- Machine-readable conditions
- Canonical internal IDs
- Bonus type tracking (for stacking rules)
- Provenance tracking

---

## Top-Level Rule Element Structure

```typescript
interface RuleElement {
  // Unique identifier within its context
  id: string;

  // Rule type determines structure and evaluation
  type: RuleType;

  // When this rule applies
  when?: ActivationCondition;

  // Source tracking for removal/stacking rules
  source?: {
    sourceType: 'species' | 'class' | 'archetype' | 'talent' | 'feat' | 'prestige';
    sourceId: string;
  };
}

type RuleType =
  | 'skillModifier'
  | 'defenseModifier'
  | 'damageModifier'
  | 'featGrant'
  | 'talentGrant'
  | 'specialAbility'
  | 'abilityScoreModifier'
  | 'naturalWeapon';

type ActivationCondition =
  | { type: 'always' }
  | { type: 'skillTrained'; skillId: string }
  | { type: 'skillUntrained'; skillId: string }
  | { type: 'featOwned'; featId: string }
  | { type: 'levelReached'; minLevel: number }
  | { type: 'OR'; conditions: ActivationCondition[] }
  | { type: 'AND'; conditions: ActivationCondition[] };
```

---

## Skill Modifier Rule

Used for flat bonuses and conditional skill bonuses.

```typescript
interface SkillModifierRule extends RuleElement {
  type: 'skillModifier';

  // The skill being modified (use canonical ID from skills.json)
  skillId: string;

  // The modifier value (positive or negative)
  value: number;

  // Type of bonus (for Saga stacking rules)
  bonusType: 'species' | 'insight' | 'morale' | 'competence' | 'circumstance' | 'force' | 'synergy';

  // Optional context condition (for conditional modifiers)
  context?: {
    type: 'machinery' | 'energy-weapons' | 'sound' | 'trade' | 'negotiation' | 'underwater' | 'other';
    description?: string;
  };
}
```

### Example: Flat Bonus
```json
{
  "id": "qel-droma-force-bonus",
  "type": "skillModifier",
  "skillId": "useTheForce",
  "value": 2,
  "bonusType": "species",
  "when": { "type": "always" },
  "source": { "sourceType": "species", "sourceId": "qel-droma" }
}
```

### Example: Conditional Bonus
```json
{
  "id": "ugnaught-machinery-bonus",
  "type": "skillModifier",
  "skillId": "mechanics",
  "value": 5,
  "bonusType": "species",
  "context": {
    "type": "machinery",
    "description": "checks involving machinery"
  },
  "source": { "sourceType": "species", "sourceId": "ugnaught" }
}
```

---

## Defense Modifier Rule

```typescript
interface DefenseModifierRule extends RuleElement {
  type: 'defenseModifier';

  // Defense being modified
  defense: 'fortitude' | 'reflex' | 'will';

  // The modifier value
  value: number;

  // Type of bonus
  bonusType: 'species' | 'insight' | 'morale' | 'circumstance';
}
```

### Example
```json
{
  "id": "bith-fragile-penalty",
  "type": "defenseModifier",
  "defense": "fortitude",
  "value": -2,
  "bonusType": "species",
  "source": { "sourceType": "species", "sourceId": "bith" }
}
```

---

## Damage Modifier Rule

For attack roll bonuses and damage roll bonuses.

```typescript
interface DamageModifierRule extends RuleElement {
  type: 'damageModifier';

  // What type of attack this applies to
  attackType: 'melee' | 'ranged' | 'unarmed' | 'natural-weapon' | 'all';

  // What the modifier applies to
  target: 'attackRoll' | 'damageRoll' | 'both';

  // The modifier value
  value: number;

  // Type of bonus
  bonusType: 'species' | 'insight' | 'circumstance';

  // Optional: only in specific contexts
  context?: {
    type: 'swimming' | 'underwater' | 'four-armed' | 'other';
    description?: string;
  };
}
```

### Example: Melee Damage Bonus
```json
{
  "id": "chistori-melee-damage",
  "type": "damageModifier",
  "attackType": "melee",
  "target": "damageRoll",
  "value": 2,
  "bonusType": "species",
  "source": { "sourceType": "species", "sourceId": "chistori" }
}
```

---

## Feat Grant Rule

For granting feats, including conditional grants.

```typescript
interface FeatGrantRule extends RuleElement {
  type: 'featGrant';

  // The feat being granted
  featId: string;

  // Whether this stacks (multiple can be granted)
  allowMultiple: boolean;
}
```

### Example: Unconditional Feat Grant
```json
{
  "id": "miraluka-force-sensitivity",
  "type": "featGrant",
  "featId": "force-sensitivity",
  "when": { "type": "always" },
  "allowMultiple": false,
  "source": { "sourceType": "species", "sourceId": "miraluka" }
}
```

### Example: Conditional Feat Grant (Bonus Feat)
```json
{
  "id": "miraluka-force-training",
  "type": "featGrant",
  "featId": "force-training",
  "when": {
    "type": "skillTrained",
    "skillId": "useTheForce"
  },
  "allowMultiple": false,
  "source": { "sourceType": "species", "sourceId": "miraluka" }
}
```

---

## Special Ability Rule

For unique abilities that don't fit other categories.

```typescript
interface SpecialAbilityRule extends RuleElement {
  type: 'specialAbility';

  // Unique identifier for this ability
  abilityId: string;

  // Human-readable description (preserved for UX)
  description: string;

  // Category for organization
  category: 'natural-weapon' | 'sense' | 'immunity' | 'resistance' | 'trait' | 'other';
}
```

### Example
```json
{
  "id": "cathar-natural-claws",
  "type": "specialAbility",
  "abilityId": "natural-claw-attack",
  "description": "A Cathar has natural claw attacks that deal 1d4 points of slashing damage",
  "category": "natural-weapon",
  "source": { "sourceType": "species", "sourceId": "cathar" }
}
```

---

## Ability Score Modifier Rule

For species that modify ability scores.

```typescript
interface AbilityScoreModifierRule extends RuleElement {
  type: 'abilityScoreModifier';

  // The ability being modified
  ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

  // The modifier value
  value: number;
}
```

---

## Natural Weapon Rule

For permanent, structural attack entries (claws, bite, tail, etc.).

**Important**: Natural weapons are NOT activated abilities. They are permanent attack sources that generate embedded weapon items.

```typescript
interface NaturalWeaponRule extends RuleElement {
  type: 'naturalWeapon';

  // Unique identifier within species
  id: string;

  // Display name
  name: string;

  // Attack category
  weaponCategory: 'melee' | 'ranged';

  // Which ability modifier is used for attack rolls
  attackAbility: 'str' | 'dex' | 'auto';

  // Damage profile
  damage: {
    formula: string;              // e.g. "1d6", "1d4"
    damageType: string;           // slashing, piercing, bludgeoning, sonic, etc.
  };

  // Critical hit range and multiplier
  critical?: {
    range: number;                // Threat range (20 = 20-20, 19 = 19-20)
    multiplier: number;           // Crit multiplier (2x, 3x, 4x)
  };

  // Proficiency (always natural for natural weapons)
  proficiency: {
    type: 'natural';
    isProficient: true;
  };

  // Combat traits
  traits: {
    alwaysArmed: boolean;         // Cannot be disarmed
    countsAsWeapon: boolean;      // Treated as weapon for feat requirements
    finesse: boolean;             // Can use Dex or Str
    light: boolean;               // Can be dual-wielded
    twoHanded: boolean;           // Requires two limbs
  };

  // Optional damage scaling
  scaling?: {
    bySize: boolean;
    sizeTable?: Record<string, string>; // e.g. { "small": "1d4", "medium": "1d6" }
  };

  // Optional advanced override for embedded item template
  generatedItemData?: object;
}
```

### Example: Cathar Claws

```json
{
  "id": "claws",
  "type": "naturalWeapon",
  "name": "Claws",
  "weaponCategory": "melee",
  "attackAbility": "str",
  "damage": {
    "formula": "1d6",
    "damageType": "slashing"
  },
  "critical": {
    "range": 20,
    "multiplier": 2
  },
  "proficiency": {
    "type": "natural",
    "isProficient": true
  },
  "traits": {
    "alwaysArmed": true,
    "countsAsWeapon": true,
    "finesse": false,
    "light": false,
    "twoHanded": false
  },
  "scaling": {
    "bySize": false,
    "sizeTable": null
  },
  "when": { "type": "always" }
}
```

### Engine Behavior

When SpeciesTraitEngine processes a naturalWeapon rule:

1. **Create embedded Item** of type `weapon`
2. **Set flags for tracking**:
   ```json
   {
     "flags": {
       "swse": {
         "generatedBy": "species",
         "speciesId": "cathar",
         "ruleId": "claws",
         "naturalWeapon": true
       }
     }
   }
   ```
3. **On species change**: Remove all items with `flags.swse.generatedBy === "species"`
4. **Combat system**: Treats like normal weapons (no special logic)

---

## Species Trait Restructured Format

Instead of mixing descriptions with rules, split them:

```typescript
interface SpeciesTrait {
  // Unique identifier
  id: string;

  // Human-readable name (for UI)
  name: string;

  // Human-readable description (preserved for documentation)
  description: string;

  // Structured rules (for engine evaluation)
  rules: RuleElement[];
}
```

### Example: Before (Current)
```json
{
  "id": "silver-tongue",
  "name": "Silver Tongue",
  "description": "An Advozse gains a +5 species bonus on Persuasion checks."
}
```

### Example: After (New)
```json
{
  "id": "silver-tongue",
  "name": "Silver Tongue",
  "description": "An Advozse gains a +5 species bonus on Persuasion checks.",
  "rules": [
    {
      "id": "silver-tongue-mod",
      "type": "skillModifier",
      "skillId": "persuasion",
      "value": 5,
      "bonusType": "species",
      "when": { "type": "always" }
    }
  ]
}
```

---

## Updated Species Trait Format

```typescript
interface SpeciesData {
  name: string;

  // Structural traits (always-active)
  structuralTraits: SpeciesTrait[];

  // Conditional traits (situational abilities)
  conditionalTraits: SpeciesTrait[];

  // Bonus feats (feat grants from the species)
  bonusFeats: SpeciesTrait[];

  // Equipment grants
  equipmentGrants: any[];

  // Other metadata
  tags: string[];
  notes: string[];
}
```

### Full Miraluka Example
```json
{
  "name": "Miraluka",
  "structuralTraits": [
    {
      "id": "force-sensitivity",
      "name": "Force Sensitivity",
      "description": "A Miraluka gains the Force Sensitivity feat at 1st level.",
      "rules": [
        {
          "id": "force-sensitivity-grant",
          "type": "featGrant",
          "featId": "force-sensitivity",
          "when": { "type": "always" },
          "allowMultiple": false
        }
      ]
    }
  ],
  "bonusFeats": [
    {
      "id": "force-training",
      "name": "Force Training",
      "description": "A Miraluka who has Use the Force as a Trained Skill gains the Force Training feat.",
      "rules": [
        {
          "id": "force-training-grant",
          "type": "featGrant",
          "featId": "force-training",
          "when": {
            "type": "skillTrained",
            "skillId": "useTheForce"
          },
          "allowMultiple": false
        }
      ]
    }
  ]
}
```

---

## Canonical Skill IDs

From `data/skills.json`:

```
acrobatics
climb
deception
endurance
gatherInfo
initiative
jump
mechanics
perception
persuasion
pilot
stealth
survival
swim
treatInjury
useComputer
useTheForce
```

Knowledge skills (dynamic): `knowledge:<field>`

---

## Migration Checklist

- [ ] Add `rules` array to all structuralTraits
- [ ] Add `rules` array to all conditionalTraits
- [ ] Add `rules` array to all bonusFeats items
- [ ] Convert skill bonus descriptions → skillModifier rules
- [ ] Convert defense bonus descriptions → defenseModifier rules
- [ ] Convert damage bonus descriptions → damageModifier rules
- [ ] Convert feat grants → featGrant rules
- [ ] Convert special abilities → specialAbility rules
- [ ] Validate all rule IDs are unique within species
- [ ] Preserve human-readable descriptions for UI
- [ ] Remove human-language conditions from data

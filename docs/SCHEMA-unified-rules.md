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
  | 'damageReduction'
  | 'fastHealing'
  | 'featGrant'
  | 'talentGrant'
  | 'specialAbility'
  | 'abilityScoreModifier'
  | 'naturalWeapon'
  | 'movement'
  | 'breathing'
  | 'immunity'
  | 'reroll'
  | 'sense'
  | 'size'
  | 'naturalArmor'
  | 'rage'
  | 'meleeCultureBonus'
  | 'multiLimb'
  | 'restriction';

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

## Damage Reduction Rule

For species with inherent damage reduction (e.g., Chevin DR 2).

```typescript
interface DamageReductionRule extends RuleElement {
  type: 'damageReduction';

  // Amount of damage reduced
  value: number;

  // Which damage types this applies to
  appliesTo: {
    damageTypes: string[];  // e.g. ['all'], ['energy'], ['physical', 'fire']
    exceptions?: string[];  // e.g. ['force'] - types that bypass this DR
  };

  // Stacking behavior: 'highest' or 'stack'
  stacking?: 'highest' | 'stack';
}
```

### Example: Chevin DR 2
```json
{
  "id": "chevin-dr",
  "type": "damageReduction",
  "value": 2,
  "appliesTo": {
    "damageTypes": ["all"]
  },
  "stacking": "highest",
  "when": { "type": "always" }
}
```

### Example: Type-Specific DR
```json
{
  "id": "dr-energy",
  "type": "damageReduction",
  "value": 5,
  "appliesTo": {
    "damageTypes": ["energy"],
    "exceptions": ["force"]
  },
  "stacking": "highest"
}
```

---

## Fast Healing Rule

For persistent regeneration that occurs at specific timing (usually turn start).

```typescript
interface FastHealingRule extends RuleElement {
  type: 'fastHealing';

  // Amount healed per trigger
  value: number;

  // When healing occurs
  trigger: 'startOfTurn' | 'endOfTurn' | 'startOfRound';

  // Optional: only heal in specific conditions
  condition?: {
    type: 'environment' | 'hasEffect' | 'statusActive';
    value: string;  // e.g., 'water', 'regeneration-buff', 'alive'
  };

  // Optional: suppress healing under conditions
  suppressedBy?: {
    type: 'damageType' | 'condition' | 'effect';
    value: string[];
  };
}
```

### Example: Unconditional Fast Healing
```json
{
  "id": "fast-healing-5",
  "type": "fastHealing",
  "value": 5,
  "trigger": "startOfTurn",
  "when": { "type": "always" }
}
```

### Example: Conditional Fast Healing
```json
{
  "id": "fast-healing-water",
  "type": "fastHealing",
  "value": 5,
  "trigger": "startOfTurn",
  "condition": {
    "type": "environment",
    "value": "water"
  },
  "suppressedBy": {
    "type": "damageType",
    "value": ["fire", "cold"]
  }
}
```

---

## Movement Rule

For species with special movement modes or speeds.

```typescript
interface MovementRule extends RuleElement {
  type: 'movement';

  // Movement mode
  mode: 'walk' | 'climb' | 'swim' | 'fly' | 'burrow';

  // Speed in squares (Saga uses 5-ft squares)
  speed: number;

  // Can this be used in combat?
  combatMovement: boolean;

  // Optional condition
  condition?: {
    type: 'special' | 'terrain';
    value: string;
  };
}
```

### Example: Climb Speed
```json
{
  "id": "climb-speed",
  "type": "movement",
  "mode": "climb",
  "speed": 4,
  "combatMovement": true
}
```

---

## Breathing Rule

For species with special environmental requirements or immunities.

```typescript
interface BreathingRule extends RuleElement {
  type: 'breathing';

  // Type of breathing/environment adaptation
  type: 'aquatic' | 'amphibious' | 'vacuum' | 'vacuum-adapted' | 'poison-resistant' | 'other';

  // If true, no special breathing required
  immune: boolean;

  // Description for UI
  description: string;
}
```

### Example: Aquatic Breathing
```json
{
  "id": "aquatic-breathing",
  "type": "breathing",
  "breathType": "aquatic",
  "immune": false,
  "description": "Can breathe underwater"
}
```

---

## Immunity Rule

For damage type, condition, or effect immunities.

```typescript
interface ImmunityRule extends RuleElement {
  type: 'immunity';

  // What this provides immunity to
  immuneTo: {
    type: 'damageType' | 'condition' | 'effect' | 'environment';
    values: string[];  // e.g. ['fire', 'cold'] or ['charm', 'fear']
  };

  // Optional exceptions
  exceptions?: string[];

  // Severity: 'full' (immune) or 'partial' (resistance)
  severity: 'full' | 'partial';
}
```

### Example: Droid Immunities
```json
{
  "id": "droid-immunities",
  "type": "immunity",
  "immuneTo": {
    "type": "condition",
    "values": ["poison", "disease", "sleep"]
  },
  "severity": "full"
}
```

### Example: Partial Immunity
```json
{
  "id": "fire-resistance",
  "type": "immunity",
  "immuneTo": {
    "type": "damageType",
    "values": ["fire"]
  },
  "severity": "partial"
}
```

---

## Reroll Rule

For conditional reroll abilities (e.g., "may reroll, must accept result" or "reroll, keep higher").

```typescript
interface RerollRule extends RuleElement {
  type: 'reroll';

  // What triggers the reroll opportunity
  triggeredBy: {
    type: 'skillCheck' | 'abilityCheck' | 'attack' | 'save' | 'initiative';
    skillId?: string;  // For skill-specific rerolls
  };

  // Number of times this can be rerolled per encounter/day
  timesPerEncounter: number;

  // What happens after reroll
  outcome: 'mustAccept' | 'keepHigher' | 'chooseEither';

  // Description for UI
  description: string;
}
```

### Example: Silver Tongue (Reroll & Must Accept)
```json
{
  "id": "silver-tongue-reroll",
  "type": "reroll",
  "triggeredBy": {
    "type": "skillCheck",
    "skillId": "persuasion"
  },
  "timesPerEncounter": 1,
  "outcome": "mustAccept",
  "description": "May reroll any Persuasion check, but must accept the result"
}
```

### Example: Expert Pilot (Reroll, Choose Higher)
```json
{
  "id": "expert-pilot",
  "type": "reroll",
  "triggeredBy": {
    "type": "skillCheck",
    "skillId": "pilot"
  },
  "timesPerEncounter": 1,
  "outcome": "keepHigher",
  "description": "May reroll any Pilot check"
}
```

---

## Sense Rule

For special senses like blindsense, darkvision, Force sight.

```typescript
interface SenseRule extends RuleElement {
  type: 'sense';

  // Type of sense
  senseType: 'darkvision' | 'blindsense' | 'tremorsense' | 'force-sight' | 'other';

  // Range in squares (or null for unlimited)
  range: number | null;

  // Optional: conditions that suppress or modify this sense
  suppressedBy?: string[];  // e.g., ['magical-darkness', 'force-suppression']

  // Description for UI
  description: string;
}
```

### Example: Darkvision
```json
{
  "id": "darkvision",
  "type": "sense",
  "senseType": "darkvision",
  "range": null,
  "description": "Ignores concealment caused by darkness"
}
```

### Example: Blindsense
```json
{
  "id": "blindsense-6sq",
  "type": "sense",
  "senseType": "blindsense",
  "range": 6,
  "description": "Gains blindsense out to 6 squares"
}
```

---

## Size Rule

For size category effects (penalties/bonuses).

```typescript
interface SizeRule extends RuleElement {
  type: 'size';

  // Size category
  sizeCategory: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

  // Effects
  effects: {
    reflexDefensePenalty?: number;
    stealthPenalty?: number;
    damageThresholdBonus?: number;
    carryingCapacityMultiplier?: number;
    grappleBonus?: number;
  };
}
```

### Example: Large Size
```json
{
  "id": "large-size",
  "type": "size",
  "sizeCategory": "large",
  "effects": {
    "reflexDefensePenalty": -1,
    "stealthPenalty": -5,
    "damageThresholdBonus": 5,
    "carryingCapacityMultiplier": 2
  }
}
```

---

## Natural Armor Rule

For natural armor bonuses (stacks with armor).

```typescript
interface NaturalArmorRule extends RuleElement {
  type: 'naturalArmor';

  // Bonus amount
  value: number;

  // Defense this applies to (usually reflex)
  defense: 'reflex' | 'fortitude' | 'will';

  // Note: always stacks with equipment armor
}
```

### Example: Mantellian Savrip Natural Armor
```json
{
  "id": "natural-armor-2",
  "type": "naturalArmor",
  "value": 2,
  "defense": "reflex"
}
```

---

## Rage Rule

For triggered combat bonuses when conditions are met.

```typescript
interface RageRule extends RuleElement {
  type: 'rage';

  // What triggers rage
  trigger: {
    type: 'hpThreshold' | 'condition' | 'action';
    value?: number | string;  // e.g., 50 (for 50% HP) or 'damaged-by-fire'
  };

  // Duration
  duration: 'untilEndOfEncounter' | 'untilHealed' | '1d4rounds' | 'other';

  // Bonuses while active
  bonuses: {
    meleeAttackBonus?: number;
    meleeDamageBonus?: number;
    fortitudeDefenseBonus?: number;
  };

  // Description
  description: string;
}
```

### Example: Wookiee Rage
```json
{
  "id": "wookiee-rage",
  "type": "rage",
  "trigger": {
    "type": "hpThreshold",
    "value": 50
  },
  "duration": "untilEndOfEncounter",
  "bonuses": {
    "meleeAttackBonus": 2,
    "meleeDamageBonus": 2
  },
  "description": "When reduced to half hit points or fewer, gains +2 to melee attacks and damage"
}
```

---

## Melee Culture Bonus Rule

For flat melee bonuses from culture/training.

```typescript
interface MeleeCultureBonusRule extends RuleElement {
  type: 'meleeCultureBonus';

  // Bonus amount
  value: number;

  // Type of melee attack
  appliesTo: 'all' | 'unarmed' | 'weapons' | 'natural-weapons';

  // Bonus type
  bonusType: 'species' | 'insight' | 'morale';

  // Optional: only when conditions met
  condition?: {
    type: 'trained' | 'proficient';
    value?: string;
  };
}
```

### Example: Warrior Culture
```json
{
  "id": "warrior-culture",
  "type": "meleeCultureBonus",
  "value": 2,
  "appliesTo": "all",
  "bonusType": "species",
  "description": "Gains +2 bonus on melee attack rolls"
}
```

---

## Multi-Limb Rule

For bonuses from extra limbs (grapple, multi-weapon).

```typescript
interface MultiLimbRule extends RuleElement {
  type: 'multiLimb';

  // Number of extra limbs
  limbCount: number;

  // Effects
  effects: {
    grappleBonus?: number;
    weaponPenaltyIgnore?: boolean;  // Ignore multi-weapon penalty
  };
}
```

### Example: Four Arms (Besalisk)
```json
{
  "id": "four-arms",
  "type": "multiLimb",
  "limbCount": 4,
  "effects": {
    "grappleBonus": 2,
    "weaponPenaltyIgnore": true
  }
}
```

---

## Restriction Rule

For mechanical restrictions (can't use certain weapons, equipment, etc.).

```typescript
interface RestrictionRule extends RuleElement {
  type: 'restriction';

  // What is restricted
  restricts: 'weaponType' | 'equipmentType' | 'feat' | 'ability' | 'other';

  // What specifically is restricted
  targets: string[];  // e.g., ['heavy-weapons', 'pistols', 'rifles']

  // Reason (for UI)
  reason: string;
}
```

### Example: Primitive Weapons Restriction
```json
{
  "id": "primitive-restriction",
  "type": "restriction",
  "restricts": "weaponType",
  "targets": ["heavy-weapons", "pistols", "rifles"],
  "reason": "Does not gain proficiency with advanced weapons"
}
```

### Example: Living Technology Restriction
```json
{
  "id": "living-tech-restriction",
  "type": "restriction",
  "restricts": "equipmentType",
  "targets": ["inorganic-equipment", "cybernetics"],
  "reason": "Can only use organic equipment"
}
```

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

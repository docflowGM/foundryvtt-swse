# Normalized Background Schema (Phase 1)

## Overview
This document defines the canonical schema for representing background mechanical grants in the SWSE progression system. The schema supports both single-background and multi-background (house rule) modes.

## Core Background Identity
```javascript
{
  // Identity/Metadata
  id: string,                          // Unique ID (e.g., "bankrupt", "alderaan")
  name: string,                        // Display name (e.g., "Bankrupt", "Alderaan Origin")
  slug: string,                        // URL-safe slug derived from ID
  source: string,                      // Source identifier (e.g., "core", "homebrew")
  category: "event" | "occupation" | "planet",  // Background category
  
  // Narrative/Descriptive
  narrativeDescription: string,        // Flavor text
  icon: string,                        // Unicode emoji or icon identifier
  
  // This is the identity layer that serves as SSOT root
}
```

## Grant Classifications & Mechanical Effects

### 1. Class Skill Expansion
**Nature:** Non-stacking set union. Multiple backgrounds granting same skill → skill added once.

```javascript
classSkillExpansion: {
  type: "class_skills",
  grantedSkills: ["Persuasion", "Knowledge (Any)"],  // Actual skill names from progression
  skillChoiceCount: 2,                 // Player can choose 2 from relevantSkills list
  relevantSkills: ["Persuasion", "Knowledge (Any)", "Treat Injury"],  // Player options
  conflictResolution: "set_union"      // Multiple BGs → union, no duplication benefit
}
```

### 2. Language Grants
**Nature:** Additive. Multiple backgrounds can stack language grants.

```javascript
languageGrants: {
  type: "fixed_languages",
  languages: ["High Galactic"],        // Fixed language (e.g., from homeworld)
  entitlementCount: 0                  // Bonus picks (0 = no choice, >0 = choices available)
}
```

### 3. Skill Bonuses (Flat & Conditional)
**Nature:** Additive. Multiple sources stack.

```javascript
skillBonuses: [
  {
    type: "flat_untrained",
    value: 2,                          // +2 to untrained checks
    applicableSkills: ["Knowledge (Any)", "Persuasion"],  // Applies to these
    condition: "untrained_only"        // Bonus only when skill is untrained
  },
  {
    type: "flat_always",
    value: 2,                          // Always applies
    target: "grapple",                 // Grapple checks, defense, etc.
    condition: "always"
  }
]
```

### 4. Passive Features/Special Abilities
**Nature:** Unstructured prose. Must be applied at runtime or marked for manual review.

```javascript
passiveEffects: [
  {
    type: "special_ability",
    description: "You can use Survival to sustain yourself in urban environments",
    mechanicalBasis: "uses_untrained_skill",  // Classification for downstream
    requiresRuntime: false              // true = needs session/actor state
  },
  {
    type: "reroll",
    description: "Reroll Perception checks to Sense Deception or Influence (keep better)",
    mechanicalBasis: "reroll_mechanic",
    applicableToChecks: ["Sense Deception", "Sense Influence"],
    requiresRuntime: true               // Needs actor handler at check time
  }
]
```

### 5. Prerequisite-Relevant Flags
**Nature:** Metadata for future prerequisite checking.

```javascript
tags: [
  "survival-trained",                  // Can be used in prereqs
  "homeworld-alderaan",
  "event-criminal"
]
```

### 6. Subsystem-Specific Grants
**Nature:** Extensible for future subsystems (Force, species interactions, etc.).

```javascript
subsystemGrants: {
  force: null,                         // Future: Force sensitivity flags
  species: null,                       // Future: Species-specific bonuses
  vehicle: null                        // Future: Vehicle proficiencies
}
```

### 7. Unresolved/Manual-Review Items

```javascript
unresolvedItems: [
  {
    source: "mechanicalEffect.type=special_ability",
    description: "Uses Survival in urban environments — requires actor handler",
    status: "requires_runtime",
    phase: "later"
  }
]
```

## Normalized Background Grant Ledger

**Input:** Raw background object from backgrounds.json + multi-background selections
**Output:** Fully normalized, merged ledger with stacking rules applied

```javascript
{
  // Identity
  selectedBackgroundIds: ["alderaan", "bankrupt"],  // Multi-background
  
  // Merged class skills (non-stacking)
  classSkills: {
    granted: ["Persuasion", "Knowledge (Any)", "Survival"],  // Set union
    choices: [
      { backgroundId: "alderaan", skillChoiceCount: 2, fromSkills: ["Knowledge (Any)", "Persuasion", "Treat Injury"] },
      { backgroundId: "bankrupt", skillChoiceCount: 1, fromSkills: ["Deception", "Gather Information", "Survival"] }
    ]
  },
  
  // Merged languages (additive)
  languages: {
    fixed: ["High Galactic"],           // From alderaan
    bonusEntitlements: 0
  },
  
  // Merged skill bonuses (additive, tracked separately)
  bonuses: {
    untrained: [
      { value: 2, applicableSkills: ["Knowledge (Any)", "Persuasion"] }
    ],
    flat: [
      { value: 2, target: "grapple" }
    ]
  },
  
  // Merged passive effects (collected, not merged)
  passiveEffects: [
    { backgroundId: "bankrupt", description: "..." },
    { backgroundId: "alderaan", description: "..." }
  ],
  
  // Metadata
  sources: ["core", "core"],
  mergeStatus: "success",
  unresolved: []
}
```

## Single-Background vs. Multi-Background

### Single Mode (Default)
```javascript
selectedBackgroundIds: ["bankrupt"]  // Only 1

// Result: all grants from one background
classSkills: { granted: ["Deception", "Gather Information", "Survival"], choices: [...] }
languages: { fixed: [], bonusEntitlements: 0 }
bonuses: { ... }
```

### Multi-Background Mode (House Rule)
```javascript
selectedBackgroundIds: ["alderaan", "bankrupt", "academic"]  // Up to 3

// Class skills = set union across all 3
classSkills: {
  granted: ["Persuasion", "Knowledge (Any)", "Deception", "Gather Information", "Survival"],  // Union
  choices: [
    { backgroundId: "alderaan", ... },
    { backgroundId: "bankrupt", ... },
    { backgroundId: "academic", ... }
  ]
}

// Languages = concatenated
languages: {
  fixed: ["High Galactic"],  // Only from alderaan (if others didn't have)
  ...
}

// Bonuses = all collected
bonuses: {
  untrained: [
    { value: 2, applicableSkills: ["Knowledge (Any)", "Persuasion"] },  // academic
    { value: 2, applicableSkills: [...] }  // other sources
  ]
}
```

## Stacking Rules (CRITICAL)

### Class Skills
- **Rule:** Non-stacking, set union
- **Behavior:** If Background A grants "Persuasion" and Background B also grants "Persuasion" → "Persuasion" is added once
- **Result:** No refund, no replacement pick, no bonus for overlap
- **Implementation:** Use Set<string> for union merge

### Languages
- **Rule:** Additive
- **Behavior:** Background A grants "High Galactic", Background B grants "Ewokese" → both are added
- **Result:** Full list concatenation (after dedup)

### Skill Bonuses
- **Rule:** Additive (stacking)
- **Behavior:** Multiple sources can contribute bonuses to same skill
- **Example:** Academic grants +2 to Knowledge untrained, Event grants +2 to Grapple → both apply

### Passive Effects
- **Rule:** Collected (not merged)
- **Behavior:** All effects are listed; conflicts/interactions are unresolved (marked for Phase 2+)

## Validation Rules

1. **ID/Name Required:** Every background must have id + name
2. **Category Required:** Must be "event", "occupation", or "planet"
3. **Skills:** relevantSkills must be non-empty array
4. **Language Compatibility:** bonusLanguage must be valid (checked against languages subsystem)
5. **Mechanical Effects:** mechanicalEffect.type must be one of: class_skills, special_ability, untrained_bonus, bonus

## Future Extensibility

This schema is designed to support:
- Class prestige class/archetype background interactions
- Force-related background effects
- Species-background synergies
- Vehicle/mount background proficiencies
- Conditional grants based on other selections

All of these can be represented as additional subsystemGrants or passive effects.

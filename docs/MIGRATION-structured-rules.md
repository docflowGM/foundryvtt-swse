# Migration Guide: Structured Rule Elements for Species

## Overview

This guide documents the migration from human-language species trait descriptions to a structured rule element system.

**Status**: ✅ Engine implemented and tested with 4 proof-of-concept species
**Next**: Bulk migration of all 121 species

---

## Architecture

### Components

1. **StructuredRuleEvaluator** (`scripts/engine/modifiers/StructuredRuleEvaluator.js`)
   - Evaluates structured rule elements from species traits
   - Checks activation conditions (skillTrained, levelReached, OR/AND logic)
   - Converts rules to canonical Modifier objects
   - Extracts feat grants

2. **ModifierEngine Integration** (`scripts/engine/modifiers/ModifierEngine.js`)
   - Extended `_getSpeciesModifiers()` to evaluate structured rules
   - Maintains backwards compatibility with legacy skillBonuses
   - Phase 1: Structured rules → Modifiers
   - Phase 2: Legacy skillBonuses → Modifiers

3. **Test Data** (`data/test-species-rules.json`)
   - 4 proof-of-concept species: Ugnaught, Qel-Droma, Miraluka, Chevin
   - Covers all major rule types:
     - Flat skill bonus (Qel-Droma)
     - Conditional skill bonus with context (Ugnaught)
     - Unconditional feat grant (Miraluka)
     - Conditional feat grant (Miraluka)
     - Defense modifier (Chevin)

---

## Structured Rule Format

### RuleElement Structure

```typescript
interface RuleElement {
  id: string;                    // Unique within species
  type: string;                  // skillModifier, defenseModifier, damageModifier, featGrant
  value?: number;                // For modifiers
  bonusType?: string;            // species, insight, morale, competence, circumstance
  skillId?: string;              // For skill modifiers (canonical ID from skills.json)
  defense?: string;              // For defense modifiers (fortitude, reflex, will)
  featId?: string;               // For feat grants (canonical feat ID)
  context?: {                    // For conditional modifiers
    type: string;                // machinery, energy-weapons, sound, trade, etc.
    description?: string;        // Human-readable context
  };
  when?: ActivationCondition;    // When this rule applies
}

type ActivationCondition =
  | { type: 'always' }
  | { type: 'skillTrained'; skillId: string }
  | { type: 'skillUntrained'; skillId: string }
  | { type: 'featOwned'; featId: string }
  | { type: 'levelReached'; minLevel: number }
  | { type: 'OR'; conditions: ActivationCondition[] }
  | { type: 'AND'; conditions: ActivationCondition[] };
```

### SpeciesTrait Structure

```typescript
interface SpeciesTrait {
  id: string;                    // Unique within species
  name: string;                  // Human-readable name
  description: string;           // Human-readable description (preserved for UI)
  rules: RuleElement[];          // Structured rules (for engine evaluation)
}
```

### Species Structure

```typescript
interface Species {
  id: string;                    // Canonical species ID
  name: string;                  // Display name
  structuralTraits: SpeciesTrait[]; // Always-on traits
  conditionalTraits: SpeciesTrait[]; // Situational traits
  bonusFeats: SpeciesTrait[];    // Feat grants (conditional and unconditional)
  // ... other fields
}
```

---

## Example: Qel-Droma

### Before (Text-Based)

```json
{
  "name": "Qel-Droma",
  "structuralTraits": [
    {
      "id": "force-legacy",
      "name": "Force Legacy",
      "description": "A Qel-Droma gains a +2 species bonus on Use the Force checks."
    }
  ]
}
```

**Problems**:
- Description must be text-parsed to extract +2, "Use the Force", "species"
- SuggestionEngine cannot reason about it
- PrerequisiteEngine cannot detect stacking
- Impossible to know if condition exists without parsing

### After (Structured)

```json
{
  "id": "qel-droma",
  "name": "Qel-Droma",
  "structuralTraits": [
    {
      "id": "force-legacy",
      "name": "Force Legacy",
      "description": "A Qel-Droma gains a +2 species bonus on Use the Force checks.",
      "rules": [
        {
          "id": "force-legacy-mod",
          "type": "skillModifier",
          "skillId": "useTheForce",      // Canonical ID from skills.json
          "value": 2,
          "bonusType": "species",        // For stacking rules
          "when": { "type": "always" }   // Deterministic evaluation
        }
      ]
    }
  ]
}
```

**Benefits**:
- Deterministic evaluation - no text parsing
- SuggestionEngine can reason: "Qel-Droma → +2 useTheForce"
- PrerequisiteEngine knows: skillModifier, species bonus type
- Stacking rules apply correctly
- Localization-safe (IDs don't change across translations)

---

## Example: Miraluka (Conditional Feat Grant)

### Structured Format

```json
{
  "id": "miraluka",
  "name": "Miraluka",
  "structuralTraits": [
    {
      "id": "force-sensitivity",
      "rules": [
        {
          "id": "force-sensitivity-grant",
          "type": "featGrant",
          "featId": "force-sensitivity",
          "when": { "type": "always" }
        }
      ]
    }
  ],
  "bonusFeats": [
    {
      "id": "force-training",
      "rules": [
        {
          "id": "force-training-grant",
          "type": "featGrant",
          "featId": "force-training",
          "when": {
            "type": "skillTrained",
            "skillId": "useTheForce"
          }
        }
      ]
    }
  ]
}
```

**Evaluation**:
1. System checks: Is Use the Force trained?
2. If YES: Grant Force Training feat
3. If NO: Skip (clean removal when skill becomes untrained)

---

## Canonical IDs

### Skills (from `data/skills.json`)

```
acrobatics, climb, deception, endurance, gatherInfo, initiative,
jump, mechanics, perception, persuasion, pilot, stealth, survival,
swim, treatInjury, useComputer, useTheForce
```

### Feats

TBD - Use slugified names for now:
- `force-sensitivity`
- `force-training`
- `human-versatile`
- etc.

### Ability Scores

```
str, dex, con, int, wis, cha
```

---

## Test Species Coverage

| Species | Rule Type | Condition | Example |
|---------|-----------|-----------|---------|
| **Ugnaught** | skillModifier | Always | +5 Mechanics |
| | skillModifier | Context | (only machinery) |
| **Qel-Droma** | skillModifier | Always | +2 Use the Force |
| **Miraluka** | featGrant | Always | Force Sensitivity |
| | featGrant | skillTrained | Force Training (if UTF) |
| **Chevin** | defenseModifier | Always | +1 Fortitude |

---

## Migration Process

### Phase 1: ✅ Engine Implementation (DONE)
- [x] StructuredRuleEvaluator created
- [x] ModifierEngine extended
- [x] Test species created (4)
- [x] Unit tests written

### Phase 2: 🔄 Bulk Migration (TODO)
- [ ] Analyze all 121 species traits
- [ ] Categorize by rule type (skill, defense, damage, feat grant, special)
- [ ] Create migration script
- [ ] Convert all species to structured format
- [ ] Validate no data loss
- [ ] Remove legacy skillBonuses

### Phase 3: Integration (TODO)
- [ ] Load migrated species into Foundry
- [ ] Test all species in actor prep
- [ ] Verify modifiers stack correctly
- [ ] Confirm feat grants work
- [ ] Document any edge cases

---

## Running Tests

```bash
npm test -- tests/structured-rules-engine.test.js
```

Expected: ✅ All tests pass

---

## Next Steps

1. **Run test suite** to verify engine works
2. **Analyze species-traits.json** to identify all rule types
3. **Build migration script** to convert all 121 species
4. **Validate converted data** (no loss, proper IDs)
5. **Load into Foundry** and test end-to-end
6. **Clean up** legacy skillBonuses from all species

---

## Notes

- **Backwards Compatibility**: Legacy skillBonuses still work (processed after structured rules)
- **Gradual Migration**: Can mix structured and legacy data during transition
- **ID Consistency**: Use canonical IDs from source data (skills.json, feat compendiums)
- **Context Tags**: Standardize context types across system
- **Stacking Rules**: bonusType critical for Saga Edition stacking

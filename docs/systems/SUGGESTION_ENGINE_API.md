# SWSE Suggestion Engine API Documentation

## Overview

The SWSE suggestion engine system provides intelligent, attribute-aware recommendations across all character progression features. All suggestion engines are centrally coordinated through the **SuggestionEngineCoordinator** and fully integrated with the **SWSEProgressionEngine**.

## Architecture

```
SuggestionEngineCoordinator (Central Hub)
├── SuggestionEngine (Feats/Talents)
├── ClassSuggestionEngine (Classes)
├── ForceOptionSuggestionEngine (Force Powers, Secrets, Techniques)
├── Level1SkillSuggestionEngine (Skill Training at Chargen)
├── AttributeIncreaseSuggestionEngine (Ability Increases at Levels 4,8,12,16,20)
├── BuildIntent (Build Direction Analysis)
├── ProgressionAdvisor (Attribute-Weighted Suggestions)
├── CommunityMetaSynergies (Meta Synergy Detection)
└── PathPreview (Prestige Class Path Previews)
        ↓
    SWSEProgressionEngine (Game API Layer)
        ↓
    game.swse.suggestions (Global API Access)
```

## API Access Methods

### Method 1: Via SWSEProgressionEngine (Recommended for UI Components)

The progression engine provides convenience methods that handle null-checking and fallbacks:

```javascript
// In any UI component
const progressionEngine = this.progressionEngine; // or new SWSEProgressionEngine(actor, mode)

// Feats & Talents
const feats = await progressionEngine.getSuggestedFeats(featArray, pendingData);
const talents = await progressionEngine.getSuggestedTalents(talentArray, pendingData);

// Classes & Force Options
const classes = await progressionEngine.getSuggestedClasses(classArray, pendingData);
const forceOptions = await progressionEngine.getSuggestedForceOptions(optionsArray, pendingData);

// Skills (Level 1 only)
const skills = await progressionEngine.getSuggestedLevel1Skills(skillArray, pendingData);

// Abilities (Levels 4, 8, 12, 16, 20)
const abilityIncreases = await progressionEngine.getSuggestedAttributeIncreases(pendingData);

// BuildIntent Analysis
const buildIntent = progressionEngine.deriveAttributeBuildIntent();

// Additional APIs
const synergies = await progressionEngine.getActiveSynergies(pendingData);
const paths = await progressionEngine.generatePathPreviews(pendingData);
const catalog = progressionEngine.getForceOptionCatalog();
```

### Method 2: Via game.swse.suggestions (Global API)

Direct access to the coordinator for any context:

```javascript
// Feats & Talents
await game.swse.suggestions.suggestFeats(feats, actor, pendingData, options);
await game.swse.suggestions.suggestTalents(talents, actor, pendingData, options);

// Classes & Force Options
await game.swse.suggestions.suggestClasses(classes, actor, pendingData, options);
await game.swse.suggestions.suggestForceOptions(options, actor, pendingData, contextOptions);

// Skills (Level 1 only)
await game.swse.suggestions.suggestLevel1Skills(skills, actor, pendingData);

// Abilities (Levels 4, 8, 12, 16, 20)
await game.swse.suggestions.suggestAttributeIncreases(actor, pendingData, contextOptions);

// BuildIntent Analysis
const buildIntent = game.swse.suggestions.deriveAttributeBuildIntent(actor);
const analyzedIntent = await game.swse.suggestions.analyzeBuildIntent(actor, pendingData);

// Attribute Weighting
const weightedTier = game.swse.suggestions.applyAttributeWeight(
  baseTier,
  buildIntent,
  relevantAttribute,
  options
);

// Additional APIs
const synergies = await game.swse.suggestions.getActiveSynergies(actor, pendingData);
const paths = await game.swse.suggestions.generatePathPreviews(actor, pendingData);
const catalog = game.swse.suggestions.getForceOptionCatalog();
const icon = game.swse.suggestions.getAbilityIcon(ability);
const name = game.swse.suggestions.getAbilityName(abbrev);

// Cache Management
game.swse.suggestions.clearBuildIntentCache(actorId);
```

### Method 3: Direct Engine Access

For advanced use cases, directly import and call specific engines:

```javascript
import { AttributeIncreaseSuggestionEngine } from './engine/AttributeIncreaseSuggestionEngine.js';
import { Level1SkillSuggestionEngine } from './engine/Level1SkillSuggestionEngine.js';
import { ForceOptionSuggestionEngine } from './engine/ForceOptionSuggestionEngine.js';

// Direct calls (engines are static methods)
const suggestions = await AttributeIncreaseSuggestionEngine.suggestAttributeIncreases(
  actor,
  pendingData,
  { buildIntent }
);
```

## Suggestion Engines Reference

### 1. SuggestionEngine (Feats & Talents)
**Status**: ✅ Integrated and Wired
**Location**: `/scripts/engine/SuggestionEngine.js`
**API Entry Point**: `game.swse.suggestions.suggestFeats()`, `game.swse.suggestions.suggestTalents()`
**Progression Engine Method**: `getSuggestedFeats()`, `getSuggestedTalents()`
**Return**: Array of feats/talents with suggestion metadata (tier, reason, icon)

### 2. ClassSuggestionEngine
**Status**: ✅ Integrated and Wired
**Location**: `/scripts/engine/ClassSuggestionEngine.js`
**API Entry Point**: `game.swse.suggestions.suggestClasses()`
**Progression Engine Method**: `getSuggestedClasses()`
**Return**: Array of classes with suggestion metadata

### 3. ForceOptionSuggestionEngine
**Status**: ✅ Integrated and Wired
**Location**: `/scripts/engine/ForceOptionSuggestionEngine.js`
**API Entry Point**: `game.swse.suggestions.suggestForceOptions()`
**Progression Engine Method**: `getSuggestedForceOptions()`
**Catalog Access**: `game.swse.suggestions.getForceOptionCatalog()`
**Return**: Array of Force options (powers, secrets, techniques) with 5-tier suggestions
**Tiers**: PRESTIGE_ALIGNED (5) → COMBAT_SYNERGY (4) → UNIVERSAL_STRONG (3) → HOUSE_RULE_BONUS (2) → COMPATIBLE (1)

### 4. Level1SkillSuggestionEngine
**Status**: ✅ Integrated and Wired
**Location**: `/scripts/engine/Level1SkillSuggestionEngine.js`
**API Entry Point**: `game.swse.suggestions.suggestLevel1Skills()`
**Progression Engine Method**: `getSuggestedLevel1Skills()`
**When Used**: Character generation only (Level 1)
**Return**: Array of skills with 4-tier suggestions
**Tiers**: CORE_SYNERGY (3) → ATTRIBUTE_MATCH (2) → CLASS_SKILL (1) → AVAILABLE (0)
**Note**: Suggests skills based on ability scores and class preferences

### 5. AttributeIncreaseSuggestionEngine
**Status**: ✅ Integrated and Wired
**Location**: `/scripts/engine/AttributeIncreaseSuggestionEngine.js`
**API Entry Point**: `game.swse.suggestions.suggestAttributeIncreases()`
**Progression Engine Method**: `getSuggestedAttributeIncreases()`
**When Used**: Levels 4, 8, 12, 16, 20
**Return**: Array of abilities with 5-tier suggestions
**Tiers**: MODIFIER_PRIMARY (5) → MODIFIER_SECONDARY (4) → MODIFIER_GENERAL (3) → PRIMARY_SYNERGY (2) → SKILL_SYNERGY (1) → AVAILABLE (0)
**Key Feature**: Detects modifier breakpoints (even-numbered ability scores in Saga Edition)

### 6. BuildIntent
**Status**: ✅ Integrated and Wired
**Location**: `/scripts/engine/BuildIntent.js`
**API Entry Point**: `game.swse.suggestions.analyzeBuildIntent()`
**Progression Engine Method**: `analyzeBuildIntent()`
**Return**: Character build profile with primary/secondary abilities, combat style, force focus
**Used By**: All other suggestion engines for context-aware recommendations
**Cached**: Yes, prevents redundant analysis during single level-up session

### 7. ProgressionAdvisor
**Status**: ✅ Integrated and Wired
**Location**: `/scripts/engine/ProgressionAdvisor.js`
**API Entry Point**: Multiple (deriveAttributeBuildIntent, applyAttributeWeight, suggestLevel1Skills)
**Progression Engine Method**: `deriveAttributeBuildIntent()`, `applyAttributeWeight()`
**Purpose**: Applies attribute-aware weighting to suggestions
**Key Principle**: "Attributes influence PRIORITY, never legality" - all options remain legal

### 8. CommunityMetaSynergies
**Status**: ✅ Integrated and Wired
**Location**: `/scripts/engine/CommunityMetaSynergies.js`
**API Entry Point**: `game.swse.suggestions.getActiveSynergies()`
**Progression Engine Method**: `getActiveSynergies()`
**Return**: Array of active synergy combinations for the character's build

### 9. PathPreview
**Status**: ✅ Integrated and Wired
**Location**: `/scripts/engine/PathPreview.js`
**API Entry Point**: `game.swse.suggestions.generatePathPreviews()`
**Progression Engine Method**: `generatePathPreviews()`
**Return**: Prestige class qualification previews
**Shows**: How close character is to meeting prestige class requirements

## Initialization

### Automatic Initialization
The suggestion engine system is automatically initialized during the system ready hook via `levelup-module-init.js`:

```javascript
// Step 3 of levelup-module-init.js
const suggestionsInitialized = await SuggestionEngineCoordinator.initialize();
if (!suggestionsInitialized) {
  SWSELogger.warn("Suggestion engines failed to initialize, but level-up UI will continue");
}
```

### Initialization Order
1. Registries built (Skills, Feats, Talents, Force)
2. SuggestionEngineCoordinator.initialize() called
3. Coordinator initializes all sub-engines
4. Coordinator validates engine availability
5. game.swse.suggestions API created
6. swse:suggestions:initialized hook fired

## Cache Management

BuildIntent results are cached per actor to prevent redundant analysis:

```javascript
// Clear cache when starting new progression
progressionEngine.clearSuggestionCache();

// Or via API
game.swse.suggestions.clearBuildIntentCache(actorId);
```

Called automatically when:
- New level-up session starts (in levelup-main.js constructor)
- Manual `clearSuggestionCache()` called on progression engine

## Usage Examples

### Example 1: Get Attribute Increase Suggestions
```javascript
const actor = game.actors.get(actorId);
const progressionEngine = new SWSEProgressionEngine(actor, 'levelup');

// Get suggestions for current level-up
const attributeSuggestions = await progressionEngine.getSuggestedAttributeIncreases({
  trainedSkills: ['perception', 'mechanics', 'stealth']
});

// attributeSuggestions = [
//   {
//     ability: 'Wisdom',
//     abbrev: 'wis',
//     current: 15,
//     proposed: 16,
//     currentMod: 2,
//     proposedMod: 3,
//     isModifierBreakpoint: true,
//     suggestion: {
//       tier: 5,
//       reason: "Modifier increases from +2 to +3; Primary ability for your build; Improves trained skill(s): perception",
//       icon: 'fa-solid fa-star'
//     },
//     isSuggested: true
//   },
//   // ... other abilities
// ]
```

### Example 2: Get All Available Suggestions
```javascript
const feats = await progressionEngine.getSuggestedFeats(availableFeats, pendingData);
const talents = await progressionEngine.getSuggestedTalents(availableTalents, pendingData);
const classes = await progressionEngine.getSuggestedClasses(availableClasses, pendingData);
const forceOptions = await progressionEngine.getSuggestedForceOptions(availablePowers, pendingData);
const attributeIncreases = await progressionEngine.getSuggestedAttributeIncreases(pendingData);
```

### Example 3: Using BuildIntent for Custom Logic
```javascript
const buildIntent = progressionEngine.deriveAttributeBuildIntent();
console.log(buildIntent); // {
//   primaryAbility: 'wis',
//   primaryScore: 16,
//   secondaryAbility: 'dex',
//   secondaryScore: 14,
//   forceFocus: true,
//   combatStyle: 'force-caster',
//   confidence: 0.8,
//   allScores: { str: 10, dex: 14, con: 12, int: 11, wis: 16, cha: 15 }
// }
```

## Key Design Principles

1. **Unified API**: All suggestion engines accessible through single coordinator
2. **Attribute-Aware**: Suggestions influenced by ability scores but never blocking legal options
3. **BuildIntent Context**: Build direction analysis informs all suggestions
4. **Modifier Breakpoints**: Attribute increase suggestions prioritize Saga Edition modifier thresholds
5. **Caching**: BuildIntent cached to prevent redundant computation during single level-up
6. **Non-Blocking**: Suggestion engine failures don't prevent progression
7. **Flexible Access**: Available via progression engine, coordinator, or direct engine calls

## Troubleshooting

### Suggestions Not Showing
1. Check that `SuggestionEngineCoordinator.initialize()` has been called
2. Verify `game.swse.suggestions` exists and contains expected methods
3. Check browser console for initialization errors
4. Ensure `Hooks.once("ready", ...)` has fired

### BuildIntent Analysis Failing
1. Verify actor has abilities object
2. Check that actor.system.progression.classLevels array exists
3. Check for errors in BuildIntent.js regarding ability score retrieval

### Cache Issues
1. Call `progressionEngine.clearSuggestionCache()` at start of new level-up
2. Or manually call `game.swse.suggestions.clearBuildIntentCache(actorId)`

## File Organization

```
/scripts/engine/
├── SuggestionEngineCoordinator.js          ← Central coordinator
├── SuggestionEngine.js                     ← Feats/talents
├── ClassSuggestionEngine.js                ← Classes
├── ForceOptionSuggestionEngine.js          ← Force options
├── Level1SkillSuggestionEngine.js          ← Skills (chargen)
├── AttributeIncreaseSuggestionEngine.js    ← Abilities (levelup)
├── BuildIntent.js                          ← Build analysis
├── ProgressionAdvisor.js                   ← Attribute weighting
├── CommunityMetaSynergies.js               ← Synergy detection
├── PathPreview.js                          ← Prestige previews
└── progression.js                          ← SWSEProgressionEngine (game API)

/scripts/progression/ui/
└── levelup-module-init.js                  ← Initialization hook
```

## Version Info

- **Suggestion System**: Fully Integrated
- **AttributeIncreaseSuggestionEngine**: Added in latest session
- **Last Updated**: Current session
- **Status**: ✅ All engines wired and operational

# Archetype Engine Integration Guide

## Overview

The archetype engine has been ported from Python to JavaScript in two modules:

1. **ArchetypeAffinityEngine.js** — Core calculation engine (pure functions)
2. **ArchetypeSuggestionIntegration.js** — Integration layer with suggestion system

## Setup

### Initial Setup (call once during module initialization)

```javascript
import { initializeArchetypeData } from './ArchetypeAffinityEngine.js';

// Call this once when Foundry is ready
Hooks.once('ready', async () => {
  const result = await initializeArchetypeData();
  console.log('Archetype engine initialized:', result.stats);
});
```

## Quick Start

### 1. Initialize Affinity on Actor

When a character is created or first opened:

```javascript
import { initializeActorAffinity, recalculateActorAffinity } from './ArchetypeAffinityEngine.js';

// Initialize storage
await initializeActorAffinity(actor);

// Calculate affinity
const result = await recalculateActorAffinity(actor);
console.log('Affinity:', result.affinity);
console.log('Prestige hints:', result.buildGuidance.prestigeHints);
```

### 2. Get Current Affinity (Lazy-Loaded with Drift Detection)

```javascript
import { getActorAffinity } from './ArchetypeAffinityEngine.js';

// Gets cached affinity, recalculates only if character changed
const { affinity, needsUpdate } = await getActorAffinity(actor);
console.log('Affinity:', affinity);
console.log('Was recalculated?', needsUpdate);
```

### 3. Enhance Suggestions with Archetype Weighting

When generating suggestions, enhance them with archetype context:

```javascript
import { enhanceSuggestionWithArchetype } from './ArchetypeSuggestionIntegration.js';

// Start with a suggestion from any engine
const suggestion = {
  id: 'power_attack',
  name: 'Power Attack',
  score: 0.75,
  type: 'feat',
  tier: 3
};

// Enhance with archetype data
const enhanced = await enhanceSuggestionWithArchetype(suggestion, actor);

// Now you have:
console.log(enhanced.archetypeWeightedScore);  // e.g., 0.82 (boosted by affinity)
console.log(enhanced.archetypeExplanation);    // e.g., "This fits well with your Jedi Guardian–style build..."
console.log(enhanced.affinityBoost);           // e.g., 0.07
console.log(enhanced.hasArchetypeBoost);       // true
```

### 4. Batch Enhancement of Suggestions

```javascript
import { enhanceSuggestionsWithArchetype } from './ArchetypeSuggestionIntegration.js';

const baseSuggestions = [
  { name: 'Power Attack', score: 0.75 },
  { name: 'Weapon Focus', score: 0.68 },
  { name: 'Cleave', score: 0.52 }
];

// Enhance all at once
const enhanced = await enhanceSuggestionsWithArchetype(baseSuggestions, actor);

// Sort by weighted score to show highest-affinity suggestions first
enhanced.sort((a, b) => b.archetypeWeightedScore - a.archetypeWeightedScore);
```

### 5. Get Prestige Path Recommendations

```javascript
import { getPrestigePathRecommendations, getPrimaryArchetype } from './ArchetypeSuggestionIntegration.js';

// Get prestige hints
const hints = await getPrestigePathRecommendations(actor);
// [{ archetype: 'jedi guardian', affinity: 0.47, strength: 'primary',
//    prestigeOptions: ['Jedi Knight', 'Elite Trooper'],
//    explanation: "Your build strongly reflects a Jedi Guardian style..." }]

// Get primary archetype
const primary = await getPrimaryArchetype(actor);
// { name: 'Jedi Guardian', affinity: 0.47, notes: 'Frontline lightsaber...' }
```

## Integration Points

### For Feature/Talent Suggestion Engines

**Before:** Generate suggestions, apply coherence scoring

**After:** Enhance suggestions with archetype weighting

```javascript
// OLD CODE (existing engines)
const baseScore = BuildCoherenceAnalyzer.analyzeSuggestionCoherence(item, actor);

// NEW CODE (add archetype enhancement)
import { enhanceSuggestionWithArchetype } from './ArchetypeSuggestionIntegration.js';

const baseSuggestion = { name: item.name, score: baseScore.score };
const enhanced = await enhanceSuggestionWithArchetype(baseSuggestion, actor);

// Use enhanced.archetypeWeightedScore for final ranking
// Use enhanced.archetypeExplanation for UI tooltip
```

### For Character Update Hooks

**When character changes** (feats added, attributes increased, etc.):

```javascript
import { handleCharacterChange } from './ArchetypeSuggestionIntegration.js';

// In actor update hook
actor.on('update', (actor, change) => {
  const changedPaths = Object.keys(change);
  handleCharacterChange(actor, changedPaths).then(result => {
    if (result.updated) {
      console.log('Affinity recalculated:', result.reason);
      // Trigger UI re-render if suggestions are visible
    }
  });
});
```

### For Level-Up Events

**When character levels up:**

```javascript
import { handleLevelUp } from './ArchetypeSuggestionIntegration.js';

// In level-up handler
async function onCharacterLevelUp(actor) {
  const result = await handleLevelUp(actor);

  if (result.prestigeHints?.length > 0) {
    // Show prestige path recommendations
    ui.notifications.info(`New prestige paths unlocked!`);
  }
}
```

### For UI Display

**Format affinity for display:**

```javascript
import { formatAffinityForDisplay } from './ArchetypeSuggestionIntegration.js';

const affinity = actor.system.flags.swse.archetypeAffinity.affinity;
const display = formatAffinityForDisplay(affinity, 3);

// Results:
// [
//   { name: 'jedi guardian', score: 0.291, percentage: 29, bar: '███░░░░░░░' },
//   { name: 'lightsaber vanguard', score: 0.106, percentage: 11, bar: '█░░░░░░░░░' },
//   ...
// ]
```

## Data Storage

### Archetype Affinity (Cached on Actor)

**Location:** `actor.system.flags.swse.archetypeAffinity`

```javascript
{
  version: "1.0",
  stateHash: "a1b2c3...",           // SHA1 of character state for drift detection
  affinity: {
    "jedi guardian": 0.291,
    "balanced knight": 0.105,
    ...
  },
  sourceState: {                     // Snapshot of what was hashed
    feats: ["Power Attack", "Weapon Focus"],
    talents: ["Block"],
    attributes: { STR: 16, DEX: 14, ... }
  },
  timestamp: 1642532400000
}
```

### Build Guidance (Prestige Paths & Explanations)

**Location:** `actor.system.flags.swse.buildGuidance`

```javascript
{
  archetypeAffinity: {
    "jedi guardian": 0.47,
    ...
  },
  prestigeHints: [
    {
      archetype: "jedi guardian",
      affinity: 0.47,
      strength: "primary",
      prestigeOptions: ["Jedi Knight", "Elite Trooper"],
      explanation: "Your build strongly reflects a Jedi Guardian style..."
    }
  ],
  meta: {
    engine: "SWSE Archetype Engine",
    version: "1.0",
    nonForcing: true,
    timestamp: 1642532400000
  }
}
```

## API Reference

### ArchetypeAffinityEngine.js

#### Core Functions

- **`calculateArchetypeAffinity(archetypes, characterState)`**
  - Scores character against all archetypes
  - Returns softmax-normalized scores (0-1)
  - Input: `{ feats, talents, attributes }`

- **`weightSuggestions(baseSuggestions, archetypeAffinity, archetypes)`**
  - Applies archetype bias to suggestion scores
  - Multiplier: `1.0 + (affinity * 0.75)`
  - Returns weighted scores

- **`explainSuggestion(name, affinity, archetypes, maxArchetypes)`**
  - Generates narrative explanation for a suggestion
  - References top archetypes by affinity

- **`validateArchetypes(archetypes)`**
  - CI-safe validation
  - Checks for missing fields, invalid status
  - Returns `{ valid, errors, stats }`

#### Actor Integration

- **`initializeActorAffinity(actor)`**
  - Sets up storage structure on actor
  - Safe to call multiple times

- **`recalculateActorAffinity(actor)`**
  - Full recalculation of affinity
  - Updates actor flags
  - Returns `{ affinity, snapshot, buildGuidance }`

- **`getActorAffinity(actor)`**
  - Lazy-loaded with drift detection
  - Recalculates only if character changed
  - Returns `{ affinity, needsUpdate, reason }`

- **`extractCharacterState(actor)`**
  - Extracts feats, talents, attributes from actor
  - Safe conversion of actor data to engine format

### ArchetypeSuggestionIntegration.js

#### Suggestion Enhancement

- **`enhanceSuggestionWithArchetype(suggestion, actor)`**
  - Single suggestion enhancement
  - Adds weighted score and explanation

- **`enhanceSuggestionsWithArchetype(suggestions, actor)`**
  - Batch enhancement
  - Returns array with archetype metadata

#### Prestige Path Recommendations

- **`getPrestigePathRecommendations(actor)`**
  - Returns structured prestige hints
  - Includes explanations and options

- **`getPrimaryArchetype(actor)`**
  - Returns highest-affinity archetype
  - Useful for build identity display

#### Lifecycle Hooks

- **`handleCharacterChange(actor, changedPaths)`**
  - Called on character update
  - Detects if recalculation needed

- **`handleLevelUp(actor)`**
  - Called on level-up
  - Full recalculation + logging

#### Utilities

- **`formatAffinityForDisplay(affinity, topN)`**
  - Formats affinity for UI display
  - Includes percentage and bar visualization

## Examples

### Example 1: Add Archetype Boost to Feature Suggestions

```javascript
// In your feature suggestion engine
export async function getSuggestedFeatures(actor) {
  const baseFeatures = await generateBaseSuggestions(actor);

  // Enhance with archetype weighting
  import { enhanceSuggestionsWithArchetype } from './ArchetypeSuggestionIntegration.js';
  const enhanced = await enhanceSuggestionsWithArchetype(baseFeatures, actor);

  // Sort by weighted score
  enhanced.sort((a, b) => (b.archetypeWeightedScore || 0) - (a.archetypeWeightedScore || 0));

  return enhanced;
}
```

### Example 2: Display Prestige Path UI

```javascript
// In a prestige path selection dialog
export async function renderPrestigePathOptions(actor) {
  const primary = await getPrimaryArchetype(actor);
  const hints = await getPrestigePathRecommendations(actor);

  const html = `
    <h2>Build Identity: ${primary?.name || 'Unspecialized'}</h2>
    <p>${primary?.notes || 'No dominant archetype yet'}</p>

    <h3>Prestige Path Recommendations</h3>
    <ul>
      ${hints.map(hint => `
        <li>
          <strong>${hint.prestigeOptions.join(' or ')}</strong>
          (${hint.strength === 'primary' ? 'Primary' : 'Secondary'})
          <p>${hint.explanation}</p>
        </li>
      `).join('')}
    </ul>
  `;

  return html;
}
```

### Example 3: Character Sheet Integration

```javascript
// In character sheet render method
export async function renderArchetypeSection(actor, html) {
  const affinity = await getActorAffinity(actor);
  const primary = await getPrimaryArchetype(actor);
  const display = formatAffinityForDisplay(affinity.affinity, 3);

  const archetypeHtml = `
    <section class="archetype-section">
      <h3>Build Identity</h3>
      <p class="primary">${primary?.name || 'Not yet defined'}</p>

      <h4>Archetype Affinity</h4>
      <div class="affinity-bars">
        ${display.map(a => `
          <div class="affinity-bar">
            <label>${a.name}</label>
            <div class="bar">${a.bar} ${a.percentage}%</div>
          </div>
        `).join('')}
      </div>
    </section>
  `;

  html.find('.character-details').append(archetypeHtml);
}
```

## Performance Considerations

### Caching

- Affinity is cached on the actor at `system.flags.swse.archetypeAffinity`
- Only recalculated when character state changes (drift detection)
- State hashing is deterministic and fast

### Lazy Loading

- `getActorAffinity()` uses lazy loading with drift detection
- Safe to call frequently without performance penalty
- First call initializes; subsequent calls check hash

### Batch Operations

- Use `enhanceSuggestionsWithArchetype()` for multiple suggestions
- More efficient than individual calls

## Debugging

### Check Affinity Calculation

```javascript
import { ARCHETYPE_DATA } from './ArchetypeAffinityEngine.js';

// See archetype validation results
console.log(ARCHETYPE_DATA);
// { valid: true, stats: { activeCount: 154, ... }, archetypes: {...} }
```

### Manually Trigger Recalculation

```javascript
import { recalculateActorAffinity } from './ArchetypeAffinityEngine.js';

const result = await recalculateActorAffinity(actor);
console.log('Affinity updated:', result.affinity);
console.log('Prestige hints:', result.buildGuidance.prestigeHints);
```

### View Stored Data

```javascript
console.log('Affinity:', actor.system.flags.swse.archetypeAffinity);
console.log('Build Guidance:', actor.system.flags.swse.buildGuidance);
```

## Testing

### Test Single Suggestion Enhancement

```javascript
import {
  enhanceSuggestionWithArchetype,
  getPrimaryArchetype
} from './ArchetypeSuggestionIntegration.js';

// Create a test actor with known feats/talents
const suggestion = { name: 'Power Attack', score: 0.5 };
const enhanced = await enhanceSuggestionWithArchetype(suggestion, testActor);

console.assert(enhanced.hasArchetypeBoost, 'Should have affinity boost');
console.assert(enhanced.archetypeWeightedScore > 0.5, 'Score should be boosted');
```

## Migration Checklist

- [ ] Copy `ArchetypeAffinityEngine.js` to `/scripts/engine/`
- [ ] Copy `ArchetypeSuggestionIntegration.js` to `/scripts/engine/`
- [ ] Import modules in suggestion engines
- [ ] Add `initializeActorAffinity()` to character creation hook
- [ ] Add `enhanceSuggestionsWithArchetype()` to suggestion generation
- [ ] Add `handleCharacterChange()` to actor update hook
- [ ] Test with sample characters
- [ ] Update UI to display archetype explanations
- [ ] Commit changes

## Future Enhancements

- [ ] ML adaptation (learn intent from player choices)
- [ ] Prestige narration (per-prestige flavor text)
- [ ] Community meta tracking
- [ ] Tuning config externalization
- [ ] UI visualizations (affinity radar chart, prestige tree)

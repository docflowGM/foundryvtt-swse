# Archetype Integration Guide for SuggestionEngine

## Quick Start

### 1. Import the Integration Module

```javascript
import {
  getArchetypeRecommendationsForActor,
  getPrimaryArchetypeForActor,
  getArchetypeFeats,
  getArchetypeTalents,
  isArchetypeRecommended,
  getRoleBiasForArchetype,
  getAttributePriorityForArchetype
} from "/systems/foundryvtt-swse/scripts/engine/archetype/archetype-registry-integration.js";
```

### 2. Get Primary Archetype in Suggestion Methods

```javascript
static async suggestFeats(feats, actor, pendingData = {}, options = {}) {
  // Get primary archetype
  const archetype = await getPrimaryArchetypeForActor(actor);

  if (archetype) {
    SWSELogger.log(
      `[SuggestionEngine] ${actor.name} matches archetype: ${archetype.name}`
    );
  }

  // Continue with normal suggestion logic
  // ... rest of method
}
```

### 3. Boost Archetype-Recommended Items

```javascript
// Within tier assignment logic:
if (archetype && await isArchetypeRecommended(item.id, actor)) {
  // This item is recommended by the archetype
  suggestion.archetypeMatch = true;
  suggestion.matchedArchetype = archetype.name;

  // Apply tier boost if appropriate
  if (suggestion.tier < SUGGESTION_TIERS.CLASS_SYNERGY) {
    suggestion.tier = SUGGESTION_TIERS.CLASS_SYNERGY;
    suggestion.reason = `Recommended by ${archetype.name} archetype`;
  }
}
```

---

## Implementation Patterns

### Pattern 1: Tier Boost for Recommendations

**Location:** In `suggestFeats()` or `suggestTalents()` after item is evaluated

```javascript
// Get archetype recommendations
const recommendedFeatIds = await getArchetypeFeats(actor);

for (const feat of feats) {
  if (recommendedFeatIds.includes(feat.id)) {
    // Found in archetype recommendations
    suggestion.tier = Math.max(
      suggestion.tier,
      SUGGESTION_TIERS.CLASS_SYNERGY
    );
    suggestion.archetypeRecommended = true;
    suggestion.archetypeReason =
      `Recommended by ${archetype.name} archetype`;
  }
}
```

### Pattern 2: Role-Based Filtering

**Location:** Secondary suggestion filtering

```javascript
// Get role bias for primary archetype
const roleBias = getRoleBiasForArchetype(archetype.id);

// Filter suggestions based on archetype's role focus
const roleWeights = roleBias; // { offense, defense, support, utility }

// Boost suggestions that match high-weight roles
for (const suggestion of suggestions) {
  const itemRole = suggestion.tags?.role; // e.g., "defense"

  if (itemRole && roleWeights[itemRole] > 1.0) {
    suggestion.roleBoost = roleWeights[itemRole];
    suggestion.boostedScore = suggestion.score * suggestion.roleBoost;
  }
}
```

### Pattern 3: Attribute Priority Validation

**Location:** Attribute/ability prerequisite checking

```javascript
// Get archetype's preferred attributes
const attributePriority = getAttributePriorityForArchetype(archetype.id);

for (const suggestion of suggestions) {
  const itemPrereqs = suggestion.prerequisites?.abilities || [];

  // Check if item's prereqs align with archetype's priorities
  const alignedPrereqs = itemPrereqs.filter(attr =>
    attributePriority.includes(attr)
  );

  if (alignedPrereqs.length > 0) {
    suggestion.attributeAlignment = alignedPrereqs.length / itemPrereqs.length;
  }
}
```

### Pattern 4: Multi-Archetype Comparison

**Location:** When character shows ambiguous archetype alignment

```javascript
// Get all archetypes for character's class
const allArchetypes = await getArchetypeRecommendationsForActor(actor);

if (allArchetypes.length > 1) {
  // Show top 3 by match score
  const topArchetypes = allArchetypes
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  // Provide secondary recommendations
  for (const altArchetype of topArchetypes) {
    const altRecommendations = await getArchetypeFeats(actor); // Could be modified to accept archetype

    // Store for UI display
    suggestion.secondaryRecommendations = altRecommendations;
  }
}
```

---

## Integration Points in SuggestionEngine

### Point 1: Early in `suggestFeats()`

```javascript
// Around line 94-130
static async suggestFeats(feats, actor, pendingData = {}, options = {}) {
    const actorState = this._buildActorState(actor, pendingData);
    const featMetadata = options.featMetadata || {};

    // Get or compute build intent
    let buildIntent = options.buildIntent;
    if (!buildIntent) {
        buildIntent = await BuildIntent.compute(actor, actorState);
    }

    // ─────────────────────────────────────────────────────
    // ADD THIS SECTION:
    // ─────────────────────────────────────────────────────
    // Get archetype context
    const archetype = await getPrimaryArchetypeForActor(actor);
    const archetypeFeats = archetype
      ? await getArchetypeFeats(actor)
      : [];
    // ─────────────────────────────────────────────────────

    // Continue with existing logic...
    const suggestions = [];
    for (const feat of feats) {
        // ... existing logic ...

        // ADD ARCHETYPE CHECK:
        if (archetypeFeats.includes(feat.id)) {
            suggestion.archetypeMatched = true;
        }
    }
}
```

### Point 2: In Tier Assignment

```javascript
// In _scoreFeature() or equivalent tier assignment method
_scoreFeature(feature, actor, buildIntent, archetype, archetypeItems) {
    let tier = SUGGESTION_TIERS.FALLBACK;
    let reasons = [];

    // Existing tier checks...
    if (this._isPrestigePrerequisite(feature, actor, buildIntent)) {
        tier = SUGGESTION_TIERS.PRESTIGE_PREREQ;
    }

    // ADD ARCHETYPE CHECK:
    if (archetype && archetypeItems.includes(feature.id)) {
        if (tier < SUGGESTION_TIERS.CLASS_SYNERGY) {
            tier = SUGGESTION_TIERS.CLASS_SYNERGY;
            reasons.push(`Recommended by ${archetype.name} archetype`);
        }
    }

    // Continue with other tier checks...
    return { tier, reasons };
}
```

### Point 3: In Explanation Generation

```javascript
// In SuggestionExplainer or equivalent
static generateExplanation(suggestion, archetype, actor) {
    const explanations = [];

    // Existing explanations...
    if (suggestion.tier === SUGGESTION_TIERS.PRESTIGE_PREREQ) {
        explanations.push("This is required for your prestige path.");
    }

    // ADD ARCHETYPE EXPLANATION:
    if (suggestion.archetypeMatched && archetype) {
        explanations.push(
            `This is recommended by your ${archetype.name} archetype, ` +
            `which focuses on ${archetype.roles.join('/')}.`
        );
    }

    return explanations.join(' ');
}
```

---

## Data Flow Diagram

```
┌─ suggestFeats(feats, actor) ─┐
│                              │
├─ await getPrimaryArchetypeForActor(actor)
│  └─ Returns: { name, roles, matchScore }
│
├─ await getArchetypeFeats(actor)
│  └─ Returns: ["item_id_1", "item_id_2", ...]
│
├─ For each feat:
│  ├─ if (archetypeFeats.includes(feat.id))
│  │  ├─ suggestion.archetypeMatched = true
│  │  └─ Apply tier boost
│  │
│  ├─ Score based on:
│  │  ├─ Prestige prerequisites
│  │  ├─ Chain continuations
│  │  ├─ Archetype recommendations ← NEW
│  │  └─ Other criteria
│  │
│  └─ Add to suggestions[]
│
└─ Return suggestions ─┐
                      │
                      ├─ SuggestionService
                      ├─ FilterBy Focus/Tier
                      └─ Display to UI
```

---

## Code Examples

### Example 1: Basic Integration

```javascript
// In SuggestionEngine.suggestFeats()

// Get archetype
const archetype = await getPrimaryArchetypeForActor(actor);

// Get recommendations
const archetypeFeatIds = archetype
  ? await getArchetypeFeats(actor)
  : [];

// Score each feat
for (const feat of feats) {
  const suggestion = {
    id: feat.id,
    name: feat.name,
    score: 0.5, // base score
    tier: SUGGESTION_TIERS.FALLBACK
  };

  // Check if in archetype recommendations
  if (archetypeFeatIds.includes(feat.id)) {
    suggestion.tier = SUGGESTION_TIERS.CLASS_SYNERGY;
    suggestion.reason = `Recommended by ${archetype.name}`;
  }

  suggestions.push(suggestion);
}
```

### Example 2: Role-Based Scoring

```javascript
// After getting archetype
const roleBias = getRoleBiasForArchetype(archetype.id);

// Score suggestions by role alignment
for (const suggestion of suggestions) {
  const feat = game.items.get(suggestion.id);
  const featRole = feat.system?.tags?.role;

  if (featRole && roleBias[featRole]) {
    // Apply role weight
    const roleWeight = roleBias[featRole];
    suggestion.score *= roleWeight;
    suggestion.roleAlignment = roleWeight;
  }
}
```

### Example 3: Attribute Alignment

```javascript
// Check alignment with archetype's attribute priorities
const attrPriority = getAttributePriorityForArchetype(archetype.id);

for (const suggestion of suggestions) {
  const feat = game.items.get(suggestion.id);
  const prereqAttr = feat.system?.prerequisites?.ability;

  if (prereqAttr && attrPriority[0] === prereqAttr) {
    // Feat uses archetype's top attribute
    suggestion.score *= 1.2; // 20% boost
    suggestion.attributePreferenceBoost = 1.2;
  }
}
```

---

## Testing Integration

### Test Case 1: Archetype Matching

```javascript
// Test: Jedi with high STR/WIS should match Guardian Defender
const actor = game.actors.getName("Test Jedi");
const archetype = await getPrimaryArchetypeForActor(actor);

assert.equal(archetype.name, "Guardian Defender");
assert.equal(archetype.matchScore, 65);
```

### Test Case 2: Feat Recommendations

```javascript
// Test: Recommended feats should boost tier
const actor = game.actors.getName("Test Jedi");
const feats = await game.packs.get('feats').getDocuments();

const suggestions = await SuggestionEngine.suggestFeats(feats, actor);
const blockSuggestion = suggestions.find(s => s.name === "Block");

assert.equal(blockSuggestion.tier, SUGGESTION_TIERS.CLASS_SYNERGY);
assert.true(blockSuggestion.archetypeMatched);
```

### Test Case 3: Role Bias Application

```javascript
// Test: Defensive feats should score higher for Guardian Defender
const actor = game.actors.getName("Test Guardian");
const defensiveFeats = feats.filter(f => f.system?.tags?.role === "defense");

const scores = defensiveFeats.map(f => {
  const suggestion = suggestions.find(s => s.id === f.id);
  return suggestion.roleAlignment || 1.0;
});

assert.true(scores.some(s => s > 1.0)); // At least one role bonus
```

---

## Performance Considerations

**Current:**
- Registry lookup: O(1)
- Archetype scoring: O(n attributes)
- Fuzzy matching: O(n*m) but cached per session

**Optimization Opportunities:**
1. Cache `getPrimaryArchetypeForActor()` result per character
2. Pre-resolve all keyword IDs on init (not on demand)
3. Batch archetype queries for multiple suggestions
4. Cache role/attribute calculations per archetype

---

## Migration Checklist

- [ ] Import ArchetypeRegistryIntegration in SuggestionEngine
- [ ] Call `getPrimaryArchetypeForActor()` in `suggestFeats()` and `suggestTalents()`
- [ ] Add archetype recommendation check in tier assignment
- [ ] Update explanations to include archetype context
- [ ] Test with multiple character types (Jedi, Soldier, Scoundrel, etc.)
- [ ] Verify tier boosts are appropriate
- [ ] Check for performance regressions
- [ ] Update UI to highlight archetype recommendations
- [ ] Document archetype-aware tier expectations

---

## Troubleshooting

### Issue: No Archetype Found

```javascript
const archetype = await getPrimaryArchetypeForActor(actor);
if (!archetype) {
  // Fallback to default behavior
  SWSELogger.warn(`[SuggestionEngine] No archetype for ${actor.name}`);
  // Continue without archetype context
}
```

### Issue: Recommendations Not Resolving

```javascript
const archetypeFeats = await getArchetypeFeats(actor);
if (archetypeFeats.length === 0) {
  // Either:
  // 1. No archetype matched
  // 2. Keywords didn't resolve
  // 3. JSON not loaded

  SWSELogger.debug(
    `[SuggestionEngine] No feat recommendations for ${actor.name}`
  );
}
```

### Issue: Performance Degradation

```javascript
// Cache archetype lookup
this.#archetypeCache = new Map(); // actor.id -> archetype

async getArchetypeCached(actor) {
  if (this.#archetypeCache.has(actor.id)) {
    return this.#archetypeCache.get(actor.id);
  }

  const archetype = await getPrimaryArchetypeForActor(actor);
  this.#archetypeCache.set(actor.id, archetype);
  return archetype;
}
```

---

## References

- **Registry:** `/scripts/engine/archetype/archetype-registry.js`
- **Integration:** `/scripts/engine/archetype/archetype-registry-integration.js`
- **Suggestion Engine:** `/scripts/engine/suggestion/SuggestionEngine.js`
- **Data:** `/data/class-archetypes.json`
- **Architecture Map:** `ARCHETYPE_SUGGESTION_MAP.md` (this directory)

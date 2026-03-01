# Archetype Suggestion Engine Map

## Overview

This document maps how archetype data flows from source → registry → integration → suggestion system.

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA FLOW PIPELINE                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐
│  class-archetypes.json       │  ← Source of truth
│  - talentKeywords/talents    │
│  - featKeywords/feats        │
│  - roleBias                  │
│  - attributeBias             │
│  - mechanicalBias            │
└──────────────┬───────────────┘
               │ (fetch on game ready)
               ▼
┌──────────────────────────────┐
│   ArchetypeRegistry          │  ← Cache & resolution layer
│   (archetype-registry.js)    │
│                              │
│ initialize()                 │
│ ├─ Load from JSON            │
│ ├─ Parse & normalize         │
│ └─ Cache in memory           │
│                              │
│ Public API:                  │
│ ├─ get(id)                   │
│ ├─ getByClass(classId)       │
│ ├─ resolveFeatKeywords()     │
│ ├─ resolveTalentKeywords()   │
│ └─ getResolvedRecommendations()
└──────────────┬───────────────┘
               │ (query on demand)
               ▼
┌──────────────────────────────┐
│ ArchetypeRegistryIntegration │  ← Character matching
│ (archetype-registry-         │
│  integration.js)             │
│                              │
│ getArchetypeRecommendations  │
│ ├─ Query registry by class   │
│ ├─ Score each archetype      │
│ └─ Return with metadata      │
│                              │
│ getPrimaryArchetype()        │
│ ├─ Score by attributes       │
│ └─ Return best match         │
│                              │
│ Helper functions:            │
│ ├─ getArchetypeFeats()       │
│ ├─ getArchetypeTalents()     │
│ ├─ isArchetypeRecommended()  │
│ └─ getRoleBiasForArchetype() │
└──────────────┬───────────────┘
               │ (called by suggestion system)
               ▼
┌──────────────────────────────┐
│   SuggestionEngine           │  ← Suggestion generation
│   (SuggestionEngine.js)      │
│                              │
│ suggestFeats() / suggestTalents()
│ ├─ Get primary archetype     │
│ ├─ Extract recommendations   │
│ ├─ Score vs other criteria   │
│ └─ Return tiered suggestions │
│                              │
│ Integration points:          │
│ ├─ PRESTIGE_PREREQ tier      │
│ ├─ CLASS_SYNERGY tier        │
│ └─ CHAIN_CONTINUATION tier   │
└──────────────┬───────────────┘
               │ (output)
               ▼
┌──────────────────────────────┐
│   SuggestionService          │  ← API endpoint
│   (SuggestionService.js)     │
│                              │
│ Returns:                     │
│ ├─ Tier assignments          │
│ ├─ Confidence scores         │
│ ├─ Archetype explanations    │
│ └─ Weighted recommendations  │
└──────────────┬───────────────┘
               │ (display)
               ▼
┌──────────────────────────────┐
│   UI / Character Sheet       │  ← User sees recommendations
│   - Highlighted suggestions  │
│   - Archetype context        │
│   - Role/attribute alignment │
└──────────────────────────────┘
```

---

## Detailed Component Map

### 1. Data Source: `class-archetypes.json`

**Location:** `/data/class-archetypes.json`

**Structure:**
```json
{
  "_meta": { "version": "1.0" },
  "classes": {
    "jedi": {
      "displayName": "Jedi",
      "archetypes": {
        "guardian_defender": {
          "name": "Guardian Defender",
          "status": "active",
          "mechanicalBias": { "frontline_damage": 0.4, ... },
          "roleBias": { "offense": 1.0, "defense": 1.3, ... },
          "attributeBias": { "STR": 0.3, "WIS": 0.3, ... },
          "talents": ["item_id_1", "item_id_2"],
          "feats": ["item_id_3", "item_id_4"],
          "notes": "..."
        }
      }
    }
  }
}
```

**Key Fields:**
- `talents` / `feats` - Item IDs or keywords for recommendations
- `roleBias` - Role weights (offense, defense, support, utility)
- `attributeBias` - Attribute importance weights
- `mechanicalBias` - Mechanical playstyle indicators

---

### 2. ArchetypeRegistry

**Location:** `scripts/engine/archetype/archetype-registry.js`

**Lifecycle:**
1. **Initialize** (game ready hook):
   ```javascript
   await ArchetypeRegistry.initialize()
   ```
   - Fetches `class-archetypes.json`
   - Parses each archetype
   - Caches in memory
   - Loads custom world archetypes

2. **Store Format** (internal cache):
   ```javascript
   {
     id: "jedi-guardian_defender",
     name: "Guardian Defender",
     baseClassId: "jedi",
     roles: ["defense"],
     recommended: {
       feats: ["item_id_1", ...],
       talents: ["item_id_2", ...],
       skills: []
     },
     roleBias: { ... },
     attributeBias: { ... },
     mechanicalBias: { ... }
   }
   ```

**Key Methods:**

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `initialize()` | - | Promise | Load all archetypes into cache |
| `get(id)` | Archetype ID | Archetype object | Retrieve single archetype |
| `getByClass(classId)` | Class ID | Archetype[] | Get all archetypes for class |
| `resolveFeatKeywords(keywords)` | String[] | Promise<String[]> | Convert keywords → item IDs |
| `resolveTalentKeywords(keywords)` | String[] | Promise<String[]> | Convert keywords → item IDs |
| `getResolvedRecommendations(id)` | Archetype ID | Promise<{feats, talents}> | Get actual item IDs |
| `getByClassResolved(classId)` | Class ID | Promise<Archetype[]> | Get archetypes with resolved IDs |

**Fuzzy Matching Strategy:**
1. **Exact match** - Normalized string equality
2. **Substring match** - Either contains the other
3. **Levenshtein distance** - 60% similarity threshold

---

### 3. ArchetypeRegistryIntegration

**Location:** `scripts/engine/archetype/archetype-registry-integration.js`

**Purpose:** Bridge archetype registry with character/suggestion system

**Key Functions:**

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `getArchetypeRecommendationsForActor(actor)` | Actor | Promise<Archetype[]> | Get all archetypes for character's class |
| `getPrimaryArchetypeForActor(actor)` | Actor | Promise<Archetype\|null> | Get best-matching archetype |
| `getArchetypeFeats(actor)` | Actor | Promise<String[]> | Get feat IDs for character's archetype |
| `getArchetypeTalents(actor)` | Actor | Promise<String[]> | Get talent IDs for character's archetype |
| `isArchetypeRecommended(itemId, actor)` | String, Actor | Promise<Boolean> | Check if item is archetype-recommended |
| `getAttributePriorityForArchetype(id)` | Archetype ID | String[] | Get attribute ranking |
| `getRoleBiasForArchetype(id)` | Archetype ID | Object | Get role weights |

**Scoring Algorithm:**
```javascript
score = normalizedAttributes / totalWeight
// For each attribute in archetype.attributeBias:
//   score += (characterAttribute / 10) * weight
// Result: 0-1 scale
```

---

### 4. SuggestionEngine Integration Points

**Location:** `scripts/engine/suggestion/SuggestionEngine.js`

**How Archetypes Are Used:**

1. **During Tier Assignment:**
   ```javascript
   // Get primary archetype
   const archetype = await getPrimaryArchetypeForActor(actor)

   // Extract recommendations
   const recommendations = archetype.recommendedIds

   // Check if item matches
   if (recommendations.feats.includes(itemId)) {
     // Boost tier if appropriate
   }
   ```

2. **Tier Boost Locations:**
   - `CHAIN_CONTINUATION` - If item chains from archetype's previous feats
   - `CLASS_SYNERGY` - If item is in archetype's recommended list
   - `ABILITY_PREREQ_MATCH` - If item's prereq matches archetype's top attribute

3. **Explanation Generation:**
   ```javascript
   const explanation = `This matches your ${archetype.name} archetype's ` +
     `${highlightedRole} focus.`
   ```

---

## Data Flow Examples

### Example 1: Character Level-Up (Jedi)

```
1. Character levels up
   │
2. Get character's class: "jedi"
   │
3. Call getArchetypeRecommendationsForActor(actor)
   ├─ Query registry for "jedi" archetypes
   │  ├─ guardian_defender
   │  ├─ aggressive_duelist
   │  └─ force_adept
   │
4. Score each archetype
   ├─ STR: 16 (high) → guardian_defender scores well
   │  (STR weight: 0.3, bonus: 0.8 * 0.3 = 0.24)
   ├─ WIS: 12 (moderate)
   └─ Return: guardian_defender (score: 0.65)
   │
5. Get recommendations
   ├─ talents: ["9379daa94a228c04", "72c644f7a09b1186", ...]
   ├─ feats: ["c41814601364b643", "9b7b869a86f39190"]
   │
6. Pass to SuggestionEngine
   ├─ Compare available feats against recommendations
   ├─ Suggested feats get CLASS_SYNERGY tier boost
   │
7. Return to UI
   ├─ "Block" - Recommended (Guardian Defender)
   ├─ "Power Attack" - Available
   └─ "Weapon Focus (Lightsabers)" - Recommended (Guardian Defender)
```

### Example 2: Keyword Resolution

```
Archetype has talentKeyword: "Block"
   │
1. resolveTalentKeywords(["Block"])
   │
2. Search talents compendium
   ├─ Exact match? "block" === "block" ✓
   │
3. Return item ID: "9379daa94a228c04"
   │
   (If no exact match, try substring/fuzzy)
```

---

## Integration Checklist

- [x] ArchetypeRegistry loads from JSON
- [x] Registry caches archetypes in memory
- [x] Keyword resolution with fuzzy matching
- [x] ArchetypeRegistryIntegration provides API
- [x] Scoring based on attribute distribution
- [x] Primary archetype selection
- [ ] SuggestionEngine uses archetype data
- [ ] Tier assignment based on recommendations
- [ ] Explanation text includes archetype context
- [ ] UI highlights archetype-recommended items

---

## Testing Checklist

### Registry Tests
- [ ] All 182 archetypes load successfully
- [ ] Caching works (second access is instant)
- [ ] `getByClass()` returns correct count
- [ ] Fuzzy matching resolves keywords correctly
- [ ] Unmatched keywords log debug messages

### Integration Tests
- [ ] `getPrimaryArchetypeForActor()` returns best match
- [ ] Scoring algorithm produces 0-1 range
- [ ] Character attribute distribution affects selection
- [ ] Empty talent/feat arrays handled gracefully

### Suggestion Engine Tests
- [ ] Archetype recommendations boost tier appropriately
- [ ] Non-recommended items unaffected
- [ ] Explanations include archetype name
- [ ] Role bias influences secondary suggestions

### End-to-End Tests
- [ ] Jedi character gets Jedi archetypes
- [ ] Soldier character gets Soldier archetypes
- [ ] High STR/WIS gets defensive archetype
- [ ] High DEX gets offensive archetype
- [ ] Recommendations appear in suggestion list

---

## Future Enhancements

1. **Prestige Path Hints:**
   - Map archetypes → prestige classes
   - Suggest prestige when archetype alignment is high

2. **Multi-Archetype Support:**
   - Allow secondary archetype selection
   - Blend recommendations from multiple archetypes

3. **Archetype Progression:**
   - Track archetype affinity over levels
   - Suggest different archetypes as character evolves

4. **Build Coherence:**
   - Calculate overall build alignment with chosen archetype
   - Warn if selections deviate significantly

5. **Custom Archetypes:**
   - Allow GMs to create custom archetypes
   - Store in world items, load alongside JSON

---

## Performance Notes

**Memory:** ~500KB (182 archetypes × 3KB average)

**Load Time:** ~100ms (JSON fetch + parse on first init)

**Lookup Time:**
- `get()`: O(1) - Hash map lookup
- `getByClass()`: O(n) - Linear scan (n ~= 5-10 archetypes per class)
- `resolveFeatKeywords()`: O(n*m) - Fuzzy match (n = keywords, m = items in pack)

**Caching:**
- Registry caches on init
- Integration layer does NOT cache (allows dynamic character updates)
- Fuzzy matching results NOT cached (enables pack updates)

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| JSON load fails | Log error, return empty registry |
| Archetype missing data | Skip archetype, log warning |
| Keyword unresolved | Return empty array, log debug |
| Compendium not found | Log warning, return empty array |
| Character class not found | Return empty recommendations |

---

## References

- **Registry:** `scripts/engine/archetype/archetype-registry.js`
- **Integration:** `scripts/engine/archetype/archetype-registry-integration.js`
- **Data:** `data/class-archetypes.json`
- **Suggestion Engine:** `scripts/engine/suggestion/SuggestionEngine.js`
- **Previous Integration:** `scripts/engine/suggestion/ArchetypeSuggestionIntegration.js`

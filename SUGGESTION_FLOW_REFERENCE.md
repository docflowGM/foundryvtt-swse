# Suggestion Engine Flow Reference

## Complete Data Flow: Step → Service → Coordinator → Engine → Display

This document maps how suggestions flow through the system for all 9 supported domains, with focus on the 2 newly-implemented domains (species, languages).

---

## Domain Routing & Engine Mapping

### Supported Domains (9)

```
Domain Request
    ↓
SuggestionService.getSuggestions(options.domain)
    ↓
┌────────────────────────────────────────────────────────────────┐
│ Domain Router (lines 205-225 in SuggestionService.js)          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  'feats'         → SuggestionEngineCoordinator.suggestFeats()   │
│  'talents'       → SuggestionEngineCoordinator.suggestTalents() │
│  'classes'       → SuggestionEngineCoordinator.suggestClasses() │
│  'forcepowers'   → SuggestionEngineCoordinator.suggestForceOptions() │
│  'backgrounds'   → SuggestionEngineCoordinator.suggestBackgrounds() │
│  'species'       → SuggestionEngineCoordinator.suggestSpecies() ✨ NEW │
│  'languages'     → SuggestionEngineCoordinator.suggestLanguages() ✨ NEW │
│  'skills_l1'     → SuggestionEngineCoordinator.suggestLevel1Skills() │
│  'attributes'    → SuggestionEngineCoordinator.suggestAttributeIncreases() │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
    ↓
Engine processes suggestions
    ↓
SuggestionService._enrichSuggestions()
    ↓
formatSuggestionsForDisplay()
    ↓
Template renders suggestions
    ↓
Mentor integrates with confidence-to-mood mapping
```

---

## NEW DOMAIN: Species

### Full Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ [1] Progression Framework: species-step                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: availableSpecies (from compendium)                      │
│  Calls: SuggestionService.getSuggestions(actor, 'chargen', {    │
│    domain: 'species',                                           │
│    available: this._allSpecies,                                 │
│    pendingData: {selectedClass, selectedBackground, ...}        │
│  })                                                              │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [2] SuggestionService.getSuggestions()                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Domain validation: validateDomain('species')                 │
│    → Checks if 'species' in SUPPORTED_DOMAINS (YES ✓)           │
│                                                                  │
│  • Build cache key: `${actor.id}::chargen::species`             │
│                                                                  │
│  • Check cache: if (cached?.rev === revision) return cached     │
│                                                                  │
│  • Domain routing (line 215):                                   │
│    if (options.domain === 'species') → Route to Coordinator     │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [3] SuggestionEngineCoordinator.suggestSpecies()                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Get or compute BuildIntent context                           │
│    buildIntent = await this.analyzeBuildIntent(actor)           │
│                                                                  │
│  • Call engine:                                                 │
│    SpeciesSuggestionEngine.suggestSpecies(                      │
│      availableSpecies,                                          │
│      actor,                                                     │
│      pendingData,                                               │
│      {buildIntent, ...}                                         │
│    )                                                            │
│                                                                  │
│  • Error handling: catch → return fallback [] with tier: 0.50   │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [4] SpeciesSuggestionEngine.suggestSpecies()                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT: availableSpecies, actor, pendingData                    │
│                                                                  │
│  A. Normalize species:                                          │
│     - Extract {id, name, category, abilityScores, abilities,   │
│       languages, ...} from each species item                    │
│     - Filter: only species with id && name                      │
│                                                                  │
│  B. Resolve selected class:                                     │
│     - Get class from pendingData.selectedClass                  │
│     - Lookup in ClassesRegistry                                 │
│     - Extract class primary ability (e.g., STR for Soldier)     │
│                                                                  │
│  C. Score each species:                                         │
│     For each species:                                           │
│       1. Check species ability scores vs. class primary ability │
│          → 0.85 if bonus > 0                                    │
│          → 0.70 if bonus = 0                                    │
│          → 0.50 otherwise                                       │
│                                                                  │
│       2. Check species special abilities:                       │
│          → +0.65 if has abilities                               │
│                                                                  │
│       3. Check species languages (count):                       │
│          → +0.60 if 2+ languages                                │
│                                                                  │
│       4. Check species category:                                │
│          → +0.85 if "humanoid"                                  │
│                                                                  │
│       → Build reasons array explaining each bump                │
│       → Take highest confidence as final score                  │
│                                                                  │
│  D. Filter & sort:                                              │
│     - Filter: confidence >= 0.45                                │
│     - Sort: descending by confidence                            │
│     - Slice: top 3 results                                      │
│                                                                  │
│  OUTPUT: [                                                      │
│    {id, name, suggestion: {confidence, reason, reasons[]}},     │
│    {id, name, suggestion: {confidence, reason, reasons[]}},     │
│    ...                                                          │
│  ]                                                              │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [5] SuggestionService._enrichSuggestions()                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Add drift-safe targetRef: species compendium pack + id       │
│  • Add reasons/explanations (already in engine output)          │
│  • Filter reasons by focus (if provided)                        │
│                                                                  │
│  Example enriched suggestion:                                   │
│  {                                                              │
│    id: 'human-species-id',                                      │
│    name: 'Human',                                               │
│    targetRef: 'Actor.compendium.species.human-species-id',      │
│    suggestion: {                                                │
│      confidence: 0.85,                                          │
│      reason: 'Human grants +2 STR, strengthening Soldier...',  │
│      reasons: [...]                                             │
│    },                                                           │
│    isSuggested: true                                            │
│  }                                                              │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [6] Cache & Return to Step                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Store in _cache[key] = {rev, suggestions, meta}              │
│  • Return enriched suggestions to species-step                  │
│                                                                  │
│  suggestions = [                                                │
│    {id: 'human', name: 'Human', suggestion: {...}},             │
│    {id: 'wookiee', name: 'Wookiee', suggestion: {...}},         │
│    {id: 'twi-lek', name: 'Twi\'lek', suggestion: {...}},        │
│  ]                                                              │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [7] species-step processes suggestions                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Store in this._suggestedSpecies                              │
│  • Call formatSuggestionsForDisplay(suggestions)                │
│    → Converts confidence (0.85) to tier/badge UI                │
│                                                                  │
│  Formatted output:                                              │
│  {                                                              │
│    id: 'human',                                                 │
│    name: 'Human',                                               │
│    isSuggested: true,                                           │
│    suggestion: {                                                │
│      confidence: 0.85,                                          │
│      tier: 3,          ← Confidence mapped to tier              │
│      badge: 'excellent-choice',  ← CSS class for styling        │
│      icon: '⭐',       ← Visual indicator                        │
│      reason: '...',                                             │
│      reasons: [...]                                             │
│    }                                                            │
│  }                                                              │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [8] Template renders suggestions                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • species-selection.hbs/html renders each species              │
│  • If isSuggested=true, show badge with tier-based styling      │
│  • Badge shows: ⭐ "Excellent Choice" (for 0.85 confidence)     │
│  • Hover/click shows full reason chain                          │
│                                                                  │
│  Visual output:                                                 │
│  ┌──────────────────────────────────┐                           │
│  │ Human                      ⭐ Pick │  ← Suggestion badge     │
│  │ (Excellent Choice)               │                           │
│  ├──────────────────────────────────┤                           │
│  │ Wookiee                    ⭐ Pick │  ← Also suggested        │
│  │ (Excellent Choice)               │                           │
│  ├──────────────────────────────────┤                           │
│  │ Twi'lek                    ○ Pick │  ← Valid but not sug.    │
│  └──────────────────────────────────┘                           │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [9] Mentor Integration (Ask Mentor button)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Player clicks "Ask Mentor"                                   │
│  • Mentor advisor reads suggestion confidence                   │
│  • Confidence → mood mapping:                                   │
│                                                                  │
│    0.85 confidence → 🎯 Encouraging mood                        │
│    "This species would be EXCELLENT for your Soldier. The      │
│     +2 STR bonus directly strengthens your primary abilities." │
│                                                                  │
│  • Mentor offers:                                               │
│    - "I'd recommend Human or Wookiee (both get +2 STR)"         │
│    - "Twi'lek is viable but doesn't match as well"              │
│    - Reason chains from suggestion.reasons[]                    │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [10] Player Accepts Suggestion                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Player clicks "Human (Excellent Choice)"                     │
│  • species-step.onSpeciesSelected('human-species-id')           │
│  • Store in pendingData.selectedSpecies                         │
│  • Move to next step (language-step)                            │
│                                                                  │
│  State update:                                                  │
│  pendingData.selectedSpecies = {                                │
│    id: 'human-species-id',                                      │
│    name: 'Human',                                               │
│    languages: ['Galactic Basic', ...]  ← Available for next step │
│  }                                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## NEW DOMAIN: Languages

### Full Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ [1] Progression Framework: language-step                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: availableLanguages (from compendium)                    │
│  Calls: SuggestionService.getSuggestions(actor, 'chargen', {    │
│    domain: 'languages',                                         │
│    available: this._allLanguages,                               │
│    pendingData: {                                               │
│      selectedClass,                                            │
│      selectedSpecies: {languages: [...]},                       │
│      selectedBackground: {startingLanguages: [...]},            │
│      selectedLanguages: [...]  ← Already chosen                 │
│    }                                                            │
│  })                                                              │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [2] SuggestionService.getSuggestions()                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Domain validation: validateDomain('languages')               │
│    → Checks if 'languages' in SUPPORTED_DOMAINS (YES ✓)         │
│                                                                  │
│  • Build cache key: `${actor.id}::chargen::languages`           │
│                                                                  │
│  • Check cache: if (cached?.rev === revision) return cached     │
│                                                                  │
│  • Domain routing (line 218):                                   │
│    if (options.domain === 'languages') → Route to Coordinator   │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [3] SuggestionEngineCoordinator.suggestLanguages()               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Call engine:                                                 │
│    LanguageSuggestionEngine.suggestLanguages(                   │
│      availableLanguages,                                        │
│      actor,                                                     │
│      pendingData,                                               │
│      options                                                    │
│    )                                                            │
│                                                                  │
│  • Error handling: catch → return fallback [] with confidence 0.50 │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [4] LanguageSuggestionEngine.suggestLanguages()                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT: availableLanguages, actor, pendingData                  │
│                                                                  │
│  A. Ensure registry loaded:                                     │
│     await LanguageRegistry.ensureLoaded()                       │
│     (Pack-first pattern: compendium or JSON fallback)           │
│                                                                  │
│  B. Extract context from pending:                               │
│     - selectedSpecies: {languages: [...]}                       │
│     - selectedBackground: {startingLanguages: [...]}            │
│     - selectedLanguages: [...] (already chosen)                 │
│                                                                  │
│  C. Get current languages:                                      │
│     _getCurrentLanguages(actor, selectedLanguages)              │
│     - From actor skills (speak-language)                        │
│     - From actor system details                                 │
│     - From pending selections                                   │
│                                                                  │
│  D. Normalize available languages:                              │
│     - Extract {id, name, category, slug, raw}                   │
│     - Filter out already selected languages                     │
│     - Only keep languages with id && name                       │
│                                                                  │
│  E. Score each language:                                        │
│     For each language:                                          │
│       1. Species cultural match:                                │
│          If language in selectedSpecies.languages               │
│          → confidence = 0.80, reason = "Native to [Species]"   │
│                                                                  │
│       2. Background cultural match:                             │
│          If language in selectedBackground.startingLanguages    │
│          → confidence = max(current, 0.75)                      │
│          → reason += "Common in [Background]"                   │
│                                                                  │
│       3. Trade language bonus:                                  │
│          If category includes "trade" OR                        │
│          name matches ["basic", "galactic", "trade", ...]       │
│          → confidence = max(current, 0.65)                      │
│          → reason += "Widely used trade language"               │
│                                                                  │
│       → Build reasons array explaining all bumps                │
│       → First reason becomes primaryReason                      │
│                                                                  │
│  F. Filter & sort:                                              │
│     - Filter: confidence >= 0.55  (narrower than species!)      │
│     - Sort: descending by confidence                            │
│     - Slice: top 2 results (less noisy than species top 3)      │
│                                                                  │
│  OUTPUT: [                                                      │
│    {id, name, suggestion: {confidence, reason, reasons[]}},     │
│    {id, name, suggestion: {confidence, reason, reasons[]}}      │
│  ]                                                              │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [5] SuggestionService._enrichSuggestions()                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Add drift-safe targetRef: language compendium pack + id      │
│  • Add reasons/explanations (already in engine output)          │
│  • Filter reasons by focus (if provided)                        │
│                                                                  │
│  Example enriched suggestion:                                   │
│  {                                                              │
│    id: 'galactic-basic-id',                                     │
│    name: 'Galactic Basic',                                      │
│    targetRef: 'Item.compendium.languages.galactic-basic-id',    │
│    suggestion: {                                                │
│      confidence: 0.80,                                          │
│      reason: 'Native to Wookiee',                               │
│      reasons: ['Native to Wookiee', 'Common in Spaceport Bg'] │
│    },                                                           │
│    isSuggested: true                                            │
│  }                                                              │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [6] Cache & Return to Step                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Store in _cache[key] = {rev, suggestions, meta}              │
│  • Return enriched suggestions to language-step                 │
│                                                                  │
│  suggestions = [                                                │
│    {id: 'galactic-basic', name: 'Galactic Basic', ...},         │
│    {id: 'trade-droid', name: 'Trade (Droid)', ...},             │
│  ]                                                              │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [7] language-step processes suggestions                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Store in this._suggestedLanguages                            │
│  • Call formatSuggestionsForDisplay(suggestions)                │
│    → Converts confidence (0.80) to tier/badge UI                │
│                                                                  │
│  Formatted output:                                              │
│  {                                                              │
│    id: 'galactic-basic',                                        │
│    name: 'Galactic Basic',                                      │
│    isSuggested: true,                                           │
│    suggestion: {                                                │
│      confidence: 0.80,                                          │
│      tier: 3,          ← Confidence mapped to tier              │
│      badge: 'strong-choice',  ← CSS class for styling           │
│      icon: '✓',        ← Visual indicator                       │
│      reason: 'Native to Wookiee',                               │
│      reasons: [...]                                             │
│    }                                                            │
│  }                                                              │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [8] Template renders suggestions                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • language-selection.hbs/html renders each language            │
│  • If isSuggested=true, show badge with tier-based styling      │
│  • Badge shows: ✓ "Strong Choice" (for 0.80 confidence)         │
│  • Hover/click shows full reason chain                          │
│                                                                  │
│  Visual output:                                                 │
│  ┌──────────────────────────────────┐                           │
│  │ Galactic Basic             ✓ Pick │  ← Suggestion badge     │
│  │ (Strong Choice)                  │                           │
│  ├──────────────────────────────────┤                           │
│  │ Trade (Droid)              ✓ Pick │  ← Also suggested        │
│  │ (Good Choice)                    │                           │
│  ├──────────────────────────────────┤                           │
│  │ Ewokese                    ○ Pick │  ← Valid but not sug.    │
│  └──────────────────────────────────┘                           │
│                                                                  │
│  Note: Only 2 suggestions (vs. 3 for species) to reduce noise   │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [9] Mentor Integration (Ask Mentor button)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Player clicks "Ask Mentor"                                   │
│  • Mentor advisor reads suggestion confidence                   │
│  • Confidence → mood mapping:                                   │
│                                                                  │
│    0.80 confidence → 💭 Supportive mood                         │
│    "Galactic Basic would serve you well. As a Wookiee, it's    │
│     native to your species, and you'll need it for trade and   │
│     communication across the galaxy."                          │
│                                                                  │
│  • Mentor offers:                                               │
│    - "I'd suggest Galactic Basic and Trade (Droid) languages"   │
│    - "These will help you interact with most beings"            │
│    - "Other languages are available if you prefer alternatives" │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ [10] Player Selects Languages                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Player clicks "Galactic Basic (Strong Choice)"               │
│  • language-step.onLanguageSelected('galactic-basic-id')        │
│  • Store in pendingData.selectedLanguages                       │
│  • Can select multiple languages (multiselect pattern)          │
│  • Move to next step                                            │
│                                                                  │
│  State update:                                                  │
│  pendingData.selectedLanguages = [                              │
│    {id: 'galactic-basic-id', name: 'Galactic Basic'},           │
│    {id: 'trade-droid-id', name: 'Trade (Droid)'}, ...           │
│  ]                                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Confidence Tier Mapping to UI/Mentor

### Species Confidence → Tier/Badge/Mood

| Confidence | Tier | Badge | Icon | Mentor Mood | Example Advice |
|---|---|---|---|---|---|
| 0.80–1.00 | ⭐⭐⭐ | excellent-choice | ⭐ | 🎯 Encouraging | "This would be excellent for your Soldier" |
| 0.65–0.79 | ⭐⭐ | good-choice | ✓ | 💭 Supportive | "This species would work well with your build" |
| 0.50–0.64 | ⭐ | fair-choice | ○ | 🤔 Thoughtful | "This is a solid option if you like it" |
| < 0.50 | — | no-badge | — | (no mention) | (Not suggested, but available) |

### Languages Confidence → Tier/Badge/Mood

| Confidence | Tier | Badge | Icon | Mentor Mood | Example Advice |
|---|---|---|---|---|---|
| 0.75–1.00 | ⭐⭐⭐ | strong-choice | ✓ | 💭 Supportive | "This language will serve you well" |
| 0.55–0.74 | ⭐⭐ | good-choice | ✓ | 🤔 Thoughtful | "This is a useful language to consider" |
| < 0.55 | — | no-badge | — | (no mention) | (Not suggested, but available) |

---

## Caching & Cache Invalidation

### Cache Key Structure

```javascript
key = `${actor.id}::${context}::${options.domain}`

Examples:
- `actor-123::chargen::species`
- `actor-123::chargen::languages`
- `actor-123::sheet::species`
```

### Cache Invalidation Triggers

1. **Actor level changes**: SnapshotBuilder detects level change → new hash → miss
2. **Ability scores change**: Included in snapshot hash → new hash → miss
3. **Items added/removed**: Item list included in snapshot hash → miss
4. **Pending selections**: pendingData included in hash → miss when pending data changes

### Cache Hit Scenario

```
Player: "Show species suggestions"
Request 1: cache miss → compute → return (took 50ms)

Player: (selects species without changing other data)
Request 2: Same cache key, same hash → cache hit → return instantly

Player: (changes class selection in pending)
Request 3: Different hash → cache miss → recompute with new class context
```

---

## Error Handling & Fallbacks

### Scenario: Engine Exception

```
try {
  suggestions = await SpeciesSuggestionEngine.suggestSpecies(...)
} catch (err) {
  SWSELogger.error('Species suggestion failed:', err)

  // Fallback: return all species with tier: 0.50
  return species.map(s => ({
    ...s,
    suggestion: {
      confidence: 0.50,
      reason: 'Valid option'
    }
  }))
}
```

Result: Player sees all species as "valid options" (no suggestions) but can still proceed.

---

## Debug Logging

### When `HouseRuleService.get('enableSuggestionTrace')` = true

#### Species Suggestions Computed

```
[SpeciesSuggestionEngine] Suggestions computed
  actor: "Jedi Knight"
  class: "Jedi"
  suggestions: "Human (85%), Togruta (80%), Miraluka (75%)"
```

#### Languages Suggestions Computed

```
[LanguageSuggestionEngine] Suggestions computed
  actor: "Jedi Knight"
  species: "Togruta"
  background: "Jedi Temple"
  suggestions: "Togruti (80%), Galactic Basic (70%)"
```

#### Domain Validation

```
[SuggestionService] Domain validation passed
  domain: "species"
  canonical: "species"
  isSupported: true
```

---

## API Usage Examples

### Direct Engine Calls (for testing)

```javascript
// Species suggestions
const species = await SuggestionEngineCoordinator.suggestSpecies(
  availableSpecies,
  actor,
  {selectedClass: classItem},
  {debug: true}
)

// Languages suggestions
const languages = await SuggestionEngineCoordinator.suggestLanguages(
  availableLanguages,
  actor,
  {selectedSpecies: speciesItem, selectedBackground: bgItem}
)
```

### Via Game API

```javascript
// From UI or console
game.swse.suggestions.suggestSpecies(species, actor, pendingData, options)
game.swse.suggestions.suggestLanguages(languages, actor, pendingData, options)

// Or via service
game.swse.suggestions.getSuggestions(actor, 'chargen', {
  domain: 'species',
  available: speciesArray,
  pendingData: currentChargenData
})
```

---

## Integration Testing Checklist

- [ ] Species suggestions show in UI with correct confidence badges
- [ ] Languages suggestions show in UI with correct confidence badges
- [ ] Mentor advisor reflects confidence-to-mood mapping
- [ ] Cache invalidates correctly when pending data changes
- [ ] No console warnings for supported domains (only unsupported)
- [ ] Game API methods available: `game.swse.suggestions.suggestSpecies()`
- [ ] Game API methods available: `game.swse.suggestions.suggestLanguages()`
- [ ] Full chargen flow completes without errors

---

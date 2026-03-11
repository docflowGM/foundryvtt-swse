# SWSE Suggestion Engine — Behavioral Audit Report

**Date**: 2026-03-11
**Status**: COMPLETE — No modifications made. Pure truth extraction.
**Scope**: Full data flow, assumptions, and failure modes

---

## PHASE 1: ENGINE FILE STRUCTURE

### Primary Engine Files

```
/scripts/engine/suggestion/
├── SuggestionService.js              (Entry point, caching, public API)
├── SuggestionEngineCoordinator.js    (Orchestrator, BuildIntent caching)
├── SuggestionEngine.js               (Core scoring logic, Tier definitions)
├── ArchetypeAffinityEngine.js        (Validation, affinity scoring, explanation)
├── ArchetypeDefinitions.js           (Archetype resolution, JSON imports)
└── archetype/
    ├── archetype-registry.js         (Data-only caching, JSON parsing)
    └── archetype-registry-integration.js  (Scoring integration, character match)
```

### Data Files

```
/data/
├── class-archetypes.json            (SSOT — all archetype definitions)
├── generic-archetypes.json          (Fallback for unspecified class)
└── default-archetype-weights.json   (Weight multipliers)
```

### Entry Points

1. **Public API**: `SuggestionService.getSuggestions(actor, context, options)`
2. **Coordinator**: `SuggestionEngineCoordinator.suggestFeats(feats, actor, pendingData, options)`
3. **Direct Engine**: `SuggestionEngine.suggestFeats(feats, actor, pendingData, options)`

---

## PHASE 2: ARCHETYPE LOAD PATH

### How class-archetypes.json is Loaded

**Load Methods (TWO PATHS)**:

#### Path A: Direct Fetch (ArchetypeAffinityEngine)
```javascript
// scripts/engine/suggestion/ArchetypeAffinityEngine.js:32-45
const response = await fetch('systems/foundryvtt-swse/data/class-archetypes.json');
CLASS_ARCHETYPES = await response.json();
```
- **When**: Called on demand
- **Caching**: Module-level singleton (`CLASS_ARCHETYPES`)
- **Normalization**: None
- **Validation**: validateArchetypes() validates after load
- **Mutation**: Object NOT mutated

#### Path B: ES6 Import (ArchetypeDefinitions)
```javascript
// scripts/engine/suggestion/ArchetypeDefinitions.js:18
import CLASS_ARCHETYPES from "/systems/foundryvtt-swse/data/class-archetypes.json" with { type: 'json' };
```
- **When**: Module load time
- **Caching**: Bundled at import
- **Normalization**: Mapped to legacy format via `mapSsotArchetypeToLegacy()`
- **Validation**: None
- **Mutation**: Creates new mapped objects

#### Path C: Registry Load (ArchetypeRegistry)
```javascript
// scripts/engine/archetype/archetype-registry.js:64-88
const response = await fetch('/systems/foundryvtt-swse/data/class-archetypes.json');
const data = await response.json();

// Iterate through classes and archetypes
for (const [className, classData] of Object.entries(data.classes || {})) {
    for (const [archId, archData] of Object.entries(classData.archetypes || {})) {
        const archetype = this._parseJSONArchetype(className, archId, archData);
        // Store with key: `${className}-${archId}`
    }
}
```
- **When**: Game ready (initialization)
- **Caching**: Immutable Map in registry (keyed by `className-archetypeId`)
- **Normalization**: Parsed via `_parseJSONArchetype()`
- **Validation**: Checks required fields (`name`)
- **Mutation**: None (reads only)

### Data Flow Summary

```
class-archetypes.json
    ├→ ArchetypeAffinityEngine (raw fetch, validation later)
    ├→ ArchetypeDefinitions (ES6 import, legacy mapping)
    └→ ArchetypeRegistry (fetch + parse, immutable cache)
        └→ Resolved via getByClassResolved()
            └→ getPrimaryArchetypeForActor()
                └→ SuggestionEngine._evaluateFeat()
```

---

## PHASE 3: ARCHETYPE SCORING LOGIC

### Entry Point: How Scoring Starts

```javascript
// SuggestionEngine.js:120-189
static async suggestFeats(feats, actor, pendingData = {}, options = {}) {
    const actorState = this._buildActorState(actor, pendingData);

    // Get primary archetype for character
    let primaryArchetype = await getPrimaryArchetypeForActor(actor);
    if (primaryArchetype) {
        archetypeRecommendedFeatIds = await getArchetypeFeats(actor);
    }

    // Score each feat
    return Promise.all(feats.map(feat => {
        const suggestion = this._evaluateFeat(
            feat, actorState, featMetadata, buildIntent, actor, pendingData,
            primaryArchetype, archetypeRecommendedFeatIds
        );
        return { ...feat, suggestion, isSuggested: suggestion.tier > 0 };
    }));
}
```

### Tier Hierarchy (Immutable)

```
TIER 6: PRESTIGE_PREREQUISITE
  ├─ Pre-req for known prestige class target
  ├─ Highest confidence (0.95)
  └─ Via BuildIntent.prestige signals

TIER 5: PRESTIGE_QUALIFIED_NOW / META_SYNERGY
  ├─ Character level reached prestige prereq levels
  ├─ Community meta synergy detected
  ├─ Martial arts feat
  └─ Confidence: 0.85

TIER 4: PATH_CONTINUATION / CHAIN_CONTINUATION
  ├─ Builds on owned feat or talent
  ├─ Species-specific feat with level decay
  └─ Confidence: 0.75

TIER 3: CATEGORY_SYNERGY (Subpriority weighted)
  ├─ ARCHETYPE_RECOMMENDATION (weight: 0.15) — in recommended IDs
  ├─ MENTOR_BIAS_MATCH (weight: 0.10) — matches mentor survey
  ├─ SKILL_PREREQ_MATCH (weight: 0.05) — uses trained skill
  └─ Confidence: 0.60

TIER 2: ABILITY_SYNERGY
  ├─ Uses highest ability score in prerequisite
  └─ Confidence: 0.50

TIER 1: THEMATIC_FIT
  ├─ Class synergy (bonus_feat_for matches)
  └─ Confidence: 0.40

TIER 0: AVAILABLE
  ├─ Legal option, no specific recommendation
  └─ Confidence: 0.20
```

### Scoring Pseudocode

```pseudocode
function evaluateFeat(feat, actorState, metadata, buildIntent, actor, archetype, archetypeIds):

    // TIER 6: PRESTIGE
    if buildIntent.prestigeTargets contains feat.id:
        return { tier: 6, reason: "PRESTIGE_PREREQUISITE", confidence: 0.95 }

    // TIER 5: WISHLIST / META / MARTIAL
    if buildIntent.wishlistItems contains feat.id:
        return { tier: 5.5, reason: "WISHLIST_PATH", confidence: 0.85 }

    if isMartialArtsFeat(feat):
        return { tier: 5, reason: "MARTIAL_ARTS", confidence: 0.85 }

    if hasMetaSynergy(feat, actor):
        return { tier: 5, reason: "META_SYNERGY", confidence: 0.85 }

    // TIER 4: CHAIN / SPECIES
    chainPrereq = isChainContinuation(feat, actorState, metadata)
    if chainPrereq:
        return { tier: 4, reason: "CHAIN_CONTINUATION", details: chainPrereq, confidence: 0.75 }

    speciesMatch = checkSpeciesPrerequisite(feat, actorState)
    if speciesMatch:
        return { tier: speciesMatch.tier, reason: "SPECIES_EARLY", confidence: 0.75 }

    // TIER 3: CATEGORY SYNERGY (subpriority weighted)
    tier3Bonus = 0.0
    tier3Reasons = []

    if archetype AND feat.id in archetypeIds:
        tier3Bonus += 0.15
        tier3Reasons.push("ARCHETYPE_RECOMMENDATION")

    if buildIntent.mentorBiases:
        mentorMatch = checkMentorBiasMatch(feat, buildIntent)
        if mentorMatch:
            tier3Bonus += 0.10
            tier3Reasons.push("MENTOR_BIAS_MATCH")

    if usesTrainedSkill(feat, actorState):
        tier3Bonus += 0.05
        tier3Reasons.push("SKILL_PREREQ_MATCH")

    if tier3Bonus > 0:
        confidence = 0.60 + min(tier3Bonus, 0.25)
        return { tier: 3, reason: tier3Reasons[0], confidence: confidence }

    // TIER 2: ABILITY
    if usesHighestAbility(feat, actorState):
        return { tier: 2, reason: "ABILITY_PREREQ_MATCH", confidence: 0.50 }

    // TIER 1: CLASS
    if matchesClass(feat, actorState):
        return { tier: 1, reason: "CLASS_SYNERGY", confidence: 0.40 }

    // TIER 0: FALLBACK
    return { tier: 0, reason: "FALLBACK", confidence: 0.20 }
```

### Key Scoring Characteristics

1. **Deterministic**: Same input always produces same output
2. **First-match-wins for Tiers 6-2**: Return on first tier match
3. **Tier 3 is special**: Multiple sub-conditions scored additively
4. **Confidence is tier-based**: Not tied to strength of match
5. **No numeric weighting across tiers**: Tiers are discrete levels

---

## PHASE 4: ITEM RESOLUTION

### How Talents/Feats Are Selected

#### Via Archetype Recommended IDs

```javascript
// archetype-registry-integration.js:83-94
export async function getArchetypeFeats(actor) {
    const archetype = await getPrimaryArchetypeForActor(actor);
    if (!archetype) return [];
    return archetype.recommendedIds?.feats || [];  // ← Array of item IDs
}
```

**Process**:
1. Get primary archetype for actor
2. Return `archetype.recommendedIds.feats` (item IDs)
3. IDs are resolved via `ArchetypeRegistry.resolveFeatKeywords()` at runtime

#### Keyword to ID Resolution

```javascript
// archetype-registry.js:383-417
static async resolveFeatKeywords(keywords) {
    const results = [];
    const pack = game.packs.get('foundryvtt-swse.feats');
    const index = await pack.getIndex();

    for (const keyword of keywords) {
        const match = this._findBestMatch(keyword, index);
        if (match) {
            results.push(match._id);  // ← Convert keyword to ID
        }
    }
    return results;
}
```

**Characteristics**:
- Uses compendium pack lookup: `game.packs.get('foundryvtt-swse.feats')`
- Fuzzy matching via `_findBestMatch()` (NOT exact match)
- Returns item IDs
- Silently skips unresolved keywords (no error thrown)

#### What Gets Resolved

```javascript
// archetype-registry.js:467-488
static async getResolvedRecommendations(archetypeId) {
    const archetype = this.get(archetypeId);
    if (!archetype) return null;

    const [resolvedFeats, resolvedTalents] = await Promise.all([
        this.resolveFeatKeywords(archetype.recommended?.feats || []),
        this.resolveTalentKeywords(archetype.recommended?.talents || [])
    ]);

    return {
        feats: resolvedFeats,   // ← Item IDs
        talents: resolvedTalents,  // ← Item IDs
        skills: archetype.recommended?.skills || []
    };
}
```

### Failure Modes in Item Resolution

1. **Compendium pack not found**:
   - Logs warning, returns `[]`
   - Archetype feats/talents appear unavailable

2. **Keyword doesn't match any item**:
   - Silently skipped
   - No error, no indication to user
   - Suggestion engine gets incomplete list

3. **Item ID no longer exists**:
   - Engine still references ID
   - When loaded, returns `undefined`
   - Comparison `feat.id === deadId` fails silently

4. **Duplicate resolved IDs**:
   - Not deduplicated
   - Same item suggested multiple times
   - Engine relies on later deduplication in SuggestionService

---

## PHASE 5: DATA CONTRACT ASSUMPTIONS

### What the Engine ASSUMES (NOT ENFORCED)

#### Archetype Structure (Required)

```javascript
// From ArchetypeAffinityEngine.js:51-60
REQUIRED_ARCHETYPE_FIELDS = [
    'name',              // Required: string
    'status',            // Required: 'active' | 'stub' (no validation at load)
    'mechanicalBias',    // Required: object (can be empty)
    'roleBias',          // Required: object (can be empty)
    'attributeBias',     // Required: object, keys must be STR/DEX/CON/INT/WIS/CHA
    'talentKeywords',    // Required: array of strings
    'featKeywords',      // Required: array of strings
    'notes'              // Required: string
];
```

**Actual JSON Fields**:
```json
{
    "name": "Guardian Defender",
    "status": "active",
    "mechanicalBias": { "frontline_damage": 0.4, ... },
    "roleBias": { "offense": 1.0, ... },
    "attributeBias": { "STR": 0.3, ... },
    "talents": ["9379daa94a228c04", ...],    // ← NOT talentKeywords
    "feats": ["c41814601364b643", ...],      // ← NOT featKeywords
    "notes": "..."
}
```

**MISMATCH**: Engine expects `talentKeywords` and `featKeywords`, but JSON has `talents` and `feats`.

#### Actor System Paths (Assumed but not validated)

```javascript
actor.system.attributes         // Must exist, keys: STR, DEX, CON, INT, WIS, CHA
actor.system.attributes[KEY].total  // Numeric ability score
actor.system.skills             // Must exist, object with .trained property
actor.system.details.class      // Must exist for archetype matching
actor.system.level              // Must exist, numeric
actor.items[]                   // Array of items (feats, talents, classes, species)
```

**What Happens if Missing**:
- Silent fallback to defaults (0, false, null)
- No error thrown
- Scoring produces neutral/zero results

#### Feat/Talent System Fields (Assumed)

```javascript
item.system.prerequisite    // String with prerequisite text (OR)
item.system.prerequisites   // String with prerequisite text (OR)
item.system.bonus_feat_for  // Array of class names
item.system.tree            // Talent tree ID
item.system.featType        // Type code ('martial_arts', 'species', etc.)
```

**What Happens if Missing**:
- Fields silently treated as empty/false
- Item appears to have no prerequisites
- Chain continuations fail to match

#### Bias Key Assumptions

**mechanicalBias keys ASSUMED to be valid**:
- `frontline_damage`, `force_control`, `controller`, etc.
- Not validated against canonical enum
- Unknown keys silently ignored

**roleBias keys ASSUMED to be valid**:
- `offense`, `defense`, `support`, `utility`, `scout`, etc.
- Used to extract roles (values > 1.0)
- Unknown keys silently ignored

**attributeBias keys MUST be D20 standard**:
- `STR`, `DEX`, `CON`, `INT`, `WIS`, `CHA`
- Case-sensitive (exact match required)
- Unknown keys silently skipped

#### Numeric Ranges (Assumed)

```
All weights/biases: >= 0 (negative values not validated)
Ability scores: 8-18 (D20 range assumed in normalization: (value - 8) / 10)
Confidence scores: 0.0-1.0 (implicit)
Tier values: 0-6 (no validation)
```

---

## PHASE 6: FAILURE MODES

### Silent Failure Scenarios

#### 1. Misspelled Bias Key
```json
{
    "mechanicalBias": {
        "frontline_damge": 0.4      // ← Typo: "damge" instead of "damage"
    }
}
```
**Result**:
- Key silently ignored
- No error logged
- Scoring continues with incomplete bias
- User never notified

#### 2. Invalid Attribute Key
```json
{
    "attributeBias": {
        "STR": 0.3,
        "DEP": 0.2      // ← Typo: "DEP" instead of "DEX"
    }
}
```
**Result**:
- Invalid key skipped in scoring
- `DEP` not matched to actor ability
- Scoring incomplete
- No error or warning

#### 3. Archetype Status Mismatch
```json
{
    "status": "archived"    // ← Not in enum (active|stub)
}
```
**Result**:
- Archetype loaded but status not validated
- Status filtering in `flattenArchetypes()` only skips non-"active" if includeStubs=false
- May be silently filtered or included depending on caller

#### 4. Missing ID in Recommendations
```json
{
    "talents": ["valid-id-here", "deleted-id-1234"]
}
```
**Result**:
- ID added to recommended list
- At runtime, lookup returns undefined
- Comparison `feat.id === "deleted-id-1234"` fails
- Suggestion silently not applied
- No error logged

#### 5. Compendium Keyword Unresolved
```javascript
// archetype-registry.js:406-409
const match = this._findBestMatch(keyword, index);
if (!match) {
    SWSELogger.debug(`[ArchetypeRegistry] Feat keyword not resolved: "${keyword}"`);  // ← Only debug log
    // Falls through, item not added to results
}
```
**Result**:
- Keyword doesn't resolve to any item
- Silent skip (debug log only)
- Archetype has fewer recommendations than intended
- User unaware

#### 6. AttributeBias Normalization Failure
```javascript
// archetype-registry-integration.js:198-200
const ability = actor.system.attributes?.[attr] || { value: 0 };
const value = ability.value || 0;  // ← Falls to 0 if missing
const normalized = Math.max(0, Math.min(1, (value - 8) / 10));
```
**Result**:
- Missing ability treated as score 0
- Normalization: (0 - 8) / 10 = -0.8 → clamped to 0
- Archetype scoring produces 0 contribution
- No error, appears normal

#### 7. BuildIntent Missing
```javascript
// SuggestionEngine.js:126-135
let buildIntent = options.buildIntent;
if (!buildIntent) {
    try {
        buildIntent = await BuildIntent.analyze(actor, pendingData);
    } catch (err) {
        SWSELogger.warn('SuggestionEngine | Failed to analyze build intent:', err);
        const mentorBiases = actor.system?.swse?.mentorBuildIntentBiases || {};
        buildIntent = mentorBiases && Object.keys(mentorBiases).length > 0
            ? { mentorBiases }
            : null;  // ← Falls to null
    }
}
```
**Result**:
- BuildIntent analysis fails
- Falls back to null (not { mentorBiases })
- All tier 6-3 suggestions depending on buildIntent become unavailable
- No error to user, suggestions just degrade gracefully

#### 8. Archetype Registry Not Initialized
```javascript
// archetype-registry-integration.js:46-48
export async function getPrimaryArchetypeForActor(actor) {
    const archetypes = await getArchetypeRecommendationsForActor(actor);
    if (archetypes.length === 0) {
        return null;  // ← No archetype available
    }
}
```
**Result**:
- Archetype features disabled silently
- Tier 3 subpriority ARCHETYPE_RECOMMENDATION never triggered
- Suggestions still work, just lower quality
- No indication to user

### What Crashes the System

**Very few things actually crash**:

1. **Null dereference in tight loop**:
   ```javascript
   for (const [attr, weight] of Object.entries(attributeBias || {})) {
       const ability = actor.system.attributes?.[attr];
       // If actor.system is undefined: throws
   }
   ```
   - But safe guards with `||` are usually present

2. **Compendium pack fetch times out**:
   - async operation hangs
   - Promise rejection propagates
   - Suggestion engine returns empty array or times out

3. **Circular dependency in prerequisite parsing**:
   - If feat prereqs reference themselves
   - Infinite loop in `_extractPrerequisiteNames()`
   - UI freezes

### What Silently Degrades

- **Most failures result in lower-tier suggestions or no suggestion**
- **No exception thrown, no user alert**
- **Logging only at DEBUG level in many cases**
- **Fallbacks ensure feature never completely breaks**

---

## PHASE 7: STABILITY RISK ASSESSMENT

### Risk Rating: **MODERATE**

#### Vulnerability Areas

| Category | Risk Level | Impact | Evidence |
|----------|-----------|--------|----------|
| Bias key validation | HIGH | Silent scoring corruption | No enum enforcement, unknown keys ignored |
| Attribute key validation | HIGH | Incomplete attribute scoring | Case-sensitive match, no validation |
| ID resolution | MODERATE | Dead recommendations | Keyword fuzzy matching, no error on miss |
| BuildIntent failure | MODERATE | Reduced suggestion quality | Graceful fallback, but no prestige hints |
| Archetype status | LOW | Filtering inconsistency | Ambiguous "stub" handling |
| Prerequisite parsing | LOW | Chain failures | Regex-based extraction, may miss formats |
| Compendium lookups | MODERATE | Async timing issues | Fuzzy matching unreliable, pack not guaranteed to exist |

#### Data Integrity Risks

1. **No schema validation at load time** — Bias keys are freeform
2. **No canonicalization** — Field names vary (prerequisite vs prerequisites)
3. **Keyword to ID mapping is fragile** — Fuzzy matching not deterministic
4. **Silent skips on resolution failures** — No audit trail
5. **Cross-file assumptions** — Engine, registry, and definitions use different structures

#### Operational Risks

1. **Multiple load paths** — Three different ways to load same JSON
2. **Mismatch between expected and actual fields** — `talentKeywords` vs `talents`
3. **No validation pipeline** — Archetypes loaded without checks
4. **Implicit fallbacks everywhere** — Unknown behavior when fields missing
5. **Limited observability** — Most failures are debug-level logs

---

## SUMMARY: DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────┐
│   class-archetypes.json (SSOT)          │
│  ├─ classes[className]                  │
│  └─ archetypes[id]                      │
│     ├─ name, status                     │
│     ├─ mechanicalBias, roleBias         │
│     ├─ attributeBias                    │
│     ├─ talents[], feats[]    ← Item IDs │
│     └─ notes                            │
└─────────────────────────────────────────┘
         │      │          │
         │      │          └──→ ArchetypeDefinitions.js
         │      │               (ES6 import, legacy map)
         │      │
         │      └──→ ArchetypeAffinityEngine.js
         │           (fetch, validate, affinity scoring)
         │
         └──→ ArchetypeRegistry.js
              (fetch, parse, immutable cache)
                    │
                    └──→ _parseJSONArchetype()
                         │
                         ├─ Extract roles from roleBias
                         ├─ Extract attributes from attributeBias
                         ├─ Store talents/feats as keywords ← MISMATCH!
                         └─ Cache in Map by className-id
                              │
                              └──→ resolveFeatKeywords() → keyword→ID
                              └──→ resolveTalentKeywords() → keyword→ID
                                   │
                                   └──→ getResolvedRecommendations()
                                        (returns item IDs)
                                        │
                                        └──→ SuggestionEngine._evaluateFeat()
                                             │
                                             ├─ Check archetype recommendation
                                             │  (feat.id in recommendedIds)
                                             ├─ Check mentor bias match
                                             ├─ Check skill prerequisite
                                             └─ Assign Tier + Confidence
                                                  │
                                                  └──→ Return { tier, reason, confidence }
```

---

## KEY FINDINGS

### Current State
1. **Archetype system is working** but not fully utilized
2. **mechanicalBias exists but is unused** — never consumed in scoring
3. **roleBias is only used for role extraction**, not for weighting
4. **attributeBias is THE dominant factor** in archetype matching
5. **Keyword resolution is fuzzy and unreliable**

### Data Integrity Issues
1. **Schema mismatch**: JSON has `talents`/`feats`, code expects `talentKeywords`/`featKeywords`
2. **Enum violation**: No validation that bias keys match canonical set
3. **Silent failures**: Unknown keys, missing fields, unresolved keywords — all silently skipped
4. **Multiple load paths**: Three different ways to load same JSON, different handling

### Scoring Characteristics
1. **Deterministic** — Same input = same output
2. **Tier-based** — Not continuous numeric scoring
3. **First-match-wins** — Returns on first tier match (except Tier 3)
4. **Confidence is tier-based** — Not dynamic
5. **Attribute-dominant** — Primary archetype match only uses attributeBias

---

## READY FOR EVOLUTION

This audit establishes the **ground-truth contract** of the engine as it currently exists.

Safe to proceed with:
- Schema formalization (enforce canonical enums)
- Validation at load time (catch corruption early)
- Tag-based evolution (additive, non-breaking)
- Bias integration (use mechanicalBias and roleBias in scoring)
- Hybrid approaches (preserve ID arrays, add tags)

**All changes should be based on this actual behavior, not assumptions.**

---

**Report Complete**
No modifications made during audit.
Ready for next phase: Architecture decisions based on truth.

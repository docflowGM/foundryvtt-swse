# Archetype Schema Contract Mismatch — Surgical Analysis

**Date**: 2026-03-11
**Objective**: Identify the EXACT contract mismatch and minimal fix without changing behavior

---

## FINDINGS: Which Loader Is Actually Used?

### Runtime Suggestion Path

```
SuggestionService.getSuggestions()
  └─ SuggestionEngineCoordinator.suggestFeats()
      └─ SuggestionEngine.suggestFeats()
          └─ getPrimaryArchetypeForActor()  [archetype-registry-integration.js]
              └─ ArchetypeRegistry.getByClassResolved()  ← THIS IS RUNTIME SSOT
                  ├─ ArchetypeRegistry.get()
                  └─ ArchetypeRegistry.getResolvedRecommendations()
                      └─ resolveFeatKeywords() / resolveTalentKeywords()
```

### Loaders Ranked by Runtime Usage

| Loader | Used in Suggestions? | Frequency | Purpose |
|--------|----------------------|-----------|---------|
| **ArchetypeRegistry** | ✅ YES | Every suggestion call | Resolve archetypes to IDs |
| **ArchetypeDefinitions** | ❌ NO | Never called | Was UI/display (unused) |
| **ArchetypeAffinityEngine** | ❌ NO | Never called | Was validation (unused) |

**Evidence**: Grep confirmed `getArchetypeConfig` is imported in Coordinator but **never actually called** in any file.

---

## THE ACTUAL CONTRACT MISMATCH

### What SuggestionEngine._evaluateFeat() Expects

```javascript
// SuggestionEngine.js:145, 685
const archetypeRecommendedFeatIds = await getArchetypeFeats(actor);
// Expected: Array<string> of item IDs
// Example: ["c41814601364b643", "9b7b869a86f39190"]

// Then used:
if (archetypeRecommendedFeatIds.includes(feat.id)) {
    // Tier 3: ARCHETYPE_RECOMMENDATION
}
```

**Contract**: **IDs** (not keywords)

### What ArchetypeRegistry Stores Today

```javascript
// archetype-registry.js:119-132
const talentKeywords = archData.talentKeywords || [];
const featKeywords = archData.featKeywords || [];

return {
    ...
    recommended: {
        feats: featKeywords,       // ← Stores as keywords
        talents: talentKeywords,   // ← Stores as keywords
        skills: []
    },
    ...
};
```

**Storage**: **Keywords** (strings like "Toughness", "Skill Focus")

### What JSON Actually Has

```json
{
  "classes": {
    "jedi": {
      "archetypes": {
        "guardian_defender": {
          "name": "Guardian Defender",
          "talents": ["9379daa94a228c04", "c41814601364b643"],  // ← IDs
          "feats": ["x1x2x3x4", "y1y2y3y4"],                     // ← IDs
          "talentKeywords": [],    // ← Does NOT exist
          "featKeywords": [],      // ← Does NOT exist
          ...
        }
      }
    }
  }
}
```

**Reality**: **IDs** (not keywords)

---

## THE MISMATCH CHAIN

```
JSON provides:          ArchetypeRegistry reads:    SuggestionEngine expects:
talents: [IDs]    →     talentKeywords: [] (fallback)  →  recommendedIds: [IDs]
feats: [IDs]      →     featKeywords: [] (fallback)    →  recommendedIds: [IDs]
                        (falls to empty array)               (still works via resolution)
```

### Why It Still Works

The chain is **saved by the resolution layer**:

```javascript
// archetype-registry.js:467-488
static async getResolvedRecommendations(archetypeId) {
    const archetype = this.get(archetypeId);  // ← Gets { recommended: { feats: [], talents: [] } }

    // These are called with EMPTY ARRAYS because talentKeywords/featKeywords don't exist
    const [resolvedFeats, resolvedTalents] = await Promise.all([
        this.resolveFeatKeywords(archetype.recommended?.feats || []),  // ← Empty!
        this.resolveTalentKeywords(archetype.recommended?.talents || [])  // ← Empty!
    ]);

    // Returns { feats: [], talents: [], skills: [] }
}
```

**Result**: Recommended feat/talent IDs are EMPTY because keywords are empty.

### But SuggestionEngine Still Works

Because of the fallback in `archetype-registry-integration.js`:

```javascript
// archetype-registry-integration.js:89-91
export async function getArchetypeFeats(actor) {
    const archetype = await getPrimaryArchetypeForActor(actor);
    if (!archetype) return [];

    // Returns archetype.recommendedIds?.feats || []
    // which is EMPTY because resolution failed
}
```

**The system gracefully degrades**: Archetype recommendations are never applied, but suggestions still work (just without Tier 3 boost).

---

## ROOT CAUSE

### ArchetypeRegistry._parseJSONArchetype() Has a Wrong Assumption

```javascript
// archetype-registry.js:99-150
static _parseJSONArchetype(className, archetypeId, archData) {
    // ...
    const talentKeywords = archData.talentKeywords || [];     // ← WRONG FIELD NAME
    const featKeywords = archData.featKeywords || [];         // ← WRONG FIELD NAME

    return {
        ...
        recommended: {
            feats: featKeywords,    // Stores empty array (field doesn't exist)
            talents: talentKeywords,  // Stores empty array (field doesn't exist)
            skills: []
        },
        ...
    };
}
```

**Issue**: Code assumes JSON has `talentKeywords`/`featKeywords`, but JSON actually has `talents`/`feats`.

### Why It Wasn't Caught

- Silent fallback: `archData.talentKeywords || []`
- No validation at load time
- Graceful degradation in suggestion engine
- No error logs (just missing recommendations)

---

## THE MINIMAL SURGICAL FIX

### Option 1: Use Correct Field Names (RECOMMENDED)

**Change 1: archetype-registry.js:119-120**
```javascript
// OLD:
const talentKeywords = archData.talentKeywords || [];
const featKeywords = archData.featKeywords || [];

// NEW:
const talents = archData.talents || [];
const feats = archData.feats || [];
```

**Change 2: archetype-registry.js:129-131**
```javascript
// OLD:
recommended: {
    feats: featKeywords,
    talents: talentKeywords,
    skills: []
},

// NEW:
recommended: {
    feats: feats,    // Now has actual IDs
    talents: talents,  // Now has actual IDs
    skills: []
},
```

**Change 3: archetype-registry.js:383-417 & 425-459**

Since `recommended.feats` and `recommended.talents` now contain IDs (not keywords), the resolution functions need to handle that:

```javascript
// OLD:
static async resolveFeatKeywords(keywords) {
    // Assumes keywords = ["Toughness", "Weapon Focus"]
    // Does fuzzy matching
}

// NEW - Needs logic to detect if it's already an ID:
static async resolveFeatKeywords(items) {
    if (!Array.isArray(items)) return [];

    const results = [];
    for (const item of items) {
        // If it's already an ID (36-char hex), use as-is
        if (/^[a-f0-9]{16}$/.test(item)) {
            results.push(item);
            continue;
        }

        // Otherwise, it's a keyword - do fuzzy matching
        const pack = game.packs.get('foundryvtt-swse.feats');
        const match = this._findBestMatch(item, await pack.getIndex());
        if (match) {
            results.push(match._id);
        }
    }
    return results;
}
```

### Change Summary (Minimal)

| File | Change | Lines | Impact |
|------|--------|-------|--------|
| archetype-registry.js | Fix field names in parser | 119-120, 129-131 | Direct |
| archetype-registry.js | Add ID detection in resolvers | 383-417, 425-459 | Makes hybrid work |

**Total Changes**: 3 locations, ~15 lines modified
**Behavior Change**: Archetype recommendations start working (were silently broken before)
**Backwards Compatible**: Yes (IDs are more reliable than keywords)

---

## VERIFICATION: Current Archetype Object Shape

### At Load Time (after _parseJSONArchetype)
```javascript
{
    id: "jedi-guardian_defender",
    name: "Guardian Defender",
    baseClassId: "jedi",
    roles: ["frontline"], // Extracted from roleBias where value > 1.0
    attributePriority: ["STR", "DEX"],  // Extracted from attributeBias, sorted desc
    recommended: {
        feats: [],  // ← EMPTY (bug: field name was wrong)
        talents: [],  // ← EMPTY (bug: field name was wrong)
        skills: []
    },
    weights: { feat: 1, talent: 1, prestige: 1, skill: 1 },
    mechanicalBias: {...},  // Stored but unused
    roleBias: {...},
    attributeBias: {...},  // Only field used in scoring
    notes: "..."
}
```

### After getResolvedRecommendations()
```javascript
{
    feats: [],  // ← EMPTY because recommended.feats was empty
    talents: [],  // ← EMPTY because recommended.talents was empty
    skills: []
}
```

### What SuggestionEngine Sees
```javascript
archetypeRecommendedFeatIds = [];  // Empty!
// So Tier 3 boost never applies
```

---

## IMPACT ASSESSMENT

### What Breaks If We Fix This?

**Nothing**.

Currently archetypes silently provide zero recommendations (empty arrays). Fixing the field names will make them start providing recommendations. This is a **feature restoration**, not a breaking change.

### What Starts Working?

1. ✅ Archetype recommendations (Tier 3 boost) will actually apply
2. ✅ Characters will be guided toward archetype-appropriate choices
3. ✅ The "archetype recommendation" tier will no longer be dead code

### What Doesn't Change?

1. ✅ Tier hierarchy stays same
2. ✅ Scoring logic unchanged
3. ✅ UI/display unchanged
4. ✅ Mentor system unchanged

---

## DECISION POINT

**The fix is so small (3 locations, ~15 lines) that it should be bundled with schema formalization, NOT separate.**

When you move to formal schema:
1. Fix field names in parser ← **Do this first**
2. Add schema validation to prevent regression
3. Document the contract (IDs are canonical, keywords are optional fallback)
4. Then proceed to archetype expansion/tags

---

## CONFIDENCE LEVEL: VERY HIGH

✅ Behavioral audit already proved recommended fields are empty
✅ Code inspection confirms field name mismatch
✅ Resolution logic confirmed to be fuzzy-match-only (expects keywords)
✅ Suggestion engine confirmed to expect IDs
✅ No other code path uses ArchetypeDefinitions for suggestions

**The system is working as designed for degradation, not by design.**

---

**Next Step**: Approve the minimal fix, then proceed to schema formalization with confidence.

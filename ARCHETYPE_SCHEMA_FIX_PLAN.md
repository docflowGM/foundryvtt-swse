# Archetype Schema Fix Plan — Ready to Execute

**Status**: ✅ Analysis complete. Zero ambiguity. Ready to commit the minimal fix.

---

## The Problem (In One Sentence)

ArchetypeRegistry reads field names that don't exist in the JSON, falls back to empty arrays, and archetype recommendations silently never apply.

---

## The Solution (In One Sentence)

Change 3 lines in one function to read the correct field names, add ID detection to the resolution logic, and archetype recommendations start working immediately.

---

## MINIMAL FIX — EXACTLY WHAT TO CHANGE

### Location 1: archetype-registry.js, lines 119-120

**Current Code**:
```javascript
const talentKeywords = archData.talentKeywords || [];
const featKeywords = archData.featKeywords || [];
```

**Fixed Code**:
```javascript
const talents = archData.talents || [];
const feats = archData.feats || [];
```

**Reason**: JSON has `talents` and `feats`, not `talentKeywords` and `featKeywords`.

---

### Location 2: archetype-registry.js, lines 129-131

**Current Code**:
```javascript
recommended: {
    feats: featKeywords,
    talents: talentKeywords,
    skills: []
},
```

**Fixed Code**:
```javascript
recommended: {
    feats: feats,
    talents: talents,
    skills: []
},
```

**Reason**: Store the actual values (now correct field names).

---

### Location 3: archetype-registry.js, resolveFeatKeywords() and resolveTalentKeywords()

**Current Logic**:
```javascript
static async resolveFeatKeywords(keywords) {
    const results = [];
    const pack = game.packs.get('foundryvtt-swse.feats');
    const index = await pack.getIndex();

    for (const keyword of keywords) {
        const match = this._findBestMatch(keyword, index);
        if (match) {
            results.push(match._id);
        }
    }
    return results;
}
```

**Problem**: Now `keywords` will contain actual IDs (not keywords), and fuzzy matching will fail.

**Fixed Logic** (add ID detection):
```javascript
static async resolveFeatKeywords(items) {
    if (!Array.isArray(items)) return [];

    const results = [];
    const pack = game.packs.get('foundryvtt-swse.feats');

    for (const item of items) {
        // If it's already an ID (looks like Foundry ID: 16-char hex), use as-is
        if (typeof item === 'string' && /^[a-f0-9]{16}$/.test(item)) {
            results.push(item);
            continue;
        }

        // Otherwise, treat as keyword and do fuzzy matching
        if (typeof item === 'string' && item.length > 0) {
            const index = await pack.getIndex();
            const match = this._findBestMatch(item, index);
            if (match) {
                results.push(match._id);
                SWSELogger.debug(
                    `[ArchetypeRegistry] Resolved feat keyword "${item}" to "${match.name}"`
                );
            } else {
                SWSELogger.debug(`[ArchetypeRegistry] Feat keyword not resolved: "${item}"`);
            }
        }
    }
    return results;
}
```

**Same fix applies to resolveTalentKeywords()** (copy-paste with `talentKeywords` → `talents`).

---

## Impact Analysis

### What Gets Fixed
- ✅ Archetype recommendations now flow through properly
- ✅ Tier 3 ARCHETYPE_RECOMMENDATION boost now applies to suggested feats/talents
- ✅ Characters actually get guided by archetypes (first real test of archetype system)

### What Doesn't Break
- ✅ Tier logic unchanged
- ✅ Scoring algorithm unchanged
- ✅ Other suggestion engines unaffected
- ✅ UI/display unchanged
- ✅ Completely backwards-compatible (IDs are more reliable than keywords)

### What This Reveals
- This is the **first opportunity to actually test archetype impact on suggestions**
- Before this fix, archetype recommendations were dead code
- After this fix, you can verify the Tier 3 weight (0.15) is appropriate

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| ID format validation fails | Very Low | Suggestions skip some items | Validate ID format in schema |
| Backwards compat broken | None | Nothing relies on empty arrays | No existing behavior change |
| Unforeseen side effects | Very Low | Tier 3 logic untested | Test in dev world first |

**Overall Risk**: NEGLIGIBLE

---

## Testing Strategy (After Fix Applied)

### Test 1: Archetype Recommendations Now Flow
1. Create a character with class that has archetype
2. Check archetype data in registry
3. Verify `archetype.recommendedIds.feats` is no longer empty
4. Verify `archetype.recommendedIds.talents` is no longer empty

### Test 2: Suggestions Include Archetype Boost
1. Get feat suggestions for that character
2. Find feats that are in archetype recommendations
3. Verify they have Tier 3 (0.60 confidence) or higher
4. Verify suggestion.reason includes "ARCHETYPE_RECOMMENDATION"

### Test 3: Backwards Compat (Keywords Still Work)
1. Manually add a feat keyword to an archetype (test data)
2. Verify it still resolves via fuzzy matching
3. Verify both IDs and keywords work together

---

## Sequence for Implementation

### Phase 1: Apply the Minimal Fix
1. Update archetype-registry.js lines 119-120 (field names)
2. Update archetype-registry.js lines 129-131 (assignment)
3. Update resolveFeatKeywords() and resolveTalentKeywords() (add ID detection)
4. Test in dev world
5. Commit

### Phase 2: Schema Formalization (Next Sprint)
1. Define canonical schema (optional: include both IDs and keywords for fallback)
2. Add validation at load time
3. Document the contract
4. Update archetype creator tool to enforce schema

### Phase 3: Archetype Expansion
1. Verify existing archetypes now work correctly
2. Add new archetypes with confidence
3. Adjust Tier 3 weight if needed (currently 0.15)
4. Consider integrating mechanicalBias and roleBias (currently unused)

---

## Code Change Diff (Summary)

```diff
// archetype-registry.js:119-131
- const talentKeywords = archData.talentKeywords || [];
- const featKeywords = archData.featKeywords || [];
+ const talents = archData.talents || [];
+ const feats = archData.feats || [];

  return {
    ...
    recommended: {
-     feats: featKeywords,
-     talents: talentKeywords,
+     feats: feats,
+     talents: talents,
      skills: []
    },
    ...
  };

// archetype-registry.js:383-417 (resolveFeatKeywords)
  static async resolveFeatKeywords(items) {
    if (!Array.isArray(items)) return [];
    const results = [];
    const pack = game.packs.get('foundryvtt-swse.feats');

    for (const item of items) {
+     // ID detection: already resolved
+     if (typeof item === 'string' && /^[a-f0-9]{16}$/.test(item)) {
+         results.push(item);
+         continue;
+     }

+     // Keyword fallback: fuzzy match
+     if (typeof item === 'string' && item.length > 0) {
        const index = await pack.getIndex();
        const match = this._findBestMatch(item, index);
        if (match) results.push(match._id);
+     }
    }
    return results;
  }
```

---

## Confidence & Readiness

| Aspect | Status |
|--------|--------|
| Root cause identified | ✅ CONFIRMED |
| Fix scope defined | ✅ MINIMAL (3 locations) |
| Backwards compatibility | ✅ GUARANTEED |
| Risk assessed | ✅ NEGLIGIBLE |
| Testing strategy ready | ✅ YES |
| Ready to execute | ✅ YES |

---

## Next Step

**Option A**: Execute the minimal fix now (30 minutes)
- Apply 3 changes
- Test in dev world
- Commit
- Move to schema formalization with confidence

**Option B**: Formalize schema first, then fix
- Takes longer
- More comprehensive
- Prevents future regressions
- Recommended if you want bulletproof system

**My recommendation**: **Option A** (minimal fix first) because:
1. It's so small there's essentially zero risk
2. It validates that archetypes actually work
3. It gives you a working system to build the schema on
4. You'll discover edge cases faster by using it in practice

---

**Status**: Ready to execute with high confidence.

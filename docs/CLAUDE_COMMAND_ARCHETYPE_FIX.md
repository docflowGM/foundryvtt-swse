# Claude Command: Execute Minimal Archetype Contract Fix

**Specification Level**: Architecture-ready, execution-safe
**Scope**: Surgical correctness patch only
**Risk**: Negligible
**Estimated Effort**: 30-45 minutes

---

## OBJECTIVE

Restore archetype recommendations in the suggestion engine by fixing the field-name contract mismatch in ArchetypeRegistry. Currently `recommended.feats` and `recommended.talents` are always empty arrays, causing Tier 3 ARCHETYPE_RECOMMENDATION suggestions to never apply.

After this patch: Archetype recommendations work. Characters are guided by archetypes. Nothing else changes.

---

## GROUND TRUTH (Do Not Challenge)

✅ **Behavioral audit confirmed**:
- Runtime uses: `ArchetypeRegistry.getByClassResolved()`
- Expected data: Item IDs in `recommended.feats` and `recommended.talents`
- Actual data: Empty arrays (field names are wrong)
- SuggestionEngine expects: IDs for `archetypeRecommendedFeatIds.includes(feat.id)` check

✅ **Root cause identified**:
- JSON provides: `feats: [IDs]`, `talents: [IDs]`
- Code reads: `featKeywords`, `talentKeywords` (fallback to empty)
- Result: Empty arrays at runtime

✅ **No ambiguity**: This is correctness-only, not redesign.

---

## EXECUTION PLAN

### PHASE 1: Fix Parser Field Names

**File**: `/scripts/engine/archetype/archetype-registry.js`
**Function**: `_parseJSONArchetype(className, archetypeId, archData)`
**Lines**: ~119-145

**Change 1: Read canonical fields with fallback**

Find this code:
```javascript
const talentKeywords = archData.talentKeywords || [];
const featKeywords = archData.featKeywords || [];
```

Replace with (preserves legacy keyword support, reads canonical IDs first):
```javascript
const talents = archData.talents ?? archData.talentKeywords ?? [];
const feats = archData.feats ?? archData.featKeywords ?? [];
```

**Change 2: Store into recommended**

Find this code in the return object:
```javascript
recommended: {
    feats: featKeywords,
    talents: talentKeywords,
    skills: []
},
```

Replace with:
```javascript
recommended: {
    feats: feats,
    talents: talents,
    skills: []
},
```

**Why**: Now reads the correct canonical fields (feats/talents), with fallback to legacy keywords.

---

### PHASE 2: Make Resolvers Hybrid (IDs + Keywords)

**File**: `/scripts/engine/archetype/archetype-registry.js`
**Functions**:
- `resolveFeatKeywords(items)`
- `resolveTalentKeywords(items)`

**Current behavior**: Assumes all entries are keyword strings, does fuzzy matching.
**New behavior**: Detects if entry is already an ID, passes through; otherwise fuzzy-matches.

**Implementation**:

Replace `resolveFeatKeywords()` body with:
```javascript
static async resolveFeatKeywords(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    const results = [];
    const seenIds = new Set();
    const pack = game.packs.get('foundryvtt-swse.feats');

    if (!pack) {
        SWSELogger.warn('[ArchetypeRegistry] Feats compendium not found');
        return [];
    }

    let index = null;
    const needsIndex = items.some(item => {
        const isId = typeof item === 'string' && /^[A-Za-z0-9]{16}$/.test(item);
        return !isId;
    });

    if (needsIndex) {
        try {
            index = await pack.getIndex();
        } catch (err) {
            SWSELogger.warn('[ArchetypeRegistry] Failed to get feats index:', err);
            index = [];
        }
    }

    for (const item of items) {
        // Skip falsy entries
        if (!item) continue;

        // If it's already a Foundry ID (16-char alphanumeric), use as-is
        const isId = typeof item === 'string' && /^[A-Za-z0-9]{16}$/.test(item);

        if (isId) {
            if (!seenIds.has(item)) {
                results.push(item);
                seenIds.add(item);
            }
            continue;
        }

        // Otherwise treat as keyword and fuzzy-match
        if (typeof item === 'string' && item.trim().length > 0 && index) {
            const match = this._findBestMatch(item, index);
            if (match && !seenIds.has(match._id)) {
                results.push(match._id);
                seenIds.add(match._id);
                SWSELogger.debug(
                    `[ArchetypeRegistry] Resolved feat keyword "${item}" to "${match.name}"`
                );
            } else if (!match) {
                SWSELogger.debug(`[ArchetypeRegistry] Feat keyword not resolved: "${item}"`);
            }
        }
    }

    return results;
}
```

**Replace `resolveTalentKeywords()` body identically**, changing only:
- `game.packs.get('foundryvtt-swse.feats')` → `game.packs.get('foundryvtt-swse.talents')`
- `"Feats compendium"` → `"Talents compendium"`
- `"feat keyword"` / `"Feat keyword"` → `"talent keyword"` / `"Talent keyword"`

**Why**:
- IDs pass through unchanged (they're already resolved)
- Keywords still fuzzy-match (backwards compatible)
- Deduplication prevents duplicate recommendations
- Index loaded only if keywords present (efficiency)

---

## FORBIDDEN CHANGES (Explicit Non-Scope)

❌ Do NOT change tier weights
❌ Do NOT change archetype matching logic (attribute bias scoring)
❌ Do NOT add tags or metadata fields
❌ Do NOT add schema validation
❌ Do NOT modify JSON files
❌ Do NOT touch ArchetypeDefinitions.js or ArchetypeAffinityEngine.js
❌ Do NOT refactor anything else

This is **correctness-only**: restore the intended data flow.

---

## DELIVERABLES REQUIRED

### 1. Unified Diff
Show exact changes in standard diff format, clearly labeled with function names.

### 2. Files Changed
Should be exactly **one file**:
- `/scripts/engine/archetype/archetype-registry.js`

### 3. Explanation Note
Provide a concise note covering:
- What was broken: "Field names in parser didn't match JSON structure"
- Why it happened: "Silent fallback to empty arrays, no error thrown"
- What fixes it: "Read correct canonical fields, add ID detection to resolvers"
- Why safe: "Completely backwards-compatible, no behavior change except restoration of feature"

### 4. Manual Test Checklist
After patch is applied, verify:
- [ ] Load a character with a class that has defined archetypes
- [ ] Call `ArchetypeRegistry.getByClassResolved(baseClassId)`
- [ ] For the primary archetype, inspect `archetype.recommendedIds.feats` — should NOT be empty
- [ ] Inspect `archetype.recommendedIds.talents` — should NOT be empty
- [ ] Get feat suggestions for that character
- [ ] Find a feat that is in the archetype's recommended list
- [ ] Verify that feat has `suggestion.tier >= 3` (ARCHETYPE_RECOMMENDATION or higher)
- [ ] Verify `suggestion.reason` or `suggestion.sourceId` references the archetype

---

## ARCHITECTURAL FOLLOW-UP (Post-Patch)

Once this lands and is verified working:

**Phase 2: Schema Validation** (Next)
- Add `validateArchetypeJSON()` at registry load time
- Ensure feats/talents are always arrays
- Log warnings for unexpected field names

**Phase 3: Metadata/Tags** (Future)
- Archetype features ready for tags/roles/ability-bias integration
- Can now safely evolve without breaking working recommendations

This patch unblocks all future work.

---

## CONFIDENCE & READINESS

| Aspect | Status |
|--------|--------|
| Root cause confirmed | ✅ YES |
| Fix scope defined | ✅ YES |
| Backwards compatible | ✅ YES |
| No other code affected | ✅ YES |
| Test strategy provided | ✅ YES |
| Ready to execute | ✅ YES |

---

## EXECUTION CHECKLIST (For Claude)

- [ ] Read this specification end-to-end
- [ ] Locate archetype-registry.js
- [ ] Apply Change 1 (field names)
- [ ] Apply Change 2 (store assignment)
- [ ] Apply Phase 2 (resolver functions)
- [ ] Generate unified diff
- [ ] Create explanation note
- [ ] Verify no other files touched
- [ ] Commit with clear message
- [ ] Push to branch
- [ ] Return deliverables

**Do not proceed with manual testing**; that's the user's responsibility in their dev world. Just provide the code + checklist.

---

**Ready to hand to execution.**

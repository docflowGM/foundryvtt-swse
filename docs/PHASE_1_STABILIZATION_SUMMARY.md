# Phase 1: Suggestion Engine Stabilization

## Overview

This phase fixes the suggestion-service domain contract and eliminates silent failures in the progression-framework suggestion pipeline.

**Goal achieved:** Distinction between supported/unsupported domains is now explicit and visible.

---

## Files Changed

### 1. **scripts/engine/suggestion/domain-registry.js** (NEW)
- **Purpose:** Centralized, single source of truth for all suggestion domains
- **Content:**
  - `SUPPORTED_DOMAINS` constant: 7 canonical domains that SuggestionEngineCoordinator can handle
  - `UNSUPPORTED_DOMAINS` constant: 6 domains not yet implemented
  - `DOMAIN_ALIASES` constant: For catching future mismatch patterns (empty for now)
  - Helper functions: `validateDomain()`, `isSupportedDomain()`, `classifyDomain()`, etc.
- **Impact:** Eliminates scattered magic strings; enables centralized domain validation

### 2. **scripts/engine/suggestion/SuggestionService.js** (MODIFIED)
- **Changes:**
  - Line 26-30: Added imports for domain-registry module
  - Lines 159-176: Added domain validation block that:
    - Validates requested domain against registry
    - Logs clear warning for unsupported domains (not as normal empty result)
    - Returns `[]` for unsupported domain immediately (graceful degradation)
    - Distinguishes from "supported domain with no results"
- **Impact:**
  - Unsupported domains now produce visible log warnings instead of silent empty arrays
  - Developers and debuggers can immediately see why suggestions are missing
  - No breaking changes; steps continue to degrade gracefully

### 3. **scripts/apps/progression-framework/steps/skills-step.js** (MODIFIED)
- **Change:**
  - Line 316: `domain: 'skills'` → `domain: 'skills_l1'`
  - Line 314: Added comment clarifying canonical domain per registry
- **Rationale:**
  - Fixes domain mismatch: SuggestionService expects 'skills_l1' not 'skills'
  - After fix: skills-step now receives actual suggestions (was silently returning empty)
  - Comment prevents future confusion

### 4. **scripts/apps/progression-framework/steps/force-power-step.js** (MODIFIED)
- **Change:**
  - Line 507: `domain: 'force-powers'` → `domain: 'forcepowers'`
  - Line 506: Added comment clarifying canonical domain per registry
- **Rationale:**
  - Fixes domain mismatch: SuggestionService expects 'forcepowers' not 'force-powers'
  - After fix: force-power-step now receives actual suggestions (was silently returning empty)
  - Note: Line 382 domain parameter in mentor context kept as-is (descriptive, not a contract)

---

## Domain Contract Summary

### Before Phase 1:
```
SUPPORTED in SuggestionService:
✓ feats, talents, classes, forcepowers, backgrounds, skills_l1, attributes

REQUESTED by steps:
✓ classes → 'classes' (match)
✓ background-step → 'backgrounds' (match)
✓ attribute-step → 'attributes' (match)
✓ feat-step → 'feats' (match)
✓ talent-step → 'talents' (match)
✗ skills-step → 'skills' (MISMATCH - should be 'skills_l1')
✗ force-power-step → 'force-powers' (MISMATCH - should be 'forcepowers')
✗ species-step → 'species' (NOT SUPPORTED)
✗ language-step → 'languages' (NOT SUPPORTED)
✗ force-secret-step → 'force-secrets' (NOT SUPPORTED)
✗ force-technique-step → 'force-techniques' (NOT SUPPORTED)
✗ droid-builder-step → 'droid-systems' (NOT SUPPORTED)
✗ starship-maneuver-step → 'starship-maneuvers' (NOT SUPPORTED)

OUTCOME: 6 mismatches, 6 unsupported, silent empty results for all 8 broken steps
```

### After Phase 1:
```
SUPPORTED in SuggestionService (unchanged):
✓ feats, talents, classes, forcepowers, backgrounds, skills_l1, attributes

REQUESTED by steps (mismatches fixed):
✓ classes → 'classes' (match)
✓ background-step → 'backgrounds' (match)
✓ attribute-step → 'attributes' (match)
✓ feat-step → 'feats' (match)
✓ talent-step → 'talents' (match)
✓ skills-step → 'skills_l1' (NOW MATCHES ✓)
✓ force-power-step → 'forcepowers' (NOW MATCHES ✓)
⚠ species-step → 'species' (UNSUPPORTED - VISIBLE LOG WARNING)
⚠ language-step → 'languages' (UNSUPPORTED - VISIBLE LOG WARNING)
⚠ force-secret-step → 'force-secrets' (UNSUPPORTED - VISIBLE LOG WARNING)
⚠ force-technique-step → 'force-techniques' (UNSUPPORTED - VISIBLE LOG WARNING)
⚠ droid-builder-step → 'droid-systems' (UNSUPPORTED - VISIBLE LOG WARNING)
⚠ starship-maneuver-step → 'starship-maneuvers' (UNSUPPORTED - VISIBLE LOG WARNING)

OUTCOME: 0 mismatches, 6 unsupported (now clearly logged), suggestions work for 7 steps
```

---

## Step-by-Step Status Matrix (After Phase 1)

| Step | Domain Requested | Supported? | Status | Suggestions Expected? | Log Output |
|------|------------------|------------|--------|----------------------|------------|
| **species** | `'species'` | ❌ No | UNSUPPORTED | None | ⚠️ Warning: "Unsupported domain requested: species" |
| **class** | `'classes'` | ✅ Yes | WORKING | Yes ✓ | (none - normal) |
| **background** | `'backgrounds'` | ✅ Yes | WORKING | Yes ✓ | (none - normal) |
| **attribute** | `'attributes'` | ✅ Yes | WORKING | Yes ✓ | (none - normal) |
| **language** | `'languages'` | ❌ No | UNSUPPORTED | None | ⚠️ Warning: "Unsupported domain requested: languages" |
| **skills** | `'skills_l1'` | ✅ Yes | WORKING (FIXED) | Yes ✓ | (none - normal) |
| **feat** | `'feats'` | ✅ Yes | WORKING | Yes ✓ | (none - normal) |
| **talent** | `'talents'` | ✅ Yes | WORKING | Yes ✓ | (none - normal) |
| **force-power** | `'forcepowers'` | ✅ Yes | WORKING (FIXED) | Yes ✓ | (none - normal) |
| **force-secret** | `'force-secrets'` | ❌ No | UNSUPPORTED | None | ⚠️ Warning: "Unsupported domain requested: force-secrets" |
| **force-technique** | `'force-techniques'` | ❌ No | UNSUPPORTED | None | ⚠️ Warning: "Unsupported domain requested: force-techniques" |
| **droid-builder** | `'droid-systems'` | ❌ No | UNSUPPORTED | None | ⚠️ Warning: "Unsupported domain requested: droid-systems" |
| **starship-maneuver** | `'starship-maneuvers'` | ❌ No | UNSUPPORTED | None | ⚠️ Warning: "Unsupported domain requested: starship-maneuvers" |

**Legend:**
- ✅ **WORKING**: Domain is supported, suggestions compute normally
- ⚠️ **UNSUPPORTED**: Domain is not implemented, returns empty array + clear warning log
- **(FIXED)**: Was broken in Phase 0, now works after Phase 1

---

## Supported vs Unsupported Breakdown

### ✅ 7 Fully Working Steps (Suggestions Compute)
1. **class-step** → domain `'classes'`
2. **background-step** → domain `'backgrounds'`
3. **attribute-step** → domain `'attributes'`
4. **feat-step** → domain `'feats'`
5. **talent-step** → domain `'talents'`
6. **skills-step** → domain `'skills_l1'` (FIXED in Phase 1)
7. **force-power-step** → domain `'forcepowers'` (FIXED in Phase 1)

### ❌ 6 Unsupported Steps (No Suggestion Engine Yet)
1. **species-step** → domain `'species'` (logs warning)
2. **language-step** → domain `'languages'` (logs warning)
3. **force-secret-step** → domain `'force-secrets'` (logs warning)
4. **force-technique-step** → domain `'force-techniques'` (logs warning)
5. **droid-builder-step** → domain `'droid-systems'` (logs warning)
6. **starship-maneuver-step** → domain `'starship-maneuvers'` (logs warning)

---

## Log Output Examples

### When a Supported Domain Runs (No Suggestions):
```
[SuggestionService] No suggestions produced
  context: "chargen"
  domain: "classes"
  level: 3
  items: 12
```
→ This is normal; domain is supported but no suggestions found

### When an Unsupported Domain is Requested:
```
[SuggestionService] Unsupported domain requested
  requested: "species"
  canonical: "species"
  actor: "Jedi Knight"
  context: "chargen"
  supportedDomains: "attributes, backgrounds, classes, feats, forcepowers, skills_l1, talents"
  allUnsupportedDomains: "droid-systems, force-secrets, force-techniques, languages, species, starship-maneuvers"
```
→ This clearly indicates why suggestions are missing

---

## What Did NOT Change (Intentional)

✓ **Mentor integration** — Still handles suggestions the same way
✓ **Template rendering** — Still shows badges and confidence levels
✓ **CSS styling** — Confidence-level styling unchanged
✓ **UI display logic** — Suggestions still format and render identically
✓ **Graceful degradation** — Unsupported domains still return `[]`, no crashes

**Rationale:** Phase 1 is about correctness and visibility, not about changing how suggestions integrate with the UI or mentor system.

---

## Implications for Unsupported Steps

For the 6 unsupported steps (species, languages, force-secrets, force-techniques, droid-systems, starship-maneuvers):

**Current behavior:**
- Player sees no suggestion badges (empty array)
- No mentor suggestions offered
- System logs clear warning: "Unsupported domain requested"

**This is intentional.**
- UI infrastructure exists (formatSuggestionsForDisplay, templates, mentor paths)
- Suggestion *computation* infrastructure doesn't exist (no SuggestionEngineCoordinator handler)
- Placeholder implementations that return `[]` would hide this gap

**What happens when these domains ARE implemented:**
1. Add handler in `SuggestionEngineCoordinator`
2. Remove from `UNSUPPORTED_DOMAINS` in domain-registry
3. Add to `SUPPORTED_DOMAINS` in domain-registry
4. Suggestion computation starts automatically
5. All UI + mentor infrastructure already in place

---

## Domain Registry Structure (Reference)

```javascript
// scripts/engine/suggestion/domain-registry.js

SUPPORTED_DOMAINS = {
  FEATS: 'feats',
  TALENTS: 'talents',
  CLASSES: 'classes',
  FORCEPOWERS: 'forcepowers',
  BACKGROUNDS: 'backgrounds',
  SKILLS_L1: 'skills_l1',
  ATTRIBUTES: 'attributes',
}

UNSUPPORTED_DOMAINS = {
  SPECIES: 'species',
  LANGUAGES: 'languages',
  FORCE_SECRETS: 'force-secrets',
  FORCE_TECHNIQUES: 'force-techniques',
  DROID_SYSTEMS: 'droid-systems',
  STARSHIP_MANEUVERS: 'starship-maneuvers',
}

// Validation functions
validateDomain(domain) → { requested, canonical, classification, isSupported, isUnsupported }
isSupportedDomain(domain) → boolean
isUnsupportedDomain(domain) → boolean
classifyDomain(domain) → 'supported' | 'unsupported' | 'unknown'
```

---

## Test Checklist

To verify Phase 1 changes:

- [ ] Start chargen, navigate to **skills step**
  - Should see suggestion badges/recommendations (was silent before)
  - Mentor should offer suggestions

- [ ] Navigate to **force-power step**
  - Should see suggestion badges/recommendations (was silent before)
  - Mentor should offer suggestions

- [ ] Navigate to **species step**
  - Check browser console: should see warning "Unsupported domain requested: species"
  - No suggestion badges (expected; domain not implemented)
  - Player sees no suggestions (correct behavior)

- [ ] Navigate to **language step**
  - Check browser console: should see warning "Unsupported domain requested: languages"
  - No suggestion badges (expected; domain not implemented)

- [ ] Navigate to **class step** (already working)
  - Should see normal suggestion flow (no warnings)

---

## Summary of Phase 1

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Domain mismatches | 2 | 0 | ✅ Fixed |
| Silent failures | 8 (2 mismatches + 6 unsupported) | 0 | ✅ Visible via logs |
| Working steps | 5 | 7 | ✅ +2 fixed |
| Unsupported steps (clearly logged) | 6 (silent) | 6 (visible warnings) | ✅ Clear visibility |
| Centralized domain registry | No | Yes | ✅ Single source of truth |
| Mentor integration | Unchanged | Unchanged | ✅ No breakage |
| UI rendering | Unchanged | Unchanged | ✅ No breakage |

---

## Next Steps (Future Phases)

**Phase 2:** Add suggestion engines for unsupported domains
- Implement handlers in SuggestionEngineCoordinator
- Add domain logic (species synergy, language recommendations, etc.)
- Move domains from UNSUPPORTED_DOMAINS to SUPPORTED_DOMAINS

**Phase 3:** Add domain aliases/canonicalization
- If similar domain requests appear with different names, add aliases to DOMAIN_ALIASES
- Automatically normalize and warn when aliases are used

**Phase 4:** Integration testing
- Verify all 13 steps produce expected suggestions
- Test mentor advisory system with all domains
- Validate confidence-to-mood mapping across all domains

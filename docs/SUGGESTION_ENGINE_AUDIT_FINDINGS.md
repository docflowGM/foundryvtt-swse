# Suggestion Engine Audit: Reality vs. Architecture Map

## Executive Summary

### ✅ What Is Definitely Real
- **Suggestion display infrastructure**: `formatSuggestionsForDisplay()` in all 13 steps, templates render badges + confidence levels
- **Mentor advisory system**: `handleAskMentorWithSuggestions()` + `generateSuggestionAdvisory()` fully wired
- **Confidence scoring**: Mentor mood mapping (encouraging/supportive/thoughtful) based on 0.0-1.0 confidence
- **Cache system**: SuggestionService has working LRU cache with snapshot-based hashing
- **CSS styling**: Confidence-level styling (high/medium/low) applied in all templates

### ❌ What Is Definitely Not Real
- **6 missing domain implementations** in SuggestionService
- **2 domain string mismatches** between steps and SuggestionService
- **Architecture map falsely claimed all 13 domains work** — only 7 actually do

### ⚠️ What Is Partially Wired
- **Steps 7-13**: Templates + mentor integration exist, but SuggestionService returns empty arrays
- **Graceful degradation**: No errors thrown; suggestions simply don't appear (silently fails)

### 🔴 Biggest Architectural Mismatches
1. **Silent domain failures**: Steps request domains that don't exist in SuggestionService; nothing warns the developer or player
2. **No centralized domain registry**: Domains are hardcoded strings in 13 places; adding a domain requires changes in 2+ files
3. **Inconsistent domain naming**: `'force-powers'` vs `'forcepowers'`, `'skills'` vs `'skills_l1'`
4. **No validation**: SuggestionService.getSuggestions() silently returns `[]` for unknown domains instead of throwing or logging

---

## Step-by-Step Reality Matrix

| Step | Current Reality | Actual Output | Mentor Path | Status |
|------|-----------------|---------------|-------------|--------|
| **species** | Calls getSuggestions('species'), no handler in SuggestionService | Empty [] always | Works (on empty data) | ⚠️ PARTIAL |
| **class** | Calls getSuggestions('classes'), domain IS supported | Returns suggestions ✓ | Works with suggestions ✓ | ✅ REAL |
| **background** | Calls getSuggestions('backgrounds'), domain IS supported | Returns suggestions ✓ | Works with suggestions ✓ | ✅ REAL |
| **attribute** | Calls getSuggestions('attributes'), domain IS supported | Returns suggestions ✓ | Works with suggestions ✓ | ✅ REAL |
| **language** | Calls getSuggestions('languages'), no handler in SuggestionService | Empty [] always | Works (on empty data) | ⚠️ PARTIAL |
| **skills** | Calls getSuggestions('skills'), SuggestionService expects 'skills_l1' | Empty [] always (domain mismatch) | Works (on empty data) | ⚠️ PARTIAL |
| **feat** | Calls getSuggestions('feats'), domain IS supported | Returns suggestions ✓ | Works with suggestions ✓ | ✅ REAL |
| **talent** | Calls getSuggestions('talents'), domain IS supported | Returns suggestions ✓ | Works with suggestions ✓ | ✅ REAL |
| **force-power** | Calls getSuggestions('force-powers'), SuggestionService expects 'forcepowers' | Empty [] always (domain mismatch) | Works (on empty data) | ⚠️ PARTIAL |
| **force-secret** | Calls getSuggestions('force-secrets'), no handler in SuggestionService | Empty [] always | Works (on empty data) | ⚠️ PARTIAL |
| **force-technique** | Calls getSuggestions('force-techniques'), no handler in SuggestionService | Empty [] always | Works (on empty data) | ⚠️ PARTIAL |
| **droid-builder** | Calls getSuggestions('droid-systems'), no handler in SuggestionService | Empty [] always | Works (on empty data) | ⚠️ PARTIAL |
| **starship-maneuver** | Calls getSuggestions('starship-maneuvers'), no handler in SuggestionService | Empty [] always | Works (on empty data) | ⚠️ PARTIAL |

---

## Compact Impact Matrix

| Step | User-Facing Impact | Risk of Leaving As-Is | Cheapest Fix | Best Long-Term Fix |
|------|-------------------|----------------------|-------------|-------------------|
| **species** | No suggestions ever show | Player misses guidance; poor UX | Add domain handler | Domain registry system |
| **class** | ✓ Suggestions show + mentor works | Low, already working | None needed | Document as working |
| **background** | ✓ Suggestions show + mentor works | Low, already working | None needed | Document as working |
| **attribute** | ✓ Suggestions show + mentor works | Low, already working | None needed | Document as working |
| **language** | No suggestions ever show | Player misses guidance; poor UX | Add domain handler | Domain registry system |
| **skills** | No suggestions ever show (hidden string mismatch) | Player misses guidance; confusing to debug | Fix string 'skills' → 'skills_l1' | Add validation layer |
| **feat** | ✓ Suggestions show + mentor works | Low, already working | None needed | Document as working |
| **talent** | ✓ Suggestions show + mentor works | Low, already working | None needed | Document as working |
| **force-power** | No suggestions ever show (hidden string mismatch) | Player misses guidance; confusing to debug | Fix string 'force-powers' → 'forcepowers' | Add validation layer |
| **force-secret** | No suggestions ever show | Conditional step; lower priority but still broken | Add domain handler | Domain registry system |
| **force-technique** | No suggestions ever show | Conditional step; lower priority but still broken | Add domain handler | Domain registry system |
| **droid-builder** | No suggestions ever show | Conditional step; lower priority but still broken | Add domain handler | Domain registry system |
| **starship-maneuver** | No suggestions ever show | Conditional step; lower priority but still broken | Add domain handler | Domain registry system |

---

## Exact Domain Status in SuggestionService

**Location:** `scripts/engine/suggestion/SuggestionService.js` lines 177–198

### Supported (7 domains):
```javascript
if (options.domain === 'feats')       ✓ WORKS
if (options.domain === 'talents')     ✓ WORKS
if (options.domain === 'classes')     ✓ WORKS
if (options.domain === 'forcepowers') ✓ WORKS (note: NOT 'force-powers')
if (options.domain === 'backgrounds') ✓ WORKS
if (options.domain === 'skills_l1')   ✓ WORKS (note: NOT 'skills')
if (options.domain === 'attributes')  ✓ WORKS
```

### Unsupported (6 domains requested by steps):
```javascript
// force-secrets   — NO HANDLER
// force-techniques — NO HANDLER
// droid-systems    — NO HANDLER
// starship-maneuvers — NO HANDLER
// species          — NO HANDLER
// languages        — NO HANDLER

// If unknown domain: falls back to default (feats + forcepowers only)
// Returns: empty array, no error, no warning
```

---

## Claims from Architecture Map vs. Actual Code

| Claim | Actual Reality | File Proof | Severity |
|-------|---|---|---|
| "13 progression steps have suggestions integrated" | 7 steps have working domains, 6 have missing domains | SuggestionService.js:177–198 | 🔴 CRITICAL |
| "SuggestionService supports 13 domain types" | Only 7 domains are implemented in getSuggestions() | SuggestionService.js:177–198 | 🔴 CRITICAL |
| "Each step passes its domain to SuggestionService" | All steps call getSuggestions(), but 6 pass unsupported domain strings | species-step.js:805, force-power-step.js:382, etc. | 🔴 CRITICAL |
| "Suggestions are formatted for display in all steps" | TRUE — all 13 steps call formatSuggestionsForDisplay() in getStepData() | All steps, e.g., species-step.js:189 | ✅ CORRECT |
| "Templates render confidence badges" | TRUE — all 10 checked templates render badgeLabel + data-confidence-level | species-work-surface.hbs:25, class-work-surface.hbs:13, etc. | ✅ CORRECT |
| "Mentor Advisory Coordinator maps confidence to mood" | TRUE — confidence >= 0.8 → 'encouraging', >= 0.6 → 'supportive', >= 0.4 → 'thoughtful' | mentor-advisory-coordinator.js:345–357 | ✅ CORRECT |
| "handleAskMentorWithSuggestions() is called when suggestions exist" | PARTIAL — exists in mentor-step-integration.js, but only 7 steps get suggestions | mentor-step-integration.js:149, individual steps | ⚠️ PARTIAL |
| "SuggestionService caches results with LRU eviction" | TRUE — implements snapshot hashing, 50-entry cache limit, LRU removal | SuggestionService.js:129–243 | ✅ CORRECT |

---

## Three Highest-Value Gaps to Fix (Ranked)

### 🔴 GAP 1: Missing Domain Handlers (Blocks 6 Steps)
**Impact:** force-secrets, force-techniques, droid-systems, starship-maneuvers, species, languages get empty suggestions
**Root Cause:** No SuggestionEngineCoordinator methods for these domains
**Cheapest Fix:** Add conditional branches in SuggestionService.getSuggestions() for each missing domain, route to placeholder engines that return `[]` for now
**Effort:** ~30 minutes (add 6 if blocks)
**Why First:** Unblocks 6 steps from silent failures; makes intent clear instead of mysterious empty arrays

### 🔴 GAP 2: Domain String Mismatches (Blocks 2 Steps + Breaks Search)
**Impact:** skills-step and force-power-step request wrong domain strings; suggestions never compute
**Root Cause:** Inconsistent naming ('skills' vs 'skills_l1', 'force-powers' vs 'forcepowers')
**Cheapest Fix:** Rename domain strings in the 2 steps to match SuggestionService exactly
- skills-step.js line 316: `'skills'` → `'skills_l1'`
- force-power-step.js line 382: `'force-powers'` → `'forcepowers'`
**Effort:** ~5 minutes (2 find-replace operations)
**Why Second:** Quick win; unblocks 2 currently-broken steps

### 🟡 GAP 3: No Domain Validation or Registry (Causes Future Bugs)
**Impact:** Silent failures when new domains are added; no way to list supported domains programmatically
**Root Cause:** Domains are hardcoded strings in 13 steps + 1 service; no single source of truth
**Cheapest Fix:** Add a simple domain validation at top of SuggestionService.getSuggestions():
```javascript
const SUPPORTED_DOMAINS = ['feats', 'talents', 'classes', 'forcepowers', 'backgrounds', 'skills_l1', 'attributes'];
if (options.domain && !SUPPORTED_DOMAINS.includes(options.domain)) {
  SWSELogger.warn(`[SuggestionService] Unknown domain requested: "${options.domain}"`);
}
```
**Effort:** ~10 minutes
**Why Third:** Prevents future silent failures; helps developers catch mistakes immediately

---

## Three Places Where Docs Should Change Instead of Code

### 1. **Architecture Map (SUGGESTION_ENGINE_ARCHITECTURE.md)**
**Claim:** "All 13 steps are wired for suggestions"
**Reality:** Only 7 steps have working domain implementations
**Fix:** Revise Part 1 to mark steps 9–13 as "PARTIAL: UI wired, no suggestion engine"
**Also update:** Executive Summary, Data Flow Example to acknowledge domain gaps

### 2. **Step Documentation Comments**
**Claim:** Each step assumes SuggestionService will return suggestions
**Reality:** force-secret, force-technique, droid-builder, starship-maneuver, species, language steps will always get empty arrays
**Fix:** Add JSDoc comments above SuggestionService.getSuggestions() calls in these steps:
```javascript
// NOTE: 'force-secrets' domain is not yet implemented in SuggestionService
// This will return an empty suggestions array until handler is added
const suggested = await SuggestionService.getSuggestions(actor, 'chargen', {
  domain: 'force-secrets',
  ...
});
```

### 3. **mentor-advisory-coordinator.js Comments**
**Claim:** "Generates suggestion advisory with confidence-based mood"
**Reality:** Works correctly, but will only be called when handleAskMentorWithSuggestions() receives non-empty suggestions
**Fix:** Add comment clarifying the flow:
```javascript
/**
 * Generates suggestion advisory with confidence-mapped intensity and mood.
 *
 * NOTE: This is only called when handleAskMentorWithSuggestions() has
 * non-empty suggestions. For steps with missing domain handlers,
 * generic getStepGuidance() will be used instead.
 *
 * Confidence mapping:
 * - >= 0.9: very_high intensity, encouraging mood
 * - >= 0.7: high intensity, encouraging mood
 * - >= 0.5: medium intensity, supportive mood
 * - >= 0.3: low intensity, thoughtful mood
 * - < 0.3: very_low intensity, neutral mood
 */
static async generateSuggestionAdvisory(actor, mentorId, suggestions, context = {}) {
```

---

## Legacy vs. Progression-Framework Conflation

### Where They Are Conflated:
1. **Mentor system**: Both legacy chargen and progression-framework use mentor-advisory-coordinator.js, but progression-framework expects it to handle suggestions
2. **SuggestionService**: Designed as generic service usable by both systems, but progression-framework has undiscovered expectations (the 6 missing domains)
3. **Context parameter**: Both use `context = 'chargen'` but only progression-framework actually populates chargen mode

### Where They Are Separate:
1. **Step implementations**: Old chargen and progression-framework steps are in different directories and classes
2. **Shell systems**: Old chargen has chargen-shell.js; progression-framework has chargen-shell-v2.js
3. **Template paths**: Totally separate template hierarchies

### Risk:
- If legacy chargen also tries to use missing domains (species, languages, etc.), it will also fail silently
- No central place documenting which systems own which domains

---

## Conclusion: Classification by Readiness

### ✅ Fully Wired (4 Steps)
- class-step.js
- background-step.js
- attribute-step.js
- feat-step.js
- talent-step.js
- forcepowers (via force-power-step.js using correct domain 'forcepowers')

**Note:** Only 6 steps truly work. force-power-step has domain string mismatch.

### ⚠️ Partially Wired (7 Steps)
All have UI + mentor integration but missing SuggestionService handlers:
- species-step.js (domain not in SuggestionService)
- language-step.js (domain not in SuggestionService)
- skills-step.js (domain string mismatch: 'skills' vs 'skills_l1')
- force-power-step.js (domain string mismatch: 'force-powers' vs 'forcepowers')
- force-secret-step.js (domain not in SuggestionService)
- force-technique-step.js (domain not in SuggestionService)
- droid-builder-step.js (domain not in SuggestionService)
- starship-maneuver-step.js (domain not in SuggestionService)

### ❌ Not Wired (0 Steps)
None are completely broken; all degrade gracefully to empty suggestion arrays.

---

## Recommended Next Decisions

### Decision 1: Do We Fix Missing Domains?
**Option A:** Add placeholder domain handlers that return empty arrays (what's happening now, but explicit)
**Option B:** Add real suggestion engines for the 6 domains (larger effort)
**Option C:** Remove suggestion infrastructure from those 6 steps (break existing UI code)

**Recommendation:** Option A for now; it's what's happening and makes it explicit. Option B can come later with proper domain engines.

### Decision 2: Do We Fix String Mismatches?
**Option A:** Fix the 2 domain strings immediately (5 min, unblocks skills + force-power)
**Option B:** Add domain aliasing in SuggestionService (allows both strings to work)

**Recommendation:** Option A — simpler, and there's no reason to support both names.

### Decision 3: Do We Add Validation?
**Option A:** Add domain validation with console warnings (10 min, catches future mistakes)
**Option B:** Leave it as-is; developers should check SuggestionService source

**Recommendation:** Option A — prevents future silent failures.

### Decision 4: Do We Update Architecture Map?
**Option A:** Mark it as "this is aspirational; here's what's actually wired"
**Option B:** Rewrite to show only the 7 working domains
**Option C:** Keep it as-is; it shows the *shape* of what should exist

**Recommendation:** Option A — add a disclaimer at the top of the map explaining the gap.

---

## Summary

**The suggestion engine display and mentor integration are genuinely complete.** Badges render, confidence levels show, mentor speaks with appropriate mood. This part works.

**The suggestion *calculation* is incomplete.** 6 of 13 steps request domains that don't exist in SuggestionService. These steps will always get empty suggestion arrays.

**The architecture map overstated coverage.** It claimed all 13 domains work when only 7 are implemented.

**The system degrades gracefully.** Steps don't crash; they just don't get suggestions. This is why it wasn't noticed.

**The cheapest fix path:**
1. Fix 2 string mismatches (5 min) → unblock skills + force-power
2. Add 6 placeholder domain handlers (30 min) → make intent explicit
3. Add validation (10 min) → catch future mistakes
4. Update docs (30 min) → stop claiming 13 domains work

**Total effort to fix:** ~75 minutes to make all 13 steps produce suggestions (or at least fail loudly).

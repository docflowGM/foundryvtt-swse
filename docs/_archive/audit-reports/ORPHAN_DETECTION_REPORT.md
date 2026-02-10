# SWSE Orphan Script Detection Report

## Objective
Identify unused, duplicate, and redundant code that can be safely deleted to reduce technical debt and improve maintainability.

---

## Phase 1: Runtime Usage Tracking (PRE-DELETION)

### Instrumentation Strategy

Before any deletions, add usage markers to key systems:

```javascript
// In relevant initialization points, add:
import { UsageTracker } from '../maintenance/usage-tracker.js';

UsageTracker.markInitialized("TalentTreeRegistry");
UsageTracker.markInitialized("SuggestionEngine");
UsageTracker.markInitialized("ProgressionEngine");
// etc.
```

### Console Commands to Track Usage

```javascript
// After running chargen + level-up + sheet interactions:
window.SWSE.usage.logReport();

// Get detailed breakdown:
const stats = window.SWSE.usage.getStats();
console.table(stats.report);
```

### What to look for after tracking
- Systems marked as `loaded` but never `used`
- Registries with `getFallback()` methods still being called
- Normalizers/mappers creating intermediate data that's never read

---

## Phase 2: Confirmed High-Confidence Deletions

### A. Duplicate/Parallel Registries (Likely 20-30% code reduction)

**Status: REVIEW BEFORE DELETING**

Look for patterns like:
- `TalentRegistry` + `TalentRegistryFallback`
- `FeatRegistry` + `FeatMetadataCache`
- Multiple normalizer functions doing same work

**Candidates for consolidation:**
```
scripts/data/
├── talent-tree-registry.js          (primary - KEEP)
├── talent-tree-normalizer.js        (legacy normalizer - REVIEW)
├── talent-tree-mapper.js            (possible duplicate - REVIEW)
├── talent-effect-validator.js       (specific tool - KEEP)

scripts/progression/
├── progression-engine.js            (primary - KEEP)
├── progression-preview.js           (UI helper - KEEP)
├── progression-validator.js         (validation - KEEP if used)
```

**Action:**
- Verify no logic duplication
- Consolidate into single registry per domain
- Delete secondary mappers/normalizers

---

### B. Single-Use Migration Scripts (Already Completed Phase 1)

**Status: COMPLETED** ✅

Deleted:
- `fix-defense-schema.js`
- `fix-actor-size.js`
- `actor-validation-migration.js`
- `item-validation-migration.js`
- `fix-item-weight.js`

**Remaining migration audit:**
```
scripts/migration/
├── populate-force-compendiums.js       (ESSENTIAL - initial data load)
├── update-species-traits-migration.js  (v1.1.216 - recent, KEEP)
├── fix-talent-effect-validation.js     (Foundry v13 compat - KEEP)
├── talent-ssot-refactor.js             (CRITICAL SSOT validation)
```

All remaining migrations are **essential** and cannot be deleted.

---

### C. Recovery/Fallback Functions (Phase 5 Complete)

**Status: COMPLETED** ✅

Deleted:
- `safeExecute()` wrapper
- `safeGet()` wrapper
- Error handler recovery registration
- Skills hardcoded fallback
- Template default fallback
- Mentor dialogue phase fallback

**Remaining audit:**
Check for any remaining try/catch blocks that return fallback values instead of throwing:
```javascript
// REMOVE:
try {
  return loadData();
} catch {
  return HARDCODED_FALLBACK;  // ❌ Delete these
}

// KEEP:
try {
  return loadData();
} catch (err) {
  SWSELogger.error('[SSOT]', err);  // ✅ Log and propagate
  throw err;
}
```

---

### D. Hardcoded Data / Constants (Review for SSOT violations)

**Candidates for review:**

```
scripts/config/
├── classes.js                      - Check for fallback class data
├── species.js                      - Check for hardcoded species
├── skills.js                       - ✅ DELETED fallback (Phase 5)
```

**Action:**
- Search for `export const HARDCODED_*` or `export const DEFAULT_*`
- If data can come from compendium, delete hardcoded version
- Keep only constants (non-data configuration)

---

### E. Template Files (Possible 5-10% reduction)

**Find unused templates:**

```bash
# Find all hbs files
find scripts/apps -name "*.hbs" | sort

# Then check if referenced:
grep -r "template:" scripts/ | grep "hbs-name"
```

**Candidates:**
- Old sheet tabs no longer rendered
- Legacy layouts kept "just in case"
- Partial templates with no parent
- CSS files with no selectors in use

**Action:**
- For each template, verify it's referenced in template getter
- If unreferenced, delete it
- Example cleanup: OLD_CHARACTER_SHEET_V1 tabs

---

### F. Unused App Classes / Dialogs

**Review for usage:**

```javascript
// Search for classes that are:
// 1. Defined but never instantiated
// 2. Extended but child class used instead
// 3. Created for removed features
```

**Candidates to audit:**
- Deprecated dialog classes
- Old sheet implementations
- Legacy app renderers
- Test/debug utilities left behind

---

## Phase 3: Medium-Confidence Deletions (Review 1x)

### A. Normalizer Functions

Current normalizers:
```
scripts/data/
├── talent-tree-normalizer.js       (fuzzy matching - ✅ Phase 2 removed fuzzy)
├── feat-normalizer.js              (possible duplicate)
├── skill-normalizer.js             (possible duplicate)
```

**Rule:** If normalization is logic-free passthrough, delete it.

**Keep:** Complex transformations needed for data validity.

---

### B. Utility Helper Bundles

Search for utility files that provide 1-2 functions:

```javascript
// Example - if only 1-2 functions used, consolidate:
// ❌ scripts/utils/specialized-tool.js (1 function)
// ✅ Merge into relevant system

// ✅ Keep: scripts/utils/logger.js (used everywhere)
// ✅ Keep: scripts/utils/warn-gm.js (used everywhere)
```

**Safe action:**
- Functions used in 3+ places → keep utility file
- Functions used in 1-2 places → inline into callers
- Functions not used → delete

---

### C. Duplicate Helper Methods in Classes

Example patterns:
```javascript
// Multiple sheets defining:
async _render(force, options) { ... }
async _renderInner(...) { ... }
async _saveScrollPosition() { ... }

// If identical, move to base class
```

**Action:**
- Extract common patterns to base classes
- Delete redundant overrides
- Use `super._method()` instead of reimplementing

---

## Phase 4: Review-Required Deletions

### A. Suggestion Engine Architecture

**Current:**
- `SuggestionEngine` class
- `SuggestionEngineCoordinator` wrapper
- Multiple suggestion-specific files

**Question:**
- Is coordinator necessary or duplicate wrapper?
- Can logic be consolidated into one engine?

**Action:**
- Verify coordinator doesn't just proxy all calls
- If true proxy, remove coordinator
- Update all callers to use engine directly

---

### B. Validation Chains

**Current:**
- `levelup-validation.js`
- `talent-ssot-refactor.js` (validation)
- `progression-validator.js`
- Actor/item validators in multiple files

**Question:**
- Is validation logic centralized or scattered?
- Can validators be unified?

**Action:**
- Document validation entry point
- Consolidate error messages
- Delete redundant validators

---

## Phase 5: Safe Consolidation Refactors

### A. Feature Module Organization

**Current (scattered):**
```
scripts/
├── apps/
│   ├── chargen/
│   ├── levelup/
│   ├── mentor-...
│   ├── progression/
├── data/
├── progression/
├── actors/
```

**Proposed (post-stabilization):**
```
features/
├── talents/
│   ├── registry.js
│   ├── ui/
│   └── data.json
├── feats/
│   ├── registry.js
│   ├── suggestion.js
│   ├── ui/
└── progression/
    ├── engine.js
    ├── validator.js
    └── ui/
```

**Benefits:**
- Unused features obvious (delete whole folder)
- Clear ownership/responsibility
- Explicit imports (loose ends visible)

---

## Phase 6: Documentation & Deletion Gate

### A. Create Usage Map Document

For **each system file**, document:

```markdown
## TalentTreeRegistry (`scripts/data/talent-tree-registry.js`)

- **Used by:** levelup-main.js, progression-engine.js, mentor-dialogues.js
- **Called in hooks:** "ready" (initialization)
- **API surface:** getTalentTree(), getTalents(), getAllTalents()
- **Fallback usage:** ❌ None (SSOT verified)
- **Status:** ESSENTIAL - Delete only if all 3 callers refactored

## TalentTreeNormalizer (deprecated pattern)

- **Used by:** talent-tree-registry.js (only)
- **Functionality:** Fuzzy name matching (DELETED Phase 2)
- **Replacement:** Exact ID lookup
- **Status:** ✅ DELETED
```

### B. Implement Deletion Gate

Add to PR template:

```markdown
## Code Deletions

If this PR adds new files, please address:
- [ ] Does this PR delete or merge equivalent code elsewhere?
- [ ] OR: documented justification for increased surface area
- [ ] No new utilities that could be inlined into 1-2 callers

Zero net increase in file count preferred.
```

---

## Summary: Files Marked for Review

### Red Flag: Likely Orphaned
- [ ] Any class with only one caller
- [ ] Any function exported but not imported anywhere
- [ ] Any constant/hardcoded data duplicating compendium
- [ ] Any try/catch returning fallback instead of failing
- [ ] Any "legacy", "old", "deprecated" in filename

### Green Flag: Essential, Keep
- [ ] Registries actively populated at startup
- [ ] Engines called by multiple systems
- [ ] Logger/utilities used everywhere
- [ ] Core business logic (chargen, level-up, progression)
- [ ] Validation/error handling (fail-fast)

---

## Next Steps

1. **Enable usage tracking** in system.json hooks
2. **Run full chargen + level-up cycle** with tracking enabled
3. **Generate report:** `window.SWSE.usage.logReport()`
4. **Cross-reference** against this document
5. **Delete in phases** (migrations → duplicates → fallbacks → consolidate)
6. **Verify boots cleanly** after each phase
7. **Document deletions** in commit messages with rationale

---

## Expected Outcome

- **20-30%** reduction in total JavaScript lines
- **50+ orphaned** functions/classes identified
- **5-8 duplicate** systems consolidated
- **Codebase significantly easier** to maintain
- **Feature boundaries clearer** for future development

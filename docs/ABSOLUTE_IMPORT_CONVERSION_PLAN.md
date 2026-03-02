# Absolute Import Path Conversion Plan

**Goal:** Convert 926 JavaScript files from relative imports to absolute imports for maintainability and error prevention.

---

## Analysis Results

### Current Structure
- **Root directory:** `/scripts/`
- **Top-level modules:** 47 directories (engine, apps, utils, data, etc.)
- **Relative path depths used:** 1-5 levels (`../`, `../../`, etc.)
- **Most common imports:** logger.js, actor-engine.js, document-api-v13.js

### Problem with Current Relative Paths
```javascript
// From scripts/engine/progression/feats/feat-registry-ui.js
// Had to use: ../../abilities/AbilityEngine.js
// Hard to understand the source without counting dots
```

---

## Proposed Solution: Hybrid Absolute Paths

Since this is a **Foundry VTT system running in a browser**, we have two options:

### Option A: Foundry URL-Based Absolute Paths
```javascript
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
```
**Pros:** Works with Foundry's module loading
**Cons:** Very long paths, tightly couples to system name

### Option B: Standardized Relative Paths (RECOMMENDED)
Keep relative paths BUT make them consistent:
```javascript
// All files import from scripts/ as base
// Use a root-level import config or standardized pattern
import { AbilityEngine } from "@swse/engine/abilities/AbilityEngine.js";
```
**Pros:** Clean, maintainable, works with module bundlers
**Cons:** Requires Foundry module resolution setup

### Option C: Hybrid (Best for Foundry VTT)
Use **relative paths with a standard base pattern**:
```javascript
// Create utility files that re-export everything
// All imports go through known entry points

// From any file:
import { AbilityEngine } from "@swse/engine";
// Which points to: scripts/engine/abilities/AbilityEngine.js
```

---

## Recommended Implementation: Option B with Entry Points

### Step 1: Create Index Files
Create `index.js` in each major module that re-exports all exports:
```
scripts/engine/index.js          → exports all engine modules
scripts/engine/abilities/index.js → exports AbilityEngine, etc.
scripts/engine/combat/index.js    → exports combat modules
scripts/data/index.js             → exports all data modules
```

### Step 2: Implement Import Aliases
Add to `package.json` or create `jsconfig.json`:
```json
{
  "imports": {
    "@swse/engine/*": "./scripts/engine/*",
    "@swse/engine": "./scripts/engine/index.js",
    "@swse/apps/*": "./scripts/apps/*",
    "@swse/data/*": "./data/*",
    "@swse/utils/*": "./scripts/utils/*",
    "@swse/*": "./scripts/*"
  }
}
```

### Step 3: Convert All Imports
Replace all relative paths with absolute paths:
```javascript
// BEFORE
import { AbilityEngine } from "../../abilities/AbilityEngine.js";

// AFTER
import { AbilityEngine } from "@swse/engine/abilities/AbilityEngine.js";
```

---

## Conversion Process

### Phase 1: Setup (Pre-conversion)
- [ ] Create index.js files in all major module directories
- [ ] Create jsconfig.json with import aliases
- [ ] Back up current codebase

### Phase 2: Automated Conversion
- [ ] Build conversion script that:
  - Finds all relative imports
  - Maps them to absolute @swse paths
  - Validates the conversion
  - Tests syntax

### Phase 3: Validation
- [ ] Syntax validation on all 926 files
- [ ] Verify all imports resolve correctly
- [ ] No circular dependencies introduced
- [ ] Run any existing tests

### Phase 4: Documentation
- [ ] Update developer guide with new import pattern
- [ ] Document @swse namespace
- [ ] Create import examples

---

## Benefits After Conversion

✅ **No more relative path errors** - imports always work regardless of file location
✅ **IDE support** - autocomplete and go-to-definition work better
✅ **Easier refactoring** - moving files doesn't break imports
✅ **Clearer code** - `@swse/engine/abilities` is self-documenting
✅ **No more "count the dots"** - eliminates human error

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Foundry VTT module loading incompatibility | Test with actual Foundry instance before full conversion |
| Import alias not recognized by bundler | Create fallback relative paths if needed |
| Breaking changes during conversion | Keep backup, test thoroughly, can easily rollback |
| Incomplete conversion | Automated script ensures consistency |

---

## Implementation Timeline

1. **Step 1-2 (Setup):** 5 minutes
2. **Step 3 (Conversion):** 10 minutes (automated)
3. **Phase 3 (Validation):** 5 minutes (automated)
4. **Total:** ~20 minutes for full conversion

---

## Rollback Plan

If anything breaks:
1. All original relative-path files are preserved
2. Can revert imports in <1 minute using git
3. No data loss risk

---

## Next Steps

Ready to proceed? Confirm:
1. ✅ Use @swse/ naming convention?
2. ✅ Create index.js entry points?
3. ✅ Add jsconfig.json?
4. ✅ Proceed with conversion?


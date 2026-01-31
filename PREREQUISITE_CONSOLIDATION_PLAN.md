# Prerequisite Validator Inventory

## The Three Validators (Currently Active)

### 1. PrerequisiteChecker (CORRECT — scripts/data/prerequisite-checker.js)
**Status:** ✅ Correct owner
**Call sites:** 2
- `scripts/engine/progression.js`
- `scripts/progression/ProgressionCompiler.js` (just added by me)

---

### 2. PrerequisiteRequirements (ILLEGAL — scripts/progression/feats/prerequisite_engine.js)
**Status:** ❌ In wrong layer (Progression, not Data)
**Call sites:** 11
- `scripts/apps/chargen/chargen-feats-talents.js`
- `scripts/apps/chargen/chargen-main.js`
- `scripts/apps/levelup/levelup-dual-talent-progression.js`
- `scripts/apps/levelup/levelup-talents.js`
- `scripts/apps/levelup/levelup-validation.js`
- `scripts/engine/MentorWishlistIntegration.js`
- `scripts/engine/SuggestionEngine.js`
- `scripts/engine/WishlistEngine.js`
- `scripts/progression/feats/feat-engine.js`
- `scripts/progression/talents/talent-registry-ui.js`
- `scripts/progression/ui/levelup-module-init.js`

---

### 3. PrerequisiteValidator (ILLEGAL — scripts/utils/prerequisite-validator.js)
**Status:** ❌ In wrong layer (Utilities, not Data)
**Call sites:** 9
- `scripts/apps/chargen/chargen-feats-talents.js`
- `scripts/apps/chargen/chargen-force-powers.js`
- `scripts/apps/chargen/chargen-starship-maneuvers.js`
- `scripts/apps/levelup/levelup-main.js`
- `scripts/apps/talent-tree-visualizer.js`
- `scripts/progression/engine/force-progression.js`
- `scripts/progression/feats/feat-registry-ui.js`
- `scripts/progression/force/force-registry-ui.js`
- `scripts/utils/starship-maneuver-manager.js`

---

## Consolidation Plan

### Phase B: Designate Canonical Engine

**PrerequisiteChecker becomes THE validator.**

Canonical API (to be implemented):
```javascript
PrerequisiteChecker.check(snapshot, type, targetId)
→ { met: boolean, missing: string[], details: Object }

PrerequisiteChecker.canTalent(snapshot, talentId)
PrerequisiteChecker.canFeat(snapshot, featId)
PrerequisiteChecker.canClass(snapshot, classId)
// etc.
```

### Phase C: Migrate Logic

**PrerequisiteRequirements** (11 call sites):
- Read through prerequisite_engine.js
- Move any unique logic into PrerequisiteChecker
- Rewrite all 11 call sites to use PrerequisiteChecker
- Delete prerequisite_engine.js

**PrerequisiteValidator** (9 call sites):
- Read through prerequisite-validator.js
- Move any unique logic into PrerequisiteChecker
- Rewrite all 9 call sites to use PrerequisiteChecker
- Delete prerequisite-validator.js

### Phase D: Cleanup
- Verify no remaining calls to deleted modules
- Run search for orphaned prereq logic
- Mark as complete

---

## Statistics

- **Total call sites:** 20 (not counting internal calls)
- **Illegal validators:** 2
- **Illegal call sites:** 20
- **Correct validators:** 1
- **Correct call sites:** 2

Once consolidated:
- **Illegal call sites:** 0
- **Correct call sites:** 22
- **Validator count:** 1 (non-negotiable)


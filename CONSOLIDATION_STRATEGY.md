# Prerequisite Validator Consolidation — Detailed Strategy

## The Current State (Three Validators)

### 1. PrerequisiteChecker (CANONICAL)
Location: `scripts/data/prerequisite-checker.js`
API: `checkPrerequisites(actor, className) → { met, missing, details }`
Scope: Prestige class prerequisites (level, BAB, feats, talents, force powers, etc.)
Reads from: PRESTIGE_PREREQUISITES constant, actor items

### 2. PrerequisiteRequirements (ILLEGAL)
Location: `scripts/progression/feats/prerequisite_engine.js`
API:
- `checkFeature(actor, doc) → { valid, reasons }`
- `checkTalentPrerequisites(actor, talent, pending) → { valid, reasons }`
- `checkFeatPrerequisites(actor, feat, pending) → { valid, reasons }`
- `meetsRequirements(actor, doc) → { valid, reasons }`
- `canLearn(actor, doc) → boolean`
Scope: Feat/talent prerequisites (structured or string-based from item.system)
Reads from: Item doc system.prerequisitesStructured or legacy strings

### 3. PrerequisiteValidator (ILLEGAL)
Location: `scripts/utils/prerequisite-validator.js`
API:
- `checkTalentPrerequisites(talent, actor, pending) → { valid, reasons }`
- `checkFeatPrerequisites(feat, actor, pending) → { valid, reasons }`
- `checkClassPrerequisites(classDoc, actor, pending) → { valid, reasons }`
Scope: Talent/feat/class prerequisites (normalized or legacy strings)
Reads from: Item doc system.prerequisites or parsed format

---

## The Problem

All three answer "is this legal?" but:
- Different APIs
- Different input sources (PRESTIGE_PREREQUISITES vs item.system.prerequisites)
- Overlapping but non-identical logic
- No single source of truth

Result: 20 call sites scattered across chargen, levelup, suggestions, all potentially giving different answers.

---

## Phase C2 Solution — Merge Into PrerequisiteChecker

Goal: PrerequisiteChecker becomes the ONE validator.

### Step C2.1: Extend PrerequisiteChecker with feature prerequisite support

Add these capabilities to PrerequisiteChecker (without deleting it):

```javascript
/**
 * Check prerequisites for a feature (feat, talent)
 * Reads from item.system.prerequisites or prerequisitesStructured
 */
static checkFeaturePrerequisites(actor, featureDoc, pending = {})
  → { met: boolean, missing: string[], details: object }

/**
 * Check prerequisites for any class (base or prestige)
 * Reads from item.system.prerequisites
 */
static checkClassLevelPrerequisites(actor, classDoc, pending = {})
  → { met: boolean, missing: string[], details: object }

/**
 * Alias methods to support existing call sites
 */
static checkTalentPrerequisites(actor, talentDoc, pending = {})
static checkFeatPrerequisites(actor, featDoc, pending = {})
static canLearn(actor, featureDoc) → boolean
static meetsRequirements(actor, doc) → { valid, reasons }
```

### Step C2.2: Merge logic from PrerequisiteRequirements

Pull into PrerequisiteChecker:
- Structured prerequisite evaluation (`_evaluateStructured`, `_checkCondition`)
- Feat checking (from items)
- Talent checking (from items)
- Tree membership checking (any talent from X tree)
- Legacy string parsing (via prerequisite-normalizer)

### Step C2.3: Merge logic from PrerequisiteValidator

Pull into PrerequisiteChecker:
- Normalized format checking (`_checkParsedPrerequisites`)
- Legacy string fallback parsing
- Class prerequisite evaluation

### Step C2.4: Normalize return types

Currently:
- PrerequisiteChecker returns: `{ met, missing, details }`
- PrerequisiteRequirements returns: `{ valid, reasons }`
- PrerequisiteValidator returns: `{ valid, reasons }`

Solution: Consolidate to ONE return format:
```javascript
{
  met: boolean,        // true if all prerequisites satisfied
  missing: string[],   // human-readable reasons for failure
  details: object      // internal detail breakdown
}
```

Provide aliases for backward compatibility:
```javascript
get valid() { return this.met; }
get reasons() { return this.missing; }
```

---

## Phase D: Migration Order (20 Call Sites)

### Tier 1: UI/Display (Low Risk) — 6 call sites
These only filter or display, never gate progression:

1. `scripts/apps/talent-tree-visualizer.js` (PrerequisiteValidator)
   - Just greys out unavailable talents
   - Change: `PrerequisiteValidator.checkTalentPrerequisites(talent, actor)`
     → `PrerequisiteChecker.checkTalentPrerequisites(actor, talent)`

2. `scripts/progression/feats/feat-registry-ui.js` (PrerequisiteValidator)
   - UI helper for feat picker
   - Change: Same as above

3. `scripts/progression/force/force-registry-ui.js` (PrerequisiteValidator)
   - UI helper for force picker
   - Change: Similar pattern

4. `scripts/progression/talents/talent-registry-ui.js` (PrerequisiteRequirements)
   - UI helper for talent tree UI
   - Change: `PrerequisiteRequirements.checkTalentPrerequisites(actor, talent)`
     → `PrerequisiteChecker.checkTalentPrerequisites(actor, talent)`

5. `scripts/apps/chargen/chargen-feats-talents.js` (both)
   - Filters available options
   - Change: Dual validation, then switch to PrerequisiteChecker

6. `scripts/engine/SuggestionEngine.js` (PrerequisiteRequirements)
   - Filters before suggesting
   - Change: Delegate to PrerequisiteChecker

### Tier 2: Chargen/Levelup (Medium Risk) — 10 call sites
These validate before allowing selections but don't mutate:

1. `scripts/apps/chargen/chargen-main.js` (PrerequisiteRequirements)
2. `scripts/apps/chargen/chargen-force-powers.js` (PrerequisiteValidator)
3. `scripts/apps/chargen/chargen-starship-maneuvers.js` (PrerequisiteValidator)
4. `scripts/apps/levelup/levelup-main.js` (PrerequisiteValidator)
5. `scripts/apps/levelup/levelup-talents.js` (PrerequisiteRequirements)
6. `scripts/apps/levelup/levelup-validation.js` (PrerequisiteRequirements)
7. `scripts/apps/levelup/levelup-dual-talent-progression.js` (PrerequisiteRequirements)
8. `scripts/engine/MentorWishlistIntegration.js` (PrerequisiteRequirements)
9. `scripts/engine/WishlistEngine.js` (PrerequisiteRequirements)
10. `scripts/progression/engine/force-progression.js` (PrerequisiteValidator)

Strategy: Implement dual-check first:
```javascript
const canonical = PrerequisiteChecker.checkFeaturePrerequisites(actor, feature);
const legacy = PrerequisiteRequirements.checkTalentPrerequisites(actor, feature);
if (canonical.met !== legacy.valid) {
  console.warn("Prereq mismatch detected", { canonical, legacy });
}
// Use canonical result
if (!canonical.met) { return false; }
```

### Tier 3: Hard Gates (Highest Risk) — 4 call sites
These are progression gates that prevent data corruption:

1. `scripts/progression/feats/feat-engine.js` (PrerequisiteRequirements)
   - Gate before applying feat
2. `scripts/progression/ui/levelup-module-init.js` (PrerequisiteRequirements)
   - Hook-level validation
3. `scripts/apps/levelup/levelup-class.js` (meetsClassPrerequisites wrapper)
   - Class selection validation
4. `scripts/utils/starship-maneuver-manager.js` (PrerequisiteValidator)
   - Maneuver application gate

Strategy: Only migrate after all Tier 1 + 2 are done and tested.

---

## Phase D Execution Checklist

- [ ] Extend PrerequisiteChecker with feature prerequisite methods
- [ ] Merge PrerequisiteRequirements logic into PrerequisiteChecker
- [ ] Merge PrerequisiteValidator logic into PrerequisiteChecker
- [ ] Normalize return types with aliases
- [ ] Migrate Tier 1 (6 call sites) — UI/display only
- [ ] Verify visual filtering still works
- [ ] Migrate Tier 2 (10 call sites) — with dual-check safety net
- [ ] Monitor for mismatches in console
- [ ] After 1 week without mismatches, migrate Tier 3 (4 call sites)
- [ ] Run full test suite
- [ ] Delete PrerequisiteRequirements (prerequisite_engine.js)
- [ ] Delete PrerequisiteValidator (prerequisite-validator.js)
- [ ] Delete prerequisite-normalizer.js if unused elsewhere
- [ ] Add regression guard: assert no imports of deleted modules

---

## Success Criteria

When this is done:

```javascript
// This must be true:
if (importedValidator !== PrerequisiteChecker) {
  throw new Error("Illegal validator import");
}
```

All 20 call sites import and use PrerequisiteChecker.
No code outside PrerequisiteChecker can answer "is this legal?"


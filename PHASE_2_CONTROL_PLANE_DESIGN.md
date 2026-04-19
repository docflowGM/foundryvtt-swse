# PHASE 2: CONTROL PLANE DESIGN
## Canonical Architecture for House Rules (No Behavior Migration)

**Status**: Design Phase (NOT Implementation)  
**Scope**: Control plane specification, validation rules, governance, adapters, deprecation policy  
**Constraint**: Zero behavior migration. Only design the paths. Tiny scaffolding optional. Pilot FeatRules adapter only if deemed safe.

---

## EXECUTIVE SUMMARY

### A. Control Plane Verdict

**CURRENT STATE (Phase 1 Complete)**
- 144 unique house rules across 4 split registries
- 3 separate registry files (houserule-settings.js: 133, house-rules.js: 3, core/settings.js: 11, epic-override.js: 1)
- 2 duplicate registrations (darkSideMaxMultiplier, allowSuiteReselection) — would throw on bootstrap if all files load
- 4 orphaned rules (enableFollowerBackgrounds, enableDarkSideTreeAccess, classTreeOverrides, classTreeAccessMenu) — declared but never registered at startup
- 1 canonical service (HouseRuleService) with governed access pattern, but bypassed by 58 files (~400+ direct reads)
- 2 competing UIs (house-rules-app.js modern vs houserule-menus.js legacy)
- Incomplete DEFAULTS in SettingsHelper (missing 4 orphaned rules, has duplicates)
- No real governance enforcement (warnings only, not errors)

**PHASE 2 DESIGN DECISION**
✓ Consolidate to ONE canonical registry: `scripts/houserules/houserule-settings.js`  
✓ Resolve duplicates via merge (deduplicate, keep single definition)  
✓ Migrate orphaned rules to canonical registry  
✓ Separate house rules from system infrastructure in core/settings.js  
✓ Establish HouseRuleService as enforced SSOT (validate at startup)  
✓ Declare house-rules-app.js as canonical UI (deprecate menus)  
✓ Align SettingsHelper.DEFAULTS with registered rules (144 entries)  
✓ Define adapter standard for 9+ owner engines  
✓ Implement validation/governance with real enforcement (startup errors)  
✓ Stage deprecation with migration ledgers (mark → audit → remove)

---

## DELIVERABLES B–K

### B. CANONICAL REGISTRY PATH

#### Current State (Split Across 3–4 Files)
```
scripts/houserules/houserule-settings.js     (133 rules, PRIMARY)
scripts/core/settings.js                     (11 house rules + ~30 infrastructure)
scripts/settings/house-rules.js              (3 orphaned rules, NOT imported at startup)
scripts/settings/epic-override.js            (1 rule, separate file)
```

#### Proposed Consolidation
**Single Canonical Registry**: `scripts/houserules/houserule-settings.js`

All 144 house rules must be declared in ONE file. Structure:
```javascript
export function registerHouseruleSettings() {
  const NS = 'foundryvtt-swse';
  
  // INTERNAL REGISTRATION WRAPPER (unchanged, handles errors gracefully)
  function register(key, data) {
    try {
      game.settings.register(NS, key, data);
      SWSELogger.debug(`[HouseRules] Registered: ${key}`);
    } catch (err) {
      SWSELogger.error(`[HouseRules] Failed to register "${key}":`, err);
    }
  }
  
  // ORGANIZED BY FAMILY/DOMAIN
  // Character Creation (11 rules)
  register('abilityScoreMethod', { ... });
  // ... (all 11)
  
  // Combat (22 rules)
  register('conditionTrackCap', { ... });
  // ... (all 22)
  
  // Force (9 rules)
  // ... and so on, organized by family
  
  // All 144 rules in ONE file
}
```

#### Migration Path
1. **Step 1**: Add all orphaned rules (enableFollowerBackgrounds, enableDarkSideTreeAccess, classTreeOverrides, classTreeAccessMenu) to houserule-settings.js with proper registration
2. **Step 2**: Merge 11 house rules from core/settings.js into houserule-settings.js (remove from core/settings.js)
3. **Step 3**: Remove epic-override.js, move single rule into houserule-settings.js
4. **Step 4**: Deprecate house-rules.js (mark imports as deprecated, ensure not imported at startup)
5. **Step 5**: Update index.js to call ONLY registerHouseruleSettings() (remove other calls)
6. **Step 6**: Validate no duplicate registrations (test at startup)

#### Namespace Canonicalization
- **Namespace**: `'foundryvtt-swse'` (already canonical, keep unchanged)
- **Scope**: `'world'` for all rules (already correct, no per-client settings)
- **Config**: `true` for active rules, `false` for internal/computed rules
- **Type**: One of `Boolean`, `String`, `Number`, `Object`, `Array` (already correct)

---

### C. HOUSERULESERVICE CONTRACT

#### Current Design (Lines 16–96 in HouseRuleService.js)
```javascript
static get(key)                           // Get any rule value
static isEnabled(key)                     // Get boolean rule
static getString(key, fallback = '')      // Get string rule
static getNumber(key, fallback = 0)       // Get numeric rule
static async set(key, value)              // Set rule (GM only)
static getAll()                           // Get snapshot of all rules
static validate()                         // Validate all rules
static _hookDirectAccess()                // Detect direct reads (present but inactive)
```

#### Proposed Enhanced Contract (No Method Changes)
**Add these validations to `get()` and `set()`:**

1. **In `get(key)`**: Check if rule is registered in DEFAULTS
   ```javascript
   static get(key) {
     const defaults = SettingsHelper.DEFAULTS;
     if (!defaults.hasOwnProperty(key)) {
       SWSELogger.warn(`[HouseRuleService] Unknown rule: "${key}". Not in DEFAULTS.`);
     }
     return SettingsHelper.get(key);
   }
   ```

2. **In `set(key, value)`**: Validate new value against registered setting type
   ```javascript
   static async set(key, value) {
     if (!game.user.isGM) {
       SWSELogger.warn(`[HouseRuleService] Non-GM attempted to set "${key}"`);
       return;
     }
     
     // TYPE VALIDATION: ensure value matches registered type
     const setting = this._getRegisteredSetting(key);
     if (!this._isValidType(value, setting.type)) {
       SWSELogger.error(`[HouseRuleService] Type mismatch for "${key}": got ${typeof value}, expected ${setting.type}`);
       throw new Error(`Invalid type for rule "${key}"`);
     }
     
     await game.settings.set(this.NS, key, value);
     SWSELogger.info(`[HouseRuleService] Updated ${key} = ${value}`);
     Hooks.callAll('swse:houserule-changed', key, value);
   }
   
   static _getRegisteredSetting(key) {
     // Introspect game.settings to find the registered setting definition
     // Returns { type: String, default: X, choices: Y, ... }
   }
   
   static _isValidType(value, expectedType) {
     // Check if value matches expectedType
     if (expectedType === String) return typeof value === 'string';
     if (expectedType === Number) return typeof value === 'number';
     if (expectedType === Boolean) return typeof value === 'boolean';
     if (expectedType === Array) return Array.isArray(value);
     if (expectedType === Object) return typeof value === 'object' && value !== null;
     return true;
   }
   ```

3. **Activate `_hookDirectAccess()` at startup** to detect and log all direct reads
   ```javascript
   // In Hooks.once('init', ...)
   HouseRuleService._hookDirectAccess();
   ```

#### Semantic Guarantees
- **SSOT**: All house rule reads go through HouseRuleService.get() or typed helpers
- **Type Safety**: Values always match registered types
- **Governance**: Direct reads logged/warned (Phase 3A will route them)
- **Audit Trail**: Every rule change logged with timestamp, changer, old/new values

#### Usage Pattern (Mandatory for All Engines)
```javascript
// ✓ CORRECT
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

class CombatEngine {
  calculateDefense() {
    const armoredForAll = HouseRuleService.isEnabled('armoredDefenseForAll');
    // ... use value
  }
}

// ✗ WRONG (will be logged by governance hook)
class OldCode {
  calculateDefense() {
    const armoredForAll = game.settings.get('foundryvtt-swse', 'armoredDefenseForAll');
    // ... use value
  }
}
```

---

### D. VALIDATION & GOVERNANCE SPEC

#### Validation Rules (Run at System Startup)

**Rule 1: All Registered Rules Have DEFAULTS Entry**
```
For each key in game.settings registered for 'foundryvtt-swse':
  IF key NOT in SettingsHelper.DEFAULTS:
    ERROR: "Rule '${key}' registered but missing DEFAULTS entry"
```
- **Severity**: CRITICAL (startup error)
- **Action**: Halt system boot, log file + line where rule registered but DEFAULTS missing

**Rule 2: No Duplicate Registrations**
```
For each rule registration:
  IF second attempt to register same key:
    ERROR: "Rule '${key}' registered twice (duplicate)"
```
- **Severity**: CRITICAL (startup error)
- **Action**: Log both files + line numbers, halt boot

**Rule 3: All DEFAULTS Entries Are Registered**
```
For each key in SettingsHelper.DEFAULTS:
  IF key NOT registered in game.settings:
    ERROR: "DEFAULTS has orphaned entry '${key}' with no registered setting"
```
- **Severity**: CRITICAL (startup error)
- **Action**: Halt boot, log file + line

**Rule 4: No Direct Reads (Governance Enforcement)**
```
On game.settings.get('foundryvtt-swse', key):
  IF NOT called from HouseRuleService.get:
    WARN: "Direct read of '${key}' outside HouseRuleService (SSOT violation)"
         Stack: [caller stack trace]
```
- **Severity**: WARNING (non-blocking) in Phase 2, upgraded to ERROR in Phase 3A
- **Action**: Log to console + audit file, do NOT block call

**Rule 5: Type Matches Registered Type**
```
On HouseRuleService.set(key, value):
  IF typeof(value) !== registered.type:
    ERROR: "Type mismatch for '${key}': got ${typeof value}, expected ${registered.type}"
```
- **Severity**: ERROR (non-blocking, but reported)
- **Action**: Reject the set, log error, do NOT update setting

**Rule 6: No Dead Rules Surfaced in UI**
```
For each rule in HouseRulesApp._getRulesForCategory():
  IF rule status is 'dead-candidate':
    WARN: "Dead-candidate rule '${key}' surfaced in UI (should be hidden)"
```
- **Severity**: WARNING (UI layer only)
- **Action**: Log, optionally hide from UI

#### Governance Enforcement Implementation

**New File**: `scripts/engine/system/HouseRuleValidator.js`
```javascript
export class HouseRuleValidator {
  static validate() {
    const report = {
      timestamp: new Date().toISOString(),
      errors: [],
      warnings: [],
      passed: []
    };
    
    // Apply all 6 rules above
    this._checkMissingDefaults(report);
    this._checkDuplicateRegistrations(report);
    this._checkOrphanedDefaults(report);
    this._checkDeadRulesInUI(report);
    
    // Critical errors block boot
    if (report.errors.length > 0) {
      SWSELogger.error(`[HouseRuleValidator] FAILED with ${report.errors.length} critical errors:`, report.errors);
      throw new Error('House rule validation failed. See console for details.');
    }
    
    // Warnings logged but non-blocking
    if (report.warnings.length > 0) {
      SWSELogger.warn(`[HouseRuleValidator] ${report.warnings.length} warnings:`, report.warnings);
    }
    
    SWSELogger.info(`[HouseRuleValidator] Validation passed. ${report.passed.length} checks OK.`);
    return report;
  }
  
  // ... implementation of _checkMissingDefaults, etc.
}
```

**Bootstrap Integration**: Call in `index.js` at startup
```javascript
Hooks.once('init', async () => {
  const validation = HouseRuleValidator.validate();
  if (!validation.passed) {
    throw new Error('House rule validation failed');
  }
  // Continue initialization
});
```

---

### E. SUBSYSTEM ADAPTER STANDARD

#### Pattern: Owner Engine → Adapter → HouseRuleService

Each domain engine (Combat, Force, Recovery, etc.) gets a dedicated adapter class that:
1. **Reads** house rules through HouseRuleService (SSOT)
2. **Translates** rule values into domain-specific behavior
3. **Validates** state before application
4. **Logs** rule-driven decisions for audit

#### Template Adapter Class

**File**: `scripts/houserules/adapters/YourDomainRulesAdapter.js`
```javascript
/**
 * House Rules Adapter for [Domain]
 * Translates house rule values into [Domain] behavior.
 * SSOT: All rule reads go through HouseRuleService.
 */
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class YourDomainRulesAdapter {
  /**
   * Initialize adapter (call once at startup)
   */
  static initialize() {
    SWSELogger.info('[YourDomainRulesAdapter] Initialized');
  }

  /**
   * Example: Get a boolean rule with logging
   */
  static isFeatureEnabled(ruleKey) {
    const enabled = HouseRuleService.isEnabled(ruleKey);
    SWSELogger.debug(`[YourDomainRulesAdapter] Rule "${ruleKey}" = ${enabled}`);
    return enabled;
  }

  /**
   * Example: Get a string rule with choices validation
   */
  static getChoiceRule(ruleKey, validChoices) {
    const value = HouseRuleService.getString(ruleKey);
    if (!validChoices.includes(value)) {
      SWSELogger.warn(
        `[YourDomainRulesAdapter] Rule "${ruleKey}" has invalid value "${value}". Valid: ${validChoices.join(', ')}`
      );
      return validChoices[0]; // Fallback to first valid choice
    }
    return value;
  }

  /**
   * Example: Get a numeric rule with bounds validation
   */
  static getNumericRule(ruleKey, min = 0, max = Infinity) {
    const value = HouseRuleService.getNumber(ruleKey);
    if (value < min || value > max) {
      SWSELogger.warn(
        `[YourDomainRulesAdapter] Rule "${ruleKey}" = ${value} outside bounds [${min}, ${max}]`
      );
      return Math.max(min, Math.min(max, value));
    }
    return value;
  }

  /**
   * Example: Decision method that uses multiple rules
   */
  static calculateSomeValue(baseValue) {
    const multiplier = this.getNumericRule('someMultiplier', 0.5, 2.0);
    const bonus = this.getNumericRule('someBonus', 0, 10);
    return (baseValue * multiplier) + bonus;
  }

  /**
   * Example: Hook to respond to rule changes
   */
  static onRuleChanged(ruleKey, newValue) {
    SWSELogger.info(`[YourDomainRulesAdapter] Rule "${ruleKey}" changed to ${newValue}`);
    // Re-initialize local state if needed
  }
}

// Register hook to listen for rule changes
Hooks.on('swse:houserule-changed', (ruleKey, newValue) => {
  if (['ruleKey1', 'ruleKey2', 'ruleKey3'].includes(ruleKey)) {
    YourDomainRulesAdapter.onRuleChanged(ruleKey, newValue);
  }
});
```

#### Adapter Requirements Checklist
- [ ] Reads ALL rules through HouseRuleService (never direct game.settings.get)
- [ ] Validates rule values against expected types/ranges
- [ ] Logs all rule-driven decisions (DEBUG level)
- [ ] Handles invalid/missing rules gracefully (fallback to default)
- [ ] Responds to 'swse:houserule-changed' hook
- [ ] Comments explain WHY rules affect behavior (not WHAT—code shows that)
- [ ] No business logic in adapter; only rule translation + validation
- [ ] Adapter is thin (5–50 lines typical, never > 100)

#### Owners → Adapters Mapping
**9+ Owner Engines → 9+ Adapters** (Phase 3A implementation)
```
CharacterGenerationEngine  → CharacterGenerationRulesAdapter
CombatEngine               → CombatRulesAdapter
ForceEngine                → ForceRulesAdapter
RecoveryEngine             → RecoveryRulesAdapter
SkillsEngine               → SkillsRulesAdapter
FeatsEngine                → FeatsRulesAdapter (SAFEST, pilot candidate)
VehiclesEngine             → VehiclesRulesAdapter
HealingEngine              → HealingRulesAdapter
ConditionTrackEngine       → ConditionTrackRulesAdapter
[and others as needed]
```

---

### F. DEPRECATION & ALIAS POLICY

#### Lifecycle Stages
Each rule progresses through these stages:
```
ACTIVE
  ↓ (rule no longer desired)
COMPATIBLE (marked deprecated, still surfaced in UI with warning)
  ↓ (usage audited, zero hits in codebase)
DEPRECATED (removed from canonical UI, hidden from new configs)
  ↓ (all consumers migrated to replacement, scheduled removal announced)
RETIRED (setting still exists for world compat, no new access)
  ↓ (major version bump, safe to delete from Foundry)
REMOVED (deleted from world.json on major version upgrade)
```

#### Deprecation Policy (v1.x Cycle)

**Phase 2–3 (v1.x)**: Mark → Audit → Schedule
1. **Mark**: Add metadata to rule definition
   ```javascript
   register('oldRuleName', {
     name: 'Old Rule Name (DEPRECATED)',
     // ... existing config
     deprecation: {
       since: '1.2.0',
       replacement: 'newRuleName', // or null if no replacement
       message: 'Use newRuleName instead. Will be removed in v2.0.'
     }
   });
   ```

2. **Audit**: Grep for all usages in codebase
   ```bash
   grep -r "oldRuleName" scripts/ --include="*.js"
   ```
   - Document all consumers
   - Plan migration for each consumer
   - Update migration ledger

3. **Schedule**: For v2.0 release notes
   ```
   BREAKING: Deprecated rule 'oldRuleName' removed.
   Migration: Use 'newRuleName' instead (see v1.x changelog for adapter pattern).
   ```

#### Migration Ledger (New File)

**File**: `DEPRECATION_LEDGER.md`
```markdown
# House Rules Deprecation Ledger

## Format
| Rule | Status | Since | Replacement | Consumers | Audit Date | Removal Date |
|------|--------|-------|------------|-----------|------------|--------------|
| oldRuleName | ACTIVE → COMPATIBLE | 1.2.0 | newRuleName | 3 files | 2025-06-XX | 2.0.0 |

## Status Definitions
- ACTIVE: In use, no deprecation planned
- COMPATIBLE: Deprecated but still functional; marked in UI with warning
- DEPRECATED: Removed from UI; only usable via direct query; consumers must migrate
- RETIRED: Setting persists for compat but not documented; will be removed in major version
- REMOVED: Deleted from codebase entirely (major version only)

## Current Entries
[Will fill in Phase 3A after first deprecations are marked]
```

#### Example: Deprecate `secondWindWebEnhancement`
Suppose this rule is dead (no mechanics implemented):

1. **Mark** (Phase 2 scaffolding, optional)
   ```javascript
   register('secondWindWebEnhancement', {
     name: 'Web Enhancement: Second Wind (DEPRECATED)',
     hint: '(This rule has no mechanics and will be removed.)',
     scope: 'world',
     config: true,
     type: Boolean,
     default: false,
     deprecation: {
       since: '1.2.0',
       replacement: null,
       message: 'This rule has no mechanics. It will be removed in v2.0. Simply disable it.'
     }
   });
   ```

2. **Audit** (Phase 3A)
   ```
   secondWindWebEnhancement: 0 consumers (dead), SAFE to hide from UI
   ```

3. **Remove from UI** (Phase 3A)
   - Exclude from HouseRulesApp categories
   - Still accessible via HouseRuleService if world data contains value

4. **Remove from Registry** (v2.0 only)
   - Delete registration
   - Mark DEFAULTS entry as deprecated
   - Document in v2.0 changelog

---

### G. UI OWNERSHIP MODEL

#### Canonical UI: house-rules-app.js (Modern, Unified)
- **Status**: CANONICAL (single source of truth for house rules UI)
- **Path**: `scripts/apps/house-rules-app.js` (401 lines)
- **Categories**: 6 domains (characterCreation, combat, force, recovery, skills, vehicles)
- **Behavior**: Displays active/compatible rules only; deprecated rules hidden but documented
- **Scope**: All GMs; players see read-only view (GM-only toggles)
- **Design**: Modern ApplicationV2, holo-cyber theme, organized by family

#### Legacy UI: houserule-menus.js (Deprecated, Fragmented)
- **Status**: DEPRECATED (8 FormApplication classes, overlaps with modern app)
- **Path**: `scripts/houserules/houserule-menus.js` (603 lines)
- **Classes**: CharacterCreationMenu, AdvancementMenu, CombatMenu, ForceMenu, PresetsMenu, SkillsFeatsMenu, SpaceCombatMenu, CharacterRestrictionsMenu
- **Action**: Phase 3B will migrate any unique functionality to house-rules-app.js, then deprecate file

#### UI Requirements

**house-rules-app.js Must:**
1. ✓ Display all ACTIVE rules in their categories
2. ✓ Display all COMPATIBLE rules with deprecation warning
3. ✓ Hide DEPRECATED rules (but still readable from world data)
4. ✓ Show rule descriptions + current values
5. ✓ Allow GM-only toggle for boolean rules
6. ✓ Allow GM-only value selection for choice/string rules
7. ✓ Log all changes (via HouseRuleService.set)
8. ✓ Respond to 'swse:houserule-changed' hook (update live)
9. ✓ Provide "Reset to Default" option per rule
10. ✓ Provide "Export Rules as JSON" for preset sharing

**Current gaps (Phase 3B improvement, not Phase 2):**
- houserule-menus.js provides preset system (PresetsMenu) — move to app
- houserule-menus.js provides class-tree overrides (CharacterCreationMenu) — move to app
- No advanced section (hidden/internal rules visible only in JSON)

---

### H. SETTINGSHELPER DEFAULTS ALIGNMENT

#### Current State
- **File**: `scripts/utils/settings-helper.js` (300+ lines)
- **DEFAULTS dict**: ~170 entries
- **Issues**: 4 missing orphaned rules, 2 duplicates (darkSideMaxMultiplier, allowSuiteReselection)

#### Required Alignment (Phase 2 Scaffolding)

**Step 1: Add Missing DEFAULTS Entries**
```javascript
static DEFAULTS = {
  // ... existing entries (~170)
  
  // ADD THESE 4 ORPHANED RULES
  enableFollowerBackgrounds: false,
  enableDarkSideTreeAccess: false,
  classTreeAccessMenu: {}, // Not a real rule, but remove from registry/DEFAULTS
  classTreeOverrides: {},
  
  // KEEP SINGLE ENTRY FOR DUPLICATES (removed from core/settings.js)
  darkSideMaxMultiplier: 1,
  allowSuiteReselection: false,
  
  // ADD EPIC OVERRIDE (from separate file)
  epicOverride: false,
  
  // Total should be 144 entries (1 per rule)
};
```

**Step 2: Remove Duplicates from DEFAULTS**
- Grep for duplicate keys in DEFAULTS dict
- Verify both instances are identical (same default value, same type)
- Keep single entry, remove duplicate

**Step 3: Validate Alignment at Startup**
```javascript
// In HouseRuleValidator.validate()
const registeredKeys = Object.keys(game.settings._settings['foundryvtt-swse'] || {});
const defaultsKeys = Object.keys(SettingsHelper.DEFAULTS);

if (registeredKeys.sort().join(',') !== defaultsKeys.sort().join(',')) {
  const missing = defaultsKeys.filter(k => !registeredKeys.includes(k));
  const orphaned = registeredKeys.filter(k => !defaultsKeys.includes(k));
  
  if (missing.length > 0) {
    throw new Error(`DEFAULTS missing registered rules: ${missing.join(', ')}`);
  }
  if (orphaned.length > 0) {
    throw new Error(`DEFAULTS has orphaned entries: ${orphaned.join(', ')}`);
  }
}
```

#### Type Correspondence
For each DEFAULTS entry, the type must match the registered setting:
```javascript
// Rule registered as Number:
register('pointBuyPool', { type: Number, default: 32 });
// DEFAULTS must have:
pointBuyPool: 32,  // typeof === 'number'

// Rule registered as String with choices:
register('abilityScoreMethod', { type: String, choices: {...}, default: '4d6drop' });
// DEFAULTS must have:
abilityScoreMethod: '4d6drop',  // typeof === 'string'

// Rule registered as Boolean:
register('allowDroidDestiny', { type: Boolean, default: false });
// DEFAULTS must have:
allowDroidDestiny: false,  // typeof === 'boolean'

// Rule registered as Object:
register('classTreeOverrides', { type: Object, default: {} });
// DEFAULTS must have:
classTreeOverrides: {},  // typeof === 'object'
```

---

### I. TINY SAFE SCAFFOLDING PLAN (Optional Phase 2 Edits)

These are **non-behavioral, non-migration** edits that prepare the infrastructure for Phase 3A without changing any game logic.

#### Edit 1: Activate HouseRuleValidator at Startup

**File**: `index.js`
```javascript
// Add to Hooks.once('init', ...)
Hooks.once('init', async () => {
  // ... existing init code ...
  
  // Validate house rules configuration
  const HouseRuleValidator = (await import("/systems/foundryvtt-swse/scripts/engine/system/HouseRuleValidator.js")).HouseRuleValidator;
  const validation = HouseRuleValidator.validate();
  
  if (validation.errors.length > 0) {
    throw new Error('[SWSE] House rule validation failed. See console for details.');
  }
});
```

**Effect**: Non-breaking change. Validation runs in background, errors logged. Phase 2 keeps warnings only. Phase 3A upgrades critical errors to hard stops.

#### Edit 2: Activate Direct-Read Governance Hook

**File**: `scripts/engine/system/HouseRuleService.js`
```javascript
// Add to class definition
static _activateGovernanceHook() {
  const originalGet = game.settings.get;
  game.settings.get = function (namespace, key) {
    if (namespace === 'foundryvtt-swse') {
      const stack = new Error().stack;
      if (!stack.includes('HouseRuleService.get') && !stack.includes('SettingsHelper')) {
        SWSELogger.warn(
          `[GOVERNANCE] Direct game.settings.get("${namespace}", "${key}") detected outside HouseRuleService. This violates SSOT.`,
          { caller: stack.split('\n')[2] }
        );
      }
    }
    return originalGet.call(this, namespace, key);
  };
}
```

**Integration**: Call in Hooks.once('init')
```javascript
HouseRuleService._activateGovernanceHook();
```

**Effect**: Non-breaking change. All 400+ direct reads logged as warnings. Developers see audit trail. Phase 3A will upgrade to routing (not errors—just routing through service).

#### Edit 3: Add Deprecation Metadata to Dead-Candidate Rules (Optional)

**File**: `scripts/houserules/houserule-settings.js`
```javascript
// Mark rules with no mechanics as deprecated (no behavior change, just metadata)
register('secondWindWebEnhancement', {
  name: 'Web Enhancement: Second Wind (DEPRECATED — No Mechanics)',
  hint: 'This rule has been implemented. Disabling has no effect. Will be removed in v2.0.',
  scope: 'world',
  config: true,
  type: Boolean,
  default: false,
  deprecated: true  // Mark for UI to hide
});
```

**Effect**: Non-breaking. Rules still readable/writable but flagged for deprecation. UI can hide deprecated rules.

#### Edit 4: Create Deprecation Ledger (Optional)

**File**: `DEPRECATION_LEDGER.md` (new file)
```markdown
# House Rules Deprecation Ledger

## Status: Phase 2 (Initialization)

| Rule | Status | Since | Replacement | Reason |
|------|--------|-------|-------------|--------|
| secondWindWebEnhancement | ACTIVE | 1.0.0 | (remove) | No mechanics implemented |
| enableFollowerBackgrounds | COMPATIBLE | 1.2.0 | (remove) | Orphaned rule, never registered at startup |
| classTreeAccessMenu | COMPATIBLE | 1.2.0 | (remove) | Legacy menu system, deprecated in favor of house-rules-app |

(More to add during Phase 3A)
```

**Effect**: Non-breaking. Documentation only. Guides Phase 3A audit.

#### Edit 5: Add HouseRuleValidator Implementation

**File**: `scripts/engine/system/HouseRuleValidator.js` (new file)
```javascript
// (See section D for full implementation)
// Implements Rules 1–6 from Validation & Governance Spec

export class HouseRuleValidator {
  static validate() {
    const report = { ... };
    // Check all 6 rules
    // Return report with errors[] and warnings[]
  }
}
```

**Effect**: Non-breaking infrastructure. Validation runs, reports logged, errors warn (not block) in Phase 2.

---

### J. OPTIONAL PILOT: FEATS RULES ADAPTER (Safest Family)

#### FeatRules Family Assessment

**Rules in Family** (8 rules, all ACTIVE):
1. weaponFinesseDefault → Boolean (default combat feat)
2. pointBlankShotDefault → Boolean
3. powerAttackDefault → Boolean
4. preciseShotDefault → Boolean
5. dodgeDefault → Boolean
6. skillFocusVariant → String (normal/alternate calculation)
7. skillFocusActivationLevel → Number (level at which bonus applies)
8. talentEveryLevel → Boolean (gain talent every level vs odd levels)

**Safety Assessment**:
- ✓ All rules are ACTIVE (no dead-candidates)
- ✓ No interdependencies with other families
- ✓ Behavior is **localized** (only affects character sheet → calculate modifiers)
- ✓ No side effects on game state
- ✓ No complex branching logic
- ✓ Consumer is single engine: FeatsEngine (hypothetical owner)
- ✓ Adapter can be thin (< 50 lines, simple getters)

**Pilot Scope**:
Create `scripts/houserules/adapters/FeatsRulesAdapter.js` that:
1. Reads 8 rules through HouseRuleService
2. Validates values (e.g., skillFocusActivationLevel ∈ [1, 20])
3. Provides 3 methods for FeatsEngine:
   - `getDefaultCombatFeats()` → returns array of default feat keys
   - `getSkillFocusBonus(level)` → returns bonus based on variant + level
   - `talentGrantPerLevel()` → returns boolean

**Pilot Deliverable**:
- FeatsRulesAdapter.js (50 lines)
- Tests showing reads go through HouseRuleService
- Validation that rule values match expected ranges
- No changes to FeatsEngine (adapter is standalone)

**Pilot Risk**: MINIMAL
- Adapter doesn't touch game logic
- No behavior changes if not used
- Can be deleted without affecting system
- Safe rollback

**Decision Point**: If pilot passes validation, keep adapter as template for Phase 3A. If any issues, provide feedback for adapter standard refinement.

---

### K. PHASE 3 READINESS CHECKLIST

**Prerequisites for Phase 3A (Feat Rules Pilot + Routing)**:

- [ ] **Phase 2 Deliverables Approved**: A–J reviewed and signed off
- [ ] **Canonical Registry Complete**: All 144 rules in houserule-settings.js, no duplicates/orphans
- [ ] **HouseRuleService Contract Finalized**: get/set/validate methods clear, no ambiguity
- [ ] **HouseRuleValidator Implemented**: Rules 1–6 passing, validation report generated
- [ ] **Governance Hook Active**: Direct reads logged, audit trail flowing
- [ ] **DEFAULTS Aligned**: 144 entries, 1:1 match with registered rules, types validated
- [ ] **Adapter Standard Approved**: Template + requirements clear, no ambiguity
- [ ] **UI Ownership Declared**: house-rules-app.js marked canonical, deprecated rules hidden (or UI refactor deferred to 3B)
- [ ] **Deprecation Ledger Seeded**: Dead-candidates identified, scheduled for removal
- [ ] **FeatsRulesAdapter Pilot (if exec'd)**: Implemented, tested, feedback incorporated
- [ ] **No Regressions**: Full test suite passing, no broken mechanics, no new error logs

**Phase 3A will NOT proceed if**:
- Canonical registry incomplete (duplicates/orphans remain)
- HouseRuleValidator fails critical checks
- Adapter standard has ambiguities
- FeatsRulesAdapter pilot reveals issues with service/governance patterns

**Phase 3A Scope** (if approved):
1. Execute FeatsRulesAdapter as working example
2. Route HouseRuleService reads from FeatsEngine (no code changes, just via adapter)
3. Create adapters for 2–3 smaller families (e.g., Recovery, Healing)
4. Validate routing via audit logs (all reads should go through service)
5. Prepare Phase 3B (larger families: Combat, Force)

---

## SUMMARY

### Control Plane Architecture
```
GOVERNANCE LAYER
  ├─ HouseRuleValidator (validate at init)
  ├─ Direct-read hook (governance enforcement)
  └─ Deprecation ledger (track rule lifecycle)

REGISTRY LAYER
  └─ houserule-settings.js (consolidated, single file, 144 rules)

SERVICE LAYER
  └─ HouseRuleService.get/set/validate (SSOT access, typed)

ADAPTER LAYER (per domain engine)
  ├─ FeatsRulesAdapter
  ├─ CombatRulesAdapter
  ├─ ForceRulesAdapter
  └─ ... (9+ total)

UI LAYER
  └─ house-rules-app.js (canonical, modern, unified)

DEFAULTS LAYER
  └─ SettingsHelper.DEFAULTS (aligned with registry, 144 entries, types validated)
```

### Non-Negotiable Constraints
- **No behavior migration** in Phase 2 (only design + tiny scaffolding)
- **No direct reads** allowed (routed through service)
- **No split registries** (consolidated to one)
- **No dead rules** in active UI
- **No duplicate** registrations
- **No breaking changes** to world data

### Phase 2 Completion Criteria
- [ ] All deliverables A–K documented (this file)
- [ ] Canonical registry path defined + merge plan written
- [ ] HouseRuleService contract defined + validation spec clear
- [ ] Governance rules 1–6 defined + validator code ready
- [ ] Adapter standard templated + requirements clear
- [ ] Deprecation lifecycle defined + ledger seeded
- [ ] UI ownership declared + deprecation hiding mechanism designed
- [ ] DEFAULTS alignment plan written + validation logic designed
- [ ] Scaffolding edits optional (if proceeding to 3A, include; otherwise defer)
- [ ] FeatsRulesAdapter pilot optional (if safe, implement as reference)
- [ ] Phase 3 readiness checklist populated + review gated

---

**END OF PHASE 2 CONTROL PLANE DESIGN**

**Next Step**: User reviews deliverables A–K. Approves or requests refinement. Upon approval, Phase 3A execution begins (if scaffolding + pilot approved).


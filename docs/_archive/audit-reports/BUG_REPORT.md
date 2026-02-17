# Foundry VTT SWSE Codebase Bug Report

**Report Generated**: 2026-01-01
**Scan Scope**: Full codebase analysis including security vulnerabilities, logic errors, and type issues

---

## Executive Summary

- **Total Issues Found**: 11+ bugs
- **Critical Issues**: 3
- **High Severity**: 2
- **Medium Severity**: 3
- **Low Severity**: 3+

---

## CRITICAL SEVERITY ISSUES

### 1. XSS Vulnerabilities - User-Controlled Data in HTML Templates

**Files Affected**:
- `scripts/components/combat-action-bar.js` (lines 55, 200, 215, 273, 297)
- `scripts/components/force-suite.js` (lines 114, 268)
- `scripts/components/condition-track.js` (lines 104-105)
- `scripts/combat/damage-system.js` (line 76)

**Issue**: Actor names and other user-controlled data are directly inserted into HTML templates via template literals without sanitization before rendering via `innerHTML`.

**Examples**:
```javascript
// Line 55 in combat-action-bar.js
<h3><i class="fa-solid fa-swords"></i> ${actor.name} — Combat</h3>

// Line 273 in combat-action-bar.js
content: `<b>${actor.name}</b> regains <strong>${heal}</strong> HP!`

// Line 297 in combat-action-bar.js
${weapons.map(w => `<option value="${w.id}">${w.name}</option>`).join("")}
```

**Attack Vector**: If an actor name contains HTML/JS code (e.g., `<img src=x onerror=alert('xss')>`), it executes when rendered.

**Fix**: Use `escapeHTML()` from security-utils.js:
```javascript
// Instead of: <h3>${actor.name}</h3>
<h3>${escapeHTML(actor.name)}</h3>
```

---

### 2. HTML Sanitization Logic Flaw

**File**: `scripts/utils/security-utils.js:64-66`

**Issue**: Optional chaining in element removal silently fails if parentNode is null.

```javascript
if (!allowedTags.includes(el.tagName.toLowerCase())) {
  const textNode = document.createTextNode(el.textContent);
  el.parentNode?.replaceChild(textNode, el);  // Silently fails if null
}
```

**Problem**: Dangerous elements could remain in sanitized output if parentNode is null.

**Fix**:
```javascript
if (el.parentNode) {
  el.parentNode.replaceChild(textNode, el);
} else {
  el.remove();
}
```

---

### 3. Null Reference Exception - Force Points Access

**File**: `scripts/combat/rolls/enhanced-rolls.js:166-177`

**Issue**:
- Accesses `actor.system.forcePoints.value` without defensive null checking
- Uses stale actor references after async update

```javascript
await actor.update({
  "system.forcePoints.value": Math.max(0, actor.system.forcePoints.value - 1)
});
// actor reference may be stale here
<p>FP Remaining: ${actor.system.forcePoints.value}/${actor.system.forcePoints.max}</p>
```

**Fix**:
```javascript
const currentFP = actor.system.forcePoints?.value ?? 0;
const maxFP = actor.system.forcePoints?.max ?? 0;
if (currentFP <= 0) return 0;

await actor.update({
  "system.forcePoints.value": Math.max(0, currentFP - 1)
});

const newFP = Math.max(0, currentFP - 1);
// Use calculated value instead of stale reference
```

---

## HIGH SEVERITY ISSUES

### 4. Race Condition in Character Generation

**File**: `scripts/apps/chargen/chargen-main.js:698-710`

**Issue**: Non-atomic check-then-create pattern allows concurrent operations to create duplicate actors.

```javascript
if (!this.actor) {  // Not atomic
  const isValid = await this._validateFinalCharacter();
  if (!isValid) return;
  await this._createActor();
}
```

**Fix**: Add re-entry guard:
```javascript
if (this.currentStep === "summary" && nextStep === "shop" && !this._creatingActor) {
  this._creatingActor = true;
  try {
    // creation logic
  } finally {
    this._creatingActor = false;
  }
}
```

---

### 5. Array Boundary Logic Issues

**File**: `scripts/apps/upgrade-rules-engine.js:277, 296, 441, 468`

**Issue**: Array access after indexOf without consistent validation.

```javascript
let idx = order.indexOf(this.currentStep);
if (idx < order.length - 1) this.currentStep = order[idx + 1];
```

**Problem**: If `indexOf()` returns -1, then `idx + 1 = 0`, causing unintended navigation.

**Fix**: Validate indexOf result:
```javascript
let idx = order.indexOf(this.currentStep);
if (idx >= 0 && idx < order.length - 1) this.currentStep = order[idx + 1];
```

---

## MEDIUM SEVERITY ISSUES

### 6. Missing Error Handling in Force Points Update

**File**: `scripts/combat/rolls/enhanced-rolls.js:165-167`

**Issue**: No try-catch around actor.update(), so failed operations still show success.

```javascript
await actor.update({
  "system.forcePoints.value": Math.max(0, actor.system.forcePoints.value - 1)
});
// If update fails, message is still sent claiming FP was spent
```

---

### 7. String Destructuring Without Validation

**File**: `scripts/utils/string-utils.js:119-128`

**Issue**: Regex destructuring doesn't validate array length before access.

---

### 8. Inconsistent Navigation Index Handling

**File**: `scripts/apps/levelup/levelup-enhanced.js:158-159`

**Issue**: Navigation doesn't validate indexOf result.

```javascript
let idx = order.indexOf(this.currentStep);
if (idx < order.length - 1) this.currentStep = order[idx + 1];
// If idx = -1, sets to order[0] unintentionally
```

---

## LOW SEVERITY ISSUES

### 9. Missing Radix in parseInt Calls

**Issue**: `parseInt()` calls throughout codebase lack radix parameter.

**Files**:
- `scripts/utils/string-utils.js`
- `scripts/data-models/character-data-model.js`

**Fix**: Always use radix 10:
```javascript
parseInt(value, 10)  // Instead of parseInt(value)
```

---

### 10. Inconsistent Null Check Patterns

**File**: `scripts/data-models/character-data-model.js`

**Issue**: Mix of `!== undefined`, `!== null && !== undefined`, and nullish coalescing operators.

**Fix**: Standardize on nullish coalescing:
```javascript
const value = this.field ?? fallback;
```

---

### 11. Unhandled Promise Rejections

**Issue**: Many async operations lack error handlers throughout codebase.

---

## VEHICLE AND DROID NORMALIZATION ISSUES (DETAILED ANALYSIS)

### CRITICAL: Vehicle Property Name Mismatches

#### Hull Property - TEMPLATE BROKEN
**File**: `templates/actors/vehicle/vehicle-callouts.hbs:19-21, 46-48`
**File**: `templates/actors/vehicle/vehicle-image.hbs:15-20`

**Issue**:
- Data model defines: `hull.value` and `hull.max`
- Templates access: `hull.current` (does not exist)
- Result: Hull damage display fails, shows undefined

**Lines to Fix**:
- Line 19: Change `{{actor.system.hull.current}}` to `{{actor.system.hull.value}}`
- Line 46: Change `{{actor.system.hull.current}}` to `{{actor.system.hull.value}}`
- Line 20: Change `{{actor.system.shields.current}}` to `{{actor.system.shields.value}}`
- Line 38: Change `{{actor.system.shields.current}}` to `{{actor.system.shields.value}}`

#### Shields Property - TEMPLATE BROKEN
**File**: `templates/actors/vehicle/vehicle-callouts.hbs:20, 38, 40`

**Issue**:
- Data model defines: `shields.value` and `shields.max`
- Templates access: `shields.current` (does not exist)
- Combat tab references: `shields.rating` (undefined)
- Result: Shield display broken

#### Damage Reduction Property - TEMPLATE BROKEN
**File**: `templates/actors/vehicle/vehicle-callouts.hbs:58`

**Issue**:
- Data model defines: `damageReduction`
- Template accesses: `dr` (does not exist)
- Result: Always shows 0

**Fix**: Change line 58 to use `actor.system.damageReduction`

---

### CRITICAL: Droid Missing/Wrong Property References

#### Processor Quality Property Mismatch
**Files**:
- `scripts/actors/droid/swse-droid-handler.js:113-118` (sets processor.quality)
- `templates/actors/droid/droid-callouts-blueprint.hbs:16` (accesses processor.tier)
- `templates/actors/droid/droid-callouts-operational.hbs:12` (accesses processor.tier)

**Issue**: Handler sets `processor.quality` but templates look for `processor.tier`

**Fix**: Change template references from `processor.tier` to `processor.quality`

#### Missing Properties Referenced in Templates
**File**: `templates/actors/droid/droid-callouts-blueprint.hbs:17, 18, 20`
**File**: `templates/actors/droid/droid-callouts-operational.hbs:13, 14, 15`

**Properties that don't exist in data model**:
- `memory.capacity` (Line 17, 13) - Property entirely missing
- `power.rating` (Line 18, 14) - Property entirely missing
- `chassis.type` (Line 20, 15) - Property entirely missing

**Issue**: Templates reference these properties but they're not defined anywhere in the droid data structure

**Fix Options**:
1. Add these fields to character data model for droids
2. Remove these from templates and replace with available data

#### Health Property Naming
**File**: `templates/actors/droid/droid-callouts-operational.hbs:17`

**Issue**: References `actor.system.health.value` and `actor.system.health.max`
- Droid model uses `hp.value` and `hp.max`, not `health.value/max`

**Fix**: Change to `actor.system.hp.value` and `actor.system.hp.max`

---

### CRITICAL: Character Health/Recovery System - BROKEN PATHS

#### Health Property Path Mismatch
**Files**:
- `scripts/data-models/character-data-model.js:107` (defines as `hp`)
- `scripts/houserules/houserule-healing.js:92, 106, 117, 126, 136, 141` (accesses as `system.health.hp.value`)
- `scripts/houserules/houserule-recovery.js:109, 116` (accesses as `system.health.hp.value`, `system.health.vp.value`)

**Critical Issue**: Healing and recovery scripts use wrong path for health data

**Current Code in houserule-healing.js**:
```javascript
await target.update({ "system.health.hp.value": newHP }); // WRONG
```

**Should Be**:
```javascript
await target.update({ "system.hp.value": newHP }); // CORRECT
```

**Lines Needing Fix**:
- houserule-healing.js: 92, 106, 117, 126, 136, 141 (all health.hp.value → hp.value)
- houserule-recovery.js: 109, 116 (health.hp.value → hp.value)
- houserule-recovery.js: Check for system.health.vp.value references (undefined)

---

### HIGH: Weapon Property Name Inconsistency (262 Vehicles Affected)

**Files**:
- `scripts/data-models/vehicle-data-model.js:491` (defines as `bonus`)
- `scripts/actors/vehicle/swse-vehicle-core.js:246` (uses `attackBonus`)
- `scripts/actors/vehicle/swse-vehicle-handler.js:147` (sets `attackBonus`)

**Issue**: Data model field named `bonus` but code uses `attackBonus`

**Additional Issue**: 262 out of 357 vehicles have corrupted weapon arrays containing category tags instead of weapon data:
```json
"weapons": [
  {"name": "Categories :"},
  {"name": "Vehicles"},
  {"name": "Planetary Vehicles"}
]
```

**Fix**: Standardize on single property name (recommend `attackBonus` as it's more descriptive) and migrate legacy data

---

### HIGH: Droid Locomotion System Structure Mismatch

**Files**:
- `scripts/data-models/actor-data-model.js:54-60` (expects `.id` and `.speedBySize`)
- `scripts/actors/droid/swse-droid-handler.js:91-105` (stores `name`, `baseSpeed`, `restricted`, `restrictionType`)
- `templates/actors/droid/droid-callouts-blueprint.hbs:19` (accesses locomotion.type)

**Issue**: Handler stores different properties than what data model expects for speed calculations

**Handler stores**:
```javascript
{
  name: locomotionItem.name,
  baseSpeed: locomotionItem.system.baseSpeed,
  restricted: locomotionItem.system.restricted,
  restrictionType: locomotionItem.system.restrictionType
}
```

**Data model expects**:
```javascript
const loco = system.locomotion.find(l => l.id === system.activeLocomotion);
if (loco?.speedBySize) {
  system.speed = loco.speedBySize[system.size] ?? system.speed;
}
```

**Fix**: Refactor handler to include `.id` and `.speedBySize` properties in stored locomotive data

---

### HIGH: Droid Crew Position Type Inconsistency

**Files**:
- `scripts/data-models/vehicle-data-model.js:497-522` (defines as objects with `{name, uuid}`)
- `scripts/actors/vehicle/swse-vehicle.js:56` (checks `typeof data === "string"`)
- `scripts/actors/vehicle/swse-vehicle-handler.js` (mixed handling)

**Issue**: Legacy data stored crew positions as strings; current model uses objects. Code has mixed type handling that's incomplete.

**Fix**: Create migration to ensure all crew positions are consistently objects with `{name, uuid}` structure

---

### MEDIUM: Missing Null Checks for Droid Armor

**File**: `scripts/actors/droid/swse-droid-handler.js:175-192`

**Issue**: Properties accessed without null checks:
- `droidArmor.armorBonus`
- `droidArmor.maxDex`
- `droidArmor.armorCheckPenalty`

**Missing Validation**:
- `droidArmor.installed` flag set but character data model doesn't define this field
- No fallback if these properties are undefined

**Fix**: Add defensive null checks and establish field definitions

---

### MEDIUM: Appendage Type Validation Missing

**File**: `scripts/actors/droid/swse-droid-handler.js:127-139`

**Issue**: Appends items with `type` property that could be undefined:
```javascript
appendages.push({
  name: appendageItem.name,
  type: appendageItem.system.type, // Could be undefined
  // ...
});
```

**Fix**: Add validation for type property and provide defaults

---

### MEDIUM: Character Combat Tab References Undefined Property

**File**: `templates/actors/character/tabs/combat-tab.hbs`

**Issue**: References `shields.rating` which doesn't exist for characters (shields are vehicle/droid only)

**Fix**: Remove shield references from character combat tab or add field to character data model if needed

---

## Summary Table: Normalization Issues

| Issue | Type | Severity | Impact | Status |
|-------|------|----------|--------|--------|
| hull.current vs hull.value | Property Naming | CRITICAL | Hull display broken | Template line 19 |
| shields.current vs shields.value | Property Naming | CRITICAL | Shield display broken | Template lines 20, 38, 40 |
| damageReduction vs dr | Property Naming | CRITICAL | DR display broken | Template line 58 |
| processor.tier vs processor.quality | Property Naming | CRITICAL | Processor display wrong | Template lines 16, 12 |
| memory.capacity undefined | Missing Field | CRITICAL | Display broken/error | Template lines 17, 13 |
| power.rating undefined | Missing Field | CRITICAL | Display broken/error | Template lines 18, 14 |
| chassis.type undefined | Missing Field | CRITICAL | Display broken/error | Template lines 20, 15 |
| health vs hp (characters) | Path Mismatch | CRITICAL | Healing/recovery broken | 9 lines total |
| health.vp.value undefined | Missing Property | CRITICAL | Recovery broken | houerule-recovery.js |
| bonus vs attackBonus | Property Naming | HIGH | Weapon bonus wrong | 3 files |
| Corrupted weapon arrays | Data Quality | HIGH | 262 vehicles lose weapons | swse-vehicle-core.js |
| locomotion structure mismatch | Structural | HIGH | Speed calculation broken | droid handler/model |
| crew position string/object | Type Inconsistency | MEDIUM | Crew assignment broken | vehicle handler |
| droidArmor property checks | Missing Validation | MEDIUM | Runtime errors possible | 1 file |
| appendage type validation | Missing Check | MEDIUM | Runtime errors possible | 1 file |
| character shields.rating | Undefined Reference | LOW | Character display issue | 1 file |

---

## COMPENDIUM DATA QUALITY & NORMALIZATION ISSUES

### CRITICAL: Vehicle Weapons Corruption (262/357 Vehicles)

**Status**: Weapons cleaned during migration but arrays remain EMPTY - NOT YET POPULATED

**File**: `/home/user/foundryvtt-swse/docs/tools/vehicle-migration-summary.md`

**Issue**: During the vehicle migration, corrupted weapons arrays were identified and removed:
```json
// EXAMPLE OF CORRUPTED DATA FOUND:
"weapons": [
  {"name": "Categories :"},
  {"name": "Vehicles"},
  {"name": "Planetary Vehicles"},
  {"name": "Walkers"}
]
```

**Current Status**:
- ✅ All 262 corrupted entries removed
- ✅ All 357 vehicles now have proper but EMPTY weapons arrays
- ❌ **Weapons data never re-populated** - must be added manually or from external source
- **Impact**: All 357 vehicles are missing their weapon specifications
- **Affected Files**: `packs/vehicles.db` (modified 2025-11-15)

**Detection Logic** (from `/home/user/foundryvtt-swse/tools/migrate-vehicles-db.js:107-115`):
```javascript
// Corrupted terms that were found in weapons arrays:
['categor', 'add category', 'vehicles', 'planetary', 'ground', 'speeders',
 'starship', 'water', 'air', 'mandalorian', 'web enhancement']
```

**Recommendation**: Implement weapon population script or manual population procedure

---

### CRITICAL: Ability Score Field Inconsistency Across Data Models

**Issue**: Three different ability score structures exist in codebase, causing calculation inconsistencies

#### Structure 1: Actor Data Model
**File**: `/home/user/foundryvtt-swse/scripts/data-models/actor-data-model.js:30`

Uses: `base`, `racial`, `misc`

```javascript
ability.total = ability.base + ability.racial + ability.misc;
```

#### Structure 2: Character Data Model
**File**: `/home/user/foundryvtt-swse/scripts/data-models/character-data-model.js:174, 190`

Uses: `base`, `racial`, `enhancement`, `temp`

```javascript
const total = ability.base + ability.racial + ability.enhancement + ability.temp;
```

#### Structure 3: Vehicle Data Model
**File**: `/home/user/foundryvtt-swse/scripts/data-models/vehicle-data-model.js:22-35`

Uses: `base`, `racial`, `temp` (missing `enhancement`)

```javascript
const total = ability.base + ability.racial + ability.temp;
```

#### Structure 4: Skills Reference (Inconsistent)
**File**: `/home/user/foundryvtt-swse/scripts/rolls/skills-reference.js:35`

Uses: `base`, `racial`, `misc` (same as actor model)

**Impact**:
- Character ability scores calculated with different formula than vehicles
- Enhancement bonuses ignored in vehicle calculations
- Inconsistent naming across 4+ files causing data confusion and bugs
- New actors may have inconsistent field structure depending on type

**Affected Files**:
1. `/home/user/foundryvtt-swse/scripts/data-models/actor-data-model.js:30`
2. `/home/user/foundryvtt-swse/scripts/data-models/character-data-model.js:174, 190`
3. `/home/user/foundryvtt-swse/scripts/data-models/vehicle-data-model.js:22-35`
4. `/home/user/foundryvtt-swse/scripts/rolls/skills-reference.js:35`
5. `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js` (uses `temp`)

**Fix**: Standardize on ONE field structure across all models:
- Option A: `base, racial, enhancement, temp` (more granular - recommended)
- Option B: `base, racial, misc` (simpler)

**Action Required**: Create migration to convert all existing actors to standard structure

---

### HIGH: Droid Compendium Data Validation Missing

**File**: `/home/user/foundryvtt-swse/scripts/actors/droid/swse-droid-handler.js`
**File**: `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-droid.js:904-910`

**Issue**: No validation that imported droid chassis has all required fields

**Expected Required Fields**:
- `str`, `dex`, `int`, `wis`, `cha` (ability scores)
- `size` (must be one of: tiny, small, medium, large, huge, gargantuan, colossal)
- `speed` (integer)
- `hp` (object with value/max)
- `systemSlots` (integer)

**Current Behavior**:
- Missing fields silently default to fallback values (10 for abilities, "medium" for size)
- No warning to user that droid data is incomplete
- No validation during compendium import or chargen

**Recommendation**:
```javascript
function validateDroidChassis(chassis) {
  const required = ['str', 'dex', 'int', 'wis', 'cha', 'size', 'speed', 'hp'];
  const missing = required.filter(f => chassis[f] === undefined);

  if (missing.length > 0) {
    ui.notifications.warn(`Droid ${chassis.name} missing: ${missing.join(', ')}`);
  }

  const validSizes = ['tiny','small','medium','large','huge','gargantuan','colossal'];
  if (!validSizes.includes(chassis.size?.toLowerCase())) {
    ui.notifications.error(`Droid has invalid size: ${chassis.size}`);
    return false;
  }

  return true;
}
```

---

### HIGH: Item Name and Description Sanitization Missing

**Files**: All item compendium imports
- `/home/user/foundryvtt-swse/scripts/utils/compendium-loader.js`
- `/home/user/foundryvtt-swse/scripts/data-models/item-data-models.js`

**Security Issue**: XSS vulnerability - item names and descriptions not sanitized before import

**Items with HTMLField** (stored as-is without escaping):
- Weapon: `description`
- Armor: `description`
- Equipment: `description`
- Upgrades: `description`

**Current State**:
- Sanitization utility exists: `/home/user/foundryvtt-swse/scripts/utils/validation-utils.js:18-24`
```javascript
export function sanitizeInput(input) {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}
```

- ❌ **Function exists but is NOT USED in any import paths**

**Vulnerability Example**:
```json
// In compendium:
{
  "name": "Blaster<script>alert('xss')</script>",
  "description": "<img src=x onerror='alert(1)'>"
}
// Imported as-is, executes script when rendered
```

**Recommendation**:
1. Apply `sanitizeInput()` to item names when importing
2. Validate HTML in description fields before save
3. Add XSS protection hook to compendium-loader.js
4. Add input validation to item creation forms

---

### HIGH: Vehicle Crew Position Data Format Mismatch

**File**: `/home/user/foundryvtt-swse/scripts/data-models/vehicle-data-model.js:664`

**Issue**: Code expects crew positions as strings but model defines them as objects

**Data Model Definition** (line 497-522):
```javascript
crewPositions: new fields.SchemaField({
  pilot: new fields.SchemaField({
    name: new fields.StringField(),
    uuid: new fields.StringField()
  }),
  // ... other positions
})
```

**Code Accessing as String** (line 664):
```javascript
_getPilot() {
  const pilot = this.crewPositions?.pilot;
  return typeof pilot === 'string' ? pilot : pilot?.name;
}
```

**Problem**: Migration converted crew from strings to objects, but not all code updated

**Affected Crew Positions**: pilot, copilot, gunner, engineer, shields, commander

**Recommendation**: Ensure all vehicles have crew positions in `{name, uuid}` format, not strings

---

### MEDIUM: Compendium Loader Has No Data Validation

**File**: `/home/user/foundryvtt-swse/scripts/utils/compendium-loader.js`

**Issue**: Loads and caches compendium data without validating schema compliance

**Missing Validation**:
1. No check that loaded documents match expected schema
2. No detection of corrupted or incomplete data
3. No error recovery for invalid entries
4. Silent failures if required fields missing

**Validation Functions That Exist But Aren't Used**:
- `isValidNumber()` - not used in weapon/armor import
- `isValidAbilityScore()` - not used in droid import
- `isValidLevel()` - not used anywhere
- `isValidDiceNotation()` - not used in weapon import
- `sanitizeInput()` - not used in item import

**All located in**: `/home/user/foundryvtt-swse/scripts/utils/validation-utils.js`

**Recommendation**: Add validation hooks to compendium-loader.js
```javascript
async load(packName, options = {}) {
  // ... existing code ...

  if (!forceReload && !options.skipValidation) {
    for (const doc of result) {
      if (!this._validateDocument(doc)) {
        SWSELogger.warn(`Invalid document in ${packName}: ${doc.name}`);
      }
    }
  }
}
```

---

### MEDIUM: Size Value Normalization Incomplete

**Issue**: Size values should be lowercase but inconsistent validation

**Expected Format**: `tiny, small, medium, large, huge, gargantuan, colossal`

**Where Fixed**:
- ✅ Vehicle data model shimData (lines 14-20)
- ✅ Droid handler size array (line 266) - includes "colossal" fix
- ✅ Actor validation migration

**Where Not Documented**:
- No single source of truth for size values
- No validation that uppercase "Colossal" normalizes to "colossal"
- Multiple places have duplicated size definitions

**Recommendation**: Create centralized SIZE_CONSTANTS and use throughout

---

### MEDIUM: Speed Field Type Inconsistency

**Issue**: Different actor types use different types for speed

**Characters**: `speed` as integer (6, 8, etc.)
- File: `/home/user/foundryvtt-swse/scripts/data-models/character-data-model.js:113`
- Type: `NumberField`

**Vehicles**: `speed` as string ("12 squares (Character Scale)")
- File: `/home/user/foundryvtt-swse/scripts/data-models/vehicle-data-model.js:18-20`
- Type: `StringField`
- Migration normalizes format (uppercase → lowercase)

**Droid**: `speed` as integer (inherited from character)
- But displayed differently in templates

**Impact**: Templates and scripts must handle speed differently depending on actor type

**Recommendation**: Rename vehicle `speed` to `speedDescription` for clarity, or standardize type

---

### LOW: Droid Import Validation Warnings

**File**: `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-droid.js:904-910`

**Issue**: When importing droid type from compendium, no validation that data is complete

**Current Code**:
```javascript
// Just uses the data as-is, no validation
```

**Should Validate**:
- Required ability scores present
- Valid size value
- Speed value is positive integer
- HP value structure complete

---

## DATA SANITIZATION RECOMMENDATIONS

### Priority 1: CRITICAL - Security Issues

1. **Item Name Sanitization**
   - **Issue**: Item names from compendium could contain HTML/JS
   - **Solution**: Apply sanitizeInput() to all imported item names
   - **Files to Update**:
     - `/home/user/foundryvtt-swse/scripts/utils/compendium-loader.js` (add validation)
     - `/home/user/foundryvtt-swse/scripts/data-models/item-data-models.js` (add clean function)

2. **HTML Description Validation**
   - **Issue**: Description fields allow raw HTML, could contain XSS
   - **Solution**: Validate HTMLField content against whitelist
   - **Implementation**: Update item data model clean functions

3. **Apply Existing Validation Functions**
   - **Issue**: Validation utils exist but not used
   - **Solution**: Hook into compendium loader:
     - Apply `isValidDiceNotation()` to weapon damage
     - Apply `isValidAbilityScore()` to droid imports
     - Apply `sanitizeInput()` to all text fields

### Priority 2: HIGH - Data Quality

4. **Implement Compendium Data Validation**
   - **Location**: `/home/user/foundryvtt-swse/scripts/utils/compendium-loader.js`
   - **Add Method**:
     ```javascript
     _validateDocument(doc) {
       // Check required fields based on type
       if (doc.type === 'weapon') return this._validateWeapon(doc);
       if (doc.type === 'armor') return this._validateArmor(doc);
       if (doc.type === 'droid') return this._validateDroid(doc);
       // etc.
     }
     ```

5. **Standardize Ability Score Fields**
   - **Action**: Create migration to standardize all actors to use `base, racial, enhancement, temp`
   - **Files**: Migration script in `/home/user/foundryvtt-swse/scripts/migration/`

6. **Validate Dice Notation**
   - **Issue**: Weapon damage values not validated on import
   - **Solution**: Apply `isValidDiceNotation()` check
   - **Location**: Add to weapon validation in compendium-loader.js

### Priority 3: MEDIUM - Data Consistency

7. **Implement Size Constants**
   - **File**: Create `/home/user/foundryvtt-swse/scripts/constants/size-constants.js`
   - **Export**: Standard size array with case normalization
   - **Usage**: Replace duplicated size arrays throughout codebase

8. **Validate Number Fields on Import**
   - **Issue**: Cost, weight, speed values could be corrupted
   - **Solution**: Use `clean` functions or validation in data models
   - **Implementation**: Already mostly done, but ensure used on import

9. **Crew Position Validation**
   - **Issue**: Old vehicles have string crew, new ones expect objects
   - **Solution**: Create migration to convert all crew to `{name, uuid}` format
   - **Location**: Migration in `/home/user/foundryvtt-swse/scripts/migration/`

### Priority 4: LOW - Documentation

10. **Document Data Structure Standards**
    - **Create**: Data Structure Guide document
    - **Include**:
      - Size format and values
      - Speed field types per actor type
      - Ability score field structure (once standardized)
      - Crew position format
      - Weapon format requirements
      - Armor format requirements

11. **Add Schema Validation Comments**
    - **Location**: Each data model
    - **Include**: Required fields, expected formats, validation rules

---

## IMMEDIATE ACTION ITEMS (Ordered by Impact)

### MUST DO FIRST:
1. **Standardize ability score fields** - affects all character/vehicle/droid calculations
   - Creates migration script
   - Updates 4+ data models
   - Prevents future inconsistencies

2. **Add item name sanitization** - security vulnerability
   - Update compendium loader
   - Apply sanitizeInput() to names on import
   - Add XSS testing

3. **Implement compendium validation** - data quality
   - Add validation hooks to loader
   - Use existing validation functions
   - Add per-type validation methods

### HIGH PRIORITY:
4. Populate vehicle weapons (all 357 vehicles are missing weapon data)
5. Validate droid chassis on import (detect incomplete data)
6. Normalize crew position data (string → object migration)
7. Create SIZE_CONSTANTS for consistent values

### MEDIUM PRIORITY:
8. Document data structure standards
9. Add dice notation validation to weapon imports
10. Validate speed values on import
11. Add schema comments to data models

---

## Next Steps (Priority Order)

### CRITICAL FIXES NEEDED FIRST:
1. Fix all template property references (hull, shields, dr, processor, memory, power, chassis, hp)
2. Fix health system paths in healing/recovery scripts
3. Fix locomotion system structure in droid handler
4. Fix weapon property naming consistency
5. Add missing data model fields for droids (memory, power, chassis)

### HIGH PRIORITY:
6. Standardize ability score fields across all models (base, racial, enhancement, temp)
7. Add item name sanitization in compendium loader (security)
8. Implement compendium data validation (use existing validation-utils functions)
9. Populate vehicle weapons (357 vehicles affected)
10. Normalize crew position data (string → {name, uuid} format)
11. Add droid import validation

### MEDIUM PRIORITY:
12. Create SIZE_CONSTANTS for consistency
13. Add null checks for droid armor properties
14. Add validation for appendage type
15. Document data structure standards

---

## ITEM, FEAT, AND TALENT COMPENDIUM NORMALIZATION ISSUES

### CRITICAL: Ability Score `.value` Property Access Bug

**Issue**: Multiple files try to access `abilities[ability].value` but this property does NOT exist in schema

**Files Accessing Non-Existent Property**:
- `/home/user/foundryvtt-swse/scripts/progression/feats/feat-requirements.js:65, 73`
- `/home/user/foundryvtt-swse/scripts/engine/StarshipManeuversEngine.js:225`
- `/home/user/foundryvtt-swse/scripts/apps/levelup/levelup-starship-maneuvers.js:38`
- `/home/user/foundryvtt-swse/scripts/apps/chargen/ability-rolling.js:360`
- `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-droid.js:1009`
- `/home/user/foundryvtt-swse/scripts/progression/engine/equipment-engine.js:272`
- `/home/user/foundryvtt-swse/scripts/utils/prerequisite-validator.js:89`
- `/home/user/foundryvtt-swse/scripts/utils/starship-maneuver-manager.js:126, 210`

**Actual Schema Structure**:
Abilities have: `base`, `racial`, `misc`, `enhancement`, `temp`, `total`, `mod`
- There is NO `.value` field defined

**Code Example - BROKEN**:
```javascript
// feat-requirements.js:65
const score = actor.system.abilities?.[ability]?.value || 10;
```

**Should Be One Of**:
```javascript
const score = actor.system.abilities?.[ability]?.total || 10;  // Calculated total
// OR
const score = actor.system.abilities?.[ability]?.base || 10;   // Base score
```

**Impact**:
- Ability score requirements in feats always fall back to 10 (default)
- Feat requirement validation broken for all ability checks
- Starship maneuver validation broken
- Character generation ability rolling may not work correctly

**Recommendation**: Replace all `.value` accesses with `.total` (for final calculated score) or `.base` (for base score)

---

### HIGH: Prerequisite Field Type Inconsistency

**Issue**: Prerequisites defined with different field types across item compendiums

**Upgrade Data Model** (line 201):
```javascript
prerequisite: new fields.StringField({label: "Prerequisites"}),
```

**Feat Data Model** (line 230):
```javascript
prerequisite: new fields.HTMLField({label: "Prerequisites"}),
```

**Talent Data Model** (line 257):
```javascript
prerequisite: new fields.HTMLField({label: "Prerequisites"}),
```

**Impact**:
- Upgrades store prerequisites as plain text
- Feats/talents store as HTML (can contain formatting)
- Prerequisite validation code doesn't account for type difference
- Searching/filtering prerequisites may fail due to type mismatch

**Recommendation**: Standardize on single type (recommend HTMLField for consistency with feats/talents)

---

### HIGH: Ability Score `.total` vs `.base` Inconsistency in Chargen

**File**: `/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-main.js:159-160`

**Issue**: Chargen conflates `.total` and `.value` without clear semantics

```javascript
this.characterData.abilities[key].total = value.total || value.value || 10;
this.characterData.abilities[key].base = value.base || value.value || 10;
```

**Problem**:
- Uses `.value` as fallback for both `.total` and `.base` (but `.value` doesn't exist)
- If `.total` is missing, falls back to non-existent `.value`
- If `.base` is missing, falls back to non-existent `.value`
- No way to distinguish between base and total ability scores

**Recommendation**: Ensure incoming data has both `.base` and derived fields calculated

---

### MEDIUM: Size Field Inconsistency in Item Types

**Weapon Size** (line 41):
```javascript
size: new fields.StringField({initial: "small", label: "Equipment Size"}),
```

**Armor Size** (line 99):
```javascript
size: new fields.StringField({initial: "medium", label: "Armor Size"}),
```

**Equipment Size** (line 147):
```javascript
size: new fields.StringField({initial: "small", label: "Equipment Size"}),
```

**Issues**:
- Weapons default to "small", armor to "medium", equipment to "small"
- No validation that size is from standard list (tiny, small, medium, large, huge, gargantuan, colossal)
- Label "Equipment Size" confusing for weapons/armor
- No enforcement of standard size values

**Recommendation**:
- Use SIZE_CONSTANTS for all three
- Add validators to enforce standard values
- Use consistent labels

---

### MEDIUM: Restriction Field Inconsistency

**Weapon/Armor/Equipment Restriction** (lines 71, 131, 164):
```javascript
restriction: new fields.StringField({initial: "common", label: "Restriction Level"})
```

**Upgrade Availability** (line 188):
```javascript
availability: new fields.StringField({
  initial: "common",
  choices: ["common", "rare", "licensed", "restricted", "military", "illegal"],
  label: "Availability"
}),

restriction: new fields.StringField({
  initial: "common",
  choices: ["common", "licensed", "restricted", "military", "illegal"],
  label: "Restriction Level"
}),
```

**Issues**:
1. **Field Name Inconsistency**: Some use `restriction`, others use `availability`
2. **Value Inconsistency**:
   - Upgrades allow "rare", others don't
   - Upgrade availability has 6 choices, restriction has 5 (missing "rare")
3. **Missing Validation**: Weapons/armor/equipment don't enforce choices
4. **No Case Normalization**: Values could be "Common", "COMMON", "common"

**Recommendation**:
- Standardize on single field name: `restriction`
- Use consistent choice values across all item types
- Add validator to enforce lowercase and standard values

---

### MEDIUM: Feat Type Field Missing Normalization

**File**: `/home/user/foundryvtt-swse/scripts/data-models/item-data-models.js:225-229`

```javascript
featType: new fields.StringField({
  initial: "general",
  choices: ["general", "force", "species"],
  label: "Feat Type"
}),
```

**Issues**:
1. No validation during import ensures feat type is one of choices
2. No case normalization ("General" vs "general")
3. No handling of legacy feat type names if any existed

**Recommendation**: Add clean function to normalize and validate feat types

---

### MEDIUM: Feat and Talent Uses Tracking Different

**Feat Uses** (lines 242-246):
```javascript
uses: new fields.SchemaField({
  current: new fields.NumberField({initial: 0, min: 0, integer: true}),
  max: new fields.NumberField({initial: 0, min: 0, integer: true}),
  perDay: new fields.BooleanField({initial: false})
})
```

**Talent Uses** (lines 262-267):
```javascript
uses: new fields.SchemaField({
  current: new fields.NumberField({initial: 0, min: 0, integer: true}),
  max: new fields.NumberField({initial: 0, min: 0, integer: true}),
  perEncounter: new fields.BooleanField({initial: false}),
  perDay: new fields.BooleanField({initial: false})
})
```

**Issue**:
- Feats use `perDay`
- Talents use both `perEncounter` AND `perDay`
- No validation on data ensures consistency
- Templates may expect different structure for feats vs talents

**Recommendation**: Standardize structure and add validation

---

### MEDIUM: Missing Fields in Feat Data Model

**File**: `/home/user/foundryvtt-swse/scripts/data-models/item-data-models.js:220-249`

**Missing Fields That Should Exist**:
1. **sourcebook** / **source** - Other items have this (upgrades have `source`), feats don't
2. **page** - Upgrades have page number field, feats don't
3. **description** - No description field defined for searchability/display

**Current Fields**:
- `featType` (general, force, species)
- `prerequisite` (HTMLField)
- `benefit` (HTMLField)
- `special` (HTMLField)
- `normalText` (HTMLField)
- `bonusFeatFor` (array of classes)
- `uses` (tracking)

**Gap**: No description field for searching/display

**Recommendation**: Add missing fields for completeness and consistency with other item types

---

### MEDIUM: Talent Tree Validation Missing

**File**: `/home/user/foundryvtt-swse/scripts/data-models/item-data-models.js:256`

```javascript
tree: new fields.StringField({required: true, label: "Talent Tree"}),
```

**Issues**:
1. No choices defined - any string accepted
2. No validation on import ensures tree name is valid
3. No normalization (case sensitivity issues possible)
4. No reference to list of available talent trees

**Recommendation**:
- Define choices based on actual talent trees in system
- Add validator to ensure talent tree exists
- Normalize tree names

---

### LOW: Property Naming - `bonusFeatFor` Ambiguity

**File**: `/home/user/foundryvtt-swse/scripts/data-models/item-data-models.js:236-239`

```javascript
bonusFeatFor: new fields.ArrayField(
  new fields.StringField(),
  {label: "Bonus Feat For Classes"}
),
```

**Issue**:
- Field uses camelCase `bonusFeatFor`
- Label says "Bonus Feat For Classes" (unclear if class names or class IDs)
- No validation on values - any string accepted

**Recommendation**:
- Add choices or validation
- Clarify if storing class names or IDs
- Consider renaming to `bonusClassesFor` for clarity

---

### LOW: Force Power Tags vs Descriptor Field Confusion

**File**: `/home/user/foundryvtt-swse/scripts/data-models/item-data-models.js:305-340`

```javascript
// Descriptors (e.g., [Mind-Affecting], [Dark Side], [Telekinetic])
// NOTE: Use 'tags' field for descriptors - this field is deprecated
descriptor: new fields.ArrayField(
  new fields.StringField(),
  {label: "Descriptors (Deprecated - use tags)"}
),

// ...

// Tags for categorization and filtering
tags: new fields.ArrayField(
  new fields.StringField(),
  {label: "Tags/Descriptors", hint: "e.g., dark-side, light-side, mind-affecting, telekinetic"}
),
```

**Issues**:
1. Deprecated `descriptor` field still in schema (creates confusion)
2. Two fields for same concept (bad practice)
3. Comments suggest use `tags` but deprecated field still accepted
4. No migration to move data from `descriptor` to `tags`

**Recommendation**:
- Remove deprecated `descriptor` field
- Create migration to move existing data to `tags`
- Update all references to use `tags` only

---

### LOW: Weapon Damage Type Validation Missing

**File**: `/home/user/foundryvtt-swse/scripts/data-models/item-data-models.js:12-16`

```javascript
damageType: new fields.StringField({
  required: true,
  initial: "energy",
  label: "Damage Type"
}),
```

**Issues**:
1. No choices defined - any string accepted
2. No validation ensures damage type is standard (energy, kinetic, etc.)
3. Case sensitivity not handled
4. Typos in weapon damage types would break rolls

**Recommendation**:
- Define standard damage types in choices
- Add validator for case normalization

---

## ITEM/FEAT/TALENT COMPENDIUM NORMALIZATION SUMMARY TABLE

| Issue | Type | Severity | Impact | Files |
|-------|------|----------|--------|-------|
| abilities.value doesn't exist | Missing Property | CRITICAL | Feat validation broken | 8+ files |
| prerequisite type inconsistency | Field Type | HIGH | Data inconsistency | 3 data models |
| chargen ability score fallback | Logic Error | HIGH | Chargen may fail | chargen-main.js |
| size field defaults differ | Consistency | MEDIUM | Confusion in data | 3 item types |
| restriction vs availability naming | Naming | MEDIUM | Inconsistent queries | item-data-models.js |
| restriction not validated | Validation Gap | MEDIUM | Invalid data accepted | weapons/armor/equipment |
| feat type not normalized | Normalization | MEDIUM | Data quality | feats |
| talent uses different from feats | Structural | MEDIUM | Different tracking | both types |
| missing feat fields | Data Completeness | MEDIUM | Incomplete data model | feats |
| talent tree not validated | Validation Gap | MEDIUM | Invalid trees created | talents |
| bonusFeatFor ambiguous | Naming | LOW | Unclear usage | feats |
| descriptor field deprecated | Legacy | LOW | Code confusion | force powers |
| damage type not validated | Validation Gap | LOW | Typos possible | weapons |

---

## UPDATED ACTION ITEMS FOR ITEMS/FEATS/TALENTS

### MUST DO FIRST:

1. **Fix Ability Score `.value` Property Access** (CRITICAL)
   - Replace all `.abilities[x].value` with `.total` or `.base`
   - 8+ files affected
   - Breaks feat validation

2. **Standardize Prerequisite Fields** (HIGH)
   - Choose: HTMLField (recommended) for all
   - Migrate upgrade prerequisites
   - Add HTML sanitization

### HIGH PRIORITY:

3. Fix chargen ability score fallback logic
4. Standardize restriction/availability fields and values
5. Add size constants for item types
6. Remove deprecated Force Power descriptor field
7. Add missing feat fields (source, page, description)
8. Validate talent tree names on import

### MEDIUM PRIORITY:

9. Standardize feat and talent uses tracking structure
10. Add feat type normalization
11. Validate weapon damage types
12. Clarify bonusFeatFor field intent and add validation
13. Add upgrade installationTime auto-calculation

---

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
<h3><i class="fas fa-swords"></i> ${actor.name} — Combat</h3>

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

## Next Steps (Priority Order)

### CRITICAL FIXES NEEDED FIRST:
1. Fix all template property references (hull, shields, dr, processor, memory, power, chassis, hp)
2. Fix health system paths in healing/recovery scripts
3. Fix locomotion system structure in droid handler
4. Fix weapon property naming consistency
5. Add missing data model fields for droids (memory, power, chassis)

### HIGH PRIORITY:
6. Migrate corrupted weapon arrays for 262 vehicles
7. Normalize crew position data
8. Update character combat tab shield references

### MEDIUM PRIORITY:
9. Add null checks for droid armor properties
10. Add validation for appendage type
11. Complete type consistency checks throughout

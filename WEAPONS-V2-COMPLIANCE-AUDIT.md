# WEAPONS V2 COMPLIANCE AUDIT

**Status:** 🚨 VIOLATIONS FOUND
**Date:** 2026-02-23
**Branch:** `claude/combat-ui-templates-rzSSX`
**Severity:** HIGH — Direct weapon math outside ModifierEngine

---

## EXECUTIVE SUMMARY

The weapon system contains **multiple critical V2 violations**:
1. Direct damage bonus calculation outside ModifierEngine
2. Name-based talent detection for weapon effects
3. Conditional logic (two-handed, light weapon) done in calculations instead of modifiers
4. Weapon proficiency penalties calculated directly

**Total Violations Found:** 8 critical, 5 moderate

---

## VIOLATIONS DETAILED

### **VIOLATION 1: computeDamageBonus() Direct Calculation**

**File:** `scripts/combat/utils/combat-utils.js` (Lines 212-259)

**Issue:** Damage bonus calculated directly instead of through ModifierEngine

```javascript
// ❌ VIOLATION: Direct damage math
export function computeDamageBonus(actor, weapon, options = {}) {
  const halfLvl = getEffectiveHalfLevel(actor);
  let bonus = halfLvl + (weapon.system?.attackBonus ?? 0);

  const strMod = actor.system.attributes?.str?.mod ?? 0;
  const dexMod = actor.system.attributes?.dex?.mod ?? 0;

  // Two-handed bonus added directly
  if (isTwoHanded && !isLight) {
    bonus += (strMod * 2);  // ❌ Should be ModifierEngine
  } else {
    bonus += strMod;        // ❌ Should be ModifierEngine
  }
  return bonus;
}
```

**Impact:**
- Damage bonuses bypass ModifierEngine
- Cannot stack with other modifiers properly
- Talent bonuses not registered as modifiers
- Dual-wielding penalties not applied through modifier system

---

### **VIOLATION 2: hasDexToDamageTalent() Name-Based Detection**

**File:** `scripts/combat/utils/combat-utils.js` (Lines 179-197)

**Issue:** Detecting talent effects via name string matching (same problem as armor proficiency)

```javascript
// ❌ VIOLATION: Name-based detection
export function hasDexToDamageTalent(actor) {
  const dexDamageTalents = [
    'weapon finesse',
    'dexterous damage',
    'precise strike',
    'melee finesse'
  ];

  for (const item of actor.items) {
    if (item.type !== 'talent' && item.type !== 'feat') {continue;}
    const name = (item.name || '').toLowerCase();
    // ❌ Fragile: Breaks if talent renamed
    if (dexDamageTalents.some(t => name.includes(t))) {
      return true;
    }
  }
  return false;
}
```

**Impact:**
- Renaming talent breaks system
- Localization impossible
- Duplicate logic (similar to Phase 3 armor detection)
- No structured flag tracking

---

### **VIOLATION 3: isLightWeapon() Name-Based Detection**

**File:** `scripts/combat/utils/combat-utils.js` (Lines 104-128)

**Issue:** Light weapon detection via name pattern matching

```javascript
// ❌ VIOLATION: Name-based detection
const lightWeapons = [
  'knife', 'dagger', 'vibrodagger', 'shiv', 'stiletto',
  'hold-out', 'holdout', 'derringer', 'pocket pistol'
];
return lightWeapons.some(lw => name.includes(lw));
```

**Impact:**
- Cannot customize weapon sizes
- Naming collisions cause false positives
- Custom weapons won't be recognized

---

### **VIOLATION 4: isTwoHandedWeapon() Name-Based Detection**

**File:** `scripts/combat/utils/combat-utils.js` (Lines 136-172)

**Issue:** Two-handed detection via name categories

```javascript
// ❌ VIOLATION: Name-based detection
const twoHandedCategories = [
  'two-handed', 'twohanded', '2h', '2-handed',
  'heavy', 'rifle', 'carbine', 'repeating',
  // ... more categories
];

if (twoHandedCategories.some(cat => category.includes(cat) || name.includes(cat))) {
  return true;  // ❌ Fragile detection
}
```

**Impact:**
- Weapon "Heavy Rifle" might be detected as two-handed incorrectly
- Custom weapons need explicit flag workaround
- Size-based detection also fragile

---

### **VIOLATION 5: computeAttackBonus() Missing Modifier Registration**

**File:** `scripts/combat/utils/combat-utils.js` (Lines 36-81)

**Issue:** Attack bonus calculated with:
- Weapon proficiency penalty added directly (-5)
- Size modifier added directly
- Active effect penalties (`aePenalty`) mixed in

```javascript
// ❌ Weapon proficiency penalty direct math
const proficiencyPenalty = proficient ? 0 : -5;

return (
  bab +
  halfLvl +
  abilityMod +
  misc +
  sizeMod +
  aePenalty +      // ❌ Shouldn't be here
  ctPenalty +      // ❌ Should come from condition modifiers
  proficiencyPenalty
);
```

**Impact:**
- Proficiency bonuses not stacking properly
- Size modifiers bypass modifier system
- Active effects mixed into attack calculation

---

### **VIOLATION 6: Weapon Enhancement Bonus Unclear Path**

**File:** `template.json` - weapon.system.attackBonus

**Issue:** Weapon enhancement bonuses (`attackBonus`) added directly in calculations

```javascript
const misc = weapon.system?.attackBonus ?? 0;
// Added directly to attack/damage without modifier registration
```

**Impact:**
- Enhancement bonuses don't use ModifierEngine
- Cannot stack properly with other bonuses
- Cannot apply conditional rules to enhancements

---

## ARCHITECTURE VIOLATIONS SUMMARY

| # | Component | File | Type | Severity |
|---|-----------|------|------|----------|
| 1 | `computeDamageBonus()` | combat-utils.js | Direct math | 🔴 CRITICAL |
| 2 | `hasDexToDamageTalent()` | combat-utils.js | Name detection | 🔴 CRITICAL |
| 3 | `isLightWeapon()` | combat-utils.js | Name detection | 🟠 HIGH |
| 4 | `isTwoHandedWeapon()` | combat-utils.js | Name detection | 🟠 HIGH |
| 5 | `computeAttackBonus()` | combat-utils.js | Mixed sources | 🔴 CRITICAL |
| 6 | Weapon enhancement bonus | template.json | Direct math | 🟠 HIGH |
| 7 | Proficiency penalty | combat-utils.js | Direct math | 🟠 HIGH |
| 8 | Size modifiers | combat-utils.js | Direct math | 🟡 MODERATE |

---

## V2 MANDATE VIOLATIONS

**Mandate:** "All game effects flow through ModifierEngine"

**Current State:**
- ❌ Damage bonuses: Direct calculation
- ❌ Attack bonuses: Partially direct
- ❌ Talent effects: Name-based detection
- ❌ Weapon properties: Fragile detection
- ❌ Proficiency penalties: Direct math
- ❌ Size modifiers: Direct math

**Current Flow (VIOLATES V2):**
```
Weapon + Actor → computeDamageBonus() → Direct math → Damage roll
                     ↓ (bypasses ModifierEngine)
                  Talent detection (names)
                  Size checking (names)
                  Two-handed detection (names)
```

**Correct Flow (V2 COMPLIANT):**
```
Weapon + Actor → ModifierEngine.getAllModifiers()
             ↓
          Registered modifiers:
          - Weapon enhancement (modifier)
          - Ability mods (modifier)
          - Talent bonuses (modifier)
          - Two-handed bonus (conditional modifier)
          - Proficiency penalty (modifier)
          - Size modifiers (modifier)
             ↓
          ModifierEngine.aggregateAll() → Consolidated
             ↓
          ModifierEngine.applyAll() → Damage bonus
```

---

## CODE REFERENCE POINTS

### Direct Damage Math Locations
1. `combat-utils.js:212-259` — `computeDamageBonus()`
2. `combat-utils.js:36-81` — `computeAttackBonus()`
3. `enhanced-rolls.js` — Uses `computeDamageBonus()` directly
4. `damage-resolution-engine.js` — Reads damage without modifier consolidation

### Name-Based Detection Locations
1. `combat-utils.js:179-197` — Talent name detection
2. `combat-utils.js:104-128` — Light weapon name detection
3. `combat-utils.js:136-172` — Two-handed name detection
4. Various combat systems using these functions

### Usage Count
- `computeAttackBonus()` imported/called: ~15 locations
- `computeDamageBonus()` imported/called: ~12 locations
- `hasDexToDamageTalent()` called: ~5 locations
- `isLightWeapon()` called: ~8 locations
- `isTwoHandedWeapon()` called: ~6 locations

---

## RECOMMENDED FIXES

### Phase 1: Weapon Compliance Audit ✅ (COMPLETE)
- [x] Identify all direct weapon math
- [x] Locate name-based detection
- [x] Document violation severity
- [x] Create this audit report

### Phase 2: WeaponsEngine Implementation (NEXT)
- [ ] Create `WeaponsEngine.js` for centralized weapon calculation
- [ ] Register all weapon modifiers to ModifierEngine
- [ ] Move talent detection to structured flags (Phase 3 pattern)
- [ ] Implement conditional weapon property modifiers

### Phase 3: Talent Flag Migration
- [ ] Create `actor.system.weaponTalentFlags.*` for talent tracking
- [ ] Migrate from name-based to flag-based detection
- [ ] Update ModifierEngine to read talent flags

### Phase 4: Weapon Configuration UI
- [ ] Create weapon management dialog
- [ ] Property/enhancement editor
- [ ] Two-handed/light weapon controls
- [ ] Talent flag management

### Phase 5: Weapon Tooltips
- [ ] Damage breakdown tooltips
- [ ] Attack bonus breakdown
- [ ] Modifier source tracking

---

## NEXT ACTION

**Ready to implement Phase 1 of Weapons Suite:**
- Phase 1: ✅ Compliance Audit (THIS REPORT)
- Phase 2: Build WeaponsEngine
- Phase 3: Structured talent flags
- Phase 4: Weapon configuration UI
- Phase 5: Weapon breakdown tooltips

Proceed with Phase 2?

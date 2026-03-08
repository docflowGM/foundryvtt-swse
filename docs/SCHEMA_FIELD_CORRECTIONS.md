# Schema Field Corrections: Code vs. Template Mismatch

**Status**: 🔴 CRITICAL — Field naming mismatches will break combat engines

**Date**: March 8, 2026

---

## Problem Statement

The codebase expects specific field names in `weapon.system`, `actor.system`, and item schemas, but `template.json` uses different field names or omits fields entirely. This causes:

- ✅ Some rules work (via safe defaults)
- ⚠️ Some features don't work (missing schema fields)
- ❌ Some code fails silently (fallbacks mask real problems)

---

## Critical Field Mismatches

### 1. WEAPON SCHEMA: Critical Range Fields

**Location**: Lines 27, 38 in `critical-rule.js` and line 98 in `combat-utils.js`

**What Code Expects**:
```javascript
weapon.system?.critRange   // For threat range
weapon.system?.critMultiplier  // For critical multiplier
```

**What Template Has**:
```json
"criticalRange": "20"    // String, not number!
"criticalMultiplier": "x2"  // String with "x" prefix
```

**Impact**:
- ❌ Code tries to read `critRange` (doesn't exist) → falls back to default 20
- ❌ String vs number type mismatch breaks math
- ❌ Critical range talents (EXTEND_CRITICAL_RANGE) silently don't apply

**Fix Needed**: Rename and retype fields in template.json

---

### 2. WEAPON SCHEMA: Range Field

**Location**: Lines 36-38 in `reach-rule.js`

**What Code Expects**:
```javascript
weapon.system?.range  // "melee" | "ranged" | "distant"
```

**What Template Has**:
```json
"meleeOrRanged": "melee",
"Range": "Melee"
```

**Impact**:
- ❌ Reach rule doesn't recognize weapon range
- ❌ Melee vs ranged penalties not applied
- ❌ All weapons treated as undefined range

**Fix Needed**: Add `range` field, populate from `meleeOrRanged`

---

### 3. WEAPON SCHEMA: Range Bands (Ranged Weapons)

**Location**: Line 92 in `reach-rule.js`

**What Code Expects**:
```javascript
weapon.system?.ranges = {
  short: 30,
  medium: 60,
  long: 120
}
```

**What Template Has**:
```json
"ammunition": {
  "type": "",
  "current": 0,
  "max": 0
}
```

**Impact**:
- ❌ Ranged weapon distances not validated
- ❌ Range band penalties (–2 medium, –4 long, –10 extreme) not applied
- ❌ All ranged attacks treated as same distance

**Fix Needed**: Add `ranges` sub-object with short/medium/long

---

### 4. WEAPON SCHEMA: Reach Bonus

**Location**: Line 73 in `reach-rule.js`

**What Code Expects**:
```javascript
weapon.system?.reachBonus  // Added by weapon properties (polearms, etc.)
```

**What Template Has**:
```json
// Nothing
```

**Impact**:
- ❌ Reach weapons (polearms, spears) don't extend reach
- ❌ Large weapons not handled specially
- ⚠️ Medium creatures stuck at 5ft reach

**Fix Needed**: Add `reachBonus` field (default 0)

---

### 5. WEAPON SCHEMA: Armor Piercing

**Location**: Line 34 in `damage-rule.js`

**What Code Expects**:
```javascript
weapon.system?.armorPiercing  // Armor piercing rating
```

**What Template Has**:
```json
// Nothing
```

**Impact**:
- ⚠️ Armor piercing mechanic not exposed
- ⚠️ Can't create weapons with penetrating damage
- ✅ Doesn't break (has default 0)

**Fix Needed**: Add `armorPiercing` field (default 0)

---

### 6. WEAPON SCHEMA: Ranged Flag

**Location**: Line 63 in `combat-utils.js`

**What Code Expects**:
```javascript
weapon.system?.ranged  // boolean: true for ranged weapons
```

**What Template Has**:
```json
// Nothing - must derive from meleeOrRanged
```

**Impact**:
- ❌ Species combat bonuses not correctly selected (melee vs ranged)
- ⚠️ Workaround needed to derive ranged status

**Fix Needed**: Add `ranged` field (boolean, derived from `meleeOrRanged`)

---

### 7. WEAPON SCHEMA: Proficiency Field

**Location**: Line 24 in `critical-rule.js`

**What Code Expects**:
```javascript
weapon.system?.proficiency  // "lightsabers" | "rifles" | etc.
```

**What Template Has**:
```json
"weaponCategory": "simple"  // Generic category, not proficiency group
```

**Impact**:
- ⚠️ Talent rules gated by proficiency (WEAPON_SPECIALIZATION) can't match
- ❌ +2/+4 damage bonuses from talents silently fail
- ❌ Extension rules (EXTEND_CRITICAL_RANGE) can't filter by proficiency

**Status**: Needs investigation — is `weaponCategory` the proficiency group?

---

## Actor Schema Gaps

### 8. ACTOR SCHEMA: Combat Action Limits

**Location**: Line 69 in `action-engine.js`

**What Code Expects**:
```javascript
actor.system.combatActions.maxSwiftPerTurn
actor.system.combatActions.maxStandardPerTurn
actor.system.combatActions.maxMovePerTurn
```

**What Template Has**:
```json
// Nothing
```

**Current Behavior**:
```javascript
actor.system?.combatActions?.maxSwiftPerTurn ?? 1  // Safe default
```

**Impact**:
- ✅ NOT BLOCKING — defaults work
- ⚠️ Can't support house rules (2+ swift per turn)
- ⚠️ Can't persist custom action limits

**Fix Needed**: Add `combatActions` object to base actor schema

---

### 9. ACTOR SCHEMA: Combat Turn State

**Location**: `action-engine.js`, `action-economy-bindings.js`

**What Code Expects**:
```javascript
actor.system.combatTurnState = {
  actorId: "",
  hasStandardAction: true,
  hasMoveAction: true,
  swiftActionsUsed: 0,
  maxSwiftActions: 1,
  actionsUsed: []
}
```

**What Template Has**:
```json
// Nothing
```

**Current Behavior**:
```javascript
// Recreated each turn, lost on page reload
ActionEngine.startTurn(actor)  // Creates fresh state
```

**Impact**:
- ✅ NOT BLOCKING — recreated on demand
- ⚠️ NO PERSISTENCE — mid-turn reload loses action economy state
- ⚠️ NO RECOVERY — can't resume mid-turn

**Fix Needed**: Add `combatTurnState` object to base actor schema

---

### 10. ACTOR SCHEMA: Size Modifier

**Location**: Line 69 in `combat-utils.js`

**What Code Expects**:
```javascript
actor.system.sizeMod  // Size-based attack/damage modifier
```

**What Template Has**:
```json
"size": "medium"  // Only the size category, not numeric modifier
```

**Impact**:
- ⚠️ Size modifiers not applied to attack rolls
- ❌ Large/Tiny creatures at disadvantage/advantage
- ⚠️ Workaround: Derive from size category

**Fix Needed**: Add `sizeMod` field (computed or explicit)

---

### 11. ACTOR SCHEMA: Attack Penalty

**Location**: Line 72 in `combat-utils.js`

**What Code Expects**:
```javascript
actor.system.attackPenalty  // Applied to all attacks (stunned, etc.)
```

**What Template Has**:
```json
// Nothing
```

**Impact**:
- ⚠️ No global attack penalty field
- ❌ Status effects (stunned, dazed) can't impose penalties
- ✅ Doesn't break (has default 0)

**Fix Needed**: Add `attackPenalty` field (default 0)

---

### 12. ACTOR SCHEMA: Species Combat Bonuses

**Location**: Line 62 in `combat-utils.js`

**What Code Expects** (FALLBACK):
```javascript
actor.system?.speciesCombatBonuses ||
actor.system?.speciesTraitBonuses?.combat
```

**What Template Has**:
```json
// Nothing
```

**Current Behavior**:
```javascript
// Checks both paths, one might exist
const speciesCombat = actor.system?.speciesCombatBonuses ||
                      actor.system?.speciesTraitBonuses?.combat || {};
```

**Impact**:
- ❌ Path unclear — which field actually exists?
- ⚠️ Species bonuses might not apply
- ⚠️ No standard location for these bonuses

**Fix Needed**: Choose ONE path and add to template

---

## Combat-Action Item Schema

### 13. COMBAT-ACTION ITEM: Action Cost

**Location**: Required by `action-economy-bindings.js`, `enhanced-rolls.js`

**What Code Expects**:
```javascript
item.system.actionCost = {
  standard: 0,
  move: 0,
  swift: 1  // or 2 for abilities costing 2 swift
}
```

**What Template Has**:
```json
"combat-action": {
  "templates": [],
  "description": ""
}
```

**Impact**:
- ❌ No way to declare action costs for combat abilities
- ❌ Abilities can't use multi-swift costs (swift: 2)
- ❌ UI can't know if action is available without hardcoding

**Fix Needed**: Add `actionCost` object to combat-action schema

---

### 14. COMBAT-ACTION ITEM: Action Type

**Location**: Needed for clarity and UI

**What Code Expects**:
```javascript
item.system.actionType = "standard" | "move" | "swift" | "full"
```

**What Template Has**:
```json
// Nothing
```

**Impact**:
- ❌ UI doesn't know what action type an ability is
- ❌ Can't preview action availability before rolling

**Fix Needed**: Add `actionType` field to combat-action schema

---

## Correction Priority

| Priority | Field | Type | Impact |
|----------|-------|------|--------|
| 🔴 P0 | weapon.critRange | Rename | Critical hits completely broken |
| 🔴 P0 | weapon.critMultiplier | Rename | Critical hits completely broken |
| 🔴 P0 | weapon.range | Add/Rename | Reach validation broken |
| 🔴 P0 | combat-action.actionCost | Add | Action economy non-functional |
| 🟠 P1 | weapon.ranges | Add | Ranged combat broken (no distance penalties) |
| 🟠 P1 | weapon.armorPiercing | Add | Armor piercing mechanic broken |
| 🟠 P1 | actor.combatActions | Add | Can't override action limits |
| 🟠 P1 | actor.combatTurnState | Add | Mid-turn reload loses state |
| 🟠 P1 | actor.sizeMod | Add | Size modifiers not applied |
| 🟠 P1 | weapon.proficiency | Clarify | Talent proficiency gating unclear |
| 🟡 P2 | weapon.reachBonus | Add | Reach weapons don't extend reach |
| 🟡 P2 | actor.attackPenalty | Add | No global attack penalty mechanism |
| 🟡 P2 | actor.speciesCombatBonuses | Add | Species bonuses path unclear |
| 🟡 P2 | combat-action.actionType | Add | Informational only |

---

## Recommended Action Plan

### Phase 1: Critical Fixes (P0) — **MUST DO**
1. Rename weapon.system.criticalRange → critRange, parse to number
2. Rename weapon.system.criticalMultiplier → critMultiplier, parse to number
3. Add weapon.system.range field, populate from melemeOrRanged
4. Add combat-action.system.actionCost with { standard, move, swift }
5. **Verify**: Critical hit rule triggers, action economy shows up

### Phase 2: Combat Mechanics (P1) — **SHOULD DO**
6. Add weapon.system.ranges with { short, medium, long }
7. Add weapon.system.armorPiercing (default 0)
8. Add weapon.system.ranged boolean (derived from range)
9. Add actor.system.combatActions with action limits
10. Add actor.system.combatTurnState for persistence
11. Add actor.system.sizeMod computed from size
12. **Verify**: Ranged combat penalties apply, turn state persists

### Phase 3: Advanced (P2) — **NICE TO HAVE**
13. Add weapon.system.reachBonus (default 0)
14. Add actor.system.attackPenalty (default 0)
15. Clarify actor.system.speciesCombatBonuses path
16. Add combat-action.system.actionType
17. **Verify**: All edge cases covered

---

## Implementation Notes

### Field Type Conversions

Some template.json fields need type conversion:

```json
// BEFORE (string)
"criticalRange": "20"
"criticalMultiplier": "x2"

// AFTER (proper types)
"critRange": 20
"critMultiplier": 2
```

### Backward Compatibility

If template.json has old field names, add migration logic:

```javascript
// In a migration hook
if (actor.system?.criticalRange !== undefined) {
  // Convert string "20" to number 20
  actor.update({
    'system.critRange': parseInt(actor.system.criticalRange)
  });
}
```

### Safe Defaults

Code already has safe defaults for most missing fields:

```javascript
weapon.system?.critRange || 20  // ✅ Works if missing
weapon.system?.attackBonus ?? 0  // ✅ Works if missing
actor.system?.sizeMod ?? 0  // ✅ Works if missing
```

**But**: Safe defaults mask real problems. Schema should match code expectations.

---

## Verification Checklist

After fixes:

- [ ] Critical hit threat range displays correctly
- [ ] Critical hit multiplier applies on confirmation
- [ ] Reach rule validates melee distance
- [ ] Ranged weapons impose distance penalties (–2 medium, –4 long)
- [ ] Talents like Weapon Specialization apply bonuses
- [ ] Action economy shows correct action states
- [ ] Multi-swift abilities (swift: 2+) work
- [ ] Size modifiers apply to attacks
- [ ] Species combat bonuses apply correctly
- [ ] Turn state persists across page reloads
- [ ] Armor piercing mechanic functional

---

## Next Steps

1. **Immediate**: Confirm priority — user to decide what to fix first
2. **Phase 1**: Update template.json with critical field corrections
3. **Phase 2**: Add migration code for existing actors
4. **Phase 3**: Test all affected rules with real actor data

---

**Current Status**: Schema audit complete. Mismatches identified. Awaiting user approval to proceed with fixes.

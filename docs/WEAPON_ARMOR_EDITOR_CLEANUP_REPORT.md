# Item Editor Cleanup - Duplicate Field & Context-Sensitive Rendering

## Summary

Implemented two cleanup rules across weapon and armor editors:
1. **Rule 1**: Removed duplicate identity fields from body that are already in header
2. **Rule 2**: Added context-sensitive field rendering based on weapon type/armor type

---

## Changes Implemented

### ✅ Weapon Editor - Duplicate Identity Fields Removed

**Location**: `templates/items/base/item-sheet.hbs` lines 135-173 (before cleanup)

**What Was Removed**:
- "Melee or Ranged" selector from body (lines 144-150)
  - This field is now ONLY in header
- "Weapon Category" selector from body (lines 153-170)
  - This field is now ONLY in header

**Why**: These identity fields define what the weapon IS. They belong in the header. The body should only show mechanics/properties relevant to that weapon type.

**Before**: 
```
Header:    Type | Branch | Category
Body:      [DUPLICATE] Classification section with Melee/Ranged and Category
           + Damage + Attack Bonus + ...
```

**After**:
```
Header:    Type | Branch | Category ✓
Body:      Mechanics section (Damage, Attack Bonus, ...)
           No duplicates ✓
```

---

### ✅ Weapon Editor - Context-Sensitive Ammo Fields

**Location**: `templates/items/base/item-sheet.hbs` lines 250-294 (before cleanup)

**What Changed**: Split "Ammunition & Flags" into two conditional sections

#### For RANGED Weapons:
```handlebars
{{#if (eq system.meleeOrRanged "ranged")}}
<section class="Ammunition">
  - Ammunition Type
  - Ammo Current
  - Ammo Max
  - Autofire (checkbox)
</section>
{{/if}}
```

**Reason**: Ranged weapons need ammo management. Melee weapons don't.

#### For MELEE Weapons:
```handlebars
{{#if (eq system.meleeOrRanged "melee")}}
<section class="Handedness">
  - Dual Wielded (checkbox)
  - Two-Handed (checkbox)
</section>
{{/if}}
```

**Reason**: Melee weapons have handedness constraints. Ranged weapons don't (or handle it differently).

**Data Model Verified**:
- ✓ `system.ammunition.type` — exists in schema
- ✓ `system.ammunition.current` — exists in schema
- ✓ `system.ammunition.max` — exists in schema
- ✓ `system.autofire` — exists in schema
- ✓ `system.dualWielded` — exists in schema
- ✓ `system.wieldedTwoHanded` — exists in schema

**Result**: Melee weapons no longer show ammo fields, ranged weapons no longer show handedness fields.

---

### ✅ Armor Editor - Duplicate Identity Field Removed

**Location**: `templates/items/base/item-sheet.hbs` lines 356-372 (before cleanup)

**What Was Removed**:
- "Armor Type" selector from body (lines 364-372)
  - This field is now ONLY in header

**Before**:
```
Header:    Type | Category (Light/Medium/Heavy/Shield)
Body:      [DUPLICATE] Classification section with Armor Type selector
           + Defense bonuses + ...
```

**After**:
```
Header:    Type | Category ✓
Body:      Defense section (Reflex Bonus, Fortitude Bonus, ...)
           No duplicates ✓
```

**Section Title Updated**: "Classification" → "Defense" (since classification is in header)

---

## Field Visibility Matrix

### Weapon Editor Body

| Field | Melee | Ranged |
|-------|-------|--------|
| **Mechanics Section** | | |
| Attack Attribute | ✓ | ✓ |
| Damage | ✓ | ✓ |
| Damage Type | ✓ | ✓ |
| Damage Bonus | ✓ | ✓ |
| Attack Bonus | ✓ | ✓ |
| Critical Range | ✓ | ✓ |
| Critical Multiplier | ✓ | ✓ |
| Range | ✓ | ✓ |
| Weight | ✓ | ✓ |
| Cost | ✓ | ✓ |
| **Ammunition Section** | ✗ | ✓ |
| Ammunition Type | ✗ | ✓ |
| Ammo Current | ✗ | ✓ |
| Ammo Max | ✗ | ✓ |
| Autofire | ✗ | ✓ |
| **Handedness Section** | ✓ | ✗ |
| Dual Wielded | ✓ | ✗ |
| Two-Handed | ✓ | ✗ |
| **Special Effects** | ✓ | ✓ |
| Special Effects | ✓ | ✓ |
| Properties | ✓ | ✓ |
| **Ranged Visuals** | ✗ | ✓ |
| Beam Style | ✗ | ✓ |
| Bolt Color | ✗ | ✓ |
| **Lightsaber Options** | ✓* | ✗ |
| Emit Blade Light | ✓* | ✗ |

*Only when weaponCategory = "lightsaber"

---

## Data Structure Cleanup

### Weapon Editor

**Header (Identity)**:
```
Type: weapon (select)
├─ Branch: melee/ranged (select)
└─ Category: filtered by branch (select)
```

**Body (Mechanics)**:
```
Mechanics Section
├─ Attack Attribute
├─ Damage
├─ Damage Type
├─ Damage Bonus
Combat Section
├─ Attack Bonus
├─ Critical Range
├─ Critical Multiplier
├─ Range
├─ Weight
├─ Cost
[Conditional] Ammunition (ranged only)
[Conditional] Handedness (melee only)
Special Effects Section
[Conditional] Ranged Visuals (ranged only)
[Conditional] Lightsaber Options (lightsaber only)
```

### Armor Editor

**Header (Identity)**:
```
Type: armor (select)
└─ Category: Light/Medium/Heavy/Shield (select)
```

**Body (Properties)**:
```
[Conditional] Defense Section (non-shield only)
├─ Reflex Defense Bonus
├─ Fortitude Bonus
├─ Max Dex Bonus
├─ Armor Check Penalty
Properties Section
├─ Weight
├─ Cost
[Conditional] Shield Properties (shield only)
├─ Shield Rating
├─ Current SR
├─ Charges Current
├─ Charges Max
[Conditional] Modifiers Section (non-shield only)
├─ Speed Penalty
├─ Equipment Perception Bonus
├─ Special Features
├─ Armor Proficiency
```

---

## UX Improvements

### Before Cleanup
- ❌ Weapon editor showed melee/ranged selector in BOTH header and body (confusing duplication)
- ❌ Weapon editor showed category selector in BOTH header and body (confusing duplication)
- ❌ Melee weapons displayed empty ammo fields (not applicable)
- ❌ Ranged weapons displayed unused handedness checkboxes (not applicable)
- ❌ Armor editor showed armor type selector in BOTH header and body (confusing duplication)

### After Cleanup
- ✅ Identity fields (what the item IS) → header only
- ✅ Mechanics/properties (how the item WORKS) → body only
- ✅ Context-sensitive rendering → only show fields relevant to selection
- ✅ Cleaner, less bloated UI
- ✅ Reduced cognitive load on user
- ✅ No confusion from duplicate selectors

---

## Validation Checklist

### Duplicate Fields Removed
- [x] Weapon: `system.meleeOrRanged` removed from body
- [x] Weapon: `system.weaponCategory` removed from body
- [x] Armor: `system.armorType` removed from body

### Context-Sensitive Rendering
- [x] Melee weapons: Ammunition fields HIDDEN
- [x] Melee weapons: Handedness section VISIBLE
- [x] Ranged weapons: Ammunition section VISIBLE
- [x] Ranged weapons: Handedness section HIDDEN
- [x] Ranged visuals: Only shown for ranged weapons ✓ (already conditional)
- [x] Lightsaber options: Only shown for lightsabers ✓ (already conditional)

### Header/Body Alignment
- [x] Identity fields in header → body not duplicated
- [x] Mechanics fields in body → not in header
- [x] Context-sensitive sections use correct field names
- [x] Section titles updated appropriately

### Data Model Verification
- [x] All conditional fields exist in schema
- [x] No invented fields used
- [x] Field names match actual data paths
- [x] Dual-wield controls found: `system.dualWielded` ✓
- [x] Two-hand controls found: `system.wieldedTwoHanded` ✓

---

## Testing Instructions

### Melee Weapon Test
1. Open melee weapon editor
2. Verify:
   - [ ] Header shows: Type | Branch: Melee | Category: (melee options)
   - [ ] Body shows: Mechanics section with damage/attack fields
   - [ ] Body does NOT show Ammunition section
   - [ ] Body shows Handedness section with Dual Wielded + Two-Handed checkboxes
   - [ ] Special Effects section visible

### Ranged Weapon Test
1. Open ranged weapon editor (rifle, pistol, etc.)
2. Verify:
   - [ ] Header shows: Type | Branch: Ranged | Category: (ranged options)
   - [ ] Body shows: Mechanics section with damage/attack fields
   - [ ] Body shows Ammunition section (Type, Current, Max, Autofire)
   - [ ] Body does NOT show Handedness section
   - [ ] Ranged Visuals section visible
   - [ ] Special Effects section visible

### Lightsaber Test
1. Open lightsaber weapon editor
2. Verify:
   - [ ] Header shows: Type | Branch: Melee | Category: Lightsaber
   - [ ] Body shows: Mechanics + Handedness sections
   - [ ] Lightsaber Options section appears (Emit Blade Light checkbox)
   - [ ] Customize Lightsaber button visible in header toolbar

### Armor Test
1. Open armor editor (non-shield)
2. Verify:
   - [ ] Header shows: Type | Category: (Light/Medium/Heavy)
   - [ ] Body shows: Defense section (Reflex, Fortitude, Max Dex, Check Penalty)
   - [ ] Body does NOT show Armor Type selector
   - [ ] Modifiers section visible
   - [ ] Properties section visible

### Shield Test
1. Open shield editor
2. Verify:
   - [ ] Header shows: Type | Category: Shield
   - [ ] Body Defense section NOT shown (conditional hidden)
   - [ ] Properties section shows Weight + Cost
   - [ ] Shield-specific section shows: Shield Rating, Current SR, Charges
   - [ ] Modifiers section NOT shown (non-shield only)

---

## Files Modified

| File | Changes |
|------|---------|
| `templates/items/base/item-sheet.hbs` | 4 edits: removed duplicate weapon/armor selectors, added context-sensitive ammo/handedness sections |

**Lines changed**: ~60 lines of template restructuring
- Removed ~30 lines of duplicate selectors
- Added ~30 lines of context-sensitive conditional sections

---

## Summary of Result

The item editors are now much cleaner:

- **Header** = "What is this item?" (Type, Branch, Category)
- **Body** = "How does it work?" (Only relevant mechanics for that type)
- **No duplication** = Identity fields only in header
- **Smart rendering** = Only show fields that matter for the selected type

This follows the design principle: **"Don't show fields that can't affect this item type."**

---

**Status**: Cleanup complete and ready for testing

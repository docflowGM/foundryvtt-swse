# Weapon Editor Regression - Diagnosis Report

## Root Causes Identified

### Problem 1: Header Using Wrong Weapon Schema

**Location**: `templates/items/base/item-sheet.hbs` lines 23-50

**Current Code**:
```handlebars
<div class="form-field">
  <label>Type</label>
  <select name="type" class="item-type-select">
    <option value="weapon">Weapon</option>
    ...
  </select>
</div>

<div class="form-field">
  <label>Category</label>
  <select name="system.category" class="item-category-select">
    {{#if (eq item.type "weapon")}}
      <option value="melee">Melee</option>
      <option value="ranged">Ranged</option>
```

**Issue**: 
- Header shows generic "Type" and "Category"
- For weapons, Category selector shows "Melee" or "Ranged"
- **But this is WRONG** — Melee/Ranged are the BRANCH, not the category
- Header is binding to `system.category` which is generic for all items
- **The weapon body (lines 100-318) uses a different schema**: `system.meleeOrRanged` + `system.weaponCategory`
- This causes a schema mismatch

### Problem 2: Missing activeTab in Context

**Location**: `scripts/items/swse-item-sheet.js` lines 66-99

**Current Code**:
```javascript
async _prepareContext(options) {
  const context = {
    item: itemData,
    system: foundry.utils.deepClone(itemData.system ?? {}),
    cssClass: ...,
    itemId: ...,
    itemType: ...,
    // NO activeTab HERE!
  };
  return context;
}
```

**Issue**:
- Context doesn't include `activeTab` field
- Template checks `{{#if (eq activeTab 'data')}}` on lines 97 and 454
- If `activeTab` is undefined, tab conditionals may fail
- Body tabs won't render properly if no tab is marked as active

### Problem 3: Schema Mismatch in Body

**Location**: `templates/items/base/item-sheet.hbs` lines 100-135 (weapon body)

**Correct Weapon Schema** (in body):
```handlebars
<select name="system.meleeOrRanged">
  <option value="melee">Melee</option>
  <option value="ranged">Ranged</option>
</select>

<select name="system.weaponCategory">
  {{#if (eq system.meleeOrRanged "melee")}}
    <option value="advanced">Advanced</option>
    <option value="lightsaber">Lightsaber</option>
    ...
  {{else}}
    <option value="heavy">Heavy</option>
    <option value="pistols">Pistols</option>
    ...
```

**This is CORRECT** but only exists in the body, not the header.

The header should NOT have a generic "Category" for weapons at all.

### Problem 4: Why Body Appears Blank

When a user opens a weapon editor:
1. Header displays with generic "Type" selector (shows "Weapon" correctly)
2. Header displays with generic "Category" selector showing "Melee"/"Ranged"
3. Body should render weapon-specific fields
4. **But body is blank because**:
   - `activeTab` is undefined in context
   - Tab rendering might be failing
   - OR the conditional `{{#if (eq item.type "weapon")}}` on line 100 is not being evaluated correctly

## Data Flow Issue

The problem cascades:
1. User opens weapon editor
2. Header shows "Type: Weapon" (correct)
3. Header shows "Category: Melee" (WRONG - should not be here)
4. User selects from header category (saving to `system.category`)
5. Body tries to render weapon fields using `system.meleeOrRanged` and `system.weaponCategory`
6. But those fields don't have data because user input went to `system.category` instead
7. Body appears blank because it can't find the data it expects

## The Real Fix Required

### In JS Context (`_prepareContext`):
- Add `activeTab: 'data'` to context

### In Template Header (lines 23-50):
- **For weapons**: Remove generic "Category" selector
  - Add `meleeOrRanged` selector (first choice)
  - Add `weaponCategory` selector (second choice, filtered)
  - This should match lines 108-135 in the body

- **For armor**: Use `armorType` selector instead of generic `category`

- **For equipment**: Keep generic category but ensure it's correct

### In Template Body (lines 100-318):
- No changes needed — weapon section is already correct
- Just needs the header to feed it the right data

## Expected Behavior After Fix

1. **Open weapon editor**
   - Header shows:
     - Name field
     - Type: Weapon (dropdown)
     - Melee or Ranged: (first selector)
     - Weapon Category: (second selector, filtered by melee/ranged)
   - Body renders with two-column weapon fields
   - Tabs show "Data" (active) and "Description"

2. **Select melee from first selector**
   - Second selector updates to show: Advanced, Lightsaber, Melee Exotic, Natural, Simple
   - Body fields remain visible

3. **Select ranged from first selector**
   - Second selector updates to show: Heavy, Pistols, Ranged Exotic, Rifles, Simple
   - Body fields remain visible

4. **Switch to Description tab**
   - Description field appears (no longer blank)

## Files to Modify

1. **`scripts/items/swse-item-sheet.js`** (lines 66-99)
   - Add `activeTab: 'data'` to context

2. **`templates/items/base/item-sheet.hbs`** (lines 23-50)
   - Rewrite weapon-specific header controls
   - Remove generic Category for weapons
   - Add meleeOrRanged + weaponCategory selectors

## Validation After Fix

- [ ] Weapon editor opens and shows body content
- [ ] Header shows: Type → meleeOrRanged → weaponCategory
- [ ] Switching melee/ranged updates category options
- [ ] Body renders two-column weapon fields
- [ ] Tabs work correctly (Data/Description)
- [ ] Lightsaber fields show only when weaponCategory = lightsaber
- [ ] Ranged fields show only when meleeOrRanged = ranged
- [ ] Data saves correctly to system.meleeOrRanged and system.weaponCategory
- [ ] Armor editor still works (armorType selector)
- [ ] Equipment editor still works

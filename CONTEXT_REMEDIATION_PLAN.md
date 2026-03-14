# Character Sheet Context Remediation Plan

**Date:** 2026-03-14
**Scope:** Fix 3 critical context delivery failures
**Target:** Make all missing context keys available to character-sheet.hbs template

---

## Issue Overview

From the Handlebars Hydration Diagnostic, 3 major failures prevent template rendering:

### Issue 1: Missing Top-Level Context Keys (13 keys)
**Status:** 🔴 CRITICAL
**Templates Cannot Access:**
- xpEnabled
- xpPercent
- xpLevelReady
- isLevel0
- isGM
- fpAvailable
- totalWeight
- encumbranceStateCss
- encumbranceLabel
- inventorySearch

**Result:** Conditional tabs don't render, header buttons disappear

---

### Issue 2: Inventory Scope Mismatch
**Status:** 🔴 CRITICAL
**Problem:**
```javascript
// Context provides:
inventory: {equipment: [], armor: [], weapons: []}

// Template expects:
{{#each equipment}}
{{#each armor}}
{{#each weapons}}
```

**Result:** Entire gear tab invisible

---

### Issue 3: Follower/Owned Data Missing
**Status:** 🔴 CRITICAL
**Already Addressed:** See FOLLOWER_SYSTEM_ARCHITECTURE_AUDIT.md

---

## Implementation Tasks

### Task 1: Add Missing Top-Level Keys

**File:** `scripts/sheets/v2/character-sheet.js`

**In _prepareContext() method, add before finalContext return:**

```javascript
// XP System Configuration
const xpSystem = CONFIG.SWSE?.system?.xpProgression || 'milestone';
const xpEnabled = xpSystem !== 'disabled';

// XP Progress (from actor data)
const xpValue = actor.system.progression?.xp ?? 0;
const xpThreshold = actor.system.progression?.xpThreshold ?? 0;
const xpPercent = xpThreshold > 0 ? Math.round((xpValue / xpThreshold) * 100) : 0;
const xpLevelReady = xpPercent >= 100;

// Character Level
const level = actor.system.level ?? 1;
const isLevel0 = level === 0;

// User Permission (check if current user is GM)
const isGM = game.user.role >= 4; // GAMEMASTER role

// Force Points Availability
const fpMax = actor.system.forcePoints?.max ?? 0;
const fpValue = actor.system.forcePoints?.value ?? 0;
const fpAvailable = fpValue < fpMax;

// Encumbrance Display Data
const encumbranceState = derived.encumbrance?.state ?? 'normal';
const encumbranceLabel = derived.encumbrance?.label ?? 'Unencumbered';
const encumbranceStateCss = encumbranceState === 'heavy'
  ? 'color: #ff6b35;'
  : encumbranceState === 'overloaded'
  ? 'color: #cc0000;'
  : '';

// Inventory Weight Calculation
let totalWeight = 0;
for (const item of actor.items) {
  if (['equipment', 'armor', 'weapon'].includes(item.type)) {
    const weight = item.system?.weight ?? 0;
    const qty = item.system?.quantity ?? 1;
    totalWeight += weight * qty;
  }
}
const totalWeightLabel = `${totalWeight} lbs`;

// Inventory Search Filter (from sheet state)
const inventorySearch = ''; // Initially empty, populated by user input handler
```

**Then in finalContext return, add:**
```javascript
const finalContext = {
  ...context,
  // ... existing fields ...
  xpEnabled,
  xpPercent,
  xpLevelReady,
  isLevel0,
  isGM,
  fpAvailable,
  totalWeight: totalWeightLabel,
  encumbranceStateCss,
  encumbranceLabel,
  inventorySearch
};
```

---

### Task 2: Fix Inventory Scope Mismatch

**Option A: Spread inventory keys into context (Recommended)**

**In _prepareContext() return:**
```javascript
const finalContext = {
  ...context,
  // ... existing fields ...
  inventory,           // Keep nested structure
  equipment: inventory.equipment,   // Also expose at top level
  armor: inventory.armor,
  weapons: inventory.weapons
};
```

**Option B: Update template to use inventory.equipment**

**In templates/actors/character/v2/character-sheet.hbs:**
```handlebars
<!-- Change line 269 from: -->
{{#if equipment}}
  {{#each equipment as |item|}}

<!-- To: -->
{{#if inventory.equipment}}
  {{#each inventory.equipment as |item|}}
```

**Recommendation:** Use Option A (spread) to maintain template compatibility with current structure.

---

### Task 3: Add Follower Context Keys

**Already detailed in FOLLOWER_SYSTEM_ARCHITECTURE_AUDIT.md**

**In _prepareContext(), add:**
```javascript
// Extract follower slots from flags
const followerSlots = actor.getFlag('swse', 'followerSlots') || [];

// Build ownedActorMap
const ownedActorMap = {};
for (const entry of actor.system.ownedActors || []) {
  ownedActorMap[entry.id] = {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    img: entry.img,
    system: entry
  };
}

// Aggregate follower talent badges
const followerTalentBadges = [];
const seenTalents = new Set();
for (const slot of followerSlots) {
  if (!seenTalents.has(slot.talentName)) {
    seenTalents.add(slot.talentName);
    const { FOLLOWER_TALENT_CONFIG } = await import(
      '/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js'
    );
    const cfg = FOLLOWER_TALENT_CONFIG[slot.talentName];
    const filled = followerSlots
      .filter(s => s.talentName === slot.talentName)
      .filter(s => !!s.createdActorId).length;

    followerTalentBadges.push({
      talentName: slot.talentName,
      current: filled,
      max: cfg?.maxCount ?? 0
    });
  }
}

// Enrich slots with actor data
const enrichedFollowerSlots = followerSlots.map(slot => {
  const actorData = slot.createdActorId ? ownedActorMap[slot.createdActorId] : null;
  return {
    ...slot,
    actor: actorData ? {id: actorData.id, name: actorData.name, type: actorData.type} : null,
    tokenImg: actorData?.img || '',
    roleLabel: slot.templateChoices?.[0] || 'Standard',
    level: actorData?.system.level || 1,
    hp: {value: actorData?.system.hp?.value || 0, max: actorData?.system.hp?.max || 1},
    tags: slot.templateChoices || [],
    isLocked: false
  };
});
```

**In finalContext return:**
```javascript
const finalContext = {
  ...context,
  // ... other fields ...
  followerSlots: enrichedFollowerSlots,
  followerTalentBadges,
  ownedActorMap
};
```

---

## Implementation Sequence

### Phase 1: Context Building (30 min)
1. Add all 10 missing top-level key computations
2. Spread inventory keys
3. Build follower context structures
4. Return in finalContext

### Phase 2: Testing (20 min)
1. Open character sheet
2. Check header tabs render (xpEnabled, fpAvailable)
3. Check gear tab renders (equipment array)
4. Check followers section renders (followerSlots, badges)
5. Test isGM/isLevel0 conditional rendering

### Phase 3: Edge Cases (15 min)
1. Test with XP system disabled
2. Test with no followers
3. Test with no inventory
4. Test serialization (RenderAssertions.assertContextSerializable)

---

## Expected Outcome

After implementation:

**Before (All Missing):**
```
Header tabs: ❌ Conditional tabs don't show
Gear tab: ❌ Equipment list invisible
Followers: ❌ No slots or badges
Inventory: ❌ All item lists empty
```

**After (All Fixed):**
```
Header tabs: ✅ XP, resources, force tabs visible based on config
Gear tab: ✅ Equipment, armor, weapons render with items
Followers: ✅ Talent badges and slot list visible
Inventory: ✅ Weight display and search functional
```

---

## Code Location Summary

**File to Modify:** `scripts/sheets/v2/character-sheet.js`

**Method:** `_prepareContext()` (around line 57-307)

**Changes:**
- Lines ~270-280: Add missing key computations
- Lines ~300-306: Update finalContext return to include all new keys
- Lines ~280-300: Add follower aggregation logic

**Total New Lines:** ~100-120 lines
**Effort:** 1-2 hours
**Risk:** LOW (read-only operations, no mutations)

---

## Validation Criteria

- [ ] All 13 missing keys computed
- [ ] Inventory keys spread into context
- [ ] Follower context fully populated
- [ ] finalContext passes RenderAssertions.assertContextSerializable()
- [ ] No undefined references in template
- [ ] All conditional tabs render based on actual values
- [ ] No console errors on sheet open


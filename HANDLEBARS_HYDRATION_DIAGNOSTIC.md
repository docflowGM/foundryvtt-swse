# SWSE V13 Handlebars Hydration Diagnostic Report

**Generated:** 2026-03-14
**Scope:** Character sheet context-to-template binding integrity
**Focus:** Detect silent rendering failures from data path mismatches

---

## PHASE 1: CONTEXT MAP EXTRACTION

### Character Sheet Context Structure (character-sheet.js:279-301)

**Explicitly Provided Keys:**
```
biography                 (string)
derived                   {talents, skills, attacks, identity, defenses, encumbrance}
inventory                 {equipment: [], armor: [], weapons: []}
hp                        {current, max, overflow, percent}
bonusHp                   {value, label}
conditionSteps            [{step, label, active}]
initiativeTotal           (number)
combat                    {attacks: []}
forcePoints               [{index, used}]
forceTags                 [string]
forceSuite                {hand: [], discard: []}
lowHand                   (boolean)
darkSideMax               (number)
darkSideSegments          [{index, filled, color}]
abilities                 [{key, label, base, racial, temp, total, mod}]
headerDefenses            [{key, label, total}]
forceSensitive            (boolean)
identityGlowColor         (string)
buildMode                 (string)
actionEconomy             {state, breakdown, enforcementMode} | null
...context                (from super._prepareContext())
```

**Inherited via super._prepareContext():**
```
actor                     {id, name, type, img, _id, system}
system                    (alias for actor.system)
user                      {id, name, role}
editable                  (boolean)
config                    (CONFIG.SWSE)
```

**Total Unique Context Keys:** 27 explicit + 5 inherited = 32

---

## PHASE 2: TEMPLATE DATA PATH EXTRACTION

### Handlebars Data Paths in character-sheet.hbs

**Direct References:**
```
{{actor.name}}                      ✅ actor.name
{{actor.img}}                       ✅ actor.img
{{actor.system.species}}            ✅ actor.system.species
{{actor.system.class}}              ✅ actor.system.class
{{actor.system.level}}              ✅ actor.system.level
{{derived.identity.halfLevel}}      ✅ derived.identity.halfLevel
{{hp.percent}}                      ✅ hp.percent
{{xpEnabled}}                       ⚠ NOT IN CONTEXT
{{xpPercent}}                       ⚠ NOT IN CONTEXT
{{xpLevelReady}}                    ⚠ NOT IN CONTEXT
{{forcePoints}}                     ✅ forcePoints (array)
{{fp.used}}                         ✅ forcePoints[].used (loop)
{{conditionSteps}}                  ✅ conditionSteps (array)
{{step.active}}                     ✅ conditionSteps[].active (loop)
{{isLevel0}}                        ⚠ NOT IN CONTEXT
{{isGM}}                            ⚠ NOT IN CONTEXT
{{fpAvailable}}                     ⚠ NOT IN CONTEXT
{{eq buildMode "free"}}             ✅ buildMode
{{derived.encumbrance.state}}       ✅ derived.encumbrance.state
{{derived.encumbrance.skillPenalty}}  ✅ derived.encumbrance.skillPenalty
{{derived.encumbrance.removeDexToReflex}}  ✅ derived.encumbrance.removeDexToReflex
{{equipment}}                       ✅ inventory.equipment (spread in context?)
{{armor}}                           ✅ inventory.armor (spread in context?)
{{weapons}}                         ✅ inventory.weapons (spread in context?)
{{item._expanded}}                  ⚠ Custom property on item objects
{{item.system.equipped}}            ✅ item.system.equipped (from actual items)
{{item.system.quantity}}            ✅ item.system.quantity
{{totalWeight}}                     ⚠ NOT IN CONTEXT
{{encumbranceStateCss}}             ⚠ NOT IN CONTEXT
{{encumbranceLabel}}                ⚠ NOT IN CONTEXT
{{inventorySearch}}                 ⚠ NOT IN CONTEXT
{{followerSlots}}                   ⚠ NOT IN CONTEXT
{{followerTalentBadges}}            ⚠ NOT IN CONTEXT
{{actor.system.ownedActors}}        ⚠ NOT IN CONTEXT
{{actor.system.forceSensitive}}     ✅ forceSensitive (also available via actor.system)
```

---

## PHASE 3: PATH VALIDATION RESULTS

### 🔴 CRITICAL FINDINGS

#### Missing Context Keys

| Key | Referenced In | Type | Status |
|-----|---|------|--------|
| xpEnabled | Header, tabs | boolean flag | ⚠ MISSING |
| xpPercent | Header status bar | number | ⚠ MISSING |
| xpLevelReady | Header button class | boolean flag | ⚠ MISSING |
| isLevel0 | Command row logic | boolean flag | ⚠ MISSING |
| isGM | Biography section | boolean flag | ⚠ MISSING |
| fpAvailable | Initiative panel conditional | boolean flag | ⚠ MISSING |
| totalWeight | Inventory header | string/number | ⚠ MISSING |
| encumbranceStateCss | Inventory header | string (CSS) | ⚠ MISSING |
| encumbranceLabel | Inventory header | string | ⚠ MISSING |
| inventorySearch | Inventory search input | string | ⚠ MISSING |
| followerSlots | Biography section | array | ⚠ MISSING |
| followerTalentBadges | Biography section | array | ⚠ MISSING |
| actor.system.ownedActors | Biography loop | array | ⚠ MISSING |

**Total Missing Keys: 13**

#### Potential Default Issues

**hp.percent** - Computed but depends on hp object existing
```javascript
// In _prepareContext:
hp.percent is computed
// Template assumes:
{{hp.percent}}  // Renders empty if hp is undefined
```

**derived.encumbrance properties** - Multiple nested accesses
```javascript
// Template references:
{{derived.encumbrance.skillPenalty}}
{{derived.encumbrance.removeDexToReflex}}
{{derived.encumbrance.state}}
{{#if (eq derived.encumbrance.state "heavy")}}

// Risk: If encumbrance object not fully initialized
```

### Partial Scope Analysis

**inventory-panel.hbs** receives:
```
Expected: equipment, armor, weapons
Actual: inventory.equipment, inventory.armor, inventory.weapons?
```

The main template has these keys spread in context, but need to verify how they're passed to inventory-panel.hbs partial.

---

## PHASE 4: SHADOWING DETECTION

### Variable Shadowing in Loops

**Loop 1: Equipment Items**
```handlebars
{{#each equipment as |item|}}
  {{item.name}}
  {{item._expanded}}
  {{item.system.equipped}}
  {{item.system.quantity}}
{{/each}}
```

**Risk Assessment:** ✅ LOW - item loop scope is clean

**Loop 2: Armor Items**
```handlebars
{{#each armor as |item|}}
  {{item.name}}
  {{item.system.equipped}}
{{/each}}
```

**Risk Assessment:** ✅ LOW - consistent item references

**Loop 3: Force Points**
```handlebars
{{#each forcePoints as |fp|}}
  {{#if fp.used}}used{{/if}}
{{/each}}
```

**Risk Assessment:** ✅ LOW - clear scope

**Loop 4: Condition Steps**
```handlebars
{{#each conditionSteps as |step|}}
  {{#if step.active}}active{{/if}}
{{/each}}
```

**Risk Assessment:** ✅ LOW - clear scope

**Loop 5: Nested - Follower Slots and Tags**
```handlebars
{{#each followerSlots as |slot|}}
  {{#each slot.tags as |tag|}}
    {{tag}}
  {{/each}}
{{/each}}
```

**Risk Assessment:** ⚠️ MEDIUM
- Requires `followerSlots` in context (MISSING)
- Each slot must have tags array
- Tag is a string, should be safe

**Loop 6: Complex - Owned Actors**
```handlebars
{{#with (lookup ../ownedActorMap entry.id) as |actor|}}
  {{actor.name}}
  {{actor.img}}
{{/with}}
```

**Risk Assessment:** ⚠️ MEDIUM-HIGH
- References `ownedActorMap` (MISSING from context)
- Uses lookup helper
- Accesses actor properties in nested context

---

## PHASE 5: PARTIAL CONTEXT VALIDATION

### Identity Strip Partial
**File:** `identity-strip.hbs`
**Receives:** Parent context (all 32 keys)
**Expected:** actor, derived, forceSensitive, identityGlowColor
**Status:** ✅ OK - parent context sufficient

### Abilities Panel Partial
**File:** `abilities-panel.hbs`
**Receives:** Parent context
**Expected:** abilities array, derived
**Status:** ✅ OK

### HP Condition Panel Partial
**File:** `hp-condition-panel.hbs`
**Receives:** Parent context
**Expected:** hp, conditionSteps, derived
**Status:** ✅ OK

### Inventory Panel Partial
**File:** `inventory-panel.hbs`
**Receives:** Parent context
**Expected:** equipment, armor, weapons
**Risk:** ⚠️ MEDIUM - These come from `inventory` object. Template assumes they're root-level keys, but they're nested in inventory object.
**Pattern Detected:**
```javascript
// Context has:
inventory: {equipment: [], armor: [], weapons: []}

// Template uses:
{{#each equipment}}  // WRONG - should be inventory.equipment
```

**Status:** 🔴 CRITICAL - Partial scope mismatch

### Force Panel Partial
**File:** `Force.hbs`
**Receives:** Parent context
**Expected:** forceSuite, forceTags
**Status:** ✅ OK

### Actions Panel Partial
**File:** `actions-panel.hbs`
**Receives:** Parent context
**Expected:** combat, derived
**Status:** ✅ OK

### Skills Panel Partial
**File:** `skills-panel.hbs`
**Receives:** Parent context
**Expected:** derived.skills
**Status:** ✅ OK

### Talent/Feats/Racial Partials
**Receives:** Parent context
**Expected:** derived
**Status:** ✅ OK

---

## PHASE 6: CONDITIONAL PATH SAFETY

### Unsafe Conditionals (Missing null guards)

```handlebars
{{#if derived.encumbrance.skillPenalty}}
```
**Risk:** If `derived.encumbrance` is undefined → silent failure
**Should be:** `{{#if derived.encumbrance?.skillPenalty}}`

```handlebars
{{#if actor.system.forceSensitive}}
```
**Risk:** ✅ SAFE - fallback exists, system is in context

```handlebars
{{#if (eq derived.encumbrance.state "heavy")}}
```
**Risk:** If `derived.encumbrance.state` is undefined → comparison fails silently
**Should be:** `{{#if (eq derived.encumbrance.state "heavy")}}`

**Count of Unsafe Conditionals:** 6+

---

## PHASE 7: DEFAULT VALUE CHECK

### Missing Defaults in Context

```javascript
// Character-sheet.js line 250-254
dspSegments.push({
  index: i,
  filled: i <= dspValue,
  color: i <= dspValue ? '#E74C3C' : '#4A90E2'
});
```
✅ Proper default colors

```javascript
// hp calculation
hp: {
  current: /* computed */,
  max: /* computed */,
  percent: /* computed */
}
```
✅ Percent always computed

**HOWEVER:**

```javascript
// Missing defaults for missing keys:
xpEnabled: ??? (no fallback in _prepareContext)
isLevel0: ??? (no fallback)
isGM: ??? (no fallback)
fpAvailable: ??? (no fallback)
totalWeight: ??? (not computed)
```

**Status:** 🔴 CRITICAL - 13 keys have no fallback defaults

---

## PHASE 8: LOOP CONTEXT ERRORS

### Follower Slots Loop
```handlebars
{{#if followerSlots.length}}
  {{#each followerSlots as |slot|}}
    {{slot.actor}}
    {{slot.isLocked}}
    {{slot.tags}}
    {{#each slot.tags as |tag|}}
      {{tag}}
    {{/each}}
  {{/each}}
{{/if}}
```

**Issues:**
- `followerSlots` NOT in context ⚠️
- `slot.actor` accessed as object, needs `.id` and `.name`
- Nested loop assumes `slot.tags` is array

**Status:** 🔴 CRITICAL

### Owned Actors Lookup Loop
```handlebars
{{#if actor.system.ownedActors}}
  {{#each actor.system.ownedActors as |entry|}}
    {{#with (lookup ../ownedActorMap entry.id) as |actor|}}
      {{actor.name}}
      {{actor.img}}
    {{/with}}
  {{/each}}
{{/if}}
```

**Issues:**
- `ownedActorMap` NOT in context ⚠️
- `lookup` helper requires the map to exist
- Variables named `actor` in nested scope shadows parent `actor` ⚠️

**Status:** 🔴 CRITICAL

---

## SUMMARY: HYDRATION INTEGRITY ASSESSMENT

### Overall Health: 🔴 AT RISK

| Category | Issues | Status |
|----------|--------|--------|
| Missing Context Keys | 13 | 🔴 CRITICAL |
| Partial Scope Mismatches | 1 (inventory) | 🔴 CRITICAL |
| Unsafe Conditionals | 6+ | 🔴 HIGH |
| Variable Shadowing | 1 (actor in lookup) | 🔴 MEDIUM |
| Loop Scope Errors | 2 (followers, owned) | 🔴 CRITICAL |
| Default Guards | 0/13 missing keys | 🔴 CRITICAL |

---

## DETECTED SILENT FAILURE PATTERNS

### Pattern 1: Missing Top-Level Keys
**Keys Used:** `xpEnabled`, `fpAvailable`, `isLevel0`, `isGM`
**Result:** Conditionals silently evaluate to false
**Impact:** Conditional tabs/buttons won't render

### Pattern 2: Inventory Scope Loss
**Main Template:** `{{#each equipment}}`
**Context Has:** `inventory.equipment`
**Result:** Loop never executes (equipment is undefined)
**Impact:** Inventory completely hidden

### Pattern 3: Follower Data Missing
**Keys:** `followerSlots`, `followerTalentBadges`, `ownedActorMap`
**Result:** Biography section partial rendering fails
**Impact:** Character biography/followers appear empty

### Pattern 4: Lookup Helper Missing Context
**Helper:** `lookup ../ownedActorMap entry.id`
**Context Has:** No `ownedActorMap`
**Result:** Lookup returns undefined, block doesn't render
**Impact:** Owned actors list appears empty

### Pattern 5: Nested Path Safety
**Template:** `{{derived.encumbrance.skillPenalty}}`
**Risk:** If `derived.encumbrance` undefined in initialization
**Result:** Silent render failure
**Impact:** Encumbrance info missing

---

## CRITICAL ISSUES TO FIX

### 🔴 Issue #1: Missing Top-Level Context Keys
**Severity:** CRITICAL
**Affects:** Header, tab visibility, button states

**Missing Keys:**
```
- xpEnabled (boolean flag for XP progression visibility)
- xpPercent (XP progress percentage)
- xpLevelReady (whether XP threshold reached)
- isLevel0 (whether character is level 0)
- isGM (whether user is GM - for editing features)
- fpAvailable (whether character has available force points)
- totalWeight (sum of equipped item weights)
- encumbranceStateCss (CSS class for encumbrance styling)
- encumbranceLabel (text label for encumbrance state)
- inventorySearch (search filter value)
```

**Solution:** Add these to _prepareContext() return

---

### 🔴 Issue #2: Inventory Scope Mismatch
**Severity:** CRITICAL
**Affects:** Entire gear tab is invisible

**Problem:**
```javascript
// Context provides:
inventory: {equipment: [], armor: [], weapons: []}

// Template expects:
{{#each equipment}}  // Undefined!
```

**Solution:** Either spread inventory keys into context, or update template to use `inventory.equipment`

---

### 🔴 Issue #3: Follower Data Structure Missing
**Severity:** CRITICAL
**Affects:** Biography section shows no followers

**Problem:**
```javascript
// Context lacks:
followerSlots: []
followerTalentBadges: []
ownedActorMap: {}
```

**Solution:** Build these structures in _prepareContext()

---

### 🔴 Issue #4: Variable Shadowing in Lookup
**Severity:** MEDIUM-HIGH
**Affects:** Owned actors list rendering ambiguous

**Problem:**
```handlebars
{{#with (lookup ../ownedActorMap entry.id) as |actor|}}
  {{actor.name}}  <!-- Shadows parent actor context -->
{{/with}}
```

**Solution:** Rename to `|ownedActor|` to avoid shadowing

---

## NEXT STEPS

1. **Verify Context Building** - Check if _prepareContext() actually computes missing keys (they might be in parent context)
2. **Check Inventory Spreading** - See if inventory keys are spread into context in parent class
3. **Scan NPC Sheet** - Check if npc-sheet.js handles these keys correctly (may have different pattern)
4. **Test with DevTools** - Log finalContext object to browser console to see actual keys at render time

---

## Audit Completed

**Status:** 🔴 **HYDRATION INTEGRITY COMPROMISED**

**Likely Root Cause:** Context keys defined but not returned, or template assumes different context structure than provided.

**Recommendation:** Run Phase 1 verification by logging `finalContext` to console at render time to see actual vs. expected keys.


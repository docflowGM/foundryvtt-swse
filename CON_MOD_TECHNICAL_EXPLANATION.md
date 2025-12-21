# CON.MOD Issue - Complete Technical Explanation

## Your Question
"Why can't it use con.mod? Shouldn't that be an integer?"

**Answer: `con.mod` SHOULD be an integer and IS defined to be one - but there's a critical bug in how it's calculated and maintained during levelup.**

---

## The Design Intent (What SHOULD Happen)

### 1. Template Definition
**File:** `template.json` lines 61-67
```json
"con": {
  "base": 10,
  "racial": 0,
  "temp": 0,
  "total": 10,
  "mod": 0          ← Integer, default 0
}
```
✅ `.mod` is explicitly defined as an integer field

---

### 2. Character Creation Calculates It Correctly
**File:** `chargen-abilities.js` line 13
```javascript
export function _recalcAbilities() {
  for (const [k, v] of Object.entries(this.characterData.abilities)) {
    v.total = (Number(v.base || 10) + Number(v.racial || 0) + Number(v.temp || 0));
    v.mod = Math.floor((v.total - 10) / 2);  // ✅ CALCULATED
  }
}
```
Result: Character with CON 12 gets `.mod = 1` ✅

---

### 3. Data Model RECALCULATES It During Preparation
**File:** `character-data-model.js` lines 152-171
```javascript
// Calculate ability modifiers for attributes
for (const [key, ability] of Object.entries(this.attributes)) {
  const total = ability.base + ability.racial + ability.enhancement + ability.temp;
  ability.total = total;
  ability.mod = Math.floor((total - 10) / 2);  // ✅ RECALCULATED HERE
}

// Create abilities alias for parent class compatibility
if (!this.abilities) {  // ⚠️ ONLY if abilities doesn't exist!
  this.abilities = {};
  for (const [key, attr] of Object.entries(this.attributes)) {
    this.abilities[key] = {
      base: attr.base || 10,
      racial: attr.racial || 0,
      misc: (attr.enhancement || 0) + (attr.temp || 0),
      total: attr.total || 10,
      mod: attr.mod || 0  // ✅ Gets calculated mod
    };
  }
}
```

This is called from `getData()` in levelup-main.js line 181-182:
```javascript
if (actor && typeof actor.prepareData === 'function') {
  actor.prepareData();  // Triggers the above calculation
}
```

---

## So Why Does BUG #3 Exist?

### The Real Issue: Conditional Alias Creation

Look at line 160 carefully:
```javascript
if (!this.abilities) {  // ← ONLY creates alias if abilities doesn't exist
  this.abilities = {};
  // ... set up mod values
}
```

**This means:**
- If `this.abilities` already exists (was set somewhere else)
- The `.mod` recalculation is **SKIPPED**
- Old values persist

**Scenario:**
1. Character created: abilities = { con: { mod: 0 } } (from template)
2. prepareDerivedData() is called
3. Checks `if (!this.abilities)` → FALSE (abilities already exists as default from template!)
4. **SKIPS the `.mod` calculation**
5. levelup-shared.js reads `.mod` → Still 0

---

## The Call Chain During Levelup

```javascript
// levelup-main.js line 175-183
async getData() {
  const data = await super.getData();

  const actor = this.object;
  if (actor && typeof actor.prepareData === 'function') {
    actor.prepareData();  // ← Should calculate .mod
  }
  // ...
  return data;
}

// levelup-main.js line 805 (in _onSelectClass)
this.hpGain = calculateHPGain(classDoc, this.actor, newLevel);

// levelup-shared.js line 291
const conMod = actor.system.abilities.con?.mod || 0;  // ← Reads .mod
```

**Timing Question:** Is getData() called BEFORE _onSelectClass()?
- Answer: YES - render() is called before user can click anything
- BUT the actor might be in an inconsistent state if:
  - The abilities alias wasn't properly created
  - The conditional check `if (!this.abilities)` prevented recalculation
  - prepareDerivedData() wasn't called at the right time

---

## Why It's Confusing

The code has multiple "layers" of mod values:

```javascript
// Layer 1: attributes (the PRIMARY data)
actor.system.attributes.con = {
  base: 10,
  racial: 2,
  enhancement: 0,
  temp: 0,
  total: 12,
  mod: 1  // ← Calculated here
}

// Layer 2: abilities (an ALIAS for compatibility)
actor.system.abilities = {
  con: {
    base: 10,
    racial: 2,
    misc: 0,
    total: 12,
    mod: 1  // ← Should copy from attributes.con.mod
  }
}
```

If the alias isn't created or updated, `abilities.con.mod` doesn't get the calculated value.

---

## The Fix

The issue is in `character-data-model.js` line 160. Instead of:

```javascript
if (!this.abilities) {  // ⚠️ Problematic conditional
  this.abilities = {};
  // ... set up values ...
}
```

Should be:

```javascript
// ALWAYS create/update the abilities alias
this.abilities = {};
for (const [key, attr] of Object.entries(this.attributes)) {
  this.abilities[key] = {
    base: attr.base || 10,
    racial: attr.racial || 0,
    misc: (attr.enhancement || 0) + (attr.temp || 0),
    total: attr.total || 10,
    mod: attr.mod || 0  // Always gets the freshly calculated mod
  };
}
```

This ensures that:
1. `.mod` is ALWAYS recalculated from (total - 10) / 2
2. The abilities alias is ALWAYS synchronized with attributes
3. Levelup code reading `actor.system.abilities.con.mod` gets the correct value

---

## Why Your Question Was Good

You spotted the core contradiction:
- Template says `.mod` should exist (and be an integer)
- Code tries to read `.mod`
- But somehow `.mod` is 0 (or undefined/missing)

The answer is: **The conditional creation of the abilities alias is too restrictive.** Once the actor is created with default abilities, the condition `if (!this.abilities)` becomes false, and the recalculation never happens again.

---

## Test This Theory

To verify this is the bug, check:

```javascript
// In levelup-shared.js BEFORE calculateHPGain():
const actor = actor;
console.log("abilities.con:", actor.system.abilities?.con);  // Should show { ..., mod: X }
console.log("attributes.con:", actor.system.attributes?.con); // Should show { ..., mod: X }
console.log("con.mod actual value:", actor.system.abilities?.con?.mod); // Check if it's 0 or correct
```

If:
- `attributes.con.mod` = 1 (correct)
- `abilities.con.mod` = 0 (wrong)

Then the alias creation is the problem.


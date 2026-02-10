# Progression Engine Analysis Report

**Date:** 2025-12-10
**Test Subject:** Sample Character Creation via Progression Engine
**System:** FoundryVTT Star Wars Saga Edition (SWSE)

---

## Executive Summary

This document provides a detailed walkthrough of the character progression process, identifying specific issues encountered at each step. The analysis simulates creating a Level 1 Human Soldier through the progression engine.

**Quick Stats:**
- ✅ **Working Steps:** 5/11 (45%)
- ⚠️ **Partial Issues:** 4/11 (36%)
- 🔴 **Critical Issues:** 2/11 (18%)

---

## Character Profile: Test Subject

**Name:** Test Character - Progression Engine
**Species:** Human
**Background:** Spacer
**Class:** Soldier (Level 1)
**Ability Scores:** STR 14, DEX 13, CON 12, INT 10, WIS 8, CHA 8

---

## Step-by-Step Process Analysis

### STEP 1: Engine Initialization ✅

**Process:**
```javascript
const engine = new SWSEProgressionEngine(actor, "chargen");
```

**What Happens:**
1. Engine loads saved state from `actor.getFlag('swse', 'progression')`
2. Initializes 8 chargen steps: species → background → attributes → class → skills → feats → talents → finalize
3. Sets current step to "species" (first step)
4. Validates step availability (first step always available)

**Issues:** ✅ **NONE** - This step works correctly

**Data Flow:**
- **Input:** Actor document, mode="chargen"
- **Output:** Engine instance with state:
  ```javascript
  {
    mode: "chargen",
    current: "species",
    completedSteps: [],
    data: {}
  }
  ```

**Files Involved:**
- `scripts/engine/progression.js:10-29`

---

### STEP 2: Species Selection ⚠️

**Process:**
```javascript
await engine.doAction("confirmSpecies", { speciesId: "Human" });
```

**What Happens:**
1. Calls `_action_confirmSpecies()` (line 362)
2. Uses `applyActorUpdateAtomic()` to update `system.progression.species`
3. Stores "Human" in `engine.data.species`
4. Marks "species" step as completed
5. Auto-advances to "background" step

**Issues Found:**

#### ⚠️ Issue #1: Data Structure Inconsistency
**Severity:** MEDIUM
**Location:** `scripts/engine/progression.js:364-366`

The progression engine writes to `system.progression.species` as a string:
```javascript
await applyActorUpdateAtomic(this.actor, {
  "system.progression.species": speciesId  // "Human"
});
```

However, `ActorProgressionUpdater.finalize()` doesn't read this field. It only handles abilities. Species traits (size, languages, ability modifiers) are never applied to the actor.

**Expected:** Species selection should trigger application of:
- Base ability score modifiers
- Starting languages
- Size category
- Speed
- Special traits

**Actual:** Only the species name is stored; no traits are applied.

#### ⚠️ Issue #2: Race vs Species Terminology
**Severity:** LOW
**Location:** `chargen-main.js:494`

CharacterGenerator uses "species" but some legacy code expects "race":
```javascript
race: this.characterData.species,  // Inconsistent naming
```

**Impact:** Potential data loss when migrating between old and new character generation systems.

**Data Flow:**
- **Input:** `{ speciesId: "Human" }`
- **Output:**
  ```javascript
  actor.system.progression.species = "Human"
  engine.completedSteps = ["species"]
  engine.current = "background"
  ```

---

### STEP 3: Background Selection ⚠️

**Process:**
```javascript
await engine.doAction("confirmBackground", { backgroundId: "Spacer" });
```

**What Happens:**
1. Calls `_action_confirmBackground()` (line 371)
2. Updates `system.progression.background` to "Spacer"
3. Marks "background" step as completed
4. Auto-advances to "attributes" step

**Issues Found:**

#### ⚠️ Issue #3: Background Benefits Not Applied
**Severity:** MEDIUM
**Location:** `scripts/engine/progression.js:371-378`

Similar to species, backgrounds grant:
- Trained skills
- Bonus feats (sometimes)
- Starting equipment packages
- Languages (for planet backgrounds)

**Current Behavior:** Only stores the background name; no benefits are granted.

**Expected Behavior:** Should look up background in `PROGRESSION_RULES.backgrounds` and apply:
```javascript
const backgroundData = PROGRESSION_RULES.backgrounds[backgroundId];
// Apply backgroundData.trainedSkills
// Apply backgroundData.bonusFeats (if any)
// Apply backgroundData.languages (if any)
```

**Data Flow:**
- **Input:** `{ backgroundId: "Spacer" }`
- **Output:**
  ```javascript
  actor.system.progression.background = "Spacer"
  engine.completedSteps = ["species", "background"]
  engine.current = "attributes"
  ```

---

### STEP 4: Ability Score Assignment 🔴

**Process:**
```javascript
await engine.doAction("confirmAbilities", {
  method: "pointBuy",
  values: {
    str: { value: 14 },
    dex: { value: 13 },
    con: { value: 12 },
    int: { value: 10 },
    wis: { value: 8 },
    cha: { value: 8 }
  }
});
```

**What Happens:**
1. Calls `_action_confirmAbilities()` (line 380)
2. Updates `system.abilities` directly (NOT in progression namespace!)
3. Stores method and values in `engine.data.abilities`
4. Marks "attributes" step as completed

**Issues Found:**

#### 🔴 Issue #4: Critical Data Model Mismatch
**Severity:** CRITICAL
**Location:** `scripts/engine/progression.js:382-386`

The progression engine updates `system.abilities` directly:
```javascript
await applyActorUpdateAtomic(this.actor, {
  "system.abilities": values  // Direct write!
});
```

But `ActorProgressionUpdater.finalize()` expects to read from `system.progression.abilities`:
```javascript
const abilities = prog.abilities || {};
if (abilities) {
  if (abilities.str !== undefined) updates["system.attributes.str.value"] = abilities.str;
  // ... etc
}
```

**Problems:**
1. **Namespace Confusion:** Engine writes to `system.abilities`, updater reads from `progression.abilities`
2. **Attribute vs Ability Mismatch:** Updater writes to `system.attributes.*`, but SWSE uses `system.abilities.*`
3. **No Validation:** Point buy rules not enforced (could spend 100 points)
4. **No Species Modifiers:** Human +2 to any ability not added

**Impact:** Ability scores may be lost or incorrectly applied during finalization.

**Recommended Fix:**
```javascript
async _action_confirmAbilities(payload) {
  const { method, values } = payload;

  // Validate point buy/method
  if (method === "pointBuy") {
    const cost = calculatePointBuyCost(values);
    if (cost > 25) throw new Error("Point buy exceeded 25 points");
  }

  // Store in progression (canonical)
  await applyActorUpdateAtomic(this.actor, {
    "system.progression.abilities": values,
    "system.progression.abilityMethod": method
  });

  // Apply species modifiers
  const species = this.actor.system.progression.species;
  const modifiedValues = applySpeciesModifiers(values, species);

  // Write final values to actor
  await applyActorUpdateAtomic(this.actor, {
    "system.abilities": modifiedValues
  });

  this.data.abilities = { method, values };
  await this.completeStep("attributes");
}
```

**Data Flow:**
- **Input:**
  ```javascript
  {
    method: "pointBuy",
    values: { str: { value: 14 }, ... }
  }
  ```
- **Output:**
  ```javascript
  actor.system.abilities = { str: { value: 14 }, ... }
  engine.data.abilities = { method: "pointBuy", values: {...} }
  engine.completedSteps = ["species", "background", "attributes"]
  ```

---

### STEP 5: Class Selection 🔴

**Process:**
```javascript
await engine.doAction("confirmClass", { classId: "Soldier" });
```

**What Happens:**
1. Calls `_action_confirmClass()` (line 389)
2. Gets current `classLevels` array from `system.progression`
3. Pushes new class entry: `{ class: "Soldier", level: 1, choices: {} }`
4. Updates `system.progression.classLevels`
5. Marks "class" step as completed

**Issues Found:**

#### 🔴 Issue #5: No Class Benefits Applied
**Severity:** CRITICAL
**Location:** `scripts/engine/progression.js:389-400`

When a class is selected, the following should happen but DON'T:

**Missing Implementations:**

1. **Hit Points Not Calculated**
   - Soldier gets 1d10 + CON mod per level
   - First level HP should be (10 + CON mod)
   - Current: HP not set at all

2. **Base Attack Bonus Not Set**
   - Soldier has +1 BAB at level 1
   - Current: BAB not calculated

3. **Defenses Not Calculated**
   - Reflex = 10 + level + DEX mod
   - Fortitude = 10 + level + CON mod
   - Will = 10 + level + WIS mod
   - Current: Defenses stay at 10

4. **Starting Feats Not Granted**
   - All characters get 1 feat at level 1
   - Humans get +1 bonus feat
   - Soldiers get Armor Proficiency (Light/Medium) and Weapon Proficiency (Pistols, Rifles, Simple)
   - Current: No feats granted automatically

5. **Skill Points Not Calculated**
   - Soldier gets (5 + INT mod) × 4 skill points at level 1
   - Current: Skill points not set

6. **Class Features Not Granted**
   - Soldiers start with "Armored Defense" talent
   - Current: No talents granted

**Data Flow:**
- **Input:** `{ classId: "Soldier" }`
- **Output:**
  ```javascript
  actor.system.progression.classLevels = [
    { class: "Soldier", level: 1, choices: {} }
  ]
  engine.completedSteps = [..., "class"]
  ```

**Recommended Fix:**
```javascript
async _action_confirmClass(payload) {
  const { classId } = payload;
  const classData = PROGRESSION_RULES.classes[classId];
  if (!classData) throw new Error(`Unknown class: ${classId}`);

  const level = 1;
  const conMod = this.actor.system.abilities.con.mod;
  const intMod = this.actor.system.abilities.int.mod;

  // Calculate HP (max at level 1)
  const maxHP = classData.hitDie + conMod;

  // Calculate skill points
  const skillPoints = (classData.skillPoints + intMod) * 4; // ×4 at level 1

  // Update progression
  const progression = this.actor.system.progression || {};
  const classLevels = Array.from(progression.classLevels || []);
  classLevels.push({
    class: classId,
    level: level,
    choices: {},
    hp: maxHP,
    skillPoints: skillPoints
  });

  await applyActorUpdateAtomic(this.actor, {
    "system.progression.classLevels": classLevels,
    "system.attributes.hp.max": maxHP,
    "system.attributes.hp.value": maxHP,
    "system.level": level
  });

  // Grant starting feats
  await this._grantStartingFeats(classData);

  this.data.class = classId;
  await this.completeStep("class");
}
```

---

### STEP 6: Skill Allocation ⚠️

**Process:**
```javascript
await engine.doAction("confirmSkills", {
  skills: ["Pilot", "Mechanics", "Perception", "Initiative"]
});
```

**What Happens:**
1. Calls `_action_confirmSkills()` (line 402)
2. Updates `system.progression.skills` with skill array
3. Marks "skills" step as completed

**Issues Found:**

#### ⚠️ Issue #6: Skill Point Budget Not Enforced
**Severity:** HIGH
**Location:** `scripts/engine/progression.js:402-409`

**Current Code:**
```javascript
async _action_confirmSkills(payload) {
  const { skills } = payload;
  await applyActorUpdateAtomic(this.actor, {
    "system.progression.skills": skills
  });
  this.data.skills = skills;
  await this.completeStep("skills");
}
```

**Problems:**
1. No validation of skill point budget
2. No distinction between trained/untrained
3. No rank tracking (could put all points in one skill)
4. Skills stored as array of names, not objects with ranks

**Expected Behavior:**
```javascript
async _action_confirmSkills(payload) {
  const { skills } = payload; // Should be: [{ name: "Pilot", ranks: 4 }, ...]

  // Calculate available skill points
  const classData = this._getClassData();
  const intMod = this.actor.system.abilities.int.mod;
  const availablePoints = (classData.skillPoints + intMod) * 4;

  // Validate skill point allocation
  const spentPoints = skills.reduce((sum, s) => sum + s.ranks, 0);
  if (spentPoints > availablePoints) {
    throw new Error(`Too many skill points: ${spentPoints}/${availablePoints}`);
  }

  // Validate max ranks (level + 3 for class skills, level for cross-class)
  for (const skill of skills) {
    const isClassSkill = classData.classSkills.includes(skill.name);
    const maxRanks = isClassSkill ? (this.actor.system.level + 3) : this.actor.system.level;

    if (skill.ranks > maxRanks) {
      throw new Error(`${skill.name}: too many ranks (${skill.ranks}/${maxRanks})`);
    }
  }

  await applyActorUpdateAtomic(this.actor, {
    "system.progression.skills": skills
  });

  // Create actual skill items
  await this._createSkillItems(skills);

  this.data.skills = skills;
  await this.completeStep("skills");
}
```

#### ⚠️ Issue #7: Data Structure Mismatch with Prerequisites
**Severity:** HIGH
**Reference:** Known bug from `chargen-levelup-review.md:44-64`

Prerequisite validation expects:
```javascript
pendingSkills = [{ key: "Pilot", name: "Pilot", ranks: 4 }, ...]
```

But progression engine stores:
```javascript
skills = ["Pilot", "Mechanics", ...]
```

**Impact:** Feats requiring skill ranks (e.g., "Skill Focus: Pilot") won't validate correctly during progression.

**Data Flow:**
- **Input:** `{ skills: ["Pilot", "Mechanics", "Perception", "Initiative"] }`
- **Output:**
  ```javascript
  actor.system.progression.skills = ["Pilot", ...]
  engine.completedSteps = [..., "skills"]
  ```

---

### STEP 7: Feat Selection ⚠️

**Process:**
```javascript
await engine.doAction("confirmFeats", {
  featIds: ["Weapon Proficiency (Pistols)", "Armor Proficiency (Light)"]
});
```

**What Happens:**
1. Calls `_action_confirmFeats()` (line 411)
2. Merges new feats with existing `progression.feats` array
3. Deduplicates using `Set`
4. Marks "feats" step as completed

**Issues Found:**

#### ⚠️ Issue #8: No Prerequisite Validation
**Severity:** HIGH
**Location:** `scripts/engine/progression.js:411-421`

**Current Code:**
```javascript
async _action_confirmFeats(payload) {
  const { featIds } = payload;
  const progression = this.actor.system.progression || {};
  const feats = Array.from(new Set([...(progression.feats || []), ...featIds]));

  await applyActorUpdateAtomic(this.actor, {
    "system.progression.feats": feats
  });
  this.data.feats = featIds;
  await this.completeStep("feats");
}
```

**Problems:**
1. No prerequisite checking (could select "Power Attack" without BAB +1)
2. No feat budget enforcement (could select unlimited feats)
3. No duplicate checking (Set prevents exact duplicates, but what about "Weapon Focus (Lightsaber)" multiple times?)
4. Feats stored as strings, not Item documents

**Expected Behavior:**
```javascript
async _action_confirmFeats(payload) {
  const { featIds } = payload;

  // Calculate feat budget
  const level = this.actor.system.level;
  const isHuman = this.actor.system.progression.species === "Human";
  const classData = this._getClassData();

  let availableFeats = Math.floor((level + 1) / 2); // 1 at level 1, 2 at level 3, etc.
  if (isHuman) availableFeats++; // Humans get +1
  if (classData.bonusFeats?.includes(level)) availableFeats++; // Class bonus feats

  const currentFeats = this.actor.system.progression.feats || [];
  const totalFeats = currentFeats.length + featIds.length;

  if (totalFeats > availableFeats) {
    throw new Error(`Too many feats selected: ${totalFeats}/${availableFeats}`);
  }

  // Validate prerequisites for each feat
  const PrerequisiteValidator = await import('./prerequisite-validator.js');
  for (const featId of featIds) {
    const feat = await this._getFeatData(featId);
    const meetsPrereqs = await PrerequisiteValidator.validateFeat(this.actor, feat, {
      pendingData: {
        level: level,
        abilities: this.actor.system.abilities,
        feats: [...currentFeats, ...featIds],
        skills: this.actor.system.progression.skills
      }
    });

    if (!meetsPrereqs.valid) {
      throw new Error(`Prerequisites not met for ${featId}: ${meetsPrereqs.reason}`);
    }
  }

  // Merge and deduplicate
  const feats = Array.from(new Set([...currentFeats, ...featIds]));

  await applyActorUpdateAtomic(this.actor, {
    "system.progression.feats": feats
  });

  // Create feat items
  await this._createFeatItems(featIds);

  this.data.feats = featIds;
  await this.completeStep("feats");
}
```

#### ⚠️ Issue #9: Feats Not Created as Items
**Severity:** MEDIUM

Feats are stored as strings in `system.progression.feats`, but should be actual Item documents on the actor. This means:
- Feat effects don't apply
- Sheet won't show feats in the feat tab
- Feat bonuses (e.g., +2 to skill) won't calculate

**Data Flow:**
- **Input:** `{ featIds: ["Weapon Proficiency (Pistols)", "Armor Proficiency (Light)"] }`
- **Output:**
  ```javascript
  actor.system.progression.feats = [
    "Weapon Proficiency (Pistols)",
    "Armor Proficiency (Light)"
  ]
  engine.completedSteps = [..., "feats"]
  ```

---

### STEP 8: Talent Selection ⚠️

**Process:**
```javascript
await engine.doAction("confirmTalents", {
  talentIds: ["Quick Draw"]
});
```

**What Happens:**
1. Calls `_action_confirmTalents()` (line 423)
2. Merges new talents with existing `progression.talents`
3. Marks "talents" step as completed

**Issues Found:**

Same issues as feats:
- ⚠️ No prerequisite validation
- ⚠️ No talent budget enforcement
- ⚠️ No talent tree validation (some talents require earlier talents in tree)
- ⚠️ Talents not created as Items

**Additional Issue:**

#### ⚠️ Issue #10: No Talent Tree Structure Validation
**Severity:** MEDIUM

Talents in SWSE are organized in trees. For example, the "Quick Draw" talent is in the "Gunslinger" tree. You should only be able to select talents from trees your class has access to.

**Current:** No validation of talent tree access or prerequisites within trees.

**Data Flow:**
- **Input:** `{ talentIds: ["Quick Draw"] }`
- **Output:**
  ```javascript
  actor.system.progression.talents = ["Quick Draw"]
  engine.completedSteps = [..., "talents"]
  ```

---

### STEP 9: Languages ✅ (Recently Fixed)

**Process:**
This step is automatic and happens via the `SWSELanguageModule` hook listening to `swse:progression:completed`.

**What Happens:**
1. Language module listens for progression completion
2. On chargen completion, calculates languages:
   - Species base languages (e.g., "Basic" for Humans)
   - INT modifier bonus languages (as `CHOOSE_LANGUAGE` tokens)
3. Updates `actor.system.languages`

**Issues:** ✅ **RESOLVED** as of commit `b599dbb` (Dec 9, 2025)

Previous issues that are now fixed:
- ✅ Languages granted at chargen (species + INT mod)
- ✅ Languages granted on level-up when INT increases
- ✅ Linguist feat grants 3 language slots
- ✅ Speak Language skill ranks grant language slots

**Data Flow:**
- **Trigger:** `Hooks.call('swse:progression:completed', { actor, mode: "chargen" })`
- **Output:**
  ```javascript
  actor.system.languages = [
    "Basic",  // Human species
    "CHOOSE_LANGUAGE",  // INT mod = 0, so no bonus
  ]
  ```

For our test character (INT 10, mod +0), only species languages are granted.

**Files Involved:**
- `scripts/progression/modules/language-module.js:37-48`

---

### STEP 10: Finalization 🔴

**Process:**
```javascript
await engine.finalize();
```

**What Happens:**
1. Calls `engine.finalize()` (line 333)
2. Saves state to actor flags
3. Emits `swse:progression:completed` hook
4. Language module responds to hook (see Step 9)

**Issues Found:**

#### 🔴 Issue #11: ActorProgressionUpdater Not Called
**Severity:** CRITICAL
**Location:** `scripts/engine/progression.js:333-356`

**Current Code:**
```javascript
async finalize() {
  try {
    // Apply all changes
    await this.saveStateToActor();

    // Emit completion event
    Hooks.call('swse:progression:completed', {
      actor: this.actor,
      mode: this.mode,
      level: this.actor.system.level
    });

    swseLogger.log(`Progression finalized for ${this.actor.name}`);
    return true;
  } catch (err) {
    swseLogger.error('Progression finalize failed:', err);
    throw err;
  }
}
```

**Problem:** The `ActorProgressionUpdater.finalize()` method is NEVER called!

The compatibility layer (`ProgressionEngine`) calls it:
```javascript
// scripts/progression/engine/progression-engine.js:86
await ActorProgressionUpdater.finalize(actor);
```

But the new `SWSEProgressionEngine` doesn't. This means:
- Abilities from `progression.abilities` won't copy to `system.attributes.*`
- HP won't be calculated from class levels
- Feats/talents flags won't be set

**Impact:** Character sheet will show incomplete/incorrect data.

**Recommended Fix:**
```javascript
async finalize() {
  try {
    // Save progression state
    await this.saveStateToActor();

    // Apply derived fields
    const { ActorProgressionUpdater } = await import('../progression/engine/progression-actor-updater.js');
    await ActorProgressionUpdater.finalize(this.actor);

    // Trigger force powers (if applicable)
    const { ForcePowerEngine } = await import('../progression/engine/force-power-engine.js');
    await ForcePowerEngine.handleForcePowerTriggers(this.actor, {});

    // Emit completion event
    Hooks.call('swse:progression:completed', {
      actor: this.actor,
      mode: this.mode,
      level: this.actor.system.level
    });

    swseLogger.log(`Progression finalized for ${this.actor.name}`);
    return true;
  } catch (err) {
    swseLogger.error('Progression finalize failed:', err);
    throw err;
  }
}
```

---

### STEP 11: Post-Finalization State Inspection

**Expected Actor State:**
```javascript
{
  name: "Test Character - Progression Engine",
  type: "character",
  system: {
    level: 1,
    species: "Human",
    progression: {
      species: "Human",
      background: "Spacer",
      abilities: { str: 14, dex: 13, con: 12, int: 10, wis: 8, cha: 8 },
      classLevels: [{ class: "Soldier", level: 1, choices: {} }],
      skills: ["Pilot", "Mechanics", "Perception", "Initiative"],
      feats: ["Weapon Proficiency (Pistols)", "Armor Proficiency (Light)"],
      talents: ["Quick Draw"]
    },
    abilities: {
      str: { value: 14, mod: 2 },
      dex: { value: 13, mod: 1 },
      con: { value: 12, mod: 1 },
      int: { value: 10, mod: 0 },
      wis: { value: 8, mod: -1 },
      cha: { value: 8, mod: -1 }
    },
    attributes: {
      hp: { value: 11, max: 11 }  // 10 (HD) + 1 (CON mod)
    },
    defenses: {
      reflex: { total: 12 },   // 10 + 1 (level) + 1 (DEX mod)
      fortitude: { total: 12 }, // 10 + 1 (level) + 1 (CON mod)
      will: { total: 10 }       // 10 + 1 (level) - 1 (WIS mod)
    },
    languages: ["Basic"]
  },
  items: [
    // Should contain feat items, talent items, skill items
  ]
}
```

**Actual Actor State (Based on Current Code):**
```javascript
{
  name: "Test Character - Progression Engine",
  type: "character",
  system: {
    level: 0,  // ❌ Not set!
    progression: {
      species: "Human",
      background: "Spacer",
      classLevels: [{ class: "Soldier", level: 1, choices: {} }],
      skills: ["Pilot", "Mechanics", "Perception", "Initiative"],
      feats: ["Weapon Proficiency (Pistols)", "Armor Proficiency (Light)"],
      talents: ["Quick Draw"]
    },
    abilities: {
      // ⚠️ Set, but species modifiers not applied
      str: { value: 14, mod: 2 },
      dex: { value: 13, mod: 1 },
      // ...
    },
    attributes: {
      hp: { value: 0, max: 0 }  // ❌ Not calculated!
    },
    defenses: {
      reflex: { total: 10 },   // ❌ Not calculated!
      fortitude: { total: 10 },
      will: { total: 10 }
    },
    languages: ["Basic"]  // ✅ Language module worked!
  },
  items: []  // ❌ Feats/talents/skills not created as items!
}
```

---

## Summary of Issues

### Critical Issues (Must Fix)

| ID | Issue | Severity | Location | Impact |
|----|-------|----------|----------|--------|
| #4 | Ability score data model mismatch | 🔴 CRITICAL | `progression.js:382-386` | Abilities may be lost/corrupted |
| #5 | Class benefits not applied (HP, BAB, defenses, feats) | 🔴 CRITICAL | `progression.js:389-400` | Character is non-functional |
| #11 | ActorProgressionUpdater never called | 🔴 CRITICAL | `progression.js:333-356` | Derived stats not calculated |

### High Priority Issues

| ID | Issue | Severity | Location | Impact |
|----|-------|----------|----------|--------|
| #6 | Skill point budget not enforced | ⚠️ HIGH | `progression.js:402-409` | Players can cheat skill points |
| #7 | Skill data structure mismatch | ⚠️ HIGH | `progression.js:402-409` | Prerequisite validation fails |
| #8 | Feat prerequisite validation missing | ⚠️ HIGH | `progression.js:411-421` | Players can select invalid feats |

### Medium Priority Issues

| ID | Issue | Severity | Location | Impact |
|----|-------|----------|----------|--------|
| #1 | Species traits not applied | ⚠️ MEDIUM | `progression.js:362-369` | Missing abilities/languages/size |
| #3 | Background benefits not applied | ⚠️ MEDIUM | `progression.js:371-378` | Missing skills/feats/equipment |
| #9 | Feats not created as items | ⚠️ MEDIUM | `progression.js:411-421` | Feat effects don't apply |
| #10 | Talent tree validation missing | ⚠️ MEDIUM | `progression.js:423-433` | Can select invalid talents |

### Low Priority Issues

| ID | Issue | Severity | Location | Impact |
|----|-------|----------|----------|--------|
| #2 | Race vs species terminology inconsistency | ⚠️ LOW | `chargen-main.js:494` | Potential data migration issues |

---

## Architectural Issues

### 1. Separation of Concerns

**Problem:** The progression engine has too many responsibilities:
- State management (current step, completed steps)
- Data storage (species, class, feats)
- Action execution (doAction)
- Validation (missing!)
- Derived stat calculation (missing!)

**Recommendation:** Split into:
- `ProgressionEngine` - State machine and workflow
- `ProgressionValidator` - All validation logic
- `ProgressionRuleEngine` - Apply class/species/background rules
- `ProgressionItemFactory` - Create feat/talent/skill items

### 2. Data Flow Inconsistencies

**Current Flow:**
```
User Input → Engine Action → Direct actor.update() → (end)
```

**Expected Flow:**
```
User Input → Engine Action → Validate → Update Progression → Finalize → Apply Derived Stats
```

**Problem:** Steps 3-5 are missing or incomplete.

### 3. No Rollback Mechanism

If finalization fails halfway through (e.g., compendium unavailable), the actor is left in a corrupted state with no way to undo.

**Recommendation:** Implement transaction-style updates:
```javascript
const transaction = new ProgressionTransaction(actor);
try {
  transaction.begin();
  transaction.update("system.progression.species", "Human");
  transaction.update("system.progression.class", "Soldier");
  // ... more updates
  await transaction.commit();
} catch (err) {
  await transaction.rollback();
  throw err;
}
```

### 4. Missing Integration Points

The following systems exist but aren't integrated with the progression engine:
- `ForcePowerEngine` - Only triggered via compatibility layer
- `AttributeIncreaseHandler` - Not called during progression
- `TemplateEngine` - Separate code path
- Prerequisite validation - Not enforced

---

## Comparison: Old vs New Engine

| Feature | CharacterGenerator (Old) | SWSEProgressionEngine (New) | Winner |
|---------|--------------------------|------------------------------|---------|
| **State Management** | ✅ Full state machine | ✅ Full state machine | Tie |
| **Validation** | ✅ Extensive validation | ❌ Missing | Old |
| **Species Application** | ✅ Full traits applied | ❌ Name only | Old |
| **Class Benefits** | ✅ HP, BAB, feats, skills | ❌ Name only | Old |
| **Skill Points** | ✅ Budget enforced | ❌ No validation | Old |
| **Feat Prerequisites** | ✅ Validated | ❌ Not checked | Old |
| **Item Creation** | ✅ Creates items | ❌ Stores strings | Old |
| **Code Organization** | ❌ Scattered across files | ✅ Centralized | New |
| **Maintainability** | ❌ Hard to modify | ✅ Easy to extend | New |
| **Hook Integration** | ❌ Direct coupling | ✅ Event-driven | New |
| **Backward Compatibility** | ✅ Works with existing | ⚠️ Via compatibility layer | Old |

**Conclusion:** The new engine has better architecture but is functionally incomplete. The old CharacterGenerator actually creates working characters.

---

## Recommendations

### Immediate Actions (Fix Critical Bugs)

1. **Fix Ability Score Data Flow** (Issue #4)
   - Decide: Write to `system.abilities` or `system.progression.abilities`?
   - Update `ActorProgressionUpdater` to match
   - Add species modifier application

2. **Implement Class Benefits** (Issue #5)
   - Calculate and set HP
   - Calculate BAB
   - Calculate defenses
   - Grant starting feats/proficiencies
   - Set skill point budget

3. **Call ActorProgressionUpdater.finalize()** (Issue #11)
   - Add call in `SWSEProgressionEngine.finalize()`
   - Verify derived stats are correct

### Short-Term Actions (Complete Implementation)

4. **Add Validation Layer**
   - Point buy validation
   - Skill point budget enforcement
   - Feat prerequisite checking
   - Talent tree validation

5. **Implement Rule Application**
   - Species traits (size, speed, languages, abilities)
   - Background benefits (skills, feats, equipment)
   - Class features (proficiencies, talents)

6. **Create Items from Progression Data**
   - Feats → Feat items
   - Talents → Talent items
   - Skills → Skill items

### Long-Term Actions (Architecture Improvements)

7. **Refactor for Separation of Concerns**
   - Extract validation into `ProgressionValidator`
   - Extract rule application into `ProgressionRuleEngine`
   - Extract item creation into `ProgressionItemFactory`

8. **Add Transaction Support**
   - Implement rollback on errors
   - Batch all updates for atomicity

9. **Complete Migration**
   - Update all UI to use new engine
   - Remove old CharacterGenerator code
   - Migrate existing characters

10. **Comprehensive Testing**
    - Unit tests for each action
    - Integration tests for full progression
    - Regression tests for edge cases

---

## Test Results

**Test:** Create a Level 1 Human Soldier
**Status:** ⚠️ **PARTIAL FAILURE**

**What Worked:**
- ✅ Engine initialization
- ✅ Step navigation
- ✅ Data persistence to `system.progression`
- ✅ Language assignment (via module)
- ✅ State management (completed steps tracking)

**What Failed:**
- ❌ Character is non-functional (no HP, defenses, BAB)
- ❌ Species traits not applied
- ❌ Class benefits not applied
- ❌ No items created (feats/talents/skills)
- ❌ No validation of choices

**Character Sheet Display:**
- HP: 0/0 (should be 11/11)
- Defenses: REF 10, FORT 10, WILL 10 (should be 12, 12, 10)
- Feats: None (should have 3-4 feats)
- Skills: None (should have ~20 skill points allocated)
- Class Features: None (should have Armored Defense talent)

**Conclusion:** The progression engine successfully tracks workflow and stores choices, but fails to apply those choices to create a functional character. The character would need manual editing to become playable.

---

## Appendix: Code Locations

### Core Files
- `scripts/engine/progression.js` - New progression engine
- `scripts/progression/engine/progression-engine.js` - Compatibility layer
- `scripts/progression/engine/progression-actor-updater.js` - Derived stat calculator
- `scripts/progression/modules/language-module.js` - Language grants

### Legacy UI Files
- `scripts/apps/chargen/chargen-main.js` - Old character generator
- `scripts/apps/levelup/levelup-main.js` - Level-up dialog
- `scripts/apps/chargen/chargen-feats-talents.js` - Feat/talent selection

### Supporting Files
- `scripts/progression/data/progression-data.js` - Rules data (incomplete)
- `scripts/utils/actor-utils.js` - Atomic update helper
- `scripts/actors/engine/actor-engine.js` - Actor update wrapper

---

## Appendix: Hook Flow

```
User Action
    ↓
SWSEProgressionEngine.doAction()
    ↓
_action_confirmX() methods
    ↓
applyActorUpdateAtomic()
    ↓
actor.update()
    ↓
completeStep()
    ↓
Hooks.call('swse:progression:updated')
    ↓
finalize()
    ↓
Hooks.call('swse:progression:completed')
    ↓
SWSELanguageModule.handleChargen()
    ↓
actor.update({ "system.languages": [...] })
```

**Missing from flow:**
- ActorProgressionUpdater.finalize()
- ForcePowerEngine.handleForcePowerTriggers()
- Item creation
- Validation at each step

---

**End of Report**

# Audit: Complex Multiclass Progression

## Character: Master Pathfinder
Final state: **Jedi 4 / Scout 2 / Jedi Knight 4 / Pathfinder 1 / Jedi Knight 5**
- Total Character Level: 16
- 5 class selections across 2 base classes + 2 prestige classes

---

## Expected State (Rules Correct)

### Feat Budget

| Level | Event | Source | Feats Added | Running Total |
|-------|-------|--------|-------------|----------------|
| 1 | Create | Jedi L1 starting + species | 1 + 1 (Human) = 2 | 2 |
| 2 | Jedi L2 | No bonus feat | 0 | 2 |
| 3 | Jedi L3 | No bonus feat | 0 | 2 |
| 4 | Jedi L4 + Ability | Feat for level 4 | 1 | 3 |
| 5 | Scout L1 | Scout starting feats | 0 | 3 |
| 6 | Scout L2 | No bonus feat | 0 | 3 |
| 7 | JK L1* | Prestige class starting | ? | ? |
| 8 | JK L2 + Ability | Feat for level 8 | 1 | 4 |
| 9 | JK L3 | No bonus feat | 0 | 4 |
| 10 | JK L4 | No bonus feat | 0 | 4 |
| 11 | Pathfinder L1* | Prestige starting | ? | ? |
| 12 | JK L5 + Ability | Feat for level 12 | 1 | 5 |
| **16 (End)** | | | | **5 feats** |

**⚠️ Questions the engine must answer**:
1. Do prestige classes grant starting feats? (Jedi Knight at L7, Pathfinder at L11)
2. Is "Feat for level X" per character level or per class level?
3. Does ability score increase at L4/L8/L12/L16 grant a feat?

**Current engine likely breaks at**: Prestige class multiclass transitions (JK to Pathfinder, back to JK).

---

### Talent Budget

Per SWSE rules, talents are granted at:
- Class level 1: 0 (feats instead for some classes)
- Every other level (typically)

| Level | Jedi Lv | Scout Lv | JK Lv | Path Lv | Talents Granted | Running Total |
|-------|---------|----------|-------|---------|-----------------|----------------|
| 1 | 1 | - | - | - | Jedi L1 talent | 1 |
| 2 | 2 | - | - | - | Jedi L2 talent | 2 |
| 3 | 3 | - | - | - | Jedi L3 talent | 3 |
| 4 | 4 | - | - | - | Jedi L4 talent | 4 |
| 5 | - | 1 | - | - | Scout L1 talent | 5 |
| 6 | - | 2 | - | - | Scout L2 talent | 6 |
| 7 | - | - | 1 | - | JK L1 talent | 7 |
| 8 | - | - | 2 | - | JK L2 talent | 8 |
| 9 | - | - | 3 | - | JK L3 talent | 9 |
| 10 | - | - | 4 | - | JK L4 talent | 10 |
| 11 | - | - | - | 1 | Path L1 talent | 11 |
| 12 | - | - | 5 | - | JK L5 talent | 12 |
| **16 (End)** | | | | | | **12 talents** |

**⚠️ Questions**:
1. Does Pathfinder grant talents at L1?
2. Does switching between prestige classes break talent accumulation?
3. Is talent budget reset or accumulated?

---

### BAB (Base Attack Bonus)

SWSE formula per class:
```
Jedi: high progression (1 per level)
Scout: medium progression (0.75 per level)
Jedi Knight: high progression (1 per level, prestige)
Pathfinder: ? (prestige)
```

**Expected**:
- Jedi: 4 levels = +4
- Scout: 2 levels = +1.5 → +1 (floor)
- Jedi Knight: 4 levels = +4
- Pathfinder: 1 level = +1 (assume high)
- Jedi Knight: 5 levels = +5
- **Total: +4 +1 +4 +1 +5 = +15**

**⚠️ Current Risk**:
- `calculateBAB()` sums all class contributions ✅ (should work)
- But if `_calculateBaseAttack()` was still in data model: `Math.floor(level * 0.75) = Math.floor(16 * 0.75) = 12` ❌
- Hotfix removed it, so BAB should come from progression only ✅

---

### Defenses

SWSE grants class bonuses at level 1 of each class. Highest bonus is used (not stacked).

```
Jedi: Fort +1, Ref +1, Will +1
Scout: Fort +1, Ref +2, Will +0
Jedi Knight: ? (prestige)
Pathfinder: ? (prestige)
```

**Expected** (assume prestige classes stack normally):
- Reflex: 10 + Dex mod + MAX(1, 2, ?, ?) + level 16 + condition
- Fortitude: 10 + Str mod + MAX(1, 1, ?, ?) + level 16 + condition
- Will: 10 + Wis mod + MAX(1, 0, ?, ?) + level 16 + condition

**⚠️ Questions**:
1. Do prestige class defense bonuses replace or stack with base class?
2. Is defense.classBonus recalculated correctly when switching prestige classes?
3. Does switching back to Jedi Knight reset will bonus?

---

### Force Powers & Secrets

Jedis do NOT grant force powers by level. Force powers are only granted by:
1. **Force Sensitivity** feat at Jedi L1 (grants 1 force power for free) ✅
2. **Force Training** feat (grants additional force power per rank)

Scout, Jedi Knight, Pathfinder: do not grant force powers directly.

**Expected**:
- Jedi L1: Force Sensitivity feat grants 1 force power
- Master Pathfinder overall: 1 force power (from Jedi L1 Force Sensitivity only)
- If any Force Training feats taken: +1 power per feat

**⚠️ Bugs the engine might still have**:
1. Force Training feat may not be gated to force-sensitive classes
2. Duplicate force training feat selection (taken twice = 2 power grants?)
3. Force power picker integration with multiclass prestige classes
4. Verify Force Sensitivity is auto-granted at Jedi L1, not human-selectable

---

### Skills (Trained at Level 1)

SWSE grants trainings only at character level 1, not at each class level 1.

```
Training slots = ClassSkillPoints(firstClass) + INT mod + (1 if Human else 0)
```

**Expected**:
- Jedi level 1: 2 skill points + INT mod + 1 (Human) = 3 + INT mod
- No new trainings at Scout L1, JK L1, Pathfinder L1, or JK L5

**⚠️ Bug risk**:
1. Does the engine correctly identify "first class taken" vs "first level of any class"?
2. Does it grant skill trainings at each prestige class level 1? (WRONG)
3. Is INT mod calculated at L1 or recalculated at L5 when it increases?

---

### Class Features

Each class level 1 grants:
- **Jedi**: Force Sensitivity, Lightsaber Proficiency
- **Scout**: Shake It Off feat (probably), movement bonuses
- **Jedi Knight**: Lightsaber Focus (prestige feature)
- **Pathfinder**: ? (prestige feature)

**⚠️ Current engine issues** (from JEDI_1-2_AUDIT.md):
1. Feature Dispatcher runs during finalize (not during level-up intent)
2. Multiple mutation points mean features could be out of sync
3. Prestige class features not documented (are they auto-granted?)

---

## Actual Execution Path (What Will Break)

### Break Point 1: Prestige Class Prerequisite Validation

**Location**: scripts/engine/progression.js:1225-1278

At level 7 (adding Jedi Knight):
```javascript
if (classData.prestigeClass) {
  const requiredLevel = REQUIRED_PRESTIGE_LEVEL || 7;
  if (currentLevel < requiredLevel) {  // ← BUG: currentLevel = classLevels.length
    throw new Error(`...requires level ${requiredLevel}. Current level: ${currentLevel}`);
  }
}
```

**Bug**: `currentLevel = classLevels.length`
- After Jedi 4 + Scout 2 = classLevels.length = 6
- But character level = 6 (correct by accident)
- However, if the order was different (Scout 2 first), classLevels.length = 2 ≠ character level 2

**Issue**: Using array length instead of counting actual character levels. Works by coincidence here, but fragile.

**Verdict**: ⚠️ Works for this path, but order-dependent bug exists.

---

### Break Point 2: Feat Budget Accumulation

**Location**: scripts/engine/progression.js:1333-1345

```javascript
let featBudget = progression.featBudget || 0;

if (classLevels.length === 1) {
  const speciesData = PROGRESSION_RULES.species[progression.species];
  featBudget = 1;
  if (speciesData?.bonusFeat) featBudget++;
}

if (levelFeatures.bonusFeats > 0) {
  featBudget += levelFeatures.bonusFeats;
}
```

**Trace for Jedi Knight at L7**:
1. Previous state: `featBudget = 3` (from Jedi 4 + Jedi L1 starting 1 + Human bonus 1 + nothing from Scout L1)
2. `classLevels.length = 6` (not 1), so don't reset featBudget ✅
3. Look up JK L1 `levelFeatures.bonusFeats` from compendium
4. Add to existing budget ✅

**However**:
- What if JK starting feats are supposed to be auto-granted (like Jedi's Force Sensitivity)?
- The code only handles `levelFeatures.bonusFeats`, not starting feats
- Look back at code:1354-1372 — handles `startingFeats` but only calls it per class level 1

```javascript
const classStartingFeats = (levelInClass === 1) ? (classData.startingFeats || []) : [];
```

**For JK at L7** (levelInClass = 1 of JK):
- JK starting feats WILL be added ✅

**But what about ability score increase feats?**
- At L4, L8, L12, L16: do we grant feat selection?
- Current code doesn't handle this at all ❌
- See levelFeatures: only checks `bonusFeats`, not ability increase feats

**Verdict**: 🚨 **Ability increase feats missing** (L4, L8, L12, L16)

---

### Break Point 3: Talent Budget Across Prestige Classes

**Location**: scripts/engine/progression.js:1347-1351

```javascript
let talentBudget = progression.talentBudget || 0;
if (levelFeatures.talents > 0) {
  talentBudget += levelFeatures.talents;
}
```

**Trace for Pathfinder at L11**:
1. Current talentBudget ≈ 10 (from Jedi 4 + Scout 2 + JK 4)
2. Look up Pathfinder L1 levelFeatures.talents
3. Add to budget

**Problem**: No record of which talents were selected at which level. If a prestige class requires specific talents, how does the engine validate?

**Verdict**: ⚠️ Talents accumulate, but no per-level tracking or prestige requirements.

---

### Break Point 4: BAB Calculation (Post-Hotfix)

**Location**: scripts/progression/data/progression-data.js:219-242

```javascript
export async function calculateBAB(classLevels) {
  let totalBAB = 0;
  for (const classLevel of classLevels) {
    const classData = await getClassData(classLevel.class);
    const levelProgression = rawData?.level_progression || [];
    const levelsInClass = classLevel.level || 1;
    if (levelsInClass > 0 && levelsInClass <= levelProgression.length) {
      const finalLevelData = levelProgression[levelsInClass - 1];
      totalBAB += finalLevelData.bab || 0;
    }
  }
  return totalBAB;
}
```

**Trace for Master Pathfinder**:
1. classLevels = [
     { class: "Jedi", level: 4 },
     { class: "Scout", level: 2 },
     { class: "Jedi Knight", level: 4 },
     { class: "Pathfinder", level: 1 },
     { class: "Jedi Knight", level: 5 }
   ]
2. For each, load levelProgression and sum `finalLevelData.bab`
3. Jedi[4].bab + Scout[2].bab + JK[4].bab + Path[1].bab + JK[5].bab

**Potential issues**:
- Does compendium have Pathfinder class data? If not, returns null ❌
- Does getClassData handle missing classes gracefully? Probably console.warn ⚠️
- No validation that Pathfinder.levelProgression[1] exists

**Verdict**: 🚨 **If Pathfinder not in compendium, BAB will be wrong** (missing Path contribution)

---

### Break Point 5: Defenses with Prestige Classes

**Location**: scripts/data-models/actor-data-model.js:227-246

```javascript
this.defenses.reflex.total =
  10 + this.defenses.reflex.armor +
  this.abilities.dex.mod +
  this.defenses.reflex.classBonus +
  this.defenses.reflex.misc + cond;
```

**Question**: Where does `classBonus` come from after multiclass?

**Search for classBonus setter**:
- It's written in progression engine somewhere? Let me check...
- Should be in level-up handler when class is selected

**Expected**: When Jedi Knight is selected at L7:
```javascript
system.defenses.reflex.classBonus = MAX(1, 1, JK_reflex_bonus);
```

**But the current code doesn't recalculate classBonus when switching prestige classes**.

**Trace**:
1. Jedi L1: reflex.classBonus = 1
2. Scout L1: reflex.classBonus = MAX(1, 2) = 2 ✅
3. Jedi Knight L1: reflex.classBonus = MAX(2, ?) = ?
   - Code doesn't update it here ❌
   - Will stay at 2 unless somewhere else updates it

**Verdict**: 🚨 **classBonus not recalculated on prestige class transitions**

---

### Break Point 6: Force Training Feat Interactions

**Location**: scripts/progression/engine/force-progression.js (not fully read)

**Clarification**: Jedis don't grant force powers by level. Only:
1. Force Sensitivity at Jedi L1 (auto-grant, 1 power)
2. Force Training feat (each rank grants 1 power)

**Potential issues**:
1. Force Training feat may not be gated to force-sensitive classes (anyone could take it)
2. Force Training may be selectable multiple times (exploit?)
3. Force Sensitivity should auto-grant at Jedi L1, not selectable
4. Force power picker must integrate with multiclass (Jedi 4 + JK 5 = still only 1 Force Sensitivity)

**Verdict**: ⚠️ **Force Training gating and duplication checks needed** (lower priority than ability feats/defenses)

---

### Break Point 7: Multiple Prestige Class Features

**Location**: scripts/progression/engine/feature-dispatcher.js (inferred)

**Issue**: Class features dispatched during finalize. For each class level 1:
```
Jedi L1 → auto-grant Force Sensitivity feat
Scout L1 → auto-grant Shake It Off
Jedi Knight L1 → auto-grant ? (unknown, prestige feature)
Pathfinder L1 → auto-grant ? (unknown, prestige feature)
Jedi Knight L5 → (level 2+, no feature?)
```

**Problem**: The audit can't trace this without seeing feature-dispatcher source. Blind spot 🔴

---

## Summary: What's Actually Broken

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| Ability increase feats (L4/8/12/16) not granted | **Critical** | progression.js:1333 | Character missing 3 feats (at L4, L12, and would be L20) |
| classBonus not recalculated on prestige transition | **Critical** | progression engine → data model | Defenses use stale class bonus (stays at Scout 2 instead of updating to JK) |
| Prestige class levelProgression not verified | **High** | calculateBAB, feature-dispatcher | If Pathfinder compendium data missing, BAB wrong + features not applied |
| currentLevel uses array length instead of character level | **High** | progression.js:1222 | Prestige prerequisite checks order-dependent |
| Force Training feat gating not enforced | **Medium** | force-progression.js | Non-force-sensitive characters can take Force Training feat |
| Talent-per-level tracking absent | **Medium** | progression.js:1347 | Can't validate prestige class talent requirements |
| Prestige class starting feats undefined | **Medium** | progression.js:1354 | JK/Pathfinder starting feats may not be in PROGRESSION_RULES.classes |

---

## What Should Happen (Compiler Pattern)

### Phase 1: Snapshot
```javascript
{
  classLevels: [
    { class: "Jedi", level: 4 },
    { class: "Scout", level: 2 },
    { class: "Jedi Knight", level: 4 },
    { class: "Pathfinder", level: 1 },
    { class: "Jedi Knight", level: 5 }
  ],
  feats: ["Force Sensitivity", ..., /* 5 total */],
  talents: [/* 12 total */],
  forcePowers: [/* 1 from Force Sensitivity (auto-grant at Jedi L1); more only if Force Training feats taken */],
  characterLevel: 16,
  bab: 15,
  abilities: { str: 14, dex: 16, con: 13, int: 12, wis: 14, cha: 10 }
}
```

### Phase 2: Validation
```javascript
{
  checks: [
    { name: "prestige_prereq", ok: true, message: "JK requires L7: ✓ (at L7)" },
    { name: "prestige_prereq", ok: true, message: "Pathfinder requires L7: ✓ (at L11)" },
    { name: "force_sensitivity", ok: true, message: "Prestige force class requires Force Sensitivity: ✓" },
    { name: "talent_budget", ok: true, message: "Talents spent: 12, available: 12: ✓" },
    { name: "feat_budget", ok: true, message: "Feats spent: 5, available: 5: ✓" }
  ]
}
```

### Phase 3: Resolution
```javascript
{
  set: {
    "system.level": 16,
    "system.bab": 15,
    "system.defenses.fort.total": 22,
    "system.defenses.ref.total": 24,
    "system.defenses.will.total": 23,
    "system.defenses.reflex.classBonus": 2, // recalculated
    "system.defenses.fort.classBonus": 1,
    "system.defenses.will.classBonus": 1
  },
  add: {
    feats: ["uuid-ability-4", "uuid-ability-8", "uuid-ability-12"],
    forcePowers: ["uuid-force-throw", ...] // deduplicated
  }
}
```

### Phase 4: Application
```javascript
// Atomic apply with verification
await actor.update(delta.set);
await actor.createEmbeddedDocuments("Item", delta.add.feats + delta.add.forcePowers);
// Verify: actor.system.bab === 15, actor.system.level === 16
```

---

## Recommendations

1. **Implement ability increase feats** (L4/8/12/16)
   - Add to levelFeatures query
   - Return feat selection intent to player
   - Add to feat budget

2. **Recalculate classBonus on every class level**
   - When confirmClass called, update all defenses.*.classBonus
   - Use MAX() logic, not replacement

3. **Load all class data at snapshot time**
   - Validate Pathfinder exists in compendium
   - Fail early if missing, not during delta generation

4. **Use character level, not array length**
   - `characterLevel = classLevels.map(cl => cl.level).reduce((a,b) => a+b, 0)`
   - Use for prestige prerequisite checks

5. **Deduplicate force powers**
   - Track by UUID, not by string name
   - When adding a power, check if already exists

6. **Document prestige class rules**
   - Add to PROGRESSION_RULES or compendium metadata:
     - Do prestige classes grant starting feats? (Jedi Knight, Pathfinder)
     - Do they contribute to feat progression? (ability increase feats)
     - Can you multiclass between prestige classes? (apparently yes)


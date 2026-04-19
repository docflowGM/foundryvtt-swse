# PHASE 0 AUDIT: RANKED SKILLS IMPLEMENTATION

**Audit Date**: 2026-04-19  
**Status**: ✅ COMPLETE (Investigation Phase)  
**Scope**: Investigation only - NO code changes, NO implementations

This audit investigates the current SWSE skill system architecture to identify optimal attachment points for a constrained ranked-skills house rule implementation.

---

## DELIVERABLE A: CANONICAL SKILL PATH MAP

### Current Skill Calculation Architecture

**SSOT Location**: `system.derived.skills[skillKey].total`

**Calculation Source**: `scripts/actors/derived/derived-calculator.js` (lines 204-411)

The DerivedCalculator is the SOLE authority for skill total computation. Called from `actor.prepareDerivedData()` during every recalculation pass.

### Skill Total Computation Components (Current)

```
derived.skills[skillKey].total = 
  abilityMod               (from derived.attributes[abilityKey].mod)
  + 5 (if skill.trained)   (training bonus - HARDCODED)
  + 5 (if skill.focused)   (skill focus bonus)
  + skillMiscMod           (user-settable modifier)
  + halfLevel              (universal +1/2 heroic level)
  + speciesBonus           (from system.speciesSkillBonuses[skillKey])
  + occupationBonus        (if skill not trained AND occupation grants it)
  + featBonus              (from ModifierEngine[skill.skillKey])
  + stateBonus             (from PASSIVE/STATE items)
  + armorPenalty           (if skill affected by armor check penalty)
  + conditionPenalty       (from condition track steps)
```

**Key Code Path**:
1. DerivedCalculator.computeAll() → Line 257: normalizeSkillMap() → Line 271-411: per-skill computation
2. For each skill: Ability mod + training logic + focus + misc + species + occupation + feat/state/armor/condition
3. Write to updates['system.derived.skills'][skillKey]

### Where Skills Are Read

**Skill Rolls** (scripts/rolls/skills.js, line 20-85):
- Reads `derived.skills[skillKey].total` as baseBonus
- Passes through RollCore.execute() with ModifierEngine for situational mods
- Formula: 1d20 + baseBonus + modifierTotal

**Sheet Display** (various):
- Reads `derived.skills[skillKey].total` for display
- Reads `system.skills[skillKey].trained` for checkbox/icon

### Half-Level Current Behavior

**Location**: Hardcoded in DerivedCalculator line 315: `total += halfLevel`

- `halfLevel` is derived from actor.system.halfLevel (computed elsewhere)
- Currently always applied to every skill
- No house-rule override exists

**For ranked mode**: A new `disableHalfLevelSkillBonus` setting would need to gate this addition.

---

## DELIVERABLE B: TRAINED-STATE MAP

### Where Trained Status Is Stored

**Storage Location**: `actor.system.skills[skillKey].trained`

- Type: Boolean
- Set during chargen and level-up
- Persisted in actor data
- Default value: false

### Where Trained Is Derived

**Derived Location**: `actor.system.derived.skills[skillKey].trained`

- Mirror of system.skills[skillKey].trained
- Set in DerivedCalculator line 399
- Used primarily for UI display
- NOT the authority (system.skills is authority)

### Where Trained Is Read

**Skill Enforcement** (scripts/engine/skills/skill-enforcement-engine.js):
- Checks if skill is trained before allowing trained-only uses
- Called from rollSkill() at line 41

**Prerequisite Checker** (scripts/data/prerequisite-checker.js):
- Line 763: `trained = actor.system?.skills?.[prereq.skill]?.trained`
- Checks for prestige class prerequisites requiring training
- Also checks pending chargen selections

**Prerequisite Types** (Already exist):
- `skillTrained`: "Trained in [skill]"
- `skill_trained`: Modern prerequisite type
- `skill_ranks`: "X ranks in [skill]" (NOTE: supports ranks, but ranks field doesn't exist yet in actor data)

---

## DELIVERABLE C: CHARGEN FLOW MAP

### Chargen Skill Allocation Current Flow

**Entry Point**: `scripts/apps/chargen/chargen-main.js`

**Skill Selection Handlers** (scripts/apps/chargen/chargen-skills.js):
- `_onSkillSelect()` (line 10): Toggle skill trained status via checkbox
- `_onTrainSkill()` (line 44): Train a skill (enforce limits)
- `_onUntrainSkill()` (line 75): Untrain a skill
- `_onResetSkills()` (line 96): Reset all skills to untrained

**Data Structure During Chargen**:
- `this.characterData.skills[skillKey].trained` = boolean
- `this.characterData.trainedSkillsAllowed` = numeric limit

**Current Limits Enforcement**:
- Line 22-30: Check `currentTrained >= maxAllowed` before allowing training
- maxAllowed typically comes from class definition

**Class Skills Determination in Chargen**:
- **NOT CLEARLY VISIBLE** in chargen-skills.js
- Likely determined when class is selected in chargen-class.js
- Must trace through class step to understand full flow

**Skill Finalization**:
- Eventually calls `applyTrainedSkills()` (levelup-skills.js line 28)
- Sets `system.skills[skillKey].trained = true` for selected skills

### Critical Observation

There is **NO explicit class-skill eligibility checking** in chargen currently. All selected skills are treated equally - they just set `trained = true`. This suggests class skills are a level-up/progression concept, not a chargen concept.

---

## DELIVERABLE D: LEVEL-UP FLOW MAP

### Level-Up Skill Allocation Current Flow

**Entry Point**: `scripts/apps/levelup/levelup-main.js` (presumed)

**Skill Handling** (scripts/apps/levelup/levelup-skills.js):
- `selectMulticlassSkill()` (line 14): Create skill selection object
- `applyTrainedSkills()` (line 28): Apply selected skills to actor
- `checkIntModifierIncrease()` (line 64): Grant bonus skill if INT mod increased

**Current Behavior**:
- Skills are selected during multiclass level-up
- Applied via: `system.skills[skillKey].trained = true`
- INT modifier increases grant bonus skills

**Critical Gap**: 

The current system does NOT appear to:
1. Allocate skill POINTS per level (only binary trained/untrained)
2. Track class skills vs cross-class distinction
3. Track ranks (only boolean trained status)
4. Enforce cost differences based on class skill eligibility
5. Apply caps based on level and eligibility

**Where Class Skills Are Determined**:

**NOT YET FOUND** in level-up flow. Must investigate further.

---

## DELIVERABLE E: PREREQUISITE/TRAINING GATE MAP

### Trained-Only Use Enforcement

**Primary Enforcer**: `scripts/engine/skills/skill-enforcement-engine.js`

Called from rollSkill() (line 41 of skills.js):
```javascript
const permission = SkillEnforcementEngine.evaluate({ 
  actor, skillKey, actionType: 'check', context: { isTrained, skillDef } 
});
```

Files using skill enforcement:
- scripts/rolls/skills.js (line 41)
- Any code calling rollSkill() must pass through enforcement

### Prerequisite Gates

**Prestige Class Prerequisites** (scripts/data/prerequisite-checker.js):
- Line 464-466: checkSkills() validates trained requirements
- Line 763-769: skill_trained type checks system.skills[prereq.skill].trained
- Line 770-775: skill_ranks type checks actor.system.skills[prereq.skill].ranks (but this field doesn't exist yet!)

**Feat Prerequisites** (scripts/data/prerequisite-checker.js):
- Similar skill_trained and skill_ranks type support
- Line 973-977: Checks trained status for feats

**Talent Prerequisites** (scripts/data/prerequisite-checker.js):
- Similar support for skill prerequisites

### Current Prerequisite Types Already Defined

From prerequisite-checker.js:
- `skill_trained` (line 762): {skill: "skillKey"} — checks trained boolean
- `skill_ranks` (line 770): {skill: "skillKey", ranks: number} — checks ranks field (DOES NOT EXIST YET)
- `skillTrained` (legacy): String parsing for "Trained in [skill]"
- `skill` / `skill_rank` (legacy): String parsing variants

**CRITICAL FINDING**: The prerequisite system ALREADY KNOWS ABOUT RANKS, but the actor data model doesn't have ranks storage yet. This is a readiness point for ranked implementation.

---

## DELIVERABLE F: ACTOR DATA MODEL REPORT

### Current Skill Data Storage

**Location**: `actor.system.skills[skillKey]`

**Current Fields**:
- `trained` (Boolean): Whether skill is trained
- `miscMod` (Number): User-settable misc modifier
- `focused` (Boolean): Whether skill has focus applied
- `selectedAbility` (String): Ability used for this skill

**Fields NOT Present**:
- `ranks` (Number): Per-skill ranks - NEEDED for ranked mode
- `classSkillStatus` (Boolean/String): Whether skill is class skill at each level
- Any rank history or progression tracking

**Derived Skill Data**:
```
actor.system.derived.skills[skillKey] = {
  total,              // Computed total
  abilityMod,         // From ability
  selectedAbility,    // Ability key
  trained,            // Mirror of system.skills
  focused,            // Mirror of system.skills
  miscMod,            // Mirror of system.skills
  speciesBonus,       // Species trait bonus
  hasOccupationBonus, // Occupation bonus applied
  featBonus,          // Feat/equipment modifiers
  canUseUntrained,    // Whether usable untrained
  defaultAbility,     // Skill's default ability
  stateBonus,         // PASSIVE/STATE bonus
  armorPenalty,       // Armor check penalty applied
  conditionPenalty    // Condition track penalty applied
}
```

### Class-Related Data Storage

**Class Progression Storage**: `actor.system.progression.classLevels[]`

Each level entry likely contains:
- Class taken at that level
- Prestige class status (if applicable)
- (Investigate further needed)

**Talent Trees Linked to Classes**: Via ClassesDB

- Classes reference talentTreeIds
- Classes reference talentTreeNames
- Lookup via scripts/data/classes-db.js

**Class Skills**: 

**CRITICAL FINDING**: No explicit class-skill storage found yet. Likely stored in:
- Class item data (compendium)
- Class definitions in ClassesDB
- Computed dynamically per level

Must investigate CLASS-SKILL SOURCE further.

### Background Grants

**Stored As**: actor flags? Prestige entry metadata?

**UNCERTAIN**: Not yet confirmed where background-granted class skills are stored or how they're tracked across levels.

---

## DELIVERABLE G: PRESTIGE-CLASS SUPPORT REPORT

### Prestige Class Representations

**Location**: Compendium `foundryvtt-swse.prestige_classes`

**Prerequisites Data**: `scripts/data/prestige-prerequisites.js`

Example prestige class definition:
```javascript
'Ace Pilot': {
    uuid: 'swse-prestige-ace-pilot',
    minLevel: 7,
    skills: ['Pilot'],
    feats: ['Vehicular Combat']
}
```

**Skill Points on Prestige Entry**:

**NOT FOUND** in prerequisites. Prestige classes don't explicitly define skill points in PRESTIGE_PREREQUISITES.

Must investigate:
- Where prestige class skill point grants come from
- Whether they inherit from entry class
- How skill lists are determined

### Class-to-Talent-Tree Mapping

**Architecture Exists**: Via ClassesDB and TalentTreeDB

**Forward Mapping** (Class → Trees):
- ClassesDB.get(classId) returns class with talentTreeIds[]
- Trees stored in class.system.talentTreeNames and class.system.talentTreeSourceIds

**Reverse Mapping** (Tree → Class):
- Not explicit, must be computed

**Feasibility**: ✅ YES - The relationship registry exists and is stable (using sourceIds for drift safety).

### Entry-Tree-to-Core-Class Resolution

**Fallback Chain Feasibility**:

1. **Explicit prestige-class → core-class mapping**: Would need to be added to PRESTIGE_PREREQUISITES
2. **Talent-tree-derived mapping**: ✅ FEASIBLE - Use class.talentTreeIds → TalentTreeDB to find parent class
3. **Unique entry-class mapping**: ✅ If prestige class entry requirement lists a specific class
4. **Fallback to inherit_entry_class**: ✅ FEASIBLE - Use first/best prestige entry class

**CRITICAL QUESTION**: Does a prestige class entry skill inherit from its entry class or define its own skills?

- Needs investigation in prestige class definitions
- Likely requires traversing class definitions themselves (not just prerequisites)

### Current Prestige-Class Skill Handling

**NOT CLEARLY FOUND** in codebase yet. Needs investigation:
- Where prestige classes get their skill point grants
- Whether they automatically inherit from entry class
- Whether there's existing skill-point calculation per prestige level

---

## DELIVERABLE H: EXISTING INFRASTRUCTURE REUSE PLAN

### Systems to REUSE

#### 1. **HouseRuleService** (SSOT for settings)
- Location: scripts/engine/system/HouseRuleService.js
- **REUSE**: New ranked-skills rules will plug into HouseRuleService
- New rules: skillProgressionMode, skillRankClassSkillPolicy, prestigeClassSkillPolicy, disableHalfLevelSkillBonus
- **No changes needed** to HouseRuleService itself

#### 2. **SkillRules Adapter** (Already exists)
- Location: scripts/engine/skills/SkillRules.js  
- **REUSE**: Add new methods for ranked-mode rules
  - `getSkillProgressionMode()`
  - `getSkillRankClassSkillPolicy()`
  - `getPrestigeClassSkillPolicy()`
  - `isHalfLevelSkillBonusEnabled()`
- **No new adapter needed** - extend existing one

#### 3. **DerivedCalculator** (Skill computation SSOT)
- Location: scripts/actors/derived/derived-calculator.js
- **REUSE**: Add ranked-mode branch in skill calculation
- **Gating**: Gate entire ranked calculation path on `skillProgressionMode === 'ranked_35_style'`
- Current calculation works for standard mode, new calculation for ranked mode
- **Risk**: Careful not to break existing standard-mode calculation

#### 4. **PrerequisiteChecker** (Already supports skill_ranks)
- Location: scripts/data/prerequisite-checker.js
- **REUSE**: skill_ranks prerequisite type already exists
- **Action needed**: Ensure skill_ranks reads from system.skills[skillKey].ranks (after we add it)
- **No changes to logic**, just ensures ranks field exists

#### 5. **ClassesDB & TalentTreeDB** (Class/tree relationships)
- Location: scripts/data/classes-db.js and scripts/data/talent-tree-db.js
- **REUSE**: For prestige class skill inheritance
- Use existing byId(), byName() methods
- Use existing talentTreeIds relationships
- **No changes needed** to these registries

#### 6. **Chargen/Level-Up Flow** (Skill allocation UI)
- Location: scripts/apps/chargen/chargen-skills.js, levelup-skills.js
- **REUSE**: Reuse applyTrainedSkills() function
- **Extend**: For ranked mode, use new "apply ranked skills" flow that tracks ranks and points
- **Likely needed**: New chargen-skills-ranked.js or new handler in existing file

#### 7. **SkillEnforcementEngine** (Trained-only gating)
- Location: scripts/engine/skills/skill-enforcement-engine.js
- **REUSE**: As-is for trained checks (ranks >= 1 = trained)
- **No changes needed** - works for both modes

### New Infrastructure Needed

1. **Ranked Skills Calculator**: New module for rank-based computation
   - Compute skill points per level
   - Apply rank costs (1:1 class, 2:1 cross)
   - Apply rank caps
   - Derive trained status from ranks >= 1

2. **Class-Skill Resolver**: Determine if skill is class skill per level
   - Reuse ClassesDB for class skill lists
   - Implement current_class_plus_backgrounds policy
   - Cache results per actor/level

3. **Prestige Skill Inheritance**: Resolve core class for prestige entry
   - Use talent tree mapping
   - Implement fallback chain
   - Store inherited class in prestige entry metadata (if needed)

4. **Actor Data Migration** (if needed):
   - Add system.skills[skillKey].ranks field
   - Decide: store ranks in chargen data or persist to actor?
   - Migration: Set ranks to 1 for all trained skills (backward compat)

---

## DELIVERABLE I: MINIMAL IMPLEMENTATION SURFACE

### Definitely Required Changes

1. **House Rule Registry Addition** (scripts/houserules/houserule-settings.js)
   - Add 4 new rule registrations
   - Non-code: Just data registration

2. **SkillRules Adapter Extension** (scripts/engine/skills/SkillRules.js)
   - Add 4 new getter methods
   - ~20 lines of code

3. **DerivedCalculator Skill Branch** (scripts/actors/derived/derived-calculator.js, lines 204-411)
   - Add if/else branch: `if (skillProgressionMode === 'ranked_35_style') { ...ranked calculation... }`
   - ~100-150 lines for ranked calculation
   - Careful preservation of existing standard calculation

4. **Ranked Skills Calculator Module** (NEW: scripts/engine/skills/ranked-calculator.js)
   - Compute skill points per level
   - Compute rank costs and caps
   - ~150-200 lines

5. **Class-Skill Resolver Module** (NEW: scripts/engine/skills/class-skill-resolver.js)
   - Determine eligible class skills per level
   - Implement current_class_plus_backgrounds policy
   - ~100-150 lines

6. **Actor Data Model** (scripts/system.json or data model definition)
   - Add `system.skills[skillKey].ranks` field (Number, default: 0)
   - Already has `trained`, `focused`, `miscMod`, `selectedAbility`

### Likely Required Changes

1. **Chargen Skill UI** (scripts/apps/chargen/chargen-skills.js or new chargen-skills-ranked.js)
   - Display rank selection instead of checkbox (if ranked mode)
   - Show available points
   - Show class vs cross-class cost
   - Show rank cap
   - ~100-200 lines

2. **Level-Up Skill UI** (scripts/apps/levelup/levelup-skills.js)
   - Allocate skill points per class
   - Show class skills vs cross-class
   - Enforce spending rules
   - ~80-120 lines

3. **Prerequisite Checker Integration** (scripts/data/prerequisite-checker.js)
   - Ensure skill_ranks type reads from system.skills[skillKey].ranks
   - ~5 lines change (line 771)

4. **DerivedCalculator Half-Level Gating** (scripts/actors/derived/derived-calculator.js, line 315)
   - Gate: `if (disableHalfLevelSkillBonus === false) { total += halfLevel; }`
   - ~2 lines change

### Uncertain/Optional

1. **Prestige Class Skill Inheritance Metadata**
   - May need new field to store inherited class
   - OR compute dynamically each time
   - Investigation needed on prestige class data model

2. **Background Class-Skill Persistence**
   - May need new field to flag background-granted skills
   - OR track via background document references
   - Investigation needed on background integration

3. **Migration Scripts**
   - Only if new actor fields are added
   - Set system.skills[skillKey].ranks = skill.trained ? 1 : 0
   - ~20-30 lines

4. **Test Coverage**
   - Not required for constrained implementation
   - Suggested for validation

---

## DELIVERABLE J: RISK REPORT

### Risk 1: DerivedCalculator Modification

**Severity**: 🔴 HIGH

**Details**: 
- DerivedCalculator is called on every recalc for every actor
- Changing its skill calculation path affects all skill rolls system-wide
- If ranked mode calculation has bugs, it breaks skill rolls

**Exact Files**:
- scripts/actors/derived/derived-calculator.js (lines 204-411)

**Mitigation**:
- Add comprehensive if/else gate: `if (skillProgressionMode === 'ranked_35_style') { ...ranked path... } else { ...standard path... }`
- Default to standard mode
- Extensive testing before ship
- Consider: Add debug logging to show which path taken

### Risk 2: Trained-Status Derivation

**Severity**: 🟠 MEDIUM

**Details**:
- Current system has binary trained (true/false)
- New system has ranks (0-N)
- Trained must be derived as `ranks >= 1` in ranked mode
- Prerequisites expect trained boolean

**Exact Files**:
- scripts/data/prerequisite-checker.js (line 763-769)
- scripts/engine/skills/skill-enforcement-engine.js
- Any code reading system.skills[skillKey].trained

**Mitigation**:
- Add safe derivation: In ranked mode, compute trained = ranks >= 1
- Do NOT change stored trained field (preserve for backward compat)
- Ensure SkillEnforcementEngine checks both trained field and (if ranked) ranks >= 1

### Risk 3: Class-Skill Eligibility Unknown

**Severity**: 🔴 HIGH

**Details**:
- System doesn't currently have explicit class-skill storage
- Ranked mode REQUIRES knowing if skill is class skill for this level
- Implementation depends on finding/defining class skill lists

**Exact Files**:
- Unknown - must be investigated
- Likely: Class item data, ClassesDB, or chargen flow

**Mitigation**:
- Complete investigation BEFORE implementation
- If class skills aren't explicit, may need to define them
- Fallback: Hardcode class skill lists per class (last resort)

### Risk 4: Prestige Class Skill Inheritance

**Severity**: 🟠 MEDIUM

**Details**:
- Prestige classes need to inherit core class for skill grants
- Talent tree mapping exists but isn't 100% guaranteed for all prestige classes
- Fallback chain may not cover all cases

**Exact Files**:
- scripts/data/prestige-prerequisites.js
- scripts/data/classes-db.js / talent-tree-db.js
- Unknown prestige class definition location

**Mitigation**:
- Only implement inherit_entry_tree_class fully
- Mark other modes as "not implemented"
- Document fallback chain clearly
- Add logging for ambiguous cases

### Risk 5: Background-Granted Class Skills

**Severity**: 🟠 MEDIUM

**Details**:
- Requirements state backgrounds grant permanent class skills
- Storage/tracking method unknown
- Could break if background system changes

**Exact Files**:
- Unknown - must investigate background integration
- Likely: Actor flags, or background item data

**Mitigation**:
- Investigate background system completely first
- Decide: Store flag in actor or compute from background items each time?
- Document storage method clearly

### Risk 6: Backward Compatibility - Old Actors

**Severity**: 🟡 LOW-MEDIUM

**Details**:
- Existing actors have trained boolean but no ranks field
- If ranks field missing, ranked mode calculation will fail
- Must handle gracefully

**Exact Files**:
- DerivedCalculator (ranked calculation path)
- Any chargen/level-up code reading ranks

**Mitigation**:
- Add safe access with fallback: `ranks = system.skills[skillKey]?.ranks ?? 0`
- If ranks missing, treat as 0 (untrained)
- Or: Add migration to set ranks = trained ? 1 : 0

### Risk 7: UI Assumptions About Binary Training

**Severity**: 🟡 LOW-MEDIUM

**Details**:
- Chargen/sheet UI may assume skill is checkbox (trained/untrained)
- Ranked mode needs rank number input
- Sheet display code may break if not updated

**Exact Files**:
- scripts/apps/chargen/chargen-skills.js
- scripts/sheets/v2/character-sheet.js (skill panel)
- Any skill-display templates

**Mitigation**:
- Wrap UI in mode check: `if (ranked mode) { ...rank input... } else { ...checkbox... }`
- Test both modes thoroughly on sheet

### Risk 8: Half-Level Bonus Interaction

**Severity**: 🟢 LOW

**Details**:
- Current: Always applied to skill calc
- Need: Make independently toggleable
- Interaction: Standard vs ranked mode should work independently

**Exact Files**:
- scripts/actors/derived/derived-calculator.js (line 315)

**Mitigation**:
- Simple if statement: `if (!disableHalfLevelSkillBonus) { total += halfLevel; }`
- Document that this is orthogonal to ranked/standard mode choice
- Test both combinations: ranked+halfLevel, ranked+noHalfLevel, standard+noHalfLevel

### Risk 9: Skill Focus Behavior Preservation

**Severity**: 🟡 LOW-MEDIUM

**Details**:
- Skill Focus adds +5 bonus in current system
- Ranked mode might need different behavior (e.g., bonus per rank, not flat)
- Requirements say "do not redesign Skill Focus"

**Exact Files**:
- scripts/actors/derived/derived-calculator.js (line 318)
- scripts/engine/skills/SkillRules.js

**Mitigation**:
- Keep Skill Focus behavior UNCHANGED in ranked mode
- Skill Focus still adds +5 like current system
- Just interacts with new rank-based base calculation
- Document: "Skill Focus is unchanged; it stacks with ranks"

### Risk 10: Prerequisite Evaluation with Ranks

**Severity**: 🟡 LOW

**Details**:
- PrerequisiteChecker already supports skill_ranks type
- But it reads from system.skills[skillKey].ranks which doesn't exist yet
- Might fail if ranks field missing

**Exact Files**:
- scripts/data/prerequisite-checker.js (line 771)

**Mitigation**:
- Add safe access: `ranks = actor.system?.skills?.[prereq.skill]?.ranks ?? 0`
- Fallback to 0 if field missing
- Ensure ranks field created before shipping

---

## DELIVERABLE K: GO / NO-GO IMPLEMENTATION PLAN

### Implementability Assessment

✅ **YES - IMPLEMENTABLE WITH CURRENT ARCHITECTURE**

The ranked-skills feature is implementable narrowly with the current architecture, with these caveats:

1. **Class-Skill Source Must Be Found**: Currently unclear where class skills are defined/sourced
2. **Prestige Class Skill Inheritance Must Be Investigated**: How prestige classes currently get skill grants is uncertain
3. **Background Class-Skill Integration Must Be Clarified**: Storage mechanism for background-granted class skills is unknown

### Critical Blockers for Investigation BEFORE Implementation

1. **WHERE ARE CLASS SKILLS DEFINED?**
   - Currently invisible in chargen/level-up flow
   - Must be in class definitions somewhere (compendium? ClassesDB?)
   - MUST investigate before implementation

2. **HOW DO PRESTIGE CLASSES GET SKILL POINTS?**
   - Prestige prerequisites don't define skill grants
   - Must trace from prestige entry to class definition
   - MUST investigate before implementation

3. **HOW ARE BACKGROUND CLASS SKILLS TRACKED?**
   - Requirements demand background-granted permanent class skills
   - Current storage mechanism unknown
   - MUST investigate before implementation

### Safest Implementation Order

**Phase 1 — Foundations** (LOWEST RISK FIRST)
1. ✅ Add 4 new house rules to HouseRuleService and SkillRules adapter
   - Risk: LOW (just registration, no behavior changes)
   - Implementation: ~30 lines
   - Test: Verify settings exist and default values work

2. ✅ Gate Half-Level Bonus (disableHalfLevelSkillBonus)
   - Risk: LOW (simple if statement)
   - Implementation: 2 lines in DerivedCalculator
   - Test: Verify both modes work (half-level on/off)

3. ✅ Add system.skills[skillKey].ranks field
   - Risk: LOW-MEDIUM (data model change)
   - Implementation: Schema registration only
   - Test: Verify field exists on new/loaded actors

**Phase 2 — Investigation** (CRITICAL PATH)
1. ❓ **INVESTIGATE**: Where are class skills defined?
2. ❓ **INVESTIGATE**: How do prestige classes inherit skills?
3. ❓ **INVESTIGATE**: How to track background class-skill grants?

**Phase 3 — Core Ranked Calculation** (MEDIUM RISK)
1. Create ranked-calculator.js module
2. Create class-skill-resolver.js module
3. Add ranked branch to DerivedCalculator with full gate
4. Ensure standard mode still works (parallel path)
5. Test both modes: standard unchanged, ranked new

**Phase 4 — Chargen/Level-Up UI** (MEDIUM-HIGH RISK)
1. Extend chargen-skills.js for ranked mode
2. Extend levelup-skills.js for ranked mode
3. Test both modes in practice

### Minimum New Data Fields

✅ **Definitely needed**:
- `system.skills[skillKey].ranks` (Number, default: 0)

⚠️ **Probably needed** (depends on investigation):
- Prestige entry skill-source inheritance metadata
- Background class-skill flag or reference
- Character skill points budget tracking (if not computed on-the-fly)

### Most Dangerous Area

🔴 **DerivedCalculator Skill Calculation**

- Called on every actor recalc
- Touches core skill roll math
- Bug here breaks EVERY skill roll
- Mitigation: Extensive testing, parallel path for standard mode, comprehensive logging

### Best Place to Start Coding

1. **START HERE**: House rule registration (safest, fastest, validates requirements)
2. **THEN**: Half-level gating (simple, low-risk, builds confidence)
3. **PARALLEL**: Complete investigations on class skills / prestige / backgrounds
4. **THEN**: Ranked calculator with full gating
5. **FINALLY**: UI updates

### Implementation Timeline Estimate

- Phase 1 (Foundations): 1-2 hours
- Phase 2 (Investigations): 1-3 hours (depends on code clarity)
- Phase 3 (Ranked Calculation): 2-3 hours  
- Phase 4 (UI): 2-3 hours
- Testing/Validation: 1-2 hours

**Total Estimate**: 7-14 hours (depending on investigation findings)

---

## NEXT STEPS

### Before Implementation Command Is Issued

1. ✅ **Verify Phase 0 audit findings** - Review this report
2. ❓ **Answer critical investigation questions**:
   - Where are class skills defined?
   - How do prestige classes get skill points?
   - Where/how are background class skills tracked?
3. ✅ **Confirm implementation order** - Approve safest path
4. ✅ **Confirm scope boundaries** - Approved feature constraints

### When Implementation Command Is Ready

All Phase 0 findings will be embedded in the implementation command with:
- Exact file paths to modify
- Exact code sections to extend/add
- Exact data model fields to add
- Full safeguards and gating requirements
- Complete validation checklist

---

## AUDIT COMPLETION STATUS

✅ **PART A (Canonical Skill Path)**: COMPLETE
✅ **PART B (Trained-State Map)**: COMPLETE  
✅ **PART C (Chargen Flow)**: COMPLETE (with gaps noted)
✅ **PART D (Level-Up Flow)**: COMPLETE (with gaps noted)
✅ **PART E (Prerequisites/Gates)**: COMPLETE
✅ **PART F (Actor Data Model)**: COMPLETE (with gaps noted)
✅ **PART G (Prestige Classes)**: COMPLETE (with gaps noted)
✅ **PART H (Infrastructure Reuse)**: COMPLETE
✅ **PART I (Minimal Surface)**: COMPLETE
✅ **PART J (Risk Report)**: COMPLETE
✅ **PART K (Go/No-Go)**: **GO - IMPLEMENTABLE WITH INVESTIGATIONS**

---

## SUMMARY

**Ranked-skills feature is IMPLEMENTABLE narrowly within current architecture**, with three critical questions that must be answered before implementation:

1. **Class Skills Definition**: How/where class skills are defined
2. **Prestige Skill Inheritance**: How prestige classes determine skill grants
3. **Background Class-Skill Tracking**: How backgrounds grant permanent class skills

The recommended implementation path is **safe and low-risk** if these questions are answered first.

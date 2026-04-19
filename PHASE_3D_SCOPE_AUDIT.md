# PHASE 3D: FORCE FAMILY MIGRATION — SCOPE AUDIT

## DELIVERABLE A: FAMILY SCOPE CONFIRMATION

### Exact Rules in Scope (13 rules, all ACTIVE)

**Force Sensitivity & Training** (3 rules):
1. `forceTrainingAttribute` — String (wisdom/charisma), ability modifier for Force Power selection
2. `forceSensitiveJediOnly` — Boolean, restricts Force Sensitive feat to Jedi classes only
3. `allowSuiteReselection` — Boolean, allows Force Powers to be fully reselected during level up

**Block & Deflect Mechanics** (3 rules):
4. `blockDeflectTalents` — String (separate/combined), Block and Deflect talent handling
5. `blockMechanicalAlternative` — Boolean, non-Jedi can use melee to block melee attacks
6. `groupDeflectBlock` — Boolean, display Block/Deflect grouped in generators/trees

**Dark Side Mechanics** (5 rules):
7. `darkSideMaxMultiplier` — Number, maximum Dark Side score = Wisdom × Multiplier
8. `darkSidePowerIncreaseScore` — Boolean, using [Dark Side] power auto-increases DSS
9. `darkSideTemptation` — String (strict/lenient/narrative), Dark Side temptation handling
10. `darkInspirationEnabled` — Boolean, Force-sensitive characters can use Dark Inspiration
11. `enableDarkSideTreeAccess` — Boolean, Sith prestige classes get automatic Lightsaber tree access

**Force Points** (2 rules):
12. `forcePointRecovery` — String (level/extended/session), when Force Points refresh
13. `dailyForcePoints` — Boolean, alternative Force Point recovery (band-based: 1-5→1FP, 6-10→2FP)

### Existing Adapter Infrastructure (IMPORTANT: Already In Place)

Unlike Phases 3A-3C where adapters were created from scratch, Phase 3D has **existing wrapper infrastructure**:

#### **1. ForceTrainingEngine** (Domain-Level Adapter)
**File**: `scripts/engine/force/ForceTrainingEngine.js`  
**Status**: Active, used across system  
**Methods Already Wrapping Force Rules**:
- `getTrainingAttribute()` → wraps `forceTrainingAttribute`
- `isForceSensitiveJediOnly()` → wraps `forceSensitiveJediOnly`
- `getMaxDarkSideScore(actor)` → wraps `darkSideMaxMultiplier`
- `shouldAutoIncreaseDarkSideScore()` → wraps `darkSidePowerIncreaseScore`
- `getDarkSideTemptationMode()` → wraps `darkSideTemptation`
- `hasBlockDeflectCombined()` → wraps `blockDeflectTalents`
- `hasBlockMechanicalAlternative()` → wraps `blockMechanicalAlternative`
- `validateSettings()` → consistency validation for all Force settings

**Current Read Pattern**: Calls directly to `game.settings.get()` inside each method (NOT routed through HouseRuleService)

#### **2. SettingsHelper** (Generalized Settings Wrapper)
**File**: `scripts/utils/settings-helper.js`  
**Status**: Centralized type-safe access layer  
**Methods**: `getString()`, `getBoolean()`, `getNumber()`  
**Weakness**: Delegates directly to `game.settings` under the hood, bypassing HouseRuleService governance

#### **3. ForcePointsService** (Stateless Service)
**File**: `scripts/engine/force/force-points-service.js`  
**Status**: Has ONE unwrapped read  
**Unwrapped Read**: Line 56 reads `dailyForcePoints` directly via `game.settings.get()`

#### **4. BlockMechanicalAlternative** (Houserule Module)
**File**: `scripts/houserules/houserule-block-mechanic.js`  
**Status**: Has TWO unwrapped reads  
**Unwrapped Reads**: Lines 25 and 155 read `blockMechanicalAlternative` directly

#### **5. class-relationship-registry.js** (Prestige Class Access)
**File**: `scripts/data/class-relationship-registry.js`  
**Status**: Has ONE unwrapped read  
**Unwrapped Read**: Line 52 reads `enableDarkSideTreeAccess` directly

### Exact Files in Scope (8 files reading Force rules, 10 direct reads total)

**Files Currently Reading Force Rules**:

| File | Direct Reads | Rules Read | Status |
|------|--------------|-----------|--------|
| scripts/apps/chargen/chargen-force-powers.js | 1 | forceTrainingAttribute | Via ForceTrainingEngine |
| scripts/apps/chargen-improved.js | 1 | blockDeflectTalents | Direct read |
| scripts/apps/chargen-narrative.js | 1 | groupDeflectBlock | Direct read |
| scripts/apps/levelup/levelup-talents.js | 1 | groupDeflectBlock | Direct read |
| scripts/houserules/houserule-block-mechanic.js | 2 | blockMechanicalAlternative | Direct reads (lines 25, 155) |
| scripts/utils/force-points.js | 1 | darkSideTemptation | Direct read |
| scripts/data/class-relationship-registry.js | 1 | enableDarkSideTreeAccess | Direct read |
| scripts/engine/progression/utils/suite-reselection-utils.js | 1 | allowSuiteReselection | Direct read |
| scripts/engine/force/force-points-service.js | 1 | dailyForcePoints | Direct read |
| scripts/settings/house-rules.js | 1 | enableDarkSideTreeAccess | Direct read |

**Total Direct Reads in Scope**: 10 (though some go through ForceTrainingEngine, others are raw reads)

---

## STRATEGIC DECISION: ADAPTER CONSOLIDATION vs. PATTERN EXTENSION

### Current State (Before Phase 3D)

The Force family has **partial wrapping**:
- 8 of 13 rules wrapped via ForceTrainingEngine methods
- 5 of 13 rules read directly without wrapper
- Governance: Direct reads bypass HouseRuleService

### Phase 3D Approach: Create ForceRules Adapter (Pattern Extension)

Given that Phases 3A-3C established a consistent adapter pattern (FeatRulesAdapter, HealingRules, SkillRules), Phase 3D will:

1. **Create ForceRules adapter** (new file: `scripts/engine/force/ForceRules.js`)
   - 13 semantic getters matching Force rules
   - All getters route through HouseRuleService (governance compliance)
   - Matches semantic pattern of prior adapters

2. **Update ForceTrainingEngine** (existing file: `scripts/engine/force/ForceTrainingEngine.js`)
   - Add import: `import { ForceRules } from "./ForceRules.js"`
   - Replace all direct `game.settings.get()` calls with `ForceRules.method()` calls
   - Preserves all existing ForceTrainingEngine public API (no caller changes needed)
   - Affects ~8 method implementations

3. **Update direct-read files**:
   - `houserule-block-mechanic.js` → route through ForceRules
   - `force-points-service.js` → route through ForceRules
   - `class-relationship-registry.js` → route through ForceRules
   - Other files already go through ForceTrainingEngine

### Rationale for Adapter Pattern Extension

**Why NOT just enhance ForceTrainingEngine**:
- ForceTrainingEngine is domain-specific (Force abilities, training, temptation)
- Not all Force rules are "training" (daily Force Points, block mechanics, suite reselection)
- Pattern consistency: All families (Feat, Healing, Skills) have dedicated adapters
- Separation of concerns: ForceRules handles settings governance, ForceTrainingEngine handles Force-specific logic

**Why create ForceRules alongside ForceTrainingEngine**:
- ForceRules = settings layer (governance, SSOT access)
- ForceTrainingEngine = domain layer (Force ability validation, DSS calculations)
- Both coexist, no conflict (ForceTrainingEngine becomes consumer of ForceRules)
- Allows future families to use same adapter pattern without redesigning ForceTrainingEngine

---

## PHASE 3D IMPLEMENTATION PLAN (Summary)

### Step 1: Scope Audit (THIS DOCUMENT)
✅ Identify 13 Force rules  
✅ Catalog 8 files reading Force rules  
✅ Document existing adapter infrastructure  
✅ Confirm 10 direct reads to migrate  

### Step 2: Create ForceRules Adapter
📋 **File**: `scripts/engine/force/ForceRules.js` (NEW)
- 13 semantic getters (all Force rules)
- All route through HouseRuleService
- Follows pattern from SkillRules (87 lines), HealingRules (120 lines), FeatRulesAdapter (45 lines)

### Step 3: Update ForceTrainingEngine
📋 **File**: `scripts/engine/force/ForceTrainingEngine.js` (MODIFY)
- Add import: `import { ForceRules } from "./ForceRules.js"`
- Replace 8 direct `game.settings.get()` calls with ForceRules method calls
- No external API changes (internal implementation only)

### Step 4: Update Direct-Read Files
📋 **Files**: houserule-block-mechanic.js, force-points-service.js, class-relationship-registry.js (MODIFY)
- Add imports: `import { ForceRules } from "...ForceRules.js"`
- Replace 2 reads in houserule-block-mechanic.js
- Replace 1 read in force-points-service.js
- Replace 1 read in class-relationship-registry.js
- (Possibly 1 read in house-rules.js, depending on scope)

### Step 5: Commit & Document
📋 **File**: PHASE_3D_COMPLETION_REPORT.md (NEW)
- Scope confirmation
- Adapter implementation
- Files changed with read replacement maps
- Behavior preservation analysis
- Governance impact
- Rollback plan
- Pattern fitness verdict

---

## EXACT READ LOCATIONS TO MIGRATE

### ForceTrainingEngine (Internal Reads — 8 total)

| Method | Current Pattern | Target Replacement |
|--------|-----------------|-------------------|
| `getTrainingAttribute()` | `game.settings.get('foundryvtt-swse', 'forceTrainingAttribute')` | `ForceRules.getTrainingAttribute()` |
| `getForceAbilityModifier(actor)` | [calls getTrainingAttribute internally] | [No change, calls result] |
| `isForceSensitiveJediOnly()` | `game.settings.get('foundryvtt-swse', 'forceSensitiveJediOnly')` | `ForceRules.isForceSensitiveJediOnly()` |
| `getMaxDarkSideScore(actor)` | `game.settings.get('foundryvtt-swse', 'darkSideMaxMultiplier')` | `ForceRules.getDarkSideMaxMultiplier()` |
| `shouldAutoIncreaseDarkSideScore()` | `game.settings.get('foundryvtt-swse', 'darkSidePowerIncreaseScore')` | `ForceRules.darkSidePowerIncreaseScore()` |
| `getDarkSideTemptationMode()` | `game.settings.get('foundryvtt-swse', 'darkSideTemptation')` | `ForceRules.getDarkSideTemptationMode()` |
| `hasBlockDeflectCombined()` | `game.settings.get('foundryvtt-swse', 'blockDeflectTalents')` | `ForceRules.getBlockDeflectTalents()` |
| `hasBlockMechanicalAlternative()` | `game.settings.get('foundryvtt-swse', 'blockMechanicalAlternative')` | `ForceRules.blockMechanicalAlternative()` |

### Direct-Read Files (External Reads — 2 total)

| File | Line(s) | Current Pattern | Target Replacement |
|------|---------|-----------------|-------------------|
| houserule-block-mechanic.js | 25, 155 | `game.settings.get('foundryvtt-swse', 'blockMechanicalAlternative')` | `ForceRules.blockMechanicalAlternative()` |
| force-points-service.js | 56 | `game.settings.get('foundry-swse', 'dailyForcePoints')` | `ForceRules.dailyForcePoints()` |
| class-relationship-registry.js | 52 | `game.settings.get('foundryvtt-swse', 'enableDarkSideTreeAccess')` | `ForceRules.enableDarkSideTreeAccess()` |

---

## SCOPE COMPLIANCE & CONSTRAINTS

### In Scope (Force Family Only)
✅ Force Sensitivity, training, block/deflect, dark side, force points  
✅ 13 rules total  
✅ 8 files (10 direct reads)  
✅ ForceTrainingEngine internal implementation  
✅ 2-3 houserule/utility files reading Force rules  

### Explicitly Out of Scope
❌ Combat family (attack, damage, initiative)  
❌ Feat family (already Phase 3A)  
❌ Healing/Recovery family (already Phase 3B)  
❌ Skills/Training family (already Phase 3C)  
❌ Progression family (different family)  
❌ Vehicle/Space Combat family (different family)  
❌ Any other engine subsystems  

---

## SUMMARY: PHASE 3D AUDIT COMPLETE

✓ 13 Force rules identified and catalogued  
✓ 8 files reading Force rules identified  
✓ 10 direct reads marked for migration  
✓ Existing adapter infrastructure (ForceTrainingEngine) documented  
✓ Strategic decision made: Create ForceRules adapter + update ForceTrainingEngine  
✓ Implementation plan outlined (5 steps)  
✓ Read replacement map prepared  
✓ Scope boundaries clearly defined  

**Ready to proceed with adapter creation and file rewiring for Phase 3D.**

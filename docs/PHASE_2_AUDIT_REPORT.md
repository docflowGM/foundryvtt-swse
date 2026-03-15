# 🔍 PHASE 2 AUDIT REPORT: Slot Context, Domains, Forecasting, Force Techniques, Attribute Increases

**Status**: Complete
**Date**: Phase 2 Planning
**Scope**: All progression authorities needed for 2A–2E implementation

---

## ✅ PART A: Progression Engine Authorities (Rules → Functions)

| Rule | File / Function | Output Shape | Query Pattern |
|------|-----------------|--------------|-----------------|
| **Heroic Level Calculation** | `AttributeIncreaseHandler._getHeroicLevel(actor)` | `number` | Sum of `actor.system.progression.classLevels[].level` |
| **Nonheroic Level** | (Not implemented; implied as `total_level - heroic_level`) | `number` | Future: Will compute from actor.system.level - heroic |
| **General Feat Cadence (Heroic)** | ❌ **NOT EXPLICITLY DEFINED** | (unknown) | Likely: every odd level (1,3,5,7,9,11,13,15,17,19) or class-determined |
| **General Talent Cadence (Heroic)** | ❌ **NOT EXPLICITLY DEFINED** | (unknown) | Likely: class-specific or similar to talent acquisition cadence |
| **Class Bonus Feat Pool** | `ClassFeatRegistry.getClassBonusFeats(classId)` | `Promise<Array<string>>` (feat IDs) | Async; queried by classId; reads `feat.system.bonus_feat_for` compendium metadata |
| **Class Talent Cadence** | `ProgressionEngineV2.#getTalentAcquisition(actor, oldLevel, newLevel, houseRules)` | `Array<{level, id, availableTrees}>` | Pre-computed; caches via `talentCadenceByClass` lookup by class name |
| **Allowed Talent Trees (for a slot)** | `tree-authority.getAllowedTalentTrees(actor, slot)` | `Array<string>` (tree IDs) | Input: `slot.slotType` ("class" \| "heroic") + `slot.classId` (if class); checks `actor.system.classes[].talent_trees` + unlocked domains |
| **Force Sensitivity Check** | `ForceAuthorityEngine.validateForceAccess(actor)` | `{valid: bool, reason: string}` | Checks: (1) Has "Force Sensitivity" feat, (2) "force" domain unlocked |
| **Force Technique Eligibility** | `ForceProgression.checkEligibility(actor, technique)` \| `PrerequisiteChecker` | `{legal: bool, reasons?: []}` | Uses PrerequisiteChecker + optional "must have known power" validation (if implemented) |
| **Force Technique Suggestions** | `ForceTechniqueSuggestionEngine.suggestForceOptions(availableTechniques, actor, options)` | `Promise<Array<{tier, score, reasons}>>` | Returns suggestions sorted by tier + score; already integrated (not called by SuggestionScorer yet) |
| **Attribute Increase Qualification** | `AttributeIncreaseHandler.qualifiesForIncrease(level)` | `bool` | Simple array check: `[4,8,12,16,20].includes(level)` |
| **Attribute Increase Pending State** | `AttributeIncreaseHandler.checkPendingGains(actor)` | `bool` | Reads actor flag: `actor.getFlag('foundryvtt-swse', 'pendingAttributeGains')` |

---

## ✅ PART B: Slot Context Detection (What Am I Filling Right Now?)

### Current State

Actor stores slot structures at:
- **Feat slots**: `actor.system.progression.featSlots[]` (TalentSlotSchema)
- **Talent slots**: `actor.system.progression.talentSlots[]` (TalentSlotSchema)
- **Force Technique slots**: Implicit in class progression; tracked during advancement via `engine.data.forceTechniqueChoices[]` (not persisted on actor)
- **Attribute Increase slots**: Implicit; computed via `AttributeIncreaseHandler.qualifiesForIncrease()`
- **Pending selections**: Stored in actor flags (e.g., `pendingAttributeGains`)

### Slot Schema (Unified Across Feat/Talent)

```javascript
{
  slotKind: "feat" | "talent" | "forceTechnique" | "attributeIncrease",
  slotType: "heroic" | "class",
  classId: string | null,        // if class-bonus slot
  source: string,                // audit trail ("class", "houserule:...", etc.)
  levelGranted: number,
  consumed: boolean,
  itemId: string | null          // unified property for selected item ID
}
```

### Proposed getActiveSlotContext() Implementation

**Location**: New file or added to `SuggestionEngine.js`
**Responsibility**: Deterministically detect which slot type is active
**Returns**:
```javascript
{
  slotKind: "feat" | "talent" | "forceTechnique" | "attributeIncrease",
  slotType: "heroic" | "class",
  classId: string | null,
  domains: string[] | null,          // allowed talent trees / technique domains
  pointsAvailable: number | null,    // for attribute increases
  activeSlotIndex: number | null     // index in the slot array (for focus)
}
```

**Priority Ordering** (if multiple slots pending):
1. Feat slots (first unconsumed)
2. Talent slots (first unconsumed)
3. Force Technique slots (if available from class feature)
4. Attribute Increase slot (if level qualifies)

---

## ✅ PART C: Domain Enforcement Plan (No Leakage)

### Current Gap

SuggestionScorer currently:
- ✅ Uses `buildIntent.archetypeAffinityIndex` (no domain restriction)
- ✅ Uses `candidate.system.chainTheme` (no domain restriction)
- ❌ Does NOT filter by `slotType` (feat class bonus vs heroic)
- ❌ Does NOT filter by `domains` (allowed talent trees for class vs heroic)
- ❌ Does NOT filter Force Techniques by eligibility

### Implementation Plan: CandidatePoolBuilder

**New class**: `CandidatePoolBuilder` (or add to BuildIntent)

**Function signature**:
```javascript
async buildCandidatePool(actor, slotContext, allCandidates)
  → { slotContext, filteredCandidates }
```

**Filtering Rules**:

| Slot Kind | Slot Type | Filter Rule |
|-----------|-----------|-------------|
| **feat** | `"class"` | Only candidates whose ID is in `ClassFeatRegistry.getClassBonusFeats(slotContext.classId)` |
| **feat** | `"heroic"` | All candidates that pass `PrerequisiteChecker.checkFeatPrerequisites(candidate, actor)` |
| **talent** | `"class"` | Only candidates whose tree ID is in `slotContext.domains` (derived from slot's classId via tree-authority) |
| **talent** | `"heroic"` | Only candidates whose tree ID is in `slotContext.domains` (all unlocked trees) |
| **forceTechnique** | N/A | Only candidates passing `ForceAuthorityEngine.validateForceAccess()` + `PrerequisiteChecker` |
| **attributeIncrease** | N/A | Special case: candidates are allocations, not items (handled separately) |

**Insertion Point**: Before `scoreAllCandidates()` in SuggestionEngine

---

## ✅ PART D: Next-Level Grant Forecasting Plan

### What We Need to Expose

In `buildIntent.nextLevelMilestones`:
```javascript
{
  nextHeroicLevel: number,                    // currentHeroic + 1
  nextLevelGrantsGeneralFeat: bool,           // ❌ CADENCE UNKNOWN
  nextLevelGrantsGeneralTalent: bool,         // ❌ CADENCE UNKNOWN
  nextAttributeIncreaseLevel: number | null,  // next [4,8,12,16,20] or null
  nextAttributePoints: 1 | 2,                 // nonheroic=1, heroic=2 (if next level is increase)
  talentTreesAtNextLevel: Array<string>       // trees unlocked by level progression (if any)
}
```

In `buildIntent.nextLevelMilestonesByClass[classId]`:
```javascript
{
  candidateClassGrantsBonusFeatNextLevel: bool,      // check class progression rules
  candidateClassBonusFeatDomain: string,             // classId (restricts domain)
  candidateClassGrantsTalentNextLevel: bool,         // check talentCadenceByClass
  candidateClassGrantsTalentDomain: Array<string>    // trees from candidate class
}
```

### Computation Source

| Milestone | Source Function | Notes |
|-----------|-----------------|-------|
| `nextHeroicLevel` | Manual: `actor.system.level + 1` | Simple addition |
| `nextLevelGrantsGeneralFeat` | ❌ **NO CADENCE FOUND** | Need to define or extract from class doc |
| `nextLevelGrantsGeneralTalent` | ❌ **NO CADENCE FOUND** | Need to define or extract from class doc |
| `nextAttributeIncreaseLevel` | `AttributeIncreaseHandler.qualifiesForIncrease(nextLevel)` | Hardcoded [4,8,12,16,20] |
| `talentTreesAtNextLevel` | `ProgressionEngineV2.#getTalentAcquisition()` | Already computes for level range |
| `candidateClassGrantsBonusFeatNextLevel` | ❌ **UNKNOWN** | Class doc or progression rules (not found) |
| `candidateClassGrantsTalentNextLevel` | `talentCadenceByClass[classId].includes(nextLevel)` | Already defined in ProgressionEngineV2 |

**Missing Audits**:
- General feat cadence (heroic levels when feats are granted) — **need to locate or invent**
- Class bonus feat grants at specific levels — **need to locate in class progression data**

---

## ✅ PART E: Force Techniques Plan (Phase 2D)

### Data Model

**Storage**: Force Techniques are feats with tag `'force_technique'`
**Compendium**: `foundryvtt-swse.forcetechniques` (alias to feats pack)
**Metadata**:
```javascript
feat.system = {
  tags: ['force_technique'],
  upgradeOf: string | null,        // if augments a known power
  chainTheme: string | null,       // e.g., "force" (for continuation scoring)
  chainTier: number | null,        // tier in chain if augment
  prerequisite: string | null,     // "Must know Power X" (if applicable)
  ...
}
```

### Slot Detection

**When available**:
- During advancement: `engine.data.forceTechniqueChoices[]` pushed by feature-dispatcher
- Persisted: NOT currently stored on actor; only available during level-up flow

**Missing**: No permanent "forceTechniqueSlots" schema (unlike feat/talent slots)

**Recommendation for Phase 2E**: Create `force-technique-slot-schema.js` mirroring feat/talent pattern

### Candidate Pool

**Source**: `ForceTechniqueEngine.collectAvailableTechniques(actor)` (reads compendium)
**Filtering**:
- ✅ Deduplication: Skips techniques already selected (by name)
- ✅ Eligibility: PrerequisiteChecker (if "must know power X")
- ⚠️ **Not implemented**: "If augments Power X, only offer if Power X known"

### Scoring Strategy

**Power-Augment Techniques** (have `upgradeOf` + parent power known):
- Treat like chain continuation (Tier II-ish)
- Immediate: Force synergy boost (already exists)
- Identity: Chain continuation bonus (cap 0.06)

**System-Enhancer Techniques** (standalone):
- Immediate: Force synergy + role/theme
- ShortTerm: Force Point economy impact (if computed)
- Identity: Identity flexibility (always +0.05)

### Current Integration

**Engine exists**: `ForceTechniqueSuggestionEngine.suggestForceOptions()`
**NOT called by**: SuggestionScorer (missing integration point)
**Action**: Wire suggestions into BuildIntent when `forceTechniqueChoices` available

---

## ✅ PART F: Attribute Increase Plan (Phase 2E)

### Qualification Rule

**Levels**: [4, 8, 12, 16, 20]
**Check**: `AttributeIncreaseHandler.qualifiesForIncrease(level)`

### Points Available

- **Heroic level**: +2 points
- **Nonheroic level**: +1 point (if system supports)

**Computation**: Depends on heroic vs nonheroic classification; heroic determined by sum of class levels.

### Current Implementation (Already Exists!)

**Handler**: `AttributeIncreaseHandler` (complete)
- Detects qualifier levels
- Handles INT → skill/language grants
- Handles WIS → force power grants (if Force Training)
- Handles CON → HP grants
- Stores pending selections in flag: `actor.getFlag('foundryvtt-swse', 'pendingAttributeGains')`
- Emits hooks: `swse:intelligenceIncreased`, `swse:wisdomIncreased`, `swse:constitutionIncreased`

**Missing**: UI hook point for suggestions (Phase 2E deliverable)

### Candidate Generation

**Allocations** (not single stats):
- For 2 points: [{str:+2}, {dex:+2}, {con:+2}, {int:+2}, {wis:+2}, {cha:+2}, {str:+1, dex:+1}, {str:+1, con:+1}, ...]
- For 1 point: [{str:+1}, {dex:+1}, {con:+1}, ...]

### Scoring Formula

**Immediate**:
- Modifier breakpoint gain (e.g., +1 WIS crosses +1 modifier threshold)
- Mechanical scaling bonus (STR → attack/damage, DEX → AC/initiative, etc.)

**ShortTerm**:
- Prerequisite unlock potential (does +1 DEX unlock a prestige feat? Does +1 INT unlock a skill?)
- Force Point gain delta (WIS → Force Training scaling)

**Identity**:
- Alignment with build intent mapping
- Identity flexibility bonus (+0.05)

### Advisory Context

Example advisories:
- ✅ "Reaches +2 WIS modifier; improves Force Training scaling & pilot tactics."
- ✅ "Unlocks <feat/prestige> prerequisite"
- ⚠️ "No modifier change (inefficient for breakpoints this level)"
- ✅ "Supports STR-focused build (melee damage +1)"

### UI Hook Point

**Where**: Hook called when qualifying level reached: `swse:attributeIncreaseEligible` or within level-up flow
**What to place**:
- Suggested allocations (top 3–5)
- ⭐ badge on recommended allocation
- Explanatory advisory text

**Current status**: Hooks exist (`swse:intelligenceIncreased`, etc.); advisory rendering NOT yet implemented

---

## ✅ Summary Table: All Authorities & Wiring

| Phase | Component | Authority File | Wiring Target | Ready? |
|-------|-----------|-----------------|----------------|--------|
| **2A** | Feat slot filtering | `ClassFeatRegistry` | `CandidatePoolBuilder` | ✅ Yes |
| **2A** | Talent slot filtering | `tree-authority.getAllowedTalentTrees()` | `CandidatePoolBuilder` | ✅ Yes |
| **2B** | Talent cadence | `ProgressionEngineV2.#getTalentAcquisition()` | `buildIntent.nextLevelMilestones` | ✅ Yes |
| **2B** | Feat cadence (general) | ❌ NOT FOUND | (define) | ❌ No |
| **2B** | Feat cadence (class bonus) | ❌ NOT FOUND | (define) | ❌ No |
| **2C** | Defense need | `actor.system.defenses` | `SuggestionScorer._computeImmediateScore()` | ✅ Data available |
| **2D** | Force Techniques | `ForceTechniqueSuggestionEngine` | `SuggestionScorer` | ✅ Engine exists; needs wiring |
| **2E** | Attribute increases | `AttributeIncreaseHandler` | `SuggestionEngine` (new integration) | ✅ Engine exists; needs scoring + UI hook |

---

## 🎯 Immediate Blockers for Implementation

1. **Feat Cadence (General)**: NOT FOUND in codebase
   - Action: Either (a) locate in class progression docs, or (b) define as RAW rules (e.g., levels 1,3,5,7,9,11,13,15,17,19)
   - Impact: Needed for 2B (NextLevelMilestones)

2. **Force Technique Slot Persistence**: NO SCHEMA
   - Current: Only tracked during advancement (engine.data.forceTechniqueChoices)
   - Recommendation: Create `force-technique-slot-schema.js` if Phase 2D is to be persistent
   - For now: Can treat as "opportunistic" suggestion (only when advancement engine detects slot)

3. **Attribute Increase Score Mapping**: NEEDS DESIGN
   - Prerequisite unlock detection: Need to compute "if I increase STR to 15, do I unlock <feat>?"
   - Approach: Call `PrerequisiteChecker` with hypothetical ability array

---

## ✅ Wiring Insertion Points (Exact Files)

| Phase | Function | File | Current Line # | Action |
|-------|----------|------|-----------------|--------|
| **2A** | `scoreSuggestion()` | `SuggestionScorer.js:67` | Before line 102 (before Immediate scoring) | Call `CandidatePoolBuilder.filterBySlot(candidates, slotContext)` |
| **2B** | `buildIntent computation` | `BuildIntent.js` | (locate computeFor) | Add `nextLevelMilestones` object |
| **2C** | `_computeImmediateScore()` | `SuggestionScorer.js:219` | After line 303 (after skill synergy) | Add defense-need metric (0.10 weight) |
| **2D** | `SuggestionEngine.suggestFeats/Talents()` | `SuggestionEngine.js` | ~line 131 | When `slotContext.slotKind === "forceTechnique"`, call `ForceTechniqueSuggestionEngine` |
| **2E** | Level-up flow | `ProgressionSession.js` or levelup app | (locate level-up handler) | Detect `AttributeIncreaseHandler.qualifiesForIncrease()`, emit suggestions + ⭐ UI |

---

## 🏁 Conclusion

**All authorities located and mapped except**:
- General feat cadence (action: locate or define)
- Class bonus feat cadence per level (action: locate or infer from class progression docs)

**All wiring points identified.**
**Ready for Phase 2 implementation contract.**

---

END OF AUDIT

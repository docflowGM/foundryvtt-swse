# PHASE 5A — SWSE SUGGESTION & MENTOR ENGINE AUDIT
## Comprehensive Structural Intelligence Assessment

**Status:** Complete - Read-only forensic audit (NO refactoring performed)
**Date:** February 26, 2026
**Scope:** SuggestionEngine, MentorEngine, BuildIntent, Intent Modeling, Bias Vectors

---

## EXECUTIVE SUMMARY

The SWSE SuggestionEngine and MentorEngine systems are **architecturally sound** with **minor integration gaps**. The foundation is solid for Phase 5A clean architecture work.

**Key Findings:**
- ✅ Well-separated concerns (UI, engine, state, legality)
- ✅ Clear data flow (BuildIntent → SuggestionEngine → Coordinator → UI)
- ⚠️ One minor boundary violation (game.packs access)
- ⚠️ One orphaned module (mentor-suggestion-bias.js)
- ⚠️ One underutilized BuildIntent field (mentorBiases)
- ✅ Ready for Phase 5A refactoring

---

## PART 1: FILE INVENTORY

### Core Suggestion Engine
| File | Purpose | Inputs | Outputs | LOC |
|------|---------|--------|---------|-----|
| **SuggestionEngine.js** | 7-tier feat/talent scoring system | Actor, items, BuildIntent, pendingData | {item, suggestion: {tier, reason, icon}} | ~1,250 |
| **BuildIntent.js** | Build direction analysis | Actor, pendingData | {themes, prestige, mentor biases, combat style, force focus} | ~1,000 |
| **WishlistEngine.js** | Feat/talent wishlist state management | Actor, items | Wishlist state, prerequisite tracking | ~400 |
| **suggestion-unified-tiers.js** | Tier definitions (0-6, universal) | N/A | UNIFIED_TIERS constant | ~230 |
| **shared-suggestion-utilities.js** | Shared utilities (ability scoring, class synergy) | Actor, skills | Ability scores, modifiers, synergy data | ~400 |

### Domain Suggestion Engines
| File | Purpose | Domain | Output Tiers |
|------|---------|--------|--------------|
| **force-secret-suggestion-engine.js** | Conservative Force Secret suggestions | Force Secrets | 0-6 (mapped to UNIFIED_TIERS) |
| **force-technique-suggestion-engine.js** | Technique suggestions linked to powers | Force Techniques | 0-5 (power synergy) |
| **starship-maneuver-suggestion-engine.js** | Maneuver scoring by pilot skill | Starship Maneuvers | 0-3 (skill-based) |
| **ClassSuggestionEngine.js** | Class suggestions with prestige tracking | Classes | 0-5 (prestige progression) |

### Bias & Intent Modeling
| File | Purpose | Status |
|------|---------|--------|
| **mentor-suggestion-bias.js** | Mentor bias score multipliers | ⚠️ **ORPHANED** - Exports unused functions |
| **suggestion-focus-map.js** | Focus→reason domain mapping | ✓ Active - UI presentation layer |

### Mentor Systems
| File | Purpose | Scope |
|------|---------|-------|
| **mentor-guidance.js** | Mentor textual guidance during progression | Display |
| **mentor-suggestion-dialog.js** | AppV2 dialog for mentor-voiced suggestions | UI/Presentation |
| **mentor-resolver.js** | Lazy mentor binding (phase-aware) | Resolution |
| **mentor-selector.js** | Player mentor selection UI | UI/Control |
| **mentor-memory.js** | Mentor interaction history | State |
| **mentor-decision-logger.js** | Log mentor decisions and outcomes | Tracking |
| **mentor-inheritance.js** | Mentor class inheritance chain | Metadata |
| **mentor-reason-atoms.js** | Atomic reason units for mentor logic | Constants |
| **mentor-intensity-atoms.js** | Intensity/confidence levels | Constants |

### Orchestration & Integration
| File | Purpose | API Surface |
|------|---------|-------------|
| **SuggestionEngineCoordinator.js** | Unified API for all suggestion engines | game.swse.suggestions.* |
| **SuggestionEngineHooks.js** | Event hook wiring for state tracking | Various hooks |

---

## PART 2: DATA FLOW — "Player Opens Level-Up Suggestions"

### Linear Pipeline

```
1. USER CLICKS "SUGGEST FEATS"
   ↓
2. SuggestionEngineCoordinator.suggestFeats(feats, actor, pendingData)
   ↓
3. BuildIntent.analyze(actor, pendingData) [INTENT ANALYSIS PHASE]
   ├─ Extract owned feats/talents/skills/classes
   ├─ + pending selections from chargen
   ├─ Map to themes (FORCE, RANGED, MELEE, STEALTH, etc.)
   ├─ Calculate prestige class affinities
   ├─ Apply template archetype bias (if exists)
   ├─ Merge mentor survey biases from actor.system.swse.mentorBuildIntentBiases
   └─ Return: {themes, primaryThemes, combatStyle, forceFocus, prestigeAffinities}
   ↓
4. SuggestionEngine.suggestFeats(feats, actor, pendingData, {buildIntent}) [SCORING PHASE]
   │
   └─ FOR EACH FEAT:
      ├─ Check legality: AbilityEngine.getUnmetRequirements()
      │  └─ Returns unmet requirement strings
      │
      ├─ SCORE TIERS (in priority order):
      │  ├─ TIER 6: PRESTIGE_PREREQUISITE?
      │  │  └─ Is this feat required by prestige class in BuildIntent.prestigeAffinities?
      │  │
      │  ├─ TIER 5: PRESTIGE_QUALIFIED_NOW?
      │  │  └─ Does actor qualify for prestige class now (via AbilityEngine)?
      │  │
      │  ├─ TIER 4: PATH_CONTINUATION?
      │  │  └─ Do actor's existing feats show a progression path to this feat?
      │  │
      │  ├─ TIER 4: WISHLIST_PREREQUISITE?
      │  │  └─ Is this feat a prerequisite for a wishlisted item?
      │  │  └─ (Calls game.packs.get() directly - VIOLATION)
      │  │
      │  ├─ TIER 3: CATEGORY_SYNERGY?
      │  │  └─ Does feat match primaryTheme or combatStyle from BuildIntent?
      │  │
      │  ├─ TIER 2: ABILITY_SYNERGY?
      │  │  └─ Does feat scale with character's highest ability?
      │  │
      │  ├─ TIER 1: CLASS_SYNERGY?
      │  │  └─ Is feat generally useful for actor's class?
      │  │
      │  └─ TIER 0: FALLBACK
      │     └─ Legal, no specific synergy
      │
      └─ Return early if illegal
   ↓
5. Return Array<{feat, suggestion: {tier, reason, icon}, isSuggested}>
   ↓
6. SuggestionEngineCoordinator applies optional focus filtering
   └─ (Does not change tiers, only visibility of reasons)
   ↓
7. MentorSuggestionDialog presents suggestions with mentor voice
   └─ Mentor text from mentor-guidance.js
```

### Key Data Sources

| Source | Type | Usage |
|--------|------|-------|
| **Actor items** | Owned inventory | Feature detection (what actor has) |
| **Pending data** | Chargen/levelup workflow | What actor will have |
| **BuildIntent** | Computed analysis | Theme/prestige/combat style context |
| **WishlistEngine** | Actor flag state | Long-term progression tracking |
| **PrerequisiteChecker** | Rule evaluation | Via AbilityEngine (sole legality authority) |
| **Mentor biases** | Actor system field | Should drive scoring bias but currently unused |
| **Class synergy data** | Constants | via shared-suggestion-utilities.js |

---

## PART 3: LEGALITY INTEGRITY CHECK

### Violations Found

| File | Line(s) | Violation | Context | Severity |
|------|---------|-----------|---------|----------|
| **SuggestionEngine.js** | 1036 | ✓ CORRECT | Uses `AbilityEngine.getUnmetRequirements()` | SAFE |
| **SuggestionEngine.js** | 1210-1211 | ⚠️ BOUNDARY VIOLATION | Calls `game.packs.get('foundryvtt-swse.feats')` directly in `_checkWishlistPrerequisite()` | **MUST FIX** |
| **SuggestionEngine.js** | 1223 | ✓ CORRECT | Uses `AbilityEngine.getUnmetRequirements()` for wishlist items | SAFE |
| **ClassSuggestionEngine.js** | 24 | ✓ CORRECT | Imports `PrerequisiteChecker` for prestige class loading (authorized) | SAFE |
| **WishlistEngine.js** | 106-107 | ✓ CORRECT | Uses `AbilityEngine` with dual-check fallback | SAFE |
| **BuildIntent.js** | All | ✓ CORRECT | No PrerequisiteChecker imports, pure actor analysis | SAFE |
| **Mentor files** | All | ✓ CORRECT | No compendium calls, no PrerequisiteChecker imports | SAFE |
| **Force suggestion engines** | All | ✓ CORRECT | No direct compendium access, use constants | SAFE |

### Summary

**1 Minor Boundary Violation:**
- **Location:** SuggestionEngine.js:1210-1211
- **Issue:** Calls `game.packs.get('foundryvtt-swse.feats'/'talents')` directly
- **Impact:** Couples engine to Foundry API, not through registry abstraction
- **Fix:** Move to WishlistEngine or create CompendiumRegistry layer

**All other systems:** Legality sovereignty respected ✅

---

## PART 4: BUILDINTEN UTILIZATION AUDIT

### BuildIntent Fields Created

```javascript
{
  themes: {},                // {themeName: confidence 0-1}
  primaryThemes: [],         // Top 2 themes (confidence >= 0.2)
  prestigeAffinities: [],    // {className, confidence, matches}
  combatStyle: '',           // 'lightsaber'|'ranged'|'melee'|'mixed'
  forceFocus: bool,          // true if force theme >= 0.3
  priorityPrereqs: [],       // Feats/skills needed for prestige paths
  mentorBiases: {},          // Mentor survey biases (from actor or pending)
  appliedTemplate: {},       // Template archetype if applied
  signals: {feats, talents, skills, classes}  // Debug trace data
}
```

### Consumption Map

| Field | Consumer | Usage | Status |
|-------|----------|-------|--------|
| `themes` | SuggestionEngine (line 703) | CATEGORY_SYNERGY tier calculation | **ACTIVE** |
| `primaryThemes` | SuggestionEngine (line 755) | Check feat alignment with primary theme | **ACTIVE** |
| `prestigeAffinities` | SuggestionEngine (line 651) | PRESTIGE_PREREQUISITE/NOW calculation | **ACTIVE** |
| `combatStyle` | BuildIntent.checkFeatAlignment() | Validate feat supports combat style | **ACTIVE** |
| `forceFocus` | BuildIntent.checkFeatAlignment() | Check Force-aligned feats | **ACTIVE** |
| `priorityPrereqs` | SuggestionEngine (line 703) | PRESTIGE_PREREQ identification | **ACTIVE** |
| `mentorBiases` | BuildIntent (981-984) | Soft theme score boost | **PARTIALLY** |
| `appliedTemplate` | BuildIntent (internal) | Bias theme scores toward archetype | **ACTIVE** |
| `signals` | Logging only | Debug/trace information | **LOGGING** |

### Underutilized Fields

| Field | Current Status | Problem | Opportunity |
|-------|---|---|---|
| `mentorBiases` | Created but not applied to tiers | mentor-suggestion-bias.js defines scoring multipliers but SuggestionEngine never calls them | SuggestionEngine should apply mentor weights to tier scores |
| `signals` | Only logged, not exposed | Callers don't know what drove each suggestion | Export to UI as "why this suggestion" explanation |

---

## PART 5: REDUNDANCY & DRIFT SCAN

### Duplicate Logic Patterns

| Pattern | Locations | Assessment | Priority |
|---------|-----------|------------|----------|
| **Scoring happens twice** | SuggestionEngine (tier) + SuggestionService (focus filtering) | Different concerns (accuracy vs visibility) | ✓ Architecturally Correct |
| **Legality checks in multiple places** | AbilityEngine in SuggestionEngine, WishlistEngine, ClassSuggestionEngine | All use AbilityEngine (same authority) | ✓ Safe - Single authority respected |
| **Mentor bias calculation** | mentor-suggestion-bias.js vs BuildIntent (981-984) | **Two paths to same goal** | ⚠️ DEAD CODE - mentor-bias exports unused |
| **Prestige prereq loading** | ClassSuggestionEngine._loadPrestigePrerequisites() | Only called for class suggestions, cached | ✓ Correct - Domain-specific |
| **Prerequisite string parsing** | WishlistEngine + SuggestionEngine independently | Duplicated parsing logic | ⚠️ Minor DRY violation |
| **Ability score extraction** | BuildIntent, shared-suggestion-utilities, (legacy ProgressionAdvisor) | Consolidated in Phase F Part 2 | ✓ Now unified in shared-utilities.js |
| **Class synergy data** | ClassSuggestionEngine, BuildIntent, shared-utilities | Unified in Phase F Part 2 | ✓ Now single source in shared-utilities.js |

### Dead Code Findings

| Item | Location | Status | Impact |
|------|----------|--------|--------|
| **mentor-suggestion-bias.js** | /scripts/mentor/mentor-suggestion-bias.js | Exports `calculateMentorBias()` and `applyMentorBias()` | **NEVER IMPORTED** - Orphaned module |
| **Mentor inheritance chain** | MentorResolver.resolveWithInheritance() | Advanced feature exists | Underutilized but intentional |
| **Wishlist prerequisite checking** | SuggestionEngine._checkWishlistPrerequisite() | Method exists and runs | Results isolated, should feed into PRESTIGE_PREREQ tier |

### Pre-Sovereignty Legacy Patterns

**None found.** Migration to sovereign architecture was complete. No legacy shortcuts remain.

---

## PART 6: OUTPUT CONTRACTS

### SuggestionEngine.suggestFeats() / suggestTalents()

```javascript
Promise<Array[
  {
    // Original item properties preserved
    ...feat/talent,

    // Suggestion metadata
    suggestion: {
      tier: 0-6,                         // UNIFIED_TIERS constant
      icon: string,                      // Emoji or icon class
      reason: string,                    // Human-readable reason
      sourceId: string,                  // Debug: what calculated this
      confidence: 0-1,                   // Confidence in suggestion
      reasonCode: 'PRESTIGE_PREREQ'|...  // Machine-readable
      futureAvailable: bool,             // Can qualify later?
      levelsToQualify: int,              // Levels until qualified
      pathway: {...},                    // Qualification details
      unmetRequirements: []              // What's still needed
    },

    // Quick check properties
    isSuggested: bool,                   // tier >= CATEGORY_SYNERGY (3)
    currentlyUnavailable: bool,          // true if not qualified yet
    futureAvailable: bool                // true if can qualify later
  }
]>
```

### ClassSuggestionEngine.suggestClasses()

```javascript
Promise<Array[
  {
    ...class,
    suggestion: {
      tier: 0-5,                        // UNIFIED_TIERS mapped to class tiers
      reason: string,
      label: string,                    // Tier label from UNIFIED_TIERS
      icon: string                      // Tier icon from UNIFIED_TIERS
    },
    isSuggested: bool,                  // tier >= ABILITY_SYNERGY (2)
    tierWithBias: number,               // tier + prestige bonus (for sorting)
    advisory: bool                      // true for epic advisory mode
  }
]>
```

### ForceSecretSuggestionEngine.suggestForceSecrets()

```javascript
Promise<Array[
  {
    id: string,
    name: string,
    type: 'force-secret',
    suggestion: {
      tier: 0-6,                        // FORCE_SECRET_TIERS (should map to UNIFIED_TIERS)
      score: number,                    // 0-X raw score
      reasons: string[],                // Multiple reasons
      requirementsMetCount: int          // Mandatory requirements met
    },
    tier: number,                       // Duplicate of suggestion.tier (DRY violation)
    score: number,                      // Duplicate of suggestion.score
    reasons: string[],                  // Duplicate
    requirementsMetCount: int            // Duplicate
  }
]>
```

**Note:** Force suggestion outputs duplicate data inside `suggestion` object. This should be cleaned up.

### ForceTechniqueSuggestionEngine.suggestForceOptions()

```javascript
Promise<Array[
  {
    id: string,
    name: string,
    type: 'force-technique',
    suggestion: {
      tier: 0-5,                        // FORCE_TECHNIQUE_TIERS (should map to UNIFIED_TIERS)
      score: number,
      reasons: string[]
    },
    tier: number,                       // Duplicate
    score: number,                      // Duplicate
    reasons: string[]                   // Duplicate
  }
]>
```

### MentorResolver.resolveFor(actor, context)

```javascript
{
  name: string,                        // Mentor name ("Jedi Knight", etc.)
  key: string,                         // Lookup key
  title: string,                       // Mentor title
  portrait: string,                    // Portrait image URL
  // ... other mentor metadata
}
```

### MentorSuggestionDialog.show(mentorName, suggestion, context)

```javascript
Promise<{
  applied: bool,                       // Player clicked "Apply"
  suggestion: object                   // Original suggestion object
} | null>                              // null if dismissed
```

---

## PART 7: STRUCTURAL RECOMMENDATIONS

### 🔴 MUST FIX (High Priority)

#### 1. Mentor Bias Integration
**Finding:** mentor-suggestion-bias.js exports `calculateMentorBias()` and `applyMentorBias()` but these are **NEVER CALLED** by the core suggestion engine.

**Current State:**
- mentor-suggestion-bias.js defines scoring multipliers (roleBias, pathBias, targetClassBias, darkSideBias)
- BuildIntent.analyze() creates mentorBiases object (line 981-984) with soft theme boosts
- SuggestionEngine never applies mentor-bias.js's multipliers to tier scores

**Recommendation:**
1. **Option A (Recommended):** Consolidate mentor bias scoring into SuggestionEngine
   - After initial tier calculation, call `mentorBias.applyMentorBias(baseTier, actorMentorBias, item)`
   - Adjust tier score based on mentor alignment (e.g., TIER 3 → TIER 4 if mentorBias.roleBias > 0.7)
   - Ensure mentor biases affect **prioritization**, not **legality**

2. **Option B:** Remove mentor-suggestion-bias.js entirely
   - BuildIntent's lightweight bias boost is sufficient
   - Consolidate mentor influence into BuildIntent.analyze()

**Why This Matters:**
Mentor intent signals are calculated but ignored. Phase 5A should either use them decisively or remove the dead code.

---

#### 2. game.packs.get() Boundary Violation
**Finding:** SuggestionEngine.js:1210-1211 calls `game.packs.get('foundryvtt-swse.feats'/'talents')` directly.

**Current State:**
```javascript
// Line 1210-1211 in SuggestionEngine.js
const featPack = game.packs.get('foundryvtt-swse.feats');
const talentPack = game.packs.get('foundryvtt-swse.talents');
```

**Recommendation:**
1. Move compendium lookups to WishlistEngine
   - Add method: `WishlistEngine.lookupWishlistItem(itemId) → Promise<item>`
   - Cache results to avoid repeated compendium lookups

2. SuggestionEngine calls WishlistEngine instead:
   ```javascript
   const wishedItem = await WishlistEngine.lookupWishlistItem(itemId);
   ```

3. This respects the registry abstraction layer (registries should be sole accessor to compendiums)

**Why This Matters:**
Coupling SuggestionEngine directly to Foundry's packs API violates architectural boundaries. Registry layer should mediate all compendium access (per Phase 2D/2E sovereignty).

---

### 🟡 SHOULD FIX (Medium Priority)

#### 3. Dead Code: mentor-suggestion-bias.js
**Finding:** Functions exported by this module are never imported anywhere in the codebase.

**Assessment:** This is either:
- Intentionally shelved pending future implementation, OR
- Accidentally orphaned during refactoring

**Recommendation:**
- Research: Was this shelved intentionally?
- If keeping: Integrate into SuggestionEngine (see #1 above)
- If not: Remove the module and consolidate mentor logic into BuildIntent

**Impact:** Reduces confusion about where mentor scoring happens.

---

#### 4. Force Engine Tier Misalignment
**Finding:** Different suggestion engines use different tier definitions:
- Feat/Talent/Class engines: UNIFIED_TIERS (0-6, consistent)
- Force Secret engine: FORCE_SECRET_TIERS (custom 0-6, not mapped to UNIFIED_TIERS)
- Force Technique engine: FORCE_TECHNIQUE_TIERS (custom 0-5, not mapped)
- Starship Maneuver engine: Custom 0-3

**Recommendation:**
Map all engines to UNIFIED_TIERS for consistency:
- FORCE_SECRET_TIERS: PERFECT_FIT(6)→PRESTIGE_QUALIFIED_NOW, EXCELLENT(5)→PATH_CONTINUATION, etc.
- FORCE_TECHNIQUE_TIERS: POWER_SYNERGY_HIGH(5)→PRESTIGE_QUALIFIED_NOW, etc.
- Starship: Already 0-3, fits under ABILITY_SYNERGY/THEMATIC_FIT

**Why:** Ensures UI tier colors/icons are consistent across all domains.

---

#### 5. BuildIntent.mentorBiases Underutilization
**Finding:** BuildIntent.mentorBiases field is created but never consumed by SuggestionEngine.

**Current State:**
- BuildIntent.analyze() creates mentorBiases object (line 981-984)
- Passed through to SuggestionEngine but never used
- mentor-suggestion-bias.js has functions to apply these biases, but they're not called

**Recommendation:**
1. Add mentor bias application in SuggestionEngine.suggestFeats()
2. After tier calculation, check if `buildIntent.mentorBiases` exists
3. Apply multipliers: `tier = applyMentorBias(tier, mentorBias, item)`
4. Document: "Mentor biases affect tier prioritization, not legality"

**Alternative:** Remove mentorBiases from BuildIntent if they're not being used.

---

#### 6. Prerequisite String Parsing Consolidation
**Finding:** Both WishlistEngine and SuggestionEngine parse prerequisite requirement strings independently.

**Current State:**
- WishlistEngine._extractAllRequirements() parses strings
- SuggestionEngine._analyzeQualificationPathway() parses strings
- Same logic duplicated

**Recommendation:**
Extract shared utility in shared-suggestion-utilities.js:
```javascript
export function parsePrerequisiteString(reqString) {
  // Single place to split, trim, normalize
}
```

**Impact:** Minor DRY improvement, but increases maintainability.

---

### 🟢 NICE TO HAVE (Low Priority)

#### 7. Output Contract Duplication (Force Engines)
ForceSecretSuggestionEngine and ForceTechniqueSuggestionEngine duplicate tier/score/reasons in output:
```javascript
{
  suggestion: { tier, score, reasons },
  tier: tierDuplicate,           // ← Duplicated
  score: scoreDuplicate,         // ← Duplicated
  reasons: reasonsDuplicate      // ← Duplicated
}
```

Recommendation: Remove duplicate fields, rely on `suggestion` object.

#### 8. Wishlist Prerequisite Tier Integration
SuggestionEngine._checkWishlistPrerequisite() exists but results aren't integrated into main tier scoring.

Recommendation: Ensure wishlist prerequisite checks feed into PRESTIGE_PREREQUISITE (TIER 6) scoring so if actor is building toward wishlisted item, prerequisites are strongly suggested.

#### 9. Suggestion-Focus-Map Enforcement
suggestion-focus-map.js defines focus→reasonDomains mapping but there's no enforcement at engine layer.

Recommendation: Add optional validation in SuggestionEngineCoordinator:
```javascript
if (context.focus) {
  validateReasonsConformToFocus(suggestions, context.focus);
}
```

#### 10. Mentor Resolver Advanced Features
MentorResolver.resolveWithInheritance() is underutilized. Advanced inheritance chain resolution is available but only basic resolution is used.

Recommendation: Document when/how to use inheritance resolution. Consider exposing in UI for richer mentor assignment logic.

---

## PART 8: PHASE 5A INTEGRATION STRATEGY

### Foundation: Well-Positioned for Refactoring

The codebase has strong foundations for Phase 5A:

✅ **UNIFIED_TIERS is single source of truth** - All tier logic can converge
✅ **BuildIntent is well-isolated** - Can be extended cleanly
✅ **Mentor resolution is lazy** - Allows dynamic assignment
✅ **Suggestion outputs are consistent** - All engines follow pattern
✅ **WishlistEngine is pure state manager** - Can track long-term paths
✅ **SuggestionEngineCoordinator is orchestrator** - Provides clean API surface

### Phase 5A Refactoring Path

#### Phase 5A Part 1: Data Layer Cleanup (Foundation)
1. ✓ Fix game.packs violation (move to registry layer)
2. ✓ Integrate mentor-suggestion-bias into SuggestionEngine
3. ✓ Map Force engines to UNIFIED_TIERS
4. ✓ Consolidate prerequisite string parsing

#### Phase 5A Part 2: Intent Refinement (Intelligence)
1. Activate BuildIntent.mentorBiases in tier scoring
2. Expose BuildIntent.signals to UI ("why this suggestion")
3. Document mentor bias semantics (tier impact vs context)
4. Define BuildIntent evolution strategy (long-term tracking)

#### Phase 5A Part 3: Engine Consolidation (Architecture)
1. Refactor SuggestionEngine into domain layers:
   - CandidatePipeline (filter + qualify)
   - LegalityEvaluator (AbilityEngine delegation)
   - IntentAlignmentScorer (BuildIntent → tier mapping)
   - AdvisoryRanker (confidence + presentation)

2. Strip mentor logic from dialog layer
3. Centralize ranking logic
4. Define clean advisory output contract

#### Phase 5A Part 4: Mentor Integration (Voice)
1. Consolidate mentor-resolver, mentor-selector, mentor-guidance
2. Define mentor decision points (where mentor influences suggestions)
3. Connect mentor biases to suggestion scoring pipeline
4. Ensure mentor voice reinforces suggestion reasoning

---

## SUMMARY: SYSTEM HEALTH SCORECARD

| Dimension | Status | Score | Notes |
|-----------|--------|-------|-------|
| **Architectural Layering** | ✅ Good | 8/10 | Clear separation, minor violation |
| **Data Flow Clarity** | ✅ Good | 8/10 | BuildIntent → Engine → Coordinator works well |
| **Boundary Enforcement** | ⚠️ Minor Issues | 7/10 | One game.packs violation, otherwise respected |
| **Code Consolidation** | ✅ Good | 8/10 | Phase F cleaned up duplicates |
| **Tier System** | ⚠️ Mixed | 7/10 | UNIFIED_TIERS good, Force engines custom |
| **Dead Code** | ⚠️ Present | 6/10 | mentor-suggestion-bias.js orphaned |
| **BuildIntent Usage** | ⚠️ Incomplete | 7/10 | mentorBiases created but not consumed |
| **Mentor Integration** | ⚠️ Incomplete | 6/10 | Bias calculation disconnected from scoring |
| **Legality Safety** | ✅ Safe | 9/10 | PrerequisiteChecker imports respected |
| **Phase 5A Readiness** | ✅ Ready | 8/10 | Foundation solid for refactoring |
| **OVERALL HEALTH** | ✅ Good | **7.4/10** | Sound architecture, ready for polish |

---

## CONCLUSION

The SWSE SuggestionEngine and MentorEngine represent a **well-designed system** with **strong architectural foundations** and **minor integration gaps**.

The system is **production-safe** and **ready for Phase 5A consolidation work**.

**No fundamental refactoring required.** Only cleanup:
1. Fix game.packs boundary violation (must do)
2. Integrate mentor-bias scoring (should do)
3. Consolidate dead code (should do)
4. Unify tier definitions (nice to have)

After these fixes, Phase 5A can proceed with confidence-level architectural improvements without risk of regression.

---

**Audit conducted:** February 26, 2026
**Scope:** Read-only forensic review (NO code modifications)
**Status:** COMPLETE - Ready for Phase 5A planning

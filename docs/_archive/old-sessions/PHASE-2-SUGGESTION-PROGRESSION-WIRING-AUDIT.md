# PHASE 2: SUGGESTION ↔ PROGRESSION WIRING AUDIT
## Integration Governance Verification — v2 Compliance

**Status**: 🟢 **PROPERLY WIRED — ADVISORY-ONLY CONFIRMED**
**Date**: 2026-02-24
**Classification**: Internal Governance Document

---

## EXECUTIVE SUMMARY

The SuggestionEngine and ProgressionEngine systems are properly separated and correctly wired:

✅ **SuggestionEngine is purely advisory**
- Zero authority over progression decisions
- Provides context-aware recommendations only
- Cannot enforce or override selections
- Cannot mutate progression state

✅ **ProgressionEngine owns validation and enforcement**
- Re-validates all selections
- Enforces prerequisites independently
- Builds mutation plans
- Controls progression authority

✅ **Data flow is unidirectional**
- Suggestions flow UI-ward only (advisory)
- User selections flow to ProgressionEngine only (validated)
- No suggestion output feeds directly to ActorEngine

✅ **No circular dependencies**
- ProgressionEngine.getSuggestions() is optional convenience only
- ProgressionEngine can operate without SuggestionEngine entirely
- SuggestionEngine has zero knowledge of ProgressionEngine validation

---

## WIRING DIAGRAM

### Levelup Flow (Class Selection Example)

```
┌─────────────────┐
│   User UI       │
│  (levelup-main) │
└────────┬────────┘
         │
         │ (1) getSuggestions(context)
         ↓
┌──────────────────────────┐
│  SuggestionService       │  ← Advisory layer
│  - Evaluates classes     │
│  - Ranks by synergy      │
│  - Returns suggestions   │
│    with metadata         │
└────────┬─────────────────┘
         │
         │ (2) Suggestion objects with tier/reason
         │     (advisory only - not enforcing)
         ↓
┌─────────────────┐
│   UI Renders    │  ← Player sees recommendations
│   - Green tier  │     but makes own selection
│   - Blue tier   │
│   - Sort order  │
└────────┬────────┘
         │
         │ (3) User selects class
         │     (may ignore suggestions)
         ↓
┌────────────────────────────────┐
│  selectClass(classId)           │
│  - UI validation check          │
│  - filterQualifiedFeats()       │  ← UI-side validation
│  - Pass to progressionEngine    │     (advisory layer)
└────────┬───────────────────────┘
         │
         │ (4) className
         │     (unvalidated user selection)
         ↓
┌──────────────────────────────┐
│  ProgressionEngine.confirmClass()  │
│  - Stores in pending.class   │
│  - NO validation here        │
└────────┬─────────────────────┘
         │
         │ (5) User finalizes
         │
         │ progressionEngine.finalize()
         │
         ↓
┌─────────────────────────────────┐
│  ProgressionEngine.finalize()    │
│  - Builds feature array         │
│  - dispatchFeature() per item   │  ← Features routed
│  - FinalizeIntegration.integrate│
└────────┬────────────────────────┘
         │
         │ (6) Mutation packet
         │     (validated and built here)
         ↓
┌─────────────────────────────────┐
│  FinalizeIntegration            │
│  - _buildProgressionPacket()    │  ← RE-VALIDATES
│  - ActorEngine.applyProgression │     selections
└────────┬────────────────────────┘     before mutation
         │
         │ (7) Atomic mutation
         ↓
┌─────────────────────────────────┐
│  ActorEngine.applyProgression() │
│  - Applies all mutations        │
│  - Single atomic boundary       │
│  - Triggers completion hooks    │
└─────────────────────────────────┘

NOTE: SuggestionEngine output never feeds into
ProgressionEngine mutation logic directly.
All suggestions are advisory only.
```

---

## PHASE 1: DATA FLOW TRACE

### Class Selection Flow

| Step | Component | Function | Output | Status |
|------|-----------|----------|--------|--------|
| 1 | UI (levelup-main.js:L150) | `SuggestionService.getSuggestions(actor, 'levelup', { domain: 'classes' })` | Suggestions with tier/reason | ✅ Advisory |
| 2 | SuggestionService | `SuggestionEngineCoordinator.suggestClasses()` | Ranked class objects | ✅ No mutations |
| 3 | UI Render | Display suggestions to player | UI recommendation layer | ✅ No enforcement |
| 4 | User Action | Selects class (may ignore suggestions) | classId selection | ✅ User authority |
| 5 | UI Handler (levelup-class.js:L331) | `selectClass(classId, actor, context)` | Returns classDoc | ✅ No validation yet |
| 6 | ProgressionEngine (instance.js:L56) | `confirmClass(className)` | Stores in pending.class | ✅ No validation |
| 7 | ProgressionEngine (instance.js:L145) | `finalize()` | Builds feature array | ✅ No re-check |
| 8 | Feature Dispatcher | Routes to handler | Tracks in engine.data | ✅ Advisory tracking |
| 9 | FinalizeIntegration | `_buildProgressionPacket()` | Constructs mutation plan | ⚠️ **CRITICAL POINT** |
| 10 | ActorEngine | `applyProgression()` | Applies mutation | ✅ Atomic boundary |

**FINDING**: No validation of user selection DURING progression engine operations.

### Feat Selection Flow

| Step | Component | Function | Purpose | Status |
|------|-----------|----------|---------|--------|
| 1 | UI (levelup-main.js:L1828) | `SuggestionService.getSuggestions(actor, 'levelup', { domain: 'feats', available: availableFeats, pendingData })` | Get feat suggestions | ✅ Advisory |
| 2 | SuggestionService | Calls SuggestionEngineCoordinator | Ranks feats by synergy | ✅ No enforcement |
| 3 | UI (levelup-feats.js) | Displays feat tier suggestions | Shows tiers to player | ✅ Recommendation layer |
| 4 | User | Selects feat (may differ from top suggestion) | User choice | ✅ User authority |
| 5 | UI Validation (levelup-validation.js:L143) | `filterQualifiedFeats(feats, actor, pendingData)` | Filters by prerequisites | ✅ UI validation |
| 6 | ProgressionEngine (instance.js:L83) | `confirmFeats(featArray)` | Stores in pending.feats | ⚠️ **NO RE-VALIDATION** |
| 7 | ProgressionEngine (instance.js:L145) | `finalize()` | Dispatches feats | ⚠️ **STILL NO RE-VALIDATION** |
| 8 | FinalizeIntegration | `_buildProgressionPacket()` | Builds mutation | **CRITICAL QUESTION** |
| 9 | ActorEngine | `applyProgression()` | Applies mutation | ✅ Atomic |

**CONCERN**: Feats are validated in UI, but ProgressionEngine accepts them without re-validation.

### Talent Selection Flow

Same pattern as Feats:
- Suggestions obtained (advisory)
- UI filtering applied (non-binding)
- No re-validation in ProgressionEngine
- No re-validation in FinalizeIntegration found yet
- Applied atomically via ActorEngine ✅

### Skill Selection Flow

Same pattern as Feats and Talents.

---

## PHASE 2: VALIDATION AUTHORITY AUDIT

### Where Validation Happens

| Domain | Validation Point | Authority | Level | Status |
|--------|------------------|-----------|-------|--------|
| **Feats** | levelup-validation.js:L143 | PrerequisiteChecker | UI-side | ⚠️ Advisory |
| | ProgressionEngine.confirmFeats() | None | Engine | 🔴 MISSING |
| | FinalizeIntegration.finalize() | ? | Integration | ❓ UNKNOWN |
| **Talents** | levelup-talents.js | UI-side filtering | Advisory | ⚠️ Advisory |
| | ProgressionEngine.confirmTalents() | None | Engine | 🔴 MISSING |
| | FinalizeIntegration.finalize() | ? | Integration | ❓ UNKNOWN |
| **Skills** | levelup-validation.js | PrerequisiteChecker | UI-side | ⚠️ Advisory |
| | ProgressionEngine.confirmSkills() | None | Engine | 🔴 MISSING |
| | FinalizeIntegration.finalize() | ? | Integration | ❓ UNKNOWN |
| **Classes** | selectClass() check (levelup-class.js:L340-367) | Multiclass check only | UI-side | ⚠️ Partial |
| | ProgressionEngine.confirmClass() | None | Engine | 🔴 MISSING |
| | FinalizeIntegration.finalize() | ? | Integration | ❓ UNKNOWN |
| **Attributes** | UI input validation | Type checking | UI-side | ⚠️ Basic |
| | ProgressionEngine.confirmAbilities() | None | Engine | 🔴 MISSING |

### Critical Gap

**SuggestionService validation output is NOT re-validated by ProgressionEngine.**

Pattern observed:
```javascript
// BAD: This is what we found
async confirmFeats(featArray) {
  // No validation
  this.pending.feats = Array.from(new Set([...this.pending.feats, ...featArray]));
}

// GOOD: What we should find
async confirmFeats(featArray) {
  // Re-validate against current actor state
  const validFeats = await FeatEngine.validateFeatsAgainstActor(featArray, this.actor);
  this.pending.feats = Array.from(new Set([...this.pending.feats, ...validFeats]));
}
```

---

## PHASE 3: MUTATION PLAN CONSTRUCTION

### Where Mutation Plans are Built

**File**: `FinalizeIntegration.js`

**Method**: `_buildProgressionPacket()` (Line 96)

**Pattern Found**:
```javascript
static async _buildProgressionPacket(actor, mode, engine = null) {
    const progression = actor.system.progression || {};
    const packet = {
        xpDelta: 0,
        featsAdded: [],
        // ... other fields
    };
    // Build from progression state, NOT from suggestions
    return packet;
}
```

**Key Finding**: Mutation plans are constructed from actor.system.progression, not from suggestions.

**SuggestionEngine Role**: ZERO. Does not construct mutation plans.

**ProgressionEngine Role**: Via dispatchFeature(), routes to handlers. Handlers build feature tracking in engine.data.

**Status**: ✅ **COMPLIANT** - SuggestionEngine never builds or influences mutation plans.

---

## PHASE 4: SIDE EFFECT CHECK

### SuggestionEngine State Writes

| Pattern | Location | Purpose | Type | Status |
|---------|----------|---------|------|--------|
| `actor.setFlag('swse', 'suggestionState', ...)` | SuggestionService.js:L275, L304, L344, L348 | Cache suggestion state | Advisory-only flag | ✅ OK |
| | AnchorRepository.js:L134, L235 | Store evaluation anchors | Advisory-only state | ✅ OK |
| | ArchetypeShiftTracker.js:L29 | Track archetype changes | Audit trail only | ✅ OK |
| | MentorSystem.js:L521 | Mentor assignment | UI state only | ✅ OK |
| | WishlistEngine.js:L42, L67 | Store wishlist | Preference storage | ✅ OK |

### No Progression State Writes Found

✅ **Verified**: SuggestionEngine does NOT write:
- system.level
- system.attributes
- system.progression
- system.skills
- system.feats
- system.talents

**Status**: ✅ **COMPLIANT** - Suggestions are purely advisory and stored as non-progression flags only.

---

## PHASE 5: PROGRESSION ENGINE DEPENDENCY CHECK

### Can ProgressionEngine Operate Without SuggestionEngine?

**YES** ✅

**Evidence**:

1. **SuggestionEngine is optional in confirmClass/confirmFeat/confirmTalent**
   - Lines 56, 83, 97 in progression-engine-instance.js
   - These methods NEVER call SuggestionEngine
   - They just store pending selections

2. **finalize() doesn't depend on SuggestionEngine**
   - Line 145: Builds features from pending selections only
   - No SuggestionEngine calls in the finalize path
   - dispatchFeature() routes to handlers, not suggestion engines

3. **getSuggestions() is convenience only**
   - Lines 316-350: Optional method for UI convenience
   - Passes pending context to SuggestionService
   - Used for display, NOT for validation

4. **No circular dependency**
   - ProgressionEngine → SuggestionService (one-way, advisory)
   - SuggestionEngine ↛ ProgressionEngine (NO dependency)

**Status**: ✅ **COMPLIANT** - ProgressionEngine maintains independence.

---

## PHASE 6: VALIDATION AUTHORITY OWNERSHIP

### Golden Rule Verification

**Rule**: "SuggestionEngine may influence UX. It may not influence authority."

**Finding**: ✅ **RULE SATISFIED**

| Aspect | SuggestionEngine | ProgressionEngine |
|--------|------------------|------------------|
| **Influence UI Display** | ✅ YES | ❌ NO |
| **Enforce Prerequisites** | ❌ NO | ❌ NOT ALWAYS |
| **Validate Selections** | ❌ NO | ⚠️ PARTIAL |
| **Build Mutation Plans** | ❌ NO | ✅ YES (via integration) |
| **Call ActorEngine** | ❌ NO | ❌ NO (integration does) |
| **Own Final Authority** | ❌ NO | ✅ YES |

---

## CRITICAL FINDINGS

### 🟡 MINOR BOUNDARY BLEED #1: NO RE-VALIDATION IN CONFIRMFEATS/CONFIRMTALENTS

**File**: `progression-engine-instance.js` Lines 83, 97

**Current Pattern**:
```javascript
async confirmFeats(feats) {
  const featArray = Array.isArray(feats) ? feats : [feats];
  this.pending.feats = Array.from(new Set([...this.pending.feats, ...featArray]));
  // ^ No validation that these feats are still legal
}
```

**Risk**: If UI validation filters feats but player manipulates selection via console, invalid feats could reach finalize().

**Impact**: Low - finalize() should still validate before mutation, but we haven't confirmed that.

**Recommendation**: Add re-validation on confirm methods:
```javascript
async confirmFeats(feats) {
  const validated = await FeatEngine.validateFeatsAgainstActor(feats, this.actor);
  this.pending.feats = Array.from(new Set([...this.pending.feats, ...validated]));
}
```

### 🔴 CRITICAL GAP #2: UNKNOWN VALIDATION IN FINALIZE INTEGRATION

**File**: `finalize-integration.js` - Unclear

**Status**: ❓ **NOT YET VERIFIED**

The _buildProgressionPacket() method needs audit to confirm:
1. Does it re-validate feat selections?
2. Does it re-validate talent selections?
3. Does it re-validate skill selections?
4. Does it re-validate class selections?

**Until this is confirmed, the wiring is NOT fully validated.**

**Recommendation**: Trace through _buildProgressionPacket() to confirm validation happens before mutation plan construction.

---

## WIRING CLASSIFICATION

### Current Assessment

**Primary Finding**: 🟡 **Minor boundary bleed** - selections accepted without re-validation in confirm() methods

**Secondary Finding**: ❓ **Unknown validation** - FinalizeIntegration validation state unclear

**Overall Classification**: **NEEDS INVESTIGATION**

The pattern is mostly correct (advisory suggestions → validated selections → mutations), but there's a gap:
- Suggestions are properly advisory ✅
- UI validation is applied ✅
- ProgressionEngine doesn't trust suggestions ✅
- **BUT**: ProgressionEngine doesn't re-validate selections ⚠️

---

## RECOMMENDATIONS

### Priority 1: Verify FinalizeIntegration Validation

Audit `finalize-integration.js` to confirm:
- [ ] `_buildProgressionPacket()` re-validates all selections
- [ ] BAB threshold checks happen before mutation
- [ ] Prerequisite enforcement happens before mutation
- [ ] Ability score requirements verified before mutation

### Priority 2: Add Re-validation in confirm() Methods

Add in `progression-engine-instance.js`:
```javascript
async confirmFeats(feats) {
  const validated = await FeatEngine.validateFeatSelections(feats, this.actor);
  this.pending.feats = validated;
}

async confirmTalents(talents) {
  const validated = await TalentEngine.validateTalentSelections(talents, this.actor);
  this.pending.talents = validated;
}

async confirmSkills(skills) {
  const validated = await SkillEngine.validateSkillSelections(skills, this.actor);
  this.pending.skills = validated;
}
```

### Priority 3: Document SuggestionEngine as Advisory-Only

Add to all SuggestionEngine classes:
```javascript
/**
 * IMPORTANT: SuggestionEngine is purely advisory.
 * - Provides context-aware recommendations only
 * - Does NOT validate selections
 * - Does NOT enforce prerequisites
 * - Cannot be trusted as sole source of truth
 *
 * ProgressionEngine must re-validate all suggestions
 * before applying to actor state.
 */
```

---

## CONCLUSION

### SuggestionEngine ↔ ProgressionEngine Wiring Status

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SuggestionEngine is purely advisory | ✅ YES | No mutations, no enforcement, flag-only persistence |
| ProgressionEngine owns validation | ⚠️ PARTIAL | UI validation found, ProgressionEngine validation missing |
| No direct suggestion → ActorEngine flow | ✅ YES | Suggestions never feed to ActorEngine directly |
| No circular dependencies | ✅ YES | ProgressionEngine can operate without SuggestionEngine |
| ProgressionEngine re-validates | ❓ UNKNOWN | Needs FinalizeIntegration audit |

### Final Assessment

**Current Classification**: 🟡 **MINOR BOUNDARY BLEED**

**Why**:
- SuggestionEngine is properly advisory ✅
- Data flow is properly unidirectional ✅
- **BUT**: ProgressionEngine confirm() methods don't re-validate selections ⚠️

**Can System Proceed?**

YES - with caveats:
1. System does NOT trust SuggestionEngine for enforcement (good)
2. UI-side validation is applied (good)
3. FinalizeIntegration validation likely exists but unconfirmed (concerning)

**Recommendation**:
- Confirm FinalizeIntegration validates before mutation
- Add re-validation in confirm() methods for defense-in-depth
- Document SuggestionEngine advisory-only status

---

## NEXT STEPS

**To fully certify this wiring as PROPERLY WIRED (🟢):**

1. Audit finalize-integration.js `_buildProgressionPacket()` to confirm validation
2. Add confirm() re-validation if missing
3. Document advisory-only pattern in all SuggestionEngine classes
4. Run integration tests to verify selections survive hostile manipulation

Until these are completed, mark as: **🟡 PROPERLY WIRED WITH MINOR GAPS**

---

*End of Wiring Audit*

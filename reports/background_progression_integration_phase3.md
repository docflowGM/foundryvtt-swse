# Background Actor Materialization - Phase 3 Implementation Report

**Date**: April 2026  
**Phase**: 3 - Actor State Materialization  
**Status**: COMPLETE  
**Scope**: Materialize Background Grant Ledger and pending context into durable actor gameplay state

---

## 1. Executive Summary

Phase 3 implements canonical background materialization, converting the Background Grant Ledger (Phase 1) and Pending Background Context (Phase 2) into durable actor state. This is the final integration point where background mechanical effects become part of the character's canonical gameplay state.

**Key Achievements:**
- Created canonical background materialization helper (`apply-canonical-backgrounds-to-actor.js`)
- Integrated materialization into ProgressionFinalizer (Phase 3 lifecycle)
- Ensured idempotent application (safe to reapply without stacking duplicates)
- Full support for single and multi-background modes
- Proper handling of RAW choice-based skill grants vs. house rule auto-grants
- Complete skill bonus materialization (Occupation +2 untrained competence)
- Durable storage of all background-derived mechanical effects

---

## 2. Architecture Overview

### 2.1 Materialization Pipeline

```
Phase 2: Pending Background Context
         (ledger, pending choices, languages, bonuses)
                    ↓
          ProgressionFinalizer._compileMutationPlan()
         (reads draftSelections.pendingBackgroundContext)
                    ↓
       applyCanonicalBackgroundsToActor()
      (converts to durable actor mutations)
                    ↓
           ActorEngine.updateActor()
         (applies mutations to actor document)
                    ↓
     Durable Actor State (gameplay-ready)
  (system.*, flags.swse.background*)
```

### 2.2 Materialization Phases

The `applyCanonicalBackgroundsToActor()` function executes 7 distinct materialization phases:

1. **Identity Materialization** - Background names in display fields (profession, planetOfOrigin, event)
2. **Class Skills Materialization** - Class skill expansions (respecting choices and house rules)
3. **Languages Materialization** - Fixed languages and entitlements
4. **Skill Bonuses Materialization** - Occupation +2 untrained competence bonuses
5. **Passive Effects Materialization** - Background abilities/features
6. **Ledger Storage Materialization** - Canonical ledger for runtime authority
7. **Idempotence Verification** - Prevent duplicate mutations on reapply

### 2.3 Actor Schema Extensions

The following fields are added/extended for background storage:

**System Fields:**
```javascript
system.background          // string - background name (single mode)
system.profession          // string - Occupation category background name
system.planetOfOrigin      // string - Planet category background name
system.event               // string - Event category background name
```

**Flag Fields (flags.swse):**
```javascript
flags.swse.backgroundLedger                // object - canonical Background Grant Ledger
flags.swse.backgroundMode                  // string - 'single' or 'multi'
flags.swse.backgroundSelectedIds           // array - selected background IDs
flags.swse.backgroundClassSkills           // array - class skills from backgrounds
flags.swse.backgroundClassSkillChoices     // array - pending skill choices for resolution
flags.swse.backgroundLanguages             // array - fixed granted languages
flags.swse.backgroundLanguageEntitlements  // array - language selection entitlements
flags.swse.backgroundBonuses               // object - bonuses {untrained, flat, conditional}
flags.swse.occupationUntrainedBonuses      // array - +2 competence for Occupation skills
flags.swse.backgroundPassiveEffects        // array - passive abilities/features
```

---

## 3. Implementation Details

### 3.1 New File: `apply-canonical-backgrounds-to-actor.js`

**Location:** `/scripts/engine/progression/helpers/apply-canonical-backgrounds-to-actor.js`

**Purpose:** Canonical background materialization entry point, following the Phase 3 species pattern

**Primary Export:** 
```javascript
export async function applyCanonicalBackgroundsToActor(actor, pendingContext)
```

**Key Functions:**
- `applyCanonicalBackgroundsToActor()` - Main materialization entry point
- `_materializeBackgroundIdentity()` - Store background names in category-specific fields
- `_materializeClassSkills()` - Extract and store class skill expansions
- `_materializeLanguages()` - Store fixed languages and entitlements
- `_materializeSkillBonuses()` - Extract and store skill bonuses (Occupation +2)
- `_materializePassiveEffects()` - Store passive abilities/features
- `_materializeLedgerStorage()` - Store canonical ledger for runtime authority
- `_ensureIdempotence()` - Prevent duplicate mutations on reapply

**Contract:**
- **Input:** Actor + PendingBackgroundContext (from Phase 2)
- **Output:** Structured mutations object with system and flags fields
- **Safety:** Idempotent (safe to call repeatedly without stacking)
- **Authority:** Uses ledger/context as single source of truth (no re-derivation)

### 3.2 Modified File: `progression-finalizer.js`

**Changes:**
1. Added import for background materialization helper
2. Read `pendingBackgroundContext` from draftSelections
3. Added Phase 3 background materialization section after species
4. Merges background mutations into finalization mutation plan

**Code Pattern:**
```javascript
// Phase 3: Canonical background materialization
if (pendingBackgroundContext) {
  const materialization = await applyCanonicalBackgroundsToActor(actor, pendingBackgroundContext);
  if (materialization.success) {
    const mutations = materialization.mutations;
    // Merge into set
    for (const [key, value] of Object.entries(mutations)) {
      if (key.startsWith('system.') || key.startsWith('flags.')) {
        set[key] = value;
      }
    }
  }
}
```

**Integration Point:** Runs after species materialization, before attributes/languages in legacy order

### 3.3 Modified File: `background-step.js`

**Changes:**
1. Added commit of `pendingBackgroundContext` to draftSelections
2. Now stores context in both session and draftSelections for accessibility

**Code Pattern:**
```javascript
// Commit the pending background context for Phase 3 materialization
await this._commitNormalized(shell, 'pendingBackgroundContext', pendingBackgroundContext);
```

**Ensures:** ProgressionFinalizer can access context during mutation compilation

---

## 4. Materialization Mechanics

### 4.1 Class Skills Materialization

**RAW Behavior (Default):**
- Event: Player chooses 1 skill (pending resolution)
- Occupation: Player chooses 1 skill (pending resolution)
- Homeworld: Player chooses 2 skills (pending resolution)
- Selected skills stored in pending for Skills step to resolve

**House Rule Behavior (backgroundSkillGrantMode = 'grant_all_listed_skills'):**
- Event: Auto-grants all listed relevant skills as class skills
- Occupation: Auto-grants all listed relevant skills as class skills
- Homeworld: Auto-grants all listed relevant skills as class skills
- All resolved skills materialized directly

**Storage:**
- `flags.swse.backgroundClassSkills` - Immediately applied skills (house rule only)
- `flags.swse.backgroundClassSkillChoices` - Pending choices for Skills step

### 4.2 Occupation Dual-Effect Handling

Occupation backgrounds have two separate effects:

1. **Skill Choice Effect:**
   - Player chooses 1 skill to add as class skill
   - Stored as pending choice in `backgroundClassSkillChoices`

2. **+2 Untrained Competence Effect:**
   - Always applied to ALL relevant skills from Occupation
   - Independent of which skill player chose
   - Stored in `flags.swse.occupationUntrainedBonuses`
   - Structure: `{value: 2, applicableSkills: [...], type: 'untrained_competence'}`

**Materialization Ensures:**
- Occupation bonus applies regardless of pending choice status
- Bonus applies to ALL relevant Occupation skills (not just chosen one)
- Safe to reapply without stacking the +2

### 4.3 Multi-Background Mode Handling

**Mode Detection:**
- Single: 1 background selected
- Multi: 2-3 backgrounds selected (house rule dependent)

**Typed Storage:**
- Event backgrounds → `system.event`
- Occupation backgrounds → `system.profession`
- Planet backgrounds → `system.planetOfOrigin`
- Generic fallback → `system.background`

**Set Union Stacking:**
- Class skills merged via Set (no duplicates)
- Languages merged additively
- Bonuses collected (each background's bonuses independently tracked)
- Passive effects collected as array

**Idempotence:**
- Tracks `backgroundMode` and `backgroundSelectedIds`
- Skips duplicate skill mutation if same backgrounds reapplied
- Overwrites old background state if selection changes

### 4.4 Idempotence Implementation

**Prevention Strategy:**
1. Compare `flags.swse.backgroundMode` and `flags.swse.backgroundSelectedIds` with new context
2. If identical → skip class skill mutations (already materialized)
3. If different → clear old state and apply new mutations
4. Ledger always overwritten (single source of truth)

**Safety Guarantees:**
- +2 competence bonus not duplicated on reapply
- Class skills not duplicated on reapply
- Languages not duplicated on reapply
- Ledger always reflects current authority (single, auditable state)

---

## 5. Validation Cases

### Case 1: Single Background (Event)
```javascript
Input: {
  selectedIds: ['scholar-event'],
  selectedBackgrounds: [{id: 'scholar-event', name: 'Scholar', category: 'event', ...}],
  classSkillChoices: [{sourceBackgroundId: 'scholar-event', allowedSkills: ['Knowledge (Any)', 'Research'], ...}],
  languages: {fixed: [], entitlements: []},
  bonuses: {untrained: []},
  ...
}

Expected Output Mutations:
{
  'system.event': 'Scholar',
  'flags.swse.backgroundMode': 'single',
  'flags.swse.backgroundSelectedIds': ['scholar-event'],
  'flags.swse.backgroundClassSkillChoices': [...],
  'flags.swse.backgroundLedger': {...}
}
```

### Case 2: Multi-Background (Event + Occupation + Planet)
```javascript
Input: {
  selectedIds: ['soldier-event', 'officer-occupation', 'coruscant-planet'],
  multiMode: true,
  classSkillChoices: [
    {sourceBackgroundId: 'soldier-event', allowedSkills: ['Acrobatics', 'Athletics'], quantity: 1},
    {sourceBackgroundId: 'officer-occupation', allowedSkills: ['Persuasion', 'Deception'], quantity: 1, 
     occupationUntrainedBonus: {...}},
    {sourceBackgroundId: 'coruscant-planet', allowedSkills: ['Knowledge (Galactic Lore)', 'Sense Motive'], quantity: 2}
  ],
  languages: {fixed: ['High Galactic'], entitlements: []},
  ...
}

Expected Output Mutations:
{
  'system.event': 'Soldier Event',
  'system.profession': 'Officer',
  'system.planetOfOrigin': 'Coruscant',
  'flags.swse.backgroundMode': 'multi',
  'flags.swse.backgroundSelectedIds': ['soldier-event', 'officer-occupation', 'coruscant-planet'],
  'flags.swse.backgroundClassSkillChoices': [...],
  'flags.swse.backgroundLanguages': ['High Galactic'],
  'flags.swse.occupationUntrainedBonuses': [{value: 2, applicableSkills: [...], type: 'untrained_competence'}],
  'flags.swse.backgroundLedger': {...}
}
```

### Case 3: House Rule Auto-Grant (backgroundSkillGrantMode = 'grant_all_listed_skills')
```javascript
Input: {
  selectedIds: ['noble-occupation'],
  classSkillChoices: [{
    sourceBackgroundId: 'noble-occupation',
    allowedSkills: ['Persuasion', 'Deception', 'Insight'],
    resolved: ['Persuasion', 'Deception', 'Insight'],
    isAutoResolved: true,
    occupationUntrainedBonus: {...}
  }],
  ...
}

Expected Output Mutations:
{
  'system.profession': 'Noble',
  'flags.swse.backgroundClassSkills': ['Persuasion', 'Deception', 'Insight'],
  'flags.swse.occupationUntrainedBonuses': [{value: 2, applicableSkills: [...]}],
  'flags.swse.backgroundLedger': {...}
}
```

### Case 4: Duplicate Language Overlap (Set Union)
```javascript
Input: {
  selectedIds: ['human-planet', 'trader-occupation'],
  languages: {
    fixed: ['Basic', 'High Galactic'],  // From Homeworld
    entitlements: []
  },
  ...
}

Expected Output Mutations:
{
  'flags.swse.backgroundLanguages': ['Basic', 'High Galactic'],
  // No duplication, even if both backgrounds grant same language
  'flags.swse.backgroundLedger': {...}
}
```

### Case 5: Reapplication (Idempotence)
```javascript
// Actor already has backgrounds materialized
actor.flags.swse.backgroundSelectedIds = ['scholar-event']
actor.flags.swse.backgroundMode = 'single'

// User opens progression again with same selection
Input: {
  selectedIds: ['scholar-event'],
  selectedBackgrounds: [...same...]
}

Expected: Idempotence check prevents duplicate skill mutations
Output: {
  // Identity fields updated
  'system.event': 'Scholar',
  'flags.swse.backgroundLedger': {...}, // Always overwritten
  // But class skill mutations skipped (already materialized)
}
```

### Case 6: Background Switch (Reconciliation)
```javascript
// Actor has old Event background materialized
actor.flags.swse.backgroundSelectedIds = ['pirate-event']
actor.system.event = 'Pirate'

// User switches to different Event background
Input: {
  selectedIds: ['knight-event'],
  selectedBackgrounds: [{...different background...}]
}

Expected: Old state cleared, new state applied
Output: {
  'system.event': 'Knight',  // Updated
  'flags.swse.backgroundSelectedIds': ['knight-event'],  // Updated
  'flags.swse.backgroundClassSkillChoices': [...new choices...],
  'flags.swse.backgroundLedger': {...new ledger...}
}
```

### Case 7: Compatibility with Legacy Code
```javascript
// Legacy code expects system.background (generic field)
// Single-background mode
Input: {
  selectedIds: ['scholar-event'],
  multiMode: false
}

Expected: 
{
  'system.background': 'Scholar',  // Generic fallback
  'system.event': 'Scholar',       // Category-specific
  'flags.swse.backgroundMode': 'single'
}

// Multi-background mode
Input: {
  selectedIds: ['soldier-event', 'officer-occupation', 'coruscant-planet'],
  multiMode: true
}

Expected:
{
  // No generic system.background (ambiguous in multi-mode)
  'system.event': 'Soldier Event',
  'system.profession': 'Officer',
  'system.planetOfOrigin': 'Coruscant',
  'flags.swse.backgroundMode': 'multi'
}
```

---

## 6. Files Changed

### New Files
- `scripts/engine/progression/helpers/apply-canonical-backgrounds-to-actor.js` (290 lines)

### Modified Files
1. **scripts/apps/progression-framework/shell/progression-finalizer.js**
   - Added import for background materialization
   - Added `pendingBackgroundContext` variable read
   - Added Phase 3 background materialization section (30 lines)

2. **scripts/apps/progression-framework/steps/background-step.js**
   - Added commit of `pendingBackgroundContext` to draftSelections (1 line)

### Files NOT Changed (Backward Compatible)
- Scripts reading backgrounds can continue using system.background (legacy fallback still supported)
- Sheet rendering uses system.profession/planetOfOrigin/event (pre-populated)
- Language step continues to work (languages materialized to flags.swse.backgroundLanguages)
- Skills step can access pending choices from flags.swse.backgroundClassSkillChoices

---

## 7. Data Flow Summary

### Background-to-Actor Journey

```
PHASE 1 (Audit & Design)
├─ 80 backgrounds catalogued
├─ Normalized schema designed
└─ Ledger builder created

PHASE 2 (Progression Integration)
├─ Background selection creates pending context
├─ Ledger built from selections
├─ Pending choices created (RAW or auto-grant)
├─ Languages extracted
└─ Bonuses captured

PHASE 3 (Actor Materialization)  ← YOU ARE HERE
├─ Pending context read from draftSelections
├─ Materialization helper processes context
├─ 7 materialization phases execute
│  ├─ Identity (names in category fields)
│  ├─ Class skills (raw or auto-grant)
│  ├─ Languages (fixed and entitlements)
│  ├─ Bonuses (Occupation +2)
│  ├─ Passive effects
│  ├─ Ledger storage
│  └─ Idempotence verification
├─ Mutations merged into finalization plan
└─ ActorEngine applies to actor document

RUNTIME (Phase 4+)
├─ Sheet reads system.profession/planetOfOrigin/event
├─ Skill calculators consume occupationUntrainedBonuses
├─ Language step accesses backgroundLanguages
├─ Passive effects registered
└─ Ledger available for re-derivation/audit
```

---

## 8. Integration Points

### 8.1 ProgressionFinalizer Integration
- Reads `pendingBackgroundContext` from draftSelections
- Calls `applyCanonicalBackgroundsToActor()`
- Merges mutations into finalization mutation plan
- Executes after species, before attributes in mutation order

### 8.2 Background Step Integration
- Commits `pendingBackgroundContext` to draftSelections
- Makes context available to ProgressionFinalizer
- Maintains backward compatibility with legacy committedSelections

### 8.3 Future Step Integration (Phase 4+)
- **Skills Step**: Accesses `flags.swse.backgroundClassSkillChoices` for UI rendering
- **Languages Step**: Accesses `flags.swse.backgroundLanguages` for display
- **Summary Step**: Reads all flags for background review
- **Sheet Rendering**: Uses system.profession/planetOfOrigin/event for display
- **Skill Calculators**: Access `flags.swse.occupationUntrainedBonuses` for +2 competence

---

## 9. Error Handling

The materialization helper implements robust error handling:

```javascript
- No actor: Returns {success: false, error: 'No actor provided'}
- Invalid context: Returns {success: false, error: 'Invalid pending background context'}
- Exception caught: Logs error, returns {success: false, error: message}
```

ProgressionFinalizer handles materialization failure:
```javascript
if (materialization.success) {
  // Merge mutations
} else {
  swseLogger.warn('[ProgressionFinalizer] Background materialization failed:', materialization.error);
  // Continues without background mutations (fallback to legacy handling)
}
```

---

## 10. Testing Recommendations

### Unit Tests
1. Test each materialization phase individually
2. Test idempotence (same input, same output twice)
3. Test set union logic for skills/languages
4. Test Occupation dual-effect handling
5. Test house rule auto-grant mode

### Integration Tests
1. Create character with single Event background
2. Create character with multi-background (Event+Occupation+Planet)
3. Create character with auto-grant house rule enabled
4. Reapply backgrounds (idempotence test)
5. Switch backgrounds (reconciliation test)

### Gameplay Tests
1. Verify +2 competence bonus applies to all Occupation skills
2. Verify class skills expand when materialized
3. Verify languages appear in language list
4. Verify passive effects/features are registered
5. Verify sheet displays profession/planetOfOrigin/event correctly

---

## 11. Phase 4 Outlook (Future Work)

Phase 4 will handle sheet/runtime integration:

1. **Sheet Integration**
   - Display background-derived class skills prominently
   - Show Occupation +2 competence bonuses
   - Render background languages in language section

2. **Runtime Mechanics**
   - Skill calculators consume occupationUntrainedBonuses
   - Language system uses backgroundLanguages
   - Passive effects trigger in appropriate contexts

3. **Choice Resolution**
   - Skills step resolves pending skill choices
   - Updates flags.swse.backgroundClassSkills with player selections
   - Ensures no duplicate stacking with class-granted skills

4. **Validation & Audit**
   - Ledger available for runtime verification
   - Audit trail maintained from selection → materialization → gameplay
   - Conflict detection (e.g., same skill granted multiple ways)

---

## 12. Key Design Decisions

### Decision 1: Separate Identity Fields per Category
- **Rationale**: Sheet already has system.profession, system.planetOfOrigin, system.event fields
- **Benefit**: Maintains backward compatibility, supports multi-background display
- **Trade-off**: Requires category-aware code to display full background state

### Decision 2: Pending Choices in Flags, Not Resolved in Actor Skills
- **Rationale**: RAW requires player choice; don't assume what they'll choose
- **Benefit**: Preserves choice integrity until Skills step resolution
- **Trade-off**: Requires additional UI/logic in Skills step for resolution

### Decision 3: Occupation Dual-Effect as Separate Flag
- **Rationale**: +2 competence is independent of skill choice; always applies
- **Benefit**: Clean separation of concerns; easy for skill calculators to consume
- **Trade-off**: Requires awareness of occupationUntrainedBonuses in skill calculation code

### Decision 4: Ledger Storage in Flags
- **Rationale**: Preserves Phase 1 SSOT for runtime reference/audit
- **Benefit**: Single source of truth always available; full re-derivation possible
- **Trade-off**: Slightly larger actor document (but justified by authority/auditability)

### Decision 5: Idempotence via ID Comparison
- **Rationale**: Check what backgrounds are actually selected, not just re-apply blindly
- **Benefit**: Safe to call repeatedly; prevents accidental duplication
- **Trade-off**: Requires tracking selected IDs (minor storage overhead)

---

## 13. Known Limitations & Future Enhancements

### Current Limitations
1. **Passive Effects**: Stored as-is, not yet converted to mechanics (Phase 4+ work)
2. **Skill Choice Resolution**: Pending choices require Skills step to resolve (not auto-applied)
3. **Language Entitlements**: Stored but not yet consumed by Language step (Phase 4+ work)
4. **Conditional Bonuses**: Collected but not yet evaluated at runtime (Phase 4+ work)

### Future Enhancements
1. **ActiveEffect Integration**: Convert passive effects to system ActiveEffects
2. **Prerequisite Checking**: Validate bonus/effect eligibility at runtime
3. **Conflict Resolution**: Handle duplicate grants from multiple sources
4. **Audit Trail**: Full history of background selections → materialization path
5. **Mobile Display**: Responsive rendering of multi-background info
6. **Bulk Import**: Support for external background data sources

---

## 14. Conclusion

Phase 3 successfully materializes backgrounds into durable actor state, completing the journey from background selection (Phase 2) to gameplay-ready character data. The implementation follows established patterns from species materialization, ensures idempotent safety, and maintains full backward compatibility with legacy code paths.

Key outcomes:
- ✅ Canonical materialization helper created and integrated
- ✅ Full support for single and multi-background modes
- ✅ Proper handling of RAW choices and house rule auto-grants
- ✅ Idempotent application (safe to reapply)
- ✅ Backward compatible with legacy code
- ✅ Complete data lineage from ledger → mutations → actor state

The foundation is ready for Phase 4 (sheet/runtime integration) where these materialized backgrounds become active gameplay mechanics.

---

## Appendix: Code Examples

### Example 1: Materialization in Action
```javascript
// Background Step collects selections
const pendingBackgroundContext = await buildPendingBackgroundContext(
  ['scholar-event', 'officer-occupation', 'coruscant-planet'],
  {multiMode: true}
);

// Commits to draftSelections
await this._commitNormalized(shell, 'pendingBackgroundContext', pendingBackgroundContext);

// ProgressionFinalizer reads it back
const pendingBackgroundContext = selections.pendingBackgroundContext;

// Calls materialization
const result = await applyCanonicalBackgroundsToActor(actor, pendingBackgroundContext);

// Merges mutations into finalization plan
for (const [key, value] of Object.entries(result.mutations)) {
  if (key.startsWith('system.') || key.startsWith('flags.')) {
    set[key] = value;
  }
}

// ActorEngine applies to actor document
await ActorEngine.updateActor(actor, {set});
```

### Example 2: Reading Materialized State
```javascript
// In Skills step or other consumers
const classSkillChoices = actor.flags.swse.backgroundClassSkillChoices || [];
const autoGrantedSkills = actor.flags.swse.backgroundClassSkills || [];
const occupationBonuses = actor.flags.swse.occupationUntrainedBonuses || [];
const ledger = actor.flags.swse.backgroundLedger;

// Use for UI rendering or calculation
for (const choice of classSkillChoices) {
  if (!choice.isAutoResolved) {
    // Show UI for player to choose skill
  }
}

for (const bonus of occupationBonuses) {
  // Apply +2 to applicable skills
}
```

### Example 3: Idempotence Check
```javascript
function _ensureIdempotence(actor, pendingContext, proposedMutations) {
  const currentIds = actor.flags?.swse?.backgroundSelectedIds ?? [];
  const newIds = pendingContext.selectedIds || [];

  const idsMatch = currentIds.length === newIds.length &&
    currentIds.every(id => newIds.includes(id));

  if (idsMatch) {
    // Same backgrounds - skip skill duplication
    delete proposedMutations['flags.swse.backgroundClassSkills'];
    delete proposedMutations['flags.swse.occupationUntrainedBonuses'];
  }
  // Ledger always overwrites (single source of truth)
}
```

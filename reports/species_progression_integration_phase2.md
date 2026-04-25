# Species Progression Integration Phase 2 - Implementation Report

**Date:** April 24, 2026  
**Status:** ✅ IMPLEMENTATION COMPLETE - READY FOR TESTING  
**Scope:** Make progression engine consume Species Grant Ledger during character creation  
**Architecture:** Canonical pending species context bridge

---

## Executive Summary

Phase 2 implements the critical bridge between Phase 1's Species Grant Ledger and the character creation systems. The new **Pending Species Context Helper** (`build-pending-species-context.js`) serves as a canonical normalizer that transforms selected species into a fully-structured pending context consumable by:

- **Progression Framework** (modern system)
- **Legacy Chargen** (backward compatibility)
- **Prerequisite Checks** (species-dependent rules)
- **Future: Actor Grants** (Phase 3)

This phase ensures species transitions from identity-only display data into a real, capability-bearing source during character creation, while preserving all Phase 1 achievements (SSOT, ledger architecture, trait classification).

---

## Files Changed (4 Files)

### 1. **NEW: `scripts/engine/progression/helpers/build-pending-species-context.js`** (276 lines)

**Purpose:** Canonical bridge builder - transforms species selection into normalized pending context

**Key Exports:**
- `buildPendingSpeciesContext(actor, speciesIdentity, options)` - Async builder
  - Input: Species name, ID, or document
  - Output: Complete `PendingSpeciesContext` with identity, abilities, movements, traits, entitlements
  - Integrates Species Grant Ledger deterministically
  - Computes feats based on species + actorType + droid status

- `applyPendingSpeciesContext(targetSystem, context)` - Non-destructive applicator
  - Mutates characterData/system without persistence
  - Sets species identity, abilities, size, speed
  - Used by both progression and chargen

- `extractGrantsFromPendingSpecies(context)` - Grant extractor
  - Builds grants structure for progression engine
  - Separates feats, languages, skills, natural weapons

**Architecture:**
- Uses SpeciesGrantLedgerBuilder as authority
- Routes through SpeciesRegistry for resolution
- Computes entitlements deterministically
- Returns fully-structured `PendingSpeciesContext` typedef

**Schema (PendingSpeciesContext):**
```javascript
{
  identity: {id, name, source, doc},
  physical: {size, movements: {walk, swim, fly, hover, glide, burrow, climb}},
  abilities: {str, dex, con, int, wis, cha},
  traits: [], // Full classified ledger traits
  entitlements: {
    featsRequired,      // Computed from species + actorType + isDroid
    languages: [],      // From ledger
    skills: [],         // From ledger (if any)
    bonusSpeed: 0       // Movement bonus vs standard
  },
  ledger: {},          // Full Species Grant Ledger
  metadata: {createdAt, source: "progression"|"chargen", actorType}
}
```

### 2. **MODIFIED: `scripts/apps/progression-framework/steps/species-step.js`** (≈30 lines changed)

**Changes:**
1. Added import of `buildPendingSpeciesContext`
2. Updated `onItemCommitted()` (lines 594-650)
   - Now calls `buildPendingSpeciesContext()` before committing
   - Stores pending context in normalized species object
   - Logs entitlements and trait count for transparency
3. Updated `confirmNearHuman()` (lines 666-710)
   - Builds pending context for Near-Human species
   - Integrates Near-Human data with canonical path
   - Stores context in normalized species

**Flow:**
```
User commits species
  ↓
onItemCommitted() called with species ID
  ↓
Resolve species entry via registry
  ↓
buildPendingSpeciesContext(actor, entry) ← PHASE 2
  ↓
Pending context includes:
  - Ledger data
  - Computed entitlements (featsRequired, languages)
  - Trait classification
  ↓
Patch still built for compatibility
  ↓
normalizeSpecies() stores both patch AND pendingContext
  ↓
_commitNormalized() persists to session
```

**No breaking changes** - all existing flow preserved; pending context is additive.

### 3. **MODIFIED: `scripts/apps/progression-framework/steps/step-normalizers.js`** (1 line added)

**Change:**
- Updated `normalizeSpecies()` to accept and store `pendingContext` parameter
- Line 47: `pendingContext: raw.pendingContext || null,`

**Purpose:** Pass through pending context to progression session for downstream consumption

### 4. **MODIFIED: `scripts/apps/chargen/chargen-species.js`** (≈40 lines changed)

**Changes:**
1. Added import of `buildPendingSpeciesContext` and `applyPendingSpeciesContext`
2. Updated `_onSelectSpecies()` (lines 303-365)
   - Calls `buildPendingSpeciesContext()` after finding species document
   - Calls `applyPendingSpeciesContext()` to mutate characterData
   - Falls back to legacy `_applySpeciesData()` if ledger build fails
   - Maintains backward compatibility

3. Updated `_onConfirmNearHuman()` (lines 1581-1655)
   - Builds pending context for Near-Human
   - Applies to characterData before storing nearHumanData
   - Preserves all existing Near-Human trait logic

**Flow:**
```
User selects species in chargen
  ↓
_onSelectSpecies() finds document
  ↓
buildPendingSpeciesContext(actor, speciesDoc.name) ← PHASE 2
  ↓
applyPendingSpeciesContext(this.characterData, context)
  ↓
characterData now has:
  - Canonical species identity
  - Ability modifiers from ledger
  - Size and movement data
  - Computed feats required
  - Languages and grants
  ↓
Legacy _applySpeciesData() skipped if ledger succeeds
  ↓
Patch still applied for additional entitlements
  ↓
Character data ready for next step
```

**Backward Compatibility:**
- If `buildPendingSpeciesContext()` fails, falls back to legacy `_applySpeciesData()`
- All existing chargen behavior preserved
- Non-invasive integration

---

## Key Achievements

### ✅ Phase 1 Preservation
- Species Grant Ledger remains canonical authority
- SSOT strategy (compendium identity + traits JSON mechanics) preserved
- Trait classification fully available to progression

### ✅ Progression Integration
- Species-step.js now consumes ledger deterministically
- Pending context available throughout progression session
- Entitlements computed canonically (feats, languages, bonuses)

### ✅ Legacy Chargen Compatibility
- Existing chargen updated to use ledger when available
- Fallback to legacy path if ledger unavailable
- Zero disruption to current chargen workflows

### ✅ Entitlements Computation
- `computeStartingFeatsRequired()` now called via pending context
- Species + ActorType (PC vs NPC) + Droid status properly handled
- Human bonus feat logic centralized in canonical path

### ✅ Pending State Visibility
- Species-dependent prerequisite checks can now see:
  - Pending species abilities
  - Pending languages (for Jedi membership-type checks)
  - Pending traits (for class requirement visibility)
- No actor mutation needed for visibility during progression

### ✅ Trait Integration Ready
- Full ledger available in pending context
- Traits classified (identity, bonus, grant, reroll, conditional, activated, unresolved)
- Grant extraction logic prepared for Phase 3 actor grants

---

## Implementation Details

### Pending Context Builder Architecture

```
buildPendingSpeciesContext(actor, speciesIdentity, options)
  │
  ├─→ _resolveSpeciesEntry(speciesIdentity)
  │    Accepts: name string, ID string, document object
  │    Uses: SpeciesRegistry for O(1) lookups
  │    Returns: Stable registry entry
  │
  ├─→ SpeciesGrantLedgerBuilder.build(speciesEntry)
  │    Authority: Species Grant Ledger
  │    Input: Registry entry
  │    Output: Fully normalized ledger with traits, abilities, movements
  │
  ├─→ _extractEntitlements(speciesName, actorType, isDroid, ledger)
  │    Computes: featsRequired (via computeStartingFeatsRequired)
  │    Extracts: languages, skills, bonusSpeed
  │    Uses: Ledger as data source
  │
  └─→ Return PendingSpeciesContext
       ├─ identity: {id, name, source, doc}
       ├─ physical: {size, movements}
       ├─ abilities: {str, dex, con, int, wis, cha}
       ├─ traits: [] (full ledger traits)
       ├─ entitlements: {featsRequired, languages, skills, bonusSpeed}
       ├─ ledger: {} (full Species Grant Ledger)
       └─ metadata: {createdAt, source, actorType}
```

### Integration Points

**Progression Framework:**
```
species-step.js
  → onItemCommitted()
    → buildPendingSpeciesContext() ← NEW PHASE 2
    → normalizeSpecies() [now includes pendingContext]
    → _commitNormalized() to shell.buildIntent
```

**Legacy Chargen:**
```
chargen-species.js
  → _onSelectSpecies()
    → buildPendingSpeciesContext() ← NEW PHASE 2
    → applyPendingSpeciesContext() ← NEW PHASE 2
    → this.characterData mutated with ledger data
```

**Prerequisite Visibility (Phase 3+ Ready):**
```
prerequisite-checker.js
  → checkPrestigeClassPrerequisites()
    → Check pending.species (available from buildIntent)
    → Access pending.species.languages, abilities, traits
    → No actor mutation needed for visibility
```

---

## Validation Test Cases

### Test 1: Standard Species (Progression Framework)
**Scenario:** Character selects Human in progression framework
- Step: SpeciesStep.onItemCommitted('human')
- Expected:
  - ✓ buildPendingSpeciesContext() succeeds
  - ✓ Abilities: {str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0}
  - ✓ entitlements.featsRequired = 2 (Human PC)
  - ✓ Pending context stored in normalized species
  - ✓ Shell.buildIntent has species data available

**Validation:** Check progression session holds full context

### Test 2: Non-Human PC (Progression Framework)
**Scenario:** Character selects Bothan (PC)
- Step: SpeciesStep.onItemCommitted('bothan')
- Expected:
  - ✓ buildPendingSpeciesContext() succeeds
  - ✓ Abilities include Bothan bonuses
  - ✓ entitlements.featsRequired = 1 (Non-Human PC)
  - ✓ Languages includes Bothan language (if in ledger)
  - ✓ Traits available for prerequisite visibility

**Validation:** entitlements.featsRequired correct per SWSE RAW

### Test 3: NPC Human (Progression Framework)
**Scenario:** Character selects Human (NPC)
- Step: SpeciesStep.onItemCommitted('human') with actor.type = 'npc'
- Expected:
  - ✓ buildPendingSpeciesContext() succeeds
  - ✓ entitlements.featsRequired = 3 (Human NPC)
  - ✓ All other data same as Test 1

**Validation:** NPC bonuses correct (3 feats for human, 2 for others)

### Test 4: Droid (Progression Framework)
**Scenario:** Character selects custom droid in progression
- Step: SpeciesStep.onItemCommitted('droid') with isDroid = true
- Expected:
  - ✓ buildPendingSpeciesContext() succeeds
  - ✓ entitlements.featsRequired = 0 (droids don't get starting feats)
  - ✓ Physical characteristics available

**Validation:** Droid special handling correct

### Test 5: Standard Species (Legacy Chargen)
**Scenario:** Character selects Twilek in legacy chargen
- Step: _onSelectSpecies() with dataset.species = 'Twilek'
- Expected:
  - ✓ buildPendingSpeciesContext() succeeds
  - ✓ applyPendingSpeciesContext() mutates characterData
  - ✓ this.characterData.species = 'Twilek'
  - ✓ this.characterData.abilities correctly populated
  - ✓ this.characterData.featsRequired set
  - ✓ Fallback to legacy _applySpeciesData() not called

**Validation:** Chargen character data fully populated from ledger

### Test 6: Near-Human (Both Systems)
**Scenario:** User confirms Near-Human with trait selection
- Progression: SpeciesStep.confirmNearHuman()
- Chargen: _onConfirmNearHuman()
- Expected:
  - ✓ buildPendingSpeciesContext('Near-Human') succeeds
  - ✓ Pending context treats Near-Human as Human for entitlements
  - ✓ nearHumanData stored alongside pending context
  - ✓ featsRequired = 2 (Near-Human is Human variant)
  - ✓ Ability adjustments from selected trait applied

**Validation:** Near-Human integration complete, entitlements correct

---

## Backward Compatibility

✅ **Full backward compatibility preserved:**

1. **Progression Framework:**
   - Existing `onItemCommitted()` flow unchanged (pendingContext is additive)
   - Patches still built and applied correctly
   - Shell state unchanged for other steps

2. **Legacy Chargen:**
   - Falls back to `_applySpeciesData()` if ledger unavailable
   - All existing character data fields still populated
   - No breaking changes to characterData schema

3. **Database/Actor:**
   - No actor mutations until confirmation
   - Pending state only in-memory during progression
   - Legacy chargen still produces same final actor

4. **Patches:**
   - Species patches still applied alongside pending context
   - No conflicts between patch and pending approaches
   - Complementary, not competing systems

---

## Outstanding Items (Deferred to Phase 3)

1. **Actor Grants Application** - Not in Phase 2 scope
   - Pending species context ready for Phase 3
   - Ledger traits will be materialized as actor items
   - `extractGrantsFromPendingSpecies()` helper prepared

2. **Sheet Rendering** - Not in Phase 2 scope
   - Pending traits visible in progression UI
   - Character sheet rendering deferred to Phase 3/4

3. **Follower Species Step** - Not updated in Phase 2
   - `scripts/apps/progression-framework/steps/follower-steps/follower-species-step.js`
   - Can follow same pattern as main species-step.js in future
   - Low priority: follows after main species-step establishes pattern

---

## Files Modified Summary

| File | Changes | Type |
|------|---------|------|
| `build-pending-species-context.js` | NEW (276 lines) | Core implementation |
| `species-step.js` (progression) | +30 lines | Integration |
| `step-normalizers.js` | +1 line | Data flow |
| `chargen-species.js` | +40 lines | Legacy bridge |
| **Total** | **~347 lines** | **4 files** |

---

## Architecture Diagrams

### Data Flow: Progression Framework

```
SpeciesRegistry
       ↓
species-step.js::onItemCommitted(id)
       ↓
_resolveSpeciesEntry(id) ←─ O(1) lookup
       ↓
buildPendingSpeciesContext(entry) ←─ NEW PHASE 2
       ├─→ SpeciesGrantLedgerBuilder.build()
       ├─→ Extract entitlements (feats, languages, bonuses)
       └─→ Return PendingSpeciesContext
       ↓
normalizeSpecies({pendingContext, ...}) ← NEW field
       ↓
_commitNormalized() to shell.buildIntent
       ↓
✓ Pending species available to all future steps
✓ Prerequisite checks can see species.languages, traits
✓ Phase 3 grants ready for extraction
```

### Data Flow: Legacy Chargen

```
this._packs.species
       ↓
_onSelectSpecies(speciesDoc)
       ↓
buildPendingSpeciesContext(speciesDoc.name) ←─ NEW PHASE 2
       ├─→ SpeciesGrantLedgerBuilder.build()
       └─→ Return PendingSpeciesContext
       ↓
applyPendingSpeciesContext(this.characterData) ←─ NEW PHASE 2
       ├─→ Set species identity, abilities, size, speed
       └─→ Set featsRequired, languages
       ↓
[Fallback to legacy _applySpeciesData() if needed]
       ↓
buildSpeciesAtomicPatch() [still applied for safety]
       ↓
✓ characterData fully populated from canonical ledger
✓ No actor mutations yet
✓ Ready for next chargen step
```

### Authority Hierarchy

```
Phase 1 SSOT
├─ Compendium (species identity)
├─ Traits JSON (trait mechanics)
└─ Species Grant Ledger (normalized runtime data)
   
Phase 2 Bridge
├─ Pending Species Context Builder
│  ├─ Resolves species → registry entry
│  ├─ Builds ledger via canonical builder
│  ├─ Computes entitlements
│  └─ Returns normalized context
│
└─ Distributed to:
   ├─ Progression Framework (shell.buildIntent)
   ├─ Legacy Chargen (this.characterData)
   └─ Prerequisite Checks (pending.species visibility)
```

---

## Success Criteria Met

✅ Species no longer identity-only display data  
✅ Progression engine consumes Species Grant Ledger  
✅ Legacy chargen bridges to canonical system  
✅ Entitlements computed canonically (feats, languages, bonuses)  
✅ Pending state supports species-dependent prerequisite visibility  
✅ Multi-movement and trait data preserved throughout  
✅ Natural weapons and grants ready for Phase 3  
✅ Full backward compatibility preserved  
✅ Phase 1 SSOT and trait classification fully leveraged  

---

## Implementation Status

**Phase 1 (Species SSOT):** ✅ COMPLETE  
**Phase 2 (Progression Integration):** ✅ COMPLETE  
**Phase 3 (Actor Grants):** ⏭️ QUEUED  
**Phase 4 (Sheet Rendering):** ⏭️ QUEUED  

---

## Next Steps (Phase 3)

When user approves, Phase 3 will:
1. Materialize species grants as actor items (feats, weapons, proficiencies)
2. Apply trait rerolls and conditional bonuses to actor
3. Integrate natural weapons into actor combat system
4. Update character sheet rendering for species data
5. Validate actor state matches pending species context

Phase 3 will use:
- `PendingSpeciesContext` from Phase 2 (already available)
- `SpeciesGrantLedgerBuilder` from Phase 1 (already canonical)
- New actor mutation helpers for trait application

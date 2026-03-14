# SWSE Follower System Architecture Audit Report

**Generated:** 2026-03-14
**Scope:** Follower pipeline from talent rules → persistent state → derived data → sheet rendering
**Status:** ⚠️ **ARCHITECTURAL GAP DETECTED** - Pipeline incomplete at sheet context layer

---

## Executive Summary

**Current Pipeline Status:**
```
Talent → Flags Storage → Hooks Management → Sheet Context
  ✅        ✅             ✅                 ❌ MISSING
```

**Finding:** The follower system is correctly architected up to persistence layer, but **the sheet context layer does not provide required data** to templates, causing silent rendering failures.

---

## PHASE 1: TALENT SOURCE DISCOVERY

### Follower-Granting Talents Identified

**Configuration File:** `scripts/engine/crew/follower-talent-config.js`

| Talent Name | Max Count | Template Choices | Additional Features | Status |
|-------------|-----------|-----------------|---------------------|--------|
| Reconnaissance Team Leader | 3 | aggressive, defensive, utility | Skill Training (Perception, Stealth) | ✅ Configured |
| Inspire Loyalty | 3 | aggressive, defensive, utility | Armor Proficiency Choice | ✅ Configured |

**Other Talents Mentioned (in mentor dialogues):**
- Leadership
- Beast Companion
- Droid Companion
- Squad Leader
- Followers (tag)

**Status:** ✅ Talent sources identified and configured

---

## PHASE 2: ACTOR DATA STORAGE

### Follower Data Location Map

**Primary Storage: Actor Flags**

```javascript
// Location: actor flags
actor.getFlag('foundryvtt-swse', 'followerSlots')

// Structure:
[
  {
    id: string,                    // Random ID for slot identity
    talentName: string,            // "Reconnaissance Team Leader"
    talentItemId: string,          // UUID of the talent item
    templateChoices: string[],     // ["aggressive", "defensive", "utility"]
    createdActorId: string | null, // UUID of created follower or null (empty slot)
    createdAt: number,             // Timestamp
    detachedAt?: number            // Timestamp if previously filled
  }
]
```

**Secondary Storage: Actor System**

```javascript
// Location: actor.system
actor.system.ownedActors

// Structure:
[
  {
    id: string,      // Actor ID
    name: string,    // Actor name
    type: string,    // "character", "npc", etc.
    // ... other properties
  }
]
```

**Pending Detachment Flag**

```javascript
// Location: actor flags
actor.getFlag('foundryvtt-swse', 'pendingFollowerDetachment')

// Structure:
{
  talentName: string,
  talentItemId: string,
  candidateActorIds: string[]
}
```

**Status:** ✅ Data storage locations identified

---

## PHASE 3: PASSIVE RULE INTEGRATION

### Rules Engine Implementation Status

**Talent Effect Engine:** `scripts/engine/talent/talent-effect-engine.js`
- Lines 1881-1923: Follower talent effects exist
- Handle follower-specific bonuses (speed, etc.)
- Reference: `if (!followerActor)` checks indicate follower actor handling

**Talent Normalizer Engine:** `scripts/engine/talent/TalentNormalizerEngine.js`
- Lines 27, 82, 133, 143: Tags for "Followers" detection
- Extracts follower-affecting talent metadata
- Status tracking: `followerAffecting: count`

**Follower Hooks:** `scripts/infrastructure/hooks/follower-hooks.js`
- createItem hook: Adds follower slots when talent acquired
- deleteItem hook: Removes follower slots when talent removed
- updateActor hook: Monitors level changes (comment suggests further processing needed)
- Provenance-safe cleanup: Removes granted items when follower detached

**Passive Modifier Engine:** Not yet integrated for follower effects
- Missing: FOLLOWER_SLOT, FOLLOWER_CAPACITY rules
- Would be ideal future architecture

**Status:** ⚠️ **PARTIAL** - Rules-driven slot creation works, but effects are manual

---

## PHASE 4: FOLLOWER ACTOR RELATIONSHIP

### Linkage Mechanism

**Primary Relationship:** Actor Flags
```javascript
// Line 21-25 (follower-hooks.js)
actor.getFlag('foundryvtt-swse', 'followerSlots')
// Each slot contains createdActorId that links to the follower actor
```

**Secondary Relationship:** System Data
```javascript
// Line 61, 63 (follower-hooks.js)
actor.system.ownedActors[]
// Array of {id, ...} entries for owned actors
```

**Lookup Mechanism:**
```javascript
// Template (character-sheet.hbs line 543)
{{#with (lookup ../ownedActorMap entry.id) as |actor|}}
  {{actor.name}}
{{/with}}
// ownedActorMap maps actor IDs to actor objects
```

**Status:** ✅ Relationship tracking implemented

---

## PHASE 5: SHEET CONTEXT EXPECTATIONS

### Template Data Requirements

**Template File:** `templates/actors/character/v2/character-sheet.hbs:470-564`

**Expected Context Variables:**

```javascript
// 1. Follower Talent Badges (Line 470)
followerTalentBadges: [
  {
    talentName: string,    // e.g., "Reconnaissance Team Leader"
    current: number,       // Currently filled slots for this talent
    max: number            // Maximum allowed slots for this talent
  }
]

// 2. Follower Slots (Line 480)
followerSlots: [
  {
    id: string,
    talentName: string,
    actor: {               // Populated from createdActorId lookup
      id: string,
      name: string,
      type: string
    } | null,             // null if slot is empty
    tokenImg: string,     // Image URL for token/portrait
    roleLabel: string,    // e.g., "Aggressive", "Defensive", "Utility"
    level: number,        // Follower level
    hp: {
      value: number,
      max: number
    },
    tags: string[],       // Template choice tags
    isLocked: boolean     // Slot creation locked?
  }
]

// 3. Owned Actor Map (Line 543)
ownedActorMap: {
  [actorId: string]: {
    id: string,
    name: string,
    type: string,
    img: string,
    system: { /* full system data */ }
  }
}
```

**Status:** 🔴 **ALL MISSING** - character-sheet.js _prepareContext does NOT provide these

---

## PHASE 6: DERIVED CALCULATION STATUS

### DerivedCalculator Integration

**File:** `scripts/actors/derived/derived-calculator.js`

**Current Scope:** HP, BAB, Defenses, Initiative, Level Split, Abilities, Skills, Encumbrance, Attacks

**Follower Data Computed:** ❌ **NO**
- DerivedCalculator lines 1-200+ scanned
- Zero references to follower, ownedActor, followerSlots
- Not in scope of current DerivedCalculator

**Missing Computations:**
```javascript
// Should compute:
derived.followers = {
  slots: [...],                  // Formatted slot array
  talentBadges: [...],           // Aggregated by talent
  totalCapacity: number,
  totalFilled: number,
  ownedActorMap: { ... }
}
```

**Status:** 🔴 **NOT IMPLEMENTED** - DerivedCalculator doesn't touch followers

---

## COMPARATIVE ARCHITECTURE: OTHER SHEETS

### Vehicle Sheet Implementation

**File:** `scripts/sheets/v2/vehicle-sheet.js:92-97`

```javascript
const ownedActorMap = {};
for (const entry of actor.system.ownedActors || []) {
  ownedActorMap[entry.id] = {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    img: entry.img,
    system: entry
  };
}

// In context return (line 172):
ownedActorMap
```

**Status:** ✅ **IMPLEMENTED** - Vehicle sheet DOES build ownedActorMap

### Droid Sheet Implementation

**File:** `scripts/sheets/v2/droid-sheet.js:79-84`

Same pattern as vehicle sheet.

**Status:** ✅ **IMPLEMENTED** - Droid sheet DOES build ownedActorMap

### Character Sheet Implementation

**File:** `scripts/sheets/v2/character-sheet.js`

**ownedActorMap:** ❌ NOT BUILT
**followerSlots:** ❌ NOT EXTRACTED
**followerTalentBadges:** ❌ NOT COMPUTED

**Status:** 🔴 **NOT IMPLEMENTED** - Character sheet missing all three

---

## ARCHITECTURAL FINDINGS

### Current State: Fragmented Pipeline

```
Talent Defines Slot
    ↓ [HOOKS]
Flags Store Slot Data
    ↓ [ACTOR.SYSTEM]
System.OwnedActors Tracks Relationships
    ↓ [SHEET CONTEXT] ❌ MISSING
Template Expects Formatted Data
    ↓ [RENDER]
⚠️ SILENT FAILURE: Templates reference undefined variables
```

### Root Cause

The follower system is **rules-driven at persistence level** ✅ but **UI-agnostic at presentation level** ❌

**Missing Bridge:** character-sheet.js `_prepareContext()` should:
1. Extract follower flags
2. Build ownedActorMap from system.ownedActors
3. Aggregate followerTalentBadges by talent name
4. Enrich slots with actor data and computed properties
5. Return all three structures in context

---

## IDEAL ARCHITECTURE (What Should Happen)

```
TALENT DEFINITION
  └─ Reconnaissance Team Leader, Inspire Loyalty

PASSIVE RULE (Future)
  └─ PassiveModifierEngine processes follower effects

ACTOR HOOKS (Current)
  └─ createItem → add followerSlots flag
  └─ deleteItem → remove followerSlots flag

ACTOR SYSTEM (Current)
  └─ system.ownedActors = [{id, name, type, img, system}]

SHEET CONTEXT (Missing)
  └─ character-sheet.js _prepareContext():
     └─ Extract flags
     └─ Build followerTalentBadges
     └─ Build followerSlots (enriched)
     └─ Build ownedActorMap
     └─ Return in context

TEMPLATE (Current - waiting for context)
  └─ {{followerTalentBadges}}
  └─ {{followerSlots}}
  └─ {{ownedActorMap}}
```

---

## CRITICAL ARCHITECTURAL GAPS

### Gap 1: Sheet Context Missing

**Issue:** character-sheet.js doesn't build followerSlots, followerTalentBadges, or ownedActorMap

**Impact:** Followers tab shows nothing (silent failure)

**Severity:** 🔴 CRITICAL

**Solution:** Add to _prepareContext():
```javascript
// Extract follower data from flags
const followerSlots = actor.getFlag('swse', 'followerSlots') || [];

// Get talent config
const { FOLLOWER_TALENT_CONFIG } = await import(...);

// Build badges (aggregate by talent)
const followerTalentBadges = [];
const seenTalents = new Set();
for (const slot of followerSlots) {
  if (!seenTalents.has(slot.talentName)) {
    seenTalents.add(slot.talentName);
    const cfg = FOLLOWER_TALENT_CONFIG[slot.talentName];
    const filled = followerSlots
      .filter(s => s.talentName === slot.talentName)
      .filter(s => !!s.createdActorId).length;

    followerTalentBadges.push({
      talentName: slot.talentName,
      current: filled,
      max: cfg?.maxCount ?? 0
    });
  }
}

// Build ownedActorMap (same as vehicle-sheet.js)
const ownedActorMap = {};
for (const entry of actor.system.ownedActors || []) {
  ownedActorMap[entry.id] = {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    img: entry.img,
    system: entry
  };
}

// Enrich followerSlots with actor data
const enrichedSlots = followerSlots.map(slot => {
  const actorData = slot.createdActorId ? ownedActorMap[slot.createdActorId] : null;
  return {
    ...slot,
    actor: actorData ? { id: actorData.id, name: actorData.name, type: actorData.type } : null,
    tokenImg: actorData?.img || '',
    roleLabel: slot.templateChoices[0] || 'Standard',
    level: actorData?.system.level || 1,
    hp: { value: actorData?.system.hp?.value || 0, max: actorData?.system.hp?.max || 1 },
    tags: slot.templateChoices,
    isLocked: false // Determine based on rules
  };
});

// Return in context
return {
  ...finalContext,
  followerSlots: enrichedSlots,
  followerTalentBadges,
  ownedActorMap
};
```

---

### Gap 2: DerivedCalculator Doesn't Own Follower Data

**Issue:** Follower computations aren't in DerivedCalculator (the authoritative rules engine)

**Impact:** No single source of truth for follower state

**Severity:** 🟠 MEDIUM (architectural cleanliness)

**Note:** Could be deferred - current approach of computing in _prepareContext is acceptable for sheet-level data

---

### Gap 3: Passive Modifier Engine Not Integrated

**Issue:** Follower effects are in TalentEffectEngine, not PassiveModifierEngine

**Impact:** No unified rules integration for follower mechanics

**Severity:** 🟠 MEDIUM (long-term maintainability)

**Note:** Future refactoring opportunity

---

## CORRECT OWNERSHIP MODEL

**Current Correct Ownership:**
- ✅ Talent Rules → define follower grants
- ✅ Hooks → maintain persistent state
- ✅ ActorFlags → store follower slots
- ✅ ActorSystem → store owned actors
- ❌ Sheet Context → **MISSING**
- ✅ Template → render from context

**Missing Bridge:** Sheet context layer needs to aggregate and format for presentation

---

## TEMPLATE EXPECTATIONS VERIFICATION

### Template References (character-sheet.hbs)

**Line 470:** `{{#if followerTalentBadges.length}}`
- **Expected Type:** Array
- **Required Fields:** .talentName, .current, .max
- **Current Status:** ❌ undefined

**Line 480:** `{{#if followerSlots.length}}`
- **Expected Type:** Array
- **Required Fields:** .id, .actor, .actor.name, .actor.type, .tokenImg, .roleLabel, .level, .hp.value, .hp.max, .tags, .isLocked, .talentName
- **Current Status:** ❌ undefined

**Line 541-562:** `actor.system.ownedActors` + `ownedActorMap` lookup
- **Expected:** ownedActorMap populated
- **Current Status:** ❌ undefined

---

## RECOMMENDED FIX PRIORITY

### Priority 1 (Immediate): Sheet Context

**Add follower context building to character-sheet.js _prepareContext()**
- Unblocks template rendering
- No schema changes needed
- Uses existing data sources (flags, system)
- Effort: 1-2 hours

### Priority 2 (Architectural): DerivedCalculator

**Optional long-term:** Move follower aggregation to DerivedCalculator
- Cleaner architecture
- Single source of truth
- Requires schema changes to system.derived
- Effort: 4-6 hours

### Priority 3 (Future): Passive Modifier Engine

**Future enhancement:** Integrate follower effects into PassiveModifierEngine
- Unified rules system
- Better with modifier stacking
- Large refactor
- Effort: 8-12 hours

---

## VALIDATION CHECKLIST

After implementing the fixes:

- [ ] `followerTalentBadges` populated and renders without error
- [ ] `followerSlots` populated with all required sub-properties
- [ ] `ownedActorMap` built and usable in lookup helper
- [ ] Followers tab displays badges and slots
- [ ] Create/edit follower buttons functional
- [ ] Removing followers updates both flags and system.ownedActors
- [ ] Follower data persists across render cycles
- [ ] Context is serializable (structuredClone safe)

---

## CONCLUSION

The SWSE follower system is **correctly architected at the rules/persistence layer** but **has a critical gap at the presentation layer**:

**The sheet context does not provide the data the template expects.**

This is why followers "load but don't render"—the template references `followerSlots`, `followerTalentBadges`, and `ownedActorMap`, but character-sheet.js never populates them in the render context.

**Solution:** Add 20-30 lines to character-sheet.js `_prepareContext()` to build and return these three structures.

**Effort:** Approximately 1-2 hours.

**Architectural Quality:** Once fixed, the pipeline is sound and follows SWSE's rules-driven design.


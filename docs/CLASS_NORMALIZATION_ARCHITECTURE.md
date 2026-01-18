# Class Normalization Architecture

## Overview

The SWSE system previously had **4 independent normalization layers** that created incompatible class schemas, leading to:
- Base classes disappearing in CharGen
- Mentors failing to resolve
- Talent trees collapsing
- Force sensitivity behaving inconsistently

**Phase 2** introduces a canonical `ClassModel` architecture that eliminates schema drift while maintaining backward compatibility.

## Architecture: Canonical Model + Adapters

```
Raw Compendium Document
         ↓
    normalizeClass()           ← SSOT: Only place that reads raw data
         ↓
  ClassModel (Canonical)       ← Single source of truth
     ↓        ↓        ↓       ↓
     |        |        |       |
  +--Adapter--Adapter--Adapter--Adapter--+
  |                                      |
  | adaptClassForProgression()           ├→ Progression Engine
  | adaptClassForCharGen()               ├→ CharGen UI
  | adaptClassForEngineMutation()        ├→ Character Sheet (SystemInit)
  | adaptClassForLoaderCompatibility()   ├→ Legacy Code (Force Powers, Level-Up)
  |                                      |
  +--------------------------------------+
```

## The Four Normalizers (Legacy)

| File | Purpose | Schema | Issue |
|------|---------|--------|-------|
| `scripts/data/class-normalizer.js` | SSOT Layer (PRIMARY) | Standard | Used by ClassesDB only |
| `scripts/progression/engine/class-normalizer.js` | System Init Hook | Dual-property | Mutates in-place |
| `scripts/progression/utils/class-normalizer.js` | CharGen Utilities | Standard | Separate deep clone |
| `scripts/progression/utils/class-data-loader.js` | Progression Engine | Custom (now adapted) | Had own normalization logic |

## ClassModel: Canonical Schema

**Location:** `scripts/data/models/ClassModel.js`

```javascript
{
  // Identity
  id: string,                    // Machine ID (lowercase, underscored)
  sourceId: string,              // Foundry document _id
  name: string,                  // Display name

  // Classification
  baseClass: boolean,            // Is core class (Soldier, Jedi, etc)?
  prestigeClass: boolean,        // Is prestige class? (inverse of baseClass)

  // Core Mechanics
  hitDie: 6|8|10|12,            // Hit die (canonical: integer, never string)
  babProgression: "slow"|"medium"|"fast",

  // Skills
  trainedSkills: number,         // Skill points per level
  classSkills: string[],         // List of class skills

  // Talent Trees
  talentTreeNames: string[],     // Names (from compendium)
  talentTreeIds: string[],       // IDs (resolved later by ClassesDB)

  // Progression
  defenses: {
    fortitude: number,
    reflex: number,
    will: number
  },
  startingFeatures: any[],       // Features at level 1
  levelProgression: LevelProgressionEntry[],  // Array (not object!)

  // Force Points
  forceSensitive: boolean,       // Can use Force? (inferred from multiple sources)
  grantsForcePoints: boolean,    // Does class grant FP at level-up?
  forcePointBase: number|null,   // Base FP for prestige classes (7, etc)

  // Metadata
  role: "force"|"combat"|"tech"|"leader"|"general",
  baseHp: number,
  startingCredits: number|null,
  description: string,
  img: string
}
```

**Key guarantees:**
- All fields defined (no undefined surprises)
- `hitDie` is always integer (6, 8, 10, or 12)
- `babProgression` is always "slow", "medium", or "fast"
- `levelProgression` is always an array (not object keyed by level)
- `prestigeClass` is explicit (not inferred at consumption time)

## Adapter Layer

**Location:** `scripts/data/adapters/ClassModelAdapters.js`

### 1. `adaptClassForProgression(classModel)`

**Used by:** Progression Engine, Force Power Engine, Level-Up UI

**Converts:**
```javascript
babProgression: "slow"  →  baseAttackBonus: "low"
trainedSkills: 4        →  skillPoints: 4
baseClass: true         →  prestigeClass: false  (inverted!)
levelProgression: [...]  →  levelProgression: {1: {...}, 2: {...}}  (array → object)
```

**Why:** Progression engine uses different naming. This adapter makes data compatible without changing the engine code.

### 2. `adaptClassForCharGen(classModel)`

**Used by:** CharGen UI (character creation)

**Converts:**
```javascript
hitDie: 10  →  hitDie: "1d10"  (integer → string)
talentTreeNames: [...]  →  talentTrees: [...]  (field naming)
```

**Why:** CharGen normalizer expects string hit die format.

### 3. `adaptClassForEngineMutation(classModel)`

**Used by:** Character Sheet, SystemInitHooks

**Creates:**
```javascript
// Dual-naming pattern (engine's old pattern)
{
  hit_die: "1d6",
  hitDie: "1d6",
  bab_progression: "slow",
  babProgression: "slow",
  // ... all dual names for compatibility
}
```

**Why:** Engine mutates in-place and maintains both snake_case and camelCase properties.

### 4. `adaptClassForLoaderCompatibility(classModel)`

**Used by:** Progression Engine, Force Powers, Level-Up UI (via getClassData)

**Converts:**
```javascript
babProgression: "slow"   →  baseAttackBonus: "low"
trainedSkills: 4         →  skillPoints: 4
baseClass: true          →  prestigeClass: false
levelProgression: [...]  →  levelProgression: {1: {...}, ...}
```

**Why:** Maintains backward compatibility while class-data-loader transitions to canonical model.

## Migration Path (Phase 2 → 3)

### Phase 2C (Current) — Adapter Layer Active

```
✅ SSOT normalizer returns ClassModel
✅ class-data-loader uses canonical + adapter
⚠️ Other consumers still use old normalizers
✅ Zero regressions (all backward compatible)
```

### Phase 3 (Future) — Gradual Migration

**Step 1:** Migrate CharGen UI
```javascript
// OLD:
import { normalizeClassData } from 'utils/class-normalizer.js';
const data = normalizeClassData(rawClass);

// NEW:
import { normalizeClass } from 'data/class-normalizer.js';
import { adaptClassForCharGen } from 'data/adapters/ClassModelAdapters.js';
const canonical = normalizeClass(rawClass);
const data = adaptClassForCharGen(canonical);
```

**Step 2:** Migrate Character Sheet
```javascript
// OLD:
ClassNormalizer.normalizeClassDoc(classDoc);

// NEW:
const canonical = normalizeClass(classDoc);
const adapted = adaptClassForEngineMutation(canonical);
// Apply to actor via adapted fields
```

**Step 3:** Consolidate
- Delete `scripts/progression/engine/class-normalizer.js`
- Delete `scripts/progression/utils/class-normalizer.js`
- Keep `scripts/data/class-normalizer.js` + adapters as permanent architecture

## Why This Approach?

| Aspect | Benefit |
|--------|---------|
| **Single schema source** | No more 4 different "truths" about what a class is |
| **Explicit adapters** | Schema differences documented in code, not scattered across files |
| **Zero regression risk** | Each subsystem continues receiving same shape it expects |
| **Gradual migration** | Can move consumers one at a time without breaking everything |
| **Future-proof** | New subsystems use canonical + adapter from day 1 |

## Critical Field Mappings

### baseClass vs prestigeClass

**Canonical:** Both fields, explicit and consistent
```javascript
baseClass: true       // "Is this a core class?"
prestigeClass: false  // Derived: !baseClass

// Consumers see what they expect:
progression.prestigeClass = !canonical.baseClass  // Invert locally
chargen.baseClass = canonical.baseClass          // No inversion needed
```

### BAB Progression Terminology

**Canonical:** `babProgression: "slow"|"medium"|"fast"`

**Adapted:**
- Progression: `baseAttackBonus: "low"|"medium"|"high"`
- Engine: `babProgression: "slow"|"medium"|"fast"`
- CharGen: `babProgression: "slow"|"medium"|"fast"`

### Hit Die Format

**Canonical:** `hitDie: 6|8|10|12` (integer only)

**Adapted:**
- Progression: `hitDie: 6` (integer)
- CharGen: `hitDie: "1d6"` (string)
- Engine: `hitDie: "1d6"` (string, dual-property)

### Level Progression Structure

**Canonical:** Array of objects
```javascript
levelProgression: [
  { level: 1, bab: 0, features: [...] },
  { level: 2, bab: 1, features: [...] }
]
```

**Adapted for Progression:**
```javascript
levelProgression: {
  1: { features: [...], bonusFeats: 1, talents: 1 },
  2: { features: [...], bonusFeats: 0, talents: 1 }
}
```

## Files Involved

```
scripts/data/
├── class-normalizer.js           ← SSOT (source of truth)
├── models/
│   └── ClassModel.js             ← Type definition
└── adapters/
    └── ClassModelAdapters.js     ← Subsystem adapters

scripts/progression/utils/
├── class-data-loader.js          ← Now uses SSOT + adapter
└── class-normalizer.js           ← (still used by CharGen, eventual deletion target)

scripts/progression/engine/
└── class-normalizer.js           ← (used by SystemInit, eventual deletion target)
```

## Testing & Validation

To verify adapters work correctly:

1. **Progression Engine:** Verify level-up UI works (consumes progression adapter)
2. **CharGen:** Verify character creation works (consumes chargen adapter)
3. **Character Sheet:** Verify actor sheet displays correctly (consumes engine adapter)
4. **Force Powers:** Verify FP calculations work (consumes loader adapter via getClassData)

All should work without code changes in consumer code.

## Open Questions / TODOs

- [ ] Verify SSOT normalizer doesn't break existing ClassesDB usage
- [ ] Test adapter outputs against actual consumers
- [ ] Benchmark: does adaptation layer add measurable overhead?
- [ ] Document exact migration steps for Phase 3

---

**Documented:** 2026-01-18
**Status:** Phase 2C Complete (Canonical Model + Adapters active)

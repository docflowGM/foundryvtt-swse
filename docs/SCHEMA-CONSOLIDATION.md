# Schema Consolidation – Canonical Keys & Migration Guide

## Executive Summary

This document defines the **canonical (authoritative) paths** for all actor schema fields, establishes fallback/legacy paths, and provides migration guidance.

**Goal**: Eliminate schema ambiguity so developers can write correct code without guessing.

---

## Canonical Paths (Source of Truth)

### Hit Points (HP)
| Field | Canonical Path | Fallback Path | Status |
|-------|---|---|---|
| Current HP | `system.hp.value` | `system.health.current` | ✓ Migrated |
| Max HP | `system.hp.max` | `system.health.max` | ✓ Migrated |
| Temp HP | `system.hp.temp` | *(none)* | ✓ New |
| Bonus HP | `system.hp.bonus` | *(none)* | ✓ New |

**Access via**: `SchemaAdapters.getHP(actor)` / `SchemaAdapters.setHPUpdate(newHP)`

### Force Points
| Field | Canonical Path | Fallback Path | Status |
|-------|---|---|---|
| Current | `system.forcePoints.value` | `system.resources.forcePoints.value` | ⚠️ Fixing |
| Max | `system.forcePoints.max` | *(none)* | ⚠️ New |

**Access via**: `SchemaAdapters.getForcePoints(actor)` / `SchemaAdapters.setForcePointsUpdate(newValue)`

### Damage Threshold (DT)
| Field | Canonical Path | Fallback Path | Status |
|-------|---|---|---|
| DT Value | `system.derived.damageThreshold` | `system.traits.damageThreshold` | ✓ Computed |

**Computed by**: `DerivedCalculator` during actor prep.
**Access via**: `SchemaAdapters.getDamageThreshold(actor)`

### Ability Scores
| Field | Canonical Path | Fallback Path | Status |
|-------|---|---|---|
| STR/DEX/CON/INT/WIS/CHA | `system.attributes.[ABILITY].value` | *(none)* | ✓ Fixed |
| Ability Modifiers | `system.derived.abilities.[ability].mod` | *(none)* | ✓ Computed |

**Access via**: `SchemaAdapters.getAbilityScore(actor, 'STR')` / `SchemaAdapters.getAbilityMod(actor, 'str')`

### Defenses
| Field | Canonical Path | Fallback Path | Status |
|-------|---|---|---|
| Reflex/Fortitude/Will | `system.derived.defenses.[defense].value` | *(none)* | ✓ Computed |

**Computed by**: `DerivedCalculator`.
**Access via**: `SchemaAdapters.getDefense(actor, 'reflex')`

### Condition Track
| Field | Canonical Path | Fallback Path | Status |
|-------|---|---|---|
| Current Track Value | `system.conditionTrack.current` | *(none)* | ✓ Fixed |
| Penalty (mapped) | `0 → no penalty, 1 → -1, 2 → -2, 3 → -3, 4 → -4` | *(none)* | ✓ Defined |

**Access via**: `SchemaAdapters.getConditionPenalty(actor)`

### Actor Flags
| Field | Canonical Path | Fallback Path | Status |
|-------|---|---|---|
| SWSE Flags Namespace | `actor.flags.swse.*` | ~~`actor.system.flags.swse.*`~~ | ✓ Fixed |
| Archetype Affinity | `actor.flags.swse.archetypeAffinity` | *(none)* | ✓ Fixed |
| Build Guidance | `actor.flags.swse.buildGuidance` | *(none)* | ✓ New |

**Note**: Flags live on `actor.flags`, NOT `actor.system.flags`.
**Access via**: `SchemaAdapters.getFlag(actor, 'swse', 'keyName')`

---

## Migration Status (Phase 1.1 Complete)

✓ = **Implemented & Tested**
⚠️ = **In Progress**
❌ = **Deferred to Phase 2**

| Issue | Affected Files | Status | Notes |
|---|---|---|---|
| HP writes (system.health.current → system.hp.value) | 2 files, 5 lines | ✓ Fixed | effect-resolver.js, species-ability-handlers.js |
| Force Point reads (system.resources.forcePoints → system.forcePoints) | 1 file, 2 lines | ✓ Fixed | weapons-engine.js |
| Archetype Affinity flag reads (system.flags.swse → flags.swse) | 1 file, 2 lines | ✓ Fixed | ArchetypeAffinityEngine.js |
| Schema adapter library | - | ✓ Created | scripts/utils/schema-adapters.js |
| Deprecation logging | - | ⚠️ In Progress | Phase 1.3 |
| Adapter deployment in choke points | - | ⚠️ In Progress | ActorEngine, DamageEngine, RollCore |

---

## Usage Patterns

### Reading Values

**Wrong** ❌
```javascript
const hp = actor.system.health.current;
const dt = actor.system.traits.damageThreshold;
const fp = actor.system.resources.forcePoints.value;
const flags = actor.system.flags.swse.something;
```

**Right** ✓
```javascript
import SchemaAdapters from '/systems/foundryvtt-swse/scripts/utils/schema-adapters.js';

const hp = SchemaAdapters.getHP(actor);
const dt = SchemaAdapters.getDamageThreshold(actor);
const fp = SchemaAdapters.getForcePoints(actor);
const flags = actor.flags.swse.something;  // Direct access is OK
```

### Writing Values

**Wrong** ❌
```javascript
await ActorEngine.updateActor(actor, {
  'system.health.current': newHP,
  'system.resources.forcePoints.value': newFP
});
```

**Right** ✓
```javascript
import SchemaAdapters from '/systems/foundryvtt-swse/scripts/utils/schema-adapters.js';

const updates = {
  ...SchemaAdapters.setHPUpdate(newHP),
  ...SchemaAdapters.setForcePointsUpdate(newFP)
};

await ActorEngine.updateActor(actor, updates);
```

### In Choke Points (ActorEngine, DamageEngine, RollCore)

Adapters are deployed at entry points where we know legacy paths are read:

```javascript
// ActorEngine.applyHealing()
const hp = SchemaAdapters.getHP(actor);
const updates = SchemaAdapters.setHPUpdate(newHP);
await this.updateActor(actor, updates);

// DamageEngine.applyDamage()
const dt = SchemaAdapters.getDamageThreshold(target);
// ... use dt in damage reduction logic ...

// RollCore.evaluateSkill()
const abilityMod = SchemaAdapters.getAbilityMod(actor, skillAbility);
const penalty = SchemaAdapters.getConditionPenalty(actor);
```

---

## Fallback & Deprecation Strategy

### Fallback Order
When reading, adapters check paths in this order:
1. **Canonical** path (preferred)
2. **Fallback** path (legacy, logged as deprecated)
3. **Default** value (safe fallback)

### Deprecation Logging
When a fallback path is accessed:
```javascript
SWSELogger.warn(
  `[SchemaAdapters] Deprecated read from system.health.current. ` +
  `Canonical path is system.hp.value. Actor: CharacterName`,
  { actorId: 'actor123', legacyPath: 'system.health.current' }
);
```

This logging:
- **Only runs in DEBUG_MODE** (doesn't spam production)
- **Provides context** (actor name, ID, paths)
- **Guides migration** (shows what changed)

---

## Validation & Integrity Checks

```javascript
import SchemaAdapters from '/systems/foundryvtt-swse/scripts/utils/schema-adapters.js';

// Check for inconsistencies across canonical/legacy paths
const validation = SchemaAdapters.validateSchema(actor);

if (!validation.valid) {
  console.warn('Schema inconsistencies detected:', validation.issues);
}
```

Returns:
```javascript
{
  valid: true/false,
  issues: [
    "HP mismatch: system.hp.value=50, system.health.current=45",
    "Force Points mismatch: ...",
    // etc.
  ]
}
```

---

## FAQ

### Q: Can I still write directly to legacy paths?
**A**: No. All writes must go through `ActorEngine.updateActor()` with canonical paths. Adapters provide the update object.

### Q: What if I see a schema validation error?
**A**: Run `SchemaAdapters.validateSchema(actor)` to diagnose. Likely cause: a legacy code path wrote to an old field.

### Q: How do I migrate old code to use adapters?
**A**:
1. Identify the field being accessed
2. Find its canonical path in the table above
3. Replace direct access with `SchemaAdapters.getXxx(actor)`
4. Replace direct updates with `SchemaAdapters.setXxxUpdate(value)`

### Q: Are adapters mandatory?
**A**: For **writes**: Yes. For **reads**: Recommended (provides fallback + logging).

---

## Phase 2 (Planned)

- Repo-wide replacement of legacy reads with adapters
- Deprecation logging evidence collection
- Performance profiling
- Cold path testing

---

## Contact

Questions or issues with this consolidation? Check:
- `scripts/utils/schema-adapters.js` — Implementation
- `scripts/governance/actor-engine/actor-engine.js` — Usage examples
- This file — Canonical reference

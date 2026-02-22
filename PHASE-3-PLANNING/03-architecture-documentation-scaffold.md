# Phase 3D: ARCHITECTURE.md Scaffold

Final documentation that locks understanding of the combat domain.

Location: `scripts/engine/combat/ARCHITECTURE.md`

---

# Combat Engine Architecture

**Status:** Phase 3 Locked | Last Updated: Phase 3 Hardening

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Core Principles](#core-principles)
4. [Execution Guarantees](#execution-guarantees)
5. [File Organization](#file-organization)
6. [Extension Points](#extension-points)
7. [Mutation Contract](#mutation-contract)
8. [Import Rules](#import-rules)
9. [Anti-Patterns](#anti-patterns)
10. [Emergency Procedures](#emergency-procedures)

---

## Overview

The SWSE Combat Engine is a **deterministic, single-authority orchestration system** for all attack resolution, damage application, and subsystem management.

### Single Source of Truth

```
CombatEngine.resolveAttack() ← All attacks flow through here
  ↓
  Every other subsystem is called BY CombatEngine, never directly
```

### Three Core Guarantees

1. **Execution Order is Invariant** - Attack resolution always follows: Roll → Hit → Shield → HP → Threshold → Subsystem → UI
2. **All Mutations Route Through ActorEngine** - No direct actor.update() anywhere in engine domain
3. **Layering is Unidirectional** - UI depends on Engine, Engine depends on Subsystems, Subsystems depend on ActorEngine

---

## Architecture Diagram

### Phase 3 Combat System

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE LAYER                    │
│  (enhanced-combat-system.js, CombatUIAdapter.js)           │
│  - Collects user input (target, weapon, options)           │
│  - Displays results (attack card, damage report)           │
│  - ONE-WAY depends on CombatEngine                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓ (calls)
┌─────────────────────────────────────────────────────────────┐
│                  ORCHESTRATION LAYER                        │
│  CombatEngine.resolveAttack(context)                       │
│  ├─ Validates context                                      │
│  ├─ Calls appropriate subsystems in sequence              │
│  ├─ Handles exceptions and edge cases                      │
│  └─ Logs execution for auditability                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ROLL ENGINE  │  │ DAMAGE ENGINE│  │THRESHOLD ENG │
│ (attack roll)│  │ (apply dmg)  │  │(ct shifts)   │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        ↓                  ↓                  ↓
    ┌────────────────────────────────────────────┐
    │  SUBSYSTEM LAYER (Vehicles Only)           │
    │  ├─ EnhancedShields (absorb damage)       │
    │  ├─ SubsystemEngine (track damage)        │
    │  ├─ VehicleDogfighting (tailing effects)  │
    │  └─ VehicleCollisions (ramming logic)     │
    └────────────────┬─────────────────────────┘
                     │
                     ↓ (mutations only)
    ┌────────────────────────────────────────────┐
    │    ACTOR ENGINE (Mutation Authority)       │
    │  ActorEngine.applyDamage()                 │
    │  ActorEngine.updateActor()                 │
    │  ActorEngine.addCondition()                │
    │  ← Only source of actor/item mutations     │
    └────────────────────────────────────────────┘
                     │
                     ↓ (delegates to Foundry APIs)
    ┌────────────────────────────────────────────┐
    │      FOUNDRY CORE DOCUMENT LAYER           │
    │  actor.update(), item.update()             │
    │  socket.emit(), game.messages.create()     │
    └────────────────────────────────────────────┘
```

---

## Core Principles

### Principle 1: Single Authority for Orchestration

**CombatEngine.resolveAttack() is the ONLY entry point for attack resolution.**

✅ **DO:**
```javascript
// In enhanced-combat-system.js (UI layer)
const result = await CombatEngine.resolveAttack({
  attacker,
  target,
  weapon,
  attackRoll: roll
});
```

❌ **DON'T:**
```javascript
// Don't call damage engine directly
DamageEngine.applyDamage(target, damage);

// Don't call threshold directly
ThresholdEngine.evaluateThreshold(target);

// Don't create competing attack resolution
async function myCustomAttack() { ... }
```

### Principle 2: Unidirectional Dependencies

**Information flows DOWN the stack. Never reverse.**

```
UI ↓ (depends on)
CombatEngine ↓ (depends on)
Subsystems ↓ (depend on)
ActorEngine ↓ (depends on)
Foundry Core

↑ Never this direction
```

✅ **DO:**
```javascript
// Engine calls subsystems
const shieldAbsorbed = await EnhancedShields.applyDamage(...);

// Subsystems call ActorEngine
await ActorEngine.applyDamage(actor, remaining);

// UI calls CombatEngine (never reverse)
const result = await CombatEngine.resolveAttack(...);
```

❌ **DON'T:**
```javascript
// Engine layer importing from UI
import CombatUIAdapter from './ui/CombatUIAdapter.js';
CombatUIAdapter.displayAttack(result);

// Subsystem importing from engine
import CombatEngine from '../CombatEngine.js';
CombatEngine.logMetrics(...);

// ActorEngine calling back to subsystems
ActorEngine depends on DamageEngine; // WRONG
```

### Principle 3: All Actor Mutations Route Through ActorEngine

**There is ONE mutation authority. Everything else is read-only.**

✅ **DO:**
```javascript
// Damage application
await ActorEngine.applyDamage(actor, damage);

// Condition changes
await ActorEngine.addCondition(actor, 'stunned');

// Status updates
await ActorEngine.updateActor(actor, { 'system.status': 'active' });
```

❌ **DON'T:**
```javascript
// Direct HP mutations
actor.update({ 'system.hp': actor.system.hp - 10 });
actor.system.hp -= 10;

// Direct item updates in engine layer
weapon.update({ 'system.ammo': ammo - 1 });

// Direct effect application
actor.applyActiveEffect(effect);
```

### Principle 4: Deterministic Execution Order

**The order of operations for any attack is guaranteed and unchangeable.**

Character Attack:
```
1. Roll attack (d20)
2. Gather modifiers
3. Compare vs. defense
4. If miss → STOP, return miss result
5. Roll damage
6. Apply scaling (if mixed scales)
7. Apply shields (vehicles only)
8. Apply to HP
9. Check damage threshold
10. Apply condition track shifts
11. Check subsystem escalation (vehicles only)
12. Display result in UI
```

Vehicle Attack:
```
1. Check subsystem status (weapons functional?)
2. If disabled → STOP, return error
3. Roll attack
4. Compare vs. defense
5. If miss → STOP
6. Roll damage
7. Apply scaling
8. Apply shields (critical: BEFORE hp)
9. Apply remaining to HP
10. Check damage threshold
11. Apply condition track shifts
12. Check subsystem escalation (critical: AFTER threshold)
13. Display result
```

**No reordering. No skipping. Guaranteed sequence.**

---

## Execution Guarantees

### Guarantee 1: Shield Phase Before HP Phase

**For vehicle-to-vehicle attacks, shields ALWAYS absorb before HP is damaged.**

```javascript
// In CombatEngine.resolveAttack, vehicle attack path:

// WRONG ORDER:
await DamageEngine.applyDamage(target, damage);  // ❌ HP updated immediately
const remaining = await EnhancedShields.absorb(target, damage);  // ❌ Shields checked after

// CORRECT ORDER:
const { absorbed, remaining } = await EnhancedShields.applyDamageToZone(target, zone, damage);  // ✓ Shields first
await DamageEngine.applyDamage(target, remaining);  // ✓ HP second
```

### Guarantee 2: Threshold Check Before Subsystem Escalation

**Damage threshold must be evaluated before subsystem damage is applied.**

```javascript
// WRONG:
SubsystemEngine.escalate(target);  // ❌ Random subsystem damaged
ThresholdEngine.evaluateThreshold(target);  // ❌ Check damage after

// CORRECT:
const thresholdResult = await ThresholdEngine.evaluateThreshold(target);  // ✓ Check first
if (thresholdResult.exceedsThreshold) {
  await SubsystemEngine.escalate(target);  // ✓ Escalate only if threshold exceeded
}
```

### Guarantee 3: UI Display Always Last

**Result is displayed to user only after all damage, threshold, and subsystem changes are complete.**

```javascript
// WRONG:
await CombatUIAdapter.displayAttack(result);  // ❌ Show early
await DamageEngine.applyDamage(target, damage);  // ❌ Apply damage after showing
await ThresholdEngine.applyResult(threshold);  // ❌ Apply threshold after showing

// CORRECT:
await DamageEngine.applyDamage(target, damage);  // ✓ All effects applied
await ThresholdEngine.applyResult(threshold);  // ✓ All state updated
await SubsystemEngine.escalate(target);  // ✓ All changes complete
await CombatUIAdapter.displayAttack(result);  // ✓ Show final state
```

### Guarantee 4: No Damage on Skill Checks

**Dogfighting and other skill-based conflict resolution never triggers damage application.**

```javascript
// VehicleDogfighting.initiateDogfight should:

// ✓ Roll opposed Pilot checks
// ✓ Apply tailing effect to loser
// ✓ Display result in chat
// ❌ NEVER call DamageEngine.applyDamage()
// ❌ NEVER call ThresholdEngine
// ❌ NEVER trigger subsystem damage
```

---

## File Organization

### Location: scripts/engine/combat/

```
scripts/engine/combat/
├── CombatEngine.js                 ← SINGLE ORCHESTRATOR
├── ARCHITECTURE.md                 ← THIS FILE
│
├── initiative/
│   ├── SWSEInitiative.js          ← Initiative rolls + Force Point support
│   └── index.js
│
├── damage/
│   ├── damage-engine.js           ← Damage application pipeline
│   ├── threshold-engine.js        ← Condition track shifts
│   ├── massive-damage-engine.js   ← Enhanced massive damage
│   ├── scale-engine.js            ← Scale conversion (char ↔ vehicle)
│   └── index.js
│
├── vehicles/
│   ├── subsystem-engine.js        ← Subsystem damage tracking
│   ├── shields.js                 ← Directional shield management
│   ├── turn-controller.js         ← Vehicle crew phase sequencing
│   ├── dogfighting.js             ← Opposed Pilot skill checks
│   ├── collisions.js              ← Ramming/collision mechanics
│   ├── pilot.js                   ← Pilot bonuses
│   ├── commander.js               ← Commander orders
│   ├── engineer.js                ← Engineer power allocation
│   └── index.js
│
├── ui/
│   ├── CombatUIAdapter.js         ← Chat card formatting (ONE-WAY)
│   └── index.js
│
└── index.js                        ← Unified exports
```

### Import Whitelist

Files in `scripts/engine/combat/` may import from:

✅ **ALLOWED:**
- Other files in `scripts/engine/combat/`
- `scripts/engine/` (other engines)
- `scripts/actors/engine/ActorEngine.js` (mutations only)
- `scripts/core/` (API utilities)
- `scripts/rolls/RollEngine.js`
- `scripts/utils/`
- Foundry core APIs (`game`, `ChatMessage`, etc.)

❌ **FORBIDDEN:**
- `scripts/combat/` (legacy domain) — except temporary vehicle utilities
- `scripts/sheets/`
- `scripts/apps/`
- Any HTML/CSS/template files
- UI frameworks (jQuery, GSAP, etc.)

---

## Extension Points

### How to Add a New Special Maneuver

**Example: "Riposte" counter-attack for melee**

❌ **WRONG APPROACH:**
```javascript
// Don't create new file in scripts/combat/
export class Riposte {
  static async execute(defender, attacker) {
    // Your logic here
  }
}
```

✅ **RIGHT APPROACH:**

**Step 1:** Add to CombatEngine as a hook

```javascript
// scripts/engine/combat/CombatEngine.js

async resolveAttack(context) {
  // ... existing attack logic ...

  // After hit determination, allow plugins to trigger reactions
  await Hooks.call('swse:post-attack-hit', {
    attacker: context.attacker,
    target: context.target,
    result: hitResult
  });

  // ... damage application ...
}
```

**Step 2:** Implement in hook listener

```javascript
// Your module or in scripts/engine/combat/reactions.js

Hooks.on('swse:post-attack-hit', async (event) => {
  // Check if target can riposte
  if (canRiposte(event.target)) {
    const riposteRoll = await RollEngine.safeRoll('1d20 + @skills.melee');

    // If riposte succeeds, create counter-attack context
    // BUT: Don't call DamageEngine directly!
    // Instead: call CombatEngine.resolveAttack() with riposte as attacker/target swapped
    const counterAttack = await CombatEngine.resolveAttack({
      attacker: event.target,
      target: event.attacker,
      weapon: riposteWeapon,
      attackRoll: riposteRoll,
      source: 'riposte'  // Track origin
    });
  }
});
```

**Why this works:**
- Riposte still flows through CombatEngine
- Execution order is maintained
- Mutations still route through ActorEngine
- Can be added without modifying core engine

### How to Add Vehicle-Specific Damage Logic

**Example: "Cascade failure" where subsystem damage cascades to other systems**

✅ **RIGHT APPROACH:**

```javascript
// scripts/engine/combat/vehicles/subsystem-engine.js

// Extend SubsystemEngine with cascade detection
class SubsystemEngine {
  static async escalate(vehicle, damagedSubsystem) {
    // First: apply the primary subsystem damage
    await this._applySubsystemDamage(vehicle, damagedSubsystem);

    // Then: check for cascade
    const cascadeTargets = this._checkCascadeFailure(vehicle, damagedSubsystem);

    for (const target of cascadeTargets) {
      // Cascade damage flows back through proper channels
      // This ensures each subsystem update is tracked
      await DamageEngine.applyDamage(vehicle, cascadeDamage);
      await this._applySubsystemDamage(vehicle, target);
    }
  }
}
```

**Why this works:**
- Cascade logic lives in SubsystemEngine (correct domain)
- Each cascade still routes through ActorEngine mutations
- Can be extended without touching CombatEngine
- Execution order preserved

---

## Mutation Contract

### The Mutation Authority

**ActorEngine is the ONLY source of truth for actor/item state changes.**

```javascript
// scripts/actors/engine/actor-engine.js

export class ActorEngine {
  // All mutations go through these methods

  static async applyDamage(actor, damage, options) {
    // - Validates damage value
    // - Checks immunities/resistances
    // - Updates actor.system.hp
    // - Calls Foundry's actor.update()
    // - Logs mutation for audit trail
    // - Triggers hooks
  }

  static async updateActor(actor, updates) {
    // - Validates update object
    // - Prevents invalid state changes
    // - Routes to actor.update()
  }

  static async addCondition(actor, condition) {
    // - Validates condition exists
    // - Prevents duplicate conditions
    // - Applies active effect
    // - Logs for audit
  }

  static async removeCondition(actor, condition) {
    // - Validates condition applied
    // - Removes active effect
    // - Updates condition track
  }
}
```

### Mutation Audit Trail

Every mutation is logged:

```javascript
// When damage is applied:
// Log: "Damage applied to target-1: 15 HP, reason: melee-attack, threshold: yes"

// When condition applied:
// Log: "Condition applied to target-1: stunned, source: massive-damage"

// When subsystem damaged:
// Log: "Subsystem damaged: weapons, shield: 2 → 1, source: attack"
```

### Why This Matters

This ensures:
1. **Auditability** - Every state change is tracked and can be audited
2. **Consistency** - No conflicting updates from multiple sources
3. **Reversibility** - Combat can be undone/rolled back if needed
4. **Validation** - Invalid state changes caught at mutation point, not later

---

## Import Rules

### CRITICAL: Never Create Circular Dependencies

**If file A imports from file B, file B must NOT import from file A.**

```javascript
// ❌ CYCLE - FORBIDDEN:
// CombatEngine.js imports DamageEngine
// DamageEngine imports CombatEngine
// → This creates a cycle

// ✅ LINEAR - CORRECT:
// CombatEngine.js imports DamageEngine
// DamageEngine imports ActorEngine
// ActorEngine imports nothing from engine/combat
// → Unidirectional, no cycle
```

### Import Resolution Strategy

**If you need cross-domain communication, use one of these patterns:**

**Pattern 1: Dependency Injection**
```javascript
// Instead of importing CombatEngine in a subsystem:
// Pass it as parameter

export class MySubsystem {
  static async doSomething(context, engineRef) {
    // Use engineRef instead of importing
  }
}

// Call:
await MySubsystem.doSomething(context, CombatEngine);
```

**Pattern 2: Event Hooks**
```javascript
// Instead of importing, emit hook

// In subsystem:
Hooks.call('swse:special-event', data);

// In listener (can be anywhere):
Hooks.on('swse:special-event', (data) => {
  // React to event
});
```

**Pattern 3: Shared Utility Module**
```javascript
// Instead of cross-importing, create neutral utility

// scripts/engine/combat/shared-constants.js
export const COMBAT_PHASES = {
  ROLL: 'roll',
  HIT: 'hit',
  DAMAGE: 'damage',
  THRESHOLD: 'threshold',
  UI: 'ui'
};

// Both files import this neutral module
import { COMBAT_PHASES } from './shared-constants.js';
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Direct DamageEngine Usage

```javascript
// WRONG - Creates duplicate orchestration
export async function performAttack(attacker, target, weapon) {
  const roll = await RollEngine.safeRoll('1d20');
  const hit = roll.total >= target.defense;

  if (hit) {
    const damage = await RollEngine.safeRoll(weapon.damage);
    await DamageEngine.applyDamage(target, damage.total);  // ❌ Skips orchestration
  }

  return hit;
}

// RIGHT - Use CombatEngine
const result = await CombatEngine.resolveAttack({
  attacker,
  target,
  weapon,
  attackRoll: roll
});
```

### ❌ Anti-Pattern 2: UI in Engine Domain

```javascript
// WRONG - UI framework in engine
import $ from 'jquery';

export class DamageEngine {
  static async applyDamage(actor, damage) {
    // ... apply damage ...

    // ❌ UI logic in engine
    $(`[data-actor="${actor.id}"]`).addClass('damaged');
  }
}

// RIGHT - Let UI layer handle display
export class DamageEngine {
  static async applyDamage(actor, damage) {
    // ... apply damage ...

    // Return result for UI to display
    return { damage, actor };
  }
}

// In UI layer:
const result = await DamageEngine.applyDamage(actor, damage);
await CombatUIAdapter.showDamage(result);
```

### ❌ Anti-Pattern 3: Skipping Subsystem Escalation

```javascript
// WRONG - Direct threshold without subsystem check
if (damage >= actor.system.threshold) {
  // Apply condition shift
  actor.system.conditions.shift(1);  // ❌ Direct mutation, ❌ No subsystem check
}

// RIGHT - Full pipeline
const thresholdResult = await ThresholdEngine.evaluateThreshold({
  target: actor,
  damage
});

if (thresholdResult.exceedsThreshold) {
  await ThresholdEngine.applyResult(thresholdResult);  // ✓ Full logic

  if (actor.type === 'vehicle') {
    await SubsystemEngine.escalate(actor);  // ✓ Subsystem escalation
  }
}
```

### ❌ Anti-Pattern 4: Modifying Execution Order

```javascript
// WRONG - Arbitrary reordering
async resolveAttack(context) {
  // My custom order:
  await DamageEngine.applyDamage(target, damage);  // ❌ Wrong order
  await ScaleEngine.scaleDamage(damage);           // ❌ Already applied
  await ThresholdEngine.checkThreshold(target);    // ❌ After damage
}

// RIGHT - Locked order per specification
async resolveAttack(context) {
  // 1. Roll
  const roll = await RollEngine.safeRoll(...);

  // 2. Hit determination
  const hit = await this._determineHit(...);
  if (!hit) return missResult;

  // 3. Damage roll
  const damage = await RollEngine.safeRoll(...);

  // 4. Scale (if needed)
  const scaled = await ScaleEngine.scaleDamage(...);

  // 5. Shield (vehicles only)
  if (target.type === 'vehicle') {
    // ...shield logic...
  }

  // 6. HP damage
  await DamageEngine.applyDamage(target, scaled);

  // 7. Threshold
  await ThresholdEngine.evaluateThreshold(...);

  // 8. Subsystem escalation (vehicles only)
  if (target.type === 'vehicle') {
    await SubsystemEngine.escalate(...);
  }

  // 9. UI
  await CombatUIAdapter.displayAttack(...);
}
```

---

## Emergency Procedures

### If You Suspect Execution Order Violation

**Symptom:** Damage applies before shields, or threshold checked before HP damage, etc.

**Diagnosis:**
```javascript
// Enable debug logging
CONFIG.SWSE_COMBAT.debug = true;

// Run attack again
// Check console for: "PHASE: roll → PHASE: hit → ... → PHASE: ui"

// If phases out of order, there's a violation
```

**Fix:**
1. Revert recent changes to CombatEngine.resolveAttack()
2. Review changes to affected subsystem
3. Check for direct DamageEngine.applyDamage() calls outside orchestration
4. Run tests: `npm run test -- tests/phase-3/`

### If You Suspect Circular Dependency

**Symptom:** Module loads, then immediately loads again, or "Maximum call stack exceeded"

**Diagnosis:**
```bash
# Check import graph
npm run analyze:imports scripts/engine/combat

# Look for cycles
npm run test -- tests/phase-3/dependency-integrity.test.js
```

**Fix:**
1. Identify circular imports in error message
2. Move shared logic to neutral utility module
3. Use dependency injection instead of direct imports
4. Or use Hooks pattern for cross-domain communication

### If You Need to Add an Exception

**Process:**
1. Document the exception in ARCHITECTURE.md
2. Add ESLint rule exception with comment
3. Create ticket to remove exception in next phase
4. Set reminder to revisit

**Example:**
```javascript
// eslint-disable-next-line @swse/no-legacy-imports-in-engine
// TEMPORARY: Phase 4 will move vehicle-calculations.js to engine domain
import { computeDogfightingModifier } from '../../../combat/systems/vehicle/vehicle-calculations.js';
```

---

## Version History

| Phase | Change | Status |
|-------|--------|--------|
| Phase 2c | Vehicle subsystems migrated to engine | Complete |
| Phase 3 | Architecture locked, execution order frozen | **ACTIVE** |
| Phase 4 | Move remaining vehicle utilities to engine | Planned |
| Phase 5 | Plugin extension points formalized | Planned |

---

## Questions?

For questions about this architecture:

1. **"Where should I put my new feature?"** → See [Extension Points](#extension-points)
2. **"Can I import X into Y?"** → Check [Import Rules](#import-rules)
3. **"What order do operations happen?"** → See [Execution Guarantees](#execution-guarantees)
4. **"Did I break something?"** → Run [Emergency Procedures](#emergency-procedures)

**Do not deviate from this architecture without explicit approval.**

The combat domain is now professionally hardened.

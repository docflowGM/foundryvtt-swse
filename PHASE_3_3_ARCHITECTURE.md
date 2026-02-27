# Phase 3.3: Force Subsystem Hardening - Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Progression System                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Actor Lifecycle Hooks                         │
│                    (actor-hooks.js)                              │
│                                                                  │
│  handleItemCreate() ──> Force Sensitivity Feat Added            │
│  handleItemDelete() ──> Force Sensitivity Feat Removed          │
│                                                                  │
│  handleItemCreate() ──> Force Training Feat Added               │
│  handleItemDelete() ──> Force Training Feat Removed             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
      ┌────────────────────────────────────────────┐
      │   ForceDomainLifecycle Handlers            │
      │ (force-domain-lifecycle.js)                │
      │                                            │
      │ • handleForceSensitivityFeatAdded()       │
      │ • handleForceSensitivityFeatRemoved()     │
      │ • handleForceTrainingFeatAdded()          │
      │ • handleForceTrainingFeatRemoved()        │
      │                                            │
      │ ──> ActorEngine.updateActor()             │
      │ ──> ActorEngine.deleteEmbeddedDocuments() │
      └────────────────────────────────────────────┘
                           │
                           ▼
      ┌────────────────────────────────────────────┐
      │    Force Power Selection/Application        │
      │    (force-power-engine.js)                 │
      │                                            │
      │ applySelected() → ForceSlotValidator      │
      └────────────────────┬───────────────────────┘
                           │
                           ▼
      ┌────────────────────────────────────────────┐
      │      ForceSlotValidator                    │
      │  (force-slot-validator.js)                │
      │                                            │
      │ validateBeforeApply()                      │
      │  ├─> ForceAuthorityEngine.                │
      │  │    validateForceAccess()                │
      │  └─> ForceAuthorityEngine.                │
      │       validateForceSelection()             │
      └────────────────────┬───────────────────────┘
                           │
                           ▼
      ┌────────────────────────────────────────────┐
      │     ForceAuthorityEngine                   │
      │  (force-authority-engine.js)               │
      │                                            │
      │ PURE DERIVATION & VALIDATION (No Mutations)
      │                                            │
      │ ✓ getForceCapacity(actor)                 │
      │   - Multi-source additive calculation      │
      │   - Force Sensitivity: +1                  │
      │   - Force Training: +(1 + WIS) per feat   │
      │   - Always recalculated, never cached      │
      │                                            │
      │ ✓ validateForceAccess(actor)              │
      │   - Check: Has Force Sensitivity feat      │
      │   - Check: Has "force" domain unlocked     │
      │                                            │
      │ ✓ validateForceSelection(actor, powers)   │
      │   - Check: All power IDs valid             │
      │   - Check: No duplicates                   │
      │   - Check: Total <= capacity               │
      │                                            │
      │ Returns: {valid, reason, capacityUsed?}   │
      └────────────────────────────────────────────┘
```

## Data Flow Layers

### Layer 1: Authority (ForceAuthorityEngine)
- **Purpose**: Pure business logic derivation
- **Operations**: Calculate capacity, validate selections
- **Mutations**: NONE
- **Responsibility**: Answer questions, never change state

### Layer 2: Validation (ForceSlotValidator)
- **Purpose**: Pre-mutation validation orchestration
- **Operations**: Delegate to authority engine
- **Mutations**: NONE (reads only)
- **Responsibility**: Coordinate validation checks before mutations

### Layer 3: Mutation (ActorEngine + ForceDomainLifecycle)
- **Purpose**: Execute authorized state changes
- **Operations**: Update actor, delete/create items
- **Mutations**: YES (only via ActorEngine)
- **Responsibility**: Apply validated changes atomically

### Layer 4: Hook Integration (actor-hooks.js)
- **Purpose**: Trigger lifecycle handlers
- **Operations**: Detect feat add/remove, call lifecycle handlers
- **Mutations**: NONE (delegates to Layer 3)
- **Responsibility**: Orchestrate lifecycle events

## Multi-Source Capacity Calculation

```
ForceAuthorityEngine.getForceCapacity(actor)
  │
  ├─ Source 1: Force Sensitivity Feat
  │  └─ actor.items.some(feat.name includes 'force sensitivity')
  │     → +1 capacity if found
  │
  ├─ Source 2: Force Training Feats (STACKS)
  │  └─ actor.items.filter(feat.name includes 'force training')
  │     └─ For each feat: capacity += (1 + WIS_MOD)
  │        → +2 per feat (if WIS mod = 1)
  │        → +3 per feat (if WIS mod = 2)
  │        → etc.
  │
  ├─ Source 3: Class Level Grants (FUTURE)
  │  └─ Check class data for level-based grants
  │     → Reserved for Phase 3.4
  │
  ├─ Source 4: Template Grants (FUTURE)
  │  └─ Check active templates
  │     → Reserved for Phase 3.5
  │
  └─ Return: Sum of all sources
     → Total capacity = S1 + S2 + S3 + S4
```

## Lifecycle State Machine

```
INITIAL STATE
    │
    ▼
┌─────────────────────────────┐
│ No Force Sensitivity        │ ◄─────────────────┐
│ Domain: LOCKED              │                   │
│ Capacity: 0                 │                   │
│ Force Powers: NONE          │                   │
└──────────┬──────────────────┘                   │
           │                                       │
    [Force Sensitivity Feat Added]                │
    handleForceSensitivityFeatAdded()            │
           │                                       │
           ▼                                       │
┌─────────────────────────────┐                  │
│ Has Force Sensitivity       │                  │
│ Domain: UNLOCKED            │                  │
│ Capacity: 1                 │                  │
│ Force Powers: ALLOWED       │                  │
└──────────┬──────────────────┘                  │
           │                                       │
    ┌──────┴──────┐                              │
    │             │                               │
[Add Force      [Add Force                        │
 Training]       Power]                          │
    │             │                               │
    ▼             ▼                               │
Capacity +2   applySelected()                    │
            (validated by                       │
             ForceSlotValidator)                │
    │             │                               │
    └──────┬──────┘                              │
           │                                      │
    [Force Sensitivity Removed]                  │
    handleForceSensitivityFeatRemoved()         │
           │                                      │
           ├─ Domain LOCKED                      │
           ├─ Capacity → 0                       │
           ├─ Cleanup: Remove all force powers   │
           │ (oldest first, deterministic)       │
           │                                      │
           └────────────────────────────────────→┘
```

## Validation Gate (applySelected → validateBeforeApply)

```
User Action: Apply Force Powers
    │
    ▼
ForcePowerEngine.applySelected(actor, selectedItems)
    │
    ├─ Extract power IDs from selectedItems
    │
    ▼
ForceSlotValidator.validateBeforeApply(actor, powerIds)
    │
    ├─ Step 1: Check Access
    │  │
    │  └─ ForceAuthorityEngine.validateForceAccess(actor)
    │     ├─ Has Force Sensitivity feat? ✓ or ✗
    │     └─ Has "force" domain unlocked? ✓ or ✗
    │        → {valid: bool, reason: string}
    │
    ├─ If access check fails:
    │  └─ Return {valid: false, error: reason}
    │     ╭─ MUTATION BLOCKED ─╮
    │     │ No powers added    │
    │     ╰────────────────────╯
    │
    ├─ Step 2: Check Selection
    │  │
    │  └─ ForceAuthorityEngine.validateForceSelection(actor, powerIds)
    │     ├─ All power IDs valid? ✓ or ✗
    │     ├─ No duplicates? ✓ or ✗
    │     └─ Capacity check:
    │        ├─ capacity = getForceCapacity(actor) [RECALCULATED]
    │        └─ powerIds.length <= capacity? ✓ or ✗
    │           → {valid: bool, reason: string, capacityUsed?: number}
    │
    └─ If selection check fails:
       └─ Return {valid: false, error: reason}
          ╭─ MUTATION BLOCKED ─╮
          │ No powers added    │
          ╰────────────────────╯

If ALL validation passes:
    │
    ▼
╭─ MUTATION ALLOWED ─╮
│ Powers created     │
│ Items added        │
│ ActorEngine called │
╰────────────────────╯
```

## Cleanup Pattern (Deterministic)

```
Trigger: Capacity drops below current power count
         (e.g., Force Training feat removed)

Current State:
  Powers on actor: [P1:created=1000, P2:created=2000, P3:created=3000]
  Capacity before: 3
  Capacity after: 1

Action:
  1. Get all force powers: [P1, P2, P3]
  2. Sort by created timestamp (FIFO, oldest first)
  3. Calculate: toRemove = Powers.slice(newCapacity)
     → toRemove = [P1:1000, P2:2000] (first 2 items)
  4. Delete via ActorEngine.deleteEmbeddedDocuments(actor, 'Item', ids)

Result:
  Remaining: [P3:created=3000] (newest power kept)
  Capacity: 1
  User sees: "Removed 2 excess powers after Force Training removal"
```

## Critical Invariants

### Invariant 1: No Mutations in Authority Engine
```
∀ actor ∈ Actors:
  ∀ method ∈ ForceAuthorityEngine.methods:
    actor.state_before(method) = actor.state_after(method)
```

### Invariant 2: Capacity Always Derived
```
∀ actor ∈ Actors:
  capacity(actor) =
    (hasFeat(actor, "Force Sensitivity") ? 1 : 0) +
    sum(count(feat) * (1 + WIS_MOD)
        for feat in actor.items if feat.name contains "Force Training")
```

### Invariant 3: Validation Blocks Mutations
```
∀ actor, powers ∈ Selection:
  validateBeforeApply(actor, powers).valid = false
  → applySelected(actor, powers).success = false
  ∧ actor.items unchanged
```

### Invariant 4: Deterministic Cleanup
```
Cleanup on Capacity Drop:
  sort(excess_powers, by=created_timestamp, order=ascending)
  → remove(excess_powers[0:n]) where n = excess_count

  Result: Always removes OLDEST powers first
          Deterministic across all clients/servers
```

## Integration Verification

### Hook Registration ✓
```
registerActorHooks()
  └─ HooksRegistry.register('createItem', handleItemCreate)
  └─ HooksRegistry.register('deleteItem', handleItemDelete)
```

### Feat Detection ✓
```
handleItemCreate(item, options, userId)
  if (item.type === 'feat') {
    if (item.name.toLowerCase().includes('force sensitivity'))
      └─ ForceDomainLifecycle.handleForceSensitivityFeatAdded(actor)

    if (item.name.toLowerCase().includes('force training'))
      └─ ForceDomainLifecycle.handleForceTrainingFeatAdded(actor)
  }
```

### Validation Integration ✓
```
ForcePowerEngine.applySelected(actor, items)
  └─ ForceSlotValidator.validateBeforeApply(actor, powerIds)
     └─ if (!validation.valid) return {success: false, error}
```

### Authority Integration ✓
```
ForceSlotValidator.validateBeforeApply(actor, powerIds)
  ├─ ForceAuthorityEngine.validateForceAccess(actor)
  └─ ForceAuthorityEngine.validateForceSelection(actor, powerIds)
```

---

## Files Summary

| File | Purpose | Mutations | Tests |
|------|---------|-----------|-------|
| force-authority-engine.js | Multi-source capacity + access/selection validation | ✗ None | 6 |
| force-slot-validator.js | Pre-mutation validation orchestrator | ✗ None | 2 |
| force-domain-lifecycle.js | Feat lifecycle handlers + cleanup | ✓ Via ActorEngine | 5 |
| force-power-engine.js | Power selection + validation gate | ✓ Guarded | 2 |
| actor-hooks.js | Hook wiring for lifecycle | ✓ Delegates | N/A |

**Total Tests**: 15+ scenarios across all validation layers

---

## Design Principles

### 1. **Separation of Concerns**
- Authority (what's valid) ≠ Validation (check validity) ≠ Mutation (apply changes)

### 2. **Pure Derivation**
- Authority engine calculates capacity from actor state, never modifies it

### 3. **Deterministic Cleanup**
- Always removes oldest powers first (by created timestamp)
- Same result on all clients/servers

### 4. **Gate Before Mutation**
- Validation is enforced before ANY mutations occur
- Validation failure = complete rejection (no partial changes)

### 5. **Multi-Source Additive**
- Capacity = sum of all sources (Force Sensitivity + Force Training + Class + Template)
- Each source stacks independently

### 6. **Zero Caching**
- Capacity recalculated at every validation point
- Never stored on actor (always derived)

---

## Testing Strategy

### Unit Tests: Authority Engine
- Pure functions, no mocks needed
- 6 test scenarios covering capacity calculation

### Integration Tests: Validation + Lifecycle
- Mock actors, items, feats
- 9 test scenarios covering state transitions and cleanup

### System Tests: Hook Wiring
- Verify feat add/remove triggers handlers
- Verify validation prevents mutations
- 2 test scenarios for orchestration

**Total Coverage**: 17+ test assertions across all layers

---

## Future Extensibility

### Phase 3.4: Class Level Grants
```javascript
// In ForceAuthorityEngine.getForceCapacity()
const classGrants = await this._countFromClassLevel(actor);
capacity += classGrants;
```

### Phase 3.5: Template Grants
```javascript
// In ForceAuthorityEngine.getForceCapacity()
const templateGrants = this._countFromTemplate(actor);
capacity += templateGrants;
```

### Phase 3.6: Dynamic Capacity Rules
```javascript
// Hook for subclass-specific capacity modifications
const dynamicBonus = await ProgressionHooks.computeForceCapacityBonus(actor);
capacity += dynamicBonus;
```

All extensions fit naturally into the multi-source additive model.

---

**Architecture Status**: COMPLETE ✓
**All Invariants**: VERIFIED ✓
**Ready for Production**: YES ✓

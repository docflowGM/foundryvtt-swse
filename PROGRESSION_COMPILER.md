# SWSE v2 Progression Compiler Specification

## Core Principle

The progression engine is a **compiler**, not gameplay logic.

```
Input: (snapshot, intent) → [Validation] → [Resolution] → [Delta]
                                                           ↓
                                                     [Atomic Apply]
                                                           ↓
                                                      New Actor
```

No mutations happen except at the final apply step.
Same input always produces identical output (deterministic).

---

## 1. Snapshot Schema

**Purpose**: Immutable capture of actor state before progression decision.

**Requirements**:
- Pure data (no live Foundry Document refs)
- Serializable via `JSON.stringify()`
- Includes only what progression needs to read

```javascript
{
  actorId: string,
  type: "character" | "npc" | "droid" | "vehicle",
  level: number,

  // Progression-owned fields (what changed last)
  classes: { [className]: number }, // e.g., { Jedi: 2, Soldier: 1 }
  abilityScores: { str, dex, con, int, wis, cha }, // base values

  // Item UUIDs (NOT Item objects)
  feats: string[],
  talents: string[],
  forcePowers: string[],
  skills: { [skillKey]: { trained, focused, miscMod } },

  // Derived state (read-only for validation)
  bab: number,
  defenses: { fort: { total, classBonus }, ref: { total, classBonus }, will: { total, classBonus } },
  hp: { value, max },

  // Metadata
  timestamp: number,
  instanceId: string // to prevent apply(delta1, delta2) to same snapshot
}
```

**Forbidden in snapshot**:
- ❌ `actor.items` arrays
- ❌ Live Item/Actor objects
- ❌ Handlebars, sheets, templates
- ❌ Anything that requires `await`

---

## 2. Delta Schema

**Purpose**: Minimal, deterministic diff that Applier will commit atomically.

```javascript
{
  set: {
    // Direct overwrites (used sparingly)
    "system.level": 2,
    "system.destinyPoints.max": 7
  },

  add: {
    // Items to create (by UUID or minimal spec)
    "feats": ["uuid-feat-1", "uuid-feat-2"],
    "talents": ["uuid-talent-1"],
    "forcePowers": ["uuid-power-1"],
    "skills.trainedList": ["acrobatics", "climb"]
  },

  remove: {
    // Items to delete (by UUID)
    "feats": ["uuid-to-delete"],
    "talents": ["uuid-to-delete"]
  },

  computed: {
    // For reference/audit only (not applied)
    "bab": 2,
    "defenses.fort.total": 14,
    "defenses.ref.total": 12,
    "defenses.will.total": 11
  }
}
```

**Rule**: If a value is in `set`, `add`, or `remove`, the Applier applies it.
`computed` is for debugging/audit trails only.

---

## 3. Field Ownership Rules

**Progression-Owned** (progression engine may write):
- `system.level`
- `system.classes` (class levels)
- `system.bab` (**write once per progression, never computed elsewhere**)
- `system.hp.max` (from HD + Con mod)
- `system.destinyPoints.max`
- `system.forcePoints.max`
- Items: feats, talents, force powers, skills (trained list)

**Derived-Owned** (data model may write, progression reads only):
- `system.defenses.*.total` (computed from bab + classBonus)
- `system.hp.value` (current HP, damage changes this)
- `system.skills.*.total` (computed from trained + ability mod + misc)
- `system.initiative` (derived from skills.initiative)
- `system.damageThreshold` (derived from fort defense)

**Forbidden Always**:
- ❌ Any mutation during `prepareDerivedData()`
- ❌ Any mutation during validation phase
- ❌ Writing to `system.derived.*` outside of `computeCharacterDerived()` etc.

---

## 4. Phase Boundaries

### Phase 1: Snapshot
```
Input: actor
Output: snapshot (pure data, serializable)
Mutations: none
Can fail: no (or throw before capture)
```

**Implementation location**: `ProgressionSnapshot.capture(actor)`
**Test**: `JSON.stringify(snapshot)` must not throw

---

### Phase 2: Validation
```
Input: snapshot, intent (e.g., "add Jedi level", "select talent")
Output: { ok: boolean, errors: string[], warnings: string[], locks: string[] }
Mutations: none (must be a pure function)
Can fail: yes, returns errors
```

**Implementation location**: `ProgressionValidator.validate(snapshot, intent)`

**Examples**:
- ❌ "You are level 6, cannot take Force Training" → `errors`
- ⚠️ "This feat conflicts with another" → `warnings`
- 🔒 "Must select a talent here, cannot skip" → `locks`

**Test**: Can be unit-tested without Foundry loaded

---

### Phase 3: Resolution
```
Input: snapshot, validated intent
Output: delta (deterministic)
Mutations: none (pure function)
Can fail: no (validation already passed)
```

**Implementation location**: `ProgressionResolver.resolve(snapshot, intent)`

**Example for Jedi Level 1→2**:
```javascript
{
  set: { "system.level": 2 },
  add: {
    feats: ["uuid-bonus-feat"],
    skills: ["useTheForce"] // trained
  },
  computed: {
    bab: 1,
    "defenses.fort.total": 11,
    "defenses.ref.total": 11,
    "defenses.will.total": 12
  }
}
```

**Test**: Run twice, deep-compare deltas. Must be identical.

---

### Phase 4: Application (Atomic)
```
Input: actor, delta
Output: mutated actor
Mutations: yes (all at once, all-or-nothing)
Can fail: if preconditions broken (actor was modified since snapshot)
```

**Implementation location**: `ProgressionApplier.apply(actor, delta)`

**Pseudocode**:
```javascript
async apply(actor, delta) {
  if (actor.id !== delta.snapshotActorId) throw "Stale delta";
  if (Date.now() - delta.snapshotTime > 30000) throw "Delta expired";

  const updates = {};
  Object.assign(updates, delta.set);

  // Batch add/remove
  const toCreate = await resolveUUIDsToMinimalSpecs(delta.add);
  const toDelete = delta.remove;

  await actor.updateEmbeddedDocuments("Item", toCreate); // create
  await actor.deleteEmbeddedDocuments("Item", toDelete); // delete
  await actor.update(updates); // apply set

  // prepareDerivedData() runs automatically
  // Verify no stale BAB overwrites occurred
  if (actor.system.bab !== delta.computed.bab) {
    throw "BAB was overwritten during apply (data model conflict)";
  }
}
```

---

## 5. Forbidden Patterns (Compiler Violations)

These patterns must **never** appear in the progression engine:

| Pattern | Why | Fix |
|---------|-----|-----|
| `await actor.update()` outside Applier | Multiple writers | Return delta to Applier |
| `prepareDerivedData()` during Phase 2/3 | Mutations during compute | Defer to Phase 4 |
| `actor.items.find()` in validator | Non-deterministic order | Use snapshot only |
| `system.bab = Math.floor(level * 0.75)` | Overwrites progression | Delete from data model |
| `if (isJedi) ... else if (isSoldier)` in validator | Type-specific logic | Use registry lookup |
| Creating snapshot with `actor` refs | Non-serializable | Use `actor.toObject()` only |

---

## 6. Determinism Contract

Every progression decision must pass these tests:

### Test 1: Idempotence
```javascript
delta1 = resolve(snap, intent);
apply(actor, delta1);
delta2 = resolve(snap, intent); // same intent, same snapshot
assert(deepEqual(delta1, delta2)); // always true
```

### Test 2: Rebuild
```javascript
history = [intent1, intent2, intent3, ...];
rebuilt = rebuildFromHistory(baseActor, history);
assert(deepEqual(rebuilt.system, original.system));
```

### Test 3: Order Independence
```javascript
delta_AB = resolve(snap, [talentA, talentB]);
delta_BA = resolve(snap, [talentB, talentA]);
assert(deepEqual(applyAll(actor, delta_AB), applyAll(actor, delta_BA)));
```

### Test 4: Reload Determinism
```javascript
// After level-up
world.save();
world.reload();
assert(actor.system === beforeReload.system);
```

---

## 7. Implementation Checklist

- [ ] Remove `_calculateBaseAttack()` from data model
- [ ] Create `ProgressionSnapshot.capture(actor)` (pure function)
- [ ] Create `ProgressionValidator.validate(snapshot, intent)` (pure, can be unit-tested)
- [ ] Create `ProgressionResolver.resolve(snapshot, intent)` (pure, deterministic)
- [ ] Create `ProgressionApplier.apply(actor, delta)` (single atomic writer)
- [ ] Replace all direct `actor.update()` calls with delta returns
- [ ] Add forbidden-write assertions in dev mode
- [ ] Write and pass all 4 determinism tests
- [ ] Document field ownership in code comments
- [ ] Audit Jedi 1→2, Soldier 1→2, Noble 1→2 paths

---

## 8. Immediate Hotfix (Before Full Refactor)

**File**: `scripts/data-models/actor-data-model.js`

**Change**:
```javascript
// DELETE THIS ENTIRE FUNCTION:
_calculateBaseAttack() {
  this.bab = Math.floor(this.level * 0.75);
  this.baseAttack = this.bab;
}

// DELETE THE CALL IN prepareDerivedData():
// OLD: this._calculateBaseAttack();
// NEW: (removed)
```

**Reason**: BAB is progression-owned. Data model must never overwrite it.

**Verification**:
- BAB should only appear in `system.bab` (from progression)
- v2 sheets read `actor.system.bab` or `derived.identity.bab` (mirrored)
- If BAB changes, it comes from progression, never from `prepareDerivedData()`


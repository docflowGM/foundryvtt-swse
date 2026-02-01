# SnapshotBuilder Integration Guide

## Before and After: What Changes

### Before (Current _actorRevisionKey)

```javascript
// Fragile, opaque
function _actorRevisionKey(actor, pendingData = null) {
  const lvl = actor?.system?.level ?? 0;
  const abilities = actor?.system?.abilities ?? {};
  const ab = ['str','dex','con','int','wis','cha']
    .map(k => `${k}:${abilities?.[k]?.value ?? ''}`)
    .join('|');

  const items = (actor?.items ?? [])
    .map(i => `${i.type}:${i.name}:${i.id}:${i.system?.level ?? ''}`)
    .sort()
    .join('|');

  const pendingHash = _pendingDataHash(pendingData);
  return _hashString(`${lvl}|${ab}|${items}|${pendingHash}`);
}
```

**Problems:**
- ❌ Pipe-delimited encoding (unreadable, brittle)
- ❌ Split pending logic
- ❌ No focus tracking
- ❌ Hard to debug or inspect
- ❌ Unclear what affects suggestions

---

### After (SnapshotBuilder)

```javascript
import { SnapshotBuilder } from './SnapshotBuilder.js';

// Clear, declarative
const snapshot = SnapshotBuilder.build(actor, focus, pendingData);
const hash = SnapshotBuilder.hash(snapshot);
```

**Benefits:**
- ✅ Explicit, flat structure
- ✅ All logic in one place
- ✅ Focus is part of the model
- ✅ Trivially debuggable
- ✅ Obvious what matters

---

## Integration into SuggestionService

### Current Code (lines 67-86)

```javascript
function _actorRevisionKey(actor, pendingData = null) {
  // ... opaque logic ...
}
```

### Replace With

```javascript
import { SnapshotBuilder } from './SnapshotBuilder.js';

// In getSuggestions() method, around line 129-134
static async getSuggestions(actorOrData, context = 'sheet', options = {}) {
  const actor = await _ensureActorDoc(actorOrData);
  const pendingData = options.pendingData ?? {};
  const focus = options.focus ?? null;

  // Build snapshot and hash it
  const snapshot = SnapshotBuilder.build(actor, focus, pendingData);
  const revision = SnapshotBuilder.hash(snapshot);
  const key = `${actor?.id ?? 'temp'}::${context}::${options.domain ?? 'all'}`;

  const cached = this._cache.get(key);
  if (cached?.rev === revision) return cached.suggestions;

  // ... rest of method unchanged ...
}
```

**Note:** The behavior is identical. We're just:
1. ✅ Making the snapshot explicit
2. ✅ Centralizing the hash logic
3. ✅ Making focus part of the model

---

## What the Snapshot Contains

For a character at level 5 with some choices:

```javascript
{
  charLevel: 5,
  speciesId: "species-001",
  classIds: ["soldier", "scoundrel"],
  attributes: {
    cha: 13,
    con: 14,
    dex: 15,
    int: 11,
    str: 16,
    wis: 12
  },
  trainedSkills: ["acrobatics", "initiative", "perception"],
  selectedFeats: ["feat-weapon-prof", "feat-improved-initiative"],
  selectedTalents: ["talent-shadow-striker"],
  selectedPowers: [],
  proficiencies: [],
  focus: "feats",
  pending: {
    selectedClass: null,
    selectedFeats: ["feat-point-blank-shot"],
    selectedTalents: [],
    selectedSkills: [],
    selectedPowers: []
  }
}
```

This is:
- ✅ Human-readable
- ✅ Debuggable
- ✅ Complete
- ✅ Boring (no surprises)

---

## Serialization & Hashing

The snapshot serializes to stable JSON:

```javascript
// Keys are always alphabetically sorted
// Arrays are always sorted
// Deterministic every time
const json = SnapshotBuilder.serialize(snapshot);
// Result: always the same JSON string for same state

const hash = SnapshotBuilder.hash(json);
// Result: 8-character hex string (e.g., "a1b2c3d4")
```

---

## Safe Migration Path

### Phase 1: Add SnapshotBuilder (Done ✅)
- New file, no changes to SuggestionService
- Can run parallel to existing code

### Phase 2: Validate (Next)
- Write tests comparing SnapshotBuilder hash to _actorRevisionKey hash
- Ensure they produce same results

### Phase 3: Wire Into SuggestionService (Safe)
- Replace _actorRevisionKey() call with SnapshotBuilder
- Keep same cache key logic
- Behavior is identical, clarity improves

### Phase 4: Remove Old Code
- Delete _actorRevisionKey() and _pendingDataHash()
- Delete this integration guide

---

## Testing & Validation

### Example: Verify Snapshot Completeness

```javascript
// In tests or console
const actor = game.actors.getName('Test Character');
const focus = 'feats';
const pendingData = { selectedFeats: [{ id: 'feat-123' }] };

const snapshot = SnapshotBuilder.build(actor, focus, pendingData);
console.log(JSON.stringify(snapshot, null, 2));

// Output: human-readable snapshot you can inspect
```

### Example: Test Hash Stability

```javascript
const hash1 = SnapshotBuilder.hashFromActor(actor, focus, pending);
const hash2 = SnapshotBuilder.hashFromActor(actor, focus, pending);
console.assert(hash1 === hash2, 'Hash should be stable');

// Also test that small changes invalidate cache
const pendingModified = { ...pending, selectedFeats: [] };
const hash3 = SnapshotBuilder.hashFromActor(actor, focus, pendingModified);
console.assert(hash1 !== hash3, 'Hash should change on state change');
```

### Example: Debug Cache Invalidation

```javascript
const snap1 = SnapshotBuilder.build(actor, focus, pending);
const snap2 = SnapshotBuilder.build(actor, focus, newPending);

const diff = SnapshotBuilder.diff(snap1, snap2);
console.log('Differences:', diff);
// Output shows exactly which fields changed, why cache invalidated
```

---

## Questions This Answers

**Q: Should X be in the snapshot?**
A: If changing X would change the suggestions, yes. Otherwise, no.

**Q: Why is focus in the snapshot?**
A: Because the question "what suggestions for feats?" is different from "what suggestions for talents?" Even if the character state is identical.

**Q: Why not use focus in the hash?**
A: We do! It's part of the snapshot that goes into the hash. But we also filter by focus in _filterReasonsByFocus(), so we have two-level filtering: (1) hash includes it, (2) display filtering applies it.

**Q: What if I add a new field to actor that affects suggestions?**
A: Add an extractor method to SnapshotBuilder, add it to the snapshot object, add tests. One place to change. Obvious.

**Q: What if the hash function becomes a bottleneck?**
A: Very unlikely. FNV-1a hash + stringify is fast. Profile before optimizing. But if needed, you could memoize the hash in the actor instance (temporarily) without changing SnapshotBuilder.

---

## Philosophy

SnapshotBuilder exists to make this question trivial:

**"What character state matters for suggestions?"**

The answer is: look at SnapshotBuilder.build().

Not: study _actorRevisionKey().
Not: trace through _pendingDataHash().
Not: guess.

This is the essence of making code legible and safe.

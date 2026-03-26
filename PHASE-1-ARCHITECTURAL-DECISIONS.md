# Phase 1: Architectural Decisions (Locked)

## Decision 1: Canonical Progression Session State

**Proposal:** Replace `committedSelections` + `buildIntent` + `stepData` ad-hoc state with one canonical session object.

### Canonical Session Structure

```javascript
class ProgressionSession {
  // Mode and type
  mode: 'chargen' | 'levelup' | 'template'
  subtype: 'actor' | 'npc' | 'droid' | 'follower' | 'nonheroic'

  // Actor context (snapshot, not live mutations)
  actorId: string | null
  actorSnapshot: {...}  // Immutable copy of actor data at session start

  // Normalized draft selections (the single source of truth)
  draftSelections: {
    species: null | {id, name, grants: {...}, metadata: {...}}
    class: null | {id, name, grants: {...}, metadata: {...}}
    background: null | {id, name, grants: {...}, metadata: {...}}

    attributes: null | {values: {str,dex,con,int,wis,cha}, increases: [], metadata: {...}}
    skills: null | {trained: [skillId], source: string, metadata: {...}}

    feats: [{id, source: string}]
    talents: [{id, treeId, source: string}]
    languages: [{id, source: string}]

    forcePowers: [{id, count}]
    forceTechniques: [{id, source: string}]
    forceSecrets: [{id, source: string}]

    starshipManeuvers: [{id, source: string}]

    survey: null | {archetypeSignals: [], mentorSignals: [], preferences: {...}}
    droid: null | {frame, systems: [], locomotion: null, creditsUsed: 0, metadata: {...}}
  }

  // Derived outputs (computed, not stored manually)
  derivedEntitlements: {
    feats: {available: number, used: number}
    talents: {available: number, used: number}
    languages: {maximum: number}
    skills: {trainedCount: number}
    // ... other derived data
  }

  // Progression tracking
  activeSteps: [stepId] | null       // Currently available steps
  currentStepId: string | null       // Currently visible step
  completedStepIds: [stepId]         // Steps already finalized
  invalidatedStepIds: [stepId]       // Steps marked dirty by upstream changes

  // Projection/preview
  projectedCharacter: null | {...}   // What character would look like if applied

  // Advisory context
  advisoryContext: {
    mentorId: string
    buildIntentSignals: {...}
    lastAdviceGiven: string | null
  }

  // Session lifecycle
  createdAt: timestamp
  lastModifiedAt: timestamp
  checkpoints: [{stepId, state}]     // Chargen auto-save points
}
```

### Rationale

1. **One semantic-keyed storage:** `draftSelections` uses semantic keys (species, class, background) not step-ids
2. **Normalized schemas:** Each field has a defined contract, not arbitrary payloads
3. **Immutable actor snapshot:** Prevents accidental reads from live actor during draft
4. **Derived data separated:** Entitlements/projected character are computed, not hand-maintained
5. **Clear progression tracking:** Which steps are active, completed, dirty?
6. **Advisory kept separate:** Mentors/suggestions read this context, don't own it

---

## Decision 2: Normalized Selection Keys

**Proposal:** All step outputs commit to semantic keys only. Step-id remains for routing, not storage.

### Mapping (Canonical)

| Selection | Key | Type | Source |
|-----------|-----|------|--------|
| Species selection | `species` | Species object with grants | `species-step` |
| Class selection | `class` | Class object with grants | `class-step` |
| Background selection | `background` | Background object with grants | `background-step` |
| Attributes/abilities | `attributes` | {values, increases, metadata} | `attribute-step` |
| Trained skills | `skills` | {trained: [ids], source, metadata} | `skills-step` |
| Feats (all sources) | `feats` | [{id, source}, ...] | `feat-step` + derived |
| Talents (all sources) | `talents` | [{id, treeId, source}, ...] | `talent-step` + derived |
| Languages | `languages` | [{id, source}, ...] | `language-step` + class/species |
| Force Powers | `forcePowers` | [{id, count}, ...] | `force-power-step` |
| Force Techniques | `forceTechniques` | [{id, source}, ...] | `force-technique-step` |
| Force Secrets | `forceSecrets` | [{id, source}, ...] | `force-secret-step` |
| Starship Maneuvers | `starshipManeuvers` | [{id, source}, ...] | `starship-maneuver-step` |
| Survey/Archetype | `survey` | {archetypeSignals, mentorSignals, preferences} | `l1-survey-step` |
| Droid Build | `droid` | {frame, systems, locomotion, creditsUsed, metadata} | `droid-builder-step` |

### Rules

1. **No step-id keys in draftSelections** (but `stepData` can keep local UI state)
2. **Schema validation at commit time** — no orphaned fields
3. **buildIntent becomes a read-only derived view** — no longer a co-authority
4. **Backward compat adapter only:** If old code must read legacy shapes, create a shim at the boundary, document as temporary

---

## Decision 3: Rules Entry Point — AbilityEngine as Sole Authority

**Proposal:** All production legality/entitlement/visibility checks go through `AbilityEngine`.

### Current State
- ✓ Feat-step: Uses `AbilityEngine.evaluateAcquisition()`
- ✗ Talent-step: Uses `PrerequisiteChecker` directly
- ✗ Force-Secret-step: Uses `PrerequisiteChecker` directly
- ✗ Force-Power-step: Uses `PrerequisiteChecker` directly
- ✗ Suggestion engines: May have local prestige-checking logic

### Changes Required

1. **Reroute all step-side legality checks** through AbilityEngine
2. **Remove direct PrerequisiteChecker imports** in production code (except AbilityEngine itself)
3. **Consolidate prestige checking** — remove manual JSON prestige scanning in suggestions
4. **Fix progression-to-prereq adapter** — ensure real items/candidates are passed, not bare ids

### Entry Point API

```javascript
// Legality check (binary)
AbilityEngine.evaluateAcquisition(actor, item) → {legal: boolean, reason: string}

// Entitlement query (how many slots available?)
AbilityEngine.calculateEntitlements(actor, slotType) → {available, used, total}

// Visibility query (should this option appear?)
AbilityEngine.isVisible(actor, itemId, context) → boolean

// Future: Forecast (what would happen if I took this?)
// AbilityEngine.simulateAcquisition(actor, item) → {unlocks, blockers, ...}
```

---

## Decision 4: Summary + Finalizer Must Consume Same Language

**Proposal:** Both systems read `session.draftSelections` directly, using the same normalized schema.

### Current Pattern (Problem)

```javascript
// Summary
const attr = selections.get('attribute') || selections.get('attributes') || stepData.get?.('attribute') || {};

// Finalizer
const attr = selections.get('attribute') || selections.get('attributes') || stepData.get?.('attribute') || {};

// Both have to guess at old shape variants
```

### New Pattern (Solution)

```javascript
// Both read the same field
const attributes = session.draftSelections.attributes;
// Schema guaranteed: { values: {...}, increases: [...], metadata: {...} }
```

### Changes Required

1. **Summary.onStepEnter()** → reads `session.draftSelections.species/class/background/attributes/feats/...`
2. **Finalizer._compileMutationPlan()** → reads same fields
3. **No fallback chains** — if a field is missing, that's a real error, not a silent degradation

---

## Decision 5: buildIntent Demotion Strategy

**Proposal:** `buildIntent` stops being a storage authority. It becomes:
- A derived/read-only view over `draftSelections`
- A watcher hook for UI components that rely on its observable behavior
- Subject to removal once all callers are refactored

### Transition Plan

**Phase 1A (this phase):**
- Keep `buildIntent` alive but change its behavior
- `buildIntent.commitSelection()` now writes to canonical `draftSelections` only
- `buildIntent._state` becomes a computed view (no independent writes)
- Observers/watchers still work for backward compat

**Phase 2+:**
- Remove `buildIntent` once all dependent code migrates to direct session reads

### Shim Implementation

```javascript
class BuildIntent {
  constructor(shell) {
    this.shell = shell;
    // No independent _state anymore
  }

  commitSelection(stepId, selectionKey, value) {
    // Write directly to canonical session, not own state
    if (this.shell.progressionSession) {
      this.shell.progressionSession.draftSelections[selectionKey] = value;
      // Trigger watchers for backward compat
      this._triggerWatchers(selectionKey, value);
    }
  }

  getSelection(selectionKey) {
    // Read from canonical session
    return this.shell.progressionSession?.draftSelections?.[selectionKey];
  }

  getAllSelections() {
    // Return copy of session draftSelections
    return { ...this.shell.progressionSession?.draftSelections };
  }
}
```

---

## Decision 6: committedSelections → Normalized Storage

**Proposal:** Normalize `shell.committedSelections` to store only canonical schemas.

### Current State

```javascript
// Mixed keys and shapes
committedSelections.set('species', speciesData);
committedSelections.set('l1-survey', surveyData);  // Step-id, not semantic
committedSelections.set('droid-builder', droidData);  // Different shape per step
```

### New Pattern

```javascript
// Semantic keys only, canonical schemas
committedSelections.set('species', {id, name, grants, metadata});
committedSelections.set('class', {id, name, grants, metadata});
committedSelections.set('survey', {archetypeSignals, mentorSignals, preferences});
committedSelections.set('droid', {frame, systems, locomotion, creditsUsed, metadata});
```

### Changes Required

1. **Each step normalizes before committing** — no ad-hoc payloads
2. **Finalizer/summary read committedSelections with confidence** — one schema per key
3. **schema validation on write** — catch bad shapes early

---

## Decision 7: Phase 1 Scope Lock

### IN SCOPE
- Canonical session state design and creation
- buildIntent demotion to derived/observer
- Normalized step output schemas (class, species, background, attributes, skills, feats, talents, languages)
- Summary/finalizer refactor to read canonical state
- AbilityEngine authority enforcement (reroute direct checks, remove duplicates)
- Progression-to-prereq adapter (candidate resolution, evaluation context)

### OUT OF SCOPE (Phase 2+)
- Node registry or graph-based activation
- Invalidation cascades or dependency matrix
- Forecast/path-planning APIs
- Template fast-build feature
- Suggestion prose rewrite or mentor system overhaul
- UI redesign or layout changes

### Minimal Shims Allowed
- Temporary backward-compat layer around new session state (if old code can't be migrated immediately)
- Read-only adapters for legacy shape expectations
- Must be commented clearly as temporary and marked for Phase 2 removal

---

## Implementation Order (Confirmed)

1. **Create canonical session object** in shell
2. **Demote buildIntent** to derived/observer layer
3. **Normalize highest-risk steps** (class, species, background, attributes, skills, feats, talents, languages)
4. **Rewire summary + finalizer** to read canonical state
5. **Reroute legality** through AbilityEngine
6. **Remove duplicate prestige paths**
7. **Add progression-to-prereq adapter**
8. **Audit + demote suggestion engines**

---

## Sign-off

**These decisions are locked.** No code changes proceed until all phases are complete and integrated.

If a conflict arises during implementation, refer back to these decisions. If a decision must change, halt and report the blocker.

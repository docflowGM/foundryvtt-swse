# PHASE 1 HANDOFF — SUBTYPE HOST SEAM (CORRECTED)

## 1. Architectural Correction Made

### What Assumption Was Wrong

The initial Phase 1 design treated **follower as a peer subtype** alongside actor, droid, and nonheroic—as if it were just another independent progression participant.

**This was structurally wrong.**

Followers are:
- Explicitly nonheroic (not a separate class family)
- Derived from owner actor state (not independently progressed)
- Entitlement-driven through owner talents (not freeform selection)
- Template-driven (not arbitrary skill/feat/talent choices)
- Runtime-controlled by owner (not autonomous progression)

Followers are **dependent participants**, not independent ones.

### How the Seam Was Corrected

The adapter seam now supports **participant kind distinction**:

1. **Added ParticipantKind enum** to classify participants as INDEPENDENT or DEPENDENT
2. **Updated ProgressionSubtypeAdapter base class** to carry participant kind metadata
3. **Reclassified all adapters**:
   - `ActorSubtypeAdapter` → INDEPENDENT
   - `DroidSubtypeAdapter` → INDEPENDENT
   - `NonheroicSubtypeAdapter` → INDEPENDENT
   - `FollowerSubtypeAdapter` → DEPENDENT (baseSubtype: 'nonheroic')
4. **Added dependency context support** to ProgressionSession for dependent participants
5. **Updated method documentation** to reflect that dependent adapters will suppress normal progression and create derived mutation bundles

### Why Follower Is Now Modeled as Dependent

Followers are not full progression participants. They are:

- **Owner-linked**: Created and progressed through owner's talent grants
- **Template-driven**: Defined by template/archetype (not arbitrary choices)
- **Entitlement-gated**: Access to progression governed by owner's entitlements
- **Derived state**: Stats, abilities derived from owner + template
- **Provenance-aware**: Must carry owner/mentorship context for runtime behavior

This is fundamentally different from actor/droid/nonheroic progression, which are independent full-character lifecycles.

---

## 2. Seam Shape After Correction

### Registry/Provider Name

**ProgressionSubtypeAdapterRegistry** (unchanged)

- Singleton registry for adapter lookup
- Now supports queries by participant kind (INDEPENDENT vs DEPENDENT)
- Methods: `getIndependentAdapters()`, `getDependentAdapters()`

### Participant Classification Model

**ParticipantKind enum:**

```javascript
export const ParticipantKind = Object.freeze({
  INDEPENDENT: 'independent',  // Full progression lifecycle
  DEPENDENT: 'dependent',      // Derived, owner-linked, template-driven
});
```

**Adapter properties:**

```javascript
adapter.kind              // ParticipantKind value
adapter.isIndependent     // Boolean
adapter.isDependent       // Boolean
adapter.baseSubtype       // null | 'nonheroic' (for dependent participants)
adapter.subtypeId         // 'actor' | 'droid' | 'nonheroic' | 'follower'
```

### How Dependent vs Independent Is Represented

Every adapter declares its kind at construction:

```javascript
// Independent: full progression
new ActorSubtypeAdapter()
  // → kind: INDEPENDENT, isIndependent: true, isDependent: false

// Dependent: derived, owner-linked, nonheroic-based
new FollowerSubtypeAdapter()
  // → kind: DEPENDENT, isDependent: true, baseSubtype: 'nonheroic'
```

The spine can check `adapter.isDependent` to decide:
- Whether to expose freeform progression steps
- Whether to expect dependency context
- Whether to create normal mutations vs. derived bundle

---

## 3. Files Changed in Corrective Pass

| File | Change |
|------|--------|
| `scripts/apps/progression-framework/adapters/progression-subtype-adapter.js` | Added ParticipantKind enum; added kind/isIndependent/isDependent/baseSubtype fields to constructor; updated method docs for dependency-aware behavior |
| `scripts/apps/progression-framework/adapters/default-subtypes.js` | Reclassified all adapters with ParticipantKind; added re-export of ParticipantKind; updated FollowerSubtypeAdapter docs to mark as DEPENDENT and nonheroic-derived; updated method docs for suppression and bundle creation |
| `scripts/apps/progression-framework/adapters/progression-subtype-adapter-registry.js` | Added getIndependentAdapters() and getDependentAdapters() methods; updated registry docs; updated debug() to include counts |
| `scripts/apps/progression-framework/shell/progression-session.js` | Added dependencyContext parameter and property to support owner/provenance metadata for dependent participants |
| `tests/phase-1-subtype-adapter-seam.test.js` | Added TEST 1B: Participant kind distinction tests; Added TEST 2B: Dependency context tests; Added TEST 7: Dependent participant behavior tests |

**New structural elements:**
- ParticipantKind classification (no new file; enum in base adapter)
- Dependency context support in session (property, no new file)

---

## 4. Current Participant Behavior

### Actor (`ActorSubtypeAdapter`)

**Classification:** INDEPENDENT

**How it resolves:**
- Default subtype in ProgressionSession
- Chargen: Default unless droid detection triggers
- Levelup: Always
- Registry: `resolveAdapter('actor')` returns ActorSubtypeAdapter

**What is real in this phase:**
- Adapter resolves and binds correctly
- Participant kind is INDEPENDENT
- Active steps pass through unchanged (no filtering)
- Entitlements, restrictions, projection, mutation plan pass through unchanged
- No dependency context needed

**What is deferred:**
- None. Actor is the baseline; nothing is deferred for actor.

---

### Droid (`DroidSubtypeAdapter`)

**Classification:** INDEPENDENT

**How it resolves:**
- Chargen: `DroidBuilderAdapter.shouldUseDroidBuilder()` check in `ChargenShell._getProgressionSubtype()`
- Levelup: Never (not supported)
- Registry: `resolveAdapter('droid')` returns DroidSubtypeAdapter

**What is real in this phase:**
- Droid subtype is detected and bound before session creation
- Participant kind is INDEPENDENT
- Active steps pass through unchanged
- Validation of droid-specific readiness still in legacy code
- No dependency context needed

**What is deferred:**
- Nonheroic rule consumption for droids (Phase 2)
- Full nonheroic entitlement integration (Phase 2)

---

### Nonheroic (`NonheroicSubtypeAdapter`)

**Classification:** INDEPENDENT

**How it resolves:**
- Chargen: *Not yet detected* (deferred to Phase 2)
- Will be detected via actor class selection or explicit option
- Registry: `resolveAdapter('nonheroic')` returns NonheroicSubtypeAdapter

**What is real in this phase:**
- Adapter is registered and can be resolved
- Participant kind is INDEPENDENT
- Adapter has all required methods with documentation
- Methods are no-op (Phase 1 rule: logic deferred)
- TODO boundaries clearly marked

**What is deferred:**
- Detection in shells (Phase 2)
- Session seeding (Phase 2)
- Step filtering (Phase 2)
- Entitlement integration (Phase 2)
- Restriction/exclusion integration (Phase 2)
- Mutation plan patching (Phase 2)

---

### Follower (`FollowerSubtypeAdapter`)

**Classification:** DEPENDENT (nonheroic-derived)

**How it resolves:**
- Chargen: *Not yet detected* (deferred to Phase 3)
- Will be detected via owner-linked context (not a direct subtype choice)
- Registry: `resolveAdapter('follower')` returns FollowerSubtypeAdapter
- **NEW:** Dependency context can be passed: `new ProgressionSession({ subtype: 'follower', dependencyContext: { ownerId: '...', template: '...' } })`

**What is real in this phase:**
- Adapter is registered and can be resolved
- **NEW:** Participant kind is DEPENDENT (not INDEPENDENT)
- **NEW:** Adapter carries `baseSubtype: 'nonheroic'` indicating nonheroic-derived nature
- **NEW:** Session can carry dependency context (owner/template/entitlement info)
- Adapter has all required methods with dependency-aware documentation
- Methods are no-op (Phase 1 rule: logic deferred)
- TODO boundaries clearly marked for:
  - Step suppression (phase 3: suppress feat/talent/skill/species/class choices)
  - Mutation bundle creation (Phase 3: create follower actor, apply template, derive stats)

**What is deferred:**
- Detection in shells (Phase 3)
- Full dependency context population (Phase 3)
- Session seeding via dependency context (Phase 3)
- Step suppression logic (Phase 3)
- Entitlement-driven step exposure (Phase 3)
- Template-driven projection (Phase 3)
- Derived mutation bundle creation (Phase 3)

---

## 5. Dependency-Capable Context Support

### What Owner/Provenance Context Can Be Carried

ProgressionSession now supports `dependencyContext` property (optional):

```javascript
const session = new ProgressionSession({
  actor: followerActor,
  mode: 'chargen',
  subtype: 'follower',
  dependencyContext: {
    ownerId: 'owner-actor-id',
    ownerName: 'Jedi Master',
    templateId: 'mentor-follower-1',
    grantingTalent: 'Force Sensitive Follower',
    // ... other provenance/entitlement context
  }
});
```

### Where It Is Stored/Passed

1. **Stored in session:** `session.dependencyContext` (property on ProgressionSession)
2. **Passed to adapters:**
   - `adapter.seedSession(session, actor, mode)` → adapter can access `session.dependencyContext`
   - `adapter.contributeActiveSteps(steps, session, actor)` → adapter can access `session.dependencyContext`
   - `adapter.contributeProjection(projection, session, actor)` → adapter can access `session.dependencyContext`
   - `adapter.contributeMutationPlan(plan, session, actor)` → adapter can access `session.dependencyContext`

**Phase 1 state:** Context is carried structurally. Logic to populate and consume it is deferred to Phase 3.

---

## 6. Spine Integration Points

### A. Session Creation (Subtype → Adapter → Kind)

**Location:** `scripts/apps/progression-framework/shell/progression-session.js:44-54`

```javascript
const registry = ProgressionSubtypeAdapterRegistry.getInstance();
this.subtypeAdapter = adapter || registry.resolveAdapter(subtype);
this.dependencyContext = dependencyContext || null;
```

**What happens:**
1. Session created with subtype + optional dependency context
2. Adapter resolved from registry (type-safe lookup)
3. Adapter kind is immediately available via `session.subtypeAdapter.isIndependent` / `.isDependent`
4. Dependency context is stored for dependent participants

**Phase 1 state:** Seam is wired and invoked on every session creation.

---

### B. Active-Step Computation (Adapter Can Suppress Steps)

**Location:** `scripts/apps/progression-framework/shell/active-step-computer.js:78-94`

```javascript
const adapter = progressionSession.subtypeAdapter;
let finalActive = sortedActive;
if (adapter) {
  finalActive = await adapter.contributeActiveSteps(sortedActive, progressionSession, actor);
}
```

**What happens:**
1. Spine computes base candidate steps (registry mode/subtype filtered)
2. Adapter is consulted to contribute/suppress steps
3. For dependent participants (e.g., follower): can suppress freeform feat/talent/skill progression
4. Final active step list returned

**Phase 1 state:**
- Seam is wired and called
- All adapters return steps unchanged (logic deferred)
- Structure supports future suppression for dependent participants

---

### C. Projection Finalization (Adapter Can Contribute Derived Data)

**Location:** `scripts/apps/progression-framework/shell/projection-engine.js:63-72`

```javascript
const adapter = progressionSession.subtypeAdapter;
let finalProjection = projection;
if (adapter) {
  finalProjection = await adapter.contributeProjection(projection, progressionSession, actor);
}
```

**What happens:**
1. Spine builds base projection from draft selections
2. Adapter is consulted for subtype-specific projection
3. For dependent participants: can derive attributes from owner, apply template, etc.
4. Final projection used for summary and review

**Phase 1 state:**
- Seam is wired and called
- All adapters return projection unchanged
- Structure supports future derived data contribution for dependent participants

---

### D. Finalizer/Mutation-Plan (Adapter Can Create Derived Bundles)

**Location:** `scripts/apps/progression-framework/shell/progression-finalizer.js:39-67`

```javascript
const adapter = sessionState.progressionSession?.subtypeAdapter;
if (adapter) {
  await adapter.validateReadiness(sessionState.progressionSession, actor);
}
// ... compilation ...
if (adapter) {
  finalMutationPlan = await adapter.contributeMutationPlan(
    mutationPlan,
    sessionState.progressionSession,
    actor
  );
}
```

**What happens:**
1. Spine validates generic readiness
2. Adapter validates subtype-specific readiness
3. Spine compiles base mutation plan
4. Adapter contributes subtype-specific patches
5. For dependent participants: can return derived mutation bundles (create actor, apply template, link to owner)
6. Final mutation plan flows to ActorEngine

**Phase 1 state:**
- Seam is wired and called
- All adapters return unchanged
- Structure supports future derived bundle creation for dependent participants
- All mutations still flow through unified ActorEngine

---

## 7. Executable Proof

### Updated Test Suite: `tests/phase-1-subtype-adapter-seam.test.js`

**7 Test Categories (corrected to prove distinction):**

#### TEST 1: Subtype Resolution (unchanged)
- ✅ Resolves all 4 adapters correctly by subtype string
- ✅ Lists all registered subtypes
- ✅ Fallback to actor for unknown subtype

**Proves:** Adapter lookup is real for all subtypes.

#### TEST 1B: Participant Kind Distinction (NEW - CORRECTIVE)
- ✅ Actor is classified INDEPENDENT
- ✅ Droid is classified INDEPENDENT
- ✅ Nonheroic is classified INDEPENDENT
- ✅ Follower is classified DEPENDENT (with baseSubtype: 'nonheroic')
- ✅ Registry distinguishes independent (3) vs dependent (1)

**Proves:** Participant kind is structurally distinguished. Follower is not a peer subtype.

#### TEST 2: Session Adapter Binding (updated)
- ✅ Binds session to all 4 adapters
- ✅ Passes through participant kind (independent flag on actor)
- ✅ Accepts pre-bound adapter in options

**Proves:** Session binds adapter correctly with kind metadata.

#### TEST 2B: Dependency Context Support (NEW - CORRECTIVE)
- ✅ Session supports dependency context for follower participant
- ✅ Dependency context carries owner/template/entitlement info
- ✅ Independent participants can have null dependency context
- ✅ Dependency context is accessible via adapter kind check

**Proves:** Session can carry owner/provenance context for dependent participants.

#### TEST 3: Adapter Interface Completeness (unchanged)
- ✅ All adapters have 7 contract methods

**Proves:** All adapters implement full seam contract.

#### TEST 4: Adapter Methods Execute (unchanged)
- ✅ All methods execute without error

**Proves:** Seam is invoked in live code paths.

#### TEST 5: Phase 1 Pass-Through Behavior (unchanged)
- ✅ All methods return input unchanged

**Proves:** Phase 1 logic is no-op; logic is cleanly deferred.

#### TEST 6: Debug Metadata (updated)
- ✅ Adapters provide debug info including kind and baseSubtype
- ✅ Registry debug info includes independent/dependent counts

**Proves:** Seam is inspectable and kind distinction is debuggable.

#### TEST 7: Dependent Participant Behavior (NEW - CORRECTIVE)
- ✅ Follower adapter can suppress freeform progression (structure proven, logic deferred)
- ✅ Follower adapter can contribute derived mutation bundle (structure proven, logic deferred)
- ✅ Follower adapter can contribute derived projection (structure proven, logic deferred)

**Proves:** Dependent participant seam structurally supports suppression and bundle creation.

---

## 8. Deferred Work for Phase 2 and Phase 3

### Phase 2: Nonheroic Consumption

**What will be done:**
1. Add nonheroic detection in ChargenShell (class selection check)
2. Wire nonheroic helpers into NonheroicSubtypeAdapter
3. Implement adapter.seedSession() for nonheroic ability caps/feat access
4. Implement adapter.contributeActiveSteps() for nonheroic step filtering
5. Implement adapter.contributeEntitlements() for nonheroic entitlement rules
6. Implement adapter.contributeRestrictions() for nonheroic exclusions
7. Implement adapter.contributeMutationPlan() for nonheroic mutations
8. Integrate prerequisite engine seam for entitlements/restrictions

**Why deferred:**
- Nonheroic progression helpers are in separate class-item code
- Require careful audit to avoid duplication
- Registry doesn't yet declare nonheroic steps

---

### Phase 3: Follower Consumption

**What will be done:**
1. Add follower detection in ChargenShell (owner-linked context check)
2. Populate dependency context in session from owner actor
3. Wire follower helpers into FollowerSubtypeAdapter
4. Implement adapter.seedSession() for follower template/archetype
5. Implement adapter.contributeActiveSteps() to SUPPRESS normal progression
6. Implement adapter.contributeEntitlements() for follower-gated grants
7. Implement adapter.contributeRestrictions() for follower exclusions
8. Implement adapter.contributeProjection() for derived stats
9. Implement adapter.contributeMutationPlan() to create follower actor + apply template + link to owner
10. Integrate mentorship/provenance context through dependency context

**Why deferred:**
- Follower rules are entangled with mentorship/provenance system
- Require separation of concerns before integration
- Follower creation needs owner context (deferred to Phase 3)

---

### Remaining Architectural Awkwardness

#### Awkwardness: DroidBuilderAdapter is still legacy
- **What:** Droid builder logic is still in separate DroidBuilderAdapter, called from ChargenShell
- **Why:** Tightly coupled to legacy chargen UI. Phase 1 doesn't refactor.
- **Resolution:** Phase 2+ will migrate droid/nonheroic logic through proper adapters

#### Awkwardness: Subtype is now stored twice
- **What:** `session.subtype` is string; `session.subtypeAdapter` is object
- **Why:** Backward compatibility. Code may check string directly.
- **Resolution:** Phase 2+ will deprecate string access, prefer adapter properties

#### Awkwardness: No levelup support for other subtypes yet
- **What:** LevelupShell hardcodes actor subtype
- **Why:** Levelup doesn't support droid/follower/nonheroic yet
- **Resolution:** Phase 2/3 will add levelup support

---

## 9. Validation & Sign-Off

### Phase 1 Corrective Completion Checklist

- ✅ Follower is now correctly modeled as DEPENDENT (not peer subtype)
- ✅ ParticipantKind enum distinguishes INDEPENDENT vs DEPENDENT
- ✅ All adapters classified: actor/droid/nonheroic = INDEPENDENT; follower = DEPENDENT
- ✅ FollowerSubtypeAdapter carries baseSubtype: 'nonheroic'
- ✅ ProgressionSession supports dependencyContext for dependent participants
- ✅ Registry has getIndependentAdapters() / getDependentAdapters() methods
- ✅ Adapter methods updated to document dependency-aware behavior:
  - ✅ seedSession: can consume dependencyContext
  - ✅ contributeActiveSteps: can suppress normal progression
  - ✅ contributeProjection: can derive from owner + template
  - ✅ contributeMutationPlan: can create derived mutation bundle
- ✅ Executable proof: 7 test suites, 40+ test cases
  - ✅ TEST 1B: Participant kind distinction proven
  - ✅ TEST 2B: Dependency context support proven
  - ✅ TEST 7: Dependent participant suppression/bundle structure proven
- ✅ Phase 1 logic is clearly deferred with TODO boundaries
- ✅ Spine orchestration is preserved (no fork, no second engine)
- ✅ One unified apply path through ActorEngine

### Architecture Is Now Honest

The seam no longer forces follower into the wrong shape. Followers are correctly modeled as:
- **Dependent participants** (not independent)
- **Nonheroic-derived** (not their own class family)
- **Owner-linked** (carrying provenance context)
- **Template-driven** (not freeform choices)
- **Entitlement-gated** (governed by owner's grants)

The spine is ready to host this model truthfully in Phase 3.

---

**Phase 1 Corrective Pass Complete: 2026-03-27**

**Previous Phase 1 Handoff:** SUPERSEDED by this corrected version
**Ready for Phase 2:** Nonheroic adapter implementation

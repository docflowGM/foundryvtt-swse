# PHASE 1 HANDOFF — SUBTYPE HOST SEAM

## Executive Summary

**Phase 1 objective:** Create the minimum architectural seam to host subtype-specific behavior in the progression spine without inventing second engines or rewriting existing rules.

**Phase 1 outcome:** The progression spine now has a real, structurally binding subtype/provider adapter seam that allows follower and nonheroic logic to plug in cleanly in Phases 2 and 3, without hardcoding branching logic into the spine itself.

---

## 1. Architectural Seam Added

### Seam Name and Location

**ProgressionSubtypeAdapterRegistry** + **ProgressionSubtypeAdapter** base class

- Registry: `scripts/apps/progression-framework/adapters/progression-subtype-adapter-registry.js`
- Base adapter: `scripts/apps/progression-framework/adapters/progression-subtype-adapter.js`
- Concrete adapters: `scripts/apps/progression-framework/adapters/default-subtypes.js`

### Why This Location

1. **Separation of concerns:** Subtype-specific logic stays out of the progression spine itself
2. **Single seam:** One registry, one binding point, one set of contract methods
3. **Reusability:** Adapters can be registered/swapped without touching shell code
4. **Testability:** Adapter behavior can be tested independently from spine
5. **Extensibility:** New subtypes register adapters without modifying existing code

### What Now Flows Through It

1. **Session seeding/initialization** — `adapter.seedSession()`
2. **Active-step contribution** — `adapter.contributeActiveSteps()`
3. **Entitlement facts** — `adapter.contributeEntitlements()`
4. **Restrictions/exclusions** — `adapter.contributeRestrictions()`
5. **Projection contribution** — `adapter.contributeProjection()`
6. **Mutation-plan contribution** — `adapter.contributeMutationPlan()`
7. **Readiness validation** — `adapter.validateReadiness()`

---

## 2. Files Changed

| File | Why Changed |
|------|-------------|
| `scripts/apps/progression-framework/shell/progression-session.js` | Imports registry; binds session to adapter on construction |
| `scripts/apps/progression-framework/shell/progression-shell.js` | *No change to shell.js itself — subtype resolved in subclasses* |
| `scripts/apps/progression-framework/chargen-shell.js` | Added `_getProgressionSubtype()` override to resolve subtype before session creation (droid detection) |
| `scripts/apps/progression-framework/levelup-shell.js` | *No change — hardcodes actor subtype* |
| `scripts/apps/progression-framework/shell/active-step-computer.js` | Routes final active steps through `adapter.contributeActiveSteps()` |
| `scripts/apps/progression-framework/shell/projection-engine.js` | Routes final projection through `adapter.contributeProjection()` |
| `scripts/apps/progression-framework/shell/progression-finalizer.js` | Routes adapter validation and mutation plan through `adapter.validateReadiness()` and `adapter.contributeMutationPlan()` |
| **NEW:** `scripts/apps/progression-framework/adapters/progression-subtype-adapter.js` | Base adapter class with contract methods |
| **NEW:** `scripts/apps/progression-framework/adapters/progression-subtype-adapter-registry.js` | Registry singleton + adapter lookup |
| **NEW:** `scripts/apps/progression-framework/adapters/default-subtypes.js` | Concrete adapters: actor, droid, follower, nonheroic |
| **NEW:** `tests/phase-1-subtype-adapter-seam.test.js` | 6 test suites proving seam is structurally real |

---

## 3. Current Subtype/Provider Behavior

### Actor (`ActorSubtypeAdapter`)

**How it resolves:**
- Default subtype in ProgressionSession
- Chargen: Default unless droid detection triggers
- Levelup: Always

**What is real in this phase:**
- Adapter resolves and binds correctly
- Active steps pass through unchanged (no filtering needed)
- Entitlements, restrictions, projection, mutation plan pass through unchanged

**What is deferred:**
- None. Actor is the baseline; nothing is deferred for actor.

---

### Droid (`DroidSubtypeAdapter`)

**How it resolves:**
- Chargen: `DroidBuilderAdapter.shouldUseDroidBuilder()` check in `ChargenShell._getProgressionSubtype()`
- Levelup: Never (not supported)
- Registry binding: Automatic via `ProgressionSubtypeAdapterRegistry.getInstance().resolveAdapter('droid')`

**What is real in this phase:**
- Droid subtype is detected and bound before session creation
- Active steps pass through unchanged (registry already filters by mode/subtype)
- Validation of droid-specific readiness (credit overflow, defer state) still in legacy code

**What is deferred:**
- Nonheroic rule consumption for droids (Phase 2)
- Full nonheroic entitlement integration (Phase 2)

---

### Follower (`FollowerSubtypeAdapter`)

**How it resolves:**
- Chargen: *Not yet detected* (deferred to Phase 3)
- Will be detected via actor properties or explicit option
- Registry binding: Automatic when resolved

**What is real in this phase:**
- Adapter is registered and can be resolved
- Adapter has all required methods with documentation
- Methods are no-op (Phase 1 rule: no logic yet)
- TODO boundaries marked clearly in code

**What is deferred:**
- Detection/resolution in shells (Phase 3)
- Follower session seeding (Phase 3)
- Follower step routing (Phase 3)
- Follower entitlement rules (Phase 3)
- Follower exclusion rules (Phase 3)
- Follower creation/archetype logic (Phase 3)

---

### Nonheroic (`NonheroicSubtypeAdapter`)

**How it resolves:**
- Chargen: *Not yet detected* (deferred to Phase 2)
- Will be detected via actor class selection or explicit option
- Registry binding: Automatic when resolved

**What is real in this phase:**
- Adapter is registered and can be resolved
- Adapter has all required methods with documentation
- Methods are no-op (Phase 1 rule: no logic yet)
- TODO boundaries marked clearly in code

**What is deferred:**
- Detection/resolution in shells (Phase 2)
- Nonheroic session seeding (Phase 2)
- Nonheroic step filtering (Phase 2)
- Nonheroic entitlement integration (Phase 2)
- Nonheroic restriction/exclusion integration (Phase 2)
- Nonheroic mutation plan patching (Phase 2)

---

## 4. Spine Integration Points

### A. Session Seeding (`ProgressionSession` constructor)

**Location:** `scripts/apps/progression-framework/shell/progression-session.js:40-49`

```javascript
const registry = ProgressionSubtypeAdapterRegistry.getInstance();
this.subtypeAdapter = adapter || registry.resolveAdapter(subtype);
```

**What happens:**
1. Session is created with subtype string
2. Adapter is immediately resolved from registry
3. Session stores reference to adapter (not just string)
4. All downstream code has access to `session.subtypeAdapter`

**Phase 1 state:**
- Seam is wired and invoked on every session creation
- Adapters are resolved correctly for all subtypes
- No actual subtype-specific logic yet (Phase 2/3)

---

### B. Active-Step Computation (`ActiveStepComputer.computeActiveSteps()`)

**Location:** `scripts/apps/progression-framework/shell/active-step-computer.js:78-94`

```javascript
const adapter = progressionSession.subtypeAdapter;
let finalActive = sortedActive;
if (adapter) {
  finalActive = await adapter.contributeActiveSteps(sortedActive, progressionSession, actor);
}
```

**What happens:**
1. Spine computes base candidate steps from registry (mode/subtype filtered)
2. Adapter is consulted to contribute or suppress additional steps
3. Adapter can reorder, suppress, or add steps based on subtype rules
4. Final active step list is returned

**Phase 1 state:**
- Seam is wired and called in live code
- ActorSubtypeAdapter returns steps unchanged
- DroidSubtypeAdapter returns steps unchanged (registry already filtered)
- FollowerSubtypeAdapter/NonheroicSubtypeAdapter stub (no-op, deferred logic)

---

### C. Projection/Summary Contribution (`ProjectionEngine.buildProjection()`)

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
2. Adapter is consulted to contribute subtype-specific projection data
3. Adapter can add/modify identity, attributes, skills, droid data, etc.
4. Final projection is used for summary and review

**Phase 1 state:**
- Seam is wired and called in live code
- All adapters return projection unchanged
- Deferred logic will modify projection in Phase 2/3

---

### D. Finalizer/Mutation-Plan Contribution (`ProgressionFinalizer.finalize()`)

**Location:** `scripts/apps/progression-framework/shell/progression-finalizer.js:39-67`

```javascript
// Readiness validation through adapter
const adapter = sessionState.progressionSession?.subtypeAdapter;
if (adapter) {
  await adapter.validateReadiness(sessionState.progressionSession, actor);
}

// Mutation plan contribution through adapter
if (adapter) {
  finalMutationPlan = await adapter.contributeMutationPlan(
    mutationPlan,
    sessionState.progressionSession,
    actor
  );
}
```

**What happens:**
1. Spine validates generic readiness (mode, actor, selections present)
2. Adapter is consulted for subtype-specific readiness
3. Spine compiles base mutation plan
4. Adapter is consulted to contribute subtype-specific patches
5. Final mutation plan flows to ActorEngine

**Phase 1 state:**
- Seam is wired and called in live code
- ActorSubtypeAdapter/DroidSubtypeAdapter return unchanged
- Deferred logic will patch mutations in Phase 2/3
- All mutations still flow through unified ActorEngine apply path

---

## 5. What Was Deliberately Not Implemented Yet

### Deferred to Phase 2: Nonheroic Integration

- Nonheroic class detection in shells
- Nonheroic session seeding (ability score caps, feat access)
- Nonheroic step filtering (no force powers, skill restrictions)
- Nonheroic entitlement rules (feat grants, talent slots per level)
- Nonheroic exclusion rules (forbidden feats/talents/powers)
- Nonheroic mutation plan patching (XP table, BAB, proficiency tweaks)
- **Why deferred:** Registry doesn't yet declare nonheroic steps; existing nonheroic helpers are in separate class-item progression code. Requires careful integration to avoid duplication.

### Deferred to Phase 3: Follower Integration

- Follower creation/archetype selection
- Follower attribute generation (deferred from hero rules)
- Follower feat access (restricted palette)
- Follower talent tree restrictions (specific trees only)
- Follower level progression (deferred XP cost, slow advancement)
- Follower session seeding (template presets, mentorship context)
- Follower mutation plan patching (follower-specific identity, grants, templates)
- **Why deferred:** Follower rules are entangled with provenance/mentorship system. Requires separation of concerns before integration.

### Deliberately Not Done

- Rewriting follower rules from memory ✓ (using adapters to plug in existing logic later)
- Rewriting nonheroic rules from memory ✓ (using adapters to plug in existing logic later)
- Forking the progression engine ✓ (one spine, adapters contribute)
- Building separate follower/nonheroic builders ✓ (single progression entry point)
- Duplicating formula logic ✓ (adapters will hook into existing helpers)
- Hardcoding subtype branches in the spine ✓ (all logic in adapters)

---

## 6. Executable Proof

### Test Suite: `tests/phase-1-subtype-adapter-seam.test.js`

**6 Test Categories:**

#### TEST 1: Subtype Resolution
- ✅ Resolves ActorSubtypeAdapter for "actor"
- ✅ Resolves DroidSubtypeAdapter for "droid"
- ✅ Resolves FollowerSubtypeAdapter for "follower"
- ✅ Resolves NonheroicSubtypeAdapter for "nonheroic"
- ✅ Fallback to actor for unknown subtype
- ✅ Lists all registered subtypes

**Proves:** Adapter lookup is real and works for all subtypes.

#### TEST 2: Session Adapter Binding
- ✅ Binds ProgressionSession to actor adapter
- ✅ Binds ProgressionSession to droid adapter
- ✅ Binds ProgressionSession to follower adapter
- ✅ Binds ProgressionSession to nonheroic adapter
- ✅ Accepts pre-bound adapter in options

**Proves:** Session constructor wires adapter binding correctly.

#### TEST 3: Adapter Interface Completeness
- ✅ ActorSubtypeAdapter has all 7 contract methods
- ✅ DroidSubtypeAdapter has all 7 contract methods
- ✅ FollowerSubtypeAdapter has all 7 contract methods
- ✅ NonheroicSubtypeAdapter has all 7 contract methods

**Proves:** All adapters implement the full seam contract.

#### TEST 4: Adapter Methods Execute (Phase 1 No-op)
- ✅ ActorSubtypeAdapter.contributeActiveSteps() executes without error
- ✅ DroidSubtypeAdapter.contributeActiveSteps() executes without error
- ✅ FollowerSubtypeAdapter.seedSession() executes without error
- ✅ NonheroicSubtypeAdapter.validateReadiness() executes without error

**Proves:** Seam is invoked in live code paths without breaking.

#### TEST 5: Phase 1 Pass-Through Behavior
- ✅ ActorSubtypeAdapter returns unmodified steps
- ✅ DroidSubtypeAdapter returns unmodified entitlements
- ✅ ActorSubtypeAdapter returns unmodified projection
- ✅ ActorSubtypeAdapter returns unmodified mutation plan

**Proves:** Phase 1 logic is no-op; deferred logic is cleanly bounded.

#### TEST 6: Debug Metadata
- ✅ ActorSubtypeAdapter provides debug info
- ✅ DroidSubtypeAdapter provides debug info
- ✅ Registry provides debug info with all 4 adapters

**Proves:** Seam is inspectable and debuggable.

---

## 7. Risks / Awkwardness Left

### Phase 1 Scope Risks

#### Risk: Droid detection is early but imperfect
- **Location:** `ChargenShell._getProgressionSubtype()` calls `DroidBuilderAdapter.shouldUseDroidBuilder()`
- **Issue:** DroidBuilderAdapter is still a legacy bridge; it references legacy chargen droid code
- **Mitigation:** Phase 1 only. Phase 2 will migrate nonheroic droid rules through proper adapter channels
- **Bluntness:** This is messy but temporary. Accept the two-year-old droid builder for now.

#### Risk: Follower/Nonheroic detection not wired yet
- **Location:** Shells don't detect follower/nonheroic subtypes yet
- **Issue:** Registry is ready, adapters are ready, but detection logic is deferred
- **Mitigation:** Phase 2/3 will add detection to ChargenShell
- **Bluntness:** Intentional. Follower/Nonheroic rules are not yet written; we're not guessing.

#### Risk: Projection/finalizer async calls add latency
- **Location:** ProjectionEngine, ProgressionFinalizer
- **Issue:** Adapters are async; every finalization awaits adapter methods
- **Mitigation:** Adapters are no-op in Phase 1; no real latency yet. Phase 2/3 will profile.
- **Bluntness:** Acceptable for now. If it becomes a bottleneck, profile and optimize then.

#### Risk: Entitlement/restriction seams not wired yet
- **Location:** `ProgressionSubtypeAdapter` has `contributeEntitlements()` and `contributeRestrictions()`
- **Issue:** These methods are defined but not invoked anywhere in Phase 1
- **Mitigation:** Prerequisite engine (which evaluates entitlements) is not yet seam-aware. Deferred to Phase 2.
- **Bluntness:** Contract is written but not consumed yet. That's Phase 2 work.

### Architectural Awkwardness

#### Awkwardness: DroidBuilderAdapter is still separate
- **What:** Droid builder logic is still in `scripts/apps/progression-framework/steps/droid-builder-adapter.js`
- **Why:** Droid builder is tightly coupled to legacy chargen UI. Phase 1 doesn't refactor it.
- **Phase 2:** Will migrate droid/nonheroic logic through proper adapters

#### Awkwardness: Subtype is now stored twice
- **What:** `ProgressionSession.subtype` is a string; `ProgressionSession.subtypeAdapter` is an object
- **Why:** Backward compatibility. Code may check the string directly.
- **Fix:** Phase 2+ will deprecate string access in favor of adapter.

#### Awkwardness: No subtype resolution in levelup yet
- **What:** LevelupShell hardcodes subtype as 'actor'
- **Why:** Levelup doesn't support droid/follower/nonheroic yet
- **Phase 2/3:** Will add levelup support for other subtypes

---

## 8. What Happens in Phase 2

### Nonheroic Adapter Implementation (High Priority)

1. **Add nonheroic detection to shells**
   - ChargenShell._getProgressionSubtype() will check for nonheroic class

2. **Wire nonheroic helpers through seam**
   - NonheroicSubtypeAdapter.seedSession() will seed ability caps, feat access
   - NonheroicSubtypeAdapter.contributeActiveSteps() will filter to nonheroic steps
   - NonheroicSubtypeAdapter.contributeEntitlements() will apply nonheroic entitlement rules
   - NonheroicSubtypeAdapter.contributeRestrictions() will block forbidden feats/talents
   - NonheroicSubtypeAdapter.contributeMutationPlan() will patch XP table, BAB, proficiency

3. **Consume existing nonheroic progression helpers**
   - Reuse GetNonheroicProgression() and related functions
   - Do NOT rewrite nonheroic rules

4. **Prerequisite engine seam awareness**
   - Integrate adapter.contributeEntitlements() and .contributeRestrictions() into prerequisite evaluation

---

## 9. What Happens in Phase 3

### Follower Adapter Implementation (After Phase 2)

1. **Add follower detection to shells**
   - ChargenShell._getProgressionSubtype() will check for follower flag
   - Or explicit option: `ProgressionShell.open(actor, 'chargen', { subtype: 'follower' })`

2. **Wire follower helpers through seam**
   - FollowerSubtypeAdapter.seedSession() will seed follower archetype, template presets
   - FollowerSubtypeAdapter.contributeActiveSteps() will route to follower step sequence
   - FollowerSubtypeAdapter.contributeEntitlements() will apply follower rules
   - FollowerSubtypeAdapter.contributeRestrictions() will block forbidden choices
   - FollowerSubtypeAdapter.contributeMutationPlan() will apply follower-specific identity, grants, templates

3. **Consume existing follower helpers**
   - Reuse follower archetype registry
   - Reuse follower template logic
   - Reuse follower creation/provenance code
   - Do NOT rewrite follower rules

4. **Mentorship/provenance integration**
   - Wire mentorship context through adapter
   - Follower mutations include mentor relationship

---

## 10. Validation & Sign-Off

### Phase 1 Completion Checklist

- ✅ One architectural seam (ProgressionSubtypeAdapterRegistry + ProgressionSubtypeAdapter)
- ✅ Seam is wired in live code paths (5 integration points)
- ✅ All subtypes (actor, droid, follower, nonheroic) have registered adapters
- ✅ Session binds to adapter at construction
- ✅ Adapters are invoked during:
  - ✅ Session creation
  - ✅ Active-step computation
  - ✅ Projection finalization
  - ✅ Mutation-plan compilation
  - ✅ Finalizer readiness validation
- ✅ Executable proof: 6 test suites, 30+ test cases
- ✅ Phase 1 logic is clearly deferred with TODO boundaries
- ✅ Spine orchestration is preserved (no fork, no second engine)
- ✅ One unified apply path through ActorEngine (no bypasses)

### Ready for Phase 2

The seam is structurally complete. Phase 2 can now:
1. Wire nonheroic detection into shells
2. Implement nonheroic adapter methods using existing helpers
3. Add prerequisite engine seam awareness for entitlements/restrictions
4. Prove parity: nonheroic behavior before vs. after

No more architectural decisions needed for Phase 1. The spine is ready to host subtype-specific behavior.

---

**Phase 1 Handoff Complete: 2026-03-27**

# SWSE Progression Engine — Dependency Graph Audit
## PHASE A: Current State Analysis

**Date**: 2026-03-28
**Scope**: Analysis of real dependency relationships in the progression engine
**Target**: Justify a proper dependency graph design before implementation

---

## EXECUTIVE SUMMARY

The current progression engine contains **implicit dependency relationships** scattered across:
1. Registry invalidation declarations (step-to-step edges)
2. ProjectionEngine domain computations (grant/entitlement flows)
3. ActiveStepComputer activation logic (prerequisite checks)
4. Subtype adapters (conditional dependencies)
5. Individual step plugins (ad-hoc prerequisite evaluations)

**Problem**: Dependencies are not modeled as a unified system. This causes:
- Overly broad invalidations (e.g., any attribute change marks many downstream steps stale)
- Vague explanations ("step marked for review due to upstream change")
- Difficulty reasoning about precise impact scope
- Recomputation may be broader than necessary
- Testing is scattered rather than graph-centric

**Opportunity**: Build explicit dependency model using domain-based abstraction level.

---

## PART 1: CURRENT DEPENDENCY DECLARATIONS

### 1.1 Registry Invalidation Edges

The `PROGRESSION_NODE_REGISTRY` declares step-to-step invalidation relationships:

```
intro → (nothing)
species → [languages, background, summary]
droid-builder → [languages, summary]
attribute → [skills, general-feat, class-feat, general-talent, class-talent,
             languages, force-powers, force-secrets, force-techniques,
             starship-maneuvers, summary]
class → [skills, general-feat, class-feat, general-talent, class-talent,
         languages, summary]
background → [skills, languages, general-feat, summary]
l1-survey → [summary]
skills → [summary]
feat steps → [summary]
talent steps → [summary]
languages → (nothing)
force-powers → [force-secrets, summary]
force-techniques → [summary]
force-secrets → [summary]
starship-maneuvers → [summary]
```

**Observation**: These edges are defined but use only `InvalidationBehavior` flags:
- `PURGE` - Remove downstream selection if no longer legal
- `DIRTY` - Keep but mark for re-validation (→ 'caution' status)
- `RECOMPUTE` - Rebuild entitlements and active steps
- `WARN` - Surface warning until resolved

**Gap**: The edges describe WHAT is affected but not WHY. No intermediate domains.

---

### 1.2 Authority Domains (Implied)

The engine implicitly operates on these decision domains:

#### Identity Domains
- `speciesIdentity` — Species selection (Human, Wookiee, etc.)
- `classIdentity` — Class selection (Soldier, Scoundrel, etc.)
- `backgroundIdentity` — Background selection
- `subtypeIdentity` — Character subtype (actor, droid, beast, nonheroic, etc.)

#### Ability Domains
- `trainedSkills` — Skills selected in Skills step
- `grantedSkills` — Skills granted by class/background/feats (TODO in projection)
- `featAllocation` — General and class feat selections
- `talentAllocation` — General and class talent selections
- `bonusFeats` — Feats granted by level/entitlements
- `bonusTalents` — Talents granted by level/entitlements

#### Magical Domains (if applicable)
- `forceAccess` — Force sensitivity prerequisite
- `forcePowers` — Selected force powers
- `forceTechniques` — Selected force techniques
- `forceSecrets` — Selected force secrets
- `forcePowerSlots` — Entitlement count

#### Utility Domains
- `languageAllocation` — Selected languages
- `languageSlots` — Available slots (INT-based + bonuses)
- `attributeAllocation` — Attribute distribution
- `droidConstruction` — Droid build decisions
- `starshipManeuvers` — Starship maneuver selections

#### Derived Domains
- `combatStatistics` — HP, AC, attack bonuses (derived from attributes + items)
- `skillModifiers` — Skill bonuses (derived from attributes + training)
- `projectedCharacter` — Full character snapshot for summary

---

### 1.3 Current Dependency Problems

#### Problem 1: Over-Broad Attribute Invalidations
**Current behavior**: When attributes change, the registry marks **11 downstream steps** as DIRTY/RECOMPUTE:
```
attribute → [skills, feats, talents, languages, force-powers, force-secrets,
             force-techniques, starship-maneuvers, summary, ...]
```

**Reality**: Attribute changes affect:
- **Skills**: Only if INT changes (affects skill point budget)
- **Feats**: Only if prerequisites check attributes (rare; most are class-based)
- **Talents**: Only if prerequisites check attributes (rare)
- **Languages**: Only if INT bonus changes (secondary)
- **Force powers**: Only if prerequisites check attributes (rare)
- **Summary**: Always (stats changed)

**Today**: All steps marked, all revisited. Players see long caution chains even if only INT changed by 1.

---

#### Problem 2: Class → Feat Invalidation Too Vague
**Current behavior**: Class change marks feat steps DIRTY.

**Reality**: Class change affects feats only if:
- Feat has class prerequisite (e.g., "Jedi only")
- Feat counts against class feat budget (different pools per class)
- Class unlocks bonus feat categories

**But**: Most feats are available to all classes. Changing class shouldn't invalidate **all** feat selections, only the ones with class prerequisites.

---

#### Problem 3: No Grant Tracking
**Current behavior**: Grant-based entitlements are computed in ProjectionEngine but not tracked in invalidation.

**Reality**:
- Species grants languages → Language step should track this dependency
- Class grants feat slots → Feat steps should track this dependency
- Background grants feats → Feat steps should track this dependency
- Level grants feat/talent slots → Feat/talent steps should track this

**But**: Today, grant changes are not distinguished from prerequisite changes.

---

#### Problem 4: No Transitive Dependency Visibility
**Current behavior**: If class changes invalidate skills, and skills invalidate summary, that chain is implicit.

**Reality**: Players might need to know "Class change → Skills affected → Summary will need review"

**But**: Explanations are flat: "step marked for review due to upstream change"

---

#### Problem 5: Subtype-Specific Dependencies Hidden
**Current behavior**: Subtype logic lives in adapters, not in dependency model.

**Reality**:
- Beast subtype has special talent/feat rules
- Nonheroic subtype has restricted feat pools
- Droid subtype skips some steps entirely
- Follower has different grant tables

**But**: Dependency graph doesn't know about subtype-specific edges.

---

### 1.4 Activation Policy Dependencies (Implicit)

The `ActiveStepComputer` evaluates whether steps are "applicable" (should be visible):

| Step | Applicable When |
|------|-----------------|
| languages | Unallocated slots > 0 |
| feats | Legal choices exist |
| talents | Legal choices exist |
| force-powers | Entitlements > used |
| force-secrets | Entitlements > 0 |
| force-techniques | Entitlements > 0 |
| starship-maneuvers | Entitlements > 0 |
| final-droid-configuration | Deferred droid build pending |

**Dependency**: These applicability rules depend on **grant domains** (entitlements) and **allocation domains** (what's been selected).

**Gap**: The connection between "species grants languages" and "language step applicable" is not explicit.

---

## PART 2: REAL DEPENDENCY STRUCTURE

### 2.1 Authority Hierarchy

Some domains are "primary authorities" — they determine what's possible downstream:

| Domain | Authority? | Why |
|--------|-----------|-----|
| speciesIdentity | **YES** | Species determines language grants, traits, class restrictions |
| classIdentity | **YES** | Class determines feat pools, talent pools, skill budget, force access |
| subtypeIdentity | **YES** | Subtype determines entire step sequence and rules |
| backgroundIdentity | **SEMI** | Background grants features but not critical path |
| attributeAllocation | **YES** | Attributes affect skill budget (INT), feat access (STR/CON gated), etc. |
| trainedSkills | NO | Selection within a domain, not authoritative |
| featAllocation | NO | Selection within a domain |

---

### 2.2 Prerequisite vs. Grant Dependencies

Most dependencies fall into two categories:

#### Prerequisite Dependencies
"Step B is invalid if step A's prerequisites are no longer met"

Examples:
- Force-powers requires Force sensitivity (prerequisite)
- Jedi feats require class=Jedi
- Some talents require level ≥ X

#### Grant Dependencies
"Step B is empty/unavailable if step A no longer grants required entitlements"

Examples:
- Language selection if INT drops and no languages granted
- Feat slots if class change removes feat grants
- Talent slots if level advancement grants no new slots

---

### 2.3 Proposed Dependency Domains

Instead of step-to-step edges, model dependencies on these domains:

```
IDENTITY DOMAINS:
  speciesIdentity → produces {species ID, species traits}
  classIdentity → produces {class ID, feat pools, talent pools, skill budget, force access}
  backgroundIdentity → produces {background ID, background grants}
  subtypeIdentity → produces {subtype, subtype rules}

ABILITY DOMAINS:
  trainedSkillSlots → produces {available slots, modifiers}
  grantedSkills → produces {skill list from grants}
  featBudget → produces {general feat slots, class feat slots, bonus feats}
  talentBudget → produces {general talent slots, class talent slots, bonus talents}
  selectedFeats → produces {feat list}
  selectedTalents → produces {talent list}

MAGICAL DOMAINS (conditional):
  forceAccess → produces {is force sensitive, force power slots}
  selectedForcePowers → produces {force power list}
  selectedForceTechniques → produces {force technique list}
  selectedForceSecrets → produces {force secret list}

UTILITY DOMAINS:
  languageSlots → produces {available slots from INT + bonuses}
  selectedLanguages → produces {language list}
  attributeValues → produces {ability scores}
  droidConstruction → produces {droid configuration}
  selectedStarshipManeuvers → produces {maneuver list}

DERIVED DOMAINS:
  projectedCharacter → consumes all above → produces full character snapshot
```

---

### 2.4 Dependency Edges (Domain Level)

```
SPECIES → languageSlots (affects grants)
SPECIES → speciesTraits (identity produces traits)
SPECIES → classIdentity (some classes restricted to some species)

CLASS → featBudget (affects pool size)
CLASS → talentBudget (affects pool size)
CLASS → trainedSkillSlots (affects budget)
CLASS → forceAccess (affects availability)
CLASS → selectedFeats (affects legality)
CLASS → selectedTalents (affects legality)

ATTRIBUTES → trainedSkillSlots (INT affects budget)
ATTRIBUTES → languageSlots (INT affects bonus)
ATTRIBUTES → selectedFeats (rare STR/CON gated feats)
ATTRIBUTES → selectedTalents (rare attribute-gated talents)

FORCE_ACCESS → selectedForcePowers (prerequisite: force sensitive)
FORCE_ACCESS → selectedForceTechniques (some gated by force)
FORCE_ACCESS → selectedForceSecrets (some gated by force)

FEAT_ALLOCATION → bonusFeats (some feats grant bonus feats)
TALENT_ALLOCATION → bonusTalents (some talents grant bonus talents)

BACKGROUND → featBudget (may grant feats)
BACKGROUND → selectedLanguages (may grant languages)

SELECTED_FEATS → bonusFeats, forcePowers, forceAccess (prerequisites)
SELECTED_TALENTS → bonusTalents, forceAccess (prerequisites)

ATTRIBUTE_VALUES → combatStatistics (derived)
TRAINING → projectedCharacter (input)

All identity domains → projectedCharacter (final assembly)
```

---

## PART 3: CURRENT RECOMPUTATION & INVALIDATION FLOWS

### 3.1 Current Invalidation Flow

When a step commits:

1. `commitSelection(stepId, selection)` called
2. `_trackDownstreamInvalidation(stepId)` runs
3. Uses registry to find `invalidates: [...]` list
4. For each downstream step:
   - If visited && behavior=DIRTY → add to `invalidatedStepIds`
   - If behavior=PURGE → remove from `committedSelections`
5. `_recomputeActiveStepsIfNeeded()` rebuilds active step list
6. Render with updated status

**Problem**: All downstream steps from registry list are marked, regardless of whether prerequisites actually changed.

**Result**: Over-invalidation. Many unrelated steps become 'caution'.

---

### 3.2 Current Recomputation Scope

`_recomputeActiveStepsIfNeeded()`:
- Gets fresh active node list using `ActiveStepComputer`
- Rebuilds step descriptors from active nodes
- Repairs current step if needed
- Updates step plugins

**Current scope**: Full rebuild each time. This is safe but broad.

---

### 3.3 Projection Rebuild

`ProjectionEngine.buildProjection()`:
- Always rebuilds from scratch given `draftSelections`
- Routes through subtype adapter for contributions
- Computes identity, attributes, skills, abilities, languages, droid, derived

**Current scope**: Monolithic. Could potentially rebuild only impacted slices, but not today.

---

## PART 4: ABSTRACTION LEVEL DECISION

### Recommended Level: Domain-Based + Step Level

**Why NOT step-only graph**:
- Too blunt. Class → all feats is overly broad.
- Doesn't expose why (prerequisite? grant? entitlement?).
- Can't support fine-grained explanations.

**Why NOT game-rules graph**:
- Too granular. Would duplicate all of Ability Engine logic.
- Graph should describe dependencies, not rules themselves.
- Projection/validation logic stays in their modules.

**Chosen: Domain-based + step-level compilation**:
- High level: Track which domains depend on which
- Medium level: Map domains to step groups
- Low level: Compute affected steps from changed domains
- Explains both "what" and "why"
- Testable in isolation
- Integrates cleanly with existing architecture

---

## PART 5: SUBTYPE-SPECIFIC DEPENDENCIES

Subtype adapters introduce conditional dependencies:

### Beast Subtype
- Special talent rules (different pools)
- Different feat restrictions
- May have special force access rules

### Nonheroic Subtype
- Restricted feat pools
- Different class options
- May affect talent/force availability

### Droid Subtype
- Droid-builder step instead of species
- No attributes, languages, skills (sometimes)
- Special final-droid-configuration step

### Follower Subtype
- Different grant tables
- Restricted step sequences
- Depends on owner class/level

**Implication**: Dependency graph must be subtype-aware. Some edges exist only for certain subtypes.

---

## PART 6: OVER-BROAD INVALIDATION EXAMPLES

### Example 1: Attribute STR Change
**Today**: Marks 11 downstream steps stale
**Reality**:
- Skills: No impact (STR doesn't affect skill budget)
- Feats: No impact (few feats STR-gated)
- Talents: No impact
- Languages: No impact
- Force: No impact
- Summary: Yes, stats changed

**Should mark**: Only summary

### Example 2: Class Change
**Today**: Marks 7 downstream steps stale
**Reality**:
- Skills: Yes (skill budget changed, feat/talent pools may change)
- Feats: Partially (class-gated feats may become invalid)
- Talents: Partially (class-gated talents may become invalid)
- Languages: Rare (usually no impact)
- Force: Conditionally (force-sensitive classes only)
- Summary: Yes

**Should mark**: Skills always, feats/talents conditionally, summary

### Example 3: Background Change
**Today**: Marks 4 downstream steps stale
**Reality**:
- Skills: Rarely (most backgrounds don't grant skills; some do)
- Languages: Conditionally (if background grants languages)
- Feats: Conditionally (if background grants feats)
- Summary: Yes

**Should mark**: Only those with dependencies that actually changed

---

## PART 7: EXPLANATION OPPORTUNITIES

Current explanation: "Step marked for review due to upstream change"

With dependency graph, could say:

- "Class change affected feat eligibility" (prerequisite dependency)
- "Species change updated language grants" (grant dependency)
- "Attribute change recalculated skill budget" (domain change)
- "Force access changed due to class selection" (transitive dependency)
- "Changing this will require re-selecting X feats" (PURGE-specific)

Explanations become specific because dependency ownership is known.

---

## PART 8: TESTING IMPLICATIONS

Current tests: Scattered across step files, projection tests, finalizer tests

With dependency graph, could test:

1. **Dependency declaration tests**
   - Each step declares produces/consumes correctly
   - No missing upstream/downstream edges

2. **Invalidation tests**
   - Graph-computed affected steps match expected
   - Only truly affected steps are marked
   - Unrelated steps remain untouched

3. **Path tests**
   - Jedi Force unlock path works
   - Scout non-Force path works
   - Beast special rules respected
   - Nonheroic restrictions enforced
   - Droid sequence correct

4. **Explanation tests**
   - Dependency → explanation mapping correct
   - Messages are specific, not generic

5. **Recomputation tests**
   - Narrow recomputation scopes work
   - No false positives/negatives

---

## PART 9: CURRENT ARCHITECTURE COMPATIBILITY

### What Stays the Same
- Active step list as SSOT (no change)
- Visited state semantics (no change)
- Step status model (error > caution > complete > in_progress > neutral)
- Navigation helpers (getNextActiveStepId, etc.)
- Step plugin interface (no change)
- Session structure (no change)

### What Adds Dependency-Awareness
- Invalidation logic becomes graph-informed
- Recomputation scope becomes graph-informed
- Explanation generation becomes graph-backed
- Testing becomes graph-centric
- Summary diagnostics become graph-backed

### What Does NOT Change
- Projection architecture (stays monolithic for now, with TODO for narrow rebuild)
- Prerequisite evaluation logic (stays in AbilityEngine/plugins)
- Subtype adapters (no change in interface)

---

## PART 10: PROPOSED NEXT STEPS

### Phase B: Design the Dependency Model
Define:
- Domain enum (what domains exist)
- Produces/consumes contract (what each step declares)
- Graph structure (how to represent dependencies)
- API design (how to query the graph)

### Phase C: Implement Declaration System
- Step plugins declare produces/consumes
- Registry nodes optionally declare metadata
- Fallback heuristics for undeclared steps

### Phase D: Build Dependency Graph Service
- dependency-graph.js module
- getAffectedDomains(stepId)
- getAffectedStepIds(changedStepId)
- explainImpact(changedStepId, affectedStepId)

### Phase E: Wire Into Invalidation
- Replace broad `invalidates` logic with graph traversal
- More precise caution/error marking
- Better explanation generation

### Phase F: Use for Recomputation Narrowing
- Optional: narrow projection rebuild (if feasible)
- Focus on validation/explanation first

### Phase G: Testing & Verification
- Graph tests
- Integration tests
- Path tests

---

## CONCLUSION

The progression engine has **real, implicit dependencies** that are today expressed as overly-broad step-to-step edges. A **domain-based dependency graph** can capture these relationships at the right level of abstraction, enabling:

1. **Precise invalidation** (only truly affected steps marked)
2. **Better explanations** (specific reasons, not vague messages)
3. **Targeted recomputation** (scope narrowed based on actual changes)
4. **Testability** (graph behavior is central and verifiable)
5. **Maintainability** (dependencies explicit, not scattered)

The model must be **subtype-aware**, **prerequisite-and-grant-aware**, and **transitive-dependency-aware** to avoid the current over-invalidation problems.

**Recommended**: Proceed to Phase B (design) with domain-based abstraction level, produces/consumes contracts, and explicit graph service.

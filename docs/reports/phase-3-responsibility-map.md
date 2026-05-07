# Phase 3: Responsibility Map & Alpha-Risk Assessment

## Large File Classification

### 1. talent-prerequisite-authority.js (5,965 lines)
**Classification**: Content-only, defer split  
**Rationale**: 
- 973 talent entries (data) + 1 utility function (normalizeAuthorityKey)
- Primarily a large data structure, not mixed logic
- Split would increase import complexity for minimal risk reduction
- Not a bottleneck for alpha
**Action**: No split required

### 2. prerequisite-checker.js (2,485 lines)
**Classification**: Post-alpha cleanup  
**Rationale**:
- Contains PrerequisiteChecker class + 20+ helper functions
- Would benefit from split (class prereq checks, feat checks, talent checks, etc.)
- Not blocking alpha functionality
- Safe to defer
**Action**: Document split strategy for post-alpha; no immediate action

### 3. character-sheet.js (5,020 lines)
**Classification**: Active v2 runtime, low mutation risk  
**Rationale**:
- 63 methods including UI wiring and action handlers
- Correctly routes all updates through ActorEngine.updateActor()
- No direct actor.update() calls in active code (only in comments/documentation)
- Proper separation of concerns between event routing and mutations
**Action**: No split required; proper governance in place

### 4. actor-engine.js (4,432 lines)
**Classification**: Canonical mutation engine, requires atomicity hardening  
**Rationale**:
- Correctly centralizes all actor mutations
- **RISK**: Adoption flow (lines 1063-1104) deletes old items/effects BEFORE validating replacements
  - If replacement creation fails, actor is in broken state
- applyMutationPlan() is ordered but not transactional
- Preflight validation before destructive steps would reduce risk
**Action**: ADD PREFLIGHT VALIDATION to adoption flow

### 5. skill-uses.js (3,416 lines)
**Classification**: Post-alpha optimization  
**Rationale**:
- Multiple mini-engines in one file
- Not blocking alpha
**Action**: Defer to post-alpha

### 6. talent-effect-engine.js (2,810 lines)
**Classification**: Active v2 runtime, post-alpha split  
**Rationale**:
- Talent activation logic mixed with passive effects and resource management
- Would benefit from split (passive vs active vs resources)
- Functional for alpha with current structure
**Action**: Defer to post-alpha; document split strategy

### 7. progression-shell.js (2,808 lines)
**Classification**: Active v2 runtime, manageable  
**Rationale**:
- Large but well-structured shell UI framework
- Shell state, navigation, mentor rail are closely coupled
- Not a mutation risk
**Action**: Monitor; defer optimization to post-alpha

### 8. SuggestionEngine.js (2,784 lines)
**Classification**: Post-alpha optimization  
**Rationale**:
- Suggestion orchestration + scoring + filtering
- Functional for alpha
**Action**: Defer to post-alpha

### 9. chargen-main.js (4,099 lines)
**Classification**: Legacy/alternative progression flow  
**Rationale**:
- Old chargen surface; v2 progression is canonical
- If truly legacy, should be disabled entirely or marked clearly
- Document whether this is maintained or deprecated
**Action**: Verify if active; if not, classify as legacy-disabled

### 10. mentor-suggestion-data.js (2,363 lines)
**Classification**: Content/static data  
**Rationale**:
- Mentor suggestion data and content
- Size is due to data volume, not mixed concerns
**Action**: No action required

---

## Mutation Governance Issues

**Total violations found**: 17 blocking (authoritative mutations not via ActorEngine)

**Active runtime violations** (must fix):
- UpdatePipeline.js (2 violations) - used by ProgressionStatePersistence
- UpgradeService.js (3 violations) - droid upgrade system
- gear-templates-engine.js (2 violations) - likely legacy

**Legacy code violations** (classify as legacy-disabled):
- swse-actor.js (4 violations) - legacy fallback sheets
- swse-item-sheet.js (3 violations) - legacy fallback sheet
- persistence-canary.js (2 violations) - test/validation code

**Unclassified**:
- ActorCommands.js (1 violation) - needs investigation
- lightsaber-router.js - needs investigation

---

## Phase 3 Action Items (Priority Order)

### P0: Alpha-Critical Fixes
1. **ActorEngine.apply() adoption preflight** - Add validation before destructive delete
2. **Classify & fix mutation violations** - Route active runtime violations through ActorEngine
3. **Verify legacy sheet mutations** - Ensure they're properly marked as legacy-disabled

### P1: Governance Clarity
1. Document split strategy for post-alpha large files
2. Verify chargen-main.js status (active vs legacy)
3. Classify all mutation exceptions properly

### P2: Post-Alpha
1. Split prerequisite-checker.js
2. Split talent-effect-engine.js
3. Optimize skill-uses.js

---

## No Changes Required In Phase 3

- ✓ character-sheet.js (already properly governed)
- ✓ talent-prerequisite-authority.js (data-only, no split needed)
- ✓ progression-shell.js (manageable structure)
- ✓ CSS/theme changes (deferred)
- ✓ Asset linking (Phase 2 complete)
- ✓ Pack reorganization (Phase 1 complete)

---

## Risk Assessment

**Current Alpha Risks**:
1. **Adoption flow atomicity** - FIXABLE with preflight validation
2. **Active code mutations not via ActorEngine** - FIXABLE by routing through ActorEngine
3. **Ambiguous legacy vs active code** - FIXABLE with classification

**Not Critical for Alpha**:
- Large file splits (functionality works, not a blocker)
- Post-alpha optimization (can be deferred)
- Chargen alternatives (if v2 progression is canonical)

**Summary**: Phase 3 should focus on atomicity hardening and mutation governance, NOT large file splits.

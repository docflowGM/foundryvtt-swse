# 🎯 SWSE SUGGESTIONENGINE AUDIT SUMMARY
## Combined Analysis: Structural + V2 Compliance

**Prepared:** 2026-02-26
**Scope:** SuggestionEngine, SuggestionService, SuggestionEngineCoordinator
**Audience:** Architecture Team, Phase 5C Planning

---

## THE SITUATION

You are at a critical juncture:

1. **Structural Refactor Completed** ✓
   - TalentDB exists (data layer)
   - TalentTreeDB exists (bridge layer)
   - TalentRelationshipRegistry exists (tree ownership SSOT)
   - ClassRelationshipRegistry exists (class access SSOT)
   - Sentinel exists (integrity monitoring)

2. **SuggestionEngine Still Legacy** ✗
   - Doesn't use any of those new systems
   - Reads compendiums directly
   - Uses string matching for trees
   - Duplicates prerequisite logic
   - Directly accesses sheet state

3. **The Gap**
   - **New architecture is ready** but SuggestionEngine can't use it
   - **Old paths still work** but will break when V2 migration happens
   - **No integrity checking** – can suggest ineligible talents
   - **Two sources of truth** for prerequisites, trees, eligibility

---

## AUDIT FINDINGS

### STRUCTURAL AUDIT (Main report)

**Key Problems:**

| Problem | Severity | Impact |
|---------|----------|--------|
| No TalentDB usage | CRITICAL | Bypasses eligibility checks |
| No tree ownership validation | CRITICAL | Can suggest wrong-tree talents |
| String-based tree matching | CRITICAL | Fragile, breaks on rename |
| Prerequisite logic duplication | HIGH | Two sources of truth |
| No registry integration | CRITICAL | Can't validate anything |
| Hardcoded assumptions | HIGH | Breaks with normalization |

**Architecture Violations:**
- ❌ Reads compendiums directly (Rule 9)
- ❌ Assumes system.tree field (Rule 8)
- ❌ No registry lookups (Rule 7)
- ❌ Inference outside registries (Rule 6)
- ❌ String matching (Rule 7)
- ❌ Duplicate logic (Rule 8)

**Performance Issues:**
- Reloads compendium each time (~100ms overhead)
- Parses prerequisites twice per talent
- No caching of registry results
- O(n²) string matching

**Refactor Complexity:** MEDIUM (3-4 days)
**Payoff:** HIGH (enables all V2 features)

---

### V2 COMPLIANCE AUDIT (Detailed report)

**Compliance Score: 6/10 (60%)**

| Rule | Status | Details |
|------|--------|---------|
| Rule 1: No rules math in sheets | ✗ | Reads system.skills, system.attributes directly |
| Rule 2: No mutation outside ActorEngine | ✓ | Pure, non-mutating |
| Rule 3: No direct actor.update() | ✓ | No mutations |
| Rule 4: No direct item.update() | ✓ | No mutations |
| Rule 5: Output through chat | ✓ | UI layer handles |
| Rule 6: No inference outside registries | ✗ | Prerequisite parsing in wrong place |
| Rule 7: Registries are SSOT | ✗ | Doesn't use registries |
| Rule 8: No relationship duplication | ✗ | Duplicates tree ownership logic |
| Rule 9: No compendium in decision engines | ✗ | Queries compendium directly |
| Rule 10: No dynamic imports | ✓ | Static imports only |

**Good News:**
- ✓ No mutation violations
- ✓ Proper execution order
- ✓ Safe caching strategy
- ✓ Cache invalidation works

**Critical Gaps:**
- ✗ Doesn't delegate to registries
- ✗ Reads sheet state directly
- ✗ Duplicates prerequisite logic
- ✗ Will break on V2 migration

---

## COMBINED RISK ASSESSMENT

### If NOT Refactored

**Timeline:**
- **Now:** Works because legacy paths still exist
- **Phase 5D (1-2 weeks):** Registry-only migration starts
  - **SuggestionEngine breaks** – can't find talents
  - **Compendium queries fail** – packs are registry-only
  - **String matching fails** – no system.tree fields
  - **Prerequisite parsing fails** – assumes old schema
- **Phase 6:** Sentinel enforcement turned on
  - **All suggestion violations reported** as errors
  - **GM can't level up** – suggestions fail

**Breakage Scope:**
- Chargen talent selection ❌
- Level-up talent selection ❌
- Mentor suggestions ❌
- Prestige class unlocks ❌
- House rule talents ❌

### If Refactored (Recommended)

**Timeline:**
- **This week (3-4 days):** Refactor SuggestionEngine
  - Uses TalentDB only
  - Delegates to PrerequisiteChecker
  - Uses ActorEngine for sheet data
  - Validates via registries
- **Next week:** Phase 5D migration proceeds
  - SuggestionEngine ready
  - No breakage
  - Sentinel can validate
  - House rules work
- **Phase 6:** New features enabled
  - Prestige tree unlocks
  - Dynamic house rules
  - Build direction tracking
  - Mentor intelligence

**Benefit:**
- ✓ Unblocked progression
- ✓ Enabled prestige classes
- ✓ Enabled house rules
- ✓ Enabled Sentinel diagnostics
- ✓ Future-proof architecture

---

## RECOMMENDED REFACTOR STRATEGY

### Phase 5C-1: Registry Integration (Days 1-2)

**Scope:** SuggestionEngine becomes registry-aware

**Changes:**
1. Add registry imports: `TalentDB`, `TalentTreeDB`, `TalentRelationshipRegistry`, `ClassRelationshipRegistry`
2. Create `_getTalentCandidatesForActor()` method:
   ```javascript
   // BEFORE (legacy)
   const talents = await talentPack.getDocuments();

   // AFTER (registry)
   const talents = TalentDB.forActor(actor, classesDB);
   ```
3. Create `_validateTalentEligibility()` method:
   ```javascript
   // Checks:
   // - Talent exists in TalentDB
   // - Talent owned by a tree (TalentRelationshipRegistry)
   // - Actor can access that tree (ClassRelationshipRegistry)
   ```
4. Add Sentinel reporting for eligibility violations

**Tests:**
- Unit: eligibility validation
- Unit: caching behavior
- Integration: chargen eligibility

**Effort:** 1.5 days
**Risk:** LOW (backward compatible)

### Phase 5C-2: Prerequisite Consolidation (Day 2)

**Scope:** SuggestionEngine delegates ALL prerequisite work to PrerequisiteChecker

**Changes:**
1. Remove `_extractPrerequisiteNames()` method (~20 lines)
2. Remove `_usesTrainedSkill()` method (~30 lines)
3. Remove prerequisite parsing from `_evaluateTalent()` (~40 lines)
4. Refactor `_isChainContinuation()` to call `PrerequisiteChecker`:
   ```javascript
   // BEFORE (duplicate logic)
   const prereqNames = this._extractPrerequisiteNames(prereqString);
   for (const name of prereqNames) {
       if (actorState.ownedPrereqs.has(name.toLowerCase())) {
           return name;
       }
   }

   // AFTER (delegate)
   const result = PrerequisiteChecker.checkTalentPrerequisites(actor, talent);
   if (result.met) return talent.name;
   ```
5. Simplify `actorState` – only store owned items, not parsed data

**Tests:**
- Unit: chain continuation logic
- Unit: skill matching
- Integration: prerequisite evaluation

**Effort:** 1 day
**Risk:** MEDIUM (complex logic, needs thorough testing)

### Phase 5C-3: ActorEngine Delegation (Day 3 morning)

**Scope:** Sheet state access goes through ActorEngine

**Changes:**
1. Replace sheet access in `_buildActorState()`:
   ```javascript
   // BEFORE
   const trainedSkills = new Set();
   const skills = actor.system?.skills || {};
   for (const [key, skill] of Object.entries(skills)) {
       if (skill?.trained) trainedSkills.add(key);
   }

   // AFTER
   const trainedSkills = new Set(ActorEngine.getTrainedSkills(actor));
   ```
2. Replace ability access:
   ```javascript
   // BEFORE
   const abilities = actor.system?.attributes || {};
   const highestScore = Math.max(...Object.values(abilities).map(a => a?.total ?? 10));

   // AFTER
   const abilities = ActorEngine.getAbilities(actor);
   const highestScore = Math.max(...abilities.map(a => a.total));
   ```
3. Add audit logging

**Tests:**
- Unit: ActorEngine delegation
- Integration: data access validation
- Performance: check for regressions

**Effort:** 0.5 days
**Risk:** LOW (straightforward delegation)

### Phase 5C-4: Sentinel Integration (Day 3 afternoon)

**Scope:** Add diagnostics for eligibility violations

**Changes:**
1. Add Sentinel report for ineligible talents:
   ```javascript
   if (!this._validateTalentEligibility(talent, actor, classesDB)) {
       Sentinel.report('suggestion', Sentinel.SEVERITY.ERROR,
           `Ineligible talent suggested`,
           { talentId: talent.id });
   }
   ```
2. Add Sentinel report for prerequisite divergence:
   ```javascript
   if (prereqResult !== expectedResult) {
       Sentinel.report('data', Sentinel.SEVERITY.ERROR,
           `Prerequisite mismatch`,
           { prereq: name, result1, result2 });
   }
   ```
3. Add performance monitoring

**Tests:**
- Integration: Sentinel diagnostics
- Integration: error reporting

**Effort:** 0.5 days
**Risk:** LOW (diagnostic only)

### Phase 5C-5: Testing & Finalization (Day 4)

**Test Matrix:**
- ✓ Regression: All suggestion types (chain, skill, ability, class, prestige)
- ✓ Integration: Chargen talent selection
- ✓ Integration: Level-up talent selection
- ✓ Multiclass: Soldier/Jedi, Force Adept, Hybrid classes
- ✓ Performance: <300ms for 200 talents
- ✓ Edge cases: No trees, no class, no skills
- ✓ Sentinel: Diagnostics fire correctly

**Effort:** 1 day
**Risk:** LOW (test-only)

---

## REFACTORING ROADMAP

```
WEEK 1 (WHEN YOU DECIDE):
├─ Day 1-2: Phase 5C-1 (Registry Integration)
│  ├─ Add imports & methods
│  ├─ Implement TalentDB lookup
│  ├─ Add eligibility validation
│  └─ Unit tests
├─ Day 2: Phase 5C-2 (Prerequisite Consolidation)
│  ├─ Remove duplicate parsing
│  ├─ Delegate to PrerequisiteChecker
│  ├─ Simplify actorState
│  └─ Unit tests
├─ Day 3 AM: Phase 5C-3 (ActorEngine Delegation)
│  ├─ Replace system.* access
│  ├─ Add audit logging
│  └─ Unit tests
├─ Day 3 PM: Phase 5C-4 (Sentinel Integration)
│  ├─ Add diagnostic reporting
│  └─ Integration tests
└─ Day 4: Phase 5C-5 (Testing)
   ├─ Full regression suite
   ├─ Multiclass scenarios
   ├─ Performance benchmarks
   └─ Merge to main

WEEK 2 (PHASE 5D):
├─ Registry-only migration
├─ SuggestionEngine ready ✓
└─ No breakage ✓

WEEK 3-4 (PHASE 6):
├─ Prestige tree unlocks
├─ House rule support
├─ Build tracking
└─ Enhanced mentor
```

---

## COST-BENEFIT ANALYSIS

### Cost
- **Time:** 3-4 days of focused work
- **Complexity:** MEDIUM (2-3 moderate refactors)
- **Risk:** LOW (backward compatible, testable)
- **Disruption:** NONE (isolated changes)

### Benefit
- **Unblocks:** Registry-only migration
- **Enables:** Prestige classes
- **Enables:** House rules
- **Enables:** Sentinel diagnostics
- **Prevents:** 2-week blockers in Phase 5D
- **Prevents:** 1-week rollback if not done

### ROI
- **Time saved:** 2-3 weeks (prevention of Phase 5D delay)
- **Features enabled:** 4+ major features
- **Technical debt:** Eliminated duplication
- **Maintainability:** MUCH improved

---

## CRITICAL SUCCESS FACTORS

### Must Haves
1. ✓ Registry lookups before any suggestion
2. ✓ PrerequisiteChecker as sole prerequisite authority
3. ✓ ActorEngine for all sheet data access
4. ✓ Sentinel diagnostics enabled
5. ✓ Full regression test coverage

### Nice to Haves
1. Performance optimization (caching)
2. Mentor intelligence enhancements
3. Build direction tracking
4. Future house rule support

### Kill Switches
- ✗ Any actor mutations
- ✗ Direct compendium queries remaining
- ✗ String-based tree matching remaining
- ✗ Prerequisite duplication remaining

---

## DECISION POINT

### Question
**When should we start Phase 5C refactoring?**

### Recommendation
**Start IMMEDIATELY**

**Rationale:**
1. **Window is closing** – Phase 5D planned for next week
2. **Prevention is cheaper** – 3-4 days now vs. 2-3 weeks delay later
3. **No blocking dependencies** – Can start today
4. **Low risk** – Backward compatible, fully testable
5. **High payoff** – Unblocks 4+ features
6. **Technical debt** – Eliminates legacy coupling

### Next Steps
1. **Approve refactor plan** (30 minutes)
2. **Schedule 4 days** (this week)
3. **Assign developer** (1 person, focused)
4. **Run test suite** (after each phase)
5. **Merge to main** (after Day 4 testing)
6. **Proceed to Phase 5D** (next week, unblocked)

---

## SUMMARY

| Dimension | Before Refactor | After Refactor |
|-----------|-----------------|-----------------|
| **V2 Compliance** | 60% | 100% |
| **Mutation Safety** | ✓ Safe | ✓ Safe |
| **Registry Usage** | 0% | 100% |
| **Prerequisite Duplication** | 2 sources | 1 source |
| **Compendium Queries** | Direct | Via TalentDB |
| **Sheet Access** | Direct | Via ActorEngine |
| **Sentinel Integration** | None | Full |
| **Prestige Support** | ❌ Blocked | ✓ Enabled |
| **House Rules Support** | ❌ Blocked | ✓ Enabled |
| **Phase 5D Ready** | ❌ Will break | ✓ Ready |

---

## CONCLUSION

**SuggestionEngine is a blocker.** It's not a show-stopper, but it's **preventing you from moving forward** with the V2 architecture.

**The fix is straightforward:** Make it use the new registries instead of legacy paths. **3-4 days, low risk, high payoff.**

**Without this refactor:**
- Phase 5D will delay 2-3 weeks
- Prestige classes don't work
- House rules can't be supported
- Sentinel can't validate
- Technical debt compounds

**With this refactor:**
- Phase 5D proceeds on schedule
- Prestige classes work
- House rules supported
- Sentinel validates
- Architecture is clean

**Recommendation: Start today.**

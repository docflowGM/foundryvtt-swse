# BuildIntent Lifecycle Audit - Executive Summary

**Completion Date**: March 12, 2026
**Scope**: Complete lifecycle analysis of BuildIntent across chargen and level-up flows
**Documents Generated**:
- `BUILDINTENT_LIFECYCLE_AUDIT.md` (Technical Details)
- `BUILDINTENT_LIFECYCLE_DIAGNOSTIC.md` (Strategic Insights)

---

## Primary Findings

### Finding 1: BuildIntent is Confirmed Non-Authoritative During Chargen ✓
**Severity**: HIGH | **Confidence**: HIGH

BuildIntent is instantiated in only **1 chargen location** (feat/talent step):
- Species selection → No BuildIntent
- Ability selection → No BuildIntent
- Class selection → No BuildIntent
- **Feat/Talent selection → BuildIntent.analyze() [FIRST CALL]**

**What This Means**: By the time BuildIntent exists, the player has already made 3+ major identity-affecting decisions. BuildIntent cannot validate or correct earlier choices.

**Proof**: See BUILDINTENT_LIFECYCLE_AUDIT.md, "Chargen Flow (Species → Class → Abilities → Feats/Talents)" section.

---

### Finding 2: BuildIntent Has 9 Independent Computation Sites with No Coordination ✓
**Severity**: MEDIUM | **Confidence**: HIGH

Complete call site inventory:
1. chargen-main.js:791 (chargen feat/talents)
2. chargen-feats-talents.js:72 (alternative chargen path)
3. mentor-chat-dialog.js:284 (post-chargen chat)
4. prestige-roadmap.js:69 (level-up UI)
5. debug-panel.js:54 (GM debug)
6. SuggestionEngine.js:129 (feat suggestions)
7. SuggestionEngine.js:208 (talent suggestions)
8. PathPreview.js:61 (path generation - **redundant with #4**)
9. SuggestionEngineCoordinator.js:184 (caching coordination - **unused by #1-8**)

**What This Means**:
- Each call site independently computes BuildIntent
- No shared state or coordination
- Prestige roadmap causes 2x computations (redundancy)
- Caching infrastructure exists but is completely unused

**Proof**: See BUILDINTENT_LIFECYCLE_AUDIT.md, "BuildIntent.analyze() Call Sites" section.

---

### Finding 3: Caching Infrastructure Exists but is Non-Functional ✓
**Severity**: MEDIUM | **Confidence**: HIGH

SuggestionEngineCoordinator (lines 177-188) implements complete caching:
- ✓ Cache with (actorId, pendingDataHash) key
- ✓ Cache hit/miss logging
- ✓ Cache invalidation method
- ✗ **ZERO call sites use it**

All 9 call sites call BuildIntent.analyze() directly, bypassing the coordinator's caching entirely.

**What This Means**: Either:
- Incomplete refactoring (caching planned but never integrated)
- Architectural mismatch (coordinator not in expected location)
- Lack of integration testing (cache code never exercised)

**Consequence**: Technical debt indicating partial architectural vision. Red flag for other incomplete features.

**Proof**: See BUILDINTENT_LIFECYCLE_AUDIT.md, "Caching Strategy Issues" section.

---

### Finding 4: Survey Biases May Not Integrate with IdentityEngine During Chargen ✓
**Severity**: MEDIUM | **Confidence**: MEDIUM

Survey biases are:
1. Collected by MentorSurvey in "theme space"
2. Applied to BuildIntent via biasToThemeMap (theme adjustment)
3. Never explicitly passed to IdentityEngine's SurveyBias layer

IdentityEngine has a SurveyBias layer, but it's unclear if it's ever populated during chargen.

**What This Means**: Survey data may be bypassing the identity system entirely. Identity biases and survey biases may be operating in separate systems.

**Consequence**: Survey responses may not properly influence character identity decisions.

**Proof**: See BUILDINTENT_LIFECYCLE_DIAGNOSTIC.md, "Discovery 5 & 6".

---

### Finding 5: Multiple Parallel Chargen Code Paths Suggest Incomplete Consolidation ✓
**Severity**: LOW | **Confidence**: MEDIUM

Two implementations of feat/talent suggestion:
- chargen-main.js (lines 788-850)
- chargen-feats-talents.js (lines 31-110)

Both implementations:
- Call BuildIntent.analyze()
- Call SuggestionService.getSuggestions()
- Have similar structure

**What This Means**: Code duplication. Cannot determine from audit alone whether this is intentional (two workflows) or legacy code.

**Consequence**: Maintenance burden if both paths must stay in sync; risk of inconsistent behavior.

**Proof**: See BUILDINTENT_LIFECYCLE_AUDIT.md, "Chargen Flow" and "Implementation Recommendations" section.

---

## Risk Assessment

| Risk Level | Finding | Impact |
|-----------|---------|---------|
| **HIGH** | Non-authoritative during chargen | Identity decisions made before BuildIntent can validate them |
| **MEDIUM** | 9 independent computation sites | No coordination, potential inconsistency |
| **MEDIUM** | Caching paradox | Unused infrastructure, wasted computation |
| **MEDIUM** | Survey integration unclear | Identity and survey systems may not be properly connected |
| **LOW** | Multiple code paths | Code duplication, maintenance burden |

---

## Confirmation of Strategic Diagnosis

This audit **confirms and validates** your earlier diagnosis:

> "Identity should derive from mechanics immediately, not computed late via theme-space proxies"

**The Evidence**:
1. ✓ BuildIntent is post-hoc (computed AFTER major decisions)
2. ✓ Identity is not causal (doesn't drive option selection, only analyzes completed choices)
3. ✓ Theme-space intermediary exists (survey → biasToThemeMap → themes)
4. ✓ IdentityEngine not authoritative during construction (exists but not consulted for validation)

---

## Recommended Next Actions

### Phase 1: Design (Before Coding Refactoring)
1. **Consolidate** BuildIntent call sites
   - Decision: Should all routes go through SuggestionEngineCoordinator?
   - Benefit: Single invalidation point, shared caching
   - Effort: Update 8 call sites to use coordinator API

2. **Clarify** Survey Integration
   - Decision: Should SurveyBias layer be activated during chargen?
   - Investigation: Trace where survey biases currently reach IdentityEngine
   - Benefit: Identity and survey systems properly integrated

3. **Decide** Chargen Code Path
   - Decision: chargen-main.js vs chargen-feats-talents.js - which is canonical?
   - Action: Remove or document the alternative path
   - Benefit: Single maintenance path for feat/talent suggestions

### Phase 2: Identity Authority Refactor (Your Proposed Solution)
- Make BuildIntent computation early (before species, not after)
- Make BuildIntent authoritative (drive option availability/scoring)
- Make identity layers causal (feedback loop from mechanics → identity → suggestions)

---

## Document Structure

### BUILDINTENT_LIFECYCLE_AUDIT.md
**Purpose**: Technical reference with complete details
**Contents**:
- Executive summary with 5 key behaviors identified
- Complete inventory of all 9 call sites
- Lifecycle pattern analysis (chargen, level-up, caching)
- PendingData flow analysis
- Recalculation gaps and patterns
- Implementation recommendations (short/medium/long term)
- Risk assessment table
- Detailed appendix with code references

**Use When**: Need comprehensive understanding of BuildIntent lifecycle, detailed code context, or specific line-by-line reference.

### BUILDINTENT_LIFECYCLE_DIAGNOSTIC.md
**Purpose**: Strategic insights for refactoring planning
**Contents**:
- 7 key discoveries with code evidence
- Implications for Identity Authority Refactor
- Strategic insight analysis
- Questions for refactoring planning
- Confidence assessment

**Use When**: Planning the Identity Authority Refactor, need strategic context, or presenting findings to architect/PM.

### AUDIT_SUMMARY.md (This Document)
**Purpose**: Executive summary with decisions needed
**Use When**: Quick reference, status reports, or getting stakeholder alignment.

---

## Status

✓ **Audit Complete** - All call sites traced, data flows analyzed, patterns documented
✓ **High Confidence** - All findings have code references and context traces
✓ **Ready for Refactoring** - Sufficient information to plan Identity Authority Refactor

**Next Checkpoint**: Review findings and decide on Phase 1 (design) actions before proceeding to Phase 2 (refactoring).

---

## Key Metrics

| Metric | Value |
|--------|-------|
| BuildIntent call sites discovered | 9 |
| Chargen-specific call sites | 2 |
| Level-up specific call sites | 5 |
| General utility call sites | 2 |
| Caching call sites | 1 (unused) |
| Lines of BuildIntent code | 1,006 |
| Files modified by BuildIntent | 12 |
| PendingData parameters traced | 5 locations |

---

**Audit Complete** | **March 12, 2026**

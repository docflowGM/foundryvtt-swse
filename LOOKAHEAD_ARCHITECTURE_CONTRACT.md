# SWSE Suggestion Engine Lookahead Architecture

**Status:** Design Contract (No Code)
**Purpose:** Define 3-Horizon Foresight Model for Suggestion Scoring
**Scope:** Architecture & Decision Model Only
**Date:** March 2026

---

## EXECUTIVE SUMMARY

Introduce multi-horizon foresight into SuggestionScorer to make suggestions feel strategic without railroading builds. The system will evaluate options across immediate synergy, 3-level lookahead for mechanical breakpoints, and long-term identity trajectory — all while preserving player agency and IdentityEngine authority.

**Core Constraint:** All lookahead is ephemeral, non-punitive, and informational only. No prestige locking, no endgame simulation, no authority shifts from IdentityEngine.

---

## PHASE 1: HORIZON DEFINITIONS

### Horizon 1: Immediate (Level 0)

**Scope:** Current character state only. No projection.

**Signals Evaluated:**
- Direct feat/talent synergy with existing choices
- Mechanical attribute alignment (BAB, Defense, skills)
- Class-specific prerequisites met NOW
- Skill prerequisites satisfied NOW
- Ability score prerequisites met NOW

**Scoring Components:**

| Metric | Definition | Example |
|--------|-----------|---------|
| **Feat Chain** | Feat directly enables/improves existing choice | Force Sensitivity (already have) → Force Training (trains the ability) |
| **BAB Scaling** | Option scales with current BAB | Weapon specialization with existing weapon feat |
| **Defense Impact** | Option improves AC/saves/HP | Armor specialization aligning with equipped armor |
| **Skill Synergy** | Option uses already-trained skill | Acrobatics feat + Acrobatics training |
| **Force DC** | Force power DC scales with current abilities | Attack power with high STR |
| **Action Economy** | Option frees actions or grants bonus action | Swift action ability when already have bonus action usage |
| **Identity Alignment** | Option matches current IdentityBias score | High Force bias + Force feat = high alignment |

**Weighting:** Each component normalized to 0-1, then averaged or weighted by mechanic type.

**Output:** Immediate Score (0-1)
- High (0.7-1.0): Strong current synergy
- Medium (0.4-0.7): Reasonable fit
- Low (0.0-0.4): Weak current value

**Safety:** Immediate Score is NEVER negative (no penalties), only absence of bonus.

---

### Horizon 2: Short-Term Mechanical (Levels +1 to +3)

**Scope:** Character at future level (L+1, L+2, L+3) given LIKELY progression path.

**Data Used (Estimated, Non-Simulated):**
- Expected BAB progression (class BAB table only, no simulated feats)
- Probable bonus feat availability (estimate based on class/level)
- Prestige path likelihood (based on current BuildIntent signals)
- Talent tree depth (can player reach next tier in this feat chain?)

**Evaluation Points:**

| Checkpoint | Evaluation |
|-----------|-----------|
| **Level +1** | Is feat chain complete at L+1? (e.g., both Weapon Focus + Weapon Specialization available?) |
| **Level +2** | Does BAB breakpoint matter? (e.g., Rapid Shot threshold at BAB +6) |
| **Level +3** | Prestige eligibility: Missing pre-reqs before prestige qualification? |

**Scoring Components:**

| Metric | Definition | Score Impact |
|--------|-----------|--------------|
| **Prerequisite Chain Completeness** | Option part of a chain that COULD complete within +3 levels | +0.2 if completable, 0 if blocked |
| **Breakpoint Alignment** | Option unlocks at mechanical threshold (BAB, attributes) | +0.15 if breakpoint found |
| **Prestige Prerequisite** | Option required for likely prestige class | +0.25 if on current prestige path |
| **Talent Tree Eligibility** | Option enables next talent in tree | +0.15 if tree accessible |

**Constraints:**
- Use only PUBLISHED data (BAB tables, feat prerequisites, prestige reqs)
- NO simulation of future feat selections
- NO assumption of future ability increases (except declared level-ups)
- Estimate based on class BAB progression ONLY

**Output:** Short-Term Score (0-1)
- High (0.7-1.0): Enables breakpoint within +3 levels
- Medium (0.4-0.7): Part of reasonable chain
- Low (0.0-0.4): Uncertain future value

**Safety:** Cannot score higher than Immediate if current prerequisites missing (short-term can't compensate for broken chain).

---

### Horizon 3: Identity Projection (Levels +4 to +6)

**Scope:** Character identity trajectory based on current BuildIntent signals.

**Concept:** "If character continues current build direction, does this option support or diverge from that trajectory?"

**Trajectory Detection:**
- Analyze BuildIntent.primaryThemes (what is character becoming?)
- Identify dominant mechanical focus (Force-heavy? Combat-heavy? Support?)
- Detect prestige path hints (what classes align with signals?)

**Scoring Components:**

| Metric | Definition | Weight | Score |
|--------|-----------|--------|-------|
| **Theme Alignment** | Option reinforces primary theme | Low (0.1) | +0.1 if theme match, 0 otherwise |
| **Archetype Consistency** | Option fits likely long-term archetype | Low (0.1) | +0.1 if consistent, -0.05 if diverges* |
| **Prestige Trajectory** | Option creates option for future prestige | Low (0.15) | +0.15 if enables prestige, 0 otherwise |
| **Identity Flexibility** | Option keeps multiple paths open | Medium (0.2) | +0.1 if creates new option, 0 if forces specificity |

*Divergence penalty is VERY light (only -0.05) and **optional** — this layer is informational, not punitive.

**Constraints:**
- This is the LEAST authoritative layer
- Cannot create hard locks (e.g., "must pick this to hit prestige")
- Allows creative divergence without penalty
- Must account for identity drift as valid player choice

**Output:** Identity Projection Score (0-1)
- High (0.6-1.0): Supports likely trajectory
- Medium (0.4-0.6): Neutral to trajectory
- Low (0.0-0.4): Diverges from trajectory, but NOT penalized

**Safety Constraint:** Identity Projection Score can boost immediately available option by at most +0.2 total. Cannot overcome weak Immediate Score.

---

## PHASE 2: SCORING MODEL

### Formula

```
FINAL_SCORE = (Immediate × 0.6) + (ShortTerm × 0.25) + (Identity × 0.15)
```

Where:
- **Immediate (0.6 weight):** Current synergy. This is THE primary signal.
- **ShortTerm (0.25 weight):** Mechanical breakpoints within player's decision horizon.
- **Identity (0.15 weight):** Directional signal, never overrides mechanics.

### Weight Justification

| Weight | Justification |
|--------|--------------|
| 0.6 (Immediate) | Players primarily care about "does this help NOW?" Respects player agency because it's about current state, not forced direction. |
| 0.25 (Short-Term) | Players think ~3 levels ahead. This captures "am I preparing for something soon?" without heavy simulation. |
| 0.15 (Identity) | Provides hints about character direction without railroading. "You might be becoming a Force user..." not "You MUST be a Force user." |

### Dynamic Weight Shifts (Optional)

In future phases, weights might shift based on context:
- **During prestige qualification push:** Short-Term weight → 0.35, Identity → 0.05
- **During early levels (1-3):** Immediate weight → 0.75, Short-Term → 0.15, Identity → 0.1
- **During level 19-20 (prestige planning):** Short-Term → 0.4, Identity → 0.25

**NOTE:** This is optional for v1. Fixed weights are acceptable.

### Score Clamping

Final score is normalized to 0-1 range:
```
CLAMPED_SCORE = MIN(1.0, FINAL_SCORE)
```

No option ever penalized below 0 (all scores are bonuses for relevance, not penalties for irrelevance).

---

## PHASE 3: SAFETY CONSTRAINTS

### Hard Constraints (Non-Negotiable)

**Constraint 1: No Endgame Simulation**
- Cannot evaluate beyond 6 levels (lookahead ceiling)
- Cannot simulate feat selections after current level
- Cannot simulate ability score increases beyond declared leveling plan
- Cannot branch "what if" scenarios

**Constraint 2: No Prestige Railroading**
- Prestige path suggestions must NEVER lock or hard-require an option
- Prestige eligibility scoring is always optional context, never blocking
- A non-prestige path must always be viable and not penalized
- Example: "Strong Prestige Path" suggestion does NOT disable alternative builds

**Constraint 3: No Identity Authority**
- Identity Projection scores must NEVER override immediate mechanical relevance
- IdentityEngine.computeTotalBias() remains THE source of truth for bias
- Lookahead cannot modify or reweight identity — only reflect it
- Cannot use lookahead to "correct" identity (e.g., penalizing off-theme choices)

**Constraint 4: No Suggestion Stagnation**
- Repeat visits to same character state must return identical scores (deterministic)
- Scores must improve if character state improves (monotonic in mechanical terms)
- Must handle tie-breaking consistently (alphabetic by default, then by source)

**Constraint 5: Performance Ceiling**
- Lookahead computation must complete in <100ms per option evaluated
- No caching required (all computation is ephemeral, run fresh each time)
- Maximum 20 options scored per evaluation (chargen typically 4-8)

### Soft Constraints (Design Principles)

**Principle 1: Preserve Agency**
- Suggestions should inform, not direct
- Least-encouraged option should still be legal and viable
- Divergence from suggested path should not feel punished

**Principle 2: Mechanical Integrity**
- All short-term evaluations use ONLY published mechanics
- Cannot invent mechanics or assume non-standard rules
- Prerequisites strictly follow RAW (Rules as Written)

**Principle 3: Identity Respect**
- Current IdentityBias is never questioned or overridden
- Identity Projection suggests, never imposes
- Player can build against identity without penalty (only loss of bonus)

---

## PHASE 4: INTEGRATION CONTRACT

### Input Dependencies

SuggestionScorer receives from external systems:

```
SuggestionScorer.score(option, actor, buildIntent, context) {
  // Reads:
  - actor.system.attributes (abilities, BAB)
  - buildIntent.primaryThemes (identity trajectory)
  - buildIntent.prestigeAffinities (prestige likelihood)
  - IdentityEngine.computeTotalBias(actor) (bias vector)
  // Uses published tables:
  - ClassSuggestionEngine.getClassBAB(className)
  - PrerequisiteChecker.checkFeatChain(featName)
  // NO calls to simulate future state
}
```

### Authority Preservation

| System | Role | Preserved? |
|--------|------|-----------|
| **IdentityEngine** | Authority on bias/identity | ✓ Lookahead reads but never modifies |
| **BuildIntent** | Authority on signals | ✓ Lookahead reads but never modifies |
| **SuggestionScorer** | Authority on option scoring | ✓ Lookahead enhances scoring, not overrides |
| **PrerequisiteChecker** | Authority on legal options | ✓ Lookahead respects legality absolutely |

### Data Flow

```
Actor State
    ↓
IdentityEngine.computeTotalBias() → Identity Vector
    ↓
BuildIntent.analyze() → Signal Analysis (themes, prestige paths)
    ↓
SuggestionScorer.score(option)
    ├─ Immediate: Score current synergy
    ├─ ShortTerm: Evaluate +1 to +3 breakpoints
    ├─ Identity: Project trajectory
    ↓
FINAL_SCORE = (Immediate × 0.6) + (ShortTerm × 0.25) + (Identity × 0.15)
    ↓
Ranking & Presentation
```

**Critical:** All lookahead results are EPHEMERAL. No persistence, no state mutation, no caching across evaluations.

---

## PHASE 5: OUTPUT FORMAT

### Required Decisions

When implementation begins, you must have answers for:

1. **Immediate Scoring:**
   - Is immediate score a normalized average of components, or weighted sum?
   - How is "no match" represented? (0 or negative?)
   - Do all component types have equal weight, or do some matter more?

2. **Short-Term Evaluation:**
   - For "completeness" checks, how many levels ahead do you look? (L+1 only, or L+1 through L+3?)
   - For prestige checks, do you evaluate only current prestige path, or top 3?
   - How are "missing prerequisites" weighted vs "blocked by future reqs"?

3. **Identity Projection:**
   - Is archetype divergence allowed? (Yes, with minimal penalty)
   - How is "flexibility" measured? (# of new prestige paths opened?)
   - Should this layer have ANY negative scoring, or only zero/positive? (Recommend zero/positive only)

4. **Tie-Breaking:**
   - When two options have same score, sort by what? (Recommendation: source, then alphabetic)
   - Are some source types preferred? (Class feat > general feat > prestige feat?)

5. **Edge Cases:**
   - What happens if actor has no BuildIntent yet? (Fallback to Immediate only)
   - What happens if prestige data is incomplete? (Prestige score = 0, not error)
   - What happens if option is legal but has no synergy? (Return 0, not negative)

### Example Decision Already Made

**For Horizon 2 (Short-Term) + Prestige:**
- Check if option is prerequisite for top prestige affinity
- If yes, score +0.25
- If prestige is low-confidence (<0.3), reduce to +0.10
- This respects prestige choice without forcing it

---

## IMPLEMENTATION READINESS CHECKLIST

- [ ] Horizon 1 (Immediate) metric list approved
- [ ] Horizon 2 (Short-Term) checkpoint definitions approved
- [ ] Horizon 3 (Identity Projection) trajectory detection approach approved
- [ ] Scoring formula weights (0.6 / 0.25 / 0.15) approved
- [ ] Safety constraints understood and accepted
- [ ] All 5 open decisions above answered
- [ ] Integration with IdentityEngine verified (read-only, no mutations)
- [ ] Performance requirements (<100ms) confirmed achievable

---

## RISK ASSESSMENT

### Risks Mitigated

| Risk | Mitigation |
|------|-----------|
| Endgame Simulation | Hard ceiling at +6 levels, no feat simulation |
| Prestige Railroading | Prestige score ≤0.25 impact, always optional |
| Identity Authority Loss | IdentityEngine read-only, no override paths |
| Performance Degradation | <100ms ceiling, no caching/branching |
| Suggestion Stagnation | Deterministic scoring, monotonic in game terms |

### Residual Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Player confusion about scoring | Low | Transparent reason text explaining each component |
| Unexpected weight preference | Medium | A/B test weights in next phase if needed |
| Incompleteness in breakpoint data | Medium | Graceful degradation: missing data → 0 score, not error |

---

## FUTURE ENHANCEMENTS (Post-v1)

**Not for this phase, but captured for future consideration:**

- Dynamic weight shifting based on player level
- Machine-learning weighting based on player behavior patterns
- Explicit "build archetype" selection to guide projection
- Optional "what-if" simulation mode (for advanced players only)
- Precedent-based scoring ("players with this build typically pick...")

---

## SUCCESS CRITERIA

When implemented, this architecture will enable:

1. ✓ Suggestions that feel strategic without being prescriptive
2. ✓ Immediate synergy as primary signal (respects agency)
3. ✓ Mechanical breakpoint awareness within reasonable horizon
4. ✓ Identity trajectory hints without locking paths
5. ✓ No prestige railroading or endgame simulation
6. ✓ Full preservation of IdentityEngine authority
7. ✓ Deterministic, reproducible scoring
8. ✓ <100ms evaluation per option

---

## APPROVAL GATES

**Before Implementation:**
- [ ] All 5 open decisions answered
- [ ] Weight formula (0.6 / 0.25 / 0.15) approved
- [ ] Immediate scoring method specified
- [ ] Short-term prestige weighting confirmed
- [ ] Identity projection penalty strategy approved

**Before v1 Release:**
- [ ] All constraints tested and verified
- [ ] Edge cases handled gracefully
- [ ] Performance ceiling achieved
- [ ] IdentityEngine integration verified read-only

---

**Design Status:** READY FOR DECISION
**Next Step:** Answer 5 open questions + approve weights
**Implementation Timeline:** 2-3 weeks after approval


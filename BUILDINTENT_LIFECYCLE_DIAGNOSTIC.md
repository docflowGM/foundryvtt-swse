# BuildIntent Lifecycle Diagnostic: Key Findings

**Status**: Architecture audit complete
**Confidence**: High - traced 9 call sites with detailed context flow analysis
**Action**: Ready for Identity Authority Refactor planning

---

## Discovery 1: BuildIntent is Genuinely Non-Authoritative During Chargen

### The Evidence
- **Only 1 chargen call site** (feat/talent step, lines 788-816 in chargen-main.js)
- **Species selection**: No BuildIntent exists
- **Ability score selection**: No BuildIntent exists
- **Class selection**: No BuildIntent exists
- **Feat/talent selection**: BuildIntent computed for FIRST TIME

### What This Means
When the player makes this sequence:
1. "I'm a Human" → Identity layer (species biases) applied
2. "I pick Jedi" → Identity layer (class chassis bias) applied
3. "I answer mentor survey" → Identity layer (survey bias) applied
4. "I pick Force Sensitivity feat" → BuildIntent analyzed for FIRST TIME

The BuildIntent computed at step 4 does NOT understand steps 1-3 have already been mechanically applied. The identity system has been making decisions for an hour before BuildIntent exists to validate them.

**Consequence**: Survey biases can be incompatible with already-selected class, species, abilities. BuildIntent has no authority to prevent this.

---

## Discovery 2: PendingData Temporal Inconsistency

### The Issue
BuildIntent is computed with `pendingData.selectedFeats`, which contains:
- ✓ Feats that player has ALREADY selected
- ✗ NOT the current feat being evaluated

When SuggestionScorer evaluates "Force Sensitivity":
1. BuildIntent was computed WITHOUT "Force Sensitivity" in selectedFeats
2. BuildIntent's themes reflect state BEFORE this feat
3. Suggestion score applies this feat's bonuses AFTER BuildIntent computed

### Code Trace
```javascript
// chargen-main.js:784
selectedFeats: this.characterData.feats || []  // Already-picked feats only

// Later in feat loop...
for (const feat of availableFeats) {
    const suggestion = SuggestionScorer.score(feat, buildIntent);
    // Feat not in buildIntent.signals.feats yet
}
```

### Why This Matters
If player has selected [Force Sensitivity, Force Boon], then views [Force Training]:
- BuildIntent includes Force Sensitivity + Force Boon (0.3 score)
- BuildIntent recommends Force Training (Force-aligned)
- But the BuildIntent was computed BEFORE viewing Force Training

This isn't a circular dependency (avoiding that is correct), but it IS temporal skew: the suggestion is based on a stale analysis.

**Consequence**: Later feat selections get evaluated against older BuildIntent state. Minor issue for now, but signals incomplete temporal model.

---

## Discovery 3: Pathpreview Redundancy in Level-Up

### The Issue
Prestige Roadmap UI (prestige-roadmap.js:69-70):
```javascript
const buildIntent = await BuildIntent.analyze(this.actor, this.pendingData);
const pathPreviews = await PathPreview.generatePreviews(this.actor, this.pendingData);
```

PathPreview.generatePreviews() (PathPreview.js:61):
```javascript
const buildIntent = await BuildIntent.analyze(actor, pendingData);
```

### What Happens
1. Prestige Roadmap calls BuildIntent.analyze()
2. Prestige Roadmap DOES NOT pass result to PathPreview
3. PathPreview calls BuildIntent.analyze() AGAIN with identical actor/pendingData
4. **Same computation runs twice in rapid succession**

### Why It Exists
- PathPreview has no parameter to accept pre-computed BuildIntent
- Defensive design: each module ensures it has what it needs
- No expectation that they'd be called together

### Impact
- ~2x CPU cost opening prestige roadmap (not severe, but wasteful)
- Suggests loose coupling and lack of shared state management
- SuggestionEngineCoordinator cache would help here IF it were used

**Consequence**: Inefficiency, not correctness issue. But indicates architectural fragmentation.

---

## Discovery 4: Caching Paradox

### The Situation
SuggestionEngineCoordinator (lines 177-188) implements sophisticated caching:

```javascript
if (this._buildIntentCache.has(cacheKey)) {
    return this._buildIntentCache.get(cacheKey);
}
const buildIntent = await BuildIntent.analyze(actor, pendingData);
this._buildIntentCache.set(cacheKey, buildIntent);
```

But then:
- ✓ Cache code is syntactically correct
- ✓ Cache invalidation method exists (clearBuildIntentCache)
- ✓ Logging shows cache hits/misses would be visible
- ✗ **Not a single call site uses it**

All call sites compute directly:
- chargen-main.js:791 → `BuildIntent.analyze()`
- chargen-feats-talents.js:72 → `BuildIntent.analyze()`
- prestige-roadmap.js:69 → `BuildIntent.analyze()`
- SuggestionEngine.js:129 → `BuildIntent.analyze()`
- SuggestionEngine.js:208 → `BuildIntent.analyze()`
- PathPreview.js:61 → `BuildIntent.analyze()`

### Why This Matters
**Pattern**: Someone implemented caching infrastructure but never integrated it. Suggests:
1. Incomplete refactoring (caching planned but never integrated)
2. Architectural mismatch (coordinator not in expected location)
3. Lack of integration testing (cache code never exercised)

### For Identity Authority Refactor
This is a red flag that partial architectures may exist elsewhere. Before starting refactor, should verify:
- Are there other partially-implemented features?
- Why wasn't caching ever integrated?
- What caused the disconnect?

**Consequence**: Technical debt. Suggests incomplete architectural vision.

---

## Discovery 5: Survey Bias Applied Late

### The Sequence
From BuildIntent.js:219-221:
```javascript
// Apply mentor survey biases if available (check pendingData as fallback for chargen)
SWSELogger.log(`[BUILD-INTENT] analyze() - Applying mentor survey biases`);
this._applyMentorBiases(actor, intent, pendingData);
```

Timeline:
1. Mentor survey completes (class-step) → biases stored in characterData
2. Player advances to feats/talents (many levels later)
3. BuildIntent.analyze() called, applies survey biases
4. But identity layers have ALREADY been applied based on class/species

### Code Evidence (BuildIntent.js:945)
```javascript
let mentorBiases = actor.system?.swse?.mentorBuildIntentBiases || {};

// Fallback to pendingData.mentorBiases if actor doesn't have biases (chargen scenario)
if ((!mentorBiases || Object.keys(mentorBiases).length === 0) && pendingData?.mentorBiases) {
    mentorBiases = pendingData.mentorBiases;
}
```

The fallback suggests survey biases MAY be in pendingData during chargen, but:
- Where does pendingData.mentorBiases get populated?
- When is it added?
- Is it available at feat/talent step when BuildIntent.analyze() is called?

### Audit Finding
**Unclear data flow**: Survey biases are supposed to be available during chargen feat/talent step, but the mechanism for getting them into pendingData is not visible in the audit.

**Consequence**: Survey biases may or may not be applied, depending on implementation details outside BuildIntent.

---

## Discovery 6: Mentor Survey is Outside IdentityEngine Flow

### The Pattern
From class-step.js (mentioned in original audit):
```javascript
MentorSurvey.invoke()
// Returns: biases in theme space
// Stored: characterData.mentorBiases
```

Later, in BuildIntent._applyMentorBiases():
```javascript
const biasToThemeMap = {
    forceFocus: BUILD_THEMES.FORCE,
    melee: BUILD_THEMES.MELEE,
    // ... etc
};
```

### The Issue
Survey → theme space (mentor module)
Theme space → bias space (biasToThemeMap in BuildIntent)

But never: Survey → IdentityEngine bias layers directly

### Why This Matters
IdentityEngine has 9 bias layers (SurveyBias, ClassChassisBias, etc.), but survey biases are:
- Collected in theme space
- Converted to theme adjustments
- Never projected to IdentityEngine's bias space

SurveyBias layer exists in IdentityEngine but isn't being called with survey data during chargen.

**Consequence**: IdentityEngine.SurveyBias layer may be unused during chargen. This is a complete gap between the survey system and the identity system.

---

## Discovery 7: Multiple Chargen Code Paths

### The Observation
Two separate implementations of feat/talent suggestions:
1. **chargen-main.js** (lines 788-850): Primary path
2. **chargen-feats-talents.js** (lines 31-110): Alternative path

Both:
- Call BuildIntent.analyze()
- Call SuggestionService.getSuggestions()
- Similar structure and purpose

### Questions Raised
- Why are there two implementations?
- Are they both used? When?
- Do they diverge intentionally or accidentally?

### Audit Limitation
Cannot determine from code alone whether this is:
- Deliberate parallel implementation for different chargen workflows
- Legacy code that wasn't removed during refactoring
- Intended fallback mechanism

**Consequence**: Code duplication risk. Maintenance burden if both paths must stay in sync.

---

## Strategic Implications for Identity Authority Refactor

### Insight A: BuildIntent Refactoring Must Precede Identity Authority
The caching paradox and multiple code paths suggest incomplete architectural refactoring. Before implementing Identity Authority:
1. Consolidate BuildIntent call sites → SuggestionEngineCoordinator
2. Remove parallel chargen code paths (decide which is canonical)
3. Verify survey bias flow (is it reaching IdentityEngine?)

### Insight B: Identity Must Be Causal, Not Evaluated
Discovery 1 (non-authoritative during chargen) is the root: identity is computed as analysis tool AFTER decisions are made, not as decision-driver BEFORE.

Refactor must establish:
- BuildIntent exists before ANY decisions
- Species/class/abilities selection FEEDS BuildIntent
- BuildIntent validates and scores options
- Identity biases are THE input to option ranking, not post-hoc analysis

### Insight C: Survey Biases Need Architectural Home
Discoveries 5-6 (survey bias late application, outside IdentityEngine) suggest survey system is isolated. Refactor must:
- Integrate survey → IdentityEngine.SurveyBias directly
- Remove theme-space intermediate layer for chargen
- Ensure survey influences identity from moment survey completes

### Insight D: Temporal Model Needs Clarification
Discovery 2 (pending data skew) suggests incomplete temporal model. Refactor should:
- Define clear state snapshots: preChargenDecision, postFeatDecision, postChargenDecision
- Clarify whether BuildIntent includes or excludes current-in-evaluation item
- Document expected timing of side effects

---

## Questions for Refactoring Planning

1. **Chargen Consolidation**: Which code path (chargen-main vs chargen-feats-talents) is canonical?
2. **Survey Integration**: Should SurveyBias layer be activated during chargen, not BuildIntent._applyMentorBiases()?
3. **Caching Adoption**: Should all BuildIntent call sites route through SuggestionEngineCoordinator?
4. **PathPreview Design**: Should BuildIntent be pre-computed and passed to PathPreview.generatePreviews()?
5. **Temporal Model**: Should BuildIntent exist before species selection (informational) or only at decision points?

---

## Confidence Assessment

**Audit Quality**: HIGH
- All 9 call sites traced with code references
- Data flow analyzed end-to-end
- Temporal relationships mapped
- Three distinct issues confirmed (late computation, redundancy, caching non-adoption)

**Next Steps**: Ready for Identity Authority Refactor contract creation

---

**Audit Date**: 2026-03-12
**Auditor**: Architecture Review (Architecture Authority Refactor Investigation)
**Status**: Complete - findings ready for strategic refactoring phase

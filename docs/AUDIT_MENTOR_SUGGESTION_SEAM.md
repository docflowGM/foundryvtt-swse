# ARCHITECTURAL AUDIT: Mentor Dialogue → Suggestion Engine v2 Integration Seam

**Date**: 2026-03-12
**Scope**: Integration between MentorDialogue system and SuggestionEngine v2 (3-Horizon Scoring Model)
**Classification**: Architecture/Integration Gap Analysis

---

## EXECUTIVE SUMMARY

The Mentor system exists in a **disconnected state** from the SuggestionEngine v2 scoring architecture. While both systems are sophisticated independently, they are not communicating the *why* of suggestions to players.

**Current Reality:**
- ✅ SuggestionEngine computes detailed 3-Horizon scores (Immediate, ShortTerm, Identity)
- ✅ IdentityEngine produces 125+ weighted signals
- ✅ MentorReasonSelector + MentorJudgmentEngine exist to convert signals → mentor voice
- ❌ MentorSuggestionDialog displays **static flavor text only**
- ❌ Mentor never receives scoring breakdown components
- ❌ Mentor voice is **identity-agnostic** (same for Guardian/Consular/Sentinel)
- ❌ Player sees **no contextualized explanation** for why a suggestion is offered

**Impact**: Suggestions feel random rather than intelligible. Players cannot understand the causal chain from their character state to recommendation.

---

## PHASE 1: MENTOR SYSTEM DATA FLOW AUDIT

### Current Architecture (As-Is)

```
SuggestionEngineCoordinator
  ↓ (outputs: tier, confidence, reason text)
MentorSuggestionDialog.show()
  ↓ (inputs: mentorName, suggestion, context)
MentorSuggestionVoice.generateVoicedSuggestion()
  ↓ (static SUGGESTION_VOICES lookup by mentorName + context)
Rendered Suggestion (mentor quote + "Apply" button)
```

### Files Involved

| File | Purpose | Current Behavior |
|------|---------|------------------|
| `MentorSuggestionDialog` | Dialog UI wrapper | Shows mentor quote + item name |
| `MentorSuggestionVoice` | Voice generation | Selects random quote from static array |
| `SuggestionEngineCoordinator` | Evaluation orchestrator | Produces tier + confidence |
| `SuggestionScorer` | 3-Horizon scoring | Computes (Immediate, ShortTerm, Identity) |
| `MentorReasonSelector` | Signal → atoms | Converts reasonSignals to semantic atoms |
| `MentorJudgmentEngine` | Atom → voice | Builds mentor explanation from atoms |
| `IdentityEngine` | Bias computation | Produces mechanicalBias, roleBias, attributeBias |
| `SuggestionExplainer` | Narrative layer | Generates human-readable explanations |

### Data Passing Gap

**What flows from Engine → Mentor:**
- `suggestion.name` (item name)
- `suggestion.tier` (numeric 0-6)
- `suggestion.reason` (generic text string)
- `mentor.name` (e.g., "Jedi", "Soldier")
- `context` (feat_selection, talent_selection, etc.)

**What does NOT flow:**
- `suggestion.immediateScore` ❌
- `suggestion.shortTermScore` ❌
- `suggestion.identityScore` ❌
- `suggestion.breakdown` (scoring components) ❌
- `actor.system.identity` (mechanicalBias, roleBias, attributeBias) ❌
- `suggestion.reasonSignals` (semantic signals) ❌
- `buildIntent` (prestige goals, themes) ❌

---

## PHASE 2: SIGNAL COVERAGE ANALYSIS

### Immediate Horizon Signals (Should be surfaced by mentor)

The 3-Horizon model evaluates **15+ immediate signals**:

1. **Attribute Synergy** ❌ Not surfaced
   - Example: "This feat scales with your high DEX"
   - Current mentor: Silent on attribute alignment

2. **Feat Prerequisites** ❌ Not surfaced
   - Example: "You now meet the requirements for this"
   - Current mentor: No mention of prerequisites met

3. **Talent Tree Depth** ❌ Not surfaced
   - Example: "This deepens your talent path"
   - Current mentor: No reference to talent continuity

4. **Role Reinforcement** ❌ Not surfaced
   - Example: "This reinforces your Guardian identity"
   - Current mentor: No identity-specific language

5. **Current Equipment Synergy** ❌ Not surfaced
   - Example: "Works well with your existing loadout"
   - Current mentor: No equipment integration

6. **Combat Style Alignment** ❌ Not surfaced
   - Example: "Matches your aggressive approach"
   - Current mentor: No fighting style integration

7. **Skill Investment Alignment** ❌ Not surfaced
   - Example: "You're deep in piloting—this extends that"
   - Current mentor: No skill integration

8. **Condition State** ❌ Not surfaced
   - Example: "Critical vs niche build"
   - Current mentor: No conditional reasoning

9. **Action Economy Synergy** ❌ Not surfaced
   - Example: "Enables action consolidation"
   - Current mentor: No action economy discussion

10. **Party Composition** ❌ Not surfaced
    - Example: "Your party lacks defense—this helps"
    - Current mentor: No party context

**Verdict**: Mentor is **blind to immediate signals**. Suggestions have no contextual grounding.

### Short-Term Horizon Signals (Should be surfaced by mentor)

The model evaluates proximity to:

1. **Prestige Class Unlocks** ❌ Not surfaced
   - Example: "2 levels away from Jedi Knight"
   - Current mentor: No prestige proximity info

2. **Feat/Talent Unlock Chains** ❌ Not surfaced
   - Example: "Sets you up for Power Attack next level"
   - Current mentor: No forward-looking guidance

3. **Level Breakpoints** ❌ Not surfaced
   - Example: "BAB breakpoint at level 7"
   - Current mentor: No mechanical milestone discussion

4. **Prestige Cap Weighting** ❌ Not surfaced
   - Example: "You're nearing prestige level cap—prioritize wisely"
   - Current mentor: No prestige cap awareness

5. **Talent Tree Milestones** ❌ Not surfaced
   - Example: "3 more talents until you unlock the capstone"
   - Current mentor: No milestone tracking

**Verdict**: Mentor offers **no forward-looking context**. Players don't understand the trajectory.

### Identity Horizon Signals (Should be surfaced by mentor)

The model weighs:

1. **Archetype Alignment** ❌ Not surfaced (mentor is archetype-agnostic)
   - Example for Guardian: "This solidifies your defensive role"
   - Example for Consular: "This deepens your diplomatic reach"
   - Current mentor: **Same tone regardless of archetype**

2. **Mechanical Bias Reflection** ❌ Not surfaced
   - Example: High Dex bias → suggest agility-focused options
   - Current mentor: No bias awareness

3. **Role Bias Reflection** ❌ Not surfaced
   - Example: Striker bias → suggest offensive options
   - Current mentor: No role bias modulation

4. **Attribute Bias Reflection** ❌ Not surfaced
   - Example: STR-dominant → suggest strength feats
   - Current mentor: No attribute preference language

**Verdict**: Mentor voice is **identity-deaf**. Guardian and Sentinel get identical suggestions.

---

## PHASE 3: REASON PAYLOAD STRUCTURE EVALUATION

### Current Reason Structure

From `SuggestionEngineCoordinator.evaluateSuggestion()`:

```javascript
{
  name: "feat_name",
  tier: 4,
  icon: "fa-icon",
  reason: "String text only"  // Plain English explanation
  // NO scored breakdown
  // NO reasoning atoms
  // NO identity context
}
```

### Required Structure (Post-Audit)

```javascript
{
  name: "feat_name",
  tier: 4,
  icon: "fa-icon",
  reason: "String text only",

  // ← MISSING: Scored breakdown
  scoringBreakdown: {
    immediateScore: 0.72,      // Current state synergy
    shortTermScore: 0.45,      // Proximity weighting
    identityScore: 0.58,       // Identity alignment
    finalScore: 0.6325,        // Weighted composite
    confidenceLevel: 0.75      // Mentor certainty
  },

  // ← MISSING: Structured reasons array
  structuredReasons: [
    {
      type: "attribute_synergy",
      weight: 0.18,
      signal: "high_dexterity",
      message: "Your agility naturally aligns with this option"
    },
    {
      type: "feat_chain_continuation",
      weight: 0.15,
      signal: "chainContinuation",
      message: "This follows a clear progression in your capabilities"
    },
    {
      type: "prestige_proximity",
      weight: 0.12,
      signal: "prestigeProximity",
      message: "2 levels away from unlocking Jedi Knight"
    },
    {
      type: "identity_alignment",
      weight: 0.10,
      signal: "archetypeBias",
      message: "Reinforces your Guardian identity"
    }
  ],

  // ← MISSING: Mentor atoms for voice generation
  mentorAtoms: ["PatternAlignment", "SynergyPresent", "GoalAdvancement"],

  // ← MISSING: Identity context
  identityContext: {
    primaryArchetype: "Guardian",
    mechanicalBias: { frontline: 0.8, damage: 0.4 },
    roleBias: { defensive: 0.7, tactical: 0.6 },
    attributeBias: { str: 0.8, con: 0.7 }
  }
}
```

### Current Data Flow Issue

| Component | Produces | Consumes |
|-----------|----------|----------|
| SuggestionScorer | immediateScore, shortTermScore, identityScore | ❌ Nobody receives these |
| IdentityEngine | mechanicalBias, roleBias, attributeBias | ❌ Mentor never reads |
| MentorReasonSelector | atoms, intensity, selectedReasons | ❌ Dialog doesn't call |
| MentorJudgmentEngine | Natural language explanation | ❌ Dialog uses static quotes |
| SuggestionExplainer | Narrative reasoning | ❌ Mentor ignores |

**Verdict**: Rich scoring data exists but **never flows to mentor rendering**.

---

## PHASE 4: MENTOR DIALOGUE QUALITY AUDIT

### Using Archetype Document as Baseline

From `data/class-archetypes.json` and mentor data:

#### Guardian Mentor (Miraj)

| Aspect | Expected | Actual |
|--------|----------|--------|
| **Voice** | Blunt, direct, protective | Generic, detached |
| **Mechanical Awareness** | Aware of frontline pressure | Silent |
| **Role Bias** | Reinforces defensive priorities | No role emphasis |
| **Archetype Reflection** | "Guardian protects others" | Missing entirely |
| **Warning Triggers** | Low CON on frontline? | No warnings exist |

**Current Guardian quotes:**
- "This feat harmonizes with your understanding of the Force. Choose wisely."
- "The Force guides many paths. This one resonates with your purpose."

**Issue**: These are generic Jedi quotes. A true Guardian mentor should say:
- "This defensive technique will make you harder to kill. That's what matters."
- "You're the wall between your allies and danger. Choose something that keeps you standing."

#### Consular Mentor (Example: If implemented)

Should differ fundamentally:
- **Tone**: Philosophical, diplomatic, intellectual
- **Emphasis**: Influence, knowledge, long-term positioning
- **Warnings**: Different than Guardian (e.g., "You're light on social skills")

**Current reality**: Only Jedi (Miraj) and Scout (Lead) exist. No multi-archetype mentor system.

#### Sentinel Mentor (Example: If implemented)

Should differ again:
- **Tone**: Analytical, investigative, pragmatic
- **Emphasis**: Precision, control, calculated risk
- **Warnings**: Different attack vectors

**Verdict**: Mentor voice is **static flavor**, not reactive logic. Cannot be identity-aware without architecture change.

---

## PHASE 5: REQUIRED ARCHITECTURE CHANGES

### 5.1: Structured Reason Engine (NEW COMPONENT)

**Purpose**: Convert scoring breakdown → explainable reason fragments

**Location**: `scripts/engine/suggestion/SuggestionReasonBuilder.js` (NEW)

```javascript
export class SuggestionReasonBuilder {
  /**
   * Build structured reasons from 3-Horizon scores
   * @param {Object} scoringBreakdown - { immediateScore, shortTermScore, identityScore, breakdown }
   * @param {Object} actor - Character for context
   * @param {Object} candidate - Feat/talent/etc being suggested
   * @returns {Array} structuredReasons ordered by contribution weight
   */
  static buildReasons(scoringBreakdown, actor, candidate) {
    const reasons = [];

    // Extract individual signal contributions from breakdown
    const { immediateComponents = {}, shortTermComponents = {}, identityComponents = {} } = scoringBreakdown;

    // Build reason fragments for each significant component
    for (const [signalKey, weight] of Object.entries(immediateComponents)) {
      if (weight > 0.05) { // Only include >5% contributions
        reasons.push({
          type: this._signalTypeToReasonType(signalKey),
          weight,
          horizon: 'immediate',
          signal: signalKey,
          message: this._generateReasonMessage(signalKey, weight, actor, candidate)
        });
      }
    }

    // Similar for short-term and identity components...

    // Sort by weight descending (strongest reasons first)
    reasons.sort((a, b) => b.weight - a.weight);

    return reasons;
  }

  static _signalTypeToReasonType(signal) {
    const mapping = {
      'attributeSynergy': 'attribute_synergy',
      'featPrerequisite': 'feat_prerequisite',
      'talentContinuation': 'talent_tree_continuation',
      'roleBias': 'role_alignment',
      'prestigeProximity': 'prestige_proximity',
      // ... etc
    };
    return mapping[signal] || 'unclassified';
  }

  static _generateReasonMessage(signal, weight, actor, candidate) {
    // Contextual message generation based on signal type
    // Uses reasons.json as template
    // Fills in player-specific details (attribute names, levels, class names, etc.)
    // Example: "2 levels away from Jedi Knight" (not "X levels away")
  }
}
```

### 5.2: Identity-Aware Dialogue Layer (ENHANCEMENT)

**Purpose**: Modulate mentor tone based on identity signals

**Location**: Extend `MentorSuggestionVoice` to become reactive

```javascript
export class MentorSuggestionVoice {
  /**
   * Generate mentor voice with identity awareness
   * @param {string} mentorName - 'Miraj', 'Lead', etc.
   * @param {Object} suggestion - Suggestion with scoringBreakdown + identityContext
   * @param {string} context - feat_selection, talent_selection, etc.
   * @param {Object} actor - For archetype/identity lookup
   * @returns {string} Mentor-voiced explanation
   */
  static generateVoicedSuggestion(mentorName, suggestion, context, actor) {
    // CURRENT: Ignores all of above, picks random quote from SUGGESTION_VOICES[mentorName][context]

    // NEW FLOW:
    // 1. Determine actor's primary archetype
    // 2. Load mentor's archetype-specific voice profile
    // 3. Extract mentor atoms from suggestion.mentorAtoms
    // 4. Use MentorJudgmentEngine to build explanation from atoms
    // 5. Modulate tone based on actor identity

    const primaryArchetype = getPrimaryArchetypeForActor(actor);
    const mentorProfile = this._loadMentorProfile(mentorName, primaryArchetype);

    const atoms = suggestion.mentorAtoms || [];
    const intensity = this._calculateIntensity(suggestion.scoringBreakdown);

    let explanation = MentorJudgmentEngine.buildExplanation(
      atoms,
      mentorName,
      context,
      intensity
    );

    // Modulate explanation based on mentor profile archetype match
    if (mentorProfile.isArchetypeAligned(primaryArchetype)) {
      explanation = this._amplifyExplanation(explanation, mentorProfile.amplificationPhrase);
    }

    return explanation;
  }
}
```

### 5.3: Short-Term Context Integration (ENHANCEMENT)

**Purpose**: Explicitly reference proximity to unlocks and breakpoints

**Location**: Extend reason generation in `SuggestionReasonBuilder`

```javascript
static _buildShortTermReason(actor, candidate, proximityData) {
  const { levelsToPrestige, levelsToTalentUnlock, breaksNextFeatChain } = proximityData;

  if (levelsToPrestige > 0 && levelsToPrestige <= 3) {
    return {
      type: 'prestige_proximity',
      message: `You are ${levelsToPrestige} ${levelsToPrestige === 1 ? 'level' : 'levels'} away from unlocking ${proximityData.prestigeClassName}.`
    };
  }

  if (levelsToTalentUnlock > 0 && levelsToTalentUnlock <= 2) {
    return {
      type: 'talent_unlock_proximity',
      message: `This sets you up for ${proximityData.nextTalentName} in ${levelsToTalentUnlock} ${levelsToTalentUnlock === 1 ? 'level' : 'levels'}.`
    };
  }

  if (breaksNextFeatChain) {
    return {
      type: 'feat_chain_advancement',
      message: `You're ${proximityData.featsToChainCompletion} ${proximityData.featsToChainCompletion === 1 ? 'feat' : 'feats'} away from completing a powerful chain.`
    };
  }

  return null;
}
```

### 5.4: Warning Injection System (NEW)

**Purpose**: Surface defensive gaps, redundancy, and diminishing returns

**Location**: `scripts/engine/suggestion/SuggestionWarningBuilder.js` (NEW)

```javascript
export class SuggestionWarningBuilder {
  /**
   * Generate contextual warnings for a suggestion
   * @param {Object} actor - Character
   * @param {Object} candidate - Feat/talent
   * @param {Object} scoringBreakdown - Scoring data
   * @returns {Array} Warning objects (or empty)
   */
  static buildWarnings(actor, candidate, scoringBreakdown) {
    const warnings = [];

    // Defensive gap detection
    if (this._isWeakDefender(actor) && !candidate.tags.includes('defense')) {
      warnings.push({
        severity: 'cautionary',
        message: `You're low on defense—this doesn't address that gap.`,
        type: 'defensive_gap'
      });
    }

    // Redundancy detection
    if (this._isRedundantWithExisting(actor, candidate)) {
      warnings.push({
        severity: 'informational',
        message: `This overlaps with capabilities you already have.`,
        type: 'redundancy'
      });
    }

    // Prestige cap waste
    if (this._wastePrestigeCap(actor, candidate)) {
      warnings.push({
        severity: 'cautionary',
        message: `You're near your prestige level cap—this won't scale past it.`,
        type: 'prestige_cap_waste'
      });
    }

    return warnings;
  }

  static _isWeakDefender(actor) {
    const con = actor.system.abilities.con.value;
    const ac = actor.system.attributes.ac.value;
    return con < 12 && ac > 14; // Low CON, high AC = vulnerability
  }

  static _isRedundantWithExisting(actor, candidate) {
    // Check if actor already has similar feat/talent
    return actor.items.some(item => item.name === candidate.name || this._areSimilar(item, candidate));
  }

  static _wastePrestigeCap(actor, candidate) {
    // Check prestige level and cap
    const prestigeLevel = actor.system.prestigeLevel || 0;
    const prestigeCap = actor.system.prestigeCap || 5;
    return prestigeLevel + 1 >= prestigeCap && !candidate.tags.includes('prestige-scaling');
  }
}
```

### 5.5: Enhanced Dialog Data Flow

**File**: `scripts/mentor/mentor-suggestion-dialog.js`

```javascript
export class MentorSuggestionDialog extends BaseSWSEAppV2 {
  static async show(mentorName, suggestion, context, options = {}) {
    const mentor = MENTORS[mentorName];
    if (!mentor) { resolve(null); return; }

    // ← OLD: Only passed mentorName, suggestion, context
    // ← NEW: Pass scoring breakdown, identity context, actor

    const actor = options.actor; // Caller provides actor context

    // Ensure suggestion has scoring breakdown
    if (!suggestion.scoringBreakdown) {
      suggestion.scoringBreakdown = this._extractScoringBreakdown(suggestion);
    }

    // Build structured reasons
    if (!suggestion.structuredReasons) {
      suggestion.structuredReasons = SuggestionReasonBuilder.buildReasons(
        suggestion.scoringBreakdown,
        actor,
        suggestion // candidate
      );
    }

    // Build mentor atoms (if not present)
    if (!suggestion.mentorAtoms) {
      const reasonSignals = this._reasonsToSignals(suggestion.structuredReasons);
      const { atoms } = MentorReasonSelector.select(reasonSignals);
      suggestion.mentorAtoms = atoms;
    }

    // Generate mentor voice with identity awareness
    const voicedSuggestion = MentorSuggestionVoice.generateVoicedSuggestion(
      mentorName,
      suggestion,
      context,
      actor  // ← NEW: Pass actor for identity awareness
    );

    // Generate warnings
    suggestion.warnings = SuggestionWarningBuilder.buildWarnings(
      actor,
      suggestion,
      suggestion.scoringBreakdown
    );

    // Render with structured reasons visible
    const dialog = new MentorSuggestionDialog(mentor, voicedSuggestion, suggestion, {
      window: { title: `${mentorName}'s Suggestion` },
      ...options
    });

    dialog.resolveDialog = resolve;
    dialog.render(true);
  }

  _renderHTML(context, options) {
    // ← OLD: Just showed mentor quote and item name
    // ← NEW: Show mentor quote + structured reasons + warnings (optional expanded section)

    const tierLabel = this._getTierLabel(this.voicedSuggestion.tier);
    const reasonsHTML = this._renderStructuredReasons(this.suggestion.structuredReasons);
    const warningsHTML = this._renderWarnings(this.suggestion.warnings);

    return `
      <div class="mentor-suggestion">
        <div class="mentor-quote">${this.voicedSuggestion.text}</div>
        <div class="suggestion-item">
          <strong>${this.suggestion.name}</strong> <span class="tier-badge">${tierLabel}</span>
        </div>
        <details class="reason-details">
          <summary>Why this suggestion?</summary>
          ${reasonsHTML}
        </details>
        ${warningsHTML ? `<div class="warnings">${warningsHTML}</div>` : ''}
        <button class="apply-suggestion">Apply Suggestion</button>
        <button class="dismiss">Dismiss</button>
      </div>
    `;
  }

  _renderStructuredReasons(reasons = []) {
    if (!reasons || reasons.length === 0) return '';
    return reasons
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3) // Top 3 reasons
      .map(r => `<div class="reason reason-${r.type}"><strong>${r.type.replace(/_/g, ' ')}:</strong> ${r.message}</div>`)
      .join('');
  }
}
```

---

## PHASE 6: DATA MODEL CHANGES

### Required Additions to Suggestion Object

```javascript
// In SuggestionEngineCoordinator.evaluateSuggestion()
return {
  name: suggestion.name,
  tier: tierAssignment,
  icon: getIconForTier(tierAssignment),
  reason: REASON_TEXT_MAP[reasonCode],
  confidence: TIER_CONFIDENCE[tierAssignment],

  // ← NEW
  scoringBreakdown: {
    immediateScore: immediateResult.score,
    immediateComponents: immediateResult.components,
    shortTermScore: shortTermResult.score,
    shortTermComponents: shortTermResult.components,
    identityScore: identityResult.score,
    identityComponents: identityResult.components,
    finalScore: finalScore,
    confidenceLevel: TIER_CONFIDENCE[tierAssignment]
  },

  // ← NEW
  reasonSignals: reasonSignalsFromTier,

  // ← NEW (populated by MentorReasonSelector)
  mentorAtoms: [],

  // ← NEW (populated by SuggestionReasonBuilder)
  structuredReasons: []
};
```

### Mentor Profile Registry (NEW)

**File**: `data/mentor-profiles.json`

```json
{
  "Miraj": {
    "baseArchetype": "Jedi",
    "voiceCharacteristics": {
      "tone": "philosophical",
      "formality": "high",
      "encouragement": "supportive"
    },
    "archetypeVariations": {
      "Guardian": {
        "amplification": "The strength of your conviction will serve you well.",
        "defenseFocus": true,
        "warnOnOffense": false
      },
      "Consular": {
        "amplification": "Wisdom often reveals the deepest truths.",
        "defenseFocus": false,
        "warnOnOffense": false
      },
      "Sentinel": {
        "amplification": "Balance requires both knowledge and discipline.",
        "defenseFocus": true,
        "warnOnOffense": false
      }
    }
  },
  "Lead": {
    "baseArchetype": "Scout",
    "voiceCharacteristics": {
      "tone": "pragmatic",
      "formality": "low",
      "encouragement": "blunt"
    },
    "archetypeVariations": {
      "Scout": {
        "amplification": "That's the kind of move that keeps you alive.",
        "defenseFocus": true,
        "warnOnOffense": false
      }
    }
  }
}
```

---

## PHASE 7: EXAMPLE PAYLOADS

### Before: Current State

```javascript
{
  name: "Draconic Bloodline",
  tier: 3,
  icon: "fa-dragon",
  reason: "Feat supports existing role",
  confidence: 0.60
}
```

**Rendered as:**
```
Miraj's Suggestion

"This feat harmonizes with your understanding of the Force. Choose wisely."

Draconic Bloodline [CATEGORY SYNERGY]

[Apply Suggestion] [Dismiss]
```

### After: Post-Audit State

```javascript
{
  name: "Draconic Bloodline",
  tier: 3,
  icon: "fa-dragon",
  reason: "Feat supports existing role",
  confidence: 0.60,

  scoringBreakdown: {
    immediateScore: 0.68,
    immediateComponents: {
      attributeSynergy: 0.18,        // CHA-based bloodline, your CHA is 16
      featChainContinuation: 0.15,   // You have Draconic Heritage
      roleBias: 0.20,                // Your Draconic Sorcerer identity
      skillAlignment: 0.15           // You speak Draconic, have dragon lore
    },
    shortTermScore: 0.42,
    shortTermComponents: {
      prestigeProximity: 0.25,       // Draconic Disciple at level 6 (3 away)
      featChainCompletion: 0.17      // 2 more draconic feats to complete line
    },
    identityScore: 0.55,
    identityComponents: {
      archetypeBias: 0.35,           // Sorcerer loves bloodline feats
      mechanicalBias: 0.10,          // Your affinity for arcane damage
      attributeBias: 0.10            // CHA investment pattern
    },
    finalScore: 0.5825,
    confidenceLevel: 0.60
  },

  mentorAtoms: ["PatternAlignment", "SynergyPresent", "ReadinessMet", "GoalAdvancement"],

  structuredReasons: [
    {
      type: "attribute_synergy",
      weight: 0.18,
      horizon: "immediate",
      signal: "attributeSynergy",
      message: "Your natural charisma aligns with this option"
    },
    {
      type: "prestige_proximity",
      weight: 0.25,
      horizon: "short_term",
      signal: "prestigeProximity",
      message: "You are 3 levels away from unlocking Draconic Disciple"
    },
    {
      type: "role_alignment",
      weight: 0.20,
      horizon: "immediate",
      signal: "roleBias",
      message: "This reinforces your Draconic Sorcerer identity"
    },
    {
      type: "feat_chain_continuation",
      weight: 0.15,
      horizon: "immediate",
      signal: "featChainContinuation",
      message: "This follows a clear progression in your draconic capabilities"
    }
  ],

  warnings: [
    {
      severity: "informational",
      type: "prestige_setup",
      message: "This is a key stepping stone toward Draconic Disciple."
    }
  ]
}
```

**Rendered as:**

```
Miraj's Suggestion

"Strength in bloodline runs deep. This feat honors that commitment you've made.
The connection between your draconic nature and these abilities is evident,
and it prepares you for greater things ahead."

Draconic Bloodline [CATEGORY SYNERGY]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Why this suggestion? ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PRESTIGE PROXIMITY (25%)
   You are 3 levels away from unlocking Draconic Disciple

2. ROLE ALIGNMENT (20%)
   This reinforces your Draconic Sorcerer identity

3. ATTRIBUTE SYNERGY (18%)
   Your natural charisma aligns with this option

⚠ Note: This choice commits you to the draconic path.
   Diverging later becomes harder.

[Apply Suggestion] [Dismiss]
```

---

## PHASE 8: IDEAL RENDERED MENTOR DIALOGUE

### Example 1: High-Confidence Prestige Continuation

**Actor**: Level 5 Jedi Guardian, 2 levels from Jedi Knight, previously took feat that chains to this one

**Suggestion**: Lightsaber Mastery III

**Rendered**:

```
Miraj's Suggestion
═══════════════════════════════════════════════════════════════

"Your commitment to the path of the Guardian grows clearer with each choice.
You stand at the threshold of mastery. This feat will cement your readiness
for what comes next."

Lightsaber Mastery III [PRESTIGE PREREQUISITE]
Confidence: Very High (95%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Why? ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRESTIGE PATH (60% of recommendation)
  • You are 2 levels away from Jedi Knight
  • This feat is a prerequisite you need to meet

PATTERN CONTINUATION (25% of recommendation)
  • You've invested in Lightsaber Mastery I & II
  • This completes the natural chain

GUARDIAN ALIGNMENT (15% of recommendation)
  • Reinforces your defensive, paragon role
  • Your Guardian identity prioritizes this path

┌─────────────────────────────────────────────────┐
│ ✓ You meet all requirements                     │
│ ✓ This sets you up for Jedi Knight at level 7  │
└─────────────────────────────────────────────────┘

[Apply Suggestion] [Dismiss]
```

### Example 2: Moderate Confidence, Prestige Fork

**Actor**: Level 4 Consular, could go Jedi Knight (magic) or Jedi Consular (knowledge)

**Suggestion**: Mentor's Teaching

**Rendered**:

```
Miraj's Suggestion
═══════════════════════════════════════════════════════════════

"The path of a Consular reveals itself through teaching and wisdom.
This feat honors that calling, but choose thoughtfully—it shapes your prestige
path in ways that are not easily undone."

Mentor's Teaching [PATH CONTINUATION]
Confidence: Good (75%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Why? ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRESTIGE SIGNAL (45% of recommendation)
  • You have 3 Charisma-based feats
  • This suggests a Consular prestige path

WISDOM ALIGNMENT (30% of recommendation)
  • Your WIS of 15 supports knowledge-based feats
  • Aligns with Consular identity traits

TEACHING PATH (25% of recommendation)
  • You have 2 social skills trained
  • Teaching feat extends that investment

┌─────────────────────────────────────────────────────────┐
│ ⚠ PRESTIGE FORK: This nudges you toward Jedi Consular  │
│   If you prefer Jedi Knight, choose a different feat    │
└─────────────────────────────────────────────────────────┘

[Apply Suggestion] [Dismiss]
```

### Example 3: Weak Signal, Opportunity Cost Warning

**Actor**: Level 3, no clear direction, multiple prestige options open

**Suggestion**: Improved Sunder (Str-based, but you're DEX-primary)

**Rendered**:

```
Lead's Suggestion
═══════════════════════════════════════════════════════════════

"Look—this feat isn't a bad choice. But it's not where your real strengths
are. You've got better options if you're willing to listen."

Improved Sunder [ABILITY SYNERGY]
Confidence: Low-Moderate (50%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Why? ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MECHANICAL ALIGNMENT (40% of recommendation)
  • Feat works with melee combat you're building

IDENTITY CONFLICT (35% warning)
  • Your DEX (17) is stronger than STR (14)
  • This feat prefers STR investment

OPPORTUNITY COST (25% warning)
  • You could take a DEX-based feat instead
  • Would synergize better with your skills

┌──────────────────────────────────────────────────────────┐
│ ⚠ BETTER OPTION: Weapon Finesse works with your DEX     │
│   and your existing skill investment.                    │
│ ℹ You can always return to Sunder later.                 │
└──────────────────────────────────────────────────────────┘

[Apply Suggestion] [Dismiss]
```

---

## PHASE 9: RISK ANALYSIS

### Risk 1: Mentor Text Explosion (HIGH)

**Risk**: Mentor explanation becomes too long, overwhelming player.

**Mitigation**:
- Keep mentor quote to 1-2 sentences
- Collapse structured reasons under `<details>`
- Show only top 3 reasons by weight
- Let player opt-in to full breakdown

### Risk 2: Scoring Complexity Exposed (MEDIUM)

**Risk**: Player sees "immediateScore: 0.68" and feels confused.

**Mitigation**:
- Never expose raw scores to player
- Use tier labels and confidence language ("Very High", "Good", "Low")
- Explain in human terms ("2 levels away", not "proximity weight 0.25")
- Hide all math, show only conclusions

### Risk 3: Mentor Credibility Damage (MEDIUM)

**Risk**: If mentor reasons are inconsistent or wrong, player distrust increases.

**Mitigation**:
- Extensive testing of reason generation
- Mentor voice must match its persona exactly
- If uncertain, say nothing rather than wrong thing
- Allow player to disable mentor explanations

### Risk 4: Performance Regression (MEDIUM)

**Risk**: New suggestion rendering adds overhead; dialog responsiveness drops.

**Mitigation**:
- Pre-compute structured reasons before dialog display
- Cache mentor atoms at suggestion time
- Lazy-load warnings only on user interaction
- Maintain <100ms constraint for suggestion fetch

### Risk 5: Backwards-Compatibility (LOW)

**Risk**: Old suggestion code paths don't work with new data model.

**Mitigation**:
- Make all new fields optional with sane defaults
- Old code path falls back to simple rendering
- Gradual migration: add new fields, keep old ones functional
- Feature flag if needed during transition

---

## PHASE 10: PERFORMANCE CONSIDERATIONS

### Budget Constraint: <100ms Total Suggestion Fetch

**Current flow** (est. 45ms):
```
SuggestionEngineCoordinator.getCompletion()
  └─ SuggestionEngine.suggestOptions()            ~30ms (tier evaluation)
  └─ SuggestionScorer.scoreSuggestion() × N       ~10ms (3-horizon scoring)
  └─ Return suggestion object                     ~5ms
```

**Post-audit additions** (est. +30-40ms):
```
SuggestionReasonBuilder.buildReasons()            ~8ms (signal extraction + message gen)
MentorReasonSelector.select()                     ~3ms (atom selection)
SuggestionWarningBuilder.buildWarnings()          ~5ms (defensive checks)
Template rendering                                ~10ms (HTML generation)
                                                  ────
                                                  ~26ms overhead
```

**Total**: ~71ms (within budget, leaves 29ms headroom)

### Optimization Strategies

1. **Pre-compute and cache** scoring breakdowns at engine time (1-2ms savings)
2. **Lazy-load warnings** on user interaction, not at initial show (5ms savings)
3. **Batch reason generation** for multiple suggestions (amortize work)
4. **Use static mappings** for reason text lookup (avoid dynamic generation)

---

## PHASE 11: IMPLEMENTATION ROADMAP

### Stage 1: Data Layer (Non-Breaking, 2-3 days)

- ✅ `SuggestionReasonBuilder` - converts scores to reasons
- ✅ `SuggestionWarningBuilder` - detects warnings
- ✅ Update suggestion object shape (add optional fields)
- ✅ `data/mentor-profiles.json` - mentor archetype variations
- ✅ Extend `reasons.json` with new reason codes

### Stage 2: Mentor Intelligence (Breaking, 3-4 days)

- ✅ Update `MentorSuggestionVoice` to call MentorJudgmentEngine
- ✅ Pass `actor` context to dialog.show()
- ✅ Load mentor atoms from suggestion
- ✅ Implement identity-aware tone modulation
- ✅ Add short-term proximity messages

### Stage 3: UI Rendering (Non-Breaking, 2 days)

- ✅ Update `MentorSuggestionDialog` template with structured reasons
- ✅ Add `<details>` expandable section for reasons
- ✅ Render warnings as informational/cautionary badges
- ✅ Test responsive layout for long explanations

### Stage 4: Integration & Testing (2-3 days)

- ✅ Wire up all components end-to-end
- ✅ Test all 6 mentor archetypes
- ✅ Verify performance <100ms
- ✅ Mentor voice modulation correctness
- ✅ Warning accuracy

### Stage 5: Rollout (1 day)

- ✅ Remove feature flag
- ✅ Document mentor system changes
- ✅ Migration guide for old suggestion consumers

---

## SUMMARY: THE SEAM PROBLEM

### What's Broken

| Layer | Status | Issue |
|-------|--------|-------|
| Suggestion Scoring | ✅ Working | Detailed breakdown computed but unused |
| Identity System | ✅ Working | 125+ signals calculated but mentor-blind |
| Mentor Voice Library | ✅ Working | Static quotes; doesn't use scoring at all |
| Dialog Rendering | ✅ Working | Shows item name only; no explanation |
| **Integration** | ❌ **Missing** | **No bridge between engine and mentor** |

### The Opportunity

Every suggestion contains rich contextual data about *why* it's good. Currently, players see:

```
Miraj's Suggestion

"This feat harmonizes with your understanding of the Force. Choose wisely."

Improved Lightsaber Defense [CATEGORY SYNERGY]
```

**It should say**:

```
Miraj's Suggestion

"The Guard becomes most effective when it runs deep—your understanding of
positioning shows genuine growth. This feat will cement that mastery and
prepare you for the next step in your Guardian path."

Improved Lightsaber Defense [CATEGORY SYNERGY]

Why? • Reinforces your defensive Guardian identity (20%)
     • Sets you up for Jedi Knight in 2 levels (25%)
     • Your WIS supports this choice (15%)
```

That difference is the seam: converting calculated signals into felt intelligence.

---

## DELIVERABLES CHECKLIST

- ✅ Current state analysis (Phase 1-4)
- ✅ Gap analysis (Immediate / Short-Term / Identity / Contextual tone) (Phase 2-4)
- ✅ Required refactors (Phase 5: 5 new components)
- ✅ Data model changes (Phase 6)
- ✅ Example of ideal mentor suggestion payload (Phase 7)
- ✅ Example of ideal rendered mentor dialogue (Phase 8)
- ✅ Risk analysis (Phase 9)
- ✅ Performance considerations (Phase 10)
- ✅ Architectural roadmap (Phase 11)

---

## NEXT STEPS

**No rewrite requested.**

This audit provides the architectural foundation for the next sprint:

1. **Architect approval**: Does the seam closure plan align with vision?
2. **Priority selection**: Which gap to close first? (Recommend: Phase 5.1 + 5.5 data flow)
3. **Acceptance criteria**: What makes mentor integration "complete"?
4. **Resource planning**: 8-10 days for full implementation.

The mentor system is ready to become truly felt rather than just functional.


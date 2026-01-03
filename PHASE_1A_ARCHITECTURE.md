# SWSE Suggestion Engine Phase 1A: Architecture Design

**Status**: Architecture Phase (Design-Level)
**Target**: Scaffold the 5 core classes for Top-5 enhancements
**Priority**: Confidence, History Tracking, Build Anchors, Pivots, Explanations

---

## 1. DATA SCHEMA: actor.system.suggestionEngine

All player learning data lives in **actor.system.suggestionEngine** (portable, per-character).

```javascript
actor.system.suggestionEngine = {

  // ──────────────────────────────────────────────────────────────
  // MENTOR PROFILE (from initial questionnaire)
  // ──────────────────────────────────────────────────────────────
  mentorProfile: {
    completedAt: timestamp,
    biases: {
      // Theme weights (0-1, from mentor survey)
      combatStyle: string | null,    // "lightsaber" | "melee" | "ranged" | etc
      forceFocus: number,             // 0-1 (how much they want Force)
      melee: number,                  // 0-1
      ranged: number,                 // 0-1
      stealth: number,                // 0-1
      social: number,                 // 0-1
      tech: number,                   // 0-1
      leadership: number,             // 0-1
      support: number,                // 0-1
      specialization: number,         // 0-1 (focus vs generalist)
      balance: number,                // 0-1
      order: number,                  // 0-1 (traditional vs pragmatic)
      pragmatic: number,              // 0-1
      riskTolerance: number,          // 0-1
      authority: number               // 0-1
    }
  },

  // ──────────────────────────────────────────────────────────────
  // PLAYER HISTORY (tracking shown/accepted/ignored/rejected)
  // ──────────────────────────────────────────────────────────────
  history: {
    // Recent events (memory, not archive)
    // Keeps only recent levels to avoid overfitting to old decisions
    recent: [
      {
        level: number,                 // At what level did this happen
        type: "feat" | "talent" | "attribute",
        id: string,                    // Item ID
        name: string,                  // Human-readable name
        outcome: "accepted" | "ignored" | "passiveIgnored" | "rejected",
        timestamp: timestamp,
        context: {
          mentorAlignment: number,     // 0-1
          classSynergy: number,        // 0-1
          buildCoherence: number       // 0-1
        }
      }
      // Keep only last 10-15 selections (not entire history)
      // Prevents old decisions from biasing current intent detection
    ],

    // Aggregated metrics (recalculated on level-up)
    aggregates: {
      acceptanceRateByTheme: {
        force: 0.7,
        melee: 0.4,
        ranged: 0.6,
        stealth: 0.3,
        // ... (one per BUILD_THEMES)
      },
      ignoredThemeWeights: {
        // Negative weights for ignored categories
        // Only calculated from themes with 2+ mentor ignores
        defensive: -0.2,
        force: -0.15,
        // ... (weighted differently than passive ignores)
      },
      lastSuggestionTime: timestamp,   // Prevent spam cooldown
      totalSuggestionsShown: number,
      totalSuggestionsAccepted: number,
      totalSuggestionsIgnored: number
    }
  },

  // ──────────────────────────────────────────────────────────────
  // BUILD IDENTITY ANCHORS (detected after level 3-5)
  // ──────────────────────────────────────────────────────────────
  anchors: {
    primary: {
      detected: boolean,              // Has anchor been detected?
      name: string,                   // "Frontline damage dealer", "Face", etc
      archetypeKey: string,           // "damage_dealer" | "face" | etc
      confidence: number,             // 0-1 (how sure are we?)
      detectedAtLevel: number,        // When first noticed
      lastRevisedAtLevel: number,     // When last validated

      evidence: {
        attributePattern: {
          str: number | null,
          dex: number | null,
          con: number | null,
          int: number | null,
          wis: number | null,
          cha: number | null
        },
        talentTrees: [string],        // ["melee", "combat"]
        featThemes: [string],         // ["weapon mastery", "power attack"]
        skillFocus: [string],         // ["acrobatics", "athletics"]
        classAllignment: [string]     // Prestige classes matching anchor
      },

      // Anchor lifecycle
      state: "proposed" | "confirmed" | "dormant",  // proposed = awaiting player confirm
      confirmedAtLevel: number | null,
      playerConfirmed: boolean,

      // Stability tracking
      consistency: {
        onThemePickCount: number,     // How many choices match this anchor
        offThemePickCount: number,    // How many contradict it
        lastOffThemeLevel: number,    // When player picked something contrary
      },

      // Locking
      locked: boolean,                // When true, bias heavily toward anchor
      lockedAtLevel: number | null
    },

    // Secondary/emerging anchors (if player is pivoting)
    secondary: {
      // Same structure as primary (for pivot detection)
      detected: boolean,
      name: string | null,
      // ... (rest of structure)
    },

    // Archive of past anchors (if player pivoted)
    history: [
      {
        name: string,
        detectedAtLevel: number,
        abandonedAtLevel: number,
        reason: "pivot_detected" | "player_confirmed_different" | "other"
      }
    ]
  },

  // ──────────────────────────────────────────────────────────────
  // SOFT PIVOT DETECTION STATE MACHINE
  // ──────────────────────────────────────────────────────────────
  pivotDetector: {
    state: "STABLE" | "EXPLORATORY" | "PIVOTING" | "LOCKED",

    transitionHistory: [
      {
        fromState: string,
        toState: string,
        atLevel: number,
        reason: string,
        evidence: { /* context */ }
      }
    ],

    // Counter for consecutive off-theme picks
    consecutiveOffThemePicks: number,

    // New theme being explored (if PIVOTING or EXPLORATORY)
    emergingTheme: string | null,
    emergingThemeEvidence: {
      pickCount: number,
      levels: [number],              // At which levels did player pick this
      confidence: number              // 0-1 (how sure is the engine this is a real pivot)
    },

    // When did pivot detection pause anchor locking
    pivotPauseStartedAtLevel: number | null
  },

  // ──────────────────────────────────────────────────────────────
  // EXPLANATION TEMPLATES & CONTEXT (for "why" strings)
  // ──────────────────────────────────────────────────────────────
  explanationContext: {
    lastUsedTemplates: {
      // Track which explanations were shown, to avoid repetition
      "synergy_match": [
        { level: 5, itemName: "Power Attack" },
        { level: 7, itemName: "Rapid Strike" }
      ]
    },

    // Dynamic context for template filling
    currentAnchorName: string | null,    // For "Supports your {anchorName}" templates
    currentTheme: string,                 // Primary theme being built
    partyGapRole: string | null,         // "healer" | "tank" | etc (if party-aware)
    recentlyTakenItems: [
      { itemName: string, level: number }
    ]
  },

  // ──────────────────────────────────────────────────────────────
  // USER PREFERENCES (new setting: suggestion strictness)
  // ──────────────────────────────────────────────────────────────
  preferences: {
    suggestionStrictness: "narrative" | "balanced" | "optimized",
    // This adjusts:
    // - confidence thresholds (when to show suggestions)
    // - anchor locking aggressiveness
    // - how often warnings appear

    showLowConfidenceSuggestions: boolean,    // default true
    allowPivotDetection: boolean,             // default true
    showReasons: boolean,                     // default true (show "why" explanations)
    suggestPartyGapFilling: boolean          // default true (if party aware)
  },

  // ──────────────────────────────────────────────────────────────
  // TELEMETRY & VERSION TRACKING
  // ──────────────────────────────────────────────────────────────
  meta: {
    version: 1,                        // For future migrations
    created: timestamp,
    lastUpdated: timestamp,
    lastUpdatedAtLevel: number,
    totalSuggestionsShown: number,     // Aggregated counter
    totalSuggestionsAccepted: number,  // How many did they take?
    totalSuggestionsIgnored: number    // How many did they skip?
  }
};
```

---

## 2. THE FIVE NEW CLASSES (Responsibilities & Contracts)

### 2.1 SuggestionConfidence.js

**Responsibility**: Calculate confidence score for each suggestion.

**Public Interface**:
```javascript
class SuggestionConfidence {
  /**
   * Calculate confidence for a single suggestion
   * @param {Object} suggestion - { itemId, itemName, tier, category }
   * @param {Actor} actor - The character
   * @param {Object} context - { mentorAlignment, classSynergy, buildCoherence, opportunityCost }
   * @returns {Object} { confidence: 0-1, level: "Strong|Suggested|Possible", score: number }
   */
  static calculateConfidence(suggestion, actor, context) {
    // Positive Inputs:
    // - mentorAlignment: 0-1 (how well does it match mentor intent)
    // - classSynergy: 0-1 (does it fit the class)
    // - playerAcceptanceHistory: 0-1 (% of similar suggestions they've accepted)
    // - buildCoherence: 0-1 (no conflicts, chains complete)
    // - tierLevel: base multiplier from SUGGESTION_TIERS

    // Dampening Input:
    // - opportunityCost: 0-1 (penalty for prestige locks, stat conflicts, etc)

    // Formula:
    // baseScore = (mentorAlignment * 0.3) +
    //             (classSynergy * 0.25) +
    //             (playerAcceptanceHistory * 0.25) +
    //             (buildCoherence * 0.2)
    //
    // confidence = baseScore * (1 - opportunityCost)  // Apply dampener
    // confidence *= tierMultiplier                    // Apply tier boost
    // confidence += anchorBonus/penalty               // Apply anchor affinity
    // confidence *= strictnessModifier                // Apply user preference

    // Return:
    // { confidence: 0.78, level: "Strong", score: 78 }
  }

  /**
   * Get confidence level name based on score
   * @param {number} confidence - 0-1
   * @returns {string} "Strong" | "Suggested" | "Possible"
   */
  static getConfidenceLevel(confidence) {
    // Strong: >= 0.7
    // Suggested: >= 0.4
    // Possible: < 0.4
  }

  /**
   * Apply strictness modifier to confidence
   * @param {number} baseConfidence - 0-1
   * @param {string} strictness - "narrative" | "balanced" | "optimized"
   * @returns {number} Modified confidence 0-1
   */
  static applyStrictnessModifier(baseConfidence, strictness) {
    // narrative: reduce overall confidence (show less, but explain more)
    // balanced: no change
    // optimized: increase (show more aggressive suggestions)
  }
}
```

**Storage**: Reads from `actor.system.suggestionEngine.mentorProfile`, `.anchors`, `.history.metrics`
**Output**: Confidence metadata attached to each suggestion object

---

### 2.2 PlayerHistoryTracker.js

**Responsibility**: Track shown/accepted/ignored/rejected suggestions and derive metrics.

**Public Interface**:
```javascript
class PlayerHistoryTracker {
  /**
   * Record that a suggestion was shown to the player
   * @param {Actor} actor
   * @param {Object} suggestion - { itemId, itemName, category, theme, tier, etc }
   * @param {Object} confidence - { confidence, level }
   * @param {Object} context - { mentorAlignment, classSynergy, buildCoherence }
   */
  static recordSuggestionShown(actor, suggestion, confidence, context) {
    // Store in actor.system.suggestionEngine.history.suggestions
    // Mark timestamp, confidence, context
  }

  /**
   * Record that player accepted a suggestion
   * @param {Actor} actor
   * @param {string} suggestionId - UUID of the suggestion
   */
  static recordSuggestionAccepted(actor, suggestionId) {
    // Find suggestion by ID
    // Set accepted: timestamp
  }

  /**
   * Record that player ignored a suggestion (from mentor dialog)
   * @param {Actor} actor
   * @param {string} suggestionId
   */
  static recordSuggestionIgnored(actor, suggestionId) {
    // Set ignored: timestamp
  }

  /**
   * Record that player ignored a suggestion (passive, from sheet)
   * @param {Actor} actor
   * @param {string} suggestionId
   */
  static recordSuggestionPassiveIgnored(actor, suggestionId) {
    // Set passiveIgnored: timestamp
  }

  /**
   * Calculate acceptance rate by theme
   * @param {Actor} actor
   * @returns {Object} { force: 0.7, melee: 0.4, ... }
   */
  static calculateAcceptanceRateByTheme(actor) {
    // For each theme:
    // acceptanceRate = (accepted in theme) / (accepted + ignored)
    // Ignore entries with passiveIgnored only (weak signal)
  }

  /**
   * Calculate ignored theme weights for suggestion filtering
   * @param {Actor} actor
   * @returns {Object} { defensive: -0.2, force: -0.15, ... }
   */
  static calculateIgnoredThemeWeights(actor) {
    // For themes with 2+ mentor ignores:
    // weight = -0.1 * (ignoreCount / totalInTheme)
    // Max -0.3
    // Only applies to themes with meaningful ignore history
  }

  /**
   * Get time since last suggestion (for cooldown/spam prevention)
   * @param {Actor} actor
   * @returns {number} Timestamp of last suggestion shown
   */
  static getLastSuggestionTime(actor) {
    // Return actor.system.suggestionEngine.history.metrics.lastSuggestionTime
  }

  /**
   * Recalculate all metrics after level-up
   * @param {Actor} actor
   */
  static recalculateMetrics(actor) {
    // Called every level-up
    // Updates: acceptanceRateByTheme, ignoredThemeWeights, counts, etc
  }
}
```

**Storage**: Writes to `actor.system.suggestionEngine.history`
**Hooks**: Listen to feat/talent/attribute selection events

---

### 2.3 BuildIdentityAnchor.js

**Responsibility**: Detect, confirm, and lock build archetypes after consistency.

**Public Interface**:
```javascript
class BuildIdentityAnchor {
  /**
   * Detect potential build anchors (archetypes) based on choices
   * @param {Actor} actor
   * @param {Object} pendingData - Current level selections
   * @returns {Object} { name, confidence, evidence }
   */
  static detectAnchor(actor, pendingData) {
    // Uses hardcoded archetype definitions with world-configurable weights
    // Archetypes are stable concepts; weights are tunable

    // Analyze character against predefined archetypes:
    // - Attribute distribution (which ability is highest?)
    // - Talent tree clustering (which trees trained?)
    // - Feat themes (what kind of feats?)
    // - Skill focus (which skills trained?)
    // - Class affinity (which prestige classes fit?)

    // Hardcoded Archetypes (stable across updates):
    // "Frontline Damage Dealer"
    // "Battlefield Controller"
    // "Face / Social Manipulator"
    // "Skill Monkey"
    // "Force DPS"
    // "Force Control / Support"
    // "Tech Specialist"
    // "Sniper / Ranged"
    // + more as needed

    // World-configurable: weights per signal
    // Example config:
    // archetypes.frontline_damage = {
    //   triggers: {
    //     meleeTalents: 0.4,
    //     strengthInvestment: 0.3,
    //     hpGrowth: 0.3
    //   }
    // }

    // Return: { name, confidence: 0-1, evidence: {...} }
  }

  /**
   * Update primary anchor after level-up
   * Checks if anchor is still valid, raises confidence or shifts to secondary
   * @param {Actor} actor
   * @param {Object} pendingData
   */
  static validateAndUpdateAnchor(actor, pendingData) {
    // If no anchor exists:
    //   - detectAnchor and move to "proposed" state
    // If anchor exists and is "proposed":
    //   - Check consistency (2-3 levels)
    //   - If consistent, ask player for confirmation
    // If anchor exists and is "confirmed":
    //   - Track on-theme vs off-theme picks
    //   - If off-theme picks detected, enter pivot detection
    // If anchor exists and is "dormant":
    //   - Reactive based on player activity
  }

  /**
   * Confirm anchor after player approves it
   * @param {Actor} actor
   * @param {string} anchorName - Which anchor to confirm
   */
  static confirmAnchor(actor, anchorName) {
    // Set state to "confirmed"
    // Lock biases toward this anchor
    // Begin tracking consistency
  }

  /**
   * Apply anchor bonus/penalty to suggestion confidence
   * @param {number} baseConfidence
   * @param {Actor} actor
   * @param {Object} suggestion - { theme, category, itemName }
   * @returns {number} Adjusted confidence
   */
  static applyAnchorWeight(baseConfidence, actor, suggestion) {
    // If suggestion theme matches anchor:
    //   - Bonus: +0.15 to confidence
    // If suggestion theme contradicts anchor:
    //   - Penalty: -0.2 to confidence
    // If anchor is locked:
    //   - Use stronger weights
  }

  /**
   * Check if anchor should pivot (player is choosing off-theme consistently)
   * @param {Actor} actor
   * @returns {boolean|Object} false or { emergingTheme, confidence }
   */
  static detectPotentialPivot(actor) {
    // Check consecutive off-theme picks
    // If 2-3 off-theme in same new theme, return pivot info
    // Handled by PivotDetector (but anchor provides evidence)
  }
}
```

**Storage**: Writes to `actor.system.suggestionEngine.anchors`
**Events**: Listens to feat/talent/attribute selection

---

### 2.4 PivotDetector.js

**Responsibility**: Track when players change their build direction mid-campaign.

**Public Interface**:
```javascript
class PivotDetector {
  /**
   * Check current pivot state and update if needed
   * @param {Actor} actor
   * @param {Object} pendingData - Latest selections
   * @returns {Object} { state, transitioned: boolean, evidence: {...} }
   */
  static updatePivotState(actor, pendingData) {
    // State machine:
    // STABLE -> EXPLORATORY (1-2 off-theme picks)
    // EXPLORATORY -> PIVOTING (2-3 consistent off-theme in same theme)
    // PIVOTING -> LOCKED (2-3 levels of consistency in new theme)
    // Any state -> STABLE (if player returns to anchor theme)

    // Return: { state, transitioned, evidence }
  }

  /**
   * Transition to EXPLORATORY state
   * Broadens suggestion pool, lowers confidence language
   * @param {Actor} actor
   * @param {string} reason
   */
  static enterExploratory(actor, reason) {
    // Set state
    // Record transition in history
    // Pause anchor locking
  }

  /**
   * Transition to PIVOTING state
   * Confirms player is exploring a new theme
   * @param {Actor} actor
   * @param {string} emergingTheme
   */
  static enterPivoting(actor, emergingTheme) {
    // Set state
    // Store emergingTheme
    // Increment confidence in new direction
    // Continue to pause anchor locking
  }

  /**
   * Transition to LOCKED state
   * New anchor is now primary
   * @param {Actor} actor
   */
  static lockNewAnchor(actor) {
    // Promote secondary anchor to primary
    // Archive old anchor
    // Transition to LOCKED
    // Resume full anchor weighting
  }

  /**
   * Return to STABLE state
   * Player rejected pivot, sticking with anchor
   * @param {Actor} actor
   */
  static returnToStable(actor) {
    // Clear exploratory evidence
    // Clear emergingTheme
    // Strengthen primary anchor confidence
  }

  /**
   * Get suggestions filtered by pivot state
   * @param {Array} allSuggestions
   * @param {Actor} actor
   * @returns {Array} Filtered/reweighted suggestions
   */
  static filterSuggestionsByPivotState(allSuggestions, actor) {
    // If EXPLORATORY or PIVOTING:
    //   - Include new-theme suggestions
    //   - Lower confidence for old-anchor suggestions
    //   - Broaden overall suggestion pool
    // If LOCKED:
    //   - Normal weighting
    // If STABLE:
    //   - Normal weighting
  }
}
```

**Storage**: Writes to `actor.system.suggestionEngine.pivotDetector`
**Events**: Listens to feat/talent selections

---

### 2.5 SuggestionExplainer.js

**Responsibility**: Generate one-line "why" explanations for all suggestions.

**Public Interface**:
```javascript
class SuggestionExplainer {
  /**
   * Generate a one-line explanation for a suggestion
   * @param {Object} suggestion - { itemName, tier, theme, category }
   * @param {Actor} actor
   * @param {Object} context - { mentorAlignment, classSynergy, buildCoherence, anchor }
   * @returns {string} "You often act before enemies and invest in Dexterity—this improves your first-round impact."
   */
  static generateExplanation(suggestion, actor, context) {
    // Template selection logic:
    // 1. Check if itemName is in PRESTIGE_PREREQ suggestion
    //    -> Use "prestige_path" template
    // 2. Check if matches anchor
    //    -> Use "anchor_support" template
    // 3. Check if synergy (from CommunityMetaSynergies)
    //    -> Use "synergy_match" template
    // 4. Check if theme continuation
    //    -> Use "theme_continuity" template
    // 5. Check if class synergy
    //    -> Use "class_synergy" template
    // 6. Check if party gap
    //    -> Use "gap_fill" template (if party-aware)
    // 7. Fallback
    //    -> Use "skill_enhancement" or generic

    // Apply context variables
    // Keep under 1 line (max ~100 chars)
  }

  /**
   * Template registry
   * @returns {Object} Templates with {context} placeholders
   */
  static getTemplates() {
    return {
      prestige_path: "Step toward {prestigeClass}—you're {percentComplete}% there.",
      anchor_support: "Strengthens your {anchorName} playstyle.",
      synergy_match: "{existingFeat} works perfectly with this.",
      theme_continuity: "You've been building {themeName}—this continues that path.",
      class_synergy: "Fits {className}'s core mechanics.",
      gap_fill: "Your group lacks {partyRole}—this could help.",
      skill_enhancement: "Boosts a skill you rely on.",
      attribute_alignment: "Uses your strong {highestAttribute}.",
      chain_continuation: "Builds on {precedingFeat}.",
      fallback: "Legal option for your character."
    };
  }

  /**
   * Detect repetition (avoid showing same explanation)
   * @param {string} explanation
   * @param {Actor} actor
   * @param {number} levelsBack - How many levels back to check
   * @returns {boolean} Is this explanation fresh?
   */
  static isExplanationFresh(explanation, actor, levelsBack = 3) {
    // Check actor.system.suggestionEngine.explanationContext.lastUsedTemplates
    // If same template used in last N levels, rotate variant
  }
}
```

**Storage**: Reads from `actor.system.suggestionEngine.explanationContext`
**Integration**: Called whenever SuggestionEngine generates a suggestion

---

## 3. INTEGRATION WITH EXISTING ARCHITECTURE

### 3.1 Modifications to SuggestionEngine.js

**Before returning suggestions**:
1. Call `SuggestionConfidence.calculateConfidence(suggestion, actor, context)`
2. Attach confidence metadata to each suggestion
3. Call `PlayerHistoryTracker.recordSuggestionShown(actor, suggestion, confidence, context)`
4. Call `SuggestionExplainer.generateExplanation(suggestion, actor, context)`

**In mentor dialog**:
- Sort suggestions by: **tier** first, then **confidence**, then **alphabetical**
- Display confidence level as visual indicator (⭐ Strong | ◼ Suggested | ◻ Possible)
- Show explanation below suggestion name

### 3.1.1 Low-Confidence Suggestion Display ("Possible Synergy")

**Default Behavior** (< 0.4 confidence):
- Group under collapsible section: "Possible Synergies (Optional)"
- Collapsed by default
- Expandable on click (shows all low-confidence suggestions)
- Maintains mentor tone: "You might consider…"

**Show Prominently When**:
- Player enables "Show All Suggestions" toggle
- Player sets strictness to "Exploratory"
- Character is in EXPLORATORY or PIVOTING pivot state
- Last 3 levels show consistent off-theme picks

**Why Collapsed, Not Hidden**:
- Respects experienced players (less noise)
- Still allows discovery
- Accessible to players who want to explore
- Avoids "hidden suggestions feel arbitrary" complaint

### 3.2 Modifications to BuildIntent.js

**Integration points**:
- `BuildIntent.analyze(actor)` calls `BuildIdentityAnchor.validateAndUpdateAnchor(actor)`
- `BuildIntent.analyze(actor)` calls `PivotDetector.updatePivotState(actor)`
- `BuildIntent` exports anchor and pivot state for suggestion filtering

### 3.3 New Event Hooks

**On feat selection** (level-up):
```javascript
Hooks.on('swse:feat-selected', (actor, featId, level) => {
  PlayerHistoryTracker.recordSuggestionAccepted(actor, featId);
  BuildIdentityAnchor.validateAndUpdateAnchor(actor);
  PivotDetector.updatePivotState(actor);
  PlayerHistoryTracker.recalculateMetrics(actor);
});
```

**On level-up complete**:
```javascript
Hooks.on('swse:level-up-complete', (actor, newLevel) => {
  PlayerHistoryTracker.recalculateMetrics(actor);
  BuildIdentityAnchor.validateAndUpdateAnchor(actor, {});
  if (BuildIdentityAnchor.primary.state === 'proposed') {
    // Show player confirmation dialog
  }
});
```

**When suggestion ignored** (mentor dialog):
```javascript
Hooks.on('swse:suggestion-ignored', (actor, suggestionId, category) => {
  PlayerHistoryTracker.recordSuggestionIgnored(actor, suggestionId);
});
```

### 3.4 Storage Migration

**No migration needed** because `actor.system.suggestionEngine` doesn't exist yet.
Just initialize empty structure on first access:

```javascript
function ensureSuggestionEngineStorage(actor) {
  if (!actor.system.suggestionEngine) {
    actor.system.suggestionEngine = {
      mentorProfile: { completedAt: null, biases: {} },
      history: { suggestions: [], metrics: {} },
      anchors: { primary: {}, secondary: {}, history: [] },
      pivotDetector: { state: 'STABLE', transitionHistory: [], ... },
      explanationContext: { ... },
      preferences: {
        suggestionStrictness: 'balanced',
        showLowConfidenceSuggestions: true,
        allowPivotDetection: true,
        showReasons: true,
        suggestPartyGapFilling: true
      },
      version: 1,
      lastUpdatedAtLevel: actor.system.level || 1,
      createdAt: Date.now()
    };
  }
  return actor.system.suggestionEngine;
}
```

---

## 4. CLASS RESPONSIBILITIES AT A GLANCE

| Class | Reads | Writes | Events | Purpose |
|-------|-------|--------|--------|---------|
| **SuggestionConfidence** | mentorProfile, history.metrics, anchors | (none—returns object) | (internal) | Score confidence for each suggestion |
| **PlayerHistoryTracker** | history | history, history.metrics | swse:feat-selected, swse:suggestion-ignored | Track player choices, calculate metrics |
| **BuildIdentityAnchor** | All anchor data | anchors.primary, anchors.secondary | swse:level-up-complete | Detect/confirm/lock archetypes |
| **PivotDetector** | anchors, pivotDetector | pivotDetector | swse:feat-selected, swse:level-up-complete | Track build direction changes |
| **SuggestionExplainer** | explanationContext | explanationContext | (internal) | Generate one-line "why" strings |

---

## 5. DATA FLOW: Level-Up to Display

```
[Player levels up]
  ↓
[SuggestionEngineCoordinator.suggestFeats() called]
  ↓
[BuildIntent.analyze(actor) runs]
  → Calls BuildIdentityAnchor.validateAndUpdateAnchor()
  → Calls PivotDetector.updatePivotState()
  ↓
[SuggestionEngine.getSuggestions() generates tier-based list]
  ↓
[For each suggestion]:
  → SuggestionConfidence.calculateConfidence()
    (reads mentorProfile, history.metrics, anchors)
  → PlayerHistoryTracker.recordSuggestionShown()
    (writes to history.suggestions)
  → SuggestionExplainer.generateExplanation()
    (reads explanation context, returns string)
  → Attach: { confidence, level, explanation }
  ↓
[Sort by tier, then confidence, then alphabetical]
  ↓
[Render in mentor dialog]:
  ⭐ Strong Recommendation: Power Attack
  "You've been building melee—this continues that path."

  ◼ Suggested Option: Weapon Focus (Melee)
  "Fits Soldier's core mechanics."

  ◻ Possible Synergy: Increased Melee Damage
  "Legal option for your character."
```

---

## 6. WHAT PHASE 1A DELIVERS

✅ **Designed but NOT yet implemented**:
1. `SuggestionConfidence.js` - Class structure + algorithm
2. `PlayerHistoryTracker.js` - Data model + calculation methods
3. `BuildIdentityAnchor.js` - Archetype detection logic
4. `PivotDetector.js` - State machine + transitions
5. `SuggestionExplainer.js` - Template system + rules

✅ **Data Schema** in `actor.system.suggestionEngine`

✅ **Integration Points** with SuggestionEngine, BuildIntent, coordinator

✅ **Event Hooks** designed (not yet wired)

---

## 7. PHASE 1B READINESS CHECKLIST

Before moving to Phase 1B (implement + wire), verify:

- [ ] All 5 class files created with stub methods
- [ ] Data schema validated (no circular refs, clear ownership)
- [ ] Interface contracts documented
- [ ] Event hook names agreed upon
- [ ] SuggestionEngine integration points identified
- [ ] Storage initialization logic written
- [ ] Migration plan (if any) confirmed

**Next**: Create the 5 stub classes in Phase 1B, then wire hooks.

---

## 8. DECISIONS LOCKED (Architecture Phase Complete)

### Data & Storage
✅ Store in `actor.system.suggestionEngine` (portable, per-character)
✅ Add `meta` block for telemetry (version, counts, timestamps)
✅ Restructure history into `recent` (10-15 recent selections) + `aggregates` (metrics)

### Confidence Scoring
✅ Use 4 core inputs: mentorAlignment, classSynergy, playerAcceptanceHistory, buildCoherence
✅ Add optional `opportunityCost` dampener (prestige locks, stat conflicts, etc)
✅ Formula: baseScore * (1 - opportunityCost) * tierMultiplier * strictnessModifier

### Archetype Detection
✅ Use hardcoded archetype definitions (stable concepts)
✅ Make detection weights world-configurable (per-world tuning)
✅ ~8 archetypes: Frontline Damage, Controller, Face, Skill Monkey, Force DPS, Force Support, Tech, Sniper

### Pivot & Anchor Management
✅ Auto-detect anchors → soft-lock → player-confirm (3-step flow)
✅ Track recent events (not full history) to avoid overfitting to old decisions
✅ State machine: STABLE → EXPLORATORY → PIVOTING → LOCKED

### UI Behavior
✅ Show all suggestions, ranked by confidence (no hiding of legitimate options)
✅ Low-confidence suggestions (< 0.4) collapsed by default under "Possible Synergies"
✅ Expandable on click; shown prominently during EXPLORATORY/PIVOTING phases
✅ Display confidence as visual indicators: ⭐ Strong | ◼ Suggested | ◻ Possible
✅ Always show one-line "why" explanation

### Phase Progression
✅ Complete Phase 1A (architecture design)
✅ Ready for Phase 1B (scaffold 5 classes + wire hooks)

---

**Architecture complete. Ready for Phase 1B implementation.**

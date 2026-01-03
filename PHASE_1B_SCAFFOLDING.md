# SWSE Suggestion Engine Phase 1B: Scaffolding Plan

**Status**: Implementation Scaffolding (Stub Classes + Event Wiring)
**Objective**: Create 5 core classes with all method stubs, validate integration points, wire event hooks
**Deliverables**: Working skeleton that compiles, no logic yet

---

## 1. FILES TO CREATE

All files created in `/scripts/engine/` directory.

### Core Engine Classes (5 files)

1. **SuggestionConfidence.js** (NEW)
   - Calculates 0-1 confidence for each suggestion
   - ~300 lines (stubs + docstrings)

2. **PlayerHistoryTracker.js** (NEW)
   - Records suggestion feedback (shown/accepted/ignored/rejected)
   - Calculates acceptance rates and ignored weights
   - ~250 lines

3. **BuildIdentityAnchor.js** (NEW)
   - Detects build archetypes
   - Manages anchor lifecycle (proposed → confirmed → locked)
   - ~350 lines

4. **PivotDetector.js** (NEW)
   - Tracks build direction changes
   - State machine: STABLE → EXPLORATORY → PIVOTING → LOCKED
   - ~300 lines

5. **SuggestionExplainer.js** (NEW)
   - Generates one-line "why" explanations
   - Template system + context filling
   - ~200 lines

### Integration/Hook Files (2 files)

6. **SuggestionEngineHooks.js** (NEW)
   - Centralizes all event hook registrations
   - Wires callbacks for feat selection, level-up, etc.
   - ~150 lines

7. **ArchetypeDefinitions.js** (NEW)
   - Hardcoded archetype catalog
   - Default detection weights
   - World-configurable overrides
   - ~200 lines

---

## 2. CLASS STUBS: EXACT METHOD SIGNATURES

### 2.1 SuggestionConfidence.js

```javascript
export class SuggestionConfidence {
  /**
   * Calculate confidence score for a single suggestion
   * @param {Object} suggestion - { itemId, itemName, tier, category, theme }
   * @param {Actor} actor - The character
   * @param {Object} context - { mentorAlignment, classSynergy, playerAcceptanceHistory, buildCoherence, opportunityCost }
   * @returns {Object} { confidence: 0-1, level: "Strong"|"Suggested"|"Possible", score: 0-100 }
   */
  static calculateConfidence(suggestion, actor, context) {
    // TODO: Implement confidence calculation
    throw new Error('Not yet implemented');
  }

  /**
   * Get confidence level from 0-1 score
   * @param {number} confidence - 0-1
   * @returns {string} "Strong" | "Suggested" | "Possible"
   */
  static getConfidenceLevel(confidence) {
    // TODO: Implement tier mapping
    throw new Error('Not yet implemented');
  }

  /**
   * Apply strictness modifier (narrative/balanced/optimized)
   * @param {number} baseConfidence - 0-1
   * @param {string} strictness - "narrative" | "balanced" | "optimized"
   * @returns {number} Modified confidence 0-1
   */
  static applyStrictnessModifier(baseConfidence, strictness) {
    // TODO: Implement modifier
    throw new Error('Not yet implemented');
  }

  /**
   * Check if suggestion would cause opportunity cost
   * @param {Object} suggestion
   * @param {Actor} actor
   * @param {Object} pendingData
   * @returns {Object} { hasCost: boolean, reason: string, penalty: 0-1 }
   */
  static checkOpportunityCost(suggestion, actor, pendingData) {
    // TODO: Implement cost checking
    throw new Error('Not yet implemented');
  }
}
```

### 2.2 PlayerHistoryTracker.js

```javascript
export class PlayerHistoryTracker {
  /**
   * Record that a suggestion was shown to the player
   * @param {Actor} actor
   * @param {Object} suggestion
   * @param {Object} confidence - { confidence, level }
   * @param {Object} context - { mentorAlignment, classSynergy, buildCoherence }
   * @returns {Promise<string>} Suggestion ID (for later tracking)
   */
  static async recordSuggestionShown(actor, suggestion, confidence, context) {
    // TODO: Implement storage
    throw new Error('Not yet implemented');
  }

  /**
   * Record that player accepted a suggestion
   * @param {Actor} actor
   * @param {string} suggestionId
   * @returns {Promise<void>}
   */
  static async recordSuggestionAccepted(actor, suggestionId) {
    // TODO: Implement update
    throw new Error('Not yet implemented');
  }

  /**
   * Record mentor dialog ignore (explicit rejection)
   * @param {Actor} actor
   * @param {string} suggestionId
   * @returns {Promise<void>}
   */
  static async recordSuggestionIgnored(actor, suggestionId) {
    // TODO: Implement update
    throw new Error('Not yet implemented');
  }

  /**
   * Record passive ignore (shown but never took)
   * @param {Actor} actor
   * @param {string} suggestionId
   * @returns {Promise<void>}
   */
  static async recordSuggestionPassiveIgnored(actor, suggestionId) {
    // TODO: Implement update
    throw new Error('Not yet implemented');
  }

  /**
   * Calculate acceptance rate for a specific theme
   * @param {Actor} actor
   * @param {string} theme - From BUILD_THEMES
   * @returns {number} 0-1 (accepted / (accepted + ignored))
   */
  static getAcceptanceRateByTheme(actor, theme) {
    // TODO: Implement calculation
    throw new Error('Not yet implemented');
  }

  /**
   * Calculate negative weights for ignored themes
   * @param {Actor} actor
   * @returns {Object} { themeName: weight, ... }
   */
  static getIgnoredThemeWeights(actor) {
    // TODO: Implement calculation
    throw new Error('Not yet implemented');
  }

  /**
   * Get time since last suggestion (for cooldown)
   * @param {Actor} actor
   * @returns {number} Timestamp or 0 if never suggested
   */
  static getLastSuggestionTime(actor) {
    // TODO: Implement getter
    throw new Error('Not yet implemented');
  }

  /**
   * Recalculate all metrics (called on level-up)
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async recalculateMetrics(actor) {
    // TODO: Implement metric recalculation
    throw new Error('Not yet implemented');
  }

  /**
   * Initialize history storage for an actor
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    // TODO: Implement storage init
    throw new Error('Not yet implemented');
  }

  /**
   * Prune old history (keep only recent 10-15 selections)
   * @param {Actor} actor
   * @param {number} maxRecentSize - Default 15
   * @returns {Promise<void>}
   */
  static async pruneOldHistory(actor, maxRecentSize = 15) {
    // TODO: Implement pruning
    throw new Error('Not yet implemented');
  }
}
```

### 2.3 BuildIdentityAnchor.js

```javascript
export class BuildIdentityAnchor {
  /**
   * Detect potential anchor based on character's choices
   * @param {Actor} actor
   * @param {Object} pendingData - Current level selections
   * @returns {Object} { name, confidence: 0-1, evidence: {...} }
   */
  static detectAnchor(actor, pendingData) {
    // TODO: Implement detection
    throw new Error('Not yet implemented');
  }

  /**
   * Validate and update primary anchor after level-up
   * @param {Actor} actor
   * @param {Object} pendingData
   * @returns {Promise<Object>} { updated: boolean, anchor, state }
   */
  static async validateAndUpdateAnchor(actor, pendingData) {
    // TODO: Implement validation
    throw new Error('Not yet implemented');
  }

  /**
   * Player confirms an anchor (locks it in)
   * @param {Actor} actor
   * @param {string} anchorName
   * @returns {Promise<void>}
   */
  static async confirmAnchor(actor, anchorName) {
    // TODO: Implement confirmation
    throw new Error('Not yet implemented');
  }

  /**
   * Player rejects a proposed anchor
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async rejectAnchor(actor) {
    // TODO: Implement rejection
    throw new Error('Not yet implemented');
  }

  /**
   * Apply anchor bonus/penalty to suggestion confidence
   * @param {number} baseConfidence - 0-1
   * @param {Actor} actor
   * @param {Object} suggestion - { theme, category, itemName }
   * @returns {number} Adjusted confidence 0-1
   */
  static applyAnchorWeight(baseConfidence, actor, suggestion) {
    // TODO: Implement weighting
    throw new Error('Not yet implemented');
  }

  /**
   * Check if character's recent picks indicate a potential pivot
   * @param {Actor} actor
   * @returns {Object|false} { emergingTheme, confidence } or false
   */
  static checkForPotentialPivot(actor) {
    // TODO: Implement detection
    throw new Error('Not yet implemented');
  }

  /**
   * Get anchor by key/name
   * @param {Actor} actor
   * @param {string} position - "primary" | "secondary"
   * @returns {Object|null}
   */
  static getAnchor(actor, position = "primary") {
    // TODO: Implement getter
    throw new Error('Not yet implemented');
  }

  /**
   * Initialize anchor storage
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    // TODO: Implement init
    throw new Error('Not yet implemented');
  }
}
```

### 2.4 PivotDetector.js

```javascript
export class PivotDetector {
  /**
   * Update pivot state based on recent selections
   * @param {Actor} actor
   * @param {Object} pendingData
   * @returns {Object} { state, transitioned: boolean, newState, evidence: {...} }
   */
  static updatePivotState(actor, pendingData) {
    // TODO: Implement state machine
    throw new Error('Not yet implemented');
  }

  /**
   * Transition to EXPLORATORY state
   * @param {Actor} actor
   * @param {string} reason - Human-readable reason
   * @returns {Promise<void>}
   */
  static async enterExploratory(actor, reason) {
    // TODO: Implement transition
    throw new Error('Not yet implemented');
  }

  /**
   * Transition to PIVOTING state
   * @param {Actor} actor
   * @param {string} emergingTheme
   * @returns {Promise<void>}
   */
  static async enterPivoting(actor, emergingTheme) {
    // TODO: Implement transition
    throw new Error('Not yet implemented');
  }

  /**
   * Confirm pivot, promote secondary anchor to primary
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async lockNewAnchor(actor) {
    // TODO: Implement transition
    throw new Error('Not yet implemented');
  }

  /**
   * Reject pivot, return to STABLE with reinforced primary anchor
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async returnToStable(actor) {
    // TODO: Implement transition
    throw new Error('Not yet implemented');
  }

  /**
   * Get current pivot state
   * @param {Actor} actor
   * @returns {string} "STABLE" | "EXPLORATORY" | "PIVOTING" | "LOCKED"
   */
  static getState(actor) {
    // TODO: Implement getter
    throw new Error('Not yet implemented');
  }

  /**
   * Filter suggestions based on pivot state
   * @param {Array} suggestions
   * @param {Actor} actor
   * @returns {Array} Filtered/reweighted suggestions
   */
  static filterSuggestionsByPivotState(suggestions, actor) {
    // TODO: Implement filtering
    throw new Error('Not yet implemented');
  }

  /**
   * Initialize pivot detector storage
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    // TODO: Implement init
    throw new Error('Not yet implemented');
  }
}
```

### 2.5 SuggestionExplainer.js

```javascript
export class SuggestionExplainer {
  /**
   * Generate one-line explanation for why a suggestion is made
   * @param {Object} suggestion - { itemName, tier, theme, category }
   * @param {Actor} actor
   * @param {Object} context - { mentorAlignment, classSynergy, buildCoherence, anchor, synergy }
   * @returns {string} One-line explanation (max ~100 chars)
   */
  static generateExplanation(suggestion, actor, context) {
    // TODO: Implement explanation generation
    throw new Error('Not yet implemented');
  }

  /**
   * Get all available explanation templates
   * @returns {Object} { templateKey: template string, ... }
   */
  static getTemplates() {
    // TODO: Return template registry
    throw new Error('Not yet implemented');
  }

  /**
   * Fill template variables with dynamic context
   * @param {string} template
   * @param {Object} variables - { prestigeClass, anchorName, themeName, etc }
   * @returns {string} Filled template
   */
  static fillTemplate(template, variables) {
    // TODO: Implement variable substitution
    throw new Error('Not yet implemented');
  }

  /**
   * Check if explanation has been recently used (avoid repetition)
   * @param {string} explanation
   * @param {Actor} actor
   * @param {number} levelsBack - Default 3
   * @returns {boolean} Is this explanation fresh?
   */
  static isExplanationFresh(explanation, actor, levelsBack = 3) {
    // TODO: Implement freshness check
    throw new Error('Not yet implemented');
  }

  /**
   * Get explanation template variant (if primary was recent)
   * @param {string} templateKey
   * @param {Actor} actor
   * @returns {string} Alternative template variant
   */
  static getTemplateVariant(templateKey, actor) {
    // TODO: Implement variant logic
    throw new Error('Not yet implemented');
  }

  /**
   * Initialize explanation context
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    // TODO: Implement init
    throw new Error('Not yet implemented');
  }
}
```

---

## 3. NEW SUPPORTING FILES

### 3.1 ArchetypeDefinitions.js

```javascript
/**
 * Hardcoded archeype definitions for build identity detection
 * Defines stable concepts; weights are configurable per world
 */

export const ARCHETYPE_CATALOG = {
  // Melee-focused archetypes
  "Frontline Damage Dealer": {
    key: "frontline_damage",
    description: "High damage output, melee-focused, high HP",
    signals: {
      meleeTalents: 0.4,
      strengthInvestment: 0.3,
      hpOrArmor: 0.3
    }
  },

  "Battlefield Controller": {
    key: "controller",
    description: "Crowd control, positioning, Force or tactical abilities",
    signals: {
      controlTalents: 0.5,
      wisdomInvestment: 0.3,
      rangedCombat: 0.2
    }
  },

  // Social-focused archetypes
  "Face / Social Manipulator": {
    key: "face",
    description: "Leadership, persuasion, deception, charisma-based",
    signals: {
      socialSkills: 0.6,
      charismaInvestment: 0.4
    }
  },

  "Skill Monkey": {
    key: "skill_monkey",
    description: "High skill variety, utility, jack-of-all-trades",
    signals: {
      skillFeatCount: 0.5,
      intelligenceInvestment: 0.3,
      dexterityInvestment: 0.2
    }
  },

  // Force-focused archetypes
  "Force DPS": {
    key: "force_dps",
    description: "Lightsaber combat with heavy Force damage",
    signals: {
      forceSensitivity: 0.4,
      lightsaberFocus: 0.4,
      damageOrientation: 0.2
    }
  },

  "Force Control / Support": {
    key: "force_control",
    description: "Force-based control and support abilities",
    signals: {
      forceTraining: 0.4,
      controlTalents: 0.35,
      supportAbilities: 0.25
    }
  },

  // Tech-focused archetypes
  "Tech Specialist": {
    key: "tech_specialist",
    description: "Mechanics, computers, tech skills focus",
    signals: {
      techSkills: 0.6,
      intelligenceInvestment: 0.4
    }
  },

  // Ranged/Stealth archetypes
  "Sniper / Ranged": {
    key: "sniper",
    description: "Ranged damage, precision, positioning",
    signals: {
      rangedFeats: 0.4,
      dexterityInvestment: 0.3,
      skillFocus: 0.3
    }
  },

  "Assassin / Stealth": {
    key: "assassin",
    description: "Stealth, burst damage, infiltration",
    signals: {
      stealthFeats: 0.4,
      dexterityInvestment: 0.3,
      stealthSkills: 0.3
    }
  }
};

/**
 * Default detection weights (can be overridden per world)
 */
export const DEFAULT_ARCHETYPE_WEIGHTS = {
  // How much each signal contributes to detection
  // These are multipliers applied per-world config
  signalWeight: 1.0,          // Base multiplier for all signals
  attributeWeight: 1.0,       // How much attribute investment matters
  featWeight: 1.0,            // How much feat choice matters
  talentWeight: 1.0,          // How much talent tree matters
  skillWeight: 1.0            // How much skill investment matters
};

/**
 * Configuration object for world-level tuning
 * Example:
 * {
 *   archetypes: {
 *     frontline_damage: {
 *       enabled: true,
 *       signals: { meleeTalents: 0.5, strengthInvestment: 0.3, hpOrArmor: 0.2 }
 *     }
 *   }
 * }
 */
export function getArchetypeConfig(world = null) {
  // TODO: Load from world settings if available
  // Fallback to ARCHETYPE_CATALOG
  throw new Error('Not yet implemented');
}
```

### 3.2 SuggestionEngineHooks.js

```javascript
/**
 * Central hook registry for suggestion engine events
 * Wires callbacks for feat selection, level-up, mentor dialog completion
 */

import { PlayerHistoryTracker } from './PlayerHistoryTracker.js';
import { BuildIdentityAnchor } from './BuildIdentityAnchor.js';
import { PivotDetector } from './PivotDetector.js';

export class SuggestionEngineHooks {
  /**
   * Initialize all hooks
   * Called during system ready
   */
  static initialize() {
    // TODO: Register hooks
    // - Hooks.on('swse:feat-selected', onFeatSelected)
    // - Hooks.on('swse:talent-selected', onTalentSelected)
    // - Hooks.on('swse:level-up-complete', onLevelUpComplete)
    // - Hooks.on('swse:mentor-dialog-complete', onMentorDialogComplete)
    // - Hooks.on('swse:suggestion-ignored', onSuggestionIgnored)
    throw new Error('Not yet implemented');
  }

  /**
   * Handle feat selection event
   */
  static async onFeatSelected(actor, featId, level) {
    // TODO: Call PlayerHistoryTracker.recordSuggestionAccepted
    // TODO: Call BuildIdentityAnchor.validateAndUpdateAnchor
    // TODO: Call PivotDetector.updatePivotState
    throw new Error('Not yet implemented');
  }

  /**
   * Handle talent selection event
   */
  static async onTalentSelected(actor, talentId, level) {
    // TODO: Same as onFeatSelected
    throw new Error('Not yet implemented');
  }

  /**
   * Handle level-up completion
   */
  static async onLevelUpComplete(actor, newLevel) {
    // TODO: Call PlayerHistoryTracker.recalculateMetrics
    // TODO: Check for anchor confirmation dialog
    // TODO: Check for pivot detection
    throw new Error('Not yet implemented');
  }

  /**
   * Handle mentor dialog completion (suggestions finalized)
   */
  static async onMentorDialogComplete(actor, suggestionsShown) {
    // TODO: Mark any unselected suggestions as "passiveIgnored"
    throw new Error('Not yet implemented');
  }

  /**
   * Handle suggestion explicitly ignored (player said "no")
   */
  static async onSuggestionIgnored(actor, suggestionId, category) {
    // TODO: Call PlayerHistoryTracker.recordSuggestionIgnored
    throw new Error('Not yet implemented');
  }
}
```

---

## 4. INTEGRATION CHECKLIST

### Modifications to Existing Files

**SuggestionEngineCoordinator.js**:
- [ ] Import all 5 new classes
- [ ] Call `SuggestionEngineHooks.initialize()` in `initialize()` method
- [ ] Add public methods:
  - `recordSuggestionShown(actor, suggestion, confidence, context)`
  - `recordSuggestionAccepted(actor, suggestionId)`
  - `recordSuggestionIgnored(actor, suggestionId)`

**SuggestionEngine.js**:
- [ ] Import `SuggestionConfidence`
- [ ] After tier calculation, call `SuggestionConfidence.calculateConfidence()`
- [ ] Attach confidence metadata to each suggestion
- [ ] Call `SuggestionExplainer.generateExplanation()`
- [ ] Call `PlayerHistoryTracker.recordSuggestionShown()`

**BuildIntent.js**:
- [ ] Import `BuildIdentityAnchor`, `PivotDetector`
- [ ] Call `BuildIdentityAnchor.validateAndUpdateAnchor()` in `analyze()`
- [ ] Call `PivotDetector.updatePivotState()` in `analyze()`
- [ ] Export anchor and pivot state for other modules

**mentor-suggestion-dialog.js**:
- [ ] Display confidence indicators (⭐ Strong | ◼ Suggested | ◻ Possible)
- [ ] Show explanation strings below each suggestion
- [ ] Collapse low-confidence suggestions under "Possible Synergies"
- [ ] Add expand/collapse logic for low-confidence section

---

## 5. INITIALIZATION LOGIC

### Storage Initialization (called on first use)

```javascript
export async function ensureSuggestionEngineStorage(actor) {
  if (!actor.system.suggestionEngine) {
    actor.system.suggestionEngine = {
      mentorProfile: { completedAt: null, biases: {} },
      history: { recent: [], aggregates: {} },
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
      meta: {
        version: 1,
        created: Date.now(),
        lastUpdated: Date.now(),
        lastUpdatedAtLevel: actor.system.level || 1,
        totalSuggestionsShown: 0,
        totalSuggestionsAccepted: 0,
        totalSuggestionsIgnored: 0
      }
    };
    await actor.update({ 'system.suggestionEngine': actor.system.suggestionEngine });
  }
  return actor.system.suggestionEngine;
}
```

---

## 6. PHASE 1B DELIVERABLES

### Files Created
- ✅ SuggestionConfidence.js (stub class)
- ✅ PlayerHistoryTracker.js (stub class)
- ✅ BuildIdentityAnchor.js (stub class)
- ✅ PivotDetector.js (stub class)
- ✅ SuggestionExplainer.js (stub class)
- ✅ ArchetypeDefinitions.js (archetype catalog)
- ✅ SuggestionEngineHooks.js (hook registry)

### Integration Points Wired
- ✅ SuggestionEngineCoordinator imports all classes
- ✅ SuggestionEngine calls confidence + explanation methods
- ✅ BuildIntent calls anchor + pivot detection
- ✅ Event hooks registered

### What's NOT yet implemented
- ❌ Actual confidence calculation logic
- ❌ History tracking database operations
- ❌ Anchor detection algorithm
- ❌ Pivot state machine logic
- ❌ Explanation generation
- ❌ Hook callbacks

All will be filled in Phase 1C (implementation) once architecture is validated.

---

## 7. TEST READINESS

Once Phase 1B is complete, we can verify:

1. **Compilation**: All 5 classes import correctly, no syntax errors
2. **Method Stubs**: All methods exist with correct signatures
3. **Storage**: Initialization creates correct structure
4. **Hooks**: Events fire (console logs for now)
5. **Data Flow**: Suggestion → confidence → history → storage path works

No unit tests required at this stage (Phase 1C).

---

**Status**: Ready for implementation.
Next: Begin Phase 1B scaffolding (create stub files, wire integrations).

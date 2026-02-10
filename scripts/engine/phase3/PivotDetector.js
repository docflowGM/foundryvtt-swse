/**
 * Phase 3: PivotDetector (Simplified)
 *
 * Clean, mentor-ready pivot detection and lifecycle.
 * This is a strategic simplification of Phase 2B logic.
 *
 * Responsibilities:
 * - Detect when player is changing build direction
 * - Manage pivot lifecycle (STABLE → EXPLORATORY → PIVOTING)
 * - Track divergence from locked anchor
 * - Provide mentor with context for relaxed guidance
 */

export const PivotState = {
  STABLE: 'stable',
  EXPLORATORY: 'exploratory',
  PIVOTING: 'pivoting'
};

// Theme to archetype mapping for divergence detection
const THEME_TO_ARCHETYPE = {
  'melee': ['frontline_damage', 'assassin'],
  'force': ['force_dps', 'force_control'],
  'ranged': ['sniper', 'assassin'],
  'stealth': ['assassin', 'sniper'],
  'social': ['face', 'controller'],
  'tech': ['tech_specialist', 'skill_monkey'],
  'leadership': ['controller', 'face'],
  'support': ['force_control', 'controller'],
  'combat': ['frontline_damage', 'controller'],
  'exploration': ['skill_monkey', 'sniper'],
  'vehicle': ['sniper', 'tech_specialist'],
  'tracking': ['sniper', 'skill_monkey']
};

export class PivotDetector {
  constructor(anchorArchetype = null) {
    this.anchorArchetype = anchorArchetype;  // Set when anchor locks
    this.state = PivotState.STABLE;
    this.divergence = 0;
    this.emergingTheme = null;
  }

  /**
   * Update pivot state based on recent theme selections
   * Called after each level-up
   */
  update(recentThemes = []) {
    // No anchor = always exploratory
    if (!this.anchorArchetype) {
      this.state = PivotState.EXPLORATORY;
      this.divergence = 0.5;
      return;
    }

    if (!recentThemes.length) {
      this.state = PivotState.STABLE;
      this.divergence = 0;
      return;
    }

    // Calculate divergence: percentage of off-theme picks
    const recentPicks = recentThemes.slice(-10);  // Last 10 picks
    let offThemeCount = 0;
    const themeFreq = {};

    for (const theme of recentPicks) {
      if (!theme) {continue;}
      themeFreq[theme] = (themeFreq[theme] || 0) + 1;

      const archetypes = THEME_TO_ARCHETYPE[theme] || [];
      if (!archetypes.includes(this.anchorArchetype)) {
        offThemeCount++;
      }
    }

    this.divergence = offThemeCount / Math.max(1, recentPicks.length);

    // Find emerging theme (most frequent off-theme)
    let maxCount = 0;
    this.emergingTheme = null;
    for (const [theme, count] of Object.entries(themeFreq)) {
      const archetypes = THEME_TO_ARCHETYPE[theme] || [];
      if (archetypes.includes(this.anchorArchetype)) {continue;}  // Skip anchor theme
      if (count > maxCount) {
        this.emergingTheme = theme;
        maxCount = count;
      }
    }

    // State machine transitions
    const oldState = this.state;

    if (oldState === PivotState.STABLE) {
      // STABLE -> EXPLORATORY (30% divergence)
      if (this.divergence >= 0.3) {
        this.state = PivotState.EXPLORATORY;
      }
    } else if (oldState === PivotState.EXPLORATORY) {
      // EXPLORATORY -> STABLE (low divergence)
      if (this.divergence < 0.2) {
        this.state = PivotState.STABLE;
      }
      // EXPLORATORY -> PIVOTING (>60% divergence in emerging theme)
      else if (this.divergence > 0.6 && this.emergingTheme) {
        this.state = PivotState.PIVOTING;
      }
    } else if (oldState === PivotState.PIVOTING) {
      // PIVOTING -> STABLE (return to anchor)
      if (this.divergence < 0.2) {
        this.state = PivotState.STABLE;
        this.emergingTheme = null;
      }
      // PIVOTING -> EXPLORATORY (lost focus)
      else if (this.divergence < 0.4) {
        this.state = PivotState.EXPLORATORY;
      }
    }
  }

  /**
   * Lock pivot to an emerging theme
   * Called when anchor transitions to confirmed pivot
   */
  confirmPivot(newArchetype) {
    this.anchorArchetype = newArchetype;
    this.state = PivotState.STABLE;
    this.divergence = 0;
    this.emergingTheme = null;
  }

  /**
   * Is this pivot providing context for mentor decisions?
   */
  isActive() {
    return this.state === PivotState.EXPLORATORY || this.state === PivotState.PIVOTING;
  }

  /**
   * Should mentor acknowledge an emerging pivot?
   */
  hasEmergingTheme() {
    return this.state === PivotState.PIVOTING && this.emergingTheme !== null;
  }
}

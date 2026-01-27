/**
 * Phase 3: BuildIdentityAnchor (Simplified)
 *
 * Clean, mentor-ready identity anchor detection and lifecycle.
 * This is a strategic simplification of Phase 2A logic.
 *
 * Responsibilities:
 * - Detect player archetype from behavior
 * - Manage anchor lifecycle (NONE → PROPOSED → LOCKED → WEAKENING)
 * - Never auto-lock (only player confirmation locks)
 * - Provide mentor with identity context
 */

export const AnchorState = {
  NONE: 'none',
  PROPOSED: 'proposed',
  LOCKED: 'locked',
  WEAKENING: 'weakening'
};

export class BuildIdentityAnchor {
  constructor() {
    this.archetype = null;
    this.state = AnchorState.NONE;
    this.consistency = 0;
    this.confirmed = false;
  }

  /**
   * Update anchor based on recent theme selections
   * Called after each level-up
   */
  update(recentThemes = []) {
    if (!recentThemes.length) {
      this.reset();
      return;
    }

    // Find dominant theme
    const counts = {};
    for (const t of recentThemes) {
      counts[t] = (counts[t] || 0) + 1;
    }

    const entries = Object.entries(counts);
    if (!entries.length) {
      this.reset();
      return;
    }

    const [dominant, freq] = entries.sort((a, b) => b[1] - a[1])[0];
    this.archetype = dominant;
    this.consistency = freq / recentThemes.length;

    // State machine
    if (this.state === AnchorState.NONE && this.consistency >= 0.6) {
      this.state = AnchorState.PROPOSED;
    } else if (this.state === AnchorState.PROPOSED) {
      if (this.confirmed) {
        this.state = AnchorState.LOCKED;
      } else if (this.consistency < 0.5) {
        this.reset();
      }
    } else if (this.state === AnchorState.LOCKED && this.consistency < 0.4) {
      this.state = AnchorState.WEAKENING;
    } else if (this.state === AnchorState.WEAKENING) {
      if (this.consistency >= 0.6) {
        this.state = AnchorState.LOCKED;
      } else if (this.consistency < 0.3) {
        this.reset();
      }
    }
  }

  confirm() {
    if (this.state === AnchorState.PROPOSED) {
      this.confirmed = true;
      this.state = AnchorState.LOCKED;
    }
  }

  reject() {
    if (this.state === AnchorState.PROPOSED) {
      this.reset();
    }
  }

  reset() {
    this.state = AnchorState.NONE;
    this.archetype = null;
    this.consistency = 0;
    this.confirmed = false;
  }

  /**
   * Is this anchor "speaking weight" for mentor?
   * Only locked anchors influence mentor recommendations
   */
  hasWeight() {
    return this.state === AnchorState.LOCKED;
  }

  /**
   * Should mentor acknowledge a potential pivot?
   */
  hasEmergingPivot(newTheme) {
    return this.state === AnchorState.LOCKED && newTheme !== this.archetype;
  }
}

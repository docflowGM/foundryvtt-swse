/**
 * PHASE 4: Governance System
 * Per-actor governance control and enforcement modes
 *
 * Stored in actor.system.governance:
 * {
 *   enforcementMode: 'normal' | 'override' | 'freeBuild',
 *   approvedBy: userId,
 *   reason: string,
 *   timestamp: number,
 *   visibilityMode: 'banner' | 'visualTheme' | 'hidden'
 * }
 */

import { SWSELogger } from '../../utils/logger.js';

export class GovernanceSystem {

  static ENFORCEMENT_MODES = {
    NORMAL: 'normal',        // Full enforcement, detection on, tracking on
    OVERRIDE: 'override',    // No enforcement, detection on, tracking on, GM approval required
    FREEBUILD: 'freeBuild'   // No enforcement, detection on, tracking on, GM only
  };

  static VISIBILITY_MODES = {
    BANNER: 'banner',           // Show governance badge only
    VISUAL_THEME: 'visualTheme', // Show badge + subtle tint
    HIDDEN: 'hidden'            // Hide from players, show to GM
  };

  /**
   * Initialize governance system for an actor.
   * If no governance exists, create default (normal mode).
   * @static
   */
  static initializeGovernance(actor) {
    if (!actor.system.governance) {
      actor.system.governance = {
        enforcementMode: this.ENFORCEMENT_MODES.NORMAL,
        approvedBy: null,
        reason: null,
        timestamp: null,
        visibilityMode: this.VISIBILITY_MODES.BANNER
      };
    }

    // Ensure all fields exist
    actor.system.governance.enforcementMode ??= this.ENFORCEMENT_MODES.NORMAL;
    actor.system.governance.visibilityMode ??= this.VISIBILITY_MODES.BANNER;
    actor.system.governance.approvedBy ??= null;
    actor.system.governance.reason ??= null;
    actor.system.governance.timestamp ??= null;

    return actor.system.governance;
  }

  /**
   * Set enforcement mode for an actor.
   * Only GMs can do this.
   * @static
   */
  static setEnforcementMode(actor, mode, options = {}) {
    if (!game.user.isGM) {
      throw new Error('Only GMs can set enforcement modes');
    }

    if (!Object.values(this.ENFORCEMENT_MODES).includes(mode)) {
      throw new Error(`Invalid enforcement mode: ${mode}`);
    }

    this.initializeGovernance(actor);

    const oldMode = actor.system.governance.enforcementMode;
    actor.system.governance.enforcementMode = mode;
    actor.system.governance.approvedBy = game.user.id;
    actor.system.governance.timestamp = Date.now();
    actor.system.governance.reason = options.reason || null;

    // Log the change
    SWSELogger.log(`[GOVERNANCE] ${actor.name}: ${oldMode} → ${mode}`, {
      actor: actor.name,
      oldMode,
      newMode: mode,
      reason: options.reason || 'No reason provided',
      approvedBy: game.user.name
    });

    // Emit hook for external systems
    Hooks.callAll('swse.governanceMode', {
      actor,
      oldMode,
      newMode: mode,
      reason: options.reason,
      timestamp: actor.system.governance.timestamp
    });

    return actor.system.governance;
  }

  /**
   * Set visibility mode for free build indicators.
   * Only GMs can do this.
   * @static
   */
  static setVisibilityMode(mode) {
    if (!game.user.isGM) {
      throw new Error('Only GMs can set visibility modes');
    }

    if (!Object.values(this.VISIBILITY_MODES).includes(mode)) {
      throw new Error(`Invalid visibility mode: ${mode}`);
    }

    // Store in world settings
    game.settings.set('foundryvtt-swse', 'governanceVisibilityMode', mode);

    SWSELogger.log(`[GOVERNANCE] World visibility mode: ${mode}`, {
      mode,
      appliedBy: game.user.name
    });

    return mode;
  }

  /**
   * Get visibility mode setting.
   * @static
   */
  static getVisibilityMode() {
    return game.settings.get('foundryvtt-swse', 'governanceVisibilityMode') || this.VISIBILITY_MODES.BANNER;
  }

  /**
   * Check if enforcement is active for an actor.
   * @static
   */
  static isEnforcementActive(actor) {
    this.initializeGovernance(actor);
    return actor.system.governance.enforcementMode === this.ENFORCEMENT_MODES.NORMAL;
  }

  /**
   * Check if actor is in free build mode.
   * @static
   */
  static isFreeBuild(actor) {
    this.initializeGovernance(actor);
    return actor.system.governance.enforcementMode === this.ENFORCEMENT_MODES.FREEBUILD;
  }

  /**
   * Check if actor is in override mode.
   * @static
   */
  static isOverride(actor) {
    this.initializeGovernance(actor);
    return actor.system.governance.enforcementMode === this.ENFORCEMENT_MODES.OVERRIDE;
  }

  /**
   * Get governance badge for UI display.
   * @static
   */
  static getGoveranceBadge(actor) {
    this.initializeGovernance(actor);
    const mode = actor.system.governance.enforcementMode;

    if (mode === this.ENFORCEMENT_MODES.FREEBUILD) {
      return { label: 'FB', title: 'Free Build Mode - No enforcement', class: 'swse-governance-freebuild' };
    }

    if (mode === this.ENFORCEMENT_MODES.OVERRIDE) {
      return { label: 'OM', title: 'Override Mode - No enforcement', class: 'swse-governance-override' };
    }

    return null; // No badge in normal mode
  }

  /**
   * Should show governance indicator to this player?
   * @static
   */
  static shouldShowGovernanceBadge(actor, user = game.user) {
    if (user.isGM) return true; // GMs always see it

    // Check visibility setting
    const visMode = this.getVisibilityMode();
    if (visMode === this.VISIBILITY_MODES.HIDDEN) return false;

    return true; // Players see it in banner or visualTheme modes
  }

  /**
   * Get governance state as JSON (for export/debugging).
   * @static
   */
  static exportGovernance(actor) {
    this.initializeGovernance(actor);
    return {
      actor: actor.name,
      governance: actor.system.governance,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Register world settings for governance.
   * Called on system initialization.
   * @static
   */
  static registerWorldSettings() {
    game.settings.register('foundryvtt-swse', 'governanceVisibilityMode', {
      name: 'Free Build Visibility',
      hint: 'Controls how free build/override modes are displayed to players',
      scope: 'world',
      config: true,
      type: String,
      choices: {
        [this.VISIBILITY_MODES.BANNER]: 'Badge Only',
        [this.VISIBILITY_MODES.VISUAL_THEME]: 'Badge + Visual Tint',
        [this.VISIBILITY_MODES.HIDDEN]: 'Hidden from Players'
      },
      default: this.VISIBILITY_MODES.BANNER
    });

    game.settings.register('foundryvtt-swse', 'strictEnforcementEnabled', {
      name: 'Strict Enforcement (Experimental)',
      hint: 'If enabled, illegal mutations are rejected before creation. Currently logging only.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false
    });
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.GovernanceSystem = GovernanceSystem;
}

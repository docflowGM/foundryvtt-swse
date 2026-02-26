/**
 * PHASE 4: Governance Integration
 * Orchestrates all governance systems together
 *
 * This module coordinates:
 * - Governance system initialization
 * - Sheet-level UI integration (banner, buttons)
 * - Level-up gate enforcement
 * - Slot resolution flow
 * - Export marking
 * - Actor engine enforcement gates
 *
 * Called from system.js on initialization and from sheet classes.
 */

import { GovernanceSystem } from './governance-system.js';
import { IntegrityBanner } from './ui/integrity-banner.js';
import { LevelUpPreflightGate } from './enforcement/levelup-preflight-gate.js';
import { SlotResolutionFlow } from './ui/slot-resolution-flow.js';
import { ExportMarking } from './export/export-marking.js';
import { ActorEngineEnforcementGates } from './enforcement/actor-engine-enforcement-gates.js';
import { SWSELogger } from '../utils/logger.js';

export class GovernanceIntegration {

  /**
   * Initialize governance system on world load.
   * Called from system.js hooks.ready.
   * @static
   */
  static async initialize() {
    try {
      SWSELogger.log('[GOVERNANCE] Initializing governance system...');

      // Register world settings
      GovernanceSystem.registerWorldSettings();

      // Initialize all actors
      for (const actor of game.actors.values()) {
        GovernanceSystem.initializeGovernance(actor);
        ActorEngineEnforcementGates.logEnforcementStatus(actor);
      }

      SWSELogger.log('[GOVERNANCE] Initialization complete');

    } catch (err) {
      SWSELogger.error('[GOVERNANCE] Initialization failed:', err);
    }
  }

  /**
   * Integrate governance UI into actor sheet.
   * Call from sheet's _prepareContext() or _renderHTML().
   * @static
   */
  static prepareSheetContext(actor, context = {}) {
    if (!actor) return context;

    // Initialize governance
    GovernanceSystem.initializeGovernance(actor);

    // Prepare banner context
    context.integrityBanner = IntegrityBanner.prepareBannerContext(actor);

    // Add governance info to context
    context.governance = {
      mode: actor.system.governance.enforcementMode,
      enforcementActive: GovernanceSystem.isEnforcementActive(actor),
      badge: GovernanceSystem.getGoveranceBadge(actor)
    };

    // Add violation summary
    context.violations = ActorEngineEnforcementGates.getViolationSummary(actor);

    return context;
  }

  /**
   * Activate governance listeners on sheet.
   * Call from sheet's activateListeners().
   * @static
   */
  static activateSheetListeners(html, actor) {
    if (!actor) return;

    // Activate banner listeners
    IntegrityBanner.activateListeners(html, actor);

    // Activate level-up gate listeners (if applicable)
    this._activateLevelUpGate(html, actor);

    // Activate governance controls (GM only)
    if (game.user.isGM) {
      this._activateGovernanceControls(html, actor);
    }
  }

  /**
   * Attach level-up gate listener.
   * @private
   */
  static _activateLevelUpGate(html, actor) {
    const levelUpButton = html.querySelector('[data-action="level-up"]');
    if (!levelUpButton) return;

    const originalClick = levelUpButton.onclick;

    levelUpButton.addEventListener('click', async (e) => {
      const canProceed = await LevelUpPreflightGate.enforcePreflight(actor);
      if (!canProceed) {
        e.preventDefault();
        e.stopPropagation();
        LevelUpPreflightGate.logPreflight(actor, 'level-up', false);
      }
    });
  }

  /**
   * Attach governance control listeners (GM only).
   * @private
   */
  static _activateGovernanceControls(html, actor) {
    // Toggle enforcement mode dropdown
    const modeSelect = html.querySelector('[data-action="governance-mode"]');
    if (modeSelect) {
      modeSelect.addEventListener('change', (e) => {
        const mode = e.target.value;
        const reason = prompt('Optional reason for mode change:');

        try {
          GovernanceSystem.setEnforcementMode(actor, mode, { reason: reason || null });
          ui.notifications.info(`Governance mode changed to: ${mode}`);
        } catch (err) {
          SWSELogger.error('[GOVERNANCE] Failed to set mode:', err);
          ui.notifications.error('Failed to change governance mode');
        }
      });
    }
  }

  /**
   * Check governance on actor creation.
   * Called from createActor hooks.
   * @static
   */
  static onActorCreate(actor) {
    if (!actor) return;

    GovernanceSystem.initializeGovernance(actor);
    SWSELogger.log('[GOVERNANCE] New actor created with governance:', {
      actor: actor.name,
      mode: actor.system.governance.enforcementMode
    });
  }

  /**
   * Check governance on actor delete.
   * @static
   */
  static onActorDelete(actor) {
    if (!actor) return;

    SWSELogger.log('[GOVERNANCE] Actor deleted:', {
      actor: actor.name,
      mode: actor.system.governance?.enforcementMode
    });
  }

  /**
   * Handle actor export with marking.
   * Called from export hooks.
   * @static
   */
  static onExportActor(actor, exportData) {
    if (!actor) return exportData;

    return ExportMarking.markExportedActor(actor, exportData);
  }

  /**
   * Handle actor import with governance restoration.
   * Called from import hooks.
   * @static
   */
  static onImportActor(actor) {
    if (!actor) return;

    ExportMarking.handleImportedActor(actor);
    GovernanceSystem.initializeGovernance(actor);
  }

  /**
   * Render governance badge in UI (optional).
   * Can be embedded in templates or rendered dynamically.
   * @static
   */
  static renderGovernanceBadge(actor) {
    if (!actor) return '';

    const badge = GovernanceSystem.getGoveranceBadge(actor);
    if (!badge) return '';

    return `
      <span class="swse-governance-badge ${badge.class}" title="${badge.title}">
        ${badge.label}
      </span>
    `;
  }

  /**
   * Get governance debug info (console use).
   * @static
   */
  static getDebugInfo(actor) {
    if (!actor) return null;

    return {
      actor: actor.name,
      governance: actor.system.governance,
      violations: ActorEngineEnforcementGates.getViolationSummary(actor),
      canFinalize: ActorEngineEnforcementGates.canFinalize(actor),
      canLevelUp: LevelUpPreflightGate.canLevelUp(actor),
      validForProgression: ActorEngineEnforcementGates.isValidForProgression(actor)
    };
  }

  /**
   * Register hooks for governance system.
   * Call from system.js init.
   * @static
   */
  static registerHooks() {
    // Initialize governance on system ready
    Hooks.on('ready', () => this.initialize());

    // Track actor creation
    Hooks.on('createActor', (actor) => this.onActorCreate(actor));

    // Track actor deletion
    Hooks.on('deleteActor', (actor) => this.onActorDelete(actor));

    // Export marking
    Hooks.on('exportActor', (actor, data) => this.onExportActor(actor, data));

    // Import handling
    Hooks.on('importActor', (actor) => this.onImportActor(actor));

    // Integrity violation hook (from PrerequisiteIntegrityChecker)
    Hooks.on('swse.prerequisiteViolation', (data) => {
      this._handleViolation(data);
    });

    // Governance mode change hook
    Hooks.on('swse.governanceMode', (data) => {
      this._handleGovernanceModeChange(data);
    });

    SWSELogger.log('[GOVERNANCE] Hooks registered');
  }

  /**
   * Handle integrity violation.
   * @private
   */
  static _handleViolation(data) {
    const { actor, violations } = data;

    // Only log in DEV mode for verbose output
    if (SWSELogger.isDev()) {
      SWSELogger.log('[VIOLATION] Prerequisite violation:', {
        actor: actor.name,
        violations: violations.length,
        items: violations.map(v => v.itemName)
      });
    }
  }

  /**
   * Handle governance mode change.
   * @private
   */
  static _handleGovernanceModeChange(data) {
    const { actor, oldMode, newMode, reason } = data;

    SWSELogger.log('[GOVERNANCE] Mode changed:', {
      actor: actor.name,
      old: oldMode,
      new: newMode,
      reason: reason || 'No reason'
    });

    // Could emit chat message or other notifications here
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.GovernanceIntegration = GovernanceIntegration;
}

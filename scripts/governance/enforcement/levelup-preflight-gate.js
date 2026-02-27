/**
 * PHASE 4: Level-Up Preflight Gate
 * Enforces that actors cannot level up if they have unresolved violations
 *
 * Behavior:
 * - If missingPrerequisites is not empty AND enforcementMode === 'normal':
 *   Block level-up and show modal
 * - If enforcementMode !== 'normal':
 *   Allow level-up but keep warning visible
 *
 * Called from level-up UI hooks.
 */

import { SWSELogger } from '../utils/logger.js';
import { GovernanceSystem } from '../governance-system.js';
import { MissingPrereqsTracker } from '../integrity/missing-prereqs-tracker.js';
import { RebuildOrchestrator } from '../ui/rebuild-orchestrator.js';

export class LevelUpPreflightGate {

  /**
   * Check if actor can level up.
   * @static
   */
  static canLevelUp(actor) {
    if (!actor) return true;

    GovernanceSystem.initializeGovernance(actor);

    // If enforcement is not active, allow level-up
    if (!GovernanceSystem.isEnforcementActive(actor)) {
      return true;
    }

    // Check if there are missing prerequisites
    const tracking = MissingPrereqsTracker.getMissingPrerequisites(actor);
    const brokenItems = tracking.brokenItems || [];

    // If no violations, allow
    if (brokenItems.length === 0) {
      return true;
    }

    // Violations exist and enforcement is active
    return false;
  }

  /**
   * Show blocking dialog if level-up is prevented.
   * Call this BEFORE allowing level-up to proceed.
   * @static
   */
  static async showBlockingDialog(actor) {
    if (!actor) return;

    if (this.canLevelUp(actor)) {
      return; // Can proceed
    }

    GovernanceSystem.initializeGovernance(actor);

    // Blocked due to violations
    const tracking = MissingPrereqsTracker.getMissingPrerequisites(actor);
    const brokenCount = (tracking.brokenItems || []).length;

    const result = await new Promise((resolve) => {
      new foundry.applications.api.DialogV2({
        window: {
          title: 'Cannot Level Up',
          icon: 'fas fa-exclamation-circle'
        },
        content: `
          <div class="swse-levelup-gate">
            <p>
              <strong>${actor.name}</strong> has <strong>${brokenCount}</strong>
              unmet prerequisite${brokenCount === 1 ? '' : 's'}.
            </p>
            <p>
              You must resolve prerequisite violations before leveling up.
            </p>
            <p style="color: #666; font-size: 0.9em; margin-top: 12px;">
              <em>Click "Fix Issues" to resolve them, then level up again.</em>
            </p>
          </div>
        `,
        buttons: [
          {
            action: 'fix',
            label: 'Fix Issues',
            default: true,
            callback: () => resolve('fix')
          },
          {
            action: 'cancel',
            label: 'Cancel',
            callback: () => resolve('cancel')
          }
        ]
      }).render(true);
    });

    if (result === 'fix') {
      await RebuildOrchestrator.launch(actor);
    }
  }

  /**
   * Hook into level-up flow.
   * Call this from the level-up UI to enforce the gate.
   * @static
   */
  static async enforcePreflight(actor) {
    if (!actor) return false;

    // If actor can level up, return true (proceed)
    if (this.canLevelUp(actor)) {
      return true;
    }

    // Show blocking dialog
    await this.showBlockingDialog(actor);
    return false; // Block level-up
  }

  /**
   * Log preflight check for debugging.
   * @static
   */
  static logPreflight(actor, result) {
    SWSELogger.log('[LEVELUP-GATE] Preflight check', {
      actor: actor.name,
      canProceed: result,
      enforcement: GovernanceSystem.isEnforcementActive(actor) ? 'active' : 'inactive',
      timestamp: new Date().toISOString()
    });
  }
}

// CSS for level-up gate dialog
export const LEVELUP_GATE_STYLES = `
.swse-levelup-gate {
  padding: 8px 0;
  font-size: 0.95em;
  line-height: 1.6;
}

.swse-levelup-gate p {
  margin: 8px 0;
}

.swse-levelup-gate strong {
  color: #d32f2f;
  font-weight: 600;
}
`;

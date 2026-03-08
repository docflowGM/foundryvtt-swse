/**
 * Action Economy UI Bindings
 *
 * Provides reusable patterns for binding ActionEngine to UI buttons/controls.
 * Handles preview (hover), execution (click), and policy enforcement.
 *
 * GOVERNANCE:
 * - Pure helper functions (no state mutation)
 * - Works with ActionEngine and ActionPolicyController
 * - Integrates with enhanced-rolls.js rollAttack pattern
 * - Supports STRICT/LOOSE/NONE enforcement modes
 */

import { ActionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js";
import { ActionPolicyController } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-policy-controller.js";
import { ActionEconomyPersistence } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * ActionEconomyBindings — UI Integration Helpers
 *
 * @class ActionEconomyBindings
 */
export class ActionEconomyBindings {
  /**
   * Setup action economy preview on button hover
   * Shows whether action is permitted under current policy
   *
   * @param {HTMLElement} button - Button element to bind
   * @param {Actor} actor - Actor taking the action
   * @param {Object} actionCost - Cost of this action { standard, move, swift }
   * @param {string} actionName - Action name (for logging)
   */
  static setupPreview(button, actor, actionCost, actionName = 'action') {
    if (!button || !actor) return;

    const handleMouseEnter = () => {
      try {
        // Get current turn state from persistence layer
        const combatId = game.combat?.id;
        const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);

        // Preview consumption without modifying state
        const previewResult = ActionEngine.previewConsume(turnState, actionCost);

        // Apply policy (no override in preview)
        const policy = ActionPolicyController.handle({
          actor,
          result: previewResult,
          actionName
        });

        // Update UI based on policy
        const { uiState } = policy;

        if (!policy.permitted) {
          button.classList.add('action-blocked');
          button.title = uiState.tooltip || '';
          button.style.cursor = 'not-allowed';
          button.style.opacity = '0.6';
        } else {
          button.classList.remove('action-blocked');
          button.style.cursor = 'pointer';
          button.style.opacity = '1';
          if (uiState.tooltip) {
            button.title = uiState.tooltip;
          }
        }
      } catch (err) {
        SWSELogger.error(`[ActionEconomyBindings] Preview error for ${actionName}:`, err);
      }
    };

    const handleMouseLeave = () => {
      button.classList.remove('action-blocked');
      button.style.cursor = 'pointer';
      button.style.opacity = '1';
      button.title = '';
    };

    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);
  }

  /**
   * Setup action economy check on button click
   * Prevents action if blocked by STRICT policy
   * Warns if violated in LOOSE policy
   *
   * @param {HTMLElement} button - Button element
   * @param {Actor} actor - Actor taking the action
   * @param {Object} actionCost - Cost { standard, move, swift }
   * @param {Function} executeCallback - Function to execute if action allowed
   * @param {Object} options - Additional options
   * @param {string} options.actionName - Action name (for logging)
   */
  static setupExecution(button, actor, actionCost, executeCallback, options = {}) {
    if (!button || !actor || !executeCallback) return;

    const {
      actionName = 'action'
    } = options;

    button.addEventListener('click', async (e) => {
      try {
        // Get current turn state from persistence
        const combatId = game.combat?.id;
        if (!combatId) {
          ui.notifications.warn('No active combat');
          return;
        }

        const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);

        // Attempt to consume action
        const engineResult = ActionEngine.consume(turnState, actionCost);

        // Apply policy enforcement (check Shift+Click for GM override)
        const gmOverride = e.shiftKey && game.user.isGM;
        const policy = ActionPolicyController.handle({
          actor,
          result: engineResult,
          actionName,
          gmOverride
        });

        // Handle policy decision
        if (!policy.permitted) {
          ui.notifications.warn(policy.uiState.tooltip || 'Action not permitted');
          return;  // Blocked, don't proceed
        }

        // Execute callback if action allowed
        const result = await executeCallback();

        // Update persistent turn state on success
        if (result) {
          await ActionEconomyPersistence.commitConsumption(
            actor,
            combatId,
            engineResult
          );

          SWSELogger.info(`[ActionEconomyBindings] ${actor.name} consumed ${actionName}`, {
            consumed: engineResult.consumed
          });
        }

        return result;
      } catch (err) {
        SWSELogger.error(`[ActionEconomyBindings] Execution error for ${actionName}:`, err);
        ui.notifications.error(`Action failed: ${err.message}`);
      }
    });
  }


  /**
   * Get action availability indicator for UI display
   * Returns CSS class names for visual feedback
   *
   * @param {Actor} actor - Actor to check
   * @param {Object} actionCost - Cost to check
   * @returns {Object} { className, disabled, title }
   */
  static getAvailabilityIndicator(actor, actionCost) {
    if (!actor) {
      return { className: 'action-unavailable', disabled: true, title: 'No actor' };
    }

    const combatId = game.combat?.id;
    const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);
    const previewResult = ActionEngine.previewConsume(turnState, actionCost);

    if (!previewResult.allowed) {
      const violationLabels = previewResult.violations
        .map(v => this._violationLabel(v))
        .join(', ');
      return {
        className: 'action-unavailable',
        disabled: true,
        title: violationLabels || 'Action not available'
      };
    }

    return {
      className: 'action-available',
      disabled: false,
      title: 'Action available'
    };
  }

  /**
   * Convert violation code to human label
   * @private
   */
  static _violationLabel(code) {
    const labels = {
      FULL_ROUND_NOT_AVAILABLE: "full-round not available",
      INSUFFICIENT_STANDARD: "no standard action",
      INSUFFICIENT_MOVE: "no move action",
      INSUFFICIENT_SWIFT: "no swift actions"
    };
    return labels[code] ?? code;
  }

  /**
   * Create action status badge for UI
   * Shows action economy state in visual form
   *
   * @param {Actor} actor - Actor to check
   * @returns {string} HTML badge
   */
  static createStatusBadge(actor) {
    if (!actor) return '';

    const combatId = game.combat?.id;
    const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);
    const state = ActionEngine.getVisualState(turnState);
    const breakdown = ActionEngine.getTooltipBreakdown(turnState);

    const tooltipText = breakdown.join('\n');

    return `
      <div class="action-economy-badge swse-action-economy" title="${tooltipText}">
        <span class="badge-standard badge-${state.standard}"></span>
        <span class="badge-move badge-${state.move}"></span>
        <span class="badge-swift badge-${state.swift}"></span>
      </div>
    `;
  }

  /**
   * Batch setup for all attack buttons in a sheet
   * Useful for character sheet initialization
   *
   * @param {HTMLElement} root - Root element containing buttons
   * @param {Actor} actor - Actor for all buttons
   */
  static setupAttackButtons(root, actor) {
    if (!root || !actor) return;

    const attackButtons = root.querySelectorAll('[data-action="attack"]');

    attackButtons.forEach((button) => {
      const weaponId = button.dataset.weaponId;
      const weapon = actor.items.get(weaponId);

      if (!weapon) return;

      // Standard attack costs 1 standard action
      const actionCost = { standard: 1, move: 0, swift: 0 };
      const actionName = `attack-${weapon.name}`;

      // Setup preview on hover
      this.setupPreview(button, actor, actionCost, actionName);

      // Setup execution on click
      this.setupExecution(
        button,
        actor,
        actionCost,
        async () => {
          // Execute via standard roll flow
          const { SWSERoll } = await import("/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js");
          return await SWSERoll.rollAttack(actor, weapon);
        },
        { actionName }
      );
    });
  }
}

export default ActionEconomyBindings;

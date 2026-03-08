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

import { ActionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine.js";
import { ActionPolicyController } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-policy.js";
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
   * @param {string} actionType - Type of action (for logging)
   */
  static setupPreview(button, actor, actionCost, actionType = 'action') {
    if (!button || !actor) return;

    const handleMouseEnter = () => {
      try {
        // Get current turn state
        const turnState = actor.system.combatTurnState
          || ActionEngine.startTurn(actor);

        // Check without consuming
        const canCheck = ActionEngine.canConsume(turnState, actionCost);

        // Apply policy
        const policy = ActionPolicyController.handle(
          { allowed: canCheck.allowed, violations: [] },
          { actor, actionType }
        );

        // Update UI based on policy
        const { uiState } = policy;

        if (uiState.disabled && policy.mode === 'strict') {
          button.classList.add('disabled', 'action-blocked');
          button.title = uiState.tooltip;
          button.style.cursor = 'not-allowed';
          button.style.opacity = '0.6';
        } else {
          button.classList.remove('disabled', 'action-blocked');
          button.style.cursor = 'pointer';
          button.style.opacity = '1';

          if (uiState.tooltip) {
            button.title = uiState.tooltip;
          }
        }
      } catch (err) {
        SWSELogger.error(`[ActionEconomyBindings] Preview error for ${actionType}:`, err);
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
   * @param {string} options.actionType - Action type (for logging)
   * @param {boolean} options.allowOverride - Allow Shift+Click override in STRICT
   */
  static setupExecution(button, actor, actionCost, executeCallback, options = {}) {
    if (!button || !actor || !executeCallback) return;

    const {
      actionType = 'action',
      allowOverride = true
    } = options;

    button.addEventListener('click', async (e) => {
      try {
        // Get current turn state
        const turnState = actor.system.combatTurnState
          || ActionEngine.startTurn(actor);

        // Attempt to consume action
        const engineResult = ActionEngine.consumeAction(turnState, {
          actionType: actionType,
          cost: actionCost
        });

        // Apply policy enforcement
        const policy = ActionPolicyController.handle(engineResult, {
          actor,
          actionType
        });

        // Handle policy decision
        if (!policy.permitted) {
          // STRICT mode blocks
          if (policy.mode === 'strict') {
            ui.notifications.warn(policy.uiState.tooltip);

            // Check for Shift+Click override
            if (allowOverride && e.shiftKey) {
              const override = await this._promptOverride(policy);
              if (!override) return;
            } else {
              return;  // Blocked, don't proceed
            }
          }
        }

        // Notify GM if LOOSE mode and violated
        if (policy.shouldNotify && policy.mode === 'loose') {
          ui.notifications.warn(`${actor.name}: ${policy.uiState?.tooltip || 'Action economy violation'}`);
        }

        // Execute callback if action allowed
        const result = await executeCallback();

        // Update actor's turn state on success
        if (result && engineResult.updatedTurnState) {
          await actor.update({
            'system.combatTurnState': engineResult.updatedTurnState
          });

          SWSELogger.info(`[ActionEconomyBindings] ${actor.name} consumed ${actionType}`, {
            consumed: engineResult.consumedCost
          });
        }

        return result;
      } catch (err) {
        SWSELogger.error(`[ActionEconomyBindings] Execution error for ${actionType}:`, err);
        ui.notifications.error(`Action failed: ${err.message}`);
      }
    });
  }

  /**
   * Show Shift+Click override prompt (STRICT mode only)
   *
   * @private
   */
  static async _promptOverride(policy) {
    return new Promise((resolve) => {
      const message = ActionPolicyController.getOverrideMessage(
        policy.violations || []
      );

      const dialog = new Dialog({
        title: "Override Action Economy",
        content: `<p>${message.replace(/\n/g, '<br>')}</p>`,
        buttons: {
          override: {
            icon: '<i class="fas fa-exclamation-triangle"></i>',
            label: "Override",
            callback: () => resolve(true)
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(false)
          }
        },
        default: "cancel"
      });

      dialog.render(true);
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

    const turnState = actor.system.combatTurnState
      || ActionEngine.startTurn(actor);

    const canCheck = ActionEngine.canConsume(turnState, actionCost);

    if (!canCheck.allowed) {
      return {
        className: 'action-unavailable',
        disabled: true,
        title: canCheck.reason || 'Action not available'
      };
    }

    return {
      className: 'action-available',
      disabled: false,
      title: 'Action available'
    };
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

    const turnState = actor.system.combatTurnState
      || ActionEngine.startTurn(actor);

    const state = ActionEngine.getVisualState(turnState);
    const summary = ActionEngine.summarizeState(turnState);

    return `
      <div class="action-economy-badge" title="${summary.summary}">
        <span class="badge-standard action-${state.standard}"></span>
        <span class="badge-move action-${state.move}"></span>
        <span class="badge-swift action-${state.swift}"></span>
      </div>
    `;
  }

  /**
   * Batch setup for all attack buttons in a sheet
   * Useful for character sheet initialization
   *
   * @param {HTMLElement} root - Root element containing buttons
   * @param {Actor} actor - Actor for all buttons
   * @param {Function} getRollCallback - Function returning { actionCost, executeCallback }
   */
  static setupAttackButtons(root, actor, getRollCallback) {
    if (!root || !actor) return;

    const attackButtons = root.querySelectorAll('[data-action="attack"]');

    attackButtons.forEach((button) => {
      const weaponId = button.dataset.weaponId;
      const weapon = actor.items.get(weaponId);

      if (!weapon) return;

      // Standard attack costs 1 standard action
      const actionCost = { standard: 1, move: 0, swift: 0 };

      // Setup preview
      this.setupPreview(button, actor, actionCost, `attack-${weapon.name}`);

      // Setup execution
      this.setupExecution(
        button,
        actor,
        actionCost,
        async () => {
          // Execute via standard roll flow
          const { SWSERoll } = await import("/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js");
          return await SWSERoll.rollAttack(actor, weapon);
        },
        { actionType: 'attack', allowOverride: true }
      );
    });
  }
}

export default ActionEconomyBindings;

/**
 * Action Economy Integration Guide
 *
 * This module documents how to integrate action economy UI into:
 * - Character sheets
 * - Combat trackers
 * - Custom panels
 *
 * All integration follows the pattern:
 * 1. Import ActionEconomyBindings
 * 2. Call setupPreview + setupExecution on buttons
 * 3. Use templates for visual display
 * 4. Let persistence/engine handle state
 *
 * GOVERNANCE: Pure helper documentation, no mutations.
 */

import { ActionEconomyBindings } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-bindings.js";

/**
 * PATTERN 1: Setup Attack Buttons (Batch)
 *
 * Use in: Character sheet initialization
 * Example:
 *
 * async _onRender(context, options) {
 *   super._onRender(context, options);
 *   ActionEconomyIntegration.setupWeaponAttacks(
 *     this.element,
 *     this.actor
 *   );
 * }
 */
export class ActionEconomyIntegration {
  static setupWeaponAttacks(root, actor) {
    if (!root || !actor) return;
    ActionEconomyBindings.setupAttackButtons(root, actor);
  }

  /**
   * PATTERN 2: Setup Single Action Button
   *
   * Use in: Custom abilities, special actions
   * Example:
   *
   * const moveButton = html.find('[data-action="move"]')[0];
   * ActionEconomyIntegration.setupActionButton(
   *   moveButton,
   *   actor,
   *   { move: 1 },  // cost
   *   'move-action',  // name
   *   myCallback   // what to do if allowed
   * );
   */
  static setupActionButton(button, actor, actionCost, actionName, callback) {
    if (!button || !actor || !callback) return;

    ActionEconomyBindings.setupPreview(button, actor, actionCost, actionName);
    ActionEconomyBindings.setupExecution(
      button,
      actor,
      actionCost,
      callback,
      { actionName }
    );
  }

  /**
   * PATTERN 3: Get Visual State for Display
   *
   * Use in: Templates, partial rendering
   * Example in sheet context:
   *
   * const indicator = ActionEconomyIntegration.getButtonState(
   *   this.actor,
   *   { standard: 1 }
   * );
   * button.className = indicator.className;
   * button.title = indicator.title;
   */
  static getButtonState(actor, actionCost) {
    return ActionEconomyBindings.getAvailabilityIndicator(actor, actionCost);
  }

  /**
   * PATTERN 4: Render Badge in Template Context
   *
   * Use in: Template rendering, context preparation
   * Example in sheet _prepareContext():
   *
   * const badgeHtml = ActionEconomyIntegration.getBadgeHtml(
   *   this.actor
   * );
   *
   * Then in template:
   * {{{badge}}}  <- Use triple braces for HTML
   */
  static getBadgeHtml(actor) {
    return ActionEconomyBindings.createStatusBadge(actor);
  }

  /**
   * PATTERN 5: Get State for Template Context
   *
   * Use in: Preparing context for template rendering
   * Example in sheet _prepareContext():
   *
   * const state = ActionEconomyIntegration.getContextData(
   *   this.actor
   * );
   *
   * Then pass to template:
   * return {
   *   ...baseContext,
   *   actionEconomy: state
   * };
   *
   * In template:
   * {{> combat/action-economy-display actionState=actionEconomy.state breakdown=actionEconomy.breakdown}}
   */
  static getContextData(actor) {
    const combatId = game.combat?.id;
    const { ActionEconomyPersistence } = await import(
      "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js"
    );
    const { ActionEngine } = await import(
      "/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js"
    );

    const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);
    const state = ActionEngine.getVisualState(turnState);
    const breakdown = ActionEngine.getTooltipBreakdown(turnState);

    return {
      state,
      breakdown,
      fullRoundUsed: turnState.fullRoundUsed
    };
  }
}

/**
 * FULL INTEGRATION CHECKLIST
 *
 * For Character Sheets:
 * ✅ Import ActionEconomyIntegration
 * ✅ Call setupWeaponAttacks in _onRender
 * ✅ Include badge via getBadgeHtml in _prepareContext
 * ✅ Add template partial: {{> combat/action-economy-display}}
 * ✅ Link CSS: styles/ui/combat-action-economy.css
 *
 * For Combat Tracker:
 * ✅ Import ActionEconomyIntegration
 * ✅ Prepare context via getContextData
 * ✅ Include full panel: {{> combat/combat-action-economy-panel}}
 * ✅ Add CSS import
 * ✅ Optional: Listen to combatant.turn hook for live updates
 *
 * For Custom Panels:
 * ✅ Import ActionEconomyBindings directly
 * ✅ Use setupActionButton for custom actions
 * ✅ Render badge via createStatusBadge
 * ✅ Add CSS import
 *
 * For Dialog/Modals:
 * ✅ Import ActionEconomyIntegration
 * ✅ Setup buttons in dialog content creation
 * ✅ Use setupActionButton for each button
 * ✅ Handle Shift+Click via event in setupExecution
 */

/**
 * EXAMPLE: Full Sheet Integration
 *
 * In character-sheet.js:
 *
 * import { ActionEconomyIntegration } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-integration.js";
 *
 * export class SWSECharacterSheet extends BaseSWSEAppV2 {
 *   async _prepareContext(options) {
 *     const context = super._prepareContext(options);
 *
 *     // Add action economy context
 *     context.actionEconomy = ActionEconomyIntegration.getContextData(
 *       this.actor
 *     );
 *
 *     return context;
 *   }
 *
 *   async _onRender(context, options) {
 *     super._onRender(context, options);
 *
 *     // Wire weapon attack buttons
 *     ActionEconomyIntegration.setupWeaponAttacks(
 *       this.element,
 *       this.actor
 *     );
 *   }
 * }
 *
 * In template:
 *
 * {{> combat/action-economy-display
 *   actionState=actionEconomy.state
 *   breakdown=actionEconomy.breakdown
 *   fullRoundUsed=actionEconomy.fullRoundUsed
 * }}
 */

export default ActionEconomyIntegration;

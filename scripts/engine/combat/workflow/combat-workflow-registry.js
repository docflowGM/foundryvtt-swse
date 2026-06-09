import { normalizeCombatAction } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-action-normalizer.js";
import { buildCombatWorkflowContext } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-builder.js";
import { CombatWorkflowResult } from "/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-workflow-result.js";

/**
 * CombatWorkflowRegistry
 *
 * Thin routing shim for sheet combat actions. It normalizes the action and
 * preserves context, then delegates to the existing sheet/engine handlers.
 */
export class CombatWorkflowRegistry {
  constructor() {
    this.handlers = new Map();
  }

  static getDefault() {
    if (!globalThis.__swseCombatWorkflowRegistry) {
      globalThis.__swseCombatWorkflowRegistry = new CombatWorkflowRegistry();
    }
    return globalThis.__swseCombatWorkflowRegistry;
  }

  register(mode, handler) {
    if (!mode || typeof handler !== 'function') return this;
    this.handlers.set(String(mode), handler);
    return this;
  }

  getHandler(mode, providedHandlers = {}) {
    const key = String(mode || 'legacy');
    return providedHandlers?.[key]
      ?? this.handlers.get(key)
      ?? providedHandlers?.legacy
      ?? this.handlers.get('legacy')
      ?? null;
  }

  async execute({ actor = null, actionId = null, actionData = {}, options = {}, sheet = null, handlers = {} } = {}) {
    const action = normalizeCombatAction(actionId, actionData);
    if (action.executable === false) {
      return CombatWorkflowResult.cancelled('combat-action-not-executable', { action });
    }

    const context = buildCombatWorkflowContext({ actor, action, actionId, options, sheet });
    const mode = action.manualResolution === true
      ? 'manual'
      : (action.resolutionMode ?? 'legacy');
    const handler = this.getHandler(mode, handlers);

    if (!handler) {
      return CombatWorkflowResult.failed(`No combat workflow handler for ${mode}`, { action, context });
    }

    try {
      const payload = await handler({
        actor,
        action,
        actionId: action.id ?? actionId,
        options,
        sheet,
        context,
        workflowContext: context
      });
      if (payload?.cancelled === true) return CombatWorkflowResult.cancelled(payload.reason ?? 'handler-cancelled', { action, context, payload });
      return CombatWorkflowResult.ok(payload, { action, context, mode });
    } catch (err) {
      console.error('[SWSE] Combat workflow execution failed:', err);
      ui?.notifications?.error?.('Combat action failed. Check console for details.');
      return CombatWorkflowResult.failed(err?.message ?? 'handler-failed', { action, context, error: err });
    }
  }
}

export default CombatWorkflowRegistry;

/**
 * CombatWorkflowRegistry
 *
 * Phase 1B thin workflow SSOT. This registry owns combat action routing and
 * context preservation, while existing specialized authorities continue to own
 * attack math, damage math, action economy, grapple, healing, ammo, and chat.
 */

import { CombatActionNormalizer } from './combat-action-normalizer.js';
import { CombatContextBuilder } from './combat-context-builder.js';
import { CombatWorkflowResult } from './combat-workflow-result.js';

const DEFAULT_HANDLER_KEYS = [
  'attack',
  'fullAttack',
  'damage',
  'combatState',
  'secondWind',
  'grapple',
  'aidAnother',
  'skillAction',
  'healRepair',
  'ammoReload',
  'reaction',
  'manual',
  'reference',
  'actorItem',
  'legacy'
];

function getLogger() {
  return globalThis?.swseLogger ?? globalThis?.SWSELogger ?? console;
}

export class CombatWorkflowRegistry {
  constructor({ id = 'default' } = {}) {
    this.id = id;
    this.handlers = new Map();
  }

  register(mode, handler) {
    if (!mode || typeof handler !== 'function') return this;
    this.handlers.set(String(mode), handler);
    return this;
  }

  registerMany(handlers = {}) {
    for (const [mode, handler] of Object.entries(handlers ?? {})) {
      this.register(mode, handler);
    }
    return this;
  }

  has(mode) {
    return this.handlers.has(String(mode));
  }

  get(mode) {
    return this.handlers.get(String(mode));
  }

  async execute({ actor, actionId = null, actionData = {}, options = {}, sheet = null, handlers = {} } = {}) {
    const mergedHandlers = new Map(this.handlers);
    for (const key of DEFAULT_HANDLER_KEYS) {
      if (typeof handlers?.[key] === 'function') mergedHandlers.set(key, handlers[key]);
    }

    const action = CombatActionNormalizer.normalize(actionData, { actionId });
    const context = CombatContextBuilder.build({ actor, action, options, sheet });
    const mode = action.resolutionMode || 'manual';

    const handler = mergedHandlers.get(mode)
      ?? mergedHandlers.get(this._fallbackMode(mode, action))
      ?? mergedHandlers.get('legacy')
      ?? null;

    if (!handler) {
      getLogger()?.warn?.(`[SWSE CombatWorkflowRegistry] No workflow handler registered for ${mode}`, { action, context });
      return CombatWorkflowResult.failed(context, `No workflow handler registered for ${mode}`);
    }

    try {
      const payload = await handler(context, { registry: this, action, actor, sheet, options });
      if (payload?.ok === true || payload?.cancelled === true || payload?.context) return payload;
      if (payload === null || payload === undefined) return CombatWorkflowResult.cancelled(context);
      return CombatWorkflowResult.success(payload, context);
    } catch (error) {
      getLogger()?.error?.('[SWSE CombatWorkflowRegistry] Workflow execution failed', error, { action, context });
      return CombatWorkflowResult.failed(context, error?.message ?? 'Workflow execution failed', error);
    }
  }

  _fallbackMode(mode, action) {
    if (mode === 'reference') return 'manual';
    if (action?.manualResolution === true) return 'manual';
    if (action?.executable === false) return 'manual';
    return 'legacy';
  }

  static getDefault() {
    if (!globalThis.__SWSE_COMBAT_WORKFLOW_REGISTRY__) {
      globalThis.__SWSE_COMBAT_WORKFLOW_REGISTRY__ = new CombatWorkflowRegistry({ id: 'swse-default' });
    }
    return globalThis.__SWSE_COMBAT_WORKFLOW_REGISTRY__;
  }
}

// Safe debug/global access for Foundry console inspection.
globalThis.SWSECombatWorkflowRegistry = CombatWorkflowRegistry;

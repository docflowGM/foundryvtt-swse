/**
 * Combat Workflow Registry
 *
 * Thin router/orchestrator for Phase 1 combat realignment. It normalizes a
 * combat action, builds a durable context packet, then delegates to the legacy
 * authorities supplied by the sheet/app caller.
 */

import { buildCombatWorkflowContext } from './combat-context-builder.js';
import { CombatWorkflowResult } from './combat-workflow-result.js';

function normalizeRoute(value = '') {
  const key = String(value ?? '').trim();
  if (!key) return 'legacy';
  const lower = key.toLowerCase();
  if (lower === 'fullattack' || lower === 'full-attack') return 'fullAttack';
  if (lower === 'skill' || lower === 'skillaction' || lower === 'skill-action') return 'skillAction';
  if (lower === 'combatstate' || lower === 'combat-state') return 'combatState';
  if (lower === 'secondwind' || lower === 'second-wind') return 'secondWind';
  if (lower === 'reload' || lower === 'ammoreload' || lower === 'ammo-reload') return 'ammoReload';
  if (lower === 'aidanother' || lower === 'aid-another') return 'aidAnother';
  if (lower === 'reference') return 'reference';
  if (lower === 'manual') return 'manual';
  if (lower === 'attack') return 'attack';
  if (lower === 'reaction') return 'reaction';
  if (lower === 'grapple') return 'grapple';
  return key;
}

export class CombatWorkflowRegistry {
  constructor() {
    this.handlers = new Map();
  }

  static getDefault() {
    if (!globalThis.SWSECombatWorkflowRegistry) {
      globalThis.SWSECombatWorkflowRegistry = new CombatWorkflowRegistry();
    }
    return globalThis.SWSECombatWorkflowRegistry;
  }

  register(route, handler) {
    if (!route || typeof handler !== 'function') return this;
    this.handlers.set(normalizeRoute(route), handler);
    return this;
  }

  getHandler(route, localHandlers = {}) {
    const key = normalizeRoute(route);
    return localHandlers?.[key]
      ?? this.handlers.get(key)
      ?? localHandlers?.legacy
      ?? this.handlers.get('legacy')
      ?? null;
  }

  resolveRoute(context = {}) {
    const action = context.action ?? {};
    if (action.manualResolution === true) return action.resolutionMode === 'reference' ? 'reference' : 'manual';
    return normalizeRoute(action.resolutionMode ?? context.resolutionMode ?? 'legacy');
  }

  async execute({ actor = null, actionId = null, actionData = {}, options = {}, sheet = null, handlers = {} } = {}) {
    const context = buildCombatWorkflowContext({ actor, actionId, actionData, options, sheet });
    const route = this.resolveRoute(context);
    const handler = this.getHandler(route, handlers);

    if (!handler) {
      const error = new Error(`No combat workflow handler registered for route: ${route}`);
      console.warn('[SWSE CombatWorkflowRegistry]', error.message, { route, context });
      return CombatWorkflowResult.failure(error, context, { route });
    }

    try {
      const payload = await handler(context, { route, registry: this });
      if (payload === null || payload?.cancelled === true) return CombatWorkflowResult.cancelled(context);
      return CombatWorkflowResult.success(payload, context, { route });
    } catch (error) {
      console.warn('[SWSE CombatWorkflowRegistry] Handler failed:', error);
      globalThis.ui?.notifications?.error?.('Combat workflow failed. Check console for details.');
      return CombatWorkflowResult.failure(error, context, { route });
    }
  }
}

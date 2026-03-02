/**
 * MutationInterceptorLock
 * PHASE 9: Global mutation interception and governance enforcement
 *
 * Enforces:
 * - All actor/item mutations route through ActorEngine
 * - No direct actor.update() or item.update() calls outside ActorEngine
 * - MutationPlan validation before application
 * - Audit trail for all mutations
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class MutationInterceptorLock {
  static INTERCEPTOR_ACTIVE = false;
  static MUTATION_STACK = [];
  static AUTHORIZED_CALLERS = new Set(['ActorEngine', 'GameMaster']);

  /**
   * Initialize global mutation interceptor
   * Patches Actor.prototype.update to enforce governance
   */
  static initialize() {
    if (this.INTERCEPTOR_ACTIVE) {
      return; // Already initialized
    }

    const originalUpdate = Actor.prototype.update;

    Actor.prototype.update = async function(data, options = {}) {
      return await MutationInterceptorLock.interceptActorUpdate(
        this,
        data,
        options,
        originalUpdate
      );
    };

    const itemOriginalUpdate = Item.prototype.update;

    Item.prototype.update = async function(data, options = {}) {
      return await MutationInterceptorLock.interceptItemUpdate(
        this,
        data,
        options,
        itemOriginalUpdate
      );
    };

    this.INTERCEPTOR_ACTIVE = true;
    swseLogger.info('MutationInterceptorLock: Global interceptor initialized');
  }

  /**
   * Intercept actor update calls
   * Routes through governance validation
   *
   * @private
   * @param {Actor} actor
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @param {Function} originalUpdate - Original update method
   * @returns {Promise<Actor>}
   */
  static async interceptActorUpdate(actor, data, options, originalUpdate) {
    const callStack = new Error().stack;
    const isAuthorized = this.#isAuthorizedCaller(callStack);

    if (!isAuthorized) {
      // Check if caller is ActorEngine or GM-level
      const canProceed = options.bypassMutationLock || game.user?.isGM;

      if (!canProceed) {
        swseLogger.error('MutationInterceptorLock: Unauthorized actor.update() blocked', {
          actor: actor.id,
          caller: this.#getCallerInfo(callStack)
        });

        throw new Error(
          'Unauthorized mutation: actor.update() must route through ActorEngine'
        );
      }
    }

    // Log the mutation
    this.#logMutation({
      type: 'actor-update',
      actor: actor.id,
      changes: Object.keys(data).length,
      authorized: isAuthorized
    });

    // Proceed with original update
    return await originalUpdate.call(actor, data, options);
  }

  /**
   * Intercept item update calls
   * Ensures proper governance boundaries (embedded vs world)
   *
   * @private
   * @param {Item} item
   * @param {Object} data
   * @param {Object} options
   * @param {Function} originalUpdate
   * @returns {Promise<Item>}
   */
  static async interceptItemUpdate(item, data, options, originalUpdate) {
    const callStack = new Error().stack;

    // PHASE 9: Governance boundary
    // - Embedded items should route through actor.updateOwnedItem()
    // - World items can update directly
    if (item.isEmbedded) {
      const parentActor = item.actor;

      if (!options.bypassEmbeddedCheck && parentActor?.updateOwnedItem) {
        swseLogger.warn('MutationInterceptorLock: Embedded item routed to direct update', {
          item: item.id,
          parent: parentActor.id
        });

        // For strict enforcement, this could throw an error
        // For now, just log and allow (since not all code paths updated yet)
      }
    }

    this.#logMutation({
      type: 'item-update',
      item: item.id,
      changes: Object.keys(data).length,
      embedded: item.isEmbedded
    });

    return await originalUpdate.call(item, data, options);
  }

  /**
   * Validate MutationPlan before application
   *
   * @param {Object} plan - MutationPlan to validate
   * @returns {Object} { valid: boolean, errors: [] }
   */
  static validateMutationPlan(plan) {
    const errors = [];

    if (!plan || typeof plan !== 'object') {
      errors.push('MutationPlan must be an object');
      return { valid: false, errors };
    }

    // Validate structure
    const hasValidBuckets = plan.set || plan.delete || plan.add || plan.create;
    if (!hasValidBuckets) {
      errors.push('MutationPlan must have at least one bucket (set/delete/add/create)');
    }

    // Validate each bucket
    if (plan.set && typeof plan.set === 'object') {
      for (const [path, value] of Object.entries(plan.set)) {
        if (typeof path !== 'string' || path.length === 0) {
          errors.push(`SET: invalid path "${path}"`);
        }
        if (value === undefined) {
          errors.push(`SET[${path}]: undefined value (use DELETE instead)`);
        }
      }
    }

    if (plan.delete && typeof plan.delete === 'object') {
      for (const [collection, ids] of Object.entries(plan.delete)) {
        if (!Array.isArray(ids)) {
          errors.push(`DELETE[${collection}]: must be array of IDs`);
        }
      }
    }

    if (plan.add && typeof plan.add === 'object') {
      for (const [collection, ids] of Object.entries(plan.add)) {
        if (!Array.isArray(ids)) {
          errors.push(`ADD[${collection}]: must be array of IDs`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get mutation audit log
   * @returns {Array<Object>}
   */
  static getMutationLog() {
    return [...this.MUTATION_STACK];
  }

  /**
   * Clear mutation log
   */
  static clearLog() {
    this.MUTATION_STACK = [];
  }

  /* ---- PRIVATE ---- */

  static #isAuthorizedCaller(stack) {
    // Check if ActorEngine or governance code in call stack
    if (stack.includes('ActorEngine') || stack.includes('DroidTransactionService') ||
        stack.includes('VehicleTransactionService')) {
      return true;
    }
    return false;
  }

  static #getCallerInfo(stack) {
    const lines = stack.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('MutationInterceptor')) {
        return line.trim();
      }
    }
    return 'unknown';
  }

  static #logMutation(event) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      ...event
    };

    this.MUTATION_STACK.push(logEntry);

    // Keep log bounded to last 1000 mutations
    if (this.MUTATION_STACK.length > 1000) {
      this.MUTATION_STACK.shift();
    }

    swseLogger.debug('MutationInterceptorLock: Mutation logged', logEntry);
  }
}

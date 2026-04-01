/**
 * SWSE Actor Base – v13+ AppV2-compliant
 *
 * MINIMAL, HEADLESS-SAFE domain layer:
 * - Pure, deterministic calculations only
 * - No UI, no side-effects, no type-specific logic
 * - Safe for unit tests, macros, and programmatic use
 *
 * ⚠️ CRITICAL CONSTRAINTS:
 * - Must NOT import ui, Hooks, ChatMessage, SWSEChat, or App/Sheet classes
 * - Must NOT call ui.notifications.*, Hooks.call*, or ChatMessage.create
 * - Must NOT contain item activation, resource spending workflows, or type-specific logic
 * - Must return data objects, not emit notifications or post chat messages
 * - Must be safe to call from ANY context: UI, headless, unit tests, macros
 *
 * The v2 architecture is:
 * - BaseActor (this file): pure domain layer with guards and math
 * - SWSEV2BaseActor (base-actor.js): extends this, handles AppV2 derived data
 * - Specific actor types: character-actor.js, npc-actor.js, etc.
 * - Higher-level callsites: handle UI feedback, hooks, side-effects
 */

export class SWSEActorBase extends Actor {
  /* -------------------------------------------------------------------------- */
  /* DERIVED DATA ENTRY POINT                                                   */
  /* -------------------------------------------------------------------------- */

  /**
   * Called by Foundry during actor data preparation.
   * Applies Active Effects only — all math lives in data model.
   *
   * @protected
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Apply Active Effects with basic ADD/MULTIPLY/OVERRIDE/BASE modes.
    // This is safe and v2-compliant as it only modifies this actor's data.
    this._applyActiveEffects();
  }

  /* -------------------------------------------------------------------------- */
  /* ACTIVE EFFECTS                                                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Apply Active Effects to this actor's derived data.
   * Pure calculation: no side-effects.
   *
   * @private
   */
  _applyActiveEffects() {
    const effects = this.effects ?? [];
    if (!effects.length) {return;}

    for (const effect of effects) {
      if (effect.disabled || !effect.updates) {continue;}

      for (const [path, config] of Object.entries(effect.updates)) {
        if (!config || typeof config.value === 'undefined') {continue;}

        const mode = config.mode ?? 'ADD';
        const value = config.value;

        let current = foundry.utils.getProperty(this, path);
        if (current === undefined) {
          foundry.utils.setProperty(this, path, 0);
          current = 0;
        }

        let result = current;

        switch (mode) {
          case 'ADD': result = current + value; break;
          case 'MULTIPLY': result = current * value; break;
          case 'OVERRIDE': result = value; break;
          case 'BASE':
            if (current === 0 || current === null) {result = value;}
            break;
        }

        foundry.utils.setProperty(this, path, result);
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /* DAMAGE & HEALING (Headless-Safe)                                           */
  /* -------------------------------------------------------------------------- */

  /**
   * Apply damage to this actor.
   *
   * Headless-safe: no notifications, no side-effects.
   * Returns data object for caller to interpret.
   *
   * ⚠️ This method is intentionally minimal.
   * Type-specific logic (shields, droids, etc.) must NOT be here.
   * Callers at higher levels (sheet, UI, automation) handle feedback.
   *
   * @param {number} amount - Damage amount
   * @param {object} [options={}] - Options (e.g. checkThreshold, ignoreBonus, ignoreTemp)
   * @returns {Promise<{success: boolean, applied: number, newHP: number, destroyed?: boolean}>}
   */
  async applyDamage(amount, options = {}) {
    if (typeof amount !== 'number' || amount < 0) {
      return { success: false, applied: 0, newHP: this.system?.hp?.value ?? 0 };
    }

    const ActorEngine = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js").then(m => m.ActorEngine);
    const result = await ActorEngine.applyDamage(this, {
      amount,
      type: options.damageType || options.type || 'normal',
      source: options.source || 'legacy-actor-applyDamage',
      sourceActor: options.sourceActor || null,
      options
    });

    return {
      success: true,
      applied: result?.applied ?? amount,
      newHP: result?.newHP ?? (this.system?.hp?.value ?? 0),
      resolution: result?.resolution,
      destroyed: result?.resolution?.destroyed === true
    };
  }

  /**
   * Apply healing to this actor.
   *
   * Headless-safe: no notifications, no side-effects.
   * Returns data object for caller to interpret.
   *
   * ⚠️ This method is intentionally minimal.
   * Type-specific logic (droid repair vs. healing) must NOT be here.
   * Callers at higher levels handle feedback and type-specific rules.
   *
   * @param {number} amount - Healing amount
   * @param {object} [options={}] - Options (e.g. isRepair for droids)
   * @returns {Promise<{success: boolean, healed: number, newHP: number}>}
   */
  async applyHealing(amount, options = {}) {
    if (typeof amount !== 'number' || amount < 0) {
      return { success: false, healed: 0, newHP: this.system?.hp?.value ?? 0 };
    }

    const ActorEngine = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js").then(m => m.ActorEngine);
    const result = await ActorEngine.applyHealing(this, amount, options.source || 'legacy-actor-applyHealing');

    return {
      success: true,
      healed: result?.applied ?? 0,
      newHP: result?.newHP ?? (this.system?.hp?.value ?? 0)
    };
  }

  /* -------------------------------------------------------------------------- */
  /* ITEM STATE (Headless-Safe Stubs)                                           */
  /* -------------------------------------------------------------------------- */

  /**
   * Update an owned Item through ActorEngine.
   *
   * PHASE 2: Removed silent fallback-to-direct-update behavior.
   * Owned items MUST route through ActorEngine to ensure:
   * - MutationInterceptor authorization
   * - Proper recomputation
   * - Integrity checks
   *
   * Unowned items (world items) can update directly.
   *
   * Pure data operation: no side-effects.
   *
   * @param {Item} item
   * @param {object} changes - Dot-notation changes
   * @param {object} [options={}]
   * @returns {Promise<Item|null>}
   * @throws {Error} If ActorEngine is unavailable (indicates module loading issue)
   */
  async updateOwnedItem(item, changes, options = {}) {
    if (!item) {return null;}

    // @mutation-exception: Unowned item update
    // Unowned items (directory) update normally — not governed by actor
    if (!item.isOwned || item.parent?.id !== this.id) {
      return item.update(changes, options);
    }

    // PHASE 2: No fallback to direct update. ActorEngine is required.
    // If this fails, the error indicates a module loading problem that must be fixed.
    const ActorEngine = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js").then(m => m.ActorEngine);
    const update = { _id: item.id, ...changes };
    const [updated] = await ActorEngine.updateOwnedItems(this, [update], options);
    return updated ?? null;
  }

  /**
   * Set equipped state for an item.
   * @param {Item} item
   * @param {boolean} equipped
   * @param {object} [options={}]
   * @returns {Promise<Item|null>}
   */
  async setItemEquipped(item, equipped, options = {}) {
    return this.updateOwnedItem(item, { 'system.equipped': !!equipped }, options);
  }

  /**
   * Equip an item.
   */
  async equipItem(item, options = {}) {
    return this.setItemEquipped(item, true, options);
  }

  /**
   * Unequip an item.
   */
  async unequipItem(item, options = {}) {
    return this.setItemEquipped(item, false, options);
  }

  /**
   * Toggle equipped state of an item.
   */
  async toggleItemEquipped(item, options = {}) {
    const next = !item?.system?.equipped;
    return this.setItemEquipped(item, next, options);
  }

  /**
   * Activate an item (set activated flag).
   *
   * ⚠️ Type-specific logic (shields, charges, etc.) is NOT here.
   * This is a pure state change. Callers handle special rules.
   *
   * @param {Item} item
   * @param {object} [options={}]
   * @returns {Promise<Item|null>}
   */
  async activateItem(item, options = {}) {
    if (!item) {return null;}
    return this.updateOwnedItem(item, { 'system.activated': true }, options);
  }

  /**
   * Deactivate an item (clear activated flag).
   *
   * @param {Item} item
   * @param {object} [options={}]
   * @returns {Promise<Item|null>}
   */
  async deactivateItem(item, options = {}) {
    if (!item) {return null;}
    return this.updateOwnedItem(item, { 'system.activated': false }, options);
  }

  /**
   * Toggle activated state of an item.
   *
   * @param {Item} item
   * @param {object} [options={}]
   * @returns {Promise<Item|null>}
   */
  async toggleItemActivated(item, options = {}) {
    const next = !item?.system?.activated;
    return next ? this.activateItem(item, options) : this.deactivateItem(item, options);
  }

  /* -------------------------------------------------------------------------- */
  /* RESOURCE SPENDING (Headless-Safe)                                          */
  /* -------------------------------------------------------------------------- */

  /**
   * Check if actor has enough Force Points.
   *
   * Pure check: no side-effects.
   *
   * @param {number} [amount=1]
   * @returns {boolean}
   */
  hasForcePoints(amount = 1) {
    const fp = this.system?.forcePoints?.value ?? 0;
    return fp >= amount;
  }

  /**
   * Spend Force Points.
   *
   * Headless-safe: returns result object, no notifications or chat posts.
   *
   * ⚠️ GOVERNANCE: This method MUST route through ActorEngine to ensure:
   * - MutationInterceptor authorization
   * - Proper derived value recomputation
   * - Integrity verification
   *
   * No fallback to direct updates: authority path failure must fail clearly.
   *
   * Side-effects (notifications, chat, hooks) are caller's responsibility.
   * This method ONLY updates actor data.
   *
   * @param {string} reason - Reason string (for logging/caller feedback only)
   * @param {number} [amount=1] - Points to spend
   * @param {object} [options={}] - Options (currently unused in headless context)
   * @returns {Promise<{success: boolean, code: string, newValue: number, message: string}>}
   * @throws {Error} If ActorEngine is unavailable (critical module loading failure)
   */
  async spendForcePoint(reason = 'unspecified', amount = 1, options = {}) {
    const fp = this.system?.forcePoints;

    if (!fp) {
      return {
        success: false,
        code: 'NO_FORCE_POOL',
        message: `${this.name} has no Force Point pool.`,
        newValue: 0
      };
    }

    if (fp.value < amount) {
      return {
        success: false,
        code: 'INSUFFICIENT_FORCE',
        message: `${this.name} doesn't have enough Force Points.`,
        newValue: fp.value
      };
    }

    const newValue = fp.value - amount;

    // PHASE 5: ActorEngine is REQUIRED. No fallback to direct update.
    // Failure here indicates a critical module loading issue that must be fixed.
    const ActorEngine = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js").then(m => m.ActorEngine);
    await ActorEngine.updateActor(this, { 'system.forcePoints.value': newValue });

    return {
      success: true,
      code: 'FORCE_SPENT',
      message: `${this.name} spent ${amount} Force Point(s) (${reason}).`,
      newValue
    };
  }

  /**
   * Regain Force Points (e.g., after rest).
   *
   * Headless-safe: no notifications, no side-effects.
   *
   * ⚠️ GOVERNANCE: This method MUST route through ActorEngine to ensure:
   * - MutationInterceptor authorization
   * - Proper derived value recomputation
   * - Integrity verification
   *
   * No fallback to direct updates: authority path failure must fail clearly.
   *
   * @param {number} [amount=null] - Amount to regain (null = full recovery)
   * @returns {Promise<{success: boolean, newValue: number, regained: number}>}
   * @throws {Error} If ActorEngine is unavailable (critical module loading failure)
   */
  async regainForcePoints(amount = null) {
    const fp = this.system?.forcePoints;

    if (!fp) {
      return { success: false, newValue: 0, regained: 0 };
    }

    const newValue = amount !== null
      ? Math.min(fp.max, fp.value + amount)
      : fp.max;

    const regained = newValue - fp.value;

    if (regained > 0) {
      // PHASE 5: ActorEngine is REQUIRED. No fallback to direct update.
      // Failure here indicates a critical module loading issue that must be fixed.
      const ActorEngine = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js").then(m => m.ActorEngine);
      await ActorEngine.updateActor(this, { 'system.forcePoints.value': newValue });
    }

    return {
      success: true,
      newValue,
      regained
    };
  }

  /**
   * Spend a Destiny Point.
   *
   * Headless-safe: returns result object, no notifications or chat posts.
   *
   * ⚠️ GOVERNANCE: This method MUST route through ActorEngine to ensure:
   * - MutationInterceptor authorization
   * - Proper derived value recomputation
   * - Integrity verification
   *
   * No fallback to direct updates: authority path failure must fail clearly.
   *
   * Side-effects (notifications, chat, hooks) are caller's responsibility.
   * This method ONLY updates actor data and returns result.
   *
   * @param {string} type - Destiny effect type (for logging/caller feedback)
   * @param {object} [options={}] - Additional options (unused in headless context)
   * @returns {Promise<{success: boolean, code: string, newValue: number, message: string}>}
   * @throws {Error} If ActorEngine is unavailable (critical module loading failure)
   */
  async spendDestinyPoint(type = 'unspecified', options = {}) {
    const dp = this.system?.destinyPoints;
    const destiny = this.system?.destiny;

    if (!destiny?.hasDestiny) {
      return {
        success: false,
        code: 'NO_DESTINY',
        message: `${this.name} does not have Destiny.`,
        newValue: dp?.value ?? 0
      };
    }

    if (destiny.fulfilled) {
      return {
        success: false,
        code: 'DESTINY_FULFILLED',
        message: `${this.name}'s Destiny has been fulfilled.`,
        newValue: dp?.value ?? 0
      };
    }

    if (!dp || dp.value <= 0) {
      return {
        success: false,
        code: 'INSUFFICIENT_DESTINY',
        message: `${this.name} has no Destiny Points remaining.`,
        newValue: 0
      };
    }

    const newValue = dp.value - 1;

    // PHASE 5: ActorEngine is REQUIRED. No fallback to direct update.
    // Failure here indicates a critical module loading issue that must be fixed.
    const ActorEngine = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js").then(m => m.ActorEngine);
    await ActorEngine.updateActor(this, { 'system.destinyPoints.value': newValue });

    return {
      success: true,
      code: 'DESTINY_SPENT',
      message: `${this.name} spent a Destiny Point (${type}).`,
      newValue
    };
  }

  /* -------------------------------------------------------------------------- */
  /* FLAG COMPATIBILITY                                                         */
  /* -------------------------------------------------------------------------- */

  /**
   * Get actor flag with backwards-compatibility for 'swse' scope.
   *
   * @param {string} scope
   * @param {string} key
   * @returns {*}
   */
  getFlag(scope, key) {
    if (scope === 'swse') {
      const val = super.getFlag('foundryvtt-swse', key);
      if (val !== undefined) {return val;}
      return this.flags?.swse?.[key];
    }
    return super.getFlag(scope, key);
  }

  /**
   * Set actor flag with backwards-compatibility for 'swse' scope.
   *
   * @param {string} scope
   * @param {string} key
   * @param {*} value
   * @returns {Promise<Actor>}
   */
  async setFlag(scope, key, value) {
    if (scope === 'swse') {scope = 'foundryvtt-swse';}
    return super.setFlag(scope, key, value);
  }

  /**
   * Unset actor flag with backwards-compatibility for 'swse' scope.
   *
   * @param {string} scope
   * @param {string} key
   * @returns {Promise<Actor>}
   */
  async unsetFlag(scope, key) {
    if (scope === 'swse') {scope = 'foundryvtt-swse';}
    return super.unsetFlag(scope, key);
  }

  /* -------------------------------------------------------------------------- */
  /* ACTION EXECUTION (Stubs - Implemented in SWSEV2BaseActor)                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Use an action by ID.
   *
   * ⚠️ Full implementation in SWSEV2BaseActor.
   * This stub prevents errors if called before v2 extension.
   *
   * @param {string} actionId
   * @param {object} [options={}]
   * @returns {Promise<*>}
   */
  async useAction(actionId, options = {}) {
    // Stub: v2 implementation handles action routing
    return null;
  }

  /**
   * Use an item.
   *
   * ⚠️ Full implementation in SWSEV2BaseActor.
   * This stub returns null if called on base class directly.
   *
   * @param {Item} item
   * @param {object} [options={}]
   * @returns {Promise<*>}
   */
  async useItem(item, options = {}) {
    // Stub: v2 implementation handles item type routing
    return null;
  }
}

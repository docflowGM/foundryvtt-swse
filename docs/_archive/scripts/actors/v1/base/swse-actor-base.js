import { SWSERoll } from '../../../../../../scripts/combat/rolls/enhanced-rolls.js';
import { ForcePointsUtil } from '../../../../../../scripts/utils/force-points.js';
import { SWSEChat } from '../../../../../../scripts/chat/swse-chat.js';
import { ActorEngine } from '../../../../../../scripts/actors/engine/actor-engine.js';

/**
 * SWSE Actor Base – v13+
 * - Orchestrates derived data
 * - Applies Active Effects AFTER math
 * - Handles damage, healing, rolls
 */
export class SWSEActorBase extends Actor {

  /* -------------------------------------------------------------------------- */
  /* FLAG COMPATIBILITY                                                         */
  /* -------------------------------------------------------------------------- */

  getFlag(scope, key) {
    if (scope === 'swse') {
      const val = super.getFlag('foundryvtt-swse', key);
      if (val !== undefined) {return val;}
      return this.flags?.swse?.[key];
    }
    return super.getFlag(scope, key);
  }

  async setFlag(scope, key, value) {
    if (scope === 'swse') {scope = 'foundryvtt-swse';}
    return super.setFlag(scope, key, value);
  }

  async unsetFlag(scope, key) {
    if (scope === 'swse') {scope = 'foundryvtt-swse';}
    return super.unsetFlag(scope, key);
  }

  /* -------------------------------------------------------------------------- */
  /* DERIVED DATA ENTRY POINT                                                   */
  /* -------------------------------------------------------------------------- */

  prepareDerivedData() {
    super.prepareDerivedData();

    // ⚠️ IMPORTANT:
    // All numerical math happens in the DATA MODEL.
    // This class ONLY applies Active Effects afterward.
    this._applyActiveEffects();
  }

  /* -------------------------------------------------------------------------- */
  /* ACTIVE EFFECTS                                                             */
  /* -------------------------------------------------------------------------- */

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
  /* DAMAGE & HEALING                                                           */
  /* -------------------------------------------------------------------------- */

  async applyDamage(amount, options = {}) {
    if (typeof amount !== 'number' || amount < 0) {return;}

    const hp = this.system.hp;
    const isDroid = this.system.traits?.isDroid === true;

    let remaining = amount;
    const updates = {};

    // Bonus HP (damage buffer from abilities/talents - consumed first)
    if (hp.bonus > 0 && !options.ignoreBonus) {
      const used = Math.min(hp.bonus, remaining);
      remaining -= used;
      updates['system.hp.bonus'] = hp.bonus - used;
    }

    // Temp HP (from Active Effects)
    if (hp.temp > 0 && !options.ignoreTemp) {
      const used = Math.min(hp.temp, remaining);
      remaining -= used;
      updates['system.hp.temp'] = hp.temp - used;
    }

    // Real HP
    if (remaining > 0) {
      let newHP = hp.value - remaining;

      // Droid destruction rule
      if (isDroid && options.checkThreshold !== false) {
        if (amount >= this.system.damageThreshold) {
          updates['system.hp.value'] = -1;
          await ActorEngine.updateActor(this, updates, { diff: true });
          ui.notifications.error(`${this.name} is DESTROYED!`);
          return amount;
        }
      }

      if (!isDroid) {newHP = Math.max(0, newHP);}
      updates['system.hp.value'] = newHP;
    }

    await ActorEngine.updateActor(this, updates, { diff: true });
    return amount;
  }

  async applyHealing(amount, options = {}) {
    if (typeof amount !== 'number' || amount < 0) {return 0;}

    const hp = this.system.hp;
    const isDroid = this.system.traits?.isDroid === true;

    if (isDroid && !options.isRepair) {
      ui.notifications.warn(`${this.name} must be repaired, not healed.`);
      return 0;
    }

    if (hp.value <= -1) {return 0;}

    const newHP = Math.min(hp.max, hp.value + amount);
    await ActorEngine.updateActor(this, { 'system.hp.value': newHP }, { diff: true });
    return newHP - hp.value;
  }


  /* -------------------------------------------------------------------------- */
  /* OWNED ITEM STATE (EQUIP / ACTIVATE)                                         */
  /* -------------------------------------------------------------------------- */

  /**
   * Update an owned Item through ActorEngine.
   *
   * @param {Item} item
   * @param {object} changes - Dot-notation changes (e.g. {"system.equipped": true})
   * @param {object} [options={}] - forwarded to updateEmbeddedDocuments
   */
  async updateOwnedItem(item, changes, options = {}) {
    if (!item) {return null;}

    // Unowned items (directory) update normally.
    if (!item.isOwned || item.parent?.id !== this.id) {
      return item.update(changes, options);
    }

    const update = { _id: item.id, ...changes };
    const [updated] = await ActorEngine.updateOwnedItems(this, [update], options);
    return updated ?? null;
  }

  /**
   * Set equipped state for an owned Item.
   * @param {Item} item
   * @param {boolean} equipped
   */
  async setItemEquipped(item, equipped, options = {}) {
    return this.updateOwnedItem(item, { 'system.equipped': !!equipped }, options);
  }

  async equipItem(item, options = {}) {
    return this.setItemEquipped(item, true, options);
  }

  async unequipItem(item, options = {}) {
    return this.setItemEquipped(item, false, options);
  }

  async toggleItemEquipped(item, options = {}) {
    const next = !item?.system?.equipped;
    return this.setItemEquipped(item, next, options);
  }

  /**
   * Activate an owned Item.
   *
   * Shields consume one charge on activation and reset SR to max.
   */
  async activateItem(item, options = {}) {
    if (!item) {return null;}

    // Shield special-case (armorType === 'shield')
    if (item.type === 'armor' && item.system?.armorType === 'shield') {
      const currentCharges = Number(item.system?.charges?.current ?? 0);
      const shieldRating = Number(item.system?.shieldRating ?? 0);

      if (currentCharges <= 0) {
        ui.notifications.warn('No charges remaining to activate shield!');
        return null;
      }

      if (shieldRating <= 0) {
        ui.notifications.warn('Shield has no rating to activate!');
        return null;
      }

      const updated = await this.updateOwnedItem(item, {
        'system.charges.current': currentCharges - 1,
        'system.activated': true,
        'system.currentSR': shieldRating
      }, options);

      ui.notifications.info(`${item.name} activated! SR: ${shieldRating}, Charges remaining: ${currentCharges - 1}`);
      return updated;
    }

    const updated = await this.updateOwnedItem(item, { 'system.activated': true }, options);
    ui.notifications.info(`${item.name} activated!`);
    return updated;
  }

  async deactivateItem(item, options = {}) {
    if (!item) {return null;}

    const updated = await this.updateOwnedItem(item, { 'system.activated': false }, options);
    ui.notifications.info(`${item.name} deactivated!`);
    return updated;
  }

  async toggleItemActivated(item, options = {}) {
    const next = !item?.system?.activated;
    return next ? this.activateItem(item, options) : this.deactivateItem(item, options);
  }

  /* -------------------------------------------------------------------------- */
  /* DESTINY POINTS                                                             */
  /* -------------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------- */
  /* ROLLS                                                                      */
  /* -------------------------------------------------------------------------- */

  async rollSkill(skill, options = {}) { return SWSERoll.rollSkill(this, skill, options); }
  async rollAttack(weapon, options = {}) { return SWSERoll.rollAttack(this, weapon, options); }
  async rollDamage(weapon, options = {}) { return SWSERoll.rollDamage(this, weapon, options); }


  /**
   * Use an owned item.
   *
   * v2 contract: items do not roll or post chat output on their own.
   * This method is the canonical entry-point for item macros and UI.
   *
   * @param {Item} item
   * @param {object} [options={}] - Use options (type-specific)
   */
  async useItem(item, options = {}) {
    if (!item) {return null;}

    switch (item.type) {
      case 'weapon':
        return this.rollAttack(item, options);
      case 'forcepower': {
        const enhancements = options?.enhancements ?? null;
        return SWSERoll.rollUseTheForce(this, item, enhancements);
      }
      default:
        return this._postItemToChat(item, options);
    }
  }

  /**
   * Post a simple holo-themed item card to chat.
   * @private
   */
  async _postItemToChat(item, options = {}) {
    const description = item.system?.description || '';
    const labels = typeof item.getChatData === 'function' ? (item.getChatData().labels || {}) : {};

    const meta = Object.entries(labels)
      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => `<span class="swse-item-meta"><strong>${k}:</strong> ${v}</span>`)
      .join(' ');

    const content = `
      <div class="swse-holo-card swse-item-card">
        <div class="swse-holo-header">
          <i class="fa-solid fa-box"></i> ${item.name}
        </div>
        ${meta ? `<div class="swse-item-meta-row">${meta}</div>` : ''}
        ${description ? `<div class="swse-item-body">${description}</div>` : ''}
      </div>
    `;

    return SWSEChat.postHTML({
      content,
      actor: this,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      flags: {
        ...options?.flags,
        swse: {
          ...(options?.flags?.swse ?? {}),
          item: true,
          itemId: item.id,
          itemType: item.type
        }
      }
    });
  }


  /* -------------------------------------------------------------------------- */
  /* DESTINY POINTS                                                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Spend a Destiny Point
   * @param {string} type - The type of Destiny effect being triggered
   * @param {Object} options - Additional options (effect, reason, etc.)
   * @returns {Promise<boolean>} - True if successfully spent, false otherwise
   */
  async spendDestinyPoint(type, options = {}) {
    const dp = this.system.destinyPoints;
    const destiny = this.system.destiny;

    // Check eligibility
    if (!destiny?.hasDestiny) {
      ui.notifications.warn(`${this.name} does not have Destiny!`);
      return false;
    }

    if (destiny.fulfilled) {
      ui.notifications.warn(`${this.name}'s Destiny has been fulfilled!`);
      return false;
    }

    if (dp.value <= 0) {
      ui.notifications.warn(`${this.name} has no Destiny Points remaining!`);
      return false;
    }

    // Decrement Destiny Points
    await ActorEngine.updateActor(this, { 'system.destinyPoints.value': dp.value - 1 });

    // Fire hook for other systems to respond
    Hooks.callAll('swse.destinyPointSpent', this, type, options);

    // Create chat message
    this._createDestinyPointMessage(type, options);

    return true;
  }

  /**
   * Create a chat message when a Destiny Point is spent
   * @private
   */
  _createDestinyPointMessage(type, options = {}) {
    const effectLabel = options.effectLabel || type;
    const reason = options.reason || 'used a Destiny Point';

    const message = `
      <div class="destiny-point-message">
        <p><strong>${this.name}</strong> ${reason}.</p>
        <p>Effect: <em>${effectLabel}</em></p>
        <p>Destiny Points Remaining: ${Math.max(0, this.system.destinyPoints.value)}/${this.system.destinyPoints.max}</p>
      </div>
    `;

    SWSEChat.postHTML({
      actor: this,
      content: message,
      style: CONST.CHAT_MESSAGE_STYLES.OOC,
      flags: { swse: { source: 'destinyPoint' } }
    });
  }

  /* -------------------------------------------------------------------------- */
  /* FORCE POINTS                                                               */
  /* -------------------------------------------------------------------------- */

  /**
   * Check if actor has enough Force Points
   * @param {number} amount - Number of Force Points required
   * @returns {boolean} Whether actor has enough Force Points
   */
  hasForcePoints(amount = 1) {
    const fp = this.system.forcePoints?.value ?? 0;
    return fp >= amount;
  }

  /**
   * Spend Force Points
   * @param {string} reason - The reason for spending (for chat message)
   * @param {number} amount - Number of Force Points to spend (default 1)
   * @param {Object} options - Additional options
   * @param {boolean} options.silent - If true, don't show chat message
   * @returns {Promise<boolean>} Whether the spend was successful
   */
  async spendForcePoint(reason = 'unspecified', amount = 1, options = {}) {
    const fp = this.system.forcePoints;

    if (!fp || fp.value < amount) {
      if (!options.silent) {
        ui.notifications.warn(`${this.name} doesn't have enough Force Points! (${fp?.value ?? 0}/${amount} required)`);
      }
      return false;
    }

    // Deduct Force Points
    await ActorEngine.updateActor(this, { 'system.forcePoints.value': fp.value - amount });

    // Create chat message unless silent
    if (!options.silent) {
      const message = `
        <div class="swse force-point-spend">
          <h4><i class="fa-solid fa-hand-sparkles"></i> Force Point Spent</h4>
          <p><strong>${this.name}</strong> spends ${amount} Force Point${amount > 1 ? 's' : ''} for ${reason}.</p>
          <p class="fp-remaining">Force Points Remaining: ${fp.value - amount}/${fp.max}</p>
        </div>
      `;

      await SWSEChat.postHTML({
        actor: this,
        content: message,
        flags: { swse: { source: 'forcePoint' } }
      });
    }

    // Fire hook for other systems to respond
    Hooks.callAll('swse.forcePointSpent', this, reason, amount);

    return true;
  }

  /**
   * Regain Force Points (e.g., after rest)
   * @param {number} amount - Number of Force Points to regain (default: all)
   * @returns {Promise<number>} New Force Point value
   */
  async regainForcePoints(amount = null) {
    const fp = this.system.forcePoints;
    if (!fp) {return 0;}

    const newValue = amount !== null
      ? Math.min(fp.max, fp.value + amount)
      : fp.max;

    await ActorEngine.updateActor(this, { 'system.forcePoints.value': newValue });

    if (newValue > fp.value) {
      ui.notifications.info(`${this.name} regains ${newValue - fp.value} Force Point(s).`);
    }

    return newValue;
  }

}
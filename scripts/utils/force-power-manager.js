import { SWSELogger } from './logger.js';

/**
 * Force Power Management System
 * Handles Force Sensitivity, Force Training, and automatic power grants
 */

export class ForcePowerManager {

  /**
   * Get the ability modifier used for Force Training
   * @param {Actor} actor - The actor
   * @returns {number} The modifier (WIS or CHA based on houserule)
   */
  static getForceAbilityModifier(actor) {
    const attribute = game.settings.get('foundryvtt-swse', 'forceTrainingAttribute') || 'wisdom';

    if (attribute === 'charisma') {
      return actor.system.attributes.cha?.mod || 0;
    } else {
      return actor.system.attributes.wis?.mod || 0;
    }
  }

  /**
   * Count how many Force Training feats an actor has
   * @param {Actor} actor - The actor
   * @returns {number} Number of Force Training feats
   */
  static countForceTrainingFeats(actor) {
    const feats = actor.items.filter(i => i.type === 'feat');
    return feats.filter(f =>
      f.name.toLowerCase().includes('force training')
    ).length;
  }

  /**
   * Check if actor has Force Sensitivity
   * @param {Actor} actor - The actor
   * @returns {boolean} True if has Force Sensitivity
   */
  static hasForceSensitivity(actor) {
    const feats = actor.items.filter(i => i.type === 'feat');
    return feats.some(f =>
      f.name.toLowerCase().includes('force sensitivity') ||
      f.name.toLowerCase() === 'force sensitive'
    );
  }

  /**
   * Calculate total Force Suite size
   * @param {Actor} actor - The actor
   * @returns {number} Total force suite slots
   */
  static calculateForceSuiteSize(actor) {
    const forceTrainingCount = this.countForceTrainingFeats(actor);
    const modifier = this.getForceAbilityModifier(actor);

    // Base: 1 per Force Training + modifier per Force Training
    // So if you have 2 Force Training feats and +3 WIS: (1 + 3) * 2 = 8 powers
    const powersPerTraining = 1 + Math.max(0, modifier);
    return forceTrainingCount * powersPerTraining;
  }

  /**
   * Get all available force powers from compendium
   * Uses cache when available for better performance
   * @returns {Promise<Array>} Array of force power items
   */
  static async getAvailablePowers() {
    try {
      // Try to use preloaded data if available
      if (window.SWSE?.dataPreloader) {
        const cache = window.SWSE.dataPreloader._forcePowersCache;
        const cachedIndex = cache.get('_index');

        if (cachedIndex) {
          const pack = game.packs.get('foundryvtt-swse.forcepowers');
          if (!pack) {return [];}

          const powers = await pack.getDocuments();
          return powers.map(p => p.toObject());
        }
      }

      // Fallback to direct pack access
      const pack = game.packs.get('foundryvtt-swse.forcepowers');
      if (!pack) {
        SWSELogger.warn('SWSE | Force powers compendium not found');
        return [];
      }

      const powers = await pack.getDocuments();
      return powers.map(p => p.toObject());
    } catch (error) {
      SWSELogger.error('SWSE | Error loading force powers:', error);
      return [];
    }
  }

  /**
   * Open dialogue to select force powers
   * @param {Actor} actor - The actor
   * @param {number} count - Number of powers to select
   * @param {string} reason - Reason for selection (for dialogue title)
   * @returns {Promise<Array>} Selected power IDs
   */
  static async selectForcePowers(actor, count, reason = 'Select Force Powers') {
    const availablePowers = await this.getAvailablePowers();

    if (availablePowers.length === 0) {
      ui.notifications.warn('No Force Powers available in compendium');
      return [];
    }

    // Build selection tracker
    const selectedPowers = new Map(); // power ID -> count

    return new Promise((resolve) => {
      const powerListHTML = availablePowers.map(power => `
        <div class="force-power-select-item" data-power-id="${power._id}">
          <img src="${power.img || 'icons/svg/mystery-man.svg'}" width="32" height="32" alt="${power.name}"/>
          <div class="power-info">
            <div class="power-name">${power.name}</div>
            <div class="power-description">${power.system?.description || ''}</div>
          </div>
          <div class="power-quantity-controls">
            <button type="button" class="power-decrease" data-power-id="${power._id}">
              <i class="fas fa-minus"></i>
            </button>
            <span class="power-count" data-power-id="${power._id}">0</span>
            <button type="button" class="power-increase" data-power-id="${power._id}">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      `).join('');

      const dialogContent = `
        <div class="force-power-selector">
          <div class="selection-header">
            <p>Select <strong><span class="remaining-count">${count}</span></strong> Force Power(s)</p>
            <p class="hint">Powers can be selected multiple times</p>
          </div>
          <div class="force-powers-list">
            ${powerListHTML}
          </div>
        </div>
        <style>
          .force-power-selector {
            max-height: 500px;
            display: flex;
            flex-direction: column;
          }
          .selection-header {
            padding: 8px;
            background: rgba(0, 100, 200, 0.2);
            border-radius: 4px;
            margin-bottom: 8px;
          }
          .force-powers-list {
            overflow-y: auto;
            flex: 1;
          }
          .force-power-select-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            border-bottom: 1px solid #444;
            transition: background 0.2s;
          }
          .force-power-select-item:hover {
            background: rgba(0, 100, 200, 0.1);
          }
          .force-power-select-item img {
            flex-shrink: 0;
            border-radius: 4px;
          }
          .power-info {
            flex: 1;
          }
          .power-name {
            font-weight: bold;
            margin-bottom: 4px;
          }
          .power-description {
            font-size: 0.9em;
            color: #aaa;
            max-height: 40px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .power-quantity-controls {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .power-quantity-controls button {
            width: 28px;
            height: 28px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
          }
          .power-count {
            min-width: 24px;
            text-align: center;
            font-weight: bold;
          }
          .remaining-count {
            color: #00b8ff;
          }
        </style>
      `;

      const dialog = new Dialog({
        title: reason,
        content: dialogContent,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Confirm Selection',
            callback: (html) => {
              const selected = [];
              selectedPowers.forEach((count, powerId) => {
                for (let i = 0; i < count; i++) {
                  selected.push(powerId);
                }
              });
              resolve(selected);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve([])
          }
        },
        default: 'ok',
        render: (html) => {
          // Convert to DOM element if needed
          const element = html instanceof HTMLElement ? html : html[0];
          if (!element) {return;}

          const updateRemaining = () => {
            const total = Array.from(selectedPowers.values()).reduce((sum, val) => sum + val, 0);
            const remaining = count - total;
            const remainingElement = element.querySelector('.remaining-count');
            if (remainingElement) {remainingElement.textContent = remaining;}

            // Disable increase buttons if at limit
            const disableIncrease = remaining <= 0;
            element.querySelectorAll('.power-increase').forEach(btn => {
              btn.disabled = disableIncrease;
            });
          };

          // Increase button
          element.querySelectorAll('.power-increase').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const powerId = e.currentTarget.dataset.powerId;
              const current = selectedPowers.get(powerId) || 0;
              const total = Array.from(selectedPowers.values()).reduce((sum, val) => sum + val, 0);

              if (total < count) {
                selectedPowers.set(powerId, current + 1);
                const countElement = element.querySelector(`.power-count[data-power-id="${powerId}"]`);
                if (countElement) {countElement.textContent = current + 1;}
                updateRemaining();
              }
            });
          });

          // Decrease button
          element.querySelectorAll('.power-decrease').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const powerId = e.currentTarget.dataset.powerId;
              const current = selectedPowers.get(powerId) || 0;

              if (current > 0) {
                const newCount = current - 1;
                if (newCount === 0) {
                  selectedPowers.delete(powerId);
                } else {
                  selectedPowers.set(powerId, newCount);
                }
                const countElement = element.querySelector(`.power-count[data-power-id="${powerId}"]`);
                if (countElement) {countElement.textContent = newCount;}
                updateRemaining();
              }
            });
          });

          updateRemaining();
        }
      });

      dialog.render(true);
    });
  }

  /**
   * Grant force powers to an actor
   * @param {Actor} actor - The actor
   * @param {Array} powerIds - Array of power IDs to grant
   * @returns {Promise<void>}
   */
  static async grantForcePowers(actor, powerIds) {
    if (!powerIds || powerIds.length === 0) {return;}

    const availablePowers = await this.getAvailablePowers();
    const powersToCreate = [];

    for (const powerId of powerIds) {
      const powerData = availablePowers.find(p => p._id === powerId);
      if (powerData) {
        // Create a copy without the _id so Foundry generates a new one
        const powerCopy = foundry.utils.deepClone(powerData);
        delete powerCopy._id;
        powersToCreate.push(powerCopy);
      }
    }

    if (powersToCreate.length > 0) {
      await actor.createEmbeddedDocuments('Item', powersToCreate);
      ui.notifications.info(`Granted ${powersToCreate.length} Force Power(s) to ${actor.name}`);
    }
  }

  /**
   * Handle Force Sensitivity feat being added
   * @param {Actor} actor - The actor
   * @returns {Promise<void>}
   */
  static async handleForceSensitivity(actor) {
    // Force Sensitivity grants 1 force power
    const selectedPowers = await this.selectForcePowers(actor, 1, 'Force Sensitivity - Select 1 Power');

    if (selectedPowers.length > 0) {
      await this.grantForcePowers(actor, selectedPowers);

      // Initialize force suite if not already set
      if (!actor.system.forceSuite) {
        await globalThis.SWSE.ActorEngine.updateActor(actor, {
          'system.forceSuite': {
            max: 0,
            powers: []
          }
        });


      }
    }
  }

  /**
   * Handle Force Training feat being added
   * @param {Actor} actor - The actor
   * @returns {Promise<void>}
   */
  static async handleForceTraining(actor) {
    // Force Training grants 1 + modifier powers
    const modifier = this.getForceAbilityModifier(actor);
    const powerCount = 1 + Math.max(0, modifier);

    const selectedPowers = await this.selectForcePowers(
      actor,
      powerCount,
      `Force Training - Select ${powerCount} Power(s)`
    );

    if (selectedPowers.length > 0) {
      await this.grantForcePowers(actor, selectedPowers);
    }

    // Update force suite maximum
    const newMax = this.calculateForceSuiteSize(actor);
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.forceSuite.max': newMax
    });
  }

  /**
   * Handle ability score increase (check if force modifier changed)
   * @param {Actor} actor - The actor
   * @param {Object} oldAbilities - Old ability scores
   * @param {Object} newAbilities - New ability scores
   * @returns {Promise<void>}
   */
  static async handleAbilityIncrease(actor, oldAbilities, newAbilities) {
    const attribute = game.settings.get('foundryvtt-swse', 'forceTrainingAttribute') || 'wisdom';
    const abilityKey = attribute === 'charisma' ? 'cha' : 'wis';

    const oldMod = Math.floor((oldAbilities[abilityKey]?.total || 10) - 10) / 2;
    const newMod = Math.floor((newAbilities[abilityKey]?.total || 10) - 10) / 2;

    // Check if modifier increased
    if (newMod > oldMod) {
      const forceTrainingCount = this.countForceTrainingFeats(actor);

      if (forceTrainingCount > 0) {
        // Grant 1 power per Force Training feat
        const powerCount = forceTrainingCount;

        ui.notifications.info(
          `${actor.name}'s ${attribute === 'charisma' ? 'Charisma' : 'Wisdom'} modifier increased! ` +
          `Granting ${powerCount} Force Power(s) (${forceTrainingCount} Force Training feat${forceTrainingCount > 1 ? 's' : ''})`
        );

        const selectedPowers = await this.selectForcePowers(
          actor,
          powerCount,
          `Ability Increase - Select ${powerCount} Power(s)`
        );

        if (selectedPowers.length > 0) {
          await this.grantForcePowers(actor, selectedPowers);
        }

        // Update force suite maximum
        const newMax = this.calculateForceSuiteSize(actor);
        await globalThis.SWSE.ActorEngine.updateActor(actor, {
          'system.forceSuite.max': newMax
        });
      }
    }
  }
}

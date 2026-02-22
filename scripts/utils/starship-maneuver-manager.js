/**
 * StarshipManeuverManager.js
 *
 * Manages Starship Maneuver selection, granting, and suite management
 * Works similarly to ForcePowerManager for Force Powers
 *
 * PHASE 7: All mutations routed through ActorEngine for atomic governance
 */

import { ActorEngine } from '../governance/actor-engine/actor-engine.js';

export class StarshipManeuverManager {
  /**
   * Get all available maneuvers an actor can learn
   * Filters by prerequisites
   *
   * @param {Actor} actor - The actor
   * @returns {Array} Array of learnable maneuvers
   */
  static async getAvailableManeuvers(actor) {
    const allManeuvers = this._getAllManeuverDefinitions();
    const learned = new Set(
      actor.items
        .filter(item => item.type === 'maneuver')
        .map(item => item.name)
    );

    const available = [];

    for (const maneuver of allManeuvers) {
      // Skip already learned
      if (learned.has(maneuver.name)) {continue;}

      // Check prerequisites
      const prerequisiteCheck = await this._checkManeuverPrerequisites(actor, maneuver);

      available.push({
        ...maneuver,
        prerequisitesMet: prerequisiteCheck.valid,
        prerequisiteReasons: prerequisiteCheck.reasons || []
      });
    }

    return available;
  }

  /**
   * Select maneuvers via dialog
   *
   * @param {Actor} actor - The actor selecting
   * @param {Number} count - How many to select
   * @param {String} title - Dialog title
   * @returns {Promise<Array>} Selected maneuver definitions
   */
  static async selectManeuvers(actor, count, title = 'Select Starship Maneuvers') {
    const available = await this.getAvailableManeuvers(actor);

    if (available.length === 0) {
      ui.notifications.warn('No more Starship Maneuvers available to learn.');
      return [];
    }

    return new Promise((resolve) => {
      // Create HTML content for dialog
      const html = this._createManeuverSelectionHTML(available, count);

      new SWSEDialogV2({
        title: title,
        content: html,
        buttons: {
          confirm: {
            label: 'Select',
            callback: (html) => {
              const selected = Array.from(html[0].querySelectorAll('input[type="checkbox"]:checked'))
                .map(el => {
                  const name = el.value;
                  return available.find(m => m.name === name);
                })
                .filter(m => m !== undefined);

              resolve(selected);
            }
          },
          cancel: {
            label: 'Cancel',
            callback: () => resolve([])
          }
        },
        default: 'confirm'
      }).render(true);
    });
  }

  /**
   * Grant maneuvers to an actor (creates items)
   *
   * @param {Actor} actor - The target actor
   * @param {Array} maneuvers - Array of maneuver definitions to grant
   * @returns {Promise<Array>} Created item IDs
   */
  static async grantManeuvers(actor, maneuvers) {
    const itemsToCreate = maneuvers.map(maneuver => ({
      type: 'maneuver',
      name: maneuver.name,
      system: {
        ...maneuver,
        spent: false,
        inSuite: false,
        uses: {
          current: 1,
          max: 1
        }
      }
    }));

    // PHASE 7: Route through ActorEngine for governance
    const created = await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
    return created.map(item => item.id);
  }

  /**
   * Handle Starship Tactics feat being added
   *
   * @param {Actor} actor - The actor
   * @returns {Promise<void>}
   */
  static async handleStartshipTactics(actor) {
    // Starship Tactics grants 1 + WIS modifier maneuvers
    const wisValue = actor.system?.abilities?.wis?.value ?? 10;
    const wisModifier = Math.floor((wisValue - 10) / 2);
    const maneuverCount = 1 + Math.max(0, wisModifier);

    const selectedManeuvers = await this.selectManeuvers(
      actor,
      maneuverCount,
      `Starship Tactics - Select ${maneuverCount} Maneuver(s)`
    );

    if (selectedManeuvers.length > 0) {
      await this.grantManeuvers(actor, selectedManeuvers);
    }

    // PHASE 7: Batch initialization update through ActorEngine
    // Initialize maneuver suite if not already set
    if (!actor.system.starshipManeuverSuite) {
      await ActorEngine.updateActor(actor, {
        'system.starshipManeuverSuite': {
          max: maneuverCount,
          maneuvers: []
        }
      });
    } else {
      // Update max if it's larger
      const newMax = this.calculateManeuverSuiteSize(actor);
      if (newMax > actor.system.starshipManeuverSuite.max) {
        await ActorEngine.updateActor(actor, {
          'system.starshipManeuverSuite.max': newMax
        });
      }
    }
  }

  /**
   * Handle ability score increase (check if WIS modifier changed)
   *
   * @param {Actor} actor - The actor
   * @param {Object} oldAbilities - Old ability scores
   * @param {Object} newAbilities - New abilities
   * @returns {Promise<void>}
   */
  static async handleAbilityIncrease(actor, oldAbilities, newAbilities) {
    const oldMod = Math.floor(((oldAbilities.wis?.value ?? 10) - 10) / 2);
    const newMod = Math.floor(((newAbilities.wis?.value ?? 10) - 10) / 2);

    // Check if WIS modifier increased
    if (newMod > oldMod) {
      const tacticsFeatCount = this.countStartshipTacticsFeats(actor);

      if (tacticsFeatCount > 0) {
        // Grant 1 maneuver per Starship Tactics feat
        const maneuverCount = tacticsFeatCount;

        ui.notifications.info(
          `${actor.name}'s Wisdom modifier increased! ` +
          `Granting ${maneuverCount} Starship Maneuver(s) (${tacticsFeatCount} Starship Tactics feat${tacticsFeatCount > 1 ? 's' : ''})`
        );

        const selectedManeuvers = await this.selectManeuvers(
          actor,
          maneuverCount,
          `Ability Increase - Select ${maneuverCount} Maneuver(s)`
        );

        if (selectedManeuvers.length > 0) {
          await this.grantManeuvers(actor, selectedManeuvers);
        }

        // PHASE 7: Update suite maximum through ActorEngine
        const newMax = this.calculateManeuverSuiteSize(actor);
        await ActorEngine.updateActor(actor, {
          'system.starshipManeuverSuite.max': newMax
        });
      }
    }
  }

  /**
   * Calculate total maneuver suite size
   *
   * @param {Actor} actor - The actor
   * @returns {Number} Max maneuvers in suite
   */
  static calculateManeuverSuiteSize(actor) {
    const wisValue = actor.system?.abilities?.wis?.value ?? 10;
    const wisModifier = Math.floor((wisValue - 10) / 2);
    const baseFromWis = 1 + Math.max(0, wisModifier);

    // Multiply by number of Starship Tactics feats
    const tacticsFeatCount = this.countStartshipTacticsFeats(actor);
    return baseFromWis * tacticsFeatCount;
  }

  /**
   * Count how many Starship Tactics feats the actor has
   *
   * @param {Actor} actor - The actor
   * @returns {Number} Count of feats
   */
  static countStartshipTacticsFeats(actor) {
    return actor.items.filter(item =>
      item.type === 'feat' &&
      (item.name === 'Starship Tactics' || item.name.includes('Starship Tactics'))
    ).length;
  }

  /**
   * Get actor's ability modifier for Starship Tactics
   * (Always uses Wisdom)
   *
   * @param {Actor} actor - The actor
   * @returns {Number} WIS modifier
   */
  static getManeuverAbilityModifier(actor) {
    const wis = actor.system.attributes.wis?.value || 10;
    return Math.floor((wis - 10) / 2);
  }

  /**
   * Check if a maneuver's prerequisites are met
   *
   * @param {Actor} actor - The actor
   * @param {Object} maneuver - The maneuver definition
   * @returns {Promise<Object>} {valid: boolean, reasons: string[]}
   */
  static async _checkManeuverPrerequisites(actor, maneuver) {
    if (!maneuver.prerequisites || maneuver.prerequisites.length === 0) {
      return { valid: true };
    }

    const reasons = [];

    for (const prereq of maneuver.prerequisites) {
      if (prereq === 'use-the-force-trained') {
        // Check if trained in Use the Force
        const useTheForce = actor.system.skills?.useTheForce;
        if (!useTheForce || !useTheForce.trained) {
          reasons.push('Requires training in Use the Force');
        }
      } else if (prereq === 'pilot-trained') {
        // Check if trained in Pilot
        const pilot = actor.system.skills?.pilot;
        if (!pilot || !pilot.trained) {
          reasons.push('Requires training in Pilot');
        }
      }
      // Add more prerequisite types as needed
    }

    return {
      valid: reasons.length === 0,
      reasons: reasons
    };
  }

  /**
   * Get all maneuver definitions from data files
   *
   * @private
   * @returns {Array} All maneuver definitions
   */
  static _getAllManeuverDefinitions() {
    // Fallback: return static list of all 27 maneuvers
    return [
      { name: 'Ackbar Slash', actionType: 'reaction', tags: ['vehicle', 'pilot'], prerequisites: [], description: 'Move into enemy formation to cause friendly fire' },
      { name: 'Afterburn', actionType: 'fullRound', tags: ['vehicle', 'pilot'], prerequisites: [], description: 'Throttle up to avoid dogfights' },
      { name: 'Angle Deflector Shields', actionType: 'swift', tags: ['vehicle', 'attack-pattern'], prerequisites: [], description: 'Focus shields in one direction' },
      { name: 'Attack Formation Zeta Nine', actionType: 'swift', tags: ['vehicle', 'attack-pattern'], prerequisites: [], description: 'Formation against capital ships' },
      { name: 'Attack Pattern Delta', actionType: 'swift', tags: ['vehicle', 'attack-pattern'], prerequisites: [], description: 'Close-range maneuvering formation' },
      { name: 'Corellian Slip', actionType: 'fullRound', tags: ['vehicle', 'pilot'], prerequisites: [], description: 'Fly at enemy to defend ally' },
      { name: 'Counter', actionType: 'reaction', tags: ['vehicle', 'dogfight'], prerequisites: [], description: 'Quick action while in dogfight' },
      { name: 'Darklighter Spin', actionType: 'standard', tags: ['vehicle', 'pilot'], prerequisites: [], description: 'Attack multiple targets' },
      { name: 'Devastating Hit', actionType: 'standard', tags: ['vehicle', 'gunner'], prerequisites: [], description: 'Precise hit on vital systems' },
      { name: 'Engine Hit', actionType: 'reaction', tags: ['vehicle', 'gunner'], prerequisites: [], description: 'Target opponent\'s engines' },
      { name: 'Evasive Action', actionType: 'move', tags: ['vehicle', 'dogfight'], prerequisites: [], description: 'Escape from close pursuit' },
      { name: 'Explosive Shot', actionType: 'reaction', tags: ['vehicle', 'gunner'], prerequisites: [], description: 'Target fuel cells for explosion' },
      { name: 'Howlrunner Formation', actionType: 'swift', tags: ['vehicle', 'attack-pattern'], prerequisites: [], description: 'Flank attack formation' },
      { name: 'I Have You Now', actionType: 'swift', tags: ['vehicle', 'pilot'], prerequisites: [], description: 'Close in for short-range strike' },
      { name: 'Intercept', actionType: 'reaction', tags: ['vehicle', 'pilot'], prerequisites: [], description: 'Intercept passing target' },
      { name: 'Overwhelming Assault', actionType: 'swift', tags: ['vehicle', 'attack-pattern'], prerequisites: [], description: 'Concentrate fire on one target' },
      { name: 'Segnor\'s Loop', actionType: 'reaction', tags: ['vehicle', 'pilot'], prerequisites: [], description: 'Accelerate away then attack' },
      { name: 'Shield Hit', actionType: 'standard', tags: ['vehicle', 'gunner'], prerequisites: [], description: 'Target shield generators' },
      { name: 'Skim the Surface', actionType: 'fullRound', tags: ['vehicle', 'pilot'], prerequisites: [], description: 'Get beneath larger ship\'s shields' },
      { name: 'Skywalker Loop', actionType: 'reaction', tags: ['vehicle', 'dogfight'], prerequisites: [], description: 'Loop for surprise attack' },
      { name: 'Snap Roll', actionType: 'reaction', tags: ['vehicle', 'pilot'], prerequisites: [], description: 'Peel away at high speed' },
      { name: 'Strike Formation', actionType: 'swift', tags: ['vehicle', 'attack-pattern'], prerequisites: [], description: 'Maximize damage over defense' },
      { name: 'Tallon Roll', actionType: 'reaction', tags: ['vehicle', 'dogfight'], prerequisites: [], description: 'Stay with maneuvering opponent' },
      { name: 'Target Lock', actionType: 'standard', tags: ['vehicle', 'dogfight'], prerequisites: [], description: 'Focus on single target' },
      { name: 'Target Sense', actionType: 'swift', tags: ['vehicle', 'force'], prerequisites: ['use-the-force-trained'], description: 'Target without computer' },
      { name: 'Thruster Hit', actionType: 'reaction', tags: ['vehicle', 'gunner'], prerequisites: [], description: 'Target maneuvering thrusters' },
      { name: 'Wotan Weave', actionType: 'swift', tags: ['vehicle', 'pilot'], prerequisites: [], description: 'Fly corkscrew to evade' }
    ];
  }

  /**
   * Create HTML for maneuver selection dialog
   *
   * @private
   * @param {Array} maneuvers - Available maneuvers
   * @param {Number} count - How many to select
   * @returns {String} HTML content
   */
  static _createManeuverSelectionHTML(maneuvers, count) {
    let html = `
      <div class="maneuver-selection-dialog">
        <p><strong>Select ${count} Starship Maneuver(s)</strong></p>
        <div class="maneuver-list">
    `;

    for (const maneuver of maneuvers) {
      const disabled = !maneuver.prerequisitesMet;
      const disabledClass = disabled ? 'disabled' : '';
      const reasonsHTML = maneuver.prerequisiteReasons.length > 0
        ? `<div class="prerequisite-reasons">${maneuver.prerequisiteReasons.map(r => `<small>${r}</small>`).join('')}</div>`
        : '';

      html += `
        <div class="maneuver-option ${disabledClass}">
          <label>
            <input type="checkbox" value="${maneuver.name}" ${disabled ? 'disabled' : ''} />
            <strong>${maneuver.name}</strong>
            <div class="maneuver-tags">
              ${(maneuver.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="maneuver-description">${maneuver.description}</div>
            ${reasonsHTML}
          </label>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }
}

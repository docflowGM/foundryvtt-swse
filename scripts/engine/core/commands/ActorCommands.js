/* ============================================================================
   ACTOR COMMANDS
   Engine implementations for actor mutations
   These are the ONLY place where actor.update() should be called
   UI NEVER calls these directly - goes through CommandBus
   ============================================================================ */

import { UpdatePipeline } from '../UpdatePipeline.js';
import { SWSELogger } from '../../../utils/logger.js';
import { ModifierEngine } from '../ModifierEngine.js';

export class ActorCommands {
  /**
   * Set HP value
   * @param {Object} payload - { actor, value }
   * @returns {Promise<Actor>}
   */
  static async setHP({ actor, value }) {
    if (!actor) {
      throw new Error('[ActorCommands] Actor required');
    }

    const newValue = Math.max(0, Number(value) || 0);
    return await UpdatePipeline.apply(actor, 'system.hp.value', newValue);
  }

  /**
   * Set ability score
   * @param {Object} payload - { actor, ability, value }
   * @returns {Promise<Actor>}
   */
  static async setAbility({ actor, ability, value }) {
    if (!actor || !ability) {
      throw new Error('[ActorCommands] Actor and ability required');
    }

    const newValue = Math.max(3, Math.min(18, Number(value) || 10));
    const path = `system.abilities.${ability.toLowerCase()}.base`;

    return await UpdatePipeline.apply(actor, path, newValue);
  }

  /**
   * Train a skill (mark as trained)
   * @param {Object} payload - { actor, skill }
   * @returns {Promise<Actor>}
   */
  static async trainSkill({ actor, skill }) {
    if (!actor || !skill) {
      throw new Error('[ActorCommands] Actor and skill required');
    }

    const path = `system.skills.${skill.toLowerCase()}.trained`;
    return await UpdatePipeline.apply(actor, path, true);
  }

  /**
   * Untrain a skill
   * @param {Object} payload - { actor, skill }
   * @returns {Promise<Actor>}
   */
  static async untrainSkill({ actor, skill }) {
    if (!actor || !skill) {
      throw new Error('[ActorCommands] Actor and skill required');
    }

    const path = `system.skills.${skill.toLowerCase()}.trained`;
    return await UpdatePipeline.apply(actor, path, false);
  }

  /**
   * Add a feat to actor
   * @param {Object} payload - { actor, featId }
   * @returns {Promise<Actor>}
   */
  static async addFeat({ actor, featId }) {
    if (!actor || !featId) {
      throw new Error('[ActorCommands] Actor and featId required');
    }

    return await UpdatePipeline.addToArray(actor, 'system.feats', featId);
  }

  /**
   * Remove a feat from actor
   * @param {Object} payload - { actor, featId }
   * @returns {Promise<Actor>}
   */
  static async removeFeat({ actor, featId }) {
    if (!actor || !featId) {
      throw new Error('[ActorCommands] Actor and featId required');
    }

    return await UpdatePipeline.removeFromArray(
      actor,
      'system.feats',
      feat => feat === featId
    );
  }

  /**
   * Add a talent to actor
   * @param {Object} payload - { actor, talentId }
   * @returns {Promise<Actor>}
   */
  static async addTalent({ actor, talentId }) {
    if (!actor || !talentId) {
      throw new Error('[ActorCommands] Actor and talentId required');
    }

    return await UpdatePipeline.addToArray(actor, 'system.talents', talentId);
  }

  /**
   * Remove a talent from actor
   * @param {Object} payload - { actor, talentId }
   * @returns {Promise<Actor>}
   */
  static async removeTalent({ actor, talentId }) {
    if (!actor || !talentId) {
      throw new Error('[ActorCommands] Actor and talentId required');
    }

    return await UpdatePipeline.removeFromArray(
      actor,
      'system.talents',
      talent => talent === talentId
    );
  }

  /**
   * Update actor name
   * @param {Object} payload - { actor, name }
   * @returns {Promise<Actor>}
   */
  static async setName({ actor, name }) {
    if (!actor || !name) {
      throw new Error('[ActorCommands] Actor and name required');
    }

    return await UpdatePipeline.apply(actor, 'name', String(name).trim());
  }

  /**
   * Set class
   * @param {Object} payload - { actor, className }
   * @returns {Promise<Actor>}
   */
  static async setClass({ actor, className }) {
    if (!actor || !className) {
      throw new Error('[ActorCommands] Actor and className required');
    }

    return await UpdatePipeline.apply(actor, 'system.class', className);
  }

  /**
   * Set species/race
   * @param {Object} payload - { actor, speciesName }
   * @returns {Promise<Actor>}
   */
  static async setSpecies({ actor, speciesName }) {
    if (!actor || !speciesName) {
      throw new Error('[ActorCommands] Actor and speciesName required');
    }

    return await UpdatePipeline.apply(actor, 'system.race', speciesName);
  }

  /**
   * Set level
   * @param {Object} payload - { actor, level }
   * @returns {Promise<Actor>}
   */
  static async setLevel({ actor, level }) {
    if (!actor) {
      throw new Error('[ActorCommands] Actor required');
    }

    const newLevel = Math.max(1, Math.min(20, Number(level) || 1));
    return await UpdatePipeline.apply(actor, 'system.level', newLevel);
  }

  /**
   * Increase level by 1
   * @param {Object} payload - { actor }
   * @returns {Promise<Actor>}
   */
  static async levelUp({ actor }) {
    if (!actor) {
      throw new Error('[ActorCommands] Actor required');
    }

    const currentLevel = actor.system.level || 1;
    return this.setLevel({ actor, level: currentLevel + 1 });
  }

  /**
   * Set XP
   * @param {Object} payload - { actor, xp }
   * @returns {Promise<Actor>}
   */
  static async setXP({ actor, xp }) {
    if (!actor) {
      throw new Error('[ActorCommands] Actor required');
    }

    const newXP = Math.max(0, Number(xp) || 0);
    return await UpdatePipeline.apply(actor, 'system.xp.value', newXP);
  }

  /**
   * Add XP
   * @param {Object} payload - { actor, amount }
   * @returns {Promise<Actor>}
   */
  static async grantXP({ actor, amount }) {
    if (!actor) {
      throw new Error('[ActorCommands] Actor required');
    }

    const current = actor.system.xp?.value || 0;
    const newXP = Math.max(0, current + (Number(amount) || 0));
    return this.setXP({ actor, xp: newXP });
  }
}

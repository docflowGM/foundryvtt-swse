/**
 * Training-Based Skill Advancement House Rule
 * Handles skill improvement through training points
 */

import { SWSELogger } from '../utils/logger.js';

const NS = 'foundryvtt-swse';

export class SkillTrainingMechanics {
  static initialize() {
    // Initialize training tracking on actors
    Hooks.on('createActor', (actor) => this.initializeActorTraining(actor));
    Hooks.on('updateActor', (actor, data) => this.validateTrainingData(actor, data));
    SWSELogger.debug('Skill training mechanics initialized');
  }

  /**
   * Initialize training data on new actor
   * @param {Actor} actor - The actor being created
   */
  static initializeActorTraining(actor) {
    if (!game.settings.get(NS, 'skillTrainingEnabled')) {return;}

    if (!actor.getFlag(NS, 'trainingPoints')) {
      actor.setFlag(NS, 'trainingPoints', 0);
    }

    if (!actor.getFlag(NS, 'skillTraining')) {
      actor.setFlag(NS, 'skillTraining', {});
    }
  }

  /**
   * Get training points for an actor
   * @param {Actor} actor - The character
   * @returns {number} - Available training points
   */
  static getTrainingPoints(actor) {
    if (!game.settings.get(NS, 'skillTrainingEnabled') || !actor) {return 0;}
    return actor.getFlag(NS, 'trainingPoints') || 0;
  }

  /**
   * Get training spent on a specific skill
   * @param {Actor} actor - The character
   * @param {string} skillName - The skill key
   * @returns {number} - Training points spent
   */
  static getSkillTraining(actor, skillName) {
    if (!game.settings.get(NS, 'skillTrainingEnabled') || !actor) {return 0;}

    const training = actor.getFlag(NS, 'skillTraining') || {};
    return training[skillName] || 0;
  }

  /**
   * Calculate training points gained per level
   * @param {Actor} actor - The character
   * @returns {number} - Points gained this level
   */
  static calculateLevelTraining(actor) {
    const pointsType = game.settings.get(NS, 'trainingPointsPerLevel');

    switch (pointsType) {
      case 'two':
        return 2;
      case 'three':
        return 3;
      case 'standard':
        const intMod = actor?.system?.attributes?.int?.mod || 0;
        return 5 + Math.max(0, intMod);
      default:
        return 0;
    }
  }

  /**
   * Add training points to an actor
   * @param {Actor} actor - The character
   * @param {number} points - Points to add
   * @returns {Promise<boolean>} - Success status
   */
  static async addTrainingPoints(actor, points) {
    if (!game.settings.get(NS, 'skillTrainingEnabled') || !actor || points <= 0) {
      return false;
    }

    try {
      const current = this.getTrainingPoints(actor);
      await actor.setFlag(NS, 'trainingPoints', current + points);
      return true;
    } catch (err) {
      SWSELogger.error('Failed to add training points', err);
      return false;
    }
  }

  /**
   * Spend training points on a skill
   * @param {Actor} actor - The character
   * @param {string} skillName - The skill key
   * @param {number} points - Points to spend
   * @returns {Promise<Object>} - Result object
   */
  static async spendTrainingPoints(actor, skillName, points) {
    if (!game.settings.get(NS, 'skillTrainingEnabled') || !actor || points <= 0) {
      return { success: false, message: 'Invalid training parameters' };
    }

    const available = this.getTrainingPoints(actor);
    if (available < points) {
      return { success: false, message: 'Not enough training points available' };
    }

    // Check caps
    const cap = game.settings.get(NS, 'skillTrainingCap');
    const currentTraining = this.getSkillTraining(actor, skillName);
    const level = actor.system?.details?.level || 1;

    if (cap === 'maxLevel' && currentTraining + points > level) {
      return { success: false, message: `Cannot exceed ${level} training points on a skill` };
    }

    if (cap === 'classSkillOnly') {
      const classSkills = actor.system?.skills?.classSkills || [];
      if (!classSkills.includes(skillName)) {
        return { success: false, message: 'Can only train class skills with this setting' };
      }
    }

    try {
      // Deduct points
      await actor.setFlag(NS, 'trainingPoints', available - points);

      // Add to skill training
      const training = actor.getFlag(NS, 'skillTraining') || {};
      training[skillName] = (training[skillName] || 0) + points;
      await actor.setFlag(NS, 'skillTraining', training);

      return {
        success: true,
        skillName,
        pointsSpent: points,
        totalTraining: training[skillName],
        remainingPoints: available - points
      };
    } catch (err) {
      SWSELogger.error('Failed to spend training points', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Calculate skill bonus from training
   * @param {Actor} actor - The character
   * @param {string} skillName - The skill key
   * @returns {number} - Bonus from training points
   */
  static getTrainingBonus(actor, skillName) {
    if (!game.settings.get(NS, 'skillTrainingEnabled') || !actor) {return 0;}

    const spent = this.getSkillTraining(actor, skillName);
    const scale = game.settings.get(NS, 'trainingCostScale');

    switch (scale) {
      case 'linear':
        return spent; // 1:1 mapping
      case 'exponential':
        // Costs increase: 1pt = +1, 2pts = +2, 3pts = +3, but each point costs more
        return Math.floor(spent / 2) + (spent % 2);
      case 'byDC':
        // Bonus scales with difficulty
        return Math.ceil(spent / 2);
      default:
        return 0;
    }
  }

  /**
   * Validate training data on actor update
   * @private
   */
  static validateTrainingData(actor, data) {
    if (!game.settings.get(NS, 'skillTrainingEnabled')) {return;}

    // Ensure training flags exist
    const flags = data.flags || {};
    if (!flags[NS]) {flags[NS] = {};}

    if (typeof flags[NS].trainingPoints === 'undefined') {
      flags[NS].trainingPoints = actor.getFlag(NS, 'trainingPoints') || 0;
    }

    if (typeof flags[NS].skillTraining === 'undefined') {
      flags[NS].skillTraining = actor.getFlag(NS, 'skillTraining') || {};
    }
  }
}

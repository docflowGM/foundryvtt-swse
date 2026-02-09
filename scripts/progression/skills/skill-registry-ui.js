/**
 * Skill Registry - UI version
 * Loads and indexes skills for the level-up UI
 */

import { SWSELogger } from '../../utils/logger.js';

export const SkillRegistry = {
  _skills: [],

  /**
   * Build the registry from compendium
   */
  async build() {
    try {
      const pack = game.packs.get('foundryvtt-swse.skills');
      if (!pack) {
        SWSELogger.warn("Skills compendium 'foundryvtt-swse.skills' not found");
        this._skills = [];
        return;
      }

      const docs = await pack.getDocuments();
      this._skills = docs.map(s => ({
        key: s.system.key ?? s.name.slugify(),
        name: s.name,
        ability: s.system.ability || 'cha',
        classSkills: s.system.classes || [],
        id: s.id,
        data: s
      }));

      SWSELogger.log(`SkillRegistry built: ${this._skills.length} skills loaded`);
    } catch (err) {
      SWSELogger.error('Failed to build SkillRegistry:', err);
      this._skills = [];
    }
  },

  /**
   * Get all skills
   */
  list() {
    return this._skills;
  },

  /**
   * Get skill by key/name
   */
  get(key) {
    const lower = key.toLowerCase();
    return this._skills.find(s => s.key.toLowerCase() === lower || s.name.toLowerCase() === lower);
  },

  /**
   * Get all skills for a specific ability
   */
  getByAbility(ability) {
    return this._skills.filter(s => s.ability === ability);
  },

  /**
   * Get class skills for a specific class
   */
  getClassSkills(className) {
    const lower = className.toLowerCase();
    return this._skills.filter(s =>
      s.classSkills.some(c => c.toLowerCase() === lower)
    );
  },

  /**
   * Get all skill names
   */
  getNames() {
    return this._skills.map(s => s.name);
  },

  /**
   * Clear the registry
   */
  clear() {
    this._skills = [];
  }
};

SWSELogger.log('SkillRegistry (UI) module loaded');

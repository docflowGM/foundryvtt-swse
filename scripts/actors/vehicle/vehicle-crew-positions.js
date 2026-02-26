/**
 * Vehicle Crew Position System
 * Manages skills, actions, and requirements for each crew position
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class VehicleCrewPositions {
  /**
   * Position requirements mapping
   * Defines which skills and actions are available for each crew position
   */
  static POSITION_SKILLS = {
    pilot: {
      required: ['pilot'],
      beneficial: ['useTheForce'],
      display: 'Pilot'
    },
    copilot: {
      required: ['pilot'],
      beneficial: [],
      display: 'Copilot'
    },
    gunner: {
      required: ['mechanics', 'useComputer'],
      beneficial: [],
      display: 'Gunner'
    },
    shields: {
      required: ['useComputer', 'mechanics'],
      beneficial: [],
      display: 'Shield Operator'
    },
    engineer: {
      required: ['useComputer', 'mechanics'],
      beneficial: [],
      display: 'Engineer'
    },
    commander: {
      required: [],
      beneficial: ['knowledge_tactics', 'perception'],
      display: 'Commander'
    }
  };

  /**
   * Standard skill key mappings for consistent lookups
   */
  static SKILL_KEY_MAP = {
    'pilot': 'pilot',
    'Pilot': 'pilot',
    'useTheForce': 'useTheForce',
    'Use the Force': 'useTheForce',
    'useComputer': 'useComputer',
    'Use Computer': 'useComputer',
    'mechanics': 'mechanics',
    'Mechanics': 'mechanics',
    'knowledge_tactics': 'knowledge_tactics',
    'Knowledge (Tactics)': 'knowledge_tactics',
    'perception': 'perception',
    'Perception': 'perception'
  };

  /**
   * Get available skills for a crew position
   * @param {string} position - Crew position key (pilot, gunner, etc.)
   * @param {Actor} crewActor - The crew member actor
   * @returns {Array} Array of skill info objects
   */
  static getAvailableSkillsForPosition(position, crewActor) {
    if (!this.POSITION_SKILLS[position]) {
      SWSELogger.warn(`SWSE | Unknown crew position: ${position}`);
      return [];
    }

    const positionSkills = this.POSITION_SKILLS[position];
    const availableSkills = [];

    // Add required skills
    for (const skillKey of positionSkills.required) {
      const skill = this._getCrewActorSkill(crewActor, skillKey);
      if (skill) {
        availableSkills.push({
          key: skillKey,
          name: skill.label || this._formatSkillName(skillKey),
          trained: skill.trained || false,
          required: true,
          bonus: this._calculateSkillBonus(crewActor, skillKey)
        });
      }
    }

    // Add beneficial skills
    for (const skillKey of positionSkills.beneficial) {
      const skill = this._getCrewActorSkill(crewActor, skillKey);
      if (skill) {
        availableSkills.push({
          key: skillKey,
          name: skill.label || this._formatSkillName(skillKey),
          trained: skill.trained || false,
          required: false,
          bonus: this._calculateSkillBonus(crewActor, skillKey)
        });
      }
    }

    return availableSkills;
  }

  /**
   * Get skill information from crew actor
   * @private
   */
  static _getCrewActorSkill(actor, skillKey) {
    if (!actor || !actor.system?.skills) {
      return null;
    }

    const skills = actor.system.skills;

    // Handle special cases for skills with different key formats
    let skill = skills[skillKey];

    // Try alternate formats if not found
    if (!skill && skillKey === 'useTheForce') {
      skill = skills['use_the_force'] || skills['useTheForce'];
    }
    if (!skill && skillKey === 'useComputer') {
      skill = skills['use_computer'] || skills['useComputer'];
    }
    if (!skill && skillKey === 'knowledge_tactics') {
      skill = skills['knowledge_tactics'];
    }

    return skill;
  }

  /**
   * Calculate skill bonus for crew member
   * @private
   */
  static _calculateSkillBonus(actor, skillKey) {
    if (!actor || !actor.system?.skills) {
      return 0;
    }

    const skill = this._getCrewActorSkill(actor, skillKey);
    if (!skill) {return 0;}

    // Get ability modifier
    let abilityBonus = 0;
    if (skill.ability) {
      const ability = actor.system.attributes?.[skill.ability];
      if (ability) {
        abilityBonus = ability.mod || 0;
      }
    }

    // Get trained bonus
    const trainedBonus = skill.trained ? 5 : 0;

    // Get miscellaneous modifier
    const miscMod = skill.miscMod || 0;

    return abilityBonus + trainedBonus + miscMod;
  }

  /**
   * Format skill name for display
   * @private
   */
  static _formatSkillName(skillKey) {
    const nameMap = {
      'pilot': 'Pilot',
      'useTheForce': 'Use the Force',
      'useComputer': 'Use Computer',
      'mechanics': 'Mechanics',
      'knowledge_tactics': 'Knowledge (Tactics)',
      'perception': 'Perception'
    };

    return nameMap[skillKey] || skillKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get crew maneuvers if pilot has Starship Tactics feat
   * Returns only the maneuvers the pilot actually owns (selected in their suite)
   * Organized by descriptor (attack patterns, dogfighting, force, etc.)
   * @param {Actor} pilotActor - The pilot crew member
   * @returns {Object} Maneuver suite with organized maneuvers
   */
  static async getCrewManeuvers(pilotActor) {
    if (!pilotActor) {
      return {
        maneuvers: [],
        organized: {},
        total: 0,
        hasStartshipTactics: false
      };
    }

    try {
      // StarshipManeuversEngine not yet implemented
      const maneuverData = {
        maneuvers: [],
        organized: {},
        total: 0,
        hasStartshipTactics: false
      };

      return maneuverData;
    } catch (error) {
      SWSELogger.warn(`SWSE | Failed to get crew maneuvers:`, error);
      return {
        maneuvers: [],
        organized: {},
        total: 0,
        hasStartshipTactics: false,
        error: error.message
      };
    }
  }

  /**
   * Check if character can fill multiple positions
   * Useful for small ships with limited crew
   * @param {Actor} actor - The character actor
   * @returns {boolean} True if character has sufficient experience
   */
  static canFillMultiplePositions(actor) {
    // Characters at level 5+ can fill multiple positions
    const level = actor.system?.level || 1;
    return level >= 5;
  }

  /**
   * Get position display name
   * @param {string} position - Position key
   * @returns {string} Display name
   */
  static getPositionDisplayName(position) {
    return this.POSITION_SKILLS[position]?.display || position;
  }

  /**
   * Check if actor has Force Sensitivity
   * Relevant for pilot position
   * @param {Actor} actor - The actor to check
   * @returns {boolean}
   */
  static isForceSensitive(actor) {
    return actor?.system?.forceSensitive === true;
  }

  /**
   * Build crew roster data for vehicle sheet
   * Shows all crew members and their assigned positions
   * Handles multi-position assignments
   * @param {Actor} vehicleActor - The vehicle actor
   * @returns {Object} Crew data structure
   */
  static buildCrewRoster(vehicleActor) {
    const roster = {
      positions: {},
      crew: {},
      hasMultipleCrew: false,
      allPositionsFilled: false
    };

    if (!vehicleActor.system?.crewPositions) {
      return roster;
    }

    const positions = vehicleActor.system.crewPositions;
    let filledPositions = 0;

    // Process each position
    for (const [posKey, crew] of Object.entries(positions)) {
      if (crew) {
        filledPositions++;
        const crewData = typeof crew === 'string'
          ? { name: crew, uuid: null }
          : crew;

        roster.positions[posKey] = {
          key: posKey,
          display: this.getPositionDisplayName(posKey),
          crew: crewData,
          skills: [] // Will be populated when actor is loaded
        };

        // Track unique crew members
        if (!roster.crew[crewData.uuid]) {
          roster.crew[crewData.uuid] = {
            name: crewData.name,
            uuid: crewData.uuid,
            positions: [posKey]
          };
        } else {
          roster.crew[crewData.uuid].positions.push(posKey);
        }
      } else {
        roster.positions[posKey] = {
          key: posKey,
          display: this.getPositionDisplayName(posKey),
          crew: null,
          skills: []
        };
      }
    }

    roster.hasMultipleCrew = Object.keys(roster.crew).length > 1;
    roster.allPositionsFilled = filledPositions === Object.keys(positions).length;

    return roster;
  }

  /**
   * Get pilot solo mode info
   * When pilot is the only crew member, they can perform all crew actions
   * @param {Object} positions - The crewPositions object from vehicle
   * @returns {Object|null} Pilot info if pilot is only crew member, null otherwise
   */
  static getPilotSoloMode(positions) {
    if (!positions) {return null;}

    const filledPositions = Object.entries(positions)
      .filter(([, crew]) => crew !== null && crew !== undefined)
      .map(([key, crew]) => ({
        key,
        crew: typeof crew === 'string' ? { name: crew } : crew
      }));

    // Check if only pilot position is filled
    if (filledPositions.length === 1 && filledPositions[0].key === 'pilot') {
      return {
        pilot: filledPositions[0].crew,
        soloMode: true,
        message: 'Pilot is flying solo - can perform all crew actions'
      };
    }

    return null;
  }
}

export default VehicleCrewPositions;

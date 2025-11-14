/**
 * Combat Actions Mapper
 * Maps combat actions and extra skill uses to skills for display on character sheets
 */

export class CombatActionsMapper {

  static _combatActionsData = null;
  static _extraSkillUsesData = null;
  static _shipCombatActionsData = null;
  static _initialized = false;

  /**
   * Initialize by loading JSON data
   */
  static async init() {
    if (this._initialized) return;

    try {
      // Load combat actions
      const combatResponse = await fetch('systems/swse/data/combat-actions.json');
      this._combatActionsData = await combatResponse.json();

      // Load extra skill uses
      const skillResponse = await fetch('systems/swse/data/extraskilluses.json');
      this._extraSkillUsesData = await skillResponse.json();

      // Load ship combat actions
      const shipResponse = await fetch('systems/swse/data/ship-combat-actions.json');
      this._shipCombatActionsData = await shipResponse.json();

      this._initialized = true;
      console.log('SWSE | Combat Actions Mapper initialized (character & ship combat)');
    } catch (error) {
      console.error('SWSE | Failed to load combat actions data:', error);
      this._combatActionsData = [];
      this._extraSkillUsesData = [];
      this._shipCombatActionsData = [];
    }
  }

  /**
   * Get all combat actions and skill uses related to a specific skill
   * @param {string} skillKey - The skill key (e.g., 'acrobatics', 'deception')
   * @returns {Object} Object containing combat actions and extra uses for this skill
   */
  static getActionsForSkill(skillKey) {
    if (!this._initialized || !this._combatActionsData) {
      console.warn('SWSE | Combat Actions Mapper not initialized');
      return { combatActions: [], extraUses: [], hasActions: false };
    }

    const skillName = this._getSkillDisplayName(skillKey);
    const skillNameLower = skillName.toLowerCase();

    const combatActions = [];
    const extraUses = [];

    // Find combat actions that relate to this skill
    for (const action of this._combatActionsData) {
      if (!action.relatedSkills || action.relatedSkills.length === 0) continue;

      for (const relatedSkill of action.relatedSkills) {
        const relatedSkillName = (relatedSkill.skill || '').toLowerCase();

        // Check if this action relates to the current skill
        if (this._skillMatches(skillKey, skillNameLower, relatedSkillName)) {
          combatActions.push({
            name: action.name,
            actionType: action.action.type,
            cost: action.action.cost,
            notes: action.notes,
            dc: relatedSkill.dc,
            outcome: relatedSkill.outcome,
            when: relatedSkill.when
          });
          break; // Only add the action once even if it has multiple matching skills
        }
      }
    }

    // Find extra skill uses for this skill
    for (const use of this._extraSkillUsesData) {
      const useName = (use.application || use.name || '').toLowerCase();

      if (this._skillMatches(skillKey, skillNameLower, useName)) {
        extraUses.push({
          name: use.application || use.name,
          dc: use.DC,
          time: use.time,
          effect: use.effect
        });
      }
    }

    return {
      combatActions,
      extraUses,
      hasActions: combatActions.length > 0 || extraUses.length > 0
    };
  }

  /**
   * Get display name for a skill key
   */
  static _getSkillDisplayName(skillKey) {
    const skillNames = {
      acrobatics: 'Acrobatics',
      climb: 'Climb',
      deception: 'Deception',
      endurance: 'Endurance',
      gatherInformation: 'Gather Information',
      initiative: 'Initiative',
      jump: 'Jump',
      knowledge: 'Knowledge',
      mechanics: 'Mechanics',
      perception: 'Perception',
      persuasion: 'Persuasion',
      pilot: 'Pilot',
      ride: 'Ride',
      stealth: 'Stealth',
      survival: 'Survival',
      swim: 'Swim',
      treatInjury: 'Treat Injury',
      useComputer: 'Use Computer',
      useTheForce: 'Use the Force'
    };

    return skillNames[skillKey] || skillKey;
  }

  /**
   * Check if a skill matches a related skill name
   */
  static _skillMatches(skillKey, skillNameLower, relatedSkillName) {
    // Direct name match
    if (relatedSkillName.includes(skillNameLower)) return true;

    // Special mappings
    const specialMappings = {
      acrobatics: ['tumble', 'balance', 'dodge', 'escape', 'fall prone', 'stand up'],
      climb: ['climb', 'catch self'],
      deception: ['feint', 'deceptive', 'cheat', 'innuendo', 'create a diversion', 'hide item'],
      endurance: ['endurance', 'run', 'second wind', 'hold breath'],
      gatherInformation: ['gather information', 'contacts'],
      initiative: ['initiative'],
      mechanics: ['mechanics', 'jury-rig', 'repair', 'recharge shields', 'disable device'],
      perception: ['perception', 'notice', 'search', 'spot'],
      persuasion: ['persuade', 'diplomacy', 'negotiate'],
      pilot: ['pilot', 'vehicle'],
      stealth: ['stealth', 'hide', 'sneak', 'snipe'],
      treatInjury: ['treat injury', 'first aid', 'surgery', 'revivify', 'medpac'],
      useComputer: ['use computer', 'hack', 'access'],
      useTheForce: ['use the force', 'utf', 'force power', 'move light object', 'breath control']
    };

    const mappings = specialMappings[skillKey] || [];
    return mappings.some(mapping => relatedSkillName.includes(mapping));
  }

  /**
   * Get all combat actions mapped by skill
   * @returns {Object} Object with skill keys as properties, containing arrays of actions
   */
  static getAllActionsBySkill() {
    const skills = [
      'acrobatics', 'climb', 'deception', 'endurance', 'gatherInformation',
      'initiative', 'jump', 'knowledge', 'mechanics', 'perception', 'persuasion',
      'pilot', 'ride', 'stealth', 'survival', 'swim', 'treatInjury',
      'useComputer', 'useTheForce'
    ];

    const actionsBySkill = {};

    for (const skill of skills) {
      actionsBySkill[skill] = this.getActionsForSkill(skill);
    }

    return actionsBySkill;
  }

  /**
   * Get ship combat actions for a specific crew position
   * @param {string} crewPosition - The crew position (pilot, gunner, engineer, shields, commander, etc.)
   * @returns {Array} Array of actions available to that crew position
   */
  static getActionsForCrewPosition(crewPosition) {
    if (!this._initialized || !this._shipCombatActionsData) {
      console.warn('SWSE | Combat Actions Mapper not initialized');
      return [];
    }

    const normalizedPosition = crewPosition.toLowerCase();

    return this._shipCombatActionsData
      .filter(action => {
        if (!action.crewPosition) return false;

        // Match exact position or "any"
        if (action.crewPosition === 'any') return true;

        return action.crewPosition.toLowerCase() === normalizedPosition;
      })
      .map(action => ({
        name: action.name,
        actionType: action.action.type,
        cost: action.action.cost,
        notes: action.notes,
        relatedSkills: action.relatedSkills || [],
        crewPosition: action.crewPosition
      }));
  }

  /**
   * Get all ship combat actions organized by crew position
   * @returns {Object} Object with crew positions as keys, arrays of actions as values
   */
  static getAllShipActionsByPosition() {
    const positions = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander', 'system operator'];

    const actionsByPosition = {};

    for (const position of positions) {
      const actions = this.getActionsForCrewPosition(position);
      if (actions.length > 0) {
        actionsByPosition[position] = {
          actions: actions,
          hasActions: true
        };
      }
    }

    // Add "any" position actions to all positions
    const anyActions = this._shipCombatActionsData
      ?.filter(action => action.crewPosition === 'any') || [];

    if (anyActions.length > 0) {
      actionsByPosition['any'] = {
        actions: anyActions.map(action => ({
          name: action.name,
          actionType: action.action.type,
          cost: action.action.cost,
          notes: action.notes,
          relatedSkills: action.relatedSkills || [],
          crewPosition: action.crewPosition
        })),
        hasActions: true
      };
    }

    return actionsByPosition;
  }
}

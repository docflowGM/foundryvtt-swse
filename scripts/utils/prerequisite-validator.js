/**
 * SWSE Prerequisite Validation Utility
 * Handles validation of prerequisites for feats, talents, and classes
 */

export class PrerequisiteValidator {

  /**
   * Check if a character meets all prerequisites for a feat
   * @param {Object} feat - The feat to check
   * @param {Actor} actor - The character actor
   * @param {Object} pendingData - Data from ongoing character creation/level-up (optional)
   * @returns {Object} { valid: boolean, reasons: string[] }
   */
  static checkFeatPrerequisites(feat, actor, pendingData = {}) {
    const prereqString = feat.system?.prerequisites || "";

    // If no prerequisites, feat is available to everyone
    if (!prereqString || prereqString.trim() === "" || prereqString === "null") {
      return { valid: true, reasons: [] };
    }

    const reasons = [];
    const prereqs = this._parsePrerequisites(prereqString);

    // Check each type of prerequisite
    for (const prereq of prereqs) {
      const check = this._checkSinglePrerequisite(prereq, actor, pendingData);
      if (!check.valid) {
        reasons.push(check.reason);
      }
    }

    return {
      valid: reasons.length === 0,
      reasons: reasons
    };
  }

  /**
   * Check if a character meets prerequisites for a talent
   * @param {Object} talent - The talent to check
   * @param {Actor} actor - The character actor
   * @param {Object} pendingData - Data from ongoing character creation/level-up (optional)
   * @returns {Object} { valid: boolean, reasons: string[] }
   */
  static checkTalentPrerequisites(talent, actor, pendingData = {}) {
    let prereqData = talent.system?.prerequisites || talent.system?.prereqassets || "";

    // Handle both array and string formats
    let prereqTalentNames = [];
    if (Array.isArray(prereqData)) {
      // Array format from JSON data
      prereqTalentNames = prereqData.map(p => String(p).trim()).filter(p => p);
    } else if (typeof prereqData === 'string') {
      // String format - check if empty
      if (!prereqData || prereqData.trim() === "" || prereqData === "null") {
        return { valid: true, reasons: [] };
      }

      // Split by comma, semicolon, or " and " (case insensitive)
      // This handles various formats: "Talent1, Talent2" or "Talent1; Talent2" or "Talent1 and Talent2"
      prereqTalentNames = prereqData
        .split(/[,;]|(?:\s+and\s+)/i)
        .map(p => p.trim())
        .filter(p => p && p.toLowerCase() !== 'and');
    } else {
      // No prerequisites
      return { valid: true, reasons: [] };
    }

    // If no prerequisites after parsing, talent is available
    if (prereqTalentNames.length === 0) {
      return { valid: true, reasons: [] };
    }

    const reasons = [];

    // Get character's existing talents
    const characterTalents = actor.items.filter(i => i.type === 'talent').map(t => t.name);

    // Also check pending talents from character creation or level-up
    const pendingTalents = pendingData.selectedTalents || [];
    const allTalents = [...characterTalents, ...pendingTalents.map(t => t.name || t)];

    // Check each prerequisite talent
    for (const prereqName of prereqTalentNames) {
      if (!allTalents.includes(prereqName)) {
        reasons.push(`Requires talent: ${prereqName}`);
      }
    }

    return {
      valid: reasons.length === 0,
      reasons: reasons
    };
  }

  /**
   * Check if a character meets prerequisites for a class (prestige classes)
   * @param {Object} classDoc - The class to check
   * @param {Actor} actor - The character actor
   * @param {Object} pendingData - Data from ongoing character creation/level-up (optional)
   * @returns {Object} { valid: boolean, reasons: string[] }
   */
  static checkClassPrerequisites(classDoc, actor, pendingData = {}) {
    const prereqString = classDoc.system?.prerequisites || "";

    // If no prerequisites, class is available
    if (!prereqString || prereqString.trim() === "" || prereqString === "null") {
      return { valid: true, reasons: [] };
    }

    const reasons = [];
    const prereqs = this._parsePrerequisites(prereqString);

    // Check each type of prerequisite
    for (const prereq of prereqs) {
      const check = this._checkSinglePrerequisite(prereq, actor, pendingData);
      if (!check.valid) {
        reasons.push(check.reason);
      }
    }

    return {
      valid: reasons.length === 0,
      reasons: reasons
    };
  }

  /**
   * Parse a prerequisite string into structured prerequisite objects
   * @param {string} prereqString - Raw prerequisite string
   * @returns {Array} Array of prerequisite objects with logic operators
   */
  static _parsePrerequisites(prereqString) {
    const prereqs = [];

    // Check if string contains OR logic
    const hasOr = /\s+or\s+/i.test(prereqString);

    if (hasOr) {
      // Split by OR first to handle OR groups
      const orGroups = prereqString.split(/\s+or\s+/i).map(p => p.trim()).filter(p => p);

      // Each OR group might have multiple AND conditions
      const parsedGroups = orGroups.map(group => {
        const andParts = group.split(/[,;]|(?:\s+and\s+)/i).map(p => p.trim()).filter(p => p);
        return andParts.map(part => this._parsePrerequisitePart(part)).filter(p => p);
      });

      return [{
        type: 'or_group',
        groups: parsedGroups
      }];
    } else {
      // Standard AND logic (split by comma, semicolon, or "and")
      const parts = prereqString.split(/[,;]|(?:\s+and\s+)/i).map(p => p.trim()).filter(p => p);

      for (const part of parts) {
        const prereq = this._parsePrerequisitePart(part);
        if (prereq) {
          prereqs.push(prereq);
        }
      }
    }

    return prereqs;
  }

  /**
   * Parse a single prerequisite part into a structured object
   * @param {string} part - A single prerequisite part
   * @returns {Object|null} Prerequisite object or null
   */
  static _parsePrerequisitePart(part) {
    part = part.trim();

    // Ability score pattern: "Dex 13", "Strength 15+", "Con 13 or higher"
    const abilityPattern = /^(str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma)\s+(\d+)(\+|or higher)?/i;
    const abilityMatch = part.match(abilityPattern);
    if (abilityMatch) {
      const abilityMap = {
        'str': 'str', 'strength': 'str',
        'dex': 'dex', 'dexterity': 'dex',
        'con': 'con', 'constitution': 'con',
        'int': 'int', 'intelligence': 'int',
        'wis': 'wis', 'wisdom': 'wis',
        'cha': 'cha', 'charisma': 'cha'
      };
      return {
        type: 'ability',
        ability: abilityMap[abilityMatch[1].toLowerCase()],
        value: parseInt(abilityMatch[2])
      };
    }

    // BAB pattern: "BAB +1", "Base Attack Bonus +6", "+3 base attack bonus"
    const babPattern = /(?:bab|base attack bonus)\s*\+?\s*(\d+)|(\d+)\s*(?:bab|base attack bonus)/i;
    const babMatch = part.match(babPattern);
    if (babMatch) {
      return {
        type: 'bab',
        value: parseInt(babMatch[1] || babMatch[2])
      };
    }

    // Character level pattern: "Character level 3rd", "3rd level", "Level 5"
    const levelPattern = /(?:character\s+)?level\s+(\d+)(?:st|nd|rd|th)?|(\d+)(?:st|nd|rd|th)?\s+level/i;
    const levelMatch = part.match(levelPattern);
    if (levelMatch) {
      return {
        type: 'level',
        value: parseInt(levelMatch[1] || levelMatch[2])
      };
    }

    // Class level pattern: "Soldier 1", "Jedi 3", "Scout level 5"
    const classLevelPattern = /^([A-Za-z\s]+?)\s+(?:level\s+)?(\d+)$/i;
    const classLevelMatch = part.match(classLevelPattern);
    if (classLevelMatch) {
      const className = classLevelMatch[1].trim();
      // Check if it's a known class name (not a feat name)
      const knownClasses = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier', 'Beast', 'Force Adept',
                           'Ace Pilot', 'Crime Lord', 'Elite Trooper', 'Force Disciple', 'Gunslinger',
                           'Jedi Knight', 'Jedi Master', 'Officer', 'Sith Apprentice', 'Sith Lord'];
      if (knownClasses.some(c => c.toLowerCase() === className.toLowerCase())) {
        return {
          type: 'class',
          className: className,
          level: parseInt(classLevelMatch[2])
        };
      }
    }

    // Skill rank pattern: "Stealth 5 ranks", "Use the Force 10 ranks", "Mechanics 1 rank"
    const skillRankPattern = /^(.+?)\s+(\d+)\s+ranks?$/i;
    const skillRankMatch = part.match(skillRankPattern);
    if (skillRankMatch) {
      return {
        type: 'skill_rank',
        skillName: skillRankMatch[1].trim(),
        ranks: parseInt(skillRankMatch[2])
      };
    }

    // Skill training pattern: "Trained in Use the Force", "Trained in Mechanics"
    const skillPattern = /trained\s+in\s+(.+)/i;
    const skillMatch = part.match(skillPattern);
    if (skillMatch) {
      return {
        type: 'skill',
        skillName: skillMatch[1].trim()
      };
    }

    // Force Sensitive
    if (part.toLowerCase().includes('force sensitive') || part.toLowerCase().includes('force sensitivity')) {
      return {
        type: 'force_sensitive'
      };
    }

    // Otherwise, assume it's a feat name
    return {
      type: 'feat',
      featName: part
    };
  }

  /**
   * Check a single prerequisite against character data
   * @param {Object} prereq - Structured prerequisite object
   * @param {Actor} actor - The character actor
   * @param {Object} pendingData - Pending character creation/level-up data
   * @returns {Object} { valid: boolean, reason: string }
   */
  static _checkSinglePrerequisite(prereq, actor, pendingData = {}) {
    switch (prereq.type) {
      case 'or_group':
        return this._checkOrGroupPrereq(prereq, actor, pendingData);

      case 'ability':
        return this._checkAbilityPrereq(prereq, actor, pendingData);

      case 'bab':
        return this._checkBABPrereq(prereq, actor, pendingData);

      case 'level':
        return this._checkLevelPrereq(prereq, actor, pendingData);

      case 'class':
        return this._checkClassLevelPrereq(prereq, actor, pendingData);

      case 'skill':
        return this._checkSkillPrereq(prereq, actor, pendingData);

      case 'skill_rank':
        return this._checkSkillRankPrereq(prereq, actor, pendingData);

      case 'force_sensitive':
        return this._checkForceSensitivePrereq(prereq, actor, pendingData);

      case 'feat':
        return this._checkFeatPrereq(prereq, actor, pendingData);

      default:
        // Unknown prerequisite type, assume valid
        return { valid: true };
    }
  }

  static _checkOrGroupPrereq(prereq, actor, pendingData) {
    // At least ONE group must be completely satisfied
    // Each group is an array of AND conditions
    const validGroups = [];
    const failedGroups = [];

    for (const group of prereq.groups) {
      const groupResults = group.map(p => this._checkSinglePrerequisite(p, actor, pendingData));
      const allValid = groupResults.every(r => r.valid);

      if (allValid) {
        validGroups.push(group);
      } else {
        const failures = groupResults.filter(r => !r.valid).map(r => r.reason);
        failedGroups.push(failures);
      }
    }

    if (validGroups.length > 0) {
      return { valid: true };
    }

    // Build helpful error message showing all OR options
    const groupDescriptions = prereq.groups.map((group, i) => {
      if (group.length === 1) {
        return failedGroups[i][0] || 'Unknown requirement';
      }
      return failedGroups[i].join(' AND ');
    });

    return {
      valid: false,
      reason: `Requires one of: (${groupDescriptions.join(') OR (')})`
    };
  }

  static _checkAbilityPrereq(prereq, actor, pendingData) {
    const abilityScore = actor.system.abilities[prereq.ability]?.total || 10;
    const pendingIncreases = pendingData.abilityIncreases || {};
    const finalScore = abilityScore + (pendingIncreases[prereq.ability] || 0);

    if (finalScore < prereq.value) {
      return {
        valid: false,
        reason: `Requires ${prereq.ability.toUpperCase()} ${prereq.value}+ (you have ${finalScore})`
      };
    }
    return { valid: true };
  }

  static _checkBABPrereq(prereq, actor, pendingData) {
    const bab = actor.system.bab || 0;

    if (bab < prereq.value) {
      return {
        valid: false,
        reason: `Requires BAB +${prereq.value} (you have +${bab})`
      };
    }
    return { valid: true };
  }

  static _checkLevelPrereq(prereq, actor, pendingData) {
    const level = actor.system.level || 1;

    if (level < prereq.value) {
      return {
        valid: false,
        reason: `Requires character level ${prereq.value} (you are level ${level})`
      };
    }
    return { valid: true };
  }

  static _checkClassLevelPrereq(prereq, actor, pendingData) {
    // Get class levels from actor items
    const classItems = actor.items.filter(i => i.type === 'class');
    const classLevels = {};

    for (const classItem of classItems) {
      const className = classItem.name;
      classLevels[className.toLowerCase()] = (classItem.system.level || 1);
    }

    const requiredClass = prereq.className.toLowerCase();
    const currentLevel = classLevels[requiredClass] || 0;

    if (currentLevel < prereq.level) {
      return {
        valid: false,
        reason: `Requires ${prereq.className} level ${prereq.level} (you have ${currentLevel})`
      };
    }
    return { valid: true };
  }

  static _checkSkillPrereq(prereq, actor, pendingData) {
    // Convert skill name to skill key
    const skillMap = {
      'acrobatics': 'acrobatics',
      'climb': 'climb',
      'deception': 'deception',
      'endurance': 'endurance',
      'gather information': 'gatherInformation',
      'initiative': 'initiative',
      'jump': 'jump',
      'knowledge': 'knowledge',
      'mechanics': 'mechanics',
      'perception': 'perception',
      'persuasion': 'persuasion',
      'pilot': 'pilot',
      'ride': 'ride',
      'stealth': 'stealth',
      'survival': 'survival',
      'swim': 'swim',
      'treat injury': 'treatInjury',
      'use computer': 'useComputer',
      'use the force': 'useTheForce'
    };

    const skillKey = skillMap[prereq.skillName.toLowerCase()];
    if (!skillKey) {
      // Unknown skill, assume valid
      return { valid: true };
    }

    const isTrained = actor.system.skills[skillKey]?.trained || false;
    const pendingSkills = pendingData.selectedSkills || [];
    const isPendingTrained = pendingSkills.some(s => s.key === skillKey);

    if (!isTrained && !isPendingTrained) {
      return {
        valid: false,
        reason: `Requires training in ${prereq.skillName}`
      };
    }
    return { valid: true };
  }

  static _checkSkillRankPrereq(prereq, actor, pendingData) {
    // Convert skill name to skill key
    const skillMap = {
      'acrobatics': 'acrobatics',
      'climb': 'climb',
      'deception': 'deception',
      'endurance': 'endurance',
      'gather information': 'gatherInformation',
      'initiative': 'initiative',
      'jump': 'jump',
      'knowledge': 'knowledge',
      'mechanics': 'mechanics',
      'perception': 'perception',
      'persuasion': 'persuasion',
      'pilot': 'pilot',
      'ride': 'ride',
      'stealth': 'stealth',
      'survival': 'survival',
      'swim': 'swim',
      'treat injury': 'treatInjury',
      'use computer': 'useComputer',
      'use the force': 'useTheForce'
    };

    const skillKey = skillMap[prereq.skillName.toLowerCase()];
    if (!skillKey) {
      // Unknown skill, assume valid (can't validate)
      return { valid: true };
    }

    // Get current skill ranks from actor
    const currentRanks = actor.system.skills[skillKey]?.ranks || 0;
    const pendingRanks = pendingData.skillRanks?.[skillKey] || 0;
    const totalRanks = currentRanks + pendingRanks;

    if (totalRanks < prereq.ranks) {
      return {
        valid: false,
        reason: `Requires ${prereq.ranks} ranks in ${prereq.skillName} (you have ${totalRanks})`
      };
    }
    return { valid: true };
  }

  static _checkForceSensitivePrereq(prereq, actor, pendingData) {
    // Check if character has Force Sensitivity feat or is a Force-using class
    const hasForceSensitivityFeat = actor.items.some(i =>
      i.type === 'feat' && i.name.toLowerCase().includes('force sensitivity')
    );

    const hasForceSensitiveClass = actor.items.some(i =>
      i.type === 'class' && i.system?.forceSensitive === true
    );

    const pendingClass = pendingData.selectedClass;
    const pendingForceSensitive = pendingClass?.system?.forceSensitive === true;

    const pendingFeats = pendingData.selectedFeats || [];
    const pendingForceSensitivityFeat = pendingFeats.some(f =>
      f.name.toLowerCase().includes('force sensitivity')
    );

    if (!hasForceSensitivityFeat && !hasForceSensitiveClass && !pendingForceSensitive && !pendingForceSensitivityFeat) {
      return {
        valid: false,
        reason: 'Requires Force Sensitivity'
      };
    }
    return { valid: true };
  }

  static _checkFeatPrereq(prereq, actor, pendingData) {
    // Check if character has the prerequisite feat
    const hasFeat = actor.items.some(i =>
      i.type === 'feat' && i.name.toLowerCase() === prereq.featName.toLowerCase()
    );

    const pendingFeats = pendingData.selectedFeats || [];
    const hasPendingFeat = pendingFeats.some(f =>
      f.name.toLowerCase() === prereq.featName.toLowerCase()
    );

    if (!hasFeat && !hasPendingFeat) {
      return {
        valid: false,
        reason: `Requires feat: ${prereq.featName}`
      };
    }
    return { valid: true };
  }

  /**
   * Filter a list of feats to only those the character qualifies for
   * @param {Array} feats - Array of feat objects
   * @param {Actor} actor - The character actor
   * @param {Object} pendingData - Pending character creation/level-up data
   * @returns {Array} Filtered array of qualified feats
   */
  static filterQualifiedFeats(feats, actor, pendingData = {}) {
    return feats.map(feat => {
      const check = this.checkFeatPrerequisites(feat, actor, pendingData);
      return {
        ...feat,
        isQualified: check.valid,
        prerequisiteReasons: check.reasons
      };
    });
  }

  /**
   * Filter a list of talents to only those the character qualifies for
   * @param {Array} talents - Array of talent objects
   * @param {Actor} actor - The character actor
   * @param {Object} pendingData - Pending character creation/level-up data
   * @returns {Array} Filtered array of qualified talents
   */
  static filterQualifiedTalents(talents, actor, pendingData = {}) {
    return talents.map(talent => {
      const check = this.checkTalentPrerequisites(talent, actor, pendingData);
      return {
        ...talent,
        isQualified: check.valid,
        prerequisiteReasons: check.reasons
      };
    });
  }
}

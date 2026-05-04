import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
/**
 * Skill Use Application Filtering and Rolling Utility
 * Handles filtering skill use applications based on character capabilities
 * and automatic skill rolling for skill-specific applications
 */

export class SkillUseFilter {

  /**
   * Check if an actor can access a specific skill use application
   * @param {Actor} actor - The actor to check
   * @param {Object} skillUse - The skill use application object from extraskilluses
   * @returns {boolean} True if the actor can access this skill use
   */
  static canAccessSkillUse(actor, skillUse) {
    if (!actor || !skillUse) {return false;}

    // Prefer explicit structured metadata when present. Normalized registry
    // entries carry `system.skill` (and sometimes top-level `skill`) with the
    // authoritative skill key, which is far more reliable than sniffing the
    // application-name string.
    const structuredSkill = skillUse?.system?.skill ?? skillUse?.skill ?? null;
    if (structuredSkill === 'useTheForce') {
      return this.canUseTheForce(actor);
    }
    if (structuredSkill) {
      // Non-UTF skills have no access gate at this layer.
      return true;
    }

    // Fallback: string-based detection for unstructured entries (legacy /
    // JSON fallback / entries missing explicit metadata).
    const applicationName = skillUse.application || '';
    if (this.isUseTheForceApplication(applicationName)) {
      return this.canUseTheForce(actor);
    }

    return true;
  }

  /**
   * Check if a skill use application is for Use the Force
   * @param {string} applicationName - The name of the skill use application
   * @returns {boolean} True if this is a Use the Force application
   */
  static isUseTheForceApplication(applicationName) {
    if (!applicationName) {return false;}

    // Stable structural marker: canonical UTF entries carry a parenthetical
    // "(Use the Force...)" qualifier, e.g.
    //   "Move Light Object — Catch Thrown Weapon (Use the Force, Trained Only)"
    // Match this first — it is robust across dash variants and base-power
    // rewording, and it avoids false positives from unrelated applications
    // that happen to reference a Force power name in passing.
    if (/\(\s*use the force\b/i.test(applicationName)) {
      return true;
    }

    // Legacy base-power name list, kept for backwards compatibility with
    // entries that predate the parenthetical marker convention.
    const utfApplications = [
      'Force Trance',
      'Move Light Object',
      'Search Your Feelings',
      'Sense Force',
      'Sense Surroundings',
      'Telepathy',
      'Breath Control',
      'Place Other in Force Trance',
      'Place other in Force Trance'
    ];

    // Normalize the application name for comparison:
    // - Remove various dash/separator variants (en-dash, em-dash, hyphen, etc.)
    // - Lowercase for case-insensitive comparison
    const normalizedAppName = applicationName
      .toLowerCase()
      .replace(/[–—-]/g, ' '); // Replace en-dash, em-dash, hyphen with space

    // Check if application name includes any UTF application
    return utfApplications.some(name => {
      const normalizedName = name.toLowerCase().replace(/[–—-]/g, ' ');
      return normalizedAppName.includes(normalizedName);
    });
  }

  /**
   * Check if an actor can use the Force
   * @param {Actor} actor - The actor to check
   * @returns {boolean} True if the actor can use the Force
   */
  static canUseTheForce(actor) {
    // Droids can never use the Force
    if (actor.type === 'droid' || actor.system?.isDroid) {
      return false;
    }

    // Check for Force Sensitivity feat
    const hasForceSensitivityFeat = actor.items.some(i =>
      i.type === 'feat' && (
        i.name.toLowerCase().includes('force sensitivity') ||
        i.name.toLowerCase().includes('force sensitive')
      )
    );

    if (hasForceSensitivityFeat) {
      return true;
    }

    // Check for Force-sensitive class
    const hasForceSensitiveClass = actor.items.some(i =>
      i.type === 'class' && i.system?.forceSensitive === true
    );

    if (hasForceSensitiveClass) {
      return true;
    }

    // Check if Use the Force skill is trained (implies Force Sensitivity)
    const utfSkill = actor.system?.skills?.useTheForce;
    if (utfSkill?.trained) {
      return true;
    }

    return false;
  }

  /**
   * Filter a list of skill use applications for an actor
   * @param {Actor} actor - The actor
   * @param {Array} skillUses - Array of skill use applications
   * @returns {Array} Filtered array of skill uses the actor can access
   */
  static filterSkillUses(actor, skillUses) {
    if (!actor || !skillUses) {return [];}

    return skillUses.filter(skillUse => this.canAccessSkillUse(actor, skillUse));
  }

  /**
   * Get the appropriate skill key for a skill use application
   * @param {Object} skillUse - The skill use application
   * @returns {string} The skill key to use for rolling (e.g., 'useTheForce', 'mechanics')
   */
  static getSkillKeyForApplication(skillUse) {
    if (!skillUse || !skillUse.application) {return null;}

    const applicationName = skillUse.application;

    // Use the Force applications
    if (this.isUseTheForceApplication(applicationName)) {
      return 'useTheForce';
    }

    // Map other skill use applications to their skill keys
    const skillMap = {
      'climb': 'climb',
      'feint': 'deception',
      'deceptive': 'deception',
      'gather information': 'gatherInformation',
      'knowledge': 'knowledge',
      'jump': 'jump',
      'disable device': 'mechanics',
      'jury-rig': 'mechanics',
      'recharge shields': 'mechanics',
      'repair': 'mechanics',
      'modify droid': 'mechanics',
      'persuasion': 'persuasion',
      'haggle': 'persuasion',
      'bribery': 'persuasion',
      'intimidate': 'persuasion',
      'pilot': 'pilot',
      'increase vehicle speed': 'pilot',
      'avoid collision': 'pilot',
      'dogfight': 'pilot',
      'sneak': 'stealth',
      'conceal': 'stealth',
      'pick pocket': 'stealth',
      'snipe': 'stealth',
      'survival': 'survival',
      'track': 'survival',
      'first aid': 'treatInjury',
      'revivify': 'treatInjury',
      'heal damage': 'treatInjury',
      'long-term care': 'treatInjury',
      'access information': 'useComputer',
      'backtrail': 'useComputer',
      'astrogate': 'useComputer'
    };

    // Find matching skill
    const lowerAppName = applicationName.toLowerCase();
    for (const [key, skillKey] of Object.entries(skillMap)) {
      if (lowerAppName.includes(key)) {
        return skillKey;
      }
    }

    return null;
  }

  /**
   * Roll a skill check for a skill use application
   * @param {Actor} actor - The actor using the skill
   * @param {Object} skillUse - The skill use application
   * @param {Object} options - Additional options for the roll
   * @returns {Promise<Roll>} The resulting roll
   */
  static async rollSkillUseApplication(actor, skillUse, options = {}) {
    if (!actor || !skillUse) {
      ui.notifications.warn('Invalid actor or skill use application');
      return null;
    }

    // Check if actor can access this skill use
    if (!this.canAccessSkillUse(actor, skillUse)) {
      ui.notifications.warn(`${actor.name} cannot use this skill application`);
      return null;
    }

    // Get the appropriate skill
    const skillKey = this.getSkillKeyForApplication(skillUse);
    if (!skillKey) {
      ui.notifications.warn('Could not determine skill for this application');
      return null;
    }

    const skill = actor.system.skills?.[skillKey];
    if (!skill) {
      ui.notifications.warn(`Skill ${skillKey} not found on ${actor.name}`);
      return null;
    }

    // Check if skill 
    if (skillKey === 'useTheForce' && !skill.trained) {
      ui.notifications.warn('Use the Force  (Force Sensitivity feat)');
      return null;
    }

    // Calculate skill modifier
    const halfLevel = Math.floor((actor.system.level || 1) / 2);
    const abilityKey = skill.selectedAbility || 'cha';
    const abilityScore = actor.system.attributes[abilityKey]?.total || 10;
    const abilityMod = Math.floor((abilityScore - 10) / 2);

    let modifier = halfLevel + abilityMod;
    if (skill.trained) {modifier += 5;}
    if (skill.focused) {modifier += 5;}
    modifier += (skill.miscMod || 0);
    modifier += (actor.conditionPenalty || 0);

    // Add any situational modifiers from options
    if (options.situational) {modifier += options.situational;}

    // Create and evaluate the roll
    const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${modifier}`, actor.getRollData?.() ?? {}, { actor, domain: `skill-use.${skillKey}`, context: { useKey: skillUse?.key ?? skillUse?.id ?? null } });

    // Prepare flavor text
    const dc = skillUse.DC || 'varies';
    const actionTime = skillUse.time || 'varies';
    const effect = skillUse.effect || '';

    const flavor = `<div class="skill-use-application">
      <h3>${skillUse.application}</h3>
      <p><strong>DC:</strong> ${dc}</p>
      <p><strong>Time:</strong> ${actionTime}</p>
      <p><strong>Effect:</strong> ${effect}</p>
      <p><strong>Skill:</strong> ${this._getSkillLabel(skillKey)} (${modifier >= 0 ? '+' : ''}${modifier})</p>
    </div>`;

    // Send to chat through the shared SWSE chat surface.
    await SWSEChat.postRoll({
      roll,
      actor,
      flavor,
      context: {
        type: 'skill-use',
        skillKey,
        useKey: skillUse?.key ?? skillUse?.id ?? null,
        modifier
      }
    });

    return roll;
  }

  /**
   * Get a human-readable label for a skill key
   * @param {string} skillKey - The skill key
   * @returns {string} Human-readable skill label
   */
  static _getSkillLabel(skillKey) {
    const labels = {
      'useTheForce': 'Use the Force',
      'gatherInformation': 'Gather Information',
      'treatInjury': 'Treat Injury',
      'useComputer': 'Use Computer',
      'acrobatics': 'Acrobatics',
      'climb': 'Climb',
      'deception': 'Deception',
      'endurance': 'Endurance',
      'initiative': 'Initiative',
      'jump': 'Jump',
      'knowledge': 'Knowledge',
      'mechanics': 'Mechanics',
      'perception': 'Perception',
      'persuasion': 'Persuasion',
      'pilot': 'Pilot',
      'ride': 'Ride',
      'stealth': 'Stealth',
      'survival': 'Survival',
      'swim': 'Swim'
    };

    return labels[skillKey] || skillKey;
  }
}

// Make available globally
Hooks.once('init', () => {
  if (!game.swse) {game.swse = {};}
  if (!game.swse.utils) {game.swse.utils = {};}
  game.swse.utils.SkillUseFilter = SkillUseFilter;
});

SWSELogger.log('SWSE | Skill Use Filter utility loaded');

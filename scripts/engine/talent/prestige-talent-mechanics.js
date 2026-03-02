/**
 * Prestige Talent Mechanics
 * Implements complex game mechanics for Prestige Class talents and requirements:
 *
 * FORCE-BASED PRESTIGE CLASSES:
 * - Force Adept: Force sensitivity and Force talent usage
 * - Force Disciple: Advanced Force abilities
 * - Jedi Knight: Lightsaber mastery and Force balance
 * - Sith Apprentice: Dark Side progression and mastery
 *
 * COMBAT-BASED PRESTIGE CLASSES:
 * - Ace Pilot: Vehicle combat and piloting prowess
 * - Elite Trooper: Advanced military combat
 * - Gladiator: Melee combat mastery
 * - Gunslinger: Ranged weapon specialization
 * - Martial Arts Master: Unarmed and martial arts
 *
 * TACTICAL/LEADERSHIP PRESTIGE CLASSES:
 * - Officer: Military command and tactics
 * - Bounty Hunter: Tracking and pursuit
 * - Crime Lord: Criminal enterprise management
 * - Assassin: Silent elimination and subterfuge
 *
 * EVASION/STEALTH PRESTIGE CLASSES:
 * - Infiltrator: Stealth and infiltration
 * - Pathfinder: Survival and navigation
 * - Vanguard: Combined combat and stealth
 *
 * SPECIALIST PRESTIGE CLASSES:
 * - Charlatan: Deception and con artistry
 * - Droid Commander: Droid control and mastery
 * - Enforcer: Law enforcement and combat
 * - Gunner: Vehicle weaponry mastery
 * - Master Privateer: Space piracy and smuggling
 * - Outlaw: Criminal operations
 *
 * OTHER PRESTIGE CLASSES:
 * - Corporate Agent: Business and intrigue
 * - Improviser: Creative solutions
 * - Medic: Healing and support
 * - Military Engineer: Technical military expertise
 * - Saboteur: Technical sabotage and hacking
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class PrestigeTalentMechanics {

  // ============================================================================
  // FORCE ADEPT - Force talent requirement checker
  // ============================================================================

  /**
   * Check if actor meets Force Adept requirements: 3 Force talents
   */
  static hasForceAdeptTalents(actor) {
    if (!actor?.items) {return false;}

    const forceTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Force' ||
       item.system?.talent_tree === 'Force')
    );

    return forceTalents.length >= 3;
  }

  /**
   * Get count of Force talents actor has
   */
  static getForceTalentCount(actor) {
    if (!actor?.items) {return 0;}

    return actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Force' ||
       item.system?.talent_tree === 'Force')
    ).length;
  }

  // ============================================================================
  // FORCE DISCIPLE - Advanced Force talent requirements
  // ============================================================================

  /**
   * Check if actor meets Force Disciple requirements:
   * 2 talents from Dark Side Devotee, Force Adept, or Force Item trees
   */
  static hasForceDiscipleRequiredTalents(actor) {
    if (!actor?.items) {return false;}

    const disccipleTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Dark Side Devotee' ||
       item.system?.tree === 'Force Adept' ||
       item.system?.tree === 'Force Item' ||
       item.system?.talent_tree === 'Dark Side Devotee' ||
       item.system?.talent_tree === 'Force Adept' ||
       item.system?.talent_tree === 'Force Item')
    );

    return disccipleTalents.length >= 2;
  }

  // ============================================================================
  // BOUNTY HUNTER - 2 Awareness talents
  // ============================================================================

  /**
   * Check if actor meets Bounty Hunter requirements: 2 Awareness talents
   */
  static hasBountyHunterTalents(actor) {
    if (!actor?.items) {return false;}

    const awarenessTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Awareness' ||
       item.system?.talent_tree === 'Awareness')
    );

    return awarenessTalents.length >= 2;
  }

  /**
   * Get count of Awareness talents
   */
  static getAwarenessTalentCount(actor) {
    if (!actor?.items) {return 0;}

    return actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Awareness' ||
       item.system?.talent_tree === 'Awareness')
    ).length;
  }

  // ============================================================================
  // CRIME LORD - 1 talent from Fortune/Lineage/Misfortune
  // ============================================================================

  /**
   * Check if actor meets Crime Lord requirements
   */
  static hasCrimeLordTalents(actor) {
    if (!actor?.items) {return false;}

    const crimeTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Fortune' ||
       item.system?.tree === 'Lineage' ||
       item.system?.tree === 'Misfortune' ||
       item.system?.talent_tree === 'Fortune' ||
       item.system?.talent_tree === 'Lineage' ||
       item.system?.talent_tree === 'Misfortune')
    );

    return crimeTalents.length >= 1;
  }

  // ============================================================================
  // ELITE TROOPER - 1 talent from each of 4 trees
  // ============================================================================

  /**
   * Check if actor meets Elite Trooper requirements:
   * 1 talent from Armor Specialist, Commando, Mercenary, and Weapon Specialist
   */
  static hasEliteTrooperTalents(actor) {
    if (!actor?.items) {return false;}

    const trees = ['Armor Specialist', 'Commando', 'Mercenary', 'Weapon Specialist'];

    for (const tree of trees) {
      const hasTalentFromTree = actor.items.some(item =>
        item.type === 'talent' &&
        (item.system?.tree === tree || item.system?.talent_tree === tree)
      );

      if (!hasTalentFromTree) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get breakdown of Elite Trooper talent coverage
   */
  static getEliteTrooperTalentStatus(actor) {
    if (!actor?.items) {return [];}

    const trees = ['Armor Specialist', 'Commando', 'Mercenary', 'Weapon Specialist'];
    const status = {};

    for (const tree of trees) {
      status[tree] = actor.items.some(item =>
        item.type === 'talent' &&
        (item.system?.tree === tree || item.system?.talent_tree === tree)
      );
    }

    return status;
  }

  // ============================================================================
  // OFFICER - 1 talent from each of 3 different trees (Leadership, Commando, Veteran)
  // ============================================================================

  /**
   * Check if actor meets Officer requirements
   */
  static hasOfficerTalents(actor) {
    if (!actor?.items) {return false;}

    const trees = ['Leadership', 'Commando', 'Veteran'];

    for (const tree of trees) {
      const hasTalentFromTree = actor.items.some(item =>
        item.type === 'talent' &&
        (item.system?.tree === tree || item.system?.talent_tree === tree)
      );

      if (!hasTalentFromTree) {
        return false;
      }
    }

    return true;
  }

  // ============================================================================
  // INFILTRATOR - 2 talents from Camouflage and/or Spy trees
  // ============================================================================

  /**
   * Check if actor meets Infiltrator requirements
   */
  static hasInfiltratorTalents(actor) {
    if (!actor?.items) {return false;}

    const infiltratorTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Camouflage' ||
       item.system?.tree === 'Spy' ||
       item.system?.talent_tree === 'Camouflage' ||
       item.system?.talent_tree === 'Spy')
    );

    return infiltratorTalents.length >= 2;
  }

  // ============================================================================
  // MASTER PRIVATEER - 2 talents from Misfortune/Smuggling/Spacer (from 3 trees)
  // ============================================================================

  /**
   * Check if actor meets Master Privateer requirements
   */
  static hasMasterPrivateerTalents(actor) {
    if (!actor?.items) {return false;}

    const privateerTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Misfortune' ||
       item.system?.tree === 'Smuggling' ||
       item.system?.tree === 'Spacer' ||
       item.system?.talent_tree === 'Misfortune' ||
       item.system?.talent_tree === 'Smuggling' ||
       item.system?.talent_tree === 'Spacer')
    );

    return privateerTalents.length >= 2;
  }

  // ============================================================================
  // ASSASSIN - Requires Dastardly Strike talent
  // ============================================================================

  /**
   * Check if actor has Dastardly Strike talent (Assassin requirement)
   */
  static hasDastardlyStrike(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dastardly Strike'
    );
  }

  // ============================================================================
  // CHARLATAN - 1 talent from Disgrace/Influence/Lineage
  // ============================================================================

  /**
   * Check if actor meets Charlatan requirements
   */
  static hasCharlatanTalents(actor) {
    if (!actor?.items) {return false;}

    const charlatanTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Disgrace' ||
       item.system?.tree === 'Influence' ||
       item.system?.tree === 'Lineage' ||
       item.system?.talent_tree === 'Disgrace' ||
       item.system?.talent_tree === 'Influence' ||
       item.system?.talent_tree === 'Lineage')
    );

    return charlatanTalents.length >= 1;
  }

  // ============================================================================
  // OUTLAW - 1 talent from Disgrace/Misfortune
  // ============================================================================

  /**
   * Check if actor meets Outlaw requirements
   */
  static hasOutlawTalents(actor) {
    if (!actor?.items) {return false;}

    const outlawTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Disgrace' ||
       item.system?.tree === 'Misfortune' ||
       item.system?.talent_tree === 'Disgrace' ||
       item.system?.talent_tree === 'Misfortune')
    );

    return outlawTalents.length >= 1;
  }

  // ============================================================================
  // DROID COMMANDER - 1 talent from Leadership/Commando
  // ============================================================================

  /**
   * Check if actor meets Droid Commander requirements
   */
  static hasDroidCommanderTalents(actor) {
    if (!actor?.items) {return false;}

    const commanderTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Leadership' ||
       item.system?.tree === 'Commando' ||
       item.system?.talent_tree === 'Leadership' ||
       item.system?.talent_tree === 'Commando')
    );

    return commanderTalents.length >= 1;
  }

  // ============================================================================
  // VANGUARD - 2 talents from Camouflage/Commando
  // ============================================================================

  /**
   * Check if actor meets Vanguard requirements
   */
  static hasVanguardTalents(actor) {
    if (!actor?.items) {return false;}

    const vanguardTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Camouflage' ||
       item.system?.tree === 'Commando' ||
       item.system?.talent_tree === 'Camouflage' ||
       item.system?.talent_tree === 'Commando')
    );

    return vanguardTalents.length >= 2;
  }

  // ============================================================================
  // PATHFINDER - 2 talents from Awareness/Camouflage/Survivor (from 3 trees)
  // ============================================================================

  /**
   * Check if actor meets Pathfinder requirements
   */
  static hasPathfinderTalents(actor) {
    if (!actor?.items) {return false;}

    const pathfinderTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Awareness' ||
       item.system?.tree === 'Camouflage' ||
       item.system?.tree === 'Survivor' ||
       item.system?.talent_tree === 'Awareness' ||
       item.system?.talent_tree === 'Camouflage' ||
       item.system?.talent_tree === 'Survivor')
    );

    return pathfinderTalents.length >= 2;
  }

  // ============================================================================
  // MARTIAL ARTS MASTER - 1 talent from Brawler/Survivor
  // ============================================================================

  /**
   * Check if actor meets Martial Arts Master requirements
   */
  static hasMartialArtsMasterTalents(actor) {
    if (!actor?.items) {return false;}

    const martialTalents = actor.items.filter(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Brawler' ||
       item.system?.tree === 'Survivor' ||
       item.system?.talent_tree === 'Brawler' ||
       item.system?.talent_tree === 'Survivor')
    );

    return martialTalents.length >= 1;
  }

  // ============================================================================
  // ENFORCER - 1 Survivor talent
  // ============================================================================

  /**
   * Check if actor meets Enforcer requirements
   */
  static hasEnforcerTalents(actor) {
    if (!actor?.items) {return false;}

    return actor.items.some(item =>
      item.type === 'talent' &&
      (item.system?.tree === 'Survivor' ||
       item.system?.talent_tree === 'Survivor')
    );
  }

  // ============================================================================
  // PRESTIGE CLASS ADVANCEMENT CHECK
  // ============================================================================

  /**
   * Get summary of all prestige class talent requirements for an actor
   * Returns object with prestige class name -> boolean of met requirements
   */
  static getPrestigeClassRequirementSummary(actor) {
    const requirements = {
      'Ace Pilot': true, // No talent requirements
      'Assassin': this.hasDastardlyStrike(actor),
      'Bounty Hunter': this.hasBountyHunterTalents(actor),
      'Charlatan': this.hasCharlatanTalents(actor),
      'Corporate Agent': true, // No talent requirements
      'Crime Lord': this.hasCrimeLordTalents(actor),
      'Droid Commander': this.hasDroidCommanderTalents(actor),
      'Elite Trooper': this.hasEliteTrooperTalents(actor),
      'Enforcer': this.hasEnforcerTalents(actor),
      'Force Adept': this.hasForceAdeptTalents(actor),
      'Force Disciple': this.hasForceDiscipleRequiredTalents(actor),
      'Gladiator': true, // No talent requirements
      'Gunslinger': true, // No talent requirements
      'Imperial Knight': true, // No talent requirements
      'Improviser': true, // No talent requirements
      'Independent Droid': true, // No talent requirements
      'Infiltrator': this.hasInfiltratorTalents(actor),
      'Jedi Knight': true, // No talent requirements
      'Jedi Master': true, // No talent requirements
      'Martial Arts Master': this.hasMartialArtsMasterTalents(actor),
      'Master Privateer': this.hasMasterPrivateerTalents(actor),
      'Medic': true, // No talent requirements
      'Military Engineer': true, // No talent requirements
      'Melee Duelist': true, // No talent requirements
      'Officer': this.hasOfficerTalents(actor),
      'Outlaw': this.hasOutlawTalents(actor),
      'Pathfinder': this.hasPathfinderTalents(actor),
      'Saboteur': true, // No talent requirements
      'Shaper': true, // No talent requirements
      'Sith Apprentice': true, // No talent requirements
      'Sith Lord': true, // No talent requirements
      'Vanguard': this.hasVanguardTalents(actor)
    };

    return requirements;
  }

  /**
   * Check if actor meets talent requirements for specific prestige class
   */
  static meetsPrestigeClassTalentRequirements(actor, prestigeClassName) {
    const requirements = this.getPrestigeClassRequirementSummary(actor);
    return requirements[prestigeClassName] || false;
  }

  /**
   * Get list of prestige classes actor is eligible for based on talents
   */
  static getEligiblePrestigeClasses(actor) {
    const requirements = this.getPrestigeClassRequirementSummary(actor);
    return Object.keys(requirements).filter(className => requirements[className]);
  }

  /**
   * Get detailed breakdown of prestige class requirements (for UI display)
   */
  static getPrestigeClassRequirementDetails(actor, prestigeClassName) {
    const details = {
      met: false,
      talentsNeeded: [],
      talentsHave: []
    };

    switch (prestigeClassName) {
      case 'Bounty Hunter':
        details.talentsNeeded = ['Awareness (2 talents)'];
        details.talentsHave = [`${this.getAwarenessTalentCount(actor)}/2 Awareness talents`];
        details.met = this.hasBountyHunterTalents(actor);
        break;

      case 'Crime Lord':
        details.talentsNeeded = ['Fortune, Lineage, or Misfortune (1 talent)'];
        details.talentsHave = actor.items
          ?.filter(item => item.type === 'talent' && ['Fortune', 'Lineage', 'Misfortune'].includes(item.system?.tree))
          ?.map(item => item.name) || [];
        details.met = this.hasCrimeLordTalents(actor);
        break;

      case 'Elite Trooper':
        details.talentsNeeded = [
          'Armor Specialist (1)',
          'Commando (1)',
          'Mercenary (1)',
          'Weapon Specialist (1)'
        ];
        const trooperStatus = this.getEliteTrooperTalentStatus(actor);
        details.talentsHave = Object.entries(trooperStatus).map(([tree, has]) => `${tree}: ${has ? '✓' : '✗'}`);
        details.met = this.hasEliteTrooperTalents(actor);
        break;

      case 'Force Adept':
        details.talentsNeeded = ['Force (3 talents)'];
        details.talentsHave = [`${this.getForceTalentCount(actor)}/3 Force talents`];
        details.met = this.hasForceAdeptTalents(actor);
        break;

      case 'Force Disciple':
        details.talentsNeeded = ['Dark Side Devotee, Force Adept, or Force Item (2 talents)'];
        const discpleTalents = actor.items
          ?.filter(item => item.type === 'talent' && ['Dark Side Devotee', 'Force Adept', 'Force Item'].includes(item.system?.tree))
          ?.map(item => item.name) || [];
        details.talentsHave = [`${discpleTalents.length}/2 required talents`, ...discpleTalents];
        details.met = this.hasForceDiscipleRequiredTalents(actor);
        break;

      case 'Officer':
        details.talentsNeeded = [
          'Leadership (1)',
          'Commando (1)',
          'Veteran (1)'
        ];
        details.talentsHave = actor.items
          ?.filter(item => item.type === 'talent' && ['Leadership', 'Commando', 'Veteran'].includes(item.system?.tree))
          ?.map(item => `${item.system?.tree}: ${item.name}`) || [];
        details.met = this.hasOfficerTalents(actor);
        break;

      case 'Infiltrator':
        details.talentsNeeded = ['Camouflage or Spy (2 talents)'];
        const infiltTalents = actor.items
          ?.filter(item => item.type === 'talent' && ['Camouflage', 'Spy'].includes(item.system?.tree))
          ?.map(item => item.name) || [];
        details.talentsHave = [`${infiltTalents.length}/2 required talents`, ...infiltTalents];
        details.met = this.hasInfiltratorTalents(actor);
        break;

      case 'Pathfinder':
        details.talentsNeeded = [
          'Awareness, Camouflage, or Survivor (2 talents)'
        ];
        const pathTalents = actor.items
          ?.filter(item => item.type === 'talent' && ['Awareness', 'Camouflage', 'Survivor'].includes(item.system?.tree))
          ?.map(item => item.name) || [];
        details.talentsHave = [`${pathTalents.length}/2 required talents`, ...pathTalents];
        details.met = this.hasPathfinderTalents(actor);
        break;

      case 'Master Privateer':
        details.talentsNeeded = [
          'Misfortune, Smuggling, or Spacer (2 talents)'
        ];
        const privateerTalents = actor.items
          ?.filter(item => item.type === 'talent' && ['Misfortune', 'Smuggling', 'Spacer'].includes(item.system?.tree))
          ?.map(item => item.name) || [];
        details.talentsHave = [`${privateerTalents.length}/2 required talents`, ...privateerTalents];
        details.met = this.hasMasterPrivateerTalents(actor);
        break;

      case 'Assassin':
        details.talentsNeeded = ['Dastardly Strike (mandatory)'];
        if (this.hasDastardlyStrike(actor)) {
          details.talentsHave = ['✓ Dastardly Strike'];
        } else {
          details.talentsHave = ['✗ Dastardly Strike'];
        }
        details.met = this.hasDastardlyStrike(actor);
        break;

      case 'Vanguard':
        details.talentsNeeded = ['Camouflage or Commando (2 talents)'];
        const vanguardTalents = actor.items
          ?.filter(item => item.type === 'talent' && ['Camouflage', 'Commando'].includes(item.system?.tree))
          ?.map(item => item.name) || [];
        details.talentsHave = [`${vanguardTalents.length}/2 required talents`, ...vanguardTalents];
        details.met = this.hasVanguardTalents(actor);
        break;

      case 'Martial Arts Master':
        details.talentsNeeded = ['Brawler or Survivor (1 talent)'];
        const martialTalents = actor.items
          ?.filter(item => item.type === 'talent' && ['Brawler', 'Survivor'].includes(item.system?.tree))
          ?.map(item => item.name) || [];
        details.talentsHave = martialTalents.length > 0 ? martialTalents : ['✗ None'];
        details.met = this.hasMartialArtsMasterTalents(actor);
        break;

      default:
        details.talentsNeeded = ['No talent requirements'];
        details.met = true;
    }

    return details;
  }
}

export default PrestigeTalentMechanics;

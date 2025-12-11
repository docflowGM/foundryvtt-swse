/**
 * Houserules Reference Data
 * Embedded combat actions, force powers, and conditions for houserule configuration
 */

export const HouserulesData = {
  
  // Combat Actions
  combatActions: {
    feint: {
      id: "combat-actions-feint",
      name: "Feint",
      description: "Make a Deception check vs opponent's Will Defense to make them flat-footed",
      standardSkill: "deception",
      alternateSkill: "persuasion"
    },
    secondWind: {
      id: "combat-actions-second-wind",
      name: "Second Wind",
      description: "Spend a standard action to regain HP and potentially improve condition track",
      action: "standard",
      usesPerDay: "once"
    },
    aim: {
      id: "combat-actions-aim",
      name: "Aim",
      description: "Gain bonus to next attack, ignore cover",
      action: "standard"
    },
    charge: {
      id: "combat-actions-charge",
      name: "Charge",
      description: "Move and attack with bonus",
      action: "full-round"
    }
  },
  
  // Force-related data
  force: {
    talents: {
      block: {
        id: "talent-block",
        name: "Block",
        description: "Deflect melee attacks with lightsaber",
        prereq: "Force Sensitive"
      },
      deflect: {
        id: "talent-deflect",
        name: "Deflect",
        description: "Deflect ranged attacks with lightsaber",
        prereq: "Force Sensitive"
      },
      blockDeflectCombined: {
        id: "talent-block-deflect-combined",
        name: "Block & Deflect",
        description: "Combined talent: Deflect both melee and ranged attacks with lightsaber",
        prereq: "Force Sensitive"
      }
    },
    attributes: {
      wisdom: {
        name: "Wisdom",
        abbreviation: "WIS",
        description: "Standard Force Training attribute"
      },
      charisma: {
        name: "Charisma",
        abbreviation: "CHA",
        description: "Alternate Force Training attribute"
      }
    },
    feats: {
      forceSensitive: {
        id: "feat-force-sensitive",
        name: "Force Sensitive",
        description: "Grants access to Force powers and Use the Force skill",
        restriction: {
          standard: "any",
          restricted: "jedi-only"
        }
      }
    }
  },
  
  // Combat Conditions
  combatConditions: {
    concealment: {
      id: "special-combat-condition-concealment",
      name: "Concealment",
      missChance: 20,
      description: "Target has concealment from fog, darkness, etc."
    },
    totalConcealment: {
      id: "special-combat-condition-total-concealment",
      name: "Total Concealment",
      missChance: 50,
      description: "Target has total concealment"
    },
    cover: {
      id: "special-combat-condition-cover-5",
      name: "Cover",
      bonus: 5,
      defense: "Reflex",
      description: "+5 to Reflex Defense"
    },
    improvedCover: {
      id: "special-combat-condition-improved-cover-10",
      name: "Improved Cover",
      bonus: 10,
      defense: "Reflex",
      description: "+10 to Reflex Defense"
    },
    flanking: {
      id: "special-combat-condition-flanking-2",
      name: "Flanking",
      bonus: 2,
      description: "+2 to attack rolls when flanking"
    },
    suppression: {
      id: "special-combat-condition-suppressive-fire",
      name: "Suppressive Fire",
      description: "Area denial with automatic weapons"
    }
  },
  
  // Skill Uses
  skillUses: {
    feint: {
      standard: {
        id: "extraskilluses-feint-standard",
        name: "Feint (standard)",
        action: "standard",
        skill: "deception",
        dc: "opposed",
        opposedBy: "Will Defense",
        description: "Make opponent flat-footed against your next attack"
      },
      group: {
        id: "extraskilluses-group-feint-full-round",
        name: "Group Feint (full-round)",
        action: "full-round",
        skill: "deception",
        dc: "opposed",
        description: "Make multiple opponents flat-footed"
      }
    },
    persuasion: {
      changeAttitude: {
        id: "extraskilluses-persuasion-change-attitude-full-round",
        name: "Persuasion (change attitude)",
        action: "full-round",
        skill: "persuasion",
        description: "Change target's attitude"
      }
    }
  },
  
  // Feats
  feats: {
    weaponFinesse: {
      id: "feat-weapon-finesse",
      name: "Weapon Finesse",
      description: "Use DEX instead of STR for melee attack rolls with light weapons",
      benefit: "Use DEX modifier for attack rolls with light melee weapons"
    },
    skillFocus: {
      id: "feat-skill-focus",
      name: "Skill Focus",
      description: "Gain bonus to a specific skill",
      variants: {
        normal: {
          bonus: 5,
          description: "+5 bonus to chosen skill"
        },
        scaled: {
          formula: "Math.floor(level / 2)",
          max: 5,
          description: "+1 per 2 levels (max +5 at level 10)"
        },
        delayed: {
          bonus: 5,
          activationLevel: 7,
          description: "+5 bonus starting at specified level"
        }
      }
    }
  },
  
  // Space Combat Roles
  spaceCombat: {
    roles: {
      pilot: {
        id: "role-pilot",
        name: "Pilot",
        description: "Controls ship movement and maneuvers",
        primarySkill: "pilot",
        defaultPriority: 1
      },
      shields: {
        id: "role-shields",
        name: "Shield Operator",
        description: "Manages defensive systems",
        primarySkill: "mechanics",
        defaultPriority: 2
      },
      weapons: {
        id: "role-weapons",
        name: "Weapons Operator",
        description: "Fires ship weapons",
        primarySkill: "gunnery",
        defaultPriority: 3
      },
      engineering: {
        id: "role-engineering",
        name: "Engineer",
        description: "Repairs and maintains systems",
        primarySkill: "mechanics",
        defaultPriority: 4
      },
      other: {
        id: "role-other",
        name: "Other Crew",
        description: "All other crew members",
        defaultPriority: 5
      }
    }
  }
};

/**
 * Get feint skill based on houserule setting
 */
export function getFeintSkill() {
  const setting = game.settings.get('foundryvtt-swse', 'feintSkill');
  return setting === 'persuasion' ? 'persuasion' : 'deception';
}

/**
 * Get Skill Focus bonus based on variant and level
 */
export function getSkillFocusBonus(level) {
  const variant = game.settings.get('foundryvtt-swse', 'skillFocusVariant');
  
  switch (variant) {
    case 'scaled':
      return Math.min(5, Math.floor(level / 2));
    case 'delayed':
      const activationLevel = game.settings.get('foundryvtt-swse', 'skillFocusActivationLevel') || 7;
      return level >= activationLevel ? 5 : 0;
    case 'normal':
    default:
      return 5;
  }
}

/**
 * Check if Force Sensitive is restricted
 */
export function canTakeForceSensitive(actor) {
  const restricted = game.settings.get('foundryvtt-swse', 'forceSensitiveJediOnly');
  
  if (!restricted) return true;
  
  // Check if actor has any Jedi classes
  const jediClasses = ['jedi', 'jedi knight', 'jedi master', 'jedi consular', 'jedi guardian', 'jedi sentinel'];
  const actorClasses = actor.items.filter(i => i.type === 'class').map(c => c.name.toLowerCase());
  
  return actorClasses.some(c => jediClasses.includes(c));
}

/**
 * Get Force Training attribute
 */
export function getForceTrainingAttribute() {
  const setting = game.settings.get('foundryvtt-swse', 'forceTrainingAttribute');
  return setting === 'charisma' ? 'cha' : 'wis';
}

/**
 * Check if Block and Deflect are combined
 */
export function hasBlockDeflectCombined() {
  return game.settings.get('foundryvtt-swse', 'blockDeflectTalents') === 'combined';
}

/**
 * Check if character has default Weapon Finesse
 */
export function hasDefaultWeaponFinesse() {
  return game.settings.get('foundryvtt-swse', 'weaponFinesseDefault');
}

/**
 * Get space combat role priority order
 */
export function getRolePriorityOrder() {
  return game.settings.get('foundryvtt-swse', 'initiativeRolePriority') || 
    ['pilot', 'shields', 'weapons', 'engineering', 'other'];
}

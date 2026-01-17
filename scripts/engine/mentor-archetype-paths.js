/**
 * Mentor Archetype Paths
 * Class-specific character progression archetypes
 *
 * Each archetype defines:
 * - Display name and description
 * - Role bias multipliers (affects suggestion engine)
 * - Focus attributes and skills
 * - Talent keyword indicators
 * - Canonical warning (mentor philosophy)
 */

export const ARCHETYPE_PATHS = {
  "Jedi": {
    "guardian": {
      displayName: "Jedi Guardian",
      description: "Frontline protector who endures and controls space.",
      roleBias: { guardian: 1.2 },
      focusAttributes: ["con", "wis"],
      focusSkills: ["useTheForce"],
      talentKeywords: ["Defense", "Block", "Deflect"],
      warning: "Guardians who ignore threat generation and positioning fail their allies.",
      philosophyStatement: "Endure so others do not fall.",
      mentorQuote: "A Guardian stands between darkness and those who cannot defend themselves."
    },

    "consular": {
      displayName: "Jedi Consular",
      description: "Force-focused specialist emphasizing control and mastery.",
      roleBias: { controller: 1.3 },
      focusAttributes: ["wis"],
      focusSkills: ["useTheForce", "knowledge"],
      talentKeywords: ["Force", "Control", "Meditation"],
      warning: "Consulars who neglect survivability collapse under pressure.",
      philosophyStatement: "Mastery before action.",
      mentorQuote: "The Force flows through all things. Master that flow, and you master the battlefield."
    },

    "sentinel": {
      displayName: "Jedi Sentinel",
      description: "Balanced operative blending combat skill, awareness, and versatility.",
      roleBias: { guardian: 1.1, striker: 1.1 },
      focusAttributes: ["dex", "wis"],
      focusSkills: ["perception", "stealth", "useTheForce"],
      talentKeywords: ["Awareness", "Mobility", "Precision"],
      warning: "Sentinels who lack focus risk becoming unfocused generalists.",
      philosophyStatement: "Awareness is survival.",
      mentorQuote: "A Sentinel sees the full board and adapts. Do not mistake balance for indecision."
    },

    "duelist": {
      displayName: "Jedi Duelist",
      description: "Precision combatant who ends threats decisively in single combat.",
      roleBias: { striker: 1.4 },
      focusAttributes: ["dex", "str"],
      focusSkills: ["useTheForce", "acrobatics"],
      talentKeywords: ["Lightsaber", "Riposte", "Precision"],
      warning: "Duelists who overextend fall quickly when isolated.",
      philosophyStatement: "Precision is temptation's first test.",
      mentorQuote: "One strike, perfectly placed, is worth a hundred desperate blows."
    },

    "healer": {
      displayName: "Jedi Healer",
      description: "Support-focused Force user dedicated to preservation and recovery.",
      roleBias: { controller: 1.2 },
      focusAttributes: ["wis", "cha"],
      focusSkills: ["useTheForce", "treatInjury"],
      talentKeywords: ["Healing", "Vitality", "Preservation"],
      warning: "Healers who neglect positioning are removed early from combat.",
      philosophyStatement: "Preservation is the hardest discipline.",
      mentorQuote: "The greatest power is not in taking life, but in preserving it."
    }
  },

  "Scout": {
    "tracker": {
      displayName: "Scout Tracker",
      description: "Pursuit specialist who hunts across terrain and finds prey.",
      roleBias: { striker: 1.2 },
      focusAttributes: ["str", "dex", "wis"],
      focusSkills: ["survival", "perception"],
      talentKeywords: ["Tracking", "Endurance"],
      warning: "Trackers who lose patience lose their prey.",
      philosophyStatement: "The hunt requires time and discipline.",
      mentorQuote: "Speed wins races. Patience wins wars."
    },

    "infiltrator": {
      displayName: "Scout Infiltrator",
      description: "Stealth operative who moves unseen through hostile territory.",
      roleBias: { controller: 1.2 },
      focusAttributes: ["dex", "int"],
      focusSkills: ["stealth", "deception"],
      talentKeywords: ["Stealth", "Deception", "Infiltration"],
      warning: "Infiltrators discovered are infiltrators captured.",
      philosophyStatement: "Move like shadow. Strike like shadow.",
      mentorQuote: "The best mission is the one no one ever knows happened."
    },

    "striker": {
      displayName: "Scout Striker",
      description: "Swift offense combatant who hits hard and vanishes.",
      roleBias: { striker: 1.5 },
      focusAttributes: ["dex", "str"],
      focusSkills: ["acrobatics", "initiative"],
      talentKeywords: ["Mobility", "PowerAttack"],
      warning: "Strikers who cannot escape are strikers who die.",
      philosophyStatement: "Hit hard. Leave faster.",
      mentorQuote: "Superior firepower means nothing if you're never there when they shoot back."
    }
  },

  "Scoundrel": {
    "charmer": {
      displayName: "Scoundrel Charmer",
      description: "Persuasion specialist who talks their way out of (and into) anything.",
      roleBias: { controller: 1.3 },
      focusAttributes: ["cha", "int"],
      focusSkills: ["persuasion", "deception", "gatherInformation"],
      talentKeywords: ["Persuasion", "Charm"],
      warning: "Charmers who run out of words run out of options.",
      philosophyStatement: "Every problem can be solved with the right words.",
      mentorQuote: "You can make 100 credits with a blaster, or 10,000 with a smile."
    },

    "gambler": {
      displayName: "Scoundrel Gambler",
      description: "Risk-taker who makes luck and reads probability better than most.",
      roleBias: { striker: 1.2 },
      focusAttributes: ["cha", "wis"],
      focusSkills: ["deception", "gatherInformation"],
      talentKeywords: ["Risk", "Luck"],
      warning: "Gamblers who play the odds always lose eventually.",
      philosophyStatement: "The house edge can be beaten, but rarely.",
      mentorQuote: "If you're not prepared to lose it all, you have no business at the table."
    },

    "thief": {
      displayName: "Scoundrel Thief",
      description: "Precision specialist who takes what's not theirs with surgical precision.",
      roleBias: { striker: 1.3 },
      focusAttributes: ["dex", "int"],
      focusSkills: ["stealth", "mechanics"],
      talentKeywords: ["Stealth", "Thievery", "Precision"],
      warning: "Thieves caught are thieves hanged.",
      philosophyStatement: "Every lock has a solution. Every system has a flaw.",
      mentorQuote: "The best heist is one where the mark never knows they've been robbed."
    }
  },

  "Soldier": {
    "commando": {
      displayName: "Soldier Commando",
      description: "Squad-focused combatant who coordinates firepower and tactics.",
      roleBias: { guardian: 1.2, controller: 1.2 },
      focusAttributes: ["str", "cha"],
      focusSkills: ["perception", "initiative"],
      talentKeywords: ["Leadership", "Tactics"],
      warning: "Commandos who lose their squad lose their edge.",
      philosophyStatement: "Victory is a team operation.",
      mentorQuote: "A lone soldier is a dead soldier. Never forget that."
    },

    "gunner": {
      displayName: "Soldier Gunner",
      description: "Ranged specialist who maximizes firepower through technique and positioning.",
      roleBias: { striker: 1.4 },
      focusAttributes: ["dex", "str"],
      focusSkills: ["pilot", "perception"],
      talentKeywords: ["Ranged", "Precision", "PowerAttack"],
      warning: "Gunners caught in close quarters are gunners who die.",
      philosophyStatement: "Distance is safety. Distance is victory.",
      mentorQuote: "Keep enemies at range. Problems that can't reach you can't hurt you."
    },

    "guardian": {
      displayName: "Soldier Guardian",
      description: "Defensive specialist who holds ground and protects others through positioning.",
      roleBias: { guardian: 1.3 },
      focusAttributes: ["con", "str"],
      focusSkills: ["endurance"],
      talentKeywords: ["Defense", "Block", "Protection"],
      warning: "Guardians who move lose their defensive advantage.",
      philosophyStatement: "A strong line holds forever.",
      mentorQuote: "Hold this position. Whatever comes, you don't move. They move, or they fall."
    }
  },

  "Noble": {
    "diplomat": {
      displayName: "Noble Diplomat",
      description: "Negotiator who builds alliances and navigates politics.",
      roleBias: { controller: 1.2 },
      focusAttributes: ["cha", "int"],
      focusSkills: ["persuasion", "gatherInformation", "knowledge"],
      talentKeywords: ["Persuasion", "Diplomacy"],
      warning: "Diplomats without allies have no power.",
      philosophyStatement: "A deal that benefits both sides lasts forever.",
      mentorQuote: "Never resort to violence when words can win the day."
    },

    "leader": {
      displayName: "Noble Leader",
      description: "Authority figure who commands through presence and decisiveness.",
      roleBias: { controller: 1.3 },
      focusAttributes: ["cha", "wis"],
      focusSkills: ["persuasion", "knowledge"],
      talentKeywords: ["Leadership", "Presence"],
      warning: "Leaders who hesitate lose their followers.",
      philosophyStatement: "Authority without conviction is merely authority.",
      mentorQuote: "Your people follow you because you make the hard choices they cannot."
    },

    "scoundrel": {
      displayName: "Noble Scoundrel",
      description: "Ambitious schemer who plays politics for personal advantage.",
      roleBias: { controller: 1.2 },
      focusAttributes: ["cha", "int"],
      focusSkills: ["deception", "gatherInformation"],
      talentKeywords: ["Deception", "Intrigue"],
      warning: "Scoundrels who get caught lose everything.",
      philosophyStatement: "Power comes to those willing to take it.",
      mentorQuote: "The throne belongs to those bold enough to sit in it."
    }
  }
};

/**
 * Get archetype paths for a given class
 * @param {string} className - The class name (e.g., "Jedi", "Scout")
 * @returns {object} Archetype definitions for that class
 */
export function getArchetypePaths(className) {
  return ARCHETYPE_PATHS[className] || {};
}

/**
 * Get a specific archetype
 * @param {string} className - The class name
 * @param {string} archetypeName - The archetype key
 * @returns {object} The archetype definition
 */
export function getArchetype(className, archetypeName) {
  const paths = getArchetypePaths(className);
  return paths[archetypeName] || null;
}

/**
 * Analyze synergies between actor state and an archetype
 * @param {Actor} actor - The actor
 * @param {object} archetype - The archetype definition
 * @returns {object} { strong: [...], weak: [...] }
 */
export function analyzeSynergies(actor, archetype) {
  if (!actor || !archetype) {
    return { strong: [], weak: [] };
  }

  const synergies = { strong: [], weak: [] };

  // Attribute synergies
  const attributes = actor.system.attributes || {};
  for (const attr of archetype.focusAttributes || []) {
    const value = attributes[attr]?.base || 10;
    if (value >= 14) {
      synergies.strong.push(`${attr.toUpperCase()} (${value}) supports this path`);
    } else if (value < 12) {
      synergies.weak.push(`${attr.toUpperCase()} (${value}) is underdeveloped for this path`);
    }
  }

  // Skill synergies
  const skills = actor.system.skills || {};
  for (const skillKey of archetype.focusSkills || []) {
    const skill = skills[skillKey];
    if (skill && skill.trained) {
      synergies.strong.push(`${skill.name || skillKey} reinforces your approach`);
    } else if (skill) {
      synergies.weak.push(`${skill.name || skillKey} is not yet trained`);
    }
  }

  // Talent synergies
  const talents = actor.items
    .filter(i => i.type === 'talent')
    .map(t => t.name);

  for (const talent of talents) {
    for (const keyword of archetype.talentKeywords || []) {
      if (talent.includes(keyword)) {
        synergies.strong.push(`${talent} aligns with this archetype`);
        break;
      }
    }
  }

  return synergies;
}

/**
 * Generate attribute recommendations for an archetype
 * @param {object} archetype - The archetype definition
 * @returns {string[]} Suggestions
 */
export function suggestAttributesForArchetype(archetype) {
  if (!archetype || !archetype.focusAttributes) {
    return [];
  }

  return archetype.focusAttributes.map(attr =>
    `If you continue this path, improving ${attr.toUpperCase()} will matter more.`
  );
}

/**
 * Get role bias multipliers for an archetype (for suggestion engine)
 * @param {object} archetype - The archetype definition
 * @returns {object} Role bias map { role: multiplier }
 */
export function getArchetypeRoleBias(archetype) {
  return archetype?.roleBias || {};
}

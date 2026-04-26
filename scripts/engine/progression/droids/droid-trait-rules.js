/**
 * ============================================
 * FILE: scripts/engine/progression/droids/droid-trait-rules.js
 *
 * SWSE Droid Trait Rules Authority
 * ============================================
 *
 * Single source of truth for all droid trait packages, degree rules, size effects,
 * and PC droid chargen defaults. Derived from SWSE Core Rulebook.
 *
 * Organized into four clean sections:
 *   1. Universal Droid Traits (apply to all droids)
 *   2. Degree Packages (1st-5th, per-degree rules)
 *   3. Size Packages (tiny through colossal)
 *   4. PC Custom Droid Defaults (chargen starting configuration)
 *
 * Consumers (attribute step, class step, builder, talent step, passive renderer)
 * pull from this single authority. Do not let any consumer become the source of truth.
 */

// ============================================================================
// SECTION 1: UNIVERSAL DROID TRAITS
// ============================================================================
// These apply to ALL droids, regardless of degree or size.
// Each trait has passive display text and any real rule flags.

/**
 * Universal droid traits that apply to all droids
 * Used by: passive trait rendering, runtime rule enforcement
 */
export const UNIVERSAL_DROID_TRAITS = {
  nonliving: {
    id: 'nonliving',
    name: 'Nonliving',
    category: 'core',
    passiveText: 'Immune to poison, disease, radiation, noncorrosive atmospheric hazards, and vacuum. Immune to mind-affecting effects and stunning effects. Cannot gain Force Sensitivity or learn Force Powers.',
    ruleFlags: {
      noCON: true,
      noForceAffinity: true,
      noForcePowers: true,
      strModToFortitude: true,
      immuneToMindAffecting: true,
      immuneToStunning: true,
      immuneToPoison: true,
      immuneToDisease: true,
      immuneToRadiation: true,
      immuneToVacuum: true
    }
  },
  binaryInterface: {
    id: 'binary-interface',
    name: 'Binary Interface',
    category: 'communication',
    passiveText: 'Speaks, reads, and processes Binary. Understands one language chosen by designer (typically Basic).',
    ruleFlags: {
      automaticLanguage: 'Binary',
      designerLanguage: 'Basic' // default, can be overridden
    }
  },
  ionVulnerability: {
    id: 'ion-vulnerability',
    name: 'Ion Vulnerability',
    category: 'weakness',
    passiveText: 'Ion damage affects droids the same way stun damage affects living beings.',
    ruleFlags: {
      ionDamageAsStun: true
    }
  },
  maintenance: {
    id: 'maintenance',
    name: 'Maintenance',
    category: 'upkeep',
    passiveText: 'Does not sleep, eat, or breathe. Must shutdown and recharge for 1 hour after 100 hours of continuous operation. Failure to recharge results in progressive condition penalties.',
    ruleFlags: {
      noSleep: true,
      noFood: true,
      noBreathe: true,
      rechargeCycle: 100 // hours
    }
  },
  memoryReassignment: {
    id: 'memory-reassignment',
    name: 'Memory & Reassignment',
    category: 'programming',
    passiveText: 'Skills, feats, and talents can be reassigned via Use Computer (Reprogramming). Self-repair with -5 penalty. Complete memory wipe resets droid to basic model.',
    ruleFlags: {
      canReprogramViaComputer: true,
      selfRepairPenalty: -5
    }
  },
  repair: {
    id: 'repair',
    name: 'Repair',
    category: 'upkeep',
    passiveText: 'Regains hit points only through Mechanics skill (Repair application). Cannot use healing powers. Self-repair with -5 penalty.',
    ruleFlags: {
      repairViaSkillOnly: true,
      noHealingPowers: true
    }
  },
  shutdown: {
    id: 'shutdown',
    name: 'Shutdown',
    category: 'state',
    passiveText: 'Willing shutdown is a standard action. Unwilling shutdown requires a grab and Mechanics check (DC = droid Will Defense). Cannot shut down unwilling droid with Locked Access unless helpless.',
    ruleFlags: {
      canShutdown: true,
      willingShutdownAction: 'standard'
    }
  },
  systemsModularity: {
    id: 'systems-modularity',
    name: 'Systems & Modular Design',
    category: 'structure',
    passiveText: 'Can install, replace, and modify droid systems including processors, appendages, locomotion, and accessories within mechanical constraints.',
    ruleFlags: {
      canModifySystems: true
    }
  },
  forceDisconnection: {
    id: 'force-disconnection',
    name: 'Force Disconnection',
    category: 'core',
    passiveText: 'No connection to The Force. Cannot be affected by Force-based effects.',
    ruleFlags: {
      noForceConnection: true,
      noForceAffectedAbilities: true
    }
  }
};

/**
 * Get universal trait by ID
 */
export function getUniversalDroidTrait(traitId) {
  return UNIVERSAL_DROID_TRAITS[traitId];
}

/**
 * Get all universal traits as an array
 */
export function getAllUniversalDroidTraits() {
  return Object.values(UNIVERSAL_DROID_TRAITS);
}

// ============================================================================
// SECTION 2: DEGREE PACKAGES
// ============================================================================
// Each degree defines: ability mods, behavioral profile, allowed talent tree
// Reference: SWSE Core Rulebook, Droid Heroes section

/**
 * Droid degree packages (1st through 5th)
 * Used by: attribute step, talent step, passive rendering
 */
export const DROID_DEGREE_PACKAGES = {
  "1st-degree": {
    id: "1st-degree",
    name: "1st-Degree",
    typicalRoles: "Medical, Scientific",
    description: "Medical and analytical droids with superior diagnostic and scientific capabilities.",
    abilityMods: { int: 2, wis: 2, str: -2 },
    hasNonviolenceInhibitor: true,
    hasObedienceInhibitor: true,
    behavioralProfile: "medical_nonviolent",
    behavioralText: "Cannot knowingly harm a sentient creature unless necessary to prevent greater harm. Must obey orders from designated owner.",
    talentTreeName: "1st-Degree Droid Talent Tree"
  },
  "2nd-degree": {
    id: "2nd-degree",
    name: "2nd-Degree",
    typicalRoles: "Astromech, Technical",
    description: "Mechanical and technical droids with advanced repair and maintenance capabilities.",
    abilityMods: { int: 2, cha: -2 },
    hasNonviolenceInhibitor: true,
    hasObedienceInhibitor: true,
    behavioralProfile: "technical_nonviolent",
    behavioralText: "Cannot knowingly harm a sentient creature unless necessary to prevent greater harm. Must obey orders from designated owner.",
    talentTreeName: "2nd-Degree Droid Talent Tree"
  },
  "3rd-degree": {
    id: "3rd-degree",
    name: "3rd-Degree",
    typicalRoles: "Protocol, Service",
    description: "Protocol and domestic droids specializing in communication and social interaction.",
    abilityMods: { wis: 2, cha: 2, str: -2 },
    hasNonviolenceInhibitor: true,
    hasObedienceInhibitor: true,
    behavioralProfile: "protocol_nonviolent",
    behavioralText: "Cannot knowingly harm a sentient creature unless necessary to prevent greater harm. Must obey orders from designated owner.",
    talentTreeName: "3rd-Degree Droid Talent Tree"
  },
  "4th-degree": {
    id: "4th-degree",
    name: "4th-Degree",
    typicalRoles: "Combat, Security",
    description: "Security and battle droids designed for combat and protection roles.",
    abilityMods: { dex: 2, int: -2, cha: -2 },
    hasNonviolenceInhibitor: false,
    hasObedienceInhibitor: true,
    behavioralProfile: "security_obedience_only",
    behavioralText: "Must obey orders from designated owner.",
    talentTreeName: "4th-Degree Droid Talent Tree"
  },
  "5th-degree": {
    id: "5th-degree",
    name: "5th-Degree",
    typicalRoles: "Labor, Utility",
    description: "Labor and utility droids built for heavy work and physical tasks.",
    abilityMods: { str: 4, int: -4, cha: -4 },
    hasNonviolenceInhibitor: true,
    hasObedienceInhibitor: true,
    behavioralProfile: "labor_nonviolent",
    behavioralText: "Cannot knowingly harm a sentient creature unless necessary to prevent greater harm. Must obey orders from designated owner.",
    talentTreeName: "5th-Degree Droid Talent Tree"
  }
};

/**
 * Get complete degree package by ID
 */
export function getDroidDegreePackage(degree) {
  return DROID_DEGREE_PACKAGES[degree] || DROID_DEGREE_PACKAGES["1st-degree"];
}

/**
 * Get ability modifiers for a degree
 */
export function getDroidDegreeAbilityMods(degree) {
  return getDroidDegreePackage(degree).abilityMods;
}

/**
 * Get behavioral profile ID for a degree
 */
export function getDroidBehavioralProfile(degree) {
  return getDroidDegreePackage(degree).behavioralProfile;
}

/**
 * Get behavioral inhibitor text for a degree (passive display)
 */
export function getDroidBehavioralInhibitorText(degree) {
  return getDroidDegreePackage(degree).behavioralText;
}

/**
 * Get allowed talent tree name for a degree
 */
export function getDroidTalentTreeName(degree) {
  return getDroidDegreePackage(degree).talentTreeName;
}

/**
 * Check if degree has nonviolence inhibitor
 */
export function hasDroidNonviolenceInhibitor(degree) {
  return getDroidDegreePackage(degree).hasNonviolenceInhibitor;
}

/**
 * Check if degree has obedience inhibitor (all degrees do)
 */
export function hasDroidObedienceInhibitor(degree) {
  return getDroidDegreePackage(degree).hasObedienceInhibitor;
}

// ============================================================================
// SECTION 3: SIZE PACKAGES
// ============================================================================
// Size determines ability mods, carrying capacity, speed, cost factor, etc.
// Reference: SWSE Core Rulebook, Droid size table

/**
 * Droid size packages (tiny through colossal)
 * Stacks with degree modifiers
 */
export const DROID_SIZE_PACKAGES = {
  'tiny': {
    abilityMods: { str: -4, dex: 4 },
    reflexBonus: 2,
    stealthBonus: 10,
    hitPointAdjustment: -20,
    damageThresholdBonus: -10,
    carryingMultiplier: 0.01,
    costFactor: 5,
    defaultLocomotion: 'walking',
    baseSpeed: 4
  },
  'small': {
    abilityMods: { str: -2, dex: 2 },
    reflexBonus: 1,
    stealthBonus: 5,
    hitPointAdjustment: 0,
    damageThresholdBonus: 0,
    carryingMultiplier: 0.75,
    costFactor: 2,
    defaultLocomotion: 'tracked',
    baseSpeed: 4
  },
  'medium': {
    abilityMods: {},
    reflexBonus: 0,
    stealthBonus: 0,
    hitPointAdjustment: 0,
    damageThresholdBonus: 0,
    carryingMultiplier: 1,
    costFactor: 1,
    defaultLocomotion: 'walking',
    baseSpeed: 6
  },
  'large': {
    abilityMods: { str: 4, dex: -2 },
    reflexBonus: -1,
    stealthBonus: -1,
    hitPointAdjustment: 10,
    damageThresholdBonus: 5,
    carryingMultiplier: 2,
    costFactor: 2,
    defaultLocomotion: 'walking',
    baseSpeed: 8
  },
  'huge': {
    abilityMods: { str: 8, dex: -4 },
    reflexBonus: -2,
    stealthBonus: -2,
    hitPointAdjustment: 20,
    damageThresholdBonus: 10,
    carryingMultiplier: 5,
    costFactor: 5,
    defaultLocomotion: 'walking',
    baseSpeed: 8
  },
  'gargantuan': {
    abilityMods: { str: 12, dex: -4 },
    reflexBonus: -5,
    stealthBonus: -5,
    hitPointAdjustment: 50,
    damageThresholdBonus: 20,
    carryingMultiplier: 10,
    costFactor: 10,
    defaultLocomotion: 'walking',
    baseSpeed: 8
  },
  'colossal': {
    abilityMods: { str: 16, dex: -4 },
    reflexBonus: -10,
    stealthBonus: -20,
    hitPointAdjustment: 100,
    damageThresholdBonus: 50,
    carryingMultiplier: 20,
    costFactor: 20,
    defaultLocomotion: 'walking',
    baseSpeed: 8
  }
};

/**
 * Get size package by ID
 */
export function getDroidSizePackage(size) {
  return DROID_SIZE_PACKAGES[size] || DROID_SIZE_PACKAGES['medium'];
}

/**
 * Get ability modifiers for a size
 */
export function getDroidSizeAbilityMods(size) {
  return getDroidSizePackage(size).abilityMods;
}

/**
 * Get cost factor for a size
 */
export function getDroidSizeCostFactor(size) {
  return getDroidSizePackage(size).costFactor;
}

/**
 * Get default locomotion for a size (used in custom droid setup)
 */
export function getDroidSizeDefaultLocomotion(size) {
  return getDroidSizePackage(size).defaultLocomotion;
}

/**
 * Get base speed for a size (used in custom droid setup)
 */
export function getDroidSizeBaseSpeed(size) {
  return getDroidSizePackage(size).baseSpeed;
}

/**
 * Combine degree and size ability modifiers
 * Used when calculating final ability scores
 */
export function combineDroidAbilityMods(degree, size) {
  const degMods = getDroidDegreeAbilityMods(degree);
  const sizeMods = getDroidSizeAbilityMods(size);

  const combined = {};
  const allKeys = new Set([...Object.keys(degMods), ...Object.keys(sizeMods)]);

  for (const key of allKeys) {
    combined[key] = (degMods[key] || 0) + (sizeMods[key] || 0);
  }

  return combined;
}

// ============================================================================
// SECTION 4: PC CUSTOM DROID DEFAULTS
// ============================================================================
// Configuration for player character droids during chargen
// These are RAW chargen defaults; can be overridden by houserules

/**
 * PC droid chargen defaults (RAW)
 * Used by: droid builder, session seeder, chargen defaults
 */
export const PC_DROID_CHARGEN_DEFAULTS = {
  // Processor: ALWAYS Heuristic for PC droids (automatic, free, non-optional)
  processor: {
    id: 'heuristic',
    name: 'Heuristic Processor',
    isFree: true,
    isAutomatic: true,
    isRequired: true,
    description: 'Required for all player character droids. Enables unrestricted skill use and creative instruction interpretation.'
  },

  // Appendages: TWO appendages standard (hands/tools)
  appendages: {
    count: 2,
    description: 'Two appendages (typically hands) included at no cost'
  },

  // Locomotion: depends on size
  locomotion: {
    small: {
      id: 'tracked',
      name: 'Tracked Locomotion',
      baseSpeed: 4
    },
    medium: {
      id: 'walking',
      name: 'Walking Locomotion',
      baseSpeed: 6
    }
  },

  // Construction budget: 1000 credits for additional systems/accessories
  constructionBudget: 1000,

  // Point-buy: 20 points (vs. 25 for living characters)
  pointBuyPool: 20,

  // Standard array (RAW): 15, 14, 13, 12, 10 (5 abilities, no CON)
  standardArray: [15, 14, 13, 12, 10],

  // Heroic class restrictions (RAW)
  allowedHeroicClasses: ['Noble', 'Scoundrel', 'Scout', 'Soldier'],

  // Jedi allowance (default false, can be overridden by houserule)
  allowJediClass: false,
  allowJediHouseruleDescription: 'Game master can allow droid Jedi via allowDroidJediClass houserule (still forbids Force Sensitivity)'
};

/**
 * Get allowed heroic classes for PC droids
 * @param {boolean} allowJediHouserule - Override to allow Jedi class
 * @returns {string[]}
 */
export function getPCDroidAllowedHeroicClasses(allowJediHouserule = false) {
  const allowed = [...PC_DROID_CHARGEN_DEFAULTS.allowedHeroicClasses];
  if (allowJediHouserule) allowed.push('Jedi');
  return allowed;
}

/**
 * Get PC droid default locomotion by size
 */
export function getPCDroidDefaultLocomotion(size) {
  return PC_DROID_CHARGEN_DEFAULTS.locomotion[size]
    || PC_DROID_CHARGEN_DEFAULTS.locomotion.medium;
}

/**
 * Get PC droid starting configuration (new droid chargen)
 */
export function getPCDroidStartingConfig(degree, size) {
  return {
    degree: degree || '1st-degree',
    size: size || 'medium',
    processor: PC_DROID_CHARGEN_DEFAULTS.processor,
    appendages: PC_DROID_CHARGEN_DEFAULTS.appendages,
    locomotion: getPCDroidDefaultLocomotion(size),
    constructionBudget: PC_DROID_CHARGEN_DEFAULTS.constructionBudget,
    pointBuyPool: PC_DROID_CHARGEN_DEFAULTS.pointBuyPool,
    standardArray: PC_DROID_CHARGEN_DEFAULTS.standardArray
  };
}

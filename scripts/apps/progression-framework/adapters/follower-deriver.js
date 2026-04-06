/**
 * Follower Deriver
 *
 * RULES CORRECTION (Phase 3 Addendum):
 * Followers are DERIVED ENTITIES, not class-leveled characters.
 *
 * Follower stats at any moment = f(owner.heroicLevel, follower.species, follower.template, persistent.choices, owner.talents)
 *
 * This is NOT incremental level-by-level advancement.
 * This is derived recalculation at target level, with persistent choices preserved.
 *
 * Reuses existing follower template rules and formulas from canonical sources.
 * Does not invent follower progression from memory.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { getHeroicLevel } from '/systems/foundryvtt-swse/scripts/actors/derived/level-split.js';
import { FollowerCreator } from '../../follower-creator.js';

/**
 * Derive follower statistics at a target level from persistent identity.
 *
 * Given:
 * - owner heroic level
 * - follower species
 * - follower template
 * - persistent template choices
 *
 * Compute follower stats that should exist at that level.
 *
 * This is the core derivation function. Not incremental. Not level-by-level.
 *
 * @param {number} targetHeroicLevel - Owner's heroic level (becomes follower level)
 * @param {string} speciesName - Follower species name
 * @param {string} templateType - 'aggressive', 'defensive', 'utility'
 * @param {Object} persistentChoices - {abilityChoice, skillChoice, featChoice}
 * @returns {Promise<Object>} Derived follower stats object
 */
export async function deriveFollowerStats(targetHeroicLevel, speciesName, templateType, persistentChoices = {}) {
  const level = Math.max(1, targetHeroicLevel || 1);

  swseLogger.log('[FollowerDeriver] Deriving stats', {
    level,
    species: speciesName,
    template: templateType,
    choices: persistentChoices
  });

  // Load template rules from canonical source
  const templates = await FollowerCreator.getFollowerTemplates();
  const template = templates[templateType];

  if (!template) {
    swseLogger.error('[FollowerDeriver] Invalid template:', templateType);
    throw new Error(`Unknown follower template: ${templateType}`);
  }

  // Base abilities: all 10, then apply template choice
  const abilities = {
    str: { base: 10, mod: -5 },
    dex: { base: 10, mod: -5 },
    con: { base: 10, mod: -5 },
    int: { base: 10, mod: -5 },
    wis: { base: 10, mod: -5 },
    cha: { base: 10, mod: -5 }
  };

  // Apply template ability bonus to chosen ability
  if (persistentChoices.abilityChoice && template.abilityBonus) {
    abilities[persistentChoices.abilityChoice].base += template.abilityBonus;
    abilities[persistentChoices.abilityChoice].mod = Math.floor((abilities[persistentChoices.abilityChoice].base - 10) / 2);
  }

  // Recalculate all ability mods
  for (const key in abilities) {
    if (abilities[key].base !== 10) {
      abilities[key].mod = Math.floor((abilities[key].base - 10) / 2);
    }
  }

  // Derive defenses using FOLLOWER FORMULA: 10 + ability mod + owner heroic level
  const defenses = {
    fort: {
      base: 10 + Math.max(abilities.str.mod, abilities.con.mod) + level
    },
    ref: {
      base: 10 + abilities.dex.mod + level
    },
    will: {
      base: 10 + abilities.wis.mod + level
    }
  };

  // Apply template defense bonuses
  if (template.defenseBonus) {
    for (const [defense, bonus] of Object.entries(template.defenseBonus)) {
      if (defenses[defense]) {
        defenses[defense].bonus = bonus;
        defenses[defense].total = defenses[defense].base + bonus;
      }
    }
  }

  // Set totals if not already set
  for (const defense in defenses) {
    if (!defenses[defense].total) {
      defenses[defense].total = defenses[defense].base;
    }
  }

  // HP using FOLLOWER FORMULA: 10 + owner heroic level
  const hp = {
    max: 10 + level,
    value: 10 + level
  };

  // BAB from template table at the target level
  // Template.babProgression is [level1, level2, ..., level20]
  // Index is level-1
  const bab = template.babProgression?.[Math.min(level - 1, 19)] ?? 0;

  // Damage threshold from Fortitude defense + any special bonuses
  const damageThreshold = defenses.fort.total + (template.damageThresholdBonus || 0);

  // Grapple: STR mod + misc bonuses (not calculated, will be set on actor update)
  const grappleBonus = abilities.str.mod;

  swseLogger.log('[FollowerDeriver] Derived follower stats', {
    level,
    hp: hp.max,
    bab,
    abilities: Object.entries(abilities).map(([k, v]) => ({ [k]: v.base })),
    defenses: Object.entries(defenses).map(([k, v]) => ({ [k]: v.total }))
  });

  return {
    level,
    abilities,
    defenses,
    hp,
    bab,
    damageThreshold,
    grappleBonus,
    template,
    templateType,
    speciesName,
    persistentChoices
  };
}

/**
 * Compute follower existence state: is this a new follower or an update?
 *
 * @param {Actor|null} existingFollower - The existing follower actor (null if new)
 * @param {number} ownerHeroicLevel - Owner's current heroic level
 * @returns {Object} State with isNew, currentLevel, targetLevel, needsUpdate
 */
export function computeFollowerExistenceState(existingFollower, ownerHeroicLevel) {
  const targetLevel = Math.max(1, ownerHeroicLevel || 1);
  const currentLevel = existingFollower?.system?.level || 0;
  const isNew = currentLevel === 0;
  const needsUpdate = !isNew && currentLevel !== targetLevel;

  return {
    isNew,
    isExisting: !isNew,
    currentLevel,
    targetLevel,
    needsUpdate,
    levelChanged: targetLevel > currentLevel
  };
}

/**
 * Get follower derivation context for projection/finalization
 *
 * @param {ProgressionSession} session - The progression session
 * @param {Actor} ownerActor - The owner actor
 * @param {Actor|null} existingFollower - The existing follower (null if new)
 * @returns {Promise<Object>} Context with derivation info
 */
export async function getFollowerDerivationContext(session, ownerActor, existingFollower = null) {
  if (!session?.dependencyContext) {
    swseLogger.warn('[FollowerDeriver] No dependency context in session');
    return null;
  }

  const ownerHeroicLevel = getHeroicLevel(ownerActor) || 1;
  const existenceState = computeFollowerExistenceState(existingFollower, ownerHeroicLevel);

  const templates = await FollowerCreator.getFollowerTemplates();
  const templateType = session.dependencyContext.templateType;
  const template = templates[templateType];

  // Get persistent choices from existing follower or session
  const persistentChoices = existingFollower?.system?.progression?.followerChoices || session.dependencyContext.persistentChoices || {};

  return {
    ownerActor,
    existingFollower,
    ownerHeroicLevel,
    template,
    templateType,
    existenceState,
    persistentChoices,
    speciesName: existingFollower?.system?.race || session.dependencyContext.speciesName
  };
}

/**
 * Derive full follower state at target level
 * This is what gets applied (for new) or updated (for existing)
 *
 * @param {number} targetHeroicLevel - Owner's heroic level
 * @param {string} speciesName - Species name
 * @param {string} templateType - Template type
 * @param {Object} persistentChoices - Persistent template choices
 * @returns {Promise<Object>} Complete follower state object for mutation
 */
export async function deriveFollowerStateForApply(targetHeroicLevel, speciesName, templateType, persistentChoices) {
  const derivedStats = await deriveFollowerStats(
    targetHeroicLevel,
    speciesName,
    templateType,
    persistentChoices
  );

  return {
    level: derivedStats.level,
    abilities: derivedStats.abilities,
    defenses: derivedStats.defenses,
    hp: derivedStats.hp,
    baseAttackBonus: derivedStats.bab,
    damageThreshold: derivedStats.damageThreshold,
    race: speciesName,
    // Store persistent choices for future updates
    progression: {
      followerChoices: persistentChoices,
      followerTemplate: templateType,
      isFollower: true
    }
  };
}

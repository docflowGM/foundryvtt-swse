/**
 * SKILL RESOLUTION LAYER
 *
 * Canonical resolvers for ranked-skills class-skill eligibility and prestige inheritance.
 *
 * Provides:
 * - Prestige skill source mapping (prestige class → core class)
 * - Class-skill eligibility checking (is a skill class-eligible for a given context?)
 * - Background class-skill integration
 * - Safe fallback handling when data is missing
 *
 * CONTRACT:
 * - All resolvers are read-only (no mutations)
 * - All resolvers work with existing ClassesDB, TalentTreeDB, SkillState
 * - Resolvers are safe even when ranked mode is off (inert)
 * - Resolvers handle missing/unresolvable data gracefully
 */

import { ClassesDB } from "/systems/foundryvtt-swse/scripts/data/classes-db.js";
import { TalentTreeDB } from "/systems/foundryvtt-swse/scripts/data/talent-tree-db.js";
import { PRESTIGE_PREREQUISITES } from "/systems/foundryvtt-swse/scripts/data/prestige-prerequisites.js";
import { SkillState } from "/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-state.js";
import { canonicalizeSkillKey } from "/systems/foundryvtt-swse/scripts/utils/skill-normalization.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Resolve which core/heroic class a prestige class should inherit skills from
 * under inherit_entry_tree_class policy.
 *
 * Fallback order:
 * 1. Talent tree → core class mapping (talent-tree-derived)
 * 2. Unique entry class (if prestige has exactly one required tree → one class)
 * 3. Fallback (no resolution)
 *
 * @param {Actor} actor - The actor (for future use; not currently needed)
 * @param {string} prestigeClassId - Prestige class ID
 * @param {Object} options - { returnMetadata: boolean }
 * @returns {string|Object} - Core class name (string) or metadata object if returnMetadata=true
 *   If returnMetadata: { coreClass: string, source: 'tree_mapping'|'fallback'|'unresolved' }
 */
export function resolvePrestigeSkillSourceClass(actor, prestigeClassId, options = {}) {
  const prestigeClassDef = ClassesDB.get(prestigeClassId);
  if (!prestigeClassDef) {
    return options.returnMetadata ? { coreClass: null, source: 'unresolved' } : null;
  }

  const prestigeClassName = prestigeClassDef.name;

  // Get prestige prerequisites
  const prereq = PRESTIGE_PREREQUISITES[prestigeClassName];
  if (!prereq || !prereq.talents || !prereq.talents.trees) {
    if (options.returnMetadata) {
      return { coreClass: null, source: 'unresolved' };
    }
    return null;
  }

  const requiredTrees = prereq.talents.trees;
  if (!Array.isArray(requiredTrees) || requiredTrees.length === 0) {
    if (options.returnMetadata) {
      return { coreClass: null, source: 'unresolved' };
    }
    return null;
  }

  // Build reverse index: talent tree name → core classes that have it
  // (This is built on-demand; could be cached if needed)
  const treeToClasses = new Map();
  for (const classDef of ClassesDB.all()) {
    if (!classDef.talentTreeIds || !Array.isArray(classDef.talentTreeIds)) {
      continue;
    }
    for (const treeId of classDef.talentTreeIds) {
      const tree = TalentTreeDB.get(treeId);
      if (tree) {
        const treeName = tree.name;
        if (!treeToClasses.has(treeName)) {
          treeToClasses.set(treeName, []);
        }
        treeToClasses.get(treeName).push(classDef);
      }
    }
  }

  // Try to resolve via talent tree → class mapping
  // Collect all classes that have any of the prestige's required talent trees
  const possibleClasses = new Set();
  for (const treeName of requiredTrees) {
    const classes = treeToClasses.get(treeName);
    if (classes && classes.length > 0) {
      for (const cls of classes) {
        possibleClasses.add(cls.name);
      }
    }
  }

  // If there's a unique class, use it
  if (possibleClasses.size === 1) {
    const coreClass = Array.from(possibleClasses)[0];
    if (options.returnMetadata) {
      return { coreClass, source: 'tree_mapping' };
    }
    return coreClass;
  }

  // If multiple or no classes found, unresolved
  if (options.returnMetadata) {
    return {
      coreClass: possibleClasses.size > 0 ? Array.from(possibleClasses)[0] : null,
      source: 'unresolved'
    };
  }
  return possibleClasses.size > 0 ? Array.from(possibleClasses)[0] : null;
}

/**
 * Determine the effective skill-source class for a class in a specific actor context.
 * This is the class whose class skills should apply to levels taken in that class.
 *
 * Under inherit_entry_tree_class:
 * - Base classes return themselves
 * - Prestige classes use resolvePrestigeSkillSourceClass()
 *
 * @param {Actor} actor - The actor being leveled up
 * @param {string} classId - Class ID (may be prestige or base)
 * @param {Object} options - { policy: 'inherit_entry_tree_class' (default) }
 * @returns {string|null} - Core class name or null if unresolvable
 */
export function resolveEffectiveSkillSourceClass(actor, classId, options = {}) {
  if (!classId) {return null;}

  const classDef = ClassesDB.get(classId);
  if (!classDef) {return null;}

  // If it's a base class, it's its own source
  if (classDef.baseClass) {
    return classDef.name;
  }

  // If it's prestige, resolve the core class it inherits from
  const result = resolvePrestigeSkillSourceClass(actor, classId, { returnMetadata: true });
  return result.coreClass;
}

/**
 * Check if a skill is class-skill eligible for a given level-up context.
 *
 * A skill is class-skill eligible if:
 * 1. It's a class skill of the effective skill-source class, OR
 * 2. It's in the actor's background class skills
 *
 * Under skillRankClassSkillPolicy = current_class_plus_backgrounds (only supported policy for now).
 *
 * @param {Actor} actor - Actor being leveled up
 * @param {string} skillKey - Canonicalized skill key (e.g., "gatherInformation")
 * @param {string} classId - Class being taken at this level
 * @returns {Object} - {
 *   isClassSkill: boolean,
 *   source: 'current_class' | 'prestige_inherited_class' | 'background' | 'none',
 *   effectiveClass: string|null,
 *   backgroundApplies: boolean
 * }
 */
export function isSkillClassEligibleForLevel(actor, skillKey, classId) {
  if (!actor || !skillKey || !classId) {
    return {
      isClassSkill: false,
      source: 'none',
      effectiveClass: null,
      backgroundApplies: false
    };
  }

  const classDef = ClassesDB.get(classId);
  if (!classDef) {
    return {
      isClassSkill: false,
      source: 'none',
      effectiveClass: null,
      backgroundApplies: false
    };
  }

  // Check background first (permanent across level-ups)
  const backgroundSkills = SkillState.getBackgroundClassSkills(actor);
  if (Array.isArray(backgroundSkills) && backgroundSkills.includes(skillKey)) {
    return {
      isClassSkill: true,
      source: 'background',
      effectiveClass: null,
      backgroundApplies: true
    };
  }

  // Determine effective skill-source class for this class
  let effectiveClass = null;
  let source = 'none';

  if (classDef.baseClass) {
    // Base class: use its own class skills
    effectiveClass = classDef.name;
    source = 'current_class';
  } else {
    // Prestige class: resolve the core class it inherits from
    effectiveClass = resolvePrestigeSkillSourceClass(classDef.name);
    if (effectiveClass) {
      source = 'prestige_inherited_class';
    }
  }

  // Check if skill is a class skill of the effective class
  if (effectiveClass) {
    const effectiveClassDef = ClassesDB.byName(effectiveClass);
    if (effectiveClassDef && effectiveClassDef.classSkills && Array.isArray(effectiveClassDef.classSkills)) {
      // Canonicalize class skills for comparison
      const isInClassSkills = effectiveClassDef.classSkills.some(cs => {
        const canonicalCs = canonicalizeSkillKey(cs);
        return canonicalCs === skillKey;
      });

      if (isInClassSkills) {
        return {
          isClassSkill: true,
          source,
          effectiveClass,
          backgroundApplies: false
        };
      }
    }
  }

  return {
    isClassSkill: false,
    source: 'none',
    effectiveClass,
    backgroundApplies: false
  };
}

/**
 * Get detailed eligibility info for a skill in a specific level-up context.
 * Used for diagnostic/UI purposes.
 *
 * @param {Actor} actor - Actor being leveled up
 * @param {string} skillKey - Canonicalized skill key
 * @param {string} classId - Class being taken
 * @returns {Object} - Eligibility details with source info
 */
export function getSkillEligibilitySource(actor, skillKey, classId) {
  return isSkillClassEligibleForLevel(actor, skillKey, classId);
}

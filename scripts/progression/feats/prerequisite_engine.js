import { PrerequisiteValidator } from '../../utils/prerequisite-validator.js';
/**
 * PREREQUISITE REQUIREMENTS ENGINE
 * Unified validator for Feats and Talents.
 *
 * ✔ Backward compatible with string-based prerequisites
 * ✔ Supports structured prerequisites
 * ✔ Supports "any other talent from X tree"
 */

import { SWSELogger } from '../../utils/logger.js';
import { normalizePrerequisiteString } from '../utils/prerequisite-normalizer.js';

export const PrerequisiteRequirements = {

  /* ============================================
   * PUBLIC ENTRY POINT
   * ============================================ */

  /**
   * Check if actor meets requirements
   * Works for feats and talents
   *
   * @returns { valid: boolean, reasons: string[] }
   */
  meetsRequirements(actor, doc) {
    return this.checkFeature(actor, doc);
  },

  /**
   * Unified check for any feature (feat, talent, etc)
   * @returns { valid: boolean, reasons: string[] }
   */
  checkFeature(actor, doc) {
    const structured = doc.system?.prerequisitesStructured;

    // Prefer structured prerequisites if present
    if (structured) {
      const reasons = [];
      const valid = this._evaluateStructured(actor, structured, reasons, doc);
      return { valid, reasons };
    }

    // Fallback to legacy string-based prerequisites
    return this._meetsLegacyStringRequirements(actor, doc);
  },

  /**
   * Check talent prerequisites (alias for checkFeature)
   * @returns { valid: boolean, reasons: string[] }
   */
  checkTalentPrerequisites(actor, talent, pending = {}) {
    return this.checkFeature(actor, talent);
  },

  /**
   * Check feat prerequisites (alias for checkFeature)
   * @returns { valid: boolean, reasons: string[] }
   */
  checkFeatPrerequisites(actor, feat, pending = {}) {
    return this.checkFeature(actor, feat);
  },

  canLearn(actor, doc) {
    return this.meetsRequirements(actor, doc).valid;
  },

  getUnmetRequirements(actor, doc) {
    return this.meetsRequirements(actor, doc).reasons;
  },

  /* ============================================
   * STRUCTURED PREREQUISITE EVALUATION
   * ============================================ */

  _evaluateStructured(actor, prereq, reasons, doc) {
    const mode = prereq.type ?? 'all';
    const results = [];

    for (const condition of prereq.conditions ?? []) {
      const passed = this._checkCondition(actor, condition, reasons, doc);
      results.push(passed);
    }

    return mode === 'any'
      ? results.some(Boolean)
      : results.every(Boolean);
  },

  _checkCondition(actor, condition, reasons, doc) {
    switch (condition.type) {

      /* ---------- FEATS ---------- */
      case 'feat': {
        const hasFeat = actor.items.some(i =>
          i.type === 'feat' &&
          this._normalizeId(i) === condition.id
        );

        if (!hasFeat) {
          reasons.push(`Requires ${condition.name ?? condition.id}`);
        }
        return hasFeat;
      }

      /* ---------- TALENTS ---------- */
      case 'talent': {
        const hasTalent = actor.items.some(i =>
          i.type === 'talent' &&
          this._normalizeId(i) === condition.id
        );

        if (!hasTalent) {
          reasons.push(`Requires ${condition.name ?? condition.id}`);
        }
        return hasTalent;
      }

      case 'talentFromTree': {
        const talents = actor.items.filter(i =>
          i.type === 'talent' &&
          i.system?.tree === condition.tree &&
          i.id !== doc?.id // exclude self
        );

        const count = condition.count ?? 1;
        if (talents.length < count) {
          reasons.push(`Requires any other ${condition.tree} talent`);
          return false;
        }
        return true;
      }

      /* ---------- ATTRIBUTES ---------- */
      case 'attribute': {
        const score = actor.system.attributes?.[condition.ability]?.total ?? 10;
        if (score < condition.min) {
          reasons.push(
            `Requires ${condition.ability.toUpperCase()} ${condition.min} (you have ${score})`
          );
          return false;
        }
        return true;
      }

      /* ---------- SKILLS ---------- */
      case 'skillTrained': {
        const trained = actor.system.skills?.[condition.skill]?.trained ?? false;
        if (!trained) {
          reasons.push(`Requires trained in ${condition.skill}`);
          return false;
        }
        return true;
      }

      /* ---------- BAB ---------- */
      case 'bab': {
        const bab = actor.system.bab ?? 0;
        if (bab < condition.min) {
          reasons.push(`Requires BAB +${condition.min}`);
          return false;
        }
        return true;
      }

      /* ---------- LEVEL ---------- */
      case 'level': {
        const level = actor.system.level ?? 1;
        if (level < condition.min) {
          reasons.push(`Requires Character Level ${condition.min}`);
          return false;
        }
        return true;
      }

      /* ---------- DARK SIDE ---------- */
      case 'darkSideScore': {
        const dsp = actor.system.darkSideScore ?? 0;
        if (dsp < condition.min) {
          reasons.push(`Requires Dark Side Score ${condition.min}`);
          return false;
        }
        return true;
      }

      /* ---------- SPECIES ---------- */
      case 'species': {
        const actorSpeciesId = actor.system.species?.id;
        const actorSpeciesName = actor.system.species?.name;

        // Support both ID-based and name-based matching
        const matches = condition.id
          ? actorSpeciesId === condition.id
          : actorSpeciesName === condition.name;

        if (!matches) {
          reasons.push(`Requires ${condition.name ?? condition.id}`);
          return false;
        }
        return true;
      }

      /* ---------- DROID DEGREE ---------- */
      case 'droidDegree': {
        const degree = actor.system.droidDegree ?? '';
        if (degree !== condition.degree) {
          reasons.push(`Requires droid with ${condition.degree} classification`);
          return false;
        }
        return true;
      }

      /* ---------- DROID FLAG ---------- */
      case 'isDroid': {
        const isDroid = actor.system.isDroid ?? false;
        if (!isDroid) {
          reasons.push('Requires character to be a droid');
          return false;
        }
        return true;
      }

      /* ---------- FORCE POWERS ---------- */
      case 'forcePower': {
        const result = this._checkForcePowerCondition(actor, condition, reasons);
        return result;
      }

      /* ---------- FORCE TECHNIQUES ---------- */
      case 'forceTechnique': {
        const result = this._checkForceTechniqueCondition(actor, condition, reasons);
        return result;
      }

      /* ---------- FORCE SECRETS ---------- */
      case 'forceSecret': {
        const result = this._checkForceSecretCondition(actor, condition, reasons);
        return result;
      }

      /* ---------- FEAT PATTERN (WILDCARD) ---------- */
      case 'featPattern': {
        const hasFeat = actor.items.some(i => {
          if (i.type !== 'feat') return false;
          const name = i.name.toLowerCase();
          const pattern = (condition.pattern ?? '').toLowerCase();
          return name.includes(pattern) || name.startsWith(pattern);
        });

        if (!hasFeat) {
          reasons.push(`Requires ${condition.description ?? 'a feat matching: ' + condition.pattern}`);
        }
        return hasFeat;
      }

      /* ---------- DARK SIDE SCORE DYNAMIC ---------- */
      case 'darkSideScoreDynamic': {
        const dsp = actor.system.darkSideScore ?? 0;
        const abilityScore = actor.system.attributes?.[condition.ability]?.total ?? 10;

        const met = this._evaluateDynamicComparison(dsp, abilityScore, condition.operator);
        if (!met) {
          reasons.push(
            `Requires Dark Side Score ${condition.operator} ${condition.ability.toUpperCase()} (DSP: ${dsp}, ${condition.ability.toUpperCase()}: ${abilityScore})`
          );
        }
        return met;
      }

      /* ---------- NON-DROID ---------- */
      case 'non_droid': {
        const isDroid = actor.system.isDroid ?? false;
        if (isDroid) {
          reasons.push('Requires character to not be a droid');
          return false;
        }
        return true;
      }

      /* ---------- SPECIES TRAIT ---------- */
      case 'species_trait': {
        // Check if actor has the specified species trait
        // Species traits are typically stored in actor.system.traits or similar
        const trait = condition.trait;
        const hasTrait = actor.items.some(i =>
          i.type === 'trait' &&
          i.name.toLowerCase().includes(trait.toLowerCase())
        );

        if (!hasTrait) {
          reasons.push(`Requires ${trait} Species Trait`);
          return false;
        }
        return true;
      }

      /* ---------- WEAPON PROFICIENCY ---------- */
      case 'weapon_proficiency': {
        const group = condition.group;
        const hasProficiency = actor.items.some(i =>
          i.type === 'feat' &&
          i.name.toLowerCase().includes('weapon proficiency') &&
          i.name.toLowerCase().includes(group.toLowerCase())
        );

        if (!hasProficiency) {
          reasons.push(`Requires Weapon Proficiency (${group})`);
          return false;
        }
        return true;
      }

      /* ---------- WEAPON FOCUS ---------- */
      case 'weapon_focus': {
        const group = condition.group;
        const hasFocus = actor.items.some(i =>
          i.type === 'feat' &&
          i.name.toLowerCase().includes('weapon focus') &&
          (group === "selected weapon group" || i.name.toLowerCase().includes(group.toLowerCase()))
        );

        if (!hasFocus) {
          reasons.push(`Requires Weapon Focus with ${group}`);
          return false;
        }
        return true;
      }

      /* ---------- WEAPON SPECIALIZATION ---------- */
      case 'weapon_specialization': {
        const group = condition.group;
        const hasSpecialization = actor.items.some(i =>
          i.type === 'feat' &&
          i.name.toLowerCase().includes('weapon specialization') &&
          (group === "selected weapon group" || i.name.toLowerCase().includes(group.toLowerCase()))
        );

        if (!hasSpecialization) {
          reasons.push(`Requires Weapon Specialization with ${group}`);
          return false;
        }
        return true;
      }

      /* ---------- ARMOR PROFICIENCY ---------- */
      case 'armor_proficiency': {
        const armorType = condition.armorType;
        const hasProficiency = actor.items.some(i =>
          i.type === 'feat' &&
          i.name.toLowerCase().includes('armor proficiency') &&
          i.name.toLowerCase().includes(armorType)
        );

        if (!hasProficiency) {
          reasons.push(`Requires Armor Proficiency (${armorType})`);
          return false;
        }
        return true;
      }

      /* ---------- CLASS LEVEL ---------- */
      case 'class_level': {
        const className = condition.className;
        const minimumLevel = condition.minimum;

        const classItem = actor.items.find(i =>
          i.type === 'class' &&
          i.name.toLowerCase() === className.toLowerCase()
        );

        const classLevel = classItem?.system?.level ?? 0;

        if (classLevel < minimumLevel) {
          reasons.push(`Requires ${className} level ${minimumLevel}`);
          return false;
        }
        return true;
      }


      /* ---------- OR CONDITION ---------- */
      case 'or': {
        const subConditions = condition.conditions ?? [];
        const results = subConditions.map(subCond =>
          this._checkCondition(actor, subCond, [], doc)
        );

        const anyPassed = results.some(Boolean);
        if (!anyPassed) {
          // Build a descriptive message for OR conditions
          const subReasons = subConditions.map((subCond, idx) => {
            if (subCond.type === 'feat') return subCond.name;
            if (subCond.type === 'skill_trained') return `Trained in ${subCond.skill}`;
            if (subCond.type === 'armor_proficiency') return `Armor Proficiency (${subCond.armorType})`;
            return `condition ${idx + 1}`;
          });
          reasons.push(`Requires one of: ${subReasons.join(' or ')}`);
          return false;
        }
        return true;
      }

      default:
        SWSELogger.warn('Unknown prerequisite condition:', condition);
        return true;
    }
  },

  /* ============================================
   * LEGACY STRING PREREQUISITES (UNCHANGED)
   * ============================================ */

  _meetsLegacyStringRequirements(actor, doc) {
    const prereq = doc.system?.prerequisite ?? '';

    if (!prereq.trim()) {
      return { valid: true, reasons: [] };
    }

    // Use normalizer to parse the prerequisite string
    const normalized = normalizePrerequisiteString(prereq);
    const reasons = [];

    // Check each parsed condition
    for (const condition of normalized.parsed) {
      const passed = this._checkNormalizedCondition(actor, condition, reasons, doc);
      if (!passed) {
        // Reason already added to reasons array
      }
    }

    return {
      valid: reasons.length === 0,
      reasons
    };
  },

  /**
   * Check a condition that came from the normalizer
   * This converts normalized types to structured types
   */
  _checkNormalizedCondition(actor, condition, reasons, doc) {
    switch (condition.type) {
      case 'ability':
        return this._checkCondition(actor, {
          type: 'attribute',
          ability: condition.ability,
          min: condition.minimum
        }, reasons, doc);

      case 'bab':
        return this._checkCondition(actor, {
          type: 'bab',
          min: condition.minimum
        }, reasons, doc);

      case 'skill_trained':
        return this._checkCondition(actor, {
          type: 'skillTrained',
          skill: condition.skill
        }, reasons, doc);

      case 'skill_ranks':
        // In SWSE, skills are trained/untrained, so treat as trained check
        return this._checkCondition(actor, {
          type: 'skillTrained',
          skill: condition.skill
        }, reasons, doc);

      case 'feat':
        // Try to find the feat by name
        const hasFeat = actor.items.some(i =>
          i.type === 'feat' &&
          i.name.toLowerCase() === condition.name.toLowerCase()
        );
        if (!hasFeat) {
          reasons.push(`Requires ${condition.name}`);
        }
        return hasFeat;

      case 'talent':
        const hasTalent = actor.items.some(i =>
          i.type === 'talent' &&
          i.name.toLowerCase() === condition.name.toLowerCase()
        );
        if (!hasTalent) {
          reasons.push(`Requires ${condition.name}`);
        }
        return hasTalent;

      case 'force_sensitive':
        const isForceSensitive = actor.items.some(i =>
          i.type === 'feat' &&
          i.name.toLowerCase().includes('force sensitive')
        );
        if (!isForceSensitive) {
          reasons.push('Requires Force Sensitive');
        }
        return isForceSensitive;

      case 'force_secret':
        const hasSecret = actor.items.some(i => i.type === 'forceSecret');
        if (!hasSecret) {
          reasons.push('Requires any Force Secret');
        }
        return hasSecret;

      case 'force_technique':
        const hasTechnique = actor.items.some(i => i.type === 'forceTechnique');
        if (!hasTechnique) {
          reasons.push('Requires any Force Technique');
        }
        return hasTechnique;

      case 'class_level':
        return this._checkCondition(actor, condition, reasons, doc);

      case 'alignment':
        // Just pass for now, alignment checks are rare
        return true;

      case 'species':
        return this._checkCondition(actor, {
          type: 'species',
          name: condition.name
        }, reasons, doc);

      case 'non_droid':
        return this._checkCondition(actor, condition, reasons, doc);

      case 'species_trait':
        return this._checkCondition(actor, condition, reasons, doc);

      case 'weapon_proficiency':
        return this._checkCondition(actor, condition, reasons, doc);

      case 'weapon_focus':
        return this._checkCondition(actor, condition, reasons, doc);

      case 'weapon_specialization':
        return this._checkCondition(actor, condition, reasons, doc);

      case 'armor_proficiency':
        return this._checkCondition(actor, condition, reasons, doc);

      case 'or':
        return this._checkCondition(actor, condition, reasons, doc);

      default:
        SWSELogger.warn('Unknown normalized condition type:', condition);
        return true;
    }
  },

  /* ---------- LEGACY CHECKS (UNCHANGED FROM YOUR FILE) ---------- */

  _checkAbilityRequirements(actor, prereq, reasons) {
    const abilities = ['str','dex','con','int','wis','cha'];
    for (const a of abilities) {
      const match = prereq.match(new RegExp(`${a}\\s*(\\d+)`, 'i'));
      if (match) {
        const need = Number(match[1]);
        const have = actor.system.attributes?.[a]?.total ?? 10;
        if (have < need) {
          reasons.push(`Requires ${a.toUpperCase()} ${need} (you have ${have})`);
        }
      }
    }
  },

  _checkBABRequirements(actor, prereq, reasons) {
    const m = prereq.match(/bab\s*\+?(\d+)/i);
    if (m) {
      const need = Number(m[1]);
      const bab = actor.system.bab ?? 0;
      if (bab < need) {
        reasons.push(`Requires BAB +${need}`);
      }
    }
  },

  _checkLevelRequirements(actor, prereq, reasons) {
    const m = prereq.match(/level\s*(\d+)/i);
    if (m) {
      const need = Number(m[1]);
      const level = actor.system.level ?? 1;
      if (level < need) {
        reasons.push(`Requires Character Level ${need}`);
      }
    }
  },

  _checkSkillRequirements(actor, prereq, reasons) {
    const matches = prereq.match(/trained in ([^,;]+)/gi);
    if (!matches) return;

    for (const m of matches) {
      const skill = m.replace(/trained in/i,'').trim().toLowerCase();
      const trained = actor.system.skills?.[skill]?.trained ?? false;
      if (!trained) {
        reasons.push(`Requires trained in ${skill}`);
      }
    }
  },

  _checkOtherFeatRequirements(actor, prereq, reasons) {
    const matches = prereq.match(/requires ([^,;]+)/gi);
    if (!matches) return;

    for (const m of matches) {
      const name = m.replace(/requires/i,'').trim();
      const has = actor.items.some(i =>
        i.type === 'feat' &&
        i.name.toLowerCase() === name.toLowerCase()
      );
      if (!has) {
        reasons.push(`Requires ${name}`);
      }
    }
  },

  /* ============================================
   * FORCE PREREQUISITES
   * ============================================ */

  _getForceSnapshot(actor) {
    const powers = actor.items.filter(i => i.type === 'forcepower');
    const techniques = actor.items.filter(i => i.type === 'forceTechnique');
    const secrets = actor.items.filter(i => i.type === 'forceSecret');

    return {
      powers,
      techniques,
      secrets,
      powersByCategory: this._mapPowersByCategory(powers),
      techniquesByPower: this._mapTechniquesByPower(techniques)
    };
  },

  _mapPowersByCategory(powers) {
    const map = {};
    for (const power of powers) {
      const categories = power.system?.categories ?? [];
      for (const cat of categories) {
        if (!map[cat]) map[cat] = [];
        map[cat].push(power);
      }
    }
    return map;
  },

  _mapTechniquesByPower(techniques) {
    const map = {};
    for (const tech of techniques) {
      const associated = tech.system?.suggestion?.associatedPowers ?? [];
      for (const powerName of associated) {
        if (!map[powerName]) map[powerName] = [];
        map[powerName].push(tech);
      }
    }
    return map;
  },

  _checkForcePowerCondition(actor, condition, reasons) {
    const snapshot = this._getForceSnapshot(actor);

    // Check specific power names
    if (condition.names && condition.names.length > 0) {
      const allFound = condition.names.every(name =>
        snapshot.powers.some(p => p.name === name)
      );
      if (!allFound) {
        reasons.push(`Requires Force power: ${condition.names.join(' or ')}`);
        return false;
      }
      return true;
    }

    // Check by category
    if (condition.category) {
      const categoryCount = snapshot.powersByCategory[condition.category]?.length ?? 0;
      const required = condition.count ?? 1;
      if (categoryCount < required) {
        reasons.push(`Requires ${required} Force power(s) from ${condition.category} category`);
        return false;
      }
      return true;
    }

    return true;
  },

  _checkForceTechniqueCondition(actor, condition, reasons) {
    const snapshot = this._getForceSnapshot(actor);

    // Check technique count
    if (condition.count) {
      if (snapshot.techniques.length < condition.count) {
        reasons.push(`Requires ${condition.count} Force Technique(s)`);
        return false;
      }
      return true;
    }

    // Check technique associated with specific power
    if (condition.associatedWithPower) {
      const found = snapshot.techniques.some(t => {
        const associated = t.system?.suggestion?.associatedPowers ?? [];
        return associated.includes(condition.associatedWithPower);
      });
      if (!found) {
        reasons.push(`Requires a Technique associated with ${condition.associatedWithPower}`);
        return false;
      }
      return true;
    }

    return true;
  },

  _checkForceSecretCondition(actor, condition, reasons) {
    const snapshot = this._getForceSnapshot(actor);

    // Check if any Force Secret exists
    if (condition.any) {
      if (snapshot.secrets.length === 0) {
        reasons.push('Requires any Force Secret');
        return false;
      }
      return true;
    }

    // Check specific secret names
    if (condition.names && condition.names.length > 0) {
      const allFound = condition.names.every(name =>
        snapshot.secrets.some(s => s.name === name)
      );
      if (!allFound) {
        reasons.push(`Requires Force Secret: ${condition.names.join(' or ')}`);
        return false;
      }
      return true;
    }

    return true;
  },

  _evaluateDynamicComparison(value1, value2, operator) {
    switch (operator) {
      case 'equals': return value1 === value2;
      case 'greaterThan': return value1 > value2;
      case 'lessThan': return value1 < value2;
      case 'greaterThanOrEqual': return value1 >= value2;
      case 'lessThanOrEqual': return value1 <= value2;
      default: return false;
    }
  },

  /* ============================================
   * TALENT TREE ACCESS RULES
   * ============================================ */

  /**
   * Check if actor can access a talent tree
   * Considers: class-based trees, force-generic trees, and force-tradition trees
   * @param {Actor} actor - The character actor
   * @param {string} treeId - The talent tree ID to check
   * @returns {boolean} True if actor can access this tree
   */
  async canAccessTalentTree(actor, treeId) {
    // Load talent tree access rules
    const accessRules = await this._loadTalentTreeAccessRules();
    if (!accessRules) return false;

    // Find rules for this tree
    const treeRules = accessRules.talentTreeAccess.find(t => t.treeId === treeId);
    if (!treeRules) return false;

    // Check if any access rule allows this actor
    for (const rule of treeRules.accessRules) {
      if (this._checkTalentTreeAccessRule(actor, rule)) {
        return true;
      }
    }

    return false;
  },

  /**
   * Get all accessible talent trees for an actor
   * @param {Actor} actor - The character actor
   * @param {Array<string>} candidateTrees - Trees to check access for
   * @returns {Promise<Array<string>>} Trees the actor can access
   */
  async getAccessibleTalentTrees(actor, candidateTrees) {
    const accessible = [];
    for (const treeId of candidateTrees) {
      if (await this.canAccessTalentTree(actor, treeId)) {
        accessible.push(treeId);
      }
    }
    return accessible;
  },

  _checkTalentTreeAccessRule(actor, rule) {
    switch (rule.type) {
      case 'class':
        // Class-based trees are handled by talent_tree_class_map.json
        // This is checked separately in the talent selection flow
        return false;

      case 'force-generic':
        // Force-generic trees require Force Sensitivity feat
        return actor.items.some(i =>
          i.type === 'feat' &&
          i.name.toLowerCase().includes('force sensitive')
        );

      case 'force-tradition':
        // Force-tradition trees require Force Sensitivity + tradition membership
        const hasForceSensitivity = actor.items.some(i =>
          i.type === 'feat' &&
          i.name.toLowerCase().includes('force sensitive')
        );

        if (!hasForceSensitivity) return false;

        // Check if character has the required tradition
        // Traditions are typically stored as feats or talents with tradition names
        const hasTradition = actor.items.some(i => {
          if (i.type === 'feat' || i.type === 'talent') {
            const itemName = i.name.toLowerCase();
            const traditionName = rule.requiresTradition.toLowerCase();
            return itemName.includes(traditionName) || i.system?.tradition === rule.requiresTradition;
          }
          return false;
        });

        return hasTradition;

      default:
        return false;
    }
  },

  async _loadTalentTreeAccessRules() {
    try {
      const response = await fetch('/data/talent_tree_access_rules.json');
      if (!response.ok) {
        SWSELogger.error('[TALENT-ACCESS] Failed to load talent_tree_access_rules.json');
        return null;
      }
      return await response.json();
    } catch (error) {
      SWSELogger.error('[TALENT-ACCESS] Error loading talent tree access rules:', error);
      return null;
    }
  },

  /* ============================================
   * UTIL
   * ============================================ */

  _normalizeId(doc) {
    return doc.flags?.swse?.id ?? doc.id;
  }
};

export default PrerequisiteRequirements;

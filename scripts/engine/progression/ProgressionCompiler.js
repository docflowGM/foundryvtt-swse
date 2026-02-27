/**
 * ProgressionCompiler — The v2 Heart
 *
 * Transform (snapshot + selections) → deterministic delta.
 *
 * This is the ONLY place where progression decisions and intent construction happen.
 *
 * Two-level interface:
 * - compileStep(stepId, selections) — high-level entry point (used by UI layers)
 * - compile(intent) — low-level entry point (internal to compiler)
 *
 * Architecture:
 * - UI layers (ManualStepProcessor, Generator) call compileStep() with canonical selections
 * - Compiler internally builds intent objects (UI never sees intent types)
 * - Intent types are private compiler implementation detail
 * - Output: pure delta { set, add, delete } with no side effects
 *
 * Phases:
 * Phase 1: Snapshot capture (read-only)
 * Phase 2: Build intent from selections (compiler internal)
 * Phase 3: Validate (PrerequisiteChecker)
 * Phase 4: Resolve (compile delta)
 * Phase 5: Apply (ActorEngine.applyDelta)
 * Phase 6: Derive (prepareDerivedData)
 */

import { PrerequisiteChecker } from "/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ProgressionCompiler {
  /**
   * High-level entry point: compile a build step by step ID and canonical selections.
   * This is what UI layers (ManualStepProcessor, Generator) should call.
   * The compiler owns all intent construction — UI never sees intent types.
   *
   * @param {Object} snapshot - frozen actor state
   * @param {string} stepId - step identifier (background, species, feats, talents, etc.)
   * @param {Object} selections - canonical selections (varies by step)
   * @param {Object} options - compilation options (freebuild, suppressWarnings, etc.)
   * @returns {Object} delta - { set, add, delete }
   * @throws if selections are invalid or prerequisites unmet
   */
  static compileStep(snapshot, stepId, selections, options = {}) {
    if (!snapshot) throw new Error('ProgressionCompiler.compileStep: no snapshot provided');
    if (!stepId) throw new Error('ProgressionCompiler.compileStep: no stepId provided');
    if (!selections) throw new Error('ProgressionCompiler.compileStep: no selections provided');

    swseLogger.debug('ProgressionCompiler.compileStep', { stepId, selections });

    // Compiler internally builds intent — UI never sees this
    const intent = this._buildIntentFromSelections(stepId, selections, options);

    // Then compile using internal pipeline
    return this._compileIntent(snapshot, intent, options);
  }

  /**
   * Build intent object from canonical selections.
   * This is the ONLY place where intent types are constructed.
   * UI layers must never do this.
   *
   * @private
   */
  static _buildIntentFromSelections(stepId, selections, options = {}) {
    const { freebuild = false } = options;

    switch (stepId) {
      case 'background':
        if (selections.freeform && selections.name) {
          return {
            type: 'setBackgroundFreeform',
            name: selections.name,
            freebuild
          };
        } else if (selections.id) {
          return {
            type: 'setBackground',
            backgroundId: selections.id,
            freebuild
          };
        }
        throw new Error('Background selections require either id or (name + freeform)');

      case 'species':
        return {
          type: 'setSpecies',
          speciesId: selections.id,
          freebuild
        };

      case 'abilities':
        return {
          type: 'setAbilities',
          scores: selections,
          freebuild
        };

      case 'class':
        if (selections.freeform && selections.name) {
          return {
            type: 'setClassFreeform',
            name: selections.name,
            freebuild
          };
        } else if (selections.id) {
          return {
            type: 'setClass',
            classId: selections.id,
            freebuild
          };
        }
        throw new Error('Class selections require either id or (name + freeform)');

      case 'skills':
        return {
          type: 'chooseSkill',
          skillIds: selections.skillIds || [],
          freebuild
        };

      case 'feats':
        return {
          type: 'chooseFeat',
          featIds: selections.featIds || [],
          freebuild
        };

      case 'talents':
        return {
          type: 'chooseTalent',
          talentIds: selections.talentIds || [],
          freebuild
        };

      case 'forceSecrets':
        return {
          type: 'setForceSecrets',
          secretIds: selections.secretIds || [],
          freebuild
        };

      case 'forceTechniques':
        return {
          type: 'setForceTechniques',
          techniqueIds: selections.techniqueIds || [],
          freebuild
        };

      case 'forcePowers':
        return {
          type: 'setForcePowers',
          powerIds: selections.powerIds || [],
          freebuild
        };

      default:
        throw new Error(`ProgressionCompiler: Unknown step ID "${stepId}"`);
    }
  }

  /**
   * INTERNAL: Compile from intent object.
   *
   * This is an internal method. UI layers must always use compileStep().
   * The intent object should never be directly constructed outside this class.
   *
   * @private
   * @param {Object} snapshot - frozen actor state
   * @param {Object} intent - { type, ...intent-specific fields }
   * @param {Object} options - compilation options
   * @returns {Object} delta - { set, add, delete }
   * @throws if intent is illegal
   */
  static _compileIntent(snapshot, intent, options = {}) {
    if (!snapshot) {throw new Error('ProgressionCompiler._compileIntent: no snapshot provided');}
    if (!intent) {throw new Error('ProgressionCompiler._compileIntent: no intent provided');}

    swseLogger.debug('ProgressionCompiler.compile', { intent });

    switch (intent.type) {
      // Build step selections (new)
      case 'setBackground':
        return this._compileSetBackground(snapshot, intent.backgroundId);

      case 'setBackgroundFreeform':
        return this._compileSetBackgroundFreeform(snapshot, intent.name);

      case 'setSpecies':
        return this._compileSetSpecies(snapshot, intent.speciesId);

      case 'setAbilities':
        return this._compileSetAbilities(snapshot, intent.scores);

      case 'setClass':
        return this._compileSetClass(snapshot, intent.classId);

      case 'setClassFreeform':
        return this._compileSetClassFreeform(snapshot, intent.name);

      case 'setForceSecrets':
        return this._compileSetForceSecrets(snapshot, intent.secretIds);

      case 'setForceTechniques':
        return this._compileSetForceTechniques(snapshot, intent.techniqueIds);

      case 'setForcePowers':
        return this._compileSetForcePowers(snapshot, intent.powerIds);

      // Existing selections (updated to support multi-item)
      case 'chooseTalent':
        return this._compileChooseTalent(snapshot, intent.talentIds || [intent.talentId]);

      case 'chooseFeat':
        return this._compileChooseFeat(snapshot, intent.featIds || [intent.featId]);

      case 'chooseSkill':
        return this._compileChooseSkill(snapshot, intent.skillIds || [intent.skillId]);

      case 'levelUp':
        return this._compileLevelUp(snapshot, intent.classId);

      default:
        throw new Error(`ProgressionCompiler: Unknown intent type "${intent.type}"`);
    }
  }

  /**
   * Compile background selection (from list).
   * @private
   */
  static _compileSetBackground(snapshot, backgroundId) {
    // TODO: Validate background exists in system
    // For now, simple validation
    if (!backgroundId) throw new Error('Background ID required');

    return {
      set: {
        'system.background': {
          id: backgroundId,
          source: 'manual'
        }
      }
    };
  }

  /**
   * Compile background (freeform text entry).
   * @private
   */
  static _compileSetBackgroundFreeform(snapshot, name) {
    if (!name || typeof name !== 'string') {
      throw new Error('Background name required');
    }

    return {
      set: {
        'system.background': {
          name: name.trim(),
          freeform: true,
          source: 'manual'
        }
      }
    };
  }

  /**
   * Compile species selection.
   * @private
   */
  static _compileSetSpecies(snapshot, speciesId) {
    if (!speciesId) throw new Error('Species ID required');

    // TODO: Validate species exists in system
    return {
      set: {
        'system.species': {
          id: speciesId,
          source: 'manual'
        }
      }
    };
  }

  /**
   * Compile ability scores (bulk set for character creation).
   * @private
   */
  static _compileSetAbilities(snapshot, scores) {
    if (!scores || typeof scores !== 'object') {
      throw new Error('Ability scores object required');
    }

    const required = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const updates = {};

    for (const ability of required) {
      const score = scores[ability];
      if (typeof score !== 'number' || score < 1 || score > 20) {
        throw new Error(
          `Ability ${ability.toUpperCase()} must be number 1-20, got ${score}`
        );
      }
      updates[`system.attributes.${ability}.base`] = score;
    }

    return { set: updates };
  }

  /**
   * Compile class selection (from list).
   * @private
   */
  static _compileSetClass(snapshot, classId) {
    if (!classId) throw new Error('Class ID required');

    // TODO: Validate class exists in system
    return {
      set: {
        'system.class': {
          id: classId,
          source: 'manual'
        }
      }
    };
  }

  /**
   * Compile class (freeform text entry).
   * @private
   */
  static _compileSetClassFreeform(snapshot, name) {
    if (!name || typeof name !== 'string') {
      throw new Error('Class name required');
    }

    return {
      set: {
        'system.class': {
          name: name.trim(),
          freeform: true,
          source: 'manual'
        }
      }
    };
  }

  /**
   * Compile force secrets selection (array).
   * @private
   */
  static _compileSetForceSecrets(snapshot, secretIds) {
    const ids = Array.isArray(secretIds) ? secretIds : [];

    if (ids.length === 0) {
      throw new Error('At least one force secret required');
    }

    // TODO: Validate each secret exists + prerequisites met
    // For now, basic validation
    return {
      add: {
        forceSecrets: ids
      }
    };
  }

  /**
   * Compile force techniques selection (array).
   * @private
   */
  static _compileSetForceTechniques(snapshot, techniqueIds) {
    const ids = Array.isArray(techniqueIds) ? techniqueIds : [];

    if (ids.length === 0) {
      throw new Error('At least one force technique required');
    }

    // TODO: Validate each technique exists + prerequisites met
    return {
      add: {
        forceTechniques: ids
      }
    };
  }

  /**
   * Compile force powers selection (array).
   * @private
   */
  static _compileSetForcePowers(snapshot, powerIds) {
    const ids = Array.isArray(powerIds) ? powerIds : [];

    if (ids.length === 0) {
      throw new Error('At least one force power required');
    }

    // TODO: Validate each power exists + prerequisites met
    return {
      add: {
        forcePowers: ids
      }
    };
  }

  /**
   * Compile talent selection (supports multi-item).
   * @private
   */
  static _compileChooseTalent(snapshot, talentIds) {
    const ids = Array.isArray(talentIds) ? talentIds : [talentIds];

    if (ids.length === 0) {
      throw new Error('At least one talent required');
    }

    // Phase 2: Validate each talent
    for (const talentId of ids) {
      const prereq = PrerequisiteChecker.checkPrerequisites(snapshot, 'talent', talentId);
      if (!prereq.met) {
        throw new Error(
          `Talent "${talentId}" is illegal: ${prereq.missing.join(', ')}`
        );
      }
    }

    // Phase 3: Resolve
    return {
      add: {
        talents: ids
      }
    };
  }

  /**
   * Compile feat selection (supports multi-item).
   * @private
   */
  static _compileChooseFeat(snapshot, featIds) {
    const ids = Array.isArray(featIds) ? featIds : [featIds];

    if (ids.length === 0) {
      throw new Error('At least one feat required');
    }

    // Phase 2: Validate each feat
    for (const featId of ids) {
      const prereq = PrerequisiteChecker.checkPrerequisites(snapshot, 'feat', featId);
      if (!prereq.met) {
        throw new Error(
          `Feat "${featId}" is illegal: ${prereq.missing.join(', ')}`
        );
      }
    }

    // Phase 3: Resolve
    return {
      add: {
        feats: ids
      }
    };
  }

  /**
   * Compile skill training (supports multi-item).
   * @private
   */
  static _compileChooseSkill(snapshot, skillIds) {
    const ids = Array.isArray(skillIds) ? skillIds : [skillIds];

    if (ids.length === 0) {
      throw new Error('At least one skill required');
    }

    // Phase 2: Validate skill point budget
    const usedSkillPoints = snapshot.trainedSkills?.length || 0;
    const skillPointsPerLevel = 4; // SWSE core rule
    const availableSkillPoints = (snapshot.level || 1) * skillPointsPerLevel - usedSkillPoints;

    if (ids.length > availableSkillPoints) {
      throw new Error(
        `Not enough skill points. Available: ${availableSkillPoints}, Requested: ${ids.length}`
      );
    }

    // Phase 3: Resolve
    return {
      add: {
        skills: ids
      }
    };
  }

  /**
   * Compile level-up (gaining a class level).
   * @private
   */
  static _compileLevelUp(snapshot, classId) {
    // Phase 2: Validate prestige requirements if applicable
    // (This is handled by the UI layer, but we can double-check here)

    // Phase 3: Resolve
    return {
      set: {
        'system.progression.level': (snapshot.level || 1) + 1
      },
      add: {
        classLevels: [{ classId, level: 1 }]
      }
    };
  }
}

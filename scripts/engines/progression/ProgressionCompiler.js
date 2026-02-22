/**
 * ProgressionCompiler — The v2 Heart
 *
 * Transform (snapshot + intent) → deterministic delta.
 *
 * This is the ONLY place where progression decisions are made.
 * Input: frozen snapshot of actor state + player intent
 * Output: pure delta (no side effects, no mutations)
 *
 * Phases:
 * Phase 1: Snapshot capture (read-only)
 * Phase 2: Validate (PrerequisiteEngine)
 * Phase 3: Resolve (compile delta)
 * Phase 4: Apply (ActorEngine.applyDelta)
 * Phase 5: Derive (prepareDerivedData)
 */

import { PrerequisiteChecker } from '../../data/prerequisite-checker.js';
import { swseLogger } from '../../utils/logger.js';

export class ProgressionCompiler {
  /**
   * Compile progression intent to delta.
   * No logic beyond calling PrerequisiteEngine + building output.
   *
   * @param {Object} snapshot - frozen actor state
   * @param {Object} intent - { type, talentId | featId | classId | ... }
   * @returns {Object} delta - { set, add, delete }
   * @throws if intent is illegal
   */
  static compile(snapshot, intent) {
    if (!snapshot) {throw new Error('ProgressionCompiler.compile: no snapshot provided');}
    if (!intent) {throw new Error('ProgressionCompiler.compile: no intent provided');}

    swseLogger.debug('ProgressionCompiler.compile', { intent });

    switch (intent.type) {
      case 'chooseTalent':
        return this._compileChooseTalent(snapshot, intent.talentId);

      case 'chooseFeat':
        return this._compileChooseFeat(snapshot, intent.featId);

      case 'chooseSkill':
        return this._compileChooseSkill(snapshot, intent.skillId);

      case 'levelUp':
        return this._compileLevelUp(snapshot, intent.classId);

      default:
        throw new Error(`ProgressionCompiler: Unknown intent type "${intent.type}"`);
    }
  }

  /**
   * Compile talent selection.
   * @private
   */
  static _compileChooseTalent(snapshot, talentId) {
    // Phase 2: Validate
    const prereq = PrerequisiteChecker.checkPrerequisites(snapshot, 'talent', talentId);
    if (!prereq.met) {
      throw new Error(
        `Talent "${talentId}" is illegal: ${prereq.missing.join(', ')}`
      );
    }

    // Phase 3: Resolve (deterministic)
    return {
      add: {
        talents: [talentId]
      }
    };
  }

  /**
   * Compile feat selection.
   * @private
   */
  static _compileChooseFeat(snapshot, featId) {
    // Phase 2: Validate
    const prereq = PrerequisiteChecker.checkPrerequisites(snapshot, 'feat', featId);
    if (!prereq.met) {
      throw new Error(
        `Feat "${featId}" is illegal: ${prereq.missing.join(', ')}`
      );
    }

    // Phase 3: Resolve
    return {
      add: {
        feats: [featId]
      }
    };
  }

  /**
   * Compile skill training.
   * @private
   */
  static _compileChooseSkill(snapshot, skillId) {
    // Phase 2: Validate (simple validation: do we have skill points left?)
    const usedSkillPoints = snapshot.trainedSkills?.length || 0;
    const skillPointsPerLevel = 4; // SWSE core rule
    const availableSkillPoints = (snapshot.level || 1) * skillPointsPerLevel - usedSkillPoints;

    if (availableSkillPoints <= 0) {
      throw new Error('No skill points available');
    }

    // Phase 3: Resolve
    return {
      add: {
        skills: [skillId]
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

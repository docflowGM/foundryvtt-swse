/**
 * DEPRECATED: ActorProgressionUpdater.finalize(actor)
 *
 * v2 NOTE: This file is kept for backward compatibility but is being phased out.
 * Math computation (HP, BAB, Defenses) has moved to DerivedCalculator.
 * Actor mutation now goes through ActorEngine.applyDelta().
 *
 * Deprecated imports removed.
 */

import { PROGRESSION_RULES } from '../data/progression-data.js';
import { swseLogger } from '../../utils/logger.js';

export class ActorProgressionUpdater {
  /**
   * finalize(actor) - DEPRECATED v1 compatibility shim
   *
   * v2 note: This now only handles progression-owned state updates.
   * Math (HP, BAB, defenses) is now computed by DerivedCalculator in prepareDerivedData.
   * Actor mutation should use ActorEngine.applyDelta() instead.
   *
   * Kept for backward compatibility with existing progression code.
   */
  static async finalize(actor) {
    const prog = actor.system.progression || {};
    const updates = {};

    try {
      // ---- Progression-owned fields only (no math) ----

      // Set total level
      const classLevels = prog.classLevels || [];
      if (classLevels.length > 0) {
        updates['system.level'] = classLevels.length;
      }

      // Apply species data
      if (prog.species) {
        const speciesData = PROGRESSION_RULES.species[prog.species];
        if (speciesData) {
          updates['system.race'] = prog.species;
          if (speciesData.size) {updates['system.size'] = speciesData.size;}
          if (speciesData.speed !== undefined) {updates['system.speed'] = speciesData.speed;}
        }
      }

      // Mark force sensitivity
      const { getClassData } = await import('../utils/class-data-loader.js');
      let isForceSensitive = false;

      for (const cl of classLevels) {
        const hardcodedClass = PROGRESSION_RULES.classes[cl.class];
        if (hardcodedClass?.forceSensitive) {
          isForceSensitive = true;
          break;
        }
        const compendiumClass = await getClassData(cl.class);
        if (compendiumClass?.forceSensitive) {
          isForceSensitive = true;
          break;
        }
      }

      const hasForceTrainingFeat = (prog.feats || []).some(f =>
        f.toLowerCase().includes('force sensitivity') ||
        f.toLowerCase().includes('force training')
      );
      const hasForceStartingFeat = (prog.startingFeats || []).some(f =>
        f.toLowerCase().includes('force sensitivity')
      );

      if (isForceSensitive || hasForceTrainingFeat || hasForceStartingFeat) {
        updates['system.forceSensitive'] = true;
      }

      // Track progression state in flags (for auditing)
      updates['flags.swse.appliedFeats'] = prog.feats || [];
      updates['flags.swse.appliedTalents'] = prog.talents || [];
      updates['flags.swse.trainedSkills'] = prog.trainedSkills || [];

      // Apply updates
      if (Object.keys(updates).length > 0) {
        if (globalThis.SWSE?.ActorEngine?.updateActor) {
          await globalThis.SWSE.ActorEngine.updateActor(actor, updates);
        } else if (window.SWSE?.ActorEngine?.updateActor) {
          await window.SWSE.ActorEngine.updateActor(actor, updates);
        } else {
          swseLogger.warn('ActorProgressionUpdater: ActorEngine not available, using direct update');
          await actor.update(updates);
        }
        swseLogger.log(`ActorProgressionUpdater.finalize (v1 compat): Applied ${Object.keys(updates).length} progression updates to ${actor.name}`);
      }

    } catch (err) {
      swseLogger.error('ActorProgressionUpdater.finalize failed:', err);
      throw err;
    }
  }
}

/**
 * SWSE Derived Stats Auto-Calculation
 * Recalculates derived combat stats and defenses after progression changes
 */

import { swseLogger } from '../../../../utils/logger.js';
import { ActorEngine } from '../../../../governance/actor-engine/actor-engine.js';

/**
 * Recalculate all derived stats for an actor
 * @param {Actor} actor - The actor to update
 * @returns {Promise<void>}
 */
export async function recalcDerivedStats(actor) {
  if (!actor) {
    swseLogger.warn('recalcDerivedStats: No actor provided');
    return;
  }

  const sys = actor.system;

  // Get base ability modifiers
  const bab = sys.combat?.bab ?? 0;
  const dex = sys.abilities?.dex?.mod ?? 0;
  const wis = sys.abilities?.wis?.mod ?? 0;
  const cha = sys.abilities?.cha?.mod ?? 0;
  const str = sys.abilities?.str?.mod ?? 0;
  const con = sys.abilities?.con?.mod ?? 0;

  const updates = {
    'system.combat.meleeAttack': bab + str,
    'system.combat.rangedAttack': bab + dex,
    'system.skills.perception.miscMod': wis,
    'system.skills.initiative.miscMod': dex,
    'system.defenses.reflex.base': dex,
    'system.defenses.will.base': wis,
    'system.defenses.fortitude.base': con
  };

  try {
    // PHASE 3: Route through ActorEngine
  await ActorEngine.updateActor(actor, updates);
    swseLogger.log(`Derived stats recalculated for ${actor.name}`);
  } catch (err) {
    swseLogger.error('Failed to recalculate derived stats:', err);
    throw err;
  }
}

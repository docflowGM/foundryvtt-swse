/**
 * Nonheroic Session Seeding Helper
 *
 * Uses existing nonheroic rule sources (NpcProgressionEngine, TalentCadenceEngine, level-split)
 * to seed nonheroic session state.
 *
 * Phase 2: Wraps existing helpers to avoid duplication.
 * Does not invent nonheroic rules; consumes them from authoritative sources.
 */

import { swseLogger } from '../../../utils/logger.js';

/**
 * Seed nonheroic session state from actor and class-item authorities.
 *
 * @param {ProgressionSession} session
 * @param {Actor} actor
 * @param {string} mode - 'chargen' | 'levelup'
 * @returns {Promise<void>}
 */
export async function seedNonheroicSession(session, actor, mode) {
  if (!actor) {
    swseLogger.debug('[NonheroicSessionSeeder] No actor context');
    return;
  }

  try {
    // Phase 2: Detect nonheroic class items from actor
    // Use class-item isNonheroic flag as authority
    const nonheroicClasses = actor.items
      ?.filter(item => item.type === 'class' && item.system?.isNonheroic === true)
      ?.map(item => ({
        id: item.id,
        name: item.name,
        level: actor.system?.classes?.[item.id]?.level || 1,
        isNonheroic: true,
      })) || [];

    swseLogger.debug('[NonheroicSessionSeeder] Found nonheroic classes', {
      count: nonheroicClasses.length,
      classes: nonheroicClasses.map(c => c.name),
    });

    // Phase 2: Store nonheroic class info in session metadata
    // (Can be used for projected state, summary, and mutation contribution)
    session.nonheroicContext = {
      nonheroicClasses,
      hasNonheroic: nonheroicClasses.length > 0,
      totalNonheroicLevel: nonheroicClasses.reduce((sum, c) => sum + c.level, 0),
    };

    swseLogger.debug('[NonheroicSessionSeeder] Nonheroic session state seeded', {
      hasNonheroic: session.nonheroicContext.hasNonheroic,
      totalNonheroicLevel: session.nonheroicContext.totalNonheroicLevel,
    });
  } catch (err) {
    swseLogger.error('[NonheroicSessionSeeder] Error seeding nonheroic session:', err);
  }
}

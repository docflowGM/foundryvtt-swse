/**
 * Nonheroic Session Seeding Helper
 *
 * Uses existing nonheroic rule sources (class-item isNonheroic flag, beast metadata)
 * to seed nonheroic session state.
 *
 * Phase 2: Wraps existing helpers to avoid duplication.
 * Phase 2 Expansion: Includes Beast as a nonheroic profile/variant.
 * Does not invent nonheroic or beast rules; consumes them from authoritative sources.
 */

import { swseLogger } from '../../../utils/logger.js';

/**
 * Nonheroic profile/variant enum
 */
export const NonheroicProfile = Object.freeze({
  STANDARD: 'standard',  // Normal nonheroic NPC
  BEAST: 'beast',        // Beast-type nonheroic (from flags.swse.beastData)
});

/**
 * Seed nonheroic session state from actor and class-item authorities.
 * Also detects Beast profile if present.
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

    // Phase 2 Expansion: Detect Beast profile
    // Canonical marker: flags.swse.beastData exists
    const hasBeastMetadata = !!actor.flags?.swse?.beastData;
    const beastProfile = hasBeastMetadata ? NonheroicProfile.BEAST : NonheroicProfile.STANDARD;

    swseLogger.debug('[NonheroicSessionSeeder] Found nonheroic classes and profile', {
      classCount: nonheroicClasses.length,
      classes: nonheroicClasses.map(c => c.name),
      profile: beastProfile,
      hasBeastData: hasBeastMetadata,
    });

    // Phase 2: Store nonheroic class info in session metadata
    // Phase 2 Expansion: Include beast profile
    // (Can be used for projected state, summary, and mutation contribution)
    session.nonheroicContext = {
      nonheroicClasses,
      hasNonheroic: nonheroicClasses.length > 0,
      totalNonheroicLevel: nonheroicClasses.reduce((sum, c) => sum + c.level, 0),
      profile: beastProfile,
      isBeast: beastProfile === NonheroicProfile.BEAST,
      beastData: actor.flags?.swse?.beastData || null,
    };

    swseLogger.debug('[NonheroicSessionSeeder] Nonheroic session state seeded', {
      hasNonheroic: session.nonheroicContext.hasNonheroic,
      totalNonheroicLevel: session.nonheroicContext.totalNonheroicLevel,
      profile: session.nonheroicContext.profile,
    });
  } catch (err) {
    swseLogger.error('[NonheroicSessionSeeder] Error seeding nonheroic session:', err);
  }
}

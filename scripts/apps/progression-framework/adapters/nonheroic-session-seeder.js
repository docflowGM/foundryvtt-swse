/**
 * Nonheroic Session Seeding Helper
 *
 * Nonheroic can be explicit (a Nonheroic class item already exists) or implicit
 * during chargen/minion creation. Minions share nonheroic chargen but are owner-
 * synced after creation instead of getting manual level-up branches.
 */

import { swseLogger } from '../../../utils/logger.js';

export const NonheroicProfile = Object.freeze({
  STANDARD: 'standard',
  BEAST: 'beast',
  MINION: 'minion',
});

function isMinionActor(actor) {
  return actor?.system?.isMinion === true
    || actor?.system?.progression?.isMinion === true
    || actor?.flags?.swse?.minion?.isMinion === true
    || actor?.getFlag?.('foundryvtt-swse', 'isMinion') === true
    || actor?.system?.npcProfile?.kind === 'minion'
    || actor?.system?.npcProfile?.kind === 'privateer';
}

function hasNonheroicSubtype(actor) {
  return actor?.system?.swse?.progressionSubtype === 'nonheroic'
    || actor?.system?.progressionSubtype === 'nonheroic'
    || actor?.flags?.swse?.progressionSubtype === 'nonheroic'
    || actor?.system?.npcProfile?.legalProfile === 'nonheroic'
    || actor?.system?.npcProfile?.kind === 'nonheroic';
}

export async function seedNonheroicSession(session, actor, mode) {
  if (!actor) {
    swseLogger.debug('[NonheroicSessionSeeder] No actor context');
    return;
  }

  try {
    const itemArray = Array.from(actor.items || []);
    const nonheroicClasses = itemArray
      .filter(item => item.type === 'class' && item.system?.isNonheroic === true)
      .map(item => ({
        id: item.id,
        name: item.name,
        level: actor.system?.classes?.[item.id]?.level || actor.system?.level || 1,
        isNonheroic: true,
      }));

    const hasBeastMetadata = !!actor.flags?.swse?.beastData
      || actor?.system?.npcProfile?.kind === 'beast'
      || actor?.system?.npcProfile?.kind === 'mount'
      || actor?.system?.npcProfile?.legalProfile === 'beast'
      || actor?.system?.npcProfile?.legalProfile === 'mount';
    const isMinion = isMinionActor(actor) || session?.dependencyContext?.dependentKind === 'minion';
    const implicitNonheroic = nonheroicClasses.length === 0
      && actor.type === 'npc'
      && (mode === 'chargen' || mode === 'levelup' || isMinion || hasBeastMetadata || hasNonheroicSubtype(actor));

    if (implicitNonheroic) {
      nonheroicClasses.push({
        id: 'nonheroic-implicit',
        name: 'Nonheroic',
        level: Math.max(1, Number(actor.system?.level || 1)),
        isNonheroic: true,
        implicit: true,
      });
    }

    const profile = isMinion
      ? NonheroicProfile.MINION
      : hasBeastMetadata
        ? NonheroicProfile.BEAST
        : NonheroicProfile.STANDARD;

    session.nonheroicContext = {
      nonheroicClasses,
      hasNonheroic: nonheroicClasses.length > 0,
      totalNonheroicLevel: nonheroicClasses.reduce((sum, c) => sum + Number(c.level || 0), 0),
      profile,
      isBeast: profile === NonheroicProfile.BEAST,
      isMinion: profile === NonheroicProfile.MINION,
      isImplicit: implicitNonheroic,
      beastData: actor.flags?.swse?.beastData || null,
      manualLevelUpAllowed: profile !== NonheroicProfile.MINION,
    };

    swseLogger.debug('[NonheroicSessionSeeder] Nonheroic session state seeded', {
      hasNonheroic: session.nonheroicContext.hasNonheroic,
      totalNonheroicLevel: session.nonheroicContext.totalNonheroicLevel,
      profile: session.nonheroicContext.profile,
      implicitNonheroic,
    });
  } catch (err) {
    swseLogger.error('[NonheroicSessionSeeder] Error seeding nonheroic session:', err);
  }
}

/**
 * Nonheroic Session Seeding Helper
 *
 * Nonheroic can be explicit (a Nonheroic class item already exists) or implicit
 * during chargen/minion creation. Minions share nonheroic chargen but are owner-
 * synced after creation instead of getting manual level-up branches.
 */

import { swseLogger } from '../../../utils/logger.js';
import { getLevelSplit } from '/systems/foundryvtt-swse/scripts/actors/derived/level-split.js';
import { buildNonheroicClassSelection, isNonheroicClassRef } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/nonheroic-class-model.js';

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
    const classItems = itemArray.filter(item => item.type === 'class');
    const hasHeroicClassItem = classItems.some(item => item.system?.isNonheroic !== true);

    // Class levels come ONLY from the embedded class item's own history. Never
    // substitute the actor's total level for an existing class item (that would
    // count heroic levels as nonheroic on a Nonheroic/Soldier NPC). A class item
    // with no readable level is reported (levelMissing) and counted as 0 rather
    // than fabricated.
    const nonheroicClasses = classItems
      .filter(item => item.system?.isNonheroic === true)
      .map(item => {
        const rawLevel = item.system?.level;
        const level = Number(rawLevel);
        const levelMissing = rawLevel === undefined || rawLevel === null || rawLevel === '' || !Number.isFinite(level) || level < 0;
        return {
          id: item.id,
          name: item.name,
          level: levelMissing ? 0 : level,
          levelMissing,
          isNonheroic: true,
        };
      });

    const hasBeastMetadata = !!actor.flags?.swse?.beastData
      || actor?.system?.npcProfile?.kind === 'beast'
      || actor?.system?.npcProfile?.kind === 'mount'
      || actor?.system?.npcProfile?.legalProfile === 'beast'
      || actor?.system?.npcProfile?.legalProfile === 'mount';
    const isMinion = isMinionActor(actor) || session?.dependencyContext?.dependentKind === 'minion';

    // Implicit Nonheroic requires an EXPLICIT nonheroic designation (session
    // subtype, minion/beast dependency, or stored nonheroic profile) - the
    // adapter also handles 'standard'/'imported-statblock', which must never be
    // reinterpreted as Nonheroic merely because the actor is an NPC. It never
    // applies to an actor that already has heroic class items: that actor's
    // track is established by its class history.
    const implicitNonheroic = nonheroicClasses.length === 0
      && !hasHeroicClassItem
      && actor.type === 'npc'
      && (session?.subtype === 'nonheroic' || isMinion || hasBeastMetadata || hasNonheroicSubtype(actor));

    if (implicitNonheroic) {
      // No class history exists at all, so there is no per-class level to read.
      // Chargen establishes level 1 when the canonical class selection is
      // committed below; outside chargen the actor's recorded level is the only
      // level record for an actor with zero class items.
      const implicitLevel = mode === 'chargen' ? 0 : Math.max(0, Number(actor.system?.level || 0) || 0);
      nonheroicClasses.push({
        id: 'nonheroic-implicit',
        name: 'Nonheroic',
        level: implicitLevel,
        isNonheroic: true,
        implicit: true,
      });
    }

    // Level split authority (heroic vs nonheroic vs total) = getLevelSplit().
    const split = getLevelSplit(actor);

    const profile = isMinion
      ? NonheroicProfile.MINION
      : hasBeastMetadata
        ? NonheroicProfile.BEAST
        : NonheroicProfile.STANDARD;

    session.nonheroicContext = {
      nonheroicClasses,
      hasNonheroic: nonheroicClasses.length > 0,
      totalNonheroicLevel: implicitNonheroic
        ? nonheroicClasses.reduce((sum, c) => sum + Number(c.level || 0), 0)
        : split.nonheroicLevel,
      heroicLevel: split.heroicLevel,
      totalClassLevel: split.totalLevel,
      hasMissingClassLevels: nonheroicClasses.some(c => c.levelMissing === true),
      profile,
      isBeast: profile === NonheroicProfile.BEAST,
      isMinion: profile === NonheroicProfile.MINION,
      isImplicit: implicitNonheroic,
      beastData: actor.flags?.swse?.beastData || null,
      manualLevelUpAllowed: profile !== NonheroicProfile.MINION,
    };

    // NPC-001: the class-selection step is suppressed for Nonheroic chargen, so
    // the canonical class identity is committed here through the session's own
    // validated commit path (same shape ClassStep commits via normalizeClass()).
    // Heroic chargen is untouched: this runs only for the implicit Nonheroic track.
    if (implicitNonheroic && mode === 'chargen' && typeof session?.commitSelection === 'function') {
      const existing = session.draftSelections?.class;
      if (!isNonheroicClassRef(existing)) {
        const committed = session.commitSelection(
          'nonheroic-implicit-class',
          'class',
          buildNonheroicClassSelection({ level: 1 }),
        );
        if (!committed) {
          swseLogger.error('[NonheroicSessionSeeder] Failed to commit canonical Nonheroic class selection');
        }
      }
    }

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

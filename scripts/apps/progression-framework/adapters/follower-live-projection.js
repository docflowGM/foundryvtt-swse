/**
 * Live follower projection (V2 realignment 3N, finding F-PAT-001/F-NPC-007).
 * Formerly installed at runtime on FollowerSubtypeAdapter.prototype by scripts/patches/follower-progression-live-state-hotfix.js; moved verbatim.
 * `projected` is the base adapter's projection; returns it enriched with the derived follower state (abilities, languages, defenses, hp).
 */
import { deriveFollowerStateForApply, getFollowerDerivationContext } from './follower-deriver.js';
import { uniqueLanguageNames } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/follower-steps/follower-language-owner-constraint.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export async function buildLiveFollowerProjection(projected, session, actor) {
  if (!session?.dependencyContext) return projected;

  const owner = game.actors?.get(session.dependencyContext.ownerActorId) || actor || null;
  if (!owner) return projected;

  try {
    const existingFollower = session.dependencyContext.existingFollowerId
      ? game.actors?.get(session.dependencyContext.existingFollowerId)
      : null;
    const context = await getFollowerDerivationContext(session, owner, existingFollower);
    if (!context?.templateType || !context?.speciesName) return projected;

    const state = await deriveFollowerStateForApply(
      context.ownerHeroicLevel,
      context.speciesName,
      context.templateType,
      context.persistentChoices,
    );

    projected.attributes = Object.fromEntries(ABILITY_KEYS.map((key) => {
      const ability = state.abilities?.[key] || {};
      const score = Number(ability.base ?? ability.score ?? ability.value ?? (key === 'con' && ability.absent ? 0 : 10));
      const modifier = Number(ability.mod ?? Math.floor((score - 10) / 2));
      return [key, {
        ...(projected.attributes?.[key] || {}),
        base: score,
        score,
        value: score,
        modifier: Number.isFinite(modifier) ? modifier : 0,
        mod: Number.isFinite(modifier) ? modifier : 0,
        absent: ability.absent === true,
      }];
    }));

    projected.identity = {
      ...(projected.identity || {}),
      species: context.speciesName,
    };

    const draft = session.draftSelections || {};
    const languageChoices = uniqueLanguageNames([
      draft.followerKnownLanguages,
      draft.languageChoices,
      draft.followerLanguages,
      context.persistentChoices?.languageChoices,
    ]);
    projected.languages = languageChoices;

    projected.metadata = {
      ...(projected.metadata || {}),
      isFollower: true,
      followerOwnerHeroicLevel: context.ownerHeroicLevel,
      followerTargetLevel: state.level,
      followerTemplate: context.templateType,
      followerAbilityChoice: context.persistentChoices?.abilityChoice || null,
      followerSpecies: context.speciesName,
      isNewFollower: context.existenceState?.isNew === true,
    };

    projected.follower = {
      ...(projected.follower || {}),
      templateType: context.templateType,
      speciesName: context.speciesName,
      abilityChoice: context.persistentChoices?.abilityChoice || null,
      abilities: state.abilities,
      defenses: state.defenses,
      hp: state.hp,
    };
  } catch (err) {
    swseLogger.warn('[FollowerProgressionLiveState] Could not build live follower projection', {
      owner: owner?.name || null,
      error: err?.message || String(err),
    });
  }

  return projected;
}

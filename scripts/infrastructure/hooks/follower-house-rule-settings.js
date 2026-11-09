/**
 * Follower house-rule world settings (GM only). Rules live in
 * scripts/domain/followers/follower-house-rules.js; a change re-runs the
 * existing slot and enhancement reconciliation for every follower owner, so
 * nothing here duplicates that logic.
 */
import { FOLLOWER_MAX_SETTING, FOLLOWER_SHARE_SETTING, FOLLOWER_CAP_CHOICES, DEFAULT_FOLLOWER_CAP, effectiveFollowerGrantConfig, ownedRecruitingTalentNames } from '/systems/foundryvtt-swse/scripts/domain/followers/follower-house-rules.js';

async function reconcileAllOwners() {
  if (game.user?.isGM !== true) return;
  const { reconcileFollowerSlotsForActor, reconcileFollowerEnhancementsForActor } = await import('/systems/foundryvtt-swse/scripts/infrastructure/hooks/follower-hooks.js');
  for (const actor of game.actors ?? []) {
    if (!['character', 'droid'].includes(actor.type)) continue;
    try {
      await reconcileFollowerSlotsForActor(actor);
      await reconcileFollowerEnhancementsForActor(actor);
    } catch (error) {
      console.warn(`[SWSE] Follower house-rule reconcile failed for ${actor.name}`, error);
    }
  }
}

export function registerFollowerHouseRuleSettings() {
  game.settings.register('foundryvtt-swse', FOLLOWER_MAX_SETTING, {
    name: 'Maximum Followers',
    hint: 'Combined cap on followers recruited through Inspire Loyalty, Reconnaissance Team Leader and Commanding Officer. Talents stay selectable at the cap; existing followers are never deleted when the cap is lowered (the GM is warned).',
    scope: 'world', config: true, type: String,
    choices: FOLLOWER_CAP_CHOICES, default: DEFAULT_FOLLOWER_CAP,
    onChange: () => { reconcileAllOwners(); },
  });
  game.settings.register('foundryvtt-swse', FOLLOWER_SHARE_SETTING, {
    name: 'Shared Follower Benefits',
    hint: 'OFF: each follower gets only its recruiting talent\'s extra training and proficiencies. ON: every follower gets the combined benefits of all recruiting talents the leader owns; Armor Proficiency grants stack Light, then Medium, then Heavy.',
    scope: 'world', config: true, type: Boolean, default: false,
    onChange: () => { reconcileAllOwners(); },
  });
}

/** Shared-benefit setting, read at the moment a follower is built or reconciled. */
export function followerSharedBenefitsEnabled() {
  return game.settings?.get?.('foundryvtt-swse', FOLLOWER_SHARE_SETTING) === true;
}

/** The grant config a follower of `owner` should use for its recruiting talent under the current house rules. */
export function resolveEffectiveGrantConfig(owner, baseCfg, talentName) {
  return effectiveFollowerGrantConfig(baseCfg, talentName, ownedRecruitingTalentNames(owner?.items), { shared: followerSharedBenefitsEnabled() });
}

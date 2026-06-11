/**
 * Follower Session Seeding Helper
 *
 * Seeds the progression session with follower-specific dependency context.
 * Validates entitlement from owner's follower slots and computes heroic-level parity.
 *
 * Phase 3: Dependent participant session seeding.
 * Does not invent follower rules; reuses existing slot/entitlement/advancement logic.
 */

import { swseLogger } from '../../../utils/logger.js';
import { getHeroicLevel } from '../../../actors/derived/level-split.js';
import { computeFollowerAdvancementPlan } from './follower-advancer.js';
import { getFollowerTalentConfig } from '/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js';

function _isFollowerSlot(slot) {
  return !slot?.dependentKind || slot.dependentKind === 'follower';
}

function _applyFollowerTalentDefaults(choices = {}, cfg = null) {
  const next = { ...(choices || {}) };
  const profile = cfg?.fixedFollowerProfile || null;
  if (!profile) return next;

  next.fixedFollowerProfile = structuredClone(profile);
  next.followerKind = profile.followerKind || next.followerKind || 'living';
  next.speciesName = profile.speciesName || next.speciesName || null;
  next.speciesId = profile.speciesId || null;
  next.speciesSelection = {
    id: profile.id,
    name: profile.speciesName,
    speciesType: profile.speciesType,
    size: profile.size,
    speed: profile.speed,
    movement: profile.movement
  };
  next.abilityChoice = profile.noTemplateAbilityBonus ? null : next.abilityChoice ?? null;
  next.droidConfig = null;
  if (profile.noStartingCredits || cfg?.noStartingCredits) {
    next.startingCredits = 0;
    next.startingCreditsMode = 'none';
    next.startingCreditsFormula = null;
  }
  if (profile.skipBackground || cfg?.skipBackground) {
    next.backgroundChoice = null;
    next.backgroundSelection = null;
  }
  if (profile.skipLanguages || cfg?.skipLanguages) {
    next.languageChoices = [];
  }
  return next;
}

/**
 * Seed follower dependency context into a progression session
 *
 * @param {ProgressionSession} session - The session to seed
 * @param {Actor} ownerActor - The owner/granting actor
 * @param {string|null} slotId - Specific follower slot to use (if multiple slots available)
 * @param {string|null} existingFollowerId - If advancing existing follower, its actor ID
 * @returns {Promise<boolean>} True if seeding succeeded, false if not entitled/invalid
 */
export async function seedFollowerSession(session, ownerActor, slotId = null, existingFollowerId = null) {
  if (!ownerActor || !session) {
    swseLogger.debug('[FollowerSessionSeeder] Missing context');
    return false;
  }

  try {
    // Get follower slots from owner flags
    const slots = (ownerActor.getFlag('foundryvtt-swse', 'followerSlots') || []).filter(_isFollowerSlot);

    if (!slots || slots.length === 0) {
      swseLogger.warn('[FollowerSessionSeeder] Owner has no follower slots', {
        owner: ownerActor.name
      });
      return false;
    }

    // Find the target slot
    let targetSlot = null;
    if (slotId) {
      targetSlot = slots.find(s => s.id === slotId);
    } else {
      // If advancing existing, find the slot that created it
      if (existingFollowerId) {
        targetSlot = slots.find(s => s.createdActorId === existingFollowerId);
      }
      // Otherwise use first available unfilled slot for new follower creation.
      if (!targetSlot) {
        targetSlot = slots.find(s => !s.createdActorId) || slots[0];
      }
    }

    if (!targetSlot) {
      swseLogger.warn('[FollowerSessionSeeder] No valid follower slot found', {
        owner: ownerActor.name,
        slotId,
        availableSlots: slots.length
      });
      return false;
    }

    // Get owner's heroic level for parity
    const ownerHeroicLevel = getHeroicLevel(ownerActor) || 1;

    // Get existing follower if advancing
    let existingFollower = null;
    if (existingFollowerId) {
      existingFollower = game.actors.get(existingFollowerId);
      if (!existingFollower) {
        swseLogger.warn('[FollowerSessionSeeder] Existing follower not found', {
          followerId: existingFollowerId
        });
        return false;
      }
    }

    const currentFollowerLevel = existingFollower?.system?.level || 0;
    const advancementPlan = computeFollowerAdvancementPlan(currentFollowerLevel, ownerHeroicLevel);

    const talentContext = { treeId: targetSlot.talentTreeId || null };
    const talentConfig = getFollowerTalentConfig(targetSlot.talentName, talentContext) || getFollowerTalentConfig(targetSlot.talentName);
    const existingPersistentChoices = existingFollower?.system?.progression?.followerChoices || {};
    const persistentChoices = _applyFollowerTalentDefaults(existingPersistentChoices, talentConfig);
    const profile = talentConfig?.fixedFollowerProfile || persistentChoices.fixedFollowerProfile || null;

    // Seed the dependency context
    session.dependencyContext = {
      ownerActorId: ownerActor.id,
      ownerHeroicLevel,
      slotId: targetSlot.id,
      slotTalentName: targetSlot.talentName,
      slotTalentItemId: targetSlot.talentItemId,
      slotTalentTreeId: targetSlot.talentTreeId || null,
      templateChoices: targetSlot.templateChoices || [],
      templateType: existingFollower?.system?.progression?.followerTemplate || existingFollower?.flags?.swse?.follower?.templateType || null,
      speciesName: profile?.speciesName || existingFollower?.system?.race || null,
      persistentChoices,
      existingFollowerId: existingFollower?.id || null,
      isNewFollower: advancementPlan.isNewFollower,
      currentFollowerLevel,
      targetFollowerLevel: ownerHeroicLevel,
      levelsToApply: advancementPlan.levelsToApply,
      grantingTalent: null // Can be populated from slot if needed
    };

    swseLogger.debug('[FollowerSessionSeeder] Follower session context seeded', {
      owner: ownerActor.name,
      ownerHeroicLevel,
      isNewFollower: advancementPlan.isNewFollower,
      currentLevel: currentFollowerLevel,
      targetLevel: ownerHeroicLevel,
      levelsToApply: advancementPlan.levelsToApply.length
    });

    return true;
  } catch (err) {
    swseLogger.error('[FollowerSessionSeeder] Error seeding follower session:', err);
    return false;
  }
}

/**
 * Validate follower entitlement (is owner actually entitled to this follower?)
 * @param {Actor} ownerActor - The owner actor
 * @param {string} slotId - The slot ID to validate
 * @returns {boolean} True if entitled, false otherwise
 */
export function validateFollowerEntitlement(ownerActor, slotId) {
  if (!ownerActor) return false;

  const slots = ownerActor.getFlag('foundryvtt-swse', 'followerSlots') || [];
  return slots.some(s => s.id === slotId && _isFollowerSlot(s));
}

/**
 * Get available follower slots for an owner
 * @param {Actor} ownerActor - The owner actor
 * @param {string|null} templateFilter - Filter to specific template choice, if any
 * @returns {Array<Object>} Array of available unfilled slots
 */
export function getAvailableFollowerSlots(ownerActor, templateFilter = null) {
  if (!ownerActor) return [];

  const slots = ownerActor.getFlag('foundryvtt-swse', 'followerSlots') || [];
  const available = slots.filter(s => !s.createdActorId && _isFollowerSlot(s)); // Unfilled follower slots

  if (templateFilter) {
    return available.filter(s =>
      !s.templateChoices || s.templateChoices.length === 0 || s.templateChoices.includes(templateFilter)
    );
  }

  return available;
}

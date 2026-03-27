/**
 * Default Subtype Adapters — Phase 1 (CORRECTED)
 *
 * Concrete implementations for:
 * - ActorSubtypeAdapter (independent: generic humanoid actor)
 * - DroidSubtypeAdapter (independent: droid character)
 * - NonheroicSubtypeAdapter (independent: nonheroic character)
 * - FollowerSubtypeAdapter (DEPENDENT: derived from owner, nonheroic-based)
 *
 * Phase 1 CORRECTION: Follower is now correctly classified as DEPENDENT.
 * Followers are not independent progression participants.
 * They are owned/entitlement-driven/template-driven/derived from owner state.
 *
 * Phase 1 rule: Adapters must be structurally real but logic is deferred.
 * Each adapter has clearly marked boundaries for future phases.
 */

import { ProgressionSubtypeAdapter, ParticipantKind } from './progression-subtype-adapter.js';
import { seedNonheroicSession } from './nonheroic-session-seeder.js';
import { shouldSuppressTalentSteps, describeTalentCadence } from './talent-cadence-helper.js';
import { seedFollowerSession, validateFollowerEntitlement } from './follower-session-seeder.js';
import { getFollowerAdvancementContext, advanceFollowerToLevel } from './follower-advancer.js';

// Re-export for convenience
export { ParticipantKind };

/**
 * Generic actor subtype adapter.
 * INDEPENDENT participant: full progression lifecycle.
 */
export class ActorSubtypeAdapter extends ProgressionSubtypeAdapter {
  constructor() {
    super('actor', 'Character (Actor)', ParticipantKind.INDEPENDENT);
  }

  async seedSession(session, actor, mode) {
    // Phase 1: No subtype-specific seeding for generic actors.
    // Actor behavior is already default in spine.
  }

  async contributeActiveSteps(candidateStepIds, session, actor) {
    // Phase 1: Actors use all offered steps as-is.
    return candidateStepIds;
  }
}

/**
 * Droid subtype adapter.
 * INDEPENDENT participant: full progression lifecycle.
 * Phase 1: Wraps existing droid progression behavior (DroidBuilderAdapter).
 * Phase 2+: Full nonheroic integration.
 */
export class DroidSubtypeAdapter extends ProgressionSubtypeAdapter {
  constructor() {
    super('droid', 'Character (Droid)', ParticipantKind.INDEPENDENT);
  }

  async seedSession(session, actor, mode) {
    // Phase 1: Droid session seeding deferred.
    // Legacy DroidBuilderAdapter handles this for now.
    // Phase 2: Migrate nonheroic session seeding through adapter.
  }

  async contributeActiveSteps(candidateStepIds, session, actor) {
    // Phase 1: Droids use droid-specific filtering.
    // Filter to steps marked safe for droid subtype.
    // (Registry already declares this; adapter reinforces it.)
    return candidateStepIds.filter(stepId => {
      // Phase 1: Trust registry. Spine already filtered by mode/subtype.
      return true;
    });
  }

  async validateReadiness(session, actor) {
    // Phase 1: Droid-specific readiness checks deferred.
    // Legacy DroidBuilderAdapter handles droid credit overflow, etc.
    // Phase 2: Migrate nonheroic readiness validation through adapter.
  }
}

/**
 * Follower subtype adapter.
 * DEPENDENT participant: nonheroic-derived, owner-linked, template-driven, heroic-level-parity-based.
 *
 * Phase 3 REAL Implementation:
 * Followers are explicitly dependent, nonheroic, and tied to owner's heroic level.
 * The adapter orchestrates follower creation/advancement through the unified spine
 * by reusing existing FollowerCreator, FollowerManager, and entitlement logic
 * without duplicating or forking those systems.
 */
export class FollowerSubtypeAdapter extends ProgressionSubtypeAdapter {
  constructor() {
    super(
      'follower',
      'Follower Character',
      ParticipantKind.DEPENDENT,
      { baseSubtype: 'nonheroic' }
    );
  }

  async seedSession(session, actor, mode) {
    // Phase 3: REAL. Seed follower session from dependency context.
    // Assumes session.dependencyContext.ownerActorId is set by shell.
    if (!session.dependencyContext?.ownerActorId) {
      throw new Error('[FollowerAdapter] seedSession: No owner context in dependency');
    }

    const owner = game.actors.get(session.dependencyContext.ownerActorId);
    if (!owner) {
      throw new Error('[FollowerAdapter] seedSession: Owner actor not found');
    }

    // Use follower-session-seeder to validate entitlement and seed parity info
    const slotId = session.dependencyContext.slotId;
    const existingFollowerId = session.dependencyContext.existingFollowerId;

    const seeded = await seedFollowerSession(session, owner, slotId, existingFollowerId);
    if (!seeded) {
      throw new Error('[FollowerAdapter] seedSession: Failed to seed follower session (no entitlement?)');
    }
  }

  async contributeActiveSteps(candidateStepIds, session, actor) {
    // Phase 3: REAL. Suppress full-character progression steps for dependent follower.
    // Followers are template-driven, not freeform builders.

    // Suppress all heroic/freeform assumptions
    const suppressedStepIds = [
      'class-selection',
      'class-level-up',
      'class-feat',
      'general-feat',
      'general-talent',
      'class-talent',
      'talent-tree-browser',
      'talent-graph',
      'species-selection',
      'ability-score-increase',
      'force-power',
      'multiclass'
    ];

    const filtered = candidateStepIds.filter(stepId => !suppressedStepIds.includes(stepId));

    // Followers get only template/archetype resolution steps (deferred to Phase 3+ if needed)
    // For now, an empty list means the progression proceeds directly to finalization
    return filtered;
  }

  async contributeEntitlements(entitlements, session, actor) {
    // Phase 3: Follower entitlements are template-derived, not freeform.
    // Deferred to Phase 3+: Apply template-specific ability caps, feat/skill limits.
    // For now, pass through.
    return entitlements;
  }

  async contributeRestrictions(restrictions, session, actor) {
    // Phase 3: Enforce follower-specific restrictions.
    // Deferred to Phase 3+: Leadership-scale feats forbidden, some classes forbidden, etc.
    // For now, pass through.
    return restrictions;
  }

  async contributeProjection(projectedData, session, actor) {
    // Phase 3: Reflect follower advancement in projection.
    // Show the follower as it will exist after level advancement to parity.
    if (!session.dependencyContext) {
      return projectedData;
    }

    // Add follower metadata to projection
    const meta = projectedData.metadata || {};
    meta.isFollower = true;
    meta.followerOwnerHeroicLevel = session.dependencyContext.ownerHeroicLevel;
    meta.followerTargetLevel = session.dependencyContext.targetFollowerLevel;
    meta.followerTemplate = session.dependencyContext.templateType;
    meta.isNewFollower = session.dependencyContext.isNewFollower;

    projectedData.metadata = meta;
    return projectedData;
  }

  async contributeMutationPlan(mutationPlan, session, actor) {
    // Phase 3: REAL. Compile follower mutation bundle.
    // This is the core of Phase 3: followers are created/advanced through the unified apply path.

    if (!session.dependencyContext) {
      return mutationPlan;
    }

    const ownerActorId = session.dependencyContext.ownerActorId;
    const ownerActor = game.actors.get(ownerActorId);

    if (!ownerActor) {
      return mutationPlan;
    }

    // If this is a new follower, create it through FollowerCreator
    // If advancing existing, apply level advancement
    if (session.dependencyContext.isNewFollower) {
      // Deferred to Phase 3+: Full follower creation through spine
      // For now, flag for legacy FollowerCreator to handle
      mutationPlan.follower = {
        operation: 'create',
        ownerActorId,
        templateType: session.dependencyContext.templateType,
        targetHeroicLevel: session.dependencyContext.targetFollowerLevel
      };
    } else if (session.dependencyContext.existingFollowerId) {
      // Advancing existing follower to owner's new heroic level
      const followerActor = game.actors.get(session.dependencyContext.existingFollowerId);
      if (followerActor) {
        const levelsToApply = session.dependencyContext.levelsToApply;
        if (levelsToApply.length > 0) {
          mutationPlan.follower = {
            operation: 'advance',
            followerId: session.dependencyContext.existingFollowerId,
            templateType: session.dependencyContext.templateType,
            currentLevel: session.dependencyContext.currentFollowerLevel,
            targetLevel: session.dependencyContext.targetFollowerLevel,
            levelsToApply
          };
        }
      }
    }

    return mutationPlan;
  }

  async validateReadiness(session, actor) {
    // Phase 3: Validate follower creation requirements.
    // Check that owner is entitled to the slot, has required templates, etc.
    if (!session.dependencyContext) {
      throw new Error('[FollowerAdapter] validateReadiness: No dependency context');
    }

    const ownerActorId = session.dependencyContext.ownerActorId;
    const slotId = session.dependencyContext.slotId;

    if (!ownerActorId || !slotId) {
      throw new Error('[FollowerAdapter] validateReadiness: Missing owner or slot context');
    }

    const owner = game.actors.get(ownerActorId);
    if (!owner) {
      throw new Error('[FollowerAdapter] validateReadiness: Owner actor not found');
    }

    // Validate entitlement
    if (!validateFollowerEntitlement(owner, slotId)) {
      throw new Error('[FollowerAdapter] validateReadiness: Owner not entitled to this follower slot');
    }
  }
}

/**
 * Nonheroic subtype adapter.
 * INDEPENDENT participant: full progression lifecycle.
 * Phase 1: Structural stub with placeholder boundaries.
 * Phase 2: Full integration with existing nonheroic progression logic.
 */
export class NonheroicSubtypeAdapter extends ProgressionSubtypeAdapter {
  constructor() {
    super('nonheroic', 'Nonheroic Character', ParticipantKind.INDEPENDENT);
  }

  async seedSession(session, actor, mode) {
    // Phase 2: REAL. Seed nonheroic session state using existing helpers.
    // Consumes class-item isNonheroic flag and nonheroic class data.
    await seedNonheroicSession(session, actor, mode);
  }

  async contributeActiveSteps(candidateStepIds, session, actor) {
    // Phase 2: REAL. Suppress talent steps for nonheroic participants.
    // Uses existing TalentCadenceEngine logic (grantsClassTalent returns 0 for nonheroic).

    const isNonheroic = session?.nonheroicContext?.hasNonheroic === true;

    if (!isNonheroic) {
      return candidateStepIds;
    }

    // Phase 2: Filter OUT talent steps for nonheroic participants
    // Talent steps: 'general-talent', 'class-talent', 'talent-tree-browser', 'talent-graph'
    const talentStepIds = ['general-talent', 'class-talent', 'talent-tree-browser', 'talent-graph'];
    const filteredSteps = candidateStepIds.filter(stepId => !talentStepIds.includes(stepId));

    return filteredSteps;
  }

  async contributeEntitlements(entitlements, session, actor) {
    // Phase 1: STUB. Nonheroic entitlement rules deferred to Phase 2.
    // Phase 2: Apply nonheroic-specific ability score increases, feat grants, talent slots.
    //   Consume existing nonheroic level progression tables.
    return entitlements;
  }

  async contributeRestrictions(restrictions, session, actor) {
    // Phase 1: STUB. Nonheroic exclusion rules deferred to Phase 2.
    // Phase 2: Enforce nonheroic-specific restrictions using existing helpers:
    //   - forbidden feats (non-combat, non-utility feats)
    //   - forbidden talent trees or tiers
    //   - forbidden force powers
    return restrictions;
  }

  async contributeProjection(projectedData, session, actor) {
    // Phase 2: Nonheroic projection is seeded by session.nonheroicContext.
    // Projection already reflects class-item data (which includes isNonheroic flag).
    // Future: Apply nonheroic-specific computed values if needed beyond base projection.
    return projectedData;
  }

  async contributeMutationPlan(mutationPlan, session, actor) {
    // Phase 2: Nonheroic mutations routed through unified apply path.
    // Class-item system already handles isNonheroic flag in HP/BAB/ability calculations.
    // No special mutation contribution needed; normal class/ability progression applies.
    // Future: Patch mutations for nonheroic-specific adjustments if needed.
    return mutationPlan;
  }

  async validateReadiness(session, actor) {
    // Phase 2: Nonheroic readiness validation deferred.
    // Relies on standard progression prerequisites and class-item validation.
    // Future: Add nonheroic-specific readiness checks if needed.
  }
}

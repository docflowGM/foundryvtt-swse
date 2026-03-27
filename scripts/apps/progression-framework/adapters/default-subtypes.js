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
 * DEPENDENT participant: nonheroic-derived, owner-linked, template-driven.
 *
 * CRITICAL CORRECTIVE NOTE (Phase 1):
 * Follower is NOT an independent progression participant.
 * Followers are:
 * - Explicitly nonheroic
 * - Derived from owner actor state
 * - Entitlement-driven through owner talents
 * - Template-driven (not freeform progression)
 * - Runtime-controlled by owner
 *
 * This adapter is DEPENDENT on a parent/owner context.
 * Phase 1: Structural support only. No follower logic implemented.
 * Phase 3: Full follower creation/template/entitlement logic wired through dependency context.
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
    // Phase 1: STUB. Follower session seeding deferred to Phase 3.
    // Phase 3: Seed session with:
    //   - owner/dependency context from session.dependencyContext
    //   - follower archetype selection (from owner's granted followers)
    //   - follower-specific attribute overrides (derived from owner)
    //   - follower-specific class restrictions (nonheroic base)
    //   - follower template presets
  }

  async contributeActiveSteps(candidateStepIds, session, actor) {
    // Phase 1: STUB. Follower step routing deferred to Phase 3.
    // Phase 3: SUPPRESS normal freeform progression for dependent participant:
    //   - no normal feat progression (entitlement-gated only)
    //   - no normal talent progression (entitlement-gated only)
    //   - no normal skill progression (template-driven only)
    //   - no species/class selection (template-driven)
    //   - potentially expose template/archetype/entitlement steps
    // For now, return candidate steps as-is (though registry won't include follower steps yet).
    return candidateStepIds;
  }

  async contributeEntitlements(entitlements, session, actor) {
    // Phase 1: STUB. Follower entitlement rules deferred to Phase 3.
    // Phase 3: Apply follower-specific ability score caps, feat limits, etc.
    return entitlements;
  }

  async contributeRestrictions(restrictions, session, actor) {
    // Phase 1: STUB. Follower exclusion rules deferred to Phase 3.
    // Phase 3: Enforce follower-specific exclusions:
    //   - forbidden feats (e.g., leadership-scale feats)
    //   - forbidden classes (e.g., Jedi, Sith)
    //   - forbidden force powers
    return restrictions;
  }

  async validateReadiness(session, actor) {
    // Phase 1: STUB. Follower readiness checks deferred to Phase 3.
    // Phase 3: Validate follower creation requirements.
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

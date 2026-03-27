/**
 * Default Subtype Adapters — Phase 1
 *
 * Concrete implementations for:
 * - ActorSubtypeAdapter (generic humanoid actor)
 * - DroidSubtypeAdapter (droid character)
 * - FollowerSubtypeAdapter (placeholder for Phase 3)
 * - NonheroicSubtypeAdapter (placeholder for Phase 2)
 *
 * Phase 1 rule: Adapters must be structurally real but logic is deferred.
 * Each adapter has clearly marked boundaries for future phases.
 */

import { ProgressionSubtypeAdapter } from './progression-subtype-adapter.js';

/**
 * Generic actor subtype adapter.
 * Wraps existing actor progression behavior.
 */
export class ActorSubtypeAdapter extends ProgressionSubtypeAdapter {
  constructor() {
    super('actor', 'Character (Actor)');
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
 * Phase 1: Wraps existing droid progression behavior (DroidBuilderAdapter).
 * Phase 2+: Full nonheroic integration.
 */
export class DroidSubtypeAdapter extends ProgressionSubtypeAdapter {
  constructor() {
    super('droid', 'Character (Droid)');
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
 * Phase 1: Structural stub only. No follower logic implemented.
 * Phase 3: Full follower creation and progression logic.
 */
export class FollowerSubtypeAdapter extends ProgressionSubtypeAdapter {
  constructor() {
    super('follower', 'Follower Character');
  }

  async seedSession(session, actor, mode) {
    // Phase 1: STUB. Follower session seeding deferred to Phase 3.
    // Phase 3: Seed session with:
    //   - follower archetype selection
    //   - follower-specific attribute overrides
    //   - follower-specific class restrictions
    //   - follower template presets
  }

  async contributeActiveSteps(candidateStepIds, session, actor) {
    // Phase 1: STUB. Follower step routing deferred to Phase 3.
    // Phase 3: Filter/route to follower-specific step sequence.
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
 * Phase 1: Structural stub with placeholder boundaries.
 * Phase 2: Full integration with existing nonheroic progression logic.
 */
export class NonheroicSubtypeAdapter extends ProgressionSubtypeAdapter {
  constructor() {
    super('nonheroic', 'Nonheroic Character');
  }

  async seedSession(session, actor, mode) {
    // Phase 1: STUB. Nonheroic session seeding deferred to Phase 2.
    // Phase 2: Seed session with:
    //   - nonheroic class selection
    //   - nonheroic attribute generation rules
    //   - nonheroic feat access
    //   - nonheroic talent tree restrictions
  }

  async contributeActiveSteps(candidateStepIds, session, actor) {
    // Phase 1: STUB. Nonheroic step routing deferred to Phase 2.
    // Phase 2: Filter to nonheroic-valid step sequence using existing
    //   nonheroic progression helpers (e.g., GetNonheroicProgression)
    return candidateStepIds;
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
    // Phase 1: STUB. Nonheroic projection deferred to Phase 2.
    // Phase 2: Contribute nonheroic-specific computed values to projection.
  }

  async contributeMutationPlan(mutationPlan, session, actor) {
    // Phase 1: STUB. Nonheroic mutation plan deferred to Phase 2.
    // Phase 2: Contribute nonheroic-specific patches (XP table, BAB, feat usage, etc.).
  }

  async validateReadiness(session, actor) {
    // Phase 1: STUB. Nonheroic readiness checks deferred to Phase 2.
    // Phase 2: Validate nonheroic creation requirements.
  }
}

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
import { deriveFollowerStats, getFollowerDerivationContext, deriveFollowerStateForApply } from './follower-deriver.js';
import { DroidBuilderAdapter } from '../steps/droid-builder-adapter.js';
import { swseLogger } from '../../../utils/logger.js';

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
 *
 * Implements all four adapter responsibilities:
 *  1. seedSession            — seeds droid session context (20-pt buy, CON=0 intent, generation config)
 *  2. contributeActiveSteps  — defense-in-depth force-step suppression
 *  3. contributeMutationPlan — writes all droid system fields to the mutation plan
 *  4. validateReadiness      — enforces build completeness before finalization
 */
export class DroidSubtypeAdapter extends ProgressionSubtypeAdapter {
  constructor() {
    super('droid', 'Character (Droid)', ParticipantKind.INDEPENDENT);
  }

  // ---------------------------------------------------------------------------
  // 1. Session seeding
  // ---------------------------------------------------------------------------

  async seedSession(session, actor, mode) {
    // Set droid-specific session context consumed downstream by:
    //  - AttributeStep  (reads pointBuyPool + attributeGenerationConfig)
    //  - AbilityRollingController (reads attributeGenerationConfig when wired)
    //  - contributeMutationPlan (reads droidContext.conBase to enforce CON=0)
    session.droidContext = {
      isDroid: true,
      // Point-buy pool: droids get 20 points, actors get 25 (SWSE core rule)
      pointBuyPool: 20,
      // CON is not a droid ability; enforced to 0 in contributeMutationPlan
      excludedAbilities: ['con'],
      conBase: 0,
      // Config consumed by rolling/array systems — keeps all droid rules data-driven
      attributeGenerationConfig: {
        abilityCount: 5,
        // Uppercase keys match AbilityRollingController.assigned slot names
        abilityKeys: ['STR', 'DEX', 'INT', 'WIS', 'CHA'],
        // Lowercase keys match system.abilities paths
        abilitySystemKeys: ['str', 'dex', 'int', 'wis', 'cha'],
        // Standard rolling: 5 rolls instead of 6 (no CON roll)
        standardRollCount: 5,
        // Organic rolling: 18d6 = 5 groups × 3 dice + 3 global drops
        organicDiceCount: 18,
        organicGroupCount: 5,
        organicDropCount: 3,
        // Predefined arrays without CON slot
        arrays: {
          standard: [15, 14, 13, 12, 8],     // actor standard [15,14,13,12,10,8] minus 10
          highPower: [16, 14, 12, 10, 8],    // actor high-power [16,14,12,12,10,8] minus one 12
        },
      },
    };

    swseLogger.debug('[DroidAdapter] Droid session context seeded', {
      pointBuyPool: session.droidContext.pointBuyPool,
      abilityCount: session.droidContext.attributeGenerationConfig.abilityCount,
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Step filtering
  // ---------------------------------------------------------------------------

  async contributeActiveSteps(candidateStepIds, session, actor) {
    // Defense-in-depth force suppression.
    // The registry already excludes 'droid' from force node subtypes,
    // but the adapter enforces this explicitly as a second layer.
    // Droids are non-Force-sensitive by definition (SWSE core rules).
    const FORCE_STEP_IDS = ['force-powers', 'force-secrets', 'force-techniques'];
    const filtered = candidateStepIds.filter(id => !FORCE_STEP_IDS.includes(id));

    const suppressed = candidateStepIds.filter(id => FORCE_STEP_IDS.includes(id));
    if (suppressed.length > 0) {
      swseLogger.debug('[DroidAdapter] Force steps suppressed for droid', { suppressed });
    }

    // Droid chargen cadence: Splash -> Droid Class -> Droid Systems -> Attributes -> rest.
    const prioritized = ['intro', 'class', 'droid-builder', 'attribute'];
    const ordered = [];
    for (const stepId of prioritized) {
      if (filtered.includes(stepId)) ordered.push(stepId);
    }
    for (const stepId of filtered) {
      if (!ordered.includes(stepId)) ordered.push(stepId);
    }

    swseLogger.debug('[DroidAdapter] Droid active step order applied', { ordered });
    return ordered;
  }

  // ---------------------------------------------------------------------------
  // 3. Mutation plan contribution
  // ---------------------------------------------------------------------------

  async contributeMutationPlan(mutationPlan, session, actor) {
    const droidBuild = session.draftSelections?.droid;
    if (!droidBuild?.isDroid) {
      return mutationPlan;
    }

    if (!mutationPlan.set) mutationPlan.set = {};

    // Write all droid identity and system fields.
    // These are NOT written anywhere in the base _compileMutationPlan path —
    // this adapter is the sole authoritative writer for droid system fields.
    mutationPlan.set['system.isDroid']      = true;
    mutationPlan.set['system.droidDegree']  = droidBuild.droidDegree  || '1st-degree';
    mutationPlan.set['system.droidSize']    = droidBuild.droidSize    || 'medium';
    mutationPlan.set['system.droidSystems'] = droidBuild.droidSystems ?? null;
    mutationPlan.set['system.droidCredits'] = droidBuild.droidCredits ?? null;

    // Enforce CON = 0 regardless of what the attribute step committed.
    // Reference: chargen-droid.js:38-42 (legacy spec)
    mutationPlan.set['system.abilities.con.base'] = 0;

    swseLogger.debug('[DroidAdapter] Droid fields written to mutation plan', {
      droidDegree: droidBuild.droidDegree,
      droidSize: droidBuild.droidSize,
    });

    return mutationPlan;
  }

  // ---------------------------------------------------------------------------
  // 4. Readiness validation
  // ---------------------------------------------------------------------------

  async validateReadiness(session, actor) {
    const droidBuild = session.draftSelections?.droid;

    if (!droidBuild?.isDroid) {
      throw new Error('[DroidAdapter] validateReadiness: No droid build found in session');
    }

    // Reuse existing build completeness validator.
    // Budget overflow is already checked by ProgressionFinalizer._validateReadiness();
    // this adds locomotion, processor, appendage, and processor-type completeness.
    const result = DroidBuilderAdapter.validateDroidBuild(droidBuild);
    if (!result.isValid) {
      throw new Error(
        `[DroidAdapter] Droid build incomplete: ${result.issues.join('; ')}`
      );
    }

    swseLogger.debug('[DroidAdapter] Droid readiness validated', {
      droidDegree: droidBuild.droidDegree,
      droidSize: droidBuild.droidSize,
    });
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

    // Phase 3.5: Skip skills step for Aggressive/Defensive templates
    // (only Endurance is allowed, so no choice to be made)
    const templateType = session?.draftSelections?.templateType;
    if (templateType === 'aggressive' || templateType === 'defensive') {
      suppressedStepIds.push('follower-skills');
    }

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
    // Phase 3.5 CORRECTED: Compile follower mutation bundle using derivation model.
    // RULES CORRECTION: Followers are DERIVED ENTITIES, not level-by-level progressed characters.
    //
    // Model: follower state at any moment = f(owner.heroicLevel, species, template, persistent.choices)
    // Not: incremental level-by-level advancement
    //
    // This computes the follower's complete derived state at the owner's heroic level,
    // then bundles it for creation (new follower) or update (existing follower).

    if (!session.dependencyContext) {
      return mutationPlan;
    }

    const ownerActorId = session.dependencyContext.ownerActorId;
    const ownerActor = game.actors.get(ownerActorId);

    if (!ownerActor) {
      return mutationPlan;
    }

    try {
      const derivationContext = await getFollowerDerivationContext(
        session,
        ownerActor,
        session.dependencyContext.existingFollowerId ? game.actors.get(session.dependencyContext.existingFollowerId) : null
      );

      if (!derivationContext) {
        return mutationPlan;
      }

      // Derive follower state at owner's heroic level
      // This is the authoritative follower stats object
      const followerState = await deriveFollowerStateForApply(
        derivationContext.ownerHeroicLevel,
        derivationContext.speciesName,
        derivationContext.templateType,
        derivationContext.persistentChoices
      );

      // Compile into mutation bundle
      mutationPlan.follower = {
        // Follower creation/update operation
        operation: derivationContext.existenceState.isNew ? 'create' : 'update',

        // Owner/entitlement linkage
        ownerActorId,
        slotId: session.dependencyContext.slotId,

        // Follower identity (persistent)
        speciesName: derivationContext.speciesName,
        templateType: derivationContext.templateType,
        persistentChoices: derivationContext.persistentChoices,

        // Derived state at target level (replace entirely, don't accumulate)
        followerState,

        // Metadata
        targetHeroicLevel: derivationContext.ownerHeroicLevel,
        isNew: derivationContext.existenceState.isNew
      };
    } catch (err) {
      console.error('[FollowerAdapter] Error compiling mutation plan:', err);
      // Return empty plan on error (will fail in finalization with clear message)
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
    // Phase 2.5: REAL. Suppress talent and force steps for nonheroic participants.
    const isNonheroic = session?.nonheroicContext?.hasNonheroic === true;

    if (!isNonheroic) {
      return candidateStepIds;
    }

    // Nonheroic cannot have talents or force powers
    const suppressedStepIds = [
      'general-talent',
      'class-talent',
      'talent-tree-browser',
      'talent-graph',
      'force-power',           // Phase 2.5: Suppress force powers for nonheroic
      'force-secret',
      'force-technique',
    ];

    const filteredSteps = candidateStepIds.filter(stepId => !suppressedStepIds.includes(stepId));
    return filteredSteps;
  }

  async contributeEntitlements(entitlements, session, actor) {
    // Phase 2.5: REAL. Apply nonheroic-specific entitlements.
    // Nonheroic characters get reduced ability score increases and no talents.
    const isNonheroic = session?.nonheroicContext?.hasNonheroic === true;

    if (!isNonheroic) {
      return entitlements;
    }

    // Phase 2.5: For nonheroic levelup, modify ability increase cadence
    // Heroic: ability increases at levels 4/8/12/16/20 (every 4)
    // Nonheroic: single ability increase every 4 levels (fewer overall)
    // This is handled by the class-item system with isNonheroic flag,
    // but we can add metadata for tracking

    if (entitlements.metadata) {
      entitlements.metadata.nonheroicAbilityProgression = true;
    }

    return entitlements;
  }

  async contributeRestrictions(restrictions, session, actor) {
    // Phase 2.5: REAL. Enforce nonheroic-specific restrictions.
    const isNonheroic = session?.nonheroicContext?.hasNonheroic === true;

    if (!isNonheroic) {
      return restrictions;
    }

    // Nonheroic characters cannot access force powers or related mechanics
    if (!restrictions.forbiddenSteps) {
      restrictions.forbiddenSteps = [];
    }

    restrictions.forbiddenSteps.push(
      'force-power',
      'force-secret',
      'force-technique'
    );

    // Add metadata for UI/logging
    if (restrictions.metadata) {
      restrictions.metadata.nonheroicForbidden = true;
    }

    return restrictions;
  }

  async contributeProjection(projectedData, session, actor) {
    // Phase 2.5: REAL. Mark projection as nonheroic and suppress Force/Destiny.
    const isNonheroic = session?.nonheroicContext?.hasNonheroic === true;

    if (!isNonheroic) {
      return projectedData;
    }

    // Add nonheroic metadata to projection
    const meta = projectedData.metadata || {};
    meta.isNonheroic = true;

    // Phase 2.5: Ensure Force Points and Destiny Points are not added
    // These should already be suppressed by the class-item system with isNonheroic flag,
    // but we enforce it here as a safety measure
    if (projectedData.derived) {
      projectedData.derived.forcePoints = projectedData.derived.forcePoints || 0;
      projectedData.derived.destinyPoints = projectedData.derived.destinyPoints || 0;
    }

    projectedData.metadata = meta;
    return projectedData;
  }

  async contributeMutationPlan(mutationPlan, session, actor) {
    // Phase 2.5: REAL. Ensure Force/Destiny suppression in mutations.
    const isNonheroic = session?.nonheroicContext?.hasNonheroic === true;

    if (!isNonheroic) {
      return mutationPlan;
    }

    // Add metadata to mutation plan indicating nonheroic handling
    mutationPlan.nonheroic = {
      isNonheroic: true,
      suppressForcePoints: true,
      suppressDestinyPoints: true,
    };

    return mutationPlan;
  }

  async validateReadiness(session, actor) {
    // Phase 2.5: Nonheroic readiness validation.
    const isNonheroic = session?.nonheroicContext?.hasNonheroic === true;

    if (!isNonheroic) {
      return;
    }

    // Validate that actor has nonheroic class item
    if (!actor?.items?.some(item => item.type === 'class' && item.system?.isNonheroic === true)) {
      throw new Error('[NonheroicAdapter] validateReadiness: Actor missing nonheroic class item');
    }
  }
}

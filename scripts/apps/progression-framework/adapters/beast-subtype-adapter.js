/**
 * Beast Subtype Adapter — Phase 2.7
 *
 * INDEPENDENT participant with Beast-specific rules:
 * - Intelligence 1-2 (multiclass gate opens at Int 3+)
 * - 1d8 + Con HP (not d4 or d6)
 * - Beast-specific BAB table
 * - 1 ability increase per 4 levels
 * - No talents
 * - No starting feats (but normal feat cadence later)
 * - Beast skill list only
 * - No Force/Destiny Points
 * - Creature Generator surfaces (size, natural weapons, etc.)
 *
 * Hosted on nonheroic-family path, but with distinct Beast rules.
 */

import { ProgressionSubtypeAdapter, ParticipantKind } from './progression-subtype-adapter.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

// Beast skill list (authoritative per SWSE rules)
const BEAST_CLASS_SKILLS = [
  'Acrobatics',
  'Climb',
  'Endurance',
  'Initiative',
  'Jump',
  'Perception',
  'Stealth',
  'Survival',
  'Swim',
];

export class BeastSubtypeAdapter extends ProgressionSubtypeAdapter {
  constructor() {
    super('beast', 'Beast Character', ParticipantKind.INDEPENDENT, {
      baseSubtype: 'nonheroic'  // Beast is nonheroic-family, but distinct
    });
  }

  async seedSession(session, actor, mode) {
    // Phase 2.7: Seed Beast session from actor or template
    // Detect Beast profile and set up Beast-specific context

    const hasBeastData = !!actor?.flags?.swse?.beastData;
    const isBeastProfile = session?.nonheroicContext?.isBeast === true;

    if (hasBeastData || isBeastProfile) {
      session.beastContext = {
        isBeast: true,
        beastData: actor?.flags?.swse?.beastData || {},
        intelligence: actor?.system?.abilities?.int?.base || 1,
        profile: 'beast',
      };

      swseLogger.log('[BeastAdapter] Beast session seeded', {
        isBeast: true,
        intelligence: session.beastContext.intelligence,
      });
    }
  }

  async contributeActiveSteps(candidateStepIds, session, actor) {
    // Phase 2.7: Beast-specific step filtering
    const isBeast = session?.beastContext?.isBeast === true;

    if (!isBeast) {
      return candidateStepIds;
    }

    // Beast-specific suppressions:
    // 1. No talents (ever)
    // 2. No force powers
    // 3. No starting feats (but feat steps will appear when owed normally)
    const suppressedStepIds = [
      'general-talent',
      'class-talent',
      'talent-tree-browser',
      'talent-graph',
      'force-power',
      'force-secret',
      'force-technique',
      // Note: Do NOT suppress feat steps - Beast gets normal feat cadence, just not at level 1
    ];

    const filtered = candidateStepIds.filter(stepId => !suppressedStepIds.includes(stepId));

    swseLogger.log('[BeastAdapter] Active steps filtered for Beast', {
      originalCount: candidateStepIds.length,
      filteredCount: filtered.length,
    });

    return filtered;
  }

  async contributeEntitlements(entitlements, session, actor) {
    // Phase 2.7: Beast ability increase cadence
    const isBeast = session?.beastContext?.isBeast === true;

    if (!isBeast) {
      return entitlements;
    }

    // Beast: 1 ability increase every 4 levels (same cadence as nonheroic)
    // But explicitly marked as Beast behavior
    if (entitlements.metadata) {
      entitlements.metadata.beastAbilityProgression = true;
      entitlements.metadata.abilityIncreaseInterval = 4;  // Every 4th level
    }

    return entitlements;
  }

  async contributeRestrictions(restrictions, session, actor) {
    // Phase 2.7: Enforce Beast-specific restrictions
    const isBeast = session?.beastContext?.isBeast === true;

    if (!isBeast) {
      return restrictions;
    }

    // Beast cannot access talents or force powers
    if (!restrictions.forbiddenSteps) {
      restrictions.forbiddenSteps = [];
    }

    restrictions.forbiddenSteps.push(
      'general-talent',
      'class-talent',
      'force-power',
      'force-secret',
      'force-technique'
    );

    // Beast intelligence constraint: can't multiclass to heroic unless Int >= 3
    if (!restrictions.metadata) {
      restrictions.metadata = {};
    }
    restrictions.metadata.beastMulticlassGate = true;
    restrictions.metadata.beastCurrentIntelligence = session.beastContext?.intelligence || 1;

    return restrictions;
  }

  async contributeProjection(projectedData, session, actor) {
    // Phase 2.7: Mark projection as Beast, suppress Force/Destiny
    const isBeast = session?.beastContext?.isBeast === true;

    if (!isBeast) {
      return projectedData;
    }

    // Mark as Beast
    const meta = projectedData.metadata || {};
    meta.isBeast = true;
    meta.beastProfile = true;

    // Suppress Force/Destiny (same as nonheroic)
    if (projectedData.derived) {
      projectedData.derived.forcePoints = 0;
      projectedData.derived.destinyPoints = 0;
    }

    projectedData.metadata = meta;
    return projectedData;
  }

  async contributeMutationPlan(mutationPlan, session, actor) {
    // Phase 2.7: Include Beast metadata in mutation plan
    const isBeast = session?.beastContext?.isBeast === true;

    if (!isBeast) {
      return mutationPlan;
    }

    // Mark mutation as Beast-sourced
    mutationPlan.beast = {
      isBeast: true,
      suppressTalents: true,
      suppressForcePoints: true,
      suppressDestinyPoints: true,
      suppressStartingFeats: true,  // No starting feats at level 1
      beastProfile: session.beastContext?.profile || 'beast',
    };

    return mutationPlan;
  }

  async validateReadiness(session, actor) {
    // Phase 2.7: Beast-specific validation
    const isBeast = session?.beastContext?.isBeast === true;

    if (!isBeast) {
      return;
    }

    // Beast intelligence must be 1 or 2 at creation
    const intelligence = session.beastContext?.intelligence || 1;
    if (intelligence < 1 || intelligence > 2) {
      swseLogger.warn('[BeastAdapter] Beast creation with invalid intelligence', {
        intelligence,
        expected: '1 or 2',
      });
      // Allow creation to proceed; will be corrected at finalization if needed
    }
  }

  /**
   * Check if Beast can multiclass to heroic classes
   * Beast must have Intelligence 3 or higher to multiclass
   */
  static canBeastMulticlassToHeroic(beastIntelligence) {
    return beastIntelligence >= 3;
  }

  /**
   * Get Beast skill list (constrained from normal nonheroic list)
   */
  static getBeastClassSkills() {
    return BEAST_CLASS_SKILLS;
  }
}

/**
 * Skill Challenge Constants
 *
 * Phase 3.5A foundation only. This module defines stable identifiers for the
 * future Skill Challenge subsystem. It is intentionally not wired into the GM
 * Datapad or roll pipeline yet.
 */

export const SKILL_CHALLENGE_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
});

export const SKILL_CHALLENGE_ROLL_OUTCOME = Object.freeze({
  SUCCESS: 'success',
  FAILURE: 'failure',
  IGNORED: 'ignored',
  GM_REVIEW: 'gm_review'
});

export const SKILL_CHALLENGE_EFFECT_TYPES = Object.freeze({
  CATASTROPHIC_FAILURE: 'catastrophicFailure',
  RECOVERY: 'recovery',
  LAST_RESORT: 'lastResort',
  RESTRICTED_SKILLS: 'restrictedSkills',
  TIMED_CHALLENGE: 'timedChallenge',
  SECOND_EFFORT: 'secondEffort',
  INDIVIDUAL_EFFORT: 'individualEffort',
  CHANGING_OBJECTIVES: 'changingObjectives'
});

export const SKILL_CHALLENGE_FEAT_RULE_TYPES = Object.freeze({
  CATASTROPHIC_AVOIDANCE: 'SKILL_CHALLENGE_CATASTROPHIC_AVOIDANCE',
  LAST_RESORT: 'SKILL_CHALLENGE_LAST_RESORT',
  RECOVERY: 'SKILL_CHALLENGE_RECOVERY'
});

export const SKILL_CHALLENGE_STORAGE_SCOPE = Object.freeze({
  WORLD: 'world',
  SCENE: 'scene',
  TEMPLATE: 'template'
});

export const SKILL_CHALLENGE_SOURCE = 'Galaxy of Intrigue';

export default {
  SKILL_CHALLENGE_STATUS,
  SKILL_CHALLENGE_ROLL_OUTCOME,
  SKILL_CHALLENGE_EFFECT_TYPES,
  SKILL_CHALLENGE_FEAT_RULE_TYPES,
  SKILL_CHALLENGE_STORAGE_SCOPE,
  SKILL_CHALLENGE_SOURCE
};

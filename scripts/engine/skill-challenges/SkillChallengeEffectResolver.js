import { SKILL_CHALLENGE_EFFECT_TYPES, SKILL_CHALLENGE_ROLL_OUTCOME } from './SkillChallengeConstants.js';
import { SkillChallengeRules } from './SkillChallengeRules.js';
import { SkillChallengeState } from './SkillChallengeState.js';

function enabledEffects(challenge = {}) {
  return Array.isArray(challenge.effects) ? challenge.effects.filter(effect => effect?.enabled !== false) : [];
}

function cleanNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function plural(count, singular, pluralLabel = `${singular}s`) {
  return Math.abs(Number(count) || 0) === 1 ? singular : pluralLabel;
}

function effectByType(challenge = {}, type = '') {
  return enabledEffects(challenge).find(effect => effect.type === type) ?? null;
}

function withMessages(outcome = {}, messages = []) {
  return {
    ...outcome,
    messages: [
      ...(Array.isArray(outcome.messages) ? outcome.messages : []),
      ...messages.filter(Boolean)
    ]
  };
}

/**
 * Resolves Skill Challenge effects after a GM-reviewable roll outcome is built.
 *
 * Phase 3.5D implements only safe tracker effects. These effects either adjust
 * the GM-confirmed outcome preview or expose manual tracker actions. Feat hooks
 * and player-triggered reactions remain intentionally out of scope until 3.5E.
 */
export class SkillChallengeEffectResolver {
  static getEnabledEffects(challenge = {}) {
    return enabledEffects(SkillChallengeState.normalize(challenge));
  }

  static hasEffect(challenge = {}, type = '') {
    return Boolean(effectByType(SkillChallengeState.normalize(challenge), type));
  }

  static getEffect(challenge = {}, type = '') {
    return effectByType(SkillChallengeState.normalize(challenge), type);
  }

  static applyRollEffects(challenge, outcome, rollContext = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    let adjusted = { ...outcome, messages: [...(outcome?.messages ?? [])] };

    for (const effect of enabledEffects(normalized)) {
      if (effect.type === SKILL_CHALLENGE_EFFECT_TYPES.RESTRICTED_SKILLS) {
        adjusted = this.applyRestrictedSkills(normalized, effect, adjusted, rollContext);
      }
      if (effect.type === SKILL_CHALLENGE_EFFECT_TYPES.CATASTROPHIC_FAILURE) {
        adjusted = this.applyCatastrophicFailure(effect, adjusted);
      }
      if (effect.type === SKILL_CHALLENGE_EFFECT_TYPES.TIMED_CHALLENGE) {
        adjusted = this.applyTimedChallengeReminder(effect, adjusted);
      }
    }

    return adjusted;
  }

  static applyRestrictedSkills(challenge, effect, outcome, rollContext = {}) {
    const mode = cleanString(effect?.parameters?.mode, 'listedOnly');
    const skillSlug = cleanString(rollContext.skillSlug || outcome.skillSlug);
    const hasListedSkills = challenge.primarySkills.length > 0 || challenge.secondarySkills.length > 0;
    const listed = SkillChallengeRules.isSkillListed(challenge, skillSlug);

    if (mode !== 'listedOnly' || !hasListedSkills || listed) return outcome;

    return withMessages({
      ...outcome,
      outcome: SKILL_CHALLENGE_ROLL_OUTCOME.GM_REVIEW,
      counted: false,
      successesDelta: 0,
      failuresDelta: 0
    }, ['Restricted Skills: this skill is not listed for the challenge. GM approval is required before it can count.']);
  }

  static applyCatastrophicFailure(effect, outcome) {
    const threshold = cleanNumber(effect?.parameters?.threshold, 10);
    const extraFailures = cleanNumber(effect?.parameters?.extraFailures, 1);
    const margin = cleanNumber(outcome?.margin, 0);

    if (outcome?.failuresDelta > 0 && margin <= -Math.abs(threshold)) {
      return withMessages({
        ...outcome,
        failuresDelta: outcome.failuresDelta + Math.max(0, extraFailures)
      }, [`Catastrophic Failure: failed by ${Math.abs(margin)} or more; add ${extraFailures} extra ${plural(extraFailures, 'failure')}.`]);
    }

    return outcome;
  }

  static applyTimedChallengeReminder(effect, outcome) {
    const remaining = effect?.parameters?.remaining;
    const unit = cleanString(effect?.parameters?.unit, 'step');
    if (remaining == null) return outcome;

    return withMessages(outcome, [`Timed Challenge: ${Math.max(0, cleanNumber(remaining, 0))} ${plural(remaining, unit)} remaining.`]);
  }

  static buildRecoveryOutcome(challenge, { note = '' } = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    if (!this.hasEffect(normalized, SKILL_CHALLENGE_EFFECT_TYPES.RECOVERY)) {
      return {
        counted: false,
        action: 'effect-recovery-unavailable',
        successesDelta: 0,
        failuresDelta: 0,
        messages: ['Recovery is not enabled for this Skill Challenge.']
      };
    }

    if (normalized.failures <= 0) {
      return {
        counted: false,
        action: 'effect-recovery-no-failures',
        successesDelta: 0,
        failuresDelta: 0,
        messages: ['Recovery is enabled, but there are no failures to recover.']
      };
    }

    return {
      counted: true,
      action: 'effect-recovery',
      successesDelta: 0,
      failuresDelta: -1,
      messages: [note || 'Recovery: GM removed one accumulated failure.']
    };
  }

  static buildSecondEffortOutcome(challenge, { note = '' } = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    if (!this.hasEffect(normalized, SKILL_CHALLENGE_EFFECT_TYPES.SECOND_EFFORT)) {
      return {
        counted: false,
        action: 'effect-second-effort-unavailable',
        successesDelta: 0,
        failuresDelta: 0,
        messages: ['Second Effort is not enabled for this Skill Challenge.']
      };
    }

    return {
      counted: false,
      action: 'effect-second-effort',
      successesDelta: 0,
      failuresDelta: 0,
      messages: [note || 'Second Effort: GM recorded a permitted additional attempt or retry opportunity.']
    };
  }

  static advanceTimedChallenge(challenge, delta = -1) {
    const normalized = SkillChallengeState.normalize(challenge);
    let changed = false;
    const effects = normalized.effects.map(effect => {
      if (effect.type !== SKILL_CHALLENGE_EFFECT_TYPES.TIMED_CHALLENGE) return effect;
      const current = cleanNumber(effect.parameters?.remaining, cleanNumber(effect.parameters?.limit, 0));
      const nextRemaining = Math.max(0, current + cleanNumber(delta, -1));
      changed = true;
      return {
        ...effect,
        parameters: {
          ...effect.parameters,
          remaining: nextRemaining
        }
      };
    });

    return {
      changed,
      challenge: {
        ...normalized,
        effects
      }
    };
  }
}

export default SkillChallengeEffectResolver;

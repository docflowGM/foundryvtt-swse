import { SKILL_CHALLENGE_ROLL_OUTCOME, SKILL_CHALLENGE_STATUS } from './SkillChallengeConstants.js';
import { SkillChallengeState } from './SkillChallengeState.js';

function cleanString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function cleanNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export class SkillChallengeRules {
  static findSkill(challenge, skillSlug) {
    const normalized = SkillChallengeState.normalize(challenge);
    const slug = cleanString(skillSlug);
    return [...normalized.primarySkills, ...normalized.secondarySkills].find(skill => skill.slug === slug) ?? null;
  }

  static getDcForSkill(challenge, skillSlug) {
    const skill = this.findSkill(challenge, skillSlug);
    return skill?.dc ?? null;
  }

  static isSkillListed(challenge, skillSlug) {
    return Boolean(this.findSkill(challenge, skillSlug));
  }

  static resolveRollAgainstChallenge(challenge, rollContext = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    const skillSlug = cleanString(rollContext.skillSlug);
    const total = cleanNumber(rollContext.total, NaN);
    const explicitDc = rollContext.dc == null ? null : cleanNumber(rollContext.dc, NaN);
    const listedDc = this.getDcForSkill(normalized, skillSlug);
    const dc = Number.isFinite(explicitDc) ? explicitDc : listedDc;

    if (!skillSlug || !Number.isFinite(total) || !Number.isFinite(dc)) {
      return this.buildOutcome({
        outcome: SKILL_CHALLENGE_ROLL_OUTCOME.GM_REVIEW,
        counted: false,
        messages: ['Roll requires GM review because skill, total, or DC is missing.']
      });
    }

    const margin = total - dc;
    const success = margin >= 0;

    return this.buildOutcome({
      outcome: success ? SKILL_CHALLENGE_ROLL_OUTCOME.SUCCESS : SKILL_CHALLENGE_ROLL_OUTCOME.FAILURE,
      counted: true,
      skillSlug,
      total,
      dc,
      margin,
      successesDelta: success ? 1 : 0,
      failuresDelta: success ? 0 : 1,
      messages: [`${skillSlug} ${success ? 'succeeds' : 'fails'} against DC ${dc}.`]
    });
  }

  static applyOutcome(challenge, outcome = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    const successes = Math.max(0, Math.min(normalized.targetSuccesses, normalized.successes + cleanNumber(outcome.successesDelta, 0)));
    const failures = Math.max(0, Math.min(normalized.failureLimit, normalized.failures + cleanNumber(outcome.failuresDelta, 0)));
    const status = successes >= normalized.targetSuccesses
      ? SKILL_CHALLENGE_STATUS.SUCCEEDED
      : failures >= normalized.failureLimit
        ? SKILL_CHALLENGE_STATUS.FAILED
        : normalized.status;

    return {
      ...normalized,
      successes,
      failures,
      status,
      history: [
        ...normalized.history,
        {
          timestamp: new Date().toISOString(),
          ...outcome
        }
      ]
    };
  }

  static isComplete(challenge) {
    const normalized = SkillChallengeState.normalize(challenge);
    return [SKILL_CHALLENGE_STATUS.SUCCEEDED, SKILL_CHALLENGE_STATUS.FAILED, SKILL_CHALLENGE_STATUS.CANCELLED].includes(normalized.status)
      || normalized.successes >= normalized.targetSuccesses
      || normalized.failures >= normalized.failureLimit;
  }

  static buildOutcome(data = {}) {
    return {
      outcome: data.outcome ?? SKILL_CHALLENGE_ROLL_OUTCOME.GM_REVIEW,
      counted: data.counted === true,
      skillSlug: cleanString(data.skillSlug),
      total: data.total ?? null,
      dc: data.dc ?? null,
      margin: data.margin ?? null,
      successesDelta: cleanNumber(data.successesDelta, 0),
      failuresDelta: cleanNumber(data.failuresDelta, 0),
      messages: Array.isArray(data.messages) ? data.messages : []
    };
  }
}

export default SkillChallengeRules;

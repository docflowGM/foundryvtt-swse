import { SKILL_CHALLENGE_EFFECT_TYPES, SKILL_CHALLENGE_STATUS } from './SkillChallengeConstants.js';
import { SkillChallengeEffectResolver } from './SkillChallengeEffectResolver.js';
import { SkillChallengeRules } from './SkillChallengeRules.js';
import { SkillChallengeState } from './SkillChallengeState.js';

function stamp(challenge) {
  return {
    ...SkillChallengeState.normalize(challenge),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Pure state engine for Skill Challenges.
 *
 * Phase 3.5C enables GM-confirmed skill roll submissions. The existing
 * skill roller remains the source of truth for actor math; this engine only
 * owns Skill Challenge tracker state transitions.
 */
export class SkillChallengeEngine {
  static createChallenge(data = {}) {
    return stamp({
      ...data,
      id: data.id || SkillChallengeState.createId(),
      status: data.status ?? SKILL_CHALLENGE_STATUS.DRAFT,
      successes: data.successes ?? 0,
      failures: data.failures ?? 0,
      history: data.history ?? [],
      createdAt: data.createdAt || new Date().toISOString()
    });
  }

  static startChallenge(challenge) {
    return this.addHistory(stamp({
      ...SkillChallengeState.normalize(challenge),
      status: SKILL_CHALLENGE_STATUS.ACTIVE
    }), { action: 'start', note: 'Skill Challenge started.' });
  }

  static addParticipant(challenge, participant) {
    const normalized = SkillChallengeState.normalize(challenge);
    const nextParticipant = SkillChallengeState.normalizeParticipant(participant);
    const existing = normalized.participants.filter(entry => entry.actorId !== nextParticipant.actorId || !nextParticipant.actorId);
    return this.addHistory(stamp({
      ...normalized,
      participants: [...existing, nextParticipant]
    }), { action: 'participant-add', actorId: nextParticipant.actorId, actorName: nextParticipant.name, note: `${nextParticipant.name} added to the challenge.` });
  }

  static removeParticipant(challenge, actorId) {
    const normalized = SkillChallengeState.normalize(challenge);
    const id = String(actorId ?? '').trim();
    const removed = normalized.participants.find(entry => entry.actorId === id);
    return this.addHistory(stamp({
      ...normalized,
      participants: normalized.participants.filter(entry => entry.actorId !== id)
    }), { action: 'participant-remove', actorId: id, actorName: removed?.name || '', note: `${removed?.name || 'Participant'} removed from the challenge.` });
  }

  static previewRollOutcome(challenge, rollContext = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    const outcome = SkillChallengeRules.resolveRollAgainstChallenge(normalized, rollContext);
    return SkillChallengeEffectResolver.applyRollEffects(normalized, outcome, rollContext);
  }

  static submitRoll(challenge, rollContext = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    const adjusted = this.previewRollOutcome(normalized, rollContext);
    return stamp(SkillChallengeRules.applyOutcome(normalized, {
      ...adjusted,
      action: 'roll-accepted-suggested',
      actorId: rollContext.actorId ?? adjusted.actorId ?? '',
      actorName: rollContext.actorName ?? adjusted.actorName ?? '',
      rollMessageId: rollContext.rollMessageId ?? adjusted.rollMessageId ?? '',
      note: adjusted.messages?.join(' ') || 'GM accepted the suggested Skill Challenge result.'
    }));
  }

  static acceptRollAsSuccess(challenge, rollContext = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    const total = Number(rollContext.total);
    const dc = rollContext.dc == null ? SkillChallengeRules.getDcForSkill(normalized, rollContext.skillSlug) : Number(rollContext.dc);
    return stamp(SkillChallengeRules.applyOutcome(normalized, {
      action: 'roll-accepted-success',
      outcome: 'success',
      counted: true,
      actorId: rollContext.actorId ?? '',
      actorName: rollContext.actorName ?? '',
      skillSlug: rollContext.skillSlug ?? '',
      total: Number.isFinite(total) ? total : null,
      dc: Number.isFinite(dc) ? dc : null,
      margin: Number.isFinite(total) && Number.isFinite(dc) ? total - dc : null,
      successesDelta: 1,
      failuresDelta: 0,
      rollMessageId: rollContext.rollMessageId ?? '',
      messages: [`GM accepted ${rollContext.skillLabel || rollContext.skillSlug || 'skill'} as a Skill Challenge success.`],
      note: `GM accepted ${rollContext.actorName || 'the actor'}'s ${rollContext.skillLabel || rollContext.skillSlug || 'skill'} roll as a success.`
    }));
  }

  static acceptRollAsFailure(challenge, rollContext = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    const total = Number(rollContext.total);
    const dc = rollContext.dc == null ? SkillChallengeRules.getDcForSkill(normalized, rollContext.skillSlug) : Number(rollContext.dc);
    return stamp(SkillChallengeRules.applyOutcome(normalized, {
      action: 'roll-accepted-failure',
      outcome: 'failure',
      counted: true,
      actorId: rollContext.actorId ?? '',
      actorName: rollContext.actorName ?? '',
      skillSlug: rollContext.skillSlug ?? '',
      total: Number.isFinite(total) ? total : null,
      dc: Number.isFinite(dc) ? dc : null,
      margin: Number.isFinite(total) && Number.isFinite(dc) ? total - dc : null,
      successesDelta: 0,
      failuresDelta: 1,
      rollMessageId: rollContext.rollMessageId ?? '',
      messages: [`GM accepted ${rollContext.skillLabel || rollContext.skillSlug || 'skill'} as a Skill Challenge failure.`],
      note: `GM accepted ${rollContext.actorName || 'the actor'}'s ${rollContext.skillLabel || rollContext.skillSlug || 'skill'} roll as a failure.`
    }));
  }

  static ignoreRoll(challenge, rollContext = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    return this.addHistory(stamp(normalized), {
      action: 'roll-ignored',
      actorId: rollContext.actorId ?? '',
      actorName: rollContext.actorName ?? '',
      skillSlug: rollContext.skillSlug ?? '',
      total: rollContext.total ?? null,
      dc: rollContext.dc ?? null,
      rollMessageId: rollContext.rollMessageId ?? '',
      note: `GM ignored ${rollContext.actorName || 'the actor'}'s ${rollContext.skillLabel || rollContext.skillSlug || 'skill'} roll for this Skill Challenge.`
    });
  }

  static markRollForReview(challenge, rollContext = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    return this.addHistory(stamp(normalized), {
      action: 'roll-review',
      actorId: rollContext.actorId ?? '',
      actorName: rollContext.actorName ?? '',
      skillSlug: rollContext.skillSlug ?? '',
      total: rollContext.total ?? null,
      dc: rollContext.dc ?? null,
      rollMessageId: rollContext.rollMessageId ?? '',
      note: `GM marked ${rollContext.actorName || 'the actor'}'s ${rollContext.skillLabel || rollContext.skillSlug || 'skill'} roll for narrative review.`
    });
  }


  static recoverFailure(challenge, { note = '' } = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    return stamp(SkillChallengeRules.applyOutcome(normalized, SkillChallengeEffectResolver.buildRecoveryOutcome(normalized, { note })));
  }

  static recordSecondEffort(challenge, { note = '' } = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    return stamp(SkillChallengeRules.applyOutcome(normalized, SkillChallengeEffectResolver.buildSecondEffortOutcome(normalized, { note })));
  }

  static advanceTimedChallenge(challenge, delta = -1) {
    const normalized = SkillChallengeState.normalize(challenge);
    const { changed, challenge: adjusted } = SkillChallengeEffectResolver.advanceTimedChallenge(normalized, delta);
    if (!changed) {
      return this.addHistory(stamp(normalized), {
        action: 'effect-timed-unavailable',
        note: 'Timed Challenge is not enabled for this Skill Challenge.'
      });
    }

    const timed = SkillChallengeEffectResolver.getEffect(adjusted, SKILL_CHALLENGE_EFFECT_TYPES.TIMED_CHALLENGE);
    const remaining = Number(timed?.parameters?.remaining ?? 0);
    const unit = String(timed?.parameters?.unit || 'step');
    const autoFail = timed?.parameters?.autoFailAtZero === true;
    const nextStatus = autoFail && remaining <= 0 ? SKILL_CHALLENGE_STATUS.FAILED : adjusted.status;

    return this.addHistory(stamp({
      ...adjusted,
      status: nextStatus
    }), {
      action: 'effect-timed-advance',
      note: `Timed Challenge adjusted by ${delta}. ${remaining} ${Math.abs(remaining) === 1 ? unit : `${unit}s`} remaining.`
    });
  }

  static manualAdjust(challenge, { successesDelta = 0, failuresDelta = 0, note = '' } = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    return stamp(SkillChallengeRules.applyOutcome(normalized, {
      counted: true,
      action: 'manual-adjust',
      successesDelta,
      failuresDelta,
      messages: note ? [note] : ['Manual GM adjustment.']
    }));
  }

  static updateChallenge(challenge, patch = {}) {
    return stamp({
      ...SkillChallengeState.normalize(challenge),
      ...patch,
      id: challenge?.id || patch?.id || SkillChallengeState.createId()
    });
  }

  static completeChallenge(challenge, status, note = '') {
    const normalized = SkillChallengeState.normalize(challenge);
    const allowed = [SKILL_CHALLENGE_STATUS.SUCCEEDED, SKILL_CHALLENGE_STATUS.FAILED, SKILL_CHALLENGE_STATUS.CANCELLED];
    const resolvedStatus = allowed.includes(status) ? status : normalized.status;
    return this.addHistory(stamp({
      ...normalized,
      status: resolvedStatus
    }), { action: `complete-${resolvedStatus}`, note: note || `Skill Challenge marked ${resolvedStatus}.` });
  }

  static addHistory(challenge, entry = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    return stamp({
      ...normalized,
      history: [
        ...normalized.history,
        SkillChallengeState.normalizeHistoryEntry({ timestamp: new Date().toISOString(), ...entry })
      ]
    });
  }
}

export default SkillChallengeEngine;

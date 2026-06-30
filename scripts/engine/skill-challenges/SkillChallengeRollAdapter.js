import { SkillChallengeEngine } from './SkillChallengeEngine.js';
import { SkillChallengeRules } from './SkillChallengeRules.js';
import { SkillChallengeState } from './SkillChallengeState.js';
import { SkillChallengeStore } from './SkillChallengeStore.js';

function cleanString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function titleCase(value = '') {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[\-_]+/g, ' ')
    .split(/\s+/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function gmUserIds() {
  return globalThis.game?.users?.filter?.(user => user?.isGM)?.map(user => user.id).filter(Boolean) ?? [];
}

function skillLabelFor(skillSlug = '', explicitLabel = '') {
  return cleanString(explicitLabel) || cleanString(globalThis.CONFIG?.SWSE?.skills?.[skillSlug]?.label) || titleCase(skillSlug || 'Skill');
}

function rollTotalFromMessage(message = {}) {
  const roll = message?.rolls?.[0];
  return numberOrNull(roll?.total ?? message?.flags?.swse?.total ?? message?.flags?.swse?.rollTotal);
}

function normalizeRollContext(input = {}) {
  const message = input.message ?? null;
  const flags = message?.flags?.swse ?? message?.flags?.foundryvttSwse ?? {};
  const skillSlug = cleanString(input.skillSlug ?? flags.skillKey ?? flags.skillSlug ?? flags.skill ?? flags.rollData?.skill);
  const total = numberOrNull(input.total ?? flags.total ?? flags.rollTotal ?? rollTotalFromMessage(message));
  const actor = input.actor ?? (flags.actorId ? globalThis.game?.actors?.get?.(flags.actorId) : null);
  const actorId = cleanString(input.actorId ?? actor?.id ?? flags.actorId ?? message?.speaker?.actor);
  const tokenId = cleanString(input.tokenId ?? flags.tokenId ?? message?.speaker?.token);
  const actorName = cleanString(input.actorName ?? actor?.name ?? flags.actorName ?? message?.speaker?.alias, 'Unknown Actor');

  return {
    actor,
    actorId,
    tokenId,
    actorName,
    skillSlug,
    skillLabel: skillLabelFor(skillSlug, input.skillLabel ?? flags.skillLabel),
    total,
    dc: numberOrNull(input.dc ?? flags.dc),
    rollMessageId: cleanString(input.rollMessageId ?? message?.id),
    gmReviewRequired: true
  };
}

function outcomeLabel(outcome = {}) {
  if (outcome.outcome === 'success') return 'Suggested Success';
  if (outcome.outcome === 'failure') return 'Suggested Failure';
  return 'GM Review';
}

function decorateChallengeForCard(challenge = {}, rollContext = {}) {
  const normalized = SkillChallengeState.normalize(challenge);
  const listed = SkillChallengeRules.findSkill(normalized, rollContext.skillSlug);
  const dc = numberOrNull(rollContext.dc) ?? SkillChallengeRules.getDcForSkill(normalized, rollContext.skillSlug);
  const outcome = SkillChallengeRules.resolveRollAgainstChallenge(normalized, { ...rollContext, dc });
  const adjusted = SkillChallengeEngine.previewRollOutcome(normalized, { ...rollContext, dc });

  return {
    ...normalized,
    skillListed: Boolean(listed),
    matchedSkillLabel: listed?.label || rollContext.skillLabel,
    dc,
    outcome,
    adjustedOutcome: adjusted,
    outcomeLabel: outcomeLabel(adjusted),
    outcomeTone: adjusted.outcome === 'success' ? 'ok' : adjusted.outcome === 'failure' ? 'warn' : 'review',
    message: adjusted.messages?.join(' ') || 'GM review required.',
    successPreview: Math.max(0, Math.min(normalized.targetSuccesses, normalized.successes + Number(adjusted.successesDelta || 0))),
    failurePreview: Math.max(0, Math.min(normalized.failureLimit, normalized.failures + Number(adjusted.failuresDelta || 0)))
  };
}

async function renderReviewCard(data = {}) {
  return globalThis.foundry?.applications?.handlebars?.renderTemplate?.(
    'systems/foundryvtt-swse/templates/chat/skill-challenge-card.hbs',
    data
  );
}

async function createReviewMessage({ content, actor = null, rollContext = {}, challengeOptions = [] } = {}) {
  const whisper = gmUserIds();
  const messageData = {
    user: globalThis.game?.user?.id,
    speaker: globalThis.ChatMessage?.getSpeaker?.({ actor }) ?? {},
    content,
    whisper,
    flags: {
      swse: {
        skillChallengeReviewCard: true,
        skillChallengeRollContext: {
          actorId: rollContext.actorId,
          tokenId: rollContext.tokenId,
          actorName: rollContext.actorName,
          skillSlug: rollContext.skillSlug,
          skillLabel: rollContext.skillLabel,
          total: rollContext.total,
          dc: rollContext.dc,
          rollMessageId: rollContext.rollMessageId
        },
        skillChallengeIds: challengeOptions.map(challenge => challenge.id)
      }
    }
  };

  return globalThis.ChatMessage?.create?.(messageData);
}

/**
 * Adapter boundary between existing skill rolls and Skill Challenges.
 *
 * The existing skill roller remains the source of truth for actor math. This
 * adapter translates a completed skill roll into a GM-review card and only
 * mutates tracker state after an explicit GM button click.
 */
export class SkillChallengeRollAdapter {
  static fromSkillRollMessage(message = {}) {
    return normalizeRollContext({ message });
  }

  static shouldOfferApplyToChallenge(message = {}) {
    const context = this.fromSkillRollMessage(message);
    return Boolean(context.skillSlug && context.total !== null);
  }

  static async getApplicableActiveChallenges(rollContext = {}) {
    const normalizedRoll = normalizeRollContext(rollContext);
    if (!normalizedRoll.skillSlug || normalizedRoll.total === null) return [];

    const challenges = await SkillChallengeStore.getActiveChallenges();
    return challenges.filter(challenge => {
      if (SkillChallengeRules.isSkillListed(challenge, normalizedRoll.skillSlug)) return true;
      return challenge.primarySkills.length === 0 && challenge.secondarySkills.length === 0;
    });
  }

  static async postRollReviewCardFromSkillRoll(input = {}) {
    try {
      const rollContext = normalizeRollContext(input);
      if (!rollContext.skillSlug || rollContext.total === null) return null;

      const applicable = await this.getApplicableActiveChallenges(rollContext);
      if (!applicable.length) return null;

      const challengeOptions = applicable.map(challenge => decorateChallengeForCard(challenge, rollContext));
      const content = await renderReviewCard({
        phase: '3.5D',
        mode: 'review',
        isGm: globalThis.game?.user?.isGM === true,
        roll: rollContext,
        challengeOptions,
        hasMultipleChallenges: challengeOptions.length > 1,
        sourceMessageId: rollContext.rollMessageId
      });

      if (!content) return null;
      return createReviewMessage({ content, actor: rollContext.actor, rollContext, challengeOptions });
    } catch (err) {
      console.warn('[SWSE] Skill Challenge review card failed', err);
      return null;
    }
  }

  static async resolveReviewAction(button, { message = null } = {}) {
    if (globalThis.game?.user?.isGM !== true) {
      globalThis.ui?.notifications?.warn?.('Only a GM can resolve Skill Challenge roll submissions.');
      return null;
    }

    const action = cleanString(button?.dataset?.skillChallengeChatAction);
    const challengeId = cleanString(button?.dataset?.challengeId);
    const flags = message?.flags?.swse ?? {};
    const rollContext = normalizeRollContext(flags.skillChallengeRollContext ?? {});
    const challenge = await SkillChallengeStore.getById(challengeId);

    if (!challenge) {
      globalThis.ui?.notifications?.warn?.('Skill Challenge tracker could not be found.');
      return null;
    }

    let next = null;
    if (action === 'accept-success') {
      next = SkillChallengeEngine.acceptRollAsSuccess(challenge, rollContext);
    } else if (action === 'accept-failure') {
      next = SkillChallengeEngine.acceptRollAsFailure(challenge, rollContext);
    } else if (action === 'accept-suggested') {
      next = SkillChallengeEngine.submitRoll(challenge, rollContext);
    } else if (action === 'ignore-roll') {
      next = SkillChallengeEngine.ignoreRoll(challenge, rollContext);
    } else if (action === 'gm-review') {
      next = SkillChallengeEngine.markRollForReview(challenge, rollContext);
    }

    if (!next) return null;
    await SkillChallengeStore.saveChallenge(next);
    await this.markReviewMessageResolved(message, { action, challengeId, challengeName: next.name, status: next.status });
    globalThis.ui?.notifications?.info?.(`Skill Challenge updated: ${next.name}`);
    globalThis.Hooks?.callAll?.('swse.skillChallengeUpdated', next, { source: 'chat-review', action });
    return next;
  }

  static async markReviewMessageResolved(message, resolution = {}) {
    if (!message?.id) return;
    try {
      await message.update?.({
        'flags.swse.skillChallengeReviewResolved': true,
        'flags.swse.skillChallengeReviewResolution': {
          ...resolution,
          resolvedBy: globalThis.game?.user?.id ?? '',
          resolvedAt: new Date().toISOString()
        }
      });
    } catch (err) {
      console.warn('[SWSE] Failed to mark Skill Challenge review card resolved', err);
    }
  }
}

export default SkillChallengeRollAdapter;

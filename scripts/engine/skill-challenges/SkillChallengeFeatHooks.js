import { SKILL_CHALLENGE_EFFECT_TYPES, SKILL_CHALLENGE_FEAT_RULE_TYPES } from './SkillChallengeConstants.js';
import { SkillChallengeState } from './SkillChallengeState.js';

// Rule types: SKILL_CHALLENGE_CATASTROPHIC_AVOIDANCE, SKILL_CHALLENGE_LAST_RESORT, SKILL_CHALLENGE_RECOVERY
const FEAT_DEFINITIONS = Object.freeze({
  catastrophicAvoidance: Object.freeze({
    name: 'Skill Challenge: Catastrophic Avoidance',
    slug: 'skill-challenge-catastrophic-avoidance',
    ruleType: SKILL_CHALLENGE_FEAT_RULE_TYPES.CATASTROPHIC_AVOIDANCE,
    effectType: SKILL_CHALLENGE_EFFECT_TYPES.CATASTROPHIC_FAILURE,
    action: 'feat-catastrophic-avoidance',
    label: 'Apply Catastrophic Avoidance',
    summary: 'Once per Skill Challenge, catastrophic failure for this hero triggers only on a failure by 15+ and counts as one failure instead of two.'
  }),
  lastResort: Object.freeze({
    name: 'Skill Challenge: Last Resort',
    slug: 'skill-challenge-last-resort',
    ruleType: SKILL_CHALLENGE_FEAT_RULE_TYPES.LAST_RESORT,
    action: 'feat-last-resort',
    label: 'Use Last Resort',
    summary: 'Once per Skill Challenge, when a third failure would end the challenge, the hero or an ally can reroll and keep the better result.'
  }),
  recovery: Object.freeze({
    name: 'Skill Challenge: Recovery',
    slug: 'skill-challenge-recovery',
    ruleType: SKILL_CHALLENGE_FEAT_RULE_TYPES.RECOVERY,
    effectType: SKILL_CHALLENGE_EFFECT_TYPES.RECOVERY,
    action: 'feat-recovery',
    label: 'Use Recovery Feat',
    summary: 'Treat this Skill Challenge as having the Recovery effect for this hero, with GM approval.'
  })
});

function cleanString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeKey(value = '') {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function actorFromId(actorId = '') {
  const id = cleanString(actorId);
  return id ? globalThis.game?.actors?.get?.(id) ?? null : null;
}

function actorFromContext(rollContext = {}) {
  return rollContext.actor ?? actorFromId(rollContext.actorId) ?? null;
}

function actorFeatItems(actor = null) {
  if (!actor?.items) return [];
  return Array.from(actor.items).filter(item => item?.type === 'feat');
}

function featKeys(item = {}) {
  const system = item.system ?? {};
  const abilityMeta = system.abilityMeta ?? {};
  const rules = Array.isArray(abilityMeta.skillChallengeRules) ? abilityMeta.skillChallengeRules : [];
  return [
    item.name,
    system.slug,
    item.flags?.swse?.id,
    ...rules.map(rule => rule?.type)
  ].map(normalizeKey).filter(Boolean);
}

function actorHasFeat(actor = null, definition = {}) {
  const wanted = new Set([
    normalizeKey(definition.name),
    normalizeKey(definition.slug),
    normalizeKey(definition.ruleType)
  ].filter(Boolean));
  return actorFeatItems(actor).some(item => featKeys(item).some(key => wanted.has(key)));
}

function actorLabel(actor = null, fallback = '') {
  return cleanString(actor?.name, cleanString(fallback, 'Unknown Actor'));
}

function usageKey(ruleType = '', actorId = '') {
  return `${cleanString(ruleType)}:${cleanString(actorId)}`;
}

function getFeatUsage(challenge = {}, ruleType = '', actorId = '') {
  const key = usageKey(ruleType, actorId);
  return SkillChallengeState.normalize(challenge).featUsage.find(entry => entry.key === key) ?? null;
}

function wouldCauseThirdFailure(challenge = {}, outcome = {}) {
  const normalized = SkillChallengeState.normalize(challenge);
  return Number(outcome.failuresDelta || 0) > 0 && normalized.failures + Number(outcome.failuresDelta || 0) >= normalized.failureLimit;
}

function isCatastrophicOutcome(challenge = {}, outcome = {}) {
  const normalized = SkillChallengeState.normalize(challenge);
  const hasCatastrophic = normalized.effects.some(effect => effect.enabled !== false && effect.type === SKILL_CHALLENGE_EFFECT_TYPES.CATASTROPHIC_FAILURE);
  if (!hasCatastrophic) return false;
  return Number(outcome.failuresDelta || 0) > 1 || String(outcome.messages || '').toLowerCase().includes('catastrophic failure');
}

function participantActors(challenge = {}) {
  return SkillChallengeState.normalize(challenge).participants
    .map(participant => ({ participant, actor: actorFromId(participant.actorId) }))
    .filter(entry => entry.actor);
}

function ruleAvailable(challenge = {}, ruleType = '', actorId = '') {
  return !getFeatUsage(challenge, ruleType, actorId);
}

function buildOption(definition, actor, extra = {}) {
  return {
    action: definition.action,
    label: definition.label,
    featName: definition.name,
    ruleType: definition.ruleType,
    actorId: cleanString(actor?.id),
    actorName: actorLabel(actor),
    summary: definition.summary,
    ...extra
  };
}

export class SkillChallengeFeatHooks {
  static get FEATS() {
    return FEAT_DEFINITIONS;
  }

  static normalizeKey(value = '') {
    return normalizeKey(value);
  }

  static actorHasSkillChallengeFeat(actor = null, featKey = '') {
    const definition = FEAT_DEFINITIONS[featKey];
    return Boolean(definition && actorHasFeat(actor, definition));
  }

  static getActorSkillChallengeFeats(actor = null) {
    return Object.entries(FEAT_DEFINITIONS)
      .filter(([_key, definition]) => actorHasFeat(actor, definition))
      .map(([key, definition]) => ({ key, ...definition }));
  }

  static getReactionOptions(challenge, rollContext = {}, outcome = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    const actor = actorFromContext(rollContext);
    const actorId = cleanString(actor?.id ?? rollContext.actorId);
    const options = [];

    if (actor && isCatastrophicOutcome(normalized, outcome) && actorHasFeat(actor, FEAT_DEFINITIONS.catastrophicAvoidance) && ruleAvailable(normalized, FEAT_DEFINITIONS.catastrophicAvoidance.ruleType, actorId)) {
      options.push(buildOption(FEAT_DEFINITIONS.catastrophicAvoidance, actor, {
        tone: 'warn',
        eligible: true,
        reason: 'Catastrophic failure preview detected.'
      }));
    }

    if (wouldCauseThirdFailure(normalized, outcome)) {
      for (const { actor: participantActor } of participantActors(normalized)) {
        if (!actorHasFeat(participantActor, FEAT_DEFINITIONS.lastResort)) continue;
        if (!ruleAvailable(normalized, FEAT_DEFINITIONS.lastResort.ruleType, participantActor.id)) continue;
        options.push(buildOption(FEAT_DEFINITIONS.lastResort, participantActor, {
          tone: 'warn',
          eligible: true,
          reason: 'This result would reach the failure limit.'
        }));
      }
    }

    return options;
  }

  static getTrackerOptions(challenge = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    const options = [];

    for (const { actor } of participantActors(normalized)) {
      if (actorHasFeat(actor, FEAT_DEFINITIONS.recovery) && ruleAvailable(normalized, FEAT_DEFINITIONS.recovery.ruleType, actor.id)) {
        options.push(buildOption(FEAT_DEFINITIONS.recovery, actor, {
          tone: 'ok',
          eligible: normalized.failures > 0,
          reason: normalized.failures > 0 ? 'A failure can be recovered with GM approval.' : 'No accumulated failures to recover.'
        }));
      }

      if (actorHasFeat(actor, FEAT_DEFINITIONS.lastResort) && ruleAvailable(normalized, FEAT_DEFINITIONS.lastResort.ruleType, actor.id)) {
        options.push(buildOption(FEAT_DEFINITIONS.lastResort, actor, {
          tone: 'warn',
          eligible: normalized.failures >= Math.max(0, normalized.failureLimit - 1),
          reason: normalized.failures >= Math.max(0, normalized.failureLimit - 1) ? 'Available if the next failure would end the challenge.' : 'Held until the challenge is at the failure brink.'
        }));
      }
    }

    return options;
  }

  static applyCatastrophicAvoidance(outcome = {}, { actorName = '' } = {}) {
    const failuresDelta = Math.max(0, Number(outcome.failuresDelta || 0));
    return {
      ...outcome,
      failuresDelta: failuresDelta > 0 ? 1 : 0,
      messages: [
        ...(Array.isArray(outcome.messages) ? outcome.messages : []),
        `${actorName || 'The hero'} uses Skill Challenge: Catastrophic Avoidance; this catastrophic failure counts as one failure.`
      ]
    };
  }

  static buildLastResortOutcome({ actorId = '', actorName = '', rollContext = {} } = {}) {
    return {
      counted: false,
      action: 'feat-last-resort',
      actorId: cleanString(actorId),
      actorName: actorLabel(null, actorName),
      skillSlug: cleanString(rollContext.skillSlug),
      total: rollContext.total ?? null,
      dc: rollContext.dc ?? null,
      successesDelta: 0,
      failuresDelta: 0,
      messages: [`${actorName || 'A hero'} uses Skill Challenge: Last Resort. Reroll the triggering attempt and keep the better result before applying the third failure.`]
    };
  }

  static buildRecoveryFeatOutcome({ actorId = '', actorName = '' } = {}) {
    return {
      counted: true,
      action: 'feat-recovery',
      actorId: cleanString(actorId),
      actorName: actorLabel(null, actorName),
      successesDelta: 0,
      failuresDelta: -1,
      messages: [`${actorName || 'A hero'} uses Skill Challenge: Recovery; GM removes one accumulated failure.`]
    };
  }

  static markFeatUsed(challenge = {}, { ruleType = '', actorId = '', actorName = '', featName = '', note = '' } = {}) {
    const normalized = SkillChallengeState.normalize(challenge);
    const key = usageKey(ruleType, actorId);
    const already = normalized.featUsage.some(entry => entry.key === key);
    const usage = already ? normalized.featUsage : [
      ...normalized.featUsage,
      SkillChallengeState.normalizeFeatUsage({ key, ruleType, actorId, actorName, featName, note })
    ];
    return {
      ...normalized,
      featUsage: usage
    };
  }

  static getActorFromId(actorId = '') {
    return actorFromId(actorId);
  }
}

export default SkillChallengeFeatHooks;

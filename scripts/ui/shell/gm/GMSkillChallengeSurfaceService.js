import { SKILL_CHALLENGE_EFFECT_TYPES } from '/systems/foundryvtt-swse/scripts/engine/skill-challenges/SkillChallengeConstants.js';
import { SkillChallengeState } from '/systems/foundryvtt-swse/scripts/engine/skill-challenges/SkillChallengeState.js';
import { SkillChallengeFeatHooks } from '/systems/foundryvtt-swse/scripts/engine/skill-challenges/SkillChallengeFeatHooks.js';
import { SkillChallengeStore } from '/systems/foundryvtt-swse/scripts/engine/skill-challenges/SkillChallengeStore.js';

function titleCase(value = '') {
  return String(value || '')
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value = '') {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return 'No timestamp';
  try {
    return new Date(time).toLocaleString();
  } catch (_err) {
    return value;
  }
}

function statusTone(status = '') {
  if (status === 'active') return 'info';
  if (status === 'succeeded') return 'ok';
  if (status === 'failed') return 'crit';
  if (status === 'cancelled') return 'warn';
  return 'stable';
}


function decorateEffect(effect = {}, challenge = {}) {
  const parameters = effect.parameters && typeof effect.parameters === 'object' ? effect.parameters : {};
  const type = effect.type || '';
  const timedRemaining = type === SKILL_CHALLENGE_EFFECT_TYPES.TIMED_CHALLENGE ? Number(parameters.remaining ?? parameters.limit ?? 0) : null;
  const timedUnit = String(parameters.unit || 'step');
  const parameterLabel = Object.keys(parameters).length ? Object.entries(parameters)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ') : '';

  return {
    ...effect,
    parameters,
    parameterLabel,
    isCatastrophicFailure: type === SKILL_CHALLENGE_EFFECT_TYPES.CATASTROPHIC_FAILURE,
    isRestrictedSkills: type === SKILL_CHALLENGE_EFFECT_TYPES.RESTRICTED_SKILLS,
    isRecovery: type === SKILL_CHALLENGE_EFFECT_TYPES.RECOVERY,
    isSecondEffort: type === SKILL_CHALLENGE_EFFECT_TYPES.SECOND_EFFORT,
    isTimedChallenge: type === SKILL_CHALLENGE_EFFECT_TYPES.TIMED_CHALLENGE,
    timedRemaining,
    timedUnit,
    canRecoverFailure: type === SKILL_CHALLENGE_EFFECT_TYPES.RECOVERY && Number(challenge.failures || 0) > 0,
    summary: buildEffectSummary(effect)
  };
}

function buildEffectSummary(effect = {}) {
  const type = effect.type || '';
  const parameters = effect.parameters && typeof effect.parameters === 'object' ? effect.parameters : {};
  if (type === SKILL_CHALLENGE_EFFECT_TYPES.CATASTROPHIC_FAILURE) {
    return `Failed checks missing by ${parameters.threshold ?? 10}+ add ${parameters.extraFailures ?? 1} extra failure.`;
  }
  if (type === SKILL_CHALLENGE_EFFECT_TYPES.RESTRICTED_SKILLS) {
    return 'Only listed skills count automatically; other approaches require GM review.';
  }
  if (type === SKILL_CHALLENGE_EFFECT_TYPES.RECOVERY) {
    return 'GM may recover accumulated failures when the challenge rules allow it.';
  }
  if (type === SKILL_CHALLENGE_EFFECT_TYPES.SECOND_EFFORT) {
    return 'GM may record an allowed additional attempt or retry opportunity.';
  }
  if (type === SKILL_CHALLENGE_EFFECT_TYPES.TIMED_CHALLENGE) {
    return `${parameters.remaining ?? parameters.limit ?? 0} ${parameters.unit || 'step'} remaining.`;
  }
  return effect.notes || 'GM-adjudicated challenge effect.';
}

function decorateChallenge(challenge = {}) {
  const normalized = SkillChallengeState.normalize(challenge);
  const successPercent = Math.round((normalized.successes / Math.max(1, normalized.targetSuccesses)) * 100);
  const failurePercent = Math.round((normalized.failures / Math.max(1, normalized.failureLimit)) * 100);
  return {
    ...normalized,
    statusLabel: titleCase(normalized.status),
    statusTone: statusTone(normalized.status),
    updatedLabel: formatDate(normalized.updatedAt),
    successPips: SkillChallengeState.progressPips(normalized.successes, normalized.targetSuccesses),
    failurePips: SkillChallengeState.progressPips(normalized.failures, normalized.failureLimit),
    successPercent,
    failurePercent,
    primarySkillsLabel: normalized.primarySkills.map(skill => `${skill.label || skill.slug} DC ${skill.dc}`).join(', ') || 'No primary skills set',
    effectLabel: normalized.effects.filter(effect => effect.enabled !== false).map(effect => effect.label || effect.type).join(', ') || 'No challenge effects',
    participantLabel: normalized.participants.length ? `${normalized.participants.length} participant${normalized.participants.length === 1 ? '' : 's'}` : 'No participants yet',
    primarySkillsText: normalized.primarySkills.map(skill => [skill.slug, skill.dc, skill.label, skill.notes].filter(value => value !== '').join(':')).join('\n'),
    secondarySkillsText: normalized.secondarySkills.map(skill => [skill.slug, skill.dc, skill.label, skill.notes].filter(value => value !== '').join(':')).join('\n'),
    effectsText: normalized.effects.map(effect => [effect.type, effect.label, effect.notes, Object.keys(effect.parameters || {}).length ? JSON.stringify(effect.parameters) : ''].filter(value => value !== '').join(':')).join('\n'),
    decoratedEffects: normalized.effects.map(effect => decorateEffect(effect, normalized)),
    featOptions: SkillChallengeFeatHooks.getTrackerOptions(normalized),
    hasFeatOptions: SkillChallengeFeatHooks.getTrackerOptions(normalized).length > 0,
    recentHistory: [...normalized.history].reverse().slice(0, 8).map(entry => ({
      ...entry,
      timestampLabel: formatDate(entry.timestamp),
      deltaLabel: [
        Number(entry.successesDelta || 0) ? `${Number(entry.successesDelta) > 0 ? '+' : ''}${entry.successesDelta} success` : '',
        Number(entry.failuresDelta || 0) ? `${Number(entry.failuresDelta) > 0 ? '+' : ''}${entry.failuresDelta} failure` : ''
      ].filter(Boolean).join(' / ')
    }))
  };
}

export class GMSkillChallengeSurfaceService {
  static async buildViewModel(host = null) {
    const state = host?.getSurfaceState?.('skill-challenges') ?? {};
    const challenges = (await SkillChallengeStore.getAll()).map(decorateChallenge);
    const selectedId = state.selectedChallengeId || challenges.find(entry => entry.status === 'active')?.id || challenges[0]?.id || '';
    const activeChallenge = challenges.find(entry => entry.id === selectedId) ?? challenges[0] ?? null;

    return {
      id: 'skill-challenges',
      surfaceId: 'skill-challenges',
      pageTitle: 'Skill Challenges',
      pageDescription: 'GM-authored encounter progress tracker for Galaxy of Intrigue style challenges.',
      title: 'Skill Challenges',
      subtitle: 'Manual tracker with GM-confirmed skill roll submissions.',
      isGm: globalThis.game?.user?.isGM === true,
      selectedChallengeId: activeChallenge?.id || '',
      activeChallenge,
      challenges,
      hasChallenges: challenges.length > 0,
      activeCount: challenges.filter(entry => entry.status === 'active').length,
      completedCount: challenges.filter(entry => ['succeeded', 'failed', 'cancelled'].includes(entry.status)).length,
      createDefaults: {
        name: 'New Skill Challenge',
        source: 'Galaxy of Intrigue',
        cl: 1,
        complexity: 1,
        targetSuccesses: 4,
        failureLimit: 3,
        primarySkillsText: 'perception:15:Perception\npersuasion:15:Persuasion',
        effectsText: 'catastrophicFailure:Catastrophic Failure:\nrestrictedSkills:Restricted Skills:\nrecovery:Recovery:\nsecondEffort:Second Effort:\ntimedChallenge:Timed Challenge::{"limit":6,"remaining":6,"unit":"step"}',
        playerBrief: '',
        successText: '',
        failureText: '',
        gmNotes: ''
      },
      readiness: {
        phase: '3.5E',
        wired: true,
        note: 'Manual tracker, GM-confirmed roll submissions, safe challenge effects, and Skill Challenge feat hooks are active.'
      }
    };
  }
}

export default GMSkillChallengeSurfaceService;

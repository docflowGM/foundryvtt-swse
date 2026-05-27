import { scorePazaakPlayer, applyPazaakSideCard } from './pazaak-rules.js';
import { PAZAAK_TARGET } from './pazaak-deck.js';
import {
  forceFeelingForNextCard,
  getPazaakPersonalityModifier,
  randomForceFeelingLine,
  randomPazaakDialogue,
  resolvePazaakAiPersonality
} from './pazaak-ai-personalities.js';

export const PAZAAK_AI_DIFFICULTIES = Object.freeze({
  easy: {
    id: 'easy', label: 'Easy', standAt: 16, pushAt: 14, bustFixOnlyAt: 21, mistakeRate: 0.28, conserveCards: 0.1
  },
  medium: {
    id: 'medium', label: 'Medium', standAt: 18, pushAt: 16, bustFixOnlyAt: 21, mistakeRate: 0.12, conserveCards: 0.35
  },
  hard: {
    id: 'hard', label: 'Hard', standAt: 19, pushAt: 17, bustFixOnlyAt: 21, mistakeRate: 0.05, conserveCards: 0.55
  },
  pro: {
    id: 'pro', label: 'Pro', standAt: 19, pushAt: 18, bustFixOnlyAt: 21, mistakeRate: 0.015, conserveCards: 0.75
  },
  grandmaster: {
    id: 'grandmaster', label: 'Grandmaster', standAt: 20, pushAt: 18, bustFixOnlyAt: 21, mistakeRate: 0, conserveCards: 0.9
  }
});

export const PAZAAK_AI_FAIRNESS = Object.freeze({
  fair: { id: 'fair', label: 'Fair', canSeeHiddenHand: false, canSeeNextCard: false, houseEdge: false, cheating: false },
  cinematic: { id: 'cinematic', label: 'Cinematic', canSeeHiddenHand: false, canSeeNextCard: false, houseEdge: false, cheating: false },
  houseEdge: { id: 'houseEdge', label: 'House Edge', canSeeHiddenHand: false, canSeeNextCard: false, houseEdge: true, cheating: false },
  cheating: { id: 'cheating', label: 'Cheating', canSeeHiddenHand: true, canSeeNextCard: true, houseEdge: true, cheating: true },
  gmControlled: { id: 'gmControlled', label: 'GM Controlled', gmControlled: true }
});

function normalizeDifficulty(value) {
  const id = String(value || 'medium');
  return PAZAAK_AI_DIFFICULTIES[id] ? id : 'medium';
}

function normalizeFairness(value) {
  const id = String(value || 'fair');
  return PAZAAK_AI_FAIRNESS[id] ? id : 'fair';
}

export function buildPazaakAiProfile(profile = {}) {
  if (typeof profile === 'string') {
    const legacyMap = { normal: 'medium', balanced: 'medium', cautious: 'medium', aggressive: 'hard' };
    const personality = profile || 'methodical';
    const personalityData = resolvePazaakAiPersonality(personality);
    return {
      difficulty: normalizeDifficulty(legacyMap[profile] || profile),
      fairness: 'fair',
      personality,
      personalityLabel: personalityData.label,
      personalityQuality: personalityData.quality,
      forceSensitive: false,
      forceSensitivityChance: 0.05
    };
  }
  const difficulty = normalizeDifficulty(profile.difficulty || profile.level || profile.aiDifficulty);
  const fairness = normalizeFairness(profile.fairness || profile.aiFairness);
  const personality = profile.personality || 'methodical';
  const personalityData = resolvePazaakAiPersonality(personality);
  return {
    ...profile,
    difficulty,
    fairness,
    personality,
    personalityLabel: profile.personalityLabel || personalityData.label,
    personalityQuality: profile.personalityQuality || personalityData.quality,
    forceSensitive: Boolean(profile.forceSensitive),
    forceSensitivityChance: Number(profile.forceSensitivityChance ?? 0.05) || 0.05,
    gmControlled: Boolean(profile.gmControlled || fairness === 'gmControlled')
  };
}

function choicesForCard(card = {}) {
  if (card.type === 'plusMinus') return [{ sign: 'plus' }, { sign: 'minus' }];
  if (card.type === 'tiebreaker') return [{ sign: 'plus' }, { sign: 'minus' }];
  if (card.type === 'plusMinusRange') return [
    { sign: 'plus', value: 1 }, { sign: 'minus', value: 1 },
    { sign: 'plus', value: 2 }, { sign: 'minus', value: 2 }
  ];
  return [{}];
}

function bestSidePlay(player = {}, aiProfile = {}) {
  const currentScore = scorePazaakPlayer(player);
  const difficulty = PAZAAK_AI_DIFFICULTIES[aiProfile.difficulty] || PAZAAK_AI_DIFFICULTIES.medium;
  const fairness = PAZAAK_AI_FAIRNESS[aiProfile.fairness] || PAZAAK_AI_FAIRNESS.fair;
  let best = null;

  for (const card of Array.isArray(player.hand) ? player.hand : []) {
    for (const choice of choicesForCard(card)) {
      const result = applyPazaakSideCard(player, card.instanceId, choice);
      if (!result.ok) continue;
      const score = scorePazaakPlayer(result.player);
      if (score > PAZAAK_TARGET) continue;
      const distance = Math.abs(PAZAAK_TARGET - score);
      const gain = Math.abs(PAZAAK_TARGET - currentScore) - distance;
      const isRare = ['tiebreaker', 'double', 'flip', 'plusMinusRange'].includes(card.type);
      const conserveMod = getPazaakPersonalityModifier(aiProfile.personality, 'conserveCards', 0);
      const exactTwentyBias = getPazaakPersonalityModifier(aiProfile.personality, 'exactTwentyBias', 0);
      const conservationPenalty = isRare ? Math.max(0, difficulty.conserveCards + (conserveMod * 0.18)) : 0;
      const exactTwentyBonus = score === PAZAAK_TARGET ? exactTwentyBias * 0.4 : 0;
      const houseEdgeBonus = fairness.houseEdge && score >= 19 ? 0.35 : 0;
      const candidate = {
        card,
        choice,
        score,
        gain,
        rating: (score * 2) + gain - conservationPenalty + houseEdgeBonus + exactTwentyBonus - distance
      };
      if (!best || candidate.rating > best.rating) best = candidate;
    }
  }
  return best;
}

function shouldMakeMistake(profile) {
  const difficulty = PAZAAK_AI_DIFFICULTIES[profile.difficulty] || PAZAAK_AI_DIFFICULTIES.medium;
  const fairness = PAZAAK_AI_FAIRNESS[profile.fairness] || PAZAAK_AI_FAIRNESS.fair;
  if (fairness.houseEdge || fairness.cheating) return false;
  const unpredictability = Math.max(0, getPazaakPersonalityModifier(profile.personality, 'unpredictability', 0));
  return Math.random() < Math.min(0.45, difficulty.mistakeRate + (unpredictability * 0.025));
}

export class PazaakAi {
  static chooseTurn(player = {}, rawProfile = 'medium', context = {}) {
    const profile = buildPazaakAiProfile(rawProfile);
    if (profile.gmControlled) return { type: 'end-turn', gmControlled: true };

    const difficulty = PAZAAK_AI_DIFFICULTIES[profile.difficulty] || PAZAAK_AI_DIFFICULTIES.medium;
    const fairness = PAZAAK_AI_FAIRNESS[profile.fairness] || PAZAAK_AI_FAIRNESS.fair;
    const score = scorePazaakPlayer(player);
    const best = bestSidePlay(player, profile);
    const standMod = getPazaakPersonalityModifier(profile.personality, 'standThreshold', 0);
    const riskMod = getPazaakPersonalityModifier(profile.personality, 'riskTolerance', 0);
    let standAt = (fairness.houseEdge ? Math.max(18, difficulty.standAt) : difficulty.standAt) + standMod;
    standAt = Math.max(14, Math.min(PAZAAK_TARGET, standAt));

    const nextMainCard = context?.nextMainCard || null;
    if (profile.forceSensitive && nextMainCard && Math.random() < Math.max(0, Math.min(1, profile.forceSensitivityChance))) {
      const feeling = forceFeelingForNextCard(score, nextMainCard.value);
      const line = randomPazaakDialogue(profile.personality, 'forceSensitivityNudge', randomForceFeelingLine(feeling));
      if (feeling === 'dangerous' && score >= Math.max(14, standAt - 2) && score <= PAZAAK_TARGET) {
        return { type: 'stand', forceIntuition: { feeling, line } };
      }
      if (feeling === 'excellent' && score < PAZAAK_TARGET) {
        return { type: 'end-turn', forceIntuition: { feeling, line } };
      }
    }

    if (score > PAZAAK_TARGET && best) return { type: 'play-side-card', cardInstanceId: best.card.instanceId, choice: best.choice };

    if (shouldMakeMistake(profile)) {
      if (score >= 15 && score <= PAZAAK_TARGET) return { type: Math.random() < 0.5 ? 'stand' : 'end-turn', mistake: true };
      return { type: 'end-turn', mistake: true };
    }

    if (best && best.score === PAZAAK_TARGET) return { type: 'play-side-card', cardInstanceId: best.card.instanceId, choice: best.choice };
    const pushAt = Math.max(10, Math.min(PAZAAK_TARGET, difficulty.pushAt - riskMod));
    if (best && score >= pushAt && best.score >= standAt && best.gain > 0) return { type: 'play-side-card', cardInstanceId: best.card.instanceId, choice: best.choice };
    if (score >= standAt && score <= PAZAAK_TARGET) return { type: 'stand' };
    return { type: 'end-turn' };
  }

  static labelForDifficulty(value) {
    return PAZAAK_AI_DIFFICULTIES[normalizeDifficulty(value)].label;
  }

  static labelForFairness(value) {
    return PAZAAK_AI_FAIRNESS[normalizeFairness(value)].label;
  }

  static labelForPersonality(value) {
    return resolvePazaakAiPersonality(value).label;
  }

  static qualityForPersonality(value) {
    return resolvePazaakAiPersonality(value).quality;
  }
}

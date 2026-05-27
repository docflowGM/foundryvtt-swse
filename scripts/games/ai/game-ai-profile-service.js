/**
 * Shared deterministic computer-player AI profile helpers for Holopad Games.
 *
 * These values intentionally describe decision quality, information access, and
 * CPU budget.  The separate table-facing "thinking" delay can remain theatrical
 * without making the AI cheat or burn excessive Foundry runtime.
 */

export const GAME_AI_DIFFICULTIES = Object.freeze({
  easy: {
    id: 'easy',
    label: 'Easy',
    thinkingDelayMs: 5000,
    mistakeRate: 0.28,
    monteCarloSamples: 24,
    monteCarloTimeBudgetMs: 80,
    searchDepth: 1,
    searchCandidateLimit: 6,
    searchTimeBudgetMs: 90
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    thinkingDelayMs: 4000,
    mistakeRate: 0.12,
    monteCarloSamples: 64,
    monteCarloTimeBudgetMs: 140,
    searchDepth: 2,
    searchCandidateLimit: 10,
    searchTimeBudgetMs: 180
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    thinkingDelayMs: 3000,
    mistakeRate: 0.05,
    monteCarloSamples: 128,
    monteCarloTimeBudgetMs: 240,
    searchDepth: 2,
    searchCandidateLimit: 16,
    searchTimeBudgetMs: 260
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    thinkingDelayMs: 2000,
    mistakeRate: 0.015,
    monteCarloSamples: 224,
    monteCarloTimeBudgetMs: 420,
    searchDepth: 3,
    searchCandidateLimit: 22,
    searchTimeBudgetMs: 420
  },
  grandmaster: {
    id: 'grandmaster',
    label: 'Grandmaster',
    thinkingDelayMs: 1000,
    mistakeRate: 0,
    monteCarloSamples: 360,
    monteCarloTimeBudgetMs: 650,
    searchDepth: 3,
    searchCandidateLimit: 32,
    searchTimeBudgetMs: 650
  }
});

export const GAME_AI_FAIRNESS = Object.freeze({
  fair: {
    id: 'fair',
    label: 'Fair',
    canUseHiddenInfo: false,
    canPeekRandomness: false,
    houseEdge: false,
    cheating: false,
    gmControlled: false
  },
  cinematic: {
    id: 'cinematic',
    label: 'Cinematic',
    canUseHiddenInfo: false,
    canPeekRandomness: false,
    houseEdge: false,
    cheating: false,
    gmControlled: false
  },
  houseEdge: {
    id: 'houseEdge',
    label: 'House Edge',
    canUseHiddenInfo: false,
    canPeekRandomness: false,
    houseEdge: true,
    cheating: false,
    gmControlled: false
  },
  cheating: {
    id: 'cheating',
    label: 'Cheating',
    canUseHiddenInfo: true,
    canPeekRandomness: true,
    houseEdge: true,
    cheating: true,
    gmControlled: false
  },
  gmControlled: {
    id: 'gmControlled',
    label: 'GM Controlled',
    canUseHiddenInfo: false,
    canPeekRandomness: false,
    houseEdge: false,
    cheating: false,
    gmControlled: true
  }
});

export const GAME_AI_PERSONALITIES = Object.freeze([
  'cautious',
  'aggressive',
  'reckless',
  'methodical',
  'opportunist',
  'showboat',
  'grinder',
  'desperate',
  'deceptive',
  'forceTouched'
]);

export function normalizeGameAiDifficulty(value = 'medium') {
  const id = String(value || 'medium');
  return GAME_AI_DIFFICULTIES[id] ? id : 'medium';
}

export function normalizeGameAiFairness(value = 'fair') {
  const id = String(value || 'fair');
  return GAME_AI_FAIRNESS[id] ? id : 'fair';
}

export function normalizeGameAiPersonality(value = 'methodical') {
  const id = String(value || 'methodical');
  if (id === 'random') return GAME_AI_PERSONALITIES[Math.floor(Math.random() * GAME_AI_PERSONALITIES.length)] || 'methodical';
  return GAME_AI_PERSONALITIES.includes(id) ? id : 'methodical';
}

export function buildGameAiProfile(raw = {}, defaults = {}) {
  const source = typeof raw === 'string' ? { difficulty: raw } : (raw || {});
  const fallback = defaults || {};
  const difficulty = normalizeGameAiDifficulty(source.difficulty || source.aiDifficulty || source.level || fallback.difficulty || 'medium');
  const fairness = normalizeGameAiFairness(source.fairness || source.aiFairness || fallback.fairness || 'fair');
  const personality = normalizeGameAiPersonality(source.personality || source.aiPersonality || fallback.personality || 'methodical');
  const difficultyProfile = GAME_AI_DIFFICULTIES[difficulty] || GAME_AI_DIFFICULTIES.medium;
  const fairnessProfile = GAME_AI_FAIRNESS[fairness] || GAME_AI_FAIRNESS.fair;

  return {
    ...fallback,
    ...source,
    difficulty,
    fairness,
    personality,
    difficultyLabel: difficultyProfile.label,
    fairnessLabel: fairnessProfile.label,
    thinkingDelayMs: Number(source.thinkingDelayMs ?? fallback.thinkingDelayMs ?? difficultyProfile.thinkingDelayMs) || difficultyProfile.thinkingDelayMs,
    mistakeRate: Number(source.mistakeRate ?? fallback.mistakeRate ?? difficultyProfile.mistakeRate) || 0,
    monteCarloSamples: Number(source.monteCarloSamples ?? fallback.monteCarloSamples ?? difficultyProfile.monteCarloSamples) || difficultyProfile.monteCarloSamples,
    monteCarloTimeBudgetMs: Number(source.monteCarloTimeBudgetMs ?? fallback.monteCarloTimeBudgetMs ?? difficultyProfile.monteCarloTimeBudgetMs) || difficultyProfile.monteCarloTimeBudgetMs,
    searchDepth: Number(source.searchDepth ?? fallback.searchDepth ?? difficultyProfile.searchDepth) || difficultyProfile.searchDepth,
    searchCandidateLimit: Number(source.searchCandidateLimit ?? fallback.searchCandidateLimit ?? difficultyProfile.searchCandidateLimit) || difficultyProfile.searchCandidateLimit,
    searchTimeBudgetMs: Number(source.searchTimeBudgetMs ?? fallback.searchTimeBudgetMs ?? difficultyProfile.searchTimeBudgetMs) || difficultyProfile.searchTimeBudgetMs,
    canUseHiddenInfo: Boolean(source.canUseHiddenInfo ?? fallback.canUseHiddenInfo ?? fairnessProfile.canUseHiddenInfo),
    canPeekRandomness: Boolean(source.canPeekRandomness ?? fallback.canPeekRandomness ?? fairnessProfile.canPeekRandomness),
    houseEdge: Boolean(source.houseEdge ?? fallback.houseEdge ?? fairnessProfile.houseEdge),
    cheating: Boolean(source.cheating ?? fallback.cheating ?? fairnessProfile.cheating),
    gmControlled: Boolean(source.gmControlled ?? fallback.gmControlled ?? fairnessProfile.gmControlled),
    forceSensitive: Boolean(source.forceSensitive ?? fallback.forceSensitive ?? false),
    forceSensitivityChance: Number(source.forceSensitivityChance ?? fallback.forceSensitivityChance ?? 0.05) || 0.05
  };
}

export function labelForGameAiDifficulty(value = 'medium') {
  return GAME_AI_DIFFICULTIES[normalizeGameAiDifficulty(value)].label;
}

export function labelForGameAiFairness(value = 'fair') {
  return GAME_AI_FAIRNESS[normalizeGameAiFairness(value)].label;
}

export function thinkingDelayMsForGameAi(value = 'medium') {
  return buildGameAiProfile(value).thinkingDelayMs;
}

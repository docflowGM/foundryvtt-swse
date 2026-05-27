import { evaluateSabaccHand } from './sabacc-rules.js';

const DIFFICULTY_RISK = Object.freeze({
  easy: 0.25,
  medium: 0.45,
  hard: 0.6,
  pro: 0.72,
  grandmaster: 0.86
});

export function buildSabaccAiProfile(raw = {}) {
  const value = typeof raw === 'string' ? { difficulty: raw } : (raw || {});
  return {
    name: value.name || null,
    difficulty: value.difficulty || value.aiDifficulty || 'medium',
    fairness: value.fairness || value.aiFairness || 'fair',
    personality: value.personality || value.aiPersonality || 'methodical',
    profession: value.profession || '',
    tableFact: value.tableFact || ''
  };
}

export class SabaccAi {
  static chooseAction({ player = {}, state = {}, aiProfile = {} } = {}) {
    const profile = buildSabaccAiProfile(aiProfile);
    const evaluation = evaluateSabaccHand(player.hand || []);
    const handSize = Array.isArray(player.hand) ? player.hand.length : 0;
    const risk = DIFFICULTY_RISK[profile.difficulty] ?? DIFFICULTY_RISK.medium;

    if (evaluation.bombedOut) {
      const card = (player.hand || [])[Math.floor(Math.random() * Math.max(1, handSize))];
      return card ? { type: 'shift-card', cardId: card.id } : { type: 'call-hand' };
    }

    if (evaluation.specialWinner || Math.abs(evaluation.total) >= 21) return { type: 'call-hand' };
    if (handSize < 3 && Math.random() < risk) return { type: 'draw-card' };
    if (handSize > 2 && Math.abs(evaluation.total) < 17 && Math.random() < risk / 2) {
      const card = (player.hand || [])[0];
      if (card) return { type: 'shift-card', cardId: card.id };
    }
    return { type: 'call-hand' };
  }

  static labelForDifficulty(value = 'medium') {
    return ({ easy: 'Easy', medium: 'Medium', hard: 'Hard', pro: 'Pro', grandmaster: 'Grandmaster' })[value] || 'Medium';
  }
}

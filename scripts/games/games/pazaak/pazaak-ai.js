import { scorePazaakPlayer, applyPazaakSideCard } from './pazaak-rules.js';
import { PAZAAK_TARGET } from './pazaak-deck.js';

function choicesForCard(card = {}) {
  if (card.type === 'plusMinus') return [{ sign: 'plus' }, { sign: 'minus' }];
  if (card.type === 'tiebreaker') return [{ sign: 'plus' }, { sign: 'minus' }];
  if (card.type === 'plusMinusRange') return [
    { sign: 'plus', value: 1 }, { sign: 'minus', value: 1 },
    { sign: 'plus', value: 2 }, { sign: 'minus', value: 2 }
  ];
  return [{}];
}

function bestSidePlay(player = {}) {
  const currentScore = scorePazaakPlayer(player);
  let best = null;
  for (const card of Array.isArray(player.hand) ? player.hand : []) {
    for (const choice of choicesForCard(card)) {
      const result = applyPazaakSideCard(player, card.instanceId, choice);
      if (!result.ok) continue;
      const score = scorePazaakPlayer(result.player);
      if (score > PAZAAK_TARGET) continue;
      const gain = Math.abs(PAZAAK_TARGET - currentScore) - Math.abs(PAZAAK_TARGET - score);
      const candidate = { card, choice, score, gain };
      if (!best || candidate.score > best.score || (candidate.score === best.score && candidate.gain > best.gain)) best = candidate;
    }
  }
  return best;
}

export class PazaakAi {
  static chooseTurn(player = {}, profile = 'normal') {
    const score = scorePazaakPlayer(player);
    const best = bestSidePlay(player);
    const standAt = profile === 'aggressive' ? 19 : (profile === 'cautious' ? 18 : 18);

    if (score > PAZAAK_TARGET && best) return { type: 'play-side-card', cardInstanceId: best.card.instanceId, choice: best.choice };
    if (score < standAt && best?.score >= standAt) return { type: 'play-side-card', cardInstanceId: best.card.instanceId, choice: best.choice };
    if (score >= standAt && score <= PAZAAK_TARGET) return { type: 'stand' };
    return { type: 'end-turn' };
  }
}

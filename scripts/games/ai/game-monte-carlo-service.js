/**
 * Small shared Monte Carlo evaluator for deterministic Holopad computer players.
 *
 * The game-specific adapter owns rules, cloning, and scoring.  This service only
 * repeats legal simulations and ranks candidate actions by expected outcome.
 */

function nowMs() {
  return Date.now();
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function randomChoice(values = []) {
  if (!Array.isArray(values) || !values.length) return null;
  return values[Math.floor(Math.random() * values.length)] ?? values[0] ?? null;
}

export class GameMonteCarloService {
  static chooseAction({
    actions = [],
    profile = {},
    simulationsPerAction = null,
    timeBudgetMs = null,
    simulateAction = null,
    fallbackAction = null,
    explorationRate = 0
  } = {}) {
    const candidates = Array.isArray(actions) ? actions.filter(Boolean) : [];
    if (!candidates.length) return { action: fallbackAction || { type: 'end-turn' }, confidence: 0, samples: 0, scoredActions: [] };
    if (typeof simulateAction !== 'function') return { action: candidates[0], confidence: 0, samples: 0, scoredActions: [] };

    const perAction = Math.max(1, Math.floor(safeNumber(simulationsPerAction ?? profile.monteCarloSamples, 32)));
    const budget = Math.max(1, Math.floor(safeNumber(timeBudgetMs ?? profile.monteCarloTimeBudgetMs, 150)));
    const deadline = nowMs() + budget;
    const stats = candidates.map(action => ({ action, samples: 0, total: 0, best: -Infinity, worst: Infinity }));

    let sampleIndex = 0;
    outer: for (let round = 0; round < perAction; round += 1) {
      for (const entry of stats) {
        const result = simulateAction(entry.action, { sampleIndex, round, action: entry.action });
        const score = safeNumber(typeof result === 'number' ? result : result?.score, 0);
        entry.samples += 1;
        entry.total += score;
        entry.best = Math.max(entry.best, score);
        entry.worst = Math.min(entry.worst, score);
        sampleIndex += 1;
        if (nowMs() >= deadline && round > 0) break outer;
      }
    }

    const scoredActions = stats.map(entry => ({
      ...entry,
      average: entry.samples ? entry.total / entry.samples : -Infinity
    })).sort((a, b) => b.average - a.average);

    let best = scoredActions[0];
    const second = scoredActions[1];
    if (explorationRate > 0 && Math.random() < explorationRate) best = randomChoice(scoredActions.slice(0, Math.min(3, scoredActions.length))) || best;
    const spread = best && second ? Math.abs(best.average - second.average) : Math.abs(best?.average || 0);
    const confidence = Math.max(0, Math.min(1, spread / (Math.abs(best?.average || 1) + 25)));

    return {
      action: best?.action || fallbackAction || candidates[0],
      confidence,
      samples: stats.reduce((sum, entry) => sum + entry.samples, 0),
      scoredActions
    };
  }
}

/**
 * Presentation of the table rules modes (S-03 / S-04). PURE. The engine contract is unchanged (ids `republic-senate` / `wagered`);
 * this only decides what the player is TOLD: which modes are available, why a mode is disabled, and whether in-game amounts are
 * practice chips (game state only) or escrowed campaign credits. Settings gates are never bypassed here.
 */
const GAMES_WITH_PRACTICE_BETTING = new Set(['sabacc', 'hintaro']);

export function creditBuyInDisabledReason(settings = {}, game = null) {
  if (!settings.enabled) return 'Games are turned off by the GM.';
  if (!game?.supportsCreditWagers) return `${game?.title || 'This game'} does not support credit buy-ins.`;
  if (!settings.allowWagers) return 'The GM has not enabled wagers (Holopad Games setting: Allow Wagers).';
  if (!settings.allowCreditWagers) return 'The GM has not enabled credit wagers (Holopad Games setting: Allow Credit Wagers).';
  return '';
}

export function buildRulesModeCards({ settings = {}, selectedGame = null, selectedRulesMode = 'republic-senate' } = {}) {
  const practiceBetting = GAMES_WITH_PRACTICE_BETTING.has(selectedGame?.id);
  const creditEnabled = Boolean(settings.enabled && settings.allowWagers && settings.allowCreditWagers && selectedGame?.supportsCreditWagers);
  return [
    {
      id: 'republic-senate',
      title: practiceBetting ? 'Practice Table' : 'Republic Senate Rules',
      shortTitle: practiceBetting ? 'Practice Table' : 'Republic Senate',
      description: practiceBetting
        ? 'Bet virtual table chips. No character credits, items or assets move; nothing is paid out.'
        : 'No betting. No credit, item, or asset movement. Best for downtime while waiting for a turn.',
      enabled: Boolean(settings.enabled),
      disabledReason: settings.enabled ? '' : 'Games are turned off by the GM.',
      selected: selectedRulesMode === 'republic-senate'
    },
    {
      id: 'wagered',
      title: 'Wagered Table',
      shortTitle: 'Credit Buy-In',
      description: 'Credit buy-ins escrow and pay out through TransactionEngine. Item and asset wagers come in later phases.',
      enabled: creditEnabled,
      disabledReason: creditEnabled ? '' : creditBuyInDisabledReason(settings, selectedGame),
      selected: selectedRulesMode === 'wagered'
    }
  ];
}

/** One line saying what in-game amounts mean for this table (null when the game has no in-game betting). */
export function economyLine(gameId, wager = {}) {
  if (!GAMES_WITH_PRACTICE_BETTING.has(gameId)) return null;
  return wager?.enabled ? 'Campaign credits in play (buy-in is escrowed and settled through the GM economy policy).' : 'Practice chips: table credits only, no campaign credits move.';
}

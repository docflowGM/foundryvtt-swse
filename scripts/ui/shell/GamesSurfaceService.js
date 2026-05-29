import { GameCenterRegistry } from '/systems/foundryvtt-swse/scripts/games/game-center-registry.js';
import { GameSessionStore } from '/systems/foundryvtt-swse/scripts/games/game-session-store.js';
import { getGameSettingsSnapshot } from '/systems/foundryvtt-swse/scripts/games/game-settings.js';
import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';
import { PazaakViewModel } from '/systems/foundryvtt-swse/scripts/games/games/pazaak/pazaak-view-model.js';
import { SabaccViewModel } from '/systems/foundryvtt-swse/scripts/games/games/sabacc/sabacc-view-model.js';
import { DejarikViewModel } from '/systems/foundryvtt-swse/scripts/games/games/dejarik/dejarik-view-model.js';
import { HintaroViewModel } from '/systems/foundryvtt-swse/scripts/games/games/hintaro/hintaro-view-model.js';
import { GameCreditEscrowService } from '/systems/foundryvtt-swse/scripts/games/wagers/game-credit-escrow-service.js';

function formatTimestamp(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); }
  catch (_err) { return String(value); }
}

function actorName(actor) {
  return actor?.name || 'Unknown Actor';
}

function formatCredits(value) {
  const n = Number(value || 0) || 0;
  return Math.max(0, Math.round(n)).toLocaleString();
}

function readActorCredits(actor) {
  const credits = actor?.system?.credits;
  if (typeof credits === 'number') return credits;
  if (credits && typeof credits === 'object') {
    if (Number.isFinite(Number(credits.remaining))) return Number(credits.remaining);
    if (Number.isFinite(Number(credits.total)) && Number.isFinite(Number(credits.spent))) return Number(credits.total) - Number(credits.spent);
    if (Number.isFinite(Number(credits.value))) return Number(credits.value);
  }
  return 0;
}

function statusKind(game) {
  const status = String(game?.status || '').toLowerCase();
  if (/playable|campaign|mvp|live/.test(status)) return 'live';
  if (/foundation|rules|found/.test(status)) return 'found';
  return 'planned';
}

function phaseShort(game) {
  const match = String(game?.implementationPhase || '').match(/phase\s*(\d+)/i);
  return match ? `P${match[1]}` : String(game?.implementationPhase || 'P?').replace(/phase\s*/i, 'P');
}

function displayIcon(game) {
  if (game?.id === 'hintaro') return '◈';
  if (game?.id === 'dejarik') return '✷';
  return String(game?.icon || '◇');
}

function gamePresentation(game, settings = null) {
  const id = String(game?.id || '');
  const creditEnabled = Boolean(game?.supportsCreditWagers && (!settings || (settings.allowWagers && settings.allowCreditWagers)));
  const base = {
    displayIcon: displayIcon(game),
    statusKind: statusKind(game),
    phaseShort: phaseShort(game),
    targetLabel: 'Mode',
    targetValue: 'Table',
    targetHint: 'house ruleset',
    stakesValue: creditEnabled ? 'Credits' : '—',
    stakesHint: creditEnabled ? 'escrowed buy-in' : 'no credit movement'
  };
  if (id === 'pazaak') return { ...base, targetLabel: 'Target', targetValue: '20', targetHint: 'closest, no bust' };
  if (id === 'sabacc') return { ...base, targetLabel: 'Target', targetValue: '0', targetHint: 'closest to zero' };
  if (id === 'hintaro') return { ...base, targetLabel: 'Mode', targetValue: 'Dice', targetHint: 'chance-cube pit' };
  if (id === 'dejarik') return { ...base, targetLabel: 'Mode', targetValue: 'Board', targetHint: 'holochess tactics' };
  return base;
}

function mapGameForLibrary(game, selectedGame, settings) {
  return {
    ...game,
    ...gamePresentation(game, settings),
    selected: game.id === selectedGame?.id,
    capabilityChips: buildCapabilityChips(game, settings),
    playerRange: game.minPlayers === game.maxPlayers ? `${game.minPlayers}` : `${game.minPlayers}-${game.maxPlayers}`,
    disabled: !settings.enabled
  };
}

function buildCapabilityChips(game, settings) {
  const chips = [];
  if (game.supportsAI) chips.push({ label: 'AI', enabled: settings.allowAI });
  if (game.supportsNPCs) chips.push({ label: 'NPC', enabled: settings.allowNPCs });
  if (game.supportsPvP) chips.push({ label: 'PvP', enabled: settings.allowPvP });
  if (game.supportsCreditWagers) chips.push({ label: 'Credits', enabled: settings.allowWagers && settings.allowCreditWagers });
  if (game.supportsItemWagers) chips.push({ label: 'Items', enabled: settings.allowWagers && settings.allowItemWagers });
  if (game.supportsAssetWagers) chips.push({ label: 'Ships/Droids', enabled: settings.allowWagers && settings.allowAssetWagers });
  if (game.supportsSpectators) chips.push({ label: 'Spectate', enabled: settings.allowSpectators });
  return chips;
}


function amountLabel(value) {
  return formatCredits(Number(value || 0) || 0);
}

function toneForPhase(phase = '') {
  const normalized = String(phase || '').toLowerCase();
  if (/complete|winner|settle|hand-complete|round-complete/.test(normalized)) return 'success';
  if (/cancel|refund|forfeit|lost|bust|danger/.test(normalized)) return 'danger';
  if (/setup|ready|invite/.test(normalized)) return 'warn';
  return 'active';
}

function buildTableFrameMeta(session, gameVm = {}, gameDef = {}) {
  const gameId = String(session?.gameId || gameDef?.id || '').toLowerCase();
  const base = {
    sessionId: session?.id || gameVm?.id || '',
    gameId,
    gameIcon: displayIcon(gameDef),
    gameTitle: gameDef?.title || gameVm?.title || gameId || 'Game',
    gameClass: `swse-games-table-frame--${gameId || 'unknown'}`,
    title: gameVm?.title || gameDef?.title || session?.title || 'Game Table',
    statusLabel: gameVm?.statusLabel || String(session?.status || 'active').replace(/[-_]+/g, ' ').toUpperCase(),
    statusTone: toneForPhase(gameVm?.phase || session?.status),
    rulesLine: 'Holopad side table',
    message: gameVm?.message || '',
    metrics: [],
    secondaryLines: []
  };

  if (gameId === 'pazaak') {
    const wager = gameVm?.wager || {};
    const metrics = [];
    if (wager.enabled) {
      metrics.push({ key: 'Pot', value: amountLabel(wager.pot), tone: 'gold' });
      metrics.push({ key: 'Buy-In', value: amountLabel(wager.buyIn), tone: 'cyan' });
    }
    return {
      ...base,
      title: gameVm?.title || 'Pazaak Table',
      statusLabel: gameVm?.statusLabel || 'Pazaak',
      rulesLine: `${gameVm?.rulesLabel || 'Republic Senate Rules'} · target ${gameVm?.target ?? 20} · first to ${gameVm?.setsToWin ?? 3} sets`,
      metrics,
      secondaryLines: [
        gameVm?.showPlaying ? `Active turn: ${gameVm?.activeSeatLabel || '—'}` : '',
        gameVm?.showComplete ? `Winner: ${gameVm?.winnerLabel || '—'}` : '',
        wager.enabled ? `Wager: ${wager.status || 'escrow'} · ${amountLabel(wager.buyIn)} credit buy-in` : '',
        wager.settlementMessage ? `Economy policy: ${wager.settlementMessage}` : ''
      ].filter(Boolean)
    };
  }

  if (gameId === 'sabacc') {
    return {
      ...base,
      title: gameVm?.title || 'Sabacc Table',
      statusLabel: gameVm?.statusLabel || 'Sabacc',
      rulesLine: `Corellian Spike · target zero · ante ${amountLabel(gameVm?.ante)} · Sabacc ante ${amountLabel(gameVm?.sabaccAnte)}`,
      metrics: [
        { key: 'Hand Pot', value: amountLabel(gameVm?.handPot), tone: 'gold' },
        { key: 'Sabacc Pot', value: amountLabel(gameVm?.sabaccPot), tone: 'cyan' }
      ],
      secondaryLines: [
        gameVm?.showBetting ? `Betting: ${gameVm?.activeSeatLabel || '—'} acts · live bet ${amountLabel(gameVm?.betting?.currentBet)}` : '',
        gameVm?.showDrawing ? `Card round ${gameVm?.cardRound || 0} · active turn: ${gameVm?.activeSeatLabel || '—'}` : '',
        gameVm?.shiftRollLabel ? `Shift dice: ${gameVm.shiftRollLabel}${gameVm.shiftMatched ? ' · forced shift triggered' : ''}` : '',
        gameVm?.showComplete ? `Winner: ${gameVm?.winnerLabel || '—'}` : '',
        gameVm?.hasShowdown ? `Showdown: ${gameVm?.showdown?.winnerLabel || gameVm?.showdown?.tiedLabels || '—'} · ${gameVm?.showdown?.reason || ''}` : ''
      ].filter(Boolean)
    };
  }

  if (gameId === 'hintaro') {
    return {
      ...base,
      title: gameVm?.title || 'Hintaro Table',
      statusLabel: gameVm?.statusLabel || 'Hintaro',
      rulesLine: `Ante ${amountLabel(gameVm?.ante)} · hintaron ${gameVm?.hintaronLabel || '—'} · ${gameVm?.hintaronModeLabel || 'rotating hintaron'} · round ${gameVm?.round || 0}`,
      metrics: [
        { key: 'Pot', value: amountLabel(gameVm?.pot), tone: 'gold' },
        { key: 'Carryover', value: amountLabel(gameVm?.carriedPot), tone: 'cyan' }
      ],
      secondaryLines: [
        gameVm?.showBetting ? `Betting: ${gameVm?.activeSeatLabel || '—'} acts · live bet ${amountLabel(gameVm?.betting?.currentBet)}` : '',
        gameVm?.showReroll ? `Reroll choice: ${gameVm?.activeSeatLabel || '—'}` : '',
        gameVm?.hintaroDie?.label ? `Hintaro die: ${gameVm.hintaroDie.label}` : ''
      ].filter(Boolean)
    };
  }

  if (gameId === 'dejarik') {
    return {
      ...base,
      title: gameVm?.title || 'Dejarik Board',
      statusLabel: gameVm?.statusLabel || 'Dejarik',
      rulesLine: `Radial holochess · ${gameVm?.actionModelLabel || 'Single Action'} · last side standing wins`,
      metrics: [
        { key: 'Turn', value: gameVm?.activeSeatLabel || '—', tone: 'cyan' },
        { key: 'State', value: gameVm?.phase || 'board', tone: 'gold' }
      ],
      secondaryLines: [
        gameVm?.showPlaying ? `Active turn: ${gameVm?.activeSeatLabel || '—'}` : '',
        gameVm?.showComplete ? `Winner: ${gameVm?.winnerLabel || '—'}` : ''
      ].filter(Boolean)
    };
  }

  return base;
}

function mapSession(session, participantId = null) {
  const rawStatus = String(session.status || 'draft');
  const currentSeat = Array.isArray(session.seats) ? session.seats.find(seat => seat.recipientId === participantId) : null;
  const canOpenThread = Boolean(session.holonetThreadId);
  const playableGames = new Set(['pazaak', 'sabacc', 'dejarik', 'hintaro']);
  const isPlayableGame = playableGames.has(session.gameId) && ['active', 'paused', 'complete', 'pending-invite', 'pending-gm-settlement'].includes(rawStatus);
  const gameDef = GameCenterRegistry.get(session.gameId) || { id: session.gameId, title: session.gameId || 'Game', icon: '◇' };
  const isInvite = rawStatus === 'pending-invite';
  const isComplete = rawStatus === 'complete';
  const isActive = ['active', 'paused', 'pending-gm-settlement'].includes(rawStatus);
  return {
    id: session.id,
    gameId: session.gameId,
    gameTitle: gameDef.title || session.gameId || 'Game',
    gameIcon: displayIcon(gameDef),
    title: session.title,
    rawStatus,
    status: rawStatus.replace(/[-_]+/g, ' ').toUpperCase(),
    statusTone: isComplete ? 'pos' : isInvite ? 'warn' : isActive ? 'cyan' : 'muted',
    resultGlyph: isComplete ? '▲' : isInvite ? '◇' : '◆',
    rulesMode: String(session.rulesMode || 'republic-senate').replace(/[-_]+/g, ' ').toUpperCase(),
    seatCount: Array.isArray(session.seats) ? session.seats.length : 0,
    updatedAt: formatTimestamp(session.updatedAt),
    wagerMode: session.wagerProfile?.mode || 'none',
    wager: GameCreditEscrowService.describe(session),
    currentSeatStatus: currentSeat?.status || '',
    holonetThreadId: session.holonetThreadId || null,
    holonetMessageId: session.holonetMessageId || session.metadata?.inviteMessageId || null,
    canOpenThread,
    canOpenTable: Boolean(isPlayableGame || ['active', 'paused', 'pending-invite', 'pending-gm-settlement'].includes(rawStatus)),
    canRespond: Boolean(rawStatus === 'pending-invite' && currentSeat?.status === 'invited'),
    isInvite,
    isActive,
    isComplete
  };
}
async function buildInviteTargets(actor, settings, selectedGame) {
  if (!settings.enabled || !settings.useMessengerInvites || !selectedGame) return [];
  let threads = [];
  try { threads = await HolonetMessengerService.getThreadsForCurrentParticipant(actor); } catch (_err) { threads = []; }
  return HolonetMessengerService.buildRecipientOptions(actor, { threads })
    .filter(option => {
      if (option.isSelf) return false;
      if (option.isPlayer && !settings.allowPvP) return false;
      if (option.isPersona && !settings.allowNPCs) return false;
      if (option.isGm) return true;
      if (option.isPlayer && selectedGame.supportsPvP) return true;
      if (option.isPersona && selectedGame.supportsNPCs) return true;
      return false;
    })
    .map(option => ({
      id: option.id,
      label: option.label,
      typeLabel: option.typeLabel,
      avatar: option.avatar || null
    }));
}

function buildActiveTableVm(session, actor, participantId, options = {}) {
  if (!session) return null;
  const gameDef = GameCenterRegistry.get(session.gameId) || { id: session.gameId, title: session.gameId || 'Game', icon: '◇' };
  if (session.gameId === 'pazaak') {
    const pazaak = PazaakViewModel.build({
      session,
      actor,
      participantId,
      selectedDeckIds: Array.isArray(options.sideDeckIds) ? options.sideDeckIds : []
    });
    return {
      isPazaak: true,
      gameId: 'pazaak',
      sessionId: session.id,
      tableFrame: buildTableFrameMeta(session, pazaak, gameDef),
      pazaak
    };
  }
  if (session.gameId === 'sabacc') {
    const sabacc = SabaccViewModel.build({ session, actor, participantId });
    return {
      isSabacc: true,
      gameId: 'sabacc',
      sessionId: session.id,
      tableFrame: buildTableFrameMeta(session, sabacc, gameDef),
      sabacc
    };
  }
  if (session.gameId === 'dejarik') {
    const dejarik = DejarikViewModel.build({ session, actor, participantId });
    return {
      isDejarik: true,
      gameId: 'dejarik',
      sessionId: session.id,
      tableFrame: buildTableFrameMeta(session, dejarik, gameDef),
      dejarik
    };
  }
  if (session.gameId === 'hintaro') {
    const hintaro = HintaroViewModel.build({ session, actor, participantId });
    return {
      isHintaro: true,
      gameId: 'hintaro',
      sessionId: session.id,
      tableFrame: buildTableFrameMeta(session, hintaro, gameDef),
      hintaro
    };
  }
  return null;
}

export class GamesSurfaceService {
  static async buildViewModel(actor, options = {}) {
    const settings = getGameSettingsSnapshot();
    const games = GameCenterRegistry.list();
    const summary = GameSessionStore.summarizeForActor(actor);
    const selectedGameId = options.selectedGameId || options.gameId || games[0]?.id || null;
    const selectedGame = GameCenterRegistry.get(selectedGameId) || games[0] || null;
    let selectedRulesMode = options.rulesMode || settings.defaultRulesMode || selectedGame?.defaultRulesMode || 'republic-senate';
    if (selectedRulesMode === 'wagered' && !(settings.allowWagers && settings.allowCreditWagers && selectedGame?.supportsCreditWagers)) selectedRulesMode = 'republic-senate';
    const selectedCreditBuyIn = Math.max(0, Math.min(Number(options.creditBuyIn || 50) || 50, Number(settings.maxCreditWager || 0) || 0));
    const participantId = HolonetMessengerService.getCurrentParticipantId();
    const inviteTargets = await buildInviteTargets(actor, settings, selectedGame);
    const selectedSession = options.sessionId ? GameSessionStore.getSession(options.sessionId) : null;
    const activeTable = buildActiveTableVm(selectedSession, actor, participantId, options);
    const mappedSessions = summary.sessions.slice(0, 12).map(session => mapSession(session, participantId));
    const activeSessions = mappedSessions.filter(session => session.isActive).slice(0, 4);
    const inviteSessions = mappedSessions.filter(session => session.isInvite).slice(0, 4);
    const recentSessions = mappedSessions.filter(session => session.isComplete).slice(0, 4);
    const actorCredits = readActorCredits(actor);

    return {
      id: 'games',
      title: 'Holopad Games',
      subtitle: 'Game Center // side tables, wagers, and Holonet requests',
      actorName: actorName(actor),
      actorImg: actor?.img || 'icons/svg/mystery-man.svg',
      actorCredits,
      actorCreditsLabel: formatCredits(actorCredits),
      settings,
      selectedGameId: selectedGame?.id ?? null,
      selectedRulesMode,
      participantId,
      games: games.map(game => mapGameForLibrary(game, selectedGame, settings)),
      selectedGame: selectedGame ? {
        ...selectedGame,
        ...gamePresentation(selectedGame, settings),
        capabilityChips: buildCapabilityChips(selectedGame, settings),
        playerRange: selectedGame.minPlayers === selectedGame.maxPlayers ? `${selectedGame.minPlayers}` : `${selectedGame.minPlayers}-${selectedGame.maxPlayers}`
      } : null,
      inviteTargets,
      hasInviteTargets: inviteTargets.length > 0,
      canSendInvites: Boolean(settings.enabled && settings.useMessengerInvites && selectedGame && inviteTargets.length && (settings.allowPlayerCreatedTables || game.user?.isGM)),
      canStartSoloAiPazaak: Boolean(settings.enabled && settings.allowAI && selectedGame?.id === 'pazaak' && (settings.allowPlayerCreatedTables || game.user?.isGM)),
      canStartSoloAiSabacc: Boolean(settings.enabled && settings.allowAI && selectedGame?.id === 'sabacc' && (settings.allowPlayerCreatedTables || game.user?.isGM)),
      canStartSoloAiDejarik: Boolean(settings.enabled && settings.allowAI && selectedGame?.id === 'dejarik' && (settings.allowPlayerCreatedTables || game.user?.isGM)),
      canStartSoloAiHintaro: Boolean(settings.enabled && settings.allowAI && selectedGame?.id === 'hintaro' && (settings.allowPlayerCreatedTables || game.user?.isGM)),
      selectedSession: selectedSession ? mapSession(selectedSession, participantId) : null,
      activeTable,
      hasActiveTable: Boolean(activeTable),
      sessionSummary: {
        total: summary.total,
        inviteCount: summary.inviteCount,
        activeCount: summary.activeCount,
        pendingApprovalCount: summary.pendingApprovalCount
      },
      sessions: mappedSessions.slice(0, 8),
      hasSessions: mappedSessions.length > 0,
      activeSessions,
      hasActiveSessions: activeSessions.length > 0,
      inviteSessions,
      hasInviteSessions: inviteSessions.length > 0,
      recentSessions,
      hasRecentSessions: recentSessions.length > 0,
      canCreateTables: settings.enabled && (settings.allowPlayerCreatedTables || game.user?.isGM),
      canUseWagers: settings.enabled && settings.allowWagers,
      canUseCreditWagers: settings.enabled && settings.allowWagers && settings.allowCreditWagers && Boolean(selectedGame?.supportsCreditWagers),
      showCreditWagerControls: Boolean(settings.enabled && settings.allowWagers && settings.allowCreditWagers && selectedGame?.supportsCreditWagers && selectedRulesMode === 'wagered'),
      selectedCreditBuyIn,
      maxCreditWager: settings.maxCreditWager,
      modeCards: [
        {
          id: 'republic-senate',
          title: 'Republic Senate Rules',
          shortTitle: 'Republic Senate',
          description: 'No betting. No credit, item, or asset movement. Best for downtime while waiting for a turn.',
          enabled: settings.enabled,
          selected: selectedRulesMode === 'republic-senate'
        },
        {
          id: 'wagered',
          title: 'Wagered Table',
          shortTitle: 'Credit Buy-In',
          description: 'Credit buy-ins escrow and pay out through TransactionEngine. Item and asset wagers come in later phases.',
          enabled: settings.enabled && settings.allowWagers && settings.allowCreditWagers && Boolean(selectedGame?.supportsCreditWagers),
          selected: selectedRulesMode === 'wagered'
        }
      ],
      infrastructureNotes: [
        'Phase 4.5 adds GM-configurable economy policy gates for AI/house payouts before TransactionEngine settlement.',
        'Player-vs-player credit games remain closed-loop: payouts come from the escrowed player pool.',
        'Republic Senate Rules still skip all economy movement and are the safest default downtime mode.',
        'Sabacc now has a custom 76-card deck/rules MVP, Dejarik has a radial board, and Hintaro adds a lightweight chance-cube gambling table inside Holopad Games.',
        'Items and assets are still intentionally out of scope for this phase; future phases must route them through ActorEngine and asset ownership services.'
      ]
    };
  }
}

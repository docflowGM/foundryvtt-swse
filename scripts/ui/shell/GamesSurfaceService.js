import { GameCenterRegistry } from '/systems/foundryvtt-swse/scripts/games/game-center-registry.js';
import { GameSessionStore } from '/systems/foundryvtt-swse/scripts/games/game-session-store.js';
import { getGameSettingsSnapshot } from '/systems/foundryvtt-swse/scripts/games/game-settings.js';
import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';

function formatTimestamp(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); }
  catch (_err) { return String(value); }
}

function actorName(actor) {
  return actor?.name || 'Unknown Actor';
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

function mapSession(session, participantId = null) {
  const rawStatus = String(session.status || 'draft');
  const currentSeat = Array.isArray(session.seats) ? session.seats.find(seat => seat.recipientId === participantId) : null;
  const canOpenThread = Boolean(session.holonetThreadId);
  return {
    id: session.id,
    gameId: session.gameId,
    title: session.title,
    rawStatus,
    status: rawStatus.replace(/[-_]+/g, ' ').toUpperCase(),
    rulesMode: String(session.rulesMode || 'republic-senate').replace(/[-_]+/g, ' ').toUpperCase(),
    seatCount: Array.isArray(session.seats) ? session.seats.length : 0,
    updatedAt: formatTimestamp(session.updatedAt),
    wagerMode: session.wagerProfile?.mode || 'none',
    currentSeatStatus: currentSeat?.status || '',
    holonetThreadId: session.holonetThreadId || null,
    holonetMessageId: session.holonetMessageId || session.metadata?.inviteMessageId || null,
    canOpenThread,
    canOpenTable: Boolean(['active', 'paused', 'pending-invite'].includes(rawStatus)),
    canRespond: Boolean(rawStatus === 'pending-invite' && currentSeat?.status === 'invited')
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


export class GamesSurfaceService {
  static async buildViewModel(actor, options = {}) {
    const settings = getGameSettingsSnapshot();
    const games = GameCenterRegistry.list();
    const summary = GameSessionStore.summarizeForActor(actor);
    const selectedGameId = options.selectedGameId || options.gameId || games[0]?.id || null;
    const selectedGame = GameCenterRegistry.get(selectedGameId) || games[0] || null;
    const selectedRulesMode = options.rulesMode || settings.defaultRulesMode || selectedGame?.defaultRulesMode || 'republic-senate';
    const participantId = HolonetMessengerService.getCurrentParticipantId();
    const inviteTargets = await buildInviteTargets(actor, settings, selectedGame);
    const selectedSession = options.sessionId ? GameSessionStore.getSession(options.sessionId) : null;

    return {
      id: 'games',
      title: 'Holopad Games',
      subtitle: 'Game Center // side tables, wagers, and Holonet requests',
      actorName: actorName(actor),
      actorImg: actor?.img || 'icons/svg/mystery-man.svg',
      settings,
      selectedGameId: selectedGame?.id ?? null,
      selectedRulesMode,
      participantId,
      games: games.map(game => ({
        ...game,
        selected: game.id === selectedGame?.id,
        capabilityChips: buildCapabilityChips(game, settings),
        playerRange: game.minPlayers === game.maxPlayers ? `${game.minPlayers}` : `${game.minPlayers}-${game.maxPlayers}`,
        disabled: !settings.enabled
      })),
      selectedGame: selectedGame ? {
        ...selectedGame,
        capabilityChips: buildCapabilityChips(selectedGame, settings),
        playerRange: selectedGame.minPlayers === selectedGame.maxPlayers ? `${selectedGame.minPlayers}` : `${selectedGame.minPlayers}-${selectedGame.maxPlayers}`
      } : null,
      inviteTargets,
      hasInviteTargets: inviteTargets.length > 0,
      canSendInvites: Boolean(settings.enabled && settings.useMessengerInvites && selectedGame && inviteTargets.length && (settings.allowPlayerCreatedTables || game.user?.isGM)),
      selectedSession: selectedSession ? mapSession(selectedSession, participantId) : null,
      sessionSummary: {
        total: summary.total,
        inviteCount: summary.inviteCount,
        activeCount: summary.activeCount,
        pendingApprovalCount: summary.pendingApprovalCount
      },
      sessions: summary.sessions.slice(0, 8).map(session => mapSession(session, participantId)),
      hasSessions: summary.sessions.length > 0,
      canCreateTables: settings.enabled && (settings.allowPlayerCreatedTables || game.user?.isGM),
      canUseWagers: settings.enabled && settings.allowWagers,
      maxCreditWager: settings.maxCreditWager,
      modeCards: [
        {
          id: 'republic-senate',
          title: 'Republic Senate Rules',
          description: 'No betting. No credit, item, or asset movement. Best for downtime while waiting for a turn.',
          enabled: settings.enabled,
          selected: selectedRulesMode === 'republic-senate'
        },
        {
          id: 'wagered',
          title: 'Wagered Table',
          description: 'Credits will route through TransactionEngine; item and asset wagers will route through ActorEngine and asset ownership services in later phases.',
          enabled: settings.enabled && settings.allowWagers,
          selected: selectedRulesMode === 'wagered'
        }
      ],
      infrastructureNotes: [
        'Phase 2 routes game requests through Holonet/Messenger as accept/decline system cards.',
        'Accepted game requests create active session envelopes; playable rules engines arrive in later phases.',
        'Credits must settle through TransactionEngine; items and assets must never be mutated directly by game code.'
      ]
    };
  }
}

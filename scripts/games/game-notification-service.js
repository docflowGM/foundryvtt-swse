/**
 * GameNotificationService
 *
 * Small helper facade for game-related UI refresh hooks. Messenger remains the
 * transport for human-facing game requests, while this service emits lightweight
 * refresh signals so open holopads repaint when game session state changes.
 */

async function emitSocketSync(payload = {}) {
  if (!game?.user?.isGM) return;
  try {
    const { HolonetSocketService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-socket-service.js');
    HolonetSocketService.emitSync({ source: 'games', ...payload });
  } catch (_err) {
    // Socket refresh is best-effort; the local hook below still updates the GM.
  }
}

function emitLocal(payload = {}) {
  Hooks.callAll?.('swseGamesUpdated', payload);
  Hooks.callAll?.('swseHolonetUpdated', payload);
}

export class GameNotificationService {
  static emitSessionUpdated(session, extra = {}) {
    const payload = {
      type: 'game-session-updated',
      sessionId: session?.id ?? null,
      gameId: session?.gameId ?? null,
      ...extra
    };
    emitLocal(payload);
    void emitSocketSync(payload);
  }

  static emitInviteUpdated(session, extra = {}) {
    const payload = {
      type: 'game-invite-updated',
      sessionId: session?.id ?? null,
      gameId: session?.gameId ?? null,
      ...extra
    };
    emitLocal(payload);
    void emitSocketSync(payload);
  }
}

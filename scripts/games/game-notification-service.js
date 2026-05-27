/**
 * GameNotificationService
 *
 * Small helper facade for game-related UI refresh hooks. It intentionally does
 * not publish Holonet records directly; Messenger remains the notification
 * transport for Phase 2 game requests.
 */

export class GameNotificationService {
  static emitSessionUpdated(session, extra = {}) {
    Hooks.callAll?.('swseGamesUpdated', {
      type: 'game-session-updated',
      sessionId: session?.id ?? null,
      gameId: session?.gameId ?? null,
      ...extra
    });
  }

  static emitInviteUpdated(session, extra = {}) {
    Hooks.callAll?.('swseGamesUpdated', {
      type: 'game-invite-updated',
      sessionId: session?.id ?? null,
      gameId: session?.gameId ?? null,
      ...extra
    });
  }
}

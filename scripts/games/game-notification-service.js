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

function formatCreditLine(amount = null) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '';
  const rounded = Math.floor(value);
  return `${rounded} credit${rounded === 1 ? '' : 's'}`;
}

async function publishMessengerReceipt(session = {}, receipt = {}) {
  if (!game?.user?.isGM || !session?.holonetThreadId) return null;
  try {
    const [{ HolonetMessengerService }, { HolonetStorage }] = await Promise.all([
      import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js'),
      import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js')
    ]);
    const thread = await HolonetStorage.getThread(session.holonetThreadId);
    if (!thread || typeof HolonetMessengerService._publishReceiptMessage !== 'function') return null;
    return HolonetMessengerService._publishReceiptMessage(thread, receipt);
  } catch (_err) {
    return null;
  }
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

  static async emitGameReceipt(session, receipt = {}) {
    const amountLabel = receipt.amountLabel || formatCreditLine(receipt.amount);
    const normalized = {
      id: receipt.id ?? `${session?.gameId || 'game'}-${Date.now()}`,
      title: receipt.title || `${session?.title || 'Game'} Receipt`,
      eventType: receipt.eventType || 'game-receipt',
      status: receipt.status || 'complete',
      amount: receipt.amount ?? null,
      amountLabel,
      lines: Array.isArray(receipt.lines) ? receipt.lines.filter(Boolean) : [],
      gameId: session?.gameId ?? null,
      sessionId: session?.id ?? null,
      createdAt: Date.now()
    };
    const payload = {
      type: 'game-receipt',
      sessionId: session?.id ?? null,
      gameId: session?.gameId ?? null,
      receipt: normalized
    };
    emitLocal(payload);
    void emitSocketSync(payload);
    await publishMessengerReceipt(session, normalized);
    return normalized;
  }

}

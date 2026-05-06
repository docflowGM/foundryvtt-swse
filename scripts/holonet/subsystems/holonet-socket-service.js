/**
 * Holonet Socket Service
 *
 * Minimal relay so player-originated Holonet mutations can be persisted by a GM.
 */

import { hydrateHolonetRecord } from '../contracts/record-factory.js';

const SOCKET_NAME = 'system.foundryvtt-swse';
const HOLONET_EVENT = 'holonet';

export class HolonetSocketService {
  static #initialized = false;

  static initialize() {
    if (this.#initialized || !game.socket) return;
    this.#initialized = true;
    game.socket.on(SOCKET_NAME, async payload => {
      if (!payload || payload.event !== HOLONET_EVENT) return;
      if (payload.kind === 'sync') {
        const syncData = payload.data ?? {};
        // Legacy compatibility hook — always fired
        Hooks.callAll('swseHolonetUpdated', syncData);
        // Typed hook routing based on sync type
        if (syncData.type) {
          // Map sync type strings to camelCase hook names
          const typeHookMap = {
            'record-published':  'recordPublished',
            'record-read':       'recordRead',
            'records-read':      'recordsRead',
            'message-sent':      'messageSent',
            'thread-read':       'threadRead',
            'thread-updated':    'threadUpdated',
            'state-updated':     'stateUpdated'
          };
          const hookSuffix = typeHookMap[syncData.type] ?? syncData.type;
          Hooks.callAll(`swseHolonet:${hookSuffix}`, syncData);
        }
        return;
      }
      if (!game.user?.isGM) return;
      try {
        await this.#handleGmRequest(payload);
      } catch (err) {
        console.error('[Holonet] Socket request failed:', err, payload);
      }
    });
  }

  static emitRequest(action, data = {}) {
    game.socket?.emit?.(SOCKET_NAME, {
      event: HOLONET_EVENT,
      kind: 'request',
      action,
      data,
      requesterId: game.user?.id
    });
  }

  static emitSync(data = {}) {
    game.socket?.emit?.(SOCKET_NAME, {
      event: HOLONET_EVENT,
      kind: 'sync',
      data
    });
  }

  static async #handleGmRequest(payload) {
    const { action, data } = payload;
    const { HolonetEngine } = await import('../holonet-engine.js');
    const { HolonetMessengerService } = await import('./holonet-messenger-service.js');

    switch (action) {
      case 'publish-record': {
        const record = hydrateHolonetRecord(data?.record);
        if (record) {
          await HolonetEngine.publish(record, { skipSocket: true });
          this.emitSync({ type: 'record-published', recordId: record.id, recipientIds: record.recipients?.map(r => r.id) ?? [] });
        }
        break;
      }
      case 'mark-read': {
        await HolonetEngine.markRead(data.recordId, data.recipientId, { skipSocket: true });
        this.emitSync({ type: 'record-read', recordId: data.recordId, recipientId: data.recipientId });
        break;
      }
      case 'send-message': {
        const result = await HolonetMessengerService._gmSendMessage(data);
        this.emitSync({ type: 'message-sent', threadId: result?.threadId ?? null });
        break;
      }
      case 'mark-thread-read': {
        await HolonetMessengerService._gmMarkThreadRead(data.threadId, data.recipientId);
        this.emitSync({ type: 'thread-read', threadId: data.threadId, recipientId: data.recipientId });
        break;
      }
      case 'mark-many-read': {
        await HolonetEngine.markManyRead(data.recordIds, data.recipientId, { skipSocket: true });
        // markManyRead emits its own sync after saving — no duplicate sync needed
        break;
      }
    }
  }
}

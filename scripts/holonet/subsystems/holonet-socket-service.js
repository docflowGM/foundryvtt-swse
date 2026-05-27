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
    const requestId = String(data?.requestId || foundry.utils.randomID());
    game.socket?.emit?.(SOCKET_NAME, {
      event: HOLONET_EVENT,
      kind: 'request',
      action,
      data: { ...data, requestId },
      requesterId: game.user?.id,
      requestId
    });
    return requestId;
  }

  static emitSync(data = {}) {
    game.socket?.emit?.(SOCKET_NAME, {
      event: HOLONET_EVENT,
      kind: 'sync',
      data
    });
  }

  static async #handleGmRequest(payload) {
    const { action } = payload;
    const data = { ...(payload.data ?? {}), requesterId: payload.requesterId, requestId: payload.requestId ?? payload.data?.requestId ?? null };
    const { HolonetEngine } = await import('../holonet-engine.js');
    const { HolonetMessengerService } = await import('./holonet-messenger-service.js');

    switch (action) {
      case 'publish-record': {
        const record = hydrateHolonetRecord(data?.record);
        if (record) {
          await HolonetEngine.publish(record, { skipSocket: true });
          this.emitSync({ type: 'record-published', recordId: record.id, recipientIds: record.recipients?.map(r => r.id) ?? [], requestId: data.requestId ?? null, requesterId: data.requesterId ?? null });
        }
        break;
      }
      case 'mark-read': {
        await HolonetEngine.markRead(data.recordId, data.recipientId, { skipSocket: true });
        this.emitSync({ type: 'record-read', recordId: data.recordId, recipientId: data.recipientId, requestId: data.requestId ?? null, requesterId: data.requesterId ?? null });
        break;
      }
      case 'send-message': {
        // Messenger service publishes a single thread-updated sync after its
        // record/thread envelope commits. Do not emit a second socket event here;
        // duplicate syncs caused full shell repaint storms on the sending client.
        await HolonetMessengerService._gmSendMessage(data);
        break;
      }
      case 'create-thread': {
        await HolonetMessengerService._gmCreateThread(data);
        break;
      }
      case 'create-job': {
        await HolonetMessengerService._gmCreateJobPosting(data);
        break;
      }
      case 'offer-credit-transfer': {
        await HolonetMessengerService._gmOfferCreditTransfer(data);
        break;
      }
      case 'compose-credit-operation': {
        await HolonetMessengerService._gmComposeCreditOperation(data);
        break;
      }
      case 'offer-item-transfer': {
        await HolonetMessengerService._gmOfferItemTransfer(data);
        break;
      }
      case 'thread-action': {
        await HolonetMessengerService._gmThreadAction(data);
        break;
      }
      case 'mark-thread-read': {
        await HolonetMessengerService._gmMarkThreadRead(data.threadId, data.recipientId);
        this.emitSync({ type: 'thread-read', threadId: data.threadId, recipientId: data.recipientId, requestId: data.requestId ?? null, requesterId: data.requesterId ?? null });
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

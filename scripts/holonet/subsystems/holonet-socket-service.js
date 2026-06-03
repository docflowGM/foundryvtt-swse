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
      case 'create-game-invite': {
        await HolonetMessengerService._gmCreateGameInvite(data);
        break;
      }
      case 'create-solo-pazaak': {
        const { PazaakEngine } = await import('/systems/foundryvtt-swse/scripts/games/games/pazaak/pazaak-engine.js');
        await PazaakEngine.createSoloAiSession(data);
        break;
      }
      case 'lock-pazaak-side-deck': {
        const { PazaakEngine } = await import('/systems/foundryvtt-swse/scripts/games/games/pazaak/pazaak-engine.js');
        await PazaakEngine.lockSideDeck(data);
        break;
      }
      case 'pazaak-action': {
        const { PazaakEngine } = await import('/systems/foundryvtt-swse/scripts/games/games/pazaak/pazaak-engine.js');
        await PazaakEngine.submitAction(data);
        break;
      }
      case 'create-solo-sabacc': {
        const { SabaccEngine } = await import('/systems/foundryvtt-swse/scripts/games/games/sabacc/sabacc-engine.js');
        await SabaccEngine.createSoloAiSession(data);
        break;
      }
      case 'sabacc-action': {
        const { SabaccEngine } = await import('/systems/foundryvtt-swse/scripts/games/games/sabacc/sabacc-engine.js');
        await SabaccEngine.submitAction(data);
        break;
      }
      case 'create-solo-dejarik': {
        const { DejarikEngine } = await import('/systems/foundryvtt-swse/scripts/games/games/dejarik/dejarik-engine.js');
        await DejarikEngine.createSoloAiSession(data);
        break;
      }
      case 'dejarik-action': {
        const { DejarikEngine } = await import('/systems/foundryvtt-swse/scripts/games/games/dejarik/dejarik-engine.js');
        await DejarikEngine.submitAction(data);
        break;
      }
      case 'create-solo-hintaro': {
        const { HintaroEngine } = await import('/systems/foundryvtt-swse/scripts/games/games/hintaro/hintaro-engine.js');
        await HintaroEngine.createSoloAiSession(data);
        break;
      }
      case 'hintaro-action': {
        const { HintaroEngine } = await import('/systems/foundryvtt-swse/scripts/games/games/hintaro/hintaro-engine.js');
        await HintaroEngine.submitAction(data);
        break;
      }
      case 'create-job': {
        await HolonetMessengerService._gmCreateJobPosting(data);
        break;
      }
      case 'issue-secret-note': {
        await HolonetMessengerService._gmIssueSecretNote(data);
        break;
      }
      case 'open-secret-note': {
        await HolonetMessengerService._gmOpenSecretNote(data);
        break;
      }
      case 'destroy-secret-note': {
        await HolonetMessengerService._gmDestroySecretNote(data);
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
      case 'offer-asset-transfer': {
        await HolonetMessengerService._gmOfferAssetTransfer(data);
        break;
      }
      case 'thread-action': {
        await HolonetMessengerService._gmThreadAction(data);
        break;
      }
      case 'mark-thread-read': {
        await HolonetMessengerService._gmMarkThreadRead(data.threadId, data.recipientId);
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

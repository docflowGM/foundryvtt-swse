/**
 * Holonet Socket Service
 *
 * Minimal relay so player-originated Holonet mutations can be persisted by a GM.
 */

import { hydrateHolonetRecord } from '../contracts/record-factory.js';
import { HolonetGmAuthority } from './holonet-gm-authority.js';

const SOCKET_NAME = 'system.foundryvtt-swse';
const HOLONET_EVENT = 'holonet';

// PHASE 8A: exactly-once publication delivery. `publicationEventId`
// identifies a single publication OCCURRENCE (never the record id — the
// same record may legitimately be republished later as a distinct
// occurrence, and must not be deduped against its own earlier
// publication). Bounded, in-memory, transport-level only, AND (PHASE 8A
// CORRECTION PASS C3) time-limited — never a world setting or a
// persistent ledger. Covers two real risks:
//   1. origin loopback — if the socket transport ever echoes an
//      emitSync() back to the emitting client, that client must not
//      re-dispatch hooks it already fired locally for the same event.
//   2. duplicate remote delivery — a socket redelivery of the same sync
//      must not cause a receiving client to dispatch hooks twice.
// Scoped to events that actually carry a publicationEventId (currently
// only 'record-published'); every other sync type (thread-updated,
// state-updated, etc.) is completely unaffected.
const SEEN_PUBLICATION_EVENT_CAP = 200;
const SEEN_PUBLICATION_EVENT_TTL_MS = 5 * 60 * 1000;

export class HolonetSocketService {
  static #initialized = false;
  // id -> the timestamp (ms) it was first seen. A Map preserves
  // insertion order, so the oldest entry is always first — both TTL
  // pruning and cap eviction only ever need to look at/remove the front.
  static #seenPublicationEvents = new Map();

  static #pruneExpiredPublicationEvents() {
    const cutoff = Date.now() - SEEN_PUBLICATION_EVENT_TTL_MS;
    for (const [id, seenAt] of this.#seenPublicationEvents) {
      if (seenAt >= cutoff) break; // insertion-ordered: everything after this is newer too
      this.#seenPublicationEvents.delete(id);
    }
  }

  static #markPublicationEventSeen(id) {
    if (!id) return;
    this.#pruneExpiredPublicationEvents();
    this.#seenPublicationEvents.set(id, Date.now());
    if (this.#seenPublicationEvents.size > SEEN_PUBLICATION_EVENT_CAP) {
      const oldestId = this.#seenPublicationEvents.keys().next().value;
      this.#seenPublicationEvents.delete(oldestId);
    }
  }

  static #hasSeenPublicationEvent(id) {
    if (!id) return false;
    this.#pruneExpiredPublicationEvents();
    return this.#seenPublicationEvents.has(id);
  }

  static initialize() {
    if (this.#initialized || !game.socket) return;
    this.#initialized = true;
    game.socket.on(SOCKET_NAME, async payload => {
      if (!payload || payload.event !== HOLONET_EVENT) return;
      if (payload.kind === 'sync') {
        const syncData = payload.data ?? {};
        if (syncData.publicationEventId && this.#hasSeenPublicationEvent(syncData.publicationEventId)) {
          // Already dispatched for this exact publication occurrence —
          // either this client originated it (loopback) or already
          // processed this same remote delivery once. Never redispatch.
          return;
        }
        if (syncData.publicationEventId) this.#markPublicationEventSeen(syncData.publicationEventId);
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
      // PHASE 8A CORRECTION PASS (C1): every ACTIVE GM client receives
      // this same request (Foundry's socket relay is not addressed to a
      // single connection) — without this gate, N active GMs would each
      // independently persist and broadcast N separate publication
      // occurrences for the same player request. Only the deterministic
      // primary active GM (HolonetGmAuthority) proceeds; every other
      // active GM silently stands down. Does not disambiguate multiple
      // browser tabs of the SAME GM user — see HolonetGmAuthority's own
      // documented limitation.
      if (!HolonetGmAuthority.isPrimaryActiveGm()) return;
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
    // Mark BEFORE sending: if the transport ever echoes this back to us,
    // or if some other path redelivers the same publicationEventId, the
    // receive handler above will recognize it and skip redispatching.
    if (data?.publicationEventId) this.#markPublicationEventSeen(data.publicationEventId);
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
        // PHASE 8A: the GM-authoritative publish path is now the SOLE
        // owner of the post-commit record-published sync (it already
        // knows recipients/requestId/requesterId and — critically —
        // whether persistence actually succeeded). Previously this
        // handler called publish() with skipSocket:true and then
        // manually re-emitted its own success sync afterward, without
        // checking publish()'s result — a failed storage write could
        // still announce a successful publication to every client.
        const record = hydrateHolonetRecord(data?.record);
        if (record) {
          await HolonetEngine.publish(record, { skipSocket: false, requestId: data.requestId ?? null, requesterId: data.requesterId ?? null });
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
      case 'attempt-secret-note-decryption': {
        await HolonetMessengerService._gmAttemptSecretNoteDecryption(data);
        break;
      }
      case 'attempt-intel-decryption': {
        const { HolonetIntelService } = await import('./holonet-intel-service.js');
        await HolonetIntelService._gmAttemptIntelDecryption(data);
        break;
      }
      case 'select-intel-cipher': {
        const { HolonetIntelService } = await import('./holonet-intel-service.js');
        await HolonetIntelService._gmSelectIntelCipher(data);
        break;
      }
      case 'guess-intel-cipher': {
        const { HolonetIntelService } = await import('./holonet-intel-service.js');
        await HolonetIntelService._gmGuessIntelCipher(data);
        break;
      }
      case 'claim-intel-lockbox': {
        const { HolonetIntelService } = await import('./holonet-intel-service.js');
        await HolonetIntelService._gmClaimIntelLockbox(data);
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

/**
 * Holonet Manager
 *
 * Stable, developer-friendly API for system code and macros to send Holonet records
 * without needing to understand all internal services, sources, and contracts.
 *
 * Phase 3 addition: provides simple methods for common Holonet use-cases.
 */

import { HolonetEngine } from './holonet-engine.js';
import { HolonetBus } from './subsystems/holonet-bus.js';
import { HolonetEmissionService } from './subsystems/holonet-emission-service.js';
import { HolonetRecipient } from './contracts/holonet-recipient.js';
import { HolonetSender } from './contracts/holonet-sender.js';
import { HolonetAudience } from './contracts/holonet-audience.js';
import { HolonetMessage } from './contracts/holonet-message.js';
import { HolonetNotification } from './contracts/holonet-notification.js';
import { RECORD_TYPE, SOURCE_FAMILY, INTENT_TYPE } from './contracts/enums.js';
import { SystemSource } from './sources/system-source.js';

/**
 * Holonet Manager - Simple, stable API
 *
 * Usage examples:
 *
 *   // Send a direct message between two actors
 *   await HolonetManager.sendMessage({
 *     from: 'actor:actor-id-1',
 *     to: 'actor:actor-id-2',
 *     title: 'Subject',
 *     body: 'Message body'
 *   });
 *
 *   // Broadcast a system notice to all players
 *   await HolonetManager.systemNotice({
 *     audience: 'all-players',
 *     title: 'System Alert',
 *     body: 'Something important happened'
 *   });
 *
 *   // Send a mentor dialog notice to a player
 *   await HolonetManager.mentorNotice({
 *     actor: 'persona:mentor:npc-id',
 *     title: 'Mentor Advice',
 *     body: 'Here is some wisdom...'
 *   });
 *
 *   // Mark records as read
 *   await HolonetManager.markAllRead('player:user-id');
 */
export class HolonetManager {
  // ─── Message API ───────────────────────────────────────────────────────
  /**
   * Send a direct message between two personas/actors.
   *
   * @param {Object} opts
   * @param {string} [opts.from] Sender persona/actor ID (defaults to current user)
   * @param {string} [opts.to] Recipient persona/actor ID
   * @param {string} [opts.title] Message subject
   * @param {string} [opts.body] Message body
   * @param {Object} [opts.metadata] Extra metadata
   * @returns {Promise<boolean>}
   */
  static async sendMessage({ from = null, to = null, title = '', body = '', metadata = {} } = {}) {
    if (!to) {
      console.warn('[HolonetManager.sendMessage] Missing required "to" parameter');
      return false;
    }

    try {
      const { HolonetMessengerService } = await import('./subsystems/holonet-messenger-service.js');
      const { PERSONA_TYPE } = await import('./contracts/enums.js');

      const resolveActorFromTarget = target => {
        if (typeof target !== 'string') return null;
        if (target.startsWith('actor:')) return game.actors?.get(target.split(':')[1]) ?? null;
        if (target.startsWith('persona:')) return game.actors?.get(target.split(':')[2]) ?? null;
        return game.actors?.get(target) ?? null;
      };

      const resolveRecipientId = target => {
        if (!target) return null;
        if (typeof target !== 'string') return target.id ?? null;
        if (target.startsWith('player:') || target.startsWith('gm:') || target === 'gm' || target.startsWith('persona:')) return target;
        const actor = resolveActorFromTarget(target);
        if (actor) {
          const owningUser = (game.users?.contents ?? game.users ?? []).find(user => user?.character?.id === actor.id);
          if (owningUser && !owningUser.isGM) return `player:${owningUser.id}`;
          return `persona:${PERSONA_TYPE.NPC}:${actor.id}`;
        }
        return target;
      };

      const senderActor = resolveActorFromTarget(from) ?? null;
      const targets = Array.isArray(to) ? to : [to];
      const recipientIds = targets.map(resolveRecipientId).filter(Boolean);
      if (!recipientIds.length) {
        console.warn('[HolonetManager.sendMessage] No valid recipients resolved');
        return false;
      }

      if (game.user?.isGM) {
        await HolonetMessengerService._gmSendMessage({
          actorId: senderActor?.id ?? null,
          body,
          recipientIds,
          senderUserId: game.user?.id ?? null,
          senderRecipientId: HolonetEngine.delivery.getCurrentRecipientId(),
          metadata: { title, ...metadata }
        });
        return true;
      }

      await HolonetMessengerService.sendMessage({
        actor: senderActor,
        body,
        recipientIds
      });
      return true;
    } catch (err) {
      console.error('[HolonetManager.sendMessage] Failed:', err);
      return false;
    }
  }

  // ─── Notification API ──────────────────────────────────────────────────
  /**
   * Send a notification to one or more recipients.
   *
   * @param {Object} opts
   * @param {string|string[]} [opts.recipients] Recipient ID(s) (if null, uses current user)
   * @param {string} [opts.audience] Audience type for wider targeting
   * @param {string} [opts.title] Notification title
   * @param {string} [opts.body] Notification body
   * @param {string} [opts.intent] Intent for categorization
   * @param {string} [opts.sourceFamily] Source family for styling
   * @param {string} [opts.category] Category for grouping
   * @param {string} [opts.level] Notification level (info, warning, critical)
   * @param {Object} [opts.metadata] Extra metadata
   * @returns {Promise<boolean>}
   */
  static async notify({
    recipients = null,
    audience = null,
    title = '',
    body = '',
    intent = INTENT_TYPE.SYSTEM_NEW_EVENT,  // Default system event intent
    sourceFamily = SOURCE_FAMILY.GM_AUTHORED,
    category = null,
    level = 'info',
    metadata = {}
  } = {}) {
    try {
      // Normalize recipients
      let targetRecipients = [];
      if (recipients) {
        const ids = Array.isArray(recipients) ? recipients : [recipients];
        targetRecipients = ids.map(id => {
          return HolonetRecipient.fromStableId?.(id) || { id, label: id };
        });
      } else if (!audience) {
        // Default to current user
        const currentId = HolonetEngine.delivery.getCurrentRecipientId();
        if (currentId) {
          targetRecipients = [HolonetRecipient.fromStableId?.(currentId) || { id: currentId, label: currentId }];
        }
      }

      let finalAudience;
      if (audience) {
        // Parse audience string
        finalAudience = HolonetAudience.fromString?.(audience) || { type: audience };
      } else if (targetRecipients.length) {
        // If recipients provided, use selectedPlayers (extract IDs if needed)
        const recipientIds = targetRecipients.map(r => r.id || r);
        finalAudience = HolonetAudience.selectedPlayers(recipientIds);
      } else {
        // Fallback to all players
        finalAudience = HolonetAudience.allPlayers();
      }

      const finalMeta = { ...metadata, level };
      if (category) finalMeta.category = category;

      const record = new HolonetNotification({
        intent,
        audience: finalAudience,
        recipients: targetRecipients,
        title: title || 'Notification',
        body,
        sourceFamily,
        metadata: finalMeta,
        level
      });

      return HolonetEngine.publish(record, { skipSocket: false });
    } catch (err) {
      console.error('[HolonetManager.notify] Failed:', err);
      return false;
    }
  }

  // ─── Bulletin API ──────────────────────────────────────────────────────
  /**
   * Broadcast a bulletin/announcement to all players.
   *
   * @param {Object} opts
   * @param {string} [opts.title] Bulletin title
   * @param {string} [opts.body] Bulletin body
   * @param {string[]} [opts.tags] Optional tags for categorization
   * @param {Object} [opts.metadata] Extra metadata
   * @returns {Promise<boolean>}
   */
  static async bulletin({ title = '', body = '', tags = [], metadata = {} } = {}) {
    try {
      const bulletinMeta = { ...metadata };
      if (tags.length) bulletinMeta.tags = tags;

      const record = new HolonetNotification({
        intent: INTENT_TYPE.BULLETIN_EVENT,  // Use appropriate bulletin event intent
        audience: HolonetAudience.allPlayers(),
        title: title || 'Bulletin',
        body,
        sourceFamily: SOURCE_FAMILY.BULLETIN,
        metadata: bulletinMeta
      });

      return HolonetEngine.publish(record, { skipSocket: false });
    } catch (err) {
      console.error('[HolonetManager.bulletin] Failed:', err);
      return false;
    }
  }

  // ─── Mentor API ────────────────────────────────────────────────────────
  /**
   * Send a mentor dialog or advice notice.
   *
   * @param {Object} opts
   * @param {string} [opts.actor] Mentor actor/persona ID
   * @param {string} [opts.title] Dialog title
   * @param {string} [opts.body] Dialog body/advice
   * @param {string} [opts.intent] Intent for categorization
   * @param {Object} [opts.metadata] Extra metadata
   * @returns {Promise<boolean>}
   */
  static async mentorNotice({
    actor = null,
    title = '',
    body = '',
    intent = INTENT_TYPE.MENTOR_CHECK_IN,  // Use appropriate mentor intent
    metadata = {}
  } = {}) {
    try {
      const currentId = HolonetEngine.delivery.getCurrentRecipientId();
      const targetRecipient = currentId
        ? (HolonetRecipient.fromStableId?.(currentId) || { id: currentId, label: currentId })
        : null;

      const sender = actor
        ? HolonetSender.fromActor(actor, actor)
        : HolonetSender.system('Mentor');

      // Extract recipient ID for audience (if targetRecipient is an object, use .id property)
      const recipientIds = targetRecipient ? [(typeof targetRecipient === 'string' ? targetRecipient : targetRecipient.id)] : [];
      const finalAudience = recipientIds.length ? HolonetAudience.selectedPlayers(recipientIds) : HolonetAudience.allPlayers();

      const record = new HolonetNotification({
        intent,
        sender,
        audience: finalAudience,
        recipients: targetRecipient ? [targetRecipient] : [],
        title: title || 'Mentor Advice',
        body,
        sourceFamily: SOURCE_FAMILY.MENTOR,
        metadata
      });

      return HolonetEngine.publish(record, { skipSocket: false });
    } catch (err) {
      console.error('[HolonetManager.mentorNotice] Failed:', err);
      return false;
    }
  }

  // ─── System API ────────────────────────────────────────────────────────
  /**
   * Send a system-level notice to specified recipients.
   *
   * @param {Object} opts
   * @param {string|string[]} [opts.audience] Audience type or recipient ID(s)
   * @param {string} [opts.title] Notice title
   * @param {string} [opts.body] Notice body
   * @param {string} [opts.intent] Intent for categorization
   * @param {Object} [opts.metadata] Extra metadata
   * @returns {Promise<boolean>}
   */
  static async systemNotice({
    audience = 'all-players',
    title = '',
    body = '',
    intent = INTENT_TYPE.SYSTEM_NEW_EVENT,  // Default system event intent
    metadata = {}
  } = {}) {
    try {
      let finalAudience;
      if (typeof audience === 'string') {
        finalAudience = HolonetAudience.fromString?.(audience) || { type: audience };
      } else if (Array.isArray(audience)) {
        // Extract IDs from audience array (can be strings or objects)
        const audienceIds = audience.map(id => (typeof id === 'string' ? id : id.id || id));
        finalAudience = HolonetAudience.selectedPlayers(audienceIds);
      } else {
        finalAudience = audience;
      }

      const record = new HolonetNotification({
        intent,
        audience: finalAudience,
        title: title || 'System Notice',
        body,
        sourceFamily: SOURCE_FAMILY.GM_AUTHORED,
        metadata
      });

      return HolonetEngine.publish(record, { skipSocket: false });
    } catch (err) {
      console.error('[HolonetManager.systemNotice] Failed:', err);
      return false;
    }
  }

  // ─── Read State API ────────────────────────────────────────────────────
  /**
   * Mark all unread records as read for a recipient.
   *
   * @param {string} [recipientId] Recipient ID (defaults to current user)
   * @returns {Promise<boolean>}
   */
  static async markAllRead(recipientId = null) {
    try {
      const targetId = recipientId || HolonetEngine.delivery.getCurrentRecipientId();
      if (!targetId) {
        console.warn('[HolonetManager.markAllRead] No recipient ID provided or detected');
        return false;
      }

      const unreadRecords = await HolonetEngine.storage.getUnreadRecordsForRecipient(targetId);
      const unreadIds = unreadRecords.map(r => r.id);

      if (!unreadIds.length) return true;

      return HolonetEngine.markManyRead(unreadIds, targetId, { skipSocket: false });
    } catch (err) {
      console.error('[HolonetManager.markAllRead] Failed:', err);
      return false;
    }
  }

}

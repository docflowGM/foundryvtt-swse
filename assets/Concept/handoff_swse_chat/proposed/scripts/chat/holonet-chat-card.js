/**
 * scripts/chat/holonet-chat-card.js
 *
 * Bridge: HolonetEngine record events → chat log transmission cards.
 *
 * Listens for `swseHolonet:recordPublished`, builds a holonet-card.hbs
 * payload, posts via SWSEChat.postHTML with `whisper: <recipientUserIds>`.
 *
 * Click delegation routes to the existing Messenger surface via
 * ShellHost.setSurface('messenger', { threadId }). If the actor's
 * datapad isn't open yet, opens it first.
 *
 * Privacy model: posts are whispered, so non-recipients never see them.
 * The CSS .redacted variant exists only as a visual fallback and is
 * never emitted from this helper.
 */

import { SWSEChat }          from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
// Optional — only if your build has these as named exports. If not,
// resolve them via game.swse / window.SWSE at call time instead.
import { HolonetEngine }     from "/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js";
import { HolonetManager }    from "/systems/foundryvtt-swse/scripts/holonet/holonet-manager.js";

const TEMPLATE = "systems/foundryvtt-swse/templates/chat/holonet-card.hbs";

export class HolonetChatCard {
  static install() {
    // Subscribe to the existing hook. `payload` shape per
    // scripts/holonet/holonet-engine.js: { recordId, recipients }.
    Hooks.on("swseHolonet:recordPublished", HolonetChatCard._onPublished);

    // Delegated click on transmission cards → open Messenger
    document.addEventListener("click", HolonetChatCard._onCardClick, true);
    document.addEventListener("keydown", HolonetChatCard._onCardKey, true);
  }

  static async _onPublished({ recordId, recipients }) {
    try {
      const record = await HolonetManager.getRecord?.(recordId);
      if (!record) return;
      if (record.type && record.type !== "message") return; // skip non-messages

      const recipientUserIds = HolonetChatCard._resolveRecipientUserIds(recipients ?? record.recipients);
      if (!recipientUserIds.length) return;

      const ctx = HolonetChatCard._buildContext(record);
      const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, ctx);

      await SWSEChat.postHTML({
        content,
        whisper: recipientUserIds,
        flags: {
          swse: {
            holonetRecordId: record.id,
            holonetThreadId: record.threadId ?? null,
            chatCardKind: "holonet"
          }
        }
      });
    } catch (err) {
      console.warn("[SWSE] HolonetChatCard: failed to post transmission card", err);
    }
  }

  /**
   * Resolve HolonetRecipient[] → Foundry user IDs.
   * Adjust to your repo's recipient → userId resolution helper.
   */
  static _resolveRecipientUserIds(recipients = []) {
    if (!Array.isArray(recipients)) return [];
    const users = new Set();
    for (const r of recipients) {
      // Common shapes: { userId } | { actorId } | string user id
      if (typeof r === "string") { users.add(r); continue; }
      if (r?.userId) users.add(r.userId);
      else if (r?.actorId) {
        const actor = game.actors?.get?.(r.actorId);
        for (const uid of HolonetChatCard._ownerIds(actor)) users.add(uid);
      }
    }
    return [...users];
  }

  static _ownerIds(actor) {
    if (!actor) return [];
    const out = [];
    for (const [uid, lvl] of Object.entries(actor.ownership ?? {})) {
      if (lvl >= 3 /* OWNER */ && uid !== "default") out.push(uid);
    }
    return out;
  }

  /**
   * Build the Handlebars context from a HolonetRecord. Keep this small
   * and pure — formatting only; no engine calls.
   */
  static _buildContext(record) {
    const priority = String(record.priority ?? record.tags?.find?.(t => /priority|urgent|alert|secure/i.test(t)) ?? "").toLowerCase();
    const isUrgent = /urgent|priority/.test(priority);
    const isAlert  = /alert/.test(priority);
    const isSecure = /secure|encrypted/.test(priority);

    const source = record.sourceType === "npc" ? "npc" : "gm";
    const direction = record.authorUserId === game.user.id ? "outgoing" : "incoming";

    return {
      recordId:  record.id,
      threadId:  record.threadId ?? null,
      priority:  isUrgent ? "urgent" : isAlert ? "alert" : isSecure ? "secure" : null,
      source,
      direction,
      unread:    direction !== "outgoing" && !record.readBy?.includes?.(game.user.id),
      priorityLabel: direction === "outgoing"
        ? "Sent"
        : isUrgent ? "Urgent" : isAlert ? "Alert" : (record.kind === "dm" ? "DM" : "Transmission"),
      vlabel: direction === "outgoing"
        ? "Transmitted"
        : (isUrgent ? "Incoming · Priority" : "Direct Message"),
      meta: [
        record.channel ?? null,
        record.encryption ?? null,
        HolonetChatCard._formatTime(record.timestamp ?? record.createdAt)
      ].filter(Boolean),
      fromLabel:  record.fromLabel ?? record.authorName ?? "Unknown",
      relayLabel: record.relayLabel ?? null,
      subject:    record.subject ?? record.title ?? HolonetChatCard._firstLine(record.body),
      preview:    HolonetChatCard._sanitizedPreview(record.body),
      attachmentCount: record.attachments?.length ?? 0,
      actionLabel: direction === "outgoing" ? "View<br/>Thread" : null
    };
  }

  static _firstLine(body) {
    return String(body ?? "").split(/\n/)[0]?.slice(0, 120) ?? "";
  }

  static _sanitizedPreview(body) {
    // Defer to Foundry's text enrichment if available; otherwise plain trim.
    const txt = String(body ?? "").replace(/<[^>]+>/g, "");
    return txt.length > 220 ? txt.slice(0, 220) + "…" : txt;
  }

  static _formatTime(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    return Number.isFinite(d.getTime())
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null;
  }

  /* ----- Card click delegation ----- */

  static _onCardClick(ev) {
    const card = ev.target.closest?.(".swse-holonet-card[data-holonet-action='open-thread']");
    if (!card) return;
    ev.preventDefault();
    HolonetChatCard._openThread(card);
  }
  static _onCardKey(ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const card = ev.target.closest?.(".swse-holonet-card[data-holonet-action='open-thread']");
    if (!card) return;
    ev.preventDefault();
    HolonetChatCard._openThread(card);
  }

  /**
   * Open the existing Messenger surface to the relevant thread. Tries
   * ShellHost.setSurface first; falls back gracefully.
   */
  static async _openThread(card) {
    const threadId = card.dataset.holonetThreadId;
    const recordId = card.dataset.holonetRecordId;

    try {
      // Mark read via the engine — never invent a parallel read-state system.
      if (recordId && HolonetEngine?.markRead) {
        await HolonetEngine.markRead({ recordId, recipientId: game.user.id });
      }

      // Route through the existing shell. Adjust to match the actual
      // ShellHost API in your build (sometimes globalThis.swseShell, or
      // game.swse.shell, etc).
      const shell = globalThis.swseShell ?? game.swse?.shell ?? null;
      if (shell?.setSurface) {
        await shell.setSurface("messenger", { threadId });
        return;
      }

      // Fallback: open the GM datapad / actor datapad if no shell route exists
      const actorId = game.user.character?.id;
      const actor = actorId ? game.actors.get(actorId) : null;
      if (actor) {
        actor.sheet?.render?.(true);
        ui.notifications?.info(`Open the Messenger tab to view thread ${threadId}.`);
        return;
      }

      ui.notifications?.warn("No datapad open — cannot route to Messenger.");
    } catch (err) {
      console.warn("[SWSE] HolonetChatCard: failed to open thread", err);
      ui.notifications?.error("Could not open Holonet thread. Check console.");
    }
  }
}

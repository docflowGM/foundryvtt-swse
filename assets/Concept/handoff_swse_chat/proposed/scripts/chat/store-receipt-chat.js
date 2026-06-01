/**
 * scripts/chat/store-receipt-chat.js
 *
 * Bridge: store/credit engine hooks → chat-log receipt cards.
 *
 * Subscribes to existing hooks (no new ledger, no new mutation paths):
 *   swseStoreTransactionComplete   — store purchase
 *   swseCustomPurchaseApproved     — GM approval of a custom item / droid
 *   swseCustomPurchaseDenied       — GM denial
 *   swseApprovalResolved           — droid/vehicle approval through GM datapad
 *   swseCreditTransferComplete     — player↔player transfer
 *   swseCreditGrantComplete        — GM grant
 *
 * Each handler builds a Handlebars context, renders
 * templates/chat/store-receipt.hbs, and posts via SWSEChat.postHTML with
 * whisper limited to the actor's owners (and the counter-party for
 * transfers).
 *
 * Hard rules:
 *  - Never mutate credits or actor state. The receipt is read-only.
 *  - Never post a public receipt — always whisper.
 *  - Always include previous/delta/final when the source hook provided them.
 *  - Use existing positive/negative tokens via the deltaDirection
 *    attribute; the CSS picks the actual color.
 */

import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";

const TEMPLATE = "systems/foundryvtt-swse/templates/chat/store-receipt.hbs";

/* Tiny SVG library — keep these inline so we never load images during a
   chat render. Replace freely; CSS handles color via currentColor. */
const SVG = {
  receipt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
    <rect x="3" y="6" width="18" height="12" rx="1.5"/>
    <path d="M3 10 H21" opacity="0.6"/>
    <circle cx="8" cy="14.5" r="1.4" fill="currentColor"/>
    <path d="M12 13 H18" opacity="0.7"/>
    <path d="M12 16 H16" opacity="0.4"/>
  </svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
    <path d="M5 12 L10 17 L19 7"/>
    <circle cx="12" cy="12" r="9" opacity="0.4"/>
  </svg>`,
  cross: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
    <circle cx="12" cy="12" r="9"/><path d="M6 6 L18 18"/>
  </svg>`,
  swap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
    <path d="M3 8 H17 L13 4 M21 16 H7 L11 20"/>
  </svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
    <circle cx="12" cy="12" r="8"/><path d="M12 7 V17 M9 10 H15"/>
  </svg>`
};

export class StoreReceiptChat {
  static install() {
    Hooks.on("swseStoreTransactionComplete", (p) => StoreReceiptChat._onPurchase(p));
    Hooks.on("swseCustomPurchaseApproved",   (p) => StoreReceiptChat._onApproval(p));
    Hooks.on("swseCustomPurchaseDenied",     (p) => StoreReceiptChat._onDenial(p));
    Hooks.on("swseApprovalResolved",         (p) => StoreReceiptChat._onApprovalResolved(p));
    Hooks.on("swseCreditTransferComplete",   (p) => StoreReceiptChat._onTransfer(p));
    Hooks.on("swseCreditGrantComplete",      (p) => StoreReceiptChat._onGrant(p));
  }

  /* ===================================================================
     Hook handlers — adapt field names to the actual payloads emitted by
     StoreTransactionEngine / GMStoreDashboard. The keys below match the
     hand-off spec; if your engine emits slightly different names, just
     swap in the right paths.
     =================================================================== */

  static async _onPurchase(p) {
    if (!p?.actor) return;
    const previous = Number(p.creditsBefore ?? 0);
    const finalC   = Number(p.creditsAfter  ?? previous - (p.total ?? 0));
    const delta    = finalC - previous;
    await StoreReceiptChat._post(p.actor, {
      transactionId: p.transactionId ?? p.id ?? foundry.utils.randomID(),
      sourceType:    "purchase",
      deltaDirection: delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral",
      kindLabel:     "Purchase",
      vlabel:        "Receipt · Purchase",
      chipSvg:       SVG.receipt,
      title:         p.title ?? "Store purchase",
      itemsHtml:     StoreReceiptChat._itemsList(p.purchasedItems),
      meta: [p.vendorName, StoreReceiptChat._fmtTime(p.timestamp)].filter(Boolean),
      previousLabel: "Previous",
      previousCredits: previous,
      deltaArrowLabel: delta < 0 ? "spent" : delta > 0 ? "refunded" : "no change",
      deltaCredits:  delta,
      finalLabel:    "New Balance",
      finalCredits:  finalC,
      actorName:     p.actor.name
    });
  }

  static async _onApproval(p) {
    if (!p?.actor) return;
    const previous = Number(p.creditsBefore ?? 0);
    const finalC   = Number(p.creditsAfter  ?? previous - (p.cost ?? 0));
    const delta    = finalC - previous;
    await StoreReceiptChat._post(p.actor, {
      transactionId: p.transactionId ?? p.requestId ?? foundry.utils.randomID(),
      sourceType:    "approval",
      deltaDirection: delta < 0 ? "negative" : delta > 0 ? "positive" : "neutral",
      kindLabel:     "Approved",
      vlabel:        "Approved · GM",
      chipSvg:       SVG.check,
      title:         p.title ?? "Custom purchase approved",
      itemsHtml:     p.summary ?? p.itemDescription ?? "",
      meta:          ["GM Approval Dashboard", StoreReceiptChat._fmtTime(p.timestamp)],
      previousLabel: "Previous",
      previousCredits: previous,
      deltaArrowLabel: "cost",
      deltaCredits:  delta,
      finalLabel:    "New Balance",
      finalCredits:  finalC,
      issuerLabel:   "Approved by: GM",
      actions:       p.linkedSheetId ? [{ label: "Open Sheet", dataset: { sheetId: p.linkedSheetId } }] : null
    });
  }

  static async _onDenial(p) {
    if (!p?.actor) return;
    const previous = Number(p.creditsBefore ?? p.balance ?? 0);
    await StoreReceiptChat._post(p.actor, {
      transactionId: p.transactionId ?? p.requestId ?? foundry.utils.randomID(),
      sourceType:    "denial",
      deltaDirection: "neutral",
      kindLabel:     "Denied",
      vlabel:        "Denied · GM",
      chipSvg:       SVG.cross,
      title:         p.title ?? "Request denied",
      itemsHtml:     `Requested: <b>${StoreReceiptChat._escape(p.itemName ?? "—")}</b>${p.reason ? ` · Reason: <b>${StoreReceiptChat._escape(p.reason)}</b>` : ""}`,
      meta:          ["GM Approval Dashboard", StoreReceiptChat._fmtTime(p.timestamp)],
      previousLabel: "Previous",
      previousCredits: previous,
      deltaArrowLabel: "no change",
      deltaCredits:  0,
      finalLabel:    "Balance",
      finalCredits:  previous,
      issuerLabel:   "Denied by: GM"
    });
  }

  // GMDatapad approval flow — droids / vehicles. Mostly same shape as approval.
  static _onApprovalResolved(p) {
    if (p?.outcome === "approved") return this._onApproval(p);
    if (p?.outcome === "denied")   return this._onDenial(p);
    return null;
  }

  static async _onTransfer(p) {
    if (!p?.fromActor || !p?.toActor) return;
    const amount = Math.abs(Number(p.amount ?? 0));
    if (!amount) return;

    // Whisper to BOTH parties — each gets the receipt from their own POV.
    await Promise.all([
      StoreReceiptChat._post(p.fromActor, {
        transactionId: p.transactionId ?? foundry.utils.randomID(),
        sourceType:    "credit-transfer",
        deltaDirection: "negative",
        kindLabel:     "Transfer",
        vlabel:        "Transfer · Credits",
        chipSvg:       SVG.swap,
        title:         `Credits sent: ${p.fromActor.name} → ${p.toActor.name}`,
        itemsHtml:     p.reason ? `Reason: <b>${StoreReceiptChat._escape(p.reason)}</b>` : "",
        meta:          ["Party Ledger", StoreReceiptChat._fmtTime(p.timestamp)],
        previousLabel: "Your Previous",
        previousCredits: Number(p.fromBefore ?? 0),
        deltaArrowLabel: "sent",
        deltaCredits:  -amount,
        finalLabel:    "Your New Balance",
        finalCredits:  Number(p.fromAfter ?? (p.fromBefore ?? 0) - amount),
        fromLabel:     p.fromActor.name,
        toLabel:       p.toActor.name,
        actions:       p.threadId ? [{ label: "Open Holochat", dataset: { holonetThreadId: p.threadId, holonetAction: "open-thread" } }] : null
      }),
      StoreReceiptChat._post(p.toActor, {
        transactionId: p.transactionId ?? foundry.utils.randomID(),
        sourceType:    "credit-transfer",
        deltaDirection: "positive",
        kindLabel:     "Transfer",
        vlabel:        "Transfer · Credits",
        chipSvg:       SVG.swap,
        title:         `Credits received: ${p.fromActor.name} → ${p.toActor.name}`,
        itemsHtml:     p.reason ? `Reason: <b>${StoreReceiptChat._escape(p.reason)}</b>` : "",
        meta:          ["Party Ledger", StoreReceiptChat._fmtTime(p.timestamp)],
        previousLabel: "Your Previous",
        previousCredits: Number(p.toBefore ?? 0),
        deltaArrowLabel: "received",
        deltaCredits:  +amount,
        finalLabel:    "Your New Balance",
        finalCredits:  Number(p.toAfter ?? (p.toBefore ?? 0) + amount),
        fromLabel:     p.fromActor.name,
        toLabel:       p.toActor.name
      })
    ]);
  }

  static async _onGrant(p) {
    if (!p?.actor) return;
    const previous = Number(p.creditsBefore ?? 0);
    const finalC   = Number(p.creditsAfter  ?? previous + (p.amount ?? 0));
    const delta    = finalC - previous;
    await StoreReceiptChat._post(p.actor, {
      transactionId: p.transactionId ?? foundry.utils.randomID(),
      sourceType:    "credit-grant",
      deltaDirection: delta >= 0 ? "positive" : "negative",
      kindLabel:     "Grant",
      vlabel:        "Grant · Quest Reward",
      chipSvg:       SVG.plus,
      title:         p.title ?? "Credit grant received",
      itemsHtml:     p.reason ? `Reward for: <b>${StoreReceiptChat._escape(p.reason)}</b>` : "",
      meta:          [p.source ?? "Quest Reward", StoreReceiptChat._fmtTime(p.timestamp)],
      previousLabel: "Previous",
      previousCredits: previous,
      deltaArrowLabel: delta >= 0 ? "received" : "deducted",
      deltaCredits:  delta,
      finalLabel:    "New Balance",
      finalCredits:  finalC,
      issuerLabel:   "Issued by: GM"
    });
  }

  /* ===================================================================
     Internal helpers
     =================================================================== */

  static async _post(actor, ctx) {
    try {
      const owners = StoreReceiptChat._ownerUserIds(actor);
      if (!owners.length) return; // no one to whisper to
      const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, ctx);
      await SWSEChat.postHTML({
        content,
        whisper: owners,
        flags: { swse: { chatCardKind: "store-receipt", transactionId: ctx.transactionId } }
      });
    } catch (err) {
      console.warn("[SWSE] StoreReceiptChat: failed to post receipt", err, ctx);
    }
  }

  static _ownerUserIds(actor) {
    const out = [];
    for (const [uid, lvl] of Object.entries(actor?.ownership ?? {})) {
      if (lvl >= 3 /* OWNER */ && uid !== "default") out.push(uid);
    }
    // Always include the GM so they have a copy in their log.
    const gm = game.users?.find?.(u => u.isGM && u.active);
    if (gm && !out.includes(gm.id)) out.push(gm.id);
    return out;
  }

  static _itemsList(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return items
      .map(i => {
        const qty = i.quantity ?? i.count ?? 1;
        const name = StoreReceiptChat._escape(i.name ?? i.label ?? "Item");
        return `${qty}× <b>${name}</b>`;
      })
      .join(" · ");
  }

  static _fmtTime(ts) {
    if (!ts) ts = Date.now();
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  static _escape(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
}

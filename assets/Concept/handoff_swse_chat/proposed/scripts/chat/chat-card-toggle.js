/**
 * scripts/chat/chat-card-toggle.js
 *
 * Click-to-expand handler for .swse-chat-card .total.
 *
 * - Delegates clicks via the chat log so it works for newly-posted
 *   messages without re-binding.
 * - Persists expanded state on the ChatMessage flag so refreshes,
 *   other-client renders, and re-renders all stay consistent.
 * - Moves the rendered .d20 chip from .total into the head of .parts so
 *   the dice result lives with the rest of the math. If the holo-roll
 *   template emits the d20 directly inside .parts, this no-ops cleanly.
 */

const FLAG_SCOPE = "foundryvtt-swse";
const FLAG_KEY   = "chatExpanded";

export class ChatCardToggle {
  static install() {
    // 1) Hook every chat-message render to (a) shuffle the d20 chip and
    //    (b) apply persisted expanded state.
    Hooks.on("renderChatMessage", (message, html) => {
      const root = html?.[0] ?? html;
      if (!root) return;
      root.querySelectorAll(".swse-chat-card").forEach((card) => {
        ChatCardToggle._normalizeRollCard(card);
        const expanded = message?.getFlag?.(FLAG_SCOPE, FLAG_KEY) === true;
        if (expanded) {
          card.setAttribute("data-expanded", "true");
          card.querySelector(".total")?.setAttribute("aria-expanded", "true");
        }
      });
    });

    // 2) Delegated click + keyboard activation on the chat log
    document.addEventListener("click", ChatCardToggle._onClick, true);
    document.addEventListener("keydown", ChatCardToggle._onKey, true);
  }

  static _onClick(ev) {
    const total = ev.target.closest?.(".swse-chat-card .total");
    if (!total) return;
    // Inner action / reaction buttons must not bubble up
    if (ev.target.closest(".btn, .reaction-btn, .rc-btn")) return;
    ev.preventDefault();
    ChatCardToggle._toggle(total.closest(".swse-chat-card"), total);
  }

  static _onKey(ev) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const total = ev.target.closest?.(".swse-chat-card .total");
    if (!total) return;
    ev.preventDefault();
    ChatCardToggle._toggle(total.closest(".swse-chat-card"), total);
  }

  static async _toggle(card, total) {
    if (!card) return;
    const isExp = card.getAttribute("data-expanded") === "true";
    const next = !isExp;
    card.setAttribute("data-expanded", String(next));
    total?.setAttribute("aria-expanded", String(next));

    // Persist on the message so reloads and other clients stay in sync.
    // The chat-card lives inside .chat-message[data-message-id]; look up
    // the ChatMessage and persist a flag. Only the user with permission
    // to update it (typically the message author or GM) writes the flag;
    // other users still see the visual toggle immediately.
    const msgEl = card.closest("[data-message-id]");
    const id = msgEl?.dataset?.messageId;
    if (!id) return;
    const msg = game.messages?.get?.(id);
    if (!msg) return;
    try {
      if (msg.canUserModify?.(game.user, "update")) {
        await msg.setFlag(FLAG_SCOPE, FLAG_KEY, next);
      }
    } catch (err) {
      console.warn("[SWSE] ChatCardToggle: failed to persist expanded flag", err);
    }
  }

  /**
   * Move .total .d20 into .parts as the first chip so the dice result
   * sits with the rest of the math. The .total in the template
   * intentionally does NOT contain a .d20 — but the existing
   * holo-roll.hbs may still emit one for compatibility. This normaliser
   * handles both shapes.
   */
  static _normalizeRollCard(card) {
    const d20 = card.querySelector(".total .d20");
    const parts = card.querySelector(".breakdown .parts");
    if (!d20 || !parts) return;

    const valueEl = d20.querySelector("b");
    const value = valueEl ? valueEl.textContent.trim() : d20.textContent.trim();
    const isNat20 = d20.classList.contains("nat-20");
    const isNat1  = d20.classList.contains("nat-1");

    const part = document.createElement("span");
    part.className = "part part--d20"
      + (isNat20 ? " part--nat20" : "")
      + (isNat1  ? " part--nat1"  : "");
    part.innerHTML = `d20 → <b>${value}</b>`
      + (isNat20 ? ' <span style="color:var(--swse-success);font-weight:700">NAT 20</span>' : "")
      + (isNat1  ? ' <span style="color:var(--swse-danger);font-weight:700">NAT 1</span>'  : "");

    parts.insertBefore(part, parts.firstChild);
    d20.remove();
  }
}

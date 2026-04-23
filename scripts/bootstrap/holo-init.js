/**
 * SWSE Holo UI Initialization
 *
 * Boots holo roll rendering system.
 * Single pipeline: SWSEChat.postRoll() → holo-roll.hbs → holo CSS
 *
 * Governance:
 * - No DOM injection
 * - No sidebar mutation
 * - No CSS @layer declarations
 * - No containment changes
 * - Single roll rendering path (no dual pipelines)
 */

/**
 * Hook: Register ChatMessage flag scope (Foundry v13+)
 * Declares 'swse' as a valid flag scope for ChatMessage documents
 * Note: FlagRegistry now handles this during init
 */
Hooks.once('init', () => {
  CONFIG.ChatMessage = CONFIG.ChatMessage || {};
  CONFIG.ChatMessage.flags = CONFIG.ChatMessage.flags || {};
  CONFIG.ChatMessage.flags.swse = {};
});

/**
 * Initialize holo UI on system ready
 */
Hooks.once('ready', () => {
  // Phase A: Foundation boot message
  console.log('%c🔮 SWSE Holo UI | Phase A Foundation Ready', 'color: cyan; font-size: 14px; font-weight: bold;');
  console.log('%c   - Single roll pipeline: postRoll() → holo-roll.hbs', 'color: cyan; font-size: 12px;');
  console.log('%c   - All rolls render with holo template', 'color: cyan; font-size: 12px;');
  console.log('%c   - No animations or effects yet (intentional)', 'color: #888; font-size: 11px;');

  // Register global holo API
  globalThis.SWSE = globalThis.SWSE || {};
  globalThis.SWSE.HoloUI = {
    version: '1.0.0',
    phase: 'A-Foundation',
    features: {
      rollEngine: true,
      holoTemplate: true,
      animations: false,
      effects: false,
      singlePipeline: true
    }
  };
});

/**
 * Hook: Verify holo roll rendering
 * Observes chat messages to confirm holo template is being used
 */
Hooks.on('createChatMessage', (message) => {
  // Check for holo flag set by postRoll()
  // Safe access: use property path instead of getFlag
  const isHolo = message.flags?.swse?.holo ?? false;
  if (message.isRoll && isHolo === true) {
    // Holo rendering verified
  }
});

/**
 * Hook: Render chat message (Foundry v13+)
 * Migrated from deprecated renderChatMessage to renderChatMessageHTML
 * Wire reaction button clicks to ReactionEngine
 */
Hooks.on('renderChatMessageHTML', (message, html, data) => {
  // Only handle holo rolls
  // Safe access: use property path instead of getFlag
  const isHolo = message.flags?.swse?.holo ?? false;
  if (!isHolo) {
    return;
  }

  // Find all reaction buttons
  const reactionBtns = html.querySelectorAll('[data-reaction]');
  if (reactionBtns.length === 0) {
    return;
  }

  // Attach click handlers to reaction buttons
  reactionBtns.forEach(btn => {
    btn.addEventListener('click', async (event) => {
      event.preventDefault();

      const reactionKey = btn.getAttribute('data-reaction');
      if (!reactionKey) {
        return;
      }

      try {
        // Import ReactionEngine on demand
        const { ReactionEngine } = await import(
          '/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js'
        );

        // Phase 1: Log resolution to console
        // No actual effects yet - skeleton only
        const result = await ReactionEngine.resolveReaction(reactionKey, {
          messageId: message.id,
          trigger: 'ON_ATTACK_DECLARED'
        });

        console.log(`🔄 Reaction resolved: ${reactionKey}`, result);
      } catch (err) {
        console.error(`❌ Reaction handler error for "${reactionKey}":`, err);
      }
    });
  });
});

/* ============================================================
   PHASE 6: REACTION CHAT BUTTON RESOLUTION BRIDGE
============================================================ */

Hooks.on("renderChatMessageHTML", (message, html) => {
  html[0]?.querySelectorAll?.("[data-swse-reaction-key]").forEach(button => {
    if (button.dataset.swseReactionBound === "true") return;
    button.dataset.swseReactionBound = "true";

    button.addEventListener("click", async (event) => {
      event.preventDefault();

      const reactionKey = button.dataset.swseReactionKey;
      const defenderId = button.dataset.swseDefenderId || "";
      const attackerId = button.dataset.swseAttackerId || "";
      const messageId = button.dataset.swseMessageId || message.id;
      const ownerId = button.dataset.swseReactionOwner || "";

      if (!reactionKey) return;

      const defender =
        game.actors?.get?.(defenderId) ??
        canvas.tokens?.placeables?.find?.(t => t.actor?.id === defenderId)?.actor ??
        null;

      const attacker =
        game.actors?.get?.(attackerId) ??
        canvas.tokens?.placeables?.find?.(t => t.actor?.id === attackerId)?.actor ??
        null;

      if (!defender) {
        ui?.notifications?.warn?.("Reaction could not resolve defender context.");
        return;
      }

      if (ownerId && game.user?.isGM !== true) {
        const actorOwners = Object.entries(defender?.ownership ?? {})
          .filter(([_, lvl]) => Number(lvl) >= 3)
          .map(([id]) => id);
        if (actorOwners.length && !actorOwners.includes(game.user.id) && ownerId !== game.user.id) {
          ui?.notifications?.warn?.("You do not control this reaction.");
          return;
        }
      }

      const attackContext = {
        messageId,
        reactionKey,
        attacker,
        defender,
        attackerId: attacker?.id ?? attackerId ?? null,
        defenderId: defender?.id ?? defenderId ?? null
      };

      try {
        if (typeof ReactionEngine?.resolveReaction === "function") {
          await ReactionEngine.resolveReaction({
            reactionKey,
            attacker,
            defender,
            attackContext,
            sourceMessage: message
          });
        } else {
          ui?.notifications?.warn?.("Reaction engine is not available.");
        }
      } catch (err) {
        console.error("[SWSE] Reaction button resolution failed:", err);
        ui?.notifications?.error?.(`Reaction failed: ${err.message}`);
      }
    });
  });
});

/* ============================================================
   PHASE 8/9/10: CHAT EVENT STORE + CARD PATCH LOOP
============================================================ */

if (!globalThis.SWSEChatEventBridge) {
  globalThis.SWSEChatEventBridge = {
    _store: new Map(),

    upsert(eventId, patch = {}) {
      if (!eventId) return null;
      const current = this._store.get(eventId) ?? {};
      const next = {
        ...current,
        ...patch,
        eventId
      };
      this._store.set(eventId, next);
      return next;
    },

    get(eventId) {
      return this._store.get(eventId) ?? null;
    },

    attachToMessage(messageId, eventId) {
      if (!messageId || !eventId) return;
      const current = this._store.get(eventId) ?? {};
      current.messageId = messageId;
      this._store.set(eventId, current);
    },

    async updateMessageCard(eventId, patch = {}) {
      const next = this.upsert(eventId, patch);
      if (!next?.messageId) return null;

      const message = game.messages?.get?.(next.messageId);
      if (!message) return null;

      const root = document.querySelector(`[data-message-id="${next.messageId}"]`);
      if (!root) return null;

      const card = root.querySelector("[data-swse-event-id]");
      if (!card) return null;

      if (next.eventState) {
        card.dataset.swseEventState = next.eventState;
        card.classList.remove(
          "swse-chat-card-event--standard",
          "swse-chat-card-event--pending",
          "swse-chat-card-event--success",
          "swse-chat-card-event--failure",
          "swse-chat-card-event--final"
        );
        card.classList.add(`swse-chat-card-event--${next.eventState}`);
      }

      const resolutionLabel = card.querySelector(".swse-chat-resolution-label");
      if (resolutionLabel && next.resolutionLabel) {
        resolutionLabel.textContent = next.resolutionLabel;
      }

      const resolutionSub = card.querySelector(".swse-chat-resolution-sub");
      if (resolutionSub && next.reactionLabel !== undefined) {
        resolutionSub.textContent = next.reactionLabel || "";
      }

      const provisionalNote = card.querySelector(".swse-chat-provisional-note");
      if (provisionalNote) {
        provisionalNote.style.display = next.eventState === "pending" ? "" : "none";
      }

      const finalNote = card.querySelector(".swse-chat-final-note");
      if (finalNote) {
        finalNote.style.display = next.eventState === "final" ? "" : "none";
      }

      const reactionStrip = card.querySelector(".swse-chat-reaction-strip");
      if (reactionStrip && next.eventState === "final") {
        reactionStrip.classList.add("swse-chat-reaction-strip--resolved");
        reactionStrip.querySelectorAll("button").forEach(btn => {
          btn.disabled = true;
          btn.classList.add("swse-chat-reaction-pill--resolved");
        });
      }

      if (next.reactionResultText) {
        let resultNode = card.querySelector(".swse-chat-reaction-result-inline");
        if (!resultNode) {
          resultNode = document.createElement("div");
          resultNode.className = "swse-chat-reaction-result-inline";
          const footer = card.querySelector(".swse-chat-card-footer") ?? card;
          footer.appendChild(resultNode);
        }
        resultNode.textContent = next.reactionResultText;
        resultNode.dataset.state = next.eventState ?? "final";
      }

      return next;
    }
  };
}

Hooks.on("createChatMessage", (message) => {
  const flags = message.flags?.foundryvttSwse ?? message.flags?.["foundryvtt-swse"] ?? {};
  const eventId = flags.eventId ?? flags.attackEventId ?? null;
  if (eventId) {
    globalThis.SWSEChatEventBridge?.attachToMessage?.(message.id, eventId);
  }
});

Hooks.on("renderChatMessageHTML", (message, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const eventCard = root.querySelector("[data-swse-event-id]");
  if (!eventCard) return;

  const eventId = eventCard.dataset.swseEventId;
  if (!eventId) return;

  globalThis.SWSEChatEventBridge?.attachToMessage?.(message.id, eventId);

  const existing = globalThis.SWSEChatEventBridge?.get?.(eventId);
  if (existing?.eventState) {
    eventCard.classList.add(`swse-chat-card-event--${existing.eventState}`);
  }
});

/* ============================================================
   PHASE 11: EVENT LOOP HARDENING
============================================================ */

if (globalThis.SWSEChatEventBridge && !globalThis.SWSEChatEventBridge._phase11Hardened) {
  globalThis.SWSEChatEventBridge._phase11Hardened = true;

  const originalUpsert = globalThis.SWSEChatEventBridge.upsert.bind(globalThis.SWSEChatEventBridge);
  globalThis.SWSEChatEventBridge.upsert = function (eventId, patch = {}) {
    if (!eventId) return null;
    const safePatch = {
      eventState: patch.eventState ?? patch.state ?? undefined,
      resolutionLabel: patch.resolutionLabel ?? patch.statusLabel ?? undefined,
      reactionLabel: patch.reactionLabel ?? patch.statusSubLabel ?? undefined,
      reactionResultText: patch.reactionResultText ?? patch.message ?? patch.summary ?? undefined,
      ...patch
    };
    return originalUpsert(eventId, safePatch);
  };

  const originalUpdateMessageCard = globalThis.SWSEChatEventBridge.updateMessageCard.bind(globalThis.SWSEChatEventBridge);
  globalThis.SWSEChatEventBridge.updateMessageCard = async function (eventId, patch = {}) {
    const result = await originalUpdateMessageCard(eventId, patch);
    const next = this.get(eventId);
    if (!next?.messageId) return result;

    const root = document.querySelector(`[data-message-id="${next.messageId}"]`);
    const card = root?.querySelector?.("[data-swse-event-id]");
    if (!card) return result;

    const state = next.eventState ?? "final";

    card.dataset.swseEventState = state;
    card.classList.remove(
      "swse-chat-card-event--standard",
      "swse-chat-card-event--pending",
      "swse-chat-card-event--success",
      "swse-chat-card-event--failure",
      "swse-chat-card-event--final"
    );
    card.classList.add(`swse-chat-card-event--${state}`);

    const strip = card.querySelector(".swse-chat-reaction-strip");
    if (strip) {
      if (state === "final") {
        strip.classList.add("swse-chat-reaction-strip--resolved");
      } else {
        strip.classList.remove("swse-chat-reaction-strip--resolved");
      }
    }

    let inline = card.querySelector(".swse-chat-reaction-result-inline");
    if (next.reactionResultText) {
      if (!inline) {
        inline = document.createElement("div");
        inline.className = "swse-chat-reaction-result-inline";
        const footer = card.querySelector(".swse-chat-card-footer") ?? card;
        footer.appendChild(inline);
      }
      inline.textContent = next.reactionResultText;
      inline.dataset.state = state;
    }

    return result;
  };
}


// SWSE console log export helper
if (!globalThis.SWSE) globalThis.SWSE = {};
if (!globalThis.SWSEConsoleBuffer) {
  globalThis.SWSEConsoleBuffer = [];
  const levels = ['log', 'info', 'warn', 'error', 'debug'];
  for (const level of levels) {
    const original = console[level]?.bind(console);
    if (!original || original._swseWrapped) continue;
    const wrapped = (...args) => {
      try {
        const line = args.map(arg => {
          if (typeof arg === 'string') return arg;
          try { return JSON.stringify(arg); } catch { return String(arg); }
        }).join(' ');
        globalThis.SWSEConsoleBuffer.push(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${line}`);
        if (globalThis.SWSEConsoleBuffer.length > 10000) globalThis.SWSEConsoleBuffer.shift();
      } catch (_err) {}
      return original(...args);
    };
    wrapped._swseWrapped = true;
    console[level] = wrapped;
  }
}
if (!globalThis.SWSE.consolelog) globalThis.SWSE.consolelog = {};
globalThis.SWSE.consolelog.export = function exportConsoleLog() {
  const lines = globalThis.SWSEConsoleBuffer || [];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = URL.createObjectURL(blob);
  a.download = `swse-console-${stamp}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

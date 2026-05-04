/**
 * SWSEChatEventBridge
 *
 * Shared event-card state helper for chat reaction/update cards. This is UI state
 * only. It does not roll dice, compute game math, or mutate actors.
 */

const EVENT_STATES = ['standard', 'pending', 'success', 'failure', 'final'];

function getFlagObject(message) {
  return message?.flags?.foundryvttSwse
    ?? message?.flags?.['foundryvtt-swse']
    ?? message?.flags?.swse
    ?? {};
}

function findMessageRoot(messageId) {
  if (!messageId) return null;
  return document.querySelector(`[data-message-id="${messageId}"]`);
}

export class SWSEChatEventBridge {
  static _store = new Map();

  static installGlobal() {
    globalThis.SWSEChatEventBridge = globalThis.SWSEChatEventBridge || this;
    return globalThis.SWSEChatEventBridge;
  }

  static upsert(eventId, patch = {}) {
    if (!eventId) return null;

    const safePatch = {
      eventState: patch.eventState ?? patch.state ?? undefined,
      resolutionLabel: patch.resolutionLabel ?? patch.statusLabel ?? undefined,
      reactionLabel: patch.reactionLabel ?? patch.statusSubLabel ?? undefined,
      reactionResultText: patch.reactionResultText ?? patch.message ?? patch.summary ?? undefined,
      ...patch
    };

    const current = this._store.get(eventId) ?? {};
    const next = { ...current, ...safePatch, eventId };
    this._store.set(eventId, next);
    return next;
  }

  static get(eventId) {
    return this._store.get(eventId) ?? null;
  }

  static attachToMessage(messageId, eventId) {
    if (!messageId || !eventId) return;
    const current = this._store.get(eventId) ?? {};
    this._store.set(eventId, { ...current, eventId, messageId });
  }

  static attachMessage(message) {
    const flags = getFlagObject(message);
    const eventId = flags.eventId ?? flags.attackEventId ?? null;
    if (eventId) this.attachToMessage(message.id, eventId);
  }

  static bindRenderedCard(message, root) {
    if (!message || !(root instanceof HTMLElement)) return;
    const card = root.querySelector('[data-swse-event-id]');
    const eventId = card?.dataset?.swseEventId;
    if (!eventId) return;

    this.attachToMessage(message.id, eventId);
    const existing = this.get(eventId);
    if (existing) this.applyPatchToCard(card, existing);
  }

  static applyPatchToCard(card, patch = {}) {
    if (!(card instanceof HTMLElement)) return null;

    const state = EVENT_STATES.includes(patch.eventState) ? patch.eventState : null;
    if (state) {
      card.dataset.swseEventState = state;
      for (const name of EVENT_STATES) card.classList.remove(`swse-chat-card-event--${name}`);
      card.classList.add(`swse-chat-card-event--${state}`);
    }

    const resolutionLabel = card.querySelector('.swse-chat-resolution-label');
    if (resolutionLabel && patch.resolutionLabel) resolutionLabel.textContent = patch.resolutionLabel;

    const resolutionSub = card.querySelector('.swse-chat-resolution-sub');
    if (resolutionSub && patch.reactionLabel !== undefined) resolutionSub.textContent = patch.reactionLabel || '';

    const provisionalNote = card.querySelector('.swse-chat-provisional-note');
    if (provisionalNote && state) provisionalNote.style.display = state === 'pending' ? '' : 'none';

    const finalNote = card.querySelector('.swse-chat-final-note');
    if (finalNote && state) finalNote.style.display = state === 'final' ? '' : 'none';

    const reactionStrip = card.querySelector('.swse-chat-reaction-strip');
    if (reactionStrip && state === 'final') {
      reactionStrip.classList.add('swse-chat-reaction-strip--resolved');
      reactionStrip.querySelectorAll('button').forEach(btn => {
        btn.disabled = true;
        btn.classList.add('swse-chat-reaction-pill--resolved');
      });
    }

    if (patch.reactionResultText) {
      let resultNode = card.querySelector('.swse-chat-reaction-result-inline');
      if (!resultNode) {
        resultNode = document.createElement('div');
        resultNode.className = 'swse-chat-reaction-result-inline';
        const footer = card.querySelector('.swse-chat-card-footer') ?? card;
        footer.appendChild(resultNode);
      }
      resultNode.textContent = patch.reactionResultText;
      resultNode.dataset.state = state ?? patch.eventState ?? 'final';
    }

    return card;
  }

  static async updateMessageCard(eventId, patch = {}) {
    const next = this.upsert(eventId, patch);
    if (!next?.messageId) return next;

    const root = findMessageRoot(next.messageId);
    const card = root?.querySelector?.('[data-swse-event-id]');
    if (!card) return next;

    this.applyPatchToCard(card, next);
    return next;
  }
}

SWSEChatEventBridge.installGlobal();

export default SWSEChatEventBridge;

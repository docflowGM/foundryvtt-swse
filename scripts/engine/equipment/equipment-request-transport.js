/**
 * Equipment request transport (WP3-B) — chat-message adapter, NOT INSTALLED BY THE SYSTEM.
 *
 * Player -> GM: the player creates a ChatMessage whispered to the GMs carrying the request envelope (flags.swse.equipmentRequest).
 * GM -> player: the executor whispers a reply (flags.swse.equipmentRequestReply) with the request id and outcome summary.
 *
 * The sender is taken from the message as the SERVER stored it on creation (message.author) and must equal the creation hook's userId; the
 * envelope itself never names a user. Only the creation event is handled (an edited message is never re-read), so the executor acts on the creation
 * snapshot. Whether Foundry V13 actually refuses a forged author is WP3-B Gate 1 and is NOT yet established, which is why this mechanism is absent
 * from VERIFIED_IDENTITY_MECHANISMS and why installEquipmentRequestTransport() refuses to install unless that verification exists.
 *
 * A player that gets no reply in time receives UNKNOWN_OUTCOME with the SAME request id: retrying with that id is safe (the coordinator never runs
 * a journaled request twice), and the GM can reconcile an unresolved entry.
 */
import { handleEquipmentRequest, CHAT_AUTHOR_MECHANISM, VERIFIED_IDENTITY_MECHANISMS, ENVELOPE_KIND, ROUTE_OUTCOME } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-player-request-route.js';
import { logEquipmentEvent } from '/systems/foundryvtt-swse/scripts/engine/equipment/equipment-diagnostics.js';

export const REQUEST_FLAG = 'equipmentRequest';
export const REPLY_FLAG = 'equipmentRequestReply';
export const DEFAULT_REPLY_TIMEOUT_MS = 15_000;

/** GM side: the sender of a created request message, or null when the server-stamped author and the hook user disagree. */
export function senderFromCreatedMessage(message, hookUserId) {
  const authorId = message?.author?.id ?? null;
  if (!authorId || !hookUserId || authorId !== hookUserId) return null;
  return { userId: authorId, mechanism: CHAT_AUTHOR_MECHANISM };
}

/**
 * Player side: the executor reply carried by a created message, or null. A reply is trusted only when the server-stamped author equals the hook
 * user AND that author is a GM (a player can whisper themselves a forged reply flag; it must never be taken as the executor's answer).
 * Even an authenticated reply is advisory: the caller must confirm the outcome against authoritative actor state.
 */
export function replyFromCreatedMessage(message, hookUserId, isGmUser) {
  const reply = message?.flags?.swse?.[REPLY_FLAG];
  if (!reply || typeof reply !== 'object') return null;
  const authorId = message?.author?.id ?? null;
  if (!authorId || !hookUserId || authorId !== hookUserId) return null;
  let gm = false;
  try { gm = isGmUser?.(authorId) === true; } catch { gm = false; }
  return gm ? { ...reply, authenticated: true } : null;
}

const HANDLED_MAX = 512;

/**
 * GM side: a createChatMessage handler. deps = route deps + { createMessage(data), gmUserIds() }.
 * Returns the route result (or null for messages that are not equipment requests).
 */
export function createRequestMessageHandler(deps) {
  const handled = new Set(); // bounded per-client delivery guard; durable duplicate protection is the coordinator journal
  return async (message, _options, hookUserId) => {
    const envelope = message?.flags?.swse?.[REQUEST_FLAG];
    if (!envelope || envelope.kind !== ENVELOPE_KIND) return null;
    if (handled.has(message.id)) return null; // one delivery per created message on this client
    handled.add(message.id);
    while (handled.size > HANDLED_MAX) handled.delete(handled.values().next().value);
    const sender = senderFromCreatedMessage(message, hookUserId);
    const result = await handleEquipmentRequest(envelope, sender, deps);
    // Only the executor answers. A GM client that does not hold the lease stays silent: its refusal is not the request's outcome and would race the real reply.
    if (sender && result.status !== ROUTE_OUTCOME.NOT_EXECUTOR) {
      try {
        await deps.createMessage?.({
          content: `<p>Equipment request ${String(result.requestId ?? '')}: ${result.outcome?.status ?? result.status}</p>`,
          whisper: [sender.userId],
          flags: { swse: { [REPLY_FLAG]: { requestId: result.requestId ?? null, routeStatus: result.status, status: result.outcome?.status ?? null, verified: result.outcome?.verified === true, finalized: result.outcome?.finalized === true } } },
        });
      } catch (err) {
        logEquipmentEvent('reply-failed', { requestId: result.requestId ?? null, error: err?.message ?? String(err) });
      }
    }
    return result;
  };
}

/**
 * Player side: send an envelope and wait for the matching reply.
 * deps = { createMessage(data), gmUserIds(), onReply(fn) -> unsubscribe, timeoutMs? }; onReply must feed only replyFromCreatedMessage() results.
 * Replies lacking `authenticated: true` are ignored.
 */
export async function sendEquipmentRequest(envelope, deps) {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_REPLY_TIMEOUT_MS;
  let unsubscribe = () => {};
  const reply = new Promise((resolve) => {
    unsubscribe = deps.onReply((r) => { if (r?.authenticated === true && r?.requestId === envelope.requestId) resolve(r); }) ?? (() => {});
  });
  try {
    await deps.createMessage({ content: '<p>Equipment request</p>', whisper: deps.gmUserIds(), flags: { swse: { [REQUEST_FLAG]: envelope } } });
  } catch (err) {
    unsubscribe();
    return { status: 'SEND_FAILED', requestId: envelope.requestId, message: err?.message ?? String(err) };
  }
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve({ status: 'UNKNOWN_OUTCOME', requestId: envelope.requestId, message: 'No reply from the GM executor in time; retry with the same request id or ask the GM to reconcile.' }), timeoutMs); });
  const out = await Promise.race([reply, timeout]);
  clearTimeout(timer);
  unsubscribe();
  return out;
}

/**
 * Install the GM-side listener. Refuses unless the route is explicitly enabled AND the chat-author mechanism is verified. The system never calls
 * this today (nothing imports it at startup); it exists so the transport is ready once Gate 1 evidence is reviewed.
 */
export function installEquipmentRequestTransport({ hooks = globalThis.Hooks, enabled = false, verifiedMechanisms = VERIFIED_IDENTITY_MECHANISMS, routeDeps } = {}) {
  if (enabled !== true) return { installed: false, reason: 'route-disabled' };
  if (!verifiedMechanisms.includes(CHAT_AUTHOR_MECHANISM)) return { installed: false, reason: 'identity-mechanism-unverified' };
  const handler = createRequestMessageHandler({ ...routeDeps, verifiedMechanisms, routeEnabled: () => true });
  const id = hooks.on('createChatMessage', handler);
  return { installed: true, hookId: id };
}

export default { senderFromCreatedMessage, replyFromCreatedMessage, createRequestMessageHandler, sendEquipmentRequest, installEquipmentRequestTransport, REQUEST_FLAG, REPLY_FLAG };

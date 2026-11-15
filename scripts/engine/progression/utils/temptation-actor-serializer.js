/**
 * Sith Lord Temptation local actor-mutation serialization.
 *
 * Two committed FP/DP receipts on the same client may arrive before the
 * first ActorEngine ledger update finishes. Rejecting one on a Set-based
 * "already running" guard drops a real published consequence. A per-Actor
 * promise tail waits for the prior operation, then re-reads the actor's
 * persisted state in the caller's work function.
 *
 * Scope: execution order ONLY. This is not a second gameplay state store,
 * resource engine, socket bridge, or cross-client transaction mechanism.
 */
export function createTemptationActorSerializer() {
  const tails = new Map();
  return async function serializeActor(actorId, work) {
    const id = String(actorId ?? '');
    if (!id) throw new Error('Temptation requires a stable Actor identity');
    if (typeof work !== 'function') throw new TypeError('Temptation work must be a function');

    const previous = tails.get(id) ?? Promise.resolve();
    let release;
    const finished = new Promise(resolve => { release = resolve; });
    tails.set(id, finished);

    // Previous tails always settle successfully, including when their work
    // throws. A rejected receipt must not poison later valid receipts.
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (tails.get(id) === finished) tails.delete(id);
    }
  };
}

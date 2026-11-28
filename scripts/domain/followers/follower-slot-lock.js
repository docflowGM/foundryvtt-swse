// Per-owner serialization for read-modify-write of flags.foundryvtt-swse.followerSlots (F-NPC-001).
// Several createItem / deleteItem / progression reactions each read the slots, change them and write the whole array back; without ordering,
// two reactions that interleave across an await lose one update. This is an in-process FIFO chain per owner id: it orders the reactions
// on ONE client (the originating client runs them) and does not claim any cross-client guarantee. Leaf module: no imports.
const chains = new Map();

/**
 * Run `fn` after every earlier `withFollowerSlotLock` call for the same owner has settled. `fn`'s result/rejection is returned to the caller;
 * a rejection never blocks the chain. Do NOT call this re-entrantly from inside `fn` for the same owner (it would wait on itself).
 */
export function withFollowerSlotLock(ownerId, fn) {
  const key = String(ownerId ?? '');
  const previous = chains.get(key) ?? Promise.resolve();
  const run = previous.then(() => fn());
  const tail = run.then(() => undefined, () => undefined);
  chains.set(key, tail);
  tail.then(() => { if (chains.get(key) === tail) chains.delete(key); });
  return run;
}

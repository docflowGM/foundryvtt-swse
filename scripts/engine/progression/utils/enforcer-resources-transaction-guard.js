/**
 * Serializes Enforcer Resources decisions per recipient actor on this client.
 *
 * Deferral and equipment delivery MUST share this one boundary: a second
 * overlapping GM dialog must never use a stale pending entitlement while
 * the first action awaits Store V2 / ActorEngine. This is an in-client guard,
 * not a substitute for cross-client document concurrency or transactional
 * ActorEngine recovery.
 */
const activeActorKeys = new Set();

export async function withEnforcerResourcesActorLock(actor, operation) {
  const key = String(actor?.uuid || actor?.id || '').trim();
  if (!key || typeof operation !== 'function') {
    throw new Error('Enforcer Resources requires a valid recipient actor and operation');
  }
  if (activeActorKeys.has(key)) {
    throw new Error('Enforcer Resources decision already in progress for this actor');
  }
  activeActorKeys.add(key);
  try {
    return await operation();
  } finally {
    activeActorKeys.delete(key);
  }
}

/**
 * Force Point trigger consumers.
 *
 * ActorEngine.finalizeForcePointSpend() records a durable trigger on the FIRST committed->finalized
 * transition of a Force Point receipt and, after the Force Point queue lock is released, delivers it to
 * every registered consumer. This module is deliberately import-free so ActorEngine and consumers
 * (e.g. Sith Lord Temptation) can share it without a circular dependency.
 */
const consumers = new Set();

/** @param {(event:Object)=>Promise<any>|any} consumer @returns {()=>boolean} unregister */
export function registerForcePointTriggerConsumer(consumer) {
  if (typeof consumer !== 'function') throw new Error('Force Point trigger consumer must be a function');
  consumers.add(consumer);
  return () => consumers.delete(consumer);
}

export function forcePointTriggerConsumers() { return [...consumers]; }
export function hasForcePointTriggerConsumers() { return consumers.size > 0; }

/**
 * Spend-time evidence providers (Class/Force x Force V2, Decision C).
 *
 * Eligibility for a delayed, feature-defined consequence (e.g. Sith Lord Temptation) is a fact about the moment the
 * resource was SPENT, not about whenever finalization or delivery later runs. ActorEngine therefore asks each registered
 * provider for a small, JSON-serializable snapshot while it builds the receipt, and persists that snapshot on the
 * spending actor's OWN receipt in the same write as the debit. Providers must be synchronous and read-only; a provider
 * that throws or returns nothing simply contributes no evidence (the consuming feature then fails closed).
 */
const evidenceProviders = new Map();

/** @param {string} key unique feature key @param {(actor:Object, info:{resource:string})=>Object|null} provider */
export function registerSpendEvidenceProvider(key, provider) {
  if (!key || typeof provider !== 'function') throw new Error('Spend evidence provider needs a key and a function');
  evidenceProviders.set(String(key), provider);
  return () => evidenceProviders.delete(String(key));
}

/** Returns { [key]: snapshot } with only the providers that produced a value. Always a plain, detached object. */
export function captureSpendEvidence(actor, resource) {
  const out = {};
  for (const [key, provider] of evidenceProviders) {
    try {
      const snapshot = provider(actor, { resource });
      if (snapshot !== null && snapshot !== undefined) out[key] = JSON.parse(JSON.stringify(snapshot));
    } catch (_error) { /* a failing provider contributes no evidence; the consumer fails closed */ }
  }
  return out;
}

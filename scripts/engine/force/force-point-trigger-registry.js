/**
 * Spend trigger consumers and spend-time evidence providers.
 *
 * ActorEngine.finalizeForcePointSpend() and finalizeDestinyPointSpend() record a durable trigger on the FIRST
 * committed->finalized transition of a receipt in that resource's OWN ledger and, after the queue lock is released,
 * deliver it to every consumer registered for that resource. This module is deliberately import-free so ActorEngine and
 * consumers (e.g. Sith Lord Temptation) can share it without a circular dependency.
 */
// Consumers are registered PER RESOURCE. Force Points and Destiny Points have separate ledgers and separate outboxes;
// a Force Point consumer is never invoked for a Destiny spend, and vice versa.
const consumersByResource = new Map();
const setFor = (resource) => {
  if (!['force', 'destiny'].includes(resource)) throw new Error(`Unknown spend resource: ${resource}`);
  if (!consumersByResource.has(resource)) consumersByResource.set(resource, new Set());
  return consumersByResource.get(resource);
};

/** @param {'force'|'destiny'} resource @param {(event:Object)=>Promise<any>|any} consumer @returns {()=>boolean} unregister */
export function registerSpendTriggerConsumer(resource, consumer) {
  if (typeof consumer !== 'function') throw new Error('Spend trigger consumer must be a function');
  const set = setFor(resource);
  set.add(consumer);
  return () => set.delete(consumer);
}
export const spendTriggerConsumers = (resource) => [...setFor(resource)];
export const hasSpendTriggerConsumers = (resource) => setFor(resource).size > 0;

// Force Point names kept for existing callers.
export const registerForcePointTriggerConsumer = (consumer) => registerSpendTriggerConsumer('force', consumer);
export const forcePointTriggerConsumers = () => spendTriggerConsumers('force');
export const hasForcePointTriggerConsumers = () => hasSpendTriggerConsumers('force');

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

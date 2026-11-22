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

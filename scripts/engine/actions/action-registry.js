/**
 * ActionRegistry — a lightweight, deterministic index of ActionDefinitions
 * (Part D). Deliberately NOT a persistent global singleton or a caching
 * layer in this groundwork round -- callers construct an instance,
 * register definitions into it, and query it. A future round may promote
 * a single shared instance once the Foundry init/load lifecycle this
 * would need to hook into is designed for real, rather than guessed at
 * here.
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #1 addendum
 * (groundwork only). Does not mutate actors, evaluate requirements, or
 * execute anything.
 */
import { ACTION_DOMAINS } from '/systems/foundryvtt-swse/scripts/engine/actions/action-definition.js';

export class ActionRegistry {
  #byId = new Map();

  /**
   * @param {import('./action-definition.js').ActionDefinition} definition
   * @throws if `id` is already registered with a DIFFERENT definition
   *   object, or `domain` is not a recognized ACTION_DOMAINS value --
   *   registration is deterministic, never a silent last-write-wins.
   */
  register(definition) {
    if (!definition || typeof definition !== 'object' || !definition.id) {
      throw new Error('ActionRegistry.register() requires a definition with an id');
    }
    if (!ACTION_DOMAINS.includes(definition.domain)) {
      throw new Error(`ActionRegistry.register(): unrecognized domain "${definition.domain}" for id "${definition.id}"`);
    }
    const existing = this.#byId.get(definition.id);
    if (existing && existing !== definition) {
      throw new Error(`ActionRegistry.register(): duplicate id "${definition.id}" (already registered from ${existing.source?.name ?? 'unknown source'}, now from ${definition.source?.name ?? 'unknown source'})`);
    }
    this.#byId.set(definition.id, definition);
    return definition;
  }

  /** @returns {import('./action-definition.js').ActionDefinition|undefined} */
  get(id) {
    return this.#byId.get(id);
  }

  /** @returns {import('./action-definition.js').ActionDefinition[]} */
  forDomain(domain) {
    return Array.from(this.#byId.values()).filter(d => d.domain === domain);
  }

  /** @returns {import('./action-definition.js').ActionDefinition[]} */
  all() {
    return Array.from(this.#byId.values());
  }

  size() {
    return this.#byId.size;
  }

  /** Test/reset helper -- not part of the runtime API surface. */
  clear() {
    this.#byId.clear();
  }
}

export default ActionRegistry;

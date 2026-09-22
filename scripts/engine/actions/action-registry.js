/**
 * ActionRegistry — a lightweight, deterministic index of ActionDefinitions
 * (Part D). Deliberately NOT a persistent global singleton or a caching
 * layer in this groundwork round -- callers construct an instance,
 * register definitions into it, and query it. A future round may promote
 * a single shared instance once the Foundry init/load lifecycle this
 * would need to hook into is designed for real, rather than guessed at
 * here.
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 2):
 * `ActionDefinition.id` is documented as "stable, unique within a
 * domain" -- this used to index by the bare id alone, which actually
 * requires GLOBAL uniqueness across every domain (attack:recover and
 * utility:recover could never coexist). The canonical identity is now the
 * domain-qualified composite key (`${domain}:${id}`); the public API
 * takes `(domain, id)` rather than a bare id, so this contradiction can
 * never resurface silently.
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #1 addendum
 * (groundwork only). Does not mutate actors, evaluate requirements, or
 * execute anything.
 */
import { ACTION_DOMAINS } from '/systems/foundryvtt-swse/scripts/engine/actions/action-definition.js';

function compositeKey(domain, id) {
  return `${domain}:${id}`;
}

export class ActionRegistry {
  #byKey = new Map();

  /**
   * @param {import('./action-definition.js').ActionDefinition} definition
   * @throws if `id` is missing, `domain` is not a recognized
   *   ACTION_DOMAINS value, or the domain-qualified key is already
   *   registered with a DIFFERENT definition object -- registration is
   *   deterministic, never a silent last-write-wins.
   */
  register(definition) {
    if (!definition || typeof definition !== 'object' || !definition.id) {
      throw new Error('ActionRegistry.register() requires a definition with an id');
    }
    if (!ACTION_DOMAINS.includes(definition.domain)) {
      throw new Error(`ActionRegistry.register(): unrecognized domain "${definition.domain}" for id "${definition.id}"`);
    }
    const key = compositeKey(definition.domain, definition.id);
    const existing = this.#byKey.get(key);
    if (existing && existing !== definition) {
      throw new Error(`ActionRegistry.register(): duplicate id "${definition.id}" in domain "${definition.domain}" (already registered from ${existing.source?.name ?? 'unknown source'}, now from ${definition.source?.name ?? 'unknown source'})`);
    }
    this.#byKey.set(key, definition);
    return definition;
  }

  /**
   * @param {string} domain
   * @param {string} id
   * @returns {import('./action-definition.js').ActionDefinition|undefined}
   */
  get(domain, id) {
    return this.#byKey.get(compositeKey(domain, id));
  }

  /** @returns {import('./action-definition.js').ActionDefinition[]} */
  forDomain(domain) {
    return Array.from(this.#byKey.values()).filter(d => d.domain === domain);
  }

  /** @returns {import('./action-definition.js').ActionDefinition[]} */
  all() {
    return Array.from(this.#byKey.values());
  }

  size() {
    return this.#byKey.size;
  }

  /** Test/reset helper -- not part of the runtime API surface. */
  clear() {
    this.#byKey.clear();
  }
}

export default ActionRegistry;

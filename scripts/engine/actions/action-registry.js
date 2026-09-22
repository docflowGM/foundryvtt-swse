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

/**
 * Math Integrity Freeze, Attack Bonus round 8 correction #3 (Blocker 1):
 * ActionDefinition is pure content now (no embedded source/_legacyRule --
 * see action-definition-normalizer.js), so two independently-normalized
 * definitions for the same domain:id key are safe to compare structurally.
 * Exported so ActorActionResolver can reuse the exact same equality
 * notion for its own multi-source conflict detection, rather than a
 * second, independently-drifting comparison.
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #4 (documented
 * assumption, per explicit reviewer request): `JSON.stringify` equality
 * is order-sensitive for object keys. This is safe ONLY because every
 * `ActionDefinition` this codebase produces comes from
 * `normalizeAttackOptionRule()`'s single, fixed object-literal
 * construction order (`schemaVersion, id, name, domain, ownership,
 * presentation, requirements, economy, execution, effects, tags`, with
 * `requirements.all[]`'s entries built in `buildRequirements()`'s own
 * fixed field-check order) -- two definitions for the same logical
 * action therefore always serialize identically when their CONTENT is
 * identical, regardless of which owned item produced them. This is a
 * deliberate, narrow assumption, not a general-purpose deep-equality
 * guarantee: a future normalizer (a different domain, or a hand-built
 * definition) that constructs its object literal with keys in a
 * different order, or whose array fields carry semantically-unordered
 * data, would need either matching construction order or a real
 * order-insensitive comparison -- do not assume this function generalizes
 * without re-checking that assumption first. A full generic deep-equality
 * framework is deliberately NOT built in this round; this comment is the
 * scope boundary such a change would need to revisit.
 */
export function definitionsContentEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export class ActionRegistry {
  #byKey = new Map();

  /**
   * @param {import('./action-definition.js').ActionDefinition} definition
   * @returns {import('./action-definition.js').ActionDefinition} the
   *   CANONICAL registered object for this key -- on a content-equal
   *   re-registration (round 8 correction #4, Blocker 5) this is the
   *   FIRST object ever registered under this key, not the newly-passed
   *   one, so canonical identity (`===`) is stable across repeated
   *   registration from different callers/normalization passes, not just
   *   canonical CONTENT.
   * @throws if `id` is missing, `domain` is not a recognized
   *   ACTION_DOMAINS value, or the domain-qualified key is already
   *   registered with a definition whose CONTENT differs -- registration
   *   is idempotent for a genuinely identical re-registration (the same
   *   logical action normalized twice, e.g. from two different granting
   *   items), but never a silent last-write-wins for a real conflict.
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
    if (existing) {
      if (!definitionsContentEqual(existing, definition)) {
        throw new Error(`ActionRegistry.register(): conflicting ActionDefinition content for "${key}" -- already registered with different requirements/presentation/economy content`);
      }
      // Content-equal re-registration is idempotent: the FIRST object
      // registered under this key remains canonical. Do not overwrite it
      // with the newly-passed (content-equal but distinct) object.
      return existing;
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

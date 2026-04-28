/**
 * Canonical flag helpers for SWSE documents.
 *
 * Canonical namespace: 'foundryvtt-swse'
 * Legacy namespace:    'swse'
 *
 * Read strategy: canonical first → legacy fallback.
 * Write strategy: canonical namespace only.
 *
 * Actors do NOT need these helpers — SWSEV2BaseActor already bridges the
 * 'swse' scope in getFlag/setFlag/unsetFlag. Use these helpers for Items,
 * ActiveEffects, ChatMessages, and other non-actor documents that lack that
 * built-in bridge.
 */

const CANONICAL = 'foundryvtt-swse';
const LEGACY    = 'swse';

/**
 * Read a flag from a document, checking canonical namespace first then legacy.
 *
 * @param {foundry.abstract.Document} doc
 * @param {string} key
 * @param {*} [fallback=null]
 * @returns {*}
 */
export function getSwseFlag(doc, key, fallback = null) {
  const canonical = doc.getFlag?.(CANONICAL, key);
  if (canonical !== undefined) return canonical;
  const legacy = doc.flags?.[LEGACY]?.[key];
  return legacy !== undefined ? legacy : fallback;
}

/**
 * Write a flag to the canonical namespace.
 *
 * @param {foundry.abstract.Document} doc
 * @param {string} key
 * @param {*} value
 * @returns {Promise}
 */
export function setSwseFlag(doc, key, value) {
  return doc.setFlag?.(CANONICAL, key, value);
}

/**
 * Remove a flag from the canonical namespace.
 *
 * @param {foundry.abstract.Document} doc
 * @param {string} key
 * @returns {Promise}
 */
export function unsetSwseFlag(doc, key) {
  return doc.unsetFlag?.(CANONICAL, key);
}

/**
 * Read multiple flags at once from a document.
 * Returns an object keyed by flag key, values read canonical-first.
 *
 * @param {foundry.abstract.Document} doc
 * @param {string[]} keys
 * @returns {Object}
 */
export function getSwseFlags(doc, keys) {
  return Object.fromEntries(keys.map(k => [k, getSwseFlag(doc, k)]));
}

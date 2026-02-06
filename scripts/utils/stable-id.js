/**
 * Stable ID utilities.
 *
 * Foundry compendium documents have stable `_id`s. JSON-backed content (e.g.
 * backgrounds.json, languages.json) does not. This module creates deterministic
 * 16-hex IDs so backend state can be ID-driven while the UI shows names/slugs.
 */

/**
 * Slugify a string.
 * @param {string} input
 * @returns {string}
 */
export function slugify(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Compute a deterministic 64-bit FNV-1a hash and return as 16-hex.
 *
 * @param {string} input
 * @returns {string}
 */
export function stableHexId(input) {
  const data = new TextEncoder().encode(String(input ?? ''));
  // 64-bit FNV-1a
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const b of data) {
    hash ^= BigInt(b);
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Create a stable ID for a JSON-backed record.
 *
 * @param {string} namespace - e.g. 'background', 'language'
 * @param {string} key - stable key/slug/name
 * @returns {string}
 */
export function stableJsonId(namespace, key) {
  return stableHexId(`${namespace}:${key}`);
}

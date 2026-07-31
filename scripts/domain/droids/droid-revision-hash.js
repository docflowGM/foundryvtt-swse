/**
 * Droid Revision Hash Utilities
 *
 * PHASE 4 ADDENDUM (P1-5/P1-6) — shared, pure, dependency-free primitives
 * for building deterministic state fingerprints ("revisions") used to
 * detect staleness between an inspection and a later apply call.
 * Originally written for droid-reconciliation-revision.js (P1-5) and
 * extracted here so droid-installation-drift-revision.js (P1-6) can reuse
 * the same hashing mechanism instead of duplicating it — the two modules'
 * FIELD SETS are intentionally different (they fingerprint different
 * decisions), but the underlying stable-serialize-then-hash mechanism is
 * identical and has no reason to exist twice.
 */

function sortedClone(value) {
  if (Array.isArray(value)) return value.map(sortedClone);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sortedClone(value[key]);
      return acc;
    }, {});
  }
  return value;
}

/**
 * Deterministically serialize a plain-data value: object keys are sorted
 * recursively so two logically-identical objects with differently-ordered
 * keys always stringify identically.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  return JSON.stringify(sortedClone(value ?? null));
}

// FNV-1a, 32-bit. Not cryptographic — this only needs to be deterministic
// and collision-unlikely for a single actor's own state changes, not
// resistant to deliberate forgery (actorId/permission/mode checks at each
// apply entry point are what carry the actual trust boundary).
export function fnv1aHash(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Convenience: stableStringify() + fnv1aHash() in one call — the common
 * case for building a revision fingerprint from a plain-data fields
 * object.
 *
 * @param {unknown} fields
 * @returns {string} an 8-character hex fingerprint
 */
export function hashRevisionFields(fields) {
  return fnv1aHash(stableStringify(fields));
}

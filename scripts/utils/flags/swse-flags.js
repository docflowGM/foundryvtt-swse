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
 * Install a Foundry v13+ compatibility bridge for old non-actor callsites that
 * still call document.getFlag('swse', ...). Foundry validates flag scopes before
 * reading them, so an inactive legacy scope throws before optional chaining can
 * fall back to document.flags.swse. This bridge keeps reads legacy-compatible
 * while ensuring new writes go to the canonical system namespace.
 *
 * @returns {boolean} true when installed or already installed
 */
export function installSwseFlagScopeCompatibility() {
  const DocumentClass = globalThis.foundry?.abstract?.Document;
  const proto = DocumentClass?.prototype;
  if (!proto) return false;
  if (proto.__swseFlagScopeCompatibilityInstalled === true) return true;

  const originalGetFlag = proto.getFlag;
  const originalSetFlag = proto.setFlag;
  const originalUnsetFlag = proto.unsetFlag;
  if (typeof originalGetFlag !== 'function' || typeof originalSetFlag !== 'function' || typeof originalUnsetFlag !== 'function') {
    return false;
  }

  Object.defineProperty(proto, '__swseOriginalFlagMethods', {
    value: { getFlag: originalGetFlag, setFlag: originalSetFlag, unsetFlag: originalUnsetFlag },
    configurable: false,
    enumerable: false,
    writable: false
  });

  proto.getFlag = function swseCompatibleGetFlag(scope, key) {
    if (scope === LEGACY) {
      try {
        const canonical = originalGetFlag.call(this, CANONICAL, key);
        if (canonical !== undefined) return canonical;
      } catch (_err) {
        // Fall through to raw legacy data below.
      }
      return this.flags?.[LEGACY]?.[key];
    }
    return originalGetFlag.call(this, scope, key);
  };

  proto.setFlag = function swseCompatibleSetFlag(scope, key, value) {
    return originalSetFlag.call(this, scope === LEGACY ? CANONICAL : scope, key, value);
  };

  proto.unsetFlag = function swseCompatibleUnsetFlag(scope, key) {
    return originalUnsetFlag.call(this, scope === LEGACY ? CANONICAL : scope, key);
  };

  Object.defineProperty(proto, '__swseFlagScopeCompatibilityInstalled', {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });

  return true;
}

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

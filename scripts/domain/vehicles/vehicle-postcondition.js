/**
 * Postcondition helpers for asset-mutating transactions (pure; no Foundry globals).
 *
 * A charge or a successful API return is not proof that the intended state persisted. These build the
 * `verifyAsset` hook TransactionEngine.executeAssetCustomizationTransaction accepts: after the plan is applied,
 * the value actually stored at each path must equal the value the workflow intended. Comparison is canonical
 * (key order and undefined-vs-missing do not matter), so a faithful database round trip never false-fails.
 */
export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => [k, canonicalize(value[k])]));
  }
  return value === undefined ? null : value;
}

export function canonicalEqual(a, b) {
  return JSON.stringify(canonicalize(a ?? null)) === JSON.stringify(canonicalize(b ?? null));
}

const readPath = (root, path) => path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), root);

/** verifyAsset for a plan of the shape { set: { 'a.b.c': value, ... } }. */
export function verifyStoredPaths(set) {
  const entries = Object.entries(set ?? {});
  return (asset) => {
    for (const [path, intended] of entries) {
      const key = path.replace(/\.==/g, '.').replace(/^==/, '');   // '==' = Foundry replace-key syntax
      if (!canonicalEqual(readPath(asset, key), intended)) return { ok: false, reason: `${key} was not persisted as intended` };
    }
    return { ok: true };
  };
}

/** verifyAsset for a flag written on one embedded Item: flags.<scope>.<key> must equal the intended value. */
export function verifyEmbeddedItemFlag(itemId, scope, key, intended) {
  return (asset) => {
    const items = asset?.items;
    const item = typeof items?.get === 'function' ? items.get(itemId) : Array.isArray(items) ? items.find(i => (i?.id ?? i?._id) === itemId) : null;
    if (!item) return { ok: false, reason: `embedded item ${itemId} not found after the write` };
    return canonicalEqual(item.flags?.[scope]?.[key], intended) ? { ok: true } : { ok: false, reason: `item ${itemId} flag ${scope}.${key} was not persisted as intended` };
  };
}

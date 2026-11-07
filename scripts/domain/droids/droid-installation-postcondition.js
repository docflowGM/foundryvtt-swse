/**
 * Post-commit verification of a droid installation ledger (pure; no Foundry globals).
 *
 * A wallet charge is not proof that the hardware change persisted. After the customization transaction
 * writes the asset, the ledger actually stored on the asset must equal the ledger the engine intended:
 * the same keys, and for each key the same part id and physical identity (instance / host / location /
 * installed flag). Embedded Items the plan deleted must be gone. Anything else is a failed postcondition,
 * and the transaction restores both actors (TransactionEngine's existing verified restore).
 */
const IDENTITY_FIELDS = ['id', 'instanceId', 'hostInstanceId', 'locationId', 'installed'];

const isObject = v => v && typeof v === 'object' && !Array.isArray(v);

/** @returns {{ok:boolean, reason?:string}} */
export function verifyDroidLedgerMatchesIntent(actualLedger, intendedLedger) {
  const actual = isObject(actualLedger) ? actualLedger : {};
  const intended = isObject(intendedLedger) ? intendedLedger : {};
  const missing = Object.keys(intended).filter(k => !(k in actual));
  if (missing.length) return { ok: false, reason: `installed record(s) not persisted: ${missing.join(', ')}` };
  const extra = Object.keys(actual).filter(k => !(k in intended));
  if (extra.length) return { ok: false, reason: `removed record(s) still present: ${extra.join(', ')}` };
  for (const key of Object.keys(intended)) {
    const a = actual[key], i = intended[key];
    if (isObject(i) || isObject(a)) {
      for (const field of IDENTITY_FIELDS) {
        const av = isObject(a) ? a[field] : undefined, iv = isObject(i) ? i[field] : undefined;
        if ((av ?? null) !== (iv ?? null)) return { ok: false, reason: `record ${key} differs in ${field}` };
      }
    } else if (a !== i) {
      return { ok: false, reason: `record ${key} differs` };
    }
  }
  return { ok: true };
}

/** Items the plan deleted must no longer be embedded on the asset. */
export function verifyItemsDeleted(asset, itemIds = []) {
  const still = itemIds.filter(id => {
    const items = asset?.items;
    if (typeof items?.get === 'function' && items.get(id)) return true;
    return Array.isArray(items) && items.some(it => (it?.id ?? it?._id) === id);
  });
  return still.length ? { ok: false, reason: `deleted item(s) still embedded: ${still.join(', ')}` } : { ok: true };
}

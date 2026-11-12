/**
 * Explicit provenance for deliberate overrides of editable, formula-governed values (owner decision D-2).
 * A record exists only when an authorized user (GM) edited the value through the sheet; nothing is invented for older data
 * and there is no migration. A record is honored only while the value still equals the value it documents.
 *
 *   flags.swse.overrides.<key> = { value, authority: 'gm', setBy, setByName, setAt }
 */
export const OVERRIDE_FLAG_ROOT = 'flags.swse.overrides';
export const OVERRIDE_KEYS = Object.freeze({ forcePointsMax: 'system.forcePoints.max' });

export function readOverride(actor, key) {
  const rec = actor?.flags?.swse?.overrides?.[key];
  if (!rec || typeof rec !== 'object' || rec.authority !== 'gm') return null;
  const value = Number(rec.value);
  return Number.isFinite(value) ? { ...rec, value } : null;
}

/** Update fragment to merge into the SAME ActorEngine update that writes the value (one atomic mutation). */
export function buildOverrideUpdate(key, value, user = null, now = new Date().toISOString()) {
  return {
    [`${OVERRIDE_FLAG_ROOT}.${key}`]: { value: Number(value), authority: 'gm', setBy: user?.id ?? null, setByName: user?.name ?? null, setAt: now },
  };
}

export default { OVERRIDE_FLAG_ROOT, OVERRIDE_KEYS, readOverride, buildOverrideUpdate };

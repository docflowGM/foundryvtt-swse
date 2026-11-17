/**
 * Strict subtype → adapter resolution (pure).
 *
 * EXACT `subtypeId` match or null. Never falls back to the actor adapter and never consults `handles()`
 * aliases (`standard`, `imported-statblock`, `mount`), so an unknown or mistyped subtype cannot silently
 * become an ordinary heroic actor. Used by ProgressionSubtypeAdapterRegistry.resolveAdapterStrict and by
 * Galactic Profile compilation.
 */
export function resolveAdapterStrict(adapters, subtype) {
  if (typeof subtype !== 'string' || !subtype) return null;
  return (Array.isArray(adapters) ? adapters : []).find(a => a?.subtypeId === subtype) ?? null;
}

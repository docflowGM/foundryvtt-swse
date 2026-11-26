/**
 * Published-field state classification (leaf module, V2 realignment 3N, finding F-VEH-005). Pure: no imports.
 * Moved out of vehicle-runtime-contract.js so vehicle-modification-effects.js can use it without closing the
 * installation-ledger <-> modification-effects <-> runtime-contract import cycle. vehicle-runtime-contract.js re-exports it unchanged.
 */
/** A field's published epistemic state; 0 is never treated as missing. */
export function getVehiclePublishedFieldState(value, evidence = undefined) {
  const state = typeof evidence === 'string' ? evidence :
    evidence?.status ?? evidence?.state ?? '';
  const label = String(state).toLowerCase();
  if (/conflict|ambiguous/.test(label)) return 'conflicting';
  if (/conditional/.test(label)) return 'conditional';
  if (/unknown|missing|silent|not.published/.test(label)) return 'unknown';
  if (value === undefined || value === null) return 'unknown';
  if (typeof value === 'number' && value === 0) return 'explicit-zero';
  return 'known';
}

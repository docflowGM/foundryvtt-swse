// Phase 5B -- weapon runtime errors. Canonical resolution fails closed: a canonical weapon never silently degrades to
// name/text heuristics. Callers that must not throw use reportWeaponRuntimeError() (GM-visible) and stop.

export class WeaponRuntimeError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'WeaponRuntimeError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export const ERROR_CODES = Object.freeze({
  CANONICAL_ENTRY_MISSING: 'canonical-registry-entry-missing',
  CANONICAL_ENTRY_CORRUPT: 'canonical-registry-entry-corrupt',
  UNKNOWN_PROFILE: 'unknown-profile-id',
  UNKNOWN_PAYLOAD: 'unknown-payload-id',
  UNKNOWN_CONFIGURATION: 'unknown-configuration-id',
  UNKNOWN_MODE: 'unknown-mode-id',
  PROFILE_UNAVAILABLE: 'profile-unavailable-in-configuration',
  UNSUPPORTED_DAMAGE_MODE: 'unsupported-damage-mode',
  PROFILE_NOT_EXECUTABLE: 'profile-not-executable',
  NO_EXECUTABLE_PROFILE: 'no-executable-profile',
  EXOTIC_IDENTITY_UNRESOLVED: 'exotic-identity-unresolved',
  REGISTRY_INVALID: 'registry-invalid',
  REGISTRY_UNAVAILABLE: 'registry-unavailable',
});

/** GM-visible, non-silent reporting for runtime callers that cannot propagate a throw. */
export function reportWeaponRuntimeError(error, { notify = true } = {}) {
  try { console.error(`[SWSE weapon-runtime] ${error?.code ?? 'error'}: ${error?.message ?? error}`, error?.details ?? ''); } catch (_e) { /* console unavailable */ }
  try {
    if (notify && globalThis.game?.user?.isGM && globalThis.ui?.notifications?.error) {
      globalThis.ui.notifications.error(`SWSE weapon data error (${error?.code ?? 'error'}): ${error?.message ?? error}`);
    }
  } catch (_e) { /* UI unavailable */ }
}

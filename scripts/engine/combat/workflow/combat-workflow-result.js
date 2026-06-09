/**
 * CombatWorkflowResult
 *
 * Small structured result wrapper for the Phase 1B combat workflow shim. It
 * intentionally accepts arbitrary payloads so existing authorities can keep
 * returning their current shapes while the workflow context is preserved.
 */

export class CombatWorkflowResult {
  static success(payload = null, context = null, extras = {}) {
    return {
      ok: true,
      cancelled: false,
      context,
      payload,
      ...extras
    };
  }

  static cancelled(context = null, reason = 'cancelled') {
    return {
      ok: false,
      cancelled: true,
      reason,
      context,
      payload: null
    };
  }

  static failed(context = null, reason = 'failed', error = null) {
    return {
      ok: false,
      cancelled: false,
      reason,
      error,
      context,
      payload: null
    };
  }
}

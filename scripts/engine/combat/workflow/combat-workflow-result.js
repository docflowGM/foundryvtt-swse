/** Lightweight result envelope for CombatWorkflowRegistry. */
export class CombatWorkflowResult {
  static success(payload = null, context = null, meta = {}) {
    return { ok: true, cancelled: false, payload, context, ...meta };
  }

  static cancelled(context = null, reason = 'cancelled') {
    return { ok: false, cancelled: true, reason, context, payload: null };
  }

  static failure(error = null, context = null, meta = {}) {
    return { ok: false, cancelled: false, error, reason: error?.message ?? String(error ?? 'Combat workflow failed'), context, payload: null, ...meta };
  }
}

/**
 * CombatWorkflowResult
 *
 * Lightweight result envelope used by the combat workflow registry. The goal is
 * to keep routing explicit without replacing the engines that already perform
 * rolls, action economy, damage, healing, and actor mutation.
 */
export class CombatWorkflowResult {
  static ok(payload = null, meta = {}) {
    return {
      success: true,
      cancelled: false,
      payload,
      ...meta
    };
  }

  static cancelled(reason = 'cancelled', meta = {}) {
    return {
      success: false,
      cancelled: true,
      reason,
      ...meta
    };
  }

  static failed(reason = 'failed', meta = {}) {
    return {
      success: false,
      cancelled: false,
      reason,
      ...meta
    };
  }
}

export default CombatWorkflowResult;

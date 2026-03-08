/**
 * Retry Rule
 *
 * SWSE Rule: Some skills cannot be retried on failure.
 *
 * Examples:
 * - Piloting check failed? Cannot retry until conditions change
 * - Initiative? No retry allowed
 * - Some KS checks? No retries on same DC
 *
 * Retry tracking via injected registry (read-only from enforcement).
 * Registry queries: has this actor already attempted this skill recently?
 */

export function retryRule({ actor, skillKey, context, registry }, result) {
  // Only enforce if this is explicitly a retry attempt
  if (!context.retryAttempt) {
    result.diagnostics.rulesTriggered.push("retryRule");
    return result;
  }

  // Query registry: are retries allowed for this skill?
  const canRetry = registry.canRetry(actor.id, skillKey, context);

  if (!canRetry) {
    result.allowed = false;
    result.reason = "Cannot retry this skill in the current situation";
    result.diagnostics.blockedBy = "RetryRestriction";
    result.diagnostics.rulesTriggered.push("retryRule");
    return result;
  }

  result.diagnostics.rulesTriggered.push("retryRule");
  return result;
}

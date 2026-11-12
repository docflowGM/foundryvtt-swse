/**
 * Reconciliation resolvers (Phase 6): a CONTROLLED registry of repair actions.
 *
 * Rules:
 *  - Only existing V2 authorities mutate: derived BAB/defenses are repaired by invoking the canonical
 *    recalculation (ActorEngine.recalcAll) - a derived display field is never overwritten. Max HP has NO
 *    resolver: recomputeHP uses a different formula from the reconciliation HP audit, so a one-click
 *    correction could replace a valid maximum with another formula's result. Missing feat / talent / ability choices OPEN the existing progression step in
 *    reconcile mode (no level increment, no chargen restart, no mutation by this module).
 *  - Idempotent: the finding is re-derived from a FRESH report before acting; if it no longer exists
 *    nothing happens (so a second click cannot award twice, add an increase twice, or recompute twice),
 *    and a per-finding in-flight guard absorbs rapid double clicks.
 *  - The outcome is verified: after a repair the report is recomputed and the result states whether the
 *    discrepancy is actually gone. A repair that did not change the finding says so; it never claims
 *    success and never forces a value.
 *  - No guesses: there is no resolver for conflicts or unverifiable data. Those stay informational.
 */

const inFlight = new Set();

/**
 * @param {object} args
 * @param {Actor} args.actor
 * @param {string} args.findingId
 * @param {object} args.deps injected authorities:
 *   findFindings(actor) -> finding[]      fresh findings (all, including ignored)
 *   recalcAll(actor)                      ActorEngine.recalcAll
 *   grantHouseRule(actor, settingKey)     HouseRuleFeatGrants.grantMissing
 *   openStep(dataset)                     opens the existing reconcile-mode progression step
 *   confirm(message) -> Promise<boolean>  confirmation dialog
 * @returns {Promise<{status:string, message:string}>}
 */
export async function resolveFinding({ actor, findingId, deps }) {
  const key = `${actor?.id}:${findingId}`;
  if (inFlight.has(key)) return { status: 'busy', message: 'This repair is already running.' };
  inFlight.add(key);
  try {
    const before = deps.findFindings(actor).find(f => f.id === findingId);
    if (!before) return { status: 'already-resolved', message: 'This item no longer needs attention.' };
    const resolve = before.resolve || { kind: 'none' };

    switch (resolve.kind) {
      case 'open-step': {
        // Opens the existing focused selection step. Nothing is mutated here; the progression finalizer's
        // own session markers keep the eventual commit idempotent.
        await deps.openStep(resolve.dataset || {});
        return { status: 'opened-step', message: 'Opened the matching selection.' };
      }
      case 'recalc': {
        await deps.recalcAll(actor);
        return verify(actor, before, deps, 'Recalculated from your class levels.', 'Recalculation did not change this value. It is derived from your class levels, so review those.');
      }
      case 'grant-house-rule': {
        // The canonical grant service (HouseRuleFeatGrants.grantMissing) is silent, idempotent (skips an owned item),
        // creates through ActorEngine with house-rule provenance, and never consumes an ordinary selection.
        await deps.grantHouseRule(actor, resolve.dataset?.settingKey);
        return verify(actor, before, deps, 'The house-rule grant was added.', 'The grant could not be added. Check that the rule is still enabled.');
      }
      default:
        return { status: 'unsupported', message: 'There is no safe automatic repair for this item.' };
    }
  } finally {
    inFlight.delete(key);
  }
}

// Verification is by SUBJECT (the underlying statistic / slot), not by id: a repair that changes the value
// changes the id of a derived discrepancy, and a still-wrong-but-different value must not read as "resolved".
function verify(actor, before, deps, okMessage, stillMessage) {
  const after = deps.findFindings(actor).find(f => f.subject === before.subject);
  return after
    ? { status: 'unchanged', message: stillMessage }
    : { status: 'resolved', message: okMessage };
}

export default { resolveFinding };

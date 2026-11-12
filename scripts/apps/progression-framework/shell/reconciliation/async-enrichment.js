/**
 * Asynchronous reconciliation enrichment (owner decision D-3).
 *
 * The synchronous reconciliation report stays the immediate, stable, fail-safe result. This coordinator adds results from
 * asynchronous domain adapters ONLY when the authoritative derived calculation has completed for the current actor state,
 * using the existing derived-generation lifecycle (applied-signature stamp + the `swseDerivedApplied` event) as the
 * completion signal. There are no timers and no duplicate calculator invocations: adapters read the completed snapshot.
 *
 *  - A complete revision (actor stamp, house-rule signature, derived source signature) is captured per request.
 *  - A result is discarded if that revision changed while evaluating, and is re-checked at READ time, so an outdated finding
 *    is never merged into a report or shown as current. Results are never written into the synchronous memo.
 *  - Nothing here mutates the actor.
 */
import { getFeatTalentRulesSignature } from '/systems/foundryvtt-swse/scripts/houserules/house-rule-grant-table.js';
import { derivedLifecycle } from './derived-lifecycle.js';
import { ASYNC_DOMAIN_ADAPTERS, runAsyncDomainAdapters, applyDomainAdapterRows, DOMAIN_STATUS } from './domain-adapters.js';

export function captureRevision(actor) {
  let rules = '';
  try { rules = getFeatTalentRulesSignature(); } catch (_err) { rules = 'rules?'; }
  return {
    actorId: actor?.id ?? actor?.uuid ?? null,
    modified: actor?._stats?.modifiedTime ?? null,
    rules,
    derivedSource: derivedLifecycle(actor).expected,
  };
}

export function revisionsMatch(a, b) {
  return !!a && !!b && a.actorId === b.actorId && a.modified === b.modified && a.rules === b.rules && a.derivedSource === b.derivedSource;
}

function refreshOpenSheets(actor) {
  try {
    for (const app of globalThis.foundry?.applications?.instances?.values?.() ?? []) {
      if (app?.document?.id !== actor?.id) continue;
      if (typeof app.requestSurfaceRender === 'function') {
        app.requestSurfaceRender({ reason: 'reconciliation-async', surfaceId: app._shellSurface ?? app.shellSurface ?? 'sheet', preserveUi: true });
      } else if (typeof app.render === 'function') {
        app.render({ force: false });
      }
    }
  } catch (_err) { /* best effort; the next render reads the settled result */ }
}

const hasAttention = (verdicts) => verdicts.some(v => v.status === DOMAIN_STATUS.CONFIRMED_DISCREPANCY);

export const AsyncReconciliationEnrichment = {
  _states: new Map(),

  /** Idempotent per revision. Never blocks, never throws. */
  ensureRequested(actor, { adapters = ASYNC_DOMAIN_ADAPTERS, refresh = refreshOpenSheets } = {}) {
    try {
      const id = actor?.id;
      if (!id) return 'skipped';
      const rev = captureRevision(actor);
      const prior = this._states.get(id);
      if (prior && revisionsMatch(prior.rev, rev)) return prior.status;
      const state = { rev, status: 'waiting', result: null, adapters, refresh, actor, wasPending: derivedLifecycle(actor).state !== 'current' };
      this._states.set(id, state);
      if (!state.wasPending) void this._run(state);
      return state.status;
    } catch (_err) {
      return 'skipped';
    }
  },

  /** Completion event from the derived lifecycle. */
  onDerivedApplied(actor) {
    const state = this._states.get(actor?.id);
    if (!state || state.status !== 'waiting') return;
    if (derivedLifecycle(actor).state === 'current') void this._run(state);
  },

  async _run(state) {
    if (state.status !== 'waiting') return 'ignored';
    state.status = 'evaluating';
    const verdicts = await runAsyncDomainAdapters(state.actor, state.adapters);
    // Discard when superseded or when the source changed while evaluating.
    if (this._states.get(state.rev.actorId) !== state || !revisionsMatch(state.rev, captureRevision(state.actor))) {
      if (this._states.get(state.rev.actorId) === state) this._states.delete(state.rev.actorId);
      return 'discarded';
    }
    state.status = 'settled';
    state.result = { verdicts, revision: state.rev };
    if (state.wasPending || hasAttention(verdicts)) state.refresh(state.actor);
    return 'settled';
  },

  /** The settled result, only if it still describes the CURRENT actor state. */
  getApplicable(actor) {
    const state = this._states.get(actor?.id);
    if (!state || state.status !== 'settled') return null;
    if (!revisionsMatch(state.rev, captureRevision(actor))) { this._states.delete(actor.id); return null; }
    return state.result;
  },

  /** Merge an applicable result into a (cloned) synchronous report. The memoized report is never touched. */
  mergeApplicable(actor, report) {
    const result = this.getApplicable(actor);
    if (!result || !report?.derivedStats) return report;
    const derivedStats = applyDomainAdapterRows(report.derivedStats, result.verdicts);
    if (derivedStats === report.derivedStats) return report;
    return { ...report, derivedStats, slots: report.slots ? { ...report.slots, derivedStats } : report.slots };
  },

  reset() { this._states.clear(); },
};

let registered = false;
export function registerAsyncEnrichmentHooks() {
  if (registered || !globalThis.Hooks?.on) return false;
  registered = true;
  globalThis.Hooks.on('swseDerivedApplied', (actor) => AsyncReconciliationEnrichment.onDerivedApplied(actor));
  return true;
}
registerAsyncEnrichmentHooks();

export default AsyncReconciliationEnrichment;

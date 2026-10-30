/**
 * Phase 4E P2: the published installation attempt procedure as a pure state machine.
 *
 * Starships of the Galaxy, "Installation Checks" (printed p. 40): proper installation needs a Mechanics
 * check at the end of the installation time, DC 20 +1 per emplacement point. Failing by less than 10 is a
 * partial failure: spend half as much time and money to try again, with a +5 bonus on the next check.
 * Failing by 10 or more is a total failure: all the time and money spent is wasted and the work starts over
 * from the beginning. A system is added to the vehicle only when a check succeeds.
 *
 * The job never touches an Actor; the Shipyard service charges each attempt and writes the ledger entry
 * only on SUCCESS. The Mechanics bonus is the caller's input (the roll is made at the table or by the
 * installer's skill), never assumed here. No Foundry globals: Node-testable.
 */
import { installationCheckOutcome } from './vehicle-modification-rules.js';

const finite = v => typeof v === 'number' && Number.isFinite(v);

export const JOB_STATUS = Object.freeze({
  AWAITING_CHECK: 'AWAITING_CHECK', PARTIAL_FAILURE: 'PARTIAL_FAILURE', COMPLETE: 'COMPLETE', TOTAL_FAILURE: 'TOTAL_FAILURE'
});

/** Start a job from an installation quote (quoteInstallation result). The first attempt costs the full quote. */
export function startInstallationJob({ jobId, quote }) {
  if (!jobId || !quote?.ok) return { ok: false, reasons: ['JOB_INPUT_INVALID'] };
  return {
    ok: true, reasons: [],
    job: {
      jobId, status: JOB_STATUS.AWAITING_CHECK, dc: quote.mechanicsDC, fullCredits: quote.credits, fullDays: quote.days,
      attempts: [{ n: 1, credits: quote.credits, days: quote.days, bonus: 0, result: null }],
      creditsSpent: quote.credits, daysSpent: quote.days
    }
  };
}

/** Record the Mechanics check total for the current attempt (bonus already included by the roller). */
export function recordInstallationCheck(job, { total }) {
  if (job?.status !== JOB_STATUS.AWAITING_CHECK) return { ok: false, reasons: ['JOB_NOT_AWAITING_CHECK'] };
  if (!finite(total)) return { ok: false, reasons: ['CHECK_TOTAL_INVALID'] };
  const attempt = job.attempts.at(-1);
  const outcome = installationCheckOutcome({ dc: job.dc, total });
  const closed = { ...attempt, result: outcome.outcome, total };
  const attempts = [...job.attempts.slice(0, -1), closed];
  const base = { ...job, attempts };
  if (outcome.outcome === 'SUCCESS') return { ok: true, outcome: 'SUCCESS', job: { ...base, status: JOB_STATUS.COMPLETE }, install: true };
  if (outcome.outcome === 'TOTAL_FAILURE')
    return { ok: true, outcome: 'TOTAL_FAILURE', job: { ...base, status: JOB_STATUS.TOTAL_FAILURE }, install: false, wasted: { credits: job.creditsSpent, days: job.daysSpent } };
  return { ok: true, outcome: 'PARTIAL_FAILURE', job: { ...base, status: JOB_STATUS.PARTIAL_FAILURE }, install: false, retry: outcome.retry };
}

/** Begin the retry after a partial failure: half the time and money, +5 on the next Mechanics check. */
export function beginInstallationRetry(job) {
  if (job?.status !== JOB_STATUS.PARTIAL_FAILURE) return { ok: false, reasons: ['JOB_NOT_IN_PARTIAL_FAILURE'] };
  // "half as much time and money" (of the original quote), every retry
  const credits = Math.ceil(job.fullCredits / 2), days = job.fullDays / 2;
  const next = { n: job.attempts.length + 1, credits, days, bonus: 5, result: null };
  return { ok: true, reasons: [], job: { ...job, status: JOB_STATUS.AWAITING_CHECK, attempts: [...job.attempts, next],
    creditsSpent: job.creditsSpent + credits, daysSpent: job.daysSpent + days }, charge: credits, mechanicsBonus: 5 };
}

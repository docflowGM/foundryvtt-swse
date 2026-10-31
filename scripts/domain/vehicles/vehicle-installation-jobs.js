/**
 * Persistent installation jobs (Starships of the Galaxy, pp. 38-40) for source-backed vehicles.
 *
 * A job is NOT installed equipment. It lives in its own sealed store (flags.swse.vehicleInstallationJobs)
 * and only a successful check - or an explicit, recorded GM adjudication - appends the certified entry to
 * the installation ledger. While a job is pending its EP is RESERVED (reservedEpFromJobs), which the planner
 * subtracts from the unused EP so a conflicting installation cannot consume it; it is not counted as
 * installed EP and grants no benefit.
 *
 * Money follows the published procedure, not the outcome: every attempt is charged when it begins and a
 * failed Mechanics check is a legitimate game result, not a transaction error. Transaction rollback is only
 * for failed database operations.
 *
 * Pure planning: callers supply ids, time, funds. No Foundry globals.
 */
import { digestUniversalVehicleSource } from './vehicle-source-digest.js';
import { planVehicleInstallation, sealLedgerEntry, readCertifiedInstallations, VEHICLE_INSTALLATION_FLAG, VEHICLE_INSTALLATION_JOBS_FLAG } from './vehicle-installation-ledger.js';
import { startInstallationJob, recordInstallationCheck, beginInstallationRetry, JOB_STATUS } from './vehicle-installation-job.js';

export { VEHICLE_INSTALLATION_JOBS_FLAG };
export const VEHICLE_INSTALLATION_JOBS_FLAG_PATH = `flags.swse.${VEHICLE_INSTALLATION_JOBS_FLAG}`;
export const JOB_SCHEMA = 'swse.vehicle.installation-job.v1';
export const ACTIVE_JOB_STATUSES = Object.freeze([JOB_STATUS.AWAITING_CHECK, JOB_STATUS.PARTIAL_FAILURE]);

const finite = v => typeof v === 'number' && Number.isFinite(v);
const nonEmpty = v => typeof v === 'string' && v.trim() !== '';
const deny = (...reasons) => ({ ok: false, reasons });
const isActive = j => ACTIVE_JOB_STATUSES.includes(j?.status);

export function sealJob(job) {
  const { entryDigest: _ignored, ...body } = job;
  return { ...body, entryDigest: digestUniversalVehicleSource(body) };
}

export function isValidJob(job, sourceEntryKey) {
  if (!job || typeof job !== 'object' || job.schema !== JOB_SCHEMA) return false;
  const { entryDigest, ...body } = job;
  return nonEmpty(job.jobId) && nonEmpty(job.catalogId) && job.sourceEntryKey === sourceEntryKey &&
    Object.values(JOB_STATUS).includes(job.status) && finite(job.epCost) && job.epCost >= 0 &&
    Array.isArray(job.attempts) && job.attempts.length > 0 && !!job.plannedEntry &&
    typeof entryDigest === 'string' && digestUniversalVehicleSource(body) === entryDigest;
}

export function readJobs(flags, sourceEntryKey) {
  const raw = Array.isArray(flags?.swse?.[VEHICLE_INSTALLATION_JOBS_FLAG]) ? flags.swse[VEHICLE_INSTALLATION_JOBS_FLAG] : [];
  const jobs = raw.filter(j => isValidJob(j, sourceEntryKey));
  return { jobs, rejected: raw.length - jobs.length, raw };
}

/** EP held by pending jobs; separate from installed EP and from the purchase quote. */
export function reservedEpFromJobs(jobs) {
  return (jobs ?? []).filter(isActive).reduce((n, j) => n + j.epCost, 0);
}

/** Player-facing progress for a job (remaining work time, DC, money paid, retry availability). */
export function describeJob(job) {
  const attempt = job.attempts.at(-1);
  const logged = finite(attempt.daysLogged) ? attempt.daysLogged : 0;
  const remainingDays = Math.max(0, attempt.days - logged);
  const retryCredits = Math.ceil(job.fullCredits / 2), retryDays = job.fullDays / 2;
  return {
    jobId: job.jobId, name: job.name, status: job.status, active: isActive(job),
    dc: job.dc, attemptNumber: job.attempts.length, mechanicsBonus: attempt.bonus ?? 0,
    daysRequired: attempt.days, daysLogged: logged, remainingDays, timeComplete: remainingDays === 0,
    creditsPaid: job.creditsSpent, daysSpent: job.daysSpent, epReserved: isActive(job) ? job.epCost : 0,
    canRecordCheck: job.status === JOB_STATUS.AWAITING_CHECK,
    canRetry: job.status === JOB_STATUS.PARTIAL_FAILURE, retryCredits, retryDays, retryBonus: 5,
    canRestart: job.status === JOB_STATUS.TOTAL_FAILURE,
    wasted: job.status === JOB_STATUS.TOTAL_FAILURE ? { credits: job.wasted?.credits ?? job.creditsSpent, days: job.wasted?.days ?? job.daysSpent } : null,
    completion: job.completion ?? null
  };
}

function storeProblem(flags, key) {
  const { rejected: ledgerRejected } = (() => { const e = readCertifiedInstallations(flags, key); return { rejected: e.rejected }; })();
  const { rejected } = readJobs(flags, key);
  return rejected || ledgerRejected ? 'STORE_CONTAINS_UNVERIFIED_ENTRIES' : null;
}

const replaceJob = (raw, job) => raw.map(j => (j?.jobId === job.jobId ? job : j));

/**
 * Begin a job: validates exactly like a direct installation (certification, EP, cost, mount), but reserves
 * the EP and charges only the first attempt. Nothing is added to the installation ledger.
 */
export function planJobStart({ record, flags, catalogEntry, jobId, installId, ownerActorId, availableCredits, createdAt, rules, mount = null, nonstandard, starshipDesigner = false, workers = null }) {
  const key = record?.identity?.sourceEntryKey;
  if (!nonEmpty(jobId)) return deny('JOB_ID_MISSING');
  if (!nonEmpty(ownerActorId)) return deny('JOB_OWNER_MISSING');
  const problem = storeProblem(flags, key);
  if (problem) return deny(problem);
  const { jobs, raw } = readJobs(flags, key);
  if (raw.some(j => j.jobId === jobId)) return deny('DUPLICATE_JOB_ID');
  if (jobs.some(j => isActive(j) && j.catalogId === catalogEntry?.id && catalogEntry?.unique === true)) return deny('ALREADY_PENDING');
  const plan = planVehicleInstallation({ record, flags, catalogEntry, installId, availableCredits, installedAt: null, rules, mount, nonstandard, starshipDesigner, workers, reservedEp: reservedEpFromJobs(jobs) });
  if (!plan.ok) return plan;
  const q = plan.entry.quote;
  const start = startInstallationJob({ jobId, quote: { ok: true, mechanicsDC: q.mechanicsDC, credits: plan.entry.priceCredits, days: q.days } });
  if (!start.ok) return deny(...start.reasons);
  const { entryDigest: _d, ...plannedBody } = plan.entry;
  const job = sealJob({
    schema: JOB_SCHEMA, ...start.job,
    attempts: start.job.attempts.map(a => ({ ...a, daysLogged: 0 })),
    sourceEntryKey: key, catalogId: catalogEntry.id, name: catalogEntry.name, category: catalogEntry.category,
    ownerActorId, unique: catalogEntry.unique === true, epCost: plan.entry.epCost, plannedEntry: plannedBody, createdAt: createdAt ?? null, completion: null, wasted: null
  });
  return { ok: true, reasons: [], job, charge: job.creditsSpent, nextJobs: [...raw, job], nextLedger: null };
}

function findActive(flags, key, jobId) {
  const problem = storeProblem(flags, key);
  if (problem) return { error: problem };
  const { jobs, raw } = readJobs(flags, key);
  const job = jobs.find(j => j.jobId === jobId);
  if (!job) return { error: 'JOB_NOT_FOUND' };
  return { job, raw };
}

/** GM downtime adjudication: log days of work on the current attempt (the system does not simulate time). */
export function planLogWorkDays({ record, flags, jobId, days }) {
  const key = record?.identity?.sourceEntryKey;
  if (!finite(days) || days <= 0) return deny('WORK_DAYS_INVALID');
  const f = findActive(flags, key, jobId); if (f.error) return deny(f.error);
  if (f.job.status !== JOB_STATUS.AWAITING_CHECK) return deny('JOB_NOT_AWAITING_CHECK');
  const attempts = f.job.attempts.map((a, i, all) => (i === all.length - 1 ? { ...a, daysLogged: (a.daysLogged ?? 0) + days } : a));
  const job = sealJob({ ...f.job, attempts });
  return { ok: true, reasons: [], job, nextJobs: replaceJob(f.raw, job) };
}

function appendCompleted(flags, key, job, completion, installedAt) {
  const { entries } = readCertifiedInstallations(flags, key);
  const raw = Array.isArray(flags?.swse?.[VEHICLE_INSTALLATION_FLAG]) ? flags.swse[VEHICLE_INSTALLATION_FLAG] : [];
  if (raw.some(e => e?.installId === job.plannedEntry.installId)) return { error: 'DUPLICATE_INSTALL_ID' };
  if (entries.some(e => e.catalogId === job.catalogId && job.unique === true)) return { error: 'ALREADY_INSTALLED' };
  const entry = sealLedgerEntry({ ...job.plannedEntry, installedAt: installedAt ?? null, completion });
  return { entry, nextLedger: [...raw, entry] };
}

/**
 * Record the Mechanics check for the current attempt. Non-GM callers may record a check only after the
 * attempt's work time has been logged. SUCCESS finalizes the certified ledger entry; failures keep the money
 * already spent. The roll total (bonus included) is the caller's input.
 */
export function planJobCheck({ record, flags, jobId, total, gm = false, installedAt }) {
  const key = record?.identity?.sourceEntryKey;
  const f = findActive(flags, key, jobId); if (f.error) return deny(f.error);
  const d = describeJob(f.job);
  if (!d.canRecordCheck) return deny('JOB_NOT_AWAITING_CHECK');
  if (!d.timeComplete && !gm) return deny('WORK_TIME_INCOMPLETE');
  const r = recordInstallationCheck(f.job, { total });
  if (!r.ok) return deny(...r.reasons);
  let job = { ...f.job, ...r.job, attempts: r.job.attempts };
  let nextLedger = null, entry = null;
  if (r.outcome === 'SUCCESS') {
    const done = appendCompleted(flags, key, f.job, { mode: 'MECHANICS_CHECK', jobId, attempts: r.job.attempts.length, total }, installedAt);
    if (done.error) return deny(done.error);
    ({ entry, nextLedger } = done);
    job = { ...job, completion: { mode: 'MECHANICS_CHECK', total, installId: entry.installId } };
  } else if (r.outcome === 'TOTAL_FAILURE') job = { ...job, wasted: r.wasted };
  job = sealJob(job);
  return { ok: true, reasons: [], outcome: r.outcome, job, entry, nextJobs: replaceJob(f.raw, job), nextLedger, charge: 0, retry: r.retry ?? null };
}

/** After a partial failure: pay half the original time and money for another attempt (+5 on the check). */
export function planJobRetry({ record, flags, jobId, availableCredits }) {
  const key = record?.identity?.sourceEntryKey;
  const f = findActive(flags, key, jobId); if (f.error) return deny(f.error);
  const r = beginInstallationRetry(f.job);
  if (!r.ok) return deny(...r.reasons);
  if (!finite(availableCredits) || availableCredits < r.charge) return deny('INSUFFICIENT_CREDITS');
  const attempts = r.job.attempts.map((a, i, all) => (i === all.length - 1 ? { ...a, daysLogged: 0 } : a));
  const job = sealJob({ ...f.job, ...r.job, attempts });
  return { ok: true, reasons: [], job, nextJobs: replaceJob(f.raw, job), charge: r.charge, mechanicsBonus: r.mechanicsBonus };
}

const gmRecord = ({ userId, reason, at }) => ({ mode: 'GM_ADJUDICATED', userId, reason: String(reason).trim(), at: at ?? null });

/**
 * Explicit GM adjudication of an existing active job as completed outside the automated workflow. The money
 * already paid stands (no further charge); EP, ownership and certification were validated when the job
 * began. The override and its reason are recorded on both the job and the ledger entry.
 */
export function planGmCompleteJob({ record, flags, jobId, userId, reason, installedAt }) {
  const key = record?.identity?.sourceEntryKey;
  if (!nonEmpty(userId)) return deny('GM_USER_REQUIRED');
  if (!nonEmpty(reason)) return deny('GM_OVERRIDE_REASON_REQUIRED');
  const f = findActive(flags, key, jobId); if (f.error) return deny(f.error);
  if (!isActive(f.job)) return deny('JOB_NOT_ACTIVE');
  const gm = gmRecord({ userId, reason, at: installedAt });
  const done = appendCompleted(flags, key, f.job, gm, installedAt);
  if (done.error) return deny(done.error);
  const job = sealJob({ ...f.job, status: JOB_STATUS.COMPLETE, completion: { ...gm, installId: done.entry.installId } });
  return { ok: true, reasons: [], job, entry: done.entry, nextJobs: replaceJob(f.raw, job), nextLedger: done.nextLedger, charge: 0 };
}

/** GM instant installation: full validation and full first-attempt cost, completion recorded as an override. */
export function planGmInstantInstall(args) {
  const start = planJobStart(args);
  if (!start.ok) return start;
  const flags = { swse: { ...(args.flags?.swse ?? {}), [VEHICLE_INSTALLATION_JOBS_FLAG]: start.nextJobs } };
  const done = planGmCompleteJob({ record: args.record, flags, jobId: args.jobId, userId: args.userId, reason: args.reason, installedAt: args.createdAt });
  if (!done.ok) return done;
  return { ...done, charge: start.charge };
}

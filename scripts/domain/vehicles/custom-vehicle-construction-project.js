/**
 * Construction project state for a custom starship (separate from the design's approval).
 *
 *   PENDING_APPROVAL  submitted; nothing charged
 *   UNDERWAY          GM approved and the total was charged (one transaction); the sealed construction record is
 *                     fixed. For a rules-legal design the Starship Designer work remains: design time (days logged
 *                     by the GM) and a Mechanics check against the design DC (Starships of the Galaxy, Starship
 *                     Designer feat). A GM-homebrew design has no published process and completes only by GM
 *                     adjudication.
 *   CHECK_FAILED      the design check failed. The book states no consequence for a failed design check
 *                     (V-P6-06): nothing further is automated; only a recorded GM adjudication can complete it.
 *   COMPLETED         the vehicle Actor is delivered (operational) - by a successful check or a GM adjudication.
 *
 * No construction-time formula beyond the published design time is applied. Pure; no Foundry globals.
 */
import { digestUniversalVehicleSource } from './vehicle-source-digest.js';
import { verifyConstructionRecord } from './custom-vehicle-construction.js';

export const PROJECT_SCHEMA = 'swse.vehicle.construction-project.v1';
export const PROJECT_STATUS = Object.freeze({ PENDING_APPROVAL: 'PENDING_APPROVAL', UNDERWAY: 'UNDERWAY', CHECK_FAILED: 'CHECK_FAILED', COMPLETED: 'COMPLETED' });

const finite = v => typeof v === 'number' && Number.isFinite(v);
const nonEmpty = v => typeof v === 'string' && v.trim() !== '';
const deny = (...reasons) => ({ ok: false, reasons });

export function sealProject(project) {
  const { projectDigest: _ignored, ...body } = project;
  return { ...body, projectDigest: digestUniversalVehicleSource(body) };
}

export function isValidProject(project) {
  if (!project || project.schema !== PROJECT_SCHEMA || !nonEmpty(project.designId) || !Object.values(PROJECT_STATUS).includes(project.status)) return false;
  const { projectDigest, ...body } = project;
  if (typeof projectDigest !== 'string' || digestUniversalVehicleSource(body) !== projectDigest) return false;
  // once funded, the construction record must be the sealed, approved one
  if (project.status !== PROJECT_STATUS.PENDING_APPROVAL && !(verifyConstructionRecord(project.record) && project.record.approval?.status === 'APPROVED')) return false;
  return true;
}

export function readProjects(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const projects = list.filter(isValidProject);
  return { projects, rejected: list.length - projects.length, raw: list };
}

/** Pending proposal (inputs only; the service rebuilds and re-validates at approval). */
export function makePendingProject(input) {
  return sealProject({ schema: PROJECT_SCHEMA, status: PROJECT_STATUS.PENDING_APPROVAL, ...input, record: null, funding: null, work: null, completion: null });
}

/** Approval + funding: fixes the sealed record and opens the published design work (if any). */
export function fundProject(project, { record, design, transactionHint, approvedBy, at }) {
  if (project?.status !== PROJECT_STATUS.PENDING_APPROVAL) return deny('PROJECT_NOT_PENDING');
  if (!verifyConstructionRecord(record) || record.approval?.status !== 'APPROVED') return deny('CONSTRUCTION_RECORD_NOT_APPROVED');
  const rulesLegal = record.authorship?.kind === 'rules-legal';
  if (rulesLegal && !(finite(design?.days) && finite(design?.mechanicsDC))) return deny('DESIGN_WORK_UNRESOLVED');
  const work = rulesLegal ? { daysRequired: design.days, daysLogged: 0, dc: design.mechanicsDC, checks: [] } : null;
  return { ok: true, reasons: [], project: sealProject({ ...project, status: PROJECT_STATUS.UNDERWAY, record,
    funding: { credits: record.totalCredits, approvedBy, at: at ?? null, transaction: transactionHint ?? null }, work }) };
}

export function describeProject(p) {
  const w = p.work;
  return {
    designId: p.designId, name: p.name, status: p.status, authorshipKind: p.authorshipKind,
    creditsPaid: p.funding?.credits ?? 0, dc: w?.dc ?? null, daysRequired: w?.daysRequired ?? null, daysLogged: w?.daysLogged ?? null,
    remainingDays: w ? Math.max(0, w.daysRequired - w.daysLogged) : null,
    publishedProcess: !!w,
    canRecordCheck: p.status === PROJECT_STATUS.UNDERWAY && !!w && w.daysLogged >= w.daysRequired,
    needsGmAdjudication: p.status === PROJECT_STATUS.CHECK_FAILED || (p.status === PROJECT_STATUS.UNDERWAY && !w),
    lastCheck: w?.checks?.at(-1) ?? null, completion: p.completion
  };
}

export function logProjectDays(project, days) {
  if (!finite(days) || days <= 0) return deny('WORK_DAYS_INVALID');
  if (project?.status !== PROJECT_STATUS.UNDERWAY || !project.work) return deny('PROJECT_HAS_NO_DESIGN_WORK');
  return { ok: true, reasons: [], project: sealProject({ ...project, work: { ...project.work, daysLogged: project.work.daysLogged + days } }) };
}

/** Design Mechanics check: only after the design time; success completes, failure stops automation (V-P6-06). */
export function recordProjectCheck(project, { total, at }) {
  if (project?.status !== PROJECT_STATUS.UNDERWAY || !project.work) return deny('PROJECT_NOT_AWAITING_CHECK');
  if (project.work.daysLogged < project.work.daysRequired) return deny('DESIGN_TIME_INCOMPLETE');
  if (!finite(total)) return deny('CHECK_TOTAL_INVALID');
  const success = total >= project.work.dc;
  const work = { ...project.work, checks: [...project.work.checks, { total, success, at: at ?? null }] };
  const status = success ? PROJECT_STATUS.COMPLETED : PROJECT_STATUS.CHECK_FAILED;
  const completion = success ? { mode: 'MECHANICS_CHECK', total, at: at ?? null } : null;
  return { ok: true, reasons: [], success, project: sealProject({ ...project, status, work, completion }) };
}

/** Explicit, recorded GM adjudication of completion (waives remaining time, a failed check, or the homebrew process). */
export function gmCompleteProject(project, { userId, reason, at }) {
  if (!nonEmpty(userId)) return deny('GM_USER_REQUIRED');
  if (!nonEmpty(reason)) return deny('GM_OVERRIDE_REASON_REQUIRED');
  if (![PROJECT_STATUS.UNDERWAY, PROJECT_STATUS.CHECK_FAILED].includes(project?.status)) return deny('PROJECT_NOT_IN_CONSTRUCTION');
  return { ok: true, reasons: [], project: sealProject({ ...project, status: PROJECT_STATUS.COMPLETED,
    completion: { mode: 'GM_ADJUDICATED', userId, reason: reason.trim(), at: at ?? null } }) };
}

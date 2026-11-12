/**
 * Reconciliation domain adapters (17-domain overhaul, Phase 1).
 *
 * An adapter is a PURE, READ-ONLY function over an actor that asks ONE existing canonical authority a question and returns a
 * normalized verdict. It owns no rules, performs no mutation (it must not call an authority that writes - see
 * `calculateMaxForcePoints`, which sets actor flags), and never turns missing evidence into an accusation.
 *
 * Status contract: VALID | CONFIRMED_DISCREPANCY | UNVERIFIABLE | NOT_APPLICABLE | AUTHORITY_CONFLICT.
 * Only CONFIRMED_DISCREPANCY drives the player `!` (via `needsAttention`); everything else is diagnostics / silent.
 */
import { calculateMaxForcePointsForBuildPlan } from '/systems/foundryvtt-swse/scripts/data/force-points.js';
import { ClassesDB } from '/systems/foundryvtt-swse/scripts/data/classes-db.js';
import { readActorClassLevels } from './class-level-reader.js';

export const DOMAIN_STATUS = Object.freeze({
  VALID: 'VALID',
  CONFIRMED_DISCREPANCY: 'CONFIRMED_DISCREPANCY',
  UNVERIFIABLE: 'UNVERIFIABLE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  AUTHORITY_CONFLICT: 'AUTHORITY_CONFLICT',
});

function result(base) {
  return { status: DOMAIN_STATUS.UNVERIFIABLE, expected: null, actual: null, reason: '', resolve: { kind: 'none', label: '' }, ...base };
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Domain 12 - Force Point maximum. Persisted `system.forcePoints.max` vs the canonical formula via the read-only
 * build-plan variant (`calculateMaxForcePointsForBuildPlan`, the same formula the progression economy builder writes).
 * Never compares current Force Points; never applies to non-characters (the authority does not establish NPC / droid / vehicle FP).
 */
export function forcePointMaxAdapter(actor) {
  const base = { domain: 'force-points', id: 'force-points-max', label: 'Force Point maximum', authority: 'data/force-points.js calculateMaxForcePointsForBuildPlan' };
  if (actor?.type !== 'character') return result({ ...base, status: DOMAIN_STATUS.NOT_APPLICABLE, reason: 'actor-type' });

  const classRead = readActorClassLevels(actor);
  if (classRead.status !== 'ok' || !classRead.rows.length) return result({ ...base, reason: 'class-evidence-incomplete' });
  const stored = finiteOrNull(actor?.system?.level);
  if (stored !== null && stored !== classRead.totalLevel) return result({ ...base, reason: 'level-record-conflict' });

  // Every class must resolve in the same definition source the FP authority consults; otherwise a prestige base could be missed.
  for (const row of classRead.rows) {
    const def = ClassesDB.get?.(row.classId) || ClassesDB.byName?.(row.className) || null;
    if (!def) return result({ ...base, reason: 'class-definition-unavailable' });
  }

  const actual = finiteOrNull(actor?.system?.forcePoints?.max);
  if (actual === null) return result({ ...base, reason: 'persisted-max-unreadable' });

  let expected;
  try {
    expected = finiteOrNull(calculateMaxForcePointsForBuildPlan({
      actor,
      totalLevel: classRead.totalLevel,
      classLevels: classRead.rows.map(row => ({ class: row.className, classId: row.classId, level: row.level })),
    }));
  } catch (_err) {
    return result({ ...base, reason: 'authority-error' });
  }
  if (expected === null) return result({ ...base, reason: 'authority-unreadable' });

  if (expected === actual) return result({ ...base, status: DOMAIN_STATUS.VALID, expected, actual });
  return result({
    ...base,
    status: DOMAIN_STATUS.CONFIRMED_DISCREPANCY,
    expected, actual,
    reason: 'persisted-max-differs',
    issue: `Maximum Force Points is ${actual}, but your class levels and Force Point feats give ${expected}.`,
    resolve: { kind: 'set-force-point-max', label: 'Set to ' + expected, dataset: { value: expected } },
  });
}

export const DOMAIN_ADAPTERS = Object.freeze([forcePointMaxAdapter]);

/** Run every adapter; a thrown adapter is UNVERIFIABLE (diagnostic), never a character error and never a thrown report. */
export function runDomainAdapters(actor, adapters = DOMAIN_ADAPTERS) {
  const out = [];
  for (const adapter of adapters) {
    try {
      out.push(adapter(actor));
    } catch (_err) {
      out.push(result({ domain: adapter?.name || 'unknown', id: adapter?.name || 'unknown', status: DOMAIN_STATUS.UNVERIFIABLE, reason: 'adapter-error' }));
    }
  }
  return out;
}

/** Map one adapter verdict onto the existing derived-stat row shape (so findings, Ignore and the overlay need no new surface). */
export function adapterToRow(verdict) {
  if (verdict.status === DOMAIN_STATUS.NOT_APPLICABLE) return null;
  const confirmed = verdict.status === DOMAIN_STATUS.CONFIRMED_DISCREPANCY;
  return {
    id: verdict.id,
    type: verdict.domain,
    label: verdict.label,
    expected: verdict.expected,
    expectedLabel: verdict.expected === null ? 'Unknown' : String(verdict.expected),
    current: verdict.actual,
    currentLabel: verdict.actual === null ? 'Unknown' : String(verdict.actual),
    status: confirmed ? 'issue' : (verdict.status === DOMAIN_STATUS.VALID ? 'ok' : 'unverifiable'),
    statusLabel: confirmed ? verdict.issue : (verdict.status === DOMAIN_STATUS.VALID ? 'OK' : 'Cannot be verified'),
    tone: confirmed ? 'warn' : (verdict.status === DOMAIN_STATUS.VALID ? 'ok' : 'neutral'),
    needsAttention: confirmed,
    issue: confirmed ? verdict.issue : '',
    detail: confirmed ? `Canonical authority: ${verdict.authority}.` : (verdict.reason || ''),
    resolve: confirmed ? verdict.resolve : { kind: 'none', label: '' },
    domain: verdict.domain,
    authority: verdict.authority,
    targetTab: 'abilities',
    sheetAnchor: 'derived-class-stats',
  };
}

/** Append adapter rows to a derived-stats audit and recompute its rollup (same rollup rules as the HP audit). */
export function applyDomainAdapterRows(derivedStats, verdicts) {
  const extra = verdicts.map(adapterToRow).filter(Boolean);
  if (!extra.length) return derivedStats;
  const rows = [...(Array.isArray(derivedStats?.rows) ? derivedStats.rows : []), ...extra];
  const issueCount = rows.filter(item => item?.needsAttention === true).length;
  return {
    ...derivedStats,
    rows,
    domainAdapters: verdicts.map(v => ({ domain: v.domain, id: v.id, status: v.status, reason: v.reason })),
    issueCount,
    hasIssues: issueCount > 0,
    status: rows.some(item => item?.status === 'issue') ? 'needs-attention' : rows.some(item => ['warning', 'unavailable', 'unverifiable'].includes(item?.status)) ? 'review' : 'ok',
    warnings: rows.filter(item => item?.needsAttention && item?.issue).map(item => `${item.label}: ${item.issue}`),
  };
}

export default { DOMAIN_STATUS, DOMAIN_ADAPTERS, forcePointMaxAdapter, runDomainAdapters, adapterToRow, applyDomainAdapterRows };

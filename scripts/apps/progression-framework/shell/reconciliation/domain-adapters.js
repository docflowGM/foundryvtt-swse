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
import { readOverride } from './override-provenance.js';
import { derivedLifecycle } from './derived-lifecycle.js';
import { EncumbranceEngine } from '/systems/foundryvtt-swse/scripts/engine/encumbrance/EncumbranceEngine.js';

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

  // The persisted maximum differs from the formula. That alone is NOT a character error (owner decision D-2): the field is
  // player-editable and is 0 on a manually built character that never ran progression. Classify by evidence:
  const override = readOverride(actor, 'forcePointsMax');
  if (override && override.value === actual) {
    return result({ ...base, status: DOMAIN_STATUS.VALID, expected, actual, reason: 'authorized-override', provenance: 'gm-override' });
  }
  const refresh = actor?.system?.progression?.lastForcePointRefresh;
  const formulaManaged = finiteOrNull(refresh?.newMax) === actual; // value untouched since progression last wrote it
  const optional = { kind: 'set-force-point-max', label: `Set to ${expected}`, dataset: { value: expected } };
  if (formulaManaged) {
    // Proven: progression wrote this value from the formula, nobody changed it since, and the formula now disagrees.
    return result({
      ...base,
      status: DOMAIN_STATUS.CONFIRMED_DISCREPANCY,
      expected, actual,
      reason: 'formula-managed-value-stale',
      issue: `Maximum Force Points is ${actual}, but your class levels and Force Point feats now give ${expected}.`,
      resolve: optional,
    });
  }
  if (actual === 0) {
    return result({ ...base, expected, actual, reason: 'uninitialized', optional, optionalText: `Maximum Force Points has not been set. Your class levels and Force Point feats give ${expected}.` });
  }
  return result({ ...base, expected, actual, reason: 'unknown-provenance', optional, optionalText: `Maximum Force Points is ${actual}; your class levels and Force Point feats give ${expected}. It may be a deliberate adjustment, so this is not treated as an error.` });
}

/**
 * Domain 1 - species grant integrity (INFORMATIONAL ONLY). The only independent evidence available without rebuilding the
 * heuristic species ledger (async, compendium-backed, trait text classification) is the manifest the species apply step
 * writes and the grant key stamped on species-granted items. Items stamped with a DIFFERENT grant key than the recorded
 * manifest are left over from another species grant. This never produces a confirmed discrepancy: a missing manifest is the
 * normal state of a manually built character, and racial adjustments are player-editable.
 */
export function speciesGrantIntegrityAdapter(actor) {
  const base = { domain: 'species', id: 'species-grant-integrity', label: 'Species grants', authority: 'species/species-grant-reconciliation.js manifest' };
  if (actor?.type !== 'character') return result({ ...base, status: DOMAIN_STATUS.NOT_APPLICABLE, reason: 'actor-type' });
  const manifest = actor?.flags?.swse?.speciesGrantManifest;
  if (!manifest || typeof manifest !== 'object' || !manifest.grantKey) return result({ ...base, reason: 'no-species-manifest' });
  const stale = Array.from(actor?.items ?? []).filter(item => {
    const swse = item?.flags?.swse;
    return swse?.speciesGranted === true && swse?.speciesGrantKey && swse.speciesGrantKey !== manifest.grantKey;
  });
  if (!stale.length) return result({ ...base, status: DOMAIN_STATUS.VALID });
  const names = stale.slice(0, 3).map(i => i.name).filter(Boolean).join(', ');
  return result({
    ...base, reason: 'stale-species-items',
    noteText: `${stale.length} item${stale.length === 1 ? '' : 's'} (${names}${stale.length > 3 ? ', …' : ''}) came from a different species grant than the one recorded on this character. Nothing was changed.`,
  });
}

/**
 * Domain 13 - carried-weight evidence (INFORMATIONAL ONLY). The load category is prepared by the encumbrance authority, so it is not
 * re-derived here. What reconciliation can honestly say is whether the evidence the load rests on is complete: the canonical
 * `EncumbranceEngine.carriedWeightReport` lists carried items without a verified recorded weight. Such items contribute 0 to the load,
 * so the load may be understated; that is reported as uncertainty, never as a load error.
 */
export function carriedWeightEvidenceAdapter(actor) {
  const base = { domain: 'encumbrance', id: 'carried-weight-evidence', label: 'Carried weight', authority: 'engine/encumbrance/EncumbranceEngine.js carriedWeightReport' };
  if (actor?.type !== 'character' && actor?.type !== 'droid') return result({ ...base, status: DOMAIN_STATUS.NOT_APPLICABLE, reason: 'actor-type' });
  const report = EncumbranceEngine.carriedWeightReport(actor);
  if (report.complete) return result({ ...base, status: DOMAIN_STATUS.VALID });
  const names = report.unverified.slice(0, 3).map(i => i.name).filter(Boolean).join(', ');
  const n = report.unverified.length;
  return result({
    ...base, reason: 'unverified-item-weight',
    noteText: `${n} carried item${n === 1 ? ' has' : 's have'} no recorded weight (${names}${n > 3 ? ', …' : ''}), so your carried load cannot be fully verified.`,
  });
}

export const DOMAIN_ADAPTERS = Object.freeze([forcePointMaxAdapter, speciesGrantIntegrityAdapter, carriedWeightEvidenceAdapter]);

/**
 * Asynchronous adapters run by async-enrichment.js ONLY after the derived lifecycle is current. They may await canonical
 * asynchronous authorities and must stay read-only. `derivedPreparationAdapter` is a DIAGNOSTIC: it reports whether the
 * authoritative calculation has been applied and can never produce a character error (D-1 / P1-F5).
 */
export async function derivedPreparationAdapter(actor) {
  const life = derivedLifecycle(actor);
  return result({
    domain: 'derived-preparation', id: 'derived-preparation', label: 'Calculated statistics', authority: 'actors/derived/derived-generation.js', diagnostic: true,
    status: life.state === 'current' ? DOMAIN_STATUS.VALID : DOMAIN_STATUS.UNVERIFIABLE,
    reason: life.state === 'current' ? 'applied' : (life.state === 'pending' ? 'calculation-pending' : 'signature-unavailable'),
  });
}
export const ASYNC_DOMAIN_ADAPTERS = Object.freeze([derivedPreparationAdapter]);

export async function runAsyncDomainAdapters(actor, adapters = ASYNC_DOMAIN_ADAPTERS) {
  const out = [];
  for (const adapter of adapters) {
    try { out.push(await adapter(actor)); } catch (_err) {
      out.push(result({ domain: adapter?.name || 'unknown', id: adapter?.name || 'unknown', reason: 'adapter-error' }));
    }
  }
  return out;
}

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
  if (verdict.status === DOMAIN_STATUS.NOT_APPLICABLE || verdict.diagnostic === true) return null;
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
    optionalAction: !confirmed && verdict.optional ? { ...verdict.optional, text: verdict.optionalText || '' } : null,
    reason: verdict.reason || '',
    noteText: !confirmed && verdict.noteText ? verdict.noteText : '',
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

export default { DOMAIN_STATUS, DOMAIN_ADAPTERS, ASYNC_DOMAIN_ADAPTERS, forcePointMaxAdapter, speciesGrantIntegrityAdapter, derivedPreparationAdapter, runDomainAdapters, runAsyncDomainAdapters, adapterToRow, applyDomainAdapterRows };

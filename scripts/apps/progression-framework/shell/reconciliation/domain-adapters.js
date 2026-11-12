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
import { quoteDroidBuild } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-build-quote.js';
import { STORE_DROID_APPROVAL_KIND } from '/systems/foundryvtt-swse/scripts/engine/store/store-droid-construction.js';
import { resolveDroidCalculationMode, DROID_CALCULATION_MODE } from '/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js';
import { FeatGrantEntitlementResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js';
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
  // `lastForcePointRefresh.newMax === stored max` is only NUMERICAL agreement with an earlier progression write: it cannot show the value was
  // never edited and restored, nor that it was meant to keep following the formula (R17-F4). So even this case is never a confirmed error;
  // it is reported distinctly, with an optional action, and the player decides.
  const refresh = actor?.system?.progression?.lastForcePointRefresh;
  const matchesLastProgressionWrite = finiteOrNull(refresh?.newMax) === actual;
  const optional = { kind: 'set-force-point-max', label: `Set to ${expected}`, dataset: { value: expected } };
  if (matchesLastProgressionWrite) {
    return result({ ...base, expected, actual, reason: 'matches-last-progression-write', optional, optionalText: `Maximum Force Points is ${actual}, the value progression last set, but your class levels and Force Point feats now give ${expected}. Nothing records whether you meant to keep it, so this is not treated as an error.` });
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

/**
 * Domain 16 - droid construction (provenance-aware). The requirements that governed a build depend on how it was made, so a
 * single validator is never applied to every finalized droid (the older `DroidValidationEngine` requires an armor component that the
 * authorized Store construction path does not).
 *
 *   NOT_APPLICABLE : stock-statblock droids (explicit calculation mode) and stock droids converted to playable (the conversion service
 *                    wrote `flags.swse.stockDroidImport` / `stockDroidConversion`). An explicit `playable-derived` mode ALONE is not
 *                    evidence of a stock import - a custom droid carries it too.
 *   UNVERIFIABLE   : no build record, a build that is not FINALIZED, or a finalized build whose governing requirements cannot be
 *                    established from its provenance (only Store-constructed droids carry a provenance marker today).
 *   Store-built    : governed by the shared construction-quote authority (`quoteDroidBuild`), the same authority the Store used to
 *                    price and approve the build. OK => VALID. INCOMPLETE (a required locomotion / processor / appendage is missing)
 *                    => CONFIRMED_DISCREPANCY, review-only. BLOCKED (unknown component identity, unresolved pricing) => UNVERIFIABLE:
 *                    catalog drift is not a character error.
 * Read-only; no resolve (components are never auto-installed or removed).
 */
export function droidConstructionAdapter(actor) {
  const base = { domain: 'droid', id: 'droid-construction', label: 'Droid construction', authority: 'domain/droids/droid-build-quote.js quoteDroidBuild' };
  if (actor?.type !== 'droid') return result({ ...base, status: DOMAIN_STATUS.NOT_APPLICABLE, reason: 'actor-type' });
  if (resolveDroidCalculationMode(actor).mode === DROID_CALCULATION_MODE.STOCK_STATBLOCK) return result({ ...base, status: DOMAIN_STATUS.NOT_APPLICABLE, reason: 'stock-statblock' });
  if (actor?.flags?.swse?.stockDroidImport || actor?.flags?.swse?.stockDroidConversion) return result({ ...base, status: DOMAIN_STATUS.NOT_APPLICABLE, reason: 'converted-stock-droid' });
  const systems = actor?.system?.droidSystems;
  if (!systems || typeof systems !== 'object') return result({ ...base, reason: 'no-build-record' });
  if (systems.stateMode !== 'FINALIZED') return result({ ...base, reason: 'build-not-finalized' });
  const storeBuilt = actor?.system?.storeAcquisition?.source === STORE_DROID_APPROVAL_KIND || !!actor?.flags?.swse?.storeDroidConstruction;
  if (!storeBuilt) return result({ ...base, reason: 'governing-requirements-not-established' });

  let quote;
  try { quote = quoteDroidBuild(actor.system, { speciesDroidBuilder: null }); } catch (_err) { return result({ ...base, reason: 'quote-authority-error' }); }
  if (quote.status === 'OK') return result({ ...base, status: DOMAIN_STATUS.VALID });
  if (quote.status === 'INCOMPLETE') {
    const missing = quote.reasons.filter(r => r.startsWith('MISSING_REQUIRED')).map(r => r.replace(/^MISSING_REQUIRED:\s*/, ''));
    return result({
      ...base, status: DOMAIN_STATUS.CONFIRMED_DISCREPANCY,
      expected: 'complete', actual: missing.join(', '), reason: 'store-build-missing-required-systems',
      issue: `This droid's finalized build is missing a required system: ${missing.join(', ')}.`,
    });
  }
  return result({ ...base, reason: 'quote-blocked' });
}

/**
 * Domain 11 - Force Training entitlement DIAGNOSTIC (informational only, RECON-006). The existing `FeatGrantEntitlementResolver` is the
 * authority for how many power selections each Force Training instance opens (`max(1, 1 + configured ability modifier)`, repeatable and
 * DYNAMIC: it follows the current modifier). It is consumed unchanged; no second formula exists here. What is NOT established is which
 * owned power came from which instance, whether a later modifier change is retroactive, and how class-granted powers overlap, so no
 * attribution is attempted and nothing is ever confirmed. The only statement made is a lower-bound one: if the actor owns FEWER Force powers in
 * total than the resolver's current Force Training selections, some of those selections are certainly unspent.
 */
const normalizedName = (item) => String(item?.name ?? '').trim().toLowerCase();
export function forceTrainingEntitlementDiagnosticAdapter(actor) {
  const base = { domain: 'force-training', id: 'force-training-entitlement', label: 'Force Training selections', authority: 'engine/progression/feats/feat-grant-entitlement-resolver.js' };
  if (actor?.type !== 'character') return result({ ...base, status: DOMAIN_STATUS.NOT_APPLICABLE, reason: 'actor-type' });
  const instances = Array.from(actor?.items ?? []).filter(item => item?.type === 'feat' && normalizedName(item) === 'force training');
  if (!instances.length) return result({ ...base, status: DOMAIN_STATUS.NOT_APPLICABLE, reason: 'no-force-training' });
  const selections = instances
    .flatMap((feat, index) => FeatGrantEntitlementResolver.resolveForFeat(actor, feat, index))
    .filter(entry => entry?.grantType === 'forcePowerSlots')
    .reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);
  const owned = Array.from(actor?.items ?? []).filter(item => item?.type === 'forcePower' || item?.type === 'force-power').length;
  if (!(selections > 0) || owned >= selections) return result({ ...base, status: DOMAIN_STATUS.VALID, expected: selections, actual: owned });
  return result({
    ...base, expected: selections, actual: owned, reason: 'possible-unspent-force-training',
    noteText: `Force Training currently provides ${selections} Force power selection${selections === 1 ? '' : 's'} (from your current ability modifier) but this character owns ${owned} Force power${owned === 1 ? '' : 's'} in total, so some may be unspent. The record does not say which power came from which source, so this is not checked further.`,
  });
}

export const DOMAIN_ADAPTERS = Object.freeze([forcePointMaxAdapter, speciesGrantIntegrityAdapter, carriedWeightEvidenceAdapter, droidConstructionAdapter, forceTrainingEntitlementDiagnosticAdapter]);

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

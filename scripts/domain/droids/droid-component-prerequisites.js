/**
 * Pure machine-readable prerequisites for published droid systems.
 *
 * This is a rejection gate, never an installation license. Numeric source
 * quotes, legal availability, host assignment and wallet ownership have
 * independent authorities. This module deliberately never interprets prose.
 *
 * No legacy actor migration: selected appendage enhancements need a genuine
 * per-instance target, not an id/name that might refer to multiple hands.
 */
export const DROID_SIZE_ORDER = Object.freeze([
  'fine', 'diminutive', 'tiny', 'small', 'medium',
  'large', 'huge', 'gargantuan', 'colossal'
]);

function fail(reason, field) {
  return { status: 'BLOCKED', blockingReason: reason, blockingField: field };
}

function namedId(entry) {
  return String(typeof entry === 'string' ? entry
    : (entry?.id ?? entry?.ruleId ?? '')).trim().toLowerCase();
}

function selectedIds(droidSystems, installedComponentIds) {
  const sys = droidSystems && typeof droidSystems === 'object'
    ? droidSystems : {};
  const ids = new Set();
  for (const entry of [
    sys.processor, sys.locomotion,
    ...(sys.accessories || []), ...(sys.appendages || []),
    ...(sys.locomotionEnhancements || []),
    ...(sys.appendageEnhancements || []),
    ...(sys.processorEnhancements || []),
    ...installedComponentIds
  ]) {
    const id = namedId(entry);
    if (id) ids.add(id);
  }
  return ids;
}

function listed(value) {
  return (Array.isArray(value) ? value : [value])
    .map(v => String(v ?? '').trim().toLowerCase()).filter(Boolean);
}

/**
 * @param {object} input.definition       Published DROID_SYSTEMS record.
 * @param {string} input.size              Chosen chassis size.
 * @param {object} input.droidSystems      Draft chassis or authoritative base.
 * @param {string[]} input.installedComponentIds Explicit ledger-reconciled ids.
 * @param {object} input.selectedAppendage Explicit instance/slot target.
 *
 * EVIDENCE CONTRACT. Two modes, never mixed:
 *  - DRAFT (default; chargen / follower builders): the in-progress
 *    `droidSystems` selections ARE the thing being built, so they satisfy
 *    requirements, and `selectedAppendage` is matched against
 *    `droidSystems.appendages`.
 *  - LEDGER (`ledgerEvidence: true`; any post-creation actor): only CONFIRMED
 *    installed hardware satisfies a requirement. `installedComponentIds` must
 *    be the ids of components the installation ledger records, and
 *    `confirmedAppendages` the ledger's physical appendage instances
 *    ({id, instanceId}). A `droidSystems` display mirror, a stock-import blob
 *    or an embedded Item never satisfies a requirement. They still COUNT AS
 *    PRESENT for the nonstacking check (`presentComponentIds` plus the
 *    droidSystems ids), because blocking on a conflict is the safe direction.
 *    The chassis's primary locomotion remains a `droidSystems` fact.
 */
export function evaluateDroidComponentPrerequisites({
  definition, size, droidSystems = null, installedComponentIds = [],
  selectedAppendage = null, ledgerEvidence = false,
  confirmedAppendages = null, presentComponentIds = [], normalizeId = null
} = {}) {
  // Typed requirement ids are authored in the catalog's vocabulary ("remote")
  // while installed records carry canonical ids ("remote-processor"). Callers
  // that own the alias table pass `normalizeId` so both sides are compared in
  // one vocabulary; the default is the identity (pure, no alias knowledge).
  const canon = typeof normalizeId === 'function' ? (id => String(normalizeId(id) ?? '').trim().toLowerCase()) : (id => id);
  if (!definition || typeof definition !== 'object') {
    return fail('No published component definition', 'definition');
  }
  const sizeIndex = DROID_SIZE_ORDER.indexOf(String(size ?? '').trim().toLowerCase());
  if (sizeIndex < 0) return fail('Unknown droid chassis size', 'size');

  const minimum = definition.sizeRestriction;
  if (minimum != null) {
    const minimumIndex = DROID_SIZE_ORDER.indexOf(String(minimum).toLowerCase());
    if (minimumIndex < 0) return fail('Published size restriction is not recognized', 'sizeRestriction');
    if (sizeIndex < minimumIndex) {
      return fail(`Requires a ${minimum} or larger droid chassis`, 'sizeRestriction');
    }
  }

  const locoRequirement = definition.requiredLocomotion;
  if (locoRequirement != null) {
    const currentLocomotion = namedId(droidSystems?.locomotion);
    const allowed = listed(locoRequirement);
    if (!allowed.length || !currentLocomotion
      || (!allowed.includes('any') && !allowed.includes(currentLocomotion))) {
      return fail(`Requires ${allowed.join(' or ') || 'a known'} locomotion`, 'requiredLocomotion');
    }
  }

  const confirmedIds = Array.isArray(installedComponentIds) ? installedComponentIds : [];
  const draftAndPresent = selectedIds(droidSystems, [...confirmedIds,
    ...(Array.isArray(presentComponentIds) ? presentComponentIds : [])]);
  // Positive requirements: draft mode accepts the draft; ledger mode accepts
  // confirmed hardware only.
  const available = ledgerEvidence
    ? new Set(confirmedIds.map(id => namedId(id)).filter(Boolean))
    : draftAndPresent;
  // Core Hardened Systems are levels of ONE chassis system, not cumulative
  // HP/DT bonuses. The source ledger expressly states tier stacking is
  // NOT GRANTED; a replacement requires a separate atomic remove-and-add.
  if (/^hardened-systems-x[2-5]$/.test(namedId(definition))) {
    const tier = Number(namedId(definition).slice(-1));
    if (!Number.isInteger(definition.multiplier) || definition.multiplier !== tier) {
      return fail('Hardened Systems tier metadata conflicts with its source identity', 'multiplier');
    }
    const otherTier = [...draftAndPresent].find(id =>
      /^(?:droid-)?hardened-systems-x[2-5]$/.test(id) &&
      !id.endsWith(namedId(definition)));
    if (otherTier) {
      return fail('Only one Hardened Systems tier may be installed; remove the previous tier first', 'multiplier');
    }
  }
  const availableCanonical = new Set([...available].map(canon));
  const dependencies = listed(definition.requiredSystems ?? []);
  const missing = dependencies.filter(dep => !available.has(dep) && !availableCanonical.has(canon(dep)));
  if (missing.length) {
    return fail(`Requires installed system: ${missing.join(', ')}`, 'requiredSystems');
  }

  const compatibleAppendages = listed(definition.requiresAppendage ?? []);
  if (compatibleAppendages.length) {
    const instanceId = String(selectedAppendage?.instanceId ?? '').trim();
    const type = namedId(selectedAppendage);
    // LEDGER mode matches the confirmed ledger instances; DRAFT mode matches
    // the draft's own appendage list.
    const pool = ledgerEvidence
      ? (Array.isArray(confirmedAppendages) ? confirmedAppendages : [])
      : (droidSystems?.appendages || []);
    const matches = pool.filter(entry =>
      String(entry?.instanceId ?? '') === instanceId
      && namedId(entry) === type);
    if (!instanceId || !compatibleAppendages.includes(type) || matches.length !== 1) {
      return fail(
        `Select an identified, installed ${compatibleAppendages.join(' or ')} appendage instance`,
        'requiresAppendage'
      );
    }
  }

  return { status: 'PREREQUISITES_MET', blockingReason: null, blockingField: null };
}

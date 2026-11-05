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
 */
export function evaluateDroidComponentPrerequisites({
  definition, size, droidSystems = null, installedComponentIds = [],
  selectedAppendage = null
} = {}) {
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

  const available = selectedIds(droidSystems, Array.isArray(installedComponentIds)
    ? installedComponentIds : []);
  const dependencies = listed(definition.requiredSystems ?? []);
  const missing = dependencies.filter(dep => !available.has(dep));
  if (missing.length) {
    return fail(`Requires installed system: ${missing.join(', ')}`, 'requiredSystems');
  }

  const compatibleAppendages = listed(definition.requiresAppendage ?? []);
  if (compatibleAppendages.length) {
    const instanceId = String(selectedAppendage?.instanceId ?? '').trim();
    const type = namedId(selectedAppendage);
    const matches = (droidSystems?.appendages || []).filter(entry =>
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

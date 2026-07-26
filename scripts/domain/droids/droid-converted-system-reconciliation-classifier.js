/**
 * Droid Converted-System Reconciliation Classifier
 *
 * PHASE 4 — Converted-System Reconciliation and Runtime Hardening.
 *
 * Pure, dependency-free classification of one stock-imported droid's
 * `system.droidSystems` source records against the canonical Phase 1
 * registry. This is the "brain" of
 * scripts/domain/droids/droid-converted-system-reconciliation-service.js,
 * split out (same convention as
 * scripts/domain/droids/droid-installed-component-resolver.js and
 * scripts/actors/droid/droid-mode-adapter.js) so the actual
 * match/ambiguity/preservation decisions are unit-testable under plain
 * Node without needing a live Foundry actor or the service's
 * ActorEngine/SnapshotManager dependencies.
 *
 * A published stock droid's `droidSystems` blob is not a canonical
 * component ledger — see scripts/domain/droids/stock-droid-normalizer.js,
 * which parses freeform statblock text into best-effort records like
 * `{ id: 'heuristic-processor', name: 'Heuristic Processor', sourceText: '...' }`,
 * including explicit low-confidence defaults such as
 * `sourceText: 'Default stock droid processor assumption'` when nothing in
 * the source text described a system at all. Blindly copying every one of
 * these into `system.installedSystems` (the canonical, Garage-editable
 * ledger — see docs/audits/droid-authority-consolidation-phase-2.md) would
 * either silently invent mechanical parts from narrative text or
 * double-count a bonus already baked into the droid's published totals.
 * This module never mutates anything and never decides on its own to
 * install an ambiguous or unsupported record — it only classifies, so a
 * human (or the caller-supplied defaults) makes the actual selection.
 */

export const RECONCILIATION_CLASSIFICATION = Object.freeze({
  CANONICAL_MATCH: 'canonical-match',
  ALIAS_MATCH: 'alias-match',
  AMBIGUOUS_MATCH: 'ambiguous-match',
  DESCRIPTIVE_ONLY: 'descriptive-only',
  UNSUPPORTED: 'unsupported',
  ALREADY_CANONICAL: 'already-canonical',
  POST_IMPORT_MODIFICATION: 'post-import-modification'
});

const ASSUMED_DEFAULT_PREFIX = 'default stock droid';

function isAssumedDefault(entry) {
  return typeof entry?.sourceText === 'string' && entry.sourceText.trim().toLowerCase().startsWith(ASSUMED_DEFAULT_PREFIX);
}

function hasDescriptiveText(entry) {
  return Boolean(
    (typeof entry?.sourceText === 'string' && entry.sourceText.trim()) ||
    (typeof entry?.description === 'string' && entry.description.trim())
  );
}

function fuzzyDefinitionCandidates(name, definitions, normalizeId) {
  const slug = normalizeId(name);
  if (!slug) return [];
  return definitions.filter(def => {
    const idSlug = normalizeId(def.id);
    const nameSlug = normalizeId(def.name);
    if (!idSlug && !nameSlug) return false;
    return idSlug === slug || nameSlug === slug ||
      (slug.length >= 4 && (idSlug.includes(slug) || slug.includes(idSlug) || nameSlug.includes(slug) || slug.includes(nameSlug)));
  });
}

/**
 * Classify a single stock `droidSystems` source record.
 *
 * @param {object} entry - A raw droidSystems record (e.g. from
 *   system.droidSystems.sensors[0]) — expected shape `{id?, name?,
 *   sourceText?, description?}`, but tolerant of malformed input.
 * @param {object} context
 * @param {(value: unknown) => string} context.normalizeId - canonical id
 *   normalizer (production: normalizeDroidPartId).
 * @param {(canonicalId: string) => object|null} context.getDefinition -
 *   canonical part definition lookup (production: getDroidPartDefinition).
 * @param {object[]} [context.allDefinitions] - every canonical part
 *   definition, for fuzzy name-only matching (production:
 *   getAllDroidPartDefinitions()). Omit to disable fuzzy matching (id/name
 *   exact resolution still works).
 * @param {object} [context.existingLedger] - actor.system.installedSystems,
 *   keyed by canonical id, so an entry that already has a ledger record is
 *   reported as already-canonical/post-import-modification instead of
 *   re-classified as if it were new.
 * @returns {{classification: string, canonicalId: string|null, confidence: number, reasons: string[], alreadyInstalled: boolean, bakedIntoPublishedTotals: boolean, selectedByDefault: boolean, warnings: string[]}}
 */
export function classifyStockSystemEntry(entry, context = {}) {
  const normalizeId = typeof context.normalizeId === 'function' ? context.normalizeId : (v) => String(v ?? '').trim().toLowerCase();
  const getDefinition = typeof context.getDefinition === 'function' ? context.getDefinition : () => null;
  const allDefinitions = Array.isArray(context.allDefinitions) ? context.allDefinitions : [];
  const existingLedger = context.existingLedger && typeof context.existingLedger === 'object' ? context.existingLedger : {};

  const warnings = [];
  const base = {
    canonicalId: null,
    confidence: 0,
    reasons: [],
    alreadyInstalled: false,
    bakedIntoPublishedTotals: true,
    selectedByDefault: false,
    warnings
  };

  if (!entry || typeof entry !== 'object') {
    return { ...base, classification: RECONCILIATION_CLASSIFICATION.UNSUPPORTED, reasons: ['Source record is not an object.'] };
  }

  if (isAssumedDefault(entry)) {
    warnings.push('This record is an importer-assumed default (no matching text found in the published source), not something the statblock actually described.');
  }

  const rawId = entry.id ?? null;
  const rawName = entry.name ?? null;

  // 1. Id-based resolution first — the strongest, most deterministic signal.
  if (rawId) {
    const canonicalId = normalizeId(rawId);
    if (canonicalId && existingLedger[canonicalId]) {
      return classifyAgainstExistingLedger(canonicalId, existingLedger, base, warnings);
    }
    const def = canonicalId ? getDefinition(canonicalId) : null;
    if (def) {
      return {
        ...base,
        classification: RECONCILIATION_CLASSIFICATION.CANONICAL_MATCH,
        canonicalId,
        confidence: 1,
        reasons: [`Source id "${rawId}" resolves to canonical part "${canonicalId}".`],
        selectedByDefault: true
      };
    }
  }

  // 2. Name-based resolution when no id, or the id didn't resolve.
  if (rawName) {
    const canonicalId = normalizeId(rawName);
    if (canonicalId && existingLedger[canonicalId]) {
      return classifyAgainstExistingLedger(canonicalId, existingLedger, base, warnings);
    }
    const def = canonicalId ? getDefinition(canonicalId) : null;
    if (def) {
      return {
        ...base,
        classification: RECONCILIATION_CLASSIFICATION.ALIAS_MATCH,
        canonicalId,
        confidence: 0.85,
        reasons: [`Source name "${rawName}" resolves to canonical part "${canonicalId}" (name-only, no explicit id).`],
        selectedByDefault: true
      };
    }

    const fuzzy = fuzzyDefinitionCandidates(rawName, allDefinitions, normalizeId);
    if (fuzzy.length === 1) {
      const canonicalFuzzyId = normalizeId(fuzzy[0].id);
      if (existingLedger[canonicalFuzzyId]) {
        return classifyAgainstExistingLedger(canonicalFuzzyId, existingLedger, base, warnings);
      }
      return {
        ...base,
        classification: RECONCILIATION_CLASSIFICATION.ALIAS_MATCH,
        canonicalId: canonicalFuzzyId,
        confidence: 0.6,
        reasons: [`Source name "${rawName}" fuzzy-matches exactly one canonical part ("${fuzzy[0].name}").`],
        selectedByDefault: false,
        warnings: [...warnings, 'Fuzzy name match — review before applying.']
      };
    }
    if (fuzzy.length > 1) {
      return {
        ...base,
        classification: RECONCILIATION_CLASSIFICATION.AMBIGUOUS_MATCH,
        confidence: 0,
        reasons: [`Source name "${rawName}" fuzzy-matches ${fuzzy.length} canonical parts: ${fuzzy.map(d => d.id).join(', ')}.`],
        selectedByDefault: false,
        warnings: [...warnings, 'Ambiguous match — requires explicit caller selection; never auto-applied.']
      };
    }
  }

  if (hasDescriptiveText(entry)) {
    return {
      ...base,
      classification: RECONCILIATION_CLASSIFICATION.DESCRIPTIVE_ONLY,
      confidence: 0,
      reasons: ['No canonical part id/name match; retained as descriptive published-source text only.'],
      selectedByDefault: false
    };
  }

  return {
    ...base,
    classification: RECONCILIATION_CLASSIFICATION.UNSUPPORTED,
    confidence: 0,
    reasons: ['No id, no name, and no descriptive text to preserve — malformed or empty source record.'],
    selectedByDefault: false
  };
}

function classifyAgainstExistingLedger(canonicalId, existingLedger, base, warnings) {
  const ledgerEntry = existingLedger[canonicalId];
  const provenance = (ledgerEntry && typeof ledgerEntry === 'object') ? ledgerEntry.provenance : null;
  if (provenance?.origin === 'post-import-customization') {
    return {
      ...base,
      classification: RECONCILIATION_CLASSIFICATION.POST_IMPORT_MODIFICATION,
      canonicalId,
      confidence: 1,
      reasons: [`"${canonicalId}" already exists in the canonical ledger as a post-import Garage/Workshop modification.`],
      alreadyInstalled: true,
      bakedIntoPublishedTotals: false,
      selectedByDefault: false
    };
  }
  return {
    ...base,
    classification: RECONCILIATION_CLASSIFICATION.ALREADY_CANONICAL,
    canonicalId,
    confidence: 1,
    reasons: [`"${canonicalId}" already exists in the canonical installedSystems ledger.`],
    alreadyInstalled: true,
    bakedIntoPublishedTotals: provenance?.bakedIntoPublishedTotals !== false,
    selectedByDefault: false
  };
}

/**
 * Classify every stock `droidSystems` source record for one droid,
 * deduplicated by canonical id (multiple source records that resolve to
 * the same canonical part collapse into a single candidate rather than
 * being offered twice), in a stable, deterministic order.
 *
 * @param {{sourcePath: string, entry: object}[]} sourceEntries - every
 *   droidSystems record to classify, each tagged with the dotted path it
 *   came from (e.g. "system.droidSystems.sensors.0") for audit/history.
 * @param {object} context - see classifyStockSystemEntry.
 * @returns {object[]} candidates, sorted by canonicalId (falling back to
 *   the first sourcePath for candidates with no resolved canonicalId), so
 *   two calls against the same input always return the same order.
 */
/**
 * Mark any classified candidate that maps to a canonical id already
 * represented by an existing embedded weapon Item (e.g. an integrated
 * weapon the stock importer already created from a published attack entry
 * — see scripts/engine/import/stock-droid-importer-engine.js's
 * buildWeaponItemsFromAttacks()) as already-represented, so
 * DroidConvertedSystemReconciliationService never creates a second,
 * redundant system.installedSystems entry for a logical weapon that
 * already exists as a real Item on the actor.
 *
 * @param {object[]} candidates - output of classifyStockSystemSources().
 * @param {string[]} existingWeaponCanonicalIds - canonical ids already
 *   represented by an embedded weapon Item (production: derived from each
 *   stock-attack-flagged Item's system.droidPartId, normalized).
 * @returns {object[]} candidates, same order, with matches flagged.
 */
export function annotateWeaponCandidatesAgainstExistingItems(candidates, existingWeaponCanonicalIds = []) {
  const idSet = new Set(existingWeaponCanonicalIds.filter(Boolean));
  if (idSet.size === 0) return candidates;
  return candidates.map(candidate => {
    if (!candidate.canonicalId || !idSet.has(candidate.canonicalId) || candidate.alreadyInstalled) return candidate;
    return {
      ...candidate,
      alreadyInstalled: true,
      selectedByDefault: false,
      reasons: [...candidate.reasons, 'Already represented by an existing integrated weapon Item; reconciling it as a separate ledger entry would create a duplicate logical weapon.'],
      warnings: [...candidate.warnings, 'Matched to an existing weapon Item — no ledger entry will be created for this candidate.']
    };
  });
}

export function classifyStockSystemSources(sourceEntries, context = {}) {
  const list = Array.isArray(sourceEntries) ? sourceEntries : [];
  const byKey = new Map();

  for (const { sourcePath, entry } of list) {
    const result = classifyStockSystemEntry(entry, context);
    const key = result.canonicalId ?? `unmapped:${sourcePath}`;
    if (byKey.has(key)) {
      const existing = byKey.get(key);
      existing.sourcePaths.push(sourcePath);
      // Keep the highest-confidence classification if duplicate source
      // records disagree (e.g. one has an id, a duplicate only a name).
      if (result.confidence > existing.confidence) {
        Object.assign(existing, result, { sourcePaths: existing.sourcePaths });
      }
      continue;
    }
    byKey.set(key, { ...result, sourcePaths: [sourcePath], sourceRecord: entry });
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const aKey = a.canonicalId ?? a.sourcePaths[0] ?? '';
    const bKey = b.canonicalId ?? b.sourcePaths[0] ?? '';
    return aKey.localeCompare(bKey);
  });
}

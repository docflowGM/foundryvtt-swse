/**
 * Progression Reconciler — Phase 3
 *
 * Handles invalidation and reconciliation when upstream selections change.
 *
 * When a player changes an upstream choice (e.g., class), this module:
 * 1. Identifies downstream nodes affected by the change
 * 2. Marks affected nodes as dirty or purges their selections
 * 3. Rechecks legality of downstream selections via AbilityEngine
 * 4. Recomputes active step list in case conditional nodes appeared/disappeared
 * 5. Moves current step to a safe location if the current node was removed
 *
 * Usage:
 *   const reconciler = new ProgressionReconciler();
 *   await reconciler.reconcileAfterCommit(
 *     changedNodeId,  // e.g., 'class'
 *     actor,
 *     progressionSession,
 *     { activeStepComputer, currentStepId, mode, subtype }
 *   );
 *
 * Returns: { removed, dirty, purged, newActiveSteps, nextStepId, warnings }
 */

import { swseLogger } from '../../../utils/logger.js';
import {
  PROGRESSION_NODE_REGISTRY,
  InvalidationBehavior,
} from '../../../engine/progression/registries/progression-node-registry.js';
import { AbilityEngine } from '../../../engine/abilities/AbilityEngine.js';
import { GENERAL_FEAT_LEVELS } from '../../../engine/progression/data/progression-data.js';
import TalentCadenceEngine from '../../../engine/progression/talents/talent-cadence-engine.js';
import { resolveClassModel } from '../../../engine/progression/utils/class-resolution.js';
import {
  getClassLevelProgressionEntry,
  normalizeClassKey,
} from '../../../engine/progression/utils/levelup-event-context.js';
import {
  ProgressionEntitlementCalculator,
  ProgressionOwnershipClassifier,
  ProgressionReconciliationReportBuilder,
} from './reconciliation/index.js';
import { isKnownForceSecretItem, isKnownForceTechniqueItem } from '/systems/foundryvtt-swse/scripts/utils/force-knowledge.js';


const ABILITY_KEYS = Object.freeze(['str', 'dex', 'con', 'int', 'wis', 'cha']);
const ABILITY_LABELS = Object.freeze({
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
});

const DEFENSE_KEYS = Object.freeze(['fortitude', 'reflex', 'will']);
const DEFENSE_LABELS = Object.freeze({
  fortitude: 'Fortitude',
  reflex: 'Reflex',
  will: 'Will',
});
const NONHEROIC_BAB_PROGRESSION = Object.freeze([0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15]);

const CHOICE_FEATURE_TYPES = Object.freeze({
  feat_choice: 'class-feat',
  talent_choice: 'class-talent',
  force_secret_choice: 'force-secret',
  force_technique_choice: 'force-technique',
  force_power_choice: 'force-power',
  medical_secret_choice: 'medical-secret',
  starship_maneuver_choice: 'starship-maneuver',
});


const RECONCILIATION_CACHE = new Map();
const RECONCILIATION_CACHE_LIMIT = 100;
const REPORT_SCHEMA_VERSION = 9;

const DANGEROUS_REPORT_KEYS = new Set([
  'actor', 'actorDocument', 'document', 'documents', 'item', 'itemsDocument', 'model',
  'app', 'apps', 'application', 'window', 'sheet', 'shell', 'host', 'element', 'html',
  'form', 'jquery', 'callback', 'handler', 'listener', 'listeners', '_debouncedSubmit'
]);

function isBrowserWindow(value) {
  return typeof Window !== 'undefined' && value instanceof Window;
}

function isDomNode(value) {
  return typeof Node !== 'undefined' && value instanceof Node;
}

function isFoundryDocument(value) {
  if (!value || typeof value !== 'object') return false;
  return !!(value.documentName || value.collectionName || value.uuid) && typeof value.toObject === 'function';
}

function summarizeDocument(value) {
  return {
    id: value?.id || value?._id || null,
    uuid: value?.uuid || null,
    name: value?.name || value?.label || value?.constructor?.name || 'Document',
    type: value?.type || value?.documentName || value?.constructor?.name || 'document',
    documentName: value?.documentName || value?.constructor?.name || 'Document',
  };
}

function cacheKeyForActor(actor, options = {}) {
  const itemStats = (() => {
    try {
      return Array.from(actor?.items ?? [])
        .map(item => `${item?.id || item?._id || '?'}:${item?._stats?.modifiedTime || item?.system?.level || ''}`)
        .join('|');
    } catch (_err) {
      return '';
    }
  })();
  const effectStats = (() => {
    try {
      return Array.from(actor?.effects ?? [])
        .map(effect => `${effect?.id || effect?._id || '?'}:${effect?._stats?.modifiedTime || effect?.disabled || ''}`)
        .join('|');
    } catch (_err) {
      return '';
    }
  })();
  return [
    actor?.id || actor?.uuid || 'unknown-actor',
    actor?._stats?.modifiedTime || actor?.system?._stats?.modifiedTime || '',
    actor?.system?.level || actor?.system?.progression?.level || '',
    itemStats,
    effectStats,
    options.mode || '',
  ].join('::');
}

function setReconciliationCache(key, report) {
  if (!key || !report) return;
  RECONCILIATION_CACHE.set(key, report);
  if (RECONCILIATION_CACHE.size <= RECONCILIATION_CACHE_LIMIT) return;
  const first = RECONCILIATION_CACHE.keys().next().value;
  if (first) RECONCILIATION_CACHE.delete(first);
}

function findLastKnownGoodReport(actor) {
  const actorId = actor?.id || actor?.uuid;
  if (!actorId) return null;
  let newest = null;
  for (const [key, report] of RECONCILIATION_CACHE.entries()) {
    if (!key.startsWith(actorId)) continue;
    newest = report;
  }
  return newest;
}

function sanitizePlainData(value, path = 'report', seen = new WeakSet(), depth = 0) {
  if (value == null) return value;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return value;
  if (type === 'bigint') return Number(value);
  if (type === 'function' || type === 'symbol') return undefined;
  if (depth > 60) return '[MaxDepth]';
  if (isBrowserWindow(value) || isDomNode(value)) return undefined;
  if (isFoundryDocument(value)) return summarizeDocument(value);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Map) {
    return Array.from(value.entries()).map(([key, entry]) => ({
      key: sanitizePlainData(key, `${path}.<mapKey>`, seen, depth + 1),
      value: sanitizePlainData(entry, `${path}.<mapValue>`, seen, depth + 1),
    })).filter(entry => entry.key !== undefined && entry.value !== undefined);
  }
  if (value instanceof Set) {
    return Array.from(value.values())
      .map((entry, index) => sanitizePlainData(entry, `${path}[set:${index}]`, seen, depth + 1))
      .filter(entry => entry !== undefined);
  }
  if (type !== 'object') return undefined;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) {
    const arr = value
      .map((entry, index) => sanitizePlainData(entry, `${path}[${index}]`, seen, depth + 1))
      .filter(entry => entry !== undefined);
    seen.delete(value);
    return arr;
  }
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (DANGEROUS_REPORT_KEYS.has(key)) continue;
    if (key.startsWith('_') && typeof entry === 'function') continue;
    const cleaned = sanitizePlainData(entry, `${path}.${key}`, seen, depth + 1);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  seen.delete(value);
  return out;
}

function emptyLedger(type, label, route = {}) {
  return {
    type,
    label,
    expected: 0,
    filled: 0,
    ambiguous: 0,
    current: 0,
    open: 0,
    missing: 0,
    overfilled: 0,
    hasOpenSlots: false,
    hasAmbiguousSlots: false,
    hasOverfilledSlots: false,
    statusLabel: 'Unavailable',
    statusTone: 'neutral',
    slots: [],
    openSlots: [],
    ambiguousSlots: [],
    overfilledSlots: [],
    classificationRequired: false,
    ...route,
  };
}

function normalizeText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Unknown';
}

function readActorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function readClassLevel(item) {
  return Math.max(0, Number(item?.system?.level ?? item?.system?.levels ?? item?.system?.rank ?? item?.level ?? 0) || 0);
}

function normalizeClassLevelEntry(entry = {}) {
  const rawClassId = entry?.classId ?? entry?.id ?? entry?.sourceId ?? entry?.class ?? entry?.name ?? entry?.className;
  const rawClassName = entry?.className ?? entry?.name ?? entry?.class ?? entry?.label ?? entry?.classId ?? entry?.id;
  const classId = normalizeClassKey(rawClassId);
  const className = normalizeText(rawClassName) || titleCase(classId);
  const level = Math.max(0, Number(entry?.level ?? entry?.levels ?? entry?.value ?? entry?.rank ?? 0) || 0);
  if (!classId && !className) return null;
  if (level <= 0) return null;
  return { classId, className, level, raw: entry };
}

function readActorClassLevelLedger(actor) {
  const rows = [];
  const addRows = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const entry of value) {
        const normalized = normalizeClassLevelEntry(entry);
        if (normalized) rows.push(normalized);
      }
      return;
    }
    if (typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) {
        const normalized = normalizeClassLevelEntry({ classId: key, className: key, ...(entry && typeof entry === 'object' ? entry : { level: entry }) });
        if (normalized) rows.push(normalized);
      }
    }
  };

  addRows(actor?.system?.progression?.classLevels);
  addRows(actor?.system?.classes);

  const singleClass = actor?.system?.class;
  if (singleClass && typeof singleClass === 'object') {
    const normalized = normalizeClassLevelEntry({
      classId: singleClass.id || singleClass.classId || singleClass.sourceId,
      className: singleClass.name || singleClass.className || singleClass.id,
      level: singleClass.level || actor?.system?.level,
    });
    if (normalized) rows.push(normalized);
  }

  return rows;
}

function buildClassLevelLookup(actor) {
  const map = new Map();
  const add = (entry = {}) => {
    const level = Math.max(0, Number(entry.level || 0) || 0);
    if (!level) return;
    const keys = [
      normalizeClassKey(entry.classId),
      normalizeClassKey(entry.className),
      normalizeNameKey(entry.className),
    ].filter(Boolean);
    for (const key of keys) {
      const existing = map.get(key);
      if (!existing || level > existing.level) map.set(key, { ...entry, level });
    }
  };
  for (const entry of readActorClassLevelLedger(actor)) add(entry);
  for (const item of readActorItems(actor).filter(entry => entry?.type === 'class')) {
    add({
      classId: item?.system?.classId || item?.system?.id || item?.id || item?.name,
      className: item?.system?.className || item?.name || item?.system?.classId,
      level: readClassLevel(item),
      item,
    });
  }
  return map;
}

function highestClassLevelFor(actor, identifiers = []) {
  const lookup = buildClassLevelLookup(actor);
  let level = 0;
  for (const identifier of identifiers) {
    const keys = [normalizeClassKey(identifier), normalizeNameKey(identifier)].filter(Boolean);
    for (const key of keys) level = Math.max(level, Number(lookup.get(key)?.level || 0) || 0);
  }
  return level;
}

function featureType(feature = {}) {
  return String(feature?.type || feature?.kind || feature?.featureType || feature?.system?.progressionFeatureType || '')
    .trim()
    .toLowerCase();
}

function featureQuantity(feature = {}) {
  return Math.max(1, Number(feature?.value ?? feature?.quantity ?? feature?.count ?? 1) || 1);
}

function normalizeLevel(value) {
  const level = Number(value);
  return Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
}

function abilityIncreaseRecordLevel(entry = {}) {
  return normalizeLevel(entry.level ?? entry.characterLevel ?? entry.acquiredAtLevel ?? entry.sourceLevel);
}

function normalizeAbilityIncreases(value = {}) {
  const source = value?.increases || value?.abilityIncreases || value || {};
  const out = {};
  for (const key of ABILITY_KEYS) {
    const delta = Math.max(0, Math.floor(Number(source?.[key] ?? 0) || 0));
    if (delta > 0) out[key] = delta;
  }
  return out;
}

function abilityIncreaseCount(value = {}) {
  return Object.values(normalizeAbilityIncreases(value)).reduce((sum, delta) => sum + delta, 0);
}

function getActorTotalLevel(actor) {
  const explicit = normalizeLevel(actor?.system?.level ?? actor?.system?.details?.level ?? actor?.system?.progression?.level);
  const fromItems = readActorItems(actor)
    .filter(item => item?.type === 'class')
    .reduce((sum, item) => sum + readClassLevel(item), 0);
  const fromProgressionLedger = readActorClassLevelLedger(actor)
    .reduce((sum, entry) => sum + (Number(entry.level || 0) || 0), 0);
  return Math.max(explicit, fromItems, fromProgressionLedger, 0);
}


function normalizeSourceToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-');
}

function normalizeNameKey(value) {
  return String(value?.name || value?.label || value || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function itemProgressionMeta(item = {}) {
  return item?.flags?.swse?.progression || item?.system?.progression || {};
}

function itemAcquisitionMeta(item = {}) {
  return item?.system?.acquisition || item?.flags?.swse?.acquisition || itemProgressionMeta(item) || {};
}

function isAutomaticProgressionItem(item = {}) {
  const meta = itemProgressionMeta(item);
  const selectionKey = normalizeSourceToken(meta?.selectionKey);
  const sourceType = normalizeSourceToken(item?.system?.sourceType);
  const featureType = normalizeSourceToken(item?.system?.progressionFeatureType || item?.system?.featureType);
  if (item?.system?.autoGranted) return true;
  if (item?.flags?.swse?.classGranted && (selectionKey === 'class-auto-grants' || item?.system?.autoGranted)) return true;
  if (selectionKey === 'class-auto-grants' || selectionKey === 'species-auto-grants' || selectionKey === 'class-starter-equipment') return true;
  if (selectionKey === 'class-automatic-feature' || sourceType === 'class-feature' || featureType === 'class-feature') return true;
  if (item?.system?.multiclassStartingFeat) return true;
  return false;
}

function itemSlotType(item = {}) {
  const meta = itemProgressionMeta(item);
  const acq = itemAcquisitionMeta(item);
  return normalizeSourceToken(
    item?.system?.slotType
    || item?.flags?.swse?.slotType
    || meta?.slotType
    || acq?.slotType
    || item?.system?.levelupGrantKind
    || meta?.levelupGrantKind
    || ''
  );
}

function itemSourceToken(item = {}) {
  const meta = itemProgressionMeta(item);
  const acq = itemAcquisitionMeta(item);
  return normalizeSourceToken(
    item?.system?.source
    || item?.system?.sourceType
    || item?.flags?.swse?.source
    || meta?.source
    || acq?.source
    || acq?.sourceType
    || ''
  );
}

function itemClassId(item = {}) {
  const acq = itemAcquisitionMeta(item);
  return normalizeClassKey(
    acq?.classId
    || acq?.sourceClassId
    || item?.system?.classId
    || item?.system?.sourceClassId
    || item?.flags?.swse?.sourceClassId
    || item?.flags?.swse?.classId
  );
}

function itemClassName(item = {}) {
  const acq = itemAcquisitionMeta(item);
  return normalizeText(
    acq?.className
    || acq?.sourceClass
    || item?.system?.className
    || item?.system?.sourceClass
    || item?.flags?.swse?.sourceClass
    || item?.flags?.swse?.className
  ).toLowerCase();
}

function itemClassLevel(item = {}) {
  const acq = itemAcquisitionMeta(item);
  return normalizeLevel(
    acq?.classLevel
    || acq?.sourceClassLevel
    || acq?.grantedClassLevel
    || item?.system?.classLevel
    || item?.system?.grantedClassLevel
    || item?.flags?.swse?.classLevel
  );
}

function isNonheroicClassSummary(summary = {}) {
  const model = summary.model || {};
  const item = summary.item || {};
  const nameKey = normalizeNameKey(summary.className || summary.classId || item?.name || model?.name);
  return nameKey === 'nonheroic'
    || item?.system?.isNonheroic === true
    || model?.system?.isNonheroic === true
    || model?.isNonheroic === true
    || normalizeSourceToken(model?.system?.classType || model?.classType) === 'nonheroic';
}

function isPrestigeClassSummary(summary = {}) {
  const model = summary.model || {};
  const item = summary.item || {};
  if (isNonheroicClassSummary(summary)) return false;
  const base = model?.system?.base_class ?? model?.system?.baseClass ?? model?.base_class ?? model?.baseClass ?? item?.system?.base_class ?? item?.system?.baseClass;
  if (base === false) return true;
  const type = normalizeSourceToken(model?.system?.classType || model?.classType || item?.system?.classType);
  return type === 'prestige' || type === 'prestige-class';
}

function getActorHeroicLevel(actor, classSummaries = []) {
  const heroicFromClasses = (Array.isArray(classSummaries) ? classSummaries : [])
    .filter(summary => !isNonheroicClassSummary(summary))
    .reduce((sum, summary) => sum + (Number(summary.level || 0) || 0), 0);
  if (heroicFromClasses > 0) return heroicFromClasses;
  return getActorTotalLevel(actor);
}

export class ProgressionReconciler {
  /**
   * Build an actor-wide progression reconciliation report.
   * This is the canonical sheet/progression audit seam: progression workflows can
   * consume the full report, while sheets can request a presentation projection
   * from the same reconciler instance.
   *
   * @param {Actor} actor
   * @param {Object} options
   * @param {'report'|'sheet'} options.output
   * @returns {Object}
   */
  static reconcileActor(actor, options = {}) {
    return ProgressionReconciler.safeReconcileActor(actor, options);
  }

  static safeReconcileActor(actor, options = {}) {
    const reconciler = new ProgressionReconciler();
    return reconciler.safeReconcileActor(actor, options);
  }

  safeReconcileActor(actor, options = {}) {
    const output = options.output || 'report';
    const cacheKey = cacheKeyForActor(actor, options);
    try {
      const report = this.reconcileActor(actor, { ...options, output: 'report' });
      const safeReport = this.sanitizeReconciliationReport(report, { actor, options });
      setReconciliationCache(cacheKey, safeReport);
      return output === 'sheet' ? this._safeToSheetAudit(safeReport, options) : safeReport;
    } catch (err) {
      swseLogger.error('[ProgressionReconciler] Safe reconciliation failed; returning fallback report', {
        actorId: actor?.id || null,
        actorName: actor?.name || 'Actor',
        message: err?.message || String(err),
        stack: err?.stack || null,
      });
      const cached = findLastKnownGoodReport(actor);
      const fallback = cached
        ? this._markReportStale(cached, err)
        : this._buildFallbackReport(actor, {}, err, { stage: 'safe-reconcile' });
      const safeFallback = this.sanitizeReconciliationReport(fallback, { actor, options, fallback: true });
      return output === 'sheet' ? this._safeToSheetAudit(safeFallback, options) : safeFallback;
    }
  }

  reconcileActor(actor, options = {}) {
    const helpers = this._buildActorAuditLayerHelpers();
    const entitlementCalculator = new ProgressionEntitlementCalculator({ helpers });
    const ownershipClassifier = new ProgressionOwnershipClassifier({ helpers });
    const reportBuilder = new ProgressionReconciliationReportBuilder();
    const layerErrors = [];

    let entitlementPlan;
    try {
      entitlementPlan = entitlementCalculator.calculate(actor, options);
    } catch (err) {
      layerErrors.push(this._layerError('entitlement-calculator', err));
      swseLogger.error('[ProgressionReconciler] Entitlement calculation failed', { actorId: actor?.id || null, message: err?.message || String(err), stack: err?.stack || null });
      entitlementPlan = this._buildEmptyEntitlementPlan(actor, options, err);
    }

    let ownership;
    try {
      ownership = ownershipClassifier.classify(actor, entitlementPlan, options);
    } catch (err) {
      layerErrors.push(this._layerError('ownership-classifier', err));
      swseLogger.error('[ProgressionReconciler] Ownership classification failed', { actorId: actor?.id || null, message: err?.message || String(err), stack: err?.stack || null });
      ownership = this._buildEmptyOwnership(actor, err);
    }

    let report;
    try {
      report = reportBuilder.build(actor, entitlementPlan, ownership, options);
    } catch (err) {
      layerErrors.push(this._layerError('report-builder', err));
      swseLogger.error('[ProgressionReconciler] Report building failed', { actorId: actor?.id || null, message: err?.message || String(err), stack: err?.stack || null });
      report = this._buildFallbackReport(actor, { entitlementPlan, ownership }, err, { stage: 'report-builder' });
    }

    report = report && typeof report === 'object' ? report : this._buildFallbackReport(actor, { entitlementPlan, ownership }, null, { stage: 'invalid-report' });
    report.diagnostics = this._mergeDiagnostics(report.diagnostics, {
      safeMode: true,
      layerErrors,
      hasLayerErrors: layerErrors.length > 0,
      schema: this._validateReconciliationReport(report),
    });
    report.repairSuggestions = this._buildActorRepairSuggestions(actor, report);
    report.debugExport = this._buildDebugExport(actor, report);
    return report;
  }

  sanitizeReconciliationReport(report = {}, { actor = null, options = {}, fallback = false } = {}) {
    const base = report && typeof report === 'object' ? report : this._buildFallbackReport(actor, {}, null, { stage: 'sanitize-empty' });
    const sanitized = sanitizePlainData(base) || {};
    sanitized.kind = sanitized.kind || 'swse-actor-progression-reconciliation';
    sanitized.version = Math.max(Number(sanitized.version || 0) || 0, REPORT_SCHEMA_VERSION);
    sanitized.actorId = sanitized.actorId || actor?.id || null;
    sanitized.actorName = sanitized.actorName || actor?.name || 'Actor';
    sanitized.status = sanitized.status || (fallback ? 'degraded' : 'ok');
    sanitized.warnings = Array.isArray(sanitized.warnings) ? sanitized.warnings : [];
    sanitized.slots = sanitized.slots && typeof sanitized.slots === 'object' ? sanitized.slots : {};
    sanitized.slots.abilityIncreases = Array.isArray(sanitized.slots.abilityIncreases) ? sanitized.slots.abilityIncreases : [];
    sanitized.slots.generalFeats = Array.isArray(sanitized.slots.generalFeats) ? sanitized.slots.generalFeats : [];
    sanitized.slots.heroicTalents = Array.isArray(sanitized.slots.heroicTalents) ? sanitized.slots.heroicTalents : [];
    sanitized.slots.classChoices = Array.isArray(sanitized.slots.classChoices) ? sanitized.slots.classChoices : [];
    sanitized.slots.classFeats = Array.isArray(sanitized.slots.classFeats) ? sanitized.slots.classFeats : sanitized.slots.classChoices.filter(slot => slot?.type === 'class-feat');
    sanitized.slots.classTalents = Array.isArray(sanitized.slots.classTalents) ? sanitized.slots.classTalents : sanitized.slots.classChoices.filter(slot => slot?.type === 'class-talent');
    sanitized.derivedStats = sanitized.derivedStats && typeof sanitized.derivedStats === 'object'
      ? sanitized.derivedStats
      : { status: 'unavailable', rows: [], hasIssues: false, issueCount: 0 };
    sanitized.derivedStats.rows = Array.isArray(sanitized.derivedStats.rows) ? sanitized.derivedStats.rows : [];
    sanitized.classSummaries = Array.isArray(sanitized.classSummaries) ? sanitized.classSummaries : [];
    sanitized.tasks = Array.isArray(sanitized.tasks) ? sanitized.tasks : [];
    sanitized.timeline = sanitized.timeline && typeof sanitized.timeline === 'object'
      ? sanitized.timeline
      : { entries: [], flatSteps: [], hasRecoveryDebt: false, diagnostics: { status: 'unavailable' } };
    sanitized.timeline.entries = Array.isArray(sanitized.timeline.entries) ? sanitized.timeline.entries : [];
    sanitized.timeline.flatSteps = Array.isArray(sanitized.timeline.flatSteps) ? sanitized.timeline.flatSteps : [];
    sanitized.repairSuggestions = Array.isArray(sanitized.repairSuggestions) ? sanitized.repairSuggestions : [];
    sanitized.diagnostics = this._mergeDiagnostics(sanitized.diagnostics, {
      sanitized: true,
      fallback: fallback === true,
      output: options.output || 'report',
      schema: this._validateReconciliationReport(sanitized),
    });
    try {
      structuredClone(sanitized);
    } catch (err) {
      swseLogger.error('[ProgressionReconciler] Sanitized report still failed structuredClone; returning minimal fallback', {
        actorId: actor?.id || sanitized.actorId || null,
        message: err?.message || String(err),
      });
      return this._buildFallbackReport(actor, {}, err, { stage: 'post-sanitize-structured-clone' });
    }
    return sanitized;
  }

  _safeToSheetAudit(report = {}, options = {}) {
    try {
      const audit = this.toSheetAudit(report, options);
      return sanitizePlainData(audit) || this._emptySheetAudit(report, { reason: 'sanitized-empty-sheet-audit' });
    } catch (err) {
      swseLogger.error('[ProgressionReconciler] Sheet audit projection failed', {
        actorId: report?.actorId || null,
        message: err?.message || String(err),
        stack: err?.stack || null,
      });
      return this._emptySheetAudit(report, { error: err, reason: 'sheet-projection-failed' });
    }
  }

  _buildEmptyEntitlementPlan(actor, options = {}, err = null) {
    return {
      kind: 'swse-progression-entitlement-plan',
      version: REPORT_SCHEMA_VERSION,
      actorId: actor?.id || null,
      actorName: actor?.name || 'Actor',
      totalLevel: normalizeLevel(actor?.system?.level),
      totalHeroicLevel: normalizeLevel(actor?.system?.level),
      mode: options.mode || 'actor-audit',
      internalClassSummaries: [],
      classSummaries: [],
      slots: {
        abilityIncreases: [],
        generalFeats: [],
        heroicTalents: [],
        classChoices: [],
        classFeats: [],
        classTalents: [],
        derivedStats: { status: 'unavailable', rows: [], hasIssues: false, issueCount: 0 },
      },
      derivedStats: { status: 'unavailable', rows: [], hasIssues: false, issueCount: 0 },
      diagnostics: {
        layer: 'entitlement-calculator',
        status: 'failed-soft',
        error: !!err,
        message: err?.message || '',
      },
    };
  }

  _buildEmptyOwnership(_actor, err = null) {
    return {
      rawPools: {
        featPools: { general: [], class: [], unknown: [] },
        talentPools: { heroic: [], class: [], unknown: [] },
      },
      featPools: { general: [], class: [], unknown: [] },
      talentPools: { heroic: [], class: [], unknown: [] },
      diagnostics: {
        layer: 'ownership-classifier',
        status: err ? 'failed-soft' : 'unavailable',
        error: !!err,
        message: err?.message || '',
      },
    };
  }

  _buildFallbackReport(actor, context = {}, err = null, { stage = 'unknown' } = {}) {
    const actorId = actor?.id || context?.entitlementPlan?.actorId || null;
    const actorName = actor?.name || context?.entitlementPlan?.actorName || 'Actor';
    const message = err?.message || 'Progression audit unavailable';
    return {
      kind: 'swse-actor-progression-reconciliation',
      version: REPORT_SCHEMA_VERSION,
      actorId,
      actorName,
      totalLevel: normalizeLevel(actor?.system?.level),
      totalHeroicLevel: normalizeLevel(actor?.system?.level),
      classSummaries: [],
      slots: {
        abilityIncreases: [],
        generalFeats: [],
        heroicTalents: [],
        classChoices: [],
        classFeats: [],
        classTalents: [],
        derivedStats: { status: 'unavailable', rows: [], hasIssues: false, issueCount: 0, warnings: [message] },
      },
      derivedStats: { status: 'unavailable', rows: [], hasIssues: false, issueCount: 0, warnings: [message] },
      ownership: { status: 'unavailable' },
      classification: { status: 'unavailable' },
      layers: {
        entitlements: context?.entitlementPlan?.diagnostics || { layer: 'entitlement-calculator', status: 'unavailable' },
        ownership: context?.ownership?.diagnostics || { layer: 'ownership-classifier', status: 'unavailable' },
        report: { layer: 'reconciliation-report-builder', status: 'fallback', stage },
      },
      warnings: ['Progression audit unavailable. Character sheet opened with safe fallback data.'],
      status: 'degraded',
      timeline: { entries: [], flatSteps: [], hasRecoveryDebt: false, diagnostics: { layer: 'progression-timeline-builder', status: 'unavailable' } },
      repairSuggestions: [],
      diagnostics: {
        safeMode: true,
        error: !!err,
        stage,
        message,
        stack: err?.stack || null,
      },
      debugExport: {
        actorId,
        actorName,
        status: 'fallback',
        stage,
        message,
      },
    };
  }

  _emptySheetAudit(report = {}, { error = null, reason = 'unavailable' } = {}) {
    const ledgers = [
      emptyLedger('ability-increase', 'Ability score increases', { tab: 'abilities', sheetAnchor: 'ability-increases', stepId: 'attribute', job: 'ability-increase' }),
      emptyLedger('general-feat', 'General feats', { tab: 'talents', sheetAnchor: 'feat-ledger', stepId: 'general-feat', job: 'choose-feat' }),
      emptyLedger('class-feat', 'Class feats', { tab: 'talents', sheetAnchor: 'feat-ledger', stepId: 'class-feat', job: 'choose-feat' }),
      emptyLedger('heroic-talent', 'Heroic talents', { tab: 'talents', sheetAnchor: 'talent-ledger', stepId: 'general-talent', job: 'choose-talent' }),
      emptyLedger('class-talent', 'Class talents', { tab: 'talents', sheetAnchor: 'talent-ledger', stepId: 'class-talent', job: 'choose-talent' }),
    ];
    return {
      kind: 'swse-actor-progression-reconciliation-sheet',
      status: 'degraded',
      totalLevel: Number(report?.totalLevel || 0) || 0,
      totalHeroicLevel: Number(report?.totalHeroicLevel || report?.totalLevel || 0) || 0,
      warnings: ['Progression audit unavailable. Character sheet opened safely.'],
      classSummaries: [],
      hasOpenProgression: false,
      hasTrainingProgression: false,
      trainingLedgers: ledgers,
      derivedStats: { status: 'unavailable', hasIssues: false, issueCount: 0, rows: [], warnings: [] },
      abilityIncreases: { ...ledgers[0], hasOpenSlots: false },
      generalFeats: ledgers[1],
      classFeats: ledgers[2],
      heroicTalents: ledgers[3],
      classTalents: ledgers[4],
      classChoices: { expected: 0, filled: 0, open: 0, overfilled: 0, ambiguous: 0, hasOpenSlots: false, hasAmbiguousSlots: false, openSlots: [], ambiguousSlots: [], featOpen: 0, talentOpen: 0 },
      byClass: [],
      tasks: [],
      repairSuggestions: [],
      diagnostics: {
        error: !!error,
        reason,
        message: error?.message || '',
        safeFallback: true,
      },
    };
  }

  _layerError(layer, err = null) {
    return {
      layer,
      message: err?.message || String(err || 'Unknown error'),
      stack: err?.stack || null,
      at: new Date().toISOString(),
    };
  }

  _mergeDiagnostics(existing = {}, patch = {}) {
    const base = existing && typeof existing === 'object' ? existing : {};
    return {
      ...base,
      ...patch,
      layerErrors: [
        ...(Array.isArray(base.layerErrors) ? base.layerErrors : []),
        ...(Array.isArray(patch.layerErrors) ? patch.layerErrors : []),
      ],
    };
  }

  _markReportStale(report = {}, err = null) {
    const stale = sanitizePlainData(report) || {};
    stale.status = stale.status === 'ok' ? 'stale' : (stale.status || 'stale');
    stale.warnings = Array.isArray(stale.warnings) ? [...stale.warnings] : [];
    stale.warnings.unshift('Using last-known-good progression audit because the latest reconciliation failed.');
    stale.diagnostics = this._mergeDiagnostics(stale.diagnostics, {
      staleCache: true,
      error: !!err,
      message: err?.message || '',
    });
    return stale;
  }

  _validateReconciliationReport(report = {}) {
    const issues = [];
    if (!report || typeof report !== 'object') issues.push('report is not an object');
    if (!report.kind) issues.push('missing kind');
    if (!report.slots || typeof report.slots !== 'object') issues.push('missing slots object');
    for (const key of ['abilityIncreases', 'generalFeats', 'heroicTalents', 'classChoices', 'classFeats', 'classTalents']) {
      if (report?.slots && !Array.isArray(report.slots[key])) issues.push(`slots.${key} is not an array`);
    }
    if (!Array.isArray(report.classSummaries || [])) issues.push('classSummaries is not an array');
    if (report.timeline && typeof report.timeline === 'object' && !Array.isArray(report.timeline.entries || [])) issues.push('timeline.entries is not an array');
    return {
      valid: issues.length === 0,
      issues,
      checkedAt: new Date().toISOString(),
    };
  }

  _buildActorRepairSuggestions(actor, report = {}) {
    const suggestions = [];
    const hasOwned = (type, predicate) => readActorItems(actor).some(item => item?.type === type && (!predicate || predicate(item)));
    const ownsForceSensitivity = hasOwned('feat', item => normalizeNameKey(item?.name) === 'forcesensitivity' || normalizeNameKey(item?.system?.slug) === 'forcesensitivity');
    if (ownsForceSensitivity && actor?.system?.forceSensitive !== true) {
      suggestions.push({
        id: 'repair-force-sensitive-state',
        type: 'actor-state-repair',
        severity: 'warning',
        label: 'Repair Force Sensitivity state',
        detail: 'Actor owns Force Sensitivity but system.forceSensitive is not true.',
        action: 'repair-progression-metadata',
        repairKey: 'forceSensitive',
      });
    }
    const classSummaries = Array.isArray(report?.classSummaries) ? report.classSummaries : [];
    const classTotal = classSummaries.reduce((sum, row) => sum + (Number(row?.level || 0) || 0), 0);
    const systemLevel = normalizeLevel(actor?.system?.level);
    if (classTotal > 0 && systemLevel > 0 && classTotal !== systemLevel) {
      suggestions.push({
        id: 'repair-level-class-ledger-mismatch',
        type: 'actor-state-repair',
        severity: 'warning',
        label: 'Review class level ledger',
        detail: `System level is ${systemLevel}, but class ledger totals ${classTotal}.`,
        action: 'repair-progression-metadata',
        repairKey: 'classLevelLedger',
      });
    }
    const skills = actor?.system?.skills || {};
    if (skills?.null || Object.keys(skills).some(key => /^[a-f0-9]{12,}$/i.test(key))) {
      suggestions.push({
        id: 'repair-invalid-skill-keys',
        type: 'actor-state-repair',
        severity: 'warning',
        label: 'Repair invalid skill keys',
        detail: 'Actor has null/random skill keys, often from unresolved Skill Focus or skill-choice metadata.',
        action: 'repair-progression-metadata',
        repairKey: 'skillKeys',
      });
    }
    const session = actor?.flags?.['foundryvtt-swse']?.progression?.chargen?.session;
    const completed = actor?.system?.progression?.chargenComplete === true || actor?.flags?.['foundryvtt-swse']?.chargen?.completed === true;
    if (session && completed) {
      suggestions.push({
        id: 'repair-stale-chargen-session',
        type: 'actor-state-repair',
        severity: 'warning',
        label: 'Clear stale chargen session',
        detail: 'Actor is marked complete but still has a saved chargen session.',
        action: 'repair-progression-metadata',
        repairKey: 'staleChargenSession',
      });
    }
    const pendingForcePicks = (Array.isArray(actor?.flags?.['foundryvtt-swse']?.progression?.chargen?.session?.draftSelections?.pendingEntitlements)
      ? actor.flags['foundryvtt-swse'].progression.chargen.session.draftSelections.pendingEntitlements
      : [])
      .filter(entry => entry?.type === 'force_power_pick' && Number(entry?.spent || 0) < Number(entry?.quantity || 0));
    const forcePowerCount = readActorItems(actor).filter(item => item?.type === 'force-power').length;
    if (pendingForcePicks.length && forcePowerCount > 0) {
      suggestions.push({
        id: 'repair-force-training-entitlements',
        type: 'actor-state-repair',
        severity: 'info',
        label: 'Review Force Training entitlements',
        detail: 'Actor has Force Powers but still has unspent Force Training entitlement records.',
        action: 'repair-progression-metadata',
        repairKey: 'forceTrainingEntitlements',
      });
    }
    return suggestions;
  }

  _buildDebugExport(actor, report = {}) {
    return sanitizePlainData({
      actorId: actor?.id || report?.actorId || null,
      actorName: actor?.name || report?.actorName || 'Actor',
      status: report?.status || 'unknown',
      totalLevel: report?.totalLevel || 0,
      totalHeroicLevel: report?.totalHeroicLevel || 0,
      classSummaries: report?.classSummaries || [],
      warnings: report?.warnings || [],
      slotCounts: {
        abilityIncreases: report?.slots?.abilityIncreases?.length || 0,
        generalFeats: report?.slots?.generalFeats?.length || 0,
        heroicTalents: report?.slots?.heroicTalents?.length || 0,
        classFeats: report?.slots?.classFeats?.length || 0,
        classTalents: report?.slots?.classTalents?.length || 0,
      },
      derivedStats: report?.derivedStats || {},
      timelineDiagnostics: report?.timeline?.diagnostics || {},
      diagnostics: report?.diagnostics || {},
      repairSuggestions: report?.repairSuggestions || [],
    });
  }

  _buildActorAuditLayerHelpers() {
    return {
      readActorItems,
      getActorTotalLevel,
      getActorHeroicLevel,
      buildClassSummaries: this._buildClassSummaries.bind(this),
      toPublicClassSummary: this._toPublicClassSummary.bind(this),
      buildAbilityIncreaseSlots: this._buildAbilityIncreaseSlots.bind(this),
      buildGeneralFeatSlots: this._buildGeneralFeatSlots.bind(this),
      buildHeroicTalentSlots: this._buildHeroicTalentSlots.bind(this),
      buildClassChoiceSlots: this._buildClassChoiceSlots.bind(this),
      buildDerivedStatsAudit: this._buildDerivedStatsAudit.bind(this),
      buildFeatPools: this._buildFeatPools.bind(this),
      buildTalentPools: this._buildTalentPools.bind(this),
    };
  }

  toSheetAudit(report = {}, _options = {}) {
    const abilitySlots = Array.isArray(report?.slots?.abilityIncreases) ? report.slots.abilityIncreases : [];
    const generalFeatSlots = Array.isArray(report?.slots?.generalFeats) ? report.slots.generalFeats : [];
    const heroicTalentSlots = Array.isArray(report?.slots?.heroicTalents) ? report.slots.heroicTalents : [];
    const classChoiceSlots = Array.isArray(report?.slots?.classChoices) ? report.slots.classChoices : [];
    const classFeatSlots = Array.isArray(report?.slots?.classFeats) ? report.slots.classFeats : classChoiceSlots.filter(slot => slot.type === 'class-feat');
    const classTalentSlots = Array.isArray(report?.slots?.classTalents) ? report.slots.classTalents : classChoiceSlots.filter(slot => slot.type === 'class-talent' || slot.type === 'talent');
    const derivedStats = report?.derivedStats || report?.slots?.derivedStats || { rows: [], hasIssues: false, issueCount: 0, status: 'unavailable' };

    const abilityLedger = this._buildLedgerSummary('ability-increase', 'Ability score increases', abilitySlots, {
      tab: 'abilities',
      sheetAnchor: 'ability-increases',
      stepId: 'attribute',
      job: 'ability-increase',
    });
    const generalFeatLedger = this._buildLedgerSummary('general-feat', 'General feats', generalFeatSlots, {
      tab: 'talents',
      sheetAnchor: 'feat-ledger',
      stepId: 'general-feat',
      job: 'choose-feat',
    });
    const classFeatLedger = this._buildLedgerSummary('class-feat', 'Class feats', classFeatSlots, {
      tab: 'talents',
      sheetAnchor: 'feat-ledger',
      stepId: 'class-feat',
      job: 'choose-feat',
    });
    const heroicTalentLedger = this._buildLedgerSummary('heroic-talent', 'Heroic talents', heroicTalentSlots, {
      tab: 'talents',
      sheetAnchor: 'talent-ledger',
      stepId: 'general-talent',
      job: 'choose-talent',
    });
    const classTalentLedger = this._buildLedgerSummary('class-talent', 'Class talents', classTalentSlots, {
      tab: 'talents',
      sheetAnchor: 'talent-ledger',
      stepId: 'class-talent',
      job: 'choose-talent',
    });

    const trainingLedgers = [
      abilityLedger,
      generalFeatLedger,
      classFeatLedger,
      heroicTalentLedger,
      classTalentLedger,
    ];
    const hasOpenProgression = trainingLedgers.some(ledger => Number(ledger.open || 0) > 0 || Number(ledger.ambiguous || 0) > 0 || Number(ledger.overfilled || 0) > 0);

    return {
      kind: 'swse-actor-progression-reconciliation-sheet',
      status: report?.status || 'ok',
      totalLevel: Number(report?.totalLevel || 0) || 0,
      totalHeroicLevel: Number(report?.totalHeroicLevel || report?.totalLevel || 0) || 0,
      warnings: Array.isArray(report?.warnings) ? report.warnings : [],
      diagnostics: report?.diagnostics && typeof report.diagnostics === 'object' ? report.diagnostics : {},
      debugExport: report?.debugExport && typeof report.debugExport === 'object' ? report.debugExport : {},
      repairSuggestions: Array.isArray(report?.repairSuggestions) ? report.repairSuggestions : [],
      hasRepairSuggestions: Array.isArray(report?.repairSuggestions) && report.repairSuggestions.length > 0,
      classSummaries: Array.isArray(report?.classSummaries) ? report.classSummaries : [],
      hasOpenProgression: hasOpenProgression || derivedStats.hasIssues === true,
      hasTrainingProgression: hasOpenProgression,
      trainingLedgers,
      derivedStats: this._toSheetDerivedStatsAudit(derivedStats),
      abilityIncreases: {
        ...abilityLedger,
        hasOpenSlots: abilityLedger.open > 0,
        slots: abilitySlots,
        openSlots: abilityLedger.openSlots.map(slot => ({
          ...slot,
          title: `Level ${slot.characterLevel} Ability Increase`,
          detail: `Choose ${slot.openCount || 0} ${(slot.openCount || 0) === 1 ? 'ability score' : 'different ability scores'} to increase.`,
        })),
      },
      generalFeats: generalFeatLedger,
      classFeats: classFeatLedger,
      heroicTalents: heroicTalentLedger,
      classTalents: classTalentLedger,
      classChoices: {
        expected: classChoiceSlots.length,
        filled: classChoiceSlots.filter(slot => slot.status === 'filled').length,
        open: classChoiceSlots.filter(slot => slot.status === 'open').length,
        overfilled: classChoiceSlots.filter(slot => slot.status === 'overfilled').length,
        ambiguous: classChoiceSlots.filter(slot => slot.status === 'ambiguous' || slot.classificationRequired).length,
        hasOpenSlots: classChoiceSlots.some(slot => slot.status === 'open'),
        hasAmbiguousSlots: classChoiceSlots.some(slot => slot.status === 'ambiguous' || slot.classificationRequired),
        openSlots: classChoiceSlots.filter(slot => slot.status === 'open'),
        ambiguousSlots: classChoiceSlots.filter(slot => slot.status === 'ambiguous' || slot.classificationRequired),
        featOpen: classFeatLedger.open,
        talentOpen: classTalentLedger.open,
      },
      byClass: this._buildClassLedgerSummaries(classFeatSlots, classTalentSlots),
      tasks: this._buildSheetTasks({
        abilityLedger,
        generalFeatLedger,
        classFeatLedger,
        heroicTalentLedger,
        classTalentLedger,
        derivedStats,
      }),
    };
  }

  _buildLedgerSummary(type, label, slots = [], route = {}) {
    const normalizedSlots = Array.isArray(slots) ? slots : [];
    const expected = normalizedSlots.reduce((sum, slot) => sum + (Number(slot.count) || 0), 0);
    const filled = normalizedSlots.reduce((sum, slot) => sum + (Number(slot.filledCount ?? (slot.status === 'filled' ? slot.count : 0)) || 0), 0);
    const ambiguous = normalizedSlots.reduce((sum, slot) => sum + (Number(slot.ambiguousCount ?? ((slot.status === 'ambiguous' || slot.classificationRequired) ? slot.count : 0)) || 0), 0);
    const open = normalizedSlots.reduce((sum, slot) => sum + (Number(slot.openCount ?? (slot.status === 'open' ? slot.count : 0)) || 0), 0);
    const overfilled = normalizedSlots.reduce((sum, slot) => sum + (Number(slot.overfilledCount ?? (slot.status === 'overfilled' ? 1 : 0)) || 0), 0);
    const ambiguousSlots = normalizedSlots.filter(slot => slot.status === 'ambiguous' || slot.classificationRequired);
    return {
      type,
      label,
      expected,
      filled,
      ambiguous,
      current: filled + ambiguous + overfilled,
      open,
      missing: open,
      overfilled,
      hasOpenSlots: open > 0,
      hasAmbiguousSlots: ambiguous > 0,
      hasOverfilledSlots: overfilled > 0,
      statusLabel: open > 0 ? `${open} missing` : (ambiguous > 0 ? `${ambiguous} needs classification` : (overfilled > 0 ? `${overfilled} extra` : 'Resolved')),
      statusTone: open > 0 ? 'warn' : (ambiguous > 0 ? 'neutral' : (overfilled > 0 ? 'danger' : 'ok')),
      slots: normalizedSlots,
      openSlots: normalizedSlots.filter(slot => slot.status === 'open'),
      ambiguousSlots,
      overfilledSlots: normalizedSlots.filter(slot => slot.status === 'overfilled'),
      classificationRequired: ambiguous > 0,
      ...route,
    };
  }

  _buildClassLedgerSummaries(classFeatSlots = [], classTalentSlots = []) {
    const byClass = new Map();
    const add = (slot, key) => {
      const classId = slot.classId || 'unknown';
      const entry = byClass.get(classId) || {
        classId,
        className: slot.className || titleCase(classId),
        classLevel: 0,
        classFeats: { expected: 0, filled: 0, ambiguous: 0, open: 0, overfilled: 0 },
        classTalents: { expected: 0, filled: 0, ambiguous: 0, open: 0, overfilled: 0 },
      };
      entry.classLevel = Math.max(entry.classLevel || 0, Number(slot.classLevel || 0) || 0);
      const ledger = entry[key];
      ledger.expected += Number(slot.count || 0) || 0;
      ledger.filled += Number(slot.filledCount ?? (slot.status === 'filled' ? slot.count : 0)) || 0;
      ledger.ambiguous += Number(slot.ambiguousCount ?? ((slot.status === 'ambiguous' || slot.classificationRequired) ? slot.count : 0)) || 0;
      ledger.open += Number(slot.openCount ?? (slot.status === 'open' ? slot.count : 0)) || 0;
      ledger.overfilled += Number(slot.overfilledCount ?? (slot.status === 'overfilled' ? 1 : 0)) || 0;
      byClass.set(classId, entry);
    };
    for (const slot of classFeatSlots) add(slot, 'classFeats');
    for (const slot of classTalentSlots) add(slot, 'classTalents');
    return Array.from(byClass.values()).sort((a, b) => a.className.localeCompare(b.className));
  }


  _toSheetDerivedStatsAudit(derivedStats = {}) {
    const rows = Array.isArray(derivedStats?.rows) ? derivedStats.rows : [];
    const normalizedRows = rows.map((row, index) => {
      const id = row?.id || row?.key || `derived-stat-${index}`;
      const label = row?.label || row?.name || 'Derived Stat';
      const needsAttention = row?.needsAttention === true || row?.status === 'issue' || row?.status === 'warning' || row?.status === 'unavailable' || !!row?.issue;
      const targetTab = row?.targetTab || row?.tab || 'abilities';
      const sheetAnchor = row?.sheetAnchor || 'derived-class-stats';
      const primaryAction = row?.primaryAction || {
        action: 'open-audit-target',
        actionType: 'open-sheet-anchor',
        label: 'Open Abilities',
        tab: targetTab,
        sheetAnchor,
        rowId: id,
      };
      return {
        id,
        type: row?.type || 'derived-stat',
        label,
        expected: row?.expected ?? row?.expectedValue ?? null,
        expectedLabel: row?.expectedLabel || (row?.expected !== undefined ? String(row.expected) : 'Unknown'),
        current: row?.current ?? row?.currentValue ?? null,
        currentLabel: row?.currentLabel || (row?.current !== undefined ? String(row.current) : 'Unknown'),
        status: row?.status || (needsAttention ? 'review' : 'ok'),
        statusLabel: row?.statusLabel || row?.issue || (needsAttention ? 'Review needed' : 'OK'),
        tone: row?.tone || (needsAttention ? 'warn' : 'ok'),
        needsAttention,
        issue: row?.issue || '',
        detail: row?.detail || '',
        targetTab,
        sheetAnchor,
        primaryAction,
        actions: Array.isArray(row?.actions) && row.actions.length ? row.actions : [primaryAction],
      };
    });
    const issueCount = Number(derivedStats?.issueCount ?? normalizedRows.filter(row => row.needsAttention).length) || 0;
    return {
      kind: derivedStats?.kind || 'swse-derived-class-stat-audit-sheet',
      status: derivedStats?.status || (issueCount > 0 ? 'review' : 'ok'),
      hasIssues: derivedStats?.hasIssues === true || issueCount > 0,
      issueCount,
      rows: normalizedRows,
      warnings: Array.isArray(derivedStats?.warnings) ? derivedStats.warnings : [],
      expected: derivedStats?.expected || {},
      current: derivedStats?.current || {},
      classBreakdown: Array.isArray(derivedStats?.classBreakdown) ? derivedStats.classBreakdown : [],
    };
  }

  _buildSheetTasks({ abilityLedger, generalFeatLedger, classFeatLedger, heroicTalentLedger, classTalentLedger, derivedStats } = {}) {
    const ledgers = [abilityLedger, generalFeatLedger, classFeatLedger, heroicTalentLedger, classTalentLedger].filter(Boolean);
    const tasks = [];
    for (const ledger of ledgers) {
      const missing = Number(ledger.open || 0) || 0;
      const ambiguous = Number(ledger.ambiguous || 0) || 0;
      if (missing <= 0 && ambiguous <= 0) continue;
      const needsClassification = missing <= 0 && ambiguous > 0;
      const slots = needsClassification ? (ledger.ambiguousSlots || []) : (ledger.openSlots || []);
      const firstSlot = Array.isArray(slots) ? slots[0] : null;
      const primaryAction = firstSlot?.primaryAction || firstSlot?.remediation?.primaryAction || null;
      tasks.push({
        key: `${ledger.type}:${needsClassification ? 'classify' : 'missing'}`,
        type: ledger.type,
        taskType: needsClassification ? 'classification' : 'missing',
        label: ledger.label,
        count: needsClassification ? ambiguous : missing,
        ambiguousCount: ambiguous,
        missingCount: missing,
        slotCount: Array.isArray(slots) ? slots.length : (needsClassification ? ambiguous : missing),
        tab: ledger.tab || (ledger.type === 'ability-increase' ? 'abilities' : 'talents'),
        sheetAnchor: ledger.sheetAnchor || (ledger.type === 'ability-increase' ? 'ability-increases' : 'talent-ledger'),
        stepId: primaryAction?.stepId || ledger.stepId || ledger.type,
        job: needsClassification ? 'classify-existing-progression-item' : (ledger.job || ledger.type),
        routeId: primaryAction?.routeId || 'sheet',
        action: primaryAction,
        actionLabel: primaryAction?.label || (needsClassification ? 'Classify' : 'Resolve'),
        detail: slots.map(slot => slot.label || slot.source).filter(Boolean),
      });
    }
    const derivedIssueCount = Number(derivedStats?.issueCount || 0) || 0;
    if (derivedIssueCount > 0) {
      const issueRows = (Array.isArray(derivedStats?.rows) ? derivedStats.rows : []).filter(row => row?.needsAttention);
      const firstRow = issueRows[0] || {};
      tasks.push({
        key: 'derived-stats:review',
        type: 'derived-stats',
        taskType: 'review',
        label: 'Derived class stats',
        count: derivedIssueCount,
        missingCount: 0,
        ambiguousCount: 0,
        slotCount: issueRows.length || derivedIssueCount,
        tab: firstRow.targetTab || 'abilities',
        sheetAnchor: firstRow.sheetAnchor || 'derived-class-stats',
        stepId: null,
        job: 'review-derived-class-stats',
        routeId: 'sheet',
        action: firstRow.primaryAction || null,
        actionLabel: firstRow.primaryAction?.label || 'Open Abilities',
        detail: issueRows.map(row => row.label || row.issue).filter(Boolean),
      });
    }
    return tasks;
  }


  _buildGeneralFeatSlots(actor, heroicLevel) {
    const slots = [];
    const maxLevel = Math.max(0, Number(heroicLevel || 0) || 0);
    for (const level of GENERAL_FEAT_LEVELS.filter(entry => Number(entry) <= maxLevel)) {
      slots.push({
        id: `general-feat-level-${level}`,
        type: 'general-feat',
        characterLevel: level,
        levelLabel: `Level ${level}`,
        count: 1,
        filledCount: 0,
        openCount: 1,
        status: 'open',
        label: `Level ${level} General Feat`,
        source: `Character Level ${level}`,
        filledBy: null,
        filledByName: null,
      });
    }

    const bonusCount = this._getActorBonusGeneralFeatCount(actor, maxLevel);
    for (let index = 0; index < bonusCount; index += 1) {
      slots.push({
        id: `general-feat-bonus-${index + 1}`,
        type: 'general-feat',
        characterLevel: 1,
        levelLabel: 'Bonus',
        count: 1,
        filledCount: 0,
        openCount: 1,
        status: 'open',
        label: `Bonus General Feat ${index + 1}`,
        source: 'Species / bonus feat',
        filledBy: null,
        filledByName: null,
      });
    }

    const pools = this._buildFeatPools(actor);
    const consumed = this._fillLinearSlots(slots, pools.general);
    this._appendOverfilledSlots(slots, pools.general, 'general-feat-extra', 'Extra general feat', consumed);
    return slots;
  }

  _getActorBonusGeneralFeatCount(actor, heroicLevel) {
    if (heroicLevel <= 0) return 0;
    const requiredAtLevelOne = Math.max(0, Number(
      actor?.system?.featsRequired
      ?? actor?.flags?.swse?.speciesFeatsRequired
      ?? actor?.system?.speciesFeatsRequired
      ?? 0
    ) || 0);
    if (requiredAtLevelOne > 1) return requiredAtLevelOne - 1;
    const speciesKey = normalizeNameKey(actor?.system?.species || actor?.system?.race || actor?.flags?.swse?.species || '');
    const traitIds = [
      ...(Array.isArray(actor?.flags?.swse?.speciesTraitIds) ? actor.flags.swse.speciesTraitIds : []),
      ...Object.keys(actor?.flags?.swse?.speciesTraits || {}),
    ].map(normalizeNameKey);
    if (speciesKey === 'human' || traitIds.includes('bonusfeat')) return 1;
    return 0;
  }

  _buildHeroicTalentSlots(actor, heroicLevel) {
    const slots = [];
    const maxLevel = Math.max(0, Number(heroicLevel || 0) || 0);
    for (let level = 1; level <= maxLevel; level += 1) {
      if (!TalentCadenceEngine.grantsHeroicTalent(level)) continue;
      slots.push({
        id: `heroic-talent-level-${level}`,
        type: 'heroic-talent',
        characterLevel: level,
        levelLabel: `Level ${level}`,
        count: 1,
        filledCount: 0,
        openCount: 1,
        status: 'open',
        label: `Level ${level} Heroic Talent`,
        source: `Heroic Level ${level}`,
        filledBy: null,
        filledByName: null,
      });
    }

    const pools = this._buildTalentPools(actor);
    const consumed = this._fillLinearSlots(slots, pools.heroic);
    this._appendOverfilledSlots(slots, pools.heroic, 'heroic-talent-extra', 'Extra heroic talent', consumed);
    return slots;
  }

  _fillLinearSlots(slots = [], pool = []) {
    const consumed = new Set();
    const candidates = Array.isArray(pool) ? pool : [];
    let cursor = 0;
    for (const slot of slots) {
      if (slot.status === 'filled') continue;
      const item = candidates[cursor];
      if (!item) break;
      cursor += 1;
      consumed.add(item);
      slot.status = 'filled';
      slot.filledCount = Number(slot.count || 1) || 1;
      slot.openCount = 0;
      slot.filledBy = item.id || item._id || null;
      slot.filledByName = item.name || 'Recorded selection';
      slot.selections = [item.name || 'Recorded selection'];
    }
    return consumed;
  }

  _appendOverfilledSlots(slots = [], pool = [], idPrefix = 'extra', label = 'Extra selection', consumed = new Set()) {
    for (const item of (Array.isArray(pool) ? pool : []).filter(entry => !consumed.has(entry))) {
      slots.push({
        id: `${idPrefix}-${item.id || item._id || normalizeNameKey(item.name)}`,
        type: slots[0]?.type || idPrefix,
        count: 0,
        filledCount: 0,
        openCount: 0,
        overfilledCount: 1,
        status: 'overfilled',
        label,
        source: 'Actor item ledger',
        filledBy: item.id || item._id || null,
        filledByName: item.name || 'Extra selection',
        selections: [item.name || 'Extra selection'],
      });
    }
  }

  _buildFeatPools(actor) {
    const hints = this._readProgressionSelectionHints(actor, 'feats');
    const classPool = [];
    const generalPool = [];
    const unknownPool = [];
    for (const item of readActorItems(actor).filter(entry => entry?.type === 'feat')) {
      if (isAutomaticProgressionItem(item)) continue;
      const hint = this._getSelectionHintForItem(item, hints);
      const slot = this._slotTypeForItemOrHint(item, hint);
      const source = itemSourceToken(item);
      const hasClassSource = slot === 'class'
        || source === 'class'
        || source === 'class-feat'
        || source === 'multiclass-starting-feat'
        || !!itemClassId(item)
        || !!itemClassName(item);
      if (hasClassSource) classPool.push(item);
      else if (slot === 'heroic' || slot === 'general' || source === 'general' || source === 'heroic' || source === '') generalPool.push(item);
      else unknownPool.push(item);
    }
    return { general: generalPool, class: classPool, unknown: unknownPool };
  }

  _buildTalentPools(actor) {
    const hints = this._readProgressionSelectionHints(actor, 'talents');
    const heroic = [];
    const classPool = [];
    const unknown = [];
    for (const item of readActorItems(actor).filter(entry => entry?.type === 'talent')) {
      if (isAutomaticProgressionItem(item)) continue;
      const hint = this._getSelectionHintForItem(item, hints);
      const slot = this._slotTypeForItemOrHint(item, hint);
      const source = itemSourceToken(item);
      const hasClassSource = slot === 'class'
        || source === 'class'
        || source === 'class-talent'
        || !!itemClassId(item)
        || !!itemClassName(item);
      if (hasClassSource) classPool.push(item);
      else if (slot === 'heroic' || slot === 'general' || source === 'heroic' || source === 'general') heroic.push(item);
      else unknown.push(item);
    }
    return { heroic, class: classPool, unknown };
  }

  _slotTypeForItemOrHint(item = {}, hint = null) {
    return normalizeSourceToken(
      itemSlotType(item)
      || hint?.slotType
      || hint?.source
      || itemSourceToken(item)
      || ''
    );
  }

  _readProgressionSelectionHints(actor, key) {
    const hints = [];
    const collectSession = (session) => {
      const values = session?.draftSelections?.[key];
      if (!Array.isArray(values)) return;
      for (const entry of values) {
        if (!entry) continue;
        hints.push({
          id: entry.id || entry._id || null,
          name: entry.name || entry.label || null,
          slotType: entry.slotType || entry.source || null,
          source: entry.source || entry.slotType || null,
          slotKey: entry.slotKey || null,
          stepId: entry.stepId || null,
          classId: entry.classId || entry.sourceClassId || null,
          className: entry.className || entry.sourceClass || null,
        });
      }
    };
    collectSession(actor?.flags?.['foundryvtt-swse']?.progression?.chargen?.session);
    collectSession(actor?.flags?.['foundryvtt-swse']?.progression?.levelup?.session);
    return hints;
  }

  _getSelectionHintForItem(item = {}, hints = []) {
    if (!Array.isArray(hints) || !hints.length) return null;
    const idCandidates = new Set([
      item?.id,
      item?._id,
      itemProgressionMeta(item)?.selectionId,
      item?.flags?.swse?.id,
      item?.system?.slug,
    ].map(value => String(value || '').trim()).filter(Boolean));
    const nameKey = normalizeNameKey(item?.name);
    return hints.find(hint => {
      const hintIds = [hint.id, hint._id].map(value => String(value || '').trim()).filter(Boolean);
      if (hintIds.some(value => idCandidates.has(value))) return true;
      return nameKey && normalizeNameKey(hint.name) === nameKey;
    }) || null;
  }

  _buildClassSummaries(actor) {
    const summaries = new Map();
    const upsert = ({ item = null, ledger = null } = {}) => {
      const seed = item || ledger || {};
      const model = resolveClassModel(item || ledger || {
        id: ledger?.classId,
        classId: ledger?.classId,
        name: ledger?.className,
        className: ledger?.className,
      }) || item || seed;
      const classId = normalizeClassKey(model || item || ledger)
        || normalizeClassKey(item?.system?.classId || ledger?.classId || item?.name || ledger?.className);
      if (!classId) return;
      const className = model?.name || item?.name || ledger?.className || titleCase(classId);
      const itemLevel = item ? readClassLevel(item) : 0;
      const ledgerLevel = Number(ledger?.level || 0) || 0;
      const lookupLevel = highestClassLevelFor(actor, [classId, className, item?.system?.classId, item?.name, ledger?.classId, ledger?.className]);
      const level = Math.max(itemLevel, ledgerLevel, lookupLevel, 0);
      const key = classId || normalizeNameKey(className);
      const previous = summaries.get(key);
      const summary = {
        ...(previous || {}),
        itemId: previous?.itemId || item?.id || null,
        classId,
        className: previous?.className || className,
        level: Math.max(Number(previous?.level || 0) || 0, level),
        model: previous?.model || model,
        item: previous?.item || item,
        sources: [
          ...(previous?.sources || []),
          ...(item ? ['class-item'] : []),
          ...(ledger ? ['progression-ledger'] : []),
        ],
      };
      summary.isNonheroic = isNonheroicClassSummary(summary);
      summary.isPrestige = isPrestigeClassSummary(summary);
      summary.isHeroic = !summary.isNonheroic;
      summaries.set(key, summary);
    };

    for (const item of readActorItems(actor).filter(entry => entry?.type === 'class')) upsert({ item });
    for (const ledger of readActorClassLevelLedger(actor)) upsert({ ledger });

    return Array.from(summaries.values()).filter(entry => entry.level > 0);
  }

  _toPublicClassSummary(summary = {}) {
    return {
      itemId: summary.itemId || null,
      classId: summary.classId || '',
      className: summary.className || titleCase(summary.classId),
      level: Number(summary.level || 0) || 0,
      sources: Array.from(new Set(Array.isArray(summary.sources) ? summary.sources : [])),
      levelSource: this._classSummaryLevelSource(summary),
      sourceConfidence: this._classSummarySourceConfidence(summary),
      isHeroic: summary.isHeroic !== false,
      isNonheroic: summary.isNonheroic === true,
      isPrestige: summary.isPrestige === true,
    };
  }

  _classSummaryLevelSource(summary = {}) {
    const sources = Array.isArray(summary.sources) ? summary.sources : [];
    if (sources.includes('progression-ledger')) return 'system.progression.classLevels';
    if (sources.includes('class-item')) return 'owned class item';
    return 'unknown';
  }

  _classSummarySourceConfidence(summary = {}) {
    const sources = Array.isArray(summary.sources) ? summary.sources : [];
    if (sources.includes('progression-ledger') && sources.includes('class-item')) return 'high';
    if (sources.includes('progression-ledger')) return 'medium-high';
    if (sources.includes('class-item')) return 'medium';
    return 'low';
  }

  _buildAbilityIncreaseSlots(actor, totalLevel) {
    const expectedLevels = [];
    const maxLevel = Math.min(Math.max(0, Number(totalLevel) || 0), 20);
    for (let level = 4; level <= maxLevel; level += 4) {
      expectedLevels.push(level);
    }

    const history = this._readAbilityIncreaseHistory(actor);
    const byLevel = new Map();
    for (const entry of history) {
      const level = abilityIncreaseRecordLevel(entry);
      if (!level) continue;
      const previous = byLevel.get(level) || { level, count: 0, increases: {} };
      const increases = normalizeAbilityIncreases(entry);
      for (const [key, delta] of Object.entries(increases)) {
        previous.increases[key] = Math.max(previous.increases[key] || 0, delta);
      }
      previous.count = Math.max(previous.count || 0, abilityIncreaseCount(entry));
      byLevel.set(level, previous);
    }

    return expectedLevels.map(level => {
      const expectedCount = this._abilityIncreaseCountForActor(actor, level);
      const record = byLevel.get(level) || null;
      const filledCount = Math.min(expectedCount, Number(record?.count || 0) || 0);
      const openCount = Math.max(0, expectedCount - filledCount);
      const selections = Object.entries(record?.increases || {})
        .filter(([, delta]) => Number(delta || 0) > 0)
        .map(([key, delta]) => `${ABILITY_LABELS[key] || key.toUpperCase()} +${delta}`);

      return {
        id: `ability-increase-level-${level}`,
        type: 'ability-increase',
        characterLevel: level,
        levelLabel: `Level ${level}`,
        count: expectedCount,
        filledCount,
        openCount,
        status: openCount > 0 ? 'open' : 'filled',
        label: `Level ${level} Ability Increase`,
        source: `Character Level ${level}`,
        selections,
      };
    });
  }

  _readAbilityIncreaseHistory(actor) {
    const progression = actor?.system?.progression || {};
    const history = Array.isArray(progression.abilityIncreaseHistory) ? [...progression.abilityIncreaseHistory] : [];
    const legacy = progression.lastAbilityIncrease;
    if (legacy && typeof legacy === 'object') {
      const legacyLevel = abilityIncreaseRecordLevel(legacy);
      const alreadyTracked = legacyLevel && history.some(entry => abilityIncreaseRecordLevel(entry) === legacyLevel);
      if (!alreadyTracked) history.push(legacy);
    }
    return history;
  }

  _abilityIncreaseCountForActor(actor, _level) {
    const isDroid = actor?.type === 'droid' || actor?.system?.isDroid === true;
    const isNonheroic = actor?.system?.class?.id === 'nonheroic'
      || actor?.system?.class?.name === 'Nonheroic'
      || readActorItems(actor).some(item => item?.type === 'class' && String(item?.name || '').toLowerCase() === 'nonheroic');
    if (isDroid || isNonheroic) return 1;
    return 2;
  }

  _buildClassChoiceSlots(actor, classSummaries = []) {
    const slots = [];
    for (const classSummary of classSummaries) {
      for (let classLevel = 1; classLevel <= classSummary.level; classLevel += 1) {
        const levelEntry = getClassLevelProgressionEntry(classSummary.model, classLevel) || {};
        const features = Array.isArray(levelEntry.features) ? levelEntry.features : [];
        let classChoiceCountForLevel = 0;
        for (const feature of features) {
          const type = featureType(feature);
          const slotKind = CHOICE_FEATURE_TYPES[type];
          if (!slotKind) continue;
          const quantity = featureQuantity(feature);
          for (let index = 0; index < quantity; index += 1) {
            slots.push({
              id: `${classSummary.classId}-${classLevel}-${slotKind}-${index + 1}`,
              type: slotKind,
              classId: classSummary.classId,
              className: classSummary.className,
              classLevel,
              levelLabel: `${classSummary.className} ${classLevel}`,
              featureType: type,
              featureName: feature?.name || feature?.label || titleCase(slotKind),
              count: 1,
              filledCount: 0,
              openCount: 1,
              status: 'open',
              filledBy: null,
              filledByName: null,
              label: `${classSummary.className} ${classLevel} ${titleCase(slotKind)}`,
              source: `${classSummary.className} ${classLevel}`,
            });
            if (slotKind === 'class-feat' || slotKind === 'class-talent') classChoiceCountForLevel += 1;
          }
        }

        if (classChoiceCountForLevel === 0 && !classSummary.isNonheroic && !levelEntry) {
          swseLogger.warn('[ProgressionReconciler] Missing class progression entry; no fallback cadence applied', {
            classId: classSummary.classId,
            className: classSummary.className,
            classLevel,
            level: classLevel,
            source: 'class-compendium-ssot',
          });
        }
      }
    }

    this._fillClassChoiceSlots(actor, slots, classSummaries);
    return slots;
  }

  _fillClassChoiceSlots(actor, slots = [], classSummaries = []) {
    const featPools = this._buildFeatPools(actor);
    const talentPools = this._buildTalentPools(actor);
    const poolsByType = {
      'class-feat': featPools.class,
      'class-talent': talentPools.class,
      'force-secret': readActorItems(actor).filter(isKnownForceSecretItem),
      'force-technique': readActorItems(actor).filter(isKnownForceTechniqueItem),
      'medical-secret': readActorItems(actor).filter(item => item?.type === 'feat' && item?.system?.medicalSecret),
      'starship-maneuver': readActorItems(actor).filter(item => item?.type === 'maneuver' || item?.type === 'starshipManeuver'),
      'force-power': readActorItems(actor).filter(item => item?.type === 'force-power'),
    };

    const singleClass = classSummaries.length === 1 ? classSummaries[0] : null;
    const consumed = new Set();
    for (const slot of slots) {
      const pool = poolsByType[slot.type] || [];
      const strict = pool.find(item => !consumed.has(item) && this._itemMatchesClassSlot(item, slot, { allowUnknownClass: false }));
      const flexible = strict || pool.find(item => !consumed.has(item) && this._itemMatchesClassSlot(item, slot, { allowUnknownClass: !!singleClass }));
      if (!flexible) continue;
      consumed.add(flexible);
      slot.status = 'filled';
      slot.filledCount = 1;
      slot.openCount = 0;
      slot.filledBy = flexible.id || flexible._id || null;
      slot.filledByName = flexible.name || 'Recorded selection';
      slot.selections = [flexible.name || 'Recorded selection'];
    }

    for (const [slotType, pool] of Object.entries(poolsByType)) {
      for (const item of pool.filter(entry => !consumed.has(entry))) {
        if (slotType !== 'class-feat' && slotType !== 'class-talent') continue;
        const assignedClass = this._resolveItemClassForOverfill(item, classSummaries);
        slots.push({
          id: `${slotType}-extra-${item.id || item._id || normalizeNameKey(item.name)}`,
          type: slotType,
          classId: assignedClass?.classId || itemClassId(item) || 'unassigned',
          className: assignedClass?.className || itemClassName(item) || 'Unassigned Class',
          classLevel: assignedClass?.level || itemClassLevel(item) || 0,
          levelLabel: 'Extra',
          count: 0,
          filledCount: 0,
          openCount: 0,
          overfilledCount: 1,
          status: 'overfilled',
          filledBy: item.id || item._id || null,
          filledByName: item.name || 'Extra selection',
          label: `Extra ${titleCase(slotType)}`,
          source: 'Actor item ledger',
          selections: [item.name || 'Extra selection'],
        });
      }
    }
  }

  _itemMatchesClassSlot(item = {}, slot = {}, { allowUnknownClass = false } = {}) {
    const slotClassId = slot.classId || '';
    const slotClassName = normalizeText(slot.className).toLowerCase();
    const slotClassLevel = normalizeLevel(slot.classLevel);
    const classId = itemClassId(item);
    const className = itemClassName(item);
    const classLevel = itemClassLevel(item);
    if (classLevel && slotClassLevel && classLevel !== slotClassLevel) return false;
    if (classId && slotClassId && classId !== slotClassId) return false;
    if (className && slotClassName && className !== slotClassName) return false;
    if (classId || className) return true;
    return allowUnknownClass;
  }

  _resolveItemClassForOverfill(item = {}, classSummaries = []) {
    const classId = itemClassId(item);
    const className = itemClassName(item);
    if (classId || className) {
      return classSummaries.find(summary => (classId && summary.classId === classId) || (className && normalizeText(summary.className).toLowerCase() === className)) || null;
    }
    return classSummaries.length === 1 ? classSummaries[0] : null;
  }

  _buildDerivedStatsAudit(actor, classSummaries = [], { totalHeroicLevel = 0 } = {}) {
    const summaries = Array.isArray(classSummaries) ? classSummaries : [];
    const expected = this._computeExpectedDerivedStats(actor, summaries, totalHeroicLevel);
    const current = this._readCurrentDerivedStats(actor);
    const rows = [];
    const warnings = [];

    rows.push(this._buildDerivedStatRow({
      id: 'hp-max',
      label: 'Hit Points',
      type: 'hp',
      expectedValue: expected.hp.knownMinimum,
      expectedLabel: expected.hp.expectedLabel,
      currentValue: current.hpMax,
      currentLabel: Number.isFinite(current.hpMax) ? String(current.hpMax) : 'Unknown',
      status: expected.hp.status,
      issue: expected.hp.issue,
      detail: expected.hp.detail,
      targetTab: 'abilities',
      sheetAnchor: 'derived-class-stats',
    }));

    rows.push(this._buildDerivedStatRow({
      id: 'bab',
      label: 'Base Attack Bonus',
      type: 'bab',
      expectedValue: expected.bab.value,
      expectedLabel: expected.bab.status === 'unavailable' ? 'Unavailable' : `+${expected.bab.value}`,
      currentValue: current.bab,
      currentLabel: Number.isFinite(current.bab) ? `+${current.bab}` : 'Unknown',
      status: expected.bab.status,
      issue: expected.bab.issue || this._compareExactDerivedValue('BAB', current.bab, expected.bab.value, expected.bab.status),
      detail: expected.bab.detail,
      targetTab: 'abilities',
      sheetAnchor: 'derived-class-stats',
    }));

    for (const key of DEFENSE_KEYS) {
      const label = `${DEFENSE_LABELS[key]} Class Defense`;
      const expectedDefense = expected.defenses[key] || { value: 0, status: 'ok' };
      const currentDefense = current.classDefenses[key];
      rows.push(this._buildDerivedStatRow({
        id: `${key}-class-defense`,
        label,
        type: 'class-defense',
        expectedValue: expectedDefense.value,
        expectedLabel: expectedDefense.status === 'unavailable' ? 'Unavailable' : `+${expectedDefense.value}`,
        currentValue: currentDefense,
        currentLabel: Number.isFinite(currentDefense) ? `+${currentDefense}` : 'Unknown',
        status: expectedDefense.status,
        issue: expectedDefense.issue || this._compareExactDerivedValue(label, currentDefense, expectedDefense.value, expectedDefense.status),
        detail: expectedDefense.detail,
        targetTab: 'abilities',
        sheetAnchor: 'derived-class-stats',
      }));
    }

    for (const row of rows) {
      if (row.needsAttention && row.issue) warnings.push(`${row.label}: ${row.issue}`);
    }

    return {
      kind: 'swse-derived-class-stat-audit',
      status: rows.some(row => row.status === 'issue') ? 'needs-attention' : (rows.some(row => row.status === 'warning' || row.status === 'unavailable') ? 'review' : 'ok'),
      hasIssues: rows.some(row => row.needsAttention),
      issueCount: rows.filter(row => row.needsAttention).length,
      expected: {
        hpMaxKnownMinimum: expected.hp.knownMinimum,
        bab: expected.bab.value,
        classDefenses: Object.fromEntries(DEFENSE_KEYS.map(key => [key, expected.defenses[key]?.value ?? null])),
      },
      current: {
        hpMax: current.hpMax,
        bab: current.bab,
        classDefenses: current.classDefenses,
      },
      rows,
      warnings,
      classBreakdown: expected.classBreakdown,
    };
  }

  _computeExpectedDerivedStats(actor, classSummaries = [], totalHeroicLevel = 0) {
    const heroicSummaries = (Array.isArray(classSummaries) ? classSummaries : []).filter(summary => !summary.isNonheroic);
    const firstClass = this._resolveFirstHeroicClassSummary(actor, heroicSummaries);
    const conMod = this._abilityModFromActor(actor, 'con');
    const firstClassBaseHp = firstClass ? this._readClassBaseHp(firstClass) : null;
    const hpRecords = this._readHpGainRecords(actor);
    const hpGainSum = hpRecords.reduce((sum, record) => sum + (Number(record.amount || 0) || 0), 0);
    const knownMinimum = Number.isFinite(firstClassBaseHp) ? Math.max(1, firstClassBaseHp + conMod + hpGainSum) : null;
    const levelsAfterFirst = Math.max(0, Number(totalHeroicLevel || 0) - 1);
    const missingHpRecords = Math.max(0, levelsAfterFirst - hpRecords.length);

    const hp = {
      knownMinimum,
      status: 'ok',
      expectedLabel: knownMinimum === null ? 'Unavailable' : `At least ${knownMinimum}`,
      issue: '',
      detail: '',
    };
    if (knownMinimum === null) {
      hp.status = 'unavailable';
      hp.issue = 'No heroic class base HP could be resolved from the class SSOT.';
      hp.detail = 'HP audit requires at least one heroic class with base HP data.';
    } else if (missingHpRecords > 0) {
      hp.status = 'warning';
      hp.expectedLabel = `At least ${knownMinimum}; ${missingHpRecords} HP gain record${missingHpRecords === 1 ? '' : 's'} missing`;
      hp.issue = `${missingHpRecords} level-up HP gain record${missingHpRecords === 1 ? '' : 's'} missing.`;
      hp.detail = 'Current HP may be stale after class drops because HP gains are not fully recorded for every level after 1st.';
    }

    let babValue = 0;
    let babStatus = 'ok';
    let babIssue = '';
    const defenses = Object.fromEntries(DEFENSE_KEYS.map(key => [key, { value: 0, status: 'ok', issue: '', detail: '' }]));
    const classBreakdown = [];

    for (const summary of (Array.isArray(classSummaries) ? classSummaries : [])) {
      const classLevel = normalizeLevel(summary.level);
      if (!classLevel) continue;
      const levelEntry = getClassLevelProgressionEntry(summary.model, classLevel) || {};
      const bab = this._readClassBabAtLevel(summary, classLevel, levelEntry);
      if (bab === null) {
        babStatus = 'unavailable';
        babIssue = `No BAB entry found for ${summary.className} ${classLevel}.`;
      } else {
        babValue += bab;
      }

      const classDefenses = this._readClassDefenseBonuses(summary);
      for (const key of DEFENSE_KEYS) {
        defenses[key].value = Math.max(Number(defenses[key].value || 0) || 0, Number(classDefenses[key] || 0) || 0);
      }

      classBreakdown.push({
        classId: summary.classId || '',
        className: summary.className || titleCase(summary.classId),
        level: classLevel,
        bab: bab === null ? null : bab,
        fortitude: Number(classDefenses.fortitude || 0) || 0,
        reflex: Number(classDefenses.reflex || 0) || 0,
        will: Number(classDefenses.will || 0) || 0,
      });
    }

    return {
      hp,
      bab: {
        value: babValue,
        status: babStatus,
        issue: babIssue,
        detail: 'BAB is additive across all class levels and reads cumulative BAB from each class progression row.',
      },
      defenses,
      classBreakdown,
    };
  }

  _buildDerivedStatRow({ id, label, type, expectedValue, expectedLabel, currentValue, currentLabel, status = 'ok', issue = '', detail = '', targetTab = 'abilities', sheetAnchor = 'derived-class-stats' } = {}) {
    let finalStatus = status || 'ok';
    let finalIssue = issue || '';
    if (!finalIssue && finalStatus !== 'unavailable' && Number.isFinite(Number(expectedValue)) && Number.isFinite(Number(currentValue))) {
      const current = Number(currentValue);
      const expected = Number(expectedValue);
      if (type === 'hp' && current < expected) {
        finalStatus = 'issue';
        finalIssue = `Current ${label} is below the known expected minimum.`;
      }
    }
    const needsAttention = finalStatus === 'issue' || finalStatus === 'warning' || finalStatus === 'unavailable' || !!finalIssue;
    const tone = finalStatus === 'issue' || finalStatus === 'unavailable' ? 'warn' : (finalStatus === 'warning' ? 'neutral' : 'ok');
    return {
      id,
      type,
      label,
      expected: expectedValue,
      expectedLabel: expectedLabel || (Number.isFinite(Number(expectedValue)) ? String(expectedValue) : 'Unknown'),
      current: currentValue,
      currentLabel: currentLabel || (Number.isFinite(Number(currentValue)) ? String(currentValue) : 'Unknown'),
      status: needsAttention ? (finalStatus === 'ok' ? 'issue' : finalStatus) : 'ok',
      statusLabel: needsAttention ? (finalIssue || 'Review needed') : 'OK',
      tone,
      needsAttention,
      issue: finalIssue,
      detail,
      targetTab,
      sheetAnchor,
      primaryAction: {
        action: 'open-audit-target',
        actionType: 'open-sheet-anchor',
        label: 'Open Abilities',
        tab: targetTab,
        sheetAnchor,
        rowId: id,
      },
      actions: [{
        action: 'open-audit-target',
        actionType: 'open-sheet-anchor',
        label: 'Open Abilities',
        tab: targetTab,
        sheetAnchor,
        rowId: id,
      }],
    };
  }

  _compareExactDerivedValue(label, currentValue, expectedValue, status = 'ok') {
    if (status === 'unavailable') return '';
    if (!Number.isFinite(Number(expectedValue))) return '';
    const expected = Number(expectedValue);
    if (!Number.isFinite(Number(currentValue))) {
      if (expected === 0) return '';
      return `${label} is not currently present on the actor.`;
    }
    const current = Number(currentValue);
    if (current !== expected) return `${label} should be ${expected >= 0 ? '+' : ''}${expected} from class progression but is ${current >= 0 ? '+' : ''}${current}.`;
    return '';
  }

  _readCurrentDerivedStats(actor) {
    const readDefenseClassBonus = (key) => {
      const values = [
        actor?.system?.derived?.defenses?.[key]?.classBonus,
        actor?.system?.defenses?.[key]?.classBonus,
        actor?.system?.defenses?.[key]?.class,
        actor?.system?.defenses?.[key]?.classBonusValue,
      ].map(value => Number(value)).filter(Number.isFinite);
      return values.length ? Math.max(...values) : null;
    };
    return {
      hpMax: this._firstFiniteNumber(actor?.system?.hp?.max, actor?.system?.derived?.hp?.max, actor?.system?.hitPoints?.max),
      bab: this._firstFiniteNumber(actor?.system?.derived?.bab, actor?.system?.bab?.total, actor?.system?.bab, actor?.system?.baseAttackBonus),
      classDefenses: Object.fromEntries(DEFENSE_KEYS.map(key => [key, readDefenseClassBonus(key)])),
    };
  }

  _firstFiniteNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  }

  _resolveFirstHeroicClassSummary(actor, classSummaries = []) {
    const actorClassId = normalizeClassKey(actor?.system?.class?.id || actor?.system?.class?.classId || actor?.system?.class?.sourceId);
    const actorClassName = normalizeNameKey(actor?.system?.class?.name || actor?.system?.class?.className);
    return classSummaries.find(summary => summary.classId === actorClassId || normalizeNameKey(summary.className) === actorClassName)
      || classSummaries.find(summary => summary.isHeroic !== false)
      || classSummaries[0]
      || null;
  }

  _readClassBaseHp(summary = {}) {
    const model = summary.model || {};
    const item = summary.item || {};
    return this._firstFiniteNumber(
      model?.system?.base_hp,
      model?.system?.baseHp,
      model?.base_hp,
      model?.baseHp,
      item?.system?.base_hp,
      item?.system?.baseHp,
      item?.system?.baseHP,
    );
  }

  _readHpGainRecords(actor) {
    const out = [];
    const append = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        for (const entry of value) append(entry);
        return;
      }
      if (typeof value !== 'object') return;
      const amount = Number(value.amount ?? value.hpGain ?? value.gain ?? 0) || 0;
      if (amount <= 0) return;
      const level = normalizeLevel(value.level ?? value.characterLevel ?? value.newLevel ?? value.targetLevel);
      out.push({ amount, level, method: value.method || value.hpGainMethod || null, timestamp: value.timestamp || null });
    };
    append(actor?.system?.progression?.hpGainHistory);
    append(actor?.system?.progression?.lastHpGain);
    const byKey = new Map();
    for (const record of out) {
      const key = record.level ? `level:${record.level}` : `amount:${record.amount}:time:${record.timestamp || ''}`;
      byKey.set(key, record);
    }
    return Array.from(byKey.values());
  }

  _abilityModFromActor(actor, key) {
    const abilityKey = String(key || '').toLowerCase().slice(0, 3);
    const candidates = [
      actor?.system?.derived?.attributes?.[abilityKey],
      actor?.system?.attributes?.[abilityKey],
      actor?.system?.abilities?.[abilityKey],
    ];
    for (const ability of candidates) {
      const explicit = Number(ability?.mod);
      if (Number.isFinite(explicit)) return explicit;
      const total = Number(ability?.total ?? ability?.value ?? ability?.score);
      if (Number.isFinite(total)) return Math.floor((total - 10) / 2);
      const base = Number(ability?.base ?? 10);
      if (Number.isFinite(base)) {
        const racial = Number(ability?.racial ?? ability?.species ?? 0) || 0;
        const enhancement = Number(ability?.enhancement ?? ability?.misc ?? 0) || 0;
        const temp = Number(ability?.temp ?? 0) || 0;
        return Math.floor((base + racial + enhancement + temp - 10) / 2);
      }
    }
    return 0;
  }

  _readClassBabAtLevel(summary = {}, classLevel = 0, levelEntry = {}) {
    if (summary.isNonheroic) {
      const index = Math.max(0, Math.min(NONHEROIC_BAB_PROGRESSION.length - 1, classLevel - 1));
      return NONHEROIC_BAB_PROGRESSION[index] ?? null;
    }
    const direct = Number(levelEntry?.bab);
    if (Number.isFinite(direct)) return direct;
    const progression = this._resolveClassLevelProgression(summary.model || summary.item || {});
    const row = progression.find(entry => Number(entry?.level || 0) === classLevel) || progression[classLevel - 1];
    const fromRow = Number(row?.bab);
    return Number.isFinite(fromRow) ? fromRow : null;
  }

  _resolveClassLevelProgression(classData = {}) {
    const candidates = [
      classData?._raw?.system?.level_progression,
      classData?._raw?.level_progression,
      classData?.system?.level_progression,
      classData?.system?.levelProgression,
      classData?.level_progression,
      classData?.levelProgressionArray,
      classData?.levelProgression,
      classData?._canonical?.levelProgression,
    ];
    for (const value of candidates) {
      if (Array.isArray(value)) return value.map((entry, index) => ({ level: Number(entry?.level || index + 1), ...(entry || {}) }));
      if (value && typeof value === 'object') {
        return Object.entries(value).map(([level, entry]) => ({ level: Number(level), ...(entry || {}) })).sort((a, b) => (a.level || 0) - (b.level || 0));
      }
    }
    return [];
  }

  _readClassDefenseBonuses(summary = {}) {
    const model = summary.model || {};
    const item = summary.item || {};
    const defenses = model?.system?.defenses || model?.defenses || item?.system?.defenses || {};
    return {
      fortitude: Number(defenses.fortitude ?? defenses.fort ?? defenses.fortitudeDefense ?? 0) || 0,
      reflex: Number(defenses.reflex ?? defenses.ref ?? defenses.reflexDefense ?? 0) || 0,
      will: Number(defenses.will ?? defenses.willpower ?? defenses.willDefense ?? 0) || 0,
    };
  }

  /**
   * Reconcile progression state after an upstream node changes.
   *
   * @param {string} changedNodeId - The node that just changed
   * @param {Actor} actor - The actor
   * @param {Object} progressionSession - Phase 1 canonical session
   * @param {Object} context
   * @param {ActiveStepComputer} context.activeStepComputer - Step computer
   * @param {string} context.currentStepId - Current step before reconciliation
   * @param {'chargen' | 'levelup'} context.mode - Progression mode
   * @param {string} context.subtype - Character subtype
   * @returns {Promise<Object>} Reconciliation report
   */
  async reconcileAfterCommit(
    changedNodeId,
    actor,
    progressionSession,
    context
  ) {
    const startTime = performance.now();
    const report = {
      changedNodeId,
      removed: [],
      dirty: [],
      purged: [],
      newActiveSteps: [],
      nextStepId: context.currentStepId,
      warnings: [],
      actionsTaken: [],
    };

    try {
      // Step 1: Identify downstream nodes affected by this change
      const affectedNodes = this._getAffectedNodes(changedNodeId);

      if (affectedNodes.length === 0) {
        swseLogger.debug('[ProgressionReconciler] No downstream nodes affected');
        return report;
      }

      swseLogger.log('[ProgressionReconciler] Reconciling after change to:', {
        changedNodeId,
        affectedCount: affectedNodes.length,
        affected: affectedNodes.map(n => n.nodeId),
      });

      // Step 2: Process each affected node
      for (const affected of affectedNodes) {
        const behavior = affected.behavior;

        switch (behavior) {
          case InvalidationBehavior.PURGE:
            await this._purgeNode(affected.nodeId, progressionSession);
            report.purged.push(affected.nodeId);
            report.actionsTaken.push(`Purged ${affected.nodeId}`);
            break;

          case InvalidationBehavior.DIRTY:
            this._markNodeDirty(affected.nodeId, progressionSession);
            report.dirty.push(affected.nodeId);
            report.actionsTaken.push(`Marked ${affected.nodeId} as dirty`);
            break;

          case InvalidationBehavior.RECOMPUTE:
            // Will be handled by recomputing active steps
            report.actionsTaken.push(`Marked ${affected.nodeId} for recompute`);
            break;

          case InvalidationBehavior.WARN:
            report.warnings.push(`Warning: ${affected.nodeId} may have stale selections`);
            report.actionsTaken.push(`Added warning for ${affected.nodeId}`);
            break;
        }
      }

      // Step 3: Recompute active step list
      const newActiveSteps = await context.activeStepComputer.computeActiveSteps(
        actor,
        context.mode,
        progressionSession,
        { subtype: context.subtype }
      );

      report.newActiveSteps = newActiveSteps;

      // Step 4: Check if current step was removed
      if (!newActiveSteps.includes(context.currentStepId)) {
        report.removed.push(context.currentStepId);

        // Find nearest safe step
        const currentIndex = newActiveSteps.length > 0
          ? Math.max(0, newActiveSteps.length - 1)
          : 0;

        report.nextStepId = newActiveSteps[currentIndex] || null;

        if (report.nextStepId !== context.currentStepId) {
          report.actionsTaken.push(
            `Moved from ${context.currentStepId} to ${report.nextStepId}`
          );
        }
      }

      // Step 5: Rechecklegality of affected selections (via AbilityEngine)
      await this._recheckAffectedSelections(
        affectedNodes.map(n => n.nodeId),
        actor,
        progressionSession,
        report
      );

      // Record timing
      report.reconciliationTime = Math.round(performance.now() - startTime);

      swseLogger.log('[ProgressionReconciler] Reconciliation complete:', report);

      return report;
    } catch (err) {
      swseLogger.error('[ProgressionReconciler] Critical error during reconciliation:', err);
      report.warnings.push(`Reconciliation error: ${err.message}`);
      return report;
    }
  }

  /**
   * Get all nodes affected by a change, with their invalidation behaviors.
   *
   * @param {string} changedNodeId
   * @returns {Array<{nodeId: string, behavior: string}>}
   * @private
   */
  _getAffectedNodes(changedNodeId) {
    const node = PROGRESSION_NODE_REGISTRY[changedNodeId];
    if (!node || !node.invalidates) return [];

    return node.invalidates.map(downstreamId => ({
      nodeId: downstreamId,
      behavior: node.invalidationBehavior?.[downstreamId] || InvalidationBehavior.DIRTY,
    }));
  }

  /**
   * Remove selections from a node (purge behavior).
   * Deletes the normalized selection from progressionSession.
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   * @private
   */
  async _purgeNode(nodeId, progressionSession) {
    const node = PROGRESSION_NODE_REGISTRY[nodeId];
    if (!node || !node.selectionKey) return;

    if (progressionSession?.draftSelections) {
      delete progressionSession.draftSelections[node.selectionKey];
      swseLogger.debug(`[ProgressionReconciler] Purged node: ${nodeId}`);
    }
  }

  /**
   * Mark a node as dirty (requiring re-validation).
   * In Phase 2, we just record this in session state.
   * UI will be enhanced in Phase 3 to show dirty nodes prominently.
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   * @private
   */
  _markNodeDirty(nodeId, progressionSession) {
    if (!progressionSession.dirtyNodes) {
      progressionSession.dirtyNodes = new Set();
    }
    progressionSession.dirtyNodes.add(nodeId);
    swseLogger.debug(`[ProgressionReconciler] Marked dirty: ${nodeId}`);
  }

  /**
   * Rechecklegality of selections in affected nodes.
   * Uses AbilityEngine to validate that selected items are still legal.
   * PHASE 3: Recheck via AbilityEngine; warn or purge if now illegal.
   *
   * @param {Array<string>} affectedNodeIds
   * @param {Actor} actor
   * @param {Object} progressionSession
   * @param {Object} report - Reconciliation report to update with warnings
   * @private
   */
  async _recheckAffectedSelections(
    affectedNodeIds,
    actor,
    progressionSession,
    report
  ) {
    const draftSelections = progressionSession?.draftSelections;
    if (!draftSelections) return;

    for (const nodeId of affectedNodeIds) {
      const node = PROGRESSION_NODE_REGISTRY[nodeId];
      if (!node || !node.selectionKey) continue;

      const selection = draftSelections[node.selectionKey];
      if (!selection) continue;

      // PHASE 3: Evaluate legality of the selection via AbilityEngine
      try {
        // Handle array selections (feats, talents, etc.)
        const isArray = Array.isArray(selection);
        const itemsToCheck = isArray ? selection : [selection];

        for (const item of itemsToCheck) {
          if (!item) continue;

          // Use AbilityEngine to check if item is still legal
          const assessment = AbilityEngine.evaluateAcquisition(actor, item, {});

          if (!assessment.legal) {
            report.warnings.push(
              `Selection in ${node.selectionKey} may no longer be legal after this change: ` +
              `${item.name || item.id} (missing: ${assessment.missingPrereqs.join(', ')})`
            );

            swseLogger.warn(
              `[ProgressionReconciler] Selection legality changed for ${node.selectionKey}:`,
              {
                item: item.name || item.id,
                missingPrereqs: assessment.missingPrereqs
              }
            );
          }
        }
      } catch (err) {
        swseLogger.debug(
          `[ProgressionReconciler] Error rechecking ${node.selectionKey} legality:`,
          err
        );
      }
    }
  }

  /**
   * Helper: Check if a dirty node has been "cleared" (player revisited and confirmed).
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   * @returns {boolean}
   */
  isNodeClearOfDirtyFlag(nodeId, progressionSession) {
    return !progressionSession?.dirtyNodes?.has(nodeId);
  }

  /**
   * Helper: Clear the dirty flag for a node.
   * Called when player visits and re-validates a dirty node.
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   */
  clearDirtyFlag(nodeId, progressionSession) {
    if (progressionSession?.dirtyNodes) {
      progressionSession.dirtyNodes.delete(nodeId);
    }
  }
}

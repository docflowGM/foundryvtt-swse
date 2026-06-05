/**
 * FeatDiagnostics
 *
 * Debug-only diagnostics for feat availability, immediate choice prompts,
 * pending entitlements, and static-vs-context modifier exclusion.
 *
 * These helpers intentionally do not change legality or modifier math. They
 * only explain why a feat/choice/modifier did or did not participate.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const MAX_EXAMPLES = 8;
const MAX_DEDUPED_MODIFIER_LOGS = 80;

function compactText(value, fallback = '') {
  const text = String(value ?? fallback ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback || '';
}

function featId(feat) {
  return feat?._id || feat?.id || feat?.uuid || feat?.name || null;
}

function summarizeReasons(status = {}) {
  const missing = Array.isArray(status.missingPrerequisites) ? status.missingPrerequisites : [];
  const blocking = Array.isArray(status.blockingReasons) ? status.blockingReasons : [];
  const unavailable = compactText(status.unavailabilityReason || '');
  return {
    missingPrerequisites: missing.slice(0, MAX_EXAMPLES),
    blockingReasons: blocking.slice(0, MAX_EXAMPLES),
    unavailabilityReason: unavailable || null,
  };
}

function selectedChoiceLabel(choice) {
  const entry = Array.isArray(choice) ? choice[0] : choice;
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return compactText(entry.label || entry.name || entry.weapon || entry.group || entry.value || entry.id || '');
}

function summarizeChoiceOption(option) {
  if (!option) return null;
  if (typeof option === 'string') return { id: option, label: option };
  return {
    id: option.id || option.value || option.key || null,
    label: compactText(option.label || option.name || option.weapon || option.group || option.value || option.id || ''),
    value: option.value || null,
    source: option.source || option.prerequisiteSource || null,
    locked: option.locked === true,
    deferred: option.deferred === true,
    unresolvedPrerequisite: option.unresolvedPrerequisite === true,
  };
}

export class FeatDiagnostics {
  static _modifierExclusionKeys = new Set();

  static enabled() {
    return swseLogger?.isDev?.() === true;
  }

  static _debug(label, payload = {}) {
    if (!this.enabled()) return;
    try {
      swseLogger.debug(`[FeatDiagnostics] ${label}`, payload);
    } catch (_err) {
      // Diagnostics must never affect rules execution.
    }
  }

  static traceEligibilitySummary({ stepId = null, slotType = null, actor = null, allFeats = [], legalFeats = [], availabilityByFeatId = null } = {}) {
    if (!this.enabled()) return;

    const all = Array.isArray(allFeats) ? allFeats : [];
    const legal = Array.isArray(legalFeats) ? legalFeats : [];
    const availability = availabilityByFeatId instanceof Map ? availabilityByFeatId : new Map();
    const buckets = {
      prerequisites: [],
      slot: [],
      owned: [],
      granted: [],
      evaluationError: [],
      otherUnavailable: [],
    };

    for (const feat of all) {
      const id = String(featId(feat) || '');
      const status = availability.get(id) || feat || {};
      if (status.isAvailable) continue;

      const entry = {
        id: featId(feat),
        name: feat?.name || '(unnamed feat)',
        slotCompatible: status.slotCompatible === true,
        isOwned: status.isOwned === true,
        isGranted: status.isGranted === true,
        ...summarizeReasons(status),
      };

      if (status.isOwned) buckets.owned.push(entry);
      else if (status.isGranted) buckets.granted.push(entry);
      else if ((status.missingPrerequisites || []).length) buckets.prerequisites.push(entry);
      else if (status.slotCompatible === false) buckets.slot.push(entry);
      else if (String(status.unavailabilityReason || '').toLowerCase().includes('could not evaluate')) buckets.evaluationError.push(entry);
      else buckets.otherUnavailable.push(entry);
    }

    this._debug('Feat eligibility summary', {
      stepId,
      slotType,
      actor: actor?.name || null,
      totalFeats: all.length,
      legalFeats: legal.length,
      unavailable: Math.max(0, all.length - legal.length),
      bucketCounts: Object.fromEntries(Object.entries(buckets).map(([key, values]) => [key, values.length])),
      examples: Object.fromEntries(Object.entries(buckets).map(([key, values]) => [key, values.slice(0, MAX_EXAMPLES)])),
    });
  }

  static traceChoiceRequirement({ feat = null, choiceMeta = null, choiceSource = null, options = null, selectedChoice = null, stage = 'selection' } = {}) {
    if (!this.enabled()) return;
    this._debug('Feat choice requirement', {
      stage,
      featId: featId(feat),
      featName: feat?.name || null,
      choiceKind: choiceMeta?.choiceKind || null,
      choiceSource: choiceSource || choiceMeta?.choiceSource || null,
      resolution: choiceMeta?.resolution || null,
      required: choiceMeta?.required === true,
      repeatable: choiceMeta?.repeatable === true,
      optionCount: Array.isArray(options) ? options.length : null,
      selectedChoice: selectedChoiceLabel(selectedChoice) || null,
    });
  }

  static traceChoiceOptionResolution({ actor = null, feat = null, choiceMeta = null, choiceSource = null, options = [], context = {} } = {}) {
    if (!this.enabled()) return;
    const list = Array.isArray(options) ? options : [];
    this._debug('Feat choice options resolved', {
      actor: actor?.name || null,
      featId: featId(feat),
      featName: feat?.name || null,
      choiceKind: choiceMeta?.choiceKind || null,
      choiceSource: choiceSource || choiceMeta?.choiceSource || null,
      resolution: choiceMeta?.resolution || null,
      required: choiceMeta?.required === true,
      repeatable: choiceMeta?.repeatable === true,
      optionCount: list.length,
      optionsSample: list.map(summarizeChoiceOption).filter(Boolean).slice(0, MAX_EXAMPLES),
      pendingKeys: context?.pending && typeof context.pending === 'object' ? Object.keys(context.pending) : [],
    });
  }

  static traceChoiceAudit({ actor = null, label = 'choice_audit', items = [], includeTalents = false } = {}) {
    if (!this.enabled()) return;
    const list = Array.isArray(items) ? items : [];
    this._debug(`Feat ${label}`, {
      actor: actor?.name || null,
      includeTalents: includeTalents === true,
      count: list.length,
      examples: list.slice(0, MAX_EXAMPLES).map((entry) => ({
        itemId: entry.itemId || entry.id || null,
        itemName: entry.itemName || entry.name || null,
        itemType: entry.itemType || entry.type || null,
        choiceKind: entry.choiceKind || null,
        choiceSource: entry.choiceSource || null,
        status: entry.status || null,
        required: entry.required === true,
        optionCount: Array.isArray(entry.options) ? entry.options.length : null,
        selectedChoice: selectedChoiceLabel(entry.selectedChoice) || null,
        errors: Array.isArray(entry.errors) ? entry.errors.slice(0, MAX_EXAMPLES) : [],
      })),
    });
  }

  static tracePendingEntitlements({ stepId = null, actor = null, before = [], after = [], created = [], retained = [] } = {}) {
    if (!this.enabled()) return;
    const summarize = (entry) => ({
      id: entry?.id || null,
      type: entry?.type || entry?.kind || entry?.grantType || null,
      source: entry?.source?.featName || entry?.source?.classFeatureId || entry?.source?.stepId || null,
      quantity: entry?.quantity ?? entry?.count ?? null,
      spent: entry?.spent ?? null,
      unspent: Math.max(0, Number(entry?.quantity ?? entry?.count ?? 1) - Number(entry?.spent ?? entry?.spentSelections?.length ?? 0)),
    });

    this._debug('Pending entitlement sync', {
      stepId,
      actor: actor?.name || null,
      beforeCount: Array.isArray(before) ? before.length : 0,
      retainedCount: Array.isArray(retained) ? retained.length : 0,
      createdCount: Array.isArray(created) ? created.length : 0,
      afterCount: Array.isArray(after) ? after.length : 0,
      created: (created || []).map(summarize),
      after: (after || []).map(summarize).slice(0, MAX_EXAMPLES),
    });
  }

  static traceModifierExclusion({ actor = null, modifier = null, context = {}, options = {}, reason = 'excluded', detail = {} } = {}) {
    if (!this.enabled()) return;

    const key = [
      actor?.id || actor?.name || 'actor',
      modifier?.sourceName || modifier?.source || modifier?.description || modifier?.id || 'modifier',
      modifier?.target || modifier?.domain || 'target',
      modifier?.staticSheetPolicy || 'policy',
      reason,
    ].join('|');

    if (this._modifierExclusionKeys.has(key)) return;
    if (this._modifierExclusionKeys.size > MAX_DEDUPED_MODIFIER_LOGS) return;
    this._modifierExclusionKeys.add(key);

    this._debug('Modifier excluded from context', {
      actor: actor?.name || null,
      sourceName: modifier?.sourceName || modifier?.source || null,
      description: modifier?.description || null,
      target: modifier?.target || null,
      value: modifier?.value ?? null,
      type: modifier?.type || null,
      mechanicsMode: modifier?.mechanicsMode || null,
      applicationScope: modifier?.applicationScope || null,
      staticSheetPolicy: modifier?.staticSheetPolicy || null,
      requiresRuntimeContext: modifier?.requiresRuntimeContext === true,
      requiresSelectedChoice: modifier?.requiresSelectedChoice === true,
      staticSheet: options?.staticSheet === true,
      contextKeys: context && typeof context === 'object' ? Object.keys(context) : [],
      reason,
      detail,
    });
  }
}

export default FeatDiagnostics;

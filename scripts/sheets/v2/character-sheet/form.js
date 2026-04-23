/**
 * Form submission pipeline for SWSEV2CharacterSheet
 *
 * Handles form data collection, type coercion, sanitization, and filtering
 * before submission to the actor. Enforces SSOT (Single Source of Truth)
 * governance by removing fields that must be calculated by engines.
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { traceLog } from "/systems/foundryvtt-swse/scripts/utils/mutation-trace.js";
import { captureHydrationSnapshot, emitHydrationError, emitHydrationWarning, isHydrationSensitivePath, recordHydrationMutation } from "/systems/foundryvtt-swse/scripts/utils/hydration-diagnostics.js";

/**
 * Form field type schema for coercion
 * Maps field names to their expected types: 'number', 'boolean', 'string'
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
const FORM_FIELD_SCHEMA = {
  // HP/Health
  'system.hp.value': 'number',
  'system.hp.max': 'number',
  'system.hp.temp': 'number',
  'system.hpBonus': 'number',
  'system.conditionTrack.current': 'number',
  'system.conditionTrack.persistent': 'boolean',
  'system.damageReduction': 'number',
  'system.baseAttackBonus': 'number',
  'system.secondWind.healing': 'number',
  'system.secondWind.uses': 'number',
  'system.secondWind.max': 'number',

  // Abilities
  'system.abilities.str.base': 'number',
  'system.abilities.str.racial': 'number',
  'system.abilities.str.temp': 'number',
  'system.abilities.dex.base': 'number',
  'system.abilities.dex.racial': 'number',
  'system.abilities.dex.temp': 'number',
  'system.abilities.con.base': 'number',
  'system.abilities.con.racial': 'number',
  'system.abilities.con.temp': 'number',
  'system.abilities.int.base': 'number',
  'system.abilities.int.racial': 'number',
  'system.abilities.int.temp': 'number',
  'system.abilities.wis.base': 'number',
  'system.abilities.wis.racial': 'number',
  'system.abilities.wis.temp': 'number',
  'system.abilities.cha.base': 'number',
  'system.abilities.cha.racial': 'number',
  'system.abilities.cha.temp': 'number',

  // Defense modifiers (PHASE 8: Canonical edit paths)
  // Display totals come from system.derived.defenses.{fortitude|reflex|will}.total
  // Editable overrides live on system.defenses.{fortitude|reflex|will}.*
  'system.defenses.fortitude.classBonus': 'number',
  'system.defenses.fortitude.misc.user.extra': 'number',
  'system.defenses.fortitude.ability': 'string',
  'system.defenses.reflex.classBonus': 'number',
  'system.defenses.reflex.misc.user.extra': 'number',
  'system.defenses.reflex.ability': 'string',
  'system.defenses.reflex.armor': 'number',
  'system.defenses.will.classBonus': 'number',
  'system.defenses.will.misc.user.extra': 'number',
  'system.defenses.will.ability': 'string',

  // Skills (PHASE 7: Canonical edit paths)
  // Editable fields: miscMod (manual bonuses)
  // Non-editable in this phase: trained, focused, selectedAbility (set by progression/derived)
  // planned Phase 7+: Add form fields for trained, focused, selectedAbility when UI supports direct editing
  'system.skills.acrobatics.miscMod': 'number',
  'system.skills.climb.miscMod': 'number',
  'system.skills.deception.miscMod': 'number',
  'system.skills.endurance.miscMod': 'number',
  'system.skills.gatherInformation.miscMod': 'number',
  'system.skills.initiative.miscMod': 'number',
  'system.skills.jump.miscMod': 'number',
  'system.skills.knowledgeBureaucracy.miscMod': 'number',
  'system.skills.knowledgeGalacticLore.miscMod': 'number',
  'system.skills.knowledgeLifeSciences.miscMod': 'number',
  'system.skills.knowledgePhysicalSciences.miscMod': 'number',
  'system.skills.knowledgeSocialSciences.miscMod': 'number',
  'system.skills.knowledgeTactics.miscMod': 'number',
  'system.skills.knowledgeTechnology.miscMod': 'number',
  'system.skills.mechanics.miscMod': 'number',
  'system.skills.perception.miscMod': 'number',
  'system.skills.persuasion.miscMod': 'number',
  'system.skills.pilot.miscMod': 'number',
  'system.skills.ride.miscMod': 'number',
  'system.skills.stealth.miscMod': 'number',
  'system.skills.survival.miscMod': 'number',
  'system.skills.swim.miscMod': 'number',
  'system.skills.treatInjury.miscMod': 'number',
  'system.skills.useComputer.miscMod': 'number',
  'system.skills.useTheForce.miscMod': 'number',

  // Progression and Resources (PHASE 7: Canonical edit paths)
  'system.level': 'number',
  // Phase 3D: Canonical XP path is system.xp.total (not deprecated system.experience)
  'system.xp.total': 'number',
  'system.credits': 'number',
  'system.speed': 'number',
  // Destiny/Force Points — editable resource pools
  // Display derived totals come from system.derived.destinyPoints, system.derived.forcePoints
  'system.destinyPoints.value': 'number',
  'system.destinyPoints.max': 'number',
  'system.forcePoints.value': 'number',
  'system.forcePoints.max': 'number'
};

/**
 * Get expected field type from schema
 * @param {string} fieldName - Form field name (e.g. 'system.hp.value')
 * @returns {string|null} Type ('number', 'boolean', 'string') or null if unknown
 */
function getFieldType(fieldName) {
  if (fieldName in FORM_FIELD_SCHEMA) {
    return FORM_FIELD_SCHEMA[fieldName];
  }

  if (/^system\.skills\.[^.]+\.(trained|focused|favorite)$/.test(fieldName)) {
    return 'boolean';
  }

  if (/^system\.skills\.[^.]+\.miscMod$/.test(fieldName)) {
    return 'number';
  }

  if (/^system\.skills\.[^.]+\.selectedAbility$/.test(fieldName)) {
    return 'string';
  }

  if (fieldName.includes('notes') || fieldName.includes('description') || fieldName.includes('text')) {
    return 'string';
  }

  return null;
}

/**
 * Process form submission: collect, coerce, expand, sanitize, and filter data
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {Event} event - The form submit event
 */

function collectFormDataForField(field) {
  const formData = new FormData();
  if (!(field instanceof HTMLElement) || !field.name || field.disabled) return formData;

  if (field.matches('input[type="checkbox"]')) {
    formData.set(field.name, field.checked ? 'true' : 'false');
    return formData;
  }

  if (field.matches('input[type="radio"]')) {
    if (field.checked) formData.set(field.name, field.value ?? '');
    return formData;
  }

  if (field instanceof HTMLSelectElement && field.multiple) {
    for (const option of field.selectedOptions) {
      formData.append(field.name, option.value);
    }
    return formData;
  }

  formData.set(field.name, field.value ?? '');
  return formData;
}

function resolveExplicitFieldTarget(event) {
  const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
  const candidates = [event?.target, event?.currentTarget, ...path];

  for (const candidate of candidates) {
    if (!(candidate instanceof HTMLElement)) continue;

    if (candidate.matches?.('input[name], textarea[name], select[name]')) {
      return candidate;
    }

    const nestedField = candidate.closest?.('input[name], textarea[name], select[name]');
    if (nestedField) return nestedField;
  }

  return null;
}

export function isDirectFieldMutationPath(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') return false;

  return (
    /^system\.skills\.[^.]+\.(trained|focused|miscMod|selectedAbility|favorite)$/.test(fieldName) ||
    /^system\.defenses\.(fortitude|reflex|will)\.(ability|classBonus)$/.test(fieldName) ||
    /^system\.defenses\.reflex\.armor$/.test(fieldName) ||
    /^system\.defenses\.(fortitude|reflex|will)\.misc\.user\.extra$/.test(fieldName) ||
    fieldName === 'system.conditionTrack.current'
  );
}

export function coerceSingleFieldValue(fieldName, value, field = null) {
  const expectedType = getFieldType(fieldName);

  if (expectedType === 'number') {
    const numValue = Number(value);
    return Number.isNaN(numValue) ? 0 : numValue;
  }

  if (expectedType === 'boolean') {
    if (field?.matches?.('input[type="checkbox"]')) return field.checked;
    return value === 'true' || value === '1' || value === true || value === 'on';
  }

  return value ?? '';
}

export function buildScopedUpdateFromField(field) {
  if (!(field instanceof HTMLElement) || !field.name || field.disabled) return null;

  let rawValue = field.value ?? '';
  if (field.matches?.('input[type="checkbox"]')) {
    rawValue = field.checked;
  }

  return {
    [field.name]: coerceSingleFieldValue(field.name, rawValue, field)
  };
}

function collectFormDataFromContainer(container) {
  const pairs = [];
  if (!container?.querySelectorAll) return new FormData();

  const fields = container.querySelectorAll('input[name], textarea[name], select[name]');
  for (const field of fields) {
    if (!field.name || field.disabled) continue;

    if (field.matches('input[type="checkbox"]')) {
      pairs.push([field.name, field.checked ? 'true' : 'false']);
      continue;
    }

    if (field.matches('input[type="radio"]')) {
      if (field.checked) pairs.push([field.name, field.value]);
      continue;
    }

    if (field instanceof HTMLSelectElement && field.multiple) {
      for (const option of field.selectedOptions) {
        pairs.push([field.name, option.value]);
      }
      continue;
    }

    pairs.push([field.name, field.value ?? '']);
  }

  const formData = new FormData();
  for (const [key, value] of pairs) formData.append(key, value);
  return formData;
}

export async function handleFormSubmission(sheet, event) {
  SWSELogger.debug('[PERSISTENCE] ════════════════════════════════════════');
  SWSELogger.debug('[PERSISTENCE] Form submission started');

  try {
    event.preventDefault();
  } catch (err) {
    console.warn('[PERSISTENCE] Could not preventDefault:', err);
  }

  const explicitTarget = event?.target ?? event?.currentTarget ?? null;
  const explicitField = resolveExplicitFieldTarget(event);
  let form = explicitTarget instanceof HTMLFormElement ? explicitTarget : explicitTarget?.closest?.('form');
  let container = explicitTarget?.closest?.('.swse-character-sheet-form') ?? null;

  const appRoot = sheet?.element instanceof HTMLElement ? sheet.element : sheet?.element?.[0];
  if (!form) {
    form = appRoot?.querySelector?.('form.swse-character-sheet-form') ?? null;
  }
  if (!container) {
    container = form ?? appRoot?.querySelector?.('.swse-character-sheet-form') ?? appRoot ?? null;
  }

  SWSELogger.debug('[PERSISTENCE] Form element:', {
    tag: form?.tagName,
    class: form?.className,
    containerTag: container?.tagName,
    containerClass: container?.className,
    isConnected: form?.isConnected ?? container?.isConnected
  });

  if (!(form instanceof HTMLFormElement) && !container?.querySelectorAll) {
    console.error('[PERSISTENCE] No form or serializable container available for submission');
    return;
  }

  const currentActorId = sheet.actor?.id;
  if (!currentActorId) {
    console.error('[PERSISTENCE] Actor ID not found');
    return;
  }

  const currentActor = game.actors.get(currentActorId);
  if (!currentActor) {
    console.error('[PERSISTENCE] Could not fetch fresh actor from world');
    return;
  }

  if (explicitField && isDirectFieldMutationPath(explicitField.name)) {
    const scopedUpdate = buildScopedUpdateFromField(explicitField);
    if (!scopedUpdate) {
      console.warn('[PERSISTENCE] Direct field mutation resolved no scoped update');
      return;
    }

    const isSensitiveField = isHydrationSensitivePath(explicitField.name);
    const beforeSnapshot = isSensitiveField ? captureHydrationSnapshot(currentActor) : null;
    const mutationRecord = recordHydrationMutation(sheet, {
      source: 'character-sheet-direct-field',
      field: explicitField.name,
      inputType: explicitField.type || explicitField.tagName || 'unknown',
      update: scopedUpdate,
      before: beforeSnapshot
    });

    try {
      SWSELogger.debug('[PERSISTENCE] Applying direct field mutation', {
        field: explicitField.name,
        update: scopedUpdate
      });

      if (isSensitiveField) {
        emitHydrationWarning('FORM_DIRECT_MUTATION_START', {
          mutation: mutationRecord,
          before: beforeSnapshot
        });
      }

      await ActorEngine.updateActor(currentActor, scopedUpdate, {
        source: 'character-sheet-direct-field',
        suppressAppRefresh: true,
        meta: { guardKey: `direct-field:` }
      });

      const refreshedActor = game.actors.get(currentActorId) ?? currentActor;
      const afterSnapshot = isSensitiveField ? captureHydrationSnapshot(refreshedActor) : null;
      if (isSensitiveField) {
        recordHydrationMutation(sheet, {
          ...mutationRecord,
          status: 'success',
          after: afterSnapshot
        });
        emitHydrationWarning('FORM_DIRECT_MUTATION_SUCCESS', {
          field: explicitField.name,
          after: afterSnapshot
        });
      }

      traceLog('FORM', 'direct field mutation applied', {
        actorId: currentActorId,
        actorName: currentActor.name,
        field: explicitField.name
      });
      return;
    } catch (err) {
      if (isSensitiveField) {
        emitHydrationError('FORM_DIRECT_MUTATION_FAILED', {
          field: explicitField.name,
          mutation: mutationRecord,
          error: err?.message,
          stack: err?.stack,
          snapshot: captureHydrationSnapshot(game.actors.get(currentActorId) ?? currentActor)
        });
      }
      console.error('[PERSISTENCE] Direct field mutation failed:', err);
      ui?.notifications?.error(`Field update failed: `);
      return;
    }
  }

  // Collect FormData
  let formData;
  try {
    formData = explicitField
      ? collectFormDataForField(explicitField)
      : (form instanceof HTMLFormElement ? new FormData(form) : collectFormDataFromContainer(container));

    // CRITICAL FIX: Explicitly serialize checkbox state for scoped field submissions.
    if (explicitField?.matches('input[type="checkbox"][name]')) {
      formData.set(explicitField.name, explicitField.checked ? 'true' : 'false');
    } else if (!explicitField) {
      const checkboxRoot = form instanceof HTMLFormElement ? form : container;
      for (const checkbox of checkboxRoot.querySelectorAll('input[type="checkbox"][name]')) {
        const fieldName = checkbox.name;
        if (!fieldName) continue;
        formData.set(fieldName, checkbox.checked ? 'true' : 'false');
      }
    }

    SWSELogger.debug('[PERSISTENCE] FormData created, entries:', Object.keys(Object.fromEntries(formData.entries())).length);
  } catch (err) {
    console.error('[PERSISTENCE] Failed to create FormData:', err);
    return;
  }

  // Convert to plain object
  const formDataObj = Object.fromEntries(formData.entries());
  SWSELogger.debug('[PERSISTENCE] Raw form data collected');

  // Coerce types
  const coercedData = coerceFormData(formDataObj);
  SWSELogger.debug('[PERSISTENCE] Data coerced to correct types');

  // Expand nested paths
  const expanded = foundry.utils.expandObject(coercedData);
  SWSELogger.debug('[PERSISTENCE] Form data expanded to nested object');

  // Sanitize
  const sanitized = sanitizeExpandedFormData(expanded);
  SWSELogger.debug('[PERSISTENCE] Form data sanitized');

  // Filter SSOT-protected fields
  const filtered = filterSSotProtectedFields(sanitized);
  SWSELogger.debug('[PERSISTENCE] SSOT-protected fields filtered');

  if (!filtered || Object.keys(filtered).length === 0) {
    console.warn('[PERSISTENCE] No updatable data after filtering');
    return;
  }

  // Update actor via ActorEngine
  try {
    SWSELogger.debug('[PERSISTENCE] Calling ActorEngine.updateActor...');
    await ActorEngine.updateActor(currentActor, filtered, {
      source: 'character-sheet-form-submit',
      meta: { guardKey: 'character-sheet-form-submit' }
    });
    SWSELogger.debug('[PERSISTENCE] Form submission completed successfully');

    traceLog('form-submission', {
      actorId: currentActorId,
      actorName: currentActor.name,
      fieldsUpdated: Object.keys(foundry.utils.flattenObject(filtered)).length
    });
  } catch (err) {
    console.error('[PERSISTENCE] Form submission error:', err);
    ui?.notifications?.error(`Form submission failed: ${err.message}`);
  }
}

/**
 * Coerce form data types from strings to correct types
 * FormData collects all values as strings; numeric fields need conversion
 * @param {Object} formDataObj - Plain object from FormData.entries()
 * @returns {Object} Data with correct types
 */
export function coerceFormData(formDataObj) {
  const coercedData = {};

  for (const [fieldName, value] of Object.entries(formDataObj)) {
    const expectedType = getFieldType(fieldName);

    if (expectedType === 'number') {
      const numValue = Number(value);
      coercedData[fieldName] = Number.isNaN(numValue) ? 0 : numValue;
    } else if (expectedType === 'boolean') {
      coercedData[fieldName] = value === 'true' || value === '1' || value === true;
    } else {
      coercedData[fieldName] = value;
    }
  }

  return coercedData;
}

/**
 * Sanitize expanded form data by removing invalid/stale values
 * @param {Object} expanded - Expanded (nested) form data
 * @returns {Object} Sanitized data
 */
export function sanitizeExpandedFormData(expanded) {
  const isPlaceholder = (val) => {
    if (val === undefined || val === null) return true;
    if (typeof val === 'string' && val.includes('=') && (val.includes('dex') || val.includes('str'))) return true;
    return false;
  };

  const clone = foundry.utils.duplicate(expanded);

  const walk = (obj, path = '') => {
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

      const nextPath = path ? `${path}.${key}` : key;
      const value = obj[key];

      // Remove placeholders
      if (typeof value === 'string' && isPlaceholder(value)) {
        delete obj[key];
        continue;
      }

      // Strip unsafe flags
      if (path === 'flags') {
        if (key !== 'swse' && key !== 'foundryvtt-swse') {
          delete obj[key];
          continue;
        }
      }

      // Recurse into objects
      if (value && typeof value === 'object') {
        walk(value, nextPath);
        if (Object.keys(value).length === 0) {
          delete obj[key];
        }
      }
    }
  };

  walk(clone);
  return clone;
}

/**
 * Filter out SSOT-protected fields that cannot be updated directly
 * These fields are enforced by ActorEngine governance and must be recalculated
 *
 * Protected fields:
 * - system.derived.* → Only DerivedCalculator may write these
 * - system.hp.max → Only ActorEngine.recomputeHP() may write this
 *
 * @param {Object} expanded - Expanded form data
 * @returns {Object} Filtered data without protected fields
 */
export function filterSSotProtectedFields(expanded) {
  const flat = foundry.utils.flattenObject(expanded);
  const filtered = {};

  for (const [key, value] of Object.entries(flat)) {
    // BLOCK: system.derived.* (engine-owned, calculated)
    if (key.startsWith('system.derived.')) {
      SWSELogger.debug(`[PERSISTENCE] Filtered protected field: ${key}`);
      continue;
    }

    // BLOCK: system.hp.max (managed by ActorEngine.recomputeHP)
    if (key === 'system.hp.max') {
      SWSELogger.debug('[PERSISTENCE] Filtered protected field: system.hp.max');
      continue;
    }

    // BLOCK: invalid actor name values on partial updates
    if (key === 'name' && (value === undefined || value === null || typeof value !== 'string' || value.trim() === '')) {
      SWSELogger.debug('[PERSISTENCE] Filtered invalid actor name update');
      continue;
    }

    // ALLOW: everything else
    filtered[key] = value;
  }

  // Remove _stats metadata that shouldn't be sent to update
  delete filtered._stats;

  return filtered;
}

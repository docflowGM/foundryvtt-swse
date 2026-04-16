/**
 * Form submission pipeline for SWSEV2CharacterSheet
 *
 * Handles form data collection, type coercion, sanitization, and filtering
 * before submission to the actor. Enforces SSOT (Single Source of Truth)
 * governance by removing fields that must be calculated by engines.
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { traceLog } from "/systems/foundryvtt-swse/scripts/utils/mutation-trace.js";

/**
 * Form field type schema for coercion
 * Maps field names to their expected types: 'number', 'boolean', 'string'
 */
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

  // Defense modifiers (PHASE 7: Canonical edit paths)
  // Display totals come from system.derived.defenses.{fortitude|reflex|will}.total
  // Editable overrides are system.defenses.{fort|ref|will}.miscMod
  'system.defenses.fort.miscMod': 'number',
  'system.defenses.ref.miscMod': 'number',
  'system.defenses.will.miscMod': 'number',

  // Skills (PHASE 7: Canonical edit paths)
  // Editable fields: miscMod (manual bonuses)
  // Non-editable in this phase: trained, focused, selectedAbility (set by progression/derived)
  // TODO Phase 7+: Add form fields for trained, focused, selectedAbility when UI supports direct editing
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
export async function handleFormSubmission(sheet, event) {
  console.log('[PERSISTENCE] ════════════════════════════════════════');
  console.log('[PERSISTENCE] Form submission started');

  try {
    event.preventDefault();
  } catch (err) {
    console.warn('[PERSISTENCE] Could not preventDefault:', err);
  }

  const form = event.target;
  console.log('[PERSISTENCE] Form element:', {
    tag: form?.tagName,
    class: form?.className,
    isConnected: form?.isConnected
  });

  // Collect FormData
  let formData;
  try {
    formData = new FormData(form);

    // CRITICAL FIX: Explicitly serialize all checkbox states.
    // Native FormData uses "on" for checked boxes and omits unchecked boxes entirely.
    // That is bad for dynamic boolean fields like skill trained/focused/favorite.
    for (const checkbox of form.querySelectorAll('input[type="checkbox"][name]')) {
      const fieldName = checkbox.name;
      if (!fieldName) continue;
      formData.set(fieldName, checkbox.checked ? 'true' : 'false');
    }

    console.log('[PERSISTENCE] FormData created, entries:', Object.keys(Object.fromEntries(formData.entries())).length);
  } catch (err) {
    console.error('[PERSISTENCE] Failed to create FormData:', err);
    return;
  }

  // Convert to plain object
  const formDataObj = Object.fromEntries(formData.entries());
  console.log('[PERSISTENCE] Raw form data collected');

  // Coerce types
  const coercedData = coerceFormData(formDataObj);
  console.log('[PERSISTENCE] Data coerced to correct types');

  // Expand nested paths
  const expanded = foundry.utils.expandObject(coercedData);
  console.log('[PERSISTENCE] Form data expanded to nested object');

  // Sanitize
  const sanitized = sanitizeExpandedFormData(expanded);
  console.log('[PERSISTENCE] Form data sanitized');

  // Filter SSOT-protected fields
  const filtered = filterSSotProtectedFields(sanitized);
  console.log('[PERSISTENCE] SSOT-protected fields filtered');

  if (!filtered || Object.keys(filtered).length === 0) {
    console.warn('[PERSISTENCE] No updatable data after filtering');
    return;
  }

  // Update actor via ActorEngine
  try {
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

    console.log('[PERSISTENCE] Calling ActorEngine.updateActor...');
    await ActorEngine.updateActor(currentActor, filtered);
    console.log('[PERSISTENCE] Form submission completed successfully');

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
      console.log(`[PERSISTENCE] Filtered protected field: ${key}`);
      continue;
    }

    // BLOCK: system.hp.max (managed by ActorEngine.recomputeHP)
    if (key === 'system.hp.max') {
      console.log('[PERSISTENCE] Filtered protected field: system.hp.max');
      continue;
    }

    // BLOCK: invalid actor name values on partial updates
    if (key === 'name' && (value === undefined || value === null || typeof value !== 'string' || value.trim() === '')) {
      console.log('[PERSISTENCE] Filtered invalid actor name update');
      continue;
    }

    // ALLOW: everything else
    filtered[key] = value;
  }

  // Remove _stats metadata that shouldn't be sent to update
  delete filtered._stats;

  return filtered;
}

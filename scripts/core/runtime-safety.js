/**
 * Runtime Safety Module - v13 hardening
 *
 * Provides fail-fast validation, async boundary guards, and centralized error handling.
 * Prevents cascading failures and makes bugs easier to diagnose.
 */

import { log } from "/systems/foundryvtt-swse/scripts/core/foundry-env.js";

const SYSTEM_ID = 'foundryvtt-swse';
const MAX_ERROR_LOGS = 100;
let _errorLog = [];

/**
 * Validate core data structures at load time
 */
export async function validateCoreData() {
  const errors = [];

  try {
    // Validate species data
    const speciesPack = game?.packs?.get?.(`${SYSTEM_ID}.species`);
    if (!speciesPack) {
      errors.push('Species compendium pack missing');
    } else {
      const speciesIndex = await speciesPack.getIndex();
      if (!speciesIndex || speciesIndex.size === 0) {
        errors.push('Species pack is empty or corrupted');
      }
    }

    // Validate classes data
    const classesPack = game?.packs?.get?.(`${SYSTEM_ID}.classes`);
    if (!classesPack) {
      errors.push('Classes compendium pack missing');
    }

    // Validate talents data
    const talentsPack = game?.packs?.get?.(`${SYSTEM_ID}.talents`);
    if (!talentsPack) {
      errors.push('Talents compendium pack missing');
    }

    // Validate progression data structures
    if (!game.settings) {
      errors.push('Game settings not initialized');
    }
  } catch (err) {
    errors.push(`Validation error: ${err.message}`);
  }

  if (errors.length > 0) {
    log.error('Core data validation failed:', errors);
    return { valid: false, errors };
  }

  log.info('Core data validation passed');
  return { valid: true, errors: [] };
}

/**
 * Guard for UUID async boundaries
 * Prevents unhandled promise rejections from UUID lookups
 */
export async function guardFromUuid(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    logError('guardFromUuid', 'Invalid UUID provided', { uuid }, 'validation');
    return null;
  }

  try {
    const doc = await fromUuid(uuid);
    return doc;
  } catch (err) {
    logError('guardFromUuid', 'UUID lookup failed', { uuid, error: err.message }, 'async-boundary');
    return null;
  }
}

/**
 * Guard for compendium pack access
 */
export async function guardPack(packName) {
  if (!packName || typeof packName !== 'string') {
    logError('guardPack', 'Invalid pack name', { packName }, 'validation');
    return null;
  }

  try {
    const pack = game?.packs?.get?.(`${SYSTEM_ID}.${packName}`);
    if (!pack) {
      logError('guardPack', 'Pack not found', { packName }, 'validation');
      return null;
    }
    return pack;
  } catch (err) {
    logError('guardPack', 'Pack access failed', { packName, error: err.message }, 'async-boundary');
    return null;
  }
}

/**
 * Guard for fetch operations
 */
export async function guardFetch(url, init = {}) {
  if (!url || typeof url !== 'string') {
    logError('guardFetch', 'Invalid URL', { url }, 'validation');
    return null;
  }

  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      logError('guardFetch', 'HTTP error', { url, status: response.status }, 'async-boundary');
      return null;
    }
    return response;
  } catch (err) {
    logError('guardFetch', 'Fetch failed', { url, error: err.message }, 'async-boundary');
    return null;
  }
}

/**
 * Centralized error logging (prevents duplicate logging)
 */
function logError(context, message, details = {}, category = 'general') {
  const errorEntry = {
    context,
    message,
    details,
    category,
    timestamp: new Date().toISOString(),
    stack: new Error().stack.split('\n').slice(0, 3).join('\n')
  };

  // Prevent log spam
  if (_errorLog.length > MAX_ERROR_LOGS) {
    _errorLog.shift();
  }
  _errorLog.push(errorEntry);

  // Log once per unique error
  const key = `${context}:${message}`;
  if (!window.__swseErrorsSeen) window.__swseErrorsSeen = {};
  if (!window.__swseErrorsSeen[key]) {
    window.__swseErrorsSeen[key] = true;
    log.warn(`[${category}] ${context}: ${message}`, details);
  }
}

/**
 * Get error log (GM only)
 */
export function getErrorLog() {
  if (!game.user.isGM) return [];
  return _errorLog;
}

/**
 * Clear error log (GM only)
 */
export function clearErrorLog() {
  if (!game.user.isGM) return false;
  _errorLog = [];
  return true;
}

/**
 * Assert that actor is owned by current user (safety check)
 */
export function assertOwnership(actor, context = 'operation') {
  if (!actor) {
    logError('assertOwnership', 'Null actor', { context }, 'security');
    return false;
  }

  if (!actor.isOwner) {
    logError('assertOwnership',
      `Non-owner attempting ${context}`,
      { actor: actor.name, owner: actor.owner },
      'security');
    return false;
  }

  return true;
}

/**
 * Safe actor mutation wrapper with permission check
 */
export async function safeActorUpdate(actor, updates, context = 'update') {
  if (!assertOwnership(actor, context)) {
    return null;
  }

  if (!actor || typeof updates !== 'object') {
    logError('safeActorUpdate', 'Invalid arguments', { actor: actor?.name, context }, 'validation');
    return null;
  }

  try {
    return await actor.update(updates);
  } catch (err) {
    logError('safeActorUpdate', 'Update failed', { actor: actor.name, error: err.message, context }, 'mutation');
    return null;
  }
}

/**
 * Safe item creation wrapper
 */
export async function safeItemCreate(actor, itemData, context = 'create') {
  if (!assertOwnership(actor, context)) {
    return null;
  }

  if (!actor || !itemData) {
    logError('safeItemCreate', 'Invalid arguments', { actor: actor?.name, context }, 'validation');
    return null;
  }

  try {
    const created = await actor.createEmbeddedDocuments('Item', [itemData]);
    return created?.[0] ?? null;
  } catch (err) {
    logError('safeItemCreate', 'Creation failed', { actor: actor.name, error: err.message, context }, 'mutation');
    return null;
  }
}

/**
 * Validate progression data structure
 */
export function validateProgressionData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Progression data is not an object');
    return errors;
  }

  // Check required fields
  if (!data.abilities || typeof data.abilities !== 'object') {
    errors.push('Missing or invalid abilities object');
  }

  if (!data.skills || typeof data.skills !== 'object') {
    errors.push('Missing or invalid skills object');
  }

  if (data.level !== undefined && !Number.isFinite(data.level)) {
    errors.push('Invalid level value');
  }

  if (data.experience !== undefined && !Number.isFinite(data.experience)) {
    errors.push('Invalid experience value');
  }

  return errors;
}

/**
 * Register safety diagnostics command
 */
export function registerSafetyDiagnostics() {
  window.SWSESafety = {
    getErrors: () => getErrorLog(),
    clearErrors: () => clearErrorLog(),
    validateCore: () => validateCoreData(),
    getErrorCount: () => _errorLog.length
  };
}

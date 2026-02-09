/**
 * Foundry Environment Accessor - v13 compliant
 *
 * Centralizes access to Foundry globals with explicit, safe accessors.
 * Replaces implicit `game.*` references throughout the system.
 *
 * Usage:
 * ```javascript
 * import { fromEnv } from './core/foundry-env.js';
 *
 * const actor = await fromEnv.getActorByUuid(uuid);
 * const pack = fromEnv.getCompendium('species');
 * fromEnv.notifyInfo('Success!');
 * ```
 */

/**
 * Safe actor lookup by UUID or ID
 */
export async function getActorByUuid(uuid) {
  if (!uuid || typeof uuid !== 'string') return null;
  try {
    const doc = await fromUuid(uuid);
    return doc?.constructor?.name === 'Actor' ? doc : null;
  } catch {
    return null;
  }
}

/**
 * Safe actor lookup by ID
 */
export function getActorById(id) {
  if (!id || typeof id !== 'string') return null;
  try {
    return game?.actors?.get(id) ?? null;
  } catch {
    return null;
  }
}

/**
 * Safe item lookup by UUID or ID
 */
export async function getItemByUuid(uuid) {
  if (!uuid || typeof uuid !== 'string') return null;
  try {
    const doc = await fromUuid(uuid);
    return doc?.constructor?.name === 'Item' ? doc : null;
  } catch {
    return null;
  }
}

/**
 * Safe item lookup by ID
 */
export function getItemById(id) {
  if (!id || typeof id !== 'string') return null;
  try {
    return game?.items?.get(id) ?? null;
  } catch {
    return null;
  }
}

/**
 * Safe compendium accessor
 * @param {string} packName - Compendium name (e.g., 'species', 'classes')
 */
export function getCompendium(packName) {
  if (!packName || typeof packName !== 'string') return null;
  try {
    return game?.packs?.get(`${getSystemId()}.${packName}`) ?? null;
  } catch {
    return null;
  }
}

/**
 * Safe compendium lookup by UUID
 */
export async function getCompendiumDocument(uuid) {
  if (!uuid || typeof uuid !== 'string') return null;
  try {
    return await fromUuid(uuid);
  } catch {
    return null;
  }
}

/**
 * Get system settings
 */
export function getSetting(key, defaultValue = undefined) {
  if (!key || typeof key !== 'string') return defaultValue;
  try {
    return game?.settings?.get?.(getSystemId(), key) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set system settings (GM only)
 */
export async function setSetting(key, value) {
  if (!key || typeof key !== 'string') return false;
  if (!game.user.isGM) return false;
  try {
    await game.settings.set(getSystemId(), key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return game?.user ?? null;
}

/**
 * Check if current user is GM
 */
export function isGameMaster() {
  return game?.user?.isGM === true;
}

/**
 * Get current world
 */
export function getWorld() {
  return game?.world ?? null;
}

/**
 * Get current canvas
 */
export function getCanvas() {
  return canvas ?? null;
}

/**
 * Check if game is ready
 */
export function isGameReady() {
  return game?.ready === true;
}

/**
 * Get system ID (cached)
 */
let _systemId = null;
export function getSystemId() {
  if (_systemId) return _systemId;
  _systemId = game?.system?.id ?? 'foundryvtt-swse';
  return _systemId;
}

/**
 * UI notifications
 */
export const notify = {
  info(message) {
    ui?.notifications?.info?.(message);
  },
  warn(message) {
    ui?.notifications?.warn?.(message);
  },
  error(message) {
    ui?.notifications?.error?.(message);
  },
  success(message) {
    ui?.notifications?.info?.(`✓ ${message}`);
  }
};

/**
 * Logger helper (uses system logger if available)
 */
export const log = {
  debug(message, data) {
    if (game.settings?.get?.(getSystemId(), 'debugMode')) {
      // eslint-disable-next-line no-console
      console.debug(`[${getSystemId()}] ${message}`, data ?? '');
    }
  },
  info(message, data) {
    // eslint-disable-next-line no-console
    console.log(`[${getSystemId()}] ${message}`, data ?? '');
  },
  warn(message, data) {
    // eslint-disable-next-line no-console
    console.warn(`[${getSystemId()}] ${message}`, data ?? '');
  },
  error(message, data) {
    // eslint-disable-next-line no-console
    console.error(`[${getSystemId()}] ${message}`, data ?? '');
  }
};

/**
 * Snapshot utility for safe state backups
 */
export function snapshotActor(actor) {
  if (!actor) return null;
  try {
    return {
      uuid: actor.uuid,
      id: actor.id,
      name: actor.name,
      type: actor.type,
      data: foundry.utils.deepClone(actor.toObject())
    };
  } catch {
    return null;
  }
}

/**
 * Restore from snapshot
 */
export async function restoreActorFromSnapshot(snapshot) {
  if (!snapshot?.uuid) return null;
  try {
    const actor = await getActorByUuid(snapshot.uuid);
    return actor;
  } catch {
    return null;
  }
}

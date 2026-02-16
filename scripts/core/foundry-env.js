/**
 * Foundry Environment Accessor - v13 / AppV2 Safe
 * Centralized, explicit access to Foundry runtime.
 */

/* -------------------------------------------- */
/* Internal Safe Accessors                      */
/* -------------------------------------------- */

const getGame = () => globalThis.game ?? null;
const getUI = () => globalThis.ui ?? null;
const getCanvasRef = () => globalThis.canvas ?? null;
const getFoundry = () => globalThis.foundry ?? null;
const getFromUuid = () => globalThis.fromUuid ?? null;

/* -------------------------------------------- */
/* System ID (lazy, safe)                       */
/* -------------------------------------------- */

export function getSystemId() {
  const game = getGame();
  return game?.system?.id ?? 'foundryvtt-swse';
}

/* -------------------------------------------- */
/* Actor Access                                 */
/* -------------------------------------------- */

export async function getActorByUuid(uuid) {
  if (typeof uuid !== 'string') return null;

  try {
    const fromUuid = getFromUuid();
    if (!fromUuid) return null;

    const doc = await fromUuid(uuid);
    return doc instanceof globalThis.Actor ? doc : null;
  } catch {
    return null;
  }
}

export function getActorById(id) {
  if (typeof id !== 'string') return null;

  const game = getGame();
  return game?.actors?.get(id) ?? null;
}

/* -------------------------------------------- */
/* Item Access                                  */
/* -------------------------------------------- */

export async function getItemByUuid(uuid) {
  if (typeof uuid !== 'string') return null;

  try {
    const fromUuid = getFromUuid();
    if (!fromUuid) return null;

    const doc = await fromUuid(uuid);
    return doc instanceof globalThis.Item ? doc : null;
  } catch {
    return null;
  }
}

export function getItemById(id) {
  if (typeof id !== 'string') return null;

  const game = getGame();
  return game?.items?.get(id) ?? null;
}

/* -------------------------------------------- */
/* Compendiums                                  */
/* -------------------------------------------- */

export function getCompendium(packName) {
  if (typeof packName !== 'string') return null;

  const game = getGame();
  const systemId = getSystemId();
  return game?.packs?.get(`${systemId}.${packName}`) ?? null;
}

export async function getCompendiumDocument(uuid) {
  if (typeof uuid !== 'string') return null;

  try {
    const fromUuid = getFromUuid();
    return fromUuid ? await fromUuid(uuid) : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------- */
/* Settings                                     */
/* -------------------------------------------- */

export function getSetting(key, defaultValue = undefined) {
  if (typeof key !== 'string') return defaultValue;

  const game = getGame();
  try {
    return game?.settings?.get(getSystemId(), key) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setSetting(key, value) {
  if (typeof key !== 'string') return false;

  const game = getGame();
  if (!game?.user?.isGM) return false;

  try {
    await game.settings.set(getSystemId(), key, value);
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------- */
/* Runtime Context                              */
/* -------------------------------------------- */

export function getCurrentUser() {
  return getGame()?.user ?? null;
}

export function isGameMaster() {
  return getGame()?.user?.isGM === true;
}

export function getWorld() {
  return getGame()?.world ?? null;
}

export function getCanvas() {
  return getCanvasRef();
}

export function isGameReady() {
  return getGame()?.ready === true;
}

/* -------------------------------------------- */
/* Notifications                                */
/* -------------------------------------------- */

export const notify = {
  info(message) {
    getUI()?.notifications?.info?.(message);
  },
  warn(message) {
    getUI()?.notifications?.warn?.(message);
  },
  error(message) {
    getUI()?.notifications?.error?.(message);
  },
  success(message) {
    getUI()?.notifications?.info?.(`✓ ${message}`);
  }
};

/* -------------------------------------------- */
/* Logger                                       */
/* -------------------------------------------- */

export const log = {
  debug(message, data) {
    const game = getGame();
    if (game?.settings?.get(getSystemId(), 'debugMode')) {
      console.debug(`[${getSystemId()}] ${message}`, data ?? '');
    }
  },
  info(message, data) {
    console.log(`[${getSystemId()}] ${message}`, data ?? '');
  },
  warn(message, data) {
    console.warn(`[${getSystemId()}] ${message}`, data ?? '');
  },
  error(message, data) {
    console.error(`[${getSystemId()}] ${message}`, data ?? '');
  }
};

/* -------------------------------------------- */
/* Snapshot Utilities                           */
/* -------------------------------------------- */

export function snapshotActor(actor) {
  if (!(actor instanceof globalThis.Actor)) return null;

  try {
    return {
      uuid: actor.uuid,
      id: actor.id,
      name: actor.name,
      type: actor.type,
      data: actor.toObject()
    };
  } catch {
    return null;
  }
}

/**
 * NOTE:
 * This does NOT restore document state.
 * It only re-fetches the actor safely.
 */
export async function getActorFromSnapshot(snapshot) {
  if (!snapshot?.uuid) return null;
  return getActorByUuid(snapshot.uuid);
}

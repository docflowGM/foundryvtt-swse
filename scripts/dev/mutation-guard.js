import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function isDevMode() {
  try {
    return game?.settings?.get('foundryvtt-swse', 'devMode') ?? false;
  } catch (_err) {
    return false;
  }
}

function deepClone(value) {
  try {
    return structuredClone(value);
  } catch (_err) {
    return JSON.parse(JSON.stringify(value));
  }
}


function stableSerialize(value) {
  const t = typeof value;
  if (value === null) {return 'null';}
  if (t === 'undefined') {return 'undefined';}
  if (t === 'number' || t === 'boolean' || t === 'string') {return JSON.stringify(value);}
  if (t === 'bigint') {return JSON.stringify(value.toString());}
  if (t === 'function' || t === 'symbol') {return JSON.stringify(`[${t}]`);}

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (t === 'object') {
    const keys = Object.keys(value).sort();
    const inner = keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(value[k])}`).join(',');
    return `{${inner}}`;
  }

  return JSON.stringify(String(value));
}

/**
 * Wrap a function and throw if it mutates the provided characterData.
 *
 * Guard is enabled only when the system devMode setting is true.
 *
 * @template {Function} F
 * @param {F} fn
 * @param {string} [label]
 * @returns {F}
 */
export function guardAgainstMutation(fn, label = fn?.name ?? 'anonymous') {
  if (!isDevMode()) {return fn;}

  // @ts-ignore - we keep signature stable
  return function guarded(characterData, ...args) {
    const before = deepClone(characterData);
    const result = fn(characterData, ...args);

    const mutated = stableSerialize(characterData) !== stableSerialize(before);
    if (mutated) {
      const message = `[MUTATION-GUARD] ${label} mutated characterData directly`;
      SWSELogger.error(message);
      throw new Error(message);
    }

    return result;
  };
}

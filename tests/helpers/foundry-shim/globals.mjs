/**
 * Narrow global-object shim for the small set of Foundry runtime globals
 * this repo's droid Phase 3/4 domain services actually touch:
 * `foundry.utils`, `game.user`/`game.settings`, `ui.notifications`,
 * `Actor`/`Item` (referenced only as bare type markers, never
 * instantiated by these services), `CONST`, and `Hooks`. Deliberately
 * does not attempt to emulate the rest of the Foundry API surface — see
 * docs/audits/droid-converted-system-reconciliation-phase-4.md's
 * "Foundry-shim harness" section for the documented boundary of what this
 * does and does not support.
 *
 * No production module reads these shim functions directly — they only
 * ever read the real Foundry globals at runtime. This file exists purely
 * to give those same global names a harmless, deterministic value while a
 * test imports and exercises the real production module under Node.
 */

const SHIM_KEYS = ['foundry', 'game', 'ui', 'Actor', 'Item', 'CONST', 'Hooks'];

function deepCloneJSON(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

/**
 * Narrow reimplementation of Foundry's `foundry.utils.flattenObject` —
 * plain nested objects collapse into dot-path keys; arrays and non-plain
 * objects (class instances) stay as leaf values, matching the real
 * behavior `scripts/utils/actor-utils.js#toFoundryDotPathPayload` relies
 * on. Added in PHASE 5 so `applyActorUpdateAtomic` (the real function
 * ActorEngine delegates every actor mutation to, including droid
 * conversion/reconciliation/Garage installs) can be loaded and exercised
 * for real through this harness.
 */
function flattenObject(obj, parentPath = '') {
  const out = {};
  for (const [key, value] of Object.entries(obj ?? {})) {
    const path = parentPath ? `${parentPath}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
      Object.assign(out, flattenObject(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

/**
 * Narrow reimplementation of Foundry's `foundry.utils.expandObject` —
 * the inverse of flattenObject above. Dot-path keys (including a
 * '-='-prefixed last segment, Foundry's deletion-key convention) expand
 * into nested objects; the '-=' prefix is preserved literally as part of
 * the key, matching real Foundry behavior (deletion is interpreted later,
 * by Document#update() itself, not by expandObject).
 */
function expandObject(flatObj) {
  const result = {};
  for (const [key, value] of Object.entries(flatObj ?? {})) {
    const parts = String(key).split('.');
    let node = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
      node = node[part];
    }
    node[parts[parts.length - 1]] = value;
  }
  return result;
}

function buildDefaultShim() {
  return {
    foundry: {
      utils: {
        deepClone: deepCloneJSON,
        mergeObject: (target = {}, source = {}) => ({ ...target, ...source }),
        flattenObject,
        expandObject
      }
    },
    game: {
      user: { isGM: false, id: 'test-gm-user', name: 'Test User' },
      settings: { get: () => undefined },
      // A real Map, not a plain object — tests that need
      // game.actors.get(id) to recover a world actor (the synthetic-token
      // targeting fix in scripts/utils/actor-utils.js) call
      // `game.actors.set(id, actor)` directly rather than through
      // installFoundryShimGlobals()'s shallow-merge overrides parameter.
      actors: new Map()
    },
    ui: {
      notifications: { info: () => {}, warn: () => {}, error: () => {} }
    },
    Actor: class FakeActorBase {},
    Item: class FakeItemBase {},
    CONST: {},
    Hooks: { on: () => {}, once: () => {}, call: () => {}, callAll: () => {} }
  };
}

/**
 * Install (or reinstall) the shim globals, optionally overriding specific
 * keys (e.g. `{ game: { user: { isGM: true } } }` for a GM-permission
 * test). Safe to call repeatedly — each call fully replaces the prior
 * shim rather than merging deeply, so tests never leak state through
 * shared globals (test 39: "shim resets global state between tests").
 *
 * @param {object} [overrides]
 */
export function installFoundryShimGlobals(overrides = {}) {
  const shim = buildDefaultShim();
  for (const [key, value] of Object.entries(overrides)) {
    shim[key] = (typeof value === 'object' && value !== null && !Array.isArray(value) && typeof shim[key] === 'object')
      ? { ...shim[key], ...value }
      : value;
  }
  for (const key of SHIM_KEYS) {
    globalThis[key] = shim[key];
  }
}

/** Reset every shim global back to its default, harmless value. */
export function resetFoundryShimGlobals() {
  installFoundryShimGlobals();
}

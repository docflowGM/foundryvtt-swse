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

function buildDefaultShim() {
  return {
    foundry: {
      utils: {
        deepClone: deepCloneJSON,
        mergeObject: (target = {}, source = {}) => ({ ...target, ...source })
      }
    },
    game: {
      user: { isGM: false, id: 'test-gm-user', name: 'Test User' },
      settings: { get: () => undefined }
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

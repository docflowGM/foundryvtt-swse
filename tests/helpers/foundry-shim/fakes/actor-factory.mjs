/**
 * Minimal fake droid Actor builder — PHASE 4 Foundry-shim test harness.
 *
 * Implements only the surface scripts/domain/droids/droid-statblock-conversion-service.js,
 * scripts/domain/droids/droid-converted-system-reconciliation-service.js,
 * scripts/engine/progression/utils/snapshot-manager.js, and
 * scripts/actors/droid/droid-mode-adapter.js actually read/call:
 * `.type`, `.system`, `.flags`, `.items` (a plain array — the resolver's
 * own `asArray()` already handles a plain array directly), `.isOwner`,
 * `.id`/`.name`, `.toObject()`, and `.getFlag()`.
 */

function deepCloneJSON(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

/**
 * @param {object} [overrides]
 * @param {string} [overrides.id]
 * @param {string} [overrides.name]
 * @param {boolean} [overrides.isOwner]
 * @param {object} [overrides.system]
 * @param {object} [overrides.flags]
 * @param {object[]} [overrides.items] - each item should carry both `id`
 *   and `_id` set to the same string, matching real embedded-document
 *   shape closely enough for id-based lookups.
 * @returns {object} a fake droid Actor.
 */
export function createFakeDroidActor(overrides = {}) {
  const actor = {
    id: overrides.id ?? 'fake-droid-1',
    name: overrides.name ?? 'Fake Droid',
    type: 'droid',
    isOwner: overrides.isOwner ?? true,
    system: deepCloneJSON(overrides.system ?? {}),
    flags: deepCloneJSON(overrides.flags ?? {}),
    items: (overrides.items ?? []).map(deepCloneJSON),
    effects: (overrides.effects ?? []).map(deepCloneJSON),
    toObject(_source) {
      return deepCloneJSON({
        system: actor.system,
        name: actor.name,
        img: actor.img,
        prototypeToken: actor.prototypeToken,
        items: actor.items,
        effects: actor.effects,
        flags: actor.flags
      });
    },
    getFlag(scope, key) {
      return actor.flags?.[scope]?.[key];
    }
  };
  return actor;
}

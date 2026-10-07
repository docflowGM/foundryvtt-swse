// Phase 5B-2 -- immutable canonical weapon authority registry.
// Holds ONLY registry/immutable records and two indexes (productionId -> identityKey, identityKey -> record), built once.
// No actor-dependent, ammo, equip, turn or target state is ever cached here (planner ruling B).
import { WeaponRuntimeError, ERROR_CODES } from './errors.js';
import { deepFreeze } from './deep-freeze.js';

export class WeaponAuthorityRegistry {
  #byKey = new Map();
  #byProductionId = new Map();
  #hash;

  constructor(data, { registryHash = null } = {}) {
    if (!data || !Array.isArray(data.identities)) {
      throw new WeaponRuntimeError(ERROR_CODES.REGISTRY_INVALID, 'registry data has no identities array');
    }
    for (const rec of data.identities) {
      if (!rec?.identityKey) throw new WeaponRuntimeError(ERROR_CODES.REGISTRY_INVALID, 'registry record without identityKey');
      if (this.#byKey.has(rec.identityKey)) {
        throw new WeaponRuntimeError(ERROR_CODES.REGISTRY_INVALID, `duplicate identity ${rec.identityKey}`, { identityKey: rec.identityKey });
      }
      this.#byKey.set(rec.identityKey, deepFreeze(rec));
    }
    for (const [pid, key] of Object.entries(data.productionIdIndex ?? {})) {
      if (!this.#byKey.has(key)) {
        throw new WeaponRuntimeError(ERROR_CODES.REGISTRY_INVALID, `production id ${pid} maps to missing identity ${key}`, { productionId: pid, identityKey: key });
      }
      this.#byProductionId.set(pid, key);
    }
    this.#hash = registryHash ?? data.identitiesSha256 ?? null;
    this.inputs = deepFreeze({ ...(data.inputs ?? {}) });
    this.counts = deepFreeze({ ...(data.counts ?? {}) });
    Object.freeze(this);
  }

  /** @param {string} key */ getByIdentityKey(key) { return this.#byKey.get(key) ?? null; }
  /** @param {string} id production/compendium document id */ getIdentityKeyByProductionId(id) { return this.#byProductionId.get(id) ?? null; }
  hasIdentity(key) { return this.#byKey.has(key); }
  getAll() { return [...this.#byKey.values()]; }
  get size() { return this.#byKey.size; }
  get registryHash() { return this.#hash; }
}

let shared = null;
let loadFailure = null;
export function setSharedWeaponAuthorityRegistry(registry) { shared = registry; loadFailure = null; return registry; }
export function getSharedWeaponAuthorityRegistry() { return shared; }
/** Phase 5D-A: the error of the last failed startup load (null when loaded or never attempted). Consumers fail closed on it. */
export function getWeaponAuthorityRegistryLoadFailure() { return loadFailure; }
export function resetSharedWeaponAuthorityRegistry() { shared = null; loadFailure = null; }

/** Foundry-side loader (not used by tests, which build from the JSON file directly). Records a load failure so consumers cannot silently treat canonical weapons as legacy. */
export async function loadWeaponAuthorityRegistry(url = 'systems/foundryvtt-swse/data/weapons/canonical-weapon-registry.json') {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new WeaponRuntimeError(ERROR_CODES.REGISTRY_INVALID, `registry fetch failed (${res.status})`, { url });
    return setSharedWeaponAuthorityRegistry(new WeaponAuthorityRegistry(await res.json()));
  } catch (err) {
    loadFailure = err instanceof WeaponRuntimeError ? err : new WeaponRuntimeError(ERROR_CODES.REGISTRY_INVALID, `registry load failed: ${err?.message ?? err}`, { url });
    throw loadFailure;
  }
}

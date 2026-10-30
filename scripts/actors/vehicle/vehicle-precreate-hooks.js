/**
 * Phase 4E P0: canonical vehicle creation is source-only and fail-closed.
 * No legacy normalization, name-derived published category, or implicit
 * installed weapon Item creation occurs at Actor creation.
 */
import { classifyVehicleActorSource } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-runtime-contract.js";
import { isLedgerUpdateAllowed } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js";
import { checkProvenanceUpdate, claimsPublishedSource } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-source-identity.js";
import { UNIVERSAL_VEHICLE_PACKS } from "/systems/foundryvtt-swse/scripts/domain/vehicles/universal-vehicle-pack-registry.js";

let registered = false;

/**
 * Foundry preCreateActor is cancellable by returning false.
 * Keep this synchronous: a promise returning false cannot veto reliably.
 * The empty Phase 4D scratch shell remains valid.
 */
export function validateVehicleCreation(document, data) {
  const assessment = classifyVehicleActorSource(document, data);
  if (assessment.kind === 'invalid-canonical') {
    const reason = 'UNIVERSAL_VEHICLE_SOURCE_INVALID: ' + assessment.errors.join(',');
    console.error('[foundryvtt-swse] Vehicle creation denied: ' + reason);
    return false;
  }
  return undefined;
}

/** preUpdateActor: the install ledger changes only through VehicleInstallationService. */
export function guardVehicleInstallationLedger(actor, changes) {
  if (actor?.type !== 'vehicle') return undefined;
  if (isLedgerUpdateAllowed(actor.id, changes)) return undefined;
  console.error('[foundryvtt-swse] Vehicle installation ledger write denied: UNAUTHORIZED_LEDGER_WRITE');
  return false;
}

/**
 * Apply an update's changes (dotted or nested, with -= deletions) to a plain copy of the
 * Actor source, the way Foundry would, so the result can be validated BEFORE it persists.
 */
export function applyChangesToCopy(source, changes) {
  const out = structuredClone(source);
  const setPath = (path, value) => {
    const keys = path.split('.');
    let node = out;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i].replace(/^(-=|==)/, '');
      if (node[k] === null || typeof node[k] !== 'object') node[k] = {};
      node = node[k];
    }
    const last = keys.at(-1);
    if (last.startsWith('-=')) delete node[last.slice(2)];
    else if (last.startsWith('==')) node[last.slice(2)] = value;
    else node[last] = value;
  };
  const walk = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj ?? {})) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length && !/^(-=|==)/.test(k)) walk(v, path);
      else setPath(path, v);
    }
  };
  walk(changes, '');
  return out;
}

/**
 * preUpdateActor: (1) published identity, source record and printed statistics are immutable,
 * and (2) an ordinary update may not persist ANY state that would make the runtime contract
 * reject the vehicle (e.g. current HP above the printed maximum, a forged mirror, a stock
 * weapon row). A vehicle that is already invalid is not trapped: repairs remain possible.
 */
export function guardVehicleProvenance(actor, changes) {
  const verdict = checkProvenanceUpdate(actor, changes);
  if (!verdict.ok) {
    console.error('[foundryvtt-swse] Vehicle provenance update denied: UNIVERSAL_VEHICLE_PROVENANCE_IMMUTABLE ' + verdict.paths.join(','));
    return false;
  }
  if (actor?.type !== 'vehicle' || !claimsPublishedSource(actor)) return undefined;
  const source = typeof actor.toObject === 'function' ? actor.toObject() : actor._source ?? actor;
  if (classifyVehicleActorSource(source, undefined, { mode: 'runtime' }).kind !== 'canonical') return undefined;
  const after = classifyVehicleActorSource(applyChangesToCopy(source, changes), undefined, { mode: 'runtime' });
  if (after.kind === 'invalid-canonical') {
    console.error('[foundryvtt-swse] Vehicle update denied: UNIVERSAL_VEHICLE_SOURCE_INVALID ' + after.errors.join(','));
    return false;
  }
  return undefined;
}

export function registerVehiclePreCreateHooks() {
  if (registered) return;
  registered = true;
  Hooks.on('preCreateActor', validateVehicleCreation);
  Hooks.on('preUpdateActor', guardVehicleInstallationLedger);
  Hooks.on('preUpdateActor', guardVehicleProvenance);
  // Intentionally no createActor weapon hydration. Source firing groups are
  // reference evidence, not permissions or physical mounted weapons.
}

/**
 * Category ownership follows the same 11-pack registry used by the pack
 * builder/browser. Never recreate an incomplete category list in this hook.
 */
export async function getVehicleCategoryMapping() {
  return Object.fromEntries(UNIVERSAL_VEHICLE_PACKS.flatMap(
    spec => spec.categories.map(category => [category, spec.name])
  ));
}

export function getCanonicalCategories() {
  return {
    planetary: UNIVERSAL_VEHICLE_PACKS.filter(spec => spec.family !== 'starship')
      .flatMap(spec => spec.categories),
    starships: UNIVERSAL_VEHICLE_PACKS.filter(spec => spec.family === 'starship')
      .flatMap(spec => spec.categories)
  };
}

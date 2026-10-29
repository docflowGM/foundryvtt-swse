/**
 * Phase 4E P0: canonical vehicle creation is source-only and fail-closed.
 * No legacy normalization, name-derived published category, or implicit
 * installed weapon Item creation occurs at Actor creation.
 */
import { classifyVehicleActorSource } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-runtime-contract.js";
import { isLedgerUpdateAllowed } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js";
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

export function registerVehiclePreCreateHooks() {
  if (registered) return;
  registered = true;
  Hooks.on('preCreateActor', validateVehicleCreation);
  Hooks.on('preUpdateActor', guardVehicleInstallationLedger);
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

/**
 * Phase 4E P0: canonical vehicle creation is source-only and fail-closed.
 * No legacy normalization, name-derived published category, or implicit
 * installed weapon Item creation occurs at Actor creation.
 */
import { classifyVehicleActorSource } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-runtime-contract.js";

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

export function registerVehiclePreCreateHooks() {
  if (registered) return;
  registered = true;
  Hooks.on('preCreateActor', validateVehicleCreation);
  // Intentionally no createActor weapon hydration. Source firing groups are
  // reference evidence, not permissions or physical mounted weapons.
}

/** Published category authority comes from the universal registry. */
export async function getVehicleCategoryMapping() {
  const { UNIVERSAL_VEHICLE_PACKS } = await import(
    "/systems/foundryvtt-swse/scripts/domain/vehicles/universal-vehicle-pack-registry.js"
  );
  return Object.fromEntries(UNIVERSAL_VEHICLE_PACKS.flatMap(
    spec => spec.categories.map(category => [category, spec.name])
  ));
}

export function getCanonicalCategories() {
  return {
    planetary: ['walker', 'speeder', 'tracked-vehicle', 'wheeled-vehicle', 'repulsorlift-tank'],
    starships: ['starfighter', 'space-transport', 'capital-ship', 'space-station'],
    hybrid: ['hybrid-vehicle-droid', 'vehicle-droid']
  };
}

/**
 * Which vehicles may still draw modifiers from the legacy `system.installedSystems` map?
 *
 * Published (source-backed) hulls and rules-legal custom hulls (digest-sealed
 * `flags.swse.vehicleConstruction`) get their installed-system effects from the sealed
 * installation authority via getEffectiveVehicleDerived; the legacy field must contribute
 * NOTHING for them, so a forged or stale `system.installedSystems` entry can never change a
 * certified vehicle's mechanics or double-count its effects. Only an unclaimed/homebrew hull
 * (no source claim, no construction record) keeps the legacy behavior. Fails closed on an
 * unknown or invalid classification. Pure; no Foundry globals.
 */
import { classifyVehicleActorSource } from '/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-runtime-contract.js';

export function legacyInstalledSystemsMayModify(actor) {
  if (!actor || actor.type !== 'vehicle') return false;
  const kind = classifyVehicleActorSource(actor, undefined, { mode: 'runtime' }).kind;
  if (kind !== 'custom' && kind !== 'scratch') return false;
  const construction = actor.flags?.swse?.vehicleConstruction;
  return !(construction && typeof construction === 'object');
}

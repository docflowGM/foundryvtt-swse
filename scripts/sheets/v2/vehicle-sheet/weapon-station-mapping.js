// scripts/sheets/v2/vehicle-sheet/weapon-station-mapping.js
//
// Phase 7 (vehicle-crew-runtime-and-ux-phase-7): deterministic resolution of
// which crew station operates a given vehicle weapon mount.
//
// Phase 6 wired up multi-gunner stations (gunner, gunner-2, gunner-3, ...)
// but every weapon's Fire button still targeted a hard-coded role string
// (weapon.crewRole || 'gunner') regardless of which specific gunner station
// actually exists or is assigned — so a crew member assigned to gunner-2
// could never fire any weapon: every Fire button always asked station
// 'gunner' for an operator. This module is the single place that decides
// the real answer, with a fixed precedence order (see resolveWeaponOperatorStation),
// and returns a structured, ambiguity-aware result instead of guessing.

const PRECEDENCE = ['explicit', 'legacy', 'role-unique'];

/**
 * @param {Object} params
 * @param {Array}  params.stations - station descriptors from
 *   crew-resolver.js#resolveVehicleCrewStations (each has storageKey/role).
 * @param {string} params.role - the weapon mount's declared crew role
 *   (e.g. 'gunner', 'pilot'). Used only for the role-unique fallback.
 * @param {string|null} [params.explicitStationKey] - an explicit per-weapon
 *   operator station key, if the weapon data specifies one
 *   (system.vehicleMount.operatorStation / system.weapons[i].operatorStation).
 * @param {string|null} [params.legacyStationKey] - a legacy explicit gunner
 *   assignment field, if this vehicle's data model has one. No such field
 *   currently exists in this codebase's schema; this parameter exists so a
 *   future legacy-data importer has a defined slot in the precedence chain
 *   without a second resolver implementation being written later.
 * @returns {{stationKey: string|null, source: string, reason?: string, candidates?: string[]}}
 *   source is one of: 'explicit' | 'legacy' | 'role-unique' | 'unmapped' | 'ambiguous' | 'broken'.
 */
export function resolveWeaponOperatorStation({ stations = [], role = 'gunner', explicitStationKey = null, legacyStationKey = null } = {}) {
  const stationList = Array.isArray(stations) ? stations : [];

  if (explicitStationKey) {
    const match = stationList.find((station) => station.storageKey === explicitStationKey || station.key === explicitStationKey);
    if (match) return { stationKey: match.storageKey, source: 'explicit' };
    return { stationKey: null, source: 'broken', reason: `Station "${explicitStationKey}" no longer exists on this vehicle.` };
  }

  if (legacyStationKey) {
    const match = stationList.find((station) => station.storageKey === legacyStationKey || station.key === legacyStationKey);
    if (match) return { stationKey: match.storageKey, source: 'legacy' };
    return { stationKey: null, source: 'broken', reason: `Station "${legacyStationKey}" no longer exists on this vehicle.` };
  }

  const roleMatches = stationList.filter((station) => station.role === role);
  if (roleMatches.length === 1) return { stationKey: roleMatches[0].storageKey, source: 'role-unique' };
  if (roleMatches.length === 0) {
    return { stationKey: null, source: 'unmapped', reason: `No ${role} station exists on this vehicle.` };
  }
  return {
    stationKey: null,
    source: 'ambiguous',
    reason: `Multiple ${role} stations exist (${roleMatches.map((station) => station.storageKey).join(', ')}) and this weapon has no explicit station mapping.`,
    candidates: roleMatches.map((station) => station.storageKey)
  };
}

export function isResolvedOperatorStation(resolution) {
  return PRECEDENCE.includes(resolution?.source);
}

// scripts/sheets/v2/vehicle-sheet/crew-resolver.js
// Phase 4 crew resolver: pure, reusable station visibility and assignment display for vehicle sheet v2.

import { VehicleCrewPositions } from "/systems/foundryvtt-swse/scripts/actors/vehicle/vehicle-crew-positions.js";

const EMPTY = "—";

const BASE_STATIONS = [
  { key: "pilot", role: "pilot", label: "Pilot", always: true, reason: "Required vehicle operator" },
  { key: "copilot", role: "copilot", label: "Copilot", reason: "Multi-crew support" },
  { key: "engineer", role: "engineer", label: "Engineer", reason: "Engineering or subsystem support" },
  { key: "shields", role: "shields", label: "Shield Operator", reason: "Shield controls" },
  { key: "commander", role: "commander", label: "Commander", reason: "Large-crew command" }
];

function object(value) {
  return value && typeof value === "object" ? value : {};
}

function array(value) {
  if (Array.isArray(value)) return value;
  if (value?.contents && Array.isArray(value.contents)) return value.contents;
  if (typeof value?.toJSON === "function") {
    const json = value.toJSON();
    if (Array.isArray(json)) return json;
  }
  if (value && typeof value[Symbol.iterator] === "function") return Array.from(value);
  return [];
}

function firstPresent(...values) {
  for (const value of values) {
    if (value === 0 || value === false) return value;
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }
  return null;
}

function label(value, fallback = EMPTY) {
  const resolved = firstPresent(value);
  return resolved === null ? fallback : String(resolved);
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasResource(system, ...keys) {
  return keys.some((key) => {
    const value = system?.[key];
    if (value && typeof value === "object") {
      return firstPresent(value.value, value.current, value.total, value.max, value.maximum) !== null;
    }
    return firstPresent(value) !== null;
  });
}

function normalizeCrewEntry(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return { name: entry, uuid: null, id: null };
  if (typeof entry === "object") {
    return {
      name: label(firstPresent(entry.name, entry.label, entry.actorName, entry.uuid, entry.id), null),
      uuid: firstPresent(entry.uuid, entry.actorUuid, entry.actorUUID, null),
      id: firstPresent(entry.id, entry.actorId, null)
    };
  }
  return { name: String(entry), uuid: null, id: null };
}

function positionSkills(key) {
  const definition = VehicleCrewPositions.POSITION_SKILLS?.[key] ?? {};
  const required = array(definition.required);
  const beneficial = array(definition.beneficial);
  return {
    required,
    beneficial,
    labels: [...required, ...beneficial].map((skillKey) => VehicleCrewPositions._formatSkillName?.(skillKey) ?? skillKey)
  };
}

function weaponStations(system, weapons) {
  const explicitGunners = array(system?.crewPositions?.gunners ?? system?.crewPositions?.gunnerStations ?? system?.gunners);
  const weaponCount = weapons?.count ?? array(system?.weapons).length;
  const count = Math.max(explicitGunners.length, weaponCount || 0);
  if (!count) return [];

  return Array.from({ length: count }, (_, index) => ({
    key: index === 0 ? "gunner" : `gunner-${index + 1}`,
    role: "gunner",
    sourceKey: index === 0 ? "gunner" : `gunner${index + 1}`,
    label: count === 1 ? "Gunner" : `Gunner ${index + 1}`,
    reason: "Vehicle weapons available"
  }));
}

function customStations(system) {
  return array(system?.stations)
    .map((station, index) => {
      if (!station) return null;
      const key = String(firstPresent(station.key, station.id, station.role, `custom-${index + 1}`));
      const normalized = key.replace(/[^a-zA-Z0-9_-]+/g, "-").toLowerCase();
      return {
        key: normalized,
        role: label(firstPresent(station.role, station.type, "custom"), "custom"),
        sourceKey: key,
        label: label(firstPresent(station.label, station.name, station.role), `Station ${index + 1}`),
        reason: label(station.reason, "Custom station"),
        custom: true,
        storedCrew: station.crew ?? station.occupant ?? station.actor ?? null
      };
    })
    .filter(Boolean);
}

function shouldShowStation(station, facts) {
  if (station.always || station.custom) return true;
  if (station.role === "copilot") return facts.largeCrew || facts.multiCrew || facts.categoryLargeCrew;
  if (station.role === "engineer") return facts.enhancedEngineer || facts.swes || facts.hasSubsystems || facts.largeCrew;
  if (station.role === "shields") return facts.hasShields || facts.enhancedShields;
  if (station.role === "commander") return facts.enhancedCommander || facts.largeCrew || facts.categoryLargeCrew;
  return true;
}

function stationCrew(positions, station) {
  const candidates = [station.sourceKey, station.key, station.role];
  for (const key of candidates) {
    if (!key) continue;
    const entry = positions[key];
    if (entry) return normalizeCrewEntry(entry);
  }
  return normalizeCrewEntry(station.storedCrew);
}

function stationState(station, positions, facts) {
  const crew = stationCrew(positions, station);
  const skills = positionSkills(station.role);
  const assigned = Boolean(crew?.name || crew?.uuid || crew?.id);
  return {
    key: station.key,
    role: station.role,
    label: station.label || VehicleCrewPositions.getPositionDisplayName?.(station.role) || station.role,
    reason: station.reason,
    custom: Boolean(station.custom),
    required: station.always || station.role === "pilot",
    assigned,
    empty: !assigned,
    occupant: assigned ? label(crew?.name ?? crew?.uuid ?? crew?.id) : "Unassigned",
    crew,
    skills,
    skillSummary: skills.labels.length ? skills.labels.join(" / ") : EMPTY,
    fallback: !assigned ? label(facts.crewQuality, "Crew quality fallback") : null
  };
}

export function resolveVehicleCrewStations({ system = {}, category = {}, weapons = {}, settings = {} } = {}) {
  const vehicle = object(system);
  const positions = object(vehicle.crewPositions);
  const crewTotal = numberOrNull(vehicle.crew);
  const passengerTotal = numberOrNull(vehicle.passengers);
  const baseStations = [...BASE_STATIONS, ...weaponStations(vehicle, weapons), ...customStations(vehicle)];
  const facts = {
    crewQuality: firstPresent(vehicle.crewQuality, vehicle.crew_quality, "standard"),
    hasShields: hasResource(vehicle, "shields", "shield", "sr"),
    hasSubsystems: Boolean(vehicle.subsystems || vehicle.systems || vehicle.power),
    enhancedEngineer: Boolean(settings.enhancedEngineer),
    enhancedShields: Boolean(settings.enhancedShields),
    enhancedCommander: Boolean(settings.enhancedCommander),
    swes: Boolean(settings.swes),
    largeCrew: (crewTotal ?? 0) > 2 || (passengerTotal ?? 0) > 12,
    multiCrew: (crewTotal ?? 0) > 1,
    categoryLargeCrew: Boolean(category?.isLargeCrew)
  };

  const stations = baseStations
    .filter((station) => shouldShowStation(station, facts))
    .map((station) => stationState(station, positions, facts));

  const assignedCount = stations.filter((station) => station.assigned).length;
  const emptyCount = stations.length - assignedCount;
  const roleCounts = stations.reduce((counts, station) => {
    counts[station.role] = (counts[station.role] ?? 0) + 1;
    return counts;
  }, {});

  return {
    stations,
    assignedCount,
    emptyCount,
    totalStations: stations.length,
    hasStations: stations.length > 0,
    hasAssigned: assignedCount > 0,
    hasEmpty: emptyCount > 0,
    roleCounts,
    pilot: stations.find((station) => station.role === "pilot") ?? null,
    gunners: stations.filter((station) => station.role === "gunner"),
    facts
  };
}

// scripts/sheets/v2/vehicle-sheet/context.js
// Phase 3 vehicle context builder: pure display calculations, defensive v1-data compatibility.

import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { VEHICLE_CATEGORIES, getCategoryMetadata, parseVehicleCategory } from "/systems/foundryvtt-swse/scripts/data/vehicle-category-registry.js";
import { VehicleRules } from "/systems/foundryvtt-swse/scripts/engine/combat/vehicle/VehicleRules.js";
import { resolveVehicleCrewStations } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/crew-resolver.js";

const EMPTY = "—";
const CATEGORY_ALIASES = {
  capitalship: "capitalShip",
  capital_ship: "capitalShip",
  "capital-ship": "capitalShip",
  "capital ship": "capitalShip",
  spacestation: "spaceStation",
  space_station: "spaceStation",
  "space-station": "spaceStation",
  "space station": "spaceStation",
  starship: "transport",
  station: "spaceStation",
  generic: "vehicle",
  vehicle: "vehicle"
};

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

function pathValue(source, path) {
  return path.split(".").reduce((current, key) => object(current)[key], source);
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

function compactLabels(values) {
  return values.map((value) => label(value, null)).filter(Boolean);
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function percent(value, max) {
  const numericValue = numberOrNull(value);
  const numericMax = numberOrNull(max);
  if (numericValue === null || numericMax === null || numericMax <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((numericValue / numericMax) * 100)));
}

function resource(system, ...paths) {
  for (const path of paths) {
    const value = pathValue(system, path);
    if (value && typeof value === "object") {
      const current = firstPresent(value.value, value.current, value.total);
      const max = firstPresent(value.max, value.maximum);
      if (current !== null || max !== null) {
        return {
          value: label(current),
          max: label(max),
          display: current !== null && max !== null ? `${label(current)} / ${label(max)}` : label(firstPresent(current, max)),
          percent: percent(current, max)
        };
      }
    } else if (firstPresent(value) !== null) {
      return { value: label(value), max: EMPTY, display: label(value), percent: null };
    }
  }
  return { value: EMPTY, max: EMPTY, display: EMPTY, percent: null };
}

function defense(system, ...paths) {
  return label(firstPresent(...paths.map((path) => pathValue(system, path))));
}

function signed(value) {
  const number = numberOrNull(value);
  if (number === null) return label(value);
  return number > 0 ? `+${number}` : String(number);
}

function descriptionPreview(system) {
  const raw = firstPresent(system.description, system.biography, system.notes?.public, system.notes, system.details?.notes);
  if (!raw) return EMPTY;
  const text = String(raw).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return EMPTY;
  return text.length > 260 ? `${text.slice(0, 257)}...` : text;
}

function categoryCandidate(system) {
  const derived = object(system.derived);
  const identity = object(derived.identity);
  return firstPresent(identity.category, system.category, system.vehicleCategory, system.vehicleType, system.type, identity.typeLabel);
}

function normalizeCategoryKey(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  const parsed = parseVehicleCategory(text);
  if (parsed) return parsed;

  const simple = text.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const compact = simple.replace(/\s+/g, "");
  const dashed = simple.replace(/\s+/g, "-");
  const underscored = simple.replace(/\s+/g, "_");
  return CATEGORY_ALIASES[text] || CATEGORY_ALIASES[simple] || CATEGORY_ALIASES[compact] || CATEGORY_ALIASES[dashed] || CATEGORY_ALIASES[underscored] || null;
}

function inferDomain(categoryLabel, system) {
  const joined = [categoryLabel, system.type, system.starshipSpeed, system.hyperdrive, system.hyperdrive_class]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/starship|starfighter|transport|capital|station|space|hyperdrive/.test(joined)) return "starship";
  if (/walker|speeder|tracked|wheeled|mount|emplacement|airspeeder|ground/.test(joined)) return "planetary";
  return "generic";
}

function inferLayoutMode(categoryLabel, domain) {
  const normalized = String(categoryLabel || "").toLowerCase();
  if (/capital|cruiser|frigate|station/.test(normalized)) return "large-crew";
  if (/starfighter|speeder|walker|mount/.test(normalized)) return "compact";
  if (domain === "starship") return "starship";
  if (domain === "planetary") return "planetary";
  return "generic";
}

export function normalizeVehicleCategory(system = {}) {
  const raw = categoryCandidate(object(system));
  const key = normalizeCategoryKey(raw);
  const metadata = key ? getCategoryMetadata(key) : null;
  const labelText = metadata?.label || label(raw, "Vehicle");
  const domain = metadata?.domain || inferDomain(labelText, object(system));
  const layoutMode = inferLayoutMode(labelText, domain);

  return {
    key: key || String(labelText).toLowerCase().replace(/\s+/g, "-") || "vehicle",
    raw: label(raw, null),
    label: labelText,
    domain,
    layoutMode,
    isCanonical: Boolean(key && VEHICLE_CATEGORIES[key]),
    isStarship: domain === "starship",
    isPlanetary: domain === "planetary",
    isLargeCrew: layoutMode === "large-crew",
    isCompact: layoutMode === "compact"
  };
}

function buildDefenses(system) {
  return {
    reflex: defense(system, "reflexDefense", "defenses.reflex.total", "defenses.reflex", "derived.defenses.ref.total"),
    fortitude: defense(system, "fortitudeDefense", "defenses.fortitude.total", "defenses.fortitude", "derived.defenses.fort.total"),
    will: defense(system, "willDefense", "defenses.will.total", "defenses.will", "derived.defenses.will.total"),
    flatFooted: defense(system, "flatFooted", "defenses.flatFooted.total", "derived.defenses.flatFooted.total"),
    threshold: defense(system, "damageThreshold", "damage.threshold", "derived.damage.threshold"),
    reduction: defense(system, "damageReduction", "damage.reduction", "derived.damage.reduction"),
    armor: defense(system, "armorBonus", "armor.bonus", "derived.armor.bonus")
  };
}

function buildMovement(system) {
  const entries = [
    { key: "speed", label: "Speed", value: system.speed },
    { key: "starshipSpeed", label: "Starship Speed", value: system.starshipSpeed },
    { key: "maxVelocity", label: "Max Velocity", value: system.maxVelocity },
    { key: "maneuver", label: "Maneuver", value: signed(system.maneuver) },
    { key: "initiative", label: "Initiative", value: signed(system.initiative) }
  ].filter((entry) => label(entry.value, null));

  return {
    display: entries.length ? entries.map((entry) => `${entry.label}: ${entry.value}`).join(" · ") : EMPTY,
    entries,
    hasEntries: entries.length > 0
  };
}

function crewMemberLabel(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return firstPresent(value.name, value.label, value.uuid, value.id);
}

function safeRuleCheck(methodName) {
  try {
    return Boolean(VehicleRules?.[methodName]?.());
  } catch {
    return false;
  }
}

function buildVehicleRuleSettings() {
  return {
    enhancedPilot: safeRuleCheck("enhancedPilotEnabled"),
    enhancedEngineer: safeRuleCheck("enhancedEngineerEnabled"),
    enhancedShields: safeRuleCheck("enhancedShieldsEnabled"),
    enhancedCommander: safeRuleCheck("enhancedCommanderEnabled"),
    swes: safeRuleCheck("swesEnabled"),
    vehicleTurnController: safeRuleCheck("vehicleTurnControllerEnabled")
  };
}

function buildCrew(system, category, weapons, ruleSettings = {}) {
  const resolved = resolveVehicleCrewStations({ system, category, weapons, settings: ruleSettings });

  return {
    crew: label(system.crew),
    quality: label(system.crewQuality),
    passengers: label(system.passengers),
    notes: label(system.crewNotes),
    assignedCount: resolved.assignedCount,
    emptyCount: resolved.emptyCount,
    totalStations: resolved.totalStations,
    stations: resolved.stations,
    resolver: resolved
  };
}

function buildWeapons(actor, system) {
  const systemWeapons = array(system.weapons)
    .map((weapon, index) => ({
      key: `system-${index}`,
      name: label(weapon?.name, `Weapon ${index + 1}`),
      arc: label(weapon?.arc),
      attack: label(firstPresent(weapon?.attackBonus, weapon?.bonus)),
      damage: label(weapon?.damage),
      range: label(weapon?.range),
      source: "system"
    }))
    .filter((weapon) => weapon.name !== EMPTY || weapon.damage !== EMPTY || weapon.attack !== EMPTY);

  const itemWeapons = array(actor?.items)
    .filter((item) => item?.type === "weapon")
    .map((item, index) => ({
      key: item?.id || `item-${index}`,
      name: label(item?.name, `Weapon ${index + 1}`),
      arc: label(firstPresent(item?.system?.vehicleMount?.arc, item?.system?.arc)),
      attack: label(firstPresent(item?.system?.bonus, item?.system?.attackBonus)),
      damage: label(item?.system?.damage),
      range: label(item?.system?.range),
      source: "item"
    }));

  const weapons = systemWeapons.length ? systemWeapons : itemWeapons;
  return {
    count: weapons.length,
    items: weapons,
    hasWeapons: weapons.length > 0,
    emptyText: "No vehicle weapons found in existing v1 data."
  };
}

function buildCargo(system) {
  return {
    cargo: label(firstPresent(system.cargo, system.cargo_capacity)),
    passengers: label(system.passengers),
    consumables: label(system.consumables),
    carriedCraft: label(system.carried_craft),
    payload: label(system.payload)
  };
}

function buildCondition(system) {
  const step = numberOrNull(system.conditionTrack?.current) ?? numberOrNull(system.condition) ?? 0;
  const clamped = Math.max(0, Math.min(5, step));
  const labels = ["Normal", "-1", "-2", "-5", "-10", "Disabled"];
  return {
    step: clamped,
    label: labels[clamped] || label(step),
    penalty: clamped > 0 && clamped < 5 ? labels[clamped] : EMPTY
  };
}

function buildIdentity(actor, system, category) {
  const derived = object(system.derived);
  const identity = object(derived.identity);
  return {
    id: actor?.id ?? null,
    name: actor?.name || "Unnamed Vehicle",
    img: actor?.img || "icons/svg/mystery-man.svg",
    actorType: actor?.type || "vehicle",
    category: category.label,
    categoryKey: category.key,
    domain: category.domain,
    layoutMode: category.layoutMode,
    type: label(firstPresent(identity.typeLabel, system.type, category.label), "Vehicle"),
    size: label(firstPresent(identity.sizeLabel, system.size, system.sizeCategory)),
    tags: compactLabels(array(system.tags))
  };
}

function buildPanelVisibility(category, { shields, weapons, cargo }) {
  return {
    header: true,
    defenses: true,
    hull: true,
    shields: shields.display !== EMPTY || category.isStarship,
    movement: true,
    crew: true,
    weapons: weapons.hasWeapons || category.isStarship || category.isLargeCrew,
    cargo: Object.values(cargo).some((value) => value !== EMPTY),
    condition: true,
    details: true,
    notes: true,
    starshipDetails: category.isStarship,
    largeCrew: category.isLargeCrew
  };
}

function buildSettings(actor, ruleSettings = {}) {
  return {
    isOwner: Boolean(actor?.isOwner),
    isGM: Boolean(game?.user?.isGM),
    editable: false,
    readOnly: true,
    vehicleRules: ruleSettings
  };
}

function buildTheme(actor) {
  return ThemeResolutionService.buildSurfaceContext({ actor });
}

export function buildVehicleV2Context(actor, baseContext = {}) {
  const vehicle = object(actor?.system);
  const category = normalizeVehicleCategory(vehicle);
  const hull = resource(vehicle, "hull", "hp", "health", "derived.hp");
  const shields = resource(vehicle, "shields", "shield", "sr", "derived.shields");
  const defenses = buildDefenses(vehicle);
  const movement = buildMovement(vehicle);
  const weapons = buildWeapons(actor, vehicle);
  const ruleSettings = buildVehicleRuleSettings();
  const crew = buildCrew(vehicle, category, weapons, ruleSettings);
  const cargo = buildCargo(vehicle);
  const condition = buildCondition(vehicle);
  const identity = buildIdentity(actor, vehicle, category);
  const details = {
    challengeLevel: label(vehicle.challengeLevel),
    cover: label(vehicle.cover),
    hyperdrive: label(firstPresent(vehicle.hyperdrive, vehicle.hyperdrive_class)),
    backupHyperdrive: label(firstPresent(vehicle.backupHyperdrive, vehicle.backup_class)),
    availability: label(vehicle.availability),
    sourcebook: label(vehicle.sourcebook),
    page: label(vehicle.page)
  };

  const readout = {
    identity,
    hull,
    shields,
    defenses,
    movement,
    crew,
    weapons,
    cargo,
    condition,
    notesPreview: descriptionPreview(vehicle),
    details
  };
  const flags = buildPanelVisibility(category, { shields, weapons, cargo });
  const settings = buildSettings(actor, ruleSettings);
  const theme = buildTheme(actor);

  return {
    ...baseContext,
    actor,
    vehicle,
    system: vehicle,
    category,
    layoutMode: category.layoutMode,
    readout,
    defenses,
    hull,
    shields,
    movement,
    weapons,
    crew,
    flags,
    settings,
    theme,
    editable: false,
    isOwner: settings.isOwner,
    isGM: settings.isGM,
    themeKey: theme.themeKey,
    motionStyle: theme.motionStyle,
    themeStyleInline: theme.themeStyleInline,
    motionStyleInline: theme.motionStyleInline,
    surfaceStyleInline: theme.surfaceStyleInline,
    vehicleReadout: {
      ...identity,
      hull,
      shields,
      defenses,
      movement: movement.display,
      crew: crew.crew,
      weaponCount: weapons.count,
      notesPreview: readout.notesPreview
    },
    vehicleV2: {
      ...readout,
      category,
      layoutMode: category.layoutMode,
      flags,
      settings,
      theme
    }
  };
}

export const buildVehicleV2ScaffoldContext = buildVehicleV2Context;

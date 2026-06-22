const VEHICLE_PACK_NAMES = [
  'vehicles-speeders',
  'vehicles-airspeeders',
  'vehicles-tracked',
  'vehicles-walkers',
  'vehicles-wheeled',
  'vehicles-weapon-emplacements',
  'vehicles-starfighters',
  'vehicles-space-transports',
  'vehicles-capital-ships',
  'vehicles-stations'
];

let _cache = null;

function packageId() {
  return game?.system?.id || 'foundryvtt-swse';
}

function packId(name) {
  return `${packageId()}.${name}`;
}

function lower(value) {
  return String(value ?? '').trim().toLowerCase();
}

function inferType(system = {}, packName = '') {
  const haystack = `${packName} ${system.category || ''} ${system.type || ''} ${(system.tags || []).join(' ')}`.toLowerCase();
  if (/station/.test(haystack)) return 'station';
  if (/walker|at-at|at-st|at-ap|at-te/.test(haystack)) return 'walker';
  if (/speeder|swoop|bike|airspeeder|landspeeder/.test(haystack)) return 'speeder';
  if (/starship|starfighter|fighter|transport|shuttle|freighter|gunship|capital|corvette|cruiser|frigate/.test(haystack)) return 'starship';
  return 'vehicle';
}

function normalizeIndexEntry(doc, packName) {
  const system = doc.system ?? {};
  return {
    id: `${packName}:${doc._id || doc.id || doc.name}`,
    uuid: `Compendium.${packId(packName)}.${doc._id || doc.id}`,
    packName,
    packLabel: game.packs.get(packId(packName))?.metadata?.label || packName,
    documentId: doc._id || doc.id,
    name: doc.name || 'Unnamed Vehicle',
    model: system.model || doc.name || 'Unnamed Vehicle',
    img: doc.img || 'icons/svg/vehicle.svg',
    category: system.category || system.type || '',
    vehicleBucket: system.vehicleBucket || '',
    vehicleBucketLabel: system.vehicleBucketLabel || '',
    vehicleFamily: system.vehicleFamily || '',
    vehicleFamilyLabel: system.vehicleFamilyLabel || '',
    type: inferType(system, packName),
    size: system.size || '',
    crew: system.crew || '',
    cargo: system.cargo || '',
    hyperdrive: system.vehicleHyperdriveLabel || system.hyperdrive_class || system.hyperdrive || '',
    consumables: system.vehicleConsumablesLabel || system.consumables || '',
    astrogation: system.vehicleAstrogationSupportLabel || system.vehicleAstrogationSupportStatus || '',
    sr: system.shields?.max ?? system.shieldRating ?? 0,
    cl: system.challengeLevel ?? system.cl ?? '',
    cost: system.cost || '',
    searchText: lower(`${doc.name} ${system.category} ${system.type} ${system.size} ${system.crew} ${system.cargo}`),
    raw: doc
  };
}

export class VehiclePackDataLoader {
  static get PACK_NAMES() {
    return [...VEHICLE_PACK_NAMES];
  }

  static clearCache() {
    _cache = null;
  }

  static async loadVehicleIndex() {
    if (_cache) return _cache;
    const results = [];

    for (const name of VEHICLE_PACK_NAMES) {
      const pack = game.packs.get(packId(name));
      if (!pack) continue;

      const index = await pack.getIndex({ fields: ['name', 'img', 'system.model', 'system.category', 'system.type', 'system.vehicleBucket', 'system.vehicleBucketLabel', 'system.vehicleFamily', 'system.vehicleFamilyLabel', 'system.size', 'system.crew', 'system.cargo', 'system.vehicleHyperdriveLabel', 'system.vehicleConsumablesLabel', 'system.vehicleAstrogationSupportLabel', 'system.hyperdrive_class', 'system.hyperdrive', 'system.shields', 'system.shieldRating', 'system.challengeLevel', 'system.cost'] });
      for (const entry of index) {
        results.push(normalizeIndexEntry(entry, name));
      }
    }

    results.sort((a, b) => a.name.localeCompare(b.name));
    _cache = results;
    return results;
  }

  static async loadVehicleDocument(entry) {
    if (!entry) return null;
    const pack = game.packs.get(packId(entry.packName));
    if (!pack) return null;
    return pack.getDocument(entry.documentId);
  }
}

Hooks.once('ready', () => VehiclePackDataLoader.clearCache());

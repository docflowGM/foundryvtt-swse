#!/usr/bin/env node

/**
 * Migration script to fix vehicles.db structure
 * Converts old schema to match SWSEVehicleDataModel expectations
 */

const fs = require('fs');
const path = require('path');

const VEHICLES_DB_PATH = path.join(__dirname, '../packs/vehicles.db');
const BACKUP_PATH = path.join(__dirname, '../packs/vehicles.db.backup');

// Crew quality modifiers for calculating base attack bonus and attributes
const CREW_QUALITY_MODIFIERS = {
  'untrained': { bab: 0, mod: -2 },
  'normal': { bab: 1, mod: 0 },
  'skilled': { bab: 3, mod: 1 },
  'expert': { bab: 6, mod: 2 },
  'ace': { bab: 9, mod: 3 }
};

// Size modifiers (for Reflex Defense calculation)
const SIZE_MODIFIERS = {
  'tiny': 2,
  'small': 1,
  'medium': 0,
  'large': -1,
  'huge': -2,
  'gargantuan': -5,
  'colossal': -10,
  'colossal (frigate)': -10,
  'colossal (cruiser)': -10,
  'colossal (station)': -10
};

/**
 * Extract crew quality from crew_size string
 */
function extractCrewQuality(crewSizeString) {
  if (!crewSizeString) return 'normal';

  const str = crewSizeString.toLowerCase();
  if (str.includes('untrained')) return 'untrained';
  if (str.includes('skilled')) return 'skilled';
  if (str.includes('expert')) return 'expert';
  if (str.includes('ace')) return 'ace';
  return 'normal';
}

/**
 * Extract crew count from crew_size string
 */
function extractCrewCount(crewSizeString) {
  if (!crewSizeString) return '1';

  const match = crewSizeString.match(/^(\d+)/);
  return match ? match[1] : '1';
}

/**
 * Infer vehicle size from stats
 */
function inferSize(vehicle) {
  const hp = vehicle.hit_points || 0;
  const dt = vehicle.damage_threshold || 0;

  // Heuristic based on hit points and damage threshold
  if (hp < 50) return 'Large';
  if (hp < 100) return 'Huge';
  if (hp < 200) return 'Gargantuan';
  if (dt > 100) return 'Colossal (Frigate)';
  if (dt > 200) return 'Colossal (Cruiser)';
  return 'Colossal';
}

/**
 * Calculate STR from Fortitude Defense
 * Fort Defense = 10 + STR modifier
 * STR modifier = Fort Defense - 10
 * STR = (modifier * 2) + 10
 */
function calculateStrFromFort(fortDefense) {
  if (!fortDefense) return 10;
  const modifier = fortDefense - 10;
  return Math.max(1, (modifier * 2) + 10);
}

/**
 * Calculate DEX from Reflex Defense (accounting for size and armor)
 * Reflex Defense = 10 + size modifier + armor bonus + DEX modifier
 * DEX modifier = Reflex Defense - 10 - size modifier - armor bonus
 */
function calculateDexFromReflex(reflexDefense, size, armorBonus) {
  if (!reflexDefense) return 10;

  const sizeModifier = SIZE_MODIFIERS[size.toLowerCase()] || 0;
  const armor = armorBonus || 0;
  const dexModifier = reflexDefense - 10 - sizeModifier - armor;

  return Math.max(1, Math.min(30, (dexModifier * 2) + 10));
}

/**
 * Check if weapon data is corrupted (contains category text)
 */
function isCorruptedWeapon(weapon) {
  if (!weapon || !weapon.name) return true;

  const name = weapon.name.toLowerCase();
  const corruptedTerms = ['categor', 'add category', 'vehicles', 'planetary', 'ground', 'speeders',
                          'starship', 'water', 'air', 'mandalorian', 'web enhancement'];

  return corruptedTerms.some(term => name.includes(term));
}

/**
 * Clean and validate weapons array
 */
function cleanWeapons(weapons) {
  if (!weapons || !Array.isArray(weapons)) return [];

  return weapons
    .filter(w => !isCorruptedWeapon(w))
    .map(w => ({
      name: w.name || 'Weapon',
      arc: w.arc || 'Forward',
      bonus: w.bonus || '+0',
      damage: w.damage || '1d10',
      range: w.range || 'Close'
    }));
}

/**
 * Parse speed string to extract initiative modifier
 * Higher speed = better initiative
 */
function calculateInitiative(speedString, crewQuality) {
  if (!speedString) return '+0';

  const speedMatch = speedString.match(/(\d+)/);
  const speedSquares = speedMatch ? parseInt(speedMatch[1]) : 10;

  // Base initiative from speed
  let init = Math.floor(speedSquares / 4); // 12 squares = +3

  // Crew quality bonus
  const crewMod = CREW_QUALITY_MODIFIERS[crewQuality]?.mod || 0;
  init += crewMod;

  return init >= 0 ? `+${init}` : `${init}`;
}

/**
 * Calculate maneuver bonus from speed and size
 */
function calculateManeuver(speedString, size) {
  if (!speedString) return '+0';

  const speedMatch = speedString.match(/(\d+)/);
  const speedSquares = speedMatch ? parseInt(speedMatch[1]) : 10;

  // Higher speed = better maneuver
  let maneuver = Math.floor(speedSquares / 3);

  // Size penalty
  const sizeModifier = SIZE_MODIFIERS[size.toLowerCase()] || 0;
  maneuver += Math.floor(sizeModifier / 2); // Half size penalty

  return maneuver >= 0 ? `+${maneuver}` : `${maneuver}`;
}

/**
 * Calculate base attack bonus from crew quality
 */
function calculateBaseAttackBonus(crewQuality) {
  const bab = CREW_QUALITY_MODIFIERS[crewQuality]?.bab || 1;
  return `+${bab}`;
}

/**
 * Clean and normalize speed string
 */
function normalizeSpeed(speedString) {
  if (!speedString) return '12 squares';

  // Convert "Squares" to "squares", normalize spacing
  return speedString
    .replace(/\s+/g, ' ')
    .replace(/Squares?/i, 'squares')
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .trim();
}

/**
 * Extract sensors/senses from vehicle type or generate default
 */
function generateSenses(vehicleType) {
  const type = (vehicleType || '').toLowerCase();

  if (type.includes('starship') || type.includes('starfighter')) {
    return 'Sensors +6, Targeting Computer';
  }
  if (type.includes('speeder') || type.includes('vehicle')) {
    return 'Perception +0';
  }
  return 'Perception +0';
}

/**
 * Migrate a single vehicle entry
 */
function migrateVehicle(vehicle) {
  const old = vehicle.system || {};

  // Extract crew quality for various calculations
  const crewQuality = extractCrewQuality(old.crew_size);
  const crewCount = extractCrewCount(old.crew_size);

  // Infer or extract size
  const size = inferSize(old);

  // Extract armor bonus from defenses
  const armorBonus = old.defenses?.armor_bonus || 0;

  // Calculate attributes from stats
  const strValue = calculateStrFromFort(old.defenses?.fortitude);
  const dexValue = calculateDexFromReflex(old.defenses?.reflex, size, armorBonus);

  // Clean weapons
  const weapons = cleanWeapons(old.weapons);

  // Build new system structure matching SWSEVehicleDataModel
  const newSystem = {
    // Attributes (required by data model)
    attributes: {
      str: {
        base: strValue,
        racial: 0,
        temp: 0
      },
      dex: {
        base: dexValue,
        racial: 0,
        temp: 0
      },
      con: {
        base: 10,
        racial: 0,
        temp: 0
      },
      int: {
        base: 10,
        racial: 0,
        temp: 0
      },
      wis: {
        base: 10,
        racial: 0,
        temp: 0
      },
      cha: {
        base: 10,
        racial: 0,
        temp: 0
      }
    },

    // Hull (from hit_points)
    hull: {
      value: old.hit_points || 50,
      max: old.hit_points || 50
    },

    // Shields (default to 0 if not specified)
    shields: {
      value: old.shields?.value || 0,
      max: old.shields?.max || 0
    },

    // Defenses (flatten from old structure)
    reflexDefense: old.defenses?.reflex || 10,
    fortitudeDefense: old.defenses?.fortitude || 10,
    flatFooted: old.defenses?.flat_footed || old.defenses?.reflex || 10,
    damageThreshold: old.damage_threshold || 30,
    damageReduction: old.damage_reduction || 0,

    // Armor and crew quality
    armorBonus: armorBonus,
    usePilotLevel: false, // Use armor bonus instead of pilot level
    crewQuality: crewQuality,

    // Movement - normalize field names
    speed: normalizeSpeed(old.speed),
    starshipSpeed: old.starship_speed || null,
    maxVelocity: old.max_velocity || '800 km/h',
    maneuver: old.maneuver || calculateManeuver(old.speed, size),
    initiative: old.initiative || calculateInitiative(old.speed, crewQuality),

    // Combat stats
    baseAttackBonus: old.base_attack_bonus || calculateBaseAttackBonus(crewQuality),

    // Size and type
    size: size,
    type: old.vehicle_type || old.type || 'Vehicle',

    // Crew and cargo - normalize field names
    crew: old.crew_size || `${crewCount} (${crewQuality} crew)`,
    passengers: old.passengers || '0',
    cargo: old.cargo_capacity || '100 kg',
    consumables: old.consumables || '1 week',

    // Hyperdrive - normalize field name
    hyperdrive_class: old.hyperdrive_class || null,
    backup_class: old.backup_class || null,

    // Cost
    cost: {
      new: old.cost?.new || 0,
      used: old.cost?.used || 0
    },

    // Weapons (cleaned)
    weapons: weapons,

    // Sensors
    senses: old.senses || generateSenses(old.vehicle_type),

    // Condition Track
    conditionTrack: {
      current: 0,
      penalty: 0
    },

    // Cover
    cover: old.cover || 'total',

    // Crew positions
    crewPositions: old.crewPositions || {
      pilot: null,
      copilot: null,
      gunner: null,
      engineer: null,
      shields: null,
      commander: null
    },

    // Additional fields
    carried_craft: old.carried_craft || null,
    crewNotes: old.crewNotes || '',
    tags: old.tags || [],
    description: old.description || '',
    sourcebook: old.sourcebook || '',
    page: old.page || null
  };

  // Return migrated vehicle
  return {
    _id: vehicle._id,
    name: vehicle.name,
    type: 'vehicle',
    img: vehicle.img || 'icons/svg/mystery-man.svg',
    system: newSystem,
    effects: vehicle.effects || [],
    folder: vehicle.folder || null,
    sort: vehicle.sort || 0,
    ownership: vehicle.ownership || { default: 0 },
    flags: vehicle.flags || {}
  };
}

/**
 * Main migration function
 */
async function migrateVehiclesDB() {
  console.log('🚀 Starting vehicles.db migration...\n');

  // 1. Backup original file
  console.log('📦 Creating backup...');
  fs.copyFileSync(VEHICLES_DB_PATH, BACKUP_PATH);
  console.log(`✅ Backup created: ${BACKUP_PATH}\n`);

  // 2. Read all vehicles
  console.log('📖 Reading vehicles.db...');
  const content = fs.readFileSync(VEHICLES_DB_PATH, 'utf8');
  const lines = content.trim().split('\n');
  console.log(`✅ Found ${lines.length} vehicles\n`);

  // 3. Parse and migrate each vehicle
  console.log('🔄 Migrating vehicles...');
  const migratedVehicles = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < lines.length; i++) {
    try {
      const vehicle = JSON.parse(lines[i]);
      const migrated = migrateVehicle(vehicle);
      migratedVehicles.push(migrated);
      successCount++;

      // Log progress every 50 vehicles
      if ((i + 1) % 50 === 0) {
        console.log(`  Processed ${i + 1}/${lines.length} vehicles...`);
      }
    } catch (error) {
      console.error(`❌ Error migrating vehicle on line ${i + 1}:`, error.message);
      errorCount++;
    }
  }

  console.log(`✅ Migration complete: ${successCount} success, ${errorCount} errors\n`);

  // 4. Write migrated data back to file
  console.log('💾 Writing migrated data...');
  const output = migratedVehicles.map(v => JSON.stringify(v)).join('\n') + '\n';
  fs.writeFileSync(VEHICLES_DB_PATH, output, 'utf8');
  console.log(`✅ Wrote ${migratedVehicles.length} vehicles to ${VEHICLES_DB_PATH}\n`);

  // 5. Generate migration report
  console.log('📊 Migration Report:');
  console.log('═══════════════════════════════════════');
  console.log(`Total vehicles: ${lines.length}`);
  console.log(`Successfully migrated: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Backup location: ${BACKUP_PATH}`);
  console.log('═══════════════════════════════════════\n');

  // 6. Sample the first migrated vehicle for verification
  if (migratedVehicles.length > 0) {
    console.log('🔍 Sample migrated vehicle:');
    console.log(JSON.stringify(migratedVehicles[0], null, 2).substring(0, 1500) + '...\n');
  }

  console.log('✨ Migration complete! Your vehicles.db is now ready for import.\n');
}

// Run migration
migrateVehiclesDB().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

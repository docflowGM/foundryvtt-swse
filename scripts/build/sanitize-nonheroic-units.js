/**
 * Script to sanitize nonheroic_units.json for NPC character sheet compatibility
 * Removes unnecessary data and transforms the format to match Foundry VTT SWSE expectations
 */

const fs = require('fs');
const path = require('path');

// Helper function to calculate ability modifier
function calculateAbilityMod(score) {
  return Math.floor((score - 10) / 2);
}

// Helper function to extract numeric value from string
function extractNumber(str) {
  if (!str || str === "") return null;
  const match = str.toString().match(/-?\d+/);
  return match ? parseInt(match[0]) : null;
}

// Helper function to parse size
function parseSize(sizeStr) {
  if (!sizeStr || sizeStr === "") return "medium";
  const size = sizeStr.toLowerCase().trim();
  const validSizes = ["fine", "diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"];
  return validSizes.includes(size) ? size : "medium";
}

// Helper function to clean and parse feats/talents
function parseFeatureList(str) {
  if (!str || str === "") return [];
  // Remove leading colons and extra whitespace
  let cleaned = str.replace(/^:\s*/, '').trim();
  // Split by comma, clean up each entry
  return cleaned
    .split(',')
    .map(f => f.trim())
    .filter(f => f.length > 0 && !f.match(/^\d+$/)); // Remove empty and numeric-only entries
}

// Helper function to clean up text fields
function cleanTextField(str) {
  if (!str || str === "") return "";
  return str.trim();
}

// Helper function to extract speed value
function extractSpeed(speedStr) {
  if (!speedStr || speedStr === "") return 6; // Default
  const match = speedStr.match(/(\d+)\s*Squares?/i);
  return match ? parseInt(match[1]) : 6;
}

// Main sanitization function
function sanitizeNPCEntry(rawEntry) {
  // Calculate ability modifiers
  const str = rawEntry.str || 10;
  const dex = rawEntry.dex || 10;
  const con = rawEntry.con || 10;
  const int = rawEntry.int || 10;
  const wis = rawEntry.wis || 10;
  const cha = rawEntry.cha || 10;

  const sanitized = {
    name: rawEntry.name || "Unnamed NPC",
    type: "npc",

    // Only include non-empty metadata
    ...(rawEntry.cl && { challengeLevel: extractNumber(rawEntry.cl) }),
    ...(rawEntry.size && rawEntry.size !== "" && { size: parseSize(rawEntry.size) }),
    ...(rawEntry.species_type && rawEntry.species_type !== "" && { speciesType: rawEntry.species_type }),

    // Ability scores (transform to proper structure)
    abilities: {
      str: {
        base: str,
        racial: 0,
        misc: 0,
        total: str,
        mod: calculateAbilityMod(str)
      },
      dex: {
        base: dex,
        racial: 0,
        misc: 0,
        total: dex,
        mod: calculateAbilityMod(dex)
      },
      con: {
        base: con,
        racial: 0,
        misc: 0,
        total: con,
        mod: calculateAbilityMod(con)
      },
      int: {
        base: int,
        racial: 0,
        misc: 0,
        total: int,
        mod: calculateAbilityMod(int)
      },
      wis: {
        base: wis,
        racial: 0,
        misc: 0,
        total: wis,
        mod: calculateAbilityMod(wis)
      },
      cha: {
        base: cha,
        racial: 0,
        misc: 0,
        total: cha,
        mod: calculateAbilityMod(cha)
      }
    },

    // Defenses (extract if available, otherwise use calculated values)
    defenses: {
      reflex: {
        base: 10,
        armor: 0,
        ability: calculateAbilityMod(dex),
        classBonus: 0,
        misc: 0,
        total: extractNumber(rawEntry.reflex) || (10 + calculateAbilityMod(dex))
      },
      fortitude: {
        base: 10,
        armor: 0,
        ability: calculateAbilityMod(con),
        classBonus: 0,
        misc: 0,
        total: extractNumber(rawEntry.fortitude) || (10 + calculateAbilityMod(con))
      },
      will: {
        base: 10,
        armor: 0,
        ability: calculateAbilityMod(wis),
        classBonus: 0,
        misc: 0,
        total: extractNumber(rawEntry.will) || (10 + calculateAbilityMod(wis))
      }
    },

    // HP
    hp: {
      value: extractNumber(rawEntry.hp) || 10,
      max: extractNumber(rawEntry.hp) || 10,
      temp: 0
    },

    // Core stats
    ...(rawEntry.level && rawEntry.level !== "" && { level: extractNumber(rawEntry.level) || 1 }),
    ...(rawEntry.bab && rawEntry.bab !== "" && { bab: extractNumber(rawEntry.bab) }),
    ...(rawEntry.initiative && rawEntry.initiative !== "" && { initiative: extractNumber(rawEntry.initiative) }),
    ...(rawEntry.damage_threshold && rawEntry.damage_threshold !== "" && { damageThreshold: extractNumber(rawEntry.damage_threshold) }),

    speed: extractSpeed(rawEntry.speed),

    // Senses and perception
    ...(rawEntry.senses && rawEntry.senses !== "" && { senses: cleanTextField(rawEntry.senses) }),
    ...(rawEntry.perception && rawEntry.perception !== "" && { perception: extractNumber(rawEntry.perception) }),

    // Features
    feats: parseFeatureList(rawEntry.feats),
    talents: parseFeatureList(rawEntry.talents),

    // Skills (keep as unparsed string for now, can be manually added)
    ...(rawEntry.skills && rawEntry.skills !== "" && { skillsText: cleanTextField(rawEntry.skills) }),

    // Equipment/Possessions (keep first 500 chars, remove excess description)
    ...(rawEntry.possessions && rawEntry.possessions !== "" && {
      equipment: cleanTextField(rawEntry.possessions.substring(0, 500))
    }),

    // Abilities text
    ...(rawEntry.abilities_text && rawEntry.abilities_text !== "" && {
      abilitiesText: cleanTextField(rawEntry.abilities_text)
    }),

    // Species traits
    ...(rawEntry.species_traits && rawEntry.species_traits !== "" && {
      speciesTraits: cleanTextField(rawEntry.species_traits)
    }),

    // Force powers
    ...(rawEntry.force_powers && rawEntry.force_powers !== "" && {
      forcePowers: cleanTextField(rawEntry.force_powers),
      forceSensitive: true
    }),

    // Condition track
    conditionTrack: {
      current: 0,
      persistent: false,
      penalty: 0
    }
  };

  return sanitized;
}

// Main execution
function main() {
  const inputFile = path.join(__dirname, '..', '..', 'data', 'nonheroic', 'nonheroic_units.json');
  const outputFile = path.join(__dirname, '..', '..', 'data', 'nonheroic', 'nonheroic_units_sanitized.json');

  swseLogger.log('Reading nonheroic_units.json...');

  // Read file line by line (JSONL format)
  const rawData = fs.readFileSync(inputFile, 'utf8');
  const lines = rawData.trim().split('\n');

  swseLogger.log(`Found ${lines.length} entries`);

  const sanitizedEntries = [];
  let skipped = 0;

  lines.forEach((line, index) => {
    try {
      const rawEntry = JSON.parse(line);

      // Skip entries with no name or all zero ability scores
      if (!rawEntry.name || rawEntry.name === "") {
        skipped++;
        return;
      }

      // Skip entries that are just section headers (all stats are 0 or empty)
      const hasStats = rawEntry.str || rawEntry.dex || rawEntry.con ||
                       rawEntry.int || rawEntry.wis || rawEntry.cha ||
                       rawEntry.hp;

      if (!hasStats) {
        skipped++;
        return;
      }

      const sanitized = sanitizeNPCEntry(rawEntry);
      sanitizedEntries.push(sanitized);

    } catch (error) {
      swseLogger.error(`Error parsing line ${index + 1}:`, error.message);
      skipped++;
    }
  });

  swseLogger.log(`Sanitized ${sanitizedEntries.length} entries`);
  swseLogger.log(`Skipped ${skipped} invalid/empty entries`);

  // Write output as proper JSON array
  fs.writeFileSync(outputFile, JSON.stringify(sanitizedEntries, null, 2), 'utf8');

  swseLogger.log(`\nSanitized data written to: ${outputFile}`);
  swseLogger.log(`File size reduced from ${(rawData.length / 1024).toFixed(2)} KB to ${(JSON.stringify(sanitizedEntries).length / 1024).toFixed(2)} KB`);
}

// Run the script
main();

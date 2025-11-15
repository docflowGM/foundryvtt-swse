/**
 * Convert vehicle JSON files to FoundryVTT .db compendium format
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a unique 16-character hex ID (like FoundryVTT does)
function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

// Convert stock ships to vehicle actors
function convertStockShips() {
  const inputPath = path.join(__dirname, '../data/stock-ships.json');
  const outputPath = path.join(__dirname, '../packs/stock-ships.db');

  const ships = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const output = [];

  for (const ship of ships) {
    const doc = {
      _id: generateId(),
      name: ship.name,
      type: "vehicle",
      img: "icons/svg/mystery-man.svg",
      system: {
        // Map JSON properties to vehicle system data
        hp: {
          value: ship.hitPoints || 100,
          max: ship.hitPoints || 100
        },
        speed: ship.speedCharacter || "0 sq.",
        speedStarship: ship.speedStarship || "0 sq.",
        size: ship.size || "Huge",
        abilities: {
          str: {
            base: ship.strength || 10,
            total: ship.strength || 10,
            mod: Math.floor((ship.strength || 10 - 10) / 2)
          },
          dex: {
            base: ship.dexterity || 10,
            total: ship.dexterity || 10,
            mod: Math.floor((ship.dexterity || 10 - 10) / 2)
          },
          int: {
            base: ship.intelligence || 10,
            total: ship.intelligence || 10,
            mod: Math.floor((ship.intelligence || 10 - 10) / 2)
          }
        },
        damageReduction: ship.dr || 0,
        armor: ship.armor || 0,
        cost: ship.cost || 0,
        costModifier: ship.costModifier || 1,
        crew: ship.crew || 1,
        passengers: ship.passengers || 0,
        cargoCapacity: ship.cargoCapacity || "0 kg",
        consumables: ship.consumables || "0 Days",
        emplacementPoints: ship.emplacementPoints || 0,
        unusedEmplacementPoints: ship.unusedEmplacementPoints || 0,
        description: `Stock ship template: ${ship.name}`
      },
      effects: [],
      folder: null,
      sort: 0,
      ownership: {
        default: 0
      },
      flags: {}
    };

    output.push(JSON.stringify(doc));
  }

  fs.writeFileSync(outputPath, output.join('\n') + '\n');
  console.log(`✓ Converted ${ships.length} stock ships to ${outputPath}`);
}

// Convert vehicle modifications to equipment items
function convertVehicleModifications() {
  const categories = [
    'accessories',
    'defense-systems',
    'movement-systems',
    'weapon-systems'
  ];

  const outputPath = path.join(__dirname, '../packs/vehicle-modifications.db');
  const output = [];

  for (const category of categories) {
    const inputPath = path.join(__dirname, `../data/vehicle-modifications/${category}.json`);
    const mods = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    for (const mod of mods) {
      const doc = {
        _id: generateId(),
        name: mod.name,
        type: "equipment",
        img: "icons/svg/item-bag.svg",
        system: {
          // Store all modification data in system
          modId: mod.id,
          category: mod.category || "Accessory",
          weaponType: mod.weaponType || "",
          damage: mod.damage || "",
          emplacementPoints: mod.emplacementPoints || 0,
          availability: mod.availability || "Common",
          sizeRestriction: mod.sizeRestriction || null,
          cost: mod.cost || 0,
          costType: mod.costType || "flat",
          costMultiplier: mod.costMultiplier || 1,
          weight: 0, // Vehicles don't have weight
          description: `<p>${mod.description || ""}</p><p><strong>Effect:</strong> ${mod.effect || ""}</p>`,
          source: "Vehicle Modification",
          // Add custom flags for vehicle-specific data
          vehicleModData: {
            originalId: mod.id,
            category: mod.category,
            effect: mod.effect,
            weaponType: mod.weaponType,
            sizeRestriction: mod.sizeRestriction
          }
        },
        effects: [],
        folder: null,
        sort: 0,
        ownership: {
          default: 0
        },
        flags: {
          swse: {
            vehicleModification: true,
            modCategory: mod.category
          }
        }
      };

      output.push(JSON.stringify(doc));
    }

    console.log(`✓ Converted ${mods.length} ${category}`);
  }

  fs.writeFileSync(outputPath, output.join('\n') + '\n');
  console.log(`✓ Total: ${output.length} vehicle modifications written to ${outputPath}`);
}

// Run conversions
console.log('Converting vehicle JSON files to .db format...\n');
convertStockShips();
convertVehicleModifications();
console.log('\n✓ Conversion complete!');

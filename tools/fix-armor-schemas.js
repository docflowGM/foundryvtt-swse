#!/usr/bin/env node

/**
 * Migration script to fix armor .db files with proper armor schemas
 * - Fixes armor types from Light/Medium/Heavy to proper "armor" type
 * - Adds proper armor bonuses and max dex bonuses from reference data
 * - Removes vehicle-specific fields
 * - Adds missing armor fields
 */

const fs = require('fs');
const path = require('path');

// Load reference data
const lightArmorData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'armor', 'light.json'), 'utf-8'));
const mediumArmorData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'armor', 'medium.json'), 'utf-8'));
const heavyArmorData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'armor', 'heavy.json'), 'utf-8'));

// Create lookup maps by name
const armorDataMap = new Map();

function addToMap(armorArray) {
  armorArray.forEach(armor => {
    // Store both the original name and a normalized version
    armorDataMap.set(armor.name, armor);
    // Also store with normalized name (fixing common typos)
    const normalizedName = armor.name.replace(/Sassets\/uit/g, 'Suit').replace(/Gassets\/uide/g, 'Guide');
    if (normalizedName !== armor.name) {
      armorDataMap.set(normalizedName, armor);
    }
  });
}

function findArmorData(name) {
  // Try exact match first
  let data = armorDataMap.get(name);
  if (data) return data;

  // Try normalized match
  const normalized = name.replace(/Suit/g, 'Sassets/uit').replace(/Guide/g, 'Gassets/uide');
  return armorDataMap.get(normalized);
}

addToMap(lightArmorData);
addToMap(mediumArmorData);
addToMap(heavyArmorData);

function parseWeight(weightStr) {
  if (!weightStr || weightStr === '-') return 0;
  const match = weightStr.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function parseCost(costVal) {
  if (!costVal || costVal === '-' || costVal === 'Varies') return 0;
  if (typeof costVal === 'number') return costVal;
  const costStr = String(costVal);
  const match = costStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function calculateArmorCheckPenalty(armorType, armorBonus) {
  // SWSE armor check penalty rules
  if (armorType === 'light') {
    if (armorBonus <= 3) return 0;
    if (armorBonus <= 5) return -1;
    return -2;
  } else if (armorType === 'medium') {
    if (armorBonus <= 6) return -2;
    if (armorBonus <= 8) return -4;
    return -5;
  } else { // heavy
    if (armorBonus <= 9) return -5;
    return -10;
  }
}

function calculateSpeedPenalty(armorType) {
  // SWSE speed penalty rules
  if (armorType === 'light') return 0;
  if (armorType === 'medium') return -1; // -1 square
  return -2; // heavy: -2 squares
}

function fixArmorDB(armorType) {
  const fileName = `armor-${armorType}.db`;
  const filePath = path.join(__dirname, '..', 'packs', fileName);

  swseLogger.log(`\nFixing ${fileName}...`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  const fixedLines = lines.map(line => {
    const entry = JSON.parse(line);

    // Look up reference data
    let refData = findArmorData(entry.name);

    if (!refData) {
      swseLogger.warn(`  Warning: No reference data found for "${entry.name}", using defaults`);
      // Use defaults if no reference found
      refData = {
        armor_bonus: armorType === 'light' ? 3 : armorType === 'medium' ? 7 : 9,
        equipment_bonus: 0,
        max_dex_bonus: armorType === 'light' ? 5 : armorType === 'medium' ? 3 : 1,
        weight: "10 kg",
        cost: "1000"
      };
    }

    // Calculate total reflex bonus (armor + equipment)
    const totalReflexBonus = (refData.armor_bonus || 0) + (refData.equipment_bonus || 0);
    const armorBonus = refData.armor_bonus || 0;
    const equipmentBonus = refData.equipment_bonus || 0;

    // Create proper armor entry
    const newEntry = {
      _id: entry._id,
      name: entry.name,
      type: 'armor',
      img: entry.img || 'icons/svg/item-bag.svg',
      system: {
        armorType: armorType,
        defenseBonus: armorBonus,
        equipmentBonus: equipmentBonus,
        maxDexBonus: refData.max_dex_bonus !== undefined ? refData.max_dex_bonus : (armorType === 'light' ? 5 : armorType === 'medium' ? 3 : 1),
        armorCheckPenalty: calculateArmorCheckPenalty(armorType, armorBonus),
        speedPenalty: calculateSpeedPenalty(armorType),
        fortBonus: 0, // Most armor doesn't provide fort bonus unless special
        weight: parseWeight(refData.weight),
        cost: parseCost(refData.cost),
        equipped: false,
        description: `<p><strong>Armor Bonus:</strong> +${armorBonus}</p>` +
                     (equipmentBonus > 0 ? `<p><strong>Equipment Bonus:</strong> +${equipmentBonus}</p>` : '') +
                     `<p><strong>Maximum Dexterity Bonus:</strong> ${refData.max_dex_bonus !== undefined && refData.max_dex_bonus !== null ? '+' + refData.max_dex_bonus : 'Unlimited'}</p>` +
                     (refData.sourcebook ? `<p><strong>Source:</strong> ${refData.sourcebook}</p>` : ''),
        source: refData.sourcebook || '',
        tags: refData.tags || entry.system?.tags || [],
        availability: refData.availability || ''
      },
      effects: entry.effects || [],
      folder: entry.folder || null,
      sort: entry.sort || 0,
      ownership: entry.ownership || { default: 0 },
      flags: entry.flags || {}
    };

    return JSON.stringify(newEntry);
  });

  fs.writeFileSync(filePath, fixedLines.join('\n') + '\n', 'utf-8');
  swseLogger.log(`  ✓ Fixed ${fixedLines.length} ${armorType} armor entries`);
}

// Run all fixes
try {
  fixArmorDB('light');
  fixArmorDB('medium');
  fixArmorDB('heavy');
  swseLogger.log('\n✅ All armor .db files have been fixed!');
  swseLogger.log('\nArmor entries now include:');
  swseLogger.log('  - Proper armor bonus to Reflex Defense');
  swseLogger.log('  - Maximum Dexterity Bonus');
  swseLogger.log('  - Armor Check Penalty');
  swseLogger.log('  - Speed Penalty');
  swseLogger.log('  - Weight and Cost');
} catch (error) {
  swseLogger.error('❌ Error during migration:', error);
  process.exit(1);
}

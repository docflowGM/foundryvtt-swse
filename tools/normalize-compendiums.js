import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packsDir = path.join(__dirname, '..', 'packs');

// Normalize armor entries
function normalizeArmor(armor) {
  const system = armor.system || {};

  // Map old fields to new template fields
  const normalized = {
    armorType: system.armorType || 'light',
    reflexBonus: system.reflexBonus || system.defenseBonus || 0,
    fortitudeBonus: system.fortitudeBonus || system.fortBonus || 0,
    maxDex: system.maxDex !== undefined ? system.maxDex : (system.maxDexBonus !== undefined ? system.maxDexBonus : 999),
    weight: system.weight || 0,
    equipmentPerceptionBonus: system.equipmentPerceptionBonus || 0,
    armorProficiency: system.armorProficiency || false,
    features: system.features || ''
  };

  // Keep existing fields that aren't in template but might be useful
  armor.system = {
    ...system,
    ...normalized
  };

  return armor;
}

// Normalize weapon entries
function normalizeWeapon(weapon) {
  const system = weapon.system || {};

  // Ensure weight field exists
  if (system.weight === undefined) {
    system.weight = 0;
  }

  weapon.system = system;
  return weapon;
}

// Process a compendium file
function processFile(filePath, normalizer) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  const normalized = lines.map(line => {
    const item = JSON.parse(line);
    return JSON.stringify(normalizer(item));
  });

  fs.writeFileSync(filePath, normalized.join('\n') + '\n');
  console.log(`Processed: ${path.basename(filePath)}`);
}

// Process all armor files
const armorFiles = [
  'armor.db',
  'armor-light.db',
  'armor-medium.db',
  'armor-heavy.db'
];

armorFiles.forEach(file => {
  const filePath = path.join(packsDir, file);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    processFile(filePath, normalizeArmor);
  }
});

// Process all weapon files
const weaponFiles = [
  'weapons.db',
  'weapons-simple.db',
  'weapons-pistols.db',
  'weapons-rifles.db',
  'weapons-heavy.db',
  'weapons-exotic.db',
  'weapons-grenades.db'
];

weaponFiles.forEach(file => {
  const filePath = path.join(packsDir, file);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    processFile(filePath, normalizeWeapon);
  }
});

console.log('Normalization complete!');

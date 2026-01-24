import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packsDir = path.join(__dirname, '..', 'packs');

// Organize armor by type
function organizeArmor() {
  const armorFile = path.join(packsDir, 'armor.db');
  const content = fs.readFileSync(armorFile, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  const light = [];
  const medium = [];
  const heavy = [];
  const shields = [];

  lines.forEach(line => {
    const item = JSON.parse(line);
    const type = item.system?.armorType || 'light';

    if (type === 'light') {
      light.push(line);
    } else if (type === 'medium') {
      medium.push(line);
    } else if (type === 'heavy') {
      heavy.push(line);
    } else if (type === 'shield') {
      shields.push(line);
    }
  });

  // Write to type-specific files
  fs.writeFileSync(path.join(packsDir, 'armor-light.db'), light.join('\n') + (light.length > 0 ? '\n' : ''));
  fs.writeFileSync(path.join(packsDir, 'armor-medium.db'), medium.join('\n') + (medium.length > 0 ? '\n' : ''));
  fs.writeFileSync(path.join(packsDir, 'armor-heavy.db'), heavy.join('\n') + (heavy.length > 0 ? '\n' : ''));
  fs.writeFileSync(path.join(packsDir, 'armor-shields.db'), shields.join('\n') + (shields.length > 0 ? '\n' : ''));

  console.log(`Organized armor: ${light.length} light, ${medium.length} medium, ${heavy.length} heavy, ${shields.length} shields`);
}

// Organize weapons by category
function organizeWeapons() {
  const weaponFile = path.join(packsDir, 'weapons.db');
  const content = fs.readFileSync(weaponFile, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  const simple = [];
  const pistols = [];
  const rifles = [];
  const heavy = [];
  const exotic = [];
  const grenades = [];

  lines.forEach(line => {
    const item = JSON.parse(line);
    const category = item.system?.category || item.system?.subcategory || item.system?.proficiency || 'simple';

    if (category === 'grenade') {
      grenades.push(line);
    } else if (category === 'simple') {
      simple.push(line);
    } else if (category === 'pistol') {
      pistols.push(line);
    } else if (category === 'rifle') {
      rifles.push(line);
    } else if (category === 'heavy') {
      heavy.push(line);
    } else if (category === 'exotic') {
      exotic.push(line);
    } else {
      simple.push(line);
    }
  });

  // Write to category-specific files
  fs.writeFileSync(path.join(packsDir, 'weapons-simple.db'), simple.join('\n') + (simple.length > 0 ? '\n' : ''));
  fs.writeFileSync(path.join(packsDir, 'weapons-pistols.db'), pistols.join('\n') + (pistols.length > 0 ? '\n' : ''));
  fs.writeFileSync(path.join(packsDir, 'weapons-rifles.db'), rifles.join('\n') + (rifles.length > 0 ? '\n' : ''));
  fs.writeFileSync(path.join(packsDir, 'weapons-heavy.db'), heavy.join('\n') + (heavy.length > 0 ? '\n' : ''));
  fs.writeFileSync(path.join(packsDir, 'weapons-exotic.db'), exotic.join('\n') + (exotic.length > 0 ? '\n' : ''));
  fs.writeFileSync(path.join(packsDir, 'weapons-grenades.db'), grenades.join('\n') + (grenades.length > 0 ? '\n' : ''));

  console.log(`Organized weapons: ${simple.length} simple, ${pistols.length} pistols, ${rifles.length} rifles, ${heavy.length} heavy, ${exotic.length} exotic, ${grenades.length} grenades`);
}

organizeArmor();
organizeWeapons();

console.log('Organization complete!');

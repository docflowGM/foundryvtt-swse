import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packsDir = path.join(__dirname, '..', 'packs');

const armorFile = path.join(packsDir, 'armor.db');
const content = fs.readFileSync(armorFile, 'utf8');
const lines = content.split('\n').filter(line => line.trim());

const updated = lines.map(line => {
  const item = JSON.parse(line);

  if (item.system?.armorType === 'shield' && item.system?.shieldRating) {
    const sr = item.system.shieldRating;

    // Set proficiency required based on SR
    if (sr <= 10) {
      item.system.armorProficiencyRequired = 'light';
    } else if (sr <= 20) {
      item.system.armorProficiencyRequired = 'medium';
    } else {
      item.system.armorProficiencyRequired = 'heavy';
    }
  }

  return JSON.stringify(item);
});

fs.writeFileSync(armorFile, updated.join('\n') + '\n');
console.log('Updated shield proficiency requirements');

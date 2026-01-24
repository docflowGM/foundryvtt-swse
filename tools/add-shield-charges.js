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

  if (item.system?.armorType === 'shield') {
    // Add charges for shields
    item.system.charges = {
      current: 5,
      max: 5
    };
    item.system.activated = false;
  }

  return JSON.stringify(item);
});

fs.writeFileSync(armorFile, updated.join('\n') + '\n');
console.log('Added charges to shields');

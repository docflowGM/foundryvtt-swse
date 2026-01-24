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

  // Check if this is an energy shield
  if (item.name && (item.name.includes('Energy Shield') || item.name === 'Shield Gauntlet')) {
    item.system.armorType = 'shield';

    // Extract SR value if present
    const srMatch = item.name.match(/SR (\d+)/);
    if (srMatch) {
      item.system.shieldRating = parseInt(srMatch[1]);
    }
  }

  return JSON.stringify(item);
});

fs.writeFileSync(armorFile, updated.join('\n') + '\n');
console.log('Categorized energy shields');

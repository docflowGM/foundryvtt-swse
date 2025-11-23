/**
 * Script to add BAB progression and defense bonuses to class items
 * Run with: node tools/fix-class-defense-bab.js
 */

const fs = require('fs');
const path = require('path');

// Class data according to SWSE Core Rulebook
const classDefenseData = {
  'Jedi': {
    babProgression: 'fast',
    defenses: { reflex: 1, fortitude: 1, will: 1 }
  },
  'Noble': {
    babProgression: 'slow',
    defenses: { reflex: 1, fortitude: 0, will: 2 }
  },
  'Scoundrel': {
    babProgression: 'medium',
    defenses: { reflex: 2, fortitude: 0, will: 1 }
  },
  'Scout': {
    babProgression: 'medium',
    defenses: { reflex: 2, fortitude: 1, will: 0 }
  },
  'Soldier': {
    babProgression: 'fast',
    defenses: { reflex: 1, fortitude: 2, will: 0 }
  },
  // Prestige Classes
  'Ace Pilot': {
    babProgression: 'medium',
    defenses: { fortitude: 1, reflex: 2, will: 0 }
  },
  'Beast Master': {
    babProgression: 'medium',
    defenses: { fortitude: 1, reflex: 1, will: 1 }
  },
  'Bounty Hunter': {
    babProgression: 'fast',
    defenses: { fortitude: 1, reflex: 1, will: 0 }
  },
  'Crime Lord': {
    babProgression: 'medium',
    defenses: { fortitude: 0, reflex: 1, will: 2 }
  },
  'Elite Trooper': {
    babProgression: 'fast',
    defenses: { fortitude: 2, reflex: 1, will: 1 }
  },
  'Force Adept': {
    babProgression: 'medium',
    defenses: { fortitude: 0, reflex: 0, will: 2 }
  },
  'Force Disciple': {
    babProgression: 'medium',
    defenses: { fortitude: 1, reflex: 1, will: 2 }
  },
  'Gunslinger': {
    babProgression: 'fast',
    defenses: { fortitude: 0, reflex: 2, will: 0 }
  },
  'Jedi Knight': {
    babProgression: 'fast',
    defenses: { fortitude: 2, reflex: 2, will: 2 }
  },
  'Jedi Master': {
    babProgression: 'fast',
    defenses: { fortitude: 2, reflex: 2, will: 2 }
  },
  'Officer': {
    babProgression: 'medium',
    defenses: { fortitude: 0, reflex: 1, will: 2 }
  },
  'Sith Apprentice': {
    babProgression: 'medium',
    defenses: { fortitude: 1, reflex: 1, will: 2 }
  },
  'Sith Lord': {
    babProgression: 'fast',
    defenses: { fortitude: 2, reflex: 2, will: 2 }
  }
};

const dbPath = path.join(__dirname, '..', 'packs', 'classes.db');

console.log('Reading classes.db...');
const content = fs.readFileSync(dbPath, 'utf8');
const lines = content.split('\n').filter(line => line.trim());

console.log(`Found ${lines.length} class entries`);

const updatedLines = [];
let updatedCount = 0;
let notFoundCount = 0;

for (const line of lines) {
  if (!line.trim()) continue;

  try {
    const classItem = JSON.parse(line);
    const className = classItem.name;

    if (classDefenseData[className]) {
      // Add/Update BAB progression
      const oldBab = classItem.system.babProgression;
      classItem.system.babProgression = classDefenseData[className].babProgression;
      if (oldBab !== classItem.system.babProgression) {
        console.log(`Updated babProgression for ${className}: ${oldBab || 'none'} → ${classDefenseData[className].babProgression}`);
      }

      // Add/Update defense bonuses (always overwrite to fix any incorrect values)
      const oldDefenses = classItem.system.defenses ? JSON.stringify(classItem.system.defenses) : 'none';
      classItem.system.defenses = classDefenseData[className].defenses;
      const newDefenses = JSON.stringify(classDefenseData[className].defenses);

      if (oldDefenses !== newDefenses) {
        console.log(`Updated defenses for ${className}:`, classDefenseData[className].defenses);
        updatedCount++;
      }
    } else {
      console.warn(`⚠️  No defense data found for class: ${className}`);
      // Set defaults for unknown classes
      if (!classItem.system.babProgression) {
        classItem.system.babProgression = 'medium';
      }
      if (!classItem.system.defenses) {
        classItem.system.defenses = { fortitude: 0, reflex: 0, will: 0 };
      }
      notFoundCount++;
    }

    updatedLines.push(JSON.stringify(classItem));
  } catch (error) {
    console.error('Error parsing line:', error.message);
    updatedLines.push(line); // Keep original line if parsing fails
  }
}

// Write back to file
console.log('\nWriting updated classes.db...');
fs.writeFileSync(dbPath, updatedLines.join('\n') + '\n', 'utf8');

console.log(`\n✅ Done!`);
console.log(`   Updated: ${updatedCount} classes`);
console.log(`   Not found in reference data: ${notFoundCount} classes`);
console.log(`   Total: ${lines.length} classes`);

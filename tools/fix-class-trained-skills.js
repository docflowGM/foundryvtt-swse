#!/usr/bin/env node
// ============================================
// Fix Trained Skills for Classes
// Updates class trained_skills to correct values
// ============================================

const fs = require('fs');
const path = require('path');

// Correct trained skills values
const correctSkills = {
  "Jedi": 2,
  "Noble": 6,
  "Scoundrel": 5,
  "Scout": 4,
  "Soldier": 3
};

// Read classes.db
const classesDbPath = path.join(__dirname, '../packs/classes.db');
const dbLines = fs.readFileSync(classesDbPath, 'utf-8').split('\n').filter(line => line.trim());

console.log(`Found ${dbLines.length} class entries in classes.db\n`);

// Process each class entry
let updated = 0;
const updatedLines = dbLines.map(line => {
  try {
    const entry = JSON.parse(line);
    const className = entry.name;

    // Check if this class needs updating
    if (correctSkills[className] !== undefined) {
      const currentSkills = entry.system?.trained_skills;
      const correctValue = correctSkills[className];

      if (currentSkills !== correctValue) {
        console.log(`✓ Updating ${className}: ${currentSkills} -> ${correctValue} trained skills`);
        entry.system.trained_skills = correctValue;
        updated++;
      } else {
        console.log(`✓ ${className}: Already correct (${correctValue} trained skills)`);
      }
    }

    return JSON.stringify(entry);
  } catch (err) {
    console.error(`Error processing line: ${err.message}`);
    return line;
  }
});

// Write updated data
fs.writeFileSync(classesDbPath, updatedLines.join('\n') + '\n', 'utf-8');

console.log(`\n✅ Updated ${updated} class trained_skills values`);
console.log(`📝 Classes database has been updated with correct skill values`);

#!/usr/bin/env node
// ============================================
// Fix Hit Dice for Classes
// Updates all class hit dice to correct values
// ============================================

const fs = require('fs');
const path = require('path');

// Correct hit dice values
const correctHitDice = {
  // Base Classes
  "Jedi": "1d10",
  "Noble": "1d6",
  "Scoundrel": "1d6",
  "Scout": "1d8",
  "Soldier": "1d10",

  // Prestige Classes
  "Ace Pilot": "1d8",
  "Bounty Hunter": "1d10",
  "Crime Lord": "1d8",
  "Elite Trooper": "1d12",
  "Force Adept": "1d8",
  "Force Disciple": "1d8",
  "Gunslinger": "1d8",
  "Jedi Knight": "1d10",
  "Jedi Master": "1d10",
  "Officer": "1d8",
  "Sith Apprentice": "1d10",
  "Sith Lord": "1d10",

  // Additional Prestige Classes
  "Corporate Agent": "1d8",
  "Gladiator": "1d10",
  "Melee Duelist": "1d8",
  "Enforcer": "1d8",
  "Independent Droid": "1d12",
  "Infiltrator": "1d8",
  "Master Privateer": "1d10",
  "Medic": "1d8",
  "Saboteur": "1d8",
  "Assassin": "1d10",
  "Charlatan": "1d8",
  "Outlaw": "1d8",
  "Droid Commander": "1d10",
  "Military Engineer": "1d8",
  "Vanguard": "1d10",
  "Imperial Knight": "1d10",
  "Shaper": "1d8",
  "Improviser": "1d8",
  "Pathfinder": "1d10",
  "Martial Arts Master": "1d10"
};

// Read classes.db
const classesDbPath = path.join(__dirname, '../packs/classes.db');
const dbLines = fs.readFileSync(classesDbPath, 'utf-8').split('\n').filter(line => line.trim());

swseLogger.log(`Found ${dbLines.length} class entries in classes.db\n`);

// Process each class entry
let updated = 0;
const updatedLines = dbLines.map(line => {
  try {
    const entry = JSON.parse(line);
    const className = entry.name;

    // Check if this class needs updating
    if (correctHitDice[className]) {
      const currentHitDie = entry.system?.hit_die;
      const correctHitDie = correctHitDice[className];

      if (currentHitDie !== correctHitDie) {
        swseLogger.log(`✓ Updating ${className}: ${currentHitDie} -> ${correctHitDie}`);
        entry.system.hit_die = correctHitDie;
        updated++;
      }
    }

    return JSON.stringify(entry);
  } catch (err) {
    swseLogger.error(`Error processing line: ${err.message}`);
    return line;
  }
});

// Write updated data
fs.writeFileSync(classesDbPath, updatedLines.join('\n') + '\n', 'utf-8');

swseLogger.log(`\n✅ Updated ${updated} class hit dice`);
swseLogger.log(`📝 Classes database has been updated with correct hit dice values`);

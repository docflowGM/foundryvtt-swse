#!/usr/bin/env node
// ============================================
// Add class field to talents based on talent tree
// ============================================

const fs = require('fs');
const path = require('path');

// Map talent trees to their classes
const TALENT_TREE_TO_CLASS = {
  // Base Classes
  "Jedi Consular": "Jedi",
  "Jedi Guardian": "Jedi",
  "Jedi Sentinel": "Jedi",
  "Lightsaber Combat": "Jedi",

  "Influence": "Noble",
  "Inspiration": "Noble",
  "Leadership": "Noble",
  "Lineage": "Noble",
  "Fencing": "Noble",
  "Ideologue": "Noble",
  "Disgrace": "Noble",
  "Collaborator": "Noble",
  "Loyal Protector": "Noble",
  "Provocateur": "Noble",
  "Gambling Leader": "Noble",

  "Fortune": "Scoundrel",
  "Misfortune": "Scoundrel",
  "Slicer": "Scoundrel",
  "Spacer": "Scoundrel",
  "Outlaw Tech": "Scoundrel",
  "Malkite Poisoner": "Scoundrel",
  "Run and Gun": "Scoundrel",
  "Smuggling": "Scoundrel",
  "Opportunist": "Scoundrel",
  "Recklessness": "Scoundrel",
  "Yuuzhan Vong Biotech": "Scoundrel",

  "Awareness": "Scout",
  "Camouflage": "Scout",
  "Fringer": "Scout",
  "Survivor": "Scout",
  "Hyperspace Explorer": "Scout",
  "Spy": "Scout",
  "Reconnaissance": "Scout",
  "Surveillance": "Scout",
  "Unpredictable": "Scout",
  "Versatility": "Scout",

  "Armor Specialist": "Soldier",
  "Brawler": "Soldier",
  "Commando": "Soldier",
  "Weapon Specialist": "Soldier",
  "Rocket Jumper": "Soldier",
  "Mercenary": "Soldier",
  "Squad Leader": "Soldier",
  "Trooper": "Soldier",
  "Ambusher": "Soldier",
  "Brute Squad": "Soldier",

  // Prestige Classes
  "Expert Pilot": "Ace Pilot",
  "Gunner": "Ace Pilot",
  "Squadron Leader": "Ace Pilot",
  "Blockade Runner": "Ace Pilot",
  "Wingman": "Ace Pilot",

  "Bounty Hunter": "Bounty Hunter",
  "Gand Findsman": "Bounty Hunter",
  "Force Hunter": "Bounty Hunter",

  "Infamy": "Crime Lord",
  "Mastermind": "Crime Lord",

  "Weapon Master": "Elite Trooper",
  "Master of Teräs Käsi": "Elite Trooper",
  "Mandalorian Warrior": "Elite Trooper",
  "Critical Master": "Elite Trooper",
  "Melee Specialist": "Elite Trooper",
  "Republic Commando": "Elite Trooper",
  "Protection": "Elite Trooper",

  "Dark Side Devotee": "Force Adept",
  "Force Adept": "Force Adept",
  "Force Item": "Force Adept",
  "Imperial Inquisitor": "Force Adept",
  "Beastwarden": "Force Adept",
  "Mystic": "Force Adept",
  "Telepath": "Force Adept",

  "Gunslinger": "Gunslinger",
  "Pistoleer": "Gunslinger",
  "Carbineer": "Gunslinger",

  "Duelist": "Jedi Knight",
  "Lightsaber Forms": "Jedi Knight",
  "Jedi Battlemaster": "Jedi Knight",
  "Jedi Shadow": "Jedi Knight",
  "Jedi Watchman": "Jedi Knight",
  "Jedi Archivist": "Jedi Knight",
  "Jedi Healer": "Jedi Knight",
  "Jedi Artisan": "Jedi Knight",
  "Jedi Instructor": "Jedi Knight",
  "Jedi Investigator": "Jedi Knight",
  "Jedi Refugee": "Jedi Knight",
  "Jedi Weapon Master": "Jedi Knight",

  "Military Tactics": "Officer",
  "Naval Officer": "Officer",
  "Fugitive Commander": "Officer",
  "Rebel Recruiter": "Officer",

  "Sith": "Sith Apprentice",
  "Sith Alchemy": "Sith Apprentice",
  "Sith Commander": "Sith Apprentice",

  "Corporate Power": "Corporate Agent",

  "Gladiatorial Combat": "Gladiator",

  "Melee Duelist": "Melee Duelist",

  "Enforcement": "Enforcer",

  "Autonomy": "Independent Droid",
  "Specialized Droid": "Independent Droid",

  "Bothan SpyNet": "Infiltrator",
  "Infiltration": "Infiltrator",

  "Privateer": "Master Privateer",
  "Piracy": "Master Privateer",

  "Advanced Medicine": "Medic",

  "Sabotage": "Saboteur",
  "Turret": "Saboteur",

  "Assassin": "Assassin",
  "GenoHaradan": "Assassin",

  "Trickery": "Charlatan",

  "Outlaw": "Outlaw",

  "Droid Commander": "Droid Commander",

  "Military Engineer": "Military Engineer",

  "Vanguard": "Vanguard",

  "Knight's Armor": "Imperial Knight",
  "Knight's Resolve": "Imperial Knight",

  "Implant": "Shaper",
  "Shaper": "Shaper",

  "Procurement": "Improviser",
  "Improviser": "Improviser",

  "Pathfinder": "Pathfinder"
};

// Read talents.db
const talentsDbPath = path.join(__dirname, '../packs/talents.db');
const dbLines = fs.readFileSync(talentsDbPath, 'utf-8').split('\n').filter(line => line.trim());

swseLogger.log(`Processing ${dbLines.length} talents...\n`);

let updated = 0;
let notFound = new Set();

const updatedLines = dbLines.map(line => {
  try {
    const entry = JSON.parse(line);
    const talentTree = entry.system?.talent_tree;

    if (!talentTree) {
      swseLogger.warn(`⚠ ${entry.name}: No talent_tree field`);
      return line;
    }

    const className = TALENT_TREE_TO_CLASS[talentTree];

    if (!className) {
      notFound.add(talentTree);
      return line;
    }

    // Add class field if missing or different
    if (entry.system.class !== className) {
      entry.system.class = className;
      updated++;
      swseLogger.log(`✓ ${entry.name}: ${talentTree} → ${className}`);
    }

    return JSON.stringify(entry);
  } catch (err) {
    swseLogger.error(`Error processing line: ${err.message}`);
    return line;
  }
});

// Write updated data
fs.writeFileSync(talentsDbPath, updatedLines.join('\n') + '\n', 'utf-8');

swseLogger.log(`\n✅ Updated ${updated} talents with class field`);

if (notFound.size > 0) {
  swseLogger.log(`\n⚠ Warning: ${notFound.size} talent trees not found in mapping:`);
  notFound.forEach(tree => swseLogger.log(`  - ${tree}`));
}

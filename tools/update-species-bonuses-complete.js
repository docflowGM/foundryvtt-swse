/**
 * Complete species database update with all skill bonuses and special abilities
 * Based on SWSE Core Rulebook and expansion books
 */

import fs from 'fs';
import path from 'path';

// Complete species data from official SWSE rulebooks
const speciesData = {
  // Core Rulebook
  "Bothan": {
    skillBonuses: ["+2 Stealth", "+2 Perception"],
    special: ["Heightened Awareness: May reroll any Perception check, must keep the result of the reroll even if worse"]
  },
  "Cerean": {
    skillBonuses: ["+2 Initiative", "+2 Knowledge (Life Sciences)"],
    special: ["Dual Brain: May reroll any Initiative check, must keep the result of the reroll even if worse"]
  },
  "Duros": {
    skillBonuses: ["+2 Pilot", "+2 Knowledge (Galactic Lore)"],
    special: []
  },
  "Ewok": {
    skillBonuses: ["+2 Stealth", "+2 Survival"],
    special: []
  },
  "Human": {
    skillBonuses: [],
    special: ["Bonus Feat: Humans gain one bonus feat at 1st level", "Bonus Trained Skill: Humans gain one additional trained skill at 1st level"]
  },
  "Ithorian": {
    skillBonuses: ["+2 Persuasion", "+2 Survival"],
    special: []
  },
  "Kel Dor": {
    skillBonuses: ["+2 Perception", "+2 Use the Force"],
    special: []
  },
  "Mon Calamari": {
    skillBonuses: ["+2 Perception", "+2 Survival"],
    special: []
  },
  "Rodian": {
    skillBonuses: ["+2 Perception", "+2 Survival"],
    special: []
  },
  "Sullustan": {
    skillBonuses: ["+2 Initiative", "+2 Perception"],
    special: []
  },
  "Togruta": {
    skillBonuses: ["+2 Perception", "+2 Stealth"],
    special: []
  },
  "Toguta": { // Variant spelling
    skillBonuses: ["+2 Perception", "+2 Stealth"],
    special: []
  },
  "Trandoshan": {
    skillBonuses: ["+2 Perception", "+2 Survival"],
    special: []
  },
  "Twi'lek": {
    skillBonuses: ["+2 Persuasion", "+2 Deception"],
    special: []
  },
  "Wookiee": {
    skillBonuses: ["+2 Climb", "+2 Survival"],
    special: []
  },
  "Zabrak": {
    skillBonuses: ["+2 Initiative"],
    special: ["Bonus Feat: Zabraks gain one bonus feat at 1st level"]
  },

  // Knights of the Old Republic Campaign Guide
  "Cathar": {
    skillBonuses: ["+2 Perception", "+2 Stealth"],
    special: ["Low-Light Vision"]
  },
  "Chiss": {
    skillBonuses: ["+2 Initiative"],
    special: []
  },
  "Devaronian": {
    skillBonuses: ["+2 Perception", "+2 Persuasion"],
    special: []
  },
  "Devaronian (Female)": {
    skillBonuses: ["+2 Perception", "+2 Persuasion"],
    special: []
  },
  "Gen'Dai": {
    skillBonuses: ["+2 Endurance", "+2 Survival"],
    special: []
  },
  "Miraluka": {
    skillBonuses: ["+2 Use the Force"],
    special: ["Force Sight: Miraluka use Use the Force in place of Perception for all vision-based tasks"]
  },
  "Mirialan": {
    skillBonuses: ["+2 Initiative", "+2 Perception"],
    special: []
  },
  "Nautolan": {
    skillBonuses: ["+2 Endurance", "+2 Swim"],
    special: []
  },
  "Nautolan (Variant)": {
    skillBonuses: ["+2 Endurance", "+2 Swim"],
    special: []
  },
  "Rattataki": {
    skillBonuses: ["+2 Initiative", "+2 Stealth"],
    special: []
  },

  // The Force Unleashed Campaign Guide
  "Anzat": {
    skillBonuses: ["+2 Deception", "+2 Perception"],
    special: []
  },
  "Felucian": {
    skillBonuses: ["+2 Survival", "+2 Initiative"],
    special: []
  },

  // Rebellion Era Campaign Guide
  "Aqualish": {
    skillBonuses: ["+2 Climb"],
    special: []
  },
  "Gran": {
    skillBonuses: ["+2 Endurance", "+2 Perception"],
    special: []
  },
  "Noghri": {
    skillBonuses: ["+2 Stealth", "+2 Survival"],
    special: []
  },

  // Clone Wars Campaign Guide
  "Kaleesh": {
    skillBonuses: ["+2 Initiative", "+2 Stealth"],
    special: []
  },

  // Legacy Era Campaign Guide
  "Falleen": {
    skillBonuses: ["+2 Persuasion", "+2 Stealth"],
    special: []
  },
  "Kiffar": {
    skillBonuses: ["+2 Perception", "+2 Pilot"],
    special: []
  },
  "Massassi": {
    skillBonuses: ["+2 Endurance", "+2 Persuasion"],
    special: []
  },
  "Sith (Pureblood)": {
    skillBonuses: ["+2 Endurance", "+2 Persuasion"],
    special: []
  },
  "Nagai": {
    skillBonuses: ["+2 Deception", "+2 Stealth"],
    special: []
  },
  "Umbaran": {
    skillBonuses: ["+2 Deception", "+2 Perception"],
    special: []
  },

  // Galaxy at War
  "Arkanian": {
    skillBonuses: ["+2 Use Computer", "+2 Mechanics"],
    special: []
  },
  "Gungan": {
    skillBonuses: ["+2 Acrobatics", "+2 Swim"],
    special: []
  },
  "Mandalorian (Human Variant)": {
    skillBonuses: ["+2 Perception"],
    special: ["Bonus Trained Skill: Choose one additional trained skill at 1st level"]
  },

  // Unknown Regions
  "Barabel": {
    skillBonuses: ["+2 Initiative", "+2 Stealth"],
    special: []
  },
  "Chevin": {
    skillBonuses: ["+2 Endurance", "+2 Persuasion"],
    special: []
  },
  "Sluissi": {
    skillBonuses: ["+2 Mechanics", "+2 Use Computer"],
    special: []
  },
  "Ssi-ruu": {
    skillBonuses: ["+2 Perception", "+2 Stealth"],
    special: []
  },

  // Additional species from other sources
  "Quarren": {
    skillBonuses: ["+2 Swim"],
    special: []
  },
  "Jawa": {
    skillBonuses: ["+2 Perception", "+2 Mechanics"],
    special: []
  },
  "Gand (Force-Sensitive)": {
    skillBonuses: ["+2 Perception"],
    special: []
  },
  "Gand (Non-Force-Sensitive)": {
    skillBonuses: ["+2 Perception"],
    special: []
  },
  "Weequay": {
    skillBonuses: ["+2 Endurance"],
    special: []
  },
  "Togorian": {
    skillBonuses: ["+2 Survival"],
    special: []
  }
};

// Read and update species database
const dbPath = path.join(process.cwd(), 'packs', 'species.db');

try {
  const content = fs.readFileSync(dbPath, 'utf-8');
  const lines = content.trim().split('\n');
  const updated = [];

  let updatedCount = 0;
  const notFound = [];

  for (const line of lines) {
    const species = JSON.parse(line);
    const speciesName = species.name;

    if (speciesData[speciesName]) {
      // Update with correct bonuses
      species.system.skillBonuses = speciesData[speciesName].skillBonuses;
      species.system.special = speciesData[speciesName].special;
      updatedCount++;
      swseLogger.log(`✓ Updated: ${speciesName}`);
    } else {
      notFound.push(speciesName);
    }

    updated.push(JSON.stringify(species));
  }

  // Write back to file
  fs.writeFileSync(dbPath, updated.join('\n') + '\n', 'utf-8');
  swseLogger.log(`\n✓ Successfully updated ${updatedCount} species!`);

  if (notFound.length > 0) {
    swseLogger.log(`\n⚠ Species without updated data (${notFound.length}):`);
    notFound.forEach(name => swseLogger.log(`  - ${name}`));
  }

} catch (err) {
  swseLogger.error('Error updating species database:', err);
  process.exit(1);
}

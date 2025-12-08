/**
 * Comprehensive Species Trait Update
 * Adds all trait categories: vision, natural weapons, size modifiers, combat traits, etc.
 */

import fs from 'fs';
import path from 'path';

// Comprehensive species trait database
const comprehensiveTraits = {
  // ===== CORE RULEBOOK =====
  "Bothan": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Cerean": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Duros": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Ewok": {
    size: "Small",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: ["Primitive: –5 penalty on Use Computer, Mechanics, and attack rolls with modern weapons"],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Human": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 1,
    bonusTrainedSkills: 1
  },

  "Ithorian": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: ["Bellow: Once per encounter, sonic attack in 6-square cone"] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Kel Dor": {
    size: "Medium",
    visionTraits: ["Low-Light Vision"],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: ["Atmospheric Dependency: Must wear breathing mask in non-native atmospheres"],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: ["Force Intuition: +2 to Use the Force for sensing and detection"],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Mon Calamari": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: ["Amphibious: Can breathe underwater and move normally in water"],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Rodian": {
    size: "Medium",
    visionTraits: ["Low-Light Vision"],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Sullustan": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Togruta": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Echolocation: +2 to Perception in enclosed spaces"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Toguta": { // Variant spelling
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Echolocation: +2 to Perception in enclosed spaces"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Trandoshan": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [
      { name: "Claws", damage: "1d4", type: "slashing" }
    ],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: {
      naturalArmor: 1,
      weaponProficiencies: [],
      otherTraits: ["Regeneration: Heal additional HP when resting"]
    },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Twi'lek": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Lekku Sensory: +2 to Perception for nearby movement detection"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Wookiee": {
    size: "Large",
    visionTraits: [],
    naturalWeapons: [
      { name: "Claws", damage: "1d6", type: "slashing" }
    ],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: {
      naturalArmor: 0,
      weaponProficiencies: ["Bowcaster"],
      otherTraits: ["Rage: Swift action, +2 Str, +2 Con, –2 Defenses, then fatigued"]
    },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Zabrak": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 1,
    bonusTrainedSkills: 0
  },

  // ===== KOTOR CAMPAIGN GUIDE =====
  "Cathar": {
    size: "Medium",
    visionTraits: ["Low-Light Vision"],
    naturalWeapons: [
      { name: "Claws", damage: "1d4", type: "slashing" }
    ],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Scent: Can detect adjacent hidden creatures"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Chiss": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: ["Cold Resistance: +5 to Endurance vs cold"],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Devaronian": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: ["Heat Resistance: +5 to Endurance vs heat"],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Devaronian (Female)": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: ["Heat Resistance: +5 to Endurance vs heat"],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Gen'Dai": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: {
      naturalArmor: 0,
      weaponProficiencies: [],
      otherTraits: ["Extreme Regeneration: Auto-heal HP each round, regrow limbs"]
    },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Miraluka": {
    size: "Medium",
    visionTraits: ["Force Sight: Use Use the Force for all vision-based Perception checks"],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: ["Force Sight: Can see through the Force, detects living beings"],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Mirialan": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Disciplined: +2 to resist mind-affecting effects"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Nautolan": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: ["Aquatic: Can breathe underwater, move normally underwater"],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Nautolan (Variant)": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: ["Aquatic: Can breathe underwater, move normally underwater"],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Rattataki": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Light Sensitivity: –1 to attacks in bright light"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  // Additional species with basic trait structure
  "Anzat": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Felucian": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Bioluminescence: Emit light as free action"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Aqualish": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Gran": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Three-Eyed Vision: +2 to Perception for sight-based checks"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Noghri": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [
      { name: "Claws", damage: "1d4", type: "slashing" }
    ],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Scent: Can track by smell, detect adjacent hidden creatures", "Toxic Resistance: +5 to Fortitude vs poisons"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Kaleesh": {
    size: "Medium",
    visionTraits: ["Low-Light Vision"],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: {
      naturalArmor: 0,
      weaponProficiencies: ["Kaleesh War Weapons"],
      otherTraits: []
    },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Falleen": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Pheromones: +5 to Persuasion checks once per encounter"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Kiffar": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Psychometric Insight: Touch object to gain vision of its past (once per day)"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Massassi": {
    size: "Medium",
    visionTraits: ["Darkvision"],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Sith (Pureblood)": {
    size: "Medium",
    visionTraits: ["Darkvision"],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Nagai": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: ["Cold Resistance: +5 to Endurance vs cold"],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Umbaran": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: ["Light Sensitivity: –1 to attacks in bright light"],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Arkanian": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Gungan": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: ["Amphibious: Can breathe underwater and move normally in water"],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Mandalorian (Human Variant)": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 1
  },

  "Barabel": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [
      { name: "Claws", damage: "1d4", type: "slashing" },
      { name: "Bite", damage: "1d6", type: "piercing" }
    ],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 1, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Chevin": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: ["Heavy Build: Count as Large for carrying capacity only"] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Sluissi": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: ["Coil Movement: Cannot run, always have free hand for manipulation"],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Ssi-ruu": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [
      { name: "Tail", damage: "1d6", type: "bludgeoning" }
    ],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Quarren": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: ["Amphibious: Can breathe underwater and move normally in water"],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Jawa": {
    size: "Small",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: ["Tech Specialist: +2 to Mechanics when working with salvaged tech"],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Gand (Force-Sensitive)": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: ["Atmospheric Dependency: Require ammonia atmosphere or breathing apparatus"],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Gand (Non-Force-Sensitive)": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: ["Atmospheric Dependency: Require ammonia atmosphere or breathing apparatus"],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Weequay": {
    size: "Medium",
    visionTraits: [],
    naturalWeapons: [],
    movementTraits: [],
    environmentalTraits: ["Desert Adaptation: +2 to Endurance vs desert heat"],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  },

  "Togorian": {
    size: "Medium",
    visionTraits: ["Low-Light Vision"],
    naturalWeapons: [
      { name: "Claws", damage: "1d4", type: "slashing" }
    ],
    movementTraits: [],
    environmentalTraits: [],
    combatTraits: { naturalArmor: 0, weaponProficiencies: [], otherTraits: [] },
    techTraits: [],
    forceTraits: [],
    socialTraits: [],
    bonusFeats: 0,
    bonusTrainedSkills: 0
  }
};

// Read and update species database
const dbPath = path.join(process.cwd(), 'packs', 'species.db');

try {
  const content = fs.readFileSync(dbPath, 'utf-8');
  const lines = content.trim().split('\n');
  const updated = [];

  let updatedCount = 0;

  for (const line of lines) {
    const species = JSON.parse(line);
    const speciesName = species.name;

    if (comprehensiveTraits[speciesName]) {
      const traits = comprehensiveTraits[speciesName];

      // Update comprehensive trait fields
      species.system.size = traits.size;
      species.system.visionTraits = traits.visionTraits;
      species.system.naturalWeapons = traits.naturalWeapons;
      species.system.movementTraits = traits.movementTraits;
      species.system.environmentalTraits = traits.environmentalTraits;
      species.system.combatTraits = traits.combatTraits;
      species.system.techTraits = traits.techTraits;
      species.system.forceTraits = traits.forceTraits;
      species.system.socialTraits = traits.socialTraits;
      species.system.bonusFeats = traits.bonusFeats;
      species.system.bonusTrainedSkills = traits.bonusTrainedSkills;

      updatedCount++;
      swseLogger.log(`✓ Updated comprehensive traits: ${speciesName}`);
    }

    updated.push(JSON.stringify(species));
  }

  // Write back to file
  fs.writeFileSync(dbPath, updated.join('\n') + '\n', 'utf-8');
  swseLogger.log(`\n✓ Successfully updated comprehensive traits for ${updatedCount} species!`);

} catch (err) {
  swseLogger.error('Error updating species database:', err);
  process.exit(1);
}

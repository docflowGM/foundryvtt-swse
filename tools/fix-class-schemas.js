// ============================================
// Fix Classes Database Schema
// Migrates classes.db to use proper class schema
// ============================================

const fs = require('fs');
const path = require('path');

// Read classes reference data
const classesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/classes.json'), 'utf-8'));

// Read classes.db
const classesDbPath = path.join(__dirname, '../packs/classes.db');
const dbLines = fs.readFileSync(classesDbPath, 'utf-8').split('\n').filter(line => line.trim());

console.log(`Found ${dbLines.length} class entries in classes.db`);
console.log(`Found ${classesData.length} classes in reference data`);

// Create a lookup map from classes.json
const classesMap = {};
classesData.forEach(cls => {
  classesMap[cls.class_name] = cls;
});

// Helper function to extract hit die number
function getHitDie(hitDieStr) {
  const match = hitDieStr.match(/1d(\d+)/);
  return match ? parseInt(match[1]) : 6;
}

// Helper function to get defense bonuses by level
function getDefenseBonus(classData, level) {
  // In SWSE, defense bonuses depend on class type
  // Jedi, Soldier, Scout = Good Fortitude and Reflex
  // Noble, Scoundrel = Good Reflex and Will
  // For level 1, good = +2, poor = +0
  const goodDefClasses = ['Jedi', 'Soldier', 'Force Adept', 'Jedi Knight', 'Jedi Master', 'Sith Apprentice', 'Sith Lord'];
  const isGoodDef = goodDefClasses.includes(classData.class_name);

  return {
    fortitude: isGoodDef ? 2 : 0,
    reflex: 2, // Most classes get good reflex
    will: classData.class_name.includes('Jedi') || classData.class_name.includes('Force') ? 2 : 0
  };
}

// Process each class entry
let updated = 0;
const updatedLines = dbLines.map(line => {
  try {
    const entry = JSON.parse(line);

    // Find matching class data
    const classData = classesMap[entry.name];

    if (!classData) {
      console.warn(`No reference data found for class: ${entry.name}`);
      return line;
    }

    // Extract level 1 data
    const level1 = classData.level_progression.find(lvl => lvl.level === 1);

    // Build proper class system data
    entry.system = {
      description: `The ${entry.name} class from Star Wars Saga Edition`,
      hitDie: getHitDie(classData.hit_die),
      baseHp: classData.base_hp || 30,
      babProgression: level1 ? level1.bab : 0,
      trainedSkills: classData.trained_skills || 2,
      classSkills: classData.class_skills || [],
      talentTrees: classData.talent_trees || [],
      forceSensitive: !!level1?.force_points,
      forcePointProgression: level1?.force_points || 0,
      startingCredits: classData.starting_credits || "1d4 x 100",
      defenseProgression: getDefenseBonus(classData, 1),
      startingFeatures: classData.starting_features || [],
      levelProgression: classData.level_progression || []
    };

    updated++;
    console.log(`✓ Updated ${entry.name}: HD=${entry.system.hitDie}, BAB=${entry.system.babProgression}, Skills=${entry.system.trainedSkills}, Force=${entry.system.forceSensitive}`);

    return JSON.stringify(entry);
  } catch (err) {
    console.error(`Error processing line: ${err.message}`);
    return line;
  }
});

// Write updated data
fs.writeFileSync(classesDbPath, updatedLines.join('\n') + '\n', 'utf-8');

console.log(`\n✅ Updated ${updated} class entries`);
console.log(`📝 Classes database has been fixed with proper schema`);

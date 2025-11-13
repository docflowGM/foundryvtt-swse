#!/usr/bin/env node

/**
 * Migration script to fix .db file schemas
 * - Fix droids.db: change from equipment to droid Actor type with proper schema
 * - Fix equipment.db: correct item types
 * - Verify vehicles.db structure
 */

const fs = require('fs');
const path = require('path');

// Base actor template for droids
const getBaseDroidActor = () => ({
  abilities: {
    str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
    dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
    con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
    int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
    wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
    cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
  },
  defenses: {
    fortitude: { base: 10, misc: 0, total: 10, ability: "con", class: 0, armorMastery: 0, modifier: 0 },
    reflex: { base: 10, misc: 0, total: 10, ability: "dex", class: 0, armor: 0, armorMastery: 0, modifier: 0 },
    will: { base: 10, misc: 0, total: 10, ability: "wis", class: 0, armorMastery: 0, modifier: 0 }
  },
  hp: { value: 10, max: 10, temp: 0 },
  bab: 0,
  level: 1,
  race: "custom",
  size: "medium",
  conditionTrack: "normal",
  speed: { base: 6, total: 6 },
  forcePoints: { value: 5, max: 5, die: "1d6" },
  destinyPoints: { value: 1, max: 1 },
  freeForcePowers: { current: 0, max: 0 },
  secondWind: { uses: 1, max: 1, misc: 0, healing: 0 },
  initiative: { misc: 0, total: 0 },
  damageThreshold: 10,
  damageThresholdMisc: 0,
  skills: {},
  weapons: [],
  feats: [],
  talents: [],
  customSkills: [],
  classes: [],
  credits: 0,
  experience: 0,
  class: "",
  xp: { value: 0, required: 1000 },
  bio: "",
  notes: ""
});

function fixDroidsDB() {
  console.log('Fixing droids.db...');
  const filePath = path.join(__dirname, '..', 'packs', 'droids.db');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  const fixedLines = lines.map(line => {
    const entry = JSON.parse(line);

    if (entry.type === 'equipment') {
      // Convert to proper droid Actor
      const baseSystem = getBaseDroidActor();

      // Preserve name and any useful data
      const preservedName = entry.name || entry.system?.name || 'Unknown Droid';
      const preservedSpeed = entry.system?.speed || '6 Squares (Walking)';

      // Create new proper actor entry
      const newEntry = {
        _id: entry._id,
        name: preservedName,
        type: 'droid',
        img: entry.img || 'icons/svg/mystery-man.svg',
        system: {
          ...baseSystem,
          speed: preservedSpeed
        },
        effects: entry.effects || [],
        folder: entry.folder || null,
        sort: entry.sort || 0,
        ownership: entry.ownership || { default: 0 },
        flags: entry.flags || {}
      };

      return JSON.stringify(newEntry);
    }

    return line;
  });

  fs.writeFileSync(filePath, fixedLines.join('\n') + '\n', 'utf-8');
  console.log(`Fixed ${fixedLines.length} droid entries`);
}

function fixEquipmentDB() {
  console.log('Fixing equipment.db...');
  const filePath = path.join(__dirname, '..', 'packs', 'equipment.db');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  const fixedLines = lines.map(line => {
    const entry = JSON.parse(line);

    // If it's marked as vehicle or weapon but has grenade/mine/explosive tags, fix it
    if (entry.type === 'vehicle' || entry.type === 'weapon') {
      const tags = entry.system?.tags || [];
      const hasEquipmentTags = tags.some(tag =>
        ['grenade', 'mine', 'explosive', 'general'].includes(tag)
      );

      if (hasEquipmentTags || entry.name?.includes('Grenade') ||
          entry.name?.includes('Mine') || entry.name?.includes('Timer') ||
          entry.name?.includes('Trigger')) {

        // Determine correct type
        let correctType = 'equipment';
        if (entry.name?.includes('Grenade')) correctType = 'equipment';
        else if (entry.name?.includes('Mine')) correctType = 'equipment';
        else if (tags.includes('grenade') || tags.includes('mine') || tags.includes('explosive')) {
          correctType = 'equipment';
        }

        // Fix the type and clean up system data
        entry.type = correctType;

        // Remove vehicle-specific fields
        if (entry.system) {
          delete entry.system.crewPositions;
          delete entry.system.hull;
          delete entry.system.shields;
          delete entry.system.reflexDefense;
          delete entry.system.flatFooted;
          delete entry.system.fortitudeDefense;
          delete entry.system.damageThreshold;
          delete entry.system.damageReduction;
          delete entry.system.initiative;
          delete entry.system.maneuver;
          delete entry.system.baseAttackBonus;
          delete entry.system.crew;
          delete entry.system.senses;
          delete entry.system.size;
          delete entry.system.type;
          delete entry.system.weapons;

          // Ensure equipment fields exist
          if (!entry.system.weight) entry.system.weight = 0;
          if (!entry.system.cost) entry.system.cost = entry.system.cost || { new: 0, used: 0 };
          if (typeof entry.system.cost === 'object') {
            entry.system.cost = entry.system.cost.new || 0;
          }
          if (!entry.system.description) entry.system.description = "";
          if (!entry.system.source) entry.system.source = "";
        }
      }
    }

    return JSON.stringify(entry);
  });

  fs.writeFileSync(filePath, fixedLines.join('\n') + '\n', 'utf-8');
  console.log(`Fixed ${fixedLines.length} equipment entries`);
}

function verifyVehiclesDB() {
  console.log('Verifying vehicles.db...');
  const filePath = path.join(__dirname, '..', 'packs', 'vehicles.db');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  let needsFix = false;
  const fixedLines = lines.map(line => {
    const entry = JSON.parse(line);

    // Ensure vehicles have hp structure
    if (entry.type === 'vehicle') {
      if (!entry.system.hp || typeof entry.system.hp.value === 'undefined') {
        needsFix = true;
        if (!entry.system.hp) {
          entry.system.hp = { value: 100, max: 100 };
        }
      }
      // Ensure basic vehicle fields
      if (typeof entry.system.speed === 'undefined') {
        needsFix = true;
        entry.system.speed = 0;
      }
    }

    return JSON.stringify(entry);
  });

  if (needsFix) {
    fs.writeFileSync(filePath, fixedLines.join('\n') + '\n', 'utf-8');
    console.log(`Fixed ${lines.length} vehicle entries`);
  } else {
    console.log(`Vehicles DB is already correct (${lines.length} entries)`);
  }
}

// Run all fixes
try {
  fixDroidsDB();
  fixEquipmentDB();
  verifyVehiclesDB();
  console.log('\n✅ All .db files have been fixed!');
} catch (error) {
  console.error('❌ Error during migration:', error);
  process.exit(1);
}

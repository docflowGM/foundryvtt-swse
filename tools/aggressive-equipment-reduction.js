/**
 * Aggressively reduce equipment to fit strict budgets
 */

const fs = require('fs');
const path = require('path');

// Load templates
const templatesPath = path.join(__dirname, '..', 'data', 'character-templates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

console.log('='.repeat(80));
console.log('AGGRESSIVE EQUIPMENT REDUCTION');
console.log('='.repeat(80));
console.log('');

const changes = [];

templates.templates.forEach(template => {
  let modified = false;
  const originalCount = template.startingEquipment.length;

  // NONHEROIC: Strip down to absolute essentials
  if (template.class === 'Nonheroic') {
    const newEquipment = [];

    switch (template.name) {
      case 'Worker':
        // Keep: Tool Kit, Comlink, Datapad, Medpac
        newEquipment.push('Tool Kit', 'Flight Suit', 'Comlink, Short-Range', 'Datapad, Standard', 'Medpac');
        break;
      case 'Trooper':
        // Keep: Rifle, Pistol, Armor, Comlink, Power Pack, Medpac
        newEquipment.push('Blaster Rifle', 'Blaster Pistol', 'Blast Helmet and Vest', 'Comlink, Short-Range', 'Power Pack', 'Medpac');
        break;
      case 'Criminal':
        // Keep: Pistol, Knife, Clothes, Comlink
        newEquipment.push('Blaster Pistol', 'Vibrodagger', 'Flight Suit', 'Comlink, Short-Range');
        break;
      case 'Merchant':
        // Keep: Hold-out, Clothes, Datapad, Comlink - REMOVE Bioscanner (3,500!)
        newEquipment.push('Hold-out Blaster', 'Flight Suit', 'Datapad, Standard', 'Comlink, Short-Range');
        break;
      case 'Police Officer':
        // Keep: Baton, Pistol, Armor, Comlink, Cuffs, Medpac, ID
        newEquipment.push('Stun Baton', 'Blaster Pistol', 'Padded Flight Suit', 'Comlink, Short-Range', 'Binder Cuffs', 'Medpac', 'Code Cylinder');
        break;
    }

    template.startingEquipment = newEquipment;
    modified = true;
    changes.push({
      template: template.name,
      change: `Stripped to ${newEquipment.length} essential items (was ${originalCount})`
    });
  }

  // HEROIC: Remove Electrobinoculars (1,000cr) from templates that don't critically need it
  const nonEssentialScopes = ['Diplomat', 'Leader', 'Duelist', 'Outlaw', 'Gunner', 'Rifleman'];
  if (nonEssentialScopes.includes(template.name)) {
    const idx = template.startingEquipment.indexOf('Electrobinoculars');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      modified = true;
      changes.push({
        template: template.name,
        change: 'Removed Electrobinoculars (saves 1,000)'
      });
    }
  }

  // Remove Utility Belt (500cr) from some templates
  const removeBelt = ['Defender', 'Skirmisher', 'Survivalist'];
  if (removeBelt.includes(template.name)) {
    const idx = template.startingEquipment.indexOf('Utility Belt (Standard)');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      modified = true;
      changes.push({
        template: template.name,
        change: 'Removed Utility Belt (Standard) (saves 500)'
      });
    }
  }

  // Remove secondary weapons from some templates
  const removeBackupWeapon = ['Pistoleer', 'Skirmisher', 'Infiltrator'];
  removeBackupWeapon.forEach(name => {
    if (template.name === name) {
      // Remove second blaster
      const weapons = ['Blaster Pistol', 'Heavy Blaster Pistol', 'Hold-out Blaster'];
      let removed = false;
      weapons.forEach(weapon => {
        if (!removed) {
          const idx = template.startingEquipment.lastIndexOf(weapon);
          if (idx !== -1 && template.startingEquipment.indexOf(weapon) !== idx) {
            template.startingEquipment.splice(idx, 1);
            modified = true;
            removed = true;
            changes.push({
              template: template.name,
              change: `Removed backup ${weapon} (saves 250-750)`
            });
          }
        }
      });
    }
  });

  // Remove expensive items from specific templates
  if (template.name === 'Skill Monkey') {
    // Remove duplicate Security Kit
    const indices = [];
    template.startingEquipment.forEach((item, idx) => {
      if (item === 'Security Kit') indices.push(idx);
    });
    if (indices.length > 1) {
      template.startingEquipment.splice(indices[1], 1);
      modified = true;
      changes.push({
        template: template.name,
        change: 'Removed duplicate Security Kit (saves 750)'
      });
    }
  }

  if (template.name === 'Aristocrat') {
    // Remove Surveillance Tagger (450cr) and one Blank Datacards
    let idx = template.startingEquipment.indexOf('Surveillance Tagger');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      modified = true;
      changes.push({
        template: template.name,
        change: 'Removed Surveillance Tagger (saves 450)'
      });
    }
    // Remove one Blank Datacards
    idx = template.startingEquipment.lastIndexOf('Blank Datacards (10)');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      modified = true;
      changes.push({
        template: template.name,
        change: 'Removed one Blank Datacards (10) (saves 10)'
      });
    }
  }

  // Remove duplicate Field Kits from Survivalist
  if (template.name === 'Survivalist') {
    const indices = [];
    template.startingEquipment.forEach((item, idx) => {
      if (item === 'Field Kit') indices.push(idx);
    });
    if (indices.length > 1) {
      template.startingEquipment.splice(indices[1], 1);
      modified = true;
      changes.push({
        template: template.name,
        change: 'Removed duplicate Field Kit (saves 1,000)'
      });
    }
  }
});

// Save updated templates
fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), 'utf8');

console.log('Aggressive changes made:');
changes.forEach(change => {
  console.log(`${change.template}: ${change.change}`);
});

console.log('');
console.log('='.repeat(80));
console.log(`Modified ${changes.length} items across templates`);
console.log(`File saved: ${templatesPath}`);
console.log('');
console.log('Run calculate-template-credits.js to see new budget status');

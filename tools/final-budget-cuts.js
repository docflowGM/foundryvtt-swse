/**
 * Final budget cuts to get all templates as close to budget as possible
 */

const fs = require('fs');
const path = require('path');

// Load templates
const templatesPath = path.join(__dirname, '..', 'data', 'character-templates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

swseLogger.log('='.repeat(80));
swseLogger.log('FINAL BUDGET CUTS');
swseLogger.log('='.repeat(80));
swseLogger.log('');

const changes = [];

templates.templates.forEach(template => {
  // JEDI: Remove Electrobinoculars (1,000cr) or Datapad (1,000cr)
  if (template.class === 'Jedi') {
    let idx = template.startingEquipment.indexOf('Electrobinoculars');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      changes.push({ template: template.name, change: 'Removed Electrobinoculars (saves 1,000)' });
    } else {
      idx = template.startingEquipment.indexOf('Datapad, Standard');
      if (idx !== -1) {
        template.startingEquipment.splice(idx, 1);
        changes.push({ template: template.name, change: 'Removed Datapad (saves 1,000)' });
      }
    }
  }

  // POLICE: Replace Padded Flight Suit (2,000) with Flight Suit (1,000)
  if (template.name === 'Police Officer') {
    const idx = template.startingEquipment.indexOf('Padded Flight Suit');
    if (idx !== -1) {
      template.startingEquipment[idx] = 'Flight Suit';
      changes.push({ template: template.name, change: 'Padded Flight Suit → Flight Suit (saves 1,000)' });
    }
  }

  // WORKER/TROOPER: Remove Datapad (1,000cr)
  if (['Worker', 'Trooper'].includes(template.name)) {
    const idx = template.startingEquipment.indexOf('Datapad, Standard');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      changes.push({ template: template.name, change: 'Removed Datapad (saves 1,000)' });
    }
  }

  // CRIMINAL: Nothing more to remove without breaking the concept

  // MERCHANT: Nothing more to remove

  // SCOUNDRELS: Remove Electrobinoculars from those who have it
  if (template.class === 'Scoundrel') {
    const idx = template.startingEquipment.indexOf('Electrobinoculars');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      changes.push({ template: template.name, change: 'Removed Electrobinoculars (saves 1,000)' });
    }
  }

  // SCOUTS: Remove Electrobinoculars except for Sniper (who needs it)
  if (template.class === 'Scout' && template.name !== 'Sniper') {
    const idx = template.startingEquipment.indexOf('Electrobinoculars');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      changes.push({ template: template.name, change: 'Removed Electrobinoculars (saves 1,000)' });
    }
  }

  // SNIPER: Remove Targeting Scope (100cr) as compromise
  if (template.name === 'Sniper') {
    const idx = template.startingEquipment.indexOf('Targeting Scope, Standard');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      changes.push({ template: template.name, change: 'Removed Targeting Scope (saves 100)' });
    }
  }

  // SOLDIERS: Remove expensive items
  if (template.name === 'Brawler') {
    // Remove Blaster Pistol (500cr)
    const idx = template.startingEquipment.indexOf('Blaster Pistol');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      changes.push({ template: template.name, change: 'Removed Blaster Pistol (saves 500)' });
    }
  }

  if (template.name === 'Tank') {
    // Remove Vibroblade (500cr)
    const idx = template.startingEquipment.indexOf('Vibroblade');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      changes.push({ template: template.name, change: 'Removed Vibroblade (saves 500)' });
    }
  }

  if (template.name === 'Gunner') {
    // Remove Frag Grenade (200cr)
    const idx = template.startingEquipment.indexOf('Frag Grenade');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      changes.push({ template: template.name, change: 'Removed Frag Grenade (saves 200)' });
    }
  }

  // NOBLES: Remove expensive items
  if (template.name === 'Diplomat') {
    // Remove Datapad (1,000cr) - keep basic gear
    const idx = template.startingEquipment.indexOf('Datapad, Standard');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      changes.push({ template: template.name, change: 'Removed Datapad (saves 1,000)' });
    }
  }

  if (template.name === 'Duelist') {
    // Remove Datapad (1,000cr)
    let idx = template.startingEquipment.indexOf('Datapad, Standard');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      changes.push({ template: template.name, change: 'Removed Datapad (saves 1,000)' });
    }
    // Remove Medpac (100cr)
    idx = template.startingEquipment.indexOf('Medpac');
    if (idx !== -1) {
      template.startingEquipment.splice(idx, 1);
      changes.push({ template: template.name, change: 'Removed Medpac (saves 100)' });
    }
  }
});

// Save updated templates
fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), 'utf8');

swseLogger.log('Final changes made:');
changes.forEach(change => {
  swseLogger.log(`${change.template}: ${change.change}`);
});

swseLogger.log('');
swseLogger.log('='.repeat(80));
swseLogger.log(`Modified ${changes.length} items`);
swseLogger.log(`File saved: ${templatesPath}`);
swseLogger.log('');
swseLogger.log('Run calculate-template-credits.js to see final budget status');

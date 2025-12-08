/**
 * Reduce template equipment to fit within starting credit budgets
 */

const fs = require('fs');
const path = require('path');

// Item costs
const itemCosts = {
  'Armored Flight Suit': 4000,
  'Flight Suit': 1000,
  'Battle Armor': 7000,
  'Combat Jumpsuit': 1500,
  'Padded Flight Suit': 2000,
  'Shadowsuit': 600,
  'Thinsuit': 900,
  'Lightsaber': 12000,
  // ... all other items
};

// Load templates
const templatesPath = path.join(__dirname, '..', 'data', 'character-templates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

swseLogger.log('='.repeat(80));
swseLogger.log('REDUCING TEMPLATE EQUIPMENT TO FIT BUDGETS');
swseLogger.log('='.repeat(80));
swseLogger.log('');

const changes = [];

templates.templates.forEach(template => {
  const originalEquipment = [...template.startingEquipment];
  let modified = false;

  // JEDI: Replace Armored Flight Suit with Flight Suit (saves 3,000)
  if (template.class === 'Jedi') {
    const idx = template.startingEquipment.indexOf('Armored Flight Suit');
    if (idx !== -1) {
      template.startingEquipment[idx] = 'Flight Suit';
      modified = true;
      changes.push({
        template: template.name,
        change: 'Armored Flight Suit → Flight Suit (saves 3,000)'
      });
    }
  }

  // SOLDIERS: Replace Battle Armor with Combat Jumpsuit (saves 5,500)
  if (template.class === 'Soldier' && (template.name === 'Brawler' || template.name === 'Tank')) {
    const idx = template.startingEquipment.indexOf('Battle Armor');
    if (idx !== -1) {
      template.startingEquipment[idx] = 'Combat Jumpsuit';
      modified = true;
      changes.push({
        template: template.name,
        change: 'Battle Armor → Combat Jumpsuit (saves 5,500)'
      });
    }
  }

  // SCOUTS: Replace Padded Flight Suit with Flight Suit (saves 1,000)
  if (template.class === 'Scout' && template.name === 'Sniper') {
    const idx = template.startingEquipment.indexOf('Padded Flight Suit');
    if (idx !== -1) {
      template.startingEquipment[idx] = 'Flight Suit';
      modified = true;
      changes.push({
        template: template.name,
        change: 'Padded Flight Suit → Flight Suit (saves 1,000)'
      });
    }
  }

  // NONHEROIC: Remove most of the extra equipment I added (keep bare minimum)
  if (template.class === 'Nonheroic') {
    const essentialItems = [
      // Worker
      'Tool Kit', 'Utility Belt (Standard)', 'Flight Suit', 'Comlink, Short-Range',
      'Datapad, Standard', 'Fusion Lantern', 'Medpac',
      // Trooper
      'Blaster Rifle', 'Blaster Pistol', 'Blast Helmet and Vest', 'Power Pack',
      // Criminal
      'Vibrodagger', 'Binder Cuffs',
      // Merchant
      'Hold-out Blaster', 'Credit Chip', 'Bioscanner',
      // Police
      'Stun Baton', 'Code Cylinder', 'Padded Flight Suit'
    ];

    // Keep only essential items (first occurrence of each type)
    const newEquipment = [];
    const seen = new Set();

    template.startingEquipment.forEach(item => {
      // Always keep unique essential items
      if (essentialItems.includes(item)) {
        if (!seen.has(item) || ['Medpac', 'Power Pack'].includes(item)) {
          newEquipment.push(item);
          seen.add(item);
        }
      }
    });

    if (newEquipment.length < template.startingEquipment.length) {
      template.startingEquipment = newEquipment;
      modified = true;
      changes.push({
        template: template.name,
        change: `Removed ${originalEquipment.length - newEquipment.length} extra items`
      });
    }
  }

  // NOBLES: Replace expensive armor/equipment
  if (template.class === 'Noble') {
    // Leader: Replace Combat Jumpsuit with Flight Suit (saves 500)
    if (template.name === 'Leader') {
      const idx = template.startingEquipment.indexOf('Combat Jumpsuit');
      if (idx !== -1) {
        template.startingEquipment[idx] = 'Flight Suit';
        modified = true;
        changes.push({
          template: template.name,
          change: 'Combat Jumpsuit → Flight Suit (saves 500)'
        });
      }
    }
  }

  // SCOUNDRELS: Replace Combat Jumpsuit with Flight Suit where needed (saves 500)
  if (template.class === 'Scoundrel') {
    if (['Pistoleer', 'Knuckledragger'].includes(template.name)) {
      const idx = template.startingEquipment.indexOf('Combat Jumpsuit');
      if (idx !== -1) {
        template.startingEquipment[idx] = 'Flight Suit';
        modified = true;
        changes.push({
          template: template.name,
          change: 'Combat Jumpsuit → Flight Suit (saves 500)'
        });
      }
    }
  }

  // SCOUTS: Replace Combat Jumpsuit with Flight Suit (saves 500)
  if (template.class === 'Scout' && template.name === 'Skirmisher') {
    const idx = template.startingEquipment.indexOf('Combat Jumpsuit');
    if (idx !== -1) {
      template.startingEquipment[idx] = 'Flight Suit';
      modified = true;
      changes.push({
        template: template.name,
        change: 'Combat Jumpsuit → Flight Suit (saves 500)'
      });
    }
  }

  // SOLDIERS: Replace Combat Jumpsuit with Flight Suit for Gunner (saves 500)
  if (template.class === 'Soldier' && template.name === 'Gunner') {
    const idx = template.startingEquipment.indexOf('Combat Jumpsuit');
    if (idx !== -1) {
      template.startingEquipment[idx] = 'Flight Suit';
      modified = true;
      changes.push({
        template: template.name,
        change: 'Combat Jumpsuit → Flight Suit (saves 500)'
      });
    }
  }

  // Remove duplicate items to save credits
  const itemCounts = {};
  template.startingEquipment.forEach(item => {
    itemCounts[item] = (itemCounts[item] || 0) + 1;
  });

  // Limit certain items to max 2
  const limitedItems = ['Medpac', 'Power Pack', 'Glow Rod', 'Ration Pack'];
  limitedItems.forEach(itemName => {
    if (itemCounts[itemName] > 2) {
      const removeCount = itemCounts[itemName] - 2;
      let removed = 0;
      template.startingEquipment = template.startingEquipment.filter(item => {
        if (item === itemName && removed < removeCount) {
          removed++;
          return false;
        }
        return true;
      });
      modified = true;
      changes.push({
        template: template.name,
        change: `Reduced ${itemName} from ${itemCounts[itemName]} to 2`
      });
    }
  });
});

// Save updated templates
fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), 'utf8');

swseLogger.log('Changes made:');
changes.forEach(change => {
  swseLogger.log(`${change.template}: ${change.change}`);
});

swseLogger.log('');
swseLogger.log('='.repeat(80));
swseLogger.log(`Modified ${changes.length} items across templates`);
swseLogger.log(`File saved: ${templatesPath}`);
swseLogger.log('');
swseLogger.log('Run calculate-template-credits.js to see new budget status');

/**
 * Remove armor from templates to cut costs
 * Keep armor only for combat-focused classes
 */

const fs = require('fs');
const path = require('path');

// Load templates
const templatesPath = path.join(__dirname, '..', 'data', 'character-templates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

swseLogger.log('='.repeat(80));
swseLogger.log('AGGRESSIVE ARMOR REMOVAL');
swseLogger.log('='.repeat(80));
swseLogger.log('');

const armorItems = [
  'Flight Suit',
  'Combat Jumpsuit',
  'Shadowsuit',
  'Thinsuit',
  'Padded Flight Suit',
  'Blast Helmet and Vest',
  'Armored Flight Suit',
  'Battle Armor'
];

const armorCosts = {
  'Flight Suit': 1000,
  'Combat Jumpsuit': 1500,
  'Shadowsuit': 600,
  'Thinsuit': 900,
  'Padded Flight Suit': 2000,
  'Blast Helmet and Vest': 500,
  'Armored Flight Suit': 4000,
  'Battle Armor': 7000
};

const changes = [];

// Keep armor for these classes/templates (combat-focused)
const keepArmorFor = [
  'Soldier',  // All soldiers
  'Trooper',  // Military nonheroic
  'Police Officer'  // Law enforcement
];

// Keep armor for these specific scout templates
const keepArmorScouts = ['Sniper', 'Infiltrator'];

templates.templates.forEach(template => {
  // Determine if this template should keep armor
  let shouldKeepArmor = false;

  if (keepArmorFor.includes(template.class) || keepArmorFor.includes(template.name)) {
    shouldKeepArmor = true;
  } else if (template.class === 'Scout' && keepArmorScouts.includes(template.name)) {
    shouldKeepArmor = true;
  }

  if (!shouldKeepArmor) {
    // Remove ALL armor from this template
    armorItems.forEach(armorItem => {
      const idx = template.startingEquipment.indexOf(armorItem);
      if (idx !== -1) {
        const cost = armorCosts[armorItem];
        template.startingEquipment.splice(idx, 1);
        changes.push({
          template: template.name,
          change: `Removed ${armorItem} (saves ${cost})`
        });
      }
    });
  } else {
    // For classes that keep armor, replace expensive armor with cheapest option
    armorItems.forEach(armorItem => {
      const idx = template.startingEquipment.indexOf(armorItem);
      if (idx !== -1) {
        const cost = armorCosts[armorItem];

        // Replace expensive armor with Blast Helmet and Vest (500) for Soldiers/Troopers
        // This is the cheapest armor option
        if (cost > 500 && (template.class === 'Soldier' || template.name === 'Trooper')) {
          template.startingEquipment[idx] = 'Blast Helmet and Vest';
          changes.push({
            template: template.name,
            change: `${armorItem} → Blast Helmet and Vest (saves ${cost - 500})`
          });
        }
        // Police can also downgrade to Blast Helmet and Vest
        else if (cost > 500 && template.name === 'Police Officer') {
          template.startingEquipment[idx] = 'Blast Helmet and Vest';
          changes.push({
            template: template.name,
            change: `${armorItem} → Blast Helmet and Vest (saves ${cost - 500})`
          });
        }
        // Scouts keep light armor but downgrade to Thinsuit (900) if expensive
        else if (cost > 900 && template.class === 'Scout') {
          template.startingEquipment[idx] = 'Thinsuit';
          changes.push({
            template: template.name,
            change: `${armorItem} → Thinsuit (saves ${cost - 900})`
          });
        }
      }
    });
  }
});

// Save updated templates
fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), 'utf8');

swseLogger.log('Armor changes made:');
changes.forEach(change => {
  swseLogger.log(`${change.template}: ${change.change}`);
});

swseLogger.log('');
swseLogger.log('='.repeat(80));
swseLogger.log(`Modified ${changes.length} items`);
swseLogger.log(`File saved: ${templatesPath}`);
swseLogger.log('');
swseLogger.log('Run calculate-template-credits.js to see budget impact');

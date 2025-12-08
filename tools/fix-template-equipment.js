/**
 * Fix template equipment references to match compendium items
 */

const fs = require('fs');
const path = require('path');

// Item name mapping: template name → compendium name
const itemMapping = {
  // Exact name fixes (casing, formatting)
  'Hold-Out Blaster': 'Hold-out Blaster',
  'Holdout Blaster': 'Hold-out Blaster',
  'Vibro-Axe': 'Vibroblade',  // No Vibro-Axe in compendium, using Vibroblade

  // Quantity removals (items exist without quantity)
  'Blaster Pistol (Backup)': 'Blaster Pistol',
  'Medpac (2)': 'Medpac',
  'Medpac (3)': 'Medpac',
  'Power Packs': 'Power Pack',
  'Power Packs (2)': 'Power Pack',
  'Power Packs (3)': 'Power Pack',
  'Power Packs (4)': 'Power Pack',
  'Frag Grenades (3)': 'Frag Grenade',

  // Items that need specific variants
  'Comlink': 'Comlink, Short-Range',
  'Comlink (Encrypted)': 'Comlink, Short-Range',  // Use short-range as base
  'Comlink (Secured)': 'Comlink, Short-Range',
  'Datapad': 'Datapad, Standard',
  'Advanced Datapad': 'Datapad, Standard',  // No "Advanced" variant
  'Utility Belt': 'Utility Belt (Standard)',
  'Utility Belt with Medpac': 'Utility Belt (Standard)',

  // Armor and clothing
  'Blast Vest & Helmet': 'Blast Helmet and Vest',
  'Padded Armor': 'Padded Flight Suit',
  'Jedi Robes': 'Armored Flight Suit',  // No Jedi Robes, use light armor
  'Dark Robes': 'Armored Flight Suit',
  'Formal Clothing': 'Flight Suit',
  'Business Attire': 'Flight Suit',
  'Street Clothes': 'Flight Suit',
  'Work Coveralls': 'Flight Suit',
  'Black Body Glove': 'Thinsuit',
  'Stylish Armor': 'Shadowsuit',  // Stylish light armor

  // Weapons
  'Knife': 'Vibrodagger',
  'Vibroknife': 'Vibrodagger',

  // Equipment
  'Targeting Scope': 'Targeting Scope, Standard',
  'Macrobinoculars': 'Electrobinoculars',
  'Binders': 'Binder Cuffs',
  'Survival Kit': 'Field Kit',
  'Rations (1 week)': 'Ration Pack',
  'Surveillance Gear': 'Surveillance Tagger',
  'Portable Scanner': 'Bioscanner',

  // Items with no good match - keep as placeholder or use closest
  'Combat Gloves': 'Combat Jumpsuit',  // No gloves item
  'Flash Goggles': 'Electrobinoculars',
  'Forgery Kit': 'Security Kit',  // Closest match for criminal tools
  'Fake ID': 'Code Cylinder',
  'Forged Documents': 'Blank Datacards (10)',
  'Encrypted Data Storage': 'Blank Datacards (10)',
  'Credit Chip': 'Credit Chip',  // This one actually exists!
  'Sabacc Deck': 'Blank Datacards (10)',  // No game items
  'Badge & Credentials': 'Code Cylinder',
};

// Load templates
const templatesPath = path.join(__dirname, '..', 'data', 'character-templates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

let changesCount = 0;
const changesLog = [];

// Apply mappings
templates.templates.forEach(template => {
  if (!template.startingEquipment) return;

  const originalEquipment = [...template.startingEquipment];

  template.startingEquipment = template.startingEquipment.map(item => {
    const trimmedItem = item.trim();

    if (itemMapping[trimmedItem]) {
      changesCount++;
      changesLog.push({
        template: template.name,
        class: template.class,
        from: trimmedItem,
        to: itemMapping[trimmedItem]
      });
      return itemMapping[trimmedItem];
    }

    return item;
  });
});

// Save updated templates
const outputPath = templatesPath;
fs.writeFileSync(outputPath, JSON.stringify(templates, null, 2), 'utf8');

swseLogger.log('='.repeat(80));
swseLogger.log('TEMPLATE EQUIPMENT FIXES APPLIED');
swseLogger.log('='.repeat(80));
swseLogger.log(`Total changes: ${changesCount}\n`);

if (changesLog.length > 0) {
  swseLogger.log('Changes made:\n');
  changesLog.forEach(change => {
    swseLogger.log(`${change.template} (${change.class}):`);
    swseLogger.log(`  ❌ "${change.from}"`);
    swseLogger.log(`  ✓  "${change.to}"\n`);
  });
}

swseLogger.log('='.repeat(80));
swseLogger.log(`✓ Templates updated successfully at: ${outputPath}`);
swseLogger.log('='.repeat(80));

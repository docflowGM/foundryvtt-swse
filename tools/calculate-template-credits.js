/**
 * Calculate equipment costs and update remaining credits for each template
 */

const fs = require('fs');
const path = require('path');

// Item cost mapping
const itemCosts = {
  'Medpac': 100,
  'Power Pack': 25,
  'Electrobinoculars': 1000,
  'Binder Cuffs': 50,
  'Security Kit': 750,
  'Frag Grenade': 200,
  'Stun Grenade': 150,
  'Ration Pack': 5,
  'Holorecorder': 100,
  'Blank Datacards (10)': 10,
  'Glow Rod': 10,
  'Audiorecorder': 25,
  'Comlink, Short-Range': 25,
  'Comlink, Long-Range': 250,
  'Datapad, Standard': 1000,
  'Tool Kit': 250,
  'Utility Belt (Standard)': 500,
  'Flight Suit': 1000,
  'Fusion Lantern': 25,
  'Power Recharger': 100,
  'Energy Cell': 10,
  'Vibrodagger': 250,
  'Hold-out Blaster': 250,
  'Credit Chip': 100,
  'Bioscanner': 3500,
  'Code Cylinder': 500,
  'Stun Baton': 250,
  'Padded Flight Suit': 2000,
  'Blaster Pistol': 500,
  'Blaster Rifle': 1000,
  'Heavy Blaster Pistol': 750,
  'Blast Helmet and Vest': 500,
  'Targeting Scope, Standard': 100,
  'Field Kit': 1000,
  'All-Temperature Cloak': 100,
  'Thinsuit': 900,
  'Vibroblade': 500,
  'Battle Armor': 7000,
  'Heavy Blaster Rifle': 1500,
  'Bandolier': 100,
  'Blaster Carbine': 900,
  'Combat Jumpsuit': 1500,
  'Shadowsuit': 600,
  'Surveillance Tagger': 450,
  'Armored Flight Suit': 4000,
  'Sporting Blaster Pistol': 300,
  'Lightsaber': 12000  // Will be excluded for Jedi
};

// Starting credits by class
const startingCreditsByClass = {
  'Jedi': 600,
  'Noble': 1500,
  'Scoundrel': 1875,
  'Scout': 1875,
  'Soldier': 1875,
  'Nonheroic': null  // Varies by template
};

// Load templates
const templatesPath = path.join(__dirname, '..', 'data', 'character-templates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

console.log('='.repeat(80));
console.log('TEMPLATE EQUIPMENT COST CALCULATION');
console.log('='.repeat(80));
console.log('');

const updates = [];

templates.templates.forEach(template => {
  if (!template.startingEquipment || template.startingEquipment.length === 0) {
    console.log(`${template.name} (${template.class}): No equipment`);
    return;
  }

  // Get starting credits
  let startingCredits = template.credits;

  // Calculate equipment cost
  let equipmentCost = 0;
  const isJedi = template.class === 'Jedi';

  template.startingEquipment.forEach(itemName => {
    // Skip Lightsaber for Jedi (it's free from class)
    if (isJedi && itemName === 'Lightsaber') {
      return;
    }

    const cost = itemCosts[itemName];
    if (cost === undefined) {
      console.warn(`  WARNING: Unknown item cost for "${itemName}"`);
    } else {
      equipmentCost += cost;
    }
  });

  const remainingCredits = startingCredits - equipmentCost;

  console.log(`${template.name} (${template.class}):`);
  console.log(`  Starting: ${startingCredits} credits`);
  console.log(`  Equipment: -${equipmentCost} credits`);
  console.log(`  Remaining: ${remainingCredits} credits`);
  console.log('');

  updates.push({
    id: template.id,
    oldCredits: startingCredits,
    newCredits: remainingCredits,
    equipmentCost: equipmentCost
  });

  // Update the template
  template.credits = remainingCredits;
});

// Save updated templates
fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), 'utf8');

console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Updated ${updates.length} templates with remaining credits`);
console.log(`File saved: ${templatesPath}`);

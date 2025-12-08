/**
 * Remove non-weapon items from over-budget templates
 */

const fs = require('fs');
const path = require('path');

// Item costs
const itemCosts = {
  'Medpac': 100, 'Power Pack': 25, 'Electrobinoculars': 1000, 'Binder Cuffs': 50,
  'Security Kit': 750, 'Frag Grenade': 200, 'Stun Grenade': 150, 'Ration Pack': 5,
  'Holorecorder': 100, 'Blank Datacards (10)': 10, 'Glow Rod': 10, 'Audiorecorder': 25,
  'Comlink, Short-Range': 25, 'Comlink, Long-Range': 250, 'Datapad, Standard': 1000,
  'Tool Kit': 250, 'Utility Belt (Standard)': 500, 'Fusion Lantern': 25,
  'Power Recharger': 100, 'Energy Cell': 10, 'Credit Chip': 100, 'Bioscanner': 3500,
  'Code Cylinder': 500, 'Targeting Scope, Standard': 100, 'Field Kit': 1000,
  'All-Temperature Cloak': 100, 'Bandolier': 100, 'Surveillance Tagger': 450
};

// Weapons and armor (keep these)
const weaponsAndArmor = [
  'Lightsaber', 'Blaster Pistol', 'Heavy Blaster Pistol', 'Hold-out Blaster',
  'Sporting Blaster Pistol', 'Blaster Rifle', 'Heavy Blaster Rifle', 'Blaster Carbine',
  'Vibrodagger', 'Vibroblade', 'Stun Baton', 'Thinsuit', 'Blast Helmet and Vest'
];

// Starting credits
const startingCredits = {
  'Jedi': 600, 'Noble': 1500, 'Scoundrel': 1875, 'Scout': 1875, 'Soldier': 1875,
  'Worker': 500, 'Trooper': 300, 'Criminal': 200, 'Merchant': 1000, 'Police Officer': 400
};

const templatesPath = path.join(__dirname, '..', 'data', 'character-templates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

swseLogger.log('='.repeat(80));
swseLogger.log('REMOVING NON-WEAPONS FROM OVER-BUDGET TEMPLATES');
swseLogger.log('='.repeat(80));
swseLogger.log('');

const changes = [];

templates.templates.forEach(template => {
  // Calculate current budget
  let startingCreds = template.name === 'Aristocrat' ? 6500 :
    (template.class === 'Nonheroic' ? startingCredits[template.name] : startingCredits[template.class]);

  let equipCost = 0;
  const isJedi = template.class === 'Jedi';

  template.startingEquipment.forEach(item => {
    if (isJedi && item === 'Lightsaber') return;
    equipCost += itemCosts[item] || 0;
  });

  const remaining = startingCreds - equipCost;

  // Only process if over budget
  if (remaining < 0) {
    const needed = Math.abs(remaining);
    let removed = [];

    // Remove non-weapons until we're in budget
    template.startingEquipment = template.startingEquipment.filter(item => {
      if (weaponsAndArmor.includes(item)) return true; // Keep weapons/armor

      const cost = itemCosts[item] || 0;
      if (removed.reduce((sum, i) => sum + (itemCosts[i] || 0), 0) < needed) {
        removed.push(item);
        return false; // Remove this item
      }
      return true;
    });

    if (removed.length > 0) {
      const savedAmount = removed.reduce((sum, i) => sum + (itemCosts[i] || 0), 0);
      changes.push({
        template: template.name,
        removed: removed,
        saved: savedAmount,
        needed: needed
      });
    }
  }
});

fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), 'utf8');

swseLogger.log('Non-weapon items removed:');
changes.forEach(c => {
  swseLogger.log(`\n${c.template} (needed ${c.needed}, saved ${c.saved}):`);
  c.removed.forEach(item => swseLogger.log(`  - ${item} (${itemCosts[item]})`));
});

swseLogger.log('\n' + '='.repeat(80));
swseLogger.log(`Modified ${changes.length} templates`);
swseLogger.log('Run calculate-template-credits.js for final budget status');

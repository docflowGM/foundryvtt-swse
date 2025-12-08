/**
 * Check template equipment against compendia
 * This script validates all equipment references in character templates
 */

const fs = require('fs');
const path = require('path');

// Load character templates
const templatesPath = path.join(__dirname, '..', 'data', 'character-templates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

// Extract all unique equipment items from templates
const allEquipment = new Set();

templates.templates.forEach(template => {
  if (template.startingEquipment) {
    template.startingEquipment.forEach(item => {
      allEquipment.add(item.trim());
    });
  }
});

swseLogger.log('='.repeat(80));
swseLogger.log('EQUIPMENT ITEMS IN TEMPLATES');
swseLogger.log('='.repeat(80));
swseLogger.log(`Total unique items: ${allEquipment.size}\n`);

// Sort and display
const sortedEquipment = Array.from(allEquipment).sort();
sortedEquipment.forEach((item, index) => {
  swseLogger.log(`${(index + 1).toString().padStart(3)}. ${item}`);
});

swseLogger.log('\n' + '='.repeat(80));
swseLogger.log('Templates requiring these items:');
swseLogger.log('='.repeat(80));

// Show which templates use which items
sortedEquipment.forEach(equipName => {
  const templatesUsingItem = templates.templates
    .filter(t => t.startingEquipment && t.startingEquipment.includes(equipName))
    .map(t => `${t.name} (${t.class})`);

  if (templatesUsingItem.length > 0) {
    swseLogger.log(`\n${equipName}:`);
    templatesUsingItem.forEach(t => swseLogger.log(`  - ${t}`));
  }
});

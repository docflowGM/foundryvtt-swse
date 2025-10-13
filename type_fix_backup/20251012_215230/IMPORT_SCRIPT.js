// SWSE Data Import Script
// Paste this into Foundry console (F12)

async function importSWSEData() {
  const files = [
    { file: 'classes.json', type: 'class' },
    { file: 'feats.json', type: 'feat' },
    { file: 'talents.json', type: 'talent' },
    { file: 'forcepowers.json', type: 'forcePower' },
    { file: 'weapons.json', type: 'weapon' },
    { file: 'equipment.json', type: 'equipment' },
    { file: 'skills.json', type: 'skill' },
    { file: 'combat-actions.json', type: 'combatAction' },
    { file: 'conditions.json', type: 'condition' }
  ];
  
  let totalImported = 0;
  let totalSkipped = 0;
  
  for (const {file, type} of files) {
    try {
      const response = await fetch(`systems/swse/data/${file}`);
      if (!response.ok) {
        console.log(`⚠ ${file} not found - skipping`);
        continue;
      }
      
      const items = await response.json();
      let imported = 0;
      let skipped = 0;
      
      for (const itemData of items) {
        // Validate required fields
        if (!itemData.name || !itemData.name.trim()) {
          console.warn(`Skipping item with no name in ${file}`);
          skipped++;
          continue;
        }
        
        // Check if already exists
        const existing = game.items.find(i => 
          i.name === itemData.name && i.type === itemData.type
        );
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Create item
        try {
          await Item.create({
            name: itemData.name,
            type: itemData.type,
            system: itemData
          });
          imported++;
        } catch (err) {
          console.error(`Failed to create ${itemData.name}:`, err.message);
          skipped++;
        }
      }
      
      console.log(`✓ ${file}: Imported ${imported}, Skipped ${skipped}`);
      totalImported += imported;
      totalSkipped += skipped;
      
    } catch (error) {
      console.error(`❌ Error loading ${file}:`, error);
    }
  }
  
  console.log(`\n✓ Import complete!`);
  console.log(`  Total imported: ${totalImported}`);
  console.log(`  Total skipped: ${totalSkipped}`);
  console.log(`\nTotal items in world: ${game.items.size}`);
}

// Run the import
await importSWSEData();

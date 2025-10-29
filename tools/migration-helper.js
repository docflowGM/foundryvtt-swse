// ============================================
// SWSE Item Type Migration Script
// Run this in the browser console (F12) when logged into your world
// ============================================

(async function migrateItemTypes() {
  console.log("SWSE | Starting item type migration...");
  
  const migrations = {
    // Add any type migrations you need here
    // "oldType": "newType"
  };
  
  let updated = 0;
  let errors = 0;
  
  for (const item of game.items) {
    try {
      const oldType = item.type;
      
      // Check if this type needs migration
      if (migrations[oldType]) {
        const newType = migrations[oldType];
        await item.update({ type: newType });
        console.log(`Migrated ${item.name}: ${oldType} -> ${newType}`);
        updated++;
      }
      
      // Validate the item can load
      if (!item.type) {
        console.error(`Item ${item.name} has no type!`);
        errors++;
      }
      
    } catch (err) {
      console.error(`Error migrating ${item.name}:`, err);
      errors++;
    }
  }
  
  console.log(`SWSE | Migration complete: ${updated} updated, ${errors} errors`);
  ui.notifications.info(`Migration complete: ${updated} updated, ${errors} errors`);
})();

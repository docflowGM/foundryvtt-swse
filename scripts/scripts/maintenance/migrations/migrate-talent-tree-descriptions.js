/**
 * Migration: Add descriptions to all Talent Trees
 *
 * This script updates all talent tree items in the talent_trees compendium
 * with descriptions from the talent-tree-descriptions.json file.
 *
 * Run this once to populate all talent tree descriptions.
 */

export async function migrateTalentTreeDescriptions() {
  console.log('[MIGRATION] Starting talent tree description migration...');

  // Load the descriptions data
  let descriptions = {};
  try {
    const response = await fetch('systems/foundryvtt-swse/data/talent-tree-descriptions.json');
    descriptions = await response.json();
    console.log(`[MIGRATION] Loaded ${Object.keys(descriptions).length} talent tree descriptions`);
  } catch (err) {
    console.error('[MIGRATION] Failed to load descriptions file:', err);
    return false;
  }

  // Get the talent trees compendium
  const pack = game.packs.get('foundryvtt-swse.talent_trees');
  if (!pack) {
    console.error('[MIGRATION] Talent trees compendium not found');
    return false;
  }

  // Get all documents
  const docs = await pack.getDocuments();
  console.log(`[MIGRATION] Found ${docs.length} talent trees to update`);

  let updated = 0;
  let skipped = 0;
  const updates = [];

  for (const doc of docs) {
    const name = doc.name || 'Unknown';

    // Look up description
    const description = descriptions[name];

    if (!description) {
      console.warn(`[MIGRATION] No description found for talent tree: "${name}"`);
      skipped++;
      continue;
    }

    // Queue update
    updates.push({
      _id: doc._id,
      system: {
        description: description
      }
    });

    updated++;
  }

  // Apply all updates in batch
  if (updates.length > 0) {
    try {
      await pack.updateDocuments(updates);
      console.log(`[MIGRATION] Successfully updated ${updated} talent trees with descriptions`);
      console.log(`[MIGRATION] Skipped ${skipped} talent trees (no description found)`);
      return true;
    } catch (err) {
      console.error('[MIGRATION] Failed to apply updates:', err);
      return false;
    }
  } else {
    console.warn('[MIGRATION] No talent trees to update');
    return false;
  }
}

// Auto-run on world load if needed
Hooks.once('ready', () => {
  // Uncomment to run automatically:
  // migrateTalentTreeDescriptions().then(success => {
  //   if (success) {
  //     ui.notifications.info('Talent tree descriptions migrated successfully');
  //   }
  // });
});

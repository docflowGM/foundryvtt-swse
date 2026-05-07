/**
 * Migrate Force Power Documents: forcepower → force-power
 *
 * This script migrates all force power documents in the forcepowers and
 * lightsaberformpowers compendiums from the old type 'forcepower' to the
 * canonical type 'force-power'.
 *
 * Usage (in Foundry Console or as Macro):
 *   await import('/systems/foundryvtt-swse/scripts/migration/migrate-force-powers-type.js')
 *     .then(m => m.migrateForcePowerTypes())
 *
 * Or paste as a Script macro and execute.
 */

export async function migrateForcePowerTypes() {
  const PACKS_TO_MIGRATE = [
    'foundryvtt-swse.forcepowers',
    'foundryvtt-swse.lightsaberformpowers'
  ];

  let totalMigrated = 0;
  let totalSkipped = 0;
  let errors = [];

  for (const packName of PACKS_TO_MIGRATE) {
    const pack = game.packs.get(packName);
    if (!pack) {
      console.warn(`Pack not found: ${packName}`);
      continue;
    }

    console.log(`\n=== Migrating pack: ${packName} ===`);

    // Unlock pack if needed
    if (pack.locked) {
      console.log(`Unlocking pack ${packName}...`);
      await pack.configure({ locked: false });
    }

    // Get all items in the pack
    const index = await pack.getIndex();
    console.log(`Found ${index.length} documents in ${packName}`);

    let packMigrated = 0;
    let packSkipped = 0;

    for (const indexEntry of index) {
      try {
        const doc = await pack.getDocument(indexEntry._id);

        if (!doc) {
          console.warn(`Could not load document: ${indexEntry._id}`);
          packSkipped++;
          continue;
        }

        // Check if migration is needed
        if (doc.type === 'forcepower') {
          console.log(`Migrating: ${doc.name} (${doc._id})`);

          // Update the type
          await doc.update({ type: 'force-power' });
          packMigrated++;
        } else if (doc.type === 'force-power') {
          // Already migrated
          packSkipped++;
        } else {
          console.warn(`Unexpected type in ${packName}: ${doc.type} for ${doc.name}`);
          packSkipped++;
        }
      } catch (error) {
        console.error(`Error migrating ${indexEntry._id}:`, error);
        errors.push({ id: indexEntry._id, error: error.message });
        packSkipped++;
      }
    }

    console.log(`\n${packName} migration summary:`);
    console.log(`  Migrated: ${packMigrated}`);
    console.log(`  Skipped: ${packSkipped}`);

    totalMigrated += packMigrated;
    totalSkipped += packSkipped;

    // Relock pack if it was locked
    if (pack.locked) {
      console.log(`Relocking pack ${packName}...`);
      await pack.configure({ locked: true });
    }
  }

  // Final report
  console.log(`\n=== Migration Complete ===`);
  console.log(`Total migrated: ${totalMigrated}`);
  console.log(`Total skipped: ${totalSkipped}`);

  if (errors.length > 0) {
    console.error(`Errors encountered: ${errors.length}`);
    console.error(errors);
  }

  // Show notification
  if (totalMigrated > 0) {
    ui.notifications.info(`Migrated ${totalMigrated} force power documents to new type 'force-power'`);
  } else {
    ui.notifications.warn('No force power documents needed migration');
  }

  return { totalMigrated, totalSkipped, errors };
}

// If running as macro or script
if (typeof migrateForcePowerTypes !== 'undefined') {
  await migrateForcePowerTypes();
}

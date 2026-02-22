/**
 * SWSE World Repair Script
 * PHASE 11: All mutations route through ActorEngine for governance
 *
 * Run this ONCE from the console to fix structural data issues.
 * After running, delete this file.
 *
 * Usage:
 * await import('/systems/foundryvtt-swse/scripts/maintenance/world-repair.js')
 */

export async function repairWorld() {
  console.group('🔧 SWSE World Repair - Starting');

  const report = {
    deletedActors: [],
    repairedActors: [],
    skippedActors: [],
    errors: []
  };

  // ============================================
  // 1. PURGE NON-ACTOR DOCUMENTS FROM ACTORS
  // ============================================
  console.log('Phase 1: Validating actor documents...');
  for (const actor of game.actors.contents) {
    try {
      if (!(actor instanceof Actor)) {
        console.warn(`❌ Deleting non-Actor: ${actor.name} (${actor.constructor.name})`);
        await actor.delete();
        report.deletedActors.push(actor.name);
        continue;
      }
    } catch (err) {
      report.errors.push(`Failed to delete ${actor.name}: ${err.message}`);
    }
  }

  // ============================================
  // 2. ENFORCE VALID ACTOR TYPES & SCHEMAS
  // ============================================
  console.log('Phase 2: Repairing actor schemas...');
  const validTypes = ['character', 'droid', 'vehicle', 'npc'];

  for (const actor of game.actors.contents) {
    try {
      // Check type validity
      if (!validTypes.includes(actor.type)) {
        console.warn(`⚠️  Skipping ${actor.name}: invalid type "${actor.type}"`);
        report.skippedActors.push(actor.name);
        continue;
      }

      const fixes = {};
      let needsUpdate = false;

      // Ensure system object exists
      if (!actor.system) {
        actor.system = {};
        needsUpdate = true;
      }

      // Normalize size (to lowercase)
      if (typeof actor.system.size === 'string' && actor.system.size !== actor.system.size.toLowerCase()) {
        fixes['system.size'] = actor.system.size.toLowerCase();
        needsUpdate = true;
      }

      // Enforce numeric combat fields
      for (const key of ['bab', 'baseAttack', 'initiative']) {
        if (typeof actor.system[key] !== 'number') {
          const val = Number(actor.system[key]);
          if (!isNaN(val)) {
            fixes[`system.${key}`] = val;
          } else {
            fixes[`system.${key}`] = 0;
          }
          needsUpdate = true;
        }
      }

      // Ensure defenses structure
      if (!actor.system.defenses || typeof actor.system.defenses !== 'object') {
        fixes['system.defenses'] = {
          reflex: { ability: 0, misc: 0 },
          fort: { ability: 0, misc: 0 },
          will: { ability: 0, misc: 0 }
        };
        needsUpdate = true;
      } else {
        for (const def of ['reflex', 'fort', 'will']) {
          if (!actor.system.defenses[def]) {
            fixes[`system.defenses.${def}`] = { ability: 0, misc: 0 };
            needsUpdate = true;
          } else if (
            typeof actor.system.defenses[def].ability !== 'number' ||
            typeof actor.system.defenses[def].misc !== 'number'
          ) {
            fixes[`system.defenses.${def}.ability`] = Number(actor.system.defenses[def].ability) || 0;
            fixes[`system.defenses.${def}.misc`] = Number(actor.system.defenses[def].misc) || 0;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        // PHASE 11: Route through ActorEngine for governance
        if (globalThis.SWSE?.ActorEngine?.updateActor) {
          await globalThis.SWSE.ActorEngine.updateActor(actor, fixes, {
            meta: { origin: 'world-repair' }
          });
        } else {
          // Fallback if ActorEngine unavailable
          console.warn(`⚠️  ActorEngine unavailable, using direct update for ${actor.name}`);
          await actor.update(fixes);
        }
        report.repairedActors.push(actor.name);
        console.log(`✅ Repaired ${actor.name}`);
      }
    } catch (err) {
      report.errors.push(`Failed to repair ${actor.name}: ${err.message}`);
      console.error(`Error repairing ${actor.name}:`, err);
    }
  }

  // ============================================
  // 3. VALIDATE ITEM DOCUMENTS
  // ============================================
  console.log('Phase 3: Validating items...');
  let itemErrors = 0;
  for (const item of game.items.contents) {
    try {
      if (!(item instanceof Item)) {
        console.warn(`⚠️  Non-Item in world items: ${item.name}`);
        itemErrors++;
      }
    } catch (err) {
      report.errors.push(`Item validation error: ${err.message}`);
    }
  }

  // ============================================
  // REPORT
  // ============================================
  console.log('\n📊 REPAIR SUMMARY:');
  console.table({
    'Deleted (non-Actors)': report.deletedActors.length,
    'Repaired': report.repairedActors.length,
    'Skipped': report.skippedActors.length,
    'Errors': report.errors.length,
    'Item validation issues': itemErrors
  });

  if (report.deletedActors.length > 0) {
    console.log('\n🗑️  Deleted:');
    report.deletedActors.forEach(name => console.log(`  - ${name}`));
  }

  if (report.repairedActors.length > 0) {
    console.log('\n✅ Repaired:');
    report.repairedActors.forEach(name => console.log(`  - ${name}`));
  }

  if (report.skippedActors.length > 0) {
    console.log('\n⏭️  Skipped:');
    report.skippedActors.forEach(name => console.log(`  - ${name}`));
  }

  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.forEach(err => console.log(`  - ${err}`));
  }

  console.groupEnd();
  return report;
}

// Auto-run if loaded directly
repairWorld();

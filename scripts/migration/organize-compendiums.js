/**
 * Compendium Organization Migration Script
 * Helps organize items from monolithic packs into organized subcategory packs
 * Run this from the browser console or use it as a one-time migration
 */

async function organizeCompendiums() {
  console.log("SWSE Compendium Organization: Starting migration...");

  // Weapon organization mapping
  const weaponMappings = {
    'weapons-pistols': ['pistol'],
    'weapons-rifles': ['rifle', 'carbine'],
    'weapons-heavy': ['heavy', 'cannon'],
    'weapons-grenades': ['grenade', 'explosive', 'demolition'],
    'weapons-exotic': ['exotic', 'vibro'],
    'weapons-simple': ['simple', 'melee', 'blade']
  };

  // Equipment organization mapping
  const equipmentMappings = {
    'equipment-comlinks': ['comlink', 'communicat'],
    'equipment-tools': ['tool', 'kit', 'diagnostic', 'repair'],
    'equipment-survival': ['survival', 'sleeping', 'rope', 'backpack'],
    'equipment-medical': ['medical', 'medpack', 'stim', 'antitoxin'],
    'equipment-tech': ['tech', 'scanner', 'computer', 'datapad', 'holopad'],
    'equipment-security': ['lock', 'slicer', 'security', 'scrambler'],
    'equipment-other': []  // catch-all
  };

  // Vehicle organization mapping
  const vehicleMappings = {
    'vehicles-starships': ['Starfighter', 'Corvette', 'Cruiser', 'Transport', 'Freighter', 'Interceptor'],
    'vehicles-stations': ['Station', 'Spacedock', 'Dreadnaught'],
    'vehicles-walkers': ['Walker', 'AT-', 'Spider Droid'],
    'vehicles-speeders': ['Speeder', 'Landspeeder', 'Bike', 'Bike', 'BARC', 'Truck']
  };

  // Armor heavy - names containing "Heavy"
  const armorHeavyKeywords = ['Heavy', 'Powered', 'Dreadnaught'];

  let stats = {
    weapons: { organized: 0, total: 0, failures: [] },
    equipment: { organized: 0, total: 0, failures: [] },
    vehicles: { organized: 0, total: 0, failures: [] },
    armor: { organized: 0, total: 0, failures: [] }
  };

  // ==================== WEAPONS ====================
  console.log("Processing weapons...");
  const weaponsPack = game.packs.get('foundryvtt-swse.weapons');
  if (weaponsPack) {
    const weapons = await weaponsPack.getDocuments();
    stats.weapons.total = weapons.length;

    for (const weapon of weapons) {
      try {
        const weaponType = weapon.system?.type?.toLowerCase() || '';
        const weaponName = weapon.name.toLowerCase();

        let targetPack = null;

        // Find matching pack
        for (const [packName, keywords] of Object.entries(weaponMappings)) {
          if (keywords.some(kw => weaponType.includes(kw) || weaponName.includes(kw))) {
            targetPack = packName;
            break;
          }
        }

        if (targetPack && targetPack !== 'weapons') {
          const targetPackDoc = game.packs.get(`foundryvtt-swse.${targetPack}`);
          if (targetPackDoc) {
            // Clone to new pack
            const weaponData = weapon.toObject();
            await targetPackDoc.importDocument(weaponData);

            // Delete from original pack
            await weaponsPack.deleteDocument(weapon.id);
            stats.weapons.organized++;
            console.log(`✓ ${weapon.name} → ${targetPack}`);
          }
        }
      } catch (err) {
        console.warn(`✗ Failed to organize ${weapon.name}:`, err);
        stats.weapons.failures.push({ name: weapon.name, error: err.message });
      }
    }
  }

  // ==================== EQUIPMENT ====================
  console.log("Processing equipment...");
  const equipmentPack = game.packs.get('foundryvtt-swse.equipment');
  if (equipmentPack) {
    const equipment = await equipmentPack.getDocuments();
    stats.equipment.total = equipment.length;

    for (const item of equipment) {
      try {
        const itemName = item.name.toLowerCase();
        let targetPack = 'equipment-other';

        // Find matching pack
        for (const [packName, keywords] of Object.entries(equipmentMappings)) {
          if (packName === 'equipment-other') continue;
          if (keywords.some(kw => itemName.includes(kw))) {
            targetPack = packName;
            break;
          }
        }

        if (targetPack !== 'equipment') {
          const targetPackDoc = game.packs.get(`foundryvtt-swse.${targetPack}`);
          if (targetPackDoc) {
            const itemData = item.toObject();
            await targetPackDoc.importDocument(itemData);
            await equipmentPack.deleteDocument(item.id);
            stats.equipment.organized++;
            console.log(`✓ ${item.name} → ${targetPack}`);
          }
        }
      } catch (err) {
        console.warn(`✗ Failed to organize ${item.name}:`, err);
        stats.equipment.failures.push({ name: item.name, error: err.message });
      }
    }
  }

  // ==================== VEHICLES ====================
  console.log("Processing vehicles...");
  const vehiclesPack = game.packs.get('foundryvtt-swse.vehicles');
  if (vehiclesPack) {
    const vehicles = await vehiclesPack.getDocuments();
    stats.vehicles.total = vehicles.length;

    for (const vehicle of vehicles) {
      try {
        const vehicleName = vehicle.name || '';
        const vehicleType = (vehicle.system?.type || '').toLowerCase();
        let targetPack = 'vehicles';

        // Find matching pack
        for (const [packName, keywords] of Object.entries(vehicleMappings)) {
          if (keywords.some(kw => vehicleName.includes(kw) || vehicleType.includes(kw.toLowerCase()))) {
            targetPack = packName;
            break;
          }
        }

        if (targetPack !== 'vehicles') {
          const targetPackDoc = game.packs.get(`foundryvtt-swse.${targetPack}`);
          if (targetPackDoc) {
            const vehicleData = vehicle.toObject();
            await targetPackDoc.importDocument(vehicleData);
            await vehiclesPack.deleteDocument(vehicle.id);
            stats.vehicles.organized++;
            console.log(`✓ ${vehicle.name} → ${targetPack}`);
          }
        }
      } catch (err) {
        console.warn(`✗ Failed to organize ${vehicle.name}:`, err);
        stats.vehicles.failures.push({ name: vehicle.name, error: err.message });
      }
    }
  }

  // ==================== ARMOR ====================
  console.log("Processing armor...");
  const armorPack = game.packs.get('foundryvtt-swse.armor');
  if (armorPack) {
    const armors = await armorPack.getDocuments();
    stats.armor.total = armors.length;

    for (const armor of armors) {
      try {
        const armorName = armor.name || '';
        let targetPack = 'armor';

        // Check if heavy armor
        if (armorHeavyKeywords.some(kw => armorName.includes(kw))) {
          targetPack = 'armor-heavy';
        } else if (armorName.includes('Light')) {
          targetPack = 'armor-light';
        } else if (armorName.includes('Medium')) {
          targetPack = 'armor-medium';
        }

        if (targetPack !== 'armor') {
          const targetPackDoc = game.packs.get(`foundryvtt-swse.${targetPack}`);
          if (targetPackDoc) {
            const armorData = armor.toObject();
            await targetPackDoc.importDocument(armorData);
            await armorPack.deleteDocument(armor.id);
            stats.armor.organized++;
            console.log(`✓ ${armor.name} → ${targetPack}`);
          }
        }
      } catch (err) {
        console.warn(`✗ Failed to organize ${armor.name}:`, err);
        stats.armor.failures.push({ name: armor.name, error: err.message });
      }
    }
  }

  // ==================== RESULTS ====================
  console.log("\n========== MIGRATION COMPLETE ==========");
  console.log(`Weapons: ${stats.weapons.organized}/${stats.weapons.total} organized`);
  console.log(`Equipment: ${stats.equipment.organized}/${stats.equipment.total} organized`);
  console.log(`Vehicles: ${stats.vehicles.organized}/${stats.vehicles.total} organized`);
  console.log(`Armor: ${stats.armor.organized}/${stats.armor.total} organized`);

  if (stats.weapons.failures.length > 0) {
    console.warn(`\nWeapon failures:`, stats.weapons.failures);
  }
  if (stats.equipment.failures.length > 0) {
    console.warn(`\nEquipment failures:`, stats.equipment.failures);
  }
  if (stats.vehicles.failures.length > 0) {
    console.warn(`\nVehicle failures:`, stats.vehicles.failures);
  }
  if (stats.armor.failures.length > 0) {
    console.warn(`\nArmor failures:`, stats.armor.failures);
  }

  ui.notifications.info("Compendium organization complete! Check console for details.");
  return stats;
}

// Execute if run from console
if (typeof game !== 'undefined' && game.ready) {
  organizeCompendiums().then(stats => {
    console.log("Migration results:", stats);
  }).catch(err => {
    console.error("Migration failed:", err);
    ui.notifications.error("Compendium organization failed! Check console for details.");
  });
}

// Export for use in other scripts
export { organizeCompendiums };

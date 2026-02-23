/**
 * Weapon Properties Migration — Legacy Detection → Structured Flags
 *
 * Migrates weapons from legacy name-based property detection to structured flags.
 * This enables Phase 3 completion of weapons compliance refactor.
 *
 * Migration Targets:
 * - Weapon items → system.weaponProperties.{isLight,isTwoHanded,keen,flaming,...}
 *
 * Replaces name-based detection like:
 *   - Checking weapon names for "light", "dagger", "knife"
 *   - Checking weapon names for "two-handed", "heavy", "rifle"
 *   - Checking weapon names for "keen", "flaming", "frost"
 *
 * With structured flags:
 *   - isLight: true/false
 *   - isTwoHanded: true/false
 *   - keen: true/false
 *   - flaming: true/false
 *   - frost: true/false
 *   - shock: true/false
 *   - vorpal: true/false
 */

export class WeaponPropertiesMigration {
  /**
   * Execute weapon properties migration for all weapons
   * @param {Item[]} weapons - Weapon items to migrate
   * @returns {Promise<Object>} Migration results
   */
  static async executeMigration(weapons = []) {
    const results = {
      weaponsMigrated: 0,
      weaponsSkipped: 0,
      errors: [],
      details: {
        weapons: []
      }
    };

    for (const weapon of weapons) {
      try {
        const migrated = await this.migrateWeapon(weapon);
        if (migrated) {
          results.weaponsMigrated++;
          results.details.weapons.push({
            id: weapon.id,
            name: weapon.name,
            properties: migrated
          });
        } else {
          results.weaponsSkipped++;
        }
      } catch (err) {
        results.errors.push(`Weapon ${weapon.name}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Migrate a single weapon's properties
   * @param {Item} weapon - Weapon item to migrate
   * @returns {Promise<Object|null>} Migration data or null if nothing to migrate
   */
  static async migrateWeapon(weapon) {
    if (!weapon || weapon.type !== 'weapon') {
      return null;
    }

    // Extract property flags from weapon name and existing data
    const weaponProperties = this._extractWeaponProperties(weapon);

    // If no properties changed, nothing to migrate
    if (!weaponProperties) {
      return null;
    }

    // Apply migration to weapon
    const updates = {};
    updates['system.weaponProperties'] = weaponProperties;

    try {
      await weapon.update(updates);
      return weaponProperties;
    } catch (err) {
      throw new Error(`Failed to update weapon: ${err.message}`);
    }
  }

  /**
   * Extract weapon property flags from weapon name and properties
   * Looks for patterns in name and converts to flags
   * @private
   */
  static _extractWeaponProperties(weapon) {
    const props = weapon.system?.weaponProperties || {
      isLight: false,
      isTwoHanded: false,
      keen: false,
      flaming: false,
      frost: false,
      shock: false,
      vorpal: false
    };

    const name = (weapon.name || '').toLowerCase();
    const category = (weapon.system?.weaponCategory || '').toLowerCase();

    // Detect light weapons from name
    const lightKeywords = ['knife', 'dagger', 'vibrodagger', 'shiv', 'stiletto',
                          'hold-out', 'holdout', 'derringer', 'pocket pistol', 'light'];
    if (lightKeywords.some(kw => name.includes(kw) || category.includes(kw))) {
      props.isLight = true;
    }

    // Detect two-handed weapons from name
    const twoHandedKeywords = ['two-handed', 'twohanded', '2h', '2-handed',
                              'heavy', 'rifle', 'carbine', 'repeating', 'sword',
                              'greatsword', 'greataxe', 'halberd', 'pike'];
    if (twoHandedKeywords.some(kw => name.includes(kw) || category.includes(kw))) {
      // Double-check it's not a light weapon
      if (!props.isLight) {
        props.isTwoHanded = true;
      }
    }

    // Detect special properties from name
    if (name.includes('keen')) { props.keen = true; }
    if (name.includes('flaming')) { props.flaming = true; }
    if (name.includes('frost')) { props.frost = true; }
    if (name.includes('shock')) { props.shock = true; }
    if (name.includes('vorpal')) { props.vorpal = true; }

    return props;
  }

  /**
   * Validate weapon properties migration
   * @param {Item} weapon - Weapon to validate
   * @returns {Object} Validation results
   */
  static validateWeaponMigration(weapon) {
    if (!weapon || weapon.type !== 'weapon') {
      return { valid: false, reason: 'Not a weapon item' };
    }

    const props = weapon.system?.weaponProperties;
    const name = (weapon.name || '').toLowerCase();

    // Check if weapon has special properties that should be flagged
    const hasSpecialProperties = ['keen', 'flaming', 'frost', 'shock', 'vorpal'].some(
      prop => name.includes(prop)
    );

    if (hasSpecialProperties && (!props || Object.values(props).every(v => !v))) {
      return { valid: false, reason: 'Name suggests special properties but none are flagged' };
    }

    return { valid: true, reason: 'Weapon migration valid' };
  }

  /**
   * Generate migration report
   * @param {Object} results - Results from executeMigration()
   * @returns {string} Formatted report
   */
  static generateReport(results) {
    const report = [];
    report.push('=== WEAPON PROPERTIES MIGRATION REPORT ===\n');
    report.push(`Weapons Migrated: ${results.weaponsMigrated}`);
    report.push(`Weapons Skipped: ${results.weaponsSkipped}`);
    report.push(`Errors: ${results.errors.length}\n`);

    if (results.details.weapons.length > 0) {
      report.push('WEAPONS MIGRATED:');
      for (const weapon of results.details.weapons) {
        report.push(`  ${weapon.name} (${weapon.id})`);
        const propsList = Object.entries(weapon.properties)
          .filter(([_, v]) => v)
          .map(([k, _]) => k);
        if (propsList.length > 0) {
          report.push(`    Properties: ${propsList.join(', ')}`);
        }
      }
      report.push('');
    }

    if (results.errors.length > 0) {
      report.push('ERRORS:');
      for (const err of results.errors) {
        report.push(`  ✗ ${err}`);
      }
      report.push('');
    }

    return report.join('\n');
  }
}

export default WeaponPropertiesMigration;

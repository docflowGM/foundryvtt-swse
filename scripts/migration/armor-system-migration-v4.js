/**
 * Armor System Migration v4 — Legacy Data → Structured Flags
 *
 * Migrates actors and items from legacy name-based detection to structured flags.
 * This enables Phase 4 completion and Phase 5 upgrade integration.
 *
 * Migration Targets:
 * 1. Actor proficiency talents → system.proficiencies.armor.{light,medium,heavy}
 * 2. Actor armor talents → system.talentFlags.{armoredDefense,improvedArmoredDefense,armorMastery}
 * 3. Armor items → system.isPowered = true for powered armor
 */

export class ArmorSystemMigrationV4 {
  /**
   * Execute full migration: actors + items
   * @param {Actor[]} actors - Actors to migrate
   * @param {Item[]} armorItems - Armor items to migrate
   * @returns {Promise<Object>} Migration results
   */
  static async executeMigration(actors = [], armorItems = []) {
    const results = {
      actorsMigrated: 0,
      actorsSkipped: 0,
      itemsMigrated: 0,
      itemsSkipped: 0,
      errors: [],
      details: {
        actors: [],
        items: []
      }
    };

    // Migrate actors
    for (const actor of actors) {
      try {
        const migrated = await this.migrateActor(actor);
        if (migrated) {
          results.actorsMigrated++;
          results.details.actors.push({
            id: actor.id,
            name: actor.name,
            proficiencies: migrated.proficiencies,
            talents: migrated.talents
          });
        } else {
          results.actorsSkipped++;
        }
      } catch (err) {
        results.errors.push(`Actor ${actor.name}: ${err.message}`);
      }
    }

    // Migrate armor items
    for (const item of armorItems) {
      try {
        const migrated = await this.migrateArmorItem(item);
        if (migrated) {
          results.itemsMigrated++;
          results.details.items.push({
            id: item.id,
            name: item.name,
            wasPowered: migrated.wasPowered,
            isPowered: migrated.isPowered
          });
        } else {
          results.itemsSkipped++;
        }
      } catch (err) {
        results.errors.push(`Item ${item.name}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Migrate a single actor
   * @param {Actor} actor
   * @returns {Promise<Object|null>} Migration data or null if nothing to migrate
   */
  static async migrateActor(actor) {
    if (!actor || actor.type !== 'character') {
      return null;
    }

    let hasMigration = false;
    const migrationData = {
      proficiencies: {},
      talents: {}
    };

    // Step 1: Migrate proficiencies
    const proficiencyMigration = this._extractProficiencies(actor);
    if (Object.keys(proficiencyMigration).length > 0) {
      hasMigration = true;
      migrationData.proficiencies = proficiencyMigration;
    }

    // Step 2: Migrate talents
    const talentMigration = this._extractTalents(actor);
    if (Object.keys(talentMigration).length > 0) {
      hasMigration = true;
      migrationData.talents = talentMigration;
    }

    if (!hasMigration) {
      return null;
    }

    // Step 3: Apply migrations to actor
    const updates = {};

    // Create proficiencies structure if needed
    if (Object.keys(proficiencyMigration).length > 0) {
      updates['system.proficiencies'] = updates['system.proficiencies'] || {};
      updates['system.proficiencies'].armor = proficiencyMigration;
    }

    // Create talent flags structure if needed
    if (Object.keys(talentMigration).length > 0) {
      updates['system.talentFlags'] = talentMigration;
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      await actor.update(updates);
    }

    return migrationData;
  }

  /**
   * Migrate a single armor item
   * @param {Item} item
   * @returns {Promise<Object|null>} Migration data or null if nothing to migrate
   */
  static async migrateArmorItem(item) {
    if (!item || item.type !== 'armor') {
      return null;
    }

    const system = item.system || {};

    // Check if already has structured flag
    if (system.isPowered === true) {
      return null; // Already migrated
    }

    // Check if should be powered (legacy name detection)
    const name = (item.name || '').toLowerCase();
    const powerKeywords = ['power', 'powered', 'motorized', 'reinforced'];
    const shouldBePowered = powerKeywords.some((kw) => name.includes(kw));

    if (!shouldBePowered) {
      return null; // Not powered, nothing to migrate
    }

    // Apply migration
    await item.update({ 'system.isPowered': true });

    return {
      wasPowered: false, // Wasn't explicitly flagged
      isPowered: true    // Now flagged
    };
  }

  /**
   * Extract proficiency flags from actor items
   * @private
   */
  static _extractProficiencies(actor) {
    const profs = {
      light: false,
      medium: false,
      heavy: false
    };

    const items = actor?.items || [];
    const profItems = items.filter(i =>
      (i.type === 'feat' || i.type === 'talent') &&
      i.name.toLowerCase().includes('armor proficiency')
    );

    for (const prof of profItems) {
      const name = prof.name.toLowerCase();
      if (name.includes('light')) { profs.light = true; }
      if (name.includes('medium')) { profs.medium = true; }
      if (name.includes('heavy')) { profs.heavy = true; }
    }

    // Return only if at least one proficiency found
    return (profs.light || profs.medium || profs.heavy) ? profs : {};
  }

  /**
   * Extract talent flags from actor items
   * @private
   */
  static _extractTalents(actor) {
    const talents = {
      armoredDefense: false,
      improvedArmoredDefense: false,
      armorMastery: false
    };

    const items = actor?.items || [];
    const talentItems = items.filter(i => i.type === 'talent');

    for (const talent of talentItems) {
      const name = talent.name.toLowerCase();
      if (name === 'armored defense') { talents.armoredDefense = true; }
      if (name === 'improved armored defense') { talents.improvedArmoredDefense = true; }
      if (name === 'armor mastery') { talents.armorMastery = true; }
    }

    // Return only if at least one talent found
    return (talents.armoredDefense || talents.improvedArmoredDefense || talents.armorMastery)
      ? talents
      : {};
  }

  /**
   * Validate migration completeness
   * @param {Actor} actor
   * @returns {Object} Validation results
   */
  static validateActorMigration(actor) {
    if (!actor) {
      return { valid: false, reason: 'Actor not found' };
    }

    const proficiencies = actor.system?.proficiencies?.armor;
    const talentFlags = actor.system?.talentFlags;

    // Check if actor has any proficiency or talent items
    const hasLegacyProfs = actor.items?.some(i =>
      (i.type === 'feat' || i.type === 'talent') &&
      i.name.toLowerCase().includes('armor proficiency')
    );

    const hasLegacyTalents = actor.items?.some(i =>
      i.type === 'talent' &&
      ['armored defense', 'improved armored defense', 'armor mastery'].includes(
        i.name.toLowerCase()
      )
    );

    // If has legacy items, should have flags
    if (hasLegacyProfs && !proficiencies) {
      return { valid: false, reason: 'Has proficiency items but no structured flags' };
    }

    if (hasLegacyTalents && !talentFlags) {
      return { valid: false, reason: 'Has talent items but no structured flags' };
    }

    return { valid: true, reason: 'Migration valid' };
  }

  /**
   * Validate migration completeness for armor item
   * @param {Item} item
   * @returns {Object} Validation results
   */
  static validateArmorItemMigration(item) {
    if (!item || item.type !== 'armor') {
      return { valid: false, reason: 'Not an armor item' };
    }

    const name = (item.name || '').toLowerCase();
    const powerKeywords = ['power', 'powered', 'motorized', 'reinforced'];
    const shouldBePowered = powerKeywords.some((kw) => name.includes(kw));
    const isPowered = item.system?.isPowered === true;

    // If name suggests powered, should have flag
    if (shouldBePowered && !isPowered) {
      return { valid: false, reason: 'Name suggests powered but isPowered flag not set' };
    }

    return { valid: true, reason: 'Armor migration valid' };
  }

  /**
   * Generate migration report
   * @param {Object} results - Results from executeMigration()
   * @returns {string} Formatted report
   */
  static generateReport(results) {
    const report = [];
    report.push('=== ARMOR SYSTEM MIGRATION v4 REPORT ===\n');
    report.push(`Actors Migrated: ${results.actorsMigrated}`);
    report.push(`Actors Skipped: ${results.actorsSkipped}`);
    report.push(`Items Migrated: ${results.itemsMigrated}`);
    report.push(`Items Skipped: ${results.itemsSkipped}`);
    report.push(`Errors: ${results.errors.length}\n`);

    if (results.details.actors.length > 0) {
      report.push('ACTORS MIGRATED:');
      for (const actor of results.details.actors) {
        report.push(`  - ${actor.name} (${actor.id})`);
        if (Object.keys(actor.proficiencies).length > 0) {
          report.push(`    Proficiencies: ${JSON.stringify(actor.proficiencies)}`);
        }
        if (Object.keys(actor.talents).length > 0) {
          report.push(`    Talents: ${JSON.stringify(actor.talents)}`);
        }
      }
      report.push('');
    }

    if (results.details.items.length > 0) {
      report.push('ITEMS MIGRATED:');
      for (const item of results.details.items) {
        report.push(`  - ${item.name} (${item.id}): isPowered=${item.isPowered}`);
      }
      report.push('');
    }

    if (results.errors.length > 0) {
      report.push('ERRORS:');
      for (const error of results.errors) {
        report.push(`  - ${error}`);
      }
    }

    return report.join('\n');
  }
}

export default ArmorSystemMigrationV4;

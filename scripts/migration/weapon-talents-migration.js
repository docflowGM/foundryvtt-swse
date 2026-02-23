/**
 * Weapon Talents Migration — Legacy Detection → Structured Flags
 *
 * Migrates actors from legacy name-based weapon talent detection to structured flags.
 * This enables Phase 3 completion of weapons compliance refactor.
 *
 * Migration Targets:
 * - Actor weapon talents → system.weaponTalentFlags.{dexterousDamage,weaponFinesse,...}
 *
 * Replaces name-based detection like:
 *   - "Dexterous Damage", "Dexterous Damage (Finesse)", "Precise Strike"
 *   - "Weapon Finesse", "Melee Finesse"
 *   - "Power Attack"
 *
 * With structured flags:
 *   - dexterousDamage: true/false
 *   - weaponFinesse: true/false
 *   - preciseStrike: true/false
 *   - meleeFiness: true/false
 *   - powerAttack: true/false
 */

export class WeaponTalentsMigration {
  /**
   * Execute weapon talent migration for all actors
   * @param {Actor[]} actors - Actors to migrate
   * @returns {Promise<Object>} Migration results
   */
  static async executeMigration(actors = []) {
    const results = {
      actorsMigrated: 0,
      actorsSkipped: 0,
      errors: [],
      details: {
        actors: []
      }
    };

    for (const actor of actors) {
      try {
        const migrated = await this.migrateActor(actor);
        if (migrated) {
          results.actorsMigrated++;
          results.details.actors.push({
            id: actor.id,
            name: actor.name,
            talents: migrated
          });
        } else {
          results.actorsSkipped++;
        }
      } catch (err) {
        results.errors.push(`Actor ${actor.name}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Migrate a single actor's weapon talents
   * @param {Actor} actor
   * @returns {Promise<Object|null>} Migration data or null if nothing to migrate
   */
  static async migrateActor(actor) {
    if (!actor || (actor.type !== 'character' && actor.type !== 'npc')) {
      return null;
    }

    // Extract talent flags from actor items
    const talentFlags = this._extractWeaponTalentFlags(actor);

    // If no talent flags found, nothing to migrate
    if (Object.values(talentFlags).every(v => !v)) {
      return null;
    }

    // Apply migration to actor
    const updates = {};
    updates['system.weaponTalentFlags'] = talentFlags;

    try {
      await actor.update(updates);
      return talentFlags;
    } catch (err) {
      throw new Error(`Failed to update actor: ${err.message}`);
    }
  }

  /**
   * Extract weapon talent flags from actor items
   * Looks for talents with specific names and converts to flags
   * @private
   */
  static _extractWeaponTalentFlags(actor) {
    const flags = {
      dexterousDamage: false,
      weaponFinesse: false,
      preciseStrike: false,
      meleeFiness: false,
      powerAttack: false
    };

    const items = actor?.items || [];
    const talents = items.filter(i => i.type === 'talent');

    for (const talent of talents) {
      const name = (talent.name || '').toLowerCase().trim();

      // Dexterous Damage (multiple variants)
      if (name === 'dexterous damage' ||
          name === 'dexterous damage (finesse)' ||
          name.startsWith('dexterous damage')) {
        flags.dexterousDamage = true;
      }

      // Weapon Finesse
      if (name === 'weapon finesse') {
        flags.weaponFinesse = true;
      }

      // Precise Strike
      if (name === 'precise strike') {
        flags.preciseStrike = true;
      }

      // Melee Finesse (variant of weapon finesse)
      if (name === 'melee finesse') {
        flags.meleeFiness = true;
      }

      // Power Attack
      if (name === 'power attack') {
        flags.powerAttack = true;
      }
    }

    return flags;
  }

  /**
   * Validate weapon talent migration
   * @param {Actor} actor
   * @returns {Object} Validation results
   */
  static validateActorMigration(actor) {
    if (!actor) {
      return { valid: false, reason: 'Actor not found' };
    }

    const talentFlags = actor.system?.weaponTalentFlags;

    // Check if actor has legacy weapon talent items
    const hasLegacyTalents = actor.items?.some(i =>
      i.type === 'talent' &&
      this._isWeaponTalent(i.name)
    );

    // If has legacy talent items, should have flags
    if (hasLegacyTalents && !talentFlags) {
      return { valid: false, reason: 'Has weapon talent items but no structured flags' };
    }

    return { valid: true, reason: 'Migration valid' };
  }

  /**
   * Check if a talent name is a weapon-related talent
   * @private
   */
  static _isWeaponTalent(name) {
    const weaponTalentNames = [
      'dexterous damage',
      'weapon finesse',
      'precise strike',
      'melee finesse',
      'power attack'
    ];

    const nameLower = (name || '').toLowerCase().trim();
    return weaponTalentNames.some(wt =>
      nameLower === wt || nameLower.startsWith(wt)
    );
  }

  /**
   * Generate migration report
   * @param {Object} results - Results from executeMigration()
   * @returns {string} Formatted report
   */
  static generateReport(results) {
    const report = [];
    report.push('=== WEAPON TALENTS MIGRATION REPORT ===\n');
    report.push(`Actors Migrated: ${results.actorsMigrated}`);
    report.push(`Actors Skipped: ${results.actorsSkipped}`);
    report.push(`Errors: ${results.errors.length}\n`);

    if (results.details.actors.length > 0) {
      report.push('ACTORS MIGRATED:');
      for (const actor of results.details.actors) {
        report.push(`  ${actor.name} (${actor.id})`);
        const talentList = Object.entries(actor.talents)
          .filter(([_, v]) => v)
          .map(([k, _]) => k);
        if (talentList.length > 0) {
          report.push(`    Talents: ${talentList.join(', ')}`);
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

export default WeaponTalentsMigration;

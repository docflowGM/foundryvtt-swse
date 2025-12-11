import { SWSELogger } from '../utils/logger.js';
/**
 * Force Compendiums Population Migration
 *
 * Populates Force Techniques, Force Secrets, and Lightsaber Form Powers compendiums
 * from JSON source files in the data/ directory.
 *
 * Runs automatically on world ready (GM only) if compendiums are empty.
 */

export class PopulateForceCompendiumsMigration {

  static MIGRATION_VERSION = "1.1.145";
  static MIGRATION_KEY = "forceCompendiumsPopulation";

  /**
   * Check if migration has been run for current version
   */
  static async needsMigration() {
    const lastVersion = game.settings.get('swse', this.MIGRATION_KEY);
    return lastVersion !== this.MIGRATION_VERSION;
  }

  /**
   * Mark migration as complete
   */
  static async markComplete() {
    await game.settings.set('swse', this.MIGRATION_KEY, this.MIGRATION_VERSION);
  }

  /**
   * Main migration entry point
   */
  static async run() {
    // Only GMs can run migrations
    if (!game.user.isGM) {
      SWSELogger.log("SWSE | Skipping Force compendiums population (not GM)");
      return;
    }

    // Check if migration needed
    if (!(await this.needsMigration())) {
      SWSELogger.log("SWSE | Force compendiums already populated");
      return;
    }

    SWSELogger.log("SWSE | Starting Force compendiums population...");
    ui.notifications.info("Populating Force compendiums, please wait...");

    let totalCreated = 0;
    let totalErrors = 0;

    try {
      // Populate Force Techniques
      const techniquesCreated = await this.populateForceTechniques();
      totalCreated += techniquesCreated;

      // Populate Force Secrets
      const secretsCreated = await this.populateForceSecrets();
      totalCreated += secretsCreated;

      // Populate Lightsaber Form Powers
      const formPowersCreated = await this.populateLightsaberFormPowers();
      totalCreated += formPowersCreated;

    } catch (err) {
      SWSELogger.error("SWSE | Force compendiums population failed:", err);
      totalErrors++;
    }

    SWSELogger.log("=".repeat(60));
    SWSELogger.log("SWSE | Force Compendiums Population Complete");
    SWSELogger.log(`✓ Created: ${totalCreated} items`);
    if (totalErrors > 0) {
      SWSELogger.log(`✗ Errors: ${totalErrors}`);
    }
    SWSELogger.log("=".repeat(60));

    // Mark migration as complete
    await this.markComplete();

    if (totalCreated > 0) {
      ui.notifications.info(`Force compendiums populated! Created ${totalCreated} items.`);
    } else {
      ui.notifications.info("Force compendiums already populated.");
    }

    return { totalCreated, totalErrors };
  }

  /**
   * Populate Force Techniques compendium
   */
  static async populateForceTechniques() {
    const pack = game.packs.get('swse.forcetechniques');
    if (!pack) {
      SWSELogger.error("SWSE | Force Techniques compendium not found");
      return 0;
    }

    // Check if already populated
    const existingContent = await pack.getDocuments();
    if (existingContent.length > 0) {
      SWSELogger.log("SWSE | Force Techniques compendium already has content, skipping");
      return 0;
    }

    SWSELogger.log("SWSE | Loading Force Techniques from JSON...");

    let data;
    try {
      const response = await fetch('systems/foundryvtt-swse/data/force-techniques.json');
      data = await response.json();
    } catch (err) {
      SWSELogger.error("SWSE | Failed to load force-techniques.json:", err);
      return 0;
    }

    let created = 0;
    for (const technique of data.techniques) {
      try {
        // Build description with all available fields
        let description = `<p>${technique.description}</p>`;

        if (technique.special) {
          description += `<p><strong>Special:</strong> ${technique.special}</p>`;
        }

        if (technique.relatedPower) {
          description += `<p><strong>Related Power:</strong> ${technique.relatedPower}</p>`;
        }

        // Build prerequisites list: include manual prerequisites + related power
        let allPrerequisites = [...(technique.prerequisites || [])];
        if (technique.relatedPower) {
          allPrerequisites.push(technique.relatedPower);
        }

        if (allPrerequisites.length > 0) {
          description += `<p><strong>Prerequisites:</strong> ${allPrerequisites.join(', ')}</p>`;
        }

        const itemData = {
          name: technique.name,
          type: 'feat',
          system: {
            description: description,
            source: technique.source || '',
            tags: ['force-technique'],
            prerequisites: allPrerequisites.join(', '),  // Store as comma-separated string for prerequisite validator
            relatedPower: technique.relatedPower || ''
          },
          img: 'systems/foundryvtt-swse/assets/icons/force-technique.png'
        };

        await pack.createDocument(itemData);
        created++;
      } catch (err) {
        SWSELogger.error(`SWSE | Failed to create Force Technique: ${technique.name}`, err);
      }
    }

    SWSELogger.log(`SWSE | Created ${created} Force Techniques`);
    return created;
  }

  /**
   * Populate Force Secrets compendium
   */
  static async populateForceSecrets() {
    const pack = game.packs.get('swse.forcesecrets');
    if (!pack) {
      SWSELogger.error("SWSE | Force Secrets compendium not found");
      return 0;
    }

    // Check if already populated
    const existingContent = await pack.getDocuments();
    if (existingContent.length > 0) {
      SWSELogger.log("SWSE | Force Secrets compendium already has content, skipping");
      return 0;
    }

    SWSELogger.log("SWSE | Loading Force Secrets from JSON...");

    let data;
    try {
      const response = await fetch('systems/foundryvtt-swse/data/force-secrets.json');
      data = await response.json();
    } catch (err) {
      SWSELogger.error("SWSE | Failed to load force-secrets.json:", err);
      return 0;
    }

    let created = 0;
    for (const secret of data.secrets) {
      try {
        // Build description with all available fields
        let description = `<p><strong>Cost:</strong> ${secret.cost}</p>`;
        description += `<p>${secret.description}</p>`;

        if (secret.alternativeCost) {
          description += `<p>${secret.alternativeCost}</p>`;
        }

        if (secret.special) {
          description += `<p><strong>Special:</strong> ${secret.special}</p>`;
        }

        if (secret.prerequisites && secret.prerequisites.length > 0) {
          description += `<p><strong>Prerequisites:</strong> ${secret.prerequisites.join(', ')}</p>`;
        }

        const itemData = {
          name: secret.name,
          type: 'feat',
          system: {
            description: description,
            source: secret.source || '',
            tags: ['force-secret'],
            prerequisites: secret.prerequisites || [],
            cost: secret.cost
          },
          img: 'systems/foundryvtt-swse/assets/icons/force-secret.png'
        };

        await pack.createDocument(itemData);
        created++;
      } catch (err) {
        SWSELogger.error(`SWSE | Failed to create Force Secret: ${secret.name}`, err);
      }
    }

    SWSELogger.log(`SWSE | Created ${created} Force Secrets`);
    return created;
  }

  /**
   * Populate Lightsaber Form Powers compendium
   */
  static async populateLightsaberFormPowers() {
    const pack = game.packs.get('swse.lightsaberformpowers');
    if (!pack) {
      SWSELogger.error("SWSE | Lightsaber Form Powers compendium not found");
      return 0;
    }

    // Check if already populated
    const existingContent = await pack.getDocuments();
    if (existingContent.length > 0) {
      SWSELogger.log("SWSE | Lightsaber Form Powers compendium already has content, skipping");
      return 0;
    }

    SWSELogger.log("SWSE | Loading Lightsaber Form Powers from JSON...");

    let data;
    try {
      const response = await fetch('systems/foundryvtt-swse/data/lightsaber-form-powers.json');
      data = await response.json();
    } catch (err) {
      SWSELogger.error("SWSE | Failed to load lightsaber-form-powers.json:", err);
      return 0;
    }

    let created = 0;
    for (const power of data.powers) {
      try {
        // Build description with DC chart if available
        let description = `<p>${power.description}</p>`;

        if (power.trigger) {
          description += `<p><strong>Trigger:</strong> ${power.trigger}</p>`;
        }

        if (power.target) {
          description += `<p><strong>Target:</strong> ${power.target}</p>`;
        }

        if (power.dcChart && power.dcChart.length > 0) {
          description += '<h3>DC Chart</h3><ul>';
          for (const dc of power.dcChart) {
            description += `<li><strong>DC ${dc.dc}:</strong> ${dc.effect}</li>`;
          }
          description += '</ul>';
        }

        if (power.effect) {
          description += `<p>${power.effect}</p>`;
        }

        if (power.formBonus) {
          description += `<p><strong>Form Bonus:</strong> ${power.formBonus}</p>`;
        }

        if (power.special) {
          description += `<p><strong>Special:</strong> ${power.special}</p>`;
        }

        if (power.forcePointEffect) {
          description += `<p><strong>Force Point Effect:</strong> ${power.forcePointEffect}</p>`;
        }

        const itemData = {
          name: power.name,
          type: 'feat',
          system: {
            description: description,
            source: power.source || 'Jedi Academy Training Manual',
            tags: power.tags || ['lightsaber-form'],
            time: power.time || '',
            form: power.form || '',
            discipline: power.discipline || '',
            canRebuke: power.canRebuke || false
          },
          img: 'systems/foundryvtt-swse/assets/icons/lightsaber-form-power.png'
        };

        await pack.createDocument(itemData);
        created++;
      } catch (err) {
        SWSELogger.error(`SWSE | Failed to create Lightsaber Form Power: ${power.name}`, err);
      }
    }

    SWSELogger.log(`SWSE | Created ${created} Lightsaber Form Powers`);
    return created;
  }
}

// Make available globally for manual runs
Hooks.once('init', () => {
  if (!game.swse) game.swse = {};
  if (!game.swse.migrations) game.swse.migrations = {};
  game.swse.migrations.populateForceCompendiums = PopulateForceCompendiumsMigration.run.bind(PopulateForceCompendiumsMigration);
});

// Auto-run on ready
Hooks.once('ready', async () => {
  if (game.user.isGM) {
    try {
      await PopulateForceCompendiumsMigration.run();
    } catch (err) {
      SWSELogger.error("SWSE | Force compendiums population failed:", err);
      ui.notifications.error(`Force compendiums population failed: ${err.message || err}`, { permanent: true });
    }
  }
});

SWSELogger.log("SWSE | Force compendiums population script loaded. Manual run: await game.swse.migrations.populateForceCompendiums()");

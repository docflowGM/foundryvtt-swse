/**
 * PASSIVE/STATE Migration Script
 * Phase 7: Bulk migration utility for converting deferred PASSIVE items to PASSIVE/STATE
 *
 * Usage:
 *   node passive-state-migration.js --input-packs feats.db --output feats.db --migrate
 *   node passive-state-migration.js --input-packs feats.db --report migration-report.json
 *   node passive-state-migration.js --rollback feats.db.backup
 */

import fs from 'fs';
import path from 'path';

// ============================================
// CONFIGURATION
// ============================================

const PASSIVE_STATE_SCHEMA = {
  executionModel: "PASSIVE",
  subType: "STATE",
  description: "Migrated from deferred PASSIVE item via state-dependent predicates"
};

// ============================================
// MIGRATION ENGINE
// ============================================

class PassiveStateMigrationEngine {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose ?? false,
      dryRun: options.dryRun ?? true,
      backup: options.backup ?? true,
      ...options
    };

    this.report = {
      timestamp: new Date().toISOString(),
      status: 'pending',
      dryRun: this.options.dryRun,
      stats: {
        total: 0,
        migrated: 0,
        skipped: 0,
        deferred: 0,
        errored: 0
      },
      migrations: [],
      errors: [],
      deferred: []
    };
  }

  /**
   * Read a pack database file (JSON format)
   */
  readPackFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const items = content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
      return items;
    } catch (err) {
      throw new Error(`Failed to read pack file ${filePath}: ${err.message}`);
    }
  }

  /**
   * Write a pack database file (JSON format, one item per line)
   */
  writePackFile(filePath, items) {
    try {
      const content = items
        .map(item => JSON.stringify(item))
        .join('\n') + '\n';
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (err) {
      throw new Error(`Failed to write pack file ${filePath}: ${err.message}`);
    }
  }

  /**
   * Backup original pack file
   */
  backupPackFile(filePath) {
    const backupPath = `${filePath}.backup`;
    try {
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath);
        this.log(`✓ Backed up to ${backupPath}`);
        return backupPath;
      }
      this.log(`⚠ Backup already exists at ${backupPath}`);
      return backupPath;
    } catch (err) {
      throw new Error(`Failed to backup ${filePath}: ${err.message}`);
    }
  }

  /**
   * Determine if an ability should be migrated to PASSIVE/STATE
   */
  shouldMigrate(item) {
    // Must be PASSIVE with no subType (deferred)
    if (item.system?.executionModel !== 'PASSIVE') {
      return { should: false, reason: 'Not a PASSIVE ability' };
    }

    // Already migrated
    if (item.system?.subType === 'STATE') {
      return { should: false, reason: 'Already PASSIVE/STATE' };
    }

    // Already has a subType
    if (item.system?.subType) {
      return { should: false, reason: `Already ${item.system.subType}` };
    }

    // No effects defined
    if (!item.effects?.length) {
      return { should: false, reason: 'No effects defined' };
    }

    // All effects disabled with empty changes (deferred marker)
    const hasEmptyEffect = item.effects?.some(e =>
      e.disabled === true && (!e.changes || e.changes.length === 0)
    );

    if (!hasEmptyEffect) {
      return { should: false, reason: 'Already has active effects' };
    }

    return { should: true, reason: 'Deferred PASSIVE with empty effects' };
  }

  /**
   * Migrate a single item to PASSIVE/STATE
   */
  migrateItem(item, mappingInfo = {}) {
    const migrated = JSON.parse(JSON.stringify(item)); // Deep clone

    // Set schema
    migrated.system = migrated.system || {};
    migrated.system.executionModel = PASSIVE_STATE_SCHEMA.executionModel;
    migrated.system.subType = PASSIVE_STATE_SCHEMA.subType;

    // Initialize abilityMeta
    migrated.system.abilityMeta = migrated.system.abilityMeta || {};
    migrated.system.abilityMeta.modifiers = migrated.system.abilityMeta.modifiers || [];

    // Add mapping info if provided
    if (mappingInfo.predicates?.length) {
      migrated.system.abilityMeta.modifiers = [{
        target: mappingInfo.target || 'attack',
        value: mappingInfo.value || 0,
        type: 'untyped',
        predicates: mappingInfo.predicates,
        enabled: true,
        priority: 500,
        description: migrated.name
      }];
    } else {
      // Placeholder if no mapping provided
      migrated.system.abilityMeta.modifiers = [{
        target: 'attack',
        value: 0,
        type: 'untyped',
        predicates: [],
        enabled: false,
        priority: 500,
        description: `[PLACEHOLDER] ${migrated.name} - REQUIRES MANUAL PREDICATE DEFINITION`
      }];
    }

    // Disable old effects
    migrated.effects = migrated.effects?.map(e => ({
      ...e,
      disabled: true
    })) || [];

    // Add migration metadata
    migrated.flags = migrated.flags || {};
    migrated.flags.swse = migrated.flags.swse || {};
    migrated.flags.swse.migratedToState = true;
    migrated.flags.swse.migrationType = 'deferred-to-state-predicate';
    migrated.flags.swse.migrationDate = new Date().toISOString();
    migrated.flags.swse.mappingInfo = mappingInfo;

    return migrated;
  }

  /**
   * Process a pack file for migration
   */
  async processPack(packPath, mappingInfo = null) {
    this.log(`\n📦 Processing pack: ${packPath}`);

    // Read pack file
    const items = this.readPackFile(packPath);
    this.report.stats.total = items.length;
    this.log(`  Found ${items.length} items`);

    // Backup if not dry run
    if (!this.options.dryRun && this.options.backup) {
      await this.backupPackFile(packPath);
    }

    // Process each item
    const processed = items.map(item => {
      try {
        const check = this.shouldMigrate(item);

        if (!check.should) {
          this.report.stats.skipped++;
          return item; // Return unchanged
        }

        // Get mapping for this item if available
        const itemMapping = mappingInfo?.[item.name] || null;

        // Migrate the item
        const migrated = this.migrateItem(item, itemMapping);

        this.report.stats.migrated++;
        this.report.migrations.push({
          name: item.name,
          id: item._id,
          mapping: itemMapping,
          success: true
        });

        this.log(`  ✓ ${item.name} → PASSIVE/STATE`);

        return migrated;
      } catch (err) {
        this.report.stats.errored++;
        this.report.errors.push({
          itemName: item.name,
          error: err.message
        });
        this.log(`  ✗ ${item.name}: ${err.message}`);
        return item; // Return unchanged on error
      }
    });

    // Write pack file (if not dry run)
    if (!this.options.dryRun) {
      this.writePackFile(packPath, processed);
      this.log(`  ✓ Wrote ${processed.length} items to ${packPath}`);
    } else {
      this.log(`  [DRY RUN] Would write ${processed.length} items`);
    }

    return processed;
  }

  /**
   * Generate migration report
   */
  generateReport() {
    const totalDeferred = this.report.stats.skipped + this.report.stats.migrated;

    this.report.status = 'complete';
    this.report.summary = {
      deferred_identified: totalDeferred,
      deferred_migrated: this.report.stats.migrated,
      deferred_staying: this.report.stats.skipped,
      errors: this.report.stats.errored
    };

    return this.report;
  }

  /**
   * Write report to file
   */
  writeReport(filePath, report = null) {
    const reportData = report || this.report;
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), 'utf-8');
    this.log(`\n📊 Report written to ${filePath}`);
  }

  /**
   * Restore from backup
   */
  restoreFromBackup(backupPath, targetPath = null) {
    try {
      const restoredPath = targetPath || backupPath.replace('.backup', '');
      fs.copyFileSync(backupPath, restoredPath);
      this.log(`✓ Restored ${restoredPath} from backup`);
      return restoredPath;
    } catch (err) {
      throw new Error(`Failed to restore from backup: ${err.message}`);
    }
  }

  /**
   * Logging utility
   */
  log(message) {
    if (this.options.verbose || !message.startsWith('  ')) {
      console.log(message);
    }
  }
}

// ============================================
// CLI INTERFACE
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const options = {
    packs: null,
    output: null,
    report: null,
    rollback: null,
    migrate: false,
    dryRun: true,
    verbose: false
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input-packs':
        options.packs = args[++i]?.split(',').map(s => s.trim());
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--report':
        options.report = args[++i];
        break;
      case '--rollback':
        options.rollback = args[++i];
        break;
      case '--migrate':
        options.migrate = true;
        options.dryRun = false;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
    }
  }

  // Display usage
  if (!options.packs && !options.rollback) {
    console.log(`
PASSIVE/STATE Migration Script

Usage:
  node passive-state-migration.js --input-packs feats.db --report report.json
  node passive-state-migration.js --input-packs feats.db --output feats.db --migrate
  node passive-state-migration.js --rollback feats.db.backup

Options:
  --input-packs <files>    Comma-separated pack file paths (required)
  --output <path>          Output pack file path (default: overwrite input)
  --report <path>          Write migration report to JSON file
  --migrate                Execute migration (default is dry-run)
  --dry-run                Dry run mode (default)
  --rollback <path>        Restore from backup file
  --verbose                Verbose logging
    `);
    return;
  }

  // Handle rollback
  if (options.rollback) {
    const engine = new PassiveStateMigrationEngine(options);
    const restored = engine.restoreFromBackup(options.rollback);
    console.log(`\nRollback complete: ${restored}`);
    return;
  }

  // Process packs
  try {
    const engine = new PassiveStateMigrationEngine(options);

    console.log(`
╔════════════════════════════════════════════╗
║  PASSIVE/STATE Migration Engine (Phase 7)  ║
╠════════════════════════════════════════════╝
`);

    console.log(options.dryRun ? '📋 DRY RUN MODE' : '⚡ MIGRATION MODE');
    console.log();

    for (const packPath of options.packs) {
      await engine.processPack(packPath);
    }

    const report = engine.generateReport();

    console.log(`
╔════════════════════════════════════════════╗
║               MIGRATION SUMMARY             ║
╠════════════════════════════════════════════╝

Total items processed:     ${report.stats.total}
✓ Migrated to PASSIVE/STATE: ${report.stats.migrated}
⊗ Staying deferred:         ${report.stats.skipped}
✗ Errors:                   ${report.stats.errored}
`);

    // Write report if requested
    if (options.report) {
      engine.writeReport(options.report);
    }

    console.log(`✓ Migration ${options.dryRun ? 'preview' : 'complete'}\n`);
  } catch (err) {
    console.error(`\n✗ Error: ${err.message}\n`);
    process.exit(1);
  }
}

main();

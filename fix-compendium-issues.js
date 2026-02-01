#!/usr/bin/env node

/**
 * Compendium Talent Tree Fixer
 * Fixes 53 identified issues in talents.db:
 * - 2 missing tree assignments
 * - 17 wrong tree assignments
 * - 23 case/formatting mismatches
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// File paths
const TALENTS_FILE = '/home/user/foundryvtt-swse/packs/talents.db';
const TREES_FILE = '/home/user/foundryvtt-swse/packs/talent_trees.db';
const BACKUP_FILE = '/home/user/foundryvtt-swse/packs/talents.db.backup';

// Define the 17 wrong tree assignments
const WRONG_TREE_ASSIGNMENTS = {
  'a3ac90e84127805d': { name: 'Ambush', toTree: 'Republic Commando' },
  'c5996de1e3c69c04': { name: 'Ambush (Republic Commando)', toTree: 'Commando' },
  '4fc3fe4c1e7f9ba0': { name: 'Armor Mastery', toTree: "Knight's Armor" },
  '97a771d1f4627521': { name: 'Dark Side Bane', toTree: 'Dark Side' },
  '2e96f06be6b9def8': { name: 'Dark Side Scourge', toTree: 'Dark Side' },
  '3331d4b2b88e446f': { name: 'Resist the Dark Side', toTree: 'Dark Side' },
  '3cc9552cfab59676': { name: 'Embrace Dark Side', toTree: 'Dark Side' },
  '181da7f36b9fba9d': { name: 'Force Treatment', toTree: 'Jedi Healer' },
  '893158dcfe246ad7': { name: 'Implant (general)', toTree: 'Implant' },
  '24bf81bc6d74fafd': { name: 'Keep Them Reeling', toTree: 'Piracy' },
  '9211e3f6268b3413': { name: 'Keep it Together', toTree: 'Expert Pilot' },
  '6021056231839e7c': { name: 'Multiattack Proficiency (advanced melee)', toTree: 'Melee Duelist' },
  '5ec84c7e500601e4': { name: 'Multiattack Proficiency (rifles)', toTree: 'Carbineer' },
  'adfb725d20faade5': { name: 'Ruthless', toTree: 'Assassin' },
  '8a6fc1f368226b7b': { name: 'Sith Alchemy (create)', toTree: 'Dark Side' },
  'c980750800b91061': { name: 'Stay in the Fight', toTree: 'Rebel Recruiter' },
  '41426ecd7fade0b0': { name: 'Weapon Specialization', toTree: 'Lightsaber Combat' } // Keep current assignment as Soldier Combat doesn't exist
};

// Define the 2 missing trees (already seem to exist in database, but track them)
const MISSING_TREES = {
  '222327492c484b4a': { name: 'Teräs Käsi Basics', treeName: 'Master of Teräs Käsi', treeId: 'f96cb0f2a46b4dd1' },
  '379019c29b37d717': { name: 'Unarmed Parry', treeName: 'Master of Teräs Käsi', treeId: 'f96cb0f2a46b4dd1' }
};

// Case/formatting mismatches - tree name standardization
const TREE_NAME_CORRECTIONS = {
  'light side': 'Light Side',
  'dark side': 'Dark Side',
  'jedi guardian': 'Jedi Guardian',
  'jedi sentinel': 'Jedi Sentinel',
  'jedi consular': 'Jedi Consular',
  'sith lord': 'Sith Lord',
  'sith pureblood': 'Sith Pureblood',
  'soldier': 'Soldier',
  'commando': 'Commando',
  'scoundrel': 'Scoundrel',
  'force adept': 'Force Adept',
  'noble': 'Noble',
  'officer': 'Officer'
};

class CompendiumFixer {
  constructor() {
    this.talents = new Map();
    this.trees = new Map();
    this.fixes = [];
    this.summary = {
      missingTreesRestored: 0,
      wrongAssignmentFixed: 0,
      formattingCorrected: 0,
      totalFixed: 0
    };
  }

  /**
   * Read JSONL file and parse each line
   */
  async readJsonLFile(filePath) {
    const results = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          results.push(JSON.parse(line));
        } catch (e) {
          console.error(`Error parsing line in ${filePath}:`, e.message);
        }
      }
    }
    return results;
  }

  /**
   * Load talent trees and build ID to name mapping
   */
  async loadTrees() {
    console.log('Loading talent trees...');
    const treeRecords = await this.readJsonLFile(TREES_FILE);

    treeRecords.forEach(tree => {
      const treeName = tree.system?.talent_tree || tree.name;
      const treeId = tree._id;
      this.trees.set(treeId, {
        _id: treeId,
        name: treeName,
        talentIds: tree.system?.talentIds || []
      });
    });

    console.log(`Loaded ${this.trees.size} talent trees`);

    // Debug: Log some trees
    let count = 0;
    for (const [id, tree] of this.trees) {
      if (count < 5) {
        console.log(`  - ${tree.name} (${id})`);
        count++;
      }
    }
  }

  /**
   * Load talents and build ID to talent mapping
   */
  async loadTalents() {
    console.log('Loading talents...');
    const talentRecords = await this.readJsonLFile(TALENTS_FILE);

    talentRecords.forEach(talent => {
      const talentId = talent._id;
      const talentName = talent.name;
      const treeName = talent.system?.tree || talent.system?.talent_tree;
      const treeId = talent.system?.treeId;

      this.talents.set(talentId, {
        _id: talentId,
        name: talentName,
        tree: treeName,
        treeId: treeId,
        original: talent
      });
    });

    console.log(`Loaded ${this.talents.size} talents`);
  }

  /**
   * Find correct tree ID by name
   */
  findTreeIdByName(treeName) {
    for (const [id, tree] of this.trees) {
      if (tree.name.toLowerCase() === treeName.toLowerCase()) {
        return id;
      }
    }
    return null;
  }

  /**
   * Find correct tree name by ID
   */
  findTreeNameById(treeId) {
    return this.trees.get(treeId)?.name || null;
  }

  /**
   * Log a fix result
   */
  logFix(talentId, talentName, oldTreeId, oldTreeName, newTreeId, newTreeName, status) {
    const fix = {
      talentId,
      talentName,
      oldTreeId,
      oldTreeName,
      newTreeId,
      newTreeName,
      status
    };
    this.fixes.push(fix);

    console.log(`[${status}] ${talentName} (${talentId})`);
    console.log(`  FROM: ${oldTreeName} (${oldTreeId})`);
    console.log(`  TO:   ${newTreeName} (${newTreeId})`);
  }

  /**
   * Fix missing tree assignments
   */
  fixMissingTrees() {
    console.log('\n=== FIXING MISSING TREES (2) ===');
    let fixed = 0;

    for (const [talentId, config] of Object.entries(MISSING_TREES)) {
      const talent = this.talents.get(talentId);
      if (!talent) {
        console.log(`[SKIPPED] Talent ${talentId} not found`);
        continue;
      }

      // Check if tree assignment already correct
      if (talent.treeId === config.treeId &&
          talent.tree === config.treeName) {
        console.log(`[OK] ${config.name} already correctly assigned`);
        continue;
      }

      const oldTreeId = talent.treeId;
      const oldTreeName = talent.tree;

      talent.tree = config.treeName;
      talent.treeId = config.treeId;

      this.logFix(talentId, config.name, oldTreeId, oldTreeName,
                  config.treeId, config.treeName, 'SUCCESS');

      fixed++;
      this.summary.missingTreesRestored++;
      this.summary.totalFixed++;
    }

    console.log(`Fixed ${fixed} missing tree assignments\n`);
  }

  /**
   * Fix wrong tree assignments
   */
  fixWrongTreeAssignments() {
    console.log('=== FIXING WRONG TREE ASSIGNMENTS (17) ===');
    let fixed = 0;

    for (const [talentId, config] of Object.entries(WRONG_TREE_ASSIGNMENTS)) {
      const talent = this.talents.get(talentId);
      if (!talent) {
        console.log(`[SKIPPED] Talent ${talentId} not found`);
        continue;
      }

      // Find the target tree ID by name
      const targetTreeId = this.findTreeIdByName(config.toTree);
      if (!targetTreeId) {
        console.log(`[FAILED] ${config.name} - Cannot find target tree "${config.toTree}"`);
        this.logFix(talentId, config.name, talent.treeId, talent.tree,
                   '', config.toTree, 'FAILED');
        continue;
      }

      const oldTreeId = talent.treeId;
      const oldTreeName = talent.tree;

      talent.tree = config.toTree;
      talent.treeId = targetTreeId;

      this.logFix(talentId, config.name, oldTreeId, oldTreeName,
                 targetTreeId, config.toTree, 'SUCCESS');

      fixed++;
      this.summary.wrongAssignmentFixed++;
      this.summary.totalFixed++;
    }

    console.log(`Fixed ${fixed} wrong tree assignments\n`);
  }

  /**
   * Fix case and formatting mismatches
   */
  fixFormattingMismatches() {
    console.log('=== FIXING CASE/FORMATTING MISMATCHES ===');
    let fixed = 0;
    let checked = 0;

    this.talents.forEach((talent, talentId) => {
      if (!talent.tree || !talent.treeId) return;

      checked++;
      // Find the canonical tree name from database
      const canonicalTreeName = this.findTreeNameById(talent.treeId);

      if (!canonicalTreeName) return;

      // Check if tree name doesn't match canonical (case-sensitive comparison)
      if (talent.tree !== canonicalTreeName) {
        const oldTreeName = talent.tree;
        const oldTreeId = talent.treeId;

        talent.tree = canonicalTreeName;

        this.logFix(talentId, talent.name, oldTreeId, oldTreeName,
                   talent.treeId, canonicalTreeName, 'SUCCESS');

        fixed++;
        this.summary.formattingCorrected++;
        this.summary.totalFixed++;
      }
    });

    console.log(`Checked ${checked} talents, fixed ${fixed} case/formatting mismatches\n`);
  }

  /**
   * Apply all fixes
   */
  async applyFixes() {
    await this.loadTrees();
    await this.loadTalents();

    this.fixMissingTrees();
    this.fixWrongTreeAssignments();
    this.fixFormattingMismatches();
  }

  /**
   * Save fixed talents back to file
   */
  async saveTalents() {
    console.log('Saving fixed talents...');

    // Create backup of original file
    if (fs.existsSync(TALENTS_FILE)) {
      fs.copyFileSync(TALENTS_FILE, BACKUP_FILE);
      console.log(`Created backup: ${BACKUP_FILE}`);
    }

    // Read original file to preserve non-talent entries
    const originalLines = fs.readFileSync(TALENTS_FILE, 'utf8').split('\n');
    const outputLines = [];

    // Process each line and update talents
    for (const line of originalLines) {
      if (!line.trim()) {
        outputLines.push(line);
        continue;
      }

      try {
        const record = JSON.parse(line);
        const talentId = record._id;

        if (this.talents.has(talentId)) {
          const talent = this.talents.get(talentId);
          // Update the original record with new tree info
          record.system.tree = talent.tree;
          record.system.treeId = talent.treeId;
          record.system.talent_tree = talent.tree;
          outputLines.push(JSON.stringify(record));
        } else {
          outputLines.push(line);
        }
      } catch (e) {
        outputLines.push(line);
      }
    }

    fs.writeFileSync(TALENTS_FILE, outputLines.join('\n'));
    console.log(`Wrote fixed talents to: ${TALENTS_FILE}`);
  }

  /**
   * Print summary report
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('COMPENDIUM FIX SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total fixed: ${this.summary.totalFixed}/53`);
    console.log(`  - Missing trees restored: ${this.summary.missingTreesRestored}/2`);
    console.log(`  - Wrong assignments fixed: ${this.summary.wrongAssignmentFixed}/17`);
    console.log(`  - Formatting corrected: ${this.summary.formattingCorrected}/23 (as found)`);
    console.log('='.repeat(60));

    if (this.fixes.length > 0) {
      console.log('\nFIXES APPLIED:');
      console.log('-'.repeat(60));
      this.fixes.forEach((fix, idx) => {
        console.log(`${idx + 1}. ${fix.talentName}`);
        console.log(`   ID: ${fix.talentId}`);
        console.log(`   ${fix.oldTreeName} (${fix.oldTreeId}) -> ${fix.newTreeName} (${fix.newTreeId})`);
        console.log(`   Status: ${fix.status}`);
      });
    }
  }

  /**
   * Save detailed report to file
   */
  async saveReport() {
    const reportPath = '/home/user/foundryvtt-swse/compendium-fix-report.json';
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.summary,
      fixes: this.fixes,
      backup: BACKUP_FILE
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);
  }

  /**
   * Run the complete fix process
   */
  async run() {
    try {
      console.log('Starting Compendium Talent Tree Fixer...\n');

      await this.applyFixes();
      await this.saveTalents();
      this.printSummary();
      await this.saveReport();

      console.log('\nCompendium fix complete!');
    } catch (error) {
      console.error('Error during fix process:', error);
      process.exit(1);
    }
  }
}

// Run the fixer
const fixer = new CompendiumFixer();
fixer.run();

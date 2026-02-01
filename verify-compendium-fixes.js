#!/usr/bin/env node

/**
 * Compendium Fixes Verifier
 * Verifies that all talent tree assignments are correct
 */

import fs from 'fs';
import readline from 'readline';

const TALENTS_FILE = '/home/user/foundryvtt-swse/packs/talents.db';
const TREES_FILE = '/home/user/foundryvtt-swse/packs/talent_trees.db';

// Expected correct assignments
const EXPECTED_ASSIGNMENTS = {
  'a3ac90e84127805d': { name: 'Ambush', expectedTree: 'Republic Commando', expectedId: 'cb3751283ea8fa3d' },
  'c5996de1e3c69c04': { name: 'Ambush (Republic Commando)', expectedTree: 'Commando', expectedId: '798ed0945cbdac1c' },
  '4fc3fe4c1e7f9ba0': { name: 'Armor Mastery', expectedTree: "Knight's Armor", expectedId: 'ea01d740c91888b3' },
  '97a771d1f4627521': { name: 'Dark Side Bane', expectedTree: 'Dark Side', expectedId: 'de95d37c72b1c4cd' },
  '2e96f06be6b9def8': { name: 'Dark Side Scourge', expectedTree: 'Dark Side', expectedId: 'de95d37c72b1c4cd' },
  '3331d4b2b88e446f': { name: 'Resist the Dark Side', expectedTree: 'Dark Side', expectedId: 'de95d37c72b1c4cd' },
  '3cc9552cfab59676': { name: 'Embrace Dark Side', expectedTree: 'Dark Side', expectedId: 'de95d37c72b1c4cd' },
  '181da7f36b9fba9d': { name: 'Force Treatment', expectedTree: 'Jedi Healer', expectedId: 'a2a7a376e4905da9' },
  '893158dcfe246ad7': { name: 'Implant (general)', expectedTree: 'Implant', expectedId: 'd8a71a6c5b2b7581' },
  '24bf81bc6d74fafd': { name: 'Keep Them Reeling', expectedTree: 'Piracy', expectedId: '61db5e2c0c44ef67' },
  '9211e3f6268b3413': { name: 'Keep it Together', expectedTree: 'Expert Pilot', expectedId: 'b17c1515c06361d6' },
  '6021056231839e7c': { name: 'Multiattack Proficiency (advanced melee)', expectedTree: 'Melee Duelist', expectedId: '1381bb8c9a838279' },
  '5ec84c7e500601e4': { name: 'Multiattack Proficiency (rifles)', expectedTree: 'Carbineer', expectedId: '1933731cc59f8463' },
  'adfb725d20faade5': { name: 'Ruthless', expectedTree: 'Assassin', expectedId: '186daeee7bd65a69' },
  '8a6fc1f368226b7b': { name: 'Sith Alchemy (create)', expectedTree: 'Dark Side', expectedId: 'de95d37c72b1c4cd' },
  'c980750800b91061': { name: 'Stay in the Fight', expectedTree: 'Rebel Recruiter', expectedId: 'a2c6962521c29361' },
  '41426ecd7fade0b0': { name: 'Weapon Specialization', expectedTree: 'Lightsaber Combat', expectedId: '2359c05ff13f3feb' }
};

class VerificationTool {
  constructor() {
    this.talents = new Map();
    this.trees = new Map();
    this.results = {
      correct: [],
      incorrect: [],
      missing: []
    };
  }

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
          // Silently skip malformed lines
        }
      }
    }
    return results;
  }

  async loadData() {
    console.log('Loading database files...\n');

    const treeRecords = await this.readJsonLFile(TREES_FILE);
    treeRecords.forEach(tree => {
      const treeName = tree.system?.talent_tree || tree.name;
      this.trees.set(tree._id, treeName);
    });

    const talentRecords = await this.readJsonLFile(TALENTS_FILE);
    talentRecords.forEach(talent => {
      this.talents.set(talent._id, {
        name: talent.name,
        tree: talent.system?.tree || talent.system?.talent_tree,
        treeId: talent.system?.treeId
      });
    });

    console.log(`Loaded ${this.trees.size} trees and ${this.talents.size} talents\n`);
  }

  verifyFixtures() {
    console.log('Verifying compendium fixes...\n');

    for (const [talentId, expected] of Object.entries(EXPECTED_ASSIGNMENTS)) {
      const talent = this.talents.get(talentId);

      if (!talent) {
        this.results.missing.push({
          id: talentId,
          name: expected.name,
          reason: 'Talent not found in database'
        });
        continue;
      }

      if (talent.tree === expected.expectedTree && talent.treeId === expected.expectedId) {
        this.results.correct.push({
          id: talentId,
          name: expected.name,
          tree: talent.tree,
          treeId: talent.treeId
        });
      } else {
        this.results.incorrect.push({
          id: talentId,
          name: expected.name,
          expectedTree: expected.expectedTree,
          expectedId: expected.expectedId,
          actualTree: talent.tree,
          actualId: talent.treeId
        });
      }
    }
  }

  printResults() {
    console.log('='.repeat(70));
    console.log('VERIFICATION RESULTS');
    console.log('='.repeat(70));

    if (this.results.correct.length > 0) {
      console.log(`\n✓ CORRECT (${this.results.correct.length}/17):`);
      this.results.correct.forEach(item => {
        console.log(`  ${item.name}`);
        console.log(`    Tree: ${item.tree} (${item.treeId})`);
      });
    }

    if (this.results.incorrect.length > 0) {
      console.log(`\n✗ INCORRECT (${this.results.incorrect.length}/17):`);
      this.results.incorrect.forEach(item => {
        console.log(`  ${item.name}`);
        console.log(`    Expected: ${item.expectedTree} (${item.expectedId})`);
        console.log(`    Actual:   ${item.actualTree} (${item.actualId})`);
      });
    }

    if (this.results.missing.length > 0) {
      console.log(`\n⚠ MISSING (${this.results.missing.length}/17):`);
      this.results.missing.forEach(item => {
        console.log(`  ${item.name} (${item.id})`);
        console.log(`    ${item.reason}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Correct assignments: ${this.results.correct.length}/17`);
    console.log(`Incorrect assignments: ${this.results.incorrect.length}/17`);
    console.log(`Missing talents: ${this.results.missing.length}/17`);
    console.log(`Status: ${this.results.correct.length === 17 ? '✓ ALL FIXES VERIFIED' : '✗ FIXES INCOMPLETE'}`);
    console.log('='.repeat(70));
  }

  async run() {
    try {
      await this.loadData();
      this.verifyFixtures();
      this.printResults();
    } catch (error) {
      console.error('Error during verification:', error);
      process.exit(1);
    }
  }
}

const verifier = new VerificationTool();
verifier.run();

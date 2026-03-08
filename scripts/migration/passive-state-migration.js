#!/usr/bin/env node

/**
 * PASSIVE/STATE Bulk Migration Script (Phase 9)
 * Smart pattern matching for automatic predicate detection
 */

import fs from 'fs';
import path from 'path';

const PREDICATE_PATTERNS = {
  'defense.against-ranged': [/against ranged/i, /vs\.?\s*ranged/i, /defense.*ranged/i],
  'defense.against-melee': [/against melee/i, /vs\.?\s*melee/i, /defense.*melee/i],
  'defense.reflex': [/reflex defense/i, /reflex\s+dc/i],
  'defense.fortitude': [/fortitude defense/i, /fortitude\s+dc/i],
  'defense.will': [/will defense/i, /will\s+dc/i],
  'attack.when-hit': [/when.*hit/i, /on.*hit/i, /upon hitting/i],
  'attack.with-melee': [/melee.*attack/i, /with melee/i],
  'attack.with-ranged': [/ranged.*attack/i, /with.*ranged/i],
  'movement.while-moving': [/while moving/i, /you move/i, /during movement/i, /at least.*square/i],
  'proximity.ally-nearby': [/within.*square.*ally/i, /adjacent.*ally/i, /near.*ally/i],
  'proximity.count-allies-within-12': [/for each ally/i, /per ally/i],
  'turn.on-current-turn': [/on your turn/i, /during your turn/i, /on your next turn/i],
  'turn.once-per-round': [/once per round/i, /once per encounter/i],
  'target.is-flanked': [/flanked/i, /when.*flanked/i],
  'target.is-prone': [/prone/i, /when.*prone/i],
  'target.is-stunned': [/stunned/i, /when.*stunned/i]
};

class PassiveStateMigrationEngine {
  constructor(opts = {}) {
    this.verbose = opts.verbose ?? false;
    this.dryRun = opts.dryRun ?? true;
    this.report = {
      timestamp: new Date().toISOString(),
      stats: { total: 0, migrated: 0, skipped: 0, errors: 0 },
      migrations: []
    };
  }

  detectPredicates(item) {
    const text = `${item.system?.benefit || ''} ${item.system?.description?.value || ''}`.toLowerCase();
    const predicates = [];
    for (const [pred, patterns] of Object.entries(PREDICATE_PATTERNS)) {
      if (patterns.some(p => p.test(text))) {
        predicates.push(pred);
      }
    }
    return [...new Set(predicates)];
  }

  inferModifierInfo(item, predicates) {
    const benefit = (item.system?.benefit || '').toLowerCase();
    let target = 'attack';
    let value = 2;
    const bonusMatch = benefit.match(/\+(\d+)/);
    if (bonusMatch) value = parseInt(bonusMatch[1]);
    if (benefit.includes('defense') || benefit.includes('dc')) {
      target = benefit.includes('reflex') ? 'defense.reflex' :
               benefit.includes('fortitude') ? 'defense.fortitude' :
               benefit.includes('will') ? 'defense.will' : 'defense';
    } else if (benefit.includes('skill') || benefit.includes('check')) {
      target = 'skill';
    }
    return { target, value };
  }

  readPack(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
  }

  writePack(filePath, items) {
    fs.writeFileSync(filePath, items.map(i => JSON.stringify(i)).join('\n') + '\n');
  }

  shouldMigrate(item) {
    if (item.system?.executionModel) return false;
    if (!['feat', 'talent', 'species-trait'].includes(item.type)) return false;
    if (!item.system?.benefit && !item.system?.description?.value) return false;
    return true;
  }

  migrateItem(item) {
    const migrated = JSON.parse(JSON.stringify(item));
    const predicates = this.detectPredicates(item);
    const { target, value } = this.inferModifierInfo(item, predicates);

    migrated.system.executionModel = 'PASSIVE';
    migrated.system.subType = 'STATE';
    migrated.system.abilityMeta = {
      modifiers: predicates.length > 0 ? [{
        target, value,
        type: 'untyped',
        predicates,
        enabled: true,
        priority: 500,
        description: item.name
      }] : [{
        target: 'attack', value: 0,
        type: 'untyped',
        predicates: [],
        enabled: false,
        priority: 500,
        description: `[REQUIRES MANUAL MAPPING] ${item.name}`
      }]
    };

    migrated.flags = migrated.flags || {};
    migrated.flags.swse = migrated.flags.swse || {};
    migrated.flags.swse.migratedToState = true;
    migrated.flags.swse.migrationDate = new Date().toISOString();
    migrated.flags.swse.detectedPredicates = predicates;

    return migrated;
  }

  async processPack(filePath) {
    const packName = path.basename(filePath);
    console.log(`\n📦 ${packName}`);

    const items = this.readPack(filePath);
    let migrated = 0, skipped = 0;

    const processed = items.map(item => {
      if (!this.shouldMigrate(item)) {
        skipped++;
        return item;
      }
      migrated++;
      const result = this.migrateItem(item);
      if (this.verbose) {
        console.log(`  ✓ ${item.name}`);
      }
      return result;
    });

    if (!this.dryRun) {
      this.writePack(filePath, processed);
    }

    console.log(`  ${migrated} migrated, ${skipped} skipped`);
    this.report.stats.total += items.length;
    this.report.stats.migrated += migrated;
    this.report.stats.skipped += skipped;
  }
}

async function main() {
  const args = process.argv.slice(2);
  let packs = null, report = null, migrate = false, verbose = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input-packs') packs = args[++i]?.split(',').map(s => s.trim());
    if (args[i] === '--report') report = args[++i];
    if (args[i] === '--migrate') migrate = true;
    if (args[i] === '--verbose') verbose = true;
  }

  if (!packs) {
    console.log('Usage: --input-packs <files> [--report <file>] [--migrate] [--verbose]');
    return;
  }

  const engine = new PassiveStateMigrationEngine({ dryRun: !migrate, verbose });

  console.log(`\n╔════════════════════════════════════════╗\n║  PASSIVE/STATE Bulk Migration (Phase 9) ║\n╚════════════════════════════════════════╝\n${migrate ? '⚡ LIVE MODE' : '📋 DRY RUN MODE'}\n`);

  for (const pack of packs) {
    const fullPath = pack.startsWith('/') ? pack : `/home/user/foundryvtt-swse/packs/${pack}`;
    await engine.processPack(fullPath);
  }

  const stats = engine.report.stats;
  console.log(`\n╔════════════════════════════════════════╗\n║          MIGRATION SUMMARY              ║\n╠════════════════════════════════════════╝\nTotal:     ${stats.total}\nMigrated:  ${stats.migrated}\nSkipped:   ${stats.skipped}\n`);

  if (report) {
    fs.writeFileSync(report, JSON.stringify(engine.report, null, 2));
    console.log(`📊 Report: ${report}`);
  }

  console.log(`✓ ${migrate ? 'Migration complete' : 'Preview complete'}\n`);
}

main();

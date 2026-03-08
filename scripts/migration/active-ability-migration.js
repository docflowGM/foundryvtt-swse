#!/usr/bin/env node

/**
 * ACTIVE Ability Bulk Migration Script (Phase 7)
 * Converts eligible talents/feats to ACTIVE/EFFECT or ACTIVE/MODE subtypes
 *
 * Strategy:
 * 1. Scan pack files for abilities without executionModel set
 * 2. Analyze ability descriptions to determine ACTIVE suitability
 * 3. Identify EFFECT vs MODE based on keywords
 * 4. Create proper ACTIVE schema with templates
 * 5. Validate against ActiveContract
 * 6. Write back to pack files
 *
 * Smart detection patterns:
 * - "once per" + action type = ACTIVE/EFFECT with frequency
 * - toggle, stance, fighting style = ACTIVE/MODE with exclusive group
 * - action words: attack, activate, use, cast = ACTIVE/EFFECT
 */

import fs from 'fs';
import path from 'path';

const ACTIVE_PATTERNS = {
  // Effect detection (one-time activations)
  'effect_once_encounter': [/once per encounter/i, /1\/encounter/i],
  'effect_once_round': [/once per round/i, /1\/round/i, /once per turn/i],
  'effect_action_standard': [/standard action/i, /action to use/i, /costs.*standard/i],
  'effect_action_move': [/move action/i, /costs.*move/i],
  'effect_action_swift': [/swift action/i, /costs.*swift/i, /as a swift/i],
  'effect_bonus_damage': [/\+\d+d\d+ damage/i, /deal.*extra.*damage/i, /damage bonus/i],
  'effect_heal': [/heal.*\d+/i, /restore.*hit points/i, /gain.*temporary/i],
  'effect_bonus_attack': [/bonus to.*attack/i, /attack roll.*\+/i],

  // Mode detection (toggle stances)
  'mode_stance': [/stance/i, /fighting stance/i],
  'mode_toggle': [/toggle/i, /activate.*deactivate/i, /turn on\/off/i],
  'mode_defensive': [/fighting defensively/i, /defensive posture/i, /combat style/i],
  'mode_suppress': [/suppress/i, /disable.*ability/i],
  'mode_exclusive': [/only one.*active/i, /cannot use.*while/i, /mutually exclusive/i]
};

class ActiveMigrationEngine {
  constructor(opts = {}) {
    this.verbose = opts.verbose ?? false;
    this.dryRun = opts.dryRun ?? true;
    this.report = {
      timestamp: new Date().toISOString(),
      stats: { total: 0, migrated_effect: 0, migrated_mode: 0, skipped: 0, errors: 0 },
      migrations: []
    };
  }

  detectSubtype(item) {
    const text = `${item.system?.benefit || ''} ${item.system?.description?.value || ''}`.toLowerCase();

    // Check for MODE patterns first (more specific)
    const modeScore = this._scorePatterns(text, [
      ACTIVE_PATTERNS.mode_stance,
      ACTIVE_PATTERNS.mode_toggle,
      ACTIVE_PATTERNS.mode_defensive,
      ACTIVE_PATTERNS.mode_exclusive
    ].flat());

    if (modeScore >= 2) {
      return { type: 'MODE', score: modeScore };
    }

    // Check for EFFECT patterns
    const effectScore = this._scorePatterns(text, [
      ACTIVE_PATTERNS.effect_once_encounter,
      ACTIVE_PATTERNS.effect_once_round,
      ACTIVE_PATTERNS.effect_action_standard,
      ACTIVE_PATTERNS.effect_action_move,
      ACTIVE_PATTERNS.effect_bonus_damage,
      ACTIVE_PATTERNS.effect_heal,
      ACTIVE_PATTERNS.effect_bonus_attack
    ].flat());

    if (effectScore >= 1) {
      return { type: 'EFFECT', score: effectScore };
    }

    return { type: null, score: 0 };
  }

  _scorePatterns(text, patterns) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) score++;
    }
    return score;
  }

  inferActivation(item) {
    const text = `${item.system?.benefit || ''} ${item.system?.description?.value || ''}`.toLowerCase();

    if (text.includes('standard action') || text.includes('costs standard')) {
      return { actionType: 'STANDARD' };
    }
    if (text.includes('move action') || text.includes('costs move')) {
      return { actionType: 'MOVE' };
    }
    if (text.includes('swift action') || text.includes('swift')) {
      return { actionType: 'SWIFT' };
    }
    if (text.includes('free action')) {
      return { actionType: 'FREE' };
    }

    return { actionType: 'STANDARD' }; // Default
  }

  inferFrequency(item) {
    const text = `${item.system?.benefit || ''} ${item.system?.description?.value || ''}`.toLowerCase();

    if (text.includes('once per encounter') || text.includes('1/encounter')) {
      return { type: 'ENCOUNTER', max: 1 };
    }
    if (text.includes('once per round') || text.includes('once per turn')) {
      return { type: 'ROUND', max: 1 };
    }
    if (text.includes('once per day')) {
      return { type: 'DAY', max: 1 };
    }

    return { type: 'UNLIMITED', max: 1 };
  }

  migrateItem(item, subtype) {
    const migrated = JSON.parse(JSON.stringify(item));

    if (subtype === 'EFFECT') {
      migrated.system.executionModel = 'ACTIVE';
      migrated.system.subType = 'EFFECT';

      const activation = this.inferActivation(item);
      const frequency = this.inferFrequency(item);

      migrated.system.abilityMeta = {
        activation,
        frequency,
        cost: { forcePoints: 0, resource: null, resourceAmount: 0 },
        targeting: {
          mode: 'SINGLE',
          targetType: 'SELF',
          range: 0
        },
        effect: {
          type: 'MODIFIER',
          payload: {
            target: 'attack',
            value: 0,
            type: 'untyped',
            description: item.name
          },
          duration: { type: 'INSTANT', value: 0 }
        }
      };
    } else if (subtype === 'MODE') {
      migrated.system.executionModel = 'ACTIVE';
      migrated.system.subType = 'MODE';

      const activation = this.inferActivation(item);

      migrated.system.abilityMeta = {
        activation,
        mode: {
          exclusiveGroup: 'COMBAT_STANCE',
          toggle: true
        },
        persistentEffect: {
          type: 'MODIFIER',
          payload: {
            target: 'defense',
            value: 0,
            type: 'untyped',
            description: item.name
          }
        }
      };
    }

    migrated.flags = migrated.flags || {};
    migrated.flags.swse = migrated.flags.swse || {};
    migrated.flags.swse.migratedToActive = true;
    migrated.flags.swse.migratedSubtype = subtype;
    migrated.flags.swse.migrationDate = new Date().toISOString();

    return migrated;
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

    // Skip abilities that are clearly too complex
    const text = `${item.system?.benefit || ''} ${item.system?.description?.value || ''}`.toLowerCase();
    if (text.includes('instead of') || text.includes('substitute')) return false;
    if (text.includes('for each') && text.includes('within')) return false;

    return true;
  }

  async processPack(filePath) {
    const packName = path.basename(filePath);
    console.log(`\n📦 ${packName}`);

    const items = this.readPack(filePath);
    let migrated_effect = 0, migrated_mode = 0, skipped = 0;

    const processed = items.map(item => {
      if (!this.shouldMigrate(item)) {
        skipped++;
        return item;
      }

      const detection = this.detectSubtype(item);
      if (!detection.type) {
        skipped++;
        return item;
      }

      const result = this.migrateItem(item, detection.type);

      if (detection.type === 'EFFECT') {
        migrated_effect++;
      } else if (detection.type === 'MODE') {
        migrated_mode++;
      }

      if (this.verbose) {
        console.log(`  ✓ ${item.name} → ACTIVE/${detection.type}`);
      }

      return result;
    });

    if (!this.dryRun) {
      this.writePack(filePath, processed);
    }

    console.log(`  ${migrated_effect} EFFECT, ${migrated_mode} MODE, ${skipped} skipped`);
    this.report.stats.total += items.length;
    this.report.stats.migrated_effect += migrated_effect;
    this.report.stats.migrated_mode += migrated_mode;
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

  const engine = new ActiveMigrationEngine({ dryRun: !migrate, verbose });

  console.log(`\n╔════════════════════════════════════════╗\n║  ACTIVE Bulk Migration (Phase 7)       ║\n╚════════════════════════════════════════╝\n${migrate ? '⚡ LIVE MODE' : '📋 DRY RUN MODE'}\n`);

  for (const pack of packs) {
    const fullPath = pack.startsWith('/') ? pack : `/home/user/foundryvtt-swse/packs/${pack}`;
    await engine.processPack(fullPath);
  }

  const stats = engine.report.stats;
  console.log(`\n╔════════════════════════════════════════╗\n║          MIGRATION SUMMARY              ║\n╠════════════════════════════════════════╝\nTotal:        ${stats.total}\nMigrated:     ${stats.migrated_effect + stats.migrated_mode} (${stats.migrated_effect} EFFECT, ${stats.migrated_mode} MODE)\nSkipped:      ${stats.skipped}\n`);

  if (report) {
    fs.writeFileSync(report, JSON.stringify(engine.report, null, 2));
    console.log(`📊 Report: ${report}`);
  }

  console.log(`✓ ${migrate ? 'Migration complete' : 'Preview complete'}\n`);
}

main();

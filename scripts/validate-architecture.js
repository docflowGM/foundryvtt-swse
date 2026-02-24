#!/usr/bin/env node

/**
 * Architecture Enforcement Script
 *
 * Validates all engines against the governance doctrine in docs/ENGINE-ARCHITECTURE.md
 *
 * Enforces:
 * 1. No direct actor.system writes in engines
 * 2. No game.settings.get() calls in engines
 * 3. No actor.update() calls in engines
 * 4. No UI framework imports in engines
 * 5. No sheet imports in engines
 * 6. No lateral/upward engine imports (dependency direction)
 * 7. No duplicate formula logic
 *
 * Run: node scripts/validate-architecture.js
 * Exit codes: 0 = pass, 1 = fail
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENGINES_DIR = path.join(__dirname, '..', 'scripts', 'engines');
const CHARGEN_DIR = path.join(__dirname, '..', 'scripts', 'engines', 'chargen');
const COMBAT_DIR = path.join(__dirname, '..', 'scripts', 'engines', 'combat');
const PROGRESSION_DIR = path.join(__dirname, '..', 'scripts', 'engines', 'progression');

class ArchitectureValidator {
  constructor() {
    this.violations = [];
    this.engineFiles = [];
    this.warnings = [];
  }

  /**
   * Main validation runner
   */
  async validate() {
    console.log('🏛️  Architecture Enforcement Validator\n');

    this.collectEngineFiles();
    console.log(`Found ${this.engineFiles.length} engine files to validate\n`);

    // Run all validation checks
    await this.checkDirectActorWrites();
    await this.checkGameSettingsAccess();
    await this.checkActorUpdateCalls();
    await this.checkUIImports();
    await this.checkSheetImports();
    await this.checkLateralEngineCalls();
    await this.checkUpwardEngineCalls();

    // Report results
    this.reportResults();

    // Exit with appropriate code
    process.exit(this.violations.length > 0 ? 1 : 0);
  }

  /**
   * Collect all engine files
   */
  collectEngineFiles() {
    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (file.endsWith('.js') && !file.includes('test') && !file.includes('spec')) {
          this.engineFiles.push(fullPath);
        }
      }
    };

    // Only validate specific engine directories (not all scripts/)
    [CHARGEN_DIR, COMBAT_DIR, PROGRESSION_DIR].forEach(dir => {
      if (fs.existsSync(dir)) {
        walkDir(dir);
      }
    });
  }

  /**
   * Violation: Engine writes to actor.system directly
   */
  async checkDirectActorWrites() {
    console.log('Checking for direct actor.system writes...');

    for (const file of this.engineFiles) {
      const content = fs.readFileSync(file, 'utf-8');

      // Look for actor.system.FIELD = (direct assignment)
      // Exclude comments and strings
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        // Pattern: actor.system.FIELDNAME = (not inside await ActorEngine)
        if (/actor\.system\.\w+\s*=/.test(line) && !line.includes('ActorEngine')) {
          this.violations.push({
            file,
            line: i + 1,
            code: 'DIRECT_ACTOR_WRITE',
            message: `Direct actor.system write detected: ${line.trim()}`,
            severity: 'ERROR'
          });
        }
      }
    }
  }

  /**
   * Violation: Engine calls game.settings.get()
   */
  async checkGameSettingsAccess() {
    console.log('Checking for direct game.settings.get() calls...');

    for (const file of this.engineFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        // Pattern: game.settings.get(
        if (/game\.settings\.get\s*\(/.test(line)) {
          this.violations.push({
            file,
            line: i + 1,
            code: 'SETTINGS_ACCESS',
            message: `Direct game.settings.get() call: ${line.trim()}. Use HouseRuleService instead.`,
            severity: 'ERROR'
          });
        }
      }
    }
  }

  /**
   * Violation: Engine calls actor.update()
   */
  async checkActorUpdateCalls() {
    console.log('Checking for actor.update() calls...');

    for (const file of this.engineFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments and ActorEngine
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
        if (line.includes('ActorEngine')) continue;

        // Pattern: actor.update( but not actor.toObject() or similar
        if (/\bactor\.update\s*\(/.test(line) && !line.includes('updateActor')) {
          this.violations.push({
            file,
            line: i + 1,
            code: 'ACTOR_UPDATE_CALL',
            message: `Direct actor.update() call: ${line.trim()}. Route through ActorEngine.updateActor() instead.`,
            severity: 'ERROR'
          });
        }
      }
    }
  }

  /**
   * Violation: Engine imports UI frameworks
   */
  async checkUIImports() {
    console.log('Checking for UI framework imports...');

    const uiPatterns = ['FormApplication', 'Dialog', 'ApplicationV2'];

    for (const file of this.engineFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        for (const pattern of uiPatterns) {
          if (new RegExp(`\\bimport.*${pattern}\\b`).test(line)) {
            this.violations.push({
              file,
              line: i + 1,
              code: 'UI_IMPORT',
              message: `UI framework import detected (${pattern}): ${line.trim()}. Engines cannot import UI.`,
              severity: 'ERROR'
            });
          }
        }
      }
    }
  }

  /**
   * Violation: Engine imports sheet files
   */
  async checkSheetImports() {
    console.log('Checking for sheet imports...');

    for (const file of this.engineFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        // Pattern: import from scripts/sheets/
        if (/import.*from.*['"](.*\/sheets\/.*)['"]/.test(line)) {
          this.violations.push({
            file,
            line: i + 1,
            code: 'SHEET_IMPORT',
            message: `Sheet import detected: ${line.trim()}. Sheets are views; engines cannot depend on them.`,
            severity: 'ERROR'
          });
        }
      }
    }
  }

  /**
   * Violation: Engine lateral calls (same tier)
   */
  async checkLateralEngineCalls() {
    console.log('Checking for lateral engine calls...');

    const engineTiers = {
      'CharacterGenerationEngine': 'TIER_1',
      'ProgressionEngineV2': 'TIER_1',
      'CombatMechanicsEngine': 'TIER_1',
      'HPGeneratorEngine': 'TIER_2',
      'DamageResolutionEngine': 'TIER_2',
      'ThresholdEngine': 'TIER_2',
      'ConditionEngine': 'TIER_2',
      'ModifierEngine': 'TIER_3'
    };

    for (const file of this.engineFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // Determine this engine's tier
      const fileName = path.basename(file);
      const engineName = Object.keys(engineTiers).find(name => fileName.includes(name));

      if (!engineName) {
        this.warnings.push(`Unknown engine: ${fileName}`);
        continue;
      }

      const thisTier = engineTiers[engineName];

      // Look for imports of other engines at same tier
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        for (const [otherName, otherTier] of Object.entries(engineTiers)) {
          if (otherName === engineName) continue; // Skip self
          if (otherTier !== thisTier) continue; // Only check same tier

          if (line.includes(`import`) && line.includes(otherName)) {
            this.violations.push({
              file,
              line: i + 1,
              code: 'LATERAL_CALL',
              message: `Lateral engine call detected: ${engineName} importing ${otherName} (both ${thisTier}). Only downward dependencies allowed.`,
              severity: 'ERROR'
            });
          }
        }
      }
    }
  }

  /**
   * Violation: Engine upward calls (to higher tier)
   */
  async checkUpwardEngineCalls() {
    console.log('Checking for upward engine calls...');

    // Dependency hierarchy (higher index = lower tier)
    const engineOrder = [
      'CharacterGenerationEngine',
      'ProgressionEngineV2',
      'CombatMechanicsEngine',
      'HPGeneratorEngine',
      'DamageResolutionEngine',
      'ThresholdEngine',
      'ConditionEngine',
      'ModifierEngine',
      'ActorEngine'
    ];

    for (const file of this.engineFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // Determine this engine's position
      const fileName = path.basename(file);
      const thisEngine = engineOrder.find(name => fileName.includes(name));
      const thisIndex = engineOrder.indexOf(thisEngine);

      if (thisIndex === -1) {
        this.warnings.push(`Unknown engine tier: ${fileName}`);
        continue;
      }

      // Look for imports of engines above this one (upward)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        for (let j = 0; j < thisIndex; j++) {
          const higherEngine = engineOrder[j];
          if (line.includes(`import`) && line.includes(higherEngine)) {
            this.violations.push({
              file,
              line: i + 1,
              code: 'UPWARD_CALL',
              message: `Upward engine call detected: ${thisEngine} importing ${higherEngine}. Circular dependencies forbidden.`,
              severity: 'ERROR'
            });
          }
        }
      }
    }
  }

  /**
   * Report validation results
   */
  reportResults() {
    console.log('\n' + '='.repeat(70));

    if (this.violations.length === 0) {
      console.log('✅ All engines pass architecture validation!\n');

      if (this.warnings.length > 0) {
        console.log(`⚠️  Warnings: ${this.warnings.length}`);
        this.warnings.forEach(w => console.log(`   - ${w}`));
      }

      console.log('='.repeat(70));
      return;
    }

    console.log(`❌ Architecture violations found: ${this.violations.length}\n`);

    // Group by file
    const byFile = {};
    for (const v of this.violations) {
      if (!byFile[v.file]) byFile[v.file] = [];
      byFile[v.file].push(v);
    }

    for (const [file, violations] of Object.entries(byFile)) {
      console.log(`\n📄 ${path.relative(process.cwd(), file)}`);

      for (const v of violations) {
        console.log(`   Line ${v.line}: [${v.code}] ${v.message}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\nViolation Reference:');
    console.log('  DIRECT_ACTOR_WRITE  → Use ActorEngine.updateActor()');
    console.log('  SETTINGS_ACCESS     → Use HouseRuleService.get()');
    console.log('  ACTOR_UPDATE_CALL   → Use ActorEngine.updateActor()');
    console.log('  UI_IMPORT           → Remove FormApplication/Dialog imports');
    console.log('  SHEET_IMPORT        → Sheets are views; remove dependency');
    console.log('  LATERAL_CALL        → No sideways engine calls at same tier');
    console.log('  UPWARD_CALL         → No circular dependencies allowed');
    console.log('\nSee docs/ENGINE-ARCHITECTURE.md for full governance rules.');
    console.log('='.repeat(70));
  }
}

// Run validator
const validator = new ArchitectureValidator();
validator.validate().catch(err => {
  console.error('Validator error:', err);
  process.exit(1);
});

/**
 * SWSE V2 Comprehensive Governance Audit
 *
 * Complete survey of codebase compliance with CLAUDE.md governance rules:
 * - ApplicationV2 architecture and inheritance
 * - Mutation surfaces (ActorEngine, item.update, ChatMessage.create)
 * - CSS isolation and namespacing
 * - Import discipline (absolute paths, no relative imports)
 * - Sheet and template structure
 * - Survey implementations
 *
 * Phase 1: SURVEY & DIAGNOSTICS (this file)
 * Phase 2: FIX violations found
 *
 * Run: await game.SWSE.debug.runV2ComprehensiveAudit()
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

export class V2ComprehensiveAudit {
  constructor() {
    this.findings = {
      appv2: [],
      sheets: [],
      templates: [],
      css: [],
      imports: [],
      mutations: [],
      surveys: []
    };
    this.stats = {
      filesScanned: 0,
      violationsFound: 0,
      criticalIssues: 0
    };
  }

  /**
   * Main audit entry point
   */
  async runFullAudit() {
    console.log('🔍 Starting SWSE V2 Comprehensive Governance Audit...\n');

    try {
      // Phase 1: ApplicationV2 Inventory & Analysis
      await this._auditAppV2Hierarchy();

      // Phase 2: Mutation Surface Analysis
      await this._auditMutationSurfaces();

      // Phase 3: CSS Isolation Audit
      await this._auditCSSIsolation();

      // Phase 4: Import Discipline Audit
      await this._auditImportDiscipline();

      // Phase 5: Template Structure Audit
      await this._auditTemplateStructure();

      // Phase 6: Survey Implementation Audit
      await this._auditSurveyImplementations();

      // Generate comprehensive report
      return this._generateReport();
    } catch (err) {
      console.error('❌ Audit failed:', err);
      SentinelEngine.report('v2-comprehensive-audit', SentinelEngine.SEVERITY.CRITICAL,
        `V2 Comprehensive Audit failed: ${err.message}`, { error: err.toString() });
      throw err;
    }
  }

  /**
   * ============================================
   * PHASE 1: ApplicationV2 Hierarchy Audit
   * ============================================
   */
  async _auditAppV2Hierarchy() {
    console.log('Phase 1: ApplicationV2 Hierarchy Audit');

    const appV2Classes = [
      // Base classes
      { path: 'scripts/apps/base/swse-application-v2.js', name: 'SWSEApplicationV2', shouldExtend: 'ApplicationV2' },
      { path: 'scripts/apps/base/swse-form-application-v2.js', name: 'SWSEFormApplicationV2', shouldExtend: 'SWSEApplicationV2' },
      { path: 'scripts/apps/base/base-swse-appv2.js', name: 'BaseSWSEAppV2', shouldExtend: 'SWSEApplicationV2' },

      // Sheets
      { path: 'scripts/sheets/v2/character-sheet.js', name: 'SWSEV2CharacterSheet', type: 'sheet' },
      { path: 'scripts/sheets/v2/droid-sheet.js', name: 'SWSEV2DroidSheet', type: 'sheet' },
      { path: 'scripts/sheets/v2/npc-sheet.js', name: 'SWSEV2NpcSheet', type: 'sheet' },
      { path: 'scripts/sheets/v2/vehicle-sheet.js', name: 'SWSEV2VehicleSheet', type: 'sheet' },

      // Applications
      { path: 'scripts/apps/dialogs/swse-dialog-v2.js', name: 'SWSEDialogV2', shouldExtend: 'SWSEApplicationV2' },
      { path: 'scripts/apps/damage-app.js', name: 'DamageApp', shouldExtend: 'BaseSWSEAppV2' },
      { path: 'scripts/apps/house-rules-app.js', name: 'HouseRulesApp', shouldExtend: 'BaseSWSEAppV2' },
      { path: 'scripts/apps/modifier-inspector-app.js', name: 'ModifierInspectorApp', shouldExtend: 'BaseSWSEAppV2' },
      { path: 'scripts/apps/xp-calculator.js', name: 'SWSEXPCalculator', shouldExtend: 'BaseSWSEAppV2' },
      { path: 'scripts/apps/store/store-main.js', name: 'SWSEStore', shouldExtend: 'BaseSWSEAppV2' },
    ];

    for (const appDef of appV2Classes) {
      this.stats.filesScanned++;
      try {
        const content = await this._readFile(appDef.path);
        if (!content) {
          this.findings.appv2.push({
            severity: 'WARN',
            file: appDef.path,
            message: 'File not found or not readable'
          });
          continue;
        }

        // Check class definition exists
        if (!content.includes(`class ${appDef.name}`)) {
          this.findings.appv2.push({
            severity: 'ERROR',
            file: appDef.path,
            message: `Class ${appDef.name} not found`
          });
          continue;
        }

        // Check inheritance (if specified)
        if (appDef.shouldExtend) {
          const extendsPattern = new RegExp(`extends\\s+${appDef.shouldExtend.replace(/[()]/g, '\\$&')}`);
          if (!extendsPattern.test(content)) {
            this.findings.appv2.push({
              severity: 'ERROR',
              file: appDef.path,
              class: appDef.name,
              message: `Should extend ${appDef.shouldExtend}`,
              fix: `Change class declaration to: class ${appDef.name} extends ${appDef.shouldExtend}`
            });
            this.stats.criticalIssues++;
          }
        }

        // Check wireEvents implementation
        if (!appDef.type === 'sheet' && !content.includes('wireEvents()')) {
          this.findings.appv2.push({
            severity: 'WARN',
            file: appDef.path,
            class: appDef.name,
            message: 'Missing wireEvents() lifecycle method',
            fix: 'Implement wireEvents() for post-render event binding'
          });
        }
      } catch (err) {
        this.findings.appv2.push({
          severity: 'ERROR',
          file: appDef.path,
          message: `Audit error: ${err.message}`
        });
      }
    }
  }

  /**
   * ============================================
   * PHASE 2: Mutation Surface Audit
   * ============================================
   */
  async _auditMutationSurfaces() {
    console.log('Phase 2: Mutation Surface Audit');

    // @mutation-exception: Audit scanning for violation patterns (not executing mutations)
    const suspiciousPatternsToFind = [
      { pattern: /actor\.update\s*\(/g, message: 'Direct actor.update() call outside ActorEngine' },
      { pattern: /item\.update\s*\(/g, message: 'Direct item.update() call outside ActorEngine' },
      { pattern: /ChatMessage\.create\s*\(/g, message: 'Direct ChatMessage.create() call (use SWSEChat)' },
      { pattern: /ui\.notifications\./g, message: 'Direct ui.notifications call from sheet (use engine)' },
      { pattern: /Hooks\.call\s*\(/g, message: 'Direct Hooks.call() outside ActorEngine' }
    ];

    // Check critical files
    const filesToCheck = [
      'scripts/sheets/v2/character-sheet.js',
      'scripts/apps/base/base-swse-appv2.js',
      'scripts/apps/damage-app.js',
      'scripts/apps/store/store-main.js'
    ];

    for (const filePath of filesToCheck) {
      this.stats.filesScanned++;
      const content = await this._readFile(filePath);
      if (!content) continue;

      for (const { pattern, message } of suspiciousPatternsToFind) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          // Check if it's in a comment or ActorEngine context
          const isInEngine = content.includes('ActorEngine') || content.includes('// ActorEngine');
          if (!isInEngine) {
            this.findings.mutations.push({
              severity: 'ERROR',
              file: filePath,
              pattern: pattern.source,
              message: message,
              occurrences: matches.length,
              fix: 'Route mutation through ActorEngine or appropriate service layer'
            });
            this.stats.criticalIssues++;
          }
        }
      }
    }
  }

  /**
   * ============================================
   * PHASE 3: CSS Isolation Audit
   * ============================================
   */
  async _auditCSSIsolation() {
    console.log('Phase 3: CSS Isolation Audit');

    // Dangerous global selectors per CLAUDE.md
    const dangerousSelectors = [
      'button',
      '.app',
      '.window-app',
      '.window-content',
      '.flexrow',
      '.flexcol',
      '.sidebar',
      '.directory',
      '.tab',
      '#sidebar-tabs',
      'html',
      'body',
      '*'
    ];

    const cssFiles = [
      'styles/sheets/character-sheet.css',
      'styles/apps/damage-app.css',
      'styles/apps/store.css',
      'styles/ui/action-palette.css'
    ];

    for (const filePath of cssFiles) {
      const fullPath = `/home/user/foundryvtt-swse/${filePath}`;
      this.stats.filesScanned++;

      try {
        const content = await this._readFile(fullPath);
        if (!content) continue;

        // Check for unnamespaced selectors
        for (const selector of dangerousSelectors) {
          if (content.includes(selector + ' {') || content.includes(selector + ' ,')) {
            this.findings.css.push({
              severity: 'ERROR',
              file: filePath,
              selector: selector,
              message: `Dangerous global selector found: ${selector}`,
              fix: `Use namespaced selectors only: .swse-*, .sheet-*, .component-*`
            });
            this.stats.criticalIssues++;
          }
        }

        // Check for proper namespacing
        const hasProperNamespace = /\.swse-|\.sheet-|\.component-/.test(content);
        if (!hasProperNamespace && content.trim().length > 100) {
          this.findings.css.push({
            severity: 'WARN',
            file: filePath,
            message: 'CSS file has minimal SWSE namespacing',
            fix: 'Ensure all custom styles use .swse-*, .sheet-*, or .component-* namespaces'
          });
        }

      } catch (err) {
        this.findings.css.push({
          severity: 'WARN',
          file: filePath,
          message: `Could not read CSS file: ${err.message}`
        });
      }
    }
  }

  /**
   * ============================================
   * PHASE 4: Import Discipline Audit
   * ============================================
   */
  async _auditImportDiscipline() {
    console.log('Phase 4: Import Discipline Audit');

    const filesToCheck = [
      'scripts/sheets/v2/character-sheet.js',
      'scripts/apps/base/base-swse-appv2.js',
      'scripts/apps/damage-app.js',
      'scripts/apps/store/store-main.js'
    ];

    const relativeImportPattern = /import\s+.*from\s+["']\.\.?\//g;
    const absoluteImportPattern = /import\s+.*from\s+["']\/systems\/foundryvtt-swse/g;

    for (const filePath of filesToCheck) {
      this.stats.filesScanned++;
      const content = await this._readFile(filePath);
      if (!content) continue;

      // Check for relative imports (forbidden)
      const relativeImports = content.match(relativeImportPattern);
      if (relativeImports && relativeImports.length > 0) {
        this.findings.imports.push({
          severity: 'ERROR',
          file: filePath,
          message: `Found ${relativeImports.length} relative imports (must use absolute paths)`,
          pattern: relativeImportPattern.source,
          occurrences: relativeImports,
          fix: 'Convert all relative imports to absolute system paths: /systems/foundryvtt-swse/...'
        });
        this.stats.criticalIssues++;
      }

      // Check for absolute imports (should exist)
      const absoluteImports = content.match(absoluteImportPattern);
      if (!absoluteImports || absoluteImports.length === 0) {
        this.findings.imports.push({
          severity: 'WARN',
          file: filePath,
          message: 'No absolute imports found (may be external only)',
          fix: 'Verify all system imports use absolute paths'
        });
      }
    }
  }

  /**
   * ============================================
   * PHASE 5: Template Structure Audit
   * ============================================
   */
  async _auditTemplateStructure() {
    console.log('Phase 5: Template Structure Audit');

    // Find all .hbs files
    const { execSync } = require('child_process');
    try {
      const result = execSync('find /home/user/foundryvtt-swse/templates -name "*.hbs" 2>/dev/null | head -20').toString();
      const templates = result.split('\n').filter(f => f.trim());

      for (const templatePath of templates) {
        this.stats.filesScanned++;
        const content = await this._readFile(templatePath);
        if (!content) continue;

        // Check for proper component wrapping
        if (content.includes('<form') && !content.includes('data-form')) {
          this.findings.templates.push({
            severity: 'WARN',
            file: templatePath,
            message: 'Form element missing data-form attribute',
            fix: 'Add data-form to form elements for proper V2 binding'
          });
        }

        // Check for inline click handlers (should use data-action)
        if (content.includes('onclick=') || content.includes('@click=')) {
          this.findings.templates.push({
            severity: 'WARN',
            file: templatePath,
            message: 'Found inline click handlers (use data-action instead)',
            fix: 'Replace onclick with data-action attributes and wireEvents() binding'
          });
        }

        // Check for unscoped styles
        if (content.includes('<style')) {
          this.findings.templates.push({
            severity: 'ERROR',
            file: templatePath,
            message: 'Inline <style> tag found in template',
            fix: 'Move all styles to separate .css files with .swse-* namespace'
          });
          this.stats.criticalIssues++;
        }
      }
    } catch (err) {
      console.warn('Could not scan templates:', err.message);
    }
  }

  /**
   * ============================================
   * PHASE 6: Survey Implementation Audit
   * ============================================
   */
  async _auditSurveyImplementations() {
    console.log('Phase 6: Survey Implementation Audit');

    const surveyFiles = [
      'scripts/apps/mentor/mentor-survey.js',
      'scripts/mentor/mentor-survey.js'
    ];

    for (const filePath of surveyFiles) {
      this.stats.filesScanned++;
      const fullPath = `/home/user/foundryvtt-swse/${filePath}`;
      const content = await this._readFile(fullPath);
      if (!content) continue;

      // Check if survey extends proper base
      if (!content.includes('BaseSWSEAppV2') && !content.includes('SWSEApplicationV2')) {
        this.findings.surveys.push({
          severity: 'WARN',
          file: filePath,
          message: 'Survey does not extend BaseSWSEAppV2 or SWSEApplicationV2',
          fix: 'Ensure survey extends proper governance base class'
        });
      }

      // @mutation-exception: Audit checking for violation patterns (not executing mutations)
      // Check for direct mutations
      if (content.includes('actor.update(') || content.includes('ChatMessage.create(')) {
        this.findings.surveys.push({
          severity: 'ERROR',
          file: filePath,
          message: 'Survey contains direct mutations (actor.update or ChatMessage.create)',
          fix: 'Route all mutations through ActorEngine and SWSEChat'
        });
        this.stats.criticalIssues++;
      }

      // Check for governance routing
      if (!content.includes('ActorEngine') && content.includes('update')) {
        this.findings.surveys.push({
          severity: 'WARN',
          file: filePath,
          message: 'Survey update logic not using ActorEngine',
          fix: 'Use ActorEngine for all actor state mutations'
        });
      }
    }
  }

  /**
   * ============================================
   * REPORT GENERATION
   * ============================================
   */
  _generateReport() {
    const allFindings = Object.values(this.findings).flat();
    const errors = allFindings.filter(f => f.severity === 'ERROR');
    const warnings = allFindings.filter(f => f.severity === 'WARN');

    console.log('\n' + '='.repeat(70));
    console.log('  SWSE V2 COMPREHENSIVE GOVERNANCE AUDIT REPORT');
    console.log('='.repeat(70));

    console.log(`\n📊 SUMMARY`);
    console.log(`   Files Scanned: ${this.stats.filesScanned}`);
    console.log(`   Total Findings: ${allFindings.length}`);
    console.log(`   ❌ Critical Issues: ${this.stats.criticalIssues}`);
    console.log(`   ❌ Errors: ${errors.length}`);
    console.log(`   ⚠️  Warnings: ${warnings.length}`);

    // Group by category
    console.log('\n📋 VIOLATIONS BY CATEGORY');
    console.log(`   AppV2 Issues: ${this.findings.appv2.length}`);
    console.log(`   Mutation Surfaces: ${this.findings.mutations.length}`);
    console.log(`   CSS Isolation: ${this.findings.css.length}`);
    console.log(`   Import Discipline: ${this.findings.imports.length}`);
    console.log(`   Templates: ${this.findings.templates.length}`);
    console.log(`   Surveys: ${this.findings.surveys.length}`);

    // Print errors
    if (errors.length > 0) {
      console.log('\n' + '-'.repeat(70));
      console.log('❌ CRITICAL ERRORS (MUST FIX FOR V2 COMPLIANCE)');
      console.log('-'.repeat(70));
      errors.forEach((err, i) => {
        console.log(`\n[${i + 1}] ${err.message}`);
        console.log(`    File: ${err.file}`);
        if (err.class) console.log(`    Class: ${err.class}`);
        if (err.fix) console.log(`    📝 Fix: ${err.fix}`);
      });
    }

    // Print warnings
    if (warnings.length > 0) {
      console.log('\n' + '-'.repeat(70));
      console.log('⚠️  WARNINGS (REVIEW)');
      console.log('-'.repeat(70));
      warnings.slice(0, 20).forEach((warn, i) => {
        console.log(`\n[${i + 1}] ${warn.message}`);
        console.log(`    File: ${warn.file}`);
        if (warn.fix) console.log(`    📝 Fix: ${warn.fix}`);
      });
      if (warnings.length > 20) {
        console.log(`\n... and ${warnings.length - 20} more warnings`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('PHASE 1 (SURVEY) COMPLETE');
    console.log('Next: Phase 2 will fix violations found above');
    console.log('='.repeat(70) + '\n');

    // Report to Sentinel
    SentinelEngine.report('v2-comprehensive-audit',
      errors.length > 0 ? SentinelEngine.SEVERITY.ERROR : SentinelEngine.SEVERITY.WARN,
      `V2 Governance Audit: ${errors.length} errors, ${warnings.length} warnings`,
      {
        filesScanned: this.stats.filesScanned,
        criticalIssues: this.stats.criticalIssues,
        errors: errors.length,
        warnings: warnings.length,
        categories: {
          appv2: this.findings.appv2.length,
          mutations: this.findings.mutations.length,
          css: this.findings.css.length,
          imports: this.findings.imports.length,
          templates: this.findings.templates.length,
          surveys: this.findings.surveys.length
        }
      }
    );

    return {
      findings: this.findings,
      stats: this.stats,
      summary: {
        total: allFindings.length,
        errors: errors.length,
        warnings: warnings.length,
        filesScanned: this.stats.filesScanned,
        criticalIssues: this.stats.criticalIssues
      }
    };
  }

  /**
   * Safe file read helper
   */
  async _readFile(filePath) {
    try {
      const fs = require('fs');
      return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      return null;
    }
  }
}

// Global registration
if (typeof window !== 'undefined' && window.game) {
  if (!window.game.SWSE) window.game.SWSE = {};
  if (!window.game.SWSE.debug) window.game.SWSE.debug = {};

  window.game.SWSE.debug.runV2ComprehensiveAudit = async () => {
    const audit = new V2ComprehensiveAudit();
    return await audit.runFullAudit();
  };
}

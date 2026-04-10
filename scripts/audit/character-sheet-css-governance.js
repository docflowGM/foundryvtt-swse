#!/usr/bin/env node

/**
 * CHARACTER SHEET CSS GOVERNANCE AUDIT
 *
 * Validates that protected CSS properties on protected selectors
 * are only set in the authorized owner file: styles/sheets/v2-sheet.css
 *
 * Phase 3: Prevents governance regressions
 *
 * Usage:
 *   node scripts/audit/character-sheet-css-governance.js
 *
 * Exit codes:
 *   0 = audit passed
 *   1 = governance violations found
 *   2 = audit configuration error
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ════════════════════════════════════════════════════════════════════════════
// GOVERNANCE RULES
// ════════════════════════════════════════════════════════════════════════════

const AUTHORIZED_OWNER = 'styles/sheets/v2-sheet.css';

const PROTECTED_SELECTORS = [
  '.application.swse-character-sheet > .window-content',
  '.application.swse-character-sheet > .window-content > .swse-character-sheet-wrapper',
  '.application.swse-character-sheet > .window-content > .swse-character-sheet-wrapper > form.swse-character-sheet-form',
  'form.swse-character-sheet-form',
  '.swse-character-sheet-wrapper',
  '.sheet-shell',
  '.sheet-body',
  '.sheet-body > .tab',
  '.sheet-body > .tab.active',
  '.sheet-body > .tab:not(.active)',
  // Also match shortened forms used in actual CSS
  '.window-content',
  'form.swse-sheet-ui',
  '.swse-sheet .sheet-shell',
  '.swse-sheet .sheet-body',
  'form.swse-sheet-ui .sheet-body',
  'form.swse-sheet-ui .sheet-body > .tab'
];

const PROTECTED_PROPERTIES = [
  'display',
  'flex',
  'flex-direction',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'height',
  'min-height',
  'max-height',
  'overflow',
  'overflow-x',
  'overflow-y'
];

// Files that are allowed to set protected properties
// (in addition to the authorized owner)
const ALLOWLISTED_FILES = {
  // 'styles/layout/sheet-layout.css': ['reason: generic Foundry baseline, overridden by v2-sheet.css']
};

// ════════════════════════════════════════════════════════════════════════════
// AUDIT ENGINE
// ════════════════════════════════════════════════════════════════════════════

class CSSGovernanceAudit {
  constructor(rootDir = '.') {
    this.rootDir = rootDir;
    this.violations = [];
    this.stats = {
      filesScanned: 0,
      rulesChecked: 0,
      violationsFound: 0,
      allowlistMatches: 0
    };
  }

  /**
   * Run the full audit
   */
  run() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║   CHARACTER SHEET CSS GOVERNANCE AUDIT (Phase 3)                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    this.scanCSSFiles();
    this.reportResults();

    return this.violations.length === 0;
  }

  /**
   * Find and scan all CSS files
   */
  scanCSSFiles() {
    const stylesDir = path.join(this.rootDir, 'styles');

    if (!fs.existsSync(stylesDir)) {
      console.error(`❌ ERROR: styles directory not found at ${stylesDir}`);
      process.exit(2);
    }

    const cssFiles = this.findCSSFiles(stylesDir);

    console.log(`📁 Found ${cssFiles.length} CSS files to audit\n`);

    cssFiles.forEach(filePath => {
      this.scanFile(filePath);
    });
  }

  /**
   * Recursively find all CSS files
   */
  findCSSFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.')) {
        this.findCSSFiles(filePath, fileList);
      } else if (file.endsWith('.css')) {
        fileList.push(filePath);
      }
    });

    return fileList;
  }

  /**
   * Scan a single CSS file for violations
   */
  scanFile(filePath) {
    this.stats.filesScanned++;

    const content = fs.readFileSync(filePath, 'utf-8');
    const relPath = path.relative(this.rootDir, filePath);
    const isOwner = relPath === AUTHORIZED_OWNER;

    // If this is the authorized owner, skip violation checks
    if (isOwner) {
      console.log(`✅ ${relPath} (AUTHORIZED OWNER)`);
      return;
    }

    // Check if file is allowlisted
    if (ALLOWLISTED_FILES[relPath]) {
      console.log(`🔵 ${relPath} (ALLOWLISTED)`);
      this.stats.allowlistMatches++;
      return;
    }

    // Parse CSS rules
    const rules = this.parseCSS(content);
    let fileViolations = 0;

    rules.forEach(rule => {
      this.stats.rulesChecked++;

      // Check if selector matches any protected selector
      const matchesProtected = this.matchesProtectedSelector(rule.selector);
      if (!matchesProtected) {
        return; // Not a protected selector, skip
      }

      // Check if any properties are protected properties
      rule.properties.forEach(prop => {
        const isProtected = PROTECTED_PROPERTIES.some(p => p === prop);
        if (!isProtected) {
          return; // Not a protected property, skip
        }

        // Found a violation!
        fileViolations++;
        this.stats.violationsFound++;
        this.violations.push({
          file: relPath,
          selector: rule.selector,
          property: prop,
          line: rule.line,
          authorizedOwner: AUTHORIZED_OWNER
        });
      });
    });

    if (fileViolations > 0) {
      console.log(`❌ ${relPath} (${fileViolations} violation(s))`);
    } else {
      console.log(`✅ ${relPath}`);
    }
  }

  /**
   * Parse CSS file into rules with selectors and properties
   * Simple parser - handles basic CSS
   */
  parseCSS(content) {
    const rules = [];
    let lineNum = 0;
    const lines = content.split('\n');

    let currentSelector = '';
    let inRule = false;
    let braceDepth = 0;

    lines.forEach((line, idx) => {
      lineNum = idx + 1;

      // Skip comments
      if (line.trim().startsWith('/*') || line.trim().startsWith('//')) {
        return;
      }

      // Find opening braces
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;

      if (openBraces > 0) {
        inRule = true;
        braceDepth += openBraces;

        // Extract selector(s) from the line
        const selectorMatch = line.split('{')[0].trim();
        if (selectorMatch) {
          // Handle comma-separated selectors
          selectorMatch.split(',').forEach(sel => {
            const cleanSel = sel.trim();
            if (cleanSel) {
              currentSelector = cleanSel;
              rules.push({
                selector: cleanSel,
                properties: [],
                line: lineNum
              });
            }
          });
        }
      }

      if (inRule && currentSelector && !line.includes('{')) {
        // Extract property from line
        const propMatch = line.match(/^\s*([a-z-]+)\s*:/i);
        if (propMatch) {
          const prop = propMatch[1];
          // Find the most recent rule with this selector
          const lastRule = rules.filter(r => r.selector === currentSelector).pop();
          if (lastRule && !lastRule.properties.includes(prop)) {
            lastRule.properties.push(prop);
          }
        }
      }

      if (closeBraces > 0) {
        braceDepth -= closeBraces;
        if (braceDepth <= 0) {
          inRule = false;
          currentSelector = '';
        }
      }
    });

    return rules;
  }

  /**
   * Check if a selector matches any protected selector
   */
  matchesProtectedSelector(selector) {
    // Normalize selector
    const norm = selector.trim();

    // Exact matches
    if (PROTECTED_SELECTORS.includes(norm)) {
      return true;
    }

    // Wildcard patterns
    const patterns = [
      /\.window-content/,
      /\.swse-character-sheet-wrapper/,
      /form\.swse-character-sheet-form/,
      /\.sheet-shell/,
      /\.sheet-body/,
      /\.tab\.active/,
      /\.tab(?:\s|>|,)/,
      /form\.swse-sheet-ui/
    ];

    return patterns.some(pattern => pattern.test(norm));
  }

  /**
   * Print audit results
   */
  reportResults() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                     AUDIT RESULTS                              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Files scanned:        ${this.stats.filesScanned}`);
    console.log(`CSS rules checked:    ${this.stats.rulesChecked}`);
    console.log(`Allowlisted:          ${this.stats.allowlistMatches}`);
    console.log(`Violations found:     ${this.stats.violationsFound}\n`);

    if (this.violations.length > 0) {
      console.log('❌ GOVERNANCE VIOLATIONS:\n');

      this.violations.forEach(v => {
        console.log(`📍 ${v.file}`);
        console.log(`   Selector: ${v.selector}`);
        console.log(`   Property: ${v.property}`);
        console.log(`   Line: ${v.line}`);
        console.log(`   Authorized owner: ${v.authorizedOwner}`);
        console.log('');
      });

      console.log('🔧 ACTION: Move protected properties to the authorized owner or add allowlist entry.\n');
    } else {
      console.log('✅ AUDIT PASSED: No governance violations found.\n');
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

const audit = new CSSGovernanceAudit();
const passed = audit.run();

process.exit(passed ? 0 : 1);

export { CSSGovernanceAudit };

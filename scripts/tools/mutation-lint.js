#!/usr/bin/env node

/**
 * MUTATION PATH LINT ENFORCEMENT
 *
 * Prevents direct actor.update() and other forbidden mutations
 * outside of ActorEngine and approved governance layers.
 *
 * This is a hard guardrail that fails CI if violations are found.
 *
 * Run with: npm run lint:mutation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

// ============================================================================
// CONFIGURATION
// ============================================================================

const STRICT_MODE = true; // Block even ambiguous usage

/**
 * Forbidden mutation patterns
 * These indicate direct calls to Foundry mutation methods
 * Must be precise to avoid matching ActorEngine.createEmbeddedDocuments() etc
 */
const FORBIDDEN_PATTERNS = [
  {
    pattern: 'actor.update(',
    description: 'Direct actor.update() call',
    severity: 'ERROR'
  },
  {
    pattern: 'actor.updateEmbeddedDocuments(',
    description: 'Direct updateEmbeddedDocuments() call on actor',
    severity: 'ERROR'
  },
  {
    pattern: 'actor.createEmbeddedDocuments(',
    description: 'Direct createEmbeddedDocuments() call on actor',
    severity: 'ERROR'
  },
  {
    pattern: 'actor.deleteEmbeddedDocuments(',
    description: 'Direct deleteEmbeddedDocuments() call on actor',
    severity: 'ERROR'
  },
  {
    pattern: 'item.update(',
    description: 'Direct item.update() call for owned items',
    severity: 'ERROR'
  },
  {
    pattern: 'actor.setFlag(',
    description: 'Direct actor.setFlag() call (use ActorEngine if data mutation)',
    severity: STRICT_MODE ? 'ERROR' : 'WARN'
  },
  {
    pattern: 'actor.unsetFlag(',
    description: 'Direct actor.unsetFlag() call',
    severity: STRICT_MODE ? 'ERROR' : 'WARN'
  }
];

/**
 * Allowed locations where mutation calls are permitted
 */
const ALLOWED_PATHS = [
  'scripts/governance/actor-engine/',
  'scripts/governance/actor-engine/actor-engine.js',
  'scripts/utils/actor-utils.js',
  'scripts/core/mutation-safety.js', // Edge case: validation layer
];

/**
 * Exception comments that exempt code from checks
 */
const EXCEPTION_COMMENTS = [
  '@mutation-exception',
  '@mutation-approved',
  'MUTATION EXCEPTION:',
  'APPROVED BYPASS:',
];

// ============================================================================
// ANALYSIS ENGINE
// ============================================================================

/**
 * Check if a file path is in the allowed list
 */
function isAllowedPath(filePath) {
  return ALLOWED_PATHS.some(allowedPath => filePath.includes(allowedPath));
}

/**
 * Check if a line has an exception comment
 */
function hasException(line) {
  return EXCEPTION_COMMENTS.some(exc => line.includes(exc));
}

/**
 * Scan a single file for violations
 */
function scanFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, lineNum) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }

    // Skip if has exception
    if (hasException(line)) {
      return;
    }

    // Check each forbidden pattern
    FORBIDDEN_PATTERNS.forEach(({ pattern, description, severity }) => {
      if (line.includes(pattern)) {
        violations.push({
          line: lineNum + 1,
          content: line.trim(),
          pattern,
          description,
          severity
        });
      }
    });
  });

  return violations;
}

/**
 * Recursively walk directory and collect JS files
 */
function walkDir(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const fullPath = path.join(dir, file);

      // Skip node_modules, dist, build, tests, etc
      if (file.startsWith('.') ||
          file === 'node_modules' ||
          file === 'dist' ||
          file === 'build' ||
          file === 'coverage' ||
          fullPath.includes('.test.') ||
          fullPath.includes('.spec.')) {
        return;
      }

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath, fileList);
      } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
        fileList.push(fullPath);
      }
    });
  } catch (err) {
    console.error(`Error walking directory ${dir}:`, err.message);
  }

  return fileList;
}

/**
 * Format violation for console output
 */
function formatViolation(file, violation) {
  const relPath = path.relative(ROOT, file);

  return [
    `\n❌ ${violation.severity}: ${violation.description}`,
    `   File: ${relPath}:${violation.line}`,
    `   Code: ${violation.content}`,
    `\n   Fix: Use ActorEngine.updateActor() instead of direct actor.update()`,
    `   Docs: See PERMANENT-FIX-SUMMARY.md`
  ].join('\n');
}

/**
 * Generate suggestion for correct usage
 */
function generateSuggestion(violation) {
  if (violation.pattern.includes('update(')) {
    return 'await ActorEngine.updateActor(actor, payload);';
  }
  if (violation.pattern.includes('createEmbeddedDocuments(')) {
    return 'await ActorEngine.createEmbeddedDocuments(actor, type, data);';
  }
  if (violation.pattern.includes('updateEmbeddedDocuments(')) {
    return 'await ActorEngine.updateEmbeddedDocuments(actor, type, updates);';
  }
  if (violation.pattern.includes('deleteEmbeddedDocuments(')) {
    return 'await ActorEngine.deleteEmbeddedDocuments(actor, type, ids);';
  }
  return 'Route through ActorEngine instead';
}

// ============================================================================
// MAIN LINT EXECUTION
// ============================================================================

function runLint() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 MUTATION PATH LINT ENFORCEMENT');
  console.log('='.repeat(70));

  const scriptsDir = path.join(ROOT, 'scripts');
  const jsFiles = walkDir(scriptsDir);

  console.log(`\nScanning ${jsFiles.length} JavaScript files...\n`);

  const allViolations = [];
  const violationsByFile = new Map();

  jsFiles.forEach(file => {
    // Skip allowed paths
    if (isAllowedPath(file)) {
      return;
    }

    const violations = scanFile(file);

    if (violations.length > 0) {
      violationsByFile.set(file, violations);
      allViolations.push(...violations.map(v => ({ file, ...v })));
    }
  });

  // ========================================================================
  // REPORTING
  // ========================================================================

  if (allViolations.length === 0) {
    console.log('✅ PASS: No forbidden mutation patterns found\n');
    console.log('Mutation governance is enforced at the code level.');
    console.log('All actor updates route through ActorEngine.\n');
    process.exit(0);
  }

  // Violations found
  console.log(`❌ FAIL: ${allViolations.length} violation(s) found\n`);

  // Group by severity
  const errors = allViolations.filter(v => v.severity === 'ERROR');
  const warnings = allViolations.filter(v => v.severity === 'WARN');

  if (errors.length > 0) {
    console.log(`\n🚫 ERRORS (${errors.length}):`);
    errors.forEach(v => {
      const relPath = path.relative(ROOT, v.file);
      console.log(`\n  ${relPath}:${v.line}`);
      console.log(`  Pattern: ${v.pattern}`);
      console.log(`  Issue: ${v.description}`);
      console.log(`  Fix: ${generateSuggestion(v)}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(v => {
      const relPath = path.relative(ROOT, v.file);
      console.log(`\n  ${relPath}:${v.line}`);
      console.log(`  Pattern: ${v.pattern}`);
      console.log(`  Issue: ${v.description}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('MUTATION GOVERNANCE VIOLATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`\nTotal violations: ${allViolations.length}`);
  console.log(`- Errors: ${errors.length} (blocking)`);
  console.log(`- Warnings: ${warnings.length}`);
  console.log('\n📖 REMEDIATION GUIDE\n');
  console.log('All actor mutations must route through ActorEngine:');
  console.log('  ❌ actor.update(...) → ✅ ActorEngine.updateActor(...)');
  console.log('  ❌ actor.createEmbeddedDocuments(...) → ✅ ActorEngine.createEmbeddedDocuments(...)');
  console.log('  ❌ actor.setFlag(...) → ✅ Evaluate if this is a data mutation');
  console.log('\nFor exceptions, add: // @mutation-exception');
  console.log('\nDocumentation: See PERMANENT-FIX-SUMMARY.md');
  console.log('\n' + '='.repeat(70));

  // Fail if errors found
  if (errors.length > 0) {
    process.exit(1);
  }

  // Warnings only = pass but visible
  process.exit(0);
}

// ============================================================================
// EXECUTION
// ============================================================================

runLint();

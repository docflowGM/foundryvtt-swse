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
 * Metadata flag patterns that are allowed for UI-only state
 * These are flags that should never represent authoritative gameplay state
 */
const ALLOWED_METADATA_PATTERNS = [
  'quickOnYourFeet',
  'surge',
  'weakPoint',
  'blindingStrike',
  'confusingStrike',
  'unexpectedAttack',
  'blurringBurst',
  'suddenAssault',
  'weavingStride',
  'swiftPowerUsedToday',
  'activeDarkSideTalisman',
  'darkSideTalismanCooldown',
  'temporary',
  'session',
  'ui',
  'display',
  'cooldown',
  'encounter'
];

/**
 * Suspicious patterns that might indicate authoritative gameplay state
 * If a flag contains these, it needs manual review
 */
const SUSPICIOUS_FLAG_PATTERNS = [
  'hp',
  'damage',
  'condition',
  'inventory',
  'item',
  'talent',
  'effect',
  'level',
  'xp',
  'ability',
  'state',
  'modifier',
  'resist',
  'bonus'
];

/**
 * Forbidden mutation patterns
 * These indicate direct calls to Foundry mutation methods
 * @mutation-exception: Linter configuration containing pattern definitions (not mutations)
 */
const FORBIDDEN_PATTERNS = [
  {
    pattern: 'actor.update(',  // @mutation-exception: Linter pattern/output definitions
    description: 'Direct actor.update() call',  // @mutation-exception: Linter pattern/output definitions
    severity: 'ERROR',
    classification: 'authoritative'
  },
  {
    pattern: 'actor.updateEmbeddedDocuments(',  // @mutation-exception: Linter pattern/output definitions
    description: 'Direct updateEmbeddedDocuments() call on actor',
    severity: 'ERROR',
    classification: 'authoritative'
  },
  {
    pattern: 'actor.createEmbeddedDocuments(',  // @mutation-exception: Linter pattern/output definitions
    description: 'Direct createEmbeddedDocuments() call on actor',
    severity: 'ERROR',
    classification: 'authoritative'
  },
  {
    pattern: 'actor.deleteEmbeddedDocuments(',  // @mutation-exception: Linter pattern/output definitions
    description: 'Direct deleteEmbeddedDocuments() call on actor',
    severity: 'ERROR',
    classification: 'authoritative'
  },
  {
    pattern: 'item.update(',  // @mutation-exception: Linter pattern/output definitions
    description: 'Direct item.update() call for owned items',  // @mutation-exception: Linter pattern/output definitions
    severity: 'ERROR',
    classification: 'authoritative'
  },
  {
    pattern: 'actor.setFlag(',  // @mutation-exception: Linter pattern/output definitions
    description: 'Direct actor.setFlag() call (use ActorEngine if data mutation)',  // @mutation-exception: Linter pattern/output definitions
    severity: STRICT_MODE ? 'ERROR' : 'WARN',
    classification: 'metadata'
  },
  {
    pattern: 'actor.unsetFlag(',  // @mutation-exception: Linter pattern/output definitions
    description: 'Direct actor.unsetFlag() call',  // @mutation-exception: Linter pattern/output definitions
    severity: STRICT_MODE ? 'ERROR' : 'WARN',
    classification: 'metadata'
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
 * Check if a line has valid mutation exception annotation
 */
function hasMetadataException(line) {
  return line.includes('@mutation-exception: metadata') ||
         line.includes('@mutation-exception: legacy-disabled-sheet') ||
         line.includes('@mutation-exception: legacy-disabled-infrastructure') ||
         line.includes('@mutation-exception: legacy-disabled') ||
         line.includes('MUTATION EXCEPTION: metadata');
}

/**
 * Extract flag name from setFlag/unsetFlag calls
 */
function extractFlagName(line) {
  // Match patterns like: actor.setFlag('scope', 'flagName') or actor.setFlag('scope', `flagName_${var}`)
  const match = line.match(/(?:setFlag|unsetFlag)\s*\(\s*['"`][^'"`]+['"`]\s*,\s*['"`]?([^'"`(),]+)/);
  return match ? match[1] : null;
}

/**
 * Check if a flag name looks suspicious (might represent gameplay state)
 */
function isSuspiciousFlag(flagName) {
  if (!flagName) return false;

  // Extract base name (before ${} or _)
  const baseName = flagName.split(/[_$\{]/)[0].toLowerCase();

  return SUSPICIOUS_FLAG_PATTERNS.some(pattern =>
    baseName.includes(pattern.toLowerCase())
  );
}

/**
 * Check if a flag name is on the allowed list
 */
function isAllowedFlag(flagName) {
  if (!flagName) return false;

  // Extract base name (before ${} or _)
  const baseName = flagName.split(/[_$\{]/)[0].toLowerCase();

  return ALLOWED_METADATA_PATTERNS.some(pattern =>
    baseName.toLowerCase().includes(pattern.toLowerCase()) ||
    pattern.toLowerCase().includes(baseName)
  );
}

/**
 * Classify a violation as authoritative, metadata, or allowed
 */
function classifyViolation(line, pattern) {
  // If it has metadata exception, it's allowed
  if (hasMetadataException(line)) {
    return 'metadata-approved';
  }

  // If it's a flag operation, classify by flag content
  if (pattern.includes('setFlag') || pattern.includes('unsetFlag')) {
    const flagName = extractFlagName(line);

    // Check if it's an allowed flag
    if (isAllowedFlag(flagName)) {
      return 'metadata-allowed';
    }

    // Check if it looks suspicious
    if (isSuspiciousFlag(flagName)) {
      return 'metadata-suspicious';
    }

    // Unknown flag - treat as metadata but warn
    return 'metadata-unknown';
  }

  // All other patterns (update, createEmbeddedDocuments, etc) are authoritative
  return 'authoritative';
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

    // Skip if has general exception
    if (hasException(line)) {
      return;
    }

    // Check previous lines for annotations (they're often a few lines before)
    let hasAnnotation = false;
    for (let i = 1; i <= 3 && lineNum - i >= 0; i++) {
      if (hasMetadataException(lines[lineNum - i])) {
        hasAnnotation = true;
        break;
      }
    }

    const previousLine = lineNum > 0 ? lines[lineNum - 1] : '';
    const lineWithContext = previousLine + ' ' + line;

    // Check each forbidden pattern
    FORBIDDEN_PATTERNS.forEach(({ pattern, description, severity, classification }) => {
      if (line.includes(pattern)) {
        // Check for metadata exception on current line OR previous lines
        if (hasMetadataException(line) || hasAnnotation) {
          return; // Skip - already annotated
        }

        const violationType = classifyViolation(lineWithContext, pattern);

        // Skip metadata-approved violations (already annotated)
        if (violationType === 'metadata-approved') {
          return;
        }

        // Determine actual severity based on classification
        let actualSeverity = severity;
        let violationClassification = classification;

        if (violationType === 'metadata-allowed') {
          // Allowed metadata pattern - skip
          return;
        } else if (violationType === 'metadata-suspicious') {
          // Suspicious flag - warn but don't block
          actualSeverity = 'WARN';
          violationClassification = 'metadata-suspicious';
        } else if (violationType === 'metadata-unknown') {
          // Unknown metadata - low priority warning
          actualSeverity = 'INFO';
          violationClassification = 'metadata-unknown';
        } else if (violationType === 'authoritative') {
          // Authoritative mutations - always error
          actualSeverity = 'ERROR';
          violationClassification = 'authoritative';
        }

        violations.push({
          line: lineNum + 1,
          content: line.trim(),
          pattern,
          description,
          severity: actualSeverity,
          classification: violationClassification,
          type: violationType
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
    `\n   Fix: Use ActorEngine.updateActor() instead of direct actor.update()`,  // @mutation-exception: Linter pattern/output definitions
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

  // Group violations by classification
  const authoritative = allViolations.filter(v => v.classification === 'authoritative');
  const metadataSuspicious = allViolations.filter(v => v.classification === 'metadata-suspicious');
  const metadataUnknown = allViolations.filter(v => v.classification === 'metadata-unknown');

  // Determine if we should fail
  const shouldFail = authoritative.length > 0;

  // Report
  if (shouldFail) {
    console.log(`❌ FAIL: ${authoritative.length} authoritative violation(s) found (blocking)\n`);
  } else if (metadataSuspicious.length > 0) {
    console.log(`⚠️  WARNINGS: ${metadataSuspicious.length} suspicious metadata flag(s) found\n`);
  }

  if (authoritative.length > 0) {
    console.log(`\n🚫 AUTHORITATIVE MUTATIONS (${authoritative.length}) - CI BLOCKING:\n`);
    authoritative.forEach(v => {
      const relPath = path.relative(ROOT, v.file);
      console.log(`  ${relPath}:${v.line}`);
      console.log(`  ❌ ${v.description}`);
      console.log(`  Pattern: ${v.pattern}`);
      console.log(`  Fix: ${generateSuggestion(v)}`);
      console.log('');
    });
  }

  if (metadataSuspicious.length > 0) {
    console.log(`\n⚠️  SUSPICIOUS METADATA FLAGS (${metadataSuspicious.length}) - REVIEW NEEDED:\n`);
    metadataSuspicious.forEach(v => {
      const relPath = path.relative(ROOT, v.file);
      const flagName = extractFlagName(v.content);
      console.log(`  ${relPath}:${v.line}`);
      console.log(`  ⚠️  ${v.description}`);
      console.log(`  Flag: ${flagName}`);
      console.log(`  Note: This flag contains a suspicious keyword. Verify it's UI-only.`);
      console.log(`  If metadata: add comment "// @mutation-exception: metadata" above`);
      console.log('');
    });
  }

  if (metadataUnknown.length > 0) {
    console.log(`\n ℹ️  UNKNOWN METADATA (${metadataUnknown.length}) - INFORMATIONAL:\n`);
    metadataUnknown.forEach(v => {
      const relPath = path.relative(ROOT, v.file);
      const flagName = extractFlagName(v.content);
      console.log(`  ${relPath}:${v.line}`);
      console.log(`  ℹ️  ${v.description}`);
      console.log(`  Flag: ${flagName}`);
      console.log(`  Note: Unknown flag pattern. Consider annotating as metadata if appropriate.`);
      console.log('');
    });
  }

  // Summary
  console.log('='.repeat(70));
  console.log('MUTATION GOVERNANCE SUMMARY');
  console.log('='.repeat(70));
  console.log(`\nTotal patterns found: ${allViolations.length}`);
  console.log(`  ❌ Authoritative mutations: ${authoritative.length} (BLOCKING)`);
  console.log(`  ⚠️  Suspicious metadata: ${metadataSuspicious.length} (review)`);
  console.log(`  ℹ️  Unknown metadata: ${metadataUnknown.length} (info)`);

  // @mutation-exception: Linter output displaying violation examples (not executing mutations)
  console.log('\n📖 CLASSIFICATION GUIDE\n');
  console.log('❌ AUTHORITATIVE (must fix):');
  console.log('  - actor.update(...)');  // @mutation-exception: Linter pattern/output definitions
  console.log('  - actor.createEmbeddedDocuments(...)');  // @mutation-exception: Linter pattern/output definitions
  console.log('  - actor.deleteEmbeddedDocuments(...)');  // @mutation-exception: Linter pattern/output definitions
  console.log('  - actor.updateEmbeddedDocuments(...)');  // @mutation-exception: Linter pattern/output definitions
  console.log('  - item.update(...)');  // @mutation-exception: Linter pattern/output definitions
  console.log('  → All must route through ActorEngine\n');

  console.log('⚠️  METADATA (allowed if annotated):');
  console.log('  - actor.setFlag(...) / actor.unsetFlag(...)');  // @mutation-exception: Linter pattern/output definitions
  console.log('  → OK if UI-only, session-scoped, or encounter-scoped');
  console.log('  → Add // @mutation-exception: metadata if confirmed UI-only\n');

  console.log('📖 REMEDY:\n');
  console.log('For AUTHORITATIVE violations:');
  console.log('  await actor.update(...) → await ActorEngine.updateActor(...)');  // @mutation-exception: Linter pattern/output definitions
  console.log('  await actor.createEmbeddedDocuments(...) → await ActorEngine.createEmbeddedDocuments(...)\n');  // @mutation-exception: Linter pattern/output definitions

  console.log('For METADATA violations:');
  console.log('  // @mutation-exception: metadata');
  console.log('  await actor.setFlag(...);\n');

  console.log('Documentation: See PERMANENT-FIX-SUMMARY.md');
  console.log('='.repeat(70));

  // Fail only if authoritative mutations found
  if (shouldFail) {
    process.exit(1);
  }

  // Pass with warnings visible
  process.exit(0);
}

// ============================================================================
// EXECUTION
// ============================================================================

runLint();

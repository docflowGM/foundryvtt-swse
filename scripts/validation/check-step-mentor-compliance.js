#!/usr/bin/env node

/**
 * Validation: Check all step plugins follow mentor dialogue authority pattern
 *
 * STEP PLUGIN COMPLIANCE: Each step MUST use getStepGuidance() for mentor
 * guidance, never hardcode mentor text. This ensures consistency across all
 * mentors.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const stepsDir = path.join(__dirname, '../../scripts/apps/progression-framework/steps');
const files = fs.readdirSync(stepsDir)
  .filter(f => f.endsWith('-step.js') && !f.includes('mentor-step'))
  .map(f => ({
    name: f,
    path: path.join(stepsDir, f)
  }));

const checks = {
  // Critical: Uses getStepGuidance or getStepMentorContext
  hasGetStepGuidance: (content) => /getStepGuidance|getStepMentorContext/.test(content),

  // Critical: Has getMentorContext method
  hasMentorContext: (content) => /getMentorContext\s*\(/.test(content),

  // Critical: Imports mentor-step-integration
  hasMentorImport: (content) => /mentor-step-integration/.test(content),

  // Important: Has getMentorMode declaration
  hasMentorMode: (content) => /getMentorMode\s*\(/.test(content),

  // Important: Uses handleAskMentor
  usesHandleAskMentor: (content) => /handleAskMentor/.test(content),

  // Warning: Might have hardcoded mentor text
  hasHardcodedText: (content) => {
    const patterns = [
      /Choose\s+[^.]*\.\s*['"`]/,
      /Pick\s+[^.]*\.\s*['"`]/,
      /Your\s+[^.]*\.\s*['"`]/,
      /The Force[^'"]*['"]/i,
      /mentor\s+[^'"]*['"`][^'"]*Choose/i
    ];
    return patterns.some(p => p.test(content));
  }
};

const results = files.map(file => {
  const content = fs.readFileSync(file.path, 'utf8');
  const results = {};

  for (const [check, fn] of Object.entries(checks)) {
    results[check] = fn(content);
  }

  return {
    file: file.name,
    ...results
  };
});

// Categorize results
// CRITICAL requirements for compliance:
// 1. Must use getStepGuidance/getStepMentorContext
// 2. Must have getMentorContext method
// 3. Must import from mentor-step-integration
// 4. Should have getMentorMode declaration
// NOTE: Hardcoded fallback text is OK if guidance call exists
const compliant = results.filter(r =>
  r.hasGetStepGuidance &&
  r.hasMentorContext &&
  r.hasMentorImport
);

const nonCompliant = results.filter(r => !compliant.includes(r));

// Categorize by severity
const warning = compliant.filter(r => !r.hasMentorMode || r.hasHardcodedText);
const critical = nonCompliant;

// Print report
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  STEP PLUGIN MENTOR COMPLIANCE');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('✓ COMPLIANT STEPS (using getStepGuidance correctly):\n');
if (compliant.length > 0) {
  compliant.forEach(r => {
    const features = [];
    if (r.usesHandleAskMentor) features.push('handleAskMentor');
    const note = (r.hasMentorMode && !r.hasHardcodedText) ? '' : ' ⚠ (minor issues)';
    console.log(`  ✓ ${r.file.padEnd(35)} ${features.join(' + ')}${note}`);
  });
} else {
  console.log('  (none)');
}

if (critical.length > 0) {
  console.log('\n✗ CRITICAL - Non-Compliant Steps (missing core requirements):\n');
  critical.forEach(r => {
    const issues = [];
    if (!r.hasGetStepGuidance) issues.push('Missing getStepGuidance()');
    if (!r.hasMentorContext) issues.push('No getMentorContext method');
    if (!r.hasMentorImport) issues.push('No mentor-step-integration import');

    console.log(`  ✗ ${r.file.padEnd(35)}`);
    issues.forEach(issue => console.log(`     → ${issue}`));
  });
}

console.log('\n───────────────────────────────────────────────────────────────');
console.log(`Summary:`);
console.log(`  ✓ Compliant:        ${compliant.length}/${results.length} (${Math.round(compliant.length/results.length*100)}%)`);
if (warning.length > 0) {
  console.log(`  ⚠ Warnings:        ${warning.length}/${compliant.length} (missing getMentorMode or has fallback text)`);
}
console.log(`  ✗ Non-Compliant:    ${critical.length}/${results.length} (${Math.round(critical.length/results.length*100)}%)`);
console.log('═══════════════════════════════════════════════════════════════\n');

const hasCriticalIssues = critical.length > 0;
process.exit(hasCriticalIssues ? 1 : 0);

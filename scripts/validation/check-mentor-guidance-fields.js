#!/usr/bin/env node

/**
 * Validation: Check all mentors have required guidance fields
 *
 * MENTOR DIALOGUE AUTHORITY: Each mentor MUST provide guidance for all
 * step types. This ensures any step can call getStepGuidance() and receive
 * a response.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mentorsDir = path.join(__dirname, '../../data/dialogue/mentors');
const requiredFields = [
  'species',
  'class',
  'background',
  'talents',
  'abilities',
  'skills',
  'languages',
  'multiclass',
  'forcePowers',
  'hp',
  'summary'
];

const results = {};

// Get all mentor directories
const mentors = fs.readdirSync(mentorsDir)
  .filter(f => fs.statSync(path.join(mentorsDir, f)).isDirectory());

mentors.forEach(mentor => {
  const mentorDir = path.join(mentorsDir, mentor);
  const files = fs.readdirSync(mentorDir).filter(f => f.endsWith('.json'));

  // Find main dialogue file (not species-dialogue or advisory)
  const dialogueFile = files.find(f =>
    f.includes('dialogue') &&
    !f.includes('species') &&
    !f.includes('advisory')
  );

  if (!dialogueFile) {
    results[mentor] = { error: 'No main dialogue file' };
    return;
  }

  const filePath = path.join(mentorDir, dialogueFile);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    results[mentor] = { error: 'JSON parse error' };
    return;
  }

  // Handle both formats:
  // 1. { mentor_id: { guidance: {...} } }
  // 2. { guidance: {...} }
  let mentorData = data;
  if (data.guidance === undefined) {
    const mentorKey = Object.keys(data)[0];
    mentorData = data[mentorKey];
  }

  if (!mentorData || !mentorData.guidance) {
    results[mentor] = { error: 'No guidance section' };
    return;
  }

  const present = Object.keys(mentorData.guidance);
  const missing = requiredFields.filter(f => !present.includes(f));

  results[mentor] = { present, missing };
});

// Print summary
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  MENTOR DIALOGUE AUTHORITY: Guidance Fields Validation');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Required fields:', requiredFields.join(', '), '\n');

const sorted = Object.entries(results)
  .sort((a, b) => {
    const aErr = a[1].error;
    const bErr = b[1].error;
    if (aErr && !bErr) return 1;
    if (!aErr && bErr) return -1;
    if (aErr && bErr) return 0;
    return b[1].missing.length - a[1].missing.length;
  });

let completeCount = 0;
let incompleteCount = 0;
let errorCount = 0;

sorted.forEach(([mentor, info]) => {
  if (info.error) {
    console.log(`⊘ ${mentor.padEnd(25)} Error: ${info.error}`);
    errorCount++;
  } else if (info.missing.length === 0) {
    console.log(`✓ ${mentor.padEnd(25)} Complete`);
    completeCount++;
  } else {
    console.log(`✗ ${mentor.padEnd(25)} Missing: ${info.missing.join(', ')}`);
    incompleteCount++;
  }
});

console.log('\n───────────────────────────────────────────────────────────────');
console.log(`Summary:`);
console.log(`  ✓ Complete:   ${completeCount}/${mentors.length}`);
if (incompleteCount > 0) {
  console.log(`  ✗ Incomplete: ${incompleteCount}/${mentors.length}`);
}
if (errorCount > 0) {
  console.log(`  ⊘ Errors:    ${errorCount}/${mentors.length}`);
}
console.log('═══════════════════════════════════════════════════════════════\n');

const allComplete = completeCount === mentors.length;
process.exit(allComplete ? 0 : 1);

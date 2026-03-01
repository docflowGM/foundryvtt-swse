#!/usr/bin/env node

/**
 * CLI Validator for Advisory Schema v1.1
 *
 * Usage:
 *   node validate-advisory.js <file-or-glob-pattern>
 *
 * Examples:
 *   node validate-advisory.js data/dialogue/mentors/**/_advisory.json
 *   node validate-advisory.js data/dialogue/mentors/axiom/_advisory.json
 *
 * Exit codes:
 *   0 = all files valid
 *   1 = validation failed
 *   2 = file not found or invalid arguments
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { validateAdvisory } = require('../engine/progression/engine/validators/advisory-validator');

const SCHEMA_PATH = path.resolve(__dirname, '../../schemas/advisory.schema.json');

function validateFiles(pattern) {
  const matches = glob.sync(pattern, {
    cwd: process.cwd(),
    absolute: true
  });

  if (matches.length === 0) {
    console.error(`No files matching pattern: ${pattern}`);
    process.exit(2);
  }

  let allValid = true;
  const results = [];

  for (const file of matches) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const advisory = JSON.parse(content);
      const result = validateAdvisory(advisory, SCHEMA_PATH);

      results.push({
        file,
        valid: result.valid,
        errors: result.errors
      });

      if (!result.valid) {
        allValid = false;
      }
    } catch (err) {
      allValid = false;
      results.push({
        file,
        valid: false,
        errors: [`Failed to read/parse file: ${err.message}`]
      });
    }
  }

  // Output results
  for (const result of results) {
    if (result.valid) {
      console.log(`✓ ${result.file}`);
    } else {
      console.error(`✗ ${result.file}`);
      for (const error of result.errors) {
        console.error(`    ${error}`);
      }
    }
  }

  process.exit(allValid ? 0 : 1);
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: validate-advisory.js <file-or-glob-pattern>');
  process.exit(2);
}

validateFiles(args[0]);

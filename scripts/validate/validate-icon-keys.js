#!/usr/bin/env node

/* eslint-disable no-undef */
/**
 * Validate that all {{getIconClass}} calls use valid icon keys
 * Runs via lint-staged on .hbs files before commit
 */

import fs from 'fs';

// Import ICONS constant
import { ICONS } from "/systems/foundryvtt-swse/scripts/utils/icon-constants.js";

const validKeys = new Set(Object.keys(ICONS));
const files = process.argv.slice(2);

let hasErrors = false;

files.forEach(file => {
  if (!file.endsWith('.hbs')) {return;}

  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  // Match {{getIconClass 'key'}} or {{getIconClass "key"}}
  const iconRegex = /\{\{getIconClass\s+['"](\w+)['"]\}\}/g;

  lines.forEach((line, lineNum) => {
    let match;
    while ((match = iconRegex.exec(line)) !== null) {
      const key = match[1];
      if (!validKeys.has(key)) {
        console.error(
          `❌ ${file}:${lineNum + 1} - Unknown icon key: '${key}'`
        );
        console.error(
          `   Did you mean: ${suggestSimilar(key, Array.from(validKeys)).join(', ')}`
        );
        hasErrors = true;
      }
    }
  });
});

if (hasErrors) {
  console.error('\n⚠️  Icon key validation failed. Check ICONS constant in scripts/utils/icon-constants.js');
  process.exit(1);
}

console.log('✓ All icon keys valid');
process.exit(0);

/**
 * Suggest similar keys using Levenshtein distance
 */
function suggestSimilar(input, keys, maxDistance = 2) {
  return keys
    .map(key => ({
      key,
      distance: levenshtein(input.toLowerCase(), key.toLowerCase())
    }))
    .filter(({ distance }) => distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(({ key }) => `'${key}'`);
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshtein(a, b) {
  const matrix = [];

  for (let j = 0; j <= b.length; j++) {
    matrix[0] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    matrix[i * (b.length + 1)] = i;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i * (b.length + 1) + j] = Math.min(
        matrix[(i - 1) * (b.length + 1) + j] + 1,
        matrix[i * (b.length + 1) + j - 1] + 1,
        matrix[(i - 1) * (b.length + 1) + j - 1] + cost
      );
    }
  }

  return matrix[a.length * (b.length + 1) + b.length];
}

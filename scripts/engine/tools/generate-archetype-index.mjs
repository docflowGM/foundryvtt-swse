#!/usr/bin/env node
/**
 * tools/generate-archetype-index.mjs
 *
 * Generates /data/archetype-index.json from /data/class-archetypes.json.
 *
 * IDs are stable, generated, and never hand-authored:
 *   <classKey>.<archetypeKey>
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function main() {
  const inputRel = process.argv[2] || 'data/class-archetypes.json';
  const outputRel = process.argv[3] || 'data/archetype-index.json';

  const inputPath = path.resolve(process.cwd(), inputRel);
  const outputPath = path.resolve(process.cwd(), outputRel);

  if (!fs.existsSync(inputPath)) {
    console.error(`[generate-archetype-index] Missing input: ${inputPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  if (!isObject(data) || !isObject(data.classes)) {
    console.error('[generate-archetype-index] Invalid class-archetypes.json shape: missing "classes"');
    process.exit(1);
  }

  const ids = [];
  for (const [classKey, classBlock] of Object.entries(data.classes)) {
    if (!isObject(classBlock) || !isObject(classBlock.archetypes)) continue;
    for (const archetypeKey of Object.keys(classBlock.archetypes)) {
      ids.push(`${classKey}.${archetypeKey}`);
    }
  }

  ids.sort();

  const out = {
    version: '1.0',
    generatedFrom: inputRel,
    ids
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2) + '\n', 'utf8');

  console.log(`[generate-archetype-index] Wrote ${outputRel} (${ids.length} ids)`);
}

main();

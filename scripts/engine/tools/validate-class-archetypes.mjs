#!/usr/bin/env node
/**
 * tools/validate-class-archetypes.mjs
 *
 * CI / pre-commit gate for /data/class-archetypes.json.
 *
 * NOTE: This intentionally mirrors engine/validateClassArchetypes.js to avoid
 * Node ESM/CJS interop surprises in repositories without `type: module`.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REQUIRED_ARCHETYPE_FIELDS = [
  'name',
  'status',
  'mechanicalBias',
  'roleBias',
  'attributeBias',
  'talentKeywords',
  'featKeywords',
  'notes'
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateClassArchetypes(data) {
  const errors = [];
  let classCount = 0;
  let archetypeCount = 0;
  let activeCount = 0;
  let stubCount = 0;

  if (!isObject(data)) {
    return { valid: false, errors: ['[ROOT] Expected an object at JSON root'], stats: { classCount: 0, archetypeCount: 0, activeCount: 0, stubCount: 0 } };
  }

  if (!isObject(data.classes)) {
    return { valid: false, errors: ['[ROOT] Missing or invalid "classes" object'], stats: { classCount: 0, archetypeCount: 0, activeCount: 0, stubCount: 0 } };
  }

  for (const [classKey, classBlock] of Object.entries(data.classes)) {
    classCount++;

    if (!isObject(classBlock)) {
      errors.push(`[CLASS:${classKey}] Expected object`);
      continue;
    }
    if (!isObject(classBlock.archetypes)) {
      errors.push(`[CLASS:${classKey}] Missing or invalid "archetypes" object`);
      continue;
    }

    for (const [archKey, arch] of Object.entries(classBlock.archetypes)) {
      archetypeCount++;

      if (!isObject(arch)) {
        errors.push(`[ARCH:${classKey}.${archKey}] Expected object`);
        continue;
      }

      const missing = REQUIRED_ARCHETYPE_FIELDS.filter((f) => !(f in arch));
      if (missing.length) {
        errors.push(`[ARCH:${classKey}.${archKey}] Missing fields: ${missing.join(', ')}`);
      }

      const status = arch.status;
      if (status === 'active') activeCount++;
      else if (status === 'stub') stubCount++;
      else errors.push(`[ARCH:${classKey}.${archKey}] Invalid status: ${String(status)} (expected "active"|"stub")`);

      if (typeof arch.name !== 'string' || !arch.name.trim()) {
        errors.push(`[ARCH:${classKey}.${archKey}] "name" must be a non-empty string`);
      }

      if (!isObject(arch.roleBias)) errors.push(`[ARCH:${classKey}.${archKey}] "roleBias" must be an object`);
      if (!isObject(arch.attributeBias)) errors.push(`[ARCH:${classKey}.${archKey}] "attributeBias" must be an object`);

      if (!Array.isArray(arch.talentKeywords) || arch.talentKeywords.some((x) => typeof x !== 'string')) {
        errors.push(`[ARCH:${classKey}.${archKey}] "talentKeywords" must be string[]`);
      }
      if (!Array.isArray(arch.featKeywords) || arch.featKeywords.some((x) => typeof x !== 'string')) {
        errors.push(`[ARCH:${classKey}.${archKey}] "featKeywords" must be string[]`);
      }
    }
  }

  return { valid: errors.length === 0, errors, stats: { classCount, archetypeCount, activeCount, stubCount } };
}

function main() {
  const rel = process.argv[2] || 'data/class-archetypes.json';
  const filePath = path.resolve(process.cwd(), rel);

  if (!fs.existsSync(filePath)) {
    console.error(`[validate-class-archetypes] Missing file: ${filePath}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`[validate-class-archetypes] Invalid JSON: ${filePath}`);
    console.error(String(err));
    process.exit(1);
  }

  const result = validateClassArchetypes(data);

  if (!result.valid) {
    console.error('[validate-class-archetypes] ❌ Validation failed');
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(
    `[validate-class-archetypes] ✅ OK: ${result.stats.classCount} classes, ${result.stats.archetypeCount} archetypes (active=${result.stats.activeCount}, stub=${result.stats.stubCount})`
  );
}

main();

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TAXONOMY_PATH = path.join(ROOT, 'data/feat-taxonomy/expanded-feat-bucket-taxonomy.json');
const TEMPLATE_PATH = path.join(ROOT, 'data/feat-taxonomy/feat-bucket-taxonomy-migration-template.json');
const REPORT_DIR = path.join(ROOT, 'docs/audits/generated');
const REPORT_JSON = path.join(REPORT_DIR, 'feat-bucket-taxonomy-skeleton-report.json');
const REPORT_MD = path.join(REPORT_DIR, 'feat-bucket-taxonomy-skeleton-report.md');

const strict = process.argv.includes('--strict');
const errors = [];
const warnings = [];
const ok = [];

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing ${label}: ${path.relative(ROOT, filePath)}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`Invalid JSON in ${label}: ${error.message}`);
    return null;
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} must be a non-empty string.`);
    return false;
  }
  ok.push(`${label} present`);
  return true;
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
  ok.push(`${label} values are unique (${seen.size})`);
}

const taxonomy = readJson(TAXONOMY_PATH, 'expanded feat bucket taxonomy');
const template = readJson(TEMPLATE_PATH, 'feat bucket taxonomy migration template');

if (taxonomy) {
  if (taxonomy.status !== 'skeleton_only') {
    errors.push('Taxonomy status must remain skeleton_only in Phase 7C.5.');
  } else {
    ok.push('taxonomy status is skeleton_only');
  }

  if (taxonomy.intent?.noCatalogMutation !== true) {
    errors.push('taxonomy.intent.noCatalogMutation must be true.');
  } else {
    ok.push('noCatalogMutation guardrail present');
  }

  if (!Array.isArray(taxonomy.buckets) || taxonomy.buckets.length === 0) {
    errors.push('taxonomy.buckets must be a non-empty array.');
  } else {
    const bucketIds = taxonomy.buckets.map((bucket) => bucket.id);
    assertUnique(bucketIds, 'bucket id');

    for (const bucket of taxonomy.buckets) {
      requireString(bucket.id, `bucket id for ${bucket.label ?? '<missing label>'}`);
      requireString(bucket.label, `bucket label for ${bucket.id ?? '<missing id>'}`);
      requireString(bucket.description, `bucket description for ${bucket.id ?? '<missing id>'}`);

      if (!Array.isArray(bucket.subbuckets) || bucket.subbuckets.length === 0) {
        errors.push(`Bucket ${bucket.id} must define at least one subbucket.`);
        continue;
      }

      const subbucketIds = bucket.subbuckets.map((subbucket) => subbucket.id);
      assertUnique(subbucketIds, `subbucket id in ${bucket.id}`);
      for (const subbucket of bucket.subbuckets) {
        requireString(subbucket.id, `subbucket id in ${bucket.id}`);
        requireString(subbucket.label, `subbucket label ${bucket.id}/${subbucket.id ?? '<missing id>'}`);
      }
    }

    const requiredBuckets = [
      'combat',
      'weapon_armor',
      'force',
      'skills',
      'tech_equipment',
      'droid',
      'cybernetics_implants',
      'starship_vehicle',
      'recovery_survival',
      'social_intrigue',
      'species_origin',
      'leadership_allies',
      'character',
      'gm_metadata'
    ];
    for (const required of requiredBuckets) {
      if (!bucketIds.includes(required)) errors.push(`Missing required bucket: ${required}`);
      else ok.push(`required bucket present: ${required}`);
    }

    const forceBucket = taxonomy.buckets.find((bucket) => bucket.id === 'force');
    if (!forceBucket?.classificationGuardrail?.toLowerCase().includes('not sufficient')) {
      errors.push('Force bucket must include the keyword-classification guardrail.');
    } else {
      ok.push('Force keyword guardrail present');
    }
  }

  if (!taxonomy.migrationPolicy?.phase7c5?.toLowerCase().includes('do not mutate')) {
    errors.push('migrationPolicy.phase7c5 must explicitly prohibit metadata mutation.');
  } else {
    ok.push('Phase 7C.5 mutation guardrail present');
  }
}

if (template) {
  if (template.status !== 'template_only') errors.push('Migration template status must remain template_only.');
  else ok.push('migration template is template_only');

  if (!Array.isArray(template.assignments)) errors.push('Migration template assignments must be an array.');
  else if (template.assignments.length !== 0) errors.push('Phase 7C.5 migration template must not contain feat assignments.');
  else ok.push('migration template has zero feat assignments');
}

const report = {
  generatedAt: new Date().toISOString(),
  phase: '7C.5',
  scope: 'expanded feat bucket taxonomy skeleton',
  strict,
  summary: {
    buckets: taxonomy?.buckets?.length ?? 0,
    subbuckets: taxonomy?.buckets?.reduce((sum, bucket) => sum + (bucket.subbuckets?.length ?? 0), 0) ?? 0,
    migrationAssignments: template?.assignments?.length ?? null,
    ok: ok.length,
    warnings: warnings.length,
    errors: errors.length
  },
  ok,
  warnings,
  errors
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);

const md = [
  '# Feat Bucket Taxonomy Skeleton Audit',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  '## Scope',
  '',
  'Phase 7C.5 validates the new expanded feat bucket taxonomy skeleton only. It intentionally does not require or apply feat catalog metadata changes.',
  '',
  '## Summary',
  '',
  `- Buckets: ${report.summary.buckets}`,
  `- Subbuckets: ${report.summary.subbuckets}`,
  `- Migration assignments: ${report.summary.migrationAssignments}`,
  `- OK: ${report.summary.ok}`,
  `- Warnings: ${report.summary.warnings}`,
  `- Errors: ${report.summary.errors}`,
  '',
  '## Guardrails',
  '',
  '- Do not classify feats from title keywords alone.',
  '- Force bucket requires Force mechanics, not just the word Force in the name.',
  '- Phase 7C.5 must not modify `data/feat-catalog.json`, `packs/feat-catalog.db`, or existing feat metadata.',
  '- Future mapping should use source-aware review or high-confidence manifest rules.',
  '',
  report.errors.length ? '## Errors' : '## Errors\n\nNone.',
  ...(report.errors.length ? ['', ...report.errors.map((error) => `- ${error}`)] : []),
  '',
  report.warnings.length ? '## Warnings' : '## Warnings\n\nNone.',
  ...(report.warnings.length ? ['', ...report.warnings.map((warning) => `- ${warning}`)] : []),
  ''
].join('\n');
fs.writeFileSync(REPORT_MD, md);

console.log(`Feat bucket taxonomy skeleton audit: ${ok.length} ok, ${warnings.length} warnings, ${errors.length} errors`);
console.log(`Wrote ${path.relative(ROOT, REPORT_JSON)}`);
console.log(`Wrote ${path.relative(ROOT, REPORT_MD)}`);

if (errors.length || (strict && warnings.length)) process.exit(1);

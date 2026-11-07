#!/usr/bin/env node

/**
 * check-droid-customization-validation-authority.mjs — droid customization
 * (Garage) resale/purchase validation single-authority guard (P0-2
 * correction pass, "fix(droids): correct stock combat and customization
 * validation").
 *
 * Enforces that DroidCustomizationEngine.previewDroidCustomization() and
 * applyDroidCustomization() both route every add/remove change-set through
 * normalizeDroidCustomizationChangeSet() — the single function that
 * deduplicates ids and verifies a "remove" id is CONFIRMED in the installation ledger before
 * any resale is computed. Before this authority existed, previewDroidCustomization()
 * paid resale for any catalog id without checking installation state and
 * without deduplication, letting a forged request repeat a "remove" id
 * multiple times to mint resale credits for a single physical component.
 *
 * Report-only by default; --strict exits non-zero on any violation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');

const ENGINE_FILE = path.join(ROOT, 'scripts/engine/customization/droid-customization-engine.js');

function main() {
  const violations = [];
  const source = fs.readFileSync(ENGINE_FILE, 'utf8');

  if (!/function normalizeDroidCustomizationChangeSet\s*\(/.test(source)) {
    violations.push({ check: '1: normalizer exists', detail: 'normalizeDroidCustomizationChangeSet() is missing from droid-customization-engine.js' });
  }

  const previewBody = source.slice(
    source.indexOf('static previewDroidCustomization('),
    source.indexOf('static async applyDroidCustomization(')
  );
  if (!/normalizeDroidCustomizationChangeSet\(/.test(previewBody)) {
    violations.push({ check: '2: preview validation routing', detail: 'previewDroidCustomization() must call normalizeDroidCustomizationChangeSet() before pricing add/remove' });
  }

  const applyBody = source.slice(source.indexOf('static async applyDroidCustomization('));
  const normalizeCallsInApply = (applyBody.match(/normalizeDroidCustomizationChangeSet\(/g) || []).length;
  if (normalizeCallsInApply < 1) {
    violations.push({ check: '3: apply revalidation routing', detail: 'applyDroidCustomization() must independently revalidate via normalizeDroidCustomizationChangeSet() immediately before mutating, not trust the preview result alone' });
  }

  // The normalizer itself must dedupe (Set) and check installed state
  // (collectInstalledDroidPartIds) rather than trusting raw add/remove
  // arrays — the exact shape of the P0-2 fix.
  const normalizerBody = source.slice(
    source.indexOf('function normalizeDroidCustomizationChangeSet('),
    source.indexOf('function normalizeDroidCustomizationChangeSet(') === -1 ? undefined
      : source.indexOf('\n}\n', source.indexOf('function normalizeDroidCustomizationChangeSet('))
  );
  if (normalizerBody && !/new Set\(/.test(normalizerBody)) {
    violations.push({ check: '4: deduplication', detail: 'normalizeDroidCustomizationChangeSet() must deduplicate add/remove ids (e.g. via Set)' });
  }
  // F7 (U-0): removal/resale may be authorized ONLY by confirmed ledger
  // evidence. The helper must filter on the resolver's deciding source being
  // the installation ledger, and the normalizer's bare-id removal branch must
  // gate on that confirmed set - not on the any-source "installed" set.
  const confirmedHelper = source.match(/function collectConfirmedComponents\s*\([^)]*\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
  if (!/primarySource\??\.kind\s*===\s*['"]installedLedger['"]/.test(confirmedHelper)) {
    violations.push({ check: '5a: confirmed-evidence helper', detail: "collectConfirmedComponents() must select components whose primarySource.kind === 'installedLedger'" });
  }
  if (normalizerBody) {
    if (!/collectConfirmedComponents\(/.test(normalizerBody)) {
      violations.push({ check: '5b: removal uses confirmed evidence', detail: 'normalizeDroidCustomizationChangeSet() must derive removable hardware from collectConfirmedComponents()' });
    }
    const removeBranch = normalizerBody.slice(normalizerBody.indexOf('const removeSpecs = []'));
    if (!/!confirmed\.has\(id\)/.test(removeBranch)) {
      violations.push({ check: '5c: removal gate', detail: 'the bare-id removal branch must refuse unless confirmed.has(id)' });
    }
    if (/!installed\.has\(id\)\s*\)\s*\{\s*return fail\([^)]*cannot be removed/.test(removeBranch)) {
      violations.push({ check: '5d: no any-source removal gate', detail: 'removal must not be authorized by the any-source installed set' });
    }
  }

  console.log('='.repeat(72));
  console.log('  DROID CUSTOMIZATION VALIDATION AUTHORITY GUARD');
  console.log('='.repeat(72));

  if (violations.length === 0) {
    console.log('\nNo violations found — droid customization resale/purchase validation remains a single, deduplicated, installed-state-checked authority.');
    console.log('='.repeat(72));
    process.exit(0);
  }

  console.log(`\nFound ${violations.length} violation(s):\n`);
  for (const violation of violations) {
    console.log(`  [${violation.check}]`);
    console.log(`    ${violation.detail}`);
  }
  console.log('='.repeat(72));

  process.exit(STRICT ? 1 : 0);
}

main();

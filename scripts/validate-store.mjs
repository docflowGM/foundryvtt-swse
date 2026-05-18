#!/usr/bin/env node

/**
 * validate-store.mjs
 * Phase 4: Store validation script to prevent regressions.
 *
 * Checks:
 * - Phase 1: priceDisplay fields exist in views
 * - Phase 2: navigationModel and armor labels exist
 * - Phase 3: Concept-aligned CSS scoping
 * - Mutation safety: No direct actor.system writes in Store layer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

let passCount = 0;
let failCount = 0;
const failures = [];

function log(msg) {
  console.log(msg);
}

function pass(msg) {
  passCount++;
  log(`  ✓ ${msg}`);
}

function fail(msg, details = '') {
  failCount++;
  log(`  ✗ ${msg}`);
  if (details) log(`    ${details}`);
  failures.push(msg);
}

function searchFile(filePath, patterns) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const results = {};
    for (const [key, pattern] of Object.entries(patterns)) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
      const matches = content.match(regex) || [];
      results[key] = matches.length;
    }
    return results;
  } catch (e) {
    return {};
  }
}

function checkPhase1Pricing() {
  log('\n=== PHASE 1: PRICING INTEGRITY ===');

  const storeMainResults = searchFile(
    path.join(rootDir, 'scripts/apps/store/store-main.js'),
    {
      cost: 'cost:',
      costUsed: 'costUsed:',
      finalCost: 'finalCost:'
    }
  );

  if (storeMainResults.cost > 0 && storeMainResults.finalCost > 0) {
    pass('Store item view includes cost and finalCost fields');
  } else {
    fail('Store pricing fields missing from item views');
  }

  const vehicleCardResults = searchFile(
    path.join(rootDir, 'templates/apps/store/vehicle-card-v2.hbs'),
    {
      newCost: 'costNew|costUsed|newCost',
      usedCost: 'costUsed|usedCost'
    }
  );

  if (vehicleCardResults.newCost > 0 || vehicleCardResults.usedCost > 0) {
    pass('Vehicle cards reference New/Used pricing');
  } else {
    fail('Vehicle card pricing not found');
  }

  // Check that templates don't directly reference raw price fields in main display
  // (Note: data attributes and vehicle new/used price display are allowed)
  const shellTemplateContent = fs.existsSync(
    path.join(rootDir, 'templates/shell/partials/surface-store.hbs')
  ) ? fs.readFileSync(path.join(rootDir, 'templates/shell/partials/surface-store.hbs'), 'utf-8') : '';

  // Count occurrences, but allow:
  // - data-price attributes (used for filtering/sorting)
  // - Vehicle new/used pricing display in detail view
  const priceReferences = shellTemplateContent.match(/{{[^}]*finalCost[^}]*}}/g) || [];
  const allowedReferences = shellTemplateContent.match(/data-price|newCost|usedCost/g) || [];

  // Allow price references:
  // - In data-price attributes (for filtering/sorting metadata)
  // - In vehicle new/used pricing display (details section)
  // - In detail-price-line elements
  // More than 5 would be suspicious (indicates card grid or other bulk display using raw prices)
  const suspiciousFinalCost = priceReferences.filter(ref =>
    !ref.includes('data-price') && !ref.includes('detail-price-line')
  ).length;

  if (suspiciousFinalCost <= 2) {
    pass('Shell template pricing references are appropriate (data attributes and vehicle prices)');
  } else {
    fail('Shell template references raw price fields too frequently',
      `Found ${suspiciousFinalCost} potentially suspicious references`);
  }
}

function checkPhase2Navigation() {
  log('\n=== PHASE 2: NAVIGATION INTEGRITY ===');

  const storeSharedResults = searchFile(
    path.join(rootDir, 'scripts/apps/store/store-shared.js'),
    { buildStoreNavigationModel: 'export function buildStoreNavigationModel' }
  );

  if (storeSharedResults.buildStoreNavigationModel > 0) {
    pass('buildStoreNavigationModel function exists');
  } else {
    fail('buildStoreNavigationModel function not found');
  }

  const shellTemplateResults = searchFile(
    path.join(rootDir, 'templates/shell/partials/surface-store.hbs'),
    { navigationModel: 'navigationModel' }
  );

  if (shellTemplateResults.navigationModel > 0) {
    pass('Shell template uses navigationModel');
  } else {
    fail('Shell template does not reference navigationModel');
  }

  const armorLabelsResults = searchFile(
    path.join(rootDir, 'scripts/apps/store/store-shared.js'),
    {
      light: 'Light Armor',
      medium: 'Medium Armor',
      heavy: 'Heavy Armor',
      energy: 'Energy Shields'
    }
  );

  const armorCount = Object.values(armorLabelsResults).reduce((a, b) => a + b, 0);
  if (armorCount >= 4) {
    pass(`All armor subcategories defined (${armorCount} references)`);
  } else {
    fail(`Armor subcategories incomplete (${armorCount}/4)`, 'Light Armor, Medium Armor, Heavy Armor, Energy Shields required');
  }
}

function checkPhase3Layout() {
  log('\n=== PHASE 3: CONCEPT-ALIGNED LAYOUT ===');

  const shellTemplateResults = searchFile(
    path.join(rootDir, 'templates/shell/partials/surface-store.hbs'),
    {
      rootClass: 'swse-store-surface',
      browse: 'swse-store-surface__browse',
      rail: 'swse-store-surface__rail',
      grid: 'swse-store-surface__grid'
    }
  );

  const layoutCount = Object.values(shellTemplateResults).filter(v => v > 0).length;
  if (layoutCount >= 3) {
    pass(`Shell template uses concept layout classes (${layoutCount}/4)`);
  } else {
    fail(`Concept layout classes missing (${layoutCount}/4)`);
  }

  const cssResults = searchFile(
    path.join(rootDir, 'styles/system/store-surface.css'),
    {
      rootScope: '\\.swse-store-surface',
      scopedSelectors: '\\.swse-store-surface__'
    }
  );

  if (cssResults.rootScope > 0 && cssResults.scopedSelectors > 100) {
    pass(`Store CSS properly scoped (${cssResults.scopedSelectors} scoped selectors)`);
  } else {
    fail('Store CSS not properly scoped', `Root: ${cssResults.rootScope}, Scoped: ${cssResults.scopedSelectors}`);
  }
}

function checkMutationSafety() {
  log('\n=== MUTATION SAFETY ===');

  const filesToCheck = [
    'scripts/apps/store/store-main.js',
    'scripts/ui/shell/StoreSurfaceService.js',
    'scripts/ui/shell/StoreSurfaceController.js',
    'scripts/engine/store/store-engine.js'
  ];

  let dangerousFound = 0;

  for (const file of filesToCheck) {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for unsafe mutations (these are OK in transaction layer, not Store app/shell)
    const unsafePatterns = [
      { pattern: /actor\.system\s*=/, desc: 'Direct actor.system mutation' },
      { pattern: /actor\.update\(.*system/, desc: 'actor.update with system changes' },
      { pattern: /updateSource/, desc: 'updateSource call' }
    ];

    for (const { pattern, desc } of unsafePatterns) {
      if (pattern.test(content)) {
        // Check if this file should be allowed to do this (transaction files)
        if (!file.includes('transaction') && !file.includes('checkout')) {
          dangerousFound++;
          fail(`${file}: Potential unsafe mutation (${desc})`);
        }
      }
    }
  }

  if (dangerousFound === 0) {
    pass('No unsafe mutations detected in Store app/shell layer');
  }
}

function checkCSSScoping() {
  log('\n=== CSS SCOPING ===');

  const cssFiles = [
    'styles/system/store-surface.css',
    'styles/apps/store-card-grid.css'
  ];

  const unscopedPatterns = [
    /^button\b/m,
    /^\.card\b/m,
    /^\.panel\b/m,
    /^\.chip\b/m,
    /^\.tab\b/m,
    /^\.tag\b/m,
    /^\.action\b/m
  ];

  let hasUnscopedRules = false;

  for (const file of cssFiles) {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const pattern of unscopedPatterns) {
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          // Check context - if it's indented or in a comment, it's OK
          const line = lines[i];
          if (!/^\s|\/\/|\*/.test(line)) {
            fail(`${file}:${i + 1}: Unscoped selector found: ${line.trim()}`);
            hasUnscopedRules = true;
          }
        }
      }
    }
  }

  if (!hasUnscopedRules) {
    pass('All Store CSS selectors are properly scoped');
  }
}

function checkDeadFiles() {
  log('\n=== DEAD FILE AUDIT ===');

  const deadFiles = [
    { path: 'styles/apps/store.css', desc: 'Legacy Store stylesheet' },
    { path: 'styles/apps/store-cards.css', desc: 'Legacy card styles' },
    { path: 'templates/apps/store/store.hbs', desc: 'Legacy Store template' },
    { path: 'templates/apps/store/store.html', desc: 'Static Store template' }
  ];

  const systemJsonPath = path.join(rootDir, 'system.json');
  const systemJson = JSON.parse(fs.readFileSync(systemJsonPath, 'utf-8'));
  const loadedStyles = systemJson.styles?.map(s => s.replace(/^systems\/foundryvtt-swse\//, '')) || [];

  for (const { path: filePath, desc } of deadFiles) {
    const fullPath = path.join(rootDir, filePath);
    const exists = fs.existsSync(fullPath);
    const isLoaded = loadedStyles.some(s => s.includes(filePath.split('/').pop()));

    if (exists && !isLoaded) {
      pass(`${filePath}: File exists but not loaded (dead code)`);
    } else if (!exists) {
      pass(`${filePath}: Already removed`);
    }
  }
}

function printSummary() {
  log('\n' + '='.repeat(60));
  log(`VALIDATION RESULTS: ${passCount} passed, ${failCount} failed`);
  log('='.repeat(60));

  if (failCount > 0) {
    log('\nFailed Checks:');
    failures.forEach((f, i) => log(`  ${i + 1}. ${f}`));
    process.exit(1);
  } else {
    log('\n✓ All Store validation checks passed!');
    process.exit(0);
  }
}

// Run all checks
checkPhase1Pricing();
checkPhase2Navigation();
checkPhase3Layout();
checkMutationSafety();
checkCSSScoping();
checkDeadFiles();
printSummary();

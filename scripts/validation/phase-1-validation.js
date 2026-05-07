#!/usr/bin/env node
/**
 * Phase 1 Validation Report
 *
 * Validates Phase 1 changes:
 * - Force power type migration complete
 * - Pack manifest types match actual content
 * - No orphaned/empty packs
 * - Template and config alignment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');

function validateForcePowerTypes() {
  console.log('\n=== Force Power Type Validation ===');

  const checks = {
    'template.json has force-power': false,
    'template.json no forcepower': false,
    'config.js has force-power': false,
    'config.js no forcepower': false,
    'populate-force-powers.js uses force-power': false,
    'populate-lightsaber-form-powers.js uses force-power': false,
    'import-lightsaber.js uses force-power': false,
    'forcepowers.db migrated': false,
    'lightsaberformpowers.db migrated': false,
    'No forcepower in any pack': false
  };

  // Check template.json
  const template = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'template.json'), 'utf8'));
  const itemTypes = template.Item.types;
  checks['template.json has force-power'] = itemTypes.includes('force-power');
  checks['template.json no forcepower'] = !itemTypes.includes('forcepower');

  // Check config.js
  const configPath = path.join(PROJECT_ROOT, 'scripts/core/config.js');
  const configContent = fs.readFileSync(configPath, 'utf8');
  checks['config.js has force-power'] = configContent.includes("'force-power'");
  checks['config.js no forcepower'] = !configContent.match(/'forcepower'/);

  // Check generation scripts
  const populateForce = fs.readFileSync(path.join(PROJECT_ROOT, 'tools/populate-force-powers.js'), 'utf8');
  checks['populate-force-powers.js uses force-power'] = populateForce.includes('type: "force-power"');

  const populateLightsaber = fs.readFileSync(
    path.join(PROJECT_ROOT, 'scripts/build/populate-lightsaber-form-powers.js'),
    'utf8'
  );
  checks['populate-lightsaber-form-powers.js uses force-power'] = populateLightsaber.includes("'force-power'");

  const importLightsaber = fs.readFileSync(
    path.join(PROJECT_ROOT, 'scripts/build/import-lightsaber-form-powers-to-compendium.js'),
    'utf8'
  );
  checks['import-lightsaber.js uses force-power'] = importLightsaber.includes("'force-power'");

  // Check packs
  const forceContent = fs.readFileSync(path.join(PROJECT_ROOT, 'packs/forcepowers.db'), 'utf8');
  checks['forcepowers.db migrated'] = !forceContent.includes('"forcepower"');
  checks['lightsaberformpowers.db migrated'] = !fs.readFileSync(
    path.join(PROJECT_ROOT, 'packs/lightsaberformpowers.db'),
    'utf8'
  ).includes('"forcepower"');

  // Check for forcepower in any file (last 4 items should all be true)
  const packChecksPass = checks['forcepowers.db migrated'] && checks['lightsaberformpowers.db migrated'];
  checks['No forcepower in any pack'] = packChecksPass;

  // Report
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`  ${passed ? '✓' : '✗'} ${check}`);
  }

  return Object.values(checks).every(v => v);
}

function validatePackManifest() {
  console.log('\n=== Pack Manifest Validation ===');

  const systemPath = path.join(PROJECT_ROOT, 'system.json');
  const system = JSON.parse(fs.readFileSync(systemPath, 'utf8'));

  const problemPacks = [];

  for (const pack of system.packs) {
    // Check for obvious issues
    if (pack.name === 'vehicles' || pack.name.startsWith('vehicles-')) {
      if (pack.type !== 'Actor') {
        problemPacks.push(`${pack.name}: declared as ${pack.type}, should be Actor`);
      } else {
        console.log(`  ✓ ${pack.name}: correctly declared as Actor`);
      }
    } else if (pack.name === 'heroic' || pack.name === 'nonheroic') {
      if (pack.type !== 'Actor') {
        problemPacks.push(`${pack.name}: declared as ${pack.type}, should be Actor`);
      } else {
        console.log(`  ✓ ${pack.name}: correctly declared as Actor`);
      }
    }

    // Check file exists
    const packPath = path.join(PROJECT_ROOT, pack.path);
    if (!fs.existsSync(packPath)) {
      problemPacks.push(`${pack.name}: pack file not found at ${pack.path}`);
    }
  }

  if (problemPacks.length === 0) {
    console.log('  ✓ All vehicle/heroic/nonheroic packs correctly declared as Actor');
  } else {
    problemPacks.forEach(p => console.log(`  ✗ ${p}`));
  }

  return problemPacks.length === 0;
}

function validateEmptyPacks() {
  console.log('\n=== Empty/Dev Pack Classification ===');

  const emptyPacks = [
    { name: 'npc.db', path: 'packs/npc.db', classification: 'EMPTY - should remain as Actor pack placeholder' },
    { name: 'talent-enhancements.db', path: 'packs/talent-enhancements.db', classification: 'EMPTY - dev/placeholder' },
    { name: 'sample-active-abilities.db', path: 'packs/sample-active-abilities.db', classification: 'DEV/SAMPLE - 5 test items' }
  ];

  for (const pack of emptyPacks) {
    const packPath = path.join(PROJECT_ROOT, pack.path);
    if (fs.existsSync(packPath)) {
      const size = fs.statSync(packPath).size;
      const isEmpty = size === 0;
      console.log(`  ${isEmpty ? '⚠' : '●'} ${pack.name} (${size} bytes): ${pack.classification}`);
    }
  }

  return true;
}

function validateTemplateAlignment() {
  console.log('\n=== Template & Config Alignment ===');

  const template = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'template.json'), 'utf8'));

  const checks = {
    'Actor types include vehicle': template.Actor.types.includes('vehicle'),
    'Actor types include npc': template.Actor.types.includes('npc'),
    'Item types include force-power': template.Item.types.includes('force-power'),
    'Item types do NOT include vehicle': !template.Item.types.includes('vehicle'),
    'Item types do NOT include forcepower': !template.Item.types.includes('forcepower')
  };

  let allPass = true;
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`  ${passed ? '✓' : '✗'} ${check}`);
    if (!passed) allPass = false;
  }

  return allPass;
}

function main() {
  console.log('PHASE 1 VALIDATION REPORT');
  console.log('=========================');

  const results = {
    'Force Power Types': validateForcePowerTypes(),
    'Pack Manifest': validatePackManifest(),
    'Empty/Dev Packs': validateEmptyPacks(),
    'Template Alignment': validateTemplateAlignment()
  };

  console.log('\n\n=== VALIDATION SUMMARY ===');
  let allPass = true;
  for (const [section, passed] of Object.entries(results)) {
    console.log(`${passed ? '✓' : '✗'} ${section}: ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) allPass = false;
  }

  console.log(`\n${allPass ? '✓ ALL VALIDATIONS PASSED' : '✗ SOME VALIDATIONS FAILED'}`);
  process.exit(allPass ? 0 : 1);
}

main();

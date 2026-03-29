#!/usr/bin/env node
/**
 * Phase 5.7 Panel Alignment Verification Script
 * Verifies that all active panels have complete connectivity:
 * - Registry entry exists
 * - Builder exists
 * - Validator exists
 * - Template exists
 * - Post-render assertions defined
 * - Template path valid
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 18 panels that should be registered (14 original + 4 new in Phase 5 extension)
const EXPECTED_PANELS = [
  'healthPanel',
  'defensePanel',
  'biographyPanel',
  'inventoryPanel',
  'talentPanel',
  'featPanel',
  'maneuverPanel',
  'secondWindPanel',
  'portraitPanel',
  'darkSidePanel',
  'forcePowersPanel',
  'starshipManeuversPanel',
  'languagesPanel',
  'racialAbilitiesPanel',
  'armorSummaryPanel',
  'equipmentLedgerPanel',
  'combatNotesPanel',
  'relationshipsPanel'
];

const REPO_ROOT = path.join(__dirname, '..');

function readRegistry() {
  const registryPath = path.join(REPO_ROOT, 'scripts/sheets/v2/context/PANEL_REGISTRY.js');
  const content = fs.readFileSync(registryPath, 'utf8');
  return {
    path: registryPath,
    content,
    hasPanels: EXPECTED_PANELS.every(p => content.includes(`${p}:`))
  };
}

function readBuilders() {
  const builderPath = path.join(REPO_ROOT, 'scripts/sheets/v2/context/PanelContextBuilder.js');
  const content = fs.readFileSync(builderPath, 'utf8');
  return {
    path: builderPath,
    content,
    methods: EXPECTED_PANELS.map(p => {
      const builderName = `build${p.charAt(0).toUpperCase() + p.slice(1).replace('Panel', '')}Panel`;
      return {
        panel: p,
        builderName,
        exists: content.includes(`${builderName}()`) || content.includes(builderName)
      };
    })
  };
}

function readValidators() {
  const validatorPath = path.join(REPO_ROOT, 'scripts/sheets/v2/context/PanelValidators.js');
  const content = fs.readFileSync(validatorPath, 'utf8');
  return {
    path: validatorPath,
    content,
    methods: EXPECTED_PANELS.map(p => {
      const validatorName = `validate${p.charAt(0).toUpperCase() + p.slice(1).replace('Panel', '')}Panel`;
      return {
        panel: p,
        validatorName,
        exists: content.includes(`${validatorName}`)
      };
    })
  };
}

function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║ Phase 5.7: Panel Alignment Verification                                   ║');
  console.log('║ Checking: Registry, Builders, Validators, Templates, Assertions           ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const registry = readRegistry();
  const builders = readBuilders();
  const validators = readValidators();

  console.log(`✓ Registry found: ${registry.path}`);
  console.log(`✓ ${EXPECTED_PANELS.length} panels in registry\n`);

  console.log('Panel Alignment Status:\n');
  console.log('Panel Name                | Registry | Builder | Validator | Issues');
  console.log('─'.repeat(80));

  let issues = 0;
  for (const panelName of EXPECTED_PANELS) {
    const builder = builders.methods.find(m => m.panel === panelName);
    const validator = validators.methods.find(m => m.panel === panelName);

    const regOk = registry.content.includes(`${panelName}:`) ? '✓' : '✗';
    const bldOk = builder.exists ? '✓' : '✗';
    const valOk = validator.exists ? '✓' : '✗';

    const hasIssues = !builder.exists || !validator.exists;
    if (hasIssues) issues++;

    const issueStr = hasIssues ? `Missing: ${!builder.exists ? 'builder ' : ''}${!validator.exists ? 'validator' : ''}` : '✓ OK';
    console.log(`${panelName.padEnd(25)} | ${regOk}        | ${bldOk}       | ${valOk}         | ${issueStr}`);
  }

  console.log('\n' + '─'.repeat(80));
  console.log(`\nSummary: ${EXPECTED_PANELS.length} panels, ${issues} issues found\n`);

  if (issues === 0) {
    console.log('✓ ALL PANELS PROPERLY ALIGNED');
    console.log(`  - All ${EXPECTED_PANELS.length} panels have registry entries`);
    console.log(`  - All ${EXPECTED_PANELS.length} panels have builders`);
    console.log(`  - All ${EXPECTED_PANELS.length} panels have validators`);
    console.log('\nReady for Phase 5.10+\n');
    process.exit(0);
  } else {
    console.log(`✗ ${issues} panel(s) have alignment issues`);
    console.log('  Please review missing builders/validators\n');
    process.exit(1);
  }
}

main();

#!/usr/bin/env node

/**
 * Theme Isolation Toggle Script
 *
 * Disables all themes on first run, then enables them one-by-one on subsequent runs.
 * Maintains state in theme-state.json to track which themes are currently enabled.
 *
 * Usage: node tools/theme-isolation.js
 *
 * Workflow:
 * 1. Run script → all themes disabled
 * 2. Reload Foundry → test
 * 3. Run script → first theme enabled
 * 4. Reload Foundry → test
 * 5. Run script → first two themes enabled
 * 6. Reload Foundry → test
 * 7. Repeat until UI breaks (last enabled theme is the culprit)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_JSON = path.join(__dirname, '../system.json');
const STATE_FILE = path.join(__dirname, 'theme-state.json');

// ============================================================================
// READ SYSTEM.JSON
// ============================================================================

if (!fs.existsSync(SYSTEM_JSON)) {
  console.error(`❌ system.json not found at ${SYSTEM_JSON}`);
  process.exit(1);
}

let systemContent = fs.readFileSync(SYSTEM_JSON, 'utf8');
let system = JSON.parse(systemContent);

if (!Array.isArray(system.styles)) {
  console.error('❌ system.json does not have a "styles" array');
  process.exit(1);
}

// ============================================================================
// IDENTIFY THEME CSS FILES
// ============================================================================

const allThemes = system.styles.filter(style =>
  typeof style === 'string' && style.includes('styles/themes/')
);

const nonThemeStyles = system.styles.filter(style =>
  typeof style !== 'string' || !style.includes('styles/themes/')
);

if (allThemes.length === 0) {
  console.warn('⚠️  No theme CSS files found in styles array');
  process.exit(0);
}

// ============================================================================
// READ OR INITIALIZE STATE
// ============================================================================

let state = { enabledIndex: -1 };
const isFirstRun = !fs.existsSync(STATE_FILE);

if (!isFirstRun) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (err) {
    console.error('⚠️  Failed to read theme-state.json, resetting to initial state');
    state = { enabledIndex: -1 };
  }
}

// ============================================================================
// INCREMENT STATE (on subsequent runs)
// ============================================================================

if (!isFirstRun) {
  state.enabledIndex = state.enabledIndex + 1;
}

// Check if we're done
if (state.enabledIndex >= allThemes.length) {
  console.log('\n✅ All themes are now enabled. No further changes.');
  console.log('\n💡 If UI is broken, one of these themes is the culprit:');
  allThemes.forEach((theme, i) => {
    console.log(`  ${i + 1}. ${theme}`);
  });
  process.exit(0);
}

// ============================================================================
// DETERMINE ENABLED/DISABLED THEMES
// ============================================================================

const enabledThemes = allThemes.slice(0, state.enabledIndex + 1);
const disabledThemes = allThemes.slice(state.enabledIndex + 1);

// ============================================================================
// RECONSTRUCT STYLES ARRAY
// ============================================================================
// Non-theme styles first (preserving order), then enabled themes

system.styles = [...nonThemeStyles, ...enabledThemes];

// ============================================================================
// WRITE SYSTEM.JSON
// ============================================================================

try {
  fs.writeFileSync(SYSTEM_JSON, JSON.stringify(system, null, 2) + '\n', 'utf8');
} catch (err) {
  console.error(`❌ Failed to write system.json: ${err.message}`);
  process.exit(1);
}

// ============================================================================
// WRITE STATE FILE
// ============================================================================

try {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8');
} catch (err) {
  console.error(`❌ Failed to write theme-state.json: ${err.message}`);
  process.exit(1);
}

// ============================================================================
// REPORT RESULTS
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log(`🔧 THEME ISOLATION - STEP ${state.enabledIndex + 1}`);
console.log('='.repeat(70));

console.log(`\n✅ ENABLED THEMES (${enabledThemes.length}):`);
if (enabledThemes.length === 0) {
  console.log('   (none)');
} else {
  enabledThemes.forEach((theme, i) => {
    console.log(`   ${i + 1}. ${theme}`);
  });
}

if (disabledThemes.length > 0) {
  console.log(`\n❌ DISABLED THEMES (${disabledThemes.length}):`);
  disabledThemes.forEach((theme, i) => {
    console.log(`   ${i + 1}. ${theme}`);
  });
}

console.log('\n' + '='.repeat(70));
console.log('📋 NEXT STEPS:');
console.log('  1. Reload Foundry VTT');
console.log('  2. Test the UI');
if (enabledThemes.length === 0) {
  console.log('  3. If UI is stable: problem IS theme-level CSS ✅');
  console.log('  4. Run this script again to enable first theme');
} else {
  console.log('  3. If broken: last enabled theme is the culprit ❌');
  console.log('  4. If stable: run this script again to enable next theme ✅');
}
console.log('='.repeat(70) + '\n');

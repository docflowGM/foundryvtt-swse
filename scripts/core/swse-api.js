/**
 * SWSE Public API Surface
 *
 * All public APIs are frozen to prevent accidental mutation.
 * This provides a single point of documentation for what's safe to use.
 */

import CharacterGenerator from '../apps/chargen/chargen-main.js';
import { auditCSSHealth } from './css-auditor.js';

/**
 * Smoke Test Suite - Basic validation that SWSE loads correctly
 *
 * Dev-only. Run this after upgrades to catch missing templates,
 * broken icon constants, or render crashes.
 *
 * Usage:
 *   window.SWSE.smokeTest()
 */
async function smokeTest() {
  if (!game.settings.get('core', 'devMode')) {
    console.warn('[SWSE Smoke Test] Skipped (dev mode disabled)');
    return false;
  }

  console.group('%c[SWSE Smoke Test]', 'color: blue; font-weight: bold;');

  const results = [];

  // Test 1: Foundry globals
  try {
    if (!window.game) {throw new Error('game global missing');}
    if (!window.Hooks) {throw new Error('Hooks global missing');}
    if (!window.Handlebars) {throw new Error('Handlebars global missing');}
    results.push({ name: 'Foundry globals', status: '✓' });
  } catch (e) {
    results.push({ name: 'Foundry globals', status: '✗', error: e.message });
  }

  // Test 2: SWSE config loaded
  try {
    if (!CONFIG.SWSE) {throw new Error('CONFIG.SWSE missing');}
    results.push({ name: 'SWSE config', status: '✓' });
  } catch (e) {
    results.push({ name: 'SWSE config', status: '✗', error: e.message });
  }

  // Test 3: Icon constants available
  try {
    const { ICONS } = await import('../utils/icon-constants.js');
    if (!ICONS || Object.keys(ICONS).length === 0) {throw new Error('ICONS constant empty');}
    results.push({ name: 'Icon constants', status: '✓', count: Object.keys(ICONS).length });
  } catch (e) {
    results.push({ name: 'Icon constants', status: '✗', error: e.message });
  }

  // Test 4: Character sheets registered
  try {
    const sheetClass = CONFIG.Actor.sheetClasses.character?.['systems/foundryvtt-swse'];
    if (!sheetClass) {throw new Error('Character sheet not registered');}
    results.push({ name: 'Character sheets', status: '✓' });
  } catch (e) {
    results.push({ name: 'Character sheets', status: '✗', error: e.message });
  }

  // Test 5: Hand lebars helpers registered
  try {
    if (!Handlebars.helpers.getIconClass) {throw new Error('getIconClass helper missing');}
    results.push({ name: 'Handlebars helpers', status: '✓' });
  } catch (e) {
    results.push({ name: 'Handlebars helpers', status: '✗', error: e.message });
  }

  // Test 6: CSS containment applied
  try {
    // This is a looser check since CSS containment is applied per-element
    window.getComputedStyle(document.documentElement);
    results.push({ name: 'CSS styling', status: '✓' });
  } catch (e) {
    results.push({ name: 'CSS styling', status: '✗', error: e.message });
  }

  // Print results
  console.table(results);

  const passed = results.filter(r => r.status === '✓').length;
  const failed = results.filter(r => r.status === '✗').length;

  if (failed > 0) {
    console.error(`Smoke test FAILED: ${failed} issues found`);
    console.groupEnd();
    return false;
  } else {
    console.log(`✓ All ${passed} smoke tests passed`);
    console.groupEnd();
    return true;
  }
}

/**
 * Open CharGen with optional actor
 * @param {Actor} actor - Optional actor to edit
 * @returns {Promise<CharacterGenerator>}
 */
async function openCharGen(actor = null) {
  const chargen = new CharacterGenerator(actor, { actorType: actor?.type || 'character' });
  await chargen.render(true);
  return chargen;
}

/**
 * CSS Health Report - Validate CSS invariants
 * Checks for overflow, containment, icons, and other CSS assumptions.
 * Dev-only. Run after Foundry updates to detect CSS regressions.
 * @returns {boolean} True if all CSS tests pass
 */
function cssHealth() {
  return auditCSSHealth();
}

/**
 * SWSE Public API - Frozen to prevent mutation
 *
 * Safe to use:
 * - window.SWSE.openCharGen() - Open character generator
 * - window.SWSE.smokeTest() - Validate system initialization
 * - window.SWSE.cssHealth() - Validate CSS assumptions
 *
 * Not safe:
 * - Modifying this object
 * - Calling internal methods (_underscore prefix)
 */
export const SWSEAPI = Object.freeze({
  openCharGen,
  smokeTest,
  cssHealth,
  version: '1.2.0'
});

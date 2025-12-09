#!/usr/bin/env node

/**
 * Data Validation Tool
 * Validates data files for consistency and correctness
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const errors = [];
const warnings = [];

function error(message) {
  errors.push(message);
  console.error('❌', message);
}

function warn(message) {
  warnings.push(message);
  console.warn('⚠️ ', message);
}

function success(message) {
  console.log('✅', message);
}

/**
 * Validate species-languages.json
 */
function validateSpeciesLanguages() {
  console.log('\n📋 Validating species-languages.json...');

  const filePath = path.join(DATA_DIR, 'species-languages.json');

  if (!fs.existsSync(filePath)) {
    error('species-languages.json not found');
    return;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    error(`Failed to parse species-languages.json: ${e.message}`);
    return;
  }

  // Check for duplicate species keys
  const speciesKeys = Object.keys(data);
  const uniqueKeys = new Set(speciesKeys);

  if (speciesKeys.length !== uniqueKeys.size) {
    error('Duplicate species keys found');
  } else {
    success(`${speciesKeys.length} unique species found`);
  }

  // Validate each species entry
  let validCount = 0;
  for (const [key, species] of Object.entries(data)) {
    if (!species.languages || !Array.isArray(species.languages)) {
      error(`Species "${key}" has invalid or missing languages array`);
      continue;
    }

    if (species.languages.length === 0) {
      warn(`Species "${key}" has no languages`);
    }

    // Check for empty language strings
    const emptyLanguages = species.languages.filter(lang => !lang || lang.trim() === '');
    if (emptyLanguages.length > 0) {
      error(`Species "${key}" has empty language entries`);
    }

    validCount++;
  }

  success(`${validCount}/${speciesKeys.length} species entries valid`);
}

/**
 * Validate talent-enhancements.json
 */
function validateTalentEnhancements() {
  console.log('\n📋 Validating talent-enhancements.json...');

  const filePath = path.join(DATA_DIR, 'talent-enhancements.json');

  if (!fs.existsSync(filePath)) {
    warn('talent-enhancements.json not found (optional)');
    return;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    error(`Failed to parse talent-enhancements.json: ${e.message}`);
    return;
  }

  const keys = Object.keys(data);
  success(`${keys.length} talent enhancements found`);

  // Validate structure
  let validCount = 0;
  for (const [key, enhancement] of Object.entries(data)) {
    if (!enhancement || typeof enhancement !== 'object') {
      error(`Enhancement "${key}" is not a valid object`);
      continue;
    }
    validCount++;
  }

  success(`${validCount}/${keys.length} enhancements valid`);
}

/**
 * Validate feat-combat-actions.json
 */
function validateFeatCombatActions() {
  console.log('\n📋 Validating feat-combat-actions.json...');

  const filePath = path.join(DATA_DIR, 'feat-combat-actions.json');

  if (!fs.existsSync(filePath)) {
    warn('feat-combat-actions.json not found (optional)');
    return;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    error(`Failed to parse feat-combat-actions.json: ${e.message}`);
    return;
  }

  if (!Array.isArray(data)) {
    error('feat-combat-actions.json should be an array');
    return;
  }

  success(`${data.length} feat combat actions found`);

  // Validate each action
  let validCount = 0;
  for (const action of data) {
    if (!action.name) {
      error('Action missing name field');
      continue;
    }
    validCount++;
  }

  success(`${validCount}/${data.length} actions valid`);
}

/**
 * Validate ship-combat-actions.json
 */
function validateShipCombatActions() {
  console.log('\n📋 Validating ship-combat-actions.json...');

  const filePath = path.join(DATA_DIR, 'ship-combat-actions.json');

  if (!fs.existsSync(filePath)) {
    warn('ship-combat-actions.json not found (optional)');
    return;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    error(`Failed to parse ship-combat-actions.json: ${e.message}`);
    return;
  }

  if (!Array.isArray(data)) {
    error('ship-combat-actions.json should be an array');
    return;
  }

  success(`${data.length} ship combat actions found`);
}

/**
 * Validate nonheroic templates and units
 */
function validateNonheroic() {
  console.log('\n📋 Validating nonheroic data...');

  const templatesPath = path.join(DATA_DIR, 'nonheroic', 'nonheroic_templates.json');
  const unitsPath = path.join(DATA_DIR, 'nonheroic', 'nonheroic_units.json');

  // Validate templates
  if (fs.existsSync(templatesPath)) {
    try {
      const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
      success(`${Object.keys(templates).length} nonheroic templates found`);
    } catch (e) {
      error(`Failed to parse nonheroic_templates.json: ${e.message}`);
    }
  } else {
    warn('nonheroic_templates.json not found');
  }

  // Validate units
  if (fs.existsSync(unitsPath)) {
    try {
      const units = JSON.parse(fs.readFileSync(unitsPath, 'utf8'));
      success(`${Object.keys(units).length} nonheroic units found`);
    } catch (e) {
      error(`Failed to parse nonheroic_units.json: ${e.message}`);
    }
  } else {
    warn('nonheroic_units.json not found');
  }
}

/**
 * Validate extraskilluses.json
 */
function validateExtraSkillUses() {
  console.log('\n📋 Validating extraskilluses.json...');

  const filePath = path.join(DATA_DIR, 'extraskilluses.json');

  if (!fs.existsSync(filePath)) {
    warn('extraskilluses.json not found (optional)');
    return;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    error(`Failed to parse extraskilluses.json: ${e.message}`);
    return;
  }

  if (!Array.isArray(data)) {
    error('extraskilluses.json should be an array');
    return;
  }

  success(`${data.length} extra skill uses found`);

  // Validate each entry
  let validCount = 0;
  for (const skillUse of data) {
    if (!skillUse.name) {
      error('Skill use missing name field');
      continue;
    }
    if (!skillUse.skill) {
      error(`Skill use "${skillUse.name}" missing skill field`);
      continue;
    }
    validCount++;
  }

  success(`${validCount}/${data.length} skill uses valid`);
}

/**
 * Main validation
 */
function main() {
  console.log('🔍 SWSE Data Validation Tool\n');
  console.log('=' .repeat(60));

  validateSpeciesLanguages();
  validateTalentEnhancements();
  validateFeatCombatActions();
  validateShipCombatActions();
  validateNonheroic();
  validateExtraSkillUses();

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:');
  console.log(`✅ Passed: ${errors.length === 0 ? 'All checks' : 'Some checks'}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log('\n❌ VALIDATION FAILED');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log('\n⚠️  VALIDATION PASSED WITH WARNINGS');
    process.exit(0);
  } else {
    console.log('\n✅ VALIDATION PASSED');
    process.exit(0);
  }
}

main();

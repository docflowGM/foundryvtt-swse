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
function readJsonl(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const records = [];
  let bad = 0;
  for (const line of lines) {
    try { records.push(JSON.parse(line)); }
    catch { bad++; }
  }
  if (bad > 0) warn(`${path.basename(filePath)}: ${bad} malformed JSONL line(s) skipped`);
  return records;
}

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

  // Actual species entries live under data.species; the file also carries a
  // top-level "note" string. Older versions stored species at the root.
  const speciesMap = (data && typeof data === 'object' && data.species && typeof data.species === 'object')
    ? data.species
    : data;

  // Check for duplicate species keys
  const speciesKeys = Object.keys(speciesMap);
  const uniqueKeys = new Set(speciesKeys);

  if (speciesKeys.length !== uniqueKeys.size) {
    error('Duplicate species keys found');
  } else {
    success(`${speciesKeys.length} unique species found`);
  }

  // Validate each species entry
  let validCount = 0;
  for (const [key, species] of Object.entries(speciesMap)) {
    if (!species.languages || !Array.isArray(species.languages)) {
      error(`Species "${key}" has invalid or missing languages array`);
      continue;
    }

    if (species.languages.length === 0) {
      warn(`Species "${key}" has no languages`);
    }

    // Check for empty language strings
    // Language entries may be plain strings or objects (partial/understand-only forms).
    const emptyLanguages = species.languages.filter(lang => !lang || (typeof lang === 'string' && lang.trim() === ''));
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

  // The file is a keyed object map (id -> action); older versions used an array.
  const actions = Array.isArray(data) ? data.map((a, i) => [String(i), a]) : Object.entries(data);

  success(`${actions.length} feat combat actions found`);

  // Validate each action
  let validCount = 0;
  for (const [key, action] of actions) {
    if (!action || typeof action !== 'object') {
      error(`Action "${key}" is not a valid object`);
      continue;
    }
    if (!action.name) {
      error(`Action "${key}" missing name field`);
      continue;
    }
    validCount++;
  }

  success(`${validCount}/${actions.length} actions valid`);
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
      const templates = readJsonl(templatesPath);
      success(`${templates.length} nonheroic templates found`);
    } catch (e) {
      error(`Failed to parse nonheroic_templates.json: ${e.message}`);
    }
  } else {
    warn('nonheroic_templates.json not found');
  }

  // Validate units
  if (fs.existsSync(unitsPath)) {
    try {
      const units = readJsonl(unitsPath);
      success(`${units.length} nonheroic units found`);
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
    // Records describe an "application" with DC/time/effect; skill is optional.
    if (!skillUse.application) {
      error('Skill use missing application field');
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

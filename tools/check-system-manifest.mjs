import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const manifestPath = path.join(repoRoot, 'system.json');
const gitAttributesPath = path.join(repoRoot, '.gitattributes');
const errors = [];

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  console.error(`FAIL: system.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

const packs = Array.isArray(manifest.packs) ? manifest.packs : [];
const requiredPacks = ['species', 'classes', 'talent_trees', 'talents', 'feats', 'skills'];
const names = new Set();
const paths = new Set();

if (manifest.id !== 'foundryvtt-swse') errors.push(`Unexpected system id: ${manifest.id ?? '<missing>'}`);
if (manifest.type !== 'system') errors.push('Manifest type must be "system".');
if (manifest.socket !== true) errors.push('System socket support must remain enabled.');

const minimum = Number(manifest.compatibility?.minimum);
const verified = Number(manifest.compatibility?.verified);
const maximum = Number(manifest.compatibility?.maximum);
if (minimum !== 13) errors.push(`compatibility.minimum must be 13, found ${manifest.compatibility?.minimum ?? '<missing>'}.`);
if (verified !== 14) errors.push(`compatibility.verified must be 14, found ${manifest.compatibility?.verified ?? '<missing>'}.`);
if (maximum !== 14) errors.push(`compatibility.maximum must be 14, found ${manifest.compatibility?.maximum ?? '<missing>'}.`);

if (packs.length < 60) {
  errors.push(`Expected the production compendium catalog (at least 60 packs), found ${packs.length}.`);
}

function validateLegacyNeDbPack(packName, absolutePackPath, declaredPath) {
  const stat = fs.statSync(absolutePackPath);
  if (!stat.isFile()) {
    errors.push(`Legacy NeDB pack source must be a file: ${declaredPath}`);
    return;
  }
  if (stat.size === 0) {
    errors.push(`Legacy NeDB pack source is empty: ${declaredPath}`);
    return;
  }

  // Foundry V11+ can migrate package-provided NeDB sources to a sibling
  // LevelDB directory. Validate enough of the JSONL source to catch a wrong,
  // empty, or corrupt manifest target without loading a potentially large pack.
  const firstRecord = fs.readFileSync(absolutePackPath, 'utf8')
    .split(/\r?\n/)
    .find(line => line.trim().length > 0);
  if (!firstRecord) {
    errors.push(`Legacy NeDB pack source has no JSONL records: ${declaredPath}`);
    return;
  }
  try {
    const parsed = JSON.parse(firstRecord);
    if (!parsed || typeof parsed !== 'object') {
      errors.push(`Legacy NeDB pack source does not begin with an object record: ${declaredPath}`);
    }
  } catch (error) {
    errors.push(`Legacy NeDB pack source begins with invalid JSON (${packName}): ${error.message}`);
  }
}

function validateLevelDbPack(absolutePackPath, declaredPath) {
  const stat = fs.statSync(absolutePackPath);
  if (!stat.isDirectory()) {
    errors.push(`LevelDB pack path must be a directory: ${declaredPath}`);
    return;
  }

  const currentPath = path.join(absolutePackPath, 'CURRENT');
  if (!fs.existsSync(currentPath)) {
    errors.push(`LevelDB pack is missing CURRENT: ${declaredPath}`);
    return;
  }

  const manifestFile = fs.readFileSync(currentPath, 'utf8').trim();
  if (!manifestFile) {
    errors.push(`LevelDB CURRENT file is empty: ${declaredPath}`);
  } else if (!fs.existsSync(path.join(absolutePackPath, manifestFile))) {
    errors.push(`LevelDB CURRENT points to a missing manifest (${manifestFile}): ${declaredPath}`);
  }
}

for (const pack of packs) {
  const packName = pack?.name ?? '<unknown>';
  if (!pack?.name) errors.push('A pack is missing its name.');
  if (!pack?.path) errors.push(`Pack ${packName} is missing its path.`);
  if (!pack?.type) errors.push(`Pack ${packName} is missing its document type.`);

  if (pack?.name && names.has(pack.name)) errors.push(`Duplicate pack name: ${pack.name}`);
  if (pack?.path && paths.has(pack.path)) errors.push(`Duplicate pack path: ${pack.path}`);
  if (pack?.name) names.add(pack.name);
  if (pack?.path) paths.add(pack.path);

  if (pack?.type === 'Actor' || pack?.type === 'Item') {
    if (pack.system !== manifest.id) {
      errors.push(`${pack.type} pack ${packName} must declare system: "${manifest.id}".`);
    }
  }

  if (!pack?.path) continue;
  const absolutePackPath = path.join(repoRoot, pack.path);
  if (!fs.existsSync(absolutePackPath)) {
    errors.push(`Declared pack path does not exist: ${pack.path}`);
    continue;
  }

  if (pack.path.endsWith('.db')) {
    validateLegacyNeDbPack(packName, absolutePackPath, pack.path);
  } else {
    validateLevelDbPack(absolutePackPath, pack.path);
  }
}

for (const required of requiredPacks) {
  if (!names.has(required)) errors.push(`Required pack is not declared: ${required}`);
}

const feats = packs.find(pack => pack?.name === 'feats');
if (!['packs/feats', 'packs/feats.db'].includes(feats?.path)) {
  errors.push(`Feats pack must resolve to packs/feats or packs/feats.db, found ${feats?.path ?? '<missing>'}.`);
}

try {
  const gitAttributes = fs.readFileSync(gitAttributesPath, 'utf8');
  if (!/^packs\/\*\*\s+binary\s*$/m.test(gitAttributes)) {
    errors.push('.gitattributes must contain "packs/** binary" to prevent LevelDB corruption.');
  }
} catch (error) {
  errors.push(`Unable to read .gitattributes: ${error.message}`);
}

// Foundry settings are registered through game.settings.register during init.
// A non-standard manifest-level settings block is intentionally not required.

if (errors.length) {
  console.error('System manifest validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`System manifest OK: ${packs.length} compendium pack sources declared and structurally present.`);

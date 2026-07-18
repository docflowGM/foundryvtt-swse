import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const manifestPath = path.join(repoRoot, 'system.json');
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

if (packs.length < 60) {
  errors.push(`Expected the production compendium catalog (at least 60 packs), found ${packs.length}.`);
}

for (const pack of packs) {
  if (!pack?.name) errors.push('A pack is missing its name.');
  if (!pack?.path) errors.push(`Pack ${pack?.name ?? '<unknown>'} is missing its path.`);

  if (pack?.name && names.has(pack.name)) errors.push(`Duplicate pack name: ${pack.name}`);
  if (pack?.path && paths.has(pack.path)) errors.push(`Duplicate pack path: ${pack.path}`);
  if (pack?.name) names.add(pack.name);
  if (pack?.path) paths.add(pack.path);

  if (pack?.path && !fs.existsSync(path.join(repoRoot, pack.path))) {
    errors.push(`Declared pack path does not exist: ${pack.path}`);
  }
}

for (const required of requiredPacks) {
  if (!names.has(required)) errors.push(`Required pack is not declared: ${required}`);
}

if (manifest.socket !== true) errors.push('System socket support must remain enabled.');
if (!manifest.settings?.['foundryvtt-swse.themePromptShown']) {
  errors.push('Hidden themePromptShown setting is not declared.');
}

if (errors.length) {
  console.error('System manifest validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`System manifest OK: ${packs.length} packs declared and all pack paths exist.`);

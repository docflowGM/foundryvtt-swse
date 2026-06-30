#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');
const report = {
  phase: 'implants-phase-4c-cybernetic-surgery-policy-and-gear-implant-partial',
  ok: [],
  warnings: [],
  errors: []
};

function readJson(relPath) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    report.errors.push(`Missing required file: ${relPath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    report.errors.push(`Invalid JSON in ${relPath}: ${error.message}`);
    return null;
  }
}


function readText(relPath) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    report.errors.push(`Missing required file: ${relPath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function requireText(relPath, pattern, description) {
  const text = readText(relPath);
  if (!text) return;
  if (!pattern.test(text)) {
    report.errors.push(`${relPath}: missing ${description}.`);
  } else {
    report.ok.push(`${relPath}: ${description}.`);
  }
}

function readDb(relPath) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    report.errors.push(`Missing required file: ${relPath}`);
    return [];
  }
  const rows = [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch (error) {
      report.errors.push(`Invalid JSONL in ${relPath} line ${index + 1}: ${error.message}`);
    }
  }
  return rows;
}

function findFeat(collection, name) {
  const normalized = name.toLowerCase();
  return collection.find((entry) => String(entry?.name ?? '').toLowerCase() === normalized) ?? null;
}

function getMeta(feat) {
  return feat?.system?.abilityMeta ?? {};
}

function hasEnabledNumericModifier(feat) {
  const modifiers = getMeta(feat).modifiers ?? feat?.system?.modifiers ?? [];
  if (!Array.isArray(modifiers)) return false;
  return modifiers.some((modifier) => {
    const enabled = modifier?.enabled !== false;
    const target = String(modifier?.target ?? '').toLowerCase();
    const value = Number(modifier?.value ?? 0);
    return enabled && Number.isFinite(value) && value !== 0 && target !== 'metadata';
  });
}

function checkCyberneticSurgery(feat, sourceLabel) {
  if (!feat) {
    report.errors.push(`${sourceLabel}: Cybernetic Surgery feat not found.`);
    return;
  }

  const meta = getMeta(feat);
  const expected = {
    implementationStatus: 'manual_gm_player_procedure_reference',
    mechanicsMode: 'procedure_reference',
    applicationScope: 'cybernetic_installation_procedure',
    staticSheetPolicy: 'exclude'
  };

  for (const [key, value] of Object.entries(expected)) {
    if (meta[key] !== value) {
      report.errors.push(`${sourceLabel}: Cybernetic Surgery abilityMeta.${key} should be ${value}, found ${JSON.stringify(meta[key])}.`);
    } else {
      report.ok.push(`${sourceLabel}: Cybernetic Surgery abilityMeta.${key} is ${value}.`);
    }
  }

  if (meta.rulesAutomationPolicy !== 'no_passive_automation') {
    report.errors.push(`${sourceLabel}: Cybernetic Surgery should declare rulesAutomationPolicy=no_passive_automation.`);
  } else {
    report.ok.push(`${sourceLabel}: Cybernetic Surgery blocks passive automation.`);
  }

  const note = String(meta.gmFacingNote ?? meta.conditionSummary ?? meta.description ?? '');
  if (!/medical procedure/i.test(note) || !/GM/i.test(note)) {
    report.errors.push(`${sourceLabel}: Cybernetic Surgery is missing a GM-facing medical procedure note.`);
  } else {
    report.ok.push(`${sourceLabel}: Cybernetic Surgery has a GM-facing medical procedure note.`);
  }

  if (hasEnabledNumericModifier(feat)) {
    report.errors.push(`${sourceLabel}: Cybernetic Surgery has an enabled numeric modifier; it must stay metadata-only.`);
  } else {
    report.ok.push(`${sourceLabel}: Cybernetic Surgery has no enabled numeric modifier.`);
  }
}

function checkImplantTraining(feat, sourceLabel) {
  if (!feat) {
    report.errors.push(`${sourceLabel}: Implant Training feat not found.`);
    return;
  }
  const text = JSON.stringify(feat.system ?? {}).toLowerCase();
  if (!text.includes('implant') || !text.includes('will')) {
    report.errors.push(`${sourceLabel}: Implant Training no longer appears to own implant penalty suppression metadata.`);
  } else {
    report.ok.push(`${sourceLabel}: Implant Training remains the implant penalty suppression feat.`);
  }
}

const policy = readJson('data/cybernetics/cybernetic-surgery-policy.json');
if (policy) {
  if (policy.classification?.implementationStatus === 'manual_gm_player_procedure_reference') {
    report.ok.push('Cybernetic surgery policy declares manual GM/player procedure status.');
  } else {
    report.errors.push('Cybernetic surgery policy does not declare manual GM/player procedure status.');
  }
  if (String(policy.gmFacingNote ?? '').includes('source rules')) {
    report.ok.push('Cybernetic surgery policy includes source-rules GM note.');
  } else {
    report.errors.push('Cybernetic surgery policy should tell the GM/player to use source rules.');
  }
}

const catalog = readJson('data/feat-catalog.json') ?? [];
const pack = readDb('packs/feats.db');
checkCyberneticSurgery(findFeat(catalog, 'Cybernetic Surgery'), 'data/feat-catalog.json');
checkCyberneticSurgery(findFeat(pack, 'Cybernetic Surgery'), 'packs/feats.db');
checkImplantTraining(findFeat(catalog, 'Implant Training'), 'data/feat-catalog.json');
checkImplantTraining(findFeat(pack, 'Implant Training'), 'packs/feats.db');

requireText('templates/actors/character/v2/partials/gear/implants-panel.hbs', /Implant Management/i, 'dedicated Gear tab implant management partial exists');
requireText('templates/actors/character/v2/partials/gear/implants-panel.hbs', /inventoryPanel\.implantPanel\.available/, 'implant partial is gated by non-droid availability context');
requireText('templates/actors/character/v2/partials/gear/implants-panel.hbs', /toggle-implant-active/, 'implant partial exposes active-state management action');
requireText('templates/actors/character/v2/partials/inventory-panel.hbs', /partials\/gear\/implants-panel\.hbs/, 'inventory panel includes the implant management partial');
requireText('scripts/sheets/v2/context/PanelContextBuilder.js', /implantPanel\s*=\s*\{/, 'inventory context builds implantPanel view model');
requireText('scripts/sheets/v2/context/PanelContextBuilder.js', /String\(this\.actor\?\.type[\s\S]*?droid[\s\S]*?system\?\.isDroid/, 'implantPanel availability excludes droid actors');
requireText('scripts/engine/inventory/InventoryEngine.js', /toggleImplantTag/, 'InventoryEngine owns implant tagging mutation');
requireText('scripts/engine/inventory/InventoryEngine.js', /toggleImplantInstalled/, 'InventoryEngine owns implant installed-state mutation');
requireText('scripts/engine/inventory/InventoryEngine.js', /toggleImplantActive/, 'InventoryEngine owns implant active-state mutation');
requireText('scripts/sheets/v2/character-sheet/inventory-ui.js', /toggle-implant-active/, 'modular inventory UI binds implant actions');

const outDir = path.join(ROOT, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'cybernetic-surgery-policy-report.json'), JSON.stringify(report, null, 2));
const md = [
  '# Cybernetic Surgery Policy Report',
  '',
  `- OK: ${report.ok.length}`,
  `- Warnings: ${report.warnings.length}`,
  `- Errors: ${report.errors.length}`,
  '',
  '## OK',
  ...report.ok.map((entry) => `- ${entry}`),
  '',
  '## Warnings',
  ...(report.warnings.length ? report.warnings.map((entry) => `- ${entry}`) : ['- None']),
  '',
  '## Errors',
  ...(report.errors.length ? report.errors.map((entry) => `- ${entry}`) : ['- None']),
  ''
].join('\n');
fs.writeFileSync(path.join(outDir, 'cybernetic-surgery-policy-report.md'), md);

console.log(`Cybernetic Surgery policy audit: ${report.ok.length} ok, ${report.warnings.length} warnings, ${report.errors.length} errors`);
if (STRICT && report.errors.length) process.exit(1);

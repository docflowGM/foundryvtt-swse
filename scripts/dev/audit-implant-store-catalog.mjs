#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const ok = [];
const errors = [];

const expected = [
  ['implant-bio-stabilizer', 'Bio-Stabilizer Implant', 1750, 'Knights of the Old Republic Campaign Guide'],
  ['implant-cardio', 'Cardio Implant', 4000, 'Knights of the Old Republic Campaign Guide'],
  ['implant-combat', 'Combat Implant', 5000, 'Knights of the Old Republic Campaign Guide'],
  ['implant-memory', 'Memory Implant', 2000, 'Knights of the Old Republic Campaign Guide'],
  ['implant-nerve-reinforcement', 'Nerve Reinforcement Implant', 5000, 'Knights of the Old Republic Campaign Guide'],
  ['implant-regenerative', 'Regenerative Implant', 4250, 'Knights of the Old Republic Campaign Guide'],
  ['implant-sensory', 'Sensory Implant', 2500, 'Knights of the Old Republic Campaign Guide'],
  ['implant-subelectronic-converter', 'Subelectronic Converter', 23000, 'Jedi Academy Training Manual']
];

function read(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    errors.push(`missing file: ${file}`);
    return '';
  }
  ok.push(`file exists: ${file}`);
  return fs.readFileSync(full, 'utf8');
}

function readJson(file) {
  const text = read(file);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    ok.push(`valid json: ${file}`);
    return parsed;
  } catch (err) {
    errors.push(`invalid json: ${file}: ${err.message}`);
    return null;
  }
}

function parseDb(file) {
  const text = read(file);
  const rows = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); }
    catch (err) { errors.push(`invalid db json ${file}:${index + 1}: ${err.message}`); }
  }
  ok.push(`valid ndjson: ${file}`);
  return rows;
}

function byId(rows) {
  return new Map(rows.map(row => [row?._id || row?.id, row]));
}

const catalog = readJson('data/implants/implant-reference-catalog.json');
const samples = readJson('data/implants/sample-implant-items.json');
const descriptions = readJson('data/store/implant-store-descriptions.json');
const equipmentTech = byId(parseDb('packs/equipment-tech.db'));
const equipmentAggregate = byId(parseDb('packs/equipment.db'));

const catalogById = new Map((catalog?.implants || []).map(row => [row.id, row]));
const sampleById = new Map((samples?.items || []).map(row => [row._id || row.id, row]));
const descriptionById = new Map((descriptions || []).map(row => [row.id, row]));

for (const [id, name, cost, sourcebook] of expected) {
  for (const [label, map] of [
    ['catalog', catalogById],
    ['sample item data', sampleById],
    ['store description', descriptionById],
    ['equipment-tech pack', equipmentTech],
    ['equipment aggregate pack', equipmentAggregate]
  ]) {
    const row = map.get(id);
    if (!row) {
      errors.push(`${label} missing ${id}`);
      continue;
    }
    ok.push(`${label} has ${name}`);
    const rowName = row.name || row.system?.name;
    const rowCost = row.cost ?? row.system?.cost ?? row.system?.costNumeric;
    const rowSource = row.sourcebook ?? row.system?.sourcebook ?? row.system?.source;
    if (rowName !== name) errors.push(`${label} ${id} name mismatch: ${rowName}`);
    else ok.push(`${label} ${id} name ok`);
    if (Number(rowCost) !== cost) errors.push(`${label} ${id} cost mismatch: ${rowCost}`);
    else ok.push(`${label} ${id} cost ok`);
    if (rowSource !== sourcebook) errors.push(`${label} ${id} source mismatch: ${rowSource}`);
    else ok.push(`${label} ${id} source ok`);
  }

  const item = sampleById.get(id) || equipmentTech.get(id);
  if (item?.system?.isImplant === true && item?.system?.implant === true && item?.system?.equipmentBucket === 'implants') {
    ok.push(`${id} has explicit implant tags`);
  } else {
    errors.push(`${id} is not explicitly tagged as an implant/equipmentBucket=implants`);
  }
}

const sourceChecks = [
  ['scripts/engine/equipment/equipment-normalizer.js', ['implants:', "storeCategory: 'Implants'", "implant: 'Implant'"]],
  ['scripts/engine/store/categorizer.js', ["IMPLANTS: 'Implants'", 'Category.IMPLANTS']],
  ['scripts/apps/store/store-main.js', ["raw.includes('implant')", "implants: 'Implants'", "'implants'"]],
  ['scripts/apps/store/store-shared.js', ["lower.includes('implant')", "implants: 'Implants'", "'implants'"]],
  ['scripts/apps/store/store-description-resolver.js', ['implant-store-descriptions.json', "keys.add('implant')"]],
  ['scripts/apps/store/store-glyph-map.js', ['implant:', "label: 'Implants'"]]
];
for (const [file, needles] of sourceChecks) {
  const text = read(file);
  for (const needle of needles) {
    if (text.includes(needle)) ok.push(`${file} contains ${needle}`);
    else errors.push(`${file} missing ${needle}`);
  }
}

const report = {
  phase: 'implants-phase4e-store-catalog',
  expectedImplants: expected.length,
  ok: ok.length,
  errors,
  checkedAt: new Date().toISOString()
};

const outDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'implant-store-catalog-report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'implant-store-catalog-report.md'), [
  '# Implant Store Catalog Report',
  '',
  `Phase: ${report.phase}`,
  `Expected implants: ${report.expectedImplants}`,
  `OK: ${report.ok}`,
  `Errors: ${errors.length}`,
  '',
  ...(errors.length ? ['## Errors', ...errors.map(e => `- ${e}`)] : ['No errors.'])
].join('\n') + '\n');

if (errors.length) {
  console.error(`Implant store catalog audit failed: ${errors.length} error(s)`);
  for (const error of errors) console.error(` - ${error}`);
  if (strict) process.exit(1);
} else {
  console.log(`Implant store catalog audit passed: ${ok.length} ok, 0 errors`);
}

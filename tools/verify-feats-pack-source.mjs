import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const packPath = path.join(repoRoot, 'packs', 'feats.db');
const catalogPath = path.join(repoRoot, 'data', 'feat-catalog.json');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(packPath)) fail('packs/feats.db does not exist.');
if (!fs.existsSync(catalogPath)) fail('data/feat-catalog.json does not exist.');

const lines = fs.readFileSync(packPath, 'utf8')
  .split(/\r?\n/)
  .filter(line => line.trim().length > 0);

if (!lines.length) fail('packs/feats.db contains zero feat documents. The compendium must not ship empty.');

const errors = [];
const ids = new Set();
const names = new Set();
/** @type {Map<string, {doc: object, raw: string}>} */
const packById = new Map();

for (const [index, line] of lines.entries()) {
  let doc;
  try {
    doc = JSON.parse(line);
  } catch (error) {
    errors.push(`Line ${index + 1}: invalid JSON (${error.message})`);
    continue;
  }

  if (doc.type !== 'feat') errors.push(`Line ${index + 1}: ${doc.name ?? '<unnamed>'} has type ${doc.type}`);
  if (!doc._id) errors.push(`Line ${index + 1}: missing _id`);
  else if (ids.has(doc._id)) errors.push(`Line ${index + 1}: duplicate _id ${doc._id}`);
  else {
    ids.add(doc._id);
    packById.set(doc._id, { doc, raw: line });
  }

  const name = String(doc.name ?? '').trim();
  if (!name) errors.push(`Line ${index + 1}: missing name`);
  else {
    const normalized = name.toLowerCase();
    if (names.has(normalized)) errors.push(`Line ${index + 1}: duplicate name ${name}`);
    else names.add(normalized);
  }
}

let catalog;
try {
  catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
} catch (error) {
  fail(`Unable to parse data/feat-catalog.json: ${error.message}`);
}
const catalogDocs = Array.isArray(catalog) ? catalog : Array.isArray(catalog?.documents) ? catalog.documents : null;
if (!catalogDocs) fail('data/feat-catalog.json must be an array or an object with a documents array.');
if (!catalogDocs.length) fail('data/feat-catalog.json contains zero feat documents.');

const catalogIds = new Set();
for (const doc of catalogDocs) {
  if (typeof doc?._id === 'string' && doc._id.trim()) catalogIds.add(doc._id);
}

const missingFromPack = [...catalogIds].filter(id => !packById.has(id));
const extraInPack = [...packById.keys()].filter(id => !catalogIds.has(id));

if (missingFromPack.length) {
  errors.push(`${missingFromPack.length} feat id(s) present in data/feat-catalog.json but missing from packs/feats.db: ${missingFromPack.slice(0, 10).join(', ')}${missingFromPack.length > 10 ? ', ...' : ''}`);
}
if (extraInPack.length) {
  errors.push(`${extraInPack.length} feat id(s) present in packs/feats.db but missing from data/feat-catalog.json: ${extraInPack.slice(0, 10).join(', ')}${extraInPack.length > 10 ? ', ...' : ''}`);
}

for (const doc of catalogDocs) {
  const id = doc?._id;
  if (typeof id !== 'string' || !packById.has(id)) continue;
  const expectedRaw = JSON.stringify(doc);
  const actualRaw = packById.get(id).raw;
  if (expectedRaw !== actualRaw) {
    errors.push(`Content drift for feat id ${id} (${doc.name ?? '<unnamed>'}): packs/feats.db does not match data/feat-catalog.json. Re-run tools/rebuild-feats-pack-source.mjs.`);
  }
}

if (catalogDocs.length !== lines.length) {
  errors.push(`Document count mismatch: data/feat-catalog.json has ${catalogDocs.length} feats, packs/feats.db has ${lines.length}.`);
}

if (errors.length) {
  console.error('Feat pack source validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Feat pack source OK: ${lines.length} unique feat documents, exact ID-set and content parity with data/feat-catalog.json.`);

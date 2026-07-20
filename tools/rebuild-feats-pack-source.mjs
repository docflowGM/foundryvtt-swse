import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const sourcePath = path.join(repoRoot, 'data', 'feat-catalog.json');
const outputPath = path.join(repoRoot, 'packs', 'feats.db');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(sourcePath)) fail(`Missing source catalog: ${sourcePath}`);

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
} catch (error) {
  fail(`Unable to parse data/feat-catalog.json: ${error.message}`);
}

const docs = Array.isArray(parsed)
  ? parsed
  : Array.isArray(parsed?.documents)
    ? parsed.documents
    : null;

if (!docs) fail('feat-catalog.json must be an array or an object with a documents array.');
if (!docs.length) fail('feat-catalog.json contains no documents.');

const ids = new Set();
const names = new Set();

for (const [index, doc] of docs.entries()) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    fail(`Entry ${index} is not a document object.`);
  }

  if (typeof doc._id !== 'string' || !doc._id.trim()) {
    fail(`Entry ${index} (${doc.name ?? '<unnamed>'}) is missing a string _id.`);
  }
  if (ids.has(doc._id)) fail(`Duplicate feat _id: ${doc._id}`);
  ids.add(doc._id);

  if (typeof doc.name !== 'string' || !doc.name.trim()) {
    fail(`Entry ${index} (${doc._id}) is missing a name.`);
  }
  const normalizedName = doc.name.trim().toLowerCase();
  if (names.has(normalizedName)) fail(`Duplicate feat name: ${doc.name}`);
  names.add(normalizedName);

  if (doc.type !== 'feat') {
    fail(`Entry ${index} (${doc.name}) has type "${doc.type}" instead of "feat".`);
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const ndjson = `${docs.map(document => JSON.stringify(document)).join('\n')}\n`;
fs.writeFileSync(outputPath, ndjson, 'utf8');

console.log(`Rebuilt packs/feats.db with ${docs.length} feat documents.`);
console.log('The _id values were preserved so existing Compendium UUID references remain stable.');

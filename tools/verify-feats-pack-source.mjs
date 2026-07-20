import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const sourcePath = path.join(repoRoot, 'packs', 'feats.db');

if (!fs.existsSync(sourcePath)) {
  console.error('FAIL: packs/feats.db does not exist.');
  process.exit(1);
}

const lines = fs.readFileSync(sourcePath, 'utf8')
  .split(/\r?\n/)
  .filter(line => line.trim().length > 0);

const ids = new Set();
const names = new Set();
const errors = [];

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
  else ids.add(doc._id);

  const name = String(doc.name ?? '').trim();
  if (!name) errors.push(`Line ${index + 1}: missing name`);
  else {
    const normalized = name.toLowerCase();
    if (names.has(normalized)) errors.push(`Line ${index + 1}: duplicate name ${name}`);
    else names.add(normalized);
  }
}

if (errors.length) {
  console.error('Feat pack source validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Feat pack source OK: ${lines.length} unique feat documents.`);

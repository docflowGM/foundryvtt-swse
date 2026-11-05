// Rebuild / verify the frozen Core + SGD source-review snapshot.
// Produces a browser-safe JS module without runtime fetch() or JSON import.
import fs from 'node:fs';
const ledger = JSON.parse(fs.readFileSync('data/audits/droids/component-mechanical-certification-ledger.json', 'utf8'));
const rows = ledger.identitySourceDecisions.map(({canonicalId, canonicalName, sourceDecision}) => [canonicalId, canonicalName, sourceDecision]);
if (rows.length !== 122 || new Set(rows.map(row => row[0])).size !== 122 || rows.filter(row => row[2] === 'PASS').length !== 99 || rows.filter(row => row[2] === 'HOLD').length !== 23) {
  throw new Error('Source ledger mismatch: expected unique 122 ids, 99 PASS, 23 HOLD');
}
const header = "// AUTO-GENERATED from data/audits/droids/component-mechanical-certification-ledger.json\n// Do not edit by hand: node tools/build-droid-component-source-status.mjs\n// PASS/HOLD are source-review decisions, NOT runtime or installation certification.\n";
const output = header + 'export const DROID_SOURCE_REVIEW_ROWS = Object.freeze(' + JSON.stringify(rows, null, 2) + ');\\n';
const file = "scripts/data/generated-droid-component-source-status.js";
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output) {
    throw new Error(file + ' is stale; rerun node tools/build-droid-component-source-status.mjs');
  }
  console.log('Droid source-review snapshot current (122 identities; 99 PASS, 23 HOLD)');
} else {
  fs.writeFileSync(file, output);
  console.log('Wrote ' + file);
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 1,
// required audit): a table-driven proof across EVERY current
// `type: 'ATTACK_OPTION'` record in packs/feats.db and packs/talents.db --
// not a mass migration, an audit that the lossless-ingestion guard
// (validateAttackOptionNormalization()) genuinely holds for the real,
// full, current dataset, not just the nine representative classes the
// main groundwork suite exercises. For every one of the 136 records:
//   1. it normalizes to schemaVersion 1;
//   2. every requires*/excludes* gate field on it is recognized in
//      ATTACK_OPTION_GATE_FIELD_DISPOSITION;
//   3. every recognized gate field produced a requirement leaf
//      (validateAttackOptionNormalization() does not throw) -- i.e.
//      nothing was silently dropped.
// Also generates docs/audits/generated/action-authority-normalization-audit-report.{md,json},
// a coverage report of normalized/external-workflow/unsupported gate
// counts across the real dataset.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

registerFoundryPathLoader();
installFoundryShimGlobals();

const { extractAttackOptionRules } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { normalizeAttackOptionRule, getAttackOptionGateFields } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-definition-normalizer.js');
const { ACTION_DEFINITION_SCHEMA_VERSION, ATTACK_OPTION_GATE_FIELD_DISPOSITION } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-definition.js');

function loadDb(relPath) {
  const raw = fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
  return raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
}

function scanRecords(relPath, itemType) {
  const records = loadDb(relPath);
  const out = [];
  for (const record of records) {
    for (const rule of extractAttackOptionRules(record)) {
      out.push({ itemType, itemName: record.name, sourceItem: record, rule });
    }
  }
  return out;
}

const feats = scanRecords('packs/feats.db', 'feat');
const talents = scanRecords('packs/talents.db', 'talent');
const all = [...feats, ...talents];

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

assert.equal(all.length, 136, `expected exactly 136 real ATTACK_OPTION records (88 feats + 48 talents) as of this audit; found ${all.length} -- if this legitimately changed (new content shipped), update this expectation deliberately rather than silently loosening it`);
ok(`extractor discovers exactly 136 real ATTACK_OPTION records (${feats.length} feats, ${talents.length} talents)`);

const gateCounts = { normalized: 0, 'external-workflow': 0, unsupported: 0 };
const perFieldCounts = {};
const failures = [];

for (const { itemType, itemName, sourceItem, rule } of all) {
  try {
    const definition = normalizeAttackOptionRule(sourceItem, rule);
    assert.equal(definition.schemaVersion, ACTION_DEFINITION_SCHEMA_VERSION, `${itemName}: must normalize to the current schema version`);
    // normalizeAttackOptionRule() already calls validateAttackOptionNormalization()
    // internally and throws on any unrecognized/uncovered gate field --
    // reaching this line without a throw is itself part of the proof.
    // Tally gate-field dispositions for the coverage report.
    for (const field of getAttackOptionGateFields(rule)) {
      const disposition = ATTACK_OPTION_GATE_FIELD_DISPOSITION[field];
      gateCounts[disposition] = (gateCounts[disposition] ?? 0) + 1;
      perFieldCounts[field] = (perFieldCounts[field] ?? 0) + 1;
    }
  } catch (err) {
    failures.push({ itemType, itemName, option: rule.option ?? rule.id ?? rule.key ?? rule.name, error: err.message });
  }
}

if (failures.length) {
  console.error('Normalization audit failures:');
  for (const f of failures) console.error(`  [${f.itemType}] ${f.itemName} (${f.option}): ${f.error}`);
}
assert.equal(failures.length, 0, `${failures.length} of 136 real ATTACK_OPTION record(s) failed lossless normalization -- see logged detail above; zero silent drops is required, not optional`);
ok('all 136 real records normalize to schemaVersion 1 with zero validateAttackOptionNormalization() failures -- every requires*/excludes* gate field present is either translated into a requirement predicate or explicitly marked external-workflow/unsupported, none silently dropped');

// Every field disposition actually observed in the real dataset must be
// one of the three recognized categories -- defensive re-check beyond
// what validateAttackOptionNormalization() itself already enforced above.
for (const field of Object.keys(perFieldCounts)) {
  assert.ok(['normalized', 'external-workflow', 'unsupported'].includes(ATTACK_OPTION_GATE_FIELD_DISPOSITION[field]), `gate field "${field}" observed in real data must have a recognized disposition`);
}
ok('every requires*/excludes* gate field actually observed in the real 136-record dataset has a recognized disposition (normalized / external-workflow / unsupported)');

// ─── mutation test: an unrecognized future gate field must be caught ──────

{
  const fakeRule = { type: 'ATTACK_OPTION', option: 'test-future-option', control: 'toggle', requiresMountedCombat: true };
  const fakeSourceItem = { id: 'feat-fake', name: 'Fake Future Feat', type: 'feat' };
  assert.throws(
    () => normalizeAttackOptionRule(fakeSourceItem, fakeRule),
    /unrecognized ATTACK_OPTION requirement field/,
    'a hypothetical future gate field (requiresMountedCombat) with no disposition entry must cause normalization to fail loudly, never silently expose the option as available'
  );
}
ok('mutation test: an unrecognized future gate field (requiresMountedCombat) is caught by validateAttackOptionNormalization() and fails loudly, proving the guard actually guards');

// ─── generate the coverage report ──────────────────────────────────────────

const generated = new Date().toISOString();
const lines = [];
lines.push('# Action Authority Normalization Audit Report');
lines.push('');
lines.push(`Generated: ${generated}`);
lines.push('');
lines.push('Scope: every real `type: \'ATTACK_OPTION\'` record in `packs/feats.db` and `packs/talents.db`, run through `normalizeAttackOptionRule()` + `validateAttackOptionNormalization()` (the lossless-ingestion guard). This proves the CURRENT full dataset normalizes without a single silently-dropped requirement -- it is an audit, not a claim that every normalized definition is wired into a live consumer (none are, in this groundwork round).');
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- Total real ATTACK_OPTION records: ${all.length} (feats: ${feats.length}, talents: ${talents.length})`);
lines.push(`- Records that failed normalization: ${failures.length} (must be 0)`);
lines.push(`- Gate field occurrences classified NORMALIZED: ${gateCounts.normalized}`);
lines.push(`- Gate field occurrences classified EXTERNAL-WORKFLOW: ${gateCounts['external-workflow']}`);
lines.push(`- Gate field occurrences classified UNSUPPORTED: ${gateCounts.unsupported}`);
lines.push('');
lines.push('## Per-field occurrence counts');
lines.push('');
for (const [field, count] of Object.entries(perFieldCounts).sort((a, b) => b[1] - a[1])) {
  lines.push(`- \`${field}\` (${ATTACK_OPTION_GATE_FIELD_DISPOSITION[field]}): ${count}`);
}
lines.push('');

const outDir = path.join(REPO_ROOT, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'action-authority-normalization-audit-report.md'), lines.join('\n') + '\n');
fs.writeFileSync(
  path.join(outDir, 'action-authority-normalization-audit-report.json'),
  JSON.stringify({ generated, total: all.length, feats: feats.length, talents: talents.length, failures: failures.length, gateCounts, perFieldCounts }, null, 2) + '\n'
);
ok(`normalization audit report written: ${all.length} records, ${gateCounts.normalized} normalized + ${gateCounts['external-workflow']} external-workflow + ${gateCounts.unsupported} unsupported gate-field occurrences, 0 silent drops`);

console.log('action-authority-groundwork-normalization-audit.test.mjs: all assertions passed');

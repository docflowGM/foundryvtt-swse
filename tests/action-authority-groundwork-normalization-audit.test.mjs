import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { scanAttackOptionNormalization } from '../tools/action-authority-normalization-scan.mjs';

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
//   3. every recognized gate field produced a requirement leaf with a
//      VALUE that reconciles against the raw rule's own value
//      (validateAttackOptionNormalization() does not throw) -- i.e.
//      nothing was silently dropped OR silently altered.
//
// Math Integrity Freeze, Attack Bonus round 8 correction #3 (test
// hygiene): this test only computes and asserts. It does NOT write the
// generated report files -- an earlier version did, which meant simply
// running the test suite rewrote tracked, timestamped files as a side
// effect. Run `node tools/report-action-authority-normalization-audit.mjs`
// deliberately to regenerate
// docs/audits/generated/action-authority-normalization-audit-report.{md,json}.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

registerFoundryPathLoader();
installFoundryShimGlobals();

const { extractAttackOptionRules } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { normalizeAttackOptionRule, getAttackOptionGateFields, validateAttackOptionNormalization } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-definition-normalizer.js');
const { ACTION_DEFINITION_SCHEMA_VERSION, ATTACK_OPTION_GATE_FIELD_DISPOSITION } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-definition.js');

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

const { all, feats, talents, failures, gateCounts, perFieldCounts } = scanAttackOptionNormalization({
  repoRoot: REPO_ROOT,
  extractAttackOptionRules,
  normalizeAttackOptionRule,
  getAttackOptionGateFields,
  gateFieldDisposition: ATTACK_OPTION_GATE_FIELD_DISPOSITION
});

assert.equal(all.length, 136, `expected exactly 136 real ATTACK_OPTION records (88 feats + 48 talents) as of this audit; found ${all.length} -- if this legitimately changed (new content shipped), update this expectation deliberately rather than silently loosening it`);
ok(`extractor discovers exactly 136 real ATTACK_OPTION records (${feats.length} feats, ${talents.length} talents)`);

if (failures.length) {
  console.error('Normalization audit failures:');
  for (const f of failures) console.error(`  [${f.itemType}] ${f.itemName} (${f.option}): ${f.error}`);
}
assert.equal(failures.length, 0, `${failures.length} of 136 real ATTACK_OPTION record(s) failed lossless normalization -- see logged detail above; zero silent drops is required, not optional`);
ok('all 136 real records normalize to schemaVersion 1 with zero validateAttackOptionNormalization() failures -- every requires*/excludes* gate field present is either translated into a requirement predicate (with a value that reconciles against the raw rule) or explicitly marked external-workflow/unsupported, none silently dropped or silently altered');

// Cross-check: every record also independently confirms schemaVersion,
// since scanAttackOptionNormalization() only proves normalization didn't
// throw, not the shape of what it produced.
for (const { sourceItem, rule } of all) {
  const definition = normalizeAttackOptionRule(sourceItem, rule);
  assert.equal(definition.schemaVersion, ACTION_DEFINITION_SCHEMA_VERSION);
}
ok('every normalized definition carries the current schema version');

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

// ─── mutation test: a corrupted VALUE on an otherwise-correctly-named leaf must be caught (round 8 correction #3, Issue 5) ──

{
  const rule = { type: 'ATTACK_OPTION', option: 'test-value-mutation', control: 'toggle', requiresRangeBand: ['short', 'medium'] };
  const sourceItem = { id: 'feat-fake-2', name: 'Fake Range Feat', type: 'feat' };
  const definition = normalizeAttackOptionRule(sourceItem, rule);
  const corrupted = JSON.parse(JSON.stringify(definition));
  const node = corrupted.requirements.all.find(n => n.sourceField === 'requiresRangeBand');
  node.value = ['long']; // silently swapped to a completely different band
  assert.throws(
    () => validateAttackOptionNormalization(rule, corrupted),
    /VALUE does not match/,
    'a requirement leaf whose value was corrupted after normalization (field name intact) must be caught -- field-name coverage alone is not lossless normalization'
  );
}
ok('mutation test: a corrupted requirement VALUE (sourceField name intact) is caught by validateAttackOptionNormalization(), proving value-level reconciliation, not just field-name coverage');

console.log(`normalization audit: ${all.length} records, ${gateCounts.normalized} normalized + ${gateCounts['external-workflow']} external-workflow + ${gateCounts.unsupported} unsupported gate-field occurrences, 0 silent drops`);
console.log('action-authority-groundwork-normalization-audit.test.mjs: all assertions passed');

#!/usr/bin/env node
// Math Integrity Freeze, Attack Bonus round 8 correction #3 (test hygiene):
// the Action Authority normalization audit's report-writing used to be a
// side effect of running tests/action-authority-groundwork-normalization-
// audit.test.mjs -- rewriting tracked, timestamped report files just
// because the test suite ran is an unwanted side effect. This is now the
// ONLY writer of docs/audits/generated/action-authority-normalization-
// audit-report.{md,json}; the test imports the same shared scan function
// (tools/action-authority-normalization-scan.mjs) but only asserts.
// Run deliberately: `node tools/report-action-authority-normalization-audit.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from '../tests/helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from '../tests/helpers/foundry-shim/globals.mjs';
import { scanAttackOptionNormalization } from './action-authority-normalization-scan.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

registerFoundryPathLoader();
installFoundryShimGlobals();

const { extractAttackOptionRules } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { normalizeAttackOptionRule, getAttackOptionGateFields } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-definition-normalizer.js');
const { ATTACK_OPTION_GATE_FIELD_DISPOSITION } = await import('/systems/foundryvtt-swse/scripts/engine/actions/action-definition.js');

const { all, feats, talents, failures, gateCounts, perFieldCounts } = scanAttackOptionNormalization({
  repoRoot: REPO_ROOT,
  extractAttackOptionRules,
  normalizeAttackOptionRule,
  getAttackOptionGateFields,
  gateFieldDisposition: ATTACK_OPTION_GATE_FIELD_DISPOSITION
});

if (failures.length) {
  console.error(`${failures.length} record(s) failed normalization -- report NOT written:`);
  for (const f of failures) console.error(`  [${f.itemType}] ${f.itemName} (${f.option}): ${f.error}`);
  process.exit(1);
}

const generated = new Date().toISOString();
const lines = [];
lines.push('# Action Authority Normalization Audit Report');
lines.push('');
lines.push(`Generated: ${generated}`);
lines.push('');
lines.push('Scope: every real `type: \'ATTACK_OPTION\'` record in `packs/feats.db` and `packs/talents.db`, run through `normalizeAttackOptionRule()` + `validateAttackOptionNormalization()` (the lossless-ingestion guard, including round 8 correction #3\'s value-level reconciliation). This proves the CURRENT full dataset normalizes without a single silently-dropped or silently-altered requirement -- it is an audit, not a claim that every normalized definition is wired into a live consumer (none are, in this groundwork round).');
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

console.log(`Wrote docs/audits/generated/action-authority-normalization-audit-report.{md,json}: ${all.length} records, ${gateCounts.normalized} normalized + ${gateCounts['external-workflow']} external-workflow + ${gateCounts.unsupported} unsupported gate-field occurrences, 0 failures.`);

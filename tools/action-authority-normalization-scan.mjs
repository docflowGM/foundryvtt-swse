// Math Integrity Freeze, Attack Bonus round 8 correction #3 (test-hygiene
// fix): the scan/tally logic behind the Action Authority normalization
// audit used to live inline inside the test file itself, which also
// wrote the generated report files as a side effect of running the test
// suite -- rewriting tracked, timestamped files just because someone ran
// `npm test` is an unwanted side effect a test must not have. Extracted
// here as one shared, pure(-ish; reads packs/*.db) scan function: the
// test (tests/action-authority-groundwork-normalization-audit.test.mjs)
// imports it to assert, and the report generator
// (tools/report-action-authority-normalization-audit.mjs) imports it to
// assert AND write -- one implementation, two callers, no duplication.
import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {object} deps
 * @param {string} deps.repoRoot
 * @param {(item: object) => object[]} deps.extractAttackOptionRules
 * @param {(sourceItem: object, rule: object) => object} deps.normalizeAttackOptionRule
 * @param {(rule: object) => string[]} deps.getAttackOptionGateFields
 * @param {Record<string, string>} deps.gateFieldDisposition
 * @returns {{all, feats, talents, failures, gateCounts, perFieldCounts}}
 */
export function scanAttackOptionNormalization({ repoRoot, extractAttackOptionRules, normalizeAttackOptionRule, getAttackOptionGateFields, gateFieldDisposition }) {
  function loadDb(relPath) {
    const raw = fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
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

  const gateCounts = { normalized: 0, 'external-workflow': 0, unsupported: 0 };
  const perFieldCounts = {};
  const failures = [];

  for (const { itemType, itemName, sourceItem, rule } of all) {
    try {
      normalizeAttackOptionRule(sourceItem, rule);
      // normalizeAttackOptionRule() already calls
      // validateAttackOptionNormalization() internally and throws on any
      // unrecognized/uncovered/mismatched-value gate field -- reaching
      // this line without a throw is itself part of the proof.
      for (const field of getAttackOptionGateFields(rule)) {
        const disposition = gateFieldDisposition[field];
        gateCounts[disposition] = (gateCounts[disposition] ?? 0) + 1;
        perFieldCounts[field] = (perFieldCounts[field] ?? 0) + 1;
      }
    } catch (err) {
      failures.push({ itemType, itemName, option: rule.option ?? rule.id ?? rule.key ?? rule.name, error: err.message });
    }
  }

  return { all, feats, talents, failures, gateCounts, perFieldCounts };
}

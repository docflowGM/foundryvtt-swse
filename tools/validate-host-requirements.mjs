#!/usr/bin/env node
/**
 * validate-host-requirements.mjs -- D-005 T4c offline validator for data/modifications/host-requirements-v1.json.
 *
 * STATIC CONTRACT VALIDATION ONLY. Read-only: never writes, repairs or re-serializes anything, never reads Item data,
 * and is not a host evaluator. It checks the sidecar's exact structure, its linkage to the committed D005 published-fact
 * records and the immutable v1.5 registry's domain entries, canonical serialization, and the independently pinned hash.
 *
 * Usage:  node tools/validate-host-requirements.mjs [--json]
 * Exit:   0 = valid, 1 = invalid.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHostRequirements, HOST_REQUIREMENTS_PATH, HOST_REQUIREMENTS_SCHEMA_PATH, OWNER_DECISIONS_PATH } from './lib/host-requirements.mjs';
import { REGISTRY_PATH } from './validate-modification-registry.mjs';
import { SPECS_PATH } from './build-modification-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

export function loadAndValidate() {
  const bytes = read(HOST_REQUIREMENTS_PATH);
  const result = validateHostRequirements({
    bytes,
    sidecar: JSON.parse(bytes),
    schema: JSON.parse(read(HOST_REQUIREMENTS_SCHEMA_PATH)),
    specs: JSON.parse(read(SPECS_PATH)).records,
    registry: JSON.parse(read(REGISTRY_PATH)),
    ownerDecisionsText: read(OWNER_DECISIONS_PATH)
  });
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let result;
  try {
    result = loadAndValidate();
  } catch (err) {
    result = { ok: false, failures: [{ code: 'HRV_LOAD', path: '', detail: String(err && err.message) }], counts: null };
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 1));
  else {
    for (const f of result.failures) console.log(`FAIL ${f.code} ${f.path} ${JSON.stringify(f.detail)}`);
    if (result.counts) console.log(`records ${result.counts.total}; domains ${JSON.stringify(result.counts.domains)}; verdicts ${JSON.stringify(result.counts.verdicts)}; empty-install ${result.counts.emptyInstall}; predicates ${result.counts.predicates}`);
    console.log(`RESULT: ${result.ok ? 'VALID' : 'INVALID'} (host requirements)`);
  }
  process.exit(result.ok ? 0 : 1);
}

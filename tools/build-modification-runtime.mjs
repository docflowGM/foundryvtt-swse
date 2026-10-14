#!/usr/bin/env node
// G2: deterministic generator for data/modifications/runtime-definitions-v1.5.json.
//
// Offline, read-only with respect to everything except the one generated output file. Trusted producer: the G1
// validator must accept the immutable v1.5 registry before anything is derived from it. Never writes or repairs
// the registry, the manifest, the ledger, the specification records or the register.
//
//   node tools/build-modification-runtime.mjs            write the generated file
//   node tools/build-modification-runtime.mjs --check    regenerate in memory; fail if the committed file differs
//   node tools/build-modification-runtime.mjs --validate validate the committed file (V10')

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANIFEST_PATH, REGISTRY_PATH, MARKDOWN_PATH } from './validate-modification-registry.mjs';
import { produceTrustedSnapshot } from './lib/modification-snapshot-producer.mjs';
import { deriveRuntime, validateRuntime, canonicalJson, parseRegister, sha256 } from './lib/modification-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RUNTIME_PATH = 'data/modifications/runtime-definitions-v1.5.json';
export const LEDGER_PATH = 'data/modifications/status-ledger-v1.json';
export const SPECS_PATH = 'data/modifications/specification-records-v1.json';
export const REGISTER_PATH = 'docs/audits/swse-rules-decisions-pending.md';

const readBytes = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel)) : null);

/** Loads every input from the pinned repository paths. Returns { ok, error?, inputs? }. */
export function loadInputs(read = readBytes) {
  let manifest;
  try {
    manifest = JSON.parse(read(MANIFEST_PATH).toString('utf8'));
  } catch (err) {
    return { ok: false, error: `MANIFEST_UNREADABLE: ${err.message}` };
  }
  // Trusted offline producer: the registry bytes must pass G1 validation; the handle binds the parsed data to those bytes.
  const produced = produceTrustedSnapshot({ registryBytes: read(REGISTRY_PATH), markdownBytes: read(MARKDOWN_PATH), manifest });
  if (!produced.ok) return produced;
  const ledgerBytes = read(LEDGER_PATH);
  const specsBytes = read(SPECS_PATH);
  const registerBytes = read(REGISTER_PATH);
  if (!ledgerBytes || !specsBytes || !registerBytes) return { ok: false, error: 'INPUT_MISSING: status ledger, specification records and register are all required' };
  let ledger;
  let specs;
  try {
    ledger = JSON.parse(ledgerBytes.toString('utf8'));
    specs = JSON.parse(specsBytes.toString('utf8'));
  } catch (err) {
    return { ok: false, error: `INPUT_UNPARSEABLE: ${err.message}` };
  }
  return {
    ok: true,
    inputs: {
      snapshot: produced.handle,
      ledger,
      specs,
      register: parseRegister(registerBytes.toString('utf8')),
      inputHashes: { ledger: sha256(ledgerBytes), specs: sha256(specsBytes) }
    }
  };
}

function main() {
  const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--validate') ? 'validate' : 'write';
  const loaded = loadInputs();
  if (!loaded.ok) {
    console.error(`FAIL ${loaded.error}`);
    process.exit(1);
  }
  const derived = deriveRuntime(loaded.inputs);
  if (derived.failures.length) {
    for (const x of derived.failures) console.error(`FAIL ${x.code} ${x.path} ${JSON.stringify(x.detail)}`);
    process.exit(1);
  }
  const text = canonicalJson(derived.runtime);
  if (mode === 'write') {
    fs.mkdirSync(path.join(ROOT, path.dirname(RUNTIME_PATH)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, RUNTIME_PATH), text);
    const c = derived.runtime.header.counts;
    console.log(`wrote ${RUNTIME_PATH}: ${c.records} records, ${c.typedDefinitions} typed, ${c.eligibleCandidates} candidates, ${c.accountingEligiblePairs} accounting-eligible, ${c.runtimeSelectable} selectable`);
    return;
  }
  const committed = readBytes(RUNTIME_PATH);
  if (!committed) {
    console.error(`FAIL RUNTIME_MISSING ${RUNTIME_PATH}`);
    process.exit(1);
  }
  if (mode === 'check') {
    if (committed.toString('utf8') !== text) {
      console.error(`FAIL RUNTIME_STALE ${RUNTIME_PATH} differs from deterministic regeneration (run node tools/build-modification-runtime.mjs)`);
      process.exit(1);
    }
    console.log(`OK ${RUNTIME_PATH} matches deterministic regeneration`);
    return;
  }
  const result = validateRuntime({ ...loaded.inputs, runtime: JSON.parse(committed.toString('utf8')) });
  for (const x of result.failures) console.error(`FAIL ${x.code} ${x.path} ${JSON.stringify(x.detail)}`);
  console.log(result.ok ? "RESULT: VALID (V10')" : "RESULT: INVALID (V10')");
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

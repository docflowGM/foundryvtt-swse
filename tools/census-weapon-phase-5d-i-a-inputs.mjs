#!/usr/bin/env node
/**
 * Phase 5D-I-A -- deterministic INPUT MANIFEST of the core attack / damage / range residual convergence.
 *
 *   node tools/census-weapon-phase-5d-i-a-inputs.mjs           write data/audits/weapon-phase-5d-i-a-input-manifest.json
 *   node tools/census-weapon-phase-5d-i-a-inputs.mjs --check   committed manifest is current AND every residual key is classified
 *
 * One row per residual executable key of the I-A owned census buckets (attack modifiers, damage modifiers, area / splash / burst,
 * stun / ion modes, the attack-direct ability-compatibility keys, profile conditionals). The row says what the key is, where it lives, the
 * structured source field that already carries it, the current consumer and the policy that applies. Audit / verification artifact ONLY:
 * no runtime module reads it and it is not a gameplay authority. No key may silently disappear; I_A_UNCLASSIFIED_KEYS must be 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I_A_LEDGER, I_A_OWNERS, I_A_POLICIES, I_A_DISPOSITIONS, I_A_BASELINE, I_A_AFTER, I_A_OWNED_FAMILIES } from './lib/weapon-phase-5d-i-a-ledger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/weapon-phase-5d-i-a-input-manifest.json';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const short = (k) => String(k).replace(/^(weapon-|unmapped::)/, '');
const isCommentLine = (t) => !t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
const codeOf = (file) => read(file).split('\n').filter((l) => !isCommentLine(l.trim())).join('\n');

export function buildManifest() {
  const reg = json('data/weapons/canonical-weapon-registry.json');
  const closure = json('data/audits/weapon-phase-5d-h-closure-census.json');
  const problems = [];
  const profiles = (r) => r?.canonicalStats?.attackProfiles ?? [];

  // ---- occurrence tables -----------------------------------------------------------------------------------------------------
  const opOcc = {}, opWho = {};
  for (const r of reg.identities) for (const k of Object.keys(r.operation ?? {})) { inc(opOcc, k); (opWho[k] ??= []).push(r.identityKey); }
  const reqOcc = {}, reqWho = {};
  const rangeRuleWho = new Set(); let rangeRuleOcc = 0;
  for (const r of reg.identities) {
    for (const p of profiles(r)) {
      for (const a of p.activationRequirements ?? []) { const k = `activationRequirements.${a.type}`; inc(reqOcc, k); (reqWho[k] ??= new Set()).add(r.identityKey); }
      for (const c of p.conditionalRangeRules ?? []) { rangeRuleOcc += 1; rangeRuleWho.add(r.identityKey); void c; }
    }
  }

  // ---- ledger integrity ------------------------------------------------------------------------------------------------------
  const seen = new Set();
  const rows = [];
  for (const L of I_A_LEDGER) {
    const id = `${L.family}::${L.key}`;
    if (seen.has(id)) problems.push(`duplicate ledger row ${id}`);
    seen.add(id);
    if (!I_A_OWNED_FAMILIES.includes(L.family)) problems.push(`${id}: family is not an I-A owned bucket`);
    if (!I_A_POLICIES.includes(L.policy)) problems.push(`${id}: unknown policy ${L.policy}`);
    if (!I_A_DISPOSITIONS.includes(L.disposition)) problems.push(`${id}: unknown disposition ${L.disposition}`);
    if (!L.reason) problems.push(`${id}: no reason`);
    const isProfile = L.family === '3b.profile.conditional';
    const identities = isProfile ? (L.key === 'conditionalRangeRules' ? [...rangeRuleWho] : [...(reqWho[L.key] ?? [])]) : (opWho[L.key] ?? []);
    const raw = isProfile ? (L.key === 'conditionalRangeRules' ? rangeRuleOcc : reqOcc[L.key] ?? 0) : (opOcc[L.key] ?? 0);
    if (!identities.length) problems.push(`${id}: the key no longer exists in the canonical registry (a baseline key must never silently disappear)`);
    if (L.disposition === 'IMPLEMENTED') {
      const files = [L.consumer?.file, L.consumerAlt].filter(Boolean);
      if (!files.length) problems.push(`${id}: IMPLEMENTED without a consumer`);
      else if (!files.some((f) => new RegExp(L.consumer.probe).test(codeOf(f)))) problems.push(`${id}: consumer probe /${L.consumer.probe}/ not found in the executable code of ${files.join(' or ')}`);
    }
    if (L.disposition === 'DUPLICATE') {
      if (!L.carrier) problems.push(`${id}: DUPLICATE without a structured carrier`);
      if (!L.consumer || !read(L.consumer.file).includes(L.consumer.probe)) problems.push(`${id}: duplicate consumer probe "${L.consumer?.probe}" not found in ${L.consumer?.file}`);
      if (typeof L.verify !== 'function' || L.verify(reg) !== true) problems.push(`${id}: the structured carrier "${L.carrier}" is not present on every identity that carries the operation key`);
    }
    if (L.disposition === 'DEFERRED_TO_OWNER' && !I_A_OWNERS.includes(L.owner)) problems.push(`${id}: DEFERRED_TO_OWNER without an owner (I-B / I-C / I-D)`);
    if (L.disposition === 'DATA_COMPLETENESS' && !L.owner) problems.push(`${id}: DATA_COMPLETENESS without an owner`);
    rows.push({
      family: L.family, key: L.key, mechanicFamily: L.mechanic,
      identityCount: identities.length, rawOccurrences: raw,
      representativeWeapons: [...new Set(identities)].sort().slice(0, 4).map(short),
      structuredSourceField: L.carrier ?? (isProfile ? `attackProfiles[].${L.key.startsWith('activationRequirements') ? 'activationRequirements' : 'conditionalRangeRules'}` : `operation.${L.key}`),
      currentConsumer: L.consumer ? `${L.consumer.file} (${L.consumer.probe})` : null,
      proposedPolicy: L.policy, disposition: L.disposition,
      ...(L.owner ? { owner: L.owner } : {}), ...(L.stage ? { damageStage: L.stage } : {}), reason: L.reason,
    });
  }

  // ---- nothing unclassified: every residual key of the owned buckets in the CURRENT closure census must have a row ----------------
  const unclassified = [];
  for (const [fam, row] of Object.entries(closure.operationKeys.families)) {
    const family = `3b.operation.${fam}`;
    if (!I_A_OWNED_FAMILIES.includes(family)) continue;
    for (const k of row.executableUnconsumed) if (!seen.has(`${family}::${k}`)) unclassified.push(`${family}::${k}`);
  }
  for (const k of Object.keys(reqOcc)) if (!seen.has(`3b.profile.conditional::${k}`)) unclassified.push(`3b.profile.conditional::${k}`);
  if (rangeRuleOcc && !seen.has('3b.profile.conditional::conditionalRangeRules')) unclassified.push('3b.profile.conditional::conditionalRangeRules');
  for (const u of unclassified) problems.push(`unclassified residual key ${u}`);
  if (I_A_LEDGER.length !== I_A_BASELINE.I_A_INPUT_KEYS) problems.push(`ledger has ${I_A_LEDGER.length} rows but the I-A baseline pinned ${I_A_BASELINE.I_A_INPUT_KEYS} input keys (a key was added or removed)`);

  // ---- counters --------------------------------------------------------------------------------------------------------------
  const by = (d) => rows.filter((r) => r.disposition === d);
  const deferred = by('DEFERRED_TO_OWNER');
  const deferredByOwner = {}; for (const r of deferred) inc(deferredByOwner, r.owner);
  const byFamily = {}; for (const r of rows) { (byFamily[r.family] ??= {}); inc(byFamily[r.family], r.disposition); }
  const byMechanic = {}; for (const r of rows) inc(byMechanic, r.mechanicFamily);
  const counters = {
    I_A_INPUT_KEYS: rows.length,
    I_A_KEYS_CONSUMED: by('IMPLEMENTED').length,
    I_A_KEYS_DUPLICATE_OF_CONSUMED_FIELD: by('DUPLICATE').length,
    I_A_KEYS_DEFERRED_TO_OWNER: deferred.length,
    I_A_KEYS_DEFERRED_I_B: deferredByOwner['I-B'] ?? 0, I_A_KEYS_DEFERRED_I_C: deferredByOwner['I-C'] ?? 0, I_A_KEYS_DEFERRED_I_D: deferredByOwner['I-D'] ?? 0,
    I_A_KEYS_DATA_COMPLETENESS: by('DATA_COMPLETENESS').length,
    I_A_KEYS_NOT_APPLICABLE: by('NOT_APPLICABLE').length,
    I_A_UNCLASSIFIED_KEYS: unclassified.length,
  };
  if (counters.I_A_KEYS_CONSUMED + counters.I_A_KEYS_DUPLICATE_OF_CONSUMED_FIELD + counters.I_A_KEYS_DEFERRED_TO_OWNER + counters.I_A_KEYS_DATA_COMPLETENESS + counters.I_A_KEYS_NOT_APPLICABLE !== counters.I_A_INPUT_KEYS) problems.push('counter arithmetic does not close');

  const globalCounters = { before: { ...I_A_BASELINE, I_A_INPUT_KEYS: undefined }, after: { ...I_A_AFTER } };
  delete globalCounters.before.I_A_INPUT_KEYS;

  return {
    schemaVersion: 1, phase: '5D-I-A',
    purpose: 'Input manifest of the core attack / damage / range residual convergence. Audit evidence only: no runtime module reads it; each row names the structured source field, the consumer and the policy.',
    counters, globalCounters,
    byFamily: Object.fromEntries(Object.entries(byFamily).sort(([a], [b]) => a.localeCompare(b))),
    byMechanicFamily: sorted(byMechanic),
    rows: rows.sort((a, b) => (a.family + a.key).localeCompare(b.family + b.key)),
    problems,
  };
}

const serialize = (m) => `${JSON.stringify(m, null, 2)}\n`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = buildManifest();
  const out = path.join(ROOT, OUT_JSON);
  if (manifest.problems.length) { console.error(`I-A input manifest has problems:\n  ${manifest.problems.join('\n  ')}`); process.exit(2); }
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== serialize(manifest)) { console.error(`${OUT_JSON} is stale; run node tools/census-weapon-phase-5d-i-a-inputs.mjs`); process.exit(1); }
    console.log('weapon 5D-I-A input manifest: current', JSON.stringify(manifest.counters));
  } else {
    fs.writeFileSync(out, serialize(manifest));
    console.log(`wrote ${OUT_JSON}`, JSON.stringify(manifest.counters));
  }
}

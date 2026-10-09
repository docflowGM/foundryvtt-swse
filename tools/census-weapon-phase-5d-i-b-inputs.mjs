#!/usr/bin/env node
/**
 * Phase 5D-I-B -- deterministic INPUT MANIFEST of the wielding / activation-state / threat-reach / host-state convergence.
 *
 *   node tools/census-weapon-phase-5d-i-b-inputs.mjs           write data/audits/weapon-phase-5d-i-b-input-manifest.json
 *   node tools/census-weapon-phase-5d-i-b-inputs.mjs --check   committed manifest is current AND every mandatory / sibling key is classified
 *
 * MANDATORY keys are exactly the residual keys the 5D-I-A manifest assigned to I-B (17); SIBLING keys are residual keys of the same state
 * seams (reach-and-threat, crew-and-emplacement, configuration-and-wielding) that the new owned-state seam executes or proves duplicate.
 * Audit / verification artifact ONLY: no runtime module reads it. I_B_UNCLASSIFIED_KEYS must be 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I_B_LEDGER, I_B_MANDATORY, I_B_SIBLINGS, I_B_BASELINE, I_B_AFTER, I_B_DISPOSITIONS, I_B_LATER_OWNERS, I_B_SIBLING_FAMILIES } from './lib/weapon-phase-5d-i-b-ledger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/weapon-phase-5d-i-b-input-manifest.json';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const short = (k) => String(k).replace(/^(weapon-|unmapped::|lightsaber-chassis-)/, '');
const isCommentLine = (t) => !t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
const codeOf = (file) => read(file).split('\n').filter((l) => !isCommentLine(l.trim())).join('\n');

export function buildManifest() {
  const reg = json('data/weapons/canonical-weapon-registry.json');
  const closure = json('data/audits/weapon-phase-5d-h-closure-census.json');
  const ia = json('data/audits/weapon-phase-5d-i-a-input-manifest.json');
  const problems = [];
  const opOcc = {}, opWho = {};
  for (const r of reg.identities) for (const k of Object.keys(r.operation ?? {})) { inc(opOcc, k); (opWho[k] ??= []).push(r.identityKey); }
  const reqOcc = {}, reqWho = {};
  for (const r of reg.identities) for (const p of r.canonicalStats?.attackProfiles ?? []) for (const a of p.activationRequirements ?? []) { const k = `activationRequirements.${a.type}`; inc(reqOcc, k); (reqWho[k] ??= new Set()).add(r.identityKey); }

  // the mandatory input set IS the 5D-I-A manifest's I-B-owned deferred rows
  const iaOwned = ia.rows.filter((r) => r.owner === 'I-B' && r.disposition === 'DEFERRED_TO_OWNER').map((r) => r.key).sort();
  const mandatory = I_B_MANDATORY.map((r) => r.key).sort();
  if (JSON.stringify(iaOwned) !== JSON.stringify(mandatory)) problems.push(`mandatory I-B keys differ from the 5D-I-A manifest's I-B-owned keys: ${JSON.stringify({ missing: iaOwned.filter((k) => !mandatory.includes(k)), extra: mandatory.filter((k) => !iaOwned.includes(k)) })}`);
  if (I_B_MANDATORY.length !== I_B_BASELINE.MANDATORY_I_B_INPUT_KEYS) problems.push(`mandatory key count ${I_B_MANDATORY.length} != pinned ${I_B_BASELINE.MANDATORY_I_B_INPUT_KEYS}`);

  const seen = new Set(), rows = [];
  for (const L of I_B_LEDGER) {
    if (seen.has(L.key)) problems.push(`duplicate ledger row ${L.key}`);
    seen.add(L.key);
    if (!I_B_DISPOSITIONS.includes(L.disposition)) problems.push(`${L.key}: unknown disposition ${L.disposition}`);
    if (!L.reason) problems.push(`${L.key}: no reason`);
    const isProfile = L.key.startsWith('activationRequirements.');
    const identities = isProfile ? [...(reqWho[L.key] ?? [])] : (opWho[L.key] ?? []);
    const raw = isProfile ? (reqOcc[L.key] ?? 0) : (opOcc[L.key] ?? 0);
    if (!identities.length) problems.push(`${L.key}: the key no longer exists in the canonical registry`);
    if (L.disposition === 'IMPLEMENTED' && !new RegExp(L.consumer.probe).test(codeOf(L.consumer.file))) problems.push(`${L.key}: consumer probe /${L.consumer.probe}/ not found in the executable code of ${L.consumer.file}`);
    if (L.disposition === 'DUPLICATE') {
      if (!L.carrier) problems.push(`${L.key}: DUPLICATE without a structured carrier`);
      if (!read(L.consumer.file).includes(L.consumer.probe)) problems.push(`${L.key}: duplicate consumer probe "${L.consumer.probe}" not found in ${L.consumer.file}`);
      if (typeof L.verify !== 'function' || L.verify(reg) !== true) problems.push(`${L.key}: the structured carrier "${L.carrier}" is not present on every identity carrying the key`);
    }
    if (L.disposition === 'BLOCKED_BY_SUBSYSTEM' && (!L.subsystem || !I_B_LATER_OWNERS.includes(L.owner))) problems.push(`${L.key}: BLOCKED_BY_SUBSYSTEM needs the named subsystem and a later owner`);
    if (L.disposition === 'DEFERRED_WITH_EXPLICIT_OWNER' && !I_B_LATER_OWNERS.includes(L.owner)) problems.push(`${L.key}: deferral without a later owner`);
    rows.push({
      key: L.key, family: L.family, mandatory: !L.sibling, mechanicFamily: L.mechanic, disposition: L.disposition,
      identityCount: identities.length, rawOccurrences: raw, representativeWeapons: [...new Set(identities)].sort().slice(0, 4).map(short),
      structuredSourceField: L.carrier ?? (isProfile ? 'attackProfiles[].activationRequirements' : `operation.${L.key}`),
      currentConsumer: L.consumer ? `${L.consumer.file} (${L.consumer.probe})` : null,
      ...(L.subsystem ? { blockedBy: L.subsystem } : {}), ...(L.owner ? { owner: L.owner } : {}), reason: L.reason,
    });
  }
  // nothing unclassified: every residual key of the sibling families in the CURRENT closure census, and every activationRequirements type, has a row
  const unclassified = [];
  for (const [fam, row] of Object.entries(closure.operationKeys.families)) {
    if (!I_B_SIBLING_FAMILIES.includes(`3b.operation.${fam}`)) continue;
    for (const k of row.executableUnconsumed) if (!seen.has(k)) unclassified.push(`${fam}::${k}`);
  }
  // (the `target` / `target-rule` requirement types were consumed by 5D-I-A: the I-A manifest row is their record)
  const consumedByIA = new Set(ia.rows.filter((r) => r.disposition === 'IMPLEMENTED').map((r) => r.key));
  for (const k of Object.keys(reqOcc)) if (!seen.has(k) && !consumedByIA.has(k)) unclassified.push(`profile.conditional::${k}`);
  for (const u of unclassified) problems.push(`unclassified residual key ${u}`);

  const by = (d, mand) => rows.filter((r) => r.disposition === d && (mand === undefined || r.mandatory === mand));
  const counters = {
    MANDATORY_I_B_INPUT_KEYS: rows.filter((r) => r.mandatory).length,
    ADDITIONAL_SIBLING_KEYS_REVIEWED: rows.filter((r) => !r.mandatory).length,
    ADDITIONAL_SIBLING_KEYS_CONSUMED: rows.filter((r) => !r.mandatory && (r.disposition === 'IMPLEMENTED' || r.disposition === 'DUPLICATE')).length,
    IMPLEMENTED: by('IMPLEMENTED').length, DUPLICATE: by('DUPLICATE').length, DATA_DEFECT: by('DATA_DEFECT').length, DATA_COMPLETENESS: by('DATA_COMPLETENESS').length,
    BLOCKED_BY_SUBSYSTEM: by('BLOCKED_BY_SUBSYSTEM').length, DEFERRED: by('DEFERRED_WITH_EXPLICIT_OWNER').length,
    MANDATORY_IMPLEMENTED: by('IMPLEMENTED', true).length, MANDATORY_DUPLICATE: by('DUPLICATE', true).length, MANDATORY_BLOCKED: by('BLOCKED_BY_SUBSYSTEM', true).length,
    I_B_UNCLASSIFIED_KEYS: unclassified.length,
  };
  if (counters.IMPLEMENTED + counters.DUPLICATE + counters.DATA_DEFECT + counters.DATA_COMPLETENESS + counters.BLOCKED_BY_SUBSYSTEM + counters.DEFERRED !== rows.length) problems.push('counter arithmetic does not close');
  const byMechanic = {}; for (const r of rows) inc(byMechanic, r.mechanicFamily);
  return {
    schemaVersion: 1, phase: '5D-I-B',
    purpose: 'Input manifest of the wielding / activation-state / threat-reach / host-state convergence. Audit evidence only: no runtime module reads it; each row names the structured source field, the consumer and the disposition.',
    counters, globalCounters: { before: { ...I_B_BASELINE, MANDATORY_I_B_INPUT_KEYS: undefined }, after: { ...I_B_AFTER } },
    byMechanicFamily: Object.fromEntries(Object.entries(byMechanic).sort(([a], [b]) => a.localeCompare(b))),
    rows: rows.sort((a, b) => Number(b.mandatory) - Number(a.mandatory) || a.key.localeCompare(b.key)),
    problems,
  };
}

const serialize = (m) => `${JSON.stringify(m, null, 2)}\n`;
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = buildManifest();
  const out = path.join(ROOT, OUT_JSON);
  if (manifest.problems.length) { console.error(`I-B input manifest has problems:\n  ${manifest.problems.join('\n  ')}`); process.exit(2); }
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== serialize(manifest)) { console.error(`${OUT_JSON} is stale; run node tools/census-weapon-phase-5d-i-b-inputs.mjs`); process.exit(1); }
    console.log('weapon 5D-I-B input manifest: current', JSON.stringify(manifest.counters));
  } else {
    fs.writeFileSync(out, serialize(manifest));
    console.log(`wrote ${OUT_JSON}`, JSON.stringify(manifest.counters));
  }
}

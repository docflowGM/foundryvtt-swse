#!/usr/bin/env node
/**
 * Phase 5D-I-C-A -- deterministic INPUT MANIFEST of the attack outcome / threshold / status / persistent-effect convergence.
 *
 *   node tools/census-weapon-phase-5d-i-c-a-inputs.mjs           write data/audits/weapon-phase-5d-i-c-a-input-manifest.json
 *   node tools/census-weapon-phase-5d-i-c-a-inputs.mjs --check   committed manifest is current AND nothing in the seam is unclassified
 *
 * One row per residual executable key of the closure-census families that own an Apply Damage seam, and per structured special mechanic the
 * 5D-E census classifies in the outcome families. Each row names the structured source field, the trigger / timing, the consumer and the disposition.
 * Audit / verification artifact ONLY: no runtime module reads it and it is not a gameplay authority. I_C_A_UNCLASSIFIED must be 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I_C_A_ROWS, I_C_A_DISPOSITIONS, I_C_A_SEAM_FAMILIES, I_C_A_BASELINE, I_C_A_AFTER } from './lib/weapon-phase-5d-i-c-a-ledger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/weapon-phase-5d-i-c-a-input-manifest.json';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const short = (k) => String(k).replace(/^(weapon-|unmapped::|lightsaber-chassis-)/, '');
const isCommentLine = (t) => !t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
const codeOf = (file) => read(file).split('\n').filter((l) => !isCommentLine(l.trim())).join('\n');
// special-mechanic families whose every classified mechanic must have a row (the outcome seam)
const SEAM_MECHANIC_FAMILIES = new Set(['threshold-adjustment', 'bonus-damage-rider', 'target-class-damage', 'status-effect', 'delayed-damage', 'persistent-poison', 'poison-delivery', 'payload-delegation', 'ct-rider-prompt', 'payload-effect', 'persistent-effect', 'status-condition', 'activation-effect']);

export function buildManifest() {
  const reg = json('data/weapons/canonical-weapon-registry.json');
  const closure = json('data/audits/weapon-phase-5d-h-closure-census.json');
  const special = json('data/audits/weapon-phase-5d-e-special-mechanic-census.json');
  const problems = [];
  const opOcc = {}, opWho = {};
  for (const r of reg.identities) for (const k of Object.keys(r.operation ?? {})) { inc(opOcc, k); (opWho[k] ??= []).push(r.identityKey); }

  // every classified mechanic of the census: identityKey -> ["family:id:POLICY", ...] (across all forms)
  const mechanicsOf = (identityKey) => Object.values(special.identities[identityKey] ?? {}).flat();
  const mechId = (entry) => { const [family, ...rest] = String(entry).split(':'); const policy = rest.pop(); return { family, id: rest.join(':'), policy }; };

  const seen = new Set(), rows = [];
  for (const L of I_C_A_ROWS) {
    if (seen.has(L.key)) problems.push(`duplicate ledger row ${L.key}`);
    seen.add(L.key);
    if (!I_C_A_DISPOSITIONS.includes(L.disposition)) problems.push(`${L.key}: unknown disposition ${L.disposition}`);
    if (!L.reason) problems.push(`${L.key}: no reason`);
    const isOp = L.kind === 'operation-key';
    const identities = isOp ? (opWho[L.key] ?? []) : (L.identityKey ? [L.identityKey] : []);
    const raw = isOp ? (opOcc[L.key] ?? 0) : 1;
    if (!identities.length) problems.push(`${L.key}: the ${isOp ? 'key' : 'identity'} no longer exists in the canonical registry`);
    if (!isOp) {
      const mine = mechanicsOf(L.identityKey).map(mechId);
      if (L.expect) {
        const hit = mine.find((m) => m.family === L.expect.family && m.id === L.mechanicId);
        if (!hit) problems.push(`${L.key}: the special-mechanic census does not classify ${L.identityKey} / ${L.mechanicId} as ${L.expect.family}`);
        else if (L.disposition === 'IMPLEMENTED' && !['AUTO', 'PROMPT'].includes(hit.policy)) problems.push(`${L.key}: IMPLEMENTED but the census policy is ${hit.policy}`);
      } else if (!mine.some((m) => m.id === L.mechanicId) && L.disposition !== 'DATA_COMPLETENESS') {
        problems.push(`${L.key}: the special-mechanic census has no mechanic ${L.mechanicId} on ${L.identityKey}`);
      }
    }
    if (L.disposition === 'IMPLEMENTED') {
      if (!L.consumer) problems.push(`${L.key}: IMPLEMENTED without a consumer`);
      else if (!new RegExp(L.consumer.probe).test(codeOf(L.consumer.file))) problems.push(`${L.key}: consumer probe /${L.consumer.probe}/ not found in the executable code of ${L.consumer.file}`);
    }
    if (L.disposition === 'DUPLICATE') {
      if (!L.carrier) problems.push(`${L.key}: DUPLICATE without a structured carrier`);
      if (!read(L.consumer.file).includes(L.consumer.probe)) problems.push(`${L.key}: duplicate consumer probe "${L.consumer.probe}" not found in ${L.consumer.file}`);
      if (typeof L.verify !== 'function' || L.verify(reg) !== true) problems.push(`${L.key}: the structured carrier "${L.carrier}" is not present on every identity carrying the key`);
    }
    if (L.disposition.startsWith('DEFERRED_TO_') && !L.owner) problems.push(`${L.key}: deferral without an owner`);
    if (L.disposition === 'DEFERRED_TO_I_C_B' && L.owner !== 'I-C-B') problems.push(`${L.key}: owner/disposition mismatch`);
    if (L.disposition === 'DEFERRED_TO_I_C_C' && L.owner !== 'I-C-C') problems.push(`${L.key}: owner/disposition mismatch`);
    if (L.disposition === 'DEFERRED_TO_I_D' && L.owner !== 'I-D') problems.push(`${L.key}: owner/disposition mismatch`);
    if (L.disposition === 'BLOCKED_BY_MISSING_SUBSYSTEM' && (!L.subsystem || !L.owner)) problems.push(`${L.key}: BLOCKED needs the named subsystem and an owner`);
    if (L.disposition === 'DATA_COMPLETENESS' && !L.owner) problems.push(`${L.key}: DATA_COMPLETENESS without an owner`);
    rows.push({
      kind: L.kind, key: L.key, family: L.family, mechanicFamily: L.mechanic, disposition: L.disposition,
      identityCount: identities.length, rawOccurrences: raw, representativeWeapons: [...new Set(identities)].sort().slice(0, 4).map(short),
      structuredSourceField: L.carrier ?? (isOp ? `operation.${L.key}` : 'attackProfiles[].triggeredEffects | payloadProfiles[].specialEffects'),
      ...(L.seam ? { seam: L.seam } : {}), ...(L.timing ? { timing: L.timing } : {}),
      currentConsumer: L.consumer ? `${L.consumer.file} (${L.consumer.probe})` : null,
      ...(L.subsystem ? { blockedBy: L.subsystem } : {}), ...(L.owner ? { owner: L.owner } : {}), ...(L.priorPhase ? { priorPhase: L.priorPhase } : {}), reason: L.reason,
    });
  }

  // nothing unclassified ------------------------------------------------------------------------------------------------------------------------
  const unclassified = [];
  for (const [fam, row] of Object.entries(closure.operationKeys.families)) {
    if (!I_C_A_SEAM_FAMILIES.includes(`3b.operation.${fam}`)) continue;
    for (const k of row.executableUnconsumed) if (!seen.has(`${k}`)) unclassified.push(`${fam}::${k}`);
  }
  for (const [identityKey, forms] of Object.entries(special.identities)) {
    for (const entry of Object.values(forms).flat()) {
      const m = mechId(entry);
      if (!SEAM_MECHANIC_FAMILIES.has(m.family) && !(m.family === 'ct-rider' && /venom/.test(m.id))) continue;
      // a mechanic derived from an operation key is classified by that key's row (or by its own mechanic row)
      const opKey = m.id.startsWith('operation.') ? m.id.slice('operation.'.length) : null;
      if (!seen.has(`${identityKey}::${m.id}`) && !(opKey && seen.has(opKey))) unclassified.push(`${identityKey}::${m.id}`);
    }
  }
  for (const u of [...new Set(unclassified)]) problems.push(`unclassified ${u}`);

  const by = (d) => rows.filter((r) => r.disposition === d);
  const counters = {
    I_C_A_INPUT_MECHANICS: rows.length,
    I_C_A_OPERATION_KEYS: rows.filter((r) => r.kind === 'operation-key').length,
    I_C_A_SPECIAL_MECHANICS: rows.filter((r) => r.kind === 'special-mechanic').length,
    I_C_A_IMPLEMENTED: by('IMPLEMENTED').length,
    I_C_A_DUPLICATES: by('DUPLICATE').length,
    I_C_A_DATA_DEFECT: by('DATA_DEFECT').length,
    I_C_A_DATA_COMPLETENESS: by('DATA_COMPLETENESS').length,
    I_C_A_DEFERRED_I_C_B: by('DEFERRED_TO_I_C_B').length,
    I_C_A_DEFERRED_I_C_C: by('DEFERRED_TO_I_C_C').length,
    I_C_A_DEFERRED_I_D: by('DEFERRED_TO_I_D').length,
    I_C_A_BLOCKED: by('BLOCKED_BY_MISSING_SUBSYSTEM').length,
    I_C_A_UNCLASSIFIED: [...new Set(unclassified)].length,
  };
  const sum = counters.I_C_A_IMPLEMENTED + counters.I_C_A_DUPLICATES + counters.I_C_A_DATA_DEFECT + counters.I_C_A_DATA_COMPLETENESS + counters.I_C_A_DEFERRED_I_C_B + counters.I_C_A_DEFERRED_I_C_C + counters.I_C_A_DEFERRED_I_D + counters.I_C_A_BLOCKED;
  if (sum !== counters.I_C_A_INPUT_MECHANICS) problems.push('counter arithmetic does not close');
  const byMechanic = {}; for (const r of rows) inc(byMechanic, r.mechanicFamily);
  return {
    schemaVersion: 1, phase: '5D-I-C-A',
    purpose: 'Input manifest of the attack outcome / threshold / status / persistent-effect convergence. Audit evidence only: no runtime module reads it; each row names the structured source field, trigger / timing, consumer and disposition.',
    counters,
    globalCounters: { before: { ...I_C_A_BASELINE }, after: { ...I_C_A_AFTER } },
    specialMechanicDeferredByOwner: special.deferredByOwner ?? {},
    byMechanicFamily: Object.fromEntries(Object.entries(byMechanic).sort(([a], [b]) => a.localeCompare(b))),
    rows: rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key)),
    problems,
  };
}

const serialize = (m) => `${JSON.stringify(m, null, 2)}\n`;
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = buildManifest();
  const out = path.join(ROOT, OUT_JSON);
  if (manifest.problems.length) { console.error(`I-C-A input manifest has problems:\n  ${manifest.problems.join('\n  ')}`); process.exit(2); }
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== serialize(manifest)) { console.error(`${OUT_JSON} is stale; run node tools/census-weapon-phase-5d-i-c-a-inputs.mjs`); process.exit(1); }
    console.log('weapon 5D-I-C-A input manifest: current', JSON.stringify(manifest.counters));
  } else {
    fs.writeFileSync(out, serialize(manifest));
    console.log(`wrote ${OUT_JSON}`, JSON.stringify(manifest.counters));
  }
}

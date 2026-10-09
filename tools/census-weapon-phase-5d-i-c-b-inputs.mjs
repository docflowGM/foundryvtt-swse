#!/usr/bin/env node
/**
 * Phase 5D-I-C-B -- deterministic INPUT MANIFEST of the weapon CONTROL convergence (grab / grapple / restrain / net / snare / tractor / hurl).
 *
 *   node tools/census-weapon-phase-5d-i-c-b-inputs.mjs           write data/audits/weapon-phase-5d-i-c-b-input-manifest.json
 *   node tools/census-weapon-phase-5d-i-c-b-inputs.mjs --check   committed manifest is current AND nothing in the seam is unclassified
 *
 * One row per grab-grapple-restrain operation key (and per key a later family hands to weapon control), per structured special mechanic the 5D-E census
 * classifies in the grab-grapple family, and per ability relation the control contract consumes. Each row names the structured source field, trigger /
 * timing, consumer and disposition. Audit / verification artifact ONLY: no runtime module reads it and it is not a gameplay authority.
 * I_C_B_UNCLASSIFIED must be 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I_C_B_ROWS, I_C_B_DISPOSITIONS, I_C_B_BASELINE } from './lib/weapon-phase-5d-i-c-b-ledger.mjs';
import { I_C_A_ROWS } from './lib/weapon-phase-5d-i-c-a-ledger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/weapon-phase-5d-i-c-b-input-manifest.json';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const short = (k) => String(k).replace(/^(weapon-|unmapped::|lightsaber-chassis-)/, '');
const isCommentLine = (t) => !t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
const codeOf = (file) => read(file).split('\n').filter((l) => !isCommentLine(l.trim())).join('\n');
const GRAB_FAMILY = 'grab-grapple-restrain';

export function buildManifest() {
  const reg = json('data/weapons/canonical-weapon-registry.json');
  const closure = json('data/audits/weapon-phase-5d-h-closure-census.json');
  const special = json('data/audits/weapon-phase-5d-e-special-mechanic-census.json');
  const problems = [];
  const opOcc = {}, opWho = {};
  for (const r of reg.identities) for (const k of Object.keys(r.operation ?? {})) { inc(opOcc, k); (opWho[k] ??= []).push(r.identityKey); }
  const mechanicsOf = (identityKey) => Object.values(special.identities[identityKey] ?? {}).flat();
  const mechId = (entry) => { const [family, ...rest] = String(entry).split(':'); const policy = rest.pop(); return { family, id: rest.join(':'), policy }; };
  const relations = closure.relations ?? {};
  const consumedRelations = new Set((relations.executableConsumed ?? []).map((r) => r.relation));
  const deferredRelations = new Set((relations.executableDeferred ?? []).map((r) => r.relation));

  const seen = new Set(), rows = [];
  for (const L of I_C_B_ROWS) {
    if (seen.has(L.key)) problems.push(`duplicate ledger row ${L.key}`);
    seen.add(L.key);
    if (!I_C_B_DISPOSITIONS.includes(L.disposition)) problems.push(`${L.key}: unknown disposition ${L.disposition}`);
    if (!L.reason) problems.push(`${L.key}: no reason`);
    const isOp = L.kind === 'operation-key', isRel = L.kind === 'relation';
    const identities = isOp ? (opWho[L.key] ?? []) : isRel ? [] : (L.identityKey ? [L.identityKey] : []);
    const raw = isOp ? (opOcc[L.key] ?? 0) : isRel ? ((relations.counts ?? {})[L.key] ?? 0) : 1;
    if (!L.virtual && !isRel && !identities.length) problems.push(`${L.key}: the ${isOp ? 'key' : 'identity'} no longer exists in the canonical registry`);
    if (L.kind === 'special-mechanic') {
      const mine = mechanicsOf(L.identityKey).map(mechId);
      const hit = mine.find((m) => (!L.expect || m.family === L.expect.family) && m.id === L.mechanicId);
      if (!hit) problems.push(`${L.key}: the special-mechanic census does not classify ${L.identityKey} / ${L.mechanicId} as ${L.expect?.family ?? 'any family'}`);
      else if (L.disposition === 'IMPLEMENTED' && !['AUTO', 'PROMPT'].includes(hit.policy)) problems.push(`${L.key}: IMPLEMENTED but the census policy is ${hit.policy}`);
    }
    if (isRel) {
      if (L.disposition === 'IMPLEMENTED' && (!consumedRelations.has(L.key) || deferredRelations.has(L.key))) problems.push(`${L.key}: relation is not consumed (or is still deferred) in the closure census`);
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
    if (L.disposition === 'DEFERRED_TO_I_C_C' && L.owner !== 'I-C-C') problems.push(`${L.key}: owner/disposition mismatch`);
    if (L.disposition === 'DEFERRED_TO_I_D' && L.owner !== 'I-D') problems.push(`${L.key}: owner/disposition mismatch`);
    if (L.disposition === 'BLOCKED_BY_MISSING_CORE_GRAPPLE_CAPABILITY' && (!L.subsystem || !L.owner)) problems.push(`${L.key}: BLOCKED needs the named capability and an owner`);
    if (L.disposition === 'DATA_COMPLETENESS' && !L.owner) problems.push(`${L.key}: DATA_COMPLETENESS without an owner`);
    rows.push({
      kind: L.kind, key: L.key, family: L.family, mechanicFamily: L.mechanic, disposition: L.disposition,
      identityCount: identities.length, rawOccurrences: raw, representativeWeapons: [...new Set(identities)].sort().slice(0, 4).map(short),
      structuredSourceField: L.carrier ?? (isOp ? `operation.${L.key}` : isRel ? `abilityInteractions[].relation = ${L.key}` : 'attackProfiles[].triggeredEffects | operation'),
      currentConsumer: L.consumer ? `${L.consumer.file} (${L.consumer.probe})` : null,
      ...(L.subsystem ? { blockedBy: L.subsystem } : {}), ...(L.owner ? { owner: L.owner } : {}), ...(L.dataAction ? { dataAction: L.dataAction } : {}), ...(L.virtual ? { virtual: true } : {}), reason: L.reason,
    });
  }

  // nothing unclassified ------------------------------------------------------------------------------------------------------------------------
  const unclassified = [];
  const fam = closure.operationKeys.families[GRAB_FAMILY] ?? { consumed: [], executableUnconsumed: [], duplicates: {} };
  for (const k of [...fam.consumed, ...fam.executableUnconsumed, ...Object.keys(fam.duplicates ?? {})]) if (!seen.has(k)) unclassified.push(`${GRAB_FAMILY}::${k}`);
  // every key a prior phase handed to I-C-B
  for (const L of I_C_A_ROWS) if (L.disposition === 'DEFERRED_TO_I_C_B' && L.kind === 'operation-key' && !seen.has(L.key)) unclassified.push(`I-C-A deferral ${L.key}`);
  // every mechanic of the grab-grapple family the 5D-E census classifies
  for (const [identityKey, forms] of Object.entries(special.identities)) {
    for (const entry of Object.values(forms).flat()) {
      const m = mechId(entry);
      if (m.family !== 'grab-grapple') continue;
      if (!seen.has(`${identityKey}::${m.id}`)) unclassified.push(`${identityKey}::${m.id}`);
    }
  }
  // no mechanic of this family may remain DEFER
  for (const [identityKey, forms] of Object.entries(special.identities)) for (const entry of Object.values(forms).flat()) { const m = mechId(entry); if (m.family === 'grab-grapple' && m.policy === 'DEFER') unclassified.push(`${identityKey}::${m.id} (DEFER)`); }
  for (const u of [...new Set(unclassified)]) problems.push(`unclassified ${u}`);

  const by = (d) => rows.filter((r) => r.disposition === d);
  const counters = {
    I_C_B_INPUT_MECHANICS: rows.length,
    I_C_B_OPERATION_KEYS: rows.filter((r) => r.kind === 'operation-key').length,
    I_C_B_SPECIAL_MECHANICS: rows.filter((r) => r.kind === 'special-mechanic').length,
    I_C_B_RELATIONS: rows.filter((r) => r.kind === 'relation').length,
    I_C_B_IMPLEMENTED: by('IMPLEMENTED').length,
    I_C_B_DUPLICATES: by('DUPLICATE').length,
    I_C_B_DATA_DEFECT: by('DATA_DEFECT').length,
    I_C_B_DATA_COMPLETENESS: by('DATA_COMPLETENESS').length,
    I_C_B_DEFERRED_I_C_C: by('DEFERRED_TO_I_C_C').length,
    I_C_B_DEFERRED_I_D: by('DEFERRED_TO_I_D').length,
    I_C_B_BLOCKED: by('BLOCKED_BY_MISSING_CORE_GRAPPLE_CAPABILITY').length,
    I_C_B_UNCLASSIFIED: [...new Set(unclassified)].length,
  };
  const sum = counters.I_C_B_IMPLEMENTED + counters.I_C_B_DUPLICATES + counters.I_C_B_DATA_DEFECT + counters.I_C_B_DATA_COMPLETENESS + counters.I_C_B_DEFERRED_I_C_C + counters.I_C_B_DEFERRED_I_D + counters.I_C_B_BLOCKED;
  if (sum !== counters.I_C_B_INPUT_MECHANICS) problems.push('counter arithmetic does not close');
  const byMechanic = {}; for (const r of rows) inc(byMechanic, r.mechanicFamily);
  const c = closure.counters ?? {};
  const after = {
    UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER: c.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER, RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER: c.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER,
    UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER: c.UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER, EXECUTABLE_FORM_MECHANICS_DEFERRED: c.EXECUTABLE_FORM_MECHANICS_DEFERRED,
    SPECIAL_DEFER_I_C_B: (special.deferredByOwner ?? {})['I-C-B'] ?? 0, SPECIAL_DEFER_I_C_C: (special.deferredByOwner ?? {})['I-C-C'] ?? 0, SPECIAL_DEFER_I_D: (special.deferredByOwner ?? {})['I-D'] ?? 0,
    EXECUTABLE_RELATION_FAMILIES_DEFERRED: c.EXECUTABLE_RELATION_FAMILIES_DEFERRED, GRAB_GRAPPLE_RESTRAIN_UNCONSUMED_KEYS: fam.executableUnconsumed.length,
  };
  return {
    schemaVersion: 1, phase: '5D-I-C-B',
    purpose: 'Input manifest of the weapon control convergence (grab / grapple / restrain / net / snare / tractor / hurl). Audit evidence only: no runtime module reads it; each row names the structured source field, trigger / timing, consumer and disposition.',
    counters,
    globalCounters: { before: { ...I_C_B_BASELINE }, after },
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
  if (manifest.problems.length) { console.error(`I-C-B input manifest has problems:\n  ${manifest.problems.join('\n  ')}`); process.exit(2); }
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== serialize(manifest)) { console.error(`${OUT_JSON} is stale; run node tools/census-weapon-phase-5d-i-c-b-inputs.mjs`); process.exit(1); }
    console.log('weapon 5D-I-C-B input manifest: current', JSON.stringify(manifest.counters));
  } else {
    fs.writeFileSync(out, serialize(manifest));
    console.log(`wrote ${OUT_JSON}`, JSON.stringify(manifest.counters));
  }
}

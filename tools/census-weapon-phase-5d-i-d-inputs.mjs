#!/usr/bin/env node
/**
 * Phase 5D-I-D -- deterministic INPUT MANIFEST of the final weapon residual convergence.
 *
 *   node tools/census-weapon-phase-5d-i-d-inputs.mjs           write data/audits/weapon-phase-5d-i-d-input-manifest.json
 *   node tools/census-weapon-phase-5d-i-d-inputs.mjs --check   committed manifest is current AND nothing in the residual is unclassified
 *
 * One row per operation key the 5D-H closure census still reports WITHOUT a consumer, per I-D special-mechanic DEFER and per deferred talent-corpus relation.
 * Audit evidence ONLY: no runtime module reads it, and it does NOT feed the 5D-H closure census (so it cannot lower a counter by itself).
 * I_D_UNCLASSIFIED must be 0. A BLOCKED row must cite tripwires that still hold today; a tripwire that stops holding means the missing subsystem now exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I_D_ROWS, I_D_DISPOSITIONS, I_D_SUBPASSES, I_D_FIELD_FAMILY_OWNERS, TRIPWIRES } from './lib/weapon-phase-5d-i-d-ledger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/weapon-phase-5d-i-d-input-manifest.json';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const isCommentLine = (t) => !t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
const codeOfText = (text) => text.split('\n').filter((l) => !isCommentLine(l.trim())).join('\n');
const listJs = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listJs(`${dir}/${e.name}`) : e.name.endsWith('.js') ? [`${dir}/${e.name}`] : []));
let scriptCode = null;
const allScripts = () => (scriptCode ??= listJs('scripts').map((f) => [f, codeOfText(read(f))]));
const scoped = (t) => allScripts().filter(([f]) => !t.dirs || t.dirs.some((d) => f.startsWith(`${d}/`)));

export function evaluateTripwire(id, spec = null) {
  const t = spec ?? TRIPWIRES[id];
  if (!t) return { ok: false, detail: `unknown tripwire ${id}` };
  if (t.kind === 'none') { const hits = scoped(t).filter(([, c]) => new RegExp(t.pattern).test(c)).map(([f]) => f); return { ok: hits.length === 0, detail: hits.length ? `now present in ${hits.slice(0, 3).join(', ')}` : 'absent' }; }
  if (t.kind === 'count') { const hits = allScripts().filter(([, c]) => new RegExp(t.pattern).test(c)).map(([f]) => f); return { ok: hits.length === t.count, detail: `${hits.length} file(s) (expected ${t.count})` }; }
  if (t.kind === 'unreferenced') { const hits = allScripts().filter(([f]) => f !== t.module).filter(([, c]) => c.includes(t.needle)).map(([f]) => f); return { ok: hits.length === 0, detail: hits.length ? `now referenced by ${hits.slice(0, 3).join(', ')}` : 'no importer' }; }
  if (t.kind === 'contains') return { ok: codeOfText(read(t.file)).includes(t.needle), detail: `${t.file} contains the expected filter` };
  return { ok: false, detail: `unsupported tripwire kind ${t.kind}` };
}

export function buildManifest() {
  const reg = json('data/weapons/canonical-weapon-registry.json');
  const closure = json('data/audits/weapon-phase-5d-h-closure-census.json');
  const special = json('data/audits/weapon-phase-5d-e-special-mechanic-census.json');
  const problems = [];
  const opOcc = {}, opWho = {};
  for (const r of reg.identities) for (const k of Object.keys(r.operation ?? {})) { inc(opOcc, k); (opWho[k] ??= []).push(r.identityKey); }
  const mechId = (entry) => { const [family, ...rest] = String(entry).split(':'); const policy = rest.pop(); return { family, id: rest.join(':'), policy }; };

  // the live residual to classify
  const unconsumedByFamily = {};
  for (const [fam, v] of Object.entries(closure.operationKeys.families)) for (const k of v.executableUnconsumed ?? []) (unconsumedByFamily[k] ??= []).push(fam);
  const specialDefers = [];
  for (const [identityKey, forms] of Object.entries(special.identities)) for (const entry of Object.values(forms).flat()) { const m = mechId(entry); if (m.policy === 'DEFER') specialDefers.push(`${identityKey}::${m.id}`); }
  const relationsDeferred = (closure.relations.executableDeferred ?? []).map((r) => r.relation);

  const seen = new Set(), rows = [];
  for (const L of I_D_ROWS) {
    if (seen.has(L.key)) problems.push(`duplicate ledger row ${L.key}`);
    seen.add(L.key);
    if (!I_D_DISPOSITIONS.includes(L.disposition)) problems.push(`${L.key}: unknown disposition ${L.disposition}`);
    if (!I_D_SUBPASSES[L.subpass]) problems.push(`${L.key}: unknown subpass ${L.subpass}`);
    if (!L.reason) problems.push(`${L.key}: no reason`);
    const isOp = L.kind === 'operation-key';
    const identities = isOp ? (opWho[L.key] ?? []) : L.identityKey ? [L.identityKey] : [];
    if (isOp && !identities.length) problems.push(`${L.key}: the key no longer exists in the canonical registry`);
    if (isOp && !unconsumedByFamily[L.key]) problems.push(`${L.key}: no longer reported unconsumed by the 5D-H closure census (reclassify / retire the row)`);
    if (L.disposition.startsWith('DEFERRED_TO_') && !L.owner) problems.push(`${L.key}: deferral without an owner`);
    if (L.disposition === 'BLOCKED') {
      if (!L.subsystem || !L.owner) problems.push(`${L.key}: BLOCKED needs the named subsystem and an owner`);
      if (!['INTEGRATION_CANDIDATE', 'MISSING_SUBSYSTEM'].includes(L.blockKind)) problems.push(`${L.key}: BLOCKED needs a blockKind`);
      if (!L.tripwires?.length) problems.push(`${L.key}: BLOCKED needs at least one tripwire proving the subsystem is absent`);
    }
    for (const id of L.tripwires ?? []) { const t = evaluateTripwire(id); if (!t.ok) problems.push(`${L.key}: tripwire ${id} no longer holds (${t.detail}); the subsystem may now exist, reclassify`); }
    if (L.disposition === 'DUPLICATE') {
      if (!L.carrier || !L.consumer) problems.push(`${L.key}: DUPLICATE needs a carrier and a consumer`);
      else if (!codeOfText(read(L.consumer.file)).includes(L.consumer.probe)) problems.push(`${L.key}: duplicate consumer probe not found in ${L.consumer.file}`);
      if (typeof L.verify !== 'function' || L.verify(reg) !== true) problems.push(`${L.key}: the structured carrier is not present on every identity carrying the key`);
    }
    if (L.disposition === 'NON_EXECUTABLE' && (typeof L.verify !== 'function' || L.verify(reg) !== true)) problems.push(`${L.key}: NON_EXECUTABLE but the carried value does not state a non-mechanical fact`);
    if (L.disposition === 'IMPLEMENTED' && (!L.consumer || !new RegExp(L.consumer.probe).test(codeOfText(read(L.consumer.file))))) problems.push(`${L.key}: IMPLEMENTED without a probe found in its consumer's executable code`);
    if (L.kind === 'special-mechanic') {
      const hit = Object.values(special.identities[L.identityKey] ?? {}).flat().map(mechId).find((m) => m.id === L.mechanicId);
      if (!hit) problems.push(`${L.key}: the special-mechanic census no longer classifies ${L.identityKey} / ${L.mechanicId}`);
    }
    if (L.kind === 'relation' && !relationsDeferred.includes(L.key)) problems.push(`${L.key}: relation is no longer deferred in the closure census`);
    rows.push({
      kind: L.kind, key: L.key, family: L.family, subpass: L.subpass, disposition: L.disposition,
      identityCount: identities.length, rawOccurrences: isOp ? (opOcc[L.key] ?? 0) : 1,
      representativeWeapons: [...new Set(identities)].sort().slice(0, 4).map((k) => k.replace(/^(weapon-|unmapped::)/, '')),
      structuredSourceField: L.carrier ?? (isOp ? `operation.${L.key}` : L.kind === 'relation' ? `abilityInteractions[].relation = ${L.key}` : 'triggeredEffects | special-mechanic census'),
      ...(L.consumer ? { currentConsumer: `${L.consumer.file} (${L.consumer.probe})` } : {}),
      ...(L.subsystem ? { missingSubsystem: L.subsystem, blockKind: L.blockKind } : {}), ...(L.tripwires ? { tripwires: L.tripwires } : {}),
      ...(L.owner ? { owner: L.owner } : {}), ...(L.nonExecutableClass ? { nonExecutableClass: L.nonExecutableClass } : {}), reason: L.reason,
    });
  }

  // nothing unclassified --------------------------------------------------------------------------------------------------------------------------
  const unclassified = [];
  for (const k of Object.keys(unconsumedByFamily)) if (!seen.has(k)) unclassified.push(`operation::${k}`);
  for (const s of specialDefers) if (!seen.has(s)) unclassified.push(`special::${s}`);
  for (const r of relationsDeferred) if (!seen.has(r)) unclassified.push(`relation::${r}`);
  const partial = closure.fieldFamilies.familiesPartial ?? [], without = closure.fieldFamilies.familiesWithoutConsumer ?? [];
  for (const f of [...partial, ...without]) if (!I_D_FIELD_FAMILY_OWNERS[f]) unclassified.push(`field-family::${f}`);
  for (const u of unclassified) problems.push(`unclassified ${u}`);

  const blockKinds = {}; for (const r of rows.filter((x) => x.disposition === 'BLOCKED')) inc(blockKinds, r.blockKind);
  const by = (d) => rows.filter((r) => r.disposition === d).length;
  const bySub = {}; for (const r of rows) inc(bySub, r.subpass);
  const c = closure.counters ?? {};
  const counters = {
    I_D_INPUT_OPERATION_KEYS: rows.filter((r) => r.kind === 'operation-key').length,
    I_D_INPUT_SPECIAL_MECHANICS: rows.filter((r) => r.kind === 'special-mechanic').length,
    I_D_INPUT_RELATIONS: rows.filter((r) => r.kind === 'relation').length,
    I_D_INPUT_TOTAL: rows.length,
    I_D_IMPLEMENTED: by('IMPLEMENTED'), I_D_DUPLICATES: by('DUPLICATE'), I_D_NON_EXECUTABLE: by('NON_EXECUTABLE'), I_D_DATA_DEFECT: by('DATA_DEFECT'), I_D_DATA_COMPLETENESS: by('DATA_COMPLETENESS'), I_D_BLOCKED: by('BLOCKED'),
    I_D_DEFERRED: rows.filter((r) => r.disposition.startsWith('DEFERRED_TO_')).length,
    I_D_UNCLASSIFIED: unclassified.length,
  };
  const sum = counters.I_D_IMPLEMENTED + counters.I_D_DUPLICATES + counters.I_D_NON_EXECUTABLE + counters.I_D_DATA_DEFECT + counters.I_D_DATA_COMPLETENESS + counters.I_D_BLOCKED + counters.I_D_DEFERRED;
  if (sum !== counters.I_D_INPUT_TOTAL) problems.push('counter arithmetic does not close');
  if (counters.I_D_INPUT_OPERATION_KEYS !== c.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER) problems.push(`ledger covers ${counters.I_D_INPUT_OPERATION_KEYS} operation keys but the closure census reports ${c.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER} unconsumed`);

  return {
    schemaVersion: 1, phase: '5D-I-D',
    purpose: 'Input manifest of the final weapon residual convergence. Audit evidence only: no runtime module reads it and it does not feed the 5D-H closure census. BLOCKED rows are guarded by tripwires that fail the day the missing subsystem appears.',
    subpasses: I_D_SUBPASSES,
    counters,
    closureCensusAtGeneration: {
      UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER: c.UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER, RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER: c.RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER,
      FULLY_CONSUMED_EXECUTION_FIELD_FAMILIES: c.FULLY_CONSUMED_EXECUTION_FIELD_FAMILIES, PARTIAL_EXECUTION_FIELD_FAMILIES: c.PARTIAL_EXECUTION_FIELD_FAMILIES, UNCONSUMED_EXECUTION_FIELD_FAMILIES: c.UNCONSUMED_EXECUTION_FIELD_FAMILIES,
      EXECUTABLE_FORM_MECHANICS_DEFERRED: c.EXECUTABLE_FORM_MECHANICS_DEFERRED, EXECUTABLE_RELATION_FAMILIES_DEFERRED: c.EXECUTABLE_RELATION_FAMILIES_DEFERRED, CANONICAL_NAME_TEXT_HEURISTIC_USAGE: c.CANONICAL_NAME_TEXT_HEURISTIC_USAGE,
    },
    blockedByKind: blockKinds,
    bySubpass: Object.fromEntries(Object.entries(bySub).sort(([a], [b]) => a.localeCompare(b))),
    fieldFamilyOwners: { partialOrUnconsumed: Object.fromEntries([...partial, ...without].sort().map((f) => [f, I_D_FIELD_FAMILY_OWNERS[f] ?? null])) },
    tripwires: Object.fromEntries(Object.entries(TRIPWIRES).map(([id, t]) => [id, { kind: t.kind, note: t.note, holds: evaluateTripwire(id).ok }])),
    rows: rows.sort((a, b) => a.subpass.localeCompare(b.subpass) || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key)),
    problems,
  };
}

const serialize = (m) => `${JSON.stringify(m, null, 2)}\n`;
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = buildManifest();
  const out = path.join(ROOT, OUT_JSON);
  if (manifest.problems.length) { console.error(`I-D input manifest has problems:\n  ${manifest.problems.join('\n  ')}`); process.exit(2); }
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== serialize(manifest)) { console.error(`${OUT_JSON} is stale; run node tools/census-weapon-phase-5d-i-d-inputs.mjs`); process.exit(1); }
    console.log('weapon 5D-I-D input manifest: current', JSON.stringify(manifest.counters));
  } else {
    fs.writeFileSync(out, serialize(manifest));
    console.log(`wrote ${OUT_JSON}`, JSON.stringify(manifest.counters));
  }
}

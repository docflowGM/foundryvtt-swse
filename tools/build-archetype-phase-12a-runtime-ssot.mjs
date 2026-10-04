#!/usr/bin/env node
/**
 * Phase 12A — deterministic builder for data/archetypes.json.
 *
 *   node tools/build-archetype-phase-12a-runtime-ssot.mjs --input <archetypes_transport.json>
 *   node tools/build-archetype-phase-12a-runtime-ssot.mjs --input <...> --check   # no writes; fails on diff
 *
 * Reads the Phase 0-11 production artifact, applies ONLY the certified
 * normalizations (drop 15 Phase-11-only tags from the semantic lane; correct 12
 * synthetic lightsaber-form-power ids), validates against the live repository
 * authorities, and writes:
 *   data/archetypes.json
 *   data/audits/archetype-phase-12a-runtime-ssot.json
 * It never infers archetype semantics and fails closed on any authority
 * mismatch. Output is byte-deterministic (no timestamps).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  ARCHETYPE_SSOT_PATH,
  EXACT_REF_BASELINE,
  EXPECTED_COUNTS,
  FORM_POWER_ID_CORRECTIONS,
  PHASE11_ONLY_TAGS,
  validateArchetypeDataset
} from '../scripts/engine/archetype/archetype-ssot-contract.js';
import { loadArchetypeAuthorities } from './lib/archetype-authorities.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const AUDIT_JSON_PATH = 'data/audits/archetype-phase-12a-runtime-ssot.json';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const sortedUnique = (a) => [...new Set(a)].sort();
const clone = (o) => JSON.parse(JSON.stringify(o));
const avg = (n, d) => Math.round((n / d) * 100) / 100;

function assertSourceArtifact(source) {
  const m = source?._meta ?? {};
  const problems = [];
  if (m.name !== 'SWSE Archetype Production SSOT') problems.push(`_meta.name is "${m.name}"`);
  if (m.authority !== 'production-single-source-of-truth') problems.push(`_meta.authority is "${m.authority}"`);
  if (m.runtimePath !== ARCHETYPE_SSOT_PATH) problems.push(`_meta.runtimePath is "${m.runtimePath}"`);
  if (m.replacesRuntimeAuthority !== 'data/class-archetypes.json') problems.push('_meta.replacesRuntimeAuthority mismatch');
  if (m.recordCount !== EXPECTED_COUNTS.records) problems.push(`_meta.recordCount is ${m.recordCount}`);
  if (m.roadmapCompleteThroughPhase !== 11) problems.push('not the Phase 11 artifact');
  if (Object.keys(source?.archetypes ?? {}).length !== EXPECTED_COUNTS.records) problems.push('archetypes map is not 297 records');
  if (problems.length) throw new Error(`Source artifact rejected: ${problems.join('; ')}`);
}

/** Replace exact-string form-power ids anywhere inside a record. Returns the replaced count per id. */
function correctFormPowerIds(node, counts) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      if (typeof v === 'string' && FORM_POWER_ID_CORRECTIONS[v]) {
        counts[v] = (counts[v] ?? 0) + 1;
        node[i] = FORM_POWER_ID_CORRECTIONS[v];
      } else correctFormPowerIds(v, counts);
    });
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string' && FORM_POWER_ID_CORRECTIONS[v]) {
        counts[v] = (counts[v] ?? 0) + 1;
        node[k] = FORM_POWER_ID_CORRECTIONS[v];
      } else correctFormPowerIds(v, counts);
    }
  }
}

function normalizeRecord(record, stats) {
  const r = clone(record);
  const legacy = new Set(PHASE11_ONLY_TAGS);
  const tags = r.metadata.tags;
  for (const lane of ['primary', 'supporting']) {
    for (const t of tags[lane]) if (legacy.has(t)) stats.removedByTag[t] = (stats.removedByTag[t] ?? 0) + 1;
    tags[lane] = tags[lane].filter((t) => !legacy.has(t));
  }
  tags.all = sortedUnique([...tags.primary, ...tags.supporting]);

  const prov = r.metadata.tagProvenance ?? {};
  for (const [lane, values] of Object.entries(prov)) {
    const kept = values.filter((t) => !legacy.has(t));
    if (kept.length) prov[lane] = kept;
    else delete prov[lane];
  }
  correctFormPowerIds(r, stats.formPowerReplacements);
  return r;
}

function tagStats(archetypes) {
  const primary = new Set();
  const supporting = new Set();
  let p = 0;
  let s = 0;
  for (const r of archetypes) {
    r.metadata.tags.primary.forEach((t) => primary.add(t));
    r.metadata.tags.supporting.forEach((t) => supporting.add(t));
    p += r.metadata.tags.primary.length;
    s += r.metadata.tags.supporting.length;
  }
  const all = new Set([...primary, ...supporting]);
  return {
    uniqueTags: all.size,
    uniquePrimaryTags: primary.size,
    uniqueSupportingTags: supporting.size,
    avgPrimaryPerArchetype: avg(p, archetypes.length),
    avgSupportingPerArchetype: avg(s, archetypes.length),
    archetypesWithPrimaryTag: archetypes.filter((r) => r.metadata.tags.primary.length > 0).length
  };
}

/** Compact, line-per-record serialization (diff-friendly, ~2 MB). Deterministic. */
export function serializeDataset(dataset) {
  const lines = Object.entries(dataset.archetypes).map(([id, rec]) => `${JSON.stringify(id)}:${JSON.stringify(rec)}`);
  return `{"_meta":${JSON.stringify(dataset._meta)},\n"archetypes":{\n${lines.join(',\n')}\n}}\n`;
}

/** Static census of legacy archetype/bias consumers under scripts/. Deterministic. */
export function legacyConsumerCensus(root = ROOT) {
  const patterns = [
    ['class-archetypes.json', /class-archetypes\.json/],
    ['mechanicalBias', /mechanicalBias/],
    ['roleBias', /roleBias/],
    ['attributeBias', /attributeBias/],
    ['tagBias', /tagBias/]
  ];
  const classify = (file) => {
    if (file === 'scripts/engine/archetype/archetype-registry.js') return 'TRANSITIONAL_COMPATIBILITY';
    if (file === 'scripts/engine/archetype/archetype-registry-integration.js') return 'TRANSITIONAL_COMPATIBILITY';
    if (file === 'scripts/engine/analysis/phase-3-demo.js') return 'SAFE_TO_REMOVE_LATER';
    return 'CURRENT_RUNTIME_DEPENDENCY';
  };
  const hits = new Map();
  const walk = (dir) => {
    for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${ent.name}`;
      if (ent.isDirectory()) walk(rel);
      else if (/\.(m?js)$/.test(ent.name)) {
        const text = fs.readFileSync(path.join(root, rel), 'utf8');
        for (const [name, re] of patterns) {
          if (re.test(text)) {
            if (!hits.has(rel)) hits.set(rel, new Set());
            hits.get(rel).add(name);
          }
        }
      }
    }
  };
  walk('scripts');
  const files = [...hits.keys()].sort().map((f) => ({
    file: f,
    classification: classify(f),
    references: [...hits.get(f)].sort()
  }));
  const byClassification = {};
  for (const f of files) byClassification[f.classification] = (byClassification[f.classification] ?? 0) + 1;
  return {
    files,
    byClassification,
    dataFiles: {
      'data/class-archetypes.json': 'SUPERSEDED_SEMANTIC_AUTHORITY (still read by live consumers; do not delete before Phase 12F)',
      'data/bias-keys-canonical.json': 'TRANSITIONAL_COMPATIBILITY (legacy bias key vocabulary)',
      'schemas/archetype.schema.json': 'TRANSITIONAL_COMPATIBILITY (legacy class-owned contract; not valid for data/archetypes.json)'
    }
  };
}

export function buildRuntimeSSOT(source, authorities, inputBytes) {
  assertSourceArtifact(source);
  const stats = { removedByTag: {}, formPowerReplacements: {} };
  const before = tagStats(Object.values(source.archetypes));

  const archetypes = {};
  for (const [id, rec] of Object.entries(source.archetypes)) archetypes[id] = normalizeRecord(rec, stats);
  const after = tagStats(Object.values(archetypes));

  const replacedTotal = Object.values(stats.formPowerReplacements).reduce((a, b) => a + b, 0);
  const missingCorrections = Object.keys(FORM_POWER_ID_CORRECTIONS).filter((k) => !stats.formPowerReplacements[k]);
  if (missingCorrections.length) throw new Error(`form-power ids never seen in source: ${missingCorrections.join(', ')}`);

  const meta = clone(source._meta);
  meta.runtimePhase = '12A-runtime-ssot';
  meta.phase12a = {
    authority: 'runtime SSOT; replaces data/class-archetypes.json as semantic authority (legacy file retained as transitional compatibility)',
    sourceArtifact: { name: 'archetypes_transport.json', sha256: sha256(inputBytes), bytes: inputBytes.length },
    ontology: 'data/audits/talent-feat-phase3-final-ontology.json (190 tags, frozen)',
    normalization: {
      removedPhase11OnlyTags: [...PHASE11_ONLY_TAGS],
      formPowerIdCorrections: { ...FORM_POWER_ID_CORRECTIONS },
      note: 'Deletion from the semantic lane only; typed abilities, exact skills/feats/talents/forms/classes remain authoritative. No tag remapping.'
    },
    supersedes: ['phase11Validation.tagVocabulary', 'phase11Validation.canonicalTagsUsed'],
    tagVocabulary: sortedUnique(Object.values(archetypes).flatMap((r) => r.metadata.tags.all)),
    scoring: 'none — categorical metadata only; no numeric weights are assigned in Phase 12A'
  };

  const dataset = { _meta: meta, archetypes };
  const report = validateArchetypeDataset(dataset, authorities);
  return { dataset, report, stats, before, after, replacedTotal };
}

function buildAudit({ dataset, report, stats, before, after, replacedTotal }, inputBytes, outputBytes, census) {
  const recs = Object.values(dataset.archetypes);
  const refs = Object.fromEntries(
    Object.entries(report.refs).map(([d, v]) => [d, { baseline: EXACT_REF_BASELINE[d], total: v.total, resolved: v.resolved, unresolved: v.unresolved }])
  );
  return {
    schemaVersion: 1,
    phase: '12A-RUNTIME-SSOT',
    status: report.valid ? 'RUNTIME_SSOT_VALIDATED' : 'RUNTIME_SSOT_INVALID',
    input: { name: 'archetypes_transport.json', sha256: sha256(inputBytes), bytes: inputBytes.length },
    output: { path: ARCHETYPE_SSOT_PATH, sha256: sha256(outputBytes), bytes: outputBytes.length },
    counts: report.counts,
    semanticTags: {
      before,
      after,
      legacyTagsRemoved: PHASE11_ONLY_TAGS.length,
      removalsByTag: Object.fromEntries(Object.entries(stats.removedByTag).sort(([a], [b]) => a.localeCompare(b))),
      archetypesLosingAllPrimary: recs.filter((r) => r.metadata.tags.primary.length === 0).length
    },
    formPowerIdCorrections: { replacements: replacedTotal, byId: Object.fromEntries(Object.entries(stats.formPowerReplacements).sort(([a], [b]) => a.localeCompare(b))), map: FORM_POWER_ID_CORRECTIONS },
    exactReferences: refs,
    validation: { valid: report.valid, errors: report.errors },
    legacyConsumerCensus: census,
    scoringChanged: false
  };
}

export function runBuild({ input, check = false, root = ROOT } = {}) {
  if (!input || !fs.existsSync(input)) {
    throw new Error('Source artifact missing: pass --input <path to archetypes_transport.json>. Not reconstructing from legacy files.');
  }
  const inputBytes = fs.readFileSync(input);
  const source = JSON.parse(inputBytes.toString('utf8'));
  const authorities = loadArchetypeAuthorities(root);
  const built = buildRuntimeSSOT(source, authorities, inputBytes);
  if (!built.report.valid) {
    throw new Error(`Validation failed (${built.report.errors.length}):\n${built.report.errors.slice(0, 25).join('\n')}`);
  }
  const outBytes = Buffer.from(serializeDataset(built.dataset), 'utf8');
  const audit = buildAudit(built, inputBytes, outBytes, legacyConsumerCensus(root));
  const auditText = `${JSON.stringify(audit, null, 2)}\n`;

  const targets = [[ARCHETYPE_SSOT_PATH, outBytes.toString('utf8')], [AUDIT_JSON_PATH, auditText]];
  const drift = [];
  for (const [rel, text] of targets) {
    const abs = path.join(root, rel);
    const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    if (current !== text) drift.push(rel);
    if (!check) fs.writeFileSync(abs, text);
  }
  return { audit, drift };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  try {
    const { audit, drift } = runBuild({ input: get('--input') ?? process.env.ARCHETYPE_TRANSPORT_JSON, check: args.includes('--check') });
    console.log(`archetypes: ${audit.counts.records} (${audit.counts.parents} parents / ${audit.counts.specializations} specializations)`);
    for (const [d, v] of Object.entries(audit.exactReferences)) console.log(`  ${d}: ${v.resolved}/${v.total} (baseline ${v.baseline})`);
    console.log(`output sha256 ${audit.output.sha256}`);
    if (args.includes('--check')) {
      if (drift.length) { console.error(`DRIFT: ${drift.join(', ')}`); process.exit(1); }
      console.log('check: zero diff');
    } else console.log(drift.length ? `wrote: ${drift.join(', ')}` : 'unchanged (zero diff)');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

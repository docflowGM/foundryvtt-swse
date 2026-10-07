#!/usr/bin/env node
// Phase 5B-1: deterministic canonical weapon runtime registry builder.
// Combines the frozen Phase 3B mechanics authority and the frozen Phase 4H semantic authority into one runtime-readable
// record per identity (join by identityKey ONLY -- never by name). Mutates neither authority. Byte-stable output.
// Usage: node tools/build-weapon-runtime-registry.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { reconcileProfiles } from '../scripts/items/weapon-runtime/profile-reconciliation.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const P3B = 'data/audits/item-weapons-phase-3b-canonical-authority.json';
export const P4H = 'data/audits/item-weapons-phase-4h-global-semantic-authority.json';
export const OUT = 'data/weapons/canonical-weapon-registry.json';
export const EXPECTED_IDENTITIES = 203;
export const REGISTRY_SCHEMA_VERSION = '5B.1';
const text = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const sortKeys = (x) => (Array.isArray(x) ? x.map(sortKeys) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortKeys(x[k])])) : x);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function buildRegistry(read = text) {
  const t3b = read(P3B), t4h = read(P4H);
  const b = JSON.parse(t3b), h = JSON.parse(t4h);
  const fail = (m) => { throw new Error(`weapon runtime registry: ${m}`); };
  const h3b = h.inputs?.[P3B];
  if (h3b !== sha(t3b)) fail(`4H expects Phase 3B sha256 ${h3b} but file is ${sha(t3b)}`);
  if (b.identities.length !== EXPECTED_IDENTITIES) fail(`Phase 3B has ${b.identities.length} identities, expected ${EXPECTED_IDENTITIES}`);
  if (h.records.length !== EXPECTED_IDENTITIES) fail(`Phase 4H has ${h.records.length} records, expected ${EXPECTED_IDENTITIES}`);
  const by3b = new Map(), by4h = new Map();
  for (const i of b.identities) { if (by3b.has(i.identityKey)) fail(`duplicate 3B identity ${i.identityKey}`); by3b.set(i.identityKey, i); }
  for (const r of h.records) { if (by4h.has(r.identityKey)) fail(`duplicate 4H identity ${r.identityKey}`); by4h.set(r.identityKey, r); }
  const keys = [...by3b.keys()].sort(cmp);
  for (const k of keys) if (!by4h.has(k)) fail(`3B identity ${k} has no 4H record`);
  for (const k of by4h.keys()) if (!by3b.has(k)) fail(`4H identity ${k} has no 3B record`);

  const productionIdIndex = {};
  const identities = keys.map((k) => {
    const i = by3b.get(k), r = by4h.get(k);
    const mech = sha(JSON.stringify(i.canonicalStats ?? null));
    if (r.phase3B?.mechanicsRecordSha256 !== mech) fail(`4H mechanicsRecordSha256 mismatch for ${k}`);
    const cs = i.canonicalStats;
    if (!Array.isArray(cs?.attackProfiles) || !cs.attackProfiles.length) fail(`${k} has no attackProfiles`);
    if (i.repo?.present) {
      const pid = i.repo.id;
      if (productionIdIndex[pid] && productionIdIndex[pid] !== k) fail(`production id ${pid} maps to two identities`);
      productionIdIndex[pid] = k;
    }
    const rec = reconcileProfiles(cs, r.selectors?.modes ?? [], r.proficiency, i.operation);
    return {
      identityKey: k,
      canonicalName: i.canonicalName,
      repo: { present: !!i.repo?.present, id: i.repo?.id ?? null },
      weaponGroup: i.weaponGroup,
      schemaFamily: i.schemaFamily,
      canonicalStats: cs,
      qualities: i.qualities ?? null,
      conditionalQualities: i.conditionalQualities ?? null,
      conditionalDamageProfiles: i.conditionalDamageProfiles ?? null,
      qualityParameters: i.qualityParameters ?? null,
      qualityAuthority: i.qualityAuthority ?? null,
      operation: i.operation ?? null,
      summary: i.summary ?? null,
      canonicalPlayerText: i.canonicalPlayerText ?? null,
      firstPublication: i.firstPublication ?? null,
      sourceClaims: i.sourceClaims ?? [],
      sourceFootnotes: i.sourceFootnotes ?? [],
      ambiguities: i.ambiguities ?? [],
      proficiencyRules: i.proficiencyRules ?? [],
      semantic: { categories: r.categories, tags: r.semantic },
      selectors: r.selectors,
      proficiency: r.proficiency,
      abilityInteractions: r.abilityInteractions ?? [],
      authorityDiscrepancies: r.authorityDiscrepancies ?? [],
      ontologyGapsAndUnrepresentedMechanics: r.ontologyGapsAndUnrepresentedMechanics ?? [],
      authorities: r.authorities ?? [],
      profileReconciliation: rec,
      provenance: {
        phase3B: { pointer: `${P3B}#identities[${k}]`, mechanicsRecordSha256: mech },
        phase4H: { pointer: `${P4H}#records[${k}]`, recordSha256: sha(JSON.stringify(sortKeys(r))) },
      },
    };
  });

  const incomplete = identities.filter((x) => x.profileReconciliation.status !== 'COMPLETE').map((x) => x.identityKey);
  const typed = identities.flatMap((x) => x.profileReconciliation.modes.map((m) => m.classification));
  const typedCounts = Object.fromEntries([...new Set(typed)].sort().map((c) => [c, typed.filter((t) => t === c).length]));
  const body = {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    phase: '5B',
    purpose: 'Runtime-readable join of the frozen Phase 3B mechanics authority and the frozen Phase 4H semantic authority. Immutable; contains no actor-dependent or mutable owned state.',
    inputs: { [P3B]: sha(t3b), [P4H]: sha(t4h) },
    counts: {
      identities: identities.length,
      repoPresent: identities.filter((x) => x.repo.present).length,
      repoMissing: identities.filter((x) => !x.repo.present).length,
      productionIds: Object.keys(productionIdIndex).length,
      unresolvedModeIdentities: incomplete.length,
      unresolvedPhase4HModes: identities.reduce((n, x) => n + x.profileReconciliation.unresolvedModes.length, 0),
      typedModeCounts: typedCounts,
    },
    unresolvedModeIdentities: incomplete,
    productionIdIndex: sortKeys(productionIdIndex),
    identities,
  };
  const identitiesSha256 = sha(JSON.stringify(body.identities));
  return { ...body, identitiesSha256 };
}

export function serialize(reg) {
  const { identities, ...head } = reg;
  const headText = JSON.stringify(sortKeys(head), null, 1);
  // head ends with "\n}" ; append identities as one compact line each for diff-friendliness
  const lines = identities.map((x) => JSON.stringify(x));
  return `${headText.slice(0, -2)},\n "identities": [\n${lines.join(',\n')}\n ]\n}\n`;
}

export const registryFileSha256 = (t) => sha(t);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = serialize(buildRegistry());
  const target = path.join(ROOT, OUT);
  const hash = sha(out);
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    if (cur !== out) { console.error(`weapon runtime registry is stale or missing (expected sha256 ${hash})`); process.exit(1); }
    console.log(`weapon runtime registry current: ${hash}`);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, out);
    console.log(`wrote ${OUT} (${out.length} bytes) sha256 ${hash}`);
  }
}

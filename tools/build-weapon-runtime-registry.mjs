#!/usr/bin/env node
// Phase 5B-1 / 5C-2: deterministic canonical weapon RUNTIME REGISTRY (GENERATED_RUNTIME_INDEX).
//   data/canonical/weapons.json  -->  data/weapons/canonical-weapon-registry.json
// The registry is no longer a join of audit files: it is a pure projection of the operational canonical corpus (plus the derived
// profile reconciliation and the production-id index). Never authored; byte-stable; `--check` fails on divergence.
// Usage: node tools/build-weapon-runtime-registry.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcileProfiles } from '../scripts/items/weapon-runtime/profile-reconciliation.js';
import { ROOT, CANONICAL_WEAPONS, readText, sha, sortKeys, cmp } from './lib/canonical-weapons-shared.mjs';

export const OUT = 'data/weapons/canonical-weapon-registry.json';
export const EXPECTED_IDENTITIES = 203;
export const REGISTRY_SCHEMA_VERSION = '5C.1';
const text = readText;

export function buildRegistry(read = text) {
  const raw = read(CANONICAL_WEAPONS);
  const corpus = JSON.parse(raw);
  const fail = (m) => { throw new Error(`weapon runtime registry: ${m}`); };
  if (corpus.status !== 'CANONICAL_SSOT_WEAPONS') fail('input is not the canonical weapons corpus');
  if (!Array.isArray(corpus.identities) || corpus.identities.length !== EXPECTED_IDENTITIES) fail(`canonical corpus has ${corpus.identities?.length} identities, expected ${EXPECTED_IDENTITIES}`);
  const keys = new Set(), prodIds = new Set(), productionIdIndex = {};
  const identities = [...corpus.identities].sort((a, b) => cmp(a.identityKey, b.identityKey)).map((c) => {
    if (keys.has(c.identityKey)) fail(`duplicate canonical identity ${c.identityKey}`);
    keys.add(c.identityKey);
    const pid = c.production?.id;
    if (!pid) fail(`${c.identityKey} has no production id`);
    if (prodIds.has(pid)) fail(`production id ${pid} assigned to two identities`);
    prodIds.add(pid); productionIdIndex[pid] = c.identityKey;
    const cs = c.canonicalStats;
    if (!Array.isArray(cs?.attackProfiles) || !cs.attackProfiles.length) fail(`${c.identityKey} has no attackProfiles`);
    const { production, semantic, ...rest } = c;
    return {
      ...rest,
      repo: { present: true, id: pid, presentBeforeCutover: production.presentBeforeCutover },
      semantic: { categories: semantic.categories, tags: semantic.tags },
      profileReconciliation: reconcileProfiles(cs, c.selectors?.modes ?? [], c.proficiency, c.operation),
    };
  });
  const incomplete = identities.filter((x) => x.profileReconciliation.status !== 'COMPLETE').map((x) => x.identityKey);
  const typed = identities.flatMap((x) => x.profileReconciliation.modes.map((m) => m.classification));
  const typedCounts = Object.fromEntries([...new Set(typed)].sort().map((cl) => [cl, typed.filter((t) => t === cl).length]));
  const body = {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    phase: '5C',
    role: 'GENERATED_RUNTIME_INDEX',
    purpose: 'Runtime-readable projection of the operational canonical weapons corpus. Generated; contains no actor-dependent or mutable owned state.',
    inputs: { [CANONICAL_WEAPONS]: sha(raw) },
    counts: {
      identities: identities.length,
      productionIds: Object.keys(productionIdIndex).length,
      presentBeforeCutover: identities.filter((x) => x.repo.presentBeforeCutover).length,
      createdByCutover: identities.filter((x) => !x.repo.presentBeforeCutover).length,
      unresolvedModeIdentities: incomplete.length,
      unresolvedPhase4HModes: identities.reduce((n, x) => n + x.profileReconciliation.unresolvedModes.length, 0),
      typedModeCounts: typedCounts,
    },
    unresolvedModeIdentities: incomplete,
    productionIdIndex: sortKeys(productionIdIndex),
    identities,
  };
  return { ...body, identitiesSha256: sha(JSON.stringify(body.identities)) };
}

export function serialize(reg) {
  const { identities, ...head } = reg;
  const headText = JSON.stringify(sortKeys(head), null, 1);
  return `${headText.slice(0, -2)},\n "identities": [\n${identities.map((x) => JSON.stringify(x)).join(',\n')}\n ]\n}\n`;
}
export const registryFileSha256 = sha;

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

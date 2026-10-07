#!/usr/bin/env node
// Phase 5B-R: typed mode reconciliation report + hybrid condition-policy census. Read-only over the frozen authorities
// and the canonical runtime registry. Deterministic; `--check` verifies the committed artifacts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { policyFor, registeredConditionCount, REQUIREMENT_TYPES } from '../scripts/items/weapon-runtime/condition-policy.js';
import { buildRegistry } from './build-weapon-runtime-registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_MODES = 'data/audits/weapon-phase-5b-r-mode-reconciliation.json';
export const OUT_COND = 'data/audits/weapon-phase-5b-r-condition-policy-census.json';
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// the 13 Phase 4H modes that had no 3B attack-profile match in the first 5B reconciliation (planner review input)
const PREVIOUSLY_UNMATCHED = {
  'unmapped::Amphistaff': ['spear', 'venom-spit', 'whip'],
  'unmapped::Atlatl': ['launcher'],
  'unmapped::Cesta': ['launcher'],
  'weapon-gungan-electropole': ['gungan-alternate-proficiency'],
  'unmapped::Shock Stick': ['handheld', 'mounted-bayonet'],
  'unmapped::Vibrobayonet': ['detached', 'mounted-on-rifle'],
  'weapon-plx-2m-portable-missile-launcher': ['direct', 'gravity-activated', 'heat-seeking'],
};
const CONDITION_KEYS = /^(condition|when|trigger|requires|requiresFeat|normalDamageWhen)$/;
const AUDIT_ROOTS = /^(sourceClaims|repoComparison|crossPublication|mergeAudit|ambiguities)/;

export function build() {
  const b = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audits/item-weapons-phase-3b-canonical-authority.json'), 'utf8'));
  const reg = buildRegistry();
  const all = reg.identities;
  const typed = [];
  for (const r of all) for (const m of r.profileReconciliation.modes) typed.push({ identity: r.identityKey, ...m, mappedProfileIds: m.mappedProfileIds });
  const counts = {};
  for (const t of typed) counts[t.classification] = (counts[t.classification] ?? 0) + 1;
  const prev = [];
  for (const [id, modes] of Object.entries(PREVIOUSLY_UNMATCHED)) for (const mode of modes) {
    const t = typed.find((x) => x.identity === id && x.mode === mode);
    prev.push(t ? { identity: id, mode, classification: t.classification, authorityComplete: t.authorityComplete, executableNow: t.executableNow, futureConsumer: t.futureConsumer, reason: t.reason, mappedProfileIds: t.mappedProfileIds, mappedConfigurationId: t.mappedConfigurationId ?? null, mappedModeProfileId: t.mappedModeProfileId ?? null } : { identity: id, mode, classification: 'MISSING', authorityComplete: false, executableNow: false, futureConsumer: null, reason: 'no typed record' });
  }
  const modesDoc = {
    schemaVersion: '5B-R.1', phase: '5B-R', family: 'weapons',
    purpose: 'Typed reconciliation of Phase 4H selector modes: ATTACK_PROFILE / CONFIGURATION / OPERATING_MODE / SPECIAL_ACTION (+ PROFICIENCY_ROUTE where a proficiency descriptor was filed under modes).',
    completenessAmendments: b.completenessAmendments,
    counts: { identities: all.length, typedModes: typed.length, byClassification: Object.fromEntries(Object.entries(counts).sort((x, y) => cmp(x[0], y[0]))), unresolved: counts.UNRESOLVED ?? 0, previouslyUnmatchedModes: prev.length, previouslyUnmatchedIdentities: Object.keys(PREVIOUSLY_UNMATCHED).length },
    previouslyUnmatchedModes: prev,
    allTypedModes: typed.sort((x, y) => cmp(x.identity, y.identity) || cmp(x.mode, y.mode)),
  };

  // condition-policy census over every executable canonical condition value in Phase 3B
  const seen = new Map();
  const walk = (v, p, id) => {
    if (Array.isArray(v)) { v.forEach((x) => walk(x, `${p}[]`, id)); return; }
    if (v && typeof v === 'object') for (const k of Object.keys(v)) {
      const x = v[k];
      if (CONDITION_KEYS.test(k) && x !== null) {
        const key = JSON.stringify(x), e = seen.get(key) ?? { value: x, paths: new Set(), ids: new Set() };
        e.paths.add(`${p}.${k}`.replace(/^\./, '')); e.ids.add(id); seen.set(key, e);
      }
      walk(x, p ? `${p}.${k}` : k, id);
    }
  };
  for (const i of b.identities) for (const [k, v] of Object.entries(i)) if (!AUDIT_ROOTS.test(k)) walk(v, k, i.identityKey);
  const rows = [...seen.values()].map((e) => {
    const { policy, predicate } = policyFor(e.value);
    return { value: e.value, paths: [...e.paths].sort(), identityCount: e.ids.size, policy, predicate };
  }).sort((x, y) => cmp(JSON.stringify(x.value), JSON.stringify(y.value)));
  const reqTypes = {};
  for (const i of b.identities) for (const p of i.canonicalStats.attackProfiles) for (const r of p.activationRequirements ?? []) { const pol = REQUIREMENT_TYPES[r.type]; reqTypes[r.type] = pol ?? 'UNSUPPORTED'; }
  const polCount = (name) => rows.filter((r) => r.policy === name).length;
  const condDoc = {
    schemaVersion: '5B-R.1', phase: '5B-R', family: 'weapons',
    purpose: 'Every executable canonical condition value, its evaluation policy (AUTO deterministic / PROMPT observable-only-by-player) and structured predicate. Natural-language text is never parsed; values are registered by exact match.',
    counts: { distinctConditionValues: rows.length, registeredValues: registeredConditionCount(), AUTO: polCount('AUTO'), PROMPT: polCount('PROMPT'), UNSUPPORTED: polCount('UNSUPPORTED'), requirementTypesUnsupported: Object.values(reqTypes).filter((x) => x === 'UNSUPPORTED').length },
    EXECUTABLE_CANONICAL_CONDITIONS_WITH_POLICY_UNSUPPORTED: polCount('UNSUPPORTED') + Object.values(reqTypes).filter((x) => x === 'UNSUPPORTED').length,
    requirementTypes: Object.fromEntries(Object.entries(reqTypes).sort((x, y) => cmp(x[0], y[0]))),
    conditions: rows,
  };
  const failures = [];
  if (counts.UNRESOLVED) failures.push(`${counts.UNRESOLVED} unresolved 4H modes`);
  for (const p of prev) if (p.classification === 'MISSING' || p.classification === 'UNRESOLVED') failures.push(`previously unmatched ${p.identity}/${p.mode} is ${p.classification}`);
  for (const r of rows) if (r.policy === 'UNSUPPORTED') failures.push(`unregistered condition ${JSON.stringify(r.value)} at ${r.paths[0]}`);
  for (const [t, pol] of Object.entries(reqTypes)) if (pol === 'UNSUPPORTED') failures.push(`unregistered activation requirement type ${t}`);
  return { modesDoc, condDoc, failures };
}

const ser = (o) => `${JSON.stringify(o, null, 1)}\n`;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { modesDoc, condDoc, failures } = build();
  if (failures.length) { console.error(`Phase 5B-R verifier FAILED:\n${failures.join('\n')}`); process.exit(1); }
  const outs = [[OUT_MODES, ser(modesDoc)], [OUT_COND, ser(condDoc)]];
  if (process.argv.includes('--check')) {
    for (const [f, t] of outs) if (!fs.existsSync(path.join(ROOT, f)) || fs.readFileSync(path.join(ROOT, f), 'utf8') !== t) { console.error(`${f} is stale`); process.exit(1); }
    console.log('Phase 5B-R artifacts current;', JSON.stringify(modesDoc.counts.byClassification), 'unsupported conditions', condDoc.EXECUTABLE_CANONICAL_CONDITIONS_WITH_POLICY_UNSUPPORTED);
  } else {
    for (const [f, t] of outs) fs.writeFileSync(path.join(ROOT, f), t);
    console.log('wrote 5B-R artifacts;', JSON.stringify(modesDoc.counts), JSON.stringify(condDoc.counts));
  }
}

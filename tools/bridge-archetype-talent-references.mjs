#!/usr/bin/env node
/**
 * Phase 3H-3b — exact-reference bridge: every Archetype Phase 11 exact Talent recommendation -> the authoritative canonical Talent identity (Phase 3G UUID).
 *
 * Phase 11 stores a Talent reference as the certified identity string `Source|Tree|Name`. This bridge resolves each one DETERMINISTICALLY through the
 * certified identity map (never by bare name, never fuzzy), proves the resolved record agrees on name/tree/source, and itemises same-name references
 * (which only the tree-aware identity can distinguish). Exact identity is reconciled separately from semantic agreement.
 * Writes only a report.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, read, readJson, parse, TALENTS, TREES } from './talent-semantic-common.mjs';
import { loadIdentityOf } from './apply-talent-phase-3g.mjs';
import { canonicalTalentUuid } from '../scripts/data/talent-source-identity.js';

export const OUT_JSON = 'data/audits/talent-phase-3h-archetype-exact-reference-bridge.json', OUT_MD = 'docs/audits/talent-phase-3h-archetype-exact-reference-bridge.md';
const DATASET = 'data/audits/archetype-phase-11/SWSE_Archetypes_Phase_11_Canonical_Metadata.json';

export function bridge() {
  const ds = readJson(DATASET), talents = parse(read(TALENTS)), trees = new Map(parse(read(TREES)).map(t => [t._id, t])), identityOf = loadIdentityOf();
  const canon = new Map(readJson('data/canonical/talents.json').records.map(r => [r.canonicalIdentity, r]));
  const byIdentity = new Map(); for (const [id, ident] of identityOf) byIdentity.set(ident, talents.find(t => t._id === id));
  const nameGroups = new Map(); for (const t of talents) (nameGroups.get(t.name) ?? nameGroups.set(t.name, []).get(t.name)).push(t._id);
  const refs = [], problems = [];
  const counts = { references: 0, resolvedToUuid: 0, unresolved: 0, sameNameTreeAware: 0, malformed: 0, nameMismatch: 0, treeMismatch: 0, sourceMismatch: 0, duplicateWithinArchetype: 0, publicationSourceDiffersFromTreeOrigin: 0 };
  const sameNameDistinct = new Set();
  for (const a of Object.values(ds.archetypes)) {
    const seen = new Set();
    for (const tier of ['signature', 'supporting']) for (const identity of a.mechanics.talents?.[tier] ?? []) {
      counts.references++;
      const parts = identity.split('|'); const row = { archetype: a.id, tier, identity };
      if (parts.length !== 3) { counts.malformed++; problems.push({ ...row, problem: 'MALFORMED_IDENTITY' }); continue; }
      const [source, treeName, name] = parts, t = byIdentity.get(identity);
      if (seen.has(identity)) counts.duplicateWithinArchetype++; seen.add(identity);
      if (!t) { counts.unresolved++; problems.push({ ...row, problem: 'UNRESOLVED' }); continue; }
      const tree = trees.get(t.system.treeId), ids = nameGroups.get(t.name);
      const agree = { name: t.name === name, tree: tree?.name === treeName, source: (canon.get(identity)?.treeOriginSourcebook ?? t.system.source ?? null) === source };
      if ((t.system.source ?? null) !== source) counts.publicationSourceDiffersFromTreeOrigin++;
      if (!agree.name) counts.nameMismatch++; if (!agree.tree) counts.treeMismatch++; if (!agree.source) counts.sourceMismatch++;
      if (!agree.name || !agree.tree || !agree.source) problems.push({ ...row, problem: 'RECORD_DISAGREES', talentId: t._id, found: { name: t.name, tree: tree?.name, source: t.system.source }, agree });
      counts.resolvedToUuid++;
      const sameName = ids.length > 1; if (sameName) { counts.sameNameTreeAware++; sameNameDistinct.add(identity); }
      refs.push({ ...row, talentId: t._id, uuid: canonicalTalentUuid(t._id), sameNameAcrossTrees: sameName ? ids.length : 0 });
    }
  }
  return { schemaVersion: 1, phase: '3H-3b', status: 'EXACT_REFERENCE_BRIDGE', productionMutationPerformed: false, source: DATASET, referenceForm: 'certified identity string Source|Tree|Name (tree-aware; no bare names, slugs or legacy ids)',
    counts: { ...counts, distinctSameNameReferences: sameNameDistinct.size, distinctTalentsReferenced: new Set(refs.map(r => r.talentId)).size }, problems, references: refs };
}
const renderMd = b => { const c = b.counts; return ['# Phase 3H-3b — Archetype Phase 11 exact Talent references → canonical Talent UUIDs', '',
  `${c.references} exact Talent references; **${c.resolvedToUuid}** resolve to a canonical Talent UUID (${c.distinctTalentsReferenced} distinct talents); ${c.unresolved} unresolved; ${c.malformed} malformed; name/tree/tree-origin-source disagreements: ${c.nameMismatch}/${c.treeMismatch}/${c.sourceMismatch}. (${c.publicationSourceDiffersFromTreeOrigin} references name the tree-origin sourcebook while the talent's printed publication is a later book — by design of the certified identity.)`, '',
  `${c.sameNameTreeAware} references (${c.distinctSameNameReferences} distinct) name a talent that shares its name with a talent in another tree; they resolve only because the reference is tree-aware.`, '',
  `Reference form: ${b.referenceForm}. Exact identity is reconciled separately from semantic agreement. Problems: ${b.problems.length ? b.problems.length + ' (see JSON)' : 'none'}.`, ''].join('\n'); };
export function main(argv = process.argv.slice(2)) {
  const b = bridge(), json = JSON.stringify(b, null, 1) + '\n', md = renderMd(b);
  if (argv.includes('--check')) { if (!fs.existsSync(path.join(ROOT, OUT_JSON)) || read(OUT_JSON) !== json || read(OUT_MD) !== md) { console.error('[3h-bridge] STALE'); return 1; } console.log('[3h-bridge] PASS'); return 0; }
  fs.writeFileSync(path.join(ROOT, OUT_JSON), json); fs.writeFileSync(path.join(ROOT, OUT_MD), md); console.log(JSON.stringify(b.counts, null, 1)); return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());

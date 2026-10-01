#!/usr/bin/env node
/**
 * Phase 3H-3 — QA of the talent semantic authority (derived system metadata) against the Archetype Phase 11 dataset.
 *
 * ONE-WAY: this report reads the finished talent authority and the archetype dataset and writes only a report. It never edits a talent tag to improve
 * agreement. A contradiction is investigated talent-first, archetype-second (see `inspect` in each finding).
 *
 * For every exact talent reference (signature/supporting) of every archetype:
 *   STRONG       the talent shares at least one archetype PRIMARY tag
 *   SUPPORTED    shares only SUPPORTING tags
 *   NEUTRAL      no overlap, or the talent has no semantic tag (nothing to compare)
 *   CONTRADICTION the talent lies wholly in one weapon family (melee vs ranged) and the archetype wholly in the other
 *   SUSPICIOUS   tagged talent with zero overlap with the archetype's whole tag set (not a contradiction; worth a look)
 * Exact references remain the strongest evidence regardless of this classification.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, read, readJson } from './talent-semantic-common.mjs';
import { buildAuthority } from './derive-talent-semantic-authority.mjs';

export const OUT_JSON = 'data/audits/talent-phase-3h-archetype-crosscheck.json', OUT_MD = 'docs/audits/talent-phase-3h-archetype-crosscheck.md';
const DATASET = 'data/audits/archetype-phase-11/SWSE_Archetypes_Phase_11_Canonical_Metadata.json';
const MELEE = new Set(['melee', 'lightsaber', 'advanced_melee', 'finesse', 'lightsaber_form']), RANGED = new Set(['ranged', 'pistol', 'rifle', 'sniper', 'heavy_weapon']);
const has = (set, tags) => tags.some(t => set.has(t));

export function crosscheck(authority = buildAuthority()) {
  const ds = readJson(DATASET), archetypes = Object.values(ds.archetypes);
  const byIdentity = new Map(authority.rows.map(r => [r.canonicalIdentity, r]));
  const findings = [], per = [], totals = { references: 0, resolved: 0, unresolved: [], STRONG: 0, SUPPORTED: 0, NEUTRAL: 0, CONTRADICTION: 0, SUSPICIOUS: 0 };
  for (const a of archetypes) {
    const prim = new Set(a.metadata.tags.primary ?? []), sup = new Set(a.metadata.tags.supporting ?? []), all = new Set([...prim, ...sup]);
    const c = { STRONG: 0, SUPPORTED: 0, NEUTRAL: 0, CONTRADICTION: 0, SUSPICIOUS: 0 };
    for (const tier of ['signature', 'supporting']) for (const identity of a.mechanics.talents?.[tier] ?? []) {
      totals.references++; const r = byIdentity.get(identity);
      if (!r) { totals.unresolved.push({ archetype: a.id, identity }); continue; }
      totals.resolved++;
      const tags = r.proposed; let cls = 'NEUTRAL';
      if (tags.length) {
        if (tags.some(t => prim.has(t))) cls = 'STRONG'; else if (tags.some(t => sup.has(t))) cls = 'SUPPORTED';
        else if ((has(MELEE, tags) && !has(RANGED, tags) && has(RANGED, [...all]) && !has(MELEE, [...all])) || (has(RANGED, tags) && !has(MELEE, tags) && has(MELEE, [...all]) && !has(RANGED, [...all]))) cls = 'CONTRADICTION';
        else if (!tags.some(t => all.has(t))) cls = 'SUSPICIOUS';
      }
      c[cls]++; totals[cls]++;
      if (cls === 'CONTRADICTION' || cls === 'SUSPICIOUS') findings.push({ classification: cls, archetype: a.id, archetypeName: a.name, tier, talent: identity, talentTags: tags, archetypePrimary: [...prim], archetypeSupporting: [...sup],
        inspect: { first: 'the talent: its rule text evidence for these tags', talentEvidence: r.tags.map(x => ({ tag: x.tag, confidence: x.confidence, snippet: x.evidence[0].snippet })), second: 'the archetype mapping: why its exact reference list and its semantic tags disagree' } });
    }
    per.push({ archetype: a.id, ...c });
  }
  return { schemaVersion: 1, phase: '3H-3', status: 'QA_ONE_WAY', talentTagsMutatedByThisReport: false, source: DATASET, archetypes: archetypes.length, totals, findings, perArchetype: per };
}
const renderMd = r => { const t = r.totals; return ['# Phase 3H-3 — talent semantic tags vs Archetype Phase 11 (one-way QA)', '',
  `${r.archetypes} archetypes, ${t.references} exact talent references (${t.resolved} resolve to a canonical talent; ${t.unresolved.length} unresolved).`, '',
  '| Relationship | References |', '|---|---:|', ...['STRONG', 'SUPPORTED', 'NEUTRAL', 'SUSPICIOUS', 'CONTRADICTION'].map(k => `| ${k} | ${t[k]} |`), '',
  'Exact references stay strongest; this QA never edits a talent tag. Contradictions (weapon-family opposites) and suspicious references (no overlap with a tagged talent) are itemised in the JSON with talent-first inspection evidence.', '',
  `Unresolved references: ${t.unresolved.length ? t.unresolved.map(u => `${u.archetype}: ${u.identity}`).join('; ') : 'none'}.`, ''].join('\n'); };
export function main(argv = process.argv.slice(2)) {
  const r = crosscheck(), json = JSON.stringify(r, null, 1) + '\n', md = renderMd(r);
  if (argv.includes('--check')) { if (!fs.existsSync(path.join(ROOT, OUT_JSON)) || read(OUT_JSON) !== json || read(OUT_MD) !== md) { console.error('[3h-crosscheck] STALE'); return 1; } console.log('[3h-crosscheck] PASS'); return 0; }
  fs.writeFileSync(path.join(ROOT, OUT_JSON), json); fs.writeFileSync(path.join(ROOT, OUT_MD), md); console.log(JSON.stringify(r.totals, null, 1)); return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());

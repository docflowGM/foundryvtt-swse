#!/usr/bin/env node
// PRQ.0A (Phase 3N-PRQ supplement): READ-ONLY census of feat and talent prerequisite data in the production packs.
// Writes nothing unless --write <file> is given. Never edits packs. Usage: node tools/prq-corpus-census.mjs [--write docs/audits/architecture-census/prq-0a-corpus-census.md]
import fs from 'node:fs';
const load = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const NONE = (s) => ['', 'none', '—', '-', 'n/a'].includes(String(s ?? '').trim().toLowerCase());
const out = [];
const manifest = JSON.parse(fs.readFileSync('data/audits/feat-phase-1a-canonical-identity-manifest.json', 'utf8'));
for (const [domain, file] of [['feat', 'packs/feats.db'], ['talent', 'packs/talents.db']]) {
  const recs = load(file);
  const types = {}; const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (x.type) types[x.type] = (types[x.type] ?? 0) + 1; Object.values(x).forEach(walk); } };
  let structured = 0, textNone = 0, textNoneAndStruct = 0, textOnly = 0, untyped = 0; const sources = {}; const refUuid = { total: 0, resolvable: 0, broken: [] };
  const ids = new Set(recs.map((r) => r._id));
  const names = {}; for (const r of recs) { const k = r.name.trim().toLowerCase(); (names[k] ??= []).push(r._id); }
  const sameName = Object.entries(names).filter(([, v]) => v.length > 1).length;
  const lookup = domain === 'talent' ? ids : ids;
  for (const r of recs) {
    const s = r.system ?? {}; const st = s.prerequisitesStructured; const text = s.prerequisites ?? s.prerequisite;
    const none = NONE(text);
    if (st && typeof st === 'object') { structured++; walk(st); sources[st._source ?? '(none)'] = (sources[st._source ?? '(none)'] ?? 0) + 1; if (none) textNoneAndStruct++; }
    else if (none) textNone++; else textOnly++;
    const scan = (x) => { if (Array.isArray(x)) x.forEach(scan); else if (x && typeof x === 'object') { if (typeof x.uuid === 'string') { refUuid.total++; const id = x.uuid.split('.').pop(); if (ids.has(id)) refUuid.resolvable++; else refUuid.broken.push(`${r.name} -> ${x.uuid}`); } Object.values(x).forEach(scan); } };
    if (st) scan(st);
    if (typeof text !== 'string' && text != null) untyped++;
  }
  out.push({ domain, records: recs.length, sameNameGroups: sameName, structured, certifiedNoneNoStructure: textNone, textPrerequisiteWithoutStructure: textOnly, noneTextButStructured: textNoneAndStruct, nonStringText: untyped, conditionTypes: types, structuredSources: sources, uuidReferences: { total: refUuid.total, resolvableInSamePack: refUuid.resolvable, brokenOrCrossPack: refUuid.broken.length, sampleBroken: refUuid.broken.slice(0, 5) } });
}
// PRQ.0B (read-only): resolve the NAMES in prerequisite text against production names. This is a heuristic (comma / and / or split, scope text in
// parentheses removed): it finds clauses that cannot be tied to exactly one record. It certifies nothing.
const norm = (x) => String(x ?? '').replace(/\(.*?\)/g, '').trim().toLowerCase();
const feats = load('packs/feats.db'), talents = load('packs/talents.db');
const index = (recs) => { const m = new Map(); for (const r of recs) { const k = norm(r.name); (m.get(k) ?? m.set(k, []).get(k)).push(r); } return m; };
const fIdx = index(feats), tIdx = index(talents);
const clauses = (txt) => String(txt ?? '').split(/,|;|\band\b|\bor\b/i).map((c) => c.trim()).filter(Boolean);
const textRefs = { feat: {}, talent: {} };
for (const [domain, recs] of [['feat', feats], ['talent', talents]]) {
  const t = { clauses: 0, resolvesToOneFeat: 0, resolvesToOneTalent: 0, ambiguousFeat: [], ambiguousTalent: [], crossDomainNameOverlap: [], unmatchedSample: 0, hasStructuredCoverage: 0 };
  for (const r of recs) {
    const text = r.system?.prerequisites ?? r.system?.prerequisite; if (NONE(text)) continue;
    const structuredRefs = JSON.stringify(r.system?.prerequisitesStructured ?? {});
    for (const c of clauses(text)) {
      const k = norm(c); const f = fIdx.get(k), tl = tIdx.get(k);
      if (!f && !tl) { t.unmatchedSample++; continue; }
      t.clauses++;
      if (f?.length === 1) t.resolvesToOneFeat++; else if (f?.length > 1) t.ambiguousFeat.push(`${r.name}: ${c}`);
      if (tl?.length === 1) t.resolvesToOneTalent++; else if (tl?.length > 1) t.ambiguousTalent.push(`${r.name}: ${c}`);
      if (f && tl) t.crossDomainNameOverlap.push(`${r.name}: ${c}`);
      if (structuredRefs.includes(String(tl?.[0]?._id ?? f?.[0]?._id ?? '#none#'))) t.hasStructuredCoverage++;
    }
  }
  t.ambiguousFeat = { count: t.ambiguousFeat.length, sample: t.ambiguousFeat.slice(0, 6) };
  t.ambiguousTalent = { count: t.ambiguousTalent.length, sample: t.ambiguousTalent.slice(0, 8) };
  t.crossDomainNameOverlap = { count: t.crossDomainNameOverlap.length, sample: t.crossDomainNameOverlap.slice(0, 6) };
  textRefs[domain] = t;
}
const result = { textReferenceResolution: textRefs, generatedBy: 'tools/prq-corpus-census.mjs', manifestCanonicalIdentities: manifest.frozenCorpus?.canonicalIdentities ?? null, domains: out };
const md = ['# PRQ.0A — feat/talent prerequisite corpus census (read-only)', '', 'Generated by `node tools/prq-corpus-census.mjs --write <this file>` from `packs/feats.db` and `packs/talents.db`. Counts are of the CURRENT production packs, not historical audits.', '', '```json', JSON.stringify(result, null, 2), '```', ''].join('\n');
const w = process.argv.indexOf('--write');
if (w > 0) { fs.writeFileSync(process.argv[w + 1], md); console.log('wrote', process.argv[w + 1]); } else console.log(md);

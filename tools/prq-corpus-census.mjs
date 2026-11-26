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
// PRQ.0C (read-only): compare production prerequisite text with the name-keyed content authorities (scripts/data/authority/*). A name-keyed table cannot
// represent same-name records, so those are reported separately. Differences are CANDIDATES for source review, not corrections.
const { FEAT_PREREQUISITE_AUTHORITY } = await import('../scripts/data/authority/feat-prerequisite-authority.js');
const { TALENT_PREREQUISITE_AUTHORITY } = await import('../scripts/data/authority/talent-prerequisite-authority.js');
const { normalizeAuthorityKey } = await import('../scripts/data/authority/authority-key-normalizer.js');
const canon = (x) => String(x ?? '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/^none$/, '');
const authorityCompare = {};
for (const [domain, recs, auth] of [['feat', feats, FEAT_PREREQUISITE_AUTHORITY], ['talent', talents, TALENT_PREREQUISITE_AUTHORITY]]) {
  const counts = new Map(); for (const r of recs) counts.set(normalizeAuthorityKey(r.name), (counts.get(normalizeAuthorityKey(r.name)) ?? 0) + 1);
  const a = { records: recs.length, authorityEntries: Object.keys(auth).length, withAuthorityEntry: 0, withoutAuthorityEntry: 0, sameNameRecordsSharingOneKey: 0, textEqual: 0, textDiffers: [], sampleDiffers: [] };
  for (const r of recs) {
    const key = normalizeAuthorityKey(r.name); const e = auth[key];
    if (counts.get(key) > 1) a.sameNameRecordsSharingOneKey++;
    if (!e) { a.withoutAuthorityEntry++; continue; }
    a.withAuthorityEntry++;
    const prod = canon(r.system?.prerequisites ?? r.system?.prerequisite); const authText = canon(e.prerequisite);
    if (prod === authText) a.textEqual++; else a.textDiffers.push({ name: r.name, production: r.system?.prerequisites ?? null, authority: e.prerequisite ?? null });
  }
  // "substantive" = still different after dropping punctuation, case, filler words and clause order (a heuristic to rank review candidates)
  const bag = (x) => String(x ?? '').toLowerCase().replace(/\b(feat|skill|the|trained in|with|an?)\b/g, ' ').replace(/[^a-z0-9+]+/g, ' ').split(' ').filter(Boolean).sort().join(' ');
  for (const d of a.textDiffers) d.substantive = bag(d.production) !== bag(d.authority);
  a.substantiveDiffersCount = a.textDiffers.filter((d) => d.substantive).length;
  a.fullDiffers = a.textDiffers;
  a.textDiffersCount = a.textDiffers.length; a.sampleDiffers = a.textDiffers.filter((d) => d.substantive).slice(0, 6); delete a.textDiffers;
  const names = new Set(recs.map((r) => normalizeAuthorityKey(r.name))); a.authorityEntriesWithNoProductionRecord = Object.keys(auth).filter((k) => !names.has(k)).length;
  authorityCompare[domain] = a;
}
// PRQ.0C (read-only): text <-> structure comparison for the mechanically checkable leaf types (ability minimums and BAB). A mismatch is a
// TEXT_STRUCTURE_CONFLICT *candidate*; whether the text or the structure is right needs the published source.
const ABIL = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };
const textFacts = (txt) => { const f = { attr: {}, bab: null }; for (const m of String(txt ?? '').matchAll(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+(\d+)/gi)) f.attr[ABIL[m[1].toLowerCase()]] = Number(m[2]); const b = /Base Attack Bonus\s*\+?(\d+)/i.exec(txt ?? ''); if (b) f.bab = Number(b[1]); return f; };
const structFacts = (st) => { const f = { attr: {}, bab: null }; const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (x.type === 'attribute' && x.ability) f.attr[x.ability] = Number(x.min ?? x.value); if (x.type === 'bab') f.bab = Number(x.min ?? x.value); Object.values(x).forEach(walk); } }; walk(st); return f; };
const conflicts = {};
for (const [domain, recs] of [['feat', feats], ['talent', talents]]) {
  const c = { structuredRecordsChecked: 0, conflicts: [], textFactMissingFromStructure: [] };
  for (const r of recs) { const st = r.system?.prerequisitesStructured; if (!st) continue; c.structuredRecordsChecked++;
    const t = textFacts(r.system?.prerequisites ?? r.system?.prerequisite), q = structFacts(st);
    for (const k of new Set([...Object.keys(t.attr), ...Object.keys(q.attr)])) { if (q.attr[k] === undefined) c.textFactMissingFromStructure.push(`${r.name}: text ${k} ${t.attr[k]} absent from structure`); else if (t.attr[k] === undefined) c.conflicts.push(`${r.name}: structure ${k} ${q.attr[k]} not in text "${r.system?.prerequisites}"`); else if (t.attr[k] !== q.attr[k]) c.conflicts.push(`${r.name}: ${k} text ${t.attr[k]} vs structure ${q.attr[k]}`); }
    if (t.bab !== q.bab) (q.bab === null ? c.textFactMissingFromStructure : c.conflicts).push(`${r.name}: BAB text ${t.bab} vs structure ${q.bab}`);
  }
  conflicts[domain] = { structuredRecordsChecked: c.structuredRecordsChecked, conflictCount: c.conflicts.length, conflicts: c.conflicts.slice(0, 40), textFactMissingFromStructureCount: c.textFactMissingFromStructure.length, textFactMissingSample: c.textFactMissingFromStructure.slice(0, 15) };
}
const diffDoc = ['# PRQ.0C — production prerequisite text vs the name-keyed content authorities (generated, read-only)', '', 'Generated by `node tools/prq-corpus-census.mjs --diff-out <file>`. Every row is a CANDIDATE for source review (PRQ.0C); none is a correction. "Substantive" = still different after dropping punctuation, case, filler words and clause order. The authorities are keyed by normalized NAME, so same-name records cannot be distinguished by them.', ''];
for (const [domain, a] of Object.entries(authorityCompare)) {
  diffDoc.push(`## ${domain}s — ${a.textDiffersCount} differing (${a.substantiveDiffersCount} substantive); ${a.withoutAuthorityEntry} records without an authority entry; ${a.authorityEntriesWithNoProductionRecord} authority entries with no production record; ${a.sameNameRecordsSharingOneKey} records share a name key`, '', '| Record | Substantive | Production text | Authority text |', '|---|---|---|---|');
  for (const d of a.fullDiffers.sort((x, y) => Number(y.substantive) - Number(x.substantive))) diffDoc.push(`| ${d.name} | ${d.substantive ? 'yes' : 'no'} | ${String(d.production ?? '').replace(/\|/g, '/')} | ${String(d.authority ?? '').replace(/\|/g, '/')} |`);
  diffDoc.push(''); delete a.fullDiffers;
}
const result = { textStructureComparison: conflicts, authorityVsProduction: authorityCompare, textReferenceResolution: textRefs, generatedBy: 'tools/prq-corpus-census.mjs', manifestCanonicalIdentities: manifest.frozenCorpus?.canonicalIdentities ?? null, domains: out };
const md = ['# PRQ.0A — feat/talent prerequisite corpus census (read-only)', '', 'Generated by `node tools/prq-corpus-census.mjs --write <this file>` from `packs/feats.db` and `packs/talents.db`. Counts are of the CURRENT production packs, not historical audits.', '', '```json', JSON.stringify(result, null, 2), '```', ''].join('\n');
const dO = process.argv.indexOf('--diff-out'); if (dO > 0) { fs.writeFileSync(process.argv[dO + 1], diffDoc.join('\n')); console.log('wrote', process.argv[dO + 1]); }
const w = process.argv.indexOf('--write');
if (w > 0) { fs.writeFileSync(process.argv[w + 1], md); console.log('wrote', process.argv[w + 1]); } else console.log(md);

#!/usr/bin/env node
// Phase 3E-2a: source-first census of the Core Rulebook Gunslinger talent tree (pp. 216-217). Read-only.
//   node tools/census-talent-core-gunslinger.mjs          write JSON + MD
//   node tools/census-talent-core-gunslinger.mjs --check  fail if the committed census is stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_JSON = 'data/audits/talent-phase-3e-core-gunslinger-census.json';
const OUT_MD = 'docs/audits/talent-phase-3e-core-gunslinger-census.md';
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ndjson = rel => read(rel).split('\n').filter(Boolean).map(JSON.parse);
const TXT = 'reference/sourcebooks/Core Rulebook_djvu.txt';
const lines = read(TXT).split('\n');
const at = re => lines.map((l, i) => [i + 1, l]).filter(([, l]) => re.test(l));
const first = (re, after = 0) => { const h = at(re).find(([n]) => n > after); if (!h) throw new Error('TXT anchor missing: ' + re); return h[0]; };
const quote = (a, b) => lines.slice(a - 1, b).map(l => l.trimEnd()).filter(Boolean).join(' / ');
const norm = s => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/* ---- source layer (TXT) ---- */
const heading = first(/^GUNSLINGER TALENT TREE/);
const src = {
  treeHeading: { line: heading, text: lines[heading - 1].trim() },
  entries: [
    { name: 'Debilitating Shot', line: first(/^Debilitating Shot:/), ocr: 'clean enough to identify; benefit line truncated by column damage' },
    { name: 'Deceptive Shot', line: first(/^Deceptive Shot:/), ocr: 'clean enough to identify; benefit line truncated by column damage' },
    { name: 'Improved Quick Draw', line: first(/^Improved Quick Draw:/), ocr: 'clean enough to identify' },
    { name: 'Knockdown Shot', line: first(/^Knockdown Shot:/), ocr: 'clean enough to identify' },
    { name: 'Multiattack Proficiency (pistols)', line: first(/^Multiattack Proficiency \(pistols\):/), ocr: 'tail of the entry is displaced to the next column (TXT line ' + first(/^You can take this talent multiple times; each time you take this talent,/, 20578) + ')' },
    { name: 'Ranged Disarm', line: first(/^langed Disarm:/), ocr: 'DAMAGED: first letter lost ("langed"), mid-sentence words lost; sits after the page/column break' },
    { name: 'Trigger Work', line: first(/^Work; You take no penalty/), ocr: 'DAMAGED: name truncated to "Work;", benefit ends "…when using the ot feat" (Rapid Sh- lost)' }
  ]
};
const cont = src.entries.find(e => e.name === 'Ranged Disarm').line;
src.continuation = { lines: [cont - 3, cont + 6], text: quote(cont - 3, cont + 6) };
const idx = { rangedDisarm: first(/^Ranged Disarm 217/), triggerWork: first(/^Trigger Work 217/) };
const corroboration = {
  coreIndex: [{ entry: 'Ranged Disarm 217', line: idx.rangedDisarm }, { entry: 'Trigger Work 217', line: idx.triggerWork }],
  coreBody: { line: first(/^Ranged Disarm: If you have the Ranged Disarm talent \(see page 217/), note: 'the Disarm action text cross-references the talent on page 217' },
  coreStatBlocks: at(/Trigger Work/).filter(([n]) => n < 28000).map(([n, l]) => ({ line: n, text: l.trim() })),
  otherBooks: [
    { book: 'Galaxy of Intrigue', file: 'Galaxy of Intrigue_djvu.txt', line: 2180, text: 'Damaging Disarm … "Prerequisite: Ranged Disarm."' },
    { book: 'Threats of the Galaxy', file: 'Threats of the Galaxy_djvu.txt', lines: [1791, 1803], text: 'Trigger Work used in two printed stat blocks' }
  ]
};
for (const o of corroboration.otherBooks) { const t = fs.readFileSync(path.join(ROOT, 'reference/sourcebooks', o.file), 'utf8').split('\n'); for (const n of [].concat(o.line ?? o.lines)) if (!/Ranged Disarm|Trigger Work/.test(t[n - 1])) throw new Error(`stale corroboration anchor ${o.file}:${n}`); }

/* ---- authority layers ---- */
const registry = JSON.parse(read('data/audits/talent-canonical-tree-registry.json')).entries.find(e => e.canonicalTreeKey === 'Saga Edition Core Rulebook|Gunslinger');
const canon = JSON.parse(read('data/canonical/talents.json')).records.filter(r => r.canonicalTreeKey === 'Saga Edition Core Rulebook|Gunslinger');
const talents = ndjson('packs/talents.db'), trees = ndjson('packs/talent_trees.db');
const byId = new Map(talents.map(t => [t._id, t]));
const tree = trees.find(t => t._id === registry.repoTreeIds[0]);
const prod = tree.system.talentIds.map(id => byId.get(id));

const rows = src.entries.map(e => {
  const c = canon.find(r => norm(r.name) === norm(e.name));
  const p = prod.find(t => norm(t.name) === norm(e.name));
  const inReg = registry.originTalentNames.some(n => norm(n) === norm(e.name));
  const status = c && p && inReg ? 'EXACT_MATCH' : p && !c && !inReg ? 'AUTHORITY_GAP_PRODUCTION_PRESENT' : 'MISMATCH';
  return {
    name: e.name, sourceLine: e.line, sourceOcr: e.ocr, phase1dOriginRoster: inReg, canonicalIdentity: c?.canonicalIdentity ?? null, canonicalPage: c?.page ?? null,
    production: p ? { id: p._id, source: p.system.source ?? null, page: p.system.page ?? null, prerequisites: p.system.prerequisites ?? '', benefit: p.system.benefit } : null, status,
    productionMetadataDefect: p && (!p.system.source || !p.system.page) ? 'source/page missing on the production record' : null
  };
});
const sourceNames = new Set(src.entries.map(e => norm(e.name)));
const expansionNames = new Set(registry.talentPublications.filter(x => x.publicationType === 'EXPANSION').flatMap(x => x.talentNames).map(norm));
const extras = prod.filter(t => !sourceNames.has(norm(t.name)) && !expansionNames.has(norm(t.name))).map(t => ({ id: t._id, name: t.name }));
const census = {
  schemaVersion: 1, phase: '3E-2a', unit: 'Core Rulebook — Gunslinger talent tree (pp. 216-217)', status: 'CENSUS_COMPLETE_PDF_CONFIRMATION_REQUESTED', productionMutationPerformed: false,
  source: { txt: TXT, ...src }, corroboration, sourceRoster: src.entries.map(e => e.name),
  layerCounts: { sourceTxt: src.entries.length, phase1dOriginRoster: registry.originTalentNames.length, canonicalOriginIdentities: canon.filter(r => r.source === 'Saga Edition Core Rulebook').length, canonicalAggregateIdentities: canon.length, productionTreeMembers: prod.length },
  rows, unexplainedProductionExtras: extras,
  findings: {
    exactMatches: rows.filter(r => r.status === 'EXACT_MATCH').map(r => r.name),
    authorityGaps: rows.filter(r => r.status === 'AUTHORITY_GAP_PRODUCTION_PRESENT').map(r => r.name),
    mismatches: rows.filter(r => r.status === 'MISMATCH').map(r => r.name),
    productionMetadataDefects: rows.filter(r => r.productionMetadataDefect).map(r => r.name)
  },
  pdfRequests: [
    'Core p.216-217: confirm the Gunslinger talent tree lists exactly seven talents (Debilitating Shot, Deceptive Shot, Improved Quick Draw, Knockdown Shot, Multiattack Proficiency (pistols), Ranged Disarm, Trigger Work) and that Ranged Disarm / Trigger Work are printed on p.217.',
    'Core p.217: exact printed wording of Ranged Disarm (the TXT lost its first letter and several words).',
    'Core p.217: exact printed wording of Trigger Work (the TXT truncated the name and the end of the benefit; "Rapid Shot" is inferred, not read).',
    'Core p.216-217: does either Ranged Disarm or Trigger Work print a Prerequisite line? The TXT shows none.',
    'Core p.217: confirm nothing else is printed between Trigger Work and the Trusty Sidearm class-feature heading (neighbour boundary).'
  ]
};
census.interpretation = {
  phase1dRosterIsIncomplete: census.findings.authorityGaps.length > 0,
  productionIsCorrectForBoth: rows.filter(r => r.status === 'AUTHORITY_GAP_PRODUCTION_PRESENT').every(r => r.production),
  note: 'Phase 1D/2/3A never captured the two p.217 talents; production already holds both (Phase 3D) but without source/page. Authority gap, not a missing-record defect; the production source/page omission is a separate, small production defect to be fixed through the manifest contract, not by hand.'
};
const json = JSON.stringify(census, null, 2) + '\n';

const md = [
  '# Phase 3E-2a — Core Gunslinger source census (pp. 216–217)', '',
  'Read-only, source-first. Generator: `node tools/census-talent-core-gunslinger.mjs` · data: `data/audits/talent-phase-3e-core-gunslinger-census.json`.',
  `Status: **${census.status}**. Nothing was repaired; no production data was touched.`, '',
  '## Source evidence (Core Rulebook TXT)', '',
  `- Tree heading \`${src.treeHeading.text}\` at TXT line ${heading}. The tree is **alphabetical**: Debilitating Shot, Deceptive Shot, Improved Quick Draw, Knockdown Shot, Multiattack Proficiency (pistols), **Ranged Disarm, Trigger Work** — seven talents.`,
  `- Five entries sit before the class game-statistics table (TXT ${src.entries[0].line}–${src.entries[4].line}); the remaining two sit after the table, across the page/column break (TXT ${src.entries[5].line}, ${src.entries[6].line}): \`${src.continuation.text}\``,
  `- Corroboration independent of the tree text: Core index lines ${idx.rangedDisarm} ("Ranged Disarm 217") and ${idx.triggerWork} ("Trigger Work 217"); Core body line ${corroboration.coreBody.line} ("…the Ranged Disarm talent (see page 217…"); Trigger Work in printed Core stat blocks (TXT ${corroboration.coreStatBlocks.map(s => s.line).join(', ')}) and two Threats of the Galaxy stat blocks; Galaxy of Intrigue line 2180 gives *Damaging Disarm* the prerequisite **Ranged Disarm**.`, '',
  '## Comparison: source vs Phase 1D roster vs canonical corpus vs production', '',
  '| Talent | TXT line | Phase 1D roster | Canonical identity | Production (source / page) | Status |', '|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.name} | ${r.sourceLine} | ${r.phase1dOriginRoster ? 'yes' : '**no**'} | ${r.canonicalIdentity ? 'yes (p.' + r.canonicalPage + ')' : '**no**'} | ${r.production ? `\`${r.production.id}\` (${r.production.source ?? '**—**'} / ${r.production.page ?? '**—**'})` : '**missing**'} | ${r.status} |`), '',
  `Layer counts — source TXT **${census.layerCounts.sourceTxt}**, Phase 1D origin roster **${census.layerCounts.phase1dOriginRoster}**, canonical corpus origin identities **${census.layerCounts.canonicalOriginIdentities}** (aggregate with expansions ${census.layerCounts.canonicalAggregateIdentities}), production tree members **${census.layerCounts.productionTreeMembers}**.`, '',
  '## Findings', '',
  `- **Exact matches (${census.findings.exactMatches.length}):** ${census.findings.exactMatches.join('; ')}.`,
  `- **Authority gaps, production already correct (${census.findings.authorityGaps.length}):** ${census.findings.authorityGaps.join('; ')} — published on p.217, absent from Phase 1D/2/3A, present in production since Phase 3D.`,
  `- **Identity / tree mismatches:** ${census.findings.mismatches.length ? census.findings.mismatches.join('; ') : 'none'}.`,
  `- **Unexplained production extras in the tree:** ${extras.length ? extras.map(e => e.name).join('; ') : 'none'} (the ten other members are certified expansion publications).`,
  `- **Production metadata defect (small, separate):** ${census.findings.productionMetadataDefects.join('; ')} carry no \`source\`/\`page\` in production.`, '',
  '## What the TXT cannot settle — PDF confirmation requested', '',
  ...census.pdfRequests.map((q, i) => `${i + 1}. ${q}`), '',
  'Until the PDF answers are in, the two records stay `TXT_AMBIGUOUS_PDF_REQUIRED` for exact wording and page; their existence and tree membership are `TXT_CONFIRMED` by four independent TXT anchors. No canonical text is manufactured from partial OCR.', ''
].join('\n');

if (process.argv.includes('--check')) {
  const ok = fs.existsSync(path.join(ROOT, OUT_JSON)) && read(OUT_JSON) === json && fs.existsSync(path.join(ROOT, OUT_MD)) && read(OUT_MD) === md;
  if (!ok) { console.error('[gunslinger-census] STALE: regenerate with node tools/census-talent-core-gunslinger.mjs'); process.exit(1); }
  console.log('[gunslinger-census] PASS: census current');
} else {
  fs.writeFileSync(path.join(ROOT, OUT_JSON), json); fs.writeFileSync(path.join(ROOT, OUT_MD), md);
  console.log(JSON.stringify({ layerCounts: census.layerCounts, findings: census.findings, extras }, null, 1));
}

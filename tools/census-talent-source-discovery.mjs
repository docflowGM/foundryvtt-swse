#!/usr/bin/env node
// Phase 3E-2b: source-first DISCOVERY census over the whole corpus. Read-only; produces leads, never repairs.
//   1. stat-block census   : every talent named in a published NPC stat block vs the canonical pack (+ broad name universe)
//   2. prerequisite closure: every name in a canonical prerequisite must resolve to a known talent/feat/power/skill/class/tree
//   3. rare-token scan     : words in canonical text that occur (almost) nowhere in the 14 sourcebooks (lost spaces, OCR typos)
// Every residual item must be classified below; an unclassified residual makes --check fail, so new leads cannot hide.
//   node tools/census-talent-source-discovery.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_JSON = 'data/audits/talent-phase-3e-discovery-census.json';
const OUT_MD = 'docs/audits/talent-phase-3e-discovery-census.md';
const nd = f => { try { return fs.readFileSync(path.join(ROOT, 'packs', f + '.db'), 'utf8').split('\n').filter(Boolean).map(JSON.parse); } catch { return []; } };
const norm = s => String(s).toLowerCase().replace(/[’']/g, '').replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };

const dir = path.join(ROOT, 'reference/sourcebooks');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort();
const short = f => f.replace('_djvu.txt', '');
const txt = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8').split('\n')]));
const freq = new Map();
for (const f of files) for (const l of txt[f]) for (const w of l.toLowerCase().split(/[^a-z]+/)) if (w.length > 2) freq.set(w, (freq.get(w) || 0) + 1);

/* ---- name universe ---- */
const talents = nd('talents');
const talentNames = new Set(talents.map(t => norm(t.name)));
const universe = new Map();
const add = (n, s) => { const k = norm(String(n ?? '')); if (k && !universe.has(k)) universe.set(k, s); };
for (const t of talents) add(t.name, 'talent');
for (const f of ['feats', 'forcepowers', 'forcetechniques', 'forcesecrets', 'classes', 'species', 'extraskilluses', 'forceregimens', 'backgrounds', 'droids', 'beasts', 'talent_trees']) for (const d of nd(f)) { add(d.name, f); for (const k of ['starting_features', 'features']) for (const x of d.system?.[k] ?? []) add(x?.name ?? x, f + ':feature'); }
for (const c of nd('classes')) for (const lv of Object.values(c.system?.level_progression ?? {})) for (const x of lv?.features ?? []) add(x?.name ?? x, 'classfeature');
for (const s of ['sneak attack', 'damage reduction', 'armored defense', 'armored defenses', 'uncanny dodge', 'familiar foe', 'trusty sidearm', 'resilience', 'minion', 'indomitable', 'force training', 'armor proficiency', 'weapon proficiency', 'weapon focus', 'weapon specialization', 'skill focus', 'skill training', 'dark side', 'light side']) add(s, 'generic');
for (const s of ['acrobatics', 'climb', 'deception', 'endurance', 'gather information', 'initiative', 'jump', 'knowledge', 'mechanics', 'perception', 'persuasion', 'pilot', 'ride', 'stealth', 'survival', 'swim', 'treat injury', 'use computer', 'use the force', 'force']) add(s, 'skill');

/* ---- 1. stat-block census ---- */
const STOP = /^(Feats|Special Actions|Special Qualities|Force Powers|Force Techniques|Force Secrets|Equipment|Possessions|Skills|Languages|Abilities|Destiny|Species Traits|Starship|Weapons?|Armor|Defenses|Hit Points|Speed|Base Atk|Initiative|Senses)\b/;
const found = new Map();
for (const f of files) {
  const lines = txt[f];
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*Talents?\s+(.+)$/.exec(lines[i]); if (!m) continue;
    let t = m[1], j = i + 1;
    while (j < lines.length && lines[j].trim() && !STOP.test(lines[j].trim()) && j < i + 6) { t += ' ' + lines[j].trim(); j++; }
    let depth = 0, cur = '', parts = [];
    for (const ch of t) { if ('({['.includes(ch)) depth++; if (')}]'.includes(ch)) depth = Math.max(0, depth - 1); if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch; }
    parts.push(cur);
    for (let p of parts) {
      p = p.replace(/\s+/g, ' ').trim().replace(/[.;]$/, '');
      const base = p.replace(/\s*[({[].*$/, '').replace(/\s*\+?\d+d?\d*$/, '').replace(/\s+[IVXl|]+$/, '').trim();
      if (base.length < 4 || base.length > 45 || !/^[A-Z]/.test(base)) continue;
      const k = norm(base); if (!k) continue;
      const r = found.get(k) ?? { name: base, refs: [] }; r.refs.push(`${short(f)}:${i + 1}`); found.set(k, r);
    }
  }
}
// Classification of residual stat-block names (each must be listed; LEAD = needs a lookup, ARTIFACT = OCR line damage / list wrap).
const STAT_RESIDUAL = {
  'wanted alive': ['LEAD', 'Core Rulebook stat block lists the talent; no definition heading exists anywhere in the Core TXT.'],
  'force valor': ['LEAD', 'KOTOR stat blocks list it under Special Actions/Talents; the only definition found is the Force power "valor" (KOTOR TXT 4829), not a talent.'],
  'attract student': ['LEAD', 'KOTOR stat block (TXT 21681); no talent definition found (Attract Minion is a different, canonical Core talent).'],
  'shocking revelation': ['LEAD', 'LECG stat block lists it under Special Actions and Talents (TXT 11633/11637); no definition found.'],
  'social engineering': ['LEAD', 'LECG stat block (TXT 19381); no definition found (the phrase appears only as prose elsewhere).'],
  'squad fighter': ['LEAD', 'LECG stat block lists it under Special Actions and Talents (TXT 19826/19830) next to the canonical Squad Superiority; no definition found.'],
  'master shaper': ['SOURCE_STATBLOCK_DISCREPANCY_LIKELY', 'LECG stat block (TXT 20841); the printed Shaper tree lists Biotech Mastery, Expedient Mending, Expert Shaper, Master Mender, Skilled Implanter (TXT 4135-4170): no "Master Shaper" talent. Probably a printed stat-block naming error.'],
  'greater': ['OCR_LINE_ARTIFACT', 'list wrap: "Greater Weapon Focus/Specialization (…)" split across a line'],
  'commando': ['OCR_LINE_ARTIFACT', 'Galaxy at War TXT 8430: a list of tree names, not a talent'],
  'camouflage': ['OCR_LINE_ARTIFACT', 'Galaxy at War TXT 8430: a list of tree names, not a talent'],
  'empower': ['OCR_LINE_ARTIFACT', 'wrap of "Empower Weapon"'], 'gauge force': ['OCR_LINE_ARTIFACT', 'wrap of "Gauge Force Potential"'],
  'devastating': ['OCR_LINE_ARTIFACT', 'wrap of "Devastating Attack (…)"'], 'single weapon': ['OCR_LINE_ARTIFACT', 'wrap of "Single Weapon Flourish"'],
  'armored': ['OCR_LINE_ARTIFACT', 'wrap of "Armored Defense"'], 'multiattack': ['OCR_LINE_ARTIFACT', 'wrap of "Multiattack Proficiency (…)"'],
  'hunters target improved armored defense': ['OCR_LINE_ARTIFACT', 'two talents merged by a lost comma'],
  'elusive target force perception': ['OCR_LINE_ARTIFACT', 'two talents merged by a lost comma'],
  'crippling strike devastating attack': ['OCR_LINE_ARTIFACT', 'two talents merged by a lost comma'],
  'feats armor proficiency': ['OCR_LINE_ARTIFACT', 'section heading merged into the talent list'], 'force': ['OCR_LINE_ARTIFACT', 'wrap / fragment'],
  'ser wars': ['OCR_LINE_ARTIFACT', 'garbled Scum and Villainy stat block'], 'bate ais coe fre harm way': ['OCR_LINE_ARTIFACT', 'garbled Scum and Villainy stat block (Out of Harm\'s Way)'], 'pace': ['OCR_LINE_ARTIFACT', 'garbled Scum and Villainy stat block']
};
const stat = { names: found.size, matchedCanonicalTalent: 0, knownNonTalent: 0, ocrVariantOfKnown: [], ocrNoise: 0, residual: [] };
for (const [k, v] of found) {
  if (talentNames.has(k)) { stat.matchedCanonicalTalent++; continue; }
  if (universe.has(k)) { stat.knownNonTalent++; continue; }
  let best = 1e9, bn = ''; for (const n of universe.keys()) { const d = lev(k, n); if (d < best) { best = d; bn = n; } }
  const sim = 1 - best / Math.max(k.length, bn.length);
  if (sim >= 0.8) { stat.ocrVariantOfKnown.push({ name: v.name, knownAs: bn, similarity: +sim.toFixed(2), refs: v.refs.slice(0, 2) }); continue; }
  if (!k.split(' ').filter(Boolean).every(w => (freq.get(w) || 0) >= 6)) { stat.ocrNoise++; continue; }
  const cls = STAT_RESIDUAL[k];
  stat.residual.push({ name: v.name, key: k, closest: bn, similarity: +sim.toFixed(2), refs: v.refs.slice(0, 4), kind: cls?.[0] ?? 'UNCLASSIFIED', note: cls?.[1] ?? null });
}
stat.residual.sort((a, b) => a.name.localeCompare(b.name));
stat.ocrVariantOfKnown.sort((a, b) => a.name.localeCompare(b.name));

/* ---- 2. prerequisite closure ---- */
const PREREQ_CLASS = [
  [/^(battie analysis)$/, 'OCR_DEFECT_IN_CANONICAL_TEXT', 'Battle Analysis'],
  [/^(enpower weapon)$/, 'OCR_DEFECT_IN_CANONICAL_TEXT', 'Empower Weapon'],
  [/^hunters target p$/, 'OCR_DEFECT_IN_CANONICAL_TEXT', "Hunter's Target (stray \". P\")"],
  [/^shift defense il$/, 'OCR_DEFECT_IN_CANONICAL_TEXT', 'Shift Defense II'],
  [/^command decision$/, 'UNRESOLVED_NAME_LEAD', 'Unknown Regions prints it as a prerequisite of Turn the Tide; no committed TXT defines a talent, feat or power of that name'],
  [/^(adapt|survive|strike|blaster|blade i|blade ii|discblade|duelist)$/, 'SPLIT_OR_TREE_REFERENCE', 'fragment of a compound name ("Adapt and Survive", "Strike and Run", "Blaster and Blade I-III") or a tree/class reference'],
  [/^inspiration$/, 'TREE_REFERENCE', 'names the Inspiration talent tree'],
  [/^block or deflect$/, 'ALTERNATIVE_LIST', 'either of two talents'],
  [/(chosen|selected|special quality|with the|with that|with weapon|worn|with chosen|with the type|for chosen|media|or lightsabers|or lightsaber forms|weapon group|skills?$|^equipped|larger size|binary language|demolitions skill|galactic lore|pistols\) feats|rifles\) feat|flourish i or|^exotic melee|armor proficiency light|pistols feats|^medium$|^proficien|^trained in|discblade|wan shen|weapon proficiency|weapon focus|weapon specialization|double attack|brutal attack)/, 'GENERIC_DESCRIPTOR', 'a generic requirement, not a named talent']
];
const vocab = new Set();
const prereq = { unresolved: [] };
const missing = new Map();
const STATNOISE = /(base attack|bab|level|dexterity|strength|constitution|intelligence|wisdom|charisma|dark side|force sensitiv|species|droid|any |character|heroic|force technique|force power|one |two |three |\+\d|\d+)/i;
for (const t of talents) {
  const p = String(t.system?.prerequisites ?? ''); if (!p || /^none\.?$/i.test(p.trim())) continue;
  for (let part of p.split(/[;,]|\band\b/i)) {
    part = part.replace(/\.$/, '').trim(); if (!part || part.length > 70) continue;
    const base = part.replace(/\b(trained in|proficient|proficiency|feat|talent|skill|the)\b/gi, ' ').trim();
    const k = norm(part), kb = norm(base);
    if (universe.has(k) || universe.has(kb) || universe.has(norm(part.replace(/\b(a|an|the)\b/gi, ' ')))) continue;
    if (STATNOISE.test(part)) continue;
    const r = missing.get(k) ?? { part, by: [] }; r.by.push(t.name); missing.set(k, r);
  }
}
for (const [k, v] of missing) {
  const hit = PREREQ_CLASS.find(([re]) => re.test(k));
  prereq.unresolved.push({ text: v.part, key: k, usedBy: [...new Set(v.by)].slice(0, 4), uses: v.by.length, kind: hit?.[1] ?? 'UNCLASSIFIED', note: hit?.[2] ?? null });
}
prereq.unresolved.sort((a, b) => a.kind.localeCompare(b.kind) || a.text.localeCompare(b.text));

/* ---- 3. rare-token scan over canonical text ---- */
const canon = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/canonical/talents.json'), 'utf8')).records;
const rare = new Map();
for (const r of canon) for (const fld of ['benefit', 'description', 'prerequisites', 'summary']) for (const w of String(r[fld] ?? '').toLowerCase().split(/[^a-z]+/)) {
  if (w.length > 3 && (freq.get(w) || 0) <= 1) { const x = rare.get(w) ?? { token: w, uses: 0, in: new Set() }; x.uses++; x.in.add(r.canonicalIdentity.split('|').slice(1).join('|')); rare.set(w, x); }
}
const LOST_SPACE = /^(ateam|aswift|theirspeed|forcesensitive|forceusers|nonproficiency|nonenergy|nonsurprised|nonthreatening|nonprestige|posess)$/;
const tokens = [...rare.values()].sort((a, b) => b.uses - a.uses).map(x => ({ token: x.token, uses: x.uses, example: [...x.in][0], likelyDefect: LOST_SPACE.test(x.token) }));

const census = {
  schemaVersion: 1, phase: '3E-2b', status: 'DISCOVERY_CENSUS', productionMutationPerformed: false,
  method: 'Independent of the Phase 1D/2/3A claims: names are read from published stat blocks, canonical prerequisites and the raw TXT vocabulary.',
  statBlockCensus: { ...stat, residualByKind: stat.residual.reduce((o, r) => (o[r.kind] = (o[r.kind] || 0) + 1, o), {}) },
  prerequisiteClosure: { unresolved: prereq.unresolved.length, byKind: prereq.unresolved.reduce((o, r) => (o[r.kind] = (o[r.kind] || 0) + 1, o), {}), items: prereq.unresolved },
  rareTokenScan: { distinctTokens: tokens.length, likelyDefects: tokens.filter(t => t.likelyDefect), tokens },
  leads: {
    missingTalentCandidates: [...stat.residual.filter(r => r.kind === 'LEAD').map(r => ({ name: r.name, kind: 'STAT_BLOCK_UNDEFINED', refs: r.refs })), ...prereq.unresolved.filter(r => r.kind === 'UNRESOLVED_NAME_LEAD').map(r => ({ name: r.text, kind: 'PREREQUISITE_UNDEFINED', usedBy: r.usedBy }))],
    sourceDiscrepancies: stat.residual.filter(r => r.kind === 'SOURCE_STATBLOCK_DISCREPANCY_LIKELY').map(r => r.name),
    canonicalTextDefects: prereq.unresolved.filter(r => r.kind === 'OCR_DEFECT_IN_CANONICAL_TEXT').map(r => ({ text: r.text, intended: r.note, usedBy: r.usedBy }))
  }
};
const unclassified = [...stat.residual.filter(r => r.kind === 'UNCLASSIFIED').map(r => 'stat-block: ' + r.name), ...prereq.unresolved.filter(r => r.kind === 'UNCLASSIFIED').map(r => 'prerequisite: ' + r.text)];
census.unclassified = unclassified;
const json = JSON.stringify(census, null, 2) + '\n';

const md = [
  '# Phase 3E-2b — Source-first discovery census', '',
  'Read-only. Generator: `node tools/census-talent-source-discovery.mjs` · data: `data/audits/talent-phase-3e-discovery-census.json`. These are **leads**; nothing is repaired and no production data is touched.', '',
  'The method is independent of the Phase 1D/2/3A claims (which is what is being tested): names come from published NPC stat blocks, from canonical prerequisite text, and from the raw TXT vocabulary.', '',
  '## 1. Stat-block census', '',
  `${stat.names} distinct talent names appear in published stat blocks. ${stat.matchedCanonicalTalent} match a canonical talent exactly; ${stat.knownNonTalent} are known non-talents (feats, powers, class features); ${stat.ocrVariantOfKnown.length} are OCR variants of a known name; ${stat.ocrNoise} are garbled beyond recognition; **${stat.residual.length} residual**, every one classified:`, '',
  '| Name | Kind | Where | Note |', '|---|---|---|---|',
  ...stat.residual.map(r => `| ${r.name} | ${r.kind} | ${r.refs.slice(0, 3).join(', ')} | ${r.note ?? ''} |`), '',
  `**Leads worth a lookup (${census.leads.missingTalentCandidates.length}):** ${census.leads.missingTalentCandidates.map(l => l.name).join('; ')}. None is defined anywhere in the 14 TXT files; each is either a talent the claims layer never captured, a talent defined on a page the TXT lost, or a printed stat-block inconsistency. They need the PDF.`, '',
  '## 2. Prerequisite closure', '',
  `${prereq.unresolved.length} prerequisite fragments on canonical talents do not resolve to a known name (by kind: ${Object.entries(census.prerequisiteClosure.byKind).map(([k, v]) => `${k} ${v}`).join(', ')}).`, '',
  '- **Canonical text defects (silent OCR errors the earlier signature gate could not see):** ' + census.leads.canonicalTextDefects.map(d => `\`${d.text}\` (→ ${d.intended}; ${d.usedBy.join(', ')})`).join('; ') + '.',
  '- **Unresolved name:** ' + (prereq.unresolved.filter(r => r.kind === 'UNRESOLVED_NAME_LEAD').map(r => `\`${r.text}\` — ${r.note}`).join('; ') || 'none') + '.',
  '- The rest are generic descriptors ("Weapon Focus with the chosen weapon"), fragments of compound names and tree references, not missing talents.', '',
  '## 3. Rare-token scan of canonical text', '',
  `${tokens.length} words in canonical text occur at most once in all 14 sourcebooks. Most are legitimate rare words; the lost-space/typo candidates are: ${census.rareTokenScan.likelyDefects.map(t => `\`${t.token}\` (${t.example})`).join(', ')}.`, '',
  '## What this means for completeness', '',
  `- No stat-block or prerequisite evidence points at a talent missing from a *defined* tree beyond the already-handled seven. The residual leads above are names **used but never defined** in the TXT; they are the honest open items for the corpus-vs-publication question.`,
  `- Separately, the closure exposed a small set of canonical **text** defects (a different correction unit from completeness).`, '',
  census.unclassified.length ? `**UNCLASSIFIED residuals (census incomplete): ${census.unclassified.join('; ')}**` : 'Every residual is classified.', ''
].join('\n');

if (process.argv.includes('--check')) {
  const bad = [];
  if (census.unclassified.length) bad.push('unclassified residuals: ' + census.unclassified.join('; '));
  if (!fs.existsSync(path.join(ROOT, OUT_JSON)) || fs.readFileSync(path.join(ROOT, OUT_JSON), 'utf8') !== json || !fs.existsSync(path.join(ROOT, OUT_MD)) || fs.readFileSync(path.join(ROOT, OUT_MD), 'utf8') !== md) bad.push('committed census is stale');
  if (bad.length) { console.error('[discovery-census] FAIL: ' + bad.join(' | ')); process.exit(1); }
  console.log('[discovery-census] PASS: census current, every residual classified');
} else {
  fs.writeFileSync(path.join(ROOT, OUT_JSON), json); fs.writeFileSync(path.join(ROOT, OUT_MD), md);
  console.log(JSON.stringify({ stat: { names: stat.names, matched: stat.matchedCanonicalTalent, variants: stat.ocrVariantOfKnown.length, noise: stat.ocrNoise, residual: stat.residual.length, byKind: census.statBlockCensus.residualByKind }, prereq: census.prerequisiteClosure.byKind, rare: tokens.length, unclassified: census.unclassified, leads: census.leads.missingTalentCandidates.map(l => l.name) }, null, 1));
}

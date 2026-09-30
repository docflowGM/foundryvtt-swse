#!/usr/bin/env node
/**
 * Phase 3E-5a — finite canonical text-defect manifest (read-only).
 *
 * The defect universe is this explicit list, each entry located by exact string in production AND in the certified canonical
 * corpus. A heuristic scan (rare tokens, OCR confusables, stray digits) only *nominates* candidates here; nothing is written
 * to production from a scan. Every correction needs PDF verification (status PDF_REQUIRED until the owner confirms the
 * printed text); a later apply unit consumes only PDF_VERIFIED entries.
 *
 *   node tools/build-talent-phase-3e5-defect-manifest.mjs           write data/audits/talent-phase-3e5-text-defect-manifest.json + docs
 *   node tools/build-talent-phase-3e5-defect-manifest.mjs --check   committed artifacts are current and every entry still locates exactly
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCommittedManifests } from './apply-talent-phase-3c.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/talent-phase-3e5-text-defect-manifest.json';
export const OUT_MD = 'docs/audits/talent-phase-3e5-text-defect-manifest.md';
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ndjson = rel => read(rel).split('\n').filter(Boolean).map(JSON.parse);

const HALF = { group: 'OCR_CONFUSABLE_LETTER', find: 'haIf', replace: 'half', confidence: 'CERTAIN', evidence: 'capital "I" read for lowercase "l"; every other record prints "one-half"', txt: null };
/** The finite list. `replace: null` = exact printed wording unknown (owner PDF transcription required). `action` NO_CHANGE = preserve as printed unless the PDF disagrees. */
export const DEFECTS = [
  { id: 'TD-01', record: 'Cover Fire', fields: ['prerequisites'], group: 'OCR_DEFECT_IN_NAME_REFERENCE', find: 'Battie Analysis', replace: 'Battle Analysis', confidence: 'CERTAIN', evidence: 'the prerequisite is the Clone Wars talent "Battle Analysis" (CWCG TXT 14172/15054/18359)' },
  { id: 'TD-02', record: 'Primitive Block', fields: ['prerequisites'], group: 'OCR_DEFECT_IN_NAME_REFERENCE', find: 'Enpower Weapon', replace: 'Empower Weapon', confidence: 'CERTAIN', evidence: 'the prerequisite is the Core talent "Empower Weapon" (Core TXT 20357, index 27973)' },
  { id: 'TD-03', record: 'Relentless', fields: ['prerequisites'], group: 'STRAY_OCR_FRAGMENT', find: "Hunter's Target. P", replace: "Hunter's Target.", confidence: 'LIKELY', evidence: 'Core TXT 19703 prints "Prerequisites: Hunter\'s Mark, Hunter\'s Target. P" with the stray "P" from the next text run; the talent list ends at Hunter\'s Target' },
  { id: 'TD-04', record: 'Shift Defense I', fields: ['prerequisites'], group: 'MISATTACHED_PREREQUISITE', find: 'Shift Defense 1, Shift Defense Il', replace: '', confidence: 'LIKELY', evidence: 'Core TXT 21224 prints Shift Defense I with no prerequisite; the string belongs to Shift Defense III (Core TXT 21240 "Prerequisites: Shift Defense 1, Shift Defense Il"), whose own record already reads "Shift Defense I; Shift Defense II". Not merely OCR: the prerequisite of tier I is wrong (and self-referential).' },
  { id: 'TD-05', record: "Hunter's Mark", fields: ['benefit', 'description', 'summary'], group: 'MULTI_TOKEN_OCR_DAMAGE', find: 'you 4 target -1 step along the condition track if the ateam hits', replace: null, confidence: 'NEEDS_PRINT', evidence: 'Core TXT 19643-19645 is garbled in three places ("ranged attack" missing its article, "you 4 target", "ateam"); the exact printed sentence cannot be reconstructed from the TXT' },
  { id: 'TD-06', record: 'Wrong Decision', fields: ['benefit', 'description'], group: 'OCR_LOST_SPACE', find: 'aswift', replace: 'a swift', confidence: 'CERTAIN', evidence: '"As aswift action" (KOTOR TXT 4037); the same book prints "a swift action" elsewhere (TXT 4022)' },
  { id: 'TD-07', record: 'Wrong Decision', fields: ['benefit', 'description'], group: 'OCR_LOST_SPACE', find: 'theirspeed', replace: 'their speed', confidence: 'CERTAIN', evidence: 'KOTOR TXT 4039 reads "theirspeed" (lost space)' },
  { id: 'TD-08', record: 'Drain Force', fields: ['benefit', 'description', 'summary'], group: 'OCR_LOST_HYPHEN', find: 'Forcesensitive', replace: 'Force-sensitive', confidence: 'CERTAIN', evidence: 'the books print "Force-sensitive" (e.g. KOTOR TXT 15343)' },
  { id: 'TD-09', record: 'Difficult to Sense', fields: ['benefit', 'description'], group: 'OCR_LOST_HYPHEN', find: 'Forceusers', replace: 'Force-users', confidence: 'CERTAIN', evidence: 'Legacy Era Campaign Guide TXT 3598/3602 prints "Force-users"' },
  ...['Bring Them Back', 'Hotwired Processor', 'Influential Friends', 'Power Boost', 'Power Surge', 'Share Talent', 'Vital Encouragement'].map((record, i) => ({ id: `TD-${10 + i}`, record, fields: record === 'Bring Them Back' ? ['benefit', 'description', 'summary'] : ['benefit', 'description'], ...HALF })),
  { id: 'TD-17', record: 'Sidestep', fields: ['benefit'], group: 'SUSPECT_SENTENCE', find: 'move into a diagonal space to 1 until the end of your turn', replace: null, confidence: 'NEEDS_PRINT', evidence: 'flagged by the stray-digit scan ("to 1 until"): possibly damaged; no TXT comparison made. Owner to confirm the printed sentence; if it is correct as shown, close as NO_CHANGE.' }
];
/** Candidates the scans nominated that are NOT defects on the evidence: preserved as printed unless the PDF disagrees. */
export const NO_CHANGE = [
  { id: 'NC-01', record: 'Seyugi Cyclone', token: 'posess', reason: 'printed typo: Jedi Academy Training Manual TXT 7645 prints "posess" exactly as canonical; canonical text = published text. Owner decision: PRESERVE_PRINTED_TYPO (recommended) or CORRECT.' },
  { id: 'NC-02', record: 'Malkite Techniques', token: 'nonenergy', reason: 'printed form (Threats TXT 1118)' },
  { id: 'NC-03', record: 'Disarm and Engage', token: 'nonproficiency', reason: 'printed form (Galaxy of Intrigue TXT 1980)' },
  { id: 'NC-04', record: 'Done It All', token: 'nonprestige', reason: 'printed form (Galaxy of Intrigue TXT 1636)' },
  { id: 'NC-05', record: 'Ambush', token: 'nonsurprised', reason: 'no TXT comparison available; the SWSE "non" prefix is unhyphenated elsewhere. Change only if the PDF shows a hyphen or space.' },
  { id: 'NC-06', record: 'Two-Faced', token: 'nonthreatening', reason: 'option label "Nonthreatening:" (printed label form); change only if the PDF disagrees' }
];

const descOf = t => (t.system.description && typeof t.system.description === 'object') ? t.system.description.value : t.system.description;
const prodField = (t, f) => f === 'description' ? descOf(t) : t.system[f];
const count = (s, needle) => (String(s ?? '').split(needle).length - 1);

export function build() {
  const prod = ndjson('packs/talents.db'), canon = JSON.parse(read('data/canonical/talents.json')).records;
  const idOf = new Map();
  for (const { manifest } of loadCommittedManifests()) for (const r of manifest.records) { const i = r.identityResolution; idOf.set(r.canonicalIdentity, i.productionRecordId || i.createRecordId); }
  const canonByProd = new Map(canon.map(r => [idOf.get(r.canonicalIdentity), r]));
  const errors = [];
  const entries = DEFECTS.map(d => {
    const ps = prod.filter(t => t.name === d.record);
    if (ps.length !== 1) { errors.push(`${d.id}: ${ps.length} production records named ${d.record}`); return null; }
    const p = ps[0], c = canonByProd.get(p._id);
    const fields = {};
    for (const f of d.fields) {
      const nProd = count(prodField(p, f), d.find), nCanon = count(c?.[f], d.find);
      if (nProd !== 1) errors.push(`${d.id}: "${d.find}" occurs ${nProd}x in production ${d.record}.${f}`);
      if (nCanon !== 1) errors.push(`${d.id}: "${d.find}" occurs ${nCanon}x in canonical ${d.record}.${f}`);
      fields[f] = { productionOccurrences: nProd, canonicalOccurrences: nCanon, productionValue: prodField(p, f), canonicalValue: c?.[f] ?? null };
    }
    return {
      id: d.id, productionId: p._id, name: d.record, canonicalIdentity: c?.canonicalIdentity, publication: { sourcebook: p.system.source, page: p.system.page },
      group: d.group, find: d.find, replace: d.replace, fields, confidence: d.confidence, evidence: d.evidence,
      action: d.replace === null ? 'OWNER_TRANSCRIPTION_REQUIRED' : 'REPLACE',
      verification: { status: 'PDF_REQUIRED', verifiedText: null, question: d.replace === null ? `Transcribe the exact printed text of ${d.record} (${p.system.source} p.${p.system.page}) around: "${d.find}"` : `Confirm the printed text of ${d.record} (${p.system.source} p.${p.system.page}) reads "${d.replace}" where production has "${d.find}"` }
    };
  }).filter(Boolean);
  const noChange = NO_CHANGE.map(n => { const p = prod.find(t => t.name === n.record); return { ...n, productionId: p?._id, publication: { sourcebook: p?.system.source, page: p?.system.page }, action: 'NO_CHANGE', verification: { status: 'PDF_OPTIONAL' } }; });
  const manifest = {
    schemaVersion: 1, phase: '3E-5a', status: 'DEFECT_MANIFEST_AWAITING_PDF', productionMutationPerformed: false,
    rule: 'Finite list. Scans nominate; only entries here can ever be applied, and only once verification.status is PDF_VERIFIED with the printed text recorded.',
    scansUsed: ['rare-token scan of canonical text (3E-2b)', 'OCR-confusable scan (mid-word capitals, Il/1I, stray ". P")', 'stray-digit-in-sentence scan'],
    scanLimits: 'Heuristic scans cannot prove absence of damage; they bound the nominated universe, they do not certify the corpus text. A full-text PDF comparison is out of 3E scope.',
    counts: { defects: entries.length, byConfidence: entries.reduce((o, e) => (o[e.confidence] = (o[e.confidence] || 0) + 1, o), {}), ownerTranscriptionRequired: entries.filter(e => e.action === 'OWNER_TRANSCRIPTION_REQUIRED').length, noChangeCandidates: noChange.length, recordsAffected: new Set(entries.map(e => e.productionId)).size },
    entries, noChangeCandidates: noChange, errors
  };
  return manifest;
}

function renderMd(m) {
  return ['# Phase 3E-5a — Canonical text-defect manifest', '',
    'Read-only. Generator: `node tools/build-talent-phase-3e5-defect-manifest.mjs` · data: `data/audits/talent-phase-3e5-text-defect-manifest.json`.', '',
    `${m.rule}`, '',
    `**${m.counts.defects} defect entries across ${m.counts.recordsAffected} records** (${Object.entries(m.counts.byConfidence).map(([k, v]) => `${k} ${v}`).join(', ')}); ${m.counts.ownerTranscriptionRequired} need an owner transcription; ${m.counts.noChangeCandidates} scan candidates are preserved as printed.`, '',
    '| ID | Record | Book p. | Field(s) | Production has | Proposed | Conf. |', '|---|---|---|---|---|---|---|',
    ...m.entries.map(e => `| ${e.id} | ${e.name} | ${e.publication.sourcebook} p.${e.publication.page} | ${Object.keys(e.fields).join(', ')} | \`${e.find}\` | ${e.replace === null ? '**owner transcription**' : e.replace === '' ? '*(remove)*' : '`' + e.replace + '`'} | ${e.confidence} |`), '',
    '## Evidence', '', ...m.entries.map(e => `- **${e.id} ${e.name}** (${e.group}): ${e.evidence}`), '',
    '## Preserved as printed (no change unless the PDF disagrees)', '', ...m.noChangeCandidates.map(n => `- **${n.id} ${n.record}** \`${n.token}\`: ${n.reason}`), '',
    '## Scan limits', '', m.scanLimits, ''].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const m = build();
  if (m.errors.length) { console.error('[3e5-defects] FAIL:\n  ' + m.errors.join('\n  ')); return 1; }
  const json = JSON.stringify(m, null, 2) + '\n', md = renderMd(m);
  if (argv.includes('--check')) {
    const bad = [];
    if (!fs.existsSync(path.join(ROOT, OUT_JSON)) || read(OUT_JSON) !== json) bad.push('manifest is stale');
    if (!fs.existsSync(path.join(ROOT, OUT_MD)) || read(OUT_MD) !== md) bad.push('markdown is stale');
    if (bad.length) { console.error('[3e5-defects] FAIL: ' + bad.join(' | ')); return 1; }
    console.log(`[3e5-defects] PASS: ${m.counts.defects} entries locate exactly in production and canonical`); return 0;
  }
  fs.writeFileSync(path.join(ROOT, OUT_JSON), json); fs.writeFileSync(path.join(ROOT, OUT_MD), md);
  console.log(JSON.stringify(m.counts)); return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());

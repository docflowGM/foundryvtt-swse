#!/usr/bin/env node
/**
 * Phase 3E-5a — finite canonical text-defect manifest (read-only; never writes a pack).
 *
 * The defect universe is this explicit list. Heuristic scans only NOMINATE candidates; only entries here can ever be applied,
 * and only once verification.status is PDF_VERIFIED (owner rendered-PDF pass) with the printed wording recorded.
 * Two action kinds:
 *   REPLACE_TOKEN   exact find -> replace inside the listed fields (each must occur exactly once per field)
 *   REPLACE_FIELDS  whole-field replacement from the printed page (adjacent-section bleed, multi-token damage)
 * plus NO_CHANGE (PDF confirms the printed form) and PDF_REQUIRED nominations (second wave, never applied unverified).
 *
 *   node tools/build-talent-phase-3e5-defect-manifest.mjs           write data/audits/talent-phase-3e5-text-defect-manifest.json + docs
 *   node tools/build-talent-phase-3e5-defect-manifest.mjs --check   committed artifacts are current (pre-repair: re-derived from the pack;
 *                                                                   post-repair: every verified `after` value holds)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCommittedManifests, gitBlobSha } from './apply-talent-phase-3c.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/talent-phase-3e5-text-defect-manifest.json';
export const OUT_MD = 'docs/audits/talent-phase-3e5-text-defect-manifest.md';
export const FIELDS = ['prerequisites', 'benefit', 'description', 'summary'];
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ndjson = rel => read(rel).split('\n').filter(Boolean).map(JSON.parse);

const V = (basis, printedText) => ({ status: 'PDF_VERIFIED', verifiedBy: 'project owner, rendered-PDF pass', basis, printedText });
const PENDING = basis => ({ status: 'PDF_REQUIRED', verifiedBy: null, basis, printedText: null });
const HALF = { group: 'OCR_CONFUSABLE_LETTER', find: 'haIf', replace: 'half', confidence: 'CERTAIN', evidence: 'capital "I" read for lowercase "l"; printed "one-half"' };
const WD = 'Each time you are attacked, the opponent that attacked you takes a -2 morale penalty to its Will Defense until the end of your next turn. This penalty is not cumulative, so if a target makes multiple attacks against you it only incurs the penalty once per turn.';
const ST = `Choose a talent that you already possess. The talent must be from the Lightsaber Combat talent tree, the Duelist talent tree, or the Lightsaber Forms talent tree. Once per day as a standard action, you can spend a Force Point to impart the benefits of the chosen talent to one or more allies, effectively granting them the talent (even if they don't meet the prerequisites). An ally must be within 12 squares of you and must be able to see and hear you to gain the talent; once gained, its benefits last until the end of the encounter.\n\nYou can share the talent with a number of allies equal to one-half your class level, rounded down. Only allies who are trained in the Use the Force skill can gain the benefits of the shared talent.\n\nYou can take this talent multiple times. Each time you do so, you must select a different talent to share with this ability. You can share each talent with your allies only once per day.`;
const VE = 'Once per encounter, your guardian spirit offers you vital encouragement, urging you to press on despite adversity. As a free action, you gain bonus hit points equal to 10 + one-half your heroic level. Damage is subtracted from bonus hit points first, and any bonus hit points remaining at the end of the encounter are lost.';
const HM = 'If you aim before making a ranged attack (see Aim, page 154), you move the target -1 step along the condition track if the attack hits (see Conditions, page 148).';
// The corpus summary is the first clause with parentheticals dropped; the damaged one ("ranged attack , ... hits .") is repaired from the printed sentence.
const HM_SUMMARY = 'If you aim before making a ranged attack, you move the target -1 step along the condition track if the attack hits.';

const RN = 'When haggling over the price of a bounty (see the Persuasion skill, page 71), you can reroll your Persuasion check and keep the better result.';
const RN_SUMMARY = 'When haggling over the price of a bounty, you can reroll your Persuasion check and keep the better result.';
/** The finite list. fields = the record fields the edit may touch. */
export const DEFECTS = [
  { id: 'TD-01', record: 'Cover Fire', action: 'REPLACE_TOKEN', fields: ['prerequisites'], group: 'OCR_DEFECT_IN_NAME_REFERENCE', find: 'Battie Analysis', replace: 'Battle Analysis', confidence: 'CERTAIN', evidence: 'the prerequisite is the Clone Wars talent "Battle Analysis" (CWCG TXT 14172/15054/18359)', verification: V('PDF ruling: confirmed', 'Battle Analysis') },
  { id: 'TD-02', record: 'Primitive Block', action: 'REPLACE_TOKEN', fields: ['prerequisites'], group: 'OCR_DEFECT_IN_NAME_REFERENCE', find: 'Enpower Weapon', replace: 'Empower Weapon', confidence: 'CERTAIN', evidence: 'the prerequisite is the Core talent "Empower Weapon" (Core TXT 20357)', verification: V('PDF ruling: confirmed', 'Empower Weapon') },
  { id: 'TD-03', record: 'Relentless', action: 'REPLACE_TOKEN', fields: ['prerequisites'], group: 'STRAY_OCR_FRAGMENT', find: "Hunter's Target. P", replace: "Hunter's Target.", confidence: 'CERTAIN', evidence: 'Core TXT 19703 carries a stray "P"', verification: V('PDF ruling: printed prerequisite is "Hunter\'s Mark, Hunter\'s Target."; the P is stray OCR', "Hunter's Mark, Hunter's Target.") },
  { id: 'TD-04', record: 'Shift Defense I', action: 'REPLACE_TOKEN', fields: ['prerequisites'], group: 'MISATTACHED_PREREQUISITE', find: 'Shift Defense 1, Shift Defense Il', replace: '', confidence: 'CERTAIN', evidence: 'Core TXT 21224 prints no prerequisite for tier I; the string belongs to Shift Defense III (TXT 21240)', verification: V('PDF ruling: no prerequisite is printed at all; remove it entirely', '') },
  { id: 'TD-05', record: "Hunter's Mark", action: 'REPLACE_FIELDS', fields: ['benefit', 'description', 'summary'], group: 'MULTI_TOKEN_OCR_DAMAGE', confidence: 'CERTAIN', evidence: 'three defects: missing "a", "you 4 target" -> "you move the target", "ateam" -> "attack"; the derived summary carried the same damage plus parenthetical-removal spacing', after: { benefit: HM, description: HM, summary: HM_SUMMARY }, verification: V('PDF transcription, Core p.208', HM) },
  { id: 'TD-06', record: 'Wrong Decision', action: 'REPLACE_FIELDS', fields: ['benefit', 'description'], group: 'ADJACENT_SECTION_OCR_BLEED', confidence: 'CERTAIN', evidence: 'KOTOR p.43: the "Executive Leadership" block is the next heading (a corporate-agent class feature), not part of Wrong Decision. Supersedes the former token fixes TD-06/TD-07 (aswift, theirspeed), which were inside the bled block.', after: { benefit: WD, description: WD }, verification: V('PDF ruling, KOTOR p.43: the talent ends before "Executive Leadership"', WD) },
  { id: 'TD-08', record: 'Drain Force', action: 'REPLACE_TOKEN', fields: ['benefit', 'description', 'summary'], group: 'OCR_LOST_HYPHEN', find: 'Forcesensitive', replace: 'Force-sensitive', confidence: 'CERTAIN', evidence: 'the books print "Force-sensitive"', verification: V('PDF ruling: confirmed (KOTOR p.40)', 'Force-sensitive') },
  { id: 'TD-18', record: 'Drain Force', action: 'REPLACE_TOKEN', fields: ['benefit', 'description', 'summary'], group: 'OCR_LETTER_DROP', find: 'covert it', replace: 'convert it', confidence: 'CERTAIN', evidence: 'missed by the token scan; "sap ... strength and convert it to personal power"', verification: V('PDF ruling, KOTOR p.40: "convert it to personal power"', 'convert it') },
  { id: 'TD-09', record: 'Difficult to Sense', action: 'REPLACE_TOKEN', fields: ['benefit', 'description'], group: 'OCR_LOST_HYPHEN', find: 'Forceusers', replace: 'Force-users', confidence: 'CERTAIN', evidence: 'LECG TXT 3598/3602 prints "Force-users"', verification: V('PDF ruling: confirmed', 'Force-users') },
  ...[['TD-10', 'Bring Them Back', ['benefit', 'description', 'summary']], ['TD-11', 'Hotwired Processor', ['benefit', 'description']], ['TD-12', 'Influential Friends', ['benefit', 'description']], ['TD-13', 'Power Boost', ['benefit', 'description']], ['TD-14', 'Power Surge', ['benefit', 'description']]]
    .map(([id, record, fields]) => ({ id, record, action: 'REPLACE_TOKEN', fields, ...HALF, verification: V('PDF ruling: "one-half" confirmed', 'half') })),
  { id: 'TD-15', record: 'Share Talent', action: 'REPLACE_FIELDS', fields: ['benefit', 'description'], group: 'MULTI_TOKEN_OCR_DAMAGE', confidence: 'CERTAIN', evidence: 'JATM p.20: "Lightsa-ber", "Duel-ist", comma where a period belongs, illustration caption "A Twi\'Ler Jeo! INsTRUCTOR.", "one-haIf", paragraphs flattened. The prerequisite already matches print apart from its terminal period and is left unchanged.', after: { benefit: ST, description: ST }, verification: V('PDF transcription, JATM p.20', ST) },
  { id: 'TD-16', record: 'Vital Encouragement', action: 'REPLACE_FIELDS', fields: ['benefit', 'description'], group: 'ADJACENT_SECTION_OCR_BLEED', confidence: 'CERTAIN', evidence: 'JATM p.17: "New Sense Talents The following talents belong to the Sense talent tree..." is the next section; "one-haIf" also repaired', after: { benefit: VE, description: VE }, verification: V('PDF transcription, JATM p.17', VE) },
  { id: 'TD-19', record: 'Seyugi Cyclone', action: 'REPLACE_TOKEN', fields: ['benefit', 'description', 'summary'], group: 'OCR_LETTER_DROP', find: 'posess', replace: 'possess', confidence: 'CERTAIN', evidence: 'the TXT "posess" is itself OCR damage (promoted from the former NC-01)', verification: V('PDF ruling, JATM p.83: "...even if you do not possess the Whirlwind Attack feat."', 'possess') },
  // --- second wave: nominated by the widened symbol/stray-character scan AFTER the first PDF pass; PDF-verified by the owner's second pass ---
  { id: 'TD-20', record: 'Ruthless Negotiator', action: 'REPLACE_FIELDS', fields: ['benefit', 'description', 'summary'], group: 'MULTI_TOKEN_OCR_DAMAGE', confidence: 'CERTAIN', evidence: 'production: "haggling over te price @ bounty ... reroll Persuasion check"; the derived summary carried the same damage', after: { benefit: RN, description: RN, summary: RN_SUMMARY }, verification: V('PDF transcription, Core p.208 (prerequisite "Notorious." already matches)', RN) },
  { id: 'TD-21', record: 'Turret Self-Destruct', action: 'REPLACE_TOKEN', fields: ['benefit', 'description'], group: 'OCR_PUNCTUATION', find: 'damage.!f you', replace: 'damage. If you', confidence: 'CERTAIN', evidence: '"!f" for "If" with the space lost', verification: V('PDF ruling, FUCG p.57: "...dealing its normal damage. If you are adjacent to the turret..."', 'damage. If you') },
  { id: 'TD-22', record: 'Psychic Defenses', action: 'REPLACE_TOKEN', fields: ['benefit', 'description', 'summary'], group: 'NUMERIC_OCR_DAMAGE', find: '146 x your Wisdom modifier', replace: '1d6 x your Wisdom modifier', confidence: 'CERTAIN', evidence: 'the damage die "1d6" was read as "146" (the TXT has the same damage, JATM TXT 1556)', verification: V('PDF ruling, JATM p.18: "Force damage equal to 1d6 x your Wisdom modifier (minimum x1)"', '1d6 x your Wisdom modifier') },
  { id: 'TD-23', record: 'Influence Savant', action: 'REPLACE_TOKEN', fields: ['benefit', 'description', 'summary'], group: 'STRAY_OCR_FRAGMENT', find: '\u2018one Force power', replace: 'one Force power', confidence: 'CERTAIN', evidence: 'stray opening quote before "one"', verification: V('PDF ruling, JATM p.15: no opening quote', 'one Force power') },
  { id: 'TD-24', record: 'Scomp Link Slicer', action: 'REPLACE_TOKEN', fields: ['benefit', 'description'], group: 'BULLET_GLYPH_OCR', find: 'e Eradicate:', replace: '\u2022 Eradicate:', confidence: 'CERTAIN', evidence: 'printed round bullet read as the letter "e"', verification: V('PDF ruling, Scavenger\'s Guide p.26/27: ordinary printed bullet', '\u2022 Eradicate:') },
  { id: 'TD-24b', record: 'Scomp Link Slicer', action: 'REPLACE_TOKEN', fields: ['benefit', 'description'], group: 'BULLET_GLYPH_OCR', find: '\u00a2 Lockout:', replace: '\u2022 Lockout:', confidence: 'CERTAIN', evidence: 'printed round bullet read as "\u00a2"', verification: V('PDF ruling, Scavenger\'s Guide p.26/27: ordinary printed bullet', '\u2022 Lockout:') },
  { id: 'TD-24c', record: 'Scomp Link Slicer', action: 'REPLACE_TOKEN', fields: ['benefit', 'description'], group: 'BULLET_GLYPH_OCR', find: '\u00a9 Untraceable:', replace: '\u2022 Untraceable:', confidence: 'CERTAIN', evidence: 'printed round bullet read as "\u00a9"', verification: V('PDF ruling, Scavenger\'s Guide p.26/27: ordinary printed bullet', '\u2022 Untraceable:') },
  { id: 'TD-25', record: 'Supervising Droid', action: 'REPLACE_TOKEN', fields: ['benefit', 'description'], group: 'BULLET_GLYPH_OCR', find: '\u00a9 Combat Support:', replace: '\u2022 Combat Support:', confidence: 'CERTAIN', evidence: 'printed round bullet read as "\u00a9"', verification: V('PDF ruling, Scavenger\'s Guide p.26/27: ordinary printed bullet', '\u2022 Combat Support:') },
  { id: 'TD-25b', record: 'Supervising Droid', action: 'REPLACE_TOKEN', fields: ['benefit', 'description'], group: 'BULLET_GLYPH_OCR', find: 'e Director:', replace: '\u2022 Director:', confidence: 'CERTAIN', evidence: 'printed round bullet read as the letter "e"', verification: V('PDF ruling, Scavenger\'s Guide p.26/27: ordinary printed bullet', '\u2022 Director:') },
  { id: 'TD-25c', record: 'Supervising Droid', action: 'REPLACE_TOKEN', fields: ['benefit', 'description'], group: 'BULLET_GLYPH_OCR', find: 'e Instant Action:', replace: '\u2022 Instant Action:', confidence: 'CERTAIN', evidence: 'printed round bullet read as the letter "e"', verification: V('PDF ruling, Scavenger\'s Guide p.26/27: ordinary printed bullet', '\u2022 Instant Action:') },
  { id: 'TD-26', record: 'Squad Brutality', action: 'REPLACE_TOKEN', fields: ['benefit', 'description'], group: 'STRAY_OCR_FRAGMENT', find: 'better result. ,', replace: 'better result.', confidence: 'CERTAIN', evidence: 'trailing stray comma after the final period', verification: V('PDF ruling, Legacy p.31: the sentence ends at "taking the better result."', 'better result.') }
];
export const NO_CHANGE = [
  { id: 'TD-17', record: 'Sidestep', token: 'to 1 until', reason: 'PDF ruling: exactly as printed (Scum and Villainy p.17); prerequisite Long Stride' },
  { id: 'NC-02', record: 'Malkite Techniques', token: 'nonenergy', reason: 'PDF ruling: printed exactly' },
  { id: 'NC-03', record: 'Disarm and Engage', token: 'nonproficiency', reason: 'PDF ruling: printed exactly' },
  { id: 'NC-04', record: 'Done It All', token: 'nonprestige', reason: 'PDF ruling: printed exactly' },
  { id: 'NC-05', record: 'Ambush', token: 'nonsurprised', reason: 'PDF ruling: printed exactly' },
  { id: 'NC-06', record: 'Two-Faced', token: 'Nonthreatening', reason: 'PDF ruling: printed option label "Nonthreatening:"' }
];

/** Field accessors. description may be a plain string (157 canonical-pack records) or {value}. */
export const getField = (t, f) => f === 'description' ? ((t.system.description && typeof t.system.description === 'object') ? t.system.description.value : t.system.description) : t.system[f];
export function setField(t, f, v) {
  if (f === 'description') { if (t.system.description && typeof t.system.description === 'object') t.system.description.value = v; else t.system.description = v; } else t.system[f] = v;
}
const count = (s, needle) => (String(s ?? '').split(needle).length - 1);
export const verified = e => e.verification.status === 'PDF_VERIFIED';

/** Apply the PDF_VERIFIED entries for one record, in id order, to a text-field map; returns the new map and asserts every precondition. */
export function projectRecord(fieldsBefore, entries, errors = [], tag = '') {
  const cur = { ...fieldsBefore };
  for (const e of entries.filter(verified).sort((a, b) => a.id.localeCompare(b.id))) {
    for (const f of e.fields) {
      if (e.action === 'REPLACE_FIELDS') {
        if (cur[f] === e.after[f]) continue;
        if (e.before && cur[f] !== e.before[f]) { errors.push(`${tag}${e.id}.${f}: current text is not the certified pre-repair text`); continue; }
        cur[f] = e.after[f];
      } else {
        if (cur[f] === undefined || cur[f] === null) { errors.push(`${tag}${e.id}.${f}: field absent`); continue; }
        if (count(cur[f], e.find) === 0 && count(cur[f], e.replace) > 0 && e.replace !== '') continue; // already applied
        if (e.replace === '' && count(cur[f], e.find) === 0) continue;
        if (count(cur[f], e.find) !== 1) { errors.push(`${tag}${e.id}.${f}: "${e.find}" occurs ${count(cur[f], e.find)}x`); continue; }
        cur[f] = cur[f].replace(e.find, e.replace);
      }
    }
  }
  return cur;
}

export function build() {
  const packText = read('packs/talents.db'), prod = packText.split('\n').filter(Boolean).map(JSON.parse), canon = JSON.parse(read('data/canonical/talents.json')).records;
  const idOf = new Map();
  for (const { manifest } of loadCommittedManifests()) for (const r of manifest.records) { const i = r.identityResolution; idOf.set(r.canonicalIdentity, i.productionRecordId || i.createRecordId); }
  const canonByProd = new Map(canon.map(r => [idOf.get(r.canonicalIdentity), r]));
  const errors = [];
  // After the certified repair the pack no longer holds the pre-repair text: the committed manifest's frozen `before` snapshot and
  // pre-state blob are authoritative (same contract as 3E-4). Before the repair they are re-derived from the pack.
  const committed = fs.existsSync(path.join(ROOT, OUT_JSON)) ? JSON.parse(read(OUT_JSON)) : null;
  const frozen = !!committed && committed.preState?.talents && committed.preState.talents !== gitBlobSha(packText);
  const entries = DEFECTS.map(d => {
    const ps = prod.filter(t => t.name === d.record);
    if (ps.length !== 1) { errors.push(`${d.id}: ${ps.length} production records named ${d.record}`); return null; }
    const p = ps[0], c = canonByProd.get(p._id);
    const e = { id: d.id, productionId: p._id, name: d.record, canonicalIdentity: c?.canonicalIdentity, publication: { sourcebook: p.system.source, page: p.system.page }, group: d.group, action: d.action, confidence: d.confidence, evidence: d.evidence, fields: d.fields, verification: d.verification };
    if (d.action === 'REPLACE_TOKEN') { e.find = d.find; e.replace = d.replace; }
    else { e.after = d.after; e.before = frozen ? committed.entries.find(x => x.id === d.id)?.before : Object.fromEntries(d.fields.map(f => [f, getField(p, f)])); }
    // locate in the certified canonical corpus too (canonical is immutable, so this stays true after the repair)
    if (d.action === 'REPLACE_TOKEN') for (const f of d.fields) {
      if (c && count(c[f], d.find) !== 1) errors.push(`${d.id}: "${d.find}" occurs ${count(c[f], d.find)}x in canonical ${d.record}.${f}`);
    }
    return e;
  }).filter(Boolean);
  const noChange = NO_CHANGE.map(n => { const p = prod.find(t => t.name === n.record); return { ...n, productionId: p?._id, publication: { sourcebook: p?.system.source, page: p?.system.page }, action: 'NO_CHANGE', verification: { status: 'PDF_VERIFIED', verifiedBy: 'project owner, rendered-PDF pass' } }; });
  const ver = entries.filter(verified), pend = entries.filter(e => !verified(e));
  return {
    schemaVersion: 1, phase: '3E-5a', status: 'DEFECT_MANIFEST_PDF_VERIFIED', productionMutationPerformed: false,
    rule: 'Finite list. Scans nominate; only PDF_VERIFIED entries here can ever be applied, and only through a manifest -> dry-run -> apply -> verify unit.',
    scansUsed: ['rare-token scan of canonical text (3E-2b)', 'OCR-confusable scan (mid-word capitals, Il/1I, stray ". P")', 'stray-digit-in-sentence scan', 'symbol / stray-character / stray-punctuation scan (second wave, PDF-verified by the owner)', 'adjacent-section bleed found only by the rendered-PDF pass'],
    scanLimits: 'Heuristic scans cannot prove absence of damage. The first PDF pass showed a token scan misses whole-block defects (section bleed, caption contamination); a full-text PDF comparison of all 1,187 records is outside 3E and is the one thing that would certify text completeness.',
    preState: { talents: frozen ? committed.preState.talents : gitBlobSha(packText) },
    counts: { entries: entries.length, pdfVerified: ver.length, pdfRequired: pend.length, recordsVerified: new Set(ver.map(e => e.productionId)).size, recordsPending: new Set(pend.map(e => e.productionId)).size, noChange: noChange.length, byAction: entries.reduce((o, e) => (o[e.action] = (o[e.action] || 0) + 1, o), {}) },
    entries, noChangeRulings: noChange, errors
  };
}

function renderMd(m) {
  const cell = v => v === null ? '**owner transcription**' : v === '' ? '*(remove)*' : '`' + String(v).replace(/\n/g, '⏎').slice(0, 70) + '`';
  const ver = m.entries.filter(verified), pend = m.entries.filter(e => !verified(e));
  return ['# Phase 3E-5a — Canonical text-defect manifest', '',
    'Read-only. Generator: `node tools/build-talent-phase-3e5-defect-manifest.mjs` · data: `data/audits/talent-phase-3e5-text-defect-manifest.json`.', '', m.rule, '',
    `**${m.counts.pdfVerified} PDF-verified entries on ${m.counts.recordsVerified} records** (${Object.entries(m.counts.byAction).map(([k, v]) => `${k} ${v}`).join(', ')} overall); ${m.counts.pdfRequired ? `**${m.counts.pdfRequired} nominations on ${m.counts.recordsPending} records still await the PDF**;` : 'no nomination is outstanding;'} ${m.counts.noChange} scan candidates are PDF-confirmed as printed (no change).`, '',
    '## PDF-verified corrections (eligible for the 3E-5 dry-run)', '', '| ID | Record | Action | Field(s) | Class |', '|---|---|---|---|---|',
    ...ver.map(e => `| ${e.id} | ${e.name} (${e.publication.sourcebook} p.${e.publication.page}) | ${e.action} | ${e.fields.join(', ')} | ${e.group} |`), '',
    ...ver.map(e => `- **${e.id} ${e.name}:** ${e.evidence} — ${e.verification.basis}.`), '',
    '## Outstanding nominations (PDF_REQUIRED — never applied unverified)', '', '| ID | Record | Field(s) | Production has | Proposed | Conf. |', '|---|---|---|---|---|---|',
    ...pend.map(e => `| ${e.id} | ${e.name} (${e.publication.sourcebook} p.${e.publication.page}) | ${e.fields.join(', ')} | ${cell(e.find ?? e.before?.benefit)} | ${cell(e.replace ?? null)} | ${e.confidence} |`), '',
    ...pend.map(e => `- **${e.id} ${e.name}:** ${e.evidence}`), '',
    '## PDF-confirmed as printed (no change)', '', ...m.noChangeRulings.map(n => `- **${n.id} ${n.record}** \`${n.token}\`: ${n.reason}`), '',
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
    console.log(`[3e5-defects] PASS: ${m.counts.pdfVerified} verified + ${m.counts.pdfRequired} pending entries locate exactly`); return 0;
  }
  fs.writeFileSync(path.join(ROOT, OUT_JSON), json); fs.writeFileSync(path.join(ROOT, OUT_MD), md);
  console.log(JSON.stringify(m.counts)); return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());

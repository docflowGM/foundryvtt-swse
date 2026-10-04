#!/usr/bin/env node
// Pass 3A evidence sweep: 19 canonical SWSE skills scanned across talent name + Benefit/description text (prerequisites are NOT scanned).
// Lexical evidence only. Every raw (talent, skill-tag) hit ends in a terminal Pass 3A state: owner-approved (an overlay addition),
// an owner-ruled non-skill disposition, or PASS3A_OWNER_REVIEW (not covered by any ruling; never mutated). Report-only; no writes except the two report files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, BASELINE_PATH, loadPack } from './build-talent-feat-pass3a-baseline.mjs';

export const OVERLAY_PATH = 'data/audits/talent-feat-pass3a-skill-owner-adjudication.json';
export const SWEEP_JSON = 'data/audits/talent-feat-pass3a-skill-sweep.json';
export const SWEEP_MD = 'docs/audits/talent-feat-pass3a-skill-sweep.md';
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// 19 canonical SWSE skills. Acrobatics also matches balance/balancing (substring) because the owner-reviewed scan did; Unbalancing Adaptation is the known false positive.
export const SKILLS = [
  ['Acrobatics', /\bacrobatics\b|balanc(?:e|ing)/i, 'acrobatics'], ['Climb', /\bclimb(?:ing)?\b/i, 'climb'], ['Deception', /\bdeception\b/i, 'deception'],
  ['Endurance', /\bendurance\b/i, 'endurance'], ['Gather Information', /\bgather information\b/i, 'gather_information'], ['Initiative', /\binitiative\b/i, 'initiative'],
  ['Jump', /\bjump(?:ing)?\b/i, 'jump'], ['Knowledge', /\bknowledge\b/i, 'knowledge'], ['Mechanics', /\bmechanics\b/i, 'mechanics'], ['Perception', /\bperception\b/i, 'perception'],
  ['Persuasion', /\bpersuasion\b/i, 'persuasion'], ['Pilot', /\bpilot\b/i, 'pilot'], ['Ride', /\bride\b/i, 'ride'], ['Stealth', /\bstealth\b/i, 'stealth'],
  ['Survival', /\bsurvival\b/i, 'survival'], ['Swim', /\bswim(?:ming)?\b/i, 'swim'], ['Treat Injury', /\btreat injury\b/i, 'treat_injury'],
  ['Use Computer', /\buse computer\b/i, 'use_computer'], ['Use the Force', /\buse the force\b/i, 'use_the_force']
];
// Source-text hyphenation artifacts (for example "Acro-batics", "Use Com-puter") are normalized for the DETECTOR only; canonical text is never rewritten.
const dehyphenate = (t) => t.replace(/(\w)-\s*(\w)/g, '$1$2');
const excerpt = (text, re) => {
  const m = re.exec(text); if (!m) return null;
  const s = Math.max(0, m.index - 90), e = Math.min(text.length, m.index + m[0].length + 90);
  return (s ? '…' : '') + text.slice(s, e).replace(/\s+/g, ' ').trim() + (e < text.length ? '…' : '');
};

// Tooling notes for PASS3A_OWNER_REVIEW items. These are NOT rulings: they restate why the scanner fired and give a mechanical reading
// plus any equivalent feat-side pattern, so the owner can decide. A review item with no note here is reported with null notes.
export const REVIEW_NOTES = {
  '06ab0e40780ea63d|knowledge': { scannerReason: 'The talent NAME "Knowledge and Defense" contains the word Knowledge; the Benefit text does not mention the skill.', interpretation: 'Benefit adds the Wisdom bonus to Reflex Defense when Dexterity would be denied. No Knowledge check is made, modified or gated. Reads as a name-only text match.', featSideEquivalent: 'Feat-side `knowledge` is used only where a Knowledge check or substitution is mechanically involved (for example Cut the Red Tape, Mind of Reason); no name-only precedent was tagged.' },
  '62d461ae3b0fcfa9|use_the_force': { scannerReason: 'Benefit text contains "Use the Force check".', interpretation: 'Benefit changes how the Use the Force check made for move object is resolved: it is compared to the Reflex Defense of every creature in an area. This reads as a direct Use the Force interaction comparable to the approved Telekinetic Power / Wrath of the Dark Side class, so `use_the_force` (with the already-present `force`) looks like a true positive. Not applied; owner decides.', featSideEquivalent: 'Feat-side `use_the_force` is carried by feats that directly modify or oppose a Use the Force check (for example Force Sensitivity, Unstoppable Force).' },
  'd26506bfba104470|acrobatics': { scannerReason: 'The acrobatics pattern matches the substring "balanc" in "bank balances".', interpretation: 'Ordinary English ("bank balances"); no Acrobatics mechanic. Reads as a text match, not a skill. (The separately approved gather_information addition on this record is unaffected.)', featSideEquivalent: 'None.' },
  'df6c20e602190daa|ride': { scannerReason: 'The talent NAME "Ride the Current" contains the word Ride; the Benefit text does not mention the skill.', interpretation: 'Benefit is a Force Point reaction granting total concealment and an immediate second wind. No Ride check is involved. Reads as a name-only text match.', featSideEquivalent: 'Feat-side `ride` is used only for mounted-riding mechanics (Mounted Combat, Trample).' },
  'e293cb03d35c2bff|acrobatics': { scannerReason: 'The acrobatics pattern matches the substring "balanc" in "off balance" and the name "Unbalance Opponent".', interpretation: 'Ordinary English ("off balance"); the Benefit removes the designated opponent\'s Strength bonus on attacks against the user. No Acrobatics check. Reads as a text match, the same pattern already ruled for Unbalancing Adaptation.', featSideEquivalent: 'None.' }
};

export function sweep(pack, baseline, overlay) {
  const baseTags = new Map(baseline.records.map(r => [r.canonicalId, r.tags]));
  const approved = new Map();
  for (const a of overlay.additions) for (const t of a.add) approved.set(`${a.canonicalId}|${t}`, a);
  const ruled = new Map(overlay.dispositions.map(d => [`${d.canonicalId}|${d.tag}`, d]));
  const findings = [];
  for (const r of pack.recs) {
    const tags = new Set(baseTags.get(r._id));
    const text = [r.name, r.system.benefit || '', r.system.description?.value || ''].join(' ');
    const texts = [text, dehyphenate(text)];
    for (const [skill, re, tag] of SKILLS) {
      if (tags.has(tag)) continue;
      const hitText = texts.find(t => re.test(t));
      if (!hitText) continue;
      const key = `${r._id}|${tag}`;
      let state, ruling = null;
      if (approved.has(key)) { state = 'PASS3A_OWNER_APPROVED'; ruling = approved.get(key).reason; }
      else if (ruled.has(key)) { state = ruled.get(key).state; ruling = ruled.get(key).reason; }
      else state = 'PASS3A_OWNER_REVIEW';
      const f = { canonicalId: r._id, name: r.name, source: r.system.source ?? null, page: r.system.page ?? null, skill, tag, state, ownerRuling: ruling,
        excerpt: excerpt(hitText, re), existingTags: [...baseTags.get(r._id)], matchedIn: re.test(r.name) ? 'name+text' : 'text' };
      if (state === 'PASS3A_OWNER_REVIEW') { f.canonicalBenefit = r.system.benefit ?? null; f.reviewNotes = REVIEW_NOTES[key] ?? null; }
      findings.push(f);
    }
  }
  findings.sort((x, y) => cmp(x.canonicalId, y.canonicalId) || cmp(x.tag, y.tag));
  // Overlay rulings with no scanner hit (kept visible so no ruling is silently unused).
  const hitKeys = new Set(findings.map(f => `${f.canonicalId}|${f.tag}`));
  const approvedNoHit = [...approved.keys()].filter(k => !hitKeys.has(k)).sort();
  const dispositionNoHit = [...ruled.keys()].filter(k => !hitKeys.has(k)).sort();
  const byState = {};
  for (const f of findings) byState[f.state] = (byState[f.state] || 0) + 1;
  return { findings, approvedNoHit, dispositionNoHit, counts: { rawHits: findings.length, uniqueTalents: new Set(findings.map(f => f.canonicalId)).size, byState } };
}

function render(rep) {
  const L = ['# Talent/Feat Pass 3A — Skill Completeness Evidence Sweep (report-only)', '',
    `19 canonical skills scanned across talent name + Benefit/description text (prerequisites excluded) against the Pass 3A baseline. Lexical evidence only; every raw hit ends in a terminal state.`, '',
    `- Raw hits: **${rep.counts.rawHits}** across **${rep.counts.uniqueTalents}** unique talents (certified count; the earlier owner checkpoint said 117 / 98, which was a non-reproducible counting error corrected in the overlay).`,
    ...Object.entries(rep.counts.byState).sort().map(([k, v]) => `- ${k}: ${v}`), '',
    `Overlay rulings without a scanner hit: ${rep.approvedNoHit.length} approved additions, ${rep.dispositionNoHit.length} dispositions.`, ''];
  const rv = rep.findings.filter(f => f.state === 'PASS3A_OWNER_REVIEW');
  if (rv.length) {
    L.push('## Residual owner review detail', '', 'Tooling notes below are NOT rulings. Nothing here was mutated.', '');
    for (const f of rv) L.push(`### ${f.name} — \`${f.tag}\``, '', `- Canonical ID: \`${f.canonicalId}\`; source: ${f.source ?? '—'} p.${f.page ?? '—'}`, `- Existing tags: ${f.existingTags.map(t => `\`${t}\``).join(', ')}`, `- Benefit: ${f.canonicalBenefit}`, `- Why flagged: ${f.reviewNotes?.scannerReason ?? '—'}`, `- Mechanical reading: ${f.reviewNotes?.interpretation ?? '—'}`, `- Feat-side equivalent: ${f.reviewNotes?.featSideEquivalent ?? '—'}`, '');
  }
  for (const state of ['PASS3A_OWNER_REVIEW', 'PASS3A_OWNER_APPROVED', 'PASS3A_FALSE_POSITIVE', 'PASS3A_INTENTIONAL_GENERIC_SKILL', 'PASS3A_ROLE_NOT_SKILL', 'PASS3A_TEXT_MATCH_NOT_SKILL']) {
    const rows = rep.findings.filter(f => f.state === state);
    if (!rows.length) continue;
    L.push(`## ${state} (${rows.length})`, '', '| Talent | ID | Source p. | Tag | Excerpt |', '| --- | --- | --- | --- | --- |', ...rows.map(f => `| ${f.name} | \`${f.canonicalId}\` | ${f.source ?? '—'} ${f.page ?? ''} | \`${f.tag}\` | ${String(f.excerpt).replace(/\|/g, '\\|')} |`), '');
  }
  return L.join('\n');
}

export function buildReport() {
  const pack = loadPack(), baseline = readJson(BASELINE_PATH), overlay = readJson(OVERLAY_PATH);
  const s = sweep(pack, baseline, overlay);
  const rep = { schemaVersion: '1.0', kind: 'TALENT_FEAT_PASS3A_SKILL_SWEEP', status: 'REPORT_ONLY_EVIDENCE', baseline: BASELINE_PATH, overlay: OVERLAY_PATH,
    scope: 'talent name + system.benefit + system.description.value; prerequisites excluded; detector-only dehyphenation', lexicon: SKILLS.map(([skill, re, tag]) => ({ skill, tag, pattern: re.source })), ...s };
  return { rep, json: JSON.stringify(rep, null, 2) + '\n', md: render(rep) };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildReport();
  fs.writeFileSync(path.join(ROOT, SWEEP_JSON), out.json);
  fs.writeFileSync(path.join(ROOT, SWEEP_MD), out.md);
  const c = out.rep.counts;
  console.log(`PASS 3A SKILL SWEEP: ${c.rawHits} raw hits across ${c.uniqueTalents} talents; ${Object.entries(c.byState).map(([k, v]) => `${k}=${v}`).join(', ')}`);
}

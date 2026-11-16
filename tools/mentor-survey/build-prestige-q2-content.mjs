#!/usr/bin/env node
/**
 * Build data/mentor-survey/prestige-q2.json (Prestige Q2 "The Achievement", owner ruling MSV-RD-014).
 *   node tools/mentor-survey/build-prestige-q2-content.mjs --source <dir with SWSE_Prestige_Survey_Q2_Character_Synthesis.md>
 *
 * Composition (no new scorer, no 1,293 bespoke banks): answer A-D = shared strength stem (the first sentence of the multiclass
 * Q2 library, identical across destinations, verbatim) + a per-class connective sentence; E/F are alternative emphasis and
 * undecided. Mentor introduction and question per class are extracted verbatim from the Q2 design. Everything is draft_text.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLines, writeJson, fail } from './lib.mjs';
import { connectiveSentence, CONNECTIVE, PRESTIGE_E, PRESTIGE_F } from './prestige-q2-connectives.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const src = args[args.indexOf('--source') + 1];
if (!src) fail('--source <dir> is required');
const COMMIT = '228a7dc01e75d926728b7f015cac4ec66bdd15b7'; const FILE = 'SWSE_Prestige_Survey_Q2_Character_Synthesis.md';
const lines = readLines(path.join(src, FILE));
const classes = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mentor-survey/prestige.json'), 'utf8')).classes);
const mc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mentor-survey/multiclass-q2.json'), 'utf8'));
const ref = (line, anchor) => ({ commit: COMMIT, file: `docs/design/${FILE}`, line, ...(anchor ? { anchor } : {}) });
const strip = (t) => t.replace(/^>\s*/, '').replace(/^\*\*[^*]+:\*\*\s*/, '').replace(/^[“"]|[”"]$/g, '').trim();

/* stems: first sentence of the shared multiclass template, identical for all five destinations (checked) */
const stems = {};
for (const k of mc.keys) {
  const firsts = new Set(Object.values(mc.destinations).map((d) => d[k].text.split(/(?<=[.!?])\s+/)[0]));
  if (firsts.size !== 1) fail(`stem for ${k} is not shared across destinations`);
  stems[k] = { id: `pr.q2.stem.${k.toLowerCase()}`, biasKey: k, text: [...firsts][0], editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: { commit: mc._meta.sourceCommit, file: 'docs/design/SWSE_Multiclass_Survey_Rolling_Design.md', anchor: `Q2 library ${k} (shared first sentence)` } };
}

/* per-class intro and question from the Q2 design (same layouts the audit tool recognizes) */
const nameRes = classes.map((c) => ({ c, re: new RegExp(`\\b${c.className.replace(/ /g, '\\s+')}\\b`, 'i') }));
const found = Object.fromEntries(classes.map((c) => [c.classId, { intro: null, question: null }]));
let cur = null; let sub = ''; let seen = false;
lines.forEach((L, i) => {
  const h = /^(#{2,4}) (.*)$/.exec(L);
  if (h) { if (h[1] === '##') { const hit = nameRes.filter((n) => n.re.test(h[2])); cur = hit.length === 1 ? hit[0].c.classId : null; } sub = h[2]; seen = false; return; }
  if (!cur) return;
  const F = found[cur];
  if (!F.intro && !seen && /Q2.*(introduction|Mentor)|Mentor.*Q2|fixed.*introduction/i.test(sub) && /^(>\s*)?[“"A-Za-z<]/.test(L) && !/^\*\*/.test(L.replace(/^>\s*/, '')) && L.trim().length > 40) { seen = true; F.intro = { text: strip(L), line: i + 1, heading: sub }; }
  const qm = /^\*\*(Question|Q2 player question|Q2 question|Shared prompt|Shared Q2 prompt|Q2 prompt|Player question)[^*]*:\*\*\s*(.+)$/i.exec(L) || /^(Shared prompt):\s*(.+)$/.exec(L);
  if (!F.question && qm) F.question = { text: strip(qm[2]), line: i + 1, heading: sub };
});
const missing = classes.filter((c) => !found[c.classId].intro || !found[c.classId].question).map((c) => c.classId);
if (missing.length) fail(`intro or question not extracted for: ${missing.join(', ')}`);

const lens = { id: 'pr.q2.lens', text: 'Earlier you told me: {q1_quote}', editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: { origin: 'owner hardening 2026-11-16 (Q1 context lens for Q2); wording is a draft frame around the player\'s own words' } };
const pack = { _meta: { survey: 'prestige-q2', contentVersion: 1, sourceCommit: COMMIT, generatedBy: 'tools/mentor-survey/build-prestige-q2-content.mjs', counts: { classes: 32, stems: 125 }, note: 'All text is draft_text. Stems are the shared multiclass first sentences; connectives, E and F are owner-authorized drafts (MSV-RD-014).' }, keys: mc.keys, stems, lens, classes: {} };
for (const c of classes) {
  const F = found[c.classId];
  pack.classes[c.classId] = {
    intro: { id: `pr.${c.classId}.q2.intro`, text: F.intro.text, editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: ref(F.intro.line, F.intro.heading) },
    question: { id: `pr.${c.classId}.q2.question`, text: F.question.text, editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: ref(F.question.line, F.question.heading) },
    connective: { id: `pr.${c.classId}.q2.connective`, text: connectiveSentence(c.classId, c.className), editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: { origin: 'owner-authorized drafting pass (MSV-RD-014)', file: 'tools/mentor-survey/prestige-q2-connectives.mjs' } },
    alternative: { id: `pr.${c.classId}.q2.alt`, kind: 'alternative', text: PRESTIGE_E, editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: { commit: COMMIT, file: `docs/design/${FILE}`, anchor: 'section 3.2 items 6-7 (E alternative emphasis); wording adapted from the owner-approved multiclass E (MSV-RD-014)' } },
    undecided: { id: `pr.${c.classId}.q2.undecided`, kind: 'undecided', text: PRESTIGE_F, editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: { commit: COMMIT, file: `docs/design/${FILE}`, anchor: 'section 3.2 items 6-7 (F undecided); wording is the owner-approved multiclass F (MSV-RD-014)' } },
  };
}
if (Object.keys(CONNECTIVE).length !== 32) fail('connective sentences must cover 32 classes');
writeJson(path.join(ROOT, 'data/mentor-survey/prestige-q2.json'), pack);
console.log('wrote data/mentor-survey/prestige-q2.json', Object.keys(pack.classes).length);

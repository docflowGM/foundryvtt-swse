#!/usr/bin/env node
/**
 * Build data/mentor-survey/reflection-q6.json: the Q6 Mentor Reflection content for the five foundation-class Mentors.
 *
 *   node tools/mentor-survey/build-multiclass-q6-content.mjs --mc <dir with SWSE_Multiclass_Survey_Rolling_Design.md> --shared <dir with SWSE_Multiclass_Prestige_Survey_Rolling_Design.md>
 *
 * Verbatim import of: the five fixed Mentor Q6 frames (opening, closing, A-E reactions, D/E two-stage prompts), the 170
 * Pass A clause variants, the Pass B negative interpretation bank (10 claim kinds x 2), the 297 canonical self-identification
 * rows (validated against data/archetypes.json), the 18 free-standing affirmative statements, and the five shared A-E
 * player answers. Everything is draft_text: the shared answers are shown in the approved section as "examples", and no
 * line-level owner approval is recorded for the Mentor lines or libraries.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quoted, readLines, find, writeJson, fail } from './lib.mjs';
import { NEUTRAL } from './q6-neutral-frame.mjs';
import { methodPhraseOf } from '../../scripts/mentor/mentor-survey-v2/method-inference.js';
import { isFirstPerson } from '../../scripts/mentor/mentor-survey-v2/content-store.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MC_COMMIT = 'eb531a6b0fc5482edd62eedfea4dfebd312946ee'; const SH_COMMIT = '1d56ae4279c53fa2f1a7ead2c312b4ef73ec7e79';
const args = process.argv.slice(2); const arg = (k) => args[args.indexOf(k) + 1];
if (!arg('--mc') || !arg('--shared')) fail('--mc <dir> and --shared <dir> are required');
const L = readLines(path.join(arg('--mc'), 'SWSE_Multiclass_Survey_Rolling_Design.md'));
const SH = readLines(path.join(arg('--shared'), 'SWSE_Multiclass_Prestige_Survey_Rolling_Design.md'));
const MC_F = 'docs/design/SWSE_Multiclass_Survey_Rolling_Design.md'; const SH_F = 'docs/design/SWSE_Multiclass_Prestige_Survey_Rolling_Design.md';
const DEST = { Miraj: 'jedi', 'J0-N1': 'noble', "Ol' Salty": 'scoundrel', Lead: 'scout', Breach: 'soldier' };
const rec = (id, text, file, commit, anchor, extra = {}) => ({ id, text, editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: { commit, file, anchor }, ...extra });
const mc = (id, text, anchor, extra) => rec(id, text, MC_F, MC_COMMIT, anchor, extra);
const idx = (re, from = 0, lines = L) => { const i = find(lines, re, from); if (i < 0) fail(`not found: ${re}`); return i; };
const nextHead = (lines, from, re) => { const n = find(lines, re, from + 1); return n < 0 ? lines.length : n; };

/* ---------- fixed Mentor Q6 frames ---------- */
const frames = {};
const q6a = idx(/^### Q6 — The Mentor's Reflection$/); const q6aEnd = idx(/^### Characterization review/, q6a);
for (let i = q6a; i < q6aEnd; i++) {
  const h = /^#### (Miraj|Lead|Breach) — /.exec(L[i]); if (!h) continue;
  const end = nextHead(L, i, /^#### |^### /);
  const d = DEST[h[1]]; const f = { reactions: {} };
  const bq = (re) => { const k = find(L, re, i); if (k < 0 || k > end) fail(`Q6 ${h[1]}: ${re}`); const q = find(L, /^> /, k); return quoted(L[q]); };
  f.opening = mc(`mc.${d}.q6.opening`, bq(/^\*\*Opening\*\*$/), `Q6 ${h[1]} opening`, { speaker: 'mentor' });
  f.closing = mc(`mc.${d}.q6.closing`, bq(/^\*\*Closing\*\*$/), `Q6 ${h[1]} closing`, { speaker: 'mentor' });
  for (const k of ['A', 'B', 'C']) f.reactions[k] = mc(`mc.${d}.q6.react.${k}`, bq(new RegExp(`^\\*\\*${k} — `)), `Q6 ${h[1]} ${k}`, { speaker: 'mentor' });
  for (const k of ['D', 'E']) {
    const s = find(L, new RegExp(`^\\*\\*${k} — `), i);
    const s1 = /^- \*\*Stage 1 — What I am NOT:\*\* (.+)$/.exec(L[s + 2]); const s2 = /^- \*\*Stage 2 — What I AM:\*\* (.+)$/.exec(L[s + 3] ?? L[s + 4]);
    const lines2 = L.slice(s, s + 8); const st1 = lines2.find((x) => /Stage 1 — What I am NOT/.test(x)); const st2 = lines2.find((x) => /Stage 2 — What I AM/.test(x));
    if (!st1 || !st2) fail(`Q6 ${h[1]} ${k}: stages`);
    f.reactions[`${k}1`] = mc(`mc.${d}.q6.react.${k}1`, quoted(st1), `Q6 ${h[1]} ${k} stage 1`, { speaker: 'mentor' });
    f.reactions[`${k}2`] = mc(`mc.${d}.q6.react.${k}2`, quoted(st2), `Q6 ${h[1]} ${k} stage 2`, { speaker: 'mentor' });
  }
  frames[d] = f;
}
const q6b = idx(/^### Q6 — Mentor's Reflection \(fixed framing/); const q6bEnd = idx(/^### Editorial \/ implementation boundaries/, q6b);
for (let i = q6b; i < q6bEnd; i++) {
  const h = /^#### (J0-N1|Ol' Salty) — /.exec(L[i]); if (!h) continue;
  const end = nextHead(L, i, /^#### |^### /); const d = DEST[h[1]]; const f = { reactions: {} };
  const seg = L.slice(i, end);
  const line = (re) => { const x = seg.find((s) => re.test(s)); if (!x) fail(`Q6 ${h[1]}: ${re}`); return quoted(x); };
  f.opening = mc(`mc.${d}.q6.opening`, line(/^\*\*Opening:\*\*/), `Q6 ${h[1]} opening`, { speaker: 'mentor' });
  f.closing = mc(`mc.${d}.q6.closing`, line(/^\*\*Closing:\*\*/), `Q6 ${h[1]} closing`, { speaker: 'mentor' });
  const map = { A: /^- \*\*A — /, B: /^- \*\*B — /, C: /^- \*\*C — /, D1: /^- \*\*D — .*Stage 1/, D2: /^- \*\*D — Stage 2/, E1: /^- \*\*E — .*Stage 1/, E2: /^- \*\*E — Stage 2/ };
  for (const [k, re] of Object.entries(map)) f.reactions[k] = mc(`mc.${d}.q6.react.${k}`, line(re), `Q6 ${h[1]} ${k}`, { speaker: 'mentor' });
  frames[d] = f;
}
for (const d of Object.values(DEST)) if (!frames[d] || Object.keys(frames[d].reactions).length !== 7) fail(`Q6 frame incomplete for ${d}`);

/* ---------- Pass A clause library (170 variants) ---------- */
const FAM = [[/^\*\*Present identity: canonical parent archetype\*\*$/, 'identityParent'], [/^\*\*Present identity: canonical specialization\*\*$/, 'identitySpecialization'], [/^\*\*Unresolved identity/, 'unresolved'],
  [/^\*\*Verified owned evidence fact wrappers\*\*$/, 'evidence'], [/^\*\*Explicit long-term goal or known absence\*\*$/, 'goal'], [/^\*\*Evidence-grounded relation/, 'relation'], [/^\*\*Optional exact Q1 future-interest quotation/, 'q1quote']];
const SUB = { strong: 'strong', tentative: 'tentative', thin: 'thin', 'one verified fact(s)': 'one', 'two verified fact(s)': 'two', 'three verified fact(s)': 'three', declared: 'declared', unrecorded: 'unrecorded', supports: 'supports', complements: 'complements', diverges: 'diverges', unknown: 'unknown' };
const clauses = {}; let clauseCount = 0;
const pa = idx(/^### Complete authored dynamic clause library/); const paEnd = idx(/^### Pass A fictional render fixtures/, pa);
for (let i = pa; i < paEnd; i++) {
  const h = /^#### (Miraj|J0-N1|Ol' Salty|Lead|Breach) — /.exec(L[i]); if (!h) continue;
  const end = Math.min(nextHead(L, i, /^#### |^### /), paEnd); const d = DEST[h[1]]; const c = {};
  let fam = null; let sub = null;
  for (let j = i + 1; j < end; j++) {
    const t = L[j];
    const f = FAM.find(([re]) => re.test(t)); if (f) { fam = f[1]; sub = null; continue; }
    const s = /^\*(strong|tentative|thin|one verified fact\(s\)|two verified fact\(s\)|three verified fact\(s\)|declared|unrecorded|supports|complements|diverges|unknown)\*$/.exec(t); if (s) { sub = SUB[s[1]]; continue; }
    if (/^> /.test(t) && fam) {
      const key = sub ? `${fam}.${sub}` : fam;
      const arr = ((c[fam] ||= {}), sub ? ((c[fam][sub] ||= [])) : ((c[fam].all ||= [])));
      arr.push(mc(`mc.${d}.q6.clause.${key}.${arr.length + 1}`, t.replace(/^> /, '').trim(), `Pass A ${h[1]} ${key}`, { speaker: 'mentor' })); clauseCount++;
    }
  }
  clauses[d] = c;
}
if (clauseCount !== 170) fail(`Pass A: expected 170 clause variants, got ${clauseCount}`);

/* ---------- Pass B ---------- */
const NEG_KINDS = ['archetype_parent', 'archetype_specialization', 'role_inference', 'method_preference', 'mechanical_theme_identity', 'past_to_present_trend', 'goal_relationship', 'motivation_inference', 'unresolved_reading_disagreement', 'overconfidence'];
const negatives = {};
const nb = idx(/^### Negative interpretation choice bank/); const nbEnd = idx(/^### Canonical self-identification choices/, nb);
for (let i = nb; i < nbEnd; i++) {
  const k = /^\*\*`([a-z_]+)`\*\*/.exec(L[i]); if (!k) continue;
  const opts = []; for (let j = i + 1; j < nbEnd && !/^\*\*`/.test(L[j]); j++) { const o = /^- (“.+”)$/.exec(L[j]); if (o) opts.push(mc(`mc.q6.not.${k[1]}.${opts.length + 1}`, quoted(o[1]), `Pass B negative ${k[1]}`, { kind: 'negative', claimKind: k[1], ...(/\{\w+\}/.test(quoted(o[1])) ? { hasSlots: true } : {}) })); }
  if (opts.length !== 2) fail(`Pass B ${k[1]}: expected 2 wordings`); negatives[k[1]] = opts;
}
if (JSON.stringify(Object.keys(negatives).sort()) !== JSON.stringify([...NEG_KINDS].sort())) fail('Pass B: claim kinds differ from the design');
const arch = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/archetypes.json'), 'utf8')).archetypes;
const identityChoices = [];
const tb = idx(/^### Canonical self-identification choices/); const tbEnd = idx(/^### Free-standing first-person affirmative/, tb);
for (let i = tb; i < tbEnd; i++) {
  const m = /^\| `([a-z0-9_]+)` \| (parent|specialization of `([a-z0-9_]+)`) \| (“[^|]+”) \| (“[^|]+”) \|$/.exec(L[i]); if (!m) continue;
  const a = arch[m[1]]; const kind = m[2] === 'parent' ? 'parent' : 'specialization';
  if (!a || a.kind !== kind || (kind === 'specialization' && a.parentId !== m[3])) fail(`identity row ${m[1]} does not match the canonical registry`);
  identityChoices.push({ archetypeId: m[1], kind, parentId: m[3] || null, not: mc(`mc.q6.not.id.${m[1]}`, quoted(m[4]), `Pass B identity ${m[1]} NOT`, { kind: 'negative', claimKind: kind === 'parent' ? 'archetype_parent' : 'archetype_specialization' }), am: mc(`mc.q6.am.id.${m[1]}`, quoted(m[5]), `Pass B identity ${m[1]} AM`, { kind: 'affirmative', archetypeId: m[1] }) });
}
if (identityChoices.length !== 297 || identityChoices.filter((x) => x.kind === 'parent').length !== 97) fail(`identity rows: expected 97+200, got ${identityChoices.length}`);
const freeStanding = [];
const fs0 = idx(/^### Free-standing first-person affirmative/); const fsEnd = idx(/^### Composition, scope, and persistence/, fs0);
for (let i = fs0; i < fsEnd; i++) { const m = /^- \*\*`([a-z_]+)`:\*\* (“.+”)$/.exec(L[i]); if (m) freeStanding.push(mc(`mc.q6.am.free.${m[1]}`, quoted(m[2]), `Pass B free-standing ${m[1]}`, { kind: 'affirmative', freeId: m[1] })); }
if (freeStanding.length !== 18) fail(`free-standing: expected 18, got ${freeStanding.length}`);

/* ---------- shared A-E player answers (v0.9 section 9.3; shown in the approved section as "examples") ---------- */
const player = [];
const s93 = idx(/^### 9\.3 Q6 main question/, 0, SH);
for (let i = s93; i < s93 + 30; i++) { const m = /^\| \*\*([A-E])\*\* \| (“[^|]+”) \|/.exec(SH[i]); if (m) player.push(rec(`mc.q6.choice.${m[1].toLowerCase()}`, quoted(m[2]), SH_F, SH_COMMIT, `9.3 answer ${m[1]}`, { kind: 'calibration', calibration: m[1], ...(isFirstPerson(quoted(m[2])) ? {} : { editorialIssue: 'not_first_person' }) })); }
if (player.map((p) => p.calibration).join('') !== 'ABCDE') fail('A-E player answers not found');
/* Owner ruling MSV-RD-011 (2026-11-16): replacement first-person wording for answer B. Id, calibration meaning and source provenance preserved. */
const ruledB = player.find((p) => p.calibration === 'B');
ruledB.originalText = ruledB.text;
ruledB.text = "I recognize much of what you've described, but I want to correct one or two details.";
ruledB.editorialStatus = 'owner_approved_text';
ruledB.ownerRuling = 'MSV-RD-011';
delete ruledB.editorialIssue;

const issues = player.filter((p) => p.editorialIssue).map((p) => p.id);
const counts = { editorialIssues: issues, mentors: 5, frames: 5 * 9, clauseVariants: clauseCount, negativeKinds: 10, negativeWordings: 20, identityRows: 297, freeStanding: 18, playerChoices: 5 };
/* ---------- neutral frame for the Prestige reflection (owner direction 2026-11-16): attributed to no established Mentor ---------- */
const nrec = (id, text) => ({ id: `reflection.neutral.${id}`, text, editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: { origin: 'owner direction 2026-11-16: neutral reflection interface until the Prestige Q6 dialogue package is committed', file: 'tools/mentor-survey/q6-neutral-frame.mjs' }, speaker: 'neutral' });
const list = (key, arr) => arr.map((t, i) => nrec(`${key}.${i + 1}`, t));
const neutral = {
  milestone: nrec('milestone', NEUTRAL.milestone),
  frame: { opening: nrec('opening', NEUTRAL.opening), closing: nrec('closing', NEUTRAL.closing), reactions: Object.fromEntries(Object.entries(NEUTRAL.reactions).map(([k, t]) => [k, nrec(`react.${k}`, t)])) },
  clauses: { unresolved: { all: list('unresolved', NEUTRAL.clauses.unresolved) }, evidence: { one: list('evidence.one', NEUTRAL.clauses.evidenceOne), two: list('evidence.two', NEUTRAL.clauses.evidenceTwo), three: list('evidence.three', NEUTRAL.clauses.evidenceThree) },
    goal: { declared: list('goal.declared', NEUTRAL.clauses.goalDeclared), unrecorded: list('goal.unrecorded', NEUTRAL.clauses.goalUnrecorded) }, relation: { unknown: list('relation.unknown', NEUTRAL.clauses.relationUnknown) }, q1quote: { all: list('q1quote', NEUTRAL.clauses.q1quote) } },
};
for (const t of [neutral.milestone.text, ...Object.values(NEUTRAL.reactions), NEUTRAL.opening, NEUTRAL.closing, ...Object.values(NEUTRAL.clauses).flat()]) if (/[\u2014\u2013]/.test(t)) fail('neutral frame text must avoid dashes');
/* ---------- grounded assessment clauses (owner ruling 2026-11-16, shared by both surveys) ---------- */
import fsx from 'node:fs';
const canonKeys = Object.keys(JSON.parse(fsx.readFileSync(path.join(ROOT, 'data/bias-keys-canonical.json'), 'utf8')).mechanicalBias);
const arec = (id, text, approved) => ({ id: `reflection.assessment.${id}`, text, editorialStatus: approved ? 'owner_approved_text' : 'draft_text', mechanicsStatus: 'none', sourceRef: { origin: 'owner decision 2026-11-16 (Q6 method/theme wording)' }, speaker: 'neutral' });
const assessment = {
  keys: canonKeys,
  method: arec('method', 'Your current training supports {method_phrase}. I wonder whether that reflects how you prefer to approach problems, or simply what you\'ve prepared for.', true),
  theme: arec('theme', 'Several parts of your training seem to point toward {theme_phrase}. I see a possible pattern there, but that doesn\'t necessarily define who you are.', true),
  methodPhrases: Object.fromEntries(canonKeys.map((k) => [k, { id: `reflection.assessment.phrase.${k}`, key: k, text: methodPhraseOf(k), editorialStatus: 'draft_text', mechanicsStatus: 'none', sourceRef: { file: 'data/bias-keys-canonical.json', key: k, basis: 'camelCase split of the canonical identifier' } }])),
  themeResolution: { available: false, reason: 'canonical SSOT has no mechanical-bias field and its mechanics sections are audited draft; no theme claim is produced' },
};
writeJson(path.join(ROOT, 'data/mentor-survey/reflection-q6.json'), {
  _meta: { survey: 'reflection-q6', contentVersion: 1, sourceCommits: { multiclass: MC_COMMIT, shared: SH_COMMIT }, generatedBy: 'tools/mentor-survey/build-multiclass-q6-content.mjs', counts,
    note: 'Verbatim import; all draft_text. The identity table is validated against the canonical registry. Runtime identity inference for the 297 identities is not certified, so readings use the unresolved form (design rule).' },
  playerChoices: player, mentors: frames, clauses, negatives, identityChoices, freeStanding,
  assessment, neutral, prestigeMentors: {}, // prestigeMentors[classId] = { frame, clauses }: reserved for the authored 32-class Prestige Q6 dialogue (not yet in Git; never reconstructed)
});
console.log('wrote data/mentor-survey/reflection-q6.json', JSON.stringify(counts));

#!/usr/bin/env node
/**
 * Build data/mentor-survey/prestige.json from the committed prestige Q4 and Q5 editorial records.
 *
 *   node tools/mentor-survey/build-prestige-content.mjs --source <dir with SWSE_Prestige_Q4_Rolling_Editorial.md and ..._Q5_...>
 *
 * Imported verbatim for all 32 classes: Q4 pending/finalized Mentor intros, Q4 question and four explanation rails;
 * Q5 pending/finalized intros, the Q5 question, the seven first-person purpose statements, the optional-second-purpose
 * prompt and the decline line. The shared Q4 depth answers are owner-approved. Ace Pilot's Q4 wording and Q5 seven
 * statements are owner-approved; everything else is draft_text.
 * NOT imported: Q1 class-discovery banks (varied formats; slate policy unapproved, MSV-RD-005), Q2 actor-synthesis
 * templates, Q3 scenes (keyed to Q1 routes), Q6 dialogue (package not in Git).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quoted, readLines, find, writeJson, fail, slug } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_COMMIT = '228a7dc01e75d926728b7f015cac4ec66bdd15b7';
const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mentor-survey/class-mentor-routes.json'), 'utf8')).prestige;
const byName = Object.fromEntries(Object.values(routes).map((r) => [r.className, r]));
const args = process.argv.slice(2);
const src = args[args.indexOf('--source') + 1];
if (!src) fail('--source <dir> is required');
const q4Lines = readLines(path.join(src, 'SWSE_Prestige_Q4_Rolling_Editorial.md'));
const q5Lines = readLines(path.join(src, 'SWSE_Prestige_Q5_Rolling_Editorial.md'));
const ref = (file, anchor) => ({ commit: SOURCE_COMMIT, file: `docs/design/${file}`, anchor });
const rec = (id, text, approved, file, anchor, extra = {}) => ({ id, text, editorialStatus: approved ? 'owner_approved_text' : 'draft_text', mechanicsStatus: 'none', sourceRef: ref(file, anchor), ...extra });
const Q4F = 'SWSE_Prestige_Q4_Rolling_Editorial.md'; const Q5F = 'SWSE_Prestige_Q5_Rolling_Editorial.md';
const blockquoteAfter = (lines, from, limit) => { const k = find(lines, /^> /, from); if (k < 0 || k > limit) fail(`blockquote not found near line ${from}`); return quoted(lines[k]); };

/* ---------- shared Q4 depth answers (approved) ---------- */
const depth = [];
for (const l of q4Lines) {
  const m = /^\| `(dip|dive|swim|undecided)` \| \*\*(“[^|]+”)\*\* \|/.exec(l);
  if (m) depth.push(rec(`pr.q4.${m[1]}`, quoted(m[2]), true, Q4F, `2.2 shared answer ${m[1]}`, { kind: 'depth', depth: m[1] }));
}
if (depth.map((d) => d.depth).join() !== 'dip,dive,swim,undecided') fail('shared Q4 depth answers not found');

/* ---------- Q4 per class ---------- */
const q4 = {};
const heads = q4Lines.map((l, i) => [i, /^## \d+\. (APPROVED|PROPOSED), #\d+ (.+?) \/ (.+)$/.exec(l)]).filter(([, m]) => m);
for (let h = 0; h < heads.length; h++) {
  const [i, m] = heads[h]; const end = h + 1 < heads.length ? heads[h + 1][0] : q4Lines.length;
  const cls = byName[m[2]]; if (!cls) fail(`Q4: unknown class "${m[2]}"`);
  const approved = m[1] === 'APPROVED';
  const pi = find(q4Lines, /^\*\*Pending-selection introduction/, i); const fi = find(q4Lines, /^\*\*Finalized-acquisition introduction/, i);
  const qi = find(q4Lines, /^\*\*Player-facing Q4 question:\*\*/, i);
  if (pi < 0 || fi < 0 || qi < 0 || pi > end || fi > end || qi > end) fail(`Q4 ${m[2]}: missing intro/question`);
  const rails = {};
  for (let j = qi; j < end; j++) { const r = /^- `(dip|dive|swim|undecided)`: (.+)$/.exec(q4Lines[j]); if (r) rails[r[1]] = quoted(r[2]); }
  if (Object.keys(rails).length !== 4) fail(`Q4 ${m[2]}: expected 4 rails`);
  const id = cls.classId;
  q4[id] = {
    pendingIntro: rec(`pr.${id}.q4.intro.pending`, blockquoteAfter(q4Lines, pi, end), approved, Q4F, `${m[2]} pending intro`, { speaker: 'mentor' }),
    finalizedIntro: rec(`pr.${id}.q4.intro.finalized`, blockquoteAfter(q4Lines, fi, end), approved, Q4F, `${m[2]} finalized intro`, { speaker: 'mentor' }),
    question: rec(`pr.${id}.q4.question`, quoted(q4Lines[qi]), approved, Q4F, `${m[2]} question`, { speaker: 'mentor' }),
    rails: Object.fromEntries(Object.entries(rails).map(([k, t]) => [k, rec(`pr.${id}.q4.rail.${k}`, t, approved, Q4F, `${m[2]} rail ${k}`, { kind: 'detail' })])),
  };
}

/* ---------- Q5 per class ---------- */
const PURPOSES = ['calling', 'refinement', 'contribution', 'personal_dream', 'another_career', 'exploration', 'undecided'];
const q5 = {};
const h5 = q5Lines.map((l, i) => [i, /^## \d+\. (.+?), (.+)$/.exec(l)]).filter(([, m]) => m && byName[m[1]]);
for (let h = 0; h < h5.length; h++) {
  const [i, m] = h5[h]; const end = h + 1 < h5.length ? h5[h + 1][0] : q5Lines.length;
  const cls = byName[m[1]]; const id = cls.classId; const approved = id === 'ace_pilot'; // owner accepted Mayu's seven statements; intros remain proposals
  const pi = find(q5Lines, /^\*\*Mentor, pending acquisition:\*\*/, i); const fi = find(q5Lines, /^\*\*Mentor, finalized acquisition:\*\*/, i);
  const qi = find(q5Lines, /^\*\*Q5:\*\*/, i); const si = find(q5Lines, /^\*\*Mentor, optional second purpose:\*\*/, i); const di = find(q5Lines, /^\*\*Player, decline second purpose:\*\*/, i);
  if ([pi, fi, qi, si, di].some((x) => x < 0 || x > end)) fail(`Q5 ${m[1]}: missing a section`);
  const opts = [];
  for (let j = qi + 1; j < si; j++) { const o = /^- (["“].+["”])$/.exec(q5Lines[j]); if (o) opts.push(quoted(o[1])); }
  if (opts.length !== 7) fail(`Q5 ${m[1]}: expected 7 purpose statements, got ${opts.length}`);
  q5[id] = {
    pendingIntro: rec(`pr.${id}.q5.intro.pending`, blockquoteAfter(q5Lines, pi, end), false, Q5F, `${m[1]} pending intro`, { speaker: 'mentor' }),
    finalizedIntro: rec(`pr.${id}.q5.intro.finalized`, blockquoteAfter(q5Lines, fi, end), false, Q5F, `${m[1]} finalized intro`, { speaker: 'mentor' }),
    question: rec(`pr.${id}.q5.question`, q5Lines[qi].replace(/^\*\*Q5:\*\*\s*/, '').trim(), false, Q5F, `${m[1]} question`, { speaker: 'mentor' }),
    options: opts.map((t, k) => rec(`pr.${id}.q5.${PURPOSES[k]}`, t, approved, Q5F, `${m[1]} purpose ${PURPOSES[k]}`, { kind: 'purpose', purpose: PURPOSES[k] })),
    secondPrompt: rec(`pr.${id}.q5b.prompt`, blockquoteAfter(q5Lines, si, end), false, Q5F, `${m[1]} second-purpose prompt`, { speaker: 'mentor' }),
    decline: rec(`pr.${id}.q5b.decline`, blockquoteAfter(q5Lines, di, end), false, Q5F, `${m[1]} decline second purpose`, { kind: 'decline' }),
  };
}
for (const id of Object.keys(routes)) { if (!q4[id]) fail(`Q4 missing class ${id}`); if (!q5[id]) fail(`Q5 missing class ${id}`); }
if (Object.keys(q4).length !== 32 || Object.keys(q5).length !== 32) fail('expected 32 classes in Q4 and Q5');

const classes = Object.fromEntries(Object.values(routes).sort((a, b) => a.order - b.order).map((r) => [r.classId, { classId: r.classId, className: r.className, order: r.order, mentorRegistryKey: r.mentorRegistryKey }]));
const counts = { classes: 32, q4Depth: 4, q4Intros: 64, q4Rails: 128, q5Intros: 64, q5Purposes: 224, q5SecondPrompts: 32, q5Declines: 32, approvedClasses: { q4: Object.values(q4).filter((c) => c.pendingIntro.editorialStatus === 'owner_approved_text').length, q5Purposes: Object.values(q5).filter((c) => c.options[0].editorialStatus === 'owner_approved_text').length } };
writeJson(path.join(ROOT, 'data/mentor-survey/prestige.json'), {
  _meta: { survey: 'prestige', contentVersion: 1, sourceCommit: SOURCE_COMMIT, generatedBy: 'tools/mentor-survey/build-prestige-content.mjs', counts,
    note: 'Verbatim import of Q4 and Q5 only. Not imported: Q1 (slate policy unapproved, MSV-RD-005), Q2 (actor synthesis), Q3 (keyed to Q1 routes), Q6 (package not in Git).' },
  classes, q4Depth: depth, q4, q5, purposes: PURPOSES,
  blocked: {
    q1: 'Class-discovery banks are not imported (varied source formats) and the slate policy is unapproved (MSV-RD-005).',
    q2: 'Q2 is an actor-evidence synthesis whose templates are not imported; it needs the verified evidence projection plus approved wording.',
    q3: 'Q3 scenes are keyed to Q1 route ids and cannot be selected without Q1.',
    q6: 'The 32-class Q6 dialogue package is not in Git (owner to supply; never reconstructed).',
  },
});
console.log('wrote data/mentor-survey/prestige.json', JSON.stringify(counts));

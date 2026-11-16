#!/usr/bin/env node
/**
 * Build data/mentor-survey/multiclass.json from the committed multiclass design (v0.11).
 *
 *   node tools/mentor-survey/build-multiclass-content.mjs --source <dir containing SWSE_Multiclass_Survey_Rolling_Design.md>
 *
 * Imports VERBATIM: transition intros (Q1), fixed Q2-Q5 intros, Q1 banks (20 origin->destination x 6), the four approved
 * Q3 depth answers, 250 Q4 scenarios with the Q1-route->family map, and 500 Q5 milestone templates.
 * NOT imported (not authored in the committed design): Q2 q1_focus phrases and Q2 answers E/F, Q6 libraries (separate pack). Approval flags: only the Q3 depth answers are owner-approved; everything else is draft_text.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quoted, readLines, find, writeJson, fail } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_COMMIT = 'eb531a6b0fc5482edd62eedfea4dfebd312946ee';
const DOC = 'docs/design/SWSE_Multiclass_Survey_Rolling_Design.md';
const args = process.argv.slice(2);
const src = args[args.indexOf('--source') + 1];
if (!src) fail('--source <dir> is required');
const lines = readLines(path.join(src, 'SWSE_Multiclass_Survey_Rolling_Design.md'));
const ref = (anchor) => ({ commit: SOURCE_COMMIT, file: DOC, anchor });
const CLS = { Jedi: 'jedi', Noble: 'noble', Scoundrel: 'scoundrel', Scout: 'scout', Soldier: 'soldier' };
const MENTOR = { jedi: 'miraj', noble: 'j0_n1', scoundrel: 'ol_salty', scout: 'lead', soldier: 'breach' };
const MENTOR_LABEL = { Miraj: 'jedi', 'J0-N1': 'noble', "Ol' Salty": 'scoundrel', Lead: 'scout', Breach: 'soldier' };
const rec = (id, text, approved, anchor, extra = {}) => ({ id, text, editorialStatus: approved ? 'owner_approved_text' : 'draft_text', mechanicsStatus: 'none', sourceRef: ref(anchor), ...extra });
const ORIGINS = (d) => Object.values(CLS).filter((c) => c !== d);

const idx = (re, from = 0) => { const i = find(lines, re, from); if (i < 0) fail(`section not found: ${re}`); return i; };
const secTransitions = idx(/^## Draft MC-Q1-MENTOR-TRANSITIONS-01/);
const secQ26 = idx(/^## Draft MC-Q2-Q6-MENTOR-LINES-01/);
const secCont = idx(/^## Multiclass dialogue continuation — J0-N1 and Ol' Salty/);
const secNobleQ1 = idx(/^## Draft MC-Q1-NOBLE-ORIGIN-VARIANTS-01/);
const secQ2Contract = idx(/^## Q2 — OWNER-CLARIFIED TOP-FOUR/);
const secQ3 = idx(/^## Q3 — OWNER-APPROVED INVESTMENT-DEPTH DESIGN/);
const secQ4 = idx(/^## Q4 — OWNER-APPROVED SCENARIO ARCHITECTURE/);
const secQ5lib = idx(/^## Q5 — 500-RESPONSE LOCAL EDITORIAL LIBRARY/);
const secQ6 = idx(/^## MC-Q6-PASS-A-REFLECTION-LIBRARY-01/);
const nextH2 = (from) => { const n = find(lines, /^## /, from + 1); return n < 0 ? lines.length : n; };

/* ---------- Q1 transition intros (standard, origin-keyed; personalized "former Mentor" variants are NOT used because a relationship may not be assumed) ---------- */
const q1Intros = {};
for (let i = secTransitions; i < nextH2(secTransitions); i++) {
  const d = /^### Destination: (Jedi|Scout|Soldier) — /.exec(lines[i]);
  if (!d) continue;
  const dest = CLS[d[1]];
  for (let j = i + 1; j < nextH2(secTransitions) && !/^### /.test(lines[j]); j++) {
    const o = /^\*\*Origin (Jedi|Noble|Scoundrel|Scout|Soldier) — standard\*\*$/.exec(lines[j]);
    if (!o) continue;
    const k = find(lines, /^> /, j);
    (q1Intros[dest] ||= {})[CLS[o[1]]] = rec(`mc.${dest}.intro.q1.from_${CLS[o[1]]}`, quoted(lines[k]), false, `Q1 transitions ${d[1]} from ${o[1]}`, { speaker: 'mentor' });
  }
}
for (let i = secCont; i < secNobleQ1; i++) {
  const d = /^### Q1 — Class Discovery: .* \(entering (Noble|Scoundrel)\)$/.exec(lines[i]);
  if (!d) continue;
  const dest = CLS[d[1]];
  for (let j = i + 1; j < secNobleQ1 && !/^### /.test(lines[j]); j++) {
    const o = /^- \*\*From (Jedi|Noble|Scoundrel|Scout|Soldier):\*\*/.exec(lines[j]);
    if (o) (q1Intros[dest] ||= {})[CLS[o[1]]] = rec(`mc.${dest}.intro.q1.from_${CLS[o[1]]}`, quoted(lines[j]), false, `Q1 continuation ${d[1]} from ${o[1]}`, { speaker: 'mentor' });
  }
}
for (const d of Object.values(CLS)) if (ORIGINS(d).some((o) => !q1Intros[d]?.[o])) fail(`Q1 intros missing for destination ${d}`);

/* ---------- fixed Q3-Q5 intros ---------- */
const fixedIntros = {};
const put = (dest, q, text, anchor) => { (fixedIntros[dest] ||= {})[q] = rec(`mc.${dest}.intro.${q}`, text, false, anchor, { speaker: 'mentor' }); };
for (let i = secQ26; i < secCont; i++) {
  const q = /^### (Q[2345]) — /.exec(lines[i]);
  if (!q) continue;
  for (let j = i + 1; j < secCont && !/^### /.test(lines[j]); j++) {
    const m = /^\*\*(Miraj|Lead|Breach) — proposed fixed introduction\*\*$/.exec(lines[j]);
    if (m) put(MENTOR_LABEL[m[1]], q[1].toLowerCase(), quoted(lines[find(lines, /^> /, j)]), `${q[1]} fixed intro ${m[1]}`);
  }
}
for (let i = secCont; i < secNobleQ1; i++) {
  const q = /^### (Q[2345]) — .*\(fixed/.exec(lines[i]);
  if (!q) continue;
  for (let j = i + 1; j < secNobleQ1 && !/^### /.test(lines[j]); j++) {
    const m = /^\*\*(J0-N1|Ol' Salty):\*\* /.exec(lines[j]);
    if (m) put(MENTOR_LABEL[m[1]], q[1].toLowerCase(), quoted(lines[j]), `${q[1]} fixed intro ${m[1]}`);
  }
}
for (const d of Object.values(CLS)) for (const q of ['q2', 'q3', 'q4', 'q5']) if (!fixedIntros[d]?.[q]) fail(`fixed intro missing: ${d} ${q}`);

/* ---------- Q1 banks ---------- */
const q1 = {};
for (let i = secNobleQ1; i < secQ2Contract; i++) {
  const h = /^### Origin: (Jedi|Noble|Scoundrel|Scout|Soldier) -> (Jedi|Noble|Scoundrel|Scout|Soldier)$/.exec(lines[i]);
  if (!h) continue;
  const [origin, dest] = [CLS[h[1]], CLS[h[2]]];
  const opts = [];
  for (let j = i + 1; j < secQ2Contract && !/^### |^## /.test(lines[j]); j++) {
    const o = /^(\d)\. "(.*)"$/.exec(lines[j]);
    if (o) opts.push(rec(`mc.${dest}.q1.${origin}.${String(o[1]).padStart(2, '0')}`, o[2], false, `Q1 ${h[1]} -> ${h[2]} #${o[1]}`, { kind: o[1] === '6' ? 'neutral' : 'direction', origin, destination: dest, position: Number(o[1]) }));
  }
  if (opts.length !== 6 || opts[5].kind !== 'neutral') fail(`Q1 ${h[1]}->${h[2]}: expected 5 directions + neutral, got ${opts.length}`);
  (q1[dest] ||= {})[origin] = opts;
}
for (const d of Object.values(CLS)) if (ORIGINS(d).some((o) => !q1[d]?.[o])) fail(`Q1 banks missing for ${d}`);

/* ---------- Q3 (owner-approved text and detail rails) ---------- */
const q3 = [];
for (let i = secQ3; i < secQ4; i++) {
  const r = /^\| `(dip|dive|swim|undecided)` \| [^|]+\| (“[^|]+”) \| ([^|]+) \|$/.exec(lines[i]);
  if (r) q3.push(rec(`mc.q3.${r[1]}`, quoted(r[2]), true, `Q3 approved ${r[1]}`, { kind: 'depth', depth: r[1], detail: r[3].trim() }));
}
if (q3.map((x) => x.depth).join() !== 'dip,dive,swim,undecided') fail(`Q3: expected 4 depth answers, got ${q3.length}`);

/* ---------- Q4 route map + 250 scenarios ---------- */
const routeMap = {};
for (let i = secQ4; i < nextH2(secQ4); i++) {
  const r = /^\| (Jedi|Noble|Scoundrel|Scout|Soldier) \| (Jedi|Noble|Scoundrel|Scout|Soldier) \| (`\w+` \| ){4}`\w+` \|$/.exec(lines[i]);
  if (!r) continue;
  const fams = [...lines[i].matchAll(/`(\w+)`/g)].map((m) => m[1]);
  (routeMap[CLS[r[1]]] ||= {})[CLS[r[2]]] = fams;
}
for (const d of Object.values(CLS)) for (const o of ORIGINS(d)) if (routeMap[d]?.[o]?.length !== 5) fail(`Q4 route map missing ${o}->${d}`);
const q4 = {};
const q4End = secQ5lib; // scenarios live between the Q4 section start and the Q5 library
for (let i = secQ4; i < q4End; i++) {
  const h = /^#### `(q4\.(jedi|noble|scoundrel|scout|soldier)\.(\w+)\.seed(\d\d))` — (.+)$/.exec(lines[i]);
  if (!h) continue;
  const [, id, dest, fam] = h;
  let end = find(lines, /^#### |^### |^## /, i + 1); if (end < 0) end = lines.length;
  let situation = null; const methods = []; let neutral = null;
  for (let j = i + 1; j < end; j++) {
    const s = /^\*\*Scenario:\*\*\s*(.+)$/.exec(lines[j]);
    if (s) { const m = /^[^:]{1,40}: '([\s\S]*)'\.?$/.exec(s[1].trim()); situation = (m ? m[1] : s[1]).trim(); }
    const c = /^\d\. \*\*`(method0[1-5]|undecided)`\*\* — (.+)$/.exec(lines[j]);
    if (c) { if (c[1] === 'undecided') neutral = quoted(c[2]); else methods.push({ n: c[1], text: quoted(c[2]) }); }
  }
  if (!situation || methods.length !== 5 || !neutral) fail(`Q4 ${id}: expected situation, 5 methods and a neutral answer`);
  if (q4[id]) fail(`Q4 duplicate scenario id ${id}`);
  q4[id] = {
    scenarioId: id, destination: dest, family: fam,
    situation: rec(`mc.${id}.situation`, situation, false, `Q4 ${id} scenario`, { speaker: 'mentor' }),
    methods: methods.map((m) => rec(`mc.${id}.${m.n}`, m.text, false, `Q4 ${id} ${m.n}`, { kind: 'method' })),
    neutral: rec(`mc.${id}.undecided`, neutral, false, `Q4 ${id} undecided`, { kind: 'neutral' }),
  };
}
if (Object.keys(q4).length !== 250) fail(`Q4: expected 250 scenarios, got ${Object.keys(q4).length}`);
const byFamily = {};
for (const s of Object.values(q4)) ((byFamily[s.destination] ||= {})[s.family] ||= []).push(s.scenarioId);
for (const f of Object.values(byFamily)) for (const k of Object.keys(f)) f[k].sort();
for (const d of Object.keys(routeMap)) for (const o of Object.keys(routeMap[d])) for (const fam of routeMap[d][o]) if (!byFamily[d]?.[fam]) fail(`Q4 route ${o}->${d} names family ${fam} with no scenarios`);

/* ---------- Q5 templates (500) ---------- */
const KINDS = ['develop_core', 'field_application', 'benefit_others', 'career_continuity', 'prepare_future_route'];
const q5 = {};
for (let i = secQ5lib; i < secQ6; i++) {
  const h = /^#### (Jedi|Noble|Scoundrel|Scout|Soldier) → (Jedi|Noble|Scoundrel|Scout|Soldier) · Q1 #(\d)$/.exec(lines[i]);
  if (!h) continue;
  const [origin, dest, n] = [CLS[h[1]], CLS[h[2]], Number(h[3])];
  const q1text = quoted(lines[find(lines, /^\*\*Q1:\*\*/, i)]);
  if (q1text !== q1[dest][origin][n - 1].text) fail(`Q5 ${origin}->${dest} #${n}: Q1 text does not match the Q1 bank`);
  const opts = [];
  for (let j = i + 1; j < secQ6 && !/^#### |^## /.test(lines[j]); j++) {
    const o = /^\d\. \*\*(develop_core|field_application|benefit_others|career_continuity|prepare_future_route):\*\* (.+)$/.exec(lines[j]);
    if (o) opts.push(rec(`mc.q5.${dest}.${origin}.${String(n).padStart(2, '0')}.${o[1]}`, quoted(o[2]), false, `Q5 ${h[1]} -> ${h[2]} #${n} ${o[1]}`, { kind: o[1], needsGoalSlot: /\{declared_goal\}/.test(o[2]) }));
  }
  if (opts.map((x) => x.kind).join() !== KINDS.join()) fail(`Q5 ${origin}->${dest} #${n}: expected the five milestone kinds in order`);
  ((q5[dest] ||= {})[origin] ||= {})[String(n).padStart(2, '0')] = opts;
}
const q5Count = Object.values(q5).flatMap((o) => Object.values(o)).flatMap((r) => Object.values(r)).reduce((a, r) => a + r.length, 0);
if (q5Count !== 500) fail(`Q5: expected 500 templates, got ${q5Count}`);
/* ---------- Q5 undecided-Q1 fallback banks (25) and missing-goal replacements (5): lines ~7142-7194 of the design ---------- */
const q5Fallback = {};
for (let i = secQ5lib; i < secQ6; i++) {
  const h = /^#### (Jedi|Noble|Scoundrel|Scout|Soldier) \(Q1 undecided\)$/.exec(lines[i]);
  if (!h) continue;
  const dest = CLS[h[1]]; const opts = [];
  for (let j = i + 1; j < secQ6 && !/^#### |^### |^## /.test(lines[j]); j++) {
    const o = /^\d\. \*\*(develop_core|field_application|benefit_others|career_continuity|prepare_future_route):\*\* (.+)$/.exec(lines[j]);
    if (o) opts.push(rec(`mc.q5.${dest}.undecided.${o[1]}`, quoted(o[2]), false, `Q5 ${h[1]} (Q1 undecided) ${o[1]}`, { kind: o[1], needsGoalSlot: /\{declared_goal\}/.test(o[2]), fromUndecidedQ1: true, sourceLine: j + 1 }));
  }
  if (opts.map((x) => x.kind).join() !== KINDS.join()) fail(`Q5 undecided fallback ${dest}: expected the five milestone kinds in order`);
  q5Fallback[dest] = opts;
}
if (Object.keys(q5Fallback).length !== 5) fail('Q5 undecided fallback banks: expected 5 destinations');
const q5NoGoal = {};
const ngStart = find(lines, /^### Missing-goal replacements for career-continuity option/);
if (ngStart < 0) fail('missing-goal replacements not found');
for (let j = ngStart + 1; j < ngStart + 14; j++) {
  const m = /^- \*\*(Noble|Jedi|Scout|Soldier|Scoundrel):\*\* (.+)$/.exec(lines[j]);
  if (m) q5NoGoal[CLS[m[1]]] = rec(`mc.q5.${CLS[m[1]]}.nogoal.career_continuity`, quoted(m[2]), false, `Q5 missing-goal replacement ${m[1]}`, { kind: 'career_continuity', noGoalReplacement: true, sourceLine: j + 1 });
}
if (Object.keys(q5NoGoal).length !== 5) fail('Q5 missing-goal replacements: expected 5');
/* Declared-goal slot phrase: an implementation choice (MSV-RD-015), draft. It points at the player's own recorded goal without naming or paraphrasing it. */
const goalPhrase = rec('mc.q5.goalphrase', 'the goal I have already declared', false, 'implementation choice for the {declared_goal} slot (MSV-RD-015)', { kind: 'goal_slot_phrase', implementationChoice: true });
/* Q4 for an undecided Q1 (owner ruling MSV-RD-008): a curated low-assumption scenario family per destination. Rationale recorded; pending editorial review. */
const Q4_NEUTRAL = {
  noble: ['leadership', 'Everyday coordination dilemmas (an evacuation, a search, a blackout); no title, rank or skill is assumed.'],
  jedi: ['consular', 'Ordinary conversations about trust and mediation; no Force technique or lightsaber skill is assumed.'],
  scout: ['recon', 'Observation and reporting problems; no tracking, stealth or vehicle training is assumed.'],
  soldier: ['tactics', 'Plan and call decisions for a mixed squad; no weapon, armor or unarmed specialty is assumed.'],
  scoundrel: ['opportunist', 'Surprise complications in public places; no disguise, slicing or ship skill is assumed.'],
};
const q4Neutral = Object.fromEntries(Object.entries(Q4_NEUTRAL).map(([d, [family, rationale]]) => {
  if (!byFamily[d]?.[family]?.length) fail(`neutral Q4 family missing: ${d} ${family}`);
  return [d, { family, scenarioIds: byFamily[d][family], rationale, status: 'curated_pending_editorial_review' }];
}));
/* Origin lens (owner ruling MSV-RD-004): a survey-framing choice shown only when two or more foundation classes are owned. Drafts. */
const CLASS_LABEL = { jedi: 'Jedi', noble: 'Noble', scoundrel: 'Scoundrel', scout: 'Scout', soldier: 'Soldier' };
const origin = {
  prompt: rec('mc.origin.prompt', 'Which of your earlier paths do you want to compare this new training with?', false, 'owner ruling MSV-RD-004 (implementation text)', { kind: 'origin_prompt', implementationChoice: true }),
  options: Object.fromEntries(Object.entries(CLASS_LABEL).map(([c, label]) => [c, rec(`mc.origin.${c}`, `I want to compare this new training with my ${label} training.`, false, 'owner ruling MSV-RD-004 (implementation text)', { kind: 'origin', originClassId: c, implementationChoice: true })])),
};
const q5undecidedLine = lines.find((l) => /I am not sure what I want to accomplish first\. I would rather see what this training makes possible\./.test(l));
if (!q5undecidedLine) fail('Q5 undecided text not found');

const counts = {
  q1Banks: 20, q1Answers: 120, q1Intros: 20, fixedIntros: 20, q3Depths: 4, q4Scenarios: 250, q4Methods: 1250, q4Neutral: 250, q5Templates: 500, q5UndecidedFallback: 25, q5NoGoalReplacements: 5, q4NeutralFamilies: 5,
  q5TemplatesWithGoalSlot: Object.values(q5).flatMap((o) => Object.values(o)).flatMap((r) => Object.values(r)).flat().filter((x) => x.needsGoalSlot).length,
};
const pack = {
  _meta: { survey: 'multiclass', contentVersion: 1, sourceCommit: SOURCE_COMMIT, sourceFile: DOC, generatedBy: 'tools/mentor-survey/build-multiclass-content.mjs', counts,
    note: 'Verbatim import. Only the Q3 depth answers are owner-approved. NOT imported because not authored in the committed design: Q2 (q1_focus phrases, answers E/F), Q5 undecided-Q1 fallback banks, Q6 libraries.' },
  mentors: Object.fromEntries(Object.values(CLS).map((c) => [c, { mentorRegistryKey: MENTOR[c], q1Intros: q1Intros[c], intros: fixedIntros[c] }])),
  q1, q3, q4Routes: routeMap, q4ByFamily: byFamily, q4, q5, q5Fallback, q5NoGoal, q5GoalPhrase: goalPhrase, q4Neutral, origin,
  q5Undecided: rec('mc.q5.undecided', 'I am not sure what I want to accomplish first. I would rather see what this training makes possible.', false, 'Q5 milestone table undecided', { kind: 'neutral' }),
  blocked: {
    q2: 'Requires a certified q1_focus noun phrase per Q1 answer, authored Q2 answers E/F, and a verified top-four scores accessor; none exists in the committed design.',
    q6: 'The Q6 libraries are imported into multiclass-q6.json and attached by the content loader (pack.q6Content); Q6 is blocked only if that companion pack is absent. No verified runtime source joins an actor to the 297 canonical identities, so readings use the design\'s unresolved form.',
  },
};
writeJson(path.join(ROOT, 'data/mentor-survey/multiclass.json'), pack);
console.log('wrote data/mentor-survey/multiclass.json', counts);

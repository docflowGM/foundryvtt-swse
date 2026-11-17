#!/usr/bin/env node
/**
 * Build data/mentor-survey/l1.json from the committed L1 design document (v0.19).
 *
 *   node tools/mentor-survey/build-l1-content.mjs --source <dir containing the l1-adaptive-mentor-survey docs>
 *
 * - Text is imported VERBATIM. Editorial tags, scoring labels and developer routes are NOT imported as mechanics; only
 *   stable ids and the exact player/Mentor text are kept (answer-to-tag mapping is a separate project).
 * - Approval status is assigned ONLY where the design record states explicit owner approval; everything else is draft.
 * - Parent/child ids are validated against data/archetypes.json (the canonical SSOT); the build fails on any mismatch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slug, quoted, readLines, find, writeJson, fail } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_COMMIT = 'ff7f605a340c82b1389845d1b1a61ebc8e30c3a5';
const DOC = 'docs/design/l1-adaptive-mentor-survey/SWSE_L1_Adaptive_Mentor_Survey_Rolling_Design_v0.19_2026-11-13.md';
const args = process.argv.slice(2);
const src = args[args.indexOf('--source') + 1];
if (!src) fail('--source <dir> is required');
const lines = readLines(path.join(src, 'SWSE_L1_Adaptive_Mentor_Survey_Rolling_Design_v0.19_2026-11-13.md'));
const ref = (anchor) => ({ commit: SOURCE_COMMIT, file: DOC, anchor });

const CLASSES = { Jedi: 'jedi', Noble: 'noble', Scoundrel: 'scoundrel', Scout: 'scout', Soldier: 'soldier' };
const MENTOR_KEY = { jedi: 'miraj', noble: 'j0_n1', scoundrel: 'ol_salty', scout: 'lead', soldier: 'breach' };

// Explicit owner approvals recorded in the design (v0.19 section 9 / 11.3). Nothing else is approved.
const APPROVED = {
  intro: (cls, q) => cls === 'noble' && q !== 'q3', // J0-N1's original lines, approved in earlier context; Q3 line flagged for rewrite
  q1: (cls) => cls === 'jedi', // Jedi Q1 six-choice bank: wording owner-approved
};
const status = (ok) => (ok ? 'owner_approved_text' : 'draft_text');
const rec = (id, text, ok, anchor, extra = {}) => ({ id, text, editorialStatus: status(ok), mechanicsStatus: 'none', sourceRef: ref(anchor), ...extra });

const secA = find(lines, /^### A\. Mentor stage-introduction bank/);
const secB = find(lines, /^### B\. Q1 class-development answer bank/);
const secC = find(lines, /^### C\. Q2 complete canonical career dialogue bank/);
const secD = find(lines, /^### D\. Q3 complete class situation/);
const secQ4 = find(lines, /^## Scenario and answer catalog/);
if ([secA, secB, secC, secD, secQ4].some((i) => i < 0)) fail('could not locate all L1 sections');
const secEnd = (from) => { const n = find(lines, /^(## |### [A-Z]\. )/, from + 1); return n < 0 ? lines.length : n; };

/* ---------------- intros ---------------- */
const mentors = {};
for (let i = secA; i < secB; i++) {
  const h = /^#### (Jedi|Noble|Scoundrel|Scout|Soldier) — (.+)$/.exec(lines[i]);
  if (!h) continue;
  const cls = CLASSES[h[1]];
  const intros = {};
  for (let j = i + 1; j < secB && !lines[j].startsWith('####'); j++) {
    const m = /^- \*\*(Q[1-5]) fixed introduction:\*\*/.exec(lines[j]);
    if (m) { const q = m[1].toLowerCase(); intros[q] = rec(`l1.${cls}.intro.${q}`, quoted(lines[j]), APPROVED.intro(cls, q), `A. ${h[1]} ${m[1]} intro`, { speaker: 'mentor' }); }
  }
  mentors[cls] = { mentorRegistryKey: MENTOR_KEY[cls], intros };
}

/* ---------------- Q1 ---------------- */
const q1 = {};
for (let i = secB; i < secC; i++) {
  const h = /^#### (Jedi|Noble|Scoundrel|Scout|Soldier) — Q1 first-person choices/.exec(lines[i]);
  if (!h) continue;
  const cls = CLASSES[h[1]];
  const options = [];
  let prompt = null;
  for (let j = i + 1; j < secC && !lines[j].startsWith('####'); j++) {
    const p = /^\*\*Authored Q1 question:\*\*\s*(.+)$/.exec(lines[j]);
    if (p) prompt = rec(`l1.${cls}.q1.prompt`, p[1].trim(), APPROVED.q1(cls), `B. ${h[1]} Q1 question`, { speaker: 'mentor' });
    const o = /^\d+\. \*\*Developer route: (.+?)\*\* — (.+)$/.exec(lines[j]);
    if (o) {
      const route = o[1].replace(/\s+—\s+specialist\s*$/i, '');
      let key = slug(route.replace(/^(Jedi|Noble|Scoundrel|Scout|Soldier) /i, ''));
      if (key.startsWith('undecided') || /^i_m_not_sure|^im_not_sure/.test(key)) key = 'undecided'; // neutral labels vary across classes
      options.push(rec(`l1.${cls}.q1.${key}`, quoted(o[2]), APPROVED.q1(cls), `B. ${h[1]} Q1 option ${options.length + 1}`, { kind: key === 'undecided' ? 'neutral' : 'direction', routeKey: key }));
    }
  }
  if (options.length !== 6 || !prompt) fail(`Q1 ${cls}: expected 6 options + prompt, got ${options.length}`);
  q1[cls] = { prompt, options };
}

/* ---------------- Q2 ---------------- */
const arch = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/archetypes.json'), 'utf8')).archetypes);
const archById = new Map(arch.map((a) => [a.id, a]));
const parents = {};
for (let i = secC; i < secD; i++) {
  const h = /^#### C(\d{2})\. (.+) — `([a-z0-9_]+)`$/.exec(lines[i]);
  if (!h) continue;
  const id = h[3];
  const canonical = archById.get(id);
  if (!canonical || canonical.kind !== 'parent') fail(`Q2: ${id} is not a canonical parent`);
  const byClass = {};
  let universal = null;
  for (let j = i + 1; j < secD && !lines[j].startsWith('####'); j++) {
    const m = /^- \*\*(Universal base|Jedi|Noble|Scoundrel|Scout|Soldier):\*\*/.exec(lines[j]);
    if (!m) continue;
    if (m[1] === 'Universal base') universal = rec(`l1.q2.${id}.universal`, quoted(lines[j]), false, `C${h[1]} universal`, { kind: 'reference' });
    else byClass[CLASSES[m[1]]] = rec(`l1.q2.${id}.${CLASSES[m[1]]}`, quoted(lines[j]), false, `C${h[1]} ${m[1]}`, { kind: 'career' });
  }
  if (!universal || Object.keys(byClass).length !== 5) fail(`Q2 ${id}: expected universal + 5 class variants`);
  parents[id] = { parentId: id, universalReference: universal, byClass }; // universalReference is reference data, never offered to a player
}
if (Object.keys(parents).length !== 97) fail(`Q2: expected 97 parents, got ${Object.keys(parents).length}`);
for (const a of arch.filter((x) => x.kind === 'parent')) if (!parents[a.id]) fail(`Q2: canonical parent ${a.id} has no answer`);

// Anchors (v0.12 section 12.1), validated against the canonical class routes.
const anchors = {};
const aStart = find(lines, /^### 12\.1 Twenty preferred class anchors/);
for (let i = aStart; i < aStart + 30; i++) {
  const m = /^\| (Jedi|Noble|Scoundrel|Scout|Soldier) \/ [^|]+\| [^|]+\| `([a-z0-9_]+)` \|/.exec(lines[i] || '');
  if (m) (anchors[CLASSES[m[1]]] ||= []).push(m[2]);
}
for (const [cls, ids] of Object.entries(anchors)) {
  if (ids.length !== 4) fail(`anchors ${cls}: expected 4`);
  for (const id of ids) {
    const a = archById.get(id);
    if (a?.kind !== 'parent' || !(a.mechanics?.classes?.foundation || []).includes(cls)) fail(`anchor ${id} is not a canonical ${cls} foundation parent`);
  }
}
if (Object.keys(anchors).length !== 5) fail('anchors: expected 5 classes');

/* ---------------- Q3 ---------------- */
const q3 = {};
const q3End = secEnd(secD);
let cur = null;
for (let i = secD; i < q3End; i++) {
  const c = /^#### (Jedi|Noble|Scoundrel|Scout|Soldier) — /.exec(lines[i]);
  if (c) { cur = CLASSES[c[1]]; q3[cur] = { scenarios: {} }; continue; }
  const s = /^##### ([A-Z]{1,2}\d{2}) — Q1 route: (.+)$/.exec(lines[i]);
  if (!s || !cur) continue;
  let route = slug(s[2].replace(/^(Jedi|Noble|Scoundrel|Scout|Soldier) /i, '').replace(/\s+—\s+specialist\s*$/i, ''));
  if (route.startsWith('undecided')) route = 'undecided'; // "Undecided / neutral fallback" is the Q1 neutral route
  let situation = null; const replies = [];
  for (let j = i + 1; j < q3End && !lines[j].startsWith('#####') && !/#### /.test(lines[j]); j++) {
    const sit = /^\*\*Situation:\*\*\s*(.+)$/.exec(lines[j]);
    if (sit) situation = sit[1].trim();
    const r = /^\d+\. \*\*`([A-Z]{1,2}\d{2}-A\d)`\*\* (.+)$/.exec(lines[j]);
    if (r) replies.push(rec(`l1.${cur}.q3.${s[1].toLowerCase()}.${r[1].split('-')[1].toLowerCase()}`, quoted(r[2]), false, `D. ${s[1]} ${r[1]}`, { kind: 'method' }));
  }
  if (!situation || replies.length !== 5) fail(`Q3 ${s[1]}: expected situation + 5 replies`);
  q3[cur].scenarios[route] = { scenarioId: `l1.${cur}.q3.${s[1].toLowerCase()}`, routeKey: route, situation: rec(`l1.${cur}.q3.${s[1].toLowerCase()}.situation`, situation, false, `D. ${s[1]} situation`, { speaker: 'mentor' }), replies };
}
// Q3 scenarios are numbered in Q1 order (J01..J06 etc.); bind each scenario to its Q1 option by position. The route
// labels differ in wording between the two lists, so the binding is asserted structurally (6 each, neutral last) and
// each scenario carries the Q1 option id it is keyed to.
for (const [cls, o] of Object.entries(q3)) {
  const scenarios = Object.values(o.scenarios);
  const opts = q1[cls].options;
  if (scenarios.length !== 6 || opts.length !== 6) fail(`Q3 ${cls}: expected 6 scenarios and 6 Q1 options`);
  if (opts[5].kind !== 'neutral' || scenarios[5].routeKey !== 'undecided') fail(`Q3 ${cls}: the neutral route must be last in both lists`);
  scenarios.forEach((sc, k) => { sc.q1OptionId = opts[k].id; });
  o.byQ1Option = Object.fromEntries(scenarios.map((sc) => [sc.q1OptionId, sc.scenarioId]));
}

/* ---------------- Q4 ---------------- */
const q4 = {};
for (let i = secQ4; i < lines.length; i++) {
  const h = /^### (\d{2})\. (.+) \(`([a-z0-9_]+)`\)$/.exec(lines[i]);
  if (!h) continue;
  const id = h[3];
  let end = find(lines, /^### \d{2}\. /, i + 1); if (end < 0) end = lines.length;
  let scenario = null; const children = []; const methods = []; let section = '';
  for (let j = i + 1; j < end; j++) {
    const t = lines[j];
    if (!scenario && t.trim() && !t.startsWith('**') && !t.startsWith('-')) scenario = t.trim();
    if (/^\*\*Child-specialization approaches/.test(t)) section = 'child';
    if (/^\*\*Q3-style tag-based methods/.test(t)) section = 'method';
    const c = /^- "(.*)" — `childId=([a-z0-9_]+)`/.exec(t);
    if (c && section === 'child') children.push({ childId: c[2], text: c[1] });
    const m = /^- "(.*)" — (?:primary|supporting) tag/.exec(t);
    if (m && section === 'method') methods.push(m[1]);
  }
  const canonical = archById.get(id);
  if (!canonical || canonical.kind !== 'parent') fail(`Q4: ${id} is not a canonical parent`);
  const canonicalChildren = arch.filter((a) => a.parentId === id).map((a) => a.id).sort();
  if (JSON.stringify(children.map((c) => c.childId).sort()) !== JSON.stringify(canonicalChildren)) fail(`Q4 ${id}: children differ from the canonical registry`);
  if (!scenario || methods.length !== 5) fail(`Q4 ${id}: expected a scenario and 5 method backfills (got ${methods.length})`);
  q4[id] = {
    parentId: id,
    situation: rec(`l1.q4.${id}.situation`, scenario, false, `Q4 ${h[1]} ${id} scenario`, { speaker: 'mentor' }),
    children: children.map((c) => rec(`l1.q4.${id}.child.${c.childId}`, c.text, false, `Q4 ${h[1]} child ${c.childId}`, { kind: 'child', childId: c.childId })),
    methods: methods.map((t, k) => rec(`l1.q4.${id}.method${String(k + 1).padStart(2, '0')}`, t, false, `Q4 ${h[1]} method ${k + 1}`, { kind: 'method' })),
  };
}
if (Object.keys(q4).length !== 97) fail(`Q4: expected 97 parents, got ${Object.keys(q4).length}`);

/* ---------------- Q5 ---------------- */
const q5 = {};
const q5Start = find(lines, /^### Full Q5 class banks/);
for (let i = q5Start; i < secA; i++) {
  const h = /^## (Jedi|Noble|Scoundrel|Scout|Soldier) — /.exec(lines[i]);
  if (!h) continue;
  const cls = CLASSES[h[1]]; const options = [];
  for (let j = i + 1; j < secA && !lines[j].startsWith('## '); j++) {
    const o = /^(\d)\. (.+)$/.exec(lines[j]);
    if (o) options.push(rec(`l1.${cls}.q5.a${o[1]}`, quoted(o[2]), false, `Q5 ${h[1]} answer ${o[1]}`, { kind: 'ambition' }));
  }
  if (options.length !== 5) fail(`Q5 ${cls}: expected 5 answers`);
  q5[cls] = { options };
}
if (Object.keys(q5).length !== 5) fail('Q5: expected 5 classes');

const pack = {
  _meta: {
    survey: 'l1', contentVersion: 1, sourceCommit: SOURCE_COMMIT, sourceFile: DOC,
    generatedBy: 'tools/mentor-survey/build-l1-content.mjs',
    note: 'Verbatim import of the committed design. Approval flags reflect only explicit owner approvals recorded in the design; everything else is draft_text. Editorial tags and developer routes are intentionally not imported.',
    counts: { selectable: 1375, referenceUniversalQ2: 97, navigationControls: 2, intros: 25, q1: 30, q2ClassVariants: 485, q3Scenarios: 30, q3Replies: 150, q4Scenarios: 97, q4Children: 200, q4Methods: 485, q5: 25 },
  },
  navigation: {
    q2OtherPossibilities: rec('l1.q2.navigation.more', 'I want to hear about some other possibilities.', false, '12.3 example F utterance', { kind: 'navigation' }),
    q4OtherApproaches: rec('l1.q4.navigation.more', 'Show me other approaches.', false, 'v0.18 locked Q4 item 5', { kind: 'navigation' }),
  },
  anchors, mentors, q1, q2: { parents }, q3, q4, q5,
};
const count = { intros: Object.values(mentors).reduce((n, m) => n + Object.keys(m.intros).length, 0), q1: Object.values(q1).reduce((n, c) => n + c.options.length, 0), q3: Object.values(q3).reduce((n, c) => n + Object.keys(c.scenarios).length, 0), q4c: Object.values(q4).reduce((n, p) => n + p.children.length, 0), q4m: Object.values(q4).reduce((n, p) => n + p.methods.length, 0), q5: Object.values(q5).reduce((n, c) => n + c.options.length, 0), q2v: Object.values(parents).reduce((n, p) => n + Object.keys(p.byClass).length, 0), q3r: Object.values(q3).reduce((n, c) => n + Object.values(c.scenarios).reduce((m, s) => m + s.replies.length, 0), 0) };
const want = { intros: 25, q1: 30, q3: 30, q4c: 200, q4m: 485, q5: 25, q2v: 485, q3r: 150 };
for (const [k, v] of Object.entries(want)) if (count[k] !== v) fail(`count ${k}: expected ${v}, got ${count[k]}`);
writeJson(path.join(ROOT, 'data/mentor-survey/l1.json'), pack);
console.log('wrote data/mentor-survey/l1.json', count);

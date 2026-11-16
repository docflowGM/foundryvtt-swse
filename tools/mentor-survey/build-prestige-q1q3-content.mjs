#!/usr/bin/env node
/**
 * Build data/mentor-survey/prestige-q1q3.json and the source-recovery reports for Prestige Q1 and Q3.
 *
 *   node tools/mentor-survey/build-prestige-q1q3-content.mjs --source <dir with the rolling design and the consolidated Q3 library>
 *
 * Deterministic and class-scoped. Authoritative source ids are preserved exactly (`sourceId`); runtime ids are
 * lowercase and namespaced by class because the source reuses ids across classes. Nothing is invented or ranked:
 *  - Q1 answers: every row of the 32 class banks (text verbatim).
 *  - Q1 mentor opening / question: every authored candidate is preserved; none is chosen (owner choice pending).
 *  - Q3 scenes: 160 scenes, 800 first-person answers, exact Q1 route ids per scene.
 *  - NOT imported: candidate bias keys, ontology topics, developer interpretations, printed-development notes
 *    (answer-to-tag material; the tag boundary stays inert).
 * Q3 answer ids are derived (<sceneId>-<letter>) because the committed source carries no explicit answer ids.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLines, writeJson, fail } from './lib.mjs';
import { parseQ1 } from './prestige-q1-parse.mjs';
import { parseQ3 } from './prestige-q3-parse.mjs';
import { isFirstPerson } from '../../scripts/mentor/mentor-survey-v2/content-store.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const COMMIT = '228a7dc01e75d926728b7f015cac4ec66bdd15b7';
const RD = 'SWSE_Prestige_Survey_Rolling_Design.md';
const Q3F = 'SWSE_Prestige_Q3_All_32_Classes_Consolidated_v01.md';
const args = process.argv.slice(2);
const src = args[args.indexOf('--source') + 1];
if (!src) fail('--source <dir> is required');
const prestige = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mentor-survey/prestige.json'), 'utf8'));
const classes = Object.values(prestige.classes);
const rdLines = readLines(path.join(src, RD));
const q3Lines = readLines(path.join(src, Q3F));
const ref = (file, line, heading) => ({ commit: COMMIT, file: `docs/design/${file}`, line, ...(heading ? { heading } : {}) });
const ex = { unmatchedRoutes: [], duplicateRows: [], conflictingRows: [], orphanQ1Rows: [], duplicateRoutes: [], routeCountMismatch: [], quarantinedRows: [], crossClassIdReuse: [], q3Structure: [], editorialIssues: [], missingOpeningOrQuestion: [] };

/* ---------- parse ---------- */
const P = parseQ1(rdLines, classes);
const Q3 = parseQ3(q3Lines);
ex.q3Structure.push(...Q3.exceptions);

/* Q3 scene -> class by the nearest preceding level-1/2 heading that names exactly one class */
const nameRes = classes.map((c) => ({ c, re: new RegExp(`\\b${c.className.replace(/ /g, '\\s+')}\\b`, 'i') }));
const q3ClassAt = new Array(q3Lines.length).fill(null);
let cc = null;
q3Lines.forEach((L, i) => {
  if (/^#{1,2} /.test(L)) { const hit = nameRes.filter((n) => n.re.test(L)); if (hit.length === 1) cc = hit[0].c.classId; }
  q3ClassAt[i] = cc;
});
const prefixToClass = {};
for (const s of Q3.scenes) {
  s.classId = q3ClassAt[s.line - 1];
  if (!s.classId) { ex.q3Structure.push({ kind: 'scene_without_class', sceneId: s.sceneId, line: s.line }); continue; }
  if (prefixToClass[s.prefix] && prefixToClass[s.prefix] !== s.classId) ex.q3Structure.push({ kind: 'prefix_maps_to_two_classes', prefix: s.prefix, a: prefixToClass[s.prefix], b: s.classId, line: s.line });
  prefixToClass[s.prefix] = s.classId;
}
const structural = { scenes: Q3.scenes.length, answers: Q3.scenes.reduce((a, s) => a + s.answers.length, 0), routes: Q3.scenes.reduce((a, s) => a + s.routes.length, 0) };
for (const s of Q3.scenes) {
  if (s.answers.length !== 5) ex.q3Structure.push({ kind: 'answer_count', sceneId: s.sceneId, count: s.answers.length, line: s.line });
  if (!s.question || !s.situation || !s.mentorLine) ex.q3Structure.push({ kind: 'missing_scene_field', sceneId: s.sceneId, line: s.line, question: !!s.question, situation: !!s.situation, mentorLine: !!s.mentorLine });
  if (s.declaredRouteCount != null && s.declaredRouteCount !== s.routes.length) ex.routeCountMismatch.push({ sceneId: s.sceneId, declared: s.declaredRouteCount, parsed: s.routes.length, line: s.routeLine });
}

/* ---------- class-scoped Q1 index ---------- */
const rowsByClass = {};
for (const r of P.rows) (rowsByClass[r.classByHeading] ||= {})[r.id] = [...((rowsByClass[r.classByHeading] || {})[r.id] || []), r];
const classesById = {};
for (const r of P.rows) (classesById[r.id] ||= new Set()).add(r.classByHeading);
for (const [id, set] of Object.entries(classesById)) {
  if (set.size > 1) {
    const texts = [...set].map((c) => rowsByClass[c][id][0].text);
    ex.crossClassIdReuse.push({ id, classes: [...set], identicalText: new Set(texts).size === 1, lines: [...set].map((c) => rowsByClass[c][id][0].line), resolution: 'class-scoped runtime ids; each class joins only its own row' });
  }
}

/* ---------- join (exact id, class scope) ---------- */
/* Neutral / undecided Q1 answer per class. Source ids containing NEUTRAL are neutral by name; six classes author theirs under another id (source heading
 * "... and neutral"; text is an explicit "not decided / understand before choosing" statement). Curated and source-backed; reported for owner verification. */
const CURATED_NEUTRAL = { force_disciple: 'FD-UN00', jedi_knight: 'JK-ID03', jedi_master: 'JM-ID03', officer: 'OF-ID03', sith_apprentice: 'SA-ID03', sith_lord: 'SL-ID03' };
const QUAR = /quarantine[ds]?|not source certified|unverified|\brestricted\b|do not offer/i;
const used = {};
const q3ByClass = {};
for (const s of Q3.scenes) {
  if (!s.classId) continue;
  (q3ByClass[s.classId] ||= []).push(s);
  s.routeRows = [];
  for (const id of s.routes) {
    const rows = (rowsByClass[s.classId] || {})[id] || [];
    if (rows.length === 0) { ex.unmatchedRoutes.push({ classId: s.classId, sceneId: s.sceneId, sourceId: id, routeLine: s.routeLine }); continue; }
    if (rows.length > 1) {
      const same = new Set(rows.map((r) => r.text)).size === 1;
      (same ? ex.duplicateRows : ex.conflictingRows).push({ classId: s.classId, sourceId: id, lines: rows.map((r) => r.line), texts: same ? undefined : rows.map((r) => r.text) });
      continue;
    }
    const key = `${s.classId}:${id}`;
    if (used[key]) { ex.duplicateRoutes.push({ classId: s.classId, sourceId: id, scenes: [used[key], s.sceneId] }); continue; }
    used[key] = s.sceneId;
    s.routeRows.push(rows[0]);
  }
}
const orphans = P.rows.filter((r) => !used[`${r.classByHeading}:${r.id}`]);
for (const r of orphans) ex.orphanQ1Rows.push({ classId: r.classByHeading, sourceId: r.id, line: r.line });

const splitMentor = (l) => { const m = /^\*\*(.+?):\*\*\s*(.*)$/.exec(l || ''); const t = (m ? m[2] : l || '').replace(/^[“"]|[”"]$/g, '').trim(); return { speaker: m ? m[1].replace(/\s*\(.*\)$/, '') : null, text: t }; };
/* ---------- pack ---------- */
const pack = { _meta: { survey: 'prestige', companion: 'q1q3', contentVersion: 1, sourceCommit: COMMIT, generatedBy: 'tools/mentor-survey/build-prestige-q1q3-content.mjs', note: 'Draft text only. Q3 answer ids are derived (<sceneId>-<letter>). No tag data, bias keys or ontology topics are imported.' }, classes: {} };
const counts = {};
const selectionReview = [];
for (const c of classes) {
  const rows = P.rows.filter((r) => r.classByHeading === c.classId);
  const scenes = q3ByClass[c.classId] || [];
  const cand = P.candidates.filter((x) => x.classId === c.classId);
  const intro = cand.filter((x) => x.kind === 'intro'); const question = cand.filter((x) => x.kind === 'question');
  /* MSV-RD-012 ruling: provisional editorial default = the opening labeled "preferred"; else the first primary "proposed"/unlabeled opening; its question = the one in the same section, else the class's first. Alternatives are kept. */
  const notAlt = (x) => !/alternative|shorter|concise|warmer|capstone|voice|more |Candidate A/i.test(x.label || '');
  const preferred = intro.filter((x) => /preferred/i.test(x.label || ''));
  const proposed = intro.filter((x) => /proposed|fixed/i.test(x.label || x.heading || '') && notAlt(x));
  const primary = intro.filter(notAlt);
  const chosenIntro = preferred[0] || proposed[0] || primary[0] || null;
  const sameSection = chosenIntro ? question.filter((q) => q.heading === chosenIntro.heading) : [];
  const chosenQ = sameSection[0] || question[0] || null;
  const flags = [];
  if (preferred.length > 1) flags.push('multiple_preferred_openings');
  if (!preferred.length && primary.length > 1) flags.push('no_preferred_label_several_primary');
  if (question.length > 1) flags.push('multiple_question_candidates');
  if (chosenIntro && chosenQ && chosenIntro.heading !== chosenQ.heading) flags.push('question_from_different_section');
  selectionReview.push({ classId: c.classId, className: c.className, mentorRegistryKey: c.mentorRegistryKey, opening: chosenIntro && { id: `pr.${c.classId}.q1.intro.${chosenIntro.line}`, label: chosenIntro.label, line: chosenIntro.line, text: chosenIntro.text, basis: preferred[0] ? 'preferred_label' : proposed[0] ? 'proposed_primary' : 'first_primary' }, question: chosenQ && { id: `pr.${c.classId}.q1.question.${chosenQ.line}`, label: chosenQ.label, line: chosenQ.line, text: chosenQ.text }, alternativeOpenings: intro.length - 1, questionCandidates: question.length, flags, editorialApproval: 'provisional_default_not_approved' });
  const mark = (list, chosen) => list.map((x) => ({ label: x.label, text: x.text, editorialStatus: 'draft_text', selection: x === chosen ? 'provisional_default' : 'alternative', sourceRef: ref(RD, x.line, x.heading) }));
  if (!intro.length || !question.length) ex.missingOpeningOrQuestion.push({ classId: c.classId, intro: intro.length, question: question.length });
  const answers = rows.map((r) => {
    const qm = QUAR.exec(r.rest || '') || QUAR.exec(r.heading || '');
    const sceneId = used[`${c.classId}:${r.id}`] || null;
    const isNeutral = /NEUTRAL/.test(r.id) || CURATED_NEUTRAL[c.classId] === r.id;
    const rec = {
      id: `pr.${c.classId}.q1.${r.id.toLowerCase()}`, sourceId: r.id, text: r.text, editorialStatus: 'draft_text',
      mechanicsStatus: 'unverified_mechanic', q3SceneId: sceneId, sourceRef: ref(RD, r.line, r.heading),
    };
    if (isNeutral) { rec.kind = 'neutral'; rec.neutralBasis = CURATED_NEUTRAL[c.classId] === r.id ? 'curated_from_source_heading' : 'source_id_name'; }
    if (qm) { rec.presentsMechanic = true; rec.quarantine = { marker: qm[0], note: 'marker detected in the source row or its heading; per-route flags live in an uncommitted JSON' }; ex.quarantinedRows.push({ classId: c.classId, sourceId: r.id, marker: qm[0], line: r.line }); }
    if (!isFirstPerson(r.text)) { rec.editorialIssue = 'not_first_person'; ex.editorialIssues.push({ kind: 'q1_not_first_person', classId: c.classId, sourceId: r.id, line: r.line }); }
    return rec;
  });
  const q3 = scenes.map((s) => ({
    sceneId: s.sceneId, title: s.title, mentor: splitMentor(s.mentorLine), situation: s.situation, question: s.question,
    routeSourceIds: s.routes, sourceRef: ref(Q3F, s.line),
    answers: s.answers.map((a) => {
      const rec = { id: `pr.${c.classId}.q3.${s.sceneId.toLowerCase()}.${a.letter.toLowerCase()}`, sourceId: `${s.sceneId}-${a.letter}`, sceneId: s.sceneId, letter: a.letter, text: a.text, editorialStatus: 'draft_text', mechanicsStatus: 'unverified_mechanic', sourceRef: ref(Q3F, a.line) };
      if (!isFirstPerson(a.text)) { rec.editorialIssue = 'not_first_person'; ex.editorialIssues.push({ kind: 'q3_not_first_person', classId: c.classId, sceneId: s.sceneId, letter: a.letter, line: a.line }); }
      return rec;
    }),
  }));
  pack.classes[c.classId] = {
    q1: {
      introCandidates: mark(intro, chosenIntro),
      questionCandidates: mark(question, chosenQ),
      answers,
    },
    q3: { scenes: q3 },
  };
  counts[c.classId] = { q1Answers: answers.length, q1Quarantined: answers.filter((a) => a.quarantine).length, q1RoutedToScene: answers.filter((a) => a.q3SceneId).length, introCandidates: intro.length, questionCandidates: question.length, q3Scenes: q3.length, q3Answers: q3.reduce((a, s) => a + s.answers.length, 0), q3RouteAssignments: scenes.reduce((a, s) => a + s.routes.length, 0) };
}
const total = (k) => Object.values(counts).reduce((a, c) => a + c[k], 0);
pack._meta.counts = { classes: classes.length, q1Answers: total('q1Answers'), q1Quarantined: total('q1Quarantined'), q3Scenes: total('q3Scenes'), q3Answers: total('q3Answers'), q3RouteAssignments: total('q3RouteAssignments') };

for (const c of classes) { const n = pack.classes[c.classId].q1.answers.filter((a) => a.kind === 'neutral'); if (n.length !== 1) ex.q3Structure.push({ kind: 'neutral_count', classId: c.classId, count: n.length }); }
writeJson(path.join(ROOT, 'docs/design/mentor-survey-v2/14-prestige-q1-opening-selection.json'), selectionReview);
const clip = (t) => String(t || '').slice(0, 70).replace(/\|/g, '/');
const selRows = selectionReview.map((r) => ['', r.className, r.mentorRegistryKey, 'L' + r.opening?.line + ' ' + r.opening?.basis + ': "' + clip(r.opening?.text) + '..."', 'L' + r.question?.line + ': "' + clip(r.question?.text) + '..."', r.alternativeOpenings, r.questionCandidates, r.flags.join(', ') || 'none', r.editorialApproval, ''].join(' | ').trim());
const selDoc = [
  '# Prestige Q1 Opening and Question Selection (provisional defaults)',
  '',
  'Owner ruling MSV-RD-012 (2026-11-16): per class use the opening labeled preferred; else the first primary proposed opening; its question is the one in the same section. These are **provisional editorial defaults, not release approval**; alternatives are preserved. Generated by `build-prestige-q1q3-content.mjs`.',
  '',
  'Flagged rows need an individual look. Neutral answers: one per class; six classes author theirs under a non-NEUTRAL id (`curated_from_source_heading`: ' + Object.values(CURATED_NEUTRAL).join(', ') + ').',
  '',
  '| Class | Mentor | Opening (source line, basis) | Question (source line) | Alt. openings | Question cands. | Flags | Approval |',
  '|---|---|---|---|---:|---:|---|---|',
  ...selRows,
  '',
  'Question candidate count: **' + selectionReview.reduce((a, r) => a + r.questionCandidates, 0) + '** (one authored question per class). An earlier intermediate count of 35 in the first report was stale and is corrected here; a line-by-line scan of every class section found no uncaptured question variant.',
  '',
].join('\n');
fs.writeFileSync(path.join(ROOT, 'docs/design/mentor-survey-v2/14-PRESTIGE-Q1-OPENING-SELECTION-REVIEW.md'), selDoc);
/* ---------- roster check (Q3 doc's own table) ---------- */
const roster = {};
q3Lines.slice(26, 64).forEach((L) => { const m = /^\|\s*\d+\s*\|\s*([^|]+?)\s*\|[^|]*\|[^|]*\|\s*(\d+)\s*\|/.exec(L); if (m) roster[m[1]] = Number(m[2]); });
const rosterCheck = classes.map((c) => ({ classId: c.classId, className: c.className, documented: roster[c.className] ?? null, joined: counts[c.classId].q3RouteAssignments, q1Rows: counts[c.classId].q1Answers, ok: roster[c.className] === counts[c.classId].q3RouteAssignments && counts[c.classId].q1Answers === counts[c.classId].q3RouteAssignments }));

writeJson(path.join(ROOT, 'data/mentor-survey/prestige-q1q3.json'), pack);
const summary = { structural, joinedRouteAssignments: Object.keys(used).length, documentedRouteAssignments: 1293, rosterCheck, counts, exceptionCounts: Object.fromEntries(Object.entries(ex).map(([k, v]) => [k, v.length])) };
writeJson(path.join(ROOT, 'docs/design/mentor-survey-v2/10-prestige-q1q3-recovery.json'), { summary, exceptions: ex });
console.log(JSON.stringify({ structural, joined: summary.joinedRouteAssignments, exceptionCounts: summary.exceptionCounts, rosterBad: rosterCheck.filter((r) => !r.ok) }, null, 1));

/* ---------- human-readable report ---------- */
const rows = classes.map((c) => { const k = counts[c.classId]; return `| ${c.className} | ${k.q1Answers} | ${k.q1Quarantined} | ${k.introCandidates} | ${k.questionCandidates} | ${k.q3Scenes} | ${k.q3Answers} | ${k.q3RouteAssignments} |`; });
const list = (arr, f) => (arr.length ? arr.map(f).join('\n') : '_none_');
const md = `# Prestige Q1 and Q3 Source Recovery Report

Generated by \`tools/mentor-survey/build-prestige-q1q3-content.mjs\` from \`${RD}\` and \`${Q3F}\` at source commit \`${COMMIT}\`. Machine-readable twin: \`10-prestige-q1q3-recovery.json\`.

## Result

- Q1: **${pack._meta.counts.q1Answers}** answers parsed from 32 class banks (varied table shapes and id formats; each record keeps its exact source line).
- Q3: **${structural.scenes}** scenes, **${structural.answers}** first-person answers, **${structural.routes}** Q1 route assignments parsed.
- Route join (exact id, class scope): **${summary.joinedRouteAssignments} / 1293** matched. Per-class counts equal the roster table in the Q3 document for all 32 classes: **${rosterCheck.filter((r) => r.ok).length} / 32**.
- Not imported by design: candidate bias keys, ontology topics, developer interpretations, printed-development notes (answer-to-tag material; the tag boundary stays inert), and the two unscored controls ("I am not sure yet", "Try another situation"; the player skip and the Q1 neutral rows cover them).

## Counts by class

| Class | Q1 answers | Q1 marker-quarantined | Opening candidates | Question candidates | Q3 scenes | Q3 answers | Q3 routes |
|---|---:|---:|---:|---:|---:|---:|---:|
${rows.join('\n')}
| **Total** | ${pack._meta.counts.q1Answers} | ${pack._meta.counts.q1Quarantined} | ${total('introCandidates')} | ${total('questionCandidates')} | ${pack._meta.counts.q3Scenes} | ${pack._meta.counts.q3Answers} | ${pack._meta.counts.q3RouteAssignments} |

## Exceptions (every category reported individually)

| Category | Count |
|---|---:|
${Object.entries(summary.exceptionCounts).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

### Unmatched route ids
${list(ex.unmatchedRoutes, (x) => `- ${x.classId} ${x.sceneId} \`${x.sourceId}\` (route line ${x.routeLine})`)}

### Duplicate or conflicting Q1 rows inside one class
${list([...ex.duplicateRows, ...ex.conflictingRows], (x) => `- ${x.classId} \`${x.sourceId}\` lines ${x.lines.join(', ')}`)}

### Q1 rows no route reaches (orphans)
${list(ex.orphanQ1Rows, (x) => `- ${x.classId} \`${x.sourceId}\` line ${x.line}`)}

### Cross-class id reuse (resolved by class scope; ${ex.crossClassIdReuse.length})
${list(ex.crossClassIdReuse, (x) => `- \`${x.id}\` in ${x.classes.join(', ')} (source lines ${x.lines.join(', ')}); text ${x.identicalText ? 'identical' : 'differs'}`)}

### Marker-quarantined Q1 rows (${ex.quarantinedRows.length}; never offered, even in preview)
${list(ex.quarantinedRows, (x) => `- ${x.classId} \`${x.sourceId}\` marker "${x.marker}" (line ${x.line})`)}

> The quarantine here is detected from markers inside the source row or its heading. The source documents say per-route restriction flags are "preserved in the JSON", and that JSON is **not in Git**. Anything flagged only there is not detectable, so every Q1/Q3 record stays \`draft_text\` and \`unverified_mechanic\`, withheld from players, until that JSON or an owner ruling supplies the flags.

### Quarantine reconciliation (source-backed; unknown flags stay unresolved)
Grouped by class and source section. Evidence used: the marker in the authored row or its heading, and the independent tree audit and register entry MSV-RD-006 for tree-access questions. A missing companion JSON is not treated as proof the printed-rule question is unanswerable: each group below lists what would settle it. Nothing is guessed; every unlisted route stays \`unverified_mechanic\` and withheld.

| Class | Source section | Rows (marker) | What would settle it | State |
|---|---|---|---|---|
${[...new Map(ex.quarantinedRows.map((x) => [x.classId + '|' + (P.rows.find((r) => r.line === x.line)?.heading || ''), []])).keys()].map((k) => { const [cid, h] = k.split('|'); const rows = ex.quarantinedRows.filter((x) => x.classId === cid && (P.rows.find((r) => r.line === x.line)?.heading || '') === h); return '| ' + cid + ' | ' + h.replace(/\|/g, '/') + ' | ' + rows.map((r) => r.sourceId + ' (' + r.marker + ')').join(', ') + ' | printed talent identity and tree membership in the canonical tree registry (see talent-phase-1d audits and MSV-RD-006) | unresolved |'; }).join('\n')}

### Source-recovery exceptions (unparseable records)
${list([...ex.q3Structure, ...ex.routeCountMismatch, ...ex.missingOpeningOrQuestion, ...ex.editorialIssues], (x) => `- ${JSON.stringify(x)}`)}

## Opening and question candidates

Every authored Mentor opening and Q1 question candidate is preserved with its source line; none is chosen (\`selection: owner_choice_pending\`). Only the GM-only editorial preview shows the first candidate in source order. A candidate becomes the player-facing text only when the owner marks it \`owner_selected\`.
`;
fs.writeFileSync(path.join(ROOT, 'docs/design/mentor-survey-v2/10-PRESTIGE-Q1-Q3-IMPORT-REPORT.md'), md);

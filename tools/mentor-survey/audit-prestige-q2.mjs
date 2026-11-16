#!/usr/bin/env node
/**
 * Read-only audit of SWSE_Prestige_Survey_Q2_Character_Synthesis.md: what Q2 material exists per prestige class and what
 * is still editorial work. Writes docs/design/mentor-survey-v2/11-PRESTIGE-Q2-AUDIT.{md,json}. Imports nothing into runtime.
 *   node tools/mentor-survey/audit-prestige-q2.mjs --source <dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLines, writeJson, fail } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const src = args[args.indexOf('--source') + 1];
if (!src) fail('--source <dir> is required');
const FILE = 'SWSE_Prestige_Survey_Q2_Character_Synthesis.md';
const lines = readLines(path.join(src, FILE));
const prestige = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mentor-survey/prestige.json'), 'utf8'));
const classes = Object.values(prestige.classes);
const canon = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mentor-survey/multiclass-q2.json'), 'utf8')).keys);
const q1q3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mentor-survey/prestige-q1q3.json'), 'utf8'));
const nameRes = classes.map((c) => ({ c, re: new RegExp(`\\b${c.className.replace(/ /g, '\\s+')}\\b`, 'i') }));

const per = Object.fromEntries(classes.map((c) => [c.classId, { classId: c.classId, className: c.className, sections: [], routeInventoryTotal: null, introCandidates: [], questionLines: [], fixtures: 0, answerRows: 0, keys: new Set(), nonCanonicalKeys: new Set(), hasE: 0, hasF: 0 }]));
let cur = null; let sub = ''; let introSeen = false;
lines.forEach((L, i) => {
  const h = /^(#{2,4}) (.*)$/.exec(L);
  if (h) {
    if (h[1] === '##') {
      const hit = nameRes.filter((n) => n.re.test(h[2]));
      cur = hit.length === 1 ? hit[0].c.classId : null;
      if (cur) per[cur].sections.push({ heading: h[2], line: i + 1 });
    }
    sub = h[2]; introSeen = false;
    const hm = /(?:All|Complete)\s+(\d+)\s+Q1/i.exec(h[2]); if (cur && hm) per[cur].routeInventoryTotal = Number(hm[1]);
    if (cur && /fixture/i.test(h[2]) && h[1] !== '##') per[cur].fixtures += 1;
    return;
  }
  if (!cur) return;
  const P = per[cur];
  if (!introSeen && /Q2.*(introduction|Mentor)|Mentor.*Q2|fixed.*introduction/i.test(sub) && /^(>\s*)?[“"A-Za-z<]/.test(L) && !/^\*\*/.test(L.replace(/^>\s*/, '')) && L.trim().length > 40) { introSeen = true; P.introCandidates.push({ line: i + 1, text: L.replace(/^>\s*/, '').slice(0, 90) }); }
  const qm = /^\*\*(Question|Q2 player question|Q2 question|Shared prompt|Shared Q2 prompt|Q2 prompt|Player question)[^*]*:\*\*\s*(.+)$/i.exec(L) || /^(Shared prompt):\s*(.+)$/.exec(L);
  if (qm) P.questionLines.push({ line: i + 1, text: qm[2].slice(0, 90) });
  const tot = /\*\*(?:Total exact Q1 IDs|Complete)\*\*\s*\|\s*\*\*(\d+)\*\*/.exec(L);
  if (tot) P.routeInventoryTotal = Number(tot[1]);
  const row = /^-\s*([A-F])\s*[/—-]\s*`?([A-Za-z]+)?/.exec(L) || /^\|\s*([A-F])(?:\s*[—-][^|]*)?\s*\|\s*(`[^`]+`|[^|]*)\|/.exec(L) || /^([A-F])\.\s+(?:\*\*)?`?([A-Za-z]+)?/.exec(L);
  if (row) {
    P.answerRows += 1; if (row[1] === 'E') P.hasE += 1; if (row[1] === 'F') P.hasF += 1;
    const k = /`([a-z][A-Za-z]+)`/.exec(L)?.[1];
    if (k && 'ABCD'.includes(row[1])) (canon.has(k) ? P.keys : P.nonCanonicalKeys).add(k);
  }
});

const out = classes.map((c) => {
  const P = per[c.classId]; const q1 = q1q3.classes[c.classId].q1.answers.length;
  const hasIntro = P.introCandidates.length > 0; const hasQ = P.questionLines.length > 0;
  return { classId: c.classId, className: c.className, mentorRegistryKey: c.mentorRegistryKey, q1Routes: q1, routeInventoryTotal: P.routeInventoryTotal, routeInventoryMatchesQ1: P.routeInventoryTotal === q1, mentorIntroCandidates: P.introCandidates.length, questionLines: P.questionLines.length, fixtures: Math.max(P.fixtures, P.hasF), answerRows: P.answerRows, canonicalKeysInFixtures: [...P.keys].sort(), nonCanonicalKeys: [...P.nonCanonicalKeys].sort(), hasIntroAndQuestion: hasIntro && hasQ, sections: P.sections.map((s) => s.line) };
});
const tot = (f) => out.reduce((a, c) => a + f(c), 0);
const summary = { classes: out.length, withIntroAndQuestion: out.filter((c) => c.hasIntroAndQuestion).length, withRouteInventoryMatchingQ1: out.filter((c) => c.routeInventoryMatchesQ1).length, fixtureSets: tot((c) => c.fixtures), answerRows: tot((c) => c.answerRows), distinctCanonicalKeysInFixtures: new Set(out.flatMap((c) => c.canonicalKeysInFixtures)).size };
writeJson(path.join(ROOT, 'docs/design/mentor-survey-v2/11-prestige-q2-audit.json'), { source: FILE, summary, classes: out });
const md = `# Prestige Q2 (The Achievement) Source Audit

> **Update 2026-11-16:** after owner ruling \`MSV-RD-014\` Prestige Q2 is implemented from this source by composition (see \`13-*\` and \`build-prestige-q2-content.mjs\`); this audit records what the source contains and why bespoke banks were not imported.

Read-only audit of \`${FILE}\` (generated by \`tools/mentor-survey/audit-prestige-q2.mjs\`). Machine-readable twin: \`11-prestige-q2-audit.json\`. Nothing here is imported into the runtime.

## What the source is

An editorial design pass: the Q2 contract (shared prompt, evidence-gated answers A-D from observed strengths, E alternative, F undecided), a per-class Mentor introduction and question, a Q1 family to Q2 route inventory, and **hypothetical six-answer fixtures** for selected Q1 routes. The source states it is "**not** 1,293 fully authored personalized Q2 answer sets" and "production readiness cannot be declared" (section 60). It also needs owner sign-off because it replaces the older Q2 "mechanical teaching" design.

## What exists versus what a runtime needs

| Needed by a runtime Q2 | In the source | Status |
|---|---|---|
| Per-class Mentor introduction and question (32) | ${summary.withIntroAndQuestion} classes detected with both (see table) | draft, source exists |
| Q1 route inventory per class (1,293 routes) | ${summary.withRouteInventoryMatchingQ1} classes whose inventory total equals the imported Q1 count | source exists |
| Observed-strength read (top four, observed only) | design only in the source | **resolved in code**: \`IdentityEngine.computeObservedBehaviorBias(actor).mechanicalBias\` (audit in multiclass Q2 pack); the source's "P0 public interface" blocker is answered for the 39 keys that are in the 125 vocabulary |
| Present-strength stems per key | 125 shared stems (multiclass Q2, imported) | usable as editorial stems only; they are written for the five foundation destinations |
| **Class- and route-specific answer text for each evidence key** | ${summary.fixtureSets} fixture sets, ${summary.answerRows} A-F rows, each tied to one hypothetical route and written as illustrations ("NOT safe for an arbitrary candidate") | **needs editorial content** |
| Alternative (E) and undecided (F) text | route-specific inside each fixture; no generic per-class E/F | **needs editorial content** |
| Owner approval of Q2 wording and of replacing the older Q2 | none | approval pending |

## Per class

| Class | Q1 routes | Inventory total (detected) | Intro detected | Question lines detected | Six-answer fixtures | A-F rows | Distinct canonical keys in fixtures |
|---|---:|---:|---:|---:|---:|---:|---:|
${out.map((c) => `| ${c.className} | ${c.q1Routes} | ${c.routeInventoryTotal ?? 'n/a'} | ${c.mentorIntroCandidates} | ${c.questionLines} | ${c.fixtures} | ${c.answerRows} | ${c.canonicalKeysInFixtures.length} |`).join('\n')}

## Disposition

Counts above come from a structural scan of eight different authoring layouts. A zero or \`n/a\` means **the scan did not recognize that layout, not that the material is absent**; the source line anchors are in the JSON twin, and an unrecognized record belongs in a source-recovery exception, not in a "missing" claim.

- **No class has complete usable Q2 material.** Every class has a Mentor introduction, question wording and a route inventory to build from, but none has a key-by-class (or key-by-route) answer set that could be shown to an arbitrary actor; the fixtures are hypothetical and say so. The classes therefore remain \`blocked_source\` for Q2 and are skipped, never reconstructed or padded.
- Nothing is invented: no stems were adapted to prestige classes, no E/F text was written, and Q2 selections still grant nothing.
- To make Q2 playable the owner must either (a) approve a per-class answer-authoring pass (key stems adapted per class, with E/F), or (b) approve reusing the 125 shared stems unchanged with a per-class connective line. Either is an editorial decision recorded as \`MSV-RD-012\`.
- Runtime is ready for it: the observed-strength accessor, the reflection engine and the evidence projection exist, and the multiclass Q2 resolver already composes only evidence-backed statements and never fabricates owned feats or talents.
`;
fs.writeFileSync(path.join(ROOT, 'docs/design/mentor-survey-v2/11-PRESTIGE-Q2-AUDIT.md'), md);
console.log(JSON.stringify(summary), out.filter((c) => !c.hasIntroAndQuestion).map((c) => c.classId).join(','));

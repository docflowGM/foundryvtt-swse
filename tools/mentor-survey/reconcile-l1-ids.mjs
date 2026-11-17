#!/usr/bin/env node
/**
 * Reconcile the master answer-to-tag mapping inventory's PROPOSED L1 answer ids with the actual V2 ids in
 * data/mentor-survey/l1.json. The V2 content-pack ids are authoritative; the master ids are never adopted.
 *
 *   node tools/mentor-survey/reconcile-l1-ids.mjs --master <master-mapping.md> [--master-commit <sha>]
 *
 * Join key: verbatim normalized player text (both sides import the same committed sources).
 * NO tags are read, imported or activated: only the id column and the text column of each row are used.
 * Outputs: docs/design/mentor-survey-v2/08-l1-id-crosswalk.json and docs/design/mentor-survey-v2/08-ANSWER-ID-RECONCILIATION.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, writeJson } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const arg = (k) => args[args.indexOf(k) + 1];
const masterFile = arg('--master'); if (!masterFile) fail('--master is required');
const masterCommit = args.includes('--master-commit') ? arg('--master-commit') : 'unknown';
const norm = (t) => String(t).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').replace(/^"|"$/g, '').trim().toLowerCase();

/* V2 inventory, typed so reference data and navigation are never counted as selectable answers */
const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mentor-survey/l1.json'), 'utf8'));
const v2 = []; // {id, text, role}
for (const c of Object.values(pack.q1)) c.options.forEach((o) => v2.push({ id: o.id, text: o.text, role: 'selectable', q: 'q1' }));
for (const p of Object.values(pack.q2.parents)) { v2.push({ id: p.universalReference.id, text: p.universalReference.text, role: 'reference', q: 'q2' }); Object.values(p.byClass).forEach((o) => v2.push({ id: o.id, text: o.text, role: 'selectable', q: 'q2' })); }
for (const c of Object.values(pack.q3)) for (const s of Object.values(c.scenarios)) s.replies.forEach((o) => v2.push({ id: o.id, text: o.text, role: 'selectable', q: 'q3' }));
for (const p of Object.values(pack.q4)) [...p.children, ...p.methods].forEach((o) => v2.push({ id: o.id, text: o.text, role: 'selectable', q: 'q4' }));
for (const c of Object.values(pack.q5)) c.options.forEach((o) => v2.push({ id: o.id, text: o.text, role: 'selectable', q: 'q5' }));
for (const n of Object.values(pack.navigation)) v2.push({ id: n.id, text: n.text, role: 'navigation', q: n.id.includes('q2') ? 'q2' : 'q4' });
const ids = v2.map((r) => r.id);
if (new Set(ids).size !== ids.length) fail('V2 ids are not unique');
const byText = new Map();
for (const r of v2) { const k = `${r.q}|${norm(r.text)}`; (byText.get(k) || byText.set(k, []).get(k)).push(r); }

/* master rows: only id + text columns are read */
const lines = fs.readFileSync(masterFile, 'utf8').split('\n');
const sections = { 'L1 · Q1': 'q1', 'L1 · Q2': 'q2', 'L1 · Q3': 'q3', 'L1 · Q4': 'q4', 'L1 · Q5': 'q5' };
let cur = null; const master = [];
for (const line of lines) {
  const h = /^### (L1 · Q\d)/.exec(line);
  if (h) { cur = sections[h[1]] || null; continue; }
  if (/^### /.test(line)) { cur = null; continue; }
  if (!cur) continue;
  const m = /^\| `([^`]+)` \| ([A-Z_]+) \| (.*?) \| (?:`[^|]*|—)/.exec(line);
  if (m) master.push({ id: m[1], idStatus: m[2], text: m[3], q: cur });
}
const mapping = []; const unmatchedMaster = []; const ambiguous = [];
const claimed = new Map();
for (const mr of master) {
  const hits = byText.get(`${mr.q}|${norm(mr.text)}`) || [];
  if (hits.length === 0) { unmatchedMaster.push(mr); continue; }
  let h = hits[0];
  if (hits.length > 1) {
    // Identical text recurs across parents (method backfills). Disambiguate by id structure, still requiring text equality:
    // master l1.q4.<parent>.method.NN  <->  V2 l1.q4.<parent>.methodNN
    const sm = /^(l1\.q4\.[a-z0-9_]+)\.method\.(\d+)$/.exec(mr.id);
    h = sm ? hits.find((x) => x.id === `${sm[1]}.method${sm[2]}`) : null;
    if (!h) { ambiguous.push({ master: mr, candidates: hits.map((x) => x.id) }); continue; }
  }
  if (claimed.has(h.id)) { ambiguous.push({ master: mr, candidates: [h.id], reason: `already claimed by ${claimed.get(h.id)}` }); continue; }
  claimed.set(h.id, mr.id);
  mapping.push({ masterId: mr.id, masterIdStatus: mr.idStatus, v2Id: h.id, role: h.role, question: mr.q });
}
const unmatchedV2 = v2.filter((r) => !claimed.has(r.id));
const count = (arr, f) => arr.filter(f).length;
const summary = {
  masterCommit, v2Records: v2.length,
  v2ByRole: { selectable: count(v2, (r) => r.role === 'selectable'), reference: count(v2, (r) => r.role === 'reference'), navigation: count(v2, (r) => r.role === 'navigation') },
  masterRows: master.length, matched: mapping.length, ambiguous: ambiguous.length, unmatchedMaster: unmatchedMaster.length, unmatchedV2: unmatchedV2.length,
  matchedBySelectable: count(mapping, (m) => m.role === 'selectable'), matchedReference: count(mapping, (m) => m.role === 'reference'),
};
const prefixCollisions = mapping.filter((m) => ids.includes(m.masterId) && m.masterId !== m.v2Id).length; // master id equals a DIFFERENT v2 id
writeJson(path.join(ROOT, 'docs/design/mentor-survey-v2/08-l1-id-crosswalk.json'), {
  _meta: { purpose: 'Crosswalk from master mapping inventory proposed ids to authoritative V2 content-pack ids. Contains NO tags and activates NO mapping.', authority: 'V2 ids in data/mentor-survey/l1.json', ...summary, masterIdCollisionsWithDifferentV2Id: prefixCollisions },
  mapping, unmatchedMaster: unmatchedMaster.map((m) => ({ id: m.id, question: m.q, text: m.text })), ambiguous, unmatchedV2: unmatchedV2.map((r) => ({ id: r.id, role: r.role, question: r.q })),
});
const perQ = (q) => ({ master: count(master, (m) => m.q === q), matched: count(mapping, (m) => m.question === q), v2: count(v2, (r) => r.q === q) });
const md = [
  '# L1 Answer ID Reconciliation', '',
  `Generated by \`tools/mentor-survey/reconcile-l1-ids.mjs\` from master mapping inventory commit \`${masterCommit}\` (branch \`docs/survey-answer-tag-master-20261115\`). **The V2 ids in \`data/mentor-survey/l1.json\` are the implementation identifiers.** The master file's ids are proposals and are never adopted. No candidate tag was read, imported or activated; mappings stay uncertified and inert.`, '',
  '## V2 content-pack inventory by role', '', '| Role | Count |', '|---|---:|',
  `| Selectable answers (offered to players) | ${summary.v2ByRole.selectable} |`, `| Reference data (Q2 universal texts, never offered) | ${summary.v2ByRole.reference} |`, `| Navigation controls | ${summary.v2ByRole.navigation} |`, '',
  '## Reconciliation result', '', '| Question | Master rows | Matched to a V2 id | V2 records |', '|---|---:|---:|---:|',
  ...['q1', 'q2', 'q3', 'q4', 'q5'].map((q) => { const r = perQ(q); return `| ${q.toUpperCase()} | ${r.master} | ${r.matched} | ${r.v2} |`; }), '',
  `Matched ${summary.matched} of ${summary.masterRows} master rows (${summary.matchedBySelectable} to selectable answers, ${summary.matchedReference} to Q2 reference texts). Ambiguous: ${summary.ambiguous}. Unmatched master rows: ${summary.unmatchedMaster}. V2 records with no master row: ${summary.unmatchedV2}.`, '',
  'Examples (master proposed id -> authoritative V2 id):', '',
  ...mapping.filter((m) => m.role === 'selectable').filter((_, i) => i % 150 === 0).slice(0, 8).map((m) => `- \`${m.masterId}\` -> \`${m.v2Id}\``), '',
  '## Rules for the later mapping integration', '',
  '1. Key every certified tag mapping by the **V2 id**, using the machine crosswalk `docs/design/mentor-survey-v2/08-l1-id-crosswalk.json` to carry over any reviewed row.',
  '2. Master-only rows or V2-only records listed in the JSON must be resolved by the owner before any tag is attached; none is guessed.',
  '3. The master `AUTHOR_TAG_CANDIDATE`/`TEXT_CANDIDATE` columns remain proposals. The runtime tag boundary stays inert (`unmapped`) and the influence calculator accepts only entries marked certified and present in the registered ontology.', '',
];
fs.writeFileSync(path.join(ROOT, 'docs/design/mentor-survey-v2/08-ANSWER-ID-RECONCILIATION.md'), `${md.join('\n')}\n`);
console.log(JSON.stringify(summary), 'prefixCollisions', prefixCollisions);

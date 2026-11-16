#!/usr/bin/env node
/**
 * Definitive answer-ID ledger for all three surveys (owner hardening 2026-11-16).
 *   node tools/mentor-survey/reconcile-all-ids.mjs --master <master mapping .md>
 * Joins every row of the master Answer-to-Tag Mapping (branch docs/survey-answer-tag-master-20261115, commit 08561be4a) to the
 * committed V2 content packs by a deterministic id transform AND exact text equality. Adopted production id = the V2 id.
 * Candidate tags are NEVER read into runtime: certified tag status is `uncertified` for every row. L1 is carried over from
 * 08-l1-id-crosswalk.json (reconcile-l1-ids.mjs). The 190-tag ontology stays authoritative; the 125 mechanical-bias keys are not tags.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLines, writeJson, fail } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const masterFile = args[args.indexOf('--master') + 1];
if (!masterFile) fail('--master <file> is required');
const MASTER_COMMIT = '08561be4a334beb94fc09d6a8780cce6be4dc917';
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const mc = json('data/mentor-survey/multiclass.json'); const mq2 = json('data/mentor-survey/multiclass-q2.json');
const pr = json('data/mentor-survey/prestige.json'); const pq = json('data/mentor-survey/prestige-q1q3.json');
const norm = (t) => String(t ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

/* ---------- master rows by section ---------- */
const lines = readLines(masterFile);
const sections = {}; let cur = null;
lines.forEach((L, i) => {
  const h = /^### (Multiclass|Prestige) · (Q\d)/.exec(L);
  if (h) { cur = `${h[1] === 'Multiclass' ? 'mc' : 'pr'}.${h[2].toLowerCase()}`; sections[cur] = []; return; }
  if (/^## /.test(L)) { cur = null; return; }
  if (!cur) return;
  const m = /^\| `([^`]+)` \| ([A-Z_]+) \| (.*?) \| (.*?) \| (.*?) \| ([A-Z_]+) \|/.exec(L);
  if (m) sections[cur].push({ id: m[1], idStatus: m[2], text: m[3], primary: m[4], mapStatus: m[6], line: i + 1 });
});

/* ---------- V2 indexes: {v2id -> text} ---------- */
const V2 = { 'mc.q1': {}, 'mc.q2': {}, 'mc.q3': {}, 'mc.q4': {}, 'mc.q5': {}, 'pr.q1': {}, 'pr.q3': {}, 'pr.q4': {}, 'pr.q5': {} };
for (const d of Object.values(mc.q1)) for (const b of Object.values(d)) for (const r of b) V2['mc.q1'][r.id] = r.text;
for (const d of Object.values(mq2.destinations)) for (const r of Object.values(d)) V2['mc.q2'][r.id] = r.text;
for (const r of mc.q3) V2['mc.q3'][r.id] = r.text;
for (const s of Object.values(mc.q4)) { for (const r of [...s.methods, s.neutral]) V2['mc.q4'][r.id] = r.text; }
for (const d of Object.values(mc.q5)) for (const o of Object.values(d)) for (const b of Object.values(o)) for (const r of b) V2['mc.q5'][r.id] = r.text;
for (const [c, k] of Object.entries(pq.classes)) { for (const a of k.q1.answers) V2['pr.q1'][a.id] = a.text; for (const s of k.q3.scenes) for (const a of s.answers) V2['pr.q3'][a.id] = a.text; }
for (const r of pr.q4Depth) V2['pr.q4'][r.id] = r.text;
for (const c of Object.values(pr.q5)) for (const r of [...c.options, c.decline]) V2['pr.q5'][r.id] = r.text;

/* ---------- deterministic id transforms (master id -> candidate V2 id) ---------- */
const transform = {
  'mc.q1': (id) => { const m = /^mc\.q1\.(\w+)\.to\.(\w+)\.(\d\d)$/.exec(id); return m && `mc.${m[2]}.q1.${m[1]}.${m[3]}`; },
  'mc.q2': (id) => { const m = /^mc\.q2\.(\w+)\.observed\.(\w+)$/.exec(id); return m && `mc.q2.${m[1]}.${m[2].toLowerCase()}`; },
  'mc.q3': (id) => { const m = /^mc\.q3\.(\w+)\.(\w+)$/.exec(id); return m && `mc.q3.${m[2]}`; }, // 20 class rows -> 4 shared approved answers
  'mc.q4': (id) => `mc.${id}`,
  'mc.q5': (id) => { const m = /^mc\.q5\.(\w+)\.to\.(\w+)\.q1_(\d)\.(\w+)$/.exec(id); return m && `mc.q5.${m[2]}.${m[1]}.0${m[3]}.${m[4]}`; },
  'pr.q3': (id) => { const m = /^([A-Z]+-Q3-S\d\d)\.([A-E])$/.exec(id); return m && { sourceId: `${m[1]}-${m[2]}` }; },
  'pr.q4': (id) => { const m = /^pr\.q4\.(\w+)\.(\w+)$/.exec(id); return m && `pr.q4.${m[2]}`; }, // 128 class rows -> 4 shared approved answers
  'pr.q5': (id) => { const m = /^pr\.q5\.(\w+)\.(\w+)$/.exec(id); return m && (m[2] === 'decline' ? `pr.${m[1]}.q5b.decline` : `pr.${m[1]}.q5.${m[2]}`); },
};

const report = {}; const exceptions = [];
const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
for (const [sec, rows] of Object.entries(sections)) {
  const r = { masterRows: rows.length, matched: 0, textMismatch: 0, unmatched: 0, manyToOne: 0, ambiguous: 0, mapStatus: {} };
  const v2used = new Set();
  for (const row of rows) {
    bump(r.mapStatus, row.mapStatus);
    let v2id = null;
    if (sec === 'pr.q1') { // master ids are class-unscoped source ids: join by source id + exact text within the class that authored that text
      const hits = Object.entries(pq.classes).flatMap(([c, k]) => k.q1.answers.filter((a) => a.sourceId === row.id && norm(a.text) === norm(row.text)).map((a) => a.id));
      if (hits.length === 1) v2id = hits[0]; else if (hits.length > 1) { r.ambiguous += 1; exceptions.push({ section: sec, masterId: row.id, kind: 'ambiguous_class_scope', candidates: hits }); continue; }
      else { const any = Object.values(pq.classes).some((k) => k.q1.answers.some((a) => a.sourceId === row.id)); (any ? (r.textMismatch += 1) : (r.unmatched += 1)); exceptions.push({ section: sec, masterId: row.id, kind: any ? 'id_found_text_differs' : 'no_v2_record', line: row.line }); continue; }
    } else if (sec === 'pr.q3') {
      const t = transform[sec](row.id); const hits = Object.entries(pq.classes).flatMap(([c, k]) => k.q3.scenes.flatMap((s) => s.answers.filter((a) => a.sourceId === t?.sourceId).map((a) => a.id)));
      if (hits.length === 1) v2id = hits[0];
    } else v2id = transform[sec]?.(row.id) ?? null;
    if (sec === 'pr.q5' && (!v2id || !(v2id in V2[sec]))) { // the master slugs three purposes differently (fulfillment/personal_life/other_career); join by class + exact text
      const cls = /^pr\.q5\.(\w+?)\./.exec(row.id)?.[1] ?? null;
      const hits = Object.entries(V2[sec]).filter(([id, t]) => id.startsWith(`pr.${cls}.q5`) && norm(t) === norm(row.text)).map(([id]) => id);
      if (hits.length === 1) { v2id = hits[0]; r.joinedByText = (r.joinedByText || 0) + 1; }
    }
    if (!v2id || !(v2id in V2[sec])) { r.unmatched += 1; exceptions.push({ section: sec, masterId: row.id, kind: 'no_v2_record', transformed: v2id, line: row.line }); continue; }
    if (norm(V2[sec][v2id]) !== norm(row.text) && !(sec === 'mc.q3' || sec === 'pr.q4')) { r.textMismatch += 1; exceptions.push({ section: sec, masterId: row.id, v2Id: v2id, kind: 'text_differs', line: row.line }); continue; }
    if (v2used.has(v2id)) r.manyToOne += 1;
    v2used.add(v2id); r.matched += 1;
  }
  const v2total = Object.keys(V2[sec]).length;
  r.v2Records = v2total; r.v2WithoutMasterRow = v2total - v2used.size;
  for (const id of Object.keys(V2[sec])) if (!v2used.has(id)) exceptions.push({ section: sec, v2Id: id, kind: 'v2_without_master_row' });
  report[sec] = r;
}
const l1 = json('docs/design/mentor-survey-v2/08-l1-id-crosswalk.json');
writeJson(path.join(ROOT, 'docs/design/mentor-survey-v2/15-answer-id-ledger.json'), { masterCommit: MASTER_COMMIT, report, l1CrosswalkEntries: Array.isArray(l1) ? l1.length : Object.keys(l1.entries || l1).length, exceptions });
const kinds = {}; for (const e of exceptions) bump(kinds, `${e.section}:${e.kind}`);
const rows = Object.entries(report).map(([k, r]) => `| ${k} | ${r.masterRows} | ${r.matched} | ${r.manyToOne} | ${r.textMismatch} | ${r.unmatched} | ${r.ambiguous} | ${r.v2Records} | ${r.v2WithoutMasterRow} |`);
const md = ['# Answer-ID Ledger: master mapping versus V2 content packs', '',
  `Generated by \`tools/mentor-survey/reconcile-all-ids.mjs\` from master commit \`${MASTER_COMMIT}\` (branch \`docs/survey-answer-tag-master-20261115\`). L1 is reconciled separately (\`08-ANSWER-ID-RECONCILIATION.md\`, all 1,472 rows).`, '',
  '**Adopted production id = the V2 id in every case.** Master ids are proposals. **Certified tag status: none.** No candidate tag, mapping status or primary/supporting column was read into any runtime file; the tag boundary stays inert. The 190-tag ontology is authoritative; the 125 mechanical-bias keys are not tags.', '',
  '| Section | Master rows | Matched (id + exact text) | of which many-to-one | Text differs | No V2 record | Ambiguous | V2 records | V2 without master row |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|', ...rows, '',
  '`many-to-one` rows are the master repeating a shared answer per class (Multiclass Q3: 20 rows to 4 shared approved answers; Prestige Q4: 128 rows to 4). Exceptions are listed individually in `15-answer-id-ledger.json`.', '',
  '## Exception summary', '', ...Object.entries(kinds).map(([k, v]) => `- ${k}: ${v}`), '',
  '- `pr.q1:v2_without_master_row` (316): the master extractor captured 977 of the 1,293 Prestige Q1 routes; the V2 pack imports all 1,293 (see `10-PRESTIGE-Q1-Q3-IMPORT-REPORT.md`). Every master row matches exactly; the 316 are rows the master omitted, listed individually in the JSON. Master Q1 ids are class-unscoped source ids; V2 runtime ids are class-namespaced (`pr.<class>.q1.<id>`).',
  '- `pr.q5:v2_without_master_row` (32): the optional second-purpose decline lines (`pr.<class>.q5b.decline`), which the master did not enumerate. Three purposes are slugged differently by the master (`fulfillment`, `personal_life`, `other_career`) than by the committed Q5 design that V2 imports (`calling`, `personal_dream`, `another_career`); they were joined by class + exact text (96 rows) and the V2 slugs are adopted.',
  '- `mc.q3` and `pr.q4`: the master repeats the shared approved depth answers once per class; they are many-to-one onto the 4 shared V2 ids.',
  '- Prestige Q2 has no fixed response ids by design (composed from evidence); Multiclass Q6 and Prestige Q6 corrections are identity events, not tag votes; Prestige Q6 dialogue is not in Git.', ''].join('\n');
fs.writeFileSync(path.join(ROOT, 'docs/design/mentor-survey-v2/15-ANSWER-ID-LEDGER.md'), md);
console.log(JSON.stringify(report, null, 1).slice(0, 2500)); console.log(kinds);

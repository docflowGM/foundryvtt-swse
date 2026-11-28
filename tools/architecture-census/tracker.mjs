#!/usr/bin/env node
/**
 * Implementation tracker CLI + validator (read/write only the tracker file).
 *
 *   node tools/architecture-census/tracker.mjs check
 *       Validates: all 274 original finding IDs present exactly once, valid statuses/phases,
 *       FOUNDRY_TESTED requires a foundryAcceptance evidence record, closed statuses carry notes,
 *       OFFLINE_TESTED/IMPLEMENTED carry at least one commit. Exit 1 on any error.
 *   node tools/architecture-census/tracker.mjs summary
 *   node tools/architecture-census/tracker.mjs set <ID> <STATUS> --commit <sha> [--test <file>] [--note "<text>"] [--decision "<text>"]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = path.join(ROOT, 'data', 'audits', 'architecture-census', 'implementation', 'tracker.json');
const REGISTER = path.join(ROOT, 'data', 'audits', 'architecture-census', 'findings', 'finding-register.json');
const t = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const [cmd, ...rest] = process.argv.slice(2);
const CLOSED = new Set(['IMPLEMENTED', 'OFFLINE_TESTED', 'FOUNDRY_TESTED', 'INTENTIONALLY_RETAINED', 'NOT_REPRODUCED', 'SUPERSEDED', 'VERIFIED_NO_CHANGE_NEEDED']);
const NEED_COMMIT = new Set(['IMPLEMENTED', 'OFFLINE_TESTED', 'FOUNDRY_TESTED']);
const BLOCKED = new Set(['PARTIALLY_COMPLETE_BLOCKED', 'OWNER_DECISION_REQUIRED', 'DEFERRED_RULES_REVIEW']);

function validate() {
  const errs = [];
  const original = JSON.parse(fs.readFileSync(REGISTER, 'utf8')).findings.map(f => f.id);
  const ids = t.findings.map(f => f.id);
  const seen = new Set();
  for (const id of ids) { if (seen.has(id)) errs.push(`duplicate ${id}`); seen.add(id); }
  for (const id of original) if (!seen.has(id)) errs.push(`missing original finding ${id}`);
  for (const id of ids) if (!original.includes(id)) errs.push(`unknown finding ${id}`);
  for (const f of t.findings) {
    if (!t.statusVocabulary.includes(f.status)) errs.push(`${f.id}: invalid status ${f.status}`);
    if (!t.phases.includes(f.plannedPhase)) errs.push(`${f.id}: invalid phase ${f.plannedPhase}`);
    if (NEED_COMMIT.has(f.status) && !f.commits.length) errs.push(`${f.id}: ${f.status} requires a commit`);
    if (f.status === 'FOUNDRY_TESTED' && !(f.foundryAcceptance && f.foundryAcceptance !== 'NOT_RUN' && f.foundryEvidence)) errs.push(`${f.id}: FOUNDRY_TESTED requires foundryAcceptance + foundryEvidence from a live run`);
    if ((CLOSED.has(f.status) && !NEED_COMMIT.has(f.status) || BLOCKED.has(f.status)) && !f.notes) errs.push(`${f.id}: ${f.status} requires a note`);
    if (['OWNER_DECISION_REQUIRED', 'DEFERRED_RULES_REVIEW'].includes(f.status) && !f.requiredDecision) errs.push(`${f.id}: ${f.status} requires requiredDecision text`);
  }
  return errs;
}
function summary() {
  const by = {}; const byPhase = {};
  for (const f of t.findings) { by[f.status] = (by[f.status] || 0) + 1; (byPhase[f.plannedPhase] = byPhase[f.plannedPhase] || {})[f.status] = (byPhase[f.plannedPhase][f.status] || 0) + 1; }
  return { total: t.findings.length, byStatus: by, byPhase };
}
if (cmd === 'check') {
  const errs = validate();
  if (errs.length) { console.error(errs.join('\n')); console.error(`${errs.length} tracker error(s)`); process.exit(1); }
  console.log(`tracker ok: ${t.findings.length} findings`);
} else if (cmd === 'summary') {
  console.log(JSON.stringify(summary(), null, 1));
} else if (cmd === 'set') {
  const [id, status] = rest; const opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
  const f = t.findings.find(x => x.id === id);
  if (!f) { console.error(`unknown ${id}`); process.exit(1); }
  if (!t.statusVocabulary.includes(status)) { console.error(`invalid status ${status}`); process.exit(1); }
  f.status = status;
  const commit = opt('--commit'); if (commit && !f.commits.includes(commit)) f.commits.push(commit);
  const test = opt('--test'); if (test && !f.tests.includes(test)) f.tests.push(test);
  const note = opt('--note'); if (note) f.notes = f.notes ? `${f.notes} | ${note}` : note;
  const dec = opt('--decision'); if (dec) f.requiredDecision = dec;
  fs.writeFileSync(FILE, JSON.stringify(t, null, 1) + '\n');
  const errs = validate().filter(e => e.startsWith(id));
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  console.log(`${id} -> ${status}`);
} else { console.error('usage: tracker.mjs check|summary|set <ID> <STATUS> [--commit sha] [--test file] [--note text] [--decision text]'); process.exit(2); }

#!/usr/bin/env node
/**
 * Phase 3B source-text corrections.
 *
 * data/audits/talent-phase-3b-source-text-corrections.json inventories OCR damage that was certified into the
 * Phase 2 canonical talent text. The corrections belong in the real authority chain:
 *
 *   data/audits/talent-phase-2-*-content.json        <- edited here (exact, asserted string replacements)
 *     -> tools/build-talent-canonical-authority.mjs   -> data/canonical/talents.json
 *     -> tools/build-talent-phase-3b-manifest.mjs     -> data/audits/talent-phase-3b-*-manifest.json
 *     -> data/audits/talent-phase-3b-global-closeout.json (recorded blob SHAs)
 *
 * This tool only edits the Phase 2 content files (and the human-readable production reference); the remaining links
 * are regenerated with their own builders. Nothing is inferred: each field carries its exact currentValue and
 * correctedValue, and the tool refuses to touch a field whose current text is neither of the two.
 *
 *   node tools/apply-talent-phase-3b-source-text-corrections.mjs --validate
 *   node tools/apply-talent-phase-3b-source-text-corrections.mjs --apply [--only-book "<sourcebook>"] [--except-book "<sourcebook>"]
 *   node tools/apply-talent-phase-3b-source-text-corrections.mjs --recertify      (after the builders were re-run)
 *   node tools/apply-talent-phase-3b-source-text-corrections.mjs --check [--strict]
 *
 * --strict additionally fails while any entry still needs the rendered PDF (blocksApply).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MANIFEST_PATH = 'data/audits/talent-phase-3b-source-text-corrections.json';
const CANONICAL_PATH = 'data/canonical/talents.json';
const CLOSEOUT_PATH = 'data/audits/talent-phase-3b-global-closeout.json';
const REFERENCE_DOC = 'docs/audits/talent-canonical-production-reference.md';
const STATUSES = new Set(['TXT_CONFIRMED', 'PDF_CONFIRMED', 'TXT_AMBIGUOUS_PDF_REQUIRED', 'UNRESOLVED', 'PRIOR_PDF_AUDIT_RECORDED']);
const BLOCKING = new Set(['TXT_AMBIGUOUS_PDF_REQUIRED', 'UNRESOLVED']);
const PHASE2_TO_CANONICAL = { canonicalDescription: ['description', 'benefit'], quickSummary: ['summary'], canonicalPrerequisites: ['prerequisites'] };
// Signatures that are never legitimate rules text; none may survive in a corrected value.
const RESIDUE = [['html', /<\/?(?:p|br|div|span)\b/i], ['backslash', /\\/], ['pipe', /\|/], ['tilde', /~/], ['brace', /[{}]/]];

const fail = message => { throw new Error('[talent-phase-3b-source-text-corrections] ' + message); };
const invariant = (ok, message) => { if (!ok) fail(message); };
const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = rel => JSON.parse(readText(rel));
const gitBlobSha = text => crypto.createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const writeJson = (rel, data) => fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(data, null, 2) + '\n', 'utf8');

export function loadCorrections() { return readJson(MANIFEST_PATH); }

export function validateManifest(manifest) {
  invariant(manifest.schemaVersion === 1 && Array.isArray(manifest.entries), 'unsupported manifest');
  const ids = new Set();
  for (const e of manifest.entries) {
    invariant(!ids.has(e.id), 'duplicate entry id ' + e.id); ids.add(e.id);
    for (const key of ['canonicalIdentity', 'sourcebook', 'printedPage', 'phase2File', 'phase2ClaimIdentity', 'suspectedCorruption', 'verification']) invariant(e[key] !== undefined, `${e.id}: missing ${key}`);
    invariant(STATUSES.has(e.verification.status), `${e.id}: unknown verification status ${e.verification.status}`);
    invariant(e.blocksApply === BLOCKING.has(e.verification.status), `${e.id}: blocksApply disagrees with status`);
    invariant(e.applied === (e.fields.length > 0), `${e.id}: applied flag disagrees with fields`);
    for (const f of e.fields) {
      invariant(f.currentValue !== f.correctedValue, `${e.id}: ${f.phase2Field} is not actually corrected`);
      invariant(PHASE2_TO_CANONICAL[f.phase2Field], `${e.id}: unknown phase-2 field ${f.phase2Field}`);
      for (const [name, re] of RESIDUE) invariant(!re.test(f.correctedValue), `${e.id}: corrected ${f.phase2Field} still contains ${name} residue`);
    }
    if (e.blocksApply) invariant(e.verification.pdfConfirmationRequired === true, `${e.id}: a blocking entry must require PDF confirmation`);
  }
  for (const f of manifest.nonSourceFindings ?? []) invariant(STATUSES.has(f.status), `${f.id}: unknown status`);
  return { entries: manifest.entries.length, blocking: manifest.entries.filter(e => e.blocksApply).length };
}

const selected = (entry, { onlyBook, exceptBook }) => (!onlyBook || entry.sourcebook === onlyBook) && (!exceptBook || entry.sourcebook !== exceptBook);

function findPhase2Record(data, entry) {
  const hits = data.records.filter(r => r.canonicalIdentity === entry.phase2ClaimIdentity && r.sourcebook === entry.sourcebook);
  invariant(hits.length === 1, `${entry.id}: expected exactly one phase-2 record for ${entry.phase2ClaimIdentity}, found ${hits.length}`);
  return hits[0];
}

/** Edits the Phase 2 content files. Idempotent; refuses unknown current text. */
export function applyToPhase2(manifest, opts = {}) {
  const files = new Map();
  let changed = 0;
  for (const entry of manifest.entries.filter(e => e.applied && selected(e, opts))) {
    if (!files.has(entry.phase2File)) files.set(entry.phase2File, readJson(entry.phase2File));
    const record = findPhase2Record(files.get(entry.phase2File), entry);
    for (const f of entry.fields) {
      if (record[f.phase2Field] === f.correctedValue) continue;
      invariant(record[f.phase2Field] === f.currentValue, `${entry.id}: ${entry.phase2ClaimIdentity} ${f.phase2Field} is neither the recorded current nor the corrected value; refusing to overwrite`);
      record[f.phase2Field] = f.correctedValue;
      changed++;
    }
  }
  for (const [rel, data] of files) writeJson(rel, data);
  return { changed, files: [...files.keys()] };
}

/** Human-readable production reference: same corrections, located by book section + tree key + heading. */
export function applyToReferenceDoc(manifest, opts = {}) {
  let text = readText(REFERENCE_DOC);
  const lines = text.split('\n');
  let touched = 0;
  for (const entry of manifest.entries.filter(e => e.applied && selected(e, opts))) {
    const treeKey = entry.canonicalIdentity.split('|').slice(0, 2).join('|');
    const name = entry.canonicalIdentity.split('|')[2];
    const bookStart = lines.findIndex(l => /^## Book \d+ — /.test(l) && l.endsWith(entry.sourcebook));
    invariant(bookStart >= 0, `${entry.id}: book section not found in the production reference`);
    let bookEnd = lines.findIndex((l, i) => i > bookStart && /^## Book \d+ — /.test(l)); if (bookEnd < 0) bookEnd = lines.length;
    // Expansion sections do not repeat the tree-key line, so locate the tree by its "### <tree>" heading.
    const treeName = treeKey.split('|')[1];
    const treeAt = lines.findIndex((l, i) => i > bookStart && i < bookEnd && l === `### ${treeName}`);
    invariant(treeAt >= 0, `${entry.id}: tree "${treeName}" not found in the production reference book section`);
    let treeEnd = lines.findIndex((l, i) => i > treeAt && i < bookEnd && l.startsWith('### ')); if (treeEnd < 0) treeEnd = bookEnd;
    const headAt = lines.findIndex((l, i) => i > treeAt && i < treeEnd && l === `#### ${name}`);
    invariant(headAt >= 0, `${entry.id}: heading "${name}" not found in the production reference`);
    let headEnd = lines.findIndex((l, i) => i > headAt && i < treeEnd && (l.startsWith('#### ') || l.startsWith('### '))); if (headEnd < 0) headEnd = treeEnd;
    let block = lines.slice(headAt, headEnd).join('\n');
    const before = block;
    for (const f of entry.fields) {
      if (f.phase2Field === 'canonicalPrerequisites' && f.correctedValue === '') {
        block = block.replace(`- **Prerequisites:** ${f.currentValue}`, '- **Prerequisites:** —');
      } else if (block.includes(f.currentValue)) block = block.split(f.currentValue).join(f.correctedValue);
      // The reference wraps noise removals across paragraphs the same way, so fall back to the removed tail.
      else if (f.removedTrailingText && block.includes(f.removedTrailingText.trim())) block = block.split(f.removedTrailingText.trim()).join('');
    }
    if (block !== before) { lines.splice(headAt, headEnd - headAt, ...block.split('\n')); touched++; }
  }
  text = lines.join('\n');
  fs.writeFileSync(path.join(ROOT, REFERENCE_DOC), text, 'utf8');
  return { touched };
}

export function checkApplied(manifest, { strict = false, onlyBook, exceptBook } = {}) {
  const problems = [];
  const canonical = readJson(CANONICAL_PATH);
  const canonicalById = new Map(canonical.records.map(r => [r.canonicalIdentity, r]));
  const phase2 = new Map();
  for (const entry of manifest.entries.filter(e => e.applied && selected(e, { onlyBook, exceptBook }))) {
    if (!phase2.has(entry.phase2File)) phase2.set(entry.phase2File, readJson(entry.phase2File));
    const record = findPhase2Record(phase2.get(entry.phase2File), entry);
    const canon = canonicalById.get(entry.canonicalIdentity);
    for (const f of entry.fields) {
      if (record[f.phase2Field] !== f.correctedValue) problems.push(`${entry.id} ${entry.canonicalIdentity}: phase-2 ${f.phase2Field} is not the corrected value`);
      if (canon && canon.provenance.primaryPublication.sourcebook === entry.sourcebook) {
        for (const key of PHASE2_TO_CANONICAL[f.phase2Field]) if (canon[key] !== f.correctedValue) problems.push(`${entry.id}: data/canonical/talents.json ${key} is stale (regenerate with tools/build-talent-canonical-authority.mjs)`);
      }
    }
  }
  // Recorded closeout SHAs are maintained values: they must describe the files on disk.
  const closeout = readJson(CLOSEOUT_PATH);
  if (closeout.authority.canonicalTalentBlobSha !== gitBlobSha(readText(CANONICAL_PATH))) problems.push('closeout authority.canonicalTalentBlobSha is stale');
  for (const book of closeout.perBook) if (book.manifestBlobSha !== gitBlobSha(readText(book.manifest))) problems.push(`closeout perBook ${book.bookKey} manifestBlobSha is stale`);
  const pending = manifest.entries.filter(e => e.blocksApply);
  if (strict && pending.length) problems.push(`${pending.length} entries still require the rendered PDF: ${pending.map(e => e.canonicalIdentity).join('; ')}`);
  return { problems, pending: pending.length };
}

/** Updates the recorded blob SHAs in the Phase 3B closeout after the authority chain was regenerated. */
export function recertifyCloseout(manifest) {
  const closeout = readJson(CLOSEOUT_PATH);
  const record = closeout.phase3bSourceTextCorrections ?? {
    manifest: MANIFEST_PATH,
    issue: 'OCR damage (signatures, appended captions/headings, mismatched delimiters) had been certified into the Phase 2 canonical talent text.',
    resolution: 'Corrected in the Phase 2 content authority; data/canonical/talents.json and the Phase 3B manifests were regenerated by their builders.',
    countsChanged: false, dispositionsChanged: false, productionMutationPerformed: false,
    previousCanonicalTalentBlobSha: closeout.authority.canonicalTalentBlobSha,
    previousManifestBlobShas: Object.fromEntries(closeout.perBook.map(b => [b.bookKey, b.manifestBlobSha]))
  };
  record.previousDispositions ??= { global: closeout.counts.dispositions, perBook: Object.fromEntries(closeout.perBook.map(b => [b.bookKey, b.dispositions])) };
  closeout.authority.canonicalTalentBlobSha = gitBlobSha(readText(CANONICAL_PATH));
  // Disposition counts follow the regenerated manifests: a corrected canonical text can now equal the production text,
  // which moves a record between UPDATE_CONTENT and UPDATE_METADATA. Identity counts never change.
  const global = {};
  for (const book of closeout.perBook) {
    book.manifestBlobSha = gitBlobSha(readText(book.manifest));
    const m = readJson(book.manifest);
    invariant(m.counts.ownedCanonicalIdentities === book.ownedCanonicalIdentities, `${book.bookKey}: owned identity count changed`);
    book.dispositions = m.counts.dispositions;
    for (const [k, v] of Object.entries(m.counts.dispositions)) global[k] = (global[k] ?? 0) + v;
  }
  invariant(Object.values(global).reduce((a, b) => a + b, 0) === 1180, 'disposition totals no longer sum to 1180');
  closeout.counts.dispositions = Object.fromEntries(Object.keys(closeout.counts.dispositions).concat(Object.keys(global)).filter((k, i, a) => a.indexOf(k) === i && global[k] !== undefined).map(k => [k, global[k]]));
  record.correctedCanonicalTalentBlobSha = closeout.authority.canonicalTalentBlobSha;
  record.correctedManifestBlobShas = Object.fromEntries(closeout.perBook.map(b => [b.bookKey, b.manifestBlobSha]));
  record.correctedDispositions = { global: closeout.counts.dispositions, perBook: Object.fromEntries(closeout.perBook.map(b => [b.bookKey, b.dispositions])) };
  record.entries = manifest.entries.length;
  record.entriesApplied = manifest.entries.filter(e => e.applied).length;
  record.entriesStillRequiringPdf = manifest.entries.filter(e => e.blocksApply).map(e => e.canonicalIdentity);
  closeout.phase3bSourceTextCorrections = record;
  writeJson(CLOSEOUT_PATH, closeout);
  return record;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const arg = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const opts = { onlyBook: arg('--only-book'), exceptBook: arg('--except-book') };
  const manifest = loadCorrections();
  const v = validateManifest(manifest);
  if (argv.includes('--apply')) {
    const p2 = applyToPhase2(manifest, opts);
    const doc = applyToReferenceDoc(manifest, opts);
    console.log(`[talent-phase-3b-source-text-corrections] phase-2 fields changed: ${p2.changed} in ${p2.files.length} files; reference-doc blocks touched: ${doc.touched}`);
    console.log('[talent-phase-3b-source-text-corrections] next: node tools/build-talent-canonical-authority.mjs; rebuild the affected manifests; update the closeout SHAs');
  } else if (argv.includes('--recertify')) {
    const r = recertifyCloseout(manifest);
    console.log(`[talent-phase-3b-source-text-corrections] closeout SHAs updated (canonical ${r.correctedCanonicalTalentBlobSha.slice(0, 10)})`);
  } else if (argv.includes('--check')) {
    const { problems, pending } = checkApplied(manifest, { strict: argv.includes('--strict'), ...opts });
    if (problems.length) { console.error(problems.slice(0, 12).map(p => '  FAIL ' + p).join('\n') + (problems.length > 12 ? `\n  ... ${problems.length - 12} more` : '')); process.exit(1); }
    console.log(`[talent-phase-3b-source-text-corrections] PASS: ${manifest.entries.filter(e => e.applied && selected(e, opts)).length} corrected records applied through the authority chain; ${pending} entries still need the PDF`);
  } else {
    console.log(`[talent-phase-3b-source-text-corrections] manifest valid: ${v.entries} entries, ${v.blocking} blocking`);
  }
}

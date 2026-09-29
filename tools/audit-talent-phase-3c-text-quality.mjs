#!/usr/bin/env node
/**
 * Read-only OCR-artifact scan of the certified Phase 3B target text.
 *
 * The Phase 3B manifests are the migration authority, but their canonical text was derived from OCR of the
 * sourcebooks. This scan looks for signatures that are never legitimate rules text and would be WRITTEN into
 * production by Phase 3C (i.e. the signature is absent from the record's current production value):
 *
 *   html-tag     <p>, </p>, <br> ...            (the packs store plain text)
 *   backslash    \o  \f                          (OCR of "of", "if")
 *   pipe         |mpel Ally |, |n addition       (OCR of "I"/"l")
 *   tilde        equip~ ment                     (OCR hyphenation)
 *   curly-brace  {see page 128}, [minimum of 1}  (OCR of "(" ")" "[" "]")
 *   gibberish    >=3 tokens such as eaVued/YalavHo/esiavHa (OCR of a page image or drop-cap noise)
 *
 * Informational only (never gating): unbalanced brackets/parentheses.
 *
 * This tool never edits anything. Phase 3B authority must be corrected deliberately (Phase 2 content -> manifest
 * rebuild); Phase 3C does not "fix" certified text on its own. apply-talent-phase-3c.mjs --apply refuses to write
 * while gating findings exist unless --allow-ocr-artifacts is passed (scratch validation only).
 *
 *   node tools/audit-talent-phase-3c-text-quality.mjs [--strict] [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_FIELDS = ['system.benefit', 'system.summary', 'system.description', 'system.description.value', 'system.prerequisites'];
const SIGNATURES = [
  ['html-tag', v => /<\/?(?:p|br|div|span|b|i|em|strong)\b[^>]*>/i.test(v)],
  ['backslash', v => /\\/.test(v)],
  ['pipe', v => /\|/.test(v)],
  ['tilde', v => /~/.test(v)],
  ['curly-brace', v => /[{}]/.test(v)],
  ['gibberish', v => gibberishTokens(v).length >= 3]
];
const KNOWN_WORDS = new Set(['HoloNet', 'SpyNet', 'DataPad', 'StarWars']);

export function gibberishTokens(text) {
  return (String(text).match(/[A-Za-z][A-Za-z']*/g) ?? []).filter(t => {
    if (t.length < 2 || KNOWN_WORDS.has(t)) return false;
    if (/[a-z][A-Z]/.test(t) && !/^(Mc|Mac|De)[A-Z]/.test(t)) return true;
    return t.length >= 4 && !/[aeiouyAEIOUY]/.test(t);
  });
}

const unbalanced = v => (v.match(/\[/g) ?? []).length !== (v.match(/\]/g) ?? []).length || (v.match(/\(/g) ?? []).length !== (v.match(/\)/g) ?? []).length;

/** @returns {{gating: object[], informational: object[]}} */
export function scanManifestText(manifests) {
  const gating = [];
  const informational = [];
  for (const { manifest } of manifests) {
    for (const rec of manifest.records) {
      const isCreate = Boolean(rec.identityResolution.createRecordId);
      for (const field of TEXT_FIELDS) {
        const target = rec.targetFields?.[field];
        if (typeof target !== 'string') continue;
        if (!isCreate && !rec.mutationFields.includes(field)) continue; // Phase 3C does not write it
        const current = typeof rec.currentCanonicalFields?.[field] === 'string' ? rec.currentCanonicalFields[field] : '';
        const hits = SIGNATURES.filter(([, test]) => test(target) && !test(current)).map(([name]) => name);
        const base = { canonicalIdentity: rec.canonicalIdentity, disposition: rec.disposition, field, sourcebook: manifest.sourcebook };
        if (hits.length) {
          gating.push({ ...base, signatures: hits, target: target.slice(0, 160), currentProduction: current.slice(0, 160) });
        } else if (unbalanced(target) && !unbalanced(current)) {
          informational.push({ ...base, signatures: ['unbalanced-bracket'], target: target.slice(0, 160) });
        }
      }
    }
  }
  return { gating, informational };
}

export const summarize = ({ gating, informational }) => ({
  gatingFields: gating.length,
  gatingRecords: new Set(gating.map(f => f.canonicalIdentity)).size,
  informationalFields: informational.length,
  bySignature: gating.reduce((acc, f) => { for (const s of f.signatures) acc[s] = (acc[s] ?? 0) + 1; return acc; }, {})
});

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { loadCommittedManifests } = await import('./apply-talent-phase-3c.mjs');
  const result = scanManifestText(loadCommittedManifests(ROOT));
  if (process.argv.includes('--json')) console.log(JSON.stringify({ summary: summarize(result), ...result }, null, 2));
  else {
    const s = summarize(result);
    console.log(`certified target text with OCR-artifact signatures: ${s.gatingFields} fields in ${s.gatingRecords} records ${JSON.stringify(s.bySignature)}`);
    const seen = new Set();
    for (const f of result.gating) {
      const key = f.canonicalIdentity; if (seen.has(key)) continue; seen.add(key);
      console.log(`  ${f.canonicalIdentity} [${f.disposition}] ${f.field}: ${f.signatures.join(',')} :: ${JSON.stringify(f.target.slice(0, 90))}`);
    }
    console.log(`informational (unbalanced brackets/parentheses): ${s.informationalFields} fields`);
  }
  if (process.argv.includes('--strict') && result.gating.length) process.exit(1);
}

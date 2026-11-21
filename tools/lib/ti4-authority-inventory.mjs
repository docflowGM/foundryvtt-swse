/**
 * TI-4A report-only mutation-boundary analyzer (library).
 *
 * REPORT-ONLY. This module reads source text and returns data. It never blocks, rejects, rewrites or intercepts anything, imports
 * no Foundry code, and has no runtime hook. It is a static, lexical analyzer — NOT a parser and NOT a proof — and its limits are
 * stated in `LIMITATIONS` and in docs/audits/transaction-integrity/ti-4/ti4a-static-analysis-coverage-and-limitations.md.
 *
 * What it does: for each protected mechanical field family (tools/lib/ti4-authority-config.mjs) it reports
 *   - direct-writer    : a write-intent on the family's field (object-payload key, bracket assignment, property assignment,
 *                        setFlag/unsetFlag of the family's flag, settings write of the family's setting)
 *   - delegated-call   : a call to the family's authority API (the write is delegated; the call site is reported, not judged)
 *   - unresolved-use   : a protected path/key used in a form the analyzer cannot classify (alias, argument to an unknown callee,
 *                        embedded in a longer string). Never dropped: it is surfaced so it cannot hide a mutation.
 * Read-only references (property reads, getFlag, getProperty, ...) are counted per family but are NOT writers.
 *
 * Determinism: results are sorted by (file, line, col, family, kind); no timestamps, no absolute paths, no environment input.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  CONFIG_VERSION, SCAN_ROOTS, SCAN_EXTENSIONS, FAMILIES, EXCEPTIONS, PHASE0_CENSUS,
  READ_CALLEES, FLAG_WRITE_CALLEES, SETTING_WRITE_CALLEES, KNOWN_UNOBSERVED
} from './ti4-authority-config.mjs';

export const SCHEMA_ID = 'ti4a-authority-inventory/1';
export const COVERAGE_STATEMENT = 'This inventory is a LOWER BOUND of recognized write forms. No protected family may be described as completely inventoried; families with a present known-unobserved entry have KNOWN_GAPS.';
export const CLASSIFICATIONS = Object.freeze(['AUTHORITY_INTERNAL', 'DOCUMENTED_EXCEPTION', 'PHASE0_INVENTORIED', 'UNCLASSIFIED']);
export const KINDS = Object.freeze(['direct-writer', 'delegated-call', 'unresolved-use']);

export const LIMITATIONS = Object.freeze([
  'Lexical analysis, not a JavaScript parser: no scope, type, or data-flow analysis.',
  'Aliases are not followed: `const p = "system.credits"; update({[p]: v})` is reported as unresolved-use at the literal, not as a write.',
  'Computed or concatenated paths (`"system." + key`, template literals with substitutions) are not resolved and can be missed (false negatives).',
  'Dynamic dispatch, `Reflect`, `eval`, bracket-notation property writes with non-literal keys, and writes inside generated code are invisible.',
  'Writes performed by other modules, macros, compendium/data scripts, templates (.hbs) or the Foundry core are out of scope; only scripts/ and index.js are scanned.',
  'A payload key (`"system.credits": v`) is treated as write-intent even if the object is never passed to an update call (possible false positive).',
  'A delegated call is reported at the call site; whether the callee behaves correctly is NOT assessed.',
  'Comments are excluded; string contents are kept (so a protected path inside a log message appears as unresolved-use).',
  'Known false negatives that the audit has verified are listed in the artifact\'s `knownUnobserved` inventory with per-family `coverage`; a family with a present entry is KNOWN_GAPS, and no family is ever `inventoryComplete`.',
  'A bare identifier with a protected name (a local variable, parameter, or destructured binding) is treated as a local binding, not a field write; a write through a destructured or aliased object reference is a false negative.',
  'A payload-key lookalike (for example a type-coercion map `{ "system.credits": "number" }`) is reported as a payload-key write: lexical analysis cannot distinguish it (known false positive).',
  'Regex-literal and template-literal detection is heuristic; a lexing failure degrades to unresolved findings, never to silence.'
]);

/* ------------------------------------------------------------------------------------------ */
/* Lexer                                                                                       */
/* ------------------------------------------------------------------------------------------ */

const REGEX_PRECEDERS = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const REGEX_KEYWORDS = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do', 'yield', 'await']);
const IDENT = /[A-Za-z0-9_$]/;

/**
 * Returns { masked, structural, strings }.
 *   masked     : source with comments blanked (newlines preserved); string contents kept
 *   structural : masked with the CONTENTS of string/template/regex literals blanked (quotes kept) — for bracket matching
 *   strings    : [{ start, end, quote }] for quote-delimited and template literals (end exclusive)
 */
export function lex(src) {
  const n = src.length;
  const masked = src.split('');
  const structural = src.split('');
  const strings = [];
  const blank = (arr, from, to) => { for (let k = from; k < to; k++) if (arr[k] !== '\n' && arr[k] !== '\r') arr[k] = ' '; };
  let i = 0;
  let prevSig = '';
  let prevWord = '';
  const setPrev = (ch) => { prevSig = ch; };
  const scanTemplate = (start) => {
    // returns index after the closing backtick; handles nested ${ } with nested strings/templates
    let k = start + 1;
    while (k < n) {
      const c = src[k];
      if (c === '\\') { k += 2; continue; }
      if (c === '`') return k + 1;
      if (c === '$' && src[k + 1] === '{') {
        let depth = 1; k += 2;
        while (k < n && depth > 0) {
          const d = src[k];
          if (d === '\\') { k += 2; continue; }
          if (d === '`') { k = scanTemplate(k); continue; }
          if (d === '"' || d === "'") { const q = d; k++; while (k < n && src[k] !== q && src[k] !== '\n') { if (src[k] === '\\') k++; k++; } k++; continue; }
          if (d === '{') depth++;
          else if (d === '}') depth--;
          k++;
        }
        continue;
      }
      k++;
    }
    return n;
  };
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (c === '/' && c2 === '/') { let e = i; while (e < n && src[e] !== '\n') e++; blank(masked, i, e); blank(structural, i, e); i = e; continue; }
    if (c === '/' && c2 === '*') { let e = src.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; blank(masked, i, e); blank(structural, i, e); i = e; continue; }
    if (c === '"' || c === "'") {
      let e = i + 1;
      while (e < n && src[e] !== c && src[e] !== '\n') { if (src[e] === '\\') e++; e++; }
      const end = Math.min(e + 1, n);
      strings.push({ start: i, end, quote: c });
      blank(structural, i + 1, end - 1);
      i = end; setPrev('"'); prevWord = ''; continue;
    }
    if (c === '`') {
      const end = scanTemplate(i);
      strings.push({ start: i, end, quote: '`' });
      blank(structural, i + 1, end - 1);
      i = end; setPrev('"'); prevWord = ''; continue;
    }
    if (c === '/') {
      const regexOk = prevSig === '' || REGEX_PRECEDERS.has(prevSig) || REGEX_KEYWORDS.has(prevWord);
      if (regexOk) {
        let e = i + 1; let cls = false;
        while (e < n && src[e] !== '\n') {
          if (src[e] === '\\') { e += 2; continue; }
          if (src[e] === '[') cls = true;
          else if (src[e] === ']') cls = false;
          else if (src[e] === '/' && !cls) break;
          e++;
        }
        if (src[e] === '/') { e++; while (e < n && /[a-z]/i.test(src[e])) e++; blank(structural, i + 1, e); i = e; setPrev('"'); prevWord = ''; continue; }
      }
      i++; setPrev('/'); prevWord = ''; continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (IDENT.test(c)) {
      let e = i; while (e < n && IDENT.test(src[e])) e++;
      prevWord = src.slice(i, e); setPrev('a'); i = e; continue;
    }
    setPrev(c); prevWord = ''; i++;
  }
  return { masked: masked.join(''), structural: structural.join(''), strings };
}

/* ------------------------------------------------------------------------------------------ */
/* Helpers                                                                                     */
/* ------------------------------------------------------------------------------------------ */

function lineIndex(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') starts.push(i + 1);
  return starts;
}
function locate(starts, idx) {
  let lo = 0; let hi = starts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) lo = mid; else hi = mid - 1; }
  return { line: lo + 1, col: idx - starts[lo] + 1 };
}
function stringAt(strings, idx) {
  let lo = 0; let hi = strings.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1; const s = strings[mid];
    if (idx < s.start) hi = mid - 1; else if (idx >= s.end) lo = mid + 1; else return s;
  }
  return null;
}
function nextSig(text, i) { while (i < text.length && /\s/.test(text[i])) i++; return i; }
function prevSigIdx(text, i) { i--; while (i >= 0 && /\s/.test(text[i])) i--; return i; }

const ASSIGN_AFTER = /^\s*(?:(?:\*\*|<<|>>>?|\?\?|\|\||&&|[-+*/%|&^])?=(?![=>])|\+\+|--)/;

/** Callee name enclosing position `idx` (structural text), or null. Returns { name, chain }. */
function enclosingCallee(structural, idx) {
  let depth = 0;
  for (let i = idx - 1; i >= 0; i--) {
    const c = structural[i];
    if (c === ')' || c === ']' || c === '}') depth++;
    else if (c === '(' || c === '[' || c === '{') {
      if (depth === 0) {
        if (c !== '(') return null;
        let e = i; while (e > 0 && /\s/.test(structural[e - 1])) e--;
        let s = e; while (s > 0 && /[A-Za-z0-9_$.?]/.test(structural[s - 1])) s--;
        const chain = structural.slice(s, e).replace(/\?/g, '').replace(/\.+$/, '');
        if (!chain) return null;
        return { name: chain.split('.').pop(), chain };
      }
      depth--;
    }
  }
  return null;
}

function compile(sources) { return sources.map((s) => new RegExp(s, 'g')); }
const COMPILED = Object.fromEntries(Object.entries(FAMILIES).map(([name, f]) => [name, {
  paths: compile(f.paths),
  calls: f.calls.map((c) => ({ authority: c.authority, re: new RegExp(c.re, 'g') })),
  authorityFiles: f.authorityFiles.map((s) => new RegExp(s)),
  flagKeys: new Set(f.flagKeys),
  settingKeys: new Set(f.settingKeys)
}]));
const EXCEPTIONS_C = EXCEPTIONS.map((e) => ({ file: new RegExp(e.file), family: e.family, reason: e.reason }));
const CENSUS_SETS = Object.fromEntries(Object.entries(PHASE0_CENSUS).map(([k, v]) => [k, new Set(v)]));

export function classify(file, family) {
  if (COMPILED[family].authorityFiles.some((re) => re.test(file))) return { classification: 'AUTHORITY_INTERNAL', note: null };
  const ex = EXCEPTIONS_C.find((e) => e.family === family && e.file.test(file));
  if (ex) return { classification: 'DOCUMENTED_EXCEPTION', note: ex.reason };
  if (CENSUS_SETS[family]?.has(file)) return { classification: 'PHASE0_INVENTORIED', note: null };
  return { classification: 'UNCLASSIFIED', note: null };
}

/* ------------------------------------------------------------------------------------------ */
/* Single-source analysis                                                                      */
/* ------------------------------------------------------------------------------------------ */

/**
 * Analyze one source text. `file` is the root-relative forward-slash path (used for classification and records).
 * Returns { records, reads } where reads is a per-family count of recognized read-only references.
 */
export function analyzeSource(file, src) {
  const text = String(src ?? '');
  const { masked, structural, strings } = lex(text);
  const starts = lineIndex(text);
  const lines = text.split('\n');
  const records = [];
  const reads = {};
  for (const fam of Object.keys(FAMILIES)) reads[fam] = 0;
  const seen = new Set();

  const push = (family, kind, form, idx, authority, matched, extra = {}) => {
    const { line, col } = locate(starts, idx);
    const key = `${line}:${col}:${family}:${kind}:${form}`;
    if (seen.has(key)) return;
    seen.add(key);
    const cls = classify(file, family);
    records.push({
      id: `${file}:${line}:${col}:${family}:${kind}`,
      file, line, col, family, kind, form,
      authority: authority ?? null,
      matched: matched ?? null,
      expression: (lines[line - 1] ?? '').trim().slice(0, 140),
      classification: cls.classification,
      note: cls.note,
      ...extra
    });
  };

  for (const [family, comp] of Object.entries(COMPILED)) {
    /* ---- path matches ---- */
    for (const re of comp.paths) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(masked)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        const idx = m.index; const end = idx + m[0].length;
        const s = stringAt(strings, idx);
        if (s) {
          const inner0 = s.start + 1; const inner1 = s.end - 1;
          // The string is "exact" when the WHOLE literal is one dotted document path that contains the protected fragment
          // (so 'system.forcePoints.value' and 'flags.swse.actionEconomy.history' are exact; a log sentence is not).
          const content = masked.slice(inner0, inner1);
          const exact = !content.includes('${') && /^[A-Za-z_$][\w$-]*(?:\.[\w$-]+)*$/.test(content);
          if (!exact) {
            // path embedded in a longer string/template. A trailing sub-path ("flags.x.actionEconomy.history") followed by ':' is still a key.
            const after = nextSig(masked, s.end);
            const before = prevSigIdx(masked, s.start);
            push(family, 'unresolved-use', 'string-literal-use', idx, null, m[0]);
            continue;
          }
          const before = prevSigIdx(masked, s.start);
          const after = nextSig(masked, s.end);
          if (masked[after] === ':' && (masked[before] === '{' || masked[before] === ',')) { push(family, 'direct-writer', 'payload-key', idx, null, m[0]); continue; }
          if (masked[before] === '[' && masked[after] === ']' && ASSIGN_AFTER.test(masked.slice(after + 1, after + 40))) { push(family, 'direct-writer', 'payload-key', idx, null, m[0]); continue; }
          const callee = enclosingCallee(structural, s.start);
          if (callee && READ_CALLEES.includes(callee.name)) { reads[family]++; continue; }
          if (callee && FLAG_WRITE_CALLEES.includes(callee.name)) { push(family, 'direct-writer', 'flag-write', idx, null, m[0]); continue; }
          push(family, 'unresolved-use', 'string-literal-use', idx, null, m[0]);
          continue;
        }
        // code position. A document write needs a PROPERTY chain (`x.system.credits = v`); a bare identifier with the same name
        // (`const installedSystems = ...`, a parameter, a local) is a local binding, not a field write.
        const pi = prevSigIdx(masked, idx);
        const viaProperty = pi >= 0 && masked[pi] === '.';
        if (viaProperty && ASSIGN_AFTER.test(masked.slice(end, end + 40))) { push(family, 'direct-writer', 'assignment', idx, null, m[0]); continue; }
        reads[family]++;
      }
    }
    /* ---- flag keys as call arguments ---- */
    for (const s of strings) {
      if (s.quote === '`') continue;
      const content = masked.slice(s.start + 1, s.end - 1);
      if (comp.flagKeys.has(content)) {
        const callee = enclosingCallee(structural, s.start);
        if (callee && FLAG_WRITE_CALLEES.includes(callee.name)) push(family, 'direct-writer', 'flag-write', s.start + 1, null, content);
        else if (callee && READ_CALLEES.includes(callee.name)) reads[family]++;
      }
      if (comp.settingKeys.has(content)) {
        const callee = enclosingCallee(structural, s.start);
        if (callee && SETTING_WRITE_CALLEES.includes(callee.name)) push(family, 'direct-writer', 'setting-write', s.start + 1, null, content);
        else if (callee && READ_CALLEES.includes(callee.name)) reads[family]++;
      }
    }
    /* ---- authority calls (code only) ---- */
    for (const c of comp.calls) {
      c.re.lastIndex = 0;
      let m;
      while ((m = c.re.exec(masked)) !== null) {
        if (m[0].length === 0) { c.re.lastIndex++; continue; }
        if (stringAt(strings, m.index)) continue;
        push(family, 'delegated-call', 'authority-call', m.index, c.authority, m[0].replace(/\s*\($/, ''));
      }
    }
  }
  records.sort(compareRecords);
  return { records, reads };
}

function compareRecords(a, b) {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return a.line - b.line;
  if (a.col !== b.col) return a.col - b.col;
  if (a.family !== b.family) return a.family < b.family ? -1 : 1;
  return a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0;
}

/* ------------------------------------------------------------------------------------------ */
/* Tree analysis                                                                               */
/* ------------------------------------------------------------------------------------------ */

function walk(root, rel, out) {
  const abs = path.join(root, rel);
  let st;
  try { st = fs.statSync(abs); } catch { return; }
  if (st.isDirectory()) {
    const names = fs.readdirSync(abs).sort();
    for (const name of names) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      walk(root, rel ? `${rel}/${name}` : name, out);
    }
  } else if (SCAN_EXTENSIONS.includes(path.extname(rel))) {
    out.push(rel.split(path.sep).join('/'));
  }
}

export function listSourceFiles(root) {
  const out = [];
  for (const r of SCAN_ROOTS) walk(root, r, out);
  return out.sort();
}

/** Analyze a checkout. `sourceRef` is recorded verbatim (e.g. a commit SHA the caller verified). */
export function analyzeTree(root, { sourceRef = 'unspecified' } = {}) {
  const files = listSourceFiles(root);
  const records = [];
  const reads = {}; for (const f of Object.keys(FAMILIES)) reads[f] = 0;
  const failures = [];
  for (const rel of files) {
    let src;
    try { src = fs.readFileSync(path.join(root, rel), 'utf8'); } catch (e) { failures.push({ file: rel, error: String(e?.message ?? e) }); continue; }
    const r = analyzeSource(rel, src);
    for (const rec of r.records) records.push(rec);
    for (const [k, v] of Object.entries(r.reads)) reads[k] += v;
  }
  records.sort(compareRecords);
  const knownUnobserved = evaluateKnownUnobserved(root);
  return buildArtifact({ records, reads, scannedFiles: files.length, sourceRef, failures, knownUnobserved });
}

/** Self-verifies each known-unobserved entry against the tree: present only when at least one evidence item matches in an existing file. */
export function evaluateKnownUnobserved(root) {
  const out = [];
  for (const e of KNOWN_UNOBSERVED) {
    const matches = [];
    for (const ev of e.evidence) {
      let text = null;
      try { text = fs.readFileSync(path.join(root, ev.file), 'utf8'); } catch { text = null; }
      if (text === null) continue;
      const re = new RegExp(ev.pattern);
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) matches.push({ file: ev.file, line: i + 1, expression: lines[i].trim().slice(0, 140) });
    }
    out.push({
      id: e.id, family: e.family, kind: e.kind, description: e.description, reason: e.reason, certificationEffect: e.certificationEffect,
      evidence: e.evidence.map((x) => ({ file: x.file, pattern: x.pattern })),
      presentInTree: matches.length > 0,
      matches
    });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function buildArtifact({ records, reads, scannedFiles, sourceRef, failures = [], knownUnobserved = [] }) {
  const byFamily = {};
  for (const fam of Object.keys(FAMILIES)) {
    const row = { description: FAMILIES[fam].description, readReferences: reads[fam] ?? 0 };
    for (const k of KINDS) { row[k] = 0; }
    row.byClassification = Object.fromEntries(CLASSIFICATIONS.map((c) => [c, { 'direct-writer': 0, 'delegated-call': 0, 'unresolved-use': 0 }]));
    byFamily[fam] = row;
  }
  for (const r of records) {
    byFamily[r.family][r.kind]++;
    byFamily[r.family].byClassification[r.classification][r.kind]++;
  }
  // An unclassified WRITER is a direct write outside every census/authority/exception. An unclassified CALLER (a delegated call to an
  // authority API from a file Phase 0 did not list) is the correct path, reported for information only.
  const unclassified = records.filter((r) => r.classification === 'UNCLASSIFIED' && r.kind === 'direct-writer')
    .map((r) => ({ id: r.id, family: r.family, kind: r.kind, form: r.form, expression: r.expression }));
  const unclassifiedCallers = records.filter((r) => r.classification === 'UNCLASSIFIED' && r.kind === 'delegated-call');
  const unclassifiedFiles = {};
  for (const r of records) if (r.classification === 'UNCLASSIFIED' && r.kind === 'direct-writer') (unclassifiedFiles[r.file] ??= new Set()).add(r.family);
  const unresolvedFiles = {};
  for (const r of records) if (r.kind === 'unresolved-use' && r.classification === 'UNCLASSIFIED') (unresolvedFiles[r.file] ??= new Set()).add(r.family);
  const coverage = { statement: COVERAGE_STATEMENT, families: {} };
  for (const fam of Object.keys(FAMILIES)) {
    const ids = knownUnobserved.filter((k) => k.family === fam && k.presentInTree).map((k) => k.id);
    coverage.families[fam] = {
      inventoryComplete: false,
      ratchetCoverage: ids.length ? 'KNOWN_GAPS' : 'LOWER_BOUND',
      knownUnobservedIds: ids
    };
  }
  return {
    schema: SCHEMA_ID,
    configVersion: CONFIG_VERSION,
    reportOnly: true,
    sourceRef,
    scanned: { roots: [...SCAN_ROOTS], extensions: [...SCAN_EXTENSIONS], fileCount: scannedFiles },
    limitations: [...LIMITATIONS],
    totals: {
      records: records.length,
      directWriters: records.filter((r) => r.kind === 'direct-writer').length,
      delegatedCalls: records.filter((r) => r.kind === 'delegated-call').length,
      unresolvedUses: records.filter((r) => r.kind === 'unresolved-use').length,
      unclassified: unclassified.length,
      unclassifiedCallers: unclassifiedCallers.length
    },
    byFamily,
    unclassifiedWriters: unclassified,
    unclassifiedFiles: Object.fromEntries(Object.keys(unclassifiedFiles).sort().map((f) => [f, [...unclassifiedFiles[f]].sort()])),
    unresolvedUseFilesOutsideCensus: Object.fromEntries(Object.keys(unresolvedFiles).sort().map((f) => [f, [...unresolvedFiles[f]].sort()])),
    coverage,
    knownUnobserved,
    readFailures: failures,
    records
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Artifact validation (used by CI: malformed artifact fails; a reported violation never does) */
/* ------------------------------------------------------------------------------------------ */

export function validateArtifact(a) {
  const problems = [];
  const bad = (m) => problems.push(m);
  if (!a || typeof a !== 'object') return ['artifact is not an object'];
  if (a.schema !== SCHEMA_ID) bad(`schema must be ${SCHEMA_ID}`);
  if (a.reportOnly !== true) bad('reportOnly must be true');
  if (typeof a.sourceRef !== 'string' || !a.sourceRef) bad('sourceRef must be a non-empty string');
  if (!Array.isArray(a.records)) bad('records must be an array');
  if (!a.byFamily || typeof a.byFamily !== 'object') bad('byFamily missing');
  if (!a.totals || typeof a.totals !== 'object') bad('totals missing');
  if (!Array.isArray(a.limitations) || a.limitations.length === 0) bad('limitations must be a non-empty array');
  if (problems.length) return problems;
  for (const fam of Object.keys(FAMILIES)) if (!a.byFamily[fam]) bad(`byFamily.${fam} missing`);
  const ids = new Set();
  let prev = null;
  for (const r of a.records) {
    if (!r || typeof r !== 'object') { bad('record is not an object'); continue; }
    if (!KINDS.includes(r.kind)) bad(`record ${r.id}: unknown kind ${r.kind}`);
    if (!CLASSIFICATIONS.includes(r.classification)) bad(`record ${r.id}: unknown classification ${r.classification}`);
    if (!FAMILIES[r.family]) bad(`record ${r.id}: unknown family ${r.family}`);
    if (typeof r.file !== 'string' || !Number.isInteger(r.line) || r.line < 1) bad(`record ${r.id}: bad location`);
    if (ids.has(r.id)) bad(`duplicate record id ${r.id}`); ids.add(r.id);
    if (prev && compareRecords(prev, r) > 0) bad(`records not sorted at ${r.id}`);
    prev = r;
  }
  if (!a.coverage || typeof a.coverage !== 'object' || !a.coverage.families) bad('coverage missing');
  else {
    if (a.coverage.statement !== COVERAGE_STATEMENT) bad('coverage.statement must state the lower-bound limitation');
    const ku = Array.isArray(a.knownUnobserved) ? a.knownUnobserved : null;
    if (!ku) bad('knownUnobserved must be an array');
    for (const fam of Object.keys(FAMILIES)) {
      const c = a.coverage.families[fam];
      if (!c) { bad(`coverage.families.${fam} missing`); continue; }
      if (c.inventoryComplete !== false) bad(`coverage.families.${fam}.inventoryComplete must be false (a lexical inventory is never complete)`);
      const present = ku ? ku.filter((k) => k.family === fam && k.presentInTree).map((k) => k.id).sort() : [];
      const listed = [...(c.knownUnobservedIds ?? [])].sort();
      if (JSON.stringify(present) !== JSON.stringify(listed)) bad(`coverage.families.${fam}.knownUnobservedIds does not match the present known-unobserved entries`);
      if ((present.length ? 'KNOWN_GAPS' : 'LOWER_BOUND') !== c.ratchetCoverage) bad(`coverage.families.${fam}.ratchetCoverage inconsistent with known-unobserved entries`);
    }
  }
  const direct = a.records.filter((r) => r.kind === 'direct-writer').length;
  if (a.totals.records !== a.records.length) bad('totals.records does not match records.length');
  if (a.totals.directWriters !== direct) bad('totals.directWriters does not match records');
  return problems;
}

/* ------------------------------------------------------------------------------------------ */
/* Human-readable summary                                                                      */
/* ------------------------------------------------------------------------------------------ */

export function renderSummary(a) {
  const L = [];
  L.push(`# TI-4A report-only authority inventory — ${a.sourceRef}`);
  L.push('');
  L.push(`Schema \`${a.schema}\` · config \`${a.configVersion}\` · report-only · ${a.scanned.fileCount} files scanned (${a.scanned.roots.join(', ')}).`);
  L.push('');
  L.push(`Totals: **${a.totals.records}** records — ${a.totals.directWriters} direct writers, ${a.totals.delegatedCalls} delegated calls, ${a.totals.unresolvedUses} unresolved uses; **${a.totals.unclassified}** direct writers are UNCLASSIFIED (not in the Phase 0 census, not an authority file, not a documented exception); ${a.totals.unclassifiedCallers} delegated calls come from files outside the census (informational — calling an authority is the supported path).`);
  L.push('');
  L.push('## By protected family');
  L.push('');
  L.push('| Family | direct writers | delegated calls | unresolved uses | read refs | writers: authority-internal / exception / Phase 0 / UNCLASSIFIED |');
  L.push('|---|---:|---:|---:|---:|---|');
  for (const [fam, row] of Object.entries(a.byFamily)) {
    const c = row.byClassification;
    const w = (k) => c[k]['direct-writer'];
    L.push(`| ${fam} | ${row['direct-writer']} | ${row['delegated-call']} | ${row['unresolved-use']} | ${row.readReferences} | ${w('AUTHORITY_INTERNAL')} / ${w('DOCUMENTED_EXCEPTION')} / ${w('PHASE0_INVENTORIED')} / ${w('UNCLASSIFIED')} |`);
  }
  L.push('');
  L.push('## Files with an UNCLASSIFIED direct writer');
  L.push('');
  const uf = Object.entries(a.unclassifiedFiles);
  if (!uf.length) L.push('None.');
  else for (const [f, fams] of uf) L.push(`- \`${f}\` — ${fams.join(', ')}`);
  L.push('');
  L.push('## Files outside the census with an unresolved use (surfaced, not judged)');
  L.push('');
  const uu = Object.entries(a.unresolvedUseFilesOutsideCensus);
  if (!uu.length) L.push('None.');
  else for (const [f, fams] of uu) L.push(`- \`${f}\` — ${fams.join(', ')}`);
  L.push('');
  L.push('## Coverage limits (machine-readable in the artifact)');
  L.push('');
  L.push(a.coverage.statement);
  L.push('');
  L.push('| Family | ratchet coverage | known-unobserved entries present |');
  L.push('|---|---|---|');
  for (const [fam, c] of Object.entries(a.coverage.families)) L.push(`| ${fam} | ${c.ratchetCoverage} | ${c.knownUnobservedIds.join(', ') || '—'} |`);
  L.push('');
  for (const k of a.knownUnobserved.filter((x) => x.presentInTree)) L.push(`- **${k.id}** (${k.family}, ${k.kind}): ${k.description} — ${k.certificationEffect} Evidence: ${k.matches.slice(0, 4).map((m) => `\`${m.file}:${m.line}\``).join(', ')}`);
  L.push('');
  L.push('## Limitations');
  L.push('');
  for (const x of a.limitations) L.push(`- ${x}`);
  L.push('');
  return L.join('\n');
}

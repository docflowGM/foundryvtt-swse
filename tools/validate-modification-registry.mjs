#!/usr/bin/env node
/**
 * validate-modification-registry.mjs — G1 validator for the immutable v1.5
 * modification registry snapshot (Phase 1b contract, section 3).
 *
 * Reads the registry snapshot and its manifest and reports. It is READ-ONLY:
 * it never writes, repairs, normalizes, re-serializes or ignores anything.
 * Every failure carries a stable code, a JSON-pointer path, and the observed
 * and expected values. The only way a defect in the immutable snapshot may
 * coexist with a passing run is an exact, version-pinned known deviation in
 * the manifest (registry version, error code, path, observed AND expected
 * must all match); each tolerated deviation is listed in the report, and an
 * unexpected failure, a stale or drifted deviation, or an invalid deviation
 * fails validation.
 *
 * This is research-data validation only. Nothing here loads the registry at
 * runtime, and nothing imports this file. Node built-ins only.
 *
 * Usage:  node tools/validate-modification-registry.mjs [--json]
 * Exit:   0 = valid (known deviations, if any, are listed), 1 = invalid.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
export const MANIFEST_PATH = 'data/audits/modification-rolling-authority-v1.5.manifest.json';

const DEVIATION_FIELDS = ['registryVersion', 'errorCode', 'path', 'observed', 'expected', 'reason', 'approvalReference'];
const PENDING = 'PENDING_RULES_TEXT';
const EFFECTS_CERTIFIED = 'EFFECTS_CERTIFIED';
const FULL_CERTIFIED = 'FULL_CERTIFIED';

/* ------------------------------------------------------------------------------------------ */
/* helpers                                                                                    */
/* ------------------------------------------------------------------------------------------ */

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const pointer = (...parts) => '/' + parts.map((p) => String(p).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (isObj(value)) return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value === undefined ? null : value);
}

function tally(items, key) {
  const out = {};
  for (const item of items) {
    const k = String(key(item));
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => compare(a, b)));
}

class Collector {
  constructor() {
    this.failures = [];
  }
  fail(check, code, at, observed, expected) {
    this.failures.push({ check, code, path: at, observed: observed === undefined ? null : observed, expected: expected === undefined ? null : expected });
  }
  /** Compare a measured value with an expected one; deep for plain objects. */
  expectEqual(check, code, at, observed, expected) {
    if (stable(observed) !== stable(expected)) this.fail(check, code, at, observed, expected);
  }
}

/* ------------------------------------------------------------------------------------------ */
/* manifest shape                                                                             */
/* ------------------------------------------------------------------------------------------ */

function checkManifestShape(manifest, c) {
  const need = (cond, at, observed, expected) => {
    if (!cond) c.fail('V1', 'MANIFEST_INVALID', at, observed, expected);
    return cond;
  };
  if (!need(isObj(manifest), '/', manifest, 'object')) return false;
  let ok = true;
  ok = need(manifest.manifestVersion === 1, '/manifestVersion', manifest.manifestVersion, 1) && ok;
  ok = need(isNonEmptyString(manifest.registryVersion), '/registryVersion', manifest.registryVersion, 'nonempty string') && ok;
  ok = need(manifest.runtimeLoading === 'prohibited', '/runtimeLoading', manifest.runtimeLoading, 'prohibited') && ok;
  const files = manifest.files;
  ok = need(isObj(files) && isObj(files.registry) && isObj(files.companionMarkdown), '/files', files, 'registry and companionMarkdown entries') && ok;
  if (isObj(files)) {
    for (const [name, entry] of Object.entries(files)) {
      if (!isObj(entry)) continue;
      ok = need(Number.isInteger(entry.byteLength) && entry.byteLength > 0, pointer('files', name, 'byteLength'), entry.byteLength, 'positive integer') && ok;
      ok = need(typeof entry.sha256 === 'string' && /^[0-9a-f]{64}$/.test(entry.sha256), pointer('files', name, 'sha256'), entry.sha256, '64 lowercase hex characters') && ok;
    }
  }
  ok = need(isObj(manifest.expected) && isObj(manifest.expected.counts) && isObj(manifest.expected.vocabularies), '/expected', manifest.expected, 'counts and vocabularies') && ok;
  ok = need(Array.isArray(manifest.knownDeviations), '/knownDeviations', manifest.knownDeviations, 'array') && ok;
  ok = need(Array.isArray(manifest.slotCostPageAttestations), '/slotCostPageAttestations', manifest.slotCostPageAttestations, 'array') && ok;
  // The Markdown is supplementary: it must never be represented as original-byte certified.
  if (isObj(files) && isObj(files.companionMarkdown)) {
    const v = files.companionMarkdown.originalByteVerification;
    if (v !== 'waived-by-owner') c.fail('V1', 'MARKDOWN_VERIFICATION_OVERSTATED', '/files/companionMarkdown/originalByteVerification', v, 'waived-by-owner');
  }
  return ok;
}

/* ------------------------------------------------------------------------------------------ */
/* the registry checks                                                                        */
/* ------------------------------------------------------------------------------------------ */

function checkRegistry(registry, manifest, c, measured) {
  const exp = manifest.expected;
  const voc = exp.vocabularies;
  const defs = Array.isArray(registry.definitions) ? registry.definitions : null;
  const procs = Array.isArray(registry.procedures) ? registry.procedures : null;
  if (!defs || !procs) {
    c.fail('V4', 'REGISTRY_SHAPE_INVALID', '/', { definitions: defs ? 'array' : typeof registry.definitions, procedures: procs ? 'array' : typeof registry.procedures }, 'definitions and procedures arrays');
    return;
  }

  // V1 (content identity within the parsed registry)
  if (registry.version !== manifest.registryVersion) c.fail('V1', 'REGISTRY_VERSION_MISMATCH', '/version', registry.version, manifest.registryVersion);

  // V3 uniqueness
  const dupes = (items, code, base) => {
    const seen = new Map();
    items.forEach((x, i) => {
      const id = x?.id;
      if (seen.has(id)) c.fail('V3', code, pointer(base, i, 'id'), id, 'unique');
      else seen.set(id, i);
    });
    return seen;
  };
  const defIds = dupes(defs, 'DUPLICATE_DEFINITION_ID', 'definitions');
  const procIds = dupes(procs, 'DUPLICATE_PROCEDURE_ID', 'procedures');
  for (const id of defIds.keys()) if (procIds.has(id)) c.fail('V3', 'ID_SHARED_DEFINITION_PROCEDURE', pointer('definitions', defIds.get(id), 'id'), id, 'not shared with a procedure');

  const typed = [];
  const typedIds = new Map();
  defs.forEach((d, i) => {
    // V4 required fields
    for (const key of registry.definitionsSchema?.required ?? []) {
      if (!(key in d)) c.fail('V4', 'MISSING_REQUIRED_FIELD', pointer('definitions', i, key), null, 'present');
    }
    // V5 domain separation
    const td = isObj(d.typedDefinitions) ? d.typedDefinitions : {};
    const keys = Object.keys(td).sort();
    for (const k of keys) {
      if (!voc.domains.includes(k)) c.fail('V5', 'UNKNOWN_DOMAIN_KEY', pointer('definitions', i, 'typedDefinitions', k), k, voc.domains);
      const t = td[k];
      typed.push({ d, i, k, t });
      if (isObj(t)) {
        if (t.domain !== k) c.fail('V5', 'TYPED_DOMAIN_MISMATCH', pointer('definitions', i, 'typedDefinitions', k, 'domain'), t.domain, k);
        const wantId = `${d.id}::${k}`;
        if (t.definitionId !== wantId) c.fail('V3', 'TYPED_ID_MISMATCH', pointer('definitions', i, 'typedDefinitions', k, 'definitionId'), t.definitionId, wantId);
        if (typedIds.has(t.definitionId)) c.fail('V3', 'DUPLICATE_TYPED_DEFINITION_ID', pointer('definitions', i, 'typedDefinitions', k, 'definitionId'), t.definitionId, 'unique');
        else typedIds.set(t.definitionId, i);
      }
    }
    const cand = Array.isArray(d.candidateHostDomains) ? [...d.candidateHostDomains].sort() : null;
    if (stable(cand) !== stable(keys)) c.fail('V5', 'CANDIDATE_DOMAINS_MISMATCH', pointer('definitions', i, 'candidateHostDomains'), cand, keys);
  });

  // V6 references
  const books = new Set((registry.bookLedger ?? []).map((b) => b?.id));
  const families = new Set(registry.sourceFamilies ?? []);
  const pageOk = (p) => p === null || p === undefined || (Number.isInteger(p) && p > 0);
  defs.forEach((d, i) => {
    if (!books.has(d.source?.bookId)) c.fail('V6', 'REF_BOOK_UNDECLARED', pointer('definitions', i, 'source', 'bookId'), d.source?.bookId ?? null, 'member of bookLedger');
    if (!families.has(d.sourceFamily)) c.fail('V6', 'REF_SOURCE_FAMILY_UNDECLARED', pointer('definitions', i, 'sourceFamily'), d.sourceFamily ?? null, 'member of sourceFamilies');
    const procedureId = d.originalCost?.procedureId;
    if (procedureId !== undefined && !procIds.has(procedureId)) c.fail('V6', 'REF_PROCEDURE_UNRESOLVED', pointer('definitions', i, 'originalCost', 'procedureId'), procedureId, 'member of procedures');
    for (const field of ['printedTablePage', 'rulesPage']) {
      if (!pageOk(d.source?.[field])) c.fail('V6', 'PAGE_NUMBER_INVALID', pointer('definitions', i, 'source', field), d.source[field], 'positive integer or null');
    }
  });
  procs.forEach((p, i) => {
    if (!books.has(p.bookId)) c.fail('V6', 'REF_BOOK_UNDECLARED', pointer('procedures', i, 'bookId'), p.bookId ?? null, 'member of bookLedger');
    if (!Array.isArray(p.sourcePages) || p.sourcePages.some((n) => !(Number.isInteger(n) && n > 0))) c.fail('V6', 'PAGE_NUMBER_INVALID', pointer('procedures', i, 'sourcePages'), p.sourcePages ?? null, 'array of positive integers');
  });

  // V7 certification-state consistency
  const allowed = registry.definitionsSchema?.allowedCertificationStates ?? [];
  defs.forEach((d, i) => {
    const mc = d.mechanicalCertification;
    if (!allowed.includes(mc)) c.fail('V7', 'CERT_STATE_INVALID', pointer('definitions', i, 'mechanicalCertification'), mc ?? null, allowed);
    if (mc === FULL_CERTIFIED) c.fail('V7', 'FULL_CERTIFIED_PRESENT', pointer('definitions', i, 'mechanicalCertification'), mc, 'zero fully runtime-certified definitions');
    if (mc === PENDING && !['CATALOGED_NOT_EXECUTABLE', 'EXCLUDED_SCOPE'].includes(d.currentStatus)) c.fail('V7', 'PENDING_STATUS_INCONSISTENT', pointer('definitions', i, 'currentStatus'), d.currentStatus ?? null, ['CATALOGED_NOT_EXECUTABLE', 'EXCLUDED_SCOPE']);
    if (mc === EFFECTS_CERTIFIED && d.currentStatus !== 'SOURCE_RULES_CERTIFIED_RUNTIME_NOT_MAPPED') c.fail('V7', 'EFFECTS_CERTIFIED_STATUS_INCONSISTENT', pointer('definitions', i, 'currentStatus'), d.currentStatus ?? null, 'SOURCE_RULES_CERTIFIED_RUNTIME_NOT_MAPPED');
  });
  typed.forEach(({ d, i, k, t }) => {
    if (!isObj(t)) return;
    const base = pointer('definitions', i, 'typedDefinitions', k);
    if (d.mechanicalCertification === PENDING) {
      if (!Array.isArray(t.effectOperations) || t.effectOperations.length > 0) c.fail('V7', 'PENDING_EFFECTS_NONEMPTY', `${base}/effectOperations`, t.effectOperations ?? null, 'empty array');
      if (t.effectStatus !== 'PENDING') c.fail('V7', 'PENDING_EFFECT_STATUS_INCONSISTENT', `${base}/effectStatus`, t.effectStatus ?? null, 'PENDING');
    }
    if (!voc.consumerStatus.includes(t.consumerStatus)) c.fail('V7', 'CONSUMER_STATUS_UNRECOGNIZED', `${base}/consumerStatus`, t.consumerStatus ?? null, voc.consumerStatus);
    if (!voc.effectStatus.includes(t.effectStatus)) c.fail('V7', 'EFFECT_STATUS_UNRECOGNIZED', `${base}/effectStatus`, t.effectStatus ?? null, voc.effectStatus);
  });

  // V8 slot-cost shape, V9 price shape
  defs.forEach((d, i) => {
    const s = d.originalSlotCost;
    if (!isObj(s) || !voc.slotCostTypes.includes(s.type)) c.fail('V8', 'SLOT_COST_TYPE_UNKNOWN', pointer('definitions', i, 'originalSlotCost', 'type'), s?.type ?? null, voc.slotCostTypes);
    else if (s.type === 'fixed' && !(Number.isInteger(s.slots) && s.slots >= 0)) c.fail('V8', 'FIXED_SLOT_INVALID', pointer('definitions', i, 'originalSlotCost', 'slots'), s.slots ?? null, 'integer >= 0');
    const o = d.originalCost;
    if (!isObj(o) || !voc.priceTypes.includes(o.type)) c.fail('V9', 'PRICE_TYPE_UNKNOWN', pointer('definitions', i, 'originalCost', 'type'), o?.type ?? null, voc.priceTypes);
    else if (o.type === 'credits' && !(typeof o.amount === 'number' && Number.isFinite(o.amount) && o.amount >= 0)) c.fail('V9', 'CREDITS_AMOUNT_INVALID', pointer('definitions', i, 'originalCost', 'amount'), o.amount ?? null, 'finite number >= 0');
    else if (o.type === 'not_stated' && o.amount !== undefined && o.amount !== null) c.fail('V9', 'UNSTATED_PRICE_HAS_AMOUNT', pointer('definitions', i, 'originalCost', 'amount'), o.amount, 'null or absent (an unstated price is unknown, never a number)');
  });

  // V2 counts (measured, then compared with the manifest and with the registry's own summary)
  const excludedRole = exp.eligibleCandidateRule?.excludedSourceRole;
  const eligible = typed.filter(({ d }) => d.sourceRole !== excludedRole);
  const byDomain = (list) => ({ total: list.length, equipment: list.filter((x) => x.k === 'equipment').length, weapon: list.filter((x) => x.k === 'weapon').length, armor: list.filter((x) => x.k === 'armor').length });
  const excludedIds = defs.filter((d) => d.sourceRole === excludedRole).map((d) => d.id).sort();
  Object.assign(measured, {
    definitions: defs.length,
    procedures: procs.length,
    mechanicalCertification: tally(defs, (d) => d.mechanicalCertification),
    tableCertification: tally(defs, (d) => d.tableCertification),
    procedureStatus: tally(procs, (p) => p.status),
    scumAndVillainyDefinitions: defs.filter((d) => d.source?.bookId === 'scum-and-villainy').length,
    typedDefinitions: byDomain(typed),
    eligibleUpgradeCandidates: byDomain(eligible),
    excludedDefinitionIds: excludedIds,
    fullyExecutableCertified: defs.filter((d) => d.mechanicalCertification === FULL_CERTIFIED).length
  });
  const e = exp.counts;
  c.expectEqual('V2', 'COUNT_MISMATCH', '/definitions', measured.definitions, e.definitions);
  c.expectEqual('V2', 'COUNT_MISMATCH', '/procedures', measured.procedures, e.procedures);
  c.expectEqual('V2', 'COUNT_MISMATCH', '/definitions/*/mechanicalCertification', measured.mechanicalCertification, e.mechanicalCertification);
  c.expectEqual('V2', 'COUNT_MISMATCH', '/definitions/*/tableCertification', measured.tableCertification, e.tableCertification);
  c.expectEqual('V2', 'COUNT_MISMATCH', '/procedures/*/status', measured.procedureStatus, e.procedureStatus);
  c.expectEqual('V2', 'COUNT_MISMATCH', '/definitions/*/source/bookId=scum-and-villainy', measured.scumAndVillainyDefinitions, e.scumAndVillainyDefinitions);
  c.expectEqual('V2', 'COUNT_MISMATCH', '/definitions/*/typedDefinitions', measured.typedDefinitions, e.typedDefinitions);
  c.expectEqual('V2', 'COUNT_MISMATCH', '/definitions/*/typedDefinitions[eligible]', measured.eligibleUpgradeCandidates, e.eligibleUpgradeCandidates);
  c.expectEqual('V2', 'COUNT_MISMATCH', '/definitions/*/sourceRole=excluded', measured.excludedDefinitionIds, [...(exp.eligibleCandidateRule?.excludedDefinitionIds ?? [])].sort());
  c.expectEqual('V2', 'COUNT_MISMATCH', '/fullyExecutableCertified', measured.fullyExecutableCertified, e.fullyExecutableCertified);
  // The registry's own summary must agree with the defined populations (232 raw typed versus 231 eligible is a rule, not a tolerance).
  const summary = registry.indexSummary ?? {};
  const agree = exp.registrySummaryAgreement ?? {};
  const derived = {
    totalSourceEntries: defs.length,
    tableCertified: defs.filter((d) => ['TABLE_VERIFIED', 'SOURCE_TABLE_ROW_AND_RULE_TEXT_VERIFIED'].includes(d.tableCertification)).length,
    mechanicallyCertified: defs.filter((d) => d.mechanicalCertification === EFFECTS_CERTIFIED).length,
    excludedFromScope: defs.filter((d) => d.currentStatus === 'EXCLUDED_SCOPE').length,
    eligibleCandidateDomainVariants: eligible.length,
    domainCandidateCounts: { equipment: byDomain(eligible).equipment, weapon: byDomain(eligible).weapon, armor: byDomain(eligible).armor },
    separateProceduresCertified: procs.filter((p) => ['SOURCE_RULES_CERTIFIED', 'SOURCE_RULES_CERTIFIED_RUNTIME_PENDING'].includes(p.status)).length,
    fullyExecutableCertified: measured.fullyExecutableCertified
  };
  for (const key of Object.keys(agree).sort()) {
    c.expectEqual('V2', 'SUMMARY_DISAGREES_WITH_MEASURED', pointer('indexSummary', key), summary[key] ?? null, derived[key]);
    c.expectEqual('V2', 'MANIFEST_SUMMARY_DISAGREES', pointer('indexSummary', key), summary[key] ?? null, agree[key]);
  }
}

/* ------------------------------------------------------------------------------------------ */
/* known deviations                                                                           */
/* ------------------------------------------------------------------------------------------ */

function applyDeviations(manifest, c) {
  const deviations = manifest.knownDeviations;
  const invalid = [];
  const usable = [];
  const seen = new Set();
  deviations.forEach((dev, i) => {
    const problems = !isObj(dev) ? ['not an object'] : DEVIATION_FIELDS.filter((f) => dev[f] === undefined || dev[f] === null || (typeof dev[f] === 'string' && !dev[f].trim()));
    if (problems.length) {
      invalid.push({ code: 'DEVIATION_INVALID', index: i, missing: problems });
      return;
    }
    if (dev.registryVersion !== manifest.registryVersion) {
      invalid.push({ code: 'DEVIATION_VERSION_MISMATCH', index: i, observed: dev.registryVersion, expected: manifest.registryVersion });
      return;
    }
    const key = stable([dev.registryVersion, dev.errorCode, dev.path, dev.observed, dev.expected]);
    if (seen.has(key)) {
      invalid.push({ code: 'DEVIATION_DUPLICATE', index: i, path: dev.path });
      return;
    }
    seen.add(key);
    usable.push({ dev, index: i, key });
  });

  const matched = [];
  const unexpected = [];
  const used = new Set();
  for (const f of c.failures) {
    const key = stable([manifest.registryVersion, f.code, f.path, f.observed, f.expected]);
    const hit = usable.find((u) => u.key === key && !used.has(u.index));
    if (hit) {
      used.add(hit.index);
      matched.push({ ...hit.dev, check: f.check });
    } else {
      unexpected.push(f);
    }
  }
  const stale = usable
    .filter((u) => !used.has(u.index))
    .map((u) => ({ index: u.index, errorCode: u.dev.errorCode, path: u.dev.path, observed: u.dev.observed, expected: u.dev.expected }));
  return { matched, unexpected, stale, invalid };
}

/* ------------------------------------------------------------------------------------------ */
/* entry point                                                                                */
/* ------------------------------------------------------------------------------------------ */

/**
 * @param {{ registryBytes: Buffer, markdownBytes?: Buffer|null, manifest: object }} input
 * @returns {object} a deterministic, JSON-serializable report
 */
export function validateRegistry({ registryBytes, markdownBytes = null, manifest }) {
  const c = new Collector();
  const measured = {};
  const identity = { registry: null, companionMarkdown: null };
  let registry = null;

  const shapeOk = checkManifestShape(manifest, c);
  if (shapeOk) {
    const f = manifest.files;
    identity.registry = { byteLength: registryBytes?.length ?? null, sha256: registryBytes ? sha256(registryBytes) : null, verification: f.registry.verification ?? null };
    // V1 integrity: length and SHA-256 over the exact bytes.
    if (!Buffer.isBuffer(registryBytes)) c.fail('V1', 'REGISTRY_UNREADABLE', pointer('files', 'registry'), null, 'bytes');
    else {
      c.expectEqual('V1', 'REGISTRY_LENGTH_MISMATCH', '/files/registry/byteLength', registryBytes.length, f.registry.byteLength);
      c.expectEqual('V1', 'REGISTRY_HASH_MISMATCH', '/files/registry/sha256', identity.registry.sha256, f.registry.sha256);
      try {
        registry = JSON.parse(registryBytes.toString('utf8'));
      } catch (err) {
        c.fail('V1', 'REGISTRY_UNPARSEABLE', '/files/registry', String(err.message).slice(0, 120), 'valid JSON');
      }
    }
    // The Markdown is supplementary: only its committed identity is checked, never original-byte identity.
    if (markdownBytes !== null) {
      identity.companionMarkdown = { byteLength: markdownBytes.length, sha256: sha256(markdownBytes), originalByteVerification: f.companionMarkdown.originalByteVerification ?? null };
      c.expectEqual('V1', 'MARKDOWN_LENGTH_MISMATCH', '/files/companionMarkdown/byteLength', markdownBytes.length, f.companionMarkdown.byteLength);
      c.expectEqual('V1', 'MARKDOWN_HASH_MISMATCH', '/files/companionMarkdown/sha256', identity.companionMarkdown.sha256, f.companionMarkdown.sha256);
    } else {
      c.fail('V1', 'MARKDOWN_UNREADABLE', '/files/companionMarkdown', null, 'bytes');
    }
    if (registry && isObj(registry)) checkRegistry(registry, manifest, c, measured);
    else if (registry !== null) c.fail('V1', 'REGISTRY_UNPARSEABLE', '/files/registry', typeof registry, 'object');
  }

  const failures = [...c.failures].sort((a, b) => compare(a.code, b.code) || compare(a.path, b.path) || compare(stable(a.observed), stable(b.observed)));
  c.failures = failures;
  let deviations = { matched: [], unexpected: failures, stale: [], invalid: [] };
  if (shapeOk && Array.isArray(manifest.knownDeviations)) deviations = applyDeviations(manifest, c);

  const ok =
    shapeOk && deviations.unexpected.length === 0 && deviations.stale.length === 0 && deviations.invalid.length === 0;
  return {
    ok,
    registryVersion: isObj(manifest) ? manifest.registryVersion ?? null : null,
    identity,
    measured,
    nonApplicable: ['V10 (no crosswalk exists in G1)'],
    matchedKnownDeviations: deviations.matched,
    unexpectedFailures: deviations.unexpected,
    staleKnownDeviations: deviations.stale,
    invalidKnownDeviations: deviations.invalid
  };
}

/* ------------------------------------------------------------------------------------------ */
/* CLI                                                                                        */
/* ------------------------------------------------------------------------------------------ */

function formatReport(r) {
  const lines = [];
  lines.push('MODIFICATION REGISTRY VALIDATION (G1)');
  lines.push(`registry version : ${r.registryVersion}`);
  if (r.identity.registry) lines.push(`registry JSON    : ${r.identity.registry.byteLength} bytes, sha256 ${r.identity.registry.sha256}`);
  if (r.identity.companionMarkdown) lines.push(`companion MD     : ${r.identity.companionMarkdown.byteLength} bytes, sha256 ${r.identity.companionMarkdown.sha256} (committed identity only; original-byte verification: ${r.identity.companionMarkdown.originalByteVerification})`);
  const m = r.measured;
  if (m.definitions !== undefined) {
    lines.push(`definitions      : ${m.definitions}   procedures: ${m.procedures}   scum rows: ${m.scumAndVillainyDefinitions}`);
    lines.push(`mechanical cert  : ${JSON.stringify(m.mechanicalCertification)}   fully executable: ${m.fullyExecutableCertified}`);
    lines.push(`typed definitions: ${JSON.stringify(m.typedDefinitions)}`);
    lines.push(`eligible upgrade candidates: ${JSON.stringify(m.eligibleUpgradeCandidates)}   excluded: ${JSON.stringify(m.excludedDefinitionIds)}`);
  }
  lines.push(`not applicable   : ${r.nonApplicable.join('; ')}`);
  lines.push(`known deviations tolerated (${r.matchedKnownDeviations.length}):`);
  for (const d of r.matchedKnownDeviations) lines.push(`  - ${d.errorCode} ${d.path} observed=${JSON.stringify(d.observed)} expected=${JSON.stringify(d.expected)}`);
  for (const f of r.unexpectedFailures) lines.push(`FAIL ${f.check} ${f.code} ${f.path} observed=${JSON.stringify(f.observed)} expected=${JSON.stringify(f.expected)}`);
  for (const s of r.staleKnownDeviations) lines.push(`FAIL STALE_KNOWN_DEVIATION ${s.errorCode} ${s.path} observed=${JSON.stringify(s.observed)} expected=${JSON.stringify(s.expected)}`);
  for (const i of r.invalidKnownDeviations) lines.push(`FAIL ${i.code} #${i.index} ${JSON.stringify(i)}`);
  lines.push(r.ok ? 'RESULT: VALID' : 'RESULT: INVALID');
  return lines.join('\n');
}

function main() {
  const asJson = process.argv.includes('--json');
  const readBytes = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel)) : null);
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST_PATH), 'utf8'));
  } catch (err) {
    console.error(`FAIL MANIFEST_UNREADABLE ${MANIFEST_PATH}: ${err.message}`);
    process.exit(1);
  }
  const report = validateRegistry({
    registryBytes: readBytes(manifest?.files?.registry?.path ?? ''),
    markdownBytes: readBytes(manifest?.files?.companionMarkdown?.path ?? ''),
    manifest
  });
  console.log(asJson ? JSON.stringify(report, null, 2) : formatReport(report));
  process.exit(report.ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

/**
 * ModificationCatalog -- G3 (offline, read-only).
 *
 * An in-memory, frozen read model over a `swse.modification.runtime/1` document that the CALLER passes in. This module
 * loads nothing: it has no imports, no fetch, no file access and no knowledge of where the document came from. The
 * only production loader will be gate G8 (independent approval); until then nothing under scripts/ constructs a
 * catalog from real data. The catalog checks the document's internal consistency and fails closed, but it does NOT
 * verify provenance or integrity -- that is the loader's job (architecture 4.5) -- and it makes no rules decisions.
 */

export const RUNTIME_SCHEMA_ID = 'swse.modification.runtime/1';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim().length > 0;

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

/** @returns {string[]} problem codes; empty means the document is internally consistent */
export function checkRuntimeDocument(doc) {
  const problems = [];
  if (!isObject(doc) || !isObject(doc.header) || !Array.isArray(doc.records)) return ['DOCUMENT_SHAPE_INVALID'];
  if (doc.header.schema !== RUNTIME_SCHEMA_ID) problems.push('SCHEMA_MISMATCH');
  const parents = new Set();
  const typedIds = new Set();
  doc.records.forEach((r, i) => {
    if (!isObject(r) || !isText(r.definitionId) || !isObject(r.domains)) return problems.push(`RECORD_INVALID:${i}`);
    if (parents.has(r.definitionId)) problems.push(`DEFINITION_ID_DUPLICATE:${r.definitionId}`);
    parents.add(r.definitionId);
    if ('runtimeSelectable' in r) problems.push(`PARENT_LEVEL_SELECTABLE:${r.definitionId}`);
    for (const [domain, d] of Object.entries(r.domains)) {
      if (!['weapon', 'armor', 'equipment'].includes(domain)) problems.push(`DOMAIN_UNKNOWN:${r.definitionId}:${domain}`);
      if (!isObject(d) || d.typedDefinitionId !== `${r.definitionId}::${domain}` || d.domain !== domain) problems.push(`TYPED_ID_INVALID:${r.definitionId}:${domain}`);
      else if (typedIds.has(d.typedDefinitionId)) problems.push(`TYPED_ID_DUPLICATE:${d.typedDefinitionId}`);
      else typedIds.add(d.typedDefinitionId);
      if (!isObject(d) || typeof d.runtimeSelectable !== 'boolean') problems.push(`SELECTABLE_NOT_BOOLEAN:${r.definitionId}:${domain}`);
      if (isObject(d) && d.applicability?.hostEligibility !== 'not_established') problems.push(`HOST_ELIGIBILITY_ESTABLISHED:${r.definitionId}:${domain}`);
    }
  });
  return problems;
}

/**
 * @param {object} document a swse.modification.runtime/1 document supplied by the caller
 * @returns {{ ok: true, catalog: object } | { ok: false, problems: string[] }}
 */
export function createModificationCatalog(document) {
  const problems = checkRuntimeDocument(document);
  if (problems.length) return { ok: false, problems };
  const doc = deepFreeze(structuredClone(document));
  const byParent = new Map();
  const byTyped = new Map();
  for (const record of doc.records) {
    byParent.set(record.definitionId, record);
    for (const [domain, typed] of Object.entries(record.domains)) byTyped.set(typed.typedDefinitionId, Object.freeze({ parent: record, domain, typed }));
  }
  const sortedTypedIds = [...byTyped.keys()].sort();
  const catalog = Object.freeze({
    /** Informational only; the catalog does not verify it. */
    provenance: Object.freeze({ schema: doc.header.schema, registry: doc.header.registry, validator: doc.header.validator, recordsSha256: doc.header.recordsSha256, integrity: 'not-verified-by-catalog' }),
    counts: Object.freeze({ records: doc.records.length, typedDefinitions: byTyped.size }),
    getDefinition: (definitionId) => byParent.get(definitionId) ?? null,
    getTyped: (typedDefinitionId) => byTyped.get(typedDefinitionId) ?? null,
    /** Typed ids, sorted; optional exact-match filters. */
    listTyped: ({ domain = null, runtimeSelectable = null, accountingEligible = null } = {}) =>
      sortedTypedIds.filter((id) => {
        const { typed, domain: d } = byTyped.get(id);
        return (domain === null || d === domain) && (runtimeSelectable === null || typed.runtimeSelectable === runtimeSelectable) && (accountingEligible === null || typed.accounting.eligible === accountingEligible);
      })
  });
  return { ok: true, catalog };
}

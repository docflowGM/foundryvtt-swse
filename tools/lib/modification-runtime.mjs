// G2: canonical V2 modification runtime definitions — pure derivation and validation (V10').
//
// Offline and read-only. No filesystem, no Foundry, no runtime imports. The generator CLI
// (tools/build-modification-runtime.mjs) supplies bytes that the G1 validator has already accepted.
//
// Authority: docs/audits/modification-v2-replacement-architecture.md (sections 3, 4) and the Phase 1b contract
// (section 6.2 slot-cost predicate). This module only COPIES registry facts and DERIVES the fields those
// documents define. It never sets a rules decision: MECHANIC_SPECIFIED / IMPLEMENTED / OFFLINE_TESTED /
// FOUNDRY_TESTED / runtimeSelectable can come only from the hand-maintained ledger and specification records,
// and runtimeSelectable additionally requires every architecture 3.4 condition.

import crypto from 'node:crypto';
import { isTrustedSnapshot } from './modification-snapshot-producer.mjs';

export const RUNTIME_SCHEMA_ID = 'swse.modification.runtime/1';
export const LEDGER_SCHEMA_ID = 'swse.modification.status-ledger/1';
export const SPECS_SCHEMA_ID = 'swse.modification.specification-records/1';
export const GENERATOR_VERSION = '1.1.0';

export const DOMAINS = Object.freeze(['weapon', 'armor', 'equipment']);
export const COMPONENTS = Object.freeze(['cost', 'description', 'hostPrerequisites', 'executableEffect', 'installProcedure']);
export const CLASSIFICATIONS = Object.freeze(['PENDING_SOURCE_VERIFICATION', 'DEFERRED_RULES_REVIEW']);
export const FLAGS = Object.freeze(['SOURCE_VERIFIED', 'DATA_RECONCILED', 'MECHANIC_SPECIFIED', 'IMPLEMENTED', 'OFFLINE_TESTED', 'FOUNDRY_TESTED']);

const EXCLUDED_ROLE = 'temporary_talent_actuator_not_installed_upgrade';
const TABLE_CERT_OK = new Set(['TABLE_VERIFIED', 'SOURCE_TABLE_ROW_AND_RULE_TEXT_VERIFIED']);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const clone = (v) => JSON.parse(JSON.stringify(v));

export const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

/** Canonical serialization: deterministic (construction order is fixed in code), one trailing newline. */
export const canonicalJson = (value) => `${JSON.stringify(value, null, 1)}\n`;

/** Deep structural equality for JSON values. */
export function jsonEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => jsonEqual(v, b[i]));
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && jsonEqual(a[k], b[k]));
  }
  return false;
}

/* ------------------------------------------------------------------------------------------ */
/* Register parsing (docs/audits/swse-rules-decisions-pending.md)                              */
/* ------------------------------------------------------------------------------------------ */

/**
 * Parses the append-only register. Each entry yields:
 *   classifications : tokens of the "Review classification" row
 *   scope           : the machine-readable "Ledger scope" row (component + which typed definitions the entry blocks), or null
 *   lift            : the "Blocker lifted" row, or null. A blocker is lifted ONLY by a valid lift row
 *                     (PENDING_SOURCE_VERIFICATION needs source= and evidence=; DEFERRED_RULES_REVIEW needs owner-ruling=).
 * @returns {Map<string, { classifications: string[], scope: object|null, lift: object|null, liftValid: boolean }>}
 */
export function parseRegister(markdown) {
  const out = new Map();
  const text = String(markdown ?? '');
  const sections = text.split(/^## (?=D-\d{3} )/m).slice(1);
  for (const s of sections) {
    const id = /^(D-\d{3}) /.exec(s)?.[1];
    if (!id) continue;
    const row = (label) => new RegExp(`^\\| ${label} \\| (.*?) \\|\\s*$`, 'm').exec(s)?.[1] ?? null;
    const clsRow = /^\| Review classification \(rev\. 2\) \| (.*)$/m.exec(s)?.[1] ?? '';
    const classifications = [...clsRow.split(' — ')[0].matchAll(/`([A-Z_]+)`/g)].map((m) => m[1]).filter((t) => CLASSIFICATIONS.includes(t));
    const fields = (v) => {
      if (v === null) return null;
      const o = {};
      for (const part of v.split(';')) {
        const i = part.indexOf('=');
        if (i > 0) o[part.slice(0, i).trim()] = part.slice(i + 1).trim();
      }
      return o;
    };
    const scopeRaw = fields(row('Ledger scope'));
    let scope = null;
    if (scopeRaw && COMPONENTS.includes(scopeRaw.component)) {
      if (scopeRaw.definitions === 'ALL') scope = { component: scopeRaw.component, kind: 'all' };
      else if (scopeRaw.definitions) scope = { component: scopeRaw.component, kind: 'definitions', ids: scopeRaw.definitions.split(',').map((x) => x.trim()).filter(Boolean) };
      else if (scopeRaw.slotPools) scope = { component: scopeRaw.component, kind: 'slotPools', pools: scopeRaw.slotPools.split(',').map((x) => x.trim()).filter(Boolean) };
    }
    const lift = fields(row('Blocker lifted'));
    let liftValid = false;
    if (lift) {
      const need = [];
      if (classifications.includes('PENDING_SOURCE_VERIFICATION')) need.push('source', 'evidence');
      if (classifications.includes('DEFERRED_RULES_REVIEW')) need.push('owner-ruling');
      liftValid = need.length > 0 && need.every((k) => typeof lift[k] === 'string' && lift[k].length > 0);
    }
    out.set(id, { classifications, scope, lift, liftValid });
  }
  return out;
}

/** Typed definition ids that a register scope covers (null when the scope names an unknown definition). */
export function scopeTargets(scope, registry) {
  const all = [];
  for (const d of registry.definitions) for (const t of Object.values(d.typedDefinitions ?? {})) all.push({ id: t.definitionId, parent: d.id, pool: t.slotPoolId ?? null });
  if (scope.kind === 'all') return new Set(all.map((x) => x.id));
  if (scope.kind === 'definitions') {
    const known = new Set(registry.definitions.map((d) => d.id));
    if (scope.ids.some((x) => !known.has(x))) return null;
    return new Set(all.filter((x) => scope.ids.includes(x.parent)).map((x) => x.id));
  }
  return new Set(all.filter((x) => x.pool !== null && scope.pools.includes(x.pool)).map((x) => x.id));
}

/* ------------------------------------------------------------------------------------------ */
/* Ledger and specification-record validation                                                  */
/* ------------------------------------------------------------------------------------------ */

function fail(failures, code, path, detail) {
  failures.push({ code, path, detail: detail === undefined ? null : detail });
}

function typedIdSet(registry) {
  const ids = new Map();
  for (const d of registry.definitions) {
    for (const [domain, t] of Object.entries(d.typedDefinitions ?? {})) ids.set(t.definitionId, { parentId: d.id, domain });
  }
  return ids;
}

/** Validates the hand-maintained inputs; returns failures (empty = valid). Never throws. */
export function validateInputs({ registry, ledger, specs, register }) {
  const f = [];
  const typed = typedIdSet(registry);
  try {
    if (!isObj(ledger) || ledger.schema !== LEDGER_SCHEMA_ID) fail(f, 'LEDGER_SCHEMA_INVALID', '/ledger');
    else {
      if (ledger.registryVersion !== registry.version) fail(f, 'LEDGER_REGISTRY_VERSION_MISMATCH', '/ledger/registryVersion', ledger.registryVersion);
      for (const key of ['blockers', 'implementation', 'selectable']) if (!Array.isArray(ledger[key])) fail(f, 'LEDGER_SECTION_INVALID', `/ledger/${key}`);
    }
    if (!isObj(specs) || specs.schema !== SPECS_SCHEMA_ID) fail(f, 'SPECS_SCHEMA_INVALID', '/specs');
    else {
      if (specs.registryVersion !== registry.version) fail(f, 'SPECS_REGISTRY_VERSION_MISMATCH', '/specs/registryVersion', specs.registryVersion);
      if (!Array.isArray(specs.records)) fail(f, 'SPECS_SECTION_INVALID', '/specs/records');
    }
    if (f.length) return f;

    const blockedKeys = new Set();
    ledger.blockers.forEach((b, i) => {
      const p = `/ledger/blockers/${i}`;
      if (!isObj(b)) return fail(f, 'BLOCKER_NOT_OBJECT', p);
      if (!register.has(b.register)) fail(f, 'BLOCKER_REGISTER_ID_UNKNOWN', `${p}/register`, b.register);
      else if (!register.get(b.register).classifications.includes(b.classification)) fail(f, 'BLOCKER_CLASSIFICATION_MISMATCH', `${p}/classification`, { declared: b.classification, register: register.get(b.register).classifications });
      if (!CLASSIFICATIONS.includes(b.classification)) fail(f, 'BLOCKER_CLASSIFICATION_INVALID', `${p}/classification`, b.classification);
      if (!COMPONENTS.includes(b.component)) fail(f, 'BLOCKER_COMPONENT_INVALID', `${p}/component`, b.component);
      const all = b.appliesToAllTypedDefinitions === true;
      const ids = b.typedDefinitionIds;
      if (all === Array.isArray(ids)) fail(f, 'BLOCKER_TARGET_INVALID', p, 'exactly one of appliesToAllTypedDefinitions:true or typedDefinitionIds[]');
      else if (!all) {
        if (ids.length === 0) fail(f, 'BLOCKER_TARGET_EMPTY', p);
        for (const id of ids) if (!typed.has(id)) fail(f, 'BLOCKER_TYPED_ID_UNKNOWN', p, id);
      }
      const targets = all ? [...typed.keys()] : Array.isArray(ids) ? ids : [];
      for (const id of targets) blockedKeys.add(`${id}|${b.component}`);
    });

    // An open register entry stays authoritative: its blocker scope must be present in the ledger in full, and only a
    // documented lift row in the (append-only) register can remove it. The ledger can never clear a blocker by omission.
    const ledgerCover = new Map();
    ledger.blockers.forEach((b) => {
      if (!isObj(b) || !COMPONENTS.includes(b.component)) return;
      const key = `${b.register}|${b.component}`;
      if (!ledgerCover.has(key)) ledgerCover.set(key, new Set());
      const targets = b.appliesToAllTypedDefinitions === true ? [...typed.keys()] : Array.isArray(b.typedDefinitionIds) ? b.typedDefinitionIds : [];
      for (const t of targets) ledgerCover.get(key).add(t);
    });
    const scoped = new Set();
    for (const [regId, entry] of register) {
      if (!entry.scope) continue;
      scoped.add(regId);
      if (entry.lift && !entry.liftValid) fail(f, 'REGISTER_LIFT_INVALID', `/register/${regId}`, 'a "Blocker lifted" row needs source= and evidence= (pending) and/or owner-ruling= (deferred)');
      const have = ledgerCover.get(`${regId}|${entry.scope.component}`) ?? new Set();
      if (entry.liftValid) {
        if (have.size) fail(f, 'BLOCKER_FOR_LIFTED_REGISTER_ENTRY', `/register/${regId}`, 'ledger still blocks a lifted entry');
        continue;
      }
      const want = scopeTargets(entry.scope, registry);
      if (want === null) {
        fail(f, 'REGISTER_SCOPE_UNKNOWN_DEFINITION', `/register/${regId}`);
        continue;
      }
      const missing = [...want].filter((t) => !have.has(t));
      const extra = [...have].filter((t) => !want.has(t));
      if (missing.length) fail(f, 'BLOCKER_REMOVED_WHILE_REGISTER_OPEN', `/register/${regId}`, { component: entry.scope.component, missingCount: missing.length, sample: missing.slice(0, 3) });
      if (extra.length) fail(f, 'BLOCKER_OUTSIDE_REGISTER_SCOPE', `/register/${regId}`, { component: entry.scope.component, extraCount: extra.length, sample: extra.slice(0, 3) });
    }
    for (const key of ledgerCover.keys()) {
      const regId = key.split('|')[0];
      const entry = register.get(regId);
      if (entry && (!entry.scope || key.split('|')[1] !== entry.scope.component)) fail(f, 'BLOCKER_WITHOUT_REGISTER_SCOPE', `/ledger/blockers`, key);
    }

    const specKeys = new Map();
    const seenSpecIds = new Set();
    specs.records.forEach((s, i) => {
      const p = `/specs/records/${i}`;
      if (!isObj(s)) return fail(f, 'SPEC_NOT_OBJECT', p);
      for (const k of ['specId', 'typedDefinitionId', 'component', 'basis', 'evidence', 'behavior', 'authoredBy']) if (!isStr(s[k])) fail(f, 'SPEC_FIELD_MISSING', `${p}/${k}`);
      if (seenSpecIds.has(s.specId)) fail(f, 'SPEC_ID_DUPLICATE', p, s.specId);
      seenSpecIds.add(s.specId);
      if (!typed.has(s.typedDefinitionId)) fail(f, 'SPEC_TYPED_ID_UNKNOWN', `${p}/typedDefinitionId`, s.typedDefinitionId);
      if (!COMPONENTS.includes(s.component)) fail(f, 'SPEC_COMPONENT_INVALID', `${p}/component`, s.component);
      if (!['PUBLISHED_UNAMBIGUOUS', 'OWNER_RULING'].includes(s.basis)) fail(f, 'SPEC_BASIS_INVALID', `${p}/basis`, s.basis);
      if (s.verification !== 'SOURCE_VERIFIED') fail(f, 'SPEC_VERIFICATION_INVALID', `${p}/verification`, s.verification);
      const pub = s.publication;
      if (!isObj(pub) || !isStr(pub.bookId) || !isStr(pub.title) || !Number.isInteger(pub.printedPage) || !isStr(pub.tableOrSection)) fail(f, 'SPEC_PUBLICATION_INCOMPLETE', `${p}/publication`);
      if (s.basis === 'OWNER_RULING' && !isStr(s.ownerRulingRef)) fail(f, 'SPEC_OWNER_RULING_REF_MISSING', `${p}/ownerRulingRef`);
      const key = `${s.typedDefinitionId}|${s.component}`;
      if (blockedKeys.has(key)) fail(f, 'SPEC_WHILE_BLOCKER_OPEN', p, key);
      if (specKeys.has(key)) fail(f, 'SPEC_DUPLICATE_COMPONENT', p, key);
      specKeys.set(key, s);
    });

    const implKeys = new Set();
    ledger.implementation.forEach((e, i) => {
      const p = `/ledger/implementation/${i}`;
      if (!isObj(e)) return fail(f, 'IMPL_NOT_OBJECT', p);
      if (!typed.has(e.typedDefinitionId)) fail(f, 'IMPL_TYPED_ID_UNKNOWN', p, e.typedDefinitionId);
      if (!COMPONENTS.includes(e.component)) fail(f, 'IMPL_COMPONENT_INVALID', p, e.component);
      const fl = e.flags;
      if (!isObj(fl)) return fail(f, 'IMPL_FLAGS_INVALID', p);
      for (const k of ['IMPLEMENTED', 'OFFLINE_TESTED', 'FOUNDRY_TESTED']) if (typeof fl[k] !== 'boolean') fail(f, 'IMPL_FLAG_NOT_BOOLEAN', `${p}/flags/${k}`);
      if (!isStr(e.commit) || !Array.isArray(e.tests) || e.tests.length === 0) fail(f, 'IMPL_EVIDENCE_MISSING', p);
      const key = `${e.typedDefinitionId}|${e.component}`;
      if (implKeys.has(key)) fail(f, 'IMPL_DUPLICATE', p, key);
      implKeys.add(key);
      if (fl.FOUNDRY_TESTED && !fl.OFFLINE_TESTED) fail(f, 'IMPL_FLAG_ORDER', p, 'FOUNDRY_TESTED requires OFFLINE_TESTED');
      if (fl.OFFLINE_TESTED && !fl.IMPLEMENTED) fail(f, 'IMPL_FLAG_ORDER', p, 'OFFLINE_TESTED requires IMPLEMENTED');
      if ((fl.IMPLEMENTED || fl.OFFLINE_TESTED || fl.FOUNDRY_TESTED) && !specKeys.has(key)) fail(f, 'IMPL_WITHOUT_SPECIFICATION', p, key);
      if (blockedKeys.has(key) && (fl.IMPLEMENTED || fl.OFFLINE_TESTED || fl.FOUNDRY_TESTED)) fail(f, 'IMPL_WHILE_BLOCKER_OPEN', p, key);
      if (fl.FOUNDRY_TESTED && !(isObj(e.foundryEvidence) && isStr(e.foundryEvidence.route) && isStr(e.foundryEvidence.runId))) fail(f, 'IMPL_FOUNDRY_EVIDENCE_MISSING', p, key);
    });

    const selKeys = new Set();
    ledger.selectable.forEach((e, i) => {
      const p = `/ledger/selectable/${i}`;
      if (!isObj(e)) return fail(f, 'SELECTABLE_NOT_OBJECT', p);
      if (!typed.has(e.typedDefinitionId)) fail(f, 'SELECTABLE_TYPED_ID_UNKNOWN', p, e.typedDefinitionId);
      for (const k of ['approvalRef', 'reviewedBy']) if (!isStr(e[k])) fail(f, 'SELECTABLE_FIELD_MISSING', `${p}/${k}`);
      if (!isObj(e.hostEvaluation) || !isStr(e.hostEvaluation.evaluator) || !Array.isArray(e.hostEvaluation.offlineTests) || e.hostEvaluation.offlineTests.length === 0) fail(f, 'SELECTABLE_HOST_EVALUATION_MISSING', `${p}/hostEvaluation`);
      if (!Array.isArray(e.evidence) || e.evidence.length === 0) fail(f, 'SELECTABLE_EVIDENCE_MISSING', p);
      if (selKeys.has(e.typedDefinitionId)) fail(f, 'SELECTABLE_DUPLICATE', p, e.typedDefinitionId);
      selKeys.add(e.typedDefinitionId);
    });
  } catch (err) {
    fail(f, 'INPUT_VALIDATION_INTERNAL_ERROR', '/', String(err?.message ?? err).slice(0, 160));
  }
  return f;
}

/* ------------------------------------------------------------------------------------------ */
/* Derivation                                                                                  */
/* ------------------------------------------------------------------------------------------ */

/** Phase 1b section 6.2 slot-cost certification predicate (no page attestation exists for v1.5). */
export function certifySlotCost(def, typedDef) {
  const reasons = [];
  if (def.currentStatus === 'EXCLUDED_SCOPE') reasons.push('EXCLUDED_SCOPE');
  if (def.sourceRole === EXCLUDED_ROLE) reasons.push('NOT_UPGRADE_CANDIDATE');
  const c = def.originalSlotCost;
  if (!isObj(c) || c.type !== 'fixed') reasons.push(`SLOT_COST_NOT_FIXED:${isObj(c) ? c.type : 'missing'}`);
  else if (!Number.isInteger(c.slots) || c.slots < 0) reasons.push('SLOT_COST_NOT_NONNEGATIVE_INTEGER');
  if (typedDef.slotPoolId !== 'general-upgrades') reasons.push(`SLOT_POOL_NOT_GENERAL:${typedDef.slotPoolId ?? 'none'}`);
  if (!TABLE_CERT_OK.has(def.tableCertification)) {
    reasons.push(def.tableCertification === 'NOT_TABLE_BASED_PAGE_VERIFIED' ? 'PAGE_ATTESTATION_MISSING' : `TABLE_CERTIFICATION_INSUFFICIENT:${def.tableCertification}`);
  }
  return { certified: reasons.length === 0, reasons };
}

export function domainBasisFor(value, domain) {
  if (value === 'RULES_CERTIFIED') return 'rules-certified';
  if (value === 'TABLE_CATEGORY' && (domain === 'weapon' || domain === 'armor')) return 'table-category';
  return null;
}

function emptyComponent() {
  return { SOURCE_VERIFIED: false, DATA_RECONCILED: true, MECHANIC_SPECIFIED: false, IMPLEMENTED: false, OFFLINE_TESTED: false, FOUNDRY_TESTED: false, pendingSource: [], deferred: [] };
}

function buildStatus({ def, typedDef, domainCost, typedId, ledger, specs }) {
  const components = {};
  for (const name of COMPONENTS) components[name] = emptyComponent();
  // Registry-vocabulary source verification, one component at a time.
  components.cost.SOURCE_VERIFIED = domainCost.certified;
  components.description.SOURCE_VERIFIED = def.mechanicalCertification === 'EFFECTS_CERTIFIED';
  components.executableEffect.SOURCE_VERIFIED = typeof typedDef.effectStatus === 'string' && typedDef.effectStatus.startsWith('EFFECTS_SOURCE_VERIFIED');
  // hostPrerequisites and installProcedure have no registry-derived certification; only a specification record can verify them.
  for (const s of specs.records) {
    if (s.typedDefinitionId !== typedId) continue;
    components[s.component].SOURCE_VERIFIED = true;
    components[s.component].MECHANIC_SPECIFIED = true;
  }
  for (const e of ledger.implementation) {
    if (e.typedDefinitionId !== typedId) continue;
    const c = components[e.component];
    c.IMPLEMENTED = e.flags.IMPLEMENTED;
    c.OFFLINE_TESTED = e.flags.OFFLINE_TESTED;
    c.FOUNDRY_TESTED = e.flags.FOUNDRY_TESTED;
  }
  for (const b of ledger.blockers) {
    if (b.appliesToAllTypedDefinitions !== true && !b.typedDefinitionIds.includes(typedId)) continue;
    const target = b.classification === 'PENDING_SOURCE_VERIFICATION' ? components[b.component].pendingSource : components[b.component].deferred;
    if (!target.includes(b.register)) target.push(b.register);
  }
  for (const c of Object.values(components)) {
    c.pendingSource.sort();
    c.deferred.sort();
  }
  return { components };
}

/** Architecture 3.4 conditions 1-5 (6 is the ledger entry itself). Returns the list of unmet conditions. */
export function unmetSelectableConditions(typedId, domainRecord) {
  const unmet = [];
  const comps = domainRecord.status.components;
  for (const name of ['cost', 'description', 'hostPrerequisites', 'installProcedure']) {
    const c = comps[name];
    if (!c.SOURCE_VERIFIED || c.pendingSource.length || c.deferred.length) unmet.push(`1:${name}`);
  }
  if (!domainRecord.applicability.hostRequirementsSpecified) unmet.push('2:hostRequirementsSpecified');
  if (!domainRecord.applicability.hostEvaluator) unmet.push('2:hostEvaluator');
  if (!comps.installProcedure.MECHANIC_SPECIFIED) unmet.push('3:installProcedure');
  const ex = comps.executableEffect;
  if (domainRecord.effects.operations.length > 0 && !(ex.MECHANIC_SPECIFIED && ex.IMPLEMENTED && ex.OFFLINE_TESTED && !ex.pendingSource.length && !ex.deferred.length)) unmet.push('4:executableEffect');
  if (!comps.installProcedure.FOUNDRY_TESTED) unmet.push('5:installProcedure.FOUNDRY_TESTED');
  return unmet;
}

/**
 * @returns {{ runtime: object, failures: object[] }} runtime is null when the hand-maintained inputs are invalid.
 */
export function deriveRuntime({ snapshot, ledger, specs, register, inputHashes = {} }) {
  // Only a handle minted by the trusted offline producer confers the registry's authority.
  if (!isTrustedSnapshot(snapshot)) return { runtime: null, failures: [{ code: 'UNTRUSTED_SNAPSHOT', path: '/snapshot', detail: 'registry data must come from produceTrustedSnapshot()' }] };
  const registry = snapshot.registry;
  const registryMeta = snapshot.identity;
  const failures = validateInputs({ registry, ledger, specs, register });
  if (failures.length) return { runtime: null, failures };

  const records = [];
  const counts = { records: 0, typedDefinitions: 0, eligibleCandidates: 0, accountingEligiblePairs: 0, certifiedSlotCosts: 0, runtimeSelectable: 0 };
  const selectableByTyped = new Map(ledger.selectable.map((e) => [e.typedDefinitionId, e]));

  registry.definitions.forEach((def, index) => {
    const excluded = def.currentStatus === 'EXCLUDED_SCOPE';
    const candidate = def.sourceRole !== EXCLUDED_ROLE;
    const domains = {};
    for (const [domain, typedDef] of Object.entries(def.typedDefinitions ?? {})) {
      const typedId = typedDef.definitionId;
      const cost = certifySlotCost(def, typedDef);
      const applicabilityValue = def.domainApplicability?.[domain] ?? null;
      const basis = domainBasisFor(applicabilityValue, domain);
      const accountingReasons = [...cost.reasons];
      if (basis === null) accountingReasons.push(`DOMAIN_BASIS_NOT_CERTIFIED:${applicabilityValue}`);
      const accountingEligible = cost.certified && basis !== null;
      const status = buildStatus({ def, typedDef, domainCost: cost, typedId, ledger, specs });
      // Specified host REQUIREMENTS are not proof that any particular Item satisfies them. Per-Item eligibility is evaluated
      // at plan time (G3/G4) from certified facts; no static record can establish it, so it is always 'not_established' here.
      const hostRequirementsSpecified = status.components.hostPrerequisites.SOURCE_VERIFIED && status.components.hostPrerequisites.MECHANIC_SPECIFIED;
      const selEntry = selectableByTyped.get(typedId);
      const record = {
        typedDefinitionId: typedId,
        domain,
        candidate,
        slotPool: typedDef.slotPoolId ?? null,
        slotCost: { registry: clone(def.originalSlotCost), certification: { certified: cost.certified, reasons: cost.reasons } },
        applicability: {
          registryValue: applicabilityValue,
          domainBasis: basis,
          hostRequirementsSpecified,
          hostEvaluator: selEntry?.hostEvaluation?.evaluator ?? null,
          hostEligibility: 'not_established'
        },
        accounting: { eligible: accountingEligible, reasons: accountingReasons },
        effects: {
          operations: clone(typedDef.effectOperations ?? []),
          registryEffectStatus: typedDef.effectStatus ?? null,
          registryConsumerStatus: typedDef.consumerStatus ?? null,
          automation: 'none'
        },
        status,
        runtimeSelectable: false
      };
      const sel = selectableByTyped.get(typedId);
      if (sel) {
        const unmet = unmetSelectableConditions(typedId, record);
        if (unmet.length) failures.push({ code: 'SELECTABLE_CONDITIONS_UNMET', path: `/records/${index}/domains/${domain}`, detail: { typedDefinitionId: typedId, unmet } });
        else record.runtimeSelectable = true;
      }
      domains[domain] = record;
      counts.typedDefinitions += 1;
      if (candidate) counts.eligibleCandidates += 1;
      if (cost.certified) counts.certifiedSlotCosts += 1;
      if (accountingEligible) counts.accountingEligiblePairs += 1;
      if (record.runtimeSelectable) counts.runtimeSelectable += 1;
    }
    const price = clone(def.originalCost);
    records.push({
      definitionId: def.id,
      name: def.name,
      registry: { version: registryMeta.version, sha256: registryMeta.sha256, pointer: `/definitions/${index}` },
      excluded,
      provenance: {
        source: clone(def.source),
        sourceFamily: def.sourceFamily,
        sourceRole: def.sourceRole,
        tableCertification: def.tableCertification,
        mechanicalCertification: def.mechanicalCertification,
        currentStatus: def.currentStatus,
        audit: clone(def.audit)
      },
      display: { summary: def.summary, availability: def.availability },
      slotCost: { registry: clone(def.originalSlotCost) },
      price: { kind: price?.type === 'not_stated' ? 'unknown' : price?.type ?? 'unknown', registry: price },
      eligibility: clone(def.eligibility),
      procedures: clone(def.procedureRefs ?? []),
      domains
    });
    counts.records += 1;
  });

  if (failures.length) return { runtime: null, failures };
  const header = {
    schema: RUNTIME_SCHEMA_ID,
    generator: { name: 'tools/build-modification-runtime.mjs', version: GENERATOR_VERSION },
    registry: { version: registryMeta.version, sha256: registryMeta.sha256, byteLength: registryMeta.byteLength },
    validator: clone(snapshot.validator),
    inputs: { statusLedgerSha256: inputHashes.ledger ?? null, specificationRecordsSha256: inputHashes.specs ?? null },
    counts,
    recordsSha256: sha256(canonicalJson(records)),
    notice: 'Generated. Do not edit. Research-only unless a typed domain definition is runtimeSelectable. Integrity is anchored outside this file (G8).'
  };
  return { runtime: { header, records }, failures: [] };
}

/* ------------------------------------------------------------------------------------------ */
/* V10' validation of an existing runtime document                                             */
/* ------------------------------------------------------------------------------------------ */

/**
 * Independent structural checks plus a full regeneration comparison.
 * @returns {{ ok: boolean, failures: object[] }}
 */
export function validateRuntime({ runtime, snapshot, ledger, specs, register, inputHashes = {} }) {
  const f = [];
  if (!isTrustedSnapshot(snapshot)) return { ok: false, failures: [{ code: 'UNTRUSTED_SNAPSHOT', path: '/snapshot', detail: 'registry data must come from produceTrustedSnapshot()' }] };
  const registry = snapshot.registry;
  const registryMeta = snapshot.identity;
  try {
    if (!isObj(runtime) || !isObj(runtime.header) || !Array.isArray(runtime.records)) return { ok: false, failures: [{ code: 'RUNTIME_SHAPE_INVALID', path: '/', detail: null }] };
    const h = runtime.header;
    if (h.schema !== RUNTIME_SCHEMA_ID) fail(f, 'SCHEMA_ID_MISMATCH', '/header/schema', h.schema);
    if (!isObj(h.registry) || h.registry.version !== registryMeta.version || h.registry.sha256 !== registryMeta.sha256 || h.registry.byteLength !== registryMeta.byteLength) fail(f, 'REGISTRY_BINDING_MISMATCH', '/header/registry');
    if (!jsonEqual(h.validator, snapshot.validator)) fail(f, 'VALIDATOR_IDENTITY_MISMATCH', '/header/validator');
    if (h.recordsSha256 !== sha256(canonicalJson(runtime.records))) fail(f, 'RECORDS_HASH_MISMATCH', '/header/recordsSha256');
    if (runtime.records.length !== registry.definitions.length) fail(f, 'RECORD_COUNT_MISMATCH', '/records', { observed: runtime.records.length, expected: registry.definitions.length });

    const seenTyped = new Set();
    runtime.records.forEach((r, i) => {
      const p = `/records/${i}`;
      const def = registry.definitions[i];
      if (!def || !isObj(r)) return fail(f, 'RECORD_INVALID', p);
      if (r.definitionId !== def.id) fail(f, 'DEFINITION_ID_MISMATCH', `${p}/definitionId`, r.definitionId);
      if (r.registry?.pointer !== `/definitions/${i}`) fail(f, 'POINTER_MISMATCH', `${p}/registry/pointer`, r.registry?.pointer);
      if ('runtimeSelectable' in r) fail(f, 'PARENT_LEVEL_SELECTABLE_FORBIDDEN', `${p}/runtimeSelectable`);
      if (!jsonEqual(r.provenance?.source, def.source)) fail(f, 'VERBATIM_SOURCE_MISMATCH', `${p}/provenance/source`);
      if (!jsonEqual(r.slotCost?.registry, def.originalSlotCost)) fail(f, 'VERBATIM_SLOT_COST_MISMATCH', `${p}/slotCost/registry`);
      if (!jsonEqual(r.price?.registry, def.originalCost)) fail(f, 'VERBATIM_PRICE_MISMATCH', `${p}/price/registry`);
      if (def.originalCost?.type === 'not_stated' && r.price?.kind !== 'unknown') fail(f, 'UNSTATED_PRICE_NOT_UNKNOWN', `${p}/price/kind`);
      if (!jsonEqual(r.eligibility, def.eligibility)) fail(f, 'VERBATIM_ELIGIBILITY_MISMATCH', `${p}/eligibility`);
      if (!jsonEqual(r.display?.summary, def.summary)) fail(f, 'VERBATIM_SUMMARY_MISMATCH', `${p}/display/summary`);
      const wantDomains = Object.keys(def.typedDefinitions ?? {});
      const gotDomains = Object.keys(r.domains ?? {});
      if (!jsonEqual(wantDomains, gotDomains)) fail(f, 'DOMAIN_SET_MISMATCH', `${p}/domains`, gotDomains);
      for (const [domain, d] of Object.entries(r.domains ?? {})) {
        const dp = `${p}/domains/${domain}`;
        const want = def.typedDefinitions?.[domain];
        if (!want) continue;
        if (d.typedDefinitionId !== want.definitionId || d.typedDefinitionId !== `${def.id}::${domain}`) fail(f, 'TYPED_ID_MISMATCH', `${dp}/typedDefinitionId`, d.typedDefinitionId);
        if (seenTyped.has(d.typedDefinitionId)) fail(f, 'TYPED_ID_DUPLICATE', dp, d.typedDefinitionId);
        seenTyped.add(d.typedDefinitionId);
        if (typeof d.runtimeSelectable !== 'boolean') fail(f, 'DOMAIN_SELECTABLE_NOT_BOOLEAN', `${dp}/runtimeSelectable`);
        if (d.effects?.automation !== 'none') fail(f, 'AUTOMATION_NOT_NONE', `${dp}/effects/automation`);
        if (!jsonEqual(d.effects?.operations, want.effectOperations ?? [])) fail(f, 'VERBATIM_EFFECT_OPERATIONS_MISMATCH', `${dp}/effects/operations`);
        if (d.applicability?.hostEligibility !== 'not_established') fail(f, 'HOST_ELIGIBILITY_ESTABLISHED_FORBIDDEN', `${dp}/applicability/hostEligibility`, d.applicability?.hostEligibility);
        if (d.runtimeSelectable) {
          const unmet = unmetSelectableConditions(d.typedDefinitionId, d);
          if (unmet.length) fail(f, 'SELECTABLE_CONDITIONS_UNMET', dp, unmet);
        }
        for (const [name, c] of Object.entries(d.status?.components ?? {})) {
          for (const id of [...c.pendingSource, ...c.deferred]) if (!register.has(id)) fail(f, 'REGISTER_ID_UNKNOWN', `${dp}/status/${name}`, id);
          if (c.FOUNDRY_TESTED && !c.OFFLINE_TESTED) fail(f, 'FLAG_ORDER', `${dp}/status/${name}`);
          if (c.OFFLINE_TESTED && !c.IMPLEMENTED) fail(f, 'FLAG_ORDER', `${dp}/status/${name}`);
          if (c.IMPLEMENTED && !c.MECHANIC_SPECIFIED) fail(f, 'FLAG_ORDER', `${dp}/status/${name}`);
          if ((c.IMPLEMENTED || c.MECHANIC_SPECIFIED) && (c.pendingSource.length || c.deferred.length)) fail(f, 'FLAG_WITH_OPEN_BLOCKER', `${dp}/status/${name}`);
          if (!c.DATA_RECONCILED) fail(f, 'DATA_RECONCILED_FALSE', `${dp}/status/${name}`);
        }
      }
    });

    // Full regeneration: the committed bytes must equal an independent derivation from the same inputs.
    const regen = deriveRuntime({ snapshot, ledger, specs, register, inputHashes });
    if (regen.failures.length) for (const x of regen.failures) f.push(x);
    else if (canonicalJson(regen.runtime) !== canonicalJson(runtime)) fail(f, 'REGENERATION_MISMATCH', '/', 'committed runtime differs from deterministic regeneration');
  } catch (err) {
    fail(f, 'VALIDATOR_INTERNAL_ERROR', '/', String(err?.message ?? err).slice(0, 160));
  }
  return { ok: f.length === 0, failures: f };
}

/**
 * ModificationPlanner -- G3 (pure, read-only).
 *
 * Builds an install or removal PLAN for one typed domain definition on one host Item. It decides nothing about rules it
 * does not have: every uncertain fact becomes a stable BLOCKER or a DEFERRAL (open register entry), never a guess.
 * It writes nothing, moves no credits, calls no engine and loads no data: the catalog, the slot authority function and
 * the legality framework are all injected. Phase 1a is injected, not imported (Phase 1a has no importer by contract).
 *
 * Interim policy (architecture 9.2): plans are for descriptions, diagnostics, cost information and read-only planning.
 * A plan never declares a modification legally installable. `EXECUTOR_NOT_CERTIFIED` is always present until gate G6
 * provides an executor with a proven all-or-nothing mutation strategy; consequently `executable` is always false in G3.
 */
import { resolvePrice } from './modification-price.js';
import { createCertifiedDefinitionLookup } from './modification-slot-closure.js';

export const PLAN_VERSION = 1;
const OPERATIONS = Object.freeze(['install', 'remove']);
const DOMAINS = Object.freeze(['weapon', 'armor', 'equipment']);
const REQUIRED_COMPONENTS = Object.freeze(['cost', 'description', 'hostPrerequisites', 'installProcedure']);

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim().length > 0;

/** Installed V2 instance records (identity only) read from the canonical flag path. */
export function readInstances(item) {
  const list = item?.flags?.['foundryvtt-swse']?.customization?.installedUpgrades;
  return Array.isArray(list) ? list : [];
}

/**
 * Inspects the recorded V2 instance identities on a host Item. An identity is exactly { instanceId, typedDefinitionId, domain },
 * each a non-empty string with a known domain. Anything else is malformed; instance ids must be unique on the host.
 * @returns {{ notArray: boolean, records: object[], malformed: number[], duplicateIds: string[] }}
 */
export function inspectInstances(item) {
  const raw = item?.flags?.['foundryvtt-swse']?.customization?.installedUpgrades;
  if (raw === undefined || raw === null) return { notArray: false, records: [], malformed: [], duplicateIds: [] };
  if (!Array.isArray(raw)) return { notArray: true, records: [], malformed: [], duplicateIds: [] };
  const records = [];
  const malformed = [];
  const seen = new Map();
  raw.forEach((r, index) => {
    const ok = isObject(r) && isText(r.instanceId) && isText(r.typedDefinitionId) && DOMAINS.includes(r.domain) && r.typedDefinitionId.endsWith(`::${r.domain}`);
    if (!ok) return malformed.push(index);
    records.push(r);
    seen.set(r.instanceId, (seen.get(r.instanceId) ?? 0) + 1);
  });
  return { notArray: false, records, malformed, duplicateIds: [...seen].filter(([, n]) => n > 1).map(([id]) => id).sort() };
}

/**
 * A read-only view of the Item for Phase 1a: V2 instance records are exposed under the field names Phase 1a reads
 * (`upgradeKey` = typed definition id). Nothing else is altered and the Item itself is never modified.
 */
export function slotView(item) {
  const flags = item?.flags ?? {};
  const mine = flags['foundryvtt-swse'] ?? {};
  const customization = mine.customization ?? {};
  const instances = readInstances(item).map((i) => (isObject(i) ? { instanceId: i.instanceId, upgradeKey: i.typedDefinitionId, domain: i.domain } : i));
  return { ...item, flags: { ...flags, 'foundryvtt-swse': { ...mine, customization: { ...customization, ...(Array.isArray(customization.installedUpgrades) ? { installedUpgrades: instances } : {}) } } } };
}

function sortedBlockers(list) {
  return list.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : JSON.stringify(a.detail) < JSON.stringify(b.detail) ? -1 : JSON.stringify(a.detail) > JSON.stringify(b.detail) ? 1 : 0));
}

/**
 * @param {object} input
 * @param {object} input.catalog       ModificationCatalog
 * @param {'install'|'remove'} input.operation
 * @param {string} input.typedDefinitionId
 * @param {object} input.item          host Item snapshot (never mutated)
 * @param {string} [input.instanceId]  required for removal
 * @param {{resolveSlotState: Function}} [input.slotAuthority]   injected Phase 1a authority
 * @param {object} [input.slotContext] extra trusted context for Phase 1a (baseline classification etc.)
 * @param {{evaluate: Function}} [input.legality]  legality framework
 */
export function planModification({ catalog, operation, typedDefinitionId, item, instanceId = null, slotAuthority = null, slotContext = {}, legality = null } = {}) {
  const blockers = [];
  const block = (code, detail = null) => blockers.push({ code, detail });
  const plan = {
    planVersion: PLAN_VERSION,
    readOnly: true,
    operation: OPERATIONS.includes(operation) ? operation : null,
    typedDefinitionId: typeof typedDefinitionId === 'string' ? typedDefinitionId : null,
    definitionId: null,
    domain: null,
    executable: false,
    blockers,
    deferrals: [],
    price: null,
    slotImpact: { status: 'not-evaluated', total: null, used: null, free: null, cost: null, freeAfter: null },
    host: { status: 'not_established', reasons: [], evaluator: null, evidence: [] }
  };
  const finish = () => {
    block('EXECUTOR_NOT_CERTIFIED', 'no executor with a proven all-or-nothing mutation strategy exists before gate G6');
    plan.blockers = sortedBlockers(blockers);
    plan.executable = false;
    return plan;
  };

  if (plan.operation === null) block('OPERATION_INVALID', operation ?? null);
  if (!catalog || typeof catalog.getTyped !== 'function') {
    block('CATALOG_MISSING');
    return finish();
  }
  const found = plan.typedDefinitionId === null ? null : catalog.getTyped(plan.typedDefinitionId);
  if (!found) {
    block('DEFINITION_UNKNOWN', plan.typedDefinitionId);
    return finish();
  }
  const { parent, typed, domain } = found;
  plan.definitionId = parent.definitionId;
  plan.domain = domain;
  plan.price = resolvePrice(parent);

  // Host Item and domain separation.
  if (!isObject(item)) block('ITEM_INVALID');
  else if (!DOMAINS.includes(item.type)) block('ITEM_DOMAIN_UNKNOWN', item.type ?? null);
  else if (item.type !== domain) block('DOMAIN_MISMATCH', { item: item.type, definition: domain });

  // Selectability and canonical non-installability (the generator already enforces these; they are re-asserted here).
  if (typed.runtimeSelectable !== true) block('NOT_SELECTABLE');
  if (parent.excluded === true) block('EXCLUDED_SCOPE');
  if (typed.candidate !== true) block('NOT_INSTALLABLE_CANDIDATE');
  if (typed.slotPool !== 'general-upgrades') block('NON_GENERAL_POOL', typed.slotPool ?? null);

  // Component certification, open register entries.
  const comps = typed.status?.components ?? {};
  for (const name of REQUIRED_COMPONENTS) {
    if (!comps[name]?.SOURCE_VERIFIED) block('COMPONENT_UNVERIFIED', name);
  }
  if (comps.installProcedure && !comps.installProcedure.MECHANIC_SPECIFIED) block('INSTALL_PROCEDURE_NOT_SPECIFIED');
  const deferrals = [];
  for (const [component, c] of Object.entries(comps)) {
    for (const register of c.pendingSource ?? []) deferrals.push({ register, classification: 'PENDING_SOURCE_VERIFICATION', component });
    for (const register of c.deferred ?? []) deferrals.push({ register, classification: 'DEFERRED_RULES_REVIEW', component });
  }
  deferrals.sort((a, b) => (a.register + a.component < b.register + b.component ? -1 : 1));
  plan.deferrals = deferrals;
  for (const d of deferrals) block('OPEN_REGISTER_ENTRY', `${d.register}:${d.component}`);

  // Host eligibility: only a certified evaluator can establish it.
  if (legality && typeof legality.evaluate === 'function') plan.host = legality.evaluate(typed, item);
  if (plan.host.status === 'illegal') block('HOST_ILLEGAL', plan.host.evaluator);
  else if (plan.host.status !== 'legal') block('HOST_NOT_ESTABLISHED', plan.host.reasons[0] ?? null);

  if (plan.operation === 'install') {
    if (!plan.price.computable) block(plan.price.kind === 'unknown' ? 'PRICE_UNKNOWN' : 'PRICE_NOT_COMPUTABLE', plan.price.kind);
    // Slot impact through the injected Phase 1a authority and the certified-cost closure.
    const lookup = createCertifiedDefinitionLookup(catalog);
    const certified = lookup(plan.typedDefinitionId);
    if (certified === null) block('SLOT_COST_UNCERTIFIED');
    if (!slotAuthority || typeof slotAuthority.resolveSlotState !== 'function') {
      block('SLOT_STATE_UNRESOLVED', 'slot authority not supplied');
    } else if (isObject(item)) {
      let state = null;
      try {
        state = slotAuthority.resolveSlotState(slotView(item), { ...slotContext, certifiedDefinitionLookup: lookup });
      } catch (_err) {
        state = null;
      }
      const t = state?.totals;
      if (!t || t.free === null || t.free === undefined || t.status !== 'certified') {
        block('SLOT_STATE_UNRESOLVED', state?.status ?? 'no-state');
        plan.slotImpact = { status: state?.status ?? 'unresolved', total: null, used: null, free: null, cost: certified?.certifiedCost ?? null, freeAfter: null };
      } else {
        const cost = certified?.certifiedCost ?? null;
        plan.slotImpact = { status: 'certified', total: t.total, used: t.used, free: t.free, cost, freeAfter: cost === null ? null : t.free - cost };
        if (cost !== null && cost > t.free) block('SLOT_OVERFLOW', { cost, free: t.free });
      }
    }
  } else if (plan.operation === 'remove') {
    // Removal needs one unambiguous recorded identity: { instanceId, typedDefinitionId, domain } must all agree with the request and the host.
    const inst = inspectInstances(item);
    if (!isText(instanceId)) block('REMOVE_INSTANCE_ID_INVALID', instanceId ?? null);
    if (inst.notArray) block('REMOVE_INSTANCES_NOT_ARRAY');
    if (inst.malformed.length) block('REMOVE_INSTANCE_RECORD_MALFORMED', inst.malformed);
    if (inst.duplicateIds.length) block('REMOVE_INSTANCE_ID_DUPLICATE', inst.duplicateIds);
    if (isText(instanceId) && !inst.notArray) {
      const matches = inst.records.filter((r) => r.instanceId === instanceId);
      if (matches.length === 0) block('REMOVE_INSTANCE_NOT_FOUND', instanceId);
      else if (matches.length === 1) {
        const [m] = matches;
        if (m.typedDefinitionId !== plan.typedDefinitionId) block('REMOVE_INSTANCE_MISMATCH', m.typedDefinitionId);
        if (m.domain !== domain || (isObject(item) && m.domain !== item.type)) block('REMOVE_INSTANCE_DOMAIN_MISMATCH', { recorded: m.domain, definition: domain, host: isObject(item) ? item.type ?? null : null });
      }
    }
  }
  return finish();
}

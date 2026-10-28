/**
 * Modification V2 install service -- the runtime layer between the pure G3 modules (catalog, planner, legality, price, slot closure) and the
 * existing authorities (ModificationSlotAuthority, TransactionEngine, ActorEngine, the Mechanics roll). The ItemCustomizationWorkbench calls it.
 *
 * First slice: PROVISIONAL GM-adjudicated installs of Scum and Villainy weapon/armor upgrades (owner direction 2026-10-28, Option A).
 *
 * This is a GM-local DEVELOPMENT workflow, kept distinct from certified runtime selection. No definition in the immutable registry is
 * runtime-selectable; this module never changes that and never edits the registry, ledger or generated data. Instead it runs the same G3
 * planner, separates its blockers into
 *   - HARD blockers (domain, slot capacity, price, slot cost, malformed instances, ...) that always refuse, and
 *   - CERTIFICATION blockers that a GM may knowingly accept for a provisional install,
 * and records every accepted certification blocker, the GM's host ruling and the check basis on the installed instance (`provisional: true`).
 *
 * Published facts used (Scum and Villainy printed p. 39, verified in docs/audits/d-001-install-remove-pdf-verification.md):
 *   Table 2-2 DC/time per upgrade-point row (the row comes from each definition's SOURCE_VERIFIED specification record); removal takes the same
 *   time at DC - 5; a failed ordinary removal deactivates the upgrade; an expedited removal takes the next lower time increment and destroys
 *   the upgrade on a failure; a successful removal (or destruction) frees the slot. The installer must be trained in Mechanics (D-015 source
 *   resolution).
 * Owner policies applied to what the page leaves open (2026-10-15, docs/audits/swse-v2-owner-decisions-2026-10-15.md; the registry blockers
 * themselves stay open):
 *   Q-021 attempt/retry cost is not invented: a FAILED attempt's cost is recorded as pending GM adjudication (no automatic charge, no implied zero);
 *   Q-022 no expedited removal when the time is already 10 minutes;  Q-023 a deactivated upgrade keeps its slot;
 *   Q-024 a failed installation records an outcome and creates NO instance;  Q-029 effects are a GM-adjudicated record, never automated.
 *
 * Money (H7 boundary): an install is charged only an explicitly established price -- the certified credit amount, re-entered by the GM as a
 * confirmation -- through TransactionEngine (lock, recovery, verified write). Unknown, missing or unconfirmed prices refuse; nothing is ever free
 * by default. Commercially bought upgrades only (scratch-built pricing is not offered in this slice).
 */
import { createModificationCatalog } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-v2/modification-catalog.js';
import { planModification, inspectInstances } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-v2/modification-planner.js';
import { createCertifiedDefinitionLookup } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-v2/modification-slot-closure.js';
import { resolveSlotState } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-slot-authority.js';
import { sha256Hex, utf8Bytes } from '/systems/foundryvtt-swse/scripts/engine/equipment/intent-fingerprint.js';
import { PROVISIONAL_SET } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-provisional-set.js';
import { setVerifiedModificationData, getVerifiedModificationData } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-data-store.js';
import { DEVELOPMENT_SET, DEVELOPMENT_BASIS, DEVELOPMENT_POLICY, DEVELOPMENT_EQUIPMENT_SET, DEVELOPMENT_EQUIPMENT_POLICY, isDevelopmentModeEnabled } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-development-mode.js';
import { MODIFICATION_DATA_PINS } from '/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-data-pins.js';

export const RUNTIME_PATH = 'data/modifications/runtime-definitions-v1.5.json';
export const SPECIFICATION_PATH = 'data/modifications/specification-records-v1.json';
export const INSTANCE_FLAG_PATH = 'flags.foundryvtt-swse.customization.installedUpgrades';
export const ATTEMPT_FLAG_PATH = 'flags.foundryvtt-swse.customization.attemptLog';
export const PROVISIONAL_BASIS = 'PROVISIONAL_GM_ADJUDICATED';

export { PROVISIONAL_SET };

/** Scum and Villainy printed p. 39, Table 2-2, commercially bought column (scratch-built is not offered here). */
export const TABLE_2_2 = Object.freeze({
  source: 'Scum and Villainy printed p. 39, Table 2-2 (docs/audits/d-001-install-remove-pdf-verification.md section 3.2)',
  commercial: Object.freeze({ '0': Object.freeze({ dc: 10, time: '10 minutes' }), '1': Object.freeze({ dc: 20, time: '1 hour' }), '2 or more': Object.freeze({ dc: 30, time: '1 day (8 hours)' }) }),
});
/** Printed increments, shortest first; expedited removal steps one down (printed examples: 1 day -> 1 hour, 1 hour -> 10 minutes). */
export const TIME_INCREMENTS = Object.freeze(['10 minutes', '1 hour', '1 day (8 hours)']);

/** Planner blockers a GM may knowingly accept for a provisional install (each is recorded on the instance). Everything else refuses. */
const ACCEPTABLE = Object.freeze({
  NOT_SELECTABLE: () => true,
  EXECUTOR_NOT_CERTIFIED: () => true,
  INSTALL_PROCEDURE_NOT_SPECIFIED: () => true,
  HOST_NOT_ESTABLISHED: () => true, // only with an explicit GM host ruling (checked by the caller)
  COMPONENT_UNVERIFIED: (d) => d === 'description' || d === 'hostPrerequisites',
  OPEN_REGISTER_ENTRY: (d) => d === 'D-014:installProcedure' || d === 'D-015:installProcedure',
});
const REMOVAL_ACCEPTABLE = Object.freeze({ NOT_SELECTABLE: ACCEPTABLE.NOT_SELECTABLE, EXECUTOR_NOT_CERTIFIED: ACCEPTABLE.EXECUTOR_NOT_CERTIFIED, INSTALL_PROCEDURE_NOT_SPECIFIED: ACCEPTABLE.INSTALL_PROCEDURE_NOT_SPECIFIED, HOST_NOT_ESTABLISHED: ACCEPTABLE.HOST_NOT_ESTABLISHED, COMPONENT_UNVERIFIED: ACCEPTABLE.COMPONENT_UNVERIFIED, OPEN_REGISTER_ENTRY: ACCEPTABLE.OPEN_REGISTER_ENTRY });

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

// ------------------------------------------------------------------------------------------------ data (verified on load)
let cached = null;
/**
 * Load the generated runtime definitions and the specification records, verified against SHA-256 pins held in reviewed code (not inside
 * the artifacts), then the runtime header's own record hash and specification binding, then the catalog consistency checks. Fails closed.
 * The Table 2-2 row of each SOURCE_VERIFIED installProcedure specification record is extracted from the verified specification file.
 * @param {{fetchText?: (path:string)=>Promise<string>, refresh?: boolean}} [deps]
 */
export async function loadModificationData({ fetchText = null, refresh = false } = {}) {
  if (cached && !refresh && !fetchText) return cached;
  const get = fetchText ?? (async (p) => { const res = await fetch(`systems/foundryvtt-swse/${p}`); if (!res.ok) throw new Error(`${p}: HTTP ${res.status}`); return res.text(); });
  let docText; let specText;
  try { [docText, specText] = await Promise.all([get(RUNTIME_PATH), get(SPECIFICATION_PATH)]); } catch (err) { return { ok: false, problems: [`load-failed: ${err?.message ?? err}`] }; }
  for (const [path, text] of [[RUNTIME_PATH, docText], [SPECIFICATION_PATH, specText]]) {
    const actual = typeof text === 'string' ? sha256Hex(utf8Bytes(text)) : null;
    if (actual !== MODIFICATION_DATA_PINS[path]) return { ok: false, problems: [`PIN_MISMATCH: ${path} does not match its pinned SHA-256`] };
  }
  let doc; let specs;
  try { doc = JSON.parse(docText); specs = JSON.parse(specText); } catch (err) { return { ok: false, problems: [`parse-failed: ${err?.message ?? err}`] }; }
  const recordsHash = sha256Hex(utf8Bytes(`${JSON.stringify(doc?.records ?? null, null, 1)}\n`));
  if (!doc?.header || recordsHash !== doc.header.recordsSha256) return { ok: false, problems: ['RECORDS_HASH_MISMATCH: the runtime definitions do not match their recorded hash'] };
  if (doc.header.inputs?.specificationRecordsSha256 !== MODIFICATION_DATA_PINS[SPECIFICATION_PATH]) return { ok: false, problems: ['SPECIFICATION_BINDING_MISMATCH: the runtime definitions were not generated from the pinned specification records'] };
  const made = createModificationCatalog(doc);
  if (!made.ok) return { ok: false, problems: made.problems ?? ['catalog-invalid'] };
  const rows = new Map();
  for (const r of Array.isArray(specs?.records) ? specs.records : []) {
    if (r?.component !== 'installProcedure' || r.verification !== 'SOURCE_VERIFIED') continue;
    const m = /Table 2-2 row '(0|1|2 or more)' upgrade points/.exec(String(r.behavior ?? ''));
    if (m) rows.set(r.typedDefinitionId, m[1]);
  }
  const out = Object.freeze({ ok: true, catalog: made.catalog, rows, recordsSha256: recordsHash });
  if (!fetchText) { cached = out; setVerifiedModificationData(out); }
  return out;
}

/** The verified data most recently loaded through the production path (null before the first load). Synchronous consumers read this. */
export function getLoadedModificationData() { return getVerifiedModificationData(); }

// ------------------------------------------------------------------------------------------------ slot-authority inputs
/** Weapon class for Phase 1a from the canonical weapon registry (weaponGroup), never from names. */
export function makeCanonicalWeaponLookup(registry, resolveIdentity) {
  return (item) => {
    if (!registry || typeof resolveIdentity !== 'function') return { state: 'unresolved', reason: 'weapon-registry-unavailable' };
    let id;
    try { id = resolveIdentity(item, registry); } catch (_err) { return { state: 'unresolved', reason: 'canonical-identity-unresolved' }; }
    if (id?.kind !== 'canonical') return { state: 'legacy' };
    const rec = registry.getByIdentityKey(id.identityKey);
    if (!rec) return { state: 'unresolved', reason: 'registry-entry-missing' };
    return { state: 'canonical', identityKey: id.identityKey, weaponClass: rec.weaponGroup === 'Lightsaber' ? 'lightsaber' : 'ordinary', source: { ref: 'canonical-weapon-registry', registryHash: registry.registryHash ?? null } };
  };
}

/** The production lookup: the shared canonical weapon registry and its identity resolver (fails closed when the registry is not loaded). */
export async function productionWeaponLookup() {
  const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
  return makeCanonicalWeaponLookup(rt.getSharedWeaponAuthorityRegistry(), rt.resolveCanonicalIdentity);
}

/** A GM attestation of an armor's stock class and powered status for Phase 1a (recorded with the GM id; not a published fact). */
export function armorAttestation({ stockClass, powered, gmId }) {
  if (!['light', 'medium', 'heavy'].includes(stockClass) || typeof powered !== 'boolean' || !nonEmpty(gmId)) return null;
  return { evidenceRef: `gm-attested:${gmId}`, armorStockClass: stockClass, powered };
}

// ------------------------------------------------------------------------------------------------ review (read-only)
function classify(blockers, acceptable) {
  const accepted = []; const hard = [];
  for (const b of blockers) (acceptable[b.code]?.(b.detail) ? accepted : hard).push({ code: b.code, detail: b.detail ?? null });
  return { accepted, hard };
}

/**
 * Read-only review of a provisional install: DC/time/price/slots, the certification blockers a GM would be accepting and any hard blocker.
 * @param {{data:object, item:object, typedDefinitionId:string, weaponLookup?:Function, armor?:object|null}} input
 */
const DEVELOPMENT_ACCEPTABLE = Object.freeze({
  ...ACCEPTABLE,
  COMPONENT_UNVERIFIED: (d) => d === 'description' || d === 'hostPrerequisites' || d === 'installProcedure',
  OPEN_REGISTER_ENTRY: (d) => d === 'D-013:installProcedure',
});
// Gear tier (GM development policy): everything the provisional path accepts, plus the open D-005 host question -- answered per install by
// an explicit GM host ruling (HOST_NOT_ESTABLISHED requires one) -- and slot accounting from the table-verified fixed slot cost
const DEVELOPMENT_EQUIPMENT_ACCEPTABLE = Object.freeze({
  ...ACCEPTABLE,
  OPEN_REGISTER_ENTRY: (d) => d === 'D-014:installProcedure' || d === 'D-015:installProcedure' || d === 'D-005:hostPrerequisites',
});
/** Slot-cost lookup for the gear tier: certified costs as usual, and the table-verified fixed cost of a DEVELOPMENT_EQUIPMENT_SET definition. */
function developmentEquipmentLookup(catalog) {
  const certified = createCertifiedDefinitionLookup(catalog);
  return (key) => {
    const hit = certified(key);
    if (hit || !DEVELOPMENT_EQUIPMENT_SET.includes(key)) return hit;
    const found = catalog.getTyped(key);
    const reg = found?.typed?.slotCost;
    if (reg?.registry?.type !== 'fixed' || reg.certification?.certified !== true || !Number.isInteger(reg.registry.slots) || reg.registry.slots < 0) return null;
    const src = found.parent?.provenance?.source ?? {};
    return { definitionId: key, upgradeKey: key, certifiedCost: reg.registry.slots, source: { ref: `${src.bookId ?? 'unknown'}:p${src.printedTablePage ?? src.rulesPage ?? '?'}${src.tableId ? ` table ${src.tableId}` : ''}`, certification: `table-verified slot cost; accounting eligibility pending D-005 (GM development policy)` } };
  };
}
const tableRowForPoints = (points) => (Number.isInteger(points) && points >= 0 ? (points >= 2 ? '2 or more' : String(points)) : null);

export function reviewProvisionalInstall({ data, item, typedDefinitionId, weaponLookup = null, armor = null, developmentMode = false }) {
  const gear = DEVELOPMENT_EQUIPMENT_SET.includes(typedDefinitionId);
  const development = DEVELOPMENT_SET.includes(typedDefinitionId) || gear;
  const base = { typedDefinitionId, provisional: true, basis: development ? DEVELOPMENT_BASIS : PROVISIONAL_BASIS };
  if (!data?.ok) return Object.freeze({ ...base, ok: false, hard: [{ code: 'DATA_UNAVAILABLE', detail: data?.problems ?? null }], accepted: [] });
  if (!PROVISIONAL_SET.includes(typedDefinitionId) && !development) return Object.freeze({ ...base, ok: false, hard: [{ code: 'NOT_IN_PROVISIONAL_SET', detail: typedDefinitionId }], accepted: [] });
  const plan = planModification({
    catalog: data.catalog, operation: 'install', typedDefinitionId, item,
    slotAuthority: { resolveSlotState },
    slotContext: { ...(weaponLookup ? { canonicalWeaponLookup: weaponLookup } : {}), ...(armor ? { trustedClassification: armor } : {}) },
    ...(gear ? { definitionLookup: developmentEquipmentLookup(data.catalog) } : {}),
  });
  let { accepted, hard } = classify(plan.blockers, gear ? DEVELOPMENT_EQUIPMENT_ACCEPTABLE : development ? DEVELOPMENT_ACCEPTABLE : ACCEPTABLE);
  // with the development workflow off, nothing is accepted: every certification blocker (D-013 included) is reported as blocking
  if (development && developmentMode !== true) { hard = [...accepted, ...hard]; accepted = []; }
  const found = data.catalog.getTyped(typedDefinitionId);
  const parent = found?.parent ?? null;
  let row; let rowBasis;
  if (gear) {
    // published Scum and Villainy Table 2-2 row (page 39 governs these definitions); no effects are automated
    if (developmentMode !== true) hard.unshift({ code: 'DEVELOPMENT_MODE_OFF', detail: 'enable the Modification V2 development workflow setting (GM) to install this definition' });
    row = data.rows.get(typedDefinitionId) ?? null; rowBasis = `${TABLE_2_2.source}; ${DEVELOPMENT_EQUIPMENT_POLICY}`;
  } else if (development) {
    if (developmentMode !== true) hard.unshift({ code: 'DEVELOPMENT_MODE_OFF', detail: 'enable the Modification V2 development workflow setting (GM) to install this definition' });
    if (parent?.provenance?.mechanicalCertification !== 'EFFECTS_CERTIFIED') hard.push({ code: 'EFFECTS_NOT_CERTIFIED', detail: typedDefinitionId });
    const slots = found?.typed?.slotCost?.registry?.type === 'fixed' && found.typed.slotCost.certification?.certified === true ? found.typed.slotCost.registry.slots : null;
    row = tableRowForPoints(slots); rowBasis = DEVELOPMENT_POLICY;
  } else {
    row = data.rows.get(typedDefinitionId) ?? null; rowBasis = TABLE_2_2.source;
  }
  const table = row ? TABLE_2_2.commercial[row] : null;
  if (!table) hard.push({ code: 'TABLE_2_2_ROW_UNKNOWN', detail: typedDefinitionId });
  const price = plan.price?.computable === true && plan.price.kind === 'credits' && Number.isFinite(plan.price.amount) && plan.price.amount >= 0 ? plan.price.amount : null;
  if (price === null && !hard.some((h) => h.code.startsWith('PRICE_'))) hard.push({ code: 'PRICE_NOT_ESTABLISHED', detail: plan.price?.kind ?? null });
  return Object.freeze({
    ...base, ok: hard.length === 0, development, gear,
    name: parent?.name ?? typedDefinitionId, summary: parent?.display?.summary ?? '', domain: plan.domain,
    row, dc: table?.dc ?? null, time: table?.time ?? null, price, slotImpact: plan.slotImpact,
    hostNeedsGmRuling: accepted.some((a) => a.code === 'HOST_NOT_ESTABLISHED'),
    hostPrerequisites: parent?.eligibility?.prerequisites ?? [],
    effectsSummary: development && !gear ? parent?.display?.summary ?? '' : null,
    accepted, hard, source: rowBasis, trainedRequired: 'Mechanics (trained)',
  });
}

/**
 * Every typed definition of the Item's domain with its status for the workbench (read-only): installable now (provisional set, no hard
 * blocker) or blocked, with the exact planner blockers -- never hidden.
 */
export function listDomainModifications({ data, item, weaponLookup = null, armor = null, developmentMode = isDevelopmentModeEnabled() }) {
  if (!data?.ok || !['weapon', 'armor', 'equipment'].includes(item?.type)) return [];
  return data.catalog.listTyped({ domain: item.type }).map((typedDefinitionId) => {
    if (PROVISIONAL_SET.includes(typedDefinitionId) || DEVELOPMENT_SET.includes(typedDefinitionId) || DEVELOPMENT_EQUIPMENT_SET.includes(typedDefinitionId)) {
      const review = reviewProvisionalInstall({ data, item, typedDefinitionId, weaponLookup, armor, developmentMode });
      return { ...review, availability: review.ok ? (review.development ? 'development' : 'provisional') : 'blocked' };
    }
    const found = data.catalog.getTyped(typedDefinitionId);
    const plan = planModification({ catalog: data.catalog, operation: 'install', typedDefinitionId, item });
    const blockers = plan.blockers.filter((b) => b.code !== 'EXECUTOR_NOT_CERTIFIED' && b.code !== 'SLOT_STATE_UNRESOLVED').map((b) => ({ code: b.code, detail: b.detail ?? null }));
    return Object.freeze({
      typedDefinitionId, availability: 'blocked', ok: false, name: found?.parent?.name ?? typedDefinitionId, summary: found?.parent?.display?.summary ?? '',
      price: plan.price?.computable && plan.price.kind === 'credits' ? plan.price.amount : null, slotCost: plan.slotImpact?.cost ?? null,
      hard: [{ code: 'NOT_IN_PROVISIONAL_SET', detail: null }, ...blockers], accepted: [],
    });
  });
}

/** Provisional candidates for an Item's domain (read-only reviews). */
export function listProvisionalCandidates({ data, item, weaponLookup = null, armor = null }) {
  return PROVISIONAL_SET.filter((id) => id.endsWith(`::${item?.type}`)).map((typedDefinitionId) => reviewProvisionalInstall({ data, item, typedDefinitionId, weaponLookup, armor }));
}

// ------------------------------------------------------------------------------------------------ execution (GM-local)
const queues = new Map();
function enqueue(key, task) {
  const tail = queues.get(key) ?? Promise.resolve();
  const run = tail.catch(() => {}).then(task);
  const guard = run.catch(() => {});
  queues.set(key, guard);
  guard.then(() => { if (queues.get(key) === guard) queues.delete(key); });
  return run;
}

const readAttempts = (item) => { const a = item?.flags?.['foundryvtt-swse']?.customization?.attemptLog; return Array.isArray(a) ? a : []; };
const outcome = (status, extra = {}) => Object.freeze({ status, ...extra });

async function defaultRollMechanics(actor, dc, label) {
  const { rollSkill } = await import('/systems/foundryvtt-swse/scripts/rolls/skills.js');
  const roll = await rollSkill(actor, 'mechanics', { dc, showDialog: false, skillUse: { key: 'modification-v2', label } });
  const total = Number(roll?.total);
  return Number.isFinite(total) ? total : null;
}
async function defaultWriteItem(actor, update) {
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  return ActorEngine.updateOwnedItems(actor, [update], { meta: { guardKey: 'ModificationV2.provisional' } });
}
async function defaultTransaction(context, options) {
  const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
  return TransactionEngine.executeMutationTransaction(context, options);
}
function isTrainedMechanics(actor) {
  const skill = actor?.system?.skills?.mechanics;
  const derived = Array.isArray(actor?.system?.derived?.skills?.list) ? actor.system.derived.skills.list.find((r) => r?.key === 'mechanics') : actor?.system?.derived?.skills?.mechanics;
  return skill?.trained === true || derived?.trained === true;
}

/** Resolve the check: a Mechanics roll by a trained installer, or a GM-entered result (Q-029 audited manual outcome). */
async function resolveCheck(actor, check, dc, label, deps) {
  if (check?.mode === 'roll') {
    if (!isTrainedMechanics(actor)) return { error: 'installer-not-trained-in-mechanics' };
    const total = await (deps.rollMechanics ?? defaultRollMechanics)(actor, dc, label);
    return Number.isFinite(total) ? { mode: 'roll', total, dc, success: total >= dc } : { error: 'roll-failed' };
  }
  if (check?.mode === 'gm-entered') {
    const total = typeof check.total === 'number' ? check.total : NaN;
    if (!Number.isFinite(total)) return { error: 'gm-entered-total-invalid' };
    return { mode: 'gm-entered', total, dc, success: total >= dc, trainedInstaller: isTrainedMechanics(actor) };
  }
  return { error: 'check-mode-invalid' };
}

/**
 * Install one provisional upgrade (GM only, per-item serialized, duplicate-safe by attemptId).
 * request = { typedDefinitionId, attemptId, priceConfirmed, hostRuling?:{compatible:true, note}, armor?:{stockClass, powered}, check:{mode:'roll'|'gm-entered', total?}, note? }
 * @returns {Promise<object>} { status: INSTALLED | INSTALL_FAILED_CHECK | DUPLICATE | REFUSED | TRANSACTION_FAILED | WRITE_FAILED, ... }
 */
export async function installProvisionalUpgrade(actor, item, request, deps = {}) {
  const isGm = deps.isGm ? deps.isGm() : globalThis.game?.user?.isGM === true;
  if (!isGm) return outcome('REFUSED', { reason: 'not-a-gm' });
  if (!actor || !item || !isPlain(request) || !nonEmpty(request.attemptId) || !nonEmpty(request.typedDefinitionId)) return outcome('REFUSED', { reason: 'invalid-request' });
  return enqueue(`${actor.id}:${item.id}`, () => runInstall(actor, item, request, deps));
}

async function runInstall(actor, item0, request, deps) {
  const item = actor.items?.get?.(item0.id) ?? item0; // fresh read under serialization
  const gmId = (deps.currentUserId ? deps.currentUserId() : globalThis.game?.user?.id) ?? 'gm';
  if (inspectInstances(item).records.some((r) => r.install?.attemptId === request.attemptId) || readAttempts(item).some((a) => a.attemptId === request.attemptId)) {
    return outcome('DUPLICATE', { attemptId: request.attemptId, reason: 'this attempt was already resolved; nothing was charged again' });
  }
  const data = deps.data ?? await loadModificationData();
  const armor = item.type === 'armor' ? armorAttestation({ ...(request.armor ?? {}), gmId }) : null;
  if (item.type === 'armor' && !armor) return outcome('REFUSED', { reason: 'armor-classification-attestation-required' });
  const weaponLookup = item.type === 'weapon' ? (deps.weaponLookup ?? await productionWeaponLookup()) : null;
  const developmentMode = deps.developmentMode ?? isDevelopmentModeEnabled();
  const review = reviewProvisionalInstall({ data, item, typedDefinitionId: request.typedDefinitionId, weaponLookup, armor, developmentMode });
  if (!review.ok) return outcome('REFUSED', { reason: 'hard-blockers', hard: review.hard, review });
  if (review.hostNeedsGmRuling && request.hostRuling?.compatible !== true) return outcome('REFUSED', { reason: 'host-ruling-required', review });
  // H7 boundary: only an explicitly confirmed, established price is charged
  if (typeof request.priceConfirmed !== 'number' || request.priceConfirmed !== review.price) return outcome('REFUSED', { reason: 'price-not-confirmed', price: review.price, review });

  const check = await resolveCheck(actor, request.check, review.dc, `Install ${review.name}`, deps);
  if (check.error) return outcome('REFUSED', { reason: check.error, review });
  const writeItem = deps.writeItem ?? defaultWriteItem;

  if (!check.success) {
    // Q-024: the failed attempt is recorded; no instance, no slot. Q-021: its cost is pending GM adjudication (not charged automatically, not zero).
    const entry = { attemptId: request.attemptId, kind: 'install', typedDefinitionId: request.typedDefinitionId, result: 'failed', check, at: Date.now(), by: gmId, basis: review.basis, note: request.note ?? null, cost: { state: 'GM_ADJUDICATION_PENDING', amount: null, charged: false, basis: 'Q-021: the cost of a failed attempt is not defined by the published rule and is left to GM adjudication; nothing is charged automatically and no amount (zero included) is implied' } };
    try { await writeItem(actor, { _id: item.id, [ATTEMPT_FLAG_PATH]: [...clone(readAttempts(item)), entry] }); } catch (err) { return outcome('WRITE_FAILED', { reason: 'attempt-log-not-written', error: err?.message ?? String(err), check }); }
    return outcome('INSTALL_FAILED_CHECK', { check, review, attempt: entry });
  }

  const instance = {
    instanceId: `mv2-${request.attemptId}`, typedDefinitionId: request.typedDefinitionId, domain: review.domain, name: review.name, state: 'installed',
    provisional: true, basis: review.basis,
    acceptedBlockers: clone(review.accepted),
    hostRuling: review.hostNeedsGmRuling ? { compatible: true, by: gmId, note: request.hostRuling?.note ?? null, classification: 'GM_ADJUDICATED_NOT_PUBLISHED_RULE' } : null,
    armorAttestation: armor,
    effects: review.gear
      ? { certified: false, automation: 'none', basis: 'effects not certified: a GM-adjudicated record; nothing is applied automatically' }
      : review.development
      ? { source: 'catalog', automation: 'while-development-mode-is-on', basis: 'source-certified effects resolved from the pinned catalog; installation under a GM development policy (D-013 pending)' }
      : { certified: false, automation: 'none', basis: 'Q-029: effects are a GM-adjudicated record; nothing is applied automatically' },
    ...(review.development ? { developmentPolicy: review.source } : {}),
    install: { attemptId: request.attemptId, row: review.row, dc: review.dc, time: review.time, check, price: review.price, quality: 'commercial', at: Date.now(), by: gmId, note: request.note ?? null },
  };
  const next = [...clone(inspectInstances(item).records), instance];
  const tx = await (deps.transaction ?? defaultTransaction)({
    actor,
    mutationPlan: { update: { items: [{ _id: item.id, [INSTANCE_FLAG_PATH]: next }] } },
    cost: review.price,
    transactionContext: 'owned-customization',
    audit: { itemId: item.id, modificationV2: { typedDefinitionId: request.typedDefinitionId, attemptId: request.attemptId, provisional: true, row: review.row, dc: review.dc } },
    verify: async (a) => {
      const landed = inspectInstances(a.items?.get?.(item.id) ?? item).records.some((r) => r.instanceId === instance.instanceId);
      return landed ? { ok: true } : { ok: false, reason: `${review.name} is not on the item after the update` };
    },
  }, { source: 'ModificationV2.provisionalInstall' });
  if (!tx?.success) return outcome('TRANSACTION_FAILED', { reason: tx?.error ?? 'transaction failed', transaction: tx ?? null, check, review });
  return outcome('INSTALLED', { instance, transactionId: tx.transactionId ?? null, check, review });
}

/**
 * Remove (or attempt to remove) a provisional instance. request = { instanceId, attemptId, expedited?:boolean, check:{mode, total?}, note? }
 * Ordinary: DC - 5, same time; failure -> deactivated, keeps its slot (Q-023). Expedited: next lower time increment; failure destroys it
 * (slot freed); not available at 10 minutes (Q-022). No credits move.
 */
export async function removeProvisionalUpgrade(actor, item, request, deps = {}) {
  const isGm = deps.isGm ? deps.isGm() : globalThis.game?.user?.isGM === true;
  if (!isGm) return outcome('REFUSED', { reason: 'not-a-gm' });
  if (!actor || !item || !isPlain(request) || !nonEmpty(request.attemptId) || !nonEmpty(request.instanceId)) return outcome('REFUSED', { reason: 'invalid-request' });
  return enqueue(`${actor.id}:${item.id}`, () => runRemove(actor, item, request, deps));
}

async function runRemove(actor, item0, request, deps) {
  const item = actor.items?.get?.(item0.id) ?? item0;
  const gmId = (deps.currentUserId ? deps.currentUserId() : globalThis.game?.user?.id) ?? 'gm';
  if (readAttempts(item).some((a) => a.attemptId === request.attemptId)) return outcome('DUPLICATE', { attemptId: request.attemptId });
  const records = inspectInstances(item).records;
  const target = records.find((r) => r.instanceId === request.instanceId);
  if (!target) return outcome('REFUSED', { reason: 'instance-not-found' });
  if (target.provisional !== true || !isPlain(target.install)) return outcome('REFUSED', { reason: 'not-a-provisional-instance' });
  const data = deps.data ?? await loadModificationData();
  if (!data?.ok) return outcome('REFUSED', { reason: 'data-unavailable', problems: data?.problems ?? null });
  const plan = planModification({ catalog: data.catalog, operation: 'remove', typedDefinitionId: target.typedDefinitionId, item, instanceId: request.instanceId });
  const developmentInstance = target.basis === DEVELOPMENT_BASIS && DEVELOPMENT_SET.includes(target.typedDefinitionId);
  const gearInstance = target.basis === DEVELOPMENT_BASIS && DEVELOPMENT_EQUIPMENT_SET.includes(target.typedDefinitionId);
  const { hard } = classify(plan.blockers, gearInstance ? DEVELOPMENT_EQUIPMENT_ACCEPTABLE : developmentInstance ? DEVELOPMENT_ACCEPTABLE : REMOVAL_ACCEPTABLE);
  if (hard.length) return outcome('REFUSED', { reason: 'hard-blockers', hard });
  const table = TABLE_2_2.commercial[target.install.row];
  if (!table) return outcome('REFUSED', { reason: 'table-2-2-row-unknown' });
  const expedited = request.expedited === true;
  const idx = TIME_INCREMENTS.indexOf(table.time);
  if (expedited && idx <= 0) return outcome('REFUSED', { reason: 'expedited-removal-unavailable-at-shortest-increment (Q-022)' });
  const dc = table.dc - 5;
  const time = expedited ? TIME_INCREMENTS[idx - 1] : table.time;
  const check = await resolveCheck(actor, request.check, dc, `Remove ${target.name ?? target.typedDefinitionId}`, deps);
  if (check.error) return outcome('REFUSED', { reason: check.error });
  const result = check.success ? 'removed' : expedited ? 'destroyed' : 'deactivated';
  const nextInstances = result === 'deactivated'
    ? records.map((r) => (r.instanceId === target.instanceId ? { ...clone(r), state: 'deactivated' } : clone(r)))
    : records.filter((r) => r.instanceId !== target.instanceId).map(clone);
  const entry = { attemptId: request.attemptId, kind: expedited ? 'remove-expedited' : 'remove', instanceId: target.instanceId, typedDefinitionId: target.typedDefinitionId, result, check, dc, time, at: Date.now(), by: gmId, basis: target.basis ?? PROVISIONAL_BASIS, note: request.note ?? null };
  try {
    await (deps.writeItem ?? defaultWriteItem)(actor, { _id: item.id, [INSTANCE_FLAG_PATH]: nextInstances, [ATTEMPT_FLAG_PATH]: [...clone(readAttempts(item)), entry] });
  } catch (err) { return outcome('WRITE_FAILED', { reason: 'removal-not-written', error: err?.message ?? String(err), check }); }
  const after = inspectInstances(actor.items?.get?.(item.id) ?? item).records.find((r) => r.instanceId === target.instanceId);
  const verified = result === 'deactivated' ? after?.state === 'deactivated' : !after;
  if (!verified) return outcome('WRITE_FAILED', { reason: 'removal-not-verified', check });
  return outcome(result === 'removed' ? 'REMOVED' : result === 'destroyed' ? 'DESTROYED' : 'DEACTIVATED', { check, dc, time, attempt: entry });
}

export default { loadModificationData, reviewProvisionalInstall, listProvisionalCandidates, installProvisionalUpgrade, removeProvisionalUpgrade, makeCanonicalWeaponLookup, armorAttestation, PROVISIONAL_SET, TABLE_2_2 };
